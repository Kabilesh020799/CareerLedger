import { describe, expect, it } from 'vitest'
import { loginSchema } from './login.schema'

describe('loginSchema', () => {
  it('accepts a username and password', () => {
    expect(loginSchema.safeParse({ username: 'demo', password: 'password' }).success).toBe(true)
  })

  it('requires both credentials', () => {
    const result = loginSchema.safeParse({ username: '', password: '' })

    expect(result.success).toBe(false)
  })
})
