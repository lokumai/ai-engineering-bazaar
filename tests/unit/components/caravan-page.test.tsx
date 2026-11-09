import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CaravanPage } from '@/components/caravan/CaravanPage'
import { caravanView, type CaravanInput } from '@/lib/content/caravan'

/**
 * M91, D116 — what the Caravan page says about its own data, rendered from invented input. With the
 * author's trends and no `strength.yaml`, the land and the strip are flat, and the page must say why
 * rather than draw a flat road as if nothing had been strong; with a measurement, or with the
 * sample, it says nothing of the kind. The notice says which source the page is drawing.
 */

const input = (over: Partial<CaravanInput>): CaravanInput => ({
  sample: false,
  firstMonth: '2023-01',
  through: '2023-03',
  trends: [{
    id: 'a',
    title: 'A',
    start: '2023-01',
    end: '2023-02',
    text: 'Text.',
    groups: { articles: [{ title: 'Page', href: 'https://example.com/' }] },
    strength: null,
  }],
  ...over,
})

const html = (over: Partial<CaravanInput>) => renderToStaticMarkup(<CaravanPage view={caravanView(input(over))} />)

describe('the Caravan page on its own data', () => {
  it('says the strength is not measured when real trends carry none', () => {
    expect(html({})).toContain('data-cv-unmeasured')
  })

  it('says nothing of the kind once a month is measured, or on the sample', () => {
    const measured = input({}).trends.map((t) => ({ ...t, strength: { '2023-01': 2, '2023-02': 3 } }))
    expect(html({ trends: measured })).not.toContain('data-cv-unmeasured')
    expect(html({ sample: true })).not.toContain('data-cv-unmeasured')
  })

  it('names the sample on its notice and on every trend, and only then', () => {
    expect(html({ sample: true })).toMatch(/cv-notice[\s\S]*sample data/)
    expect(html({ sample: true })).toContain('cv-entry-sample')
    expect(html({})).not.toContain('cv-entry-sample')
    expect(html({})).toMatch(/cv-notice[\s\S]*not ready/i)
  })
})
