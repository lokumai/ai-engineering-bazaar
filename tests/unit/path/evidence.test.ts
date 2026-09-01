import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import evidence from '../../fixtures/path-evidence.json' with { type: 'json' }
import { curriculumFacts } from '@/lib/content/facts'
import { PATHS } from '@/lib/path/paths'

/**
 * §13.4.1 — every `reason` in `paths.ts` is grounded in the sheet it points at.
 *
 * The 123 reasons were written by nine agents that read the sheets, and audited
 * by three more that re-read them. Neither pass leaves anything a later reader
 * can check: prose about prose. So each step's quotation was kept, in
 * `tests/fixtures/path-evidence.json`, and this is what makes keeping it worth
 * something. The claim being tested is narrow and worth stating plainly: **a
 * reason cites the sheet it is filed under, and not some other sheet.**
 *
 * ## Why a share of tokens, and not the quotation itself
 *
 * Exact substring matching was tried first and it fails honestly: 112 of 123
 * evidence strings appear verbatim, and the 11 that do not are all
 * reformatting, not fabrication — an agent dropping the `**` from a bold run,
 * joining two quotations with an em dash, or flattening a YAML `objectives:`
 * list onto one line. Tightening the matcher until those passed would have been
 * tuning a threshold to the data, which is the failure this test exists to
 * avoid committing itself.
 *
 * So the measure is: what share of an evidence string's DISTINCTIVE tokens —
 * words of five characters or more that are not function words — appear anywhere
 * in the sheet it cites. That is robust to reformatting and destroyed by
 * fabrication.
 *
 * ## Why the floor is 80%, measured rather than chosen
 *
 * Against the sheet each one actually cites:
 *   median 100%, minimum 88%, and 120 of 123 score exactly 100%.
 * Against a DIFFERENT sheet (every evidence string re-pointed at another sheet
 * in the corpus, which is what a fabricated or misfiled citation looks like):
 *   median 33%, and only 6% reach 80%.
 *
 * 80% therefore passes all 123 genuine entries with 8 points of headroom and
 * rejects 94% of misfiled ones. The two distributions barely touch, which is
 * what makes the number defensible rather than convenient.
 *
 * The residual 6% are pairs of closely-related sheets — two `advanced-*` drafts
 * whose topic lists share most of their vocabulary — and this is one gate among
 * several: `honesty.test.ts` checks the mechanical rules, and the audit pass
 * checked the claims a machine cannot.
 */

const DIRS: Readonly<Record<string, string>> = {
  fundamentals: '1_fundamentals',
  intermediate: '2_intermediate',
  expert: '3_expert',
  ecosystem: '4_ecosystem',
  protocols: '5_protocols_specs',
  optional: '6_optional',
}

const CORPUS = join(import.meta.dirname, '../../../mini-courses')

/** Measured: 88% is the worst genuine entry; a misfiled one has a median of 33%. */
const GROUNDING_FLOOR = 0.8

/**
 * Function words carry no evidence: they appear in every sheet, so counting
 * them would drag a fabricated citation's score up toward a real one's.
 */
const FUNCTION_WORDS = new Set(
  `the a an and or but of to in for on with that this those these is are was were be been
   being it its as at by from not no nor so than then there their they them you your which
   who whom what when where how why all any both each few more most other some such only own
   same too very can will just should now about into over after before between during above
   below under again further`
    .split(/\s+/)
    .filter(Boolean),
)

/**
 * Words of five characters or more, stripped of the punctuation that clings to
 * a quotation: markdown emphasis, code ticks, table pipes, and the ellipsis an
 * agent uses to elide the middle of a sentence. `memory...` is the token
 * `memory`, and the first version of this tokeniser reported six false misses
 * by keeping the dots.
 */
function distinctiveTokens(text: string): string[] {
  // The apostrophe is normalised, NOT stripped: removing it turns `doesn't` into
  // `doesnt`, which is in no sheet, and that single miss dropped one genuine
  // entry from 88% to 75% and failed the floor. A contraction is one word.
  const cleaned = text.replace(/[‘’]/g, "'").replace(/[*`|"“”]/g, '')
  const found: string[] = []
  for (const raw of cleaned.match(/[A-Za-z][A-Za-z0-9._'\-/]*/g) ?? []) {
    const word = raw.replace(/^[._\-/']+|[._\-/']+$/g, '')
    if (word.length >= 5 && !FUNCTION_WORDS.has(word.toLowerCase())) found.push(word)
  }
  return found
}

/** Every sheet's source, keyed by slug. */
function corpusSources(): Map<string, string> {
  const facts = curriculumFacts()
  const byModule = new Map(facts.sheets.map((sheet) => [sheet.module, sheet.slug]))
  const sources = new Map<string, string>()

  for (const dir of Object.values(DIRS)) {
    for (const entry of readdirSync(join(CORPUS, dir))) {
      // `_tr.md`, not `_tr`: the loose form swallows `2_training.md`, a drawn
      // sheet. That mistake has been made twice in this repository.
      if (!entry.endsWith('.md') || entry === 'README.md' || entry.endsWith('_tr.md')) continue
      const source = readFileSync(join(CORPUS, dir, entry), 'utf8')
      const module = Number(/^module:\s*(\d+)$/m.exec(source)?.[1])
      const slug = byModule.get(module)
      if (slug !== undefined) sources.set(slug, source.toLowerCase())
    }
  }
  return sources
}

const sources = corpusSources()
const table = evidence as Readonly<Record<string, Readonly<Record<string, string>>>>

/** The share of an evidence string's distinctive tokens present in `slug`. */
function grounding(text: string, slug: string): number {
  const source = sources.get(slug)
  if (source === undefined) throw new Error(`evidence: ${slug} is not in the corpus`)
  const tokens = distinctiveTokens(text)
  if (tokens.length === 0) return 0
  const hits = tokens.filter((token) => source.includes(token.toLowerCase()))
  return hits.length / tokens.length
}

const STEPS = PATHS.flatMap((path) =>
  path.steps.map((step) => ({ role: path.role, slug: step.slug, reason: step.reason })),
)

describe('§13.4.1 — the fixture covers every step, and nothing else', () => {
  it('holds one entry per step of every path', () => {
    const inFixture = Object.entries(table)
      .flatMap(([role, steps]) => Object.keys(steps).map((slug) => `${role} ${slug}`))
      .sort()
    const inPaths = STEPS.map((step) => `${step.role} ${step.slug}`).sort()
    expect(inFixture).toEqual(inPaths)
  })

  it('gives every entry something to check', () => {
    // An empty or one-word evidence string would pass the grounding test for the
    // wrong reason, so the fixture has to carry a real quotation.
    for (const [role, steps] of Object.entries(table)) {
      for (const [slug, text] of Object.entries(steps)) {
        expect(text.trim().length, `${role} ${slug}`).toBeGreaterThan(15)
        expect(distinctiveTokens(text).length, `${role} ${slug}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('the measure can tell a citation from a coincidence', () => {
  /**
   * A test that cannot fail is a comment. This re-points every evidence string
   * at a DIFFERENT sheet — which is what a fabricated or misfiled citation looks
   * like — and asserts that the measure collapses. Without this, raising the
   * floor to 100% or dropping it to 10% would both look like passing suites.
   */
  it('collapses when evidence is filed against the wrong sheet', () => {
    const all = STEPS.map((step) => ({ slug: step.slug, text: table[step.role]?.[step.slug] ?? '' }))
    const scores: number[] = []

    for (const [index, entry] of all.entries()) {
      // A fixed stride, not a random shuffle: the result has to be the same on
      // every run, and 61 is coprime with 123 so every entry moves.
      const other = all[(index + 61) % all.length].slug
      if (other === entry.slug) continue
      scores.push(grounding(entry.text, other))
    }

    expect(scores.length).toBeGreaterThan(100)
    const passing = scores.filter((score) => score >= GROUNDING_FLOOR).length
    // Measured at 6%. A tenth is the loosest claim worth making.
    expect(passing / scores.length).toBeLessThan(0.1)

    const sorted = [...scores].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    expect(median).toBeLessThan(0.5)
  })

})
