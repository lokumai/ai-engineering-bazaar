/**
 * Which stylesheets in `src/app/` are SURFACES, stated once.
 *
 * Four test files carried their own copy of this — `views.test.ts`,
 * `category-surfaces.test.ts`, `slab-and-controls.test.ts` and
 * `styling-references.test.ts` — which is one fact in four places, and a fifth
 * stylesheet with a special status would have had to be added to all of them
 * or silently checked as a surface in some and not others.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** `src/app/`, from this file rather than from each caller's own guess. */
export const SURFACE_DIR = join(import.meta.dirname, '../../../src/app')

/**
 * The two files in `src/app/` that are not surfaces, and why each one is not.
 *
 * `globals.css` is the entry point: `@import`s, `color-scheme`, and the
 * one-frame transition freeze. Nothing in it is a design decision, which is
 * why it is not empty and why it is not held to the surface discipline.
 *
 * `lokum-modules.css` is GENERATED, from `mini-courses/curriculum.yaml` by
 * `scripts/curriculum-css.mjs`, and committed because vitest and playwright
 * never run `prebuild`. It declares colours and states, which a surface may
 * not — and it is allowed to because the thing it states is per-module
 * channel-A reveals that CSS cannot express any other way.
 */
export const NOT_A_SURFACE: ReadonlySet<string> = new Set([
  'globals.css',
  'lokum-modules.css',
])

export interface Surface {
  name: string
  css: string
}

/** Every surface stylesheet, discovered rather than listed. */
export function surfaces(): Surface[] {
  return readdirSync(SURFACE_DIR)
    .filter((name) => name.endsWith('.css') && !NOT_A_SURFACE.has(name))
    .sort()
    .map((name) => ({ name, css: readFileSync(join(SURFACE_DIR, name), 'utf8') }))
}
