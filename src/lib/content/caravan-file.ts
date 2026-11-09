import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { z } from 'zod'
import { isMonth, monthRange, monthsBetween } from '@/lib/caravan-months'
import { CONTENT_ROOT } from './paths'

/**
 * M91, D116 — `mini-courses/caravan/`, read once and checked hard, in the manner of
 * `curriculum-file.ts`.
 *
 * **Two files, split by who writes them.** `trends.yaml` is the author's: one entry per trend, a
 * title, a span of months, one paragraph on what it was, and its links grouped the way a module's
 * References are. `strength.yaml` is the pipeline's (`.claude/skills/caravan-trends/`): how strong
 * each trend was, month by month, MEASURED from evidence, never typed. Keeping the measurement out
 * of the author's file means a quarterly run never edits a file the author writes in, and the
 * author's diff never carries 48 months of numbers. Rejected: one file holding both (an agent's
 * counts and the author's sentences in one diff, and no line between who wrote what); a markdown
 * file per trend (the author chose format 2, D116: a trend is a quick overview, and a subject that
 * deserves a page is an Emerging module).
 *
 * **`z.strictObject` throughout**, for `curriculum-file.ts`'s reason: a typo such as `strat:` must
 * fail, not be dropped. **`yaml.safeLoad`**, for the same file's reason.
 *
 * **The rules are pure functions over parsed data**, with the curriculum's module names and the
 * latest month allowed passed in, so a unit test runs every rule against made-up YAML without the
 * corpus (`tests/unit/content/caravan-file.test.ts`). Each throws `caravan/<file>: rule N, ...`
 * naming the trend at fault, because a message that does not say which entry is wrong sends the
 * reader through all of them.
 */

/** The five groups of a module's References, in their order (`mini-courses/CLAUDE.md`). */
export const LINK_KINDS = ['articles', 'videos', 'tools', 'repositories', 'modules'] as const
export type LinkKind = (typeof LINK_KINDS)[number]

const MONTH = z.string().refine(isMonth, 'a month is written YYYY-MM')
const ID = z.string().regex(/^[a-z0-9_]+$/, 'an id is lowercase, digits and underscores')

const EXTERNAL = z.strictObject({
  title: z.string().trim().min(1),
  url: z.string().regex(/^https?:\/\/\S+$/, 'a link is an absolute http(s) URL'),
})

const LINKS = z.strictObject({
  articles: z.array(EXTERNAL).default([]),
  videos: z.array(EXTERNAL).default([]),
  tools: z.array(EXTERNAL).default([]),
  repositories: z.array(EXTERNAL).default([]),
  /** By `name`, as `curriculum.yaml` lists it; the title is read from there, never restated. */
  modules: z.array(ID).default([]),
})

const RAW_TREND = z.strictObject({
  id: ID,
  title: z.string().trim().min(1),
  start: MONTH,
  /** `null` while people still call it new (D116: a trend ends when they stop). */
  end: MONTH.nullable().default(null),
  text: z.string().trim().min(1),
  links: LINKS,
})

const RAW_TRENDS_FILE = z.strictObject({
  caravan: z.literal(1),
  /** Where the road starts. The author's: the journey begins at the chatbot moment. */
  first_month: MONTH,
  trends: z.array(RAW_TREND).default([]),
})

const LEVEL = z.number().int().min(0).max(5)

const RAW_STRENGTH_FILE = z.strictObject({
  caravan_strength: z.literal(1),
  /** The version of the measuring method; changing its cut points is a new version and a re-measure. */
  method: z.number().int().min(1),
  /** The last month the run measured. A month is measured only after it has settled. */
  measured_through: MONTH,
  trends: z.record(ID, z.record(MONTH, LEVEL)).default({}),
})

export type CaravanTrend = z.infer<typeof RAW_TREND>
export type TrendsFile = z.infer<typeof RAW_TRENDS_FILE>
export type StrengthFile = z.infer<typeof RAW_STRENGTH_FILE>

export const CARAVAN_DIR = path.join(CONTENT_ROOT, 'caravan')
export const TRENDS_FILE = path.join(CARAVAN_DIR, 'trends.yaml')
export const STRENGTH_FILE = path.join(CARAVAN_DIR, 'strength.yaml')

function fail(file: string, rule: string, detail: string): never {
  throw new Error(`caravan/${file}: ${rule}\n  ${detail}`)
}

function shaped<T>(file: string, schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw)
  if (parsed.success) return parsed.data
  const detail = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid caravan/${file}:\n${detail}`)
}

export interface TrendsContext {
  /** Every module name in `curriculum.yaml`. */
  modules: ReadonlySet<string>
  /** The latest month a trend may name: the build's own month. */
  latest: string
}

/** `trends.yaml`, parsed and held to its rules. */
export function parseTrends(raw: unknown, context: TrendsContext): TrendsFile {
  const file = shaped('trends.yaml', RAW_TRENDS_FILE, raw)
  const at = 'trends.yaml'

  // ---- rule 1: every id is unique ------------------------------------------
  // The id keys the measured strength and, later, the bundle and an address, so two trends sharing
  // one would be measured, drawn and linked as one.
  const seen = new Set<string>()
  for (const trend of file.trends) {
    if (seen.has(trend.id)) fail(at, 'rule 1, every trend id must be unique', `"${trend.id}" appears twice`)
    seen.add(trend.id)
  }

  for (const trend of file.trends) {
    // ---- rule 2: the span is on the road ------------------------------------
    // Not before the road starts, not after the build's month, and never ending before it began.
    for (const [field, month] of [['start', trend.start], ['end', trend.end]] as const) {
      if (month === null) continue
      if (monthsBetween(file.first_month, month) < 0) {
        fail(at, `rule 2, a trend's ${field} may not be before first_month`, `"${trend.id}" ${field}s ${month}, before ${file.first_month}`)
      }
      if (monthsBetween(month, context.latest) < 0) {
        fail(at, `rule 2, a trend's ${field} may not be after this month`, `"${trend.id}" ${field}s ${month}, after ${context.latest}`)
      }
    }
    if (trend.end !== null && monthsBetween(trend.start, trend.end) < 0) {
      fail(at, 'rule 2, a trend may not end before it starts', `"${trend.id}" starts ${trend.start} and ends ${trend.end}`)
    }

    // ---- rule 3: the title is one line and the text is one paragraph --------
    // Format 2 holds exactly one paragraph (D116); a second one is a module's worth of writing.
    if (/\n/.test(trend.title)) fail(at, 'rule 3, a title is one line', `"${trend.id}"'s title has a line break`)
    if (/\n/.test(trend.text)) {
      fail(at, 'rule 3, the text is one paragraph, written with `>-` so YAML folds it onto one line', `"${trend.id}"'s text has a line break`)
    }

    // ---- rule 4: no em dash -------------------------------------------------
    // `mini-courses/CLAUDE.md` bans it in every language; this is the one place a trend's words
    // pass through the build, so it is where the ban can be held.
    for (const [field, value] of [['title', trend.title], ['text', trend.text]] as const) {
      if (value.includes('\u2014')) fail(at, 'rule 4, no em dash', `"${trend.id}"'s ${field} carries one`)
    }

    // ---- rule 5: it links out, and no link is listed twice ------------------
    // Every module points somewhere next (MANIFESTO rule 6), and so does every stop.
    const external = [...trend.links.articles, ...trend.links.videos, ...trend.links.tools, ...trend.links.repositories]
    if (external.length + trend.links.modules.length === 0) {
      fail(at, 'rule 5, a trend has at least one link', `"${trend.id}" has none`)
    }
    const urls = new Set<string>()
    for (const link of external) {
      if (urls.has(link.url)) fail(at, 'rule 5, a link is listed once per trend', `"${trend.id}" lists ${link.url} twice`)
      urls.add(link.url)
    }

    // ---- rule 6: every Modules link names a module ------------------------
    // Rule 3 of `curriculum-file.ts`, applied here: a name nobody listed would be a dead link.
    const named = new Set<string>()
    for (const name of trend.links.modules) {
      if (!context.modules.has(name)) {
        fail(at, 'rule 6, every modules entry must name a module in curriculum.yaml', `"${trend.id}" names "${name}", which is not a module`)
      }
      if (named.has(name)) fail(at, 'rule 6, a module is listed once per trend', `"${trend.id}" lists "${name}" twice`)
      named.add(name)
    }
  }

  return file
}

/** `strength.yaml`, parsed and held to the trends it measures. */
export function parseStrength(raw: unknown, trends: TrendsFile): StrengthFile {
  const file = shaped('strength.yaml', RAW_STRENGTH_FILE, raw)
  const at = 'strength.yaml'
  const byId = new Map(trends.trends.map((trend) => [trend.id, trend]))

  for (const [id, months] of Object.entries(file.trends)) {
    // ---- rule 1: it measures only trends that exist ------------------------
    // A measurement of nothing, like a translation of nothing, is a file somebody forgot to clean.
    const trend = byId.get(id)
    if (trend === undefined) fail(at, 'rule 1, every measured id must be a trend in trends.yaml', `"${id}" is not a trend`)

    // ---- rule 2: every month of the span is measured, and none outside it ---
    // A hole would draw the land as a cliff, and a month outside the span is strength for a trend
    // that was not on the road.
    const last = trend.end !== null && monthsBetween(trend.end, file.measured_through) >= 0 ? trend.end : file.measured_through
    const span = new Set(monthRange(trend.start, last))
    for (const month of Object.keys(months)) {
      if (!span.has(month)) fail(at, 'rule 2, a month is measured only inside its trend\'s span', `"${id}" measures ${month}, outside ${trend.start} to ${last}`)
    }
    const missing = [...span].filter((month) => !(month in months))
    if (missing.length > 0) fail(at, 'rule 2, every month of a measured span is measured', `"${id}" has no level for ${missing.join(', ')}`)
  }

  return file
}

/** Both files from disk. `strength.yaml` may be absent: then nothing has been measured yet. */
export function loadCaravanFiles(context: TrendsContext): { trends: TrendsFile; strength: StrengthFile | null } {
  const trends = parseTrends(yaml.safeLoad(fs.readFileSync(TRENDS_FILE, 'utf8')), context)
  const strength = fs.existsSync(STRENGTH_FILE)
    ? parseStrength(yaml.safeLoad(fs.readFileSync(STRENGTH_FILE, 'utf8')), trends)
    : null
  return { trends, strength }
}
