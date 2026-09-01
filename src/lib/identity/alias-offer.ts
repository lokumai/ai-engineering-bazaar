/**
 * §16.3 — the alias a signed-in reader is OFFERED, derived from the address
 * they signed in with.
 *
 * One pure function, and the reason it is its own module rather than a helper
 * inside `AccountSync` is §16.3.1: the offer is a decision about a string, the
 * seam is a decision about when to write. Keeping the string decision here
 * means it can be pinned exhaustively without a session, a clock or a store,
 * and it keeps `name.ts`'s import direction intact — this module reaches
 * nothing but `name.ts`, so the client side of §12.2's line can hold it.
 *
 * Four decisions were settled here rather than at the call site, each against a
 * rejected alternative:
 *
 * 1. **The local part only.** §16.3's fourth constraint: the domain is the
 *    mailbox provider, not part of anybody's name, and the full address is not
 *    a thing to print in a title block. Split at the LAST `@`, not the first:
 *    an address is `local@domain` and a domain carries no `@`, so the last one
 *    is the separator even for the quoted local parts RFC 5321 permits. The
 *    rejected alternative, `split('@')[0]`, silently keeps a domain fragment
 *    out of `a@b@example.com`.
 *
 * 2. **A `+tag` is dropped.** The tag is mail routing — a filter the reader set
 *    up for their inbox — so `ada+signups@x.co` offering `ada+signups` prints
 *    plumbing where a name goes. Rejected alternative: keep it, on the grounds
 *    that it is literally what the reader typed. It loses, because the offer's
 *    whole claim is "this looks like your name", and a routing tag never does.
 *
 * 3. **The case is kept exactly as typed.** §12.3.4's rule, and the measurement
 *    behind it: `'ilker'.toUpperCase()` is a dotless `I` where a Turkish reader
 *    expects `İ`, so this module does no casing at all — not to lower, not to
 *    title-case `ada.lovelace` into `Ada Lovelace`. Dots stay dots for the same
 *    reason: turning them into spaces is a second guess stacked on the first,
 *    and the reader can correct one guess more easily than two.
 *
 * 4. **Past the grapheme cap it offers NOTHING, rather than a truncation.**
 *    `MAX_NAME_GRAPHEMES` is documented in `name.ts` as an entry cap and
 *    explicitly NOT a truncation; `sanitiseName` does not truncate either. A
 *    cut local part would be a name the reader never had, printed as though the
 *    site knew it, and — cut by code unit — could halve a grapheme cluster. The
 *    rejected alternative was a grapheme-aware slice: it is implementable
 *    (`countGraphemes` is right there) but it produces a wrong answer more
 *    confidently, and an empty field asks the reader the question honestly.
 *
 * Sanitising is `sanitiseName`'s, never re-implemented here. That is what makes
 * a bidi override in a local part impossible to smuggle through: the removal
 * list, the whitespace collapse and the NFC normalisation all have one author.
 */

import { MAX_NAME_GRAPHEMES, countGraphemes, sanitiseName } from './name'

/**
 * The local part of an email address, sanitised into a name the record will
 * accept, or `null` when there is nothing usable.
 *
 * Null is the ordinary answer, not an error: an OAuth account that hides its
 * address yields no email at all, a `+tag`-only local part yields nothing after
 * the tag is dropped, and a local part made entirely of removed characters
 * sanitises to the empty string. In every one of those cases the alias field
 * stays empty and the reader types what they want, which is the same state a
 * reader who never signed in is in.
 *
 * Pure: no clock, no storage, no session. The caller decides whether an offer
 * may be written (§16.3's four constraints live at the seam, not here).
 */
export function aliasFromEmail(email: string | null | undefined): string | null {
  if (typeof email !== 'string') return null

  const at = email.lastIndexOf('@')
  if (at <= 0) return null

  const local = email.slice(0, at)
  // A `+` at index 0 leaves nothing before the tag, which the emptiness check
  // below turns into null — the same answer as an address with no local part.
  const plus = local.indexOf('+')
  const untagged = plus === -1 ? local : local.slice(0, plus)

  const name = sanitiseName(untagged)
  if (name === '') return null
  if (countGraphemes(name) > MAX_NAME_GRAPHEMES) return null
  return name
}
