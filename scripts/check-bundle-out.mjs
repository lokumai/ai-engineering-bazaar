#!/usr/bin/env node
/**
 * Spec 2.13 guard 12: the content bundle in a finished export meets its
 * contract, checked from the bytes on disk.
 *
 *   npm run build && node scripts/check-bundle-out.mjs out
 *
 * **Why the export and not the producer.** The finaliser computes every hash,
 * so a test of the finaliser can only ask whether it agrees with itself. This
 * reads what will be published and recomputes every claim the index makes about
 * it: that the file set is the one the index lists, that each sha256 is the
 * hash of those bytes, that `contentVersion` is the hash of the index, that
 * every diagram is inside the SVG profile, and that nothing carries the base
 * path the build was made with. A native reader trusts those claims to decide
 * what to download, so a wrong one is a reader showing stale or broken content
 * with no error anywhere.
 *
 * **One deviation from spec 2.13 #12** ("no bundle file contains the base
 * path"): a JSON string is refused when it STARTS with `<basePath>/`, not when
 * it contains it. An external link may carry the same text legitimately
 * (`mini-courses/index.md` links to `https://github.com/lokumai/ai-engineering-bazaar`),
 * and every bundle path is a whole field, so a leaked base path is always its
 * prefix. An SVG holds no path at all, so there any occurrence is refused.
 *
 * The check is a function returning every failure, one message each, so the
 * unit test can run it over a synthetic tree; the CLI prints them all, because
 * a gate that stops at the first failure gets run ten times.
 *
 * Plain `.mjs` importing only `node:` and `scripts/lib/` (spec 2.5).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { htmlFiles, measureBasePath } from './lib/base-path.mjs'
import { contentVersionOf, sha256Hex } from './lib/bundle-hash.mjs'
import { diagramPaths, imagePaths } from './lib/bundle-walk.mjs'
import { DIAGRAM_FONT } from './lib/diagram-font.mjs'
import { profileViolations } from './lib/svg-profile.mjs'

/** The major this checker reads; `api/v1/` is its path segment. */
const MAJOR = 1
const HEX64 = /^[0-9a-f]{64}$/

/** Files under `api/v1/` that `files` does not list (spec 2.7): the index itself, its draft, and the snapshot. */
export const UNLISTED = Object.freeze(['api/v1/index.json', 'api/v1/index.draft.json', 'api/v1/record-conformance.json'])

/** Every file under `dir`, as `/`-separated paths relative to `root`, sorted. */
function filesUnder(root, dir) {
  const start = join(root, dir)
  if (!existsSync(start)) return []
  const out = []
  const walk = (at) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const path = join(at, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile()) out.push(relative(root, path).split('\\').join('/'))
    }
  }
  walk(start)
  return out.sort()
}

/** Every string in a JSON value, keys included. */
function stringsOf(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) for (const item of value) stringsOf(item, out)
  else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      out.push(key)
      stringsOf(item, out)
    }
  }
  return out
}

/** The first key that is not greater than the one before it, or null. */
function firstOutOfOrder(keys) {
  for (let i = 1; i < keys.length; i++) if (!(keys[i - 1] < keys[i])) return keys[i]
  return null
}

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * Every way the bundle under `dir` breaks its contract; empty means it passes.
 *
 * @param {string} dir the export root, holding `api/`
 * @param {{ basePath?: string, fontFile?: string }} [options]
 * @returns {string[]}
 */
export function checkBundleOut(dir, { basePath = '', fontFile = DIAGRAM_FONT.file } = {}) {
  const failures = []
  const fail = (message) => failures.push(message)
  const at = (path) => join(dir, path)

  // -- every bundle JSON parses ---------------------------------------------
  /** @type {Map<string, unknown>} */
  const json = new Map()
  for (const path of filesUnder(dir, 'api').filter((one) => one.endsWith('.json'))) {
    try {
      json.set(path, JSON.parse(readFileSync(at(path), 'utf8')))
    } catch (error) {
      fail(`${path} does not parse as JSON: ${error.message}`)
    }
  }

  // -- api/index.json lists the major ---------------------------------------
  const majors = json.get('api/index.json')
  if (!existsSync(at('api/index.json'))) fail('api/index.json is missing')
  else if (json.has('api/index.json') && !(isRecord(majors) && Array.isArray(majors.majors) && majors.majors.includes(MAJOR))) {
    fail(`api/index.json does not list major ${MAJOR}`)
  }

  if (existsSync(at('api/v1/index.draft.json'))) fail('api/v1/index.draft.json is present; the finaliser did not complete')

  // -- the documents, and what they name ------------------------------------
  const documents = [...json].filter(([path]) => path.startsWith('api/v1/levels/') || path.startsWith('api/v1/modules/'))
  /** image src -> the documents that name it */
  const named = new Map()
  for (const [path, doc] of documents) {
    try {
      for (const src of imagePaths(doc)) named.set(src, [...(named.get(src) ?? []), path])
      for (const svg of diagramPaths(doc)) {
        if (!existsSync(at(svg))) fail(`${path} names the diagram ${svg}, which is not in the export`)
      }
    } catch (error) {
      fail(`${path}: ${error.message}`)
    }
  }

  // -- every SVG passes the profile -----------------------------------------
  const svgs = filesUnder(dir, 'api').filter((one) => one.endsWith('.svg'))
  for (const path of svgs) {
    for (const violation of profileViolations(readFileSync(at(path), 'utf8'))) fail(`${path}: ${violation}`)
  }

  // -- no bundle file carries the base path ---------------------------------
  if (basePath !== '') {
    const prefix = `${basePath}/`
    for (const [path, value] of json) {
      for (const string of stringsOf(value)) {
        if (string.startsWith(prefix)) fail(`${path}: the string ${JSON.stringify(string)} starts with the base path ${prefix}`)
      }
    }
    for (const path of svgs) {
      if (readFileSync(at(path), 'utf8').includes(prefix)) fail(`${path} contains the base path ${prefix}`)
    }
  }

  // -- the index ------------------------------------------------------------
  if (!existsSync(at('api/v1/index.json'))) {
    fail('api/v1/index.json is missing')
    return failures
  }
  const index = json.get('api/v1/index.json')
  if (!isRecord(index)) {
    if (json.has('api/v1/index.json')) fail('api/v1/index.json is not an object')
    return failures
  }

  if (index.schemaVersion !== MAJOR) fail(`api/v1/index.json: schemaVersion is ${JSON.stringify(index.schemaVersion)}, not ${MAJOR}`)
  if (typeof index.contentVersion !== 'string' || !HEX64.test(index.contentVersion)) {
    fail(`api/v1/index.json: contentVersion ${JSON.stringify(index.contentVersion)} is not 64 lowercase hex`)
  }

  for (const name of ['files', 'images']) {
    const record = index[name]
    if (!isRecord(record)) {
      fail(`api/v1/index.json: ${name} is not an object`)
      continue
    }
    for (const [key, value] of Object.entries(record)) {
      if (typeof value !== 'string' || !HEX64.test(value)) {
        fail(`api/v1/index.json: ${name}[${JSON.stringify(key)}] is not 64 lowercase hex`)
      }
    }
    const disorder = firstOutOfOrder(Object.keys(record))
    if (disorder !== null) fail(`${name}: the keys are not in ascending order at ${JSON.stringify(disorder)}`)
  }

  // -- files: the set under api/v1/, and every hash --------------------------
  if (isRecord(index.files)) {
    const onDisk = new Set(filesUnder(dir, 'api/v1').filter((path) => !UNLISTED.includes(path)))
    for (const path of onDisk) {
      if (!Object.hasOwn(index.files, path)) fail(`files: ${path} is under api/v1/ but not listed`)
    }
    for (const [path, hash] of Object.entries(index.files)) {
      if (!onDisk.has(path)) {
        fail(`files: ${path} is listed but does not exist`)
        continue
      }
      const actual = sha256Hex(readFileSync(at(path)))
      if (actual !== hash) fail(`files: ${path} hashes to ${actual}, the index says ${hash}`)
    }
  }

  // -- images: the set the documents name, and every hash ---------------------
  if (isRecord(index.images)) {
    for (const src of named.keys()) {
      if (!Object.hasOwn(index.images, src)) fail(`images: ${src} is named by a document but not listed (${named.get(src).join(', ')})`)
    }
    for (const [src, hash] of Object.entries(index.images)) {
      if (!named.has(src)) fail(`images: ${src} is listed but no document names it`)
      const file = at(src)
      if (!existsSync(file) || !statSync(file).isFile()) {
        fail(`images: ${src} does not exist under ${dir}`)
        continue
      }
      const actual = sha256Hex(readFileSync(file))
      if (actual !== hash) fail(`images: ${src} hashes to ${actual}, the index says ${hash}`)
    }
  }

  // -- contentVersion recomputes ---------------------------------------------
  const recomputed = contentVersionOf(index)
  if (recomputed !== index.contentVersion) {
    fail(`contentVersion is ${index.contentVersion}, but the index recomputes to ${recomputed}`)
  }

  // -- the diagram font is the installed one ---------------------------------
  const declared = isRecord(index.diagramFont) ? index.diagramFont.sha256 : undefined
  if (!existsSync(fontFile)) {
    fail(`diagramFont: the font file ${fontFile} does not exist; run npm install`)
  } else {
    const actual = sha256Hex(readFileSync(fontFile))
    if (declared !== actual) fail(`diagramFont.sha256 is ${declared}, but ${fontFile} hashes to ${actual}`)
  }

  return failures
}

// -- CLI --------------------------------------------------------------------
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const E = '\u001b'
  const PASS = `${E}[32m✓${E}[0m`
  const FAIL = `${E}[31m✗${E}[0m`

  const root = resolve(process.argv[2] ?? 'out')
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    console.error(`\n${FAIL} export not found: ${root}\n      run \`npm run build\` first, or pass the export directory.\n`)
    process.exit(1)
  }

  const { base, how } = measureBasePath(htmlFiles(root))
  const failures = checkBundleOut(root, { basePath: base })

  console.log(`\n${root}: the content bundle under api/`)
  console.log(`  base path: ${base || '<empty>'}  (${how})`)
  if (failures.length === 0) {
    console.log(`\n${PASS} the index lists every bundle file and image with its sha256, contentVersion recomputes, every diagram is inside the SVG profile, and no file carries the base path\n`)
    process.exit(0)
  }
  console.log('')
  for (const failure of failures) console.log(`${FAIL} ${failure}`)
  console.log(`\n${failures.length} ${failures.length === 1 ? 'failure' : 'failures'}.\n`)
  process.exit(1)
}
