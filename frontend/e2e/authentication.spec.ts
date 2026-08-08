import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page) {
  await page.goto('/applications')

  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Username').fill('demo')
  await page.getByLabel('Password').fill('JobTrackerDemo123!')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/applications$/)
}

test('sign in with the demo user and access its applications', async ({ page }) => {
  await signIn(page)

  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible()
  await expect(page.getByText('Shopify')).toBeVisible()
})

test('add a note and record a status change in the application timeline', async ({ page }) => {
  await signIn(page)

  await page.getByRole('link', { name: 'Add application' }).click()
  await page.getByLabel('Company').fill('Timeline verification')
  await page.getByLabel('Job title').fill('Test Engineer')
  await page.getByLabel('Status').selectOption('APPLIED')
  await page.getByRole('button', { name: 'Create application' }).click()

  await expect(page.getByText('No timeline activity yet')).toBeVisible()
  await page.getByLabel(/Occurrence date/).fill('2026-08-07')
  await page.getByLabel(/Note/).fill('Followed up with the recruiter.')
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.getByText('Followed up with the recruiter.')).toBeVisible()

  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Status').selectOption('INTERVIEW')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Status changed from APPLIED to INTERVIEW')).toBeVisible()

  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete application' }).click()
  await expect(page).toHaveURL(/\/applications$/)
})
