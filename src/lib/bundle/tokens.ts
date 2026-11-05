import fs from 'node:fs'
import path from 'node:path'

/**
 * The design tokens of both themes, resolved to plain values for a reader that
 * has no CSS engine (spec 2.10). The `tokens.json` route serialises this.
 *
 * **Which declarations are tokens.** Every custom property at the top level of
 * `@theme`, with the overrides at the top level of `.dark`. `:root` is not
 * read: it sits inside `@layer base` and holds component variables
 * (`--bz-done`, `--bz-cat`, `--bz-swatch-*`), not the language's tokens. A
 * block nested inside `@theme` (a `@keyframes`) is skipped for the same
 * reason. A `.dark` name that `@theme` lacks throws, because it would be a
 * dark-only token with no light value, and the two maps must have the same
 * keys.
 *
 * **Not `readDesignToken`.** That reader (`code-theme.ts`) takes one token
 * positionally and cannot follow a `var()` chain, which the slab and the bar
 * both use. `tokens.test.ts` proves this resolver agrees with it on every
 * token that reader serves.
 *
 * **Values.** `var(--x)` is resolved within the same theme, recursively; a
 * missing reference and a cycle each throw naming the token, because a
 * resolver with no cycle check also throws, but as a stack overflow that names
 * nothing. A value that is wholly a colour becomes lowercase `#rrggbbaa`, so
 * the reader parses one notation. Anything else keeps its declared text, with
 * each reference replaced by the referenced token's declared text and
 * whitespace collapsed.
 *
 * Build-time only (`node:fs`).
 */

export interface ThemeTokens {
  light: Record<string, string>
  dark: Record<string, string>
}

const TOKENS_CSS = path.resolve(process.cwd(), 'src', 'design', 'bazaar.css')

const VAR = /var\(\s*(--[A-Za-z0-9_-]+)\s*(,[^)]*)?\)/g
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const BYTE = '\\s*(\\d{1,3})\\s*'
const RGB = new RegExp(`^rgb\\(${BYTE},${BYTE},${BYTE}\\)$`)
const RGBA = new RegExp(`^rgba\\(${BYTE},${BYTE},${BYTE},\\s*(\\d*\\.?\\d+)\\s*\\)$`)

function fail(why: string): never {
  throw new Error(`tokens: ${why}`)
}

/** The body of every top-level block, keyed by its selector or at-rule prelude. */
function topLevelBlocks(css: string): { prelude: string; body: string }[] {
  const blocks: { prelude: string; body: string }[] = []
  let depth = 0
  let preludeAt = 0
  let bodyAt = 0
  let prelude = ''
  for (let at = 0; at < css.length; at += 1) {
    const character = css[at]
    if (character === '{') {
      if (depth === 0) {
        prelude = css.slice(preludeAt, at).trim()
        bodyAt = at + 1
      }
      depth += 1
    } else if (character === '}') {
      depth -= 1
      if (depth < 0) fail('an unbalanced } in the stylesheet')
      if (depth === 0) {
        blocks.push({ prelude, body: css.slice(bodyAt, at) })
        preludeAt = at + 1
      }
    } else if (character === ';' && depth === 0) {
      // A top-level statement such as `@import`, which opens no block.
      preludeAt = at + 1
    }
  }
  if (depth !== 0) fail('an unclosed { in the stylesheet')
  return blocks
}

/** The custom properties declared at the top level of one block, in order. */
function declarations(body: string, where: string): Map<string, string> {
  const found = new Map<string, string>()
  let depth = 0
  let flat = ''
  for (const character of body) {
    if (character === '{') depth += 1
    else if (character === '}') {
      depth -= 1
      // A nested block ends where a declaration could begin.
      if (depth === 0) flat += ';'
      continue
    }
    if (depth === 0) flat += character
  }
  for (const statement of flat.split(';')) {
    const text = statement.trim()
    if (text === '') continue
    const colon = text.indexOf(':')
    const name = colon === -1 ? '' : text.slice(0, colon).trim()
    if (!name.startsWith('--')) {
      // What is left of a nested block's prelude (`@keyframes spin`) has no colon.
      if (colon === -1 && text.startsWith('@')) continue
      fail(`"${text}" in ${where} is not a custom property declaration`)
    }
    if (found.has(name)) fail(`${name} is declared twice in ${where}`)
    found.set(name, text.slice(colon + 1).trim())
  }
  return found
}

function onlyBlock(blocks: { prelude: string; body: string }[], prelude: string): string {
  const matching = blocks.filter((block) => block.prelude === prelude)
  if (matching.length === 0) fail(`the stylesheet has no top-level ${prelude} block`)
  if (matching.length > 1) fail(`the stylesheet has ${matching.length} top-level ${prelude} blocks`)
  return matching[0].body
}

const byte = (value: number) => value.toString(16).padStart(2, '0')

function channel(text: string, name: string): number {
  const value = Number(text)
  if (value > 255) fail(`${name}: the channel ${text} is above 255`)
  return value
}

/** Lowercase `#rrggbbaa` for a value that is wholly a colour, or null. */
function asColour(value: string, name: string): string | null {
  const hex = HEX.exec(value)
  if (hex) {
    const digits = hex[1].toLowerCase()
    if (digits.length === 3) return `#${[...digits].map((d) => d + d).join('')}ff`
    return digits.length === 6 ? `#${digits}ff` : `#${digits}`
  }
  const rgb = RGB.exec(value)
  if (rgb) return `#${rgb.slice(1, 4).map((c) => byte(channel(c, name))).join('')}ff`
  const rgba = RGBA.exec(value)
  if (rgba) {
    const alpha = Number(rgba[4])
    if (alpha > 1) fail(`${name}: the alpha ${rgba[4]} is above 1`)
    return `#${rgba.slice(1, 4).map((c) => byte(channel(c, name))).join('')}${byte(Math.round(alpha * 255))}`
  }
  return null
}

function resolveTheme(declared: Map<string, string>, theme: string): Record<string, string> {
  /** Each token's text with every reference substituted, before normalising. */
  const substituted = new Map<string, string>()

  const substitute = (name: string, trail: string[]): string => {
    const done = substituted.get(name)
    if (done !== undefined) return done
    if (trail.includes(name)) fail(`${trail[0]} is part of a cycle in ${theme}: ${[...trail, name].join(' -> ')}`)
    const raw = declared.get(name)
    if (raw === undefined) fail(`${trail[0] ?? name} refers to ${name}, which ${theme} does not declare`)

    const text = raw.replace(VAR, (whole, reference: string, fallback: string | undefined) => {
      if (fallback !== undefined) fail(`${name} uses ${whole}; a var() fallback is not resolved`)
      return substitute(reference, [...trail, name])
    })
    substituted.set(name, text)
    return text
  }

  return Object.fromEntries([...declared.keys()].map((name) => {
    const text = substitute(name, []).trim()
    return [name, asColour(text, name) ?? text.replace(/\s+/g, ' ')]
  }))
}

export function resolveTokens(css: string): ThemeTokens {
  const blocks = topLevelBlocks(css.replace(/\/\*[\s\S]*?\*\//g, ''))
  const theme = declarations(onlyBlock(blocks, '@theme'), '@theme')
  const dark = declarations(onlyBlock(blocks, '.dark'), '.dark')

  for (const name of dark.keys()) {
    if (!theme.has(name)) fail(`${name} is declared in .dark and not in @theme`)
  }

  return {
    light: resolveTheme(theme, 'the light theme'),
    dark: resolveTheme(new Map([...theme].map(([name, value]) => [name, dark.get(name) ?? value])), 'the dark theme'),
  }
}

/** The language's own tokens, from `src/design/bazaar.css`. */
export function designTokens(): ThemeTokens {
  return resolveTokens(fs.readFileSync(TOKENS_CSS, 'utf8'))
}
