'use client'

import { useEffect, useState } from 'react'
import {
  REMOTE_ERASE_FAILED,
  UNDO_CLOSED,
  erasedRecord,
  eraseStored,
  readRawStored,
  restoreStoredQuarantine,
  eraseRemote,
  remoteEraseNote,
  undoLabel,
  type RemoteEraseOutcome,
  undoSecondsLeft,
} from '@/lib/record/erase'
import { markActivity, markExported } from '@/lib/record/events'
import { canonicalRecordJson } from '@/lib/record/report'
import { SCHEMA_VERSION, type RecordData } from '@/lib/record/schema'
import {
  exportJson,
  flush,
  importJson,
  nowIso,
  snapshot,
  update,
  useHydrated,
  eraseAccountCopy,
  hasAccountCopy,
} from '@/lib/record/store'
import { EraseDialog } from './EraseDialog'

/**
 * §12.11 item 8, §12.15 — export, import, erase. Control over the artefact is
 * the mechanism of ownership, not decoration on top of it.
 *
 * **Export is load-bearing durability, not a convenience.** Safari deletes all
 * script-writable storage after seven days of use without a visit to the site,
 * and LRU eviction under storage pressure deletes ALL of an origin's data at
 * once rather than part of it — so a curriculum spanning months *will* silently
 * lose everything for some readers. GDPR Art. 20 sets the bar at "structured,
 * commonly used and machine-readable", which indented JSON meets, and a human
 * reading their own record in a text editor is the cheapest proof that §1
 * reaches the storage layer.
 *
 * **The export control is live at zero data** (§12.13, §12.15): the exported
 * file states the truth, and a disabled control with no stated reason is a page
 * asserting a state the reader cannot verify.
 *
 * **An imported file is untrusted input, and is fully validated before
 * anything is committed** (§12.15). `importJson` accepts either the raw `.json`
 * or a `RECORD OF WORK` `.html`, because the failure mode that removes is a
 * learner who keeps the pretty document and loses the record.
 *
 * **A mismatched content digest is a tamper INDICATOR, never a guarantee**
 * (§12.15, §12.12.5). A hash cannot prevent forgery in a client-only system —
 * whoever edited the record could recompute it — so the file is imported and
 * the state is printed, rather than rejected on the strength of a check that
 * only ever detects the careless case.
 */

/** §12.12.1's rule for a filename: a fixed ASCII template, never the name. */
function exportFilename(at: string): string {
  return `hl-record-${at.slice(0, 10)}.json`
}

/**
 * §12.12.5 — the digest as the `RECORD OF WORK` prints it, lifted back out.
 *
 * A substring match on the document's own definition list, not a parse: the
 * file is untrusted input and there is nothing here worth building a parser
 * for. Returns null for a raw `.json` export, which carries no digest at all,
 * and null if `report.ts` ever renames the row — both degrade to
 * `NO CONTENT DIGEST IN THIS FILE`, which is a true statement about the file
 * rather than an accusation about the reader.
 *
 * Exported for the test, which is the only way this is reachable in node.
 */
export function printedDigestFrom(text: string): string | null {
  const row = /<dt[^>]*>\s*Content digest\s*<\/dt>\s*<dd[^>]*>\s*([0-9a-f]{64})\s*<\/dd>/i.exec(text)
  return row === null ? null : row[1].toLowerCase()
}

/**
 * SHA-256 over the canonical record JSON, hex — the same input
 * `buildRecordOfWork` was handed. Null where Web Crypto is not available, which
 * prints as `NOT CHECKED`: §12.1.6's rule that a value which was not queried is
 * never printed as an answer applies to a hash as much as to storage state.
 */
async function sha256Hex(input: string): Promise<string | null> {
  try {
    if (typeof crypto === 'undefined' || crypto.subtle === undefined) return null
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

type DigestState = 'matched' | 'edited' | 'absent' | 'unchecked'

type ImportState =
  | { kind: 'idle' }
  | { kind: 'imported'; digest: DigestState; schema: number }
  | { kind: 'empty' }
  | { kind: 'unreadable'; reason: 'newer' | 'malformed' }
  | { kind: 'unopened' }

/** §12.14.1's register: uppercase mono key, value, no terminal period. */
const DIGEST_READOUT: Record<DigestState, string> = {
  matched: 'CONTENT DIGEST MATCHED',
  // §12.15's exact wording. A visible, honest state — not a rejection.
  edited: 'EDITED OUTSIDE THIS APPLICATION',
  absent: 'NO CONTENT DIGEST IN THIS FILE',
  unchecked: 'CONTENT DIGEST NOT CHECKED',
}

export function DataPanel() {
  const hydrated = useHydrated()

  const [exported, setExported] = useState<string | null>(null)
  const [imported, setImported] = useState<ImportState>({ kind: 'idle' })
  /**
   * §12.15 — the pre-erase snapshot, held in memory and nowhere else. Both
   * keys, because both were erased: the live record, and the raw copy §12.1.2
   * set aside from a payload this build could not read.
   */
  const [undo, setUndo] = useState<{
    data: RecordData
    quarantine: string | null
    at: number
  } | null>(null)
  const [erasedAt, setErasedAt] = useState<number | null>(null)
  /**
   * §14.6 — what happened to the account's copy, or null while signed out.
   * Held rather than assumed: a refused delete and a dropped connection are
   * indistinguishable from here, so the reader is told the copy MAY remain
   * rather than being told either way.
   */
  const [remoteErase, setRemoteErase] = useState<RemoteEraseOutcome | null>(null)
  const [left, setLeft] = useState(0)

  /**
   * The countdown. Every initial value above is a constant the server computes
   * identically (§12.2), and `Date.now()` is only ever read inside this effect
   * and inside an event handler — never in a render path.
   */
  useEffect(() => {
    if (undo === null) return
    const at = undo.at
    function tick(): void {
      const remaining = undoSecondsLeft(at, Date.now())
      setLeft(remaining)
      // The window shut. The snapshot goes with it: holding the record in
      // memory after the offer expired would keep data the reader erased.
      if (remaining === 0) setUndo(null)
    }
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [undo])

  /**
   * §12.15 — `Blob` + `URL.createObjectURL` + a programmatic `<a download>`.
   *
   * The revoke is deferred by one task rather than run on the next line. The
   * click is dispatched synchronously, but the browser fetches the blob URL to
   * start the download AFTER the handler returns, so revoking immediately is a
   * genuine race that loses the file — and never revoking leaks the blob for
   * the life of the document.
   */
  function onExport(): void {
    const at = nowIso()
    // §7.3, §12.12.6 — the day goes in BEFORE the bytes are frozen. The reader
    // is demonstrably active right now, they just clicked; and the exported file
    // is their backup, so a day stamped one line later is a tick they earned and
    // would silently lose on re-import. `lastExport` is the opposite case and is
    // set after the download starts, so the file never claims an export that had
    // not happened when it was written.
    update((data) => markActivity(data, at))
    const json = exportJson(snapshot(), at)
    let url: string | null = null
    try {
      const blob = new Blob([json], { type: 'application/json' })
      url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = exportFilename(at)
      link.rel = 'noopener'
      document.body.append(link)
      link.click()
      link.remove()
    } catch {
      // A browser that refused the download has not exported anything, and the
      // readout below must not claim it did.
      if (url !== null) URL.revokeObjectURL(url)
      return
    }
    const revoke = url
    setTimeout(() => URL.revokeObjectURL(revoke), 0)
    // §12.15 — recorded, so `NO EXPORT ON RECORD` can be a truthful state.
    update((data) => markExported(data, at))
    flush()
    setExported(at)
  }

  async function onImport(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0] ?? null
    // Cleared so that picking the same file twice fires `change` twice: a
    // control that silently does nothing the second time is a control lying
    // about what it is.
    event.target.value = ''
    if (file === null) return

    let text: string
    try {
      text = await file.text()
    } catch {
      setImported({ kind: 'unopened' })
      return
    }

    // §12.15 — full validation BEFORE anything is committed.
    const result = importJson(text)
    if (result.kind === 'empty') {
      setImported({ kind: 'empty' })
      return
    }
    if (result.kind === 'quarantine') {
      setImported({ kind: 'unreadable', reason: result.reason })
      return
    }

    const printed = printedDigestFrom(text)
    let digest: DigestState
    if (printed === null) {
      digest = 'absent'
    } else if (result.schema !== SCHEMA_VERSION) {
      // The digest was taken over the record in its OLD shape; the ladder has
      // since migrated it, so the two hashes cannot agree and a mismatch here
      // would be a false accusation.
      digest = 'unchecked'
    } else {
      const actual = await sha256Hex(canonicalRecordJson(result.data))
      digest = actual === null ? 'unchecked' : actual === printed ? 'matched' : 'edited'
    }

    update(() => result.data)
    flush()
    setImported({ kind: 'imported', digest, schema: result.schema })
  }

  function onErase(): void {
    const at = Date.now()
    // The snapshot is taken before the write, and it is everything that was
    // there: undo has to restore the thing that was erased, not a
    // reconstruction of part of it.
    setUndo({ data: snapshot(), quarantine: readRawStored().quarantine, at })
    setErasedAt(at)
    setLeft(undoSecondsLeft(at, at))
    // §16.3 — `erasedRecord` and not `EMPTY_RECORD`: it owns the one field an
    // erase must NOT reset, and it owns the argument for why. This panel does
    // not sign the reader out, so a flag reset here would let the next claim
    // re-decide the alias offer and write the reader's name back into the record
    // they just erased, in this tab, while the reader is still looking at it.
    //
    // FOR THIS TAB is the whole of the claim: `eraseStored()` two lines down
    // removes the key this record is written to, so the flag does not outlive
    // the load. `erase.ts` states that limit and argues why a tombstone that DID
    // outlive it would cost more than it buys.
    update((data) => erasedRecord(data))
    // Immediate, then the keys go: the flush clears the pending write, so
    // nothing rewrites the key half a second after it was removed.
    flush()
    eraseStored()
    setImported({ kind: 'idle' })
    setExported(null)

    // §14.6 — and only now. `eraseAccountCopy` settles the push this erase just
    // queued before it deletes, so the row cannot be recreated by a flush that
    // lands a moment later. Fire-and-forget: §12.2's rule is that a local write
    // never waits for the network, and an erase is the write that can least
    // afford to.
    setRemoteErase(null)
    void eraseRemote(hasAccountCopy() ? () => eraseAccountCopy() : null).then(setRemoteErase)
  }

  function onUndo(): void {
    if (undo === null) return
    update(() => undo.data)
    flush()
    restoreStoredQuarantine(undo.quarantine)
    setUndo(null)
    setErasedAt(null)
  }

  return (
    <div className="grid gap-6">
      {/* ---- EXPORT ------------------------------------------------------- */}
      <div>
        <div className="hl-signoff-actions">
          <button type="button" className="hl-btn" onClick={onExport}>
            EXPORT YOUR RECORD
          </button>
          {exported !== null && (
            <span className="hl-mark text-ink-muted" role="status">
              {`EXPORTED ${exported.slice(0, 10)}`}
            </span>
          )}
        </div>
        <p className="mt-2 mb-0 font-display text-meta leading-normal text-ink-muted">
          One JSON file, indented so it can be read in a text editor. It is
          written by this page and downloaded by this browser; nothing is
          uploaded. An export taken with nothing recorded says exactly that.
        </p>
      </div>

      {/* ---- IMPORT ------------------------------------------------------- */}
      <div>
        <label className="hl-field">
          <span className="hl-field-label">Import a record from a file</span>
          <input
            type="file"
            accept=".json,.html,application/json,text/html"
            onChange={(event) => void onImport(event)}
            // `.hl-field input` already gives the border, the ground and the
            // type; a file input needs its own height and vertical padding.
            className="block h-auto w-full p-2"
          />
        </label>
        <p className="hl-field-hint">
          Either the exported .json or the RECORD OF WORK .html that carries it.
          Importing replaces the record in this browser with the one in the file.
        </p>

        {imported.kind !== 'idle' && (
          <div className="mt-2" role="status">
            {imported.kind === 'imported' && (
              <>
                <p className="hl-mark m-0 text-ink">
                  {`RECORD IMPORTED · SCHEMA ${imported.schema}`}
                </p>
                <p
                  className={
                    imported.digest === 'edited'
                      ? 'hl-not-saved hl-mark'
                      : 'hl-mark m-0 mt-1 text-ink-muted'
                  }
                >
                  {DIGEST_READOUT[imported.digest]}
                </p>
                <p className="mt-1 mb-0 font-display text-meta leading-normal text-ink-muted">
                  {imported.digest === 'edited'
                    ? 'The record in this file does not hash to the digest printed '
                      + 'in it. The file was imported anyway, because a hash '
                      + 'cannot prevent forgery in a system with no server: it '
                      + 'is an indicator, not a guarantee.'
                    : 'A digest proves only that the file has not changed since '
                      + 'it was generated. It proves nothing about the facts '
                      + 'inside it.'}
                </p>
              </>
            )}
            {imported.kind === 'empty' && (
              <>
                <p className="hl-mark m-0 text-ink">NO RECORD IN THIS FILE</p>
                <p className="mt-1 mb-0 font-display text-meta leading-normal text-ink-muted">
                  Nothing was changed. The exported .json and the RECORD OF WORK
                  .html both carry the record; another file does not.
                </p>
              </>
            )}
            {imported.kind === 'unreadable' && (
              <>
                <p className="hl-mark m-0 text-ink">
                  {imported.reason === 'newer'
                    ? 'FILE WRITTEN BY A NEWER VERSION OF THIS SITE — NOT READ'
                    : 'FILE IS NOT THE SHAPE THIS SITE WRITES — NOT READ'}
                </p>
                <p className="mt-1 mb-0 font-display text-meta leading-normal text-ink-muted">
                  Nothing was changed, and the file on disk is untouched.
                  {imported.reason === 'newer'
                    ? ' Reload this site to pick up the newer version, then import it again.'
                    : ''}
                </p>
              </>
            )}
            {imported.kind === 'unopened' && (
              <p className="hl-mark m-0 text-ink">THIS FILE COULD NOT BE OPENED</p>
            )}
          </div>
        )}
      </div>

      {/* ---- ERASE -------------------------------------------------------- */}
      <div>
        <div className="hl-signoff-actions">
          <EraseDialog onConfirm={onErase} onExport={onExport} exportedAt={exported} />
          {undo !== null && left > 0 && (
            <button type="button" className="hl-btn" onClick={onUndo}>
              UNDO
            </button>
          )}
        </div>

        {/* §12.15 — reversible, and the line says for how long. `hydrated`
            gates it because an erased state can only ever follow a click this
            session made; the server has nothing to say about it. */}
        {erasedAt !== null && hydrated && (
          <div className="mt-2" role="status">
            <p className="hl-mark m-0 text-ink">
              {undo !== null && left > 0 ? undoLabel(left) : UNDO_CLOSED}
            </p>
            {/* §14.6 — said only when it needs saying. `remoteEraseNote`
                returns null for `deleted` and for `signed-out`: a delete that
                worked is what the dialog already promised, and warning a
                signed-out reader about an account copy sends them chasing a
                row that never existed. */}
            {remoteErase !== null && remoteEraseNote(remoteErase) !== null && (
              <>
                <p className="hl-mark mt-1 mb-0 text-ink">{REMOTE_ERASE_FAILED}</p>
                <p className="mt-1 mb-0 font-display text-meta leading-normal text-ink-muted">
                  {remoteEraseNote(remoteErase)}
                </p>
              </>
            )}
            <p className="mt-1 mb-0 font-display text-meta leading-normal text-ink-muted">
              The sign-off marks drawn before this page loaded stay on screen
              until the page is reloaded: they are painted by the boot script,
              which reads the record once, before anything else runs.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
