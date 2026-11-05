import { signOff, unsign } from './events'
import { sheetsOf, type RecordData } from './schema'
import type { Track } from '../tracks'
import { nowIso, requestPersistence, update } from './store'

/**
 * D14 — the one path a completion takes, whichever control the reader pressed.
 *
 * **Two controls, one path.** M11 put control **A** at the end of a module —
 * one button where the reader already is — and M13/M14 put control **C** on the
 * home and progress pages, where the reader is looking at thirty-three modules
 * at once and wants to see and adjust state without opening anything. D14
 * records why the two surfaces get different controls, and it names the
 * constraint this module exists to keep: **both write through
 * `src/lib/record/store.ts`, which is the only writer of learner state**
 * (`kia-context/specs/ARCHITECTURE.md` §5).
 *
 * Without this the second control would have been a second implementation of
 * the first completion, which is two writes: the completion itself and the one
 * permitted call to `navigator.storage.persist()`, which §12.1.6 allows on a
 * single genuine user gesture.
 */

export interface CompletionOutcome {
  /** What the record now says: completed, or not. */
  completed: boolean
  /**
   * True when this was the first completion on this record. Always false for
   * an un-do.
   */
  first: boolean
}

/**
 * Complete a module, or take the completion back.
 *
 * @param record the record as the caller's own `useRecord()` sees it. Read for
 *   two questions only — is this module completed, and has a mark seed ever
 *   been minted — and never written to: the write goes through `update`, which
 *   applies the reducer to the store's current record rather than to this
 *   snapshot.
 * @param revision the module's own REV short hash, for §12.4.3's drift line, or
 *   null where the caller does not have it. **Control C passes null and that is
 *   honest rather than lossy**: the progress page lists thirty-three modules and
 *   does not carry thirty-three revisions, and `revisionDrift` returns null
 *   unless it has both ends — so a completion recorded from there simply makes
 *   no claim about which revision it was made against, instead of claiming the
 *   wrong one.
 */
export function toggleCompletion(
  record: RecordData,
  slug: string,
  revision: string | null = null,
  track: Track = 'engineers',
): CompletionOutcome {
  if ((sheetsOf(record, track)[slug]?.signedOff ?? null) !== null) {
    update((data) => unsign(data, slug, track))
    return { completed: false, first: false }
  }

  const now = nowIso()
  // The first completion on this record is the one genuine user gesture
  // §12.1.6 allows `navigator.storage.persist()` to be asked on.
  const first = [...Object.values(record.sheets), ...Object.values(record.everyoneSheets)]
    .every((sheet) => sheet.signedOff === null)
  update((data) => signOff(data, slug, revision, now, track))
  if (first) void requestPersistence()

  return { completed: true, first }
}
