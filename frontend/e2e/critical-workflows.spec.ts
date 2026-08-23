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
  await page.getByLabel('Attach cover letter').setInputFiles({
    name: 'cover-letter.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\nCareerLedger cover letter\n%%EOF'),
  })
  await page.getByRole('button', { name: 'Create application' }).click()

  await expect(page.getByRole('heading', { name: 'Reliability Engineer' })).toBeVisible()
  await expect(page.getByText(company, { exact: true })).toBeVisible()
  await expect(page.getByText(`Reliability_Engineer_${company.replaceAll(' ', '_')}_Cover_Letter.pdf`)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download cover letter' })).toBeVisible()
  const applicationUrl = page.url()

  await page.getByRole('link', { name: 'Applications', exact: true }).click()
  await page.getByLabel('Search').fill(company)
  await page.getByRole('row').filter({ hasText: company }).getByRole('link', { name: `Open ${company} application` }).click()
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

test('rejects unsafe job URL schemes before saving an application', async ({ page }) => {
  await signInAsDemoUser(page)
  await page.getByRole('link', { name: 'Add application' }).click()
  await page.getByLabel('Company').fill('Unsafe URL validation')
  await page.getByLabel('Job title').fill('Security Engineer')
  await page.getByLabel('Job URL').fill('javascript:alert(1)')
  await page.getByRole('button', { name: 'Create application' }).click()

  await expect(page.getByText('Enter a valid HTTP or HTTPS URL')).toBeVisible()
  await expect(page).toHaveURL(/\/applications\/new$/)
})

test('shows notification delivery capabilities from the authenticated API', async ({ page }) => {
  await signInAsDemoUser(page)
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('link', { name: 'Notifications' }).click()
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(page.getByText(/configure SMTP/)).toBeVisible()
  await expect(page.getByText(/configured VAPID keys/)).toBeVisible()
  const channelSwitches = page.getByRole('checkbox')
  await expect(channelSwitches).toHaveCount(2)
  await expect(channelSwitches.first()).toBeDisabled()
  await expect(channelSwitches.last()).toBeDisabled()

  await page.goto('/team')
  await page.getByLabel('Email address').fill('not-an-email')
  await page.getByRole('button', { name: 'Create invitation' }).click()
  await expect(page.getByText('Enter a valid email address')).toBeVisible()

  await page.goto('/data')
  await expect(page.getByText('No file selected')).toBeVisible()
  await expect(page.getByText('JSON files only. Maximum 1,000 applications.')).toBeVisible()
  await expect(page.getByText('Choose JSON backup')).toBeVisible()
})
