---
description: >
  The execution log and the working memory of the project. Milestones, their deliverables, the acceptance
  criteria each one is judged against, and a short report written when each is done. This is the file an
  agent opens first every session to find out what to build next, and the file it writes to when the
  build moves. Append-only and chronological.
  NOT here: why a choice was made (BRAINSTORM.md), or any rule that outlives the milestone
  (MANIFESTO.md / ARCHITECTURE.md).
authority: state
writes: agent, every session
status: active
covers: "the whole project, 2026-07-07 onward — M1 onward"
last_updated: "2026-09-08"
---

# 📈 PROGRESS — What we are building

> **M1 to M6 were reconstructed from git history on 2026-09-08, not captured from the work as it
> happened.** Treat them as approximate: commit messages say what changed and almost never why, and no
> acceptance criteria existed at the time, so none are invented here. Everything from **M7 onward** was
> recorded live.

---

## The loop

1. Take the first unchecked deliverable (`- [ ]`) under the active milestone.
2. Build it. Verify it against its **acceptance criteria**.
3. **Pass:** mark `[x]`, write a one or two sentence **Report**, move on.
4. **Fail:** apply the circuit breakers. Do **not** mark `[x]`.

## Circuit breakers

- **Three attempts.** Three consecutive failed verification passes on one deliverable and you stop.
- **Then:** revert the uncommitted work, mark the deliverable `[BLOCKED]`, write one paragraph on what
  was tried and what it did, and halt for a human.
- **No tampering, ever.** Never modify a test, a verifier or an acceptance criterion to force a pass.
  If a criterion is genuinely wrong, say so in the report and leave it failing until a human changes it.
- **Never fake progress.** A blocked deliverable that is honest is worth more than a ticked one that lies.

---

## Milestones

| | Milestone | Done when | Depends on | Status |
|---|---|---|---|---|
| **M1** | The first modules, published | Fundamentals readable on the public web | — | ✅ Done |
| **M2** | The site becomes an application | the curriculum renders from an app, not a doc generator | M1 | ✅ Done |
| **M3** | A record that outlives the browser | progress survives a device change, without being required | M2 | ✅ Done |
| **M4** | A test suite that survives editing | an ordinary content edit cannot turn the build red | M2 | ✅ Done |
| **M5** | One central curriculum config | reordering the course is one line | M4 | ✅ Done |
| **M6** | Intermediate and Ecosystem written | 19 of 33 modules written, every one bilingual | M1 | ✅ Done |
| **M7** | The curriculum reordered | the config matches the author's intended order, everything green | M5, M6 | 🔄 In progress |
| **M8** | The interface revised | a first-time reader can navigate without learning anything | M7 | 🔄 In progress |

> **Numbering never restarts.** When this file is split, part two continues at the next M.

---

## 🏁 Milestone M1: The first modules, published

**Inferred.** 2026-07-07 to 2026-07-24, roughly 13 commits.

The corpus started as plain markdown and was published with MkDocs Material to GitHub Pages. The first
Fundamentals modules were written in this period — LLMs, RAG, tools, memory — and everything from
Intermediate onward was marked not ready.

### Report — inferred 2026-09-08
The first thing that existed was the writing, not the platform. Everything since has been in service
of a corpus that already worked as a pile of markdown files.

---

## 🏁 Milestone M2: The site becomes an application

**Inferred.** 2026-08-25 to 2026-08-31, roughly 15 commits, landing as one pull request titled
*"Hidden Line: the curriculum as a 32-sheet drawing set"*.

MkDocs was replaced by a Next.js static export with a presentation modelled on an engineering drawing
set: each module a numbered sheet, each category a subsystem, a title block of facts on every page.
`MANIFEST.md` was rewritten in the same period as a document for readers rather than for the team.

### Report — inferred 2026-09-08
This is where the vocabulary in `ARCHITECTURE.md` §9 comes from, and where the interface problems that
M8 exists to fix were introduced. The engineering-drawing metaphor is internally consistent and was
carried through thoroughly; it is also the thing a first-time reader cannot decode.

---

## 🏁 Milestone M3: A record that outlives the browser

**Inferred.** 2026-09-01, landing as *"Accounts, organisations, and a record that outlives the browser
(§14)"* and *"the front matter, a home screen, an alias, and three doors (§15)"*.

Optional Supabase accounts, organisations and assignments, an append-only event log with
client-minted ids, and a home screen that replaced `index.md` as the published front page.

### Report — inferred 2026-09-08
The important property is that it gates nothing, which is `MANIFESTO.md` rule 9. The seam that joins
the local and remote halves is a single component, and its absence was the largest defect in this
work: both halves existed and signing in did nothing.

---

## 🏁 Milestone M4: A test suite that survives editing

**Inferred.** 2026-09-03, landing as *"rebuild the suite around rules, a stored output, and four
feature checks"*.

A suite of 1,948 tests that pinned word counts, module numbers, checklist totals and quoted prose was
cut down to a few hundred that check rules instead. `tests/README.md` records the rule and the four
layers that replaced the old suite.

### Report — inferred 2026-09-08
The rule is in `ARCHITECTURE.md` §11 and it is still being enforced: four more pinned assertions were
found and replaced on 2026-09-08, five weeks after this milestone supposedly finished.

---

## 🏁 Milestone M5: One central curriculum config

**Inferred.** 2026-09-03, four commits in sequence: add the config alongside the frontmatter, make the
app read it, move the corpus in one atomic commit, then generate the CSS from it.

A module's number stopped being its identity in seven places at once and became its position in
`mini-courses/curriculum.yaml`.

### Report — inferred 2026-09-08
Verified by the strongest gate available at the time: the corpus was untouched through the first
commits, so the built site had to be byte-identical, and was. M7 is the first real test of the claim
that reordering is now one line — see its report.

---

## 🏁 Milestone M6: Intermediate and Ecosystem written

**Inferred.** 2026-09-03 to 2026-09-04, roughly 50 commits, landing as pull request #14.

Ten modules written from the author's drafts — Coding Agents, Harness Engineering, Loop Engineering,
Security, Personal Agents, and the five Ecosystem modules — then all of them translated. Bilingual
coverage reached 19 of 19 written modules.

### Report — inferred 2026-09-08
Also in this period: 60 commit messages were rewritten to remove AI attribution after the rule
arrived, and the browser suite went from 29 failures to one known environment flake.

---

## 🏁 Milestone M7: The curriculum reordered

**Live.** Started 2026-09-08.

The author rewrote `mini-courses/scratchpad/topics.txt` with a new order and new content notes. The
curriculum went from 7/7/10/6/1/2 across six categories to **8/8/11/5/1 across five**.

### Deliverables

- [x] `curriculum.yaml` rewritten to the new shape
- [x] Observability moved from Ecosystem to Fundamentals, keeping its written text
- [x] New stubs for Generative UI and Advanced Coding Agents, both bilingual
- [x] `advanced_architectures` renamed `advanced_agent_architectures`
- [x] The Optional category removed, its two modules folded into Advanced Deployment
- [x] All 66 series rails regenerated from the config
- [x] The Optional category removed from the application, the mascot, the CSS and the learning paths
- [x] Every test that enumerated six categories or pinned a module number updated or derived
- [ ] Committed and pushed

### Acceptance criteria

- `npm run typecheck`, `npm test`, `npm run build` and both link gates pass. **Met:** typecheck clean,
  2,033 tests, 56 pages, every internal link in the export resolves.
- Playwright shows no regression against a clean build of the parent commit. **Met:** the only
  reproducible failures are four `site-footer` cases whose cause is proven to be that the new and
  renamed files are not yet committed, so `git log -- <path>` returns nothing and the page prints no
  revision.
- Zero EN/TR structural mismatches across the corpus. **Met:** 33 modules, 0 mismatches.

### Report — 2026-09-08
M5's claim held up: the order itself was one line per module. The cost was everywhere *else* — a
category removal reached the type union, the mascot's hidden sixth face, four CSS blocks, the record
report's hue table, the learning paths, an image script and eight test files. Two defects were caused
by the move and caught by looking at the built output rather than at the tests: the moved
Observability module's sibling links broke, and three of its sentences addressed the reader as having
already read modules that now come after it.

---

## 🏁 Milestone M8: The interface revised

**Live.** Started 2026-09-08. **Active milestone.**

The author's judgement: *"It is far from a best-practice, professional and easy-to-use UI."* Thirteen
specific flaws were named, from unfamiliar vocabulary to a diagram that paints over the sidebars. The
functionality stays; the presentation is replaced.

### Deliverables

- [x] A playground of standalone alternatives to choose from, at `playground/`
- [x] Three complete vocabulary sets, so the naming can be settled before any screen is built
- [x] Four themes, each from a different UI language, one of them built from the project's own banner
- [x] Three alternatives each for navbar, catalog, module layout, sidebar, completion, code and
      diagram colour, progress page, and home
- [x] The diagram overflow bug reproduced and diagnosed rather than guessed at
- [ ] The author chooses: one vocabulary set, one theme, one option per component
- [ ] Naming and design tokens applied
- [ ] The shell: one navbar on every page, and the collapsible module list
- [ ] The module page, including the diagram containment fix
- [ ] The catalog, with filters at the top and levels separated by colour
- [ ] The home page
- [ ] Progress and account, folding the four routes that currently compete

### Acceptance criteria

- Every capability in `ARCHITECTURE.md` §3 to §8 still works: completion, undo, checklist, quick
  check, sources, submittals, streak, role paths, export, import, erase, optional sign-in, both
  languages.
- A reader who has never seen the site can find a module, read it and mark it done without being
  taught anything.
- No page states a word from the left column of `ARCHITECTURE.md` §9.
- A diagram wider than the text column scrolls inside its own box, verified in a browser at 1440px:
  **no element of a diagram may have a right edge beyond its column, without a clipping ancestor.**
- The full gate stays green, and no test pins a fact about the content.

### Report
Not finished. Waiting on the author's choices.
