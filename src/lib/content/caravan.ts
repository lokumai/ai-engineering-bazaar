import { monthRange, monthsBetween, periodLabel } from '@/lib/caravan-months'
import { href } from '@/lib/url'
import { type LinkKind, LINK_KINDS, type StrengthFile, type TrendsFile } from './caravan-file'
import type { CurriculumModule } from './curriculum-file'
import { moduleSlugFromName } from './slugs'

/**
 * M91, D116 — what the Caravan page draws, built once from whichever source it has.
 *
 * Two sources reach this, and the page must never confuse them. **The author's files**, validated
 * by `caravan-file.ts`, once they hold a trend. **The sample** (`components/caravan/sample-trends.ts`)
 * until then: placeholder data that exists so the design can be seen, which the page labels on its
 * notice and on every trend. Both are turned into one `CaravanInput` and drawn from it, so the
 * design that is reviewed on the sample is the design the first real trend gets.
 *
 * **Strength is measured or absent, never invented here.** A real trend's strength comes from
 * `strength.yaml` (written by the pipeline), and a month it has no level for is `null`; the land and
 * the strip count a `null` as nothing. The sample brings its own placeholder strength.
 */

/** The References headings, word for word as `mini-courses/CLAUDE.md` writes them. */
export const LINK_HEADINGS: Readonly<Record<LinkKind, string>> = {
  articles: '📄 Articles',
  videos: '🎬 Videos',
  tools: '🛠️ Tools',
  repositories: '🗃️ Repositories',
  modules: '🧭 Modules',
}

/** One link as drawn. `href` is null for a sample link, which names no real page. */
export interface CaravanLink {
  title: string
  href: string | null
}

export interface CaravanGroup {
  kind: LinkKind
  heading: string
  links: CaravanLink[]
}

export interface CaravanInputTrend {
  id: string
  title: string
  start: string
  end: string | null
  text: string
  groups: Partial<Record<LinkKind, CaravanLink[]>>
  /** Month to level, 0 to 5, or null when nothing measured it. */
  strength: Readonly<Record<string, number>> | null
}

export interface CaravanInput {
  sample: boolean
  firstMonth: string
  /** The last month the road reaches, before it is stretched to cover every trend. */
  through: string
  trends: CaravanInputTrend[]
}

export interface CaravanTrendView {
  id: string
  title: string
  start: string
  end: string | null
  period: string
  text: string
  groups: CaravanGroup[]
  /** Index of the first and last month on the road. An open trend runs to the road's end. */
  si: number
  ei: number
  /** Its level for each month of `si..ei`, null where unmeasured. */
  strength: (number | null)[]
  /** Its highest measured level, or null when no month was measured. */
  peak: number | null
}

export interface CaravanView {
  sample: boolean
  months: string[]
  trends: CaravanTrendView[]
  /** Per month, the summed level of every trend on the road. */
  totals: number[]
  /** True when at least one month of one trend carries a level. */
  measured: boolean
}

/**
 * D120 — whether the page draws the sample: no trend has been written yet. The page
 * chooses its input with this and the sitemap and the page's `robots` ask it too, so
 * the page becomes indexable the day the first real trend lands, with nothing to
 * remember to change.
 */
export function showsSample(trends: TrendsFile): boolean {
  return trends.trends.length === 0
}

export function caravanView(input: CaravanInput): CaravanView {
  let last = input.through
  for (const trend of input.trends) {
    for (const month of [trend.start, trend.end]) {
      if (month !== null && monthsBetween(last, month) > 0) last = month
    }
  }
  const months = monthRange(input.firstMonth, last)
  const index = (month: string) => monthsBetween(input.firstMonth, month)

  const trends = input.trends
    .map((trend): CaravanTrendView => {
      const si = index(trend.start)
      const ei = trend.end === null ? months.length - 1 : index(trend.end)
      const strength = months.slice(si, ei + 1).map((month) => trend.strength?.[month] ?? null)
      const levels = strength.filter((level): level is number => level !== null)
      return {
        id: trend.id,
        title: trend.title,
        start: trend.start,
        end: trend.end,
        period: periodLabel(trend.start, trend.end),
        text: trend.text,
        groups: LINK_KINDS.flatMap((kind) => {
          const links = trend.groups[kind] ?? []
          return links.length === 0 ? [] : [{ kind, heading: LINK_HEADINGS[kind], links }]
        }),
        si,
        ei,
        strength,
        peak: levels.length === 0 ? null : Math.max(...levels),
      }
    })
    // In time order; at one start, the longer first, then by id so two builds agree.
    .sort((a, b) => a.si - b.si || b.ei - a.ei || a.id.localeCompare(b.id))

  const totals = months.map(() => 0)
  let measured = false
  for (const trend of trends) {
    trend.strength.forEach((level, k) => {
      if (level === null) return
      measured = true
      totals[trend.si + k] += level
    })
  }

  return { sample: input.sample, months, trends, totals, measured }
}

/** A module's page and title, read from the curriculum; never restated. */
export function moduleLink(module: CurriculumModule): CaravanLink {
  return { title: module.title, href: href(`/courses/${module.category}/${moduleSlugFromName(module.name)}/`) }
}

/**
 * The author's files as page input. The road runs to the last measured month, or, before anything
 * is measured, to `latest` (the build's month), so an open trend is drawn as still on the road.
 */
export function inputFromFiles(
  trends: TrendsFile,
  strength: StrengthFile | null,
  modules: ReadonlyMap<string, CurriculumModule>,
  latest: string,
): CaravanInput {
  const external = (links: { title: string; url: string }[]) => links.map(({ title, url }) => ({ title, href: url }))
  return {
    sample: false,
    firstMonth: trends.first_month,
    through: strength?.measured_through ?? latest,
    trends: trends.trends.map((trend) => ({
      id: trend.id,
      title: trend.title,
      start: trend.start,
      end: trend.end,
      text: trend.text,
      groups: {
        articles: external(trend.links.articles),
        videos: external(trend.links.videos),
        tools: external(trend.links.tools),
        repositories: external(trend.links.repositories),
        // `parseTrends` rule 6 has already refused a name that is not a module.
        modules: trend.links.modules.map((name) => moduleLink(modules.get(name) as CurriculumModule)),
      },
      strength: strength?.trends[trend.id] ?? null,
    })),
  }
}
