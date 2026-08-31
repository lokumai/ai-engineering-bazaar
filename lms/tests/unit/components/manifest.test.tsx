import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CategoryBlock } from '@/components/sheet/CategoryBlock'
import { ModuleRow } from '@/components/sheet/ModuleRow'
import { SheetIndex } from '@/components/sheet/SheetIndex'
import { TickGauge } from '@/components/sheet/TickGauge'
import type { SheetRow } from '@/lib/content/rows'

/**
 * §5.3, §5.4, §7.5 — the three components the two listing pages are built
 * from, and the table that holds them.
 */

const DRAWN: SheetRow = {
  module: 13,
  number: '13',
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

  it('claims nothing about the reader: no sign-off, no completion, no score', () => {
    expect(drawn).not.toMatch(/complete|approved|sign-off|progress|xp/i)
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
      '#', 'Sheet', 'Subsystem', 'Extent', 'Sources', 'Lang', 'Status', 'Requires',
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
