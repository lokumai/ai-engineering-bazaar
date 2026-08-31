import { describe, expect, it } from 'vitest'
import { plural } from '@/lib/text'

describe('plural', () => {
  it('counts one in the singular', () => {
    expect(plural(1, 'sheet')).toBe('1 sheet')
  })

  it('counts everything else in the plural', () => {
    expect(plural(0, 'sheet')).toBe('0 sheets')
    expect(plural(9, 'sheet')).toBe('9 sheets')
  })

  it('takes an irregular plural where the -s rule does not hold', () => {
    expect(plural(2, 'index', 'indices')).toBe('2 indices')
  })
})
