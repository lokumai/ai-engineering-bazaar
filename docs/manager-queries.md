# The database, and queries a manager actually needs

Ten tables, the columns as they really are, how they join, and SQL for the
questions a manager asks. Every query in this document was run against the live
schema before it was written down.

Two ways to run these:

- **Supabase SQL editor** — connects as `postgres` and sees everything. Fine for
  a manager who is also an operator of this project.
- **Metabase, or any client using the read-only role** — see
  [`../SECURITY.md`](../SECURITY.md). Never point a reporting tool at the
  `service_role` key.

If instead you connect from the app's own session (a signed-in manager),
row-level security narrows every one of these to your own organisation
automatically, and no `where org_id = …` is required. See **Who sees what**.

---

## One rule before the SQL

**The app's progress numbers come from `record_state.progress`, not from
counting rows.**

`progress` holds the output of the same code that prints the reader's own page
(`src/lib/record/derive.ts`). Counting signed sheets yourself in SQL will
usually agree with it — and on the day it does not, the manager's dashboard and
the learner's own page will be telling two different people two different
things about the same progress.

So:

- For **"how far along is X"**, read `progress`.
- For **exploration** — grouping, trends, "who has never touched module 12",
  anything the app does not display — write the SQL. That is what the rest of
  this document is for.

```sql
-- Authoritative
select progress->>'signedOff' as signed, progress->>'attainable' as of_total
from record_state where user_id = '…';

-- Exploratory: same question, counted here. Use for filtering and grouping,
-- not as the number you quote back to a learner.
select count(*) as signed
from record_state r, jsonb_each(r.data->'sheets') s
where r.user_id = '…' and s.value->>'signedOff' is not null;
```

---

## The model

```
        auth.users ─────────────┬──────────────┬─────────────┬──────────────┐
        (Supabase's own)        │              │             │              │
                                │              │             │              │
                          profiles       record_state   learner_event   memberships
                          one row        one row        many rows       org_id+user_id
                          per person     per person     per act              │
                                                                             │
                                                                        orgs ┤
                                                                             ├── org_manager
                                                                             ├── pending_invites
                                                                             └── assignments
                                                                                    ├── assignment_sheets
                                                                                    └── assignment_targets
```

Three groups, and the distinction matters when you write joins:

| Group | Tables | Keyed by |
|---|---|---|
| **The person** | `profiles`, `record_state`, `learner_event` | `user_id` (or `profiles.id`) |
| **The organisation** | `orgs`, `memberships`, `org_manager`, `pending_invites` | `org_id` |
| **The work set** | `assignments`, `assignment_sheets`, `assignment_targets` | `assignment_id` |

`auth.users` is Supabase's table. You may read `email` and `id` from it; do not
write to it.

---

## Tables

### `orgs` — the scope

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `name` | `text` | no | Shown on the join screen |
| `join_domain` | `text` | yes | **Unique.** e.g. `intellica.net`. Anyone whose **verified** address is on this domain **can** join — they still have to click. Verified means the mailbox was proven: an unconfirmed address gets no session at all, and both join policies additionally require the `email_verified` claim, which closes the OAuth case where a provider reports an address it has not checked. Null means invite-only, and several organisations may be null at once. |
| `created_at` | `timestamptz` | no | |

No insert or update policy: creating an organisation is a by-hand operation.

### `memberships` — the edge that grants visibility

| Column | Type | Null | Notes |
|---|---|---|---|
| `org_id` | `uuid` | no | → `orgs.id`, cascade |
| `user_id` | `uuid` | no | → `auth.users.id`, cascade |
| `joined_at` | `timestamptz` | no | When the reader joined — **their own act**, not a manager's |

Primary key `(org_id, user_id)`, so a person can belong to more than one
organisation. If they do, **every** one of those organisations' managers reads
the same record.

A manager can only ever *read* this table for their org. The row is written by
the member, which is what makes the disclosure on `/join/` meaningful.

### `org_manager` — the grant

| Column | Type | Null |
|---|---|---|
| `org_id` | `uuid` | no |
| `user_id` | `uuid` | no |

Managership is a table rather than a `role` column on `memberships`. Two reasons:
a policy that queries its own table raises `42P17 infinite recursion` at query
time, and "manages" is a relationship rather than an attribute of a membership.

Being here does **not** put you in `memberships`. A manager who wants to appear
in their own roster has to join like anyone else.

### `pending_invites` — a door, not an entry

| Column | Type | Null | Notes |
|---|---|---|---|
| `org_id` | `uuid` | no | → `orgs.id`, cascade |
| `email` | `text` | no | The address that may join |
| `invited_at` | `timestamptz` | no | |

There is no token and no link to send. A row here makes the organisation
*visible* on `/join/` to whoever signs in with that address; joining is still
their action. A reader can only ever select their own address's rows.

### `profiles` — who a `user_id` is

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `uuid` | no | → `auth.users.id`, cascade. Same value as `user_id` elsewhere. |
| `display_name` | `text` | yes | From the record's identity. Null until the reader names themselves. |
| `mark_seed` | `text` | yes | 8 hex, minted once |
| `mark` | `text` | yes | The reader's chosen mascot mark; null means "use the seed" |
| `role_id` | `text` | yes | One of `software-engineer`, `devops`, `data-engineer`, `data-analyst`, `analyst`, `qa`, `project-manager`, `dba`, `pre-sales`. Never inferred — only what the reader picked. |
| `github_login` | `text` | yes | From OAuth metadata. See the caveat under **Evidence**. |
| `created_at` | `timestamptz` | no | |

A row is written only when there is something worth writing; an all-null profile
is deliberately not created, so "absent" and "blank" stay distinguishable.

### `record_state` — the record itself

One row per person. The row *is* the same envelope the browser keeps.

| Column | Type | Null | Notes |
|---|---|---|---|
| `user_id` | `uuid` | no | Primary key |
| `schema` | `int` | no | Record schema version (1 today) |
| `data` | `jsonb` | no | The whole record — shape below |
| `progress` | `jsonb` | no | Derived numbers; **the authoritative ones** |
| `curriculum_rev` | `text` | yes | Which curriculum `progress` was computed against. Currently always null — the build produces no corpus-wide revision, so treat stored progress as possibly computed against an older curriculum. |
| `saved_at` | `timestamptz` | no | What the **device** claims |
| `updated_at` | `timestamptz` | no | What the **server** witnessed. A large gap means a wrong device clock. |

**`data` shape:**

```jsonc
{
  "identity": { "name": "Ada", "markSeed": "0123abcd", "mark": null, "role": "devops" },
  "sheets": {
    "intermediate/harness-engineering": {
      "signedOff":       "2026-08-14T09:30:00.000Z",  // null = not signed off
      "signedRevision":  "f60e2d2",                   // the sheet's REV at sign-off
      "reachedEnd":      false,                       // see caveat below
      "dwellSeconds":    0,                           // see caveat below
      "quiz":            { "answer": "b", "assessed": "matched", "at": "…" },
      "checklist":       { "0": true, "3": true },    // only ticks are stored
      "sources":         ["https://…"],               // distinct URLs opened
      "submittals":      [{ "owner": "cevheri", "repo": "agent-lab",
                            "url": "https://github.com/cevheri/agent-lab",
                            "commit": "a1b2c3d", "note": "…", "at": "…" }]
    }
  },
  "days":  ["2026-08-14"],          // dates anything was written
  "prefs": { "charKeys": true },
  "meta":  { "lastExport": null, "persisted": true }
}
```

Sheet slugs are **category-prefixed**: `intermediate/harness-engineering`, not
`harness-engineering`. A bare slug matches nothing.

> **Caveat: `reachedEnd` and `dwellSeconds` are always `false`/`0`.** The
> reducers exist; nothing calls them. Do not build a report on either. Evidence
> that a sheet was opened is a checklist tick, a quiz answer, a source followed,
> or a submittal — all of them acts rather than measurements.

**`progress` shape:**

```jsonc
{
  "signedOff":  18,
  "attainable": 32,
  "ratio":      0.5625,             // ratio * attainable === signedOff, always
  "byCategory": { "intermediate": { "signedOff": 6, "attainable": 8 } },
  "attention":  [{ "sheetSlug": "…", "why": "stalled",
                   "idleDays": 21, "attempts": 0, "dueAt": null }],
  "lastActivity": "2026-09-01",
  "days": 9                          // active days in the last 14
}
```

`attention.why` is one of `overdue`, `quizFailing`, `stalled`, in that
precedence. Thresholds: **14 days** idle, **3** quiz attempts.

### `learner_event` — what happened, append-only

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `uuid` | no | Minted by the **client**, so a resend is a no-op |
| `user_id` | `uuid` | no | → `auth.users.id`, cascade |
| `kind` | `text` | no | The reducer's own name — list below |
| `sheet_slug` | `text` | yes | Null for record-wide acts (identity, role) |
| `payload` | `jsonb` | no | Per-kind, below |
| `at` | `timestamptz` | no | The device's claim |
| `received_at` | `timestamptz` | no | The server's witness |

Indexed on `(user_id, at)` and `(kind, sheet_slug)`.

No update policy and no delete policy while the person belongs to an
organisation: **this table cannot be rewritten or erased from a browser.** It is
the only place a withdrawn submittal or a failed quiz attempt survives.

| `kind` | `payload` |
|---|---|
| `signOff` | `{ "revision": "f60e2d2" }` |
| `unsign` | `{}` |
| `setQuizAnswer` | `{}` — **one row per attempt.** The answer text is not here; see below |
| `assessQuiz` | `{ "assessed": "matched" \| "missed" }` |
| `setChecklistItem` | `{ "index": 3, "ticked": true }` |
| `recordSourceOpened` | `{ "href": "https://…" }` |
| `addSubmittal` | `{ "owner": "…", "repo": "…", "commit": "…" }` |
| `removeSubmittal` | `{ "index": 0 }` |
| `setIdentity` | `{ "named": true }` or `{ "mark": "…" }` |
| `setRole` | `{ "role": "devops" }` |
| `mintMarkSeed` | `{}` |
| `observeReachedEnd` | `{}` — not currently emitted |

`dwellSeconds`, activity marks, export marks and preference changes are
deliberately **not** logged: they are in the envelope already and would drown
the log.

**Where the answer text is, and why it is not here.** `record_state` holds the
latest answer to every quick check; this table holds only the fact that an
attempt happened, and when. That split is deliberate rather than an oversight,
because the two places have different powers: a reader can overwrite the answer
in the envelope and can erase the envelope outright, and no client may delete a
`learner_event` row while they belong to an organisation. Text filed here could
never be taken back — including a draft written and then deleted. So the log
records the act and the envelope records the answer.

An attempt is one editing session that changed the answer: the row is filed when
the reader leaves the field, not per keystroke. A reader who opens a saved
answer, reads it and moves on files nothing, and neither does one who clears the
field — an emptied answer is a withdrawal, not a zero-length try.

### `assignments`, `assignment_sheets`, `assignment_targets`

| `assignments` | Type | Null | Notes |
|---|---|---|---|
| `id` | `uuid` | no | |
| `org_id` | `uuid` | no | → `orgs.id`, cascade |
| `created_by` | `uuid` | no | → `auth.users.id`, **no cascade** — an organisation's assignment must not vanish with its author. This makes the author's account undeletable while the assignment exists; see **Removing a person**. |
| `title` | `text` | no | |
| `note` | `text` | yes | |
| `due_at` | `timestamptz` | yes | Null = no deadline, so nothing is ever overdue |
| `created_at` | `timestamptz` | no | |

`assignment_sheets(assignment_id, sheet_slug)` — which sheets.
`assignment_targets(assignment_id, user_id)` — who. **Empty means the whole
organisation**, which is why targeting needs a `left join`, never an inner one.

---

## Who sees what

| | own record | colleagues' | another org's |
|---|---|---|---|
| member | ✓ | ✗ | ✗ |
| in `org_manager` | ✓ | ✓ | ✗ |

A manager reads and never writes: there is no policy anywhere that lets one
person modify another's record. `learner_event` accepts no update or delete at
all while an organisation holds it.

Anonymous readers have **no rows in any of these tables**. Signing in is
optional, so absence from `record_state` means "has not signed in", never "has
done nothing".

---

## The joins you will keep writing

```sql
-- One organisation's people, with names and records.
select p.display_name, u.email, r.progress
from memberships m
  join auth.users  u on u.id = m.user_id
  left join profiles     p on p.id = m.user_id     -- LEFT: may not exist yet
  left join record_state r on r.user_id = m.user_id -- LEFT: may not have signed in
where m.org_id = :org;
```

Two rules that cause most of the wrong answers here:

1. **`profiles` and `record_state` are `left join`s.** A member who signed in
   but never named themselves has no profile row; a member who joined and never
   returned has no record row. An inner join silently drops exactly the people a
   manager most wants to see.
2. **Sheets live in `jsonb`, so expand with `jsonb_each`.**

```sql
-- One row per (person, sheet) — the shape most reports want.
select m.user_id, s.key as sheet_slug, s.value as sheet
from memberships m
  join record_state r on r.user_id = m.user_id
  cross join lateral jsonb_each(r.data->'sheets') s
where m.org_id = :org;
```

Replace `:org` with the id, or drop the `where` entirely when running as a
signed-in manager — RLS applies it for you.

---

## Manager queries

### The roster

```sql
select
  coalesce(p.display_name, 'unnamed')          as person,
  u.email,
  p.role_id                                    as role,
  coalesce((r.progress->>'signedOff')::int, 0) as signed,
  coalesce((r.progress->>'attainable')::int, 0) as of_total,
  round(coalesce((r.progress->>'ratio')::numeric, 0) * 100)::int || '%' as complete,
  r.progress->>'lastActivity'                  as last_active,
  case when r.user_id is null then 'never signed in' else null end as note
from memberships m
  join auth.users u        on u.id = m.user_id
  left join profiles p     on p.id = m.user_id
  left join record_state r on r.user_id = m.user_id
where m.org_id = :org
order by coalesce((r.progress->>'ratio')::numeric, -1) desc, person;
```

### Team summary in one row

```sql
select
  count(*)                                                        as members,
  count(r.user_id)                                                as signed_in,
  round(avg(coalesce((r.progress->>'ratio')::numeric, 0)) * 100)  as avg_percent,
  sum(coalesce((r.progress->>'signedOff')::int, 0))               as sheets_signed,
  count(*) filter (where r.progress->>'lastActivity' is null
                      or (r.progress->>'lastActivity')::date < current_date - 14)
                                                                  as quiet_14d
from memberships m
  left join record_state r on r.user_id = m.user_id
where m.org_id = :org;
```

### Who needs attention, and why

Straight out of the stored `attention` array, so it matches what the learner is
shown on their own page.

```sql
select
  coalesce(p.display_name, u.email) as person,
  a->>'sheetSlug'                   as sheet,
  a->>'why'                         as reason,
  (a->>'idleDays')::int             as idle_days,
  (a->>'attempts')::int             as quiz_attempts,
  a->>'dueAt'                       as due
from memberships m
  join record_state r on r.user_id = m.user_id
  join auth.users u   on u.id = m.user_id
  left join profiles p on p.id = m.user_id
  cross join lateral jsonb_array_elements(r.progress->'attention') a
where m.org_id = :org
order by case a->>'why' when 'overdue' then 1 when 'quizFailing' then 2 else 3 end,
         idle_days desc nulls last;
```

### Where the team is getting stuck

Which sheets are opened but unsigned by the most people — the strongest signal
that a sheet, not a person, is the problem.

```sql
select
  s.key as sheet_slug,
  count(*) filter (where s.value->>'signedOff' is not null) as signed,
  count(*) filter (where s.value->>'signedOff' is null)     as opened_not_signed,
  count(*) filter (where s.value->'quiz'->>'assessed' = 'missed') as quiz_missed
from memberships m
  join record_state r on r.user_id = m.user_id
  cross join lateral jsonb_each(r.data->'sheets') s
where m.org_id = :org
group by s.key
having count(*) filter (where s.value->>'signedOff' is null) > 0
order by opened_not_signed desc, sheet_slug;
```

### One person, sheet by sheet

```sql
select
  s.key                                as sheet_slug,
  s.value->>'signedOff'                as signed_off,
  s.value->>'signedRevision'           as signed_against,
  s.value->'quiz'->>'assessed'         as quiz,
  jsonb_array_length(s.value->'submittals') as submittals,
  (select count(*) from jsonb_each(s.value->'checklist') c
    where c.value = 'true'::jsonb)     as checklist_ticks,
  jsonb_array_length(s.value->'sources')    as sources_opened
from record_state r
  cross join lateral jsonb_each(r.data->'sheets') s
where r.user_id = :user
order by (s.value->>'signedOff') nulls last, s.key;
```

### One person's timeline

```sql
select at, kind, sheet_slug, payload
from learner_event
where user_id = :user
order by at desc
limit 100;
```

### Quiz attempts, and who is fighting one

The count only exists in the log — the envelope keeps the last answer, not the
tries. This is the query the envelope cannot answer.

```sql
select
  coalesce(p.display_name, u.email) as person,
  e.sheet_slug,
  count(*) filter (where e.kind = 'setQuizAnswer')                       as attempts,
  count(*) filter (where e.payload->>'assessed' = 'missed')              as missed,
  max(e.at) filter (where e.payload->>'assessed' = 'matched')            as first_matched
from learner_event e
  join memberships m  on m.user_id = e.user_id and m.org_id = :org
  join auth.users u   on u.id = e.user_id
  left join profiles p on p.id = e.user_id
where e.kind in ('setQuizAnswer', 'assessQuiz')
group by 1, 2
having count(*) filter (where e.kind = 'setQuizAnswer') >= 3
order by attempts desc;
```

### Evidence: submittals, and whether the owner checks out

```sql
select
  coalesce(p.display_name, u.email) as person,
  p.github_login,
  s.key                             as sheet_slug,
  sub->>'owner'                     as claimed_owner,
  sub->>'url'                       as repo,
  sub->>'commit'                    as commit,
  case
    when p.github_login is null                     then 'no github account'
    when lower(sub->>'owner') = lower(p.github_login) then 'verified'
    else 'OWNER MISMATCH'
  end                               as verification
from memberships m
  join record_state r  on r.user_id = m.user_id
  join auth.users u    on u.id = m.user_id
  left join profiles p on p.id = m.user_id
  cross join lateral jsonb_each(r.data->'sheets') s
  cross join lateral jsonb_array_elements(s.value->'submittals') sub
where m.org_id = :org
order by verification, person;
```

> **Caveat.** `profiles.github_login` comes from OAuth metadata, but row-level
> security cannot restrict a single column, so a determined client could write a
> login that is not theirs. Treat `verified` as "consistent with the account",
> not as a cryptographic proof. `SECURITY.md` records this as an accepted risk.

### Assignments and who is behind

`assignment_targets` empty means the whole organisation, which is why the target
join is a `left join` with an `or` — an inner join would return nothing for
org-wide assignments.

```sql
select
  a.title,
  a.due_at,
  coalesce(p.display_name, u.email) as person,
  asheet.sheet_slug,
  r.data->'sheets'->asheet.sheet_slug->>'signedOff' as signed_off,
  case
    when r.data->'sheets'->asheet.sheet_slug->>'signedOff' is not null then 'done'
    when a.due_at is null                                             then 'open'
    when a.due_at < now()                                             then 'OVERDUE'
    else 'open'
  end as status
from assignments a
  join assignment_sheets asheet on asheet.assignment_id = a.id
  join memberships m            on m.org_id = a.org_id
  left join assignment_targets t on t.assignment_id = a.id
  join auth.users u             on u.id = m.user_id
  left join profiles p          on p.id = m.user_id
  left join record_state r      on r.user_id = m.user_id
where a.org_id = :org
  and (t.user_id = m.user_id
       or not exists (select 1 from assignment_targets x where x.assignment_id = a.id))
order by a.due_at nulls last, status desc, person;
```

### Weekly activity

```sql
select
  date_trunc('week', e.at)::date as week,
  count(distinct e.user_id)      as active_people,
  count(*) filter (where e.kind = 'signOff')      as sign_offs,
  count(*) filter (where e.kind = 'addSubmittal') as submittals
from learner_event e
  join memberships m on m.user_id = e.user_id and m.org_id = :org
where e.at > now() - interval '12 weeks'
group by 1
order by 1 desc;
```

### Roles across the team

```sql
select coalesce(p.role_id, 'not stated') as role, count(*) as people
from memberships m
  left join profiles p on p.id = m.user_id
where m.org_id = :org
group by 1
order by people desc;
```

### Device clocks that disagree with the server

Worth a glance before trusting any date a learner's device supplied.

```sql
select
  coalesce(p.display_name, u.email) as person,
  r.saved_at   as device_claims,
  r.updated_at as server_witnessed,
  r.updated_at - r.saved_at as skew
from memberships m
  join record_state r  on r.user_id = m.user_id
  join auth.users u    on u.id = m.user_id
  left join profiles p on p.id = m.user_id
where m.org_id = :org
  and abs(extract(epoch from (r.updated_at - r.saved_at))) > 3600
order by abs(extract(epoch from (r.updated_at - r.saved_at))) desc;
```

---

## Administration

Neither of these has a policy that allows it from the app, deliberately.

```sql
-- A new organisation, with automatic joining for its own email domain. Only put
-- a domain here that you control: it is a standing invitation to anyone holding
-- a verified address on it. For a domain you do not control, leave it null and
-- use pending_invites.
-- `join_domain` is unique, so this is written to be safe to re-run: without the
-- conflict clause a second attempt fails on `orgs_join_domain_key` rather than
-- doing nothing.
insert into orgs (name, join_domain) values ('intellica', 'intellica.net')
on conflict (join_domain) do nothing;

-- Appoint a manager. They must already have signed in once, so that
-- auth.users holds them.
insert into org_manager (org_id, user_id)
select o.id, u.id from orgs o, auth.users u
where o.name = 'intellica' and u.email = 'someone@intellica.net';

-- Invite an address that is not on the join domain. This makes the
-- organisation VISIBLE to them; joining is still their own action.
insert into pending_invites (org_id, email)
select id, 'someone@gmail.com' from orgs where name = 'intellica'
on conflict do nothing;

-- Who is a manager of what.
select o.name, u.email
from org_manager g join orgs o on o.id = g.org_id
  join auth.users u on u.id = g.user_id
order by o.name, u.email;
```

### Removing a person

Removing a member's `memberships` row ends a manager's future visibility, not
their past: `learner_event` rows remain, and only closing the account removes
them.

Closing the account itself cascades through `profiles`, `record_state`,
`learner_event`, `memberships`, `org_manager` and `assignment_targets` — but
**not** through `assignments.created_by`, which has no cascade on purpose. So:

> **A person who created an assignment cannot be deleted while it exists.** The
> delete is refused, and Supabase's admin API returns the error rather than
> throwing, so a cleanup script that does not check the result will report
> success and leave the account behind.

This was found the hard way while validating this document: a fixture user who
had authored an assignment survived its own teardown. Delete or reassign the
assignment first:

```sql
-- What is standing in the way.
select a.id, a.title, o.name as org
from assignments a join orgs o on o.id = a.org_id
where a.created_by = :user;

-- Either hand it to another manager of the same organisation...
update assignments set created_by = :new_owner where created_by = :user;

-- ...or remove it, which cascades to its sheets and targets.
delete from assignments where created_by = :user;
```

Reassigning is usually right: the assignment is the organisation's, and its
author leaving does not make it less due.
