import { describe, expect, it } from 'vitest'
import { clamp, lerp, mulberry32, smoothstep } from '@/lib/motion-math'

describe('motion-math', () => {
  it('clamps between the bounds, and to 0..1 with none', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(clamp(2, 0, 3)).toBe(2)
    expect(clamp(1.5)).toBe(1)
  })

  it('lets the floor win when the bounds cross, which the caravan card relies on', () => {
    expect(clamp(10, 64, 20)).toBe(64)
    expect(clamp(100, 64, 20)).toBe(64)
  })

  it('interpolates and eases', () => {
    expect(lerp(10, 20, 0.5)).toBe(15)
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(1)).toBe(1)
    expect(smoothstep(0.5)).toBe(0.5)
    expect(smoothstep(2)).toBe(1)
  })

  it('repeats a seed', () => {
    const a = mulberry32(20261109)
    const b = mulberry32(20261109)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})
