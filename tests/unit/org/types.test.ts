import { describe, expect, it } from 'vitest'
import {
  assembleTeam,
  assignedSheetsFor,
  attentionReason,
  classifyQuiz,
  classifySubmittals,
  dueInstant,
  evidenceSummary,
  latestSignOff,
  memberLabel,
  panelStateCopy,
  sheetClaimRows,
  sheetLogsByUser,
  validateAssignment,
  MAX_ASSIGNMENT_TITLE,
  type Assignment,
  type AssignmentDraft,
  type LearnerEventRow,
  type OrgProfile,
  type TeamMember,
  type TeamRecord,
} from '@/lib/org/types'
import type { CurriculumFacts } from '@/lib/record/derive'
import {
  EMPTY_RECORD,
  emptySheetRecord,
  type RecordData,
  type SheetRecord,
  type Submittal,
} from '@/lib/record/schema'
import type { AttentionFlag } from '@/lib/record/wire'

/**
 * §14.8's decisions, every one of them at a boundary.
 *
 * Nothing here reads a clock and nothing here touches a DOM: §12.14.2's rule is
 * that anything which DECIDES something is testable in node, and the whole
 * reason `types.ts` exists apart from `queries.ts` is that every decision the
 * manager's panel makes lives in the former. A test that needed a browser would
 * mean a decision had leaked into a component.
 *
 * Two properties are worth more than the rest and are tested hardest:
 *
 * 1. **Claim and evidence never collapse into one verdict** (§14.8.2). A signed
 *    sheet with a missed quiz and a mismatched owner still reports the
 *    sign-off — the panel prints the disagreement, it does not resolve it.
 * 2. **No count here answers a question `derive.ts` answers** (§14.9). Hence
 *    `latestSignOff` returning an instant and not a tally, which the test below
 *    pins explicitly so a future "helpful" addition of `{ count }` fails.
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function record(sheets: Record<string, SheetRecord>): RecordData {
  return { ...EMPTY_RECORD, sheets }
}

function sheet(overrides: Partial<SheetRecord> = {}): SheetRecord {
  return { ...emptySheetRecord(), ...overrides }
}

function submittal(owner: string): Submittal {
  return {
    owner,
    repo: 'work',
    url: `https://github.com/${owner}/work`,
    commit: null,
    note: '',
    at: '2026-08-01T00:00:00.000Z',
  }
}

/** Two sheets, numbered, so ordering is observable. */
const FACTS: CurriculumFacts = {
  sheets: [
    {
      slug: 'fundamentals/llms',
      module: 1,
      category: 'fundamentals',
      drawn: true,
      hasQuickCheck: true,
      checklistItems: 0,
      sources: 3,
    },
    {
      slug: 'protocols/mcp',
      module: 7,
      category: 'protocols',
      drawn: true,
      hasQuickCheck: true,
      checklistItems: 0,
      sources: 4,
    },
  ],
  categories: [
    { slug: 'fundamentals', total: 1 },
    { slug: 'protocols', total: 1 },
  ],
  traces: 0,
}

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    userId: '00000000-0000-4000-8000-000000000001',
    orgIds: ['org-a'],
    profile: null,
    record: { kind: 'absent' },
    logs: {},
    ...overrides,
  }
}

/** §14.2.2's readable state, which is what `memberLabel` may read a name out of. */
function readable(identity: Partial<RecordData['identity']> = {}): TeamRecord {
  return {
    kind: 'record',
    schema: 1,
    data: { ...EMPTY_RECORD, identity: { ...EMPTY_RECORD.identity, ...identity } },
    savedAt: '',
    storedProgress: null,
    curriculumRev: null,
  }
}

function profile(overrides: Partial<OrgProfile> = {}): OrgProfile {
  return {
    userId: '00000000-0000-4000-8000-000000000001',
    displayName: null,
    githubLogin: null,
    roleId: null,
    ...overrides,
  }
}

function assignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1',
    orgId: 'org-a',
    title: 'Read the protocol sheets',
    note: null,
    dueAt: '2026-09-01T00:00:00.000Z',
    createdAt: null,
    sheets: ['protocols/mcp'],
    targets: [],
    ...overrides,
  }
}

function draft(overrides: Partial<AssignmentDraft> = {}): AssignmentDraft {
  return {
    orgId: 'org-a',
    title: 'Read the protocol sheets',
    note: '',
    dueDate: '2026-09-01',
    sheets: ['protocols/mcp'],
    targets: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// §14.8.2 — the quiz half of the evidence column
// ---------------------------------------------------------------------------

describe('classifyQuiz', () => {
  it('separates the three outcomes from the absence of one', () => {
    expect(classifyQuiz(undefined)).toBe('none')
    expect(classifyQuiz(sheet())).toBe('none')
    expect(
      classifyQuiz(sheet({ quiz: { answer: 'a', assessed: 'matched', at: 'x' } })),
    ).toBe('matched')
    expect(
      classifyQuiz(sheet({ quiz: { answer: 'a', assessed: 'missed', at: 'x' } })),
    ).toBe('missed')
    // §12.6 — an answer written and never checked is its own state. Folding it
    // into `missed` would report a failure nobody declared.
    expect(classifyQuiz(sheet({ quiz: { answer: 'a', assessed: null, at: 'x' } }))).toBe(
      'unassessed',
    )
  })
})

// ---------------------------------------------------------------------------
// §14.8.2 — the submittal half, which is the only externally checkable thing
// ---------------------------------------------------------------------------

describe('classifySubmittals', () => {
  it('verifies an owner that matches the login the user cannot write', () => {
    expect(classifySubmittals(sheet({ submittals: [submittal('cevheri')] }), 'cevheri')).toBe(
      'verified',
    )
  })

  it('is case-insensitive, because a GitHub login is', () => {
    expect(classifySubmittals(sheet({ submittals: [submittal('Cevheri')] }), 'cevheri')).toBe(
      'verified',
    )
  })

  it('marks §14.8.2\'s own example — Linux presented as your own work', () => {
    expect(classifySubmittals(sheet({ submittals: [submittal('torvalds')] }), 'cevheri')).toBe(
      'ownerMismatch',
    )
  })

  it('lets one mismatch outweigh any number of matches', () => {
    const sheets = sheet({ submittals: [submittal('cevheri'), submittal('torvalds')] })
    expect(classifySubmittals(sheets, 'cevheri')).toBe('ownerMismatch')
  })

  it('will not call an unverifiable submittal a mismatch', () => {
    // The gap in §14.8.2: a reader who signed in with a magic link has no
    // `github_login`, and reporting `⚠ not the owner` on that basis would be an
    // accusation manufactured out of a missing field.
    const sheets = sheet({ submittals: [submittal('cevheri')] })
    expect(classifySubmittals(sheets, null)).toBe('unattributable')
    expect(classifySubmittals(sheets, '   ')).toBe('unattributable')
  })

  it('reports no submittal as none, whatever the login says', () => {
    expect(classifySubmittals(sheet(), 'cevheri')).toBe('none')
    expect(classifySubmittals(sheet(), null)).toBe('none')
    expect(classifySubmittals(undefined, null)).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// §14.8.2 — the two columns, per sheet
// ---------------------------------------------------------------------------

describe('sheetClaimRows', () => {
  it('lists only signed-off sheets, because evidence corroborates a claim', () => {
    const data = record({
      'fundamentals/llms': sheet({ signedOff: '2026-08-12T00:00:00.000Z' }),
      'protocols/mcp': sheet({ reachedEnd: true, dwellSeconds: 600 }),
    })
    expect(sheetClaimRows(data, FACTS, null).map((row) => row.slug)).toEqual([
      'fundamentals/llms',
    ])
  })

  it('keeps the claim even when both pieces of evidence contradict it', () => {
    const data = record({
      'fundamentals/llms': sheet({
        signedOff: '2026-08-12T00:00:00.000Z',
        signedRevision: 'abc1234',
        quiz: { answer: 'a', assessed: 'missed', at: 'x' },
        submittals: [submittal('torvalds')],
      }),
    })
    const [row] = sheetClaimRows(data, FACTS, 'cevheri')
    // The whole of §14.8.2 in one assertion: the sign-off is reported, the
    // evidence is reported, and nothing merged them into a verdict.
    expect(row).toMatchObject({
      signedOff: '2026-08-12T00:00:00.000Z',
      signedRevision: 'abc1234',
      quiz: 'missed',
      submittal: 'ownerMismatch',
      submittalOwners: ['torvalds'],
      inCurriculum: true,
    })
  })

  it('orders by module and keeps a sign-off the corpus no longer carries', () => {
    const data = record({
      'protocols/mcp': sheet({ signedOff: '2026-08-01T00:00:00.000Z' }),
      'withdrawn/sheet': sheet({ signedOff: '2026-08-02T00:00:00.000Z' }),
      'fundamentals/llms': sheet({ signedOff: '2026-08-03T00:00:00.000Z' }),
    })
    const rows = sheetClaimRows(data, FACTS, null)
    // Numbered sheets in number order; the orphan last, listed rather than
    // dropped — the reader asserted it, and omitting it would make the panel's
    // list disagree with their own.
    expect(rows.map((row) => row.slug)).toEqual([
      'fundamentals/llms',
      'protocols/mcp',
      'withdrawn/sheet',
    ])
    expect(rows.map((row) => row.inCurriculum)).toEqual([true, true, false])
    expect(rows[2]?.module).toBeNull()
  })
})

describe('evidenceSummary', () => {
  it('counts the rows it is given and nothing else', () => {
    const data = record({
      'fundamentals/llms': sheet({
        signedOff: '2026-08-12T00:00:00.000Z',
        quiz: { answer: 'a', assessed: 'matched', at: 'x' },
        submittals: [submittal('cevheri')],
      }),
      'protocols/mcp': sheet({
        signedOff: '2026-08-13T00:00:00.000Z',
        submittals: [submittal('torvalds')],
      }),
    })
    const summary = evidenceSummary(sheetClaimRows(data, FACTS, 'cevheri'))
    expect(summary).toEqual({
      quizMatched: 1,
      quizMissed: 0,
      quizUnassessed: 0,
      quizNone: 1,
      submittalVerified: 1,
      submittalMismatch: 1,
      submittalUnattributable: 0,
      submittalNone: 0,
    })
  })

  it('is zero across the board for an empty list', () => {
    const summary = evidenceSummary([])
    expect(Object.values(summary).every((value) => value === 0)).toBe(true)
  })
})

describe('latestSignOff', () => {
  it('returns an instant and never a count (§14.9)', () => {
    const data = record({
      'fundamentals/llms': sheet({ signedOff: '2026-08-12T00:00:00.000Z' }),
      'protocols/mcp': sheet({ signedOff: '2026-09-03T00:00:00.000Z' }),
      'other/sheet': sheet(),
    })
    const result = latestSignOff(data)
    expect(result).toBe('2026-09-03T00:00:00.000Z')
    // Pinned deliberately: adding a tally here would be a second
    // implementation of `signedCount`, which is exactly the drift §14.9 exists
    // to prevent.
    expect(typeof result).toBe('string')
  })

  it('is null when nothing is signed off', () => {
    expect(latestSignOff(EMPTY_RECORD)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// §14.8.1 — feeding the one attention definition
// ---------------------------------------------------------------------------

describe('sheetLogsByUser', () => {
  const events: LearnerEventRow[] = [
    { userId: 'u1', kind: 'setQuizAnswer', sheetSlug: 's1', at: '2026-08-01T00:00:00.000Z' },
    { userId: 'u1', kind: 'setQuizAnswer', sheetSlug: 's1', at: '2026-08-03T00:00:00.000Z' },
    { userId: 'u1', kind: 'assessQuiz', sheetSlug: 's1', at: '2026-08-04T00:00:00.000Z' },
    { userId: 'u1', kind: 'setQuizAnswer', sheetSlug: 's2', at: '2026-08-05T00:00:00.000Z' },
    { userId: 'u2', kind: 'signOff', sheetSlug: 's1', at: '2026-08-09T00:00:00.000Z' },
    // Per-person events carry no sheet and must not keep a sheet looking fresh.
    { userId: 'u1', kind: 'setIdentity', sheetSlug: null, at: '2026-08-30T00:00:00.000Z' },
  ]

  it('counts only setQuizAnswer as an attempt', () => {
    expect(sheetLogsByUser(events).get('u1')?.s1?.attempts).toBe(2)
  })

  it('takes the last write against a sheet, whatever wrote it', () => {
    // `assessQuiz` is later than either attempt and is the last touch.
    expect(sheetLogsByUser(events).get('u1')?.s1?.lastTouchedAt).toBe(
      '2026-08-04T00:00:00.000Z',
    )
  })

  it('keeps users apart', () => {
    const logs = sheetLogsByUser(events)
    expect(logs.get('u2')?.s1).toEqual({
      attempts: 0,
      lastTouchedAt: '2026-08-09T00:00:00.000Z',
    })
    expect(logs.get('u1')?.s2?.attempts).toBe(1)
  })

  it('drops rows with no sheet and rows with an unparseable instant', () => {
    const logs = sheetLogsByUser([
      ...events,
      { userId: 'u1', kind: 'signOff', sheetSlug: 's3', at: 'not a date' },
    ])
    expect(logs.get('u1')?.s3).toBeUndefined()
    // The identity event above must not have created a sheet entry either.
    expect(Object.keys(logs.get('u1') ?? {}).sort()).toEqual(['s1', 's2'])
  })

  it('does not let a __proto__ slug become a prototype write', () => {
    const logs = sheetLogsByUser([
      { userId: 'u1', kind: 'signOff', sheetSlug: '__proto__', at: '2026-08-01T00:00:00.000Z' },
    ])
    const perUser = logs.get('u1')
    expect(perUser?.__proto__).toEqual({
      attempts: 0,
      lastTouchedAt: '2026-08-01T00:00:00.000Z',
    })
    expect(Object.getPrototypeOf({})).toBe(Object.prototype)
  })
})

describe('attentionReason', () => {
  const flag = (overrides: Partial<AttentionFlag>): AttentionFlag => ({
    sheetSlug: 'protocols/mcp',
    why: 'stalled',
    idleDays: 21,
    attempts: 0,
    dueAt: null,
    ...overrides,
  })

  it('never renders a flag without its measurement', () => {
    expect(attentionReason(flag({}))).toBe(
      'OPENED, NOT SIGNED OFF · protocols/mcp · 21 DAYS IDLE',
    )
    expect(attentionReason(flag({ why: 'quizFailing', attempts: 3 }))).toBe(
      'QUIZ MISSED · protocols/mcp · 3 ATTEMPTS',
    )
    expect(
      attentionReason(flag({ why: 'overdue', dueAt: '2026-09-01T00:00:00.000Z' })),
    ).toBe('OVERDUE · protocols/mcp · DUE 2026-09-01')
  })

  it('degrades to a weaker statement rather than printing a missing value', () => {
    expect(attentionReason(flag({ idleDays: null }))).toBe(
      'OPENED, NOT SIGNED OFF · protocols/mcp',
    )
    expect(attentionReason(flag({ why: 'overdue', dueAt: null }))).toBe(
      'OVERDUE · protocols/mcp',
    )
  })
})

// ---------------------------------------------------------------------------
// §14.2.4 — scope
// ---------------------------------------------------------------------------

describe('assignedSheetsFor', () => {
  it('treats an empty target set as the whole organisation', () => {
    expect(assignedSheetsFor([assignment()], 'anyone', ['org-a'])).toEqual([
      { sheetSlug: 'protocols/mcp', dueAt: '2026-09-01T00:00:00.000Z' },
    ])
  })

  it('limits a targeted assignment to the accounts named', () => {
    const one = assignment({ targets: ['u1'] })
    expect(assignedSheetsFor([one], 'u1', ['org-a'])).toHaveLength(1)
    expect(assignedSheetsFor([one], 'u2', ['org-a'])).toEqual([])
  })

  it('reaches nobody outside the org they are a member of', () => {
    expect(assignedSheetsFor([assignment()], 'u1', ['org-b'])).toEqual([])
  })

  it('emits a duplicate rather than resolving two deadlines itself', () => {
    // §14.8.1 already decides that the earliest deadline wins; picking one here
    // would be a second implementation of that rule.
    const rows = assignedSheetsFor(
      [assignment(), assignment({ id: 'a2', dueAt: '2026-08-01T00:00:00.000Z' })],
      'u1',
      ['org-a'],
    )
    expect(rows.map((row) => row.dueAt)).toEqual([
      '2026-09-01T00:00:00.000Z',
      '2026-08-01T00:00:00.000Z',
    ])
  })
})

// ---------------------------------------------------------------------------
// The join
// ---------------------------------------------------------------------------

describe('assembleTeam', () => {
  const readable: TeamRecord = {
    kind: 'record',
    schema: 1,
    data: EMPTY_RECORD,
    savedAt: '2026-08-30T00:00:00.000Z',
    storedProgress: null,
    curriculumRev: null,
  }

  it('drives off memberships, so a member who never pushed still has a row', () => {
    const team = assembleTeam({
      memberships: [
        { orgId: 'org-a', userId: 'u1', joinedAt: null },
        { orgId: 'org-a', userId: 'u2', joinedAt: null },
      ],
      profiles: [profile({ userId: 'u1', displayName: 'Ada' })],
      records: new Map([['u1', readable]]),
      logs: new Map(),
    })
    expect(team).toHaveLength(2)
    expect(team.find((entry) => entry.userId === 'u2')?.record.kind).toBe('absent')
  })

  it('keeps a person whose profile row is missing', () => {
    const team = assembleTeam({
      memberships: [{ orgId: 'org-a', userId: 'u2', joinedAt: null }],
      profiles: [],
      records: new Map(),
      logs: new Map(),
    })
    expect(team[0]?.profile).toBeNull()
  })

  it('collects every managed org a person belongs to (§14.3)', () => {
    const team = assembleTeam({
      memberships: [
        { orgId: 'org-a', userId: 'u1', joinedAt: null },
        { orgId: 'org-b', userId: 'u1', joinedAt: null },
        { orgId: 'org-a', userId: 'u1', joinedAt: null },
      ],
      profiles: [],
      records: new Map(),
      logs: new Map(),
    })
    expect(team).toHaveLength(1)
    expect(team[0]?.orgIds).toEqual(['org-a', 'org-b'])
  })

  it('is ordered by label, so the roster does not reshuffle between loads', () => {
    const team = assembleTeam({
      memberships: [
        { orgId: 'org-a', userId: 'u1', joinedAt: null },
        { orgId: 'org-a', userId: 'u2', joinedAt: null },
      ],
      profiles: [
        profile({ userId: 'u1', displayName: 'Zoe' }),
        profile({ userId: 'u2', displayName: 'Ada' }),
      ],
      records: new Map(),
      logs: new Map(),
    })
    expect(team.map((entry) => entry.profile?.displayName)).toEqual(['Ada', 'Zoe'])
  })
})

describe('memberLabel', () => {
  it('prefers the name, then the login, then a uuid fragment', () => {
    expect(memberLabel(member({ profile: profile({ displayName: 'Ada' }) }))).toBe('Ada')
    expect(
      memberLabel(member({ profile: profile({ displayName: '  ', githubLogin: 'ada' }) })),
    ).toBe('ada')
    expect(memberLabel(member())).toBe('USER 00000000')
  })

  it('falls back to the record snapshot rather than printing a uuid it need not', () => {
    // Until §14.2.1's row had a writer this was the NORMAL case, not the edge
    // one: no `profiles` row existed for anybody, so every member of every org
    // rendered as `USER 1a2b3c4d` while the panel held their name.
    expect(memberLabel(member({ record: readable({ name: 'Grace Hopper' }) }))).toBe(
      'Grace Hopper',
    )
    expect(
      memberLabel(
        member({
          profile: profile({ githubLogin: 'ada' }),
          record: readable({ name: 'Ada Lovelace' }),
        }),
      ),
    ).toBe('Ada Lovelace')
  })

  it('keeps the profile name first, since it is the value last pushed', () => {
    expect(
      memberLabel(
        member({ profile: profile({ displayName: 'Ada' }), record: readable({ name: 'Stale' }) }),
      ),
    ).toBe('Ada')
  })

  it('reads no identity out of an absent or quarantined record (§14.2.2, §11.25)', () => {
    expect(memberLabel(member({ record: { kind: 'absent' } }))).toBe('USER 00000000')
    expect(memberLabel(member({ record: { kind: 'unreadable', reason: 'schema 99' } }))).toBe(
      'USER 00000000',
    )
    // A whitespace-only name is not a name.
    expect(memberLabel(member({ record: readable({ name: '   ' }) }))).toBe('USER 00000000')
  })
})

// ---------------------------------------------------------------------------
// §14.2.4 — validating a draft
// ---------------------------------------------------------------------------

describe('validateAssignment', () => {
  it('accepts the org-wide assignment, which is the default scope', () => {
    expect(validateAssignment(draft({ targets: [] }))).toEqual([])
  })

  it('accepts an assignment with no deadline', () => {
    expect(validateAssignment(draft({ dueDate: '' }))).toEqual([])
  })

  it('refuses an assignment with nothing to do', () => {
    expect(validateAssignment(draft({ sheets: [] }))).toEqual(['noSheets'])
  })

  it('refuses a blank title and an over-long one', () => {
    expect(validateAssignment(draft({ title: '   ' }))).toEqual(['noTitle'])
    expect(validateAssignment(draft({ title: 'x'.repeat(MAX_ASSIGNMENT_TITLE + 1) }))).toEqual([
      'longTitle',
    ])
  })

  it('refuses a date that is not a date, and allows one in the past', () => {
    expect(validateAssignment(draft({ dueDate: '2026-02-31' }))).toEqual(['badDueDate'])
    expect(validateAssignment(draft({ dueDate: 'next tuesday' }))).toEqual(['badDueDate'])
    // A manager recording an assignment after the fact is a real thing to do,
    // and `selectAttention` will correctly flag it overdue at once.
    expect(validateAssignment(draft({ dueDate: '2020-01-01' }))).toEqual([])
  })

  it('reports every problem at once, so the form can mark each field', () => {
    expect(validateAssignment(draft({ orgId: '', title: '', sheets: [] })).sort()).toEqual([
      'noOrg',
      'noSheets',
      'noTitle',
    ])
  })
})

describe('dueInstant', () => {
  it('is the start of the day, in UTC', () => {
    expect(dueInstant('2026-09-01')).toBe('2026-09-01T00:00:00.000Z')
  })

  it('rejects a date Date.parse would silently roll forward', () => {
    expect(dueInstant('2026-02-31')).toBeNull()
    expect(dueInstant('2026-13-01')).toBeNull()
    expect(dueInstant('')).toBeNull()
    expect(dueInstant('2026-9-1')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// §1, §11.25 — the states that are not a table
// ---------------------------------------------------------------------------

describe('panelStateCopy', () => {
  it('says nothing is stated while the query is in flight', () => {
    expect(panelStateCopy({ kind: 'loading' })?.status).toBe('QUERY IN FLIGHT')
  })

  it('tells a non-manager they are not a manager, not that the org is empty', () => {
    const copy = panelStateCopy({ kind: 'notManager' })
    expect(copy?.status).toBe('NOT A MANAGER')
    expect(copy?.detail).toContain('not a manager of an organisation')
  })

  it('distinguishes the four reasons a build has no backend', () => {
    const reasons = (['flagOff', 'missingUrl', 'missingKey', 'malformedUrl'] as const).map(
      (why) => panelStateCopy({ kind: 'unconfigured', why })?.detail,
    )
    expect(new Set(reasons).size).toBe(4)
  })

  it('keeps §12.14.1 out of the copy register', () => {
    const all = (
      [
        { kind: 'loading' },
        { kind: 'signedOut' },
        { kind: 'notManager' },
        { kind: 'unconfigured', why: 'flagOff' },
        { kind: 'failed', message: 'x' },
      ] as const
    ).map((state) => panelStateCopy(state))

    for (const copy of all) {
      const text = `${copy?.status ?? ''} ${copy?.detail ?? ''}`.toLowerCase()
      expect(text).not.toContain('!')
      for (const banned of ['please', 'sorry', 'just ', 'simply', 'easy']) {
        expect(text).not.toContain(banned)
      }
    }
  })
})
