/**
 * D144 — the progress transfer link, v1: the record's progress carried inside a URL fragment, so
 * a reader can move it between this site and the mobile app with no server in between (D88).
 *
 * The format is shared with the app, which implements the same codec in Dart; the two are held
 * together by a test vector made by a third implementation (`tests/fixtures/transfer/`). What
 * this file encodes, and what it refuses, is exactly the protocol's:
 *
 *   payload = base64url_nopad( deflate_raw( utf8( compactJson ) ) )
 *   compactJson = {"v":1,"e":{slug:[signedOff,signedRevision,[tick,…]]},"y":{…},"d":[day,…]}
 *
 * `e` is For Engineers (`sheets`), `y` For Everyone (`everyoneSheets`). A completion instant the
 * record holds in canonical form, from 1970 on, travels as base36 of its epoch milliseconds; any other
 * instant the record accepts travels as it is, told apart by its `-`, which such a base36 never has.
 *
 * **What it leaves out, on purpose:** `reachedEnd` and `dwellSeconds` (observed, they gate
 * nothing), `prefs` (a fact about one browser), `meta` and the envelope.
 *
 * **A link is all or nothing.** Anything that does not parse, has the wrong shape or fails the
 * record's own validation (`isSafeKey`, `asInstant`, `SHORT_HASH`, `asDay`) refuses the whole
 * link, so nothing is ever partly applied. Unknown top-level keys are ignored, as the record's
 * own validator ignores a key it does not know.
 *
 * **A transfer only adds** (`mergeTransfer`). It never removes or replaces: a completion already
 * here keeps its own date and revision, ticks and days are unions. Replacing was rejected (D144):
 * that is what Restore from a file already does, and a link opened by mistake must not be able to
 * take anything away.
 *
 * No DOM and no clock: the codec needs only `CompressionStream`, `TextEncoder` and `btoa`, which
 * the browser and node both have, and the merge is a pure function that returns the record it
 * was given when nothing changes, like every reducer in `events.ts`.
 */

import { isSafeKey, type RecordData, type SheetRecord } from './schema'
import { INDEX_KEY, SHORT_HASH, asDay, asInstant } from './validate'

export const TRANSFER_VERSION = 1

/** The `t` value longer than this is refused before anything is decoded. */
export const MAX_PAYLOAD_CHARS = 16384

/** The inflated text longer than this is refused, so a small link cannot inflate without end. */
export const MAX_INFLATED_BYTES = 262144

/**
 * Version 40 at error correction L holds 2953 bytes in byte mode, the most one QR code carries.
 * A longer link is offered as a link only, with Back up and Restore as the way to move it.
 */
export const QR_MAX_CHARS = 2953

/** The highest checklist index the record keeps (`INDEX_KEY`, one to four digits). */
const MAX_TICK = 9999

const BASE36 = /^[0-9a-z]{1,11}$/
const BASE64URL = /^[A-Za-z0-9_-]*={0,2}$/

/** One module's progress as the link carries it. */
export interface TransferEntry {
  signedOff: string | null
  /** Always null when `signedOff` is. */
  signedRevision: string | null
  /** Ascending, distinct, 0..9999. */
  ticks: number[]
}

/** What a decoded link holds: the two tracks' progress and the days. */
export interface TransferProgress {
  sheets: { [slug: string]: TransferEntry }
  everyoneSheets: { [slug: string]: TransferEntry }
  days: string[]
}

// --- encode ------------------------------------------------------------------------------------

/**
 * Base36 of the epoch milliseconds for a canonical instant at or after 1970; any other instant as it
 * is. Before 1970 the milliseconds are negative and their base36 starts with `-`, which a decoder
 * reads as an instant string, so such an instant travels as its own text.
 */
function encodeInstant(instant: string): string {
  const ms = Date.parse(instant)
  if (!Number.isFinite(ms) || ms < 0 || new Date(ms).toISOString() !== instant) return instant
  return ms.toString(36)
}

/** The ticks the record reads: a key of one to four digits holding `true`. */
function ticksOf(sheet: SheetRecord): number[] {
  const ticks = new Set<number>()
  for (const [key, value] of Object.entries(sheet.checklist)) {
    if (value === true && INDEX_KEY.test(key)) ticks.add(Number(key))
  }
  return [...ticks].sort((a, b) => a - b)
}

function encodeSheets(sheets: RecordData['sheets']): Record<string, [string, string, number[]]> {
  const out: Record<string, [string, string, number[]]> = {}
  // Ascending code-unit order, which is what a default sort compares.
  for (const slug of Object.keys(sheets).filter(isSafeKey).sort()) {
    const sheet = sheets[slug]
    const signedOff = asInstant(sheet.signedOff)
    const ticks = ticksOf(sheet)
    if (signedOff === null && ticks.length === 0) continue
    const revision =
      signedOff !== null && sheet.signedRevision !== null && SHORT_HASH.test(sheet.signedRevision)
        ? sheet.signedRevision
        : ''
    out[slug] = [signedOff === null ? '' : encodeInstant(signedOff), revision, ticks]
  }
  return out
}

/** The link's JSON text for a record. Keys in the order `v`, `e`, `y`, `d`; no whitespace. */
export function compactJson(data: RecordData): string {
  return JSON.stringify({
    v: TRANSFER_VERSION,
    e: encodeSheets(data.sheets),
    y: encodeSheets(data.everyoneSheets),
    d: data.days,
  })
}

/** True when the record holds no completion and no tick in either track: nothing to move. */
export function nothingToMove(data: RecordData): boolean {
  return (
    Object.keys(encodeSheets(data.sheets)).length === 0
    && Object.keys(encodeSheets(data.everyoneSheets)).length === 0
  )
}

async function pipeBytes(bytes: Uint8Array, stream: GenericTransformStream, limit: number): Promise<Uint8Array | null> {
  const writer = stream.writable.getWriter()
  void writer.write(bytes as Uint8Array<ArrayBuffer>).catch(() => {})
  void writer.close().catch(() => {})
  const reader = (stream.readable as ReadableStream<Uint8Array>).getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.byteLength
  }
  return out
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!BASE64URL.test(text)) return null
  const bare = text.replace(/=+$/, '')
  if (bare.length % 4 === 1) return null
  try {
    const binary = atob(bare.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return bytes
  } catch {
    return null
  }
}

/** The `t` value of a transfer link for a record. */
export async function encodeTransfer(data: RecordData): Promise<string> {
  const text = new TextEncoder().encode(compactJson(data))
  const deflated = await pipeBytes(text, new CompressionStream('deflate-raw'), Number.POSITIVE_INFINITY)
  return toBase64Url(deflated ?? new Uint8Array())
}

/** `<site>/transfer/#t=<payload>`, where `site` is the origin and base path, with no trailing slash. */
export function transferLink(site: string, payload: string): string {
  return `${site.replace(/\/+$/, '')}/transfer/#t=${payload}`
}

/** The app's own scheme, which the transfer page offers on a phone. */
export function appLink(payload: string): string {
  return `aibazaar://transfer#t=${payload}`
}

// --- decode ------------------------------------------------------------------------------------

/** The `t` parameter of a fragment (`#t=…`, other parameters ignored), or null when there is none. */
export function payloadFromHash(hash: string): string | null {
  const body = hash.startsWith('#') ? hash.slice(1) : hash
  if (body === '') return null
  for (const part of body.split('&')) {
    const at = part.indexOf('=')
    if (at === -1) continue
    if (part.slice(0, at) === 't') return part.slice(at + 1)
  }
  return null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Throws on anything the link may not carry; the caller turns that into one refusal. */
class Refused extends Error {}

function decodeInstant(value: string): string | null {
  if (value === '') return null
  if (value.includes('-')) {
    const instant = asInstant(value)
    if (instant === null) throw new Refused('instant')
    return instant
  }
  if (!BASE36.test(value)) throw new Refused('instant')
  const date = new Date(parseInt(value, 36))
  if (!Number.isFinite(date.getTime())) throw new Refused('instant')
  const instant = asInstant(date.toISOString())
  if (instant === null) throw new Refused('instant')
  return instant
}

function decodeEntry(value: unknown): TransferEntry {
  if (!Array.isArray(value) || value.length !== 3) throw new Refused('entry')
  const [rawSignedOff, rawRevision, rawTicks] = value as unknown[]
  if (typeof rawSignedOff !== 'string' || typeof rawRevision !== 'string' || !Array.isArray(rawTicks)) {
    throw new Refused('entry')
  }
  const signedOff = decodeInstant(rawSignedOff)
  if (rawRevision !== '' && !SHORT_HASH.test(rawRevision)) throw new Refused('revision')
  const ticks = new Set<number>()
  for (const tick of rawTicks) {
    if (typeof tick !== 'number' || !Number.isInteger(tick) || tick < 0 || tick > MAX_TICK) {
      throw new Refused('tick')
    }
    ticks.add(tick)
  }
  return {
    signedOff,
    signedRevision: signedOff === null || rawRevision === '' ? null : rawRevision,
    ticks: [...ticks].sort((a, b) => a - b),
  }
}

function decodeTrack(value: unknown): { [slug: string]: TransferEntry } {
  if (!isPlainObject(value)) throw new Refused('track')
  const out: { [slug: string]: TransferEntry } = {}
  for (const slug of Object.keys(value)) {
    if (!isSafeKey(slug)) throw new Refused('slug')
    out[slug] = decodeEntry(value[slug])
  }
  return out
}

/** The progress a link's JSON text holds, or null when any of it may not be applied. */
export function parseCompactJson(text: string): TransferProgress | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!isPlainObject(parsed) || parsed.v !== TRANSFER_VERSION) return null
  try {
    const sheets = decodeTrack(parsed.e)
    const everyoneSheets = decodeTrack(parsed.y)
    if (!Array.isArray(parsed.d)) return null
    const days = new Set<string>()
    for (const entry of parsed.d) {
      const day = asDay(entry)
      if (day === null) return null
      days.add(day)
    }
    return { sheets, everyoneSheets, days: [...days].sort() }
  } catch (error) {
    if (error instanceof Refused) return null
    throw error
  }
}

/** The progress a `t` value carries, or null when the link cannot be read. */
export async function decodeTransfer(payload: string): Promise<TransferProgress | null> {
  if (payload.length > MAX_PAYLOAD_CHARS) return null
  const bytes = fromBase64Url(payload)
  if (bytes === null || bytes.length === 0) return null
  let inflated: Uint8Array | null
  try {
    inflated = await pipeBytes(bytes, new DecompressionStream('deflate-raw'), MAX_INFLATED_BYTES)
  } catch {
    return null
  }
  if (inflated === null) return null
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(inflated)
  } catch {
    return null
  }
  return parseCompactJson(text)
}

/** The modules a link marks completed, per track: what the reader is shown before applying it. */
export function transferCounts(progress: TransferProgress): { engineers: number; everyone: number } {
  const completed = (sheets: TransferProgress['sheets']) =>
    Object.values(sheets).filter((entry) => entry.signedOff !== null).length
  return { engineers: completed(progress.sheets), everyone: completed(progress.everyoneSheets) }
}

/**
 * The checklist items a link ticks, per track, summed over its modules. Shown beside the completed
 * modules, so a link that carries ticks and no completion does not read as empty.
 */
export function transferTicks(progress: TransferProgress): { engineers: number; everyone: number } {
  const ticked = (sheets: TransferProgress['sheets']) =>
    Object.values(sheets).reduce((sum, entry) => sum + entry.ticks.length, 0)
  return { engineers: ticked(progress.sheets), everyone: ticked(progress.everyoneSheets) }
}

// --- merge -------------------------------------------------------------------------------------

function mergeSheet(local: SheetRecord, incoming: TransferEntry): SheetRecord {
  let next = local
  if (local.signedOff === null && incoming.signedOff !== null) {
    next = { ...next, signedOff: incoming.signedOff, signedRevision: incoming.signedRevision }
  }
  const missing = incoming.ticks.filter((tick) => local.checklist[String(tick)] !== true)
  if (missing.length > 0) {
    const checklist = { ...local.checklist }
    for (const tick of missing) checklist[String(tick)] = true
    next = { ...next, checklist }
  }
  return next
}

function mergeSheets(
  local: RecordData['sheets'],
  incoming: TransferProgress['sheets'],
): RecordData['sheets'] {
  let out = local
  for (const slug of Object.keys(incoming)) {
    if (!isSafeKey(slug)) continue
    const entry = incoming[slug]
    const here = Object.hasOwn(local, slug) ? local[slug] : undefined
    let next: SheetRecord
    if (here === undefined) {
      // An entry that carries neither a completion nor a tick adds nothing, and an empty sheet
      // would be dropped by the validator on the next read anyway.
      if (entry.signedOff === null && entry.ticks.length === 0) continue
      next = {
        signedOff: entry.signedOff,
        signedRevision: entry.signedOff === null ? null : entry.signedRevision,
        reachedEnd: false,
        dwellSeconds: 0,
        checklist: Object.fromEntries(entry.ticks.map((tick) => [String(tick), true])),
      }
    } else {
      next = mergeSheet(here, entry)
      if (next === here) continue
    }
    if (out === local) out = { ...local }
    out[slug] = next
  }
  return out
}

function mergeDays(local: string[], incoming: string[]): string[] {
  const missing = incoming.filter((day) => !local.includes(day))
  if (missing.length === 0) return local
  return [...new Set([...local, ...missing])].sort()
}

/**
 * The record with a link's progress added: new modules taken in, a missing completion filled,
 * ticks and days joined. Nothing here is removed or replaced, and `reachedEnd`, `dwellSeconds`,
 * `prefs` and `meta` are untouched. Returns `local` itself when the link adds nothing.
 */
export function mergeTransfer(local: RecordData, incoming: TransferProgress): RecordData {
  const sheets = mergeSheets(local.sheets, incoming.sheets)
  const everyoneSheets = mergeSheets(local.everyoneSheets, incoming.everyoneSheets)
  const days = mergeDays(local.days, incoming.days)
  if (sheets === local.sheets && everyoneSheets === local.everyoneSheets && days === local.days) {
    return local
  }
  return { ...local, sheets, everyoneSheets, days }
}
