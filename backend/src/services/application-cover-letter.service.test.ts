import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({ applicationCoverLetter: { findFirst: vi.fn() } }));
const accessMock = vi.hoisted(() => vi.fn());
const storageMock = vi.hoisted(() => ({ createDownloadUrl: vi.fn() }));
vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("./workspace-access.service", () => ({ applicationAccess: accessMock }));
vi.mock("./application-cover-letter-storage.service", () => ({ applicationCoverLetterStorageService: storageMock }));

import { applicationCoverLetterService, buildApplicationCoverLetterFileName } from "./application-cover-letter.service";

describe("applicationCoverLetterService", () => {
  beforeEach(() => { vi.clearAllMocks(); accessMock.mockResolvedValue({ where: { userId: "user-1" } }); });
  it("builds the required role/company cover-letter filename", () => {
    expect(buildApplicationCoverLetterFileName("Senior Engineer", "Acme & Co", ".docx")).toBe("Senior_Engineer_Acme_Co_Cover_Letter.docx");
  });
  it("returns database bytes only through an owned application", async () => {
    prismaMock.applicationCoverLetter.findFirst.mockResolvedValue({ fileName: "Engineer_Acme_Cover_Letter.pdf", mimeType: "application/pdf", size: 10, content: Uint8Array.from([1, 2]), storageKey: null });
    const result = await applicationCoverLetterService.findForApplication("user-1", "app-1");
    expect(prismaMock.applicationCoverLetter.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { applicationId: "app-1", application: { userId: "user-1" } } }));
    expect(result).toEqual(expect.objectContaining({ kind: "database", fileName: "Engineer_Acme_Cover_Letter.pdf" }));
  });
});
