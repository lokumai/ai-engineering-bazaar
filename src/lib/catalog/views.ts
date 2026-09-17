/**
 * M12 / D13 — the catalog's three views, as data.
 *
 * The author asked for all three of the alternatives rather than one of them:
 * *"I want All 3 !!! They should be all loaded and using a toggle, the view
 * should change! C should be Overview, A should be named Cards, and B should be
 * named Table, with each in the toggle having their own visual aid such as
 * icon."* D13 records the reasoning and the cost: three renderings to keep
 * working instead of one, bounded by making them views over ONE data source
 * with no view-specific data and no view-specific route.
 *
 * ## Why this file is a leaf, and why the ids live here
 *
 * Four modules need the id set and no two of them may import each other:
 * `lib/record/validate.ts` coerces the stored preference against it,
 * `lib/record/boot.ts` embeds it in an ES5 string that runs before the module
 * graph exists, the toggle island renders it, and the page's stylesheet keys
 * off it. So it imports nothing at all — the same rule `lib/content/rows.ts`
 * and `lib/path/roles.ts` already follow (§12.2's import direction).
 *
 * ## Why a view is not a route
 *
 * D13's own acceptance criterion: adding a view must not add a URL. All three
 * are in the prerendered document and CSS reveals one, keyed off the
 * `data-hl-view` attribute `boot.ts` stamps on `<html>` before first paint —
 * channel A, so a reader who chose Table last week meets Table in frame one
 * with no flash of a view they did not ask for and no JavaScript at all
 * (§12.2). The toggle writes the preference through `store.ts`, which is the
 * only writer of learner state (`kia-context/specs/ARCHITECTURE.md` §5), and
 * sets the attribute itself for the frames before the next load — exactly the
 * arrangement `RailFold` documents for the curriculum rail's fold.
 */

/** The three ids, in the order the toggle prints them. */
export const VIEW_IDS = ['overview', 'cards', 'table'] as const

export type CatalogViewId = (typeof VIEW_IDS)[number]

export interface CatalogView {
  id: CatalogViewId
  /** The word in the toggle. Sentence case; the icon sits beside it. */
  name: string
}

export const VIEWS: readonly CatalogView[] = [
  {
    id: 'overview',
    name: 'Overview',
  },
  {
    id: 'cards',
    name: 'Cards',
  },
  {
    id: 'table',
    name: 'Table',
  },
]

/**
 * The view a reader who has never chosen gets, and the one the prerendered
 * document is in.
 *
 * It is the first of the three and it is Overview deliberately: a reader who
 * arrives at the catalog without a question is being shown the shape of the
 * course, and the two views that answer a sharper question are one keystroke
 * away. It is also the one the static HTML must be in — with scripting off,
 * `data-hl-view` is never stamped and the stylesheet's fallback rule reveals
 * this view and nothing else.
 */
export const DEFAULT_VIEW_ID: CatalogViewId = VIEW_IDS[0]

/**
 * M20 / **D68** — which view a ROUTE opens in, for a reader who has chosen none.
 *
 * The author asked the catalog's front page to open in Overview and a level
 * page to open in Cards. The view is also a remembered preference (D13), so
 * the two could contradict each other, and the shape that avoids it is the
 * narrow one: **a route default applies only where nothing is stored.**
 *
 * That is why this is a SCOPE and not a second stamp. The level page never
 * writes `data-hl-view` — two writers already share it, `boot.ts` before first
 * paint and the toggle island on every press, and a third claimant that fired
 * on arrival would override a choice the reader made one click earlier, which
 * is the thing D13 exists to prevent. The page emits this attribute on its own
 * wrapper instead, and `catalog.css` reads it only under
 * `html:not([data-hl-view])` — so a stored view still wins, with no script and
 * no new mechanism.
 *
 * Both halves of the fallback move together or the picture and the sentence
 * come apart: the view's rule and the toggle's `Showing` mark have the same
 * fallback, and changing one would draw Cards under a toggle marking Overview.
 */
export const SCOPE_ATTR = 'data-bz-catalog-scope'

export type CatalogScope = 'index' | 'level'

/** The scopes in a fixed order, so a stylesheet guard can count them. */
export const SCOPES = ['index', 'level'] as const

export const DEFAULT_VIEW_OF: Readonly<Record<CatalogScope, CatalogViewId>> = {
  index: 'overview',
  level: 'cards',
}

/** A stored value is untrusted input wherever it is read (§12.1.3). */
export function isViewId(value: unknown): value is CatalogViewId {
  return typeof value === 'string' && (VIEW_IDS as readonly string[]).includes(value)
}
