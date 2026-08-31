import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SIGN_OFF_SELECTORS, SignOffMarks } from '@/components/record/SignOffMarks'
import { CategoryBlock } from '@/components/sheet/CategoryBlock'
import { ModuleRow } from '@/components/sheet/ModuleRow'
import { NoMatch, SheetFilters } from '@/components/sheet/SheetFilters'
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
 * `ALL` active, thirty-two rows. Real storage, a real click and the island's
 * repaint are Playwright's, in a real browser.
 */

const DRAWN: SheetRow = {
  module: 13,
  number: '13',
  slug: 'intermediate/security',
  slots: ['SIGN-OFF', 'QUIZ', 'CHECKLIST', 'SOURCES'],
  title: 'Security',
  path: '/courses/intermediate/security/',
  drawn: true,
  status: 'READY',
  subsystem: { order: 2, title: 'Intermediate', path: '/courses/intermediate/' },
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
  status: 'NOT DRAWN',
  subsystem: { order: 3, title: 'Expert', path: '/courses/expert/' },
  extent: '—',
  sources: '—',
  lang: 'EN · TR',
  bilingual: true,
  requires: '—',
  topics: ['THREAD', 'ReAct', 'CodeAct'],
}

describe('ModuleRow — the index row (§5.3)', () => {
  const drawn = renderToStaticMarkup(<ModuleRow row={DRAWN} column="subsystem" />)
  const dashed = renderToStaticMarkup(<ModuleRow row={DASHED} column="subsystem" />)

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

  it('names the sheet in a row header, so a screen reader keeps its bearings', () => {
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

  it('marks a sheet that is not drawn, so its hidden line can be drawn', () => {
    expect(dashed).toContain('data-draft')
    expect(drawn).not.toContain('data-draft')
  })

  it('says in words that a sheet is not drawn, never in colour alone', () => {
    expect(dashed).toContain('NOT DRAWN')
    expect(drawn).toContain('READY')
  })

  it('draws the status tick as a hidden line on an undrawn sheet', () => {
    expect(dashed).toContain('stroke-dasharray="3 2"')
    expect(drawn).not.toContain('stroke-dasharray')
  })

  it('prints the topics instead of the subsystem where asked (§4.9)', () => {
    const topics = renderToStaticMarkup(<ModuleRow row={DASHED} column="topics" />)
    expect(topics).toContain('CodeAct')
    expect(topics).not.toContain('Expert')
  })

  it('draws the sign-off squares this sheet supplies, and only those (§5.9)', () => {
    expect(drawn.match(/hl-signoff-square/g)).toHaveLength(4)
    for (const slot of ['SIGN-OFF', 'QUIZ', 'CHECKLIST', 'SOURCES']) {
      expect(drawn).toContain(`data-hl-slot="${slot}"`)
      expect(drawn).toContain(`title="${slot}"`)
    }
  })

  it('draws every square unsigned: the build has met no reader (§12.2)', () => {
    expect(drawn.match(/data-signed="false"/g)).toHaveLength(4)
    expect(drawn).not.toContain('data-signed="true"')
  })

  it('names the sheet by slug for the island, never by number (§12.1.3)', () => {
    expect(drawn).toContain('data-hl-signoff-cell="intermediate/security"')
    expect(drawn).not.toContain('data-hl-signoff-cell="13"')
    // §12.16's `s` shortcut clicks `[data-hl-signoff]` — the sheet's sign-off
    // CONTROL. There is no control in this cell, so it must not answer that
    // selector; an attribute selector matches a whole attribute name.
    expect(drawn).not.toMatch(/data-hl-signoff=/)
  })

  it('draws an undrawn sheet one hidden-line square and no slug to look up', () => {
    expect(dashed.match(/hl-signoff-square/g)).toHaveLength(1)
    expect(dashed).toContain('data-drawn="false"')
    expect(dashed).not.toContain('data-hl-signoff-cell')
    expect(dashed).not.toContain('data-hl-slot')
  })

  it('puts no control in the sign-off cell: the row stays one tab stop (§10.3)', () => {
    // `.hl-row-link::after` covers the row with `inset: 0`, so a control here
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

describe('SheetIndex — the manifest table (§4.8 item 4)', () => {
  const markup = renderToStaticMarkup(
    <SheetIndex rows={[DRAWN, DASHED]} column="subsystem" label="The drawing set" />,
  )

  it('heads the columns §4.8 names, in its order', () => {
    const headers = [...markup.matchAll(/<th scope="col"[^>]*>([^<]*)</g)]
      .map((match) => match[1])
    // Authored in sentence case and uppercased in CSS (§3.2): a screen
    // reader spells out a word written in capitals.
    expect(headers).toEqual([
      '#', 'Sheet', 'Subsystem', 'Extent', 'Sources', 'Lang', 'Status',
      // §12.18's ninth column, where §4.8 puts it: after STATUS. REQUIRES is
      // the column this implementation added, so it is the one at the end.
      'Sign-off', 'Requires',
    ])
  })

  it('swaps one column for the topics on a category page (§4.9 item 5)', () => {
    const category = renderToStaticMarkup(
      <SheetIndex rows={[DRAWN]} column="topics" label="Intermediate" />,
    )
    expect(category).toContain('>Topics<')
    expect(category).not.toContain('>Subsystem<')
  })

  it('renders one row per sheet and nothing else', () => {
    expect(markup.match(/<tr/g)).toHaveLength(3)
  })

  it('scrolls inside its own container, reachable from the keyboard (§10.3)', () => {
    expect(markup).toContain('role="region"')
    expect(markup).toContain('tabindex="0"')
    expect(markup).toContain('aria-label="The drawing set"')
  })

  it('names the table for anyone who cannot see where they are', () => {
    expect(markup).toContain('<caption')
  })

  it('renders nothing at all rather than an empty table', () => {
    expect(renderToStaticMarkup(
      <SheetIndex rows={[]} column="subsystem" label="Nothing" />,
    )).toBe('')
  })
})

describe('TickGauge — the discrete tick gauge (§7.5)', () => {
  const gauge = renderToStaticMarkup(
    <TickGauge ticks={['drawn', 'drawn', 'not-drawn']} label="3 sheets, 2 drawn" />,
  )

  it('is one tick per sheet, never a bar and never a percentage (§11.35)', () => {
    expect(gauge.match(/<rect|<line/g)).toHaveLength(3)
    expect(gauge).not.toContain('%')
  })

  it('sizes itself from 4px ticks with a 3px gap', () => {
    expect(gauge).toContain('width="18"')
    expect(gauge).toContain('height="12"')
  })

  it('draws a sheet that is not drawn as a dashed hairline', () => {
    expect(gauge).toContain('stroke-dasharray="3 2"')
  })

  it('never paints a tick accent while nothing is approved (T1)', () => {
    expect(gauge).not.toContain('accent')
  })

  it('states its reading in words where nothing else does', () => {
    expect(gauge).toContain('role="img"')
    expect(gauge).toContain('aria-label="3 sheets, 2 drawn"')
  })

  it('is decoration where the page already states the count', () => {
    const silent = renderToStaticMarkup(<TickGauge ticks={['drawn']} />)
    expect(silent).toContain('aria-hidden="true"')
    expect(silent).not.toContain('role="img"')
  })

  it('renders nothing for a subsystem with no sheets', () => {
    expect(renderToStaticMarkup(<TickGauge ticks={[]} />)).toBe('')
  })
})

describe('CategoryBlock — the subsystem block (§5.4)', () => {
  const live = renderToStaticMarkup(
    <CategoryBlock
      order={2}
      title="Intermediate"
      path="/courses/intermediate/"
      ticks={['drawn', 'drawn']}
    />,
  )
  const undrawn = renderToStaticMarkup(
    <CategoryBlock
      order={3}
      title="Expert"
      path="/courses/expert/"
      ticks={['not-drawn', 'not-drawn']}
    />,
  )

  it('is three stacked lines, and never a card (§5.4)', () => {
    expect(live).toContain('Subsystem 02')
    expect(live).toContain('Intermediate')
    expect(live).toContain('<svg')
    expect(live).not.toMatch(/rounded|shadow/)
  })

  it('links to the subsystem it names', () => {
    expect(live).toContain('href="/courses/intermediate')
  })

  it('marks a subsystem with no drawn sheets, which mutes its name (§5.4)', () => {
    expect(undrawn).toContain('data-undrawn')
    expect(live).not.toContain('data-undrawn')
  })

  it('says its coverage in words, not in the gauge alone (§10.4)', () => {
    expect(live).toContain('aria-label="2 sheets, 2 drawn"')
    expect(undrawn).toContain('aria-label="2 sheets, 0 drawn"')
  })
})

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
    },
    {
      slug: 'expert/advanced-architectures',
      module: 17,
      category: 'expert',
      drawn: false,
      hasQuickCheck: false,
      checklistItems: 0,
      sources: 0,
    },
  ],
  categories: [
    { slug: 'intermediate', total: 1 },
    { slug: 'expert', total: 1 },
  ],
  traces: 0,
}

describe('SheetFilters — the chip row (§4.8 item 5, §12.18)', () => {
  const markup = renderToStaticMarkup(
    <SheetFilters rows={[DRAWN, DASHED]} label="The drawing set" />,
  )

  it('offers §4.8\'s four chips and §12.18\'s two, in that order', () => {
    const labels = [...markup.matchAll(/hl-chip"[^>]*>([^<]*)</g)].map((m) => m[1])
    expect(labels).toEqual([
      'ALL', 'READY', 'NOT DRAWN', 'EN · TR', 'SIGNED OFF', 'UNSIGNED',
    ])
  })

  it('opens with ALL active, and with every row rendered (§12.2)', () => {
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(markup).toMatch(/aria-pressed="true"[^>]*>ALL</)
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

  it('renders the whole set with no record to read', () => {
    expect(markup).toContain('Security')
    expect(markup).toContain('Advanced Architectures')
    expect(markup).not.toContain('NO SHEETS MATCH FILTER')
  })
})

describe('NoMatch — §12.13 class 3', () => {
  const markup = renderToStaticMarkup(<NoMatch total={32} onClear={() => {}} />)

  it('states the count and offers exactly one path out', () => {
    expect(markup).toContain('NO SHEETS MATCH FILTER — 0 of 32')
    expect(markup).toContain('Clear the filter')
    expect(markup.match(/<button/g)).toHaveLength(1)
    expect(markup).not.toContain('<a ')
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
  it('adds nothing to the served HTML: the squares are already drawn', () => {
    expect(renderToStaticMarkup(<SignOffMarks facts={FACTS} />)).toBe('')
  })

  it('looks for the markers ModuleRow actually emits', () => {
    const row = renderToStaticMarkup(<ModuleRow row={DRAWN} column="subsystem" />)

    expect(SIGN_OFF_SELECTORS.CELLS).toBe('[data-hl-signoff-cell]')
    expect(SIGN_OFF_SELECTORS.SQUARES).toBe('[data-hl-slot]')
    expect(SIGN_OFF_SELECTORS.SIGNED).toBe('data-signed')
    expect(row).toContain('data-hl-signoff-cell=')
    expect(row).toContain('data-hl-slot=')
    expect(row).toContain('data-signed="false"')
  })

  it('asks sheetStamps for the same slots the row drew, so neither invents one', () => {
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
