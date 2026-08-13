import { expect, test, type Page } from '@playwright/test'
import { chooseCustomSelectOption } from './support/custom-select'

async function signIn(page: Page) {
  await page.goto('/applications')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Username').fill('demo')
  await page.getByLabel('Password').fill('JobTrackerDemo123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/applications$/)
}

test('manage a resume tag and associate it with an application', async ({ page }) => {
  const suffix = Date.now()
  const initialName = `Full-stack resume ${suffix}`
  const revisedName = `Backend resume ${suffix}`
  const company = `Resume verification ${suffix}`

  await signIn(page)
  await page.getByRole('link', { name: 'Resumes' }).click()
  await page.getByRole('tab', { name: 'Strategy tags' }).click()
  await page.getByLabel('Tag name').fill(initialName)
  await page.getByRole('button', { name: 'Add custom tag' }).click()

  const resumeCard = page.getByRole('article', { name: initialName })
  await expect(resumeCard).toBeVisible()
  await resumeCard.getByRole('button', { name: 'Edit' }).click()
  await resumeCard.getByLabel(/^Tag name/).fill(revisedName)
  await resumeCard.getByRole('button', { name: 'Save tag' }).click()
  await expect(page.getByRole('article', { name: revisedName })).toBeVisible()

  await page.getByRole('link', { name: 'Applications' }).click()
  await page.getByRole('link', { name: 'Add application' }).click()
  await page.getByLabel('Company').fill(company)
  await page.getByLabel('Job title').fill('Platform Engineer')
  await chooseCustomSelectOption(page, 'Status', 'Interview')
  await page.getByRole('button', { name: 'Create application' }).click()
  await expect(page.getByRole('heading', { name: 'Platform Engineer' })).toBeVisible()
  const applicationUrl = page.url()

  await expect(page.getByText('Resume tag', { exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Edit', exact: true }).click()
  await chooseCustomSelectOption(page, 'Resume tag', revisedName)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL(applicationUrl)
  await expect(page.getByText('Resume tag', { exact: true }).locator('..')).toContainText(revisedName)

  await page.getByRole('link', { name: 'Dashboard' }).click()
  await page.getByRole('tab', { name: 'By resume tag' }).click()
  const outcomeRow = page.getByRole('row', { name: `Outcomes for ${revisedName}` })
  await expect(outcomeRow.getByText('1', { exact: true })).toBeVisible()
  await expect(outcomeRow.getByText('100%')).toHaveCount(2)
  await expect(outcomeRow.getByText('0%', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Resumes' }).click()
  await page.getByRole('tab', { name: 'Strategy tags' }).click()
  const revisedCard = page.getByRole('article', { name: revisedName })
  await revisedCard.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete resume tag' }).click()
  await expect(revisedCard).not.toBeVisible()

  await page.goto(applicationUrl)
  await expect(page.getByText('Resume tag', { exact: true })).toHaveCount(0)
  await expect(page.getByText(company, { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
  await page.getByRole('button', { name: 'Delete application' }).click()
  await expect(page).toHaveURL(/\/applications$/)
})
