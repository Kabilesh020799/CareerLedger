import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, transactionMock } = vi.hoisted(() => {
  const transaction = {
    gmailUpdateReview: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    application: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    applicationEvent: { create: vi.fn() },
    resumeVersion: { findFirst: vi.fn() },
  };
  return {
    transactionMock: transaction,
    prismaMock: {
      gmailUpdateReview: { findMany: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import {
  buildGmailUpdateSuggestion,
  GmailUpdateReviewConflictError,
  GmailUpdateReviewNotFoundError,
  gmailUpdateReviewService,
} from "./gmail-update-review.service";

const pendingReview = {
  id: "review-1",
  userId: "user-1",
  status: "PENDING",
  receivedAt: new Date("2026-08-09T12:00:00.000Z"),
};

const reviewInclude = {
  application: {
    select: { id: true, company: true, jobTitle: true, status: true },
  },
};

describe("buildGmailUpdateSuggestion", () => {
  const message = {
    id: "message-1",
    threadId: "thread-1",
    subject: "Application update",
    sender: "Acme Recruiting <jobs@acme.example>",
    receivedAt: new Date("2026-08-09T12:00:00.000Z"),
    snippet: "We would like to discuss the next stage.",
  };

  it("uses deterministic classification without sending metadata to the LLM", async () => {
    const classify = vi.fn();

    const suggestion = await buildGmailUpdateSuggestion(
      { ...message, subject: "Interview invitation" },
      [],
      { classify },
    );

    expect(suggestion?.suggestedStatus).toBe("INTERVIEW");
    expect(classify).not.toHaveBeenCalled();
  });

  it("uses a validated LLM result only to create a pending suggestion", async () => {
    const classify = vi.fn().mockResolvedValue({
      isRecruitmentUpdate: true,
      status: "SCREENING",
      confidence: 90,
    });

    const suggestion = await buildGmailUpdateSuggestion(message, [], { classify });

    expect(classify).toHaveBeenCalledWith(message);
    expect(suggestion).toMatchObject({
      providerMessageId: "message-1",
      applicationId: null,
      suggestedStatus: "SCREENING",
    });
  });

  it("keeps the deterministic no-suggestion behavior when fallback is unavailable", async () => {
    const classify = vi.fn().mockResolvedValue(null);

    await expect(
      buildGmailUpdateSuggestion(message, [], { classify }),
    ).resolves.toBeNull();
  });
});

describe("gmailUpdateReviewService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) =>
      callback(transactionMock),
    );
  });

  it("lists only the current user's pending reviews", async () => {
    prismaMock.gmailUpdateReview.findMany.mockResolvedValue([]);

    await gmailUpdateReviewService.list("user-1");

    expect(prismaMock.gmailUpdateReview.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "PENDING" },
      include: reviewInclude,
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
    });
  });

  it("updates an owned application, records its event, and confirms the review atomically", async () => {
    transactionMock.gmailUpdateReview.findFirst.mockResolvedValue(pendingReview);
    transactionMock.application.findFirst.mockResolvedValue({
      id: "application-1",
      status: "APPLIED",
    });
    transactionMock.application.update.mockResolvedValue({
      id: "application-1",
      status: "INTERVIEW",
    });
    transactionMock.gmailUpdateReview.update.mockResolvedValue({
      ...pendingReview,
      status: "CONFIRMED",
    });

    await gmailUpdateReviewService.resolve(
      "user-1",
      "review-1",
      { action: "CONFIRM", applicationId: "application-1", status: "INTERVIEW" },
      new Date("2026-08-10T00:00:00.000Z"),
    );

    expect(transactionMock.application.findFirst).toHaveBeenCalledWith({
      where: { id: "application-1", userId: "user-1" },
    });
    expect(transactionMock.applicationEvent.create).toHaveBeenCalledWith({
      data: {
        applicationId: "application-1",
        type: "STATUS_CHANGE",
        description: "Status changed from APPLIED to INTERVIEW after Gmail review",
        fromStatus: "APPLIED",
        toStatus: "INTERVIEW",
        occurredAt: pendingReview.receivedAt,
      },
    });
    expect(transactionMock.gmailUpdateReview.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: {
        applicationId: "application-1",
        suggestedStatus: "INTERVIEW",
        status: "CONFIRMED",
        resolvedAt: new Date("2026-08-10T00:00:00.000Z"),
      },
      include: reviewInclude,
    });
  });

  it("creates an owned application and review event only after confirmation", async () => {
    transactionMock.gmailUpdateReview.findFirst.mockResolvedValue(pendingReview);
    transactionMock.application.create.mockResolvedValue({
      id: "application-new",
      company: "Acme",
      jobTitle: "Engineer",
      status: "APPLIED",
    });
    transactionMock.gmailUpdateReview.update.mockResolvedValue({
      ...pendingReview,
      status: "CONFIRMED",
    });

    await gmailUpdateReviewService.resolve("user-1", "review-1", {
      action: "CREATE_APPLICATION",
      company: "Acme",
      jobTitle: "Engineer",
      status: "APPLIED",
    });

    expect(transactionMock.application.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        company: "Acme",
        jobTitle: "Engineer",
        source: "Gmail",
        status: "APPLIED",
        appliedAt: pendingReview.receivedAt,
        resumeVersionId: null,
      },
    });
    expect(transactionMock.applicationEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationId: "application-new",
        type: "NOTE",
        description: "Application created from a confirmed Gmail update",
      }),
    });
  });

  it("creates a Gmail application with an owned resume tag and attachment atomically", async () => {
    transactionMock.gmailUpdateReview.findFirst.mockResolvedValue(pendingReview);
    transactionMock.resumeVersion.findFirst.mockResolvedValue({ id: "resume-version-1" });
    transactionMock.application.create.mockResolvedValue({ id: "application-new" });
    transactionMock.gmailUpdateReview.update.mockResolvedValue({
      ...pendingReview,
      status: "CONFIRMED",
    });
    const resume = {
      originalName: "resume.pdf",
      extension: ".pdf" as const,
      mimeType: "application/pdf" as const,
      size: 128,
      content: Buffer.from("%PDF-1.7"),
    };

    await gmailUpdateReviewService.resolve(
      "user-1",
      "review-1",
      {
        action: "CREATE_APPLICATION",
        company: "Acme",
        jobTitle: "Engineer",
        status: "APPLIED",
        resumeVersionId: "resume-version-1",
      },
      undefined,
      resume,
    );

    expect(transactionMock.resumeVersion.findFirst).toHaveBeenCalledWith({
      where: { id: "resume-version-1", userId: "user-1" },
      select: { id: true },
    });
    expect(transactionMock.application.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resumeVersionId: "resume-version-1",
        resumeAttachment: {
          create: expect.objectContaining({
            fileName: "Engineer_Acme.pdf",
            mimeType: "application/pdf",
            size: 128,
          }),
        },
      }),
    });
  });

  it("ignores a review without changing an application", async () => {
    transactionMock.gmailUpdateReview.findFirst.mockResolvedValue(pendingReview);
    transactionMock.gmailUpdateReview.update.mockResolvedValue({
      ...pendingReview,
      status: "IGNORED",
    });

    const result = await gmailUpdateReviewService.resolve(
      "user-1",
      "review-1",
      { action: "IGNORE" },
    );

    expect(result.application).toBeNull();
    expect(transactionMock.application.update).not.toHaveBeenCalled();
    expect(transactionMock.applicationEvent.create).not.toHaveBeenCalled();
  });

  it("rejects missing, inaccessible, and already resolved reviews", async () => {
    transactionMock.gmailUpdateReview.findFirst.mockResolvedValueOnce(null);
    await expect(
      gmailUpdateReviewService.resolve("user-1", "other-review", {
        action: "IGNORE",
      }),
    ).rejects.toBeInstanceOf(GmailUpdateReviewNotFoundError);

    transactionMock.gmailUpdateReview.findFirst.mockResolvedValueOnce({
      ...pendingReview,
      status: "CONFIRMED",
    });
    await expect(
      gmailUpdateReviewService.resolve("user-1", "review-1", {
        action: "IGNORE",
      }),
    ).rejects.toBeInstanceOf(GmailUpdateReviewConflictError);

    transactionMock.gmailUpdateReview.findFirst.mockResolvedValueOnce(pendingReview);
    transactionMock.application.findFirst.mockResolvedValueOnce(null);
    await expect(
      gmailUpdateReviewService.resolve("user-1", "review-1", {
        action: "CONFIRM",
        applicationId: "other-user-application",
        status: "OFFER",
      }),
    ).rejects.toBeInstanceOf(GmailUpdateReviewNotFoundError);
  });
});
