import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_VIEW_ID, VIEWS, VIEW_IDS, isViewId } from '@/lib/catalog/views'
import { CATALOG_VIEWS, EMPTY_RECORD } from '@/lib/record/schema'
import { setCatalogView } from '@/lib/record/events'
import { coerceRecordData } from '@/lib/record/validate'

/**
 * M12 / D13 — the three catalog views, and the channel-A selector list that
 * reveals one of them.
 *
 * **Channel A cannot loop.** Which view is showing is decided by
 * `data-hl-view` on `<html>` against `data-view` on a descendant, and CSS has
 * no operator that relates a root attribute to a descendant's attribute value
 * — the same wall `scripts/curriculum-css.mjs` exists because of. So the
 * relation is a LIST, and a list is the one thing a fourth view silently
 * invalidates: the failure is not a crash, it is a view a reader can select
 * and never see.
 *
 * So the list is checked against `VIEW_IDS` rather than against a
 * transcription of itself, in both places it appears — the carrier and the
 * forced-colours block — and the fallback branch is checked too, because that
 * branch is what every reader with scripting off gets.
 *
 * **M16 moved where the list lives.** It was `src/app/manifest.css`, one of the
 * eleven stylesheets the milestone deleted, and the catalog is rebuilt in stage
 * 4 against `playground/03-catalog.html`. So the rules below read whatever
 * surface stylesheets exist and are guarded on the list being declared at all:
 * they bind the moment the catalog has one, and nobody has to remember to
 * switch them on. The two describes either side of them are about the
 * vocabulary and the record, and never needed a stylesheet.
 */

const NOT_A_SURFACE = new Set(['globals.css', 'lokum-modules.css'])
const APP_DIR = join(import.meta.dirname, '../../../src/app')

const CSS = readdirSync(APP_DIR)
  .filter((name) => name.endsWith('.css') && !NOT_A_SURFACE.has(name))
  .sort()
  .map((name) => readFileSync(join(APP_DIR, name), 'utf8'))
  .join('\n')
  // Comments out, so prose naming a selector is never counted as one.
  .replace(/\/\*[\s\S]*?\*\//g, ' ')

/** Has any surface declared the reveal list yet? */
const REVEALED = /\[data-view=/.test(CSS)

/** Every distinct capture of `pattern`, in the order found. */
function captures(pattern: RegExp, source: string = CSS): string[] {
  return [...new Set([...source.matchAll(pattern)].map((match) => match[1]))]
}

const FORCED_AT = CSS.search(/@media \(forced-colors: active\)/)
const MAIN = CSS.slice(0, FORCED_AT)
const FORCED = CSS.slice(FORCED_AT)

describe('the three views are one closed vocabulary', () => {
  it('names each view once, with a word and a sentence for the toggle', () => {
    expect(VIEWS.map((view) => view.id)).toEqual([...VIEW_IDS])
    for (const view of VIEWS) {
      expect(view.name.trim(), view.id).not.toBe('')
      expect(view.answers.trim(), view.id).not.toBe('')
    }
  })

  it('is the same list the record schema and the boot script embed', () => {
    expect([...CATALOG_VIEWS]).toEqual([...VIEW_IDS])
  })

  it('defaults to the first view, which is the one the prerender is in', () => {
    expect(DEFAULT_VIEW_ID).toBe(VIEW_IDS[0])
  })

  it('refuses an id it does not know, because the id reaches a selector', () => {
    for (const id of VIEW_IDS) expect(isViewId(id)).toBe(true)
    for (const value of ['', 'TABLE', 'list', 7, null, undefined, {}])
      expect(isViewId(value), JSON.stringify(value)).toBe(false)
  })
})

describe.skipIf(!REVEALED)('the reveal list covers every view, and one fallback', () => {
  it('names all three views in the carrier', () => {
    const named = captures(/html\[data-hl-view="([a-z]+)"\] \[data-view="[a-z]+"\]/g, MAIN)
    expect(named.sort()).toEqual([...VIEW_IDS].sort())
  })

  /**
   * A mismatched pair would show one view for another's stored preference:
   * plausible, and wrong, which is the worst kind of quiet defect. Same check
   * `category-css.test.ts` makes on the per-module lists.
   *
   * **The middle of the selector is matched as anything-but-a-separator, and
   * that is a fix rather than laziness.** This regex used to name the toggle's
   * class literally, so M16 stage 4's rename would have made it match nothing
   * at all — and a pairing check that matches nothing reports zero mismatches
   * and passes. It would have gone VACUOUS rather than red, which is the one
   * failure mode a guard may not have. `[^,{]*?` cannot cross a comma or a
   * brace, so it still stays inside one selector, and no future rename can
   * silence it.
   */
  it('pairs each selector’s two view ids', () => {
    const mismatched = [
      ...CSS.matchAll(/html\[data-hl-view="([a-z]+)"\][^,{]*?\[data-view="([a-z]+)"\]/g),
    ]
      .filter((match) => match[1] !== match[2])
      .map((match) => `${match[1]} → ${match[2]}`)
    expect(mismatched).toEqual([])
  })

  it('falls back to the default view when nothing is stamped', () => {
    // The reader who has not chosen, and every reader with scripting off.
    expect(MAIN).toContain(`html:not([data-hl-view]) [data-view="${DEFAULT_VIEW_ID}"]`)
  })

  it('repeats the same list under forced colours, for the showing button', () => {
    const named = captures(
      /html\[data-hl-view="([a-z]+)"\] \.bz-viewbtn\[data-view="[a-z]+"\]/g,
      FORCED,
    )
    expect(named.sort()).toEqual([...VIEW_IDS].sort())
    expect(FORCED).toContain(`html:not([data-hl-view]) .bz-viewbtn[data-view="${DEFAULT_VIEW_ID}"]`)
  })

  /**
   * The carrier sets custom properties and every rule after it reads them —
   * `category.css`'s arrangement for the five level hues, for the same reason. If
   * a rule names a view id outside the two lists above, the relation has a
   * second author.
   */
  it('leaves the view ids to the carrier and the forced-colours twin', () => {
    // Three views plus one fallback, twice: the carrier and the forced block.
    // Counted as occurrences rather than lines, because stripping a multi-line
    // comment joins the lines around it.
    const named = [...CSS.matchAll(/data-hl-view[\])=]/g)]
    expect(named).toHaveLength((VIEW_IDS.length + 1) * 2)
  })
})

describe('the preference is written through the record, once', () => {
  it('records a view and is idempotent', () => {
    const once = setCatalogView(EMPTY_RECORD, 'table')
    expect(once.prefs.catalogView).toBe('table')
    // Same value in, same object out: `update` is called on every press and a
    // new object per press would wake every subscriber for nothing.
    expect(setCatalogView(once, 'table')).toBe(once)
  })

  it('touches nothing else in the record — a view is not work', () => {
    const chosen = setCatalogView(EMPTY_RECORD, 'cards')
    expect(chosen.days).toEqual(EMPTY_RECORD.days)
    expect(chosen.sheets).toEqual(EMPTY_RECORD.sheets)
    expect(chosen.identity).toEqual(EMPTY_RECORD.identity)
    expect(chosen.meta).toEqual(EMPTY_RECORD.meta)
  })

  it('survives the round trip through the coercer, and a stranger does not', () => {
    for (const id of VIEW_IDS) {
      expect(coerceRecordData({ prefs: { catalogView: id } }).prefs.catalogView).toBe(id)
    }
    for (const value of ['list', '', 7, true, {}]) {
      expect(
        coerceRecordData({ prefs: { catalogView: value } }).prefs.catalogView,
        JSON.stringify(value),
      ).toBeNull()
    }
  })
})
