import { defineConfig, devices } from '@playwright/test'

/**
 * The browser tests. Vitest covers everything that computes a value; this
 * covers the three things only a real engine can answer — did the diagram
 * island actually render, did a sheet without figures avoid downloading
 * mermaid, and does the keyboard reach `main` on the first Tab.
 *
 * Chromium only, on purpose: these are behaviour checks, not a rendering
 * matrix, and a second engine would double CI for no additional answer.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
