# Security

Notes on this repository's security posture, and the decisions behind it. New
concerns get appended here rather than argued twice.

## Reporting

Open a private security advisory on the repository, or email the maintainer
listed in `package.json`. Please do not open a public issue for anything that
looks exploitable.

## Current posture

The site is a static export published at
`https://lokumai.github.io/ai-engineering-bazaar/`. There is no server, no
account and no database: the optional account layer (Supabase, sign-in, teams,
organisations) was removed on 2026-11-05 (M40). A reader's progress is one
`localStorage` key, `hl-record`, in their own browser, and the export is a file
the browser writes to their own disk.

## Accepted risks

| Risk | Why it is accepted | What ends it |
|---|---|---|
| `hl-record` is readable by any page on `lokumai.github.io` | An origin is scheme, host and port, so every Pages site under the account shares one. The record holds only which modules are completed, which checklist items are ticked, and reading preferences: no name, no address, nothing typed | A custom domain |

## Operational rules

- `.env.local` and a loose `supabase-access-tokens` file are git-ignored
  because they once held real credentials. Keep those `.gitignore` lines.
