/**
 * §17.2 / §17.6 — is a claim news, and how does its receipt read?
 *
 * The load-bearing case is `the steady state`: signing in once and then
 * reloading takes the `merged` branch on every document load with
 * `here == account == shared == merged`, and MEASURED, the shipped panel
 * reported that as news on every load. A rule that cannot fail on the steady
 * state is not a rule.
 */

import { describe, expect, it } from 'vitest'
import {
  CLAIM_COPY,
  claimIsNews,
  claimReceiptReading,
  summariseClaim,
  type ClaimSummary,
} from '@/lib/record/claim'
import {
  EMPTY_RECORD,
  emptySheetRecord,
  type RecordData,
  type SheetRecord,
} from '@/lib/record/schema'
import { coerceRecordData } from '@/lib/record/validate'

const AT = '2026-08-01T10:00:00.000Z'
const CLAIMED_AT = '2026-09-02T11:17:00.000Z'

function record(patch: Partial<RecordData> = {}): RecordData {
  return structuredClone({ ...EMPTY_RECORD, ...patch })
}

function sheet(patch: Partial<SheetRecord> = {}): SheetRecord {
  return { ...emptySheetRecord(), ...patch }
}

/** A record with `n` signed sheets named `s0…s(n-1)`, offset by `from`. */
function signedRun(from: number, to: number): RecordData {
  const sheets: RecordData['sheets'] = {}
  for (let index = from; index < to; index += 1) {
    sheets[`fundamentals/s${index}`] = sheet({ signedOff: AT })
  }
  return record({ sheets })
}

describe('claimIsNews (§17.2)', () => {
  it('THE STEADY STATE: a reload that moved nothing is not news', () => {
    // What every page load after the first sign-in computes: the local record
    // and the account's row are the same record.
    const both = signedRun(0, 2)
    const summary = summariseClaim(both, both, both)

    expect(summary.signed).toEqual({ here: 2, account: 2, shared: 2, merged: 2 })
    expect(claimIsNews(summary)).toBe(false)
  })

  it('the steady state is not news even when the account supplied the name', () => {
    // The defect this rule replaces: `sourceOf` reports the account as the
    // source whenever the merged value equals the account's, which is true on
    // every reload — so `identity.name === 'account'` cannot measure news.
    const named = record({
      sheets: { 'fundamentals/s0': sheet({ signedOff: AT }) },
      identity: { ...EMPTY_RECORD.identity, name: 'Ada Lovelace' },
    })
    const summary = summariseClaim(named, named, named)

    expect(summary.identity.name).toBe('account')
    expect(summary.identity.nameChanged).toBe(false)
    expect(claimIsNews(summary)).toBe(false)
  })

  it('an empty account row taking this browser record is news', () => {
    const local = signedRun(0, 2)
    expect(claimIsNews(summariseClaim(local, null, local))).toBe(true)
  })

  it('a sheet crossing from one side to the other is news', () => {
    const local = signedRun(0, 2)
    const account = signedRun(1, 3)
    const merged = signedRun(0, 3)
    const summary = summariseClaim(local, account, merged)

    expect(summary.signed).toEqual({ here: 2, account: 2, shared: 1, merged: 3 })
    expect(claimIsNews(summary)).toBe(true)
  })

  it('a name the account replaced is news', () => {
    const local = record({
      sheets: { 'fundamentals/s0': sheet({ signedOff: AT }) },
      identity: { ...EMPTY_RECORD.identity, name: 'Ada L.' },
    })
    const account = record({
      sheets: { 'fundamentals/s0': sheet({ signedOff: AT }) },
      identity: { ...EMPTY_RECORD.identity, name: 'Ada Lovelace' },
    })
    const summary = summariseClaim(local, account, account)

    expect(summary.identity.nameChanged).toBe(true)
    expect(claimIsNews(summary)).toBe(true)
  })

  it('a name arriving where this browser had none is not counted as a change', () => {
    // An arrival, not a change: §17.3's rule, and `signed`/`adopted` already
    // carry the news when a record actually moved.
    const local = record({ sheets: { 'fundamentals/s0': sheet({ signedOff: AT }) } })
    const account = record({
      sheets: { 'fundamentals/s0': sheet({ signedOff: AT }) },
      identity: { ...EMPTY_RECORD.identity, name: 'Ada Lovelace' },
    })
    const summary = summariseClaim(local, account, account)

    expect(summary.identity.nameChanged).toBe(false)
    expect(claimIsNews(summary)).toBe(false)
  })

  it('a role the account replaced is news, and one that arrived is not', () => {
    const stated = record({
      sheets: { 'fundamentals/s0': sheet({ signedOff: AT }) },
      identity: { ...EMPTY_RECORD.identity, role: 'qa' },
    })
    const theirs = record({
      sheets: { 'fundamentals/s0': sheet({ signedOff: AT }) },
      identity: { ...EMPTY_RECORD.identity, role: 'software-engineer' },
    })
    expect(summariseClaim(stated, theirs, theirs).identity.roleChanged).toBe(true)
    expect(claimIsNews(summariseClaim(stated, theirs, theirs))).toBe(true)

    const unstated = record({ sheets: { 'fundamentals/s0': sheet({ signedOff: AT }) } })
    expect(summariseClaim(unstated, theirs, theirs).identity.roleChanged).toBe(false)
  })

  it('a changed mark is news, on the flag that already measured a change', () => {
    const local = record({
      identity: { ...EMPTY_RECORD.identity, markSeed: 'aaaaaaaa' },
      sheets: { 'fundamentals/s0': sheet({ signedOff: AT }) },
    })
    const account = record({
      identity: { ...EMPTY_RECORD.identity, markSeed: 'bbbbbbbb' },
      sheets: { 'fundamentals/s0': sheet({ signedOff: AT }) },
    })
    const summary = summariseClaim(local, account, account)

    expect(summary.identity.markChanged).toBe(true)
    expect(claimIsNews(summary)).toBe(true)
  })

  /**
   * §17.2's submittal term rests on an invariant that lives in two OTHER files.
   *
   * `submittals.merged` is `tally()`, an array length. `submittals.shared` is an
   * intersection of `submittalKeys()`, deduped by `slug · owner/repo`. In the
   * steady state they are equal only because `events.addSubmittal` and
   * `validate.coerceSubmittals` both refuse a second entry for the same
   * `owner/repo` on one sheet. Loosen that — the same repository at two commits
   * — and `merged > shared` is permanently true, so the receipt returns on every
   * page load: the exact defect §17 exists to remove.
   *
   * Both halves are asserted. The first pins the refusal through the production
   * reader, which is where the invariant is actually enforced; the second states
   * what a record that broke it would do, so anybody loosening submittal
   * identity is told by this test rather than by a reader.
   */
  it('THE INVARIANT: one repo per sheet is one array element, so the two measures agree', () => {
    const seeded = coerceRecordData({
      sheets: {
        'fundamentals/s0': {
          signedOff: AT,
          submittals: [
            { owner: 'cevheri', repo: 'hidden-line', commit: 'f60e2d2', at: AT },
            // The same repository again, at another commit. Refused on read.
            { owner: 'cevheri', repo: 'hidden-line', commit: '9f2c1ab', at: AT },
          ],
        },
      },
    })

    expect(seeded.sheets['fundamentals/s0'].submittals).toHaveLength(1)
    const summary = summariseClaim(seeded, seeded, seeded)
    expect(summary.submittals).toEqual({ here: 1, account: 1, shared: 1, merged: 1 })
    expect(claimIsNews(summary)).toBe(false)

    // And the same record with the refusal bypassed: two array elements, one
    // key, and a receipt that can never stop being news.
    const loosened = structuredClone(seeded)
    loosened.sheets['fundamentals/s0'].submittals.push({
      owner: 'cevheri',
      repo: 'hidden-line',
      url: 'https://github.com/cevheri/hidden-line',
      commit: '9f2c1ab',
      note: '',
      at: AT,
    })
    const broken = summariseClaim(loosened, loosened, loosened)
    expect(broken.submittals.merged).toBe(2)
    expect(broken.submittals.shared).toBe(1)
    expect(
      claimIsNews(broken),
      'loosening submittal identity resurrects the receipt on every page load',
    ).toBe(true)
  })

  it('a dropped submittal is news even when no sheet moved', () => {
    const summary: ClaimSummary = {
      outcome: 'merged',
      signed: { here: 1, account: 1, shared: 1, merged: 1 },
      submittals: { here: 3, account: 3, shared: 3, merged: 3 },
      droppedSignatures: [],
      droppedSubmittals: ['intermediate/security · cevheri/demo'],
      identity: {
        name: 'account',
        markSeed: 'account',
        role: 'absent',
        markChanged: false,
        nameChanged: false,
        roleChanged: false,
      },
    }
    expect(claimIsNews(summary)).toBe(true)
  })
})

describe('claimReceiptReading (§17.6)', () => {
  function receiptFor(summary: ClaimSummary) {
    return { at: CLAIMED_AT, summary }
  }

  it('prints the one spelling of "no receipt"', () => {
    expect(claimReceiptReading(null)).toBe(CLAIM_COPY.noClaim)
    expect(claimReceiptReading(null)).toBe('NO CLAIM ON RECORD')
  })

  it('reads an adopted claim as a move into the account', () => {
    const local = signedRun(0, 2)
    const reading = claimReceiptReading(receiptFor(summariseClaim(local, null, local)))
    expect(reading).toBe('2 MOVED INTO YOUR ACCOUNT')
  })

  it('reads a merge as a count and a loss, and prints a counted zero', () => {
    const local = signedRun(0, 2)
    const account = signedRun(1, 3)
    const merged = signedRun(0, 3)
    const reading = claimReceiptReading(receiptFor(summariseClaim(local, account, merged)))
    expect(reading).toBe('3 MERGED · 0 LOST')
  })

  it('counts a dropped signature and a dropped submittal into one loss figure', () => {
    const summary: ClaimSummary = {
      outcome: 'merged',
      signed: { here: 2, account: 2, shared: 1, merged: 3 },
      submittals: { here: 0, account: 0, shared: 0, merged: 0 },
      droppedSignatures: ['fundamentals/s9'],
      droppedSubmittals: ['intermediate/security · cevheri/demo'],
      identity: {
        name: 'absent',
        markSeed: 'absent',
        role: 'absent',
        markChanged: false,
        nameChanged: false,
        roleChanged: false,
      },
    }
    expect(claimReceiptReading(receiptFor(summary))).toBe('3 MERGED · 2 LOST')
  })
})
