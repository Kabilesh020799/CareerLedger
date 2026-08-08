"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationService = void 0;
const prisma_1 = require("../config/prisma");
exports.applicationService = {
    list(userId) {
        return prisma_1.prisma.application.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    },
    create(userId, data) {
        return prisma_1.prisma.application.create({ data: { ...data, userId } });
    },
    findById(userId, id) {
        return prisma_1.prisma.application.findFirst({ where: { id, userId } });
    },
    async update(userId, id, data) {
        const result = await prisma_1.prisma.application.updateMany({
            where: { id, userId },
            data,
        });
        return result.count === 0 ? null : this.findById(userId, id);
    },
    async remove(userId, id) {
        const result = await prisma_1.prisma.application.deleteMany({ where: { id, userId } });
        return result.count > 0;
    },
};
