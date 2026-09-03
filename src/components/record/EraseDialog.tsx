'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { tally } from '@/lib/record/derive'
import {
  ERASE_CLOSE_ACCOUNT,
  ERASE_ORG_HISTORY,
  ERASE_SCOPE,
  ERASE_WORD,
  NOTHING_RECORDED,
  confirmsErase,
  eraseTallyLines,
  eraseTallySentence,
} from '@/lib/record/erase'
import { useRecord } from '@/lib/record/store'

/**
 * §12.15 — `ERASE ALL LOCAL DATA`, a WCAG 3.3.4 obligation satisfied twice
 * over: **confirmed** here, and **reversible** by the ten-second undo window
 * `DataPanel` holds.
 *
 * **This is the only confirmation dialog on the site, and that is what makes it
 * work.** §12.4.1 refuses one on sign-off and un-sign, §12.13 refuses one on
 * clearing a filter, §12.3 refuses one on editing the name. Crying wolf is how
 * a reader learns to auto-confirm the one dialog that matters.
 *
 * Four things §12.15 fixes, none of them decoration:
 *
 *  - **The title is a question a reader can answer.** `Erase all progress in
 *    this browser?` names the scope. "Are you sure?" asks the reader to
 *    confirm a decision the dialog has not described.
 *  - **The body enumerates the actual counts** — `7 sheet states, 1 name, 3
 *    submittals` — from `tally`, so the sentence and the record cannot
 *    disagree. At zero it says there is nothing recorded rather than printing
 *    an empty list, and the control stays live: §12.13's rule is that a
 *    disabled control with no stated reason is a page asserting a state the
 *    reader cannot verify.
 *  - **The buttons state outcomes.** `Erase all data` / `Keep my data`, never
 *    Yes/No — and the decline label states the SAFE outcome without shame or
 *    loss framing. §12.14.1 bans confirmshaming, and its own example of the
 *    thing not to write is `No, I don't care about my progress`.
 *  - **`EXPORT YOUR RECORD` is inside the dialog**, so the safe path is one
 *    click from the destructive one rather than a route away from it.
 *
 * The typed confirmation gates the danger button with a real `disabled`, not an
 * `aria-disabled` that swallows clicks: for a destructive action the guarantee
 * has to hold for every input modality. §12.13's condition on disabling — print
 * the reason beside it — is met by the field's own label, which sits directly
 * above the button and says what to type.
 *
 * Radix is here for behaviour only, exactly as `ShortcutSheet` buys it: focus
 * trap, `Esc`, focus restored to the trigger. None of its looks; no animation,
 * because §9.4 permits three on this site and a dialog is not one of them.
 */
/**
 * §12.15's copy, in one table, for the reason `EmptyState` gives for
 * `emptyStateCopy`: this is where the register is enforced, so it has to be
 * somewhere a node test can read it (§12.14.2). Radix portals into
 * `document.body` and there is no DOM in a unit test, so the open dialog's
 * markup is unreachable there — the strings are not.
 *
 * Every label here is load-bearing:
 *
 *  - `title` names the SCOPE. "Are you sure?" asks a reader to confirm a
 *    decision the dialog has not described, which is not a question anybody can
 *    answer.
 *  - `danger` and `decline` state OUTCOMES, never Yes/No — and the decline
 *    states the SAFE outcome with no shame and no loss framing. §12.14.1's own
 *    example of the thing not to write is `No, I don't care about my progress`.
 *  - `scope` and `history` are the §14.6 table, in words. `scope` is composed
 *    from `erase.ts` rather than written here, because the module that performs
 *    the deletion and the sentence that promises it must not be able to drift
 *    apart — and because a promise on this site is testable in node (§12.14.2).
 *
 * **What `scope` no longer says.** Until §14.6 it ended "It changes nothing on
 * any other device, and nothing anywhere else: the record was never sent
 * anywhere." Phase 4's entire job is to send the record to `record_state`, so
 * that clause became false and is gone. It has NOT been replaced with silence:
 * `history` states the half of §14.6 this button cannot perform, in the same
 * terms `/join/`'s §14.5.1 panel uses, because a reader who erases and then
 * discovers their employer still holds the log was misled by both screens.
 */
export const ERASE_COPY = {
  trigger: 'ERASE ALL LOCAL DATA',
  head: 'Erase',
  title: 'Erase all progress in this browser?',
  scope: ERASE_SCOPE,
  /**
   * §14.6 rows 2 and 3, the spec's own added line — "Kurumsal geçmişin
   * silinmez; tamamen silmek için hesabını kapat." — in English. Two sentences
   * rather than one clause: the survival of the log and the one way to end it
   * are separate facts, and joining them with a semicolon buries the second.
   */
  history: `${ERASE_ORG_HISTORY} ${ERASE_CLOSE_ACCOUNT}`,
  confirmLabel: `Type ${ERASE_WORD} to confirm`,
  danger: 'Erase all data',
  decline: 'Keep my data',
  export: 'EXPORT YOUR RECORD',
} as const

export function EraseDialog({
  onConfirm,
  onExport,
  exportedAt = null,
}: {
  /** Called once, on a confirmed erase. The caller holds the undo snapshot. */
  onConfirm: () => void
  /** §12.15 — the same export the panel runs, so there is one implementation. */
  onExport: () => void
  /**
   * ISO instant of the last export this session took, or null.
   *
   * The safe path has to confirm itself where it was taken. A reader who
   * clicks `EXPORT YOUR RECORD` inside this dialog and sees nothing change has
   * no reason to believe the file exists, and the next thing they are being
   * offered is irreversible.
   */
  exportedAt?: string | null
}) {
  const record = useRecord()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')

  const counts = tally(record)
  const lines = eraseTallyLines(counts)
  const armed = confirmsErase(typed)

  function onOpenChange(next: boolean): void {
    setOpen(next)
    // The typed word does not survive a close. A confirmation still armed from
    // last time is a confirmation of nothing.
    if (!next) setTyped('')
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger className="hl-btn hl-btn-danger">{ERASE_COPY.trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="hl-dialog-backdrop" />
        {/* `aria-describedby={undefined}`: Radix otherwise warns about a
            `Description` this dialog has no single honest sentence for — the
            enumeration below is a list, and the list IS the description. */}
        <Dialog.Content className="hl-dialog" aria-describedby={undefined}>
          <div className="hl-dialog-head hl-mark">{ERASE_COPY.head}</div>

          <div className="hl-dialog-body">
            <Dialog.Title className="hl-dialog-title">{ERASE_COPY.title}</Dialog.Title>

            {lines.length === 0 ? (
              <p className="hl-dialog-tally">{NOTHING_RECORDED}</p>
            ) : (
              <ul className="hl-dialog-tally" aria-label={eraseTallySentence(counts)}>
                {lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}

            <p className="m-0 mb-2 font-display text-meta leading-normal text-ink-muted">
              {ERASE_COPY.scope}
            </p>
            {/* §14.6 — its own paragraph, not a fourth clause of the one above.
                This is the sentence a reader in an organisation has to leave
                the dialog having read, and a sentence appended to a paragraph
                about storage keys is a sentence that gets skimmed. */}
            <p className="m-0 mb-3 font-display text-meta leading-normal text-ink-muted">
              {ERASE_COPY.history}
            </p>

            <label className="hl-field">
              <span className="hl-field-label">{ERASE_COPY.confirmLabel}</span>
              <input
                type="text"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </label>

            <div className="hl-dialog-actions">
              <button
                type="button"
                className="hl-btn hl-btn-danger"
                disabled={!armed}
                onClick={() => {
                  if (!confirmsErase(typed)) return
                  onConfirm()
                  onOpenChange(false)
                }}
              >
                {ERASE_COPY.danger}
              </button>
              {/* The safe outcome, stated. Not "Cancel", which describes the
                  dialog rather than the data, and never a decline that shames. */}
              <Dialog.Close className="hl-btn">{ERASE_COPY.decline}</Dialog.Close>
              {/* §12.15 — one click from the destructive path. */}
              <button type="button" className="hl-btn" onClick={onExport}>
                {ERASE_COPY.export}
              </button>
              {exportedAt !== null && (
                <span className="hl-mark self-center text-ink-muted" role="status">
                  {`EXPORTED ${exportedAt.slice(0, 10)}`}
                </span>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
