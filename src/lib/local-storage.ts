/**
 * The guarded accessor for `window.localStorage`: the one place application code
 * reads the property.
 *
 * The exceptions are the two inline boot scripts (`record/boot.ts`, `theme.ts`),
 * which are strings run in `<head>` before any module loads and so cannot import
 * this; each has its own try/catch around the same access.
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
export function readLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage ?? null
  } catch {
    return null
  }
}
