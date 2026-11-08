import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Element, Root } from 'hast'
import { toString as hastToString } from 'hast-util-to-string'
import { visit } from 'unist-util-visit'
import { imageBaseFor, imagePathFor } from '@/lib/content/images'
import { type RenderOptions, renderMarkdown, renderTree } from '@/lib/content/render'
import { INDEX_ROUTE } from '@/lib/route-labels'
import { href } from '@/lib/url'

/**
 * The tree the renderer returns beside its HTML, and the metadata it carries
 * that the HTML does not: where a cross-reference lands, the site-relative path
 * of an image, and a caption's number and title kept apart.
 *
 * Every rule here holds for any content: the fixture is the invented kitchen
 * sink, and nothing below names a module, a count or a title.
 */

const FIXTURE = join(import.meta.dirname, '../../fixtures/kitchen-sink.md')
const markdown = () => readFileSync(FIXTURE, 'utf8')

const options = (extra: RenderOptions = {}): RenderOptions => ({
  imageBase: imageBaseFor('fundamentals'),
  imagePath: imagePathFor('fundamentals'),
  sheet: 1,
  ...extra,
})

function elements(tree: Root, tagName: string): Element[] {
  const found: Element[] = []
  visit(tree, 'element', (node: Element) => {
    if (node.tagName === tagName) found.push(node)
  })
  return found
}

function moduleTargets(tree: Root) {
  const targets = elements(tree, 'a').flatMap((a) => {
    const target = a.data?.courseTarget
    return target?.kind === 'module' ? [{ a, target }] : []
  })
  if (targets.length === 0) {
    throw new Error('The kitchen-sink fixture rendered no module cross-reference to check.')
  }
  return targets
}

describe('renderTree', () => {
  const original = process.env.NEXT_PUBLIC_SITE_BASE_PATH
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_BASE_PATH
    else process.env.NEXT_PUBLIC_SITE_BASE_PATH = original
  })

  it('returns the same HTML as renderMarkdown', async () => {
    const o = options()
    expect((await renderTree(markdown(), o)).html).toBe((await renderMarkdown(markdown(), o)).html)
  })

  it('marks every course link with its target', async () => {
    const { tree } = await renderTree(markdown(), options())
    const targets = moduleTargets(tree)
    for (const { a, target } of targets) {
      expect(a.properties.href).toBe(href(`/courses/${target.key}/`) + target.fragment)
      expect(target.route).toBe(`/courses/${target.key}/`)
    }
    expect(targets.some(({ target }) => target.fragment !== '')).toBe(true)
  })

  it('marks the catalog link', async () => {
    const { tree } = await renderTree(markdown(), options())
    const anchors = elements(tree, 'a')
    const catalog = anchors.filter((a) => a.data?.courseTarget?.kind === 'catalog')
    expect(catalog).toHaveLength(1)
    expect(catalog[0].data?.courseTarget).toEqual({ kind: 'catalog' })
    expect(catalog[0].properties.href).toBe(href(INDEX_ROUTE))

    const anchor = anchors.filter((a) => a.properties.href === '#a-numbered-section')
    if (anchor.length === 0) {
      throw new Error('The kitchen-sink fixture rendered no link to #a-numbered-section.')
    }
    for (const a of anchor) expect(a.data?.courseTarget).toBeUndefined()
  })

  it('names the address the link lands on, after localisation and without the base path', async () => {
    const localised = await renderTree(markdown(), options({ localiseRoute: (r) => `/tr${r}` }))
    for (const { a, target } of moduleTargets(localised.tree)) {
      expect(target.route).toBe(`/tr/courses/${target.key}/`)
      expect(a.properties.href).toBe(href(target.route) + target.fragment)
    }

    const identity = await renderTree(markdown(), options({ localiseRoute: (r) => r }))
    for (const { target } of moduleTargets(identity.tree)) expect(target.route).toBe(`/courses/${target.key}/`)
  })

  it('writes a site-relative image path', async () => {
    // Figures only: the fixture's vendor logos are images too, and carry the same path rule.
    const figures = (tree: Root) => elements(tree, 'img').filter((img) => !String(img.properties.className ?? '').includes('bz-logo'))
    const first = figures((await renderTree(markdown(), options())).tree)
    expect(first).toHaveLength(1)
    expect(first[0].data?.imagePath).toBe(`${imagePathFor('fundamentals')}/example.png`)

    process.env.NEXT_PUBLIC_SITE_BASE_PATH = '/ai-engineering-bazaar'
    const based = elements((await renderTree(markdown(), options())).tree, 'img')
    expect(based.length).toBeGreaterThan(1)
    for (const img of based) {
      expect(img.data?.imagePath).toMatch(/^course-images\//)
      expect(img.data?.imagePath).not.toContain('ai-engineering-bazaar')
      expect(String(img.properties.src).startsWith('/ai-engineering-bazaar/')).toBe(true)
    }
  })

  it('keeps the caption number and title apart', async () => {
    const { tree } = await renderTree(markdown(), options())
    const captions = elements(tree, 'figcaption').filter((f) =>
      (f.properties.className as string[] | undefined)?.includes('bz-caption'),
    )
    if (captions.length === 0) {
      throw new Error('The kitchen-sink fixture rendered no captioned figure or table to check.')
    }
    for (const figcaption of captions) {
      const data = figcaption.data?.caption
      if (data === undefined) throw new Error('A figcaption.bz-caption carries no caption data.')
      expect(data.number).toMatch(/^1\.\d+$/)

      const labelNode = figcaption.children.find(
        (c): c is Element =>
          c.type === 'element' &&
          ((c.properties.className as string[] | undefined) ?? []).includes('bz-caption-label'),
      )
      if (labelNode === undefined) throw new Error('A figcaption.bz-caption has no bz-caption-label.')
      const labelText = hastToString(labelNode)
      expect(
        labelText.startsWith(`FIG. ${data.number}`) || labelText.startsWith(`TBL. ${data.number}`),
        labelText,
      ).toBe(true)
      if (data.title !== null) expect(labelText.endsWith(data.title)).toBe(true)
    }
  })
})
