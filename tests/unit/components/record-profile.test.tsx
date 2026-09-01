import { renderToStaticMarkup } from 'react-dom/server'
import { NAME_FROM_ADDRESS, RECORD_SCOPE } from '@/lib/record/scope'
import { describe, expect, it } from 'vitest'
import ProfilePage, { REGISTER_ROWS } from '@/app/profile/page'
import { DataPanel, printedDigestFrom } from '@/components/record/DataPanel'
import { DrafterBlock } from '@/components/record/DrafterBlock'
import { ERASE_COPY, EraseDialog } from '@/components/record/EraseDialog'
import { IdentityPanel } from '@/components/record/IdentityPanel'
import { MARK_PICKER_IDS, MarkPicker, NO_SEED_MINTED } from '@/components/record/MarkPicker'
import {
  CharKeysToggle,
  DATA_READING,
  QuarantineNote,
  RawValues,
  StoragePanel,
  QUARANTINE_COPY,
  SubmittalRegister,
  repoUrl,
} from '@/components/record/ProfilePanels'
import { offeredMark } from '@/components/record/RolePanel'
import { MARKS, NAMED_MARK_IDS } from '@/lib/identity/mark'
import { ROLES } from '@/lib/path/roles'
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
const DRAFTER = renderToStaticMarkup(<DrafterBlock />)

/**
 * §16.2 — the picker with an offer on it, and the two shapes that offer takes.
 *
 * `weld` is offered but not selected, which is the state a reader with a role
 * and a chosen mark is in: the marker has to be visible on a cell the selection
 * is not on. `seeded` is offered AND selected, which is the only way a static
 * render can reach the shared description line's offer clause — the line prints
 * the pointed-at option, else the focused one, else the selection, and there is
 * no pointer and no focus without a DOM.
 */
const MARK_OFFERED = renderToStaticMarkup(<MarkPicker offered="weld" />)
const MARK_OFFERED_SEEDED = renderToStaticMarkup(<MarkPicker offered="seeded" />)

/**
 * Every text node in `markup` that is a readout: uppercase mono, in the register
 * of §12.14.1's second column. Measured rather than listed, so a readout added
 * anywhere on this page is scanned by the property below without being enrolled
 * in it by hand.
 *
 * The filter is "has letters and none of them are lower case", which is exactly
 * what makes a string a readout on this site; `--`, the numerals and the mark
 * glyphs' `d` attributes fall out because they are attributes, not text.
 */
/** The shared description line's own content, by the id every radio points at. */
function noteLineOf(markup: string): string {
  const found = /class="hl-markrow-note" id="[^"]*">(.*?)<\/p>/.exec(markup)
  expect(found, 'the shared description line').not.toBeNull()
  return (found as RegExpExecArray)[1]
}

/**
 * One register row's closed line, located by the id on its `h2`. The row is a
 * `<summary>`, so this is exactly the text a reader sees before opening
 * anything — which is what §16.4.1 is a rule about.
 */
function summaryOf(markup: string, id: string): string {
  const found = new RegExp(`<summary[^>]*><h2 id="${id}"[\\s\\S]*?</summary>`).exec(markup)
  expect(found, id).not.toBeNull()
  return (found as RegExpExecArray)[0]
}

function readouts(markup: string): string[] {
  return words(markup)
    .split(/\s{2,}/)
    .map((run) => run.trim())
    .filter((run) => /[A-ZÇĞİÖŞÜ]/.test(run) && !/[a-zçğıöşü]/.test(run) && run.length >= 3)
}

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
    // §14 moved this sentence into `lib/record/scope.ts` and made it true again:
    // Phase 4 sends the record to `record_state`, so "never sent anywhere" was
    // false the moment the sync landed. Asserted through the constant rather
    // than as a literal, so the copy and its one definition cannot drift.
    expect(text).toContain(words(RECORD_SCOPE))
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
    // Eight since §13.14 appended `lokum` (§13.6). Derived from the vocabulary
    // rather than written as a literal, so the next amendment moves it here.
    expect(occurrences(MARK, /type="radio"/g)).toBe(MARKS.length)
    // One name across all of them: that is what gives arrow-key navigation and
    // a single tab stop without a line of JavaScript.
    expect(occurrences(MARK, /name="hl-mark"/g)).toBe(MARKS.length)
  })

  it('is labelled by its own legend', () => {
    const labelled = /aria-labelledby="([^"]+)"/.exec(MARK) as RegExpExecArray
    expect(MARK).toContain(`<legend id="${labelled[1]}"`)
  })

  it('offers the seeded mark plus the seven named glyphs, in its order', () => {
    expect(MARK_PICKER_IDS).toEqual(['seeded', ...NAMED_MARK_IDS])
    // The literal is kept alongside the derived form on purpose: it is what
    // catches a glyph being inserted into the middle of the list rather than
    // appended, which would move a mark a reader had already chosen. §13.6's
    // `lokum` is eighth for exactly that reason.
    expect(MARK_PICKER_IDS)
      .toEqual(['seeded', 'datum', 'section', 'weld', 'finish', 'centre', 'hex', 'lokum'])
    expect(MARKS.map((mark) => mark.id)).toEqual([...MARK_PICKER_IDS])
    for (const mark of MARKS) expect(MARK, mark.id).toContain(`>${mark.label}<`)
  })

  it('checks exactly one option, and it is the record’s own default', () => {
    expect(occurrences(MARK, /checked=""/g)).toBe(1)
    expect(MARK).toContain('data-hl-mark="seeded" data-hl-selected="true"')
  })

  /**
   * §16.2, hazard H-E — the eight `aria-describedby` pairs this used to pin are
   * gone, and their absence is the change rather than a regression.
   *
   * The old assertion pinned `aria-describedby="hl-mark-<id>-desc"` and a
   * matching `id` for each of the eight options: eight descriptions rendered at
   * once, which is what §16.0 measured as the reason the page's two real
   * controls sat ~700 words apart. §16.2 keeps every description — `MARKS` still
   * carries all eight and `mark.test.ts` still guarantees it — and prints
   * whichever one the reader is pointing at in ONE line below the row. So the
   * property is re-expressed at the level it now holds: one group, one shared
   * description, and that description element present in the document rather
   * than pointed at and missing, which is the failure an `aria-describedby` can
   * have without any visible symptom.
   */
  it('describes the whole group through one line that exists in the document', () => {
    const described = [...MARK.matchAll(/aria-describedby="([^"]+)"/g)].map(([, id]) => id)
    // One per radio, and all of them the same id: eight ids would be eight
    // paragraphs in the accessibility tree of the control built to stop having
    // eight.
    expect(described).toHaveLength(MARKS.length)
    expect(new Set(described).size).toBe(1)
    expect(MARK, described[0]).toContain(`id="${described[0]}"`)
    // And it is not pointed at an empty element: the line prints the option the
    // group is currently on, which on the prerender is the record's default.
    const line = new RegExp(`id="${described[0]}"[^>]*>(.*?)</p>`).exec(MARK) as RegExpExecArray
    const seeded = MARKS.find((mark) => mark.id === 'seeded') as (typeof MARKS)[number]
    expect(words(line[1])).toContain(seeded.description)
    expect(words(line[1])).toContain(seeded.label)
  })

  it('keeps all eight descriptions in the vocabulary, one of them on screen', () => {
    // The descriptions were MOVED, not deleted. Asserted against `MARKS` because
    // that is where they live; the row renders one at a time by design.
    for (const mark of MARKS) expect(mark.description.trim().length).toBeGreaterThan(0)
    const shown = MARKS.filter((mark) => words(MARK).includes(mark.description))
    expect(shown).toHaveLength(1)
  })

  it('has no control that mints a mark: the seed is never regenerated', () => {
    // Not a copy scan — the prose has to be able to explain the absence. The
    // invariant is that there is no button here at all, so no click can
    // retroactively alter a sheet that is already signed off.
    expect(MARK).not.toContain('<button')
    expect(words(MARK)).toContain('it is never regenerated')
  })

  it('says the seed does not exist yet rather than drawing a substitute for it', () => {
    expect(words(MARK)).toContain(NO_SEED_MINTED)
  })
})

/**
 * §16.2.1, §13.6 — the role's offer, which is now one marked cell rather than a
 * second copy of the whole picker.
 *
 * The hazard this closes: `MarkOffer` was deleted, and with it the two confirm
 * buttons and the eight duplicate cards. What has to survive is the guarantee
 * §13.6 was built for — an offer writes nothing — plus the thing a deleted
 * component can silently take with it: the offer being READABLE. A tint on one
 * cell is not a marking (§2.2's colour rule and §16.2.3), so the words are
 * asserted, not the attribute alone.
 *
 * The offer is resolved through `offeredMark` for every role in `ROLES` rather
 * than for one hand-picked role, so a role whose `suggestedMark` stops naming a
 * drawable glyph is caught here. `roles.ts` types that field as `string`
 * precisely because it imports nothing, which makes this boundary the only
 * place it is checked.
 */
describe('§16.2.1 — the offered mark is a marking, and it is words', () => {
  it.each(ROLES.map((role) => [role.id, role] as const))(
    '%s: exactly one cell carries the offer, and it is the mark the role names',
    (_id, role) => {
      const offered = offeredMark(role)
      // Every role in the set offers a mark the geometry can draw; a null here
      // would mean `suggestedMark` names a glyph that does not exist.
      expect(offered).toBe(role.suggestedMark)
      const markup = renderToStaticMarkup(<MarkPicker offered={offered} />)

      const marked = [...markup.matchAll(/data-hl-mark="([^"]+)" data-hl-selected="[^"]*" data-hl-offered="true"/g)]
      expect(marked).toHaveLength(1)
      expect(marked[0][1]).toBe(offered)
    },
  )

  it('states the offer in words inside the offered cell, never as a tint alone', () => {
    expect(occurrences(MARK_OFFERED, /OFFERED FOR YOUR ROLE/g)).toBe(1)
    // Inside the cell the words are aria-hidden, because a label's accessible
    // name is computed from its whole content and §16.2.3 fixes that name at
    // the mark's own name. The fact reaches a screen reader through the shared
    // description instead — which is the second shape asserted below.
    expect(MARK_OFFERED).toMatch(/class="hl-markrow-offered" aria-hidden="true">OFFERED FOR YOUR ROLE</)
  })

  it('carries the offer into the shared description, which is not aria-hidden', () => {
    const note = /class="hl-markrow-note" id="[^"]*">(.*?)<\/p>/.exec(
      MARK_OFFERED_SEEDED,
    ) as RegExpExecArray
    expect(words(note[1])).toContain('OFFERED FOR YOUR ROLE')
    expect(note[1]).not.toContain('aria-hidden')
  })

  it('marks nothing at all when no role is on record (§11.25)', () => {
    // The prerendered page: `EMPTY_RECORD.identity.role` is null, so there is
    // no offer to make and no cell is marked. A glyph marked as offered by
    // nobody would be worse than an unmarked row.
    expect(MARK).not.toContain('data-hl-offered')
    expect(PAGE).not.toContain('data-hl-offered')
    expect(words(PAGE)).not.toContain('OFFERED FOR YOUR ROLE')
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

  it('describes the scope, including the copy the account holds (§14.6)', () => {
    expect(ERASE_COPY.scope).toContain('the copy set aside')
    // The old assertion pinned 'the record was never sent anywhere', which
    // Phase 4 made false: §14.7 sends the record to `record_state`. A test that
    // holds a lie in place is worse than an absent one, because it defends it.
    expect(ERASE_COPY.scope).not.toContain('never sent anywhere')
    expect(ERASE_COPY.scope).toContain('account')
    // §14.6's third row: an organisation's history is not erasable from here.
    expect(ERASE_COPY.history).toMatch(/organisation/i)
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

/**
 * §16.1, §16.4 — the page itself: one open block, then one register.
 *
 * **What the two assertions below replaced, and why they are not a list any
 * more.** Both pinned the eleven panels as a hand-typed sequence: eleven
 * `hl-panel-title` strings in order, and the same eleven ids again as a second
 * literal. §16 folds nine of those panels into register rows, so a list would
 * have had to be retyped — and a list retyped is a second author of an order the
 * page already holds. `REGISTER_ROWS` is exported from `profile/page.tsx` for
 * exactly this reason (hazard H-P): the page maps over that array, so what
 * ships and what is asserted are the same array in the same order.
 *
 * **The order is still ORDERED.** §16.4 fixes the sequence — Readout, Uptime,
 * Stamps, Submittal register, Role and path, Organisation, Storage, Stored
 * values, Export/import/erase, Keyboard — because a reader who has been here
 * before finds a row by where it sits. `toEqual` over an array, never a set.
 */
describe('§16.1, §16.4 — the page itself: the drafter block, then the register', () => {
  it('prints its own chord beside its title (§12.16)', () => {
    expect(PAGE).toContain('>G P<')
    expect(PAGE).toContain('Profile')
  })

  it('renders exactly REGISTER_ROWS, in exactly that order', () => {
    const rows = [...PAGE.matchAll(/<h2 id="([^"]+)" class="hl-register-name">([^<]+)</g)]
      .map(([, id, name]) => ({ id, name }))
    expect(rows).toEqual(REGISTER_ROWS.map(({ id, name }) => ({ id, name })))
    // A row is a `<details>` and there are no others on this page, so the count
    // is also the count of folds — a row rendered outside the register, or a
    // row in the table and not rendered, moves one of these two numbers.
    expect(occurrences(PAGE, /<details/g)).toBe(REGISTER_ROWS.length)
  })

  it('opens with the drafter block and closes every register row', () => {
    // §16.4: the rows are always closed on arrival. `<details open>` is the
    // single-attribute mutation this catches.
    expect(PAGE).not.toContain('<details open')
    expect(PAGE.indexOf('id="drafter"')).toBeGreaterThan(-1)
    expect(PAGE.indexOf('id="drafter"')).toBeLessThan(PAGE.indexOf('id="register"'))
    expect(PAGE.indexOf('id="register"')).toBeLessThan(PAGE.indexOf('<details'))
  })

  it('resolves every aria-labelledby against an id in the same document', () => {
    // The link gate cannot see a dead in-page anchor (§16.9's last row), so the
    // whole page is checked rather than the ten ids that used to be listed:
    // every name reference on the sheet, wherever it came from.
    const named = new Set([...PAGE.matchAll(/aria-labelledby="([^"]+)"/g)].map(([, id]) => id))
    expect(named.size).toBeGreaterThanOrEqual(REGISTER_ROWS.length)
    for (const id of named) expect(PAGE, id).toContain(`id="${id}"`)
  })

  it('gives every heading id exactly one reference, so no anchor is ambiguous', () => {
    // Hazard 2's other half. `hl-orgs-head` and `hl-account-head` are pointed at
    // from elsewhere in the tree, and `AuthShell` drops both in inline chrome so
    // that the register row and the drafter half own them. Two elements carrying
    // one id is not redundancy: the browser jumps to whichever comes first.
    const headings = [...PAGE.matchAll(/<h[123] id="([^"]+)"/g)].map(([, id]) => id)
    expect(headings.length).toBeGreaterThan(REGISTER_ROWS.length)
    for (const id of headings) {
      expect(occurrences(PAGE, new RegExp(`id="${id}"`, 'g')), id).toBe(1)
      expect(occurrences(PAGE, new RegExp(`aria-labelledby="${id}"`, 'g')), id).toBe(1)
    }
  })

  /**
   * §16.4.1 — the rule that makes folding honest, at the level a suite with no
   * DOM can hold it: the reading is real text on the closed summary.
   *
   * `RegisterRow` throws on a blank reading and `register.test.tsx` pins that
   * guard; what this adds is that the ASSEMBLED page passes one to every row.
   * The e2e suite carries the other half — that the closed reading equals the
   * one the opened body prints — because that needs a browser.
   */
  it('states a reading on every closed row (§16.4.1)', () => {
    for (const { id } of REGISTER_ROWS) {
      const summary = summaryOf(PAGE, id)
      const reading = /class="hl-register-reading">([\s\S]*?)<\/span>/.exec(summary)
      expect(reading, id).not.toBeNull()
      expect(words((reading as RegExpExecArray)[1]).trim(), id).not.toBe('')
    }
  })

  /**
   * §16.8 gate 2, stated on the assembled page rather than on the component.
   *
   * The mark picker's own contract is pinned above, against `<MarkPicker />` in
   * isolation; that says nothing about how many times the PAGE renders it, and
   * §16.0's first measured finding was that the old sheet drew the same eight
   * options twice with a third copy on `/sign-in/alias/`. So the property is a
   * count over the whole sheet: `data-hl-mark` appears once per mark and no
   * more, on a `<label>` (hazard H-C — `responsive.spec.ts` counts exactly
   * those and a copy on an inner wrapper makes it sixteen), in the order
   * `MARK_PICKER_IDS` fixes.
   *
   * A second radiogroup is caught today by the seed line being said twice
   * (§16.6, below) and by a strict-mode locator violation in
   * `colour-not-alone.spec.ts` — both real, both indirect: a future variant
   * that suppressed the seed line would slip past the first, and the second
   * lives in a suite that only runs after a build. Measured by mutation: a
   * second `<MarkPicker>` in `DrafterBlock` took `data-hl-mark` from 8 to 16
   * and `role="radiogroup"` from 2 to 3 while this file was otherwise green.
   *
   * `role="radiogroup"` is NOT asserted as one: the page carries two by design
   * — the mark row and §13.3's role picker, which `path.spec.ts:48` pins at
   * nine options and hazard H-N keeps to a single group.
   */
  it('draws the mark picker once and only once on the whole sheet (§16.2.2)', () => {
    const marks = [...PAGE.matchAll(/<label[^>]*data-hl-mark="([^"]+)"/g)].map(([, id]) => id)
    expect(marks).toEqual([...MARK_PICKER_IDS])
    // Every occurrence of the attribute is one of those labels: a nested copy
    // would raise this count without changing the list above.
    expect(occurrences(PAGE, /data-hl-mark=/g)).toBe(MARK_PICKER_IDS.length)
    // One radio group name behind them, so there is one tab stop and one
    // selection for the whole sheet.
    expect(occurrences(PAGE, /name="hl-mark"/g)).toBe(MARK_PICKER_IDS.length)
  })

  it('keeps one h1 and puts the block above the register in the outline (§16.7)', () => {
    expect(occurrences(PAGE, /<h1/g)).toBe(1)
    // The block is an h2 with two h3 halves; every register row is an h2. No h4
    // anywhere, because nothing on this sheet is three levels deep.
    expect(occurrences(PAGE, /<h3/g)).toBe(2)
    expect(PAGE).not.toContain('<h4')
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

    /*
     * §16's new reader-visible surfaces, and hazard H-I is the whole reason they
     * are enrolled here rather than left to `copy-register.test.ts`.
     *
     * That scanner is blind to three things: a template literal, a JSX run
     * containing `{…}`, and multi-line JSX text (`copy-register.test.ts:115-168`).
     * Every reading the register prints is built as `{`${n} OF ${total} …`}` and
     * every summary line is a JSX run with a component in it, so NONE of them is
     * scanned by the copy register — this array is the only place they are read
     * at all. A surface added to §16 and not added here silently stops being
     * checked, which is how §16.6's two spelling debts would come back.
     */
    ['DrafterBlock', words(DRAFTER)],
    ['MarkPicker shared description line', words(noteLineOf(MARK))],
    ['MarkPicker with an offer', words(MARK_OFFERED)],
    ['MarkPicker description line, offer clause', words(noteLineOf(MARK_OFFERED_SEEDED))],
    // §16.3's provenance note, from its single author (`lib/record/scope.ts`).
    // Reachable only in a signed-in session, so no rendered markup on this page
    // carries it and the constant is the surface.
    ['NAME_FROM_ADDRESS', NAME_FROM_ADDRESS],
    ['DATA_READING', DATA_READING],
    // And every closed row's own line: the name and the reading it states.
    ...REGISTER_ROWS.map(
      ({ id }): [string, string] => [`register row ${id}`, words(summaryOf(PAGE, id))],
    ),
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

  /**
   * §12.14.1 — a readout is uppercase mono with NO terminal period, and §16.6 —
   * one spelling per status.
   *
   * **What this replaced.** Three named pairs, one of which was
   * `['NO SEED MINTED YET', MARK]`: the string was asserted inside the mark
   * picker's markup, and §16.1 prints the same string under the drawing from the
   * same author, so a fixed pair pins the wrong thing — it would keep passing
   * while the drawing printed a second spelling beside it. Both halves are now
   * page-wide properties over what the sheet actually renders.
   *
   * The readouts are MEASURED off the markup (`readouts`) rather than listed, so
   * this scans the ones §16 added — the register's ten summary readings, the
   * drawing's two mono lines, the drafter halves' marks — without any of them
   * being enrolled by hand.
   */
  it('ends every readout on the sheet without a full stop', () => {
    const found = readouts(PAGE)
    // A floor, so a broken extractor reads as a failure rather than as a page
    // with nothing to check: every register row prints one, at least.
    expect(found.length).toBeGreaterThan(REGISTER_ROWS.length)
    for (const readout of found) expect(readout, readout).not.toMatch(/\.$/)
    // The three the old fixed list named are still among them, so the property
    // did not become weaker than the assertion it replaced.
    for (const readout of ['NO NAME ON RECORD', 'NO SUBMITTAL REGISTERED', NO_SEED_MINTED]) {
      expect(found, readout).toContain(readout)
    }
  })

  it('states the absence of the seed exactly once on the screen (§16.6)', () => {
    // Two authors, one string: `MarkPicker` prints it under the row and
    // `DrafterMark` prints it under the drawing when the record has hydrated and
    // carries no seed. On the prerender the drawing prints `SEED · --` — it has
    // not read the record yet — so the sheet states the absence once. Twice
    // would be one status said twice on one screen; a second SPELLING would be
    // §16.6's failure, and this catches both.
    expect(occurrences(PAGE, new RegExp(NO_SEED_MINTED, 'g'))).toBe(1)
    expect(words(PAGE)).not.toMatch(/SEED · NOT MINTED/)
    expect(words(PAGE)).not.toMatch(/NO SEED YET|SEED NOT MINTED/)
  })
})
