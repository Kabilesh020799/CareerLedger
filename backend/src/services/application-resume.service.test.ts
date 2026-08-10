import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  applicationResume: { findFirst: vi.fn() },
}));

const applicationResumeStorageServiceMock = vi.hoisted(() => ({
  createDownloadUrl: vi.fn(),
}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("./application-resume-storage.service", () => ({
  applicationResumeStorageService: applicationResumeStorageServiceMock,
}));

import {
  applicationResumeService,
  buildApplicationResumeFileName,
} from "./application-resume.service";

describe("application resume service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds a safe Role_Company filename", () => {
    expect(
      buildApplicationResumeFileName(
        "Senior Software Engineer",
        "Acme & Partners, Inc.",
        ".pdf",
      ),
    ).toBe("Senior_Software_Engineer_Acme_Partners_Inc.pdf");
  });

  it("falls back to stable segments when names contain no safe characters", () => {
    expect(buildApplicationResumeFileName("---", "***", ".docx")).toBe(
      "Role_Company.docx",
    );
  });

  it("scopes attachment downloads through application ownership", async () => {
    prismaMock.applicationResume.findFirst.mockResolvedValue(null);

    await applicationResumeService.findForApplication("user-1", "application-1");

    expect(prismaMock.applicationResume.findFirst).toHaveBeenCalledWith({
      where: {
        applicationId: "application-1",
        application: { userId: "user-1" },
      },
      select: {
        fileName: true,
        mimeType: true,
        size: true,
        content: true,
        storageKey: true,
      },
    });
  });

  it("creates a private download URL for an S3-backed attachment", async () => {
    prismaMock.applicationResume.findFirst.mockResolvedValue({
      fileName: "Engineer_Acme.pdf",
      mimeType: "application/pdf",
      size: 1024,
      content: null,
      storageKey: "resumes/user-1/upload.pdf",
    });
    applicationResumeStorageServiceMock.createDownloadUrl.mockResolvedValue(
      "https://bucket.example/signed",
    );

    await expect(
      applicationResumeService.findForApplication("user-1", "application-1"),
    ).resolves.toEqual({
      kind: "s3",
      fileName: "Engineer_Acme.pdf",
      url: "https://bucket.example/signed",
    });
    expect(
      applicationResumeStorageServiceMock.createDownloadUrl,
    ).toHaveBeenCalledWith(
      "resumes/user-1/upload.pdf",
      "Engineer_Acme.pdf",
      "application/pdf",
      false,
    );
  });
});
