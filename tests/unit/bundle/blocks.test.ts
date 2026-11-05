import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Element, ElementContent, Root } from 'hast'
import { visit } from 'unist-util-visit'
import { type BlockContext, toBlocks } from '@/lib/bundle/blocks'
import { diagramId, diagramPath } from '@/lib/bundle/diagrams'
import type { Block, Inline } from '@/lib/bundle/schema'
import { CODE_TOKEN_ROLES } from '@/lib/content/code-theme'
import { imageBaseFor, imagePathFor } from '@/lib/content/images'
import { type CourseModule, loadAllModules } from '@/lib/content/loader'
import { renderTree } from '@/lib/content/render'

/**
 * The rendered tree as blocks, over synthetic markdown (spec 2.4.4, guard 1).
 *
 * Every rule here holds for any content. The one thing a course link needs
 * from the corpus, a module to resolve against and a neighbour in the same
 * directory to point at, is chosen at run time from the loader, and the test
 * throws naming the precondition when the loader has no such pair.
 */

function linkedPair(): { origin: CourseModule; target: CourseModule } {
  const modules = loadAllModules()
  for (const origin of modules) {
    const target = modules.find((one) => one !== origin && one.category.slug === origin.category.slug)
    if (target) return { origin, target }
  }
  throw new Error('blocks.test: the loader yields no two modules in one level, so no course link can be rendered.')
}

const { origin, target } = linkedPair()
const SIZE = { width: 640, height: 480 }
const BASE_PATH = '/ai-engineering-bazaar'

async function tree(markdown: string): Promise<Root> {
  const rendered = await renderTree(`# Title\n\nLead paragraph.\n\n${markdown}`, {
    imageBase: imageBaseFor(origin.category.slug),
    imagePath: imagePathFor(origin.category.slug),
    sheet: origin.frontmatter.module,
  })
  return rendered.tree
}

function context(sizeOf: BlockContext['sizeOf'] = () => SIZE): BlockContext {
  return { module: 'fixture/blocks', lang: 'en', sizeOf }
}

/** The blocks after the lead paragraph every synthetic body opens with. */
async function blocksOf(markdown: string, sizeOf?: BlockContext['sizeOf']): Promise<Block[]> {
  const { blocks } = toBlocks(await tree(markdown), context(sizeOf))
  expect(blocks[0]).toEqual({ type: 'paragraph', inlines: [{ type: 'text', text: 'Lead paragraph.' }], lead: true })
  return blocks.slice(1)
}

async function only(markdown: string): Promise<Block> {
  const blocks = await blocksOf(markdown)
  expect(blocks).toHaveLength(1)
  return blocks[0]
}

function firstElement(root: Root, test: (node: Element) => boolean): Element {
  let found: Element | undefined
  visit(root, 'element', (node: Element) => {
    if (!found && test(node)) found = node
  })
  if (!found) throw new Error('blocks.test: the rendered tree has no element the test can modify.')
  return found
}

const text = (value: string): Inline => ({ type: 'text', text: value })

describe('toBlocks', () => {
  const original = process.env.NEXT_PUBLIC_SITE_BASE_PATH
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_BASE_PATH
    else process.env.NEXT_PUBLIC_SITE_BASE_PATH = original
  })

  it('marks the lead paragraph and no other', async () => {
    expect(await only('A second paragraph.')).toEqual({ type: 'paragraph', inlines: [text('A second paragraph.')] })
  })

  it('keeps a section heading\'s mark and its title, without the anchor', async () => {
    expect(await only('## IV. A *marked* section')).toEqual({
      type: 'heading',
      depth: 2,
      id: 'a-marked-section',
      mark: 'IV',
      inlines: [text('A '), { type: 'emphasis', inlines: [text('marked')] }, text(' section')],
    })
  })

  it('converts a subsection and a level-four heading', async () => {
    expect(await blocksOf('### A subsection\n\n#### Fourth')).toEqual([
      { type: 'heading', depth: 3, id: 'a-subsection', inlines: [text('A subsection')] },
      { type: 'heading', depth: 4, id: 'fourth', inlines: [text('Fourth')] },
    ])
  })

  it('converts every inline mark, and collapses the line break\'s whitespace', async () => {
    expect(await only('A *b* **c** ~~d~~ `e  f`,\\\nnext line')).toEqual({
      type: 'paragraph',
      inlines: [
        text('A '),
        { type: 'emphasis', inlines: [text('b')] },
        text(' '),
        { type: 'strong', inlines: [text('c')] },
        text(' '),
        { type: 'delete', inlines: [text('d')] },
        text(' '),
        { type: 'code', text: 'e  f' },
        text(','),
        { type: 'break' },
        text('next line'),
      ],
    })
  })

  it('reads a soft line break as a space', async () => {
    expect(await only('one\ntwo')).toEqual({ type: 'paragraph', inlines: [text('one two')] })
  })

  it('converts an external link, stripping the word joiner and the mark', async () => {
    const block = await only('See [the paper](https://example.com/p).')
    expect(block).toEqual({
      type: 'paragraph',
      inlines: [
        text('See '),
        { type: 'link', target: { kind: 'external', url: 'https://example.com/p' }, inlines: [text('the paper')] },
        text('.'),
      ],
    })
    expect(JSON.stringify(block)).not.toContain('⁠')
    expect(JSON.stringify(block)).not.toContain('↗')
  })

  it('converts a module link with a fragment, without the #, and one without, with no fragment key', async () => {
    const block = await only(`[with](${target.name}.md#a-part) and [without](${target.name}.md)`)
    expect(block).toEqual({
      type: 'paragraph',
      inlines: [
        { type: 'link', target: { kind: 'module', key: target.slug, lang: 'en', fragment: 'a-part' }, inlines: [text('with')] },
        text(' and '),
        { type: 'link', target: { kind: 'module', key: target.slug, lang: 'en' }, inlines: [text('without')] },
      ],
    })
  })

  it('converts an anchor link and the catalog link', async () => {
    expect(await only('[top](#top) and [all](../index.md)')).toEqual({
      type: 'paragraph',
      inlines: [
        { type: 'link', target: { kind: 'anchor', id: 'top' }, inlines: [text('top')] },
        text(' and '),
        { type: 'link', target: { kind: 'catalog' }, inlines: [text('all')] },
      ],
    })
  })

  // micromark percent-encodes a link's href while a heading's id keeps its
  // Unicode, so a target read off the href would never equal the id it names.
  it('gives a non-ASCII anchor and fragment the heading\'s own id, not the percent-encoded href', async () => {
    const blocks = await blocksOf(`## Çok güzel\n\n[here](#çok-güzel) and [there](${target.name}.md#çok-güzel)\n\n## بخش\n\n[x](#بخش)`)
    const ids = blocks.flatMap((block) => (block.type === 'heading' ? [block.id] : []))
    const targets = blocks.flatMap((block) => (block.type === 'paragraph' ? block.inlines : []))
      .flatMap((inline) => (inline.type === 'link' ? [inline.target] : []))
    expect(targets).toEqual([
      { kind: 'anchor', id: ids[0] },
      { kind: 'module', key: target.slug, lang: 'en', fragment: ids[0] },
      { kind: 'anchor', id: ids[1] },
    ])
    expect(ids[0]).toContain('ç')
  })

  it('wraps a tight item\'s inlines into one paragraph', async () => {
    expect(await only('- one\n- two *x*')).toEqual({
      type: 'list',
      ordered: false,
      items: [
        { blocks: [{ type: 'paragraph', inlines: [text('one')] }] },
        { blocks: [{ type: 'paragraph', inlines: [text('two '), { type: 'emphasis', inlines: [text('x')] }] }] },
      ],
    })
  })

  it('keeps a loose item\'s paragraphs, and a nested list after a tight item\'s text', async () => {
    expect(await only('1. one\n\n2. two')).toEqual({
      type: 'list',
      ordered: true,
      items: [
        { blocks: [{ type: 'paragraph', inlines: [text('one')] }] },
        { blocks: [{ type: 'paragraph', inlines: [text('two')] }] },
      ],
    })
    expect(await only('- outer\n  - inner')).toEqual({
      type: 'list',
      ordered: false,
      items: [{
        blocks: [
          { type: 'paragraph', inlines: [text('outer')] },
          { type: 'list', ordered: false, items: [{ blocks: [{ type: 'paragraph', inlines: [text('inner')] }] }] },
        ],
      }],
    })
  })

  it('keeps where an ordered list starts', async () => {
    const block = await only('3. three\n4. four')
    expect(block).toMatchObject({ type: 'list', ordered: true, start: 3 })
  })

  it('converts a task list, tight and loose', async () => {
    const expected = {
      type: 'list',
      ordered: false,
      items: [
        { task: { checked: false }, blocks: [{ type: 'paragraph', inlines: [text('open')] }] },
        { task: { checked: true }, blocks: [{ type: 'paragraph', inlines: [text('done')] }] },
      ],
    }
    expect(await only('- [ ] open\n- [x] done')).toEqual(expected)
    expect(await only('- [ ] open\n\n- [x] done')).toEqual(expected)
  })

  it('converts a labelled quote and a plain one', async () => {
    expect(await blocksOf('> **Boundary:** the body.\n\n> Plain.')).toEqual([
      { type: 'quote', label: 'Boundary', blocks: [{ type: 'paragraph', inlines: [text('the body.')] }] },
      { type: 'quote', blocks: [{ type: 'paragraph', inlines: [text('Plain.')] }] },
    ])
  })

  it('converts a highlighted fence into lines of tokens, a class-less span becoming a token with no role', async () => {
    const source = 'def add(a, b):\n    return a + b'
    const block = await only('```python\n' + source + '\n```')
    if (block.type !== 'code') throw new Error(`expected a code block, got ${block.type}`)
    expect(block.language).toBe('python')
    expect(block.lines.map((line) => line.map((token) => token.text).join(''))).toEqual(source.split('\n'))

    const tokens = block.lines.flat()
    expect(tokens.some((token) => token.role === undefined)).toBe(true)
    expect(tokens.some((token) => token.role !== undefined)).toBe(true)
    for (const token of tokens) {
      if (token.role === undefined) {
        expect(token).not.toHaveProperty('bold')
        continue
      }
      const entry = CODE_TOKEN_ROLES.find((role) => role.token === `--color-slab-${token.role}`)
      expect(entry, token.role).toBeDefined()
      if (entry?.bold) expect(token.bold).toBe(true)
      else expect(token).not.toHaveProperty('bold')
    }
  })

  it('keeps empty and whitespace-only code lines', async () => {
    const tagged = await only('```python\nx = 1\n\n    \ny = 2\n```')
    if (tagged.type !== 'code') throw new Error(`expected a code block, got ${tagged.type}`)
    expect(tagged.lines.map((line) => line.map((token) => token.text).join(''))).toEqual(['x = 1', '', '    ', 'y = 2'])
    expect(tagged.lines[1]).toEqual([])

    expect(await only('```\na\n\n  \nb\n```')).toEqual({
      type: 'code',
      language: 'output',
      lines: [[{ text: 'a' }], [], [{ text: '  ' }], [{ text: 'b' }]],
    })
  })

  it('converts a table with its caption, row headers and alignment', async () => {
    const blocks = await blocksOf('## Costs\n\n| Layer | What | Cost |\n| :--- | :---: | ---: |\n| One | **first** | Low |')
    expect(blocks[1]).toEqual({
      type: 'table',
      number: `${origin.frontmatter.module}.1`,
      title: 'Costs',
      rowHeaders: true,
      align: ['left', 'center', 'right'],
      head: [{ inlines: [text('Layer')] }, { inlines: [text('What')] }, { inlines: [text('Cost')] }],
      rows: [[{ inlines: [text('One')] }, { inlines: [{ type: 'strong', inlines: [text('first')] }] }, { inlines: [text('Low')] }]],
    })
  })

  it('gives a two-column table no row headers and no alignment', async () => {
    const block = await only('| A | B |\n| --- | --- |\n| 1 | 2 |')
    expect(block).toMatchObject({ type: 'table', title: null, rowHeaders: false, align: [null, null] })
  })

  it('reads an image\'s path and size from data.imagePath', async () => {
    const sizeOf = vi.fn(() => SIZE)
    const blocks = await blocksOf('![A figure](./images/example.png)  \n*The note.*', sizeOf)
    const path = `${imagePathFor(origin.category.slug)}/example.png`
    expect(blocks).toEqual([{
      type: 'image',
      number: `${origin.frontmatter.module}.1`,
      title: 'A figure',
      note: 'The note.',
      src: path,
      alt: 'A figure',
      width: SIZE.width,
      height: SIZE.height,
    }])
    expect(sizeOf).toHaveBeenCalledWith(path)
  })

  it('names both variants of a diagram and records its remapped source', async () => {
    const root = await tree('## Flow\n\n```mermaid\ngraph TD\n  A --> B\n```')
    const source = firstElement(root, (node) => node.properties?.className?.toString() === 'mermaid-source')
      .properties['data-mermaid']
    if (typeof source !== 'string') throw new Error('blocks.test: the diagram marker carries no source.')

    const { blocks, diagrams } = toBlocks(root, context())
    expect(blocks[2]).toEqual({
      type: 'diagram',
      number: `${origin.frontmatter.module}.1`,
      title: 'Flow',
      svg: { light: diagramPath(diagramId(source, 'light')), dark: diagramPath(diagramId(source, 'dark')) },
    })
    expect(diagrams).toEqual([
      { id: diagramId(source, 'light'), variant: 'light', source },
      { id: diagramId(source, 'dark'), variant: 'dark', source },
    ])
  })

  it('converts a rule', async () => {
    expect(await only('---')).toEqual({ type: 'rule' })
  })

  it('throws on an unknown class, naming it, the module and the language', async () => {
    const root = await tree('A paragraph.')
    const paragraph = firstElement(root, (node) => node.tagName === 'p' && node.properties?.className === undefined)
    paragraph.properties.className = ['bz-fake']
    expect(() => toBlocks(root, context())).toThrow(/bz-fake/)
    expect(() => toBlocks(root, context())).toThrow(/fixture\/blocks.*en|en.*fixture\/blocks/)
  })

  it('throws on a tag it does not list, naming it', async () => {
    const root = await tree('A paragraph.')
    root.children.push({ type: 'element', tagName: 'video', properties: {}, children: [] })
    expect(() => toBlocks(root, context())).toThrow(/video/)
  })

  it('throws on a class-less span outside a code slab', async () => {
    const root = await tree('A paragraph.')
    const paragraph = firstElement(root, (node) => node.tagName === 'p' && node.properties?.className === undefined)
    const span: ElementContent = { type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: 'x' }] }
    paragraph.children.push(span)
    expect(() => toBlocks(root, context())).toThrow(/span/)
  })

  it('carries no base path into any string, with one set', async () => {
    process.env.NEXT_PUBLIC_SITE_BASE_PATH = BASE_PATH
    const sizeOf = vi.fn(() => SIZE)
    const root = await tree(`[link](${target.name}.md#x) and [all](../index.md)\n\n![A figure](./images/example.png)`)
    // The precondition: the HTML side of the same tree does carry it.
    expect(firstElement(root, (node) => node.tagName === 'img').properties.src).toContain(BASE_PATH)

    const result = toBlocks(root, context(sizeOf))
    expect(JSON.stringify(result)).not.toContain(BASE_PATH)
    expect(sizeOf).toHaveBeenCalledWith(`${imagePathFor(origin.category.slug)}/example.png`)
  })
})
