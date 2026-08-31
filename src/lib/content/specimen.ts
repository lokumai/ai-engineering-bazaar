/**
 * §12.13 — the specimen record, generated from labelled sample data.
 *
 * The `RECORD OF WORK` is the artefact this whole slice exists to produce, and
 * until a reader has signed something off they cannot see one. The two obvious
 * answers are both refused by §1: generating a document from their empty record
 * shows a form with no content in it, and generating one from invented reader
 * state presents somebody else's work as theirs. So the specimen is built from
 * sample data that **says it is sample data in the field the document prints
 * first** — the name — and is offered under a stamp rather than as a preview of
 * the reader.
 *
 * **Built at build time, on the server, with no reader state at all.** That is
 * what makes the page reachable forever and correct in frame one: there is
 * nothing here for channel B to fill in, because none of it is about the reader
 * (§12.2). It reaches `node:fs` through `report-facts.ts`, so like every other
 * module in this directory it can never be imported by a client component.
 *
 * **The facts are the real corpus.** `reportFacts()` supplies all 32 sheets,
 * their objectives, their questions and their checklist item text, so the
 * specimen is a genuine artefact of this curriculum rather than a mock-up of
 * one — and the slugs the sample data writes against are read out of the corpus
 * rather than typed, so it can never reference a sheet that does not exist
 * (§12.1.3).
 *
 * **The sample values are typed, deliberately, and that is not §11.25's
 * failure.** §11.25 forbids inventing a measurement; these are not
 * measurements. A specimen's job is to be obviously fictional: the drafter is
 * `A. DRAFTER`, every repository is under GitHub's `example` owner, every
 * source URL is under an RFC 2606 reserved domain, and the generation instant
 * is a fixed sample instant rather than the build clock — which also keeps the
 * emitted page byte-identical build to build, the same property §12.10 requires
 * of the dashboard.
 */

import { createHash } from 'node:crypto'
import { reportFacts } from './report-facts'
import {
  addSubmittal,
  assessQuiz,
  mintMarkSeed,
  recordSourceOpened,
  setChecklistItem,
  setIdentity,
  setQuizAnswer,
  signOff,
} from '../record/events'
import {
  buildRecordOfWork,
  canonicalRecordJson,
  recordFilename,
  reportBytes,
  type ReportFacts,
  type ReportSheetFact,
} from '../record/report'
import { EMPTY_RECORD, type RecordData } from '../record/schema'
import { SITE_ORIGIN } from '../site-origin'

/**
 * §12.13 — `stamped SPECIMEN — NOT YOUR RECORD`. One string, used by the page's
 * own stamp and carried inside the document by the sample name, so the artefact
 * cannot be separated from the label the moment it is saved to disk.
 */
export const SPECIMEN_STAMP = 'SPECIMEN — NOT YOUR RECORD'

/**
 * The name the document prints in its header, beside the drafter's mark.
 *
 * §12.12.1 puts the name as typed at the top of the file, which makes it the
 * one field that is unmissable in every context the document is read in —
 * on screen, printed, and in a print preview's first page. `buildRecordOfWork`
 * is fixed vocabulary (37 tests) and grows no specimen mode, so the stamp
 * travels in the sample data instead. That is the honest place for it anyway:
 * the header is asserting who checked these sheets, and the answer is nobody.
 */
export const SPECIMEN_NAME = `A. DRAFTER — ${SPECIMEN_STAMP}`

/**
 * Fixed sample instants, 41 days apart end to end, so the document's own span
 * claim — "the first and last marks in this record are 41 days apart" — has
 * something true to say about the sample. Seven of them, because §12.12.1's
 * worked example is seven sheets and because a specimen with one row in it
 * shows none of the shapes the ledger can take.
 */
const SPECIMEN_MARKS: readonly string[] = [
  '2026-07-21T09:12:00.000Z',
  '2026-07-24T18:05:00.000Z',
  '2026-07-30T08:44:00.000Z',
  '2026-08-06T20:15:00.000Z',
  '2026-08-13T07:38:00.000Z',
  '2026-08-22T19:02:00.000Z',
  '2026-08-31T16:40:00.000Z',
]

/** The instant the specimen states it was generated at. Sample, not the clock. */
const SPECIMEN_GENERATED_AT = '2026-08-31T17:00:00.000Z'

/**
 * §12.4.3 — one sheet is signed against a revision it has since moved past, so
 * the specimen shows the drift line. No other LMS prints this, it is the
 * sharpest thing in the document, and a specimen that omitted it would
 * misrepresent what a reader's own record looks like once the corpus moves.
 * Seven zeros because a specimen's hash should read as a placeholder to
 * anybody who has ever seen a short hash.
 */
const SPECIMEN_STALE_REVISION = '0000000'

/** §12.3.5 — 8 lowercase hex. Minted once for a reader; typed once for a specimen. */
const SPECIMEN_MARK_SEED = '3c7f10ab'

export interface SpecimenDocument {
  /** The whole self-contained document. Never rendered into a page's DOM. */
  html: string
  /** `specimen-record-of-work-2026-08-31.html` (§12.12.1 + the stamp). */
  filename: string
  /** §12.12.7's budget, measured rather than assumed. */
  bytes: number
  generatedAt: string
  /** SHA-256 of the canonical sample record, hex. */
  digest: string
  /** The sample record itself, so the page can print what is in the file. */
  data: RecordData
  /** How many sheets the sample signs off, and out of how many — both counted. */
  signedOff: number
  of: number
  /** §12.9 — repositories registered, which is what titles the document. */
  repositories: number
  /** §12.8 — distinct URLs opened, deduped the way the header count dedupes. */
  sources: number
}

/**
 * The sample record, written against slugs read out of the corpus.
 *
 * Built through the same reducers a reader's own acts go through, rather than
 * as an object literal: the reducers are what enforce the record's invariants —
 * distinct sources, three submittals per sheet, a reconstructed repository URL,
 * `days` sorted and deduped — so a specimen assembled any other way could carry
 * a shape no reader could ever produce, which is the one thing a specimen must
 * not do.
 */
function sampleRecord(facts: ReportFacts): RecordData {
  const drawn = [...facts.sheets]
    .filter((sheet) => sheet.drawn)
    .sort((a, b) => a.module - b.module)
  const marked = drawn.slice(0, SPECIMEN_MARKS.length)

  let data = setIdentity(EMPTY_RECORD, { name: SPECIMEN_NAME }, SPECIMEN_MARKS[0])
  data = mintMarkSeed(data, SPECIMEN_MARK_SEED, SPECIMEN_MARKS[0])

  marked.forEach((sheet, index) => {
    const at = SPECIMEN_MARKS[index]
    // The third mark drifts; every other one is signed against the revision
    // the sheet is at now, which is what a fresh sign-off records.
    const revision = index === 2 ? SPECIMEN_STALE_REVISION : sheet.revision
    data = signOff(data, sheet.slug, revision, at)
  })

  // §12.6 — both outcomes, because `DID NOT MATCH` is a first-class value and a
  // specimen showing only `MATCHED` would read as a scoreboard.
  const asked = marked.filter((sheet) => sheet.question !== null)
  const answers: ReadonlyArray<{ answer: string; assessed: 'matched' | 'missed' }> = [
    {
      answer:
        'Specimen answer. A reader writes their own recall here before they '
        + 'compare it with the sheet’s summary; nothing on this site marks it.',
      assessed: 'matched',
    },
    {
      answer:
        'Specimen answer. This one was recorded as not matching the sheet, '
        + 'which costs nothing and can be retried.',
      assessed: 'missed',
    },
  ]
  asked.slice(0, answers.length).forEach((sheet, index) => {
    const at = SPECIMEN_MARKS[index]
    data = setQuizAnswer(data, sheet.slug, answers[index].answer, at)
    data = assessQuiz(data, sheet.slug, answers[index].assessed, at)
  })

  // §12.7 — the item text is reproduced in the document, so the specimen ticks
  // some of it and leaves the rest, which is the state a reader is usually in.
  const withChecklist = drawn.find((sheet) => sheet.checklistItems.length > 0)
  if (withChecklist) {
    const ticked = Math.max(1, withChecklist.checklistItems.length - 2)
    for (let index = 0; index < ticked; index += 1) {
      data = setChecklistItem(data, withChecklist.slug, index, true, SPECIMEN_MARKS[4])
    }
  }

  // §12.8 — evidence, not currency. RFC 2606 reserved hosts, so a reviewer who
  // opens one lands somewhere that is obviously not a primary source.
  const sources: readonly string[] = [
    'https://example.org/specimen/spec-one',
    'https://example.org/specimen/spec-two',
    'https://example.com/specimen/reference',
  ]
  marked.slice(0, 2).forEach((sheet, index) => {
    for (const url of sources.slice(index)) {
      data = recordSourceOpened(data, sheet.slug, url, SPECIMEN_MARKS[index])
    }
  })

  // §12.9 — the strongest evidence the record ever holds, and the reason the
  // specimen is titled RECORD OF WORK rather than READING RECORD. One entry
  // carries a commit hash and one does not, because the document prints those
  // two states differently and both are ordinary.
  const submittals = marked.slice(0, 2)
  if (submittals[0]) {
    data = addSubmittal(data, submittals[0].slug, {
      owner: 'example',
      repo: 'specimen-agent-harness',
      url: 'https://github.com/example/specimen-agent-harness',
      commit: '9f2c1ab',
      note: 'Specimen entry. Sample data, not a record of anyone’s work.',
      at: SPECIMEN_MARKS[1],
    }, SPECIMEN_MARKS[1])
  }
  if (submittals[1]) {
    data = addSubmittal(data, submittals[1].slug, {
      owner: 'example',
      repo: 'specimen-retrieval-eval',
      url: 'https://github.com/example/specimen-retrieval-eval',
      commit: null,
      note: 'Specimen entry with no commit hash, so the register shows that state too.',
      at: SPECIMEN_MARKS[3],
    }, SPECIMEN_MARKS[3])
  }

  return data
}

let cache: SpecimenDocument | null = null

/**
 * Cached in a module-level `let` like every other derive in this directory: a
 * static export renders every page in one process, and building the document
 * costs a full string template over 32 sheets.
 *
 * The digest is computed with `node:crypto` rather than `crypto.subtle` so this
 * stays synchronous — the value is the same SHA-256 over the same canonical
 * JSON that `ReportPanel` computes in the browser (§12.12.5), and a synchronous
 * derive keeps the page a plain server component that a `renderToStaticMarkup`
 * test can reach.
 */
export function specimenDocument(): SpecimenDocument {
  if (cache) return cache

  const facts = reportFacts(SITE_ORIGIN)
  const data = sampleRecord(facts)
  const digest = createHash('sha256').update(canonicalRecordJson(data), 'utf8').digest('hex')
  const html = buildRecordOfWork({
    data,
    facts,
    generatedAt: SPECIMEN_GENERATED_AT,
    digest,
  })

  const sheets = Object.values(data.sheets)
  const submittals = sheets.reduce((sum, sheet) => sum + sheet.submittals.length, 0)
  const sources = new Set(sheets.flatMap((sheet) => sheet.sources))

  cache = {
    html,
    // §12.12.1's template is fixed ASCII and owns the stem; the prefix is this
    // module's, because a file that leaves the browser under a name a reader
    // cannot tell from their own record is the one thing the stamp cannot fix.
    filename: `specimen-${recordFilename(SPECIMEN_GENERATED_AT, submittals > 0)}`,
    bytes: reportBytes(html),
    generatedAt: SPECIMEN_GENERATED_AT,
    digest,
    data,
    signedOff: countSigned(data, facts.sheets),
    of: facts.sheets.length,
    repositories: submittals,
    sources: sources.size,
  }
  return cache
}

/** Counted the way the document counts, over the corpus rather than the record. */
function countSigned(data: RecordData, sheets: readonly ReportSheetFact[]): number {
  return sheets.filter((sheet) => (data.sheets[sheet.slug]?.signedOff ?? null) !== null).length
}
