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
  | 'boardList'
  | 'boardMod'
  /* Stage 4 — and the one thing in it no mockup draws. */
  | 'viewToggle'

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
export type Reference = '01' | '03'

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
}

export const REFERENCE_URL: Readonly<Record<Reference, string>> = {
  '01': MOCKUP_URL,
  '03': CATALOG_URL,
}

export const REFERENCE_SELECTORS: Readonly<Record<Reference, SelectorMap>> = {
  '01': MOCKUP_SELECTORS,
  '03': CATALOG_SELECTORS,
}

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
  boardList: '.bz-boardcol-list',
  boardMod: '.bz-boardcol-mod',
  viewToggle: '.bz-viewtoggle',
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
}
