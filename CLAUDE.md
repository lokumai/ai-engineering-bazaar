# CLAUDE.md

The operating manual for the application in this repository. The architecture is
[`kia-context/specs/ARCHITECTURE.md`](kia-context/specs/ARCHITECTURE.md), the only architecture
document; what is being built now is in `kia-context/logs/` (start at `kia-context/INDEX.md`).
This file holds what changes rarely: who owns what, the commands, and the rules a build enforces.

## Who owns what

| Working in | Governed by | Owner |
| --- | --- | --- |
| `src/`, `tests/`, `scripts/` | this file | the author's website |
| `mini-courses/` | [`mini-courses/CLAUDE.md`](mini-courses/CLAUDE.md) | the author's course |

**The author's website comes first.** A colleague builds the mobile reader in its own repository.
A colleague's pull request may not change the website's design, content or behaviour, or anything
the author added, unless the author asks; one that merges without a conflict is not thereby
acceptable (`kia-context/specs/MANIFESTO.md` §7, D90). Never merge a colleague's PR without the
author's word.

**`mini-courses/curriculum.yaml` is where the two halves meet**: authored by the course side, read
by the app. `mini-courses/AGENTS.md` is a byte-identical copy of the corpus agreement. The
`AGENTS.md` at this root opens with a block `next dev` writes and re-adds on every run; leave it
alone apart from committing it.

## The design

**The mockup is the specification and outranks every document.**
`playground/01-theme-T4-ground-G3-powder.html` is the shell; `playground/10-home-bazaar-street.html`
is the home page (D79). [`kia-context/specs/DESIGN.md`](kia-context/specs/DESIGN.md) transcribes
the design language; where it disagrees with the mockup, the mockup is right, except for the
deviations DESIGN.md records. Before styling anything, open the mockup, then DESIGN.md, and copy
neither a nearby component nor an old stylesheet (D26).

`src/design/bazaar.css` is the language as CSS, both themes and every primitive. A surface
stylesheet in `src/app/` arranges those primitives and defines none of its own. A raised surface is
told apart by its hairline, not its fill. Geometry comes from a component mockup and colour from the
shell (D31); `tests/e2e/fidelity.ts` compares a built page to its mockup and knows which mockup
specifies which role.

## Commands

```bash
npm run dev            # next dev on :3000
npm run build          # static export into out/
npm run typecheck      # tsc --noEmit, strict
npm test               # vitest: tests/unit/** + tests/corpus/**
npm run test:e2e       # playwright: builds, serves out/ on :3111, real Chrome
npm run build && node scripts/check-links-out.mjs out   # the build Pages serves, and its link gate
node scripts/check-mermaid.mjs <file>.md              # parses and renders every diagram
```

CI runs typecheck, test, the build with its link check, then e2e. A green `npm test`
means little alone: the link gate and the export only fail in `build`. `responsive` and
`containment` also run at 390px; the rest of the browser suite runs at 1440. First run on a machine:
`npx playwright install --with-deps chrome`.

## Architecture, in the parts that span files

**The content pipeline.** `curriculum.yaml` and `mini-courses/*.md` → `src/lib/content/` → routes.
`curriculum-file.ts` validates the config, `loader.ts` walks the config rather than the directory,
`render.ts` turns markdown into HTML, and `facts.ts` is what every page asks for the corpus. A
module's number is its position in `curriculum.yaml`, written nowhere else. All of this reaches
`node:fs`, so a client component may never import it.

**The record.** `src/lib/record/` is the reader's state in `localStorage`, and `store.ts` is its only
writer. It is read twice per page: **channel A**, a blocking script in `<head>` (`boot.ts`) that
stamps `<html>` so CSS draws progress in the first frame, and **channel B**, React islands after
mount. There is no account layer and no server (D88): the reader keeps a copy with export, import
and erase on `/profile/`.

## Rules a build enforces

- **`mini-courses/` is read-only to the app**, and nothing in `src/` restates a fact that lives in a
  markdown file: no module count, title or total. Derive it.
- **The config is validated**: the `.md` files in a category and the names listed for it must be the
  same set both ways, plus unique names, earlier prerequisites and a `_tr.md` for every module.
- **Regenerate `src/app/lokum-modules.css` in the same commit as a `status` change** (`prebuild`
  writes it; vitest and playwright never run `prebuild`).
- **A test may check a rule that holds for any content, never a fact about the content.**
  [`tests/README.md`](tests/README.md) has the rule.
- **An unresolvable internal `.md` link fails the build.**
- **The copy register** (`tests/unit/copy-register.test.ts`) bans exclamation marks, praise,
  "just"/"simply"/"easy", "please"/"sorry" and a second spelling of any status.
- **Colour is never the only signal**; ratios are recomputed from the shipped stylesheets.
- Decisions are pure functions with the clock passed in: no `Date.now()` in a reducer.

## Working conventions

- **Measure, don't assert.** Verify every count and constant from the repository.
- **Mutation-test a guard that matters**: a test that passes against a broken implementation
  protects nothing.
- A module header records the decision and why, including what was rejected. A comment restating
  the code is a defect.
- **Never add `Co-Authored-By: Claude`, "Generated with Claude Code", or any other AI attribution**
  to a commit message or PR body in this repository.
- `docs/superpowers/` is gitignored. Keep the `.gitignore` lines for `.env.local` and
  `supabase-access-tokens`: those files held real secrets.
- **A retired feature is removed end to end**: its code, its record fields, its CSS, its docs and
  its tests, not hidden (D88).

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
  the active `logs/BRAINSTORM.md` to check whether your idea was already considered and rejected.
- **This repository has not been migrated to the bare-name layout yet** (see *Splitting a file* below).
  Until it is, the ACTIVE parts are `logs/PROGRESS_3.md` and `logs/BRAINSTORM_3.md`; the files named
  `PROGRESS.md` and `BRAINSTORM.md` here are the closed part 1 of each. The `kia-context-migrate`
  skill does the renaming.
- **Before touching anything structural:** `specs/ARCHITECTURE.md`.
- **Every session:** `logs/PROGRESS.md` holds the current milestone, its deliverables and their
  acceptance criteria — what is being built, and how far it got. How to work through it is written in
  that file, not here — with one exception, because the procedure there depends on it mechanically:
  **a milestone carries its deliverables as `- [ ]` checkboxes, ticked `[x]` as each lands.** The
  procedure's first step takes the first unchecked one, so a milestone written without them stalls it.
  Everything else about how a milestone looks is yours to choose.
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
| **3** | `kia-context/logs/` | agent, every session | State. `PROGRESS.md` + `PROGRESS_2.md` + `PROGRESS_3.md`, `BRAINSTORM.md` + `BRAINSTORM_2.md` + `BRAINSTORM_3.md` (active: the `_3` parts, until migrated) |

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
navigation block at the top and bottom of both parts.

**The active part always keeps the bare name.** Splitting moves the closed history *out* to `NAME_1.md`,
`NAME_2.md`, … and leaves the live part in `NAME.md`. It is the opposite of what feels natural, and it is
the whole point: the file every session opens keeps the name every document points at, and the sections
that say *how to work* — the loop, the circuit breakers — stay in a file that is never closed. Split the
other way and the procedure ends up in an archive nobody opens, which fails silently and can go unnoticed
for months.

Files that describe **one current state** — `ARCHITECTURE.md`, `DESIGN.md`, `MANIFESTO.md` — are never
split. They change in place.

<!-- kiacontext:end -->
