/**
 * §12.4, §12.6–§12.9, §12.16 — every write to the record, as a pure reducer.
 *
 * Three rules hold across the whole file, and each of them is load-bearing:
 *
 * 1. **Nothing mutates.** Every function returns a NEW RecordData or the one it
 *    was given. The store keeps the in-memory record authoritative and notifies
 *    subscribers synchronously (§12.1.4); a mutation would leave React with a
 *    snapshot that is identity-equal to the previous one and no re-render.
 * 2. **No clock.** Every function that records a time takes the current ISO
 *    instant as an explicit `now`, so the reducers are deterministic under test
 *    — the same stance `lib/content/` takes on `Date` and `Math.random`. The
 *    caller decides the timezone by choosing what it passes; `store.ts` passes
 *    UTC, so a record stays comparable across travel and machines.
 * 3. **A no-op returns the same object.** `signOff` on an already-signed sheet,
 *    a duplicate source, a full submittal register: all return `data` itself,
 *    so the store can skip the notify and the flush. It also means a reducer
 *    can never rewrite a recorded fact by being called twice.
 *
 * Signatures put `now` last and make it required wherever a write happens, so a
 * caller cannot forget the day-stamp: `days` is what the §7.3 UPTIME strip is
 * drawn from, and an unstamped write would show as a gap the reader did not
 * take.
 */

import {
  DWELL_CAP_SECONDS,
  emptySheetRecord,
  isSafeKey,
  type CatalogViewId,
  type DiagramThemeId,
  type PaletteId,
  type RecordData,
  type SheetRecord,
} from './schema'
import type { Track } from '../tracks'

export const INSTANT_DAY = /^(\d{4}-\d{2}-\d{2})(?:[T ]|$)/
/** §12.7 — the corpus's longest checklist is 8 items; 4 digits is generous. */
const MAX_CHECKLIST_INDEX = 9999

/**
 * The day an instant falls on, or null when the string is not an instant.
 *
 * The round trip is the range check, not `Date.parse`: MEASURED, V8 parses
 * `2026-02-31` to a finite time by rolling the day into March, and a day the
 * validator would reject on the next read must never be stamped now.
 */
export function dayOf(now: string): string | null {
  const match = INSTANT_DAY.exec(now)
  if (!match) return null
  const day = match[1]
  const parsed = new Date(`${day}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10) === day ? day : null
}

/** `days` stays sorted and distinct: it is read as a 14-day window (§7.3). */
function stampDay(data: RecordData, now: string): RecordData {
  const day = dayOf(now)
  if (day === null || data.days.includes(day)) return data
  return { ...data, days: [...data.days, day].sort() }
}

/**
 * Reads the sheet's record, hands it to `edit`, and writes the result back with
 * the day stamped. `edit` returns null for "nothing changed", which is how
 * every no-op above reaches the caller as the same object.
 */
function editSheet(
  data: RecordData,
  slug: string,
  now: string | null,
  edit: (sheet: SheetRecord) => SheetRecord | null,
  track: Track = 'engineers',
): RecordData {
  if (!isSafeKey(slug)) return data
  const key = track === 'everyone' ? 'everyoneSheets' : 'sheets'
  const next = edit(data[key][slug] ?? emptySheetRecord())
  if (next === null) return data
  const written = { ...data, [key]: { ...data[key], [slug]: next } }
  return now === null ? written : stampDay(written, now)
}

/**
 * §12.4.1 — the reader asserts completion; the site never infers it.
 * §12.4.3 — the sheet's REV short hash at this instant is recorded so a
 * completion claim that later becomes false can say so. `null` where git gave
 * no revision: derived or absent (§11.25), never a plausible hash.
 *
 * Already signed off is a no-op, not a re-stamp. The recorded date and revision
 * are facts about a past act; UNSIGN then SIGN OFF is how a reader re-asserts
 * against a new revision.
 */
export function signOff(
  data: RecordData,
  slug: string,
  revision: string | null,
  now: string,
  track: Track = 'engineers',
): RecordData {
  return editSheet(data, slug, now, (sheet) =>
    sheet.signedOff !== null
      ? null
      : { ...sheet, signedOff: now, signedRevision: revision },
  track)
}

/**
 * §12.4.1 — un-sign is its own undo, which is why neither it nor sign-off gets
 * a confirmation dialog. It clears the assertion and nothing else: the quiz
 * answer, the ticks, the sources and the submittals were separate acts.
 */
export function unsign(data: RecordData, slug: string, track: Track = 'engineers'): RecordData {
  return editSheet(data, slug, null, (sheet) =>
    sheet.signedOff === null && sheet.signedRevision === null
      ? null
      : { ...sheet, signedOff: null, signedRevision: null },
  track)
}

/**
 * §12.7 — items are keyed by stable index within the sheet. Only ticks are
 * stored: an unticked box is the default, so unticking deletes the key rather
 * than writing `false`, and no count has to distinguish the two.
 */
export function setChecklistItem(
  data: RecordData,
  slug: string,
  index: number,
  ticked: boolean,
  now: string,
  track: Track = 'engineers',
): RecordData {
  if (!Number.isInteger(index) || index < 0 || index > MAX_CHECKLIST_INDEX) return data
  const key = String(index)
  return editSheet(data, slug, now, (sheet) => {
    if ((sheet.checklist[key] === true) === ticked) return null
    const checklist = { ...sheet.checklist }
    if (ticked) checklist[key] = true
    else delete checklist[key]
    return { ...sheet, checklist }
  }, track)
}


/**
 * §12.16 — SC 2.1.4's off switch for single-character shortcuts. Default on for
 * this audience; modifier shortcuts keep working when it is off.
 */
export function setCharKeys(data: RecordData, on: boolean): RecordData {
  if (data.prefs.charKeys === on) return data
  return { ...data, prefs: { ...data.prefs, charKeys: on } }
}

/**
 * M10 — the curriculum rail's fold, remembered per reader.
 *
 * Same shape as `setCharKeys` and for the same reason: this is the ONE writer
 * of the fold, because `store.ts` is the one writer of learner state
 * (`kia-context/specs/ARCHITECTURE.md` §5). The fold is a layout preference and
 * the temptation is a second `localStorage` key beside the record; that is
 * exactly the second writer the rule forbids, and it would also be invisible to
 * the export, the erase dialog and the merge.
 *
 * It stamps no day. Folding a rail is not work on the curriculum, and a reader
 * who collapsed a sidebar has not earned a streak — `days` is evidence about
 * the course, so writing to it here would inflate every readout that counts
 * days.
 */
export function setRailFolded(data: RecordData, folded: boolean): RecordData {
  if (data.prefs.railFolded === folded) return data
  return { ...data, prefs: { ...data.prefs, railFolded: folded } }
}

/**
 * M12 / D13 — which of the catalog's three views the reader chose.
 *
 * The same shape as `setRailFolded` and for the same reason: `store.ts` is the
 * only writer of learner state (`kia-context/specs/ARCHITECTURE.md` §5), so the
 * view is written here or it is not written at all. A second `localStorage` key
 * beside the record would be a second writer, and it would also be invisible to
 * the export, the erase dialog and the account merge — the three surfaces that
 * are supposed to account for everything this site remembers about a reader.
 *
 * It stamps no day. Choosing a view is not work on the curriculum, and `days`
 * is evidence about the course: writing to it here would inflate every readout
 * that counts days for a reader who did nothing but press a toggle.
 */
export function setCatalogView(data: RecordData, view: CatalogViewId): RecordData {
  if (data.prefs.catalogView === view) return data
  return { ...data, prefs: { ...data.prefs, catalogView: view } }
}

/**
 * The Mermaid theme a reader chose for the diagrams. `setCatalogView`'s shape and its
 * reasons: written through the store or not at all, and no day stamped, because
 * choosing a colour is not work on the curriculum.
 */
export function setDiagramTheme(data: RecordData, theme: DiagramThemeId): RecordData {
  if (data.prefs.diagramTheme === theme) return data
  return { ...data, prefs: { ...data.prefs, diagramTheme: theme } }
}

/** The same, for the code blocks. */
export function setCodePalette(data: RecordData, palette: PaletteId): RecordData {
  if (data.prefs.codePalette === palette) return data
  return { ...data, prefs: { ...data.prefs, codePalette: palette } }
}

/** §12.15 — `lastExport`, so `NO EXPORT ON RECORD` can be a truthful state. */
/**
 * §7.3 — the reader did something today, and nothing else about the record has
 * to change for that to be true.
 *
 * Every other reducer stamps the day as a side effect of the thing it records.
 * The export needs it on its own, and needs it BEFORE the bytes are frozen: the
 * exported file is the reader's backup (§12.12.6), and a backup written a line
 * before the day was stamped comes back missing a tick the reader earned by
 * doing the export. `lastExport` deliberately does NOT move here — see
 * `markExported`.
 */
export function markActivity(data: RecordData, now: string): RecordData {
  return stampDay(data, now)
}

/**
 * §12.11 — when the reader last took their record out of this browser.
 *
 * Called AFTER the download has actually started, and therefore never present
 * in the file it describes: a file cannot honestly claim an export that had not
 * happened when it was written. The day is stamped separately and earlier, by
 * `markActivity`, because the day IS true of the record being written.
 */
export function markExported(data: RecordData, now: string): RecordData {
  if (data.meta.lastExport === now) return data
  return stampDay({ ...data, meta: { ...data.meta, lastExport: now } }, now)
}

/**
 * §12.1.6 — the QUERIED answer from `navigator.storage`, including `false`,
 * which is normal and not an error. `null` means not yet queried, and the
 * readout must never print a value that has not been (§12.1.6).
 *
 * No day is stamped: this is the browser answering a question, not the reader
 * doing work, and the UPTIME strip is a record of the reader's days.
 */
export function setPersisted(data: RecordData, granted: boolean | null): RecordData {
  if (data.meta.persisted === granted) return data
  return { ...data, meta: { ...data.meta, persisted: granted } }
}
