'use client'

import { useEffect, useState } from 'react'

import { useSession } from '@/components/auth/SessionProvider'
import { ClaimSummary } from '@/components/record/ClaimSummary'
import type { CurriculumFacts } from '@/lib/content/facts'
import { PROFILES_TABLE, profileRowFor } from '@/lib/org/profile-sync'
import { selectAttention } from '@/lib/record/attention'
import { claimMerge, summariseClaim, type ClaimSummary as ClaimSummaryData } from '@/lib/record/claim'
import { migrate } from '@/lib/record/migrate'
import { buildProgress } from '@/lib/record/progress'
import { SCHEMA_VERSION, type RecordData } from '@/lib/record/schema'
import { attachSync, nowIso, snapshot, update } from '@/lib/record/store'
import { createSync } from '@/lib/record/sync'
import type { RemoteEnvelope } from '@/lib/record/wire'
import { createRemoteRecordStore } from '@/lib/supabase/remote-store'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * §14.7 — THE SEAM. The one place where a session, the record store, the sync
 * machine and the account's row are joined.
 *
 * ## Why this file exists as its own island
 *
 * Phase 4 was built by ten agents in parallel and every half of this layer
 * arrived complete: `sync.ts` had its state machine and its tests,
 * `remote-store.ts` had its port implementation, `claim.ts` had §14.7.4's
 * decision and its summary. Three independent reviewers then found the same
 * thing — NOTHING JOINED THEM. `createSync`, `attachSync`,
 * `createRemoteRecordStore` and `ClaimSummary` had no production caller at all,
 * so a reader could sign in, sign off eight sheets and close the tab with the
 * footer still reading `data-sync="off"` and not one row written anywhere.
 *
 * That is recorded here because it is a design lesson and not an anecdote: a
 * seam has to have an owner. Every module this file imports is deliberately
 * ignorant of the others, which is what makes each of them testable in node;
 * the cost of that ignorance is that somebody must know all of them, and it is
 * this file.
 *
 * ## Why it is mounted in the root layout
 *
 * A sign-off happens on a sheet, an answer happens on a sheet, a submittal
 * happens on a sheet. If the sync lived on `/profile/` the record would only
 * ever reach the account when the reader visited the page that has nothing to
 * do with the work. So it is mounted once per document, beside
 * `RecordStateSync` and for the same reason: every navigation here is a client
 * transition, so "once per document" is once per session.
 *
 * ## What it does NOT do
 *
 * It renders nothing at all unless a claim has something to tell the reader.
 * It never blocks a local write, never delays first paint, and holds no state
 * the record depends on — §12.2's Channel B discipline, unchanged. If Supabase
 * is not configured, or `NEXT_PUBLIC_AUTH_ENABLED` is off, or nobody is signed
 * in, the effect returns immediately and this component is inert.
 */
export function AccountSync({ facts }: { facts: CurriculumFacts }) {
  const session = useSession()
  const [summary, setSummary] = useState<ClaimSummaryData | null>(null)

  const view = session?.view
  const userId = view?.status === 'signedIn' ? view.user.id : null
  const user = view?.status === 'signedIn' ? view.user : null

  useEffect(() => {
    if (userId === null || user === null) {
      // Includes `disabled`, `unknown` and `signedOut`. `attachSync(null)`
      // returns the footer to `off`, which is the only true thing to say about
      // a server when there is no session (§14.7.3).
      attachSync(null)
      setSummary(null)
      return
    }

    const client = supabaseBrowser()
    if (client === null) {
      // The env said auth was on and the client could not be built. Nothing is
      // claimed rather than guessed; `env.ts` owns the reason and `/sign-in/`
      // is where the reader is told.
      attachSync(null)
      return
    }

    const port = createRemoteRecordStore(client, userId)
    const instance = createSync({
      // §14.7.2's rules. `claimMerge` and not `mergeRecords` because it is the
      // name §14.7.4 refers to and the place the next claim-only rule goes —
      // the blank-string identity correction now lives at the source, inside
      // `mergeIdentity`, precisely so this injection cannot be got wrong.
      merge: claimMerge,
      // §14.9 — `derive.ts`'s own output. SQL computes nothing, and neither
      // does this file: a second implementation of "how far along" is how a
      // manager's panel comes to disagree with the reader's own page.
      progressOf: (data: RecordData) =>
        buildProgress({
          data,
          facts,
          now: nowIso(),
          // Assignments are not fetched here. `progress.attention` is a
          // convenience for the dashboard; §14.8.1's overdue rule needs the
          // org's assignments, and the panel that has them recomputes with the
          // same function. Passing none means the stored flags cover the two
          // rules that need no org, and never a third one computed from a
          // guess.
          attention: selectAttention,
        }),
      // §14.9's staleness marker, and it is null on purpose. `revision.ts`
      // gives a revision PER SHEET (§11.26) and the build produces no
      // corpus-wide one, so any value here would be either a lie (one sheet's
      // hash standing for all of them) or a digest invented at this call site.
      // Null means "this column does not say"; a panel must therefore treat a
      // stored `progress` as possibly computed against an older curriculum
      // rather than trusting it. Recorded in the spec as out of scope.
      curriculumRev: null,
      now: nowIso,
      newId: () => crypto.randomUUID(),
      hydrate: hydrateEnvelope,
      initial: snapshot(),
    })

    // Both, together: §14.6's erase needs the port and there is exactly one
    // place that has it.
    attachSync(instance, port)
    instance.signIn(port)

    let cancelled = false

    void instance
      .claim()
      .then((outcome) => {
        if (cancelled) return

        if (outcome.kind === 'merged') {
          // The account's record is now folded into this device's. Writing it
          // through `update` is what puts it in `localStorage`, which is what
          // makes the next reload — and Channel A's pre-paint stamp — correct
          // without a network call.
          update(() => outcome.record)
          setSummary(summariseClaim(outcome.local, outcome.remote, outcome.record))
          return
        }

        if (outcome.kind === 'adopted') {
          setSummary(summariseClaim(outcome.record, null, outcome.record))
        }

        // `unreadable` and `off` say nothing to the reader here. `unreadable`
        // deliberately leaves the machine `pending`: the account's row could
        // not be read, so pushing over it would destroy it, and the footer
        // saying NOT SYNCED beside the export affordance is the honest state.
      })
      .catch(() => {
        // `claim` does not reject; this is belt and braces so a rejected
        // promise can never surface as an unhandled rejection in a reader's
        // console.
      })

    // §14.8.2 — the profiles row. Without it `loadProfiles` returns nothing,
    // every member of every org prints as `USER 1a2b3c4d`, and every submittal
    // classifies as unattributable for ever: the evidence column can never
    // resolve. Fire-and-forget on purpose — a failed profile write must not
    // stop a record from syncing, and the panel already renders an absent
    // profile honestly.
    const row = profileRowFor(snapshot().identity, user)
    if (row !== null) {
      void client
        .from(PROFILES_TABLE)
        .upsert(row, { onConflict: 'id' })
        .then(() => undefined)
    }

    return () => {
      cancelled = true
      instance.signOut()
      attachSync(null)
    }
  }, [userId, user, facts])

  if (summary === null) return null
  return (
    <div className="hl-claim-shell" role="region" aria-label="Record claimed">
      <ClaimSummary summary={summary} />
      {/*
        The dismiss lives here rather than inside `ClaimSummary` because that
        component computes nothing and decides nothing — it renders a summary it
        is handed. Where the summary is shown is this file's problem: it is
        mounted per document, so without a way to close it the panel would sit
        on top of every sheet for the rest of the session.

        It is a button and not a timeout. §12.4's stance is that nothing about
        the record disappears on a clock the reader cannot see, and this panel
        is the only place they are ever told what happened to their own
        signatures.
      */}
      <button
        type="button"
        className="hl-btn"
        onClick={() => setSummary(null)}
      >
        DISMISS
      </button>
    </div>
  )
}

/**
 * §14.2.2 — where `migrate.ts` meets the network, and where §12.1.2's rule
 * about a newer payload is applied to a row instead of to `localStorage`.
 *
 * A row whose `schema` is AHEAD of this bundle is not read and not overwritten.
 * That is the same decision §12.1.2 already made for the quarantine, and the
 * reason is the same one squared: GitHub Pages serves cached bundles, so an
 * older bundle can load after a newer one has written — and here the row is
 * shared across every device the reader owns, so a bundle that "fixed" it by
 * overwriting would corrupt the copy every other device reads. Returning null
 * makes `claim` report `unreadable`, which leaves the machine `pending` and
 * pushes nothing.
 */
function hydrateEnvelope(envelope: RemoteEnvelope): RecordData | null {
  if (!Number.isInteger(envelope.schema) || envelope.schema < 1) return null
  if (envelope.schema > SCHEMA_VERSION) return null
  try {
    return migrate(envelope.data, envelope.schema)
  } catch {
    return null
  }
}
