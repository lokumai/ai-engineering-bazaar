import { describe, expect, it } from 'vitest'
import { toBlocks } from '@/lib/bundle/blocks'
import { levelDocPath, moduleDocPath, uniqueDiagrams } from '@/lib/bundle/build'
import { renderTree } from '@/lib/content/render'

/**
 * The builder's pure parts. The whole corpus is built by
 * `tests/corpus/bundle.test.ts`; these hold for any content.
 */

const MERMAID = '```mermaid\ngraph TD\n  A --> B\n```'

async function diagramsOf(markdown: string) {
  const { tree } = await renderTree(markdown)
  return toBlocks(tree, { module: 'fixture/build', lang: 'en', sizeOf: () => ({ width: 1, height: 1 }) }).diagrams
}

describe('uniqueDiagrams', () => {
  it('dedupes diagram sources by id', async () => {
    const first = await diagramsOf(`Lead.\n\n${MERMAID}`)
    const second = await diagramsOf(`Another lead.\n\n## Elsewhere\n\n${MERMAID}`)
    expect(first).toHaveLength(2)
    expect(second.map((one) => one.id)).toEqual(first.map((one) => one.id))

    const unique = uniqueDiagrams([first, second])
    expect(unique).toEqual(first)
    expect(new Set(unique.map((one) => one.id)).size).toBe(unique.length)
  })

  it('keeps the first entry per id, in order', () => {
    const a = { id: 'a'.repeat(32), variant: 'light' as const, source: 'graph TD' }
    const b = { id: 'b'.repeat(32), variant: 'dark' as const, source: 'graph LR' }
    expect(uniqueDiagrams([[b], [a, b], [a]])).toEqual([b, a])
  })
})

describe('document paths', () => {
  it('are site-relative, under api/v1', () => {
    expect(moduleDocPath('alpha/first', 'fa')).toBe('api/v1/modules/alpha/first/fa.json')
    expect(levelDocPath('alpha')).toBe('api/v1/levels/alpha.json')
  })
})
