import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  CheckedBy,
  Repositories,
  SheetStamps,
  type SheetStampFact,
} from '@/components/record/CheckedBy'
import { DrafterStamp } from '@/components/record/DrafterStamp'
import { QuickCheck } from '@/components/record/QuickCheck'
import { SignOff } from '@/components/record/SignOff'
import { SourceTracking } from '@/components/record/SourceTracking'
import { Submittal, SubmittalEntry } from '@/components/record/Submittal'
import { TitleBlock, TitleStrip } from '@/components/sheet/TitleBlock'
import { SIGN_OFF_ASSERTION, type SignOffCriteria } from '@/lib/content/criteria'
import {
  REPOSITORIES_LABEL,
  type SheetFacts,
  carriesCheckedBy,
  carriesRepositories,
} from '@/lib/content/title-block'
import { parseRepo } from '@/lib/identity/github'
import { addSubmittal } from '@/lib/record/events'
import { EMPTY_RECORD } from '@/lib/record/schema'

/**
 * §12.2, §12.14.2 — the honest empty first frame, pinned.
 *
 * `renderToStaticMarkup` gives exactly what a static export writes into the
 * HTML: `useSyncExternalStore`'s `getServerSnapshot` returns the frozen
 * `EMPTY_RECORD`, so every component here renders what the build genuinely
 * knows about a reader it has never met. That frame is not a defect to be
 * papered over — it is the state the whole two-channel rule exists to make
 * correct, and it is the one frame every reader sees before hydration.
 *
 * What this file does NOT test, deliberately: clicking, typing, storage
 * round-trips, cross-tab, first-paint after a reload. Those need a real browser
 * and are Playwright's job (§12.14.2). There is no jsdom here and no Testing
 * Library, so nothing pretends to have a layout it does not have.
 */

const SLUG = 'intermediate/security'

const CRITERIA: SignOffCriteria = {
  objectives: [
    'Name the four channels a prompt injection can arrive through',
    'Write an allow-list for a tool-calling agent',
  ],
  assertion: SIGN_OFF_ASSERTION,
}

const DRAWN: SheetFacts = {
  module: 13,
  categoryOrder: 2,
  categoryTitle: 'Intermediate',
  position: { index: 6, of: 8 },
  sheets: 32,
  status: 'ready',
  extent: 4912,
  duration: 30,
  diagrams: 3,
  tables: 2,
  sources: 41,
  requires: [12],
  feeds: [14],
  revision: { hash: 'b7225f8', date: '2026-08-31' },
  lang: 'EN',
}

const NOT_DRAWN: SheetFacts = { ...DRAWN, module: 20, status: 'draft' }

const FACT: SheetStampFact = {
  slug: SLUG,
  module: 13,
  category: 'intermediate',
  drawn: true,
  hasQuickCheck: true,
  checklistItems: 8,
  sources: 41,
}

/** The rendered text alone: attribute names are not copy (§12.14.1). */
function words(markup: string): string {
  return markup.replace(/<[^>]*>/g, ' ')
}

describe('Repositories — §12.9’s title-block row', () => {
  /**
   * The row exists because a reader found its absence. They registered three
   * repositories, the register beneath the sheet said `3 OF 3`, and the title
   * block — the panel that summarises the sheet — mentioned them nowhere, while
   * the exported RECORD OF WORK had been printing `REPOSITORIES n` all along.
   */
  it('prints an em dash before a record has been read', () => {
    // Not `0`. §11.25's dash is "this count was never taken", which is exactly
    // true of a page prerendered before the reader existed. `0` would claim a
    // reading nobody took.
    expect(renderToStaticMarkup(<Repositories slug={SLUG} />)).toBe('—')
  })

  it('is a row on a drawn sheet and absent from a draft', () => {
    // The same gate as CHECKED BY: a sheet nobody has drawn has no register to
    // report, because it has no sign-off control either (§12.4.1, §12.9.1).
    expect(carriesRepositories(DRAWN)).toBe(true)
    expect(carriesRepositories({ ...DRAWN, status: 'draft' })).toBe(false)
    // The same gate as its sibling, asserted together so they cannot drift.
    expect(carriesRepositories(DRAWN)).toBe(carriesCheckedBy(DRAWN))
  })

  it('appears in both title-block variants when a value is passed', () => {
    for (const markup of [
      renderToStaticMarkup(<TitleBlock rows={[]} repositories={<>2</>} />),
      renderToStaticMarkup(<TitleStrip rows={[]} repositories={<>2</>} />),
    ]) {
      expect(markup).toContain(REPOSITORIES_LABEL)
      expect(words(markup)).toMatch(/REPOSITORIES\s+2/)
    }
  })

  it('leaves the row out entirely when there is none, never hollow', () => {
    for (const markup of [
      renderToStaticMarkup(<TitleBlock rows={[]} repositories={null} />),
      renderToStaticMarkup(<TitleStrip rows={[]} repositories={null} />),
      renderToStaticMarkup(<TitleBlock rows={[]} />),
    ]) {
      expect(markup).not.toContain(REPOSITORIES_LABEL)
    }
  })

  /**
   * The first attempt put this in §7.4's stamp grid instead. `Stamp` prints
   * `n OF m` or `APPROVED` and nothing else, so a register at its cap of three
   * rendered `SUBMITTAL APPROVED` — and filling a register to its storage limit
   * approves nothing (§12.5.4). `derive.test.ts` pins the slot's absence; this
   * pins that the row says a number and never a verdict.
   */
  it('states a count and claims nothing', () => {
    const markup = renderToStaticMarkup(<TitleBlock rows={[]} repositories={<>3</>} />)
    expect(markup).not.toMatch(/APPROVED|SIGNED|COMPLETE/i)
  })
})

describe('§7.4 — both title-block variants carry the stamps', () => {
  /**
   * The grid used to render only inside the A0 right rail, which left two holes
   * a reader found by opening sheet 01: the seven A2 sheets — all of
   * Fundamentals, the first seven anybody reads and signs — had no stamp grid at
   * all, and an A0 sheet below 1280px lost its grid when the rail collapsed to
   * the strip. Neither page lied; the SIGN-OFF control states its own state in
   * words. But the sheets a beginner spends most time on summarised the least.
   */
  it('renders the same stamps in either variant', () => {
    const grid = <SheetStamps slug={SLUG} fact={FACT} />
    const strip = <SheetStamps slug={SLUG} fact={FACT} variant="strip" />

    for (const markup of [renderToStaticMarkup(grid), renderToStaticMarkup(strip)]) {
      expect(markup).toContain('hl-stamp-grid')
      expect(markup).toContain('SIGN-OFF')
    }
  })

  it('gives the strip its own container and the panel its inset rule', () => {
    // One derive, one `Stamp`, two containers. The variant chooses a layout and
    // never what the stamps say.
    expect(renderToStaticMarkup(<SheetStamps slug={SLUG} fact={FACT} variant="strip" />))
      .toContain('hl-title-strip-stamps')
    expect(renderToStaticMarkup(<SheetStamps slug={SLUG} fact={FACT} />))
      .not.toContain('hl-title-strip-stamps')
  })

  it('hands the strip’s bottom margin to the stamps when it has them', () => {
    // `data-stamps` is what stops the strip's 32px pushing its own stamps away
    // from it. Without the flag the strip is unchanged.
    expect(renderToStaticMarkup(<TitleStrip rows={[]} stamps={<i />} />))
      .toContain('data-stamps="true"')
    expect(renderToStaticMarkup(<TitleStrip rows={[]} />)).not.toContain('data-stamps')
  })

  it('puts the stamps after the rows, never inside the list', () => {
    // A `<div>` inside a `<dl>` between a `dt`/`dd` pair is valid; a stamp grid
    // is not a term or a definition, so it belongs outside the list entirely.
    const markup = renderToStaticMarkup(
      <TitleStrip rows={[]} stamps={<i id="marker" />} />,
    )
    expect(markup.indexOf('</dl>')).toBeLessThan(markup.indexOf('id="marker"'))
  })
})

describe('CheckedBy — §12.3.1', () => {
  it('prints an em dash on a sheet nobody has signed off', () => {
    expect(renderToStaticMarkup(<CheckedBy slug={SLUG} />)).toBe('—')
  })

  it('never invents a name, an initial or a placeholder person', () => {
    const markup = renderToStaticMarkup(<CheckedBy slug={SLUG} />)
    expect(markup).not.toMatch(/anonymous|reader|unknown|\?/i)
  })
})

describe('SignOff — §12.4', () => {
  const markup = renderToStaticMarkup(
    <SignOff slug={SLUG} criteria={CRITERIA} revision="b7225f8" drawn />,
  )

  it('offers SIGN OFF, unpressed', () => {
    expect(markup).toContain('SIGN OFF')
    expect(markup).toContain('aria-pressed="false"')
    expect(markup).not.toContain('aria-pressed="true"')
  })

  it('points at the criteria rather than reprinting them', () => {
    // §5.5's objectives block sits immediately above this one and
    // `signOffCriteria` derives from the same `frontmatter.objectives`, so
    // printing the list again put the same lines on screen twice inside 100px.
    // The count comes from the list itself, so the two cannot disagree.
    expect(markup).toContain(`${CRITERIA.objectives.length} objectives above`)
    expect(markup).toContain('href="#hl-objectives-head"')
    for (const objective of CRITERIA.objectives) expect(markup).not.toContain(objective)
    expect(markup).toContain(SIGN_OFF_ASSERTION)
  })

  it('carries the attribute §12.16\'s `s` shortcut clicks', () => {
    // The handler lives in the shell and has no page data in scope, so it finds
    // the control by attribute. The manifest's ninth column deliberately uses
    // `data-hl-signoff-cell`, so 32 non-interactive squares on the index can
    // never answer this selector and swallow the key.
    expect(markup).toContain(`data-hl-signoff="${SLUG}"`)
  })

  it('names the asserting party in the header strip', () => {
    expect(markup).toContain('SELF-ASSERTED')
  })

  it('offers no UNSIGN, because nothing is signed', () => {
    expect(markup).not.toContain('UNSIGN')
  })

  it('has no confirmation dialog anywhere near it (§12.4.1)', () => {
    expect(markup).not.toContain('role="dialog"')
    expect(words(markup)).not.toMatch(/are you sure|confirm/i)
  })

  it('does not ask for a name before anything has been signed (§12.3.2)', () => {
    expect(markup).not.toContain('<input')
    expect(markup).not.toContain('<form')
  })

  it('prints no revision drift line: nothing was signed against a revision', () => {
    expect(markup).not.toContain('AGAINST REV')
  })

  it('prints no NOT SAVED line: no write has been attempted (§12.1.4)', () => {
    expect(markup).not.toContain('NOT SAVED')
  })

  it('renders NOTHING on a sheet that is not drawn (§12.4.1)', () => {
    expect(
      renderToStaticMarkup(
        <SignOff slug={SLUG} criteria={CRITERIA} revision="b7225f8" drawn={false} />,
      ),
    ).toBe('')
  })
})

describe('QuickCheck — §12.6', () => {
  const QUESTION = 'Which of the four channels would you close first, and why?'
  const SUMMARY = '<p>The four channels are the prompt, the tools, the context and the log.</p>'
  const markup = renderToStaticMarkup(
    <QuickCheck slug={SLUG} question={QUESTION} summaryHtml={SUMMARY} />,
  )

  it('asks the question the sheet authored', () => {
    expect(markup).toContain(QUESTION)
  })

  it('reveals nothing before an answer is written', () => {
    expect(markup).not.toContain(SUMMARY)
    expect(markup).not.toContain('COMPARE WITH')
    expect(markup).not.toContain('MATCHED')
    expect(markup).not.toContain('DID NOT MATCH')
  })

  it('starts with an empty textarea, which is what the build knows', () => {
    expect(markup).toContain('<textarea')
    expect(markup).toMatch(/<textarea[^>]*rows="4"/)
    expect(markup).not.toContain('</textarea>x')
    expect(markup).toMatch(/<textarea[^>]*><\/textarea>/)
  })

  it('says what the reveal is waiting for rather than showing a dead control', () => {
    expect(words(markup)).toMatch(/summary can be compared once an answer is written/i)
  })

  it('states that this is self-assessment and nobody grades it', () => {
    expect(words(markup)).toMatch(/self-assessment/i)
    expect(words(markup)).toMatch(/not graded by anyone/i)
  })

  it('prints the flat award, never a tier (§12.5.1)', () => {
    expect(markup).toContain('+60 XP')
    expect(markup).not.toContain('40 XP')
    expect(markup).not.toContain('20 XP')
  })

  it('never calls the summary an answer (§12.6)', () => {
    expect(words(markup)).not.toMatch(/model answer|the answer/i)
  })

  it('reveals nothing on a sheet with no authored summary either', () => {
    const bare = renderToStaticMarkup(
      <QuickCheck slug={SLUG} question={QUESTION} summaryHtml={null} />,
    )
    expect(bare).toContain(QUESTION)
    expect(bare).not.toContain('MATCHED')
  })
})

describe('Submittal — §12.9', () => {
  const markup = renderToStaticMarkup(<Submittal slug={SLUG} />)

  it('names itself as §12.9.1 writes it', () => {
    expect(markup).toContain('SUBMITTAL — REGISTER WHAT YOU BUILT')
  })

  it('states an empty register rather than nagging about it', () => {
    expect(markup).toContain('NO SUBMITTAL REGISTERED')
    expect(markup).toContain('0 OF 3')
    expect(words(markup)).not.toMatch(/add your first|get started|nothing here yet/i)
  })

  it('offers the form, with the repository field named in words', () => {
    expect(markup).toContain('hl-submittal-form')
    expect(markup).toContain('Repository')
  })

  /**
   * §12.9.3 — a reader typed "project added" into COMMIT and was told, only
   * after submitting, that it wanted hexadecimal characters. REPOSITORY had
   * carried a format example since §12.9 and COMMIT carried nothing, so the
   * only way to learn the format was to get it wrong — and the field directly
   * below COMMIT is free text, which makes typing a message there the natural
   * reading rather than a careless one.
   */
  it('states the commit format BEFORE the reader can get it wrong', () => {
    expect(words(markup)).toMatch(/7 to 40 hexadecimal characters/)
    // An example as well as the rule, exactly as the repository field does.
    expect(words(markup)).toMatch(/a1b2c3d/)
  })

  it('gives both format hints their own describing element', () => {
    // Two hints, two ids, both wired: a hint the field does not point at is a
    // hint a screen reader never reaches.
    const described = [...markup.matchAll(/aria-describedby="([^"]+)"/g)].map((m) => m[1])
    const ids = [...markup.matchAll(/class="hl-field-hint[^"]*" id="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(2)
    for (const id of ids) {
      expect(described.some((value) => value.split(/\s+/).includes(id)), id).toBe(true)
    }
  })

  it('keeps the hint and the error saying the same thing', () => {
    // One string, used twice. The rule used to live only inside the error
    // branch, which is exactly how the hint came to be missing.
    const rule = '7 to 40 hexadecimal characters'
    const source = readFileSync(
      join(import.meta.dirname, '../../../src/components/record/Submittal.tsx'),
      'utf8',
    )
    expect(source.match(new RegExp(rule, 'g')) ?? []).toHaveLength(1)
    expect(source).toContain('COMMIT_RULE')
  })

  it('does not let the browser write the copy (§12.14.1)', () => {
    // A rejected `type="url"` field produces a UA bubble that says "Please
    // enter a URL", which is copy this site does not use.
    expect(markup).not.toContain('type="url"')
    expect(markup).toMatch(/<form[^>]*novalidate/i)
  })

  it('renders the RECONSTRUCTED url for a deep link, as href and as label', () => {
    // The whole path, through the real validator and the real reducer.
    const parsed = parseRepo('https://github.com/cevheri/hidden-line/tree/main/src?tab=readme')
    expect(parsed).not.toBeNull()

    const data = addSubmittal(
      EMPTY_RECORD,
      SLUG,
      {
        owner: parsed!.owner,
        repo: parsed!.repo,
        url: parsed!.url,
        commit: 'a1b2c3d',
        note: 'A static LMS with a record of work',
        at: '',
      },
      '2026-08-31T09:00:00.000Z',
    )
    const entry = data.sheets[SLUG].submittals[0]
    const row = renderToStaticMarkup(<SubmittalEntry entry={entry} slug={SLUG} index={0} />)

    expect(entry.url).toBe('https://github.com/cevheri/hidden-line')
    expect(row).toContain('href="https://github.com/cevheri/hidden-line"')
    expect(row).toContain('>https://github.com/cevheri/hidden-line</a>')
    // Nothing from the input beyond the two validated segments reaches the page.
    expect(row).not.toContain('tree/main')
    expect(row).not.toContain('tab=readme')
  })

  it('opens a submittal safely and says the commit was never fetched', () => {
    const data = addSubmittal(
      EMPTY_RECORD,
      SLUG,
      { owner: 'o', repo: 'r', url: '', commit: 'a1b2c3d', note: '', at: '' },
      '2026-08-31T09:00:00.000Z',
    )
    const row = renderToStaticMarkup(
      <SubmittalEntry entry={data.sheets[SLUG].submittals[0]} slug={SLUG} index={0} />,
    )
    expect(row).toContain('rel="noopener noreferrer"')
    expect(row).toContain('target="_blank"')
    expect(row).toContain('COMMIT a1b2c3d')
    expect(words(row)).toContain('supplied by reader; not fetched or verified by this application')
  })
})

describe('SheetStamps — §7.4 in the title block', () => {
  const markup = renderToStaticMarkup(<SheetStamps slug={SLUG} fact={FACT} />)

  it('draws the slots the corpus supplies, and no others', () => {
    expect(markup).toContain('hl-stamp-grid')
    expect(markup).toContain('SIGN-OFF')
    expect(markup).toContain('QUIZ')
    expect(markup).toContain('CHECKLIST')
    expect(markup).toContain('SOURCES')
  })

  it('earns nothing, and states every threshold against a live count (§12.5.4)', () => {
    expect(markup).not.toContain('data-earned="true"')
    expect(markup).toContain('0 OF 8')
    expect(markup).toContain('0 OF 5')
  })

  it('omits the CHECKLIST slot on a sheet with no checklist (§7.4)', () => {
    const markup = renderToStaticMarkup(
      <SheetStamps slug={SLUG} fact={{ ...FACT, checklistItems: 0 }} />,
    )
    expect(markup).not.toContain('CHECKLIST')
    expect(markup).toContain('SIGN-OFF')
  })

  it('renders nothing at all for a sheet that is not drawn', () => {
    expect(
      renderToStaticMarkup(<SheetStamps slug={SLUG} fact={{ ...FACT, drawn: false }} />),
    ).toBe('')
  })
})

describe('DrafterStamp — §12.3.5', () => {
  it('draws the seeded mark from the seed alone', () => {
    const markup = renderToStaticMarkup(<DrafterStamp mark={null} seed="a1b2c3d4" />)
    expect(markup).toContain('viewBox="0 0 24 24"')
    expect(markup).toContain('<path')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('draws a named glyph without consulting the seed', () => {
    expect(renderToStaticMarkup(<DrafterStamp mark="datum" seed={null} />)).toContain('<path')
  })

  it('renders nothing before a seed exists — never a substitute glyph', () => {
    expect(renderToStaticMarkup(<DrafterStamp mark={null} seed={null} />)).toBe('')
  })

  it('carries no colour and no fill of its own', () => {
    const markup = renderToStaticMarkup(<DrafterStamp mark="hex" seed={null} />)
    expect(markup).not.toMatch(/fill="(?!none)/)
    expect(markup).not.toContain('#')
  })
})

describe('SourceTracking — §12.8', () => {
  it('renders nothing: it is an enhancement on markup the build emitted', () => {
    expect(renderToStaticMarkup(<SourceTracking slug={SLUG} />)).toBe('')
  })
})

describe('the title block carries the reader (§12.3.1, §7.4)', () => {
  const rows = [{ label: 'DRAWING', value: '13' }]

  it('prints the CHECKED BY row when the sheet has one', () => {
    const markup = renderToStaticMarkup(
      <TitleBlock rows={rows} checkedBy={<CheckedBy slug={SLUG} />} />,
    )
    expect(markup).toContain('<dt>CHECKED BY</dt>')
    expect(markup).toContain('<dd>—</dd>')
  })

  it('adds the row to the strip as well as the panel', () => {
    const markup = renderToStaticMarkup(
      <TitleStrip rows={rows} checkedBy={<CheckedBy slug={SLUG} />} />,
    )
    expect(markup).toContain('<dt>CHECKED BY</dt>')
  })

  it('leaves the twelve derived rows and their order alone', () => {
    const markup = renderToStaticMarkup(<TitleBlock rows={rows} />)
    expect(markup).toContain('<dt>DRAWING</dt>')
    expect(markup).not.toContain('CHECKED BY')
  })

  it('renders no stamp grid when the sheet has no slots', () => {
    expect(renderToStaticMarkup(<TitleBlock rows={rows} stamps={null} />)).not.toContain('stamp')
  })

  it('gives a draft sheet no CHECKED BY row at all (§12.3.1)', () => {
    expect(carriesCheckedBy(DRAWN)).toBe(true)
    expect(carriesCheckedBy(NOT_DRAWN)).toBe(false)
  })
})

/**
 * §12.14.1 — the copy register, enforced rather than remembered.
 *
 * Every string this slice puts on a sheet goes through here. The scan is over
 * rendered TEXT, not markup: `data-invalid` is an attribute record.css owns and
 * is not something the page says to anybody.
 */
describe('§12.14.1 — the copy register', () => {
  const BANNED =
    /\b(easy|easily|just|simply|please|sorry|oops|invalid|great work|well done|nice try|you're all set|keep it up)\b/i

  const surfaces: Array<[string, string]> = [
    ['CheckedBy', renderToStaticMarkup(<CheckedBy slug={SLUG} />)],
    [
      'SignOff',
      renderToStaticMarkup(<SignOff slug={SLUG} criteria={CRITERIA} revision="b7225f8" drawn />),
    ],
    [
      'QuickCheck',
      renderToStaticMarkup(<QuickCheck slug={SLUG} question="Why?" summaryHtml="<p>Because.</p>" />),
    ],
    ['Submittal', renderToStaticMarkup(<Submittal slug={SLUG} />)],
    ['SheetStamps', renderToStaticMarkup(<SheetStamps slug={SLUG} fact={FACT} />)],
  ]

  it.each(surfaces)('%s carries no exclamation mark', (_name, markup) => {
    expect(words(markup)).not.toContain('!')
  })

  it.each(surfaces)('%s avoids the banned register', (_name, markup) => {
    expect(words(markup)).not.toMatch(BANNED)
  })

  it.each(surfaces)('%s never speaks as if the site were a person', (_name, markup) => {
    expect(words(markup)).not.toMatch(/\bI \b|\bwe\b|\bmy\b|I've|we've/i)
  })

  /**
   * §12.6 item 5 requires this sentence, in these words. Stating that nobody
   * grades the answer is the opposite of claiming a grade, so it is removed
   * before the scan rather than exempted from it — which also pins the wording.
   */
  const SANCTIONED = 'Self-assessment. Not graded by anyone.'

  it.each(surfaces)('%s claims no grade, score or mastery (§12.4.2)', (_name, markup) => {
    const text = words(markup).replace(SANCTIONED, ' ')
    expect(text).not.toMatch(
      /\b(passed|grade[ds]?|scored?|mastered|certified|qualified|competence)\b/i,
    )
  })
})
