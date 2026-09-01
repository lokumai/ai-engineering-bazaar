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

function reader(email: string | null, verified = true): JoinIdentity {
  return { userId: 'user-1', email, emailVerified: verified }
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

  it('refuses an unconfirmed address even though §14.4.2 would accept it', () => {
    const state = decideJoin({
      identity: reader('a@dnext-technology.com', false),
      orgs: [DNEXT],
      invitedOrgIds: [],
      memberOrgIds: [],
    })

    expect(state.kind).toBe('noEmail')
    if (state.kind !== 'noEmail') return
    expect(state.why).toBe('unverified')
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
    const reasons = (['missing', 'unverified', 'malformed'] as const).map(noEmailCopy)
    expect(new Set(reasons.map((copy) => copy.status)).size).toBe(3)
    for (const copy of reasons) {
      expect(copy.status).toBe(copy.status.toUpperCase())
      expect(copy.detail.length).toBeGreaterThan(60)
    }
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
  it('accepts Supabase confirmation', () => {
    expect(
      identityFromUser({
        id: 'u1',
        email: 'a@dnext-technology.com',
        email_confirmed_at: '2026-09-01T10:00:00.000Z',
      }),
    ).toEqual({ userId: 'u1', email: 'a@dnext-technology.com', emailVerified: true })
  })

  it('accepts the provider claim when Supabase stamped nothing', () => {
    const identity = identityFromUser({
      id: 'u1',
      email: 'a@dnext-technology.com',
      user_metadata: { email_verified: true },
    })
    expect(identity?.emailVerified).toBe(true)
  })

  it('reports a GitHub account with a private address as carrying none', () => {
    const identity = identityFromUser({ id: 'u1', user_metadata: { email_verified: true } })
    expect(identity).toEqual({ userId: 'u1', email: null, emailVerified: true })
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
    expect(identityFromUser({ id: 'u1', email: 'a@b.com', user_metadata: 'nope' })?.emailVerified)
      .toBe(false)
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
      ...(['missing', 'unverified', 'malformed'] as const).flatMap((why) => {
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

  it('reports anything else as unknown rather than guessing', () => {
    expect(classifyJoinError({ code: 'PGRST301' })).toBe('unknown')
    expect(classifyJoinError(null)).toBe('unknown')
    expect(classifyJoinError(undefined)).toBe('unknown')
    expect(classifyJoinError({})).toBe('unknown')
  })
})
