import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Page } from '@playwright/test'

/**
 * M15 — the check that makes "exact" mean something.
 *
 * The interface built across M9 to M14 was rejected for looking nothing like
 * the mockup it was supposed to reproduce, and the reason it got that far is
 * written down: **not one acceptance criterion compared a rendered page to the
 * mockup.** 2,149 unit tests and 467 browser tests were green the whole way.
 * They measured contrast, keyboard paths, containment and first paint — all
 * real, none of them the thing that was wrong (`logs/BRAINSTORM.md` D26).
 *
 * So this reads the design-carrying facts out of a live page and lets two
 * pages be compared. In M15 both pages are the mockup, which is how the
 * extractor itself is proven; in M16 the second page becomes a real route.
 *
 * ## Keyed by ROLE, never by class
 *
 * The mockup calls the top bar `.top`; the application calls it something
 * else, and it is *supposed* to — class names are a product's business, which
 * is exactly why `specs/DESIGN.md` is portable. So a caller supplies a
 * `SelectorMap` per document and the comparison happens between the extracted
 * facts. Nothing in the fact table names a class.
 *
 * ## Why there is no colour maths in here
 *
 * `contrast.ts` paints a pixel and composites the ancestor chain, because it
 * has to answer "what sRGB does the reader actually receive" in absolute
 * terms. This file never needs that: it compares two documents rendered by the
 * SAME engine, so one colour serialises to one string on both sides and string
 * equality is exact. Deliberately not a third copy of that probe.
 *
 * **The one constraint that buys:** both documents must author colour in the
 * same notation, because Chrome preserves `oklch()` in a computed value rather
 * than resolving it to `rgb()`. The mockup writes hex and `src/design/bazaar.css`
 * writes hex for that reason, and `tests/unit/design/transcription.test.ts`
 * enforces the same colour *set* across both. If a token is ever authored in
 * `oklch()`, the painting step from `contrast.ts` has to be factored out and
 * used here — it is not needed yet, so it is not built.
 */

/** `process.cwd()` and not `import.meta.dirname`: Playwright transpiles specs
 *  to CommonJS, where `import.meta` is a syntax error. `src/lib/content/code-theme.ts`
 *  resolves its own path the same way, and Playwright runs from the repo root. */
export const MOCKUP = path.resolve(
  process.cwd(),
  'playground/01-theme-T4-ground-G3-powder.html',
)

/** `playground/` is not copied into `public/` or `out/` by `prebuild`, and must
 *  not be: a mockup may not ship inside the site. So it is read from disk. */
export const MOCKUP_URL = pathToFileURL(MOCKUP).href

/**
 * The SECOND reference document, and the reason the harness now has a notion
 * of which mockup specifies what.
 *
 * `01` is the ratified shell and it draws a reading page. The catalog is drawn
 * by `03`, which is a different document on a deliberately older palette — it
 * says so itself: *"One neutral palette so you judge the layout."* **D31** is
 * the rule that follows: geometry comes from the component mockup and colour
 * comes from the shell.
 *
 * A rule in a document is a rule somebody has to remember. What makes it
 * mechanical here is `REFERENCE_OF` plus one guard: a role whose reference is
 * `03` may carry no COLOUR fact, so the comparison against `03` can only ever
 * be about widths, paddings, radii and type steps. Reading `03` naively would
 * put a green accent on a powder ground, and that is the exact class of
 * mistake the five rejected milestones made.
 */
export const CATALOG = path.resolve(process.cwd(), 'playground/03-catalog.html')

export const CATALOG_URL = pathToFileURL(CATALOG).href

/**
 * The THIRD reference document — completion, `05`, variants A and C.
 *
 * Its own closing note is the brief: *"**A** at the end of a module, because
 * the reader wants one button there, and **C** on the home and progress pages,
 * because that is where a picture of where you are belongs. A and C combine."*
 * `D31` applies to it exactly as it does to `03`: it is on the older palette,
 * so it specifies lengths and nothing else, and `REFERENCE_OF` is what makes
 * that mechanical.
 *
 * **Only facts that genuinely agree are compared, and the reason matters.**
 * `05` sets its statistics at `700 24px` with `-.02em`; the language's
 * emphatic weight is `600`, its nearest step is 25px and its section tracking
 * is `-0.012em` — so the statistic's TYPE is not comparable and its ROW's
 * geometry is. Snapping a value to a closed scale is the language winning on
 * purpose (the same call stage 4 made for `03`'s `550` weights and 11.5px
 * sizes), and a fact that was always going to differ is not a comparison, it
 * is a permanent exemption waiting to be written. The dial is the opposite
 * case: 74 and 56 and a 9px annulus are lengths, and they are transcribed
 * exactly.
 */
export const PROGRESS = path.resolve(process.cwd(), 'playground/05-progress.html')

export const PROGRESS_URL = pathToFileURL(PROGRESS).href

/**
 * The FOURTH — the progress page and the account, `07`, variant A.
 *
 * It is the only mockup in the set that draws a real form control: `01` has no
 * `<input>` anywhere and dresses a `div` as its search field, which is why
 * `barField` sits in `DELIBERATELY_ABSENT`. So the field's lengths are
 * specified here and nowhere else, and they land on the language's scale
 * exactly — 36px tall, a 7px radius which is `lg`, and 14.5px type which is
 * `control`.
 *
 * WHAT IT DRAWS THAT THE PRODUCT DOES NOT. `07`-A's `.bars` block is five
 * per-level rails, and `05`-C's dials already report that on this page. `07`'s
 * own argument against variant C is the reason not to have both: *"Per-level
 * progress is already in the sidebar and the catalog, on every page. Repeating
 * it on a page of its own is the duplication that makes the dashboard feel
 * pointless."* The page takes `07`'s ORDER and `05`'s rendering, so there is no
 * `progressRow` role to compare — which is a decision and not an omission, and
 * it is why it is written here.
 */
export const DASHBOARD = path.resolve(process.cwd(), 'playground/07-dashboard.html')

export const DASHBOARD_URL = pathToFileURL(DASHBOARD).href

/**
 * The FIFTH — the front door, `08`, variant A.
 *
 * `08`'s own note prefers its variant C and then says what to do if only one
 * state gets built: *"If you would rather build one state, take A: the pitch
 * matters more than the shortcut, because a returning reader can use the
 * sidebar from any page, while a stranger who bounces never comes back."* The
 * page is A plus C's one useful half — the continue block, on channel A.
 *
 * Its display type is the clearest case in the set of the language winning on
 * purpose: `08` sets the heading `700 46px/1.1` at `-.035em`, and the language
 * has 38px at 600. So the heading's MEASURE is compared and its type is not,
 * for the same reason `05`'s statistics are not: a fact that was always going
 * to differ is an exemption waiting to be written, not a comparison.
 */
export const HOME = path.resolve(process.cwd(), 'playground/08-home.html')

export const HOME_URL = pathToFileURL(HOME).href

export type Role =
  | 'bar'
  | 'barInner'
  | 'brand'
  | 'barLink'
  | 'barLinkCurrent'
  | 'barField'
  | 'menu'
  | 'menuItem'
  | 'menuKey'
  | 'menuCount'
  | 'band'
  | 'rail'
  | 'railInner'
  | 'group'
  | 'groupCurrent'
  | 'groupKey'
  | 'item'
  | 'tick'
  | 'column'
  | 'card'
  | 'slab'
  | 'slabCode'
  | 'figure'
  | 'node'
  | 'buttonPrimary'
  | 'aside'
  | 'asideLink'
  /* Stage 4 — the catalog, specified by `03` and geometry only (D31). */
  | 'filterBar'
  | 'chip'
  | 'chipCurrent'
  | 'chipKey'
  | 'levelHead'
  | 'levelKey'
  | 'catalogCard'
  | 'cardTitle'
  | 'tableHead'
  | 'tableCell'
  | 'tableEdge'
  | 'board'
  | 'boardColumn'
  | 'boardHead'
  | 'boardTrack'
  /* Stage 9 — the front door, from `08`. */
  | 'heroActions'
  | 'factRow'
  | 'whyMark'
  | 'whyGrid'
  /* Stage 8 — progress and account, from `07`. */
  | 'continueHero'
  | 'continueNum'
  | 'panel'
  | 'field'
  | 'fieldLabel'
  | 'fieldInput'
  /* Stage 7 — completion, from `05`. */
  | 'levelCard'
  | 'dial'
  | 'dialValue'
  | 'statRow'
  | 'legendKey'
  | 'boardList'
  | 'boardMod'
  /* Stage 4 — and the one thing in it no mockup draws. */
  | 'viewToggle'
  /* Stage 5 — the reading page, all of it specified by `01`. */
  | 'crumb'
  | 'display'
  | 'tag'
  | 'section'
  | 'subsection'
  | 'actions'
  | 'buttonQuiet'
  | 'pager'
  | 'pagerItem'

export type SelectorMap = Readonly<Partial<Record<Role, string>>>

/**
 * One design-carrying fact. `mutate` is the value the mutation proof paints
 * over it: every fact has to have one, so a fact cannot be added to this table
 * without also being proven to be checked.
 */
interface Fact {
  readonly role: Role
  readonly property: string
  readonly mutate: string
}

/**
 * What actually carries this design. Chosen from `specs/DESIGN.md`'s own
 * account of what would destroy the language if it changed — the cobalt fill
 * that makes the bar a bar, the asymmetric shapes that make a group an arch
 * and a callout a leaf, the disc that carries completion, the widths that
 * anchor the rails to the window edges.
 */
const FACTS: readonly Fact[] = [
  // The chrome is dark and the page is light. Losing this one loses the whole
  // language, and it is the fact the rejected build got wrong.
  { role: 'bar', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'barInner', property: 'height', mutate: '99px' },
  { role: 'barInner', property: 'paddingLeft', mutate: '99px' },
  // The on-bar sub-palette: a control on cobalt cannot borrow the values of
  // one on powder, so these are separate facts from the surface ones.
  { role: 'brand', property: 'fontFamily', mutate: 'Comic Sans MS' },
  { role: 'brand', property: 'fontWeight', mutate: '200' },
  { role: 'brand', property: 'color', mutate: 'magenta' },
  { role: 'barLink', property: 'color', mutate: 'magenta' },
  { role: 'barLink', property: 'borderRadius', mutate: '99px' },
  { role: 'barLinkCurrent', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'barLinkCurrent', property: 'color', mutate: 'magenta' },
  { role: 'barField', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'barField', property: 'borderTopColor', mutate: 'magenta' },
  // The menu a bar item opens over the page. It is one of only two places the
  // language spends a shadow, and the only one a reader opens on purpose — so
  // the shadow is a fact here rather than a nicety.
  { role: 'menu', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'menu', property: 'borderRadius', mutate: '99px' },
  { role: 'menu', property: 'minWidth', mutate: '99px' },
  { role: 'menu', property: 'padding', mutate: '99px' },
  { role: 'menu', property: 'boxShadow', mutate: 'none' },
  { role: 'menuItem', property: 'padding', mutate: '99px' },
  { role: 'menuItem', property: 'borderRadius', mutate: '99px' },
  { role: 'menuItem', property: 'fontSize', mutate: '99px' },
  // A hue key on the leading edge and a count on the trailing edge: the two
  // things DESIGN.md says a menu row carries.
  { role: 'menuKey', property: 'width', mutate: '99px' },
  { role: 'menuKey', property: 'height', mutate: '99px' },
  { role: 'menuKey', property: 'borderRadius', mutate: '99px' },
  { role: 'menuCount', property: 'fontSize', mutate: '99px' },
  { role: 'menuCount', property: 'color', mutate: 'magenta' },
  /* NOT `marginLeft`. The count sits on the trailing edge by `margin-left:
     auto`, and the computed value of an auto margin is the gap that happens to
     be left over — 50.77px in the mockup against 65.58px on the page, because
     the two documents carry different level names. That is a measurement of
     CONTENT, which `tests/README.md` forbids a test from writing down. The
     design fact is the trailing edge, and the row's flex layout is what the
     transcription check already holds. */
  // One ornament, once per page.
  { role: 'band', property: 'height', mutate: '99px' },
  { role: 'band', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'band', property: 'backgroundSize', mutate: '99px 99px' },
  { role: 'band', property: 'borderBottomColor', mutate: 'magenta' },
  // The rails anchor to the window's edges; the sticky offset is the bar plus
  // the band, which is the number that lets the band exist at all.
  { role: 'rail', property: 'top', mutate: '99px' },
  { role: 'rail', property: 'borderRightColor', mutate: 'magenta' },
  { role: 'railInner', property: 'width', mutate: '99px' },
  // `arch` — the doorway that makes a list of groups read as an arcade.
  { role: 'group', property: 'borderRadius', mutate: '99px' },
  { role: 'group', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'group', property: 'fontSize', mutate: '99px' },
  // The current group is emphasised four ways at once; two of them are here
  // and neither is only colour.
  { role: 'groupCurrent', property: 'fontSize', mutate: '99px' },
  { role: 'groupCurrent', property: 'borderLeftWidth', mutate: '99px' },
  { role: 'groupCurrent', property: 'backgroundColor', mutate: 'magenta' },
  // The categorical series, read off the markers rather than off token names.
  { role: 'groupKey', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'groupKey', property: 'width', mutate: '99px' },
  { role: 'item', property: 'color', mutate: 'magenta' },
  // A filled disc, because teal fails as text and passes as a graphic.
  { role: 'tick', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'tick', property: 'borderRadius', mutate: '0px' },
  { role: 'tick', property: 'width', mutate: '99px' },
  // The measure, resolved. Centred inside the fluid middle and capped.
  { role: 'column', property: 'maxWidth', mutate: '99px' },
  // `leaf` — the callout, a tile set at an angle.
  { role: 'card', property: 'borderRadius', mutate: '99px' },
  { role: 'card', property: 'backgroundColor', mutate: 'magenta' },
  // The slab is a second, complete palette and it does not re-theme.
  { role: 'slab', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'slab', property: 'borderRadius', mutate: '99px' },
  { role: 'slabCode', property: 'color', mutate: 'magenta' },
  { role: 'slabCode', property: 'fontFamily', mutate: 'Comic Sans MS' },
  { role: 'figure', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'node', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'node', property: 'borderTopColor', mutate: 'magenta' },
  // One primary action, cobalt, white type.
  { role: 'buttonPrimary', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'buttonPrimary', property: 'color', mutate: 'magenta' },
  { role: 'buttonPrimary', property: 'borderRadius', mutate: '99px' },
  // The aside: an in-page index behind a rail that turns primary when current.
  { role: 'aside', property: 'top', mutate: '99px' },
  { role: 'asideLink', property: 'borderLeftColor', mutate: 'magenta' },

  /* ---------------------------------------------------------------------------
     STAGE 5 — THE READING PAGE.

     Specified by `01`, so unlike the catalog these carry colour: the trail's
     muted meta, the display heading's deeper title ink, the tag's raised fill
     and hairline, the action row's 2px rule and the quiet button that is white
     where the primary is cobalt.
     --------------------------------------------------------------------------- */
  { role: 'crumb', property: 'fontSize', mutate: '99px' },
  { role: 'crumb', property: 'marginBottom', mutate: '99px' },
  { role: 'crumb', property: 'color', mutate: 'magenta' },
  { role: 'display', property: 'fontSize', mutate: '99px' },
  { role: 'display', property: 'fontWeight', mutate: '200' },
  { role: 'display', property: 'color', mutate: 'magenta' },
  { role: 'display', property: 'letterSpacing', mutate: '9px' },
  { role: 'tag', property: 'padding', mutate: '99px' },
  { role: 'tag', property: 'borderRadius', mutate: '99px' },
  { role: 'tag', property: 'fontSize', mutate: '99px' },
  { role: 'tag', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'tag', property: 'borderTopColor', mutate: 'magenta' },
  // The one place ornament touches the reading column is this heading's rule,
  // and the heading is a flex row so that the rule can fill what is left.
  { role: 'section', property: 'fontSize', mutate: '99px' },
  { role: 'section', property: 'marginTop', mutate: '99px' },
  { role: 'section', property: 'gap', mutate: '99px' },
  { role: 'section', property: 'color', mutate: 'magenta' },
  { role: 'subsection', property: 'fontSize', mutate: '99px' },
  { role: 'subsection', property: 'marginTop', mutate: '99px' },
  // A top-ruled row, and the rule is 2px where every other line here is 1px.
  { role: 'actions', property: 'marginTop', mutate: '99px' },
  { role: 'actions', property: 'paddingTop', mutate: '99px' },
  { role: 'actions', property: 'borderTopWidth', mutate: '9px' },
  { role: 'actions', property: 'gap', mutate: '99px' },
  { role: 'buttonQuiet', property: 'backgroundColor', mutate: 'magenta' },
  { role: 'buttonQuiet', property: 'color', mutate: 'magenta' },
  { role: 'buttonQuiet', property: 'borderTopColor', mutate: 'magenta' },
  { role: 'pager', property: 'gap', mutate: '99px' },
  { role: 'pager', property: 'marginTop', mutate: '99px' },
  { role: 'pagerItem', property: 'padding', mutate: '99px' },
  { role: 'pagerItem', property: 'borderRadius', mutate: '99px' },
  { role: 'pagerItem', property: 'backgroundColor', mutate: 'magenta' },

  /* ---------------------------------------------------------------------------
     STAGE 4 — THE CATALOG, AND NOT ONE COLOUR AMONG THEM.

     Every fact below is specified by `03-catalog.html`, which is on the retired
     palette, so every one of them is a LENGTH or a TYPE STEP. That is not a gap
     in the coverage — it is D31 written as data, and `fidelity.spec.ts` has a
     guard that fails if a colour ever appears here.

     What holds the catalog's colour instead: `styling-references.test.ts`
     (every token it names is one the language declares),
     `surface-stylesheets.test.ts` (no hex, no colour function, no invented
     radius) and the contrast suite, which recomputes every ratio from the
     shipped stylesheet rather than asserting a table.
     --------------------------------------------------------------------------- */

  // The bar the filters sit in. Its `top` is NOT a fact: `03` has no site bar
  // above it and sticks to 0, while the product sticks below the bar and the
  // band. The gap between chips and the hairline under them are the design.
  { role: 'filterBar', property: 'gap', mutate: '99px' },
  { role: 'filterBar', property: 'paddingTop', mutate: '99px' },
  { role: 'filterBar', property: 'borderBottomWidth', mutate: '9px' },
  // A chip is the language's control height, and it does not change size when
  // it is pressed — which is why `chipCurrent` carries the same height rather
  // than a colour: a bar that reflowed when a filter was chosen would move the
  // next chip out from under the pointer.
  { role: 'chip', property: 'height', mutate: '99px' },
  { role: 'chip', property: 'paddingLeft', mutate: '99px' },
  { role: 'chip', property: 'gap', mutate: '99px' },
  { role: 'chip', property: 'fontSize', mutate: '99px' },
  { role: 'chipCurrent', property: 'height', mutate: '99px' },
  { role: 'chipKey', property: 'width', mutate: '99px' },
  { role: 'chipKey', property: 'height', mutate: '99px' },
  // The cards view's grouping.
  { role: 'levelHead', property: 'gap', mutate: '99px' },
  { role: 'levelHead', property: 'marginBottom', mutate: '99px' },
  { role: 'levelKey', property: 'width', mutate: '99px' },
  { role: 'levelKey', property: 'height', mutate: '99px' },
  { role: 'levelKey', property: 'borderRadius', mutate: '99px' },
  // A card, and the 3px top edge its level's hue rides.
  { role: 'catalogCard', property: 'paddingTop', mutate: '99px' },
  { role: 'catalogCard', property: 'paddingLeft', mutate: '99px' },
  { role: 'catalogCard', property: 'borderTopWidth', mutate: '99px' },
  { role: 'catalogCard', property: 'borderLeftWidth', mutate: '99px' },
  { role: 'cardTitle', property: 'marginTop', mutate: '99px' },
  { role: 'cardTitle', property: 'fontSize', mutate: '99px' },
  // The table. `tableCell` reads the fourth cell and not the first, because
  // the first is the mono number column and carries its own smaller step.
  { role: 'tableHead', property: 'paddingTop', mutate: '99px' },
  { role: 'tableHead', property: 'paddingLeft', mutate: '99px' },
  { role: 'tableHead', property: 'fontSize', mutate: '99px' },
  { role: 'tableHead', property: 'borderBottomWidth', mutate: '9px' },
  { role: 'tableCell', property: 'paddingTop', mutate: '99px' },
  { role: 'tableCell', property: 'paddingLeft', mutate: '99px' },
  { role: 'tableCell', property: 'fontSize', mutate: '99px' },
  { role: 'tableEdge', property: 'borderLeftWidth', mutate: '99px' },
  // The board: five columns, a header, a track and the rows inside it.
  { role: 'board', property: 'gap', mutate: '99px' },
  { role: 'boardColumn', property: 'borderTopWidth', mutate: '99px' },
  { role: 'boardHead', property: 'paddingTop', mutate: '99px' },
  { role: 'boardHead', property: 'paddingLeft', mutate: '99px' },
  { role: 'boardTrack', property: 'height', mutate: '99px' },

  /* Stage 7 — completion, `05`-C, lengths only.

     The dial is the whole reason this document is a reference: 74 outside, 56
     inside, so the ring is a 9px annulus, and it works by OCCLUSION rather
     than by a mask — which is why the inner disc's size is a fact and not an
     implementation detail. Get it wrong and the ring changes width. */
  { role: 'dial', property: 'width', mutate: '99px' },
  { role: 'dial', property: 'height', mutate: '99px' },
  { role: 'dial', property: 'marginBottom', mutate: '99px' },
  { role: 'dialValue', property: 'width', mutate: '99px' },
  { role: 'dialValue', property: 'height', mutate: '99px' },
  { role: 'levelCard', property: 'paddingTop', mutate: '99px' },
  { role: 'levelCard', property: 'paddingLeft', mutate: '99px' },
  { role: 'statRow', property: 'gap', mutate: '99px' },
  { role: 'statRow', property: 'paddingTop', mutate: '99px' },
  { role: 'legendKey', property: 'width', mutate: '99px' },
  { role: 'legendKey', property: 'height', mutate: '99px' },
  { role: 'legendKey', property: 'borderRadius', mutate: '99px' },

  /* Stage 8 — `07`-A, lengths only.

     The field is the point: `07` is the only mockup that draws one, and every
     length it gives it turns out to be on the language's scale already — 36px,
     a 7px radius, 14.5px type, a 96px label gutter, a 10px gap. Nothing had to
     be reconciled, which is the strongest evidence available that the scale was
     transcribed from the same hand.

     `continueHero`'s radius is NOT compared: `07` sets 11px and the radius
     scale is a closed set that stops at 9. Snapping to it is the language
     winning on purpose, and a fact that was always going to differ is an
     exemption waiting to be written rather than a comparison. */
  { role: 'continueHero', property: 'paddingTop', mutate: '99px' },
  { role: 'continueHero', property: 'paddingLeft', mutate: '99px' },
  { role: 'continueHero', property: 'gap', mutate: '99px' },
  { role: 'continueNum', property: 'width', mutate: '99px' },
  { role: 'continueNum', property: 'height', mutate: '99px' },
  { role: 'panel', property: 'paddingTop', mutate: '99px' },
  { role: 'panel', property: 'paddingLeft', mutate: '99px' },
  { role: 'field', property: 'gap', mutate: '99px' },
  { role: 'fieldLabel', property: 'width', mutate: '99px' },
  { role: 'fieldInput', property: 'height', mutate: '99px' },
  { role: 'fieldInput', property: 'paddingLeft', mutate: '99px' },
  { role: 'fieldInput', property: 'borderTopLeftRadius', mutate: '99px' },
  { role: 'fieldInput', property: 'fontSize', mutate: '99px' },

  /* Stage 9 — `08`-A. The two MEASURES and the four lengths.

     `heroTitle.maxWidth` is 20ch and `lede.maxWidth` 56ch, and those are the
     facts worth holding: a display line that runs the width of a 1440px window
     is the difference between a front door and a banner, and neither is
     something the type scale settles. Their type steps are not compared — `08`
     sets `700 46px` at `-.035em` against the language's `600 38px` at
     `-0.015em`, and snapping a closed scale is the language winning rather
     than a difference to reconcile. */
  /* `heroTitle` AND `lede` ARE NOT ROLES, and the reason is the unit.
     Both are declared in `ch`, and `ch` resolves against the element's own
     font — so `08`'s `20ch` at its 46px system sans computes 640px and the
     same rule at the language's 38px Avenir Next computes 529px. Identical
     rule, different number, and no difference to reconcile. What the mockup
     actually specifies here is that the display line and the lede are held to
     a MEASURE at all, and in `ch` rather than in pixels; the stage's own block
     asserts that, where it can read the declaration instead of its result. */
  { role: 'heroActions', property: 'gap', mutate: '99px' },
  { role: 'factRow', property: 'rowGap', mutate: '99px' },
  { role: 'whyMark', property: 'width', mutate: '99px' },
  { role: 'whyMark', property: 'height', mutate: '99px' },
  { role: 'whyGrid', property: 'gap', mutate: '99px' },
  /* `buttonDanger` IS NOT A ROLE HERE, and the measurement is why: `07`'s
     danger button measured 9px/15px/14px against the language's 11px/20px/15px,
     because `07` draws it as a colour-only modifier of `07`'s OWN button and
     the product modifies `01`'s. Comparing it to `07` would be comparing two
     mockups' buttons to each other. `01` already specifies that geometry
     through `buttonPrimary`, and what is left of `.btn.danger` is a colour —
     which D31 forbids taking from a non-shell mockup anyway. The stage's own
     block asserts the part that matters instead: that it differs from a quiet
     button in colour and in nothing else. */
  { role: 'boardList', property: 'paddingTop', mutate: '99px' },
  { role: 'boardMod', property: 'paddingTop', mutate: '99px' },
  { role: 'boardMod', property: 'gap', mutate: '99px' },
  { role: 'boardMod', property: 'borderRadius', mutate: '99px' },
  { role: 'boardMod', property: 'fontSize', mutate: '99px' },
]

export type DesignFacts = Readonly<Record<string, string | null>>

/** `role.property`, which is what a difference is reported as. */
export function factKey(fact: Fact): string {
  return `${fact.role}.${fact.property}`
}

export const FACT_KEYS: readonly string[] = FACTS.map(factKey)

/** The facts, so a mutation proof can walk them. */
export const DESIGN_FACTS: readonly Fact[] = FACTS

/**
 * Read every fact from a page. A role the map does not name, or whose element
 * is not on screen at this width, comes back `null` — which is a *fact* rather
 * than a failure: below the fold breakpoint the aside is gone, and below the
 * rail breakpoint so is the rail.
 */
/**
 * Stop every transition and animation, before anything is read.
 *
 * **This is a correctness fix, not tidiness.** A group's summary carries a
 * 120ms background transition, so reading a computed colour in the protocol
 * round trip straight after a change caught the value it was moving FROM: the
 * mutation proof reported that overriding a background changed nothing, on a
 * page where it plainly had. Same family as D20 — a frame count is not a wait —
 * and the same reason `contrast.ts` freezes transitions before sampling.
 */
export async function freezeMotion(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      transition: none !important;
      animation: none !important;
    }`,
  })
}

export async function extractDesignFacts(page: Page, selectors: SelectorMap): Promise<DesignFacts> {
  const requests = FACTS.map((fact) => ({
    key: factKey(fact),
    selector: selectors[fact.role] ?? null,
    property: fact.property,
  }))

  return page.evaluate((items) => {
    const out: Record<string, string | null> = {}
    for (const item of items) {
      if (item.selector === null) {
        out[item.key] = null
        continue
      }
      const element = document.querySelector(item.selector)
      if (element === null || !(element as HTMLElement).checkVisibility?.()) {
        out[item.key] = null
        continue
      }
      const style = getComputedStyle(element)
      const value = style.getPropertyValue(
        item.property.replaceAll(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
      )
      out[item.key] = value === '' ? null : value.trim()
    }
    return out
  }, requests)
}

export interface Difference {
  readonly fact: string
  readonly reference: string | null
  readonly actual: string | null
}

/** Every fact whose value differs. Empty means the two pages agree. */
export function compareDesignFacts(reference: DesignFacts, actual: DesignFacts): Difference[] {
  const differences: Difference[] = []
  for (const key of FACT_KEYS) {
    const theirs = reference[key] ?? null
    const ours = actual[key] ?? null
    if (theirs !== ours) differences.push({ fact: key, reference: theirs, actual: ours })
  }
  return differences
}

/** The facts that were actually read, so a comparison cannot pass vacuously by
 *  finding nothing on either side. */
export function factsRead(facts: DesignFacts): string[] {
  return FACT_KEYS.filter((key) => facts[key] !== null)
}

/** Where each role lives in the mockup. The mockup is the specification, so
 *  this map is part of the specification's reading and not a choice. */
export const MOCKUP_SELECTORS: SelectorMap = {
  bar: '.top',
  barInner: '.top-in',
  brand: '.brand',
  barLink: '.mainnav a:not([aria-current]), .mainnav button.lv',
  // ANY element, not `a[aria-current]`. The mockup's CSS styles the current
  // chip as `.mainnav a[aria-current]` while its markup puts `aria-current` on
  // the `button.lv` that opens the dropdown — so the chip never actually
  // paints in the mockup. The harness reads what the mockup RENDERS; the
  // discrepancy is a question for M16, not something to quietly fix here.
  barLinkCurrent: '.mainnav [aria-current]',
  barField: '.srch',
  // The dropdown, which `01` re-drew in the shell's own palette after `02`
  // chose the variant. It is `display: none` until the item is hovered or
  // holds focus, so a spec has to open it before there is anything to read.
  menu: '.dd',
  menuItem: '.dd a',
  menuKey: '.dd a .key',
  menuCount: '.dd a .n',
  band: '.band',
  rail: '.side',
  railInner: '.side-in',
  group: '.arch:not([data-here]) > summary',
  groupCurrent: '.arch[data-here] > summary',
  groupKey: '.arch:not([data-here]) > summary .key',
  item: '.arch[open] li a:not([aria-current])',
  tick: '.arch[open] li a:not([aria-current]) .tick',
  column: '.col',
  card: '.goals',
  slab: '.slab',
  slabCode: '.slab pre',
  figure: '.diagram',
  node: '.node:not(.on)',
  buttonPrimary: '.btn:not(.g)',
  aside: '.toc',
  asideLink: '.toc a:not([aria-current])',
  crumb: '.crumb',
  display: '.col h1',
  tag: '.row .tag',
  section: '.col h2',
  subsection: '.col h3',
  actions: '.act',
  buttonQuiet: '.btn.g',
  pager: '.pn',
  pagerItem: '.pn a',
}

/**
 * Where each catalog role lives in `03-catalog.html`.
 *
 * `03` draws its three alternatives as three stacked frames in one document,
 * so every role below is on screen at once and `querySelector` picks the first
 * of each. Two selectors need a `:not()` and both are for a reason:
 *
 * - `tbody tr:not(.brk)` — `03`'s first table row is a GROUP-BREAK row, a
 *   `colspan` band naming the level. The product's table does not group (the
 *   overview is the view that answers that question), so comparing against it
 *   would be comparing against a component that is deliberately absent.
 * - `.card:not(.planned)` — a planned card is the same box with a sunken fill,
 *   and the fill is the half of it this comparison may not read.
 */
/**
 * `05`-C, and every one of these is a length.
 *
 * `.ring` is variant C's level card and appears nowhere else in the document,
 * so the selectors need no variant qualifier. The dial's inner disc carries
 * its geometry inline in the mockup, which `extractDesignFacts` reads because
 * it asks the browser for a computed style rather than parsing a stylesheet.
 */
export const PROGRESS_SELECTORS: SelectorMap = {
  levelCard: '.ring',
  dial: '.ring .dial',
  dialValue: '.ring .dial span',
  statRow: '.stat',
  legendKey: '.legend i',
}

/**
 * `07`-A. Variant A's blocks are the first `.cont`, `.panel`, `.field` and
 * `.btn.danger` in the document; B and C reuse the class names further down,
 * and `extractDesignFacts` reads the first match, so no variant qualifier is
 * needed — but that is a fact about the document's order and it is worth
 * saying, because a mockup that reordered its options would move these.
 */
export const DASHBOARD_SELECTORS: SelectorMap = {
  continueHero: '.cont',
  continueNum: '.cont .num',
  panel: '.panel',
  field: '.field',
  fieldLabel: '.field label',
  fieldInput: '.field input',
}

/**
 * `08`-A. Variant A is the first `.body` in the document and B and C reuse the
 * class names below it, so `.opt:first-of-type` scopes every one of these to A
 * rather than trusting document order — which `07`'s do trust, and which is
 * worth not repeating now that a third mockup has options.
 */
export const HOME_SELECTORS: SelectorMap = {
  heroActions: '.opt:first-of-type .ctas',
  factRow: '.opt:first-of-type .facts',
  whyMark: '.opt:first-of-type .rule .ic',
  whyGrid: '.opt:first-of-type .rules',
}

export const CATALOG_SELECTORS: SelectorMap = {
  filterBar: '.filters',
  chip: '.fchip:not([aria-pressed="true"])',
  chipCurrent: '.fchip[aria-pressed="true"]',
  chipKey: '.fchip i',
  levelHead: '.lvlhead',
  levelKey: '.lvlhead .swatch',
  catalogCard: '.card:not(.planned)',
  cardTitle: '.card:not(.planned) h4',
  tableHead: 'thead th',
  tableCell: 'tbody tr:not(.brk) td:nth-child(4)',
  tableEdge: 'tbody tr:not(.brk) td:first-child',
  board: '.board',
  boardColumn: '.col',
  boardHead: '.col > header',
  boardTrack: '.track',
  boardList: '.col ol',
  boardMod: '.col ol a',
}

/** Which document specifies a role. A role with no entry has no mockup. */
export type Reference = '01' | '03' | '05' | '07' | '08'

/**
 * THE ROLE-TO-DOCUMENT MAP, which is what makes D31 something a machine can
 * refuse rather than something a reader has to remember.
 *
 * Roles absent from this map are specified by no mockup at all, and each one
 * has to be named in `WITHOUT_REFERENCE` with what it was derived from
 * instead — so "there is no reference for this" is a statement somebody wrote
 * down, never a gap that happens to be quiet.
 */
export const REFERENCE_OF: Readonly<Partial<Record<Role, Reference>>> = {
  bar: '01', barInner: '01', brand: '01', barLink: '01', barLinkCurrent: '01',
  barField: '01', menu: '01', menuItem: '01', menuKey: '01', menuCount: '01',
  band: '01', rail: '01', railInner: '01', group: '01', groupCurrent: '01',
  groupKey: '01', item: '01', tick: '01', column: '01', card: '01',
  slab: '01', slabCode: '01', figure: '01', node: '01', buttonPrimary: '01',
  aside: '01', asideLink: '01',

  filterBar: '03', chip: '03', chipCurrent: '03', chipKey: '03',
  levelHead: '03', levelKey: '03', catalogCard: '03', cardTitle: '03',
  tableHead: '03', tableCell: '03', tableEdge: '03', board: '03',
  boardColumn: '03', boardHead: '03', boardTrack: '03', boardList: '03',
  boardMod: '03',

  crumb: '01', display: '01', tag: '01', section: '01', subsection: '01',
  actions: '01', buttonQuiet: '01', pager: '01', pagerItem: '01',

  levelCard: '05', dial: '05', dialValue: '05', statRow: '05', legendKey: '05',

  continueHero: '07', continueNum: '07', panel: '07', field: '07',
  fieldLabel: '07', fieldInput: '07',

  heroActions: '08', factRow: '08',
  whyMark: '08', whyGrid: '08',
}

/**
 * Each reference document, in ONE place.
 *
 * This was three parallel maps keyed on the same union — the path, the URL and
 * the selectors — which is three places to keep in step for one fact, and at
 * five documents it would be fifteen. Two mockups made that a style question;
 * a third makes it the same "one fact, one home" argument that took the
 * catalog table's minimum width out of a comment and into the component that
 * computes it.
 */
export const REFERENCES: Readonly<
  Record<Reference, { readonly file: string; readonly url: string; readonly selectors: SelectorMap }>
> = {
  '01': { file: MOCKUP, url: MOCKUP_URL, selectors: MOCKUP_SELECTORS },
  '03': { file: CATALOG, url: CATALOG_URL, selectors: CATALOG_SELECTORS },
  '05': { file: PROGRESS, url: PROGRESS_URL, selectors: PROGRESS_SELECTORS },
  '07': { file: DASHBOARD, url: DASHBOARD_URL, selectors: DASHBOARD_SELECTORS },
  '08': { file: HOME, url: HOME_URL, selectors: HOME_SELECTORS },
}

/** Kept as views onto `REFERENCES`, so no caller has to change and no second
 *  list can drift from it. */
export const REFERENCE_URL: Readonly<Record<Reference, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(REFERENCES).map(([key, one]) => [key, one.url]),
  ) as Record<Reference, string>,
)

export const REFERENCE_SELECTORS: Readonly<Record<Reference, SelectorMap>> = Object.freeze(
  Object.fromEntries(
    Object.entries(REFERENCES).map(([key, one]) => [key, one.selectors]),
  ) as Record<Reference, SelectorMap>,
)

/**
 * Roles the application renders that NO mockup specifies, with what each was
 * derived from — **D30**'s rule, kept as data beside the roles that do have a
 * reference so the two cannot be confused.
 *
 * The counterpart of `DELIBERATELY_ABSENT` below: that map is for a role a
 * mockup draws and the product refuses, this one for a component the product
 * needs and no mockup drew.
 */
export const WITHOUT_REFERENCE: Readonly<Partial<Record<Role, string>>> = {
  viewToggle:
    'no mockup draws one: `03` presents its three views as three separate ' +
    'frames and `01` has no segmented control. Derived from the language’s ' +
    '33px control height and `.bz-btn-quiet`’s edge, with the showing one ' +
    'marked by a heavier bottom rule because forced colours keeps a ' +
    'border’s width and takes its colour.',
}

/**
 * Does this property name a COLOUR?
 *
 * Used by the guard that keeps a `03`-sourced fact geometric. Deliberately
 * generous — `fill`, `stroke` and `outline` are not in the fact table today
 * and the answer should not change on the day one is added.
 */
export function isColourProperty(property: string): boolean {
  return /color|background|shadow|fill|stroke|outline/i.test(property)
}

/* ---------------------------------------------------------------------------
   THE APPLICATION SIDE — M16.

   The map that was missing for five milestones. `MOCKUP_SELECTORS` above reads
   the specification; this reads the built page, and `compareDesignFacts` is
   what makes "indistinguishable from its mockup" a thing a machine can refuse.
   Keyed by role, not by class, which is why the language is portable: the
   mockup calls the bar `.top` and the application calls it `.bz-bar`, and
   neither has to know about the other.

   ONE ROLE PER SURFACE, ADDED BY THE STAGE THAT BUILDS IT. A role listed here
   before its surface exists reads as `null` and the comparison reports it as a
   difference, which is the correct answer — the page really does not have it
   yet.
   --------------------------------------------------------------------------- */

export const APP_SELECTORS: SelectorMap = {
  /* Stage 1 — the bar and the band. */
  bar: '.bz-bar',
  barInner: '.bz-bar-inner',
  brand: '.bz-brand',
  barLink: '.bz-bar-nav a:not([aria-current]):not([data-current]), .bz-bar-nav summary:not([data-current])',
  // The current destination takes the chip whether it is a link or the
  // disclosure trigger that owns the level pages, and the trigger carries
  // `data-current` rather than `aria-current` — a disclosure is not itself a
  // page, and two `aria-current="page"` inside one nav is a contradiction a
  // screen reader has to resolve for the reader (BRAINSTORM D28).
  barLinkCurrent: '.bz-bar-nav [aria-current], .bz-bar-nav [data-current]',
  band: '.bz-band',

  /* Stage 1 part 2 — the frame. `asideLink` is not here yet: the in-page index
     inside the aside is still the retired one, and it is stage 5 that rebuilds
     it. A role mapped before its markup exists would read `null` and report as
     a difference, which is the correct answer but a noisy one. */
  column: '.bz-col',
  aside: '.bz-aside',

  /* Stage 2 — the dropdown. The app opens it with a native `<details>` rather
     than on hover, so it is hidden by the element itself and needs no rule of
     its own to be. */
  menu: '.bz-menu',
  menuItem: '.bz-menu-item',
  menuKey: '.bz-menu-key',
  menuCount: '.bz-menu-count',

  /* Stage 3 — the rail. `tick` reads `null` on a page with no reader record,
     because the disc is hidden until channel A reveals it; the spec seeds one
     rather than pointing this at a disc that is always on, which would have
     stopped proving the channel works. */
  rail: '.bz-rail',
  railInner: '.bz-rail-inner',
  group: '.bz-group:not([data-here]) > summary',
  groupCurrent: '.bz-group[data-here] > summary',
  groupKey: '.bz-group:not([data-here]) > summary .bz-group-key',
  item: '.bz-group[open] .bz-item:not([aria-current])',
  tick: '.bz-group[open] .bz-item:not([aria-current]) .bz-tick',

  /* Stage 4 — the catalog, on `/sheets/`. Two of these need saying:

     `chip` resolves to the first UNPRESSED chip, which is the first level
     chip, and that is the one carrying a hue key — `Every level` is the
     pressed one on load and has no key, so `chipKey` finds the right box.

     `tableCell` reads the fourth cell rather than the first for the same
     reason the mockup map does: the first is the mono number column and
     carries its own smaller step. `nth-child` and not `nth-of-type`, because
     the title cell is a `th[scope="row"]` and the count has to include it. */
  filterBar: '.bz-filters',
  chip: '.bz-chip:not([aria-pressed="true"])',
  chipCurrent: '.bz-chip[aria-pressed="true"]',
  chipKey: '.bz-chip-key',
  levelHead: '.bz-levelhead',
  levelKey: '.bz-levelhead-key',
  catalogCard: '.bz-catcard[data-drawn="true"]',
  cardTitle: '.bz-catcard[data-drawn="true"] .bz-catcard-title',
  tableHead: '.bz-table thead th',
  tableCell: '.bz-table tbody .bz-row td:nth-child(4)',
  tableEdge: '.bz-table tbody .bz-row[data-cat] > :first-child',
  board: '.bz-board',
  boardColumn: '.bz-boardcol',
  boardHead: '.bz-boardcol-head',
  boardTrack: '.bz-track',

  /* Stage 7 — completion. `05`-C renders on `/` and on `/profile/` both, which
     is where its own note puts it, so these are read off the home page. */
  levelCard: '.bz-cc-level',
  dial: '.bz-dial',
  dialValue: '.bz-dial-value',
  statRow: '.bz-cc-stats',
  legendKey: '.bz-cc-legend-key[data-key="todo"]',

  /* Stage 8 — progress and account, read off `/profile/`. The hero is channel
     B and renders only once the store has answered, which is why the stage's
     comparison waits for the readout before extracting. */
  continueHero: '.bz-cont',
  continueNum: '.bz-cont-num',
  panel: '.bz-panel',
  field: '.bz-field',
  fieldLabel: '.bz-field-label',
  fieldInput: '.bz-field > input',

  /* Stage 9 — the front door. */
  heroActions: '.bz-hero-actions',
  factRow: '.bz-facts',
  whyMark: '.bz-why-mark',
  whyGrid: '.bz-why',
  boardList: '.bz-boardcol-list',
  boardMod: '.bz-boardcol-mod',
  viewToggle: '.bz-viewtoggle',

  /* Stage 6 — the code slab and the figure frame. `slabCode` is the `<pre>`
     the renderer marks, and `figure` is the INNER box: `01` puts `figcaption`
     outside `.diagram`, so the frame cannot be the `<figure>` element itself. */
  slab: '.bz-slab',
  slabCode: '.bz-slab-code',
  figure: '.bz-figure',

  /* Stage 5 — the reading page.

     Both buttons are scoped to the ACTION ROW, which is where the mockup has
     them (`.act .btn`). Unscoped, `buttonQuiet` resolved to the contents
     drawer's trigger — a `bz-btn-quiet` that is `display: none` above the fold
     breakpoint — so the role read as absent at 1440 while the row below it
     carried a perfectly good quiet button. `buttonPrimary` then excludes the
     quiet variant by class rather than by position: the row holds one filled
     button and at most one white one, and which is which is the point. */
  crumb: '.bz-crumb',
  display: '.bz-display',
  tag: '.bz-facts .bz-tag',
  section: '.bz-prose .bz-section',
  subsection: '.bz-prose .bz-subsection',
  card: '.bz-card',
  actions: '.bz-actions',
  buttonPrimary: '.bz-actions .bz-btn:not(.bz-btn-quiet)',
  buttonQuiet: '.bz-actions .bz-btn-quiet',
  pager: '.bz-pager',
  pagerItem: '.bz-pager-item',
  asideLink: '.bz-aside-link:not([aria-current])',
}

/**
 * The roles a stage has actually built, so a surface can be held to its mockup
 * before the whole interface exists.
 *
 * A stage names what it built and the comparison is restricted to that. It is
 * NOT a way to hide a difference: a role left out here is a role nobody is
 * checking, so the spec that uses this asserts the list is non-empty and every
 * role in it was really read on both sides.
 */
export function differencesIn(
  reference: DesignFacts,
  actual: DesignFacts,
  roles: readonly Role[],
): Difference[] {
  const wanted = new Set<string>(roles)
  return compareDesignFacts(reference, actual)
    .filter((difference) => wanted.has(difference.fact.split('.')[0]))
}

/**
 * FACTS THAT LEGITIMATELY STOP MATCHING BELOW A STATED WIDTH.
 *
 * The mockups are desktop drawings. `01` declares two breakpoints, 1180 and
 * 880, and below the lower one it says nothing at all — it was never drawn at
 * a phone's width, and `03` says the same about its table in its own note. So
 * there are a small number of facts whose reference value below `rail-at` is
 * not a specification but an artefact, and comparing against an artefact is
 * how a real difference gets buried in noise.
 *
 * **Every entry names a width and a reason, and the guard in
 * `fidelity.spec.ts` holds each one to both**: above its width the fact must
 * match, and below it the fact must really deviate. An entry that has stopped
 * deviating is an exemption nobody needs any more, and it fails.
 *
 * This is the same bargain `DELIBERATELY_ABSENT` makes for a role, applied to
 * a value: a departure somebody wrote down, never a comparison quietly
 * narrowed until it passed.
 */
export interface NarrowDeviation {
  /** The width below which this fact is no longer specified. */
  readonly below: number
  readonly why: string
}

export const NARROW_DEVIATIONS: Readonly<Record<string, NarrowDeviation>> = {
  'fieldInput.height': {
    below: 768,
    why:
      'The §10.4 touch floor. `07` draws the control 36px tall and a thumb needs '
      + '44, so the transcribed height holds where there is a pointer and the floor '
      + 'takes over below the phone breakpoint — D34\'s rule that a measured '
      + 'accessibility floor outranks a transcribed value. MEASURED 44px at 390.',
  },
  'barInner.paddingLeft': {
    below: 880,
    why:
      'the mockup gives the bar no narrow treatment and states 22px at every ' +
      'width. MEASURED at 390px: the trailing icon controls end at x=412 in a ' +
      '390 viewport, so the page scrolls sideways on every route — which fails ' +
      'an M16 acceptance criterion outright. DESIGN.md forbids both of the ' +
      'usual answers (nothing reflows into a hamburger, nothing scrolls ' +
      'sideways), so the padding gives way instead. Spacing only: no control ' +
      'is hidden and no colour moves.',
  },
  'levelKey.width': {
    below: 880,
    why:
      'a flex item both documents let shrink, so below the breakpoint the ' +
      'measured value is a function of the level NAME beside it — 18.55px in ' +
      'the mockup against 25.30px on the page, purely because the two ' +
      'documents name their levels differently. That is a measurement of ' +
      'CONTENT, which tests/README.md forbids a test from writing down; the ' +
      'same trap `menuCount.marginLeft` fell into. The page refuses to shrink ' +
      'its swatch at all, which is the design; the mockup squashes its own.',
  },
}

/**
 * The differences that are really differences at this width.
 *
 * Every viewport-aware comparison goes through here rather than through
 * `differencesIn`, so an exemption cannot be applied by accident: it has to be
 * in `NARROW_DEVIATIONS` with a width and a reason.
 */
export function differencesAt(
  reference: DesignFacts,
  actual: DesignFacts,
  roles: readonly Role[],
  width: number,
): Difference[] {
  return differencesIn(reference, actual, roles).filter((difference) => {
    const allowed = NARROW_DEVIATIONS[difference.fact]
    return allowed === undefined || width >= allowed.below
  })
}

/**
 * Roles the application deliberately does not render, with the reason.
 *
 * `barField` is the mockup's search box. **The command palette does not
 * exist** — it is deferred — and a control that opens nothing is the claim §1
 * forbids, so the slot is empty until there is something to search. The
 * retired header held the same slot back for the same reason. Recorded here
 * rather than left as an unexplained difference, because an unexplained
 * difference is how a real one gets ignored.
 */
export const DELIBERATELY_ABSENT: Readonly<Partial<Record<Role, string>>> = {
  barField: 'the command palette is deferred; a control that opens nothing is refused',
  node:
    'the mockup draws a flow BY HAND, so a node there is a `.bz-node` box with ' +
    'a background and a border. Every figure in this corpus is a mermaid ' +
    'drawing generated in the browser, where a node is an SVG `<rect>` painted ' +
    'through `themeCSS` — it has a `fill` and a `stroke` and no CSS background ' +
    'at all, so the two are not the same measurement and comparing them would ' +
    'be comparing `null` to `null`. `.bz-node` stays in the language as the ' +
    'transcription of what a figure node IS, the way `.bz-tok-*` stays as the ' +
    'transcription of the syntax palette shiki emits inline; what measures the ' +
    'real thing is `tests/e2e/mermaid.spec.ts`, which reads the painted stroke ' +
    'off the SVG and holds it to a 3:1 graphic floor in both themes.',
}
