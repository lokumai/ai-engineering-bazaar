/**
 * §12.12 — the `RECORD OF WORK`.
 *
 * Two classes of failure are worth this much test code, and neither is caught
 * by looking at the file in a browser.
 *
 * The first is **injection**. This document is generated from a reader's own
 * free text — a name, a note, a URL — and then saved and re-opened from
 * `file://` forever. There is no server-side fix and no CSP worth adding
 * (§12.12.7: the document's own functionality *is* one inline script). So the
 * escapers are the whole boundary, and the hostile-input block below is the
 * test that they hold at every sink the document actually has.
 *
 * The second is **a broken artefact in front of an employer**. A `file://`
 * document is an opaque origin: a stylesheet link, a webfont, an `<img src>`, a
 * `fetch`, a module import or a `localStorage` read is a blank page or a missing
 * asset on somebody else's machine, months later, with nobody to ask. Those are
 * asserted as absences, because an absence is exactly what cannot be noticed by
 * opening the file on the machine that made it.
 */

import { describe, expect, it } from 'vitest'
import { parseEnvelope } from '@/lib/record/validate'
import {
  REPORT_BUDGET_BYTES,
  type ReportFacts,
  type ReportSheetFact,
  buildRecordOfWork,
  canonicalRecordJson,
  recordFilename,
  reportBytes,
} from '@/lib/record/report'
import { EMPTY_RECORD, type RecordData, type Submittal } from '@/lib/record/schema'
import {
  addSubmittal,
  assessQuiz,
  recordSourceOpened,
  setChecklistItem,
  setIdentity,
  setQuizAnswer,
  signOff,
} from '@/lib/record/events'

const AT = '2026-08-14T09:00:00.000Z'
const GENERATED = '2026-08-31T12:00:00.000Z'
const DIGEST = 'a'.repeat(64)

function sheet(module: number, over: Partial<ReportSheetFact> = {}): ReportSheetFact {
  const drawn = module <= 15
  return {
    slug: `band/sheet-${module}`,
    module,
    title: `Sheet ${module}`,
    categorySlug: module <= 7 ? 'fundamentals' : 'intermediate',
    categoryTitle: module <= 7 ? 'Fundamentals' : 'Intermediate',
    categoryOrder: module <= 7 ? 1 : 2,
    drawn,
    revision: drawn ? 'a1b2c3d' : null,
    objectives: drawn ? [`Explain thing ${module}`, `Choose thing ${module}`] : [],
    question: drawn ? `What is thing ${module}?` : null,
    checklistItems: module === 13 ? ['Rotate the token', 'Scope the grant'] : [],
    ...over,
  }
}

const FACTS: ReportFacts = {
  sheets: Array.from({ length: 32 }, (_, i) => sheet(i + 1)),
  curriculumName: 'AI Engineering Bazaar',
  criteriaUrl: 'https://lokumai.github.io/ai-engineering-bazaar/legend/',
  assertion: 'Signing a sheet off is the reader’s own assertion that they have read it.',
}

function repo(over: Partial<Submittal> = {}): Submittal {
  return {
    owner: 'cevheri',
    repo: 'agent-harness',
    url: 'https://github.com/cevheri/agent-harness',
    commit: '9f2c1ab',
    note: 'A harness that runs the checklist against my own repo.',
    at: AT,
    ...over,
  }
}

/** A record with something in every section the document can render. */
function fullRecord(): RecordData {
  let data = setIdentity(EMPTY_RECORD, { name: 'Ada Lovelace', mark: 'datum' }, AT)
  data = signOff(data, 'band/sheet-1', 'a1b2c3d', AT)
  data = signOff(data, 'band/sheet-3', 'a1b2c3d', '2026-08-20T09:00:00.000Z')
  // A sheet signed against a revision that has since moved (§12.4.3).
  data = signOff(data, 'band/sheet-13', 'deadbee', '2026-09-01T09:00:00.000Z')
  data = setQuizAnswer(data, 'band/sheet-3', 'Because the window is finite.', AT)
  data = assessQuiz(data, 'band/sheet-3', 'matched', AT)
  data = setChecklistItem(data, 'band/sheet-13', 0, true, AT)
  data = recordSourceOpened(data, 'band/sheet-1', 'https://example.org/spec', AT)
  data = recordSourceOpened(data, 'band/sheet-3', 'https://example.org/other', AT)
  data = addSubmittal(data, 'band/sheet-13', repo(), AT)
  return data
}

function build(data: RecordData, facts: ReportFacts = FACTS): string {
  return buildRecordOfWork({ data, facts, generatedAt: GENERATED, digest: DIGEST })
}

// ---------------------------------------------------------------------------

describe('the document’s shape (§12.12.2)', () => {
  const html = build(fullRecord())

  it('is a complete, standalone HTML document with a language and a title', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toMatch(/<title>[^<]*RECORD OF WORK[^<]*<\/title>/)
    expect(html.trimEnd().endsWith('</html>')).toBe(true)
  })

  it('puts the five blocks in §12.12.2’s order, limits SECOND', () => {
    const order = [
      'class="head"',        // 1 header
      'Status and limits',   // 2 limits — above the fold, never a footer
      'Sheet ledger',        // 3 ledger
      'Evidence register',   // 4 evidence
      'How to check this',   // 5 the audit path
    ].map((needle) => html.indexOf(needle))
    expect(order.every((at) => at > -1)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('states all seven limits (§12.12.3)', () => {
    for (const clause of [
      'No issuing authority exists',
      'not a W3C Verifiable Credential',
      'can be edited by anyone with developer tools',
      'own device clock',
      'not fetched, resolved or checked',
      'self-reported and unscored',
      'may have edited this file after it was generated',
    ]) expect(html).toContain(clause)
  })

  it('ends the audit path with the line that is the whole point (§12.12.4)', () => {
    expect(html).toContain('Nothing in this document should change your hiring decision')
    expect(html).toContain('The repositories might')
  })

  it('labels the digest honestly rather than letting it read as a seal', () => {
    expect(html).toContain(DIGEST)
    expect(html).toContain('proves this file has not changed since it was')
    expect(html).toContain('proves nothing about the facts inside it')
  })

  it('prints every sheet in the set, with its state', () => {
    // 32 ledger rows, one per sheet, plus the header row.
    expect(html.match(/<tr data-band=/g) ?? []).toHaveLength(32)
    expect(html).toContain('>SIGNED OFF<')
    expect(html).toContain('>NOT SIGNED OFF<')
    expect(html).toContain('>NOT DRAWN<')
  })

  it('shows revision drift where a signed sheet has moved (§12.4.3)', () => {
    expect(html).toContain('deadbee')
    expect(html).toContain('now a1b2c3d')
  })

  it('lists what is NOT signed off, rather than only accumulating positives', () => {
    expect(html).toContain('Not yet signed off')
    expect(html).toContain('A record that can only')
  })

  it('says “opened”, never “read”, about a source (§12.8)', () => {
    expect(html).toContain('Primary sources opened')
    expect(html).toContain('Opened, not read')
  })

  it('reproduces checklist item text rather than a tally (§12.7)', () => {
    expect(html).toContain('Rotate the token')
    expect(html).toContain('Scope the grant')
    expect(html).toContain('Reader-ticked, unscored')
  })
})

describe('what it is allowed to call itself (§12.12.1)', () => {
  it('never uses credential vocabulary about ITSELF', () => {
    const html = build(fullRecord())
    // "Verifiable Credential" survives, but only inside the sentence that
    // denies being one. Nothing else in the credential family appears at all.
    for (const word of [/certificate/i, /certification/i, /diploma/i, /qualification/i, /\bbadge/i]) {
      expect(html).not.toMatch(word)
    }
    const credentials = html.match(/credential/gi) ?? []
    expect(credentials).toHaveLength(1)
    expect(html).toContain('not a W3C Verifiable Credential')
  })

  it('never makes a claim about the person, and never a score', () => {
    const html = build(fullRecord())
    for (const phrase of [
      /has completed/i, /is qualified/i, /demonstrated competence/i,
      /\bpassed\b/i, /\bcertified\b/i, /mastered/i, /top \d+%/i,
    ]) expect(html).not.toMatch(phrase)
  })

  it('phrases its claims as statements about the record', () => {
    const html = build(fullRecord())
    expect(html).toContain('This record contains 3 of 32 sheets marked signed off')
    expect(html).toContain('1 quick check was answered')
    expect(html).toContain('2 distinct primary-source URLs were opened')
    expect(html).toContain('1 repository was registered')
    // §12.12.1's elapsed-span form: a fact about the record, not time-on-task.
    expect(html).toContain('18 days apart')
  })

  it('prints no percentage among its claims (§11.35)', () => {
    const html = build(fullRecord())
    const claims = html.slice(html.indexOf('<ul class="claims">'), html.indexOf('</ul>', html.indexOf('<ul class="claims">')))
    expect(claims).not.toMatch(/%/)
  })

  it('degrades to READING RECORD when no repository was registered', () => {
    let data = setIdentity(EMPTY_RECORD, { name: 'Ada' }, AT)
    data = signOff(data, 'band/sheet-1', 'a1b2c3d', AT)
    const html = build(data)
    expect(html).toContain('READING RECORD')
    expect(html).not.toContain('RECORD OF WORK')
    // The evidence register is dropped, not printed empty.
    expect(html).not.toContain('Evidence register')
  })

  it('prints UNSIGNED rather than inventing a name for a reader who skipped it', () => {
    const html = build(signOff(EMPTY_RECORD, 'band/sheet-1', 'a1b2c3d', AT))
    expect(html).toContain('UNSIGNED')
    expect(html).not.toMatch(/anonymous/i)
    expect(html).not.toMatch(/\breader\d/i)
  })

  it('renders at all, and truthfully, for a reader with nothing recorded', () => {
    const html = build(EMPTY_RECORD)
    expect(html).toContain('This record contains 0 of 32 sheets marked signed off')
    expect(html).toContain('READING RECORD')
    expect(html).not.toContain('days apart')
  })
})

// ---------------------------------------------------------------------------
// The security boundary.
// ---------------------------------------------------------------------------

describe('hostile reader input (§12.12.7)', () => {
  const NAME = '</script><img src=x onerror=alert(1)>'
  const NOTE = '<!-- <script> --> "quoted" \'single\' & <b>bold</b>'

  function hostile(): RecordData {
    let data = setIdentity(EMPTY_RECORD, { name: NAME }, AT)
    data = signOff(data, 'band/sheet-13', 'a1b2c3d', AT)
    data = setQuizAnswer(data, 'band/sheet-13', NAME, AT)
    data = assessQuiz(data, 'band/sheet-13', 'matched', AT)
    data = addSubmittal(data, 'band/sheet-13', repo({ note: NOTE }), AT)
    return data
  }

  const html = build(hostile())

  it('closes no script element early — the whole class of injection', () => {
    // Exactly two script elements exist: the JSON data block and the one
    // classic inline script. Any third `</script` means reader text escaped.
    expect(html.match(/<\/script/gi) ?? []).toHaveLength(2)
  })

  it('emits no event-handler attribute in any tag', () => {
    // Scanned inside tags only. `onerror=alert(1)>` genuinely does appear in
    // this document, as inert text: `escText` escaped the `<` that would have
    // opened the tag, and a bare `>` in a text node is legal and does nothing.
    // A regex over the whole string cannot tell those two cases apart, and the
    // one that matters is the tag.
    for (const [tag] of html.matchAll(/<[a-zA-Z][^>]*>/g)) {
      expect(tag).not.toMatch(/\son[a-z]+\s*=/i)
    }
  })

  it('escapes the name in the text node it lands in', () => {
    // Both `<` become `&lt;`, so neither the closing tag nor the `<img>` is
    // ever parsed as markup. The `>` characters stay as themselves, which is
    // what the HTML spec requires of a text node and is harmless.
    expect(html).toContain('&lt;/script>&lt;img src=x onerror=alert(1)>')
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('</script><img')
  })

  it('escapes the note, including the comment opener and the ampersand', () => {
    expect(html).toContain('&lt;!-- &lt;script>')
    expect(html).toContain('&amp;')
    expect(html).not.toContain('<b>bold</b>')
    expect(html).not.toContain('<!-- <script>')
  })

  it('keeps the JSON data block inert and parseable', () => {
    const block = /<script id="hl-record" type="application\/json">([\s\S]*?)<\/script>/
      .exec(html)
    expect(block).not.toBeNull()
    const payload = block![1]
    expect(payload).not.toMatch(/<\/script/i)
    expect(payload).not.toContain('<')
    const parsed = JSON.parse(payload)
    // The name round-trips intact: escaped for transport, not mangled.
    expect(parsed.data.identity.name).toBe(NAME)
  })

  it('is re-importable, so the artefact the reader keeps is also their backup', () => {
    const result = parseEnvelope(
      /<script id="hl-record" type="application\/json">([\s\S]*?)<\/script>/
        .exec(html)![1],
    )
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.data.identity.name).toBe(NAME)
    expect(result.data.sheets['band/sheet-13'].submittals).toHaveLength(1)
  })

  it('renders a repository link from the reconstructed URL only (§12.9.2)', () => {
    // `events.addSubmittal` stores what `parseRepo` reconstructed, so a query
    // string, userinfo or a homograph host can never reach the href. Assert the
    // document does not reintroduce one.
    expect(html).toContain('href="https://github.com/cevheri/agent-harness"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('target="_blank"')
  })

  it('never lets a link’s text disagree with its destination', () => {
    for (const [, href, text] of html.matchAll(
      /<a href="([^"]+)"[^>]*>([^<]*)<\/a>/g,
    )) {
      // Every anchor in this document is a URL printed as itself.
      expect(text).toBe(href)
    }
  })

  it('states that the commit hash was not fetched (§12.9.3)', () => {
    expect(html).toContain('supplied by reader; not fetched or verified')
  })
})

// ---------------------------------------------------------------------------
// Survives being opened from a disk, months later, by somebody else.
// ---------------------------------------------------------------------------

describe('self-containment (§12.12.7)', () => {
  const html = build(fullRecord())

  it('loads nothing over the network', () => {
    expect(html).not.toContain('<link')
    expect(html).not.toContain('@import')
    expect(html).not.toContain('@font-face')
    expect(html).not.toMatch(/<img\s/i)
    expect(html).not.toMatch(/\bfetch\s*\(/)
    expect(html).not.toMatch(/XMLHttpRequest/)
    // The only absolute URLs are ones the reader typed, inside an anchor.
    for (const [, url] of html.matchAll(/(?:src|href)="(https?:[^"]*)"/g)) {
      expect(url.startsWith('https://github.com/') || url.startsWith('https://example.org/'))
        .toBe(true)
    }
  })

  it('ships one classic script, never a module', () => {
    expect(html).not.toContain('type="module"')
    expect(html).not.toMatch(/^\s*import\s/m)
    expect(html).not.toMatch(/\bimport\s*\(/)
  })

  it('touches no storage — it throws under the file: scheme', () => {
    expect(html).not.toContain('localStorage')
    expect(html).not.toContain('sessionStorage')
    expect(html).not.toContain('indexedDB')
  })

  it('uses system font stacks only', () => {
    expect(html).toContain('ui-monospace')
    expect(html).toContain('ui-serif')
    // `system-ui` is not for typesetting prose; it is confined to headings.
    expect(html).toContain('ui-sans-serif')
  })

  it('carries the A4 print rules, and does not depend on colour surviving them', () => {
    expect(html).toContain('@page{size:A4')
    expect(html).toContain('break-inside:avoid')
    expect(html).toContain('page-break-inside:avoid')
    // §12.10.4 / §12.17 — state is carried by text and line type, so a
    // black-and-white print loses nothing.
    expect(html).toContain('forced-colors:active')
  })

  it('stays inside the byte budget', () => {
    const bytes = reportBytes(html)
    expect(bytes).toBeLessThan(REPORT_BUDGET_BYTES)
    // And a hostile-length record does too: 32 sheets, 3 repos each, long notes.
    let big: RecordData = setIdentity(EMPTY_RECORD, { name: 'A'.repeat(80) }, AT)
    for (const fact of FACTS.sheets) {
      if (!fact.drawn) continue
      big = signOff(big, fact.slug, 'a1b2c3d', AT)
      big = setQuizAnswer(big, fact.slug, 'x'.repeat(400), AT)
      big = assessQuiz(big, fact.slug, 'matched', AT)
      for (let n = 0; n < 3; n += 1) {
        big = addSubmittal(big, fact.slug, repo({
          repo: `project-${fact.module}-${n}`,
          url: `https://github.com/cevheri/project-${fact.module}-${n}`,
          note: 'n'.repeat(200),
        }), AT)
      }
      for (let n = 0; n < 25; n += 1) {
        big = recordSourceOpened(big, fact.slug, `https://example.org/${fact.module}/${n}`, AT)
      }
    }
    expect(reportBytes(build(big))).toBeLessThan(REPORT_BUDGET_BYTES)
  })
})

describe('reproducibility and the digest (§12.12.5)', () => {
  it('is byte-identical for the same input', () => {
    const data = fullRecord()
    expect(build(data)).toBe(build(data))
  })

  it('canonicalises with sorted keys at every depth, arrays left alone', () => {
    const a = canonicalRecordJson(fullRecord())
    // Same record, keys inserted in a different order.
    const shuffled = JSON.parse(JSON.stringify(fullRecord()))
    const rebuilt: Record<string, unknown> = {}
    for (const key of Object.keys(shuffled).reverse()) rebuilt[key] = shuffled[key]
    expect(canonicalRecordJson(rebuilt as unknown as RecordData)).toBe(a)
    expect(a).not.toContain('\n')
  })

  it('keeps array order, because order distinguishes two real records', () => {
    let one = recordSourceOpened(EMPTY_RECORD, 'band/sheet-1', 'https://a.example/', AT)
    one = recordSourceOpened(one, 'band/sheet-1', 'https://b.example/', AT)
    let two = recordSourceOpened(EMPTY_RECORD, 'band/sheet-1', 'https://b.example/', AT)
    two = recordSourceOpened(two, 'band/sheet-1', 'https://a.example/', AT)
    expect(canonicalRecordJson(one)).not.toBe(canonicalRecordJson(two))
  })
})

describe('the filename (§12.12.1)', () => {
  it('is a fixed ASCII template and never the reader’s name', () => {
    expect(recordFilename(GENERATED, true)).toBe('record-of-work-2026-08-31.html')
    expect(recordFilename(GENERATED, false)).toBe('reading-record-2026-08-31.html')
    expect(recordFilename(GENERATED, true)).toMatch(/^[a-z0-9.-]+$/)
  })
})

describe('the accent is spent on one condition only (§12.12.9)', () => {
  it('marks a row checkable only when it is signed off AND has a commit', () => {
    let data = signOff(EMPTY_RECORD, 'band/sheet-1', 'a1b2c3d', AT)
    // Signed, no repository: not checkable.
    expect(build(data).match(/class="checkable"/g) ?? []).toHaveLength(0)

    // A repository with no commit hash is still not independently checkable.
    data = addSubmittal(data, 'band/sheet-1', repo({ commit: null }), AT)
    expect(build(data).match(/class="checkable"/g) ?? []).toHaveLength(0)

    // Signed, with a commit: exactly one row earns it.
    data = addSubmittal(data, 'band/sheet-1', repo({
      repo: 'other', url: 'https://github.com/cevheri/other', commit: 'abc1234',
    }), AT)
    expect(build(data).match(/class="checkable"/g) ?? []).toHaveLength(1)
  })
})
