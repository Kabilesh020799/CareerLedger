import { defineConfig, devices } from '@playwright/test'

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
      command: 'npm run db:migrate && npm run db:seed && PORT=3001 FRONTEND_URL=http://127.0.0.1:4173 ENABLE_PASSWORD_LOGIN=true DISABLE_BACKGROUND_JOBS=true GOOGLE_CLIENT_ID= GOOGLE_CLIENT_SECRET= npx tsx src/server.ts',
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
