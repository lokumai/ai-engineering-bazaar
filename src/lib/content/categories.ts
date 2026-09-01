export type CategorySlug =
  | 'fundamentals' | 'intermediate' | 'expert'
  | 'ecosystem' | 'protocols' | 'optional'

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
