/**
 * §14 — verify .env.local before anything is built against it.
 *
 * Every check here exists because its failure is one that does NOT announce
 * itself. A trailing `/rest/v1/` on the project URL turns every request into a
 * 404 whose body says nothing about the cause. An anon key pasted where the
 * secret belongs authenticates fine and then silently lacks admin rights. A
 * connection string still carrying `[YOUR-PASSWORD]` fails with a password
 * error that reads like a wrong password rather than an unedited template.
 *
 * The live checks go through @supabase/supabase-js rather than raw fetch, and
 * that is deliberate: it is the client the app itself uses, so a pass here
 * means the app will work, not merely that the HTTP endpoint answered. Probing
 * REST by hand is also easy to get wrong — `/rest/v1/` root rejects the
 * publishable key by design and returns a 401 that reads like a bad key.
 *
 * The key-acceptance probe is a select against a table that cannot exist. A
 * rejected key answers 401 "Invalid API key"; an ACCEPTED key answers with a
 * schema error about the missing table. The error is the evidence.
 *
 * Secrets are never printed — every value is reported as a prefix and a length.
 *
 *   node scripts/check-supabase.mjs
 */

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

/**
 * The ESC byte, spelt as an escape rather than written as the byte itself.
 * Both work; only one is readable. Held raw, this line displays as `const E =
 * ''` in every terminal and diff, and it has now been read as an empty string
 * — i.e. as the bug `test-rls.mjs` really had — by two reviewers in a row.
 */
const E = '\u001b'
const PASS = `${E}[32m✓${E}[0m`
const FAIL = `${E}[31m✗${E}[0m`
const WARN = `${E}[33m!${E}[0m`

let failures = 0
let warnings = 0

const ok = (label, detail = '') =>
  console.log(`  ${PASS} ${label}${detail ? '  ' + detail : ''}`)
const bad = (label, detail) => {
  failures++
  console.log(`  ${FAIL} ${label}`)
  if (detail) console.log(`      ${detail}`)
}
const warn = (label, detail) => {
  warnings++
  console.log(`  ${WARN} ${label}`)
  if (detail) console.log(`      ${detail}`)
}

/** A secret, rendered so it can be recognised but not reused. */
const mask = (v) => (v ? `${v.slice(0, 12)}… (${v.length} chars)` : '<empty>')

// -- 1. Parse ---------------------------------------------------------------
let raw
try {
  raw = readFileSync('.env.local', 'utf8')
} catch {
  console.error('.env.local not found. Copy .env.local.example and fill it in.')
  process.exit(1)
}

const env = {}
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq !== -1) env[t.slice(0, eq)] = t.slice(eq + 1).trim()
}

const url = env.NEXT_PUBLIC_SUPABASE_URL ?? ''
// Both names are accepted: Supabase renamed `anon` to `publishable` in 2025 and
// new dashboards show only the new one. Neither is a secret (§14.10).
const anon =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const secret = env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const dbUrl = env.SUPABASE_DB_URL ?? ''

// -- 2. Shape ---------------------------------------------------------------
console.log('\nSHAPE')

let projectHost = null
if (!url) {
  bad('NEXT_PUBLIC_SUPABASE_URL is empty')
} else {
  let parsed = null
  try {
    parsed = new URL(url)
  } catch {
    bad('NEXT_PUBLIC_SUPABASE_URL is not a URL', url)
  }
  if (parsed) {
    if (parsed.protocol !== 'https:') {
      bad('project URL must be https', url)
    } else if (parsed.pathname !== '/' && parsed.pathname !== '') {
      bad(
        'project URL must have NO path',
        `found "${parsed.pathname}" - supabase-js appends /rest/v1 and /auth/v1 itself, so this doubles the path and every request 404s`
      )
    } else {
      projectHost = parsed.host
      ok('project URL', projectHost)
    }
  }
}

if (!anon) {
  bad(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY is empty',
    'Project Settings -> API -> Publishable key (or the legacy anon key)'
  )
} else if (anon.startsWith('sb_publishable_')) {
  ok('publishable key', mask(anon))
} else if (anon.startsWith('eyJ')) {
  ok('legacy anon key (JWT)', mask(anon))
  warn('legacy anon key', 'works today; Supabase is phasing these out for sb_publishable_')
} else if (anon.startsWith('sb_secret_')) {
  bad(
    'SECRET key pasted into the PUBLIC variable',
    'this value is compiled into the browser bundle. Rotate it in the dashboard now, then paste the publishable key here.'
  )
} else {
  bad('anon/publishable key has an unrecognised shape', mask(anon))
}

if (!secret) {
  warn('SUPABASE_SERVICE_ROLE_KEY is empty', 'only needed to seed Playwright test users')
} else if (secret === anon) {
  bad('secret key is the same value as the public key')
} else if (secret.startsWith('sb_secret_') || secret.startsWith('eyJ')) {
  ok('secret key', mask(secret))
} else {
  bad('secret key has an unrecognised shape', mask(secret))
}

/** Parsed connection string, or null. Guards the psql section below. */
let db = null
if (!dbUrl) {
  warn('SUPABASE_DB_URL is empty', 'needed to apply migrations and run the RLS tests')
} else if (dbUrl.includes('YOUR-PASSWORD')) {
  bad(
    'connection string still holds the placeholder password',
    'replace [YOUR-PASSWORD] with the real password, or reset it under Database settings'
  )
} else if (!/^postgres(ql)?:\/\//.test(dbUrl)) {
  bad(
    'SUPABASE_DB_URL is not a connection string',
    'it must be the whole URI, not just a host: postgresql://USER:PASSWORD@HOST:PORT/postgres'
  )
} else {
  try {
    const p = new URL(dbUrl)
    if (!p.password) bad('connection string carries no password')
    else {
      db = p
      ok('connection string', `${p.hostname}:${p.port || 5432} as ${p.username}`)
    }
  } catch {
    bad('SUPABASE_DB_URL is not a URL')
  }
}

// -- 3. Live, through supabase-js -------------------------------------------
console.log('\nLIVE (supabase-js)')

if (projectHost && anon) {
  const client = createClient(url, anon, { auth: { persistSession: false } })

  // A rejected key answers 401 "Invalid API key"; an accepted one answers with
  // a schema error about the missing table. The error IS the evidence.
  const probeTable = '__phase4_probe_should_not_exist'
  const { error } = await client.from(probeTable).select('*').limit(1)
  if (!error) {
    warn('key probe', `a table named ${probeTable} unexpectedly exists`)
  } else if (/invalid api key|jwt/i.test(error.message)) {
    bad('publishable key rejected', `${error.message} - wrong project, or the legacy key is disabled`)
  } else {
    ok('publishable key accepted', `REST answered: ${error.code ?? error.message}`)
  }

  const { error: authErr } = await client.auth.getUser()
  // No session here, so "missing"/"not authenticated" is the CORRECT answer;
  // anything about the key itself is not.
  if (authErr && /invalid api key/i.test(authErr.message)) {
    bad('auth rejected the key', authErr.message)
  } else {
    ok('auth service reachable')
  }

  // §14.2 — do the tables exist yet? This is the check that will flip from
  // "not applied" to "applied" once the migrations run, so it doubles as the
  // migration status readout.
  const applied = []
  const missing = []
  for (const t of [
    'profiles',
    'orgs',
    'memberships',
    'org_manager',
    'pending_invites',
    'record_state',
    'learner_event',
    'assignments',
    'assignment_sheets',
    'assignment_targets',
  ]) {
    const { error: e } = await client.from(t).select('*').limit(0)
    // PGRST205 = table not found in the schema cache.
    if (e && (e.code === 'PGRST205' || /does not exist|Could not find the table/i.test(e.message))) {
      missing.push(t)
    } else {
      applied.push(t)
    }
  }
  if (missing.length === 10) {
    warn('§14 migrations not applied yet', 'none of the ten tables exist')
  } else if (missing.length === 0) {
    ok('§14 migrations applied', 'all ten tables present')
  } else {
    bad('§14 migrations partially applied', `missing: ${missing.join(', ')}`)
  }
}

if (projectHost && secret && secret !== anon) {
  const admin = createClient(url, secret, { auth: { persistSession: false } })
  // The cheapest call that FAILS for a public key, so it is what distinguishes
  // a real secret from an anon key pasted twice.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (error) {
    bad('secret key has no admin rights', error.message)
    console.log('      (on a legacy project, try service_role from the Legacy API keys tab)')
  } else {
    ok('secret key has admin rights', `${data.users.length} user(s) visible`)
  }
}

// -- 4. Direct database connection -----------------------------------------
if (db) {
  console.log('\nDATABASE (psql)')
  // Supabase removed IPv4 from the direct db.<ref> host. If this machine has no
  // IPv6 route, psql cannot reach it and the pooler is the only way in - so
  // resolve first and say which case we are in rather than reporting a timeout.
  let hasA = false
  try {
    hasA = execFileSync('dig', ['+short', db.hostname, 'A'], { encoding: 'utf8' }).trim().length > 0
  } catch {
    /* dig missing; fall through to the connection attempt */
  }
  if (!hasA && /^db\./.test(db.hostname)) {
    warn(
      'direct host is IPv6-only',
      'Supabase dropped IPv4 from db.<ref>.supabase.co. Use the Session pooler URI instead if the connection below fails.'
    )
  }
  try {
    const out = execFileSync('psql', [dbUrl, '-tAc', 'select current_user, current_database(), version()'], {
      encoding: 'utf8',
      timeout: 25000,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PGCONNECT_TIMEOUT: '15' },
    }).trim()
    const [user, name, version] = out.split('|')
    ok('database connection', `${user}@${name} - ${version.split(' ').slice(0, 2).join(' ')}`)
  } catch (err) {
    const msg = String(err?.stderr ?? err?.message ?? err).trim().split('\n').filter(Boolean).pop()
    bad('database connection failed', msg)
    console.log('      Database -> Connection string -> Session pooler gives an IPv4 URI.')
  }
}

// -- 5. Verdict -------------------------------------------------------------
console.log('')
if (failures === 0 && warnings === 0) console.log('Hepsi tamam.')
else if (failures === 0) console.log(`Kullanilabilir - ${warnings} uyari, hicbiri engel degil.`)
else console.log(`${failures} hata${warnings ? `, ${warnings} uyari` : ''}.`)
console.log('')
process.exit(failures === 0 ? 0 : 1)
