/**
 * The content bundle's canonical serialisation and its hash, defined once and
 * imported by `scripts/finalize-bundle.mjs`, which computes them, and by
 * `scripts/check-bundle-out.mjs`, which recomputes them (spec 2.7).
 *
 * **The canonical form is `JSON.stringify` in the key order the object already
 * has.** No key sorting at serialisation time: the index's key order is the
 * strict schema's, which the draft carries, and `files` and `images` are built
 * by `sortedRecord`, so the order is decided where the object is made and the
 * serialiser restates nothing.
 *
 * Plain `.mjs` importing only `node:`, so the two scripts can load it without
 * the TypeScript toolchain.
 */
import { createHash } from 'node:crypto'

/** A canonical integer string, which JavaScript always enumerates first. */
const INTEGER_KEY = /^(?:0|[1-9]\d*)$/

/**
 * @param {Uint8Array | string} bytes
 * @returns {string} 64 lowercase hex characters
 */
export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalJson(value) {
  return JSON.stringify(value)
}

/**
 * A record whose keys are inserted in ascending UTF-16 code-unit order, which
 * is what `[...keys].sort()` gives and what `JSON.stringify` then preserves.
 *
 * Refused: a key given twice, which would silently keep one hash; and a key
 * that is a canonical integer string, because an object enumerates those
 * first whatever order they were inserted in, so the sort would not survive.
 *
 * @param {Array<[string, string]>} entries
 * @returns {Record<string, string>}
 */
export function sortedRecord(entries) {
  const values = new Map()
  for (const [key, value] of entries) {
    if (values.has(key)) throw new Error(`bundle-hash: the key "${key}" is given twice`)
    if (INTEGER_KEY.test(key)) {
      throw new Error(`bundle-hash: the key "${key}" is an integer string, which JSON.stringify would move to the front`)
    }
    values.set(key, value)
  }
  /** @type {Record<string, string>} */
  const record = {}
  for (const key of [...values.keys()].sort()) record[key] = values.get(key)
  return record
}

/**
 * The sha256 of the canonical index with `contentVersion` and `publishedAt`
 * emptied in place, so both keep their positions and neither feeds the hash:
 * two commits with identical content share a version (spec 2.7).
 *
 * @param {Record<string, unknown>} index
 * @returns {string}
 */
export function contentVersionOf(index) {
  return sha256Hex(canonicalJson({ ...index, contentVersion: '', publishedAt: '' }))
}
