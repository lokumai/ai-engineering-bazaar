import { seedFrom } from '../identity/mark'
import { mintMarkSeed, signOff, unsign } from './events'
import type { RecordData } from './schema'
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
 * the first completion, and the first completion is not one write. It is three:
 * the sign-off itself, the mark seed — minted once per record and never again
 * (§12.3.5) — and the one permitted call to `navigator.storage.persist()`,
 * which §12.1.6 allows on a single genuine user gesture. A control that did the
 * first and not the other two would leave a reader who completed their first
 * module from the progress page with no mark on their exported record and no
 * persistence request ever made, and nothing would have failed.
 *
 * **What it does not do is prompt for a name.** §12.3.2 asks for a name at
 * exactly one moment — the first completion, inline, in the module's own
 * `CHECKED BY` field — and that is a piece of the module page's layout rather
 * than of this write. So the return value says whether this was the first
 * completion and the caller decides what to ask; control C asks nothing, which
 * is correct for a control operating on a list of modules the reader is not
 * inside.
 */

/**
 * §12.3.5 — four bytes from the CSPRNG, once.
 *
 * The bytes are generated here and the hex is built by a pure function, which
 * is why `seedFrom` has no parameter a name could arrive through: a
 * name-derived mark would silently change on every already-completed module the
 * moment the reader renamed themselves. Returns null where Web Crypto is
 * unavailable, and the mark then renders as nothing rather than as a pattern
 * from a predictable seed.
 */
function mintSeed(): string | null {
  try {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    return seedFrom(bytes)
  } catch {
    return null
  }
}

export interface CompletionOutcome {
  /** What the record now says: completed, or not. */
  completed: boolean
  /**
   * True when this was the first completion on this record, which is the one
   * moment §12.3.2 allows a name to be asked for. Always false for an un-do.
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
): CompletionOutcome {
  if ((record.sheets[slug]?.signedOff ?? null) !== null) {
    update((data) => unsign(data, slug), { kind: 'unsign', sheetSlug: slug })
    return { completed: false, first: false }
  }

  const now = nowIso()
  // The seed is minted once and never regenerated, so its absence is the
  // honest test for "this is the first completion" (§12.3.5).
  const first = record.identity.markSeed === null
  update((data) => signOff(data, slug, revision, now), {
    // §12.4.3's drift line needs the revision the reader completed AGAINST, and
    // the log is where a later un-complete and re-complete stays visible.
    kind: 'signOff',
    sheetSlug: slug,
    payload: { revision },
  })

  if (first) {
    const seed = mintSeed()
    if (seed !== null) {
      update((data) => mintMarkSeed(data, seed, now), { kind: 'mintMarkSeed' })
    }
    // §12.1.6 — called once, on a genuine user gesture. A `false` answer is
    // normal, not an error, and the store records the queried value.
    void requestPersistence()
  }

  return { completed: true, first }
}
