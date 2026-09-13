import { thousands, type SheetFacts } from '@/lib/content/title-block'

/**
 * The module's own facts, under its title — M16 stage 5, cut back by M21.
 *
 * Reference: `playground/01-theme-T4-ground-G3-powder.html`'s `div.row`, which
 * sits between the display heading and the prose.
 *
 * ## M21 — two boxes and a language left, and one line of text stayed
 *
 * The author: *"under the title such as 'LLM Fundamentals' there is a line
 * having two boxes for showing the level and module X of N and minutes and then
 * words and then language. Remove all just keep the minutes and words as pure
 * text under the title/heading."*
 *
 * So the strip is `25 min · 2,317 words`, and nothing else. **Every fact it
 * dropped is still stated somewhere a reader can get at**, which is what made
 * the removal safe rather than a quiet loss:
 *
 * - **the LEVEL** — the breadcrumb, on every module page, in words:
 *   `Home / Catalog / Fundamentals / …`. It is also the rail's open group. The
 *   tag was a colour carrier and its own comment said so — *"the hue rides the
 *   dot and the level's NAME is beside it, so forced colours loses the colour
 *   and keeps the fact"* — and the breadcrumb carries the same fact with no hue
 *   at all, which is a stronger answer to SC 1.4.1 rather than a weaker one.
 *   `colour-not-alone.spec.ts` reads the breadcrumb now.
 * - **`Module 3 of 8`** — the footer prints `MODULE 1 OF 33` on all
 *   thirty-three, and `site-footer.spec.ts` asserts it; the rail states the
 *   level's own count beside its name.
 * - **`EN · TR`** — it goes because the site cannot serve it. M19 owns the
 *   second language and makes it a URL rather than a printed claim (M20 took
 *   the same line off the catalog).
 *
 * ## What a draft prints, and why it is nothing
 *
 * A module nobody has written declares no duration and has no words to count,
 * so there is no line — and a row of dashes would be the same sentence in
 * punctuation. `StatusBand` above it already says `Planned · Schedule of parts
 * only`, which is the statement, and §11.30 permits the absence. This is the
 * same refusal the strip already made about its third span before M21; what
 * changed is that the two tags are no longer there to render in its place.
 *
 * `.bz-tag` is not deleted. It stays in the language as the transcription of
 * `01`'s own `.tag` — `transcription.test.ts` still compares it — and its
 * fidelity role moves to `DELIBERATELY_ABSENT` with this reason, which is the
 * bargain `node` already makes there.
 */
export function FactsStrip({ facts }: { facts: SheetFacts }) {
  if (facts.status !== 'ready') return null

  return (
    <p className="bz-facts">
      {facts.duration} min · {thousands(facts.extent)} words
    </p>
  )
}
