'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { SHORTCUTS, routeFor } from '@/lib/record/keys'

/**
 * §12.16 — the shortcut sheet, and the `?` control that opens it.
 *
 * Radix is here for behaviour only, exactly as Appendix C buys it: focus trap,
 * `Esc`, focus restored to whatever opened it (§10.3). None of its looks — the
 * panel is `progress.css`'s hairline dialog, zero radius, no shadow beyond
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
        M18 — NO TRIGGER. The bar carried a 33px `?` button whose glyph was the
        key that opened it, so the hint was printed on the control. The author
        had the button removed; the sheet stays and `?` still opens it at every
        width, because the handler never asks how wide the viewport is.

        **Deleting the control deleted the discovery**, which is the trap §12.16
        set for anybody doing this: the button was one of only two places on the
        site that said a chord exists, and the other was the progress icon's
        `title`, which M18 removed in the same edit. So the table is on
        `/legend/` now — the page whose whole job is what the marks and the
        mechanisms here mean — rendered from this same `SHORTCUTS` array, so the
        two cannot come apart.
      */}

      <Dialog.Portal>
        <Dialog.Overlay className="bz-dialog-backdrop" />
        {/* No description: the table is the content and the title names it.
            Radix would otherwise warn about a `Description` this dialog has no
            honest text for. */}
        <Dialog.Content className="bz-dialog" aria-describedby={undefined}>
          <div className="bz-dialog-head text-mark">Keyboard shortcuts</div>

          <div className="bz-dialog-body">
            <Dialog.Title className="bz-dialog-title">Keyboard shortcuts</Dialog.Title>

            <table className="bz-keys">
              <tbody>
                {SHORTCUTS.map((row) => {
                  const href = row.target === null ? null : routeFor(row.target, pathname)
                  return (
                    <tr key={row.keys}>
                      <td><kbd>{row.keys}</kbd></td>
                      <td>
                        {href === null ? (
                          row.action
                        ) : (
                          <Link
                            href={href}
                            className="bz-link"
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
              <div className="bz-note">
                <p>
                  Single-character shortcuts are switched off, so nothing in this table fires
                  except Esc. The switch is on the{' '}
                  <Link href="/profile/" className="bz-link" onClick={() => onOpenChange(false)}>
                    account page
                  </Link>
                  .
                </p>
              </div>
            )}

            <div className="bz-actions">
              <Dialog.Close className="bz-btn">Close</Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
