/**
 * §15.5.2, §15.10 — every cell of the sign-in table, bound to a test.
 *
 * The table is four rows of behaviour claims, and the failure it exists to
 * prevent is silent: nothing on the screen looks wrong when a cell stops being
 * true. So this file does not check that the constant parses. It checks the
 * claims that would cost a reader something if they drifted — the alias row
 * saying an alias travels, the GitHub row offering a domain join the database
 * refuses (§14.14.5), a renderer inventing a fourth answer — and it checks
 * them per column, so a wrong cell fails on its own name instead of inside a
 * snapshot of the whole grid.
 *
 * **The two cells that name code are driven by that code, not restated.** They
 * used to be asserted as literals — `verifiedSubmittal` is `yes` only on the
 * GitHub row, `joinByDomain` is `yes` only on the email row — which is the exact
 * shape §14.14 of the Phase 4 spec records as a green test preserving a
 * falsehood: the assertion's input was the constant it was checking, so every
 * cell could go false with the suite green. Now `verifiedSubmittal` comes from
 * calling `classifySubmittals` with the `github_login` each door actually leaves
 * on the profile row, and `joinByDomain` / `needsProvenMailbox` come from
 * reading `0005`'s two `memberships` insert policies out of the migration and
 * asking which door's `app_metadata.providers` could satisfy them. Delete the
 * `providers ? 'email'` clause from the migration and the GitHub row's `no`
 * fails, which is the drift the table exists to catch.
 *
 * The last test reads the module's own source. That is the one guard against
 * the constraint the type system cannot see: `/sign-in/` renders this on the
 * server, but §15.4's alias island is a client component, and an import from
 * `lib/content/` would put `node:fs` on its path (§12.2) with no error until
 * the export.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ANSWER_WORDS,
  DOOR_CONSEQUENCES,
  DOOR_ROWS,
  doorRow,
  type Answer,
  type ConsequenceId,
  type DoorId,
} from '@/lib/auth/doors'
import { classifySubmittals } from '@/lib/org/types'
import { emptySheetRecord, type SheetRecord, type Submittal } from '@/lib/record/schema'

const ANSWERS: readonly Answer[] = ['yes', 'no', 'in-your-orgs']

/** The two doors that open an account, named once so the tests read as claims. */
const ACCOUNT_DOORS: readonly DoorId[] = ['emailLink', 'github']

/**
 * What `profiles.github_login` holds after each door.
 *
 * `profileRowFor` writes the column from `SessionUser.githubLogin` and nothing
 * else, so only the GitHub door leaves a login there; the two anonymous doors
 * write no profile row at all. This is the input `classifySubmittals` receives
 * in production, and handing it to the function is what turns the
 * `verifiedSubmittal` column from a restatement into a measurement.
 */
const GITHUB_LOGIN: Readonly<Record<DoorId, string | null>> = {
  none: null,
  alias: null,
  emailLink: null,
  github: 'cevheri',
}

/**
 * What `app_metadata.providers` holds after each door — the array `0005`'s
 * insert policies test with `?`. Empty means no account, and no account can
 * insert a `memberships` row at all: every policy also requires
 * `user_id = auth.uid()`.
 */
const PROVIDERS: Readonly<Record<DoorId, readonly string[]>> = {
  none: [],
  alias: [],
  emailLink: ['email'],
  github: ['github'],
}

/** A signed-off sheet carrying one submittal owned by `owner`. */
function sheetOwnedBy(owner: string): SheetRecord {
  const submittal: Submittal = {
    owner,
    repo: 'work',
    url: `https://github.com/${owner}/work`,
    commit: null,
    note: '',
    at: '2026-08-01T00:00:00.000Z',
  }
  return { ...emptySheetRecord(), signedOff: '2026-08-01T00:00:00.000Z', submittals: [submittal] }
}

/**
 * `0005`'s `memberships` insert policies, as source text.
 *
 * Read from the file the way `scripts/test-rls.mjs` reads `.env.local` — off
 * `process.cwd()`, which vitest sets to the repository root, the same resolution
 * the §12.2 import guard below already relies on.
 */
const MEMBERSHIP_INSERT_POLICIES: readonly string[] = readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/0005_phase4_provider_verified.sql'),
  'utf8',
)
  .split(/create policy/i)
  .slice(1)
  .filter((body) => /for insert/i.test(body) && /on memberships/i.test(body))

/** Does every way into `memberships` demand a provider-verified mailbox? */
const INSERT_NEEDS_EMAIL_PROVIDER =
  MEMBERSHIP_INSERT_POLICIES.length > 0
  && MEMBERSHIP_INSERT_POLICIES.every((body) => /'providers'\s*\?\s*'email'/.test(body))

function cellsFor(id: DoorId): Readonly<Record<ConsequenceId, Answer>> {
  const row = doorRow(id)
  if (row === undefined) throw new Error(`no row for door ${id}`)
  return row.cells
}

describe('§15.5.2 — the table is one constant', () => {
  it('has the four doors of §15.5.1, in ascending order of cost', () => {
    expect(DOOR_ROWS.map((row) => row.id)).toEqual(['none', 'alias', 'emailLink', 'github'])
  })

  it('has six consequences, each id used once', () => {
    const ids = DOOR_CONSEQUENCES.map((column) => column.id)
    expect(ids).toHaveLength(6)
    expect(new Set(ids).size).toBe(6)
  })

  it('gives every column a heading and a fuller question', () => {
    for (const column of DOOR_CONSEQUENCES) {
      expect(column.heading.length, column.id).toBeGreaterThan(0)
      expect(column.question.endsWith('?'), column.id).toBe(true)
    }
  })

  it('answers every column on every row, and nowhere else', () => {
    const ids = DOOR_CONSEQUENCES.map((column) => column.id).sort()
    for (const row of DOOR_ROWS) {
      expect(Object.keys(row.cells).sort(), row.id).toEqual(ids)
    }
  })

  it('takes every cell from the union, so a renderer cannot invent one', () => {
    for (const row of DOOR_ROWS) {
      for (const [column, answer] of Object.entries(row.cells)) {
        expect(ANSWERS, `${row.id}.${column}`).toContain(answer)
      }
    }
  })

  it('has a word for every answer, so a tint is never the only signal', () => {
    for (const answer of ANSWERS) expect(ANSWER_WORDS[answer]).toMatch(/[A-Za-z]/)
    expect(Object.keys(ANSWER_WORDS).sort()).toEqual([...ANSWERS].sort())
  })

  it('is frozen, so a page cannot edit the shared table while rendering it', () => {
    expect(Object.isFrozen(DOOR_ROWS)).toBe(true)
    expect(DOOR_ROWS.every((row) => Object.isFrozen(row) && Object.isFrozen(row.cells))).toBe(true)
    expect(Object.isFrozen(DOOR_CONSEQUENCES)).toBe(true)
    expect(Object.isFrozen(ANSWER_WORDS)).toBe(true)
  })

  it('finds a row by id and nothing by an unknown one', () => {
    expect(doorRow('alias')?.label).toBe('Alias')
    expect(doorRow('nope' as DoorId)).toBeUndefined()
  })
})

describe('§15.5.2 — the claims themselves', () => {
  it('keeps the record in this browser under all four doors (§14.7.3)', () => {
    for (const row of DOOR_ROWS) expect(row.cells.keptInThisBrowser, row.id).toBe('yes')
  })

  it('claims nothing beyond this browser for an alias (§15.4)', () => {
    const alias = cellsFor('alias')
    expect(alias.survivesThisBrowser).toBe('no')
    expect(alias.managersCanRead).toBe('no')
    expect(alias.verifiedSubmittal).toBe('no')
    expect(alias.joinByDomain).toBe('no')
    expect(alias.needsProvenMailbox).toBe('no')
  })

  it('reads the same as no name at all, which is what an alias costs and buys', () => {
    expect(cellsFor('alias')).toEqual(cellsFor('none'))
  })

  it('puts a copy off this browser only behind an account (§14.7.3, 0002)', () => {
    for (const row of DOOR_ROWS) {
      const expected = ACCOUNT_DOORS.includes(row.id) ? 'yes' : 'no'
      expect(row.cells.survivesThisBrowser, row.id).toBe(expected)
    }
  })

  it('scopes a manager read to the reader own organisations (0002), never yes or no', () => {
    for (const row of DOOR_ROWS) {
      const expected = ACCOUNT_DOORS.includes(row.id) ? 'in-your-orgs' : 'no'
      expect(row.cells.managersCanRead, row.id).toBe(expected)
    }
  })

  it('says verified exactly where classifySubmittals returns verified (§14.8.2)', () => {
    const sheet = sheetOwnedBy('cevheri')

    // The measurement behind the email row's `no`: the same sheet, the same
    // owner, and the only difference is whether a GitHub identity put a login
    // on the profile row.
    expect(classifySubmittals(sheet, null)).toBe('unattributable')
    expect(classifySubmittals(sheet, 'cevheri')).toBe('verified')

    for (const row of DOOR_ROWS) {
      const evidence = classifySubmittals(sheet, GITHUB_LOGIN[row.id])
      expect(row.cells.verifiedSubmittal, `${row.id} → ${evidence}`)
        .toBe(evidence === 'verified' ? 'yes' : 'no')
    }
  })

  it('guards both memberships insert policies with providers ? email (0005)', () => {
    expect(MEMBERSHIP_INSERT_POLICIES).toHaveLength(2)
    for (const body of MEMBERSHIP_INSERT_POLICIES) {
      expect(body).toMatch(/'providers'\s*\?\s*'email'/)
    }
    expect(INSERT_NEEDS_EMAIL_PROVIDER).toBe(true)
  })

  it('joins by domain exactly where 0005 would let the door insert (§14.14.5)', () => {
    for (const row of DOOR_ROWS) {
      const providers = PROVIDERS[row.id]
      const canInsert =
        providers.length > 0 && (!INSERT_NEEDS_EMAIL_PROVIDER || providers.includes('email'))
      expect(row.cells.joinByDomain, row.id).toBe(canInsert ? 'yes' : 'no')
      // The same clause read as a price rather than a capability, which is why
      // the two columns cannot disagree.
      expect(row.cells.needsProvenMailbox, row.id).toBe(row.cells.joinByDomain)
    }
  })
})

describe('§12.2 — the module stays reachable from a client island', () => {
  const source = readFileSync(
    path.resolve(process.cwd(), 'src/lib/auth/doors.ts'),
    'utf8',
  )

  it('imports nothing at all, so neither node:fs nor the corpus can arrive', () => {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/^\s*import\b/m)
    expect(code).not.toMatch(/\brequire\(/)
  })
})
