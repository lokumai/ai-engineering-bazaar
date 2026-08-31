import { describe, expect, it } from 'vitest'
import type { CategorySlug } from '@/lib/content/categories'
import {
  type GraphModule,
  buildGraph,
  inProseModuleLinks,
  moduleGraph,
} from '@/lib/content/edges'
import { loadAllModules } from '@/lib/content/loader'

function m(
  module: number,
  category: CategorySlug,
  prerequisites: number[] = [],
  body = '',
): GraphModule {
  return { module, category, prerequisites, body }
}

describe('inProseModuleLinks', () => {
  it('reads the module number out of a relative link', () => {
    expect(inProseModuleLinks('see [ctx](9_context_engineering.md) now')).toEqual([9])
  })

  it('reads a link that reaches into another category directory', () => {
    expect(inProseModuleLinks('[x](../3_expert/21_advanced_prompting.md)')).toEqual([21])
  })

  it('ignores the anchor on a deep link, and reports a target once', () => {
    expect(
      inProseModuleLinks('[a](9_context_engineering.md#lanes) [b](9_context_engineering.md)'),
    ).toEqual([9])
  })

  it('ignores links that are not module files', () => {
    expect(inProseModuleLinks('[r](README.md) [h](https://example.com) [a](#top)')).toEqual([])
  })
})

describe('buildGraph', () => {
  it('points a REQUIRES edge from the prerequisite to the module that needs it', () => {
    const graph = buildGraph([m(1, 'fundamentals'), m(2, 'fundamentals', [1])])
    expect(graph.edges).toEqual([
      { from: 1, to: 2, kind: 'requires', crossBand: false },
    ])
    expect(graph.requires(2)).toEqual([1])
    expect(graph.feeds(1)).toEqual([2])
    expect(graph.requires(1)).toEqual([])
    expect(graph.feeds(2)).toEqual([])
  })

  it('flags an edge that leaves its band', () => {
    const graph = buildGraph([m(1, 'fundamentals'), m(8, 'intermediate', [1])])
    expect(graph.edges[0].crossBand).toBe(true)
  })

  it('drops a prerequisite no module answers to', () => {
    expect(buildGraph([m(2, 'fundamentals', [99])]).edges).toEqual([])
  })

  it('makes a SEE ALSO edge from a non-adjacent in-prose link', () => {
    const graph = buildGraph([
      m(8, 'intermediate', [], 'see [sec](13_security.md)'),
      m(13, 'intermediate'),
    ])
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
    ])
    expect(graph.seeAlso(8)).toEqual([])
  })

  it('refuses a SEE ALSO edge across bands, which the diagram has no channel for', () => {
    const graph = buildGraph([
      m(8, 'intermediate', [], '[adv](../3_expert/21_advanced_prompting.md)'),
      m(21, 'expert'),
    ])
    expect(graph.seeAlso(8)).toEqual([])
  })

  it('refuses a SEE ALSO edge a module points at itself', () => {
    const graph = buildGraph([m(8, 'intermediate', [], '[self](8_prompt_engineering.md)')])
    expect(graph.edges).toEqual([])
  })

  it('is deterministic: the same input builds the same edge list', () => {
    const input = [
      m(1, 'fundamentals'),
      m(8, 'intermediate', [1], '[a](13_security.md) [b](11_coding_agents.md)'),
      m(11, 'intermediate'),
      m(13, 'intermediate'),
    ]
    expect(buildGraph(input).edges).toEqual(buildGraph(input).edges)
  })
})

describe('the curriculum graph', () => {
  const graph = moduleGraph()
  const modules = loadAllModules()
  const known = new Set(modules.map((x) => x.frontmatter.module))
  const requires = graph.edges.filter((e) => e.kind === 'requires')
  const seeAlso = graph.edges.filter((e) => e.kind === 'see-also')

  it('declares 19 REQUIRES edges', () => {
    expect(requires).toHaveLength(19)
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
    expect(graph.requires(15)).toEqual([13, 14])
  })

  it('leaves module 1 requiring nothing and module 32 feeding nothing', () => {
    expect(graph.requires(1)).toEqual([])
    expect(graph.feeds(32)).toEqual([])
  })

  it('declares 13 SEE ALSO edges, every one of them inside Intermediate', () => {
    expect(seeAlso).toHaveLength(13)
    for (const e of seeAlso) {
      const label = `${e.from} sees ${e.to}`
      expect(e.from, label).toBeGreaterThanOrEqual(8)
      expect(e.from, label).toBeLessThanOrEqual(15)
      expect(e.to, label).toBeGreaterThanOrEqual(8)
      expect(e.to, label).toBeLessThanOrEqual(15)
      expect(Math.abs(e.to - e.from), label).toBeGreaterThan(1)
    }
  })

  it('prints an empty SEE ALSO list for every module outside Intermediate', () => {
    for (const module of modules) {
      const n = module.frontmatter.module
      if (n >= 8 && n <= 15) continue
      expect(graph.seeAlso(n), `module ${n}`).toEqual([])
    }
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
