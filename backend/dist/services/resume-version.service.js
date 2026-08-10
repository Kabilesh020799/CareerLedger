"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeVersionService = void 0;
const prisma_1 = require("../config/prisma");
function isUniqueConstraintError(error) {
    return (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002");
}
exports.resumeVersionService = {
    list(userId) {
        return prisma_1.prisma.resumeVersion.findMany({
            where: { userId },
            orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        });
    },
    listUploaded(userId) {
        return prisma_1.prisma.applicationResume.findMany({
            where: { application: { userId } },
            select: {
                id: true,
                applicationId: true,
                fileName: true,
                mimeType: true,
                size: true,
                createdAt: true,
                application: {
                    select: { company: true, jobTitle: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    },
    async create(userId, data) {
        try {
            const resumeVersion = await prisma_1.prisma.resumeVersion.create({
                data: { ...data, userId },
            });
            return { kind: "success", data: resumeVersion };
        }
        catch (error) {
            if (isUniqueConstraintError(error))
                return { kind: "conflict" };
            throw error;
        }
    },
    async update(userId, id, data) {
        try {
            return await prisma_1.prisma.$transaction(async (transaction) => {
                const existing = await transaction.resumeVersion.findFirst({
                    where: { id, userId },
                    select: { id: true },
                });
                if (!existing)
                    return { kind: "not_found" };
                const resumeVersion = await transaction.resumeVersion.update({
                    where: { id },
                    data,
                });
                return { kind: "success", data: resumeVersion };
            });
        }
        catch (error) {
            if (isUniqueConstraintError(error))
                return { kind: "conflict" };
            throw error;
        }
    },
    async remove(userId, id) {
        const result = await prisma_1.prisma.resumeVersion.deleteMany({
            where: { id, userId },
        });
        return result.count > 0;
    },
};
