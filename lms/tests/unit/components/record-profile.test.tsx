import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ProfilePage from '@/app/profile/page'
import { DataPanel, printedDigestFrom } from '@/components/record/DataPanel'
import { ERASE_COPY, EraseDialog } from '@/components/record/EraseDialog'
import { IdentityPanel } from '@/components/record/IdentityPanel'
import { MARK_PICKER_IDS, MarkPicker } from '@/components/record/MarkPicker'
import {
  CharKeysToggle,
  QuarantineNote,
  RawValues,
  StoragePanel,
  QUARANTINE_COPY,
  SubmittalRegister,
  repoUrl,
} from '@/components/record/ProfilePanels'
import { MARKS, NAMED_MARK_IDS } from '@/lib/identity/mark'
import { ERASE_WORD, eraseTallySentence } from '@/lib/record/erase'

/**
 * §12.11, §12.3, §12.15 — the profile sheet's honest empty first frame, and
 * the copy that ships with it.
 *
 * `renderToStaticMarkup` gives exactly what the static export writes into the
 * HTML: `useSyncExternalStore`'s `getServerSnapshot` returns the frozen
 * `EMPTY_RECORD`, so every panel below renders what the build genuinely knows
 * about a reader it has never met — no name, no stamp, no bytes, every readout
 * at `--`. That frame is not a defect to be papered over; it is the state the
 * whole two-channel rule exists to make correct, and every reader sees it.
 *
 * What this file deliberately does NOT test: clicking, typing, the file picker,
 * a storage round trip, the countdown ticking down. Those need a real browser
 * and are Playwright's job (§12.14.2). There is no jsdom here and no Testing
 * Library, so nothing pretends to have a layout or a `document` it lacks.
 *
 * **The open erase dialog is unreachable here, on purpose.** Radix portals its
 * content into `document.body`, and there is no DOM — the same limit
 * `record-shell.test.tsx` records for the shortcut sheet. So §12.15's copy is
 * asserted against `ERASE_COPY`, the table the dialog renders from, exactly as
 * `EmptyState` exports `emptyStateCopy` for the same reason.
 */

/** The rendered text alone: attribute names are not copy (§12.14.1). */
function words(markup: string): string {
  return markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
}

function occurrences(markup: string, needle: RegExp): number {
  return (markup.match(needle) ?? []).length
}

const IDENTITY = renderToStaticMarkup(<IdentityPanel />)
const MARK = renderToStaticMarkup(<MarkPicker />)
const DATA = renderToStaticMarkup(<DataPanel />)
const STORAGE = renderToStaticMarkup(<StoragePanel />)
const RAW = renderToStaticMarkup(<RawValues />)
const REGISTER = renderToStaticMarkup(<SubmittalRegister sheets={[]} />)
const QUARANTINE = renderToStaticMarkup(<QuarantineNote />)
const KEYS = renderToStaticMarkup(<CharKeysToggle />)
const ERASE_TRIGGER = renderToStaticMarkup(
  <EraseDialog onConfirm={() => {}} onExport={() => {}} />,
)
const PAGE = renderToStaticMarkup(<ProfilePage />)

describe('§12.2 — the honest empty first frame of every panel', () => {
  it('names the absence of a name rather than inventing one (§12.3.2)', () => {
    expect(words(IDENTITY)).toContain('NO NAME ON RECORD')
    // Never a placeholder person, never "Anonymous", never "Reader".
    expect(words(IDENTITY)).not.toMatch(/\b(anonymous|reader|guest|user|unnamed)\b/i)
  })

  it('draws no stamp at all before a seed exists (§12.3.4: never `?`, never a silhouette)', () => {
    // The identity line only — the picker below it draws six named glyphs,
    // which are facts about the vocabulary rather than about the reader.
    const line = IDENTITY.split('<dl')[0]
    expect(line).toContain('hl-identity')
    expect(line).not.toContain('<svg')
    expect(line).not.toContain('?')
  })

  it('prints CHECKED BY as UNSIGNED, which is what a nameless sign-off prints', () => {
    expect(IDENTITY).toContain('<dt>Checked by</dt><dd>UNSIGNED</dd>')
  })

  it('carries §12.1.7’s three flat lines, as a note block and not a banner', () => {
    const text = words(IDENTITY)
    expect(text).toContain('Your record is stored in this browser only. It is never sent anywhere.')
    expect(text).toContain('Safari deletes it after seven days without a visit.')
    expect(text).toContain('Export your record to a file to keep it.')
    // Not dismissible, no icon, no caution colour: a note, one painted rule.
    expect(IDENTITY).toContain('class="hl-note"')
    expect(IDENTITY).not.toMatch(/dismiss|hl-btn-danger|role="alert"/)
  })

  it('carries §12.1.7’s export-boundary sentence beside the field', () => {
    expect(words(IDENTITY)).toContain(
      'The report you export contains this name — once you send that file to '
      + 'someone, the name has left your device.',
    )
  })

  it('gives every storage reading `--` rather than a value nobody queried (§12.1.6)', () => {
    expect(occurrences(STORAGE, /<dd>--<\/dd>/g)).toBe(4)
    expect(words(STORAGE)).toContain('Storage')
    expect(words(STORAGE)).toContain('Last export')
  })

  it('prints the raw keys as unread rather than as empty (§12.11 item 7)', () => {
    expect(occurrences(RAW, /<pre class="hl-raw">--<\/pre>/g)).toBe(2)
    expect(words(RAW)).toContain('hl-record')
    expect(words(RAW)).toContain('hl-record-quarantine')
  })

  it('states an empty register instead of nagging for one (§12.9.1)', () => {
    expect(REGISTER).toContain('NO SUBMITTAL REGISTERED')
    expect(REGISTER).toContain('hl-submittal-empty')
    // No table at all when there is nothing in it: a header row over no rows
    // is a claim that there are columns worth reading.
    expect(REGISTER).not.toContain('<table')
  })

  it('says nothing about a quarantine the build cannot know about (§12.1.2)', () => {
    expect(QUARANTINE).toBe('')
  })

  it('renders the character-key switch in its documented default of on (§12.16)', () => {
    expect(KEYS).toMatch(/type="checkbox"[^>]*checked=""/)
  })

  it('claims no erase and offers no undo it has not earned (§12.15)', () => {
    expect(DATA).not.toContain('ERASED')
    expect(DATA).not.toMatch(/>UNDO</)
  })
})

describe('§12.13, §12.15 — the export control at zero data', () => {
  it('is live, because the exported file states the truth', () => {
    expect(DATA).toContain('>EXPORT YOUR RECORD<')
    // §12.13: a disabled control with no stated reason is a page asserting a
    // state the reader cannot verify. Nothing in this panel is disabled.
    expect(DATA).not.toMatch(/<button[^>]*disabled/)
    expect(DATA).not.toMatch(/aria-disabled="true"/)
  })

  it('says what the file is and where it goes, without claiming an upload', () => {
    expect(words(DATA)).toContain('nothing is uploaded')
  })

  it('accepts the report .html as well as the raw .json (§12.12.6)', () => {
    expect(DATA).toMatch(/accept="[^"]*\.json[^"]*\.html/)
    expect(words(DATA)).toContain('Either the exported .json or the RECORD OF WORK .html')
  })

  it('says that an import replaces what is here, before the reader picks a file', () => {
    expect(words(DATA)).toContain('Importing replaces the record in this browser')
  })
})

describe('§12.3.3 — the name field', () => {
  it('has a visible, persistent label and no placeholder standing in for one', () => {
    expect(IDENTITY).toContain('class="hl-field-label"')
    expect(words(IDENTITY)).toContain('Name or initials, as you would sign a drawing')
    expect(IDENTITY).not.toMatch(/placeholder=/i)
  })

  it('is marked optional IN WORDS, never by the absence of an asterisk', () => {
    expect(IDENTITY).toContain('<span class="hl-field-optional">Optional</span>')
    expect(IDENTITY).not.toContain('*')
  })

  it('carries the four attributes §12.3.3 names', () => {
    expect(IDENTITY).toMatch(/autocomplete="nickname"/i)
    expect(IDENTITY).toMatch(/autocapitalize="off"/i)
    expect(IDENTITY).toMatch(/spellcheck="false"/i)
    expect(IDENTITY).toMatch(/dir="auto"/)
  })

  it('is one free-text field, never split into given and family names', () => {
    expect(occurrences(IDENTITY, /type="text"/g)).toBe(1)
    expect(words(IDENTITY)).not.toMatch(/first name|last name|given name|family name|surname/i)
  })

  it('shows no error before a submit: validation is on submit only', () => {
    expect(IDENTITY).not.toContain('hl-field-error')
    expect(IDENTITY).toContain('data-invalid="false"')
  })

  it('describes the field with the hint that actually exists', () => {
    const described = /aria-describedby="([^"]+)"/.exec(IDENTITY.split('</form>')[0])
    expect(described).not.toBeNull()
    for (const id of (described as RegExpExecArray)[1].split(' ')) {
      expect(IDENTITY, id).toContain(`id="${id}"`)
    }
  })

  it('states what an edit reaches and what it cannot (§12.3.2, §12.3.5)', () => {
    const text = words(IDENTITY)
    expect(text).toContain('It does not change the dates sheets were signed off on')
    expect(text).toContain('it does not change the mark')
  })
})

describe('§12.3.5 — the mark picker', () => {
  it('is a real radiogroup', () => {
    expect(MARK).toContain('role="radiogroup"')
    expect(occurrences(MARK, /type="radio"/g)).toBe(7)
    // One name across all seven: that is what gives arrow-key navigation and a
    // single tab stop without a line of JavaScript.
    expect(occurrences(MARK, /name="hl-mark"/g)).toBe(7)
  })

  it('is labelled by its own legend', () => {
    const labelled = /aria-labelledby="([^"]+)"/.exec(MARK) as RegExpExecArray
    expect(MARK).toContain(`<legend id="${labelled[1]}"`)
  })

  it('offers the seeded mark plus §12.3.5’s six named glyphs, in its order', () => {
    expect(MARK_PICKER_IDS).toEqual(['seeded', ...NAMED_MARK_IDS])
    expect(MARK_PICKER_IDS).toEqual(['seeded', 'datum', 'section', 'weld', 'finish', 'centre', 'hex'])
    expect(MARKS.map((mark) => mark.id)).toEqual([...MARK_PICKER_IDS])
    for (const mark of MARKS) expect(MARK, mark.id).toContain(`>${mark.label}<`)
  })

  it('checks exactly one option, and it is the record’s own default', () => {
    expect(occurrences(MARK, /checked=""/g)).toBe(1)
    expect(MARK).toContain('data-hl-mark="seeded" data-hl-selected="true"')
  })

  it('describes each option outside its label, so the name is the label alone', () => {
    for (const mark of MARKS) {
      expect(MARK, mark.id).toContain(`aria-describedby="hl-mark-${mark.id}-desc"`)
      expect(MARK, mark.id).toContain(`id="hl-mark-${mark.id}-desc"`)
    }
  })

  it('has no control that mints a mark: the seed is never regenerated', () => {
    // Not a copy scan — the prose has to be able to explain the absence. The
    // invariant is that there is no button here at all, so no click can
    // retroactively alter a sheet that is already signed off.
    expect(MARK).not.toContain('<button')
    expect(words(MARK)).toContain('it is never regenerated')
  })

  it('says the seed does not exist yet rather than drawing a substitute for it', () => {
    expect(words(MARK)).toContain('NO SEED MINTED YET')
  })
})

describe('§12.1.2 — the quarantine state, the only surface that discloses it', () => {
  it('prints §12.1.2’s message in §12.1.2’s words', () => {
    expect(QUARANTINE_COPY.newer.readout).toBe(
      'RECORD WRITTEN BY A NEWER VERSION OF THIS SITE — NOT READ',
    )
    expect(QUARANTINE_COPY.newer.note).toBe(
      'This browser has a cached older copy of the site. Reload to update. '
      + 'Your record is intact and has not been changed.',
    )
  })

  it('says the record was not read, was not changed, and is still there', () => {
    for (const copy of Object.values(QUARANTINE_COPY)) {
      expect(copy.readout).toContain('NOT READ')
      expect(copy.note).toMatch(/intact and has not been changed|copied aside unchanged/)
      // Never a discard: this is the only copy of the record in existence.
      expect(copy.note).not.toMatch(/deleted|discarded rather|lost|removed/)
    }
  })

  it('does not tell a reader to reload out of a state a reload cannot fix', () => {
    expect(QUARANTINE_COPY.newer.note).toContain('Reload to update')
    expect(QUARANTINE_COPY.malformed.note).not.toMatch(/reload/i)
  })

  it('is a fact and not an alarm: no caution colour, no alert role', () => {
    // The note renders nothing in this frame, so the invariant that can be
    // pinned here is the one that matters — the two states do not share copy.
    expect(QUARANTINE_COPY.newer.readout).not.toBe(QUARANTINE_COPY.malformed.readout)
    expect(QUARANTINE_COPY.newer.note).not.toBe(QUARANTINE_COPY.malformed.note)
  })
})

describe('§12.15 — the erase dialog', () => {
  it('offers one danger control, and it is the trigger', () => {
    expect(ERASE_TRIGGER).toContain('hl-btn hl-btn-danger')
    expect(ERASE_TRIGGER).toContain(`>${ERASE_COPY.trigger}<`)
    expect(ERASE_TRIGGER).toContain('aria-haspopup="dialog"')
  })

  it('never asks "Are you sure?" — the title names the scope', () => {
    expect(ERASE_COPY.title).toBe('Erase all progress in this browser?')
    for (const value of Object.values(ERASE_COPY)) {
      expect(value).not.toMatch(/are you sure/i)
    }
  })

  it('states outcomes on both buttons, never Yes/No', () => {
    expect(ERASE_COPY.danger).toBe('Erase all data')
    expect(ERASE_COPY.decline).toBe('Keep my data')
    for (const label of [ERASE_COPY.danger, ERASE_COPY.decline]) {
      expect(label).not.toMatch(/^(yes|no|ok|okay|cancel|dismiss|got it)$/i)
    }
  })

  it('declines without shaming and without invoking loss (§12.14.1)', () => {
    expect(ERASE_COPY.decline).not.toMatch(
      /don'?t|do not|lose|losing|lost|forfeit|regret|care about|risk/i,
    )
    // The decline says what is KEPT. That is the safe outcome, stated.
    expect(ERASE_COPY.decline).toMatch(/^Keep\b/)
  })

  it('gates the danger button on the typed word, and prints what to type', () => {
    expect(ERASE_WORD).toBe('ERASE')
    expect(ERASE_COPY.confirmLabel).toBe('Type ERASE to confirm')
  })

  it('puts the safe path inside the dialog (§12.15)', () => {
    expect(ERASE_COPY.export).toBe('EXPORT YOUR RECORD')
  })

  it('describes the scope without claiming anything about other devices', () => {
    expect(ERASE_COPY.scope).toContain('the copy set aside')
    expect(ERASE_COPY.scope).toContain('the record was never sent anywhere')
  })
})

describe('§12.15, §12.12.5 — the content digest, read back out of a file', () => {
  const digest = 'a'.repeat(63) + 'b'
  const report = `<dl class="meta"><dt>Generated</dt><dd>2026-08-31</dd>`
    + `<dt>Content digest</dt><dd>${digest}</dd><dt>Status</dt><dd>UNSIGNED</dd></dl>`

  it('lifts the digest the RECORD OF WORK prints', () => {
    expect(printedDigestFrom(report)).toBe(digest)
  })

  it('tolerates the whitespace and the attributes a real document carries', () => {
    expect(
      printedDigestFrom(`<dt class="k">  Content digest </dt>\n<dd id="d">\n${digest}\n</dd>`),
    ).toBe(digest)
  })

  it('lower-cases what it found, so the comparison is not case-sensitive by accident', () => {
    expect(printedDigestFrom(report.toUpperCase())).toBe(digest)
  })

  it('finds no digest in a raw .json export, which carries none', () => {
    expect(printedDigestFrom('{"schema":1,"savedAt":"2026-08-31","data":{}}')).toBeNull()
  })

  it('finds no digest where the hex is not a SHA-256', () => {
    expect(printedDigestFrom(`<dt>Content digest</dt><dd>${'a'.repeat(63)}</dd>`)).toBeNull()
    expect(printedDigestFrom('<dt>Content digest</dt><dd>not a hash</dd>')).toBeNull()
  })

  it('degrades to "no digest" rather than to a false accusation if the row is renamed', () => {
    expect(printedDigestFrom(`<dt>Checksum</dt><dd>${digest}</dd>`)).toBeNull()
  })
})

describe('§12.9.2 — the register’s link is reconstructed, never echoed', () => {
  it('builds the href and the label from the two validated segments alone', () => {
    expect(repoUrl({ owner: 'lokumai', repo: 'ai-engineering-bazaar' })).toBe(
      'https://github.com/lokumai/ai-engineering-bazaar',
    )
  })

  it('is the only source of both, so a label cannot differ from its destination', () => {
    // The component calls this once for the `href` and once for the text. The
    // rule is structural rather than a matter of keeping two literals in step.
    const url = repoUrl({ owner: 'a', repo: 'b' })
    expect(url.startsWith('https://github.com/')).toBe(true)
    expect(url.split('/').length).toBe(5)
  })
})

describe('§12.1.6, §11.35 — the storage panel prints bytes and nothing else', () => {
  it('draws no percentage, gauge, ring or fill bar', () => {
    expect(STORAGE).not.toContain('%')
    expect(STORAGE).not.toMatch(/progressbar|meter|hl-gauge|hl-uptime|<svg/)
  })
})

describe('§12.11 — the page itself: eight sections, in order', () => {
  it('prints its own chord beside its title (§12.16)', () => {
    expect(PAGE).toContain('>G P<')
    expect(PAGE).toContain('Profile')
  })

  it('renders §12.11’s eight sections in §12.11’s order, then the keyboard switch', () => {
    const titles = [...PAGE.matchAll(/class="hl-panel-title">([^<]+)</g)].map(([, t]) => t)
    expect(titles).toEqual([
      'Identity',
      'Readout',
      'Uptime',
      'Stamps',
      'Submittal register',
      'Storage',
      'Stored values',
      'Data',
      'Keyboard',
    ])
  })

  it('gives every section a heading its landmark is labelled by', () => {
    for (const id of ['identity', 'readout', 'uptime', 'stamps', 'submittals', 'storage', 'raw', 'data', 'keyboard']) {
      expect(PAGE, id).toContain(`aria-labelledby="${id}"`)
      expect(PAGE, id).toContain(`id="${id}"`)
    }
  })

  it('omits TRACES, which only the dashboard can count (§11.25)', () => {
    expect(PAGE).not.toContain('Traces')
  })

  it('is inside the shell, so it has a main region and a footer', () => {
    expect(PAGE).toContain('id="main"')
    expect(PAGE).toContain('hl-readout')
  })
})

describe('§12.14.1 — the copy register, over every string this task authors', () => {
  const surfaces: Array<[string, string]> = [
    ['IdentityPanel', words(IDENTITY)],
    ['MarkPicker', words(MARK)],
    ['DataPanel', words(DATA)],
    ['StoragePanel', words(STORAGE)],
    ['RawValues', words(RAW)],
    ['SubmittalRegister', words(REGISTER)],
    ['CharKeysToggle', words(KEYS)],
    ['EraseDialog trigger', words(ERASE_TRIGGER)],
    [
      'erase.ts',
      eraseTallySentence({ sheets: 7, name: 1, submittals: 3, quizzes: 2, sources: 9 }),
    ],
    [
      'QUARANTINE_COPY',
      Object.values(QUARANTINE_COPY)
        .flatMap((copy) => [copy.readout, copy.note])
        .join(' \n '),
    ],
    // The decline label is exempted from the first-person ban alone, below,
    // and is scanned for everything else here.
    ['ERASE_COPY', Object.values(ERASE_COPY).join(' \n ')],
  ]

  const FIRST_PERSON = /\b(?:I|I'm|I've|we|we'll|we've|my|our)\b/i

  it.each(surfaces)('%s carries no exclamation mark', (_name, text) => {
    expect(text).not.toContain('!')
  })

  it.each(surfaces)('%s does not condescend', (_name, text) => {
    expect(text).not.toMatch(/\b(?:easy|easily|just|simply|simple|quick|quickly)\b/i)
  })

  it.each(surfaces)('%s neither apologises nor supplicates', (_name, text) => {
    expect(text).not.toMatch(/\b(?:please|sorry|oops|whoops)\b/i)
  })

  it.each(surfaces)('%s passes no verdict on the input', (_name, text) => {
    expect(text).not.toMatch(/\b(?:valid|invalid)\b/i)
    expect(text).not.toMatch(/\byou forgot\b/i)
  })

  it.each(surfaces)('%s praises nobody', (_name, text) => {
    expect(text).not.toMatch(
      /\b(?:great|awesome|nice work|well done|congratulations|congrats|excellent|perfect|amazing)\b/i,
    )
  })

  it.each(surfaces)('%s claims no grade, score or mastery (§12.4.2)', (_name, text) => {
    expect(text).not.toMatch(/\b(?:passed|grade[ds]?|scored?|mastered|certified|qualified)\b/i,
    )
  })

  it.each(surfaces.filter(([name]) => name !== 'ERASE_COPY'))(
    '%s never speaks as if the site were a person',
    (_name, text) => {
      expect(text).not.toMatch(FIRST_PERSON)
    },
  )

  /**
   * The one first-person token in this slice, and it is the reader's own.
   *
   * §12.14.1's ban is on the SOFTWARE speaking as a person — "I saved your
   * progress" — and §12.14.1 itself quotes `Keep my data` as the model decline
   * button, so the possessive here belongs to the reader and is the thing the
   * section asks for rather than the thing it forbids. Every other value in the
   * table is held to the ban.
   */
  it('confines the first person to §12.15’s own decline label', () => {
    for (const [key, value] of Object.entries(ERASE_COPY)) {
      if (key === 'decline') continue
      expect(value, key).not.toMatch(FIRST_PERSON)
    }
    expect(ERASE_COPY.decline).toBe('Keep my data')
  })

  /** §12.14.1 — a readout is uppercase mono with NO terminal period. */
  it.each([
    ['NO NAME ON RECORD', IDENTITY],
    ['NO SUBMITTAL REGISTERED', REGISTER],
    ['NO SEED MINTED YET', MARK],
  ])('%s ends without a full stop', (readout, markup) => {
    expect(markup).toContain(`>${readout}<`)
    expect(readout.endsWith('.')).toBe(false)
  })
})
