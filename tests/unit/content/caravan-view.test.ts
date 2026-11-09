import { describe, expect, it } from 'vitest'
import { monthRange, monthsBetween, periodLabel } from '@/lib/caravan-months'
import { caravanView, type CaravanInputTrend } from '@/lib/content/caravan'

/**
 * M91, D116 — what the page draws is derived from its input and from nothing else: the months of
 * the road, the order of the stops, the summed strength the land and the strip are drawn from, and
 * which link groups appear. The trends below are invented for the purpose.
 */

const trend = (over: Partial<CaravanInputTrend>): CaravanInputTrend => ({
  id: 'a',
  title: 'A',
  start: '2023-01',
  end: '2023-03',
  text: 'Text.',
  groups: { articles: [{ title: 'Page', href: 'https://example.com/' }] },
  strength: null,
  ...over,
})

describe('the months', () => {
  it('step, count and name across a year boundary', () => {
    expect(monthRange('2022-11', '2023-02')).toEqual(['2022-11', '2022-12', '2023-01', '2023-02'])
    expect(monthsBetween('2022-11', '2023-02')).toBe(3)
    expect(monthRange('2023-02', '2023-01')).toEqual([])
    expect(periodLabel('2022-11', '2023-02')).toBe('Nov 2022 to Feb 2023')
    expect(periodLabel('2023-04', '2023-06')).toBe('Apr to Jun 2023')
    expect(periodLabel('2023-04', '2023-04')).toBe('Apr 2023')
    expect(periodLabel('2025-03', null)).toBe('Since Mar 2025')
  })
})

describe('caravanView', () => {
  it('runs the road to the latest month any trend names, and an open trend to the road\'s end', () => {
    const view = caravanView({ sample: false, firstMonth: '2023-01', through: '2023-02', trends: [trend({ end: '2023-05' }), trend({ id: 'b', start: '2023-02', end: null })] })
    expect(view.months).toEqual(monthRange('2023-01', '2023-05'))
    const open = view.trends.find((t) => t.id === 'b')!
    expect(open.ei).toBe(view.months.length - 1)
  })

  it('orders the stops by start, the longer first at one start', () => {
    const view = caravanView({ sample: false, firstMonth: '2023-01', through: '2023-06', trends: [
      trend({ id: 'late', start: '2023-04', end: '2023-05' }),
      trend({ id: 'short', start: '2023-01', end: '2023-02' }),
      trend({ id: 'long', start: '2023-01', end: '2023-06' }),
    ] })
    expect(view.trends.map((t) => t.id)).toEqual(['long', 'short', 'late'])
  })

  it('sums measured strength per month, counts an unmeasured month as nothing, and says whether anything was measured', () => {
    const none = caravanView({ sample: false, firstMonth: '2023-01', through: '2023-03', trends: [trend({})] })
    expect(none.measured).toBe(false)
    expect(none.totals.every((total) => total === 0)).toBe(true)
    expect(none.trends[0].peak).toBeNull()

    const view = caravanView({ sample: false, firstMonth: '2023-01', through: '2023-03', trends: [
      trend({ strength: { '2023-01': 2, '2023-02': 4, '2023-03': 1 } }),
      trend({ id: 'b', start: '2023-02', end: '2023-03', strength: { '2023-02': 3 } }),
    ] })
    expect(view.measured).toBe(true)
    expect(view.totals).toEqual([2, 7, 1])
    expect(view.trends.find((t) => t.id === 'b')!.strength).toEqual([3, null])
    expect(view.trends.find((t) => t.id === 'a')!.peak).toBe(4)
  })

  it('shows only the link groups that have a link, in the References order', () => {
    const view = caravanView({ sample: false, firstMonth: '2023-01', through: '2023-03', trends: [trend({ groups: {
      modules: [{ title: 'M', href: '/courses/x/y/' }],
      videos: [],
      articles: [{ title: 'P', href: 'https://example.com/' }],
    } })] })
    expect(view.trends[0].groups.map((g) => g.kind)).toEqual(['articles', 'modules'])
  })
})
