---
description: >
  The design LANGUAGE, in the DESIGN.md format — a token block an agent can read exactly, and prose
  saying what each token is for and when to reach for it. It is written to be portable: another
  product could adopt this file unchanged and look like it belongs to the same family.
  NOT here, and this is the part that went wrong before: no framework or utility class names, no
  route or page names, no product vocabulary, no component implementation, no architecture or data
  flow, and no reasoning about rejected options (BRAINSTORM.md). A surface's LAYOUT is not a design
  language either — that lives in the milestone that builds it, against the mockup it came from.
source: playground/01-theme-T4-ground-G3-powder.html (light) · playground/01-theme-T4-G3-DARK.html (its approved derivation)
authority: blueprint
writes: agent, as the language evolves
status: active
covers: "the Bazaar language, transcribed from T4 on ground G3, with its derived dark sibling, plus the six primitives M16 derived from the component mockups — 2026-09-10"
last_updated: 2026-09-10
---

---
name: "Bazaar"
version: "alpha"
description: "İznik tile. A cobalt bar over a powder ground, one warm neutral family, a five-hue categorical series, arch-topped groups, and a single band of lattice ornament. Every hue sampled from glazed ceramic."
colors:
  surface: "#FDFBF7"
  surface-raised: "#FFFFFF"
  surface-sunken: "#E6DAC6"
  on-surface: "#20242E"
  on-surface-title: "#1B1B47"
  on-surface-muted: "#6A6558"
  on-surface-faint: "#948D7D"
  line: "#D8CBB4"
  line-strong: "#C3B299"
  primary: "#282864"
  on-primary: "#FFFFFF"
  focus: "#A0503C"
  success: "#2F8C86"
  caution: "#B8873B"
  on-caution: "#20201C"
  # A destructive control, and a GRAPHIC token: an edge, a rule or a mark, and
  # never type. MEASURED 5.48:1 on `surface` in light and 3.02:1 on
  # `surface-raised` in dark — a 3:1 graphical floor in both themes and a 4.5:1
  # text floor in only one. Its value is `category-5`'s and `focus`'s; three
  # names, one hex, three distinct jobs.
  fault: "#A0503C"
  ornament: "#C8A078"
  bar: "#282864"
  on-bar: "#FFFFFF"
  on-bar-dim: "#C9C6E4"
  bar-hover: "rgba(255,255,255,0.10)"
  bar-edge: "rgba(40,40,100,0)"
  bar-chip: "#FDFBF7"
  on-bar-chip: "#1B1B47"
  bar-field: "rgba(255,255,255,0.08)"
  bar-field-line: "rgba(255,255,255,0.25)"
  category-1: "#2F8C86"
  category-2: "#282864"
  category-3: "#7A4A86"
  category-4: "#B8873B"
  category-5: "#A0503C"
  band-ground: "#282864"
  band-a: "#2F8C86"
  band-b: "#C8A078"
  band-c: "#A0503C"
  slab-surface: "#1D1F27"
  slab-surface-raised: "#262933"
  slab-on-surface: "#E7E3D8"
  slab-on-surface-muted: "#9AA0AD"
  slab-line: "#33363F"
  slab-line-raised: "#444854"
  slab-on-raised: "#DCD8CD"
  slab-arrow: "#6E737F"
  slab-keyword: "#C48CE0"
  slab-string: "#8FCF9A"
  slab-comment: "#8B91A0"
  slab-function: "#7FB8E8"
  slab-number: "#E0A45C"
  # The two semantics a DIAGRAM needs, added in M16 stage 6. `success` and
  # `caution` are the same value in both themes and read on either ground;
  # `primary` and `category-5` are not, and a frame that never flips needs the
  # lifted values at all times or `info` is a navy stroke on a near-black one.
  slab-info: "#848BD0"
  slab-fault: "#AD5B47"
# An EXTENSION to the format, which has no dark field. Kept as tokens rather
# than prose so it can be checked mechanically, which it is.
dark:
  surface: "#1D1F27"
  surface-raised: "#262933"
  surface-sunken: "#181A21"
  on-surface: "#E7E3D8"
  on-surface-title: "#E9E6E0"
  on-surface-muted: "#9AA0AD"
  on-surface-faint: "#606571"
  line: "#33363F"
  line-strong: "#444854"
  primary: "#848BD0"
  on-primary: "#1D1F27"
  focus: "#AD5B47"
  success: "#2F8C86"
  caution: "#B8873B"
  on-caution: "#20201C"
  # GRAPHIC only, never type: 3.02:1 on `surface-raised` in dark.
  fault: "#AD5B47"
  ornament: "#C8A078"
  category-1: "#2F8C86"
  category-2: "#676DAF"
  category-3: "#91609D"
  category-4: "#B8873B"
  category-5: "#AD5B47"
  band-c: "#AD5B47"
typography:
  sans: '"Avenir Next", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
  body:
    fontFamily: sans
    fontSize: "16px"
    lineHeight: "1.68"
  display:
    fontFamily: sans
    fontSize: "38px"
    fontWeight: "600"
    lineHeight: "1.16"
    letterSpacing: "-0.015em"
  section:
    fontFamily: sans
    fontSize: "25px"
    fontWeight: "600"
    lineHeight: "1.28"
    letterSpacing: "-0.012em"
  subsection:
    fontFamily: sans
    fontSize: "18.5px"
    fontWeight: "600"
    lineHeight: "1.35"
  lead:
    fontFamily: sans
    fontSize: "16px"
    fontWeight: "600"
    lineHeight: "1"
  control:
    fontFamily: sans
    fontSize: "14.5px"
    fontWeight: "500"
    lineHeight: "1"
  item:
    fontFamily: sans
    fontSize: "14px"
    fontWeight: "500"
    lineHeight: "1.3"
  meta:
    fontFamily: sans
    fontSize: "13.5px"
    fontWeight: "400"
    lineHeight: "1.6"
  mark:
    fontFamily: sans
    fontSize: "12.5px"
    fontWeight: "600"
    lineHeight: "1"
  label:
    fontFamily: sans
    fontSize: "12px"
    fontWeight: "600"
    lineHeight: "1"
    letterSpacing: "0.06em"
  code:
    fontFamily: mono
    fontSize: "13.5px"
    lineHeight: "1.75"
  code-meta:
    fontFamily: mono
    fontSize: "12.5px"
    lineHeight: "1"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "6px"
  base: "9px"
  md: "12px"
  lg: "17px"
  xl: "22px"
  2xl: "28px"
  3xl: "44px"
  4xl: "96px"
rounded:
  hair: "2px"
  xs: "3px"
  sm: "4px"
  base: "5px"
  md: "6px"
  lg: "7px"
  xl: "8px"
  pill: "9px"
  disc: "50%"
  arch: "14px 14px 4px 4px"
  leaf: "4px 14px 4px 14px"
layout:
  bar: "58px"
  band: "18px"
  sticky: "76px"
  rail: "262px"
  aside: "204px"
  measure: "80ch"
  fold-at: "1180px"
  rail-at: "880px"
motion:
  ease: "cubic-bezier(.22,.61,.36,1)"
  swift: "120ms"
  fade: "150ms"
  shift: "160ms"
  fold: "200ms"
components:
  bar:
    backgroundColor: bar
    textColor: on-bar
    height: "58px"
    padding: "0 22px"
  bar-item:
    textColor: on-bar-dim
    typography: control
    rounded: base
    padding: "7px 11px"
    height: "32px"
  bar-item-current:
    backgroundColor: bar-chip
    textColor: on-bar-chip
    typography: lead
    rounded: base
  bar-field:
    backgroundColor: bar-field
    textColor: on-bar-dim
    rounded: base
    height: "33px"
    padding: "0 11px"
  bar-icon-button:
    backgroundColor: bar-field
    textColor: on-bar
    rounded: base
    size: "33px"
  menu:
    backgroundColor: surface-raised
    rounded: xl
    padding: "6px"
    width: "214px"
  menu-item:
    textColor: on-surface
    typography: item
    rounded: base
    padding: "7px 10px"
  rail:
    backgroundColor: surface
    width: "262px"
    padding: "16px 12px 48px"
  rail-group:
    backgroundColor: surface-raised
    textColor: on-surface
    typography: control
    rounded: arch
    padding: "9px 12px"
  rail-group-current:
    backgroundColor: surface-sunken
    textColor: on-surface
    typography: lead
    padding: "12px 12px 12px 11px"
  rail-item:
    textColor: on-surface-muted
    typography: item
    rounded: base
    padding: "6px 9px"
  rail-item-current:
    textColor: on-primary
    typography: lead
    rounded: base
  fold-button:
    backgroundColor: surface-raised
    textColor: on-surface-muted
    rounded: md
    size: "28px"
  restore-tab:
    backgroundColor: surface-raised
    textColor: on-surface-muted
    rounded: "0 9px 9px 0"
    width: "26px"
    height: "60px"
  mark-complete:
    backgroundColor: success
    textColor: on-primary
    rounded: disc
    size: "17px"
  tag:
    backgroundColor: surface-raised
    textColor: on-surface
    typography: mark
    rounded: sm
    padding: "4px 10px"
  card:
    backgroundColor: surface-raised
    rounded: leaf
    padding: "17px 20px"
  slab:
    backgroundColor: slab-surface
    textColor: slab-on-surface
    typography: code
    rounded: lg
    padding: "15px 17px"
  slab-header:
    textColor: slab-on-surface-muted
    typography: code-meta
    padding: "9px 13px"
  figure-node:
    backgroundColor: slab-surface-raised
    textColor: slab-on-raised
    typography: meta
    rounded: base
    padding: "9px 13px"
  button-primary:
    backgroundColor: primary
    textColor: on-primary
    typography: lead
    rounded: base
    padding: "11px 20px"
  button-quiet:
    backgroundColor: surface-raised
    textColor: on-surface
    typography: lead
    rounded: base
    padding: "11px 20px"
  pager-item:
    backgroundColor: surface-raised
    rounded: sm
    padding: "13px 15px"
  aside-item:
    textColor: on-surface-muted
    typography: meta
    padding: "5px 0 5px 12px"
  band:
    backgroundColor: band-ground
    height: "18px"
---

# 🎨 DESIGN — The Bazaar language

## Overview

Bazaar is a **glazed-ceramic** language. Everything in it comes from İznik tile: a deep cobalt that
carries the chrome, a powder-white ground that carries the reading, one family of warm sand neutrals
for structure, five saturated glaze hues for categorisation, and exactly one band of lattice
ornament to say the surface was made by someone.

Three ideas explain every token below.

**1. The chrome is dark and the page is light.** The top bar is a solid slab of `bar` cobalt with
white type on it; the ground under it is `surface`, almost white. This is the language's strongest
signal and its most easily lost: a bar drawn on the ground instead of in cobalt turns Bazaar into a
generic light theme. The bar has its own five-token sub-palette — `on-bar`, `on-bar-dim`,
`bar-hover`, `bar-chip`, `bar-field` — because a control sitting on cobalt cannot borrow the values
of one sitting on powder.

**2. The ground is near-white, so structure is drawn with lines, not fills.** `surface-raised`
(pure white) sits on `surface` (`#FDFBF7`) at a luminance ratio of about 1.03 — invisible on its own.
A raised thing is therefore identified by its **hairline**, and removing a border because "the fill
already separates it" is the single most common way to break this language. `surface-sunken` is the
one fill that does read: it is the hover and the pressed state, not a resting surface for text.

**3. Colour classifies; it never carries meaning alone.** The five-hue `category-*` series exists to
tell groups apart at a glance. Each hue is bound to one group and then reused for that group's
marker, its current-state edge and its active item — but always alongside a second signal: a
position, a weight, a size, a word. A viewer who cannot separate the hues must still be able to
read the interface.

**What this file is not.** It is a language, not a product. It names `rail`, `card`, `slab` and
`category-3`; it does not name a page, a route, a framework class, a feature or anything the product
happens to call its content. A surface's *layout* — which panels, in which order, on which screen —
is not part of the language and does not belong here; it belongs to the milestone that builds that
surface, against the mockup it came from. Where this document and the mockup named in `source:`
disagree, **the mockup is right and this document is the bug.**

## Colors

**The neutral family is warm and it is a family.** `surface` → `surface-raised` → `surface-sunken`
is one ladder of sand, and the two line tokens sit on the same ladder: `line` for grouping a set of
things, `line-strong` for the edge of something interactive or hovered. They are close together on
purpose. If a border needs to shout, the answer is a heavier *weight* or a `category-*` hue, never a
darker neutral invented for the occasion.

**Four weights of type colour, and the top two are not interchangeable.** `on-surface` is for
reading. `on-surface-title` — a deeper, bluer ink — is for display and section headings only, and it
is what makes headings feel set rather than merely bold. `on-surface-muted` carries secondary
information a reader will look for: metadata, breadcrumbs, an aside's items, a count they might
count. `on-surface-faint` is for text a reader may ignore entirely — a pending badge, a unit, a
label above a control — and it does **not** meet a 4.5:1 text floor on this ground. A word that is
the only thing telling the viewer something takes `on-surface-muted`, however small it is.

**`primary` is cobalt and it does three jobs**: it fills the bar, it fills the primary action, and it
is the link colour. That overlap is deliberate and it has one consequence worth stating: **no
`category-*` hue may sit within about 20° of `primary`'s hue**, or a category marker will be read as
a link. `category-2` *is* the cobalt, which is the exception that proves it — that category is
identified by the bar's own colour, so nothing about it is ambiguous.

**`focus` is clay, not cobalt — and on the two grounds with their own sub-palette the ring takes that
palette's ink instead.** This file said the clay was chosen so the ring "is visible against cobalt
chrome, against white cards and against the dark slab without changing per context", and told you
never to re-colour it. **MEASURED, and that was false on two of those three**: clay on `bar` is
2.35:1 in light and 2.77:1 in dark, and on the slab's two surfaces 2.56:1 and 2.90:1, against SC
1.4.11's 3:1 for a focus indicator. It clears the floor on the page grounds only, at 5.48:1 and
5.66:1 — and the bar holds the first controls in the tab order on every route, so that was the ring a
keyboard reader met first, everywhere.

So the ring reads a `ring` hook that each ground may rebind, and two do: the bar to `on-bar`
(13.31:1) and the slab to `slab-on-surface` (11.31:1 to 12.82:1). **Nothing is invented — each takes
the ink its own sub-palette already declares**, which is what a sub-palette is for, and the
rebinding travels by inheritance so a nested control needs no second selector.

The old instruction was right in spirit and wrong in fact: **do not tint a focus ring to blend with
its surroundings**, which is how a keyboard path goes quiet. Making it the ground's own ink is the
opposite of blending. Anywhere without a sub-palette, it stays clay.

**`success`, `caution` and `ornament` are glazes, not signals from a traffic light.** Teal `success`
marks a finished thing. Gold `caution` marks something a reader should notice before acting.
`ornament` — the ochre — is decorative only: it draws the dashed rule after a section heading, the
underline under prose links, and the middle stripe of the band. It never carries state. Text set on
a `caution` fill takes `on-caution`, a near-black warm ink: white on gold does not clear a text
floor, and it is the only place in the language where type on a chromatic fill is not white.

**The dark theme is a derivation, and the bar is what anchors it.** The light
palette is the design; the dark one is computed from it, and the computation is
part of the language rather than a footnote to it. **The surfaces are the slab
promoted from a component to the whole page** — the palette already contains a
dark ground with ink proven on it, so almost nothing is new. Every chromatic is
lifted in OKLCH **lightness with hue and chroma held**, until it clears its
floor on all three grounds; hues move by fractions of a degree and half of them
do not move at all. Three things follow that are easy to get wrong:

- **`primary` lifts and the bar does not.** Cobalt cannot be a link on a dark
  ground, and it does not have to be: the language keeps `bar` and `primary`
  apart precisely so one can move without the other. The bar, its five on-bar
  values, the band and the completion disc are identical in both themes, and
  that is the whole reason the two read as siblings.
- **`on-primary` stops being white.** White on the lifted accent measures
  3.19:1 and fails a text floor, while the ground on it reaches 5.15:1. A filled
  primary action in the dark theme therefore carries dark type.
- **`on-surface-faint` has a ceiling, not a floor.** It is for something a
  reader may ignore, so it is lowered until it sits *under* 3:1 rather than
  raised to clear it — the only token in the language checked from above.

The accepted cost, decided rather than overlooked: on the dark ground **the page
and the slab are the same fill**, so a code block is told apart by its hairline.
That is the rule the light theme already lives by, where a white card on a
near-white ground is separated by its border and not its fill.

**The dark slab is a second, complete palette.** Code and diagrams sit on `slab-surface`, and every
value they need is prefixed `slab-`. It is a self-contained set precisely so a slab can be dropped
anywhere without the surrounding ground leaking into it. Syntax colours are tuned against
`slab-surface` alone; a slab on a light card is not a thing in this language.

### The accepted risk, named

**No control in this language clears 3:1 against its own boundary, and that is a decision rather
than an oversight.** MEASURED: a field on the bar reaches 2.19:1 at its edge and 1.26:1 at its fill,
a fold button bordered with `line` reaches 1.55:1, and `line-strong` on the ground reaches 2.00:1.
SC 1.4.11 asks 3:1 for anything required to identify a component.

It follows from the premise. A design whose surfaces are told apart by a hairline on a near-white
ground cannot also have loud control edges without becoming a different design. So **a control is
identified by its shape, its label, its position and its cursor**, and the boundary supports that
rather than carrying it. A viewer who needs more is served by a forced-colour mode, where every
hairline becomes a system colour.

Two things this does not license. **No control may depend on its edge alone** — it needs a shape a
viewer can recognise and a label a reader can read. And `line-strong` must stay strictly stronger
than `line` on every ground in both themes; if the two ever met, the language would have one line
weight while claiming two, and every interactive edge would silently become a grouping edge.

### Where this file knowingly parts from its source

**One value, and it is listed so that no other can be added quietly.** The mockup named in `source:`
outranks this document everywhere else; the single thing that outranks the mockup is a **measured
accessibility floor**, and that took a deliberate decision rather than an agent's judgement.

`slab-comment` is `#8B91A0` here and `#767C88` in the mockup. The mockup's value measures **3.92:1**
on `slab-surface`, and a code comment is *content* — it is the line that explains the three below it
— so it takes the 4.5:1 text floor rather than a decorative one. The same hue lifted until it clears
measures **5.21:1**.

`tests/unit/design/transcription.test.ts` carries this as a named `DEVIATIONS` entry and checks the
entry itself for staleness; `tests/unit/color/contrast.test.ts` is what proves the replacement clears
the floor. Both have to agree for either to pass. **Adding a second entry is the author's decision,
never a way past a red test.**

**A SECOND DEVIATION, AND THE FIRST ONE THAT IS A DECISION RATHER THAN A FLOOR.** `08:44` caps the
home page's display line at `20ch`, and the language transcribed it. **The author overruled it on
2026-09-11**: the first row spans the whole width. The measurement behind his call is that `ch`
resolves against the face — 20ch is 640px in the mockup's 46px system sans and **529px in the
language's 38px face** — and the mockup hides that by drawing its own page 1052px wide, while the
product's page is 1342px at 1440. A 529px heading in a 1342px row leaves two thirds of it empty.

The lede does NOT follow it. A heading is one line of display type and a lede is prose, and prose
keeps a readable measure whatever is around it — which is the same reason `01:182` gives the reading
column one at all. So the lede holds to `--layout-measure` rather than to `08`'s 56ch, and the two
stopped being the same kind of thing. `fidelity.spec.ts` asserts both halves: the display line is
exactly its row, the lede is comfortably inside it.

**This is the only entry in this file that the author decided rather than a measurement forcing.**
The rule stands: the mockup outranks this document, a measured accessibility floor outranks the
mockup (**D34**), and the author outranks all three — stated here so a third entry cannot be added
by an agent reading the first two as precedent.

**And one departure of SCOPE rather than of value, recorded here so it is not mistaken for a
transcription error.** `01:64` states the focus ring once, globally —
`:focus-visible { outline: 2px solid var(--accent2) }` — and the language now lets two grounds rebind
it, for the measured reason above. **It adds no colour and drops none**: the bar takes `on-bar` and
the slab takes `slab-on-surface`, both already declared by the mockup and both already used as ink on
exactly those grounds. So `transcription.test.ts` is untouched by it and needs no second `DEVIATIONS`
entry — that list is about values, and no value moved. What enforces it instead is
`tests/unit/color/contrast.test.ts`, which resolves the `ring` bindings out of the language and
measures each against the ground its selector applies to, in both directions: a binding with no
ground and a ground with no binding both fail. **The fidelity harness does not check it**, and that is
deliberate rather than an omission — a ring is only painted while a control has focus, so comparing a
resting screenshot's facts could never see it, and a guard that cannot see the thing it names is the
failure mode this milestone met four times.

Two related findings, recorded because they are properties of the source rather than of this file.
The mockup italicises a comment; mono italic is refused, so the slant is not transcribed and the
comment is told apart by colour alone, which is what the shipped syntax theme already did. And
`line-strong` measures **2.00:1** on `surface` — under the 3:1 a viewer needs to identify an
interactive component — which is an open question against the source, not a value this file has
changed.

## Typography

**One sans family does all the work.** `sans` is a humanist geometric with a warm, slightly wide
lowercase; `mono` appears only inside a slab and on the smallest code metadata. There is no serif in
this language and no monospace label — a small uppercase mono label is a different design idiom
altogether and it fights the glaze.

**The scale is display / section / subsection / body, and it is set tight at the top.** Display and
section both take negative letter-spacing and `on-surface-title`, so headings read as one
typographic voice and body text as another. Body is `16px` at a generous `1.68` line height, which is
what makes the measure below feel like reading rather than scanning.

**Below body there are five small sizes and they are not decorative variety.** `control` for
anything clickable in chrome, `item` for a row in a list or menu, `meta` for secondary prose,
`mark` for a count or a tag, and `label` — the only tracked size — for the caption above a group of
controls. Reaching for a sixth size is a sign the hierarchy is wrong, not that the scale is short.

**Weight carries emphasis before size does.** `600` is the language's emphatic weight and appears at
every size; `500` is the resting weight for controls and list items; body prose emphasises at `650`,
slightly heavier than a normal bold, because the ground is so light that ordinary bold under-reads.

## Layout

**Three columns, and the middle one takes everything left over.** A fixed `rail` on the leading edge,
a fluid centre, and a fixed `aside` on the trailing edge. The rail and the aside are anchored to the
window's edges, not to a centred container — the language reads as a workbench, not as a document
floating in a page.

**The reading column is centred inside the fluid middle and capped at `measure`.** The cap is what
keeps the line length readable when the window is wide; the centring is what keeps the gutters even
on both sides. The middle column's own padding is fluid, so the gutters grow with the window instead
of the measure growing.

**The chrome stacks to `sticky`.** The `bar` plus the `band` is the height everything sticky sits
below — the rail, the aside, and any in-page sticky element. That single number is why the band can
exist at all without pushing content under the bar.

**Two breakpoints, and they drop the least important thing first.** Below `fold-at` the aside goes,
because an in-page index is the most redundant of the three columns. Below `rail-at` the rail goes
too and the reading column takes the whole window. Nothing reflows into a hamburger and nothing
scrolls sideways at any width: wide content scrolls **inside its own box**.

**The rail folds.** It collapses to zero width over `fold`, the reading column takes the space, and a
small tab pinned to the leading edge — vertically centred, so it can never collide with the sticky
chrome — brings it back. Under `prefers-reduced-motion` the fold is instant.

## Elevation & Depth

**There is almost no elevation, and that is the point.** Nothing floats except things that are
genuinely temporary. A shadow appears in exactly two places: under a menu that has opened over
content, and under the fold's restore tab, which overlaps the page from outside it. Both shadows are
warm and brown-tinted rather than neutral grey — a grey shadow on a sand ground reads as dirt.

**Everything else establishes depth with a line and a fill from the neutral ladder.** A card is white
with a hairline. A hovered row goes to `surface-sunken`. A pressed control does the same. The
language has no elevation scale to reach for, so a request for "more prominence" is answered with
weight, hue or space.

## Shapes

**Radii are small and there are many of them, because each one belongs to a size of thing.** A `2px`
corner on a `9px` swatch and a `7px` corner on a slab are the same *visual* softness at different
scales. Pick the radius that matches the element's size rather than a global default.

**Two shapes carry the language's signature and both are asymmetric.** `arch` — heavily rounded at
the top, nearly square at the bottom — is the top of a group, a doorway; it is what makes a list of
groups read as an arcade. `leaf` — rounded on two opposing corners — is the callout, a tile set at an
angle. Use each exactly where it belongs, never as a general-purpose radius, and never both on one
element.

**A completion mark is a filled disc with a white check inside it.** It is a disc and not a hairline
glyph for a measurable reason: `success` teal against `surface` clears a 3:1 graphical floor but not
a 4.5:1 text floor, so the meaning has to be carried by a **shape** with a fill. Turning it back into
a stroked tick makes the state fail for exactly the viewers it matters most to.

**One ornament, once per page.** The `band` is an 18px lattice of three glaze stripes on cobalt,
finished with a gold rule, and it sits directly under the bar. It is the only decoration in the
language. A second ornament anywhere on the page makes the first one look like a mistake.

## Components

**Chrome.** The `bar` holds a wordmark, a row of `bar-item`s, a flexible gap, then a `bar-field` and
its `bar-icon-button`s. The current destination is a `bar-item-current`: a solid powder chip on
cobalt, which is the strongest contrast the language can make and therefore the right way to say
"you are here". A `bar-item` that owns a set of things opens a `menu` below it — white, hairlined,
softly shadowed, its rows carrying a small hue `key` on the leading edge and a count on the trailing
edge.

**The wordmark is a 2×2 grid of glazed squares**, one per category hue with one square left as the
ground. It is a tile, not a logo, and it is drawn from the same series as everything else.

**The rail.** A `label` caption and a `fold-button` sit at the top. Below them, one `rail-group` per
group, each an `arch`-topped disclosure carrying its hue key, its name and its count. **The current
group is unmistakable and it is emphasised four ways at once**: a larger type size, a sunken fill, a
strong border, and a thick leading edge in the group's own hue. Its count moves from muted to full
ink. Inside a group, `rail-item`s are quiet muted rows; the current item takes the group's hue as a
solid fill with white type; an item that is not yet available carries a small faint outlined badge.

**Reading.** Breadcrumbs in `meta` above a `display` heading, then a row of `tag`s for the piece's
own facts. Sections open with a `section` heading followed by a **dashed ochre rule that fills the
remaining width** — the one place ornament touches the reading column. Prose links are underlined in
ochre rather than coloured differently from body text. A `card` in `leaf` shape holds an aside the
reader can skip.

**Code and figures.** A `slab` has a mono header strip and a scrolling code body. A figure frame uses
the same dark palette, and **its contents scroll inside the frame** — a diagram wider than the
column never widens the page. **The caption is outside the frame**, because it is page ink and would
be unreadable inside it.

**Progress, and the two shapes it takes.** A `track` is a two-tone bar: a sunken groove, a fill in
the group's own hue, and — where a group holds things nobody has written yet — a hatched tail rather
than a third colour, because colour is never the only signal. It comes in a **seam**, square and
flush under a coloured header, and a **bar**, rounded and standing alone in a row. A `dial` is the
same reading as a ring: a conic sweep with an opaque disc knocked out of its middle, holding the
count in words. **The shell mockup contains neither** — it states progress textually, as `3/8` — so
both are derived from the four component mockups, and the choice between two heights and two radii
is recorded where they are declared.

**A dial needs a NUMBER before first paint**, which is the one thing channel A was thought not to be
able to carry. CSS cannot count, and that is why the segmented meter exists; the pre-paint script
can, and it sets one custom property per group. So a `dial` is bound by the same surface that binds
its hue, and a group with nothing bound reads empty — which is the true statement rather than an
absent value.

**A panel is a card with the corner straightened.** Same hairline, same raised fill, a plain radius
instead of the asymmetric `leaf` — because `leaf` is a callout and a settings panel is a container.
It carries a `panel-title`, an optional note, and whatever the surface puts inside it.

**A field is the one primitive the shell mockup has no example of.** It has no `<input>` anywhere: its
search is a `div` dressed as a field. So the field is transcribed from the one mockup that draws a
real one, and every length it gives it lands on the scale already — the control step for its type,
the `lg` radius, a 96px label gutter. It has no focus rule of its own; the ring is clay precisely so
that nothing has to restyle it. **It grows to the touch floor below the phone breakpoint**, which is
a measured accessibility floor outranking a transcribed height.

**A table scrolls inside its own box and states its own minimum.** The minimum is the sum of the
column widths, computed by the component from the columns it is about to draw and handed to the
stylesheet as one custom property — never written down beside them, which is how three surfaces came
to repeat one number and one of them to be wrong about it.

**A destructive control is a quiet button with a tinted edge.** Not a filled red one: the `fault` hue
is a graphic token and its label stays ordinary ink, so the meaning is the word, then the edge, then
the hue. "Erase everything" is the signal and the colour agrees with it.

**A figure REBINDS the page's palette onto itself, and that is the mechanism the whole diagram
treatment rests on.** A drawing is inline SVG generated in the browser, and a diagram library's own
class grammar cannot hold a CSS function — so every colour a diagram asks for is named as an
ordinary surface token, and the frame redeclares those tokens in slab terms. Custom properties
cascade into inline SVG, so one rule puts every drawing on the dark ground with no second stylesheet
and no re-render. Two consequences are not obvious and are both measured. A filled accent inside a
figure carries **dark** type, for the same reason it does on a dark page. And a diagram's strokes are
its **content** rather than a control's edge, so they take the 3:1 graphic floor and not the accepted
risk below: `slab-line-raised` measures 1.80:1 on the slab ground and `slab-arrow` measures 3.47:1.

**Three node roles, and the third is a state rather than a colour.** A node is a raised slab surface
with a hairline. `active` takes a category hue with white type — the one the shell draws — and
`here` takes `primary`. Both are also heavier, so the hue is never the only signal. The attribute is
the same word the rail spends on its current group: one word, one meaning, across the language.

**Actions.** A top-ruled action row holds one `button-primary` — cobalt, white type — beside at most
one `button-quiet`, which is white with a strong hairline. Primary hover brightens the fill rather
than changing the hue. Below that, a two-up `pager` of white hairlined tiles, each with a faint
`mark` label over a titled destination.

**The aside** is a sticky in-page index: a `label` heading, then items indented behind a `line` rail
that turns `primary` on the current item. It is the first thing to go when the window narrows.

## Do's and Don'ts

**Do** draw the top bar in cobalt with white type on every screen, and give controls inside it the
`bar-*` tokens rather than the surface ones.
**Don't** put the bar on the ground, or give it a light fill "for a cleaner look". That one change
removes the language.

**Do** identify a raised surface with its hairline.
**Don't** remove a border because the white fill seems to separate it — on this ground it does not.

**Do** use `on-surface-faint` for something genuinely ignorable, and `on-surface-muted` for anything
a viewer must actually read, however small.
**Don't** let a faint status word be the only thing that says what state something is in.

**Do** bind one `category-*` hue per group and reuse it for that group's key, edge and active item.
**Don't** invent a sixth hue, re-order the series, or use a category hue for a link, a button or a
focus ring.

**Do** pair every colour signal with a second signal — a size, a weight, a position, a word.
**Don't** rely on hue alone anywhere; the interface must survive a forced-colour mode and a viewer
who cannot separate teal from cobalt.

**Do** keep the focus ring 2px with an offset everywhere, and let its colour come from the `ring`
hook — clay on the page grounds, and each sub-palette's own ink on a ground that declares one.
**Don't** pick a ring colour per surface by eye, and don't tint one to blend with what is behind it.
The measurement that forced the hook, and the two grounds that rebind it, are above.

**Do** keep the completion mark a filled disc with a white check.
**Don't** turn it into a stroked glyph; it fails the text floor.

**Do** use `arch` for the top of a group and `leaf` for a callout.
**Don't** apply either as a general radius, and don't put both on one element.

**Do** keep exactly one band of ornament, under the bar.
**Don't** add a second decorative element anywhere.

**Do** let wide content scroll inside its own box.
**Don't** ever let the page body scroll sideways.

**Do** use the type stack as given.
**Don't** substitute a different family, add a serif, or introduce small uppercase mono labels.
