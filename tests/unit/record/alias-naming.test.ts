import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { aliasNameFor } from '@/components/record/AccountSync'
import type { SessionUser } from '@/lib/auth/session'
import { aliasFromEmail } from '@/lib/identity/alias-offer'
import { noteAliasNamed, setIdentity } from '@/lib/record/events'
import { EMPTY_RECORD, type RecordData } from '@/lib/record/schema'
import { NAME_FROM_ADDRESS } from '@/lib/record/scope'

/**
 * §16.3 — the alias named from the address, and the five guards that make one
 * automatic write to `identity.name` safe.
 *
 * The whole decision is a pure function of a record and a session
 * (`aliasNameFor`), which is why this file needs no store, no clock, no session
 * and no supabase client: three of the five guards ARE that function and are
 * pinned here as values.
 *
 * The remaining two are not properties of a value — they are properties of WHERE
 * the function is called — so they are pinned by reading the seam's source, the
 * instrument `tests/unit/identity/alias.test.tsx:186-244` already uses for the
 * same reason: this suite is `renderToStaticMarkup` only, there is no jsdom and
 * no way to resolve a real `claim()` here, and a guard that exists only in the
 * ordering of statements is still a guard that can be deleted. A source scan
 * catches the deletion at the moment it is cheap.
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

function named(data: RecordData, name: string, id = ID): RecordData {
  // The exact composition the seam performs, in the same order: the name and
  // the flag in one reduction, so a state that is named but not flagged cannot
  // be what this test asserts against.
  return noteAliasNamed(setIdentity(data, { name }, NOW), id, NOW)
}

const SEAM = readFileSync(
  join(import.meta.dirname, '../../../src/components/record/AccountSync.tsx'),
  'utf8',
)

describe('§16.3 — what the address may name', () => {
  it('offers the local part of the address to an unnamed record', () => {
    expect(aliasNameFor(EMPTY_RECORD, reader())).toBe('ada')
  })

  it('takes the offer from aliasFromEmail and never from a second copy of that rule', () => {
    // §16.3's fourth constraint lives in one module. If this ever diverges, the
    // seam has grown its own idea of what an address contains.
    const user = reader({ email: 'Ada.Lovelace+notes@x.co' })
    expect(aliasNameFor(EMPTY_RECORD, user)).toBe(aliasFromEmail(user.email))
  })

  /** GUARD 2 — §16.3's first constraint. A chosen name is never overwritten. */
  it('leaves a name that is already on the record alone', () => {
    const data = setIdentity(EMPTY_RECORD, { name: 'İlker' }, NOW)
    expect(aliasNameFor(data, reader())).toBeNull()
  })

  /** GUARD 3 — an OAuth account that hides its address is left alone. */
  it('declines when the session carries no email identity', () => {
    const github = reader({ email: null, provider: 'github', providers: ['github'] })
    expect(aliasNameFor(EMPTY_RECORD, github)).toBeNull()
  })

  it('declines a GitHub session even when its token happens to expose an address', () => {
    // The two stops on this hazard are independent on purpose: this one is
    // refused by the identity check, and `aliasFromEmail` never sees it.
    const github = reader({
      email: 'ada@users.noreply.github.com',
      provider: 'github',
      providers: ['github'],
    })
    expect(aliasNameFor(EMPTY_RECORD, github)).toBeNull()
    expect(aliasFromEmail(github.email)).toBe('ada')
  })

  /** GUARD 4 — once per account, and it is what closes hazard 7. */
  it('names it once: the second ask writes nothing', () => {
    const first = aliasNameFor(EMPTY_RECORD, reader())
    expect(first).toBe('ada')
    expect(aliasNameFor(named(EMPTY_RECORD, first as string), reader())).toBeNull()
  })

  it('does not rename a reader who cleared the name', () => {
    // REMOVE NAME leaves `identity.name` null and the flag standing, which is
    // exactly the state guard 4 exists to hold: clearing the alias is a
    // decision, and re-offering the address would overrule it.
    const cleared = setIdentity(named(EMPTY_RECORD, 'ada'), { name: null }, NOW)
    expect(cleared.identity.name).toBeNull()
    expect(cleared.prefs.aliasNamedFor).toBe(ID)
    expect(aliasNameFor(cleared, reader())).toBeNull()
  })

  it('re-offers to a second account at the same browser, once', () => {
    // The flag holds an id and not a boolean: the record belongs to the
    // browser, so the first account's offer must not silence the second's.
    const cleared = setIdentity(named(EMPTY_RECORD, 'ada'), { name: null }, NOW)
    const second = reader({ id: OTHER, email: 'grace@example.org' })
    expect(aliasNameFor(cleared, second)).toBe('grace')
    expect(aliasNameFor(named(cleared, 'grace', OTHER), second)).toBeNull()
  })

  it('offers nothing when the address has no usable local part', () => {
    expect(aliasNameFor(EMPTY_RECORD, reader({ email: '@example.com' }))).toBeNull()
    expect(aliasNameFor(EMPTY_RECORD, reader({ email: '+tag@example.com' }))).toBeNull()
    expect(aliasNameFor(EMPTY_RECORD, reader({ email: null }))).toBeNull()
  })

  it('touches nothing but the name and the flag', () => {
    const before = named(EMPTY_RECORD, 'ada')
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

describe('§16.3.1 — where the naming is allowed to happen', () => {
  /**
   * GUARD 1. Hazard 8: `mergeIdentity` gives the account's identity precedence,
   * so a name can arrive AFTER any earlier read. The guards therefore have to be
   * evaluated against the record as it is at the instant of the write — which is
   * `update`'s own reducer argument — and never against a value read before the
   * claim resolved.
   */
  it('evaluates the guards inside the write, against the reducer argument', () => {
    expect(SEAM).toContain('aliasNameFor(data, account)')
    // A read taken outside the write is the mistake this pins. `snapshot()` is
    // still used by the merge branch above; it may not feed the naming.
    expect(SEAM).not.toMatch(/aliasNameFor\(\s*snapshot\(\)/)
    expect(SEAM).not.toMatch(/aliasNameFor\(\s*local/)
    expect(SEAM).not.toMatch(/aliasNameFor\(\s*outcome/)
  })

  it('writes the name and the flag in one reduction', () => {
    // A half-written state — named, not flagged — would re-offer on the next
    // TOKEN_REFRESHED and overwrite a name the reader had since edited.
    expect(SEAM).toContain('noteAliasNamed(setIdentity(data, { name: offered }, now), account.id, now)')
    // Exactly one call in the file: a second one would be a second writer of
    // the flag, and the flag is what makes the offer final.
    expect(occurrences(SEAM, /\bnoteAliasNamed\(/g)).toBe(1)
  })

  /**
   * GUARD 5. The erase-wins guard was found by the §14.6 test in
   * `accounts.spec.ts`: a reader can complete an erase while the claim is in
   * flight, and the claim then resolves holding a merge built from the row it
   * read before the delete. Naming the alias after that early return would put
   * a name back into a record the reader had just erased — and, because
   * `carriesNothing` ignores `prefs` (`schema.ts`), the flag would ride along
   * without making the record look occupied.
   */
  it('is called only after the erase-wins guard, and only from the claim', () => {
    const eraseGuard = SEAM.indexOf('if (carriesNothing(local) && !carriesNothing(outcome.local)) return')
    expect(eraseGuard).toBeGreaterThan(-1)

    const calls = [...SEAM.matchAll(/^\s*nameAliasFromAccount\(\)/gm)]
    // One per claim outcome that settles what the account holds: `merged` and
    // `adopted`. `unreadable` and `off` decide nothing about the row yet.
    expect(calls).toHaveLength(2)
    for (const call of calls) {
      expect(call.index as number).toBeGreaterThan(eraseGuard)
    }
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
