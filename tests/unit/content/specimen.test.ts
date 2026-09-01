/**
 * §12.13 — the specimen record document.
 *
 * The specimen exists so a reader can see the artefact before they have done
 * anything, and it honours §1 by being labelled a specimen rather than
 * presented as their own state. Both halves of that sentence are load-bearing
 * and both are tested here: the label has to be **in the document**, not only
 * on the page that offers it — a saved file outlives the page — and the sample
 * data has to be obviously fictional, because a specimen a reviewer mistook for
 * a real record would be the worst failure this slice could ship.
 *
 * The document itself is `report.ts`'s, covered by 37 tests of its own. What is
 * new here is the sample record, the stamp, the filename, and the promise that
 * the specimen is a **real** artefact — re-importable, digested, inside the
 * byte budget — rather than a mock-up of one.
 */

import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { reportFacts } from '@/lib/content/report-facts'
import {
  SPECIMEN_NAME,
  SPECIMEN_STAMP,
  specimenDocument,
} from '@/lib/content/specimen'
import {
  REPORT_BUDGET_BYTES,
  canonicalRecordJson,
} from '@/lib/record/report'
import { envelopeTextFrom, parseEnvelope } from '@/lib/record/validate'
import { SITE_ORIGIN } from '@/lib/site-origin'

const DOC = specimenDocument()
const FACTS = reportFacts(SITE_ORIGIN)

/** The payload the document carries, read back the way the importer reads it. */
const PAYLOAD = parseEnvelope(envelopeTextFrom(DOC.html))
const DATA = PAYLOAD.kind === 'ok' ? PAYLOAD.data : null

describe('the origin the document prints (§12.12.7)', () => {
  it('is derived from the repository owner, not typed', () => {
    // GitHub Pages serves a project site at https://<owner>.github.io/<repo>/,
    // and `REPO_URL` already names the owner. The path half is `href()`'s.
    expect(SITE_ORIGIN).toBe('https://lokumai.github.io')
  })

  it('is absolute in the criteria URL, because the file is opened from file://', () => {
    expect(FACTS.criteriaUrl.startsWith('https://')).toBe(true)
    expect(DOC.html).toContain(FACTS.criteriaUrl)
  })
})

describe('the stamp (§12.13)', () => {
  it('is inside the document, not only on the page that offers it', () => {
    expect(DOC.html).toContain(SPECIMEN_STAMP)
  })

  it('rides in the name, which §12.12.2 prints in the header block', () => {
    // The header is the first thing read on screen, in print, and in a print
    // preview's first page — so the label cannot be scrolled past or cropped.
    const header = DOC.html.slice(0, DOC.html.indexOf('Status and limits'))
    expect(header).toContain(SPECIMEN_STAMP)
    expect(header).toContain('A. DRAFTER')
  })

  it('names the file a specimen too, on top of §12.12.1’s fixed stem', () => {
    expect(DOC.filename).toBe('specimen-record-of-work-2026-08-31.html')
    expect(DOC.filename).toMatch(/^[a-z0-9.-]+$/)
  })
})

describe('it is a real artefact, not a mock-up', () => {
  it('is one complete standalone document', () => {
    expect(DOC.html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(DOC.html.trimEnd().endsWith('</html>')).toBe(true)
  })

  it('states the same seven limits any other record states (§12.12.3)', () => {
    expect(DOC.html).toContain('No issuing authority exists')
    expect(DOC.html).toContain('The reader may have edited this file after it was generated')
  })

  it('is titled RECORD OF WORK, because the sample registers repositories', () => {
    expect(DOC.html).toMatch(/<title>[^<]*RECORD OF WORK[^<]*<\/title>/)
  })

  it('fits §12.12.7’s budget, measured rather than hoped for', () => {
    expect(DOC.bytes).toBeLessThan(REPORT_BUDGET_BYTES)
    // A specimen that had collapsed to a stub would pass the line above too.
    expect(DOC.bytes).toBeGreaterThan(20_000)
  })

  it('carries a digest that is the real SHA-256 of its own payload (§12.12.5)', () => {
    const expected = createHash('sha256')
      .update(canonicalRecordJson(DOC.data), 'utf8')
      .digest('hex')
    expect(DOC.digest).toBe(expected)
    expect(DOC.digest).toMatch(/^[0-9a-f]{64}$/)
    expect(DOC.html).toContain(DOC.digest)
  })

  it('is re-importable, because the record IS the backup (§12.12.6)', () => {
    expect(PAYLOAD.kind).toBe('ok')
    expect(DATA).not.toBeNull()
  })

  it('is byte-identical build to build, so the export diffs cleanly', () => {
    expect(specimenDocument().html).toBe(DOC.html)
    // The generation instant is a fixed sample instant, never the build clock:
    // reading the clock here would change every emitted byte on every build,
    // which is the property §12.10 already refuses for the dashboard.
    expect(DOC.generatedAt).toBe('2026-08-31T17:00:00.000Z')
    expect(DOC.html).toContain('2026-08-31T17:00:00.000Z')
  })
})

describe('the sample data is obviously sample, and holds no reader data', () => {
  it('names a drafter who is plainly not the reader', () => {
    expect(DATA?.identity.name).toBe(SPECIMEN_NAME)
    expect(SPECIMEN_NAME).toContain('A. DRAFTER')
  })

  it('writes only against slugs the corpus actually has (§12.1.3)', () => {
    const real = new Set(FACTS.sheets.map((sheet) => sheet.slug))
    for (const slug of Object.keys(DATA?.sheets ?? {})) expect(real.has(slug)).toBe(true)
  })

  it('registers every repository under GitHub’s reserved example owner', () => {
    const submittals = Object.values(DATA?.sheets ?? {}).flatMap((sheet) => sheet.submittals)
    expect(submittals.length).toBeGreaterThan(0)
    for (const entry of submittals) {
      expect(entry.owner).toBe('example')
      expect(entry.url).toBe(`https://github.com/example/${entry.repo}`)
    }
    // One with a commit hash and one without: the register prints them
    // differently and both states are ordinary (§12.9.3).
    expect(submittals.some((entry) => entry.commit !== null)).toBe(true)
    expect(submittals.some((entry) => entry.commit === null)).toBe(true)
  })

  it('opens only RFC 2606 reserved hosts as sources (§12.8)', () => {
    const urls = Object.values(DATA?.sheets ?? {}).flatMap((sheet) => sheet.sources)
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(['example.org', 'example.com']).toContain(new URL(url).hostname)
    }
  })

  it('shows §12.4.3 drift, which is the sharpest thing in the document', () => {
    const revisions = Object.values(DATA?.sheets ?? {}).map((sheet) => sheet.signedRevision)
    expect(revisions).toContain('0000000')
  })

  it('records both self-assessment outcomes, never only the flattering one', () => {
    const assessed = Object.values(DATA?.sheets ?? {})
      .map((sheet) => sheet.quiz?.assessed ?? null)
      .filter((value) => value !== null)
    expect(assessed).toContain('matched')
    expect(assessed).toContain('missed')
  })

  it('signs off a counted number of sheets out of a counted set', () => {
    expect(DOC.signedOff).toBe(7)
    expect(DOC.of).toBe(FACTS.sheets.length)
    expect(DOC.of).toBeGreaterThan(DOC.signedOff)
  })
})

/**
 * §12.14.1 — the register, over the strings this module authors.
 *
 * `tests/unit/copy-register.test.ts` scans `components/record`, `app/report`,
 * `app/legend`, `lib/record` and `lib/identity`; `lib/content/specimen.ts` is
 * outside its roots, and the sample data is reader-visible copy inside a file
 * an employer opens. So it is scanned here, and it is scanned from the PARSED
 * record rather than from the source — every sample string reaches the document
 * through the record, so reading it back out is what proves the shipped values
 * comply rather than the literals beside them.
 */
describe('§12.14.1 — the copy register, over the sample strings', () => {
  const strings: string[] = [
    SPECIMEN_STAMP,
    SPECIMEN_NAME,
    DATA?.identity.name ?? '',
    ...Object.values(DATA?.sheets ?? {}).flatMap((sheet) => [
      sheet.quiz?.answer ?? '',
      ...sheet.submittals.map((entry) => entry.note),
    ]),
  ].filter((text) => text !== '')

  it('scans a real set of strings, so a silent pass cannot be an empty scan', () => {
    expect(strings.length).toBeGreaterThan(5)
  })

  it('has no exclamation mark', () => {
    for (const text of strings) expect(text).not.toContain('!')
  })

  it('never speaks as if the site were a person', () => {
    for (const text of strings) expect(text).not.toMatch(/\b(?:I|I'm|I've|we|we've|my|our)\b/i)
  })

  it('avoids the banned register', () => {
    for (const text of strings) {
      expect(text).not.toMatch(
        /\b(?:easy|easily|just|simply|simple|quick|quickly|please|sorry|oops|invalid|valid|great|awesome|nice try|well done|congratulations|perfect)\b/i,
      )
    }
  })

  it('claims no grade, score or mastery (§12.4.2)', () => {
    for (const text of strings) {
      expect(text).not.toMatch(/\b(?:passed|graded?|scored?|mastered|certified|qualified)\b/i)
    }
  })
})
