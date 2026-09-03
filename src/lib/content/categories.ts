/**
 * The two facts about a category that are the app's rather than the course's.
 *
 * Everything else a category has (its title, its blurb, its status, and the
 * modules in it, in order) lives in `mini-courses/curriculum.yaml` and reaches
 * the app through `curriculum-file.ts`. What stayed here is the union, which
 * the app's types and hues are keyed on, and the directory each category's
 * markdown sits in, which is a fact about the repository layout.
 *
 * **This module imports nothing, and it has to stay that way.** Four components
 * and the shell's route labels take `CategorySlug` from it. `curriculum-file.ts`
 * reaches `node:fs`, so a value imported from there into a client island pulls
 * the file system into the browser bundle and stops the build (§12.2).
 */

export type CategorySlug =
  | 'fundamentals' | 'intermediate' | 'expert'
  | 'ecosystem' | 'protocols' | 'optional'

/**
 * The six slugs, in the union's own order, as a value.
 *
 * The union is erased at runtime, and two things need to walk it: `CATEGORY_DIRS`
 * has to be total over it, and `curriculum.yaml` has to list its categories in
 * this order. `curriculum-file.ts`'s rule 1 checks the second, which is what
 * keeps the first honest.
 */
export const CATEGORY_SLUGS: readonly CategorySlug[] = [
  'fundamentals', 'intermediate', 'expert', 'ecosystem', 'protocols', 'optional',
]

/**
 * The one place a category slug meets the directory its markdown sits in.
 *
 * Total over `CategorySlug` by type, so adding a seventh category without a
 * directory is a compile error rather than a category whose sheets never load.
 */
export const CATEGORY_DIRS: Readonly<Record<CategorySlug, string>> = {
  fundamentals: '1_fundamentals',
  intermediate: '2_intermediate',
  expert: '3_expert',
  ecosystem: '4_ecosystem',
  protocols: '5_protocols_specs',
  optional: '6_optional',
}
