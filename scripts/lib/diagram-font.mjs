/**
 * The one definition of the face every bundle diagram is drawn in, read by
 * `src/lib/bundle/diagrams.ts` (which hashes it into the draft index), by the
 * finaliser (which loads it into Chromium) and by the checker.
 *
 * One pinned full TTF, `vazirmatn@33.0.3` as an exact devDependency (spec
 * 2.9.3): the default face covers Latin as well as Persian, so one font draws
 * every language's labels and the diagram's measurements never depend on a
 * system fallback. The path is relative to the repository root, where npm,
 * next and the scripts all run.
 *
 * Plain `.mjs` with no imports, so the scripts can load it without the
 * TypeScript toolchain and `src/` can import it without restating it.
 */

/** @type {{ readonly family: 'Vazirmatn'; readonly file: string }} */
export const DIAGRAM_FONT = Object.freeze({
  family: 'Vazirmatn',
  file: 'node_modules/vazirmatn/fonts/ttf/Vazirmatn-Regular.ttf',
})
