---
description: >
  Part 2 of the execution log, and the ACTIVE part: a new milestone is appended here. It opens with
  M16, the interface rebuilt on the design language in ten stages — the stage table, every stage's
  brief, and the seven reports the stages wrote back, including what each one found that its own
  brief had wrong, and then the review pass over the finished milestone and the two defects it found
  inside a green gate. Part 1 holds M1 to M15 and is closed.
  NOT here: why a choice was made (BRAINSTORM.md), or any rule that outlives the milestone
  (MANIFESTO.md / ARCHITECTURE.md).
authority: state
writes: agent, every session
status: active
covers: "M16, 2026-09-09 to 2026-09-10 — all ten stages shipped, plus the review pass over it"
last_updated: 2026-09-10
---

# 📈 PROGRESS, part 2 — M16, the interface rebuilt

> **← Part 1: [`PROGRESS.md`](PROGRESS.md)** — M1 to M15, and the review pass over M10 to M14.
> This part is M16 alone.
## 🏁 Milestone M16: The interface, rebuilt on the language

Every surface rebuilt so it is indistinguishable from its mockup, with **no capability lost**. This
is a rebuild of the presentation layer, not an edit of it.

### The specifications, per surface

The design language is M15's. Each surface's *layout* comes from the mockup the author chose, and
those are the only references.

**The reference column names two files, because `02` to `09` are on a deliberately different
palette from `01` (D31).** They are layout studies — `02` says so in its own prose: "All three are
shown in one neutral palette **on purpose**, so you are judging the **structure** and not the
colour." So **geometry, structure and class semantics come from the component mockup; colour, type
and every token come from the shell.** Read the other way round, "indistinguishable from
`03-catalog.html`" would put a green accent on a cool grey ground, which is the mirror image of the
mistake this milestone exists to correct.

| Surface | Layout from | Colour from | Choice |
| --- | --- | --- | --- |
| Shell: bar, band, rail, reading column, aside | `01-theme-T4-ground-G3-powder.html` | same | T4 on G3 |
| Top navigation | `02-navbar.html` | `01` | **A** — one row, a dropdown per group |
| Catalog | `03-catalog.html` | `01` | **all three**, one route, behind a toggle with an icon and a name each: **Overview** (C), **Cards** (A), **Table** (B) |
| The reading page | `01`'s `main > .col`, containment from `04` | `01` | T4's own |
| Completion | `05-progress.html` | `01` | **A** at the end of a piece, **C** on the overviews |
| Code and figures | `01`'s slab, node roles from `06` | `01` | the **dark slab** |
| Progress and account | `07`-A, rings from `05`-C | `01` | **A** |
| Home | `08-home.html` | `01` | **A** |
| Rail | `01`'s `details.arch`, which is `09`-1 extended | `01` | T4's own |

**Two rows say `01` where the table used to name `04` and `09`, and that is a correction rather than
a change of mind.** Neither of those files contains a T4 variant — `04` holds A/B/C and `09` holds
1/2/3, all on the older palette — so "T4's own" resolves to the shell file itself. `01`'s
`main > .col` **is** the ratified reading page, and its `details.arch` **is** the ratified rail,
being `09` variant 1 extended with a `data-here` treatment for the current group. What `04` still
contributes is the wide-figure containment rule, which the shell adopted verbatim, and a `.bleed`
utility it did not. `06` likewise proposes a slab the shell does not ship; the shell wins, and `06`
contributes its three node roles.

### Deliverables

- [x] **The eleven old stylesheets deleted.** Not migrated — see the decision below. Stage 0: nine
      deleted, the entry point rewritten to 56 lines, the generated sheet kept generated.
- [x] **The token layer is the language.** `src/design/bazaar.css` is imported and prefixed `bz-`;
      `code-theme.ts` reads it and accepts hex; the invented type family is gone.
- [x] **The app-side `SelectorMap` exists**, which is the deliverable whose absence let five
      milestones ship the wrong design. `fidelity.spec.ts` compares a built surface to its mockup.
- [ ] The shell rebuilt: cobalt bar, the lattice band under it, the three-column grid anchored to the
      window edges, the folding rail, the sticky offset. Every route carries it. **Stage 1: the bar
      and the band are done and proven identical at three viewports; the grid, the rail and the
      aside are part 2.**
- [ ] Each surface above rebuilt against its reference, at 1440, 1024 and 390. **1 of 10 stages, in
      part.** Stage by stage in *The ten stages* below.
- [ ] The visual expectations in the browser suite rewritten against the mockups; the behavioural
      ones kept as they are. **The seven CSS-reading unit test files are done in stage 0; the 141
      hardcoded classes across the browser specs are re-pointed by the stage that owns their
      surface.**
- [ ] Every capability intact: completion and undo, the checklist, the quick check, sources,
      submittals, both languages, export, import, erase, the streak, role paths, optional sign-in,
      claim-and-merge, the three retired routes still landing somewhere useful. **Checked off by the
      stage that touches each, not at the end.**

### The stylesheets: deleted, not migrated

The author left this call to me, and it is **delete all eleven and author a fresh set from the
language**. Migrating them is precisely how the old structure survived M9 to M14: an edit preserves
the thing being edited, and 378 of the old design's 398 class names survived a milestone series that
was supposed to replace them. The fresh set is authored in the language's own terms, and any old rule
that turns out to be needed has to be re-derived from a mockup to earn its place back.

The exceptions, and why: the **generated** per-item stylesheet stays generated (its selectors are
enumeration, not design, and its generator is regenerated in the same commit as any change);
**markdown typography** and **figure framing** are re-authored against the mockup's prose and figure
treatment rather than dropped, because the corpus depends on them and the mockup specifies both.

### Acceptance criteria

- **The fidelity check from M15 passes on every route**, not only on the page the mockup drew.
- **Side by side with its mockup at 1440px, each surface is indistinguishable** apart from content
  and the components the author chose differently. Checked by screenshot against the reference, not
  by reading the CSS.
- No page body scrolls sideways at 1440, 1024 or 390; wide content scrolls inside its own box, and a
  figure wider than the column cannot paint outside it.
- The interface survives `forced-colors: active`, and colour is never the only signal.
- **A mark a reader sees in frame one is stamped before first paint**, not rendered by an island.
- Keyboard: every control reachable and operable, a visible focus ring on each, and for every
  disclosure **both** halves asserted — closed, its contents are out of the tab order; open, they
  are in it.
- `npm run typecheck`, `npm test`, `npm run build` and the full browser suite green, with the count
  of behavioural tests **not lower** than it is today.
- With no `.env.local` the site is complete and makes zero requests to the account service.

### The honest risk

**This is a large milestone and it is one milestone because the author asked for two.** 87 files
carry presentation, 82 components and 17 routes; **1,252 `hl-` occurrences in markup when it opened,
386 old class selectors across 7,158 lines of CSS, 141 hardcoded classes spread over 31 browser
spec files, and roughly 250 unit tests asserting markup shape.** The stage plan below is what turns
that into ten commits that can each be looked at.

**If it has to be cut, the cut is announced before it happens and the author chooses what goes** —
not decided quietly at the end, which is what happened with M9 to M14. **The cut line is stage 10**:
the nine mockup-backed surfaces are the milestone's point, and the eight derived routes have the
weakest reference.

**Where the mockup is silent, work stops and the author is asked.** Inventing a value is what
produced a substituted type family, a re-hued categorical series and a light top bar. There is no
budget for taste in this milestone. Six such questions have been asked and answered so far — D30
and D33 to D36 — and **two are still open**: whether a rail group's open state persists, which `09`
promises in prose and no mockup implements, and how a figure wider than the measure behaves, which
`04` answers with a `.bleed` utility the shell deliberately does not carry.

### The ten stages, and what each one owes

Stage 0 is the token layer; stages 1 to 10 are the surfaces, in the order of the reference table
above. **Each stage is one commit, and it does four things**: read the mockup and then DESIGN.md,
copying neither a nearby component nor a deleted stylesheet; rebuild the surface's markup and author
its own stylesheet in the language's terms; **add its roles to `APP_SELECTORS` in
`tests/e2e/fidelity.ts` and a `fidelity.spec.ts` block, with the mutation, in the same sitting**; and
run the whole gate. A stage does not land red.

Two things are true of every stage and are not repeated in each row. **Behaviour is carried over
from the components that already work** — the mockups implement almost none of it, one three-line
script across ten files, so the mockup governs appearance only. And **the specs that name the old
markup are re-pointed by the stage that rebuilds their surface**, keeping the behavioural
assertions and rewriting the appearance ones against the mockup.

| # | Surface | Reference (layout · colour) | Status |
| --- | --- | --- | --- |
| **0** | The token layer | — | ✅ `b3354d9` |
| **1** | The shell: bar, band, grid, rail slot, reading column, aside | `01` · `01` | ✅ `5fbc06b`, `d575215` |
| **2** | The navigation's dropdown, held to its own mockup | `01` (which re-drew `02`-A) | ✅ `f32d462` |
| **3** | The rail: groups, items, ticks, the fold and its restore tab | `01` (= `09`-1 extended) · `01` | ✅ `ef000df` |
| **4** | The catalog, three views behind one toggle | `03`-C/A/B · `01` | ✅ `ccccd6e` |
| **5** | The reading page | `01`'s `main > .col`; containment from `04` · `01` | ✅ `5abb61a` |
| **6** | Code and figures | `01`'s slab; node roles from `06` · `01` | ✅ `5abb61a` |
| **7** | Completion | `05`-A and `05`-C · `01` | ✅ `c5d53bb` |
| **8** | Progress and account | `07`-A; `05`-C's dials, not `07`'s rows · `01` | ✅ `5654c03` |
| **9** | Home | `08`-A · `01` | ✅ `582cebc` |
| **10** | The eight routes with no mockup | derived (**D30**) · `01` | ✅ `f110457` |

**The progress meter, measured at each stage.** `grep -rho '\bhl-[a-z0-9-]*' --include='*.tsx' src/`
counted **1,252** when M16 opened and **1,230** after stage 1 part 1. It reaches 0 when the rebuild
is real. Where the remainder lives today, which is also roughly how much each stage carries:
`components/record/` **386**, `src/app/` **293**, `components/team/` **116**, `components/sheet/`
**114**, `components/auth/` **71**, `components/catalog/` **52**, `components/path/` **36**,
`components/identity/` **35**, `components/org/` and `components/curriculum/` **29** each,
`components/shell/`, `mascot/` and `figure/` **15** each, `course/` **14**, `home/` **10**.

**Six of the 23 fidelity roles are mapped.** `bar`, `barInner`, `brand`, `barLink`,
`barLinkCurrent`, `band`. The seventeen still unmapped are named in the stages below, and
`barField` stays in `DELIBERATELY_ABSENT` until there is something to search.

---

#### Stage 1 — the shell · `01-theme-T4-ground-G3-powder.html`

**Part 1 is done** (`5fbc06b`): the cobalt bar, the band, and the app-side `SelectorMap` that makes
the whole milestone checkable. See its report below.

**Part 2** is the frame the other nine stages sit in, and it was split off rather than half-built:
the `bz-shell` grid moves into `PageShell` with three slots — rail, `bz-main > bz-col`, aside — and
`PageShell`'s `bleed` prop stops meaning anything, because the mockup anchors the rails to the
window on every route rather than only on the module page. **That is why it touches all 17 routes.**
The breadcrumb lands in the reading column, above the display heading, which is where the mockup
puts it.

- **Roles it adds:** `column`, `aside`, `asideLink`.
- **Specs it re-points:** `anatomy` (17 old classes, and it is the spec about the grid itself),
  `containment` (5), `responsive` (18, three viewports), `navigation` (7), `site-footer` (2),
  `not-found` (1). `not-found.spec.ts` reads a nav landmark named `Curriculum`; that behaviour has to
  survive the breadcrumb's move.
- **Watch for:** the two product breakpoints are the language's, 1180 and 880, and the sticky offset
  is 76px = 58 bar + 18 band. Nothing reflows into a hamburger and the body never scrolls sideways.

#### Stage 2 — the navigation's dropdown · `02-navbar.html` variant A

The bar's markup landed in stage 1 part 1 and `MainNav` needed no behavioural change — it was
already variant A, a native `<details>` disclosure that works before any bundle arrives, with
`data-current` on the trigger (**D28**). **What stage 2 owes is the check**: the menu is not in the
`Role` union at all, so nothing yet compares the panel the reader actually opens.

- **Roles it adds:** `menu`, `menuItem`, `menuKey`, `menuCount`.
- **The comparison is geometry only, and this is where D31 bites hardest.** `02` is on the older
  palette, so its widths, paddings, radii and the row's three-part shape are the specification while
  every colour comes from `01`. A naive "indistinguishable from `02`" would put a green accent on a
  grey ground.
- **Watch for:** the mockup renders the panel permanently open and has no show/hide mechanism at
  all, so the open state is what gets compared. Both halves of the disclosure's tab order are
  asserted — closed, the rows are out; open, they are in.

#### Stage 3 — the rail · `01`, which is `09-sidebar.html` variant 1 extended

`09` contains no T4 variant; the shell's `details.arch` **is** the ratified rail, variant 1 plus a
`data-here` treatment for the current group. The current group is emphasised four ways at once — a
larger type size, a sunken fill, a strong border and a thick leading edge in the group's own hue —
and that is deliberate redundancy, not decoration.

- **Roles it adds:** `rail`, `railInner`, `group`, `groupCurrent`, `groupKey`, `item`, `tick`, plus
  the fold button and the restore tab.
- **Components:** `CurriculumRail`, `RailFold` (29 old classes between them).
- **Specs it re-points:** `rail` (13).
- **Revives:** the `[data-cat]` hue carrier and the closed five-hue series in
  `category-surfaces.test.ts` — the rail is the first surface to bind `--bz-cat`.
- **Watch for:** the fold animates the grid track to `0px` while the rail's inner box keeps its own
  width, so content does not reflow mid-animation; the restore tab is vertically centred so it can
  never collide with the sticky chrome; under `prefers-reduced-motion` the fold is instant. **The
  rail's completion tick is channel A** — `boot.ts` stamps `hl-signed-<n>` and the generated sheet
  reveals `.bz-mod-mark`, so the mark is right in frame one and no island may draw it. `09` promises
  the open/closed state persists and no mockup implements it: **that is one of the two open
  questions for the author.**

#### Stage 4 — the catalog · `03-catalog.html`, all three views

One route, three views behind a toggle with an icon and a name each: **Overview** (C), **Cards** (A),
**Table** (B). Serves `/courses/`, `/courses/[category]/` and `/sheets/`. All three views ship in
the DOM and CSS reveals one, because the choice is channel A — `data-hl-view` on `<html>` against
`data-view` on a descendant.

- **Roles it adds:** the sticky filter bar and its chips, the level head, the card and its title,
  the table row, the board column, and the view toggle.
- **Components:** `Catalog`, `CatalogCards`, `CatalogOverview`, `ViewIcon`, `SheetIndex`,
  `CategoryBlock`, `ModuleRow`, `TickGauge` (52 + part of 114 old classes).
- **Specs it re-points:** `catalog` (18), `index-sheet` (8). Helper: `tests/e2e/views.ts` hardcodes
  `.hl-view[data-view]`.
- **Revives:** the five guarded cases in `catalog/views.test.ts` — the reveal list must cover every
  view in both the carrier and the forced-colours twin, and the no-script fallback branch too.
- **Watch for:** `03` stacks two stickies, the filter bar at `top:0` and the table header at a
  hardcoded `71px` matching the bar's height — **derive that, never copy the magic number.** The
  level badge takes an edge and not a tinted fill (**D33**). B has no mobile treatment in the mockup
  and its own note says so, so the narrow behaviour is a question if the table cannot scroll inside
  its own box. And M12's acceptance criterion holds: reorder `curriculum.yaml` and all three views
  follow identically.

#### Stage 5 — the reading page · `01`'s `main > .col`, containment from `04`

The heaviest route, ~19 component imports. Breadcrumbs above a display heading, a row of tags, then
sections whose headings carry a dashed ochre rule filling the remaining width — the one place
ornament touches the reading column. Prose links are underlined in ochre rather than recoloured.

- **Roles it adds:** `crumb`, `display`, `tag`, `section`, `subsection`, `prose`, `card` (the
  `leaf`-shaped aside a reader can skip), `actions`, `buttonPrimary`, the quiet button, and `pager`.
- **Components:** `TitleBlock`, `StatusBand`, `Objectives`, `ScheduleOfParts`, `DependencyBlock`,
  `SectionSpine`, `TableOfContents`, `ContentsDrawer`, `SheetRail`, `PrevNext`, `Prose` (the rest of
  `components/sheet/`'s 114, plus `course/`'s 14).
- **Specs it re-points:** `module-sheets` (33 tests, almost all behavioural), `title-block` (34),
  `prose-type` (3), `section-marks` (already hard-skipped — decide whether it comes back).
- **Watch for:** `04` contributes the wide-figure containment rule, which the shell already adopted,
  and a `.bleed` utility the shell deliberately does not have — **a figure wider than the measure is
  the second open question for the author.** The measure is 80ch and the mockup widened it from
  `04`'s 68ch on purpose. `sheet.test.tsx`'s discipline rules now live in
  `surface-stylesheets.test.ts` and will hold this stage's stylesheet automatically.

#### Stage 6 — code and figures · `01`'s slab, node roles from `06-code-diagrams.html`

A slab has a mono header strip and a scrolling code body; a figure frame uses the same dark palette
and **its contents scroll inside the frame**, so a diagram wider than the column never widens the
page. `06` proposes a different slab from the one the shell ships; **the shell wins** (**D31**), and
`06` contributes only its three node roles — done, you are here, not yet — of which the language has
two, so the third is a state to add and not a colour to invent.

- **Roles it adds:** `slab`, `slabCode`, the slab head, `figure`, `node`, the active node, the third
  node state, the arrow, the caption.
- **Components:** `MermaidFigure`, `Diagram`, `Prose`'s code path (`figure/`'s 15).
- **Specs it re-points:** `mermaid` (6).
- **Watch for:** `mermaid.ts` cannot use `var()` — mermaid's `classDef` grammar rejects a CSS
  function and a parse error blanks the figure — so the four semantic classes are emitted as literal
  values resolved at build time from the token layer, exactly like `code-theme.ts`. **Swapping the
  token layer silently changed every diagram in the corpus, and `node scripts/check-mermaid.mjs` is
  the only thing that proves they still render.** The semantics ride the node's border and never
  become a fill (**D33**): `verify` = success, `caution` = caution, `fault` = the clay, `info` = the
  cobalt. `mermaid.spec.ts` asserts the slab is theme-fixed; that must stay true.

#### Stage 7 — completion · `05-progress.html`, variants A and C

**A** at the end of a piece: a top-ruled action row with one primary button, and after it a
completed state with an undo beside it. **C** on the overviews: a dial per level, drawn as a
`conic-gradient` with a knocked-out inner disc — no SVG and no JavaScript — plus three statistics.

- **Roles it adds:** the completion mark, the completion control in both states, the dial, the
  statistic row.
- **Components:** `SignOff`, `SignOffMarks`, `CourseCompletion`, `ChecklistIsland`, `QuickCheck`,
  `CheckedBy`, `TickGauge` (part of `record/`'s 386).
- **Specs it re-points:** `record-sheet` (35 old classes, the largest exposure in the suite),
  `record-index` (10). Helper: `tests/e2e/record.ts` (14).
- **Revives:** the two aggregate category states in `category-surfaces.test.ts`.
- **Watch for:** **a mark a reader sees in frame one is stamped before first paint** — the generated
  sheet's five selector lists drive `.bz-seg`, `.bz-step-tick`, `.bz-mod-mark`, `.bz-cmod-mark` and
  `.bz-cmod-said`, and **D25** keeps the completion state off `aria-pressed` and on a channel-A word
  associated by `aria-describedby`. A completion mark is a filled disc with a white check, never a
  stroked glyph, because the teal clears a 3:1 graphic floor and not a 4.5:1 text floor. `05`'s three
  progress rails are three implementations of one primitive across `03`, `05`, `07` and `08` — unify
  them.

#### Stage 8 — progress and account · `07-dashboard.html` variant A, rings from `05`-C

The route that absorbed three others: `/dashboard/`, `/path/` and `/report/` are `MovedTo` stubs
forwarding here, and they must keep forwarding. Variant A is a continue hero, a progress block, a
statistics row, then two settings panels.

- **Roles it adds:** the continue hero, the progress row, the panel, the field, the danger button.
- **Components:** all of `components/record/`'s panels, `components/path/` (36),
  `components/identity/` (35), `AccountSync`, `Register`, `ReportPanel`, `DrafterBlock`.
- **Specs it re-points:** `record-pages` (30), `path` (8), `alias` (3), `accounts` (5, skipped
  without `E2E_ACCOUNTS=1`), `accounts-disabled` (4).
- **Revives:** the nine-role path reveal and its negation chain in `category-surfaces.test.ts`.
- **Watch for:** `07`'s progress row is a three-track grid with a **fixed 150px label column**,
  which will overflow with a long level name or its Turkish translation — fix it rather than
  transcribe it. The account layer is optional and gates nothing; with no `.env.local` the page is
  complete and makes zero requests. `AccountSync` is the seam where session, sync, store and claim
  meet, and its absence was the largest defect in Phase 4. The exported RECORD OF WORK keeps its own
  print palette and borrows only the five hues, which `category-hues.test.ts` already guards.

#### Stage 9 — home · `08-home.html` variant A

A display heading, a lede, two calls to action, four measured facts, a grid of level cards, then a
four-part rule block. The level card is structurally the same primitive as `03`-C's board column —
a coloured header, a progress rail, a short list — so it is one component with two variants, not two
components.

- **Roles it adds:** the hero, the lede, the fact row, the level card.
- **Components:** `KeepingYourPlace`, `ContinueLine`, `src/app/page.tsx` (10 + part of 293).
- **Specs it re-points:** `home` (18, and both of the suite's only two `toHaveClass` calls).
- **Watch for:** the page renders **both** halves unconditionally and CSS picks one off
  `data-hl-record`, which is the entire first-visit-versus-returning switch and is channel A. `08`
  uses literal emoji as icons in its rule block — replace them with the SVG idiom the rest of the
  design uses. Its four facts are corpus counts and must be derived, never written down.

#### Stage 10 — the eight routes with no mockup · derived (**D30**)

`/legend/`, `/legend/specimen/`, `/team/`, `/team/assignments/`, `/sign-in/`, `/sign-in/alias/`,
`/join/`, `/auth/callback/`. Built from primitives the mockups already specify — `card`, `tag`, the
primary and quiet buttons, `slab`, the bar field for an input, the group and item rows for a list.
**Nothing is invented; where one needs a shape the language does not have, that one shape is a
question and not a design decision.**

- **Components:** `components/auth/` (71), `components/team/` (116), `components/org/` (29),
  `components/identity/` (35), `legend/page.tsx` (508 lines).
- **Specs it re-points:** `accessibility` (17), `colour-not-alone` (19), `health` (2), `features`
  (1), `redirects` (1).
- **Watch for:** four of the eight sit behind an auth flag that is off by default, so their specs
  skip cleanly and the fidelity comparison has to run against a build with
  `NEXT_PUBLIC_AUTH_ENABLED=true`. `/legend/` is the page that replaces onboarding by not being
  onboarding — it is never auto-opened, and that must stay true. **This is the announced cut line**
  if the milestone has to be cut: the nine mockup-backed surfaces are the point, and these eight
  have the weakest reference.

---

### Closing the milestone

M16 is done when all three mechanical tests hold at once — no `hl-` class in any `className`, no
stylesheet in `src/app/` but the entry point and the generated sheet, and `fidelity.spec.ts`
comparing **every** surface to its reference with no differences — and when the capability ledger is
checked off with the full gate green and the behavioural test count no lower than it is today. Then
`CLAUDE.md`, `INDEX.md` and `tests/README.md` are re-pointed, and the two open questions
(a rail group's persistence, a figure wider than the measure) are either answered or recorded as
deliberately unanswered.

### Report — stage 0, the token layer swapped, 2026-09-09

**The eleven old stylesheets are gone.** Nine deleted outright — `prose`, `sheet`, `manifest`,
`rail`, `figure`, `record`, `lokum`, `home`, `profile` — `globals.css` rewritten from 742 lines to a
**56-line entry point**, and the generated per-module sheet kept, generated. That is **7,158 lines
of CSS and 386 class selectors removed in one commit**, replaced by an `@import` of the language.

`src/app/fonts.ts` is deleted with them and `next/font/google` has left the layout. **MEASURED in
the export: zero requests to `fonts.googleapis.com` or `fonts.gstatic.com`, and `manrope` appears 0
times in the shipped CSS.** Type is the mockup's own system stack, so it varies with the reader's
OS exactly as the mockup's does.

**The language is wired in and renamed.** `src/design/bazaar.css` took the `bz-` prefix (**D29**):
116 occurrences in the language, the 33 selector pairs of the transcription test, and the eight
class names the generator emits. It stayed at `src/design/` rather than moving into `src/app/`,
because the reader that needed it there was pointed at it instead — see the next paragraph — and the
tests that used to glob `src/app/*.css` now discover *surface* stylesheets, of which there are
currently none.

**The build-time trap was real and is closed.** `src/lib/content/code-theme.ts` resolved
`src/app/globals.css` by path, required a literal `.dark {` block, read six `--color-slab-*` tokens
positionally and fed each to `oklchToHex` — so it required `oklch()`, and the language writes hex
because the mockup does. It now reads `src/design/bazaar.css` and accepts both notations through one
exported `toHex`, which the test uses too so the policy cannot exist in two places. **Verified end to
end: `--shiki-light:#8B91A0` appears in the rendered code blocks of the export.** No test catches
this; only `npm run build` does.

### What the eleven stylesheets took with them, and what replaced it

Seven unit test files reached into `src/app/*.css`. Not one was deleted without its rule being
either re-expressed or recorded, and **three of the old rules turned out to be measurably false**
against the specification (**D32**).

| Was | Now | What happened |
| --- | --- | --- |
| `unit/stroke-weights.test.ts`, 4 tests on `--stroke-hair/struct/cut` | 2 tests, same file | Re-expressed as **no fractional pixel in any border or outline**, over every shipped stylesheet, discovered not listed. The browser fact survives; the token scale did not exist to survive. |
| `e2e/stroke-weights.spec.ts`, 3 tests | 1 test | The flooring probe is kept as the premise the unit rule rests on. The two that measured the old painted rule are retired. |
| `unit/color/lokum.test.ts`, 102 tests on `--cat-<slug>` | `unit/color/category-hues.test.ts`, 31 tests | Re-expressed against `--color-category-1…5`. Kept: the series is closed at five and declared once, every hue clears 3:1 on every resting ground in both themes, all ten pairs separated by ≥20° of hue, and the exported record's inlined copy equals the language. |
| `unit/color/slab-and-controls.test.ts`, 55 tests | 31 tests, same file | The 11 hand-named control selectors are stage 1's (see the open question). What replaced the local-dark-override rule is stronger: **a surface stylesheet may not theme anything and may not declare a `--color-*` token at all.** |
| `unit/color/category-css.test.ts`, 18 tests | 9 tests, plus `category-surfaces.test.ts`, 7 | Split. The generated-sheet completeness and the generator round-trip stay; the four rules about deleted surfaces became **existence-guarded** completeness rules that bind the moment their surface exists. |
| `unit/color/contrast.test.ts`, 95 tests | 78 tests, same file | Re-pointed at the new token names. `line-cut`, `line-control` and the four `*-ink` status tokens have no successor. |
| `unit/catalog/views.test.ts`, `unit/components/sheet.test.tsx` | 12 and 28 | Re-pointed at discovered surface stylesheets; the seven CSS-discipline rules moved to `unit/design/surface-stylesheets.test.ts`, which holds every surface a later stage authors. |

**The 16 skipped tests are the point, not a gap.** Six in `surface-stylesheets`, five in `views`,
four in `category-surfaces`, one in `slab-and-controls`. Each is guarded on the existence of the
thing it checks rather than on a note in a document, so it switches itself on when its stage lands.
A rule parked in a milestone document is a rule that evaporates, which is the failure this whole
milestone exists to correct.

### Three findings the re-pointing surfaced, none of them assumed

Re-pointing the contrast table at the new token layer found what reading either file did not.

1. **`slab-comment` measured 3.92:1** on the slab, under the 4.5:1 a comment takes as content. The
   retired design had already found and fixed this; M15's transcription faithfully restored the
   mockup's value **and the defect with it**. Settled by the author as **D34**: the language lifts
   the same hue to `#8B91A0`, **5.21:1**, and it is the one named deviation from the mockup, listed
   in DESIGN.md and in a `DEVIATIONS` entry that is itself checked for staleness.
2. **The mockup italicises a code comment** while §3.4 refuses mono italic, and the shipped syntax
   theme was already upright — so the transcribed `font-style: italic` was a contradiction rather
   than a choice. Removed.
3. **`line-strong` measured 2.00:1** on the ground, 2.07 raised, 1.50 on the hover fill. It is the
   edge the language gives an interactive control, and SC 1.4.11 asks 3:1 for anything required to
   identify a component. **Open, and it is stage 1's**, by the author's decision: answered with the
   shell's real buttons and fields in front of us rather than by inventing a token now. Enforced
   meanwhile: `line-strong` is strictly stronger than `line` on every ground in both themes.

`on-surface-muted` also measures 4.21:1 on the hover fill against 5.62 and 5.81 on the two resting
grounds; DESIGN.md calls the sunken fill a hover and pressed state rather than a resting surface for
text, so the text floors are asserted on the resting grounds and the hover fill is checked as the
transient state it is.

### The gate at the end of stage 0

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm test` | **2,108 passed, 16 skipped, 0 failed, 81 files** |
| `npm run build` | clean, **56 HTML files**, 42,253 bytes of CSS |
| Export, language present | `#fdfbf7`, `#282864`, `#8b91a0`, `bz-bar`, `bz-rail`, `bz-group`, `bz-slab` all in the shipped CSS |
| Export, old design absent | `hl-panel`, `hl-signoff`, `hl-viewbtn`, `hl-prose`, `manrope` — **0 each** |
| Browser suite | **expected red, and not a gate until stage 1 lands.** Every surface is unstyled; 141 hardcoded `.hl-*` selectors across 31 specs still name the old markup. |

**The unit count fell from 2,239 to 2,124 and that is accounted for rather than waved at.** Almost
all of it is `it.each` expansion over tables that got smaller because the palette is smaller: the old
category table ran five hues × three grounds × two themes × **two chroma levels**, and the
half-chroma dimension does not exist in this language; the contrast table lost `line-cut`,
`line-control` and four `*-ink` tokens that have no successor. **No rule was dropped without being
re-expressed or recorded in D32.**

### Mutation proofs run in this sitting

Every check written or rewritten was watched failing before it was trusted, which in M15 twice found
the hole in the check rather than in the code.

| Check | Mutation | Result |
| --- | --- | --- |
| transcription, renamed pairs | `.bz-bar` → `.bz-barTYPO` | fails, naming `.top → .bz-bar` |
| transcription, deviation list | a `language` value not in the language | fails 3 ways, including "carries no stale deviation" |
| stroke weights | `border-top: 1.5px` added to the language | fails, naming the file and line |
| surface stylesheets | a planted sheet with a literal radius, a shadow, a hex, an opacity transition and a category hue on a link | **all five rules fail** |
| category surfaces | a carrier covering two of five categories, `--color-category-9`, one role in the negation chain | 4 rules fail, then the two role rules once the guard was widened |
| category hues | `category-4` nudged toward `category-5` | hue separation fails in both themes |
| category hues, drift guard | one hex digit changed in the exported record's copy | fails |
| theming ownership | a surface declaring `.dark`, a `--color-*` token and a control bordered with `line` | all three fail |
| `code-theme.ts` hex | observed failing before the fix: `oklch: "#e7e3d8" is not an oklch(L C H) triple` | the reason the passthrough exists |

### Next, and the honest position

Stage 1 is the shell, against `01-theme-T4-ground-G3-powder.html`: the cobalt bar, the lattice band,
the three-column grid anchored to the window edges, the folding rail and the 76px sticky offset. It
carries the first app-side `SelectorMap` in `tests/e2e/fidelity.ts`, and it is where the
`line-strong` question gets answered.

**The browser suite is red and stays red until surfaces exist**, by design: a half-styled site is
honest, whereas an old-structure page that still looks finished is the failure being engineered out.
The 141 hardcoded selectors in the specs are re-pointed surface by surface, with the behavioural
tests kept.

### Report — stage 1 part 1, the bar and the band, 2026-09-09

**The app-side `SelectorMap` exists, and that is the headline.** `tests/e2e/fidelity.ts` could read
the mockup since M15 and had nothing to compare it against. It now reads the built page too, and
`differencesIn(reference, actual, roles)` restricts a comparison to the roles a stage actually built.
**The built bar is fact for fact identical to the mockup at 1440, 1024 and 390** — 140 fidelity
tests passed, 19 skipped.

Three things make that non-vacuous rather than a green light. The stage-1 block asserts every one of
its roles was really read **on both sides** before comparing, so a typo in either map fails instead
of passing. The mutation is the exact failure that shipped four times — put the bar on the page
ground, DESIGN.md's first Don't — and the check names `bar.backgroundColor`. And
`DELIBERATELY_ABSENT` carries a reason for every role the product does not render, because an
unexplained difference is how a real one gets ignored.

**The check earned itself on its first run.** It failed because the band role was described in a
comment and never mapped — precisely the class of omission that let five milestones pass.

**What the bar carries.** The mockup's own structure: brand tile, one row of navigation with a
dropdown per level, a flexible gap, then icon buttons. `MainNav`'s behaviour needed nothing — it was
already variant A, a native `<details>` disclosure that works before any bundle arrives, with
`data-current` on the trigger per **D28** — so only its class names and its row shape changed, to
the mockup's hue key, name and trailing count. The count is new on `CategoryLabel`, derived from the
curriculum rather than written down.

**What left the bar.** LKM-01 (**D36**) and the breadcrumb, neither of them a loss: the mockup's
mark is a tile not a logo, the progress-meter job belongs to `05`-C's rings and `07`-A's bars, and
the mockup puts `nav.crumb` in the reading column. **What the bar does not render:** the mockup's
search field and `TR` button, because neither feature exists and a control that opens nothing is the
claim §1 forbids — the retired header held the same two slots back for the same reason.

**`src/app/shell.css` is three rules and a chevron**, because the language already carries the whole
shell: the bar and its sub-palette, the band, the three-column grid with both breakpoints and the
fold, the rail, the measure, the aside. If that file grows, the reason should be suspicious.

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm test` | **2,115 passed, 9 skipped, 0 failed** — down from 16 skipped, because seven existence-guarded rules switched themselves on the moment a surface stylesheet appeared |
| `npm run build` | clean, 56 HTML files |
| `npx playwright test fidelity.spec.ts` | **140 passed, 19 skipped**, three viewports |

### Next

**Stage 1 part 2**, and what it owes is written once, in *The ten stages* above rather than a second
time here. In short: the `bz-shell` grid into `PageShell`, its three slots, and the breadcrumb into
the reading column — all 17 routes, because `bleed` stops meaning anything once every page gets the
grid.

### Report — stages 1b, 2 and 3, 2026-09-10

**Stage 1 part 2** (`d575215`) put the grid into `PageShell` as three slots and
deleted `bleed`, which only ever opted out of a 1152px box that no longer
exists. `RegistrationMarks` was deleted rather than hidden: four corner marks
are a second decorative element, and the ornament budget is spent once, on the
band. **`bz-shell` appears only where a route passes a rail** — the module page
alone, because only `01` and `04` draw a fixed leading track while `03`, `07`
and `08` are single-column inside the bar.

**Stage 2** (`f32d462`) added the four menu roles and holds the opened panel to
the mockup, fact for fact, at all three viewports.

**Stage 3** (`ef000df`) rebuilt the rail and gave it one vocabulary.

### The defects these three stages found, none of them by reading

| Found | What it was |
| --- | --- |
| A regression from stage 1 part 1 | Taking the breadcrumb out of the header left `Breadcrumb.tsx` imported by **nothing**, so the `Curriculum` landmark three assertions read existed on no page. The browser suite being "expected red" is what hid it. |
| ~400 inert styling references | A Tailwind utility named after a deleted token emits **nothing** — no error, no warning. `text-ink`, `text-ink-muted`, `text-ink-faint`, `font-display`, `bg-paper` and `bg-cleared` all produced **zero rules** in the shipped CSS. **148 distinct references across 44 files.** |
| The channel-A tick, broken | Three vocabularies: the component emitted `.hl-mod-mark`, the generator revealed `.bz-mod-mark`, the language defines `.bz-tick`. Stage 0 changed the generator's prefix and left its names, so for three commits the generated sheet revealed a selector no markup carried. |
| The fold could not be right in frame one | The language transcribed an ancestor-driven state (`body.folded .shell`) as a **self** attribute, and channel A can only stamp `<html>`. Its restore tab used `~` while the mockup puts the tab **before** the shell, so the combinator could never match. |
| A folded rail kept 33 links tabbable | The mockup folds with opacity, a transform and `pointer-events` — all of which stop the **mouse** and none of which touches the tab order. |
| An unstyled control at every width | The contents drawer's "Contents" button had no rule, so the rail's narrow-width replacement showed while the rail itself was on screen. |

### The guard that would have caught the largest of them

`tests/unit/design/styling-references.test.ts` reads every colour, font and size
utility plus every `var(--…)` out of the markup **and out of the surface
stylesheets**, and requires each to resolve against the language's `@theme`
block. **Its first run was the worklist**; both halves are mutation-proved.

It is content-agnostic and it would have caught all 401 references the morning
stage 0 landed. The surface half was added in stage 3 after a
`var(--tracking-label)` went into a stylesheet the markup sweep could not see.

### Corrections these stages proved

- **`01` is the dropdown's reference, not `02`.** D31's layout-from-`02`,
  colour-from-`01` split does not apply: `02` chose the variant and `01` re-drew
  it in the shell's palette. What `02` still holds and `01` dropped — a 290px
  panel, a 10px radius, an uppercase group eyebrow — is superseded.
- **Two facts were measuring content, not design.** `menuCount.marginLeft` is an
  auto margin, so its computed value is whatever gap is left over (50.77px
  against 65.58px, because the documents carry different level names). And every
  "first group that is not the current one" fact depends on which group that is,
  so the rail's comparison had to move to a **fundamentals** module —
  `groupKey.backgroundColor` was reading category-1 against category-2. Comparing
  a hue series needs the same position in it on both sides.
- **The per-fact mutation loop had a hole.** A menu is off screen at every
  width, so its fifteen facts skipped for ever — fifteen `mutate` values that
  never ran. The loop opens the menu now; skips went 58 back to 19.
- **Two test bugs.** The rail's tab walk classified any `<summary>` as a rail
  level, and the bar's own dropdown trigger is a `<summary>`. And under reduced
  motion the fold check required a `transitionend` that correctly never fires,
  because the language **removes** the transition rather than shortening it.

### One deliberate divergence from the mockup, recorded

**The rail's group count is the level's total, not the mockup's `3/8`.** A
done-of-total count is reader state and it is on screen in frame one, so §12.2
forbids it travelling on channel B — and CSS cannot count, so channel A cannot
draw it either. This is the wall **D23** already hit when a mock drew a progress
ring and the project shipped a segmented meter instead. Progress in the rail is
carried by the discs on the rows, which **are** channel A.

Two smaller ones, both because the shell dropped what a variant study had: the
groups carry no disclosure chevron, and neither the level nor the module row
carries a two-digit order prefix.

### The gate after stage 3

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm test` | **2,119 passed, 7 skipped, 0 failed** — two more guarded rules revived when the hue carrier landed |
| `npm run build` | clean, 56 HTML files |
| `fidelity`, `rail`, `module-sheets` | **243 passed, 21 skipped**, three viewports |
| The meter | `hl-` in markup **1,188**, from 1,252 when M16 opened |

### Stages 4 and 5, which are next

Stage 4 is the catalog and it is the largest new-CSS stage: `bazaar.css` has no
catalog vocabulary at all, so its filter bar, chips, cards, table and board are
authored from `03`'s geometry. **It is on `/sheets/` alone** — `/courses/` and
`/courses/[category]/` render `SheetIndex` directly with no filters and no
toggle, so the table is all three share. Stage 5 is the reading page, and
`title-block.spec.ts`'s 34 tests are the biggest single test cost in the half:
the mockup's three-span facts strip replaces a twelve-row instrument panel.

### Report — stages 4, 5 and 6, 2026-09-10

Three surfaces, two commits: the catalog (`ccccd6e`), then the reading page and
the figures together (`5abb61a`). After these, **every route a reader uses on
the way through the course is on the new language** — finding a module, reading
it, and looking at the code and diagrams inside it.

**The three stages were not the same shape, and measuring said so before any of
them started.** The language declares 60 `bz-` classes, and between them they
already covered almost everything stages 5 and 6 needed — `.bz-display`,
`.bz-section` and its dashed ochre rule, `.bz-facts`, `.bz-tag`, `.bz-card`,
`.bz-actions`, `.bz-btn`, `.bz-pager`, `.bz-slab*`, `.bz-figure*`, `.bz-node`.
It declares nothing a catalog needs. So stage 4 authored 700 lines of new
vocabulary and stages 5 and 6 authored 400 between them, most of it for things
the corpus has and `01`'s single sample of prose does not.

#### Stage 4 — the catalog

**`03` is an annotation page, and reading it as a component sheet would have
been the M9-to-M14 mistake in miniature.** Its `.head`, `.opt`, the A/B/C
badge, the fake browser `.frame` and the `.why` rationale strip are the
apparatus of a document presenting three alternatives to the author. The
specification inside it is the filter bar and the three view bodies.

Two of its components are refused and two of its views were the wrong shape:

- **`03`'s search field is a `<div role="button">` that opens nothing**, which
  is the claim §1 forbids — the same reason the bar's own search slot stays
  empty. It is recorded in `DELIBERATELY_ABSENT` beside `barField`.
- **Its table carries a group-break row.** Grouping is the question the
  overview answers; a table that also groups answers two at once, which is why
  `03`'s own note calls the table "the densest".
- **Variant A groups its cards under a level heading** and the component was a
  flat list. **Variant C is a five-column board** and the component was a stack
  of full-width bands — an outline rather than "the whole shape of the course
  in one view", which is what the mockup's note asks for.

**`03`'s `top: 71px` is not transcribed.** It is `16 + 38 + 16 + 1` — the filter
bar's padding twice, the search field's height, and the bar's hairline — so it
is a sum, and one of its terms is the field this stage refuses to draw. The
terms are declared and the sum is computed, and the table header follows if the
bar's padding ever changes.

Where `03` and the language disagreed, eight times, the resolution is recorded
in `catalog.css`'s header table. The radii, the card's hover shadow, the
translucent progress track and the pressed chip's ink fill all went to the
language; the tinted level badge went to **D33**; `03`'s "Done" went to the
product's one spelling of a status; and the board's 1080/620 breakpoints became
the two the language actually declares.

#### Stage 5 — the reading page

`01`'s column has six children and the page had fourteen. Every fact from the
twelve-row title strip keeps a home and `FactsStrip` names each one; four
stopped being printed, and none of the four is something a reader can act on.

**The containment mechanism became real for the first time.** `data-hl-width`,
`--hl-measure`, `--hl-break-left` and `--hl-break-right` were a contract that
**nothing set and no stylesheet read** — the last three existed in a docblock
alone. `containment.spec.ts` was not merely failing against them: it *threw*,
because its anchor `.hl-column` was emitted by no component either, so 63 test
instances had been reporting an error that read like an unrelated bug.

#### Stage 6 — code and figures

Much smaller than the row implied, because **D33 landed in stage 0**: the four
diagram semantics already rode the stroke, the `*-wash` tokens were already
gone, and `classDef` already carried only a stroke width. What was left was one
defect and it was invisible to everything except the one test that could not
pass while it existed — described in *The defect two tests disagreed about*
below.

### The defects these three stages closed, and only two were in their own scope

Eleven, and nine of them were older than the stage that found them:

1. **The page scrolled sideways at 390px on EVERY route.** The bar's trailing
   icon controls ended at x=412 in a 390 viewport. That fails an M16 acceptance
   criterion outright, and it failed it on every page rather than on a surface
   — which is why nothing that ran per-surface had caught it. `01` has two
   media queries and neither touches the bar; it is a desktop study.
2. **A shell with no aside reserved the third track anyway**, so 204px of the
   A4 anatomy was blank at 1440px.
3. **The 404's trail printed the address it was asked for.** Stage 1b moved the
   breadcrumb from the root layout into `PageShell`, and
   `useSelectedLayoutSegment()` answers relative to the nearest layout above
   the component — so the one route whose address names nothing stopped being
   recognised. The footer's half never broke, because the page names itself
   there explicitly; the trail now does the same.
4. **`main` painted a focus ring around the whole page** after the skip link.
5. **§6.5's overflow fade did not exist** after stage 0 deleted the stylesheet
   that carried it.
6. **The fade could never have appeared on a diagram anyway.** A
   `ResizeObserver` on the scroll box cannot see the box's *content* grow, and
   every diagram is injected after mount — so each figure was measured while it
   held a one-line placeholder.
7. **The two prose controls had no tap target.** `COPY` painted 47 × 24.
8. **The pager's end tile put its only sentence in the faint label slot**, at
   3.30:1.
9. **The § permalink had no second hover stage**, so a reader who had moved the
   pointer onto a 13px control got no feedback that they were on it.
10. **A module's number in the catalog table was in the caution ink** at
    3.09:1, a drawing-set convention that does not survive a text floor.
11. **The completion squares silently shrank to 8px.** `.bz-table tbody td`'s
    padding out-specified a bare class, leaving 44px for 68px of squares, and
    flex shrank them rather than overflowing where anyone would see it.

### The defect two tests disagreed about, which is the interesting one

`mermaid.spec.ts` required a local palette override **on the figure**;
`slab-and-controls.test.ts` forbids **a surface stylesheet** from declaring any
`--color-*` token. Both are right, and they are only in conflict if the
override is put in a surface: it belongs in the language, on `.bz-figure`.

Until it existed, every colour `mermaid-config.ts` names was a page token while
the frame was the dark slab — so **a diagram was a near-white box inside a
near-black one for six commits**, and the docblock of the test that could have
said so blamed `rail.css` for a rule that file never carried under any name.

Two things followed that were not obvious. **Two of the four semantics flip
between themes and two do not**, so a frame that never flips needs the lifted
values at all times, and the slab gained `slab-info` and `slab-fault`. And **a
diagram's strokes are its content, not a control's edge**: `slab-line-raised`
measures 1.80:1 on the slab ground, so they take the 3:1 graphic floor and
`slab-arrow` at 3.47:1.

### Four guards that were passing for the wrong reason

Each of these would have hidden the next real difference:

- **The reveal guard's pairing check** named the toggle's class literally, so
  the rename would have made it match nothing — and a pairing check that
  matches nothing reports zero mismatches and passes. It is class-agnostic now.
- **A slice in the catalog's unit test** ran from the toggle to the count.
  Moving the count above the toggle made that a backwards range, and
  `String.slice` answers a backwards range with the empty string, which
  contains no `<a `.
- **The level-panel walk compared TEXT**, and the curriculum rail's group
  summaries read `Fundamentals8` exactly as the menu's rows do. It asks by
  location now.
- **`accessibility.spec.ts` counted `header` elements** as a proxy for one
  banner. A `<header>` inside a sectioning element is `generic`, so the board's
  five column headers made it six elements and still exactly one banner.

### The harness learned to read a second document, and D31 became mechanical

`03` is on the retired cool-grey palette and says so itself. So the harness now
knows **which mockup specifies which role**, and one guard follows from it:
**a role whose reference is not `01` may carry no colour fact.** The catalog can
only ever be compared on lengths and type steps; its colour is held by the three
guards that need no mockup.

`NARROW_DEVIATIONS` records the two facts that stop being specified below the
language's own lower breakpoint — the bar's inline padding and a level swatch's
width, the second of which is a flex-shrink artefact of the level NAME beside
it and therefore a content measurement. Each entry names a width and a reason,
and a guard fails any entry that has stopped deviating, because a stale
exemption would hide the next difference.

### Corrections these stages proved

- `catalog.spec.ts` has **11** tests and `index-sheet.spec.ts` **4**, not 18
  and 8. `tests/e2e/views.ts` has **five** consumers, not two.
- `title-block.spec.ts` is **3 declarations** expanding to 34 instances, and
  `containment.spec.ts` 3 expanding to **63**.
- The progress meter **undercounts by 71**: it reads `.tsx` only, and the
  renderer's whole class vocabulary lives in `.ts`.
- `PROGRESS.md` said the diagram semantics are "emitted as literal values
  resolved at build time". They are `var()` in `themeCSS`, and
  `mermaid-config.test.ts` actively forbids a literal.
- `03` has **no view toggle at all** — A, B and C are three separate frames —
  so the toggle is derived under **D30** and recorded in `WITHOUT_REFERENCE`.

### Four tests re-pointed because they were wrong on their own terms

Not merely stale, which matters: a stale test names markup that moved, and
these asserted things that could not be true of any correct page.

- `prose-type.spec.ts` asserted a caption's font family matches `/Manrope/`, a
  face stage 0 removed, and computed `parseFloat(--text-meta) * 16 === 13`
  against a token block that is now px — so it evaluated 216 against 13.
- `title-block.spec.ts` cross-checked twelve rows that no longer exist.
- `site-footer.spec.ts` cross-checked a revision the page had been printing
  twice, and pinned the retired ALL-CAPS.
- `record-index.spec.ts` pinned §5.9's "zero radius, everywhere on this site",
  a drawing-set convention DESIGN.md's Shapes section replaced with a scale
  that names this exact case: "a `2px` corner on a `9px` swatch".

### Two questions left for the author, both recorded in the code

**A figure wider than the measure.** It is capped and scrolls inside its own
box. `04` has a `.bleed` utility, the ratified shell deliberately does not, and
`01` draws no figure wider than its column — so nothing bleeds, and
`data-hl-width`'s three values stay a classification the design does not spend.
Reversing it is one rule in `prose.css`; `src/lib/figure/width.ts` still
classifies against the retired 656 / 920 / 1152 tracks.

**The pager's direction label.** `01` sets it in `faint`, and DESIGN.md is
explicit that faint does not clear a 4.5:1 text floor and names "a label above
a control" as a legitimate use. MEASURED at 3.30:1. Lifting it to
`on-surface-muted` would cost nothing visible, but it would be a **second
`DEVIATIONS` entry**, and that list says adding one is the author's decision and
never a way past a red test. The destinations all clear the floor; the label is
asserted to be the language's own faint token and nothing quieter.

### Dead code these stages left standing, deliberately

`src/components/sheet/TitleBlock.tsx` and `titleBlockRows` / `titleStripRows`
are rendered by no page now. They are **not** deleted here: their tests are the
only remaining coverage of a derivation stage 8 may still want when it rebuilds
the record surfaces, and deleting a component and its tests late in a stage is
how coverage disappears without anybody deciding it should. It goes with stage
8, or with the author saying so.

### The gate after stage 6

- `npm run typecheck` — clean.
- `npm test` — **2,128 passed, 2 skipped**, 82 files. The two skips are the
  role-reveal pair in `category-surfaces.test.ts`, which is stage 8's; stage 4
  revived the five reveal cases in `views.test.ts`.
- `npm run build` — clean, **56 HTML files**.
- `node scripts/check-mermaid.mjs mini-courses/*/*.md` — **112 / 112** corpus
  diagrams parse AND render in real Chrome.
- `npx playwright test fidelity.spec.ts` — **156 passed** at 1440 covering
  stages 1 to 6, **339 passed / 21 skipped** across three viewports.
- `npx playwright test` — **890 passed, 23 failed**, from 163 failed when stage
  4 opened. Every remaining failure is in a stage 7, 8 or 9 surface: `path`
  (15), `home` (10), `record-sheet` (4), `record-pages`, `colour-not-alone`,
  and two `responsive` cases on the account and alias routes.
- Meter: `hl-` in markup **1,045**, from 1,188 when stage 4 opened. Counting
  `.ts` as well as `.tsx`: **1,116**, from 1,281.

### Stage 7, which is next

Completion, `05`-A and `05`-C. Its surface is the largest remaining `hl-`
holding — `components/record/` — and four of the 23 failures are already
pointing at it: the level face's weight, the mascot, the drift line and the
quick check's reveal. Stage 5 built the action row and its two buttons and left
the completion behaviour inside it alone, which is the seam to pick up.

### One housekeeping note this file owes its next reader

**It is 2,300 lines and the split boundary is stage 10, not here.** kiacontext's
rule is to split on a phase boundary first and on length second, and M16's plan,
its ten stage briefs and its six reports are one argument: separating the brief
for stage 7 from the reports that corrected the brief for stages 4 to 6 would
make both halves harder to use. It splits when the milestone closes, as
`PROGRESS.md` and `PROGRESS_2.md`, continuing the numbering.

### Report — stages 7 to 10, the milestone closed, 2026-09-10

**M16 is done.** Every route is on the design language, both closing conditions
are tests that did not exist, and the retired vocabulary is out of the markup:
**`hl-` in `className` is 0, from 792.**

Five commits: `7ed3bbe` item 0, `c29c85c` items 1 to 5, `c5d53bb` stage 7,
`5654c03` stage 8, `582cebc` stage 9, `f110457` stage 10.

#### What the plan got wrong, and what measuring changed

**The stages were not four independent surfaces.** They shared one primitive
the language did not have, one retired treatment that had to dissolve rather
than be renamed, one generated stylesheet that was inert, five class names that
were 55% of everything left, and one hazard that reordered the whole thing.

**That hazard was the finding that mattered most.** Since stage 0 deleted the
eleven stylesheets, every `hl-` class in the tree was dead markup — present in
the DOM, matched by nothing — so a large number of assertions had quietly
stopped distinguishing anything. Six guards were satisfied by an empty node
list, three more were red only because nothing was styled and would have
flipped to green-and-empty on rename, and six were already passing for the
wrong reason. **A rename is exactly the event that hides all of that**, so
closing it came first, in a commit that touched no source. That is item 0, and
it was not in the original plan at all.

#### The five things that were true across the stages

1. **The progress rail was the one primitive `01` does not contain.** The shell
   mockup has no meter of any kind — it states progress in words — and the four
   component mockups draw one four different ways. Reconciled to two shapes, in
   the language, with the reason for each choice recorded; both radii the
   mockups use turned out to be the scale's own already.
2. **`hl-mark` was 205 occurrences of a treatment the language forbids twice**,
   and `01` writes `text-transform: none` explicitly on the one element that
   would have carried it. It dissolved into `text-mark`, the utility Tailwind
   generates from the language's own step. Then the guard found three
   components that had re-created it out of `font-mono uppercase
   tracking-[0.06em]`, and two more with a bare `uppercase` — so the rule grew
   a markup half.
3. **The reveal carrier had three more consumers**, and all three were broken:
   the home page's shortcut had no reader at all, the path's nine bodies all
   showed at once, and the level faces' aggregate states had gone with
   `lokum.css`.
4. **Four of the generated sheet's five groups were inert**, and had been for
   four commits — the file's own comment predicted exactly that.
5. **Five names were 55% of the remaining 792.** Four already had an answer;
   only the form field was new work.

#### The dial, and the claim that turned out to be half true

`CategoryMeter`'s docblock rules out a proportional meter on channel A: *"a
bar's length is a computed number and a computed number cannot reach CSS on
channel A"*. That is true of CSS, which cannot count, and it is why the meter
draws one segment per module. It is **not** true of the channel — the boot
script is a script, and it already had the counts three lines above the place
it would need them.

So `05`-C's dial is implementable after all: the script sets one custom
property per level before first paint and a `conic-gradient` substitutes it.
`stamp.ts` grew the same derivation for after mount, both suites cross-test the
two, and the fidelity harness measures the ring filling in a real browser with
every `.js` request refused. **It is the only reading channel A carries as a
number rather than as a class**, and it is worth knowing that the boundary was
narrower than the comment said.

**Two test harnesses were missing a member the script now touches**, and the way
that failed is the interesting part: the emitted script is wrapped in one `try`,
so a fake `documentElement` without `style` did not merely lose the properties —
the throw abandoned the loop those properties are set in, and the remaining
levels silently lost their `-started` and `-complete` classes too. The
cross-test caught it by walking two levels rather than one.

#### The casing, which was one decision spent twelve times

The readings and labels were written in mixed case and looked uniform only
because their classes uppercased them. With that gone, `0 of 43 traces` sat
next to `2 OF 9 EARNED` on the same page. The line drawn, and applied
throughout: **an enumerated record state keeps its spelling** — `READY`,
`PLANNED`, `MATCHED`, `UNSIGNED` are values a reader matches against each
other, and the copy register's rule is that a status has one spelling — **and a
label, a caption, a sentence or a count that borrows the word does not.**

Its sharpest consequence: §16.4.1's rule that a register row states a count,
`--`, or a named state and never a sentence of prose **was enforced by
casing**. In sentence case a named state and a sentence are the same shape, so
the row now states which it is in `data-reading` and the test asks by that.

#### Corrections these four stages owe the briefs above

- **`TickGauge` exists**, in `components/sheet/`. The stage-7 brief listed it
  under `components/record/`, which is why a search scoped there reported it
  missing.
- Stage 7's brief attributes four `record-sheet` failures to completion. Two
  were: the level faces' weight and hatch. One was stage 5 collateral — a bare
  `.prose` the reading page had renamed. **One was a test-side defect no
  styling could fix**: the drift test interpolated a whole `<footer>`'s
  `innerText` into a `RegExp` after stage 5 retargeted `printedRevision`.
- **`path` had 5 failing tests, not 15.** That number counted retry
  directories: five tests times three attempts.
- **The mascot is not in the site header**, and three tests were asserting
  things about it there. `01` specifies the brand as a tile — four glazed
  squares, one left as an outline — and stage 1 built that. `features.spec.ts`
  was measuring the tile's geometry and calling it the mascot.
- **`07`-A's progress rows are not built, deliberately.** `05`-C's dials
  already report per-level progress on that page, and `07`'s own argument
  against its variant C is the reason not to have both.
- Stage 10 was the announced cut line and held **42% of the retired
  vocabulary**. Cutting it would have left closing condition 1 unmeetable.
- **Both closing conditions were unsound**, below.

#### The two closing conditions, repaired

**Condition 1 — no `hl-` class in any `className`.** There was no test, and the
meter everyone quoted did not measure the condition: of 1,045 occurrences, 158
were `data-hl-*` attribute names and the rest included the `<html>` stamps —
all mechanism, all permanent. Driving that number to zero would have meant
renaming the pre-paint script's stamps and breaking channel A silently. Scoped
to a class it is now **0**, and the three families that stay are checked
against `stamp.ts`'s own pattern and `schema.ts`'s own key rather than merely
excluded.

**Condition 2 — no stylesheet in `src/app/` but the entry point and the
generated sheet.** Read literally this is the opposite of M16's method and
would have been ten over. A first attempt listed the eleven retired stylesheets
by name and went red on `home.css`, which stage 9 had just re-authored from
`08` — `prose.css` and `rail.css` are two more. `globals.css` states the real
rule: *a rule from the old set earns its place back only by being re-derived
from a mockup*. **A name is not a design; 386 class selectors were.** So the
condition is now about the vocabulary: no surface declares a rule for a retired
class, with the three stamped families excluded because a surface keying on
those is the whole of channel A.

**And a third guard nobody had asked for**, which is the one that found the
most. `styling-references.test.ts` catches a utility named after a token the
language does not declare. `category-css.test.ts` catches a generated selector
no component carries. The third corner is **a class a component emits that no
stylesheet answers to** — the failure M16 spent ten stages undoing, invisible
to every typecheck, build and test in the project. It found eight, including a
stage-4 rename that a sweep meant for tests had clobbered.

#### The capability ledger

Named once in the closing conditions above and defined nowhere until now. One
row per capability the interface had before M16, where it lives, and the
behavioural test that proves it survived — because "every capability stays" was
the milestone's promise and M9 to M14's failure was losing them quietly.

| Capability | Where it lives now | Proven by |
| --- | --- | --- |
| Read a module, with its figures, code and diagrams | `/courses/[category]/[module]/` | `module-sheets` (33 instances), `prose-type`, `containment`, `mermaid` (6) |
| Find a module three ways, and keep the choice | `/sheets/` | `catalog` (11), `views.test.ts`'s five reveal cases |
| See every module in a level, with its topics | `/courses/`, `/courses/[category]/` | `index-sheet` (4), `record-index` (9) |
| Complete a module, and take it back | the module's action row | `record-sheet` (36) |
| Complete a module from the overview | `/`, `/profile/` | `home` (16) |
| A self-check, self-marked, no score kept | the module's quick check | `record-sheet` §12.6 cases |
| A checklist that is never a gate | the module | `record-sheet` §12.4.1 cases |
| Register a repository, refusing a hostile URL | the module's submittal | `record-sheet`'s `HOSTILE_REPOS` loop |
| See how far through each level you are | `/`, `/profile/`, the rail, the catalog | `fidelity` stage 7, `colour-not-alone` |
| A role, and the path it suggests | `/profile/` | `path` (6), `category-surfaces`'s nine-role pair |
| What is waiting on you | `/profile/` | `record-pages` (28) |
| Take a copy of the record out, and put one back | `/profile/`'s data row | `record-pages`, `record-report` unit |
| Erase everything, told what will go | `/profile/`'s erase dialog | `record-pages` §12.15 cases |
| The record of work, as a document | `/profile/`'s report row | `record-report` unit, `category-hues` |
| An optional account, gating nothing | `/sign-in/`, `/join/` | `accounts` (12, gated), `accounts-disabled` (5) |
| An alias, with no account at all | `/sign-in/alias/` | `alias` (5) |
| A team's roster and assignments | `/team/`, `/team/assignments/` | `accessibility` (19), `colour-not-alone` |
| The legend, never auto-opened | `/legend/`, `/legend/specimen/` | `fidelity` stage 10 |
| Keyboard reach for everything, both halves of every disclosure | every route | `accessibility` (19), `record-sheet`'s chord cases |
| Colour is never the only signal | every route | `colour-not-alone` (6), under `forced-colors: active` |
| No sideways scroll at any width | every route | `responsive` (11 × 3 viewports) |
| The theme, chosen before first paint | every route | `theme` (6) |
| Every route reachable, nothing 404 | every route | `health` (5), `redirects` (5), `not-found` (7) |

Nothing in that table is new, which is the point. The behavioural test count is
higher than it was: **2,141 unit from 2,128**, and 1,041 browser tests passing
from 890 — and 26 unit tests were deliberately removed with the dead component
they exercised, after every live claim underneath was re-expressed first. One
of those claims turned out to be false, which is the argument for re-expressing
rather than deleting: *"a draft prints an em dash for LENGTH, FIGURES and
SOURCES"* was a rendering rule of the retired strip, not a fact — a draft
measured 4 sources, because a draft may perfectly well cite something.

#### The gate, at the close

- `npm run typecheck` — clean.
- `npm test` — **2,141 passed, 0 skipped**, 82 files. The last two skips, the
  nine-role reveal pair, went live in stage 8.
- `npm run build` — clean, **56 HTML files** (`find out -name '*.html' | wc -l`).
  Next's own line reads `57/57`, which counts ROUTES and includes `/_not-found`; the
  earlier stage reports say 56 and they are the ones that measured the export.
- `node scripts/check-mermaid.mjs mini-courses/*/*.md` — 112 / 112.
- `npx playwright test fidelity.spec.ts` — **200 passed** at 1440, covering all
  ten stages against **five reference documents**; the three parallel maps are
  one record now.
- `npx playwright test` — **1,044 tests, 0 genuine failures**, from 23 failing.
  The passing count moves between 1,041 and 1,044 run to run and **that is the
  honest way to state it**: four tests fail only in a full parallel run and pass
  in isolation, so which of them lands is a property of the machine rather than
  of the build. They are `rail`'s fold animation, `theme`'s first-paint probe,
  `navigation`'s 32-module walk and `containment`'s keyboard scroll — all
  long-running timing, none of them a fidelity check, and all four flaking
  before this milestone touched them. **Re-run any failure in isolation before
  believing it.**
- Meter: **`hl-` in `className` 0**, from 792.
- **And read the section below before quoting any of this**: the gate was green
  and two real defects were inside it.

#### Then a review found two defects the gate had no question for — 2026-09-10

The line above says 0 genuine failures, and it is true as written: nothing in
the suite was red. **It is also the wrong thing to be reassured by.** Three
reviews were run over the finished milestone from different angles, and two
confirmed defects came back — both shipped inside the green gate, both with a
comment or a document asserting the opposite of what the code did. Fixed in
`dbe7d72`; the reasoning is **D54** and **D55**.

1. **The focus ring was the weakest on the site, on the surface it appears on
   most.** MEASURED against every ground it is drawn on: clay is **2.35:1** on
   `bar` in light and 2.77 in dark, 2.90 and 2.56 on the slab's two surfaces in
   light, against SC 1.4.11's 3:1 — clearing only on the two page grounds, at
   5.48 and 5.66. The bar holds the first controls in the tab order on every
   route. The ring is now a `--bz-ring` hook that each ground binds to its own
   sub-palette's ink: 13.31 on the bar, 12.82 and 11.31 on the slab.
   The contrast suite could not have caught it — `graphical('focus')` walks the
   two RESTING grounds, and the ring appears on four.
2. **`/profile/`'s continue hero shipped with no gate**, offering a populated
   "Continue where you left off → LLM Fundamentals" to every reader including a
   fresh browser, and never correcting with the bundle blocked. `nextUnsigned`
   returns the first drawn module for an empty record rather than `null`. Gated
   the way the home page's is — the box on channel A, the content on channel B —
   and the eyebrow now branches, because §15.11 counts a chosen alias as a
   record and nobody left off there.

Both fixes carry a mutation-proven guard: the ring's reads the actual `--bz-ring`
bindings out of the language rather than asserting a pair of tokens, and the
hero's is a fidelity test that fails with "a fresh browser is offered a shortcut
it has not earned". Gate after both: typecheck clean, **2,144 unit**, build
clean at 56 HTML files, browser suite passing with only the known timing flakes.

**What this says about the closing gate, and it is the useful part.** Every
closing condition held, 2,141 tests were green, and two real defects were inside
that. Both were in the class this milestone kept meeting: **a check that nobody
thought to ask**, not a check that failed. The suite measures what somebody
thought to measure, and an independent reader asking "what does this actually
measure, on which ground, in frame one" found in one pass what ten stages of
green gates did not.

#### What is left, and it is not code

The two questions stage 5 left for the author are still open and still recorded
in the code rather than decided: whether a figure wider than the measure may
bleed past the text (**D43**), and whether the pager's direction label should be
lifted off `on-surface-faint` at a measured 3.30:1 (**D45**, which would be a
second `DEVIATIONS` entry and is therefore his call). A third joined them in
stage 3 and is answered rather than open: a rail group's persistence.

---

> **← Part 1: [`PROGRESS.md`](PROGRESS.md)** — M1 to M15, and the review pass over M10 to M14.
