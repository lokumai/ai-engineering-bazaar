# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

[`kia-context/specs/ARCHITECTURE.md`](kia-context/specs/ARCHITECTURE.md) is the
architecture document, and the only one: the six rules that explain why the code
looks the way it does, plus the domain, the lifecycles and the vocabulary. Read it
before a first substantive change. This file is the operating manual on top of it.
The root `ARCHITECTURE.md` was folded into it on 2026-09-08.

**The interface has been replaced, and M16 is closed.** Not the functionality:
every capability stayed, and the presentation, the vocabulary and the palette
changed. The capability ledger at the end of
[`kia-context/logs/PROGRESS_2.md`](kia-context/logs/PROGRESS_2.md) is the check
that nothing was lost — one row per capability, where it lives, and the
behavioural test that proves it.
**The mockup is the specification, and it outranks every document.**
`playground/01-theme-T4-ground-G3-powder.html` is what the interface must look
like. [`kia-context/specs/DESIGN.md`](kia-context/specs/DESIGN.md) is a
transcription of its design *language* and names it in `source:`; where the two
disagree, **the mockup is right and DESIGN.md is the bug** — with one named
exception, listed in DESIGN.md itself, because a measured accessibility floor
outranks a transcribed value (**D34**).

**M16 was ten stages and all ten shipped**, in
[`kia-context/logs/PROGRESS_2.md`](kia-context/logs/PROGRESS_2.md) — the token
layer, the shell, the navigation, the rail, the catalog, the reading page, code
and figures, completion, progress and account, home, and the eight routes no
mockup draws. Each stage's entry names its reference mockup, what it touched,
the fidelity roles it added and the traps in it; seven reports follow, and each
one records what its own brief had wrong. **Read a stage's report before
trusting its brief.**

`PROGRESS.md` is part 1 and closed: M1 to M15, and the review pass over M10 to
M14. New milestones go in part 2.

**The retired vocabulary is out of the markup** — `hl-` in any `className` is
**0**, from 792 — and what survives of that prefix survives on purpose: the
twenty-six `data-hl-*` attributes islands and specs query, the three `<html>`
stamp families whose pattern `src/lib/record/stamp.ts` owns, and the storage
keys, whose prefix is the only isolation available on a shared `github.io`
origin. **Renaming any of those costs a keyboard shortcut, a mark that is right
in frame one, or every existing reader's record.** A guard checks all three
rather than merely excluding them.

Two things are still the author's to settle, both recorded in the code rather
than left implicit: whether a figure wider than the measure may bleed past the
text (it does not, and reversing that is one rule in `prose.css` — **D43**), and
whether the pager's direction label should be lifted off `on-surface-faint` at a
measured 3.30:1, which would be a **second** entry in DESIGN.md's `DEVIATIONS`
list (**D45**).

Two things every stage does. It compares the built surface to its mockup by
adding roles to `APP_SELECTORS` in `tests/e2e/fidelity.ts` **and** a
`fidelity.spec.ts` block with its mutation, in the same sitting. And it takes
**geometry from the component mockup and colour from the shell** (**D31**):
`02` to `09` are on a deliberately older palette, so reading them literally
would put a green accent on a cool grey ground.

**Since stage 4, D31 is mechanical rather than a rule to remember.** The
harness knows which mockup specifies which role (`REFERENCE_OF`), and a role
whose reference is not `01` **may carry no colour fact** — so a non-shell
mockup can only ever be compared on lengths and type steps. Two more registries
go with it, and each entry has to state a reason: `WITHOUT_REFERENCE` for a
component no mockup draws (**D30**), and `NARROW_DEVIATIONS` for a fact that
stops being specified below the language's own lower breakpoint. A guard fails
any narrow deviation that has stopped deviating, because a stale exemption
hides the next difference.

**`src/design/bazaar.css` is the language as CSS** — both themes, every
primitive — and it is the token layer the site loads. A surface stylesheet in
`src/app/` arranges its primitives and defines none of its own;
`tests/unit/design/surface-stylesheets.test.ts` holds them to that.

**Three guards exist because of failures that nothing else could see, and they
are three corners of one failure.** A class or a token can go missing in three
directions and none of them is an error to any other tool in this project:
`tests/unit/design/styling-references.test.ts` reads every colour, font and size
utility plus every `var(--…)` out of the markup and the surface stylesheets and
requires each to resolve against the language — because **a Tailwind utility
named after a deleted token emits nothing at all**, with no error and no
warning, and 401 references were silently inert for one commit. The same file
also refuses **a `bz-` class no stylesheet answers to**, which is that failure
pointing the other way and is the state the whole interface was in for one
commit after stage 0 deleted the eleven stylesheets: unstyled semantic HTML,
and not one thing in the suite said so. And
`tests/unit/color/category-css.test.ts` refuses **a generated selector no
component carries**, which four of its five groups were for four commits.

Beside them, `tests/e2e/fidelity.ts` compares a built page to its mockup fact by
fact, which is the check whose absence let five milestones ship the wrong
design. It knows five reference documents now, each in one record.

**Before styling anything, open the mockup, then DESIGN.md — and copy neither a
nearby component nor the old stylesheets.** M9 to M14 re-themed the old
interface instead of rebuilding it, because the design document they were built
against described the old structure carrying the new palette; 378 of the old
design's 398 class names survived five milestones meant to replace them
(`logs/BRAINSTORM_2.md` **D26**). Two live constraints: the top bar is a solid
cobalt slab with its own on-bar sub-palette and never sits on the page ground,
and because the ground is `#FDFBF7` a raised surface is told apart by its
**hairline and not its fill** — with `line` for grouping and `line-strong` for
an interactive or hovered edge. **A surface's layout is not in DESIGN.md by
design**: it lives in the M16 table, against the mockup that surface came from.

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
| [`kia-context/specs/ARCHITECTURE.md`](kia-context/specs/ARCHITECTURE.md) | The six rules, the domain, the lifecycles, the build, the runtime layers |
| [`mini-courses/CLAUDE.md`](mini-courses/CLAUDE.md) | The corpus agreement: how a module gets written, figures, translation |
| [`mini-courses/MANIFEST.md`](mini-courses/MANIFEST.md) | The seven rules every module is held to |
| [`kia-context/specs/DESIGN.md`](kia-context/specs/DESIGN.md) | The design system: every token value, which border token to use, the six primitives M16 derived, and the do-nots |
| [`tests/README.md`](tests/README.md) | The testing rule, the four layers, and the checks that fail for a reason |
| [`docs/data-flow.md`](docs/data-flow.md) | The record, storage, sync, two devices, the exported file |
| [`docs/auth-flow.md`](docs/auth-flow.md) | Sign-in, sessions, joining, who may read what |
| [`docs/manager-queries.md`](docs/manager-queries.md) | Tables, columns, joins, manager SQL |
| [`SECURITY.md`](SECURITY.md) | The shared-origin exposure, accepted risks, operational rules |
| [`supabase/README.md`](supabase/README.md) | Applying the schema |


@AGENTS.md
<!-- kiacontext:begin -->

## kiacontext — this project's memory. Read this before you start work.

This repository carries a folder called `kia-context/`. It is a small set of Markdown files holding what a
reader of the code cannot see: what is being built right now, what was already decided and why, what was
tried and rejected, and what must never change. The layout is a reusable harness called **kiacontext**;
everything inside it is specific to this project.

> ### 👉 Start by reading `kia-context/INDEX.md`.
>
> It is the map of every other file — one minute of reading, and nothing below makes proper sense
> without it. **Read it before your first substantial action in a session**, not when you get stuck.

**Why this exists.** You start every session with no memory of the last one. The code can tell you *what*
the system does; it can never tell you *why* it is that way, what was already attempted and abandoned, or
which awkward-looking part is deliberate and must not be "improved". Without that, settled arguments get
re-run, decisions get quietly reversed, and work is redone. These files are the part of the project that
survives between sessions.

**They are authoritative.** Where the code and a spec disagree, that is a finding to raise with the
human — not a document to ignore.

**You write these files. The human decides what goes in them.** Every file under `kia-context/` is written
by an agent, out of a conversation — nobody maintains them by hand. Your job is to keep them true.

**How to use them.**

- **Before proposing or building anything:** `specs/MANIFESTO.md` for the boundary you may not cross, and
  the ACTIVE part of `logs/BRAINSTORM.md` — currently `BRAINSTORM_2.md` — to check whether your
  idea was already considered and rejected.
- **Before touching anything structural:** `specs/ARCHITECTURE.md`.
- **Every session:** `logs/PROGRESS.md` **and its later parts** hold the current milestone, its
  deliverables and their
  acceptance criteria — what is being built, and how far it got. How to work through it is written in
  that file, not here.
- **Every file states its own terms.** Its frontmatter says how binding it is, who may write to it,
  whether it is still active, and — in the description — what does *not* belong in it. Read that before
  editing; it beats guessing from the filename.
- **The body of a file is yours; its frontmatter is not.** Every heading, table and section you find in
  these files is a starting suggestion — reshape any of it to fit the project, and delete what does not
  apply rather than leaving it empty. The six frontmatter fields are the exception: they are what make a
  file part of kiacontext, so keep all six on every file and keep their values current.
- **Writing back is part of the work, not an afterthought.** A session that changes the project and
  leaves these files untouched has thrown away everything it learned.

### The layout

Four levels under `kia-context/`, split by **authority**, not by topic.

| | Path | Who writes | What it is |
|---|---|---|---|
| **Map** | `kia-context/INDEX.md` | agent, when files move | What exists, and what points at what |
| **0** | `kia-context/genesis/` | agent, at t=0 | Where this came from. `SEED.md`, `GENESIS.md` |
| **1–2** | `kia-context/specs/` | agent, when explicitly refactoring | The law. `MANIFESTO.md`, `ARCHITECTURE.md`, `DESIGN.md` |
| **3** | `kia-context/logs/` | agent, every session | State. `PROGRESS.md` + `PROGRESS_2.md`, `BRAINSTORM.md` + `BRAINSTORM_2.md` |

`docs/` is a different thing entirely: human-facing artifacts, written **only when a human asks for one**.
Agents do not maintain them and do not need to read them to do the work.

**Where a finding goes.** The reasoning into `BRAINSTORM.md` as a numbered decision. The work into
`PROGRESS.md`. A resulting rule goes into `MANIFESTO.md` **or** `ARCHITECTURE.md`, and that split is the
one people get wrong:

- **`MANIFESTO.md` holds a promise.** Somebody chose it and could have chosen otherwise, and it would
  still stand if the whole system were rewritten in another language tomorrow.
- **`ARCHITECTURE.md` holds a fact about how the system is built.** What the things are, how they relate,
  what states they move through, and where a rule is actually enforced.

**A domain rule that sounds like a business rule is usually ARCHITECTURE.** *"An order has one customer
and many lines"* is the data model, not a promise. When a rule is genuinely both, `MANIFESTO.md` states
the promise in one line and `ARCHITECTURE.md` says how it is enforced — never both in full, and never
only the promise, which leaves the mechanism written down nowhere.

### Seven rules for keeping these files honest

Every one of them exists because breaking it cost something, and **not one of them fails loudly** — this
harness is prose, so nothing errors when a link dies or a number goes wrong.

1. **Never renumber.** Rule numbers, decision numbers and milestone numbers get cited from code comments
   and from other documents. **Append. Strike through rather than delete.**
2. **After renaming or moving a file, grep the old name.**
   `grep -rn "OldName" . --exclude-dir=node_modules --exclude-dir=.git`
   Paths resolved at run time and links written in prose are invisible to a test suite.
3. **Never copy a rule into a second file.** Two copies are two rules, and one of them will decide
   something. One file states it; every other file links to it.
4. **A closed file stays closed.** New entries go in the active part. If you are appending to a file whose
   `status:` is `closed`, you are in the wrong file.
5. **The index is a map, not an authority.** If `INDEX.md` disagrees with the file it describes, the file
   is right and the index is the bug.
6. **Frontmatter carries the scope.** `covers` and `status` say which era a file describes; `last_updated`
   says when it was last true. Update them when you edit, or the next reader trusts a stale file.
7. **Every number is measured, or it is left out.** Counts, line totals, test figures, file totals. A
   reasoned number is wrong often enough to be worthless, and writing it down makes it look checked.

### When to write to `BRAINSTORM.md`, and when not to

Not for every fix — that is how a decision log becomes unreadable. An entry earns its place when **an
alternative was rejected**, or when **a measurement changed our minds**: anything an outsider would read
two months later and ask *"why was it done this way?"*. Ordinary work belongs in `PROGRESS.md`, and the
commit message covers the rest.

### Splitting a file

Split on a **phase boundary** first, and on **length** second — roughly 1,500 lines, or whenever the file
has stopped being readable. Continue the numbering, never restart it, and put the next/previous
navigation block at the top and bottom of both parts. Name the parts `NAME.md`, `NAME_2.md`, `NAME_3.md`.

Files that describe **one current state** — `ARCHITECTURE.md`, `DESIGN.md`, `MANIFESTO.md` — are never
split. They change in place.

<!-- kiacontext:end -->
