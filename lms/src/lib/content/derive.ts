import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import type { Element } from 'hast'
import { categoryBySlug } from './categories'
import { CONTENT_ROOT } from './paths'
import { moduleSlugFromFilename } from './slugs'
import { stripBuildFurniture, stripLeadIn } from './strip'

/**
 * Requirement B6 — every value the module header block (§5.5) prints is
 * computed here, from the file, at build time. Nothing in this module reads a
 * hand-maintained number: §11.25 makes derived-or-absent the rule, because
 * hand-maintained metadata drifts within two commits and the honesty of the
 * whole title block rests on it.
 */

/** §4.4 — the format selector's one threshold. */
export const A0_MIN_EXTENT = 2500

/** §7.6 — a Turkish file counts as a translation at 40% of the English extent. */
export const TRANSLATION_RATIO = 0.4

export type SheetFormat = 'A0' | 'A2' | 'A4'
export type Lang = 'EN' | 'EN·TR'

/** §5.5 prints the bilingual value spaced; the token itself stays unspaced. */
export const LANG_DISPLAY: Record<Lang, string> = {
  EN: 'EN',
  'EN·TR': 'EN · TR',
}

const MODULE_FILE = /^\d+_.+\.md$/
const FENCE = /^[ \t]*(`{3,}|~{3,})[ \t]*(\S*)/
const IMAGE = /!\[[^\]]*\]\([^)]*\)/g
const TABLE_DELIMITER =
  /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)+\|?[ \t]*$/
/** §6.3's rule, restated here because `render.ts` cannot import this module. */
const EXTERNAL_HREF = /^https?:\/\//i

interface Line {
  text: string
  /** True inside a fenced code block, and on the fence lines themselves. */
  fenced: boolean
  /** The info string, on an opening fence line only. */
  opens: string | null
}

/** Walk the markdown once, tracking fenced code so no counter miscounts it. */
function scan(markdown: string): Line[] {
  const out: Line[] = []
  let fence: string | null = null

  for (const text of markdown.split('\n')) {
    const match = FENCE.exec(text)
    if (fence === null && match) {
      fence = match[1][0]
      out.push({ text, fenced: true, opens: match[2].toLowerCase() })
      continue
    }
    if (fence !== null && match && match[1][0] === fence && match[2] === '') {
      fence = null
      out.push({ text, fenced: true, opens: null })
      continue
    }
    out.push({ text, fenced: fence !== null, opens: null })
  }

  return out
}

/**
 * §5.5 `EXTENT` — words in the module body after the B1 strip and the B6.1 /
 * B6.2 lead-in strip. §5.5 spells the rule out: words counted "after stripping
 * frontmatter, **the dek**, and the deleted progress rail". Callers hand this
 * `stripLeadIn(body)`, never the raw body, or it counts the two lines the sheet
 * never renders.
 *
 * Whitespace-separated tokens, which is how the corpus in Appendix A was
 * measured. Appendix A's own word counts are of the *whole file*, frontmatter
 * and progress rail included, so they run higher than the extent printed here.
 */
export function extent(body: string): number {
  const trimmed = body.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

/** §4.4 — the sheet format, decided by status and extent alone. */
export function sheetFormat(
  frontmatter: { status: 'ready' | 'draft' },
  words: number,
): SheetFormat {
  if (frontmatter.status === 'draft') return 'A4'
  return words >= A0_MIN_EXTENT ? 'A0' : 'A2'
}

/**
 * Mermaid fences that are real figures. The `## Tutorial Progress` rails are
 * excluded by stripping them first, so this is correct whether it is handed a
 * raw file or the body the loader already stripped.
 */
export function countDiagrams(body: string): number {
  return scan(stripBuildFurniture(body))
    .filter((line) => line.opens === 'mermaid')
    .length
}

/** Markdown images, outside code fences. */
export function countImages(body: string): number {
  return scan(stripBuildFurniture(body))
    .filter((line) => !line.fenced)
    .reduce((sum, line) => sum + (line.text.match(IMAGE)?.length ?? 0), 0)
}

/**
 * Pipe tables, counted once each. §5.5's `FIGURES` row prints
 * `<n> DIAG · <n> TBL`; this is the second number.
 */
export function countTables(body: string): number {
  const lines = scan(stripBuildFurniture(body))
  let tables = 0
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].fenced || lines[i - 1].fenced) continue
    if (!TABLE_DELIMITER.test(lines[i].text)) continue
    if (!lines[i - 1].text.includes('|')) continue
    tables += 1
  }
  return tables
}

/** The figure count the sheet header states: real diagrams plus images. */
export function countFigures(body: string): number {
  return countDiagrams(body) + countImages(body)
}

/**
 * The markdown pipeline, up to the point where links become `<a href>`. Built
 * once: `parse` and `runSync` are re-entrant, and the corpus goes through here
 * thirty-two times per build.
 */
const links = unified().use(remarkParse).use(remarkGfm).use(remarkRehype)

/**
 * Every external http(s) link occurrence in the body, in document order.
 *
 * Read off the parsed tree rather than matched out of the raw string, because
 * the two disagree in the places that matter: `curl https://openclaw.ai/…`
 * inside a ```bash fence and a bare `https://www.moltbook.com` inside inline
 * backticks are *text about* a URL, not links, and no reader can open them.
 * §5.5 counts "distinct external http(s) links" and §5.11 indexes them as
 * "external primary-source links"; a curl target is neither.
 *
 * This is the same node set `rehypeExternalLinks` decorates with the `↗` mark
 * (render.ts, §6.3), reached through the same parser, so the number the header
 * prints is by construction the number of marks on the page.
 */
export function externalLinks(body: string): string[] {
  const found: string[] = []
  visit(links.runSync(links.parse(body)), 'element', (node: Element) => {
    if (node.tagName !== 'a') return
    const href = node.properties?.href
    if (typeof href === 'string' && EXTERNAL_HREF.test(href)) found.push(href)
  })
  return found
}

/** §5.5 `SOURCES` — the count of *distinct* external links. */
export function countSources(body: string): number {
  return new Set(externalLinks(body)).size
}

/**
 * §12.8 — the same links, deduped, in first-appearance order.
 *
 * `externalLinks` returns *occurrences* (397 corpus-wide) where the `SOURCES`
 * count and the reader's `sources` record hold *distinct* URLs (209). A UI
 * listing the occurrences beside the header's number looks broken on any sheet
 * that cites a URL twice, so the list a reader is shown and the number beside
 * it are derived here from one function rather than two.
 *
 * It delegates rather than re-scanning. A regex-based scraper disagrees with
 * the rendered page on sheets 10, 11 and 15 — a `curl https://…` inside a
 * ```bash fence and a bare host inside backticks are text about a URL, not
 * links a reader can open — which is what `externalLinks`'s own tests pin.
 *
 * First-appearance order, because §12.8 reprints the list as "the actual
 * reading surface of the curriculum" and document order is the only ordering
 * the sheet itself asserts. `Set` preserves insertion order, so this is that
 * order and not an alphabetical rearrangement of it.
 */
export function distinctExternalLinks(body: string): string[] {
  return [...new Set(externalLinks(body))]
}

/** §7.6 — the rule, in one line, with no division by zero. */
export function langFromExtents(en: number, tr: number): Lang {
  if (en <= 0 || tr <= 0) return 'EN'
  return tr / en >= TRANSLATION_RATIO ? 'EN·TR' : 'EN'
}

interface FileFacts {
  /** The declared status, or null where the file has none — or is not there. */
  status: 'ready' | 'draft' | null
  /** §5.5 `EXTENT`, measured exactly as the loader measures the English body. */
  extent: number
}

const fileFacts = new Map<string, FileFacts>()

function factsOfFile(file: string): FileFacts {
  const cached = fileFacts.get(file)
  if (cached !== undefined) return cached

  let facts: FileFacts = { status: null, extent: 0 }
  if (fs.existsSync(file)) {
    const parsed = matter(fs.readFileSync(file, 'utf8'))
    const status = parsed.data.status
    facts = {
      status: status === 'ready' || status === 'draft' ? status : null,
      extent: extent(stripLeadIn(stripBuildFurniture(parsed.content))),
    }
  }

  fileFacts.set(file, facts)
  return facts
}

/** Resolve `fundamentals/llms` to its English file, without asking the loader. */
function englishFileFor(slug: string): string | null {
  const [categorySlug, moduleSlug] = slug.split('/')
  const category = categoryBySlug(categorySlug ?? '')
  if (!category || !moduleSlug) return null

  const dir = path.join(CONTENT_ROOT, category.dir)
  for (const filename of fs.readdirSync(dir).sort()) {
    if (!MODULE_FILE.test(filename) || filename.endsWith('_tr.md')) continue
    if (moduleSlugFromFilename(filename) === moduleSlug) return path.join(dir, filename)
  }
  return null
}

const langs = new Map<string, Lang>()

/**
 * §7.6 `LANG` — `EN · TR` only where the Turkish sibling is a real translation
 * of a sheet that has actually been drawn.
 *
 * Two rules, and both of them are the spec's. §7.6's ratio decides a drawn
 * sheet. A sheet that is *not* drawn prints `EN`, because §4.5 item 4 spells
 * the draft strip out as `LANG EN` and §7.6's own stated outcome is `EN` on
 * sheets 8–32.
 *
 * That second rule is not a rounding of the first. Measured today, modules
 * 16–32 sit at 0.83–1.00 — both sides of those pairs are stubs, and the
 * Turkish stub is a faithful translation of the English one. But §7.6 calls
 * those files placeholders in the same breath, §11.27 reserves the badge for a
 * "real translation", and §1's self-check names this exact sheet: a `LANG
 * EN·TR` badge on a schedule of parts is a claim about a drawing nobody has
 * drawn in either language. Printing it would also invert the index — the
 * seventeen undrawn sheets advertised as bilingual and the seven finished ones
 * as English-only.
 */
function langOfEnglishFile(file: string): Lang {
  const english = factsOfFile(file)
  if (english.status === 'draft') return 'EN'
  return langFromExtents(english.extent, factsOfFile(file.replace(/\.md$/, '_tr.md')).extent)
}

export function langCoverage(slug: string): Lang {
  const cached = langs.get(slug)
  if (cached !== undefined) return cached

  const english = englishFileFor(slug)
  const lang = english === null ? 'EN' : langOfEnglishFile(english)

  langs.set(slug, lang)
  return lang
}
