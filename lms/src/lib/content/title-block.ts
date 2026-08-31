import type { SheetPosition } from './curriculum'
import { LANG_DISPLAY, type Lang, countDiagrams, countTables } from './derive'
import type { CourseModule } from './loader'
import type { Revision } from './revision'

/**
 * §5.5 — the module header block's data, in one place, because the block and
 * the strip are two renderings of exactly the same twelve facts and the moment
 * they are computed twice they start disagreeing.
 *
 * Every value here is measured from the file, the frontmatter or git. Nothing
 * is hand-maintained and nothing is estimated (§11.25): a value that cannot be
 * derived prints an em dash instead, because "—" is the honest rendering of
 * "nobody counted this" and a plausible-looking zero is not.
 */

/** The one value the sheet prints when it has nothing true to print. */
const DASH = '—'

export interface SheetFacts {
  module: number
  categoryOrder: number
  categoryTitle: string
  position: SheetPosition
  /** Sheets in the whole set — counted by the caller, never typed. */
  sheets: number
  status: 'ready' | 'draft'
  extent: number
  duration: number
  /**
   * §5.5 `FIGURES`, first term — mermaid diagrams, the rail already stripped.
   * Images are figures too and §6.9 draws them in the same component, but the
   * row is spelled `<n> DIAG · <n> TBL` and `DIAG` is not somewhere to hide
   * four images: module 6 has one diagram and four of them.
   */
  diagrams: number
  tables: number
  sources: number
  requires: readonly number[]
  feeds: readonly number[]
  revision: Revision | null
  lang: Lang
}

export interface TitleBlockRow {
  label: string
  value: string
  /**
   * `.hl-mark` uppercases every chrome value (§3.4). A git short hash is the
   * one value on the sheet whose case is not ours to change, so the component
   * is told to leave it alone.
   */
  preserveCase?: boolean
}

/** `5008` -> `5,008`. Written out because `toLocaleString` follows the host. */
export function thousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function list(modules: readonly number[]): string {
  return modules.length === 0 ? DASH : modules.join(', ')
}

/** Map a loaded module and its graph edges onto the facts the header prints. */
export function sheetFacts(
  module: CourseModule,
  context: {
    position: SheetPosition
    sheets: number
    requires: readonly number[]
    feeds: readonly number[]
  },
): SheetFacts {
  return {
    module: module.frontmatter.module,
    categoryOrder: module.category.order,
    categoryTitle: module.category.title,
    position: context.position,
    sheets: context.sheets,
    status: module.frontmatter.status,
    extent: module.extent,
    duration: module.frontmatter.duration,
    diagrams: countDiagrams(module.body),
    tables: countTables(module.body),
    sources: module.sources,
    requires: context.requires,
    feeds: context.feeds,
    revision: module.revision,
    lang: module.lang,
  }
}

/** §4.5 item 2 / §4.6 — `SUBSYSTEM 03 · EXPERT · SHEET 17 OF 32`. */
export function eyebrow(facts: SheetFacts): string {
  return [
    `SUBSYSTEM ${pad2(facts.categoryOrder)}`,
    facts.categoryTitle.toUpperCase(),
    sheetLabel(facts),
  ].join(' · ')
}

/** §5.2 — `SHEET 13 OF 32`, the footer's left cell. */
export function sheetLabel(facts: SheetFacts): string {
  return `SHEET ${facts.module} OF ${facts.sheets}`
}

/**
 * §5.5 Variant A — the twelve rows of the title block, in the spec's order.
 *
 * `EXTENT`, `FIGURES` and `SOURCES` are the three rows a draft sheet cannot
 * fill, and §4.5 item 4 dashes all three. Its words are the schedule of parts,
 * which the sheet already prints in full, and its duration is undeclared;
 * `92 W · 0 MIN` would be an estimate of how long it takes to read a drawing
 * that does not exist.
 *
 * The gate is `status`, never a zero. A dash is the honest rendering of
 * "nobody counted this", and on a *drawn* sheet somebody did: modules 2, 4 and
 * 5 cite no external source at all, and `SOURCES 0` is the true statement
 * about them where `SOURCES —` claims the count was never taken.
 */
export function titleBlockRows(facts: SheetFacts): TitleBlockRow[] {
  const drawn = facts.status === 'ready'

  return [
    { label: 'DRAWING', value: pad2(facts.module) },
    {
      label: 'SUBSYSTEM',
      value: `${pad2(facts.categoryOrder)} · ${facts.categoryTitle.toUpperCase()}`,
    },
    { label: 'POSITION', value: `${facts.position.index} OF ${facts.position.of}` },
    {
      label: 'EXTENT',
      value: drawn ? `${thousands(facts.extent)} W · ${facts.duration} MIN` : DASH,
    },
    {
      label: 'FIGURES',
      value: drawn ? `${facts.diagrams} DIAG · ${facts.tables} TBL` : DASH,
    },
    { label: 'SOURCES', value: drawn ? String(facts.sources) : DASH },
    { label: 'REQUIRES', value: list(facts.requires) },
    { label: 'FEEDS', value: list(facts.feeds) },
    { label: 'REVISION', value: facts.revision?.hash ?? DASH, preserveCase: true },
    { label: 'DATE', value: facts.revision?.date ?? DASH },
    { label: 'LANG', value: LANG_DISPLAY[facts.lang] },
    { label: 'DRAWN BY', value: 'LKM-01' },
  ]
}

/** The six rows §4.5 item 4 gives a draft sheet's strip, in its order. */
const DRAFT_STRIP = ['EXTENT', 'FIGURES', 'SOURCES', 'REQUIRES', 'LANG', 'REVISION']

/**
 * §5.5 Variant B — the same rows, laid out horizontally beneath the h1.
 *
 * A draft sheet carries the shorter set §4.5 spells out: its eyebrow already
 * states the drawing number, the subsystem and the position, and four of the
 * remaining rows would be em dashes in a row.
 */
export function titleStripRows(facts: SheetFacts): TitleBlockRow[] {
  const rows = titleBlockRows(facts)
  if (facts.status === 'ready') return rows

  return DRAFT_STRIP.map((label) => {
    const row = rows.find((r) => r.label === label)
    if (!row) throw new Error(`§4.5 names a strip row the title block does not have: ${label}`)
    return row
  })
}
