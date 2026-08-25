import { expect, test } from '@playwright/test'
import { signInAsDemoUser } from './support/demo-auth'

const apiOrigin = 'http://127.0.0.1:3001/api'

test('shows archived applications grouped under their closed sprint', async ({ page }) => {
  await signInAsDemoUser(page)
  await page.route('**/api/sprints/archived', async (route) => {
    await route.fulfill({ json: [{
      sprint: {
        id: 'sprint-archived-ui',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        name: 'Completed applications',
        sequence: 3,
        status: 'CLOSED',
        durationDays: 14,
        startedAt: '2026-07-24T12:00:00.000Z',
        endsAt: '2026-08-07T12:00:00.000Z',
        closedAt: '2026-08-07T12:00:00.000Z',
        createdAt: '2026-07-24T12:00:00.000Z',
        updatedAt: '2026-08-07T12:00:00.000Z',
      },
      applications: [{
        id: 'application-archived-ui',
        company: 'Northstar Labs',
        jobTitle: 'Platform Engineer',
        location: null,
        jobUrl: null,
        source: null,
        status: 'REJECTED',
        notes: null,
        appliedAt: null,
        createdAt: '2026-08-01T12:00:00.000Z',
        updatedAt: '2026-08-07T12:00:00.000Z',
      }],
    }] })
  })

  await page.getByRole('link', { name: 'Board', exact: true }).click()
  const archive = page.getByRole('region', { name: 'Archived applications' })
  await expect(archive.getByRole('heading', { name: 'Completed applications' })).toBeVisible()
  await expect(archive.getByRole('link', { name: /Northstar Labs.*Platform Engineer/ })).toHaveAttribute('href', '/applications/application-archived-ui')
  await expect(archive.getByText('Rejected')).toBeVisible()
})

test('loads archived sprint groups from the authenticated API', async ({ page }) => {
  await signInAsDemoUser(page)

  const response = await page.request.get(`${apiOrigin}/sprints/archived`)

  expect(response.ok()).toBe(true)
  expect(await response.json()).toEqual(expect.any(Array))
})

test('shows configured sprint timing and blocks an early transition', async ({ page }) => {
  const suffix = `${Date.now()}-${test.info().parallelIndex}`
  const company = `Sprint timing ${suffix}`
  let applicationId: string | undefined

  await signInAsDemoUser(page)
  const membershipsResponse = await page.request.get(`${apiOrigin}/workspaces`)
  expect(membershipsResponse.ok()).toBe(true)
  const memberships = await membershipsResponse.json()
  const workspaceId = memberships[0]?.workspace?.id as string | undefined
  if (!workspaceId) throw new Error('The signed-in test user has no workspace')
  const headers = { 'X-Workspace-Id': workspaceId }

  try {
    const currentResponse = await page.request.get(`${apiOrigin}/sprints/current`, { headers })
    expect(currentResponse.ok()).toBe(true)
    const current = await currentResponse.json()
    const sprintEndsAt = current.sprint?.endsAt ? Date.parse(current.sprint.endsAt) : Number.NaN
    if (!current.sprint || !Number.isFinite(sprintEndsAt) || sprintEndsAt <= Date.now()) {
      const initialSprintResponse = await page.request.post(`${apiOrigin}/sprints/start`, {
        data: { durationDays: 14 },
        headers,
      })
      expect(initialSprintResponse.ok()).toBe(true)
    }

    const applicationResponse = await page.request.post(`${apiOrigin}/applications`, {
      data: { company, jobTitle: 'Timing Engineer', status: 'APPLIED' },
      headers,
    })
    expect(applicationResponse.ok()).toBe(true)
    applicationId = (await applicationResponse.json()).id

    await page.getByRole('link', { name: 'Board', exact: true }).click()
    await expect(page.getByText(/Duration: \d+ days? · Ends/)).toBeVisible()
    await expect(page.getByText(/current sprint remains active until/)).toBeVisible()
    const startButton = page.getByRole('button', { name: 'Start new sprint' })
    await expect(startButton).toBeDisabled()
    await expect(page.getByRole('article', { name: `${company}, Timing Engineer` })).toBeVisible()
  } finally {
    if (applicationId) await page.request.delete(`${apiOrigin}/applications/${applicationId}`, { headers })
  }
})

test('configures and manually starts the next sprint after the end date', async ({ page }) => {
  const now = Date.now()
  const currentSprint = {
    id: 'sprint-expired',
    userId: 'user-1',
    workspaceId: 'workspace-1',
    name: 'Sprint 4',
    sequence: 4,
    status: 'ACTIVE',
    durationDays: 14,
    startedAt: new Date(now - 14 * 86_400_000).toISOString(),
    endsAt: new Date(now - 60_000).toISOString(),
    closedAt: null,
    createdAt: new Date(now - 14 * 86_400_000).toISOString(),
    updatedAt: new Date(now - 14 * 86_400_000).toISOString(),
  }
  const nextSprint = {
    ...currentSprint,
    id: 'sprint-next',
    name: 'Focused sprint',
    sequence: 5,
    durationDays: 21,
    startedAt: new Date(now).toISOString(),
    endsAt: new Date(now + 21 * 86_400_000).toISOString(),
    updatedAt: new Date(now).toISOString(),
  }
  let current = { sprint: currentSprint, applications: [] }
  let startRequestBody: unknown

  await signInAsDemoUser(page)
  await page.route('**/api/sprints/current', async (route) => {
    await route.fulfill({ json: current })
  })
  await page.route('**/api/sprints/start', async (route) => {
    startRequestBody = route.request().postDataJSON()
    current = { sprint: nextSprint, applications: [] }
    await route.fulfill({ status: 201, json: {
      sprint: nextSprint,
      previousSprint: currentSprint,
      carriedOverCount: 0,
      closedRejectedCount: 0,
    } })
  })

  await page.getByRole('link', { name: 'Board', exact: true }).click()
  await expect(page.getByText('This sprint has ended. You can start the next sprint when you are ready.')).toBeVisible()
  await expect(page.getByText('Sprint ended')).toBeVisible()
  const startButton = page.getByRole('button', { name: 'Start new sprint' })
  await expect(startButton).toBeEnabled()
  await startButton.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Sprint duration (days)')).toHaveValue('14')
  await dialog.getByLabel('Sprint name (optional)').fill('Focused sprint')
  await dialog.getByLabel('Sprint duration (days)').fill('21')
  await dialog.getByRole('button', { name: 'Start sprint' }).click()

  await expect.poll(() => startRequestBody).toEqual({ name: 'Focused sprint', durationDays: 21 })
  await expect(page.getByText(/0 applications carried over\. 0 rejected applications closed/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Focused sprint' })).toBeVisible()
  await expect(page.getByText(/Duration: 21 days · Ends/)).toBeVisible()
})

test('shows a safe conflict message when the server rejects an early transition', async ({ page }) => {
  const now = Date.now()
  const currentSprint = {
    id: 'sprint-race',
    userId: 'user-1',
    workspaceId: 'workspace-1',
    name: 'Sprint race',
    sequence: 6,
    status: 'ACTIVE',
    durationDays: 14,
    startedAt: new Date(now - 60_000).toISOString(),
    endsAt: new Date(now - 10_000).toISOString(),
    closedAt: null,
    createdAt: new Date(now - 60_000).toISOString(),
    updatedAt: new Date(now - 60_000).toISOString(),
  }
  const serverEnd = new Date(now + 86_400_000).toISOString()

  await signInAsDemoUser(page)
  await page.route('**/api/sprints/current', async (route) => {
    await route.fulfill({ json: { sprint: currentSprint, applications: [] } })
  })
  await page.route('**/api/sprints/start', async (route) => {
    await route.fulfill({ status: 409, json: {
      error: 'The current sprint has not ended yet.',
      endsAt: serverEnd,
    } })
  })

  await page.getByRole('link', { name: 'Board', exact: true }).click()
  await page.getByRole('button', { name: 'Start new sprint' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Start sprint' }).click()

  await expect(dialog.getByRole('alert')).toContainText('The current sprint has not ended yet.')
  await expect(dialog.getByRole('alert')).toContainText('current sprint remains active until')
})

test('returns 409 and preserves the current sprint when an API transition is early', async ({ page }) => {
  await signInAsDemoUser(page)
  const membershipsResponse = await page.request.get(`${apiOrigin}/workspaces`)
  expect(membershipsResponse.ok()).toBe(true)
  const memberships = await membershipsResponse.json()
  const workspaceId = memberships[0]?.workspace?.id as string | undefined
  if (!workspaceId) throw new Error('The signed-in test user has no workspace')
  const headers = { 'X-Workspace-Id': workspaceId }

  let currentResponse = await page.request.get(`${apiOrigin}/sprints/current`, { headers })
  expect(currentResponse.ok()).toBe(true)
  let current = await currentResponse.json()
  const currentEndsAt = current.sprint?.endsAt ? Date.parse(current.sprint.endsAt) : Number.NaN
  if (!current.sprint || !Number.isFinite(currentEndsAt) || currentEndsAt <= Date.now()) {
    const startedResponse = await page.request.post(`${apiOrigin}/sprints/start`, {
      data: { durationDays: 14 },
      headers,
    })
    expect(startedResponse.ok()).toBe(true)
    currentResponse = await page.request.get(`${apiOrigin}/sprints/current`, { headers })
    expect(currentResponse.ok()).toBe(true)
    current = await currentResponse.json()
  }

  const response = await page.request.post(`${apiOrigin}/sprints/start`, {
    data: { durationDays: 21 },
    headers,
  })
  expect(response.status()).toBe(409)
  const body = await response.json()
  expect(body).toMatchObject({
    error: 'The current sprint has not ended yet.',
    endsAt: current.sprint.endsAt,
  })

  const unchangedResponse = await page.request.get(`${apiOrigin}/sprints/current`, { headers })
  expect(unchangedResponse.ok()).toBe(true)
  const unchanged = await unchangedResponse.json()
  expect(unchanged.sprint.id).toBe(current.sprint.id)
})
