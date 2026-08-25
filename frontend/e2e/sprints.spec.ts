import { expect, test } from '@playwright/test'
import { signInAsDemoUser } from './support/demo-auth'

test('starts a new sprint, carries active applications forward, and archives rejected applications', async ({ page }) => {
  const suffix = `${Date.now()}-${test.info().parallelIndex}`
  const appliedCompany = `Sprint carry ${suffix}`
  const rejectedCompany = `Sprint rejected ${suffix}`
  let appliedId: string | undefined
  let rejectedId: string | undefined

  await signInAsDemoUser(page)
  const membershipsResponse = await page.request.get('http://127.0.0.1:3001/api/workspaces')
  expect(membershipsResponse.ok()).toBe(true)
  const memberships = await membershipsResponse.json()
  const workspaceId = memberships[0]?.workspace?.id as string | undefined
  if (!workspaceId) throw new Error('The signed-in test user has no workspace')
  const headers = { 'X-Workspace-Id': workspaceId }

  try {
    const initialSprintResponse = await page.request.post(
      'http://127.0.0.1:3001/api/sprints/start',
      { data: {}, headers },
    )
    expect(initialSprintResponse.ok()).toBe(true)

    const appliedResponse = await page.request.post(
      'http://127.0.0.1:3001/api/applications',
      { data: { company: appliedCompany, jobTitle: 'Carry-over Engineer', status: 'APPLIED' }, headers },
    )
    const rejectedResponse = await page.request.post(
      'http://127.0.0.1:3001/api/applications',
      { data: { company: rejectedCompany, jobTitle: 'Rejected Engineer', status: 'APPLIED' }, headers },
    )
    expect(appliedResponse.ok()).toBe(true)
    expect(rejectedResponse.ok()).toBe(true)
    appliedId = (await appliedResponse.json()).id
    rejectedId = (await rejectedResponse.json()).id

    const rejectResponse = await page.request.patch(
      `http://127.0.0.1:3001/api/applications/${rejectedId}`,
      { data: { status: 'REJECTED' }, headers },
    )
    expect(rejectResponse.ok()).toBe(true)

    await page.getByRole('link', { name: 'Board', exact: true }).click()
    await expect(page.getByRole('article', { name: `${appliedCompany}, Carry-over Engineer` })).toBeVisible()
    await expect(page.getByRole('article', { name: `${rejectedCompany}, Rejected Engineer` })).toBeVisible()

    await page.getByRole('button', { name: 'Start new sprint' }).click()
    await expect(page.getByText(/closed in the previous sprint/)).toBeVisible()
    await expect(page.getByText(/applications? carried over\./)).toBeVisible()
    await expect(page.getByRole('article', { name: `${appliedCompany}, Carry-over Engineer` })).toBeVisible()
    await expect(page.getByRole('article', { name: `${rejectedCompany}, Rejected Engineer` })).toHaveCount(0)

    const currentResponse = await page.request.get('http://127.0.0.1:3001/api/sprints/current', { headers })
    expect(currentResponse.ok()).toBe(true)
    const current = await currentResponse.json()
    expect(current.applications.map((application: { id: string }) => application.id)).toContain(appliedId)
    expect(current.applications.map((application: { id: string }) => application.id)).not.toContain(rejectedId)

  } finally {
    if (appliedId) await page.request.delete(`http://127.0.0.1:3001/api/applications/${appliedId}`, { headers })
    if (rejectedId) await page.request.delete(`http://127.0.0.1:3001/api/applications/${rejectedId}`, { headers })
  }
})
