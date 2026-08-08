import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm run db:seed && PORT=3001 FRONTEND_URL=http://127.0.0.1:4173 ENABLE_PASSWORD_LOGIN=true npx tsx src/server.ts',
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
