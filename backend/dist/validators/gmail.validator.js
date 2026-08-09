"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gmailCallbackQuerySchema = void 0;
const zod_1 = require("zod");
exports.gmailCallbackQuerySchema = zod_1.z
    .object({
    code: zod_1.z.string().min(1).optional(),
    error: zod_1.z.string().min(1).optional(),
    state: zod_1.z.string().min(1),
})
    .refine((query) => Boolean(query.code || query.error), {
    message: "The authorization result is missing",
});
