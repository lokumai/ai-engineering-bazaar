import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  DocumentDownload,
  REPORT_LIMITS,
  ReportPanel,
  digestOf,
  digestText,
  reportPreview,
} from '@/components/record/ReportPanel'
import LegendPage from '@/app/legend/page'
import SpecimenPage from '@/app/legend/specimen/page'
import ReportPage from '@/app/report/page'
import { signedCount, tally, type CurriculumFacts } from '@/lib/record/derive'
import {
  buildRecordOfWork,
  canonicalRecordJson,
  recordFilename,
  type ReportFacts,
  type ReportSheetFact,
} from '@/lib/record/report'
import { EMPTY_RECORD, type RecordData } from '@/lib/record/schema'
import {
  addSubmittal,
  assessQuiz,
  recordSourceOpened,
  setIdentity,
  setQuizAnswer,
  signOff,
} from '@/lib/record/events'

/**
 * §12.12, §12.13 — `/report/`, `SHEET 00` and the specimen, as server markup.
 *
 * `renderToStaticMarkup` on the HTML string, with no jsdom, no Testing Library
 * and no new dependency (§12.14.2). What that pins is the thing worth pinning:
 * **the honest empty first frame.** `useSyncExternalStore` returns the frozen
 * `EMPTY_RECORD` here for the same reason it does in the browser's first render,
 * so every assertion about the panel below is an assertion about the prerender a
 * reader actually receives — no counts, no digest, no byte measurement, and an
 * export control that still works.
 *
 * Two of these describe duplication rather than behaviour, and they are the most
 * valuable tests in the file. §12.12.3's seven statements exist twice, once in
 * `report.ts` (which does not export them) and once on the page that offers the
 * file; and the preview's counts exist twice, once in the document's own model
 * and once in `reportPreview`. Both duplications are deliberate — the page has
 * to state the disclaimer before the control, and the page must not build a
 * whole document on every render to count to seven — and both are asserted
 * equal to the generated document here, so a drift is a test failure rather than
 * something a reviewer has to spot.
 *
 * Real interaction, real storage, a real digest from Web Crypto, the save
 * dialog and the saved file reopened from `file://` are Playwright's, in real
 * Chrome.
 */

const AT = '2026-08-14T09:00:00.000Z'
const GENERATED = '2026-08-31T12:00:00.000Z'
const DIGEST = 'a'.repeat(64)

/** Eight sheets, six drawn: enough for a ledger, a draft and an empty band. */
function sheet(module: number): ReportSheetFact {
  const drawn = module <= 6
  return {
    slug: `band/sheet-${module}`,
    module,
    title: `Sheet ${module}`,
    categorySlug: module <= 4 ? 'fundamentals' : 'intermediate',
    categoryTitle: module <= 4 ? 'Fundamentals' : 'Intermediate',
    categoryOrder: module <= 4 ? 1 : 2,
    drawn,
    revision: drawn ? 'a1b2c3d' : null,
    objectives: drawn ? [`Explain thing ${module}`] : [],
    question: drawn ? `What is thing ${module}?` : null,
    checklistItems: module === 3 ? ['Rotate the token', 'Scope the grant'] : [],
  }
}

const FACTS: ReportFacts = {
  sheets: Array.from({ length: 8 }, (_, i) => sheet(i + 1)),
  curriculumName: 'AI Engineering Bazaar',
  criteriaUrl: 'https://lokumai.github.io/ai-engineering-bazaar/legend/',
  assertion: 'Signing off is your own assertion that you have read this sheet.',
}

/**
 * The same corpus in the counts shape, derived from the fixture above rather
 * than typed a second time — which is exactly what the page does with
 * `reportFacts()` and `curriculumFacts()` over the real corpus.
 */
const COUNTS: CurriculumFacts = {
  sheets: FACTS.sheets.map((fact) => ({
    slug: fact.slug,
    module: fact.module,
    category: fact.categorySlug,
    drawn: fact.drawn,
    hasQuickCheck: fact.question !== null,
    checklistItems: fact.checklistItems.length,
    sources: 0,
  })),
  // `CurriculumFacts` carries only what a selector counts with: the slug and
  // the denominator. The titles live in `ReportFacts`, which is the shape that
  // has to print them.
  categories: [
    { slug: 'fundamentals', total: 4 },
    { slug: 'intermediate', total: 4 },
  ],
  traces: 0,
}

/** A record with something in every field the preview reports. */
function fullRecord(): RecordData {
  let data = setIdentity(EMPTY_RECORD, { name: 'Ada Lovelace' }, AT)
  data = signOff(data, 'band/sheet-1', 'a1b2c3d', AT)
  data = signOff(data, 'band/sheet-2', 'a1b2c3d', AT)
  data = setQuizAnswer(data, 'band/sheet-2', 'Because the window is finite.', AT)
  data = assessQuiz(data, 'band/sheet-2', 'matched', AT)
  data = recordSourceOpened(data, 'band/sheet-1', 'https://example.org/spec', AT)
  data = recordSourceOpened(data, 'band/sheet-2', 'https://example.org/other', AT)
  // The same URL twice, so `sources` is asserted to be DISTINCT (§12.8).
  data = recordSourceOpened(data, 'band/sheet-2', 'https://example.org/spec', AT)
  data = addSubmittal(data, 'band/sheet-2', {
    owner: 'cevheri',
    repo: 'agent-harness',
    url: 'https://github.com/cevheri/agent-harness',
    commit: '9f2c1ab',
    note: 'A harness that runs the checklist against a repository.',
    at: AT,
  }, AT)
  return data
}

function words(markup: string): string {
  return markup.replace(/<[^>]*>/g, ' ')
}

// ---------------------------------------------------------------------------

describe('reportPreview — what the file will say (§12.12.1, §12.12.2)', () => {
  it('degrades to READING RECORD with no repository registered', () => {
    const preview = reportPreview(EMPTY_RECORD, COUNTS)
    expect(preview.title).toBe('READING RECORD')
    expect(preview).toMatchObject({
      signed: 0,
      toGo: 8,
      of: 8,
      repositories: 0,
      sources: 0,
      quickChecks: 0,
    })
  })

  it('becomes a RECORD OF WORK the moment a repository is registered', () => {
    expect(reportPreview(fullRecord(), COUNTS).title).toBe('RECORD OF WORK')
  })

  it('counts with the same selectors the rest of the site counts with', () => {
    const data = fullRecord()
    const preview = reportPreview(data, COUNTS)
    const counted = signedCount(data, COUNTS)
    const totals = tally(data)

    expect(preview.signed).toBe(counted.signed)
    expect(preview.toGo).toBe(counted.toGo)
    expect(preview.of).toBe(counted.of)
    // The erase dialog's own tally, over the same record: the page cannot be
    // offering to export three repositories while offering to erase two.
    expect(preview.repositories).toBe(totals.submittals)
    expect(preview.sources).toBe(totals.sources)
    expect(preview.quickChecks).toBe(totals.quizzes)
  })

  it('agrees with the document’s own header block, value for value', () => {
    const data = fullRecord()
    const preview = reportPreview(data, COUNTS)
    const html = buildRecordOfWork({ data, facts: FACTS, generatedAt: GENERATED, digest: DIGEST })

    expect(html).toContain(`<dt>Signed off</dt><dd>${preview.signed} / ${preview.of}</dd>`)
    expect(html).toContain(`<dt>To go</dt><dd>${preview.toGo}</dd>`)
    expect(html).toContain(`<dt>Repositories</dt><dd>${preview.repositories}</dd>`)
    expect(html).toContain(`<dt>Sources opened</dt><dd>${preview.sources}</dd>`)
    expect(html).toMatch(new RegExp(`<title>[^<]*${preview.title}[^<]*</title>`))
    expect(html).toContain(`${preview.quickChecks} quick check`)
  })
})

describe('the digest (§12.12.5)', () => {
  it('is a real SHA-256 over the canonical record, in hex', async () => {
    // Node 24 ships the same Web Crypto the browser does, so this is the
    // production code path rather than a stand-in for it.
    const hex = await digestOf(canonicalRecordJson(EMPTY_RECORD))
    expect(hex).toMatch(/^[0-9a-f]{64}$/)
    // The same record hashes the same, and a different one does not.
    expect(await digestOf(canonicalRecordJson(EMPTY_RECORD))).toBe(hex)
    expect(await digestOf(canonicalRecordJson(fullRecord()))).not.toBe(hex)
  })

  it('is absent rather than faked where Web Crypto is not there', () => {
    // The document prints the absence in the field the digest would have
    // occupied. A plausible-looking hash there is the one lie in this system
    // that tooling would consume.
    expect(digestText({ kind: 'absent' })).toMatch(/NOT COMPUTED/)
    expect(digestText({ kind: 'absent' })).not.toMatch(/[0-9a-f]{16}/)
    expect(digestText({ kind: 'ready', hex: DIGEST })).toBe(DIGEST)
  })
})

describe('ReportPanel — the honest empty frame (§12.2, §12.13)', () => {
  const markup = renderToStaticMarkup(<ReportPanel facts={FACTS} counts={COUNTS} />)

  it('renders unhydrated, and says so in the markup', () => {
    expect(markup).toContain('data-hydrated="false"')
  })

  it('takes no reading it has not taken: every value is an em dash', () => {
    // Eight rows — title, signed off, to go, repositories, sources, quick
    // checks, filename, bytes — plus the digest. None of them is knowable in a
    // document prerendered once for every reader.
    expect(markup.match(/<dd[^>]*>—<\/dd>/g) ?? []).toHaveLength(8)
    expect(words(markup)).not.toMatch(/\b0 \/ 8\b/)
    expect(markup).not.toContain('data-hydrated="true"')
  })

  it('never suppresses a hydration warning on a readout (§12.2)', () => {
    expect(markup).not.toContain('suppressHydrationWarning')
  })

  it('keeps the export control live at zero data (§12.13)', () => {
    // A disabled control with no stated reason is a page asserting a state the
    // reader cannot verify. The document states the truth instead.
    expect(markup).toContain('DOWNLOAD')
    expect(markup).not.toContain('disabled')
    expect(markup).not.toContain('aria-disabled')
  })

  it('states all seven limits above the control that produces them (§12.12.3)', () => {
    for (const line of REPORT_LIMITS) expect(words(markup)).toContain(line)
    expect(markup.indexOf('Status and limits')).toBeLessThan(markup.indexOf('DOWNLOAD'))
  })

  it('never renders the generated document into the page (§12.12.7)', () => {
    expect(markup).not.toContain('<!DOCTYPE')
    expect(markup).not.toContain('<iframe')
    expect(markup).not.toContain('srcdoc')
    expect(markup).not.toContain('<script')
  })
})

/**
 * §12.12.3 exists twice on purpose — in the document and on the page above the
 * control — and `report.ts` does not export its copy. This is the assertion
 * that turns the duplication into something a test fails on.
 */
describe('the page’s limits are the document’s limits, verbatim', () => {
  const html = buildRecordOfWork({
    data: EMPTY_RECORD,
    facts: FACTS,
    generatedAt: GENERATED,
    digest: DIGEST,
  })

  it('has seven of them', () => {
    expect(REPORT_LIMITS).toHaveLength(7)
  })

  it.each(REPORT_LIMITS)('is inside the generated file: %s', (line) => {
    expect(html).toContain(line)
  })
})

describe('the filename reaches the control that saves it (§12.12.1)', () => {
  it('has two forms, and both are fixed ASCII templates', () => {
    expect(recordFilename(GENERATED, true)).toBe('record-of-work-2026-08-31.html')
    expect(recordFilename(GENERATED, false)).toBe('reading-record-2026-08-31.html')
  })

  it.each([true, false])('publishes the name the file will be saved under: %s', (submittals) => {
    const filename = recordFilename(GENERATED, submittals)
    const markup = renderToStaticMarkup(
      <DocumentDownload html="<!DOCTYPE html>" filename={filename} label="DOWNLOAD" />,
    )
    expect(markup).toContain(`data-hl-download="${filename}"`)
    // The document itself is a prop, never markup: a whole HTML document
    // rendered into the page that generated it is a second parser over reader
    // text for no gain at all.
    expect(markup).not.toContain('<!DOCTYPE')
  })

  it('prints an em dash before the clock has been read, never a build date', () => {
    const markup = renderToStaticMarkup(<ReportPanel facts={FACTS} counts={COUNTS} />)
    expect(markup).toContain('data-hl-download="—"')
    expect(markup).not.toMatch(/record-of-work-\d{4}-\d{2}-\d{2}\.html/)
  })
})

describe('/report/ — the route (§12.12)', () => {
  const markup = renderToStaticMarkup(<ReportPage />)

  it('names no authority and claims none (§12.12.1)', () => {
    expect(markup).toContain('SELF-ATTESTED · NO ISSUING AUTHORITY')
    // The seven limits are removed before the scan rather than exempted from
    // it: "This is not a W3C Verifiable Credential" is a denial, and a denial
    // is the one place the forbidden vocabulary belongs. What is being checked
    // is the page's own prose around them.
    let text = words(markup)
    for (const line of REPORT_LIMITS) text = text.replace(line, ' ')
    expect(text).not.toMatch(
      /\b(?:certificate|certified|credential|diploma|qualification|badge|verified)\b/i,
    )
  })

  /**
   * Asserted without the trailing slash: `trailingSlash: true` is applied by
   * the router and the export, not by `Link` in a bare `renderToStaticMarkup`,
   * so the rendered `href` here is one character shorter than the one the built
   * page carries. The prefix is the part this test is about.
   */
  it('routes a reader to the specimen before they build anything', () => {
    expect(markup).toContain('href="/legend/specimen')
    expect(markup).toContain('href="/legend"')
  })
})

describe('SHEET 00 — the legend (§12.13)', () => {
  const markup = renderToStaticMarkup(<LegendPage />)

  it('is SHEET 00, and it is a page rather than a gate', () => {
    expect(markup).toContain('SHEET 00 — LEGEND &amp; SPECIMEN')
    // No first-run gate anywhere on this site: no modal, no tour, no step
    // counter, nothing that opens by itself.
    expect(markup).not.toContain('role="dialog"')
    expect(markup).not.toContain('role="alertdialog"')
    expect(words(markup)).not.toMatch(/\b(?:step \d|next step|get started|tour)\b/i)
  })

  it('draws the key with the site’s own marks, not a picture of them', () => {
    // The same classes and the same `data-*` attributes the index rows, the
    // gauges and the dashboard write, so record.css draws the legend from the
    // rules it draws the site from.
    expect(markup).toContain('class="hl-signoff-square" data-drawn="false"')
    expect(markup).toContain('class="hl-signoff-square" data-signed="false"')
    expect(markup).toContain('class="hl-signoff-square" data-signed="true"')
    expect(markup).toContain('class="hl-gauge-tick" data-state="approved"')
    expect(markup).toContain('class="hl-gauge-tick" data-state="undrawn"')
    for (const state of ['draft', 'unread', 'started', 'signed']) {
      expect(markup).toContain(`class="hl-node" data-state="${state}"`)
    }
  })

  it('spells out both carriers, so colour is never the only one (§12.10.4)', () => {
    const text = words(markup)
    expect(text).toMatch(/dashed 3 2/)
    expect(text).toMatch(/solid hairline/)
    expect(text).toMatch(/accent/)
    expect(text).toMatch(/Never a percentage/)
  })

  it('carries §12.1.7’s three lines as a note block, not a banner', () => {
    const text = words(markup)
    expect(text).toContain(
      'Your record is stored in this browser only. It is never sent anywhere.',
    )
    expect(text).toMatch(/Browser storage can be cleared without warning/)
    expect(text).toMatch(/Safari deletes it after seven days without a visit/)
    expect(text).toContain('Export your record to a file to keep it.')
    expect(markup).toContain('class="hl-note"')
    // Not a banner: nothing to dismiss, no icon, no caution colour.
    expect(markup).not.toMatch(/dismiss|hl-btn-danger|caution/i)
  })

  /**
   * §12.19 — naming an absence is compliant with §1; implying a stub is not.
   * Every item is asserted individually, because the failure this catches is one
   * of them quietly going missing in a later edit.
   */
  const ABSENT: readonly string[] = [
    'The command palette and full-text search',
    'Notes',
    'Bookmarks',
    'Spaced review',
    'Turkish routes',
    'Choice-type quiz questions',
    'Instructor grading',
    'Peer assessment',
    'Discussion',
    'Cohorts',
    'Enrolment',
    'Accounts',
    'Cross-device sync',
    'Any cohort or aggregate figure',
    'Leaderboards',
    'Social sharing',
    'A verifiable credential',
  ]

  it.each(ABSENT)('names what is not built: %s', (item) => {
    expect(words(markup)).toContain(item)
  })

  it('separates the deferred from the impossible', () => {
    const text = words(markup)
    expect(text).toMatch(/Deferred to a following slice/)
    expect(text).toMatch(/Impossible without a backend/)
    expect(text.indexOf('Deferred to a following slice')).toBeLessThan(
      text.indexOf('Impossible without a backend'),
    )
  })

  it('links to the specimen, which is the fourth block', () => {
    expect(markup).toContain('href="/legend/specimen')
  })

  it('spends §8.5’s whole prose personality budget, once', () => {
    const text = words(markup).replace(/\s+/g, ' ')
    expect(text).toContain(
      'LKM-01 (Lokum) is a 1-unit cube. It has drawn every figure in this curriculum.',
    )
    expect(text.match(/1-unit cube/g) ?? []).toHaveLength(1)
    // §8.2 / §12.18 — the mark is aria-hidden in every state and never speaks.
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).not.toContain('aria-label="LKM')
  })
})

describe('the specimen (§12.13)', () => {
  const markup = renderToStaticMarkup(<SpecimenPage />)

  it('stamps itself unmissably, before the prose and before the control', () => {
    expect(words(markup)).toContain('SPECIMEN — NOT YOUR RECORD')
    expect(markup.indexOf('SPECIMEN — NOT YOUR RECORD')).toBeLessThan(
      markup.indexOf('DOWNLOAD THE SPECIMEN'),
    )
  })

  it('offers the build-time document as a download, with a specimen filename', () => {
    expect(markup).toContain('data-hl-download="specimen-record-of-work-2026-08-31.html"')
  })

  it('never renders the document’s HTML into this page’s DOM', () => {
    expect(markup).not.toContain('<!DOCTYPE')
    expect(markup).not.toContain('<iframe')
    expect(markup).not.toContain('srcdoc')
    // The document contains an inline script and a JSON data block; neither
    // may reach this page.
    expect(markup).not.toContain('<script')
    expect(markup).not.toContain('hl-record')
  })

  it('presents it as a specimen, never as the reader’s own state', () => {
    const text = words(markup)
    expect(text).toMatch(/generated from sample data/i)
    expect(text).toMatch(/It holds nothing about you/)
  })
})

/**
 * §12.14.1 — the copy register, over the rendered text of every surface this
 * task authors. `tests/unit/copy-register.test.ts` scans the source; this scans
 * what a reader actually receives, which is the only place a banned word
 * assembled out of two JSX fragments would show up.
 */
describe('§12.14.1 — the copy register', () => {
  const surfaces: Array<[string, string]> = [
    ['ReportPanel', renderToStaticMarkup(<ReportPanel facts={FACTS} counts={COUNTS} />)],
    ['/report/', renderToStaticMarkup(<ReportPage />)],
    ['SHEET 00', renderToStaticMarkup(<LegendPage />)],
    ['the specimen', renderToStaticMarkup(<SpecimenPage />)],
  ]

  /**
   * `Quick Check` is the authored name of a section in the corpus (§12.6), so
   * it is removed before the scan rather than exempted from it — which also
   * pins the label, since a rename would put the word back.
   */
  function scannable(markup: string): string {
    return words(markup).replace(/quick check/gi, ' ')
  }

  it.each(surfaces)('%s carries no exclamation mark', (_name, markup) => {
    expect(scannable(markup)).not.toContain('!')
  })

  it.each(surfaces)('%s avoids the banned register', (_name, markup) => {
    expect(scannable(markup)).not.toMatch(
      /\b(?:easy|easily|just|simply|simple|quick|quickly|please|sorry|oops|invalid|valid|great|awesome|nice try|well done|congratulations|perfect)\b/i,
    )
  })

  it.each(surfaces)('%s never speaks as if the site were a person', (_name, markup) => {
    expect(scannable(markup)).not.toMatch(/\b(?:I|I'm|I've|we|we've|my|our)\b/i)
  })

  it.each(surfaces)('%s claims no grade, score or mastery (§12.4.2)', (_name, markup) => {
    expect(scannable(markup)).not.toMatch(
      /\b(?:passed|graded|scored|mastered|certified|qualified|competence)\b/i,
    )
  })
})
