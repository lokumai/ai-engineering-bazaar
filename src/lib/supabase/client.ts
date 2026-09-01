/**
 * §14.7.1 — "one client instance, reads `NEXT_PUBLIC_*`". This is that module,
 * and it is the only place in the codebase that calls `createClient`.
 *
 * Why one instance, lazily: `createClient` is not inert. Constructing it
 * installs an auth client that reads `localStorage`, starts a token-refresh
 * timer, and (with `detectSessionInUrl`) inspects `window.location`. Two
 * instances means two refresh loops racing over the same storage key, which is
 * how a session gets clobbered on a page with more than one island. And a
 * construction at MODULE SCOPE would run during prerender: `next build` with
 * `output: 'export'` evaluates every module in node to render all 32 sheets, so
 * a module-scope client would touch a `window` that does not exist and drag a
 * timer into the build. §12.2's Channel A/B split says the same thing from the
 * other side — the network never influences the first paint, and nothing here
 * may be reached from a render path.
 *
 * Everything the app does with a record goes through `RemoteRecordStore`
 * (`lib/record/wire.ts`), so `sync.ts` never imports this file and stays
 * testable in node against a fake. This module's job is narrow: hand back a
 * configured client, or `null`.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseEnv } from './env'

/**
 * Module-scope CACHE, not a module-scope client: nothing happens until the
 * first call, and the first call only ever happens from an effect or an event
 * handler in the browser.
 */
let cached: SupabaseClient | null = null

/**
 * The client for this browser, or `null` when this build has no backend
 * (`env.ts`: the kill switch is off, or the config is missing/malformed) or
 * when there is no browser at all.
 *
 * Returning `null` rather than throwing is the §14.1/§12.13 stance carried one
 * layer up: a page that cannot reach an account renders the truth about that
 * and keeps working. A throw here would take the prerender of the entire site
 * with it.
 */
export function supabaseBrowser(): SupabaseClient | null {
  // Not a render-time read — the same rule `storage.ts::safeStorage` states:
  // §12.2 forbids `typeof window` in a render path, and this is only reachable
  // from an effect or a handler. The guard is here so that a mistake elsewhere
  // degrades to "no client" instead of breaking the static export.
  if (typeof window === 'undefined') return null

  if (cached !== null) return cached

  const env = supabaseEnv()
  if (env.kind !== 'ready') return null

  cached = createClient(env.url, env.publishableKey, {
    auth: {
      // PKCE, not the implicit flow (which is still supabase-js's default).
      // The implicit flow puts the access token in the URL fragment, where it
      // lands in history, in a copied link, and in anything that reads
      // `location.hash` — on a site that is 32 shareable sheets that is a real
      // exposure, not a theoretical one. PKCE returns a single-use code
      // instead. It needs no server, which is why it is available to a static
      // export at all.
      flowType: 'pkce',
      // supabase-js owns the session, and owns the key it stores it under.
      // Deliberately NOT given an `hl-*` name: the stored value's shape,
      // rotation, and cross-tab coordination are the library's, and naming the
      // key here would create a second apparent owner of a record this
      // codebase must never parse or write. §12.1.1's "one module names the
      // key" rule is honoured by having no second implementation, not by
      // renaming someone else's.
      persistSession: true,
      autoRefreshToken: true,
      // Required for the OAuth/magic-link return trip: the callback lands on a
      // static page and the exchange happens client-side. There is no route
      // handler to do it, by construction (§14.0/8 — no functions).
      detectSessionInUrl: true,
    },
  })
  return cached
}
