/**
 * §12.12 — the build-time half of the `RECORD OF WORK`.
 *
 * `lib/record/report.ts` renders the document and is pure and fs-free, because
 * it runs in the reader's browser. This module is its counterpart: it walks the
 * corpus at build time and hands over the facts the document reprints. It
 * imports `node:fs` transitively through the loader, so **it can never be
 * reached from a client component** (§12.2). A page computes it on the server
 * and passes the result down as a prop.
 *
 * The shape is deliberately richer than `CurriculumFacts`, which exists to feed
 * a readout and is kept small because it is serialised into all 44 pages. This
 * one is serialised into exactly one, and it carries text:
 *
 *  - the **objectives**, because §12.12.2 reprints what signing off was
 *    supposed to require, and a tally of sheets means nothing to a reviewer who
 *    cannot see the criteria;
 *  - the **question**, because §12.12 prints it beside the reader's own answer,
 *    and an answer with no question above it is unreadable a year later;
 *  - the **checklist item text**, because §12.7's own note is that reproducing
 *    the text turns a soft self-report into something an interviewer can probe,
 *    where a count would read as a score.
 *
 * Everything here is derived from the file (§11.25). Nothing is hand-maintained,
 * and the one value that is not a measurement — the assertion sentence — comes
 * from `criteria.ts`, which owns it for both the sheet and the document.
 *
 * ## §13.7 — what the cover and the role line needed from here, which was nothing
 *
 * §13.7 gave the document three things: LKM-01 at 96px with its faces filled
 * from the record, a flavour ledger beside it, and the role with its path
 * standing. None of them widened this shape, and that is worth stating rather
 * than leaving a reader to wonder where the new field went:
 *
 *  - the **cover mark and the flavour ledger** need each subsystem's title, its
 *    sheet count and how many of those sheets the record holds a sign-off for.
 *    `categorySlug`, `categoryTitle` and `categoryOrder` are already on every
 *    sheet fact, so the six standings are grouped out of the same rows the
 *    ledger is printed from — one derivation, which is what stops the cover and
 *    the ledger disagreeing (§11.25);
 *  - the **six hue values** cannot come from here at all. They live in
 *    `src/app/lokum.css`, the document has no stylesheet to import over
 *    `file://`, and a colour is not a fact about the corpus;
 *  - the **role and the path** come from the record and from `lib/path/`, which
 *    is plain fs-free data that `report.ts` reads directly. Routing a path
 *    through this module would mean the document's own honesty rule — the
 *    denominator counts drawn steps only (§13.4.2) — had two places to live.
 *
 * So the one thing this file must keep doing is measuring `drawn` off the
 * sheet's own frontmatter, because that flag is what every draft treatment in
 * the document is drawn from.
 */

import { checklistOf } from './checklist'
import { SIGN_OFF_ASSERTION } from './criteria'
import { loadAllModules } from './loader'
import { quickCheckOf } from './quickcheck'
import { SITE_NAME } from '../site'
import { href } from '../url'
import type { ReportFacts, ReportSheetFact } from '../record/report'

/**
 * Where a reviewer can read the criteria for themselves.
 *
 * `SHEET 00` is the legend, and §12.12.4's first instruction sends the reviewer
 * there. Built through `href()` because the site is served from a sub-path on
 * GitHub Pages and a hardcoded path is a 404 in production that works fine
 * locally — the worst kind of bug, and the reason `lib/url.ts` exists.
 *
 * Absolute, because this string is printed inside a file that will be opened
 * from `file://` on somebody else's machine, where a site-relative path
 * resolves against their filesystem.
 */
export const CRITERIA_PATH = '/legend/'

let cache: ReportFacts | null = null

/**
 * Cached in a module-level `let` like every other derive in this directory: a
 * static export renders every page in one process, and the loader has already
 * walked the corpus by the time this is asked for.
 */
export function reportFacts(origin: string): ReportFacts {
  if (cache && cache.criteriaUrl.startsWith(origin)) return cache

  const sheets: ReportSheetFact[] = loadAllModules().map((m) => {
    const question = quickCheckOf(m.body)
    return {
      slug: m.slug,
      module: m.frontmatter.module,
      title: m.frontmatter.title,
      categorySlug: m.category.slug,
      categoryTitle: m.category.title,
      categoryOrder: m.category.order,
      drawn: m.frontmatter.status === 'ready',
      // §12.4.3 — the hash a sign-off is compared against. `null` on a sheet
      // git has never touched, and the drift line is then absent rather than
      // claiming a comparison it could not make.
      revision: m.revision?.hash ?? null,
      // Copied, not aliased: the loader caches every module for the life of the
      // build, so handing over the live array would let one page's edit change
      // what another prints.
      objectives: [...m.frontmatter.objectives],
      question: question?.question ?? null,
      checklistItems: checklistOf(m.body).map((item) => item.text),
    }
  })

  cache = {
    sheets,
    curriculumName: SITE_NAME,
    criteriaUrl: `${origin}${href(CRITERIA_PATH)}`,
    assertion: SIGN_OFF_ASSERTION,
  }
  return cache
}
