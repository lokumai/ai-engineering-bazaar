'use client'

import * as Dialog from '@radix-ui/react-dialog'

/**
 * §4.7 — below the width where a rail can sit beside the prose, the rail's
 * content moves behind one control in the module's sub-header.
 *
 * The arithmetic is why this exists at all: 262 + 24 + a readable measure does
 * not fit beside 204 more at 1024px, and at 390px nothing fits beside anything.
 * Something has to move, and putting it behind a control the reader opens is
 * the move §4.7 chooses.
 *
 * ## M11 — one drawer, two rails, two breakpoints
 *
 * The drawer used to hold the left rail, which held the contents. Since the
 * swap it holds whichever rails the window has taken away, and *which* widths
 * those are depends on the format — so the caller says which breakpoint this
 * control belongs to and CSS keys off `data-hl-at`:
 *
 * - `wide` — a drawn module, whose contents rail goes first. The control
 *   appears at that point and the panel carries the contents; the curriculum
 *   list joins it further down, when the left rail goes too.
 * - `narrow` — a draft module. It has no contents rail to lose (§4.5 gives it
 *   one sentence and a schedule), so the only thing the drawer can ever carry
 *   is the curriculum, and the control has no reason to exist until the left
 *   rail is gone.
 *
 * Without that split a draft module showed a `Contents` control at 1024px that
 * opened an empty panel — a control that cannot do its job, which §1's second
 * question forbids.
 *
 * Radix is used for exactly what Appendix C buys it for — focus trap, `Esc`,
 * focus restored to the trigger (§10.3) — and for none of its looks. The panel
 * is bordered and unanimated, because §9.4 permits three animations on this
 * site and a drawer is not one of them.
 *
 * §4.7 also names `[` as a shortcut here, which §5.11 binds site-wide to
 * "previous module". That collision is left for the keyboard slice to resolve;
 * the control is the accessible trigger and needs no shortcut to work.
 */
export function ContentsDrawer({
  at,
  children,
}: {
  /** Which breakpoint reveals this control. See the note above. */
  at: 'wide' | 'narrow'
  children: React.ReactNode
}) {
  return (
    <Dialog.Root>
      <div className="bz-drawer-bar" data-bz-at={at}>
        <Dialog.Trigger className="bz-btn-quiet bz-btn">Contents</Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="bz-drawer-backdrop" />
        {/* No description: the panel is a list of links, and Radix would
            otherwise warn about a `Description` this dialog does not need. */}
        <Dialog.Content className="bz-drawer" aria-describedby={undefined}>
          <div className="bz-drawer-head">
            <Dialog.Title className="bz-drawer-title">Contents</Dialog.Title>
            <Dialog.Close className="bz-btn-quiet bz-btn">Close</Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
