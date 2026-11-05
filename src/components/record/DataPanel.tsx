'use client'

import { useEffect, useState } from 'react'
import {
  UNDO_CLOSED,
  erasedRecord,
  eraseStored,
  readRawStored,
  restoreStoredQuarantine,
  undoLabel,
  undoSecondsLeft,
} from '@/lib/record/erase'
import { markActivity, markExported } from '@/lib/record/events'
import type { RecordData } from '@/lib/record/schema'
import {
  exportJson,
  flush,
  importJson,
  nowIso,
  snapshot,
  update,
  useHydrated,
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
 * anything is committed** (§12.15). Since M40 the importer reads the exported
 * `.json` only: the RECORD OF WORK `.html` and its content digest went with the
 * report.
 */

/** §12.12.1's rule for a filename: a fixed ASCII template, never the name. */
function exportFilename(at: string): string {
  return `hl-record-${at.slice(0, 10)}.json`
}

type ImportState =
  | { kind: 'idle' }
  | { kind: 'imported'; schema: number }
  | { kind: 'empty' }
  | { kind: 'unreadable'; reason: 'newer' | 'malformed' }
  | { kind: 'unopened' }

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

    update(() => result.data)
    flush()
    setImported({ kind: 'imported', schema: result.schema })
  }

  function onErase(): void {
    const at = Date.now()
    // The snapshot is taken before the write, and it is everything that was
    // there: undo has to restore the thing that was erased, not a
    // reconstruction of part of it.
    setUndo({ data: snapshot(), quarantine: readRawStored().quarantine, at })
    setErasedAt(at)
    setLeft(undoSecondsLeft(at, at))
    update((data) => erasedRecord(data))
    // Immediate, then the keys go: the flush clears the pending write, so
    // nothing rewrites the key half a second after it was removed.
    flush()
    eraseStored()
    setImported({ kind: 'idle' })
    setExported(null)

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
    <div className="bz-dataline">
      {/* M39 F2 — one quiet line: where the progress lives, and the three ways
          to keep it. The reasons the export exists are in this file's header. */}
      <p className="bz-dataline-text">
        Your progress is saved in this browser only. A backup file keeps it safe
        if the browser clears it, and moves it to another browser.
      </p>
      <div className="bz-dataline-actions">
        <button type="button" className="bz-link bz-dataline-action" onClick={onExport}>
          Back up to a file
        </button>
        <label className="bz-link bz-dataline-action">
          Restore from a file
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => void onImport(event)}
            className="bz-dataline-file"
          />
        </label>
        <EraseDialog
          onConfirm={onErase}
          onExport={onExport}
          exportedAt={exported}
          triggerLabel="Reset"
          triggerClassName="bz-link bz-dataline-action bz-dataline-reset"
        />
        {undo !== null && left > 0 && (
          <button type="button" className="bz-link bz-dataline-action" onClick={onUndo}>
            Undo
          </button>
        )}
      </div>

      {exported !== null && (
        <p className="bz-dataline-status" role="status">
          {`Backed up ${exported.slice(0, 10)}`}
        </p>
      )}

      {imported.kind !== 'idle' && (
        <div className="bz-dataline-status" role="status">
          {imported.kind === 'imported' && <p>Restored from the file.</p>}
          {imported.kind === 'empty' && (
            <p>Nothing was changed. That file holds no progress; only a backup file does.</p>
          )}
          {imported.kind === 'unreadable' && (
            <p>
              {imported.reason === 'newer'
                ? 'That file was written by a newer version of this site. Reload the site, then restore it again.'
                : 'That file is not a backup this site wrote. Nothing was changed.'}
            </p>
          )}
          {imported.kind === 'unopened' && <p>That file could not be opened.</p>}
        </div>
      )}

      {/* §12.15 — reversible, and the line says for how long. `hydrated`
          gates it because an erased state can only ever follow a click this
          session made; the server has nothing to say about it. */}
      {erasedAt !== null && hydrated && (
        <p className="bz-dataline-status" role="status">
          {undo !== null && left > 0 ? undoLabel(left) : UNDO_CLOSED}
        </p>
      )}
    </div>
  )
}
