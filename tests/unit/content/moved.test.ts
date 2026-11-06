import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { loadModule } from '@/lib/content/loader'
import { MOVED_LEVELS, MOVED_MODULES } from '@/lib/content/moved'

/**
 * D94 — a retired address forwards, so where it forwards to must exist and
 * the old address must not still be live. Holds for whatever the list holds.
 */
const LEVELS = new Set(CATEGORIES.map((category) => category.slug as string))

describe('every retired address forwards somewhere real', () => {
  it('a renamed level points at a level the curriculum has, and is not one itself', () => {
    for (const [from, to] of Object.entries(MOVED_LEVELS)) {
      expect(LEVELS.has(to), `${from} forwards to ${to}, which is not a level`).toBe(true)
      expect(LEVELS.has(from), `${from} is still a live level`).toBe(false)
    }
  })

  it('a moved module points at a module the curriculum has, and is not one itself', () => {
    for (const [from, to] of Object.entries(MOVED_MODULES)) {
      expect(loadModule(to), `${from} forwards to ${to}, which is not a module`).toBeDefined()
      expect(loadModule(from), `${from} is still a live module`).toBeUndefined()
    }
  })
})
