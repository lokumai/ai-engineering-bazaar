import { describe, expect, it } from 'vitest'
import {
  addSubmittal,
  assessQuiz,
  dayOf,
  markActivity,
  markExported,
  mintMarkSeed,
  noteClaim,
  observeDwell,
  observeReachedEnd,
  recordSourceOpened,
  removeSubmittal,
  setCharKeys,
  setChecklistItem,
  setIdentity,
  setPersisted,
  filesAttempt,
  setQuizAnswer,
  signOff,
  unsign,
} from '@/lib/record/events'
import { EMPTY_RECORD, type RecordData, type Submittal } from '@/lib/record/schema'
import type { ClaimReceipt } from '@/lib/record/claim'
import { coerceRecordData } from '@/lib/record/validate'

const NOW = '2026-08-31T09:15:00.000Z'
const TODAY = '2026-08-31'
const SLUG = 'fundamentals/llms'

/** Deep-frozen, so any in-place write throws instead of passing quietly. */
function frozen(patch: Partial<RecordData> = {}): RecordData {
  const data: RecordData = structuredClone({ ...EMPTY_RECORD, ...patch })
  const freeze = (value: unknown): void => {
    if (value && typeof value === 'object') {
      for (const inner of Object.values(value)) freeze(inner)
      Object.freeze(value)
    }
  }
  freeze(data)
  return data
}

const submittal = (owner: string, repo: string): Submittal => ({
  owner,
  repo,
  url: `https://github.com/${owner}/${repo}`,
  commit: null,
  note: 'a note',
  at: NOW,
})

describe('dayOf', () => {
  it('takes the day off the instant the caller passed, and reads no clock', () => {
    expect(dayOf(NOW)).toBe(TODAY)
    expect(dayOf('2026-01-01T00:00:00.000Z')).toBe('2026-01-01')
  })

  it('returns null rather than guessing when the instant is not one', () => {
    expect(dayOf('')).toBeNull()
    expect(dayOf('yesterday')).toBeNull()
    expect(dayOf('31/08/2026')).toBeNull()
  })
})

describe('the day stamp agrees with the validator', () => {
  it('stamps only days the validator will read back', () => {
    // Two modules judge a calendar day, and a disagreement would show as a
    // tick that vanished on reload.
    const stamped = signOff(frozen(), SLUG, null, NOW)
    expect(coerceRecordData(stamped).days).toEqual([TODAY])
    const impossible = signOff(frozen(), SLUG, null, '2026-02-31T09:00:00.000Z')
    expect(impossible.days).toEqual([])
    expect(coerceRecordData(impossible).days).toEqual([])
  })
})

describe('signOff', () => {
  it('records the assertion, the revision it was made against, and the day', () => {
    const next = signOff(frozen(), SLUG, 'a1b2c3d', NOW)
    expect(next.sheets[SLUG].signedOff).toBe(NOW)
    expect(next.sheets[SLUG].signedRevision).toBe('a1b2c3d')
    expect(next.days).toEqual([TODAY])
  })

  it('records a null revision rather than a plausible one when git gave none', () => {
    expect(signOff(frozen(), SLUG, null, NOW).sheets[SLUG].signedRevision).toBeNull()
  })

  it('leaves an already-signed sheet exactly as it was recorded', () => {
    const first = signOff(frozen(), SLUG, 'a1b2c3d', NOW)
    const again = signOff(first, SLUG, 'e4f5a6b', '2026-09-02T10:00:00.000Z')
    // A recorded fact is not rewritten: §12.4.3's drift line is the honest
    // answer to a changed revision, and UNSIGN then SIGN OFF is how a reader
    // re-asserts against the new one.
    expect(again).toBe(first)
  })

  it('stamps the day once even when the same day is stamped twice', () => {
    const twice = signOff(signOff(frozen(), SLUG, null, NOW), 'fundamentals/training', null, NOW)
    expect(twice.days).toEqual([TODAY])
  })

  it('keeps days sorted when an older instant arrives after a newer one', () => {
    const later = signOff(frozen(), SLUG, null, '2026-09-02T08:00:00.000Z')
    const earlier = signOff(later, 'fundamentals/training', null, NOW)
    expect(earlier.days).toEqual([TODAY, '2026-09-02'])
  })

  it('does not touch the rest of the sheet', () => {
    const before = observeDwell(frozen(), SLUG, 90, NOW)
    const after = signOff(before, SLUG, null, NOW)
    expect(after.sheets[SLUG].dwellSeconds).toBe(90)
  })
})

describe('unsign', () => {
  it('clears the assertion and the revision, and keeps everything else', () => {
    const signed = setChecklistItem(signOff(frozen(), SLUG, 'a1b2c3d', NOW), SLUG, 0, true, NOW)
    const next = unsign(signed, SLUG)
    expect(next.sheets[SLUG].signedOff).toBeNull()
    expect(next.sheets[SLUG].signedRevision).toBeNull()
    expect(next.sheets[SLUG].checklist).toEqual({ '0': true })
    expect(next.days).toEqual([TODAY])
  })

  it('is a no-op on a sheet nobody signed', () => {
    const data = frozen()
    expect(unsign(data, SLUG)).toBe(data)
  })
})

describe('setIdentity', () => {
  it('sets the name as given and stamps the day', () => {
    const next = setIdentity(frozen(), { name: 'İlker' }, NOW)
    expect(next.identity.name).toBe('İlker')
    expect(next.days).toEqual([TODAY])
  })

  it('takes a mark override and can clear it back to the seeded mark', () => {
    const chosen = setIdentity(frozen(), { mark: 'weld' }, NOW)
    expect(chosen.identity.mark).toBe('weld')
    expect(setIdentity(chosen, { mark: null }, NOW).identity.mark).toBeNull()
  })

  it('clears the name to null — the skipped state is legitimate (§12.3.2)', () => {
    const named = setIdentity(frozen(), { name: 'A' }, NOW)
    expect(setIdentity(named, { name: null }, NOW).identity.name).toBeNull()
  })

  it('leaves fields the patch does not mention', () => {
    const seeded = mintMarkSeed(frozen(), 'a1b2c3d4', NOW)
    expect(setIdentity(seeded, { name: 'A' }, NOW).identity.markSeed).toBe('a1b2c3d4')
  })

  it('refuses to write the mark seed, which has exactly one door', () => {
    // §12.3.5 — minted once, never regenerated. A name edit that reseeded the
    // mark would retroactively alter every sheet already signed.
    const seeded = mintMarkSeed(frozen(), 'a1b2c3d4', NOW)
    const next = setIdentity(seeded, { markSeed: 'ffffffff' }, NOW)
    expect(next.identity.markSeed).toBe('a1b2c3d4')
  })
})

describe('mintMarkSeed', () => {
  it('mints when absent', () => {
    const next = mintMarkSeed(frozen(), 'a1b2c3d4', NOW)
    expect(next.identity.markSeed).toBe('a1b2c3d4')
    expect(next.days).toEqual([TODAY])
  })

  it('never regenerates once minted', () => {
    const first = mintMarkSeed(frozen(), 'a1b2c3d4', NOW)
    expect(mintMarkSeed(first, 'ffffffff', NOW)).toBe(first)
  })

  it('refuses a seed that is not 8 lowercase hex characters', () => {
    const data = frozen()
    for (const seed of ['A1B2C3D4', 'a1b2c3d', 'a1b2c3d45', 'İlker12', '']) {
      expect(mintMarkSeed(data, seed, NOW)).toBe(data)
    }
  })
})

describe('recordSourceOpened', () => {
  it('records a distinct URL as evidence, with no XP anywhere near it', () => {
    const next = recordSourceOpened(frozen(), SLUG, 'https://www.w3.org/TR/wai-aria-1.2/', NOW)
    expect(next.sheets[SLUG].sources).toEqual(['https://www.w3.org/TR/wai-aria-1.2/'])
    expect(next.days).toEqual([TODAY])
  })

  it('counts distinct only: a URL opened twice is one opening', () => {
    const once = recordSourceOpened(frozen(), SLUG, 'https://a.example/x', NOW)
    expect(recordSourceOpened(once, SLUG, 'https://a.example/x', NOW)).toBe(once)
  })

  it('refuses anything that is not http(s)', () => {
    const data = frozen()
    for (const url of ['javascript:alert(1)', 'data:text/html,x', '/local', '', 'mailto:a@b.c']) {
      expect(recordSourceOpened(data, SLUG, url, NOW)).toBe(data)
    }
  })
})

describe('setChecklistItem', () => {
  it('stores a tick and stamps the day', () => {
    const next = setChecklistItem(frozen(), SLUG, 3, true, NOW)
    expect(next.sheets[SLUG].checklist).toEqual({ '3': true })
    expect(next.days).toEqual([TODAY])
  })

  it('removes the key when the box is unticked, because absence is the default', () => {
    const ticked = setChecklistItem(frozen(), SLUG, 3, true, NOW)
    expect(setChecklistItem(ticked, SLUG, 3, false, NOW).sheets[SLUG].checklist).toEqual({})
  })

  it('is a no-op for an index that is not a whole number in range', () => {
    const data = frozen()
    for (const index of [-1, 1.5, Number.NaN, 10_000]) {
      expect(setChecklistItem(data, SLUG, index, true, NOW)).toBe(data)
    }
  })

  it('is a no-op when the tick is already where it is asked to be', () => {
    const ticked = setChecklistItem(frozen(), SLUG, 0, true, NOW)
    expect(setChecklistItem(ticked, SLUG, 0, true, NOW)).toBe(ticked)
    const untouched = frozen()
    expect(setChecklistItem(untouched, SLUG, 0, false, NOW)).toBe(untouched)
  })
})

/**
 * §14.8.1 rule 2 — what the LOG counts, which is not what the envelope keeps.
 *
 * This predicate replaced filing a row from the textarea's `onChange`. That
 * filed one `learner_event` per KEYSTROKE, which had three consequences worth
 * pinning here so none of them can come back:
 *
 *  1. `docs/manager-queries.md` documents `setQuizAnswer` as "one row per
 *     attempt". It was one row per character.
 *  2. `attention.ts` flags `quizFailing` at `attempts >= QUIZ_ATTEMPTS` (3), so
 *     any answer longer than two characters cleared the threshold and the flag
 *     collapsed into "assessed missed" — the count did nothing.
 *  3. Every intermediate draft, including text written and then deleted,
 *     landed in a table with NO delete policy while the reader belongs to an
 *     organisation. It could never be taken back.
 */
describe('filesAttempt — one row per attempt, not per keystroke', () => {
  it('files nothing for a session that changed nothing', () => {
    expect(filesAttempt('a vector store', 'a vector store')).toBe(false)
  })

  it('files nothing when the field was never focused', () => {
    expect(filesAttempt(null, 'a vector store')).toBe(false)
    expect(filesAttempt(null, '')).toBe(false)
  })

  it('files nothing for an answer emptied back to nothing (§11.25)', () => {
    // A withdrawal, not a zero-length try — and `setQuizAnswer` drops the quiz
    // record in this case, so a row would outlive the state it describes.
    expect(filesAttempt('a vector store', '')).toBe(false)
    expect(filesAttempt('a vector store', '   \n ')).toBe(false)
  })

  it('files one row for one editing session, whatever was typed in it', () => {
    expect(filesAttempt('', 'a')).toBe(true)
    expect(filesAttempt('', 'a vector store returns neighbours')).toBe(true)
    expect(filesAttempt('a first try', 'a second, better try')).toBe(true)
  })

})

describe('setQuizAnswer and assessQuiz', () => {
  it('persists the answer with the instant it was written', () => {
    const next = setQuizAnswer(frozen(), SLUG, 'a retrieval attempt', NOW)
    expect(next.sheets[SLUG].quiz).toEqual({ answer: 'a retrieval attempt', assessed: null, at: NOW })
  })

  it('drops an emptied answer rather than keeping an empty quiz record', () => {
    const written = setQuizAnswer(frozen(), SLUG, 'x', NOW)
    expect(setQuizAnswer(written, SLUG, '  ', NOW).sheets[SLUG]?.quiz ?? null).toBeNull()
  })

  it('records either outcome, unscored, with no third state derived', () => {
    const written = setQuizAnswer(frozen(), SLUG, 'x', NOW)
    expect(assessQuiz(written, SLUG, 'matched', NOW).sheets[SLUG].quiz?.assessed).toBe('matched')
    expect(assessQuiz(written, SLUG, 'missed', NOW).sheets[SLUG].quiz?.assessed).toBe('missed')
  })

  it('cannot assess a retrieval that never happened (§12.6 item 2)', () => {
    const data = frozen()
    expect(assessQuiz(data, SLUG, 'matched', NOW)).toBe(data)
  })

  it('keeps the assessment when the reader edits the answer afterwards', () => {
    const assessed = assessQuiz(setQuizAnswer(frozen(), SLUG, 'x', NOW), SLUG, 'missed', NOW)
    const edited = setQuizAnswer(assessed, SLUG, 'x, and also y', NOW)
    expect(edited.sheets[SLUG].quiz?.assessed).toBe('missed')
  })

  it('permits a retry: the second assessment replaces the first, no penalty', () => {
    const first = assessQuiz(setQuizAnswer(frozen(), SLUG, 'x', NOW), SLUG, 'missed', NOW)
    const second = assessQuiz(first, SLUG, 'matched', '2026-09-01T10:00:00.000Z')
    expect(second.sheets[SLUG].quiz?.assessed).toBe('matched')
    expect(second.days).toEqual([TODAY, '2026-09-01'])
  })
})

describe('addSubmittal and removeSubmittal', () => {
  it('registers a submittal and stamps the day', () => {
    const next = addSubmittal(frozen(), SLUG, submittal('lokumai', 'ai-minicourses'), NOW)
    expect(next.sheets[SLUG].submittals).toHaveLength(1)
    expect(next.sheets[SLUG].submittals[0].url).toBe('https://github.com/lokumai/ai-minicourses')
    expect(next.days).toEqual([TODAY])
  })

  it('rebuilds the url even when the caller supplied a different one', () => {
    const hostile = { ...submittal('owner', 'repo'), url: 'https://evil.example/pwn' }
    const next = addSubmittal(frozen(), SLUG, hostile, NOW)
    expect(next.sheets[SLUG].submittals[0].url).toBe('https://github.com/owner/repo')
  })

  it('holds at most three per sheet (§12.9.1)', () => {
    let data = frozen()
    for (const n of [1, 2, 3]) data = addSubmittal(data, SLUG, submittal('o', `r${n}`), NOW)
    const full = data
    expect(addSubmittal(full, SLUG, submittal('o', 'r4'), NOW)).toBe(full)
    expect(full.sheets[SLUG].submittals).toHaveLength(3)
  })

  it('rejects the same repository twice on one sheet, case-insensitively', () => {
    const one = addSubmittal(frozen(), SLUG, submittal('Own', 'Repo'), NOW)
    expect(addSubmittal(one, SLUG, submittal('own', 'repo'), NOW)).toBe(one)
  })

  it('accepts the same repository on a different sheet', () => {
    const one = addSubmittal(frozen(), SLUG, submittal('own', 'repo'), NOW)
    const two = addSubmittal(one, 'fundamentals/training', submittal('own', 'repo'), NOW)
    expect(two.sheets['fundamentals/training'].submittals).toHaveLength(1)
  })

  it('rejects an owner or repo that is not a GitHub segment', () => {
    const data = frozen()
    expect(addSubmittal(data, SLUG, submittal('own er', 'repo'), NOW)).toBe(data)
    expect(addSubmittal(data, SLUG, submittal('owner', ''), NOW)).toBe(data)
  })

  it('drops a commit hash that is not one, rather than printing it', () => {
    const next = addSubmittal(frozen(), SLUG, { ...submittal('o', 'r'), commit: 'ZZZ' }, NOW)
    expect(next.sheets[SLUG].submittals[0].commit).toBeNull()
  })

  it('removes by index and is a no-op out of range', () => {
    const two = addSubmittal(
      addSubmittal(frozen(), SLUG, submittal('o', 'r1'), NOW), SLUG, submittal('o', 'r2'), NOW,
    )
    expect(removeSubmittal(two, SLUG, 0).sheets[SLUG].submittals.map((s) => s.repo)).toEqual(['r2'])
    expect(removeSubmittal(two, SLUG, 5)).toBe(two)
    expect(removeSubmittal(two, SLUG, -1)).toBe(two)
    const untouched = frozen()
    expect(removeSubmittal(untouched, SLUG, 0)).toBe(untouched)
  })
})

describe('observeDwell', () => {
  it('accumulates and clamps at the §12.4.4 cap', () => {
    const some = observeDwell(frozen(), SLUG, 30, NOW)
    expect(observeDwell(some, SLUG, 45, NOW).sheets[SLUG].dwellSeconds).toBe(75)
    expect(observeDwell(some, SLUG, 1e9, NOW).sheets[SLUG].dwellSeconds).toBe(3600)
  })

  it('ignores an observation that is not a positive duration', () => {
    const data = frozen()
    for (const seconds of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(observeDwell(data, SLUG, seconds, NOW)).toBe(data)
    }
  })

  it('is a no-op once the sheet is already at the cap', () => {
    const capped = observeDwell(frozen(), SLUG, 3600, NOW)
    expect(observeDwell(capped, SLUG, 10, NOW)).toBe(capped)
  })
})

describe('observeReachedEnd', () => {
  it('records the observation once and then does nothing', () => {
    const next = observeReachedEnd(frozen(), SLUG, NOW)
    expect(next.sheets[SLUG].reachedEnd).toBe(true)
    expect(next.days).toEqual([TODAY])
    expect(observeReachedEnd(next, SLUG, NOW)).toBe(next)
  })
})

describe('prefs and meta', () => {
  it('toggles the character-key shortcuts (§12.16)', () => {
    const off = setCharKeys(frozen(), false)
    expect(off.prefs.charKeys).toBe(false)
    expect(setCharKeys(off, false)).toBe(off)
    expect(setCharKeys(off, true).prefs.charKeys).toBe(true)
  })

  it('records the export and stamps the day', () => {
    const next = markExported(frozen(), NOW)
    expect(next.meta.lastExport).toBe(NOW)
    expect(next.days).toEqual([TODAY])
  })

  it('records the queried persistence answer, including a false one', () => {
    expect(setPersisted(frozen(), true).meta.persisted).toBe(true)
    expect(setPersisted(frozen(), false).meta.persisted).toBe(false)
    expect(setPersisted(setPersisted(frozen(), true), null).meta.persisted).toBeNull()
    // A false result is normal, not an error (§12.1.6), and is not a write of
    // the reader's own doing, so no day is stamped for it.
    expect(setPersisted(frozen(), false).days).toEqual([])
  })
})

describe('every reducer is non-mutating', () => {
  const cases: Array<[string, (data: RecordData) => RecordData]> = [
    ['signOff', (d) => signOff(d, SLUG, 'a1b2c3d', NOW)],
    ['unsign', (d) => unsign(d, SLUG)],
    ['setIdentity', (d) => setIdentity(d, { name: 'A' }, NOW)],
    ['mintMarkSeed', (d) => mintMarkSeed(d, 'a1b2c3d4', NOW)],
    ['recordSourceOpened', (d) => recordSourceOpened(d, SLUG, 'https://a.example/', NOW)],
    ['setChecklistItem', (d) => setChecklistItem(d, SLUG, 0, true, NOW)],
    ['setQuizAnswer', (d) => setQuizAnswer(d, SLUG, 'x', NOW)],
    ['assessQuiz', (d) => assessQuiz(d, SLUG, 'matched', NOW)],
    ['addSubmittal', (d) => addSubmittal(d, SLUG, submittal('o', 'r9'), NOW)],
    ['removeSubmittal', (d) => removeSubmittal(d, SLUG, 0)],
    ['observeDwell', (d) => observeDwell(d, SLUG, 30, NOW)],
    ['observeReachedEnd', (d) => observeReachedEnd(d, SLUG, NOW)],
    ['setCharKeys', (d) => setCharKeys(d, false)],
    ['markExported', (d) => markExported(d, NOW)],
    ['setPersisted', (d) => setPersisted(d, true)],
  ]

  /** A record with something in every field, so no reducer takes a short path. */
  function populated(): RecordData {
    let data: RecordData = { ...EMPTY_RECORD }
    data = setIdentity(data, { name: 'A', mark: 'hex' }, NOW)
    data = mintMarkSeed(data, 'a1b2c3d4', NOW)
    data = signOff(data, SLUG, 'a1b2c3d', NOW)
    data = observeDwell(data, SLUG, 60, NOW)
    data = observeReachedEnd(data, SLUG, NOW)
    data = setChecklistItem(data, SLUG, 0, true, NOW)
    data = assessQuiz(setQuizAnswer(data, SLUG, 'x', NOW), SLUG, 'matched', NOW)
    data = recordSourceOpened(data, SLUG, 'https://a.example/', NOW)
    data = addSubmittal(data, SLUG, submittal('o', 'r'), NOW)
    return data
  }

  for (const [name, run] of cases) {
    it(`${name} leaves a deep-frozen record untouched`, () => {
      const before = frozen(populated())
      const snapshot = structuredClone(before)
      expect(() => run(before)).not.toThrow()
      expect(before).toEqual(snapshot)
    })
  }

  it('returns a new object for every reducer that changes something', () => {
    const before = frozen()
    const changed = cases
      .map(([name, run]) => [name, run(before)] as const)
      .filter(([, next]) => next !== before)
    // The only no-ops on an empty record are unsign, assessQuiz (no answer to
    // assess) and removeSubmittal (no row to remove); the other twelve must
    // hand back a fresh object.
    expect(changed.length).toBe(12)
    for (const [, next] of changed) expect(next).not.toBe(before)
  })
})

describe('markActivity / markExported — the export is a backup (§7.3, §12.12.6)', () => {
  const AT = '2026-09-02T09:00:00.000Z'

  it('stamps the day without touching anything else', () => {
    const data = markActivity(EMPTY_RECORD, AT)
    expect(data.days).toEqual(['2026-09-02'])
    expect(data.meta.lastExport).toBeNull()
    expect(data.sheets).toEqual({})
    expect(data.identity).toEqual(EMPTY_RECORD.identity)
  })

  it('is idempotent, so exporting twice in a day adds one tick', () => {
    const once = markActivity(EMPTY_RECORD, AT)
    expect(markActivity(once, '2026-09-02T18:00:00.000Z').days).toEqual(['2026-09-02'])
  })

  /**
   * The bug this pair exists to prevent, found by driving Chrome: the panel
   * serialised the record and only then called `markExported`, which stamps the
   * day — so the exported file came back one tick short of the record that
   * produced it, and the UPTIME strip understated a day the reader had earned by
   * doing the export.
   *
   * The order is now: stamp the day, freeze the bytes, then record the export.
   * `lastExport` is deliberately absent from the file — a file cannot honestly
   * claim an export that had not happened when it was written — while the DAY is
   * present, because the day is true of the record being written.
   */
  it('puts the day in the exported bytes and keeps lastExport out of them', () => {
    const stamped = markActivity(EMPTY_RECORD, AT)
    const frozen = JSON.parse(JSON.stringify(stamped))
    const after = markExported(stamped, AT)

    expect(frozen.days).toEqual(['2026-09-02'])
    expect(frozen.meta.lastExport).toBeNull()
    expect(after.meta.lastExport).toBe(AT)
    // And the record left behind agrees with the file about the day.
    expect(after.days).toEqual(frozen.days)
  })
})

describe('§17.4 — noteClaim, the one writer of meta.lastClaim', () => {
  const RECEIPT: ClaimReceipt = {
    at: '2026-09-02T11:17:00.000Z',
    summary: {
      outcome: 'merged' as const,
      signed: { here: 1, account: 1, shared: 0, merged: 2 },
      submittals: { here: 0, account: 0, shared: 0, merged: 0 },
      droppedSignatures: [],
      droppedSubmittals: [],
      identity: {
        name: 'account' as const,
        markSeed: 'absent' as const,
        role: 'absent' as const,
        markChanged: false,
        nameChanged: false,
        roleChanged: false,
      },
    },
  }

  it('writes the receipt', () => {
    expect(noteClaim(EMPTY_RECORD, RECEIPT).meta.lastClaim).toEqual(RECEIPT)
  })

  it('replaces an older receipt: one slot, and the last claim is the one that counts', () => {
    const older = noteClaim(EMPTY_RECORD, { ...RECEIPT, at: '2026-08-01T00:00:00.000Z' })
    expect(noteClaim(older, RECEIPT).meta.lastClaim?.at).toBe(RECEIPT.at)
  })

  it('does NOT stamp a day', () => {
    // `days` is "dates on which anything was written" and it draws §7.3's
    // fourteen-day strip. Signing in is not a day the reader worked, and
    // `noteAliasNamed`'s own docblock records what the opposite choice cost.
    expect(noteClaim(EMPTY_RECORD, RECEIPT).days).toEqual(EMPTY_RECORD.days)
  })

  it('touches nothing else', () => {
    const before = {
      ...EMPTY_RECORD,
      identity: { ...EMPTY_RECORD.identity, name: 'Ada Lovelace' },
      prefs: { ...EMPTY_RECORD.prefs, charKeys: false, aliasNamedFor: 'user-abc-123' },
      meta: { ...EMPTY_RECORD.meta, lastExport: '2026-08-30T00:00:00.000Z', persisted: true },
    }
    const after = noteClaim(before, RECEIPT)

    expect(after.identity).toEqual(before.identity)
    expect(after.prefs).toEqual(before.prefs)
    expect(after.sheets).toEqual(before.sheets)
    expect(after.meta.lastExport).toBe(before.meta.lastExport)
    expect(after.meta.persisted).toBe(true)
  })
})
