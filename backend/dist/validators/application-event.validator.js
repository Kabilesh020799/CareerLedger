"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApplicationEventSchema = void 0;
const zod_1 = require("zod");
exports.createApplicationEventSchema = zod_1.z
    .object({
    type: zod_1.z.literal("NOTE"),
    description: zod_1.z
        .string()
        .trim()
        .min(1, "Description is required")
        .max(2000, "Description must contain at most 2000 characters"),
    occurredAt: zod_1.z.coerce.date(),
})
    .strict();
