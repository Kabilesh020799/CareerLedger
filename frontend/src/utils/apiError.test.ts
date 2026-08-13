import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { getApiErrorMessage } from './apiError'

describe('getApiErrorMessage', () => {
  it('includes the safe request reference returned for an unexpected API failure', () => {
    const error = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
      data: { error: 'Internal server error', requestId: 'request-123' },
      status: 500,
      statusText: 'Internal Server Error',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    })

    expect(getApiErrorMessage(error, 'Please try again.')).toBe(
      'Internal server error Reference: request-123',
    )
  })
})
