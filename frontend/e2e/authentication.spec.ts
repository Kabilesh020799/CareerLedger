import { expect, test } from '@playwright/test'

test('sign in with the demo user and access its applications', async ({ page }) => {
  await page.goto('/applications')

  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Username').fill('demo')
  await page.getByLabel('Password').fill('JobTrackerDemo123!')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/applications$/)
  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible()
  await expect(page.getByText('Shopify')).toBeVisible()
})
