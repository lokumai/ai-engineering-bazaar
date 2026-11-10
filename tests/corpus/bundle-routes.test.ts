import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import * as apiIndexRoute from '@/app/(en)/api/index.json/route'
import * as indexDraftRoute from '@/app/(en)/api/v1/index.draft.json/route'
import * as levelRoute from '@/app/(en)/api/v1/levels/[file]/route'
import * as moduleRoute from '@/app/(en)/api/v1/modules/[level]/[module]/[file]/route'
import * as everyoneRoute from '@/app/(en)/api/v1/modules/[level]/[module]/everyone/[file]/route'
import * as tokensRoute from '@/app/(en)/api/v1/tokens.json/route'
import { docLanguages } from '@/lib/bundle/build'
import { VARIANT_THEMES, diagramFont, diagramRenderConfig, diagramThemes } from '@/lib/bundle/diagrams'
import { ModuleDoc } from '@/lib/bundle/schema'
import { loadAllModules } from '@/lib/content/loader'
import { mermaidConfig } from '@/lib/figure/mermaid-config'
import { DEFAULT_DIAGRAM_THEME, diagramThemeOf } from '@/lib/reading/diagram-themes'
import { DIAGRAM_FONT } from '../../scripts/lib/diagram-font.mjs'

/**
 * The route handlers that write the bundle's TypeScript half into the static
 * export (spec 2.5). They are imported as modules, the way `next build` loads
 * them, so what is checked here is the segment config and the params the
 * export will actually be asked for, not a copy of them.
 */

const ROUTES = {
  'api/index.json': apiIndexRoute,
  'api/v1/tokens.json': tokensRoute,
  'api/v1/levels/[file]': levelRoute,
  'api/v1/modules/[level]/[module]/[file]': moduleRoute,
  'api/v1/index.draft.json': indexDraftRoute,
}

function key(param: { level: string; module: string; file: string }): string {
  return `${param.level}|${param.module}|${param.file}`
}

describe('bundle routes', () => {
  it('every route is static', () => {
    for (const [name, route] of Object.entries(ROUTES)) {
      expect(route.dynamic, name).toBe('force-static')
    }
  })

  it('module params name exactly the document languages', () => {
    const modules = loadAllModules()
    if (modules.length === 0) throw new Error('bundle-routes: the loader yields no module to generate params for')

    const expected = modules.flatMap((module) => docLanguages(module).map((lang) => key({
      level: module.category.slug,
      module: module.moduleSlug,
      file: `${lang}.json`,
    })))
    const generated = moduleRoute.generateStaticParams().map(key)

    expect(new Set(generated).size).toBe(generated.length)
    expect(new Set(generated)).toEqual(new Set(expected))
    expect(moduleRoute.dynamicParams).toBe(false)
  })

  it('a module route returns a strict ModuleDoc', async () => {
    const [first] = moduleRoute.generateStaticParams()
    if (first === undefined) throw new Error('bundle-routes: the module route generates no params')

    const response = await moduleRoute.GET(new Request('http://localhost/'), { params: Promise.resolve(first) })
    expect(ModuleDoc.parse(await response.json()).key).toBe(`${first.level}/${first.module}`)
  })

  it('the For Everyone route generates a document for every written version, and builds one', async () => {
    const params = everyoneRoute.generateStaticParams()
    const expected = loadAllModules().flatMap((module) => docLanguages(module, 'everyone').map((lang) => ({
      level: module.category.slug,
      module: module.moduleSlug,
      file: `${lang}.json`,
    })))
    expect(params).toEqual(expected)
    const [first] = params
    if (first === undefined) throw new Error('bundle-routes: the For Everyone route generates no params')
    const doc = ModuleDoc.parse(await (await everyoneRoute.GET(new Request('http://localhost/'), { params: Promise.resolve(first) })).json())
    expect(doc.key).toBe(`${first.level}/${first.module}`)
    expect(doc.track).toBe('everyone')
  })

  it('a module route refuses a file it did not generate', async () => {
    const [first] = moduleRoute.generateStaticParams()
    if (first === undefined) throw new Error('bundle-routes: the module route generates no params')

    for (const file of ['xx.json', 'en', `${first.file}.json`]) {
      await expect(moduleRoute.GET(new Request('http://localhost/'), {
        params: Promise.resolve({ ...first, file }),
      })).rejects.toThrow(file)
    }
  })

  it('each variant\'s render config is mermaid\'s for its theme plus two keys', () => {
    for (const variant of ['light', 'dark'] as const) {
      const base = mermaidConfig(VARIANT_THEMES[variant])
      expect(diagramRenderConfig(variant)).toEqual({
        ...base,
        htmlLabels: false,
        themeVariables: { ...base.themeVariables, fontFamily: 'Vazirmatn' },
      })
    }
  })

  it('draws light in the web\'s default theme and dark in a dark one, each on Mermaid\'s own ground', () => {
    const themes = diagramThemes()
    expect(themes.light.theme).toBe(DEFAULT_DIAGRAM_THEME)
    for (const variant of ['light', 'dark'] as const) {
      const theme = diagramThemeOf(themes[variant].theme)
      expect(theme.id).toBe(themes[variant].theme)
      expect(theme.tone).toBe(variant)
      expect(themes[variant].background).toBe(theme.background)
    }
  })

  it('the diagram font is hashed from the installed file', () => {
    const bytes = readFileSync(path.resolve(process.cwd(), DIAGRAM_FONT.file))
    expect(diagramFont()).toEqual({
      family: 'Vazirmatn',
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
  })
})
