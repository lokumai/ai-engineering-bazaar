---
description: >
  The design system, in the DESIGN.md format — a machine-readable token block paired with prose saying
  what each token means and when to reach for it. Written so an agent building an interface has both
  the exact values and the intent behind them. This is the Bazaar system, chosen on 2026-09-08; it
  replaced the "Hidden Line" drawing-set system, which was deleted rather than kept alongside it.
  NOT here: component implementation, framework class names, or why an option was rejected
  (BRAINSTORM.md). Nor the reader-facing vocabulary, which is ARCHITECTURE.md §9.
authority: blueprint
writes: agent, as the interface evolves
status: active
covers: "the Bazaar system, chosen 2026-09-08 — M9 to M14 shipped; the whole revision is built"
last_updated: "2026-09-09"
---

---
name: "Bazaar"
description: "İznik tile: a cobalt bar, a warm ground, five level colours, and one band of ornament. Every hue sampled from assets/banner-tiles.jpeg."
colors:
  primary: "#282864"
  primary-hover: "#3a3a86"
  on-primary: "#FFFFFF"
  title: "#1b1b47"
  surface: "#fdfbf7"
  surface-raised: "#FFFFFF"
  surface-sunken: "#efe7d6"
  on-surface: "#20242e"
  on-surface-muted: "#6a6558"
  on-surface-faint: "#a09889"
  line: "#d8cbb4"
  line-strong: "#948d7d"
  accent-warm: "#c8a078"
  focus: "#a0503c"
  verify: "#2f8c86"
  caution: "#b8873b"
  fault: "#a0503c"
  info: "#282864"
  cat-fundamentals: "oklch(0.575 0.098 189)"   # TURKUAZ
  cat-intermediate: "oklch(0.575 0.128 240)"   # LACİVERT
  cat-expert: "oklch(0.575 0.130 320)"         # ERİK
  cat-ecosystem: "oklch(0.575 0.115 75)"       # BAL
  cat-protocols: "oklch(0.575 0.120 30)"       # KİREMİT
  slab-surface: "#1d1f27"
  slab-on-surface: "#e7e3d8"
  slab-line: "#33363f"
  slab-raised: "#262933"
  slab-keyword: "#c48ce0"
  slab-string: "#8fcf9a"
  slab-comment: "#8b91a0"      # was #767c88; 3.92:1 on the slab, see Colors
  slab-function: "#7fb8e8"
  slab-number: "#e0a45c"
grounds:
  selected: "G3"            # chosen 2026-09-08, BRAINSTORM.md O4. Retired: #F4ECE0 / #FFFDF9.
  retired: { surface: "#f4ece0", surface-raised: "#fffdf9" }
  G1: { surface: "#f8f2e8", surface-raised: "#fffefb" }
  G2: { surface: "#fbf7f0", surface-raised: "#FFFFFF" }
  G3: { surface: "#fdfbf7", surface-raised: "#FFFFFF" }
  G4: { surface: "#FFF8E9", surface-raised: "#FFFFFF" }
typography:
  h1:
    fontFamily: "Manrope"
    fontSize: "2.375rem"
    fontWeight: "600"
    lineHeight: "1.16"
    letterSpacing: "-0.015em"
  h2:
    fontFamily: "Manrope"
    fontSize: "1.5625rem"
    fontWeight: "600"
    lineHeight: "1.28"
    letterSpacing: "-0.012em"
  h3:
    fontFamily: "Manrope"
    fontSize: "1.15625rem"
    fontWeight: "600"
    lineHeight: "1.35"
  body:
    fontFamily: "Manrope"
    fontSize: "1rem"
    lineHeight: "1.68"
  ui:
    fontFamily: "Manrope"
    fontSize: "0.90625rem"
    fontWeight: "500"
  meta:
    fontFamily: "Manrope"
    fontSize: "0.84375rem"
  label:
    fontFamily: "Manrope"
    fontSize: "0.78125rem"
    fontWeight: "600"
  code:
    fontFamily: "IBM Plex Mono"
    fontSize: "0.84375rem"
    lineHeight: "1.75"
rounded:
  none: "0px"
  sm: "3px"
  md: "5px"
  lg: "7px"
  card: "4px 14px 4px 14px"
  arch: "14px 14px 4px 4px"
  pill: "9999px"
spacing:
  unit: "4px"
strokes:
  hair: "1px"
  strong: "2px"
  edge: "4px"
  dash-rule: "6 6"
widths:
  nav: "262px"
  toc: "204px"
  prose: "80ch"
  gutter: "clamp(24px, 3.4vw, 56px)"
  band: "18px"
motion:
  fold: "200ms cubic-bezier(.22,.61,.36,1)"
  hover: "120ms cubic-bezier(.22,.61,.36,1)"
  reveal: "150ms cubic-bezier(.22,.61,.36,1)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    borderRadius: "{rounded.md}"
  button-quiet:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    borderColor: "{colors.on-surface-faint}"
    borderRadius: "{rounded.md}"
  level-accordion:
    backgroundColor: "{colors.surface-raised}"
    borderColor: "{colors.line}"
    borderRadius: "{rounded.arch}"
  tick:
    backgroundColor: "{colors.verify}"
    textColor: "{colors.on-primary}"
    borderRadius: "{rounded.pill}"
    size: "17px"
  slab:
    backgroundColor: "{colors.slab-surface}"
    textColor: "{colors.slab-on-surface}"
    borderColor: "{colors.slab-line}"
    borderRadius: "{rounded.lg}"
---

# 🎨 DESIGN — The Bazaar system

> **This replaced a whole system, and the old one is gone.** Until 2026-09-08 the interface was
> "Hidden Line": paper, hairlines, three drafting stroke weights, three dash patterns, **zero radius
> on all nine radius tokens**, a serif body, monospace for every label, and one orange accent. It was
> internally consistent and thoroughly carried through, and it was undecodable to a first-time reader.
> It was deleted from this file rather than kept beside the new one, because two design systems in one
> document is two systems. The reasoning is `logs/BRAINSTORM.md` **D10**; the vocabulary it took with
> it is `specs/ARCHITECTURE.md` §9.
>
> **Every value here is settled.** The last one open, the ground, was answered on 2026-09-08:
> **G3 "Powder", `#FDFBF7`.** The other three candidates stay in the `grounds:` block as the record of
> what was compared, and `logs/BRAINSTORM.md` **O4** has the numbers.

---

## Overview

The interface is a **glazed İznik tile**: a cobalt bar across the top, a warm ground beneath it, five
level colours, and exactly one band of ornament. It comes from the project's own artwork rather than
from a reference site, and every hue in it was **sampled from `assets/banner-tiles.jpeg`** rather than
chosen: cobalt `#282864`, clay `#A0503C`, ochre `#C8A078`, teal `#2F8C86`, gold `#B8873B`.

What follows from that:

- **Cobalt leads, and the ground supports.** The bar is the darkest thing on the page and the only
  saturated surface. The ground is warm and light, and it is also the fill of the active item in the
  bar, which is how the navbar says where you are without a second colour.
- **Ornament is spent once.** A diamond tile lattice on a gold rule, 18px tall, directly under the
  bar. Nothing else on any page is decorative. If a second ornament appears, one of them is wrong.
- **A geometric sans, not a serif.** Headings and body are the same family at different weights. This
  is deliberate: a cream ground plus a high-contrast serif plus a clay accent is the most common
  machine-generated look there is, and it would have made the project's own artwork read as a
  template.
- **Radius carries meaning, sparingly.** Ordinary surfaces are 3 to 7px. Two shapes are special: the
  **arch** (`14px 14px 4px 4px`) marks a level, which is the banner's own shape, and the **card**
  (`4px 14px 4px 14px`) marks a block of the author's voice, such as the objectives.
- **One accent for interaction.** Cobalt for anything you can act on. Clay is the focus ring and
  nothing else. Ochre is the warm rule under a heading and the underline on a link, and never a
  surface.
- **Code and diagrams are a dark slab.** The one place the page goes dark, on purpose: it separates
  what the machine says from what the author says, and it stops a diagram from washing out.

## Colors

`primary` cobalt is the whole interactive vocabulary: links, buttons, the current module in the list,
the current heading in the contents rail. `title` is a deeper cobalt used only for h1, h2 and the bold
lead-in of a card, so headings sit a step above the body without a second hue.

**A correction, found in M13 and left standing here as one.** `title` `#1b1b47` is in the token block
above and **no stylesheet declares it**: M9 shipped the palette without a `--color-title`, so every
heading on the site is `--color-ink`. That is why M13's 56px hero is `--color-ink` too — reaching for
a token nothing declares computes to an inherited colour, which no contrast test can see and no
reviewer would notice. Either ship the token or take it out of this block; what must not happen is a
third page reaching for it.

`surface` is the ground: **`#FDFBF7`, at 96.6% relative luminance.** It replaced `#F4ECE0` at 84.6%,
and it is the only token that changed when the theme was accepted. It is also the fill of the active
item in the navbar, which is where its contrast against cobalt matters: 12.88:1, up from 11.36:1.

`surface-raised` is anything sitting on the ground, and it is **always lighter than the ground** —
the constraint the `grounds:` block exists to keep. On G3 that leaves it pure white, only 3.5% of a
step above the ground, which has one consequence worth stating as a rule: **a raised surface is told
apart by its hairline, not by its fill.** Every card, panel and dropdown needs its `line` border.
Removing a border because "the fill already separates it" is a defect on this ground; it did not
used to be.

`surface-sunken` is the sand used for a header strip inside a card, for a hover state in the module
list, and for the current level's fill. Against a near-white ground it does more work than it did
before, which is why the current level reads clearly without a second device.

**Two line tokens, and the split is load-bearing on this ground.** Measured against `#FDFBF7`,
`line` is 1.55:1 and `line-strong` is 3.19:1 — but a control does not only sit on the paper, and
against the **sand** those fall to 1.30:1 and 2.68:1, so neither line colour in T4's palette reaches
3:1 on every ground it is drawn on. That is fine
for a boundary that only **groups** things, because the content inside identifies the group — a card,
a panel, a section rule. It is not fine for the boundary that **identifies an interactive control**,
which needs 3:1 to be perceivable. So:

- **Grouping** — `--color-line` `#D8CBB4`, at 1.55:1. A card, a panel, a section rule.
- **Identifying a control** — `--color-line-control`, which is a token of its own and was not in the
  first version of this file. `line-strong` was doing both jobs, and against the **sand** — the ground
  an input and a card's header strip actually sit on — it measured **2.68:1**, which is not
  perceivable. Darkening `line-strong` itself was tried and collided with the five level colours: they
  share one lightness, pinned by their own 3.1:1 requirement against both themes' grounds, and a
  structural line at that lightness is one a reader can mistake for a level. So the control border is
  separate, and it clears 3:1 on **all three** grounds.

**Those are the shipped token names.** `--color-line` was already documented as decorative-only and
`--color-line-strong` as "structural, ≥3:1", so two of the three jobs were named before this ground
existed; the third had to be added. **The lesson is that a floor checked against one ground is not
checked**: both of these cleared 3:1 on the page and failed on the sand, and the contrast test now
pairs every token with all three grounds because of it.

`--color-ink-faint` is a third thing and must not be confused with either: it is faint *text*, and it
has to stay **under** 3:1 (2.77:1) or it becomes usable as a meaningful mark. The contrast test
asserts that ceiling. The two were briefly the same value, which is how the distinction got found.

This applies to the quiet button, inputs, the search field and the catalog's view toggle. `button-quiet`
shipped on `line-strong` at 2.07:1 on white, which failed.

**M10/M11 applied it, and M9 had not.** M9 declared the token and left every control on
`line-strong`; the components moved when the components were built.
`tests/unit/color/slab-and-controls.test.ts` now names each control and asserts the border in both
directions — a control put back on `line` or `line-strong` fails there — and there is no search field
yet, because §12.0 still defers the command palette. M12 and M13 added three more names to that list:
the catalog's filter chip, its view button, and control C's per-module toggle.

Three text weights and no more: `on-surface` for prose, `on-surface-muted` for anything secondary,
`on-surface-faint` for anything a reader can ignore. On G3 they measure 15.01:1, 5.62:1 and 2.77:1,
and on the sand 12.61:1, 4.72:1 and 2.32:1.
**The faint weight does not clear 4.5:1 and must never carry a sentence** — it is for a count, a unit
or a status word that is repeated elsewhere on the page. All three are measured against the ground on
every change; the numbers are recomputed by the palette tests from the shipped stylesheet, never
written down in an assertion.

**The five level colours are identity, not decoration.** Fundamentals turquoise, Intermediate İznik
navy, Expert plum, Ecosystem honey, Protocols roof-tile red — `TURKUAZ`, `LACİVERT`, `ERİK`, `BAL`,
`KİREMİT`, which is what the interface calls them. A level is told apart by its colour **and** by its
name, its position and its count, because colour is never the only signal.

**Two constraints on them that look like taste and are not.** They share one lightness (0.575), so no
level outranks another and each clears 3.1:1 against all three grounds in both themes. And no level
hue may sit within 20° of the accent — which is why Intermediate is *not* T4's cobalt: a level hue
that close to the interactive accent is one a reader can mistake for a link. Both are recomputed by
`tests/unit/color/lokum.test.ts` from the shipped stylesheet.

`verify` teal marks completion. It is drawn as a **filled disc with a white check**, and the shape is
load-bearing: teal measures 3.27:1 on the sand, 3.89:1 on the paper and 4.03:1 on a cleared surface
in the light theme, and 7.61:1 to 8.79:1 in the dark one, so in the light theme it would fail as text
and passes the 3:1 graphical floor on all three grounds. Do not turn the tick
back into a hairline glyph.

The slab is its own small palette. Its five syntax colours are chosen against `#1d1f27` and are the
only place in the system where hue carries meaning rather than identity.

**A second correction, and it is the same lesson as the first one.** `slab-comment` was `#767c88`
here, and it measures **3.92:1 against `#1d1f27`** — under the 4.5:1 text floor. A comment in a
teaching corpus is content, not decoration (`# Example vectors` is the line that explains the three
below it), so it takes the text floor, and the value moved to **`#8b91a0`** at 5.21:1. That is the
same call §6.7 already had to make against `--color-ink-faint` on the old code ground, one ground
over. Measured for the record, against the slab: ink 12.82:1, string 9.05:1, function 7.77:1, number
7.54:1, keyword 6.40:1, comment 5.21:1. `tests/unit/color/contrast.test.ts` recomputes all six.

**And one token the slab needs that this block does not name.** `slab-line` is the slab's own
boundary and its internal dividers, and it is decorative by design — 1.36:1 — so it must stay under
3:1 and a test asserts that ceiling. It is therefore the wrong colour for a **diagram's geometry**:
`mermaid-config.ts` binds every node stroke, every edge path and every arrowhead to
`--color-line-strong`, so inside the slab that token resolves to `slab-comment` at 5.21:1 instead. A
diagram drawn in `slab-line` is a diagram whose geometry a reader cannot see.

**The slab does not flip with the theme, and that is why it works at all.** It is implemented as a
local theme override — the palette redeclared on the figure — rather than as a set of bespoke code and
diagram colours. Custom properties cascade into inline SVG, so fifty-three diagrams re-theme onto a
dark ground with no change to the mermaid configuration, no re-parse and no JavaScript. The semantic
hues inside it are the **dark theme's**: measured on the slab, the light theme's `fault` is 2.90:1 and
its `info` is 1.67:1, against the 3:1 a graphic carries.

## Typography

One family, four jobs, six sizes: **Manrope**, at 400/500/600/700, for everything a person wrote.
Monospace is IBM Plex Mono, used for code, for a file name above a slab, for a measured value, and
for nothing else.

**A correction, kept because the wrong reason is instructive.** This section first said the stack was
the system sans with no webfont, because "the previous system's two webfonts cost a render-blocking
request each". That is false. `next/font/google` **self-hosts**: it downloads the faces at build time
and serves them from this origin with `display: swap`, so there was no third-party request to save and
nothing was render-blocking. The reason to change faces is the look — a serif body was half of the
system being replaced — not the loading. Manrope over Inter because both have the latin-ext coverage
Turkish needs and Inter is what a page reaches for when nobody chose.

The scale is `0.78125 / 0.84375 / 0.90625 / 1 / 1.15625 / 1.5625 / 2.375rem`. It is not a geometric
progression, and the values are the ones that were measured in the browser rather than derived from a
ratio.

**Line length is capped at 80ch and the column is centred.** The column takes the width its container
gives it, so on a wide window it grows into the space the rails leave rather than sitting against the
left edge with a band of nothing beside it — but it stops at 80ch, which is what keeps growing from
becoming unreadable.

**Measured on the shipped build at 1440px**, which is a different number from the 814px this section
first carried and the difference is instructive: `ch` is the advance width of `0` in the face that
actually resolved, so the cap is **781px in Manrope** and 814px was measured before the webfont was
being fetched. The pixel count is not the rule and the tests do not assert it — `anatomy.spec.ts`
measures an 80ch box inside the prose itself and compares. What holds either way: the two rails are
anchored to the window edges (0–262 and 1236–1440), the 974px track between them spends 49px of gutter
either side, and the column is centred in it clearing each rail by 97px. Folded, the track is 1236px,
the column stays 781px, and the gutters grow to 228px.

Sentence case everywhere. **No tracked-out all-caps labels**, which is the single clearest tell of a
generated interface and was in the first draft of this system before it was caught.

## Layout

Three columns: the module list at 262px, the content, the contents rail at 204px. **Both rails are
anchored to the window edges**, and the content is centred between them with a gutter of
`clamp(24px, 3.4vw, 56px)`.

**A page that wants the window has to be given it.** The shell puts every route in a 1200px
`max-width` box with 24px of padding, and that box is exactly what stops a rail reaching the window
edge — so `PageShell` takes a `bleed` flag and the module page is the one route that sets it. The
claim receipt keeps the shell in both modes: it is a sentence of prose about the reader's record, and a
sentence measured against 1440px is unreadable whatever the page around it is doing.

**The fold reclaims its track, and a fixed one does not.** The list folds in 200ms on
`cubic-bezier(.22,.61,.36,1)`, and a tab pinned to the left edge brings it back — vertically centred,
so it cannot collide with the sticky bar. Under `prefers-reduced-motion` the fold is instant. The
first grid track is `auto` rather than `262px`: MEASURED, with a fixed track the rail emptied and the
column came back the same width, so the prose did not move and the fold looked broken. An `auto` track
takes the item's own width, so animating the rail animates the track with it.

**The folded rail is `visibility: hidden`, and that is load-bearing rather than tidy.** It is what
takes 33 links out of the tab order, which is the property `logs/BRAINSTORM.md` D17 is about; the
transition delays the visibility swap until the width has finished on the way out and applies it
immediately on the way in. The restore tab is the mirror image, so exactly one of the two controls is
reachable at any time and each hands focus to the other.

Two breakpoints, both from the shipped e2e projects: at 1180px the contents rail goes, at 880px the
module list becomes a sheet. `responsive.spec.ts` runs at 1440, 1024 and 390, and nothing may scroll
sideways at any of them. Below each breakpoint the rail's content moves into one drawer, and **which
breakpoint reveals that control depends on the format**: a module with no contents rail to lose has no
reason to offer one until the list goes too, and offering it earlier opened an empty panel.

**Anything wider than its column scrolls inside its own box.** Tables, code and diagrams. This is a
rule and not a preference: mermaid renders client-side and injects an SVG at its natural width after
load, which is how a 1,423px diagram came to paint across a 656px column and both rails. See
`logs/BRAINSTORM.md` D10.

## Elevation & Depth

There is no shadow scale. Depth is a lighter fill plus a hairline, and that is the whole system. Two
exceptions, both for something that floats over the page: the navbar dropdown and the restore tab.

**And one thing removed rather than styled.** The retired system framed every page with four L-shaped
corner registration marks at the corners of a 1152px content box. On a module page there is no such
box — the rails are on the window edges — so the marks floated at an edge nothing else used, and they
are a second decorative motif on a system that spends its ornament once. M11 stopped rendering them on
that page. The routes that still keep the 1200px shell still have them; M12 and M13 decide their fate
there.

## Shapes

`sm` 3px for a chip or a tag, `md` 5px for a button or an input, `lg` 7px for a slab. `arch` for a
level, `card` for a block in the author's voice, `pill` for the tick. Zero radius is available and
means "a rule, not a box".

Strokes are `1px` for ordinary structure and `2px` for a divider that ends a section. **Never a
fractional border width:** Chrome floors border widths to whole pixels, so a 1.5px line has to be
painted as a gradient or a height, and `stroke-weights.test.ts` fails a `border-width` that tries.

## Components

- **button-primary** — cobalt, `md`. One per screen region. The completion button at the end of a
  module is the canonical one, and it carries a check glyph. **Its text is `surface`, not white**, and
  that is measured rather than stylistic: cobalt is dark in light mode and the accent is *lifted* in
  dark mode, so white on it would be a pale label on a pale fill. The page's own ground inverts with
  the theme, which is exactly what a filled accent needs — 12.88:1 light, 6.81:1 dark. Its completed
  state is deliberately not filled: the invitation is spent, and what is left is a statement of a
  state the reader can undo.
- **button-quiet** — raised fill, an `on-surface-faint` border, `md`. For anything secondary. The
  border is the only thing identifying it, so it uses the interactive line token and not the grouping
  one (see **Colors**).
- **level-accordion** — the `arch`, and a native `<details>` per level with the current one `open` at
  build time, so it works in the first frame before any bundle lands. The **current level is
  enlarged**, gets a 4px coloured left edge and the sand fill, and its count goes from grey to the
  reader's own ink. Being able to see which level you are in was one of the thirteen named flaws. Four
  signals rather than one, because colour is never the only carrier.
- **tick** — a 17px teal disc with a white check, and it carries the word `Complete` for a screen
  reader inside it. Revealed by channel A — the boot script stamps `hl-signed-<n>` on `<html>` and one
  generated selector per module reveals the mark — so a reader's completed modules are ticked before
  the first paint with no React. Absent rather than empty by default: the build has never met the
  reader. The 17px box is reserved either way, so a completion does not shift the row it lands on. It
  is drawn in **two** places on the same channel now: the curriculum rail's row, and inside completion
  control C's own toggle.
- **tag** — raised fill, hairline, `sm`, a 7px colour square when it names a level.
- **slab** — dark, `lg`, with a monospace header strip and its own scroll container.
- **view toggle** — the catalog's Overview / Cards / Table, each with an icon and a word, and `md`
  radius on the interactive line token. Three views over one data source; see `logs/BRAINSTORM.md`
  D13. **The showing view is not marked with `aria-pressed`**: which view is showing is an attribute
  on `<html>` that no React render sets, so an ARIA state would be a second author of it and the two
  would disagree for every frame before hydration. The button carries the word `Showing`, hidden from
  sight and revealed by the same rule that reveals the view — the arrangement the tick uses — plus a
  heavier bottom edge, which is what survives forced colours.
- **completion control C** — the whole course, visible and adjustable: one `arch` card per level with
  its 4px coloured edge, the segmented meter, and one row per module carrying a 28px toggle and the
  module's own link. On the home page and on the progress page, and it is the same component on both
  (D14). Three readings above it — modules completed, reading time, days in a row — each `--` until
  the store answers.
  **It is a meter and not the mock's ring**, and that is measured rather than stylistic: a ring's fill
  is a computed fraction, a computed fraction cannot reach channel A, and a mark a reader sees in
  frame one may not travel on channel B. See `logs/BRAINSTORM.md` **D23**.
- **panel head** — a title and a note, hairline-ruled under, both in the display face. The title was
  11px tracked-out uppercase mono until M13, which is the tell this system's own do-nots name first;
  it heads every panel on eight routes, so it was converted once rather than per page.

## Do's and Don'ts

**Do**

- Derive every number on every page at build time. A count written in `src/` is a defect.
- Recompute contrast from the shipped stylesheet in the tests, and let it fail when a token moves.
- Give a level its colour **and** something that is not colour.
- Put a scroll container around anything that can be wider than its column, before it is.
- Keep the ornament to the one band.

**Don't**

- Don't use `border-width` with a fractional value.
- Don't use ALL-CAPS eyebrow labels, a monospace face for small UI labels, meta strings joined with
  middle dots, or a `→` glued to the end of link text. Each is a tell, and the first two were in this
  system's own first draft.
- Don't put a second accent next to cobalt. Clay is the focus ring; ochre is a rule and an underline.
- Don't drop a card's border because the fill already separates it. On this ground it does not: white
  on `#FDFBF7` is a 1.035 luminance ratio, and the hairline is what makes the card a card.
- Don't give an interactive control a `line` or `line-strong` border. Neither reaches 3:1 here.
- Don't add a shadow scale.
- Don't let the tick become a hairline glyph — it fails contrast as text (see **Colors**).
- Don't let a figure break out of its column to get room. It was how the retired system gave a wide
  table and a wide diagram their width, and it is how a 1,524px drawing came to paint across both
  rails and past the window edge. The scroll container is the answer; `containment.spec.ts` measures
  the painted rectangle of every element of every diagram at all three viewports.
- Don't draw a diagram's geometry in `slab-line` (see **Colors**).
- Don't write a reader-visible string with an exclamation mark, praise, an apology, "just", "simply"
  or "easy", or a second spelling of a status. `tests/unit/copy-register.test.ts` enforces all of it.
- Don't state a retired word from `specs/ARCHITECTURE.md` §9 anywhere a reader can see it.
