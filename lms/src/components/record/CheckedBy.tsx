'use client'

import { type CurriculumFacts, sheetStamps } from '@/lib/record/derive'
import { useHydrated, useRecord } from '@/lib/record/store'
import { Stamp } from './Stamp'

/**
 * §12.3.1, §7.4 — the two title-block values that belong to the reader.
 *
 * Both are channel B (§12.2): the build knows which rows and which slots a
 * sheet has, and cannot know anything about who is reading it. So the server
 * renders the honest empty form — `—` for a sheet nobody has signed, every slot
 * unearned with its live count at zero — and the store fills them in after the
 * hydration commit. `useRecord()` returns the frozen `EMPTY_RECORD` on the
 * server and in the first client render, which is what makes that automatic
 * rather than a thing each component has to remember.
 *
 * They live in one file because they are one job: the reader-state half of
 * §5.5's title block, mounted as leaves by a server parent that stays a server
 * component (`TitleBlock` → here, the same shape as `SiteFooter` → `SheetLabel`
 * and `SheetRail` → `SectionSpine`).
 */

/**
 * §12.3.1 — the reader takes `CHECKED BY`.
 *
 * | sheet state            | prints                          |
 * |------------------------|---------------------------------|
 * | signed off, name set   | the name, as typed, in `<bdi>`   |
 * | signed off, name skipped | `UNSIGNED`                    |
 * | not signed off         | `—`                             |
 *
 * A draft sheet has no such row at all, which is the caller's call and not
 * this component's: `carriesCheckedBy` in `lib/content/title-block.ts` decides
 * it at build time, because "nobody has drawn this sheet" is a build-time fact.
 *
 * The name is printed **as typed** and in `normal-case`. The row carries
 * `.hl-mark`, which sets `text-transform: uppercase`, and CSS casing is
 * locale-sensitive off the element's `lang`: `ilker` under `lang="en"` uppercases
 * to a dotless `I` where a Turkish reader expects `İ`. Mis-casing the first
 * letter of somebody's own name in their own title block is the single most
 * visible i18n failure available here (§12.3.4), so the transform is refused
 * rather than corrected.
 *
 * `<bdi dir="auto">` isolates the name so an RTL name cannot re-order the
 * label and value around it — the sanitiser already removes the bidi overrides
 * that could do it deliberately (§12.3.4), and this handles the ordinary case.
 */
export function CheckedBy({ slug }: { slug: string }) {
  const record = useRecord()
  const hydrated = useHydrated()

  // Both "no record has been read yet" and "this sheet is not signed off"
  // print `—`, and that is not a shortcut: at the instant the server rendered
  // this, no sheet was signed off by anybody, and the dash is the ISO 128
  // hidden line the rest of the set already reads as "not yet".
  const signedOff = hydrated ? (record.sheets[slug]?.signedOff ?? null) : null
  if (signedOff === null) return <>—</>

  const name = record.identity.name
  // §12.3.2 — the skipped state is legitimate and truthful. Never a
  // placeholder person, never an invented name.
  if (name === null || name.trim() === '') return <>UNSIGNED</>

  return (
    <bdi dir="auto" className="normal-case">
      {name}
    </bdi>
  )
}

/** What `sheetStamps` needs to know about one sheet, and nothing else. */
export type SheetStampFact = CurriculumFacts['sheets'][number]

/**
 * §7.4 / §5.9 — the sheet-level approval stamp grid.
 *
 * Renders **nothing** when the sheet has no slots (§5.9, §7.4, §11.25): a
 * draft sheet has none at all, and a sheet with no checklist gets a 2×1 grid
 * rather than an unattainable empty `CHECKLIST` box. Which slots exist is a
 * fact about the corpus, not about the reader, so the server and the first
 * client render agree on the list and only the counts inside it move — a text
 * change, not a structural one, which is the whole reason §12.2 puts this on
 * channel B and not on channel A.
 *
 * The slot itself is `Stamp`, which is hook-free and therefore renders happily
 * inside this island: §5.9's wording, thresholds and line types live in one
 * component so the title block, the dashboard shelf and the exported record
 * document cannot drift apart.
 *
 * `fact` is one sheet's facts, not the whole set's: `sheetStamps` consults
 * `facts.sheets` and nothing else, so shipping all 32 sheets' facts into every
 * module page's client payload to look one of them up would be weight for
 * nothing (§12.2's note on keeping the bridge small).
 */
/**
 * §12.9 — the `REPOSITORIES` row's value: how many the reader has registered
 * against this sheet.
 *
 * Why the row exists at all is in `lib/content/title-block.ts`, beside its
 * label: a reader registered three repositories and nothing in the title block
 * said so. Why it is a row rather than a stamp slot is there too.
 *
 * Three readings, and the difference between the first two matters:
 *
 * | state                        | prints |
 * |------------------------------|--------|
 * | no record read yet            | `—`    |
 * | read, nothing registered      | `0`    |
 * | read, n registered            | `n`    |
 *
 * `—` is §11.25's "this count was never taken", which is exactly true of a page
 * prerendered before the reader existed. `0` is a count that WAS taken and came
 * to zero. The `SOURCES` row two lines up makes the same distinction for the
 * same reason and its docblock says so: `SOURCES 0` is the true statement about
 * a sheet citing nothing, where `SOURCES —` claims nobody counted.
 */
export function Repositories({ slug }: { slug: string }) {
  const record = useRecord()
  const hydrated = useHydrated()

  if (!hydrated) return <>—</>
  return <>{record.sheets[slug]?.submittals.length ?? 0}</>
}

export function SheetStamps({ slug, fact }: { slug: string; fact: SheetStampFact }) {
  const record = useRecord()
  const slots = sheetStamps(record, { sheets: [fact], categories: [], traces: 0 }, slug)
  if (slots.length === 0) return null

  return (
    // §5.5 — a hairline rule, then the grid, inset 12px. The rule is a real
    // border because it is a hairline: only `--stroke-struct` has to be painted
    // (globals.css), and `--stroke-hair` is already a whole pixel.
    <div className="border-t border-line px-3 pb-3">
      <ul className="hl-stamp-grid" aria-label="Approval stamps">
        {slots.map((slot) => (
          <li key={slot.id}>
            <Stamp stamp={slot} size="slot" />
          </li>
        ))}
      </ul>
    </div>
  )
}
