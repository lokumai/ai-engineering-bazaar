import { describe, expect, it } from 'vitest'
import {
  ERASE_WORD,
  NOTHING_RECORDED,
  UNDO_CLOSED,
  UNDO_WINDOW_MS,
  clearStored,
  confirmsErase,
  eraseTallyLines,
  eraseTallySentence,
  rawStoredFrom,
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
