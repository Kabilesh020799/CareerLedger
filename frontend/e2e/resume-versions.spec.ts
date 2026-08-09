import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page) {
  await page.goto('/applications')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Username').fill('demo')
  await page.getByLabel('Password').fill('JobTrackerDemo123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/applications$/)
}

test('manage a resume version and associate it with an application', async ({ page }) => {
  const suffix = Date.now()
  const initialName = `Full-stack resume ${suffix}`
  const revisedName = `Backend resume ${suffix}`
  const company = `Resume verification ${suffix}`

  await signIn(page)
  await page.getByRole('link', { name: 'Resumes' }).click()

  await page.getByLabel(/^Name/).fill(initialName)
  await page.getByLabel('Notes').fill('TypeScript and React focus')
  await page.getByRole('button', { name: 'Add resume version' }).click()

  const resumeCard = page.getByRole('article', { name: initialName })
  await expect(resumeCard).toContainText('TypeScript and React focus')
  await resumeCard.getByRole('button', { name: 'Edit' }).click()
  await resumeCard.getByLabel(/^Name/).fill(revisedName)
  await resumeCard.getByRole('button', { name: 'Save resume version' }).click()
  await expect(page.getByRole('article', { name: revisedName })).toBeVisible()

  await page.getByRole('link', { name: 'Applications' }).click()
  await page.getByRole('link', { name: 'Add application' }).click()
  await page.getByLabel('Company').fill(company)
  await page.getByLabel('Job title').fill('Platform Engineer')
  await page.getByRole('button', { name: 'Create application' }).click()
  await expect(page.getByRole('heading', { name: 'Platform Engineer' })).toBeVisible()
  const applicationUrl = page.url()

  await expect(page.getByText('Resume version', { exact: true }).locator('..')).toContainText('Not provided')
  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Resume version').selectOption({ label: revisedName })
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL(applicationUrl)
  await expect(page.getByText('Resume version', { exact: true }).locator('..')).toContainText(revisedName)

  await page.getByRole('link', { name: 'Resumes' }).click()
  const revisedCard = page.getByRole('article', { name: revisedName })
  await revisedCard.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete resume version' }).click()
  await expect(revisedCard).not.toBeVisible()

  await page.goto(applicationUrl)
  await expect(page.getByText('Resume version', { exact: true }).locator('..')).toContainText('Not provided')
  await expect(page.getByText(company, { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
  await page.getByRole('button', { name: 'Delete application' }).click()
  await expect(page).toHaveURL(/\/applications$/)
})
