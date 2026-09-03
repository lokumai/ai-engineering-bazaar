-- =============================================================================
-- §14.6 — the one delete policy on `learner_event`, and the reason it is narrow.
--
-- WHAT WAS WRONG. §14.6's table has three rows:
--
--   not in any org          -> record_state deleted, learner_event deleted
--   in an org               -> record_state deleted, learner_event SURVIVES
--   account closed entirely -> both deleted, by cascade
--
-- 0002 shipped no delete policy on `learner_event` at all, which implements the
-- second and third rows exactly and makes the FIRST ONE UNPERFORMABLE. A reader
-- who never joined an organisation, whose event rows have no audience anywhere,
-- could not remove them by any means short of closing the account. The erase
-- dialog could not honestly offer what §14.6 promises, so §1 was violated by
-- the migration rather than by the copy.
--
-- WHAT THIS POLICY SAYS. A reader may delete their own event rows when no
-- organisation holds them — expressed as membership, because membership is what
-- gives an organisation its claim (§14.5.1's disclosure is what the reader
-- agreed to, and it is agreed to by inserting the membership row).
--
-- THE LOOPHOLE, STATED. `memberships` has a "leave own membership" policy
-- (§14.4.2), so a reader can leave every organisation and then erase. That is
-- deliberate and it is the right direction: §14.5.1's disclosure is a bargain
-- struck by the reader, and a reader who withdraws from it should not leave a
-- copy behind they can no longer see. The organisation keeps what it saw while
-- the member was a member — in its own reports, and in `record_state` until the
-- erase — and loses the raw log. The alternative, a history no member can ever
-- remove by any action, is a harder position to defend than this one.
--
-- RECURSION. `learner_event` -> `memberships` -> (`org_manager`, `orgs`,
-- `pending_invites`), all terminal. `learner_event` is not in its own
-- transitive closure, so no 42P17. Verified by `scripts/test-rls.mjs`, which
-- runs every policy through PostgREST with a real JWT.
-- =============================================================================

create policy "erase own history when no organisation holds it" on learner_event
  for delete to authenticated
  using (
    user_id = auth.uid()
    and not exists (
      select 1 from memberships m where m.user_id = auth.uid()
    )
  );
