'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  JOIN_COPY,
  createOrgJoinStore,
  decideJoin,
  disclosureStatements,
  identityFromUser,
  joinFailureCopy,
  noEmailCopy,
  type JoinAttempt,
  type JoinFailure,
  type JoinOffer,
  type JoinState,
  type JoinableOrg,
  type OrgJoinStore,
} from '@/lib/org/join'
import { supabaseBrowser } from '@/lib/supabase/client'
import { supabaseEnv, type SupabaseUnavailable } from '@/lib/supabase/env'

/**
 * §14.5, §14.5.1 — the join screen, and the disclosure that has to be read
 * before the control is used.
 *
 * **The disclosure is the point of this component.** Karar 5 gave an
 * organisation's managers the reader's WHOLE record; §14.5.1 records the price
 * as five statements that must be legible BEFORE the click. So they are printed
 * above the button, in full, in the leader-dash list `§12.4.1` uses for
 * criteria a reader is asserting against — a leader points at a statement, a
 * tick would claim it had been dealt with. Nothing is behind a details
 * disclosure, nothing is a link to a policy page, and the button is last.
 *
 * **There is no confirmation dialog, and that is deliberate.** §12.15 says the
 * erase dialog is the only one on the site, because crying wolf is how a reader
 * learns to auto-confirm the one that matters. The consent here is structural
 * rather than ceremonial: §14.5 has the READER insert their own `memberships`
 * row, and §14.4.2 gives no policy by which anybody else could. Reading five
 * sentences and pressing one labelled button IS the mechanism.
 *
 * **Four states this screen must render without lying** (§1, §11.25, §14.8):
 *
 *  1. no backend in this build — the kill switch is off, or the config is
 *     absent. Calm, named, and everything else on the site keeps working.
 *  2. no account in this browser — a route to `/sign-in/`, not a list.
 *  3. a query in flight — it says so. It never renders an empty list of
 *     organisations, because "none matched" and "none read yet" are different
 *     facts and only one of them is true at that moment.
 *  4. a read that failed — an alert with the server's own message, never a
 *     silent fallback to "nothing matched".
 *
 * All the deciding happens in `lib/org/join.ts`, which is why it is testable in
 * node (§12.14.2, §14.12): this file arranges elements and owns no rule about
 * who may join what.
 *
 * **The refusal copy moved out of this file for the same reason.** It was a
 * local `failureCopy` explaining a 42501 as a changed domain or a withdrawn
 * invitation, and it went on saying that after `0005` made a proven mailbox the
 * first clause of both `insert` policies — a claim about the schema, sitting in
 * a component no node test reads. `joinFailureCopy` now holds it beside the
 * classifier and the policy comment, where a test does.
 */

type PanelState =
  /** Server-rendered, and what a reader with scripting off keeps. */
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'unavailable'; why: SupabaseUnavailable }
  | { kind: 'signedOut' }
  | { kind: 'failed'; message: string }
  | { kind: 'ready'; join: JoinState }

/** §14.1 — why nothing can be joined from this build, in the reader's terms. */
function unavailableCopy(why: SupabaseUnavailable): { status: string; detail: string } {
  if (why === 'flagOff') {
    return {
      status: 'ACCOUNTS NOT ENABLED IN THIS BUILD',
      detail:
        'This deployment was built with the account layer switched off, so no '
        + 'organisation can be read from here and none can be joined. Nothing '
        + 'else on the site depends on it: the record stays in this browser and '
        + 'every sheet behaves exactly as it does without an account.',
    }
  }
  return {
    status: 'ACCOUNT BACKEND NOT CONFIGURED',
    detail:
      'The account layer is switched on in this build, but the address or the '
      + 'key it needs is absent or unreadable, so no question can be put to the '
      + 'server. This is a deployment fault rather than a state of your '
      + 'account. Nothing else on the site depends on it.',
  }
}

function PathNote({ offer }: { offer: JoinOffer }) {
  return (
    <p className="hl-mark m-0 text-ink-muted">
      {offer.path === 'domain' ? JOIN_COPY.pathDomain : JOIN_COPY.pathInvite}
    </p>
  )
}

/**
 * One offer: a title block naming the organisation, the disclosure in full,
 * then the control. In that order, and the order is the requirement.
 */
function OfferBlock({
  offer,
  otherOrgCount,
  busy,
  failure,
  onJoin,
}: {
  offer: JoinOffer
  otherOrgCount: number
  busy: boolean
  failure: { failure: JoinFailure; message: string } | null
  onJoin: (org: JoinableOrg) => void
}) {
  const statements = disclosureStatements(offer.org.name, otherOrgCount)

  return (
    <div className="hl-signoff">
      <div className="hl-signoff-head hl-mark">
        <span className="text-ink">{offer.org.name}</span>
        <PathNote offer={offer} />
      </div>

      <div className="hl-signoff-body">
        <p className="hl-mark mt-0 mb-2 text-ink">{JOIN_COPY.disclosureHead}</p>

        {/* §14.5.1 — read before anything is clicked. The button is below it,
            and there is no state of this component in which it is not. */}
        <ul className="hl-signoff-criteria">
          {statements.map((statement) => (
            <li key={statement}>{statement}</li>
          ))}
        </ul>

        <div className="hl-dialog-actions">
          <button
            type="button"
            className="hl-btn"
            disabled={busy}
            onClick={() => onJoin(offer.org)}
          >
            {`${JOIN_COPY.action} ${offer.org.name}`}
          </button>
          {busy && (
            <span className="hl-mark self-center text-ink-muted" role="status">
              WRITING THE MEMBERSHIP ROW
            </span>
          )}
        </div>

        {failure !== null && (
          <div className="mt-3" role="alert">
            <p className="hl-mark m-0 text-ink">ROW NOT WRITTEN</p>
            <p className="m-0 mt-1 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
              {joinFailureCopy(failure.failure, offer.org.name)}
            </p>
            {failure.message !== '' && <p className="hl-raw">{failure.message}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * §14.3, §14.5.1 — the organisations already joined, printed whatever else is
 * on screen. The second disclosure statement is a claim about this list, and a
 * claim about a list the reader cannot see is not checkable.
 */
function MemberList({ orgs }: { orgs: readonly JoinableOrg[] }) {
  if (orgs.length === 0) return null
  return (
    <div className="mt-6">
      <p className="hl-mark m-0 text-ink">{JOIN_COPY.memberHead}</p>
      {/* Not `hl-defs`: that grid uppercases its cells, which is right for a
          machine-derived readout and wrong for a name somebody typed. The
          organisation is printed as it is stored. */}
      <ul className="m-0 mt-2 grid list-none gap-1 p-0">
        {orgs.map((org) => (
          <li key={org.id} className="flex flex-wrap items-baseline gap-x-3">
            <span className="hl-mark text-ink-muted">{JOIN_COPY.joined}</span>
            <span className="font-mono text-mark tracking-[0.06em] text-ink">{org.name}</span>
          </li>
        ))}
      </ul>
      <p className="m-0 mt-2 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
        Managers of every organisation on this list read the same record, and
        the record is one record per person. Leaving an organisation stops that;
        it does not withdraw the history the organisation already holds.
      </p>
    </div>
  )
}

/** A status readout plus a cue, §12.13's shape, with an optional single path out. */
function Statement({
  status,
  detail,
  live = 'status',
  children,
}: {
  status: string
  detail: string
  live?: 'status' | 'alert'
  children?: React.ReactNode
}) {
  return (
    <div className="hl-empty" role={live}>
      <p className="hl-mark hl-empty-status m-0">{status}</p>
      <p className="hl-empty-cue">{detail}</p>
      {children}
    </div>
  )
}

export function JoinPanel() {
  const [state, setState] = useState<PanelState>({ kind: 'idle' })
  const [busyOrgId, setBusyOrgId] = useState<string | null>(null)
  const [failures, setFailures] = useState<
    Readonly<Record<string, { failure: JoinFailure; message: string }>>
  >({})
  const [joinedName, setJoinedName] = useState<string | null>(null)
  /** Bumped after a write, to re-read rather than to patch the list locally. */
  const [nonce, setNonce] = useState(0)
  const storeRef = useRef<OrgJoinStore | null>(null)

  useEffect(() => {
    let live = true

    async function load(): Promise<void> {
      // Read the environment inside the effect, not at render: the prerender in
      // node and the browser must agree on the first paint, and this component
      // has one honest thing to say before it has asked anything (`idle`).
      const env = supabaseEnv()
      if (env.kind !== 'ready') {
        if (live) setState({ kind: 'unavailable', why: env.why })
        return
      }

      const client = supabaseBrowser()
      if (client === null) {
        // `env` said ready and the client is still null: the only way that
        // happens is no `window`, which cannot be reached from an effect. It is
        // reported as a configuration fault rather than crashing the page.
        if (live) setState({ kind: 'unavailable', why: 'missingUrl' })
        return
      }

      if (live) setState({ kind: 'reading' })

      let identity
      try {
        const { data, error } = await client.auth.getUser()
        // A missing session is not a fault. supabase-js reports it as an error,
        // and treating it as one would show an alert to every reader who simply
        // has no account yet.
        identity = error ? null : identityFromUser(data?.user)
      } catch {
        identity = null
      }
      if (!live) return
      if (identity === null) {
        setState({ kind: 'signedOut' })
        return
      }

      const store = createOrgJoinStore(client, identity.userId)
      storeRef.current = store

      try {
        const [orgs, invitedOrgIds, memberOrgIds] = await Promise.all([
          store.listJoinableOrgs(),
          store.listInvitedOrgIds(),
          store.listMemberOrgIds(),
        ])
        if (!live) return
        setState({
          kind: 'ready',
          join: decideJoin({ identity, orgs, invitedOrgIds, memberOrgIds }),
        })
      } catch (error) {
        if (!live) return
        // Every read rejects on failure (`OrgJoinStore`), and a rejected read is
        // NOT "nothing matched". Saying so is the whole difference between a
        // page that reports and a page that guesses.
        setState({
          kind: 'failed',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    void load()
    return () => {
      live = false
    }
  }, [nonce])

  async function onJoin(org: JoinableOrg): Promise<void> {
    const store = storeRef.current
    if (store === null) return

    setBusyOrgId(org.id)
    setFailures((current) => {
      const next = { ...current }
      delete next[org.id]
      return next
    })

    let attempt: JoinAttempt
    try {
      attempt = await store.join(org.id)
    } catch (error) {
      attempt = {
        ok: false,
        failure: 'unknown',
        message: error instanceof Error ? error.message : String(error),
      }
    }

    setBusyOrgId(null)
    if (attempt.ok) {
      setJoinedName(org.name)
    } else {
      setFailures((current) => ({
        ...current,
        [org.id]: { failure: attempt.failure, message: attempt.message },
      }))
      // A duplicate means the row exists, so the list on screen is stale. Any
      // other failure changed nothing, and re-reading would only hide the
      // message the reader needs.
      if (attempt.failure !== 'duplicate') return
    }
    setNonce((value) => value + 1)
  }

  if (state.kind === 'idle') {
    return (
      <Statement
        status="ACCOUNT NOT READ YET"
        detail={
          'This screen reads your account after the page loads. A page '
          + 'prerendered once for everybody knows nothing about who is reading '
          + 'it, so with scripting off it stays at this line rather than '
          + 'printing a list it did not read.'
        }
      />
    )
  }

  if (state.kind === 'reading') {
    return (
      <Statement
        status="READING YOUR ACCOUNT"
        detail={
          'Three questions are in flight: which organisations this account can '
          + 'see, which have an invitation for its address, and which it '
          + 'already belongs to. The answers are printed when all three arrive.'
        }
      />
    )
  }

  if (state.kind === 'unavailable') {
    const copy = unavailableCopy(state.why)
    return <Statement status={copy.status} detail={copy.detail} />
  }

  if (state.kind === 'signedOut') {
    return (
      <Statement
        status="NO ACCOUNT ON RECORD IN THIS BROWSER"
        detail={
          'Both routes into an organisation compare the address on an account, '
          + 'and no account is signed in here. The record in this browser is '
          + 'unaffected and stays where it is.'
        }
      >
        {/* §14.7 named a dedicated account route; there is none, and the orchestrator
            decided there will not be one — identity lives on the existing
            `/profile/` sheet, because two identity pages is a worse site than
            one. Under `output: export` a link to a route that does not exist is
            a 404 with NO build-time warning, so a dead-end state offering it as
            the only way out was a page sending the reader nowhere (§1, §12.13).
            This state has no account at all, so the way out is the sign-in
            sheet, not the profile sheet: `/profile/` cannot show an address to
            a reader who has not signed in. */}
        <p className="hl-empty-path m-0">
          <Link href="/sign-in/" className="hl-link">
            Sign in
          </Link>
        </p>
      </Statement>
    )
  }

  if (state.kind === 'failed') {
    return (
      <>
        <Statement
          status="ORGANISATIONS NOT READ"
          live="alert"
          detail={
            'The query for organisations, invitations and memberships did not '
            + 'complete, so this screen has nothing to report about them. It is '
            + 'not a statement that none exist. Your record is untouched.'
          }
        />
        <p className="hl-raw">{state.message}</p>
      </>
    )
  }

  const { join } = state
  const memberCount = join.alreadyMember.length

  return (
    <>
      {joinedName !== null && (
        <div className="hl-empty mb-6" role="status">
          <p className="hl-mark hl-empty-status m-0">{`${JOIN_COPY.joined} ${joinedName}`}</p>
          <p className="hl-empty-cue">
            {`The membership row is written. Managers of ${joinedName} can read `
              + 'your record from now on, including the part of it that was '
              + 'recorded before this moment.'}
          </p>
        </div>
      )}

      {join.kind === 'noEmail' && (() => {
        const copy = noEmailCopy(join.why)
        return (
          <Statement status={copy.status} detail={copy.detail}>
            {/* The sheet comes from `noEmailCopy` rather than being fixed
                here, because the three reasons do not share one. Two are about
                the address on the account and are read on `/profile/`; the
                third is about which sign-ins the account carries, which
                `/profile/` does not show — this link was hard-coded to
                `/profile/` for all three, so the reader whose account had no
                email sign-in was sent to the one sheet that cannot say so, and
                the copy naming the sheet could drift from the link beside it. */}
            <p className="hl-empty-path m-0">
              <Link href={copy.link.href} className="hl-link">
                {copy.link.label}
              </Link>
            </p>
          </Statement>
        )
      })()}

      {join.kind === 'nothingMatches' && (
        <Statement
          status="NO ORGANISATION OPEN TO THIS ADDRESS"
          detail={
            `No organisation this account can see has ${join.domain} as its `
            + `domain, and no invitation is on record for ${join.email}. Those `
            + 'are the only two routes in: there is no code to enter, because a '
            + 'code could not be checked without handing every reader the whole '
            + 'list of codes.'
          }
        />
      )}

      {join.kind === 'offered' && (
        <>
          {/* The address is printed VERBATIM, in a mono line that does not
              uppercase it. §14.4.2 compares it case-sensitively, so a readout
              that shouted it back in capitals would misreport the one value
              whose exact letters decide whether the insert lands. */}
          <p className="m-0 mb-4 font-mono text-mark tracking-[0.06em] text-ink-muted">
            <span className="hl-mark">Matched on</span> {join.email}
          </p>
          {join.offers.map((offer) => (
            <OfferBlock
              key={offer.org.id}
              offer={offer}
              otherOrgCount={memberCount}
              busy={busyOrgId === offer.org.id}
              failure={failures[offer.org.id] ?? null}
              onJoin={(org) => {
                void onJoin(org)
              }}
            />
          ))}
        </>
      )}

      <MemberList orgs={join.alreadyMember} />
    </>
  )
}
