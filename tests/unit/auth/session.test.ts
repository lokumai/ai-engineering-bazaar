/**
 * §14.7, §14.12 — every decision in `lib/auth/session.ts`, held still.
 *
 * The four things worth the most coverage here are the four that fail silently
 * in production: an expired session printed as SIGNED IN, a `?next=` that
 * redirects off-site, an error reported only in the URL fragment (so a
 * query-only reader shows a blank page), and a GitHub handle read from a place
 * the user can write. Each gets its own block, and each block is written as the
 * failure it prevents rather than as the branch it covers.
 *
 * No DOM, no supabase-js, no environment (§12.14.2). The `RawSession` /
 * `RawUser` fixtures below are the structural types the module declares, which
 * is the whole reason it declares them.
 */

import { describe, expect, it } from 'vitest'
import {
  CALLBACK_TIMEOUT_MS,
  DEFAULT_RETURN_PATH,
  EXPIRY_SKEW_SECONDS,
  RETURN_PARAM,
  SIGN_IN_PROVIDERS,
  callbackUrl,
  describeAuthError,
  describeSessionUser,
  githubLoginOf,
  isPlausibleEmail,
  isSessionUsable,
  parseCallbackUrl,
  planCallback,
  providerOf,
  sanitiseReturnPath,
  viewFromSession,
  type RawSession,
} from '@/lib/auth/session'

const NOW_MS = 1_756_000_000_000
const NOW_S = NOW_MS / 1000

function session(overrides: Partial<RawSession> = {}): RawSession {
  return {
    user: { id: 'e7d3f2a1-0000-4000-8000-000000000001', email: 'reader@example.com' },
    expires_at: NOW_S + 3600,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------

describe('isSessionUsable', () => {
  it('accepts a session that is comfortably live', () => {
    expect(isSessionUsable(session(), NOW_MS)).toBe(true)
  })

  it('rejects null — there is nothing to make a claim on', () => {
    expect(isSessionUsable(null, NOW_MS)).toBe(false)
  })

  it('rejects an expired session rather than printing SIGNED IN over a dead token', () => {
    expect(isSessionUsable(session({ expires_at: NOW_S - 1 }), NOW_MS)).toBe(false)
  })

  it('rejects a session inside the skew window, where the next request would fail', () => {
    const inside = NOW_S + EXPIRY_SKEW_SECONDS - 1
    expect(isSessionUsable(session({ expires_at: inside }), NOW_MS)).toBe(false)
  })

  it('accepts a session just outside the skew window', () => {
    const outside = NOW_S + EXPIRY_SKEW_SECONDS + 1
    expect(isSessionUsable(session({ expires_at: outside }), NOW_MS)).toBe(true)
  })

  it.each([undefined, null, Number.NaN])(
    'treats a missing or unusable expiry (%s) as live, not as expired',
    (expires) => {
      expect(isSessionUsable(session({ expires_at: expires as never }), NOW_MS)).toBe(true)
    },
  )

  it('rejects a session with no user id — a record keyed on nobody', () => {
    expect(isSessionUsable(session({ user: { id: '' } }), NOW_MS)).toBe(false)
  })
})

describe('viewFromSession', () => {
  it('reports signedOut for an expired session and never an expired signedIn', () => {
    expect(viewFromSession(session({ expires_at: NOW_S - 10 }), NOW_MS)).toEqual({
      status: 'signedOut',
    })
  })

  it('carries the projection and the expiry through for a live session', () => {
    const view = viewFromSession(session(), NOW_MS)
    expect(view.status).toBe('signedIn')
    if (view.status !== 'signedIn') throw new Error('unreachable')
    expect(view.user.email).toBe('reader@example.com')
    expect(view.expiresAt).toBe(NOW_S + 3600)
  })

  it('reports a null expiry rather than inventing one', () => {
    const view = viewFromSession(session({ expires_at: null }), NOW_MS)
    if (view.status !== 'signedIn') throw new Error('unreachable')
    expect(view.expiresAt).toBeNull()
  })
})

// ---------------------------------------------------------------------------

describe('githubLoginOf — §14.8.2, the handle must come from the provider', () => {
  it('reads user_name out of the github identity', () => {
    const login = githubLoginOf({
      id: 'u',
      identities: [{ provider: 'github', identity_data: { user_name: 'cevheri' } }],
    })
    expect(login).toBe('cevheri')
  })

  it('falls back to preferred_username, which some provider versions send instead', () => {
    const login = githubLoginOf({
      id: 'u',
      identities: [{ provider: 'github', identity_data: { preferred_username: 'cevheri' } }],
    })
    expect(login).toBe('cevheri')
  })

  it('returns null when the account has no github identity', () => {
    expect(githubLoginOf({ id: 'u', identities: [{ provider: 'google' }] })).toBeNull()
  })

  it('returns null for a github identity that reported no handle', () => {
    expect(
      githubLoginOf({ id: 'u', identities: [{ provider: 'github', identity_data: {} }] }),
    ).toBeNull()
  })

  it('ignores a non-string handle rather than printing an object', () => {
    expect(
      githubLoginOf({
        id: 'u',
        identities: [{ provider: 'github', identity_data: { user_name: 42 } }],
      }),
    ).toBeNull()
  })

  it('survives a session with no identities array at all', () => {
    expect(githubLoginOf({ id: 'u' })).toBeNull()
  })
})

describe('providerOf', () => {
  it('names the first linked identity', () => {
    expect(providerOf({ id: 'u', identities: [{ provider: 'github' }] })).toBe('github')
  })

  it('is null rather than guessed when nothing is linked', () => {
    expect(providerOf({ id: 'u', identities: [] })).toBeNull()
  })
})

describe('describeSessionUser', () => {
  it('normalises an empty email to null, so no panel prints an empty address', () => {
    expect(describeSessionUser({ id: 'u', email: '' }).email).toBeNull()
  })

  it('projects the four fields and nothing else', () => {
    expect(
      describeSessionUser({
        id: 'u',
        email: 'a@b.co',
        identities: [{ provider: 'github', identity_data: { user_name: 'x' } }],
      }),
    ).toEqual({ id: 'u', email: 'a@b.co', githubLogin: 'x', provider: 'github' })
  })
})

// ---------------------------------------------------------------------------

describe('sanitiseReturnPath — the open-redirect guard', () => {
  it('keeps an in-app path, including its query and fragment', () => {
    expect(sanitiseReturnPath('/courses/fundamentals/llms/?a=1#quiz')).toBe(
      '/courses/fundamentals/llms/?a=1#quiz',
    )
  })

  it.each([
    'https://evil.example/',
    'http://evil.example/',
    '//evil.example/',
    '/\\evil.example/',
    'javascript:alert(1)',
    'data:text/html,x',
    'profile/',
    '',
    '   ',
  ])('refuses %s and falls back to the default', (value) => {
    expect(sanitiseReturnPath(value)).toBe(DEFAULT_RETURN_PATH)
  })

  it('refuses a path carrying a control character (header/response smuggling)', () => {
    expect(sanitiseReturnPath('/profile/\r\nX-Injected: 1')).toBe(DEFAULT_RETURN_PATH)
  })

  it.each([null, undefined])('falls back for %s', (value) => {
    expect(sanitiseReturnPath(value)).toBe(DEFAULT_RETURN_PATH)
  })
})

describe('callbackUrl', () => {
  it('builds an absolute URL on the base-path-resolved callback route', () => {
    const url = callbackUrl('https://bazaar.lokumai.com', '/auth/callback/', '/profile/')
    expect(url).toBe('https://bazaar.lokumai.com/auth/callback/')
  })

  it('honours a base path, because the callback is served under it on Pages', () => {
    const url = callbackUrl(
      'https://lokumai.github.io',
      '/ai-minicourses/auth/callback/',
      '/profile/',
    )
    expect(url).toBe('https://lokumai.github.io/ai-minicourses/auth/callback/')
  })

  it('carries a non-default return path as a query parameter', () => {
    const url = callbackUrl('https://x.test', '/auth/callback/', '/courses/a/b/')
    expect(url).toBe(`https://x.test/auth/callback/?${RETURN_PARAM}=%2Fcourses%2Fa%2Fb%2F`)
  })

  it('never carries a hostile return path across the round trip', () => {
    const url = callbackUrl('https://x.test', '/auth/callback/', 'https://evil.example/')
    expect(url).toBe('https://x.test/auth/callback/')
  })
})

// ---------------------------------------------------------------------------

describe('parseCallbackUrl — the query AND the fragment', () => {
  it('reads a PKCE code out of the query', () => {
    expect(parseCallbackUrl('https://x.test/auth/callback/?code=abc').code).toBe('abc')
  })

  it('reads an error out of the fragment, where an expired magic link reports it', () => {
    const params = parseCallbackUrl(
      'https://x.test/auth/callback/#error=access_denied&error_code=otp_expired',
    )
    expect(params.error).toBe('access_denied')
    expect(params.errorCode).toBe('otp_expired')
  })

  it('sanitises the return path on arrival, having crossed two foreign systems', () => {
    const params = parseCallbackUrl('https://x.test/auth/callback/?next=//evil.example/')
    expect(params.returnPath).toBe(DEFAULT_RETURN_PATH)
  })

  it('prefers the query where both carry the same key', () => {
    const params = parseCallbackUrl('https://x.test/auth/callback/?code=q#code=h')
    expect(params.code).toBe('q')
  })

  it('reports every field as null on a bare visit', () => {
    const params = parseCallbackUrl('https://x.test/auth/callback/')
    expect(params).toEqual({
      code: null,
      // §14.7 — the implicit pair Supabase returns when the browser opening the
      // link is not the one that asked for it.
      accessToken: null,
      refreshToken: null,
      error: null,
      errorCode: null,
      errorDescription: null,
      returnPath: DEFAULT_RETURN_PATH,
    })
  })

  it('reads the implicit pair out of the fragment (§14.7)', () => {
    // MEASURED against a real project: `flowType: 'pkce'` does not make every
    // return trip a PKCE one. The verifier lives in the browser that ASKED, and
    // an emailed link is very often opened somewhere else — requested on a
    // laptop, tapped on a phone. Supabase then redirects with the tokens in the
    // fragment instead of a code, and before this the callback waited for a
    // code that was never coming and timed out on a sign-in that had succeeded.
    const params = parseCallbackUrl(
      'https://x.test/auth/callback/#access_token=at-123&refresh_token=rt-456'
        + '&expires_in=3600&token_type=bearer&type=magiclink',
    )
    expect(params.code).toBeNull()
    expect(params.accessToken).toBe('at-123')
    expect(params.refreshToken).toBe('rt-456')

    const plan = planCallback(
      'https://x.test/auth/callback/#access_token=at-123&refresh_token=rt-456',
    )
    expect(plan).toEqual({
      kind: 'adopt',
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      returnPath: DEFAULT_RETURN_PATH,
    })
  })

  it('half a pair is not a session: one token alone plans nothing', () => {
    // A fragment carrying only an access token cannot be adopted — `setSession`
    // needs both, and adopting with a missing refresh token would produce a
    // session that dies at the first refresh with no way to explain itself.
    expect(planCallback('https://x.test/auth/callback/#access_token=at-123').kind).toBe(
      'nothing',
    )
    expect(planCallback('https://x.test/auth/callback/#refresh_token=rt-456').kind).toBe(
      'nothing',
    )
  })

  it('a code wins over a fragment pair: the exchange leaves no token in the URL', () => {
    expect(
      planCallback('https://x.test/auth/callback/?code=abc#access_token=at&refresh_token=rt')
        .kind,
    ).toBe('await')
  })

  it('does not throw on an unparseable href', () => {
    expect(parseCallbackUrl('not a url').code).toBeNull()
  })

  it('is not confused by a plain anchor fragment', () => {
    expect(parseCallbackUrl('https://x.test/auth/callback/#main').error).toBeNull()
  })
})

describe('describeAuthError', () => {
  it('is null when nothing failed — an error object must not be invented', () => {
    expect(describeAuthError({ error: null, errorCode: null })).toBeNull()
  })

  it('names an expired link as expired, the most common failure in this flow', () => {
    const described = describeAuthError({ error: 'access_denied', errorCode: 'otp_expired' })
    expect(described?.readout).toContain('EXPIRED')
    expect(described?.note).toContain('new')
  })

  it('describes a cancelled consent as cancelled, not as an error', () => {
    const described = describeAuthError({ error: 'access_denied', errorCode: null })
    expect(described?.readout).toBe('SIGN-IN CANCELLED')
  })

  it('puts a provider failure on the provider', () => {
    const described = describeAuthError({ error: 'server_error', errorCode: null })
    expect(described?.readout).toContain('PROVIDER')
  })

  it('keeps an unrecognised code in the readout so a screenshot is still useful', () => {
    const described = describeAuthError({ error: null, errorCode: 'flux_capacitor' })
    expect(described?.readout).toContain('FLUX_CAPACITOR')
  })

  it('never prints the provider description as the advice', () => {
    const described = describeAuthError({ error: 'bad_oauth_state', errorCode: null })
    expect(described?.note).toContain('nothing was changed')
  })
})

describe('planCallback', () => {
  it('waits when there is a code to exchange', () => {
    expect(planCallback('https://x.test/auth/callback/?code=abc')).toEqual({
      kind: 'await',
      returnPath: DEFAULT_RETURN_PATH,
    })
  })

  it('reports an error even when a code is also present — the error wins', () => {
    const plan = planCallback('https://x.test/auth/callback/?code=abc&error=server_error')
    expect(plan.kind).toBe('error')
  })

  it('calls a bare visit nothing-to-complete rather than an error', () => {
    expect(planCallback('https://x.test/auth/callback/').kind).toBe('nothing')
  })

  it('carries the sanitised return path into every plan', () => {
    const plan = planCallback('https://x.test/auth/callback/?code=a&next=%2Fpath%2F')
    expect(plan.returnPath).toBe('/path/')
  })
})

// ---------------------------------------------------------------------------

describe('isPlausibleEmail', () => {
  it.each(['a@b.co', 'reader+tag@example.com', 'x.y@sub.domain.example'])(
    'accepts %s',
    (value) => {
      expect(isPlausibleEmail(value)).toBe(true)
    },
  )

  it.each(['', '   ', 'nobody', 'a@b', '@b.co', 'a@@b.co', 'a b@c.co', 'a@.co', 'a@b.'])(
    'refuses %s, which would cost a round trip and tell the reader nothing',
    (value) => {
      expect(isPlausibleEmail(value)).toBe(false)
    },
  )

  it('trims, because a pasted address commonly carries whitespace', () => {
    expect(isPlausibleEmail('  a@b.co  ')).toBe(true)
  })

  it('refuses an address longer than the 254-octet limit', () => {
    expect(isPlausibleEmail(`${'a'.repeat(250)}@b.co`)).toBe(false)
  })
})

describe('the constants a panel must not re-type', () => {
  it('puts GitHub first and gives it the only note — §14.8.2', () => {
    expect(SIGN_IN_PROVIDERS[0].id).toBe('github')
    expect(SIGN_IN_PROVIDERS[0].note).toContain('verified')
    expect(SIGN_IN_PROVIDERS.slice(1).every((p) => p.note === null)).toBe(true)
  })

  it('offers exactly the three providers §14.7 names', () => {
    expect(SIGN_IN_PROVIDERS.map((p) => p.id)).toEqual(['github', 'google', 'email'])
  })

  it('bounds the callback wait, so no reader watches a spinner forever', () => {
    expect(CALLBACK_TIMEOUT_MS).toBeGreaterThan(1000)
    expect(CALLBACK_TIMEOUT_MS).toBeLessThanOrEqual(30_000)
  })

  it('returns readers to the sheet that actually holds their record', () => {
    expect(DEFAULT_RETURN_PATH).toBe('/profile/')
  })
})
