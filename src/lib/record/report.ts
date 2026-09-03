/**
 * §12.12 — the `RECORD OF WORK`.
 *
 * One self-contained HTML file, generated in the reader's browser from their own
 * record, saved to their own disk, and opened years later from `file://` on a
 * machine with no relationship to this origin. That last sentence is the whole
 * specification: **every affordance has to survive with no network, no server,
 * no storage and no module loader.** So there is one `<style>`, one classic
 * inline `<script>`, inline SVG, system font stacks, and the data in a JSON
 * data block. Nothing is fetched, because a `file://` document is an opaque
 * origin and anything not inlined is a broken asset in front of an employer.
 *
 * ## What this document is allowed to say
 *
 * It is a RECORD, never a certificate, credential, badge, diploma or
 * verification. An unsecured document is a credential but not a *verifiable*
 * one, and verifiability would not imply the truth of the claims anyway. Open
 * Badges 3.0 conformance needs a securing mechanism and a resolvable issuer
 * profile with a public key; a static export can provide neither, and signing in
 * the browser would publish the private key to every visitor.
 *
 * So every claim is phrased as a statement about the **record**, never about the
 * person: "this record contains 7 of 33 sheets marked signed off" is always
 * true, where "has completed" is not something this data supports. §12.12.1
 * lists the permitted forms and the forbidden ones, and `CLAIMS` below is that
 * list in code.
 *
 * ## Why string templating rather than DOM serialisation
 *
 * `document.implementation.createHTMLDocument()` would make the browser's own
 * spec-conformant serialiser the escaper, which is safer in isolation. It is
 * also unavailable in the node test environment, and §12.14.2 forbids adding
 * jsdom. Exhaustively tested escapers (`lib/identity/escape.ts`) plus a
 * hostile-input suite plus a Playwright test that saves the file and reopens it
 * from `file://` covers more of the real risk than an untestable DOM path.
 *
 * Consequence, and it is not optional: **reader text reaches this file only
 * through `escText`, `escAttr` or `escJsonForScript`.** Never an event-handler
 * attribute, never a `style` attribute, never the script body. The document is
 * re-opened forever and there is no server-side fix.
 *
 * ## What §13.7 added, and what it did not
 *
 * The cover carries LKM-01 at 96px with its faces filled from the record, and a
 * flavour ledger of real text beside it; block 1 names the role and the path's
 * standing, and is absent entirely when no role is on record; the sheet ledger's
 * per-category rule takes its category's hue. Three surfaces, all three on
 * §13.1.3's closed list.
 *
 * The budget did not move. `REPORT_BUDGET_BYTES` is 250 KiB, six hues and one
 * 96px SVG cost well under a kilobyte, and the document is still one file with
 * zero external requests: `oklch()` values are transcribed rather than imported
 * because there is no stylesheet to import over `file://`.
 *
 * A role earns nothing (§12.5.1), awards nothing, and does not change what this
 * document calls itself: with no submittals it is still a `READING RECORD`
 * (§12.11).
 *
 * ## Purity
 *
 * No `Date`, no `Math.random`, no `crypto`, no DOM. The generation instant and
 * the content digest are computed by the caller and passed in — which is what
 * makes the whole document byte-reproducible under test, and what lets the
 * digest be a real SHA-256 from Web Crypto without this module going async.
 */

import {
  FACES,
  FLAVOURS,
  HIDDEN_DASH,
  SUGAR,
  SUGAR_R,
  VIEW_BOX,
  faceStateFor,
  hatchSpec,
  type FaceState,
} from '../../components/mascot/geometry'
import { escAttr, escJsonForScript, escText } from '../identity/escape'
import { markPaths, MARK_VIEW_BOX } from '../identity/mark'
import { displayInitials } from '../identity/name'
import { pathStanding } from '../path/derive'
import { drawnCount, pathFor } from '../path/paths'
import { roleById } from '../path/roles'
import { type Envelope, type RecordData, type Submittal, SCHEMA_VERSION } from './schema'

/**
 * §13.2 — why this module reaches into `components/mascot/geometry.ts`, which
 * is the one import here that is not a leaf of `lib/`.
 *
 * The cover carries LKM-01, and the mark is defined by seven points and six
 * rhombi that already exist in one place. A second copy of those paths in this
 * file would be a drawing that could drift from the one on the site, printed
 * inside a document nobody can reissue — the worst place in the product for two
 * versions of one fact. The geometry module reaches nothing at runtime: its
 * only import is a `type`, so it is erased and no `node:fs` edge is created
 * (§12.2's import rule, which this file lives under because it runs in the
 * reader's browser). `lib/identity/mark.ts` chose the opposite trade for its
 * one lattice constant, and that is the right call there: a constant can be
 * restated in a line, six SVG paths cannot.
 */

// ---------------------------------------------------------------------------
// The build-time facts the document needs, beyond the record itself.
//
// Deliberately richer than `CurriculumFacts`: a ledger row prints a title and a
// subsystem, the criteria block reprints what signing off was supposed to
// require, and the checklist section reproduces the item TEXT rather than a
// tally — because a tally reads as a score, and reproducing the text is what
// makes the document self-describing to somebody who has never seen the
// curriculum. Every field is derived at build time from the corpus (§11.25).
// ---------------------------------------------------------------------------

export interface ReportSheetFact {
  slug: string
  module: number
  title: string
  categorySlug: string
  categoryTitle: string
  categoryOrder: number
  drawn: boolean
  /** §12.4.3 — the sheet's current revision, for the drift comparison. */
  revision: string | null
  /** §12.12.2 — the criteria a sign-off asserted against. */
  objectives: readonly string[]
  /** §12.6 — the question, reproduced beside the reader's answer. */
  question: string | null
  /** §12.7 — the item text, not a count. */
  checklistItems: readonly string[]
}

export interface ReportFacts {
  sheets: readonly ReportSheetFact[]
  /** The curriculum's own name, and the size of the set — counted, never typed. */
  curriculumName: string
  /** Where the criteria live, so a reviewer can read them for themselves. */
  criteriaUrl: string
  /** §12.4.1's fixed sentence: what the reader was asserting. */
  assertion: string
}

export interface ReportInput {
  data: RecordData
  facts: ReportFacts
  /** ISO instant. Supplied by the caller so this module stays pure. */
  generatedAt: string
  /** SHA-256 of `canonicalRecordJson(data)`, hex. Supplied by the caller. */
  digest: string
}

// ---------------------------------------------------------------------------
// §12.12.5 — the digest input.
//
// Canonical so that the same record always hashes the same: keys sorted at
// every depth, no whitespace. Arrays keep their order, because order is
// meaningful in `sources` and `submittals` and sorting them would make two
// genuinely different records hash alike.
// ---------------------------------------------------------------------------

function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalise)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonicalise((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

export function canonicalRecordJson(data: RecordData): string {
  return JSON.stringify(canonicalise(data))
}

// ---------------------------------------------------------------------------
// The document's own model. Computed once, then rendered — so the ledger, the
// evidence register and the counts in the header cannot disagree with each
// other, which is the same reason `lib/content/manifest.ts` is the single
// source for the index sheet's numbers.
// ---------------------------------------------------------------------------

interface LedgerRow {
  fact: ReportSheetFact
  signedOff: string | null
  signedRevision: string | null
  /** §12.4.3 — set only when the sheet has moved since it was signed. */
  drift: { signedAgainst: string; nowAt: string } | null
  quizAnswer: string | null
  quizAssessed: 'matched' | 'missed' | null
  checklistTicks: readonly boolean[]
  sources: readonly string[]
  submittals: readonly Submittal[]
  /**
   * §12.12.9 — the one condition under which this document spends the accent.
   * Signed off AND carrying a repository with a commit hash: the rows a
   * reviewer should actually open, and the only rows whose claim rests on
   * something outside this file.
   */
  checkable: boolean
}

/**
 * §13.2, §13.7 — one subsystem's standing, for the cover.
 *
 * The mark's six faces and the flavour ledger beside them are the same six
 * facts drawn twice, so they are computed once here. Both the count and the
 * face state are derived from the record and the corpus; nothing is typed
 * (§11.25). `total` counts every sheet in the subsystem, drawn or not, exactly
 * as the boot script's `-complete` test does — a denominator that shrank to
 * what is drawn would flatter the reader.
 */
interface CategoryStanding {
  slug: string
  title: string
  order: number
  signed: number
  /**
   * Every sheet in the subsystem. This is the denominator the FACE's state uses,
   * and it matches the site's boot script exactly, so a cube drawn from this
   * file and the same cube on the site cannot disagree (§13.14a).
   */
  total: number
  /**
   * Sheets in the subsystem that anybody has drawn. This is the denominator the
   * legend PRINTS, and the two are deliberately different numbers: 17 of the 32
   * sheets are drafts carrying no sign-off control at all (§12.4.1), so
   * `0/9` beside Expert would offer nine sign-offs nobody can take. When this is
   * zero the legend prints `NOT DRAWN` instead of a fraction — the register's own
   * word (§12.14.1), and the same thing `FaceLegend` prints on the site.
   */
  drawn: number
  state: FaceState
}

/**
 * §13.7 — the role the reader stated, and where they stand on its path.
 *
 * `null` when no role is on record, and the whole line is then ABSENT from the
 * document rather than printed with a dash: every other field in block 1 is a
 * measurement, so `ROLE: —` would read as a field this reader has yet to fill
 * in, where the truth is that they declined to state one and were never asked
 * to (§13.3). A role is never inferred, here least of all — this file is opened
 * by an employer.
 *
 * `standing` is `null` when no path answers to the role, which is possible in a
 * record written by a later build than the one that generated this document.
 * The role still prints; the tally does not.
 */
interface RoleStanding {
  label: string
  /** §13.4.2 — `drawn` is DRAWN steps only, never the length of the list. */
  standing: { signed: number; drawn: number } | null
}

interface ReportModel {
  /** `RECORD OF WORK`, or `READING RECORD` with no submittals (§12.12.1). */
  title: string
  name: string | null
  initials: string | null
  markSvg: string
  /** §13.2 — the cover mark, its faces filled from the record. */
  cubeSvg: string
  /** §13.2 — the flavour ledger beside it, in curriculum order. */
  categories: readonly CategoryStanding[]
  /** §13.7 — absent entirely when no role is on record. */
  role: RoleStanding | null
  rows: readonly LedgerRow[]
  signed: readonly LedgerRow[]
  unsigned: readonly LedgerRow[]
  submittalCount: number
  quizCount: number
  distinctSources: readonly string[]
  span: { first: string; last: string; days: number } | null
  generatedAt: string
  digest: string
  facts: ReportFacts
  data: RecordData
}

function dayDiff(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a)
  return Number.isFinite(ms) ? Math.round(ms / 86_400_000) : 0
}

function buildModel(input: ReportInput): ReportModel {
  const { data, facts } = input

  const rows: LedgerRow[] = facts.sheets.map((fact) => {
    const sheet = data.sheets[fact.slug]
    const signedOff = sheet?.signedOff ?? null
    const signedRevision = sheet?.signedRevision ?? null
    const drift =
      signedOff !== null && signedRevision !== null && fact.revision !== null
        && signedRevision !== fact.revision
        ? { signedAgainst: signedRevision, nowAt: fact.revision }
        : null

    const submittals = sheet?.submittals ?? []
    return {
      fact,
      signedOff,
      signedRevision,
      drift,
      quizAnswer: sheet?.quiz?.answer ?? null,
      quizAssessed: sheet?.quiz?.assessed ?? null,
      checklistTicks: fact.checklistItems.map(
        (_, index) => sheet?.checklist[String(index)] === true,
      ),
      sources: sheet?.sources ?? [],
      submittals,
      checkable:
        signedOff !== null && submittals.some((entry) => entry.commit !== null),
    }
  })

  const signed = rows.filter((row) => row.signedOff !== null)
  const submittalCount = rows.reduce((sum, row) => sum + row.submittals.length, 0)

  const distinct = new Set<string>()
  for (const row of rows) for (const url of row.sources) distinct.add(url)

  // §12.12.1 — "the first and last marks in this record are 41 days apart".
  // A statement about the record, and one a reviewer can sanity-check against
  // the dates in the ledger. Absent with fewer than two marks, rather than
  // reported as zero days.
  const instants = signed
    .map((row) => row.signedOff as string)
    .slice()
    .sort((a, b) => Date.parse(a) - Date.parse(b))
  const span =
    instants.length >= 2
      ? {
        first: instants[0],
        last: instants[instants.length - 1],
        days: dayDiff(instants[0], instants[instants.length - 1]),
      }
      : null

  const categories = categoryStandings(rows)

  // §13.4.2's denominator, off the facts this document was handed rather than
  // off a number written down anywhere: `drawn` is `status: ready` in the
  // corpus, and `facts.sheets` is where the corpus reached this module.
  const drawnSlugs = new Set(
    facts.sheets.filter((fact) => fact.drawn).map((fact) => fact.slug),
  )

  return {
    // §12.12.1 — with no repositories this document holds only self-reported
    // button presses. Renaming it costs one conditional and stops it
    // overstating its own weight, which would be the §1 failure exactly.
    //
    // §13.7 — and a role does not change it. A job title is not a submittal.
    title: submittalCount > 0 ? 'RECORD OF WORK' : 'READING RECORD',
    name: data.identity.name,
    initials: data.identity.name === null ? null : displayInitials(data.identity.name, 'en'),
    markSvg: renderMark(data),
    cubeSvg: renderCube(categories),
    categories,
    role: roleStandingOf(data, drawnSlugs),
    rows,
    signed,
    unsigned: rows.filter((row) => row.signedOff === null),
    submittalCount,
    quizCount: rows.filter((row) => row.quizAssessed !== null).length,
    distinctSources: [...distinct],
    span,
    generatedAt: input.generatedAt,
    digest: input.digest,
    facts,
    data,
  }
}

// ---------------------------------------------------------------------------
// Fragments. Every one of them takes already-escaped text or escapes at the
// boundary; none of them concatenates a raw reader string.
// ---------------------------------------------------------------------------

function renderMark(data: RecordData): string {
  const paths = markPaths(data.identity.mark ?? 'seeded', data.identity.markSeed)
  if (paths.length === 0) return ''
  const d = paths
    .map((path) => `<path d="${escAttr(path)}" />`)
    .join('')
  return (
    `<svg class="stamp" viewBox="${escAttr(MARK_VIEW_BOX)}" width="24" height="24" `
    + `aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1" `
    + `stroke-linecap="square">${d}</svg>`
  )
}

/**
 * §13.2 — the six standings, in curriculum order, measured off the ledger rows.
 *
 * The rows are the single source: they already resolved each sheet's sign-off
 * against the record, so counting them again here cannot disagree with the
 * ledger printed further down the page. Categories come from the sheets
 * themselves rather than from a list of six, because the corpus is what says
 * which subsystems exist and the set has gained a category before.
 */
function categoryStandings(rows: readonly LedgerRow[]): readonly CategoryStanding[] {
  const byCategory = new Map<string, CategoryStanding>()
  for (const row of rows) {
    const { categorySlug, categoryTitle, categoryOrder } = row.fact
    let entry = byCategory.get(categorySlug)
    if (entry === undefined) {
      entry = {
        slug: categorySlug,
        title: categoryTitle,
        order: categoryOrder,
        signed: 0,
        total: 0,
        drawn: 0,
        state: 'dormant',
      }
      byCategory.set(categorySlug, entry)
    }
    entry.total += 1
    if (row.fact.drawn) entry.drawn += 1
    if (row.signedOff !== null) entry.signed += 1
  }
  return [...byCategory.values()]
    .map((entry) => ({
      ...entry,
      state: faceStateFor({ approved: entry.signed, total: entry.total }),
    }))
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
}

/**
 * §13.7 — the role, and the path standing that goes with it.
 *
 * The stored role is untrusted input (§12.1.3): it reaches this file out of Web
 * Storage, or out of a file somebody hand-edited, so it is resolved against the
 * nine frozen ids and anything else answers as no role at all. `roleById`
 * returning `undefined` is therefore the same outcome as `role: null`, which is
 * the honest one — the document then says nothing about a role rather than
 * printing a string the reader never chose from.
 */
function roleStandingOf(
  data: RecordData,
  drawnSlugs: ReadonlySet<string>,
): RoleStanding | null {
  const role = roleById(data.identity.role)
  if (role === undefined) return null
  const path = pathFor(role.id)
  return {
    label: role.label,
    standing:
      path === undefined
        ? null
        : {
          signed: pathStanding(path, data, drawnSlugs).signed,
          drawn: drawnCount(path, drawnSlugs),
        },
  }
}

/**
 * §13.1.1 — the six hues, transcribed from `src/app/lokum.css`.
 *
 * **Transcribed, and it has to be.** This document has no stylesheet to import
 * and no network to fetch one over: it is opened from `file://` years later,
 * where anything not inlined is a broken asset. So the values are copied
 * verbatim, at full precision and unrounded — `0.115` halves to `0.0575` and
 * `0.085` to `0.0425`, and rounding either to the stylesheet's usual three
 * decimals would ship a colour nothing has measured (§13.1.2).
 * `tests/unit/color/lokum.test.ts` asserts `half.C === full.C / 2` over the
 * stylesheet's own values, and `tests/unit/record/report.test.ts` is the place
 * to assert this table against them so the copy cannot drift.
 *
 * `oklch()` in a browser that has never heard of it drops the declaration, and
 * the face or rule then falls back to the uncoloured drawing underneath — which
 * still reads, because §13.1.4's carriers are the line types, the hatch and the
 * printed counts, none of which are colour.
 */
export interface CategoryHue {
  full: string
  half: string
}

/**
 * §13.1.1's six hues, transcribed.
 *
 * This is the ONLY copy this document has. A RECORD OF WORK is opened from
 * `file://` with an opaque origin and no stylesheet to import, so the values
 * cannot be read from `lokum.css` at write time and cannot be linked at read
 * time — they have to be inlined, which means they have to be duplicated, which
 * means they can drift silently. A wrong hue here would be invisible: the
 * document would simply be a slightly different colour from the site, in a file
 * nobody can reissue.
 *
 * So it is EXPORTED, for one reason: `tests/unit/color/lokum.test.ts` parses
 * `src/app/lokum.css` and asserts this table against it, triple by triple. The
 * halves are exact rather than rounded to the stylesheet's usual three decimals
 * (`0.115` halves to `0.0575`), and that is checked too.
 */
export const CATEGORY_HUES: Readonly<Record<string, CategoryHue>> = {
  fundamentals: { full: 'oklch(0.605 0.150 350)', half: 'oklch(0.605 0.075 350)' },
  intermediate: { full: 'oklch(0.605 0.128 138)', half: 'oklch(0.605 0.064 138)' },
  expert: { full: 'oklch(0.605 0.130 288)', half: 'oklch(0.605 0.065 288)' },
  ecosystem: { full: 'oklch(0.605 0.098 200)', half: 'oklch(0.605 0.049 200)' },
  protocols: { full: 'oklch(0.605 0.115 54)', half: 'oklch(0.605 0.0575 54)' },
  optional: { full: 'oklch(0.605 0.085 100)', half: 'oklch(0.605 0.0425 100)' },
}

/**
 * One carrier rule per category, exactly as `lokum.css` writes it: the slug is
 * named once, and every rule after it paints with `--cat` / `--cat-half` and
 * never names a category again. The ledger's `data-band` is matched as well as
 * `data-cat`, because the in-document filter already tags every row with it and
 * a second attribute for the same fact is a second thing to keep true.
 */
const HUE_CARRIERS: string = Object.entries(CATEGORY_HUES)
  .map(([slug, hue]) =>
    `[data-cat="${slug}"],tr[data-band="${slug}"]{--cat:${hue.full};--cat-half:${hue.half}}`,
  )
  .join('\n')

/**
 * §13.2 — LKM-01 at 96px on the cover, its faces filled from the record.
 *
 * The same drawing as the header mark on the site, under the same rules: six
 * faces in one flat fill each, hidden-first paint order so §8.2's line types
 * hold (every hexagon edge divides a visible face from a hidden one and stays
 * solid; only the hidden Y is dashed), 45° section hatching on a completed
 * subsystem, and the seven sugar dots on the top face. No face, no eyes, no
 * limbs, no gradient, no voice, no animation (§8.5, §9.1).
 *
 * **State is an attribute here, not a class on `<html>`.** On the site the fill
 * arrives on channel A because the page is prerendered before the reader is
 * known; this document is generated FROM one reader's record, so the state is
 * known at write time and belongs in the markup. `data-state` is also what
 * keeps the drawing readable under `forced-colors`, where the fills go and the
 * line types and the hatch are what remain.
 *
 * `aria-hidden`, at 96 as at 28 (§12.18): the flavour ledger beside it is the
 * text that carries it.
 */
function renderCube(categories: readonly CategoryStanding[]): string {
  const state = new Map(categories.map((entry) => [entry.slug, entry.state]))
  const stateOf = (category: string): FaceState => state.get(category) ?? 'dormant'
  const spec = hatchSpec(96)

  // Hidden faces first, visible over them — §8.2's one invariant.
  const order = [...FACES.filter((face) => !face.visible), ...FACES.filter((face) => face.visible)]

  const pattern = (id: string, angle: number): string =>
    `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${spec.pitch}" `
    + `height="${spec.pitch}" patternTransform="rotate(${angle})">`
    + `<line x1="${spec.pitch / 2}" y1="0" x2="${spec.pitch / 2}" y2="${spec.pitch}" `
    + `stroke="var(--accent)" stroke-width="${spec.stroke}" /></pattern>`

  const hatched = order
    .filter((face) => stateOf(face.category) === 'complete')
    .map((face) =>
      `<path d="${escAttr(face.path)}" fill="url(#cube-h${face.visible ? 'v' : 'h'})" `
      + 'fill-opacity="0.88" />',
    )
    .join('')

  const faces = order
    .map((face) =>
      `<path class="cube-face" data-cat="${escAttr(face.category)}" `
      + `data-state="${escAttr(stateOf(face.category))}" d="${escAttr(face.path)}"`
      + (face.visible ? '' : ` stroke-dasharray="${escAttr(HIDDEN_DASH)}"`)
      + ' />',
    )
    .join('')

  const sugar = SUGAR
    .map(([cx, cy]) => `<circle class="cube-sugar" cx="${cx}" cy="${cy}" r="${SUGAR_R}" />`)
    .join('')

  return (
    `<svg class="cube" viewBox="${escAttr(VIEW_BOX)}" width="96" height="96" `
    + 'aria-hidden="true" focusable="false">'
    + `<defs>${pattern('cube-hv', 45)}${pattern('cube-hh', -45)}</defs>`
    + hatched
    + faces
    + sugar
    + '</svg>'
  )
}

/**
 * §13.2, §13.9 — the flavour ledger: six rows of real text beside the cube.
 *
 * This is what makes the drawing accessible, and it is the reason the SVG can
 * stay `aria-hidden`. Every row pairs the Turkish flavour name with the English
 * subsystem title, because a flavour name is a proper noun for a colour and
 * never stands alone (§13.9), and prints the count — so the hue is redundant
 * reinforcement rather than the carrier (SC 1.4.1).
 *
 * A face whose subsystem holds no sheets in this corpus prints dashes: the
 * count was taken and there was nothing to count, which is not the same as
 * zero sheets signed off out of seven (§11.25).
 */
function flavours(model: ReportModel): string {
/**
 * What the flavour legend prints in its SIGNED OFF column.
 *
 * Three answers, and each is a different fact:
 *   - no standing at all — the subsystem is not in this record: an em dash,
 *     §11.25's "cannot be derived".
 *   - nothing drawn — there are sheets, and none of them can be signed off yet:
 *     `NOT DRAWN`, the register's own word (§12.14.1).
 *   - otherwise the fraction, over DRAWN sheets.
 *
 * The site's `FaceLegend` decides this the same way. It cannot be shared — this
 * document is opened from `file://` and imports nothing — so the two are kept
 * deliberately identical instead, and this comment is the record of that.
 */
function flavourCount(entry: CategoryStanding | undefined): string {
  if (entry === undefined) return '—'
  if (entry.drawn <= 0) return 'NOT DRAWN'
  return `${entry.signed}/${entry.drawn}`
}

  const standing = new Map(model.categories.map((entry) => [entry.slug, entry]))
  const rows = FACES.map((face) => {
    const entry = standing.get(face.category)
    const swatch =
      `<i data-cat="${escAttr(face.category)}" `
      + `data-state="${escAttr(entry?.state ?? 'dormant')}" aria-hidden="true"></i>`
    return (
      '<tr>'
      + `<th scope="row">${swatch}${escText(FLAVOURS[face.category])}</th>`
      + `<td>${entry === undefined ? '—' : escText(entry.title)}</td>`
      + `<td class="num">${flavourCount(entry)}</td>`
      + '</tr>'
    )
  })
  return (
    '<table class="flavours"><caption>The six faces of the mark, the subsystem '
    + 'each one reports, and the sheets this record holds a sign-off for</caption>'
    + '<thead><tr><th scope="col">Flavour</th><th scope="col">Subsystem</th>'
    + '<th scope="col">Signed off</th></tr></thead>'
    + `<tbody>${rows.join('')}</tbody></table>`
  )
}

/**
 * §13.7 — block 1's two role rows, or nothing at all.
 *
 * `n of m sheets on the SOFTWARE ENGINEER path`, where m counts DRAWN steps
 * only (§13.4.2): 17 of the 32 sheets are drafts holding a topic list, they
 * carry no sign-off control at all, and a denominator that included them would
 * hand an employer a smaller-looking fraction of a longer list that nobody can
 * finish.
 *
 * With no role on record the rows are absent — not dashed. Every other row in
 * this block is a measurement, so a dash reads as a field left blank, and this
 * one was never asked (§13.3).
 */
function roleLines(model: ReportModel): string {
  const role = model.role
  if (role === null) return ''
  const line = `<dt>Role</dt><dd>${escText(role.label)} — stated by the reader</dd>`
  if (role.standing === null) return line
  const { signed, drawn } = role.standing
  return (
    line
    + `<dt>Path</dt><dd>${signed} of ${drawn} drawn sheet${drawn === 1 ? '' : 's'} on the `
    + `${escText(role.label)} path</dd>`
  )
}

/** Wrapped in `<bdi dir="auto">`: an RTL name must not reorder what surrounds it. */
function readerName(model: ReportModel): string {
  if (model.name === null || model.name.trim() === '') {
    return '<span class="dim">UNSIGNED</span>'
  }
  return `<bdi dir="auto">${escText(model.name)}</bdi>`
}

function date(instant: string | null): string {
  if (instant === null) return '—'
  // Sliced rather than formatted: `toLocaleDateString` follows the host, and a
  // document opened in another locale must not print a different date than the
  // one the ledger recorded.
  return escText(instant.slice(0, 10))
}

/**
 * §12.12.3 — all seven statements, declarative, in the document's own voice,
 * above the fold. Serious provenance systems name their limits precisely and
 * gain credibility for it; this block is the reason the rest of the document
 * can be believed at all.
 */
const LIMITS: readonly string[] = [
  'No issuing authority exists. No organisation assessed this reader.',
  'This is not a W3C Verifiable Credential. It carries no proof, no issuer key, '
  + 'no status list, no revocation and no verification endpoint.',
  'Every fact in it originates in one browser’s local storage and can be '
  + 'edited by anyone with developer tools.',
  'Timestamps come from the reader’s own device clock and are not attested '
  + 'by any authority.',
  'Repository URLs and commit hashes were entered by the reader. They were not '
  + 'fetched, resolved or checked.',
  'Quick Check answers are self-reported and unscored. No pass, fail, grade or '
  + 'mastery is claimed.',
  'The reader may have edited this file after it was generated.',
]

/**
 * §12.12.4 — the differentiator. No certificate tells its reader how to
 * distrust it, and this is the most respectable answer available to a document
 * that cannot be verified: route the attention to the evidence that can be.
 */
const HOW_TO_CHECK: readonly string[] = [
  'Open the criteria for each sheet and read what signing it off was supposed to require.',
  'Open every registered repository below.',
  'Resolve each commit hash and compare its authored date with the date in the ledger.',
  'If the repositories are empty, ignore the sheet tally entirely.',
  'Ask the holder to walk you through one repository.',
]

/** §12.12.1 — the permitted claim forms, filled from the model. */
function claims(model: ReportModel): string[] {
  const out: string[] = []
  out.push(
    `This record contains ${model.signed.length} of ${model.facts.sheets.length} `
    + 'sheets marked signed off, on the dates listed.',
  )
  if (model.quizCount > 0) {
    out.push(
      `${model.quizCount} quick check${model.quizCount === 1 ? ' was' : 's were'} `
      + 'answered; the answers are reproduced below.',
    )
  }
  if (model.distinctSources.length > 0) {
    out.push(
      `${model.distinctSources.length} distinct primary-source URL`
      + `${model.distinctSources.length === 1 ? ' was' : 's were'} opened from these `
      + 'sheets; they are listed.',
    )
  }
  if (model.submittalCount > 0) {
    out.push(
      `${model.submittalCount} repositor${model.submittalCount === 1 ? 'y was' : 'ies were'} `
      + 'registered against the sheets shown.',
    )
  }
  if (model.span !== null) {
    out.push(
      `The first and last marks in this record are ${model.span.days} `
      + `day${model.span.days === 1 ? '' : 's'} apart.`,
    )
  }
  return out
}

function ledger(model: ReportModel): string {
  const rows = model.rows.map((row) => {
    const state = !row.fact.drawn
      ? 'NOT DRAWN'
      : row.signedOff === null
        ? 'NOT SIGNED OFF'
        : 'SIGNED OFF'
    const quiz = row.quizAssessed === null
      ? '—'
      : row.quizAssessed === 'matched'
        ? 'MATCHED'
        : 'DID NOT MATCH'
    const rev = row.signedRevision === null
      ? '—'
      : row.drift === null
        ? escText(row.signedRevision)
        : `${escText(row.drift.signedAgainst)} <span class="dim">→ now ${escText(row.drift.nowAt)}</span>`
    return (
      `<tr data-band="${escAttr(row.fact.categorySlug)}"`
      + `${row.checkable ? ' class="checkable"' : ''}>`
      + `<td class="num">${String(row.fact.module).padStart(2, '0')}</td>`
      + `<th scope="row">${escText(row.fact.title)}</th>`
      + `<td>${escText(row.fact.categoryTitle)}</td>`
      + `<td class="state" data-state="${escAttr(state)}">${escText(state)}</td>`
      + `<td>${date(row.signedOff)}</td>`
      + `<td class="mono">${rev}</td>`
      + `<td>${escText(quiz)}</td>`
      + '</tr>'
    )
  })
  return (
    '<table class="ledger"><caption>Every sheet in the set, and what this record '
    + 'holds about it. A dashed state means the sheet has not been drawn yet.</caption>'
    + '<thead><tr><th scope="col">#</th><th scope="col">Sheet</th>'
    + '<th scope="col">Subsystem</th><th scope="col">State</th>'
    + '<th scope="col">Signed</th><th scope="col">Against rev.</th>'
    + '<th scope="col">Quick check</th></tr></thead>'
    + `<tbody>${rows.join('')}</tbody></table>`
  )
}

function evidence(model: ReportModel): string {
  if (model.submittalCount === 0) return ''
  const entries = model.rows.flatMap((row) =>
    row.submittals.map((submittal) => {
      // §12.9.2 — the RECONSTRUCTED url, as both href and label, so the link
      // text cannot lie about its destination and no query string, userinfo or
      // homograph host can reach the href.
      const url = escAttr(submittal.url)
      const label = escText(submittal.url)
      const commit = submittal.commit === null
        ? ''
        : `<p class="commit mono">commit ${escText(submittal.commit)} `
        + '<span class="dim">— supplied by reader; not fetched or verified by '
        + 'this application</span></p>'
      const note = submittal.note.trim() === ''
        ? ''
        : `<p class="note">${escText(submittal.note)}</p>`
      return (
        '<li class="entry">'
        + `<p class="eyebrow">SHEET ${String(row.fact.module).padStart(2, '0')} `
        + `· ${escText(row.fact.title)}</p>`
        + `<p class="repo mono"><a href="${url}" rel="noopener noreferrer" `
        + `target="_blank">${label}</a></p>`
        + note
        + commit
        + `<p class="dim">registered ${date(submittal.at)}</p>`
        + '</li>'
      )
    }),
  )
  return (
    '<section id="evidence"><h2>Evidence register</h2>'
    + '<p class="lede">The only content in this document a third party can check '
    + 'independently. Everything above is the reader’s own assertion.</p>'
    + `<ul class="entries">${entries.join('')}</ul></section>`
  )
}

function answers(model: ReportModel): string {
  const written = model.rows.filter(
    (row) => row.quizAnswer !== null && row.quizAnswer.trim() !== '',
  )
  if (written.length === 0) return ''
  const items = written.map((row) => (
    '<li class="entry">'
    + `<p class="eyebrow">SHEET ${String(row.fact.module).padStart(2, '0')} `
    + `· ${escText(row.fact.title)}</p>`
    + (row.fact.question === null
      ? ''
      : `<p class="question">${escText(row.fact.question)}</p>`)
    + `<blockquote>${escText(row.quizAnswer as string)}</blockquote>`
    + `<p class="dim">self-assessed: ${escText(row.quizAssessed ?? 'not assessed')} `
    + '— self-reported, unscored</p>'
    + '</li>'
  ))
  return (
    '<section id="answers"><h2>Quick check answers</h2>'
    + `<ul class="entries">${items.join('')}</ul></section>`
  )
}

function checklists(model: ReportModel): string {
  const withItems = model.rows.filter((row) => row.fact.checklistItems.length > 0)
  if (withItems.length === 0) return ''
  const blocks = withItems.map((row) => {
    const items = row.fact.checklistItems.map((text, index) => (
      `<li data-ticked="${row.checklistTicks[index] ? 'true' : 'false'}">`
      + `<span class="box" aria-hidden="true"></span>${escText(text)}</li>`
    ))
    return (
      '<li class="entry">'
      + `<p class="eyebrow">SHEET ${String(row.fact.module).padStart(2, '0')} `
      + `· ${escText(row.fact.title)}</p>`
      + `<ul class="checks">${items.join('')}</ul></li>`
    )
  })
  return (
    '<section id="checklists"><h2>Checklists</h2>'
    + '<p class="lede">Reader-ticked, unscored. The item text is reproduced so the '
    + 'list is readable without the curriculum in front of you.</p>'
    + `<ul class="entries">${blocks.join('')}</ul></section>`
  )
}

function sources(model: ReportModel): string {
  if (model.distinctSources.length === 0) return ''
  const items = model.distinctSources.map((url) => (
    `<li class="mono"><a href="${escAttr(url)}" rel="noopener noreferrer" `
    + `target="_blank">${escText(url)}</a></li>`
  ))
  return (
    '<section id="sources"><h2>Primary sources opened</h2>'
    + `<p class="lede">${model.distinctSources.length} distinct URL`
    + `${model.distinctSources.length === 1 ? '' : 's'} opened from the sheets in this `
    + 'record. Opened, not read — an outbound click is the only fact available.</p>'
    + `<ul class="urls">${items.join('')}</ul></section>`
  )
}

function notSigned(model: ReportModel): string {
  if (model.unsigned.length === 0) return ''
  const items = model.unsigned.map((row) => (
    `<li${row.fact.drawn ? '' : ' class="dim"'}>`
    + `<span class="mono">${String(row.fact.module).padStart(2, '0')}</span> `
    + escText(row.fact.title)
    + (row.fact.drawn ? '' : ' <span class="mono">· NOT DRAWN</span>')
    + '</li>'
  ))
  return (
    '<section id="not-signed"><h2>Not yet signed off</h2>'
    + '<p class="lede">Stated rather than omitted. A record that can only '
    + 'accumulate positives is not a record.</p>'
    + `<ul class="remaining">${items.join('')}</ul></section>`
  )
}

function criteria(model: ReportModel): string {
  const drawn = model.facts.sheets.filter((sheet) => sheet.drawn && sheet.objectives.length > 0)
  if (drawn.length === 0) return ''
  const blocks = drawn.map((sheet) => (
    '<li class="entry">'
    + `<p class="eyebrow">SHEET ${String(sheet.module).padStart(2, '0')} `
    + `· ${escText(sheet.title)}</p><ul class="objectives">`
    + sheet.objectives.map((line) => `<li>${escText(line)}</li>`).join('')
    + '</ul></li>'
  ))
  return (
    '<section id="criteria"><h2>What signing off required</h2>'
    + `<p class="lede">${escText(model.facts.assertion)} `
    + `The canonical list lives at <span class="mono">${escText(model.facts.criteriaUrl)}</span>.</p>`
    + `<ul class="entries">${blocks.join('')}</ul></section>`
  )
}

// ---------------------------------------------------------------------------
// The stylesheet.
//
// System fonts only: no webfont, no `@font-face`, no external stylesheet. The
// drawing-set identity reduced to what survives an unknown browser printing to
// an unknown printer — hairlines, zero radius, one accent, and state carried by
// line type and text so the page is fully legible in black and white. That is
// not a compromise here; `print-color-adjust` has no guarantee of doing
// anything, the reader can override it, and each engine decides for itself.
// ---------------------------------------------------------------------------

const STYLE = `
:root{--paper:#fbfaf7;--ink:#22252c;--muted:#5b6069;--faint:#9aa0a8;--line:#c9ccd1;--strong:#8b9098;--accent:#b8371a;--wash:#b8371a14;--sunken:#f2f0eb}
@media (prefers-color-scheme:dark){:root{--paper:#191b1f;--ink:#e9eaec;--muted:#a2a7ae;--faint:#6b7077;--line:#3a3d43;--strong:#71767d;--accent:#e2714d;--wash:#e2714d24;--sunken:#141519}}
:root[data-theme=light]{--paper:#fbfaf7;--ink:#22252c;--muted:#5b6069;--faint:#9aa0a8;--line:#c9ccd1;--strong:#8b9098;--accent:#b8371a;--wash:#b8371a14;--sunken:#f2f0eb}
:root[data-theme=dark]{--paper:#191b1f;--ink:#e9eaec;--muted:#a2a7ae;--faint:#6b7077;--line:#3a3d43;--strong:#71767d;--accent:#e2714d;--wash:#e2714d24;--sunken:#141519}
*{box-sizing:border-box}
html{color-scheme:light dark}
body{margin:0;padding:32px 24px 64px;background:var(--paper);color:var(--ink);font-family:ui-serif,Charter,Georgia,serif;font-size:16px;line-height:1.6}
.sheet{max-width:900px;margin:0 auto}
.mono,.eyebrow,.num,.state,.readout,.keys,code{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace}
.eyebrow,.readout{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
h1{margin:0 0 4px;font-family:ui-sans-serif,system-ui,"Helvetica Neue",Arial,sans-serif;font-size:34px;line-height:1.1;letter-spacing:-.02em;text-transform:uppercase}
h2{margin:40px 0 12px;padding-bottom:4px;border-bottom:1px solid var(--strong);font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;letter-spacing:.06em;text-transform:uppercase;font-weight:600}
p{margin:0 0 8px}
.lede{color:var(--muted);font-size:14px}
.dim{color:var(--faint)}
a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--strong);text-underline-offset:.12em}
a:hover{text-decoration-color:var(--accent)}
header.head{display:flex;align-items:flex-start;gap:16px;padding-bottom:16px;border-bottom:2px solid var(--strong)}
.stamp{flex:none;color:var(--muted)}
.who{font-family:ui-sans-serif,system-ui,sans-serif;font-size:20px}
dl.meta{display:grid;grid-template-columns:max-content 1fr;gap:2px 16px;margin:16px 0 0;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-variant-numeric:tabular-nums}
dl.meta dt{color:var(--muted)}
dl.meta dd{margin:0;overflow-wrap:anywhere}
.limits{margin:24px 0;padding:12px 16px;border-left:3px solid var(--strong);background:var(--sunken)}
.limits h2{margin-top:0;border:0;padding:0}
.limits ol,.check ol{margin:0;padding-left:20px}
.limits li,.check ol li{margin:0 0 6px;font-size:14px;color:var(--muted)}
.check{margin:24px 0;padding:12px 16px;border:1px solid var(--strong)}
.check .punch{margin:12px 0 0;font-family:ui-sans-serif,system-ui,sans-serif;font-weight:600;color:var(--ink)}
.claims li{margin:0 0 6px}
table{width:100%;border-collapse:collapse;font-size:13px}
caption{margin-bottom:8px;color:var(--muted);font-size:13px;text-align:left}
th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
thead th{border-bottom:1px solid var(--strong);font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:500}
td.num{width:32px;color:var(--faint);font-variant-numeric:tabular-nums}
td.state{white-space:nowrap;font-size:10px;letter-spacing:.06em}
td.state[data-state="NOT DRAWN"]{color:var(--faint)}
td.state[data-state="NOT SIGNED OFF"]{color:var(--muted)}
td.state[data-state="SIGNED OFF"]{color:var(--accent)}
tr.checkable{background:var(--wash)}
tr.checkable td.num::after{content:"\\2022";margin-left:4px;color:var(--accent)}
ul.entries,ul.urls,ul.remaining,ul.checks,ul.objectives{margin:0;padding:0;list-style:none}
li.entry{padding:10px 0;border-bottom:1px solid var(--line)}
.repo{margin:2px 0;font-size:13px;overflow-wrap:anywhere}
.commit{margin:2px 0;font-size:11px;letter-spacing:.04em;color:var(--muted)}
.note,.question{margin:4px 0;font-size:14px;color:var(--muted)}
blockquote{margin:6px 0;padding:8px 12px;border-left:2px solid var(--line);background:var(--sunken);font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}
ul.urls li,ul.remaining li{padding:3px 0;font-size:12px;overflow-wrap:anywhere}
ul.checks li{display:flex;gap:8px;padding:3px 0;font-size:14px;color:var(--muted)}
ul.checks li[data-ticked=true]{color:var(--ink)}
.box{flex:none;width:12px;height:12px;margin-top:5px;border:1px solid var(--strong)}
ul.checks li[data-ticked=true] .box{border-color:var(--accent);background:var(--wash);position:relative}
ul.checks li[data-ticked=true] .box::after{content:"";position:absolute;left:2px;top:5px;width:6px;height:3px;border-left:2px solid var(--accent);border-bottom:2px solid var(--accent);transform:rotate(-45deg)}
ul.objectives{padding-left:16px;list-style:disc}
ul.objectives li{font-size:14px;color:var(--muted)}
.legend{display:flex;flex-wrap:wrap;gap:16px;margin:16px 0;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.legend span{display:flex;align-items:center;gap:6px}
.legend i{width:24px;height:0;border-top:2px solid var(--strong)}
.legend i.d{border-top-style:dashed}
.legend i.a{border-top-color:var(--accent)}
.bar{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px}
button,select{height:28px;padding:0 10px;border:1px solid var(--strong);border-radius:0;background:var(--paper);color:var(--ink);font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
button:hover,select:hover{background:var(--sunken)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
footer{margin-top:48px;padding-top:12px;border-top:1px solid var(--strong);font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
tr[hidden],li[hidden]{display:none}
@media (forced-colors:active){
tr.checkable{background:Canvas}
td.state[data-state="SIGNED OFF"]{color:CanvasText;font-weight:700}
.box{border-color:CanvasText}
ul.checks li[data-ticked=true] .box{border-color:Highlight}
.legend i.a{border-top-color:Highlight}
}

/* §13 — the lokum palette, and the three places this document spends it: the
   cover mark's faces, the flavour ledger's swatches, and the ledger's
   per-category rule (§13.1.3 items 1 and 7). Nowhere else. Body text, the
   claims, the evidence register and the criteria stay ink-on-paper. */
${HUE_CARRIERS}
.cover{display:flex;flex-wrap:wrap;align-items:flex-start;gap:24px;margin:24px 0}
.cube{flex:none}
.cube-face{fill:none;stroke:var(--line);stroke-width:1}
.cube-face[data-state=started]{fill:var(--cat-half);stroke:var(--ink);stroke-width:1.5}
.cube-face[data-state=complete]{fill:var(--cat);stroke:var(--accent);stroke-width:1.5}
.cube-sugar{fill:var(--paper)}
table.flavours{width:auto;min-width:280px}
.flavours th[scope=row]{white-space:nowrap;font-weight:400}
.flavours td.num{width:auto;color:var(--muted);text-align:left}
.flavours i{display:inline-block;width:12px;height:12px;margin-right:6px;vertical-align:middle;border:1px solid var(--strong);background:transparent}
.flavours i[data-state=started]{background:var(--cat-half,var(--strong))}
.flavours i[data-state=complete]{background:var(--cat,var(--strong))}
.ledger tbody td.num{border-inline-start:2px solid var(--cat,var(--strong))}
/* §13.1.4 — every hue goes, and the drawing still reads: the cube keeps §8.2's
   line types and its hatch, the flavour ledger keeps its counts, and the
   ledger's rule falls back to the system's own ink. It is a second
   forced-colors block rather than an addition to the one above, and it has to
   be: these overrides sit AFTER the rules they override and match them
   selector for selector, because a later rule of equal or higher specificity
   would otherwise put the hue back for the readers who asked for no hue. */
@media (forced-colors:active){
.cube-face,.cube-face[data-state=started],.cube-face[data-state=complete]{fill:none}
.flavours i,.flavours i[data-state=started],.flavours i[data-state=complete]{background:Canvas;border-color:CanvasText}
.ledger tbody td.num{border-inline-start-color:CanvasText}
}
@page{size:A4;margin:14mm 12mm}
@media print{
body{padding:0;background:#fff;color:#000;font-size:11pt}
.bar,.no-print{display:none!important}
h2{margin-top:20pt}
li.entry,tr,section{break-inside:avoid;page-break-inside:avoid}
tr[hidden],li[hidden]{display:table-row}
a{text-decoration:none}
.repo a::after{content:""}
}
`

/**
 * The one classic inline script. No `type="module"` — module HTML over `file://`
 * fails with CORS errors and needs a server, so a module graph in a saved report
 * is dead on arrival. No storage of any kind either: `localStorage` throws
 * `SecurityError` under the `file:` scheme and its behaviour there is undefined
 * across browsers, so an unguarded access would leave a blank page in front of
 * an employer. Every control below is in-memory and resets on reload, which is
 * the correct behaviour for a record: the file is the state.
 */
const SCRIPT = `
(function(){
  var root=document.documentElement;
  var sel=document.getElementById('band');
  var rows=[].slice.call(document.querySelectorAll('.ledger tbody tr'));
  if(sel){sel.addEventListener('change',function(){
    var v=sel.value;
    rows.forEach(function(tr){
      tr.hidden = v!=='all' && tr.getAttribute('data-band')!==v;
    });
  });}
  var t=document.getElementById('theme');
  if(t){t.addEventListener('click',function(){
    var now=root.getAttribute('data-theme');
    if(!now){now=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
    root.setAttribute('data-theme', now==='dark'?'light':'dark');
  });}
  var p=document.getElementById('print');
  if(p){p.addEventListener('click',function(){window.print();});}
})();
`

// ---------------------------------------------------------------------------
// The document.
// ---------------------------------------------------------------------------

export function buildRecordOfWork(input: ReportInput): string {
  const model = buildModel(input)
  const who = readerName(model)
  const bands = [...new Map(
    model.facts.sheets.map((sheet) => [sheet.categorySlug, sheet.categoryTitle]),
  )]

  const envelope: Envelope = {
    schema: SCHEMA_VERSION,
    savedAt: model.generatedAt,
    data: model.data,
  }

  // The band names the in-document filter offers come from the same map the
  // ledger rows are tagged with, so the two cannot disagree.
  const ledgerHtml = ledger(model)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escText(model.title)} — ${escText(model.facts.curriculumName)}</title>
<meta name="robots" content="noindex">
<style>${STYLE}</style>
</head>
<body>
<div class="sheet">

<header class="head">
${model.markSvg}
<div>
<p class="eyebrow">${escText(model.title)} · self-attested · no issuing authority</p>
<h1>${escText(model.facts.curriculumName)}</h1>
<p class="who">${who}</p>
</div>
</header>

<dl class="meta">
<dt>Signed off</dt><dd>${model.signed.length} / ${model.facts.sheets.length}</dd>
<dt>To go</dt><dd>${model.unsigned.length}</dd>${roleLines(model)}
<dt>Repositories</dt><dd>${model.submittalCount}</dd>
<dt>Sources opened</dt><dd>${model.distinctSources.length}</dd>
<dt>Generated</dt><dd>${escText(model.generatedAt)}</dd>
<dt>Content digest</dt><dd>${escText(model.digest)}</dd>
<dt>Status</dt><dd>UNSIGNED — self-attested</dd>
</dl>

<section class="cover">
${model.cubeSvg}
${flavours(model)}
</section>

<div class="bar no-print">
<label class="eyebrow" for="band">Subsystem</label>
<select id="band"><option value="all">ALL</option>${bands
  .map(([slug, title]) => `<option value="${escAttr(slug)}">${escText(title)}</option>`)
  .join('')}</select>
<button id="theme" type="button">Theme</button>
<button id="print" type="button">Print / save as PDF</button>
</div>

<section class="limits">
<h2>Status and limits</h2>
<ol>${LIMITS.map((line) => `<li>${escText(line)}</li>`).join('')}</ol>
</section>

<section id="claims">
<h2>What this record says</h2>
<ul class="claims">${claims(model).map((line) => `<li>${escText(line)}</li>`).join('')}</ul>
<p class="dim">The digest above proves this file has not changed since it was
generated. It proves nothing about the facts inside it.</p>
</section>

<section id="ledger">
<h2>Sheet ledger</h2>
<div class="legend">
<span><i></i>signed off</span>
<span><i class="d"></i>not yet drawn</span>
<span><i class="a"></i>signed off with a registered repository and commit</span>
</div>
${ledgerHtml}
</section>

${evidence(model)}
${notSigned(model)}
${answers(model)}
${checklists(model)}
${sources(model)}
${criteria(model)}

<section class="check">
<h2>How to check this</h2>
<ol>${HOW_TO_CHECK.map((line) => `<li>${escText(line)}</li>`).join('')}</ol>
<p class="punch">Nothing in this document should change your hiring decision.
The repositories might.</p>
</section>

<footer>
<p>${escText(model.title)} · generated in the reader’s browser from local
data · ${escText(model.facts.curriculumName)}</p>
<p>This file carries its own record. It can be imported back into the site to
restore this state in another browser.</p>
</footer>

</div>
<script id="hl-record" type="application/json">${escJsonForScript(envelope)}</script>
<script>${SCRIPT}</script>
</body>
</html>
`
}

/** The §12.12.1 filename: a fixed ASCII template, never the reader's name. */
export function recordFilename(generatedAt: string, hasSubmittals: boolean): string {
  const day = generatedAt.slice(0, 10)
  return `${hasSubmittals ? 'record-of-work' : 'reading-record'}-${day}.html`
}

/** §12.12.7's budget, asserted by test rather than hoped for. */
export const REPORT_BUDGET_BYTES = 250 * 1024

export function reportBytes(html: string): number {
  return new TextEncoder().encode(html).length
}
