/**
 * §14.1, §14.10 — the only module that names a `NEXT_PUBLIC_*` variable, and
 * the one place that decides whether this build has a backend at all.
 *
 * Three decisions are recorded here rather than in the code that consumes it:
 *
 * 1. **The anon key is PUBLIC by design.** §14.10 puts authority entirely in
 *    RLS: `service_role` never leaves the operator's hands, Metabase gets a
 *    hand-made read-only Postgres role, and the browser gets a key whose only
 *    power is "you are anonymous until you sign in". Shipping it in the bundle
 *    is not a leak; it is the contract. Nobody should later "fix" this into a
 *    server-side secret — there is no server. A static export has no place to
 *    hide a value, and moving the key out of the bundle would mean moving the
 *    whole backend behind something that can hold a secret, which §14.0/8
 *    already rejected.
 *
 * 2. **`NEXT_PUBLIC_AUTH_ENABLED` is a kill switch, and it defaults to OFF.**
 *    §14.1 makes `bazaar.lokumai.com` a PRECONDITION, not a nicety: on the
 *    shared `lokumai.github.io` origin any sibling project page — including one
 *    added next year by someone who never read this spec — can read the session
 *    token out of `localStorage` and act as the user. An origin is a
 *    scheme/host/port tuple; `basePath` isolates nothing and cookies are
 *    host-scoped too. So the flag is absent-means-off: a deploy that forgets to
 *    set it ships the safe configuration, and §14.13's first risk row ("the
 *    domain migration is missed and auth goes live on the shared origin")
 *    cannot happen by omission. Turning auth on is a deliberate act taken after
 *    DNS is verified live.
 *
 * 3. **Missing or malformed config is a typed result, NEVER a throw.** This is
 *    a static export: every page, including the 32 sheets that have nothing to
 *    do with accounts, is prerendered by evaluating modules in node. A throw at
 *    import time — or from a function called during prerender — fails the
 *    build for the whole site over a variable only `/account/` cares about.
 *    §12.13's empty states are the model: the reader is told the truth about a
 *    missing capability, and everything else keeps working.
 *
 * Pure: `resolveSupabaseEnv` is a total function from three strings to a
 * result, testable in node with no DOM and no environment (§12.14.2).
 * `supabaseEnv` is the thin, untestable-by-design shim that reads the three
 * literals Next inlines at build time.
 */

/**
 * The raw strings as they arrive: `undefined` for an unset variable, which is
 * what `process.env.X` yields in node and what Next inlines for a variable
 * that was not present when the bundle was built.
 */
export interface RawSupabaseEnv {
  url: string | undefined
  anonKey: string | undefined
  authEnabled: string | undefined
}

/**
 * Why this build has no backend. Each value is something a maintainer can act
 * on without reading the code, which is the whole reason the result is typed
 * rather than a bare `null`:
 *
 * - `flagOff`     — deliberate, and the default. No auth UI renders (§14.1).
 * - `missingUrl` / `missingKey` — the flag was turned on but the deploy did not
 *   carry the values. This is a misconfiguration and worth saying out loud,
 *   because silently behaving like `flagOff` is how a broken deploy survives.
 * - `malformedUrl` — present but not an absolute http(s) URL, so `createClient`
 *   would either throw or aim requests at nothing.
 */
export type SupabaseUnavailable = 'flagOff' | 'missingUrl' | 'missingKey' | 'malformedUrl'

export type SupabaseEnv =
  | { kind: 'ready'; url: string; anonKey: string }
  | { kind: 'unavailable'; why: SupabaseUnavailable }

/**
 * The only strings that turn the kill switch ON. An allow-list, not a
 * truthiness test: `NEXT_PUBLIC_AUTH_ENABLED=false` and
 * `NEXT_PUBLIC_AUTH_ENABLED=0` are non-empty strings and would both be truthy,
 * which is the exact mistake this list exists to make impossible.
 */
const TRUE_VALUES: readonly string[] = ['1', 'true', 'yes', 'on']

/**
 * The URL must be absolute and http(s). `http` is allowed because a local
 * Supabase stack serves `http://127.0.0.1:54321`; production DNS is checked by
 * §14.1's precondition, not by a regex here.
 *
 * `new URL` is inside a try/catch: it throws on anything it cannot parse, and a
 * throw is the one thing this module promised never to do.
 */
function isUsableUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/** Trims and treats whitespace-only as absent — a CI variable set to `""`. */
function present(value: string | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * The flag is checked FIRST and short-circuits everything else. That ordering
 * is the kill switch: with the flag off it does not matter whether the URL and
 * key are present and valid, and it must not matter — otherwise a preview
 * deploy that happens to carry the secrets would light up auth on the shared
 * origin, which is precisely the failure §14.1 forbids.
 */
export function resolveSupabaseEnv(raw: RawSupabaseEnv): SupabaseEnv {
  const flag = present(raw.authEnabled)
  if (flag === null || !TRUE_VALUES.includes(flag.toLowerCase())) {
    return { kind: 'unavailable', why: 'flagOff' }
  }

  const url = present(raw.url)
  if (url === null) return { kind: 'unavailable', why: 'missingUrl' }
  if (!isUsableUrl(url)) return { kind: 'unavailable', why: 'malformedUrl' }

  const anonKey = present(raw.anonKey)
  if (anonKey === null) return { kind: 'unavailable', why: 'missingKey' }

  return { kind: 'ready', url, anonKey }
}

/**
 * Reads the three variables and resolves them.
 *
 * The three `process.env.NEXT_PUBLIC_*` reads are written out as literal member
 * expressions and must stay that way: Next's bundler performs a TEXTUAL
 * substitution of exactly this form, so `process.env[name]` or any destructuring
 * of `process.env` compiles to a lookup on an object that does not exist in the
 * browser. This is also why the shim is separate from the logic above — the
 * logic is tested, and this function is just the three inlined constants.
 *
 * Cheap and side-effect free, so callers may call it per render rather than
 * caching a module-scope value; a module-scope constant would also freeze the
 * result at first import, which makes it untestable and hides a misconfiguration
 * behind a stale value.
 */
export function supabaseEnv(): SupabaseEnv {
  return resolveSupabaseEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    authEnabled: process.env.NEXT_PUBLIC_AUTH_ENABLED,
  })
}

/**
 * §14.1 — the single question the UI asks: may any auth affordance render at
 * all? A component must never answer it by testing for the key itself, or the
 * kill switch acquires a second, weaker definition.
 */
export function isAuthEnabled(env: SupabaseEnv = supabaseEnv()): boolean {
  return env.kind === 'ready'
}
