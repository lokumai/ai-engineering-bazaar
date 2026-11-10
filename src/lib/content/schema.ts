import { z } from 'zod'
import type { CategorySlug } from './categories'

/**
 * The frontmatter split in two.
 *
 * **What the curriculum owns** is in `mini-courses/curriculum.yaml`: the
 * module's name, its title, its status, its minutes, its prerequisites, and,
 * through its position in that file, its number. Six fields that describe where
 * a module sits in the course, and a course is a shape, not a property of any
 * one markdown file.
 *
 * **What the file owns** is what could not be written anywhere else: the sheet's
 * own `summary` and its `objectives`. `sheetFrontmatterSchema` below is those
 * two and nothing more.
 *
 * `ModuleFrontmatter` is the two merged, and it is deliberately the shape that
 * existed before the split, field for field. Thirteen readers of
 * `frontmatter.module` and seven of `frontmatter.title` compile unchanged; the
 * config moved and the app's vocabulary did not.
 */

// Strict, now the corpus pass has deleted the six fields the yaml owns. A file
// that declares its own `module` or `status` again fails the build by name,
// which is the point: two sources for one fact is what this migration removed.
const sheetFrontmatterSchema = z.strictObject({
  summary: z.string().min(1).nullable().default(null),
  objectives: z.array(z.string().min(1)).default([]),
})

export type SheetFrontmatter = z.infer<typeof sheetFrontmatterSchema>

/** The merged shape the whole app reads. */
export interface ModuleFrontmatter {
  /** The module's position in the curriculum, 1-based. */
  module: number
  title: string
  category: CategorySlug
  status: 'ready' | 'draft'
  /** Minutes, as `curriculum.yaml` declares them. */
  duration: number
  summary: string | null
  objectives: string[]
  /** The prerequisites' numbers, resolved from the yaml's names. */
  prerequisites: number[]
}

/**
 * The file's own two fields.
 *
 * `status` is passed in rather than read, because the file no longer declares
 * it. The two rules below are about the sheet and belong here, but both are
 * conditional on a status the curriculum owns, so the caller supplies it and
 * omitting it is a compile error. The third rule that used to sit beside them
 * (a ready module needs a duration above zero) is now the yaml's rule 5,
 * checked where the duration is declared.
 */
export function parseFrontmatter(
  raw: unknown,
  source: string,
  status: 'ready' | 'draft',
): SheetFrontmatter {
  const result = sheetFrontmatterSchema.safeParse(raw)
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid frontmatter in ${source}:\n${detail}`)
  }

  const data = result.data
  if (status === 'ready' && data.summary === null) {
    throw new Error(`Invalid frontmatter in ${source}:\n  summary: a ready module needs a summary`)
  }
  if (status === 'ready' && data.objectives.length < 2) {
    throw new Error(
      `Invalid frontmatter in ${source}:\n  objectives: a ready module needs at least two objectives`,
    )
  }
  return data
}

/**
 * The frontmatter a translation file (`_tr.md`, `_fa.md`, in either
 * track) may carry: `objectives`, translated, and nothing else.
 *
 * **Only `objectives`, and why.** The objectives card is content and a Turkish
 * or Persian reader should read it in their language (D113: content is
 * multilingual, the interface is not). `summary` stays out: it feeds the English
 * catalog, which is the interface. `module`, `status` and the rest are the
 * yaml's, as they are for the English file, so naming any of them here fails
 * the build by name rather than becoming a second copy of a fact.
 *
 * **Same count, same order as the English.** An objective is not a free list: a
 * reader switching language is shown the same promises, so a translation with a
 * different number of them is a translation that dropped or invented one. The
 * count is compared with the English file's own list (already validated), and a
 * mismatch names the file and both counts.
 *
 * **Absent is a valid answer.** A file with no block, or a block with no keys
 * at all (`{}`), returns `null` and the page falls back to the English list, marked `lang="en"`
 * (M19). Rejected: requiring the block, which would fail the build for every
 * translation written before this rule. A block that names `objectives` and
 * leaves it empty (`objectives: []`) is not absent: it throws.
 */
const translationFrontmatterSchema = z.strictObject({
  objectives: z.array(z.string().min(1)).min(1),
})

export function parseTranslationFrontmatter(
  raw: unknown,
  source: string,
  english: readonly string[],
): string[] | null {
  const data = (raw ?? {}) as Record<string, unknown>
  const keys = Object.keys(data)
  if (keys.length === 0) return null

  const extra = keys.filter((key) => key !== 'objectives')
  if (extra.length > 0) {
    throw new Error(
      `Invalid frontmatter in ${source}:\n  ${extra.join(', ')}: a translation's frontmatter holds `
      + '`objectives` only (the summary feeds the English catalog, and the yaml owns the rest)',
    )
  }

  const result = translationFrontmatterSchema.safeParse(data)
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid frontmatter in ${source}:\n${detail}`)
  }

  const objectives = result.data.objectives
  if (objectives.length !== english.length) {
    throw new Error(
      `Invalid frontmatter in ${source}:\n  objectives: has ${objectives.length}, `
      + `the English file has ${english.length}; a translation keeps the same objectives in the same order`,
    )
  }
  return objectives
}
