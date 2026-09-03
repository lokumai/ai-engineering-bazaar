#!/usr/bin/env node
/**
 * §15.1.2 — every internal `href`/`src` in the static export resolves to a file
 * that the export actually contains.
 *
 * The gate exists because nothing else in the repository can see this failure.
 * `tests/corpus/links.test.ts` fails the build on an unresolvable internal `.md`
 * link, but it reasons about markdown, not routes: when §15 moved the flat
 * manifest off `/` to `/sheets/`, a `<Link href="/sheets/">` written before that
 * route existed would have been perfectly valid TypeScript, passed the corpus
 * test, built without a warning and shipped a 404. `next build` does not walk
 * its own output, and GitHub Pages answers a missing path with the 404 page and
 * no error anywhere a maintainer would look. So the export is the only place the
 * question can be asked, and this is the only thing that asks it.
 *
 * Run it against the export, after the build:
 *
 *   npm run build && node scripts/check-links-out.mjs out
 *
 * It reads the export rather than the source deliberately. Only the export
 * knows the final URL of a page: `trailingSlash: true` turns `/sheets` into
 * `sheets/index.html`, and `SITE_BASE_PATH` prefixes every route and asset in
 * the deployed build. A source-level checker would have to model both and would
 * then be a second implementation of `next build`'s URL rules, wrong in exactly
 * the cases that matter.
 *
 * The base path is MEASURED from the export, not read from `next.config.ts` or
 * the environment. `SITE_BASE_PATH` is set for the duration of one build
 * command; by the time this runs it is usually gone from the environment, and a
 * checker that silently assumed `''` would pass a Pages build whose every link
 * is wrong. Every export carries `/_next/` asset URLs, and whatever sits in
 * front of that segment IS the base path the build used. `SITE_BASE_PATH` in
 * the environment still overrides, for the case of an export with no assets.
 *
 * Resolution mirrors `scripts/serve-static.mjs`, which mirrors GitHub Pages:
 * a path may be a file, a directory holding `index.html`, or a name with
 * `.html` appended. Demanding an exact file instead was tried first and reports
 * every route in the site, because with `trailingSlash: true` no internal link
 * names a file.
 *
 * Every offender is printed with each file it was found in and how many times.
 * A gate that stops at the first failure gets run ten times.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, resolve, relative, dirname, basename } from 'node:path'

const root = resolve(process.argv[2] ?? 'out')

const E = '\u001b'
const PASS = `${E}[32m✓${E}[0m`
const FAIL = `${E}[31m✗${E}[0m`

if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`\n${FAIL} export not found: ${root}\n      run \`npm run build\` first, or pass the export directory.\n`)
  process.exit(1)
}

/** Every `.html` file in the export, in directory order. */
function htmlFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...htmlFiles(p))
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(p)
  }
  return out
}

/**
 * Attribute-bearing markup only. Script and style bodies are dropped because
 * Next embeds its flight payload in a `<script>` as escaped JSON — `href\":\"/`
 * — and a value pulled out of there is not a link a browser would follow.
 */
const strippable = /(<(script|style)\b[^>]*>)[\s\S]*?<\/\2\s*>/gi
const comments = /<!--[\s\S]*?-->/g
const attrs = /\s(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"'`]+))/gi

const files = htmlFiles(root)

// -- 1. What base path did this build use? ----------------------------------
/** The prefix in front of `/_next/`, i.e. the `basePath` the export was built with. */
function measureBasePath() {
  const fromEnv = process.env.SITE_BASE_PATH
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

const { base, how } = measureBasePath()

// -- 2. Collect and resolve -------------------------------------------------
/** The URL a given exported file is served at, base path included. */
function servedUrl(file) {
  const rel = relative(root, file).split('\\').join('/')
  const path = basename(rel) === 'index.html' ? `${dirname(rel) === '.' ? '' : dirname(rel)}/` : rel
  return `${base}/${path.replace(/^\//, '')}`
}

/** The file a URL path names inside the export, or null. Mirrors serve-static.mjs. */
function exportedFile(pathname) {
  const candidate = resolve(join(root, pathname))
  if (candidate !== root && !candidate.startsWith(root + '/')) return null
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  if (existsSync(join(candidate, 'index.html'))) return join(candidate, 'index.html')
  const html = `${candidate}.html`
  if (existsSync(html) && statSync(html).isFile()) return html
  return null
}

/** Offender key → { reason, files: Map<file, count> }. */
const broken = new Map()
let checked = 0

const record = (target, reason, file) => {
  const key = `${target}\u0000${reason}`
  let entry = broken.get(key)
  if (!entry) broken.set(key, (entry = { target, reason, files: new Map() }))
  entry.files.set(file, (entry.files.get(file) ?? 0) + 1)
}

for (const file of files) {
  const html = readFileSync(file, 'utf8').replace(comments, '').replace(strippable, '$1')
  const from = servedUrl(file)
  const shown = relative(root, file)

  for (const m of html.matchAll(attrs)) {
    const raw = (m[2] ?? m[3] ?? m[4] ?? '').trim().replace(/&amp;/g, '&')
    if (!raw) continue
    // External, protocol-relative, in-page, and non-navigational schemes:
    // mailto, tel, data, javascript, blob. A scheme is any `word:` prefix.
    if (raw.startsWith('#') || raw.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue

    let pathname
    try {
      // Resolved against the page's OWN served URL, so a relative link is read
      // the way a browser reads it, and a root-relative one keeps its meaning.
      pathname = decodeURIComponent(new URL(raw, `http://export${from}`).pathname)
    } catch {
      record(raw, 'not a resolvable URL', shown)
      continue
    }
    if (!pathname || pathname === '/') pathname = '/'
    checked++

    // A root-relative link written without the base path is the single failure
    // the Pages build has and the local build does not: it resolves locally and
    // 404s in production.
    if (base && pathname !== base && !pathname.startsWith(base + '/')) {
      record(raw, `outside the base path ${base}`, shown)
      continue
    }
    const inExport = base ? pathname.slice(base.length) || '/' : pathname
    if (!exportedFile(inExport)) record(raw, 'no such file in the export', shown)
  }
}

// -- 3. Report --------------------------------------------------------------
const total = [...broken.values()].reduce(
  (n, e) => n + [...e.files.values()].reduce((a, b) => a + b, 0),
  0
)

console.log(`\n${root} — ${files.length} html, ${checked} internal links`)
console.log(`  base path: ${base || '<empty>'}  (${how})`)

if (broken.size === 0) {
  console.log(`\n${PASS} every internal link resolves to a file\n`)
  process.exit(0)
}

console.log('')
for (const { target, reason, files: where } of [...broken.values()].sort(
  (a, b) => a.target.localeCompare(b.target)
)) {
  const count = [...where.values()].reduce((a, b) => a + b, 0)
  console.log(`${FAIL} ${target}  — ${reason}  (${count}×)`)
  for (const [f, n] of [...where].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`      ${f}${n > 1 ? `  ×${n}` : ''}`)
  }
}
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`
console.log(
  `\n${count(broken.size, 'dead target', 'dead targets')}, `
  + `in ${count(total, 'place', 'places')}.\n`
)
process.exit(1)
