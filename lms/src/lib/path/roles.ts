/**
 * §13.3 — the nine roles, and the mark each one is offered.
 *
 * The ids are frozen. They are written into the reader's record, they are
 * stamped on `<html>` as `hl-role-<id>` for channel A to draw from, and they
 * key `PATHS` in `./paths.ts` — so renaming one silently orphans a stored
 * record, which is the same reason §12.1.3 keys sheets by slug and not by
 * module number.
 *
 * **A role is never inferred.** Not from the name, not from which sheets have
 * been signed off, not from anything. There is no function in this directory
 * that takes a `RecordData` and returns a `RoleId`, and that absence is the
 * enforcement: printing back a job title the reader never typed is exactly the
 * class of claim §1 forbids.
 *
 * `suggestedMark` is an OFFER (§13.6). Choosing a role for the first time with
 * no mark set prefills the picker with it; it is never written without the
 * reader confirming, and it is always changeable. The drafting symbol is chosen
 * because it means something about the work, which is why `markRationale` is
 * shipped as real text rather than left as a comment — the reader can read why.
 *
 * **No role suggests `seeded`, and two of them used to.** §12.1.3 stores the
 * seeded pattern as `mark: null`, which is the same value as "nothing chosen" —
 * so confirming that offer wrote no observable change and the offer came back on
 * the next load, every time. There are eight glyphs and nine roles, so two
 * marks are shared instead: `datum` by the DBA and the Business Analyst, who
 * both work from a fixed reference, and `lokum` by the Project Manager and the
 * Pre-Sales Engineer, who both stand for the product rather than a technique.
 * A shared default is harmless — it is an offer, not an identity — and it is
 * strictly better than an offer that cannot be accepted.
 *
 * This module imports nothing (§12.2's import direction): a client island holds
 * it, so a single value reaching in from `lib/content/` would pull `node:fs`
 * into the browser bundle and stop the build.
 */

export type RoleId =
  | 'software-engineer'
  | 'devops'
  | 'data-engineer'
  | 'data-analyst'
  | 'analyst'
  | 'qa'
  | 'project-manager'
  | 'dba'
  | 'pre-sales'

export interface Role {
  id: RoleId
  /** Title case, as a person would write it on a form. */
  label: string
  /** §13.4.1 — one line naming what this path prepares the reader to do. */
  blurb: string
  /** Where the bulk of this role's core sheets sit. Drives nothing; it is a fact. */
  homeCategory: string
  /** §13.6 — prefilled, never written silently. Ids from `lib/identity/mark.ts`. */
  suggestedMark: string
  /** Why that symbol, in the reader's own words. */
  markRationale: string
}

/** §13.3's order, frozen. The picker renders them in exactly this sequence. */
export const ROLES: readonly Role[] = [
  {
    id: 'software-engineer',
    label: 'Software Engineer',
    blurb:
      'From the agent loop to the harness around it: running coding agents on a real repo, extending them, and verifying their output',
    homeCategory: 'intermediate',
    suggestedMark: 'weld',
    markRationale:
      'The fillet weld symbol of ISO 2553 — the mark for joining two things so the joint carries load.',
  },
  {
    id: 'devops',
    label: 'DevOps Engineer',
    blurb:
      'A path through agent harnesses, sandboxes, CI gates and the running cost of unattended agents',
    homeCategory: 'intermediate',
    suggestedMark: 'centre',
    markRationale:
      'The chain-dot centre line ISO 128 draws through a round feature — the axis a system turns on.',
  },
  {
    id: 'data-engineer',
    label: 'Data Engineer',
    blurb:
      'A route through embeddings and vector stores, then the verifier gates and controls agents need before they touch your data systems',
    homeCategory: 'fundamentals',
    suggestedMark: 'section',
    markRationale:
      'The cutting-plane arrows: the direction a section is viewed from, which is what a pipeline does to a store.',
  },
  {
    id: 'data-analyst',
    label: 'Data Analyst',
    blurb:
      'Grounding a model in real tables, wiring it to query tools, and checking the answers it hands back',
    homeCategory: 'fundamentals',
    suggestedMark: 'hex',
    markRationale:
      'The LKM-01 face: the isometric cube seen as a hexagon.',
  },
  {
    id: 'analyst',
    label: 'Business Analyst',
    blurb:
      'The vocabulary, the limits a model cannot be promised past, and the points where a person still signs off',
    homeCategory: 'fundamentals',
    suggestedMark: 'datum',
    markRationale:
      'A circled cross: the datum point every other dimension is measured from.',
  },
  {
    id: 'qa',
    label: 'QA Engineer',
    blurb:
      'A path through determinism knobs, named failure modes, guardrail seams, adversarial probes and rubric evals for agent systems',
    homeCategory: 'intermediate',
    suggestedMark: 'finish',
    markRationale:
      'The machined-surface texture symbol of ISO 1302 — the mark that says a surface was inspected.',
  },
  {
    id: 'project-manager',
    label: 'Project Manager',
    blurb:
      'Scope agent work against real cost figures, an autonomy ladder, and a verifier ladder for reviewing output',
    homeCategory: 'intermediate',
    suggestedMark: 'lokum',
    markRationale:
      'Three stacked cubes: the product’s own mark.',
  },
  {
    id: 'dba',
    label: 'Database Administrator',
    blurb:
      'What an agent holding database credentials can reach, the stores it may point at, and the permissions and audit behind granting it',
    homeCategory: 'intermediate',
    suggestedMark: 'datum',
    markRationale:
      'A circled cross: the datum point every other dimension is measured from.',
  },
  {
    id: 'pre-sales',
    label: 'Pre-Sales Engineer',
    blurb:
      'Breadth across the agent landscape, honest limits to quote in a demo, and the security answer a customer asks for',
    homeCategory: 'fundamentals',
    suggestedMark: 'lokum',
    markRationale:
      'Three stacked cubes: the product’s own mark.',
  },
]

export const ROLE_IDS: readonly RoleId[] = ROLES.map((role) => role.id)

/** `undefined` for anything this code did not write — a stored role is untrusted input. */
export function roleById(id: string | null): Role | undefined {
  if (id === null) return undefined
  return ROLES.find((role) => role.id === id)
}
