# Supabase setup — §14 (accounts and orgs)

The server side of [§14](../docs/superpowers/specs/2026-09-01-lms-phase4-accounts-and-orgs-design.md):
ten tables and twenty-two RLS policies. No Edge Functions, no RPC, no views, no
triggers (§14.0 decision 8) — everything here is plain Postgres and moves to any
Postgres.

The site is local-first (§14): `localStorage` is the source of the record and
this database is a replica and a query surface. A project that has not been set
up yet degrades the account and panel features; it never stops anyone reading.

## Files, in order

| # | File | What it does |
|---|------|--------------|
| 1 | `migrations/0001_phase4_schema.sql` | §14.2 — the ten tables and the two indexes |
| 2 | `migrations/0002_phase4_rls.sql` | §14.4 — `enable row level security` on all ten, then the 22 policies |

**Order is not optional.** Between step 1 and step 2 the tables exist with RLS
off, which means any client holding the anon key can read and write every row.
Do not point a deployed site at a database in that state; run both, then check.

Both files assume a **fresh project**. `0001` is idempotent (`create table if
not exists`, `create index if not exists`); `0002` is **not**, because Postgres
has no `create policy if not exists`. Re-applying `0002` needs the existing
policies dropped first — see [Re-applying](#re-applying).

## Prerequisite

§14.1 is a hard precondition, not a nice-to-have: auth must be served from
`bazaar.lokumai.com`, never from the shared `lokumai.github.io` origin, because
Supabase keeps the session in `localStorage` and an origin is a
scheme/host/port tuple — every other project page under that host could read
the session and act as the user. `basePath` isolates nothing. Do not merge auth
code until the custom domain resolves.

## Apply via the SQL editor

1. Supabase dashboard → your project → **SQL Editor** → **New query**.
2. Paste the whole of `migrations/0001_phase4_schema.sql`. Run. Expect
   `Success. No rows returned`.
3. New query. Paste the whole of `migrations/0002_phase4_rls.sql`. Run.
4. Verify (below).

Paste each file **whole**. Both are single scripts and the SQL editor runs a
paste as one transaction, so a mistake in the middle rolls the whole file back
rather than leaving half a schema.

## Apply via `psql`

The connection string is in the dashboard under **Project Settings → Database →
Connection string → URI**. Use the direct connection (port `5432`) rather than
the pooler for DDL.

```sh
export SUPABASE_DB_URL='postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres'

psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0001_phase4_schema.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0002_phase4_rls.sql
```

`-v ON_ERROR_STOP=1` matters: without it `psql` carries on past a failed
statement and you end up with a partially-policied database, which looks like it
worked. Wrap a run in a transaction if you want all-or-nothing:

```sh
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction \
  -f supabase/migrations/0001_phase4_schema.sql \
  -f supabase/migrations/0002_phase4_rls.sql
```

Keep the password out of your shell history — prefer `.pgpass` or reading it
from a secret store. It is the `postgres` superuser; it bypasses every policy in
`0002`.

## Verify

Ten tables, all with RLS on, none with zero policies. A table with RLS enabled
and **no** policy is completely inaccessible (§14.4.4), which is a silent
failure mode, so this query is the real check:

```sql
select c.relname                                    as table_name,
       c.relrowsecurity                             as rls_enabled,
       count(p.polname)                             as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
group by 1, 2
order by 1;
```

Expected:

| table | rls_enabled | policies |
|---|---|---|
| assignment_sheets | t | 2 |
| assignment_targets | t | 2 |
| assignments | t | 2 |
| learner_event | t | 3 |
| memberships | t | 5 |
| org_manager | t | 1 |
| orgs | t | 1 |
| pending_invites | t | 2 |
| profiles | t | 2 |
| record_state | t | 2 |

`learner_event` showing **3** and not 5 is the
point: no `update` policy and no `delete` policy, so the log is append-only and
the client cannot erase an org's training history (§14.2.3, §14.6).

To see which commands each policy covers:

```sql
select tablename, policyname, cmd, roles
from pg_policies where schemaname = 'public'
order by tablename, cmd, policyname;
```

### The failure to watch for

`42P17 infinite recursion detected in policy for relation "…"`. It happens when
a policy's subquery reaches back to its own table — directly, or through a
second table whose policy points back. It is raised at rewrite time, so the
statement fails for everyone, every time. `0002`'s header carries the full
reference graph and the proof that it is acyclic; §14.4.4's `orgs` policy as
written in the spec **does** recurse against `memberships`, and `0002`
documents the replacement in place. If you change a policy, re-derive that
graph before you run it.

A smoke test, as a signed-in user (anon key, not service role), touching every
table once:

```sql
select count(*) from profiles;
select count(*) from orgs;
select count(*) from memberships;
select count(*) from org_manager;
select count(*) from pending_invites;
select count(*) from record_state;
select count(*) from learner_event;
select count(*) from assignments;
select count(*) from assignment_sheets;
select count(*) from assignment_targets;
```

Zero rows is a pass. An error is not.

### Bootstrapping the first org and manager

Neither `orgs` nor `org_manager` has an insert policy (§14.4.1, §14.4.4) —
creating an org and appointing a manager are done by hand, deliberately:
granting authority is not the application's job. From the SQL editor, as
`postgres`:

```sql
insert into orgs (name, join_domain)
values ('dnext-technology', 'dnext-technology.com');

insert into org_manager (org_id, user_id)
select o.id, u.id
from orgs o, auth.users u
where o.join_domain = 'dnext-technology.com'
  and u.email = 'someone@dnext-technology.com';
```

Members are **not** inserted here. §14.5 requires the user to insert their own
membership row; that insert is the consent, and §14.5.1's disclosure is what
they read before making it.

## Re-applying

`0002` is not re-runnable as-is. To reset the policies:

```sql
-- List what exists first.
select format('drop policy %I on public.%I;', policyname, tablename)
from pg_policies where schemaname = 'public' order by tablename;
```

Run the generated statements, then re-run `0002`. Dropping a policy leaves RLS
enabled and the table therefore **unreachable** until the new policies land, so
do the drop and the re-apply in one transaction.

## Optional — `metabase_ro` (§14.10)

Skip this until Metabase is actually being set up. It is a **separate,
hand-made, read-only Postgres role**, and the reason it exists is a
prohibition: Metabase connects to Postgres as itself and therefore **bypasses
RLS entirely**, so the `service_role` key must never reach it — that key would
make every policy in `0002` decorative.

```sql
-- §14.10 — read-only reporting role. Choose a strong password; it is not the
-- anon key and it is not the service role.
create role metabase_ro login password 'CHANGE-ME';

grant usage on schema public to metabase_ro;

grant select on record_state, learner_event, memberships, org_manager, orgs,
                profiles, assignments, assignment_sheets, assignment_targets
  to metabase_ro;
-- No writes. No access to the `auth` schema — the identity data is not
-- reporting data.
```

`pending_invites` is deliberately absent from the grant: an invite list is
operational, not analytical.

Two rules that come with this role:

- **Cross-org separation is Metabase's job, not Postgres's.** This role sees
  every row; Metabase's own permissions/sandboxing layer is what keeps one
  customer's dashboard off another customer's data.
- **SQL does no arithmetic** (§14.9). Read `record_state.progress->>'ratio'`,
  which is `derive.ts`'s own output. A `count(*) / 32.0` written in a dashboard
  creates a second answer to "how far along am I", and the day it drifts the
  panel says `18/32` while the reader's own page says `17/32`. Check
  `curriculum_rev` before trusting a stored number: it says which curriculum
  revision the figure was computed against.

Managers who know SQL can also connect to Supabase directly with their own
account instead — RLS restricts them to their own org, so there is no separate
API surface to learn.

## What is NOT here

- **No `service_role` key in any client.** The site ships the anon key only;
  authority is entirely in `0002`.
- **No functions, triggers, or views.** §14.0 decision 8. If a rule cannot be
  written as a policy, it is enforced by the client or not at all — and where
  that leaves a gap (`profiles.github_login`, which §14.2.1 says the user must
  not write but RLS cannot protect at column level) the gap is documented in
  `0002` rather than papered over. The declarative half of that fix, for the
  day a non-client writer exists:

  ```sql
  -- OPTIONAL, and it breaks the only current writer. Do not run this until
  -- something other than the browser populates the column.
  revoke insert (github_login), update (github_login) on profiles from authenticated;
  ```

- **No seed data.** The corpus (`mini-courses/`) stays in the repository and is
  rendered at build time; nothing about the 32 sheets lives in Postgres.
