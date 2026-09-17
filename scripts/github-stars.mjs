/**
 * M18 — the repository's star count, fetched once and committed.
 *
 * The bar prints a number that is not a fact about this repository's CONTENTS,
 * which is the one shape `derive-never-restate` has no answer for: there is
 * nothing in the tree to count. Three ways to get it were costed (BRAINSTORM
 * **D64**) and this is the one taken — **fetched at build time, with the last
 * answer committed.**
 *
 * **The committed file is the source of truth for a build, not this script.**
 * `npm run build` does NOT run it: a build that needs the network is a build
 * that fails on a plane and in a CI runner with no egress, and the number is
 * decoration on a link that works without it. So the file ships with whatever
 * the last run wrote, the site prints that, and somebody runs this when they
 * want it fresher:
 *
 *     node scripts/github-stars.mjs
 *
 * It writes `src/lib/github-stars.json` and prints what changed. A failed fetch
 * writes nothing and exits 0 — a stale number is a smaller lie than no number
 * where the markup promised one, and an exit code would fail a pipeline over a
 * rate limit.
 *
 * **`stars: null` is a real state and the bar draws it.** A clone with no
 * network and no committed answer gets the mark and the star with no figure
 * beside them, which is the house spelling for "nobody counted" (§11.25). It is
 * never a zero somebody invented.
 */
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const TARGET = join(HERE, '..', 'src', 'lib', 'github-stars.json')

/** The repository the site links to. One spelling, in `src/lib/site.ts`. */
const SLUG = 'lokumai/ai-engineering-bazaar'

function previous() {
  try {
    return JSON.parse(readFileSync(TARGET, 'utf8'))
  } catch {
    return { stars: null, measured: null }
  }
}

const was = previous()

let stars = null
try {
  const response = await fetch(`https://api.github.com/repos/${SLUG}`, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': SLUG },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = await response.json()
  if (typeof body.stargazers_count !== 'number') throw new Error('no stargazers_count')
  stars = body.stargazers_count
} catch (error) {
  console.error(`github-stars: could not reach the API (${error.message}); keeping ${was.stars}`)
  process.exit(0)
}

const measured = new Date().toISOString().slice(0, 10)
writeFileSync(TARGET, `${JSON.stringify({ stars, measured }, null, 2)}\n`)
console.log(`github-stars: ${was.stars} -> ${stars}, measured ${measured}`)
