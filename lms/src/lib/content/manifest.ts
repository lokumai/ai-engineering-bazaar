import { plural } from '../text'
import { CATEGORIES, type Category } from './categories'
import { categoryPath, sheetPath } from './curriculum'
import { LANG_DISPLAY } from './derive'
import { moduleGraph } from './edges'
import { loadAllModules } from './loader'
import type { SheetRow } from './rows'
import { thousands } from './title-block'
import { topicsFor } from './topics'

/**
 * §4.8 and §4.9 — the manifest.
 *
 * One row per sheet, and every cell in it is a fact about the *drawing*: its
 * extent, its sources, its language coverage, whether it is drawn, and what it
 * requires. Not one value here is a fact about the reader. That is the whole
 * point of §1's second question, and it is why this module is the only place
 * the two listing pages get their numbers from — a count computed twice starts
 * disagreeing with itself, and a manifest that disagrees with the sheet it
 * lists is worse than no manifest.
 *
 * The counts in §4.8's own statement copy are derived here too. "Fifteen are
 * drawn" is a measurement of the repository, and §11.25 does not make an
 * exception for a number that happens to be spelled out in words.
 */

/** The one value a row prints when it has nothing true to print. */
const DASH = '—'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

let rowCache: SheetRow[] | null = null

/** The whole set, in sheet order — the order the set is numbered in. */
export function sheetRows(): SheetRow[] {
  if (rowCache) return rowCache

  const graph = moduleGraph()

  rowCache = loadAllModules().map((sheet) => {
    const drawn = sheet.frontmatter.status === 'ready'
    const requires = graph.requires(sheet.frontmatter.module)

    return {
      module: sheet.frontmatter.module,
      number: pad2(sheet.frontmatter.module),
      title: sheet.frontmatter.title,
      path: sheetPath(sheet),
      drawn,
      status: drawn ? 'READY' : 'NOT DRAWN',
      subsystem: {
        order: sheet.category.order,
        title: sheet.category.title,
        path: categoryPath(sheet.category),
      },
      // The same refusal §5.5 makes in the title block: a stub's words are its
      // schedule of parts and its duration is undeclared, so there is no
      // extent to state and none is invented.
      extent: drawn
        ? `${thousands(sheet.extent)} W · ${sheet.frontmatter.duration} MIN`
        : DASH,
      // Gated on `drawn`, not on zero, for the reason §5.5 gives: a dash means
      // nobody counted, and on a drawn sheet somebody did. Modules 2, 4 and 5
      // cite nothing, and `0` is the true statement about them.
      sources: drawn ? String(sheet.sources) : DASH,
      lang: LANG_DISPLAY[sheet.lang],
      bilingual: sheet.lang === 'EN·TR',
      requires: requires.length === 0 ? DASH : requires.join(', '),
      topics: topicsFor({ status: sheet.frontmatter.status, body: sheet.body }),
    }
  })

  return rowCache
}

/** The rows of one subsystem, still in sheet order. */
export function categoryRows(category: Category): SheetRow[] {
  return sheetRows().filter((row) => row.subsystem.order === category.order)
}

// ---------------------------------------------------------------------------
// The counts each page states about itself
// ---------------------------------------------------------------------------

export interface Coverage {
  sheets: number
  drawn: number
  notDrawn: number
  /** Declared minutes across the drawn sheets. Zero where none declares one. */
  minutes: number
}

function coverage(rows: readonly SheetRow[], minutes: number): Coverage {
  const drawn = rows.filter((row) => row.drawn).length
  return { sheets: rows.length, drawn, notDrawn: rows.length - drawn, minutes }
}

function declaredMinutes(predicate: (order: number) => boolean): number {
  return loadAllModules()
    .filter((sheet) => predicate(sheet.category.order))
    .reduce((total, sheet) => total + sheet.frontmatter.duration, 0)
}

export function setSummary(): Coverage {
  return coverage(sheetRows(), declaredMinutes(() => true))
}

export function categorySummary(category: Category): Coverage {
  return coverage(
    categoryRows(category),
    declaredMinutes((order) => order === category.order),
  )
}

/**
 * `~3 H 55 MIN`. The tilde is doing real work: this is the sum of the
 * durations the sheets themselves declare, not a measurement of anyone's
 * reading. Returns null where nothing declares one, so a subsystem with no
 * drawn sheets prints no duration at all rather than `~0 MIN`.
 */
export function durationLabel(minutes: number): string | null {
  if (minutes <= 0) return null

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `~${rest} MIN`
  return rest === 0 ? `~${hours} H` : `~${hours} H ${rest} MIN`
}

function joinMarks(parts: readonly (string | null)[]): string {
  return parts.filter((part): part is string => part !== null).join(' · ')
}

/**
 * `8 SHEETS · 8 DRAWN · ~3 H 55 MIN` — what any group of sheets states about
 * itself. The duration is dropped where nothing in the group declares one, so
 * a subsystem with no drawn sheets reads `9 SHEETS · 0 DRAWN` and stops there.
 */
export function coverageLabel({ sheets, drawn, minutes }: Coverage): string {
  return joinMarks([
    plural(sheets, 'SHEET').toUpperCase(),
    `${drawn} DRAWN`,
    durationLabel(minutes),
  ])
}

/** §4.9 item 1 — `SUBSYSTEM 02 · 8 SHEETS · 8 DRAWN · ~3 H 55 MIN`. */
export function categoryEyebrow(category: Category): string {
  return `SUBSYSTEM ${pad2(category.order)} · ${coverageLabel(categorySummary(category))}`
}

/** The same line for the set as a whole. */
export function setEyebrow(): string {
  return coverageLabel(setSummary())
}

// ---------------------------------------------------------------------------
// §4.8 item 2 — the statement
// ---------------------------------------------------------------------------

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen',
]

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty',
  'ninety',
]

/**
 * A count as the statement spells it. Past ninety-nine it gives up and returns
 * the digits: a wrong word is a lie, and a numeral in a sentence is only ugly.
 */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n)
  if (n < 20) return ONES[n]

  const tens = TENS[Math.floor(n / 10)]
  const ones = n % 10
  return ones === 0 ? tens : `${tens}-${ONES[ones]}`
}

function sentenceCount(n: number): string {
  if (n === 0) return 'None'
  const word = numberWord(n)
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/**
 * §4.8 item 2, four lines, with every count in it measured from the corpus at
 * build time. The spec prints "Thirty-two sheets… Fifteen are drawn. Seventeen
 * are dashed", which is what this returns today; the day a stub is drawn it
 * returns "Sixteen are drawn. Sixteen are dashed" instead, and the home page
 * does not start the reader off with a lie.
 */
export function indexStatement(): string[] {
  const { sheets, drawn, notDrawn } = setSummary()

  return [
    `${sentenceCount(sheets)} sheets on becoming an AI-powered software engineer.`,
    notDrawn === 0
      ? 'Every sheet is drawn.'
      : `${sentenceCount(drawn)} are drawn. ${sentenceCount(notDrawn)} are `
        + 'dashed — the geometry exists in the model, the lines do not.',
    'Every claim is fetched from a primary source and dated. Nothing is cited '
    + 'from memory.',
    'Read in any order the dependency graph allows.',
  ]
}

/** Every subsystem, with the coverage its block prints (§5.4). */
export interface SubsystemCoverage {
  category: Category
  coverage: Coverage
  path: string
}

export function subsystems(): SubsystemCoverage[] {
  return CATEGORIES.map((category) => ({
    category,
    coverage: categorySummary(category),
    path: categoryPath(category),
  }))
}
