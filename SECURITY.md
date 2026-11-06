# Security

Notes on this repository's security posture, and the decisions behind it. New
concerns get appended here rather than argued twice.

## Reporting

Open a private security advisory on the repository, or email the maintainer
listed in `package.json`. Please do not open a public issue for anything that
looks exploitable.

## Current posture

The site is a static export published at `https://ai-bazaar.lokum.dev/`, its own
origin (`lokumai.github.io/ai-engineering-bazaar/` redirects to it). There is no server, no
account and no database: the optional account layer (Supabase, sign-in, teams,
organisations) was removed on 2026-11-05 (M40). A reader's progress is one
`localStorage` key, `hl-record`, in their own browser, and the export is a file
the browser writes to their own disk.

## Accepted risks

None open. The one this file listed, `hl-record` readable by every page on the shared
`lokumai.github.io` origin, ended when the site moved to its own domain on 2026-11-06.

## Operational rules

- `.env.local` and a loose `supabase-access-tokens` file are git-ignored
  because they once held real credentials. Keep those `.gitignore` lines.
