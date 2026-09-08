---
description: >
  The technical blueprint. What this project IS and how it actually works — the domain it models, the
  rules it enforces, and the machinery underneath. A reader must be able to UNDERSTAND the system from
  this file, not merely find out where to look: it is not an orientation page, an index or a map. The
  stack and the folder tree are the cheapest facts in any repository and an agent re-derives both in one
  command; the value here is everything a command cannot produce. It describes the CURRENT state, so it
  changes in place and is never split.
  NOT here: rationale or rejected options (BRAINSTORM.md), product rules (MANIFESTO.md), visual design
  (DESIGN.md), or a deep file tree — a written tree is stale within a week.
authority: blueprint
writes: agent, when explicitly refactoring
status: active
covers: the whole system as built on 2026-09-08
last_updated: "2026-09-08"
---

# 🏗️ ARCHITECTURE — How this project is built

> **This is the only architecture document.** The repository root used to hold a second one, written
> by the colleague who owns the application. It was folded into this file and deleted on 2026-09-08
> (`logs/BRAINSTORM.md` D11), because a third of it overlapped and two documents describing one system
> is two documents that disagree. Its six rules survive below, unchanged in substance; its stale
> counts were corrected against the repository on the way in.

---

## What this is

A course site built **from** markdown rather than **around** it. The 33 modules in `mini-courses/`
are the corpus, and everything a page shows — the progress marks, the figure numbers, the source
counts, the revision hashes, the dependency graph — is derived from those files at build time. The
output is a static export: HTML, CSS and JS on GitHub Pages, no server.

On top of that sits an optional account layer. A reader can work with no account at all, in which
case nothing about them leaves their browser. Signing in copies their record to Supabase so it
survives the browser, and joining an organisation lets its managers follow it.

```
mini-courses/*.md  ──build──▶  static export  ──▶  the reader's browser
   (read-only)                  56 pages            record in localStorage
                                                          │
                                                    optional account
                                                          ▼
                                                  Supabase: tables + RLS
                                                          │
                                                    manager panel
```

---

## The six rules that explain the code

Nearly every design decision in this repository is one of these applied to a specific problem, so
they are worth reading before the code. **They came from the document this file absorbed and they are
the most reusable thing in it.**

### 1 · No page may lie

The oldest rule and the one the others serve. A page states what it knows, says so when it does not
know, and never presents a claim as a verified fact.

In practice: a denominator is derived rather than typed, an in-flight query renders "in flight"
rather than a zero, a failed write says `NOT SAVED` instead of pretending, a signed-off module is
labelled the reader's own assertion rather than an achievement, and a footer that cannot reach the
server says exactly that.

The rule has teeth because it is the one most often violated by convenience. Several defects found
while building the account layer were exactly this shape: four pages claiming the record "is never
sent anywhere" after it had started being sent, and an erase dialog promising a reach it did not
have.

### 2 · Content is derived, never restated

`mini-courses/` is read-only. Nothing in `src/` may hold a fact that is already in a markdown file:
not a module count, not a title, not a category total.

The reason is drift. A count typed into a component is correct the day it is written and wrong the
first time somebody adds a module, and nothing fails. §2 below is where this rule bottoms out.

### 3 · The browser is the source

The reader's record lives in `localStorage`; Supabase holds a replica.

Not a preference, a consequence. There is no request-time server, so no cookie and no header can
carry reader state into prerendered HTML. The progress marks have to be right in the **first painted
frame**, which means reading storage synchronously, which means a `fetch` cannot be on that path. So
the network is kept off it entirely: a local write never waits, and the account layer is something
that happens afterwards.

### 4 · One definition of each thing

Wherever a question has an answer, exactly one piece of code answers it.

| Question | The one place |
|---|---|
| How far along is this reader? | `src/lib/record/derive.ts` |
| What does a write to storage mean? | `src/lib/record/storage.ts` |
| What does "stalled" mean? | `src/lib/record/attention.ts` |
| Where does the record go? | `src/lib/record/scope.ts` |
| What is an internal link? | `src/lib/content/links.ts` |
| What number is this module, and what comes next? | `mini-courses/curriculum.yaml` |

The failure this prevents is two answers that agree until they do not. A manager's panel computing
completion in SQL while the reader's page computes it in TypeScript works fine until the curriculum
grows, and then one person is told `18/32` and another `17/32` about the same progress. `derive.ts`'s
output is therefore **stored** in a column so reports read the same number rather than recomputing
it.

### 5 · Decisions are pure; only rendering needs a browser

Anything that decides something is a pure function taking its inputs explicitly, including the clock.
No `Date.now()` inside a reducer, no `Math.random()` in a layout. That is what makes a boundary
testable at the boundary.

What remains for a real browser is what only a browser can answer: did the diagram island render, is
the theme right in the first frame, does any page push the document sideways at 390px, does a
signed-in reader's record actually reach a second machine.

### 6 · Authorisation lives in the database

Every access rule is a row-level-security policy in Postgres. No Edge Functions, no RPC, no views,
which also means the schema is portable Postgres and moves to Neon or a self-hosted box unchanged.

The corollary matters as much: an over-permissive policy **never raises an error**. It answers, with
rows it should not have returned. So the policies are tested against a real database with real JWTs
rather than read for correctness.

---

**Two projects meet in one repository, and they meet at exactly one file.**

One is an authored corpus of markdown: 33 course modules in two languages, written by hand. The other
is a Next.js application that renders it into a static site. They share no code. They share
`mini-courses/curriculum.yaml`, which the corpus side authors and the application side reads. That
file is the only place a change on one side can break the other.

Everything below was read out of the repository on 2026-09-08. Counts come from the commands beside
them; anything a command cannot produce cites the file it came from.

---

## 1. The two halves, and the seam

```
mini-courses/                    src/
  curriculum.yaml  ────────────►   lib/content/     ──►  app/          ──►  out/
  <category>/<name>.md             curriculum-file        routes            static
  <category>/<name>_tr.md          loader, render                           export
  <category>/images/               links, derive, facts
```

| | Corpus half | Application half |
|---|---|---|
| Lives in | `mini-courses/` | `src/`, `tests/`, `scripts/`, `supabase/` |
| Written by | the author, by hand | a colleague |
| Governed by | `mini-courses/CLAUDE.md` and `MANIFEST.md` | the root `CLAUDE.md` |
| Measured | 77 markdown files (`find mini-courses -name '*.md' -not -path '*scratchpad*' \| wc -l`) | 175 TypeScript files, 39,344 lines (`find src -name '*.ts' -o -name '*.tsx' \| xargs wc -l`) |

**The application never restates a fact that lives in markdown.** No module count, no title, no
category total is typed into `src/`. Everything is derived at build time. This is enforced socially by
the root `CLAUDE.md` and mechanically by the fact that the loader walks the config rather than the
directory.

---

## 2. What a curriculum is made of

The domain has five kinds of thing. `mini-courses/curriculum.yaml` declares the first two; the rest
are derived or authored elsewhere.

**A category** (called a *level* in the reader-facing revision, see §9) has a slug, a title, a blurb,
a status and an ordered list of modules. There are **5**, and their order in the config must match the
order of the `CategorySlug` union in `src/lib/content/categories.ts`.

**A module** has a `name` (the file stem, and the source of its URL slug), a required `title`, a
`status` of `ready` or `draft`, a duration in `minutes`, a list of `needs` naming prerequisites **by
name**, and free-text `notes` that nothing reads. There are **33**, of which **19** are `ready`.

**A module has no number of its own.** Its number is its position in the config, computed in exactly
one place — `src/lib/content/loader.ts` — and written nowhere else. Filenames carry no number, prose
names another module by title, and a module's own frontmatter is `summary` and `objectives` only.
Adding `module:` or `status:` back to a markdown file fails the build. Reordering the course is moving
one line.

**A module file** is markdown. A `ready` module has a frontmatter fence carrying `summary` and
`objectives`; a `draft` has no fence at all. Every module has an `_tr.md` Turkish sibling, and the
application **skips every `_tr.md`**: Turkish is readable on GitHub only, and the site shows a
language badge computed by comparing the two files' extents (`src/lib/content/derive.ts`,
`langCoverage`).

**A reader's record** is the only mutable state in the system, and §5 describes it.

**Prerequisites are a directed graph.** `needs` entries resolve by name to modules that must sit
earlier in the config. `src/lib/content/edges.ts` builds two edge kinds from this: `requires` from the
declared prerequisites, and `see-also` scraped from links found in module prose. An edge is marked
`crossBand` when its two ends sit in different categories.

---

## 3. Two lifecycles, and who moves each

### A module's own lifecycle

```
   (not listed)  ──►  draft  ──►  ready
                        │           │
                        │           └── A0 sheet, full body renders, counts toward
                        │               every "done" denominator
                        └── A4 sheet, only the first paragraph and the topic list
                            render; the rest of the body is dropped
```

Moved by **the author**, by editing `status` in the config. Nothing else can move it.

The consequences of that one word are larger than they look, and they are the most commonly missed
fact in this repository:

- `SheetFormat` is `status === 'draft' ? 'A4' : 'A0'` (`src/lib/content/derive.ts`).
- A `draft` renders **only its first paragraph and its `Topics this module will cover` list**, which
  becomes a "schedule of parts" table. Everything else in the body — including a references block — is
  dropped from the page. It stays in the file for whoever opens it to write the module.
- **That first paragraph becomes the page dek and the `<meta name="description">`, and neither is
  passed through the markdown renderer.** A `[Title](file.md)` link there ships as literal brackets.
  Six pages shipped that way in September 2026 before it was caught.
- A `ready` module needs `minutes` above zero, and the validator refuses it otherwise.
- Changing `status` requires regenerating `src/app/lokum-modules.css` in the same commit, because
  `prebuild` writes it and neither vitest nor playwright runs `prebuild`. It is committed for exactly
  that reason.

### A reader's per-module state

```
  nothing stored
        │
        ├─ observeReachedEnd ──► reachedEnd: true      (scrolled to the end)
        ├─ recordSourceOpened ─► sources: [...]        (clicked a citation)
        ├─ setChecklistItem ───► checklist: { n: bool }
        ├─ setQuizAnswer ──────► quiz.answer
        ├─ assessQuiz ─────────► quiz.assessed: 'matched' | 'missed'
        ├─ addSubmittal ───────► submittals: [...]     (max 3)
        │
        └─ signOff ────────────► signedOff: <ISO>, signedRevision: <hash>
                    ◄─ unsign ── back to null
```

Moved by **the reader**, and by nobody else. There is no assessment and no gate: signing off is the
reader's own assertion. `signedRevision` records which revision of the module they signed, so the
sheet can later say the module has changed underneath them.

`src/lib/record/wire.ts` names the twelve event kinds. `src/lib/record/store.ts` is the **only**
writer.

---

## 4. What the system refuses

A refusal is as much a fact as an action, and this repository leans on them heavily because the
corpus is edited by hand every day.

**The config validator** (`src/lib/content/curriculum-file.ts`) uses zod with `z.strictObject`, so a
typo like `minute: 25` fails rather than being silently stripped. On top of zod it refuses seven
things zod cannot express, each error naming the module at fault:

1. categories out of the `CategorySlug` union's order;
2. a duplicate module `name`;
3. a `needs` entry naming a module that does not exist;
4. a `needs` entry naming a module that sits *later* in the file;
5. a `ready` module with `minutes` at zero;
6. **for each category, the set of `<name>.md` files on disk and the set of names listed must be
   equal in both directions** — so a module listed without a file, and a file written without a
   listing, both fail by name. This is the valuable one;
7. a module with no `_tr.md` sibling.

**The link resolver** (`src/lib/content/links.ts`) throws on an internal markdown link that names no
module, which fails the build rather than shipping a dead link. `tests/corpus/links.test.ts` also
asserts that no rendered HTML anywhere carries a non-external `href` ending in `.md`; it checks every
surface that renders markdown, because a body-only gate once passed while four dead links shipped.

**The copy register** (`tests/unit/copy-register.test.ts`) rejects exclamation marks, praise,
anthropomorphism, the words "just", "simply", "easy", "please" and "sorry", confirmshaming, and any
second spelling of a status, from every reader-visible string.

**The corpus rules** (`tests/corpus/renders.test.ts`) refuse a module that names another module by
number rather than by title, a number in a filename or frontmatter, a raw `<img>` tag, a colour
literal surviving into a rendered diagram, an image path that does not exist, and a missing Turkish
sibling.

**`border-width: var(--stroke-struct)` fails** (`tests/unit/color/stroke-weights.test.ts`). Chrome
floors border widths to whole pixels, so the 1.5px weight must be painted as a gradient or a height,
never as a border.

**Authorisation refuses by row.** See §6.

---

## 5. The reader's record, which is the only state

Everything a reader does is held in one JSON envelope in `localStorage` under the key `hl-record`,
schema version 1 (`src/lib/record/schema.ts`). A record that fails to parse is moved aside to
`hl-record-quarantine` rather than discarded.

```
RecordData
  identity   { name, markSeed, mark, role }
  sheets     { [slug]: { signedOff, signedRevision, reachedEnd, dwellSeconds,
                         quiz { answer, assessed }, checklist {}, sources [], submittals [] } }
  days       [ ISO dates ]          the streak
  prefs      { charKeys, railFolded, aliasNamedFor }
  meta       { lastExport, persisted, lastClaim }
```

`dwellSeconds` is capped at 3600 and `submittals` at 3, both in `schema.ts`.

**`prefs` holds the browser's preferences, not the reader's history.** `charKeys` is SC 2.1.4's off
switch and `railFolded` (M10) is whether the curriculum rail on a module page is folded away. Both are
facts about the machine in front of the reader rather than about the reader, which is why `prefs` is
the one field `carriesNothing` ignores and the one `mergeRecords` resolves local-wins. A widening here
needs no migration rung: `coerceRecordData` defaults a missing key, and the default is the honest
answer for a reader who never expressed a preference.

**The record store is the only writer, and a UI preference is not an exception.** The temptation with
`railFolded` was a second `localStorage` key beside the record; that would be a second writer, and it
would also be invisible to the export, the erase dialog and the account merge — three surfaces that
are supposed to account for everything the site remembers.

**`sheets` is keyed by slug, not by number.** This is what makes a curriculum reorder safe: renaming a
module orphans its progress, but moving it does not.

### The runtime, in layers

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

The two channels exist because CSS can draw a reader's progress before hydration and React cannot.
Both are needed and neither replaces the other.

### The record is read twice per page, and the split is load-bearing

- **Channel A** — `src/lib/record/boot.ts` generates a blocking inline `<script>` in `<head>` that
  reads `localStorage`, stamps classes and attributes onto `<html>`, and lets CSS draw the progress
  marks **before first paint**. No React. Correct in frame one. It carries layout state as well as
  progress: `data-hl-rail="folded"` (M10) is stamped **before** the `carriesNothing` gate, because a
  reader whose only stored state is a folded rail carries nothing by that rule and the rail would
  spring open on every load for exactly the readers who asked for it to be shut.
- **Channel B** — React islands after mount. `getServerSnapshot` returns a frozen empty record,
  because the prerendered HTML has never met the reader.

Anything derived belongs in exactly one file: `derive.ts` (how far along), `attention.ts` (what
"stalled" means), `scope.ts` (where the record goes), `storage.ts` (what a write means).

**A known consequence:** the channel-A tests measure the first paint, and a `requestAnimationFrame`
scheduled at document start does not fire on the first navigation in a fresh browsing context. Those
tests fail cold and pass warm, locally, and pass in CI. Compare against a clean build before blaming a
change.

**And one correction to how that consequence is checked.** The helper that reads the probe used to
sample it once, so a reading taken before the callback ran came back `undefined` and every caller
reported it as "channel A did not stamp". It waits now. A related assertion — "React cannot have
hydrated before the first paint", used as a proxy for pre-React — was measured to be false under CPU
contention with a warm cache, and was replaced with a structural check that the boot script is inline
and blocking in `<head>`, which is what makes the claim true by construction rather than by timing.
Both are `logs/BRAINSTORM.md` **D20**.

---

## 6. Accounts, which gate nothing

The account layer is optional. `NEXT_PUBLIC_AUTH_ENABLED` defaults to `false`, and with no
`.env.local` the whole suite still runs green. Signing in copies a record between devices; it unlocks
no content.

`src/components/record/AccountSync.tsx` is **the seam** — the single place where the session,
`createSync`, `createRemoteRecordStore`, `claimMerge` and the claim UI are joined. Its absence was the
largest defect in this work: ten agents built both halves of the account layer and nothing joined
them, so signing in did nothing at all. **A seam needs an owner.** Every module either side of it is
deliberately ignorant of the others, which is what makes each testable in isolation, and the price of
that ignorance is that one file has to know all of them. When adding to either side, check the seam
actually calls it. `src/lib/record/wire.ts` is the shared vocabulary both
halves compile against.

**Authorisation is row-level security and nothing else.** `supabase/migrations/` holds **5** migration
files defining **10** tables — `orgs`, `profiles`, `memberships`, `org_manager`, `pending_invites`,
`record_state`, `learner_event`, `assignments`, `assignment_sheets`, `assignment_targets` — and **28**
policies (`grep -c 'create policy' supabase/migrations/*.sql`). There are **no** Edge Functions, no
RPC, no views and no triggers: the schema stays portable Postgres.

An over-permissive policy raises no error, which is why every policy change needs
`scripts/test-rls.mjs`. Note that RLS *filters* `UPDATE` and `DELETE` silently and only `INSERT`
raises, which is why that suite has both `expectRefused` and `expectTouchesNothing`.

The event log is append-only and the **client** mints each event id, which is what makes a push
idempotent: an event resent after a failed flush lands as itself rather than as a duplicate.

---

## 7. What a request actually does

There is no server at run time. `npm run build` produces a static export into `out/`, served from
GitHub Pages under a sub-path.

```
mini-courses/              src/lib/content/                 src/app/
  curriculum.yaml            curriculum-file.ts  validates    generateStaticParams
  1_fundamentals/            loader.ts           walks it       ↓
    llms.md                  render.ts           md → html    out/
    llms_tr.md               links.ts            rewrites       courses/<cat>/<module>/
  2_intermediate/            derive.ts           counts         path/  dashboard/  …
  …                          facts.ts            the spine
```

**Two generated files are written by `prebuild`, and they are treated differently on purpose.**
`src/app/lokum-modules.css` is **committed**, because vitest and playwright never run `prebuild` and
would otherwise test a file that is not there: change a `status` in the yaml and regenerate it in the
same commit. `public/course-images/` is **gitignored**, because it is only a copy of images already
in `mini-courses/`.

**Revision hashes come from git, per file**, which is why CI must check out with full history. A file
git does not know about — one newly added or renamed and not yet committed — has no revision, and its
page prints none.

**At build time**, for one module page:

1. `curriculum-file.ts` reads and validates `curriculum.yaml`.
2. `loader.ts` walks that config — not the directory — reads each module file, merges the config's
   fields into the object the app calls `frontmatter`, and assigns the module its number from its
   position.
3. `render.ts` turns markdown into HTML: it strips raw HTML, numbers figures, builds `<figure>` from
   an image plus its italic caption line, rewrites image paths to the copied `/course-images/`
   location, and leaves mermaid as a `data-mermaid` source div.
4. `links.ts` rewrites every internal `.md` link to its route, and throws if one names no module.
5. `derive.ts` counts everything the page states about itself; `facts.ts` is the spine every page asks
   for the corpus.
6. `boot.ts` emits the channel-A script into `<head>`.

**In the browser**, mermaid renders client-side from that `data-mermaid` source. This is the cause of
the diagram overflow measured on 2026-09-08: the injected SVG arrives at its natural content width —
1,423px against a 656px column — and escapes the scroll container meant to hold it, painting over both
rails. See `logs/BRAINSTORM.md` D10.

Because the loader reaches `node:fs`, **nothing under `src/lib/content/` may be imported by a client
component.** `layout.tsx` measures `curriculumFacts()` itself and passes the result down as props.
Four components import `CategorySlug` from `categories.ts` and all four use `import type`, which is
erased; a value import from `curriculum-file.ts` into a client island pulls the file system into the
browser bundle and stops the build.

**17 routes** (`find src/app -name page.tsx | wc -l`), producing 56 HTML pages. `/` is a home screen
built from components; `mini-courses/index.md` is no longer the published home page and is read only as
a link target.

---

## 8. Learning paths

`src/lib/path/paths.ts` holds **9** hand-written role paths — software engineer, devops, data
engineer, data analyst, analyst, QA, project manager, DBA, pre-sales. Each is an ordered list of steps
naming a module by route, with a `tier` and a reader-visible `reason` explaining why that module is on
that path.

A path's denominator counts only steps whose module is `ready`, computed by `isDrawnStep(step, drawn)`
against the corpus's own set. A path whose every step is readable is the goal, not an error.

---

## 9. Words that mean something specific here

**The reader-facing rename landed on 2026-09-08** (`logs/PROGRESS.md` M9, vocabulary set C). The right
column is what a reader now sees. **The left column is still what the code says**, everywhere:
`sheetStamps`, `data-drawn`, `hl-sheet`, `kind: 'sign-off'`, `sheet_slug`. That is deliberate and it is
not laziness — a storage key or a DB column carries a reader's saved history, and renaming one to match
a label would invalidate every record for a cosmetic gain. So the two columns are both live, and the
line between them is: **anything a reader can see uses the right column, anything the machine reads
uses the left.**

| In the code | What it means | What the reader sees |
|---|---|---|
| drawing set | the whole 33-module curriculum | **Curriculum** |
| sheet | one module's page | **Module** |
| subsystem | a category | **Level** |
| sign off | the reader asserting they have read a module | **Complete** / **Completed** |
| drawn / not drawn | `status: ready` / `status: draft` | **Ready** / **Planned** |
| feeds | the modules a module is a prerequisite *for* | **Unlocks** |
| requires | a module's own prerequisites | **Requirements** |
| title block | the module's own panel of facts | **Module info** — M11 moved it out of the right rail and into the column |
| the register | the reader's stored history | **Your progress** |
| the drafter | the reader | **you** / **Account** |
| index sheet | the flat list of all modules, at `/sheets` | **Catalog** |
| extent | length in words and minutes | **Length** |
| uptime | days in a row | **Streak** |
| submittal register | the repositories a reader has linked to a module | **What you built** |
| unsigned | a module the reader has not completed | **Not completed** |
| A0 / A4 | the two page anatomies, chosen by `status` | — internal |
| mark, class, XP | badge, rank, points | **Rank** / **XP** |
| LKM-01 | the mark printed in the module info panel | — internal |
| §n.n | a section of the original design spec, cited in code comments | — internal |

**Two things are enforced rather than reviewed.** `tests/unit/copy-register.test.ts` scans **the whole
of `src/`** for the left column in any reader-visible string and fails naming the file, the string and
the replacement — a deliberately wider net than the copy register above it, because the vocabulary was
replaced in one pass and has to be held everywhere. A word inside backticks is stripped before
matching, since that is the code's own name. And the honest check is the export: strip the tags from
every file in `out/` and grep the visible text. **Measured on 2026-09-08: 1,660 occurrences across 56
pages before the rename, 0 after.**

Three words did **not** move, and each for a reason:

- **`drawn` on its own** is ordinary English for a figure. "LKM-01 has drawn every figure in this
  curriculum" is correct and the legend page says it. Only the status sense is banned, which always
  reads `not drawn`.
- **`requires` and `feeds`** are ordinary verbs. What was retired was the pair of *labels*, and those
  are asserted directly by `tests/unit/content/title-block.test.ts`.
- **`register`, the verb.** A reader still registers a repository against a module. Only *the*
  register — the noun for their stored history — became **Your progress**.

**Two strings slipped the rename and M11 caught them**, both for the same mechanical reason: the copy
register matches on word boundaries, and neither carried one where `sign-off` or `drawing set` could
be found inside it.

- `UNSIGN`, the button beside the completion control, is now **Un-complete** — which is the word the
  keyboard sheet had been printing beside `s` all along.
- `— END OF SET`, the cell where the prev/next chain runs out, is now **End of the course**.

The hole itself is not closed: the ban is a lexer, so a retired word inside a longer token, inside a
template literal, or inside a JSX run containing braces still passes it. Closing that properly means a
parser rather than a lexer, and the export grep is what covers it today
(`logs/BRAINSTORM.md` D19's last paragraph).

**The section numbers in code comments (`§12.2`, `§4.4`, `§13.1.1`) refer to a design specification
that is not in this repository.** They are stable identifiers tying a piece of code to the decision
that produced it. Treat them as citations you cannot follow, not as dead links.

---

## 10. Stack, and the commands that matter

Next.js 16 with Turbopack, React, TypeScript in strict mode, Tailwind v4, vitest, Playwright against
real Chrome, zod, gray-matter, js-yaml, mermaid 11.17, Supabase.

```bash
npm run dev            # next dev on :3000
npm run build          # static export into out/
npm run typecheck      # tsc --noEmit, strict
npm test               # vitest: tests/unit/** + tests/corpus/**
npm run test:e2e       # playwright: builds, serves out/ on :3111, real Chrome
```

CI runs typecheck → test → build → link check → build again under the Pages sub-path → link check →
e2e, in that order. A green `npm test` alone means little: the link gate and the export itself only
fail in `build`.

Two credentialed suites skip cleanly with no `.env.local`: `scripts/check-supabase.mjs` and
`scripts/test-rls.mjs`.

**`main` is protected by a ruleset named `main-require-pr`**, so a direct push is rejected even for a
fast-forward. Note that `repos/.../branches/main/protection` returns 404 for this repository, which is
misleading; use `gh api repos/.../rulesets`.

---

## 11. The test suite, and the one rule it lives by

**76** test files (`find tests -name '*.test.ts*' | wc -l`) holding **2,033** unit and corpus tests,
plus **26** Playwright spec files, in four suites that each answer something the others cannot.

| Suite | Runs | Answers |
|---|---|---|
| `npm test`, vitest | every push | anything that computes a value, with no DOM |
| `tests/corpus/` | inside `npm test` | the transforms against every real module, not a fixture |
| `npm run test:e2e`, real Chrome | every push | first-frame correctness, layout at three widths, real interaction |
| `node scripts/test-rls.mjs` | by hand, needs credentials | every policy, through PostgREST, with real sessions |

**Two habits are load-bearing rather than decorative.**

**Measure, do not assert.** The most valuable results here came from measuring: finding 39 broken
links by counting them in the export, proving a CI failure was pre-existing by building the previous
commit in a worktree, proving a magic link could not work cross-device by watching it fail in Chrome,
and proving the diagram overflow by reading element geometry off the page rather than reasoning about
CSS.

**Mutation-test the guards that matter.** A test that would pass against a deliberately broken
implementation protects nothing. The claim gate and the sync generation counter were each verified by
removing them and watching the right test fail; the guard added on 2026-09-08 against naming a module
by number was watched failing in both languages before it was kept.

### The one rule the suite lives by

> A test may check a rule that holds for any content; it may never write down a fact about the
> content.

A word count, a table count, a heading spine or a module number in an assertion turns an ordinary edit
red and teaches nobody anything. The suite was cut from 1,948 tests that pinned such facts down to a
few hundred rule-checking ones in September 2026, and four more pinned assertions were replaced on
2026-09-08.

The one deliberate exception is `tests/e2e/sheets.ts`, which types out all 33 modules, their routes,
titles and formats **by hand**, precisely so that a renumber, a slug change or a stub being written
fails a test and someone has to look. `tests/e2e/index-sheet.spec.ts` reconciles that list against the
manifest the site actually renders, which is what keeps the duplication honest.

Two fixtures keep a category the curriculum no longer has, on purpose:
`tests/unit/route-labels.test.ts` and `tests/unit/record/progress.test.ts` are synthetic inputs and say
so in their own docblocks. Reading the real curriculum there would defeat what they test.

**Exemplars must be chosen by route, never by number or index.** `sheets.ts` and
`tests/e2e/responsive.spec.ts` picked theirs positionally until 2026-09-08, when a reorder silently
moved every one of them onto different content with the whole suite still green.

---

## 12. Deployment

`main` → GitHub Actions → GitHub Pages, at `https://lokumai.github.io/ai-engineering-bazaar/`.

The workflow guards the two failures that would otherwise publish **green** and serve a broken site:

- **A dropped `.nojekyll`**, which makes Jekyll delete `_next/` and leave unstyled HTML.
- **A `basePath` that never reached `assetPrefix`**, which 404s every stylesheet. This is why the
  build runs twice in CI, the second time under the Pages sub-path, with the link checker run against
  each.

It also checks the **published** site rather than the artifact, because the worst failures happen
after the upload.

Accounts are gated on `NEXT_PUBLIC_AUTH_ENABLED`, a build-time constant. It is a real safety measure
rather than a rollout convenience: `SECURITY.md` covers what enabling it costs while the site is
served from a shared origin, and the conditions under which a custom domain stops being optional.

**`main` is protected by a ruleset named `main-require-pr`**, so a direct push is rejected even for a
fast-forward, and `gh pr merge --admin` is refused while a check is still running. Note that
`repos/.../branches/main/protection` returns 404 for this repository, which is misleading; use
`gh api repos/.../rulesets`.

---

## Read next

Everything below is outside this harness. It is not superseded by this file: each one goes deeper on
one subject than an architecture document should.

| Document | For |
|---|---|
| `mini-courses/MANIFEST.md` | The seven rules every module is held to. Read before writing content |
| `mini-courses/CLAUDE.md` | The working agreement: how a module gets written, the diagram system, the naming rules |
| `tests/README.md` | The testing rule, the four layers, and what fails for a reason |
| `docs/data-flow.md` | The record, storage, sync, two devices, the exported file |
| `docs/auth-flow.md` | Sign-in, sessions, joining, who may read what |
| `docs/manager-queries.md` | Tables, columns, joins, and the SQL a manager needs |
| `SECURITY.md` | Threat notes, accepted risks, operational rules |
| `supabase/README.md` | Applying the schema |
| `README.md` | What the course is, and the commands to run it |

**The code carries its own reasoning.** Modules open with a comment recording the decision and *why*,
including the alternatives that were rejected and, where it mattered, the measurement that settled
it. If a comment restates the code it is a defect; if it tells you why the code is not the obvious
thing, it is doing its job.
