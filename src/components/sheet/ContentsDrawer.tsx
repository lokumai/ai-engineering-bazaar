'use client'

import * as Dialog from '@radix-ui/react-dialog'

/**
 * §4.7 — below 1024px the left rail becomes a drawer, opened from a `CONTENTS`
 * control in the sheet's sub-header. 208 + 24 + 656 is 888px and simply does
 * not fit beside the prose at 768, so something has to move; putting the rail
 * behind a control the reader opens is the move §4.7 chooses.
 *
 * Radix is used for exactly what Appendix C buys it for — focus trap, `Esc`,
 * focus restored to the trigger (§10.3) — and for none of its looks: the
 * panel is hairline-bordered, zero radius, no shadow (§11.6), no backdrop
 * blur (§11.7) and no animation, because §9.4 permits three animations on this
 * site and a drawer is not one of them.
 *
 * §4.7 also names `[` as a shortcut here, which §5.11 binds site-wide to
 * "previous sheet". That collision is left for the keyboard slice to resolve;
 * the control is the accessible trigger and needs no shortcut to work.
 */
export function ContentsDrawer({ children }: { children: React.ReactNode }) {
  return (
    <Dialog.Root>
      <div className="hl-subheader">
        <Dialog.Trigger className="hl-button hl-mark">Contents</Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="hl-drawer-backdrop" />
        {/* No description: the panel is a list of links, and Radix would
            otherwise warn about a `Description` this dialog does not need. */}
        <Dialog.Content className="hl-drawer" aria-describedby={undefined}>
          <div className="hl-drawer-head">
            <Dialog.Title className="hl-mark">Contents</Dialog.Title>
            <Dialog.Close className="hl-button hl-mark">Close</Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
