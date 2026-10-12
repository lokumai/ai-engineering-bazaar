---
format: 1920x1080
duration: 30s
message: "AI engineering, written by the people who build it: short, human, pictures first, and free"
arc: Hook → Product intro (the real site) → three proofs on the street → product proof → CTA
audience: developers and students who want to become AI engineers, tired of AI content that is guesswork
mode: autonomous
music: none
---

# AI Engineering Bazaar — 30 s promo (Hyperframes cut)

No narration. Every line is on-screen text; the `voiceover` field below is the on-screen copy each
frame reveals, and reveals are paced to it exactly as they would be to a spoken line. Music is a host
bed (`audio_meta.json`, ende.app vol. 12 from its 8.74 s downbeat, 110 BPM, one beat = 0.5455 s).
Every frame boundary sits on a beat: 0, 3.273, 7.636, 11.455, 14.727, 18.545, 22.364, 26.182, 30.0.

## Video direction

- **Palette** (from `frame.md`): ground paper `#FDFBF7`; display ink `#1B1B47`; body `#20242E`;
  secondary `#6A6558`; hairlines `#D8CBB4`. One warm lantern bloom per typographic frame (`sun
  #C8A078` → haze → paper). Accents are the five category hues only (teal `#2F8C86`, cobalt
  `#282864`, plum `#7A4A86`, ochre `#B8873B`, brick `#A0503C`), as small marks. The Iznik tile band
  (`frame.md` § Bazaar adaptation, the site's `.bz-band`) appears in Frame 1 and Frame 8 only.
- **Type**: Fraunces 650 SOFT 100 for every headline (the site's home headline); Nunito Sans for
  every small line; Vazirmatn for Persian. Sentence case everywhere. No uppercase labels, no mono.
- **Footage frames (2 to 5)** are one continuous shot: `assets/walk.mp4`, the site's real Bazaar
  Street walk. All four frames frame it identically, so the cuts between them are invisible:
  the video covers the frame at 1920x1080 (`object-fit: cover`), then is scaled **1.08 about its
  bottom centre** (`transform-origin: 50% 100%`), which crops the site's bar and tile band off the
  top. Each frame plays its own slice via `data-media-start` (the slices are back to back). No
  overlays, no extra camera moves on the footage: the walk already has its own camera, and the
  signs on it are the copy.
- **Motion grammar**: `power3` long-tail settles, no bounce, no overshoot. Reveal each piece when
  its line is due (per-word staggered reveal for headlines). Hold the read once settled: stillness,
  at most subtle jitter. No lazy breathing, no back-half push. Every line holds at least 0.3 s per
  word after it has fully landed.
- **Rhythm**: Frame 1 builds; Frames 2 to 5 are the site moving on its own (the long held stretch);
  Frames 6 and 7 are the product proof, brisk; Frame 8 lands and holds still to the end.
- **Negative list**: no stock imagery, no purple-blue AI gradients, no bokeh, no device mockups
  with phones, no cursor, no bar/nav chrome outside the footage, no pagenum, no rotated rails, no
  uppercase tracked labels, no mono, no em dashes, no exclamation marks. Neither failure mode:
  no slideshow (front-load then freeze), no screensaver (many things drifting).
- **Caption band**: no captions in this video; still keep important content above the bottom ~12%.

## Frame 1 — Hook

- scene: on warm paper, a line builds word by word and lands on "guesswork."
- voiceover: "A lot of AI content online | is guesswork."
- duration: 3.273s
- transition_in: cut
- status: animated
- src: compositions/frames/01-hook.html
- type: hook
- persuasion: Pain validation
- beat: skepticism
- blueprint: kinetic-type-beats (Adapt)
- focal: the headline
- roles: tile band = supporting (top edge ornament); bloom = background
- asset_candidates:

narrativeRole: name the viewer's real frustration before naming the product.
keyMessage: most of what you read about AI engineering online is guesswork.

Adapt: keep the statement build onto a payoff word; the payoff is one word, "guesswork.", which lands
last and gets a hand-drawn brick `#A0503C` underline that self-draws beneath it.
Scene 1 (0.0–0.25s): paper ground with the lantern bloom upper left (sun at ~30%); the Iznik tile
band wipes in left to right across the very top edge (27px tall) — full-width strip.
Scene 2 (0.2–1.3s): "A lot of AI content online" assembles word by word (per-word staggered reveal,
`dynamic-content-sequencing`), Fraunces `headline`, ink, left-aligned at the left third, vertically
centred, max width ~70% — asymmetric 70/30.
Scene 3 (1.1–1.6s): "is guesswork." lands as the second line on the same left edge (same reveal);
then the brick underline self-draws under "guesswork." (`svg-path-draw`, ~0.35 s).
Scene 4 (1.6–3.273s): hold still; the full sentence reads for ~1.7 s. No drift.

## Frame 2 — The front door

- scene: the real site: its own headline over the arched gate, then the camera pushes through the gate into the street
- voiceover: "AI engineering, written by the people who build it."
- duration: 4.364s
- transition_in: crossfade 0.35s
- status: animated
- src: compositions/frames/02-gate.html
- type: product_intro
- persuasion: Show-don't-tell proof
- beat: curiosity
- blueprint: compose
- focal: assets/walk.mp4
- roles: walk.mp4 = background (full-bleed, undimmed)
- asset_candidates: assets/walk.mp4 — [video] the home page's real Bazaar Street walk: hero over the gate, push through the gate, three signs on the street
- media_start: 0.000
- handoff_out: walk.mp4 at x 960 (centre), y bottom-anchored, scale 1.08 about 50% 100%, opacity 1, playing forward at 1x; next frame continues at media 4.364

narrativeRole: show the product itself at once; its own headline is the promise.
keyMessage: this is AI engineering written by working engineers.

Compose: one video clip, no overlay.
Scene 1 (0.0–2.6s): the site's hero reads on its own: "AI engineering, written by the people who
build it." above the gate (it is in the footage). Video framed per Video direction. Nothing added.
Scene 2 (2.6–4.364s): the footage pushes through the gate on its own; nothing added. The crossfade
from Frame 1 works because both grounds are the same paper.

## Frame 3 — Written by humans

- scene: the camera arrives at the scribe's stall; the sign swings in: "Written by Humans. No AI Slop."
- voiceover: "Written by Humans. | No AI Slop."
- duration: 3.818s
- transition_in: cut
- status: animated
- src: compositions/frames/03-humans.html
- type: benefit_highlight
- persuasion: Authority by association
- beat: trust
- blueprint: compose
- focal: assets/walk.mp4
- roles: walk.mp4 = background (full-bleed, undimmed)
- asset_candidates: assets/walk.mp4 — [video] the Bazaar Street walk, the "Written by Humans. No AI Slop." sign beside the scribe stall
- media_start: 4.364
- handoff_in: walk.mp4 continues from media 4.364, same framing (scale 1.08 about 50% 100%), opacity 1, 1x
- handoff_out: walk.mp4 continues at media 8.182, same framing

narrativeRole: the first reason it is different: humans who build this for a living wrote it.
keyMessage: written by AI engineers, not generated.

Compose: the footage is the shot. Scene 1 (0.0–1.2s): the camera pans to the stall; the sign swings
in (in the footage). Scene 2 (1.2–3.818s): the sign holds on the left, the quill writes a page on
the right (in the footage). Nothing added.

## Frame 4 — Only the essentials

- scene: the next stall, a brass scale weighing lokum; the sign "We only cover essentials. A cheatsheet for AI engineering, not a textbook."
- voiceover: "We only cover essentials. | A cheatsheet, not a textbook."
- duration: 3.273s
- transition_in: cut
- status: animated
- src: compositions/frames/04-essentials.html
- type: benefit_highlight
- persuasion: Friction reduction
- beat: ease
- blueprint: compose
- focal: assets/walk.mp4
- roles: walk.mp4 = background (full-bleed, undimmed)
- asset_candidates: assets/walk.mp4 — [video] the Bazaar Street walk, the "We only cover essentials." sign beside the scale stall
- media_start: 8.182
- handoff_in: walk.mp4 continues from media 8.182, same framing, opacity 1, 1x
- handoff_out: walk.mp4 continues at media 11.455, same framing

narrativeRole: the second reason: it is short on purpose.
keyMessage: a cheatsheet for AI engineering, not a textbook.

Compose: the footage is the shot. Scene 1 (0.0–1.1s): pan to the scale stall, the sign swings in.
Scene 2 (1.1–3.273s): sign holds left, the scale weighs on the right. Nothing added.

## Frame 5 — Pictures do the work

- scene: the pictures stall: a diagram, an easel, a sunglasses meme; the sign "Pictures do most of the work."
- voiceover: "Pictures do most of the work."
- duration: 3.818s
- transition_in: cut
- status: animated
- src: compositions/frames/05-pictures.html
- type: benefit_highlight
- persuasion: Show-don't-tell proof
- beat: delight
- blueprint: compose
- focal: assets/walk.mp4
- roles: walk.mp4 = background (full-bleed, undimmed)
- asset_candidates: assets/walk.mp4 — [video] the Bazaar Street walk, the "Pictures do most of the work." sign beside the pictures stall
- media_start: 11.455
- handoff_in: walk.mp4 continues from media 11.455, same framing, opacity 1, 1x

narrativeRole: the third reason: diagrams, code and the occasional meme carry the ideas.
keyMessage: you learn by seeing it drawn.

Compose: the footage is the shot. Scene 1 (0.0–1.15s): pan to the pictures stall, the sign swings
in. Scene 2 (1.15–3.818s): sign holds left; the stall's screens come alive on the right. Nothing
added.

## Frame 6 — Real modules

- scene: a real module page (AI Agents, its bell-curve meme figure) rises in a window; beside it "19 modules." and "20 to 30 minutes each."
- voiceover: "19 modules. | 20 to 30 minutes each."
- duration: 3.818s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/06-modules.html
- type: feature_showcase
- persuasion: Statistical proof
- beat: clarity
- blueprint: device-surface-showcase (Adapt)
- focal: assets/module-agents-figure.png
- roles: module-agents-figure.png = cutout (the window's content)
- asset_candidates: assets/module-agents-figure.png — the AI Agents module mid-page, FIG. 6.1 "An LLM in a loop with an objective", the course's own bell-curve meme

narrativeRole: prove there is a real course behind the street, and that it is short.
keyMessage: 19 short modules, each one a sitting.

Adapt: keep the floating-window hero holding a real page; no device, no cursor, no screen cycling.
The window is a 9px-radius rectangle with a 1.5px `line-strong` hairline and no shadow, filled
with the plate cropped to the content column and the figure (crop the plate's left rail off: show
plate CSS x 560-1480, y 60-660, i.e. the figure, its caption and the first heading).
Scene 1 (0.0–0.7s): paper ground, bloom behind the right half; the window rises into the right
58% of the frame from slightly below and settles (`power3`), tilted ~-2° then straightening to 0°.
Scene 2 (0.6–1.6s): "19 modules." lands on the left (Fraunces `display`-scale numeral "19" with
"modules." beside or under it in `headline`), per-word reveal; the "19" counts up 0→19 as it
lands (`counting-dynamic-scale`, short, ~0.5 s).
Scene 3 (1.5–2.1s): "20 to 30 minutes each." rises under it in Nunito Sans `body-lede`, muted ink.
Scene 4 (2.1–3.818s): hold still; everything reads.

## Frame 7 — Three languages

- scene: the same module title in three windows' worth: English, then Turkish, then Persian right to left; the line "Every finished module, in three languages."
- voiceover: "Every finished module, in three languages."
- duration: 3.818s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/07-languages.html
- type: feature_showcase
- persuasion: Rule of three
- beat: belonging
- blueprint: fixed-anchor-cycle (Adapt)
- focal: assets/module-llms-fa.png
- roles: module-llms-en.png = supporting; module-llms-tr.png = supporting; module-llms-fa.png = cutout
- asset_candidates: assets/module-llms-en-title.png — the "LLM Fundamentals" title band in English; assets/module-llms-tr-title.png — the same band in Turkish, "LLM Temelleri"; assets/module-llms-fa-title.png — the same band in Persian, «مبانی LLM», right to left

narrativeRole: the course is not English-only.
keyMessage: read every finished module in English, Turkish or Persian.

Adapt: keep the pinned anchor line while one region cycles by hard cut; the cycling region is the
page window, and a small language chip under it names the language in its own script.
The window: same style as Frame 6, showing each plate cropped to the title block (plate CSS x
560-1480, y 80-480: breadcrumb, title, meta, top of the objectives card).
Scene 1 (0.0–0.8s): the anchor line "Every finished module, in three languages." reveals word by word at
the top left (Fraunces `headline-sm`, ink); the window settles in under it on the right with the
English plate; chip "English" (Nunito Sans, ink on paper, 1.5px teal hairline, 5px radius).
Scene 2 (1.35s): hard cut (on the beat) to the Turkish plate; chip "Türkçe".
Scene 3 (2.45s): hard cut (on the beat) to the Persian plate; chip «فارسی» in Vazirmatn.
Scene 4 (2.45–3.818s): hold on Persian; still.

## Frame 8 — Free, and the way in

- scene: "Free. No account needed." then the lokum logo locks up with the name and the address
- voiceover: "Free. No account needed. | AI Engineering Bazaar | lokumai.github.io/ai-engineering-bazaar"
- duration: 3.818s
- transition_in: crossfade 0.3s
- status: animated
- src: compositions/frames/08-cta.html
- type: cta
- persuasion: Risk reversal
- beat: urgency-to-act
- blueprint: logo-assemble-lockup (Adapt)
- focal: assets/logo-6451a893.svg
- roles: logo-6451a893.svg = cutout (the brand mark)
- asset_candidates: assets/logo-6451a893.svg — the brand mark, three lokum cubes in the category colours

narrativeRole: remove the last objection and hand over the address.
keyMessage: it is free, nothing to sign up for, and here is where it lives.

Adapt: keep the mark coming to exist on a cleared stage, then holding to the final frame.
Scene 1 (0.0–1.0s): paper ground, bloom centred; "Free. No account needed." reveals word by word,
centred (Fraunces `headline`).
Scene 2 (1.0–1.35s): that line lifts up and shrinks into a small line above centre (scale-swap), as
the lokum logo springs up at centre (spring-pop entrance with a smooth settle, no bounce), the three
cubes landing one after another (index stagger).
Scene 3 (1.35–1.9s): "AI Engineering Bazaar" (Fraunces `headline`, ink) reveals to the right of the
logo; under it the address "lokumai.github.io/ai-engineering-bazaar" (Nunito Sans `body-lede`,
cobalt). The Iznik tile band wipes across the bottom edge (27px).
Scene 4 (1.9–3.818s): hold perfectly still to the end; the music fades out under it.
