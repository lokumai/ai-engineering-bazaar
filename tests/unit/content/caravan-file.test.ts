import yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { parseStrength, parseTrends, type TrendsContext } from '@/lib/content/caravan-file'

/**
 * M91, D116 — the rules `caravan-file.ts` holds `mini-courses/caravan/` to, each run against YAML
 * written here for the purpose. Nothing below reads the corpus or names a real trend: the rules
 * hold for any content, and these files exist only to break them one at a time.
 */

const context: TrendsContext = { modules: new Set(['alpha', 'beta']), latest: '2026-06' }

/** A valid file around the trends given, so each case changes one thing. */
function file(trends: string): string {
  return `caravan: 1\nfirst_month: "2022-11"\ntrends:\n${trends}`
}

const ONE = `
  - id: first_trend
    title: A Trend
    start: "2023-01"
    end: "2023-06"
    text: >-
      One paragraph, folded
      onto one line.
    links:
      articles:
        - { title: "A page", url: "https://example.com/a" }
      modules: [alpha]
`

const parse = (text: string) => parseTrends(yaml.safeLoad(text), context)

describe('trends.yaml', () => {
  it('accepts a well-formed file, and an empty one', () => {
    const parsed = parse(file(ONE))
    expect(parsed.trends).toHaveLength(1)
    expect(parsed.trends[0].text).not.toContain('\n')
    expect(parsed.trends[0].links.videos).toEqual([])
    expect(parse('caravan: 1\nfirst_month: "2022-11"\ntrends: []\n').trends).toEqual([])
  })

  it('treats a missing end as a trend still on the road', () => {
    expect(parse(file(ONE.replace('    end: "2023-06"\n', ''))).trends[0].end).toBeNull()
    expect(parse(file(ONE.replace('end: "2023-06"', 'end: null'))).trends[0].end).toBeNull()
  })

  it('refuses a field it does not know, rather than dropping it', () => {
    expect(() => parse(file(ONE.replace('    start:', '    strat: "2023-01"\n    start:')))).toThrow(/Invalid caravan\/trends.yaml/)
    expect(() => parse(file(ONE.replace('      articles:', '      podcasts: []\n      articles:')))).toThrow(/podcasts/)
    expect(() => parse(file(ONE.replace('    title: A Trend\n', '    title: A Trend\n    strength: 4\n')))).toThrow(/strength/)
  })

  it('refuses a month that is not YYYY-MM', () => {
    expect(() => parse(file(ONE.replace('"2023-01"', '"2023-13"')))).toThrow(/YYYY-MM/)
    expect(() => parse(file(ONE.replace('"2023-01"', '"2023-1"')))).toThrow(/YYYY-MM/)
    expect(() => parse(file(ONE.replace('"2023-01"', '"January 2023"')))).toThrow(/YYYY-MM/)
  })

  it('rule 1: refuses two trends with one id', () => {
    expect(() => parse(file(ONE + ONE))).toThrow(/rule 1.*\n.*"first_trend"/)
  })

  it('rule 2: refuses a span off the road or backwards', () => {
    expect(() => parse(file(ONE.replace('"2023-01"', '"2022-10"')))).toThrow(/rule 2, a trend's start may not be before first_month/)
    expect(() => parse(file(ONE.replace('"2023-06"', '"2026-07"')))).toThrow(/rule 2, a trend's end may not be after this month/)
    expect(() => parse(file(ONE.replace('"2023-06"', '"2022-12"')))).toThrow(/rule 2, a trend may not end before it starts/)
    expect(parse(file(ONE.replace('"2023-06"', '"2023-01"'))).trends[0].end).toBe('2023-01')
  })

  it('rule 3: refuses a second paragraph or a title on two lines', () => {
    expect(() => parse(file(ONE.replace('    text: >-', '    text: |-')))).toThrow(/rule 3, the text is one paragraph/)
    expect(() => parse(file(ONE.replace('    title: A Trend', '    title: "A\\nTrend"')))).toThrow(/rule 3, a title is one line/)
  })

  it('rule 4: refuses an em dash', () => {
    expect(() => parse(file(ONE.replace('One paragraph,', 'One paragraph —')))).toThrow(/rule 4/)
  })

  it('rule 5: refuses a trend with no link, or one link twice', () => {
    const bare = ONE.replace(/    links:[\s\S]*$/, '    links: {}\n')
    expect(() => parse(file(bare))).toThrow(/rule 5, a trend has at least one link/)
    const twice = ONE.replace('        - { title: "A page", url: "https://example.com/a" }', '        - { title: "A page", url: "https://example.com/a" }\n      videos:\n        - { title: "Again", url: "https://example.com/a" }')
    expect(() => parse(file(twice))).toThrow(/rule 5, a link is listed once/)
  })

  it('refuses a link with no title or no absolute address', () => {
    expect(() => parse(file(ONE.replace('title: "A page"', 'title: ""')))).toThrow(/Invalid caravan\/trends.yaml/)
    expect(() => parse(file(ONE.replace('https://example.com/a', '/courses/x/')))).toThrow(/absolute http/)
  })

  it('rule 6: refuses a module that is not in the curriculum, or one named twice', () => {
    expect(() => parse(file(ONE.replace('[alpha]', '[gamma]')))).toThrow(/rule 6.*\n.*"gamma"/)
    expect(() => parse(file(ONE.replace('[alpha]', '[alpha, alpha]')))).toThrow(/rule 6, a module is listed once/)
    expect(parse(file(ONE.replace('[alpha]', '[alpha, beta]'))).trends[0].links.modules).toEqual(['alpha', 'beta'])
  })
})

describe('strength.yaml', () => {
  const trends = parse(file(ONE))
  const strength = (body: string) => parseStrength(yaml.safeLoad(`caravan_strength: 1\nmethod: 1\nmeasured_through: "2023-04"\ntrends:\n${body}`), trends)
  const full = '  first_trend: { "2023-01": 1, "2023-02": 3, "2023-03": 5, "2023-04": 0 }\n'

  it('accepts every month of a span up to the last measured one, and no measurement at all', () => {
    expect(strength(full).trends.first_trend['2023-03']).toBe(5)
    expect(strength('  {}\n').trends).toEqual({})
  })

  it('refuses a level outside 0 to 5, or not a whole number', () => {
    expect(() => strength(full.replace('"2023-03": 5', '"2023-03": 6'))).toThrow(/Invalid caravan\/strength.yaml/)
    expect(() => strength(full.replace('"2023-03": 5', '"2023-03": 2.5'))).toThrow(/Invalid caravan\/strength.yaml/)
  })

  it('rule 1: refuses a measurement of a trend that does not exist', () => {
    expect(() => strength(`${full}  ghost: { "2023-01": 1 }\n`)).toThrow(/rule 1.*\n.*"ghost"/)
  })

  it('rule 2: refuses a hole in the span, or a month outside it', () => {
    expect(() => strength(full.replace('"2023-02": 3, ', ''))).toThrow(/rule 2, every month of a measured span is measured\n.*2023-02/)
    expect(() => strength(full.replace('{ "2023-01"', '{ "2022-12": 1, "2023-01"'))).toThrow(/rule 2, a month is measured only inside/)
  })

  it('refuses a typed field the method does not have', () => {
    expect(() => parseStrength(yaml.safeLoad('caravan_strength: 1\nmethod: 1\nmeasured_through: "2023-04"\nlevel: 3\ntrends: {}\n'), trends)).toThrow(/level/)
  })
})
