---
description: >
  The decision log. A chronological record of investigations, analysis and conversations between the
  human and the agent, and the decisions they produced. It exists so that months later anyone can read
  it and see that on a given date we considered three options, chose the second, and why — the
  traceability of how the project got its shape. Append-only, dated, numbered, and deliberately terse.
  NOT here: the resulting rule itself (that goes to MANIFESTO.md or ARCHITECTURE.md), the work done
  (PROGRESS.md), or a write-up of every fix — see the entry test below.
authority: background
writes: agent, whenever a decision is made
status: active
covers: "the whole project, 2026-07-07 onward — D1 to D19, O1 to O4"
last_updated: "2026-09-08"
---

# 🧠 BRAINSTORM — Why we chose what we chose

> **D1 to D6 were reconstructed from git history on 2026-09-08, not captured from the work as it
> happened.** Commit messages say what changed, almost never why, so each of those entries records
> only what the history makes genuinely visible and marks the rest unknown. **D7 onward was recorded
> live.**

---

## What earns an entry

**Most things do not.** A decision log that records every fix becomes unreadable, and an unreadable log
is the same as no log. Before appending, apply the test:

> **An entry earns its place when an alternative was rejected, or when a measurement changed our minds.**

| Write it down | Do not |
|---|---|
| We considered three approaches and picked one | We fixed a bug |
| A measurement contradicted what we assumed | A test went green |
| A rule changed, or gained an exception | A refactor with no choice in it |
| We chose a library, a pattern, a boundary | Routine work already in `PROGRESS.md` |
| We reversed an earlier decision | A conversation that reached no decision |

## How to write one

Number it permanently, date it absolutely, say what was **rejected**, and give the number and the
command if a measurement decided it.

```markdown
### D7 · {{The decision, as a short claim}} — {{YYYY-MM-DD}}

**Considered:** {{option A}} / {{option B}} / {{option C}}
**Chose:** {{B}}
**Because:** {{one or two sentences, or a table, or a diagram}}
**Rejected {{A}} because:** {{one line}}
**Measured:** {{the number, and the command}}
**Rule that follows:** {{where it landed — MANIFESTO rule n, ARCHITECTURE §n, or none}}
```

---

## Decision log

### D1 · A static application replaces the documentation generator — 2026-08-31

**Considered:** MkDocs Material (in use since 2026-07-08) / a Next.js static export
**Chose:** the Next.js static export
**Because:** the corpus needed things a doc generator does not offer: derived counts, per-reader
progress before first paint, a prerequisite graph, and a bilingual badge computed from two files.
**Rejected MkDocs because:** unknown from the history. The commits show the swap, not the argument.
**Rule that follows:** `ARCHITECTURE.md` §7.
**Inferred.**

### D2 · The corpus is read-only, and the application derives everything — inferred, around 2026-08-31

**Chose:** nothing in `src/` may restate a fact that lives in a markdown file.
**Because:** the corpus is edited by hand daily. Any count, title or total typed into the application
drifts out of step and is then wrong on a project whose premise is that unreliable content is the
problem.
**Rule that follows:** `MANIFESTO.md` rule 12, `ARCHITECTURE.md` §1.
**Inferred.**

### D3 · Authorisation is row-level security only — inferred, around 2026-09-01

**Considered:** Edge Functions and RPC / row-level security alone
**Chose:** RLS alone. No Edge Functions, no RPC, no views, no triggers.
**Because:** the schema stays portable Postgres and every rule is visible in one place.
**Cost accepted:** an over-permissive policy raises no error, so every policy change needs
`scripts/test-rls.mjs`. RLS filters `UPDATE` and `DELETE` silently and only `INSERT` raises, which is
why that suite has both `expectRefused` and `expectTouchesNothing`.
**Measured:** 5 migrations, 10 tables, 28 policies.
**Rule that follows:** `ARCHITECTURE.md` §6.
**Inferred.**

### D4 · A test may check a rule, never a fact about the content — 2026-09-03

**Considered:** keeping the 1,948-test suite / cutting it to rule checks
**Chose:** rule checks.
**Because:** the old suite pinned word counts, module numbers, checklist totals and quoted prose, so
an ordinary content edit turned the build red and taught nobody anything.
**Measured:** 1,948 tests down to a few hundred. As of 2026-09-08 the suite is 2,033 tests in 76 files
(`find tests -name '*.test.ts*' | wc -l`), grown back by rules rather than by facts.
**Rejected the alternative because:** the corpus is live; a suite that fights editing loses.
**Rule that follows:** `ARCHITECTURE.md` §11, and `tests/README.md`.
**Inferred, though the rule itself is written down and still enforced.**

### D5 · A module's number is its position in one config file — 2026-09-03

**Considered:** the number stays in frontmatter and in the filename / one central config
**Chose:** `mini-courses/curriculum.yaml`, and the number appears nowhere in it.
**Because:** the number had become the module's identity in seven places at once. Two reorders each
needed a script written for the occasion, and one shipped a link whose text said "Module 26" while it
pointed at file 25.
**Rejected frontmatter because:** it put the same number in two places, and the two drifted.
**Rule that follows:** `ARCHITECTURE.md` §2.
**Inferred, though the commit messages for this one are unusually explicit.**

### D6 · Turkish is readable on GitHub, not on the site — inferred, around 2026-09-01

**Chose:** the application skips every `_tr.md`; the site shows only a language badge.
**Because:** unknown. The most likely reason from the code is that a second rendered locale doubles
every route and every test surface for a translation that is finished only after the English is.
**Rule that follows:** `ARCHITECTURE.md` §2.
**Inferred, and the weakest entry here — the reason is a guess and is labelled as one.**

---

### D7 · Observability keeps its written text and moves to Fundamentals — 2026-09-08

**Considered:** replace it with a placeholder as the author's note asked / move the written module and
mark it draft / move it and leave it ready
**Chose:** move it, leave it ready.
**Because:** the author's reordering note said "not yet prepared… put placeholders", but a written and
translated module already existed at about 1,150 English words. Asked directly rather than guessed,
because the corpus agreement forbids deleting a file the author works in without asking about that
step on its own.
**Rejected the placeholder because:** the author chose otherwise when asked. Fundamentals is now 8 of
8 written.
**Cost:** the module was written as the last Ecosystem sheet, so its sibling links broke and three
sentences addressed the reader as having finished modules that now come after it. Both fixed.
**Rule that follows:** none. A one-off content decision.

### D8 · The Optional category is removed, not emptied — 2026-09-08

**Considered:** keep `optional` as an empty category so no application code changes / remove it and
adjust the application
**Chose:** remove it. Human-in-the-Loop and Runtime folded into Advanced Deployment's notes.
**Because:** the author's new order has five categories, and the validator requires the config's
categories to match the application's own type union, so an empty sixth category is not a way to avoid
the change.
**Cost accepted:** the mascot is documented as a cube whose six faces map to six categories (§8.1 of
the design spec). It now maps five. The face that lost its mapping is one of the three that are never
drawn, so no pixel changed, but the six-for-six premise in that docblock is no longer true and the
comment was rewritten to say what the sixth face now is. The author was asked before this was done,
because it is a colleague's design.
**Measured:** the removal touched `categories.ts`, `geometry.ts`, `lokum.css`, `report.ts`,
`paths.ts`, `copy-course-images.mjs` and eight test files.
**Rule that follows:** `ARCHITECTURE.md` §2.

### D9 · Exemplars in the test suite are chosen by route, never by position — 2026-09-08

**Considered:** update the positional exemplars for the new order / select them by route
**Chose:** by route.
**Because:** `tests/e2e/sheets.ts` picked its representatives as `SHEETS[12]` and
`tests/e2e/responsive.spec.ts` as `sheetByModule(12)`. The reorder moved every one of them onto
different content — the "widest prose" exemplar stopped being Security, the "widest table" stopped
being Loop Engineering — **with the entire suite still green.** A silent wrong test is worse than a
red one.
**Measured:** four exemplars and one seeded record were pointing at the wrong module after the
reorder, and nothing failed.
**Rule that follows:** `ARCHITECTURE.md` §11.

### D10 · The interface is replaced, the functionality is kept — 2026-09-08

**Considered:** incremental fixes to the current drawing-set interface / a full presentation revision
**Chose:** the revision. The author's judgement: *"It is far from a best-practice, professional and
easy-to-use UI."*
**Because:** thirteen named flaws, and most of them are the same flaw. The engineering-drawing
metaphor is internally consistent and thoroughly carried through, and it is undecodable to a
first-time reader: subsystem, sheet, sign-off, feeds, drawing, the register, the drafter. Nothing is
where a reader has learned to expect it from every other education site.
**Rejected incremental fixes because:** the vocabulary, the navigation and the visual hierarchy are one
problem, not thirteen. Renaming words inside a layout nobody can navigate does not help.
**Measured, on the one flaw that was not a matter of taste:** the diagram overflow is real and was
reproduced in Chrome at 1440px. The content column runs x=376 to x=1032 and the right rail starts at
x=1056, but mermaid injects an SVG **1,423px wide starting at x=144**, painting across both rails and
past the window edge; 90 to 145 elements per page sit outside the column. The cause is that mermaid
renders client-side, so the SVG arrives after load at its natural content width and escapes the scroll
container. The rails rebuilt in M7 are wider, so this got worse.
**Also decided:** four design directions were built rather than argued about, at `playground/`, and
the palette for the one drawn from the project's own banner was **sampled from the file** rather than
guessed: cobalt `#282864`, cream `#C8B48C`, clay `#A0503C`, ochre `#C8A078`.
**Rule that follows:** `MANIFESTO.md` rule 7's first question, and `ARCHITECTURE.md` §9 lists the
vocabulary being retired. The choices themselves are still open — see O1.

### D11 · One architecture document, and the root one is folded into the harness — 2026-09-08

**Considered:** leave both with an explicit boundary / cut `specs/ARCHITECTURE.md` down to the domain
half / fold the root `ARCHITECTURE.md` into it and delete the root file
**Chose:** the third, on the author's instruction. My recommendation had been the second.
**Because:** two documents describing one system are two documents that disagree, and about a third
of the 286-line root file overlapped with the 381-line harness file. The author's standing rule was
already *there is one architecture document*; this restores it rather than carving out an exception.
**Rejected the boundary because:** it only postpones the drift, and a reader who opens one of two
files cannot tell they are holding half.
**What was carried over, not lost:** the **six rules that explain the code** — no page may lie,
content is derived never restated, the browser is the source, one definition of each thing, decisions
are pure, authorisation lives in the database — plus the runtime-layers picture, the build pipeline,
the two generated files and why one is committed, revision hashes coming from git, the four test
suites, the two load-bearing habits, and the deployment guards. The result is 607 lines and keeps its
original section numbering **1 to 12 unchanged**, so every `§n` citation already written across this
harness still resolves.
**Corrected on the way in:** the absorbed file's stale counts. It said 53 pages in one place and 58
in another (measured: 56), 23 RLS policies (28) and about 33k lines of `src` (39,344).
**Rule that follows:** the file itself, and four references repointed at it in the root `CLAUDE.md`,
`README.md`, `mini-courses/CLAUDE.md` and `mini-courses/AGENTS.md`.

---

### D12 · T4 keeps its palette, and only the ground is lightened — 2026-09-08

**Considered:** a different theme / four re-lit palettes with new hues / T4's exact palette with the
ground as the single variable
**Chose:** the third, after the author corrected the second. His words: *"the original T4 is already
really good. the only thing for variant I wanted was the background color which also our navbar items
activate with. the original colors of T4 should be kept in variants, only the background filling
color should change and become lighter ones."*
**Because:** the objection was to one token, not to the scheme. Cobalt, clay, ochre, teal and gold are
accepted; the cream ground behind them is what read as heavy.
**My first attempt was wrong and is worth recording as such.** I read *"too strong and too dark and
saturated"* as being about the cobalt header and built four palettes with new hues taken from the
logo, which threw away the part he had just said he liked. The lesson is narrow and useful: when
someone says a design is good except for one thing, the variable is that one thing.
**Measured, on the four candidates that replaced them:** today's ground `#F4ECE0` sits at 84.6%
relative luminance; the four run 89.3%, 93.3%, 96.6% and 94.3%. Body text on it goes 13.24 to
13.94–15.01:1, secondary text 4.96 to 5.22–5.62:1.
**What has to move with it, and nothing else does:** the raised surface. A card cannot be darker than
the page it sits on, so `--paper` goes to white on the three lightest grounds. Every other token is
byte-identical to what shipped.
**The one thing that improves for free:** the ground is also the fill of the active navbar item, so
lifting it lifts that chip's contrast against the cobalt bar — 11.36:1 today, up to 12.88:1.
**Still not fixed by this, and a real defect:** the teal tick is 3.44:1 on today's cream and only
reaches 3.90:1 on the lightest ground, so the ground cannot rescue it. Drawn as a filled disc with a
white check it is a graphical indicator rather than text, needing 3:1, which it clears everywhere. As
a hairline glyph it would not. That is why the tick changed shape and not colour.
**Method worth keeping:** the four are generated from one template by a script, so structure,
spacing, type and ornament are byte-identical and the ground is provably the only difference.
**Rule that follows:** `specs/DESIGN.md`, rewritten around T4. The ground chosen was **G3 `#FDFBF7`**
— see O4, which also records the one thing that choice broke.

### D13 · The catalog ships all three views behind a toggle, not one of them — 2026-09-08

**Considered:** pick one of the three catalog alternatives / ship all three with a view switch
**Chose:** all three, on the author's instruction: *"I want All 3 !!! They should be all loaded and
using a toggle."* Renamed to what each one is for: **Overview**, **Cards**, **Table**.
**Because:** they answer three different questions. Overview shows the shape of the course, Cards is
for browsing when you do not know what you want, Table is for scanning and comparing when you do.
One view has to lose one of those.
**Rejected picking one because:** the author asked for all three, having seen all three.
**The cost, recorded so nobody is surprised by it later:** three renderings to keep working instead of
one. It is bounded by making them views over one data source with no view-specific data and no
view-specific route, so a curriculum change cannot update one and miss another. Anything a view needs
that the others do not is the signal that this decision needs revisiting.

### D14 · Completion appears in two places, with two different controls — 2026-09-08

**Considered:** one control used everywhere / a different control per surface
**Chose:** the author's split — option A at the end of a module, option C on the home and progress
pages.
**Because:** the two surfaces ask different questions. At the end of a module the reader has one thing
to say and wants one button where they already are. On home and progress they are looking at
thirty-three modules at once and want to see and adjust state without opening anything.
**Rejected one control everywhere because:** the module-end button becomes noise in an overview, and
an overview control at the end of a module makes the reader hunt for the one row that is theirs.
**Constraint this puts on the build:** both controls write through `src/lib/record/store.ts`, which is
the only writer (`ARCHITECTURE.md` §5). Two controls, one path.

### D15 · The content column is centred and takes the width it is given — 2026-09-08

**Considered:** keep the shipped 656px left-aligned prose column / centre it at the same width /
centre it and let it grow
**Chose:** the third. The author: *"The center content in each module should be center aligned and
span the whole container, while some horizontal space from left sidebar and right 'on this page' is
reserved."*
**Because:** the shipped column left a wide empty band between the prose and the right rail on any
normal display, which read as a rendering fault rather than as a margin.
**Measured at 1440px:** the column comes out 814px wide, capped at 80ch, centred in the 974px track
left over by the two rails, so it clears each of them by 80px; with the list folded away the gutters
grow to 211px and the column does not. That cap is the reason it grows without becoming unreadable.
**Rejected the same width, centred, because:** it moves the empty band rather than removing it.
**Comes with it:** the module list folds away in 200ms, restored by a tab pinned to the left edge. The
first version of that tab was fixed at `top:88px` under a `z-index:40` sticky header and could not be
clicked at all — found by driving it in a browser, not by reading it.


### D16 · Only reader-visible strings are renamed; the code keeps the old words — 2026-09-08

**Considered:** rename everything, code included / rename only what a reader can see
**Chose:** the second, and `ARCHITECTURE.md` §9 now states the line rather than implying it.
**Because:** a storage key and a DB column carry a reader's saved history. `sheet_slug`,
`kind: 'sign-off'` and the `data.sheets` map are what a record from last month is keyed on, so
renaming one to match a label would invalidate every reader's history for a cosmetic gain. CSS
classes, React props and type members are the same argument with a smaller stake: nothing a reader
can see, and a rename with a real chance of a silent miss.
**Rejected renaming everything because:** the benefit is that a future reader of the code sees one
vocabulary, and the cost is a migration of stored data. That trade is only worth making if the code's
vocabulary is actively misleading, and it is not — it is *consistent*, which was always the retired
system's virtue.
**Measured:** 1,660 reader-visible occurrences across 56 pages before, 0 after. The source carries
2,358 mentions of `sheet` alone, almost all of them identifiers, which is the ratio that makes this
decision obvious.
**The consequence to live with:** anyone reading `src/` meets both vocabularies. §9's table is the
translation, and its two columns are labelled "In the code" and "What the reader sees" for that
reason.
**Rule that follows:** the whole-of-`src/` scan in `tests/unit/copy-register.test.ts`, which bans the
left column in a reader-visible string and ignores it everywhere else. A word inside backticks is
stripped before matching, because that is the code's own name being quoted.

### D17 · The navbar dropdown carries no JavaScript — 2026-09-08

**Considered:** a React menu with `useState` and `aria-expanded` / a CSS menu on `:hover` and
`:focus-within`
**Chose:** the CSS one.
**Because:** this is a static export. A reader can click a link in the first frame, before any bundle
has arrived, and a menu that needs state to open does nothing until it does. The same argument
`ARCHITECTURE.md` §12.2 makes for channel A applies to any control that has to be right immediately.
**Rejected the React menu because:** it buys `aria-expanded` and Escape-to-close, and costs
correctness before hydration. It is also claiming state that does not exist here — the trigger is a
link to `/courses/` and the panel is a list of links, so there is nothing to expand: a reader who
clicks the trigger gets the level index, which is a reasonable answer to the same question.
**The one thing that had to be got right:** `:focus-within` is what makes it keyboard-reachable, and
it must come FIRST in the selector list, or a panel opened by the keyboard closes when the pointer
happens to leave the item.
**Verified by driving it, not by reading it:** tabbing to `Curriculum` in Chrome returns
`visibility: visible` and the level inside carries `aria-current`.

### D18 · A contrast test asserts the floor its token's job carries, never a published ratio — 2026-09-08

**Considered:** recompute the twenty published ratios and re-pin them / drop the pins and assert the
floors
**Chose:** the second.
**Because:** the pinned table was reasonable while the design spec was the authority — it caught a
token edited without the spec being updated. Once the palette is replaced wholesale the same table is
twenty red tests for one intended change, and it is exactly the fact-in-a-test that `tests/README.md`
forbids: it turns an ordinary edit into a failure and teaches nobody anything.
**What replaced it is stronger in one direction.** Each pair declares the JOB its foreground does —
text 4.5:1, graphic 3.0:1 — and *decorative* is now a **ceiling** rather than a note. `--color-line`
and `--color-ink-faint` must stay BELOW 3:1, because the moment one of them clears it somebody
reaches for it to carry meaning. The old table only commented on that.
**Two rules died with the old palette, and both are asserted in reverse rather than deleted.** T2
("the accent cannot carry text", because the orange was 4.30:1) — cobalt is 12.88:1, so the assertion
is now that the accent *clears* 4.5:1, and lightening it back under the floor names the rule it
re-creates. And the six level hues shared a lightness of 0.605; what mattered was that they share
*one*, so the test asserts the set has size one.


### D19 · The interactive border is its own token, because a floor checked against one ground is not checked — 2026-09-08

**Considered:** darken `--color-line-strong` so it clears 3:1 everywhere / give the interactive
border a token of its own
**Chose:** the second, after trying the first and watching it collide.
**How it came up:** O4 established that a border which *identifies a control* needs 3:1 and a border
which *groups* does not, and gave the job to `--color-line-strong` at 3.19:1. That number was measured
against the page. **An external review pointed out that the contrast table paired every token with
`paper` and `cleared` only, and checked `sunken` for the two inks alone** — and `sunken` is the sand
that an input and a card's header strip actually sit on.
**Measured, once the pairs were added:** `line-strong` is **2.68:1** on the sand and `caution-ink` is
**4.35:1**. So the exact defect O4 exists to prevent had shipped anyway, one ground over.
**Why darkening `line-strong` failed:** the five level colours share one lightness, 0.575, and it is
pinned — it is what clears 3.1:1 against the grounds of *both* themes at full chroma and at half. A
structural line dark enough for the sand lands at that same lightness, and `lokum.test.ts`'s
separation rule caught it immediately: a line a reader can mistake for a level. Lowering the levels
instead broke their own contrast floor against the dark ground. There was no room.
**So:** `--color-line-control` is a third line token, clearing 3:1 on all three grounds.
`--color-line-strong` keeps the grouping job and carries no floor on the sand, because grouping is all
it does there. `--color-caution-ink` is darkened to clear 4.5:1 on all three.
**Rule that follows, and it generalises past colour:** **a floor checked against one ground is not
checked.** `tests/unit/color/contrast.test.ts` now pairs every token with every ground it can appear
on, in both themes, and the decorative ceiling is asserted on all three too rather than only on the
page.
**Also from that review, and worth keeping separately:** the vocabulary ban's completion pattern had
no third person and no plural, so `signs off` and `sign-offs` slipped through a word boundary.
Widening it caught two reader-visible strings on the spot. The ban still cannot read a template
literal or a JSX run containing braces, and its `hl-` exemption is per-string rather than per-token —
three real holes in the *source* scan, covered today by the export grep, and closing them properly
means a parser rather than a lexer.


## Open questions

### ~~O1 · Which direction the interface takes~~ — opened and closed 2026-09-08

**Closed by the author's choices**, all ten of them, recorded in `logs/PROGRESS.md` M8 and in
`playground/index.html`: vocabulary set **C**, theme **T4** at lower volume (D12), navbar **A**,
catalog **all three behind a toggle** (D13), the module layout and sidebar already in T4, completion
**A** at a module's end and **C** on the overviews (D14), **dark slab** for code and diagrams,
progress and account **A**, home **A**.

Both sub-questions were answered by set C: `Complete` is the label, and `Level` describes the
curriculum. What remains of the second is folded into O2.

The original question, for the record.

<!-- superseded -->

Waiting on the author. Nine choices are outstanding: one vocabulary set of three, one theme of four,
and one option each for navbar, catalog, module layout, sidebar, completion control, code and diagram
colour, progress page and home page. All are built and viewable at `playground/index.html`.

Two sub-questions the author flagged as worth deciding separately:

- **Does "complete" mean "I read it" or something stronger?** If it stays a self-assertion,
  *Mark as read* is the honest label. `MANIFESTO.md` rule 11 says it is a self-assertion today.
- **Does the word "Level" describe the curriculum or the reader?** Both are currently called that in
  one of the three vocabulary sets, and one of the two has to change.

### ~~O3 · Two architecture documents now exist~~ — opened and closed 2026-09-08

The repository root has `ARCHITECTURE.md`, the colleague's, 286 lines, linked from the root
`CLAUDE.md`. Installing this harness added `specs/ARCHITECTURE.md`, 381 lines. **About a third
overlaps** — build, runtime, testing, and "what it is".

This contradicts a standing instruction. In September 2026 a second architecture document was created
at `context/ARCHITECTURE.md` and the author had it deleted and its content folded into the root file,
with the rule: *there is one architecture document, do not create another.* The harness requires one
at a fixed path, so the two coexist for now behind an explicit boundary written at the top of
`specs/ARCHITECTURE.md`: the root file wins on the application, this one wins on the domain, the
lifecycles and the vocabulary, and neither restates the other.

**Closed by D11: the root file was folded into this harness and deleted.** The three options
considered were:

1. **Leave both** with the boundary as written. Cheapest, and the risk is drift.
2. **Cut `specs/ARCHITECTURE.md` down to the domain half** — the module and reader lifecycles, the
   refusals, the record, the vocabulary — and delete everything the root file already says.
3. **Fold the root file into this one** and leave a pointer behind. Cleanest, but it rewrites a
   colleague's document and breaks the link in the root `CLAUDE.md`.

My recommendation was 2. The author chose 3, which is stronger: it leaves exactly one architecture
document rather than one and a half.

### O2 · Where the retired progress vocabulary lands — opened 2026-09-08

XP, Class, Uptime and "I at 8" are all shown on the home page today. XP and Uptime measure something
real and can be relabelled to minutes read and days in a row. **Class and "I at 8" have no proposed
replacement**, because nobody has yet said what question they were answering. Leaving them out is the
current proposal.

### ~~O4 · Which of the four grounds~~ — opened and closed 2026-09-08

**Answered: G3 "Powder", `#FDFBF7`.** The author: *"g3 powder is good I liked it."* The lightest of
the four, at 96.6% relative luminance against the retired `#F4ECE0` at 84.6%. T4's palette is
otherwise unchanged; `--paper` goes to pure white, because a raised surface cannot be darker than its
ground.

What the four measured, kept as the record of what was compared:

| | Ground | | Luminance | Body text | Active navbar item on the bar |
|---|---|---|---|---|---|
| — | retired | `#F4ECE0` | 84.6% | 13.24:1 | 11.36:1 |
| **G1** | Sugared | `#F8F2E8` | 89.3% | 13.94:1 | 11.95:1 |
| **G2** | Icing | `#FBF7F0` | 93.3% | 14.53:1 | 12.46:1 |
| **G3** | Powder | `#FDFBF7` | 96.6% | **15.01:1** | **12.88:1** |
| **G4** | Lokum cream | `#FFF8E9` | 94.3% | 14.67:1 | 12.58:1 |

**Closing it turned up something the choice itself caused, which is why this entry is longer than a
one-line answer.** On a ground this light, a white card sits 1.035 in luminance above the page, so the
fill no longer separates it and the hairline is doing the whole job. Measured against `#FDFBF7`, **no
line colour in T4's palette reaches 3:1**: `line` `#D8CBB4` is 1.55:1 and `line-strong` `#C3B299` is
2.00:1.

That is acceptable for a border that **groups** — a card's content identifies the card — and not
acceptable for the border that **identifies an interactive control**, which needs 3:1 to be
perceivable at all. So the line tokens split by job rather than by weight, and the interactive one is
`on-surface-faint` `#948D7D` at 3.19:1 on the ground and 3.30:1 on a white card: **the lightest token
already in the palette that clears the floor**, chosen for that reason, so a quiet control stays
quiet and no new hue enters the system.

**Rejected darkening `line` itself because:** reaching 3:1 needs roughly `#8F8467`, which is a visibly
heavier interface everywhere, to fix a problem that only exists on controls. Rejected keeping G1 or G2
for the extra fill separation because the author chose G3 having seen all four.

**One defect this exposes in what shipped:** `button-quiet` used `line-strong`, which is 2.07:1 on
white and fails. Fixing it is a deliverable of `logs/PROGRESS.md` M9, not a note for later.

**Rule that follows:** `specs/DESIGN.md`, Colors — the two line tokens and the split between them.
See D12 for why the ground was the only variable.
