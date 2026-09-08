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
 * §6.7's table, as M11 moved it onto the slab.
 *
 * **The code ground is no longer `--color-sunken` and no longer flips with the
 * theme.** A code block is a dark slab in both themes now — the author's
 * explicit choice, and the one place the page goes dark on purpose, because it
 * separates what the machine says from what the author says
 * (`kia-context/specs/DESIGN.md`, Overview). Every token below is therefore a
 * `--color-slab-*` token, declared identically in both themes in
 * `globals.css`.
 *
 * That change also settles §11.20's "no syntax theme with more than four token
 * colours" the other way, and deliberately. Four was the right budget when the
 * code ground was the page's own sand and a fifth hue would have been a fifth
 * hue *in the page's palette*. The slab is its own small palette with its own
 * ground, closed to five values, and DESIGN.md names all five: keyword, string,
 * comment, function, number. Emphasis by weight is kept for keywords on top of
 * the hue, because that is what made the four-colour theme readable.
 *
 * The correction §10.1 forced on the old table carries over unchanged, and it
 * is the reason `slab-comment` is not the value DESIGN.md first carried: a
 * comment in a teaching corpus is CONTENT — `# Example vectors` is the line
 * that explains the three below it — so it takes the 4.5:1 text floor, and
 * `#767c88` measured 3.92:1 on the slab. `contrast.test.ts` recomputes all six
 * against `--color-slab` on every change.
 */
export const CODE_TOKEN_ROLES: readonly CodeTokenRole[] = [
  { scope: ['comment', 'punctuation.definition.comment'], token: '--color-slab-comment' },
  { scope: ['string', 'constant.other.symbol', 'punctuation.definition.string'], token: '--color-slab-string' },
  { scope: ['keyword', 'storage', 'storage.type', 'keyword.operator'], token: '--color-slab-keyword', bold: true },
  { scope: ['constant.numeric', 'constant.language', 'constant.character'], token: '--color-slab-number' },
  {
    scope: ['entity.name.function', 'support.function', 'meta.function-call'],
    token: '--color-slab-function',
  },
]

export const DEFAULT_TOKEN = '--color-slab-ink'

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
