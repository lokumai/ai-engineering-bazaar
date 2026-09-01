import type { Metadata } from 'next'
import { AliasSheet } from '@/components/identity/AliasSheet'
import { PageShell } from '@/components/shell/PageShell'
import { ALIAS_SCOPE } from '@/lib/record/scope'

export const metadata: Metadata = {
  title: 'Alias',
  description:
    'Put a name and a mark on the record this browser holds. It is not an '
    + 'account and it proves nothing; every sheet works without one.',
}

/**
 * §15.4 — `/sign-in/alias/`.
 *
 * **A server page around one client island**, the shape every route on this
 * site uses: the document is the same for every reader, which is the only thing
 * a prerender can honestly be, and everything that depends on *this* reader is
 * inside `AliasSheet` behind §12.2's channel B.
 *
 * **No network, and it is structural rather than promised** (§15.4.4). Nothing
 * on this route's own import graph reaches a supabase module, a session or a
 * fetch: the island holds the record store, `lib/identity/mark.ts` (which
 * imports nothing at all) and `lib/identity/name.ts`. `PageShell` is the one
 * `node:fs`-reaching import, exactly as on `/sign-in/`, and it runs at build
 * time to measure the footer's readout. So the exported document is a heading, a
 * paragraph, a field and eight radios, produced in node with no environment —
 * which is what `tests/e2e/alias.spec.ts` counts requests to confirm.
 *
 * **The eyebrow states the limit, not a benefit.** This route is reached from
 * the same list as the email and GitHub doors (§15.5.1), so the first line a
 * reader meets has to say which of the three this one is. `ALIAS_SCOPE` then
 * says what it does and does not do in full, from `scope.ts` rather than from
 * this file: §15.9.1's rule is that a sentence claiming where the record goes
 * has one author.
 *
 * **The eyebrow says FORM and not PAGE, and the difference is a lie it used to
 * tell.** It read `NO REQUEST LEAVES THIS PAGE`. The route's own import graph
 * makes that true of everything above — but `app/layout.tsx` wraps every
 * document in `SessionProvider` and `AccountSync`, so in a build with
 * `NEXT_PUBLIC_AUTH_ENABLED` on, a session is read and a record is synced while
 * this screen is open, and the reader had been told nothing would leave. The
 * §15.4.4 property is real and worth printing, so the claim is narrowed to the
 * thing that owns it — the form, whose only write is `localStorage` — rather
 * than deleted or hedged into a conditional the reader cannot check.
 *
 * **This page adds no third statement of the mark vocabulary.** The heading and
 * the lead name no glyph and no count; the eight options and their prose are the
 * island's, from `MARKS` and `STORABLE_MARK_IDS`.
 */
export default function AliasPage() {
  return (
    <PageShell sheet="ALIAS">
      <p className="hl-eyebrow hl-mark">LOCAL ONLY · THIS FORM SENDS NOTHING</p>

      <h1 className="hl-listing-title">Choose an alias</h1>

      <p className="hl-lead">{ALIAS_SCOPE}</p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      <AliasSheet />
    </PageShell>
  )
}
