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

export type Role =
  | 'bar'
  | 'barInner'
  | 'brand'
  | 'barLink'
  | 'barLinkCurrent'
  | 'barField'
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
  band: '.band',
  rail: '.side',
  railInner: '.side-in',
  group: '.arch:not([data-here]) > summary',
  groupCurrent: '.arch[data-here] > summary',
  groupKey: '.arch:not([data-here]) > summary .key',
  item: '.arch li a:not([aria-current])',
  tick: '.arch li a:not([aria-current]) .tick',
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
