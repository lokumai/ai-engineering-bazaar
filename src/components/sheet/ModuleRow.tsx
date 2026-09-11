import Link from 'next/link'
import type { SheetRow } from '@/lib/content/rows'

/**
 * §5.3 — the module row. **There is no module card.** A card grid is not used
 * anywhere on this site; if you find yourself building one, the answer is a
 * table row (§11.2).
 *
 * The whole row is one link target: the anchor lives in the title cell and a
 * stretched pseudo-element covers the row, so a pointer can hit any cell and
 * `Tab` reaches the row exactly once (§10.3). Its focus ring is drawn on that
 * pseudo-element rather than around the title text, which is the only way to
 * get §5.3's "offset -2px so it sits inside the row".
 *
 * A sheet that is not drawn is marked here and drawn as a hidden line in CSS:
 * its one completion square is dashed, which is the drawing set's convention for
 * a line that is planned and not yet cut. Line type first, colour second
 * (§10.4) — and the word, which M17 took off the screen, is still said (see
 * `RowState`).
 *
 * **There is no dash down the `#` cell, and this docblock claimed one.** The
 * leading edge of `.bz-row[data-draft]` is a 3px TRANSPARENT border and
 * measures `solid`; `bazaar.css` records that the caution ink was deliberately
 * removed for a text-contrast floor, and the line went with it. The only
 * `dashed` rule any row has is the completion square, in `catalog.css`.
 *
 * The ninth column (§4.8, §12.18) is the one cell that is about the reader, and
 * it is drawn in the unsigned state on every prerender, because that is the
 * only thing build-time HTML can truthfully claim about a reader it has never
 * met (§12.2). One document-level island fills it after mount; this component
 * stays hook-free, because `Catalog` renders it through `SheetIndex` as a
 * client island while the six level pages render the same table from a server
 * component — a hook here works under the island and fails the static export
 * of the other six (§12.2, "where hooks may not go").
 */

/**
 * Which context columns this page's table carries (§4.8, §4.9).
 *
 * M17 collapsed three listings into one, and with them the `subsystem` variant:
 * every table on the site now prints the topics, because that was the one thing
 * the retired `/courses/` pages could show and the catalog could not.
 *
 * - `both` — the whole catalog, where the level is a column because the rows
 *   come from every level and the hue on a row's leading edge may not be the
 *   only thing that says which (SC 1.4.1, §13.1.4).
 * - `topics` — a level page, where the level is the page's own heading and a
 *   column repeating it eight times says nothing.
 */
export type RowColumn = 'topics' | 'both'

/**
 * M17 — §4.8's `STATUS` column is gone, and this is what replaced it.
 *
 * The author's reasoning: *"if something is not ready it is not clickable by
 * default and user can understand it already."* The premise is not true here —
 * a planned module HAS a page, the A4 anatomy that prints its schedule of
 * parts, and withholding the link would delete a capability rather than
 * declutter a column — so the column went and the link stayed.
 *
 * **What carries the state instead, and none of it is colour.** A planned row
 * prints `—` in `Length` and `—` in `Sources`, because a sheet nobody has
 * written declares no length and cites nothing; and its completion cell holds
 * ONE DASHED square where a written module holds SOLID ones, because there is
 * no slot on it that could ever be filled (`SignOffSquares`). An em dash is
 * typographic content and a border style is not a colour: both survive
 * `forced-colors: active` exactly as they are, which is what §13.1.3 asks of a
 * non-colour carrier and what the word in that column used to do.
 *
 * **MEASURED over the 33 rows, because this said "three or four" and that is
 * not what the corpus draws:** every one of the 14 planned rows holds exactly
 * one square; the 19 written rows hold two (7 of them), three (11) or four (1).
 * The count is the slots the sheet SUPPLIES, so it is a fact about the sheet
 * and not a number this component may promise. What separates the two kinds is
 * the STYLE, which is the same for all of them either way.
 *
 * **The word itself is not lost, it is said rather than shown** (D61). A screen
 * reader still hears `Planned` as part of the row's own header, so nothing that
 * could only be read as text has been taken from anybody; it has left the
 * screen, where four other cells were already saying it.
 */
function RowState({ row }: { row: SheetRow }) {
  // Inside the row header and outside its link: the link names the module, and
  // the header adds what the drawing is. Putting it in the link would make the
  // module's own name read `LLM Fundamentals Planned` everywhere a list of
  // links is read out, including the browser's own.
  return <span className="bz-said">{row.status}</span>
}

/**
 * §4.8 column 9 / §5.9 — the sign-off squares: `14 × 14`, no text, the slot
 * name on `title`, and **no interactive control of any kind**. `.bz-row-link`'s
 * stretched pseudo-element covers the row with `inset: 0` so that a pointer can
 * hit any cell and `Tab` reaches the row exactly once (§10.3); a control here
 * would sit under it, unclickable, and lifting it out would give the row a
 * second tab stop. Signing off happens on the sheet, which is the only place
 * the criteria are stated (§12.4.1).
 *
 * Which squares a sheet draws is `row.slots` — absent, not empty (§5.9, §12.7):
 * a sheet with no self-check draws no `QUIZ` square rather than one that can
 * never fill. A sheet nobody has drawn awards nothing (§11.28), so it draws one
 * square as a hidden line and carries no slug for the island to look up: there
 * is nothing about it that could ever be filled.
 *
 * The slug goes on `data-hl-signoff-cell`, not on `data-hl-signoff`, which
 * `lib/record/keys.ts` owns for the sheet's sign-off control (§12.16's `s`).
 * There is no control in this cell and the two must not answer one selector.
 *
 * The squares are `aria-hidden`. They carry no text by specification, a
 * `title` on a non-interactive span is a pointer affordance and nothing more,
 * and the same state is available as text twice over — on the sheet itself, and
 * on this page through the `SIGNED OFF` / `UNSIGNED` chips and their announced
 * count. §10.4's floor is that colour is never the sole carrier, and here the
 * carrier is stroke weight and fill before it is colour at all.
 */
function SignOffSquares({ row }: { row: SheetRow }) {
  if (!row.drawn) {
    return (
      <span className="bz-signoff-cell">
        <span
          className="bz-signoff-square"
          data-drawn="false"
          title="PLANNED"
          aria-hidden="true"
        />
      </span>
    )
  }

  return (
    <span className="bz-signoff-cell" data-hl-signoff-cell={row.slug}>
      {row.slots.map((slot) => (
        <span
          key={slot}
          className="bz-signoff-square"
          data-hl-slot={slot}
          data-signed="false"
          title={slot}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

/**
 * §13.5 surface 2 — which subsystem's flavour this row's leading rule takes.
 *
 * Read off the slug's own first segment, exactly as `lib/record/boot.ts` reads
 * it: the slug IS the identity (§12.1.3), the set has been renumbered before,
 * and a second map from row to category is a second thing that can drift. No
 * import is added for it, which matters here — `Catalog` is `'use client'`
 * and pulls this component into the browser bundle (§12.2).
 */
function categoryOf(slug: string): string {
  return slug.split('/')[0] ?? ''
}

export function ModuleRow({ row, column }: { row: SheetRow; column: RowColumn }) {
  const draft = !row.drawn

  /**
   * §13.5 surface 2 — the leading rule takes the subsystem's hue, resolved
   * on channel A from `hl-cat-<slug>-started` / `-complete` (§12.2). The row
   * already prints its level in words — in the `Level` column on the whole
   * catalog, in the page's own heading on a level page — so the hue reports
   * what the row already states and carries nothing alone (SC 1.4.1, §13.1.4).
   *
   * **Drawn rows only, and that is T6 rather than taste.** A draft row's `#`
   * cell already carries `--color-caution` as its hidden-line ink, and
   * §13.14's amended T6 is that a category hue and a semantic token never
   * appear on the same element — `.bz-row.bz-cat-tint > :first-child` would
   * put both on that one cell. A sheet nobody has drawn can never be signed
   * off either (§12.4.1), so it has nothing of its own to report here.
   */
  return (
    <tr
      className={draft ? 'bz-row' : 'bz-row bz-cat-tint'}
      data-cat={draft ? undefined : categoryOf(row.slug)}
      data-draft={draft ? '' : undefined}
    >
      {/* The caution ink for a draft row's number is a rule on the row rather
          than a class on the cell (`.bz-row[data-draft] .bz-row-number`): the
          row already says which it is, and a second author of one state is how
          two spellings of it appear. */}
      <td className="bz-row-number">{row.number}</td>

      <th scope="row" className="bz-row-title">
        <Link href={row.path} className="bz-row-link">
          {row.title}
        </Link>
        <RowState row={row} />
      </th>

      {column === 'both' && <td className="bz-row-context">{row.subsystem.title}</td>}

      <td className="bz-row-context">
        {/* §4.9 — at most three, joined on one line and truncated where the
            column runs out. The sheet itself prints every section it has;
            this is the column that says what it is about, not a summary. */}
        <span className="bz-row-topics" title={row.topics.join(' · ')}>
          {row.topics.join(' · ')}
        </span>
      </td>

      <td className="bz-row-value">{row.extent}</td>
      <td className="bz-row-value">{row.sources}</td>
      <td className="bz-row-value">{row.lang}</td>

      <td className="bz-row-signoff">
        <SignOffSquares row={row} />
      </td>

      {/* §4.6's first relation, from the `prerequisites` frontmatter (B7). The
          index's own statement tells the reader to read in any order the
          dependency graph allows; this is that graph, one row at a time. */}
      <td className="bz-row-value">{row.requires}</td>
    </tr>
  )
}
