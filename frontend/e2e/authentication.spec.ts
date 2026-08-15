import { expect, test } from '@playwright/test'
import { chooseCustomSelectOption } from './support/custom-select'
import { signInAsDemoUser } from './support/demo-auth'

test('create an account and enter its private workspace', async ({ page }) => {
  const suffix = `${Date.now()}-${test.info().parallelIndex}`
  await page.goto('/login')
  await page.getByRole('link', { name: 'Create an account' }).click()

  await page.getByLabel('Name', { exact: true }).fill('Signup User')
  await page.getByLabel('Username', { exact: true }).fill(`signup_${suffix}`)
  await page.getByLabel('Email', { exact: true }).fill(`signup-${suffix}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill('SecurePassword1')
  await page.getByLabel('Confirm password').fill('SecurePassword1')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/applications$/)
  await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No applications yet', exact: true })).toBeVisible()
})

test('switch and retain the application color theme', async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => window.localStorage.removeItem('job-tracker-color-mode'))
  await page.reload()

  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await signInAsDemoUser(page)
  const signOutButton = page.getByRole('button', { name: 'Sign out' })
  const lightThemeButton = page.getByRole('button', { name: 'Switch to light theme' })
  await expect(lightThemeButton).toBeVisible()
  const signOutBounds = await signOutButton.boundingBox()
  const lightThemeBounds = await lightThemeButton.boundingBox()
  expect(signOutBounds).not.toBeNull()
  expect(lightThemeBounds).not.toBeNull()
  expect(lightThemeBounds!.y).toBe(signOutBounds!.y)

  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('sign in with the demo user and access its applications', async ({ page }) => {
  await signInAsDemoUser(page)

  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Shopify' })).toBeVisible()
})

test('view email synchronization configuration status', async ({ page }) => {
  await signInAsDemoUser(page)
  await page.getByRole('link', { name: 'Email sync' }).click()

  await expect(page.getByRole('heading', { name: 'Email sync' })).toBeVisible()
  await expect(page.getByText('Email sync is not configured')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Authorize Gmail' })).toHaveCount(0)
})

test('view authenticated dashboard totals, pipeline rates, and source outcomes', async ({ page }) => {
  await signInAsDemoUser(page)
  const summaryResponse = await page.request.get(
    'http://127.0.0.1:3001/api/dashboard/summary',
  )
  expect(summaryResponse.ok()).toBe(true)
  const summary = await summaryResponse.json()

  await page.getByRole('link', { name: 'Dashboard' }).click()

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(
    page.getByRole('article', { name: 'Total applications' }).getByText(
      String(summary.totalApplications),
      { exact: true },
    ),
  ).toBeVisible()
  await expect(page.getByRole('article', { name: 'Screening progression' }))
    .toContainText(`${summary.conversionRates.screening}%`)
  await expect(page.getByRole('article', { name: 'Interview progression' }))
    .toContainText(`${summary.conversionRates.interview}%`)
  await expect(page.getByRole('article', { name: 'Offer progression' }))
    .toContainText(`${summary.conversionRates.offer}%`)

  const companyWebsite = summary.sourceOutcomes.find(
    (outcome: { source: string }) => outcome.source === 'Company Website',
  )
  expect(companyWebsite).toBeTruthy()
  const sourceRow = page.getByRole('row', { name: 'Outcomes for Company Website' })
  await expect(sourceRow).toContainText(String(companyWebsite.submittedApplications))
  await expect(sourceRow).toContainText(`${companyWebsite.outcomeRates.response}%`)
  await expect(sourceRow).toContainText(`${companyWebsite.outcomeRates.interview}%`)
  await expect(sourceRow).toContainText(`${companyWebsite.outcomeRates.offer}%`)
})

test('create a reminder from an inactive application suggestion', async ({ page }) => {
  await signInAsDemoUser(page)

  const existingRemindersResponse = await page.request.get(
    'http://127.0.0.1:3001/api/applications/demo-cove-quality-engineer/reminders',
  )
  expect(existingRemindersResponse.ok()).toBe(true)
  const existingReminders = await existingRemindersResponse.json()
  for (const reminder of existingReminders) {
    if (reminder.type === 'FOLLOW_UP') {
      const deleteResponse = await page.request.delete(
        `http://127.0.0.1:3001/api/reminders/${reminder.id}`,
      )
      expect(deleteResponse.ok()).toBe(true)
    }
  }

  await page.getByRole('link', { name: 'Dashboard' }).click()

  const suggestion = page.getByRole('article', { name: 'Follow up with Cove Labs' })
  await expect(suggestion).toBeVisible()
  await expect(suggestion.getByRole('link', { name: 'Cove Labs — Quality Engineer' }))
    .toHaveAttribute('href', '/applications/demo-cove-quality-engineer')
  await suggestion.getByRole('button', { name: 'Add follow-up' }).click()

  await expect(page.getByRole('button', { name: 'Add follow-up' })).not.toBeVisible()
  const reminder = page.getByRole('article', { name: 'Follow up with Cove Labs' })
  await expect(reminder.getByRole('button', { name: 'Complete' })).toBeVisible()
  await reminder.getByRole('link', { name: /Cove Labs/ }).click()

  const applicationReminder = page.getByRole('article', {
    name: 'Follow up with Cove Labs',
  })
  await applicationReminder.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete reminder' }).click()
  await expect(applicationReminder).not.toBeVisible()
})

test('create, complete, reopen, and delete an application reminder', async ({ page }) => {
  const suffix = Date.now()
  const company = `Reminder verification ${suffix}`
  const description = `Submit the take-home assessment ${suffix}`
  await signInAsDemoUser(page)

  await page.getByRole('link', { name: 'Add application' }).click()
  await page.getByLabel('Company').fill(company)
  await page.getByLabel('Job title').fill('Reminder Engineer')
  await chooseCustomSelectOption(page, 'Status', 'Assessment')
  await page.getByRole('button', { name: 'Create application' }).click()
  await expect(page.getByRole('heading', { name: 'Reminder Engineer' })).toBeVisible()
  await expect(page).toHaveURL(/\/applications\/(?!new$)[^/]+$/)
  const applicationUrl = page.url()

  await page.getByLabel(/Reminder type/).selectOption('DEADLINE')
  await page.getByLabel(/Description/).fill(description)
  await page.getByLabel(/Due date and time/).fill('2099-08-15T09:30')
  await page.getByRole('button', { name: 'Add reminder' }).click()
  await expect(page.getByRole('article', { name: description })).toBeVisible()

  await page.getByRole('link', { name: 'Dashboard' }).click()
  const dashboardReminder = page.getByRole('article', { name: description })
  await expect(dashboardReminder).toBeVisible()
  await expect(dashboardReminder.getByRole('link', { name: new RegExp(company) }))
    .toHaveAttribute('href', new URL(applicationUrl).pathname)
  await dashboardReminder.getByRole('button', { name: 'Complete' }).click()
  await expect(dashboardReminder).not.toBeVisible()

  await page.goto(applicationUrl)
  const completedReminder = page.getByRole('article', { name: description })
  await expect(completedReminder.getByText('Completed')).toBeVisible()
  await completedReminder.getByRole('button', { name: 'Reopen' }).click()
  await expect(completedReminder.getByText('Upcoming')).toBeVisible()
  await completedReminder.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete reminder' }).click()
  await expect(page.getByRole('article', { name: description })).not.toBeVisible()

  const cascadeDescription = 'Verify application reminder cascade'
  await page.getByLabel(/Reminder type/).selectOption('FOLLOW_UP')
  await page.getByLabel(/Description/).fill(cascadeDescription)
  await page.getByLabel(/Due date and time/).fill('2099-08-16T09:30')
  await page.getByRole('button', { name: 'Add reminder' }).click()
  await expect(page.getByRole('article', { name: cascadeDescription })).toBeVisible()

  const applicationId = new URL(applicationUrl).pathname.split('/').at(-1)
  const remindersResponse = await page.request.get(
    `http://127.0.0.1:3001/api/applications/${applicationId}/reminders`,
  )
  expect(remindersResponse.ok()).toBe(true)
  const reminders = await remindersResponse.json()
  const cascadeReminder = reminders.find(
    (reminder: { description: string }) => reminder.description === cascadeDescription,
  )
  expect(cascadeReminder?.id).toBeTruthy()

  await page.getByRole('button', { name: 'Delete', exact: true }).last().click()
  await page.getByRole('button', { name: 'Delete application' }).click()
  await expect(page).toHaveURL(/\/applications$/)

  const cascadeResponse = await page.request.patch(
    `http://127.0.0.1:3001/api/reminders/${cascadeReminder.id}`,
    { data: { completed: true } },
  )
  expect(cascadeResponse.status()).toBe(404)
})

test('search, filter, sort, and retain application discovery controls', async ({ page }) => {
  await signInAsDemoUser(page)

  await page.getByLabel('Search').fill('shopify')
  await chooseCustomSelectOption(page, 'Status', 'Interview')
  await page.getByRole('button', { name: 'More filters' }).click()
  await page.getByLabel('Source').fill('Company Website')
  await expect(page).toHaveURL(/search=shopify/)
  await expect(page).toHaveURL(/status=INTERVIEW/)
  await expect(page.getByRole('link', { name: 'Shopify' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'RBC', exact: true })).toHaveCount(0)

  await page.reload()
  await expect(page.getByLabel('Search')).toHaveValue('shopify')
  await expect(page.getByRole('link', { name: 'Shopify' })).toBeVisible()

  await page.getByRole('button', { name: 'Clear filters' }).first().click()
  await expect(page).not.toHaveURL(/search=/)
  await expect(page.getByLabel('Search')).toHaveValue('')
  await expect(page.getByRole('combobox', { name: 'Status' })).toContainText('All statuses')
  await expect(page.getByLabel('Source')).toHaveValue('')
  await chooseCustomSelectOption(page, 'Sort by', 'Company')
  await chooseCustomSelectOption(page, 'Order', 'Ascending')
  await expect(page.getByRole('row').nth(1)).toContainText('Atlas')
})

test('move an application across the board and record its timeline', async ({ page }) => {
  const company = `Board verification ${Date.now()}`
  await signInAsDemoUser(page)

  await page.getByRole('link', { name: 'Add application' }).click()
  await page.getByLabel('Company').fill(company)
  await page.getByLabel('Job title').fill('Pipeline Engineer')
  await chooseCustomSelectOption(page, 'Status', 'Applied')
  await page.getByRole('button', { name: 'Create application' }).click()

  await page.getByRole('link', { name: 'Board', exact: true }).click()
  const card = page.getByRole('article', {
    name: `${company}, Pipeline Engineer`,
  })
  const screeningColumn = page.getByRole('tabpanel', {
    name: /Screening/,
  })
  const applicationHref = await card.getByRole('link', { name: company }).getAttribute('href')
  const applicationId = applicationHref?.split('/').at(-1)
  if (!applicationId) throw new Error('Created application link is missing its ID')
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
  await dataTransfer.evaluate((transfer, id) => transfer.setData('text/plain', id), applicationId)
  await card.dispatchEvent('dragstart', { dataTransfer })
  await screeningColumn.dispatchEvent('dragenter', { dataTransfer })
  await screeningColumn.dispatchEvent('dragover', { dataTransfer })
  await screeningColumn.dispatchEvent('drop', { dataTransfer })
  await card.dispatchEvent('dragend', { dataTransfer })
  await expect(screeningColumn.getByRole('article', {
    name: `${company}, Pipeline Engineer`,
  })).toBeVisible()

  const movedCard = screeningColumn.getByRole('article', {
    name: `${company}, Pipeline Engineer`,
  })
  await chooseCustomSelectOption(page, `Move ${company} to status`, 'Interview', movedCard)
  const interviewColumn = page.getByRole('tabpanel', {
    name: /Interview/,
  })
  await expect(interviewColumn.getByRole('article', {
    name: `${company}, Pipeline Engineer`,
  })).toBeVisible()

  await interviewColumn.getByRole('link', { name: company }).click()
  await expect(page.getByText('Status changed from APPLIED to SCREENING')).toBeVisible()
  await expect(page.getByText('Status changed from SCREENING to INTERVIEW')).toBeVisible()

  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete application' }).click()
  await expect(page).toHaveURL(/\/applications$/)
})

test('add a note and record a status change in the application timeline', async ({ page }) => {
  await signInAsDemoUser(page)

  await page.getByRole('link', { name: 'Add application' }).click()
  await page.getByLabel('Company').fill('Timeline verification')
  await page.getByLabel('Job title').fill('Test Engineer')
  await chooseCustomSelectOption(page, 'Status', 'Applied')
  await page.getByRole('button', { name: 'Create application' }).click()

  await expect(page.getByText('No timeline activity yet')).toBeVisible()
  await page.getByLabel(/Occurrence date/).fill('2026-08-07')
  await page.getByLabel(/Note/).fill('Followed up with the recruiter.')
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.getByText('Followed up with the recruiter.')).toBeVisible()

  await page.getByRole('link', { name: 'Edit', exact: true }).click()
  await chooseCustomSelectOption(page, 'Status', 'Interview')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Status changed from APPLIED to INTERVIEW')).toBeVisible()

  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete application' }).click()
  await expect(page).toHaveURL(/\/applications$/)
})
