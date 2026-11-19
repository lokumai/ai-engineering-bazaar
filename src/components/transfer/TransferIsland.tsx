'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  appLink,
  decodeTransfer,
  mergeTransfer,
  payloadFromHash,
  transferCounts,
  type TransferProgress,
} from '@/lib/record/transfer'
import { flush, requestPersistence, snapshot, update } from '@/lib/record/store'
import type { RecordData } from '@/lib/record/schema'

/**
 * D144 — `/transfer/`: a progress link from the app (its share sheet) or from this site's
 * "Move to the app", opened in a browser. The progress is in the fragment, so it is read here,
 * after mount, and never by the server, which the fragment never reaches.
 *
 * Nothing is applied on open. The reader sees what the link holds and adds it with one button,
 * through `store.ts`'s `update`, the record's only writer, and `mergeTransfer`, which only adds.
 * The fragment is then cleared, so a reload or a shared screenshot of the address bar does not
 * carry the progress any further.
 *
 * On a touch device the page also offers the app's own scheme: until the app links are live, a
 * phone that scans the code lands here in its browser, and this is the way into the app.
 */

export const TRANSFER_COPY = {
  fragment: 'The progress is in the link itself, after the # sign, and a browser never sends that part to a server.',
  none: 'This page opens a progress link made by the app or by',
  noneLink: 'Progress',
  noneEnd: 'on this site.',
  unreadable: 'This link cannot be read. Nothing was changed.',
  engineers: 'For Engineers',
  everyone: 'For Everyone',
  add: "Add to this browser's progress",
  added: 'Added. Nothing here was removed.',
  nothingNew: 'Nothing new: this browser already has all of it.',
  open: 'Open in the Bazaar app',
  openHint: 'This works when the app is on this phone.',
  after: 'Your progress',
} as const

type State =
  | { kind: 'reading' }
  | { kind: 'none' }
  | { kind: 'unreadable' }
  | { kind: 'ready'; progress: TransferProgress; payload: string }
  | { kind: 'added' }
  | { kind: 'nothing-new' }

function completedModules(count: number): string {
  return `${count} ${count === 1 ? 'module' : 'modules'} completed`
}

function hasCompletion(data: RecordData): boolean {
  return [...Object.values(data.sheets), ...Object.values(data.everyoneSheets)].some(
    (sheet) => sheet.signedOff !== null,
  )
}

export function TransferIsland() {
  const [state, setState] = useState<State>({ kind: 'reading' })
  const [touch, setTouch] = useState(false)

  useEffect(() => {
    setTouch(window.matchMedia('(pointer: coarse)').matches)

    let live = true
    function read(): void {
      const payload = payloadFromHash(window.location.hash)
      if (payload === null) {
        setState({ kind: 'none' })
        return
      }
      setState({ kind: 'reading' })
      void decodeTransfer(payload).then((progress) => {
        if (!live) return
        setState(progress === null ? { kind: 'unreadable' } : { kind: 'ready', progress, payload })
      })
    }
    read()
    // A second link pasted into the same tab changes only the fragment, which is no navigation.
    window.addEventListener('hashchange', read)
    return () => {
      live = false
      window.removeEventListener('hashchange', read)
    }
  }, [])

  function onAdd(progress: TransferProgress): void {
    const before = snapshot()
    update((data) => mergeTransfer(data, progress))
    const after = snapshot()
    if (after === before) {
      setState({ kind: 'nothing-new' })
    } else {
      flush()
      setState({ kind: 'added' })
      // The first completion on a record is the one gesture `navigator.storage.persist()` may
      // be asked on (ARCHITECTURE §5), whichever control brought it.
      if (!hasCompletion(before) && hasCompletion(after)) void requestPersistence()
    }
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }


  return (
    <div className="bz-transfer">
      {state.kind === 'none' && (
        <p className="bz-transfer-line">
          {TRANSFER_COPY.none}{' '}
          <Link href="/profile/" className="bz-link">
            {TRANSFER_COPY.noneLink}
          </Link>{' '}
          {TRANSFER_COPY.noneEnd}
        </p>
      )}

      {state.kind === 'unreadable' && (
        <p className="bz-transfer-line" role="status">
          {TRANSFER_COPY.unreadable}
        </p>
      )}

      {state.kind === 'ready' && (
        <>
          <dl className="bz-defs bz-transfer-counts">
            <dt>{TRANSFER_COPY.engineers}</dt>
            <dd>{completedModules(transferCounts(state.progress).engineers)}</dd>
            <dt>{TRANSFER_COPY.everyone}</dt>
            <dd>{completedModules(transferCounts(state.progress).everyone)}</dd>
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="bz-btn" onClick={() => onAdd(state.progress)}>
              {TRANSFER_COPY.add}
            </button>
            {touch && (
              <a href={appLink(state.payload)} className="bz-btn bz-btn-quiet">
                {TRANSFER_COPY.open}
              </a>
            )}
          </div>
          {touch && <p className="bz-transfer-hint">{TRANSFER_COPY.openHint}</p>}
        </>
      )}

      {(state.kind === 'added' || state.kind === 'nothing-new') && (
        <>
          <p className="bz-transfer-line" role="status">
            {state.kind === 'added' ? TRANSFER_COPY.added : TRANSFER_COPY.nothingNew}
          </p>
          <p className="bz-transfer-line">
            <Link href="/profile/" className="bz-link">
              {TRANSFER_COPY.after}
            </Link>
          </p>
        </>
      )}

      <p className="bz-transfer-hint">{TRANSFER_COPY.fragment}</p>
    </div>
  )
}
