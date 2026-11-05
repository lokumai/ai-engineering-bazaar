import { describe, expect, it } from 'vitest'
import { designTokens, resolveTokens } from '@/lib/bundle/tokens'
import { CODE_TOKEN_ROLES, DEFAULT_TOKEN, readDesignToken, toHex } from '@/lib/content/code-theme'

/**
 * The design tokens of both themes, resolved for a reader that has no CSS
 * engine (spec 2.10). The resolver is proved on synthetic stylesheets; the one
 * test over `bazaar.css` holds for any content of it, because it compares the
 * resolver to the reader `code-theme.ts` already ships.
 */

const sheet = (theme: string, dark = '', extra = '') =>
  `/* a comment { with a brace */\n@theme {\n${theme}\n}\n${extra}\n.dark {\n${dark}\n}\n`

describe('resolveTokens', () => {
  it('resolves a var() chain within each theme', () => {
    const tokens = resolveTokens(sheet(
      '  --base: #102030;\n  --mid: var(--base);\n  --top: var(--mid);',
      '  --base: #405060;',
    ))
    expect(tokens.light['--top']).toBe('#102030ff')
    expect(tokens.dark['--top']).toBe('#405060ff')
    expect(tokens.dark['--mid']).toBe('#405060ff')
  })

  it('gives both themes the same keys, with the leading dashes, in declaration order', () => {
    const tokens = resolveTokens(sheet('  --one: 1px;\n  --two: #fff;', '  --two: #000;'))
    expect(Object.keys(tokens.light)).toEqual(['--one', '--two'])
    expect(Object.keys(tokens.dark)).toEqual(['--one', '--two'])
    expect(tokens.dark['--one']).toBe('1px')
  })

  it('refuses a cycle, naming the token', () => {
    expect(() => resolveTokens(sheet('  --a: var(--b);\n  --b: var(--a);'))).toThrow(/--a\b/)
  })

  it('refuses a missing reference, naming the token', () => {
    expect(() => resolveTokens(sheet('  --a: var(--nowhere);'))).toThrow(/--a\b/)
  })

  it('refuses a .dark name that @theme lacks, naming it', () => {
    expect(() => resolveTokens(sheet('  --b: #fff;', '  --a: #000;'))).toThrow(/--a\b/)
  })

  it('normalises every colour form to lowercase #rrggbbaa', () => {
    const tokens = resolveTokens(sheet([
      '  --short: #AbC;',
      '  --long: #A1B2C3;',
      '  --alpha: #A1B2C380;',
      '  --rgb: rgb(255, 0, 16);',
      '  --rgba: rgba(255, 255, 255, 0.10);',
      '  --tight:#ABCDEF;',
    ].join('\n')))
    expect(tokens.light).toEqual({
      '--short': '#aabbccff',
      '--long': '#a1b2c3ff',
      '--alpha': '#a1b2c380',
      '--rgb': '#ff0010ff',
      '--rgba': '#ffffff1a',
      '--tight': '#abcdefff',
    })
  })

  it('keeps any other value as declared after substitution, whitespace collapsed', () => {
    const tokens = resolveTokens(sheet(
      '  --ink: rgba(40, 30, 10, 0.13);\n  --shadow:   0 12px\n     28px var(--ink);\n  --font: "Avenir Next", ui-sans-serif;',
    ))
    expect(tokens.light['--shadow']).toBe('0 12px 28px rgba(40, 30, 10, 0.13)')
    expect(tokens.light['--font']).toBe('"Avenir Next", ui-sans-serif')
  })

  it('reads only the top level of @theme and .dark, never :root', () => {
    const tokens = resolveTokens(sheet(
      '  --kept: 1px;\n  @keyframes spin { to { --nested: 2px; } }',
      '',
      '@layer base {\n  :root {\n    --bz-component: #fff;\n  }\n}',
    ))
    expect(Object.keys(tokens.light)).toEqual(['--kept'])
  })

  it('refuses a stylesheet with no @theme or no .dark block', () => {
    expect(() => resolveTokens('.dark { --a: 1px; }')).toThrow(/@theme/)
    expect(() => resolveTokens('@theme { --a: 1px; }')).toThrow(/\.dark/)
  })
})

describe('designTokens', () => {
  const tokens = designTokens()
  const roles = [...CODE_TOKEN_ROLES.map((role) => role.token), DEFAULT_TOKEN]

  for (const token of roles) {
    it(`resolves ${token} to the colour code-theme.ts reads, in both themes`, () => {
      const read = readDesignToken(token)
      expect(tokens.light[token]).toBe(`${toHex(read.light)}ff`)
      expect(tokens.dark[token]).toBe(`${toHex(read.dark)}ff`)
    })
  }
})
