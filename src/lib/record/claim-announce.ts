/**
 * §17.5 — did a newsworthy claim happen in THIS document?
 *
 * ## Why a module store and not context
 *
 * The seam (`AccountSync`) is mounted in the root layout AFTER `{children}`, and
 * the arrival line is rendered by `PageShell` inside the page column. Neither is
 * an ancestor of the other, so there is no provider that could hold this. A
 * module-level store with `subscribe`/`getSnapshot` is the shape `store.ts`
 * already uses for exactly this reason.
 *
 * ## Why a boolean and not the summary
 *
 * The summary is in the record (`meta.lastClaim`), which is where the register
 * row reads it. Putting a copy here would give the two surfaces two sources for
 * one fact — §16.4.2's "no new derivation", which is the rule the register was
 * paid for. So this answers one question and holds no content.
 *
 * ## Why it resets on a route change
 *
 * §17.1's third decision: navigation dismisses the line, and there is no DISMISS
 * button, because the detail is permanent in `/profile/`. A client transition
 * does not reload the document, so the flag has to be cleared by the reader's
 * act rather than by the document going away.
 *
 * Not persisted, anywhere: it is a fact about one document, and §12.1.1 has two
 * storage keys with one owning module each.
 */

let announced = false
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

/** The seam's only write, after `noteClaim` has landed. */
export function announceClaim(): void {
  if (announced) return
  announced = true
  notify()
}

/** The reader navigated, or the seam decided there was nothing to announce. */
export function clearClaimAnnounce(): void {
  if (!announced) return
  announced = false
  notify()
}

export function subscribeClaimAnnounce(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * `getSnapshot`. Also the `getServerSnapshot`: the prerendered HTML has never
 * met the reader, so no document it was rendered for has claimed anything
 * (§12.2, channel B — the same reasoning as `store.ts`'s frozen empty record).
 */
export function claimAnnounced(): boolean {
  return announced
}
