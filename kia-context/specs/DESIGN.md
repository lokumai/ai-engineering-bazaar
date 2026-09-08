---
description: >
  The design system, in the DESIGN.md format — a machine-readable token block paired with prose
  explaining what each token means and when to reach for it. Written so an agent building an interface
  has both the exact values and the intent behind them. It starts generic and becomes specific to this
  product as the interface finds its own look; both states are correct, and the agent updates it as the
  design moves.
  NOT here: component implementation, framework class names, or why an option was rejected
  (BRAINSTORM.md).
authority: blueprint
writes: agent, as the interface evolves
status: active
covers: "the interface as shipped on 2026-09-08 — being replaced, see the warning below"
last_updated: "2026-09-08"
---

---
name: "Hidden Line"
description: "An engineering drawing set: paper, hairlines, zero radius, one orange accent. Being retired."
colors:
  primary: "oklch(0.585 0.196 32)"
  on-primary: "#FFFFFF"
  surface: "oklch(0.976 0.004 85)"
  on-surface: "oklch(0.22 0.012 250)"
  surface-raised: "oklch(0.995 0.002 85)"
  surface-sunken: "oklch(0.945 0.005 85)"
  on-surface-muted: "oklch(0.52 0.010 250)"
  on-surface-faint: "oklch(0.68 0.008 250)"
  line: "oklch(0.86 0.006 250)"
  line-strong: "oklch(0.64 0.010 250)"
  line-cut: "oklch(0.42 0.010 250)"
  caution: "oklch(0.72 0.13 75)"
  verify: "oklch(0.60 0.09 165)"
  fault: "oklch(0.50 0.16 12)"
  info: "oklch(0.53 0.11 245)"
  cat-fundamentals: "oklch(0.605 0.150 350)"
  cat-intermediate: "oklch(0.605 0.128 138)"
  cat-expert: "oklch(0.605 0.130 288)"
  cat-ecosystem: "oklch(0.605 0.098 200)"
  cat-protocols: "oklch(0.605 0.115 54)"
typography:
  h1:
    fontFamily: "IBM Plex Sans Condensed"
    fontSize: "2.625rem"
    fontWeight: "700"
    lineHeight: "1.1"
  h2:
    fontFamily: "IBM Plex Sans Condensed"
    fontSize: "1.875rem"
  h3:
    fontFamily: "IBM Plex Sans Condensed"
    fontSize: "1.5rem"
  body:
    fontFamily: "Source Serif 4"
    fontSize: "1.0625rem"
    lineHeight: "1.6"
  ui:
    fontFamily: "IBM Plex Mono"
    fontSize: "0.875rem"
  meta:
    fontFamily: "IBM Plex Mono"
    fontSize: "0.8125rem"
  code:
    fontFamily: "IBM Plex Mono"
    fontSize: "0.9375rem"
rounded:
  none: "0px"
  sm: "0px"
  md: "0px"
  lg: "0px"
spacing:
  unit: "4px"
strokes:
  hair: "1px"
  struct: "1.5px"
  cut: "2px"
  dash-hidden: "3 2"
  dash-axis: "6 2 1 2"
  dash-leader: "2 2"
widths:
  shell: "1200px"
  prose: "656px"
  wide: "920px"
  rail-left: "208px"
  rail-right: "240px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    borderRadius: "{rounded.none}"
---

# 🎨 DESIGN — The design system

> ## ⚠️ This system is being replaced
>
> Everything below is a true record of what ships **today**, kept because the replacement has to know
> what it is replacing and what it must not lose. The author's judgement on 2026-09-08: *"It is far
> from a best-practice, professional and easy-to-use UI."*
>
> Four candidate directions are built and viewable at `playground/index.html`, and the choice is open
> — see `logs/BRAINSTORM.md` **D10** and **O1**, and `logs/PROGRESS.md` **M8**. **Do not build new
> interface against the tokens below without checking whether M8 has landed.**

---

## Overview

The whole interface is one metaphor: **the curriculum is an engineering drawing set.** A module is a
numbered sheet, a category is a subsystem, a written module is *drawn* and an unwritten one is *not
drawn*, the panel of facts on a module page is a *title block*, and the reader is a *drafter* who
*signs off* a sheet.

It is carried through completely and consistently. It is also, in one sentence, the problem: a
first-time reader has to learn a private vocabulary and an unfamiliar layout before they can read a
course. `specs/ARCHITECTURE.md` §9 lists every term and its reader-facing candidate.

The visual language that follows from the metaphor:

- **Paper, not white.** A warm off-white ground with an ink that is nearly black but tinted blue.
- **Lines carry meaning, not decoration.** Three stroke weights and three dash patterns, each with a
  fixed meaning borrowed from drafting convention: hairline for ordinary structure, 1.5px for a
  structural edge, 2px for a cut, `3 2` dashes for something hidden.
- **Zero radius everywhere.** Every one of the nine radius tokens is `0px`. This is deliberate and it
  is the single strongest signal of the whole look.
- **Monospace for data, serif for prose.** Body copy is a serif at 17px; every label, count and piece
  of metadata is monospaced.
- **One accent.** A single orange, used for focus, selection and interaction, and nothing else.

## Colors

Everything is authored in **oklch** so that lightness is comparable across hues, which is what lets
five category colours sit at one lightness and none of them outrank another.

**The five category hues are all at L=0.605** and differ only in hue and chroma. Each has a `-half`
variant at exactly half the chroma, used for a category that has been started but not finished. The
five are named as flavours in the mascot legend: GÜL, FISTIK, LAVANTA, NANE, KAHVE. A sixth, KAYMAK,
was removed on 2026-09-08 with the Optional category.

**There is no per-category grey.** A category with nothing signed off is drawn in the ordinary
structural line, not in a desaturated version of its own hue. Inventing one failed twice when
measured: 2.11:1 against the sunken surface, and indistinguishable from the palest flavour's
completed state.

**Four semantic colours** carry state rather than identity: caution, verify, fault, info. Each has an
`-ink` variant for text and a `-wash` variant at low alpha for a background.

**Colour is never the only signal.** This is `MANIFESTO.md` rule 15 and it is enforced: contrast and
palette tests recompute every ratio from the shipped stylesheets rather than asserting a table, and a
Playwright spec loads the site under `forced-colors: active`.

## Typography

Three families, each with one job:

| | Family | Used for |
|---|---|---|
| Display | IBM Plex Sans Condensed | every heading, and the sheet index number |
| Body | Source Serif 4 | prose, and only prose |
| Mono | IBM Plex Mono | labels, counts, metadata, code |

The scale runs from `0.6875rem` for a mark up to `3.5rem` for the index number, in eleven steps. The
prose measure is **656px**, chosen for 68 to 72 characters a line.

**The mono-for-all-metadata rule is the second strongest signal of this look**, and it is the one most
likely to go in the revision: it makes every label read as data rather than as language.

## Layout

A three-column shell at 1200px: a 208px left rail, a 656px prose column, a 240px right rail. Below
1024px the two rails move into a drawer and the prose column is alone.

**Two page anatomies, chosen by the module's status**, not by the author: `A0` for a written module,
`A4` for an unwritten one. A third format existed and was removed — it differed from `A0` only in
where the metadata sat, which moved the prose 132px between two sheets of one curriculum.

**A known defect in this layout:** a diagram wider than the prose column escapes its container and
paints across both rails. Measured at 1440px on 2026-09-08: an SVG 1,423px wide starting at x=144
against a column that runs 376 to 1032. See `logs/BRAINSTORM.md` D10.

## Elevation & Depth

**There is none.** No shadows, no gradients, no blur. Depth is expressed by three surface tones —
paper, cleared, sunken — and by line weight. A drawing has no z-axis, so neither does this.

## Shapes

Every radius token is `0px`. Nine of them exist so that a future decision can change the look in one
place, and all nine are currently zero.

**`border-width: var(--stroke-struct)` fails a test.** Chrome floors border widths to whole pixels, so
the 1.5px structural weight must be painted as a gradient or as a height, never as a border.

## Components

The mark is a **cube in 30° isometric projection**, whose faces map to the categories. Three faces are
drawn and three face away; a face carries its category's flat hue when that category has been started.
Its construction rule is the design system's rule: what is built is solid, what is not yet built is
dashed. No face, no eyes, no limbs, no gradient, no animation, at any size, in any variant. A state
change is a repaint, not a transition.

It had six faces for six categories until 2026-09-08. It now maps five, and the sixth is one of the
three that were never drawn.

## Do's and Don'ts

**Do** derive every number a page states about itself. **Do** give every wide thing its own horizontal
scroller. **Do** keep channel A — the pre-paint stamp — free of React.

**Don't** add a radius, a shadow or a gradient to this system; they are absent by decision, not by
omission. **Don't** use colour as the only carrier of a state. **Don't** write a second spelling of a
status: `NOT DRAWN`, never `NOT YET DRAWN`. **Don't** put an exclamation mark, praise, or the words
"just", "simply" or "easy" in any reader-visible string; a test rejects all of them.
