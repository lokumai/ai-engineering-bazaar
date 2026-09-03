import fs from 'node:fs'
import matter from 'gray-matter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import type { Element } from 'hast'
import { stripBuildFurniture, stripLeadIn } from './strip'

/**
 * Requirement B6 — every value the module header block (§5.5) prints is
 * computed here, from the file, at build time. Nothing in this module reads a
 * hand-maintained number: §11.25 makes derived-or-absent the rule, because
 * hand-maintained metadata drifts within two commits and the honesty of the
 * whole title block rests on it.
 */

/** §7.6 — a Turkish file counts as a translation at 40% of the English extent. */
export const TRANSLATION_RATIO = 0.4

/**
 * §4.4 — the two page anatomies.
 *
 * **A2 is gone, and removing it was a consequence rather than a tidy-up.** §4.4
 * split drawn sheets at 2,500 words: A0 got three zones and the title-block
 * panel, A2 got two zones and a horizontal strip. Both always used the same
 * 1152px box and the same 656px measure, so the split moved the metadata and the
 * prose with it — the text started 132px further right on a short sheet than on
 * a long one, and a reader asked whether every page was designed separately.
 *
 * What kept A2 alive after the panel was shared was one rule, and measuring it
 * killed the rule too: §4.7 grew A0's measure to 720px between 1024 and 1279
 * once the right rail collapsed, which is **82 characters per line at 17px
 * Source Serif 4** — measured, against the 68–72 that §3.2 chose 656px FOR, and
 * past the 75 that ends the readable range. Widening the measure because a rail
 * left a hole is spending space because it is there; the system's own answer to
 * leftover width is to centre, which is what A2 did. So A0 now keeps 656px at
 * that band as well, the two formats became identical at every width, and the
 * value that distinguished them had nothing left to say.
 *
 * `status` and `format` still answer different questions — whether the content
 * is written, and which anatomy the page uses — and `data-format` stays named
 * after the thing it controls.
 */
export type SheetFormat = 'A0' | 'A4'
export type Lang = 'EN' | 'EN·TR'

/** §5.5 prints the bilingual value spaced; the token itself stays unspaced. */
export const LANG_DISPLAY: Record<Lang, string> = {
  EN: 'EN',
  'EN·TR': 'EN · TR',
}

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

/**
 * §4.4 — the sheet anatomy.
 *
 * `words` is no longer consulted and is kept in the signature deliberately: it
 * is what the removed 2,500-word threshold read, every caller already has it,
 * and a parameter is cheaper to leave than an API break is to explain. See
 * `SheetFormat` for why the threshold went.
 */
export function sheetFormat(
  frontmatter: { status: 'ready' | 'draft' },
  words: number,
): SheetFormat {
  void words
  return frontmatter.status === 'draft' ? 'A4' : 'A0'
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

/**
 * §5.5 `EXTENT` of one file, measured exactly as the loader measures the
 * English body. A file that is not there is zero words rather than an error: a
 * missing Turkish sibling has the honest answer `EN`.
 *
 * **It reads the extent and nothing else.** It used to return the declared
 * `status` too, out of its own `matter()` call, which gave `langCoverage` a
 * second opinion about a fact the loader already knew. That second read is why
 * `status` could not leave the frontmatter until this function stopped asking
 * for it.
 */
const extents = new Map<string, number>()

function extentOfFile(file: string): number {
  const cached = extents.get(file)
  if (cached !== undefined) return cached

  const words = fs.existsSync(file)
    ? extent(stripLeadIn(stripBuildFurniture(matter(fs.readFileSync(file, 'utf8')).content)))
    : 0

  extents.set(file, words)
  return words
}

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
 *
 * **The status is an argument, not something read here.** It is the loader's,
 * out of `curriculum.yaml`, and taking it means this function no longer opens
 * the English file to ask a question somebody else already answered. Omitting
 * it is a compile error, which is the point: with `status` gone from the
 * frontmatter a second read would see `undefined`, the draft guard would stop
 * firing, and every draft sheet would claim to be bilingual on the strength of
 * a stub translated from a stub.
 */
export function langCoverage(englishFile: string, status: 'ready' | 'draft'): Lang {
  if (status === 'draft') return 'EN'
  return langFromExtents(
    extentOfFile(englishFile),
    extentOfFile(englishFile.replace(/\.md$/, '_tr.md')),
  )
}
