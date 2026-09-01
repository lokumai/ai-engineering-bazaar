/**
 * §14 — fixtures for the account tests, in a real browser against a real project.
 *
 * ## Why a magic link and not a password
 *
 * `/sign-in/` offers GitHub, Google and an email link (§14.7). There is no
 * password field, so a test that signs in with a password would be exercising a
 * path the product does not have. `generateLink` produces the real link Supabase
 * would have mailed, and following it in the browser runs the real verification
 * and the real `/auth/callback/` — including the redirect, the token exchange
 * and the session write. The only thing skipped is the mail delivery.
 *
 * ## Why the service key is here and nowhere else
 *
 * Seeding users, orgs and managers needs privileges no client has, by design:
 * §14.4.1 and §14.4.4 give `org_manager` and `orgs` no insert policy at all,
 * because appointing a manager is not something the app does. The service key
 * bypasses RLS, which is exactly what a fixture needs and exactly what §14.10
 * forbids in the browser bundle and in Metabase. It is read here from the
 * environment of the TEST PROCESS and never reaches the page.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'

export interface AccountsEnv {
  url: string
  anon: string
  secret: string
  db: string
}

/**
 * The suite reads `.env.local` itself rather than relying on the ambient
 * environment: `next build` loads that file, so the build under test and the
 * fixtures are guaranteed to be pointed at the same project. Two different
 * projects would produce failures that look like policy bugs.
 */
export function accountsEnv(): AccountsEnv | null {
  let raw: string
  try {
    raw = readFileSync('.env.local', 'utf8')
  } catch {
    return null
  }
  const env: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq !== -1) env[t.slice(0, eq)] = t.slice(eq + 1).trim()
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const anon = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const secret = env.SUPABASE_SERVICE_ROLE_KEY
  const db = env.SUPABASE_DB_URL
  if (!url || !anon || !secret || !db) return null
  return { url, anon, secret, db }
}

/** Prefix on every fixture, so cleanup can never reach a real row. */
export const PREFIX = 'e2e-test-'
export const DOMAIN = 'e2e-test-org.example'

export interface Fixture {
  admin: SupabaseClient
  env: AccountsEnv
  orgId: string
  ids: Record<'learner' | 'colleague' | 'manager' | 'outsider' | 'eraser', string>
  emails: Record<'learner' | 'colleague' | 'manager' | 'outsider' | 'eraser', string>
}

export const EMAILS = {
  learner: `${PREFIX}learner@${DOMAIN}`,
  colleague: `${PREFIX}colleague@${DOMAIN}`,
  manager: `${PREFIX}manager@${DOMAIN}`,
  outsider: `${PREFIX}outsider@${DOMAIN}`,
  /**
   * §14.6's own user, in no organisation, signed in ONCE.
   *
   * The erase test cannot share `outsider`: it signs in, erases, and the erase
   * clears this browser — and a later test signing the same reader in again then
   * failed in `signInByLink` waiting for a session that never settled. A test
   * that destroys state needs a subject nothing else reads, and saying so in the
   * fixture is cheaper than the half hour it costs to rediscover.
   */
  eraser: `${PREFIX}eraser@${DOMAIN}`,
} as const

export function makeAdmin(env: AccountsEnv): SupabaseClient {
  return createClient(env.url, env.secret, { auth: { persistSession: false } })
}

function psql(env: AccountsEnv, text: string): string {
  try {
    // `-q` suppresses the command tag, which otherwise arrives glued to the
    // value a `returning` clause produced.
    return execFileSync('psql', [env.db, '-q', '-v', 'ON_ERROR_STOP=1', '-tAc', text], {
      encoding: 'utf8',
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (err) {
    // psql puts the whole connection URI, password included, in its error text.
    const raw = String((err as { stderr?: string })?.stderr ?? (err as Error)?.message ?? err)
    throw new Error(raw.split(env.db).join('<connection string redacted>').trim())
  }
}

export async function cleanup(env: AccountsEnv, admin: SupabaseClient): Promise<void> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith(PREFIX)) await admin.auth.admin.deleteUser(u.id)
  }
  psql(env, `delete from orgs where name like '${PREFIX}%'`)
}

/**
 * One org, three members (one of them its manager), one outsider, and §14.6's
 * own subject.
 *
 * The colleague exists so that "a manager sees the whole org" and "a learner
 * sees only themselves" are different numbers. Without a second member both
 * claims would be satisfied by the same single row.
 */
export async function seed(env: AccountsEnv): Promise<Fixture> {
  const admin = makeAdmin(env)
  await cleanup(env, admin)

  const ids = {} as Fixture['ids']
  for (const [role, email] of Object.entries(EMAILS) as [keyof typeof EMAILS, string][]) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (error) throw new Error(`createUser ${role}: ${error.message}`)
    ids[role] = data.user.id
  }

  const orgId = psql(
    env,
    `insert into orgs (name, join_domain) values ('${PREFIX}org', '${DOMAIN}') returning id`
  )
  psql(
    env,
    `insert into memberships (org_id, user_id) values
       ('${orgId}', '${ids.learner}'),
       ('${orgId}', '${ids.colleague}'),
       ('${orgId}', '${ids.manager}')`
  )
  psql(env, `insert into org_manager (org_id, user_id) values ('${orgId}', '${ids.manager}')`)
  psql(
    env,
    `insert into profiles (id, display_name) values
       ('${ids.learner}', 'E2E Learner'),
       ('${ids.colleague}', 'E2E Colleague'),
       ('${ids.manager}', 'E2E Manager')`
  )

  return { admin, env, orgId, ids, emails: { ...EMAILS } }
}

/**
 * Signs `email` in through the real link, in the real browser.
 *
 * `redirectTo` must be on the project's allow list or Supabase refuses the
 * redirect and lands on its own error page — which is why the list was set to
 * include both dev ports and the future custom domain.
 */
export async function signInByLink(
  page: Page,
  fixture: Fixture,
  email: string,
  baseURL: string
): Promise<void> {
  /*
    ONE RETRY, with a fresh link.

    A magic link is single-use and its verification is a redirect chain through
    GoTrue: link -> /auth/v1/verify -> the callback route -> `setSession`. Any
    hop can be dropped, and when it is, the session never appears and the wait
    below burns its whole budget. MEASURED over repeated runs of this suite: the
    stall is rare, is not specific to any test, and lands on whichever sign-in
    happens to hit it — it took out the manager test, the quiz test and the erase
    test on different runs. In `serial` mode one such stall reports as a failure
    plus a row of "did not run", so the test that gets blamed is chosen by
    timing rather than by what it asserts.

    A retry is honest here in a way that a longer timeout would not be. It is
    the same act performed again — sign this reader in — with a new link,
    because the first one is spent. It does not weaken any assertion: no test
    below asserts anything about how many links were minted, and a second stall
    still fails, loudly, naming the reader.
  */
  const attempt = async (): Promise<boolean> => {
    const { data, error } = await fixture.admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${baseURL}/auth/callback/` },
    })
    if (error) throw new Error(`generateLink ${email}: ${error.message}`)
    const link = data.properties?.action_link
    if (!link) throw new Error(`generateLink ${email}: no action_link`)

    await page.goto(link)
    // The callback exchanges the code and then returns the reader to the site,
    // so waiting for a session in storage is what "signed in" actually means.
    try {
      await page.waitForFunction(
        () => {
          try {
            return Object.keys(window.localStorage).some(
              (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
            )
          } catch {
            return false
          }
        },
        undefined,
        { timeout: 12_000 }
      )
      return true
    } catch {
      return false
    }
  }

  if (await attempt()) return
  if (await attempt()) return
  throw new Error(
    `signInByLink ${email}: no session after two links. The callback did not `
    + 'settle — check that redirectTo is on the project allow list and that '
    + 'NEXT_PUBLIC_AUTH_ENABLED was true for this build.'
  )
}

/** What the server holds for one user, read past RLS. */
export async function serverRecord(
  fixture: Fixture,
  userId: string
): Promise<{ data: Record<string, unknown>; progress: Record<string, unknown> } | null> {
  const { data, error } = await fixture.admin
    .from('record_state')
    .select('data, progress')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`serverRecord: ${error.message}`)
  return (data as { data: Record<string, unknown>; progress: Record<string, unknown> }) ?? null
}

export async function serverEventKinds(fixture: Fixture, userId: string): Promise<string[]> {
  const { data, error } = await fixture.admin
    .from('learner_event')
    .select('kind')
    .eq('user_id', userId)
  if (error) throw new Error(`serverEventKinds: ${error.message}`)
  return (data ?? []).map((r) => r.kind as string)
}

/**
 * The log rows with their payloads, for the assertions `serverEventKinds`
 * cannot make.
 *
 * A kind alone cannot answer either question §14.8.1 raises about the quick
 * check: how MANY rows one attempt files, and whether the answer text is in
 * them. Both are properties of the payload and the row count, so this returns
 * the rows.
 */
export async function serverEvents(
  fixture: Fixture,
  userId: string,
): Promise<{ kind: string; payload: Record<string, unknown> }[]> {
  const { data, error } = await fixture.admin
    .from('learner_event')
    .select('kind, payload')
    .eq('user_id', userId)
  if (error) throw new Error(`serverEvents: ${error.message}`)
  return (data ?? []) as { kind: string; payload: Record<string, unknown> }[]
}
