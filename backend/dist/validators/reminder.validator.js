"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReminderSchema = exports.createReminderSchema = exports.reminderTypes = void 0;
const zod_1 = require("zod");
exports.reminderTypes = ["FOLLOW_UP", "DEADLINE"];
exports.createReminderSchema = zod_1.z
    .object({
    type: zod_1.z.enum(exports.reminderTypes),
    description: zod_1.z.string().trim().min(1).max(200),
    dueAt: zod_1.z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
})
    .strict();
exports.updateReminderSchema = zod_1.z
    .object({
    completed: zod_1.z.boolean(),
})
    .strict();
