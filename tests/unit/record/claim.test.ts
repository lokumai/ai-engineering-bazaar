/**
 * §14.7.4 / §14.12 — the claim, its arithmetic, and the one thing it promises.
 *
 * The promise is the last describe block: **no signature is lost in either
 * direction.** §14.7.2 makes that a property of the merge (earliest wins, so a
 * signature is monotone), and this file checks that the SUMMARY would notice if
 * it stopped being true — a `nothing was deleted` line that cannot fail is not
 * evidence of anything.
 */

import { describe, expect, it } from 'vitest'
import {
  CLAIM_COPY,
  claimMerge,
  claimNeedsExport,
  claimSummaryLines,
  claimSummarySentence,
  decideClaim,
  summariseClaim,
} from '@/lib/record/claim'
import {
  EMPTY_RECORD,
  MAX_SUBMITTALS,
  emptySheetRecord,
  type RecordData,
  type SheetRecord,
  type Submittal,
} from '@/lib/record/schema'

/** Deep-frozen, so an in-place write throws instead of passing quietly. */
function frozen<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) frozen(inner)
    Object.freeze(value)
  }
  return value
}

function record(patch: Partial<RecordData> = {}): RecordData {
  return frozen(structuredClone({ ...EMPTY_RECORD, ...patch }))
}

function sheet(patch: Partial<SheetRecord> = {}): SheetRecord {
  return { ...emptySheetRecord(), ...patch }
}

function submittal(patch: Partial<Submittal> = {}): Submittal {
  const owner = patch.owner ?? 'cevheri'
  const repo = patch.repo ?? 'demo'
  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
    commit: null,
    note: '',
    at: '2026-08-01T00:00:00.000Z',
    ...patch,
  }
}

const AT = '2026-08-01T10:00:00.000Z'

/** A record with `n` signed sheets named `s0…s(n-1)`, offset by `from`. */
function signedRun(from: number, to: number, at = AT): RecordData {
  const sheets: RecordData['sheets'] = {}
  for (let index = from; index < to; index += 1) {
    sheets[`fundamentals/s${index}`] = sheet({ signedOff: at })
  }
  return record({ sheets })
}

describe('no server row — the local envelope is what gets pushed (§14.7.4)', () => {
  it('returns the local record itself, identity-equal', () => {
    const local = signedRun(0, 3)
    const decision = decideClaim(local, null)
    expect(decision.record).toBe(local)
  })

  it('reports the adopted outcome and counts only this side', () => {
    const local = record({
      sheets: {
        a: sheet({ signedOff: AT, submittals: [submittal({ repo: 'one' })] }),
        b: sheet({ signedOff: AT }),
        c: sheet({ reachedEnd: true }),
      },
    })
    const { summary } = decideClaim(local, null)
    expect(summary.outcome).toBe('adopted')
    expect(summary.signed).toEqual({ here: 2, account: 0, shared: 0, merged: 2 })
    expect(summary.submittals).toEqual({ here: 1, account: 0, shared: 0, merged: 1 })
    expect(summary.droppedSignatures).toEqual([])
    expect(summary.droppedSubmittals).toEqual([])
  })

  it('says where the work went, and that nothing was deleted', () => {
    const { summary } = decideClaim(signedRun(0, 2), null)
    expect(claimSummaryLines(summary)).toEqual([
      '2 signed-off sheets and 0 submittals moved from this browser into your account.',
      CLAIM_COPY.nothingDeleted,
    ])
  })

  it('claims an empty record without inventing anything', () => {
    const { summary } = decideClaim(record(), null)
    expect(summary.signed.merged).toBe(0)
    expect(claimNeedsExport(summary)).toBe(false)
  })
})

describe('server row, disjoint work — both sides survive', () => {
  const local = signedRun(0, 3)
  const account = signedRun(10, 15)

  it('merges to the sum when nothing overlaps', () => {
    const { summary } = decideClaim(local, account)
    expect(summary.outcome).toBe('merged')
    expect(summary.signed).toEqual({ here: 3, account: 5, shared: 0, merged: 8 })
  })

  it('omits the "were in both" clause when there is no overlap', () => {
    const { summary } = decideClaim(local, account)
    expect(claimSummaryLines(summary)).toEqual([
      '3 signed-off sheets here, 5 in your account.',
      'Merged: 8 signed-off sheets.',
      CLAIM_COPY.nothingDeleted,
    ])
  })

  it('keeps every slug from both sides in the written record', () => {
    const { record: written } = decideClaim(local, account)
    for (const slug of [...Object.keys(local.sheets), ...Object.keys(account.sheets)]) {
      expect(written.sheets[slug]?.signedOff).toBe(AT)
    }
  })
})

describe('server row, overlapping work — the overlap is named, not lost', () => {
  it('counts the intersection once', () => {
    // 18 here, 12 in the account, 9 in both → 21 merged. §14.7.4's own example.
    const local = signedRun(0, 18)
    const account = signedRun(9, 21)
    const { summary } = decideClaim(local, account)
    expect(summary.signed).toEqual({ here: 18, account: 12, shared: 9, merged: 21 })
  })

  it('prints §14.7.4’s three lines with §14.7.4’s numbers', () => {
    const local = signedRun(0, 18)
    const account = signedRun(9, 21)
    // Submittals 4 + 2 → 6, on sheets that do not collide.
    const withSubmittals = record({
      sheets: {
        ...local.sheets,
        'fundamentals/p': sheet({ submittals: [submittal({ repo: 'a' }), submittal({ repo: 'b' })] }),
        'fundamentals/q': sheet({ submittals: [submittal({ repo: 'c' }), submittal({ repo: 'd' })] }),
      },
    })
    const accountWithSubmittals = record({
      sheets: {
        ...account.sheets,
        'fundamentals/r': sheet({ submittals: [submittal({ repo: 'e' }), submittal({ repo: 'f' })] }),
      },
    })

    const { summary } = decideClaim(withSubmittals, accountWithSubmittals)
    expect(summary.submittals).toEqual({ here: 4, account: 2, shared: 0, merged: 6 })
    expect(claimSummaryLines(summary)).toEqual([
      '18 signed-off sheets here, 12 in your account.',
      'Merged: 21 signed-off sheets. 9 were in both.',
      'Submittals: 4 + 2 → 6.',
      CLAIM_COPY.nothingDeleted,
    ])
  })

  it('names a submittal handed in on both devices rather than counting it twice', () => {
    const entry = submittal({ repo: 'same' })
    const local = record({ sheets: { a: sheet({ submittals: [entry] }) } })
    const account = record({ sheets: { a: sheet({ submittals: [entry] }) } })
    const { summary } = decideClaim(local, account)
    expect(summary.submittals).toEqual({ here: 1, account: 1, shared: 1, merged: 1 })
    expect(summary.droppedSubmittals).toEqual([])
    expect(claimSummaryLines(summary)).toContain('Submittals: 1 + 1 → 1. 1 was the same.')
  })

  it('reports what §12.9.1’s cap trims instead of claiming nothing was deleted', () => {
    const local = record({
      sheets: {
        a: sheet({
          submittals: [
            submittal({ repo: 'one', at: '2026-08-01T00:00:00.000Z' }),
            submittal({ repo: 'two', at: '2026-08-02T00:00:00.000Z' }),
          ],
        }),
      },
    })
    const account = record({
      sheets: {
        a: sheet({
          submittals: [
            submittal({ repo: 'three', at: '2026-08-03T00:00:00.000Z' }),
            submittal({ repo: 'four', at: '2026-08-04T00:00:00.000Z' }),
          ],
        }),
      },
    })
    const { record: written, summary } = decideClaim(local, account)
    expect(written.sheets.a.submittals).toHaveLength(MAX_SUBMITTALS)
    // The oldest goes, exactly as it would have been refused had it been handed
    // in fourth on one device.
    expect(summary.droppedSubmittals).toEqual(['a · cevheri/one'])
    expect(claimSummarySentence(summary)).not.toContain(CLAIM_COPY.nothingDeleted)
    expect(claimSummaryLines(summary)).toContain(
      '1 submittal was dropped: a sheet keeps its 3 most recent (a · cevheri/one).',
    )
    expect(claimNeedsExport(summary)).toBe(true)
  })
})

describe('the summary’s numbers, against a hand-computed expectation', () => {
  /**
   * Written out rather than generated, so the expectation is independent of the
   * code that produces it.
   *
   * Local:   x signed, y signed, z opened only.  Submittals: x/one, y/two.
   * Account: y signed (earlier), w signed.       Submittals: y/two, w/three.
   *
   * Signed here 2 · in the account 2 · in both 1 (y) · merged 3 (x, y, w).
   * Submittals here 2 · account 2 · the same 1 (y/two) · merged 3.
   */
  const local = record({
    sheets: {
      x: sheet({ signedOff: '2026-08-10T00:00:00.000Z', submittals: [submittal({ repo: 'one' })] }),
      y: sheet({ signedOff: '2026-08-11T00:00:00.000Z', submittals: [submittal({ repo: 'two' })] }),
      z: sheet({ reachedEnd: true }),
    },
  })
  const account = record({
    sheets: {
      y: sheet({ signedOff: '2026-08-02T00:00:00.000Z', submittals: [submittal({ repo: 'two' })] }),
      w: sheet({ signedOff: '2026-08-03T00:00:00.000Z', submittals: [submittal({ repo: 'three' })] }),
    },
  })

  const { record: written, summary } = decideClaim(local, account)

  it('counts signed sheets on both sides, the overlap, and the result', () => {
    expect(summary.signed).toEqual({ here: 2, account: 2, shared: 1, merged: 3 })
  })

  it('counts submittals the same way', () => {
    expect(summary.submittals).toEqual({ here: 2, account: 2, shared: 1, merged: 3 })
  })

  it('keeps the EARLIEST signature on the sheet both sides signed (§14.7.2)', () => {
    expect(written.sheets.y.signedOff).toBe('2026-08-02T00:00:00.000Z')
  })

  it('does not count a sheet that was only opened', () => {
    expect(summary.signed.here).toBe(2)
    expect(written.sheets.z.reachedEnd).toBe(true)
  })

  it('reads out as one sentence for a live region', () => {
    expect(claimSummarySentence(summary)).toBe(
      '2 signed-off sheets here, 2 in your account. '
      + 'Merged: 3 signed-off sheets. 1 was in both. '
      + 'Submittals: 2 + 2 → 3. 1 was the same. '
      + CLAIM_COPY.nothingDeleted,
    )
  })
})

describe('§14.7.2’s identity rows, which the merge table leaves incomplete', () => {
  const seedLocal = 'aaaaaaaa'
  const seedAccount = 'bbbbbbbb'

  it('gives markSeed to the account', () => {
    const local = record({ identity: { ...EMPTY_RECORD.identity, markSeed: seedLocal } })
    const account = record({ identity: { ...EMPTY_RECORD.identity, markSeed: seedAccount } })
    const merged = claimMerge(local, account)
    expect(merged.identity.markSeed).toBe(seedAccount)
  })

  it('says so, because the mark beside every existing signature changes', () => {
    const local = record({
      identity: { ...EMPTY_RECORD.identity, markSeed: seedLocal },
      sheets: { a: sheet({ signedOff: AT }) },
    })
    const account = record({ identity: { ...EMPTY_RECORD.identity, markSeed: seedAccount } })
    const { summary } = decideClaim(local, account)
    expect(summary.identity.markSeed).toBe('account')
    expect(summary.identity.markChanged).toBe(true)
    expect(claimSummarySentence(summary)).toContain(
      'The mark drawn beside your signatures',
    )
  })

  it('says nothing about a mark this browser never had', () => {
    const local = record({ sheets: { a: sheet({ signedOff: AT }) } })
    const account = record({ identity: { ...EMPTY_RECORD.identity, markSeed: seedAccount } })
    const { summary } = decideClaim(local, account)
    expect(summary.identity.markChanged).toBe(false)
  })

  it('carries the local seed up when the account has none', () => {
    const local = record({ identity: { ...EMPTY_RECORD.identity, markSeed: seedLocal } })
    const merged = claimMerge(local, record())
    expect(merged.identity.markSeed).toBe(seedLocal)
    expect(summariseClaim(local, record(), merged).identity.markChanged).toBe(false)
  })

  it('treats a BLANK account name as absent, which `??` does not', () => {
    const local = record({ identity: { ...EMPTY_RECORD.identity, name: 'Cevheri' } })
    const account = record({ identity: { ...EMPTY_RECORD.identity, name: '   ' } })
    expect(claimMerge(local, account).identity.name).toBe('Cevheri')
  })

  it('gives a real account name precedence over the local one, and says so', () => {
    const local = record({ identity: { ...EMPTY_RECORD.identity, name: 'On this device' } })
    const account = record({ identity: { ...EMPTY_RECORD.identity, name: 'On the account' } })
    const { record: written, summary } = decideClaim(local, account)
    expect(written.identity.name).toBe('On the account')
    expect(summary.identity.name).toBe('account')
    expect(claimSummarySentence(summary)).toContain('The name on the record is the one your account holds.')
  })

  it('carries the local role up when the account has not said (§13.3)', () => {
    const local = record({ identity: { ...EMPTY_RECORD.identity, role: 'devops' } })
    const { record: written, summary } = decideClaim(local, record())
    expect(written.identity.role).toBe('devops')
    expect(summary.identity.role).toBe('local')
  })

  it('never mentions identity on the adopted branch — nothing met anything', () => {
    const local = record({
      identity: { ...EMPTY_RECORD.identity, name: 'Cevheri', markSeed: seedLocal, role: 'devops' },
    })
    const { summary } = decideClaim(local, null)
    expect(summary.identity.markChanged).toBe(false)
    expect(claimSummarySentence(summary)).not.toContain('your account holds')
  })
})

describe('no signed-off sheet is lost in either direction', () => {
  /** Every signed slug on either side is still signed after the claim. */
  function survives(local: RecordData, account: RecordData | null): boolean {
    const { record: written, summary } = decideClaim(local, account)
    const before = new Set([
      ...Object.entries(local.sheets).filter(([, s]) => s.signedOff !== null).map(([k]) => k),
      ...Object.entries(account?.sheets ?? {})
        .filter(([, s]) => s.signedOff !== null)
        .map(([k]) => k),
    ])
    const kept = [...before].every((slug) => written.sheets[slug]?.signedOff !== null)
    // The summary has to agree with the record, or the reader is being told
    // about a different claim than the one that happened.
    expect(summary.droppedSignatures.length === 0).toBe(kept)
    return kept
  }

  it('holds with work only on this device', () => {
    expect(survives(signedRun(0, 5), record())).toBe(true)
  })

  it('holds with work only in the account', () => {
    expect(survives(record(), signedRun(0, 5))).toBe(true)
  })

  it('holds with a partial overlap, whichever side is called local', () => {
    const a = signedRun(0, 6, '2026-08-01T00:00:00.000Z')
    const b = signedRun(4, 10, '2026-07-01T00:00:00.000Z')
    expect(survives(a, b)).toBe(true)
    expect(survives(b, a)).toBe(true)
  })

  it('holds when one side UNSIGNED a sheet the other still holds (§14.7.2)', () => {
    // The un-sign does not survive the merge, and that is the documented
    // direction: an un-sign is one click to repeat, a silently un-signed sheet
    // is a lie. The claim must not report it as a deletion either.
    const local = record({ sheets: { a: sheet({ reachedEnd: true }) } })
    const account = record({ sheets: { a: sheet({ signedOff: AT }) } })
    const { record: written, summary } = decideClaim(local, account)
    expect(written.sheets.a.signedOff).toBe(AT)
    expect(summary.droppedSignatures).toEqual([])
    expect(summary.signed).toEqual({ here: 0, account: 1, shared: 0, merged: 1 })
  })

  it('holds for a slug the current curriculum no longer contains', () => {
    // A renamed category (§12.1.3) is exactly the case `derive.ts`'s
    // facts-driven count cannot see, and the claim must still vouch for it.
    const local = record({ sheets: { 'retired/old-name': sheet({ signedOff: AT }) } })
    const { record: written, summary } = decideClaim(local, signedRun(0, 2))
    expect(written.sheets['retired/old-name'].signedOff).toBe(AT)
    expect(summary.signed.merged).toBe(3)
    expect(summary.droppedSignatures).toEqual([])
  })

  it('mutates neither input', () => {
    // Both are deep-frozen by `record`, so a write would have thrown; this
    // states the intent so a later change cannot quietly drop the freeze.
    const local = signedRun(0, 3)
    const account = signedRun(2, 5)
    decideClaim(local, account)
    expect(Object.keys(local.sheets)).toHaveLength(3)
    expect(Object.keys(account.sheets)).toHaveLength(3)
  })
})

describe('§17.3 — the identity lines report a change, never a provenance', () => {
  it('says nothing about a name both sides already agreed on', () => {
    const both = record({
      sheets: { a: sheet({ signedOff: AT }) },
      identity: { name: 'Ada Lovelace', markSeed: null, mark: null, role: 'qa' },
    })
    const lines = claimSummaryLines(summariseClaim(both, both, both))

    // MEASURED before this gate existed: this line printed on every page load,
    // for a name that had not moved.
    expect(lines.join(' ')).not.toContain('the one your account holds')
  })

  it('says it once when the account replaced this browser name', () => {
    const local = record({
      sheets: { a: sheet({ signedOff: AT }) },
      identity: { name: 'Ada L.', markSeed: null, mark: null, role: null },
    })
    const account = record({
      sheets: { a: sheet({ signedOff: AT }) },
      identity: { name: 'Ada Lovelace', markSeed: null, mark: null, role: null },
    })
    const lines = claimSummaryLines(summariseClaim(local, account, account))
    expect(lines).toContain('The name on the record is the one your account holds.')
  })
})
