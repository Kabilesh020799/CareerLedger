"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gmailUpdateReviewService = exports.GmailUpdateReviewConflictError = exports.GmailUpdateReviewNotFoundError = void 0;
exports.buildGmailUpdateSuggestion = buildGmailUpdateSuggestion;
const prisma_1 = require("../config/prisma");
const gmail_update_classifier_1 = require("./gmail-update-classifier");
class GmailUpdateReviewNotFoundError extends Error {
}
exports.GmailUpdateReviewNotFoundError = GmailUpdateReviewNotFoundError;
class GmailUpdateReviewConflictError extends Error {
}
exports.GmailUpdateReviewConflictError = GmailUpdateReviewConflictError;
function buildGmailUpdateSuggestion(message, applications) {
    const classification = (0, gmail_update_classifier_1.classifyGmailMessage)(message);
    if (!classification)
        return null;
    const match = (0, gmail_update_classifier_1.matchGmailMessage)(message, applications);
    return {
        providerMessageId: message.id,
        applicationId: match?.applicationId ?? null,
        suggestedStatus: classification.status,
        suggestedCompany: (0, gmail_update_classifier_1.inferCompany)(message.sender) || null,
        suggestedJobTitle: (0, gmail_update_classifier_1.inferJobTitle)(message.subject) || null,
        subject: message.subject,
        sender: message.sender,
        receivedAt: message.receivedAt,
        matchConfidence: match?.confidence ?? 0,
    };
}
const reviewInclude = {
    application: {
        select: { id: true, company: true, jobTitle: true, status: true },
    },
};
exports.gmailUpdateReviewService = {
    list(userId) {
        return prisma_1.prisma.gmailUpdateReview.findMany({
            where: { userId, status: "PENDING" },
            include: reviewInclude,
            orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
        });
    },
    async resolve(userId, id, input, now = new Date()) {
        return prisma_1.prisma.$transaction(async (transaction) => {
            const review = await transaction.gmailUpdateReview.findFirst({
                where: { id, userId },
            });
            if (!review)
                throw new GmailUpdateReviewNotFoundError("Review not found");
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
                const application = await transaction.application.create({
                    data: {
                        userId,
                        company: input.company,
                        jobTitle: input.jobTitle,
                        source: "Gmail",
                        status: input.status,
                        appliedAt: input.status === "SAVED" ? null : review.receivedAt,
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
