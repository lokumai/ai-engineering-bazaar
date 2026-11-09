import { describe, expect, it } from 'vitest'
import { diagramId, diagramPath } from '@/lib/bundle/diagrams'

/**
 * A diagram file is named by its remapped source and its variant, and by
 * nothing else (spec 2.9.2), so the module document can name the file before
 * the finaliser draws it.
 */

const SOURCE = 'graph TD\n  A --> B\n'

describe('diagramId', () => {
  it('gives equal inputs an equal id', () => {
    expect(diagramId(SOURCE, 'light')).toBe(diagramId(SOURCE, 'light'))
  })

  it('changes when one character of the source changes', () => {
    expect(diagramId(SOURCE.replace('B', 'C'), 'light')).not.toBe(diagramId(SOURCE, 'light'))
  })

  it('changes with the variant', () => {
    expect(diagramId(SOURCE, 'dark')).not.toBe(diagramId(SOURCE, 'light'))
  })

  it('is 32 lowercase hex characters', () => {
    expect(diagramId(SOURCE, 'light')).toMatch(/^[0-9a-f]{32}$/)
    expect(diagramId(SOURCE, 'dark')).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('diagramPath', () => {
  it('is a site-relative path under api/v1/diagrams', () => {
    expect(diagramPath(diagramId(SOURCE, 'dark'))).toMatch(/^api\/v1\/diagrams\/[0-9a-f]{32}\.svg$/)
  })

  it('refuses something that is not an id', () => {
    expect(() => diagramPath('../x')).toThrow(/\.\.\/x/)
  })
})
