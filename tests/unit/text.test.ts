import { describe, expect, it } from 'vitest'
import { plural } from '@/lib/text'

describe('plural', () => {
  it('counts one in the singular', () => {
    expect(plural(1, 'module')).toBe('1 module')
  })

  it('counts everything else in the plural', () => {
    expect(plural(0, 'module')).toBe('0 modules')
    expect(plural(9, 'module')).toBe('9 modules')
  })

  it('takes an irregular plural where the -s rule does not hold', () => {
    expect(plural(2, 'index', 'indices')).toBe('2 indices')
  })
})
