import { unfenced } from './lines'
import { stripBuildFurniture } from './strip'

/**
 * §12.7 — the checklist a reader runs against their own repository.
 *
 * **MEASURED:** 8 `- [ ]` items, all of them in `2_intermediate/13_security.md`,
 * none on the other 31 sheets. That is the `CHECKLIST` row of §12.5.1's XP
 * table — eligible today, one sheet — and §12.5.4 is why there is no checklist
 * column on the manifest: 31 dashes and one `8` is absent, not empty.
 *
 * **Which of the two hooks §12.7 names, and why this one.** GFM only makes a
 * task item when `[ ]` opens the list item's first paragraph, and the
 * authoritative reading of that is the hast tree `rehypeTaskListMarkers`
 * decorates — but that tree only exists behind an `await` and only for a sheet
 * the renderer has been asked to render. This module takes the raw-line route
 * instead: synchronous, available for all 32 sheets, cheap enough to run inside
 * `curriculumFacts()`. The price is that the two can disagree, so §12.7
 * requires the corpus total to be cross-checked against the hast route, and
 * `tests/unit/content/checklist.test.ts` does exactly that, per sheet.
 *
 * The two places the routes could part company are both handled here. A
 * fenced `- [ ]` is not a task item, and the corpus really does contain
 * markdown inside its 44 tagged code blocks, so everything goes through
 * `unfenced()`. And an indented code block is not a list either, which is why
 * the leading indent is capped at CommonMark's three spaces rather than left
 * open.
 *
 * Items are keyed by **index within the sheet**, never by their text: the
 * reader's ticks live in `record.sheets[slug].checklist[index]` (§12.1.3), and
 * a key derived from the text would silently discard a tick the day an author
 * fixes a typo. One index space per sheet, not one per list: sheet 13 authors
 * two groups either side of a paragraph and they number 0–7 straight through.
 */

export interface ChecklistItem {
  /** Position in the sheet, from zero. The record's key for this item. */
  index: number
  /**
   * The item as written, inline markdown intact — item 8 of sheet 13 opens
   * `**The adaptive round:**`, and that emphasis is the author's structure.
   */
  text: string
}

/**
 * A GFM task item: at most three spaces of indent, a bullet, a checkbox, and
 * the whitespace GFM requires between the checkbox and the item text. The
 * authored state inside the brackets is read and then discarded — §12.7 gives
 * the tick to the reader's record, so the file's own `[ ]` says only "this is
 * an item", and an authored `[x]` would not be a claim about this reader.
 */
const TASK_ITEM = /^ {0,3}[-*+][ \t]+\[[ xX]\][ \t]+(\S.*?)[ \t]*$/

/**
 * Every checklist item on the sheet, in document order. An empty array on the
 * 31 sheets that have none — never null, because "no items" is a count and the
 * caller renders the slot absent (§12.5.4) rather than testing for a dash.
 *
 * `stripBuildFurniture` runs first so the answer is the same whether the caller
 * hands over the loader's stripped body or the raw file off disk — the same
 * contract `countDiagrams` keeps.
 */
export function checklistOf(body: string): ChecklistItem[] {
  const items: ChecklistItem[] = []

  for (const line of unfenced(stripBuildFurniture(body))) {
    const match = TASK_ITEM.exec(line)
    if (!match) continue
    items.push({ index: items.length, text: match[1] })
  }

  return items
}
