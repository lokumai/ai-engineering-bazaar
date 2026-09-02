import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { aliasDecision } from '@/components/record/AccountSync'
import type { SessionUser } from '@/lib/auth/session'
import { erasedRecord } from '@/lib/record/erase'
import { noteAliasNamed, setIdentity } from '@/lib/record/events'
import { aliasFromEmail } from '@/lib/identity/alias-offer'
import { carriesNothing, EMPTY_RECORD, type RecordData } from '@/lib/record/schema'
import { NAME_FROM_ADDRESS } from '@/lib/record/scope'

/**
 * §16.3 — the alias decided from the address, and the guards that make one
 * automatic write to `identity.name` safe.
 *
 * The whole decision is a pure function of a record and a session
 * (`aliasDecision`), which is why this file needs no store, no clock, no session
 * and no supabase client: the guards ARE that function and are pinned here as
 * values.
 *
 * The rest are not properties of a value — they are properties of WHERE the
 * function is called — so they are pinned by reading the seam's source, the
 * instrument `tests/unit/identity/alias.test.tsx:186-244` already uses for the
 * same reason: this suite is `renderToStaticMarkup` only, there is no jsdom and
 * no way to resolve a real `claim()` here, and a guard that exists only in the
 * ordering of statements is still a guard that can be deleted. A source scan
 * catches the deletion at the moment it is cheap.
 *
 * **What this file did not catch, and now does.** It asserted that a reader who
 * cleared the name is not renamed — but it arranged that state with `named()`,
 * which writes the name AND the flag together. That is one of the two ways to
 * reach a cleared name, and it was the harmless one. The other way — type a
 * name, THEN sign in, then clear it — never wrote the flag at all, because the
 * old `aliasNameFor` returned before `noteAliasNamed` whenever a name was
 * already present, so the address was written over an explicit `REMOVE NAME` on
 * the next mount. The suite passed because the fixture could not express the
 * defective state. Both routes to a cleared name are now arranged, from the
 * acts that produce them and never from a hand-built record.
 */

const NOW = '2026-09-02T10:00:00.000Z'
const ID = '11111111-2222-3333-4444-555555555555'
const OTHER = '99999999-8888-7777-6666-555555555555'

/** A session as `describeSessionUser` produces it, defaulting to the case the
 *  offer is FOR: a reader who signed in with a magic link. */
function reader(patch: Partial<SessionUser> = {}): SessionUser {
  return {
    id: ID,
    email: 'ada@example.com',
    githubLogin: null,
    provider: 'email',
    providers: ['email'],
    ...patch,
  }
}

/**
 * The seam's reduction, performed exactly as `decideAliasFromAccount` performs
 * it: the decision is taken against the record as it is, and the name (when
 * there is one) and the flag land in ONE step. Every fixture below is built by
 * calling this rather than by writing `prefs.aliasNamedFor` directly, so no test
 * can assert against a state the production path cannot produce.
 */
function settle(data: RecordData, user: SessionUser): RecordData {
  const decision = aliasDecision(data, user)
  if (decision === null) return data
  const withName = decision.name === null ? data : setIdentity(data, { name: decision.name }, NOW)
  return noteAliasNamed(withName, user.id, NOW)
}

const SEAM = readFileSync(
  join(import.meta.dirname, '../../../src/components/record/AccountSync.tsx'),
  'utf8',
)

describe('§16.3 — what the address may name', () => {
  it('offers the local part of the address to an unnamed record', () => {
    expect(aliasDecision(EMPTY_RECORD, reader())).toEqual({ name: 'ada' })
  })

  it('takes the offer from aliasFromEmail and never from a second copy of that rule', () => {
    // §16.3's fourth constraint lives in one module. If this ever diverges, the
    // seam has grown its own idea of what an address contains.
    const user = reader({ email: 'Ada.Lovelace+notes@x.co' })
    expect(aliasDecision(EMPTY_RECORD, user)?.name).toBe(aliasFromEmail(user.email))
  })

  /**
   * GUARD 3 — §16.3's first constraint, and the F1 repair. A chosen name is
   * never overwritten, but the DECISION is recorded all the same: `name: null`
   * rather than the early return the old `aliasNameFor` took.
   */
  it('writes no name over one already on the record, and still records the decision', () => {
    const data = setIdentity(EMPTY_RECORD, { name: 'İlker' }, NOW)
    expect(aliasDecision(data, reader())).toEqual({ name: null })

    const settled = settle(data, reader())
    expect(settled.identity.name).toBe('İlker')
    expect(settled.prefs.aliasNamedFor).toBe(ID)
  })

  /** GUARD 1 — an OAuth account that hides its address is left alone. */
  it('declines when the session carries no email identity, and records nothing', () => {
    const github = reader({ email: null, provider: 'github', providers: ['github'] })
    expect(aliasDecision(EMPTY_RECORD, github)).toBeNull()
    // The flag stays null on purpose: an account with no address to offer from
    // has no decision to record, and a flag written here would silence the same
    // account's later session once it does carry the address.
    expect(settle(EMPTY_RECORD, github).prefs.aliasNamedFor).toBeNull()
  })

  it('declines a GitHub session even when its token happens to expose an address', () => {
    // The two stops on this hazard are independent on purpose: this one is
    // refused by the identity check, and `aliasFromEmail` never sees it.
    const github = reader({
      email: 'ada@users.noreply.github.com',
      provider: 'github',
      providers: ['github'],
    })
    expect(aliasDecision(EMPTY_RECORD, github)).toBeNull()
    expect(aliasFromEmail(github.email)).toBe('ada')
  })

  /** GUARD 2 — once per account, and it is what closes hazard 7. */
  it('decides it once: the second ask writes nothing', () => {
    expect(aliasDecision(EMPTY_RECORD, reader())?.name).toBe('ada')
    expect(aliasDecision(settle(EMPTY_RECORD, reader()), reader())).toBeNull()
  })

  it('does not rename a reader who cleared the name the offer supplied', () => {
    // REMOVE NAME leaves `identity.name` null and the flag standing, which is
    // exactly the state guard 2 exists to hold: clearing the alias is a
    // decision, and re-offering the address would overrule it.
    const cleared = setIdentity(settle(EMPTY_RECORD, reader()), { name: null }, NOW)
    expect(cleared.identity.name).toBeNull()
    expect(cleared.prefs.aliasNamedFor).toBe(ID)
    expect(aliasDecision(cleared, reader())).toBeNull()
  })

  /**
   * F1, THE REPRODUCTION. Three acts in the order a reader performs them: type a
   * name, sign in (the claim settles, the seam decides), clear the name. Against
   * the old code the third line left `aliasNamedFor` null and the fourth
   * returned `'ada'`, so one reload wrote the address over the reader's
   * `REMOVE NAME`. Both assertions fail the moment guard 3 goes back to being an
   * early return.
   */
  it('does not rename a reader who typed a name, signed in, then cleared it', () => {
    const typed = setIdentity(EMPTY_RECORD, { name: 'Bob' }, NOW)
    const signedIn = settle(typed, reader())
    expect(signedIn.identity.name).toBe('Bob')
    expect(signedIn.prefs.aliasNamedFor).toBe(ID)

    const cleared = setIdentity(signedIn, { name: null }, NOW)
    expect(aliasDecision(cleared, reader())).toBeNull()
    expect(settle(cleared, reader()).identity.name).toBeNull()
  })

  it('re-offers to a second account at the same browser, once', () => {
    // The flag holds an id and not a boolean: the record belongs to the
    // browser, so the first account's decision must not silence the second's.
    const cleared = setIdentity(settle(EMPTY_RECORD, reader()), { name: null }, NOW)
    const second = reader({ id: OTHER, email: 'grace@example.org' })
    expect(aliasDecision(cleared, second)?.name).toBe('grace')
    expect(aliasDecision(settle(cleared, second), second)).toBeNull()
  })

  it('records the decision even when the address has no usable local part', () => {
    // Nothing to write, and nothing to reconsider: the address belongs to the
    // account and cannot acquire a local part later, so re-asking on every mount
    // would be work with one possible answer.
    for (const email of ['@example.com', '+tag@example.com']) {
      const user = reader({ email })
      expect(aliasDecision(EMPTY_RECORD, user)).toEqual({ name: null })
      expect(settle(EMPTY_RECORD, user).identity.name).toBeNull()
      expect(settle(EMPTY_RECORD, user).prefs.aliasNamedFor).toBe(ID)
    }
    // An email identity with no address on the session is the same answer for
    // the same reason: the address is the account's and this one has none to
    // offer, so the decision is settled rather than re-asked every mount. Guard
    // 1 is the different case — no email identity AT ALL — and it records
    // nothing, because such an account may still link an address later.
    expect(aliasDecision(EMPTY_RECORD, reader({ email: null }))).toEqual({ name: null })
  })

  it('touches nothing but the name and the flag', () => {
    const before = settle(EMPTY_RECORD, reader())
    expect(before.identity.name).toBe('ada')
    expect(before.prefs.aliasNamedFor).toBe(ID)
    // §12.3.5 — the seed is a record of a past act and a rename may not mint or
    // move it, and the mark is the reader's choice.
    expect(before.identity.markSeed).toBeNull()
    expect(before.identity.mark).toBeNull()
    expect(before.identity.role).toBeNull()
    expect(before.sheets).toEqual(EMPTY_RECORD.sheets)
    expect(before.prefs.charKeys).toBe(EMPTY_RECORD.prefs.charKeys)
  })
})

/**
 * F1b — §12.15's erase against §16.3's once-per-account rule.
 *
 * `DataPanel` does not sign the reader out, so the claim runs again on the next
 * mount with the same session. If the erase reset `prefs.aliasNamedFor` the
 * decision would be re-taken and the reader's name — and a day stamp — would
 * arrive in the record they had just erased.
 *
 * THE CHOICE PINNED HERE: the erase carries the flag across. §12.15's promise is
 * about the content and the two storage keys, both of which are gone; the flag
 * reprints nothing, and `carriesNothing` ignores `prefs` entirely, so a record
 * holding it still counts as empty everywhere that matters — the cross-tab push
 * rule and the seam's erase-wins guard. The rejected alternative was to reset the
 * flag and sign the reader out; these tests fail under it, which is the point of
 * writing them this way.
 */
describe('§12.15 + §16.3 — what an erase leaves of the decision', () => {
  it('keeps the record empty and every content field erased', () => {
    const worked = settle(setIdentity(EMPTY_RECORD, { name: 'Ada' }, NOW), reader())
    const erased = erasedRecord(worked)
    expect(erased.identity).toEqual(EMPTY_RECORD.identity)
    expect(erased.sheets).toEqual({})
    expect(erased.days).toEqual([])
    expect(erased.meta).toEqual(EMPTY_RECORD.meta)
    // The two rules that read `prefs`-blind emptiness must still see nothing.
    expect(carriesNothing(erased)).toBe(true)
  })

  it('does not re-decide the alias after an erase, so no name comes back', () => {
    const erased = erasedRecord(settle(EMPTY_RECORD, reader()))
    expect(erased.identity.name).toBeNull()
    expect(erased.prefs.aliasNamedFor).toBe(ID)
    expect(aliasDecision(erased, reader())).toBeNull()
    // The write the old code performed on the next mount: a name and a day in a
    // record the reader had just erased.
    expect(settle(erased, reader())).toBe(erased)
    expect(settle(erased, reader()).days).toEqual([])
  })

  it('still offers to a different account after an erase', () => {
    // Carrying the flag is not a ban on the feature: it names ONE account.
    const erased = erasedRecord(settle(EMPTY_RECORD, reader()))
    const second = reader({ id: OTHER, email: 'grace@example.org' })
    expect(aliasDecision(erased, second)?.name).toBe('grace')
  })

  it('returns the frozen empty record itself when there is no decision to carry', () => {
    // Rule 3 of `events.ts` in the shape this file can hold: nothing to carry
    // means the shared constant, so an erase from a signed-out browser allocates
    // nothing and cannot differ from `EMPTY_RECORD` by construction.
    expect(erasedRecord(EMPTY_RECORD)).toBe(EMPTY_RECORD)
    expect(erasedRecord(setIdentity(EMPTY_RECORD, { name: 'Ada' }, NOW))).toBe(EMPTY_RECORD)
  })

  it('is what DataPanel erases with', () => {
    // The panel is a component this suite cannot drive, and the defect was in
    // the ONE line that chose the record to write. `update(() => EMPTY_RECORD)`
    // is the state to keep out: it resets the flag.
    const panel = readFileSync(
      join(import.meta.dirname, '../../../src/components/record/DataPanel.tsx'),
      'utf8',
    )
    expect(panel).toContain('update((data) => erasedRecord(data))')
    expect(panel).not.toMatch(/update\(\(\)\s*=>\s*EMPTY_RECORD\)/)
  })
})

describe('§16.3.1 — where the naming is allowed to happen', () => {
  /**
   * Hazard 8: `mergeIdentity` gives the account's identity precedence, so a name
   * can arrive AFTER any earlier read. The guards therefore have to be evaluated
   * against the record as it is at the instant of the write — which is `update`'s
   * own reducer argument — and never against a value read before the claim
   * resolved.
   */
  it('evaluates the guards inside the write, against the reducer argument', () => {
    expect(SEAM).toContain('aliasDecision(data, account)')
    // A read taken outside the write is the mistake this pins. `snapshot()` is
    // still used by the merge branch above; it may not feed the decision.
    expect(SEAM).not.toMatch(/aliasDecision\(\s*snapshot\(\)/)
    expect(SEAM).not.toMatch(/aliasDecision\(\s*local/)
    expect(SEAM).not.toMatch(/aliasDecision\(\s*outcome/)
  })

  it('writes the name and the flag in one reduction', () => {
    // A half-written state — named, not flagged — would re-decide on the next
    // TOKEN_REFRESHED and overwrite a name the reader had since edited.
    expect(SEAM).toContain('return noteAliasNamed(withName, account.id, now)')
    // Exactly one call in the file: a second one would be a second writer of
    // the flag, and the flag is what makes the decision final.
    expect(occurrences(SEAM, /\bnoteAliasNamed\(/g)).toBe(1)
  })

  it('reaches the flag on the branch that writes no name', () => {
    // F1 in one assertion about the source: the name is conditional, the flag is
    // not. An early return above `noteAliasNamed` for a record that already has
    // a name is the defect, and it cannot be reintroduced without deleting this.
    expect(SEAM).toContain(
      'decision.name === null ? data : setIdentity(data, { name: decision.name }, now)',
    )
  })

  /**
   * The erase-wins guard was found by the §14.6 test in `accounts.spec.ts`: a
   * reader can complete an erase while the claim is in flight, and the claim then
   * resolves holding a merge built from the row it read before the delete.
   * Deciding the alias after that early return would put a name back into a
   * record the reader had just erased — and, because `carriesNothing` ignores
   * `prefs` (`schema.ts`), the flag would ride along without making the record
   * look occupied.
   */
  it('is called only after the erase-wins guard, and only from the claim', () => {
    const eraseGuard = SEAM.indexOf(
      'if (carriesNothing(local) && !carriesNothing(outcome.local)) return',
    )
    expect(eraseGuard).toBeGreaterThan(-1)

    const calls = [...SEAM.matchAll(/^\s*decideAliasFromAccount\(\)/gm)]
    // One per claim outcome that settles what the account holds: `merged` and
    // `adopted`. `unreadable` and `off` decide nothing about the row yet.
    expect(calls).toHaveLength(2)
    for (const call of calls) {
      expect(call.index as number).toBeGreaterThan(eraseGuard)
    }
  })

  it('files a log row only when a name was actually written', () => {
    // §14.2.3 — the row names the act. Since the F1 repair this reduction can
    // land the flag alone, and a `setIdentity` row for a write that set no
    // identity would describe an act nobody performed.
    expect(SEAM).toContain('if (named !== null) {')
    expect(SEAM).toContain("logEvent({ kind: 'setIdentity', payload: { named: true, fromEmail: true } })")
  })
})

describe('§16.3 — the note under the field', () => {
  it('names where the value came from and how to change it, without the address', () => {
    expect(NAME_FROM_ADDRESS).toContain('SIGNED IN WITH')
    expect(NAME_FROM_ADDRESS).not.toMatch(/@/)
    expect(NAME_FROM_ADDRESS).not.toMatch(/email/i)
  })

  /** §12.14.1 — a readout is uppercase mono with no terminal period. */
  it('is a readout and not prose', () => {
    expect(NAME_FROM_ADDRESS).toBe(NAME_FROM_ADDRESS.toUpperCase())
    expect(NAME_FROM_ADDRESS.endsWith('.')).toBe(false)
  })

  it('has one author', () => {
    const panel = readFileSync(
      join(import.meta.dirname, '../../../src/components/record/IdentityPanel.tsx'),
      'utf8',
    )
    expect(panel).toContain('NAME_FROM_ADDRESS')
    // The words themselves may not be retyped in the panel: hazard 9 is that a
    // second copy of one claim is how all four copies came to be wrong.
    expect(panel).not.toContain('SIGNED IN WITH')
  })

  /**
   * The line is only true while both facts hold, and the second one is what
   * makes it disappear the moment the reader edits the name. Pinned on the
   * source because the panel cannot be driven in this suite.
   */
  it('is gated on the account AND on the stored name still being the offer', () => {
    const panel = readFileSync(
      join(import.meta.dirname, '../../../src/components/record/IdentityPanel.tsx'),
      'utf8',
    )
    expect(panel).toContain('record.prefs.aliasNamedFor === view.user.id')
    expect(panel).toContain('stored === aliasFromEmail(view.user.email)')
  })
})

function occurrences(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}
