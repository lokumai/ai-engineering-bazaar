/**
 * §14.12 — the RLS suite, run against a real Postgres with real JWTs.
 *
 * This file exists because §14.4's policies cannot be verified by reading them.
 * Two of their failure modes are invisible on the page:
 *
 *   1. `42P17 infinite recursion detected in policy for relation "x"`. Postgres
 *      detects recursion PER RELATION, during plan expansion: if evaluating a
 *      policy for `x` leads to evaluating a policy for `x` again, it raises,
 *      even when the expansion would otherwise terminate. A policy that
 *      recurses is created without complaint and fails at query time, so
 *      `create policy` succeeding proves nothing.
 *   2. A policy that is too LOOSE. It never errors. It just answers, with rows
 *      it should not have returned.
 *
 * So every assertion here goes through PostgREST with a real signed-in user's
 * JWT — the same path the app takes. Simulating a role in psql
 * (`set request.jwt.claims`) would exercise a different code path than the one
 * that ships, and the difference is exactly where an over-permissive policy
 * hides.
 *
 * Fixtures are created with the service key, which bypasses RLS. That is the
 * correct use of it (§14.10 forbids it in the browser and in Metabase, not in
 * a test harness), and it is why `email_confirm: true` works here: the suite
 * does not depend on the project's email-confirmation setting.
 *
 *   node scripts/test-rls.mjs
 *
 * Idempotent: it deletes its own users and orgs on entry and on exit. Every id
 * it creates is prefixed `rls-test-` so nothing else can be caught by the
 * cleanup.
 */

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const E = ''
const PASS = `${E}[32m✓${E}[0m`
const FAIL = `${E}[31m✗${E}[0m`

// -- env --------------------------------------------------------------------
const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq !== -1) env[t.slice(0, eq)] = t.slice(eq + 1).trim()
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SECRET = env.SUPABASE_SERVICE_ROLE_KEY
const DB = env.SUPABASE_DB_URL
if (!URL_ || !ANON || !SECRET || !DB) {
  console.error('.env.local incomplete — run: node scripts/check-supabase.mjs')
  process.exit(1)
}

const admin = createClient(URL_, SECRET, { auth: { persistSession: false } })
/**
 * `-q` is load-bearing: without it psql appends the command tag ("INSERT 0 1")
 * to the tuple output, so a `returning id` reads back as a uuid with a status
 * line glued to it and the next statement fails on invalid uuid syntax.
 *
 * The catch re-throws with the connection string redacted. psql puts the whole
 * URI — password included — in its error text, and an error here is exactly
 * when that text gets pasted somewhere it should not be.
 */
const sql = (text) => {
  try {
    return execFileSync('psql', [DB, '-q', '-v', 'ON_ERROR_STOP=1', '-tAc', text], {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (err) {
    const raw = String(err?.stderr ?? err?.message ?? err)
    throw new Error(raw.split(DB).join('<connection string redacted>').trim())
  }
}

// -- assertions -------------------------------------------------------------
let failures = 0
const results = []

function record(name, passed, detail) {
  results.push({ name, passed, detail })
  if (!passed) failures++
  console.log(`  ${passed ? PASS : FAIL} ${name}${detail ? `\n      ${detail}` : ''}`)
}

/** The policy is too loose if it returns MORE than `expected` rows. */
async function expectRows(name, query, expected) {
  const { data, error } = await query
  if (error) {
    // A recursion error is the headline failure of this whole suite, so name it.
    const recursion = /infinite recursion/i.test(error.message) || error.code === '42P17'
    record(name, false, `${recursion ? '42P17 RECURSION — ' : ''}${error.message}`)
    return
  }
  const got = data?.length ?? 0
  record(name, got === expected, got === expected ? '' : `expected ${expected} row(s), got ${got}`)
}

/**
 * An INSERT the policy forbids RAISES: "new row violates row-level security
 * policy". So for inserts, the error IS the evidence.
 */
async function expectRefused(name, query) {
  const { error } = await query
  record(name, Boolean(error), error ? '' : 'the write SUCCEEDED and should not have')
}

/**
 * An UPDATE or DELETE the policy forbids does NOT raise. RLS makes the rows
 * INVISIBLE, so the statement succeeds and touches nothing. This distinction is
 * the whole reason this helper exists apart from `expectRefused`: asserting
 * "an error came back" would fail against a perfectly correct policy, and —
 * far worse — a test written the other way round (assert no error) would pass
 * against a policy that let the write through.
 *
 * `.select()` makes PostgREST return the affected rows, so the count is the
 * assertion: zero means the policy held, one means it did not.
 */
async function expectTouchesNothing(name, query) {
  const { data, error } = await query.select()
  if (error) {
    // Also acceptable — some policy shapes do raise. Either way it was refused.
    record(name, true, '')
    return
  }
  const got = data?.length ?? 0
  record(name, got === 0, got === 0 ? '' : `MODIFIED ${got} row(s) it should not have reached`)
}

async function expectAllowed(name, query) {
  const { error } = await query
  record(name, !error, error ? error.message : '')
}

// -- fixtures ---------------------------------------------------------------
const PREFIX = 'rls-test-'
const PASSWORD = 'rls-test-password-4f3a9c'
const DOMAIN_A = 'rls-test-alpha.example'
const DOMAIN_B = 'rls-test-beta.example'

const PEOPLE = {
  // org alpha
  learnerA: `${PREFIX}learner-a@${DOMAIN_A}`,
  learnerB: `${PREFIX}learner-b@${DOMAIN_A}`,
  managerA: `${PREFIX}manager-a@${DOMAIN_A}`,
  // org beta — the outsider who must see nothing of alpha
  managerB: `${PREFIX}manager-b@${DOMAIN_B}`,
  // no org at all
  loner: `${PREFIX}loner@${DOMAIN_B}`,
}

async function cleanup() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith(PREFIX)) await admin.auth.admin.deleteUser(u.id)
  }
  // Cascades through memberships, org_manager, invites and assignments.
  sql(`delete from orgs where name like '${PREFIX}%'`)
}

async function seed() {
  const ids = {}
  for (const [role, email] of Object.entries(PEOPLE)) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    })
    if (error) throw new Error(`createUser ${role}: ${error.message}`)
    ids[role] = data.user.id
  }

  // Fixtures go in as `postgres`, which bypasses RLS. Appointing a manager and
  // creating an org are both by-hand operations in production too (§14.4.1,
  // §14.4.4) — there is no policy that would allow either from the client.
  const orgA = sql(
    `insert into orgs (name, join_domain) values ('${PREFIX}alpha', '${DOMAIN_A}') returning id`
  )
  const orgB = sql(
    `insert into orgs (name, join_domain) values ('${PREFIX}beta', '${DOMAIN_B}') returning id`
  )
  sql(`insert into memberships (org_id, user_id) values
        ('${orgA}', '${ids.learnerA}'),
        ('${orgA}', '${ids.learnerB}'),
        ('${orgA}', '${ids.managerA}'),
        ('${orgB}', '${ids.managerB}')`)
  sql(`insert into org_manager (org_id, user_id) values
        ('${orgA}', '${ids.managerA}'),
        ('${orgB}', '${ids.managerB}')`)

  // Every member of alpha has a record and one event, so "sees nothing" and
  // "sees everything" are distinguishable from "there was nothing to see".
  for (const who of ['learnerA', 'learnerB', 'managerA']) {
    sql(`insert into record_state (user_id, schema, data, progress, saved_at)
         values ('${ids[who]}', 1, '{"sheets":{}}'::jsonb, '{"signedOff":0}'::jsonb, now())`)
    sql(`insert into learner_event (id, user_id, kind, sheet_slug, payload, at)
         values (gen_random_uuid(), '${ids[who]}', 'signOff', 'probe-sheet', '{}'::jsonb, now())`)
  }
  sql(`insert into profiles (id, display_name) values
        ('${ids.learnerA}', 'Learner A'),
        ('${ids.learnerB}', 'Learner B'),
        ('${ids.managerA}', 'Manager A')`)

  return { ids, orgA, orgB }
}

/** A client carrying one person's real JWT — the app's own code path. */
async function signIn(email) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`signIn ${email}: ${error.message}`)
  return c
}

// -- the suite --------------------------------------------------------------
console.log('\n§14.12 RLS SUITE')

let fx
try {
  await cleanup()
  fx = await seed()
} catch (err) {
  console.error(`\nfixtures failed: ${err.message}\n`)
  process.exit(1)
}

try {
  const asLearnerA = await signIn(PEOPLE.learnerA)
  const asLearnerB = await signIn(PEOPLE.learnerB)
  const asManagerA = await signIn(PEOPLE.managerA)
  const asManagerB = await signIn(PEOPLE.managerB)
  const asLoner = await signIn(PEOPLE.loner)

  console.log('\n§14.3 — the visibility matrix')

  // Own row. If this fails, nothing else matters.
  await expectRows('learner sees own record', asLearnerA.from('record_state').select('user_id'), 1)

  // THE central claim of §14.3: an ordinary employee sees only themselves.
  await expectRows(
    'learner does NOT see a colleague (record_state)',
    asLearnerB.from('record_state').select('user_id'),
    1
  )
  await expectRows(
    'learner does NOT see a colleague (learner_event)',
    asLearnerB.from('learner_event').select('id'),
    1
  )

  // The manager's own row plus two colleagues = three.
  await expectRows(
    'manager sees the whole org (3 records)',
    asManagerA.from('record_state').select('user_id'),
    3
  )
  await expectRows(
    'manager sees the org events (3)',
    asManagerA.from('learner_event').select('id'),
    3
  )
  await expectRows(
    'manager sees the org profiles (3)',
    asManagerA.from('profiles').select('id'),
    3
  )
  await expectRows(
    'manager sees the org members (3)',
    asManagerA.from('memberships').select('user_id'),
    3
  )

  // Cross-tenant. Manager B has no record of their own, so the answer is zero.
  await expectRows(
    "another org's manager sees NOTHING of alpha",
    asManagerB.from('record_state').select('user_id'),
    0
  )
  await expectRows(
    'a user with no org sees nothing',
    asLoner.from('record_state').select('user_id'),
    0
  )

  console.log('\n§14.3 invariant 2 — the manager reads, never writes')

  await expectTouchesNothing(
    'manager cannot UPDATE a learner record',
    asManagerA.from('record_state').update({ saved_at: new Date(0).toISOString() }).eq('user_id', fx.ids.learnerA)
  )
  await expectTouchesNothing(
    'manager cannot DELETE a learner record',
    asManagerA.from('record_state').delete().eq('user_id', fx.ids.learnerA)
  )
  await expectRefused(
    'manager cannot INSERT a record for someone else',
    asManagerA.from('record_state').insert({
      user_id: fx.ids.learnerB,
      schema: 1,
      data: {},
      progress: {},
      saved_at: new Date().toISOString(),
    })
  )
  await expectRefused(
    'a learner cannot write another learner an event',
    asLearnerA.from('learner_event').insert({
      id: crypto.randomUUID(),
      user_id: fx.ids.learnerB,
      kind: 'signOff',
      sheet_slug: 'x',
      payload: {},
      at: new Date().toISOString(),
    })
  )

  console.log('\n§14.2.3 — learner_event is append-only')

  await expectAllowed(
    'own event can be appended',
    asLearnerA.from('learner_event').insert({
      id: crypto.randomUUID(),
      user_id: fx.ids.learnerA,
      kind: 'setQuizAnswer',
      sheet_slug: 'probe-sheet',
      payload: { attempt: 1 },
      at: new Date().toISOString(),
    })
  )
  await expectTouchesNothing(
    'own event cannot be UPDATED',
    asLearnerA.from('learner_event').update({ kind: 'unsign' }).eq('user_id', fx.ids.learnerA)
  )
  await expectTouchesNothing(
    'own event cannot be DELETED while an org holds it (§14.6 row 2)',
    asLearnerA.from('learner_event').delete().eq('user_id', fx.ids.learnerA)
  )

  // §14.6 row 1, added in 0003. The loner belongs to no org yet at this point
  // in the suite, so their own history IS theirs to remove — and 0002 alone
  // made that impossible for anybody, which left the erase dialog unable to
  // honestly offer what §14.6 promises.
  await expectAllowed(
    'a reader with no org can append their own event',
    asLoner.from('learner_event').insert({
      id: crypto.randomUUID(),
      user_id: fx.ids.loner,
      kind: 'signOff',
      sheet_slug: 'probe-sheet',
      payload: {},
      at: new Date().toISOString(),
    })
  )
  await expectRows(
    'and then erase it (§14.6 row 1)',
    asLoner.from('learner_event').delete().eq('user_id', fx.ids.loner).select(),
    1
  )

  console.log('\n§14.5 — joining, and the invite list that must not leak')

  // Path 1: the loner's email domain matches beta.
  await expectAllowed(
    'join by matching email domain',
    asLoner.from('memberships').insert({ org_id: fx.orgB, user_id: fx.ids.loner })
  )
  // The same reader must NOT be able to join an org they have no claim on.
  await expectRefused(
    'cannot join an org with no domain match and no invite',
    asLoner.from('memberships').insert({ org_id: fx.orgA, user_id: fx.ids.loner })
  )
  await expectRefused(
    'cannot insert a membership for SOMEONE ELSE',
    asLoner.from('memberships').insert({ org_id: fx.orgB, user_id: fx.ids.learnerA })
  )

  // Path 2, and the leak §14.5 was redesigned to avoid.
  sql(`insert into pending_invites (org_id, email) values
        ('${fx.orgA}', '${PEOPLE.loner}'),
        ('${fx.orgA}', '${PREFIX}someone-else@${DOMAIN_B}')`)
  await expectRows(
    'invite list shows ONLY the caller\'s own address',
    asLoner.from('pending_invites').select('email'),
    1
  )
  await expectRows(
    'a learner sees no invites addressed to others',
    asLearnerA.from('pending_invites').select('email'),
    0
  )
  await expectAllowed(
    'join when invited by email',
    asLoner.from('memberships').insert({ org_id: fx.orgA, user_id: fx.ids.loner })
  )

  console.log('\n§14.4.1 / §14.4.4 — what the client may never do')

  await expectRefused(
    'nobody can appoint themselves a manager',
    asLearnerA.from('org_manager').insert({ org_id: fx.orgA, user_id: fx.ids.learnerA })
  )
  await expectRefused(
    'nobody can create an org',
    asLearnerA.from('orgs').insert({ name: `${PREFIX}rogue`, join_domain: 'rogue.example' })
  )
  await expectRows(
    'own management rows only',
    asLearnerA.from('org_manager').select('org_id'),
    0
  )

  console.log('\n§14.2.4 — assignments')

  await expectAllowed(
    'manager creates an assignment',
    asManagerA.from('assignments').insert({
      org_id: fx.orgA,
      created_by: fx.ids.managerA,
      title: `${PREFIX}assignment`,
      due_at: new Date(Date.now() + 86400000).toISOString(),
    })
  )
  await expectRefused(
    'a learner cannot create an assignment',
    asLearnerA.from('assignments').insert({
      org_id: fx.orgA,
      created_by: fx.ids.learnerA,
      title: `${PREFIX}rogue-assignment`,
    })
  )
  await expectRows(
    'org members can read the assignment',
    asLearnerA.from('assignments').select('id'),
    1
  )
  await expectRows(
    "another org's manager cannot read it",
    asManagerB.from('assignments').select('id'),
    0
  )
} catch (err) {
  console.log(`\n  ${FAIL} suite aborted: ${err.message}`)
  failures++
} finally {
  await cleanup()
}

console.log('')
const total = results.length
if (failures === 0) console.log(`${total} kontrol, hepsi gecti.`)
else console.log(`${total} kontrol, ${failures} BASARISIZ.`)
console.log('')
process.exit(failures === 0 ? 0 : 1)
