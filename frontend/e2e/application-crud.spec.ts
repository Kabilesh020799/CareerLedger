import { expect, test } from '@playwright/test'

test('create, open, edit, and delete an application', async ({ page }) => {
  const uniqueCompany = `E2E Company ${Date.now()}`

  await page.goto('/applications')
  await page.getByRole('link', { name: 'Add application' }).click()

  await page.getByLabel('Company').fill(uniqueCompany)
  await page.getByLabel('Job title').fill('Frontend Engineer')
  await page.getByLabel('Location').fill('Remote')
  await page.getByLabel('Source').fill('Company Website')
  await page.getByLabel('Status').selectOption('APPLIED')
  await page.getByRole('button', { name: 'Create application' }).click()

  await expect(page.getByRole('heading', { name: 'Frontend Engineer' })).toBeVisible()
  await expect(page.getByText(uniqueCompany)).toBeVisible()

  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Job title').fill('Senior Frontend Engineer')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByRole('heading', { name: 'Senior Frontend Engineer' })).toBeVisible()

  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Delete application?' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete application' }).click()

  await expect(page).toHaveURL(/\/applications$/)
  await expect(page.getByText(uniqueCompany)).not.toBeVisible()
})
