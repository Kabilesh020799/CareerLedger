"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationDiscoverySchema = exports.applicationSortFields = void 0;
const zod_1 = require("zod");
const application_validator_1 = require("./application.validator");
exports.applicationSortFields = [
    "appliedAt",
    "createdAt",
    "updatedAt",
    "company",
];
const appliedFromDate = zod_1.z.iso
    .date()
    .transform((date) => new Date(`${date}T00:00:00.000Z`));
const appliedToDate = zod_1.z.iso.date().transform((date) => {
    return new Date(`${date}T23:59:59.999Z`);
});
exports.applicationDiscoverySchema = zod_1.z
    .object({
    search: zod_1.z.string().trim().min(1).max(100).optional(),
    status: zod_1.z.enum(application_validator_1.applicationStatuses).optional(),
    source: zod_1.z.string().trim().min(1).max(100).optional(),
    appliedFrom: appliedFromDate.optional(),
    appliedTo: appliedToDate.optional(),
    sortBy: zod_1.z.enum(exports.applicationSortFields).default("createdAt"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).default("desc"),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce
        .number()
        .int()
        .refine((value) => [10, 20, 50].includes(value), {
        message: "Limit must be 10, 20, or 50",
    })
        .default(20),
})
    .strict()
    .refine(({ appliedFrom, appliedTo }) => !appliedFrom || !appliedTo || appliedFrom <= appliedTo, {
    message: "Applied from date must be before or equal to applied to date",
    path: ["appliedTo"],
});
