# Mobile milestone: plan

Branch `feat/mobile`, worktree `.claude/worktrees/mobile`. Desktop (>= 1024px, and in practice >= 768px) must render byte-for-byte as before; every change below sits inside `@media (max-width: 767px)`, `(pointer: coarse)`, or `(max-height: 500px) and (orientation: landscape)` blocks.

Screenshots: `shots/before/` (origin/main) and `shots/after/` (this branch), kept outside the repository; the paths below name them. Name pattern `<route>-<width>-<theme>-<slice>.png`; slice n is the viewport scrolled n screens down. Baseline numbers come from a script that loads each route at 390x844 (isMobile, hasTouch, DPR 2) on the built `out/`.

## What was measured at 390x844 (origin/main)

| Finding | Evidence | Cause |
| --- | --- | --- |
| P1. The top bar shows Catalog, Progress and a cut-off "Caravan"; Home (dropped at 1180), About and most of Caravan are unreachable without an unmarked sideways swipe | `shots/before/_-390-light-0.png`, `_caravan_-390-light-0.png` | `src/app/shell.css:223-229` scrolls the nav list inside the bar, scrollbar hidden, no cue |
| P2. Bar controls are 32-33px (search, track switch 30x25, flag, theme); nav links 32px tall | audit on all 15 routes: 21-28 sub-44px targets per page from the bar alone | `bazaar.css` `.bz-bar-icon`; `shell.css:395-415` narrows gaps to fit rather than growing targets |
| P3. 20 heading anchors per module page at 11x16/11x18 | `small.mjs` on `/courses/fundamentals/llms/` | `src/lib/content/render.ts:459` writes `.bz-anchor`; no touch target |
| P4. Tool buttons on diagrams/code are 32x32, quiz restart 26px, footer links 26px | same audit | `.bz-tool`, `.bz-quiz-restart`, `.bz-link.inline-block` |
| P5. Catalog board rows 37-38px; level cards' links 19px; description trigger 20px | `/courses/` 44 rows, `/courses/fundamentals/` 8+8 | `catalog.css` (`.bz-boardcol-mod`, `.bz-catcard-link`, `.bz-desc-trigger`) |
| P6. Progress page: 21 module checkboxes at 17x17 and 70 links at 24px | `/profile/` audit: 70 targets under 24px | `completion.css` `.bz-cmod-toggle`, `.bz-cmod-link` |
| P7. The "G P" keyboard hint prints beside the page title on a touch device | `shots/before/_profile_-390-light-0.png` | `Affordances` chord hint, shown regardless of input type |
| P8. On a module page the breadcrumb is cut to "/ LLM Fundamentals"; the Contents button sits flush against the title | `shots/before/_courses_fundamentals_llms_-390-light-0.png` | breadcrumb hides its first segments at 767; `.bz-contents` has no margin below |
| P9. Catalog filters stack as 3 groups over about 750px of screen before the first card | `shots/before/_courses_fundamentals_-390-light-0.png` | chip groups wrap; no compact form |
| P10. Landscape 844x390: bar plus band is 76px sticky, 20% of the screen, on every page | `shots/before/_courses_fundamentals_llms_-844-light-0.png` | `--layout-sticky: 76px` always |
| P11. Nothing reserves space for the iPhone notch or home indicator; no `viewport-fit=cover` | `src/app/layout.tsx` has no viewport export | missing |
| P12. Home: scenes are tall and sparse on a phone (about 6,600px page, three full-screen empty wall panels) but the layout is already single column and does not overflow; character is intact | `shots/before/_-390-light-1.png` | scenes sized by width; kept, only trimmed (see below) |

No route scrolls sideways at 360/390/430 (scrollWidth equals viewport everywhere), because the nav scrolls inside itself. So the horizontal-overflow rule already holds; the defect is hidden navigation and small targets.

## Solutions

Constraint recorded: `DESIGN.md` and `shell.css` say "no hamburger, nothing scrolls sideways" for the bar. The author asked for industry-standard mobile UX and the nav demonstrably fails at 390px, so below 768px the navigation moves to a bottom tab bar (not a hamburger: all five destinations stay visible). The desktop bar is untouched. `tests/e2e/fidelity.ts` `NARROW_DEVIATIONS` records the departure.

1. **Bottom tab bar (P1, P2).** Below 768px the existing `<nav class="bz-bar-nav">` is fixed to the bottom: five equal tabs (Home, Catalog, Progress, Caravan, About), 56px tall plus `env(safe-area-inset-bottom)`, current tab marked by the same filled treatment and by `aria-current` (colour is not the only signal: the current tab also gets a top rule). One DOM, one landmark, no duplicate. Home returns (the 1180 rule that hides it is lifted on phones). The Catalog tab keeps its `<details>` menu, which opens as a sheet that sits above the tab bar, with the track tabs and levels at 48px rows. Escape and tap-outside close it.
2. **Top bar (P2).** Brand logo, search, track switch, language, theme, each a 44x44 target; the repository link stays in the footer. Bar height unchanged at 58px except landscape.
3. **Page frame (P11, P10).** `viewport-fit=cover`, `theme-color`; `main` gets bottom padding for the tab bar plus safe area; side padding honours `env(safe-area-inset-left/right)`. In landscape phones (`max-height: 500px`) the tab bar becomes 44px and the top bar loses its decorative band so less than 60px of chrome is sticky. `100dvh` replaces `100vh` for sheets.
4. **Touch targets (P3-P6).** Under `(pointer: coarse)`, interactive controls get a 44px minimum hit area: pseudo-element extensions where the visual size must not grow (heading anchors, checkboxes, tool buttons, catalog links), real `min-height: 44px` where it costs nothing visually (board rows, footer links, quiz restart, description trigger, profile module links). Inline links inside running text stay inline (WCAG 2.5.8 exception).
5. **Hover and hints (P7).** Keyboard chord hints are hidden when `(hover: none)`; no hover-only control exists (checked in `catalog.css`, `completion.css`).
6. **Module pages (P8).** Breadcrumb collapses to a single back link on phones (parent crumb, 44px). Spacing between the Contents button and title. Wide tables, code and diagrams already scroll in their own box; each gets an edge fade as the cue where the box overflows. Body stays at the language's 16px; the measure is already under 70 characters in portrait.
7. **Catalog (P9).** On phones the filter groups become horizontally scrolling chip rows with an edge fade (one row each, about 56px) instead of wrapped stacks.
8. **Home and show pages (P12).** Scenes keep their art. Phone-only: vertical rhythm of empty wall panels trimmed, cast labels do not wrap into three lines at 360, the scroll-driven walk stays gated to desktop (`street/motion.ts:430`), reduced motion honoured.
9. **Search dialog.** Full-screen sheet below 768px, `100dvh`, input 16px (prevents iOS zoom), results rows 48px.
10. **Performance on mid-range phones.** No new JS. Only CSS inside media queries.

## Desktop-unchanged proof

Screenshots of 12 routes at 1440x900 from the origin/main build and from the branch build with animations frozen (`reducedMotion: 'reduce'` for the shot only), pixel compared; any non-zero diff blocks the PR. Also `NARROW_DEVIATIONS` keys all have `below: 768`.

## Tests added (rules that hold for any content)

`tests/e2e/mobile.spec.ts`, project `chrome-390` plus a 360 case: no horizontal overflow on a list of routes at 360 and 390; every primary section reachable from the visible tab bar without scrolling (each tab inside the viewport); non-inline interactive controls in the chrome and on catalog/profile pages are at least 44px in both dimensions (hit area counted); tab bar is `position: fixed` at the bottom with safe-area padding; the Curriculum sheet opens by tap and by keyboard and closes by Escape and by tap outside; at 1440 the tab bar does not exist (bar nav is in the top bar).

## Course corrections after the first implementation pass

- **P2 and P4 were overstated.** The first audit measured painted boxes. The language already carried 44px `::after` hit areas for `.bz-tool`, `.bz-cmod-toggle`, `.bz-bar-icon` and the track switch (height only; width 30-41px), and chips, view buttons and `.bz-btn` already grow to 44px. Re-measured counting the larger of box and `::after` (same method as `responsive.spec.ts`): origin/main had 20-28 controls under 44px per page (21 on the bar alone); the branch has 4-9, all of them in the footer's short links before the min-width fix. The real P2 defect was the nav and widths under 44px, which the tab bar and 44px bar icons fix.
- **P3 solved by removal, not enlargement.** The `§` heading anchor is `opacity: 0` until hover, so on a touch device it was an invisible 11px link. Under `(hover: none)` it is not offered.
- **P9 reduced to the filter rows.** Chips were already 44px; the rows now scroll sideways in one line each (edge-faded) so the first card is about 250px higher.
- **Search dialog (item 9)** was already near full width; it is now a full-screen sheet below 768px with a 16px field (no iOS zoom).
- **Scroll cue** is a scroll-driven mask (`animation-timeline: scroll(self inline)`) that exists only while a table, code block or diagram has more to show; unsupported browsers keep the box and lose the cue.
- **Landscape.** Phones wider than 767px in landscape (844x390) get the desktop bar with the band removed (`hover: none` + `pointer: coarse` + short height); below 768 the tab bar thins to 48px.
- **Home** was left as drawn: at 390 it already stacks to one column and does not overflow, the scenes keep their art, motion stays desktop-gated. Only touch targets changed (the teller captions carry a 44px hit area).

## Result

- Desktop proof (final build): 15 routes x light and dark at 1440x900 pixel-compared against the origin/main build, animations frozen for the shot: 0 differing pixels on all 30 images. An earlier run of the same comparison showed 1-1,052 px on four routes; the origin/main build compared with itself showed the same noise on the same routes (mermaid antialiasing), and it did not recur. 1024x800 and 768x800 behave the same way.
- Touch audit at 390x844, hit area counted: controls under 44px per page went from 20-28 (21 on the bar alone) to 0-2 on every route except `/profile/`, whose 21 completion toggles are 44px tall and 25px wide by design (`responsive.spec.ts` `BOUNDED`: a 44px-wide target would cover the module link beside it). The two on the home page are the `.board` nail dots, a pseudo-element the audit mistakes for a hit area; the real target is the whole sign.
- `out/api/v1/` is unchanged: `contentVersion db74b46e...` before and after.
- New: `src/app/mobile.css`, `tests/e2e/mobile.spec.ts` (project `chrome-mobile`, Pixel 7 profile, so `hover: none` is true).

## After the two reviews (decisions)

Fixed: tab bar and phone rules now also apply to a touch phone held landscape at any width (844 or 932 wide), where the old bar still scrolled sideways unmarked; in that orientation the top bar leaves the screen with the page and only the 48px tab bar stays; Caravan's open card and stage stand above the tab bar; text fields are 16px on a phone (no iOS zoom), including the Caravan search; checklist rows are 44px; the Catalog tab gets the same chip as the other four when current; the sheet's focus ring is visible (the bar's white ring was white on white); the sheet's scrim starts under the top bar; the home hero keeps its dark ink in the dark theme on a phone (the art behind it is light in both themes, and the unfixed page, before and after, set pale text on it); `theme-color` is media-conditioned so desktop Safari is untouched; the unconditional scroll fade on tables, code and diagrams was removed in favour of the language's own overflow fade (`shell.css` section 6.5), and only the filter chip rows keep a scroll-driven fade; dead `data-bar-edge` removed; tests: tap-outside lands from the sheet's edge and asserts the address did not change, 320 and landscape cases, no hard-coded 76.

Not changed, on purpose: (a) the Catalog tab still opens the sheet rather than navigating, because it carries the per-track level list and the desktop item is the same disclosure; the sheet's first row is the whole catalog. (b) `§` heading anchors are not offered on touch (an invisible 11px link before). (c) Home keeps the scenes as drawn; plan item 8's trimming of wall panels was dropped after the measurement showed one column, no overflow and intact character, and is the author's call. (d) DOM order puts the tabs before the top-bar controls in tab order; fixing it means moving markup in `SiteHeader`. (e) `--layout-band` focus offsets and Caravan `fit()` resize-while-scrolled arithmetic are older behaviours.
