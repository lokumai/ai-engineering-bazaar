import { type Page, expect } from '@playwright/test'
import { VIEW_IDS, type CatalogViewId } from '../../src/lib/catalog/views'

/**
 * M12 / D13 — selecting one of the catalog's three views, for the specs that
 * read what a view renders.
 *
 * **Why every such spec needs this and none of them needed anything like it
 * before.** The catalog renders all three views into one document and CSS
 * reveals one, keyed off the attribute the boot script stamps (channel A). A
 * view that is not showing is `display: none`, so it is still in the DOM —
 * `toHaveCount`, `getAttribute`, `textContent` and `evaluateAll` all read it
 * happily — and it has no box. What breaks without asking for the view is
 * anything that needs one: `click()` waits for visibility, `innerText` comes
 * back empty, `getComputedStyle().width` is `auto`, and a scroll container
 * measures zero. Each of those fails somewhere far from the cause, which is why
 * the gesture is written once here instead of in five spec files.
 *
 * The ids come from the application's own `VIEW_IDS` rather than from a list
 * typed here: a fourth view then reaches this helper's type without anybody
 * remembering to widen it. That is the opposite of `sheets.ts`'s rule, and
 * deliberately — the set of VIEWS is not content, it is the interface's own
 * closed vocabulary, and a suite that disagreed with it would be asserting
 * against a view that does not exist.
 */
export async function showCatalogView(page: Page, id: CatalogViewId): Promise<void> {
  const name = { overview: 'Overview', cards: 'Cards', table: 'Table' }[id]
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
  await expect(page.locator(`.bz-view[data-view="${id}"]`)).toBeVisible()
}

/** The table view, which is the one every pre-M12 assertion was written for. */
export function showTable(page: Page): Promise<void> {
  return showCatalogView(page, 'table')
}

/** Every view id, so a spec can loop over the three without restating them. */
export const CATALOG_VIEWS: readonly CatalogViewId[] = VIEW_IDS
