import { describe, expect, it } from 'vitest'
import {
  ERASE_CLOSE_ACCOUNT,
  ERASE_ORG_HISTORY,
  ERASE_SCOPE,
  ERASE_WORD,
  NOTHING_RECORDED,
  UNDO_CLOSED,
  UNDO_WINDOW_MS,
  clearStored,
  confirmsErase,
  eraseTallyLines,
  eraseTallySentence,
  REMOTE_ERASE_FAILED,
  REMOTE_ERASE_FAILED_NOTE,
  eraseFailureReason,
  eraseRemote,
  NOTHING_REMOVED,
  rawStoredFrom,
  remoteEraseNote,
  restoreQuarantine,
  undoAvailable,
  undoLabel,
  undoSecondsLeft,
  type EraseTally,
} from '@/lib/record/erase'
import { addSubmittal, setChecklistItem, setIdentity, setQuizAnswer, signOff } from '@/lib/record/events'
import { tally } from '@/lib/record/derive'
import { EMPTY_RECORD, RECORD_QUARANTINE_KEY, RECORD_STORAGE_KEY } from '@/lib/record/schema'
import type { RecordStorage } from '@/lib/record/storage'

/**
 * §12.15 — the erase, adversarially.
 *
 * Every decision the dialog makes is here rather than in the dialog, so it can
 * be tested with no DOM at all (§12.14.2). The three that matter are the ones
 * a reader can get wrong or be wronged by: what counts as having typed the
 * word, whether the enumeration says `1 name` or `1 names`, and whether the
 * undo window is honest about how long it has left.
 */

const NOW = '2026-08-31T09:15:00.000Z'

/** The §12.14.2 port pattern: a Map behind the storage interface, in node. */
function fake(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  let throwOnGet = false
  let throwOnRemove = false
  let throwOnSet = false
  const storage: RecordStorage = {
    getItem(key) {
      if (throwOnGet) throw Object.assign(new Error('blocked'), { name: 'SecurityError' })
      return map.get(key) ?? null
    },
    setItem(key, value) {
      if (throwOnSet) throw Object.assign(new Error('rejected'), { name: 'QuotaExceededError' })
      map.set(key, value)
    },
    removeItem(key) {
      if (throwOnRemove) throw Object.assign(new Error('refused'), { name: 'SecurityError' })
      map.delete(key)
    },
  }
  return {
    storage,
    map,
    failGet() { throwOnGet = true },
    failRemove() { throwOnRemove = true },
    failSet() { throwOnSet = true },
  }
}

const emptyTally: EraseTally = { sheets: 0, name: 0, submittals: 0, quizzes: 0, sources: 0 }

describe('§12.15 — the typed confirmation', () => {
  it('accepts the word as the label prints it', () => {
    expect(ERASE_WORD).toBe('ERASE')
    expect(confirmsErase('ERASE')).toBe(true)
  })

  it('accepts leading and trailing whitespace, which the reader cannot see', () => {
    expect(confirmsErase(' ERASE')).toBe(true)
    expect(confirmsErase('ERASE ')).toBe(true)
    expect(confirmsErase('\t ERASE \n')).toBe(true)
  })

  it('accepts the word in any case, because the case is not what is being asserted', () => {
    expect(confirmsErase('erase')).toBe(true)
    expect(confirmsErase('Erase')).toBe(true)
    expect(confirmsErase('eRaSe')).toBe(true)
  })

  it('refuses internal whitespace: five letters and four spaces are not the word', () => {
    expect(confirmsErase('E R A S E')).toBe(false)
    expect(confirmsErase('ER ASE')).toBe(false)
  })

  it('refuses everything short of the word', () => {
    for (const typed of ['', ' ', 'ERAS', 'ERASES', 'ERASE ALL', 'DELETE', 'ERASEE', 'sil']) {
      expect(confirmsErase(typed), typed).toBe(false)
    }
  })

  it('refuses a homoglyph that reads as the word but is not typed on this keyboard', () => {
    // Cyrillic Е and А. A gate that folded these open would be gating on
    // appearance rather than on the act.
    expect(confirmsErase('ЕRАSE')).toBe(false)
  })
})

describe('§12.15 — the enumeration', () => {
  it('says 1 name, never 1 names', () => {
    expect(eraseTallyLines({ ...emptyTally, name: 1 })).toEqual(['1 name'])
  })

  it('pluralises every clause it can hold', () => {
    expect(
      eraseTallyLines({ sheets: 7, name: 1, submittals: 3, quizzes: 2, sources: 9 }),
    ).toEqual([
      '7 sheet states',
      '1 name',
      '3 submittals',
      '2 self-checks',
      '9 sources opened',
    ])
  })

  it('singularises every clause it can hold', () => {
    expect(
      eraseTallyLines({ sheets: 1, name: 1, submittals: 1, quizzes: 1, sources: 1 }),
    ).toEqual(['1 sheet state', '1 name', '1 submittal', '1 self-check', '1 source opened'])
  })

  it('omits a zero rather than padding the list with what erase will not destroy', () => {
    expect(eraseTallyLines({ sheets: 4, name: 0, submittals: 0, quizzes: 0, sources: 2 })).toEqual([
      '4 sheet states',
      '2 sources opened',
    ])
  })

  it('states that there is nothing to erase rather than printing an empty dialog', () => {
    expect(eraseTallyLines(emptyTally)).toEqual([])
    expect(eraseTallySentence(emptyTally)).toBe(NOTHING_RECORDED)
  })

  it('joins the clauses into §12.15’s own example sentence', () => {
    expect(eraseTallySentence({ sheets: 7, name: 1, submittals: 3, quizzes: 0, sources: 0 })).toBe(
      '7 sheet states, 1 name, 3 submittals',
    )
  })

  it('counts a real record through `tally`, so the dialog cannot drift from it', () => {
    let data = EMPTY_RECORD
    data = signOff(data, 'fundamentals/llms', 'a1b2c3d', NOW)
    data = setIdentity(data, { name: 'Ada Lovelace' }, NOW)
    data = setQuizAnswer(data, 'fundamentals/llms', 'an answer', NOW)
    data = setChecklistItem(data, 'fundamentals/llms', 0, true, NOW)
    data = addSubmittal(
      data,
      'fundamentals/llms',
      { owner: 'lokumai', repo: 'thing', url: '', commit: null, note: '', at: '' },
      NOW,
    )
    expect(eraseTallySentence(tally(data))).toBe('1 sheet state, 1 name, 1 submittal, 1 self-check')
  })
})

describe('§12.15 — the undo window', () => {
  const at = 1_772_000_000_000

  it('is ten seconds', () => {
    expect(UNDO_WINDOW_MS).toBe(10_000)
    expect(undoSecondsLeft(at, at)).toBe(10)
    expect(undoLabel(undoSecondsLeft(at, at))).toBe('ERASED · UNDO AVAILABLE FOR 10 S')
  })

  it('rounds up, so the last fraction of a second is offered rather than dropped', () => {
    expect(undoSecondsLeft(at, at + 1)).toBe(10)
    expect(undoSecondsLeft(at, at + 9_001)).toBe(1)
    expect(undoSecondsLeft(at, at + 9_999)).toBe(1)
  })

  it('expires exactly at the boundary and stays expired', () => {
    expect(undoSecondsLeft(at, at + 10_000)).toBe(0)
    expect(undoSecondsLeft(at, at + 10_001)).toBe(0)
    expect(undoSecondsLeft(at, at + 86_400_000)).toBe(0)
    expect(undoAvailable(at, at + 10_000)).toBe(false)
    expect(undoAvailable(at, at + 9_999)).toBe(true)
  })

  it('never offers longer than it promised when the clock moves backwards', () => {
    // An NTP correction or a reader changing the system clock.
    expect(undoSecondsLeft(at, at - 60_000)).toBe(10)
  })

  it('claims no window at all for an instant it cannot measure', () => {
    expect(undoSecondsLeft(Number.NaN, at)).toBe(0)
    expect(undoSecondsLeft(at, Number.NaN)).toBe(0)
    expect(undoSecondsLeft(at, Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('states that the window shut instead of the offer vanishing', () => {
    expect(UNDO_CLOSED).toBe('ERASED · UNDO WINDOW CLOSED')
  })
})

describe('§12.11 item 7 / §12.15 — the two keys, read raw and removed', () => {
  it('returns both stored strings byte for byte', () => {
    const raw = '{"schema":1,"savedAt":"2026-08-31T09:15:00.000Z","data":{}}'
    const { storage } = fake({ [RECORD_STORAGE_KEY]: raw, [RECORD_QUARANTINE_KEY]: 'not json' })
    expect(rawStoredFrom(storage)).toEqual({ record: raw, quarantine: 'not json' })
  })

  it('reports an absent key as absent, which is not the same as an empty record', () => {
    const { storage } = fake({})
    expect(rawStoredFrom(storage)).toEqual({ record: null, quarantine: null })
  })

  it('reports absence rather than throwing when the access itself is refused', () => {
    const box = fake({ [RECORD_STORAGE_KEY]: '{}' })
    box.failGet()
    expect(rawStoredFrom(box.storage)).toEqual({ record: null, quarantine: null })
  })

  it('reads nothing at all where there is no storage', () => {
    expect(rawStoredFrom(null)).toEqual({ record: null, quarantine: null })
  })

  it('removes the live record AND the quarantined copy', () => {
    const box = fake({
      [RECORD_STORAGE_KEY]: '{"schema":1}',
      [RECORD_QUARANTINE_KEY]: '{"schema":99}',
    })
    clearStored(box.storage)
    expect(box.map.size).toBe(0)
  })

  it('leaves other origins’ keys alone: the prefix is the only isolation there is', () => {
    const box = fake({ [RECORD_STORAGE_KEY]: '{}', 'hl-theme': 'dark', other: 'x' })
    clearStored(box.storage)
    expect([...box.map.keys()].sort()).toEqual(['hl-theme', 'other'])
  })

  it('survives a refused removal without throwing at the reader', () => {
    const box = fake({ [RECORD_STORAGE_KEY]: '{}' })
    box.failRemove()
    expect(() => clearStored(box.storage)).not.toThrow()
    expect(box.map.has(RECORD_STORAGE_KEY)).toBe(true)
  })

  it('does nothing where there is no storage', () => {
    expect(() => clearStored(null)).not.toThrow()
  })

  it('puts the quarantined copy back byte for byte, so UNDO restores all of it', () => {
    const raw = '{"schema":99,"savedAt":"2026-08-31T09:15:00.000Z","data":{"x":1}}'
    const box = fake({ [RECORD_QUARANTINE_KEY]: raw })
    clearStored(box.storage)
    expect(box.map.has(RECORD_QUARANTINE_KEY)).toBe(false)
    restoreQuarantine(box.storage, raw)
    expect(box.map.get(RECORD_QUARANTINE_KEY)).toBe(raw)
  })

  it('restores nothing when there was nothing under the key', () => {
    const box = fake({})
    restoreQuarantine(box.storage, null)
    expect(box.map.size).toBe(0)
  })

  it('never touches the live record on the way back', () => {
    const box = fake({ [RECORD_STORAGE_KEY]: 'live' })
    restoreQuarantine(box.storage, 'aside')
    expect(box.map.get(RECORD_STORAGE_KEY)).toBe('live')
    expect(box.map.get(RECORD_QUARANTINE_KEY)).toBe('aside')
  })

  it('survives a refused write without throwing at the reader', () => {
    const box = fake({})
    box.failSet()
    expect(() => restoreQuarantine(box.storage, 'aside')).not.toThrow()
    expect(() => restoreQuarantine(null, 'aside')).not.toThrow()
  })
})

/**
 * §14.6 — the account copy, adversarially.
 *
 * The whole point of `eraseRemote` taking the delete as an argument is that
 * these four situations are reachable in node with no client, no session and no
 * network: it worked, it rejected, it resolved with a PostgREST error, and
 * there was nobody signed in. The fourth is not an edge case — `/profile/`
 * works with no account at all (§14.0).
 */
describe('§14.6 — erasing the copy the account holds', () => {
  it('reports the row gone when the delete resolves', async () => {
    let calls = 0
    const outcome = await eraseRemote(async () => { calls += 1 })
    expect(outcome).toEqual({ kind: 'deleted' })
    expect(calls).toBe(1)
  })

  it('says signed-out, and never calls anything, when there is no session', async () => {
    // A signed-out reader has no `record_state` row, so there is nothing to
    // warn them about. Reporting a failure here would send them looking for a
    // copy that never existed.
    expect(await eraseRemote(null)).toEqual({ kind: 'signed-out' })
  })

  it('never throws at a reader whose local data is already gone', async () => {
    const outcome = await eraseRemote(async () => {
      throw new Error('permission denied for table record_state')
    })
    expect(outcome).toEqual({
      kind: 'failed',
      reason: 'permission denied for table record_state',
    })
  })

  it('treats a RESOLVED PostgREST error as a failure, not a success', async () => {
    // The trap this check exists for: `.delete()` refused by RLS resolves with
    // `{ error }` rather than rejecting, and a page that trusted the resolution
    // would print "removed from your account" over a row still sitting there.
    const outcome = await eraseRemote(async () => ({
      error: { message: 'new row violates row-level security policy', code: '42501' },
      data: null,
    }))
    expect(outcome.kind).toBe('failed')
    if (outcome.kind === 'failed') {
      expect(outcome.reason).toBe('new row violates row-level security policy')
    }
  })

  it('accepts a PostgREST response whose error is null', async () => {
    expect(await eraseRemote(async () => ({ error: null, data: null, count: 1 })))
      .toEqual({ kind: 'deleted' })
  })

  /**
   * The failure no error inspection can catch.
   *
   * RLS FILTERS `delete` — only `insert` raises — so a delete the policy
   * refuses resolves with `error: null` and removes nothing. Before the port
   * returned a row count there was no observation to test here at all, and this
   * case took the same branch as a successful delete: the dialog's standing
   * copy promised the account copy was removed, and said nothing more.
   */
  it('treats a delete that removed NO ROW as a failure (§14.6)', async () => {
    const outcome = await eraseRemote(async () => ({ error: null, rows: 0 }))
    expect(outcome).toEqual({ kind: 'failed', reason: NOTHING_REMOVED })
  })

  it('reports the row gone when the receipt says one went', async () => {
    expect(await eraseRemote(async () => ({ error: null, rows: 1 })))
      .toEqual({ kind: 'deleted' })
  })

  /**
   * A deleter that reports no count is a test double, not a port: the
   * `RemoteRecordStore` type requires a receipt. Silence must not read as zero,
   * or every double above would be asserting a failure it never arranged.
   */
  it('does not read a missing row count as zero', async () => {
    expect(await eraseRemote(async () => undefined)).toEqual({ kind: 'deleted' })
    expect(await eraseRemote(async () => ({ error: null }))).toEqual({ kind: 'deleted' })
    expect(await eraseRemote(async () => ({ error: null, rows: 'none' })))
      .toEqual({ kind: 'deleted' })
  })

  /**
   * §14.6 row 1, which `0003_phase4_erase.sql` was written for and which no code
   * performed until `deleteHistory` existed.
   *
   * The receipt reports the two halves separately because a single total cannot
   * tell "nothing was there" from "an organisation's claim kept it". Zero
   * history rows is not a failure and must not reach the reader as one: RLS
   * filters the delete, so a member's attempt removes nothing and reports no
   * error, which is §14.6's second row working exactly as designed.
   */
  it('reports the record and the history separately (§14.6)', async () => {
    const noOrg = await eraseRemote(async () => ({ error: null, rows: 1, historyRows: 12 }))
    expect(noOrg).toEqual({ kind: 'deleted' })

    // A member: the log survives, and the erase still succeeded.
    const member = await eraseRemote(async () => ({ error: null, rows: 1, historyRows: 0 }))
    expect(member).toEqual({ kind: 'deleted' })
    expect(remoteEraseNote(member)).toBeNull()
  })

  /**
   * The two halves of the report, and why they share one sentence: from a
   * browser, a refused delete and a dropped connection are the same fact — the
   * local erase happened and the account copy may still be there.
   */
  it('says the same thing to the reader for both ways of not deleting', async () => {
    const refused = await eraseRemote(async () => ({ error: null, rows: 0 }))
    const dropped = await eraseRemote(async () => { throw new Error('network') })
    expect(remoteEraseNote(refused)).toBe(remoteEraseNote(dropped))
    expect(remoteEraseNote(refused)).not.toBeNull()
    // And a delete that DID go through adds nothing: the dialog already
    // promised it, and a line confirming a kept promise trains a reader to
    // stop reading these lines.
    expect(remoteEraseNote({ kind: 'deleted' })).toBeNull()
  })

  it('reports a thrown non-Error as what it actually was', async () => {
    const outcome = await eraseRemote(async () => { throw 'offline' })
    expect(outcome).toEqual({ kind: 'failed', reason: 'offline' })
  })

  it('admits an absent reason rather than inventing one (§11.25)', () => {
    expect(eraseFailureReason(new Error(''))).toBe('no reason reported')
    expect(eraseFailureReason(new Error('  \n '))).toBe('no reason reported')
    expect(eraseFailureReason(new Error(' timeout '))).toBe('timeout')
  })

  it('speaks only when the delete did not go through', () => {
    expect(remoteEraseNote({ kind: 'deleted' })).toBeNull()
    expect(remoteEraseNote({ kind: 'signed-out' })).toBeNull()
    expect(remoteEraseNote({ kind: 'failed', reason: 'timeout' }))
      .toBe(REMOTE_ERASE_FAILED_NOTE)
  })

  it('says the local half succeeded and the account half may not have', () => {
    // ERASED HERE, not ERASED: the reader is deciding what to do next and has
    // to know which half is outstanding. Readout register — uppercase, no
    // terminal period (§12.14.1).
    expect(REMOTE_ERASE_FAILED).toBe('ERASED HERE · ACCOUNT COPY MAY REMAIN')
    expect(REMOTE_ERASE_FAILED).toBe(REMOTE_ERASE_FAILED.toUpperCase())
    expect(REMOTE_ERASE_FAILED).not.toMatch(/\.$/)

    // "may still be there", never "remains": a refused delete and a dropped
    // connection are indistinguishable from the browser, and asserting either
    // would be the page claiming a server state it cannot see (§1).
    expect(REMOTE_ERASE_FAILED_NOTE).toContain('gone from this browser')
    expect(REMOTE_ERASE_FAILED_NOTE).toContain('did not go through')
    expect(REMOTE_ERASE_FAILED_NOTE).toContain('may still be there')
    expect(REMOTE_ERASE_FAILED_NOTE).toMatch(/closing your account/i)
  })
})

/**
 * §14.6, §1 — the disclosure. Three rows, three promises, and none of the
 * three may be missing from the screen that performs the deletion.
 */
describe('§14.6 — the copy states all three rows of the table', () => {
  const all = `${ERASE_SCOPE} ${ERASE_ORG_HISTORY} ${ERASE_CLOSE_ACCOUNT}`

  it('row 1 and row 2, first column: this browser AND the account copy', () => {
    expect(ERASE_SCOPE).toContain('from this browser')
    expect(ERASE_SCOPE).toContain('the copy your account holds')
    // §12.1.2's set-aside copy is the reader's data too, and the sentence has
    // said so since §12.15. It still does.
    expect(ERASE_SCOPE).toContain('the copy set aside')
  })

  it('row 2, second column: the organisation history SURVIVES', () => {
    expect(ERASE_ORG_HISTORY).toContain('is not removed')
    expect(ERASE_ORG_HISTORY).toMatch(/organisation/)
  })

  it('row 3: closing the account is the only thing that removes the history', () => {
    expect(ERASE_CLOSE_ACCOUNT).toMatch(/^Only closing your account/)
  })

  it('no longer claims the record was never sent anywhere', () => {
    // The Phase 3 sentence. True then, false the moment `record_state`
    // existed, and the defect §14.6 was written to close.
    expect(all).not.toMatch(/never sent anywhere/i)
    expect(all).not.toMatch(/nothing anywhere else/i)
    expect(all).not.toMatch(/nothing is uploaded/i)
  })

  it('promises no deletion of the log the client has no policy to delete', () => {
    // `learner_event` has no delete policy in `0002_phase4_rls.sql`, on
    // purpose. So the copy must not offer to remove the history — only to say
    // it stays, and how it ends.
    expect(all).not.toMatch(/removes (the |your )?(training )?history/i)
    expect(all).not.toMatch(/erases (the |your )?(training )?history/i)
  })
})
