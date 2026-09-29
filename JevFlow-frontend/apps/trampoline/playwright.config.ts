import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5175';
const browserChannel = process.env.E2E_BROWSER_CHANNEL || 'chrome';

export default defineConfig({
  testDir: './e2e',
  timeout: 120 * 1000,
  expect: {
    timeout: 20 * 1000,
  },
  fullyParallel: false,
  // Serial execution: the Vite dev server can return transient 500s when many
  // specs navigate at once during cold dependency optimization. A single retry
  // absorbs the remaining cold-start flakes.
  workers: 1,
  retries: process.env.CI ? 2 : 1,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: browserChannel as 'chrome',
      },
    },
  ],
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175/login',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },
});
