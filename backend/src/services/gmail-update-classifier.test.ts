import { describe, expect, it } from "vitest";
import {
  classifyGmailMessage,
  inferCompany,
  inferJobTitle,
  matchGmailMessage,
} from "./gmail-update-classifier";

describe("Gmail recruitment update classification", () => {
  it.each([
    ["Thank you for applying", "APPLIED"],
    ["Thanks for applying to Palona AI", "APPLIED"],
    ["Thank you for your application to Pigmen", "APPLIED"],
    ["Thanks for your application", "APPLIED"],
    ["We have received your application", "APPLIED"],
    ["Complete your coding assessment", "ASSESSMENT"],
    ["Let us schedule an interview", "INTERVIEW"],
    ["We will not be moving forward", "REJECTED"],
    ["Thanks for your interest in Pigment, Kabilesh", "REJECTED"],
    ["We are pleased to offer you the role", "OFFER"],
  ])("classifies %s as %s", (subject, status) => {
    expect(classifyGmailMessage({ subject, snippet: "" })?.status).toBe(status);
  });

  it("does not classify unrelated messages", () => {
    expect(
      classifyGmailMessage({ subject: "Your monthly statement", snippet: "News" }),
    ).toBeNull();
    expect(
      classifyGmailMessage({
        subject: "Thanks for your interest in our careers newsletter",
        snippet: "Read this month's hiring news",
      }),
    ).toBeNull();
    expect(
      classifyGmailMessage({
        subject: "Thanks for applying sunscreen",
        snippet: "Summer skincare tips",
      }),
    ).toBeNull();
  });

  it("matches a unique application using company, role, sender, and timing", () => {
    const result = matchGmailMessage(
      {
        subject: "Acme Software Engineer interview invitation",
        sender: "Acme Recruiting <jobs@acme.com>",
        receivedAt: new Date("2026-08-09T12:00:00.000Z"),
      },
      [
        {
          id: "application-1",
          company: "Acme",
          jobTitle: "Software Engineer",
          appliedAt: new Date("2026-08-01T12:00:00.000Z"),
          createdAt: new Date("2026-08-01T12:00:00.000Z"),
        },
        {
          id: "application-2",
          company: "Globex",
          jobTitle: "Designer",
          appliedAt: null,
          createdAt: new Date("2026-01-01T12:00:00.000Z"),
        },
      ],
    );

    expect(result).toEqual({ applicationId: "application-1", confidence: 100 });
  });

  it("does not select a low-confidence or tied match", () => {
    const application = {
      company: "Acme",
      jobTitle: "Engineer",
      appliedAt: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    };
    const message = {
      subject: "Interview invitation",
      sender: "Recruiter <jobs@example.com>",
      receivedAt: new Date("2026-08-09T00:00:00.000Z"),
    };

    expect(matchGmailMessage(message, [{ id: "one", ...application }])).toBeNull();
    expect(
      matchGmailMessage(message, [
        { id: "one", ...application },
        { id: "two", ...application },
      ]),
    ).toBeNull();
  });

  it("infers editable company and role suggestions without reading a body", () => {
    expect(inferCompany("Acme Recruiting <jobs@acme.com>")).toBe("Acme");
    expect(inferCompany("jobs@north-star.example")).toBe("North Star");
    expect(inferJobTitle("Interview for Senior Software Engineer role")).toBe(
      "Senior Software Engineer",
    );
  });

  it("does not mistake an application acknowledgement for a job title", () => {
    expect(inferJobTitle("Thank you for your application to Pigmen")).toBe("");
  });
});
