import { expect, type Page } from '@playwright/test'

function requiredEnvironment(name: 'DEMO_USER_USERNAME' | 'DEMO_USER_PASSWORD') {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required for seeded browser tests`)
  return value
}

export async function signInAsDemoUser(page: Page) {
  await page.goto('/applications')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Username').fill(requiredEnvironment('DEMO_USER_USERNAME'))
  await page.getByLabel('Password').fill(requiredEnvironment('DEMO_USER_PASSWORD'))
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/applications$/)
}
