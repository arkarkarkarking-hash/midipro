import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4321' },
  webServer: [
    { command: 'npx tsx scripts/serve-media.ts', url: 'http://localhost:4322/admissions/2025-kim-seungyeon.mp3', reuseExistingServer: true },
    { command: 'npx astro preview --port 4321', url: 'http://localhost:4321', reuseExistingServer: true },
  ],
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
});
