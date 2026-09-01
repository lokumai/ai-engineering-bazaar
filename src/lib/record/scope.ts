/**
 * §1, §14 — where the record actually goes, said once.
 *
 * ## Why this module exists
 *
 * Before Phase 4 the answer was one sentence and it was true: "stored in this
 * browser only, never sent anywhere". It was written into four places —
 * `IdentityPanel` twice, `SignOff`, and the legend — and from the legend it was
 * carried into the exported `RECORD OF WORK`, a file readers keep.
 *
 * Phase 4's entire purpose is to send the record to `record_state`. The moment
 * §14.7 landed, all four became false, and the exported document became the
 * worst copy of the falsehood because it outlives the page it came from. Three
 * of the four were still live after §14.6 fixed the erase dialog: fixing the
 * dialog's copy and leaving these is how a site comes to contradict itself
 * about the same fact on different screens.
 *
 * So the sentences live here, and every screen composes them. A promise about
 * where data goes is exactly the kind of claim that must have ONE definition —
 * the same argument §14.9 makes about arithmetic, applied to prose.
 *
 * ## Why they are unconditional
 *
 * Each sentence is true whether or not the reader has an account, and true
 * whether or not accounts are switched on at all (§14.1). That is deliberate.
 * The alternative — copy that changes with the session — means the reader who
 * is signed out reads one promise, signs in, and never sees the sentence that
 * replaced it. A conditional clause ("with an account…") states the whole shape
 * of the system at every moment, so nothing has to be re-read to stay true.
 *
 * This module imports nothing and holds no logic. It is prose under version
 * control, next to the code whose behaviour it describes.
 */

/**
 * The name field's hint, on the two screens that ask for a name.
 *
 * The name is the one field that reaches THREE places: the envelope, the
 * account's `profiles.display_name` (§14.8.2 — it is what stops a manager's
 * roster printing `USER 1a2b3c4d`), and the exported report. All three are
 * named, in that order, because the reader's decision is about the third as
 * much as the first.
 */
export const NAME_SCOPE =
  'Stored in this browser. With an account it also reaches your account, and the ' +
  'managers of any organisation you have joined. The report you export contains ' +
  'this name — once you send that file to someone, the name has left your device.'

/**
 * The record's scope, on the profile sheet and in the legend.
 *
 * "A copy" and not "the record": the browser's copy stays authoritative
 * (§14.7.3 — a local write never waits for the network), and describing the
 * account as holding the record rather than a copy of it would misstate which
 * one wins.
 *
 * **It used to open "Signed out, it goes nowhere else", and that sentence had
 * to go.** Read as "no request leaves while you are signed out" it was true.
 * Read the way a reader reads it — as the state of affairs when signed out — it
 * said the opposite of the fact that matters: a reader who signs in and then
 * signs out still has a copy in the account, still readable by their
 * organisation's managers, and signing out removes none of it. A sentence that
 * is only true under the author's reading is a sentence that misinforms.
 *
 * So the shape is stated as a sequence of states instead of a pair of modes:
 * no account, then signing in, then what persists. The last clause is the one
 * the old wording lost, and it names the only thing that removes the copy.
 */
export const RECORD_SCOPE =
  'Your record is kept in this browser. With no account it stays here. Signing ' +
  'in puts a copy in your account so it survives this browser, where the ' +
  'managers of any organisation you have joined can read it; that copy stays ' +
  'until you erase it, and signing out does not remove it.'

/**
 * The half of the old sentence that is still true, for the export affordance.
 *
 * `DataPanel`'s "nothing is uploaded" is about the file the button produces,
 * not about the record, and it remains correct: the export is generated in the
 * browser and written to the reader's own disk. It is stated here so that the
 * next person auditing this file for false promises can see it was checked.
 */
export const EXPORT_SCOPE =
  'The file is written by this browser to your own disk. Nothing is uploaded to ' +
  'produce it.'
