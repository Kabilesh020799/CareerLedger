import { expect, test } from '@playwright/test'
import { chooseCustomSelectOption } from './support/custom-select'
import { signInAsDemoUser } from './support/demo-auth'

test('sign in, create, open, edit, and delete an application, then sign out', async ({ page }) => {
  const suffix = Date.now()
  const company = `Critical workflow ${suffix}`
  await signInAsDemoUser(page)

  await page.getByRole('link', { name: 'Add application' }).click()
  await page.getByLabel('Company').fill(company)
  await page.getByLabel('Job title').fill('Reliability Engineer')
  await page.getByLabel('Location').fill('Halifax, NS')
  await chooseCustomSelectOption(page, 'Status', 'Applied')
  await page.getByRole('button', { name: 'Create application' }).click()

  await expect(page.getByRole('heading', { name: 'Reliability Engineer' })).toBeVisible()
  await expect(page.getByText(company, { exact: true })).toBeVisible()
  const applicationUrl = page.url()

  await page.getByRole('link', { name: 'Applications', exact: true }).click()
  await page.getByLabel('Search').fill(company)
  await page.getByRole('row').filter({ hasText: company }).getByRole('link', { name: 'View' }).click()
  await expect(page).toHaveURL(applicationUrl)

  await page.getByRole('link', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Job title').fill('Senior Reliability Engineer')
  await chooseCustomSelectOption(page, 'Status', 'Interview')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('heading', { name: 'Senior Reliability Engineer' })).toBeVisible()
  await expect(page.getByText('Status changed from APPLIED to INTERVIEW')).toBeVisible()

  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Delete application' }).click()
  await expect(page).toHaveURL(/\/applications$/)
  await expect(page.getByText(company, { exact: true })).not.toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})

test('shows validation without creating an incomplete application', async ({ page }) => {
  await signInAsDemoUser(page)
  await page.getByRole('link', { name: 'Add application' }).click()
  await page.getByRole('button', { name: 'Create application' }).click()
  await expect(page.getByText('Company is required')).toBeVisible()
  await expect(page.getByText('Job title is required')).toBeVisible()
  await expect(page).toHaveURL(/\/applications\/new$/)
})

test('shows notification delivery capabilities from the authenticated API', async ({ page }) => {
  await signInAsDemoUser(page)
  await page.getByRole('link', { name: 'Notifications' }).click()
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(page.getByText(/configure SMTP/)).toBeVisible()
  await expect(page.getByText(/configured VAPID keys/)).toBeVisible()
  const channelSwitches = page.getByRole('checkbox')
  await expect(channelSwitches).toHaveCount(2)
  await expect(channelSwitches.first()).toBeDisabled()
  await expect(channelSwitches.last()).toBeDisabled()
})
