import { z } from "zod";
import { applicationStatuses } from "./application.validator";

export const applicationSortFields = [
  "appliedAt",
  "createdAt",
  "updatedAt",
  "company",
] as const;

const appliedFromDate = z.iso
  .date()
  .transform((date) => new Date(`${date}T00:00:00.000Z`));

const appliedToDate = z.iso.date().transform((date) => {
  return new Date(`${date}T23:59:59.999Z`);
});

export const applicationDiscoverySchema = z
  .object({
    search: z.string().trim().min(1).max(100).optional(),
    status: z.enum(applicationStatuses).optional(),
    source: z.string().trim().min(1).max(100).optional(),
    appliedFrom: appliedFromDate.optional(),
    appliedTo: appliedToDate.optional(),
    sortBy: z.enum(applicationSortFields).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .refine((value) => [10, 20, 50].includes(value), {
        message: "Limit must be 10, 20, or 50",
      })
      .default(20),
  })
  .strict()
  .refine(
    ({ appliedFrom, appliedTo }) =>
      !appliedFrom || !appliedTo || appliedFrom <= appliedTo,
    {
      message: "Applied from date must be before or equal to applied to date",
      path: ["appliedTo"],
    },
  );

export type ApplicationDiscoveryInput = z.infer<
  typeof applicationDiscoverySchema
>;
