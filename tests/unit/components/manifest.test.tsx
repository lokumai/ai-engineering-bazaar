import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SIGN_OFF_SELECTORS, SignOffMarks } from '@/components/record/SignOffMarks'
import { ModuleRow } from '@/components/sheet/ModuleRow'
import { Catalog, NoMatch } from '@/components/catalog/Catalog'
import { SheetIndex } from '@/components/sheet/SheetIndex'
import { TickGauge } from '@/components/sheet/TickGauge'
import type { SheetRow } from '@/lib/content/rows'
import { sheetStamps, type CurriculumFacts } from '@/lib/record/derive'
import { EMPTY_RECORD } from '@/lib/record/schema'

/**
 * §5.3, §5.4, §7.5 — the three components the two listing pages are built
 * from, the table that holds them, and §4.8's ninth column.
 *
 * Every assertion here is on the SERVER markup, which for anything the record
 * touches is the honest empty first frame (§12.2, §12.14.2): unsigned squares,
 * both filters at `all`, every row. Real storage, a real click and the island's
 * repaint are Playwright's, in a real browser.
 */

const DRAWN: SheetRow = {
  module: 13,
  number: '13',
  slug: 'intermediate/security',
  slots: ['COMPLETION', 'QUIZ', 'CHECKLIST', 'SOURCES'],
  title: 'Security',
  path: '/courses/intermediate/security/',
  drawn: true,
  status: 'READY',
  subsystem: { order: 2, title: 'Intermediate', path: '/courses/intermediate/', slug: 'intermediate' },
  extent: '4,883 W · 30 MIN',
  sources: '23',
  lang: 'EN',
  bilingual: false,
  requires: '12',
  topics: ['What is actually different', 'The vocabulary, pinned down'],
}

const DASHED: SheetRow = {
  module: 17,
  number: '17',
  slug: 'expert/advanced-architectures',
  // A sheet nobody has drawn supplies no slot at all (§11.28, §5.9).
  slots: [],
  title: 'Advanced Architectures',
  path: '/courses/expert/advanced-architectures/',
  drawn: false,
  status: 'PLANNED',
  subsystem: { order: 3, title: 'Expert', path: '/courses/expert/', slug: 'expert' },
  extent: '—',
  sources: '—',
  lang: 'EN · TR',
  bilingual: true,
  requires: '—',
  topics: ['THREAD', 'ReAct', 'CodeAct'],
}

describe('ModuleRow — the index row (§5.3)', () => {
  const drawn = renderToStaticMarkup(<ModuleRow row={DRAWN} column="both" />)
  const dashed = renderToStaticMarkup(<ModuleRow row={DASHED} column="both" />)

  it('is a table row, never a card (§11.2)', () => {
    expect(drawn.startsWith('<tr')).toBe(true)
    expect(drawn).not.toMatch(/rounded|shadow/)
  })

  it('is a single link target, so Tab reaches the row once', () => {
    expect(drawn.match(/<a /g)).toHaveLength(1)
    // `trailingSlash` is next.config's business and it is not loaded here, so
    // the assertion is on the route rather than on its final slash.
    expect(drawn).toContain('href="/courses/intermediate/security')
  })

  it('names the module in a row header, so a screen reader keeps its bearings', () => {
    expect(drawn).toContain('<th scope="row"')
    expect(drawn).toContain('Security')
  })

  it('prints every derived value the manifest measured', () => {
    expect(drawn).toContain('4,883 W · 30 MIN')
    expect(drawn).toContain('>23<')
    expect(drawn).toContain('>EN<')
    expect(drawn).toContain('Intermediate')
    expect(drawn).toContain('>12<')
  })

  it('marks a module that is planned, so its hidden line can be ready', () => {
    expect(dashed).toContain('data-draft')
    expect(drawn).not.toContain('data-draft')
  })

  it('says in words that a module is planned, never in colour alone', () => {
    expect(dashed).toContain('PLANNED')
    expect(drawn).toContain('READY')
  })

  /**
   * M17 — the same claim, on what carries it now.
   *
   * §4.8's `STATUS` column is gone and with it the dashed tick this test used
   * to read. The claim it was making — a module nobody has written says so
   * WITHOUT COLOUR — is unchanged and has three carriers left: an em dash where
   * a length would be, an em dash where a source count would be, and one
   * completion square marked undrawn where a written module draws its slots.
   * A border style and an em dash both survive `forced-colors: active`, which
   * is the whole point of the claim; `colour-not-alone.spec.ts` measures it in
   * a browser under exactly that.
   */
  it('says an unready module is unready without using colour', () => {
    expect(dashed).toContain('data-draft=""')
    expect(dashed).toContain('data-drawn="false"')
    // Length and Sources, both undeclared, both spelled the house way.
    expect(dashed.match(/<td class="bz-row-value">—<\/td>/g)?.length).toBeGreaterThanOrEqual(2)

    expect(drawn).not.toContain('data-draft')
    expect(drawn).not.toContain('data-drawn="false"')
  })

  /**
   * D61 — the word left the screen and stayed in the accessibility tree. It is
   * inside the row's own header and OUTSIDE its link, so a list of links still
   * reads the module's name and nothing else.
   */
  it('still says the word, in the row header rather than on the screen', () => {
    expect(dashed).toContain('<span class="bz-said">PLANNED</span>')
    expect(drawn).toContain('<span class="bz-said">READY</span>')
    expect(dashed).not.toMatch(/<a [^>]*>[^<]*PLANNED/)
  })

  it('prints the topics instead of the level where asked (§4.9)', () => {
    const topics = renderToStaticMarkup(<ModuleRow row={DASHED} column="topics" />)
    expect(topics).toContain('CodeAct')
    expect(topics).not.toContain('Expert')
  })

  it('draws the sign-off squares this module supplies, and only those (§5.9)', () => {
    expect(drawn.match(/bz-signoff-square/g)).toHaveLength(4)
    for (const slot of ['COMPLETION', 'QUIZ', 'CHECKLIST', 'SOURCES']) {
      expect(drawn).toContain(`data-hl-slot="${slot}"`)
      expect(drawn).toContain(`title="${slot}"`)
    }
  })

  it('draws every square unsigned: the build has met no reader (§12.2)', () => {
    expect(drawn.match(/data-signed="false"/g)).toHaveLength(4)
    expect(drawn).not.toContain('data-signed="true"')
  })

  it('names the module by slug for the island, never by number (§12.1.3)', () => {
    expect(drawn).toContain('data-hl-signoff-cell="intermediate/security"')
    expect(drawn).not.toContain('data-hl-signoff-cell="13"')
    // §12.16's `s` shortcut clicks `[data-hl-signoff]` — the sheet's sign-off
    // CONTROL. There is no control in this cell, so it must not answer that
    // selector; an attribute selector matches a whole attribute name.
    expect(drawn).not.toMatch(/data-hl-signoff=/)
  })

  it('draws an unready module one hidden-line square and no slug to look up', () => {
    expect(dashed.match(/bz-signoff-square/g)).toHaveLength(1)
    expect(dashed).toContain('data-drawn="false"')
    expect(dashed).not.toContain('data-hl-signoff-cell')
    expect(dashed).not.toContain('data-hl-slot')
  })

  it('puts no control in the sign-off cell: the row stays one tab stop (§10.3)', () => {
    // `.bz-row-link::after` covers the row with `inset: 0`, so a control here
    // would be unclickable and would add a second tab stop.
    expect(drawn.match(/<a /g)).toHaveLength(1)
    expect(drawn).not.toContain('<button')
    expect(drawn).not.toContain('<input')
    expect(drawn).not.toContain('tabindex')
  })

  it('claims no reader state the build cannot know: no score, no percentage', () => {
    expect(drawn).not.toMatch(/complete|approved|progress|xp|%/i)
  })
})

describe('ModuleIndex — the manifest table (§4.8 item 4)', () => {
  const markup = renderToStaticMarkup(
    <SheetIndex rows={[DRAWN, DASHED]} column="both" label="The curriculum" />,
  )

  it('heads the columns §4.8 names, in its order', () => {
    const headers = [...markup.matchAll(/<th scope="col"[^>]*>([^<]*)</g)]
      .map((match) => match[1])
    // Authored in sentence case and uppercased in CSS (§3.2): a screen
    // reader spells out a word written in capitals.
    expect(headers).toEqual([
      // M17 — `Topics` is beside `Level` rather than instead of it. The one
      // catalog lists every level at once, so a row's level may not be carried
      // by the hue on its leading edge alone (SC 1.4.1); and the topics are the
      // column the retired `/courses/` pages carried and this one did not.
      '#', 'Module', 'Level', 'Topics', 'Length', 'Sources', 'Lang',
      // §12.18's ninth column. §4.8 put it after `STATUS`, which M17 removed —
      // the state is on the cells that were already carrying it, `ModuleRow`'s
      // `RowState`. REQUIRES is the column this implementation added, so it is
      // the one at the end.
      'Completion', 'Requirements',
    ])
  })

  it('swaps one column for the topics on a category page (§4.9 item 5)', () => {
    const category = renderToStaticMarkup(
      <SheetIndex rows={[DRAWN]} column="topics" label="Intermediate" />,
    )
    expect(category).toContain('>Topics<')
    expect(category).not.toContain('>Level<')
  })

  it('renders one row per module and nothing else', () => {
    expect(markup.match(/<tr/g)).toHaveLength(3)
  })

  it('scrolls inside its own container, reachable from the keyboard (§10.3)', () => {
    expect(markup).toContain('role="region"')
    expect(markup).toContain('tabindex="0"')
    expect(markup).toContain('aria-label="The curriculum"')
  })

  it('names the table for anyone who cannot see where they are', () => {
    expect(markup).toContain('<caption')
  })

  it('renders nothing at all rather than an empty table', () => {
    expect(renderToStaticMarkup(
      <SheetIndex rows={[]} column="both" label="Nothing" />,
    )).toBe('')
  })
})

describe('TickGauge — the discrete tick gauge (§7.5)', () => {
  const gauge = renderToStaticMarkup(
    <TickGauge ticks={['drawn', 'drawn', 'not-drawn']} label="3 modules, 2 ready" />,
  )

  it('is one tick per module, never a bar and never a percentage (§11.35)', () => {
    expect(gauge.match(/<rect|<line/g)).toHaveLength(3)
    expect(gauge).not.toContain('%')
  })

  it('sizes itself from 4px ticks with a 3px gap', () => {
    expect(gauge).toContain('width="18"')
    expect(gauge).toContain('height="12"')
  })

  it('draws a module that is planned as a dashed hairline', () => {
    expect(gauge).toContain('stroke-dasharray="3 2"')
  })

  it('never paints a tick accent while nothing is approved (T1)', () => {
    expect(gauge).not.toContain('accent')
  })

  it('states its reading in words where nothing else does', () => {
    expect(gauge).toContain('role="img"')
    expect(gauge).toContain('aria-label="3 modules, 2 ready"')
  })

  it('is decoration where the page already states the count', () => {
    const silent = renderToStaticMarkup(<TickGauge ticks={['drawn']} />)
    expect(silent).toContain('aria-hidden="true"')
    expect(silent).not.toContain('role="img"')
  })

  it('renders nothing for a level with no modules', () => {
    expect(renderToStaticMarkup(<TickGauge ticks={[]} />)).toBe('')
  })
})

/* M17 — `CategoryBlock` was deleted with the page that rendered it.

   It was the band header on `/courses/`: `LEVEL 02 · INTERMEDIATE` as a link
   over a tick gauge, one per level. The catalog's Overview view is what groups
   by level now, and its heading is `CatalogOverview`'s own. `ticksFrom` went
   with it for the same reason — `TickGauge` is still live on `/profile/`,
   where `Diagram` builds its ticks from the record rather than from rows. */

// ---------------------------------------------------------------------------
// §4.8 item 5 / §12.13 / §12.18 — the chips, and the island behind column 9
// ---------------------------------------------------------------------------

const FACTS: CurriculumFacts = {
  sheets: [
    {
      slug: 'intermediate/security',
      module: 13,
      category: 'intermediate',
      drawn: true,
      hasQuickCheck: true,
      checklistItems: 8,
      sources: 23,
      duration: 30,
    },
    {
      slug: 'expert/advanced-architectures',
      module: 17,
      category: 'expert',
      drawn: false,
      hasQuickCheck: false,
      checklistItems: 0,
      sources: 0,
      duration: 0,
    },
  ],
  categories: [
    { slug: 'intermediate', total: 1 },
    { slug: 'expert', total: 1 },
  ],
  traces: 0,
}

/**
 * M12 / D13 — the catalog's three views, over one array.
 *
 * The acceptance criterion this block exists for is the one that cannot be
 * written down without pinning content: **the three views show the same set of
 * modules for the same filter state.** So the module titles are lifted out of
 * each view's own markup and the three sets are compared WITH EACH OTHER —
 * never against a written list — which is a property that holds for any corpus
 * and fails the moment a view starts filtering, sorting or paginating on its
 * own (`tests/README.md`'s rule, and D13's bound on the cost of three views).
 */
describe('Catalog — three views over one data source (M12, D13)', () => {
  const markup = renderToStaticMarkup(
    <Catalog rows={[DRAWN, DASHED]} label="The catalog" />,
  )

  /** One view's slice of the document, by the `data-view` box it renders in. */
  function view(id: string): string {
    const open = markup.indexOf(`data-view="${id}" aria-labelledby`)
    expect(open, `no ${id} view in the markup`).toBeGreaterThan(-1)
    const next = ['overview', 'cards', 'table']
      .map((other) => markup.indexOf(`data-view="${other}" aria-labelledby`))
      .filter((at) => at > open)
    return markup.slice(open, next.length > 0 ? Math.min(...next) : markup.length)
  }

  /**
   * The module titles a view renders, as a set.
   *
   * Read off the markup rather than off the rows, because reading them off the
   * rows would compare the fixture with itself. Each view marks up a title
   * differently — a link in the overview, a heading in the cards, a table cell
   * in the table — so the titles are found by looking for the fixture's own
   * two titles rather than by a selector that only one view satisfies.
   */
  function titlesIn(html: string): string[] {
    return [DRAWN, DASHED]
      .filter((row) => html.includes(`>${row.title}<`))
      .map((row) => row.title)
      .sort()
  }

  it('renders all three views in one document, at one URL', () => {
    for (const id of ['overview', 'cards', 'table']) {
      expect(view(id).length).toBeGreaterThan(0)
    }
    // D13's criterion: adding a view must not add an address. Nothing in the
    // toggle navigates, so nothing in it is a link.
    //
    // Bounded by where the VIEWS begin rather than by the next control along.
    // M16 stage 4 moved the count into the filter bar, above the toggle, and
    // this slice used to run from the toggle to the count — which after the
    // move is a backwards range, and `String.slice` answers a backwards range
    // with the empty string. An empty string contains no `<a `, so the
    // assertion passed while reading nothing at all.
    const toggle = markup.slice(markup.indexOf('bz-viewtoggle'), markup.indexOf('bz-views'))
    expect(toggle, 'the toggle region is empty, so this asserts nothing').not.toBe('')
    expect(toggle).not.toContain('<a ')
  })

  it('shows the same set of modules in every view', () => {
    const [overview, cards, table] = ['overview', 'cards', 'table'].map((id) =>
      titlesIn(view(id)),
    )
    expect(overview).toEqual(cards)
    expect(cards).toEqual(table)
    // Non-vacuity: a comparison of three empty sets is green and proves
    // nothing, so each view has to have found the fixture's modules.
    expect(overview.length).toBe(2)
  })

  it('gives every view a name and an icon, and the state to a screen reader', () => {
    for (const name of ['Overview', 'Cards', 'Table']) expect(markup).toContain(name)
    // One glyph per button, and the word beside it — never the glyph alone.
    expect(markup.match(/class="bz-view-icon"/g)).toHaveLength(3)
    // The showing view is stated in the button's accessible name, not in an
    // `aria-pressed` React would have to render: channel A decides which view
    // is showing, and a second author of one state is two states (D17).
    expect(markup.match(/bz-view-said/g)).toHaveLength(3)
    expect(markup.slice(markup.indexOf('bz-viewtoggle'))).not.toContain('aria-pressed')
  })

  it('offers both filter axes, at the top, each as a named group', () => {
    const controls = markup.slice(0, markup.indexOf('bz-views'))
    expect(controls).toContain('aria-label="Filter by level"')
    expect(controls).toContain('aria-label="Filter by state or language"')
    // The chips come before the views in the document, which is the M12
    // deliverable: filters at the top of the page, not down a side.
    expect(markup.indexOf('bz-chip-row')).toBeLessThan(markup.indexOf('bz-views'))
  })

  it('opens with both filters at all, and with every module rendered (§12.2)', () => {
    /* M17 / D62 — the two groups answer with different attributes now, because
       they are different kinds of control. The level group is navigation, so
       its current chip is `aria-current="page"`; the state group is a toggle a
       reader presses, so its selected chip is `aria-pressed="true"`. One each,
       and each is its group's `all`. Asserting both is what stops a future
       edit turning one of them into the other silently. */
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
    expect(markup).toMatch(/aria-current="page"[^>]*>(<[^>]*>)*Every level</)
    expect(markup).toMatch(/aria-pressed="true"[^>]*>All</)
    // Two rows and the header row: the prerender narrows nothing, because a
    // reader-state filter active on load would change the row count between
    // the server render and the first client render.
    expect(markup.match(/<tr/g)).toHaveLength(3)
  })

  it('announces the count itself in a live region (SC 4.1.3, §12.13)', () => {
    expect(markup).toContain('role="status"')
    expect(markup).not.toContain('aria-live')
    expect(markup).toMatch(/Showing <span[^>]*>2<\/span> of <span[^>]*>2<\/span>/)
  })

  it('tells a level apart by more than its hue in every view (SC 1.4.1)', () => {
    // The hue arrives through `data-cat`, which is the carrier `category.css`
    // resolves. Every surface that carries it also prints the level's name,
    // so dropping every colour cannot cost the reader the distinction.
    for (const id of ['overview', 'cards']) {
      const html = view(id)
      expect(html).toContain(`data-cat="${DRAWN.subsystem.slug}"`)
      expect(html).toContain(DRAWN.subsystem.title)
    }
  })

  it('renders the whole set with no record to read', () => {
    expect(markup).toContain('Security')
    expect(markup).toContain('Advanced Architectures')
    expect(markup).not.toContain('No module matches')
  })
})

describe('NoMatch — §12.13 class 3', () => {
  const markup = renderToStaticMarkup(<NoMatch total={32} onClear={() => {}} />)

  it('states the count and says what to do next, in one path out', () => {
    expect(markup).toContain('No module matches both filters · 0 of 32')
    // M12 — an empty result says what to do, not only that it is empty.
    expect(markup).toContain('Widen either one')
    expect(markup).toContain('Show the whole catalog')
    expect(markup.match(/<button/g)).toHaveLength(1)
    expect(markup).not.toContain('<a ')
  })

  /**
   * M17 — the same state, reached with a level chosen, and the one path out is
   * a LINK because the level is an address. Still exactly one path, still the
   * same words; what changed is that a reader with the bundle blocked can now
   * take it, which the button never let them do.
   */
  it('leads out by navigating when a level is what narrowed it', () => {
    const withLevel = renderToStaticMarkup(
      <NoMatch total={32} onClear={() => {}} clearTo="/sheets/" />,
    )

    expect(withLevel).toContain('Show the whole catalog')
    // `trailingSlash` is next.config's business and it is not loaded here, so
    // the assertion is on the route rather than on its final slash.
    expect(withLevel).toContain('href="/sheets')
    expect(withLevel).not.toContain('<button')
    expect(withLevel.match(/<a /g)).toHaveLength(1)
  })

  it('carries no illustration and no mascot (§8.5)', () => {
    expect(markup).not.toContain('<svg')
    expect(markup).not.toContain('<img')
  })

  it('does not disable or hide anything to say it (§12.13)', () => {
    expect(markup).not.toContain('disabled')
    expect(markup).not.toContain('hidden')
  })
})

describe('SignOffMarks — the island that fills column 9 (§12.2)', () => {
  it('adds nothing to the served HTML: the squares are already ready', () => {
    expect(renderToStaticMarkup(<SignOffMarks facts={FACTS} />)).toBe('')
  })

  it('looks for the markers ModuleRow actually emits', () => {
    const row = renderToStaticMarkup(<ModuleRow row={DRAWN} column="both" />)

    expect(SIGN_OFF_SELECTORS.CELLS).toBe('[data-hl-signoff-cell]')
    expect(SIGN_OFF_SELECTORS.SQUARES).toBe('[data-hl-slot]')
    expect(SIGN_OFF_SELECTORS.SIGNED).toBe('data-signed')
    expect(row).toContain('data-hl-signoff-cell=')
    expect(row).toContain('data-hl-slot=')
    expect(row).toContain('data-signed="false"')
  })

  it('asks moduleStamps for the same slots the row drew, so neither invents one', () => {
    // The row's `slots` come from `sheetStamps` at build time and the island
    // reads the same function at run time; this pins the two together.
    expect(DRAWN.slots).toEqual(
      sheetStamps(EMPTY_RECORD, FACTS, DRAWN.slug).map((stamp) => stamp.id),
    )
    expect(DASHED.slots).toEqual(
      sheetStamps(EMPTY_RECORD, FACTS, DASHED.slug).map((stamp) => stamp.id),
    )
  })
})
