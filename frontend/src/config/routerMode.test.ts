import { describe, expect, it } from 'vitest'
import { resolveRouterMode } from './routerMode'

describe('resolveRouterMode', () => {
  it('uses hash routing for a static Pages deployment', () => {
    expect(resolveRouterMode('hash')).toBe('hash')
  })

  it.each([undefined, '', 'browser', 'unexpected'])(
    'keeps browser routing for %s',
    (value) => {
      expect(resolveRouterMode(value)).toBe('browser')
    },
  )
})
