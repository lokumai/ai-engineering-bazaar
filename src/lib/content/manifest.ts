import { sheetStamps } from '../record/derive'
import { NOT_MEASURED, numberWord } from '../text'
import { EMPTY_RECORD } from '../record/schema'
import { plural } from '../text'
import { CATEGORIES, type Category } from './curriculum-file'
import { categoryPath, sheetPath } from './curriculum'
import { LANG_DISPLAY, countFigures } from './derive'
import { moduleGraph } from './edges'
import { curriculumFacts } from './facts'
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
 *
 * §4.8's ninth column does not change that. `slots` names the sign-off slots a
 * sheet SUPPLIES — which is a property of the drawing, exactly like its extent
 * and its sources — and never which of them a reader has filled. The filling is
 * §12.2 channel B's job, after mount, in one island; nothing here has an
 * opinion about it.
 */

/** The one value a row prints when it has nothing true to print. */
const DASH = NOT_MEASURED

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

let rowCache: SheetRow[] | null = null

/** The whole set, in sheet order — the order the set is numbered in. */
export function sheetRows(): SheetRow[] {
  if (rowCache) return rowCache

  const graph = moduleGraph()
  const facts = curriculumFacts()

  rowCache = loadAllModules().map((sheet) => {
    const drawn = sheet.frontmatter.status === 'ready'
    const requires = graph.requires(sheet.frontmatter.module)

    return {
      module: sheet.frontmatter.module,
      number: pad2(sheet.frontmatter.module),
      slug: sheet.slug,
      title: sheet.frontmatter.title,
      path: sheetPath(sheet),
      drawn,
      status: drawn ? 'READY' : 'PLANNED',
      subsystem: {
        order: sheet.category.order,
        title: sheet.category.title,
        path: categoryPath(sheet.category),
        // M12 — carried rather than recovered from the path: the catalog's
        // views address a level's colour as `[data-cat="<slug>"]`.
        slug: sheet.category.slug,
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
      // M20 — the author's own sentence, carried rather than rewritten. It is
      // `null` on a planned module and `schema.ts` is what guarantees it is
      // not null on a written one, so the listing never has to check twice.
      summary: sheet.frontmatter.summary,
      // §4.8 column 9. Taken from `sheetStamps` rather than re-derived from
      // the same three facts, because the island that fills the squares asks
      // `sheetStamps` which slots exist: two derivations of one slot set would
      // eventually draw a square nothing can ever fill. EMPTY_RECORD is passed
      // to make the independence explicit — the slot SET is a function of the
      // corpus alone, and only `current` moves with the reader.
      slots: sheetStamps(EMPTY_RECORD, facts, sheet.slug).map((stamp) => stamp.id),
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

/** The shortest and the longest module the course declares, in minutes. */
export interface LengthRange {
  shortest: number
  longest: number
}

/**
 * M18 — how long a module takes, DERIVED, because the site has been printing a
 * number nobody measured.
 *
 * The home page said *"Five to ten minutes a module"*, which came from
 * `README.md` rule 4 and `MANIFESTO.md` §3. **MEASURED against the corpus that
 * sentence describes: nineteen modules declare a duration, the shortest is 20
 * minutes and the longest is 30.** Not one of them is under twenty. The
 * author's list of 2026-09-11 names the figure as wrong, and it was wrong by a
 * factor of three.
 *
 * So the sentence takes its numbers from the modules instead of from a
 * document, which is §11.25 applied to prose rather than to a facts strip: a
 * module that gets longer moves the promise with it, and nobody has to notice.
 * A written module needs a positive duration — `curriculum-file.ts` fails the
 * build without one — so there is no empty case to spell.
 *
 * Only the written ones. A planned module declares nothing, and averaging a
 * zero into a promise is how the figure went wrong in the first place.
 */
export function moduleLengthRange(): LengthRange {
  const declared = loadAllModules()
    .map((sheet) => sheet.frontmatter.duration)
    .filter((minutes) => minutes > 0)

  return {
    shortest: Math.min(...declared),
    longest: Math.max(...declared),
  }
}

/**
 * M13 — the four facts the home page states about the course, measured.
 *
 * The home page's strip of numbers is the one place on the site that says how
 * big this thing is, and §11.25 does not make an exception for a number in a
 * headline: every one of these is counted from the corpus at build time, so
 * breaking a derivation changes the page rather than leaving it confidently
 * wrong. The strip prints `19 of 33 written`, a reading time, a figure count
 * and a source count, and it prints nothing this function did not count.
 *
 * `figures` is diagrams plus images, which is what a module's own info panel
 * counts (`countFigures`), so the total and the per-module rows cannot
 * disagree. `sources` is the sum of each module's distinct external links —
 * per module, so a paper cited by two modules is two citations here. The home
 * page says "sources cited" rather than "distinct sources" for exactly that
 * reason.
 */
export interface CorpusTotals {
  modules: number
  ready: number
  /** Declared minutes across the ready modules. */
  minutes: number
  figures: number
  sources: number
}

export function corpusTotals(): CorpusTotals {
  const modules = loadAllModules()
  const { sheets, drawn, minutes } = setSummary()
  return {
    modules: sheets,
    ready: drawn,
    minutes,
    figures: modules.reduce((total, module) => total + countFigures(module.body), 0),
    sources: modules.reduce((total, module) => total + module.sources, 0),
  }
}

export function categorySummary(category: Category): Coverage {
  return coverage(
    categoryRows(category),
    declaredMinutes((order) => order === category.order),
  )
}

/**
 * `~3 h 55 min`. The tilde is doing real work: this is the sum of the
 * durations the sheets themselves declare, not a measurement of anyone's
 * reading. Returns null where nothing declares one, so a subsystem with no
 * drawn sheets prints no duration at all rather than `~0 min`.
 *
 * NOT SHOUTED, since M16. These strings were written in capitals because the
 * class that carried them applied `text-transform: uppercase`, and writing
 * them pre-cased kept the two in step. The design language has no uppercase
 * anywhere — `01:136-137` turns it off explicitly on the one element that
 * would have carried it — so a pre-cased string is now the only thing
 * shouting on the page. `01`'s own facts line is the reference:
 * `30 min · 1,814 words · English & Türkçe`.
 */
export function durationLabel(minutes: number): string | null {
  if (minutes <= 0) return null

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `~${rest} min`
  return rest === 0 ? `~${hours} h` : `~${hours} h ${rest} min`
}

function joinMarks(parts: readonly (string | null)[]): string {
  return parts.filter((part): part is string => part !== null).join(' · ')
}

/**
 * M20 — the line under a level's heading: `8 modules · ~3 h 55 min`.
 *
 * **It was `Level 02 · 8 modules · 7 ready · ~3 h 55 min`, an eyebrow ABOVE the
 * heading, and the blurb is what sat here.** The author asked for the blurb to
 * go and this line to take its place, cut to the modules and the total time.
 * Both of the parts it lost were already said: `Level 02` is the heading
 * itself — in words, which is the better spelling of it — and `7 ready` is on
 * every row of the table under it, and in the board's own rail.
 *
 * The name changed with the position. It is no longer an eyebrow, and a
 * function called `categoryEyebrow` printing a lead line is the kind of stale
 * name the next reader has to work out from the call site.
 */
export function categoryCoverage(category: Category): string {
  const { sheets, minutes } = categorySummary(category)
  return joinMarks([plural(sheets, 'module'), durationLabel(minutes)])
}

// ---------------------------------------------------------------------------
// §4.8 item 2 — the statement
// ---------------------------------------------------------------------------

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
    `${sentenceCount(sheets)} modules on becoming an AI-powered software engineer.`,
    // M13 — this line read "… are dashed — the geometry exists in the model,
    // the lines do not", which is the drawing-set metaphor in substance on the
    // one page a stranger meets first. The copy register's word boundaries
    // could not catch it (`dashed` is not in §9's table) and the export grep
    // could not either. Set C says what the state is: a planned module has a
    // page, and that page is a schedule of what it will cover.
    notDrawn === 0
      ? 'Every module is ready.'
      : `${sentenceCount(drawn)} are ready to read. ${sentenceCount(notDrawn)} are `
        + 'planned, and each one lists what it will cover.',
    'Every claim is fetched from a primary source and dated. Nothing is cited '
    + 'from memory.',
    'Read in any order the dependency graph allows.',
  ]
}

/* M17 — `subsystems()` and `setEyebrow()` were deleted here, and saying so is
   cheaper than letting somebody find them and build a page with them.

   Both existed for `/courses/`, the page that listed every level with its own
   band. That page folded into the catalog, which groups by level in the
   Overview view and prints each level's counts beside the modules it counts,
   so neither function had a caller left. `setEyebrow` also carried the one
   figure nothing else states — the whole set's declared reading time — and the
   catalog dropped its own eyebrow on a recorded decision in M12; the five
   level pages each state their own.

   **M20 deleted `coverageLabel` here too, and for the same reason rather than
   a new one.** It returned `8 modules · 8 ready · ~3 h 55 min` and had exactly
   one caller, the level head's eyebrow; the author cut that line to the
   modules and the total time, so `categoryCoverage` above says what is left
   and the three-part version had nobody to serve. `categorySummary`,
   `durationLabel` and `setSummary` are all still live and any future caller
   can have the long line back in one expression. */
