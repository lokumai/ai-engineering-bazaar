import { describe, expect, it } from 'vitest'
import { COPIED_MS, overflowState } from '@/lib/affordance'

describe('overflowState', () => {
  it('shows nothing when the content fits', () => {
    expect(overflowState({ scrollLeft: 0, scrollWidth: 656, clientWidth: 656 })).toBe('none')
  })

  it('fades the right edge while there is more to the right', () => {
    expect(overflowState({ scrollLeft: 0, scrollWidth: 1152, clientWidth: 656 })).toBe('right')
  })

  it('removes the fade at the right end', () => {
    expect(overflowState({ scrollLeft: 496, scrollWidth: 1152, clientWidth: 656 })).toBe('none')
  })

  it('tolerates the sub-pixel scroll positions a zoomed browser reports', () => {
    expect(overflowState({ scrollLeft: 495.6, scrollWidth: 1152, clientWidth: 656 })).toBe('none')
  })

  it('holds COPIED for the 1200ms §6.7 specifies', () => {
    expect(COPIED_MS).toBe(1200)
  })
})
