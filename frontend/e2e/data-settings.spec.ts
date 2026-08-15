import { expect, test } from '@playwright/test'
import { signInAsDemoUser } from './support/demo-auth'

test('uses the styled backup picker and shows the selected filename', async ({ page }) => {
  await signInAsDemoUser(page)
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('link', { name: 'Data' }).click()

  await expect(page.getByRole('heading', { name: 'Data and backups' })).toBeVisible()
  await expect(page.getByText('Choose JSON backup')).toBeVisible()
  await expect(page.getByText('No file selected')).toBeVisible()

  await page.getByLabel('Import JSON backup').setInputFiles({
    name: 'job-tracker-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-08-15T12:00:00.000Z',
      workspace: { name: 'Demo workspace' },
      applications: [],
    })),
  })

  await expect(page.getByText('job-tracker-backup.json')).toHaveCount(2)
  await expect(page.getByText('Review import', { exact: true })).toBeVisible()
})
