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

test('view authenticated dashboard totals and pipeline rates', async ({ page }) => {
  await signIn(page)
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
})

test('create, complete, reopen, and delete an application reminder', async ({ page }) => {
  const company = `Reminder verification ${Date.now()}`
  const description = 'Submit the take-home assessment'
  await signIn(page)

  await page.getByRole('link', { name: 'Add application' }).click()
  await page.getByLabel('Company').fill(company)
  await page.getByLabel('Job title').fill('Reminder Engineer')
  await page.getByLabel('Status').selectOption('ASSESSMENT')
  await page.getByRole('button', { name: 'Create application' }).click()
  await expect(page).toHaveURL(/\/applications\/[^/]+$/)
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

  await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
  await page.getByRole('button', { name: 'Delete application' }).click()
  await expect(page).toHaveURL(/\/applications$/)

  const cascadeResponse = await page.request.patch(
    `http://127.0.0.1:3001/api/reminders/${cascadeReminder.id}`,
    { data: { completed: true } },
  )
  expect(cascadeResponse.status()).toBe(404)
})

test('search, filter, sort, and retain application discovery controls', async ({ page }) => {
  await signIn(page)

  await page.getByLabel('Search').fill('shopify')
  await page.getByLabel('Status').selectOption('INTERVIEW')
  await page.getByLabel('Source').fill('Company Website')
  await page.getByRole('button', { name: 'Apply filters' }).click()

  await expect(page).toHaveURL(/search=shopify/)
  await expect(page).toHaveURL(/status=INTERVIEW/)
  await expect(page.getByText('Shopify')).toBeVisible()
  await expect(page.getByText('RBC')).not.toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Search')).toHaveValue('shopify')
  await expect(page.getByText('Shopify')).toBeVisible()

  await page.getByRole('button', { name: 'Clear filters' }).first().click()
  await page.getByLabel('Sort by').selectOption('company')
  await page.getByLabel('Order').selectOption('asc')
  await page.getByRole('button', { name: 'Apply filters' }).click()

  await expect(page.getByRole('row').nth(1)).toContainText('Atlas')
})

test('move an application across the board and record its timeline', async ({ page }) => {
  const company = `Board verification ${Date.now()}`
  await signIn(page)

  await page.getByRole('link', { name: 'Add application' }).click()
  await page.getByLabel('Company').fill(company)
  await page.getByLabel('Job title').fill('Pipeline Engineer')
  await page.getByLabel('Status').selectOption('APPLIED')
  await page.getByRole('button', { name: 'Create application' }).click()

  await page.getByRole('link', { name: 'Board', exact: true }).click()
  const card = page.getByRole('article', {
    name: `${company}, Pipeline Engineer`,
  })
  const screeningColumn = page.getByRole('region', {
    name: 'Screening applications',
  })
  await card.dragTo(screeningColumn)
  await expect(screeningColumn.getByRole('article', {
    name: `${company}, Pipeline Engineer`,
  })).toBeVisible()

  const movedCard = screeningColumn.getByRole('article', {
    name: `${company}, Pipeline Engineer`,
  })
  await movedCard.getByLabel(`Move ${company} to status`).selectOption('INTERVIEW')
  const interviewColumn = page.getByRole('region', {
    name: 'Interview applications',
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
