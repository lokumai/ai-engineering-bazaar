import { describe, expect, it } from 'vitest'
import { profileRowFor, profileRowIsRedundant } from '@/lib/org/profile-sync'
import { describeSessionUser, type RawUser } from '@/lib/auth/session'
import { EMPTY_RECORD, type RecordData } from '@/lib/record/schema'

/**
 * §14.2.1, §14.8.2 — the row's contents, which is the whole of the decision.
 *
 * `profileRowFor` is the only thing standing between §14.8.2's evidence column
 * and the empty array `loadProfiles` used to return, so the assertions worth
 * writing are the ones about ABSENCE: a key that is missing rather than null (an
 * upsert with an explicit null would blank a verified handle), and a `null` row
 * rather than a row of nothing (§11.25). No clock, no DOM, no client —
 * §12.14.2.
 *
 * **Every `RawUser` goes through `describeSessionUser` first, because that is
 * what production does.** These tests used to hand a `RawUser` straight in, and
 * that is how `github_login` came to be written by nobody: the island has only
 * the projection, which carries `githubLogin` and no `identities`, so the real
 * argument never resembled the fixture. `profileRowFor` now takes the resolved
 * login rather than deriving it, and routing the fixtures through the same
 * projection keeps `githubLoginOf`'s rules about evidence under test on the path
 * that actually runs.
 */

function identity(overrides: Partial<RecordData['identity']> = {}): RecordData['identity'] {
  return { ...EMPTY_RECORD.identity, ...overrides }
}

const FULL = identity({
  name: 'Ada Lovelace',
  markSeed: '1a2b3c4d',
  mark: 'weld',
  role: 'devops',
})

function githubUser(login: string, id = 'user-1'): RawUser {
  return {
    id,
    email: 'ada@example.com',
    identities: [{ provider: 'github', identity_data: { user_name: login } }],
  }
}

function googleUser(id = 'user-1'): RawUser {
  return {
    id,
    email: 'ada@example.com',
    identities: [{ provider: 'google', identity_data: { name: 'Ada' } }],
  }
}

describe('profileRowFor', () => {
  it('carries every identity column plus the OAuth handle', () => {
    expect(profileRowFor(FULL, describeSessionUser(githubUser('ada')))).toEqual({
      id: 'user-1',
      display_name: 'Ada Lovelace',
      mark_seed: '1a2b3c4d',
      mark: 'weld',
      role_id: 'devops',
      github_login: 'ada',
    })
  })

  it('returns null for an empty identity and a provider with no handle (§11.25)', () => {
    // The absent-not-empty rule: a row of nothing makes "has told us nothing"
    // and "has a blank profile" indistinguishable for the manager.
    expect(profileRowFor(EMPTY_RECORD.identity, describeSessionUser(googleUser()))).toBeNull()
  })

  it('writes a row for a GitHub user who has typed nothing — the handle alone is worth it', () => {
    // §14.8.2's evidence column does not depend on the reader filling in a name.
    expect(profileRowFor(EMPTY_RECORD.identity, describeSessionUser(githubUser('ada')))).toEqual({
      id: 'user-1',
      github_login: 'ada',
    })
  })

  it('OMITS github_login for a non-GitHub session rather than nulling it', () => {
    // The whole reason the columns are optional: an explicit null here would
    // overwrite a handle written by an earlier GitHub sign-in, and the panel
    // would start marking honest submittals "not the owner".
    const row = profileRowFor(FULL, describeSessionUser(googleUser()))
    expect(row).not.toBeNull()
    expect(row && 'github_login' in row).toBe(false)
  })

  /**
   * The regression, named. The island holds a `SessionUser` and nothing else,
   * so this is the argument production supplies — and for as long as
   * `profileRowFor` derived the handle itself, this assertion was false and
   * §14.8.2's evidence column could never resolve for anybody.
   */
  it('writes github_login on the path the island actually takes (§14.8.2)', () => {
    const projected = describeSessionUser(githubUser('ada'))
    expect(projected.githubLogin).toBe('ada')
    expect('identities' in projected).toBe(false)
    expect(profileRowFor(FULL, projected)?.github_login).toBe('ada')
  })

  it('reads the handle from the provider identity, never from user_metadata', () => {
    const spoofed = {
      id: 'user-1',
      identities: [{ provider: 'google', identity_data: {} }],
      // A field `auth.updateUser()` can write. `githubLoginOf` must not see it.
      user_metadata: { user_name: 'torvalds' },
    } as RawUser
    expect(profileRowFor(FULL, describeSessionUser(spoofed))?.github_login).toBeUndefined()
  })

  it('accepts preferred_username, which some provider versions send instead', () => {
    const user: RawUser = {
      id: 'user-1',
      identities: [{ provider: 'github', identity_data: { preferred_username: 'ada' } }],
    }
    expect(profileRowFor(FULL, describeSessionUser(user))?.github_login).toBe('ada')
  })

  it('drops values a hand-edited record could hold, rather than uploading them', () => {
    // This is the moment a local value becomes something a MANAGER reads about
    // a colleague, so every field is re-checked against its own vocabulary.
    const rough = {
      name: '  Ada​Lovelace  ',
      markSeed: 'NOT-HEX!',
      mark: 'invented',
      role: 'wizard',
    } as unknown as RecordData['identity']
    const row = profileRowFor(rough, describeSessionUser(githubUser('ada')))
    expect(row).toEqual({
      id: 'user-1',
      display_name: 'AdaLovelace',
      github_login: 'ada',
    })
  })

  it('omits mark when the record says "use the seed" (§12.3.5)', () => {
    const row = profileRowFor(identity({ markSeed: 'deadbeef', mark: null }), describeSessionUser(googleUser()))
    expect(row).toEqual({ id: 'user-1', mark_seed: 'deadbeef' })
  })

  it('refuses a row keyed by nobody — §14.4.4 would reject it as an RLS violation', () => {
    expect(profileRowFor(FULL, { id: '', githubLogin: null })).toBeNull()
    expect(profileRowFor(FULL, { id: '   ', githubLogin: null })).toBeNull()
  })

  it('accepts the seeded mark an older or hand-edited record may store', () => {
    expect(profileRowFor(identity({ mark: 'seeded' }), describeSessionUser(googleUser()))?.mark).toBe('seeded')
  })
})

describe('profileRowIsRedundant', () => {
  const row = { id: 'user-1', display_name: 'Ada', github_login: 'ada', role_id: 'devops' as const }

  it('is false when nothing is known, so the first write always happens', () => {
    expect(profileRowIsRedundant(row, null)).toBe(false)
  })

  it('is true when every comparable column already matches', () => {
    expect(
      profileRowIsRedundant(row, { displayName: 'Ada', githubLogin: 'ada', roleId: 'devops' }),
    ).toBe(true)
  })

  it('is false when one column differs', () => {
    expect(
      profileRowIsRedundant(row, { displayName: 'Ada', githubLogin: null, roleId: 'devops' }),
    ).toBe(false)
  })

  it('never claims redundancy for the two columns loadProfiles does not select', () => {
    // An honest limit rather than a comparison that silently skips a change.
    expect(
      profileRowIsRedundant(
        { id: 'user-1', mark_seed: '1a2b3c4d' },
        { displayName: null, githubLogin: null, roleId: null },
      ),
    ).toBe(false)
  })
})
