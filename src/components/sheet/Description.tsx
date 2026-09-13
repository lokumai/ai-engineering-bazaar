import type { SheetRow } from '@/lib/content/rows'

/**
 * M20 — what a module IS, in the listing, behind a disclosure.
 *
 * The author: *"For the topics which we summarize what this is and describe,
 * please hide them under an accordion like component and make it openable using
 * a dropdown arrow… at a time only one description should be shown and in case
 * user clicks on the description arrow of another row, the previous one should
 * be closed smoothly."*
 *
 * ## Every part of that is native, and it was MEASURED rather than assumed
 *
 * `<details name="…">` is an exclusive accordion in the browser this suite
 * actually runs — Chrome 153 — so opening one panel closes its sibling with no
 * script at all; and `CSS.supports` returns true there for both
 * `interpolate-size: allow-keywords` and `selector(::details-content)`, which
 * are what let a panel ease open instead of snapping. So the whole deliverable
 * is zero JavaScript, which also means it works in the one state every island
 * on this site has to survive: the bundle blocked (§12.2).
 *
 * An engine without `interpolate-size` opens the panel instantly rather than
 * not at all, which is the house rule — the mechanism works everywhere and the
 * easing is the enhancement. An engine without `name` exclusivity would leave
 * two panels open; that is a degradation worth knowing about and it is the one
 * part that would need script to guarantee, so it is not added until some
 * engine that matters is shown to need it.
 *
 * ## Why the group name is document-wide, and why that is right
 *
 * **MEASURED on the built catalog: a module renders three times** — 33 rows, 33
 * cards and 33 board items in one document — so 33 sentences are 99 elements.
 * One `name` across all of them means only one panel can be open ANYWHERE,
 * which is exactly what the author asked for and costs nothing: two of the
 * three views are `display: none`, so the reader can only ever see one.
 *
 * **Nothing here generates an `id`.** An id derived from a module's slug would
 * appear three times in one document, which is invalid and makes every
 * `aria-labelledby` pointing at it ambiguous. A `<summary>` is its own
 * accessible name and the `<details>` is its own region, so no id is needed —
 * the trap is avoided by not walking into it rather than by scoping around it.
 *
 * ## What a planned module says
 *
 * Not a summary, because there is none: `schema.ts` requires one of a `ready`
 * module and a module nobody has written has nothing to summarise. It prints
 * its schedule of parts instead, **labelled as the schedule of parts** — the
 * author objected to a run of section headings standing in for a description,
 * and the objection is to the impersonation rather than to the headings. A
 * module with neither prints nothing at all (§11.30), which is the same refusal
 * the `—` cells already make: an empty cell says nobody wrote it, and "coming
 * soon" says something nobody measured.
 */

/**
 * One accordion group for the whole document, named once.
 *
 * Exported because the exclusivity IS the behaviour the author asked for, and a
 * second literal of this string somewhere else would silently split the group
 * in two — at which point two panels stay open and nothing fails.
 */
export const DESCRIPTION_GROUP = 'bz-description'

/** The arrow, which is the affordance the author named. It rotates in CSS. */
function Caret() {
  return (
    <svg
      className="bz-desc-caret"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 6.5 8 10.5 12 6.5" />
    </svg>
  )
}

export function Description({ row }: { row: SheetRow }) {
  const parts = row.summary === null ? row.topics : []

  // Neither a sentence nor a schedule: the cell is empty rather than apologetic.
  if (row.summary === null && parts.length === 0) return null

  return (
    <details className="bz-desc" name={DESCRIPTION_GROUP}>
      {/* The word and the arrow, and nothing else. `<summary>` is a button to
          assistive software and carries its own expanded state, so no
          `aria-expanded` is authored here — a second author of that state is
          how the picture and the sentence come apart. */}
      <summary className="bz-desc-trigger">
        Description
        <Caret />
      </summary>

      <div className="bz-desc-body">
        {row.summary !== null ? (
          /* The author's own frontmatter, byte for byte. Nothing in `src/` may
             restate a fact that lives in a markdown file, and this does not:
             it prints the one the file already carries. */
          <p className="bz-desc-text">{row.summary}</p>
        ) : (
          <>
            <p className="bz-desc-said">Planned. Its schedule of parts:</p>
            <ul className="bz-desc-parts">
              {parts.map((part) => (
                <li key={part}>{part}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  )
}
