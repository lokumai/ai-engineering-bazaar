import { describe, expect, it } from 'vitest'
import {
  canonicalJson,
  contentVersionOf,
  sha256Hex,
  sortedRecord,
} from '../../../scripts/lib/bundle-hash.mjs'

/**
 * The one definition of the bundle's canonical serialisation and hash, shared
 * by the finaliser and the checker (spec 2.7). Inputs are invented.
 */

const HASH_A = 'a'.repeat(64)
const HASH_B = 'b'.repeat(64)

function index(files: Record<string, string>, publishedAt = '2026-11-05T07:20:30.000Z') {
  return {
    schemaVersion: 1,
    contentVersion: '',
    publishedAt,
    sourceLanguage: 'en',
    files,
    images: {},
  }
}

describe('sha256Hex', () => {
  it('hashes bytes and strings alike, as 64 lowercase hex', () => {
    const text = 'bazaar'
    expect(sha256Hex(text)).toMatch(/^[0-9a-f]{64}$/)
    expect(sha256Hex(new TextEncoder().encode(text))).toBe(sha256Hex(text))
  })
})

describe('canonicalJson', () => {
  it('is compact JSON in the key order it is given', () => {
    expect(canonicalJson({ b: 1, a: [1, 2] })).toBe('{"b":1,"a":[1,2]}')
  })
})

describe('sortedRecord', () => {
  it('gives an equal contentVersion whatever order the entries arrive in', () => {
    const entries: [string, string][] = [['api/v1/b.json', HASH_A], ['api/v1/a.json', HASH_B], ['api/v1/c.svg', HASH_A]]
    const forward = contentVersionOf(index(sortedRecord(entries)))
    const reversed = contentVersionOf(index(sortedRecord([...entries].reverse())))
    expect(reversed).toBe(forward)
  })

  it('orders by code unit, not locale', () => {
    const record = sortedRecord(['b', 'B', 'a/ä', 'a/z'].map((key) => [key, HASH_A] as [string, string]))
    expect(Object.keys(record)).toEqual(['B', 'a/z', 'a/ä', 'b'])
  })

  it('refuses a key JSON.stringify would move to the front', () => {
    expect(() => sortedRecord([['10', HASH_A]])).toThrow(/"10"/)
  })

  it('refuses a key given twice', () => {
    expect(() => sortedRecord([['a', HASH_A], ['a', HASH_B]])).toThrow(/"a"/)
  })
})

describe('contentVersionOf', () => {
  it('ignores publishedAt', () => {
    const files = sortedRecord([['api/v1/a.json', HASH_A]])
    expect(contentVersionOf(index(files, '2030-01-01T00:00:00.000Z'))).toBe(contentVersionOf(index(files)))
  })

  it('ignores a contentVersion already written', () => {
    const files = sortedRecord([['api/v1/a.json', HASH_A]])
    expect(contentVersionOf({ ...index(files), contentVersion: HASH_B })).toBe(contentVersionOf(index(files)))
  })

  it('changes when one file hash changes', () => {
    const before = contentVersionOf(index(sortedRecord([['api/v1/a.json', HASH_A]])))
    const after = contentVersionOf(index(sortedRecord([['api/v1/a.json', HASH_B]])))
    expect(after).not.toBe(before)
  })

  it('keeps contentVersion and publishedAt in their positions', () => {
    const value = index(sortedRecord([['api/v1/a.json', HASH_A]]))
    const expected = sha256Hex(JSON.stringify({ ...value, contentVersion: '', publishedAt: '' }))
    expect(contentVersionOf(value)).toBe(expected)
    const moved = { schemaVersion: 1, sourceLanguage: 'en', files: value.files, images: {}, contentVersion: '', publishedAt: '' }
    expect(contentVersionOf(moved)).not.toBe(expected)
  })
})
