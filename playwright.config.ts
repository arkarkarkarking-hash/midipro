import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4321' },
  webServer: [
    { command: 'npx astro preview --port 4321', url: 'http://localhost:4321', reuseExistingServer: true },
  ],
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
});
