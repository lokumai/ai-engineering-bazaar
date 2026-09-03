# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

[`ARCHITECTURE.md`](ARCHITECTURE.md) is the map — the six rules that explain why
the code looks the way it does. Read it before a first substantive change. This
file is the operating manual on top of it.

## Two halves, and which file governs which

This repository holds two projects that meet at one file, and they have separate
working agreements. Read the right one.

| Working in | Governed by | In short |
| --- | --- | --- |
| `src/`, `tests/`, `scripts/`, `supabase/` | **this file** | The application that renders the corpus |
| `mini-courses/` | [`mini-courses/CLAUDE.md`](mini-courses/CLAUDE.md) | The authored course, and everything `MANIFEST.md` governs |

They share the derive-never-restate rule and the measure-do-not-assert habit,
and they diverge on almost everything else: the corpus agreement is about prose,
figures, translation and the seven manifest rules, none of which apply to code.

**`mini-courses/curriculum.yaml` is the file they meet at.** It is authored by
the course side and read by the app side, which makes it the only place a change
in one half can break the other. `mini-courses/AGENTS.md` is a byte-identical
copy of the corpus agreement; the `AGENTS.md` at this root is something else
entirely, a block `next dev` writes and re-adds on every run, so leave it alone
apart from committing it with your work.

## Commands

```bash
npm run dev            # next dev on :3000, basePath '' (prebuild copies course images)
npm run build          # static export into out/
npm run typecheck      # tsc --noEmit, strict
npm test               # vitest run — tests/unit/** + tests/corpus/**
npm run test:e2e       # playwright: builds, serves out/ on :3111, real Chrome
npm run test:e2e:dev   # same suite against next dev (unminified React errors)
```

CI (`.github/workflows/ci.yml`) runs typecheck → test → build → e2e, in that
order. Run all four before opening a PR; a green `npm test` alone means little
here, because the link gate and the export itself only fail in `build`.

**A single test:**

```bash
npx vitest run tests/unit/record/merge.test.ts        # one file
npx vitest run tests/unit/path -t "denominator"       # by name
npx playwright test theme.spec.ts --project=chrome-1440
npx playwright test responsive.spec.ts --project=chrome-390 -g "no sideways"
```

Only `responsive.spec.ts` runs on all three viewport projects (1440/1024/390);
everything else runs on `chrome-1440` only. First run on a machine needs real
Chrome: `npx playwright install --with-deps chrome`, or set
`E2E_CHANNEL=chromium` to use the bundled build.

**Reproducing the deployed build** — GitHub Pages serves from a sub-path, and a
missing `basePath` is invisible locally:

```bash
SITE_BASE_PATH=/ai-engineering-bazaar npm run build
npm run serve:out
```

**The two credentialed suites** skip cleanly with no `.env.local`, so a fresh
clone still runs everything green:

```bash
node scripts/check-supabase.mjs                          # config + live checks, prints no secrets
node scripts/test-rls.mjs                                # every RLS policy, real JWTs, real PostgREST
NEXT_PUBLIC_AUTH_ENABLED=true npm run build              # then, against that build:
E2E_ACCOUNTS=1 npx playwright test accounts.spec.ts
node scripts/check-mermaid.mjs docs/*.md                 # parses AND renders every diagram in Chrome
```

Run `check-mermaid.mjs` on any doc whose mermaid you touched: a broken diagram
is an error box on GitHub, never a build failure.

## Architecture, in the parts that span files

**The content pipeline.** `mini-courses/curriculum.yaml` + `mini-courses/*.md` →
`src/lib/content/` → routes. `curriculum-file.ts` validates the config with zod
plus seven cross-file rules, `loader.ts` **walks that config** rather than the
directory, `render.ts` does md→html, `links.ts` rewrites cross-references,
`derive.ts` counts, and `facts.ts` is the spine every page asks for the corpus.

Because the loader walks the config, **a module's number is its position in
`curriculum.yaml`**, computed there and written nowhere else. Filenames carry no
number, prose names another module by title, and a module's own frontmatter is
`summary` and `objectives` only. Adding `module:` or `status:` back to a file
fails the build. Reordering the course is moving one line. All of it is
build-time-only and reaches `node:fs`, so it may never be imported by a client
component — that is why `layout.tsx` measures `curriculumFacts()` itself and
passes the result down as props.

**The record.** `src/lib/record/` is the learner's state, and `store.ts` is its
only writer. Reads happen twice per page and the split is load-bearing (§12.2):

- **Channel A** — `boot.ts` generates a blocking inline script in `<head>` that
  reads `localStorage`, stamps `<html>`, and lets CSS draw the progress marks
  before first paint. No React, correct in frame one.
- **Channel B** — React islands after mount (`RecordStateSync`, panels,
  dialogs). `getServerSnapshot` returns the frozen empty record, because the
  prerendered HTML has never met the reader.

Anything derived belongs in exactly one file: `derive.ts` (how far along),
`attention.ts` (what "stalled" means), `scope.ts` (where the record goes, i.e.
the reader-visible copy about it), `storage.ts` (what a write means).

**The account layer** is optional and gates nothing.
`src/components/record/AccountSync.tsx` is **the seam** — the single place where
session, `createSync`, `createRemoteRecordStore`, `claimMerge` and the claim UI
are joined. Its absence was the largest defect in Phase 4: both halves existed
and signing in did nothing. When adding to either side, check that the seam
actually calls it.

`src/lib/record/wire.ts` is the shared vocabulary between the local and remote
halves (`EventKind`, `LearnerEvent`, `RemoteRecordStore`, `Progress`). Change it
deliberately; both sides compile against it.

**Authorisation is row-level security only.** `supabase/migrations/` holds the ten
tables and every policy, applied with `psql` in numeric order. **No Edge
Functions, no RPC, no views, no triggers** — the schema stays portable Postgres.
An over-permissive policy raises no error, so every policy change needs
`scripts/test-rls.mjs`; note that RLS *filters* `UPDATE`/`DELETE` silently and
only `INSERT` raises, which is why that suite has both `expectRefused` and
`expectTouchesNothing`.

## Rules that are enforced, and will fail a build

- **`mini-courses/` is read-only.** Nothing in `src/` may restate a fact that
  lives in a markdown file — no module count, no title, no category total.
  Derive it at build time.
- **The config is validated, and the useful rule is the set comparison.** For
  each category, the `.md` files on disk and the names listed in
  `curriculum.yaml` must be the same set in both directions, so a module listed
  without a file and a file written without a listing both fail by name. Also
  enforced: unique names, resolvable prerequisites that sit earlier in the
  course, a `ready` module with a positive duration, and a `_tr.md` sibling for
  every module.
- **Regenerate `src/app/lokum-modules.css` in the same commit as a `status`
  change.** `prebuild` writes it, vitest and playwright never run `prebuild`,
  and it is committed for exactly that reason. `public/course-images/` is the
  other generated output and is gitignored, being only a copy of what is already
  in `mini-courses/`.
- **A test may check a rule that holds for any content; it may never write down
  a fact about the content.** A word count, a table count, a heading spine or a
  module number in an assertion turns an ordinary edit red and teaches nobody
  anything. [`tests/README.md`](tests/README.md) carries the rule, the four
  layers and what fails for a reason. The browser suite leaks hardest here,
  because `tests/e2e/sheets.ts` names representative sheets by number and specs
  then measure prose on them.
- **An unresolvable internal `.md` link fails the build**, and
  `tests/corpus/links.test.ts` also asserts no rendered HTML anywhere carries a
  non-external `href` ending in `.md`. It checks every surface that renders
  markdown, because a body-only gate once passed while four dead links shipped.
- **The copy register** (`tests/unit/copy-register.test.ts`) bans exclamation
  marks, praise, anthropomorphism, "just"/"simply"/"easy", "please"/"sorry",
  confirmshaming, and a second spelling of any status (`NOT DRAWN`, never
  `NOT YET DRAWN`) from every reader-visible string.
- **`border-width: var(--stroke-struct)` fails** (`stroke-weights.test.ts`).
  Chrome floors border widths to whole pixels, so the middle line weight must be
  painted — a gradient or a height — not bordered.
- **Colour is never the only signal.** Contrast and palette tests recompute
  every ratio from the shipped stylesheets rather than asserting a table, and an
  e2e spec loads the site under `forced-colors: active`.
- Decisions are pure functions with the clock passed in — no `Date.now()` in a
  reducer, no `Math.random()` in a layout.

## Working conventions

- **Measure, don't assert.** Every important result in this repository came from
  measuring: counting broken links in the export, watching a magic link fail
  cross-device in Chrome, executing the doc SQL against the live schema.
  Verify counts and constants from the repo, not from memory.
- **Mutation-test guards that matter.** A test that passes against a
  deliberately broken implementation protects nothing.
- Module headers record the decision and *why*, including rejected alternatives
  and the measurement that settled it. A comment restating the code is a defect.
- **Never add `Co-Authored-By: Claude`, "Generated with Claude Code", or any
  other AI attribution** to a commit message or PR body in this repository.
- `docs/superpowers/` is gitignored — specs and plans stay local, never
  committed. `.env.local` and a loose `supabase-access-tokens` file are ignored
  because they hold real secrets; do not remove those `.gitignore` lines.
- Do not paste the database password or `SUPABASE_SERVICE_ROLE_KEY` into chat, a
  log, or any GitHub Actions secret used by the deploy workflow. Only
  `NEXT_PUBLIC_SUPABASE_URL`, the publishable key, and
  `NEXT_PUBLIC_AUTH_ENABLED` belong there.
- **Never enable Supabase's email autoconfirm** while `orgs.join_domain` is in
  use — it makes `email_verified` true for an address nobody proved, and the
  join policies cannot tell the difference. See `SECURITY.md`.
- `NEXT_PUBLIC_AUTH_ENABLED` defaults to `false` and must stay that way in
  `.env.local`: the default e2e run asserts zero Supabase requests, and CI never
  sees your local file.

## Read next

| Document | For |
| --- | --- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | The six rules, the build, the runtime layers |
| [`mini-courses/CLAUDE.md`](mini-courses/CLAUDE.md) | The corpus agreement: how a module gets written, figures, translation |
| [`mini-courses/MANIFEST.md`](mini-courses/MANIFEST.md) | The seven rules every module is held to |
| [`tests/README.md`](tests/README.md) | The testing rule, the four layers, and the checks that fail for a reason |
| [`docs/data-flow.md`](docs/data-flow.md) | The record, storage, sync, two devices, the exported file |
| [`docs/auth-flow.md`](docs/auth-flow.md) | Sign-in, sessions, joining, who may read what |
| [`docs/manager-queries.md`](docs/manager-queries.md) | Tables, columns, joins, manager SQL |
| [`SECURITY.md`](SECURITY.md) | The shared-origin exposure, accepted risks, operational rules |
| [`supabase/README.md`](supabase/README.md) | Applying the schema |


@AGENTS.md