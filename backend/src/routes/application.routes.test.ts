import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applicationResumeMaxBytes } from "../validators/application-resume.validator";

const applicationServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
  search: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

const applicationResumeServiceMock = vi.hoisted(() => ({
  findForApplication: vi.fn(),
}));

const applicationResumeStorageServiceMock = vi.hoisted(() => ({
  isConfigured: vi.fn(),
  prepareUpload: vi.fn(),
  finalizeUpload: vi.fn(),
  abandonUpload: vi.fn(),
}));
const applicationCoverLetterServiceMock = vi.hoisted(() => ({ findForApplication: vi.fn() }));
const applicationCoverLetterStorageServiceMock = vi.hoisted(() => ({
  isConfigured: vi.fn(), prepareUpload: vi.fn(), finalizeUpload: vi.fn(), abandonUpload: vi.fn(),
}));

vi.mock("../services/application.service", () => ({
  applicationService: applicationServiceMock,
}));
vi.mock("../services/application-resume.service", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("../services/application-resume.service")
  >();
  return {
    ...original,
    applicationResumeService: applicationResumeServiceMock,
  };
});
vi.mock("../services/application-resume-storage.service", () => ({
  applicationResumeStorageService: applicationResumeStorageServiceMock,
}));
vi.mock("../services/application-cover-letter.service", () => ({ applicationCoverLetterService: applicationCoverLetterServiceMock }));
vi.mock("../services/application-cover-letter-storage.service", () => ({ applicationCoverLetterStorageService: applicationCoverLetterStorageServiceMock }));

import { applicationRouter } from "./application.routes";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = {
      id: "user-1",
      username: "user-1",
      email: "user-1@example.com",
      name: "User One",
      avatarUrl: null,
    };
    next();
  });
  app.use("/api/applications", applicationRouter);
  return app;
}

describe("application resume routes", () => {
  const app = createTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
    applicationResumeStorageServiceMock.isConfigured.mockReturnValue(false);
    applicationResumeStorageServiceMock.abandonUpload.mockResolvedValue(true);
    applicationCoverLetterStorageServiceMock.isConfigured.mockReturnValue(false);
    applicationCoverLetterStorageServiceMock.abandonUpload.mockResolvedValue(true);
  });

  it("prepares a private S3 upload for a supported resume", async () => {
    applicationResumeStorageServiceMock.isConfigured.mockReturnValue(true);
    applicationResumeStorageServiceMock.prepareUpload.mockResolvedValue({
      success: true,
      data: {
        mode: "s3",
        storageKey: "resumes/user-1/upload.pdf",
        url: "https://bucket.example/upload",
        fields: { key: "resumes/user-1/upload.pdf" },
        expiresAt: "2026-08-10T03:00:00.000Z",
      },
    });

    const response = await request(app)
      .post("/api/applications/resume-uploads")
      .send({
        fileName: "resume.pdf",
        mimeType: "application/pdf",
        size: 1024,
      });

    expect(response.status).toBe(201);
    expect(response.body.mode).toBe("s3");
    expect(applicationResumeStorageServiceMock.prepareUpload).toHaveBeenCalledWith(
      "user-1",
      {
        fileName: "resume.pdf",
        mimeType: "application/pdf",
        size: 1024,
      },
    );
  });

  it("uses database uploads when S3 is not configured", async () => {
    applicationResumeStorageServiceMock.isConfigured.mockReturnValue(false);

    const response = await request(app)
      .post("/api/applications/resume-uploads")
      .send({
        fileName: "resume.pdf",
        mimeType: "application/pdf",
        size: 1024,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ mode: "database" });
  });

  it("attaches a verified direct upload when creating an application", async () => {
    applicationResumeStorageServiceMock.finalizeUpload.mockResolvedValue({
      success: true,
      data: {
        storageKey: "resumes/user-1/upload.pdf",
        extension: ".pdf",
        mimeType: "application/pdf",
        size: 2048,
      },
    });
    applicationServiceMock.create.mockResolvedValue({ id: "application-1" });

    const response = await request(app).post("/api/applications").send({
      company: "Acme Corp",
      jobTitle: "Software Engineer",
      resumeUploadKey: "resumes/user-1/upload.pdf",
    });

    expect(response.status).toBe(201);
    expect(applicationResumeStorageServiceMock.finalizeUpload).toHaveBeenCalledWith(
      "user-1",
      "resumes/user-1/upload.pdf",
    );
    expect(applicationServiceMock.create).toHaveBeenCalledWith(
      "user-1",
      {
        company: "Acme Corp",
        jobTitle: "Software Engineer",
        resumeUploadKey: "resumes/user-1/upload.pdf",
      },
      expect.objectContaining({ storageKey: "resumes/user-1/upload.pdf" }),
      undefined,
    );
  });

  it("creates an application and stores a valid resume attachment", async () => {
    const content = Buffer.from("%PDF-1.7\nresume content");
    applicationServiceMock.create.mockResolvedValue({
      id: "application-1",
      company: "Acme Corp",
      jobTitle: "Software Engineer",
      resumeAttachment: {
        fileName: "Software_Engineer_Acme_Corp.pdf",
        mimeType: "application/pdf",
        size: content.length,
      },
      undefined,
    });

    const response = await request(app)
      .post("/api/applications")
      .field("company", "Acme Corp")
      .field("jobTitle", "Software Engineer")
      .attach("resume", content, {
        filename: "original resume.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(201);
    expect(response.body.resumeAttachment.fileName).toBe(
      "Software_Engineer_Acme_Corp.pdf",
    );
    expect(applicationServiceMock.create).toHaveBeenCalledWith(
      "user-1",
      { company: "Acme Corp", jobTitle: "Software Engineer" },
      {
        content,
        extension: ".pdf",
        mimeType: "application/pdf",
        size: content.length,
      },
      undefined,
    );
  });

  it("requires direct upload preparation when S3 storage is configured", async () => {
    applicationResumeStorageServiceMock.isConfigured.mockReturnValue(true);

    const response = await request(app)
      .post("/api/applications")
      .field("company", "Acme Corp")
      .field("jobTitle", "Engineer")
      .attach("resume", Buffer.from("%PDF-1.7\nresume content"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Prepare the resume upload before saving the application",
    );
    expect(applicationServiceMock.create).not.toHaveBeenCalled();
  });

  it("continues to create applications from JSON without a resume", async () => {
    applicationServiceMock.create.mockResolvedValue({ id: "application-1" });

    const response = await request(app)
      .post("/api/applications")
      .send({ company: "Acme Corp", jobTitle: "Software Engineer" });

    expect(response.status).toBe(201);
    expect(applicationServiceMock.create).toHaveBeenCalledWith(
      "user-1",
      { company: "Acme Corp", jobTitle: "Software Engineer" },
      undefined,
      undefined,
    );
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "ftp://jobs.example/1"])(
    "rejects unsafe job URL schemes: %s",
    async (jobUrl) => {
      const response = await request(app).post("/api/applications").send({
        company: "Acme Corp",
        jobTitle: "Software Engineer",
        jobUrl,
      });

      expect(response.status).toBe(400);
      expect(applicationServiceMock.create).not.toHaveBeenCalled();
    },
  );

  it("updates an application with a replacement PDF resume", async () => {
    const content = Buffer.from("%PDF-1.7\nreplacement resume");
    applicationServiceMock.update.mockResolvedValue({
      id: "application-1",
      company: "Acme Labs",
      jobTitle: "Senior Engineer",
      resumeAttachment: {
        fileName: "Senior_Engineer_Acme_Labs.pdf",
        mimeType: "application/pdf",
        size: content.length,
      },
      undefined,
    });

    const response = await request(app)
      .patch("/api/applications/application-1")
      .field("company", "Acme Labs")
      .field("jobTitle", "Senior Engineer")
      .attach("resume", content, {
        filename: "new resume.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(200);
    expect(response.body.resumeAttachment.fileName).toBe(
      "Senior_Engineer_Acme_Labs.pdf",
    );
    expect(applicationServiceMock.update).toHaveBeenCalledWith(
      "user-1",
      "application-1",
      { company: "Acme Labs", jobTitle: "Senior Engineer" },
      {
        content,
        extension: ".pdf",
        mimeType: "application/pdf",
        size: content.length,
      },
      undefined,
    );
  });

  it("rejects unsupported, inconsistent, and oversized attachments", async () => {
    const unsupported = await request(app)
      .post("/api/applications")
      .field("company", "Acme Corp")
      .field("jobTitle", "Software Engineer")
      .attach("resume", Buffer.from("plain text"), {
        filename: "resume.txt",
        contentType: "text/plain",
      });
    const inconsistent = await request(app)
      .post("/api/applications")
      .field("company", "Acme Corp")
      .field("jobTitle", "Software Engineer")
      .attach("resume", Buffer.from("not a pdf"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });
    const oversized = await request(app)
      .post("/api/applications")
      .field("company", "Acme Corp")
      .field("jobTitle", "Software Engineer")
      .attach("resume", Buffer.alloc(applicationResumeMaxBytes + 1), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });

    expect(unsupported.status).toBe(400);
    expect(unsupported.body.error).toContain("PDF");
    expect(inconsistent.status).toBe(400);
    expect(inconsistent.body.error).toContain("contents");
    expect(oversized.status).toBe(400);
    expect(oversized.body).toEqual({ error: "Resume must be 5 MB or smaller" });
    expect(applicationServiceMock.create).not.toHaveBeenCalled();
  });

  it("downloads an owned resume with its generated filename", async () => {
    const content = Buffer.from("%PDF-1.7\nstored resume");
    applicationResumeServiceMock.findForApplication.mockResolvedValue({
      kind: "database",
      fileName: "Software_Engineer_Acme_Corp.pdf",
      mimeType: "application/pdf",
      size: content.length,
      content,
    });

    const response = await request(app).get(
      "/api/applications/application-1/resume",
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"]).toBe(
      'inline; filename="Software_Engineer_Acme_Corp.pdf"',
    );
    expect(Buffer.from(response.body)).toEqual(content);
    expect(applicationResumeServiceMock.findForApplication).toHaveBeenCalledWith(
      "user-1",
      "application-1",
      true,
      undefined,
    );
  });

  it("redirects an owned S3 resume to a short-lived download URL", async () => {
    applicationResumeServiceMock.findForApplication.mockResolvedValue({
      kind: "s3",
      fileName: "Software_Engineer_Acme_Corp.pdf",
      url: "https://jatbucket2799.s3.amazonaws.com/signed",
    });

    const response = await request(app).get(
      "/api/applications/application-1/resume",
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "https://jatbucket2799.s3.amazonaws.com/signed",
    );
  });

  it("returns a short-lived S3 download preparation", async () => {
    applicationResumeServiceMock.findForApplication.mockResolvedValue({
      kind: "s3",
      fileName: "Software_Engineer_Acme_Corp.pdf",
      url: "https://jatbucket2799.s3.amazonaws.com/signed",
    });

    const response = await request(app).get(
      "/api/applications/application-1/resume-download",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      mode: "s3",
      url: "https://jatbucket2799.s3.amazonaws.com/signed",
    });
  });

  it("does not reveal missing or inaccessible resume attachments", async () => {
    applicationResumeServiceMock.findForApplication.mockResolvedValue(null);

    const response = await request(app).get(
      "/api/applications/application-2/resume",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Resume not found" });
  });

  it("creates an application with a validated PDF cover letter", async () => {
    const content = Buffer.from("%PDF-1.7\ncover letter");
    applicationServiceMock.create.mockResolvedValue({ id: "application-1", coverLetterAttachment: { fileName: "Engineer_Acme_Cover_Letter.pdf" } });
    const response = await request(app).post("/api/applications").field("company", "Acme").field("jobTitle", "Engineer").attach("coverLetter", content, { filename: "letter.pdf", contentType: "application/pdf" });
    expect(response.status).toBe(201);
    expect(applicationServiceMock.create).toHaveBeenCalledWith("user-1", { company: "Acme", jobTitle: "Engineer" }, undefined, undefined, expect.objectContaining({ content, extension: ".pdf" }));
  });

  it("prepares a private S3 cover-letter upload", async () => {
    applicationCoverLetterStorageServiceMock.isConfigured.mockReturnValue(true);
    applicationCoverLetterStorageServiceMock.prepareUpload.mockResolvedValue({ success: true, data: { mode: "s3", storageKey: "resumes/cover-letters/pending/user-1/upload.pdf", url: "https://bucket.example/upload", fields: {}, expiresAt: "2026-08-17T12:00:00.000Z" } });
    const response = await request(app).post("/api/applications/cover-letter-uploads").send({ fileName: "letter.pdf", mimeType: "application/pdf", size: 1024 });
    expect(response.status).toBe(201);
    expect(response.body.storageKey).toContain("cover-letters/");
    expect(applicationCoverLetterStorageServiceMock.prepareUpload).toHaveBeenCalledWith("user-1", { fileName: "letter.pdf", mimeType: "application/pdf", size: 1024 });
  });

  it("returns authorization-safe 404 for an inaccessible cover letter", async () => {
    applicationCoverLetterServiceMock.findForApplication.mockResolvedValue(null);
    const response = await request(app).get("/api/applications/application-2/cover-letter");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Cover letter not found" });
  });
});
