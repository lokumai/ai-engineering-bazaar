import MiniSearch from 'minisearch'
import { describe, expect, it } from 'vitest'
import { loadAllModules, loadModuleIn } from '@/lib/content/loader'
import { searchDocs, type SearchDoc } from '@/lib/search/documents'
import { SEARCH_LANGS, joinedVariant, normalise, queryTokenize, searchOptions, type SearchLang } from '@/lib/search/normalise'
import { renderMarkdown } from '@/lib/content/render'
import { TRACK_IDS, moduleRoute } from '@/lib/tracks'

/**
 * M59 (D95) — the search index, against the corpus as it is. Every term searched for is
 * taken from the corpus here, at test time, never typed in: a module's own title, and a
 * long word from its own prose.
 */

const built = new Map<SearchLang, { docs: SearchDoc[]; index: MiniSearch<SearchDoc> }>()
function indexOf(lang: SearchLang) {
  const hit = built.get(lang)
  if (hit) return hit
  const docs = searchDocs(lang)
  const index = new MiniSearch<SearchDoc>(searchOptions(lang))
  index.addAll(docs)
  /* the browser reads it back from JSON: the test does too */
  const read = MiniSearch.loadJSON<SearchDoc>(JSON.stringify(index), searchOptions(lang))
  built.set(lang, { docs, index: read })
  return built.get(lang)!
}

describe('normalise (D95)', () => {
  it('folds Turkish to what an English keyboard types, with the Turkish i rules', () => {
    expect(normalise('Görev', 'tr')).toBe('gorev')
    expect(normalise('IŞIK', 'tr')).toBe('isik')
    expect(normalise('İstanbul', 'tr')).toBe('istanbul')
    expect(normalise('ağ', 'tr')).toBe(normalise('ag', 'tr'))
  })
  it('reads Persian the same with or without the non-joiner, Arabic letter forms or vowel marks', () => {
    expect(normalise('می‌خواهم', 'fa')).toBe(normalise('میخواهم', 'fa'))
    expect(normalise('كتاب', 'fa')).toBe(normalise('کتاب', 'fa'))
    expect(normalise('يك', 'fa')).toBe(normalise('یک', 'fa'))
    expect(normalise('مُدل', 'fa')).toBe(normalise('مدل', 'fa'))
    expect(normalise('۲۰۲۶', 'fa')).toBe('2026')
  })
  it('lower-cases English and leaves its letters alone', () => {
    expect(normalise('LLM', 'en')).toBe('llm')
  })
})

describe('the index (D95)', () => {
  it('finds each written module by its own title, in each language and track it exists in', () => {
    let checked = 0
    for (const lang of SEARCH_LANGS) {
      const { index } = indexOf(lang)
      for (const track of TRACK_IDS) {
        for (const english of loadAllModules()) {
          const m = loadModuleIn(english.slug, lang, track)
          if (!m) continue
          const top = index.search(m.frontmatter.title, { filter: (r) => r.track === track && r.kind === 'module' })[0]
          expect(top?.url, `${lang} ${track} ${m.frontmatter.title}`).toBe(moduleRoute(m.slug, track, lang))
          checked += 1
        }
      }
    }
    expect(checked, 'no module was searched for').toBeGreaterThan(SEARCH_LANGS.length)
  })

  it('finds a written module by a word from its own prose', () => {
    let checked = 0
    for (const lang of SEARCH_LANGS) {
      const { docs, index } = indexOf(lang)
      for (const doc of docs.filter((d) => d.kind === 'section' && d.track === 'engineers')) {
        // the doc's longest word: rare enough that it points at few places
        const word = doc.text.split(/[^\p{L}\p{N}]+/u).sort((a, b) => b.length - a.length)[0]
        if (!word || word.length < 7) continue
        const found = index.search(word, { prefix: false, fuzzy: false }).map((r) => r.id)
        expect(found, `${lang}: "${word}" does not find ${doc.id}`).toContain(doc.id)
        checked += 1
      }
    }
    expect(checked, 'no section was searched for').toBeGreaterThan(50)
  })

  it('holds no module a reader could not open: an unwritten For Everyone module is absent', () => {
    for (const lang of SEARCH_LANGS) {
      const { docs } = indexOf(lang)
      for (const english of loadAllModules()) {
        const written = loadModuleIn(english.slug, lang, 'everyone') !== undefined
        const present = docs.some((d) => d.track === 'everyone' && d.kind !== 'level' && d.url.startsWith(moduleRoute(english.slug, 'everyone', lang)))
        expect(present, `${lang} ${english.slug} For Everyone`).toBe(written)
      }
    }
  })

  it('points every section at an id the page gives its heading', () => {
    for (const lang of SEARCH_LANGS) {
      for (const doc of indexOf(lang).docs.filter((d) => d.kind === 'section')) {
        expect(doc.url, doc.id).toMatch(/#[\p{L}\p{N}][\p{L}\p{M}\p{N}_-]*$/u)
      }
      const ids = indexOf(lang).docs.map((d) => d.id)
      expect(new Set(ids).size, `${lang}: two documents share an id`).toBe(ids.length)
    }
  })
})

describe('ranking (D99)', () => {
  it('puts a written module above a planned one, and an explanation above a list of links', () => {
    const boost = searchOptions('en').searchOptions.boostDocument
    expect(boost('x', 'y', { ready: true, section: 'Context Window' })).toBe(1)
    expect(boost('x', 'y', { ready: false, section: '' })).toBeLessThan(1)
    for (const list of ['References', 'Kaynaklar', 'منابع', 'Summary']) {
      expect(boost('x', 'y', { ready: true, section: list }), list).toBeLessThan(boost('x', 'y', { ready: false, section: '' }))
    }
  })
})

describe('a Persian word typed three ways (D99)', () => {
  it('is found with the non-joiner, without it, or with a space, whichever way the text wrote it', () => {
    const index = new MiniSearch(searchOptions('fa'))
    index.addAll([
      { id: 'joined', title: '', section: '', text: 'من میخواهم بدانم', url: 'a', kind: 'section' },
      { id: 'nonjoined', title: '', section: '', text: 'من می\u200cخواهم بدانم', url: 'b', kind: 'section' },
    ])
    for (const typed of ['می\u200cخواهم', 'میخواهم', 'می خواهم']) {
      const variant = joinedVariant(typed, 'fa')
      const query = variant === null ? typed : { combineWith: 'OR' as const, queries: [typed, variant] }
      const found = index.search(query, { tokenize: queryTokenize, prefix: false, fuzzy: false }).map((r) => r.id).sort()
      expect(found, typed).toEqual(['joined', 'nonjoined'])
    }
  })
})

describe('every section points at a heading the page renders', () => {
  it('matches the ids render.ts gives the headings, for every module, language and track', async () => {
    let checked = 0
    for (const lang of SEARCH_LANGS) {
      const sections = indexOf(lang).docs.filter((d) => d.kind === 'section')
      const byPage = new Map<string, string[]>()
      for (const d of sections) {
        const [page, id] = d.url.split('#')
        byPage.set(page, [...(byPage.get(page) ?? []), id])
      }
      for (const english of loadAllModules()) {
        for (const track of TRACK_IDS) {
          const m = loadModuleIn(english.slug, lang, track)
          const ids = byPage.get(moduleRoute(english.slug, track, lang))
          if (!m || !ids) continue
          const { toc } = await renderMarkdown(m.body, { sheet: m.frontmatter.module })
          const rendered = new Set(toc.map((t) => t.id))
          for (const id of ids) {
            expect(rendered.has(id), `${lang} ${track} ${english.slug}: #${id} is not on the page`).toBe(true)
            checked += 1
          }
        }
      }
    }
    expect(checked, 'no section was compared with its page').toBeGreaterThan(100)
  }, 120_000)
})

