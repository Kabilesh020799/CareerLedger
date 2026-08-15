import { defineConfig, devices } from '@playwright/test'
import { randomBytes } from 'node:crypto'

const configuredDatabaseUrl = process.env.DATABASE_URL
const e2eDatabaseUrl = configuredDatabaseUrl?.match(/_test(?:\?|$)/)
  ? configuredDatabaseUrl
  : 'postgresql://jobtracker:jobtracker_dev@127.0.0.1:5432/jobtracker_test'
const e2eDemoUsername = process.env.DEMO_USER_USERNAME ?? 'e2e_demo'
const e2eDemoPassword = process.env.DEMO_USER_PASSWORD ?? `Ci${randomBytes(24).toString('hex')}Aa1`
const e2eDemoEmail = process.env.DEMO_USER_EMAIL ?? 'e2e-demo@example.invalid'
process.env.DEMO_USER_USERNAME = e2eDemoUsername
process.env.DEMO_USER_PASSWORD = e2eDemoPassword
process.env.DEMO_USER_EMAIL = e2eDemoEmail
const demoEnvironment = `DEMO_USER_USERNAME=${e2eDemoUsername} DEMO_USER_PASSWORD=${e2eDemoPassword} DEMO_USER_EMAIL=${e2eDemoEmail} DEMO_USER_NAME=E2E`
const e2eRedisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: `DATABASE_URL=${e2eDatabaseUrl} npm run db:migrate && DATABASE_URL=${e2eDatabaseUrl} ${demoEnvironment} npm run db:seed && DATABASE_URL=${e2eDatabaseUrl} REDIS_URL=${e2eRedisUrl} ${demoEnvironment} PORT=3001 FRONTEND_URL=http://127.0.0.1:4173 ENABLE_PASSWORD_LOGIN=true DISABLE_BACKGROUND_JOBS=true GOOGLE_CLIENT_ID= GOOGLE_CLIENT_SECRET= npx tsx src/server.ts`,
      cwd: '../backend',
      url: 'http://127.0.0.1:3001/api/health',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'VITE_API_URL=http://127.0.0.1:3001/api VITE_ENABLE_PASSWORD_LOGIN=true npm run dev -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173/applications',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
})
