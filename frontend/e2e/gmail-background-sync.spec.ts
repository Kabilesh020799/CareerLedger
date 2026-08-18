import { expect, test } from '@playwright/test'
import { signInAsDemoUser } from './support/demo-auth'

test('runs a manual Gmail synchronization without holding one API request open', async ({ page }) => {
  let statusChecks = 0

  await signInAsDemoUser(page)
  await page.route('**/api/gmail/status', (route) => route.fulfill({
    json: {
      configured: true,
      connected: true,
      gmailEmail: 'connected@example.com',
      lastSyncedAt: null,
      synchronizedMessages: 0,
      automaticSync: {
        enabled: false,
        intervalMinutes: 60,
        lastAttemptAt: null,
        lastError: null,
      },
    },
  }))
  await page.route('**/api/gmail/reviews', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/applications*', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/resumes', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/gmail/sync', (route) => route.fulfill({
    status: 202,
    json: { jobId: 'manual-sync-1', status: 'queued' },
  }))
  await page.route('**/api/gmail/sync/manual-sync-1', (route) => {
    statusChecks += 1
    if (statusChecks === 1) {
      return route.fulfill({ json: { jobId: 'manual-sync-1', status: 'running' } })
    }
    return route.fulfill({
      json: {
        jobId: 'manual-sync-1',
        status: 'completed',
        result: {
          synchronizationType: 'incremental',
          fetchedMessages: 2,
          newMessages: 1,
          duplicateMessages: 1,
          analyzedMessages: 2,
          detectedUpdates: 1,
          lastSyncedAt: '2026-08-17T12:00:00.000Z',
        },
      },
    })
  })

  await page.goto('/gmail')
  await page.getByRole('button', { name: 'Sync now' }).click()

  await expect(page.getByText('Synchronization is running in the background')).toBeVisible()
  await expect(page.getByText('Synchronization complete')).toBeVisible()
  await expect(page.getByText(/1 new and 1 previously stored/)).toBeVisible()
  expect(statusChecks).toBeGreaterThanOrEqual(2)
})
