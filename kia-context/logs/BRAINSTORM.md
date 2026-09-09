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
covers: "the whole project, 2026-07-07 onward — D1 to D24, O1 to O4"
last_updated: "2026-09-09"
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
### Dn · {{The decision, as a short claim}} — {{YYYY-MM-DD}}

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

### D17 · The navbar dropdown carries no JavaScript, and it is a `<details>` — 2026-09-08

**Considered:** a React menu with `useState` and `aria-expanded` / a CSS menu on `:hover` and
`:focus-within` / a native `<details>` disclosure
**Chose:** the third. **This entry originally recorded the second, and was wrong** — see the
correction below, which is kept because the mistake is more instructive than the answer.
**Because, for all three:** this is a static export. A reader can click a link in the first frame,
before any bundle has arrived, and a menu that needs state to open does nothing until it does. The
same argument `ARCHITECTURE.md` §12.2 makes for channel A applies to any control that has to be
right immediately.
**Rejected the React menu because:** it buys `aria-expanded` and Escape-to-close, and costs
correctness before hydration. `<details>` gives all three for free — the browser supplies Enter,
Space and Escape, and `<summary>` carries the expanded state without anyone claiming
`aria-expanded` by hand.

**CORRECTED, the same day.** What this entry first said was: *"Chose: the CSS one… `:focus-within`
is what makes it keyboard-reachable, and it must come FIRST in the selector list… Verified by
driving it: tabbing to `Curriculum` in Chrome returns `visibility: visible`."*

Every part of that is wrong, and the reasoning was circular. **`visibility: hidden` removes an
element from the tab order**, so focus can never get inside the panel to fire the `:focus-within`
rule that would reveal it. The five level links were not reachable by keyboard at all.

**The verification was the defect.** It called `.focus()` on the trigger programmatically, which
*does* fire `:focus-within` — so the panel opened, the level showed `aria-current`, and the check
passed. A real Tab press cannot do that. **Measured properly by pressing Tab forty times in Chrome
and printing what had focus**, the order was `skip · wordmark · Home · Curriculum · Catalog · My
progress · Profile · Keyboard shortcuts · Toggle theme · Repository · trail`, with no level link in
it anywhere.

**Rule that follows, and it is the reusable part:** to check a keyboard path, **press the key**. And
for a disclosure, assert BOTH halves — closed, the contents are NOT in the tab order; open, they
are — because either alone passes for the wrong reason.
**The cost of `<details>`, accepted:** hover-to-open, which CSS cannot do to an `open` attribute.
And a disclosure cannot also be a link, so the whole-curriculum page the label used to be is now the
panel's first row, named rather than implied.
**One thing `<details>` does not do:** close on a client navigation. `open` is DOM state on an
element the layout keeps, so choosing a level left the panel hanging over the page it had just
opened — found by an external review, confirmed by measurement, and fixed with one effect keyed on
the pathname. Escape *does* close it; Chrome does that natively.

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


### D20 · A frame count is not a wait, and a proxy is not the property — 2026-09-09

**Considered:** treat four red browser tests as regressions from the M9 palette / read them as races
in the harness
**Chose:** the second, after measuring each one. Three of the four were the harness; the fourth was a
test that pinned a fact about the content.
**How it came up:** `logs/PROGRESS.md` M10 named four e2e failures and diagnosed two of them as
plausible palette defects. Both diagnoses were wrong in the same way.
**Measured, on `accessibility.spec.ts`'s dark-theme manifest check** (`"01" at 1.84:1` against a 4.5
floor): the ink was already dark-theme `ink-muted` and the ground was still **light-theme paper**.
Polling the row's computed `background-color` every 120ms after the theme switch returned
`oklab(0.988498 …)` — the light value, at transition progress zero, with one running animation on the
element — and the dark value only from the second sample. The row transitions `background-color` over
90ms, and lifting `transition: none !important` in the same frame as the value change makes Chrome
start the transition on the NEXT frame, from the old value. The helper's own docblock said "the frame
after the freeze is lifted is the first one that is honest". It is not; it is the first frame of a
cross-fade.
**Measured, on `anatomy.spec.ts`'s figure check** ("module 13 still has a figure that breaks the
measure", expected > 0, got 0): it passed run alone and failed under parallel load, because it waited
on `networkidle` and mermaid injects its SVG after a dynamic import that `networkidle` does not
account for. It also pinned a content fact, which `tests/README.md` forbids — an author who narrowed
every diagram would have turned it red for doing nothing wrong. It was deleted with the behaviour it
described, and `containment.spec.ts` asserts the rule instead, waiting on the island's own
`data-hl-ready`.
**And the same shape twice more.** `firstPaint` sampled its probe once, so a read that landed before
the probe's `requestAnimationFrame` returned `undefined` and every caller reported it as "channel A
did not stamp" — two more failures, cleared by waiting for it. And one assertion in that family was a
PROXY rather than the property: `painted.hydrated !== 'true'` stood in for "React has not run", on the
reasoning that hydration cannot beat the first paint. **Measured under eight workers with a warm
cache, twice out of two runs:** all three channel-A stamps correct in the pre-paint frame AND
`hydrated` reading `true`, because under CPU contention the main thread parses and hydrates in one
long task and the browser produces no frame until it ends. React beating the first *paint* contradicts
nothing §12.2 claims.
**Rejected weakening the assertion**, which would have been tampering. It was replaced with a
structural check on the served HTML — the boot script is inline and blocking inside `<head>` — which
is what makes "before first paint" true by construction rather than by timing, and which fails if
anyone defers it or moves it into `<body>`.
**Rule that follows, and it generalises past tests:** **to wait for something, wait for it.** A frame
count, a `networkidle`, or a single sample of a value that arrives asynchronously is a race dressed as
a check. This is D17's lesson one layer down: D17 said press the key rather than call `.focus()`;
this says wait for the paint rather than count frames to it. `specs/ARCHITECTURE.md` §5 carries the
consequence for the channel-A tests.

### D21 · The slab is a local theme override, not a second palette — 2026-09-09

**Considered:** give code and diagrams their own bespoke colours / redeclare the existing palette on
the slab element and let it cascade
**Chose:** the second.
**Because:** `mermaid-config.ts` already binds every fill, stroke, label and arrowhead in a diagram to
a `var(--color-…)` reference, for a different reason — a 0ms theme switch with no re-render (§9.2).
Custom properties cascade into inline SVG, so redeclaring the palette on the figure re-themes all
fifty-three diagrams onto a dark ground with **no change to the mermaid configuration, no re-parse and
no JavaScript at all**. A bespoke palette would have meant a second set of selectors to keep in step
with the first.
**Rejected bespoke colours because:** the slab is the one place hue carries meaning rather than
identity, and a second mechanism for it is a second thing to get wrong on every diagram type the
corpus grows.
**Two things measurement changed.** The light theme's diagram hues do not survive on `#1d1f27`:
`fault` is **2.90:1** and `info` is **1.67:1** against the 3:1 a graphic carries, so the slab
duplicates the DARK theme's semantic values — which cannot be shared through a `var()` indirection,
because `code-theme.ts` reads the `.dark` block as TEXT at build time and hands it to a hex converter.
`tests/unit/color/slab-and-controls.test.ts` asserts each copy equals the `.dark` value it duplicates.
And `slab-line` is **1.36:1** on the slab: correct for the slab's own boundary, which groups, and
wrong for a diagram's geometry, which is what `--color-line-strong` draws — so inside the slab that
token resolves to `slab-comment` at 5.21:1 instead.
**One published value moved.** DESIGN.md's `slab-comment` `#767c88` measures 3.92:1 on the slab, under
the 4.5:1 text floor. A comment in a teaching corpus is content, so it takes that floor; `#8b91a0` at
5.21:1. This is the third time the same call has been made — §6.7 made it against `--color-ink-faint`
on the old code ground — which is why it is recorded rather than tidied.
**Also decided, and it is a rule reversed rather than broken:** §11.20 capped a syntax theme at four
token colours, and the slab has five. Four was right when the code ground was the page's own sand and
a fifth hue was a fifth hue *in the page's palette*. The slab is its own closed palette with its own
ground, DESIGN.md names all five, and the keyword keeps its weight emphasis on top of its hue because
that is what made the four-colour theme readable.

### D22 · XP, Rank and "I at 8" leave every instrument; reading time replaces them — 2026-09-09

**Considered:** relabel XP to something a reader can name / keep the points and add a unit beside them
/ take all three off every surface and print minutes instead
**Chose:** the third, which is the author's own resolution of O2: *"XP 0 becomes minutes read, UPTIME
1D becomes days in a row, CLASS — and I AT 8 are dropped entirely because neither answered a question
anybody was asking."*
**Because:** O2 asked what question each answered and nobody could name one. `XP` is
`100 × completions + 60 × quick checks + 40 × checklists`, a weighted sum of three unlike acts, and
there is no honest label for it — "points" is the same jargon in plainer type. `CLASS` is a Roman
numeral for any 8 modules of 33 and §12.5.3 already forbade it from claiming a capability, which
leaves a rank that ranks nothing.
**Rejected relabelling because:** a label cannot fix a quantity. Whatever the cell was called it would
still be a number a reader could not act on, and the point of an instrument is that a reading tells
you something.
**What replaced it, and the one thing measurement decided.** `readingMinutes` sums the modules' OWN
declared duration over the modules the reader has completed. The obvious alternative was the reader's
own time on the page, which the record already has a field for — and **nothing writes it**: no dwell
observer was ever shipped (`attention.ts` records that), so a reader-measured reading time would print
`0 m` for every reader on every surface. The modules' estimate is an estimate and the surfaces that
print it say so once.
**What it cost:** the footer's strip on all 57 pages loses three cells and gains one; the quick
check's `+60 XP` chip becomes `Self-marked`, because an award beside a question is a currency nothing
spends any more; and the dashboard's `2,440 attainable today` line went with the fold in M14.
**What stayed, deliberately:** `xp()` and `classOf()` are still in `lib/record/derive.ts`, with a
header saying no surface renders them and why. The record still holds everything they read, a
reader's exported file was written against that vocabulary, and deleting a pure selector to remove a
label would be a schema change dressed up as a restyle. Nothing there may go back on a page without
answering O2's question first.

### D23 · Control C is the segmented meter, not the ring the mock drew — 2026-09-09

**Considered:** the playground's conic-gradient ring per level / the segmented meter already shipping
on the listings
**Chose:** the meter, and this is the one place the build departs from a chosen mock.
**Because:** a ring's fill is a **computed fraction**, and a computed fraction cannot reach CSS on
channel A — there is no arithmetic in a stylesheet and no way to stamp `37%` into a class name. So a
ring has to be drawn after hydration, which §12.2 forbids for a mark a reader sees in frame one, and
M13's own acceptance criteria forbid by name: *no flash of an empty record.* The failure lands on
exactly the readers who have progress.
**Measured, on the shipped page:** with every `.js` request refused, the meter's segments and the
per-module ticks are painted in the frame the probe takes and the footer's strip still publishes
`data-hydrated="false"`. A ring in that frame is empty.
**And it says more.** One segment per module needs no arithmetic and reports WHICH modules are done,
not just how many; a dashed segment says which are not written at all. A ring cannot express either.
**What is kept of C:** the per-level picture, the three numbers that mean something, the jargon gone,
and the state adjustable from the list — which is the substance of the option the author picked. The
mock's own note said rings "are harder to read precisely than a bar".

### D24 · `/profile/` is the address that survives the fold, because it owns the fragments — 2026-09-09

**Considered:** a new `/progress/` with all four old routes forwarding to it / keeping one of the four
and forwarding the other three
**Chose:** the second, with `/profile/` as the survivor.
**Because:** a `<meta http-equiv="refresh">` cannot carry a fragment. `/profile/` is the target of
five in-tree deep links — `#data` from `SignOff`'s NOT SAVED state and from `EmptyState` classes 2
and 4, `#claim` from the claim receipt, `#raw`, and `#hl-account-head` from the header's identity
affordance — and `FoldFragment` opens the row a fragment names. Moving that route would have broken
all five to rename a URL no reader reads.
**Rejected a new address because:** the reader-visible name is what changes (`Your progress`, which is
§9's word for this subject and what the page and the navbar now both say), and the URL is code. D16
already draws that line: only what a reader can see is renamed.
**What the forwards had to be, and it is not a config option.** `output: 'export'` has no server, so
`next.config`'s `redirects` are never applied and a page's own `redirect()` throws at build time. The
document does the work: an inline script first — the only one of the three that can carry
`location.hash` — then a `<meta refresh>` for a reader with scripting off, then a visible link. The
target goes through `lib/url.ts`'s `href()`, because `basePath` only rewrites what the router touches
and a hardcoded `/profile/` would work locally and 404 on GitHub Pages.
**Also decided here, and it is the smaller half:** the three `g` chords whose destinations folded —
`g d`, `g r`, `g l` — are **unbound rather than repointed**. Four keystrokes reaching one page is a
shortcut sheet that reads as a mistake, and a row printing `Record` while opening a page headed
something else is a promise kept in the letter and broken in the substance.


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

### D25 · Control C states its completion on channel A, and carries no `aria-pressed` — 2026-09-09

**Considered:** keep `aria-pressed` on control C's per-module toggle, rendered on channel B (what
M13 shipped) / move the state onto channel A as a word revealed by the same generated rule that
reveals the disc / render `aria-pressed` on channel A somehow.

**Chose:** the word on channel A. `aria-pressed` is gone from that toggle.

**Because:** whether a module is complete is decided by a class on `<html>` that no React render
sets (§12.2). An attribute rendered on channel B is therefore a **second author of one state**, and
the two authors disagree for every frame before hydration — and for ever when scripts never arrive.
**MEASURED**, with every `.js` request refused and one module seeded complete: the disc was painted,
its own word read `Complete`, and the same button reported `aria-pressed="false"`. A screen reader
was told "not pressed" about a module that is complete. The third option does not exist: CSS cannot
set an ARIA attribute.

**Rejected keeping it because** it is the exact defect `Catalog.tsx`'s own docblock already refuses
for its view toggle, in the same phase, for the same reason. One surface followed the rule and the
other did not.

**Two things this turned up that are worth more than the fix:**

1. **`aria-label` on a button replaces its contents for naming, so a word inside it is never
   announced.** The tick already carried an `sr-only` word for exactly this job and it was dead
   weight: with the label present, nothing inside the button reached an assistive technology at all.
   The word therefore has to live OUTSIDE the button. This is why the rail's tick and control C's
   tick, which look like the same problem, do not have the same solution — the rail's tick is inside
   a link whose name comes from its text, and control C's is inside a button whose name is an
   attribute.
2. **The word needed its own class, not the disc's.** Reusing `hl-cmod-mark` for it made that
   selector match two elements per row, which is a strict-mode violation in every locator that reads
   the tick — seven e2e tests, and it is how the first version of this fix was caught. The generator
   emits a second rule (E2) for `.hl-cmod-said` instead.

**Also measured, and it is why the assertion nearly went in wrong:** the revealed word computes to
`display: block`, not the `inline` the stylesheet asks for, because it is absolutely positioned and
absolute positioning **blockifies** an inline display. A test asserting `inline` failed against a
page that was behaving correctly. The assertion is `display: none` or not.

**Rule that follows:** `specs/ARCHITECTURE.md` §12.2 already holds it — a mark a reader sees in
frame one may not travel on channel B. This entry is the second surface to break it, so the rule is
not new; what is new is that an `aria-*` attribute counts as a mark.

### D26 · The mockup is the specification; DESIGN.md is a portable language, and layout is neither — 2026-09-09

**Considered:** (a) keep the DESIGN.md written for M9, correct its wrong values and carry on / (b)
keep it as `DESIGN_v1.md` marked superseded and write a new one beside it / (c) delete it and write
one file from the mockup, with layout moved out of it entirely.

**Chose (c).** The author's instruction was explicit: *"delete the old DESIGN.md. Keep a single
DESIGN.md and write it from beginning based on the reference T4 G3."*

**Because the document was not merely wrong in places, it was the wrong kind of document.** It
described the structure the project already had, carrying the newly chosen palette, and it was full
of product internals — framework class names, route names, content vocabulary, architecture
sections. An agent reading it rebuilt the existing interface, faithfully, five milestones in a row.
Correcting its values would have left that intact.

**MEASURED, which is what settles it rather than taste:**

| | |
| --- | --- |
| Mentions of the chosen mockup in the old DESIGN.md | **2**, both about contrast ratios |
| Mentions of `playground/` in the prompts of the three agents that built M10 to M14 | **0** |
| The mockup's on-dark-bar sub-palette in the old DESIGN.md | **0 of 5 tokens** — so its header was not buildable from it |
| Old class names surviving the five milestones meant to replace them | **378 of 398** |
| The mockup's whole design language | **257 lines of CSS**, against the app's **7,158** |

**Rejected (a)** because the file's *kind* was the defect, not its contents. **Rejected (b)** — the
supersede path I had proposed an hour earlier — on the author's call: two design documents in one
repository is two answers to one question, and the older one would be read by something eventually.
Git holds the history; the working tree holds one answer.

**Three rules follow, and they are the point of the entry:**

1. **A design document is a LANGUAGE, not a specification of the product.** Generic component names,
   a categorical hue *series* rather than the product's own taxonomy, and nothing that names a page,
   a route, a feature, a framework class or a piece of content. The test is portability: another
   product should be able to adopt the file unchanged.
2. **A surface's layout is not part of the language.** Which panels a screen carries, in what order,
   belongs to the milestone that builds that screen, against the mockup it came from. This is the
   structural fix: layout inside the language document is what let the document become a description
   of whatever already existed.
3. **A transcription names its original.** `DESIGN.md` carries `source:` pointing at the mockup, and
   where the two disagree the **mockup is right and the document is the bug**. A transcription that
   does not name its original gets mistaken for an original and then diverges from it quietly.

**Also decided here, the author having left it to me: in M16 the eleven stylesheets are deleted, not
migrated.** An edit preserves the thing being edited — see the 378 of 398 above. Anything from them
that turns out to be needed must be re-derived from a mockup to earn its place back.

**Rule that follows:** `specs/DESIGN.md`'s own Overview, and M15/M16 in `logs/PROGRESS.md`.

### D27 · The dark theme is the slab promoted, not a second palette — 2026-09-09

**Considered:** (a) keep the dark palette shipped in M9 to M14 and rebuild only the light theme /
(b) drop the dark theme and match the mockup exactly, which is light-only / (c) derive a dark
sibling from the light palette and have the author approve it before it enters the language.

**Chose (c).** No mockup in `playground/` defines a dark theme — **0 matches for
`prefers-color-scheme` across all of them** — and the application ships a full dark palette with a
toggle that `theme.spec.ts` asserts. So the language had a hole where a shipped capability was, and
the one thing I may not do is fill a hole in the mockup with taste (D26).

**Rejected (a)** because that palette belongs to the design that was rejected; keeping it would make
the two themes stop looking related. **Rejected (b)** because it removes a capability, and M16's
terms are that no capability is lost.

**The derivation, and it is a transformation with every step stated:**

1. **The surfaces ARE the slab, promoted from a component to the whole page.** The mockup already
   contains a complete dark ground with ink proven on it, which is why almost nothing here is new.
2. **Every chromatic lifted in OKLCH lightness, hue and chroma held**, until it cleared its floor on
   **all three grounds** — a floor checked against one ground is not checked (D19). **Hues moved by
   at most 0.3°, and five of the ten did not move at all.**
3. **The bar does not move.** Cobalt, its five on-bar values, the band and the completion disc are
   identical in both themes. That is what keeps them siblings, and a test asserts it.

**Three things the numbers forced, none of them a preference:**

| | |
| --- | --- |
| `on-surface-faint` | Has a **ceiling**, not a floor: it is for something ignorable, so it was *lowered* until under 3:1 on every ground — 2.49 to 2.98. The only token checked from above. |
| `on-primary` | Stops being white. White on the lifted accent is **3.19:1** and fails a text floor; the ground on it is **5.15:1**. A filled primary action carries dark type in the dark theme. The light theme needs no such token, white on cobalt being 12.88:1. |
| `primary` | Lifts while `bar` does not, which is only possible because the language keeps those two separate. |

**The accepted cost, decided by the author rather than overlooked:** the page ground and the slab are
now the same fill, so **a code block is told apart by its hairline**. The alternative — shifting the
three page grounds up a step so the slab reads as recessed — was offered and declined, because it
costs a value that is not the mockup's own and the hairline rule is the one the light theme already
lives by (a white card on a near-white ground is 1.03:1 and is separated by its border).

**Measured:** the palette is `playground/01-theme-T4-G3-DARK.html`, generated so that **outside the
token block the only differences from the light mockup are the header comment, the annotation
strip's text and one `.btn` rule** — so the palette is provably the only variable, the same
discipline as D12's grounds.

**Rule that follows:** `specs/DESIGN.md`, Colors — and `tests/unit/design/transcription.test.ts`
holds it, including that no dark token may be a colour the dark mockup does not contain, and that
the anchors are identical across the two themes.

### D28 · A dropdown trigger can be the current destination — 2026-09-09

**Considered:** (a) the current-destination chip appears only on a real page link, never on a
disclosure trigger — which is what M10 built / (b) the trigger for the section you are in carries
the chip, which is what the mockup's markup intends.

**Chose (b)**, on the author's call, with one condition of my own: the chip is marked with a **data
attribute and not `aria-current`**, so nothing tells an assistive technology that a trigger is a
page.

**Because the mockup is inconsistent with itself and the intent is still clear.** Its CSS styles
`.mainnav a[aria-current]` while its markup puts `aria-current="page"` on the `button.lv` that opens
the Curriculum dropdown — a selector that does not match a button, **so the chip never actually
paints in the mockup**. Found by the fidelity harness, which read the role as absent.

**Why M10 chose otherwise, and why that reasoning survives:** two `aria-current="page"` in one
navigation is a contradiction, and a disclosure trigger is not a page. Both remain true. What
changes is that this is a question about the *picture* rather than about the ARIA: the powder chip
on cobalt is the strongest "you are here" the language can make, and withholding it from the one
control that owns the section the reader is in wastes it. Splitting the two — visual state on a data
attribute, no ARIA claim — satisfies both.

**Rule that follows:** M16, the top-navigation row. `specs/DESIGN.md` already says the current
destination is a solid powder chip on cobalt and needs no change.

### O2 · Where the retired progress vocabulary lands — opened 2026-09-08, HALF ANSWERED 2026-09-09

**The first half is closed. See D22.** M13 took `XP`, `Rank` and `II at 16` off every instrument on
the site, `Uptime` was already `Streak` from M9, and `Reading time` replaced XP — the modules' own
declared minutes over the modules the reader has completed, because nothing writes the reader's own
time on a page and a figure that reads `0 m` for everybody is worse than an estimate that says it is
one. Nobody named a question `Rank` or the next threshold answered, which is what the paragraph below
asked for and did not get.

The original half, for the record:

> XP, Class, Uptime and "I at 8" are all shown on the home page today. XP and Uptime measure
> something real and can be relabelled to minutes read and days in a row. **Class and "I at 8" have
> no proposed replacement**, because nobody has yet said what question they were answering. Leaving
> them out is the current proposal.

**The second half is still open**, and M14 did not take it either. It is below, unchanged.

**M11 added a second half to this question and answered none of it.** Cutting the right rail back to
the sections and the dependency block left the module's twelve derived facts with nowhere to be, and
they went into the column — where they already had a variant, so nothing was dropped and nothing had
to be built. But four of the twelve are rows nobody has named a use for, and moving them into the
column made them more prominent rather than less:

- **`DRAWING 15`** restates the eyebrow one line above it (`MODULE 15 OF 33`), and `DRAWING` is the
  retired vocabulary in substance even though the copy register's word boundaries do not catch it.
- **`MARKED BY LKM-01`** is the same on all 33 modules.
- **`FIGURES 2 DIAG · 1 TBL`** and **`SOURCES 30`** count things the reader can see by scrolling.

Deleting a row is a decision about what the module page claims, and `title-block.ts` has unit tests
that state the row set, so it is not a change to make on the way past. **The whole panel is also still
tracked-out all-caps mono**, which `specs/DESIGN.md` names as the single clearest tell of a generated
interface — so the question is not only which rows go but what the survivors look like.

**M14 was named as the natural place and it was the wrong guess.** M14 rebuilt the progress surfaces
and never touched the module page: the strip is `title-block.ts`'s row set, which is a claim about
what a MODULE page states, and the four rows in question are facts about the drawing rather than
about the reader. It also converted `.hl-panel-title` off 11px tracked-out mono, which is the same
tell one component over — so the strip is now the last surface on the site still in that type. It
needs its own decision about what the page claims, and a milestone that says so.

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

> **CORRECTED 2026-09-09 — the number above is wrong, and the decision is still right.**
> `line-strong` does not measure 2.07:1 on white. Recomputed from the shipped token
> `oklch(0.6449 0.0246 87.2)`: **3.30:1 on `cleared` (white), 3.19:1 on `paper`, 2.68:1 on
> `sunken`** — and against the value this token held before the Bazaar palette,
> `oklch(0.64 0.010 250)`, it was 3.36:1 on white, so 2.07:1 was never true of either. DESIGN.md
> carried the same error as "2.00:1" and has been corrected to the three measured figures.
>
> **What this changes:** nothing about the decision. A third token is still right, because the
> ground a control actually sits on is the **sand**, where `line-strong` is 2.68:1 and does not
> reach 3:1 — which is the sentence D19 already gets right two paragraphs up. What it changes is the
> premise "no line colour reaches 3:1", which is true only of the sand and false of the paper and
> the cleared surface.
>
> **The rule, and it is D19's own rule turned on itself:** a floor checked against one ground is not
> checked — and a floor *quoted* from memory is not measured. Found by an independent review of the
> M10 to M14 work, which read the ratio off the shipped stylesheet instead of off this file.

**Rule that follows:** `specs/DESIGN.md`, Colors — the two line tokens and the split between them.
See D12 for why the ground was the only variable.
