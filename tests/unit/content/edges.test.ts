import { describe, expect, it } from 'vitest'
import type { CategorySlug } from '@/lib/content/categories'
import {
  type GraphModule,
  type LinkResolver,
  buildGraph,
  inProseLinkTargets,
  moduleGraph,
} from '@/lib/content/edges'
import { loadAllModules } from '@/lib/content/loader'

function m(
  module: number,
  category: CategorySlug,
  prerequisites: number[] = [],
  body = '',
): GraphModule {
  return { module, category, prerequisites, body, source: `${category}/${module}.md` }
}

/**
 * A resolver for bodies nobody wrote to disk: a target's number is the digits
 * in its href. It stands where `links.ts`'s corpus resolver stands in the real
 * graph, which is why `buildGraph` takes one: the graph's own rules are then
 * testable over invented modules, without a corpus and without a filename
 * convention baked into the module under test.
 */
const byDigits: LinkResolver = (rawHref) => {
  const digits = /(\d+)/.exec(rawHref)
  return digits === null ? null : Number(digits[1])
}

describe('inProseLinkTargets', () => {
  it('reports the href of a relative link, as written', () => {
    expect(inProseLinkTargets('see [ctx](context_engineering.md) now'))
      .toEqual(['context_engineering.md'])
  })

  it('reports a link that reaches into another category directory', () => {
    expect(inProseLinkTargets('[x](../3_expert/advanced_prompting.md)'))
      .toEqual(['../3_expert/advanced_prompting.md'])
  })

  it('drops the anchor on a deep link, and reports a target once', () => {
    expect(inProseLinkTargets('[a](context_engineering.md#lanes) [b](context_engineering.md)'))
      .toEqual(['context_engineering.md'])
  })

  it('reports every markdown target, and leaves the resolver to reject one', () => {
    // It does not know what a module is: `README.md` is a markdown file, so it
    // is reported. The resolver answers null for it and the graph drops it.
    expect(inProseLinkTargets('[r](README.md) [h](https://example.com) [a](#top)'))
      .toEqual(['README.md'])
    expect(byDigits('README.md', 'anything.md')).toBeNull()
  })
})

describe('buildGraph', () => {
  it('points a REQUIRES edge from the prerequisite to the module that needs it', () => {
    const graph = buildGraph([m(1, 'fundamentals'), m(2, 'fundamentals', [1])], byDigits)
    expect(graph.edges).toEqual([
      { from: 1, to: 2, kind: 'requires', crossBand: false },
    ])
    expect(graph.requires(2)).toEqual([1])
    expect(graph.feeds(1)).toEqual([2])
    expect(graph.requires(1)).toEqual([])
    expect(graph.feeds(2)).toEqual([])
  })

  it('flags an edge that leaves its band', () => {
    const graph = buildGraph([m(1, 'fundamentals'), m(8, 'intermediate', [1])], byDigits)
    expect(graph.edges[0].crossBand).toBe(true)
  })

  it('drops a prerequisite no module answers to', () => {
    expect(buildGraph([m(2, 'fundamentals', [99])], byDigits).edges).toEqual([])
  })

  it('makes a SEE ALSO edge from a non-adjacent in-prose link', () => {
    const graph = buildGraph([
      m(8, 'intermediate', [], 'see [sec](13_security.md)'),
      m(13, 'intermediate'),
    ], byDigits)
    expect(graph.edges).toEqual([
      { from: 8, to: 13, kind: 'see-also', crossBand: false },
    ])
    expect(graph.seeAlso(8)).toEqual([13])
    expect(graph.seeAlso(13)).toEqual([])
  })

  it('refuses a SEE ALSO edge between neighbours, which is the sequence rail', () => {
    const graph = buildGraph([
      m(8, 'intermediate', [], '[next](9_context_engineering.md)'),
      m(9, 'intermediate'),
    ], byDigits)
    expect(graph.seeAlso(8)).toEqual([])
  })

  it('refuses a SEE ALSO edge across bands, which the diagram has no channel for', () => {
    const graph = buildGraph([
      m(8, 'intermediate', [], '[adv](../3_expert/21_advanced_prompting.md)'),
      m(21, 'expert'),
    ], byDigits)
    expect(graph.seeAlso(8)).toEqual([])
  })

  it('refuses a SEE ALSO edge a module points at itself', () => {
    const graph = buildGraph([m(8, 'intermediate', [], '[self](8_prompt_engineering.md)')], byDigits)
    expect(graph.edges).toEqual([])
  })

  it('is deterministic: the same input builds the same edge list', () => {
    const input = [
      m(1, 'fundamentals'),
      m(8, 'intermediate', [1], '[a](13_security.md) [b](11_coding_agents.md)'),
      m(11, 'intermediate'),
      m(13, 'intermediate'),
    ]
    expect(buildGraph(input, byDigits).edges).toEqual(buildGraph(input, byDigits).edges)
  })
})

describe('the curriculum graph', () => {
  const graph = moduleGraph()
  const modules = loadAllModules()
  const known = new Set(modules.map((x) => x.frontmatter.module))
  const requires = graph.edges.filter((e) => e.kind === 'requires')
  const seeAlso = graph.edges.filter((e) => e.kind === 'see-also')

  it('declares one REQUIRES edge per prerequisite in the corpus', () => {
    // The count moves whenever a sheet's prerequisites do, so it is summed off
    // the frontmatter rather than pinned.
    const declared = modules.reduce(
      (total, sheet) => total + sheet.frontmatter.prerequisites.length, 0)
    expect(declared).toBeGreaterThan(0)
    expect(requires).toHaveLength(declared)
  })

  it('crosses a band boundary exactly three times, at 1-8, 5-9 and 6-10', () => {
    expect(requires.filter((e) => e.crossBand).map((e) => [e.from, e.to]))
      .toEqual([[1, 8], [5, 9], [6, 10]])
  })

  it('mirrors every REQUIRES edge in the FEEDS index', () => {
    for (const e of requires) {
      expect(graph.requires(e.to), `${e.from} feeds ${e.to}`).toContain(e.from)
      expect(graph.feeds(e.from), `${e.from} feeds ${e.to}`).toContain(e.to)
    }
    expect(graph.feeds(1)).toEqual([2, 3, 4, 5, 8])
    expect(graph.requires(14)).toEqual([12, 13])
  })

  it('leaves the first sheet requiring nothing and the last feeding nothing', () => {
    const last = Math.max(...known)
    expect(graph.requires(1)).toEqual([])
    expect(graph.feeds(last)).toEqual([])
  })

  it('names only modules that exist, on both ends of every edge', () => {
    for (const e of graph.edges) {
      expect(known.has(e.from), `${e.from} to ${e.to}`).toBe(true)
      expect(known.has(e.to), `${e.from} to ${e.to}`).toBe(true)
    }
  })

  it('never lists the same edge twice', () => {
    const keys = graph.edges.map((e) => `${e.kind}:${e.from}:${e.to}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
