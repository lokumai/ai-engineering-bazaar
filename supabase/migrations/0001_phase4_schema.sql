-- =============================================================================
-- §14.2 — the whole server-side data model: ten tables, zero functions, zero
-- views, zero triggers.
--
-- Why so little. §14.0 decision 8 refuses Edge Functions and RPC: tables plus
-- RLS are plain Postgres and move to any Postgres, while a function is a lock
-- to one vendor. The consequence runs through every line below — anything the
-- database cannot express declaratively is not expressed at all, and the client
-- (§14.7) or a human at the console does it instead. Where that costs
-- something, the cost is written down next to the table rather than hidden.
--
-- Why the server is small. §14 is local-first: `localStorage` remains the
-- SOURCE of the record and Postgres is a replica and a query surface. Nothing
-- here is on the reader's critical path — §12.2's Channel A still stamps
-- `<html>` from `localStorage` before the first frame, because a `fetch`
-- cannot be synchronous. So a table that is unreachable, stale, or empty
-- degrades the panel, never the reading.
--
-- Apply order: this file, then `0002_phase4_rls.sql`. Until 0002 runs, these
-- tables have no RLS and are wide open to any authenticated client — do not
-- point a deployed site at a database where only 0001 has been applied.
-- See `supabase/README.md`.
--
-- `gen_random_uuid()` is core since Postgres 13 (no pgcrypto extension needed);
-- Supabase projects are well past that.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- §14.2.1 — platform: who the reader is, what an org is, and the two edges
-- between them.
-- -----------------------------------------------------------------------------

-- The account-side twin of §12.3's identity block. Every column here except
-- `github_login` is something the reader typed or minted on a device and is
-- carrying to the account; §14.7.2 decides who wins when the two disagree, and
-- decides it in favour of the account for exactly these fields, so that a
-- visible identity does not change under the reader at sign-in.
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  -- Sanitized by §12.3.4 on the way in. The server does not re-sanitize,
  -- because it cannot: `validate.ts` is the one validator (§14.2.2) and a
  -- second one written in SQL is a second answer to the same question.
  display_name text,
  -- §12.3.5 — 8 lowercase hex. Migrated FROM the device, then frozen: the
  -- account's seed wins on merge (§14.7.2) so the reader's mark is stable.
  mark_seed    text,
  -- The reader's explicit override of the derived mark, kept apart from the
  -- seed so that clearing the override restores the derived one.
  mark         text,
  -- One of §13.3's nine fixed ids. Never inferred — §13.3 is emphatic that a
  -- role is declared or absent, and an absent role is a valid state.
  role_id      text,
  -- §14.8.2 — the evidence half of the declaration/evidence split: the panel
  -- compares `Submittal.owner` against this to catch a submittal that claims
  -- someone else's repository. §14.2.1 says the USER MUST NOT WRITE THIS, and
  -- RLS is row-level, so this file cannot enforce it. See the note in 0002 and
  -- the optional column-privilege hardening in `supabase/README.md`.
  github_login text,
  created_at   timestamptz not null default now()
);

-- §14.3 — an org is a SCOPE, nothing more. It holds no policy, no settings and
-- no secrets: a name to show on the join screen and a domain that decides who
-- may add themselves (§14.5 path 1). Kept deliberately dull, which is also
-- what makes it safe to read widely (see the orgs policy in 0002).
create table if not exists orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- e.g. 'dnext-technology.com'. Matched against the JWT email's domain, so
  -- store it bare, lowercase, with no '@'. `unique` so that one domain cannot
  -- silently admit a reader to two orgs; nulls are allowed and repeatable,
  -- which is the invite-only org (§14.5 path 2).
  join_domain text unique,
  created_at  timestamptz not null default now()
);

-- §14.3 — membership is an EDGE. The row is inserted by the USER, never by a
-- manager (§14.5): that insert IS the consent mechanism, and §14.5.1's
-- disclosure is what the reader reads before performing it.
create table if not exists memberships (
  org_id    uuid not null references orgs on delete cascade,
  user_id   uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- §14.0 decision 9 — management is a TABLE, not a column on `memberships`.
--
-- This is the single most consequential shape in §14 and it is not modelling
-- taste, it is the fix for a hard Postgres failure: a policy that queries its
-- own table raises `42P17 infinite recursion detected in policy for relation`.
-- With an `is_manager` column on `memberships`, "a manager may read the org's
-- memberships" would have to read `memberships` from a `memberships` policy.
-- Split into its own table, every policy in 0002 looks at a DIFFERENT table
-- and the chain terminates at `user_id = auth.uid()`.
--
-- §14.4.1: nothing grants INSERT here. Appointing a manager is done by hand in
-- the Supabase console (v1), on purpose — granting authority is not the
-- application's job.
create table if not exists org_manager (
  org_id  uuid not null references orgs on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (org_id, user_id)
);

-- §14.5 path 2 — an invite is an EMAIL, not a token.
--
-- §14.0 decision 11 rejected a token table outright: with no functions, the
-- only way to check a token is to read the row, and anyone who can read a row
-- can read every token and walk into any org. RLS cannot express "you may read
-- this row only if you already know its contents". An email address, by
-- contrast, is already proven — it is in the JWT — so the invite needs no
-- secret at all. `pending_invites` is a list of addresses a manager has
-- called, and 0002 lets a reader see only their own line of it.
create table if not exists pending_invites (
  org_id     uuid not null references orgs on delete cascade,
  email      text not null,
  invited_at timestamptz not null default now(),
  primary key (org_id, email)
);

-- -----------------------------------------------------------------------------
-- §14.2.2 — the record: one row, and the row IS §12.1.2's `Envelope`.
-- -----------------------------------------------------------------------------

-- The first three columns (`schema`, `saved_at`, `data`) are the envelope
-- unchanged, and that identity buys three things without a line of extra work:
-- `migrate.ts`'s ladder covers the server too, so no second migration path is
-- ever written; `validate.ts` validates what arrives over the network, so no
-- new trust boundary opens; and `report.ts`'s export keeps working untouched.
--
-- One row per USER, not per org. §14.3 accepts the consequence out loud: a
-- reader in two orgs is fully visible to both sets of managers, and §14.5.1's
-- join screen says so before the click. Partitioning the record per org
-- (§14.11) is the only real fix and it is not worth v1.
create table if not exists record_state (
  user_id        uuid primary key references auth.users on delete cascade,
  -- = SCHEMA_VERSION (§12.1.2). Kept as the envelope's own field rather than
  -- inferred from a column set, so a row from a newer client is recognisable
  -- as such instead of silently misread.
  schema         int         not null,
  -- `RecordData`, verbatim and unpruned. Storing the whole document is what
  -- makes the server a replica rather than a lossy projection — §14.0
  -- decision 6 took the cheap half of event sourcing and left the expensive
  -- half (replay) alone, because §14.7.2's merge is field-wise and commutative
  -- and therefore needs no order.
  data           jsonb       not null,
  -- §14.9 — the stored output of `derive.ts`. Denormalized, but not for
  -- speed: for SINGLE-VALUEDNESS. The moment a dashboard writes
  -- `count(*) / 32.0` there are two answers to "how far along am I", the panel
  -- says 18/32 while the reader's own page says 17/32, and §1 is broken. The
  -- app computes; Metabase reads this column; SQL does no arithmetic.
  progress       jsonb       not null default '{}',
  -- Which curriculum revision `progress` was computed against, so that a
  -- number which has gone stale can be SEEN to be stale rather than trusted.
  curriculum_rev text,
  -- `Envelope.savedAt` — the DEVICE's claim about when it wrote.
  saved_at       timestamptz not null,
  -- The SERVER's own witness. The two are kept side by side and never
  -- reconciled: a wrong clock is a fact about the record, and quietly
  -- correcting it would be inventing data.
  updated_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- §14.2.3 — history and attempts: append-only, and the org's memory.
-- -----------------------------------------------------------------------------

-- Division of labour: `record_state` answers "what is true now?",
-- `learner_event` answers "what happened?". The log sits BESIDE the envelope,
-- not underneath it — state is never replayed from it.
--
-- Append-only is enforced in 0002 by ABSENCE: there is no update policy and no
-- delete policy, so no client can rewrite or erase org history. §14.6 depends
-- on that absence — erasing the record leaves the org's training record intact,
-- and only closing the account (which cascades from `auth.users`) removes it.
create table if not exists learner_event (
  -- Minted by the CLIENT, not by the database, and that is the whole point:
  -- a resend after a failed flush lands as `on conflict (id) do nothing`, so
  -- delivery can be at-least-once and the writer never has to ask whether the
  -- previous attempt got through (§14.7.3).
  id          uuid primary key,
  user_id     uuid not null references auth.users on delete cascade,
  -- §14.2.3 — the REDUCER's own name from `lib/record/events.ts`, with no
  -- translation layer, so the system holds one vocabulary instead of two.
  -- `lib/record/wire.ts`'s `EventKind` union is the checked copy of this list:
  --   signOff · unsign · setIdentity · setRole · mintMarkSeed ·
  --   setChecklistItem · setQuizAnswer · assessQuiz · addSubmittal ·
  --   removeSubmittal · recordSourceOpened · observeReachedEnd
  -- Deliberately NOT logged, as noise already present in the envelope:
  -- observeDwell, markActivity, setCharKeys, markExported, setPersisted.
  --
  -- Left as free `text` rather than an enum: an enum would make adding a
  -- reducer a migration, and a row whose kind this deployment does not know is
  -- still worth keeping. The union in `wire.ts` is where the list is enforced.
  kind        text not null,
  -- Null for record-wide events (`setIdentity`, `setRole`, `mintMarkSeed`).
  sheet_slug  text,
  payload     jsonb not null default '{}',
  -- The device's claim; `setQuizAnswer` writes one row PER ATTEMPT, so three
  -- attempts are three rows. That is precisely the "keep the attempts" the
  -- panel needs (§14.8.2) and the envelope alone cannot give.
  at          timestamptz not null,
  received_at timestamptz not null default now()
);

-- §14.2.3 names these two indexes. Named explicitly rather than left to
-- Postgres's auto-naming so a later migration can find them.
--
-- (user_id, at): every read of one person's history is "this user, in time
-- order" — the panel's timeline and `attention.ts`'s idle-day arithmetic.
create index if not exists learner_event_user_at_idx on learner_event (user_id, at);
-- (kind, sheet_slug): the corpus-wide question — "how did everyone do on this
-- sheet's quiz" — which is Metabase's, not the app's.
create index if not exists learner_event_kind_sheet_idx on learner_event (kind, sheet_slug);

-- -----------------------------------------------------------------------------
-- §14.2.4 — assignments: the ORG's data, not the record's.
--
-- Nothing here touches the envelope and nothing here syncs. That separation is
-- why an assignment can be created, retargeted or deleted without any risk to
-- a reader's record, and why `attention.ts` takes assignments as a plain
-- argument (`AssignedSheet` in `wire.ts`) instead of importing the org layer.
-- -----------------------------------------------------------------------------

create table if not exists assignments (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs on delete cascade,
  -- No `on delete cascade`: an assignment must not vanish because the manager
  -- who created it closed their account. The org's history is the org's.
  created_by uuid not null references auth.users,
  title      text not null,
  note       text,
  -- Nullable: an assignment without a deadline is legitimate, and only a
  -- passed deadline can make a sheet `overdue` (§14.8.1's third rule).
  due_at     timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists assignment_sheets (
  assignment_id uuid not null references assignments on delete cascade,
  sheet_slug    text not null,
  primary key (assignment_id, sheet_slug)
);

-- §14.2.4 — an EMPTY target set means the whole org. Encoded as absence rather
-- than as a flag column, so the two states cannot disagree with each other.
create table if not exists assignment_targets (
  assignment_id uuid not null references assignments on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  primary key (assignment_id, user_id)
);
