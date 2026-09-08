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

> ## ⚠️ There is a second architecture document, and this is not a mistake to fix by deleting one
>
> The repository root holds **`ARCHITECTURE.md`**, written by the colleague who owns the application
> and linked from the root `CLAUDE.md`. It is 286 lines and covers *What it is · The rules that
> explain the code · The build · The runtime in layers · Testing · Deployment*. Roughly a third of it
> overlaps with this file.
>
> **The author has previously ruled that there is one architecture document and no second one should
> be created.** This file exists because the kiacontext harness requires it at this path, so the two
> now coexist and the boundary has to be explicit rather than assumed:
>
> | Question | File |
> |---|---|
> | How is the app built, deployed and layered? Why does the code look like that? | the **root** `ARCHITECTURE.md` — it is the colleague's, and it wins on the application |
> | What is a module? What does `status` change? What will the build refuse? What is in the reader's record? What does that word mean? | **this** file — it wins on the domain, the lifecycles and the vocabulary |
>
> **Neither file may restate the other.** Where they disagree, the root file wins on the application
> and this one wins on the corpus and the domain. **This overlap is unresolved and the author has been
> told.** The options are to merge them, to cut this file down to the domain half, or to leave both
> with this boundary. Do not silently pick one.

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
  prefs      { charKeys, aliasNamedFor }
  meta       { lastExport, persisted, lastClaim }
```

`dwellSeconds` is capped at 3600 and `submittals` at 3, both in `schema.ts`.

**`sheets` is keyed by slug, not by number.** This is what makes a curriculum reorder safe: renaming a
module orphans its progress, but moving it does not.

### The record is read twice per page, and the split is load-bearing

- **Channel A** — `src/lib/record/boot.ts` generates a blocking inline `<script>` in `<head>` that
  reads `localStorage`, stamps classes and attributes onto `<html>`, and lets CSS draw the progress
  marks **before first paint**. No React. Correct in frame one.
- **Channel B** — React islands after mount. `getServerSnapshot` returns a frozen empty record,
  because the prerendered HTML has never met the reader.

Anything derived belongs in exactly one file: `derive.ts` (how far along), `attention.ts` (what
"stalled" means), `scope.ts` (where the record goes), `storage.ts` (what a write means).

**A known consequence:** the channel-A tests measure the first paint, and a `requestAnimationFrame`
scheduled at document start does not fire on the first navigation in a fresh browsing context. Those
tests fail cold and pass warm, locally, and pass in CI. Compare against a clean build before blaming a
change.

---

## 6. Accounts, which gate nothing

The account layer is optional. `NEXT_PUBLIC_AUTH_ENABLED` defaults to `false`, and with no
`.env.local` the whole suite still runs green. Signing in copies a record between devices; it unlocks
no content.

`src/components/record/AccountSync.tsx` is **the seam** — the single place where the session,
`createSync`, `createRemoteRecordStore`, `claimMerge` and the claim UI are joined. Its absence was the
largest defect in the accounts work: both halves existed and signing in did nothing. When adding to
either side, check the seam actually calls it. `src/lib/record/wire.ts` is the shared vocabulary both
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

An outsider will misread most of these, and a reader-facing rename is in flight (see
`logs/BRAINSTORM.md` D10 and `logs/PROGRESS.md` M8). **The code still uses the left column
everywhere**, so both are listed.

| In the code | What it means | Reader-facing candidate |
|---|---|---|
| drawing set | the whole 33-module curriculum | Curriculum |
| sheet | one module's page | Module |
| subsystem | a category | Level |
| sign off | the reader asserting they have read a module | Complete / Mark as read |
| drawn / not drawn | `status: ready` / `status: draft` | Ready / Planned |
| feeds | the modules a module is a prerequisite *for* | Unlocks |
| requires | a module's own prerequisites | Requirements |
| title block | the right-hand panel of facts on a module page | Module info |
| the register | the reader's stored history | Your progress |
| the drafter | the reader | Account |
| index sheet | the flat list of all modules, at `/sheets` | Catalog |
| extent | length in words and minutes | Length |
| A0 / A4 | the two page anatomies, chosen by `status` | — internal |
| mark, class, XP, uptime | badge, rank, points, streak | Rank / Points / Streak |
| LKM-01 | the drafter mark printed in the title block | — internal |
| §n.n | a section of the original design spec, cited in code comments | — internal |

**The section numbers in code comments (`§12.2`, `§4.4`, `§13.1.1`) refer to a design specification
that is not in this repository.** They are stable identifiers used to tie a piece of code to the
decision that produced it. Treat them as citations you cannot follow, not as dead links.

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
plus **26** Playwright spec files.

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
