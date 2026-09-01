import { readFileSync } from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AliasPage from '@/app/sign-in/alias/page'
import { AliasSheet, aliasFrom, storedMark } from '@/components/identity/AliasSheet'
import { MARKS, NAMED_MARK_IDS, STORABLE_MARK_IDS } from '@/lib/identity/mark'
import { ALIAS_SCOPE, NAME_SCOPE } from '@/lib/record/scope'

/**
 * §15.4 — the alias screen, in the three places it could quietly lie.
 *
 * `renderToStaticMarkup` gives exactly what the static export writes: with no
 * DOM, `useSyncExternalStore`'s `getServerSnapshot` returns the frozen
 * `EMPTY_RECORD`, so this is the first frame every reader sees — no name, no
 * seed, the seeded option checked. That frame is the state §12.2 exists to make
 * correct, so it is the frame worth asserting against.
 *
 * What this file deliberately does not test: clicking a radio, typing, the
 * write reaching storage, the request count. Those need a real browser and are
 * `tests/e2e/alias.spec.ts`'s job (§12.14.2, §15.10). There is no jsdom here and
 * no Testing Library, so nothing pretends to have a layout.
 *
 * The three guards, and the defect each one catches:
 *
 *  1. **The rendered order is `STORABLE_MARK_IDS`.** `mark.ts` calls the order a
 *     stored contract: a reader who chose the sixth mark must find that glyph in
 *     the sixth place. A picker that sorted the list alphabetically, dropped
 *     `lokum` or hard-coded seven ids would still render and still look right.
 *  2. **`seeded` maps to `mark: null`.** The record's canonical form for "use the
 *     minted seed" (§12.1.3). Storing the string `'seeded'` also reads back as a
 *     seeded mark, so nothing visible breaks — until a record written by this
 *     screen is compared against one written by `MarkPicker`.
 *  3. **An empty field is an absence, not a name**, decided the way
 *     `IdentityPanel` decides it. A screen that wrote `''` would put a name on
 *     the record that prints as nothing at all.
 */

const SHEET = renderToStaticMarkup(<AliasSheet />)
const PAGE = renderToStaticMarkup(<AliasPage />)

/** The rendered text alone: attribute names are not copy (§12.14.1). */
function words(markup: string): string {
  return markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2019;/g, '’')
    .replace(/&amp;/g, '&')
}

/** Every `data-hl-mark` value, in document order. */
function renderedMarkIds(markup: string): string[] {
  return [...markup.matchAll(/data-hl-mark="([a-z]+)"/g)].map(([, id]) => id)
}

function sourceOf(relative: string): string {
  return readFileSync(path.resolve(process.cwd(), relative), 'utf8')
}

describe('§15.4.2 — the picker renders the stored order', () => {
  it('renders every storable id, in the array\'s own order', () => {
    expect(renderedMarkIds(SHEET)).toEqual([...STORABLE_MARK_IDS])
  })

  it('renders one radio per option and no more', () => {
    const radios = SHEET.match(/type="radio"/g) ?? []
    expect(radios).toHaveLength(STORABLE_MARK_IDS.length)
    // The group is one control, so every radio shares one name (§12.3.5).
    const named = SHEET.match(/name="hl-alias-mark"/g) ?? []
    expect(named).toHaveLength(STORABLE_MARK_IDS.length)
  })

  it('labels each option from MARKS rather than from a second list', () => {
    for (const option of MARKS) {
      expect(words(SHEET)).toContain(option.label)
    }
  })

  it('checks the seeded option in the first frame, which is the record\'s default', () => {
    const first = SHEET.slice(0, SHEET.indexOf('data-hl-mark="datum"'))
    expect(first).toContain('data-hl-selected="true"')
    expect(first).toContain('checked=""')
    // Exactly one option is selected in the prerender.
    expect(SHEET.match(/data-hl-selected="true"/g) ?? []).toHaveLength(1)
  })

  it('draws the seeded glyph from nothing before a seed is minted (§11.25)', () => {
    // `markPaths` returns an empty array with no seed, and `DrafterStamp` then
    // renders nothing at all — never a substitute glyph, never `?`.
    expect(words(SHEET)).toContain('NO SEED MINTED YET')
    const preview = SHEET.slice(SHEET.indexOf('<aside'))
    expect(preview).not.toContain('<svg')
    expect(preview).not.toContain('?')
  })
})

describe('§12.1.3 — what the two fields store', () => {
  it('maps seeded to null, which is the record\'s form for "use the seed"', () => {
    expect(storedMark('seeded')).toBeNull()
  })

  it('maps every named glyph to itself, unchanged', () => {
    for (const id of NAMED_MARK_IDS) {
      expect(storedMark(id)).toBe(id)
    }
  })

  it('covers every storable id with one of those two answers', () => {
    for (const id of STORABLE_MARK_IDS) {
      const stored = storedMark(id)
      expect(stored === null || stored === id).toBe(true)
    }
    // A mutation that returned the string `'seeded'` would pass the line above
    // and be wrong, so the one cell that matters is pinned on its own.
    expect(STORABLE_MARK_IDS.map(storedMark)).toEqual([null, ...NAMED_MARK_IDS])
  })

  it('reads an empty or whitespace field as an absence, as IdentityPanel does', () => {
    expect(aliasFrom('')).toBeNull()
    expect(aliasFrom('   ')).toBeNull()
    expect(aliasFrom(' \t')).toBeNull()
  })

  it('stores a name the way the record holds it, trimmed and never truncated', () => {
    expect(aliasFrom('  Cevheri  ')).toBe('Cevheri')
    const long = 'İlker'.repeat(20)
    expect(aliasFrom(long)).toBe(long)
  })
})

describe('§15.4.3 — the correction rides on the artefact', () => {
  it('prints UNVERIFIED inside the stamp block, in caution ink', () => {
    const preview = SHEET.slice(SHEET.indexOf('<aside'))
    expect(words(preview)).toContain('UNVERIFIED')
    expect(preview).toContain('text-caution-ink')
    // Colour is never the only signal: the word carries it on its own.
    expect(words(preview.replace(/text-caution-ink/g, ''))).toContain('UNVERIFIED')
  })

  it('previews an empty name as UNSIGNED, which is what the title block prints', () => {
    const preview = SHEET.slice(SHEET.indexOf('<aside'))
    expect(words(preview)).toContain('UNSIGNED')
    // Never a placeholder person and never a fabricated example name.
    expect(words(SHEET)).not.toMatch(/\b(anonymous|reader|guest|unnamed|your name here)\b/i)
  })

  it('omits the seed row entirely when there is no seed (§11.25)', () => {
    const preview = SHEET.slice(SHEET.indexOf('<aside'))
    expect(words(preview)).not.toContain('Seed')
    expect(words(preview)).toContain('Mark')
    expect(words(preview)).toContain('Status')
  })
})

describe('§15.4.5 — two controls of one weight', () => {
  it('gives the keep and the exit the same class and no primary variant', () => {
    expect(words(SHEET)).toContain('KEEP THIS ALIAS')
    expect(words(SHEET)).toContain('READ WITHOUT ONE')
    expect(SHEET.match(/class="hl-btn"/g) ?? []).toHaveLength(2)
    // The accent means signed off (T1) and nothing on this screen is one.
    expect(SHEET).not.toContain('hl-btn-danger')
    expect(SHEET).not.toContain('aria-pressed')
  })

  it('points the exit at the home screen, which is a route that exists', () => {
    expect(SHEET).toContain('href="/"')
  })
})

describe('§15.9.1 — the claims about the record have one author', () => {
  it('takes the field hint from NAME_SCOPE, verbatim', () => {
    expect(words(SHEET)).toContain(NAME_SCOPE)
  })

  it('takes the page lead from ALIAS_SCOPE, verbatim', () => {
    expect(words(PAGE)).toContain(ALIAS_SCOPE)
  })

  it('states the limit before the offer, and never the banned promise (§15.5.4)', () => {
    expect(words(PAGE)).toContain('LOCAL ONLY')
    expect(words(PAGE)).not.toMatch(/save your progress/i)
  })
})

describe('§15.4.4 — the route renders with no environment', () => {
  const FILES = [
    'src/app/sign-in/alias/page.tsx',
    'src/components/identity/AliasSheet.tsx',
  ]

  /**
   * A source scan rather than a module-graph walk, because the graph is what
   * the e2e request count already measures at runtime. This catches the import
   * being added at all, which is the moment the mistake is cheap.
   */
  function imports(source: string): string[] {
    return [...source.matchAll(/from '([^']+)'/g)].map(([, from]) => from)
  }

  for (const file of FILES) {
    it(`${file} imports no supabase module and no session`, () => {
      const from = imports(sourceOf(file))
      expect(from.filter((id) => /supabase|@\/lib\/auth/.test(id))).toEqual([])
    })
  }

  it('keeps the island clear of every node:fs-reaching module (§12.2)', () => {
    const from = imports(sourceOf('src/components/identity/AliasSheet.tsx'))
    expect(from.filter((id) => id.startsWith('@/lib/content'))).toEqual([])
    expect(from.filter((id) => id.startsWith('node:'))).toEqual([])
  })

  it('lets the page reach the corpus only through PageShell, as /sign-in/ does', () => {
    const from = imports(sourceOf('src/app/sign-in/alias/page.tsx'))
    expect(from.filter((id) => id.startsWith('@/lib/content'))).toEqual([])
    expect(from).toContain('@/components/shell/PageShell')
  })
})
