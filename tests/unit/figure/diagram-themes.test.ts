import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DIAGRAM_THEME,
  DIAGRAM_THEMES,
  DIAGRAM_THEME_ATTRIBUTE,
  diagramThemeOf,
  isDiagramThemeId,
} from '@/lib/reading/diagram-themes'
import { setDiagramTheme } from '@/lib/record/events'
import { EMPTY_RECORD } from '@/lib/record/schema'
import { coerceRecordData } from '@/lib/record/validate'

/**
 * The diagram theme the reader chose (2026-11-08): what is stored, what is read back, and
 * what the stylesheet does with it. Every rule holds for any list of themes, so adding or
 * retiring one never turns a line here red unless the three places that must agree
 * (the list, the frame's ground, the menu's check) have stopped agreeing.
 */

const SRC = join(process.cwd(), 'src')
const css = readFileSync(join(SRC, 'design/bazaar.css'), 'utf8')

describe('the stored choice', () => {
  it('is null for a reader who has never chosen, which is the default', () => {
    expect(EMPTY_RECORD.prefs.diagramTheme).toBeNull()
    expect(coerceRecordData({}).prefs.diagramTheme).toBeNull()
    expect(diagramThemeOf(null).id).toBe(DEFAULT_DIAGRAM_THEME)
    expect(diagramThemeOf(EMPTY_RECORD.prefs.diagramTheme).id).toBe('default')
  })

  it('is read back as chosen when it names a theme, and as not chosen when it does not', () => {
    for (const theme of DIAGRAM_THEMES) {
      expect(coerceRecordData({ prefs: { diagramTheme: theme.id } }).prefs.diagramTheme, theme.id).toBe(theme.id)
    }
    for (const value of ['sepia', '', 7, {}, 'base', 'FOREST', 'night', 'paper', 'blueprint']) {
      expect(coerceRecordData({ prefs: { diagramTheme: value } }).prefs.diagramTheme, JSON.stringify(value)).toBeNull()
    }
  })

  it('drops the retired figurePalette, so an old record reads as the default and never breaks', () => {
    for (const old of ['night', 'paper', 'blueprint']) {
      const read = coerceRecordData({ prefs: { figurePalette: old, codePalette: 'paper' } })
      expect(read.prefs, old).not.toHaveProperty('figurePalette')
      expect(read.prefs.diagramTheme, old).toBeNull()
      // The code's palette is a separate field and is not touched by the retirement.
      expect(read.prefs.codePalette, old).toBe('paper')
    }
  })

  it('is written by the one event, and only when it changes', () => {
    const chosen = setDiagramTheme(EMPTY_RECORD, 'forest')
    expect(chosen.prefs.diagramTheme).toBe('forest')
    expect(setDiagramTheme(chosen, 'forest')).toBe(chosen)
    // It records no day: choosing a colour is not work on the curriculum.
    expect(chosen.days).toEqual([])
    expect(isDiagramThemeId('forest')).toBe(true)
    expect(isDiagramThemeId('night')).toBe(false)
  })
})

describe('the stylesheet', () => {
  /** The attribute selectors the dark tone is written with, in `bazaar.css`'s light-theme rules. */
  const darkInCss = (() => {
    const hit = /html:not\(:is\(([^)]*)\)\) :is\(\.bz-figure, \.bz-expand-view\)/.exec(css)?.[1] ?? ''
    return [...hit.matchAll(new RegExp(`\\[${DIAGRAM_THEME_ATTRIBUTE}="([a-z-]+)"\\]`, 'g'))].map(([, id]) => id).sort()
  })()

  it('gives the frame a dark ground for exactly the dark themes, and a light one for the rest', () => {
    const dark = DIAGRAM_THEMES.filter((theme) => theme.tone === 'dark').map((theme) => theme.id).sort()
    expect(dark.length).toBeGreaterThan(0)
    expect(darkInCss).toEqual(dark)
    // Both halves of the frame take the same list: its ground and its tools' ink.
    expect(css).toMatch(/html:not\(:is\([^)]*\)\) :is\(\.bz-figure, \.bz-figure-tools, \.bz-expand-view\)/)
  })

  it('marks the chosen theme in the menu for every theme, and the default where nothing is stamped', () => {
    for (const theme of DIAGRAM_THEMES) {
      expect(css, theme.id).toContain(
        `html[${DIAGRAM_THEME_ATTRIBUTE}="${theme.id}"] [data-hl-options="figures"] [data-hl-theme="${theme.id}"]`,
      )
    }
    expect(css).toContain(
      `html:not([${DIAGRAM_THEME_ATTRIBUTE}]) [data-hl-options="figures"] [data-hl-theme="${DEFAULT_DIAGRAM_THEME}"]`,
    )
  })

  it('has no rule left for the retired diagram palette, anywhere in src', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)])
    for (const file of walk(SRC)) {
      if (!/\.(css|ts|tsx)$/.test(file)) continue
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toContain('data-hl-figures')
      expect(text, file).not.toMatch(/setFigurePalette|prefs\.figurePalette|figurePalette:/)
    }
  })
})
