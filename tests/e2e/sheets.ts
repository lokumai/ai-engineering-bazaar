/**
 * The drawing set, as it actually ships.
 *
 * This list is deliberately typed out rather than imported from
 * `lib/content/`. A suite that derives its expectations from the same loader
 * the page uses can only ever prove the loader agrees with itself: renumber
 * the corpus and both sides move together and nothing goes red. Here the
 * numbers, the routes and the formats are stated, so a renumber, a slug change
 * or a stub being drawn fails a test and someone has to look at it.
 *
 * `index-sheet.spec.ts` reconciles this list against the manifest the index
 * page actually renders, which is what keeps the duplication honest.
 */

/**
 * §4.4 — the anatomy the build picks from `status`.
 *
 * Two, not three. `SHORT` is gone: it differed from `A0` in where the metadata sat
 * and nowhere else, which moved the prose 132px between two sheets of one
 * curriculum, and the last rule holding them apart put 82 characters on a line
 * where 656px was chosen for 68–72. `src/lib/content/derive.ts` carries the
 * argument beside the type.
 */
export type SheetFormat = 'A0' | 'A4'

export interface Sheet {
  /** Position in the set, 1..33. The prev/next chain walks this order. */
  module: number
  path: string
  title: string
  category: string
  format: SheetFormat
  /** `status: ready` — READY on the manifest, A0 on the sheet. */
  drawn: boolean
}

function sheet(
  module: number,
  path: string,
  title: string,
  format: SheetFormat,
): Sheet {
  return {
    module,
    path,
    title,
    category: path.split('/')[2],
    format,
    drawn: format !== 'A4',
  }
}

export const SHEETS: readonly Sheet[] = [
  sheet(1, '/courses/fundamentals/llms/', 'LLM Fundamentals', 'A0'),
  sheet(2, '/courses/fundamentals/training/', 'Training LLMs', 'A0'),
  sheet(3, '/courses/fundamentals/rag/', 'RAG & Embeddings', 'A0'),
  sheet(4, '/courses/fundamentals/tools/', 'Tool Calling', 'A0'),
  sheet(5, '/courses/fundamentals/memory/', 'Memory', 'A0'),
  sheet(6, '/courses/fundamentals/agents/', 'AI Agents', 'A0'),
  sheet(7, '/courses/fundamentals/multi-agent/', 'Multi-Agent Systems', 'A0'),
  sheet(8, '/courses/fundamentals/observability/', 'Observability', 'A0'),
  sheet(9, '/courses/intermediate/prompt-engineering/', 'Prompt Engineering', 'A0'),
  sheet(10, '/courses/intermediate/context-engineering/', 'Context Engineering', 'A0'),
  sheet(11, '/courses/intermediate/coding-agents/', 'Coding Agents: Extending Them', 'A0'),
  sheet(12, '/courses/intermediate/harness-engineering/', 'Harness Engineering', 'A0'),
  sheet(13, '/courses/intermediate/loop-engineering/', 'Loop Engineering', 'A0'),
  sheet(14, '/courses/intermediate/ui/', 'Generative UI', 'A4'),
  sheet(15, '/courses/intermediate/security/', 'Security', 'A0'),
  sheet(16, '/courses/intermediate/personal-agents/', 'Personal Agents', 'A0'),
  sheet(17, '/courses/expert/advanced-tools/', 'Advanced Tools', 'A4'),
  sheet(18, '/courses/expert/advanced-memory/', 'Advanced Memory', 'A4'),
  sheet(19, '/courses/expert/advanced-multiagent/', 'Advanced Multi-Agent', 'A4'),
  sheet(20, '/courses/expert/advanced-prompting/', 'Advanced Prompting', 'A4'),
  sheet(21, '/courses/expert/advanced-context-engineering/', 'Advanced Context Engineering', 'A4'),
  sheet(22, '/courses/expert/advanced-coding-agents/', 'Advanced Coding Agents', 'A4'),
  sheet(23, '/courses/expert/advanced-harness-engineering/', 'Advanced Harness Engineering', 'A4'),
  sheet(24, '/courses/expert/advanced-agent-architectures/', 'Advanced Agent Architectures', 'A4'),
  sheet(25, '/courses/expert/advanced-ui/', 'Advanced UI', 'A4'),
  sheet(26, '/courses/expert/advanced-deployment/', 'Advanced Deployment', 'A4'),
  sheet(27, '/courses/expert/advanced-training/', 'Advanced Training', 'A4'),
  sheet(28, '/courses/ecosystem/agent-frameworks/', 'Agent Frameworks', 'A0'),
  sheet(29, '/courses/ecosystem/inference-providers/', 'Inference Providers', 'A0'),
  sheet(30, '/courses/ecosystem/inference-engines/', 'Inference Engines', 'A0'),
  sheet(31, '/courses/ecosystem/ui-design/', 'UI Design', 'A0'),
  sheet(32, '/courses/ecosystem/choosing-tech-stack/', 'Choosing a Tech Stack', 'A4'),
  sheet(33, '/courses/protocols/protocols-reference/', 'Protocols Reference', 'A4'),
]

/**
 * §15.1 — where the flat manifest lives.
 *
 * Stated once, here, because eight spec files assert against that table and
 * before this constant existed all eight had `'/'` typed into them. The route
 * moved when `/` became the home screen, and the suite went red in 29 places
 * that were all the same fact. A second move should cost one line.
 *
 * It is NOT derived from the app's router: a suite that reads the route from the
 * code it is testing cannot notice the route changing. This is a claim about the
 * URL a reader visits, kept next to the claims about what they find there.
 */
export const INDEX_SHEET = '/sheets/'

export const SHEET_COUNT = SHEETS.length
export const DRAWN_COUNT = SHEETS.filter((s) => s.drawn).length
export const NOT_DRAWN_COUNT = SHEET_COUNT - DRAWN_COUNT

/**
 * The five level pages — the catalog opened at one level.
 *
 * **M17 moved them and the move is the point of the constant.** They were
 * `/courses/<level>/`, a second listing of the course with no filters; those
 * five addresses are forwarding stubs now and `LEVEL_STUB_PATHS` below is what
 * names them. A spec walking levels wants these.
 */
export const CATEGORY_PATHS = [
  '/sheets/fundamentals/',
  '/sheets/intermediate/',
  '/sheets/expert/',
  '/sheets/ecosystem/',
  '/sheets/protocols/',
] as const

/**
 * The same five, at the addresses they used to have — every one of which is
 * now a `MovedTo` forward. Named rather than derived, for the same reason
 * everything else in this file is: a spec that computed these from the live
 * routes could not notice one of them being deleted.
 */
export const LEVEL_STUB_PATHS = [
  '/courses/fundamentals/',
  '/courses/intermediate/',
  '/courses/expert/',
  '/courses/ecosystem/',
  '/courses/protocols/',
] as const

/**
 * How many task items the A0 exemplar's checklist carries.
 *
 * Typed out here for the same reason as everything else in this file: a spec
 * that counted the boxes on the page could not notice the author changing the
 * checklist. It moved from 8 to 5 when Security was rewritten, and the specs
 * that read it went red until somebody looked, which is the intended outcome.
 */
export const CHECKLIST_ITEMS = 5

export function sheetByModule(module: number): Sheet {
  const found = SHEETS.find((s) => s.module === module)
  if (!found) throw new Error(`no module ${module} in the set`)
  return found
}

/**
 * A sheet by the route it serves, which is the identity that survives a
 * reorder. The exemplars below used to be picked by position (`SHEETS[12]`)
 * and by number (`sheetByModule(12)`), and the September 2026 reorder moved
 * every one of them onto different content without a single test going red:
 * `A0` stopped being Security, and the widest-table sheet stopped being Loop
 * Engineering. The numbers and titles above are still typed out by hand on
 * purpose. Only the *choice* of exemplar is stated by intent.
 */
export function sheetByPath(path: string): Sheet {
  const found = SHEETS.find((s) => s.path === path)
  if (!found) throw new Error(`no module at ${path} in the set`)
  return found
}

/** One sheet of each §4.4 format, for the tests that want a representative. */
/** Security: the widest prose on the site. */
export const A0 = sheetByPath('/courses/intermediate/security/')
/**
 * A SHORT drawn sheet. It used to be the SHORT format's exemplar; it is now an A0
 * like every other drawn sheet, and the name is kept because a dozen specs use
 * it to mean "the short one with images" — which is still exactly what it is.
 */
export const SHORT = sheetByPath('/courses/fundamentals/rag/')
/** A not-drawn sheet. */
export const A4 = sheetByPath('/courses/expert/advanced-multiagent/')
