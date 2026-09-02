'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/components/auth/SessionProvider'
import { ACCOUNTS_NOT_ENABLED } from '@/components/auth/SignInPanel'
import { FaceLegend, type FaceLegendRow, type FaceLegendRows } from '@/components/mascot/FaceLegend'
import { Lkm01 } from '@/components/mascot/Lkm01'
import { ClaimSummary } from '@/components/record/ClaimSummary'
import type { CategorySlug } from '@/lib/content/categories'
import { MARKS } from '@/lib/identity/mark'
import { roleById } from '@/lib/path/roles'
import { CLAIM_COPY, claimReceiptReading } from '@/lib/record/claim'
import {
  categoryProgress,
  signedCount,
  stamps,
  uptime,
  type CurriculumFacts,
} from '@/lib/record/derive'
import { readRawStored, type RawStored } from '@/lib/record/erase'
import { setCharKeys } from '@/lib/record/events'
import type { Submittal } from '@/lib/record/schema'
import {
  nowIso,
  quarantineReason,
  recordSavedAt,
  update,
  useHydrated,
  useRecord,
  useStorageReadout,
  useWriteState,
} from '@/lib/record/store'
import { NO_SEED_MINTED } from './MarkPicker'

/**
 * §12.11 items 5, 6 and 7, §12.1.2 and §12.16 — the four leaves the profile
 * sheet needs that are too small for a file each, and the toggle that is SC
 * 2.1.4's conformance mechanism.
 *
 * They are here together because they are one job: the profile is a server
 * page, and every value below is either reader state or a browser query, so
 * each needs a client boundary and none needs anything else. The same
 * arrangement `CheckedBy.tsx` uses for the title block's two reader-state
 * leaves.
 *
 * §12.2 channel B applies to all of them without exception: `useRecord()`
 * returns the frozen `EMPTY_RECORD` on the server and in the first client
 * render, every browser API is read inside `useEffect`, every `useState`
 * initial value is a constant the server computes identically, and no readout
 * carries `suppressHydrationWarning` — it works one level deep and React will
 * not patch mismatched text, so a suppressed readout keeps displaying the
 * build-time value and would lie rather than flicker.
 */

/** `--` is the instrument convention for "no reading", and it is true. */
const NO_READING = '--'

/** §7.1's rule, locale-free, so a byte count reads the same everywhere. */
function group(value: number): string {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+$)/g, ',')
}

/**
 * §12.11 item 6, §12.15 — an absent value drawn as the hidden line the rest of
 * the set already reads as "not yet": dashed, unsigned, and stating what is
 * missing rather than showing a zero that was never measured (§11.25).
 *
 * record.css has no inline dashed token — `.hl-submittal-empty` is a padded
 * block for a whole register — so this takes the hairline and the dash from
 * Tailwind against the same two design tokens that class uses.
 */
function Unsigned({ children }: { children: string }) {
  return (
    <span className="inline-block border border-dashed border-line-strong px-1.5 text-ink-faint">
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// §12.1.2 — the quarantine state
// ---------------------------------------------------------------------------

/**
 * §12.1.2 — a payload this build cannot read was copied aside, verbatim, and
 * the live record is being treated as absent.
 *
 * **This is the only surface where a reader can discover it**, which is why it
 * sits above everything else on the page: every readout below is empty, and
 * this is the only thing that explains why. Without it a reader whose browser
 * cached an older bundle sees a site that has silently forgotten them — the §1
 * failure in its purest form, and not a theoretical one: GitHub Pages serves
 * cached bundles, so an older bundle really can load after a newer one has
 * written.
 *
 * It is a fact, not an alarm, and takes no caution colour (§12.4.3's rule for
 * revision drift, for the same reason). `quarantineReason()` is module state
 * set while the store starts, so it is read behind `useHydrated()` — which
 * subscribes, and therefore re-renders once storage has actually been read.
 */
export const QUARANTINE_COPY: Readonly<
  Record<'newer' | 'malformed', { readout: string; note: string }>
> = {
  /**
   * §12.1.2's message, in §12.1.2's words. This is one of the few strings in
   * the design that is quoted rather than described, so it is pinned by test
   * rather than paraphrased — and it is exported for that, because the note
   * renders nothing at all in the frame a `renderToStaticMarkup` test can see.
   */
  newer: {
    readout: 'RECORD WRITTEN BY A NEWER VERSION OF THIS SITE — NOT READ',
    note:
      'This browser has a cached older copy of the site. Reload to update. '
      + 'Your record is intact and has not been changed.',
  },
  /**
   * §12.1.2 — "any parse failure that is not a version mismatch quarantines the
   * same way", but it does not say the same thing: a payload this build cannot
   * parse is not a payload from the future, and telling a reader to reload
   * would send them round a loop that changes nothing. §12.13's rule that
   * states which do not share a cause must not share copy applies here too.
   */
  malformed: {
    readout: 'RECORD COULD NOT BE READ BY THIS VERSION OF THIS SITE — NOT READ',
    note:
      'The stored record is not a shape this version of the site can read. It '
      + 'has been copied aside unchanged rather than discarded, and nothing has '
      + 'been written over it. The raw value is below.',
  },
}

export function QuarantineNote() {
  const hydrated = useHydrated()
  const reason = hydrated ? quarantineReason() : null
  if (reason === null) return null

  const copy = QUARANTINE_COPY[reason]

  return (
    <section aria-label="Record status" className="mb-8">
      <p className="hl-mark m-0 text-ink">{copy.readout}</p>
      <div className="hl-note">
        <p>{copy.note}</p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// §16.1 — the drawing in the drafter block, and §13.2's legend under Readout
// ---------------------------------------------------------------------------

/**
 * The numerators, written over the build-time rows.
 *
 * `Object.keys` is the only cast here: the keys of a `Record<CategorySlug, …>`
 * are `CategorySlug`s, which the type system knows and the standard library
 * signature does not. Every row is rewritten, so a category the record has
 * never seen reads as 0 signed off rather than keeping the `null` of its
 * neighbour.
 */
function withSignedCounts(
  legend: FaceLegendRows,
  approved: Record<string, { approved: number; total: number }> | null,
): FaceLegendRows {
  const out: Record<CategorySlug, FaceLegendRow> = { ...legend }
  for (const slug of Object.keys(out) as CategorySlug[]) {
    out[slug] = {
      ...out[slug],
      signed: approved === null ? null : (approved[slug]?.approved ?? 0),
    }
  }
  return out
}

/**
 * §16.1 — the drafter block's left cell: LKM-01, and under it the two facts the
 * deleted definition list was describing instead of printing.
 *
 * **This is what `IdentityMark` was, split in two, and the split is the
 * measurement.** §16.0 counted the old panel: five `<dt>`/`<dd>` pairs of prose
 * about alias, mark, seed, account and organisation, with none of the five
 * values printed anywhere near them — 1260 words in `<main>` before an island
 * mounted, and the two controls a reader actually came for ~700 words apart. So
 * the prose goes and the values arrive: `MARK · DATUM` and `SEED · 4F9C2A17`,
 * two mono lines, one drawing.
 *
 * **Why the two are separate lines rather than one "your mark" row.** The mark
 * is a choice and is reversible; the seed is minted once at the first sign-off,
 * is never regenerated and is not derived from the alias. Printed as one field a
 * reader would reasonably expect a rename to redraw every sheet they had already
 * signed. Two lines let them see on screen that it does not — which is the one
 * thing the deleted list was right about, and the only part of it worth keeping.
 *
 * **The face legend is not here any more.** It reports the six subsystems, which
 * is the Readout row's subject rather than the drafter's, and `.hl-drafter-mark`
 * is a 168px column measured to the width of the two mono lines (§16.1's own
 * geometry) — a legend with a `min-w-[16rem]` table in it would have forced that
 * column open and taken the drafter block sideways at 1024px, which is the one
 * failure `responsive.spec.ts` treats as general. It moves to `SubsystemLegend`,
 * below, and is rendered in the register's Readout row beside the strip that
 * counts the same sheets.
 *
 * The 64px `DrafterStamp` that used to sit beside the legend is gone too, and
 * for a plainer reason: the mark row in the same box now draws all eight glyphs
 * at once with the chosen one marked, so a ninth copy of the chosen glyph was
 * reporting a fact already on screen twice over.
 *
 * §12.2 channel B: both readings are reader state, so both print `--` until the
 * store has answered. `NO_SEED_MINTED` is imported rather than retyped — §16.6
 * measured that string in three places and this is the fourth, and
 * `SEED · NOT MINTED YET` would be a second spelling of one status.
 */
export function DrafterMark() {
  const record = useRecord()
  const hydrated = useHydrated()

  const chosen = MARKS.find((option) => option.id === (record.identity.mark ?? 'seeded'))
  const seed = record.identity.markSeed

  return (
    <>
      {/* §13.2 — 132px in the drafter block's column. The faces take no props:
          face state is channel A, and the stamp is on `<html>` before this
          renders. */}
      <Lkm01 size={132} idPrefix="hl-profile" />

      <p className="hl-drafter-line">
        <b>MARK</b> · {hydrated && chosen !== undefined ? chosen.label : NO_READING}
      </p>

      {!hydrated ? (
        <p className="hl-drafter-line">
          <b>SEED</b> · {NO_READING}
        </p>
      ) : seed === null ? (
        // Not `SEED · <absence>`: the site has one spelling of this state and it
        // is a whole sentence, so the label is dropped rather than the string
        // rewritten to fit the pattern (§16.6).
        <p className="hl-drafter-line">{NO_SEED_MINTED}</p>
      ) : (
        <p className="hl-drafter-line">
          <b>SEED</b> · {seed}
        </p>
      )}
    </>
  )
}

/**
 * §13.2 — the six faces read as real text, in the register row whose subject is
 * the same count.
 *
 * **The legend is what makes the drawing accessible.** The SVG is `aria-hidden`
 * at every size and in every state, because an accessible name that flips
 * between the prerender and the hydrated render is itself a mismatch; at 96px
 * and above the drawing is read by this table instead. Its denominators are
 * measured from the corpus at build time and arrive as a prop (§12.2, R3: this
 * island may not import `lib/content/`), and its numerators are channel B —
 * `null` until the store has answered, which prints an em dash rather than a
 * zero nobody measured (§11.25).
 *
 * It is inside a register row that starts closed, and the fold's cost is real
 * rather than argued away. **MEASURED** (2026-09-02, the built export served on
 * :3111, Chrome over CDP `Accessibility.getFullAXTree`): with the row closed the
 * accessibility tree holds 0 table, row or cell nodes for this legend; with it
 * open, 29. Chrome hides a closed `<details>` body with
 * `content-visibility: hidden` on `::details-content`, which takes the subtree
 * out of the tree rather than leaving it there for a reader to find. What is
 * exposed while closed is the row itself: the `<h2>` inside the `<summary>` is a
 * level-2 heading (`READOUT`) and the summary is a disclosure named
 * `READOUT 0 OF 32 SIGNED OFF`, so the AGGREGATE reading §16.4.1 asks for is
 * available in both states. The per-subsystem counts are two steps away for
 * every reader alike — assistive technology and sighted — and that is the price
 * of the fold, stated here.
 */
export function SubsystemLegend({
  facts,
  legend,
}: {
  /**
   * Measured from the corpus at build time and passed down as plain data:
   * `lib/content/facts.ts` reaches `node:fs`, so a client leaf may never import
   * it (§12.2).
   */
  facts: CurriculumFacts
  /** Flavour titles and the drawn-sheet denominators, from the same build. */
  legend: FaceLegendRows
}) {
  const record = useRecord()
  const hydrated = useHydrated()

  const rows = withSignedCounts(legend, hydrated ? categoryProgress(record, facts) : null)

  return <FaceLegend rows={rows} />
}

// ---------------------------------------------------------------------------
// §12.11 item 5 — the submittal register
// ---------------------------------------------------------------------------

/** What the register needs to name the sheet an entry answers. */
export interface RegisterSheet {
  slug: string
  module: number
  title: string
}

/**
 * §12.11 item 5 — every submittal across every sheet, in one table, with the
 * sheet each one answers.
 *
 * This is the strongest evidence the record will ever hold (§12.9.1): the only
 * content in it a third party can independently check. Everything else on this
 * page is the reader's own assertion about the reader.
 *
 * **The link is reconstructed, never echoed** (§12.9.2). `https://github.com/`
 * plus two segments the validator has already checked against GitHub's own
 * documented rule, as both the `href` and the visible label — so an
 * attacker-controlled query string, userinfo (`https://github.com@evil.example/`),
 * a non-default port or a unicode homograph host has no route to the `href`,
 * and a link whose text lies about its destination becomes impossible rather
 * than merely unlikely. Rebuilt HERE as well as in the validator and in
 * `addSubmittal`, for the reason those two give: it is the value that becomes
 * an `href`, so it is rebuilt everywhere it is about to be one.
 *
 * The sheet order is the curriculum's, not the record's: a register sorted by
 * whenever the reader happened to register something reads as a log, and this
 * is a schedule.
 */
export function repoUrl(entry: { owner: string; repo: string }): string {
  return `https://github.com/${entry.owner}/${entry.repo}`
}

export function SubmittalRegister({ sheets }: { sheets: readonly RegisterSheet[] }) {
  const record = useRecord()

  const rows: Array<{ sheet: RegisterSheet; entry: Submittal; index: number }> = []
  for (const sheet of sheets) {
    const entries = record.sheets[sheet.slug]?.submittals ?? []
    entries.forEach((entry, index) => rows.push({ sheet, entry, index }))
  }

  if (rows.length === 0) {
    // §12.9.1 — a hairline slot stating that it is empty. Never a nag, and
    // never a prompt dressed as a task.
    return <p className="hl-submittal-empty hl-mark">NO SUBMITTAL REGISTERED</p>
  }

  return (
    <table className="w-full border-collapse font-display text-ui">
      <caption className="sr-only">
        Every repository registered against a sheet in this browser
      </caption>
      <thead>
        <tr>
          {['Sheet', 'Submittal', 'Registered'].map((heading) => (
            <th
              key={heading}
              scope="col"
              className="border-b border-line-strong px-3 py-2 text-start font-mono text-mark font-medium uppercase tracking-[0.06em] whitespace-nowrap text-ink-muted"
            >
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ sheet, entry, index }) => (
          <tr key={`${sheet.slug}-${index}`}>
            <th
              scope="row"
              className="border-b border-line px-3 py-2 text-start align-top font-mono text-mark font-normal uppercase tracking-[0.06em] whitespace-nowrap text-ink-muted"
            >
              {`SHEET ${String(sheet.module).padStart(2, '0')}`}
              <span className="block font-display tracking-normal normal-case text-ink">
                {sheet.title}
              </span>
            </th>
            <td className="border-b border-line px-3 py-2 align-top">
              {/* One expression, used twice: the label and the href are the
                  same string by construction rather than by coincidence. */}
              <a
                className="hl-submittal-repo"
                href={repoUrl(entry)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {repoUrl(entry)}
              </a>
              {entry.note !== '' && (
                <p className="hl-submittal-note">
                  <bdi dir="auto">{entry.note}</bdi>
                </p>
              )}
              {/* §12.9.3 — reader-supplied and never fetched, with the
                  disclaimer never far from it. That moves verification to the
                  party who actually has a network: a SHA is a content hash, so
                  a reviewer can resolve `{repo}/commit/{sha}` and read the
                  authored date, the diff and the signature status themselves. */}
              {entry.commit !== null && (
                <p className="hl-submittal-commit">
                  {`COMMIT ${entry.commit}`}
                  <span className="ml-2 font-display tracking-normal normal-case">
                    supplied by reader; not fetched or verified by this application
                  </span>
                </p>
              )}
            </td>
            <td className="border-b border-line px-3 py-2 align-top font-mono text-mark tracking-[0.06em] whitespace-nowrap text-ink-muted">
              {entry.at.slice(0, 10)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// §12.11 item 6 — storage
// ---------------------------------------------------------------------------

/**
 * §12.11 item 6, §12.1.6 — the storage state, **queried and printed, never
 * assumed**.
 *
 * `storageReadout()` returns the answer `navigator.storage.persisted()` gave,
 * and `UNKNOWN` where it has not answered — because a `false` result is normal,
 * not an error, and a value that was never queried is not a value. That is the
 * whole of §12.1.6 in one readout.
 *
 * **`estimate()` is bytes, labelled an approximation, and never a percentage,
 * gauge, ring or fill bar** (§12.1.6, §11.35). The spec's own word for it is
 * "imprecise": browsers deliberately pad and round the figure, and a fill bar
 * drawn from a padded number invites a reader to plan against it.
 *
 * The effect re-runs on the write state as well as on the record, because a
 * refused write is how this page learns that storage is blocked — the store
 * finds out at the first write, not always at boot.
 */
export function StoragePanel() {
  const record = useRecord()
  const hydrated = useHydrated()
  const answer = useStorageReadout()
  const write = useWriteState()
  const [bytes, setBytes] = useState<number | null>(null)
  const [asked, setAsked] = useState(false)
  /**
   * Whether the key is actually there — not whether the store remembers
   * writing it.
   *
   * These come apart exactly once, and it matters: an erase (§12.15) flushes
   * the empty record and then removes both keys, so `recordSavedAt()` holds the
   * instant of a write whose value no longer exists. Printing that instant as
   * `RECORD SAVED` would be this page asserting a saved record the reader can
   * see is not there, one panel below — which is §1's failure with the evidence
   * against it on the same screen.
   */
  const [stored, setStored] = useState<boolean | null>(null)

  useEffect(() => {
    let live = true
    async function measure(): Promise<void> {
      try {
        if (typeof navigator === 'undefined') return
        if (typeof navigator.storage?.estimate !== 'function') return
        const estimate = await navigator.storage.estimate()
        if (!live) return
        setBytes(typeof estimate.usage === 'number' ? estimate.usage : null)
      } catch {
        // Unimplemented or refused. The readout stays NOT REPORTED, which is
        // true; an invented byte count would be §11.25's failure.
      } finally {
        if (live) setAsked(true)
      }
    }
    void measure()
    setStored(readRawStored().record !== null)
    return () => {
      live = false
    }
  }, [record, write])

  // The same subscription the closed row's summary reads, so the two cannot
  // print different answers at one instant (see `StorageReading`).
  const state = hydrated ? answer : null
  const savedAt = hydrated ? recordSavedAt() : null
  const lastExport = record.meta.lastExport

  return (
    <dl className="hl-defs">
      <dt>Storage</dt>
      <dd>{state ?? NO_READING}</dd>

      <dt>Estimated use</dt>
      <dd>
        {bytes === null ? (
          asked ? <Unsigned>NOT REPORTED</Unsigned> : NO_READING
        ) : (
          `${group(bytes)} BYTES · APPROXIMATE`
        )}
      </dd>

      <dt>Record saved</dt>
      <dd>
        {!hydrated || stored === null ? (
          NO_READING
        ) : !stored ? (
          <Unsigned>NOT STORED IN THIS BROWSER</Unsigned>
        ) : savedAt === null ? (
          <Unsigned>NO INSTANT IN THE ENVELOPE</Unsigned>
        ) : (
          savedAt
        )}
      </dd>

      <dt>Last export</dt>
      <dd>
        {!hydrated ? (
          NO_READING
        ) : lastExport === null ? (
          // §12.15's own wording for the state.
          <Unsigned>NO EXPORT ON RECORD</Unsigned>
        ) : (
          lastExport
        )}
      </dd>
    </dl>
  )
}

// ---------------------------------------------------------------------------
// §12.11 item 7 — the raw stored values
// ---------------------------------------------------------------------------

/**
 * §12.11 item 7 — the stored strings, verbatim.
 *
 * **§16.4 unwrapped the disclosure this used to be.** It shipped as a
 * `<details>` inside `section[aria-labelledby="raw"]`, and its register row is
 * now itself a `<details>`: nesting them would have made the bytes two clicks
 * away and given the row two chevrons, one of which does nothing until the other
 * has been used. The row is the disclosure; the summary the row replaced said
 * `The raw stored values`, which is the row's own name.
 *
 * **The cheapest possible proof that §1's rule extends all the way down to the
 * storage layer.** Every other panel on this page is this application telling
 * the reader what it recorded; this one is the bytes. Nothing is reformatted on
 * the way out, because a value that had been pretty-printed for display would
 * no longer be evidence of anything.
 *
 * Read in an effect, keyed on the record and on the write state, so it is
 * re-read after every write, import and erase rather than going stale the
 * moment the reader does anything. It reads through `lib/record/`, which is the
 * only place §12.1.1 permits the key to be named.
 */
export function RawValues() {
  const record = useRecord()
  const write = useWriteState()
  const [raw, setRaw] = useState<RawStored | null>(null)

  useEffect(() => {
    setRaw(readRawStored())
  }, [record, write])

  return (
    <div>
      <p className="mt-0 mb-0 font-display text-meta leading-normal text-ink-muted">
        Exactly what is in this browser's storage, unchanged. Two keys: the
        record, and the copy set aside if a payload could not be read.
      </p>

      <p className="hl-mark mt-3 mb-0 text-ink">hl-record</p>
      <pre className="hl-raw">
        {raw === null ? NO_READING : (raw.record ?? 'NO VALUE STORED UNDER THIS KEY')}
      </pre>

      <p className="hl-mark mt-3 mb-0 text-ink">hl-record-quarantine</p>
      <pre className="hl-raw">
        {raw === null ? NO_READING : (raw.quarantine ?? 'NO VALUE STORED UNDER THIS KEY')}
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// §12.16 — SC 2.1.4's off switch
// ---------------------------------------------------------------------------

/**
 * §12.16 — the switch for single-character shortcuts, and **this is its home**:
 * SC 2.1.4 requires a mechanism to turn them off, `?` is itself a character
 * shortcut so it is inside the scope rather than exempt from it, and the switch
 * has to live somewhere a reader can find without using one.
 *
 * Default on, for this audience. Modifier chords keep working when it is off —
 * `resolveKey` returns before the gate for anything carrying Ctrl, Meta or Alt —
 * and `Escape` is let through everywhere, so a reader who switches the map off
 * can still leave a dialog.
 *
 * `prefs.charKeys` is `true` in `EMPTY_RECORD`, so the server renders the
 * switch on and a reader who turned it off sees it flip once after the
 * hydration commit. That is channel B behaving exactly as §12.2 describes, and
 * it is the honest form: the default really is on.
 */
export function CharKeysToggle() {
  const record = useRecord()
  const on = record.prefs.charKeys

  return (
    <div>
      {/* `.hl-check` is tuned for a prose-size label in the corpus's own
          checklist; at the readout's 14px the box wants the line's centre. */}
      <label className="hl-check items-center">
        <input
          type="checkbox"
          className="mt-0"
          checked={on}
          onChange={(event) => update((data) => setCharKeys(data, event.target.checked))}
        />
        <span className="font-display text-ui leading-normal text-ink">
          Single-character shortcuts
        </span>
      </label>
      <p className="mt-1 mb-0 font-display text-meta leading-normal text-ink-muted">
        With this off, every single-character key and every two-key chord in the
        shortcut sheet stops doing anything. Shortcuts that need Ctrl, Cmd or
        Alt keep working, and Escape always closes what is open.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// §16.4.1 — the readings the closed rows print
// ---------------------------------------------------------------------------

/**
 * §16.4.1 — the one difficult rule in the register, implemented as nine small
 * components rather than as nine numbers computed in the page.
 *
 * **The rule.** A closed row prints the reading the panel exists to report.
 * Folding removes prose, never a fact — the same contract §10.4 put on the
 * silent indicator, where the line under the gauge writes its reading.
 *
 * **Every reading comes from the selector its own body already uses** (§16.4.2,
 * §11.25, §14.9). `signedCount`, `uptime`, `stamps`, `roleById`,
 * `storageReadout` and `readRawStored` are called here with the same arguments
 * `Readout`, `Uptime`, `StampShelf`, `RolePanel`, `StoragePanel` and `RawValues`
 * call them with, so a summary cannot drift from the body it summarises. The
 * rejected alternative was one `registerReadings(record, facts)` helper
 * returning nine strings: it would have been a tenth derivation of nine facts,
 * and the first time one of the panels changed its own selector the summary
 * would have gone on printing the old answer.
 *
 * **Why components and not strings.** Every one of these is reader state, so it
 * belongs on channel B (§12.2): `useRecord()` returns the frozen `EMPTY_RECORD`
 * on the server and in the first client render, and the prerendered summary
 * prints `--`. That is the house spelling for "no reading taken yet" — the same
 * one `Readout` and `CategoryMeter` print — and it is correct rather than a gap.
 * A string computed in the server page could only ever have been a guess about
 * a reader the build has never met.
 *
 * **The readings are asserted in a component test, not by the copy register.**
 * `copy-register.test.ts` cannot see a JSX run containing `{…}`, which is what
 * every one of these is, so none of these strings is scanned by it (hazard H-I).
 * They are uppercase, mono, terminal-period-free and reuse the spelling their
 * own panel already ships for the same status.
 */

/**
 * §16.4.2's escape hatch, in the two shapes it takes.
 *
 * `NO_READING` above is "nobody has looked yet". This one is different: the row
 * has no selector to read at all, so it prints its subject rather than inventing
 * a number (§16.4.2's closing sentence). Export/import/erase is the only such
 * row — there is no count of "how exportable" a record is — and the words are
 * §16.4.1's own for it.
 */
export const DATA_READING = 'YOUR COPY OF THE RECORD'

/**
 * `RolePanel`'s spelling of an absent role, repeated here and nowhere else.
 *
 * It is a repeat rather than an import because `RolePanel` holds it as a private
 * `const` and that file is not this task's to change. The one-spelling rule
 * (§16.6) is about the STRING, and this is the same string; a second spelling —
 * `NONE CHOSEN`, which is what the row was first drafted with — would have been
 * the failure. Worth collapsing to one author the next time `RolePanel` is
 * opened.
 */
const NO_ROLE = 'NO ROLE ON RECORD'

/** `SubmittalRegister`'s own words for an empty register, for the same reason. */
const NO_SUBMITTAL = 'NO SUBMITTAL REGISTERED'

/** `AccountPanel`'s spelling of a signed-out session, for the same reason. */
const NOT_SIGNED_IN = 'NOT SIGNED IN'

/** §7.1 — the same `signedCount` the strip in this row's body counts with. */
export function ReadoutReading({ facts }: { facts: CurriculumFacts }) {
  const record = useRecord()
  const hydrated = useHydrated()
  const counts = signedCount(record, facts)

  return <>{hydrated ? `${counts.signed} OF ${counts.of} SIGNED OFF` : NO_READING}</>
}

/**
 * §7.3 — days recorded in the window, counted off the same `uptime` reading the
 * strip of ticks in this row's body draws, and read the way its `aria-label`
 * reads it rather than as a streak. The clock is read only once the store has
 * answered: UTC, the basis `store.ts` writes days in, so the reading cannot
 * change on a flight.
 */
export function UptimeReading() {
  const record = useRecord()
  const hydrated = useHydrated()
  if (!hydrated) return <>{NO_READING}</>

  const reading = uptime(record, nowIso().slice(0, 10))
  const active = reading.days.filter((day) => day.active).length
  return <>{`${active} OF LAST ${reading.days.length} DAYS`}</>
}

/**
 * §7.4 — earned of however many stamps the shelf holds. The denominator is
 * `stamps().length`, never the numeral nine: the shelf is built from the
 * corpus's categories, so a typed count would be a second author of a number the
 * array already carries (§11.25).
 */
export function StampsReading({ facts }: { facts: CurriculumFacts }) {
  const record = useRecord()
  const hydrated = useHydrated()
  const shelf = stamps(record, facts)
  const earned = shelf.filter((stamp) => stamp.earned !== null).length

  return <>{hydrated ? `${earned} OF ${shelf.length} EARNED` : NO_READING}</>
}

/**
 * §12.9.1 — filed submittals, counted over the same sheets the table in this
 * row's body walks, in the same order and through the same lookup. An empty
 * register prints the words the body prints, not `0 FILED`: a zero here would be
 * a second spelling of a state the body already names.
 */
export function SubmittalReading({ sheets }: { sheets: readonly RegisterSheet[] }) {
  const record = useRecord()
  const hydrated = useHydrated()
  if (!hydrated) return <>{NO_READING}</>

  let filed = 0
  for (const sheet of sheets) filed += record.sheets[sheet.slug]?.submittals.length ?? 0
  return <>{filed === 0 ? NO_SUBMITTAL : `${filed} FILED`}</>
}

/**
 * §13.3 — the role the reader stated, resolved through the same `roleById` this
 * row's body resolves it with, so an id no role answers to reads as absent in
 * both places rather than as a label in one of them.
 */
export function RoleReading() {
  const record = useRecord()
  const hydrated = useHydrated()
  const role = roleById(record.identity.role)

  if (!hydrated) return <>{NO_READING}</>
  // Not upper-cased here: `.hl-register-reading` cases it in CSS, and the body
  // prints `role.label` verbatim, so the two stay the same string — which is
  // what §16.4.1's gate compares.
  return <>{role === undefined ? NO_ROLE : role.label}</>
}

/**
 * §14.5 — the session, which is as far as a reading can honestly go here.
 *
 * **This row is §16.4.2's last sentence in practice.** The membership count
 * lives in `OrgMembershipPanel`'s own `useState`, behind a PostgREST select that
 * is filtered by `user_id`; there is no selector outside that panel to read it
 * from, and querying again from the summary would be a second round trip
 * reporting a number the row below it is already fetching — a new derivation,
 * which §16.4.2 forbids. So the reading states the session, which the panel's
 * own body reads from exactly this selector, and for a signed-in reader it
 * prints the row's subject rather than a count it has not been told.
 *
 * `NONE JOINED`, which the plan drafted, is deliberately not used: the body's
 * spelling of that state is `NOT A MEMBER OF ANY ORGANISATION`, so a second one
 * would fail §16.6's one-spelling rule with the first one on the same screen.
 *
 * Requires a `SessionProvider` above it — the register row that carries it
 * supplies one. With none, `useSession()` is null and this prints `--`, which is
 * true of a page that is not tracking a session.
 */
export function OrgReading() {
  const session = useSession()
  const status = session?.view.status ?? 'unknown'

  if (status === 'unknown') return <>{NO_READING}</>
  /**
   * §16.6 — imported, where this row used to hold a private
   * `ACCOUNTS_OFF = 'ACCOUNTS NOT ENABLED'`.
   *
   * The comment above that const claimed it was `AccountPanel`'s own spelling
   * repeated, which is how the other locals here are justified. It was not: the
   * panels this row folds print `ACCOUNTS NOT ENABLED YET`, so the repeat was a
   * second spelling of one status — and after §16 both spellings landed in the
   * same box, five lines apart. `SignInPanel.tsx` is now the single author and
   * records the argument for keeping the longer form.
   */
  if (status === 'disabled') return <>{ACCOUNTS_NOT_ENABLED}</>
  if (status === 'signedOut') return <>{NOT_SIGNED_IN}</>
  return <>ORGANISATIONS THIS ACCOUNT HAS JOINED</>
}

/**
 * §17.7 — the last claim, read off the same `meta.lastClaim` the fold's body
 * prints, through the same `claimReceiptReading` the arrival line uses.
 *
 * One function, three callers, no new derivation (§16.4.2). A record that has
 * never met an account reads `NO CLAIM ON RECORD` — a named state and the only
 * spelling of it, not a dash, because the question has an answer.
 */
export function ClaimReading() {
  const record = useRecord()
  const hydrated = useHydrated()
  if (!hydrated) return <>{NO_READING}</>
  return <>{claimReceiptReading(record.meta.lastClaim)}</>
}

/**
 * §17.7 — the fold's body: the claim as it was reported when it happened.
 *
 * `ClaimSummary` is reused verbatim, which is the whole reason it survived the
 * move: it computes nothing and decides nothing, so the same component that used
 * to sit in a bare div after the footer prints the stored summary here. The date
 * is the one line the panel could not carry before, because a panel that only
 * ever showed the claim it had just performed had no need to say when.
 */
export function ClaimPanel() {
  const record = useRecord()
  const hydrated = useHydrated()
  const receipt = record.meta.lastClaim

  if (!hydrated || receipt === null) {
    return (
      <p className="hl-mark m-0 text-ink-muted">
        {hydrated ? CLAIM_COPY.noClaim : NO_READING}
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      <p className="hl-mark m-0 text-ink-muted">{`CLAIMED ${receipt.at.slice(0, 10)}`}</p>
      <ClaimSummary summary={receipt.summary} />
    </div>
  )
}

/**
 * §12.1.6 — the answer `navigator.storage.persisted()` gave, which is the first
 * `<dd>` in this row's body and the same call. `UNKNOWN` where it has not
 * answered: a value that was never queried is not a value.
 *
 * **`useStorageReadout()` rather than `storageReadout()`, and the difference was
 * measured.** The plain call claimed that reading the module's answer at render
 * time was enough; it was not, because the grant arrives after the hydration
 * commit and is deliberately never written through the reducer, so nothing this
 * component subscribed to ever changed again. With the row closed and Chrome
 * having answered, the body printed `BEST-EFFORT` while this line printed
 * `UNKNOWN`, simultaneously — caught by §16.4.1's per-row gate, which compares
 * the two at one instant. The hook's header in `store.ts` carries the
 * measurement; both readings now come from one subscription.
 */
export function StorageReading() {
  const hydrated = useHydrated()
  const answer = useStorageReadout()
  return <>{hydrated ? answer : NO_READING}</>
}

/**
 * §12.11 item 7 — how many of the two keys hold a value, and how many bytes they
 * hold between them, from the same `readRawStored()` the body prints verbatim.
 *
 * The bytes are `String.length` on the stored strings — UTF-16 code units rather
 * than encoded bytes, which is what a browser's storage quota is charged in and
 * what `StoragePanel` labels an approximation for the same reason. It is read in
 * an effect keyed on the record and the write state, exactly as the body reads
 * it, so an erase or an import moves both at once.
 */
export function StoredValuesReading() {
  const record = useRecord()
  const write = useWriteState()
  const [raw, setRaw] = useState<RawStored | null>(null)

  useEffect(() => {
    setRaw(readRawStored())
  }, [record, write])

  if (raw === null) return <>{NO_READING}</>

  const held = [raw.record, raw.quarantine].filter((value) => value !== null)
  const bytes = held.reduce((total, value) => total + value.length, 0)
  return <>{`${held.length} KEYS · ${group(bytes)} BYTES`}</>
}

/**
 * §12.16 — the switch's own position, read off `prefs.charKeys` like the
 * checkbox in this row's body.
 *
 * **No `--` gate, and that is deliberate.** `EMPTY_RECORD.prefs.charKeys` is
 * `true`, so the prerender prints `CHARACTER KEYS ON` — which is not a guess
 * about the reader but a statement about the default, and the default really is
 * on. A reader who turned them off sees the reading flip once after the
 * hydration commit, which is the same honest behaviour `CharKeysToggle`'s own
 * header records for the checkbox beside it.
 */
export function CharKeysReading() {
  const record = useRecord()
  return <>{record.prefs.charKeys ? 'CHARACTER KEYS ON' : 'CHARACTER KEYS OFF'}</>
}
