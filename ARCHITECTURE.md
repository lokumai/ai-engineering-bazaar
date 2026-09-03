# Architecture

The map. What this repository is, the shape it has, and the handful of rules that
explain why the code looks the way it does. Read this first; the detail lives in
the documents linked at the end.

---

## What it is

A course site built **from** markdown rather than **around** it. Thirty-three
modules in `mini-courses/` are the corpus; everything a page shows — the
progress marks, the figure numbers, the source counts, the revision hashes, the
dependency graph — is derived from those files at build time. The output is a
static export: HTML, CSS and JS on GitHub Pages, no server.

On top of that sits an optional account layer. A reader can keep working with no
account at all, in which case nothing about them leaves their browser. Signing in
copies their record to Supabase so it survives the browser, and joining an
organisation lets its managers follow it.

```
mini-courses/*.md  ──build──▶  static export  ──▶  the reader's browser
   (read-only)                  53 pages            record in localStorage
                                                          │
                                                    optional account
                                                          ▼
                                                  Supabase: tables + RLS
                                                          │
                                                    manager panel · Analytics
```

| | |
|---|---|
| 33 | module sheets, in 6 categories, ordered by one config file |
| 58 | prerendered pages |
| 10 | Postgres tables, 23 RLS policies, **0** database functions |
| ~33k | lines of `src/`, ~28k of tests |

---

## The rules that explain the code

Six of them. Nearly every design decision in this repository is one of these
applied to a specific problem, so they are worth reading before the code.

### 1 · No page may lie

The oldest rule and the one the others serve. A page states what it knows, says
so when it does not know, and never presents a claim as a verified fact.

In practice: a denominator is derived rather than typed, an in-flight query
renders "in flight" rather than a zero, a failed write says `NOT SAVED` instead
of pretending, a signed-off sheet is labelled the reader's own assertion rather
than an achievement, and a footer that cannot reach the server says exactly that.

The rule has teeth because it is the one most often violated by convenience.
Several defects found while building the account layer were of exactly this
shape — four pages claiming the record "is never sent anywhere" after it started
being sent, an erase dialog promising a reach it did not have.

### 2 · Content is derived, never restated

`mini-courses/` is read-only. Nothing in `src/` may hold a fact that is already
in a markdown file: not a module count, not a title, not a category total. Every
transformation happens at build time from the file itself.

The reason is drift. A count typed into a component is correct the day it is
written and wrong the first time somebody adds a module — and nothing fails.

**`mini-courses/curriculum.yaml` is where the rule bottoms out.** It holds the
category order and, inside each, an ordered list of modules with a title, a
status, a duration and named prerequisites. No number appears in it anywhere: a
module's number **is** its position in that list, computed in one place in the
loader and written nowhere else. Filenames therefore carry no number either, and
prose names another module by title.

What that buys is a one-line reorder. Move an entry and the numbers, the
prev/next chain, the index order and the per-module CSS all follow, with nothing
under `src/` touched. It also removes a whole class of silent error: the
validator refuses a module listed without a file, a file written without a
listing, a prerequisite naming an unknown module, a prerequisite that sits later
in the course than the module needing it, and a `ready` module with no duration.
Each failure names the module at fault.

### 3 · The browser is the source

The reader's record lives in `localStorage`. Supabase holds a replica.

Not a preference — a consequence. There is no request-time server, so no cookie
and no header can carry reader state into prerendered HTML. The progress marks
have to be right in the *first painted frame*, which means reading storage
synchronously, which means a `fetch` cannot be on that path. So the network is
kept off it entirely: a local write never waits, and the account layer is
something that happens afterwards.

### 4 · One definition of each thing

Wherever a question has an answer, exactly one piece of code answers it.

| Question | The one place |
|---|---|
| How far along is this reader? | `lib/record/derive.ts` |
| What does a write to storage mean? | `lib/record/storage.ts` |
| What does "stalled" mean? | `lib/record/attention.ts` |
| Where does the record go? (the copy) | `lib/record/scope.ts` |
| What is an internal link? | `lib/content/links.ts` |
| What number is this module, and what comes next? | `mini-courses/curriculum.yaml` |

The failure this prevents is two answers that agree until they do not. A manager's
panel computing completion in SQL while the reader's page computes it in
TypeScript works fine — until the curriculum grows, and then one person is told
`18/32` and another `17/32` about the same progress. `derive.ts`'s output is
therefore *stored* in a column so reports read the same number instead of
recomputing it.

### 5 · Decisions are pure; only rendering needs a browser

Anything that decides something is a pure function taking its inputs explicitly —
including the clock. No `Date.now()` inside a reducer, no `Math.random()` in a
layout. That is what makes a boundary testable at the boundary.

What remains for a real browser is what only a browser can answer: did the
diagram island render, is the theme right in the first frame, does any page push
the document sideways at 390px, does a signed-in reader's record actually reach a
second machine.

### 6 · Authorisation lives in the database

Every access rule is a row-level-security policy in Postgres. No Edge Functions,
no RPC, no views — which also means the schema is portable Postgres and moves to
Neon or a self-hosted box unchanged.

The corollary matters as much: an over-permissive policy **never raises an
error**. It answers, with rows it should not have returned. So the policies are
tested against a real database with real JWTs rather than read for correctness.

---

## The build

```
mini-courses/              src/lib/content/                 src/app/
  curriculum.yaml            curriculum-file.ts  validates    generateStaticParams
  1_fundamentals/            loader.ts           walks it       ↓
    llms.md                  render.ts           md → html    out/
    llms_tr.md               links.ts            rewrites       courses/<cat>/<module>/
  2_intermediate/            derive.ts           counts         path/  dashboard/  …
  …                          facts.ts            the spine
```

Three parts of this are worth knowing:

- **The config is the contract**, validated with zod plus seven cross-file rules
  at build time. The valuable one compares the `.md` files on disk in a category
  against the names listed for it, in both directions, so a module you list
  without writing and a file you write without listing both fail by name. A
  module file's own frontmatter is down to `summary` and `objectives`; putting
  `module:` or `status:` back in it fails the build, because the config owns
  those.
- **Two generated files are written by `prebuild`**, and they are treated
  differently on purpose. `src/app/lokum-modules.css` is **committed**, because
  vitest and playwright never run `prebuild` and would otherwise test a file that
  is not there: change a `status` in the yaml and regenerate it in the same
  commit. `public/course-images/` is **gitignored**, because it is only a copy of
  images already in `mini-courses/`.
- **Internal links are rewritten**, not left as `.md`. A cross-reference that
  cannot be resolved to a real route **fails the build** — the gate that replaced
  `mkdocs build --strict` when this became a Next.js project, and the one that
  had to be extended after four dead links shipped through a path it did not
  cover.
- **Revision hashes come from git**, per file, which is why CI checks out with
  full history.

---

## The runtime, in layers

```
┌─ Channel A ──────────────────────────────────────────────┐
│ inline script in <head>, blocking, before first paint    │
│ reads localStorage → stamps <html> → CSS draws the marks │
│ zero React, correct in frame one                         │
└──────────────────────────────────────────────────────────┘
┌─ Channel B ──────────────────────────────────────────────┐
│ React islands, post-mount: readouts, panels, dialogs     │
│ getServerSnapshot returns the frozen empty record        │
└──────────────────────────────────────────────────────────┘
┌─ The account layer, optional ────────────────────────────┐
│ session → the claim → merge → throttled push             │
│ AccountSync.tsx is the ONE place these are joined        │
└──────────────────────────────────────────────────────────┘
```

The two channels exist because CSS can draw a reader's progress and React cannot
do it before hydration. Both are needed and neither replaces the other.

`AccountSync.tsx` is called out because its absence was the single largest defect
found in this work: ten agents built both halves of the account layer and nothing
joined them, so signing in did nothing at all. **A seam needs an owner.** Every
module either side of it is deliberately ignorant of the others — that is what
makes each testable in isolation — and the price of that ignorance is that one
file has to know all of them.

---

## Testing

Four suites, each answering something the others cannot.

| Suite | Runs | Answers |
|---|---|---|
| `npm test` — vitest | every push | anything that computes a value, with no DOM |
| `tests/corpus/` | inside `npm test` | the transforms against every real module, not a fixture |
| `npm run test:e2e` — Playwright, real Chrome | every push | first-frame correctness, layout at three widths, real interaction |
| `node scripts/test-rls.mjs` | by hand, needs credentials | every policy, through PostgREST, with real sessions |

Two habits are load-bearing rather than decorative:

- **Measure, do not assert.** The most valuable results in this repository came
  from measuring: finding 39 broken links by counting them in the export, proving
  a CI failure was pre-existing by building the previous commit in a worktree,
  proving a magic link could not work cross-device by watching it fail in Chrome.
- **Mutation-test the guards that matter.** A test that would pass against a
  deliberately broken implementation is not protecting anything. The claim gate
  and the sync generation counter were each verified by removing them and
  watching the right test fail.

A third habit belongs to the corpus rather than the code, and it is the one most
often got wrong here. **A test may check a rule that holds for any content. It
may never write down a fact about the content.** The suite once transcribed
heading spines, word counts, module numbers and quoted prose, so ordinary edits
turned the build red and taught nobody anything, and not one of those pinned
facts ever caught a real defect. The rule, the four layers that replaced them and
the questions to ask before adding a test live in
[`tests/README.md`](tests/README.md). Read it before touching anything under
`tests/`.

The browser suite is where this leaks hardest, because `tests/e2e/sheets.ts`
names representative sheets by number and specs then measure prose on them.
Rewriting a module moves those measurements, and rewriting the Intermediate
sheets took out 29 cases at once.

`scripts/check-mermaid.mjs` parses and renders every diagram in `docs/` in real
Chrome, because a broken diagram is an error box on GitHub rather than a build
failure.

---

## Deployment

`main` → GitHub Actions → GitHub Pages, at
`https://lokumai.github.io/ai-engineering-bazaar/`.

The workflow guards the two failures that would otherwise publish **green** and
serve a broken site: a dropped `.nojekyll` (which makes Jekyll delete `_next/`,
leaving unstyled HTML), and a `basePath` that never reached `assetPrefix` (which
404s every stylesheet). It also checks the *published* site rather than the
artifact, because the worst failures happen after the upload.

Accounts are gated on `NEXT_PUBLIC_AUTH_ENABLED`, a build-time constant. It is a
real safety measure, not a rollout convenience: see [`SECURITY.md`](SECURITY.md)
for what enabling it costs while the site is served from a shared origin, and for
the conditions under which a custom domain stops being optional.

---

## Read next

| Document | For |
|---|---|
| [`README.md`](README.md) | What the course is, and the commands to run it |
| [`mini-courses/MANIFEST.md`](mini-courses/MANIFEST.md) | The seven rules every module is held to. Read before writing content |
| [`mini-courses/CLAUDE.md`](mini-courses/CLAUDE.md) | The working agreement: how a module gets written, the diagram system, the naming rules |
| [`tests/README.md`](tests/README.md) | The testing rule, the four layers, and what fails for a reason |
| [`docs/data-flow.md`](docs/data-flow.md) | The record, storage, sync, two devices, the exported file |
| [`docs/auth-flow.md`](docs/auth-flow.md) | Sign-in, sessions, joining, who may read what |
| [`docs/manager-queries.md`](docs/manager-queries.md) | Tables, columns, joins, and SQL a manager needs |
| [`SECURITY.md`](SECURITY.md) | Threat notes, accepted risks, operational rules |
| [`supabase/README.md`](supabase/README.md) | Applying the schema |

The code carries its own reasoning. Modules open with a comment recording the
decision and *why*, including the alternatives that were rejected and, where it
mattered, the measurement that settled it. If a comment restates the code, it is
a defect; if it tells you why the code is not the obvious thing, it is doing its
job.
