export type CategorySlug =
  | 'fundamentals' | 'intermediate' | 'expert'
  | 'ecosystem' | 'protocols' | 'optional'

/**
 * The six slugs, in the union's own order, as a value.
 *
 * The union is erased at runtime, and two things need to walk it: `CATEGORY_DIRS`
 * has to be total over it, and `curriculum.yaml` has to list its categories in
 * this order. `curriculum-file.ts` checks the second, which is what keeps the
 * first honest.
 */
export const CATEGORY_SLUGS: readonly CategorySlug[] = [
  'fundamentals', 'intermediate', 'expert', 'ecosystem', 'protocols', 'optional',
]

/**
 * The one place a category slug meets the directory its markdown lives in.
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

export interface Category {
  slug: CategorySlug
  /** Directory name under mini-courses/ */
  dir: string
  title: string
  order: number
  status: 'ready' | 'draft'
  blurb: string
}

export const CATEGORIES: readonly Category[] = [
  {
    slug: 'fundamentals', dir: '1_fundamentals', title: 'Fundamentals', order: 1,
    status: 'ready',
    blurb: 'LLMs, training, retrieval, tools, memory, and the agent loop. Start here.',
  },
  {
    slug: 'intermediate', dir: '2_intermediate', title: 'Intermediate', order: 2,
    status: 'ready',
    blurb: 'Prompting, context, coding agents, harnesses, security, and loops.',
  },
  {
    slug: 'expert', dir: '3_expert', title: 'Expert', order: 3,
    status: 'draft',
    blurb: 'Advanced architectures, memory, prompting, and deployment.',
  },
  {
    slug: 'ecosystem', dir: '4_ecosystem', title: 'Ecosystem', order: 4,
    status: 'draft',
    blurb: 'Frameworks, inference providers and engines, UI, and observability.',
  },
  {
    slug: 'protocols', dir: '5_protocols_specs', title: 'Protocols & Specs', order: 5,
    status: 'draft',
    blurb: 'One reference for every protocol and spec the series touches.',
  },
  {
    slug: 'optional', dir: '6_optional', title: 'Optional', order: 6,
    status: 'draft',
    blurb: 'Human-in-the-loop and runtime topics that round out the series.',
  },
]

export function categoryByDir(dir: string): Category | undefined {
  return CATEGORIES.find((c) => c.dir === dir)
}

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug)
}
