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
 * 1440 is the desktop, 390 is the phone. Two specs also run at 390:
 * `responsive.spec.ts`, which is about widths, and `containment.spec.ts`,
 * because a diagram's natural width does not change with the window but the
 * column's does, so overflow shows first on a phone (M11). The rest of the
 * suite is behaviour, not a rendering matrix.
 *
 * A 1024px project ran those two and `fidelity` a third time until 2026-11-05
 * (M40, D88); it answered nothing the two ends did not, for a third of CI.
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
  // 4 on CI: GitHub's runner has 4 vCPUs, and at 2 the suite took 13 of CI's
  // 16 minutes (measured 2026-11-05, D88).
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  // Not the PR diff. On a pull request in CI, Playwright's git plugin fetches
  // the base commit with `--depth=1` to attach a diff to the report, and that
  // fetch makes the checkout shallow at the base before the webServer builds:
  // MEASURED on PR #57, every module's revision then read as main's head, so
  // the browser suite tested pages with the wrong REV and a bundle with the
  // wrong contentVersion. The commit is still captured; nothing reads the diff.
  captureGitInfo: { commit: true, diff: false },
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
      name: 'chrome-390',
      testMatch: /(responsive|containment)\.spec\.ts/,
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
