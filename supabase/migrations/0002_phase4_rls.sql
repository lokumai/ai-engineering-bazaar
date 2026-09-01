-- =============================================================================
-- §14.4 — row level security. All authority lives here; there is no Edge
-- Function and no RPC (§14.0 decision 8), so this file IS the permission
-- system. If a rule is not written below, it does not exist.
--
-- THE RECURSION TRAP, which is the reason §14.4 has the shape it has.
-- Postgres expands a policy's subqueries with RLS applied to the tables they
-- reference. While it expands table T it keeps T on a stack, and if the
-- expansion reaches T again it aborts with
--   42P17  infinite recursion detected in policy for relation "T"
-- That fires for a policy that reads its OWN table AND for two tables whose
-- policies read each other. It is a rewrite-time error, so the affected
-- statement fails every time, for everyone — not a slow query, a dead table.
--
-- §14.0 decision 9's separate `org_manager` table is what keeps the graph
-- acyclic. Every reference below points at a DIFFERENT table and every chain
-- terminates at `user_id = auth.uid()`. The full reference graph:
--
--   org_manager        -> (nothing)                      terminal
--   orgs               -> (nothing)                      terminal  [see §14.4.4]
--   pending_invites    -> org_manager
--   memberships        -> org_manager, orgs, pending_invites
--   profiles           -> memberships, org_manager
--   record_state       -> memberships, org_manager
--   learner_event      -> memberships, org_manager
--   assignments        -> memberships, org_manager
--   assignment_sheets  -> assignments, org_manager
--   assignment_targets -> assignments, org_manager
--
-- No table appears in its own transitive closure. Deepest chain:
-- assignment_sheets -> assignments -> memberships -> orgs (terminal), 4 deep.
--
-- §14.3's authority model, in two independent paths that never chain:
--   OWNERSHIP  — user_id = auth.uid()
--   MANAGEMENT — the row's owner is a member of an org I manage
--                (memberships JOIN org_manager)
-- Authority is not delegable: there is no manager-of-managers, a row in
-- `org_manager` either exists or does not. A manager is not superior, only a
-- READER — every record policy for a manager is `for select`. And a manager is
-- also a learner: being in `org_manager` does not remove them from
-- `memberships`.
--
-- TWO LOAD-BEARING ABSENCES.
--   1. `learner_event` has NO update and NO delete policy. Append-only is
--      enforced by that absence, and §14.6 leans on it: erasing the record
--      must not erase the org's training history. Only closing the account
--      removes those rows, via `on delete cascade` from `auth.users`.
--   2. A table with RLS enabled and NO policy is completely inaccessible —
--      not "default open", not "owner only": every statement returns zero rows
--      or is rejected. §14.4.4 flags `profiles` and `orgs` as the two easy
--      omissions. All ten tables below have at least one policy.
--
-- Policy names are ENGLISH here while §14.4 names them in Turkish (the design
-- conversation was Turkish; the codebase is not). Each group cites the spec's
-- own name so the 22 policies stay traceable one-to-one.
--
-- `create policy` has no `if not exists`, so this file is written for a FRESH
-- database and re-running it errors on the first duplicate name. To re-apply,
-- drop the policies first (`supabase/README.md` has the query that lists them).
--
-- `to authenticated` is added to every policy. §14.4 omits it; the behaviour is
-- the same either way, because `anon` has a null `auth.uid()` and would fail
-- every predicate, but stating the role keeps Postgres from evaluating any of
-- this for anonymous readers — of whom this site has many (§14.0 decision 3).
-- =============================================================================

alter table profiles           enable row level security;
alter table orgs               enable row level security;
alter table memberships        enable row level security;
alter table org_manager        enable row level security;
alter table pending_invites    enable row level security;
alter table record_state       enable row level security;
alter table learner_event      enable row level security;
alter table assignments        enable row level security;
alter table assignment_sheets  enable row level security;
alter table assignment_targets enable row level security;

-- -----------------------------------------------------------------------------
-- §14.4.1 — org_manager: where the chain closes.  [1 policy]
--
-- Spec name: "kendi yöneticiliğini görür".
--
-- This is the terminal node of the whole graph. It reads no other table, so
-- every `exists (select 1 from org_manager ...)` elsewhere expands to a plain
-- indexed lookup and stops. Nothing recurses because nothing continues.
--
-- No insert, update or delete policy, deliberately: managers are appointed by
-- hand in the Supabase console (v1). Appointing authority is not the
-- application's job, and a client that cannot write here cannot promote
-- itself.
-- -----------------------------------------------------------------------------
create policy "own management rows are visible" on org_manager
  for select to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- §14.4.4 — orgs: a scope, and the name on the join screen.  [1 policy]
--
-- Spec name: "üyesi olduğu kurumu görür".
--
-- DEVIATION FROM §14.4.4, and the one place this migration does not ship the
-- spec's SQL. §14.4.4 writes this policy as
--   using (exists (select 1 from memberships m where m.org_id = orgs.id
--                    and m.user_id = auth.uid())
--          or join_domain = split_part(auth.jwt()->>'email', '@', 2)
--          or exists (select 1 from pending_invites p ...))
-- and its first branch reads `memberships` — while §14.4.2's two join policies
-- read `orgs`. That is the mutual cycle described at the top of this file:
--   insert into memberships -> orgs policy -> memberships policy -> 42P17
-- Every join, by either path of §14.5, would fail. It is a spec bug, not a
-- performance note.
--
-- The fix keeps both features and breaks the cycle at the cheaper end. `orgs`
-- holds a name, a join domain and a timestamp; §14.3 defines it as a scope
-- carrying no policy and no secrets, and nothing sensitive is reachable from
-- reading it — every record, event, invite and assignment is guarded by its own
-- policy. So the org directory is readable by any signed-in reader, `orgs`
-- becomes terminal, and the graph is acyclic again.
--
-- What this discloses: a signed-in reader can enumerate org names and join
-- domains. A reader whose email matches a join domain could already add
-- themselves to that org by design (§14.5 path 1), so the new exposure is the
-- customer list, not access. Rejected alternatives: a SECURITY DEFINER helper
-- to read `orgs` past RLS (§14.0 decision 8 — no functions); dropping the
-- membership branch and leaving members to see their org name only via the
-- domain or invite branch (silently breaks for an invited member whose invite
-- row is later deleted, and §14.5.1 requires the name to be shown).
-- -----------------------------------------------------------------------------
create policy "org directory is readable by signed-in readers" on orgs
  for select to authenticated
  using (auth.uid() is not null);

-- No insert and no update policy on `orgs` (§14.4.4): creating an org is done
-- by hand, like appointing a manager. No delete policy either — a delete would
-- cascade through memberships, assignments and every invite.

-- -----------------------------------------------------------------------------
-- §14.4.2 — memberships: the edge, and §14.5's consent.  [5 policies]
--
-- Spec names, in order: "kendi üyeliğini görür", "yönetici kurumun üyelerini
-- görür", "domainiyle katılır", "davetliyse katılır", "kendi üyeliğinden
-- çıkar".
--
-- Both join policies require `user_id = auth.uid()`: THE USER inserts their own
-- row, by both paths. That insert is the consent mechanism, and §14.5.1's
-- disclosure — managers will see your entire record; if you are in two orgs,
-- both sets of managers see it; erasing your record does not erase the org's
-- copy — is what the reader reads before performing it.
--
-- No token table (§14.0 decision 11): with no functions, verifying a token
-- means reading its row, and whoever can read one row can read them all. The
-- identity in the JWT is already verified, so no secret is needed.
-- -----------------------------------------------------------------------------
create policy "own membership is visible" on memberships
  for select to authenticated
  using (user_id = auth.uid());

create policy "manager sees the org's members" on memberships
  for select to authenticated
  using (exists (select 1 from org_manager g
                 where g.org_id = memberships.org_id
                   and g.user_id = auth.uid()));

-- §14.5 path 1 — corporate email domain. `split_part` on a null email yields
-- null and the comparison is then null, i.e. false: a GitHub account with a
-- hidden email cannot join by this path. §14.5's known gap, closed by the
-- email-verification step on `/account/`.
create policy "join by matching email domain" on memberships
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from orgs o
                where o.id = memberships.org_id
                  and o.join_domain = split_part(auth.jwt() ->> 'email', '@', 2)));

-- §14.5 path 2 — a manager called this address.
create policy "join when invited by email" on memberships
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from pending_invites p
                where p.org_id = memberships.org_id
                  and p.email = auth.jwt() ->> 'email'));

-- Leaving is symmetric with joining: the reader who consented can withdraw.
-- It removes the manager's future visibility, not the past — `learner_event`
-- rows stay (§14.6), which the erase dialog says out loud.
create policy "leave own membership" on memberships
  for delete to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- §14.4.3 — record_state: the envelope.  [2 policies]
--
-- Spec names: "kendi kaydı", "yönetici kurumunun kayıtlarını okur".
--
-- The owner's policy is `for all` — select, insert, update, delete — because
-- the record is theirs, including §12.15's right to erase it. The manager's is
-- `for select` and there is deliberately no manager write: §14.3's second
-- invariant is that the only writer of a record is its owner. A panel that
-- could edit a reader's record would make every signature unreadable as
-- evidence.
-- -----------------------------------------------------------------------------
create policy "own record" on record_state
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- §14.0 decision 5 — the manager sees the WHOLE record, not a summary. The
-- price of that decision is §14.5.1's disclosure, paid before the join.
create policy "manager reads the org's records" on record_state
  for select to authenticated
  using (exists (select 1 from memberships m
                 join org_manager g on g.org_id = m.org_id
                 where m.user_id = record_state.user_id
                   and g.user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- §14.4.3 — learner_event: append-only history.  [3 policies]
--
-- Spec names: "kendi olayları", "kendi olaylarını yazar", "yönetici kurumunun
-- olaylarını okur".
--
-- Read own, insert own, read as manager. THAT IS ALL — and the missing two are
-- the point. There is no update policy, so a recorded attempt cannot be
-- rewritten; there is no delete policy, so the client cannot erase the org's
-- training history. §14.6's table is implemented by this absence:
--   unaffiliated  -> record_state deleted, events deleted (by the app, which
--                    has no delete policy here, so: NOT deletable — see below)
--   affiliated    -> record_state deleted, events remain
--   account closed-> everything deleted, by cascade from auth.users
-- Note the first row honestly: with no delete policy at all, an unaffiliated
-- reader's events are not client-deletable either. §14.6 wants them gone in
-- that case, and expressing "deletable only while you belong to no org" needs
-- a policy on `learner_event` that reads `memberships` — allowed, acyclic, but
-- NOT in §14.4's 22. Left out here rather than invented: the erase dialog says
-- "close your account to delete everything", which remains true.
-- -----------------------------------------------------------------------------
create policy "own events are visible" on learner_event
  for select to authenticated
  using (user_id = auth.uid());

-- Insert only. `id` is client-minted, so the app pushes with
-- `on conflict (id) do nothing` — at-least-once delivery, idempotent write
-- (§14.7.3). Note that a client may therefore forge `at`, `kind` and
-- `payload` for ITSELF; that is the same self-assertion §12.4.4 already
-- describes, and §14.8.2 answers it with evidence rather than with a gate.
create policy "append own events" on learner_event
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "manager reads the org's events" on learner_event
  for select to authenticated
  using (exists (select 1 from memberships m
                 join org_manager g on g.org_id = m.org_id
                 where m.user_id = learner_event.user_id
                   and g.user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- §14.4.4 — profiles.  [2 policies]
--
-- Spec names: "kendi profili", "yönetici kurumunun profillerini okur".
--
-- KNOWN GAP, stated here because it cannot be fixed here. §14.2.1 marks
-- `github_login` as "the user MUST NOT write this" and §14.8.2's submittal
-- verification is worthless if they can. RLS is ROW level: a `for all` policy
-- that admits the owner admits them to every column of their row. Without a
-- trigger or an auth hook (§14.0 decision 8 forbids both) there is also no
-- other writer, so the column can only be populated by the client — the
-- requirement and the constraint are in direct conflict and v1 cannot satisfy
-- both. Shipped as §14.4.4 writes it, i.e. permissive; `supabase/README.md`
-- carries the column-privilege hardening as an optional step for the day a
-- writer other than the client exists.
-- -----------------------------------------------------------------------------
create policy "own profile" on profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "manager reads the org's profiles" on profiles
  for select to authenticated
  using (exists (select 1 from memberships m
                 join org_manager g on g.org_id = m.org_id
                 where m.user_id = profiles.id
                   and g.user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- §14.4.5 — pending_invites.  [2 policies]
--
-- Spec names: "kendi davetini görür", "yönetici davet eder".
--
-- The select policy is scoped to the reader's OWN address, so the invite list
-- does not leak: a reader learns that they were invited, never who else was.
-- The manager's policy is `for all`; a `for all` policy with no `with check`
-- reuses its `using` expression as the insert check, which is what admits a
-- manager's new row for their own org and nobody else's.
-- -----------------------------------------------------------------------------
create policy "own invite is visible" on pending_invites
  for select to authenticated
  using (email = auth.jwt() ->> 'email');

create policy "manager manages the org's invites" on pending_invites
  for all to authenticated
  using (exists (select 1 from org_manager g
                 where g.org_id = pending_invites.org_id
                   and g.user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- §14.4.5 — assignments.  [2 policies]
--
-- Spec names: "atanan görür", "yönetici atar".
--
-- Visibility is org-wide, not target-wide: everyone in the org sees the
-- assignment, and `assignment_targets` narrows WHO it applies to. That keeps
-- §14.2.4's "empty target set means the whole org" expressible without a
-- second policy, and an assignment is not a secret from a colleague.
-- -----------------------------------------------------------------------------
create policy "org members see assignments" on assignments
  for select to authenticated
  using (exists (select 1 from memberships m
                 where m.org_id = assignments.org_id
                   and m.user_id = auth.uid()));

-- Note what this does NOT constrain: `created_by`. A manager may write another
-- user's uuid there. §14.4.5 does not constrain it either, and the column is a
-- provenance note rather than an authority, so it is left as the spec has it.
create policy "manager manages assignments" on assignments
  for all to authenticated
  using (exists (select 1 from org_manager g
                 where g.org_id = assignments.org_id
                   and g.user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- §14.4.5 — assignment_sheets and assignment_targets.  [4 policies]
--
-- Spec names: "atama sheet'lerini görür", "yönetici atama sheet'i yazar",
-- "atama hedeflerini görür", "yönetici atama hedefi yazar".
--
-- The two select policies test only that the parent assignment EXISTS. They
-- look unguarded and are not: the `exists` subquery is itself filtered by
-- `assignments`'s own select policy, which already restricts the reader to
-- their org. Access is inherited from the parent rather than restated, so the
-- org test lives in exactly one place. This is also why they must not join
-- `memberships` themselves — restating it is how the two copies come to
-- disagree.
-- -----------------------------------------------------------------------------
create policy "assignment sheets follow the assignment" on assignment_sheets
  for select to authenticated
  using (exists (select 1 from assignments a
                 where a.id = assignment_sheets.assignment_id));

create policy "manager writes assignment sheets" on assignment_sheets
  for all to authenticated
  using (exists (select 1 from assignments a
                 join org_manager g on g.org_id = a.org_id
                 where a.id = assignment_sheets.assignment_id
                   and g.user_id = auth.uid()));

create policy "assignment targets follow the assignment" on assignment_targets
  for select to authenticated
  using (exists (select 1 from assignments a
                 where a.id = assignment_targets.assignment_id));

create policy "manager writes assignment targets" on assignment_targets
  for all to authenticated
  using (exists (select 1 from assignments a
                 join org_manager g on g.org_id = a.org_id
                 where a.id = assignment_targets.assignment_id
                   and g.user_id = auth.uid()));

-- =============================================================================
-- Policy count, by table:
--   org_manager 1 · orgs 1 · memberships 5 · record_state 2 · learner_event 3
--   profiles 2 · pending_invites 2 · assignments 2 · assignment_sheets 2
--   assignment_targets 2                                          total 22
-- matching §14.4's 22, with the `orgs` policy replaced as documented above.
-- Every one of the ten tables has at least one policy, so no table was left
-- RLS-enabled-and-unreachable (§14.4.4).
-- =============================================================================
