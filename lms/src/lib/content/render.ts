import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { SKIP, visit } from 'unist-util-visit'
import { toString as hastToString } from 'hast-util-to-string'
import type { Element, ElementContent, Root, RootContent, Text } from 'hast'
import { codeThemes } from './code-theme'
import { assertNoRawHex, remapMermaidFills } from './mermaid'

export interface TocEntry {
  id: string
  text: string
  depth: 2 | 3
  /** §5.6 — the Roman numeral split off an `## VII. …` heading, without its dot. */
  mark?: string
}

export interface RenderedMarkdown {
  html: string
  toc: TocEntry[]
}

export interface RenderOptions {
  /** Where this category's copied images live. */
  imageBase?: string
  /**
   * The sheet (module) number, so figures and tables can be numbered
   * `FIG. 13.2` / `TBL. 13.2` as §6.5 and §6.10 require. Omitted for content
   * that is not a numbered sheet, such as a category introduction, where the
   * figure number stands alone.
   */
  sheet?: number
}

/** §6.1 — the section-mark rule, exactly as the spec writes it. */
const ROMAN_H2 = /^([IVXLC]+)\.\s+/
/** §6.3 — an external link is one that leaves the site. */
const EXTERNAL_HREF = /^https?:\/\//i
/** B6.2 — the dek line, in both languages the corpus is written in. */
const DEK = /^(Category|Kategori):\s/
/** A heading that exists only to introduce the diagram under it. */
const DIAGRAM_HEADING = /^Mermaid Diagram:\s*/i
/** §6.7 — shiki writes bold as a keyword; §6.7 wants weight 500, not 700. */
const BOLD_WEIGHT = /-font-weight:\s*bold/g

function isElement(node: RootContent | ElementContent | undefined): node is Element {
  return node?.type === 'element'
}

function classNames(node: Element): string[] {
  const value = node.properties?.className
  return Array.isArray(value) ? value.map(String) : []
}

function elementChildren(node: { children: Array<RootContent | ElementContent> }): Element[] {
  return node.children.filter(isElement)
}

/** True for the whitespace-only text nodes remark-rehype leaves between blocks. */
function isBlank(node: ElementContent): boolean {
  return node.type === 'text' && node.value.trim() === ''
}

function text(value: string): Text {
  return { type: 'text', value }
}

function element(
  tagName: string,
  properties: Element['properties'],
  children: ElementContent[] = [],
): Element {
  return { type: 'element', tagName, properties, children }
}

/** `FIG. 13.2` on a numbered sheet, `FIG. 2` where there is no sheet number. */
function label(prefix: string, sheet: number | undefined, index: number): string {
  return sheet === undefined ? `${prefix} ${index}` : `${prefix} ${sheet}.${index}`
}

// ---------------------------------------------------------------------------
// B6.1 / B6.2 — the two lines the sheet header already states
// ---------------------------------------------------------------------------

/** Strip the leading h1; the module page renders the title from frontmatter. */
function rehypeDropFirstH1() {
  return (tree: Root) => {
    const index = tree.children.findIndex((c) => isElement(c) && c.tagName === 'h1')
    if (index !== -1) tree.children.splice(index, 1)
  }
}

/**
 * B6.2 — strip the italic dek, `*Category: Intermediate — Module 13 (6 of 8 in
 * this category)*`. Every fact in it is in the title block (§5.5), derived
 * rather than typed, and a page that states its position twice invites the two
 * statements to disagree.
 */
function rehypeDropDek() {
  return (tree: Root) => {
    const index = tree.children.findIndex(isElement)
    const first = tree.children[index]
    if (!isElement(first) || first.tagName !== 'p') return

    const inner = first.children.filter((c) => !isBlank(c))
    if (inner.length !== 1 || !isElement(inner[0]) || inner[0].tagName !== 'em') return
    if (!DEK.test(hastToString(inner[0]))) return

    tree.children.splice(index, 1)
  }
}

/**
 * §6.2 — the first paragraph of the body is the lead: 20px, `--color-ink-muted`.
 * It reads as the deck under the sheet title, which is the job it is doing.
 */
function rehypeLeadParagraph() {
  return (tree: Root) => {
    const first = tree.children.find(isElement)
    if (!first || first.tagName !== 'p') return
    first.properties = { ...first.properties, className: ['hl-lead'] }
  }
}

// ---------------------------------------------------------------------------
// B6.3 — Roman numerals become section marks
// ---------------------------------------------------------------------------

/**
 * B6.3 / §6.1 — split the numeral off an `## VII. Guardrails, honestly rated`
 * into `data-mark`, so the gutter can set it in mono at `x = -44px` and the
 * heading text can start flush at the measure. **MEASURED:** 96 such headings
 * exist across 15 files; they are the section numbering the drawing set needs
 * and the reason `13.5` works in the command palette.
 *
 * Runs before `rehype-slug`, so the id is derived from the text alone.
 */
function rehypeSectionMarks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'h2') return
      const first = node.children[0]
      if (first?.type !== 'text') return

      const match = ROMAN_H2.exec(first.value)
      if (!match) return

      first.value = first.value.slice(match[0].length)
      node.properties = { ...node.properties, 'data-mark': match[1] }
    })
  }
}

function rehypeCollectToc(sink: TocEntry[]) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const depth = node.tagName === 'h2' ? 2 : node.tagName === 'h3' ? 3 : null
      if (depth === null) return
      const id = node.properties?.id
      if (typeof id !== 'string') return

      const mark = node.properties?.['data-mark']
      sink.push({
        id,
        text: hastToString(node),
        depth,
        ...(typeof mark === 'string' ? { mark } : {}),
      })
    })
  }
}

/**
 * §6.1 — the `§` anchor revealed on heading hover. Keyboard-focusable and
 * visible on focus; added after the TOC is collected so the mark never leaks
 * into a section title.
 */
function rehypeHeadingAnchors() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return
      const id = node.properties?.id
      if (typeof id !== 'string') return

      node.children.push(
        element(
          'a',
          {
            className: ['hl-anchor'],
            href: `#${id}`,
            'aria-label': `Link to “${hastToString(node)}”`,
          },
          [element('span', { 'aria-hidden': 'true' }, [text('§')])],
        ),
      )
    })
  }
}

// ---------------------------------------------------------------------------
// §6.9 images
// ---------------------------------------------------------------------------

function rehypeRewriteImages(imageBase?: string) {
  return (tree: Root) => {
    if (!imageBase) return
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return
      const src = node.properties?.src
      if (typeof src !== 'string') return
      if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return
      // imageBase already points at the category's copied images directory,
      // so drop the source's own leading `images/` segment as well as any
      // relative prefix. `./images/a.png` -> `<imageBase>/a.png`.
      const relative = src.replace(/^(\.{1,2}\/)+/, '').replace(/^\//, '')
      node.properties.src = `${imageBase}/${relative.replace(/^images\//, '')}`
    })
  }
}

// ---------------------------------------------------------------------------
// B5 — figures and tables, captioned, numbered and width-classed
// ---------------------------------------------------------------------------

/**
 * §6.5 — the width class, decided by column count at build time.
 *
 * **MEASURED:** the widest table in the corpus is 6 columns (module 11) and the
 * longest is 58 pipe-rows (module 10). Six columns of prose-heavy verdict cells
 * inside a 656px measure is unreadable; six columns allowed to size themselves
 * would blow the page's horizontal scroll. So the table is classed here and
 * scrolls inside its own container in every case.
 */
export type FigureWidth = 'prose' | 'wide' | 'full'

export function widthForColumns(columns: number): FigureWidth {
  if (columns >= 6) return 'full'
  if (columns === 5) return 'wide'
  return 'prose'
}

function columnCount(table: Element): number {
  let widest = 0
  visit(table, 'element', (node: Element) => {
    if (node.tagName !== 'tr') return
    const cells = elementChildren(node).filter(
      (c) => c.tagName === 'td' || c.tagName === 'th',
    ).length
    widest = Math.max(widest, cells)
  })
  return widest
}

/** The caption strip. It **is** the `figcaption` (§10.2), never a `div`. */
function caption(number: string, title: string | null, action?: Element): Element {
  const children: ElementContent[] = [text(title ? `${number} — ${title}` : number)]
  if (action) children.push(action)
  return element('figcaption', { className: ['hl-cap'] }, children)
}

function scrollRegion(
  className: string,
  ariaLabel: string,
  children: ElementContent[],
): Element {
  // §10.3 — a horizontal scroll container is reachable and scrollable from the
  // keyboard, or it is unusable without a mouse.
  return element(
    'div',
    { className: [className], role: 'region', tabIndex: 0, 'aria-label': ariaLabel },
    children,
  )
}

/**
 * A `<p>` that exists only to carry an image: the image itself, optionally a
 * hard break and an italic caption line, and nothing else. The corpus writes
 * captions that way in module 6, so the `<em>` becomes the figure caption
 * rather than a stray line of italics under a rule.
 */
function imageParagraph(node: Element): { image: Element; caption: string | null } | null {
  if (node.tagName !== 'p') return null

  let image: Element | null = null
  let em: Element | null = null

  for (const child of node.children) {
    if (isBlank(child)) continue
    if (!isElement(child)) return null
    if (child.tagName === 'img') {
      if (image) return null
      image = child
    } else if (child.tagName === 'em') {
      if (em) return null
      em = child
    } else if (child.tagName !== 'br') {
      return null
    }
  }

  if (!image) return null
  const alt = image.properties?.alt
  const fallback = typeof alt === 'string' && alt.trim() !== '' ? alt.trim() : null
  return { image, caption: em ? hastToString(em).trim() : fallback }
}

/**
 * One walk, in document order, so figures and tables are numbered the way a
 * reader meets them. Diagrams and images share the `FIG.` sequence; tables have
 * their own `TBL.` sequence (§6.5, §6.10).
 */
function rehypeFigures(options: RenderOptions) {
  const { sheet } = options

  return (tree: Root) => {
    let figures = 0
    let tables = 0
    let section: string | null = null

    visit(tree, 'element', (node: Element, index, parent) => {
      if (!parent || index === undefined) return

      if (/^h[2-4]$/.test(node.tagName)) {
        const heading = hastToString(node).replace(DIAGRAM_HEADING, '').trim()
        section = heading === '' ? null : heading
        return
      }

      // ---- Diagrams: the marker the client island picks up (§6.10) --------
      if (node.tagName === 'pre') {
        const code = elementChildren(node).find((c) => c.tagName === 'code')
        if (!code || !classNames(code).includes('language-mermaid')) return

        figures += 1
        const name = label('FIG.', sheet, figures)
        const marker = element(
          'div',
          {
            className: ['mermaid-source'],
            'data-mermaid': remapMermaidFills(hastToString(code)),
          },
          [
            // §6.10 B5's loading state: a drawn placeholder at the reserved
            // height. No spinner, no skeleton shimmer, no mascot.
            element('p', { className: ['hl-diagram-pending'] }, [text(`Rendering ${name}`)]),
          ],
        )

        parent.children[index] = element(
          'figure',
          { className: ['hl-figure', 'hl-diagram'], 'data-hl-width': 'prose' },
          [
            scrollRegion('hl-diagram-body', name.replace('FIG.', 'Figure'), [marker]),
            caption(
              name,
              section,
              element(
                'button',
                { type: 'button', className: ['hl-cap-action'], 'data-hl-expand': '' },
                [text('Expand')],
              ),
            ),
          ],
        )
        return [SKIP, index + 1]
      }

      // ---- Images (§6.9) ---------------------------------------------------
      const image = imageParagraph(node)
      if (image) {
        figures += 1
        const name = label('FIG.', sheet, figures)
        parent.children[index] = element(
          'figure',
          { className: ['hl-figure', 'hl-image'], 'data-hl-width': 'prose' },
          [image.image, caption(name, image.caption)],
        )
        return [SKIP, index + 1]
      }

      // ---- Tables (§6.5) ---------------------------------------------------
      if (node.tagName === 'table') {
        tables += 1
        const columns = columnCount(node)
        const name = label('TBL.', sheet, tables)
        parent.children[index] = element(
          'figure',
          {
            className: ['hl-figure', 'hl-table'],
            'data-hl-width': widthForColumns(columns),
            'data-hl-columns': String(columns),
          },
          [
            caption(name, section),
            scrollRegion('table-scroll', name.replace('TBL.', 'Table'), [node]),
          ],
        )
        return [SKIP, index + 1]
      }

      return
    })
  }
}

// ---------------------------------------------------------------------------
// §6.8 blockquotes and callouts
// ---------------------------------------------------------------------------

/**
 * §6.8 — a blockquote is a pull-rule, not a left bar, and one whose first child
 * is a bold lead-in ending in `:` gets that label lifted into a mono mark above
 * the rule. **MEASURED:** 13 blockquote lines exist in the whole corpus, three
 * of them `> **Boundary, not guardrail:** …`. They stay inline; marginalia
 * hoisting into the right rail is cut (§4.6).
 */
function rehypeBlockquotes() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'blockquote') return
      node.properties = { ...node.properties, className: ['hl-quote'] }

      const paragraph = node.children.find(isElement)
      if (!paragraph || paragraph.tagName !== 'p') return

      const lead = paragraph.children.find((c) => !isBlank(c))
      if (!isElement(lead) || lead.tagName !== 'strong') return

      const raw = hastToString(lead).trim()
      if (!raw.endsWith(':')) return

      paragraph.children.splice(paragraph.children.indexOf(lead), 1)
      // The space that followed the label in `**Label:** body` is markdown
      // punctuation, not indentation.
      const rest = paragraph.children[0]
      if (rest?.type === 'text') rest.value = rest.value.replace(/^\s+/, '')

      node.properties['data-hl-labelled'] = ''
      node.children = [
        element('p', { className: ['hl-quote-label'] }, [text(raw.slice(0, -1))]),
        element('div', { className: ['hl-quote-body'] }, node.children),
      ]
    })
  }
}

// ---------------------------------------------------------------------------
// §6.3 links
// ---------------------------------------------------------------------------

/**
 * §6.3 / T3 — a link is ink text with a `--color-line-strong` underline. The
 * only thing that marks it as leaving the site is a mono `↗`. **MEASURED:**
 * module 9 carries 74 external links; 74 vermilion words in one sheet would be
 * unreadable and would end `--color-accent` meaning "signed off".
 */
function rehypeExternalLinks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return
      const href = node.properties?.href
      if (typeof href !== 'string' || !EXTERNAL_HREF.test(href)) return

      node.properties['data-hl-external'] = ''
      node.children.push(
        // A word joiner, so the mark can never be orphaned onto its own line
        // away from the link it annotates.
        text('\u2060'),
        element('span', { className: ['hl-ext-mark'], 'aria-hidden': 'true' }, [text('↗')]),
      )
    })
  }
}

// ---------------------------------------------------------------------------
// §6.7 code blocks
// ---------------------------------------------------------------------------

/**
 * §6.7 — the header strip, the language tag, the copy control, and the one
 * correction shiki cannot express: a keyword is emphasised at weight **500**,
 * not `bold`. Source Serif's neighbours are hairlines; 700 in a code block
 * spot-blots the page the way §6.2 says bold prose does.
 *
 * An untagged fence is program *output*, not source: no highlighting at all and
 * a tag that says so, because input and output must be visibly different
 * objects.
 */
function rehypeCodeBlocks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (!parent || index === undefined) return

      // Either rehype-pretty-code's own wrapper, or a bare `<pre>` — which is
      // what an untagged fence stays, because there was no language to
      // highlight it as.
      const wrapped =
        node.tagName === 'figure' &&
        node.properties?.['data-rehype-pretty-code-figure'] !== undefined
      const pre = wrapped
        ? elementChildren(node).find((c) => c.tagName === 'pre')
        : node.tagName === 'pre'
          ? node
          : undefined
      if (!pre) return

      const declared = pre.properties?.['data-language']
      const language = typeof declared === 'string' && declared !== '' ? declared : 'output'

      visit(pre, 'element', (span: Element) => {
        const style = span.properties?.style
        if (typeof style === 'string') {
          span.properties.style = style.replace(BOLD_WEIGHT, '-font-weight:500')
        }
      })

      pre.properties = {
        ...pre.properties,
        tabIndex: 0,
        role: 'region',
        'aria-label': language === 'output' ? 'Program output' : `${language} code`,
      }

      parent.children[index] = element(
        'div',
        { className: ['hl-code'], 'data-language': language },
        [
          element('div', { className: ['hl-code-head'] }, [
            element('span', { className: ['hl-code-lang'] }, [text(language)]),
            element(
              'button',
              {
                type: 'button',
                className: ['hl-code-copy'],
                'data-hl-copy': '',
                // The label changes to COPIED for 1200ms; say so out loud.
                'aria-live': 'polite',
              },
              [text('Copy')],
            ),
          ]),
          pre,
        ],
      )
      return [SKIP, index + 1]
    })
  }
}

// ---------------------------------------------------------------------------

export async function renderMarkdown(
  markdown: string,
  options: RenderOptions = {},
): Promise<RenderedMarkdown> {
  const toc: TocEntry[] = []

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeDropFirstH1)
    .use(rehypeDropDek)
    .use(rehypeLeadParagraph)
    .use(rehypeSectionMarks)
    .use(rehypeRewriteImages, options.imageBase)
    .use(rehypeFigures, options)
    .use(rehypeBlockquotes)
    .use(rehypeSlug)
    .use(rehypeCollectToc, toc)
    .use(rehypeHeadingAnchors)
    .use(rehypeExternalLinks)
    // B8 — both variants, written as CSS custom properties on every token, so
    // flipping `.dark` re-themes the block with no re-highlight (§9.2).
    .use(rehypePrettyCode, { theme: codeThemes(), keepBackground: false })
    .use(rehypeCodeBlocks)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown)

  const html = String(file)
  assertNoRawHex(html, options.sheet === undefined ? 'prose' : `sheet ${options.sheet}`)

  return { html, toc }
}
