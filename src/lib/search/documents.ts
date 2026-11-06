import GithubSlugger from 'github-slugger'
import type { Heading, Root, RootContent } from 'mdast'
import { toString } from 'mdast-util-to-string'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { SERIES_HEADINGS } from '@/lib/content/lines'
import { loadAllModules, loadModuleIn } from '@/lib/content/loader'
import { TRACK_IDS, catalogRoute, moduleRoute, type Track } from '@/lib/tracks'
import type { SearchLang } from './normalise'

/**
 * M59 (D95) — what the search index holds, read from the corpus at build time.
 *
 * One document per module (its title and its opening), one per section of a written module
 * (its heading and its prose), and one per level. Every module is read the way its page
 * reads it, through `loadModuleIn` in that language and track, so **an unwritten For
 * Everyone module, or a module with no translation, is absent** rather than found and sent
 * to a page that says "not written". A planned For Engineers module is found by its title
 * only, marked so, because the catalog lists it and its page exists.
 *
 * Code blocks are left out: the author asked for a search of module and level names and of
 * their content, and a reader searching "agent" does not want every `agent.run()`.
 *
 * A section's address is the id `rehype-slug` gives its heading on the page: the same
 * slugger over the same text, after the Roman numeral `render.ts` splits off an `## VII.`
 * heading, and the series map, which the page drops, is skipped so the counter for
 * repeated headings stays in step.
 *
 * Server-only (`node:fs` through the loader).
 */

export interface SearchDoc {
  id: string
  kind: 'module' | 'section' | 'level'
  /** What is matched as a name: a module's or a level's title, and nothing on a section. */
  title: string
  /** The module (or level) a result belongs to, shown on it; not searched. */
  module: string
  section: string
  text: string
  excerpt: string
  url: string
  level: string
  track: Track
  lang: SearchLang
  ready: boolean
}

const ROMAN = /^([IVXLC]+)\.\s+/
const EXCERPT = 200
const parser = unified().use(remarkParse).use(remarkGfm)

/* A block's text. A leaf block (a paragraph, a heading, a table cell) is read whole; a
   container (a list, an item, a table, a quote) is read child by child with a space
   between, because \`toString\` alone joins two list items into one word. */
const LEAF = new Set(['paragraph', 'heading', 'tableCell'])
function blockText(node: RootContent): string {
  if (node.type === 'code' || node.type === 'html') return ''
  if (LEAF.has(node.type) || !('children' in node)) return toString(node)
  return (node.children as RootContent[]).map(blockText).join(' ')
}
const plain = (nodes: RootContent[]): string =>
  nodes.map(blockText).join(' ').replace(/\s+/g, ' ').trim()

const excerpt = (text: string): string => (text.length <= EXCERPT ? text : `${text.slice(0, EXCERPT).replace(/\s+\S*$/, '')}…`)

interface Section {
  heading: string
  id: string
  nodes: RootContent[]
}

/** The opening (before the first `##`) and each `##` section, in order. */
function sections(body: string): { opening: RootContent[]; parts: Section[] } {
  const tree = parser.parse(body) as Root
  const slugger = new GithubSlugger()
  const opening: RootContent[] = []
  const parts: Section[] = []
  let current: Section | null = null
  let titleSeen = false
  let skipping = false
  for (const node of tree.children) {
    if (node.type === 'heading') {
      const h = node as Heading
      const text = toString(h).trim()
      if (h.depth === 1 && !titleSeen) {
        titleSeen = true
        continue
      }
      if (h.depth <= 2) {
        skipping = SERIES_HEADINGS.includes(text)
        if (skipping) {
          current = null
          continue
        }
        const heading = h.depth === 2 ? text.replace(ROMAN, '') : text
        current = { heading, id: slugger.slug(heading), nodes: [] }
        parts.push(current)
        continue
      }
      if (skipping) continue
      slugger.slug(text)
    }
    if (skipping) continue
    if (current === null) opening.push(node)
    else current.nodes.push(node)
  }
  return { opening, parts }
}

export function searchDocs(lang: SearchLang): SearchDoc[] {
  const docs: SearchDoc[] = []
  for (const track of TRACK_IDS) {
    for (const category of CATEGORIES) {
      const blurb = category.blurb ?? ''
      docs.push({
        id: `${track}:level:${category.slug}`,
        kind: 'level',
        title: category.title,
        module: category.title,
        section: '',
        text: blurb,
        excerpt: excerpt(blurb),
        url: catalogRoute(track, category.slug),
        level: category.title,
        track,
        lang,
        ready: true,
      })
    }
    for (const english of loadAllModules()) {
      const m = loadModuleIn(english.slug, lang, track)
      if (m === undefined) continue
      const url = moduleRoute(m.slug, track, lang)
      const ready = track === 'everyone' || m.frontmatter.status === 'ready'
      const level = m.category.title
      const { opening, parts } = sections(m.body)
      const intro = ready ? plain(opening) : ''
      docs.push({
        id: `${track}:${lang}:${m.slug}`,
        kind: 'module',
        title: m.frontmatter.title,
        module: m.frontmatter.title,
        section: '',
        text: intro,
        excerpt: excerpt(intro || m.frontmatter.summary || ''),
        url,
        level,
        track,
        lang,
        ready,
      })
      if (!ready) continue
      for (const part of parts) {
        const text = plain(part.nodes)
        docs.push({
          id: `${track}:${lang}:${m.slug}#${part.id}`,
          kind: 'section',
          // a section is found by its heading and its prose; its module's name is shown
          // on it, and searched on the module's own document, which then comes first
          title: '',
          module: m.frontmatter.title,
          section: part.heading,
          text,
          excerpt: excerpt(text),
          url: `${url}#${part.id}`,
          level,
          track,
          lang,
          ready,
        })
      }
    }
  }
  return docs
}
