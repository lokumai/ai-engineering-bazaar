import type { Page } from '@playwright/test'

/**
 * The site's islands have attached their listeners and effects: the keyboard map sets
 * `data-hl-keys` on `<html>` from a passive effect, which React runs after the commit that
 * ran every layout effect of the same tree (the About and home islands start there), and the
 * search window sets `data-hl-search` beside it.
 *
 * `networkidle` is not this (tests/README.md, "Known flakes"): it says the requests stopped,
 * not that hydration ran. A key pressed before it is dropped, which reads exactly like a key
 * that does nothing, and a "nothing happened" assertion made before it proves nothing.
 */
export const hydrated = (page: Page) =>
  page.locator('html[data-hl-keys="ready"][data-hl-search="ready"]').waitFor({ state: 'attached' })
