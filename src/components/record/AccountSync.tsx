'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

import { useSession } from '@/components/auth/SessionProvider'
import { carriesEmailIdentity, type SessionUser } from '@/lib/auth/session'
import type { CurriculumFacts } from '@/lib/content/facts'
import { aliasFromEmail } from '@/lib/identity/alias-offer'
import { PROFILES_TABLE, profileRowFor } from '@/lib/org/profile-sync'
import { selectAttention } from '@/lib/record/attention'
import { announceClaim, clearClaimAnnounce } from '@/lib/record/claim-announce'
import {
  claimIsNews,
  claimMerge,
  summariseClaim,
  type ClaimSummary as ClaimSummaryData,
} from '@/lib/record/claim'
import { noteAliasNamed, noteClaim, setIdentity } from '@/lib/record/events'
import { migrate } from '@/lib/record/migrate'
import { buildProgress } from '@/lib/record/progress'
import { carriesNothing, SCHEMA_VERSION, type RecordData } from '@/lib/record/schema'
import { attachSync, logEvent, nowIso, snapshot, update } from '@/lib/record/store'
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

  const view = session?.view
  const userId = view?.status === 'signedIn' ? view.user.id : null
  const user = view?.status === 'signedIn' ? view.user : null

  const pathname = usePathname()

  /**
   * §17.1 — navigation dismisses the arrival line, and there is no button.
   *
   * A client transition does not reload the document, so without this the line
   * would follow the reader across every page of the session — which is the
   * behaviour the reader asked to be rid of. The detail is permanent in
   * `/profile/`, so nothing is destroyed by clearing it.
   *
   * Keyed on `pathname` and not on a click: the reader's act is the navigation,
   * whichever affordance performed it.
   */
  useEffect(() => {
    clearClaimAnnounce()
  }, [pathname])

  useEffect(() => {
    if (userId === null || user === null) {
      // Includes `disabled`, `unknown` and `signedOut`. `attachSync(null)`
      // returns the footer to `off`, which is the only true thing to say about
      // a server when there is no session (§14.7.3).
      attachSync(null)
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

    /**
     * Bound after the null check for the same reason as `account` below: a
     * narrowing of an outer binding does not reach into a hoisted function
     * declaration, and `pushProfileRow` is one. The alternative is a `!` that
     * would outlive the check that made it safe.
     */
    const db = client

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

    /**
     * Bound to a new const so the narrowing above survives into the closure
     * below: TypeScript does not carry a narrowing of an outer binding into a
     * hoisted function declaration, and the alternative is a `!` that would
     * outlive the reason it was safe. `SessionProvider` records the same thing
     * about `client.auth`.
     */
    const account: SessionUser = user

    /**
     * §14.8.2 — the profiles row. Without it `loadProfiles` returns nothing,
     * every member of every org prints as `USER 1a2b3c4d`, and every submittal
     * classifies as unattributable for ever: the evidence column can never
     * resolve. Fire-and-forget on purpose — a failed profile write must not stop
     * a record from syncing, and the panel already renders an absent profile
     * honestly.
     *
     * ## Why it is a function, and where it is called from
     *
     * MEASURED: this ran once, synchronously, on the line after `claim()` was
     * STARTED — so it read the identity as it stood before the claim resolved.
     * On a first email sign-in the record is empty at that instant,
     * `profileRowFor` omits `display_name` (`profile-sync.ts:159-160`), and the
     * name §16.3 derives from the address a round trip later never reached the
     * column. Managers saw `USER 1a2b3c4d` for the whole of that session, and it
     * healed only on the next mount.
     *
     * Three call sites, each answering a different question:
     *
     * 1. **Immediately, before the claim has settled.** KEPT rather than moved
     *    behind the claim: a hung claim would otherwise mean no profile row at
     *    all, and this row is display data that has no reason to wait on two
     *    network round trips.
     * 2. **The `merged` branch, when the merge moved the identity.** REPORTED BY
     *    REVIEW, and the same defect one layer along: `mergeIdentity` gives the
     *    ACCOUNT's identity precedence (`merge.ts:313-324`), so this browser can
     *    have typed `Ada` while the account's row carries `Bob` from another
     *    device. The immediate push upserted `Ada`, `update(() => merged)` then
     *    wrote `Bob` into the record, and §16.3 decided to write no name at all
     *    because the record already carried one — so nothing re-pushed and the
     *    row read `Ada` for the rest of the session. Managers read that row
     *    (§14.8.2).
     * 3. **The `adopted` branch.** There was no account row to move the
     *    identity, so the only thing that can have changed the row is a name
     *    §16.3 derived from the address.
     *
     * Each of sites 2 and 3 is ONE call, not one per writer. Site 2 ORs the
     * decider's answer with `identityMovedForProfile`, so a merge that moved the
     * identity and an offer that wrote a name still cost a single request; site
     * 3 has no account row, so no identity the claim could have moved, and the
     * decider's answer is the whole condition there. It is a condition and not
     * an unconditional second push because the common case is a mount where
     * nothing moved at all, and `upsert` is idempotent — which makes a
     * needlessly narrow condition the expensive mistake and a needlessly wide
     * one merely a wasted request.
     *
     * It takes the identity from `snapshot()` at call time and never from a
     * closure, because the whole defect was a row built from a stale read.
     */
    function pushProfileRow(): void {
      const row = profileRowFor(snapshot().identity, account)
      if (row === null) return
      void db
        .from(PROFILES_TABLE)
        .upsert(row, { onConflict: 'id' })
        .then(({ error }) => {
          // The result is DISCARDED, and that is the decision rather than an
          // omission — but it is read first, because discarding a value you
          // never looked at and discarding one you did are different acts and
          // only one of them survives review.
          //
          // Nothing here can act on a failure. The local record is already
          // authoritative, the sync machine does not depend on this row, and
          // the manager panel renders an absent profile honestly (`USER
          // 1a2b3c4d`), so the outcome is a degraded display and never a lost
          // fact. Retrying would mean a queue, a backoff and a second thing
          // that can be owed — for a row that is rewritten on the next sign-in
          // anyway.
          //
          // NOT a missing `.catch`: `PostgrestBuilder` sets
          // `shouldThrowOnError` false by default and catches fetch failures
          // itself, resolving with `{ error }`. There is no rejection to
          // handle, so adding a `.catch` here would guard a path the library
          // does not take.
          void error
        })
    }


    /**
     * §16.3 — the alias, decided from the address, ONCE.
     *
     * ## Why it is here and not in `SignInPanel`
     *
     * §16.3.1's rejected alternative was the sign-in panel, and the reason it
     * loses is that the panel cannot answer the question the offer depends on:
     * whether this record already carries a name. At the moment the door is
     * opened the record has not been claimed, so the account's own name has not
     * arrived yet and a panel deciding "the name is empty" would be deciding it
     * against a record that is about to be overwritten. This closure runs after
     * the claim resolved, which is the first instant the answer is stable.
     *
     * ## Why the reducer re-asks rather than trusting a value computed above
     *
     * MEASURED (hazard 8): `mergeIdentity` gives the ACCOUNT's identity
     * precedence (`merge.ts:289-324`, and `blank()` there treats a
     * whitespace-only remote name as empty), so `identity.name` can go from
     * null to the account's name inside the very `update` two lines above this
     * call. Any read taken before the claim resolved is therefore stale by
     * construction. `update`'s reducer is handed `current` — fresher than even a
     * `snapshot()` taken on the line before, with no window at all between the
     * decision and the write — so the guards are evaluated inside it and the
     * name and the flag land in ONE reduction. A half-written state (named, not
     * flagged) would re-decide on the next `TOKEN_REFRESHED` and overwrite a name
     * the reader had since edited.
     *
     * ## Why the flag is written even when no name is
     *
     * This is the F1 repair, and it is the reason the pure function returns a
     * DECISION rather than a name: `aliasDecision` is non-null whenever the
     * question has been settled for this account, including the case where the
     * record already carries a name and the answer is "write nothing". Writing
     * the flag then is what makes a later `REMOVE NAME` final. The old code
     * returned before `noteAliasNamed` in exactly that case, so a reader who had
     * typed a name, signed in, and then cleared it was renamed from their address
     * on the next mount — see `aliasDecision`'s docblock for the reproduction.
     *
     * ## Why it returns whether it wrote a name
     *
     * The profiles row is pushed by the CALLER and not from in here, because a
     * merge can move the identity in the same tick (see `pushProfileRow`) and
     * two writers of one row means two requests for one final value. This
     * reports only what this write did; the caller owns whether the row still
     * describes the record.
     *
     * ## Why it is not called on `unreadable`
     *
     * An unreadable row may hold a name. Naming from the address would put a
     * name on screen that the next successful claim replaces with the account's
     * — §12.13's rule against a readout that changes under the reader — and
     * `unreadable` deliberately leaves the machine `pending`, so nothing is
     * being decided about that row yet.
     */
    function decideAliasFromAccount(): boolean {
      const now = nowIso()
      let named: string | null = null
      update((data) => {
        const decision = aliasDecision(data, account)
        if (decision === null) return data
        named = decision.name
        const withName =
          decision.name === null ? data : setIdentity(data, { name: decision.name }, now)
        return noteAliasNamed(withName, account.id, now)
      })
      // §14.2.3 — the log row says what the act WAS, and this act is not the
      // reader typing a name. `setIdentity` is the only kind `wire.ts` has for a
      // name (and adding one there is not this section's change), so the payload
      // carries the distinction instead.
      //
      // Filed AFTER the write and only when a name was actually written, which
      // is why it is `logEvent` and not `update`'s event argument: that argument
      // is fixed at the call site, and since the F1 repair this reduction can
      // land the flag ALONE. A `setIdentity` row for a write that set no
      // identity would be a log entry describing an act nobody performed, and
      // `EventKind` has no member for "the offer was decided" — inventing one
      // there is a `wire.ts` change both halves compile against, not this fix.
      if (named !== null) {
        logEvent({ kind: 'setIdentity', payload: { named: true, fromEmail: true } })
        return true
      }
      return false
    }

    /**
     * §17.2 — record the claim if it was news, and say nothing if it was not.
     *
     * MEASURED (§17.0): this effect runs on EVERY mount with a session, so every
     * page load with an account row takes the `merged` branch and the old
     * `setSummary` put the whole panel back on screen — reporting a merge in
     * which nothing had moved. `claimIsNews` is the test that was missing, and it
     * is a change test throughout, because the provenance the summary carries
     * (`identity.name === 'account'`) is true on every one of those loads.
     *
     * The write goes through `update`'s reducer and not through a value read
     * above it, for §16.3's measured reason: `mergeIdentity` can move the
     * identity inside the same tick, so `current` is the only record fresher than
     * the merge.
     */
    function recordClaim(summary: ClaimSummaryData): void {
      if (!claimIsNews(summary)) return
      update((data) => noteClaim(data, { at: nowIso(), summary }))
      announceClaim()
    }

    void instance
      .claim()
      .then((outcome) => {
        if (cancelled) return

        if (outcome.kind === 'merged') {
          /*
            The account's record is folded into this device's. Writing it through
            `update` is what puts it in `localStorage`, which is what makes the
            next reload — and Channel A's pre-paint stamp — correct with no
            network call.

            THE MERGE IS RECOMPUTED HERE, against `snapshot()`, and this line
            used to be `update(() => outcome.record)`. That discarded whatever
            the reader did while `claim()` was in flight, and `claim()` is two
            network round trips — read the row, then push — with the record
            layer mounted and interactive the whole time. A checklist tick or a
            sign-off made in that window was in the store and not in
            `outcome.record`, and the replacement reverted it in front of the
            reader.

            It is not a rare window either: this effect runs on EVERY mount with
            a session, so every page load with an existing account row takes the
            `merged` branch.

            `claimMerge` is pure and deterministic, so when nothing moved this
            computes exactly `outcome.record` and the common case is unchanged.
            `snapshot()` and `update` are both synchronous with nothing awaited
            between them, so there is no second window here.

            The summary is built from the SAME local record that was merged, not
            from `outcome.local` — otherwise a claim that folded in a late
            sign-off would report a count that no longer described anything.
          */
          const local = snapshot()

          /*
            AN ERASE THAT HAPPENED DURING THE CLAIM WINS.

            Found by the §14.6 test in `accounts.spec.ts`, and present before
            this branch was touched. `claim()` reads the account's row and
            pushes; §12.15's erase is reachable throughout, and the reader can
            complete it — `record_state` deleted and all — while the claim is in
            flight. The claim then resolves holding a merge built from the row it
            read BEFORE the delete, writes it to `localStorage`, marks the record
            pending and pushes it. MEASURED: the row came back carrying the
            sheets the reader had just erased.

            The merge cannot tell the two cases apart on its own. Merging an
            empty local record with a populated remote one correctly yields the
            remote's content — that is exactly what an account is for on a
            second, empty browser. What distinguishes an erase is the
            TRANSITION: the record carried something when the claim started and
            carries nothing now. Nothing else empties a record.

            So this returns without writing and without a summary. There is no
            reader to inform: they asked for the record to go, the dialog told
            them what happened to each half, and a claim summary describing a
            record that no longer exists would contradict it.
          */
          if (carriesNothing(local) && !carriesNothing(outcome.local)) return

          const merged = claimMerge(local, outcome.remote)
          update(() => merged)
          recordClaim(summariseClaim(local, outcome.remote, merged))
          // AFTER the merge is written, never before: the account's name wins
          // over this device's, so "this record has no name" is only true of
          // the merged record.
          const named = decideAliasFromAccount()
          // ONE push, after both writers have had their say — the merge, which
          // can have replaced the name, seed, mark or role the row prints, and
          // the offer, which can have supplied a name neither record had. See
          // `pushProfileRow` for the `Ada`/`Bob` case this closes.
          if (named || identityMovedForProfile(local.identity, merged.identity)) pushProfileRow()
          return
        }

        if (outcome.kind === 'adopted') {
          recordClaim(summariseClaim(outcome.record, null, outcome.record))
          // No row existed, so nothing can arrive to contradict the offer. This
          // is the first-sign-in case §16.3 is mostly about, and the same
          // pattern as the branch above with one term dropped: no account row
          // means no identity the claim could have moved.
          if (decideAliasFromAccount()) pushProfileRow()
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

    // §14.8.2 — pushed straight away, before the claim has settled, because a
    // manager's display is not worth waiting two network round trips for and the
    // row is rewritten on the next sign-in anyway. The identity this cannot see
    // is the one the claim is about to settle — a name derived from the address,
    // or the account's own identity winning the merge — which is why each claim
    // branch pushes again once it knows.
    pushProfileRow()

    return () => {
      cancelled = true
      instance.signOut()
      attachSync(null)
    }
  }, [userId, user, facts])

  /**
   * §17.5 — the seam decides and writes; it renders nothing.
   *
   * What the reader is told lives in `ClaimReceipt` (the arrival line, rendered
   * inside the page column by `PageShell`) and in `/profile/`'s `Last claim`
   * fold. Both read `meta.lastClaim`, which this file is the only writer of, so
   * there is one source for the fact and two places that print it (§16.4.2).
   *
   * The `hl-claim-shell` this used to return was a bare `<div>` after
   * `{children}` in `<body>`: no column, no gutters, below the footer, with the
   * fixed mascot over its own button. §17.0 has the measurements.
   */
  return null
}

/**
 * §14.8.2 — did the claim move anything the profiles row prints?
 *
 * All four of `identity`'s fields, because `profileRowFor` reads all four
 * (`profile-sync.ts`) and `mergeIdentity` can move every one of them
 * (`merge.ts:313-324`). It is a field-by-field comparison and not
 * `before !== after`: `mergeRecords` returns `local` itself only when the WHOLE
 * record is unchanged (`merge.ts:390`), so a merge that folded in one sheet
 * allocates a fresh identity of equal values, and reference equality would send
 * a request on almost every mount — the cost this condition exists to avoid.
 *
 * Not exported and not in `profile-sync.ts`: it answers a question about two
 * moments in this seam's own control flow, and `profile-sync.ts` builds a row
 * from one identity and knows nothing of a previous one.
 */
function identityMovedForProfile(
  before: RecordData['identity'],
  after: RecordData['identity'],
): boolean {
  return (
    before.name !== after.name ||
    before.markSeed !== after.markSeed ||
    before.mark !== after.mark ||
    before.role !== after.role
  )
}

/**
 * §16.3 — has this account's offer been settled, and did it yield a name?
 *
 * Pure, exported and separated from the closure that writes it for one reason:
 * every constraint §16.3 places on the offer is a decision about a record and a
 * session, and both are values. The seam around it owns WHEN (after the claim
 * resolves) and HOW (one reduction); this owns WHETHER. That is what lets
 * `tests/unit/record/alias-naming.test.ts` pin every answer in node with no
 * store, no clock, no session and no supabase client.
 *
 * ## What this used to be, and the defect that changed it
 *
 * It was `aliasNameFor`, returning the name to write or null, and its FIRST
 * guard was `if (data.identity.name !== null) return null`. The docblock claimed
 * `prefs.aliasNamedFor` "is what makes REMOVE NAME final". It was not, and two
 * reviewers reproduced the same three lines:
 *
 *     typed   = setIdentity(EMPTY_RECORD, { name: 'Bob' })  -> null, flag unset
 *     cleared = setIdentity(typed, { name: null })          -> flag STILL unset
 *     aliasNameFor(cleared, { email: 'ada@example.com' })   -> 'ada'
 *
 * The flag recorded that an offer had been **taken**, never that one had been
 * **decided**: a reader whose record already carried a name when they signed in
 * returned at guard 1, so `noteAliasNamed` was never reached and nothing durable
 * said the question had been asked. Clear the name afterwards — an explicit
 * `REMOVE NAME`, §16.3's third constraint calls it a decision — and the next
 * claim wrote the local part of the address over it. One reload is enough: the
 * effect runs on EVERY mount with a session (see the `merged` branch above).
 *
 * So the shape changed with the meaning. **Decide once, not take once.** A
 * non-null return means "record the decision for this account"; `name` is what
 * the address yielded, and null there means the decision was to write no name —
 * because the record already carries one, or because the address has no usable
 * local part. Either way the flag lands, and the question is never re-asked.
 *
 * The guards, each against the failure it was measured to stop:
 *
 * 1. **The session must carry the email identity.** An OAuth account that hides
 *    its address yields `email: null`, so `aliasFromEmail` would return null
 *    anyway — and both stops are kept, because they answer different questions.
 *    This one says the offer has no standing here at all; a null `name` says
 *    there was no usable name in the address. A GitHub account whose token
 *    happens to expose a `noreply` address is refused by the first, which is the
 *    case the second cannot see. It is the one guard that returns NOTHING rather
 *    than a decision: an account that never had an address to offer from has
 *    nothing to record, and a flag written for it would silence a later session
 *    of the same account that does carry the address.
 *
 * 2. **Once per account.** `prefs.aliasNamedFor` is the durable record that the
 *    question has been settled, and it is now what actually makes `REMOVE NAME`
 *    final. It also closes hazard 7 — `AccountSync`'s effect deps are
 *    `[userId, user, facts]` and `user` is a NEW OBJECT on every `setView`, so
 *    `INITIAL_SESSION`, `TOKEN_REFRESHED`, a cross-tab sign-in and `refresh()`
 *    each re-run the claim. Without a flag in the record the offer would fire on
 *    every one of them.
 *
 * 3. **A name already on the record is never overwritten** — §16.3's first
 *    constraint, and it is now a `name: null` and not an early return, which is
 *    the whole fix. `!== null` rather than a blank-aware check (`merge.ts`'s
 *    `blank()`) on purpose: every writer of `identity.name` puts `sanitiseName`'s
 *    output there, which is never whitespace-only, and `mergeIdentity` corrects a
 *    remote `''` to the local value at the source. A record holding `' '` is
 *    therefore only reachable by hand-editing `localStorage`, and the stricter
 *    test can only ever DECLINE to write a name — the failure direction that
 *    costs the reader a pre-filled field rather than the name they typed.
 *
 * The flag is compared to `user.id` and not to a boolean so that a SECOND
 * account signing in at this browser is offered its own name once. §14's whole
 * position is that the record belongs to the browser and the account is a copy;
 * a boolean would let the first account's decision silence the second's.
 *
 * `prefs` is local-wins in `mergeRecords` (`merge.ts:377`), so this flag never
 * travels to a second browser — which is why guard 3, and not guard 2, is what
 * stops a second browser writing a name over one that arrived from the account.
 *
 * ## What the widened flag costs, and why it is the right side to fail on
 *
 * `IdentityPanel`'s `TAKEN FROM THE ADDRESS YOU SIGNED IN WITH` note is gated on
 * the flag AND on the stored name still equalling `aliasFromEmail`'s output. The
 * flag now also covers a reader who TYPED their name before signing in, so a
 * reader whose typed name happens to be exactly the local part of their own
 * address (`ada` for `ada@example.com`) now sees that note over a name they
 * chose. That imprecision is in the gate rather than in this function: it
 * compares the VALUE against the offer and has never held provenance, so the
 * same note already appeared for a reader who retyped the offered name after
 * changing it. The alternative is the defect above — an address written over an
 * explicit `REMOVE NAME`, which destroys a decision rather than mislabelling a
 * string the reader can see and change from the control the note names.
 */
export interface AliasDecision {
  /** The name to write, or null to record the decision and write no name. */
  name: string | null
}

export function aliasDecision(data: RecordData, user: SessionUser): AliasDecision | null {
  if (!carriesEmailIdentity(user)) return null
  if (data.prefs.aliasNamedFor === user.id) return null
  if (data.identity.name !== null) return { name: null }
  return { name: aliasFromEmail(user.email) }
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
