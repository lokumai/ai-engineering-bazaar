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
covers: "the whole project, 2026-07-07 onward — M1 to M14; M9 to M11 shipped"
last_updated: "2026-09-09"
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
| **M8** | The interface revised | a first-time reader can navigate without learning anything | M7 | 🔄 In progress · umbrella for M9–M14 |
| **M9** | The vocabulary and the ground | no reader-visible string uses a retired word, and the theme's tokens ship | M8 | ✅ Done |
| **M10** | The shell | one navbar on every route, and a module list that folds away | M9 | ✅ Done |
| **M11** | The module page | a diagram wider than the column cannot paint outside it | M10 | ✅ Done |
| **M12** | The catalog | one route, three views, filters at the top | M10 | ⬜ Not started |
| **M13** | The home page | a first-time visitor knows what this is and where to start | M10 | ⬜ Not started |
| **M14** | Progress and account | one route instead of four, and completion editable from it | M11 | ⬜ Not started |

> **Numbering never restarts.** When this file is split, part two continues at the next M.

### The order of M9 to M14, and why it is that order

Not arbitrary, and not parallelisable. Each one is a commit that can ship on its own and leave the
site working, which is the property that makes the sequence worth keeping.

1. **M9 first** because every later milestone writes strings and uses tokens. Doing it second means
   renaming things twice.
2. **M10 before M11** because the module page sits inside the shell. Building the page against the old
   navbar means measuring the content column against a rail that is about to move.
3. **M11 before M12 and M14** because it carries the diagram containment fix, which is the only flaw
   in the thirteen that is a defect rather than a preference, and because the catalog and the progress
   page both link into it.
4. **M12, M13 and M14 are independent of each other** and can go in any order once M11 lands. M14 last
   by preference, because it is the only one that touches the account layer and the RLS suite has to
   run against it.

**The gate at each one** is the full CI order from the root `CLAUDE.md`: `npm run typecheck && npm test
&& npm run build && npm run test:e2e`. A green `npm test` alone means little here, because the link
gate and the export only fail in `build`. Nothing is marked `[x]` on a partial gate.

**What must not change across all six.** These are the acceptance criteria of M8, and they are checked
at every milestone rather than at the end:

- Every capability in `ARCHITECTURE.md` §3 to §8 still works.
- No route, no slug and no reader record moves. A reader who marked twelve modules complete last month
  still has twelve.
- `mini-courses/` is untouched. `git status` showing anything under it means the milestone went wrong.
- No test pins a fact about the content.

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
- [x] Four palettes of the chosen theme, at a quarter of its volume, generated from one template
- [x] The author chooses: ten answers, recorded below and in `playground/index.html`
- [ ] ~~Naming and design tokens applied~~ → **M9**
- [ ] ~~The shell: one navbar on every page, and the collapsible module list~~ → **M10**
- [ ] ~~The module page, including the diagram containment fix~~ → **M11**
- [ ] ~~The catalog, with filters at the top and levels separated by colour~~ → **M12**
- [ ] ~~The home page~~ → **M13**
- [ ] ~~Progress and account, folding the four routes that currently compete~~ → **M14**

**The build was broken out into M9 to M14** at the author's request, once the choices were made. M8
stays open as the umbrella: it is done when all six are done and its acceptance criteria below hold
across the whole site, not one screen at a time.

### What was chosen — 2026-09-08

| Question | Chosen | Recorded in |
|---|---|---|
| Vocabulary | **C, Engineering curriculum** — Catalog, Level, Module, Complete, Requires | O1 |
| Theme | **T4 Bazaar**, colours unchanged, ground **G3 `#FDFBF7`** | D12, O4 |
| Navbar | **A** — one row, a dropdown per level | — |
| Catalog | **all three views behind a toggle**: Overview, Cards, Table | D13 |
| Module layout | the layout already in T4, with a centred full-width column | D15 |
| Completion | **A** at the end of a module, **C** on home and progress | D14 |
| Code and diagrams | **dark slab** | — |
| Progress and account | **A** | — |
| Home | **A** | — |
| Module list | the one already in T4, foldable, current level enlarged | D15 |

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
Not finished, but nothing is open. All ten answers are in, the ground is **G3 `#FDFBF7`** (O4), and
the six build milestones are M9 to M14. **Waiting on the author's approval to start building.**


---

## 🏁 Milestone M9: The vocabulary and the ground

**Done, 2026-09-08.** Four commits: the vocabulary, the palette, the type and
radius scale, and the colour names.

Set C, *Engineering curriculum*, replaces the drawing-set vocabulary everywhere a reader can see it,
and T4's tokens replace the Hidden Line tokens. Nothing about behaviour changes in this milestone;
if a page does something different afterwards, that is a defect.

**This milestone is where the whole revision can go quietly wrong**, because it is the one that
touches every file and changes nothing you can click. Do the vocabulary and the tokens as two
commits, not one, so a contrast regression and a rename regression cannot arrive together.

### Deliverables

- [x] The five renames applied to every reader-visible string: subsystem → **Level**, sheet →
      **Module**, index sheet → **Catalog**, sign-off → **Complete**, feeds/drawing → **Requires**,
      the register → **My progress**, the drafter → **you**
- [x] `ARCHITECTURE.md` §9's table updated: each retired term struck through with its replacement
- [x] `tests/unit/copy-register.test.ts` extended so a retired word in a reader-visible string fails
- [x] The T4 token set written into `src/app/lokum.css`, ground **`#FDFBF7`**, raised surfaces white
- [x] **The two line tokens split by job**: `line` / `line-strong` for grouping, `on-surface-faint`
      `#948D7D` for the boundary that identifies an interactive control. On this ground no line colour
      in the palette reaches 3:1, so a control bordered with `line-strong` is unperceivable at 2.07:1
      (O4)
- [x] `button-quiet`, the inputs, the search field and the catalog's view toggle moved onto the
      interactive line token — this is a fix, not a restyle
- [x] Every card, panel and dropdown keeps its border: on a ground at 96.6% luminance, white sits
      1.035 above it and the fill separates nothing
- [x] `src/app/lokum-modules.css` regenerated in the same commit, per the root `CLAUDE.md`
- [x] The five level colours mapped to T4's, and `src/components/mascot/geometry.ts` checked, since it
      names faces after categories
- [x] Turkish checked alongside English: the vocabulary change is bilingual or it is half done

### Acceptance criteria

- **No page states a word from the left column of `ARCHITECTURE.md` §9**, in either language. A grep
  over the export, not over the source.
- The copy-register test fails when a retired word is put back, verified by putting one back.
- Every contrast and palette test recomputes from the shipped stylesheet and passes; **the tick is a
  filled disc and clears 3:1 against the ground**, because it cannot clear 4.5:1 as text (D12).
- **Every interactive control's boundary clears 3:1** against the surface behind it, measured from the
  shipped stylesheet. A test that passes when `button-quiet` is put back on `line-strong` protects
  nothing, so put it back once and watch it fail.
- **`on-surface-faint` carries no sentence anywhere.** It is 3.19:1 on this ground, which is under the
  4.5:1 text floor; it is for a count, a unit or a status word repeated elsewhere on the page.
- The forced-colors e2e spec still passes: colour is never the only signal.
- No behaviour changed. The record, the routes, the slugs and the reader's saved progress are
  untouched, and `git status` shows nothing under `mini-courses/`.

### Report — 2026-09-08

**Done, in four commits.** The headline number is measured rather than asserted:
stripping the tags from every file in `out/` and grepping the visible text found
**1,660 occurrences of the retired vocabulary across 56 pages before, and 0
after.**

**What the work actually turned out to be.** Not a find-and-replace. Four
hazards were caught by dry-running the rename before writing anything, and each
one would have shipped a defect:

1. **Identifiers inside `${...}`.** A template literal's interpolation is code.
   The first pass rewrote `${thousands(sheet.extent)}` to
   `${thousands(module.length)}`.
2. **Type members and discriminants.** `XpSource = 'SIGN-OFF'`,
   `EdgeKind = 'requires'`, `kind: 'sheet'`. Renaming an object key without its
   union is a type error, which typecheck would have caught; renaming both
   silently changes a discriminant, which it would not.
3. **Word boundaries.** Without them `WITHDRAWN` became `WITHREADY` and
   `stylesheet` became `stylemodule`.
4. **A blanket JSX pass is impossible in `.tsx`.** An arrow function makes every
   `=>` look like the opening of a text node, so the pass was rewriting
   `sheet.drawn` to `module.ready`. It was written, dry-run, and thrown away;
   the residue was done by hand instead.

**What was NOT renamed, deliberately.** Storage keys, DB columns, CSS classes,
React props and type members keep the left column of `ARCHITECTURE.md` §9. A
reader's saved history is keyed on them, so renaming one for a label would
invalidate every record. §9 now states that line explicitly.

**The guard found what the export grep could not.** The new whole-of-`src/` scan
in `copy-register.test.ts` caught two strings that never appear in `out/`,
because they only exist in the record document the browser generates at run
time: "What signing off required" and the account page's lead. Mutation-tested —
putting "Sheets you sign off" back turns it red.

**The palette, and the three things measuring changed.** Ground `#FDFBF7`,
raised surfaces white, cobalt as the accent, in both themes, every ratio
computed from the shipped stylesheet:

- Muted text on the old sand was **4.21:1**. The sand was lightened rather than
  the text darkened.
- `ink-faint` and `line-strong` cannot be one value: one must stay *under* 3:1
  or it becomes usable as a meaningful mark, and the other must clear it. They
  were briefly both `#948D7D`.
- **T4's Intermediate blue is the accent hue.** A level hue within 20° of the
  accent is one a reader can mistake for a link, so Intermediate moved to 240.
  And lightening the sand made the mid-tone level hues *worse* against it —
  3.00:1 against a 3.10 floor — so their shared lightness dropped to 0.575.

**Four tests changed because they recorded the retired system rather than a
rule**, which is the distinction `tests/README.md` draws: twenty pinned contrast
ratios became floors carried by each pair's *job*; T2 ("the accent cannot carry
text") is asserted in reverse, so re-creating it names itself; the shared
lightness asserts *one* lightness rather than `0.605`; and the token-reader test
asserts a shape instead of `--color-ink`'s literal value.

**One thing could not be verified here.** This environment has no network, so
Manrope cannot be fetched and the local build falls back. Everything measured
locally was measured against the fallback metric; the face itself is confirmed
on the first build with network.

**Left for the milestone that applies them:** the radius tokens and the two
shape tokens are set but nothing uses them yet, and the zero-radius assertions
in `sheet.test.tsx` and `record-index.spec.ts` still pass because the
stylesheets have no `border-radius` yet. Both move in M10 and M11, with the
components that apply them.

---

## 🏁 Milestone M10: The shell

One navbar on every route, and a module list that gets out of the way. This is the milestone that
answers "no active, unified navbar" and "the left and right components should anchor to the edges".

### Deliverables

- [x] Navbar option **A**: one row, on every route, with a dropdown per level
- [x] The current route marked in it, and the current level marked in the dropdown
- [x] The module list as an accordion, one section per level, the current level **enlarged with a
      coloured edge** and its count in the reader's own ink rather than grey
- [x] It folds away in 200ms, with a tab pinned to the left edge to bring it back, and the fold
      remembered per reader
- [x] `prefers-reduced-motion` respected: the fold is instant, not animated
- [x] Both rails anchored to the window edges, with the content column centred between them (D15)
- [x] The completion tick as a filled disc, large enough to read at a glance

### Acceptance criteria

- Every route carries the same navbar, verified by loading all 17 in a browser and comparing.
- The fold moves the column and restores it, verified by driving it: the list's measured width goes
  to zero and back. **Not by reading the CSS** — the first version of that tab was unclickable under a
  sticky header and only a browser found it.
- Keyboard reaches the dropdown, the fold and the restore tab, with a visible focus ring on each.
- At 390px the list is a sheet rather than a column, and no page scrolls sideways
  (`responsive.spec.ts` runs at 1440, 1024 and 390).
- The reader's fold preference is written through `src/lib/record/store.ts` or not stored at all.
  **Not a second writer** (`ARCHITECTURE.md` §5).

### Report — 2026-09-08 (the navbar) and 2026-09-09 (the rest)

**The navbar landed first**, on 2026-09-08. Four destinations, the current one
marked twice (a fill and a rule, so forced colours keeps one), a dropdown per
level with each level's own hue and its number beside it, and the trail moved to
its own row under it rather than competing for the same 56px.

**No JavaScript in the dropdown**, and that is a correctness point rather than a
saving: the export is static and a reader can click a link in the first frame, so
a menu that needs `useState` to open does nothing until the bundle lands. It is a
native `<details>` disclosure.

**The first version of it was keyboard-inaccessible and my own check passed it.**
It hid the panel with `visibility: hidden` and revealed it on `:focus-within`,
which is circular — `visibility: hidden` removes an element from the tab order,
so focus can never get inside to fire the rule that would show it. The check
called `.focus()` programmatically, which *does* fire `:focus-within`. Pressing
Tab forty times in Chrome and printing what had focus showed the five level links
were not in the order at all. See `logs/BRAINSTORM.md` **D17**, which carries the
correction and the rule: to check a keyboard path, press the key, and assert both
halves of a disclosure, because either alone passes for the wrong reason.

---

**The remaining four deliverables landed on 2026-09-09, together with M11**, for
the reason the previous report gave: the left rail held the contents rather than
the curriculum, so building the list meant the rail swap M11 needed anyway.

**The accordion.** `src/components/curriculum/CurriculumRail.tsx`, a server
component: five native `<details>`, one per level, with the current level's
`open` set at build time. No JavaScript, for the same reason the navbar has
none. The current level is told apart **four ways at once** rather than one,
because colour is never the only carrier — a 4px edge in its own hue, the sand
fill, a step up in size, and its count moved from grey to the reader's own ink.
The author asked for exactly that: *"when we are in a specific level, its tab in
the left sidebar must imply it."*

**The tick is a 17px teal disc with a white check**, revealed by channel A: a
fourth generated selector list in `scripts/curriculum-css.mjs` reveals the mark
for a module the boot script stamped, so a reader's completed modules are ticked
**before the first paint** with no React at all. It carries the word `Complete`
inside it for a screen reader, revealed by the same rule so the two cannot
disagree, and the 17px box is reserved whether or not a tick ever appears, so a
completion does not shift the row it lands on. The author's words: *"the green
tick … should be bolder and larger. currently it is too small."*

**The fold, and the thing that made it work.** 200ms on DESIGN.md's own curve,
with a restore tab pinned to the window's left edge and vertically centred. The
part that is not obvious: **the first grid track is `auto`, not `262px`.**
MEASURED — with a fixed track the rail's width animated to zero and the column
came back **974px, exactly what it had been**, so the prose did not move and the
fold looked broken. With an `auto` track the column goes 974 → 1236 in the same
200ms. The folded rail is `visibility: hidden`, which is what takes its 33 links
out of the tab order, and each of the two controls hands focus to the other so a
keyboard reader is never stranded.

**Everything above was driven in a browser, and here is what it measured.**

| | measured |
|---|---|
| rail, open | x 0 → 262 |
| contents rail | x 1236 → 1440 |
| column track | 974px, gutter 48.96px each side |
| the measure | **781px**, centred, clearing each rail by **97px** |
| folded | rail 0px, column 1236px, gutters 228px |
| fold, `prefers-reduced-motion` | `transition-duration: 1e-05s`, 262 → 0 in 40ms |
| fold, motion on | `0.2s`, 106px at 40ms, 0px at 440ms |
| restore tab | 57 × 120 at x=0, y=390 — `elementFromPoint` returns the tab itself |
| tab order, open | … trail · **hide** · level · level · module ×8 … |
| tab order, folded | … trail · **restore** · (no level, no module, no hide) |
| the fold, stored | `prefs.railFolded: true`, and no second `localStorage` key |

**781px and not 814px**, which is the number D15 recorded. `ch` is the advance
width of `0` in whatever face resolved, and 814 was measured before the webfont
was being fetched; `document.fonts` reports Manrope loaded on this build. The
pixel count is not the rule and no test asserts it — `anatomy.spec.ts` measures
an 80ch box inside the prose itself and compares against that.

**The fold is written through `store.ts` and nowhere else**, as
`ARCHITECTURE.md` §5 requires. `prefs.railFolded` is the third widening of
`prefs`, it needs no migration rung, and the boot script stamps it **before**
the `carriesNothing` gate — a reader whose only stored state is a folded rail
carries nothing by §15.11's rule, and stamping after the gate would have sprung
the rail open on every load for exactly the readers who asked for it to be shut.

**One thing removed rather than restyled.** §4.2's four corner registration
marks framed a 1152px content box. A bleed page has no such box, so they floated
at an edge nothing else used — and they are a second decorative motif on a
system that spends its ornament once. They are gone from the module page and
still on every route that keeps the shell.

### The e2e state, and what the four red ones turned out to be

**431 passed, 19 skipped, 1 red at the time of writing** — the last one my own
new test, fixed before the gate below. The starting point was 355 passed and 4
failed, and the diagnosis PROGRESS.md carried for two of the four was wrong in
the same way both times: **they were races in the harness, not palette defects.**
`logs/BRAINSTORM.md` **D20** has the measurements. In short:

1. **`accessibility.spec.ts:330`** — the manifest's `#` column at `1.84:1` in
   dark. The ink was already the dark theme's and the ground was still the light
   theme's: the sample landed 32ms into a 90ms `background-color` cross-fade.
   The theme helper counted two frames after lifting its transition freeze;
   Chrome starts the transition **on** the thaw frame. It waits for the
   transitions now. All 31 accessibility tests pass, including the code-comment
   contrast check on the new slab ground.
2. **`anatomy.spec.ts:92`** — "module 13 still has a figure that breaks the
   measure". Two defects in one test: it waited on `networkidle` while mermaid
   injects after a dynamic import, and it pinned a fact about the content, which
   `tests/README.md` forbids. **It is deleted, with the behaviour it described**
   — nothing breaks out of the measure any more — and `containment.spec.ts`
   asserts the rule in its place.
3. **`home.spec.ts:271` and `record-sheet.spec.ts:307`** — both the same
   `firstPaint` sampling race, and both green now: the helper waits for its probe
   instead of reading it once. Two MORE in that family surfaced and were cleared
   the same way, and a third assertion in it was a proxy rather than a property
   (D20 again).

**One test remains intermittent and it is not in this family.**
`theme.spec.ts:99` ("a stored light preference beats a dark system setting,
before first paint") went flaky once in one full run and passed on retry. It is
the theme boot script's own channel-A probe, the same shape as the record's,
and it was not touched by this work.

**And two acceptance criteria had nothing checking them.** Both are now
measured, and writing the second one turned up something worth keeping:

- **"Every route carries the same navbar, verified by loading all 17 in a
  browser and comparing"** — `navigation.spec.ts` loads sixteen routes plus a
  module page and compares the destinations, the level list, and how many
  destinations are marked current, which must never exceed one.
- **"Mermaid text stays legible on the dark slab, and the diagram palette clears
  3:1 for graphics"** — `mermaid.spec.ts` composites each label's colour up its
  ancestor chain and recomputes: **16 labels at worst 12.82:1 and 28 strokes at
  worst 5.21:1, identical in both themes**, which is the claim, because a slab
  that quietly inherited the page's palette would pass in one theme and fail in
  the other. Mutation-tested: putting `--color-line-strong` back on `slab-line`
  inside the slab reports **1.36:1** and fails. And mermaid 11 lays a node's
  label out as HTML inside a `foreignObject`, keeping `<text>` for the edge
  labels only — 13 `<text>` elements carrying 2 labels between them against 14
  `.nodeLabel` elements on one module — so a selector of either alone measures a
  third of the drawing and calls it the whole.

---

## 🏁 Milestone M11: The module page

The screen the reader spends their time on, and the one carrying the only flaw in the thirteen that
was not a matter of taste.

### Deliverables

- [x] T4's layout, with the content column centred and spanning its container, capped so it stays
      readable (D15: 80ch, measured at 814px on a 1440px window)
- [x] Code blocks and diagrams as a **dark slab**
- [x] **The diagram containment fix**: a diagram wider than the column scrolls inside its own box
- [x] The right rail cut back to what a reader uses, and what leaves it recorded in O2 if it has no
      home
- [x] Completion control **A** at the end of the module: one button where the reader already is
- [x] Prev and next kept, in the vocabulary of set C

### Acceptance criteria

- **In Chrome at 1440px, on the widest diagram in the corpus: no element of a diagram may have a
  right edge beyond its column without a clipping ancestor.** The current failure is 90 to 145
  elements per page outside the column, from a 1,423px SVG injected into a 656px column (D10). The
  check has to run after mermaid has injected, because the overflow does not exist before that.
- The same at 390px and 1024px.
- Every capability of the module page still works: completion, undo, checklist, quick check, sources,
  submittals, both languages.
- Mermaid text stays legible on the dark slab, and the diagram palette clears 3:1 for graphics.
- No test pins a word count, a table count or a module number.

### Report — 2026-09-09

**Done, with M10's remainder, in one piece of work.** The rail swap is why: the
left rail held the contents and the right held twelve rows of metadata, and T4
wants the opposite, so neither milestone could be finished without the other.

**THE CONTAINMENT FIX, which is the item that mattered.** The measured before
and after, on the widest module in the corpus at 1440px:

| | before | after |
|---|---|---|
| the column | 656px, x 376 → 1032 | 974px track, 781px measure |
| the figure's box | **1152px, x 144 → 1296** — over both rails | 781px, inside the column |
| the widest SVG | 1524px, reported x 360 → **1884** | 1524px, clipped to 781px |
| elements outside the column | **96** on one module, 45 and 34 on two others | **0** |
| at 1024px / 390px | not measured | **0** and **0** |

**What the defect actually was, and it is not what the acceptance criterion
says.** The criterion reads "no element of a diagram may have a right edge
beyond its column without a clipping ancestor", and measured literally the OLD
build already passed it: `.hl-diagram-body` has had `overflow-x: auto` all
along, so the 1524px drawing was clipped and the document never scrolled
sideways. The real defect was one level up — **the figure broke OUT of the
column** by 232px left and 264px right, on purpose, because that is how the
retired system gave a wide table its width. So the scroll container was doing
its job inside a box that was itself in the wrong place, and 96 elements of one
figure sat outside the measure with a rail underneath them.

So the fix was to stop the break-out: no layout sets `--hl-break-left` or
`--hl-break-right` any more, which collapses the `min()` in the width classes to
100% on its own, and the two rules that made a broken-out figure *readable* —
the `--color-paper` ground and the hairline down each broken side — went with
it. `containment.spec.ts` asserts the stronger form: the **painted** rectangle
of every element, its own box intersected with every clipping ancestor above it,
must lie inside the column. 138 elements measured per page, at three viewports,
on every written module, after waiting on the island's own `data-hl-ready`.

**Mutation-tested**, which is the only reason to believe any of it: forcing
`overflow-x: visible` back on and restoring the 1152px width put **57 elements
up to 275px outside the column and pushed the document's scroll width to
1511px** on a 1440px window. Every assertion fires on that.

**The slab is a local theme override, not a second palette** (`BRAINSTORM.md`
D21). `mermaid-config.ts` already binds every fill, stroke and label to a
`var(--color-…)` reference so a theme switch costs 0ms; custom properties
cascade into inline SVG, so redeclaring the palette on the figure re-themes all
fifty-three diagrams onto a dark ground with no change to the mermaid config, no
re-parse and no JavaScript. Two things measurement changed: the light theme's
`fault` is 2.90:1 and `info` 1.67:1 on `#1d1f27`, so the slab duplicates the
dark theme's semantic values; and `slab-line` is 1.36:1, correct for the slab's
own boundary and wrong for a diagram's geometry, so `--color-line-strong`
resolves to `slab-comment` at 5.21:1 inside it.

**One published value moved.** DESIGN.md's `slab-comment` `#767c88` measures
**3.92:1** on the slab, under the 4.5:1 a comment needs because a comment in a
teaching corpus is content. `#8b91a0`, 5.21:1. Measured for the record against
`--color-slab`: ink 12.82, string 9.05, function 7.77, number 7.54, keyword
6.40, comment 5.21. And **§11.20's four-colour cap is reversed rather than
broken**: four was right when the code ground was the page's own sand, and the
slab is its own closed five-value palette with its own ground.

**The right rail is cut to two things**: the sections of this module, and what
sits either side of it in the dependency graph. The twelve metadata rows moved
into the column, into `TitleStrip` — which already rendered exactly that set as
the narrow-window variant, so nothing was dropped and nothing had to be built.
**Nothing lost its home, so nothing went to O2 — but a question did**: four of
the twelve are rows nobody has named a use for, and moving them into the column
made them louder rather than quieter. That is written into **O2** rather than
answered on the way past, because `title-block.ts` has unit tests stating the row
set and deleting a row is a decision about what the page claims.

**Completion control A** is at the end of the module now, before prev/next,
where §12.4.1 had put it at the top. D14 is the reason and the author chose it
for both surfaces at once. It is DESIGN.md's canonical `button-primary` — cobalt,
filled, `md`, with a check glyph, in sentence case — and its text is
`--color-paper` rather than white, because cobalt is dark in light mode and the
accent is *lifted* in dark mode: 12.88:1 and 6.81:1, both clear. Its completed
state is deliberately not filled.

**Two strings slipped M9's rename and this caught them**, both because the copy
register matches on word boundaries and neither carried one: `UNSIGN` is now
**Un-complete** (which is what the keyboard sheet had been printing beside `s`
all along) and `— END OF SET` is now **End of the course**. The arrows glued to
`Previous module →` are gone too — DESIGN.md names that as a tell.

**`--color-line-control` is applied.** M9 declared it and left every control on
`line-strong`; eight controls moved onto it, and
`tests/unit/color/slab-and-controls.test.ts` asserts each one in **both**
directions — mutation-tested by putting `.hl-btn` back, which turns two cases
red. The `md` radius arrived with them, which retires T7's zero-radius rule; the
test that recorded it now asserts the rule that replaced it, that a radius is a
token and never a literal.

**What was NOT done, and it is a real gap.** The module list is on the module
page only. M12's catalog, M13's home and M14's progress pages still use the
1200px shell with no rail, which is the right seam — those three milestones are
where those pages get rebuilt — but a reader who folds the rail on a module and
then visits the catalog sees no rail to restore. The fold preference travels
with them and is honoured the moment they come back.

---

## 🏁 Milestone M12: The catalog

One route, three views (D13). Filters at the top, levels told apart by colour.

### Deliverables

- [ ] A view toggle with an icon and a name each: **Overview**, **Cards**, **Table**
- [ ] All three render from one data source, with no view-specific data and no view-specific route
- [ ] Filters at the top of the page, not down a side
- [ ] Levels separated by colour in every view, and by something other than colour as well
- [ ] The reader's chosen view remembered
- [ ] Both languages

### Acceptance criteria

- The three views show **the same set of modules** for the same filter state, asserted by comparing
  the rendered module names between views rather than against a written list.
- A curriculum change reaches all three views, verified by reordering one line in
  `curriculum.yaml` and checking all three follow.
- Filters work by keyboard and are announced; an empty result says what to do next, not "no results".
- Levels are distinguishable under `forced-colors: active`.
- One route. Adding a view must not add a URL.

### Report
Not started.

---

## 🏁 Milestone M13: The home page

Option **A**. The first thing a stranger sees, and today it shows XP, Class and Uptime.

### Deliverables

- [ ] Home page A, in the chosen ground and vocabulary
- [ ] Completion shown with control **C** (D14): state visible and adjustable across the course
- [ ] The retired progress vocabulary resolved: XP and Uptime relabelled to what they measure, Class
      and "I at 8" removed unless somebody says what question they answered (O2)
- [ ] Every count on it derived at build time, never restated

### Acceptance criteria

- A reader who has never seen the site can say what this is and where to start, from the first screen
  at 1440px and at 390px.
- No number on the page is written in `src/`. Break one derivation and the page must change
  (`ARCHITECTURE.md` rule: content is derived, never restated).
- Channel A still stamps `<html>` before first paint, so progress marks are correct in frame one and
  there is no flash of an empty record (`ARCHITECTURE.md` §12.2).
- Signed out is the default and complete; nothing on the page requires an account.

### Report
Not started.

---

## 🏁 Milestone M14: Progress and account

Option **A**, and the milestone that answers "profile and dashboard are unusable". Four routes
currently compete to tell the reader the same thing.

### Deliverables

- [ ] One progress-and-account route, replacing the four, with the others redirecting rather than
      404ing
- [ ] Completion control **C** on it (D14), writing through `store.ts`
- [ ] Export, import and erase kept and findable
- [ ] Optional sign-in kept, gating nothing, with `AccountSync` still the single seam
      (`ARCHITECTURE.md` §6)
- [ ] Role paths kept, with the denominator honest about drafts

### Acceptance criteria

- Every capability in `ARCHITECTURE.md` §5 to §8 still works: export, import, erase, streak, role
  paths, claim-and-merge, sign-in, sign-out.
- **With no `.env.local` the page is complete and makes zero Supabase requests**, which the default
  e2e run asserts.
- With accounts on, `E2E_ACCOUNTS=1 npx playwright test accounts.spec.ts` passes and
  `node scripts/test-rls.mjs` is unchanged: this milestone touches no policy.
- An old bookmark to any of the four retired routes lands somewhere useful.
- The reader can see their state without signing in, on a second device, and understand why it
  differs.

### Report
Not started.
