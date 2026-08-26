import { expect, test } from '@playwright/test'
import { signInAsDemoUser } from './support/demo-auth'

const apiOrigin = 'http://127.0.0.1:3001/api'

test('shows archived applications from a dedicated navigation item', async ({ page }) => {
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

  await page.getByRole('link', { name: 'Archive', exact: true }).click()
  const archive = page.getByRole('region', { name: 'Archived applications' })
  await expect(archive.getByRole('heading', { name: 'Completed applications' })).toBeVisible()
  await expect(archive.getByRole('link', { name: /Northstar Labs.*Platform Engineer/ })).toHaveAttribute('href', '/applications/application-archived-ui')
  await expect(archive.getByText('Rejected')).toBeVisible()
})

test('schedules multiple named sprints and shows the upcoming timeline', async ({ page }) => {
  const firstStart = new Date(Date.now() + 2 * 86_400_000)
  const secondStart = new Date(Date.now() + 5 * 86_400_000)
  secondStart.setSeconds(0, 0)
  secondStart.setHours(0, 0, 0, 0)
  const toLocalDate = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
  const toSprint = (id: string, name: string, sequence: number, start: Date, durationDays: number) => ({
    id,
    userId: 'user-1',
    workspaceId: 'workspace-1',
    name,
    sequence,
    status: 'SCHEDULED',
    scheduledStartAt: start.toISOString(),
    durationDays,
    startedAt: new Date().toISOString(),
    endsAt: new Date(start.getTime() + durationDays * 86_400_000).toISOString(),
    closedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  let scheduled = [toSprint('sprint-planned-1', 'Interview push', 2, firstStart, 14)]
  const scheduleRequests: unknown[] = []

  await signInAsDemoUser(page)
  await page.route('**/api/sprints/current', async (route) => {
    const now = Date.now()
    await route.fulfill({ json: {
      sprint: {
        id: 'sprint-active-ui',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        name: 'Current sprint',
        sequence: 1,
        status: 'ACTIVE',
        durationDays: 14,
        startedAt: new Date(now - 7 * 86_400_000).toISOString(),
        endsAt: new Date(now + 7 * 86_400_000).toISOString(),
        closedAt: null,
        createdAt: new Date(now - 7 * 86_400_000).toISOString(),
        updatedAt: new Date(now).toISOString(),
      },
      applications: [],
    } })
  })
  await page.route('**/api/sprints/archived', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.route('**/api/sprints', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({ json: scheduled })
  })
  await page.route('**/api/sprints/schedule', async (route) => {
    const body = route.request().postDataJSON() as { name?: string; durationDays?: number; startsAt: string }
    scheduleRequests.push(body)
    const next = toSprint(
      `sprint-planned-${scheduled.length + 1}`,
      body.name ?? `Sprint ${scheduled.length + 1}`,
      scheduled.length + 2,
      new Date(body.startsAt),
      body.durationDays ?? 14,
    )
    scheduled = [...scheduled, next]
    await route.fulfill({ status: 201, json: next })
  })

  await page.getByRole('link', { name: 'Board', exact: true }).click()
  const upcoming = page.getByRole('region', { name: 'Upcoming sprints' })
  await expect(upcoming.getByRole('heading', { name: 'Interview push' })).toBeVisible()

  await page.getByRole('button', { name: 'Schedule sprint' }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Sprint name (optional)').fill('Launch follow-up')
  await dialog.getByLabel('Sprint duration (days)').fill('21')
  await dialog.getByLabel(/Scheduled start/).fill(toLocalDate(secondStart))
  await expect(dialog.getByText(/Starts at midnight in/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Schedule sprint' }).click()

  await expect.poll(() => scheduleRequests).toHaveLength(1)
  await expect.poll(() => scheduleRequests[0]).toEqual({
    name: 'Launch follow-up',
    durationDays: 21,
    startsAt: secondStart.toISOString(),
  })

  await expect(upcoming.getByRole('heading', { name: 'Launch follow-up' })).toBeVisible()
  await expect(upcoming.getByRole('heading', { name: 'Interview push' })).toBeVisible()
  await expect(upcoming.getByText('Duration: 21 days')).toBeVisible()
})

test('guides first-run users to start before scheduling future sprints', async ({ page }) => {
  await signInAsDemoUser(page)
  await page.route('**/api/sprints/current', async (route) => {
    await route.fulfill({ json: { sprint: null, applications: [] } })
  })
  await page.route('**/api/sprints/archived', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.route('**/api/sprints', async (route) => {
    await route.fulfill({ json: [] })
  })

  await page.getByRole('link', { name: 'Board', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Start your first sprint' })).toBeVisible()
  await expect(page.getByText('Schedule future sprints after this one is active.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Schedule sprint' })).toHaveCount(0)
})

test('shows upcoming sprint plans on the dashboard', async ({ page }) => {
  const start = new Date(Date.now() + 4 * 86_400_000)
  start.setHours(0, 0, 0, 0)
  const scheduled = {
    id: 'sprint-dashboard-upcoming',
    userId: 'user-1',
    workspaceId: 'workspace-1',
    name: 'Dashboard focus',
    sequence: 2,
    status: 'SCHEDULED',
    scheduledStartAt: start.toISOString(),
    durationDays: 14,
    startedAt: start.toISOString(),
    endsAt: new Date(start.getTime() + 14 * 86_400_000).toISOString(),
    closedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await signInAsDemoUser(page)
  await page.route('**/api/dashboard/summary', async (route) => {
    await route.fulfill({ json: {
      totalApplications: 0,
      createdThisWeek: 0,
      weekStartedAt: new Date().toISOString(),
      submittedApplications: 0,
      statusCounts: { SAVED: 0, APPLIED: 0, SCREENING: 0, ASSESSMENT: 0, INTERVIEW: 0, OFFER: 0, REJECTED: 0, WITHDRAWN: 0 },
      conversionRates: { screening: 0, interview: 0, offer: 0 },
      resumeOutcomes: [],
      sourceOutcomes: [],
    } })
  })
  await page.route('**/api/sprints', async (route) => {
    await route.fulfill({ json: [scheduled] })
  })

  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  const summary = page.getByRole('region', { name: 'Upcoming sprint schedule' })
  await expect(summary.getByRole('article', { name: 'Dashboard focus, upcoming sprint summary' })).toBeVisible()
  await expect(summary.getByText(/Starts/)).toBeVisible()
  await expect(summary.getByText(/Ends/)).toBeVisible()
  await expect(summary.getByRole('link', { name: 'Manage on Board' })).toHaveAttribute('href', '/board#upcoming-sprints-heading')
})

test('edits and cancels an upcoming sprint from the timeline', async ({ page }) => {
  const start = new Date(Date.now() + 4 * 86_400_000)
  start.setSeconds(0, 0)
  const toLocalDate = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
  const toSprint = (name: string, durationDays: number) => ({
    id: 'sprint-upcoming-actions',
    userId: 'user-1',
    workspaceId: 'workspace-1',
    name,
    sequence: 2,
    status: 'SCHEDULED',
    scheduledStartAt: start.toISOString(),
    durationDays,
    startedAt: start.toISOString(),
    endsAt: new Date(start.getTime() + durationDays * 86_400_000).toISOString(),
    closedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  let scheduled: ReturnType<typeof toSprint>[] = [toSprint('Interview push', 14)]
  const patchRequests: unknown[] = []
  let deleteRequests = 0

  await signInAsDemoUser(page)
  await page.route('**/api/sprints/current', async (route) => {
    await route.fulfill({ json: { sprint: null, applications: [] } })
  })
  await page.route('**/api/sprints/archived', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.route('**/api/sprints', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ json: scheduled })
    else await route.continue()
  })
  await page.route('**/api/sprints/sprint-upcoming-actions', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as { name?: string; durationDays?: number; startsAt?: string }
      patchRequests.push(body)
      scheduled = [{
        ...scheduled[0],
        name: body.name ?? scheduled[0].name,
        durationDays: body.durationDays ?? scheduled[0].durationDays,
        scheduledStartAt: body.startsAt ?? scheduled[0].scheduledStartAt,
        startedAt: body.startsAt ?? scheduled[0].startedAt,
        endsAt: new Date(
          Date.parse(body.startsAt ?? scheduled[0].scheduledStartAt) +
          (body.durationDays ?? scheduled[0].durationDays) * 86_400_000,
        ).toISOString(),
      }]
      await route.fulfill({ json: scheduled[0] })
      return
    }
    if (route.request().method() === 'DELETE') {
      deleteRequests += 1
      scheduled = []
      await route.fulfill({ status: 204, body: '' })
      return
    }
    await route.continue()
  })

  await page.getByRole('link', { name: 'Board', exact: true }).click()
  const upcoming = page.getByRole('region', { name: 'Upcoming sprints' })
  await expect(upcoming.getByRole('heading', { name: 'Interview push' })).toBeVisible()

  const card = upcoming.getByRole('article', { name: 'Interview push, upcoming sprint' })
  await card.getByRole('button', { name: 'Edit scheduled sprint Interview push' }).click()
  const editDialog = page.getByRole('dialog')
  await editDialog.getByLabel('Sprint name (optional)').fill('Interview push revised')
  await editDialog.getByLabel('Sprint duration (days)').fill('21')
  await editDialog.getByLabel(/Scheduled start/).fill(toLocalDate(start))
  await editDialog.getByRole('button', { name: 'Save changes' }).click()

  await expect.poll(() => patchRequests).toHaveLength(1)
  await expect(upcoming.getByRole('heading', { name: 'Interview push revised' })).toBeVisible()
  await expect(upcoming.getByText('Duration: 21 days')).toBeVisible()

  const revisedCard = upcoming.getByRole('article', { name: 'Interview push revised, upcoming sprint' })
  await revisedCard.getByRole('button', { name: 'Cancel scheduled sprint Interview push revised' }).click()
  const cancelDialog = page.getByRole('alertdialog')
  await expect(cancelDialog).toContainText('Application assignments will not change.')
  await cancelDialog.getByRole('button', { name: 'Cancel sprint' }).click()

  await expect.poll(() => deleteRequests).toBe(1)
  await expect(upcoming.getByText('No upcoming sprints scheduled.')).toBeVisible()
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
  await page.route('**/api/sprints', async (route) => {
    await route.fulfill({ json: [] })
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
  await page.route('**/api/sprints', async (route) => {
    await route.fulfill({ json: [] })
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

test('creates multiple upcoming sprint plans through the API', async ({ page }) => {
  await signInAsDemoUser(page)
  const membershipsResponse = await page.request.get(`${apiOrigin}/workspaces`)
  expect(membershipsResponse.ok()).toBe(true)
  const memberships = await membershipsResponse.json()
  const workspaceId = memberships[0]?.workspace?.id as string | undefined
  if (!workspaceId) throw new Error('The signed-in test user has no workspace')
  const headers = { 'X-Workspace-Id': workspaceId }

  const currentResponse = await page.request.get(`${apiOrigin}/sprints/current`, { headers })
  expect(currentResponse.ok()).toBe(true)
  const current = await currentResponse.json()
  const firstStart = new Date(Math.max(
    Date.now() + 2 * 86_400_000,
    current.sprint?.endsAt ? Date.parse(current.sprint.endsAt) + 60_000 : 0,
  ))
  const secondStart = new Date(firstStart.getTime() + 14 * 86_400_000 + 60_000)

  const firstResponse = await page.request.post(`${apiOrigin}/sprints/schedule`, {
    data: { name: `Planned sprint ${Date.now()}`, durationDays: 14, startsAt: firstStart.toISOString() },
    headers,
  })
  expect(firstResponse.status()).toBe(201)
  const first = await firstResponse.json()

  const secondResponse = await page.request.post(`${apiOrigin}/sprints/schedule`, {
    data: { name: `Planned follow-up ${Date.now()}`, durationDays: 21, startsAt: secondStart.toISOString() },
    headers,
  })
  expect(secondResponse.status()).toBe(201)
  const second = await secondResponse.json()

  const historyResponse = await page.request.get(`${apiOrigin}/sprints`, { headers })
  expect(historyResponse.ok()).toBe(true)
  const history = await historyResponse.json()
  expect(history.filter((sprint: { status: string }) => sprint.status === 'SCHEDULED').map((sprint: { id: string }) => sprint.id)).toEqual([second.id, first.id])
})

test('edits and cancels a scheduled sprint through the API', async ({ page }) => {
  await signInAsDemoUser(page)
  const membershipsResponse = await page.request.get(`${apiOrigin}/workspaces`)
  expect(membershipsResponse.ok()).toBe(true)
  const memberships = await membershipsResponse.json()
  const workspaceId = memberships[0]?.workspace?.id as string | undefined
  if (!workspaceId) throw new Error('The signed-in test user has no workspace')
  const headers = { 'X-Workspace-Id': workspaceId }

  const currentResponse = await page.request.get(`${apiOrigin}/sprints/current`, { headers })
  expect(currentResponse.ok()).toBe(true)
  const current = await currentResponse.json()
  const historyResponse = await page.request.get(`${apiOrigin}/sprints`, { headers })
  expect(historyResponse.ok()).toBe(true)
  const history = await historyResponse.json()
  const latestScheduled = history
    .filter((sprint: { status: string }) => sprint.status === 'SCHEDULED')
    .sort((left: { sequence: number }, right: { sequence: number }) => right.sequence - left.sequence)[0]
  const previousEnd = latestScheduled?.endsAt
    ? Date.parse(latestScheduled.endsAt)
    : current.sprint?.endsAt
      ? Date.parse(current.sprint.endsAt)
      : Date.now()
  const start = new Date(Math.max(Date.now() + 2 * 86_400_000, previousEnd + 60_000))

  const createResponse = await page.request.post(`${apiOrigin}/sprints/schedule`, {
    data: { name: `Editable sprint ${Date.now()}`, durationDays: 14, startsAt: start.toISOString() },
    headers,
  })
  expect(createResponse.status()).toBe(201)
  const created = await createResponse.json()
  const updatedStart = new Date(start.getTime() + 60_000)

  const updateResponse = await page.request.patch(`${apiOrigin}/sprints/${created.id}`, {
    data: {
      name: 'Corrected sprint plan',
      durationDays: 7,
      startsAt: updatedStart.toISOString(),
    },
    headers,
  })
  expect(updateResponse.status()).toBe(200)
  const updated = await updateResponse.json()
  expect(updated).toMatchObject({
    id: created.id,
    name: 'Corrected sprint plan',
    durationDays: 7,
    status: 'SCHEDULED',
    scheduledStartAt: updatedStart.toISOString(),
    endsAt: new Date(updatedStart.getTime() + 7 * 86_400_000).toISOString(),
  })

  const conflictResponse = await page.request.patch(`${apiOrigin}/sprints/${created.id}`, {
    data: { startsAt: new Date(Date.now() - 60_000).toISOString() },
    headers,
  })
  expect(conflictResponse.status()).toBe(409)
  expect(await conflictResponse.json()).toMatchObject({
    error: 'A scheduled sprint must start in the future.',
  })

  const cancelResponse = await page.request.delete(`${apiOrigin}/sprints/${created.id}`, { headers })
  expect(cancelResponse.status()).toBe(204)
  const finalHistoryResponse = await page.request.get(`${apiOrigin}/sprints`, { headers })
  expect(finalHistoryResponse.ok()).toBe(true)
  const finalHistory = await finalHistoryResponse.json()
  expect(finalHistory.some((sprint: { id: string }) => sprint.id === created.id)).toBe(false)
})
