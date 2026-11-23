'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import { qrSquare } from '@/lib/qr'
import { QR_MAX_CHARS, encodeTransfer, nothingToMove, transferLink } from '@/lib/record/transfer'
import { useHydrated, useRecord } from '@/lib/record/store'
import { href } from '@/lib/url'
import { QrCode } from './QrCode'

/**
 * D144 — "Move to the app": this browser's progress as a transfer link, shown as a QR code the
 * reader scans with the phone's own camera. The app (or, until its app links are live, the
 * phone's browser on `/transfer/`) adds it to the progress on the phone.
 *
 * Nothing leaves the browser: the link is built here, from the record in memory, and the
 * progress travels in its fragment, which a browser never sends to a server. The link's origin is
 * the page's own (`window.location.origin` and the base path), so a development server reached
 * over the local network gives a link a phone on the same network can open.
 *
 * Scanning a code on the computer's screen with the computer's camera, the other direction, was
 * rejected by the owner as awkward; that direction is the app's share sheet and `/transfer/`.
 *
 * Radix for behaviour only, as `EraseDialog` uses it: focus trap, Escape, focus restored.
 *
 * ## Where the trigger is (option A, revision 2, 2026-11-19)
 *
 * One quiet button with a small QR glyph on the progress page's title row, left of the chord hint
 * (`playground/2026-11-transfer/A-on-your-phone.html` at commit 319dc94; the playground copy was removed in M137). It is there only once the record is read
 * and holds something to move: before hydration the page cannot know, and with nothing to move
 * the button would open a dialog that says so. An open dialog stays open if the record empties
 * under it (another tab erasing), and then says there is nothing to move.
 */

export const MOVE_COPY = {
  trigger: 'Move to the app',
  head: 'Move',
  title: 'Move your progress to the app',
  scan: "Scan the code with your phone's camera. The app adds this progress to its own and removes nothing.",
  nothing: 'This browser has no completed module and no ticked item to move.',
  tooLong:
    'This progress is too much for one code. Back up to a file here, then use Restore in the app.',
  qrLabel: 'QR code of the link to this progress',
  copy: 'Copy link',
  copied: 'Link copied.',
  copyFailed: 'The link could not be copied here. Copy it from the field above.',
  field: 'Transfer link',
  close: 'Close',
} as const

type CopyState = 'idle' | 'copied' | 'failed'

/** A QR code drawn small: three finder squares and a few modules, in the text's colour. */
function QrGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M2 2h5v5H2zM3.5 3.5v2h2v-2zM9 2h5v5H9zM10.5 3.5v2h2v-2zM2 9h5v5H2zM3.5 10.5v2h2v-2zM9 9h2v2H9zM12 9h2v2h-2zM9 12h2v2H9zM12 12h2v2h-2zM10.5 10.5h1.5v1.5h-1.5z" />
    </svg>
  )
}

export function MoveToAppDialog({
  triggerClassName,
  triggerGlyph = false,
  hideWhenEmpty = false,
}: {
  triggerClassName: string
  /** Draws the small QR glyph before the label. */
  triggerGlyph?: boolean
  /** Renders nothing until the record is read, and while it holds nothing to move. */
  hideWhenEmpty?: boolean
}) {
  const record = useRecord()
  const hydrated = useHydrated()
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copy, setCopy] = useState<CopyState>('idle')
  const empty = nothingToMove(record)

  // The link is built only while the dialog is open, and again if the record changes under it
  // (another tab ticking an item). `window` is read here, never in a render path.
  useEffect(() => {
    if (!open || empty) return
    let live = true
    void encodeTransfer(record).then((payload) => {
      if (live) setLink(transferLink(`${window.location.origin}${href('/')}`, payload))
    })
    return () => {
      live = false
    }
  }, [open, empty, record])

  function onOpenChange(next: boolean): void {
    setOpen(next)
    if (!next) {
      setLink(null)
      setCopy('idle')
    }
  }

  async function onCopy(): Promise<void> {
    if (link === null) return
    try {
      await navigator.clipboard.writeText(link)
      setCopy('copied')
    } catch {
      // No clipboard outside a secure context (a development server over the network) or when
      // the browser refuses: the link is shown in a field instead, to be copied by hand.
      setCopy('failed')
    }
  }

  if (hideWhenEmpty && !open && (!hydrated || empty)) return null

  const square = link !== null && link.length <= QR_MAX_CHARS ? qrSquare(link) : null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger className={triggerClassName}>
        {triggerGlyph && <QrGlyph />}
        {MOVE_COPY.trigger}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="bz-dialog-backdrop" />
        <Dialog.Content className="bz-dialog" aria-describedby={undefined}>
          <div className="bz-dialog-head text-mark">{MOVE_COPY.head}</div>

          <div className="bz-dialog-body">
            <Dialog.Title className="bz-dialog-title">{MOVE_COPY.title}</Dialog.Title>

            {empty && <p className="bz-transfer-line">{MOVE_COPY.nothing}</p>}

            {!empty && link !== null && square !== null && (
              <>
                <QrCode square={square} label={MOVE_COPY.qrLabel} />
                <p className="bz-transfer-line">{MOVE_COPY.scan}</p>
              </>
            )}

            {!empty && link !== null && square === null && (
              <p className="bz-transfer-line">{MOVE_COPY.tooLong}</p>
            )}

            {copy === 'failed' && link !== null && (
              <>
                <label className="bz-field">
                  <span className="bz-field-label">{MOVE_COPY.field}</span>
                  <input
                    type="text"
                    readOnly
                    value={link}
                    onFocus={(event) => event.target.select()}
                    spellCheck={false}
                    aria-describedby="bz-transfer-copy-hint"
                  />
                </label>
                <p id="bz-transfer-copy-hint" className="bz-field-hint" role="status">
                  {MOVE_COPY.copyFailed}
                </p>
              </>
            )}

            <div className="bz-actions">
              {!empty && link !== null && (
                <button type="button" className="bz-btn" onClick={() => void onCopy()}>
                  {MOVE_COPY.copy}
                </button>
              )}
              <Dialog.Close className="bz-btn bz-btn-quiet">{MOVE_COPY.close}</Dialog.Close>
              {copy === 'copied' && (
                <span className="text-mark self-center text-on-surface-muted" role="status">
                  {MOVE_COPY.copied}
                </span>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
