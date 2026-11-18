/**
 * The one place `window.localStorage` is touched as a property.
 *
 * Reading the property itself throws `SecurityError` when the origin is opaque or
 * the browser is set not to persist data, so the access is inside the try. Three
 * callers had written this (the record, the theme toggle, the keyboard island);
 * two returned the raw object and one wrapped it, and a fourth copy would have
 * been a fourth chance to forget the try. The record still wraps what this
 * returns (`record/storage.ts`), because it narrows the surface to three methods.
 *
 * Returns null for "no storage here", including on the server.
 */
export function rawLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage ?? null
  } catch {
    return null
  }
}
