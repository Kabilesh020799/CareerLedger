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

  beforeEach(() => vi.clearAllMocks());

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
    );
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
    );
  });

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
      'attachment; filename="Software_Engineer_Acme_Corp.pdf"',
    );
    expect(Buffer.from(response.body)).toEqual(content);
    expect(applicationResumeServiceMock.findForApplication).toHaveBeenCalledWith(
      "user-1",
      "application-1",
    );
  });

  it("does not reveal missing or inaccessible resume attachments", async () => {
    applicationResumeServiceMock.findForApplication.mockResolvedValue(null);

    const response = await request(app).get(
      "/api/applications/application-2/resume",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Resume not found" });
  });
});
