/**
 * §14.5, §14.5.1 — the join decision, in node, with no DOM and no network.
 *
 * Everything that can turn a reader away from an organisation, or into one,
 * is decided by `decideJoin`, which is why the whole surface is reachable
 * here: §14.12 puts anything that decides something in vitest and leaves the
 * DOM to real Chrome. The disclosure is asserted too — Karar 5 is only paid
 * for if the four statements are actually on the screen, and a test is the
 * only thing that stops one of them being quietly dropped in a rewrite.
 */

import { describe, expect, it } from 'vitest'
import {
  classifyJoinError,
  decideJoin,
  disclosureStatements,
  emailDomain,
  identityFromUser,
  joinFailureCopy,
  mailboxProven,
  noEmailCopy,
  type JoinIdentity,
  type JoinableOrg,
} from '@/lib/org/join'

const DNEXT: JoinableOrg = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'dnext-technology',
  joinDomain: 'dnext-technology.com',
}

const LOKUM: JoinableOrg = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Lokum AI',
  joinDomain: null,
}

const ACME: JoinableOrg = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Acme Rail',
  joinDomain: 'acme.example',
}

/**
 * A reader with the proof both `0005` policies open with, unless a test says
 * otherwise. `providers: ['email']` rather than a boolean, because the boolean
 * this fixture used to carry (`emailVerified`) was the defect: it was true for
 * an OAuth-only account, and the policy clause is never true for one.
 */
function reader(email: string | null, providers: readonly string[] = ['email']): JoinIdentity {
  return { userId: 'user-1', email, providers }
}

/** A GitHub-only account: an address, and nothing that proves the mailbox. */
function oauthOnly(email: string | null): JoinIdentity {
  return { userId: 'user-1', email, providers: ['github'] }
}

describe('emailDomain — agrees with split_part, or the offer is refused', () => {
  it('takes the part after the single @', () => {
    expect(emailDomain('a.person@dnext-technology.com')).toBe('dnext-technology.com')
  })

  it('does not fold case, because §14.4.2 compares without lower()', () => {
    expect(emailDomain('a@DNext-Technology.com')).toBe('DNext-Technology.com')
  })

  it('refuses an address with no domain part', () => {
    expect(emailDomain('nobody')).toBeNull()
    expect(emailDomain('nobody@')).toBeNull()
    expect(emailDomain('@example.com')).toBeNull()
  })

  it('refuses to guess at two @ signs rather than return a middle segment', () => {
    expect(emailDomain('a@b@c')).toBeNull()
  })
})

describe('§14.5 path 1 — the organisation domain', () => {
  it('offers the organisation whose join_domain is the address domain', () => {
    const state = decideJoin({
      identity: reader('a@dnext-technology.com'),
      orgs: [DNEXT],
      invitedOrgIds: [],
      memberOrgIds: [],
    })

    expect(state.kind).toBe('offered')
    if (state.kind !== 'offered') return
    expect(state.domain).toBe('dnext-technology.com')
    expect(state.offers).toEqual([{ org: DNEXT, path: 'domain' }])
    expect(state.alreadyMember).toEqual([])
  })

  it('does not offer an organisation whose domain differs only in case', () => {
    // §14.4.2 would refuse the insert, so the screen must not promise it.
    const state = decideJoin({
      identity: reader('a@DNEXT-TECHNOLOGY.COM'),
      orgs: [DNEXT],
      invitedOrgIds: [],
      memberOrgIds: [],
    })
    expect(state.kind).toBe('nothingMatches')
  })
})

describe('§14.5 path 2 — a pending invitation', () => {
  it('offers an organisation with no join_domain when an invitation exists', () => {
    const state = decideJoin({
      identity: reader('someone@gmail.com'),
      orgs: [LOKUM],
      invitedOrgIds: [LOKUM.id],
      memberOrgIds: [],
    })

    expect(state.kind).toBe('offered')
    if (state.kind !== 'offered') return
    expect(state.offers).toEqual([{ org: LOKUM, path: 'invite' }])
  })

  it('names the domain path when both paths apply, since the insert satisfies either', () => {
    const state = decideJoin({
      identity: reader('a@dnext-technology.com'),
      orgs: [DNEXT],
      invitedOrgIds: [DNEXT.id],
      memberOrgIds: [],
    })

    expect(state.kind).toBe('offered')
    if (state.kind !== 'offered') return
    expect(state.offers.map((offer) => offer.path)).toEqual(['domain'])
  })

  it('orders several offers by name, so the list does not reshuffle between reads', () => {
    const state = decideJoin({
      identity: reader('a@acme.example'),
      orgs: [DNEXT, ACME, LOKUM],
      invitedOrgIds: [LOKUM.id],
      memberOrgIds: [],
    })

    expect(state.kind).toBe('offered')
    if (state.kind !== 'offered') return
    expect(state.offers.map((offer) => offer.org.name)).toEqual(['Acme Rail', 'Lokum AI'])
  })
})

describe('§14.5 — no address in the JWT', () => {
  it('reports the known gap rather than an empty list', () => {
    const state = decideJoin({
      identity: reader(null),
      orgs: [DNEXT],
      invitedOrgIds: [],
      memberOrgIds: [],
    })

    expect(state).toEqual({ kind: 'noEmail', why: 'missing', alreadyMember: [] })
  })

  // This block replaces a test that asserted the OPPOSITE of §14.4.2 as `0005`
  // wrote it: it pinned `emailVerified: false` to `why: 'unverified'` and left
  // the far commoner case — verified by an OAuth provider, no email identity —
  // asserting that the offer WAS made. Both `insert` policies open with
  // `app_metadata -> 'providers' ? 'email'`, so that offer was refused 42501.
  it('offers nothing when the provider list carries no email identity', () => {
    const state = decideJoin({
      identity: reader('a@dnext-technology.com', []),
      orgs: [DNEXT],
      invitedOrgIds: [],
      memberOrgIds: [],
    })

    expect(state.kind).toBe('noEmail')
    if (state.kind !== 'noEmail') return
    expect(state.why).toBe('unprovenMailbox')
  })

  it('refuses a domain join to an OAuth account whose provider vouches for the address', () => {
    const state = decideJoin({
      identity: oauthOnly('a@dnext-technology.com'),
      orgs: [DNEXT],
      invitedOrgIds: [],
      memberOrgIds: [],
    })

    expect(state.kind).toBe('noEmail')
    if (state.kind !== 'noEmail') return
    expect(state.why).toBe('unprovenMailbox')
  })

  it('refuses the INVITED route too, since `0005` guards both with one clause', () => {
    const state = decideJoin({
      identity: oauthOnly('someone@gmail.com'),
      orgs: [LOKUM],
      invitedOrgIds: [LOKUM.id],
      memberOrgIds: [],
    })

    expect(state.kind).toBe('noEmail')
    if (state.kind !== 'noEmail') return
    expect(state.why).toBe('unprovenMailbox')
  })

  it('reads the clause itself, so one account cannot answer two ways', () => {
    expect(mailboxProven(reader('a@dnext-technology.com'))).toBe(true)
    expect(mailboxProven({ userId: 'u', email: 'a@b.com', providers: ['github', 'email'] }))
      .toBe(true)
    expect(mailboxProven(oauthOnly('a@b.com'))).toBe(false)
    expect(mailboxProven({ userId: 'u', email: 'a@b.com', providers: [] })).toBe(false)
  })

  it('separates an address with no domain part from an absent one', () => {
    const state = decideJoin({
      identity: reader('nobody'),
      orgs: [DNEXT],
      invitedOrgIds: [],
      memberOrgIds: [],
    })

    expect(state.kind).toBe('noEmail')
    if (state.kind !== 'noEmail') return
    expect(state.why).toBe('malformed')
  })

  it('still lists the organisations already joined, which §14.5.1 is about', () => {
    const state = decideJoin({
      identity: reader(null),
      orgs: [DNEXT],
      invitedOrgIds: [],
      memberOrgIds: [DNEXT.id],
    })

    expect(state.kind).toBe('noEmail')
    expect(state.alreadyMember).toEqual([DNEXT])
  })

  it('gives every reason its own actionable copy, in three distinct states', () => {
    const reasons = (['missing', 'unprovenMailbox', 'malformed'] as const).map(noEmailCopy)
    expect(new Set(reasons.map((copy) => copy.status)).size).toBe(3)
    for (const copy of reasons) {
      expect(copy.status).toBe(copy.status.toUpperCase())
      expect(copy.detail.length).toBeGreaterThan(60)
    }
  })

  // The link used to be hard-coded to `/profile/` in the component for all
  // three reasons. `/profile/` prints the address on the account and says
  // nothing about which sign-ins it carries, so the one reader who needed
  // another sheet was sent to the page that cannot answer.
  it('sends the unproven mailbox to the sign-in sheet and the rest to the profile sheet', () => {
    expect(noEmailCopy('unprovenMailbox').link.href).toBe('/sign-in/')
    expect(noEmailCopy('missing').link.href).toBe('/profile/')
    expect(noEmailCopy('malformed').link.href).toBe('/profile/')
  })

  it('states the mailbox requirement, both routes, and the way in', () => {
    const detail = noEmailCopy('unprovenMailbox').detail
    expect(detail).toContain('Both routes')
    expect(detail).toContain('sign-in by email')
    // An invitation is guarded by the identical clause; a reader told only
    // about the domain route would expect one to be the way round it.
    expect(detail).toContain('invitation')
  })

  /**
   * The regression this pins.
   *
   * The detail promised "Adding an email sign-in to this account… is what opens
   * both" and linked to `/sign-in/`. `unprovenMailbox` is only reachable while
   * signed in, and `SignInPanel` answers a live session with "Already signed
   * in" — so the promised action existed on no sheet, and the link led back to
   * `/profile/`. The rule this module states for buttons ("no control whose
   * only outcome is an error") applies to a sentence naming an action just as
   * much, and nothing greps an English sentence.
   *
   * Asserted as the absence of the promise AND the presence of what replaced
   * it, because dropping the sentence alone would leave the reader with a limit
   * and no next step.
   */
  it('promises no action that no control performs (§14.5)', () => {
    const detail = noEmailCopy('unprovenMailbox').detail

    // The promise, in the shapes it could come back as.
    expect(detail).not.toMatch(/Adding an email sign-in to this account/i)
    expect(detail).not.toMatch(/is what opens both/i)

    // What the sheet at the end of the link actually holds. `SignInPanel`'s
    // signed-in branch names the limit and renders the sign-out; those two
    // words are the contract between this copy and that component.
    expect(detail).toMatch(/adds an email sign-in to an account that already exists/i)
    expect(detail).toMatch(/sign-out/i)
  })
})

describe('§14.5 — already a member', () => {
  it('never offers an organisation the reader is in, and lists it instead', () => {
    const state = decideJoin({
      identity: reader('a@dnext-technology.com'),
      orgs: [DNEXT],
      invitedOrgIds: [],
      memberOrgIds: [DNEXT.id],
    })

    expect(state.kind).toBe('nothingMatches')
    expect(state.alreadyMember).toEqual([DNEXT])
  })

  it('offers the second organisation while reporting the first as joined', () => {
    const state = decideJoin({
      identity: reader('a@acme.example'),
      orgs: [DNEXT, ACME],
      invitedOrgIds: [],
      memberOrgIds: [DNEXT.id],
    })

    expect(state.kind).toBe('offered')
    if (state.kind !== 'offered') return
    expect(state.offers).toEqual([{ org: ACME, path: 'domain' }])
    expect(state.alreadyMember).toEqual([DNEXT])
  })

  it('drops an invitation that has already been taken up', () => {
    const state = decideJoin({
      identity: reader('someone@gmail.com'),
      orgs: [LOKUM],
      invitedOrgIds: [LOKUM.id],
      memberOrgIds: [LOKUM.id],
    })

    expect(state.kind).toBe('nothingMatches')
  })
})

describe('§14.5 — an organisation that matches nothing', () => {
  it('reports the address and its domain, so the reader can see what was compared', () => {
    const state = decideJoin({
      identity: reader('a@gmail.com'),
      orgs: [DNEXT, ACME],
      invitedOrgIds: [],
      memberOrgIds: [],
    })

    expect(state).toEqual({
      kind: 'nothingMatches',
      email: 'a@gmail.com',
      domain: 'gmail.com',
      alreadyMember: [],
    })
  })

  it('ignores an organisation with no join_domain and no invitation', () => {
    const state = decideJoin({
      identity: reader('a@gmail.com'),
      orgs: [LOKUM],
      invitedOrgIds: [],
      memberOrgIds: [],
    })

    expect(state.kind).toBe('nothingMatches')
  })
})

describe('identityFromUser', () => {
  it('carries the provider list out of app_metadata verbatim', () => {
    expect(
      identityFromUser({
        id: 'u1',
        email: 'a@dnext-technology.com',
        app_metadata: { provider: 'email', providers: ['email'] },
      }),
    ).toEqual({ userId: 'u1', email: 'a@dnext-technology.com', providers: ['email'] })
  })

  // The measurement in `0005`'s header: `updateUser({ email_verified: true })`
  // is ACCEPTED and the next token carries the rewritten claim, while a raw PUT
  // of `app_metadata` answers 403. Reading the first field let the reader
  // decide whether the reader was verified.
  it('ignores user_metadata.email_verified, which the reader can write', () => {
    const identity = identityFromUser({
      id: 'u1',
      email: 'a@dnext-technology.com',
      user_metadata: { email_verified: true },
      app_metadata: { providers: ['github'] },
    })
    expect(identity?.providers).toEqual(['github'])
    expect(mailboxProven(identity as JoinIdentity)).toBe(false)
  })

  it('ignores email_confirmed_at, which answers a question no policy asks', () => {
    const identity = identityFromUser({
      id: 'u1',
      email: 'a@dnext-technology.com',
      email_confirmed_at: '2026-09-01T10:00:00.000Z',
      app_metadata: { providers: ['github'] },
    })
    expect(mailboxProven(identity as JoinIdentity)).toBe(false)
  })

  it('reports a GitHub account with a private address as carrying none', () => {
    const identity = identityFromUser({ id: 'u1', app_metadata: { providers: ['github'] } })
    expect(identity).toEqual({ userId: 'u1', email: null, providers: ['github'] })
    expect(decideJoin({
      identity: identity as JoinIdentity,
      orgs: [DNEXT],
      invitedOrgIds: [],
      memberOrgIds: [],
    }).kind).toBe('noEmail')
  })

  it('invents nothing from a user object it cannot read', () => {
    expect(identityFromUser(null)).toBeNull()
    expect(identityFromUser({})).toBeNull()
    expect(identityFromUser({ id: '   ' })).toBeNull()
    // An unreadable or absent list is an EMPTY list: `0005` refuses such an
    // account, and so must the screen. Inventing `['email']` here would be the
    // offer-then-42501 this module exists to avoid.
    expect(identityFromUser({ id: 'u1', email: 'a@b.com', app_metadata: 'nope' })?.providers)
      .toEqual([])
    expect(identityFromUser({ id: 'u1', email: 'a@b.com' })?.providers).toEqual([])
    expect(
      identityFromUser({ id: 'u1', app_metadata: { providers: ['email', 7, null] } })?.providers,
    ).toEqual(['email'])
  })
})

describe('§14.5.1 — the disclosure debt', () => {
  const statements = disclosureStatements('dnext-technology', 0)

  it('names the organisation before anything else', () => {
    expect(statements[0]).toBe('You are joining dnext-technology.')
  })

  it('states that managers see the WHOLE record, itemised', () => {
    const text = statements.join(' ')
    expect(text).toContain('whole record')
    for (const item of ['signed off', 'quiz attempt', 'submittal', 'timeline']) {
      expect(text).toContain(item)
    }
  })

  it('states the multi-organisation consequence §14.3 accepts', () => {
    expect(statements.join(' ')).toContain('managers of both see this same record')
  })

  it('counts the reader existing organisations instead of speaking in conditionals', () => {
    const one = disclosureStatements('Acme Rail', 1).join(' ')
    expect(one).toContain('1 other organisation,')
    expect(one).toContain('every one of them see this same record')

    const two = disclosureStatements('Acme Rail', 2).join(' ')
    expect(two).toContain('2 other organisations')
  })

  it('states that erasing the record leaves the organisation copy (§14.6)', () => {
    const text = statements.join(' ')
    expect(text).toContain('does not erase the organisation copy')
    expect(text).toContain('Closing your account removes it')
  })

  it('states where consent happens, since the row is written by the reader', () => {
    expect(statements[statements.length - 1]).toContain('written by you')
  })

  it('keeps §12.14.1 register out of the disclosure', () => {
    const text = [
      ...statements,
      ...disclosureStatements('Acme Rail', 3),
      ...(['missing', 'unprovenMailbox', 'malformed'] as const).flatMap((why) => {
        const copy = noEmailCopy(why)
        return [copy.status, copy.detail]
      }),
    ].join(' ')

    for (const banned of [/!/, /\b(?:we|our|my)\b/i, /\b(?:just|simply|easy)\b/i, /\bplease\b/i,
      /\b(?:in)?valid\b/i, /\bsorry\b/i]) {
      expect(text).not.toMatch(banned)
    }
  })
})

describe('classifyJoinError — from the code, never the message', () => {
  it('separates a duplicate row from a refused one', () => {
    expect(classifyJoinError({ code: '23505' })).toBe('duplicate')
    expect(classifyJoinError({ code: '42501' })).toBe('refused')
  })

  it('explains a refusal by the clause the reader cannot see on the screen', () => {
    const copy = joinFailureCopy('refused', 'dnext-technology')
    // The previous copy named only a changed domain and a withdrawn
    // invitation, both temporary, and omitted the permanent cause `0005` made
    // the first clause of both policies.
    expect(copy).toContain('email sign-in')
    expect(copy).toContain('dnext-technology')
    expect(copy).not.toContain('withdrawn')
  })

  it('keeps the three failures in three distinct sentences', () => {
    const copies = (['duplicate', 'refused', 'unknown'] as const)
      .map((failure) => joinFailureCopy(failure, 'Acme Rail'))
    expect(new Set(copies).size).toBe(3)
    for (const copy of copies) {
      expect(copy).toContain('Acme Rail')
      expect(copy).not.toMatch(/!|\bjust\b|\bsimply\b|\beasy\b|\bplease\b|\bsorry\b/i)
    }
  })

  it('reports anything else as unknown rather than guessing', () => {
    expect(classifyJoinError({ code: 'PGRST301' })).toBe('unknown')
    expect(classifyJoinError(null)).toBe('unknown')
    expect(classifyJoinError(undefined)).toBe('unknown')
    expect(classifyJoinError({})).toBe('unknown')
  })
})
