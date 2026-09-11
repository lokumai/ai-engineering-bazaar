---
description: >
  Part 2 of the decision log, and the ACTIVE part: a new decision is appended here. D26 onward — the
  interface rebuilt on a portable design language, which is what D26 itself decided — plus the open
  questions, which live here because one of them is still half open and a closed file may not be
  appended to.
  The entry test and the house style for writing one of these are in part 1 and are not repeated.
  NOT here: what was built (PROGRESS.md / PROGRESS_2.md), or a rule that outlives the decision
  (MANIFESTO.md / ARCHITECTURE.md).
authority: reasoning
writes: agent, when a decision is taken
status: active
covers: "D26 to D65, plus open questions O1 to O4 — 2026-09-09 to 2026-09-12"
last_updated: 2026-09-12
---

# 🧠 BRAINSTORM, part 2 — the rebuild, D26 onward

> **← Part 1: [`BRAINSTORM.md`](BRAINSTORM.md)** — **D1 to D25**: the application, and the two
> attempts at its interface that D26 replaced. **It also carries the entry test and the house style
> for writing one of these, which are not repeated here** — one file states them.

## Decision log, continued

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

---

### D29 · The language takes its own class prefix, so a re-theme cannot pass for a rebuild — 2026-09-09

M16 deletes the eleven old stylesheets and rebuilds every surface. Both the old stylesheets and
`src/design/bazaar.css` used the `hl-` prefix, and **13 names collided with different meanings on
each side** — `hl-btn` (60 places in the markup), `hl-note` (19), `hl-rail` (19), `hl-node` (11),
plus `hl-band`, `hl-card`, `hl-card-title`, `hl-facts`, `hl-figure`, `hl-slab`, `hl-rail-fold`,
`hl-rail-head`, `hl-rail-restore`: 136 places in all.

**Considered:** keep `hl-` and rebuild each surface's markup in the same commit as its stylesheet.
**Rejected**, because during the rebuild any surface not yet touched would silently pick up the new
rules for those 13 and **look plausible while still being the old structure** — which is exactly how
M9 to M14 passed review. There would also be no mechanical way to tell a rebuilt surface from a
re-themed one, and the absence of that signal is what let 378 of 398 old class names survive.

**Chosen:** the language renames to `bz-`. It cost one mechanical pass over `bazaar.css` (116
occurrences), the 33 selector pairs of the transcription test, and the eight class names
`scripts/curriculum-css.mjs` emits. In exchange, `grep -r 'hl-' src --include='*.tsx'` is a live
progress meter: **1,252 today, 0 when the rebuild is done.**

**Deliberately out of scope:** the `<html>` stamps `src/lib/record/boot.ts` writes —
`hl-signed-<n>`, `hl-cat-<slug>-started|complete`, `hl-role-<id>` and the `data-hl-*` attributes.
Those are the **record's** vocabulary, not the design's, and renaming them would churn the boot
script, the store, the generator and 128 generated selectors for no design gain.

**Rule that follows:** `CLAUDE.md` — what "rebuilt" means, and the three mechanical tests of it.

### D30 · A surface with no mockup is derived from primitives, never invented — 2026-09-09

Eight routes have no mockup at all: `/legend/`, `/legend/specimen/`, `/team/`,
`/team/assignments/`, `/sign-in/`, `/sign-in/alias/`, `/join/`, `/auth/callback/`. The language names
no primitive for a form, a table or a stat tile.

**Considered:** stop M16 after the nine mockup-backed surfaces and wait for the author to draw the
other eight (highest fidelity, but four of them sit behind an auth flag that is off by default, and
the milestone could not finish); or defer them to M17 (which would leave part of the old token layer
alive beside the new one, so the eleven stylesheets could not all be deleted).

**Chosen:** rebuild them from primitives the mockups already specify — `card`, `tag`,
`button-primary`, `button-quiet`, `slab`, `bar-field` for an input, the group and item rows for a
list. Where one genuinely needs a shape the language does not have, **that one shape is a question
to the author, not a design decision.**

### D31 · Layout comes from the component mockup, colour from the shell — 2026-09-09

**Measured:** mockups `02` to `09` are on a different palette from `01-theme-T4-ground-G3-powder`.
Ground `#f7f8fa` against `#fdfbf7`, accent `#0b6e5f` against `#282864`, hairline `#e3e6eb` against
`#d8cbb4`, a different five-hue series, and no Avenir in the type stack. They say why in their own
prose: *"All three are shown in one neutral palette on purpose, so you are judging the structure and
not the colour."* They are layout studies.

So "indistinguishable from its mockup" had to be split before it could be an acceptance criterion at
all. Taken literally against `03-catalog.html` it would have put a green accent on a grey ground —
the mirror image of the mistake M16 exists to correct.

**Chosen:** **geometry, structure and class semantics come from the component mockup; colour, type
and every token come from the shell.** Two consequences were checked rather than assumed.
`04-module-layout.html` and `09-sidebar.html` contain no T4 variant at all, so PROGRESS.md's "T4's
own" resolves to the shell file itself — `01`'s `main > .col` *is* the ratified reading page and its
`details.arch` *is* the ratified rail. And `06-code-diagrams.html` proposes a slab
(`#0f131a/#cdd6e0/#262d38`) that is **not** the one the shell ships (`#1d1f27/#e7e3d8/#33363f`); the
shell wins, because it is the specification, and `06` contributes only its three diagram node roles.

### D32 · The three-weight line system is retired; the browser fact it guarded is not — 2026-09-09

The old design quantised three line weights after ISO 128 — `--stroke-hair` 1px, `--stroke-struct`
1.5px, `--stroke-cut` 2px — and two test files existed because **Chrome floors a border width to a
whole CSS pixel**, which deleted the middle one silently. The rule was that the struct weight had to
be *painted* rather than bordered.

The T4 language has no such system: it separates a hairline from a strong edge by **colour**, `line`
against `line-strong`, and every line it draws is one whole pixel. `--stroke-*` appears **0** times
in the language against 16 in the old `globals.css`. Keeping the rule would have meant asserting a
fact about a deleted design.

**Chosen:** re-express, don't delete. `tests/unit/stroke-weights.test.ts` now refuses **any
fractional pixel in any border or outline** across every shipped stylesheet — the same defect, in a
system with no stroke scale, and it would catch a 1.5px border reintroduced tomorrow. The browser
probe survives as the single test in `tests/e2e/stroke-weights.spec.ts`, because it is the premise
the unit rule rests on and it should be asked of the engine rather than quoted.

Three rules of `tests/unit/color/lokum.test.ts` were retired the same way, and **three of them were
measured false** against the specification: the five hues span L 0.315 to 0.657, so there is no
shared lightness; there is no half-chroma sibling to halve; and the primary *is* `category-2`, so
"20° clear of the accent" is 0° by design. See the docblock of
`tests/unit/color/category-hues.test.ts`.

### D33 · A semantic hue rides an edge; it never becomes a pale fill — 2026-09-09

The corpus turns `style X fill:#HEX` into four semantic diagram classes — `fault`, `verify`, `info`,
`caution` — styled from tokens, and the old design gave each a base, an ink and a pale wash: 12
tokens. **The language has `success` and `caution` and no pale tint anywhere.**

**Considered:** derive a wash per semantic by lightening each hue, which would also have solved the
catalog table's tinted level badge. **Rejected:** a tint scale exists nowhere in the mockup, so it
would have been the language growing a new dimension by derivation — the shape of the mistake that
produced Manrope and a re-hued category series.

**Chosen:** a figure is a dark slab and a node is a raised slab surface with a hairline, so the
semantic rides the node's **border** while the fill stays the slab's own. `verify` = `success`
`#2f8c86`, `caution` = `#b8873b`, `fault` = the clay `#a0503c`, `info` = the cobalt `#282864`. Four
hues, every hex already in the mockup, zero washes — and it is what DESIGN.md's Components section
already says a figure node is. Colour stays a second signal because the semantic class name remains
in the markup.

The same principle settled two other places without a second conversation: the catalog table's level
badge takes an edge rather than a tinted fill, and the exported RECORD OF WORK — which had a
half-chroma fill for a started subsystem — now takes the hue on an edge for `started` and as a fill
for `complete`.

### D34 · A measured accessibility floor outranks a transcribed value, once, and in writing — 2026-09-09

The mockup is the specification and it outranks every document. This is the one thing that outranks
the mockup, and it took the author's decision to establish.

**Measured:** the mockup sets `.c { color:#767c88 }` on a code comment, which is **3.92:1** on the
slab ground — under the 4.5:1 text floor. A code comment in a teaching corpus is *content*: it is
the line that explains the three below it. The retired design had already found this and shipped
`#8b91a0`; M15's transcription faithfully restored the mockup's value and **restored the defect with
it**, which is how this was caught — by re-pointing the contrast table at the new token layer, not
by reading either file.

**Considered:** keep the mockup's value and reclassify a comment as decorative, taking the 3:1
graphic floor. **Rejected:** it contradicts the project's own settled position, and the reader who
most needs the contrast is the one who loses it. Also considered: redraw the mockup, which keeps the
invariant perfectly but edits the specification.

**Chosen:** the language lifts the same hue to `#8b91a0`, measured **5.21:1**, and the deviation is
named in three places rather than left silent — `DESIGN.md` says which value and why,
`tests/unit/design/transcription.test.ts` carries a `DEVIATIONS` list that is itself checked for
staleness, and `tests/unit/color/contrast.test.ts` is what proves the replacement clears the floor.
The two files have to agree for either to pass. **The list has one entry, and adding a second is a
decision for the author, never a way past a red test.**

The same pass found the mockup italicises comments while §3.4 forbids mono italic — the shipped
syntax theme was already upright, so the transcribed `font-style: italic` was a contradiction rather
than a choice, and it is gone.

**Still open, and it is stage 1's:** `--color-line-strong` measures **2.00:1** on the ground, 2.07
raised, 1.50 on the hover fill. It is the edge the language gives an interactive control, and SC
1.4.11 asks 3:1 for anything required to identify a component. The author chose to answer it with the
shell's real controls in front of us rather than invent a token now. What is enforced meanwhile is
the promise DESIGN.md actually makes: `line-strong` is strictly stronger than `line` on every ground,
in both themes.

### D35 · A control is identified by its shape, not by its edge — an accepted risk — 2026-09-09

**Measured across the shell, all of them the mockup's own values faithfully transcribed:** the bar's
search field edge (white at 25% over cobalt) **2.19:1**, its fill **1.26:1**, the rail's fold button
bordered with `line` at **1.55:1**, and `line-strong` on the page ground **2.00:1**. SC 1.4.11 asks
3:1 for anything required to identify a user-interface component. Not one control in the language
clears it, and the pattern is systemic rather than a slip — it follows directly from a design whose
whole premise is that a surface is told apart by a hairline on a near-white ground.

**Considered:** two new tokens, one edge dark enough to clear 3:1 on `surface` and one light enough
to clear it on `bar`, which is what the retired design's `--color-line-control` did for the first
case. **Rejected by the author.** It meets the guideline everywhere, but it costs two colours the
mockup does not contain — a second and third named deviation, against D34's one — and it visibly
hardens every control on the page, which is the look this design deliberately avoids. Also
considered: redraw the mockup's `.srch`, `.ib` and `.fold` rules, which keeps the invariant perfectly
and stops stage 1 until the specification is edited.

**Chosen, and written down rather than discovered:** a control is identified by its **shape, its
label, its position and its cursor**, with the boundary as a supporting signal. The viewer who needs
more is served by `forced-colors: active`, where every hairline is replaced by a system colour and
which `tests/e2e/accessibility.spec.ts` already loads the site under.

**The cost is real and is not being hidden:** a low-vision viewer who is not using a forced-colour
mode gets a weaker control boundary than the guideline wants. That is the accepted risk, and the
mitigation is that no control anywhere depends on its edge alone.

**Rule that follows:** `specs/DESIGN.md`, Colors — the accepted risk, named. `line-strong` is still
required to be strictly stronger than `line` on every ground in both themes
(`tests/unit/color/contrast.test.ts`), because if the two ever met the language would have one line
weight while claiming two.

### D36 · LKM-01 leaves the bar and keeps every other job — 2026-09-09

The retired header carried the mascot as a live progress meter: six faces painted before first paint
by the record's boot script, correct in frame one with no hydration. **The mockup's bar has no
mascot.** Its brand is a 2×2 tile of glazed squares — three category hues and one square left as the
ground — and DESIGN.md is explicit that "it is a tile, not a logo". LKM-01 reaches 23 files.

**Considered:** paint the tile's four squares from the reader's progress, keeping a progress signal
in the bar on every page. **Rejected on arithmetic:** the course has five levels and the tile has
four cells, so one square per level is impossible without changing the mockup's geometry, and the
mockup's geometry is the specification. Also considered: retire LKM-01 altogether, which is the
smallest codebase and discards a drawing the project built deliberately — a product decision with no
way back, and not one an agent gets to take.

**Chosen:** the bar takes the mockup's static tile, and **no capability is lost**, because the
progress-meter job is already specified elsewhere by mockups the author chose — `05` variant C's
level rings on the home page and My progress, and `07` variant A's progress bars. LKM-01 survives as
the 404 drawing, the legend page's subject, the exported record's cover and the drafter's stamp, none
of which the bar was doing.

The breadcrumb leaves the bar in the same change, and that needs no decision: the mockup puts
`nav.crumb` inside the reading column, above the display heading. The retired header gave it a
second 32px row of its own.

### D37 · A progress count cannot be drawn on channel A, so the rail states the total — 2026-09-10

The mockup's rail prints `3/8` on each group: modules done over modules in the level. `09` variant 1
does the same. **Neither can be built.**

A done-of-total count is **reader state**, and it is on screen in frame one — so §12.2 forbids it
travelling on channel B, where it would arrive after the first paint and change under the reader.
And **CSS cannot count**, so channel A cannot draw it either: the pre-paint script can stamp
`hl-signed-<n>` on `<html>`, and no selector turns nineteen stamps into the numeral 3.

**Considered:** render the numerator on channel B anyway, since it is "only a number". Rejected —
that is the flicker the channel split exists to prevent, and a count that corrects itself after
paint is worse than a count that was never claimed. **Also considered:** pre-render one span per
possible count per level and have the generator reveal the right one, which is the only way CSS
could express it. Rejected on cost: five levels × up to eleven counts is fifty-five spans and
fifty-five generated rules to state something the discs already state.

**Chosen:** the count is the level's **total**, and progress is carried by the completion discs on
the rows — which *are* channel A, one generated rule per written module, correct in frame one.

**This is D23 one layer down.** That entry rejected the ring a mock drew for the same reason and
shipped a segmented meter: a meter is a shape CSS can reveal, and a number is not. The rule worth
carrying is the general one — **before transcribing a figure from a mockup, ask which channel could
draw it.** A mockup is a picture and has no channels.

**Rule that follows:** `specs/ARCHITECTURE.md` §12.2 is unchanged; what this adds is that a mockup
may specify something no channel can render, and the mockup does not win that argument.

### D38 · The design language names a thing once, and the generator follows it — 2026-09-10

M16 stage 0 renamed the language's prefix from `hl-` to `bz-` (**D29**) and renamed
`scripts/curriculum-css.mjs`'s prefix with it — but not its **names**. So for three commits the
generated sheet revealed `.bz-mod-mark` while the component emitted `.hl-mod-mark` and
`src/design/bazaar.css` defined `.bz-tick`: three vocabularies, no two of which agreed, and a
completion mark that could not appear. Nothing failed. The selector was well-formed, the markup was
well-formed, and channel A had simply been disconnected.

**Considered:** teach the language the generator's names, since the generator is the thing that is
hard to change. Rejected — `CLAUDE.md` makes the language the design vocabulary, and a generated
file is the easiest thing in the repository to regenerate.

**Chosen:** the language names it; everything else follows. `.bz-item` for a rail row, `.bz-tick`
for the completion disc, and the generator emits exactly those. `--bz-here` became `--bz-cat` in the
same pass, so there is now **one** name for "this element's category hue" rather than one for the
group's edge and another for the generated segment.

**Rule that follows:** a prefix rename is not a rename. When a name moves, the thing to grep for is
the *name*, and the check that would have caught this is the one M16 added anyway —
`tests/unit/design/styling-references.test.ts`, which now reads the surface stylesheets as well as
the markup and refuses any reference the language does not define.

### D39 · D31 becomes a rule a machine applies, not one a reader remembers — 2026-09-10

**The problem.** `02` to `09` are on a deliberately older cool-grey palette
with a green accent; `03` says so in its own copy: *"One neutral palette so you
judge the layout."* D31 settled that geometry comes from the component mockup
and colour from the shell — and then left that as a sentence in two documents,
which is exactly the shape of the failure this milestone exists to correct.
M9 to M14 had a design document that drifted from its mockup, and every
reviewer of every commit believed the document.

**Rejected: compare the catalog against `03` and tolerate the colour
differences.** The comparison would have reported thirty-odd differences on
every run, and a check whose normal output is thirty differences is a check
nobody reads. It is how a real difference gets buried.

**Rejected: leave the rule in prose and rely on the stage to honour it.** It is
what D31 already did, and stage 4 was the first stage where it could actually
bite.

**Chosen.** The harness knows which document specifies each role
(`REFERENCE_OF`), and one guard follows: **a role whose reference is not `01`
may carry no colour fact.** So `03` can only ever be compared on lengths, gaps,
radii and type steps, and the catalog's colour is held by the three guards that
need no mockup at all — the token resolver, the surface discipline rules and
the contrast suite, which recompute from the shipped stylesheet.

Two registries go with it and each entry must state a reason, because "there is
no reference for this" and "nobody checked" are otherwise indistinguishable:
`WITHOUT_REFERENCE` for a component no mockup draws (**D30**), and
`NARROW_DEVIATIONS` for a fact that stops being specified below the language's
own lower breakpoint. **A guard fails any narrow deviation that has stopped
deviating**, because an exemption kept after its difference was fixed is an
exemption that will hide the next one.

### D40 · A mockup's variant TITLE is part of its specification — 2026-09-10

**What happened.** `03`'s variant A is titled *"Cards, grouped under a level
heading"* and draws exactly that. The component was a flat list of every module
with the level printed on each card. Variant C is *"Five columns, one per
level"* with a progress track under each header; the component was a stack of
full-width bands. Both contained the same facts as the mockup and neither was
the component the mockup drew.

**Why it is worth a number.** This is D26's failure mode in miniature — a
surface that carries the new palette on the old structure — and it survived
into stage 4 because the previous milestone had read `03` for its *filters* and
never for its views. The mockup's own note is the argument: variant C exists to
show *"the whole shape of the course in one view"*, which a vertical stack
cannot be however many bands it has.

**Chosen.** Read the variant titles and notes as specification, not as
commentary. `03` also told us what NOT to build the same way: its own note
calls the table "the densest" because it does not group, which is why its
group-break row is refused.

### D41 · A diagram's strokes are content and take the graphic floor — 2026-09-10

**MEASURED.** Once the diagram palette moved onto the slab, the node and edge
strokes resolved to `slab-line-raised` at **1.80:1** against the slab ground.

**Rejected: treat it as the accepted risk D35 names.** D35 is about a
CONTROL's boundary — a field, a fold button — where the shape, the label, the
position and the cursor carry the identity and the edge only supports it. A
diagram has none of those: the stroke IS the drawing. Reading D35 as covering
it would have made an accepted risk into a general licence, which is precisely
what a named, bounded risk must not become.

**Chosen.** `slab-arrow`, which is the value this palette already has for a
line somebody has to follow — 3.47:1 on the frame and 3.09:1 on a node's own
fill, so the 3:1 graphic floor holds against both grounds a stroke can sit on.
No new colour, and the mockup's own vocabulary.

### D42 · A local theme override belongs in the language, not in a surface — 2026-09-10

**Two tests appeared to contradict each other and neither was wrong.**
`mermaid.spec.ts` requires a local palette override **on the figure** — it
reads a token off the figure and off `<html>` and demands they differ.
`slab-and-controls.test.ts` forbids **a surface stylesheet** from declaring any
`--color-*` token at all.

They are only in conflict if the override is put in a surface. It belongs in
`src/design/bazaar.css`, where both themes already live and where redeclaring a
token is a re-binding rather than a new colour.

**What the absence cost.** Between stage 0 and stage 6 every colour the diagram
config names was a page token while the frame was the dark slab, so **a diagram
was a near-white box inside a near-black one** on fifty-three figures. The one
test that could have said so was red, and its docblock blamed a file that never
carried the rule under any name — so the failure read as an unrelated bug for
six commits.

**Why the mechanism is worth keeping rather than replacing.** The obvious
alternative is to rewrite the diagram config to name `slab-` tokens directly.
It reads better and it was rejected: a diagram library's own class grammar
cannot hold a CSS function, so the colours have to arrive through the cascade
anyway, and the rebinding is what makes ONE rule re-theme every drawing with no
per-figure class and no re-render.

### D43 · A figure is capped at the measure and scrolls; nothing bleeds — 2026-09-10

**The open question the author was owed**, and it is answered from the
references rather than left hanging — with the reversal recorded so it stays
the author's.

`04` has a `.bleed` utility and uses it once, for a diagram *"allowed to bleed
slightly past the text on both sides"*. The ratified shell deliberately does
not carry one, and `01` draws no figure wider than its column.

**Chosen.** A figure is capped at the measure and scrolls inside its own box —
`04`'s three-part containment pattern generalised, since the corpus has tables
and slabs and not only flows. `data-hl-width`'s three values stay as the
renderer's CLASSIFICATION of a figure, which is what the facts strip counts and
what a later stage would need to widen one; the design spends nothing on them.

**What was replaced.** `--hl-measure`, `--hl-break-left` and
`--hl-break-right`, three custom properties that **nothing ever set and no
stylesheet ever read** — they existed in one docblock. The test that was meant
to hold them did not merely fail: it threw, because its anchor was emitted by
no component either.

Reversing this is one rule. `src/lib/figure/width.ts` still classifies against
the retired 656 / 920 / 1152 tracks, which the language no longer has.

### D44 · Below its own lower breakpoint, the bar may depart from the mockup — 2026-09-10

**MEASURED.** At 390px the bar's trailing icon controls ended at x=412 in a
390 viewport, so **every route on the site scrolled sideways** — against an
explicit M16 acceptance criterion. `01` has two media queries, at 1180 and 880,
and neither touches the bar: it is a desktop drawing and states 22px of inline
padding at every width.

Three alternatives, and DESIGN.md forbids the first two by name:

- **a hamburger** — "nothing reflows into a hamburger";
- **letting the bar scroll sideways inside itself** — "wide content scrolls
  inside its own box" would seem to license it, but `overflow` creates a
  clipping context and the bar's own dropdown is absolutely positioned inside
  it, so the menu would be clipped. Measured on paper before it was written;
- **hiding the wordmark's text below the breakpoint** — it keeps every declared
  value and hides a label, which is a bigger change than it looks and is the
  author's to make.

**Chosen.** The gap and the inline padding give way below `rail-at`, which is
where DESIGN.md already says the layout changes. Spacing only: no control is
hidden and no colour moves. Above that breakpoint every value is the mockup's
own — a `clamp` was tried first and rejected because it made the bar stop
matching at 1024 too, where the mockup is perfectly happy.

The departure is recorded in `NARROW_DEVIATIONS` with its width and its reason,
so the comparison is narrowed by something somebody wrote down.

### D45 · Where a retired blanket rule meets the language's ink weights, the language wins — 2026-09-10

**The case.** §10.4 said no text in the pager may sit below a 4.5:1 floor.
`01` sets the pager's direction label in `faint`, and DESIGN.md is explicit
that `on-surface-faint` *"does not meet a 4.5:1 text floor on this ground"* and
names its legitimate uses — one of which is, in as many words, "a label above a
control". MEASURED: `Next module` lands at **3.30:1**.

**Rejected: lift the label and record a second `DEVIATIONS` entry.** It would
clear the floor and cost nothing visible. It is also the one thing DESIGN.md
forbids doing unilaterally: that list says adding an entry is the author's
decision and **never a way past a red test**. D34 is the precedent for how it
would be written if the author wants it.

**Chosen.** Assert what the language actually promises: every DESTINATION in
the pager clears 4.5:1 — including the end-of-course tile, whose only sentence
moved out of the label slot into the destination slot for exactly this reason —
and the label is asserted to be the language's own faint token and nothing
quieter still. The remaining tension is written down in the test and in
`CLAUDE.md` rather than resolved by whoever was passing.

The same reasoning settled three smaller collisions in the same sitting, each
of which had the retired drawing set on one side and the language on the other:
the table's column headers are sentence case and not `COMPLETION`; a 14px
completion square takes the smallest radius step and not §5.9's "zero radius,
everywhere"; and a draft row recedes in its TITLE, as `03` draws it, rather
than in caution ink on its number, which measured 3.09:1.

### D46 · Channel A can carry a NUMBER, and that is what makes a dial possible — 2026-09-10

`CategoryMeter`'s docblock rules out a proportional meter before first paint:
*"a bar's length is a computed number and a computed number cannot reach CSS on
channel A."* It is why that meter draws one segment per module — no arithmetic,
one selector per module, correct in frame one.

The claim is **true of CSS and not of the channel.** CSS cannot count. The
channel is a blocking script in `<head>`, and it had already counted: the loop
that decides `hl-cat-<slug>-started` against `-complete` holds both the
numerator and the embedded total three lines above the place a percentage would
be needed.

So the boot script sets one custom property per level, `--bz-done-<slug>`, and
a `conic-gradient` substitutes it. That is what let `05`-C's ring exist at all:
a gradient stop is a length, so a ring showing how far a reader has come needs
a number in the cascade in frame one, and drawing it after mount would put a
frame-one-visible mark on the channel §12.2 forbids for exactly that.

**Rejected: doing it on channel B.** It is one line of React and it is wrong in
the way this project has already paid for — `home.spec.ts` asserts completions
are ticked in frame one with no JavaScript at all, and a ring that animates in
after hydration is a ring that is empty in the screenshot.

**Rejected: keeping the segments and calling it done.** They are still there and
still the right answer on the listing pages, where the reading is *which*
modules rather than how many. But the author chose `05`-C for the overviews, and
"the mockup is the specification" does not have an exception for "unless the
architecture would need one line".

Two consequences worth knowing. `--bz-done` is bound per level in
`category.css`, beside `--bz-cat`, because CSS cannot build a property name out
of an attribute — the same reason the hue is bound there. And `stamp.ts` grew
the same derivation for after mount, cross-tested against the script in both
suites, because the failure mode is a dial that is right in frame one and wrong
the moment the reader completes something.

### D47 · The mascot leaves the site header, and its state moves to the dial — 2026-09-10

Three tests read `header svg` and asserted things about LKM-01: its per-level
faces at the structural stroke weight, its hatch on a completed level, and its
markup being byte-identical across states. All three were red or measuring the
wrong element, and the reason is that **`01` specifies the brand as a tile** —
four glazed squares from the same series, one left as an outline — and stage 1
built that. `features.spec.ts` was asserting real geometry about the tile and
calling it the mascot.

So the mark moved rather than being lost: 132px in the drafter block on
`/profile/`, 96px on `/legend/`, exploded on the 404. What it stopped carrying
is the reader's per-level progress, which is now the dial's job (**D46**) and
the rail's.

**Rejected: putting the mascot back in the header.** The mockup is the
specification and it draws a tile. A mark whose faces report progress also puts
a reading in the one place on every page that is not about the page, which is
the argument the bar's own sub-palette exists to keep.

The two state tests were re-pointed rather than retired: the faces still carry
`hl-cat-<slug>-started` and `-complete`, which is a real capability, and they
are located through their own faces rather than through a wrapper class so the
anchor survives the next rename.

### D48 · An enumerated state keeps its spelling; everything else stops shouting — 2026-09-10

The interface printed a great deal of text in capitals. Almost none of it was
written that way: the classes carrying it applied `text-transform: uppercase`,
and where a string was pre-cased it was to keep the source in step with the
rule. The design language has no uppercase anywhere — `01:136-137` writes
`text-transform: none` explicitly on the one element that would have carried
it — so with the classes gone the page was left shouting in some places and not
others. `0 of 43 traces` sat next to `2 OF 9 EARNED` on the same page.

**The line, applied throughout:** an enumerated record state keeps its
spelling, because those are values a reader matches against each other and the
copy register's rule is that a status has exactly one — `READY`, `PLANNED`,
`MATCHED`, `UNSIGNED`. **A label, a caption, a sentence, or a count that
borrows a status word does not.** `19 ready` is a count and `READY` is a cell.

Its sharpest consequence is a test. §16.4.1 says a register row states a count,
`--`, or a named state and never a sentence of prose — and that rule was
enforced BY CASING, because capitals were what told the last two apart. In
sentence case they are the same shape. So the row states which it is in
`data-reading` and the test asks by that: **ask by location, not by what the
text says**, which is the third of the four vacuity modes this project has
already been bitten by.

### D49 · `fault` is a graphic token, and a destructive control says so in words — 2026-09-10

`07:88-89` draws the destructive button as a colour-only modifier: tinted text,
a tinted hairline, a normal fill. Building it needed a name for the hue, because
`--color-category-5` holds that value and spending a category hue on a button is
what `surface-stylesheets.test.ts` forbids — a group's identity is not a
control's.

So `--color-fault` completes `success` and `caution`. **MEASURED: 5.48:1 on
`surface` in light and 3.02:1 on `surface-raised` in dark.** It clears a 3:1
graphical floor in both themes and a 4.5:1 text floor in only one, and a floor
that holds in one theme is not a floor. Neither mockup ever sets this clay as
type either, which is the same finding from the other direction: `01` spends it
on the focus ring and the band, both shapes.

**So the meaning is carried by the word, then the edge, then the hue, in that
order, and the label stays `on-surface`.** Which is also §13.1.3 applied
properly: "Erase everything" is the signal and the colour agrees with it.

Three names now share one hex — a group's identity, a focus ring, a fault — and
that is not a smell: the language already accepted the split when `focus` was
named rather than spending `category-5` on a ring.

### D50 · A second rendering of one fact is a duplication, even when a mockup draws it — 2026-09-10

`07`-A's progress block is five per-level rails. Stage 7 had already put
`05`-C's dials on the same page for the same fact, and both mockups are
ratified for their own surfaces.

**They are not both built.** `07`'s own argument against its variant C is the
reason: *"Per-level progress is already in the sidebar and the catalog, on every
page. Repeating it on a page of its own is the duplication that makes the
dashboard feel pointless."* A mockup that argues against duplication cannot be
read as requiring it.

So `/profile/` takes `07`'s ORDER — continue, then progress, then settings — and
`05`-C's rendering of the middle. There is no `progressRow` fidelity role, and
that absence is recorded beside the roles that exist, because an absent role
looks identical to a forgotten one.

### D51 · Two consumers means a class moves into the language — 2026-09-10

Stage 4 authored `.bz-track` in `catalog.css` when the board column was its only
consumer, and `.bz-table*` there too. By stage 10 the rail had four consumers and
the table had four, and a class defined in one surface stylesheet and used by
another is precisely what the surface discipline exists to prevent: the second
surface depends on the first invisibly, and the two drift on the first edit to
either.

**The rule, applied four times now** — `--bz-cat` out of `rail.css` in stage 5,
`.bz-track` and `.bz-table*` into the language in stages 7 and 10, and the panel
and the field authored there directly once four surfaces were known to need
them: **when a second surface needs it, it moves up.** What stays behind is the
part that is one surface's subject matter rather than any surface's shape — the
catalog's topics cell, its status cell, its four sign-off squares.

The counterpart is a guard, because the promotion is invisible otherwise: a
class a component emits that no stylesheet answers to. It found eight, and it is
the third corner of the same failure `styling-references.test.ts` and
`category-css.test.ts` cover from the other two sides.

### D52 · The closing conditions were unsound, and a name is not a design — 2026-09-10

M16's own definition of done had three mechanical tests. Two were wrong, and
both were only discovered by trying to write them.

**"No `hl-` class in any `className`" had no test, and the meter everybody
quoted did not measure it.** Of 1,045 occurrences, 158 were `data-hl-*`
attribute names and the rest included the three `<html>` stamp families — all
mechanism, all permanent. That number can never reach zero, and driving it there
would mean renaming the pre-paint script's stamps, the mark picker's form
control name, or the storage keys, which are the reader's own data. Scoped to a
class it is 0; the three families that stay are checked against `stamp.ts`'s own
pattern rather than merely excluded.

**"No stylesheet in `src/app/` but the entry point and the generated sheet" is
the opposite of M16's method.** Every stage authors one surface stylesheet in
exactly that directory. A first attempt at the test listed the eleven retired
stylesheets by name and went red on `home.css`, which stage 9 had just
re-authored from `08` — and `prose.css` and `rail.css` are two more.
`globals.css` states the real rule: *a rule from the old set earns its place
back only by being re-derived from a mockup.* **A name is not a design; 386
class selectors were.** So the condition is about the vocabulary: no surface
declares a rule for a retired class.

### D53 · An emoji is not this design's icon, and the tile it sits in survives the swap — 2026-09-10

`08:179-182` draws the four claims on the home page with literal emoji — a
writing hand, a speech balloon, a ruler, a rising chart — in a 28px tinted tile.

They are replaced by four inline SVGs on a 16-unit viewBox with
`stroke="currentColor"`, which is the idiom `src/` already used in twenty places
and no emoji. Three reasons, and only the first is taste: an emoji renders in
whatever face the reader's platform ships, at a size nothing here chose, and
says something slightly different on each one; `01:172-178` records why a shape
with a fill beats a hairline glyph where meaning depends on it; and the
completion mark's own reasoning applies — a glyph is not a shape you can rely on
being drawn.

What was kept is what each one MEANT rather than its outline: a nib, a pair of
quotes, a rule with two ticks, a rising line. And the tile survived unchanged,
because it was always sized for a glyph — which is the useful general point: a
container sized for its content's box rather than for its content survives the
content being replaced.

### D54 · The focus ring is a hook, not a colour — and a floor checked on one ground is not checked — 2026-09-10

A review of the finished milestone asked one question nothing in the suite had
asked: what does the focus ring actually measure on the surface it appears on
most? MEASURED, from the shipped language, clay (`--color-focus`) against every
ground the ring is drawn on:

| ground | light | dark |
| --- | --- | --- |
| `surface` | 5.48 | 3.42 |
| `surface-raised` | 5.66 | 3.02 |
| **`bar`** | **2.35** | **2.77** |
| **`slab-surface`** | **2.90** | 3.42 |
| **`slab-surface-raised`** | **2.56** | 3.02 |

SC 1.4.11 wants 3:1. So the ring cleared the floor on the two page grounds and
failed on the cobalt bar in both themes and on the slab's two surfaces in light
— **and the bar holds the first controls in the tab order on every route**, so
the ring a keyboard reader met first, everywhere, was the weakest one on the
site. DESIGN.md said the opposite in as many words: that the clay was chosen so
the ring works "against cobalt chrome, against white cards and against the dark
slab without changing per context". That sentence is now corrected rather than
softened, because it was wrong and somebody would have relied on it.

**Three ways to fix it, and the third is the only one that is not a trade.**

1. **Lift the clay** until it clears 3:1 on cobalt. Rejected: cobalt is dark, so
   clearing it means a much lighter clay, which then has to keep clearing the
   two page grounds it currently clears at 5.48 and 5.66 — the two constraints
   pull opposite ways, and the value being changed is the mockup's.
2. **A second ring token for dark chrome**, chosen and measured. Rejected as
   redundant: the sub-palettes already declare an ink for exactly this, and a
   new token would be a second answer to a question already answered.
3. **Make the ring a hook and let each ground bind it.** `--bz-ring` defaults to
   `--color-focus`, and the two dark grounds rebind it to their own
   sub-palette's ink: the bar to `on-bar` (**13.31**), the slab and the figure
   to `slab-on-surface` (**12.82** on `slab-surface`, **11.31** raised).

Nothing is invented in the third: each ground gives the ring the ink it already
uses for its own text, which is what a sub-palette is *for*. It travels by
inheritance, so a nested control needs no second selector, and the ring stays
one declaration in the language rather than one per surface. **D34** decides the
conflict with the transcription: a measured accessibility floor outranks a
transcribed value.

**The lesson is not the fix; it is why nothing caught it.** The contrast suite
has a `graphical('focus')` case and it passed, because it walks `RESTING` — the
two grounds a reader *reads* on. The ring appears on four. **A floor checked on
one ground is not checked**, which is a rule this project had already written
down, and it shipped anyway.

And the first replacement guard was worse than none: three more rows in the
pairs table — `on-bar` against `bar`, `slab-on-surface` against
`slab-surface` — which pass whatever the ring is bound to, because they assert
something about two tokens and nothing about the ring. That is counting a proxy
for the property, written while fixing an accessibility bug. What is there now
resolves the `--bz-ring` declarations out of the language, maps each selector to
the ground it applies to, and measures what the ring will actually be. Both
directions are asserted, because two empty sets agree about everything.

### D55 · A mockup that draws one state cannot dictate the copy for a state it does not draw — 2026-09-10

The same review found `/profile/`'s continue hero shipping with **no gate at
all**: the prerendered page offered "Continue where you left off → LLM
Fundamentals" to every reader, a fresh browser included, and with the bundle
blocked it never corrected. Both the component and its call site claimed
otherwise. `nextUnsigned(EMPTY_RECORD, facts)` returns the FIRST drawn module,
not `null`, so "renders nothing until the store has answered" was never true —
**a comment asserting the opposite of the code is worse than no comment**, and
this one had been read as a gate by whoever wrote the call site.

The home page has had this rule since stage 9. `/profile/` was built in stage 8
and never got it. So the fix is the split the home page already uses, and it is
forced rather than chosen: the BOX is gated on channel A by `data-hl-record`,
because a reader with no record must not see the frame; the CONTENT is gated on
channel B, because a module's title is text and channel A stamps classes. That
is the whole of what each channel can do.

**What was a decision is the copy.** `07:123` reads "Continue where you left
off", and §15.11 counts a reader as carrying a record if they have chosen an
alias or a role — neither of which is something they left off. Transcribing the
mockup's one string would have told a reader who has completed nothing to
continue from where they were. So the eyebrow branches: "Continue where you left
off" once something is signed, "Start with" otherwise. **The mockup is the
specification for what it draws, and it draws one state; a state it does not
draw is not specified by it, and copying its label into that state is a
transcription error rather than fidelity.**

### D56 · An exemption's premise is a claim about the code, so it belongs in a check — 2026-09-10

The contrast suite exempts `surface-sunken` from the 4.5:1 text floor, and the
exemption is right: the sand fill is the hover and the pressed state, and
measuring every ink against a fill that appears for 150ms under a cursor would
fail the palette for a state nobody reads on.

**Its premise was false for three rules and the suite could not tell.**
`.bz-table thead th`, `.bz-tablefig thead th` and the planned catalog card all
rested `on-surface-muted` on that fill — MEASURED **4.21:1** in light, at
12.5px/600, which is not large text. That is the catalog register, both level
listings, the org roster, the sign-in doors and every table in the corpus: every
column label in the product. On the two page grounds the same pair measures 5.62
and 5.81, which is why it looked safe everywhere anybody had checked.

**Two ways to fix it, and the rejected one is instructive.** Lifting
`on-surface-muted` until it clears 4.5:1 on sand would fix all three at once —
and `01:457` documents that value as "Secondary text #6a6558 5.62:1", so it is
transcribed, and changing it needs **D34** and the author. The three sites are
ours: no mockup specifies a table header's colour pair at all — `01` draws a
table with no `thead`, and `03`, which draws one, may supply geometry only
(D31). So the pairing was never a transcription, and the fix costs nothing:
full ink, 11.24:1, with the quiet coming from size and weight. The language
already does exactly this on that fill, at `.bz-group[data-here] > summary`.

**What the exemption becomes is the point.** An exemption whose premise is a
claim about the STYLESHEETS — "nothing rests text there" — is a promise until
something reads the stylesheets. So a guard now does: for every rule declaring
the sunken fill, any `color` in the same block must clear the floor on it.

And what it cannot see is written down rather than implied. The catalog card set
only the fill; its three muted descendants were declared sixty lines away, and
no static reading of one block can pair them. **Ink that arrives by inheritance
needs the cascade, which means a browser** — that is `colour-not-alone.spec.ts`'s
layer. The one known case is asserted by name. A guard that quietly covers less
than its title claims is the failure this milestone met four times.

### D57 · The touch floor has two shapes, and one control cannot have both axes — 2026-09-10

§10.4 asks for 44px below 768px. **It was stated in exactly one place in the
whole project** — a `min-height` on the form field — while a test named "every
control reaches the §10.4 touch floor below 768px" visited one module sheet and
located three classes, one of which (`.bz-btn bz-btn-quiet`) was a descendant
selector for an element type that does not exist and matched nothing, ever. The
other two already had a hit area.

MEASURED at 390px: the completion toggle **17 x 17**, the bar's two icons 33,
eleven filter chips and three view buttons 33, every button 39.

**Which shape of answer is correct is decided by the neighbours, not by taste.**
A control in a wrapping row GROWS — nothing beside it collides with a taller
box. A control in a fixed strip or a dense row keeps its painted size and takes
an invisible `::after`, the idiom `prose.css` established. The bar's icons take
the second because growing them grows the bar; the buttons and chips take the
first because they can.

**The completion toggle is the one place the floor cannot be had in both axes,
and the trade is the entry.** A 44px-wide target centred on a 17px disc reaches
13.5px past it, and 8px away is the module's title link — so it would cover the
link's leading edge and **a tap meant for the module would toggle its
completion**. Stealing a tap from a navigation control is worse than a narrow
target, so the target stops at the gap: 17 x 17 becomes 25 x 44, with the row
grown to 44 so the vertical axis is the full row and two rows cannot overlap.
A true 44 x 44 needs the title to start 27px further right at 390px, which is a
layout decision and therefore the author's, not a defect fix.

The rejected alternative was to grow the painted disc. It is the mockup's shape
and growing it on phones would make the mark the loudest thing in a list of
titles, which inverts what the row is about.

The guard now takes horizontal exemptions from a registry where each carries a
reason and a width, and a stale entry fails — the same shape as
`NARROW_DEVIATIONS`, for the same reason: **the deletion of a dead entry is how
this test lost its coverage in the first place.** `.hl-icon-btn` was removed
from the list for being dead and `.bz-bar-icon`, its successor, was never put in
its place.

### D58 · The generated sheet states which module, never what it looks like — 2026-09-10

`lokum-modules.css` revealed a signed-off path step with `display: inline` and
`color: var(--color-accent-ink)` — a token of the retired palette that **no
theme has ever declared**, with the comment still citing theme "T2". An
undeclared custom property is invalid at computed-value time, so `color` fell to
`unset`, which for an inherited property means `inherit`: the word took the
step's body ink instead of the teal `progress.css` gives it.

**Repointing the token was the obvious fix and it is the wrong one.** The
generated sheet exists because channel A cannot loop: its job is to say WHICH
module a rule applies to. What the revealed thing looks like belongs to the
surface stylesheet that draws it — which is already how group D is divided, and
the base rule for this very element already sets the colour. So the declaration
is deleted, not corrected, and the division is now stated in the generator.

**Why nothing caught it is the more useful half.** The file is excluded by name
from all three guards that read `var()`s, and each exclusion is correct: it is
generated, and it is allowed to state colours and states a surface may not.
**"Not held to the surface discipline" was read as "not read at all"** — for the
whole milestone. The guard for it lives in `category-css.test.ts`, which owns
the generated sheet: every `var()` in it resolves against the language or a
surface. An exclusion is a statement about which RULES apply, never about
whether a file is looked at.

### D59 · A fact about one element cannot see a relationship between two — 2026-09-11

The author reported the interface as "still full of errors" the day after M16
closed with 2,154 unit tests and 1,083 browser tests green, and named the
method the project was missing: **take a screenshot of each page and look at
it.** One screenshot of the home page carried four defects. A fifth and a
sixth were underneath them.

**Why the strongest check in the project could not see any of them.** The
fidelity harness asks a named element for a named property and compares it to
the same element in the mockup. It asked the bar's navigation for its computed
`display`, got `flex`, and agreed with `01` exactly — while the navigation
rendered as a vertical stack on every route. `01:81` puts the row on
`.mainnav`, whose children are the items; the app wraps them in a
`<ul role="list">`, which is better markup, and the rule then laid out one list
child. **Every fact was right and the picture was wrong**, because the defect
was not in any element: it was in the relationship between three of them.

That is a whole class, and the five others found in the same sitting are all in
it — a `<td>` given `display: flex` (correct declaration, wrong element, so the
cell stopped sharing its row's height), a sticky offset measured against a
scroller instead of the viewport, a trail centred in a column its page did not
share, and an ordinal painted against its title because the gap was declared
one level above the two things it was meant to separate.

**Three ways to catch it, and only one of them holds.**

1. **Screenshot comparison against a stored baseline.** Rejected. The baseline
   has to come from somewhere, and the only somewhere here is a build somebody
   already declared correct — which is exactly how five milestones shipped the
   wrong design. It also fails on a font hint or an antialiasing change, so the
   failures are mostly noise, and noise is what teaches people to ignore a
   suite.
2. **An agent looking at each page.** This is what found them, and it is
   necessary but not repeatable: it costs a session, it cannot run in CI, and
   what it notices depends on what it thought to look at. It belongs in the
   method, not in the gate.
3. **Geometric invariants over relationships.** What went in:
   `tests/e2e/layout.spec.ts`, seven rules over every route. A row is not
   declared above the things it lays out; a table cell is still a table cell; a
   cell's border reaches its own row; a sticky offset does not resolve against a
   scroller; nothing in the bar paints outside the bar; a trail starts where
   its page starts; a number is not painted against a word.

**The line that keeps file 3 honest: every invariant in it is wrong in ANY
design.** None of them says what the interface should look like — that is the
mockup's job and `fidelity.spec.ts`'s. They say that the page is put together
the way its own rules claim. That is why they can be asserted over a route
nobody has drawn, and why a new route gets them for free.

Mutation-proven as a set, which is the only honest way to prove a suite rather
than a test: with all five fixes reverted, **27 of the 30 cases go red**, each
naming its own defect, including "the trail starts at 313px and the page at
49px".

**And the second finding is the one to remember: the navigation defect was
hiding four more.** A 120px vertical stack is narrow, so the bar appeared to
fit a phone. Fixing it exposed that the bar overflows a 390px viewport, that
the closed dropdown is laid out 53.6px past the edge, that the wordmark folds
to three lines, and that one pixel of the row's sub-pixel arithmetic rounds up
into a sideways scroll. **A defect that makes a thing smaller than it should be
conceals every constraint that thing would otherwise break**, so fixing one
layout bug is expected to reveal others rather than to finish the work.

### D60 · The author overrules the mockup, and a heading is not prose — 2026-09-11

`08:44` caps the home page's display line at `20ch`, and M16 stage 9 transcribed
it faithfully. **The author asked twice for the first row to span the whole
width**, the second time after I had offered him three options instead of doing
it. Offering a decision back to somebody who has already made it is not
diligence.

**The measurement that explains why the transcription looked wrong on the page.**
`ch` resolves against the element's own face: 20ch is 640px in the mockup's 46px
system sans and **529px in this language's 38px face**. And the mockup hides the
consequence, because `08` draws its own page 1052px wide, where a 640px heading
fills most of a row. The product's page is 1342px at 1440, so the same rule left
**two thirds of the row empty**. A transcribed value can be correct and still be
wrong once it is placed in a container the mockup never drew.

**The lede does not follow the heading, and that is the part that took a
decision rather than an instruction.** He asked for the first row. A heading is
one line of display type, and its length is a composition; a lede is prose, and
prose has a readable line length whatever is around it — which is exactly why
`01:182` gives the reading column a measure at all. So the heading takes the
row and the lede keeps `--layout-measure`. They had been the same kind of thing
(`20ch` and `56ch`, two caps on one block) and they are not.

**The order of authority, now written down in DESIGN.md because two entries
could be read as a precedent by the next agent:** the mockup outranks the design
document; a measured accessibility floor outranks the mockup (**D34**); the
author outranks all three. A third `DEVIATIONS` entry is still his to add and
not an agent's.

### D61 · The interface talks; it does not explain itself — 2026-09-11

The author, in the plainest terms he has used: *"I TOLD YOU THOUSAND TIME WE
HATE TEXT !!! NOT EXPLANATION !!! UI ITSELF SHOULD TALK !!!"* — and separately,
*"I TOLD YOU I WANT DRY, FAMILIAR ENGLISH, AS IF THEY ARE ALL BEGINNER ENGLISH
SPEAKERS"*. Eleven blocks of copy came off the product in one pass.

**What they had in common is worth more than the list.** Not one of them was
untrue, and not one was badly written. Every one of them said in a sentence
something the page was showing three inches away:

| Removed | What already said it |
| --- | --- |
| Five paragraphs opening the home page | The level cards below, each with its own count |
| `8 modules · 7 ready`, `1 module planned` on a level card | The dial on the same card, reading `0/8` |
| `19 of 33 modules written` in the facts strip | The same level cards |
| `Keeping your place` — three rows on names, aliases and accounts | Nothing: it explained a choice nobody had been asked to make |
| `Overview — the shape of the course, level by level` | The toggle above it, which names Overview and marks it showing |
| The catalog's and the progress page's opening paragraphs | The controls and the labelled sections below them |
| `Reading time is what the completed modules declare` | A footnote under the number it hedged |

**The rule that came out of it is now MANIFESTO rule 16**, and the test is one
question: *does the page already show this?* If a control, a mark, a count or a
heading says it, the sentence is not information. A caption under a picture of
the same thing is noise.

**The method matters as much as the rule: keep the FACT, drop the sentence.**
Every removal above had a carrier already on screen — a dial's denominator, a
dashed mark on a planned row, a rail's fill. Where a fact lived ONLY in the
prose it moved rather than died, and both moves are the interesting ones:

- the catalog's rail was `aria-hidden` **because** it restated the sentence
  beside it, which was right — two statements of one fact is worse than one. With
  the sentence gone it became the only carrier, so it took `role="img"` and a
  name: a screen reader is told `8 of 8 written` and nothing is printed;
- the view heading kept its `id`, because `aria-labelledby` still points at it,
  and took the `.bz-said` clipping. It is in the accessibility tree and off the
  screen.

**Removing copy removes carriers, and a carrier is not the same thing as a
sentence.** That is the trap in obeying this rule carelessly.

**Five browser tests were re-expressed rather than deleted**, which is this
project's standing answer when a claim outlives its wording. "Every number on
the page is derived from the modules it is printed beside" was proven by summing
the level cards' count lines against the facts strip; both are gone, so it is
proven now by summing the dials' denominators against the module rows — a
different pair of sources for the same claim. And the test that asserted the
identity strip was visible now asserts what the strip existed to demonstrate,
which is strictly stronger: **the front door carries no input and no sign-in
link at all.**

**What replaced the home lede came from the project's own voice** rather than
being written fresh: three sentences out of `README.md`'s "Why This Is
Valuable" — rule 1 (a human writes it), rule 4 (five to ten minutes), rule 5
(pictures do the work) — in rule 3's plain language, for the audience
`MANIFESTO.md` §4 names: people new to AI engineering, reading in a second
language. *(The minute figure in it is wrong and M18 corrects it at its source
as well as on the page.)*

### D62 · A level is an address, so the chip that chooses one is a link — 2026-09-11

M17 folded `/courses/` and `/courses/<level>/` into the catalog. The brief
opened with one decision and it was the author's: **how a preselected level
reaches a filter that lives in `useState`.** Two shapes were costed.

1. **A route per level, prerendered.** Five static pages, one component, the
   filter chosen at build time. Right in frame one with no script, and a level
   becomes a URL somebody can send to somebody else. Costs five HTML files and
   a `generateStaticParams`.
2. **One route and a parameter**, `?level=expert`, read by `boot.ts` before
   first paint. One page — and the first time channel A would read the URL
   rather than the record, which is new mechanism in the most load-bearing
   script in the codebase. With scripting off the parameter does nothing.

**Taken: 1**, which was the recommendation. It is the only one that keeps the
no-JavaScript guarantee the rest of this interface holds to.

**And then the shape paid for itself in a way neither option had claimed.**
With five real addresses, the level chips stopped needing to be buttons: they
are `<Link>`s carrying `aria-current="page"`, and **the one control on this site
that did nothing without JavaScript now works without it.** That was not in the
brief. It came out of asking what the chips should be once the pages existed,
and it is the argument that settles the shape rather than the file count:

- with buttons, the five new URLs would have been reachable only from the
  navbar's dropdown. Pressing `Expert` on `/sheets/` would have given the reader
  Expert with the URL still saying `/sheets/` — two ways to reach one view, one
  of them not addressable, which is the exact defect M17 exists to remove, put
  back one level down;
- the level group is `<nav aria-label="Filter by level">` and the state group
  stays `role="group"` with `aria-pressed`. **That split is the real finding.**
  They looked like one row of eleven chips and they are two kinds of control: a
  level is a fact about the course and can be an address; `Completed` is a fact
  about the reader, which no prerendered address can hold (§12.2). Anything
  keyed on the record has to stay a button, and anything keyed on the corpus
  can be a link.

**What it costs, stated rather than discovered.** The state filter does not
survive a level change, because changing level is a page load and a prerendered
page has never met the reader. The arriving page opens at `all` — which is what
every page on this site opens at, for the same reason — so the cost is one
selection, and the alternative was a filter that no URL could describe.

Two things had to move with it, and neither was in the brief:

- **`categoryPathOf` in `keys.ts`.** `g c` jumps to "the level you are inside",
  and the level now lives under two prefixes: `/sheets/<level>/` is the level's
  page and `/courses/<level>/<module>/` is a module in it. It reads the segment
  from either and always lands on the catalog entry, so the shortcut does not
  spend a press on a redirect.
- **`sheetLabelFor` in `route-labels.ts`.** Without a `/sheets/<level>/` branch
  a level page falls through the `segments.length > 1` guard and prints no
  footer label at all. `site-footer.spec.ts` is what says so.

**The module route did not move and that was a condition, not a result.** A
module is still `/courses/<level>/<module>/`. The two prefixes no longer share a
meaning, which reads oddly for about a minute and is much cheaper than breaking
every bookmark a reader has for a change to a listing they did not ask about.

### D63 · Dropping the STATUS column, and what a planned row says instead — 2026-09-11

The author: *"if something is not ready it is not clickable by default and user
can understand it already."* The column went. **The premise did not survive
contact with the code and the column went anyway**, which is worth recording
because the two halves come apart:

- a planned module **has a page** — the A4 anatomy, which prints its schedule of
  parts — so the row IS clickable, and making it otherwise would delete a
  capability rather than remove a decoration. The link stayed;
- §13.1.3 requires a row to state its own state **without colour**, and
  `READY` / `PLANNED` in that column was the carrier two specs measured.

So the column could only go once something else carried it, and the answer was
already on the row and had never been counted: a planned row prints `—` in
`Length` and `—` in `Sources`, and its completion cell holds **one dashed
square** where a written module holds three or four solid ones. An em dash is
typographic content and a border style is not a colour — both survive
`forced-colors: active` exactly as they are. The ISO 128 hidden line down the
`#` cell is a third.

**The word left the screen and stayed in the accessibility tree** (D61's
method): `.bz-said` inside the row's own header, outside its link, so a screen
reader hears `PLANNED` as part of the row and a list of links still reads the
module's name and nothing else.

**One thing the brief's own deliverable had backwards.** It said the catalog's
table should carry `Topics` *instead of* `Level`, because `SheetIndex` computes
them as alternatives. On the flat catalog that would have left the level carried
by the hue on a row's leading edge **alone**, which is the rule the same
document spends a paragraph protecting. The table carries both now, and a level
page — whose heading says the level once instead of eight times — carries only
the topics.

### D64 · A number from outside the repository, and where it is allowed to come from — 2026-09-12

The author asked the bar to carry GitHub's mark with a yellow star and **the
star count**. That number is the one shape `derive-never-restate` has no answer
for: the rule says derive a fact from the corpus at build time rather than
typing it into `src/`, and there is nothing in this tree to count. Three ways
were costed:

1. **Fetched at build time**, baked into the export. Honest, and it makes the
   build need the network — CI included — and the number is as old as the last
   deploy.
2. **Fetched in the browser.** Always current, and a third-party request on
   every page load from a site whose README promises "no network call while you
   read". That promise is about the reader's record rather than about assets,
   and a star counter would be the first thing to test it.
3. **Typed into `src/lib/site.ts`.** One line, and a number in `src/` that
   nobody will ever update — exactly what derive-never-restate exists to refuse.

**Taken: 1, with a committed answer — and the build does not run the fetch.**
`scripts/github-stars.mjs` writes `src/lib/github-stars.json` when somebody runs
it; `npm run build` reads that file and never reaches the network. So the number
is never typed, the build works on a plane and in a runner with no egress, and
the staleness is visible in the file's own `measured` date rather than implied.

**`stars: null` is a real state and the bar draws it** — the mark and the star
with no figure beside them, which is the house spelling for "nobody counted"
(§11.25) and never a zero somebody invented. Measured on the first run: 3.

**The mark is not black, and that is a floor rather than a preference.** The
author asked for GitHub's black icon. The bar's own sub-palette is the strongest
rule the design language states, so the mark takes the bar's ink — it is
GitHub's own mark either way.

**The ratios here were measured twice, and the first set was against the wrong
ground.** The control carries `--color-bar-field`, `rgba(255,255,255,.08)` over
the cobalt, which composites to `#393970` — so nothing on it sits on `#282864`
at all. MEASURED on the real ground: black **1.99:1**; the gold star
**3.29:1**, over the 3:1 a graphic owes and only just; the numeral beside it
**10.54:1**. Both themes declare the same three values, so both readings hold in
each. The first pass reported 1.58 and 4.16 by compositing nothing, which is the
kind of number that looks checked — and it was caught by doing the review lens
rather than by any guard, because `contrast.test.ts` resolves tokens and this
ground is not a token, it is two of them over each other.

### D65 · The minute figure was never measured, and now it is counted — 2026-09-12

The home page said *"Five to ten minutes a module"*. It came from `README.md`
rule 4 and `MANIFESTO.md` §3, and the author named it as wrong.

**MEASURED against the corpus those documents describe: nineteen modules declare
a duration, the shortest is 20 minutes, the longest 30, the average 26. Not one
is under twenty.** The claim was wrong by a factor of three and had been in three
documents and one page for the life of the project.

**What changed is not the number, it is where the number comes from.** The home
page calls `moduleLengthRange()`, which reads the declared durations — so a
module that gets longer moves the sentence with it and nobody has to notice.
§11.25 says every count on a page is measured from the corpus; a sentence with a
number in it is a count, and this is the first time that has been applied to
prose rather than to a facts strip.

`README.md` and `MANIFESTO.md` are corrected too, because a page and the document
it was written from are two statements of one thing and correcting one is how
they drift. **Those two now state a measured range rather than derive it, so they
are the only halves that can go stale** — said plainly beside the figure in
`MANIFESTO.md` §3 rather than left for somebody to discover.

**One place is deliberately NOT corrected and it is the author's.**
`mini-courses/MANIFEST.md` rule 4 reads *"It takes five to ten minutes to
read"*, and that is not a description of the corpus — it is the target every
module is written against, in the half of this repository governed by the corpus
agreement. Changing it changes what a module is held to, which is a decision
about the course rather than about the site. **It is raised, not edited.** Until
he settles it, a module written to that rule and measured at 25 minutes is
either a rule violation or a stale rule, and the site now says the second.

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

---

> **← Part 1: [`BRAINSTORM.md`](BRAINSTORM.md)** — D1 to D25, the entry test, and the house style.
