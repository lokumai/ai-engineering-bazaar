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

/**
 * The home screen's fourth statement line (§15.2.3).
 *
 * The first three lines of `indexStatement()` are measured from the corpus —
 * sheet counts, drawn counts. This one is not measured and cannot be, because
 * it is not a fact about the set but an undertaking about the reader. It sits
 * here rather than in the home component for the reason the module header
 * gives: the fourth copy of a claim about where data goes is the copy that
 * survives the change that makes it false.
 *
 * **It used to open "What you read is recorded", and that was the wrong subject
 * for what `schema.ts` actually holds.** A `SheetRecord` is made of things the
 * reader did — `signedOff`, `checklist`, `quiz`, `submittals`, `sources` — plus
 * two observations, `dwellSeconds` and `reachedEnd`, and `days`, the dates a
 * write happened. So "what you read" over-claimed a reading log the site does
 * not keep, on the line every first-time visitor reads. The correction is not
 * the opposite claim either: time on a sheet and reaching its end ARE stored,
 * so a flat "nothing about reading is recorded" would be false in the other
 * direction. The sentence names the reader's marks first, because that is the
 * bulk of the record, then the two observations, because they are the part a
 * reader would not otherwise expect.
 *
 * "Until you move it" is the load-bearing clause, and it is deliberately the
 * reader's verb. Every route out of this browser is one the reader takes —
 * signing in, or exporting the file — so nothing here happens on its own.
 * **The alternative was the shorter "and stays there".** It is false the moment
 * the reader reaches `/sign-in/`, which is two lines further down the same
 * screen, and it would have been the same defect `RECORD_SCOPE` records above:
 * a sentence true only until the reader acts on the page it is printed on.
 *
 * It stays one line long. This is the first screen, before any account exists,
 * and the fuller shape is `RECORD_SCOPE`'s job on the profile sheet.
 */
export const HOME_SCOPE =
  'What you tick, answer, sign off and hand in is kept in this browser, with the ' +
  'time you spend on a sheet, whether you reached its end, and the dates you ' +
  'worked; it stays here until you move it.'

/**
 * Where the name in the field came from, when this browser put it there rather
 * than the reader (§16.3).
 *
 * ## Why the sentence is here
 *
 * This module's header records how four copies of one claim came to be four
 * different claims, and this is the same species: the name's provenance is
 * asserted by the panel that prints the field, and it would be asserted again
 * by any later screen that shows the alias. One author, one wording.
 *
 * ## Why it exists at all
 *
 * §16.3's second constraint. A silent write is the failure mode: the reader
 * signs in with a magic link, returns to the profile sheet, finds `ada` in a
 * field they never filled in, and has no way to tell a guess from something
 * they typed months ago on another device. The record would be telling them a
 * fact about themselves that it invented. So the offer is visible and it says
 * where it came from.
 *
 * ## What it does not say
 *
 * The address. §16.3's fourth constraint: the local part is offered as a name,
 * and printing the whole address under a field — beside a stamp that appears on
 * every sheet the reader exports — would put a mailbox on a drawing. "The
 * address you signed in with" identifies it without reproducing it.
 *
 * ## Why a readout and not prose
 *
 * §12.14.1's two registers: prose explains, a readout states. This states —
 * uppercase mono, `·`-separated, no terminal period, the same shape as
 * `MARK · DATUM`. **The rejected wording was `TAKEN FROM YOUR EMAIL ADDRESS`**:
 * it describes a field the reader did not fill in, whereas an act they
 * performed ("signed in with") is the thing that explains how the site knows.
 * The second half is imperative and names the control, because a note saying
 * only where a value came from leaves the reader looking for the way out of it.
 */
export const NAME_FROM_ADDRESS =
  'TAKEN FROM THE ADDRESS YOU SIGNED IN WITH · CHANGE IT IN THE FIELD ABOVE'

/**
 * What an alias is and is not, on `/sign-in/alias/` (§15.4).
 *
 * This is the one screen where a reader can mistake a name for a proof, so the
 * sentence is built as four facts in the order a reader needs them: what the
 * alias does (a name and a mark, on the record, the sign-offs and the exports),
 * what it is not (not an account, and no evidence of anything), who can change
 * it (anyone at this browser), and where it goes next (nowhere while there is
 * no account; to the account and the roster when the reader signs in).
 *
 * The negative clause is not hedged into a footnote. `/sign-in/alias/` is
 * reached from the same list as the email and GitHub doors (§15.5.1), and a
 * screen that asks for a name in a field, draws a stamp, and then prints
 * `UNVERIFIED` only on the stamp would let a reader leave with the impression
 * that they had signed in. **The alternative — "an alias is stored locally" —
 * was rejected for saying nothing a reader can act on:** it describes a storage
 * location where the question is what the name is worth as a claim.
 *
 * The last sentence names the profile sheet because a reader who reads this
 * before choosing needs to know the choice is not final; without it the exit
 * control ("Read without one", §15.4.5) reads as the only reversible option.
 *
 * **The third fact used to end "and it does not travel to another machine", and
 * that clause contradicted the same screen.** `AliasSheet`'s note, a few
 * centimetres below this lead, tells the reader that signing in from this
 * browser carries the name and the mark with the record and puts the name on
 * the organisation's roster — which is true, and is a large part of why the
 * alias sheet is worth filling in. Two sentences on one screen disagreeing
 * about where a name goes is worse than either alone.
 *
 * So this clause takes `RECORD_SCOPE`'s technique: a SEQUENCE OF STATES, not a
 * pair of modes. While there is no account the alias stays at this browser;
 * signing in carries it. Stated as a sequence, the clause a reader needs is
 * present whichever state they are in, and neither reading has to be undone by
 * a note further down.
 */
export const ALIAS_SCOPE =
  'An alias is a name and a mark this browser puts on your record, on your sign-offs ' +
  'and on anything you export. It is not an account and it proves nothing: anyone using ' +
  'this browser can change it. With no account it stays at this browser; signing in from ' +
  'here carries the name and the mark to your account, and to the roster of any ' +
  'organisation you have joined. You can change it or clear it at any time on the ' +
  'profile sheet.'
