import { DIAGRAM_HEADING, unfenced } from './lines'
import { scheduleOfParts } from './schedule'

/**
 * §4.9 — the `TOPICS` column on a category page: "first three h2 section
 * titles for ready sheets; the first three schedule-of-parts items for
 * drafts."
 *
 * Both halves are read out of the file. A drawn sheet's sections are what a
 * reader will actually meet; an undrawn sheet's schedule of parts is the bill
 * of materials §4.5 already prints on the sheet itself. Neither is a summary
 * somebody wrote for the listing, which is the one thing §11.25 forbids: a
 * hand-maintained topic line drifts the first time a section is renamed and
 * the table starts describing a sheet that no longer exists.
 */

/** §5.6 — the section-mark rule. Only these h2s carry a Roman numeral. */
const ROMAN_H2 = /^([IVXLC]+)\.\s+/
/** An h2, and only an h2: an h3 is a sub-heading, not a section. */
const H2 = /^##[ \t]+(.+?)[ \t]*$/
/** §4.9's own limit, and the reason it is three: the column is 168px wide. */
const TOPIC_LIMIT = 3

/**
 * The h2s a drawn sheet is made of, in document order, with the Roman numeral
 * split off exactly as §5.6 splits it for the section spine — the numeral is
 * the sheet's own coordinate system and it means nothing in a listing.
 */
export function sectionTitles(markdown: string): string[] {
  const titles: string[] = []

  for (const line of unfenced(markdown)) {
    const heading = H2.exec(line)
    if (!heading) continue

    const text = heading[1]
    // `## Mermaid Diagram: …` introduces the fence under it and describes no
    // topic. The sheet still prints the heading — see `DIAGRAM_HEADING` — so
    // this column is deliberately one entry shorter than the section spine.
    if (DIAGRAM_HEADING.test(text)) continue
    titles.push(text.replace(ROMAN_H2, ''))
  }

  return titles
}

/** The slice of a module this column reads. `CourseModule` is mapped onto it. */
export interface TopicSource {
  status: 'ready' | 'draft'
  /** The body after the B1 strip, so the deleted rail cannot name a topic. */
  body: string
}

/**
 * The topics a listing prints for one sheet — at most three, and fewer without
 * apology. An empty list renders as an empty cell, never as "coming soon"
 * (§11.30).
 */
export function topicsFor(module: TopicSource, limit = TOPIC_LIMIT): string[] {
  const topics = module.status === 'ready'
    ? sectionTitles(module.body)
    : scheduleOfParts(module.body)

  return topics.slice(0, limit)
}
