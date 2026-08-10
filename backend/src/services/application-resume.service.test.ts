import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  applicationResume: { findFirst: vi.fn() },
}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

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
      },
    });
  });
});
