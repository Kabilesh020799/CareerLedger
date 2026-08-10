import { describe, expect, it } from "vitest";
import {
  applicationResumeMaxBytes,
  validateApplicationResume,
  type ResumeUploadFile,
} from "./application-resume.validator";

function upload(
  originalname: string,
  mimetype: string,
  buffer: Buffer,
): ResumeUploadFile {
  return { originalname, mimetype, buffer, size: buffer.length };
}

describe("application resume validation", () => {
  it("accepts a PDF whose extension, MIME type, and signature agree", () => {
    const buffer = Buffer.from("%PDF-1.7\nresume");

    expect(
      validateApplicationResume(
        upload("My Resume.PDF", "application/pdf", buffer),
      ),
    ).toEqual({
      success: true,
      data: {
        content: buffer,
        extension: ".pdf",
        mimeType: "application/pdf",
        size: buffer.length,
      },
    });
  });

  it.each([
    {
      name: "resume.doc",
      mimeType: "application/msword",
      content: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      extension: ".doc",
    },
    {
      name: "resume.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x01]),
      extension: ".docx",
    },
  ])("accepts a valid $extension resume", ({ name, mimeType, content, extension }) => {
    expect(validateApplicationResume(upload(name, mimeType, content))).toMatchObject({
      success: true,
      data: { extension, mimeType, size: content.length },
    });
  });

  it("allows creation without an attachment", () => {
    expect(validateApplicationResume(undefined)).toEqual({
      success: true,
      data: undefined,
    });
  });

  it("rejects unsupported, empty, and oversized files", () => {
    expect(
      validateApplicationResume(
        upload("resume.txt", "text/plain", Buffer.from("resume")),
      ),
    ).toMatchObject({ success: false, error: expect.stringContaining("PDF") });
    expect(
      validateApplicationResume(upload("resume.pdf", "application/pdf", Buffer.alloc(0))),
    ).toMatchObject({ success: false, error: expect.stringContaining("empty") });
    expect(
      validateApplicationResume(
        upload(
          "resume.pdf",
          "application/pdf",
          Buffer.alloc(applicationResumeMaxBytes + 1),
        ),
      ),
    ).toMatchObject({ success: false, error: expect.stringContaining("5 MB") });
  });

  it("rejects a file whose contents do not match its declared type", () => {
    expect(
      validateApplicationResume(
        upload("resume.pdf", "application/pdf", Buffer.from("not a PDF")),
      ),
    ).toEqual({
      success: false,
      error: "Resume contents must match its PDF, DOC, or DOCX file type",
    });
  });
});
