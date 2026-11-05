import { describe, expect, it } from 'vitest'
import { TRANSLATED_LANGS, type ReadingLang } from '@/lib/content/languages'
import { unfenced } from '@/lib/content/lines'
import { loadAllModules } from '@/lib/content/loader'

/**
 * M45: a References list that is grouped is grouped by the five kinds, in one
 * order, under one spelling per language.
 *
 * The author's decision (mini-courses/CLAUDE.md, "Writing rules"): small groups
 * under `###` inside the references section, each present only when it has an
 * item. A heading nobody matches is invisible to every other tool here, so the
 * rule is stated once over all three languages and over any content.
 *
 * It holds for any content. It never says which modules are grouped, how many
 * items a group has, or which link belongs in which kind: it only says that a
 * `###` under References is one of the language's five headings, that the order
 * is the fixed one, that none repeats and that none is empty. A section with no
 * `###` at all passes, because grouping is the author's choice per list.
 */

/** The five kinds, in the order they appear. The Persian "Repository‌ها" holds a U+200C. */
const KINDS: Record<ReadingLang, readonly string[]> = {
  en: ['📄 Articles', '🎬 Videos', '🛠️ Tools', '🗃️ Repositories', '🧭 Modules'],
  tr: ['📄 Makaleler', '🎬 Videolar', '🛠️ Araçlar', '🗃️ Repolar', '🧭 Modüller'],
  fa: ['📄 مقاله‌ها', '🎬 ویدیوها', '🛠️ ابزارها', '🗃️ Repository‌ها', '🧭 ماژول‌ها'],
}

const REFERENCES_HEADING: Record<ReadingLang, string> = {
  en: 'References',
  tr: 'Kaynaklar',
  fa: 'منابع',
}

const H2 = /^##[ \t]+(.+?)[ \t]*$/
const H3 = /^###[ \t]+(.+?)[ \t]*$/

/** The lines of the references section, or null when the file has none. */
function referencesSection(markdown: string, lang: ReadingLang): string[] | null {
  const lines = unfenced(markdown)
  const start = lines.findIndex((line) => H2.exec(line)?.[1]?.trim() === REFERENCES_HEADING[lang])
  if (start === -1) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => H2.test(line))
  return end === -1 ? rest : rest.slice(0, end)
}

/** Each `###` in the section, with the lines that belong to it. */
function groupsOf(section: string[]): { heading: string; body: string[] }[] {
  const groups: { heading: string; body: string[] }[] = []
  for (const line of section) {
    const heading = H3.exec(line)?.[1]?.trim()
    if (heading !== undefined) groups.push({ heading, body: [] })
    else groups.at(-1)?.body.push(line)
  }
  return groups
}

const modules = loadAllModules()

const bodies = modules.flatMap((module) => [
  { name: `${module.slug} (en)`, lang: 'en' as ReadingLang, markdown: module.body },
  ...TRANSLATED_LANGS.flatMap((lang) => {
    const markdown = module.translations[lang]
    return markdown === null ? [] : [{ name: `${module.slug} (${lang})`, lang: lang as ReadingLang, markdown }]
  }),
])

describe('a grouped References list', () => {
  const sections = bodies.flatMap((body) => {
    const section = referencesSection(body.markdown, body.lang)
    return section === null ? [] : [{ ...body, section }]
  })

  it('has something to check: modules carry a References section, grouped or not', () => {
    expect(sections.length).toBeGreaterThan(0)
  })

  it('uses only its language\'s five headings', () => {
    const offenders = sections.flatMap(({ name, lang, section }) =>
      groupsOf(section)
        .filter((group) => !KINDS[lang].includes(group.heading))
        .map((group) => `${name}: "${group.heading}"`))
    expect(offenders).toEqual([])
  })

  it('keeps the five in the fixed order', () => {
    const offenders = sections.flatMap(({ name, lang, section }) => {
      const positions = groupsOf(section)
        .map((group) => KINDS[lang].indexOf(group.heading))
        .filter((position) => position !== -1)
      const ordered = positions.every((position, i) => i === 0 || position > positions[i - 1]!)
      return ordered ? [] : [name]
    })
    expect(offenders).toEqual([])
  })

  it('repeats no heading', () => {
    const offenders = sections.flatMap(({ name, section }) => {
      const seen = groupsOf(section).map((group) => group.heading)
      return seen.length === new Set(seen).size ? [] : [name]
    })
    expect(offenders).toEqual([])
  })

  it('leaves no group empty', () => {
    const offenders = sections.flatMap(({ name, section }) =>
      groupsOf(section)
        .filter((group) => !group.body.some((line) => line.trim() !== ''))
        .map((group) => `${name}: "${group.heading}"`))
    expect(offenders).toEqual([])
  })
})
