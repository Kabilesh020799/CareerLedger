"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationService = void 0;
const prisma_1 = require("../config/prisma");
exports.applicationService = {
    list() {
        return prisma_1.prisma.application.findMany({ orderBy: { createdAt: "desc" } });
    },
    create(data) {
        return prisma_1.prisma.application.create({ data });
    },
    findById(id) {
        return prisma_1.prisma.application.findUnique({ where: { id } });
    },
    async update(id, data) {
        const result = await prisma_1.prisma.application.updateMany({
            where: { id },
            data,
        });
        return result.count === 0 ? null : this.findById(id);
    },
    async remove(id) {
        const result = await prisma_1.prisma.application.deleteMany({ where: { id } });
        return result.count > 0;
    },
};
