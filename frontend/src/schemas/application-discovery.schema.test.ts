import { describe, expect, it } from 'vitest'
import {
  applicationDiscoveryFormSchema,
  applicationDiscoveryFormToQuery,
  applicationDiscoveryFromSearchParams,
  applicationDiscoveryToSearchParams,
  defaultApplicationDiscoveryQuery,
} from './application-discovery.schema'

describe('application discovery schema', () => {
  it('parses filters, sorting, and pagination from URL parameters', () => {
    const query = applicationDiscoveryFromSearchParams(new URLSearchParams(
      'search=engineer&status=INTERVIEW&source=Referral&appliedFrom=2026-07-01&appliedTo=2026-08-01&sortBy=company&sortOrder=asc&page=2&limit=10',
    ))

    expect(query).toEqual({
      search: 'engineer',
      status: 'INTERVIEW',
      source: 'Referral',
      appliedFrom: '2026-07-01',
      appliedTo: '2026-08-01',
      sortBy: 'company',
      sortOrder: 'asc',
      page: 2,
      limit: 10,
    })
  })

  it('falls back to safe defaults when URL parameters are invalid', () => {
    expect(applicationDiscoveryFromSearchParams(new URLSearchParams('page=0&limit=15')))
      .toEqual(defaultApplicationDiscoveryQuery)
  })

  it('omits default values when serializing URL parameters', () => {
    const params = applicationDiscoveryToSearchParams({
      ...defaultApplicationDiscoveryQuery,
      search: 'Acme',
      status: 'APPLIED',
    })

    expect(params.toString()).toBe('search=Acme&status=APPLIED')
  })

  it('rejects an inverted applied-date range', () => {
    const result = applicationDiscoveryFormSchema.safeParse({
      search: '',
      status: '',
      source: '',
      appliedFrom: '2026-08-02',
      appliedTo: '2026-08-01',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 20,
    })

    expect(result.success).toBe(false)
  })

  it('trims form filters and resets pagination when applying them', () => {
    expect(applicationDiscoveryFormToQuery({
      search: '  engineer  ',
      status: '',
      source: '  Referral ',
      appliedFrom: '',
      appliedTo: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      limit: 50,
    })).toEqual({
      search: 'engineer',
      status: undefined,
      source: 'Referral',
      appliedFrom: undefined,
      appliedTo: undefined,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      page: 1,
      limit: 50,
    })
  })
})
