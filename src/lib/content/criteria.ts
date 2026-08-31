import { loadModule } from './loader'

/**
 * §12.4.1 / §12.12.4 — what signing off a sheet means, in the sheet's own
 * words plus one sentence of the site's.
 *
 * §12.4.1 puts the `SIGN OFF` control "next to the stated criteria for signing
 * off", and §12.12.4 makes the reviewer's first instruction "read the criteria
 * for each sheet" — so the same text has to be available to the sheet and to
 * the exported record document. It is derived, not written: the criteria are the
 * `objectives` the frontmatter already declares, handed on verbatim. Anything
 * else would be a second description of the sheet, drifting from the first
 * (§11.25), and the reader would have no way to tell which one the sign-off
 * actually referred to.
 *
 * Like `facts.ts`, this reaches the loader and therefore `node:fs`: it runs at
 * build time and its output travels to the browser as serialised props, never
 * by import (§12.2).
 *
 * A draft sheet declares no objectives and gets none. §12.4.1 gives it no
 * sign-off control at all — absent, not disabled — so the empty list is the
 * whole truth about a sheet nobody has drawn, and inventing criteria for one
 * would be describing geometry that does not exist.
 */

/**
 * The one sentence this module authors, in the §12.14.1 register.
 *
 * It has three jobs and no fourth. It names the asserting party, because
 * §12.4.1's whole claim to honesty is that the learner is the one asserting.
 * It states that nobody else assesses it, because §12.4.2 has completion data
 * and self-report data and no third thing derived from them. And it names the
 * undo, because §12.4.1 refuses a confirmation dialog on the grounds that
 * un-signing *is* the undo — which is only true if the reader is told so.
 *
 * Exported as a constant because it is reprinted inside the exported record
 * document (§12.12.4), where it becomes text an employer reads: no exclamation
 * mark, no praise, no "please", nothing §12.12.1 forbids the document from
 * claiming, and no sentence spoken as if the site were a person.
 */
export const SIGN_OFF_ASSERTION =
  'Signing off is your own assertion that you have read this sheet and '
  + 'consider these objectives met. Nobody else assesses it, and you can '
  + 'un-sign it at any time.'

export interface SignOffCriteria {
  /** The sheet's declared `objectives`, verbatim. Empty on an undrawn sheet. */
  objectives: readonly string[]
  /** `SIGN_OFF_ASSERTION` — the same sentence on every sheet. */
  assertion: string
}

/**
 * The criteria for one sheet, by slug (§12.1.3 — never by module number).
 *
 * The objectives are copied out of the frontmatter rather than aliased: the
 * loader caches every `CourseModule` for the life of the build, so handing a
 * caller the live array would let one page's edit change what every other page
 * prints.
 */
export function signOffCriteria(slug: string): SignOffCriteria {
  return {
    objectives: [...(loadModule(slug)?.frontmatter.objectives ?? [])],
    assertion: SIGN_OFF_ASSERTION,
  }
}
