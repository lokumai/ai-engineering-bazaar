'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { SHORTCUTS, routeFor } from '@/lib/record/keys'

/**
 * §12.16 — the shortcut sheet, and the `?` control that opens it.
 *
 * Radix is here for behaviour only, exactly as Appendix C buys it: focus trap,
 * `Esc`, focus restored to whatever opened it (§10.3). None of its looks — the
 * panel is `record.css`'s hairline dialog, zero radius, no shadow beyond
 * `--shadow-pop`, no backdrop blur (§11.7) and no animation, because §9.4
 * permits three animations on this site and a dialog is not one of them.
 *
 * **Every `g` row is a real link.** §12.16 requires each destination to be
 * reachable without the keyboard map at all, so the row that prints the chord
 * is also the row that navigates: one fact, stated once, in the place a reader
 * looks when they want it. A row whose destination does not exist on this route
 * — `g c` outside the drawing set — prints the key and no link, because there
 * is no current category to go to and inventing one would be §1's failure in a
 * single keystroke.
 *
 * **It says when it does not work.** `prefs.charKeys` is SC 2.1.4's off
 * switch, and `?` is itself a character shortcut, so with the switch off this
 * sheet can still be opened by its button while none of the keys it lists will
 * fire. A table of dead keys with nothing said about it is the same lie as a
 * baked-in progress bar.
 */

export interface ShortcutSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The current route, which is what `g c` resolves against. */
  pathname: string
  /** §12.16 — false means every key in this table is switched off. */
  charKeys: boolean
}

export function ShortcutSheet({ open, onOpenChange, pathname, charKeys }: ShortcutSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {/*
        §5.1 — a 28 × 28 icon button. Its glyph is the key that opens it, so
        the hint is printed on the control rather than only inside it.

        Hidden below 768px, where §4.7 puts the layout into one column and the
        header's slots run out: a control offering a table of keystrokes is a
        control for a device with keys. Nothing is lost — the `?` key still
        opens this sheet at every width, because the handler never asks how
        wide the viewport is.
      */}
      <Dialog.Trigger
        className="hl-icon-btn hidden md:inline-flex"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <span aria-hidden="true" className="hl-mark">?</span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="hl-dialog-backdrop" />
        {/* No description: the table is the content and the title names it.
            Radix would otherwise warn about a `Description` this dialog has no
            honest text for. */}
        <Dialog.Content className="hl-dialog" aria-describedby={undefined}>
          <div className="hl-dialog-head hl-mark">Shortcut sheet</div>

          <div className="hl-dialog-body">
            <Dialog.Title className="hl-dialog-title">Keyboard shortcuts</Dialog.Title>

            <table className="hl-keys">
              <tbody>
                {SHORTCUTS.map((row) => {
                  const href = row.target === null ? null : routeFor(row.target, pathname)
                  return (
                    <tr key={row.keys}>
                      <td>{row.keys}</td>
                      <td>
                        {href === null ? (
                          row.action
                        ) : (
                          <Link
                            href={href}
                            className="hl-link"
                            onClick={() => onOpenChange(false)}
                          >
                            {row.action}
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {!charKeys && (
              <div className="hl-note">
                <p>
                  Single-character shortcuts are switched off, so nothing in this table fires
                  except Esc. The switch is on the{' '}
                  <Link href="/profile/" className="hl-link" onClick={() => onOpenChange(false)}>
                    profile sheet
                  </Link>
                  .
                </p>
              </div>
            )}

            <div className="hl-dialog-actions">
              <Dialog.Close className="hl-btn">Close</Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
