import { defineConfig, devices } from '@playwright/test'

/**
 * The browser tests.
 *
 * Vitest covers everything that computes a value. This covers what only a real
 * engine can answer: did the diagram island render, did a sheet without
 * figures avoid downloading mermaid, is the theme already right in the first
 * frame, and does any page push the document sideways at 390px.
 *
 * ## Two targets, one suite
 *
 * `next dev` renders through the App Router at request time. It can tell you a
 * page *builds*; it cannot tell you it *exports*. The static export in `out/`
 * is what ships, so that is the default target:
 *
 *   npm run test:e2e            build, serve out/, run — what ships
 *   npm run test:e2e:dev        next dev — unminified React errors
 *   E2E_BASE_URL=http://…  npm run test:e2e   an already-running server
 *
 * `E2E_BASE_URL` suppresses the managed server entirely, which is how the
 * suite runs against a preview deployment or a server someone else started.
 *
 * ## The browser
 *
 * Real Google Chrome via `channel: 'chrome'`, not the bundled chromium build —
 * verified launching here at 151.0.7922.173. Set `E2E_CHANNEL=chromium` to
 * fall back to the bundled build on a machine with no Chrome installed.
 *
 * ## The viewports
 *
 * §4.7 gives the layout three behaviours and each project is one of them:
 * 1440 is all three zones of an A0 sheet, 1024 is the right rail collapsed to
 * a strip, 390 is the single column. Only the responsive spec runs on all
 * three — the rest of the suite is behaviour, not a rendering matrix, and
 * tripling it would triple CI for no additional answer.
 */

const TARGET = process.env.E2E_TARGET ?? 'static'
const PORT = Number(process.env.E2E_PORT ?? (TARGET === 'dev' ? 3000 : 3111))
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

/** Real Chrome unless something says otherwise. */
const channel = process.env.E2E_CHANNEL ?? 'chrome'

const webServer =
  process.env.E2E_BASE_URL
    ? undefined
    : TARGET === 'dev'
      ? {
        command: `npx next dev --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      }
      : {
        // The build has to be part of the command: serving a stale `out/` is
        // how a suite goes green against code that no longer exists.
        command: `npm run build && node scripts/serve-static.mjs out ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      }

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    // Chrome paints a scrollbar over the layout; a fixed one keeps the
    // horizontal-overflow measurements in `responsive.spec.ts` honest.
    launchOptions: { args: ['--hide-scrollbars'] },
  },
  projects: [
    {
      name: 'chrome-1440',
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chrome-1024',
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'chrome-390',
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: false,
        hasTouch: true,
      },
    },
  ],
  webServer,
})
