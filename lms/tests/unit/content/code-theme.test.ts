import { describe, expect, it } from 'vitest'
import { oklchToHex } from '@/lib/color/oklch'
import {
  CODE_TOKEN_ROLES,
  codeThemes,
  readDesignToken,
} from '@/lib/content/code-theme'

describe('readDesignToken', () => {
  it('reads a token out of globals.css in both themes', () => {
    expect(readDesignToken('--color-ink')).toEqual({
      light: 'oklch(0.22  0.012 250)',
      dark: 'oklch(0.93  0.006 250)',
    })
  })

  it('fails loudly rather than inventing a value for an unknown token', () => {
    expect(() => readDesignToken('--color-not-a-token')).toThrow(/--color-not-a-token/)
  })
})

describe('codeThemes', () => {
  const { light, dark } = codeThemes()

  it('carries exactly four token colours plus the default foreground (§6.7)', () => {
    // Four scopes: comment, string, keyword, number/literal/boolean.
    expect(light.settings).toHaveLength(4)
    expect(dark.settings).toHaveLength(4)
    expect(new Set(light.settings.map((s) => s.settings.foreground)).size).toBe(4)
  })

  it('derives every colour from a design token, never a literal', () => {
    const expected = (name: string, theme: 'light' | 'dark') =>
      oklchToHex(readDesignToken(name)[theme])

    expect(light.fg).toBe(expected('--color-ink', 'light'))
    expect(dark.fg).toBe(expected('--color-ink', 'dark'))
    for (const role of CODE_TOKEN_ROLES) {
      const found = light.settings.find((s) => s.scope[0] === role.scope[0])
      expect(found?.settings.foreground).toBe(expected(role.token, 'light'))
    }
  })

  it('emphasises keywords by weight, not by colour (§6.7)', () => {
    const keyword = light.settings.find((s) => s.scope.includes('keyword'))
    expect(keyword?.settings.fontStyle).toBe('bold')
    expect(keyword?.settings.foreground).toBe(light.fg)
  })

  it('never sets a token italic — mono italic is forbidden (§3.4)', () => {
    for (const theme of [light, dark]) {
      for (const rule of theme.settings) {
        expect(rule.settings.fontStyle ?? '').not.toContain('italic')
      }
    }
  })

  it('paints no background, so the §6.7 --color-sunken ground shows through', () => {
    expect(light.bg).toBe('#00000000')
    expect(dark.bg).toBe('#00000000')
  })

  it('names the two variants distinctly so the dual theme can switch', () => {
    expect(light.name).not.toBe(dark.name)
  })
})
