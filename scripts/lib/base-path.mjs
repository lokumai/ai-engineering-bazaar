/**
 * The base path an export was built with, measured from the export, defined
 * once and imported by `scripts/check-links-out.mjs` (every link must carry it)
 * and `scripts/check-bundle-out.mjs` (no bundle file may carry it).
 *
 * **Measured, not read from `next.config.ts` or the environment.**
 * `SITE_BASE_PATH` is set for the duration of one build command; by the time a
 * checker runs it is usually gone from the environment, and a checker that
 * silently assumed `''` would pass a Pages build whose every link is wrong.
 * Every export carries `/_next/` asset URLs, and whatever sits in front of that
 * segment IS the base path the build used. `SITE_BASE_PATH` in the environment
 * still overrides, for the case of an export with no assets.
 *
 * Moved here from `check-links-out.mjs` unchanged, so the two checkers cannot
 * disagree about which build they are looking at.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Every `.html` file under `dir`, in directory order.
 *
 * @param {string} dir
 * @returns {string[]}
 */
export function htmlFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...htmlFiles(p))
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(p)
  }
  return out
}

/**
 * The prefix in front of `/_next/`, i.e. the `basePath` the export was built
 * with: `SITE_BASE_PATH` first, else the commonest prefix over every file.
 *
 * @param {string[]} files
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ base: string, how: string }}
 */
export function measureBasePath(files, env = process.env) {
  const fromEnv = env.SITE_BASE_PATH
  if (fromEnv !== undefined) return { base: fromEnv.replace(/\/$/, ''), how: 'SITE_BASE_PATH' }

  const tally = new Map()
  for (const f of files) {
    const m = /["'\\]((?:\/[^"'\\\s]*?)?)\/_next\//.exec(readFileSync(f, 'utf8'))
    if (m) tally.set(m[1], (tally.get(m[1]) ?? 0) + 1)
  }
  if (tally.size === 0) return { base: '', how: 'no /_next/ asset in the export; assumed empty' }
  const [base, seen] = [...tally].sort((a, b) => b[1] - a[1])[0]
  const how =
    tally.size === 1
      ? `measured from /_next/ URLs in ${seen} file(s)`
      : `measured from /_next/ URLs, but the export carries ${tally.size} different prefixes: ${[...tally.keys()].map((k) => k || '<empty>').join(', ')}`
  return { base, how }
}
