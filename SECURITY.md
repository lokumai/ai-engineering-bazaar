# Security

Notes on this repository's security posture, and the decisions behind it. New
concerns get appended here rather than argued twice.

## Reporting

Open a private security advisory on the repository, or email the maintainer
listed in `package.json`. Please do not open a public issue for anything that
looks exploitable.

## Current deployment posture

**Decided 2026-09-01.** The site is published at
`https://lokumai.github.io/ai-engineering-bazaar/` and stays there for now. The
team is small, every member has access to the `lokumai` GitHub account, and the
application is not yet in front of anyone outside it. A custom domain is not
being registered today; the reason it will be needed later is recorded below so
the decision can be revisited on evidence rather than from memory.

`NEXT_PUBLIC_AUTH_ENABLED` is the switch that gates the whole account layer. See
"Accounts on a shared origin" for what turning it on costs while the site is
served from a path.

## Accounts on a shared origin

### The mechanism

Browsers isolate storage by **origin**, and an origin is `scheme + host + port`.
It does **not** include the path.

```
https://lokumai.github.io/ai-engineering-bazaar/   ┐
https://lokumai.github.io/some-other-project/      ├─ ONE origin, ONE localStorage
https://lokumai.github.io/anything/                ┘

https://bazaar.lokumai.com/                        → different host, separate storage
```

Every GitHub Pages site published under the `lokumai` account shares that one
origin, so every one of them shares one `localStorage` bucket. Pages on the same
origin do not *trust* each other — the browser never draws a boundary between
them in the first place, so there is nothing to trust across and no access
control to consult.

### What is exposed

Two things live in that bucket:

- **`hl-record`** — the learner's whole record. Readable *and writable* by any
  page on the origin. `src/lib/record/schema.ts` has recorded this since Phase 2:
  the `hl-` prefix is the only isolation available, and `basePath` isolates
  nothing.
- **The Supabase session token**, once accounts are switched on. This is the one
  that turns a storage-sharing quirk into an account-takeover path.

The Supabase project URL and the publishable (anon) key are **not** secrets and
are not the exposure here. They are compiled into the browser bundle by design;
the security boundary is row-level security in Postgres. A session token is
different: it is the credential RLS resolves the request against. A stolen token
is indistinguishable from a legitimate one.

### How it would actually happen

The attacker never touches anyone's machine. It happens in the victim's own
browser:

1. A reader signs in to the bazaar. Supabase writes their session token to
   `localStorage` for origin `lokumai.github.io`.
2. The same reader later opens another page under that account — a teammate's
   project, a link in Slack. Same origin, same bucket.
3. That page's JavaScript runs in the reader's browser and can read the token.
4. With the token, anything the reader could do against Supabase can be done as
   them: read their record, and read their organisation's data.

Malice is not required for this to hurt. A sibling page that calls
`localStorage.clear()` on load destroys both the session and the record; one
that logs storage while debugging leaks the token into a console or a log
aggregator. A shared origin is as much a **bug surface** as an attack surface.

### Who could exploit it

Not an anonymous attacker on the internet. It requires the ability to publish a
page under `lokumai.github.io`, which today means write access to a repository in
the `lokumai` account. That is a small, known group — which is exactly why the
risk is being accepted for now, and exactly why it stops being acceptable once
the group is no longer small or no longer the only audience.

### The fix, when it is needed

A custom domain. `bazaar.lokumai.com` is a different host, therefore a different
origin, therefore its own storage that nothing under `lokumai.github.io` can
reach.

```
bazaar.lokumai.com   CNAME → lokumai.github.io
```

GitHub Pages serves a custom domain with a free Let's Encrypt certificate. Once
DNS is live: set the custom domain in the repository's Pages settings, enable
Enforce HTTPS, add `public/CNAME`, empty `BASE_PATH` in
`.github/workflows/deploy.yml`, and set `NEXT_PUBLIC_AUTH_ENABLED` there.

Moving to a path under the same host does **not** help. `/bazaar` instead of
`/ai-engineering-bazaar` changes nothing: the origin is the same.

### When the domain becomes mandatory

Any one of these makes it a blocker rather than a preference:

- **An organisation outside this team joins.** Their members' records — and
  their managers' view of their team — become reachable from any page on the
  shared origin. That is somebody else's data, and the risk is no longer ours
  to accept on their behalf.
- **Anyone outside the `lokumai` account can publish to it**, including through
  a compromised or abandoned repository, or a widened GitHub team.
- **A second site is published under the account at all.** Today there is one.
  The exposure is latent until there are two, and nothing in GitHub warns you on
  the day the second one appears.
- **The site is announced publicly with accounts enabled.** Volume alone raises
  the chance that a signed-in reader visits a sibling page.

Until then, the honest description is: a known, bounded risk, accepted
deliberately by a team that is also the entire audience.

## Joining an organisation by email domain

`orgs.join_domain` lets anyone whose address is on that domain join. The
question that matters is what stops somebody typing an address they do not own.

**The answer is possession of the mailbox, and it was tested rather than
assumed.** Signing up as `fake.email@intellica.net` with the publishable key
creates the user and returns **no session**; signing in then answers
`Email not confirmed` and also returns no session. No session means no JWT, and
no JWT satisfies any policy. The emailed link is the proof, and the link goes to
the real mailbox.

Both join policies additionally require the session to carry an **email
identity** — `app_metadata.providers` must contain `email`
(`0005_phase4_provider_verified.sql`). With autoconfirm off, GoTrue completes
that identity only when somebody opened the mailbox and followed the link, so it
is the token's record of the one thing that actually proves an address.

### The first version of this guard was forgeable

`0004_phase4_verified_email.sql` asked for `email_verified` and is superseded. It
is kept in the tree so an applied database can be brought forward, but **applying
0004 without 0005 leaves the guard bypassable by the person it guards against.**

Two measurements, both against this project:

- A Supabase access token carries **no top-level `email_verified` claim**. The
  full set is `iss, sub, aud, exp, iat, email, phone, app_metadata,
  user_metadata, role, aal, amr, session_id, is_anonymous`. So 0004's
  `coalesce` always fell through its first term.
- What it fell through to was `user_metadata`, which the signed-in user writes
  with `auth.updateUser({ data })`. End to end, with an account whose address
  the provider had not vouched for: join **refused**, then
  `updateUser({ email_verified: true })` **accepted**, then join **admitted**.

It was latent rather than live only because this project has one enabled provider
(email) and autoconfirm off, so a session cannot exist for an address whose
mailbox was never opened. Enabling GitHub or Google would have made it live
silently, while 0004's own comment claimed that case was covered.

`app_metadata` is not the same kind of field. Measured: a raw
`PUT /auth/v1/user` carrying `app_metadata` answers **403** and the token is
unchanged; supabase-js exposes no client path to it. Only the service role and
GoTrue write it.

**The rule this leaves behind: an authorisation decision must read a field the
party being authorised cannot write.** `email_verified` was the right question.
Reading it from `user_metadata` turned the answer into a formality.

The cost is stated rather than discovered later: an account with only an OAuth
identity cannot join by domain, however confidently the provider reports the
address. It is invited by address through `pending_invites`, or it links an email
identity and proves the mailbox like everybody else.

A missing claim counts as unverified. A token shape the policy does not
recognise must not be the one that gets in.

> **Never enable Supabase's email autoconfirm while `join_domain` is in use.**
> Autoconfirm makes the server treat every address as confirmed without checking
> anything, so `email_verified` becomes `true` for an address nobody proved, and
> the policy above cannot tell the difference. Anyone could then join by typing
> an address on the domain. The setting is `Authentication → Providers → Email →
> Confirm email`; it must stay **on** (that is, autoconfirm off).
>
> This is worth stating because turning it off is a tempting shortcut for
> testing. The account tests do not need it: they mint links with the service
> key instead.

If a domain is not under your control, do not put it in `join_domain` — use
`pending_invites` and name addresses one at a time.

## What is already sound

Stated so that a future audit does not have to re-derive it.

- **Authorisation is row-level security, in Postgres.** No Edge Functions, no
  RPC, no views. `supabase/migrations/0002_phase4_rls.sql` holds every policy;
  `scripts/test-rls.mjs` exercises all of them through PostgREST with real
  JWTs, because an over-permissive policy raises no error — it simply answers
  with rows it should not have returned.
- **A manager can read their organisation and can never write to it.** The only
  writer of a record is its owner. Asserted in the RLS suite.
- **`learner_event` takes no `update` and no `delete`** while an organisation
  holds it. A client cannot rewrite or erase history it has filed. When no
  organisation holds it, the owner may delete it and the erase now does
  (`0003` plus `RemoteRecordStore.deleteHistory`); RLS expresses the difference
  as a row filter, so a member's attempt removes nothing and raises nothing.
- **The publishable key is public by design.** Do not "fix" it into a secret;
  doing so would imply a boundary that is not there and distract from the one
  that is.
- **`service_role` never reaches a browser and never reaches Metabase.**
  Reporting connects with a separate read-only Postgres role. A `service_role`
  key in a dashboard makes every policy above irrelevant.
- **Accounts are optional and gate nothing.** A reader who never signs in
  touches no database at all — `tests/e2e/accounts-disabled.spec.ts` asserts
  that seven routes make zero requests to Supabase with the switch off.

## Operational rules

- `.env.local` is git-ignored and holds the service key and the database
  password. Never commit it, and never paste those two into an issue, a chat or
  a log.
- A loose `supabase-access-tokens` file in the repository root is also ignored.
  It is safer in `.env.local`; `.gitignore` should not be the only thing
  standing between a personal access token and a public repository.
- Only `NEXT_PUBLIC_SUPABASE_URL` and the publishable key belong in GitHub
  Actions secrets used by the deploy workflow. The service key has no
  business in a build that produces static files.
- `node scripts/check-supabase.mjs` verifies local configuration and prints no
  secret values — prefer it over echoing variables.

## Accepted risks

| Risk | Why it is accepted | What ends it |
|---|---|---|
| Session token and `hl-record` readable by any page on `lokumai.github.io` | Small team, same team is the whole audience, no external organisation onboarded, one site on the account | A custom domain, before any of the four triggers above |
| `profiles.github_login` is written by the client | RLS cannot restrict a single column, and §14.8.2 treats it as evidence. A reader could claim a login that is not theirs | Moving the write server-side, or a signed claim from the provider |
| A member can leave an organisation and then erase their event history | Deliberate: the disclosure at `/join/` is a bargain the reader struck, and withdrawing from it should not leave a copy they can no longer see | Nothing planned; revisit if a compliance requirement says otherwise |

This row was **aspirational until `deleteHistory` existed**. `0003` shipped the
policy that permits the delete and nothing in the application ever attempted it,
so the history stayed behind for everyone — including a reader who had never
joined anything, which is §14.6's first row and the case the migration was
written for. A policy no caller exercises is indistinguishable from a policy that
is not there, and the accepted-risk table above described a capability the code
did not have.
