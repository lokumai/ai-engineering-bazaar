-- =============================================================================
-- §14.5 — joining requires a VERIFIED address, not merely a claimed one.
--
-- WHAT WAS WRONG. Both join policies read `auth.jwt() ->> 'email'` and stopped
-- there. Under today's configuration that is safe by accident rather than by
-- construction:
--
--   MEASURED against this project. `signUp({ email: 'fake@intellica.net' })`
--   with the publishable key creates the user and returns NO SESSION;
--   `signInWithPassword` then answers "Email not confirmed" and also returns no
--   session. No session means no JWT, and no JWT means no policy can be
--   satisfied. Possession of the mailbox is the verification, and the emailed
--   link is what proves it.
--
-- So the email path is sound. The OAUTH path is where the assumption breaks. A
-- provider hands Supabase an address along with its own opinion of whether it
-- has verified it, and GitHub in particular will report a primary address it has
-- not verified. Supabase records that as `email_verified: false` and still
-- issues a session — correctly, because the account is real; it is the ADDRESS
-- that is unproven. At that point a policy keyed on `email` alone would admit
-- someone to an organisation on the strength of a string they chose.
--
-- The same reasoning applies to the invite path. An invitation names an address;
-- if the session's address is unverified, matching it proves nothing.
--
-- WHAT THIS DOES NOT PROTECT AGAINST, stated so nobody mistakes it for a
-- guarantee: turning ON Supabase's "autoconfirm" setting. Autoconfirm makes the
-- server treat every address as confirmed without checking, so
-- `email_verified` becomes `true` for an address nobody proved. This policy
-- cannot see the difference. Never enable autoconfirm on a project where
-- `orgs.join_domain` is in use — SECURITY.md records this.
--
-- The claim is read from the top level and from `user_metadata`, in that order,
-- because GoTrue writes it to both and the top-level copy is the one it
-- guarantees. `coalesce(..., false)` makes a missing claim a refusal rather than
-- a pass: a token shape this code does not recognise must not be the one that
-- gets in.
-- =============================================================================

drop policy if exists "join by matching email domain" on memberships;
drop policy if exists "join when invited by email" on memberships;

create policy "join by matching email domain" on memberships
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and coalesce(
      (auth.jwt() ->> 'email_verified')::boolean,
      (auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean,
      false
    )
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
    and coalesce(
      (auth.jwt() ->> 'email_verified')::boolean,
      (auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean,
      false
    )
    and exists (
      select 1 from pending_invites p
      where p.org_id = memberships.org_id
        and p.email = auth.jwt() ->> 'email'
    )
  );
