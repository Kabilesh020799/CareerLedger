import { z } from 'zod'
import {
  applicationSortFields,
  applicationStatuses,
  type ApplicationDiscoveryQuery,
} from '../types/application'

const dateInput = z.iso.date({ error: 'Enter a valid date' })

const optionalQueryText = z.string().trim().min(1).max(100).optional()
const queryApplicationLimit = z.coerce
  .number()
  .int()
  .refine((value) => [10, 20, 50].includes(value))

const formApplicationLimit = z
  .number()
  .int()
  .refine((value) => [10, 20, 50].includes(value))

const applicationDiscoveryQuerySchema = z
  .object({
    search: optionalQueryText,
    status: z.enum(applicationStatuses).optional(),
    source: optionalQueryText,
    appliedFrom: dateInput.optional(),
    appliedTo: dateInput.optional(),
    sortBy: z.enum(applicationSortFields).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: queryApplicationLimit.default(20),
  })
  .refine(
    ({ appliedFrom, appliedTo }) =>
      !appliedFrom || !appliedTo || appliedFrom <= appliedTo,
    { message: 'From date must be before or equal to to date', path: ['appliedTo'] },
  )

export const applicationDiscoveryFormSchema = z
  .object({
    search: z.string().trim().max(100, 'Search must contain at most 100 characters'),
    status: z.union([z.enum(applicationStatuses), z.literal('')]),
    source: z.string().trim().max(100, 'Source must contain at most 100 characters'),
    appliedFrom: z.union([dateInput, z.literal('')]),
    appliedTo: z.union([dateInput, z.literal('')]),
    sortBy: z.enum(applicationSortFields),
    sortOrder: z.enum(['asc', 'desc']),
    limit: formApplicationLimit,
  })
  .refine(
    ({ appliedFrom, appliedTo }) =>
      !appliedFrom || !appliedTo || appliedFrom <= appliedTo,
    { message: 'From date must be before or equal to to date', path: ['appliedTo'] },
  )

export type ApplicationDiscoveryFormValues = z.infer<
  typeof applicationDiscoveryFormSchema
>

export const defaultApplicationDiscoveryQuery: ApplicationDiscoveryQuery = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
}

export function applicationDiscoveryFromSearchParams(
  searchParams: URLSearchParams,
): ApplicationDiscoveryQuery {
  const parsed = applicationDiscoveryQuerySchema.safeParse({
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    source: searchParams.get('source') || undefined,
    appliedFrom: searchParams.get('appliedFrom') || undefined,
    appliedTo: searchParams.get('appliedTo') || undefined,
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: searchParams.get('sortOrder') || undefined,
    page: searchParams.get('page') || undefined,
    limit: searchParams.get('limit') || undefined,
  })

  return parsed.success ? parsed.data : defaultApplicationDiscoveryQuery
}

export function applicationDiscoveryToSearchParams(
  query: ApplicationDiscoveryQuery,
) {
  const searchParams = new URLSearchParams()

  if (query.search) searchParams.set('search', query.search)
  if (query.status) searchParams.set('status', query.status)
  if (query.source) searchParams.set('source', query.source)
  if (query.appliedFrom) searchParams.set('appliedFrom', query.appliedFrom)
  if (query.appliedTo) searchParams.set('appliedTo', query.appliedTo)
  if (query.sortBy !== 'createdAt') searchParams.set('sortBy', query.sortBy)
  if (query.sortOrder !== 'desc') searchParams.set('sortOrder', query.sortOrder)
  if (query.page !== 1) searchParams.set('page', String(query.page))
  if (query.limit !== 20) searchParams.set('limit', String(query.limit))

  return searchParams
}

export function applicationDiscoveryToFormValues(
  query: ApplicationDiscoveryQuery,
): ApplicationDiscoveryFormValues {
  return {
    search: query.search ?? '',
    status: query.status ?? '',
    source: query.source ?? '',
    appliedFrom: query.appliedFrom ?? '',
    appliedTo: query.appliedTo ?? '',
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    limit: query.limit,
  }
}

export function applicationDiscoveryFormToQuery(
  values: ApplicationDiscoveryFormValues,
): ApplicationDiscoveryQuery {
  const search = values.search.trim()
  const source = values.source.trim()

  return {
    search: search || undefined,
    status: values.status || undefined,
    source: source || undefined,
    appliedFrom: values.appliedFrom || undefined,
    appliedTo: values.appliedTo || undefined,
    sortBy: values.sortBy,
    sortOrder: values.sortOrder,
    page: 1,
    limit: values.limit,
  }
}

export function hasApplicationDiscoveryFilters(query: ApplicationDiscoveryQuery) {
  return Boolean(
    query.search ||
      query.status ||
      query.source ||
      query.appliedFrom ||
      query.appliedTo,
  )
}
