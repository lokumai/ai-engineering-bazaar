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
covers: "the Bazaar system, chosen 2026-09-08 — being built in PROGRESS.md M9 to M14"
last_updated: "2026-09-08"
---

---
name: "Bazaar"
description: "İznik tile: a cobalt bar, a warm ground, five level colours, and one band of ornament. Every hue sampled from assets/banner-tiles.jpeg."
colors:
  primary: "#282864"
  primary-hover: "#3a3a86"
  on-primary: "#FFFFFF"
  title: "#1b1b47"
  surface: "{grounds.selected.surface}"
  surface-raised: "{grounds.selected.surface-raised}"
  surface-sunken: "#e6dac6"
  on-surface: "#20242e"
  on-surface-muted: "#6a6558"
  on-surface-faint: "#948d7d"
  line: "#d8cbb4"
  line-strong: "#c3b299"
  accent-warm: "#c8a078"
  focus: "#a0503c"
  verify: "#2f8c86"
  caution: "#b8873b"
  fault: "#a0503c"
  info: "#282864"
  cat-fundamentals: "#2f8c86"
  cat-intermediate: "#282864"
  cat-expert: "#7a4a86"
  cat-ecosystem: "#b8873b"
  cat-protocols: "#a0503c"
  slab-surface: "#1d1f27"
  slab-on-surface: "#e7e3d8"
  slab-line: "#33363f"
  slab-raised: "#262933"
  slab-keyword: "#c48ce0"
  slab-string: "#8fcf9a"
  slab-comment: "#767c88"
  slab-function: "#7fb8e8"
  slab-number: "#e0a45c"
grounds:
  selected: null            # OPEN — BRAINSTORM.md O4. Today's shipped ground is #F4ECE0 / #FFFDF9.
  shipped: { surface: "#f4ece0", surface-raised: "#fffdf9" }
  G1: { surface: "#f8f2e8", surface-raised: "#fffefb" }
  G2: { surface: "#fbf7f0", surface-raised: "#FFFFFF" }
  G3: { surface: "#fdfbf7", surface-raised: "#FFFFFF" }
  G4: { surface: "#FFF8E9", surface-raised: "#FFFFFF" }
typography:
  h1:
    fontFamily: "system-sans"
    fontSize: "2.375rem"
    fontWeight: "600"
    lineHeight: "1.16"
    letterSpacing: "-0.015em"
  h2:
    fontFamily: "system-sans"
    fontSize: "1.5625rem"
    fontWeight: "600"
    lineHeight: "1.28"
    letterSpacing: "-0.012em"
  h3:
    fontFamily: "system-sans"
    fontSize: "1.15625rem"
    fontWeight: "600"
    lineHeight: "1.35"
  body:
    fontFamily: "system-sans"
    fontSize: "1rem"
    lineHeight: "1.68"
  ui:
    fontFamily: "system-sans"
    fontSize: "0.90625rem"
    fontWeight: "500"
  meta:
    fontFamily: "system-sans"
    fontSize: "0.84375rem"
  label:
    fontFamily: "system-sans"
    fontSize: "0.78125rem"
    fontWeight: "600"
  code:
    fontFamily: "mono"
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
    borderColor: "{colors.line-strong}"
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
> **One value is still open:** which ground. See `logs/BRAINSTORM.md` **O4**, and the `grounds:` block
> above. Everything else here is settled.

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

`surface` is the ground; `surface-raised` is anything sitting on it, and it is **always lighter than
the ground** — that is the constraint the `grounds:` block exists to keep. `surface-sunken` is the
sand used for a header strip inside a card and for a hover state in the module list.

Three text weights and no more: `on-surface` for prose, `on-surface-muted` for anything secondary,
`on-surface-faint` for anything a reader can ignore. All three are measured against the ground on
every change; the numbers are recomputed by the palette tests from the shipped stylesheet, never
written down in an assertion.

**The five level colours are identity, not decoration.** Fundamentals teal, Intermediate cobalt,
Expert plum, Ecosystem ochre, Protocols clay. A level is told apart by its colour **and** by its
name, its position and its count, because colour is never the only signal.

`verify` teal marks completion. It is drawn as a **filled disc with a white check**, and the shape is
load-bearing: teal on the ground measures 3.44:1 to 3.90:1 depending on the ground, so as text it
would fail and as a graphical indicator it passes the 3:1 floor comfortably. Do not turn the tick
back into a hairline glyph.

The slab is its own small palette. Its five syntax colours are chosen against `#1d1f27` and are the
only place in the system where hue carries meaning rather than identity.

## Typography

One family, four jobs, six sizes. The stack is the **system sans**, with no webfont: the site is a
static export served from a sub-path on GitHub Pages, and the previous system's two webfonts cost a
render-blocking request each on a page whose whole point is that it loads. Monospace is likewise the
system mono, used for code, for a file name above a slab, and for nothing else.

The scale is `0.78125 / 0.84375 / 0.90625 / 1 / 1.15625 / 1.5625 / 2.375rem`. It is not a geometric
progression, and the values are the ones that were measured in the browser rather than derived from a
ratio.

**Line length is capped at 80ch and the column is centred.** The column takes the width its container
gives it, so on a wide window it grows into the space the rails leave rather than sitting against the
left edge with a band of nothing beside it — but it stops at 80ch, which is what keeps growing from
becoming unreadable. Measured at 1440px: an 814px column, centred, clearing each rail by 80px.

Sentence case everywhere. **No tracked-out all-caps labels**, which is the single clearest tell of a
generated interface and was in the first draft of this system before it was caught.

## Layout

Three columns: the module list at 262px, the content, the contents rail at 204px. **Both rails are
anchored to the window edges**, and the content is centred between them with a gutter of
`clamp(24px, 3.4vw, 56px)`.

The list collapses. It folds in 200ms on `cubic-bezier(.22,.61,.36,1)`, and a tab pinned to the left
edge brings it back — vertically centred, so it cannot collide with the sticky bar. Under
`prefers-reduced-motion` the fold is instant.

Two breakpoints, both from the shipped e2e projects: at 1180px the contents rail goes, at 880px the
module list becomes a sheet. `responsive.spec.ts` runs at 1440, 1024 and 390, and nothing may scroll
sideways at any of them.

**Anything wider than its column scrolls inside its own box.** Tables, code and diagrams. This is a
rule and not a preference: mermaid renders client-side and injects an SVG at its natural width after
load, which is how a 1,423px diagram came to paint across a 656px column and both rails. See
`logs/BRAINSTORM.md` D10.

## Elevation & Depth

There is no shadow scale. Depth is a lighter fill plus a hairline, and that is the whole system. Two
exceptions, both for something that floats over the page: the navbar dropdown and the restore tab.

## Shapes

`sm` 3px for a chip or a tag, `md` 5px for a button or an input, `lg` 7px for a slab. `arch` for a
level, `card` for a block in the author's voice, `pill` for the tick. Zero radius is available and
means "a rule, not a box".

Strokes are `1px` for ordinary structure and `2px` for a divider that ends a section. **Never a
fractional border width:** Chrome floors border widths to whole pixels, so a 1.5px line has to be
painted as a gradient or a height, and `stroke-weights.test.ts` fails a `border-width` that tries.

## Components

- **button-primary** — cobalt, white text, `md`. One per screen region. The completion button at the
  end of a module is the canonical one, and it carries a check glyph.
- **button-quiet** — raised fill, `line-strong` border. For anything secondary.
- **level-accordion** — the `arch`. The **current level is enlarged**, gets a 4px coloured left edge
  and the sand fill, and its count goes from grey to the reader's own ink. Being able to see which
  level you are in was one of the thirteen named flaws.
- **tick** — a 17px teal disc with a white check. On the current row it inverts: white disc, teal
  check.
- **tag** — raised fill, hairline, `sm`, a 7px colour square when it names a level.
- **slab** — dark, `lg`, with a monospace header strip and its own scroll container.
- **view toggle** — the catalog's Overview / Cards / Table, each with an icon and a word. Three views
  over one data source; see `logs/BRAINSTORM.md` D13.

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
- Don't add a shadow scale.
- Don't let the tick become a hairline glyph — it fails contrast as text (see **Colors**).
- Don't write a reader-visible string with an exclamation mark, praise, an apology, "just", "simply"
  or "easy", or a second spelling of a status. `tests/unit/copy-register.test.ts` enforces all of it.
- Don't state a retired word from `specs/ARCHITECTURE.md` §9 anywhere a reader can see it.
