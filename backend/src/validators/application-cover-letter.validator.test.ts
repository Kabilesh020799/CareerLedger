import { describe, expect, it } from "vitest";
import { applicationCoverLetterMaxBytes, validateApplicationCoverLetter } from "./application-cover-letter.validator";

describe("validateApplicationCoverLetter", () => {
  it("accepts a PDF whose MIME type and signature match", () => {
    const content = Buffer.from("%PDF-1.7\ncover letter");
    expect(validateApplicationCoverLetter({ originalname: "letter.pdf", mimetype: "application/pdf", size: content.length, buffer: content })).toEqual({
      success: true,
      data: { content, extension: ".pdf", mimeType: "application/pdf", size: content.length },
    });
  });

  it("rejects spoofed and oversized cover letters", () => {
    expect(validateApplicationCoverLetter({ originalname: "letter.pdf", mimetype: "application/pdf", size: 5, buffer: Buffer.from("hello") })).toEqual({ success: false, error: expect.stringContaining("contents") });
    expect(validateApplicationCoverLetter({ originalname: "letter.pdf", mimetype: "application/pdf", size: applicationCoverLetterMaxBytes + 1, buffer: Buffer.from("%PDF-") })).toEqual({ success: false, error: "Cover letter must be 5 MB or smaller" });
  });
});
