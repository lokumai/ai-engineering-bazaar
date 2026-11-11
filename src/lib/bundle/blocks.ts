import type { Element, ElementContent, Root, RootContent } from 'hast'
import { toString as hastToString } from 'hast-util-to-string'
import { CALLOUT_KINDS, type CalloutKind } from '@/lib/content/callout'
import { CODE_TOKEN_ROLES } from '@/lib/content/code-theme'
import { addressOf } from './address'
import { diagramId, diagramPath } from './diagrams'
import type { ImageSize } from './image-size'
import { type Block, type Cell, DIAGRAM_VARIANTS, type DiagramSource, type Inline, type LinkTarget } from './schema'

/**
 * The rendered tree as the bundle's blocks: what a native reader maps onto
 * widgets without deriving anything (spec 2.4.4).
 *
 * **Why a block AST and not the HTML or the markdown** (spec 2.4.1). The HTML
 * carries web-only structure (tool menus, `data-hl-*`, `bz-` classes), and the
 * markdown would make the reader redo the slugging, the drop rules, the marks,
 * the figure numbering, the row headers, the link localisation and the
 * tokenising, which is every transformation `render.ts` exists for. So every
 * one of them runs once, in TypeScript, and this file only reads the result.
 *
 * **An explicit inventory, and anything else throws** naming the module, the
 * language and the node. The renderer grows a structure the reader has never
 * seen far more often than the reader grows one, and a converter that skipped
 * what it did not know would ship a module with a paragraph missing and
 * nothing failing. The inventory was measured from the kitchen-sink snapshot,
 * which carries every structure the renderer makes.
 *
 * Three rules read the tree's metadata rather than its HTML attributes, because
 * the attributes carry the base path: a course link's target comes only from
 * `data.courseTarget`, an image's path only from `data.imagePath` (never
 * `properties.src`), and a figure's number and title only from
 * `data.caption`. So the bundle carries no base path and splits no string the
 * renderer joined.
 *
 * **Whitespace is collapsed the way the browser draws it.** Outside code, runs
 * of HTML whitespace become one space, and a block's inline list is trimmed at
 * its ends and around a hard break, so a soft line break reads as the space it
 * is on the web and a reader never sees the markdown's own line endings.
 */

export interface BlockContext {
  /** The module key (or the level slug) the tree belongs to, for errors. */
  module: string
  lang: string
  /** The pixel size of a site-relative image path. */
  sizeOf: (path: string) => ImageSize
}

/** `bz-tok-<role>` to whether `CODE_TOKEN_ROLES` marks the role bold. */
const TOKEN_ROLES: ReadonlyMap<string, boolean> = new Map(
  CODE_TOKEN_ROLES.map((role) => [role.token.replace('--color-slab-', 'bz-tok-'), role.bold === true]),
)

/** Elements that start a block when they sit in a list item. */
const BLOCK_TAGS = new Set(['p', 'ul', 'ol', 'blockquote', 'div', 'figure', 'hr', 'h2', 'h3', 'h4', 'table', 'pre'])

/** HTML's own whitespace; U+00A0 is not in it and survives. */
const HTML_SPACE = /[ \t\n\r\f]+/g

type Node = RootContent | ElementContent

function isElement(node: Node | undefined): node is Element {
  return node?.type === 'element'
}

function isBlankText(node: Node): boolean {
  return node.type === 'text' && node.value.replace(HTML_SPACE, '') === ''
}

/** Every class on the element; a single string holding two is split. */
function classesOf(node: Element): string[] {
  const value = node.properties?.className
  const list = Array.isArray(value) ? value.map(String) : typeof value === 'string' ? [value] : []
  return list.flatMap((entry) => entry.split(/\s+/)).filter((entry) => entry !== '')
}

function describe(node: Element): string {
  const classes = classesOf(node)
  return classes.length === 0 ? `<${node.tagName}>` : `<${node.tagName} class="${classes.join(' ')}">`
}

function property(node: Element, name: string): unknown {
  return node.properties?.[name]
}

class Converter {
  readonly diagrams: DiagramSource[] = []

  constructor(private readonly context: BlockContext) {}

  fail(why: string): never {
    throw new Error(`blocks: ${this.context.module} (${this.context.lang}): ${why}`)
  }

  /** Throws on any class that is not one of `allowed`, naming it. */
  expectClasses(node: Element, allowed: readonly string[]): void {
    for (const name of classesOf(node)) {
      if (!allowed.includes(name)) this.fail(`unknown class "${name}" on ${describe(node)}`)
    }
  }

  /** The element children, refusing any text that is not whitespace. */
  elementsOf(node: Element | Root, where: string): Element[] {
    const found: Element[] = []
    for (const child of node.children) {
      if (isElement(child)) found.push(child)
      else if (!isBlankText(child)) this.fail(`unexpected ${child.type} ${JSON.stringify(hastToString(child))} in ${where}`)
    }
    return found
  }

  /* ---- blocks ------------------------------------------------------------ */

  blocks(node: Element | Root, where: string): Block[] {
    return this.elementsOf(node, where).map((child) => this.block(child))
  }

  block(node: Element): Block {
    switch (node.tagName) {
      case 'p': {
        this.expectClasses(node, ['bz-lead'])
        const inlines = this.blockInlines(node.children)
        return classesOf(node).includes('bz-lead') ? { type: 'paragraph', inlines, lead: true } : { type: 'paragraph', inlines }
      }
      case 'h2':
      case 'h3':
        return this.section(node)
      case 'h4':
        this.expectClasses(node, [])
        return { type: 'heading', depth: 4, id: this.idOf(node), inlines: this.blockInlines(node.children) }
      case 'ul':
      case 'ol':
        return this.list(node)
      case 'blockquote':
        return this.quote(node)
      case 'div':
        this.expectClasses(node, ['bz-slab'])
        if (!classesOf(node).includes('bz-slab')) this.fail(`unlisted element ${describe(node)}`)
        return this.code(node)
      case 'figure':
        return this.figure(node)
      case 'hr':
        this.expectClasses(node, [])
        return { type: 'rule' }
      default:
        return this.fail(`unlisted element ${describe(node)}`)
    }
  }

  idOf(node: Element): string {
    const id = property(node, 'id')
    if (typeof id !== 'string' || id === '') this.fail(`${describe(node)} has no id`)
    return id
  }

  /** `h2.bz-section` and `h3.bz-subsection`: the title is the `-title` span; the anchor goes. */
  section(node: Element): Block {
    const depth = node.tagName === 'h2' ? 2 : 3
    this.expectClasses(node, [depth === 2 ? 'bz-section' : 'bz-subsection'])
    const id = this.idOf(node)

    let title: Element | undefined
    for (const child of this.elementsOf(node, describe(node))) {
      const childId = property(child, 'id')
      if (child.tagName === 'span' && typeof childId === 'string' && childId.endsWith('-title') && title === undefined) {
        this.expectClasses(child, [])
        title = child
      } else if (child.tagName === 'a' && classesOf(child).includes('bz-anchor')) {
        this.expectClasses(child, ['bz-anchor'])
      } else {
        this.fail(`unexpected ${describe(child)} in heading "${id}"`)
      }
    }
    if (title === undefined) this.fail(`heading "${id}" has no title span`)

    const mark = property(node, 'data-mark')
    const inlines = this.blockInlines(title.children)
    return typeof mark === 'string'
      ? { type: 'heading', depth, id, mark, inlines }
      : { type: 'heading', depth, id, inlines }
  }

  list(node: Element): Block {
    this.expectClasses(node, ['contains-task-list'])
    const ordered = node.tagName === 'ol'
    const items = this.elementsOf(node, describe(node)).map((item) => {
      if (item.tagName !== 'li') this.fail(`unexpected ${describe(item)} in a list`)
      return this.item(item)
    })
    const start = property(node, 'start')
    if (ordered && start !== undefined) {
      if (typeof start !== 'number') this.fail(`${describe(node)} has start=${String(start)}`)
      return { type: 'list', ordered, start, items }
    }
    return { type: 'list', ordered, items }
  }

  item(node: Element): { task?: { checked: boolean; index: number }; blocks: Block[] } {
    this.expectClasses(node, ['task-list-item'])
    let children: ElementContent[] = node.children
    let task: { checked: boolean; index: number } | undefined

    if (classesOf(node).includes('task-list-item')) {
      // A tight task item holds the box itself; a loose one holds it in its first paragraph.
      const holder = node.children.find((child) => !isBlankText(child))
      const inParagraph = isElement(holder) && holder.tagName === 'p'
      const siblings = inParagraph ? holder.children : node.children
      const box = siblings.find((child) => !isBlankText(child))
      if (!isElement(box) || box.tagName !== 'input' || property(box, 'type') !== 'checkbox') {
        this.fail('a task-list item does not open with its checkbox')
      }
      this.expectClasses(box, [])
      // The index the page stamps on the item (`data-hl-check`, from `render.ts`) and its island stores a
      // tick under, `record.sheets[slug].checklist[index]`: read, never recounted, so the reader and the
      // web key a tick the same way in every language and track (D129).
      const index = Number(property(node, 'data-hl-check'))
      if (!Number.isInteger(index) || index < 0) this.fail('a task-list item carries no checklist index')
      task = { checked: property(box, 'checked') === true, index }
      const rest = siblings.filter((child) => child !== box)
      children = inParagraph
        ? node.children.map((child) => (child === holder ? { ...holder, children: rest } : child))
        : rest
    }

    const blocks: Block[] = []
    let run: ElementContent[] = []
    const flush = () => {
      if (run.some((child) => !isBlankText(child))) blocks.push({ type: 'paragraph', inlines: this.blockInlines(run) })
      run = []
    }
    for (const child of children) {
      if (isElement(child) && BLOCK_TAGS.has(child.tagName)) {
        flush()
        blocks.push(this.block(child))
      } else {
        run.push(child)
      }
    }
    flush()

    return task === undefined ? { blocks } : { task, blocks }
  }

  quote(node: Element): Block {
    if (classesOf(node).includes('bz-callout')) return this.callout(node)
    this.expectClasses(node, ['bz-quote'])
    let label: string | undefined
    const blocks: Block[] = []
    for (const child of this.elementsOf(node, describe(node))) {
      const classes = classesOf(child)
      if (child.tagName === 'p' && classes.includes('bz-quote-label')) {
        this.expectClasses(child, ['bz-quote-label'])
        label = hastToString(child).trim()
      } else if (child.tagName === 'div' && classes.includes('bz-quote-body')) {
        this.expectClasses(child, ['bz-quote-body'])
        blocks.push(...this.blocks(child, describe(child)))
      } else {
        blocks.push(this.block(child))
      }
    }
    return label === undefined ? { type: 'quote', blocks } : { type: 'quote', label, blocks }
  }

  /**
   * D106 — a GitHub alert, drawn as a card: its kind, a title paragraph, the
   * body, and a last paragraph that is only a link, which the web draws as a
   * button. The tree already says which paragraph is which (`openCallout`).
   */
  callout(node: Element): Block {
    this.expectClasses(node, ['bz-quote', 'bz-callout'])
    const kind = property(node, 'data-hl-callout')
    if (typeof kind !== 'string' || !(CALLOUT_KINDS as readonly string[]).includes(kind)) {
      this.fail(`a call-out has data-hl-callout="${String(kind)}"`)
    }
    let title: Inline[] | null = null
    let action: { target: LinkTarget; inlines: Inline[] } | null = null
    const blocks: Block[] = []
    for (const child of this.elementsOf(node, describe(node))) {
      const classes = classesOf(child)
      if (child.tagName === 'p' && classes.includes('bz-callout-title')) {
        this.expectClasses(child, ['bz-callout-title'])
        title = this.blockInlines(child.children)
      } else if (child.tagName === 'p' && classes.includes('bz-callout-cta')) {
        this.expectClasses(child, ['bz-callout-cta'])
        const links = this.elementsOf(child, describe(child))
        if (links.length !== 1 || links[0].tagName !== 'a') this.fail('a call-out button is not one link')
        this.expectClasses(links[0], ['bz-btn'])
        action = { target: this.target(links[0]), inlines: this.blockInlines(links[0].children) }
      } else {
        blocks.push(this.block(child))
      }
    }
    return { type: 'callout', kind: kind as CalloutKind, title, blocks, action }
  }

  /* ---- code -------------------------------------------------------------- */

  code(slab: Element): Block {
    const language = property(slab, 'data-language')
    if (typeof language !== 'string' || language === '') this.fail('a code slab has no data-language')

    let code: Element | undefined
    for (const child of this.elementsOf(slab, describe(slab))) {
      if (child.tagName === 'div' && classesOf(child).includes('bz-slab-head')) {
        // Read, then drop: the language is the slab's data-language; the tools are the web's.
        this.expectClasses(child, ['bz-slab-head'])
        continue
      }
      if (child.tagName !== 'pre' || code !== undefined) this.fail(`unexpected ${describe(child)} in a code slab`)
      this.expectClasses(child, ['bz-slab-code'])
      const inner = this.elementsOf(child, describe(child))
      if (inner.length !== 1 || inner[0].tagName !== 'code') this.fail('a code slab\'s pre does not hold one code element')
      this.expectClasses(inner[0], [])
      code = inner[0]
    }
    if (code === undefined) this.fail('a code slab has no code')

    const highlighted = code.children.some((child) => isElement(child) && property(child, 'data-line') !== undefined)
    return { type: 'code', language, lines: highlighted ? this.highlightedLines(code) : this.plainLines(code) }
  }

  /** An untagged fence: no `span[data-line]`, so its text is split on `\n`. */
  plainLines(code: Element): { text: string }[][] {
    const text = code.children.map((child) => {
      if (child.type !== 'text') this.fail(`unexpected ${child.type === 'element' ? describe(child) : child.type} in an untagged fence`)
      return child.value
    }).join('')
    const lines = text.split('\n')
    // The fence's final newline ends the last line rather than opening another.
    if (text.endsWith('\n')) lines.pop()
    return lines.map((line) => (line === '' ? [] : [{ text: line }]))
  }

  highlightedLines(code: Element): { text: string; role?: string; bold?: true }[][] {
    const lines: { text: string; role?: string; bold?: true }[][] = []
    for (const child of code.children) {
      if (isElement(child) && child.tagName === 'span' && property(child, 'data-line') !== undefined) {
        this.expectClasses(child, [])
        lines.push(this.line(child))
      } else if (!(child.type === 'text' && child.value === '\n')) {
        this.fail(`unexpected ${isElement(child) ? describe(child) : child.type} between code lines`)
      }
    }
    return lines
  }

  line(line: Element): { text: string; role?: string; bold?: true }[] {
    // rehype-pretty-code writes one bare space into an empty line so it keeps
    // its height; the source line was empty.
    if (line.children.length === 1 && line.children[0].type === 'text' && line.children[0].value === ' ') return []

    return line.children.map((token) => {
      if (!isElement(token) || token.tagName !== 'span') {
        this.fail(`unexpected ${isElement(token) ? describe(token) : token.type} in a code line`)
      }
      for (const inner of token.children) {
        if (inner.type !== 'text') this.fail('a code token holds more than text')
      }
      const text = hastToString(token)
      const classes = classesOf(token)
      if (classes.length === 0) return { text }
      if (classes.length > 1 || !TOKEN_ROLES.has(classes[0])) this.fail(`unknown class "${classes.join(' ')}" on a code token`)
      const role = classes[0].slice('bz-tok-'.length)
      return TOKEN_ROLES.get(classes[0]) ? { text, role, bold: true as const } : { text, role }
    })
  }

  /* ---- figures ----------------------------------------------------------- */

  figure(node: Element): Block {
    const kind = ['bz-diagram', 'bz-image', 'bz-tablefig'].find((name) => classesOf(node).includes(name))
    this.expectClasses(node, ['bz-fig', ...(kind === undefined ? [] : [kind])])
    if (kind === undefined || !classesOf(node).includes('bz-fig')) this.fail(`unlisted element ${describe(node)}`)

    const parts = this.elementsOf(node, describe(node))
    const captions = parts.filter((part) => part.tagName === 'figcaption')
    if (captions.length !== 1) this.fail(`${describe(node)} has ${captions.length} captions`)
    const caption = this.caption(captions[0])
    const body = parts.filter((part) => part.tagName !== 'figcaption')

    if (kind === 'bz-image') return this.image(body, caption)
    if (kind === 'bz-tablefig') return this.table(body, caption)
    return this.diagram(body, caption)
  }

  caption(node: Element): { number: string; title: string | null; note: string | null } {
    this.expectClasses(node, ['bz-caption'])
    const data = node.data?.caption
    if (data === undefined) this.fail('a figure caption carries no caption data')
    let note: string | null = null
    for (const child of this.elementsOf(node, describe(node))) {
      const classes = classesOf(child)
      if (child.tagName === 'span' && classes.includes('bz-caption-label')) {
        this.expectClasses(child, ['bz-caption-label'])
      } else if (child.tagName === 'p' && classes.includes('bz-caption-note')) {
        this.expectClasses(child, ['bz-caption-note'])
        note = hastToString(child).trim()
      } else {
        this.fail(`unexpected ${describe(child)} in a figure caption`)
      }
    }
    return { number: data.number, title: data.title, note }
  }

  image(body: Element[], caption: { number: string; title: string | null; note: string | null }): Block {
    if (body.length !== 1 || body[0].tagName !== 'img') this.fail('an image figure does not hold one img')
    const img = body[0]
    this.expectClasses(img, [])
    const src = img.data?.imagePath
    if (src === undefined) this.fail('an image carries no data.imagePath; was the render given imagePath?')
    const alt = property(img, 'alt')
    const { width, height } = this.context.sizeOf(src)
    return {
      type: 'image',
      number: caption.number,
      title: caption.title,
      note: caption.note,
      src,
      alt: typeof alt === 'string' ? alt : '',
      width,
      height,
    }
  }

  diagram(body: Element[], caption: { number: string; title: string | null; note: string | null }): Block {
    let source: string | undefined
    for (const part of body) {
      const classes = classesOf(part)
      if (part.tagName === 'div' && classes.includes('bz-figure-tools')) {
        this.expectClasses(part, ['bz-figure-tools'])
        continue
      }
      if (part.tagName !== 'div' || !classes.includes('bz-figure') || !classes.includes('bz-figure-body') || source !== undefined) {
        this.fail(`unexpected ${describe(part)} in a diagram figure`)
      }
      this.expectClasses(part, ['bz-figure', 'bz-figure-body'])
      const markers = this.elementsOf(part, describe(part))
      if (markers.length !== 1 || markers[0].tagName !== 'div') this.fail('a diagram body does not hold one source marker')
      this.expectClasses(markers[0], ['mermaid-source'])
      const value = property(markers[0], 'data-mermaid')
      if (typeof value !== 'string' || value === '') this.fail('a diagram carries no data-mermaid source')
      source = value
    }
    if (source === undefined) this.fail('a diagram figure has no body')
    if (caption.note !== null) this.fail('a diagram caption carries a note')

    const svg = { light: '', dark: '' }
    for (const variant of DIAGRAM_VARIANTS) {
      const id = diagramId(source, variant)
      this.diagrams.push({ id, variant, source })
      svg[variant] = diagramPath(id)
    }
    return { type: 'diagram', number: caption.number, title: caption.title, svg }
  }

  table(body: Element[], caption: { number: string; title: string | null; note: string | null }): Block {
    if (body.length !== 1 || body[0].tagName !== 'div') this.fail('a table figure does not hold one scroller')
    this.expectClasses(body[0], ['bz-scroller'])
    const tables = this.elementsOf(body[0], describe(body[0]))
    if (tables.length !== 1 || tables[0].tagName !== 'table') this.fail('a table scroller does not hold one table')
    this.expectClasses(tables[0], [])
    if (caption.note !== null) this.fail('a table caption carries a note')

    let headRows: Element[] = []
    let bodyRows: Element[] = []
    for (const section of this.elementsOf(tables[0], '<table>')) {
      this.expectClasses(section, [])
      const rows = this.elementsOf(section, describe(section))
      for (const row of rows) {
        if (row.tagName !== 'tr') this.fail(`unexpected ${describe(row)} in a table`)
        this.expectClasses(row, [])
      }
      if (section.tagName === 'thead') headRows = rows
      else if (section.tagName === 'tbody') bodyRows = rows
      else this.fail(`unexpected ${describe(section)} in a table`)
    }
    if (headRows.length !== 1) this.fail(`a table has ${headRows.length} header rows`)

    const headCells = this.elementsOf(headRows[0], '<tr>')
    const align = headCells.map((cell) => {
      const value = property(cell, 'align')
      if (value === undefined) return null
      if (value === 'left' || value === 'center' || value === 'right') return value
      return this.fail(`a table cell has align="${String(value)}"`)
    })

    const rows = bodyRows.map((row) => this.elementsOf(row, '<tr>'))
    const leading = rows.map((cells) => cells[0]?.tagName === 'th')
    const rowHeaders = leading.length > 0 && leading.every(Boolean)
    if (!rowHeaders && leading.some(Boolean)) this.fail('a table has row headers on some rows and not others')

    return {
      type: 'table',
      number: caption.number,
      title: caption.title,
      rowHeaders,
      align,
      head: headCells.map((cell) => this.cell(cell)),
      rows: rows.map((cells) => cells.map((cell) => this.cell(cell))),
    }
  }

  cell(node: Element): Cell {
    if (node.tagName !== 'th' && node.tagName !== 'td') this.fail(`unexpected ${describe(node)} in a table row`)
    this.expectClasses(node, [])
    return { inlines: this.blockInlines(node.children) }
  }

  /* ---- inlines ----------------------------------------------------------- */

  /** A block's whole inline list: converted, then trimmed at its edges and around breaks. */
  blockInlines(children: ElementContent[]): Inline[] {
    const inlines = this.inlines(children)
    const trimmed: Inline[] = []
    inlines.forEach((inline, at) => {
      if (inline.type !== 'text') {
        trimmed.push(inline)
        return
      }
      const before = inlines[at - 1]
      const after = inlines[at + 1]
      let value = inline.text
      if (before === undefined || before.type === 'break') value = value.replace(/^ /, '')
      if (after === undefined || after.type === 'break') value = value.replace(/ $/, '')
      if (value !== '') trimmed.push({ type: 'text', text: value })
    })
    return trimmed
  }

  inlines(given: ElementContent[]): Inline[] {
    // M74 — a vendor mark is held on one line with its name's first word by a
    // `.bz-logo-pair`, which is the web's line-breaking rule and not content:
    // its children go into the running text in place, the mark first.
    const children = given.flatMap((child) => {
      if (!isElement(child) || !classesOf(child).includes('bz-logo-pair')) return [child]
      this.expectClasses(child, ['bz-logo-pair'])
      const first = child.children[0]
      if (!isElement(first) || !classesOf(first).includes('bz-logo')) this.fail('a logo pair does not open with its logo')
      return child.children
    })
    const out: Inline[] = []
    children.forEach((child, at) => {
      if (child.type === 'text') {
        let value = child.value
        // The word joiner that keeps an external link's mark on its line.
        const next = children[at + 1]
        if (isElement(next) && classesOf(next).includes('bz-ext-mark')) value = value.replace(/⁠$/, '')
        const collapsed = value.replace(HTML_SPACE, ' ')
        const last = out[out.length - 1]
        if (last?.type === 'text') last.text = (last.text + collapsed).replace(/ {2,}/g, ' ')
        else if (collapsed !== '') out.push({ type: 'text', text: collapsed })
        return
      }
      if (!isElement(child)) this.fail(`unexpected ${child.type} in running text`)
      const inline = this.inline(child)
      if (inline !== null) out.push(inline)
    })
    return out.filter((inline) => inline.type !== 'text' || inline.text !== '')
  }

  inline(node: Element): Inline | null {
    const classes = classesOf(node)
    switch (node.tagName) {
      case 'em':
        this.expectClasses(node, [])
        return { type: 'emphasis', inlines: this.inlines(node.children) }
      case 'strong':
        this.expectClasses(node, [])
        return { type: 'strong', inlines: this.inlines(node.children) }
      case 'del':
        this.expectClasses(node, [])
        return { type: 'delete', inlines: this.inlines(node.children) }
      case 'code':
        this.expectClasses(node, [])
        return { type: 'code', text: hastToString(node) }
      case 'br':
        this.expectClasses(node, [])
        return { type: 'break' }
      case 'a':
        this.expectClasses(node, [])
        return { type: 'link', target: this.target(node), inlines: this.inlines(node.children) }
      case 'img':
        return this.logo(node)
      case 'span':
        // The external-link mark and screen-reader-only words are the web's.
        if (classes.length === 1 && (classes[0] === 'bz-ext-mark' || classes[0] === 'sr-only')) return null
        this.expectClasses(node, ['bz-ext-mark', 'sr-only'])
        return this.fail(`unexpected ${describe(node)} outside a code slab`)
      default:
        return this.fail(`unlisted element ${describe(node)} in running text`)
    }
  }

  /** D105 — a vendor's mark, inline at text height (`rehypeRewriteImages`). */
  logo(node: Element): Inline {
    this.expectClasses(node, ['bz-logo'])
    if (!classesOf(node).includes('bz-logo')) this.fail(`an image in running text is not a logo: ${describe(node)}`)
    const src = node.data?.imagePath
    if (src === undefined) this.fail('a logo carries no data.imagePath; was the render given imagePath?')
    const alt = property(node, 'alt')
    // prose.css inverts exactly these on a dark ground (`.bz-logo[src$="-mono.svg"]`).
    return { type: 'logo', src, alt: typeof alt === 'string' ? alt : '', mono: src.endsWith('-mono.svg') }
  }

  /**
   * A fragment as the heading id it names. micromark percent-encodes an href
   * while github-slugger keeps a heading's Unicode, so `#çok-güzel` arrives as
   * `#%C3%A7ok-g%C3%BCzel`. A browser decodes the fragment before it looks for
   * the id, which is why the web page never showed it; the native reader
   * compares strings, and every non-ASCII target would miss with no error.
   */
  fragmentId(encoded: string): string {
    try {
      return decodeURIComponent(encoded)
    } catch {
      return this.fail(`the link fragment "#${encoded}" is not valid percent-encoding`)
    }
  }

  target(node: Element): LinkTarget {
    const course = node.data?.courseTarget
    if (course !== undefined) {
      if (course.kind === 'catalog') return { kind: 'catalog' }
      const fragment = this.fragmentId(course.fragment.replace(/^#/, ''))
      const { track, lang } = addressOf(course.route)
      return fragment === ''
        ? { kind: 'module', key: course.key, track, lang }
        : { kind: 'module', key: course.key, track, lang, fragment }
    }
    const href = property(node, 'href')
    if (typeof href !== 'string') this.fail('a link has no href')
    if (href.startsWith('#') && href.length > 1) return { kind: 'anchor', id: this.fragmentId(href.slice(1)) }
    if (/^https?:\/\//i.test(href)) return { kind: 'external', url: href }
    return this.fail(`a link to "${href}" is neither a course link, an anchor nor external`)
  }
}

export function toBlocks(tree: Root, context: BlockContext): { blocks: Block[]; diagrams: DiagramSource[] } {
  const converter = new Converter(context)
  const blocks = converter.blocks(tree, 'the document')
  return { blocks, diagrams: converter.diagrams }
}
