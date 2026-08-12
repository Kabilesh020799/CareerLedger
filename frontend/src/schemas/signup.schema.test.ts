import { describe, expect, it } from 'vitest'
import { signupSchema } from './signup.schema'

const validInput = {
  name: 'New User',
  username: 'new_user',
  email: 'person@example.com',
  password: 'SecurePassword1',
  confirmPassword: 'SecurePassword1',
}

describe('signupSchema', () => {
  it('accepts secure matching account details', () => {
    expect(signupSchema.safeParse(validInput).success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = signupSchema.safeParse({ ...validInput, confirmPassword: 'DifferentPassword1' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.flatten().fieldErrors.confirmPassword).toContain('Passwords do not match')
  })
})
