import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page) {
  await page.goto('/applications')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Username').fill('demo')
  await page.getByLabel('Password').fill('JobTrackerDemo123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/applications$/)
}

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
}

async function expectInternalHorizontalScroll(locator: ReturnType<Page['locator']>) {
  const dimensions = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth)
}

test('phone workflows fit the viewport and use status tabs for the board', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/login')
  await expectNoPageOverflow(page)
  await signIn(page)

  const menuButton = page.getByRole('button', { name: 'Open navigation' })
  await expect(menuButton).toBeVisible()
  await menuButton.click()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Board', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Application board' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false')
  await expectNoPageOverflow(page)
  const statusTabs = page.getByRole('tablist', { name: 'Choose board status' })
  await expect(statusTabs).toBeVisible()
  await expectInternalHorizontalScroll(statusTabs)
  await page.getByRole('tab', { name: /Interview/ }).click()
  await expect(page.getByRole('region', { name: 'Interview applications' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Applied applications' })).toBeHidden()

  const routes = [
    ['/applications', 'Applications'],
    ['/applications/new', 'Add application'],
    ['/applications/demo-shopify-frontend', 'Frontend Developer'],
    ['/applications/demo-shopify-frontend/edit', 'Edit application'],
    ['/dashboard', 'Dashboard'],
    ['/resumes', 'Resumes'],
    ['/gmail', 'Email sync'],
  ] as const

  for (const [route, heading] of routes) {
    await page.goto(route)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    await expectNoPageOverflow(page)
  }

  await page.goto('/applications')
  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Shopify application' })).toBeVisible()

  const suffix = Date.now()
  let applicationId: string | undefined
  let resumeVersionId: string | undefined
  try {
    const resumeResponse = await page.request.post('http://127.0.0.1:3001/api/resumes', {
      data: { name: `Responsive resume ${suffix}` },
    })
    expect(resumeResponse.ok()).toBe(true)
    resumeVersionId = (await resumeResponse.json()).id

    const applicationResponse = await page.request.post('http://127.0.0.1:3001/api/applications', {
      data: {
        company: `Responsive verification ${suffix}`,
        jobTitle: 'Interface Engineer',
        status: 'INTERVIEW',
        resumeVersionId,
      },
    })
    expect(applicationResponse.ok()).toBe(true)
    applicationId = (await applicationResponse.json()).id

    await page.goto('/dashboard')
    await expect(page.getByRole('row', { name: `Outcomes for Responsive resume ${suffix}` })).toBeVisible()
    await expectNoPageOverflow(page)
    await expectInternalHorizontalScroll(page.getByRole('region', { name: 'Scrollable source outcome comparison' }))
    await expectInternalHorizontalScroll(page.getByRole('region', { name: 'Scrollable resume outcome comparison' }))

    await page.goto(`/applications/${applicationId}`)
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    const dialogBounds = await dialog.boundingBox()
    expect(dialogBounds).not.toBeNull()
    expect(dialogBounds!.x).toBeGreaterThanOrEqual(0)
    expect(dialogBounds!.x + dialogBounds!.width).toBeLessThanOrEqual(320)
    await expect(dialog.getByRole('button', { name: 'Delete application' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
  } finally {
    if (applicationId) {
      await page.request.delete(`http://127.0.0.1:3001/api/applications/${applicationId}`)
    }
    if (resumeVersionId) {
      await page.request.delete(`http://127.0.0.1:3001/api/resumes/${resumeVersionId}`)
    }
  }
})

test('tablet layout uses available width and adaptive form columns', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await signIn(page)

  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
  await expectNoPageOverflow(page)
  await page.goto('/applications/new')
  await expect(page.getByRole('heading', { name: 'Add application' })).toBeVisible()

  const company = await page.getByLabel('Company').boundingBox()
  const jobTitle = await page.getByLabel('Job title').boundingBox()
  expect(company).not.toBeNull()
  expect(jobTitle).not.toBeNull()
  expect(company!.y).toBe(jobTitle!.y)
  expect(company!.x).toBeLessThan(jobTitle!.x)
  await expectNoPageOverflow(page)

  for (const route of ['/dashboard', '/resumes', '/gmail', '/board']) {
    await page.goto(route)
    await expectNoPageOverflow(page)
  }
})

test('desktop layout keeps persistent navigation beside bounded content', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await signIn(page)

  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
  const header = await page.locator('header').boundingBox()
  const main = await page.locator('main').boundingBox()
  expect(header).not.toBeNull()
  expect(main).not.toBeNull()
  expect(main!.x).toBeGreaterThanOrEqual(header!.x + header!.width)
  await expectNoPageOverflow(page)

  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expectNoPageOverflow(page)
})
