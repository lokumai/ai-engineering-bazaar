import { type ReadingLang, TRANSLATED_LANGS, type TranslatedLang } from '@/lib/content/languages'
import { type Track, trackOfPath } from '@/lib/tracks'

/**
 * The track and language of a module page, read off its address.
 *
 * Every link out of a module page goes through the page's one map
 * (`localiserFor` in `module-render.ts`), and that map decides where a link
 * lands by the address it returns: `/tr/` for a Turkish page, `/everyone/` for
 * a For Everyone one, both for both, and the plain route where the target has
 * no such page. So the address already says which document the mobile reader
 * should open, and reading it back here keeps the decision in one place rather
 * than restating "which modules are translated" in the bundle.
 *
 * Throws on an address that is not a module page in a track, because a link
 * the bundle cannot place would reach the reader as a dead tap.
 */
export function addressOf(route: string): { track: Track; lang: ReadingLang } {
  const first = route.split('/').filter(Boolean)[0]
  const lang: ReadingLang = TRANSLATED_LANGS.includes(first as TranslatedLang) ? (first as TranslatedLang) : 'en'
  const track = trackOfPath(route)
  if (track === null || !route.includes('/courses/')) {
    throw new Error(`address: "${route}" is not a module page in a track`)
  }
  return { track, lang }
}
