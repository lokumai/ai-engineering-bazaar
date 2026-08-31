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

/**
 * §12.3.1 — the thirteenth row. **The reader takes `CHECKED BY`.**
 *
 * A title block carries `DRAWN BY` and `CHECKED BY`; `DRAWN BY  LKM-01` stays
 * exactly as §8.5 requires, and the other field is the reader's. This is not a
 * metaphor stretched to fit: the reader's entire activity on this site is
 * approving sheets, and §7.4 already puts reader state in the title block as
 * the stamp grid.
 *
 * It is **not** a thirteenth entry in `titleBlockRows`, and that is a type
 * decision rather than a stylistic one. Every row there is a `string` measured
 * from the file, the frontmatter or git; who is reading is none of those and
 * cannot be known at build time (§12.2). So the row's value arrives as a
 * component — `CheckedBy`, on channel B — and what this module owns is the two
 * halves of it that ARE build-time facts: the label, and whether the row exists
 * at all.
 *
 * A draft sheet has **no such row** (§12.3.1) — absent, not `—`: a sheet nobody
 * has drawn cannot be checked, and it has no sign-off control to produce a
 * checker with either (§12.4.1).
 */
export const CHECKED_BY_LABEL = 'CHECKED BY'

/** §12.3.1 — whether this sheet carries the `CHECKED BY` row at all. */
export function carriesCheckedBy(facts: SheetFacts): boolean {
  return facts.status === 'ready'
}

/**
 * §12.9 — the fourteenth row: how many repositories the reader has registered
 * against this sheet.
 *
 * It exists because of a defect a reader found. They registered three
 * repositories, the register beneath the sheet said `3 OF 3`, and the title
 * block — the panel that summarises everything about the sheet — did not mention
 * them anywhere. Meanwhile the exported RECORD OF WORK has always printed
 * `REPOSITORIES n`, so the artefact knew something the sheet it came from would
 * not say.
 *
 * **A row, and not a stamp slot.** The obvious place looked like §7.4's stamp
 * grid, which is already where reader state lives in this block, and it was
 * built there first. `Stamp` can print `n OF m` or `APPROVED` and nothing else,
 * so a register at its cap rendered `SUBMITTAL APPROVED` — and filling a
 * register to its storage limit approves nothing. Every stamp reads as a
 * completed inspection record (§12.5.4); a repository count is a measurement,
 * which is precisely what the rows above are.
 *
 * It follows `CHECKED BY` in being a channel-B row (§12.2): the label and
 * whether the row exists are build-time facts and live here, while the value is
 * a component, because the build cannot know who is reading. And like
 * `CHECKED BY` a draft sheet has none — a sheet nobody has drawn has no
 * submittal register to report (§12.9.1).
 */
export const REPOSITORIES_LABEL = 'REPOSITORIES'

/** §12.9 — whether this sheet carries the `REPOSITORIES` row at all. */
export function carriesRepositories(facts: SheetFacts): boolean {
  return facts.status === 'ready'
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
