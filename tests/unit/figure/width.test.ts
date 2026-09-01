import { describe, expect, it } from 'vitest'
import { widthForColumns, widthForNaturalWidth } from '@/lib/figure/width'

/**
 * §6.10 B5 — "same rule as tables: measured natural SVG width ≤656 → prose;
 * ≤920 → wide; else full 1152". The boundaries are the layout tracks in §2.2,
 * so they are asserted exactly rather than approximately.
 */
describe('widthForNaturalWidth', () => {
  it('keeps a diagram that fits the measure inside the measure', () => {
    expect(widthForNaturalWidth(320)).toBe('prose')
    expect(widthForNaturalWidth(656)).toBe('prose')
  })

  it('breaks out to the wide track between the measure and 920', () => {
    expect(widthForNaturalWidth(657)).toBe('wide')
    expect(widthForNaturalWidth(920)).toBe('wide')
  })

  it('takes the whole content box beyond that, and scrolls inside it', () => {
    expect(widthForNaturalWidth(921)).toBe('full')
    expect(widthForNaturalWidth(2400)).toBe('full')
  })

  it('falls back to the measure when nothing could be measured', () => {
    expect(widthForNaturalWidth(0)).toBe('prose')
    expect(widthForNaturalWidth(Number.NaN)).toBe('prose')
  })
})

describe('widthForColumns', () => {
  it('classes a table by its column count (§6.5)', () => {
    expect(widthForColumns(2)).toBe('prose')
    expect(widthForColumns(4)).toBe('prose')
    expect(widthForColumns(5)).toBe('wide')
    expect(widthForColumns(6)).toBe('full')
  })
})
