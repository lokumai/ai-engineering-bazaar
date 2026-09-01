/**
 * §14.7.4 — claiming an anonymous record, as a decision and an accounting.
 *
 * Decision 4 of §14.0 says the anonymous record is CLAIMED rather than
 * replaced, because losing it "would be the purest violation of §1". This
 * module is where that decision is made, and — more importantly — where it is
 * COUNTED. §14.7.4 does not ask for a reassuring dialog; it prints
 *
 *     18 signed-off sheets here, 12 in your account.
 *     Merged: 21 signed-off sheets. 9 were in both.
 *     Submittals: 4 + 2 → 6. Nothing was deleted.
 *
 * and every one of those numbers is a claim about the reader's own work that
 * the reader is entitled to check. So `nothing was deleted` is not a sentence
 * this file is allowed to assert: it is DERIVED, by naming every signature and
 * every submittal that existed on either side and asking whether the merge
 * still holds it. If one is missing the summary says which, and the component
 * puts the export beside it. A summary that could only ever print good news
 * would be decoration, and §1 has no use for decoration.
 *
 * **Why this is separate from `merge.ts`.** `mergeRecords` decides what the
 * record IS; two records that merge to the same value can differ enormously in
 * what the merge did to the reader, and only one of those questions has an
 * audience. `merge.ts`'s own docblock draws the same line from the other side.
 *
 * **Why this is separate from `sync.ts`.** `sync.ts` owns WHEN the network is
 * touched and already runs §14.7.4's two branches (`ClaimOutcome`): it reads
 * the row, merges through its injected `merge`, and pushes. What it cannot do
 * is count, because counting needs no port and must be testable with no fake
 * at all. So `sync.ts` performs the claim and this module explains it —
 * `decideClaim` states the same two branches purely, for a caller that has the
 * row in hand, and `summariseClaim` turns any performed claim into the reader's
 * numbers. Neither reads a clock, storage, or the network (§12.14.2).
 *
 * fs-free and DOM-free. `ClaimSummary.tsx` renders what is returned here and
 * computes nothing, exactly as `EraseDialog` renders `eraseTallyLines`.
 */

import { tally } from './derive'
import { mergeRecords } from './merge'
import { MAX_SUBMITTALS, type RecordData } from './schema'

// ---------------------------------------------------------------------------
// §14.7.2's identity rows, completed
// ---------------------------------------------------------------------------

/**
 * §14.7.2 — "the account's wins; **if it is empty** the local one is carried
 * up." `merge.ts` implements that row with `??`, which catches `null` and not
 * the empty string, and `validate.ts` does not normalise `identity.name` on
 * read (it accepts any string, by §12.3.4's rule that a name is never
 * rewritten behind the reader's back). So a `record_state` row carrying
 * `name: ""` — hand-written, or left by an older client — would blank the name
 * the reader typed on this device the moment they signed in.
 *
 * That correction is applied HERE rather than there because `merge.ts` is
 * frozen for this phase (§14.7.1 lists it among the new modules, and the rule
 * for this task is that it is not edited); the gap is reported alongside this
 * file rather than patched in silence. Sign-in is also the only moment the rule
 * can matter — it is the only time an account's identity meets a device's — so
 * the claim is not a strange place for it to live.
 *
 * `role` and `mark` are frozen unions (§13.3, §12.3.5) and `markSeed` is eight
 * hex characters, so `''` is not a value any of them can legitimately hold; the
 * same treatment is applied to `markSeed` anyway, because an identity rule that
 * held for one of two string fields would be a rule nobody could remember.
 */
function blank(value: string | null): boolean {
  return value === null || value.trim() === ''
}

function accountWins(account: string | null, local: string | null): string | null {
  return blank(account) ? local : account
}

/**
 * §14.7.2's merge, with the two identity rows read strictly. Returns
 * `mergeRecords`'s own result — argument-identical when nothing changed — in
 * the overwhelmingly common case where no correction applies, so §14.7.3 can
 * still stay `synced` without a write.
 *
 * `local` is this browser's record; `remote` is the ACCOUNT's. The argument
 * order is the rule, not a convention (see `merge.ts` on `mergeIdentity`).
 */
export function claimMerge(local: RecordData, remote: RecordData): RecordData {
  // Delegation, not duplication. The blank-string correction this function was
  // written for now lives in `mergeIdentity` inside `merge.ts`, because
  // `sync.ts` takes `merge` as an injected dependency: a rule that only holds
  // when one particular function is wired in is a rule the next caller breaks,
  // and a reviewer found exactly that — `claimMerge` had no production caller
  // at all while `mergeRecords` was the obvious thing to inject.
  //
  // The name is kept because it is what the island wires in and what §14.7.4
  // refers to, and because keeping it leaves one place to put the next rule
  // that belongs to the claim and not to every merge.
  return mergeRecords(local, remote)
}

// ---------------------------------------------------------------------------
// What the reader is told
// ---------------------------------------------------------------------------

/** Where a field in the claimed record came from. `absent` = neither had one. */
export type ClaimIdentitySource = 'account' | 'local' | 'absent'

export interface ClaimIdentityOutcome {
  name: ClaimIdentitySource
  markSeed: ClaimIdentitySource
  role: ClaimIdentitySource
  /**
   * §14.7.2 gives `markSeed` to the account so that "a reader's visible mark
   * must not change when they sign in" — which is true of the account and, on
   * a device that had minted a different seed, false of THIS browser. When the
   * seed the mark is drawn from changes, the drawing beside every signature
   * the reader already made changes with it, and that is not something a page
   * may let happen quietly (§1). False here is what puts a line in the summary.
   */
  markChanged: boolean
}

/**
 * §14.7.4's numbers. Counts of the reader's own work, on both sides and after.
 *
 * `shared` is the `(9 were in both)` clause and it is what makes the other
 * three numbers legible: `18 + 12 → 21` looks like a loss of nine until the
 * overlap is named.
 */
export interface ClaimSummary {
  /** `adopted`: the account had no row. `merged`: it had one (§14.7.4). */
  outcome: 'adopted' | 'merged'
  signed: { here: number; account: number; shared: number; merged: number }
  submittals: { here: number; account: number; shared: number; merged: number }
  /**
   * Sheets that carried a signature on one side and carry none after the
   * merge. **This must always be empty** — §14.7.2's earliest-wins rule makes
   * a signature monotone under merging — and it is computed rather than
   * assumed for exactly that reason: an invariant nobody measures is a comment.
   */
  droppedSignatures: readonly string[]
  /**
   * Submittals present on one side and absent after, as `slug · owner/repo`.
   * Not an invariant: §12.9.1 caps a sheet at `MAX_SUBMITTALS` and `merge.ts`
   * trims the oldest, so this CAN be non-empty, and when it is the summary
   * says so instead of printing "nothing was deleted".
   */
  droppedSubmittals: readonly string[]
  identity: ClaimIdentityOutcome
}

/** §14.7.4 — what to write, and what to say about it. Both branches end in a
 *  write; only the value and the wording differ. */
export interface ClaimDecision {
  /** The envelope's `data` to push. `local` itself when the account had none. */
  record: RecordData
  summary: ClaimSummary
}

/**
 * The slugs the reader has signed off, taken from the RECORD and not from the
 * curriculum.
 *
 * `derive.ts`'s `signedCount` is the right count for every readout the reader
 * sees, and the wrong one here: it iterates `CurriculumFacts`, so a slug the
 * corpus has since renamed or dropped is invisible to it (§12.1.3 — a number
 * is a label, a slug is an identity). A claim that could not see such a sheet
 * could not promise it survived, and this module's whole job is that promise.
 * There is no denominator here and therefore no second implementation of one
 * (§14.9): this is a set of names, not a fraction.
 */
function signedSlugs(data: RecordData): string[] {
  return Object.entries(data.sheets)
    .filter(([, sheet]) => sheet.signedOff !== null)
    .map(([slug]) => slug)
}

/** The identity `addSubmittal` and `merge.ts` both dedupe on, qualified by the
 *  sheet it was handed in against — one entry per repository per sheet. */
function submittalKeys(data: RecordData): Set<string> {
  const keys = new Set<string>()
  for (const [slug, sheet] of Object.entries(data.sheets)) {
    for (const entry of sheet.submittals) {
      keys.add(`${slug} · ${entry.owner.toLowerCase()}/${entry.repo.toLowerCase()}`)
    }
  }
  return keys
}

function sourceOf(
  merged: string | null,
  local: string | null,
  account: string | null,
): ClaimIdentitySource {
  if (merged === null) return 'absent'
  if (!blank(account) && merged === account) return 'account'
  if (!blank(local) && merged === local) return 'local'
  // The value survived from a side this comparison cannot attribute — two
  // spellings that compare equal, or a field neither side held. Reported as the
  // account's, which is the rule §14.7.2 states; never as a guess dressed up.
  return account === null ? 'local' : 'account'
}

/**
 * §14.7.4 — the accounting, over the two inputs and the result.
 *
 * Takes the MERGED record rather than recomputing it, so the summary describes
 * the record that was actually written. Recomputing here would let the two
 * drift the day somebody changes which merge the claim uses, and the reader
 * would be handed numbers about a record that does not exist.
 */
export function summariseClaim(
  local: RecordData,
  account: RecordData | null,
  merged: RecordData,
): ClaimSummary {
  const here = signedSlugs(local)
  const theirs = account === null ? [] : signedSlugs(account)
  const after = new Set(signedSlugs(merged))
  const theirsSet = new Set(theirs)

  const droppedSignatures = [...new Set([...here, ...theirs])]
    .filter((slug) => !after.has(slug))
    .sort()

  const mineSubmittals = submittalKeys(local)
  const theirSubmittals = account === null ? new Set<string>() : submittalKeys(account)
  const afterSubmittals = submittalKeys(merged)
  const droppedSubmittals = [...new Set([...mineSubmittals, ...theirSubmittals])]
    .filter((key) => !afterSubmittals.has(key))
    .sort()

  return {
    outcome: account === null ? 'adopted' : 'merged',
    signed: {
      here: here.length,
      account: theirs.length,
      shared: here.filter((slug) => theirsSet.has(slug)).length,
      merged: after.size,
    },
    submittals: {
      // Counted through `derive.ts`'s own tally, so "4 + 2 → 6" and the erase
      // dialog's "3 submittals" can never disagree about what one is.
      here: tally(local).submittals,
      account: account === null ? 0 : tally(account).submittals,
      shared: [...mineSubmittals].filter((key) => theirSubmittals.has(key)).length,
      merged: tally(merged).submittals,
    },
    droppedSignatures,
    droppedSubmittals,
    identity: {
      name: sourceOf(merged.identity.name, local.identity.name, account?.identity.name ?? null),
      markSeed: sourceOf(
        merged.identity.markSeed,
        local.identity.markSeed,
        account?.identity.markSeed ?? null,
      ),
      role: sourceOf(merged.identity.role, local.identity.role, account?.identity.role ?? null),
      // Only a seed this browser actually held can be said to have CHANGED. A
      // browser with no seed had no mark to change (§12.3.5 mints it once, on
      // the first sign-off), and printing a change there would be inventing a
      // history the reader does not have.
      markChanged:
        !blank(local.identity.markSeed) &&
        merged.identity.markSeed !== local.identity.markSeed,
    },
  }
}

/**
 * §14.7.4's two branches, purely, for a caller holding the account's record.
 *
 * There is no third branch. "The read failed" is not a claim outcome — it is a
 * decision not to claim, and `sync.ts` owns it (`ClaimOutcome.unreadable`)
 * because pushing over a row this code could not read is the one way the sync
 * layer could destroy data. A pure function handed `null` cannot tell "no row"
 * from "no answer", so it is never asked to.
 */
export function decideClaim(local: RecordData, account: RecordData | null): ClaimDecision {
  if (account === null) {
    return { record: local, summary: summariseClaim(local, null, local) }
  }
  const merged = claimMerge(local, account)
  return { record: merged, summary: summariseClaim(local, account, merged) }
}

// ---------------------------------------------------------------------------
// The copy (§12.14.1's register)
// ---------------------------------------------------------------------------

/**
 * The strings, in one table, for the reason `EmptyState` and `EraseDialog` both
 * give: this is where the register is enforced, so it has to be somewhere a
 * node test can read it (§12.14.2, §12.14.1). No exclamation marks, no praise,
 * no "just" / "simply" / "easy" / "please" / "sorry", and no congratulation for
 * work the reader did before the site was involved.
 */
export const CLAIM_COPY = {
  head: 'Record claimed',
  adoptedTitle: 'Your account had no record yet.',
  mergedTitle: 'Two records were merged.',
  nothingDeleted: 'Nothing was deleted.',
  export: 'EXPORT YOUR RECORD',
} as const

function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

function sheets(n: number): string {
  return count(n, 'signed-off sheet', 'signed-off sheets')
}

/**
 * §14.7.4's summary as lines, zeros and non-events omitted.
 *
 * Same shape as `eraseTallyLines` and for the same reason: a list of clauses
 * the component prints in order, so the wording is testable without a DOM and
 * the component holds no strings of its own.
 *
 * The order is fixed and it is an argument: what was here, what was in the
 * account, what the merge produced, what it cost, and only then who the record
 * now says the reader is. A reader scanning for "did I lose anything" finds it
 * before the identity notes rather than after them.
 */
export function claimSummaryLines(summary: ClaimSummary): string[] {
  const lines: string[] = []
  const { signed, submittals } = summary

  if (summary.outcome === 'adopted') {
    lines.push(
      `${sheets(signed.merged)} and ${count(submittals.merged, 'submittal', 'submittals')} `
      + 'moved from this browser into your account.',
    )
  } else {
    lines.push(`${sheets(signed.here)} here, ${signed.account} in your account.`)
    lines.push(
      signed.shared === 0
        ? `Merged: ${sheets(signed.merged)}.`
        : `Merged: ${sheets(signed.merged)}. `
          + `${count(signed.shared, 'was in both', 'were in both')}.`,
    )
    if (submittals.here > 0 || submittals.account > 0) {
      const same =
        submittals.shared === 0
          ? ''
          : ` ${count(submittals.shared, 'was the same', 'were the same')}.`
      lines.push(
        `Submittals: ${submittals.here} + ${submittals.account} → ${submittals.merged}.${same}`,
      )
    }
  }

  // The deletion accounting. §14.7.4's `Hiçbiri silinmedi` is printed only
  // when it was checked and held.
  if (summary.droppedSignatures.length > 0) {
    lines.push(
      `${count(summary.droppedSignatures.length, 'signature', 'signatures')} is missing after `
      + `the merge: ${summary.droppedSignatures.join(', ')}. Export this record before `
      + 'carrying on.',
    )
  }
  if (summary.droppedSubmittals.length > 0) {
    lines.push(
      `${count(summary.droppedSubmittals.length, 'submittal was', 'submittals were')} dropped: `
      + `a sheet keeps its ${MAX_SUBMITTALS} most recent `
      + `(${summary.droppedSubmittals.join(', ')}).`,
    )
  }
  if (summary.droppedSignatures.length === 0 && summary.droppedSubmittals.length === 0) {
    lines.push(CLAIM_COPY.nothingDeleted)
  }

  // §14.7.2's identity rows, stated only where they changed something the
  // reader can see. A rule that fired invisibly is not news.
  if (summary.identity.markChanged) {
    lines.push(
      'The mark drawn beside your signatures is now your account’s, not this '
      + 'browser’s.',
    )
  }
  if (summary.identity.name === 'account' && summary.outcome === 'merged') {
    lines.push('The name on the record is the one your account holds.')
  }
  if (summary.identity.role === 'account' && summary.outcome === 'merged') {
    lines.push('The path role on the record is the one your account holds.')
  }

  return lines
}

/** The same enumeration as one line, for a live region that reads it out. */
export function claimSummarySentence(summary: ClaimSummary): string {
  return claimSummaryLines(summary).join(' ')
}

/** True when the summary carries something the reader has to act on: the only
 *  condition under which the export affordance belongs beside it (§12.15). */
export function claimNeedsExport(summary: ClaimSummary): boolean {
  return summary.droppedSignatures.length > 0 || summary.droppedSubmittals.length > 0
}
