import fs from 'node:fs'
import path from 'node:path'
import { oklchToHex } from '@/lib/color/oklch'

/**
 * Requirement B8 — the four-token Shiki dual theme, §6.7.
 *
 * "No syntax theme with more than four token colours" (§11.20). A nine-colour
 * default inside a one-accent system is chaos, so this theme carries exactly
 * four scopes and emphasises keywords by *weight* rather than by hue.
 *
 * Both variants are emitted and Shiki writes them as the `--shiki-light` /
 * `--shiki-dark` custom properties on every token span. Flipping `.dark`
 * therefore re-themes every code block with no re-highlight and no JavaScript,
 * which is what makes the 0ms theme switch of §9.2 possible.
 *
 * The colours are read out of `globals.css` at build time rather than copied
 * into this file. §11.25 makes derived-or-absent the rule for metadata; a
 * syntax theme that quietly keeps the *old* value of `--color-verify-ink` is
 * the same failure wearing a different hat.
 */

const GLOBALS_CSS = path.resolve(process.cwd(), 'src', 'app', 'globals.css')

/** Where the `.dark` override (§2.3) begins in that file. */
const DARK_SCOPE = /\.dark\s*\{/

export interface ThemeTokenValue {
  light: string
  dark: string
}

export interface CodeTokenRole {
  /** The TextMate scope this role highlights. */
  scope: string[]
  /** The design token that colours it. */
  token: string
  /** §6.7: keywords are emphasised by weight; nothing is ever italic. */
  bold?: true
}

/**
 * §6.7's table, with one correction §10.1 forces on it. Everything not listed
 * here falls through to the theme's default foreground, which is `--color-ink`.
 *
 * §6.7 originally named `--color-ink-faint` for the comment token. On the
 * `--color-sunken` code ground that is 2.45:1 in light and 2.54:1 in dark, and
 * T5 is a refusal: `--color-ink-faint` "may never be applied to text a user
 * must read". A comment in a teaching corpus is content — `# Example vectors`
 * is the line that explains the three below it — so the floor wins (§1) and
 * the token is `--color-ink-muted`, 4.71:1 light / 6.36:1 dark. That is the
 * same token §6.7 gives an untagged OUTPUT block, deliberately: the two are
 * different block types carrying the same "quieter than the code" weight, and
 * the language tag already tells them apart.
 */
export const CODE_TOKEN_ROLES: readonly CodeTokenRole[] = [
  { scope: ['comment', 'punctuation.definition.comment'], token: '--color-ink-muted' },
  { scope: ['string', 'constant.other.symbol', 'punctuation.definition.string'], token: '--color-verify-ink' },
  { scope: ['keyword', 'storage', 'storage.type', 'keyword.operator'], token: '--color-ink', bold: true },
  { scope: ['constant.numeric', 'constant.language', 'constant.character'], token: '--color-accent-ink' },
]

export const DEFAULT_TOKEN = '--color-ink'

let source: string | null = null

function globalsCss(): string {
  if (source === null) source = fs.readFileSync(GLOBALS_CSS, 'utf8')
  return source
}

/**
 * The light value is the one declared before the `.dark` block; the dark value
 * is the one declared inside it. Reading positionally rather than parsing CSS
 * keeps this to one regex and one index comparison, and it fails loudly the
 * moment either declaration disappears.
 */
export function readDesignToken(name: string): ThemeTokenValue {
  const css = globalsCss()
  const darkAt = css.search(DARK_SCOPE)
  if (darkAt === -1) {
    throw new Error(`code-theme: no .dark block in ${GLOBALS_CSS}`)
  }

  const declaration = new RegExp(`${name}\\s*:\\s*([^;]+);`, 'g')
  let light: string | null = null
  let dark: string | null = null

  for (const match of css.matchAll(declaration)) {
    const value = match[1].trim()
    if (match.index < darkAt) light ??= value
    else dark ??= value
  }

  if (light === null || dark === null) {
    throw new Error(
      `code-theme: ${name} is not declared in both themes in ${GLOBALS_CSS}` +
      ` (light: ${light ?? 'missing'}, dark: ${dark ?? 'missing'})`,
    )
  }
  return { light, dark }
}

export interface CodeThemeRule {
  scope: string[]
  settings: { foreground: string; fontStyle?: 'bold' }
}

export interface CodeTheme {
  name: string
  type: 'light' | 'dark'
  /** Transparent: §6.7 puts the block on `--color-sunken`, which must show. */
  bg: string
  fg: string
  colors: Record<string, string>
  settings: CodeThemeRule[]
}

export type CodeThemes = {
  light: CodeTheme
  dark: CodeTheme
}

function build(variant: 'light' | 'dark'): CodeTheme {
  const hex = (token: string) => oklchToHex(readDesignToken(token)[variant])
  const fg = hex(DEFAULT_TOKEN)

  return {
    name: `hidden-line-${variant}`,
    type: variant,
    bg: '#00000000',
    fg,
    colors: { 'editor.background': '#00000000', 'editor.foreground': fg },
    settings: CODE_TOKEN_ROLES.map((role) => ({
      scope: [...role.scope],
      settings: role.bold
        ? { foreground: hex(role.token), fontStyle: 'bold' as const }
        : { foreground: hex(role.token) },
    })),
  }
}

let themes: CodeThemes | null = null

/** The dual theme rehype-pretty-code is handed. Built once per process. */
export function codeThemes(): CodeThemes {
  themes ??= { light: build('light'), dark: build('dark') }
  return themes
}
