import { unfenced } from './lines'
import { stripBuildFurniture } from './strip'

/**
 * §12.6 — the Quick Check, and the one authored thing that stands in for the
 * model answer this corpus does not have.
 *
 * **MEASURED:** 15 of the 32 sheets carry a self-check — every drawn sheet. It is
 * written `**Quick Check**: <question>` — a bold *inline* run opening a
 * paragraph, not a heading — so `sectionTitles`, `topicsFor` and the TOC are
 * all blind to it and the section spine cannot be used to find it. Sheet 1 is
 * `status: ready` and carries none, which is why §12.6 makes the component key
 * on this extractor returning non-null rather than on the declared status.
 *
 * **There is no authored model answer anywhere in the corpus.** Greps for
 * `**Answer`, `Model answer`, `Cevap` and `<details>` return nothing across the
 * 32 English sheets. So §5.10's `REVEAL MODEL ANSWER` is withdrawn, there is no
 * field here for an answer, and nothing in this file may invent one (§11.25):
 * a reveal button over a generated answer is the §1 failure in one control.
 * `summarySection` is what §12.6 reveals instead, labelled as what it is.
 *
 * Everything is read through `unfenced()`. The corpus has 44 tagged code
 * blocks, several of them markdown, so both `**Quick Check**` and `## Summary`
 * can appear inside a fence, where they are text about a sheet rather than the
 * sheet's own question.
 *
 * **The Turkish form is deliberately not handled.** Six `_tr.md` siblings carry
 * `**Hızlı Kontrol**`, but the loader skips every `_tr.md` file, so no Turkish
 * body ever reaches this module — 25 of the 32 are 73–153-word placeholders
 * anyway, and §12.0 defers the Turkish routes to a later slice. A second label
 * here would be a branch no test could reach through the loader, and §11.25's
 * rule cuts both ways: code that claims to read something nothing hands it is
 * as untrue as a hand-maintained number.
 */

/** The interface is one field because one field is all the corpus authored. */
export interface QuickCheck {
  /**
   * The question as written, inline markdown intact. Sheet 9 emphasises
   * *unrelated* and sheet 12 sets `PreToolUse` in code; flattening either
   * changes what is being asked, so the run is handed on and the caller
   * renders it.
   */
  question: string
}

/** The authored label, exactly. A bold run, at the head of a paragraph. */
/**
 * Two labels, not one. Thirteen sheets say `**Quick Check**` and sheet 1 says
 * `**Quiz Yourself**` — the same shape, in the same position, doing the same
 * job, under a name the author happened to type differently that day.
 *
 * Keying on one label would leave sheet 1 the only drawn sheet without a
 * self-check component while its fourteen siblings have one, which is a gap a
 * reader would notice and could not explain. The label is not the fact; the
 * question is. Accepting both is what makes the derived count — 15, one per
 * drawn sheet — true of the corpus rather than true of a regex.
 *
 * MEASURED across `mini-courses/`: 16 `**Quick Check**` (14 in loaded modules,
 * 2 in `scratchpad/`, which neither site publishes), 1 `**Quiz Yourself**`
 * (sheet 1), 7 `**Hızlı Kontrol**` (all in `_tr.md` siblings, which the loader
 * never reads — see the note on the Turkish form below).
 */
const QUICK_CHECK = /^\*\*(?:Quick Check|Quiz Yourself)\*\*[ \t]*:[ \t]*(.*)$/
/** §12.6 item 3 — the sheet's own summary, English only, h2 only. */
const SUMMARY_HEADING = /^##[ \t]+Summary[ \t]*$/
/** Any ATX heading: where a section, and a paragraph, ends. */
const HEADING = /^#{1,6}[ \t]/
/**
 * A line that cannot be a continuation of the paragraph above it: blank, a
 * heading, a list item or a block quote. Markdown lets all four interrupt a
 * paragraph, so a `**Quick Check**` question hard-wrapped onto a second line
 * stops here rather than absorbing the list that follows it.
 */
const ENDS_PARAGRAPH = /^(?:[ \t]*$|#{1,6}[ \t]| {0,3}(?:[-*+]|\d+[.)])[ \t]| {0,3}>)/

/**
 * True where `lines[at]` opens a paragraph: the start of the document, after a
 * blank line, or straight after a heading. Without this a `**Quick Check**`
 * run wrapped onto the second line of a sentence would read as the sheet's
 * question, and it would not be one — it would be prose about one.
 */
function opensParagraph(lines: readonly string[], at: number): boolean {
  if (at === 0) return true
  const previous = lines[at - 1]
  return previous.trim() === '' || HEADING.test(previous)
}

/** The rest of the paragraph starting at `at`, joined into one line. */
function paragraphFrom(lines: readonly string[], at: number): string[] {
  const rest: string[] = []
  for (const line of lines.slice(at + 1)) {
    if (ENDS_PARAGRAPH.test(line)) break
    rest.push(line.trim())
  }
  return rest
}

/**
 * The sheet's Quick Check, or null. The first one wins: no sheet carries two,
 * and a sheet that grew a second would be an authoring error rather than two
 * questions to ask.
 *
 * `stripBuildFurniture` runs first so the answer is the same whether the
 * caller hands over the loader's stripped body or the raw file off disk — the
 * same contract `countDiagrams` keeps.
 */
export function quickCheckOf(body: string): QuickCheck | null {
  const lines = unfenced(stripBuildFurniture(body))

  for (let at = 0; at < lines.length; at += 1) {
    const match = QUICK_CHECK.exec(lines[at])
    if (!match || !opensParagraph(lines, at)) continue

    const question = [match[1].trim(), ...paragraphFrom(lines, at)]
      .filter((part) => part !== '')
      .join(' ')
    if (question !== '') return { question }
  }

  return null
}

/**
 * §12.6 item 3 — the sheet's own authored `## Summary` section, as markdown,
 * heading excluded: the reveal panel supplies the label, and the label is the
 * whole point of revealing this rather than "the answer".
 *
 * **The Quick Check paragraph is removed.** All 14 of them are authored inside
 * the Summary section, so returning the section whole would reprint the
 * question directly under the reader's own answer to it. That also keeps this
 * function in step with the rehype transform that lifts the same paragraph out
 * of the prose tree (§12.6, the `rehypeDropDek` pattern).
 *
 * Nothing else is edited out. Sheets 1–7 end their summary with `Keep going!
 * 🚀` or `Onward to Module 3!`, which §12.14.1 would ban from a string table —
 * but §12.14.1 governs the site's own copy, and this is the author's text,
 * already rendered further up the same sheet. Rewriting quoted content to suit
 * the site's register would be the site putting words in the author's mouth.
 *
 * Returns null on the 17 undrawn sheets, which authored no summary.
 */
export function summarySection(body: string): string | null {
  const lines = unfenced(stripBuildFurniture(body))
  const start = lines.findIndex((line) => SUMMARY_HEADING.test(line))
  if (start === -1) return null

  const kept: string[] = []
  let inQuickCheck = false

  for (let at = start + 1; at < lines.length; at += 1) {
    const line = lines[at]
    if (HEADING.test(line)) break

    if (QUICK_CHECK.test(line) && opensParagraph(lines, at)) {
      inQuickCheck = true
      continue
    }
    if (inQuickCheck) {
      if (!ENDS_PARAGRAPH.test(line)) continue
      inQuickCheck = false
      // The blank line that terminates the removed paragraph goes with it:
      // keeping it would leave a three-newline gap where a paragraph used to
      // be, and the caller renders this string as markdown. Anything else that
      // ended it — a list, a quote — is content and is kept.
      if (line.trim() === '') continue
    }
    kept.push(line)
  }

  const section = kept.join('\n').trim()
  return section === '' ? null : section
}
