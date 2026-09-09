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
  /**
   * What this view answers, printed under the toggle so the three are a choice
   * rather than three unexplained icons. D13: they answer three different
   * questions, which is why one of them cannot be dropped.
   */
  answers: string
}

export const VIEWS: readonly CatalogView[] = [
  {
    id: 'overview',
    name: 'Overview',
    answers: 'the shape of the course, level by level',
  },
  {
    id: 'cards',
    name: 'Cards',
    answers: 'one card per module, for browsing',
  },
  {
    id: 'table',
    name: 'Table',
    answers: 'every column at once, for comparing',
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

/** A stored value is untrusted input wherever it is read (§12.1.3). */
export function isViewId(value: unknown): value is CatalogViewId {
  return typeof value === 'string' && (VIEW_IDS as readonly string[]).includes(value)
}
