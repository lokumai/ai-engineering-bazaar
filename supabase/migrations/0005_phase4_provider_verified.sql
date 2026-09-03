-- =============================================================================
-- §14.5 — the join guard, read from a field the joiner cannot write.
--
-- WHAT WAS WRONG WITH 0004. It required `email_verified`, which was the right
-- question asked of the wrong source. MEASURED against this project:
--
--   The access token carries NO top-level `email_verified` claim. The claims are
--   iss, sub, aud, exp, iat, email, phone, app_metadata, user_metadata, role,
--   aal, amr, session_id, is_anonymous. Nothing else.
--
-- So 0004's `coalesce` always fell through its first term to
-- `user_metadata.email_verified` — and `user_metadata` is written by the SIGNED-IN
-- USER through `auth.updateUser({ data })`. The guard consulted the party it was
-- guarding against. Proven end to end against this project, with an account whose
-- address the provider had not vouched for:
--
--   1. join                                  -> REFUSED by 0004
--   2. updateUser({ email_verified: true })  -> ACCEPTED, and the next token
--                                               carried the rewritten claim
--   3. join                                  -> ADMITTED
--
-- It was latent rather than live only because this project has one enabled
-- provider (email) and `mailer_autoconfirm` off, so a session cannot exist for an
-- address whose mailbox was never opened. Enabling GitHub or Google would have
-- made it live silently, while 0004's own comment claimed that case was covered.
--
-- WHAT THIS DOES INSTEAD. `app_metadata` is server-controlled. MEASURED: a raw
-- `PUT /auth/v1/user` carrying `app_metadata` answers **403** and the token is
-- unchanged; supabase-js offers no client path to it at all. Only the service
-- role and GoTrue itself write it.
--
-- `providers ? 'email'` therefore means GoTrue completed an email identity for
-- this account, and with autoconfirm OFF that happens only when someone opened
-- the mailbox and followed the link. Possession of the mailbox is the proof, and
-- this is the one place in the token that records it and cannot be forged.
--
-- WHAT IT COSTS, stated rather than discovered later. An account that has ONLY
-- an OAuth identity cannot join by domain, even when the provider says it
-- verified the address — because the token does not carry that statement in any
-- field the provider cannot also be wrong about. Such a reader has two ways in
-- that need no weakening here: `pending_invites`, where a manager names the
-- address, or linking an email identity, which proves the mailbox the same way
-- everybody else does.
--
-- WHAT IT STILL DOES NOT PROTECT AGAINST. Turning ON autoconfirm. That makes
-- GoTrue complete an email identity without anyone opening anything, so
-- `providers` would say `email` for an address nobody proved. SECURITY.md
-- records this as a hard rule; it was already the rule for 0004 and it survives
-- unchanged, because it is the assumption every version of this guard rests on.
--
-- No function, no trigger, no view: `app_metadata` is read from the JWT with the
-- same `?` operator any Postgres has (§14.0 decision 8).
-- =============================================================================

drop policy if exists "join by matching email domain" on memberships;
drop policy if exists "join when invited by email" on memberships;

create policy "join by matching email domain" on memberships
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' -> 'providers' ? 'email', false)
    and exists (
      select 1 from orgs o
      where o.id = memberships.org_id
        and o.join_domain = split_part(auth.jwt() ->> 'email', '@', 2)
    )
  );

create policy "join when invited by email" on memberships
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' -> 'providers' ? 'email', false)
    and exists (
      select 1 from pending_invites p
      where p.org_id = memberships.org_id
        and p.email = auth.jwt() ->> 'email'
    )
  );
