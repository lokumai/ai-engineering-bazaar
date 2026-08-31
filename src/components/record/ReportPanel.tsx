'use client'

import { useEffect, useState } from 'react'
import { signedCount, type CurriculumFacts } from '@/lib/record/derive'
import {
  REPORT_BUDGET_BYTES,
  buildRecordOfWork,
  canonicalRecordJson,
  recordFilename,
  reportBytes,
  type ReportFacts,
} from '@/lib/record/report'
import type { RecordData } from '@/lib/record/schema'
import { nowIso, useHydrated, useRecord } from '@/lib/record/store'

/**
 * §12.12 — the page that offers the `RECORD OF WORK`, and the one save path.
 *
 * The document itself is `lib/record/report.ts`'s, generated from the reader's
 * own record in their own browser and covered by 37 tests. Nothing here renders
 * it. This is the surface that decides **whether a reader should press the
 * button**, and there is exactly one design rule behind every line of it: the
 * page states what the file will say, and the disclaimer that will be inside
 * the file is on the page above the control that produces it. A document whose
 * limits are only discovered after it has been mailed to an employer is the §1
 * failure with a delay on it.
 *
 * **The generated HTML is never put into this page's DOM.** No
 * `dangerouslySetInnerHTML` of a document, no `<iframe>`, no `srcdoc`. The
 * preview is computed from the same selectors the document's own model uses, so
 * the two agree by construction rather than by inspection — and injecting a
 * whole document, styles and inline script included, into the page that
 * generated it would be a second parser over reader text for no gain at all.
 *
 * **Channel B, in full (§12.2).** Every value here is text, so none of it can
 * travel on the pre-paint boot script: the server renders the honest empty form
 * and the readings arrive post-mount. `useRecord()` returns the frozen
 * `EMPTY_RECORD` on the server and in the first client render, `useHydrated()`
 * tells "nothing recorded" from "not yet known", and every `useState` here
 * starts at a constant the server computes identically. The clock, Web Crypto,
 * `Blob` and `URL` are all read inside an effect or an event handler and
 * nowhere else. `suppressHydrationWarning` appears on no readout: it works one
 * level deep and React will not patch mismatched text, so a suppressed readout
 * keeps the build-time value — it would lie rather than flicker.
 *
 * **§12.13's last rule: the export control is never disabled, at zero data or
 * at any other.** A disabled control with no stated reason is a page asserting
 * a state the reader cannot verify. With nothing recorded the document degrades
 * to `READING RECORD` and says so, which is the honest artefact for a reader
 * who has read and signed nothing.
 *
 * **This panel never writes to the record.** `lastExport` belongs to the
 * profile sheet's JSON export (§12.15), and there is a hard reason beyond tidy
 * ownership: writing it here would change the record a fraction of a second
 * after the digest of that record had been printed and embedded, so the page
 * would immediately be showing a digest that is not the one in the file the
 * reader just saved.
 */

/**
 * The absent value, in the form the rest of the site prints it: `CHECKED BY` on
 * an unsigned sheet and `CLASS` below the first threshold are both `—`. The
 * §7.1 strip's `--` is a different token for a different job — two characters
 * that hold their width inside a fixed-pitch cell — and this panel has no such
 * cell, so it prints the em dash and every row in it reads the same way.
 */
const DASH = '—'

/**
 * §12.12.5 — where Web Crypto is unavailable the digest is **absent, not
 * faked**, and the document says so in the field the digest would have
 * occupied. A plausible-looking string there would be the one lie in this
 * system that tooling would consume.
 *
 * `crypto.subtle` is undefined outside a secure context, which is a real case
 * rather than a hypothetical one: a page served over plain `http` from a LAN
 * address has no Web Crypto at all.
 */
export const DIGEST_ABSENT = 'NOT COMPUTED — NO WEB CRYPTO IN THE GENERATING BROWSER'

/**
 * §12.12.3 — all seven statements, in the document's own words, rendered on the
 * page as well so a reader meets them before they ever download anything.
 *
 * They are duplicated from `report.ts`, which does not export its own copy, and
 * `tests/unit/components/record-report.test.tsx` asserts that every string here
 * appears verbatim in a generated document. That converts the duplication into
 * something a test fails on rather than something a reviewer has to notice.
 */
export const REPORT_LIMITS: readonly string[] = [
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

// ---------------------------------------------------------------------------
// The preview — the document's own header block, computed from the record.
// ---------------------------------------------------------------------------

export interface ReportPreview {
  /** §12.12.1 — `READING RECORD` with no repositories registered. */
  title: 'RECORD OF WORK' | 'READING RECORD'
  signed: number
  toGo: number
  of: number
  repositories: number
  /** Distinct URLs, deduped the way the header's `SOURCES` count dedupes. */
  sources: number
  /** Answered AND self-assessed, which is what the document's claim counts. */
  quickChecks: number
}

/**
 * What the file will say, from the record and the corpus.
 *
 * **Counted over the curriculum, not over the record**, because that is how
 * `buildRecordOfWork` counts: it walks `facts.sheets` and looks each slug up in
 * the record, so a submittal left behind under a slug the corpus has since
 * renamed is in `tally(data)` but not in the document. Iterating the same set
 * in the same direction is what makes this preview a statement about the file
 * rather than a second opinion about the record.
 *
 * `signedCount` is used rather than a fourth loop over the same array — it is
 * the selector the readout strip and the dashboard already count with. It
 * differs from the document in exactly one case, which is worth writing down:
 * §11.28 makes it ignore a sign-off on an undrawn sheet, and the document does
 * not. No control on this site can produce that state; an imported file can.
 */
export function reportPreview(data: RecordData, counts: CurriculumFacts): ReportPreview {
  const { signed, toGo, of } = signedCount(data, counts)

  let repositories = 0
  let quickChecks = 0
  const urls = new Set<string>()

  for (const fact of counts.sheets) {
    const sheet = data.sheets[fact.slug]
    if (!sheet) continue
    repositories += sheet.submittals.length
    if (sheet.quiz !== null && sheet.quiz.assessed !== null) quickChecks += 1
    for (const url of sheet.sources) urls.add(url)
  }

  return {
    title: repositories > 0 ? 'RECORD OF WORK' : 'READING RECORD',
    signed,
    toGo,
    of,
    repositories,
    sources: urls.size,
    quickChecks,
  }
}

// ---------------------------------------------------------------------------
// The digest (§12.12.5) and the save path (§12.12.7)
// ---------------------------------------------------------------------------

export type DigestState =
  | { kind: 'pending' }
  | { kind: 'ready'; hex: string }
  | { kind: 'absent' }

/** A module constant, so the initial state is identity-stable across renders. */
const DIGEST_PENDING: DigestState = { kind: 'pending' }

/**
 * SHA-256 over the canonical serialisation, hex.
 *
 * Async, because Web Crypto is, which is the whole reason the page prints `—`
 * until it resolves rather than blocking on it. `null` — never a substitute
 * value — where the API is not there: §12.12.5's label is what makes a digest
 * honest instead of decorative, and a fabricated hash would make the label a
 * lie.
 */
export async function digestOf(json: string): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle
    if (typeof subtle?.digest !== 'function') return null
    const hash = await subtle.digest('SHA-256', new TextEncoder().encode(json))
    return [...new Uint8Array(hash)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    // A refused or unimplemented digest is an absence, not an error state.
    return null
  }
}

/** What the document prints in the digest field for each state. */
export function digestText(state: DigestState): string {
  return state.kind === 'ready' ? state.hex : DIGEST_ABSENT
}

/**
 * The File System Access API, which `lib.dom.d.ts` does not declare.
 *
 * Declared as narrowly as it is used and reached only behind an `in` check, so
 * nothing here assumes an implementation: it is unimplemented in Firefox and in
 * Safari, and §12.12.7 makes `<a download>` + `Blob` the primary path for
 * exactly that reason.
 */
interface SaveFilePicker {
  showSaveFilePicker(options: {
    suggestedName: string
    types: ReadonlyArray<{ description: string; accept: Record<string, string[]> }>
  }): Promise<FileSystemFileHandle>
}

/**
 * §12.12.7 — `Blob` + `URL.createObjectURL` + a programmatic `<a download>`.
 *
 * The revoke is deferred by one task rather than run on the next line: the
 * click is dispatched synchronously, but the browser fetches the blob URL to
 * start the download after the handler returns, so revoking immediately is a
 * genuine race that loses the file — and never revoking leaks the blob for the
 * life of the document. This matches the JSON export on the profile sheet,
 * deliberately: two save paths that behave differently under the same race
 * would be two bugs to find instead of one.
 *
 * `showSaveFilePicker` is offered first where it exists, because a reader
 * saving an artefact they intend to keep is exactly the case a real Save-As
 * dialog is better at. `AbortError` is silent — the reader cancelled, and a
 * message about a thing they chose is noise — while any other failure falls
 * through to the anchor, so the primary path still runs when the picker is
 * blocked by permissions policy or by a lost user activation.
 */
export async function saveDocument(html: string, filename: string): Promise<void> {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })

  // §12.2 forbids `typeof window` in a RENDER path. This is not one: this
  // function only ever runs from a click handler, and the guard is here so that
  // a caller outside a browser gets a no-op rather than a thrown reference.
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as SaveFilePicker).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'HTML document', accept: { 'text/html': ['.html'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      // §12.12.7 — the reader's own cancellation is not a failure to report.
      // Branch on `name`, never `instanceof`: a DOMException crossing a realm
      // fails the constructor check while still being the error it says it is.
      if (error instanceof Object && 'name' in error && error.name === 'AbortError') return
    }
  }

  let url: string | null = null
  try {
    url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.rel = 'noopener'
    document.body.append(link)
    link.click()
    link.remove()
  } catch {
    if (url !== null) URL.revokeObjectURL(url)
    return
  }
  const revoke = url
  setTimeout(() => URL.revokeObjectURL(revoke), 0)
}

// ---------------------------------------------------------------------------
// The leaves
// ---------------------------------------------------------------------------

/**
 * One button that saves a document this page already holds as a string.
 *
 * The specimen (§12.13) is generated at build time on the server, so its whole
 * document arrives here as a prop and there is nothing to compute: the leaf
 * exists because `Blob`, `URL` and `<a download>` are browser APIs and a server
 * component cannot hand a reader a file. It carries no state and makes no claim
 * after the click — whether the file reached the disk is the browser's business
 * and this page cannot observe it, so saying `SAVED` would be a guess.
 */
export function DocumentDownload({
  html,
  filename,
  label,
}: {
  html: string
  filename: string
  label: string
}) {
  return (
    <button
      type="button"
      className="hl-btn"
      data-hl-download={filename}
      onClick={() => {
        void saveDocument(html, filename)
      }}
    >
      {label}
    </button>
  )
}

/** §7.1's grouping rule. Arithmetic, not policy, so a second copy cannot drift. */
function group(value: number): string {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+$)/g, ',')
}

/** §12.13 — `SIGNED OFF 07 / 32`: the numerator is padded to the total's width. */
function fraction(count: number, of: number): string {
  return `${String(count).padStart(String(of).length, '0')} / ${of}`
}

export interface ReportPanelProps {
  /**
   * §12.12 — the corpus as the document reprints it: 32 sheets, their
   * objectives, their questions, their checklist item text. Measured at build
   * time by `reportFacts()`, which reaches `node:fs`, so it arrives as a prop
   * and is never imported from here (§12.2).
   */
  facts: ReportFacts
  /**
   * The same corpus as counts, for the selectors in `lib/record/derive.ts`.
   * Both shapes are measured on the server by the page; deriving one from the
   * other in the browser would be the same corpus counted twice, and three
   * views computed twice start disagreeing.
   */
  counts: CurriculumFacts
}

export function ReportPanel({ facts, counts }: ReportPanelProps) {
  const data = useRecord()
  const hydrated = useHydrated()

  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [digest, setDigest] = useState<DigestState>(DIGEST_PENDING)
  const [bytes, setBytes] = useState<number | null>(null)

  // The clock. The build has no idea when the reader will open this page, so
  // this is the one value that cannot be rendered on the server at all.
  useEffect(() => {
    setGeneratedAt(nowIso())
  }, [])

  useEffect(() => {
    let live = true
    setDigest(DIGEST_PENDING)
    void digestOf(canonicalRecordJson(data)).then((hex) => {
      if (!live) return
      setDigest(hex === null ? { kind: 'absent' } : { kind: 'ready', hex })
    })
    // A record edited in another tab arrives mid-flight (§12.1.5), and the
    // stale digest must not be allowed to land on top of the fresh one.
    return () => {
      live = false
    }
  }, [data])

  /**
   * The byte count is **measured, not estimated**: the only honest way to
   * report the size of a file is to build it. So the document is generated
   * here, once per record, and thrown away — 34 KB of string against a 250 KB
   * budget the reader is entitled to see before they commit to sending it
   * anywhere.
   */
  useEffect(() => {
    if (generatedAt === null || digest.kind === 'pending') {
      setBytes(null)
      return
    }
    const html = buildRecordOfWork({
      data,
      facts,
      generatedAt,
      digest: digestText(digest),
    })
    setBytes(reportBytes(html))
  }, [data, facts, generatedAt, digest])

  const preview = reportPreview(data, counts)

  /**
   * The instant is taken fresh at the click and the readouts are set from the
   * same values that went into the file, so what the page shows afterwards
   * describes the file on the reader's disk rather than the page's own state a
   * few minutes earlier.
   */
  async function onDownload(): Promise<void> {
    const at = nowIso()
    const hex = await digestOf(canonicalRecordJson(data))
    const state: DigestState = hex === null ? { kind: 'absent' } : { kind: 'ready', hex }
    const html = buildRecordOfWork({
      data,
      facts,
      generatedAt: at,
      digest: digestText(state),
    })
    const filename = recordFilename(at, preview.repositories > 0)
    await saveDocument(html, filename)
    setGeneratedAt(at)
    setDigest(state)
    setBytes(reportBytes(html))
  }

  /** Every reading in the preview is unknown until the store has answered. */
  const reading = (value: string): string => (hydrated ? value : DASH)
  const filename =
    generatedAt === null ? DASH : recordFilename(generatedAt, preview.repositories > 0)

  return (
    <div data-hl-report data-hydrated={hydrated ? 'true' : 'false'}>
      <section className="hl-panel" aria-labelledby="hl-report-preview">
        <div className="hl-panel-head">
          <h2 id="hl-report-preview" className="hl-panel-title">
            What the file will say
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Counted from this browser</p>
        </div>

        <dl className="hl-defs">
          <dt>Title</dt>
          <dd>{reading(preview.title)}</dd>
          <dt>Signed off</dt>
          <dd>{reading(fraction(preview.signed, preview.of))}</dd>
          <dt>To go</dt>
          <dd>{reading(String(preview.toGo))}</dd>
          <dt>Repositories</dt>
          <dd>{reading(String(preview.repositories))}</dd>
          <dt>Sources opened</dt>
          <dd>{reading(String(preview.sources))}</dd>
          <dt>Quick Checks</dt>
          <dd>{reading(String(preview.quickChecks))}</dd>
        </dl>

        {/* §12.12.1 — with no repository registered the document holds only
            self-reported button presses, so it renames itself and drops the
            evidence register rather than printing it empty. Stating the rule
            costs one line and stops the file overstating its own weight. */}
        <p className="mt-3 mb-0 font-display text-meta leading-normal text-ink-muted">
          A record with no repository registered against any sheet is titled
          READING RECORD, and its evidence register is dropped rather than
          printed empty. Every sheet in the set is listed either way, signed off
          or not.
        </p>
      </section>

      <section className="hl-panel" aria-labelledby="hl-report-limits">
        <div className="hl-panel-head">
          <h2 id="hl-report-limits" className="hl-panel-title">
            Status and limits
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Second block of the file</p>
        </div>

        {/* §12.12.3 — all seven, declarative, and above the control that
            generates them. The certificate genre puts its limits in a footer
            in small type; this inverts that deliberately, on the page as well
            as in the document. */}
        <div className="hl-note">
          {REPORT_LIMITS.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <section className="hl-panel" aria-labelledby="hl-report-save">
        <div className="hl-panel-head">
          <h2 id="hl-report-save" className="hl-panel-title">
            Save
          </h2>
          <p className="hl-mark m-0 text-ink-faint">One self-contained file</p>
        </div>

        <dl className="hl-defs">
          {/* `.hl-defs` uppercases, which is right for a machine-derived value
              and wrong for a filename: a name printed in a case it is not
              written in is a small lie about the file the reader is about to
              receive. */}
          <dt>Filename</dt>
          <dd className="normal-case">{filename}</dd>
          <dt>Bytes</dt>
          <dd>
            {bytes === null ? DASH : `${group(bytes)} / ${group(REPORT_BUDGET_BYTES)}`}
          </dd>
        </dl>

        {/* The digest is `.hl-mark` without its uppercasing: a hex digest a
            reader compares against the one inside the file has to be printed
            in the case it is actually written in. */}
        <p className="hl-mark mt-4 mb-1 text-ink-muted">Content digest</p>
        <p className="hl-mark m-0 break-all normal-case text-ink">
          {digest.kind === 'pending' ? DASH : digestText(digest)}
        </p>
        <p className="mt-2 mb-0 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          SHA-256 over this browser&rsquo;s record, canonicalised with sorted
          keys. It is printed inside the file, where it shows that the file has
          not changed since it was generated. It shows nothing at all about
          whether the facts inside it are true.
        </p>

        {/* §12.13 — never disabled, at zero data or at any other. The
            attribute publishes the name the file will be saved under, which is
            the same contract `DocumentDownload` carries: a page that offers a
            file should be able to say which file. */}
        <div className="hl-signoff-actions mt-4">
          <button
            type="button"
            className="hl-btn"
            data-hl-download={filename}
            onClick={() => {
              void onDownload()
            }}
          >
            DOWNLOAD
          </button>
        </div>

        <p className="mt-2 mb-0 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          The file is written by this page and saved by this browser; nothing is
          uploaded and nothing is fetched. It carries the record inside it, so
          it can be imported back into this site to restore this state in
          another browser. Signing nothing off first is a supported state: the
          document then states that, in those words.
        </p>
      </section>
    </div>
  )
}
