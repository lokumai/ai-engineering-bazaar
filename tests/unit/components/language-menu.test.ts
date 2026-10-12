import { describe, expect, it } from 'vitest'
import { alternatesOf } from '@/components/shell/LanguageMenu'
import type { TranslatedLang } from '@/lib/content/languages'

/**
 * M28 — the bar's language menu offers exactly the addresses a module has.
 *
 * The sets are invented here rather than read from the corpus: the rule is
 * about the parse, and holds whichever modules happen to be translated.
 */
const sets = (tr: string[], fa: string[]): Record<TranslatedLang, ReadonlySet<string>> => ({
  tr: new Set(tr),
  fa: new Set(fa),
})

describe('alternatesOf', () => {
  const both = sets(['fundamentals/llms'], ['fundamentals/llms'])

  it('offers English and every language the module has, English first', () => {
    expect(alternatesOf('/courses/fundamentals/llms/', both))
      .toEqual({ slug: 'fundamentals/llms', current: 'en', available: ['en', 'tr', 'fa'] })
  })

  it('knows which one is being read, from the address', () => {
    expect(alternatesOf('/tr/courses/fundamentals/llms/', both)?.current).toBe('tr')
    expect(alternatesOf('/fa/courses/fundamentals/llms/', both)?.current).toBe('fa')
  })

  it('leaves out a language the module has no page in', () => {
    const turkishOnly = sets(['fundamentals/llms'], [])
    expect(alternatesOf('/courses/fundamentals/llms/', turkishOnly)?.available).toEqual(['en', 'tr'])
  })

  it('is not there at all where the module has one address', () => {
    expect(alternatesOf('/courses/fundamentals/llms/', sets([], []))).toBeNull()
    expect(alternatesOf('/sheets/', both)).toBeNull()
    expect(alternatesOf('/', both)).toBeNull()
  })

  it('claims no language for an address that language never built', () => {
    const turkishOnly = sets(['fundamentals/llms'], [])
    expect(alternatesOf('/fa/courses/fundamentals/llms/', turkishOnly)).toBeNull()
  })

  it('reads no language out of a segment that is not one', () => {
    expect(alternatesOf('/de/courses/fundamentals/llms/', both)).toBeNull()
  })
})
