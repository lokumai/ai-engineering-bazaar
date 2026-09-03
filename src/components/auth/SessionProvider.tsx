'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { type SessionView, viewFromSession } from '@/lib/auth/session'
import { supabaseBrowser } from '@/lib/supabase/client'
import { supabaseEnv } from '@/lib/supabase/env'

/**
 * §14.7, §12.2 Channel B — the session as React context, and an island that no
 * page's first paint may depend on.
 *
 * **The constraint, stated as a constraint.** §12.2 splits the site into
 * channel A (read synchronously from `localStorage` before the first frame,
 * because a stamp on `<html>` cannot flicker) and channel B (everything that
 * arrives after mount). A session is unavoidably channel B: `getSession()` is a
 * promise, it may touch the network to refresh a token, and §14.7.1 puts it
 * plainly — "the network never influences the first paint. This is not a
 * preference, it is the constraint §12.2 imposes: a `fetch` cannot be
 * synchronous." So this provider renders its children on the very first pass
 * with `status: 'unknown'`, identically on the server and in the browser, and
 * the 32 sheets prerender byte-for-byte the same whether or not anyone is
 * signed in.
 *
 * That is why `unknown` exists in `SessionView` at all, and why no component
 * may collapse it into "signed out". Rendering "not signed in" for the first
 * tick and then "signed in" is a page stating something it does not know
 * (§11.25) and it also makes hydration a lie waiting for a slow network.
 *
 * **Why `disabled` is computed during render and `unknown` is not.**
 * `supabaseEnv()` reads three constants Next inlined at build time; it is
 * deterministic and identical in node and in the browser, so resolving it in
 * the initial state is safe and gives a build with no backend its honest answer
 * in the first frame instead of a flash of "checking". A session, by contrast,
 * lives in `localStorage`, which the server cannot see — so it starts
 * `unknown` and only an effect may change it.
 *
 * **Why `useSession()` returns `null` when unmounted.** A panel dropped onto a
 * page whose author forgot the provider is a wiring bug, not a reader-facing
 * state, and the two must not be confused: returning a permanent `unknown`
 * would leave the panel truthfully saying "checking…" forever, which is the
 * most expensive kind of quiet failure. `null` lets the panel say what is
 * actually true — no session is being tracked here — and lets a test assert it.
 *
 * **Nesting is safe.** `supabaseBrowser()` caches one client, so two providers
 * share one auth client, one refresh timer and one storage key. That is what
 * lets `AuthPanels` carry its own provider (so a page needs one tag) without
 * risking the double-refresh race `client.ts` warns about.
 */

export interface SessionContextValue {
  view: SessionView
  /**
   * Sign out of this browser. Resolves when supabase-js has cleared the stored
   * session; the view updates from `onAuthStateChange`, not from here, so the
   * claim on screen always follows the library's own state rather than an
   * optimistic guess about it.
   */
  signOut(): Promise<void>
  /** Re-ask. Used after a flow this tab did not initiate (a link in another tab). */
  refresh(): Promise<void>
  /**
   * The last error from a session call, described plainly, or null. A failed
   * `getSession()` is not "signed out" — it is not knowing, and §1 says the
   * difference has to be visible.
   */
  error: string | null
}

const SessionContext = createContext<SessionContextValue | null>(null)

/** Returns null when no `SessionProvider` is mounted above the caller. */
export function useSession(): SessionContextValue | null {
  return useContext(SessionContext)
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  /**
   * The initial value is a pure function of build-time constants, so the server
   * render and the first client render agree without `suppressHydrationWarning`
   * — which `ProfilePanels.tsx` records is useless here anyway, since it works
   * one level deep and React will not patch mismatched text.
   */
  const [view, setView] = useState<SessionView>(() => {
    const env = supabaseEnv()
    return env.kind === 'ready' ? { status: 'unknown' } : { status: 'disabled', why: env.why }
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const client = supabaseBrowser()
    if (client === null) {
      // No backend in this build, or no browser. `disabled` is already the
      // initial state; setting it again here would be the only way a
      // misconfiguration that appears only at runtime could still be told.
      const env = supabaseEnv()
      if (env.kind !== 'ready') setView({ status: 'disabled', why: env.why })
      return
    }

    let live = true
    // Bound to a new const so the narrowing above survives into the closures:
    // TypeScript does not carry a narrowing of an outer binding into a hoisted
    // function declaration, and the alternative is a `!` that would outlive the
    // reason it was safe.
    const auth = client.auth

    async function ask(): Promise<void> {
      try {
        const { data, error: failure } = await auth.getSession()
        if (!live) return
        if (failure !== null) {
          // Stay `unknown`. A read that failed tells us nothing about whether a
          // session exists, and answering `signedOut` would sign a reader out
          // of a page on the strength of a network hiccup.
          setError(failure.message)
          return
        }
        setError(null)
        setView(viewFromSession(data.session, Date.now()))
      } catch (thrown) {
        if (!live) return
        setError(thrown instanceof Error ? thrown.message : 'Session could not be read.')
      }
    }

    void ask()

    /**
     * The subscription is what keeps this true for the rest of the session, and
     * it is not optional: supabase-js refreshes tokens on a timer, another tab
     * may sign in or out against the same storage key, and the callback page
     * completes its exchange in a different route. `RecordStateSync.tsx` makes
     * the same argument for channel A — one read on mount freezes at whatever
     * was true when the document loaded, and every navigation here is a client
     * transition.
     */
    const { data: listener } = auth.onAuthStateChange((_event, session) => {
      if (!live) return
      setError(null)
      setView(viewFromSession(session, Date.now()))
    })

    return () => {
      live = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    const client = supabaseBrowser()
    if (client === null) return
    const { error: failure } = await client.auth.signOut()
    if (failure !== null) {
      // The session may or may not be gone. Saying so is the only honest
      // option: the panel keeps showing the session it can still see, plus
      // this. Pretending it worked would leave a signed-in browser looking
      // signed out, which is how a shared machine leaks an account.
      setError(failure.message)
    }
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    const client = supabaseBrowser()
    if (client === null) return
    const { data, error: failure } = await client.auth.getSession()
    if (failure !== null) {
      setError(failure.message)
      return
    }
    setError(null)
    setView(viewFromSession(data.session, Date.now()))
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({ view, signOut, refresh, error }),
    [view, signOut, refresh, error],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
