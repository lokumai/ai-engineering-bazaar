/**
 * Text helpers with no dependencies of their own.
 *
 * A leaf module on purpose: components on both sides of the server/client
 * boundary need these, and everything in `lib/content/` reads the file system.
 */

/**
 * The em dash a readout prints where there is no value to print.
 *
 * One exported constant because three modules had grown a private copy of it —
 * `lib/content/manifest.ts`, `lib/content/title-block.ts` and the home screen's
 * resume block — and two of those reach `node:fs`, so a component could not
 * import from them and copied the glyph instead. Three copies of one glyph is
 * three chances to ship a hyphen, an en dash or `--` on one surface out of
 * three, and the difference is invisible in review.
 *
 * It is an em dash and not `0`: a sheet nobody has drawn has no count, and
 * printing zero would state a measurement where none was taken (§11.25).
 *
 * Those three take it from here, and no more than those three. **This constant
 * is not yet the glyph's only author site-wide** — eight further modules still
 * write it inline, across `lib/record/`, `app/dashboard/` and the `record`,
 * `team` and `path` component sets. They predate this constant and converting
 * them is not this phase's work.
 *
 * That count is the whole of what this note claims, deliberately: the earlier
 * version named three files as though the list were complete, and it was short
 * by five — including the two that a reviewer then read as covered. A list of
 * call sites in a comment rots on the first move; the set is one command,
 * `grep -rl "'—'" src/`, and that is the authority.
 */
export const NOT_MEASURED = '—'

/**
 * `1 SHEET`, `9 SHEETS`. Protocols & Specs is a subsystem of one, and a design
 * whose whole claim is that its numbers are measured cannot print `1 SHEETS`.
 */
export function plural(n: number, singular: string, many = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : many}`
}
