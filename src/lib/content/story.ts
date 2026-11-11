import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { type ReadingLang, TRANSLATED_LANGS } from './languages'
import { CONTENT_ROOT } from './paths'

/**
 * M90, D115 — the About page's words, read from `mini-courses/STORY.md`.
 *
 * M109, D132 — and, beside it, `STORY_tr.md` and `STORY_fa.md`, which `loadStory(lang)` reads the
 * same way. A translation mirrors the English file's sections; its motto is introduced by its own
 * language's lead (`MOTTO_LEADS`), still a named marker and not a generic `X: **"…"**`.
 *
 * The story is the author's and final, and it lives in the corpus beside MANIFEST and ROADMAP, so the
 * page restates none of it: this module reads the file at build time and the page renders what it
 * returns. It reaches `node:fs`, so only a server component may call it; the About island receives
 * the strings as props (ARCHITECTURE §7).
 *
 * The shape it reads, and nothing more:
 *
 *  - every `##` heading opens one STALL, in file order, and the paragraphs under it are the stall's
 *    text, up to the next `##`;
 *  - a `###` or deeper heading is refused with a build error: the page has nowhere to put one;
 *  - the document's LAST paragraph is the MOTTO when it reads `Our motto: **"…"**`; it then belongs
 *    to no stall. The quotation is split into its
 *    sentences, which is how the page sets it on two lines, and its straight quotation marks become
 *    curly ones, the one typographic change the round-5 playground made (R0's header).
 *
 * Rejected: rendering STORY.md through the module pipeline (`render.ts`). That pipeline is built for a
 * module (sheet numbers, figures, link rewriting) and the page needs the opposite of prose HTML: each
 * heading and each paragraph as its own string, so the island can split one into words and the other
 * into lines. A markdown file with headings and plain paragraphs is all this reads, and inline marks
 * (`**`, `*`, `` ` ``) are dropped to their text rather than half-rendered.
 */

export interface StoryStall {
  heading: string
  paragraphs: string[]
}

export interface StoryMotto {
  /** What introduces it, without its colon: `Our motto`. */
  lead: string
  /** The quotation, one sentence per entry, with curly quotation marks at its two ends. */
  lines: string[]
}

export interface Story {
  /** The `#` heading, or null when the file has none. */
  title: string | null
  stalls: StoryStall[]
  motto: StoryMotto | null
}

export const STORY_FILE = path.join(CONTENT_ROOT, 'STORY.md')

/** The file a story is written in: `STORY.md`, `STORY_tr.md`, `STORY_fa.md`. */
export function storyFile(lang: ReadingLang = 'en'): string {
  return lang === 'en' ? STORY_FILE : path.join(CONTENT_ROOT, `STORY_${lang}.md`)
}

/** What introduces the motto, per language: the file's own marker for it. */
export const MOTTO_LEADS: Readonly<Record<ReadingLang, string>> = {
  en: 'Our motto',
  tr: 'Mottomuz',
  fa: 'شعار ما',
}

/** The languages the story is written in: English always, and each translation whose file exists. */
export function storyLanguages(): ReadingLang[] {
  return ['en', ...TRANSLATED_LANGS.filter((lang) => existsSync(storyFile(lang)))]
}

/** A heading's closing hashes count only after a space, so `## Why C#` keeps its `#`. */
const H1 = /^#[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/
const H2 = /^##[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/
const DEEPER = /^#{3,}[ \t]/
/**
 * `Our motto: **quotation**`, the whole paragraph, with the language's own lead. The lead is named,
 * the way `intro.ts` names its `## Modules` heading: it is the file's marker for the motto, and
 * without it any closing line shaped `Note: **…**` would have been taken for one.
 */
function mottoPattern(lang: ReadingLang): RegExp {
  const lead = MOTTO_LEADS[lang].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^(${lead}):\\s*\\*\\*(.+)\\*\\*\\s*$`, 'i')
}

/** A paragraph's text with its inline marks dropped and its lines joined. */
function plain(text: string): string {
  return text
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}

/**
 * The language's own quotation marks for the file's straight ones: opening after a space or at the start,
 * closing elsewhere. Persian quotes with guillemets, «…», as Persian print does (M109); English and
 * Turkish take curly double quotes.
 */
export const QUOTES: Readonly<Record<ReadingLang, readonly [string, string]>> = { en: ['“', '”'], tr: ['“', '”'], fa: ['«', '»'] }

function curly(text: string, lang: ReadingLang): string {
  const [open, close] = QUOTES[lang]
  return text.replace(/(^|[\s(])"/g, `$1${open}`).replace(/"/g, close)
}

/** A quotation's sentences, each keeping its own punctuation and the quotation marks at the two ends. */
function sentences(quote: string, lang: ReadingLang): string[] {
  return curly(quote, lang)
    .split(/(?<=[.?!؟])\s+(?=\S)/)
    .map((one) => one.trim())
    .filter(Boolean)
}

/** Blocks of non-blank lines, in order. */
function blocks(markdown: string): string[] {
  return markdown
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

export function parseStory(markdown: string, lang: ReadingLang = 'en', file = 'STORY.md'): Story {
  let title: string | null = null
  const stalls: StoryStall[] = []
  const all = blocks(markdown)

  // The motto is read off the end first, so it can never be mistaken for a stall's last paragraph.
  let motto: StoryMotto | null = null
  const last = all.at(-1)
  const quoted = last && !H2.test(last) && !H1.test(last) ? mottoPattern(lang).exec(last.replace(/\s*\n\s*/g, ' ')) : null
  if (quoted) {
    motto = { lead: plain(quoted[1]), lines: sentences(plain(quoted[2]), lang) }
    all.pop()
  }

  for (const block of all) {
    const first = block.split('\n')[0]
    // A stall is one `##` section and has no place for a sub-heading, so one fails the build rather
    // than being folded silently into its stall's text.
    if (DEEPER.test(first)) {
      throw new Error(`${file}: "${first}" is a sub-heading, and a stall on the About page is one ## section of paragraphs. Make it a ## section or a sentence.`)
    }
    const h2 = H2.exec(first)
    if (h2) {
      stalls.push({ heading: plain(h2[1]), paragraphs: [] })
      const rest = block.split('\n').slice(1).join('\n').trim()
      if (rest) stalls.at(-1)!.paragraphs.push(plain(rest))
      continue
    }
    const h1 = H1.exec(first)
    if (h1 && !first.startsWith('##')) {
      title = plain(h1[1])
      continue
    }
    // Text before the first `##` belongs to no stall, and the page has nowhere to put it.
    if (stalls.length > 0) stalls.at(-1)!.paragraphs.push(plain(block))
  }

  return { title, stalls, motto }
}

export function loadStory(lang: ReadingLang = 'en'): Story {
  const file = storyFile(lang)
  return parseStory(readFileSync(file, 'utf8'), lang, path.basename(file))
}
