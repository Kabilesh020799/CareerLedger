import { prisma } from "../config/prisma";
import type { Prisma } from "../generated/prisma/client";
import type { ResolveGmailUpdateReviewInput } from "../validators/gmail-update-review.validator";
import type { ApplicationResumeAttachmentInput } from "../validators/application-resume.validator";
import { applicationResumeCreateData } from "./application-resume.service";
import {
  classifyGmailMessage,
  inferCompany,
  inferJobTitle,
  matchGmailMessage,
  type GmailApplicationCandidate,
  type GmailMessageMetadata,
} from "./gmail-update-classifier";
import { gmailLlmClassifier } from "./gmail-llm-classifier.service";

export class GmailUpdateReviewNotFoundError extends Error {}
export class GmailUpdateReviewConflictError extends Error {}

export async function buildGmailUpdateSuggestion(
  message: GmailMessageMetadata,
  applications: GmailApplicationCandidate[],
  accountEmail: string,
  llmClassifier: Pick<typeof gmailLlmClassifier, "classify"> = gmailLlmClassifier,
) {
  const deterministicClassification = classifyGmailMessage(message);
  const classification =
    deterministicClassification ??
    (await llmClassifier.classify(message, accountEmail));
  if (!classification) return null;
  const match = matchGmailMessage(message, applications);

  return {
    providerMessageId: message.id,
    applicationId: match?.applicationId ?? null,
    suggestedStatus: classification.status,
    suggestedCompany: classification.company || inferCompany(message.sender) || null,
    suggestedJobTitle: classification.jobTitle || inferJobTitle(message.subject, message.snippet) || null,
    subject: message.subject,
    sender: message.sender,
    receivedAt: message.receivedAt,
    matchConfidence: match?.confidence ?? 0,
  };
}

/**
 * Applies free deterministic rules first, then classifies only ambiguous
 * messages through the LLM's token-efficient batch interface.
 */
export async function buildGmailUpdateSuggestions(
  messages: GmailMessageMetadata[],
  applications: GmailApplicationCandidate[],
  accountEmail: string,
  llmClassifier: Pick<
    typeof gmailLlmClassifier,
    "classifyBatch"
  > = gmailLlmClassifier,
) {
  const classifications = messages.map(classifyGmailMessage);
  const ambiguousIndexes = classifications.flatMap((classification, index) =>
    classification ? [] : [index],
  );

  if (ambiguousIndexes.length) {
    const ambiguousClassifications = await llmClassifier.classifyBatch(
      ambiguousIndexes.map((index) => messages[index]),
      accountEmail,
    );
    ambiguousIndexes.forEach((messageIndex, resultIndex) => {
      classifications[messageIndex] = ambiguousClassifications[resultIndex] ?? null;
    });
  }

  return messages.flatMap((message, index) => {
    const classification = classifications[index];
    if (!classification) return [];
    const match = matchGmailMessage(message, applications);
    return [
      {
        providerMessageId: message.id,
        applicationId: match?.applicationId ?? null,
        suggestedStatus: classification.status,
        suggestedCompany: classification.company || inferCompany(message.sender) || null,
        suggestedJobTitle: classification.jobTitle || inferJobTitle(message.subject, message.snippet) || null,
        subject: message.subject,
        sender: message.sender,
        receivedAt: message.receivedAt,
        matchConfidence: match?.confidence ?? 0,
      },
    ];
  });
}

const reviewInclude = {
  application: {
    select: { id: true, company: true, jobTitle: true, status: true },
  },
} satisfies Prisma.GmailUpdateReviewInclude;

export const gmailUpdateReviewService = {
  list(userId: string) {
    return prisma.gmailUpdateReview.findMany({
      where: { userId, status: "PENDING" },
      include: reviewInclude,
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
    });
  },

  async resolve(
    userId: string,
    id: string,
    input: ResolveGmailUpdateReviewInput,
    now = new Date(),
    resume?: ApplicationResumeAttachmentInput,
  ) {
    return prisma.$transaction(async (transaction) => {
      const review = await transaction.gmailUpdateReview.findFirst({
        where: { id, userId },
      });
      if (!review) throw new GmailUpdateReviewNotFoundError("Review not found");
      if (review.status !== "PENDING") {
        throw new GmailUpdateReviewConflictError("Review was already resolved");
      }

      if (input.action === "IGNORE") {
        const resolvedReview = await transaction.gmailUpdateReview.update({
          where: { id: review.id },
          data: { status: "IGNORED", resolvedAt: now },
          include: reviewInclude,
        });
        return { review: resolvedReview, application: null };
      }

      if (input.action === "CREATE_APPLICATION") {
        if (input.resumeVersionId) {
          const resumeVersion = await transaction.resumeVersion.findFirst({
            where: { id: input.resumeVersionId, userId },
            select: { id: true },
          });
          if (!resumeVersion) {
            throw new GmailUpdateReviewNotFoundError("Resume tag not found");
          }
        }
        const application = await transaction.application.create({
          data: {
            userId,
            company: input.company,
            jobTitle: input.jobTitle,
            source: "Gmail",
            status: input.status,
            appliedAt: input.status === "SAVED" ? null : review.receivedAt,
            resumeVersionId: input.resumeVersionId ?? null,
            ...(resume
              ? {
                  resumeAttachment: {
                    create: applicationResumeCreateData(
                      input.jobTitle,
                      input.company,
                      resume,
                    ),
                  },
                }
              : {}),
          },
        });
        await transaction.applicationEvent.create({
          data: {
            applicationId: application.id,
            type: "NOTE",
            description: "Application created from a confirmed Gmail update",
            occurredAt: review.receivedAt ?? now,
          },
        });
        const resolvedReview = await transaction.gmailUpdateReview.update({
          where: { id: review.id },
          data: {
            applicationId: application.id,
            suggestedStatus: input.status,
            suggestedCompany: input.company,
            suggestedJobTitle: input.jobTitle,
            status: "CONFIRMED",
            resolvedAt: now,
          },
          include: reviewInclude,
        });
        return { review: resolvedReview, application };
      }

      const existingApplication = await transaction.application.findFirst({
        where: { id: input.applicationId, userId },
      });
      if (!existingApplication) {
        throw new GmailUpdateReviewNotFoundError("Application not found");
      }

      const application = await transaction.application.update({
        where: { id: existingApplication.id },
        data: { status: input.status },
      });
      if (existingApplication.status !== input.status) {
        await transaction.applicationEvent.create({
          data: {
            applicationId: application.id,
            type: "STATUS_CHANGE",
            description: `Status changed from ${existingApplication.status} to ${input.status} after Gmail review`,
            fromStatus: existingApplication.status,
            toStatus: input.status,
            occurredAt: review.receivedAt ?? now,
          },
        });
      }
      const resolvedReview = await transaction.gmailUpdateReview.update({
        where: { id: review.id },
        data: {
          applicationId: application.id,
          suggestedStatus: input.status,
          status: "CONFIRMED",
          resolvedAt: now,
        },
        include: reviewInclude,
      });
      return { review: resolvedReview, application };
    });
  },
};
