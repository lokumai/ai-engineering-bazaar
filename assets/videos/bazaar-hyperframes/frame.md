---
version: alpha
name: Biennale Yellow — Frame (video / frame layer)
description: >
  Video-first companion to Biennale Yellow's design.md. The unit is the frame (1920×1080). Atoms
  are identical and sacred — warm parchment grounds, a single deep indigo ink, solar yellow deployed
  as bloom / panel / tile underprint, adapted to AI Engineering Bazaar: Fraunces display + Nunito Sans body,
  1px hairline rules as the only border, atmospheric depth (no shadows), and the bottom-right
  pagenum. Composition + frame scale rewritten. Restraint is the rule; motion out of scope.
unit: the frame — 1920×1080 primary; 9:16 and 1:1 documented
principle: atoms are sacred · composition is free · numbers come from the script

colors:
  paper: "#FDFBF7"
  paper-deep: "#E6DAC6"
  sun: "#C8A078"
  sun-soft: "#E6DAC6"
  haze: "#EFE6D6"
  ink: "#1B1B47"
  ember: "#A0503C"
  body-ink: "#20242E"
  muted: "#6A6558"
  line: "#D8CBB4"
  line-strong: "#C3B299"
  cobalt: "#282864"
  teal: "#2F8C86"
  plum: "#7A4A86"
  ochre: "#B8873B"
  brick: "#A0503C"

typography:
  # — reading + data ramp —
  body:    { fontFamily: "Nunito Sans", cqw: 0.85, weight: 400, lineHeight: 1.5, color: "ink" }
  body-lede:{ fontFamily: "Nunito Sans", cqw: 1.25, weight: 500, lineHeight: 1.55 }
  micro-label:{ fontFamily: "Nunito Sans", px: 22, weight: 600, tracking: "0.01em", upper: false }
  rail-label:{ fontFamily: "Nunito Sans", px: 22, weight: 600, tracking: "0.01em", upper: false }
  mono-data:{ fontFamily: "Nunito Sans", cqw: 0.9, weight: 600, tracking: "0", numeric: "tabular-nums" }
  pagenum: { fontFamily: "Nunito Sans", px: 18, weight: 500, tracking: "0", opacity: 0.75, note: "unused in this video" }
  # — display ramp (Fraunces 400, tight, negative tracking) —
  ledger-title:{ fontFamily: "Fraunces", cqw: 1.55, weight: 650, lineHeight: 1.15 }
  strand-title:{ fontFamily: "Fraunces", cqw: 1.7, weight: 650, lineHeight: 1.1 }
  headline-sm:{ fontFamily: "Fraunces", cqw: 2.9, weight: 650, lineHeight: 1.0 }
  headline:{ fontFamily: "Fraunces", cqw: 4.6, weight: 650, lineHeight: 1.06, tracking: "-0.005em" }
  date-rail:{ fontFamily: "Fraunces", cqw: 5.0, weight: 650, lineHeight: 0.96, tracking: "-0.005em" }
  display-it:{ fontFamily: "Fraunces", cqw: 7.0, weight: 650, italic: false, lineHeight: 1.04, tracking: "-0.005em" }
  numeral-md:{ fontFamily: "Fraunces", cqw: 7.5, weight: 650, lineHeight: 0.92, tracking: "-0.01em" }
  display:{ fontFamily: "Fraunces", cqw: 14.6, weight: 650, lineHeight: 0.86, tracking: "-0.018em" }
  numeral-jumbo:{ fontFamily: "Fraunces", cqw: 28.0, weight: 650, lineHeight: 0.84, tracking: "-0.04em" }

spacing:
  pad-edge: "4cqw"
  pad-region: "4.2cqw"
  gap-region: "2.5cqw"

components:
  sun-bloom:
    background: "radial gradient {colors.sun} core → {colors.sun-soft} → {colors.haze} → transparent on {colors.paper}"
    size: "42–70% of the frame, off-center or behind the focal element"
    description: "The primary depth layer. One per frame; a flat parchment frame reads as broken."
  ember-bloom:
    background: "radial {colors.ember} at 15–22% opacity"
    placement: "corner opposite the sun-bloom"
    description: "Subordinate counter-temperature balance; never dominant."
  block-tile:
    backgroundColor: "{colors.sun} at 40–70% opacity"
    layout: "rectangles on an 8×4 grid behind cover/colophon"
    description: "A layered poster underprint."
  yellow-panel:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.ink}"
    rounded: "0"
    border: "none (meets paper directly)"
    description: "Full-bleed column/third — the strongest color statement, ink on top."
  hairline-rule:
    rule: "1px solid {colors.ink} (soft variant: {colors.ink} at 18–20%)"
    description: "The ONLY border — header underlines, footer tops, ledger separators. No thicker rule exists."
  strand-row:
    borderBottom: "1px {colors.ink} 18–20%"
    typography: "{typography.strand-title} + {typography.body}"
    description: "Serif numeral + serif title + sans body. Numbered editorial lists."
  ledger-row:
    borderBottom: "1px {colors.ink} 18–20%"
    typography: "{typography.mono-date} · {typography.ledger-title} · {typography.body} · {typography.mono-data}"
    description: "4-col tabular — mono date · serif title · sans venue · mono duration (right)."
  footer-band:
    borderTop: "1px solid {colors.ink} per cell"
    typography: "{typography.micro-label} + {typography.body-sm}"
    description: "4-column metadata strip at the foot of cover/colophon."
  vertical-rail:
    typography: "{typography.rail-label}"
    transform: "rotated up the left edge"
    description: "Section marker on chapter/divider frames."
  pagenum:
    typography: "{typography.pagenum}"
    color: "{colors.ink} at 75%"
    placement: "bottom-right"
    description: "The only persistent chrome."
---

# Biennale Yellow — Frame (video / frame layer)

## Bazaar adaptation (READ FIRST — overrides the preset prose below)

This frame spec is the biennale-yellow preset bent onto **AI Engineering Bazaar**
(`src/design/bazaar.css` and the home page `playground/10-home-bazaar-street.html`). The frontmatter
above is the truth; where the preset prose disagrees, the frontmatter and this section win.

- **Ground** `paper #FDFBF7` (the site's surface). Never white, never grey. A raised surface is told
  apart by its **hairline** (`line #D8CBB4`, interactive `line-strong #C3B299`), not by a fill or a
  shadow. Radius 5-9px on windows and cards (the site's scale), never pills.
- **Ink** `#1B1B47` for display type and rules; body text `#20242E`; secondary `#6A6558`.
- **Bloom** is a warm lantern glow: `sun #C8A078` core at 25-40% → `haze` → transparent. One per
  frame. The `ember` counter-bloom is brick `#A0503C` at 10-15%.
- **Accents** are the five category hues and nothing else: teal `#2F8C86`, cobalt `#282864`, plum
  `#7A4A86`, ochre `#B8873B`, brick `#A0503C`. Use them as small marks (an underline, a cube, a chip
  edge), never as text colour for body copy and never as a full-bleed fill except the cobalt bar.
- **Type**: display is **Fraunces 650** with `font-variation-settings: "SOFT" 100, "opsz" 96`
  (the home page's headline), tight line-height 0.95-1.05, slight negative tracking. Body and labels
  are **Nunito Sans** (stand-in for the site's Avenir Next, which cannot ship in a render), sentence
  case, **never uppercase, never tracked-out, never mono labels** (the site's DESIGN.md forbids small
  uppercase mono labels). Persian text uses **Vazirmatn**. No JetBrains Mono anywhere.
- **The ornament**: one Iznik tile band, the site's `.bz-band`, 18px tall (scale up to 27px at
  video scale), used at most once per frame:
  `background-color:#282864; background-image: linear-gradient(45deg,#2F8C86 25%,transparent 25% 75%,#2F8C86 75%), linear-gradient(45deg,#C8A078 25%,transparent 25% 75%,#C8A078 75%), linear-gradient(45deg,#A0503C 25%,transparent 25% 75%,#A0503C 75%); background-size:18px 18px,18px 18px,54px 18px; background-position:0 0,9px 9px,27px 0; border-bottom:2px solid #B8873B;`
- **No pagenum, no rotated rail labels, no ledger/footer metadata bands**: they are catalogue chrome
  the bazaar does not have.
- Voice: no em dashes; no "just", "simply", "easy"; no exclamation marks.

## Font loading (Bazaar additions)

```html
<style>
@font-face{font-family:"Nunito Sans";font-style:normal;font-weight:200 1000;src:url("assets/fonts/nunito-sans-latin-wght-normal.woff2")format("woff2")}
@font-face{font-family:Vazirmatn;font-style:normal;font-weight:100 900;src:url("assets/fonts/vazirmatn-arabic-wght-normal.woff2")format("woff2")}
</style>
```


## Brand adaptation (READ FIRST — the frontmatter is the source of truth)

This is the **biennale-yellow** preset remixed onto the captured brand. The YAML frontmatter above (colors · typography · components) is **normative and already correct — use it verbatim.** The prose below is the ORIGINAL preset's intent; read it THROUGH the frontmatter:

- **Fonts** — already set to **Fraunces** (display) / **Avenir Next** (body); ignore any preset font name lingering in prose.
- **Weights** — the brand font ships `{400, 500, 560, 600, 650, 700}` only; every weight is clamped to these — ignore higher preset weights (e.g. 600/700) in prose.
- **Colors** — use the frontmatter hex; preset color NAMES in prose (e.g. "cobalt", "cream") mean the remapped brand values.


## Overview

Biennale Yellow at frame scale is a **literary-editorial system** in the register of an art
biennale catalogue: warm parchment, a single deep indigo ink, and solar yellow as atmosphere. No
cards, no buttons, no shadows, no rounded corners — the structural vocabulary is just **paper, ink,
and yellow.** Depth is delivered by soft radial **sun blooms**, not elevation.

The voice is three faces in rigid roles: **Fraunces** (weight 400, tight line-height,
negative tracking) carries every display, numeral, and quote from 40px to 720px+; **Fraunces** carries
body and the wide-tracked uppercase micro-label; **JetBrains Mono** carries every date, figure, and
the pagenum. Text is **always ink** — contrast comes from size and weight, never color. The mood
sits between a folded museum brochure and a slow-reading literary quarterly: confident, atmospheric,
deeply restrained.

**Key characteristics at frame scale:**

- **Warm parchment ground** on every frame; never white, never gray.
- **Single ink** (`{colors.ink}`) for all type and all rules; **solar yellow** as bloom / panel / tile.
- **Fraunces 400** display (tight, negative-tracked); **Fraunces** body + micro-labels; **JetBrains Mono** data.
- **1px hairline rules** are the only border — no thicker weight exists; **no shadows, no rounded corners**.
- **Sun bloom** is the primary depth layer on every frame; an ember counter-bloom adds warm-cool tension.
- **Editorial-restrained** — sparse reads as elegant; crowding breaks the catalogue feel.

## The Frame

### Frame Craft Bar

Three eyeball tests gate every frame before any structural check:

- **Squint** — one Fraunces moment dominates at 3–6× its neighbor; the sun bloom centers the eye.
- **Silence** — frames read **55–60% empty**; the **ledger is the one dense exception** (density via quiet hairline repetition, not richness).
- **Restraint** — **one ink color** for all type and rules; **one sun bloom** per frame (+ optional subordinate ember); never invert (no yellow text on ink).
- **Reference** — aim at an **art-biennale catalogue / slow exhibition poster / literary quarterly**; failure looks like a **flat CMS template** (no bloom) or a **bordered-card deck**.

- **Primary:** 1920×1080 (16:9). Display authored in **`cqw`** (`px ÷ 1920 × 100 = cqw`).
- **Vertical:** 1080×1920 (9:16). **Square:** 1080×1080 (1:1).
- **Safe area:** `pad-edge` 4cqw (40–76px equivalent) — the elegance depends on edge negative space; only blooms, tiles, and panels bleed.

**The container law (load-bearing).** Every frame ground sets `container-type: size`; ALL
frame-relative units are `cqw`/`cqh` against it — never `vw`. Hairlines stay 1px; bloom sizes scale
as `%` of the frame.

## Colors

Tokens identical to the source. `{colors.paper}` is the universal ground; `{colors.ink}` (deep
indigo navy) is **every line of type and every rule** — there is no secondary text color.
`{colors.sun}` deploys three ways: the **bloom** (radial atmosphere), the **yellow-panel**
(full-bleed poster fill, ink on top), and the **block-tile** underprint. `{colors.sun-soft}`/`haze`
are bloom mid/outer stops. `{colors.ember}` appears **only** as a 15–22% counter-bloom — never a
fill, never text. **The system never inverts** — ink on sun is correct; yellow text on ink does not exist.

## Typography

Two ramps. The **reading/data ramp** (Fraunces body 0.85cqw ink, micro-labels in px, JetBrains Mono
data) carries copy + chrome; the **display ramp** (Fraunces `ledger-title` 1.55cqw →
`numeral-jumbo` 28cqw) carries every headline, numeral, and quote.

- **Legibility floor:** any load-bearing line ≥ **1.4cqw**; mono/labels in px are chrome only.
- **Fit-to-measure:** size the headline to its length. Cap the block at **≤ 78cqw**; ≤3 words → `display`; 4–6 → `headline`; 7+ → `headline-sm`. The jumbo numeral is a divider's whole point — don't shrink it.
- **Fraunces is weight 400 only** (its contrast is the weight signal), tight line-height (0.84–1.06), negative tracking; **micro-labels uppercase Fraunces 600, ≥0.16em**; **mono for all numerals/dates**. No bold serif, no second text color, no mono in body/display.

## Depth & Surface

Atmospheric, not structural. Depth from:

- **Sun bloom** — the primary layer: a layered radial (sun 70–95% core → sun-soft → haze 18–22% → paper 0%), 42–70% of the frame. One per frame.
- **Ember bloom** — a 15–22% peach counter-bloom in the opposite corner; always subordinate.
- **Block-tile underprint** — translucent yellow rectangles on an 8×4 grid (cover/colophon).
- **Yellow panel** — the one "hard" color statement: a flooded column/third, ink on top.
- **Hairline rules** — 1px ink for structural separation (soft 18–20% variant for dense rows).

**Ceiling:** zero box-shadow, zero text-shadow, zero rounded corner, no border thicker than 1px.

## Shapes

- **0 radius on everything** — strict rectangles. Blooms are edgeless (they fade into paper).

## Components

- **sun-bloom / ember-bloom / block-tile** — the atmospheric depth set. **yellow-panel** — the poster-fill statement.
- **hairline-rule** — the only border (1px ink; soft variant for dense rows).
- **strand-row / ledger-row / footer-band** — the editorial list, tabular calendar, and metadata strip.
- **vertical-rail** — rotated chapter marker. **pagenum** — the bottom-right mono chrome.

## Frame Treatments

> Recipe: ground · container · composes · focal · chrome · accent · silence · Fixed/Free · density.
> A sun bloom + bottom-right pagenum on every frame; sparse is the default.

### 1 · Cover (identity · move: display + sun bloom · left)

**Ground** paper + a large sun-bloom (left-of-center) + an ember counter-bloom (opposite corner).
**Composes** micro-label, display, date-rail, footer-band, pagenum. **Focal** a 2-line Instrument
Serif `display` (italic key word) in ink, left, under a micro-label. **Chrome** a serif date-rail
top-right; a 4-column footer-band at the foot. **Accent** the sun bloom + yellow. **Silence** the
bloom holds the open space. **Fixed** ink type, one bloom, 1px footer rules, no shadow. **Free**
title, date, footer cells. **Density** low.

### 2 · Chapter Divider (section · move: jumbo numeral · vertical rail)

**Ground** paper + a corner-anchored sun-bloom. **Composes** vertical-rail, numeral-jumbo,
headline-sm. **Focal** a single huge Fraunces `numeral-jumbo` (≈28cqw) dominating, with a
serif title beneath. **Chrome** a rotated vertical-rail label up the left edge; pagenum. **Accent**
the bloom behind the numeral. **Silence** ~60%. **Fixed** serif 400, jumbo numeral, rail label.
**Free** the ordinal, title, rail text. **Density** low.

### 3 · Ledger (catalog · move: hairline tabular rows · the dense frame)

**Ground** paper (bloom optional, subtle). **Composes** headline-sm + micro-label topbar, ledger-rows.
**Focal** a 4-column tabular calendar — mono date · serif title · sans venue · mono duration —
separated by hairline-soft rules under a 1px ink header rule. **Chrome** pagenum. **Accent** none —
density through quiet repetition, not color. **Silence** tight — the density exception (achieved by
repetition, not richness). **Fixed** hairline rules, mono dates, serif titles. **Free** rows, venues.
**Density** dense-exception.

### 4 · Manifesto / Quote (quote · move: italic serif · centered bloom)

**Ground** paper + a centered sun-bloom. **Composes** numeral-lg quote mark, display-it, attribution.
**Focal** a 2-line Fraunces **italic** `display-it` quote in ink, centered, under an
oversized serif quote mark. **Chrome** a micro-label attribution. **Accent** the centered bloom.
**Silence** ~60% — deliberately open. **Fixed** italic serif, one bloom, ink. **Free** quote,
attribution. **Density** low.

### 5 · Poster Panel (statement · move: yellow panel · split)

**Ground** paper with a full-bleed `{colors.sun}` `yellow-panel` (column or third). **Composes**
yellow-panel, micro-label, headline. **Focal** an Fraunces `headline` in ink sitting **on
the sun panel** (ink-on-yellow — a signature). **Chrome** micro-label; pagenum. **Accent** the panel
itself. **Silence** the paper side stays open. **Fixed** ink-on-sun, panel meets paper directly (no
border), no shadow. **Free** headline, panel side/width. **Density** low.

### 6 · Strand List (programme · move: numbered editorial rows · left)

**Ground** paper + a subtle sun-bloom. **Composes** micro-label, headline-sm, strand-rows. **Focal**
a numbered list — serif numeral + serif title + sans body, hairline-soft separators. **Chrome**
micro-label; pagenum. **Accent** the bloom. **Silence** moderate; rows breathe. **Fixed** serif
numerals, hairline-soft rules. **Free** items, copy. **Density** standard.

## Composition Rules

### Do

- Start on **warm parchment**; add **one sun bloom** (optionally an ember counter-bloom) — atmosphere is the depth.
- Set every line in **ink**; use **Fraunces 400** (tight, negative-tracked) for display, **Fraunces** body, **JetBrains Mono** for all numerals/dates.
- Make every separator a **1px ink hairline** (soft variant for dense rows); flood a **yellow panel** for poster moments (ink on top).
- Keep micro-labels **uppercase Fraunces 600, 0.16–0.32em**; pin the **pagenum** bottom-right.
- Lean sparse; left/asymmetric on cover/chapter/list, centered on manifesto.

### Don't

- No drop shadows, no rounded corners, no bordered cards, no border thicker than 1px.
- No second text color; no bold Fraunces; no inverted ink grounds.
- No mono for body/display; no font substitutes.
- Don't crowd the canvas — sparse reads as elegant; don't omit the bloom (flat parchment reads as a CMS template).
- Don't blow a headline edge-to-edge — step the ramp down.

## Aspect-Ratio Behavior

| Treatment       | 16:9                                           | 9:16                       | 1:1                        |
| --------------- | ---------------------------------------------- | -------------------------- | -------------------------- |
| Cover           | display left, date-rail top-right, footer foot | display top, footer stacks | display upper, footer foot |
| Chapter Divider | jumbo numeral, rail left                       | numeral centered, rail top | numeral centered           |
| Ledger          | 4-col rows                                     | drop venue col → 3-col     | 3-col                      |
| Manifesto       | centered italic                                | centered, taller           | centered                   |
| Poster Panel    | side panel + paper                             | top/bottom panel band      | panel third                |
| Strand List     | numbered rows                                  | rows (tighter)             | rows                       |

`pad-edge` holds on the short edge; display clamps use the shorter axis so portrait doesn't blow out
headlines. Keep load-bearing lines ≥ 1.4cqw. Ledger/strand fixed first columns may tighten on 9:16.

## Approved Entities

No real customers, logos, or vendors are defined in the source — render any such mark as a
placeholder. Programme titles, venues, and dates are content; the system supplies paper, ink, yellow.

## Numerals & Claims (hard rule)

Never invent figures, dates, durations, or counts at frame scale. Render slots as `— figure —`,
`{metric}`, `NN JUN`, `N m`. Ledger dates/durations and chart values especially carry placeholders
until the script supplies them. Chapter ordinals (01, 02…) are decorative.

## Pre-Render Self-Audit

- **Squint** — one serif display moment dominates; the bloom centers the eye.
- **Silence** — sparse frames 55–60% open; only the ledger runs dense (via repetition, not richness).
- **One color** — ink for all text + rules; sun for bloom/panel/tile; ember counter-bloom only; no inversion.
- **Type** — Fraunces 400 tight negative-tracked, fit-to-measure; micro-labels uppercase 0.16em+; mono numerals; ≥1.4cqw floor.
- **Depth** — 0 shadow, 0 rounded corner, 1px hairlines only; one sun bloom present.
- **Anchor** — left on cover/chapter/list, centered on manifesto; pagenum bottom-right.
- **Fabrication** — every numeral/date traces to the script, else placeholder.

## Known Gaps

- **Motion intentionally out of scope.** frame.md specifies composition only; the source's 280ms crossfade is a deck mechanic.
- **Fraunces + Fraunces + JetBrains Mono via Google Fonts.** CJK: Smiley Sans (display) / Noto Serif SC (body) / Noto Sans SC (labels); italic serif and mono tabular figures have no exact Hanzi equal — keep ledger dates Latin.
- **9:16 / 1:1 are guidance**; the `min(vw,vh)` clamp pattern keeps display from blowing out — verify per ratio.
- Sun/ember blooms, block tiles, yellow panels, and hairline rules are CSS-only; no external imagery is required.


## Font loading (auto-generated)

The brand font ships as local files in `assets/fonts/` — do NOT link Google Fonts for it. Paste this `<style>` into every frame's `<head>`/`<template>` (captions use the same files) so `font-family` resolves in preview, snapshot, and render alike:

```html
<style>
@font-face{font-family:Fraunces;font-style:normal;font-weight:100 900;font-display:swap;src:url("assets/fonts/captured-85fcf895b86d74a6-s.3pdm20a023wv-.woff2")format("woff2");unicode-range:U+102-103,U+110-111,U+128-129,U+168-169,U+1A0-1A1,U+1AF-1B0,U+300-301,U+303-304,U+308-309,U+323,U+329,U+1EA0-1EF9,U+20AB}
@font-face{font-family:Fraunces;font-style:normal;font-weight:100 900;font-display:swap;src:url("assets/fonts/captured-5307092570128b5a-s.16191ingcc7md.woff2")format("woff2");unicode-range:U+100-2BA,U+2BD-2C5,U+2C7-2CC,U+2CE-2D7,U+2DD-2FF,U+304,U+308,U+329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:Fraunces;font-style:normal;font-weight:100 900;font-display:swap;src:url("assets/fonts/captured-b67966e0b83b2cd0-s.p.0fuf3937kiol3.woff2")format("woff2");unicode-range:U+??,U+131,U+152-153,U+2BB-2BC,U+2C6,U+2DA,U+2DC,U+304,U+308,U+329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
</style>
```
