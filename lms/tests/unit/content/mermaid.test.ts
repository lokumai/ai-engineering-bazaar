import { describe, expect, it } from 'vitest'
import {
  MERMAID_FILL_CLASSES,
  assertNoRawHex,
  remapMermaidFills,
} from '@/lib/content/mermaid'

const RAIL = `graph LR
    A[13: Security] --> B[14: Loops]
    style A fill:#FFD9D9
    style B fill:#90EE90`

describe('remapMermaidFills', () => {
  it('replaces every style/fill line with a classDef and a class', () => {
    const out = remapMermaidFills(RAIL)
    expect(out).not.toContain('style A')
    expect(out).not.toContain('#FFD9D9')
    expect(out).toContain('classDef fault')
    expect(out).toContain('class A fault')
    expect(out).toContain('class B verify')
  })

  it('styles each class from design tokens, never a literal colour', () => {
    const out = remapMermaidFills(RAIL)
    expect(out).toContain('classDef fault fill:var(--color-fault-wash),stroke:var(--color-fault)')
    expect(out).toContain('classDef verify fill:var(--color-verify-wash),stroke:var(--color-verify)')
  })

  it('groups nodes that share a class into one statement', () => {
    const out = remapMermaidFills(`graph TD
    A --> B
    A --> C
    style B fill:#D6F5D6
    style C fill:#90EE90`)
    expect(out).toContain('class B,C verify')
    expect(out.match(/classDef verify/g)).toHaveLength(1)
  })

  it('leaves a diagram with no fills exactly as it was', () => {
    const plain = 'graph LR\n    A --> B'
    expect(remapMermaidFills(plain)).toBe(plain)
  })

  it('covers all nine hex values the corpus actually uses (§6.10 B2)', () => {
    expect(Object.keys(MERMAID_FILL_CLASSES)).toHaveLength(9)
    expect(new Set(Object.values(MERMAID_FILL_CLASSES))).toEqual(
      new Set(['fault', 'verify', 'info', 'caution']),
    )
  })

  it('refuses a hex that is not in the table rather than passing it through', () => {
    expect(() => remapMermaidFills('graph LR\n  A --> B\n  style A fill:#123456'))
      .toThrow(/#123456/)
  })
})

describe('assertNoRawHex', () => {
  it('accepts output with no colour literal', () => {
    expect(() => assertNoRawHex('<div data-mermaid="graph LR"></div>', 'x')).not.toThrow()
  })

  it('fails the build when a fill survives to the browser (§6.10 B3)', () => {
    expect(() => assertNoRawHex('<div data-mermaid="style A fill:#90EE90"></div>', 'sheet 13'))
      .toThrow(/sheet 13/)
  })
})
