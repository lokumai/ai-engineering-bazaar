import { thousands, type SheetFacts } from '@/lib/content/title-block'
import { LANG_DISPLAY } from '@/lib/content/derive'

/**
 * The module's own facts, as the mockup draws them — M16 stage 5.
 *
 * Reference: `playground/01-theme-T4-ground-G3-powder.html`'s `div.row`, which
 * sits between the display heading and the prose and holds exactly three
 * things: a `tag` naming the level with its hue dot, a `tag` giving the
 * module's place in the set, and one bare line of the facts that decide
 * whether to open it.
 *
 * ## What this replaced, and what happened to the other nine rows
 *
 * `TitleStrip` — a twelve-row `<dl>` instrument panel of `dt`/`dd` pairs, in
 * mono capitals, with a stamp grid at the end of it. `04`'s own annotation
 * records the same reduction for its rail: *"Eleven rows became three."*
 *
 * Every fact keeps a home, and the home is the one the mockup already draws:
 *
 * - `LEVEL` and `POSITION` are the two tags.
 * - `LENGTH` and `LANG` are the third span, in the mockup's own grammar.
 * - `REQUIREMENTS` is the action row's quiet `Requirements (n)` button, which
 *   `01` draws and which turns the dependency list into a disclosure.
 * - `REVISION` and `DATE` are printed by the footer, which §5.2 already gives
 *   this page's own revision — so they stop being printed twice.
 * - `CHECKED BY`, `REPOSITORIES` and the stamps are a `leaf` card below the
 *   action row, with the other things a reader does after reading.
 * - `DRAWING`, `UNLOCKS`, `SOURCES` and `MARKED BY` stop being printed. Nothing
 *   a reader can act on is lost: `DRAWING` is the module number, which both
 *   tags and the footer carry; `SOURCES` counts links they can see; `UNLOCKS`
 *   is the inverse of a relation the disclosure states; and `MARKED BY` was
 *   the same constant on all thirty-three.
 *
 * ## Two places this follows the product rather than the mockup
 *
 * `01` writes the languages as `English & Türkçe`. The product has one
 * spelling of that fact — `EN · TR`, from `LANG_DISPLAY` — and the table, the
 * card and the index all use it; a second spelling on one surface is what the
 * copy register exists to stop. The mockup specifies the STRIP, not the words
 * in it.
 *
 * And a draft prints no third span at all rather than a row of dashes. `01`
 * draws only a written module, so this is derived (**D30**): `StatusBand`
 * above already says `Planned · Schedule of parts only`, and three dashes
 * under it would be the same sentence in punctuation.
 */
export function FactsStrip({ facts, category }: { facts: SheetFacts; category: string }) {
  const drawn = facts.status === 'ready'

  return (
    <div className="bz-facts">
      {/* The hue rides the dot and the level's NAME is beside it, so forced
          colours loses the colour and keeps the fact (SC 1.4.1). */}
      <span className="bz-tag" data-cat={category}>
        <i aria-hidden="true" />
        {facts.categoryTitle}
      </span>

      <span className="bz-tag">
        Module {facts.position.index} of {facts.position.of}
      </span>

      {drawn && (
        <span>
          {facts.duration} min · {thousands(facts.extent)} words · {LANG_DISPLAY[facts.lang]}
        </span>
      )}
    </div>
  )
}
