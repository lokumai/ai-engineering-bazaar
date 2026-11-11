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
import { href } from '@/lib/url'
import { widthForColumns } from '@/lib/figure/width'
import type { ChecklistItem } from './checklist'
import { CALLOUT_MARKER, calloutKindOf } from './callout'
import { DIAGRAM_HEADING, SERIES_HEADINGS } from './lines'
import { courseRouteFor, isCourseLink, sheetSource } from './links'
import { isSafeHref } from './safe-href'
import { assertNoRawHex, remapMermaidFills } from './mermaid'
import { CODE_TOKEN_ROLES, codeThemes, readDesignToken, toHex } from './code-theme'
import { copyControl, diagramThemeMenu, icon, paletteMenu } from './tools'

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
  /**
   * §12.7 — the sheet's `- [ ]` items, in document order, keyed by their index
   * within the sheet. Empty on the 31 sheets that have none.
   *
   * This is the authoritative hook §12.7 names: GFM only makes a task item when
   * `[ ]` opens the list item's first paragraph, and the hast tree is where that
   * decision has already been made. `checklistOf` reads the same fact off the
   * raw lines because it has to answer for every sheet synchronously, inside
   * `curriculumFacts()`; §12.7 requires the two to be cross-tested against each
   * other, and `tests/unit/content/render-record.test.ts` does that per sheet.
   */
  checklist: ChecklistItem[]
}

/**
 * Where a course link lands, written on its `a` node's `data` for a consumer of
 * the tree rather than of the HTML (the content bundle). `key` is the module's
 * slug, the record key; `fragment` is what followed the target in the source
 * href, `#` included, or `''`; `route` is the address the link lands on,
 * after the caller's `localiseRoute` and before the base path, so its language
 * and track prefixes say which page it is.
 */
export type CourseTarget =
  | { kind: 'module'; key: string; fragment: string; route: string }
  | { kind: 'catalog' }

/**
 * A caption's figure or table number (`1.2`, or `2` with no sheet) and its
 * title, kept apart. The HTML joins them into one label; the tree does not, so
 * a consumer never has to split a string the renderer joined.
 */
export interface CaptionData {
  number: string
  title: string | null
}

/**
 * Hast `data` is never stringified, so what is written here reaches a reader
 * of the tree and leaves the HTML byte-identical.
 */
declare module 'hast' {
  interface ElementData {
    courseTarget?: CourseTarget
    /** Site-relative, no leading slash, no base path: `course-images/<level>/<file>`. */
    imagePath?: string
    caption?: CaptionData
  }
}

export interface RenderedTree extends RenderedMarkdown {
  tree: Root
}

export interface RenderOptions {
  /** Where this category's copied images live. */
  imageBase?: string
  /**
   * The same directory relative to the site, `imagePathFor(category)`. When it
   * is given, every rewritten `img` also carries `data.imagePath`.
   */
  imagePath?: string
  /**
   * The sheet (module) number, so figures and tables can be numbered
   * `FIG. 13.2` / `TBL. 13.2` as §6.5 and §6.10 require. Omitted for content
   * that is not a numbered sheet, such as a category introduction, where the
   * figure number stands alone.
   */
  sheet?: number
  /**
   * The sheet a *section lifted out of* a sheet came from, for a render that is
   * not the numbered sheet itself — the module page's second render of
   * `## Summary` into the Quick Check panel.
   *
   * It is the same fact `sheet` carries and it is a second option only because
   * `sheet` does two jobs: it names the origin an internal link resolves
   * against *and* it switches figure numbering to `FIG. 13.2` / `TBL. 13.2`. An
   * excerpt needs the first and must not have the second — a summary that grew
   * a table would otherwise be numbered into the body's sequence and collide
   * with a table the reader has already met. **MEASURED:** rendering the
   * summary with neither option shipped four unrewritten `.md` hrefs, on
   * `intermediate/coding-agents` and `personal-agents`.
   */
  excerptOf?: number
  /**
   * M19 — **where a cross-reference LANDS, when the reader is in Turkish.**
   *
   * `rehypeCourseLinks` turns `llms_tr.md` into a route, and it turned it into
   * the ENGLISH route — MEASURED on the built Turkish tree before this existed:
   * all 8 cross-references out of one page, and 121 across the corpus, dropped
   * the reader back into English. Nothing failed and nothing could: every one
   * of them resolved. The Turkish tree was nineteen one-way doors.
   *
   * It is a function the CALLER supplies rather than a language flag, because
   * answering it needs to know which modules have a translation — and that is
   * the loader's knowledge. `render.ts` must not import the loader: the module
   * page already does, and the other direction is a cycle. So this file applies
   * a mapping it is handed and has no opinion about the second language at all.
   *
   * Given the bare resolved route (`/courses/<level>/<module>/`, no base path
   * and no fragment, both of which are applied after it), return the one to
   * use. The default is identity.
   */
  localiseRoute?: (route: string) => string
}

/** §6.1 — the section-mark rule, exactly as the spec writes it. */
const ROMAN_H2 = /^([IVXLC]+)\.\s+/
/** §6.3 — an external link is one that leaves the site. */
const EXTERNAL_HREF = /^https?:\/\//i
/** B6.2 — the dek line, in both languages the corpus is written in. */
const DEK = /^(Category|Kategori):\s/
/**
 * Each code role's colour in the theme shiki is handed, mapped to the class
 * that names the role (`--color-slab-keyword` → `bz-tok-keyword`). Derived the
 * way `code-theme.ts` derives the theme — the token, read out of the language
 * — and NOT read back off the theme object: shiki normalises that object in
 * place and adds a scopeless rule to it, MEASURED as a 500 on every module
 * page the first time this map was built from it.
 */
const TOKEN_CLASS_OF_COLOUR: ReadonlyMap<string, string> = new Map(
  CODE_TOKEN_ROLES.map((role) => [
    toHex(readDesignToken(role.token).light).toLowerCase(),
    role.token.replace('--color-slab-', 'bz-tok-'),
  ]),
)

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

/** `13.2` on a numbered sheet, `2` where there is no sheet number. */
function figureNumber(sheet: number | undefined, index: number): string {
  return sheet === undefined ? `${index}` : `${sheet}.${index}`
}

/** `FIG. 13.2` on a numbered sheet, `FIG. 2` where there is no sheet number. */
function label(prefix: string, number: string): string {
  return `${prefix} ${number}`
}

// ---------------------------------------------------------------------------
// B6.1 / B6.2 — the two lines the sheet header already states
// ---------------------------------------------------------------------------

/**
 * Every link on the page carries an address from the allowlist in `safe-href.ts`, or none.
 * An `<a>` outside it keeps its text and loses its `href`, so it is inert and says nothing
 * about where it would have gone. First in the pipeline once the tree exists, so no later
 * plugin (the course-link resolver, the external mark, the call-out button) ever sees an
 * address that was not allowed.
 */
function rehypeSafeLinks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return
      const value = node.properties?.href
      if (typeof value === 'string' && !isSafeHref(value)) delete node.properties.href
    })
  }
}

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
 * §12.6 trap 1 — the self-check paragraph, lifted out of the tree.
 *
 * The question is a bold *inline* run opening a paragraph — `**Quick Check**:
 * <question>` — not a heading, so `sectionTitles`, `topicsFor` and the TOC are
 * all blind to it. It is already rendered inside `<Prose>`, so mounting §12.6's
 * component without removing it here prints the question **twice on all 15
 * drawn sheets**. Same removal, same reason and same shape as `rehypeDropDek`:
 * one statement of a fact, in the place that owns it.
 *
 * Two labels, not one (§12.6, corrected by implementation): thirteen sheets say
 * `**Quick Check**` and sheet 1 says `**Quiz Yourself**` — the same shape, in
 * the same position, doing the same job, under a name the author happened to
 * type differently that day. `quickcheck.ts` accepts both, so this must too, or
 * sheet 1 would print its question twice while its fourteen siblings printed
 * theirs once.
 *
 * **Pipeline position, and which side of what.** It sits AFTER
 * `rehypeDropFirstH1` and `rehypeDropDek` — all three are the same kind of
 * removal, and those two operate on the head of the document where this
 * paragraph never is. It sits BEFORE `rehypeLeadParagraph`, `rehypeFigures` and
 * `rehypeSlug`/`rehypeCollectToc`, and the first two are load-bearing: the lead
 * class would otherwise be spent on a paragraph that is about to be deleted, and
 * a figure inside the removed paragraph would consume a `FIG. n.n` number and
 * leave a gap in the sequence. Nothing downstream needs to see it.
 *
 * Only the FIRST match is removed, which mirrors `quickCheckOf`: no sheet
 * carries two, and a sheet that grew a second would be an authoring error
 * rather than two questions to ask.
 */
const SELF_CHECK_LABELS: readonly string[] = ['Quick Check', 'Quiz Yourself']

/** A `<p>` whose first run is the self-check label, followed by its colon. */
function opensSelfCheck(node: Element): boolean {
  if (node.tagName !== 'p') return false
  const inner = node.children.filter((child) => !isBlank(child))
  const lead = inner[0]
  if (!isElement(lead) || lead.tagName !== 'strong') return false
  if (!SELF_CHECK_LABELS.includes(hastToString(lead).trim())) return false
  // The colon is part of the authored form, and requiring it is what keeps this
  // in step with `quickCheckOf`'s own pattern rather than beside it.
  const rest = inner[1]
  return rest?.type === 'text' && /^[ \t]*:/.test(rest.value)
}

function rehypeDropSelfCheck() {
  return (tree: Root) => {
    const index = tree.children.findIndex(
      (child) => isElement(child) && opensSelfCheck(child),
    )
    if (index !== -1) tree.children.splice(index, 1)
  }
}

/**
 * The series map, lifted out of the page and left in the file
 * (`SERIES_HEADINGS` carries the author's reason and both languages).
 *
 * The section is the h2 and everything after it up to the next heading of the
 * same rank or higher — which is the next section, in every module that has
 * one, and the end of the document in a module that ends with it.
 *
 * **Pipeline position**, the same as `rehypeDropSelfCheck`'s and for the same
 * reasons: before `rehypeFigures`, or the chart inside the section consumes a
 * `FIG. n.n` number and leaves a gap in the sequence; before `rehypeSlug` and
 * `rehypeCollectToc`, or the page's own index lists a section the page does
 * not show.
 */
function rehypeDropSeriesSection() {
  return (tree: Root) => {
    const start = tree.children.findIndex(
      (child) => isElement(child)
        && child.tagName === 'h2'
        && SERIES_HEADINGS.includes(hastToString(child).trim()),
    )
    if (start === -1) return

    let end = start + 1
    while (end < tree.children.length) {
      const next = tree.children[end]
      if (isElement(next) && (next.tagName === 'h1' || next.tagName === 'h2')) break
      end += 1
    }
    tree.children.splice(start, end - start)
  }
}

/**
 * §6.2 — the first paragraph of the body is the lead: 20px, `--color-on-surface-muted`.
 * It reads as the deck under the sheet title, which is the job it is doing.
 */
function rehypeLeadParagraph() {
  return (tree: Root) => {
    const first = tree.children.find(isElement)
    if (!first || first.tagName !== 'p') return
    first.properties = { ...first.properties, className: ['bz-lead'] }
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

/** Every `id` already in the tree, so a generated one can never collide. */
function takenIds(tree: Root): Set<string> {
  const ids = new Set<string>()
  visit(tree, 'element', (node: Element) => {
    const id = node.properties?.id
    if (typeof id === 'string') ids.add(id)
  })
  return ids
}

function claimId(base: string, taken: Set<string>): string {
  let id = base
  for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`
  taken.add(id)
  return id
}

/**
 * §6.1 — the `§` anchor revealed on heading hover. Keyboard-focusable and
 * visible on focus; added after the TOC is collected so the mark never leaks
 * into a section title.
 *
 * The anchor is a *child* of the heading, which is what puts it at `x = -20px`
 * in the heading's own positioning context and what makes `h2:hover` reveal
 * it. That nesting has one cost the spec does not mention: a heading is named
 * from its contents, so the anchor's `aria-label` concatenates onto the
 * heading's accessible name and every h2 and h3 announces as
 * "Why We Need RAG Link to “Why We Need RAG”". Heading navigation is how a
 * screen-reader user skims an 18,400px sheet, and ~20 headings a sheet across
 * the drawn sheets are ~300 doubled names.
 *
 * So the heading names itself from a span around its own title and the anchor
 * keeps its own label. `aria-hidden` on the anchor would be the shorter fix
 * and is refused: §6.1 requires it to be keyboard-focusable and visible on
 * focus, and §10.3 requires every interactive element to be reachable by Tab.
 */
function rehypeHeadingAnchors() {
  return (tree: Root) => {
    const taken = takenIds(tree)

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return
      const id = node.properties?.id
      if (typeof id !== 'string') return

      const titleId = claimId(`${id}-title`, taken)
      node.children = [element('span', { id: titleId }, node.children)]
      node.properties['aria-labelledby'] = titleId
      /*
        The language's own name for what this heading is, so the dashed ochre
        rule and the type step are stated in ONE place (D38). `01` styles `h2`
        and `h3` as bare element selectors and `bazaar.css` transcribes them as
        `.bz-section` and `.bz-subsection`; a second copy of those declarations
        under `.bz-prose h2` would be the same rule with two authors.
      */
      node.properties.className = [node.tagName === 'h2' ? 'bz-section' : 'bz-subsection']

      node.children.push(
        element(
          'a',
          {
            className: ['bz-anchor'],
            href: `#${id}`,
            'aria-label': `Link to “${hastToString(node)}”`,
          },
          [element('span', { 'aria-hidden': 'true' }, [text('§')])],
        ),
      )
    })
  }
}

/**
 * D135 — the References' Modules subsection is headed by the LokumAI mark on the
 * site, where the corpus writes a 🧭. The compass is the markdown's own word for
 * "the course's own modules" and stays in the heading text, which the bundle
 * ships and `tests/corpus/references.test.ts` pins; the app draws its own mark.
 * So the swap happens on the HTML only, on a clone, and `tree` (what the bundle
 * is built from) keeps the 🧭 byte for byte. Rejected: editing the markdown
 * (changes the bundle's content, and markdown cannot carry an inline logo the app
 * could draw differently).
 *
 * Matched by structure and by the glyph, not by a language's word: the h3 after
 * the last h2 (the References section, `## Kaynaklar`, `## منابع`) whose title
 * starts with 🧭. Its id and accessible name are untouched (`aria-labelledby`
 * points at the title span, which loses only the emoji; the id was slugged from
 * the original text earlier in the pipeline).
 */
const COMPASS = /^🧭\s*/

function swapModulesMark(tree: Root): Root {
  const copy = structuredClone(tree)
  const top = copy.children.filter((n): n is Element => isElement(n))
  let last = -1
  top.forEach((n, i) => { if (n.tagName === 'h2') last = i })
  if (last === -1) return copy
  for (const node of top.slice(last + 1)) {
    if (node.tagName !== 'h3') continue
    const title = node.children.find((c): c is Element => isElement(c) && c.tagName === 'span')
    const first = title?.children[0]
    if (!title || first?.type !== 'text' || !COMPASS.test(first.value)) continue
    first.value = first.value.replace(COMPASS, '')
    // The anchor's label quotes the title; it loses the compass too, so no
    // part of the heading speaks of one.
    for (const child of node.children) {
      const label = isElement(child) ? child.properties?.['aria-label'] : undefined
      if (isElement(child) && typeof label === 'string') {
        child.properties['aria-label'] = label.replace('“🧭 ', '“')
      }
    }
    title.children.unshift(
      element('img', {
        className: ['bz-heading-mark'],
        src: href('/lokum-logo.svg'),
        alt: '',
        'aria-hidden': 'true',
        width: 32,
        height: 32,
        decoding: 'async',
      }, []),
      text(' '),
    )
  }
  return copy
}

// ---------------------------------------------------------------------------
// §6.9 images
// ---------------------------------------------------------------------------

function rehypeRewriteImages(imageBase?: string, imagePath?: string) {
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
      const served = relative.replace(/^images\//, '')
      node.properties.src = `${imageBase}/${served}`
      if (imagePath) node.data = { ...node.data, imagePath: `${imagePath}/${served}` }
      // A vendor's mark (M68) is drawn inline at text height, not as a picture.
      if (served.startsWith('logos/')) node.properties.className = ['bz-logo']
    })
  }
}

/**
 * M74 — a vendor's mark stays on the same line as its name. Without this a line
 * could break between the two, leaving the mark at the end of one line and the
 * name at the start of the next. The mark and what follows it (the bold or
 * linked name, or the first word of plain text) go into one `.bz-logo-pair`,
 * which does not wrap; the rest of the sentence wraps as before.
 */
function rehypeKeepLogoWithName() {
  const isLogo = (node: ElementContent | undefined): node is Element =>
    isElement(node) && node.tagName === 'img'
    && Array.isArray(node.properties?.className) && node.properties.className.includes('bz-logo')
  /** The first text node under `node`, with its parent, depth first. */
  const firstText = (node: Element): { parent: Element; index: number } | null => {
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i]
      if (child.type === 'text' && /\S/.test(child.value)) return { parent: node, index: i }
      if (isElement(child)) {
        const found = firstText(child)
        if (found) return found
      }
    }
    return null
  }
  /* Only the mark and the first word are held together: a whole long name held on one line
     pushed a 390px page sideways. The rest of the name wraps as usual. */
  const bind = (logo: Element, host: Element, index: number) => {
    const text = host.children[index] as Text
    const word = /^(\s*)(\S+)/.exec(text.value)
    if (!word) return false
    const pair: Element = {
      type: 'element',
      tagName: 'span',
      properties: { className: ['bz-logo-pair'] },
      children: [logo, { type: 'text', value: word[2] }],
    }
    const tail = text.value.slice(word[0].length)
    const parts: ElementContent[] = []
    if (word[1]) parts.push({ type: 'text', value: word[1] })
    parts.push(pair)
    if (tail) parts.push({ type: 'text', value: tail })
    host.children.splice(index, 1, ...parts)
    return true
  }
  return (tree: Root) => {
    const work: Array<{ parent: Element; logo: Element }> = []
    visit(tree, 'element', (parent: Element) => {
      for (const child of parent.children) if (isLogo(child)) work.push({ parent, logo: child })
    })
    for (const { parent, logo } of work) {
      const at = parent.children.indexOf(logo)
      const next = parent.children[at + 1]
      if (next === undefined) continue
      if (next.type === 'text') {
        parent.children.splice(at, 1)
        bind(logo, parent, at)
      } else if (isElement(next)) {
        const target = firstText(next)
        if (target === null) continue
        parent.children.splice(at, 1)
        bind(logo, target.parent, target.index)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// B5 — figures and tables, captioned, numbered and width-classed
// ---------------------------------------------------------------------------

/**
 * §6.5 / B5 — the width class, decided by column count at build time. The rule
 * itself lives in `@/lib/figure/width`, where the diagram island reads the
 * other half of it: the two share the same three layout tracks and must not
 * drift apart.
 */

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

/**
 * A markdown pipe table has exactly one header row and no row headers, so a
 * cell in TBL. 13.4's VERDICT column announces its column and nothing that
 * identifies its row. Below three columns the promotion is refused: the corpus
 * has 2-column tables whose first cell is a 180-character article excerpt
 * (module 2), and a row header is repeated before every cell in the row.
 * **MEASURED:** at ≥3 columns all 252 pipe tables in the corpus are
 * row-label-first, including the transposed ones whose first header cell is
 * empty — there the first column is the attribute name, which is still the
 * row's header.
 *
 * §6.5's "First column | weight 500" survives the promotion: `prose.css`
 * already writes that rule as `.prose tbody :is(td, th):first-child`.
 */
const ROW_HEADER_MIN_COLUMNS = 3

function rowsOf(table: Element, section: 'thead' | 'tbody'): Element[] {
  const rows: Element[] = []
  visit(table, 'element', (node: Element) => {
    if (node.tagName !== section) return
    for (const row of elementChildren(node)) {
      if (row.tagName === 'tr') rows.push(row)
    }
  })
  return rows
}

function applyTableHeaders(table: Element, columns: number): void {
  for (const row of rowsOf(table, 'thead')) {
    for (const cell of elementChildren(row)) {
      if (cell.tagName === 'th') cell.properties = { ...cell.properties, scope: 'col' }
    }
  }

  if (columns < ROW_HEADER_MIN_COLUMNS) return

  for (const row of rowsOf(table, 'tbody')) {
    const first = elementChildren(row)[0]
    if (first?.tagName !== 'td') continue
    first.tagName = 'th'
    first.properties = { ...first.properties, scope: 'row' }
  }
}

/**
 * The caption strip. It **is** the `figcaption` (§10.2), never a `div`.
 *
 * §6.5 and §6.10 B5 both fix the strip at 28px carrying a short label, so the
 * label is the only thing in it. `note` is the other half of an image caption:
 * **MEASURED**, the corpus writes an `<em>` sentence under an image (3_rag.md,
 * 5_memory.md) running to 335 characters, and set as an 11px tracked uppercase
 * mono label it broke the 28px strip on 15 of 37 captions at 390px and reached
 * 129px on one. A sentence is not a label; it goes on its own line below the
 * strip, in the meta voice, and the strip stays 28px by construction.
 */
function caption(
  prefix: string,
  number: string,
  title: string | null,
  extra: { action?: Element; note?: string | null } = {},
): Element {
  const name = label(prefix, number)
  const children: ElementContent[] = [
    element('span', { className: ['bz-caption-label'] }, [
      text(title ? `${name} — ${title}` : name),
    ]),
  ]
  if (extra.action) children.push(extra.action)
  if (extra.note) {
    children.push(element('p', { className: ['bz-caption-note'] }, [text(extra.note)]))
  }
  const node = element('figcaption', { className: ['bz-caption'] }, children)
  node.data = { caption: { number, title: title ? title : null } }
  return node
}

function scrollRegion(
  className: string,
  ariaLabel: string,
  children: ElementContent[],
): Element {
  // §10.3 — a horizontal scroll container is reachable and scrollable from the
  // keyboard, or it is unusable without a mouse. `data-hl-scroller` is what
  // `Affordances` measures for §6.5's right-edge fade.
  return element(
    'div',
    {
      className: [className],
      role: 'region',
      tabIndex: 0,
      'aria-label': ariaLabel,
      'data-hl-scroller': '',
    },
    children,
  )
}

/**
 * A `<p>` that exists only to carry an image: the image itself, optionally a
 * hard break and an italic caption line, and nothing else. The corpus writes
 * captions that way in modules 3, 4, 5 and 6, so the `<em>` is picked up here
 * rather than left as a stray line of italics under a rule.
 *
 * The two halves go to different places. `label` — the author's alt text — is
 * the figure's short name and takes the 28px strip; it is per-image, where the
 * section heading a diagram or a table falls back to is not (module 6 carries
 * two images under one h2, and both would have printed the same label). `note`
 * is the `<em>` sentence, which is descriptive prose of no bounded length and
 * is set below the strip.
 */
function imageParagraph(
  node: Element,
): { image: Element; label: string | null; note: string | null } | null {
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
  // A vendor's mark (M69) stays inline even when it stands alone: it is not
  // a picture of anything, so it gets no number, no caption and no frame.
  const classes = image.properties?.className
  if (Array.isArray(classes) && classes.includes('bz-logo')) return null
  const alt = image.properties?.alt
  const note = em ? hastToString(em).trim() : null
  return {
    image,
    label: typeof alt === 'string' && alt.trim() !== '' ? alt.trim() : null,
    note: note === '' ? null : note,
  }
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
        const number = figureNumber(sheet, figures)
        const name = label('FIG.', number)
        const marker = element(
          'div',
          {
            className: ['mermaid-source'],
            'data-mermaid': remapMermaidFills(hastToString(code)),
          },
          [
            // §6.10 B5's loading state: a drawn placeholder at the reserved
            // height. No spinner, no skeleton shimmer, no mascot.
            element('p', { className: ['bz-fig-pending'] }, [text(`Rendering ${name}`)]),
          ],
        )

        parent.children[index] = element(
          'figure',
          { className: ['bz-fig', 'bz-diagram'], 'data-hl-width': 'prose' },
          [
            /*
              M16 stage 5 — the dark frame is on the SCROLL BOX and not on the
              `<figure>`, because `01` puts `figcaption` OUTSIDE `.diagram`
              and a caption inside the frame would be page ink on a slab
              ground. Two language classes on one element: `bz-figure` is the
              frame, `bz-figure-body` the containment.
            */
            scrollRegion(
              'bz-figure bz-figure-body',
              name.replace('FIG.', 'Figure'),
              [marker],
            ),
            /*
              THE TOOLS, in the frame's top-right corner: the palette menu and
              the expand control, both icons (`tools.ts`). A sibling of the
              frame and not a child, because the frame is the horizontal
              scroller and a child would scroll away with a wide drawing; the
              figure is the positioning box and pins them to the corner.

              **`lang="en"`** for the reason the expand control carried it
              before (M19): these are interface words inside translated prose,
              and a screen reader on a Turkish page must not pronounce
              `Expand diagram` as Turkish.

              Hidden until the drawing exists (`data-hl-ready`), as the old
              caption control was: a control that cannot do its job must not
              be drawn (§1), and with no script there is no drawing.
            */
            element('div', { className: ['bz-figure-tools'], lang: 'en' }, [
              diagramThemeMenu(),
              /* The same copy control the code blocks carry (`tools.ts`), beside EXPAND: it
                 copies the diagram's Mermaid source, not the drawing. */
              copyControl(),
              element(
                'button',
                {
                  type: 'button',
                  className: ['bz-tool'],
                  'data-hl-expand': '',
                  'aria-label': 'Expand diagram',
                  title: 'Expand diagram',
                },
                [icon('expand')],
              ),
            ]),
            caption('FIG.', number, section),
          ],
        )
        return [SKIP, index + 1]
      }

      // ---- Images (§6.9) ---------------------------------------------------
      const image = imageParagraph(node)
      if (image) {
        figures += 1
        const number = figureNumber(sheet, figures)
        parent.children[index] = element(
          'figure',
          { className: ['bz-fig', 'bz-image'], 'data-hl-width': 'prose' },
          [image.image, caption('FIG.', number, image.label ?? section, { note: image.note })],
        )
        return [SKIP, index + 1]
      }

      // ---- Tables (§6.5) ---------------------------------------------------
      if (node.tagName === 'table') {
        tables += 1
        const columns = columnCount(node)
        applyTableHeaders(node, columns)
        const number = figureNumber(sheet, tables)
        const name = label('TBL.', number)
        parent.children[index] = element(
          'figure',
          {
            className: ['bz-fig', 'bz-tablefig'],
            'data-hl-width': widthForColumns(columns),
            'data-hl-columns': String(columns),
          },
          [
            caption('TBL.', number, section),
            scrollRegion('bz-scroller', name.replace('TBL.', 'Table'), [node]),
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
 * A GitHub alert (`callout.ts`) becomes a call-out card: the marker is taken off, the first
 * paragraph is the card's title, and a last paragraph that holds nothing but a link is the
 * button, drawn with the language's own `bz-btn`. The kind is an attribute, so the
 * stylesheet decides what each looks like and a new kind needs no change here.
 *
 * Returns true when the quote was a call-out, so the pull-rule label logic leaves it alone.
 */
function openCallout(quote: Element, first: Element, id: string): boolean {
  const lead = first.children[0]
  if (lead?.type !== 'text') return false
  const kind = calloutKindOf(lead.value)
  if (kind === null) return false

  lead.value = lead.value.replace(CALLOUT_MARKER, '')
  // The marker ends its line, and a line that ends in two spaces leaves a `<br>` after it
  // (GitHub shows no gap there either): neither is part of the card.
  while (first.children.length > 0) {
    const next = first.children[0]
    if ((next.type === 'text' && next.value.trim() === '') || (isElement(next) && next.tagName === 'br')) {
      first.children.shift()
    } else break
  }
  // A marker alone in its paragraph leaves nothing: the paragraph goes, and the next one is the title.
  if (first.children.length === 0) quote.children.splice(quote.children.indexOf(first), 1)
  const title = first.children.length === 0 ? elementChildren(quote).find((c) => c.tagName === 'p') : first

  quote.properties = {
    ...quote.properties,
    className: ['bz-quote', 'bz-callout'],
    'data-hl-callout': kind,
    // A card the page puts in front of the reader is a note, named by its own title; left as
    // a blockquote it would be announced as a quotation, which it is not.
    role: 'note',
    ...(title ? { 'aria-labelledby': id } : {}),
  }
  if (title) title.properties = { ...title.properties, className: ['bz-callout-title'], id }

  const blocks = elementChildren(quote)
  const last = blocks[blocks.length - 1]
  if (last !== undefined && last !== title && last.tagName === 'p') {
    const inner = last.children.filter((child) => !isBlank(child))
    // `**[text](url)**` reads as a bold link on GitHub; the button is the link itself.
    const only = inner.length === 1 ? inner[0] : undefined
    const wrapped = isElement(only) && only.tagName === 'strong' ? only.children.filter((child) => !isBlank(child)) : []
    const link = wrapped.length === 1 ? wrapped[0] : only
    // A link with no address (`rehypeSafeLinks` took it away) is not a button to press.
    if (isElement(link) && link.tagName === 'a' && typeof link.properties?.href === 'string') {
      link.properties = { ...link.properties, className: ['bz-btn'] }
      last.properties = { ...last.properties, className: ['bz-callout-cta'] }
      last.children = [link]
    }
  }
  return true
}

/**
 * §6.8 — a blockquote is a pull-rule, not a left bar, and one whose first child
 * is a bold lead-in ending in `:` gets that label lifted into a mono mark above
 * the rule. **MEASURED:** 13 blockquote lines exist in the whole corpus, three
 * of them `> **Boundary, not guardrail:** …`. They stay inline; marginalia
 * hoisting into the right rail is cut (§4.6).
 */
function rehypeBlockquotes(idPrefix: string) {
  return (tree: Root) => {
    let callouts = 0
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'blockquote') return
      node.properties = { ...node.properties, className: ['bz-quote'] }

      const paragraph = node.children.find(isElement)
      if (!paragraph || paragraph.tagName !== 'p') return

      if (openCallout(node, paragraph, `${idPrefix}-${++callouts}`)) return

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
        element('p', { className: ['bz-quote-label'] }, [text(raw.slice(0, -1))]),
        element('div', { className: ['bz-quote-body'] }, node.children),
      ]
    })
  }
}

// ---------------------------------------------------------------------------
// §6.4 task lists
// ---------------------------------------------------------------------------

/**
 * §6.4 / §7.7 — a GFM `- [ ]` ships as a `disabled` checkbox, and this site
 * tracks no per-item state, so it is inert decoration. It still entered the
 * accessibility tree as a `checkbox` with no accessible name — the item text
 * is a *sibling* text node, not a label — which is eight "checkbox, unchecked,
 * dimmed" announcements down module 13's checklist, none of them naming the
 * item they belong to. **MEASURED:** 8 exist in the corpus, all in module 13,
 * and every one is unchecked, so hiding the input loses no state.
 *
 * `aria-hidden` on an element that is already `disabled` is safe: it is not
 * focusable, so this cannot orphan focus inside a hidden subtree. The `li`'s
 * own text is untouched and still read.
 */
/**
 * §12.7 — the checklist items, out through the established sink.
 *
 * The same shape as `rehypeCollectToc`: the plugin is handed the array it
 * fills, so the data leaves the pipeline without a module-level variable and
 * without a second parse of the same file.
 *
 * **The inert list stays in the prose.** §6.4/§7.7's `disabled aria-hidden`
 * checkbox is what the sheet renders today, and this exposes the items so
 * §12.7's live control can replace it — it does not do the replacing. Removing
 * the list here would take sheet 13's eight items off the sheet, in the middle
 * of the section that explains them, and leave nothing in their place until
 * something mounts `Checklist`.
 *
 * **Pipeline position.** BEFORE `rehypeExternalLinks`, which is load-bearing:
 * that plugin appends a `↗` mark inside every external anchor, and `↗` would
 * then be part of the recorded item text. Also before `rehypePrettyCode`, for
 * the same class of reason. Either side of `rehypeTaskListMarkers` would do —
 * that one only sets an attribute — so it is placed beside it, because the two
 * read the same markup for the same section of the spec.
 *
 * One index space per sheet, not one per list: `visit` walks in document order,
 * so sheet 13's two groups either side of a paragraph number 0–7 straight
 * through, which is the key the reader's ticks are stored under (§12.7).
 */
function rehypeCollectChecklist(sink: ChecklistItem[]) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'li' || !classNames(node).includes('task-list-item')) return
      // The checkbox contributes no text and the item's own text is a sibling
      // of it, which is exactly why §6.4 could not give the input a name.
      const text = hastToString(node).trim()
      if (text === '') return
      const index = sink.length
      // Emitted, not recounted: `ChecklistIsland` reads this attribute rather
      // than numbering the boxes itself, so the key a tick is stored under is
      // by construction the key `checklistOf` reported. Two independent counts
      // over the same markup is how they start disagreeing (§12.7).
      node.properties = { ...node.properties, 'data-hl-check': String(index) }
      sink.push({ index, text })
    })
  }
}

function rehypeTaskListMarkers() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, _index, parent) => {
      if (node.tagName !== 'input' || node.properties?.type !== 'checkbox') return
      if (node.properties?.disabled !== true) return
      if (parent?.type !== 'element' || !classNames(parent).includes('task-list-item')) return
      node.properties['aria-hidden'] = 'true'
    })
  }
}

// ---------------------------------------------------------------------------
// §6.3 links
// ---------------------------------------------------------------------------

/**
 * §6.3 — the corpus' own cross-references, translated from file paths into
 * routes. `links.ts` carries the rule and the reasoning; this is the wiring.
 *
 * The origin is derived from a sheet number rather than passed alongside it as a
 * path: the corpus is the map from a number to the file it was loaded from, so a
 * caller states one fact it already holds and cannot state a directory that
 * disagrees with its sheet number. Two options carry that number —
 * `RenderOptions.sheet` for a whole sheet and `excerptOf` for a section lifted
 * out of one — because only the first of them may also renumber figures.
 *
 * Looked up lazily, on the first course link in the document. A sheet with none
 * — and every render that is not a sheet at all — must not pay for
 * `loadAllModules()`, which reads every module file and runs `git log` over each.
 *
 * **Markdown with no origin and an internal `.md` link in it throws.** A
 * relative path with no directory to resolve it against cannot be turned into a
 * route by guessing, and the alternative — skipping the document silently — is
 * how this plugin shipped four dead links while measuring itself at zero: the
 * module page renders `## Summary` a second time to feed the Quick Check panel,
 * that render passed no origin, and three sheets cross-reference a neighbour
 * inside their summary. Checking the body render does not rewrite the summary
 * render. So a caller that has an origin and forgets to pass it now fails at
 * build time rather than emitting an href the browser resolves into a 404.
 *
 * The one legitimate sourceless render left is a category introduction, and it
 * is legitimate because `intro.ts` strips every markdown-file link out of the
 * README before it reaches here — **MEASURED:** zero `](*.md)` targets survive
 * in all six. `tests/corpus/links.test.ts` renders all three paths, so that
 * stays a fact rather than an assumption.
 *
 * **Pipeline position.** BEFORE `rehypeExternalLinks`, which only reads
 * `https?:` hrefs and would therefore have ignored these either way — the order
 * is for the reader: the two plugins are the whole of §6.3, translation first
 * and then the mark that says a link leaves the site.
 */
function rehypeCourseLinks(
  sheet: number | undefined,
  localise?: (route: string) => string,
) {
  return (tree: Root) => {
    let source: string | null | undefined

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return
      const value = node.properties?.href
      if (typeof value !== 'string' || !isCourseLink(value)) return

      if (sheet === undefined) {
        throw new Error(
          `Cannot resolve the internal markdown link "${value}": this render was ` +
          'given no origin. The caller has to pass `sheet` for a numbered module, ' +
          'or `excerptOf` for a section lifted out of one, because the file the ' +
          'href was written in is what a relative path resolves against.',
        )
      }

      source ??= sheetSource(sheet)
      if (source === null) {
        throw new Error(
          `Cannot resolve the internal markdown link "${value}": no file in ` +
          `mini-courses/ carries module number ${sheet}, so there is no directory ` +
          'to resolve a relative path against.',
        )
      }

      // `courseRouteFor` answers null only for an href `isCourseLink` has
      // already rejected, so this is narrowing rather than a branch: a link it
      // recognises and cannot resolve throws instead.
      const resolved = courseRouteFor(value, source)
      if (resolved === null) return

      // Localise the BARE route, then apply the base path, then the fragment.
      // The caller's map is a set of bare routes, so a string that already
      // carries the base path or a fragment never matches it; that order was
      // the defect which sent every Turkish and Persian cross-reference on the
      // deployed build back to English. `href()` is applied here and nowhere
      // else in this plugin: a prose anchor is not a `<Link>`, so the base path
      // is this module's job (see `lib/url.ts`), and the route keeps its
      // trailing slash because `trailingSlash: true` makes that form canonical.
      const { route, fragment, key } = resolved
      const localised = localise ? localise(route) : route
      node.properties.href = href(localised) + fragment

      // The same answer for a reader of the tree: the address the link lands
      // on, so an untranslated neighbour stays English and a module with no
      // For Everyone page stays in For Engineers, exactly as the href does.
      node.data = {
        ...node.data,
        courseTarget: key === null
          ? { kind: 'catalog' }
          : { kind: 'module', key, fragment, route: localised },
      }
    })
  }
}

/**
 * §6.3 / T3 — a link is ink text with a `--color-line-strong` underline. The
 * only thing that marks it as leaving the site is a mono `↗`. **MEASURED:**
 * module 9 carries 74 external links; 74 vermilion words in one sheet would be
 * unreadable and would end `--color-primary` meaning "signed off".
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
        element('span', { className: ['bz-ext-mark'], 'aria-hidden': 'true' }, [text('↗')]),
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

      /* THE TOKEN COLOURS, as classes. Shiki writes each token's colour
         inline as `--shiki-light:#…`, and for every commit since stage 0
         deleted the rule that read those properties NOTHING read them — every
         token on the site painted in the slab's default ink, MEASURED one
         colour across a whole module's code. So the colour is taken back off
         the span and turned into the language's own `bz-tok-<role>` class,
         and the palette the reader chose decides what that class paints
         (`bazaar.css`). The weight goes with it: `.bz-tok-keyword` carries it.

         The colour identifies the role because the theme gives every role a
         distinct one (`code-theme.test.ts` holds that), and a token in the
         default ink takes no class and inherits. */
      visit(pre, 'element', (span: Element) => {
        const style = span.properties?.style
        if (typeof style !== 'string' || !style.includes('--shiki-')) return
        const colour = /--shiki-light:\s*(#[0-9a-f]{6})/i.exec(style)?.[1]?.toLowerCase()
        const role = colour === undefined ? undefined : TOKEN_CLASS_OF_COLOUR.get(colour)
        delete span.properties.style
        if (role !== undefined) span.properties.className = [role]
      })

      pre.properties = {
        ...pre.properties,
        tabIndex: 0,
        role: 'region',
        'aria-label': language === 'output' ? 'Program output' : `${language} code`,
        // §6.7 gives the body `overflow-x: auto` and says nothing about a fade,
        // but a code block that clips mid-token while the table beside it fades
        // is the same page telling a reader two different things. MEASURED: at
        // 390px all eight blocks on the RAG sheet overflow.
        'data-hl-scroller': '',
        className: ['bz-slab-code'],
      }

      parent.children[index] = element(
        'div',
        /*
          THE SLAB, named the way the language names it. This used to be
          `hl-code hl-slab`, and the comment beside it said `hl-slab` was "a
          local theme override in `rail.css`" — a rule that was deleted with the
          old interface and never existed under that name again, so for four
          commits the class was inert and the comment was describing a file
          nobody could open. `bz-slab` is the primitive: a mono header strip and
          a scrolling body on a dark ground that does not re-theme.
        */
        { className: ['bz-slab'], 'data-language': language },
        [
          element('div', { className: ['bz-slab-head'] }, [
            element('span', { className: ['bz-slab-lang'] }, [text(language)]),
            /* The palette menu and the copy control, both icons now
               (`tools.ts`). Copy is named by `aria-label`; what it says after
               a press goes through the hidden live word inside it, because an
               icon swap is not something a screen reader hears. */
            element('div', { className: ['bz-slab-tools'], lang: 'en' }, [
              paletteMenu('code'),
              copyControl(),
            ]),
          ]),
          pre,
        ],
      )
      return [SKIP, index + 1]
    })
  }
}

// ---------------------------------------------------------------------------

/**
 * The rendered body as a hast tree beside its HTML, for a consumer that needs
 * what the HTML cannot carry: the metadata the plugins write on `data`
 * (`CourseTarget`, `imagePath`, `CaptionData`).
 *
 * One processor runs once: the tree is parsed and transformed, and the HTML is
 * that same tree stringified, so the two cannot disagree (bar the one heading `swapModulesMark` redraws, D135) and there is one
 * `assertNoRawHex` site. `renderMarkdown` is this with the tree dropped.
 */
export async function renderTree(
  markdown: string,
  options: RenderOptions = {},
): Promise<RenderedTree> {
  const toc: TocEntry[] = []
  const checklist: ChecklistItem[] = []

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSafeLinks)
    .use(rehypeDropFirstH1)
    .use(rehypeDropDek)
    // §12.6 — before the lead class is spent and before figures are numbered.
    .use(rehypeDropSelfCheck)
    // The series map — same position, same reasons (`rehypeDropSeriesSection`).
    .use(rehypeDropSeriesSection)
    .use(rehypeLeadParagraph)
    .use(rehypeSectionMarks)
    .use(rehypeRewriteImages, options.imageBase, options.imagePath)
    .use(rehypeFigures, options)
    .use(rehypeKeepLogoWithName)
    .use(rehypeBlockquotes, `callout-${options.sheet ?? options.excerptOf ?? 0}${options.excerptOf === undefined ? '' : '-ex'}`)
    .use(rehypeSlug)
    .use(rehypeCollectToc, toc)
    .use(rehypeHeadingAnchors)
    // §12.7 — before `rehypeExternalLinks` appends its `↗` to the item text.
    .use(rehypeCollectChecklist, checklist)
    .use(rehypeTaskListMarkers)
    // §6.3 — file paths become routes, then external links get their mark.
    .use(rehypeCourseLinks, options.sheet ?? options.excerptOf, options.localiseRoute)
    .use(rehypeExternalLinks)
    // B8 — both variants, written as CSS custom properties on every token, so
    // flipping `.dark` re-themes the block with no re-highlight (§9.2).
    .use(rehypePrettyCode, { theme: codeThemes(), keepBackground: false })
    .use(rehypeCodeBlocks)
    .use(rehypeStringify, { allowDangerousHtml: true })

  const tree = await processor.run(processor.parse(markdown))
  // D135: the site's HTML carries the LokumAI mark; `tree` keeps the corpus' own heading.
  const html = processor.stringify(swapModulesMark(tree))
  assertNoRawHex(html, options.sheet === undefined ? 'prose' : `module ${options.sheet}`)

  return { tree, html, toc, checklist }
}

export async function renderMarkdown(
  markdown: string,
  options: RenderOptions = {},
): Promise<RenderedMarkdown> {
  const { html, toc, checklist } = await renderTree(markdown, options)
  return { html, toc, checklist }
}
