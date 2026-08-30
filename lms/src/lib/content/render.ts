import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { toString as hastToString } from 'hast-util-to-string'
import type { Element, Root } from 'hast'

export interface TocEntry {
  id: string
  text: string
  depth: 2 | 3
}

export interface RenderedMarkdown {
  html: string
  toc: TocEntry[]
}

/**
 * Mermaid needs a DOM, so it cannot render at build time. Replace the fence
 * with a marker the client island picks up, before the highlighter sees it.
 */
function rehypeMermaid() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'pre' || index === undefined || !parent) return
      const code = node.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'code',
      )
      if (!code) return
      const classes = (code.properties?.className ?? []) as string[]
      if (!classes.includes('language-mermaid')) return

      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['mermaid-source'], 'data-mermaid': hastToString(code) },
        children: [],
      }
    })
  }
}

/** Strip the leading h1; the module page renders the title from frontmatter. */
function rehypeDropFirstH1() {
  return (tree: Root) => {
    const index = tree.children.findIndex(
      (c) => c.type === 'element' && (c as Element).tagName === 'h1',
    )
    if (index !== -1) tree.children.splice(index, 1)
  }
}

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

function rehypeCollectToc(sink: TocEntry[]) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const depth = node.tagName === 'h2' ? 2 : node.tagName === 'h3' ? 3 : null
      if (depth === null) return
      const id = node.properties?.id
      if (typeof id !== 'string') return
      sink.push({ id, text: hastToString(node), depth })
    })
  }
}

export async function renderMarkdown(
  markdown: string,
  options: { imageBase?: string } = {},
): Promise<RenderedMarkdown> {
  const toc: TocEntry[] = []

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeDropFirstH1)
    .use(rehypeMermaid)
    .use(rehypeRewriteImages, options.imageBase)
    .use(rehypeSlug)
    .use(rehypeCollectToc, toc)
    .use(rehypePrettyCode, {
      theme: { light: 'github-light', dark: 'github-dark-dimmed' },
      keepBackground: false,
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown)

  return { html: String(file), toc }
}
