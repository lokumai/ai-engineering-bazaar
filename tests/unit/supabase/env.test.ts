/**
 * §14.1 — the kill switch and the "never throw at import time" rule are the two
 * things in `env.ts` that a mistake would make expensive, so they are the two
 * things covered here in full.
 *
 * `resolveSupabaseEnv` is pure, so most of this runs with no environment at all.
 * The `supabaseEnv()` block mutates `process.env` and restores it, because the
 * literal `process.env.NEXT_PUBLIC_*` reads are the part a refactor could break
 * without any pure test noticing.
 */

import { afterEach, describe, expect, it } from 'vitest'
import {
  isAuthEnabled,
  resolveSupabaseEnv,
  supabaseEnv,
  type RawSupabaseEnv,
} from '@/lib/supabase/env'

const URL_OK = 'https://abcdefghijklm.supabase.co'
const KEY_OK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon.public-by-design'

function raw(overrides: Partial<RawSupabaseEnv> = {}): RawSupabaseEnv {
  return { url: URL_OK, anonKey: KEY_OK, authEnabled: 'true', ...overrides }
}

describe('resolveSupabaseEnv — fully configured', () => {
  it('reports ready and passes the two values through untouched', () => {
    expect(resolveSupabaseEnv(raw())).toEqual({ kind: 'ready', url: URL_OK, anonKey: KEY_OK })
  })

  it('trims surrounding whitespace, which a CI secret commonly carries', () => {
    const env = resolveSupabaseEnv(raw({ url: `  ${URL_OK}\n`, anonKey: ` ${KEY_OK} ` }))
    expect(env).toEqual({ kind: 'ready', url: URL_OK, anonKey: KEY_OK })
  })

  it('accepts a local Supabase stack over http', () => {
    const env = resolveSupabaseEnv(raw({ url: 'http://127.0.0.1:54321' }))
    expect(env.kind).toBe('ready')
  })

  it.each(['1', 'true', 'TRUE', 'yes', 'on'])('treats %s as on', (flag) => {
    expect(resolveSupabaseEnv(raw({ authEnabled: flag })).kind).toBe('ready')
  })
})

describe('resolveSupabaseEnv — the kill switch (§14.1)', () => {
  it('is off when the flag is absent, even with everything else present', () => {
    // The default. A deploy that forgets the flag ships the safe build.
    expect(resolveSupabaseEnv(raw({ authEnabled: undefined }))).toEqual({
      kind: 'unavailable',
      why: 'flagOff',
    })
  })

  it.each(['false', '0', 'no', 'off', '', '   ', 'maybe'])(
    'is off for %j — an allow-list, not a truthiness test',
    (flag) => {
      expect(resolveSupabaseEnv(raw({ authEnabled: flag }))).toEqual({
        kind: 'unavailable',
        why: 'flagOff',
      })
    },
  )

  it('wins over a valid url and key — the precedence IS the kill switch', () => {
    // A preview deploy that happens to carry the secrets must not light up auth
    // on the shared `lokumai.github.io` origin.
    const env = resolveSupabaseEnv({ url: URL_OK, anonKey: KEY_OK, authEnabled: 'false' })
    expect(env).toEqual({ kind: 'unavailable', why: 'flagOff' })
  })

  it('reports flagOff rather than a missing value when both are wrong', () => {
    const env = resolveSupabaseEnv({ url: undefined, anonKey: undefined, authEnabled: undefined })
    expect(env).toEqual({ kind: 'unavailable', why: 'flagOff' })
  })
})

describe('resolveSupabaseEnv — each variable missing', () => {
  it('names the missing url', () => {
    expect(resolveSupabaseEnv(raw({ url: undefined }))).toEqual({
      kind: 'unavailable',
      why: 'missingUrl',
    })
  })

  it('treats an empty url as missing, not malformed', () => {
    expect(resolveSupabaseEnv(raw({ url: '   ' }))).toEqual({
      kind: 'unavailable',
      why: 'missingUrl',
    })
  })

  it('names the missing key', () => {
    expect(resolveSupabaseEnv(raw({ anonKey: undefined }))).toEqual({
      kind: 'unavailable',
      why: 'missingKey',
    })
  })

  it('treats an empty key as missing', () => {
    expect(resolveSupabaseEnv(raw({ anonKey: '' }))).toEqual({
      kind: 'unavailable',
      why: 'missingKey',
    })
  })

  it.each([
    'abcdefghijklm.supabase.co',
    '//abcdefghijklm.supabase.co',
    'ftp://abcdefghijklm.supabase.co',
    'not a url at all',
    'https://',
  ])('rejects %j as malformed', (url) => {
    expect(resolveSupabaseEnv(raw({ url }))).toEqual({
      kind: 'unavailable',
      why: 'malformedUrl',
    })
  })
})

describe('nothing throws (§14.1 — a static export prerenders every module)', () => {
  const hostile: unknown[] = [
    undefined,
    '',
    '   ',
    'https://',
    'http://[',
    'javascript:alert(1)',
    'data:text/plain,x',
    'https://ok.example.com/'.repeat(500),
    '{}',
  ]

  it('survives every combination of hostile values in every slot', () => {
    for (const url of hostile) {
      for (const anonKey of hostile) {
        for (const authEnabled of [...hostile, 'true', '1']) {
          const input = {
            url: url as string | undefined,
            anonKey: anonKey as string | undefined,
            authEnabled: authEnabled as string | undefined,
          }
          expect(() => resolveSupabaseEnv(input)).not.toThrow()
          const env = resolveSupabaseEnv(input)
          expect(env.kind === 'ready' || env.kind === 'unavailable').toBe(true)
        }
      }
    }
  })

  it('accepts values that are not strings at all without throwing', () => {
    const nonsense = [null, 0, 1, {}, [], true, Symbol('x'), () => {}, NaN]
    for (const value of nonsense) {
      const input = {
        url: value as unknown as string | undefined,
        anonKey: value as unknown as string | undefined,
        authEnabled: value as unknown as string | undefined,
      }
      expect(() => resolveSupabaseEnv(input)).not.toThrow()
      expect(resolveSupabaseEnv(input).kind).toBe('unavailable')
    }
  })
})

describe('isAuthEnabled', () => {
  it('is true only for a ready env', () => {
    expect(isAuthEnabled({ kind: 'ready', url: URL_OK, anonKey: KEY_OK })).toBe(true)
    expect(isAuthEnabled({ kind: 'unavailable', why: 'flagOff' })).toBe(false)
    expect(isAuthEnabled({ kind: 'unavailable', why: 'missingKey' })).toBe(false)
  })
})

describe('supabaseEnv — the three inlined reads', () => {
  const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_AUTH_ENABLED',
  ] as const
  const saved = new Map(keys.map((key) => [key, process.env[key]]))

  afterEach(() => {
    for (const key of keys) {
      const value = saved.get(key)
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('reads all three and reports ready', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL_OK
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = KEY_OK
    process.env.NEXT_PUBLIC_AUTH_ENABLED = '1'
    expect(supabaseEnv()).toEqual({ kind: 'ready', url: URL_OK, anonKey: KEY_OK })
  })

  it('is off with nothing set, and does not throw', () => {
    for (const key of keys) delete process.env[key]
    expect(() => supabaseEnv()).not.toThrow()
    expect(supabaseEnv()).toEqual({ kind: 'unavailable', why: 'flagOff' })
  })

  it('is not cached at module scope — a later change is seen', () => {
    for (const key of keys) delete process.env[key]
    expect(supabaseEnv().kind).toBe('unavailable')
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL_OK
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = KEY_OK
    process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true'
    expect(supabaseEnv().kind).toBe('ready')
  })
})
