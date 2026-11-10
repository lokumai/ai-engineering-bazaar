import MiniSearch from 'minisearch'
import { searchDocs } from '@/lib/search/documents'
import { SEARCH_LANGS, searchOptions, type SearchLang } from '@/lib/search/normalise'

/**
 * M59 (D95) — the search index for one language, written by the build as
 * `/search/<lang>.json` and fetched by the search window the first time it opens, never
 * with the page. A MiniSearch index, serialised with the documents' stored fields, so the
 * browser loads it and searches it without seeing the corpus.
 */
export const dynamic = 'force-static'

export function generateStaticParams(): Array<{ file: string }> {
  return SEARCH_LANGS.map((lang) => ({ file: `${lang}.json` }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const lang = file.replace(/\.json$/, '') as SearchLang
  if (!SEARCH_LANGS.includes(lang)) return new Response('Not found', { status: 404 })
  const index = new MiniSearch(searchOptions(lang))
  index.addAll(searchDocs(lang))
  return new Response(JSON.stringify(index), { headers: { 'content-type': 'application/json' } })
}
