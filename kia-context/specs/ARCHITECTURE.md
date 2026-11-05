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
covers: the whole system as built on 2026-09-10, with M16 shipped — every route on the design language; the record, channel A and the render step corrected for M24 on 2026-10-11, and the quiz and the end of a module for M25 on 2026-10-12, the Bazaar Street front door for M27 and the Persian pages for M28 the same day, and the progress page slimmed to its circles and its data row for M38 on 2026-11-05, and the account layer, role paths, record of work and two thirds of the test suite removed for M40 the same day, and the content bundle under out/api/ for M41 the same day
last_updated: "2026-11-05"
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

Nothing about a reader leaves their browser. There was an optional account layer (Supabase,
sign-in, organisations and a manager panel); M40 removed it on 2026-11-05, on the author's word,
with the role paths and the record of work. A reader keeps a copy by exporting a file.

```
mini-courses/*.md  ──build──▶  static export  ──▶  the reader's browser
   (read-only)                  89 pages            record in localStorage
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

The reader's record lives in `localStorage`, and nowhere else since M40.

Not a preference, a consequence. There is no request-time server, so no cookie and no header can
carry reader state into prerendered HTML. The progress marks have to be right in the **first painted
frame**, which means reading storage synchronously, which means a `fetch` cannot be on that path. So
the network is kept off it entirely: a local write never waits.

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
| What does a module page render? | `src/lib/content/module-render.ts` |
| What is the bundle contract? | `src/lib/bundle/schema.ts` |

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

### ~~6 · Authorisation lives in the database~~ — retired with the account layer (M40)

~~Every access rule is a row-level-security policy in Postgres.~~ There is no database since
2026-11-05: M40 removed Supabase, its ten tables and every policy. The number is kept, because
rules are cited by number.

---

**Two projects meet in one repository, and they meet at exactly one file.**

One is an authored corpus of markdown: 33 course modules written by hand in English, each with a
Turkish translation, and the written ones also in Persian (M28). The other is a Next.js
application that renders it into a static site. They share no code. They share
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
  <category>/<name>_fa.md          links, derive, facts
  <category>/images/
```

| | Corpus half | Application half |
|---|---|---|
| Lives in | `mini-courses/` | `src/`, `tests/`, `scripts/` |
| Written by | the author, by hand | a colleague |
| Governed by | `mini-courses/CLAUDE.md` and `MANIFEST.md` | the root `CLAUDE.md` |
| Measured | 96 markdown files (`find mini-courses -name '*.md' -not -path '*scratchpad*' \| wc -l`) | 196 TypeScript files, 44,002 lines (`find src -name '*.ts' -o -name '*.tsx' \| xargs wc -l`) |

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
`objectives`; a `draft` has no fence at all. Every module has an `_tr.md` Turkish sibling. Since
**M19** the application renders the Turkish of every `ready` module as its own page under `/tr/`
(`src/app/tr/courses/[category]/[module]/page.tsx`); a draft's Turkish is not rendered. Since
**M28** a written module may also have an `_fa.md` Persian sibling, rendered under `/fa/`
(`src/app/fa/courses/[category]/[module]/page.tsx`) right to left. Persian is optional per module and
Turkish is not (**D80**). `src/lib/content/languages.ts` is the one list of translations: the suffix,
the route segment, the menu's label, the text direction and whether every module must carry one.
Everything that used to say `'tr'` asks it. A translation is a different body for the same module,
never a module of its own, so it changes no count, no number and no record key.

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
7. a module with no `_tr.md` sibling, and, for every language in `languages.ts`, a sibling whose
   English name is not listed (a translation of nothing). Since M28 only Turkish is required.

**The link resolver** (`src/lib/content/links.ts`) throws on an internal markdown link that names no
module, which fails the build rather than shipping a dead link. `tests/corpus/renders.test.ts` also
asserts that no rendered module body carries a non-external `href` ending in `.md`.

**The copy register** (`tests/unit/copy-register.test.ts`) rejects exclamation marks, praise,
anthropomorphism, the words "just", "simply", "easy", "please" and "sorry", confirmshaming, and any
second spelling of a status, from every reader-visible string.

**The corpus rules** (`tests/corpus/renders.test.ts`) refuse a module that names another module by
number rather than by title, a number in a filename or frontmatter, a raw `<img>` tag, a colour
literal surviving into a rendered diagram, an image path that does not exist, and a missing Turkish
sibling. `tests/corpus/translations.test.ts` (M28) holds every translation to the matchers that read
a body by its words: a translation has a quick check and a summary exactly where its English does.

**`border-width: var(--stroke-struct)` fails** (`tests/unit/stroke-weights.test.ts`). Chrome
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
  sheets     { [slug]: { signedOff, signedRevision, reachedEnd, dwellSeconds, checklist {} } }
  days       [ ISO dates ]
  prefs      { charKeys, railFolded, catalogView, figurePalette, codePalette }
  meta       { lastExport, persisted }
```

**M40 removed `identity` (name, mark seed, mark, role), each module's `quiz`, `sources` and
`submittals`, `prefs.aliasNamedFor` and `meta.lastClaim`.** The schema version did not move:
`coerceRecordData` reads only the fields above and ignores every other key, so a record stored
before M40 parses, and its old fields drop out on the next write and from every export. Nothing
writes `reachedEnd` or `dwellSeconds` any more; they are kept so a stored value still counts.

**`prefs` holds the browser's preferences, not the reader's history.** `charKeys` is SC 2.1.4's off
switch, `railFolded` (M10) is whether the curriculum rail on a module page is folded away,
`catalogView` (M12) is which of the catalog's three views the reader last chose, and `figurePalette`
and `codePalette` (M24) are which of three palettes the reader put the diagrams and the code in. All
of them are facts about the machine in front of the reader rather than about the reader, which is why `prefs` is the one
field `carriesNothing` ignores. A widening here needs
no migration rung: `coerceRecordData` defaults a missing key, and the default is the honest answer for
a reader who never expressed a preference.

**`catalogView` is `null` rather than `'overview'` by default, and the distinction is load-bearing** —
and the two palettes are `null` rather than `'night'` for the same reason.
Null is "has not chosen", which is not the same as "chose the view that happens to be the default":
the boot script stamps nothing for null, the stylesheet's fallback rule reveals the default view, and
a later change of default therefore moves the reader who never chose and leaves the reader who did
exactly where they put themselves.

**The record store is the only writer, and a UI preference is not an exception.** The temptation with
`railFolded` was a second `localStorage` key beside the record; that would be a second writer, and it
would also be invisible to the export and the erase dialog, which are supposed to account for
everything the site remembers.

**One write can be two, and that is why completion has one path.** D14 puts a completion control at
the end of a module (**A**) and another across the whole course on the progress page (**C**). The
first completion on a record also makes the single permitted `navigator.storage.persist()` request,
so both controls call `src/lib/record/complete.ts`'s `toggleCompletion` rather than implementing
that sequence twice.

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
```

The two channels exist because CSS can draw a reader's progress before hydration and React cannot.
Both are needed and neither replaces the other.

### The record is read twice per page, and the split is load-bearing

- **Channel A** — `src/lib/record/boot.ts` generates a blocking inline `<script>` in `<head>` that
  reads `localStorage`, stamps classes and attributes onto `<html>`, and lets CSS draw the progress
  marks **before first paint**. No React. Correct in frame one. It carries layout state as well as
  progress: `data-bz-rail="folded"` (M10) is stamped **before** the `carriesNothing` gate, because a
  reader whose only stored state is a folded rail carries nothing by that rule and the rail would
  spring open on every load for exactly the readers who asked for it to be shut. `data-hl-view`
  (M12) and the two palettes, `data-hl-figures` and `data-hl-code` (M24), are stamped before it for
  the same reason, each matched against its id list first because the value came out of storage.
- **Channel B** — React islands after mount. `getServerSnapshot` returns a frozen empty record,
  because the prerendered HTML has never met the reader.

**Channel A stamps one NUMBER, and everything else it stamps is a class.** The reason every other
reading is a class is that **CSS cannot count**: a rule can match `html.hl-signed-13` against
`[data-module="13"]` but it cannot compare the two, which is why the per-module lists are generated
and why the segmented meter draws one element per module rather than a bar. The CHANNEL can count,
though — it is a script, and it holds the per-category totals the factory embedded — so
`--bz-done-<slug>` is set on `<html>` as a percentage, and a surface joins it to the `--bz-done` the
design language declares. It is what makes a proportional ring correct in frame one instead of
animating in after hydration, which §12.2 forbids for a mark a reader sees.

Two things follow and both cost something when they were missed. **`src/lib/record/stamp.ts` carries
the same derivation for after mount**, with the removal half channel A never needs, and both suites
cross-test the two implementations over the same records — the failure mode is a reading that is
right on load and wrong the moment the reader acts, which a reload hides. And **the emitted script is
wrapped in one `try`**, so a `documentElement` fake that is missing `style` does not merely lose the
properties: the throw abandons the loop they are set in and the remaining categories silently lose
their classes too. Two test harnesses were in that state.

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

## 6. ~~Accounts, which gate nothing~~ — removed in M40

The optional account layer — Supabase sign-in, the cross-device copy, organisations, a manager
panel, assignments, and the seam `AccountSync.tsx` that joined them — was removed on 2026-11-05 on
the author's word, with `supabase/` (5 migrations, 10 tables, 28 policies), `scripts/check-supabase.mjs`,
`scripts/test-rls.mjs` and `docs/`. `logs/BRAINSTORM_2.md` **D88** records the decision. The
section number is kept, because sections are cited by number.

---

## 7. What a request actually does

There is no server at run time. `npm run build` produces a static export into `out/`, served from
GitHub Pages under a sub-path.

```
mini-courses/              src/lib/content/                 src/app/
  curriculum.yaml            curriculum-file.ts  validates    generateStaticParams
  1_fundamentals/            loader.ts           walks it       ↓
    llms.md                  render.ts           md → html    out/
    llms_tr.md, llms_fa.md   links.ts            rewrites       courses/<cat>/<module>/
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
   location, and leaves mermaid as a `data-mermaid` source div. It also REMOVES what the page states
   elsewhere: the first `h1`, the category dek, the self-check paragraph, and since M24 the series map
   (`## Where this fits in the series` / `## Bu serinin neresindeyiz`), which stays in the file for a
   reader of raw markdown. `SERIES_HEADINGS` in `lines.ts` holds every language. And it turns each
   highlighted code token's colour into a `bz-tok-<role>` class, so the stylesheet — and the reader's
   code palette — decides what a token paints.
4. `links.ts` rewrites every internal `.md` link to its route, and throws if one names no module.
5. `derive.ts` counts everything the page states about itself; `facts.ts` is the spine every page asks
   for the corpus.
6. `boot.ts` emits the channel-A script into `<head>`.
7. `quiz.ts` (M25) reads a written module's `<name>.quiz.yaml` beside its markdown — 3 to 5 four-choice
   questions, English and Turkish (and Persian, where the module has a Persian page) side by side
   under one shared answer index — and validates it with
   zod, so a malformed quiz fails the build by name. The module page renders it at the very end, after
   the completion checkbox and the pager, closed. **Nothing a reader answers is stored**: the quiz is
   reinforcement, and the record has no field for it.

**The end of a module page (M25)** is the completion checkbox, Previous / Next, and the quiz, in that
order, and a `Before you start` box above the prose names the prerequisites. The module's own
self-check, the submittal form, the stamps, `Checked by` and the sources counter left the page on the
author's word. **The record still carries every field they wrote** — `quiz`, `submittals`,
`sources` — so an existing reader's record parses, exports and merges unchanged, and the exported
file still carries what it holds; there is simply no longer a control on a module page that adds to
them, and since M38 no page that shows them either.
The module's task-list checkboxes are untouched and still write `checklist`.

**In the browser**, mermaid renders client-side from that `data-mermaid` source. This is the cause of
the diagram overflow measured on 2026-09-08: the injected SVG arrives at its natural content width —
1,423px against a 656px column — and escapes the scroll container meant to hold it, painting over both
rails. See `logs/BRAINSTORM.md` D10.

Because the loader reaches `node:fs`, **nothing under `src/lib/content/` may be imported by a client
component.** `layout.tsx` measures `curriculumFacts()` itself and passes the result down as props.
Four components import `CategorySlug` from `categories.ts` and all four use `import type`, which is
erased; a value import from `curriculum-file.ts` into a client island pulls the file system into the
browser bundle and stops the build.

**10 routes** (`find src/app -name page.tsx | wc -l`), producing 89 HTML pages (measured 2026-11-05, after M40). `/` is a home page
built from components; `mini-courses/index.md` is no longer the published home page and is read only as
a link target. Since **D79** `/` is Bazaar Street: its words, its level doors (one per category in
`curriculum.yaml`) and its way in are server-rendered markup, its illustration is SVG read from
`src/components/home/street/art/` at build time (`street/art.ts`, `node:fs`, so server only), and its
motion is one client island that imports `gsap` on demand and turns the stacked page into a walk on a
wide screen.

**Two of the ten are forwards, and a static export has no other way to redirect.** M17 folded
`/courses/` and `/courses/[category]/` into the catalog (M14's three forwards to `/profile/` were
removed in M40); `output: 'export'` means `next.config`'s
`redirects` are never applied and a page's own `redirect()` throws at build time, so each of them
renders `MovedTo` instead — an inline script (the only one of the three mechanisms that can carry the
fragment), a `<meta http-equiv="refresh">` for a reader with scripting off, and a visible link. The
target goes through `lib/url.ts`'s `href()`, because `basePath` rewrites only what the router touches
and a hardcoded path would work locally and 404 on GitHub Pages. `logs/BRAINSTORM.md` **D24**.

---

## 8. ~~Learning paths~~ — removed in M40

The nine hand-written role paths (`src/lib/path/`), the role a reader chose, and the `hl-role-<id>`
stamp that revealed one path in frame one were removed on 2026-11-05 (**D88**). M38 had already
taken the role row off `/profile/`; the author then found the stored role ("data analyst") in an
export and asked for every trace to go. The section number is kept.

---

## 9. Words that mean something specific here

**The reader-facing rename landed on 2026-09-08** (`logs/PROGRESS.md` M9, vocabulary set C). The right
column is what a reader now sees. **The left column is still what the code says**, everywhere:
`sheetStamps`, `data-drawn`, `kind: 'sign-off'`, `sheet_slug`. That is deliberate and it is
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
| the register | the reader's stored history | **Your progress** — the page's own title and the navbar's fourth item since M14; since M38 it draws the level circles, the continue card and one row, **Export, import, erase** |
| the drafter | the reader | **you** / **Account** |
| index sheet | the flat list of all modules, at `/sheets` | **Catalog** |
| extent | length in words and minutes | **Length** |
| uptime | days in a row | ~~**Streak**~~ — shown nowhere since M38, which removed the readout row; `Uptime` is still in the tree |
| submittal register | the repositories a reader has linked to a module | ~~**What you built**~~ — shown nowhere since M38; the record still carries `submittals` |
| unsigned | a module the reader has not completed | **Not completed** |
| A0 / A4 | the two page anatomies, chosen by `status` | — internal |
| mark, class, XP | badge, rank, points | ~~**Rank** / **XP**~~ — **nothing.** M13 took all three off every instrument: nobody could name the question they answered, and `Reading time` took XP's cell (`logs/BRAINSTORM.md` **D22**). `xp()` and `classOf()` are still in `derive.ts`, rendered by nothing |
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

- `UNSIGN`, the button beside the completion control, became **Un-complete**, and since **D76** there
  is no separate button: one checkbox marks a module complete and clears it.
- `— END OF SET`, the cell where the prev/next chain runs out, is now **End of the course**.

The hole itself is not closed: the ban is a lexer, so a retired word inside a longer token, inside a
template literal, or inside a JSX run containing braces still passes it. Closing that properly means a
parser rather than a lexer, and the export grep is what covers it today
(`logs/BRAINSTORM.md` D19's last paragraph).

**M13 found two more that no lexer could have caught, and both were on the page a stranger meets
first.** `indexStatement()` printed *"Fourteen are dashed — the geometry exists in the model, the
lines do not"*: not one banned word in it, and the drawing-set metaphor entire. And the navbar's
fourth item read `My progress`, which the copy register's own first-person ban would have caught if
`components/shell` had been in its roots — it is not, because the register was scoped to the copy §12
authored. The lesson is the one the export grep already implies: **the ban lists words, and a
vocabulary is a way of talking.** Reading the shipped page is still the only check for the second.

**The section numbers in code comments (`§12.2`, `§4.4`, `§13.1.1`) refer to a design specification
that is not in this repository.** They are stable identifiers tying a piece of code to the decision
that produced it. Treat them as citations you cannot follow, not as dead links.

---

## 10. Stack, and the commands that matter

Next.js 16 with Turbopack, React, TypeScript in strict mode, Tailwind v4, vitest, Playwright against
real Chrome, zod, gray-matter, js-yaml, mermaid 11.17.

```bash
npm run dev            # next dev on :3000
npm run build          # static export into out/
npm run typecheck      # tsc --noEmit, strict
npm test               # vitest: tests/unit/** + tests/corpus/**
npm run test:e2e       # playwright: builds, serves out/ on :3111, real Chrome
```

CI runs typecheck → test → build under the Pages sub-path → link check → e2e, in that order (one
build since M40; the base-path-less build before it asked the same questions of a build nobody
publishes). A green `npm test` alone means little: the link gate and the export itself only
fail in `build`.

**`main` is protected by a ruleset named `main-require-pr`**, so a direct push is rejected even for a
fast-forward. Note that `repos/.../branches/main/protection` returns 404 for this repository, which is
misleading; use `gh api repos/.../rulesets`.

---

## 11. The test suite, and the one rule it lives by

**65** test files (`find tests -name '*.test.ts*' | wc -l`; vitest runs 64 of them) holding
**1,144** unit and corpus tests, plus **33** Playwright spec files holding **461** browser cases
(measured 2026-11-05; M40 cut them from 2,107 and 1,234, **D88**), in three suites that each answer
something the others cannot.

| Suite | Runs | Answers |
|---|---|---|
| `npm test`, vitest | every push | anything that computes a value, with no DOM |
| `tests/corpus/` | inside `npm test` | the transforms against every real module, not a fixture |
| `npm run test:e2e`, real Chrome | every push | first-frame correctness, layout at 1440 and 390, real interaction |

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

**`main` is protected by a ruleset named `main-require-pr`**, so a direct push is rejected even for a
fast-forward, and `gh pr merge --admin` is refused while a check is still running. Note that
`repos/.../branches/main/protection` returns 404 for this repository, which is misleading; use
`gh api repos/.../rulesets`.

---

## 13. The content bundle

Every build also publishes the course as JSON under `out/api/`, for the native mobile reader.
The reader renders what it is given and derives nothing: slugging, figure numbering, row headers, link localisation and code tokens have all been computed in TypeScript, and the reader maps each node to a widget.
Why a block tree and not HTML or markdown is **D89**.

**The contract is `src/lib/bundle/schema.ts`, and only there.**
It is a set of strict zod schemas, so a key the contract does not name fails the build instead of reaching the reader.
Every route handler parses its document with them before serialising it, and `tests/e2e/bundle.spec.ts` parses the finished export with the same schemas.
They name fields and formats, never a fact about the content: a language is checked against `src/lib/content/languages.ts`, not listed.
Every path in every field is relative to the site root, with no base path and no leading slash, so one bundle serves from any host.
`tests/unit/bundle/__snapshots__/bundle-schema.json` shows any change to the contract as a diff.

**Two producer stages, and one writer per file.**

| Published path | Written by |
|---|---|
| `api/index.json` (the published majors) | `src/app/api/index.json/route.ts` |
| `api/v1/tokens.json` | `src/app/api/v1/tokens.json/route.ts`, from `src/lib/bundle/tokens.ts` |
| `api/v1/levels/<level>.json` | `src/app/api/v1/levels/[file]/route.ts` |
| `api/v1/modules/<level>/<module>/<lang>.json` | `src/app/api/v1/modules/[level]/[module]/[file]/route.ts`, one per language the module has a page in |
| `api/v1/index.draft.json` | `src/app/api/v1/index.draft.json/route.ts`; deleted by the finaliser |
| `api/v1/index.json`, `api/v1/diagrams/<id>.svg` | `scripts/finalize-bundle.mjs` |
| `api/v1/record-conformance.json` | `scripts/finalize-bundle.mjs`, copied from `tests/unit/record/__snapshots__/record-conformance.v1.json` |
| `course-images/<level>/<file>` | the existing `prebuild` |

The route handlers write every document the TypeScript pipeline can produce, and they are static, so `next build` writes each as a plain file.
A module document comes from `src/lib/content/module-render.ts`, the same render input the module page reads, so the page and the bundle cannot drift (rule 4).
The finaliser is the `postbuild` of `npm run build` and writes what needs a browser or the hash of another file.
It draws every diagram the draft lists in Playwright's bundled Chromium, twice: in the Paper palette as `light` and in Night as `dark`.
Each drawing is flattened into the SVG profile of `scripts/lib/svg-profile.mjs`, with labels set in the one pinned Vazirmatn face that `scripts/lib/diagram-font.mjs` names and the index records by hash.
Then it hashes every bundle file and image, writes `index.json` and deletes the draft.
It exits 1, naming the diagram, module and language, on any render error, profile violation, moved label or unloaded font, and writes no `index.json`; without Chromium it exits 1 and prints `npx playwright install chromium`.
The two scripts are plain `.mjs` and import only `node:`, packages and `scripts/lib/`, so neither restates a TypeScript definition.

**Versions.**
`files` maps every file under `api/v1/` except `index.json` and `record-conformance.json` to the sha256 of its bytes, and `images` does the same for every image a document names.
`contentVersion` is the sha256 of the index with `contentVersion` and `publishedAt` blanked, through the one canonical serialisation in `scripts/lib/bundle-hash.mjs`.
It holds no build time, commit hash or commit date, so two builds of one commit, and a commit that changes no content and no render input, give the same value.
`publishedAt` is the commit date, and the reader orders versions by it.
Adding a field, a node type, a code-token role or a language is additive and stays in `api/v1/`, because the reader ignores what it does not know and draws a role it has no colour for as plain code.
A new inline type that carries words carries them in `inlines`, which is what an older reader renders of an inline it does not know.
A new value in a closed set (heading `depth`, table `align`, level `status`, `dir`) is a retyping.
Removing, renaming or retyping a field means `api/v2/`, and `api/v1/` stays published while the reader's oldest supported version reads it.

**Checks.**
`node scripts/check-bundle-out.mjs <dir>` reads a finished export and recomputes every claim the index makes: the file set, each sha256, `contentVersion`, the SVG profile of every diagram, the diagram font, and no field starting with the base path.
CI runs it after its one build, which has the base path, and after the browser suite has rebuilt `out/` without one it requires the two `api/` trees to be byte-identical, which holds both the base path and the build's determinism to account.
The deploy runs it on `_site` before publishing, and after publishing it polls the live `api/v1/index.json` until it serves this build's `contentVersion`, for at most the first response's `max-age` plus a minute.
It sends no query string, because the Pages edge leaves the query out of its cache key, so a stale entry can only be waited out.

---

## Read next

Everything below is outside this harness. It is not superseded by this file: each one goes deeper on
one subject than an architecture document should.

| Document | For |
|---|---|
| `mini-courses/MANIFEST.md` | The seven rules every module is held to. Read before writing content |
| `mini-courses/CLAUDE.md` | The working agreement: how a module gets written, the diagram system, the naming rules |
| `tests/README.md` | The testing rule, the four layers, and what fails for a reason |
| `SECURITY.md` | The shared-origin exposure and the one accepted risk |
| `README.md` | What the course is, and the commands to run it |

**The code carries its own reasoning.** Modules open with a comment recording the decision and *why*,
including the alternatives that were rejected and, where it mattered, the measurement that settled
it. If a comment restates the code it is a defect; if it tells you why the code is not the obvious
thing, it is doing its job.
