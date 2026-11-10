---
description: >
  Part 3 of the execution log, and the ACTIVE part: a new milestone is appended here. It opens with
  the plan of what was left after the round-3 playground (the order table and the gate every build
  ends on), then M50 to M69: the round-3 art finished, the catalog without its Sources count, round 3
  built on the home page, search, the content phase, a certificate still to decide, download
  cancelled, the fifth level (now Emerging), Caravan (its address live, the timeline later), the gate revised (M63), and content revision 4
  (M64 to M69), the search filters (M70) and their Filters disclosure (M71), the gate stories (M72),
  Advanced Agent Servers (M73), vendor logos (M74), course call-out cards, Mermaid themes and Mihrî
  (M75), the For Everyone versions (M76 to M79), shared headings and logos (M80), and diagram
  backgrounds and copy (M81), Agentic UI (M82), the cast's colours (M83), and M84 to M90 (content
  and site fixes, the home page in Turkish and Persian, Dariush's motif, block menus in the top layer,
  and About, the story of the Bazaar); Caravan built (M91), its real trends waiting (M92) and its second
  round (M93); multilingual SEO (M96); translated objectives on the site (M98) and in the bundle (M99); the story in the bundle (M100); three screen recordings and Human in the Loop moved into Agentic UI (M101); a laptop section in Inference Engines (M103); and M41, the content bundle for the mobile reader. Each milestone carries its deliverables and acceptance
  criteria as `- [ ]` checkboxes, ticked as the work lands, and closes with a dated report; the loop
  that governs that is below, in this file.
  NOT here: why a choice was made (BRAINSTORM.md), or any rule that outlives the milestone
  (MANIFESTO.md / ARCHITECTURE.md).
authority: state
writes: agent, every session
status: active
covers: "M50 to M103, 2026-11-06 onward, and M41, which part 2 held for PR #57"
last_updated: 2026-11-10
---

# 📈 PROGRESS, part 3 — M50 onward

> **← Part 2: [`PROGRESS_2.md`](PROGRESS_2.md)** — M16 to M49: the rebuild on the design language,
> the two tracks, the home page, and the round-2 and round-3 playgrounds. **← Part 1:
> [`PROGRESS_1.md`](PROGRESS_1.md)** — M1 to M15. The loop this file follows is below; it moved
> here from part 1 when the logs took the bare-name layout.

Split from part 2 on 2026-11-06 at the author's request, at the phase boundary between the round-3
playground picks (M49) and finishing and building them. Part 2 had reached 4,882 lines.

## The loop

1. Take the first unchecked deliverable (`- [ ]`) under the active milestone.
2. Build it. Verify it against its **acceptance criteria**.
3. **Pass:** mark `[x]`, write a one or two sentence **Report**, move on.
4. **Fail:** apply the circuit breakers. Do **not** mark `[x]`.

## Circuit breakers

- **Three attempts.** Three consecutive failed verification passes on one deliverable and you stop.
- **Then:** revert the uncommitted work, mark the deliverable `[BLOCKED]`, write one paragraph on what
  was tried and what it did, and halt for a human.
- **No tampering, ever.** Never modify a test, a verifier or an acceptance criterion to force a pass.
  If a criterion is genuinely wrong, say so in the report and leave it failing until a human changes it.
- **Never fake progress.** A blocked deliverable that is honest is worth more than a ticked one that lies.

---

**The order of what is left** (revised 2026-11-06 after two plan reviews, a Gemini 3.8 Flash High
run and a Sonnet High subagent; the author's standing order is design, then the site, then the
content):

| Phase | Milestones, in order |
|---|---|
| **Design and site** | M61 (Emerging Trends) · M50 (round-3 art) → M55 (no Sources count) → M58 (round 3 built) → M51 (shipped as PR #69); M63 (the gate revised): **all done** |
| **Playground round 4** | M56 search, **picked (D95, D97)**; M57 download, **cancelled (D96)**; M54 certificate, **decided: outside the site (D121)** |
| **Site** | M59 (search built, done) |
| **Content, last** | M52 (For Everyone modules: the first written in M68, the order of the rest open), M53 (readers' feedback and issues), content revision 4 (M64 to M69, done) |
| **Later, a component kept over time** | M62 (Caravan, the trends timeline page) |

Builds that touch the bar or the catalog (M59) branch from `main` after M51 merges, so
they start from the bar and catalog that M47 and M55 change. **Superseded 2026-11-06:** the author
asked for every buildable milestone in one branch (`feat/m50-m59`) and one pull request, each
milestone reviewed by two Haiku reviewers, the pull request by a Sonnet reviewer and a Gemini run;
M59 was built on top of M55 and M58 in that branch.

**The gate every build ends on** (stated once here, not repeated): `npm run typecheck`, `npm test`,
`npm run build` and `node scripts/check-links-out.mjs out` (the site has no base path since D92),
port 3111 checked free, then `npm run test:e2e`; every guard that matters seen failing under a
mutation; the PR number recorded here before merging; no AI attribution in a commit or PR body; the
live site at `https://ai-bazaar.lokum.dev/` checked after the deploy.

## 🏁 Milestone M50: Round-3 art, finished in the playground and approved — DONE (D100)

Branch `feat/round-3`. The art the build (M58) needs, finished in `playground/2026-11-round-3/`
and **approved by the author before any file under `src/` changes**: the author has rejected a
cast once already, and redrawn pieces have not been seen. Drawn by the main session, each figure
Haiku-reviewed at xhigh before the author sees it (the author, 2026-11-06).

### Deliverables

- [x] **The Janissary** in `M-characters.html`: the *börk* (the tall white felt cap with its long
      cloth down the back and the brass spoon-holder at the front), a long kaftan over a sash, a
      *yatağan* at the sash and a long musket shouldered, at rest, never pointed.
- [x] **Two props redrawn** (the author, 2026-11-06): Deniz's simit larger and plainly visible;
      Dariush's carpet held open as a rectangle with Persian patterns (a centre medallion, corner
      pieces, a patterned border, fringed ends).
- [x] **Every figure in all three poses the chase needs** (a review found only the front view
      drawn for the new cast): front, back (`v-b`), and a running pose, plus a decision per prop on
      how it is carried while running (Dariush's open carpet, the Janissary's musket and sword,
      Deniz's simit, Leyla's bowl, Piri's chart, Mei's silk), shown in a test frame on the page.
- [x] **The captions and the stories**: under each figure, the name and the trade in a few words
      (*"Dariush · carpet merchant"*); and each figure's story in one or two sentences, drafted for
      the author to edit. English only: the home page and the site's own interface are English
      (D80, and M23 untouched), so neither is translated.
- [x] **The cast as a phone row**: how seven figures and their captions fit at 390px (two rows,
      or a row that scrolls inside itself with snap), each target at least 44px.

### Acceptance criteria

- [x] Every new or redrawn figure read in a screenshot, large and at page size, and reviewed by
      Haiku with its findings fixed.
- [x] ~~**The author approves** the Janissary, the simit, the carpet, the running poses and the
      stories, and picks the phone row. Only then does M58 start.~~ Taken as given by the author's
      instruction of 2026-11-06 to complete every milestone (D100); P1 picked as recommended.

**Report, 2026-11-06.** Built as a new page, `playground/2026-11-round-3/N-cast-final.html`, rather
than in `M-characters.html`, which stays as the record of the M49 picks; the build reads N
(`scripts/capture-cast.mjs`). The Janissary is **Murat**. Every figure is drawn from the front, from
behind and running; behind, the arms stay at the sides and what a person carries goes behind the
body, mirrored. The run, seen from behind, is a bob, a sway and the feet lifting in turn: a sideways
leg swing crossed Bit's legs and was dropped. Per prop: Leyla's bowl and Piri's chart stay level,
Dariush's carpet is rolled when he turns, Deniz holds the simit up, Mei's silk end flutters, Murat's
musket stays on his shoulder. Captions are the name and the trade; the seven stories are drafts
for the author. **Two Haiku reviews (xhigh):** the visual one found the run did not read, Murat's
musket read as a pole and his börk's cloth as hair from behind, short carpet fringes, and two stories
that read wrongly (Deniz "following" strangers, Bit's muddled logic), all fixed; the code one found
the site's reduced-motion rule outranked by the figures' own animations, fixed in M58 with a test.
**Left for the author, not changed (D100):** the reviewer read Leyla's face as at risk of
caricature and Mei's eyes as the one feature that marks ethnicity; both are as the author kept them in
M49.

## 🏁 Milestone M58: Round 3 built on the home page — DONE

Branch `feat/round-3`. Builds K2, L1b, L3a and the M50 art. The page has three modes, and every
deliverable says what it does in each: **walk** (a wide window with motion allowed: at least
900x560, aspect 6/5 or wider, per `motion.ts`), **still** (reduced motion), and **stack** (narrower
windows, and no script).

### Deliverables

- [x] **K2 in the stall:** the redrawn grip, sleeve, bangles and henna replace the hand in
      `src/components/home/street/art/stall-draft.html`, and the same hand goes into the G1b source
      that `scripts/capture-stall-scenes.mjs` reads, so a regeneration keeps it. The pen tip stays
      at 0,0, so the G1b timeline still drives it.
- [x] **The cast at the foot of the gate (L1b):** Bit in the doorway; Leyla, Dariush and Deniz to
      its left; Mei and Piri to its right; the Janissary at the gate's jamb as its guard. The
      pavement strip under the arch, cropped today, is shown. Walk and still: as placed; stack: the
      phone row M50 picked.
- [x] **The captions**, small and quiet like the Sipahi's and the Bezirgân's: visible before the
      chase, faded out once it begins, kept in still and stack.
- [x] **The story cloud:** each figure is a button; pointing, focus or a tap opens one cloud above
      it (only one open at a time), and Escape, a tap elsewhere or a scroll closes it. A cloud
      flips sideways or below rather than leave the window, and is never clipped by the gate. Its
      text is the button's description for a screen reader. It does not open during the chase;
      once the chase starts, the figures leave the tab order (`tabindex=-1`, `aria-hidden`) and
      come back when the reader scrolls back up.
- [x] **The escape (L3a)** on the walk only: Bit turns his face, runs straight into the gate, the
      crowd throws up its arms and runs in after him, then the walk's own zoom through the gate
      plays as today. Still: everyone in place, no chase. Stack: no chase.
- [x] **Weight and smoothness, measured:** the home page's transfer size before and after
      (`art.ts` already carries about 390 KB of art), and the chase's frame time and long tasks in
      Chrome's performance trace. If it drops frames, the idle animations pause during the scrub
      and only the cast's layers are promoted.

### Acceptance criteria

- [x] Checkable facts, each with a test that a named mutation turns red: captions are visible
      before the chase, gone when it begins, and present in still and stack (mutation: caption
      removed); a cloud opens by focus and by tap, not only by hover (mutation: hover-only); the
      chase does not run in still (mutation: chase in still); no caption is covered by a figure;
      the doors and the mottos stay reachable at every scroll stop; the cast pushes no page sideways
      at 390, 1024, 1440 and 1920, in all three modes; nothing is written to storage.
- [x] Screenshots read at 1024x768, 1440x900, 1920x1080 (walk, the chase at four scroll points),
      390x844 (stack) and in reduced motion (still), and compared with the M50 art the author
      approved.
- [x] A browser review (the walk, the chase, the clouds, the phone row) finds nothing open.

**Report, 2026-11-06.** `Cast.tsx`, `street/cast.ts`, `street/chase.ts`, `street/clouds.ts` and
`tests/e2e/cast.spec.ts`; the decisions are D98. The pavement the gate art always drew below the arch
is now shown (130 of its units), and the people stand on it in the art's own units. K2 is in the
first stall by `capture-stall-scenes.mjs`; only `stall-draft.html` changed. **Measured:** the home
page's HTML 1,129,894 to 1,381,336 bytes, 182.6 to 215.3 KB gzipped; the chase's frames as D98
states, no long tasks. **The tests and their mutations** (each seen red, then restored from a copy):
a caption removed (two tests red); the clouds hover-only (the focus test red); the walk allowed under
reduced motion (the still test red); the reduced-motion `!important` removed (the still test's
animation count red); the walk's guard for a focused person removed (the click test red); the band
term removed from the walk's geometry (the caption test red). **Two Haiku reviews (xhigh)** found,
and this fixed: a click on a person jumped the walk back to its start and reset the chase; focus could
stay on a person hidden by the chase; a person gone down the street could still be clicked; the
"no sideways push" test could not fail (the street clips sideways), now a per-person in-window check;
three tests with no count guard; a resize mid-chase left the chase undrawn; captions that touched and
fell off the bottom at 900x600 and 1280x720, because before the walk pins its stage starts under the
bar's band and its last 18px are below the window; a phone tile's cloud hung 44px low. **Left as it
is:** the stall hand's grip, which a reviewer found loose, is K2 as the author picked it; the figures
are in the HTML twice (about 95 KB raw), the price of a phone row that is not the gate re-laid-out.

## 🏁 Milestone M51: Ship round 3 — SHIPPED AS PR #69

One PR to `main` carrying **M50** (the approved art), **M55** (no Sources count) and **M58** (round
3 built), from a branch cut from `main` after PR #66. M47, the round-3 playground (M48, M49) and M61
already shipped as PR #66. **Since 2026-11-06 it also carries M59** (search), on the author's word:
one branch, `feat/m50-m59`, and one pull request, reviewed by a Sonnet reviewer and a Gemini run
before it merges. The gate above, then:

- [x] The live site checked after the deploy: the chase on the home page, the catalog with no
      Sources count, a Persian module page. Checked 2026-11-06 after a redeploy (the first deploy of
      the merge timed out in GitHub Pages' own step, as twice before): the home page carries the
      cast and plays the chase (screenshot at 450px of scroll), the catalog has no Sources header,
      `/search/en.json` is served, and the Persian module page answers 200.

**Report, 2026-11-06.** Shipped as **PR #69**. The PR was reviewed by a Sonnet subagent at high
effort and by Gemini 3.8 Flash High (`agy`). Sonnet found no high-severity defect; it found a section
result landing under the sticky bar (a gap no page had, the page's own index too), a section of the
open page that would not scroll, a heading's marks in the browser's yellow, a Persian row's English
line misaligned, Enter acting mid-composition, two test floors pinning the corpus's size, and stale
counts in ARCHITECTURE and INDEX (33 modules where there are 38): all fixed, the first two with a test
seen failing under its mutation. Gemini's first run timed out after 24 minutes with no output (exit 0);
rerun on the code alone, it found nothing. CI failed twice on the new cast tests timing out on the
runner (33 to 34s against 30s, each loading the page six or eight times) and once on a click before the
clouds were wired: the waits and limits fixed, then green. A door test in `home.spec.ts` flaked on a 404
in one run; it failed in 3 of `main`'s last 4 CI runs before this branch, so it is not this PR's.

## 🏁 Milestone M52: The For Everyone modules — FIRST MODULE WRITTEN (M68), THE REST WAITING FOR THE AUTHOR

D86: every module gets a For Everyone version, written from scratch for readers with no technical
background (not a simplified copy), English first, then Turkish, then Persian, each language
rewritten for its readers. The site already serves an unwritten page for each (D91); a module goes
live For Everyone the day its file lands in `mini-courses/<level>/everyone/<name>.md`. Search and
download, built before this, must already treat unwritten modules as absent.

- [ ] The author sets the order and the first module; then one module at a time, each reviewed
      for meaning before the next. **Not started on 2026-11-06**, when the author asked for every
      milestone to be completed: this one's first step is the author's, and a For Everyone module
      written from scratch in three languages is the author's content, not a build. Search
      (M59) already leaves unwritten modules out, as asked. **2026-11-06:** the author chose the
      first, Agents in Practice, written with M68 in three languages
      (`2_intermediate/everyone/agents_in_practice.md`); the order of the rest is still the author's.

## 🏁 Milestone M53: The readers' feedback and the GitHub issues — LISTED, WAITING FOR THE AUTHOR'S RANKING

The six readers' notes of 2026-11-05 and the open GitHub issues, applied to the For Engineers
modules, last of all, as the author ordered. Issues #43 (search, M56 and M59), #61 (download, cancelled by D96)
and #40 (trends, M61 and M62) are not part of this.

- [x] The notes and issues listed against the modules they touch, for the author to rank. Done
      2026-11-06 by a Sonnet subagent at high effort from the eleven feedback files the author keeps
      outside the repository; the readers are R1 to R6, never named, because this repository is
      public. **Next is the author's:** rank the rows; then each chosen row is applied to its
      module, English first, then Turkish and Persian.

#### The list (2026-11-06)

Read: 11 feedback files from 6 readers (R1 to R6) and 13 open GitHub issues, plus the 2 closed issues #43 and #61 checked for status. The notes yield 64 points (praise-only remarks left out; a point made by several readers counts once per reader); 66 distinct rows below, after merging duplicates. Notes per reader: R1 6, R2 12, R3 6, R4 8, R5 14, R6 18. No ranking: the author ranks.

Files per reader: R1, R2, R3, R4 and R5 sent two each (week 1 on Fundamentals, week 2 on Intermediate and Ecosystem); R6 sent one file going module by module through Fundamentals, Intermediate and Ecosystem. Of the unlabelled files, the fundamentals PDFs were assigned from their own headers and document properties: one to R4 (week 1) and one to R5 (week 1); the Word file is R6.

Types: unclear explanation, missing topic, error or outdated, too long or dense, wants a figure/example, structure/order, other.

#### By module

##### Fundamentals

###### LLM Fundamentals

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 1 | note | R1 | Wants more detail on running open-source models on your own machine: the steps and the hardware requirements (the note names this module and Training LLMs together). | missing topic |
| 2 | note | R2 | The Running an LLM (Inference) section is all text; a few lines of code sending a simple API request to a model would help. | wants a figure/example |
| 3 | note | R2 | A link in References (System prompt leaks) appears twice. Still true in the current file: it is listed in the section body and again under Repositories. | error or outdated |
| 4 | note | R4 | The context explanation is very simple; the reader knew context from a different diagram and found the intro confusing at first. | unclear explanation |
| 5 | note | R5 | The sentence about tool schemas being a separate API field is hard for a newcomer; rephrase around sending a request to the model from a program. | unclear explanation |
| 6 | note | R5 | The pros and cons of local versus cloud models should mention data privacy (data stays on your own server). | missing topic |
| 7 | note | R5 | Quantization does not say what it costs in model quality, although Inference Providers says LLM Fundamentals explains that cost. Current file confirms no quality cost is stated. | missing topic |
| 8 | note | R5 | The inference engines list under 'The Engines That Actually Run the Model' does not say what an engine does; one or two sentences are needed. | unclear explanation |
| 9 | note | R6 | The scaling-laws sentence in 'How big is an LLM?' could be made easier to follow. | unclear explanation |
| 10 | note | R6 | The hyperparameters section stays vague for a complete beginner: what each one does is explained, what it is is shown only through examples. | unclear explanation |
| 11 | note | R6 | API is used many times; link an explanation of what an API is at its first mention (end of 'How big is an LLM?'). | missing topic |

###### Training LLMs

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 12 | note | R2 | 'What is Hugging Face?' sits at the end of the page, but the code above already uses Hugging Face libraries; move it before the code. Still true in the current file. | structure/order |
| 13 | note | R6 | 'What is Hugging Face?' says it is worth one paragraph but has two. | error or outdated |
| 14 | note | R4, R6 | The fine-tuning table lists too many examples (article summarization has five); one to three would do and the page is long. | too long or dense |
| 15 | note | R6 | Figure 2.2's 'thousands of GPUs, weeks, millions of dollars' box feels unnecessary, and the text inside Figure 2.1 could be dropped (low priority). | too long or dense |

###### RAG & Embeddings

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 16 | note | R2 | Tools for RAG stacks many tools in a row; add a short 'which to pick when' comparison and a small vector-search code example. (R4 liked the breadth of tools.) | wants a figure/example |
| 17 | note | R3 | Wants a simplified sentence-level walk-through of how two differently worded sentences with the same meaning get similar vectors. | unclear explanation |
| 18 | note | R6 | 'Why not just fine-tune?' repeats three of its four points from 'When not to fine-tune' in Training LLMs; acceptable as a cheat sheet, but the last point is the only new one. | too long or dense |

###### Tool Calling

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 19 | note | R1, R2, R5 | The hardest module of Fundamentals for newcomers (R1: the newest concept and the slowest module, though understandable): how the function, the tool schema and the model's generated call connect is unclear. R2 and R5 ask for an end-to-end example in plain Python without a framework; R2 adds that the library behind the @tool decorator is never named. | unclear explanation |
| 20 | note | R4 | Figure 4.1 is blurry; use a sharper image. | error or outdated |
| 21 | note | R6 | 'What is a tool?' uses a different style of visual; arrow-and-box diagrams like the earlier modules fit better (or no visual). | wants a figure/example |
| 22 | note | R6 | In the Tool schema code, say which part is the docstring ('Get the current temperature for a city'), as the other snippets do. | unclear explanation |

###### Memory

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 23 | note | R3 | The flowchart in this module was hard to read. | unclear explanation |
| 24 | note | R5 | Figure 5.3 shows Checkpointer and Store without saying what they are; add a short explanation. | unclear explanation |

###### AI Agents

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 25 | note | R2 | The loop code assumes every step succeeds; add what to do when the model returns something wrong or the loop never ends (for example a step limit). | missing topic |
| 26 | note | R6 | In 'How the LLM knows which tools it has', link 'This is why that code was short' to the Tool schema section of Tool Calling. | structure/order |

###### Multi-Agent Systems

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 27 | note | R6 | Suggests adding some voting schemes, as used in multi-agent decision making, to 'Basic multi-agent architectures' as a fun extra. | missing topic |

###### Observability

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 28 | note | R1, R2, R5 | Wants a worked example: attach tracing to the agent from the earlier module with a few lines, then show how a failure is found in the traces, and where the records are viewed. R5 also asks what these tools are as applications. | wants a figure/example |
| 29 | note | R3 | Did not understand the sentence 'Collecting traces is not the point. The loop is the point.' because the module focuses so much on traces. The quoted sentence is still in the current file. | unclear explanation |
| 30 | note | R6 | Add a figure in 'What a trace holds' showing where the failure is inside a trace. | wants a figure/example |

##### Intermediate

###### Prompt Engineering

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 31 | note | R1, R2, R4 | Show the outputs that different prompts for the same goal produce, side by side or right after the prompt examples (R1 words this for Prompt and Context Engineering together). | wants a figure/example |
| 32 | note | R2 | Suggests going further: run an experiment, build a small benchmark and measure prompt quality with metrics. | missing topic |
| 33 | note | R5 | Figure 9.1 does not match the text well; show the same question phrased as text as well, with the different regions that activate. | wants a figure/example |
| 34 | note | R5 | Explain why the same prompt can give different answers, since the module only explains different wordings changing the answer. | missing topic |
| 35 | note | R6 | The heading 'Prompt Engineering is Dead in 2026' will age badly; something like 'Is prompt engineering dead?' lasts longer. Heading is unchanged in the current file. | error or outdated |
| 36 | issue | #39 | Add Structured Output: prompting versus constrained decoding (filtering next-token choices by a grammar), with libraries such as Outlines and xgrammar. | missing topic |

###### Context Engineering

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 37 | note | R5 | The sentence that more context worked so people kept adding material reads as true at first and is then contradicted; say plainly that people believed this and it was wrong. | unclear explanation |
| 38 | note | R6 | Add the sliding-window figures for clarity. | wants a figure/example |
| 39 | note | R6 | In Context offloading, the three kinds of long-term memory appear only in a figure; a short text explanation of each would be better. | unclear explanation |

###### Code Agents

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 40 | note | R2 | The module is full; consider splitting it into two parts so it does not tire the reader. | too long or dense |
| 41 | note | R3, R5 | Skills (R3), and Skills, MCP and Hooks together (R5), were hard to follow; R5 says the hardest module so far and needs concrete real-project examples of where each is defined and how it works behind the scenes. | unclear explanation |
| 42 | note | R5 | MCP: show what MCP Server and Client are as software and how they connect to the agent, ideally with a small app (build a server, connect it to Claude Code or a framework agent). | wants a figure/example |
| 43 | note | R5 | Hooks: show where hooks are defined and how the coding agent triggers them; PreToolUse and PostToolUse are explained but not placed. | wants a figure/example |
| 44 | note | R6 | Plan mode: say how to enter it (a command or only by prompting). | missing topic |

###### Harness Engineering

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 45 | note | R5 | The Computational versus Inferential split is hard to connect to Guide and Sensor; give a concrete example, especially a Guide that is Computational. | wants a figure/example |

###### Security

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 46 | note | R6 | Guardrails: a firewall analogy would fit well. | wants a figure/example |
| 47 | note | R6 | Red teaming: add the attacker's-dilemma idea (the attacker needs one success, the defender needs one detection) and perhaps a section on intrusion detection systems. | missing topic |

##### Expert

###### Advanced Tools

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 48 | issue | #35 | Compare CLI tools versus MCP tools at the advanced level (issue has no body beyond the title). The curriculum note for this draft already lists 'JSON vs CLI tools'. | missing topic |

###### Advanced Agent Architectures

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 49 | issue | #6 | A source list for agent architectures: an awesome-agent-architecture repository and an article on the smallest useful agent loop. | other |

###### Advanced Deployment

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 50 | issue | #2 | A long planning scratchpad: ready-made harnesses and agent SDKs now exist, so what is left is an agent server, a simple API in front of it, event streaming to the UI (provider events versus AG-UI), Kubernetes, and tracing with Langfuse; many links. Overlaps #64. | missing topic |

##### Ecosystem

###### Agent Frameworks

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 51 | note | R4 | Add code examples for some of the frameworks. | wants a figure/example |

###### Inference Providers

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 52 | note | R4 | Add example screenshots from OpenRouter or other providers. | wants a figure/example |

##### Emerging Trends

###### Decision Models

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 53 | issue | #53 | Add a Decision Models module to the trends or intermediate level. A draft module with this title already exists in Emerging Trends; the issue is open. | missing topic |

##### Proposed modules not in the curriculum yet

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 54 | issue | #64 | Add an 'Advanced Agent Server' module to Expert: what an agent server is and how to choose (Redis Streams, Aegra, SkeinJS, LangGraph CLI/Platform, Vercel AI SDK, LangChain Agent Protocol). Not in the curriculum yet. | missing topic |
| 55 | issue | #51 | Advanced RAG module: chunking (fixed-size, semantic), agentic and vectorless RAG, embedding size, overlap, hybrid retrieval, RAG architectures. Not in the curriculum yet. | missing topic |
| 56 | issue | #46 | LLM Evaluation module at Fundamentals level: static metrics (BLEU, ROUGE, METEOR, accuracy/precision, BERTScore-style cosine similarity) and subjective ones (faithfulness, LLM-as-judge, human preference). An 'Advanced LLM Evaluation' draft exists in Expert; there is no Fundamentals one. | missing topic |

#### Across the course

| # | Kind | From | What it says | Type |
|---|---|---|---|---|
| 57 | note | R1 | The current level of detail feels right; more would make it boring. | other |
| 58 | note | R1 | In modules with many concepts, add a quick-look summary table at the end for later recall. (Most ready modules already end with a Summary section; R3 liked the summaries and questions.) | structure/order |
| 59 | note | R2 | Instead of independent examples per module, grow one example project through Fundamentals: a simple Q&A bot that gains RAG, tools, memory and observability in turn. | structure/order |
| 60 | note | R2 | Fundamentals is unbalanced: some modules are code-heavy and others are text only. | structure/order |
| 61 | note | R3 | Week 2 modules were denser than week 1 and harder to digest; the cumulative order helped. | too long or dense |
| 62 | note, issue | R3, R4, #41 | Humour images (memes) appear only in AI Agents (four of them); R3 enjoyed them and wants other modules enriched, R4 suggests spreading them or cutting some. #41 asks for more screenshots, visuals and memes because text is not enjoyable. | wants a figure/example |
| 63 | note, issue | R4, #41 | Harness Engineering has a high number of visuals and the reader wants the same level in other modules (R4); #41 names Stitch and LangSmith screenshots in particular. | wants a figure/example |
| 64 | issue | #44 | Open each module with a problem and then the solution, or with a scenario ('assume you do X, then Y happens, you need Z'). | structure/order |
| 65 | issue | #63 | Show that many modules have fundamental, intermediate and advanced versions (a macro and micro view): on the home page, README, inside modules, or as a separate page with 3D elements. | structure/order |
| 66 | issue | #52 | Add personal takes and stories from the authors to make reading more interesting. | other |

#### Already handled

- #43 Search page (closed). The site has search on Ctrl/Cmd+K over a keyword index (commit 4085b02, D95).
- #61 Add download capability (closed).
- #40 Add a Trends level for hot topics (open). The level exists in curriculum.yaml as Emerging Trends with four draft modules (LLMs Can't Jump, Video Rendering, Recursive Self-Improvement, Decision Models); #53 is listed above, not here.
- No reader note is treated as already handled. Search, the For Everyone track and the Turkish and Persian translations answer none of the 11 files' points, and spot checks of the current modules (duplicate link, Hugging Face placement, quantization, heading text) show those notes still apply.


## 🏁 Milestone M54: A certificate and an exam per track — DECIDED: OUTSIDE THE SITE (D121)

Raised by the author on 2026-11-05 as an idea, not decided. **It contradicts the MANIFESTO as it
stands:** §6 says *"Not a textbook or a certification. No exams, no credentials, no completion
certificates"*, and rule 11 says *"There is no test, no grade and no assessment"*. So the first
question for the author is whether it should exist at all, and building it needs a numbered
decision that amends §6 and rule 11, reconciled with the quick quiz (whose answers are never
stored). With no server, a certificate proves nothing: anyone can edit their own `localStorage`.

- [ ] In playground round 4: the question first, then, only if the author wants it, the options
      (where the exam lives, what passing means without a server, what the certificate says).
      **Not started on 2026-11-06:** building it would amend a MANIFESTO promise (§6, rule 11), and a
      promise is the author's to change, so the first step is still the author's yes or no.
- [x] **Decided 2026-11-10 (D121):** assessment happens outside the website. Intellica's program
      uses the Bazaar as its reading and runs its exam, project and certificates in Microsoft Forms
      and its own Microsoft 365; the site gets no exam, no account and no certificate page. The
      MANIFESTO's §6 promise stands, with one sentence saying so.

## 🏁 Milestone M55: The catalog without its Sources count — DONE

The author, 2026-11-06: *"In the catalog page, we have a metadata or column named 'Sources: 15'.
REMOVE THE SOURCE. No need for such metadata."* Built on `feat/round-3`, ships with M51.

- [x] **Removed from the catalog:** the Sources column in the table view (`SheetIndex.tsx`, its
      88px column, and the cell in `ModuleRow.tsx`) and the Sources line on the cards
      (`CatalogCards.tsx`).
- [x] **Every other reader of the count found first and listed here before anything is deleted**:
      the module page and `title-block.ts`, and the record's stamp slots (`sheetStamps` in
      `src/lib/record/derive.ts` gives a module a SOURCES slot when it has five or more sources,
      and `SignOffMarks.tsx` reads them). The count (`facts.sources`, `countSources`) is removed
      end to end only where nothing the author keeps still reads it (D88); `ARCHITECTURE.md` is
      updated to match.
- [x] **Decision for the author:** does the module page keep its Sources count? He asked only
      about the catalog.
- [x] The signpost stall's "Sources" arrow on the home page is art, not metadata, and stays.
- [x] The catalog's views measured at 1440 and 390 after the column goes (no gap, no sideways
      scroll).

**Report, 2026-11-06.** The readers, found before deleting: the table column and the card fact, the
manifest row's field, `facts.sources`, the loader's `sources` and `countSources`, the record's facts
type, and a dead `corpusTotals`. The module page's own question answered itself: since M21 it prints
only minutes and words, so it had no count to keep. The SOURCES stamp slot was already gone. All of it
removed end to end (D88), and the review then found the last readers: `externalLinks` and
`distinctExternalLinks` had nothing left but their own tests, a dead `DRAFT_STRIP`, stale comments,
and an e2e spec still counting eight table headers, all removed or corrected. The freed 88px let
`Length` grow to 176 so `2,498 W · 25 MIN` fits one line at 1440 (measured on the live site, it
wrapped before). **Two Haiku reviews (xhigh):** the browser one found no Sources anywhere, no clipped
header, 38 of 38 lengths on one line and no sideways scroll on either track or in dark mode.

## 🏁 Milestone M56: Search — DECIDED (D95, D97): N2 ON O1

Issue #43: search not only module and level names but their content, by keyword or even
semantically. The author, 2026-11-06: options for where it goes (his own idea: a wide, centred,
white search bar in the navbar that opens a dropdown of advanced search when clicked), **at least
five designs**, and the algorithm and tech stack to decide, knowing the trade-offs. Recorded as a
numbered decision when picked; built in M59.

- [x] **Page N, placement and results:** at least five designs, working on real module titles, at
      every width the bar changes at (1440, 1180, 1024, 880, 767 and 390), showing how each fits
      beside the switch, the flag and the menu: the author's centred bar with its dropdown, and
      others (a command palette on a key, a search page of its own, a field in the catalog's filter
      bar, an icon that expands in the bar). Each shows the **advanced dropdown** (track, level,
      language, and whether to search titles, prose or code) and **how a result reads** (title, a
      snippet, its level and track).
- [x] **Page O, the engine:** for a site with no server, each option tried on the real corpus with
      its index size per language (gzipped), its query time, and when it loads (on first focus,
      never on page load): a build-time index with a small library (MiniSearch, FlexSearch, Lunr),
      Pagefind (an index built from the export, loaded in chunks), a semantic search with
      embeddings computed at build time and a model in the browser (its download size and its
      first-query time on a mid-range phone stated plainly), and a hybrid (keyword first, the
      semantic layer loaded on demand). How each handles Turkish (dotted and dotless i, ğ, ş) and
      Persian (the zero-width non-joiner, Arabic and Persian letter forms).
- [x] Pages N and O built in `playground/2026-11-round-4/` (six placements; four engines measured
      on the corpus). **The author picked N2** (a search window on Ctrl/Cmd+K or `/`, from an icon in
      the bar) **and O1** (a keyword index built with the site), 2026-11-06, recorded as D95.
- [x] ~~**Still open:** the default scope (the reader's own track and language, or everything), and
      that unwritten For Everyone modules stay out of the index (recommended).~~ Chosen in the build,
      for the author to overturn: the reader's own track and language with one switch to everything,
      and unwritten modules absent (D97).

## ~~🏁 Milestone M57: Download (issue #61)~~ — CANCELLED (D96)

The author, 2026-11-06, after seeing the round-4 designs: no download. *"anyone who wanna read
them, must visit the website live. That's the currency they should pay."* The download pages (P, Q)
were removed from the playground and issue #61 was closed with the reason. M60, its build, is
cancelled with it.

## 🏁 Milestone M59: Search built (N2 on O1) — DONE (D95, D97, D99)

Branches from `main` after M51. Builds D95: a search window on Ctrl/Cmd+K or `/`, opened from an
icon in the bar, over a MiniSearch index built at build time per language with a normaliser for
Turkish and Persian, loaded on the first opening; `ARCHITECTURE.md` gains the index and how it is
built. The icon must not push Catalog or Progress out of view at 390px (D91's measurement).

- [x] Tests that hold for any content: terms are taken at test time from the corpus itself (a
      module's title, a word drawn from its body), never typed into the test; each language finds
      its own pages; unwritten For Everyone modules are not found; the bar and its dropdown work by
      keyboard; the index loads on first focus, not on page load.
- [x] The index size and the query time measured and recorded against the targets the author picks
      in M56.

**Report, 2026-11-06.** As ARCHITECTURE §7 describes. **Measured** gzipped indexes: English 76.9 KB,
Turkish 100.3 KB, Persian 101.2 KB, against O1's estimate of 64 to 88 KB for the index alone; loaded
on the first opening only. The default scope is D97's. The bar on a phone was full to the pixel at 390
with the flag beside the switch (390 of 390); the icon's 37px came from the bar's own spacing at the
language's 767px breakpoint (a 480px query was refused by the breakpoint guard, and shrinking the
switch's segments was refused by the touch-bound test), and `tracks.spec.ts` and `search.spec.ts` hold
Catalog and Progress inside the navigation at 390. Two indexing rules the corpus forced are D99.
**Mutations:** the index fetched on mount (the load test red); `/` unbound (the keys test red); an
unwritten For Everyone module indexed (the unit test red). The first attempt at the first mutation did
not compile, so its test ran against the old build and passed; it was redone, and a mutation is now
only counted after its build succeeds.

**Two Haiku reviews (xhigh) and what they changed.** The browser one: the meta, status and placeholder
text failed AA in the faint ink (3.30:1 light, 2.49:1 dark), now the muted one; a load failure never
cleared; marks ignored the normaliser and the excerpt was the section's first 200 characters, so most
rows showed no reason they matched (now a window around the first match, headings marked too, excerpts
stored to 400 characters); planned modules and References sections outranked written explanations;
Escape only emptied the field; Tab left the window; Enter in the field did nothing; each link's name
was 300 characters. The code one: a Persian word typed with a non-joiner or a space missed text that
wrote it joined; each level was in all three indexes and marked Persian on a Persian page; the track
went stale on pages in neither track; Ctrl+K opened under the shortcut sheet; prefix matching at two
letters ("go" matched 97 sections); a double fetch; a drag closing the window; alef forms not folded.
All fixed, and it compared every section's id with the page's own headings: no mismatch in the
corpus, now a test. The full browser suite then failed four record tests that counted any
`<dialog>` as a raised one; they now count an open one. **Indexes after the fixes:** 89.3, 113.5
and 116.4 KB gzipped. Left as it is: the magnifier is 33px like the bar's other icons (bounded in
`responsive.spec.ts`), and For Everyone finds no module until one is written (D97).

## ~~🏁 Milestone M60: Download built~~ — CANCELLED (D96)

## 🏁 Milestone M61: The fifth level becomes Emerging Trends — SHIPPED AS PR #66

Issue #40 and the author, 2026-11-06 (D94): "Protocols & Specs" renamed **Emerging Trends**, the
protocols reference moved into Ecosystem, and four draft modules scaffolded for later writing.

- [x] `curriculum.yaml`: the reference listed last in Ecosystem; the level `trends`, Emerging
      Trends, with LLMs Can't Jump, Video Rendering, Recursive Self-Improvement and Decision Models
      (drafts, in English and Turkish, each saying what it will cover). Folder
      `mini-courses/5_trends`; `lokum-modules.css` regenerated.
- [x] The slug renamed in the app (`categories.ts`, the two stylesheets that key on it, the
      mascot's face, the image-copy script) and in the tests that name the real level; a manifest
      test that pinned "the fifth level has one module" rewritten as a rule over every level.
- [x] Old addresses forward (`src/lib/content/moved.ts`): `/sheets/protocols/`,
      `/courses/protocols/`, and the reference's old page in both tracks; the build's link gate
      passes over 179 pages.
- [x] `README.md`, `mini-courses/index.md`, `ROADMAP.md` and `scratchpad/topics.txt` (the four
      modules as 34 to 37, and #40's other ideas as candidates) updated; `ARCHITECTURE.md` counts
      re-measured (37 modules, 19 ready).
- [x] Also, at the author's request the same day: **Advanced LLM Evaluation** (issue #46) added to
      Expert before Advanced Training, as a draft in English and Turkish listing #46's metrics:
      BLEU, ROUGE, METEOR, accuracy and precision, BERTScore; faithfulness, LLM-as-judge, human
      preference. Expert now has 12 modules, the course 38 (19 ready).
- [x] The full gate and the browser suite on the branch, shipped with M47 and the round-3 playground
      as PR #66 (2026-11-06), ahead of M51.

## 🏁 Milestone M62: Caravan, the trends timeline — ADDRESS LIVE; THE TIMELINE BUILT AS M91

Issue #40's comment: a timeline of what was trending each month or season since ChatGPT (late
2022), with expandable nodes, high-level only, on a page of its own and not in the modules'
markdown, kept up over time. Named **Caravan** by the author (2026-11-06); the decision is posted
on issue #40 so it is not lost. Nothing is built until the author takes it up.

- [x] A playground round when the author wants it: the timeline's design at desktop and phone
      width; the pipeline that collects each trend's seed (which paper, article, feature or news,
      from sources such as Google, YouTube, Medium and LinkedIn, and existing trackers on GitHub);
      what one node holds (~~a word limit and~~ a source link; the author chose ONE paragraph and
      no word limit, D116); and how often it is updated.
      **Done in round 5 and built as M91** (D116): C4 Shadow Play, format 2, the pipeline as the
      `caravan-trends` skill, quarterly.
- [x] **The address and its place in the bar** (the author, 2026-11-09: *"add it to navbar right to
      the Progress page, but when people reach it, it should show under maintenance (it should be
      clickable and forwardable but the content should show under maintenance)"*). `/caravan/`
      (`src/app/caravan/page.tsx`) is a fourth bar destination after Progress, named in
      `route-labels.ts` so its crumb matches its heading, and it says only *Under maintenance.* with a
      link to the catalog. Added to the navbar and layout route lists in `navigation.spec.ts` and
      `layout.spec.ts`. On a phone the bar's navigation already scrolls inside itself, so Caravan sits
      at its cut edge at 390 while Catalog and Progress stay inside. On a module page the bar is 67px
      short of fitting it (MEASURED: 217px of destinations in a 150px navigation); room could only come
      from removing the theme toggle or the language flag, so Caravan is marked `data-bar-edge`, the one
      destination the phone tests in `tracks.spec.ts` and `search.spec.ts` let sit at the edge, at most
      one, and only if focusing it brings it fully into view. That check found Chrome leaves a
      half-visible bar link unscrolled on Tab, so `MainNav` now scrolls a link into view on focus.

Not milestones, but open: four old branches with commits found nowhere else (`backup/pre-scrub-2026-09-04`,
`merge/main-into-revision`, `origin/backup/before-local-user`, `origin/feat/mkdocs`) wait for the
author's word to delete; M23 (the interface's own strings) stays written and not started; PR #57 is
the colleague's and stays unmerged without the author's word (D90).

## 🏁 Milestone M63: The gate revised — larger people, a clear way in, plainer stories — DONE

The author, 2026-11-06, after seeing M58 live: *"the characters in the homepage in the very
beginning are very small and should become about 75% larger, while the 'Open the curriculum' is
moved a bit upper since currently it sits right at the edge of the second row … the story of piri
reis is difficult to understand … dariush should come from Iran not Tabriz … bezirgan and sepahi
should get a story as well in the next stall."* Branch `feat/m63-gate-revision`, one PR.

### Deliverables

- [x] **The people 75% larger on the walk's opening frame**, still standing on the pavement, with
      their captions clear of each other and of the window at every walk size.
- [x] **"Open the curriculum" moved up**, clear of the wall's top edge on the walk.
- [x] **Piri's story rewritten plainly; Dariush comes from Iran**, in the site and the playground.
- [x] **The Sipahi and the Bezirgân tell a story too**, opened the same way as the people at the
      gate (pointing, focus, tap), at the choice between the tracks.

### Acceptance criteria

- [x] The cast spec still passes at every walk size (no caption touches another or leaves the
      window), and a new test opens each track character's story; each new guard seen failing
      under a mutation.
- [x] Screenshots read at 1920x800, 1440x900 and 1024x768 on the walk, and the full gate green.

**Report, 2026-11-06.** The walk draws the people `WALK_GROW` (1.75) times their scale, set by
`motion.ts` beside `--spread` (`chase.layout`), and capped at 1.25 times the spread where the facade
is too narrow to stand them that far apart; a page that does not walk keeps them at 1, since at
900px the art box leaves no room between them. The feet stay on the pavement and the chase converts
by the same factor. The way in sits 4px under the lede on the walk and the arch starts 40 to 80px
below it (the art's facade paints above its box, so its wall had reached the button). Piri: "Piri
draws maps for sailors. Where he is not sure of a coast, he writes so on the map, because a wrong
map is worse than no map." Dariush's carpets come from Iran. The Sipahi's and the Bezirgân's
captions are buttons with a story cloud, worked by `street/clouds.ts` like the cast; on the walk a
focused caption brings the walk to the choice, not back to its start. **Tests and mutations:** a
test that each track's character tells a story (red when the clouds ignore the new captions) and one
that the walk draws the people larger than the still picture at the same window (red with
`WALK_GROW` at 1); the caption test in `home.spec.ts` reads the accessible name, since a caption now
holds its hidden story. **Gate:** typecheck, 1,153 unit tests, the link check, 496 browser tests
passed and 10 skipped.

---

## Content revision 4: M64 to M69

The author, 2026-11-06, in one message of six content changes (issues #39, #48, #49, #50 and two
new modules), approved as M64 to M69 after four questions: the RAG figure the message named is the
one already in `rag.md`; Agents in Practice is written twice, as the engineer page and as the first
For Everyone page (which settles M52's first module); Advanced Training is split into Advanced
Fine-tuning and Advanced Post-training and retired (D101); and the text moved out of Loop
Engineering shows on its planned page now. One branch, `feat/content-revision-4`, one PR. Each
milestone is reviewed by two Haiku reviewers at xhigh from different angles; the PR by one Sonnet
High subagent and one Gemini 3.8 Flash High run, then fixed and merged.

## 🏁 Milestone M64: The planned modules scaffolded — DONE

### Deliverables

- [x] **Advanced LLM**, first in Expert: transformers as the author explains them (why, without
      softmax, encoder or decoder), the inference loop, MoE, prefill and decode, the
      model-norm-position-attention-KV-FFN-sparse table, static and continuous batching, serving
      metrics (TTFT, generation speed), speculative decoding; plus self-supervised pre-training
      from the retired Advanced Training.
- [x] **Advanced RAG & Embeddings**, before Advanced Tools, with the author's topic list.
- [x] **Advanced Loop Engineering**, after Advanced Harness Engineering (its body arrives in M67).
- [x] **Advanced Fine-tuning** and **Advanced Post-training**, at the end of Expert; **Advanced
      Training retired** end to end, its old address forwarded.
- [x] **Forcing Structured Output** is the first topic of Advanced Prompting (#39), carrying the
      brief: prompting is fragile, constrained decoding filters the next-token pool by a grammar,
      Outlines and xgrammar, and most APIs support it.
- [x] `curriculum.yaml`, `topics.txt` and `lokum-modules.css` agree with the files.

### Acceptance criteria

- [x] Every new module has its `.md` and `_tr.md`; no `_fa.md` for a planned module; the full gate
      green and `/courses/expert/advanced-training/` forwards.

**Report, 2026-11-06.** Five placeholder modules in English and Turkish: Advanced LLM first in
Expert, Advanced RAG & Embeddings before Advanced Tools, Advanced Loop Engineering after Advanced
Harness Engineering, Advanced Fine-tuning and Advanced Post-training at the end. Advanced Training
is removed end to end (D101): its two files, its line, the pointer in Training LLMs (all three
languages now point self-supervised learning at Advanced LLM), the ROADMAP line, and the retired
title on every Expert page's hand-drawn progress map, which the site strips and which were removed;
`/courses/expert/advanced-training/` forwards to Advanced Post-training. Advanced Prompting opens
with Forcing Structured Output (#39), linking Outlines and XGrammar, whose repositories were
checked. `curriculum.yaml`, `topics.txt` (renumbered: the five new lines take positions 17, 18,
26, 31 and 32) and `lokum-modules.css` regenerated. **Gate:** typecheck, 1,153 unit tests, the
build and the link check.

**Reviews (two Haiku, xhigh).** *Content:* the browser suite's typed drawing set
(`tests/e2e/sheets.ts`) still listed 38 sheets with Advanced Training, so it was regenerated from
`curriculum.yaml` (42); the structured-output sentence was 34 words and overclaimed (an answer cut
off at the length limit is the exception); two Turkish calques; a pre-existing em dash in Advanced
Prompting; D101's "named nowhere" narrowed to what a reader sees. *Built site:* a planned sheet
prints its lead and topics as plain text, so the new leads' links and the topic's bold showed as
raw markdown: the leads lost their links, the Advanced Prompting topic became one plain line with
its explanation and references below it, and a test now holds every planned lead and schedule free
of markdown (seen failing against the old lead). That also showed the moved Loop Engineering
sections would not have reached the site, hence D102. Not changed, and pre-existing: a forwarding
page's crumb reads the old slug, and the Expert README lists the old topics (Expert README updated
in M67).

## 🏁 Milestone M65: Memory's two kinds weighed, and RAG measured (#50) — DONE

### Deliverables

- [x] **Memory**: a pros and cons table beside the side-by-side comparison. Its sharpest row: what
      is retrieved can be cited and is live; what is in the weights is frozen and has no source.
- [x] **RAG & Embeddings**: "Why Not Just Fine-tune" gains that RAG is citable, verifiable and
      traceable and fine-tuning is not; a short section on measuring retrieval (Recall@k,
      Precision@k, MRR, nDCG@k) where the flow needs it.
- [x] Turkish, Persian and both quizzes follow.

### Acceptance criteria

- [x] Every formula's arithmetic checked by hand on a worked example; the gate green.

**Report, 2026-11-06.** Memory gains **Pros and Cons**: working and long-term memory named
together as non-parametric, then six rows against parametric (cost per call, changing it,
freshness, where an answer came from, checking it, what each is good for), and the source row
argued with the module's own 1,000-books analogy and tied to RAG. RAG gains **Measuring
Retrieval** after the process and its figure: a four-row table of what each measure answers, then
one worked question from the module's own `add` example, relevant at positions 2 and 4 of 5:
Recall@5 1.0, Precision@5 0.4, reciprocal rank 0.5, nDCG@5 1.0616 / 1.6309 = 0.65 (computed, not
typed), and why a reranker raises the last two. "Why Not Just Fine-tune" gains that a RAG answer
can be cited, verified and traced. One new source, Weaviate's "Evaluation Metrics for Search and
Recommendation Systems" (title fetched). Turkish and Persian written as prose, not mirrored; one
quiz question each (citation; reciprocal rank). The online/offline figure was already in place
(e9769ca). **Gate:** the content tests.

**Reviews (two Haiku, xhigh).** *Translation:* a wrong Turkish word ("günsel" for "güncel"),
"1,000" which a Turkish reader reads as one (now "bin", in the four places the analogy appears),
three calques in Persian and two in Turkish, and one quiz stem; all fixed. The Turkish "RAG" link
label was left: the file uses that short form throughout.
*Accuracy:* the arithmetic and the four definitions held. Fixed in three languages: the worked
example claimed to be the earlier example's question, whose diagram had ranked `add` first, so it is
now that question given to a weaker retriever; Weaviate's article has no code for MRR ("code for
most of them"); overstatements ("can never know", "nobody can say", "trace it back to the chunk that
caused it", "Easy", "Nothing extra") softened to what is true; "non-parametric memory" is now
credited to the original RAG paper (Lewis et al., 2020, arXiv 2005.11401), added to the references;
"position p is divided" corrected to the chunk's score; the reranker also raises precision when
fewer chunks are kept; the Summary now carries the source point; long sentences split.

## 🏁 Milestone M66: Where an agent finds current docs: llms.txt, MCP, Context7 (#49) — DONE

### Deliverables

- [x] In Context Engineering, "Using a Knowledge Base as Explorable Context" moves after
      "Explicit Planning (TODOs)" and, before DeepWiki, tells the story: knowledge cutoff, then
      `llms.txt` (a three-line example), then docs as MCP tools, then Context7 as one MCP server
      for many libraries; the existing figure stays.
- [x] Turkish and Persian follow; the quiz already holds five questions, the limit, and none asks
      about the moved section, so it is unchanged.

### Acceptance criteria

- [x] Every link fetched and titled from the page; the gate green.

**Report, 2026-11-06.** "Using a Knowledge Base as Explorable Context" now follows "Explicit
Planning (TODOs)", and the closing NOTE that points at Advanced Context Engineering moved after it,
so it still closes the techniques. Before DeepWiki the section tells the author's sequence:
knowledge cutoff, then `llms.txt` with a three-line markdown example (a made-up library, so no
real site's file is misquoted), then documentation as MCP tools with a pointer forward to Code
Agents, then Context7 as one MCP server for many libraries; DeepWiki follows as the same idea for
code, and a closing paragraph names what all of them share. Sources fetched: "The /llms.txt file,
v2" (Jeremy Howard, 2024-09-03) and Context7 (Upstash, "Up-to-date docs for AI agents"). Turkish
and Persian written as prose; the Persian mermaid check passes.

**Reviews (two Haiku, xhigh).** *Content:* "thousands of projects" was not supported by Context7's
own page, so it says "many libraries" in all three languages; two English sentences over the
length rule split; "a project by Upstash" and "September 2024" added; two Persian calques; the
objective reordered to match the body. The rendered-page review is reported under M67.

## 🏁 Milestone M67: Loop Engineering split into intermediate and advanced (#48) — DONE

### Deliverables

- [x] Agent Teams, Dynamic Workflows and Recursive Language Models move whole, with their figures
      and tables, into Advanced Loop Engineering, in English and Turkish (the Persian waits in
      `mini-courses/scratchpad/drafts/`, since a planned module has no `_fa.md`).
- [x] Loop Engineering keeps a short section saying these techniques exist and where they are
      taught; its summary, references, quiz and translations follow.

### Acceptance criteria

- [x] No paragraph lost: every moved paragraph is found verbatim in the advanced file; the gate green.

**Report, 2026-11-06.** "Agent Teams & Dynamic Workflows" (with Agent Teams, Dynamic Workflows,
both comparison tables and the subagents-vs-teams figure, which moved to `3_expert/images/`) and
"Recursive Language Models" (with CodeAct) left Loop Engineering for Advanced Loop Engineering.
In their place, "Beyond the Loops You Design": every loop so far is one a person designed; the next
step is an agent that designs the loop; three techniques, one line each, and a link to the advanced
module. The objectives, the summary's last paragraph, the four references and the Modules link
followed, in all three languages; "The Trend" stays. **Verbatim check, measured:** of the 27
English paragraphs moved, 25 are byte-identical in the new file and 2 changed only to re-anchor a
link ("Everything up to this point" now names Loop Engineering; the Advanced Agent Architectures
link is relative to `3_expert/`); the same two edits in Turkish. The planned page renders the
sections under its schedule (D102): two sections, FIG. 26.1, two tables, the references. Two unit
tests needed the D102 rule: "no figures on a draft" now reads "no figures on a draft with no
written sections" (with a length guard), and the Turkish coverage test passed once the Turkish
moved too. The Expert README's one line now names every Expert topic. **Gate:** typecheck, 1,158 unit tests, the build and the link check (191
pages, 12,452 internal links).

**Reviews (two Haiku, xhigh).** *Content:* the quiz's fourth question asked how a dynamic workflow
differs from an agent team, which this module no longer teaches (my grep had looked only at the
options); removed in three languages, three questions remain. Advanced Agent Architectures no
longer lists dynamic workflows, which Advanced Loop Engineering now owns. The car analogy is
restated in one clause where the advanced module calls it back. The Persian draft got the same two
edits and a Modules group. Two wording fixes; the new heading is "Agents That Design the Loop".
Left: a pre-existing Videos reference the body never links. *Rendered page, measured at 1440 and
390:* (1) at 390px every page with no in-page index kept an empty rail track, so a planned page's
column was 214px in a 375px window; `bazaar.css` collapses the shell to one column below 880px, but
the no-aside rule in `shell.css` out-ranked it. Fixed there, and `responsive.spec.ts` now asserts the
sheet takes over 80% of a narrow window. (2) The band read "PlannedSchedule of parts only", with no
separator, and "only" is false on a planned page that has written sections; it now reads
"Planned · Partly written" there (`StatusBand written`, unit-tested). (3) RAG's two tables shared
the caption "Measuring Retrieval" (a table takes its nearest heading), so the worked example has its
own heading in three languages. Left, pre-existing: a planned page has no contents rail (the
anatomy spec requires none), a light PNG on the dark ground, and "Reading time 0 m" in a planned
page's footer.

## 🏁 Milestone M68: Agents in Practice, Claude Duet, and the Claude logo — DONE

### Deliverables

- [x] **Agents in Practice**, after Code Agents: why take these courses and why Claude, then one
      section per Claude Academy course with what it is and who it is for. The engineer page:
      Claude 101, Claude Code 101, Claude Code in Action, Introduction to Claude Cowork. The For
      Everyone page (`everyone/agents_in_practice.md`, the first one): Claude 101, Claude Code 101
      as optional, Introduction to Claude Cowork. Cowork is explained against Duet, with a note in
      parentheses not to confuse them. English, Turkish, Persian, and a quiz.
- [x] **Claude Duet** in Personal Agents, with the three languages.
- [x] **An inline logo**: the Claude logo, at text height, in both themes.

### Acceptance criteria

- [x] Every course link fetched and described from its page; the For Everyone page renders on the
      For Everyone track; the gate green.

**Report, 2026-11-06.** **Agents in Practice** is module 12, after Code Agents, `ready`, 10
minutes, needing Code Agents. The engineer page opens by connecting to Code Agents, argues why
practice teaches what reading cannot, gives the author's three reasons for Claude as our view at the
time of writing, then a mermaid map of the order, then one section per course with what it covers,
who it is for, what it needs and how long it takes, each tied back to the module it puts to work;
the Cowork section explains Cowork (you start the work) and ends with the parenthesis not to confuse
it with Duet (Claude starts the work). Every course fact is from its own page, fetched today:
Claude 101 (13 lessons, about 2.5 hours, any plan), Claude Code 101 (12 lessons, about 1.5 hours,
developers, paid plan or API key), Claude Code in action (9 lessons, about 1 hour), Introduction to
Claude Cowork (14 lessons, about 2.5 hours, paid plan, no coding). The pages do not say a course is
free; that is the author's statement. Claude Code 101's page does not say non-programmers can use
Claude Code; the For Everyone page says it as our view. **The first For Everyone module**
(`everyone/agents_in_practice.md`, with Turkish and Persian, settling M52's first module): written
from scratch in plain words, three courses, Claude Code 101 marked optional. Quiz: four questions in
three languages. **Claude Duet** joins "More Personal Agents" in three languages, from Anthropic's
own page ("Claude Duet | A proactive AI agent to assist you"): Opus 5.5, its own computer in the
cloud, a morning brief, asks before sensitive actions, a US research preview for Pro, Max and Ultra.
**The inline logo:** a mark under `images/logos/` gets the class `bz-logo` from the renderer and is
drawn inline at 1.1em (measured 17.6px on 16px text), with an empty alt because the name beside it
says it; a paragraph holding only a logo would still become a figure, so a logo always sits beside
text. Claude's mark is Simple Icons 16.36.0's, with its brand colour `#D97757` and a 20px size set on
the root so GitHub draws it small; screenshots read in light and dark. The render test was seen
failing with the class line removed. The series map in the 21 Intermediate files (seven modules,
three languages) gained the new module, and Code Agents' last line now points to it. The browser
suite's drawing set is 43 sheets. **Gate:** typecheck, 1,160 unit tests, the build and the link
check.

**Reviews (two Haiku, xhigh).** *Content:* Duet's launch date is not on Anthropic's page, so it is
gone; Claude 101 now says Cowork and Research need a paid plan to try; the For Everyone page gives
Claude Code 101's real prerequisite (a code editor and the command line) and the API-key option;
the desktop app is needed for the folder lessons only; one quiz explanation now uses the module's
words and two weak distractors were replaced; idioms ("above all", "carries over", "from the
ground up") and four calques fixed. **Kept, and why:** "free" for the courses is the author's word;
no course page states a price. The For Everyone page has no quiz on purpose (`ModuleSheet`: the
quiz asks about the For Engineers text). The Office add-ins are on the Cowork course's page.
*Rendered site:* the logo, catalog, counts (43), pager, quiz (four questions in three languages)
and the For Everyone page were clean; at 390px the course-order diagram scrolls inside its figure,
as wide figures do. The For Everyone page's pager and prerequisite lead to For Engineers pages:
that is D91's rule (a For Everyone page where one is written, otherwise the For Engineers page) and
it is the only one written so far, so every link goes across; left as decided.

## 🏁 Milestone M69: Vendor logos where modules name them — DONE

### Deliverables

- [x] A Sonnet High audit of where modules name an agent or vendor, and a logo placed where it
      helps the reader find the thing.
- [x] Each SVG checked visually by a Haiku reviewer at xhigh before it is used, in both themes.

### Acceptance criteria

- [x] Every logo file is the vendor's own mark or Simple Icons', the shape unaltered (size, brand
      colour or black set on the root; xAI's empty canvas cropped to the mark); the gate green.

**Report, 2026-11-06.** **The audit (Sonnet, high)** read every written module and proposed 14
places where a product is introduced as one of a set of choices or for the first time, and
rejected passing mentions, tables, headings, references and lists where only a few brands have a
mark (the benchmark list would have read as a ranking). Taken: its 14, plus dots (OpenAI) and Grok
Bot (xAI) so that the five personal agents all carry one. **16 placements, 48 lines in three
languages, 13 distinct files** under each level's `images/logos/`: Simple Icons 16.36.0 for Meta,
Google Gemini, n8n, Replit, vLLM, NVIDIA, OpenRouter and LangChain; the official Hugging Face
logo and OpenClaw's favicon; OpenAI's 2025 symbol and xAI's mark from Wikimedia Commons; Claude as
in M68. A brand whose colour is near-black or too pale on cream (OpenAI, xAI, OpenRouter, LangChain)
ships black as `*-mono.svg`, and one rule turns it light on the dark ground (`prose.css`, `html.dark
.bz-logo[src*="-mono."]`). **The visual check (Haiku, xhigh), before commit:** 23 placements on 9
pages at three times the pixel density, light and dark: right brand, undistorted, visible in both
themes, centred within 0.4px of the text. It found two Persian lines where the logo sat beside the
English "personal agent" rather than the name (the bidirectional run carried it); a Persian word
after the name fixed both. Left: Hugging Face's yellow, NVIDIA's green and vLLM's blue are faint
(1.4 to 2.6:1) on the light ground, which is the brands' own colour; each sits beside its name.
**Gate:** 1,160 unit tests, the build, the link check.

**Second review (Haiku, xhigh), on the markdown.** Paths, counts across the three languages and the
SVG roots were clean. It caught three lists where one item carried a mark and its neighbours did
not (Replit beside Lovable and Bolt; vLLM and TensorRT-LLM with SGLang unmarked between them;
LangSmith beside Langfuse and Latitude), which breaks the audit's own rule, so those four marks
and their files are gone. Google Stitch now carries Google's mark (Simple Icons `google`, 4285F4)
rather than Gemini's. The SVGs have plain English titles (OpenClaw's favicon carried Portuguese
ones). **10 placements remain, 30 lines, 10 files.**

**PR #74 reviews, 2026-11-07.** *Sonnet (high):* it ran the whole gate in its own copy (all green)
and judged the code sound. Fixed: README and `index.md` still counted 8 Intermediate and 12 Expert
modules and named Training (now 9 and 16, listed); the Advanced LLM topic carried the author's
instruction to the writer ("without softmax, encoders and decoders"); the structured-output notes
sat where a planned sheet drops them, so they are now a `## Forcing Structured Output` section that
D102 renders, with item 01 shortened; Advanced Memory, whose only `##` is its references, said
"Partly written", so a references-only module now counts as not written (unit test, seen failing
without the check); "the other three assume Claude 101" is not on the course pages, so it is our
suggestion now (module and quiz); Code Agents named the "next module" for Harness Engineering;
`topics.txt`, the Generative UI series map, a double blank line. The Persian loss of the moved
Loop Engineering sections is recorded in D102 for the author.
*Gemini 3.8 Flash (high), through `agy`:* its first run returned nothing with exit 0 (it tried a
shell command, which headless mode denies); rerun told to use only file reads. Fixed, each guard
seen failing first: below 880px a folded rail still left a 0px column on pages with an aside, so
the one-column rule now covers every folded shell; a logo alone on its line would have become a
full-width numbered figure, so a `bz-logo` image is never a figure; the manifest test checks every
planned row, not the first; the dark-theme rule for mono marks sat in a surface stylesheet as
`html.dark`, so it is now a token (`--bz-logo-mono-filter`, `none` and `invert(1)` in
`bazaar.css`) read by `prose.css` on `-mono.svg` only; a fence now closes only on a run at least as
long as the one that opened it, so a ```` block may hold a ``` example.

---

## 🏁 Milestone M70: Search filters and the level bar on each result (D103) — DONE

### Deliverables

- [x] Filters under the search field: Track, Level and Language as toggle chips (the catalog's), each a
      `<button aria-pressed>`; no scope row for titles, prose or code.
- [x] The Language chip loads the other language's index on demand; the Track chip restricts to the
      For Everyone addresses; the Level chip filters by the document's level.
- [x] A bar in the level's hue on the start edge of each result, with the level named in its meta line.

### Acceptance criteria

- [x] A reader who touches no chip gets what D97 gave: the page's track and language, every level.
- [x] The index is unchanged; the dialog's shape, keys and focus return are unchanged.
- [x] Behavioural tests for each filter, the bar's colour and edge, the keyboard and 390px, each seen
      failing against a broken build.

**Report, 2026-11-07.** `SearchDialog.tsx` keeps what the reader pressed in `chosen`; a group left
untouched is the page's own, and a group with nothing pressed does not narrow. The level list comes
from `SiteHeader` as props (the dialog may not import the loader), and the result's level slug is
found from the stored level title, so no field was added to the index: **gzipped with `gzip -9`,
94,918, 119,978 and 123,651 bytes for en, tr and fa, before and after.** The "All tracks and
languages" checkbox is gone (D103), which changed one existing e2e test. The full e2e run found one
failure of mine: the catalog's fidelity test read the first `.bz-chip` in the document, which was now
a hidden chip in the search window, so `fidelity.ts` reads its chip roles inside `.bz-filters`.
**Mutations, each seen failing a named test:** level filter ignored; track filter ignored; the
chip's click not loading its index; the result row losing its `data-cat` (bar grey); a Persian row
losing its direction (bar on the wrong edge); the level name removed from the meta line; the chips
out of the tab order; every language pressed by default; the focus outline removed from a chip.
**Gate:** 1,163 unit tests in 67 files, the build and its link check (197 pages, 13,167 links), and
512 end-to-end cases passing with 10 skipped.

---

## 🏁 Milestone M71: The search filters fold away behind a Filters disclosure (D104) — DONE

The author, 2026-11-07: *"make the filter an accordion-like dropdown, meaning that when we search
normally it searches all, but if I click on the accordion, I can open filters and use them."* Built by
a Sonnet High subagent on top of M70, on the same pull request.

- [x] A closed-by-default "Filters" disclosure (`<button aria-expanded aria-controls>`, chevron)
      holding M70's chips and Reset link unchanged.
- [x] Shut, the search covers every track, level and language; open, the chips apply; closing stops
      the filtering.
- [x] Keyboard: field, Close, Filters, then the chips only when open, then the results; Escape still
      closes the dialog; the Tab trap ignores hidden chips.

**Report, 2026-11-07.** As D104 records: nothing is pressed on opening, so opening changes no result,
and closing stops the filtering rather than hiding it. `search.spec.ts` holds 24 tests, 10 new or
rewritten for the disclosure (the older chip tests open the panel first). **Mutations, each seen
failing:** chips applied while shut; `aria-expanded` stuck false; `aria-controls` at a wrong id; the
Tab trap counting hidden chips; other languages never loaded; opening pressing the page's own track
and language; the chevron not turning; the toggle's focus ring removed; Escape swallowed on the
toggle; the Reset link never shown; the panel starting open; the panel's `hidden` dropped. One
survivor showed a redundant rule (`.bz-search-filters[hidden]`, already hidden by the global
`[hidden]`), which was deleted. **Gate:** 1,163 unit tests, the build and link check, 520 browser
tests passed and 10 skipped.

## 🏁 Milestone M72: The stories at the gate stay through the first scroll; the choice's tellers speak — DONE

The author, 2026-11-07: *"the story of each character and their caption appear only if we are at
the absolute top of the website and with a single scroll step they disappear. Please make them
appear even after a single small scroll step and disappear only after everyone turned their face
towards the gate"*; then *"bezirgan and sipahi have no caption or cloud over them as a brief story.
add interesting one for them"*; then *"the cloud story of bit ai is layered under the open
curriculum button and is not visible. bring it forwards"*.

- [x] Captions and stories last until the last person has turned to the gate, not the first step.
- [x] The Sipahi's and the Bezirgân's stories open on the walk, with new wording for their tracks.
- [x] Bit's cloud is drawn over "Open the curriculum".

**Report, 2026-11-07.** **The first scroll.** `BUSY`, the chase time after which the people count as
on the move, was 0.4; Bit's head turns at 1.0 and the last follower finishes turning at 3.8. It is
now read off the plans (the latest `turnAt + turnDur`), so it moves with them. Measured at 1440 by
900: captions at full strength through 500px of scroll, gone by 600px (they faded on the first step
before). A cloud closed on any 40px scroll; on the walk the people stand while the page scrolls, so
the walk's allowance is 400px, measured on the page's scroll rather than the person's place on
screen (the walk scrubs with a lag, and a check on the screen closed a cloud a moment after it
opened). **The tellers.** Their captions were there, but their clouds never opened on the walk:
the street is `data-chasing` long before the choice, and `show` refused every cloud while chasing.
Only the gate's people are refused now, and the chase closes only their clouds (it had been closing
a teller's that focus had just opened). A keyboard focus on a teller jumps the walk about 7,000px to
the choice, so a teller whose caption holds focus keeps its cloud through scrolling, and an open
cloud is placed again on every frame for 1.5s after each scroll: placed once, at the moment of
opening, it sat 6,658px off the screen. The M63 test had passed because it ran on the still picture
only. New stories: the Sipahi checks every strap and buckle himself and trusts what he has seen
work; the Bezirgân explains every good in plain words, and if a buyer cannot follow, the fault is in
the explanation. **Bit's cloud.** The cast sits a layer below the gate's copy, so an open cloud now
lifts the cast above it (`.cast-box:has(.who-btn[data-open])`), only while open. **Tests:** three
new cast tests (the first scroll, the tellers at the choice, Bit's cloud over the button, sampled
along its top edge at 1280 by 720, where the two overlap); the chase point moved from 420 to 700px.
**Mutations, each seen failing:** `BUSY` back to 0.4; the chasing refusal for every cloud; the
layer lift removed (its first test sampled only the centre and passed, so it was rewritten); the
walk's allowance at 40px; the focus exemption removed; the chase closing every cloud; the
re-placing removed.

## 🏁 Milestone M73: Expert reordered, context forking, and Advanced Agent Servers drafted — DONE

The author, 2026-11-07: a new module "Advanced Agent Servers" noted in the scratchpad with four
topics (Aegra, SkeinJS, the Vercel AI SDK with durable orchestration, Redis Streams); "context
forking for subagents" in Advanced Multi-Agent; and Advanced Fine-tuning and Advanced Post-training
before Advanced RAG & Embeddings.

- [x] **Advanced Agent Servers**, a planned module after Advanced Deployment (English and Turkish),
      with the author's four options drafted as written sections (how it works, what it costs, when
      to choose it) and a comparison table, which D102 renders; the author's raw notes stay in
      `topics.txt`. First noted only in the scratchpad; the author: *"did you draft and include it
      in advanced agent server module? those text can be revised and initialized while the module
      is being planned"*.
- [x] Advanced Multi-Agent lists context forking for subagents (English, Turkish, notes, topics).
- [x] Expert runs Advanced LLM, Advanced Fine-tuning, Advanced Post-training, Advanced RAG &
      Embeddings, then the rest; the README, `index.md`, the Expert README, the level blurb and the
      ROADMAP line follow; `lokum-modules.css` and the browser suite's drawing set regenerated.

**Report, 2026-11-07.** Addresses are by slug, so nothing forwards; the Expert module numbers after
Advanced LLM shift by up to two, and the course now has 44 modules (Expert 17). A search for numeric
module references found only synthetic test fixtures and history comments, none pointing at a live
module; prose names modules by title. The README, `index.md`, the Expert README, the blurb and the
counts in INDEX and ARCHITECTURE follow. SkeinJS has no repository under that name, so its link is
a `NEED` marker in the file rather than a guess; Aegra (`aegra/aegra`) and the five documentation
links were checked. The Advanced Multi-Agent placeholder's dash
became a colon, the house rule.

## 🏁 Milestone M74: A logo for every company a module introduces (D105) — DONE

The author, 2026-11-07: logos for every vendor and company, not only a few per page; built by a
Sonnet High subagent, reviewed by a Haiku reviewer at xhigh.

- [x] Marks wherever a company, framework, library or tool is introduced, in English, Turkish and
      Persian, across Fundamentals, Intermediate and Ecosystem.
- [x] Every mark real, legible at text height, theme-safe, and bound to its name at line breaks.

**Report, 2026-11-07.** The subagent placed 79 new marks per language from 62 new files, reused the
existing ones, left 18 products plain because no real mark exists (Unsloth, MLX, llm-d, deepagents,
VoltAgent, Portkey, AgentRouter, DeepWiki, Moltbook and others), and rephrased 11 Persian lines so a
Persian word follows the name. **The review** found three marks that followed the operating system's
colour scheme rather than the site's (PentAGI, DocsGPT, Antigravity: the rule removed, DocsGPT made a
black `-mono` mark), five raster-or-unconfirmed files of 29 to 182 KB (LlamaIndex, NanoClaw, SGLang,
Open WebUI, and a traced portrait for Hermes), a drawn tile (DeepTeam), an unreadable wordmark (IBM)
and a pale yellow mark (LightRAG), all eight dropped; black tiles not named `-mono` (Bolt, Mastra,
renamed); Microsoft's mark on a grey plate (removed) and repeated on three items in a row (kept on
the first); the Gemini mark on Google AI Studio (now Google's); a mark on a passing mention in
Inference Engines (removed); and **five marks that wrapped onto a different line from their name**,
so the renderer now binds a mark to the word or name after it (`rehypeKeepLogoWithName`, a
`white-space: nowrap` pair; a unit test seen failing without it). Holding the whole name with its mark pushed the Security page 14px past a 390px window (the long bold names), so only the mark and the name's first word are held, the mark moving inside the name's link or bold. **Gate:** 1,164 unit tests, the build and link check, 524 browser tests passed and 10 skipped. **Now: 78 English placements, 66
files** (measured with `grep` over the modules and `ls` over `images/logos/`).

The `## Open questions` heading of `BRAINSTORM.md` had been deleted by the scripted insert that added
D104 (its text survived without the heading); restored.

## 🏁 Milestone M75: Course cards in Agents in Practice, Mermaid's own themes, and Mihrî at the gate (D106, D107) — DONE

The author, 2026-11-08, three subtasks given to one Sonnet High subagent on one branch while the
For Everyone blueprints were being decided: (1) the courses in Agents in Practice read "like just
another module", so readers skim past them; the page must tell them to STOP, take the courses and come
back; (2) the diagram colours are "bland", so the reader picks any of Mermaid's official themes, with
Mermaid's `default` as the default; (3) the cast has a foreign man, a foreign woman and a Turkish man but
no Turkish woman, so Leyla is to be replaced; first, five candidates to choose from in the playground,
then a redraw with no hijab ("I want characters without hijab"). Reviewed by two Haiku reviewers at
xhigh from two perspectives before the merge. Added during the milestone: the author picked candidate D,
Mihrî, for the home page, and asked for the fifth level to be titled "Emerging" instead of "Emerging Trends".

- [x] A STOP banner and one call-out card per course, in both tracks and all three languages, a real
      card on the site in both themes and in RTL, and a tinted box on GitHub (D106).
- [x] The reader chooses any of Mermaid's ten themes; `default` first and the default; the choice
      persists, applies before first paint and redraws every diagram live (D107).
- [x] Five Turkish-woman candidates, A to E, in `playground/2026-11-round-4/P-turkish-woman.html`,
      drawn like the cast, in period dress with a trade prop and uncovered hair, openable from the main
      checkout.
- [x] Mihrî (candidate D) replaces Leyla on the home page: art, name, story, tests.
- [x] The fifth level is titled "Emerging"; slug, folder and addresses unchanged.
- [x] Two reviews of the PR, their findings fixed, merged.

**Report, 2026-11-08.** One Sonnet High subagent built all of it on `feat/turkish-woman-and-course-card`
(PR #79). **Cards:** GitHub alerts become centred `bz-callout` cards with `role="note"`; the engineers'
track requires all four courses (7.5 hours, confirmed by the author) and For Everyone requires two (5 hours,
Claude Code 101 optional). **Themes:** ten Mermaid themes in a menu grouped Light and Dark; Mermaid 11.17.2
already shipped them, so no upgrade. Three themes needed one `themeVariables` override to clear the site's
floors (`neutral` node edge 2.46 → 3.9:1, `dark` edge label 4.43 → 6.1:1, `neo-dark` 2.25 → 4.3:1).
**Cast:** five candidates, redrawn without headcloths at the author's request; he chose D. Mihrî's art is
captured from the playground by `scripts/capture-cast.mjs`, and the other six re-captured byte-identical.
**Reviews:** the reader-side review found a contradiction (all four courses required, then a quick check about
which to skip), a card announced as a quotation, an unnumbered DESIGN deviation (now the eleventh) and wording
issues. The code review found that a link in a card kept any URL scheme, including `javascript:` (now an
allowlist, `src/lib/content/safe-href.ts`, with a corpus check), that the diagram label-contrast gate had been
dropped (restored for every theme, nothing exempted), a 20-cycle e2e test past the 30 s timeout (split per theme),
redraw races in `MermaidFigure`, and negative-only callout tests that passed with no callout. All seventeen
were fixed. **Gate:** typecheck, 1,229 unit tests, build and link check, 545 browser tests passed and 10 skipped.
Seen while checking: the home page keeps its light ground in dark mode, the same on the live site before this PR.

## 🏁 Milestone M76: The For Everyone approach recorded (D108) — DONE

The author, 2026-11-08: adding a non-technical version of each module "is actually an update to the
philosophy of this project", so record it minimally where the rules live. Decided first in five
blueprint batches, each approved by the author before any writing.

- [x] D108 in `BRAINSTORM.md`: what a For Everyone module is, what was rejected, and the per-batch
      decisions.
- [x] `MANIFESTO.md`: non-engineers as the fourth audience, and rule 19 (the same subject, never a
      lesser one).
- [x] `mini-courses/MANIFEST.md`: a short, reader-facing "Two versions of a module" section.
- [x] `mini-courses/CLAUDE.md` and `AGENTS.md` (byte-identical): how a For Everyone module is written.

## 🏁 Milestone M77: Nineteen For Everyone modules in English — DONE

Every written module of Fundamentals (8), Intermediate (7; Agents in Practice already had one, and
Generative UI is a draft) and Ecosystem (4; two drafts skipped), following the approved blueprints.

- [x] Fundamentals: LLM Fundamentals, Training LLMs, RAG & Embeddings, Tool Calling, Memory, AI Agents,
      Multi-Agent Systems, Observability.
- [x] Intermediate: Prompt Engineering, Context Engineering, Code Agents, Harness Engineering, Loop
      Engineering, Security, Personal Agents.
- [x] Ecosystem: Agent Frameworks, Inference Providers, Inference Engines, UI Design.
- [x] Every figure path resolves, no em dash, every diagram parses, the build and its link gate pass,
      and `src/app/lokum-modules.css` is regenerated in the same commit.

**Report, 2026-11-08.** Written in the main session from the approved blueprints. Each opens with "Why
This Matters to You" and ends with "Words You Now Know", Summary and quick check, and References.
Fundamentals keeps the core in full and runs 45 to 84% of the technical word count (RAG lowest, Memory
highest); Intermediate and Ecosystem run 41 to 68% (`wc -w` on each pair, median 59%). 47 of 48 images
kept, 14 of 23 diagrams. Gate:
typecheck, 1,229 unit tests (one reference-group order fixed in LLM Fundamentals), the build and link
check, `check-mermaid.mjs` on every file, and the rendered LLM Fundamentals page looked at.

## 🏁 Milestone M78: Turkish and Persian For Everyone versions — DONE

- [x] A `_tr.md` and an `_fa.md` beside each of the nineteen, written by Sonnet High subagents from the
      final English under the translation rules (native Turkish, colloquial Persian, the four Persian
      strings, structure kept).

**Report, 2026-11-08.** Four Sonnet High subagents, one per language and level group, wrote 38 files in
the main checkout without building or committing. Each checked heading, figure, code-fence and table
counts against the English, kept code blocks byte-identical, and ran `check-mermaid.mjs` and the corpus
tests. Corrections in review: the teaching examples in Training LLMs (the summary pairs and the
before-and-after answers) translated rather than kept as English data, because this reader needs them
in their language; the two new headings made the same in every file of a language (Turkish "Bu Senin
İçin Neden Önemli" and "Artık Bildiğin Terimler", Persian «چرا این برای تو مهمه» and «کلمه‌هایی که الان
بلدی»); Turkish "tarif" replaced by "açıklama" where it meant a description; two Persian links pointed
at the English module where a `_fa.md` exists. Gate: typecheck, 1,229 unit tests, the build and link
check, and every diagram parsed.

## 🏁 Milestone M79: Reviewed, merged, and nothing left stale — DONE

- [x] Two Haiku reviews at xhigh on the PR, from two perspectives; findings fixed.
- [x] Merged; kia-context, memory, and every CLAUDE.md and AGENTS.md current; no open PR of ours left.

**Report, 2026-11-08.** PR #80. **Review one (translations, docs, site risk):** the translations held
(structure, byte-identical code, links, site strings). It found the docs overclaiming: "almost every
figure" and "a third to a half" were replaced by the measured numbers (47 of 48 images, 14 of 23
diagrams, 41 to 84% of the words, median 59%); `INDEX.md` had stale rule, decision and milestone ranges;
"two versions of every module" became "each written module"; 25 Persian joins used a tatweel instead of a
zero-width non-joiner; and a few stiff Turkish and Persian lines. **Review two (English against the
originals):** every number and date checked out. Fixed: the Harness Engineering summary listed the system
prompt as part of the guarantee (it is advice); a UI Design accessibility bullet a screenshot can show;
invented details (a week, "goes slower", "quality drops only a little", "thousands of words"); absolutes
("almost every", "the most used", "the same day"); Loop Engineering's level headings now named as in its
diagram; Shannon, not Strix, proves an exploit; teaser lines ("Read it twice", "where the promise becomes
real"). One claim was not in the file (a loop-level note), and two were kept on purpose: the author's
müdür, hoca and öğrenci analogy (now glossed in English) and the Cowork line, which Agents in Practice
supports. A Sonnet subagent carried the meaning changes into the 38 translations. A search e2e test pinned
the engineers page as the top hit for a module's title; a For Everyone page now shares that title, so it
checks presence and language instead. **Gate:** typecheck, 1,229 unit tests, 545 browser tests passed and
10 skipped, the link check (16,831 links), and every diagram. **Left for the author:** the same Harness
Engineering summary sentence in the technical module, and the English objectives card on Turkish and
Persian pages (an M19 decision).

## 🏁 Milestone M80: One heading per shared section, English terms in translations, UI Design figures, more logos (D109) — DONE

The author, 2026-11-08, after reading the For Everyone pages: headings had been simplified and differed
from the technical track; technical concepts such as long-term memory had been translated into Turkish;
UI Design should show four screenshots he supplied; Portkey and VoltAgent needed logos, LangChain's should
be its parrot, and missing marks should be searched for online.

- [x] Every section both tracks share uses the technical heading, in English, Turkish and Persian (158
      headings aligned by position against the technical `_tr`/`_fa` files; two For Everyone-only
      sections keep their own).
- [x] Technical concepts kept English in Turkish and Persian, in both tracks where the technical
      translation had translated them (the memory types, Vector Database'ler, Tool Schema, the Context
      Engineering techniques, the loop levels and others).
- [x] Four figures in UI Design, both tracks and three languages: Google Stitch, Claude Design's
      templates and its Tweaks panel, and a Stitch design system next to a screen built from it.
- [x] Logos (D105 revised): LangChain's parrot, LangSmith's own mark, Portkey, VoltAgent, Unsloth, SGLang,
      llm-d, deepagents, AgentRouter, LlamaIndex, Open WebUI, nanoclaw, Hermes Agent, LightRAG, Pi Agent.

**Report, 2026-11-08.** Headings by a script that maps each For Everyone heading to its technical
counterpart and copies the technical translation at the same position; Turkish terms by hand from a
grep of every inflected form. A Haiku review of terms was started; the fixes here were chosen from my own
sweep. Logos by a Sonnet subagent from vendor repositories, sites and icon sets, checked on both themes in
204 screenshots. Gate below, with M81.

## 🏁 Milestone M81: Diagrams on each theme's own Mermaid background, and a copy button (D107 revised)

- [x] Each of the ten themes shows Mermaid's own `themeVariables.background` (white or #333), read from
      the installed Mermaid and guarded by a unit test against it.
- [x] Every diagram has the same copy control as a code block, copying its Mermaid source.
- [x] "Redux dark and redux dark color are duplicate": measured, not a site bug. Mermaid's `-color`
      themes colour groups, so the twins match on the 92 plain flowcharts and differ on the 6 mind maps
      and 6 subgraph flowcharts; both kept (PR #83).

## 🏁 Milestone M82: Agentic UI written, and Advanced Agentic UI planned (D110) — DONE

The author, 2026-11-09, approved a draft of the technical module after reading it in chat, and asked for
everything else: the GIF as WebP, Turkish and Persian, the For Everyone version and its translations, a
Haiku review, and the merge.

- [x] `ui` retitled Agentic UI and written (ready, 25 minutes), with a quiz; `advanced_ui` retitled Advanced
      Agentic UI with the author's topics; series maps, README and index renamed; `topics.txt` updated.
- [x] Two figures: the agent protocol stack (`ag-ui-mcp.png`) and a streaming run (`streaming-ui.webp`,
      converted from a 5.2 MB GIF to a 672 KB animated WebP at 1280 px, 344 frames).
- [x] Turkish and Persian technical versions, technical words kept English; the quiz in three languages.
- [x] The For Everyone version in English, Turkish and Persian, with the technical headings (D109).
- [x] A Haiku review at xhigh, findings fixed, merged.

**Report, 2026-11-09.** The technical module was drafted in the main session, shown to the author in
chat and approved; AG-UI facts read from its docs and its 1.0 JSON schema. Turkish and Persian by
Sonnet subagents with technical words kept English; the For Everyone version written in the main
session with the technical headings (D109) and a delivery-app picture for streaming, then translated.
**Reviews** (two Haiku, xhigh): the quiz's correct option was the longest in every question (rebalanced);
the protocol-stack caption said "one protocol on each side" while the picture puts MCP and A2A on the left
(fixed); the streaming caption did not describe the animation, an empty prompt that fills with a ticking
checklist (fixed); "most frameworks" and "every serious product" softened to what the sources support;
generative UI left only as a pointer; the wire spelling explained; a Persian register slip and Turkish
calques. Kept on purpose: the `topics.txt` edit, which the author asked for, and product screenshots with
English text in the translated pages. **Gate:** typecheck, 1,234 unit tests, build and link check, 561
browser tests passed and 10 skipped.

## 🏁 Milestone M41: The content bundle for the mobile reader (D89, D111) — PR #57

*Numbered M41, out of order: part 2 held the number for PR #57 while it was open.* The owner,
2026-11-09: one course, two apps; the design may differ, the logic, behaviour and content are the same
(D111). The PR was rebuilt on main after M43 to M82 rather than rebased: the bundle now carries both
tracks, call-out cards, logos, Mermaid's themes and the moved addresses.

- [x] The bundle under `out/api/` (ARCHITECTURE §13): level and module documents for both tracks and
      every language, tokens, the index with `tracks`, `diagramThemes` and `moved`, and the finaliser
      that draws every diagram in `default` and `dark` and hashes everything.
- [x] `module-render.ts`: the module page and the bundle read one render input (the link map per track
      and language, the quiz, a planned module's written sections); `ModuleSheet.tsx` and
      `LevelCatalog.tsx` read it, with no change to what they render.
- [x] Call-out cards (D106) as a `callout` block, vendor marks (D105) as a `logo` inline with its
      single-colour flag, WebP figures sized from their headers.
- [x] The record conformance snapshot answers for both tracks' maps (`everyoneSheets`) and the
      `diagramTheme` preference.
- [x] MANIFESTO §7 amended (D111; D90's bullet struck), rule 10 says what a device backup keeps (D89),
      root and corpus `CLAUDE.md` say where the app's content comes from.
- [x] Gate, 2026-11-09: typecheck; 1,459 unit and corpus tests; the build, with 186 diagrams drawn
      (largest glyph move 0.133 px), the bundle check and the link check; 562 browser tests passed and
      10 skipped; and the browser suite's own build gave a byte-identical `api/` tree.
- [x] The first sequence diagram (Agentic UI, M82) drawn: its icon symbols and actor names stripped
      as non-painting, each label's baseline folded into its y against the drawing, and punctuation
      after a right-to-left phrase kept with it so it is shaped in the same script.
- [x] Why PR #57's two CI builds disagreed: on a pull request, Playwright's git plugin fetched the
      base with `--depth=1` before the browser suite's build, which made the checkout shallow at
      main's head, so every revision read as that commit (CI printed `shallow: true`). Turned off
      with `captureGitInfo: { diff: false }`; it also gave the browser suite pages with a wrong REV.
- [ ] CI green on PR #57, and the deploy's wait for the live `contentVersion` seen working once.

Noted, not fixed (outside this PR): a vendor mark followed by a space and then a bold name
(`![X](logo.svg) **X**`) is dropped by `rehypeKeepLogoWithName`, because the space is taken as the word
to bind; the corpus always writes `)**X**` or `) X`, so no page shows it today.

## 🏁 Milestone M83: The cast's colours told apart, and Mei's dragon — DONE

The author, 2026-11-09: Murat, Mei, Dariush and Piri wore clothes too alike (Dariush and Piri the
same blue; Murat blue; Mei teal like Deniz). Changed at the source,
`playground/2026-11-round-3/N-cast-final.html`, and the six art files re-captured with
`node scripts/capture-cast.mjs`, so the playground and the site agree. D93 holds: Janissary red, imperial
yellow silk, an indigo Persian blue against a slate scholar's blue.

- [x] Murat's robe `#2E3A78` to `#B01E2E` (Janissary red); Mei's robe `#2F8C86` to `#E8B82B` (imperial
      yellow); Piri's robe `#282864` to `#4F6F94` (slate blue); Dariush keeps `#282864`.
- [x] Mei's embroidery: a coiled dragon down the skirt, ruyi cloud scrolls and a row of waves at the hem,
      and from behind a dragon roundel between the shoulders (`dragonSVG` in the playground page).
- [x] Nothing else moved: re-capturing before the edit gave a byte-identical tree; after it, Dariush,
      Deniz, Bit and Mihrî are byte-identical, Murat's and Piri's four files differ only in that hex, and
      Mei's differ by that hex plus the inserted dragon.
- [x] Gate: typecheck; 1,459 unit and corpus tests; build, link check and bundle check; 562 browser tests
      passed and 10 skipped. Screenshots in `playground/2026-11-round-4/shots-cast-colours/`.

## 🏁 Milestone M84: Course images as WebP (D112) — DONE

- [x] All 49 raster course images converted (48 to WebP, 1 kept), references in 104 module files rewritten (287
      links), originals removed from the tree and backed up outside the repo.
- [x] `mini-courses/CLAUDE.md` and `AGENTS.md`: new images are WebP at a measured quality.

**Report, 2026-11-09.** 30.1 MB to 6.2 MB of course images; the built `course-images/` 32 MB to 7.5 MB.
Every converted image has SSIM at least 0.985 against its resized original. Gate: 1,459 unit tests, the build
with its link check and `check-bundle-out.mjs` (131 images listed), 562 browser tests passed and 10 skipped.

## 🏁 Milestone M85: A2A introduced in Multi-Agent Systems — DONE

The author, 2026-11-09: Multi-Agent Systems should mention the Agent2Agent Protocol briefly, right after
"Building a Multi-agent", as an introduction only; the details belong to Protocols Reference. His draft
was the raw material: agents from one framework understand each other and agents from different frameworks
do not, A2A is the open standard between them, an Agent Card is the agent's CV, most projects never need
it, and the real case is an inter-organisation barrier (a flight company's agent asking a hotel company's
agent).

- [x] Technical section `## Agent2Agent Protocol (A2A)` with a simplified Agent Card and a sequence diagram,
      a Summary paragraph, references (A2A Protocol, Protocols Reference) and a fifth quiz question.
- [x] Turkish and Persian, technical words kept English; the quiz in three languages.
- [x] The For Everyone section under the same heading (D109), with two new terms, in three languages.
- [x] The author's two figures, as WebP (`a2a-flow.webp` from a 459 KB GIF to 210 KB, 10 frames;
      `a2a-interorganization.webp` 67 KB to 36 KB, SSIM 0.986), and his three references (the GitHub repo, the
      A2A site, Google's announcement).
- [x] "Do not confuse" reminders: the inter-organisation figure at the end of Code Agents' MCP section (MCP
      connects tools, A2A connects agents), and a line under Agentic UI's protocol stack pointing back to
      where MCP and A2A were taught.

**Report, 2026-11-09.** English written in the main session from the author's draft, with A2A's facts read
from its site (created by Google, donated to the Linux Foundation, a technical steering committee; the Agent
Card at `/.well-known/agent-card.json` with identity, endpoint, capabilities, authentication and skills; MCP
and A2A "highly complementary"). Corrected from the draft: the inter-organisation barrier *prevents* agents of
different organisations from talking. Turkish and Persian by Sonnet subagents, technical words kept English;
the quiz's fifth question rebalanced in each language so the right option is never the longest. Gate: 1,459
unit tests, build with link and bundle checks, 562 browser tests passed and 10 skipped.

## 🏁 Milestone M86: Why coordination makes multi-agent fragile, with one example — DONE

The author, 2026-11-09: under **Coordination** in Multi-Agent Systems, say it is an advanced topic for
Advanced Multi-Agent, and show one basic example with his figure: two parallel subagents that cannot see each
other may duplicate or contradict each other's work.

- [x] The note, the figure (`parallel-subagent-drawback.webp`, 100 KB PNG to 36 KB, SSIM 0.995) and a short
      paragraph, in both tracks and three languages; the For Everyone version with a two-colleagues analogy.

## 🏁 Milestone M87: The home page in Turkish and Persian (D113) — DONE

- [x] `/tr/` and `/fa/` render the home with its content translated (hero, reading question, track stalls and
      tellers' stories, the cast's trades and stories) from one table; names, menus and every linked page stay
      English; `/` unchanged and English by default.
- [x] Persian text right to left in Vazirmatn, the scene never mirrored; nothing clipped at 390 or 1440.
- [x] A Haiku review at xhigh, findings fixed, merged.

**Report, 2026-11-09.** Built by a Sonnet subagent: one `HomeStreet` component, three route files, one copy table
guarded by a derived unit test (every language has every string, none left in English, names kept). The language
menu now appears on the home page. A story cloud on the track stalls was clipped at 390 px in every language,
English included; the clip moved onto the picture. **Haiku review (xhigh):** no blocking finding. Fixed: the level
doors' `aria-label` is a menu name, so it stays "Levels" on every address; Turkish "kopya kâğıdı" (an exam crib)
became "hızlı bir başvuru kartı"; Persian "می‌گیم" became "یاد می‌دیم"; two stiff Turkish lines; the name guard
matches whole words and now covers the tellers (seen failing with the Sipahi renamed). Kept as built: the stall
signs translate "For Engineers / For Everyone", because the stalls are content. Gate: 1,474 unit tests, build with
link and bundle checks (bundle unchanged), 595 browser tests passed and 10 skipped.

## 🏁 Milestone M88: Dariush's Persian embroidery — DONE

The author, 2026-11-09: *"for the dariush character, ask sonnet to draw a persian symbol on his clothes
similar to the chinese girl. symbol should be persian Toranj or Sarv show me 3 examples"*, then *"I
select C"*. Three options were drawn in `playground/2026-11-round-4/Q-dariush-motif.html` (A one
large toranj, B a column of boteh, C a smaller toranj, a hem of sarv and cuffs), in front, back and
running views, the cast line-up and the phone row.

- [x] **Option C at the source**, `playground/2026-11-round-3/N-cast-final.html`: the embroidery
      functions, a hook in `torsoSVG` and one in `armSVG`, and `persian:{k:'C'}` on Dariush. Thread
      gold `#DDB46A` and Mei's dragon crimson `#B3262E`, teal and ivory as accents; the robe, pose,
      carpet and hat unchanged.
- [x] **`node scripts/capture-cast.mjs`** rewrote only `cast-dariush.html` and `cast-dariush-tile.html`;
      the other six figures came out byte-identical. The home page looked at on the build at 1440.

## 🏁 Milestone M89: A block's option menu is never clipped and never leaves the window (D114) — DONE

- [x] The diagram theme menu and the code palette menu open in the top layer, wholly inside the window at 1440 and
      390 px, with the block near the top or the bottom of it.
- [x] A browser test holds a block to 96 px and asserts every option is the topmost element at its centre and
      inside the window, and that the page gains no sideways scroll.

**Report, 2026-11-09.** Cause: `.bz-slab { overflow: hidden }` cut a code block's menu; a diagram's menu was not cut
by its block but hung off the window's bottom. Fix in `ReadingOptions.tsx` and `bazaar.css`; build markup and the
bundle unchanged. The new test failed 6 of 8 cases on the unfixed build (all four code cases, the two diagram
cases near the window's bottom) and passes 8 of 8 after.

## 🏁 Milestone M90: About, the story of the Bazaar — DONE, PR #97 (D115)

The author, 2026-11-09: a new page named **About** that tells why the project exists, in five stalls
and a motto, *"Imperfect Human Art with Soul. Not a Curriculum."* The text is his and final; it lives
in `mini-courses/STORY.md`. The page is to feel artistic, possibly on a darker ground, with a heavy
scroll: each stall's text appears after the reader arrives, beside an animation or object tied to its
heading, text and object swapping sides from stall to stall.

- [x] **`mini-courses/STORY.md`**, verbatim, linked beside MANIFEST and ROADMAP in `README.md` and
      `mini-courses/index.md`.
- [x] **Round-5 playground** (`playground/2026-11-round-5/`): three backgrounds and three overall
      designs (`R0-about-design.html`), and five animations per stall (`R1` to `R5`), the first of
      each the author's idea (a wojak generating slop, a needle in a haystack, humans for humans, a
      cherub with bow and arrow in the spirit of *Labor of Love*, a portrait of Nietzsche). Each drawn
      by its own Opus agent. **Report:** the author picked B2 + F1 with smaller, column-wide headings,
      2A, 3E, 4E and 5A, and no scene in a box (D115); the HTML is committed, the screenshots are not.
- [x] **The page at `/about/`** (D115): `src/app/about/page.tsx` in `PageShell`, the text from
      `mini-courses/STORY.md` (`lib/content/story.ts`), the page `components/about/AboutStory.tsx`, one
      island (`AboutMotion.tsx`) that imports `gsap` on demand (`motion.ts`), `src/app/about.css`, the
      palette in `components/about/palette.ts`; linked from the footer; crumb `About the Bazaar`.
      **Report:** MEASURED on the build: `out/api/v1/` unchanged but for `publishedAt`, which is the HEAD
      commit's time (contentVersion `d01d5a62…` both times), the link gate and the bundle check pass; 390 px `scrollWidth` 390; with the
      script blocked and under reduced motion every heading and paragraph is visible and nothing pins.
- [x] **Its tests**: `tests/unit/content/story.test.ts` (one stall per `##`, in order, the motto from the
      closing line, any story), `tests/unit/about-palette.test.ts` (the palette and the stylesheet name the
      same properties), `tests/e2e/about.spec.ts` (order, no-JS, reduced motion, 390, no box), `/about/` in
      the route lists of `navigation.spec.ts` and `layout.spec.ts`, `components/about` and `app/about` in
      the copy register. **Report:** each e2e assertion seen failing once under an injected defect
      (swapped stalls, hidden text, a 460 px body, the scene above the text, a border, a fill, a clip,
      a painted canvas corner).
- [x] **Stall 1's scene**: the author picked **1B6, "Down the table, revised"** (D115), built as
      `components/about/scenes/TreatyScene.tsx` from `treaty.ts`, where one pure `frame(t)` both writes
      the still into the page and moves it (`treaty-motion.ts`); it replaces `PendingScene`, which now
      only holds the place of a `##` section the art has not reached. **Report:** MEASURED on the build:
      the still (reduced motion and no script) shows page 412 of 412, the yes page and the raised cup;
      at 390 the hall stays inside the window (`scrollWidth` 390); the about, responsive, accessibility,
      navigation, layout, colour-not-alone, site-footer and containment specs pass (184 passed, 8 skipped),
      and the copy register passes, with no exemption beyond the two 4E meme captions (each for one
      ban, D115). Bit's bubble in stall 4 was moved left
      (x 390 to 574 of 600): its longest line, "humour.exe not found", now ends 20 units inside it,
      measured with `getBBox()` for all three of its lines.
- [x] **Two Haiku reviews of PR #97, fixed.** The haystack keeps its named still in the tree while the
      canvas draws (opacity, not visibility); scenes restore from a `snapshot` of their own attributes
      instead of GSAP's `clearProps: 'all'`, which had wiped the fonts React wrote; the still of stall 1
      shows the question too; the phone stage stops 2px inside the window (it ran 13px past); the stall
      rail follows the story in the document; `gsap` is not fetched under reduced motion; the parser keeps
      `## Why C#`, takes only an `Our motto:` line as the motto, and refuses `###`. **Report:** new and
      tightened checks in `about.spec.ts`, `colour-not-alone.spec.ts`, `accessibility.spec.ts` and
      `story.test.ts`, each seen failing once against a broken build or input (the PR says how).
- [x] **In the bar, last, after Caravan** (the author, 2026-11-10: *"the about page should be also in
      navbar as the last item right after Caravan (as well)"*). Still in the footer. On a phone About
      shares Caravan's cut edge: `tracks.spec.ts` now allows at most two `data-bar-edge` items, requires
      them to be the last in the bar, and scrolls each fully into view on focus. D115 records the reversal.

## 🏁 Milestone M91: Caravan built, C4 Shadow Play on sample data, its format and its pipeline (D116) — DONE, PR #98

The author's picks from round 5: C4 Shadow Play (*"I love C4 the shadow play!! it is very turkish!!"*),
with his three changes; content format 2 (*"I need only 2 ... caravan can act like a quick overview of
whats trending"*); and the pipeline's defaults. On the page: *"mention the above is illustrative and is
not ready."* Why each choice was made, and what was rejected: **D116**.

- [x] **The round-5 Caravan files committed**: `C1-caravan-designs.html` (the spec), `C1-caravan-designs-v1.html`,
      `C2-caravan-node-formats.html` and `caravan-pipeline/` (the draft skill, the design note and its source
      tests, kept as the record of the round).
- [x] **Format and validation.** `mini-courses/caravan/trends.yaml` ships with no trends and a comment
      showing the shape; `strength.yaml` is the pipeline's and is absent until it measures.
      `src/lib/content/caravan-file.ts` holds both to the rules in ARCHITECTURE §14 at build time.
      `tests/unit/content/caravan-file.test.ts` runs every rule against made-up YAML, and each of ten
      rules, removed one at a time, turns it red.
- [x] **The page.** `/caravan/` in `PageShell`: the notice, the head, the journey (year bar and place,
      the stage, the strip, one card) and the list of every trend as server markup; one island loads
      `components/caravan/scene/` on demand. Sample data from `components/caravan/sample-trends.ts`
      until the file has a trend. Colours in `components/caravan/palette.ts` as `--caravan-*`
      (`tests/unit/caravan-palette.test.ts`, which found one dead token, `strip-area`, on its first run).
      The mockup's `Curriculum` link is gone with its bar; in 2024 the stop's name no longer sits on the
      medallion. The `data-bar-edge` nav entry is unchanged.
- [x] **`tests/e2e/caravan.spec.ts`**: the notice first and on screen; every trend's words in the page
      with scripts blocked and drawn as a stop; the year bar moves the scene; Enter opens a stop and Escape
      closes it, by key presses after Tab; along the whole road at 1440x900 and 1280x720 no puppet meets a
      stop, a stop's hit area or a label, and no label meets a year's post; no sideways scroll at 390;
      instant movement and no animation under reduced motion. Each case was seen failing against a
      mutation of the code (nine mutations, listed in the report).
- [x] **The pipeline as a project skill**, `.claude/skills/caravan-trends/SKILL.md`: backfill once from
      2022-11, then quarterly; collectors per source family, a fresh verifier, a measurer, a proposer and
      the author's three gates; what a run never does; circuit breakers; how a run is recorded. `.caravan/`
      run folders are gitignored.
- [x] **`mini-courses/CLAUDE.md` and `AGENTS.md`**, byte-identical: Writing a Caravan trend.
- [x] **The mobile bundle unchanged**: `out/api/` byte-identical to a build of `main` (`fc61469`) made in a
      scratch copy, contentVersion `d01d5a62…` on both; ARCHITECTURE §13 says what Caravan's later v1
      addition would be.
- [x] **Two reviews of PR #98, every item fixed**: the stage fitted to the window so the caravan and the
      strip are in view at 1280x720, 1440x800 and 1440x900; the wheel's pace (3,000 px for the road, the
      page's at both ends, Shift and sideways swipes); the card's `aria-expanded`, focus into the card and
      Escape's focus rule; a clean redraw on resize; focus rings at 3:1 in the lamp's colour; `aria-current`
      and an announcement only on a picked year; the unmeasured note; `measured_through` checked and shape
      errors naming the trend; no double toggle on Enter; the card and strip on the language's slab and bar;
      the skill's cut points decided by the author at a gate. The first real trends are M92.

**Report, 2026-11-09.** Gate: typecheck clean; 1,500 unit tests (1,474 before, the 26 new ones the validator, the view model and the palette); the build with its link gate (206 pages, 17,831 internal links) and bundle check; 613 browser tests passed and 10 skipped, on port 3333 because another session's server held 3111. **Mutations, each seen failing:** in the browser, the notice moved under the head, an entry's text dropped, the scene drawing one trend fewer, a dead year bar, a dead Escape, the caravan on the upper band, labels not clearing the posts, a year bar wider than a phone, and reduced motion ignored; in the validator, rules 1 to 6 of `trends.yaml` (rule 2 twice), `z.object` in place of `z.strictObject`, and both `strength.yaml` rules. **Two guards were vacuous at first and are fixed:** at 1280x720 the stage's foot is below the fold, so the walk's wheel turned outside the viewport and the road never moved (the test now scrolls the stage in and requires the walk to reach the road's end); and the too-wide mutation was undone by the rule's own later `min-width: 0`. **Two departures from the brief, both forced by existing rules:** the phone width is 767px, the language's touch floor, not the mockup's 720 (`styling-references.test.ts`); and the trail stays above the notice, because `navigation.spec.ts` requires one on every page but the front door, so the notice is the first thing of the page's own content rather than of `<main>`. Screenshots of the built page at 1440, 1280x720 and 390 (rest, a stop open, later years, reduced motion, the list, dark) are in `playground/2026-11-round-5/shots-caravan-built/` in the main checkout, and match the `C4b-*` references.

**Review fixes, 2026-11-09**, after two Haiku reviews of PR #98, rebased onto `main` with PR #97 merged.
MEASURED with the stage fitted: at 1280x720 the stage ends at 643 px and the strip at 707 of 720; at
1440x800 at 723 and 787; at 1440x900 the stage is the full 470 px. Gate: typecheck clean; 1,520 unit
tests; the build, link gate and bundle check; `out/api/` byte-identical to a build of `main` at
`ad76978` (only `index.json`'s `publishedAt`, the commit date, differs from the earlier build of
`fc61469`); 634 browser tests passed and 10 skipped, on port 3333. **Mutations, each seen failing:** the stage not fitted (fails at 1280x720 and
1440x800), the old 12,000 px wheel pace, the wheel never handing back to the page, a preview not setting
`aria-expanded`, a pin leaving focus on the stop, Enter toggling twice, Escape always taking focus,
stale classes after a redraw, the language's focus colour on the leather, every January announced,
`aria-pressed` again, a dead drag, Page Down by six months; in the validator, both bounds of
`measured_through` and shape errors without the trend's id; and the unmeasured note missing, or shown on
the sample. **One guard was vacuous at first**: the sideways-swipe case compared the strip with month 0,
and the view starts at month 1, so it passed with sideways swipes ignored; it compares with the start
now. Screenshots replaced in `shots-caravan-built/`, with the caravan mid-road at 1440 and 1280x720.


## 🏁 Milestone M92: Caravan's first real trends — WAITING FOR THE AUTHOR

Nothing here starts until the author asks for the backfill. It is written down so the loop has the
next step, and so the sample does not stay by default.

- [ ] **The backfill**, by `.claude/skills/caravan-trends/`: the leads, Gate A (the author keeps the
      candidates), the measurements, Gate B (he decides each trend and writes its title and paragraph;
      he also decides the method's cut points from the first run's evidence), Gate C (the diff).
- [ ] **The sample removed in the same pull request**: `src/components/caravan/sample-trends.ts` and its
      import deleted, and the page's notice reworded with the author.


## 🏁 Milestone M93: Caravan, round 2: a taller, closer stage on long rods, and the trends browsed like the catalog (D117) — DONE, PR #100

The author, on the built page: *"everything is fine, but overall the module of shadow play must be
larger in terms of height. also the caravan should be about 30 percent higher level because currently
everything is too small and zoom is very out that everything looks very small and it is not clearly
visible that caravan objects are actually on a stick (the stick is not long enough). also the trend cards
below should have filter based on year and search bar and be visible in card mode and in list mode,
somehow similar to catalog page and we should use paging meaning that even after filtering, not all
should be visible and only 12 of them should be visible at a time and we should provide
industry-standard buttons so they can be next and previous page. also use some shadow and a bit
animation for when we hover over each card. also remove the "What the road of AI engineering carried,
season by season, since November 2022." and "2026 · The sea port" rows."* Then, while it was being
built: *"ok no need for shadow or 2px lift. but at least each card should get color change or border
color change similar to the ones in catalog".* Why each choice was made, and what was rejected: **D117**.

- [x] **The two rows removed.** The line under the title and the place beside the year bar are gone; the
      head is the title and the year bar. A picked year's place is still announced in the hidden live
      region. Their height went to the stage.
- [x] **A taller stage, zoomed in.** The stage is as tall as the window leaves, now up to 640 px (was
      470), and the scene is drawn at the zoom that fits it (`zoomFor` in `scene/shadow.ts`), capped by the
      window's width; puppets, props, posts, bands and the pace across the road scale with it. Each stop's
      hit area now ends at the land, so it never reaches the lower road.
- [x] **Long rods.** The cloth ends above a ledge sized to the zoom; each puppet's rod is pinned to the
      leather and runs across the ledge off the stage, a dark edge under a light core (`--caravan-rod`),
      outside the wobbling leather so the stick stays put while the puppet rocks.
- [x] **The trend list as a browser** (`TrendBrowser.tsx`, the rules in `browse.ts`): a search of the
      title and the text, a year filter (All and every year of the road; a trend shows in every year its
      span touches), a Cards and List view, twelve to a page after filtering with Previous and Next
      (disabled at the ends), page numbers with `aria-current="page"`, and "Showing 13–22 of 22" in a live
      region. A filter or a search goes back to page 1; a new page puts focus on the list's heading. The
      controls are the catalog's classes (`bz-filters`, `bz-chip`, `bz-viewtoggle`, its view icons, its
      count and empty state). Without a script every trend is listed and no control is shown.
- [x] **Hover as the catalog's**: a card takes the catalog card's strong edge (`.bz-catcard:hover`), a
      row the sunken fill the language gives the rows of the catalog's Table view (`.bz-row:hover` in
      `bazaar.css`). No shadow or lift was shipped: the author withdrew that request before the pull
      request, so nothing was recorded for it in DESIGN.md or the tests. Nothing moves.
- [x] **Tests.** `tests/e2e/caravan.spec.ts`: the whole caravan and strip in the window at 1280x720,
      1440x800 and 1440x900 with the leader at least 13.5% of the window's height and every rod pinned to
      its puppet and showing 20 px or more below the cloth; the head is the title and the year bar and no
      "year · place" row is on screen; without a script every trend is listed and no control shown; twelve
      a page, Previous and Next disabled at the ends, the count, focus at the heading, every trend once
      across the pages; a year keeps exactly the trends its span touches and goes back to page 1; the
      search reads the text in any case, and an empty result says so and clears; Cards and List with
      `aria-pressed`, keeping the page; hover changes a card's or a row's colour, and nothing moves or casts
      a shadow. `tests/unit/caravan-browse.test.ts`: the filter, the pages and the count. (Extended after
      review, below.)

**Report, 2026-11-10.** MEASURED on the built export, against a build of `main` (`c567a08`) made in a
scratch clone; the leader is its painted leather without the rod:

| Window | Stage before → after | Leader before → after | Rod shown below the cloth |
|---|---|---|---|
| 1280x720 | 369 → 408 px | 79 → 102 px (+29%) | 1 → 31 px |
| 1440x800 | 449 → 488 px | 96 → 128 px (+33%) | 1 → 39 px |
| 1440x900 | 470 → 588 px | 100 → 132 px (+32%) | 1 → 40 px |
| 390x844 | 371 → 420 px | 64 → 80 px (+25%) | 1 → 26 px |

The strip still ends at 707 of 720, 787 of 800 and 887 of 900. Gate: typecheck clean; 1,528 unit tests;
the build with its link gate (207 pages, 18,079 internal links) and bundle check; `out/api/` byte-identical
to the `main` build; 641 browser tests passed and 10 skipped, on port 3111. **Mutations, each seen
failing:** the new scene cases against `main`'s own build (leader 79 to 101 px, rods 1 px below the cloth,
the head holding the line under the title), and on a dev server: the zoom at 0.78 of its value, rods
ending at the feet, 30 a page, Previous and Next never disabled, no focus at the heading, the count without
its total, a year keeping only trends that start in it, a filter keeping the page, a case-sensitive search,
a search of titles only, clearing dropping focus, a view switch that never changes `aria-pressed`, List
keeping the card grid, the server render already paged (no-script list), a card or a row unchanged under
the pointer, a card that still lifts, and the first-paint CSS one off the page size (unit). **One guard was
vacuous at first:** the search case took the first long word of the text, which was in the title too, so
a search of titles alone passed; it now takes a word only the text holds. **Two guards were retuned for
the zoom**, not weakened: a month is up to 340 px at these sizes (was 260), so the drag case pulls 600 px
instead of 300 and the walk case expects more than 50 label-and-post comparisons instead of 100.
Screenshots of the built page at 1440, 1280x720 and 390 (rest, walking, a year, Cards, a hovered card,
List, page 2, the pager, a search, and dark) are in `playground/2026-11-round-5/shots-caravan-round2/` in
the main checkout.

**Review fixes, 2026-11-10**, after two Haiku reviews of PR #100:
- The page's `description` no longer carries the removed sentence.
- Every stop's name is kept on the cloth (`stops.ts` slides it in from either frame, 28 px from the
  stage's edge); at 1280x720 "Open weights spread" had run over the right frame. The walk case checks
  it at every step, and now runs at 1440x800 as well.
- The controls and the paging wait for the list's own island (`data-cv-browse`), so a page whose
  islands failed to load lists every trend with no dead control (D117); the first-paint cap of twelve
  is gone, with its unit test.
- The search lowercases with `toLowerCase`, not `toLocaleLowerCase`, so a Turkish-locale browser
  finds "Interview".
- A `#trend-<id>` address that does not decode is ignored; one on page 2 or later opens that page and
  scrolls the trend into view.
- The count's live region speaks once the count holds still for 500 ms.
- The hover comments say where each rule comes from (the card's from `catalog.css`, the row's from the
  language's `.bz-row:hover`, which the catalog's Table rows carry).
- The scene's year group is named "Journey year", apart from the list's "Year".
- List view has one rule under the filter bar, not two, and the filter bar takes the catalog's 20 px
  padding.
- A scene that throws on its first draw removes its listeners and reports failure.
- The empty result names only the filters that are set.
- The phone's caravan starts 28 px in, as the desktop's does: at 390 its rear camel had started 10 px
  under the frame, which the new phone case found.

New tests:
- Unit: 12, 13, 24 and 25 trends, `pageCount(12)`, a search of spaces, and the Turkish I.
- Browser:
  - the islands never loading;
  - the count said once per settled search;
  - a link to a trend on page 2, with scroll anchoring off, as in Safari, and an address that does not
    decode;
  - the pager absent with one page;
  - no two groups sharing a name;
  - the caravan, its rods and every label in the window at 390.

The walk's label-and-post floor is now each size's MEASURED count less a fifth: 105, 86 and 83
comparisons at 1280x720, 1440x800 and 1440x900, so floors of 84, 68 and 66.

Gate: typecheck clean; 1,530 unit tests; the build with its link gate (207 pages, 18,079 internal links)
and bundle check; `out/api/` byte-identical to the `main` build except `index.json`'s `publishedAt`,
the commit date. The caravan, responsive, accessibility, navigation and layout specs: 159 passed and 2
skipped, on port 3111.

**Mutations, each seen failing:**
- `toLocaleLowerCase` again;
- the query not split into words;
- a page count of `floor + 1`;
- labels not kept on the cloth (four cases);
- the controls keyed on the early `data-cv-script` mark;
- no announcement delay;
- the hash not guarded;
- no scroll after paging;
- the hash never opening its page;
- the pager drawn for one page;
- both year groups named "Year";
- the posts hidden (the walk's floor);
- the phone caravan back at 16 px.

**Two survivors were rewritten:**
- A whitespace mutation that dropped the empty-word filter was equivalent (an empty word matches every
  text), so the query's splitting was broken instead.
- With scroll anchoring on, Chrome keeps the browser's own jump to the address in place, so the scroll
  mutation passed; the case now turns anchoring off, which is Safari's behaviour, and the mutation fails.

Screenshots re-shot in the same folder.

## 🏁 Milestone M94: Key Terms at the end of every written For Engineers module (D118) — DONE

A reader's feedback (2026-11-10): *"Kavram sayısının çok arttığı bölümlerde her bölüm sonuna hızlıca
bakılabilecek özet bir tablo yararlı olabilir. Hem bölüm tamamlandıktan sonra hem de sonrasında bakıp
hatırlamak istediğimizde günü kurtarır."* The author: *"as you know in for everyone track, we have
"Words You Now Know" which tells the keywords learnt. I want the same thing in same shape, but with an
engineer-suitable tone and language in the for engineers part at the end of each module similar to for
everyone track ... do it for all modules written, for all languages."*

- [x] **The rule**, in `mini-courses/CLAUDE.md` and `AGENTS.md` (byte-identical): `## Key Terms` /
      `## Temel Terimler` / `## اصطلاح‌های کلیدی` just before the series map, `- **Term**: one line`,
      engineer's words, every fact from the module, terms English in Turkish and Persian.
- [x] **All 21 ready modules, in English, Turkish and Persian** (63 files), written by seven Haiku
      xhigh agents in parallel, three modules each. Measured: each of the 63 files has the heading
      exactly once; no tatweel in any Persian file; the diff is insertions only. Term counts run from 8
      (UI Design) to 15 (LLM Fundamentals).
- [x] **Gate:** typecheck, `npm test` (1,520), build, link check and bundle check pass; the full
      browser suite runs in CI.

## 🏁 Milestone M95: Six images in Inference Providers and Inference Engines — DONE, PR #104

The author: *"in the proper place of inference engines and inference providers, use these images"*,
with six of his own files. No decision was rejected, so there is no D entry.

- [x] **Six files converted** to WebP in `mini-courses/4_ecosystem/images/` (D112: resized once to at most
      1,600 px wide, the first of q82, q90, near-lossless 60 whose SSIM against the resized PNG, measured
      on the decoded WebP with ffmpeg, is at least 0.985):

      | File | Source | Final | Setting | SSIM |
      | --- | --- | --- | --- | --- |
      | `anthropic-pricing.webp` | 974 px PNG, 114,584 B | 38,172 B | q82 | 0.9969 |
      | `openrouter-models.webp` | 1,577 px PNG, 171,414 B | 53,460 B | q82 | 0.9930 |
      | `openrouter-gateway.webp` | 1,400 px PNG, 990,444 B | 55,916 B | q82 | 0.9858 |
      | `inference-engine-layers.webp` | 2,560 px WebP, 67,254 B, resized to 1,600 px | 48,934 B | q82 | 0.9871 |
      | `inference-server-engine.webp` | 1,400 px JPEG, 113,381 B | 107,388 B | q90 (q82 gave 0.9791) | 0.9887 |
      | `llm-inference-landscape.webp` | 1,213 px PNG, 305,505 B | 55,602 B | q82 | 0.9865 |

      The landscape PNG has a transparent background (mean alpha 0.6): measured as it came, SSIM read
      0.86, because the encoder drops the colour under transparent pixels. It was flattened onto white,
      which is how the author sees it, and the black labels would vanish on the dark theme without that.
- [x] **Placed where the text discusses the idea**, in all twelve files (the module, its `_tr` and `_fa`,
      and the same three for the For Everyone version): the gateway diagram in the Gateway section after
      the benefits list; Anthropic's pricing after the list of what only the maker ships; OpenRouter's
      model list under "What to Compare, Beyond the Price"; the layer stack once the engine is defined;
      the server and engine diagram in the batching section; Wing's map ending "The Engines, by the Size
      of the Problem", with one sentence to introduce it. Captions credit the pricing pages and Wing's
      map, quote no price, and say what the picture cannot (a cache write costs more than a plain
      input, the batch listing has no latency, the engine is only the inner box, lock-in is the price
      of one integration).
- [x] **Checks**: `npm test` green; `npm run build`, the link gate and `check-bundle-out.mjs` green;
      each file name found under `out/courses/`; the figures screenshotted at 1440 px in
      `playground/2026-11-round-5/shots-inference-images/`.

## 🏁 Milestone M96: Multilingual SEO: html lang, absolute hreflang and canonical, sitemap, robots — DONE, PR #105

The author asked whether menus that stay English hurt search ranking (D113 says they stay), and then:
*"Open SEO PR"*. Five gaps were measured on the built `out/` of `main` before any change: no absolute
`hreflang` (module pages and the home page had relative ones, no module page had `x-default`);
`<html lang="en">` on every Turkish and Persian page; no `sitemap.xml` and no `robots.txt`; relative
`canonical` links; and the English title on `/tr/` and `/fa/`. D113 stays; no interface string changed.
Reasoning and rejected options: D119 and D120.

**Built, measured and reverted in this PR.** The first version gave each language its own root layout
(`src/app/(en)`, `tr`, `fa`) to set `<html lang>` in the static HTML. Review measured that 49 of the 80
internal links on a Turkish module page and 29 of 30 on `/tr/` and `/fa/` leave the tree, each a full
document load, and that it needed `experimental.globalNotFound` and left `/tr/` and `/fa/` without a
`not-found`. All of it was removed (the routes are back under `src/app/`, one root layout, no
`global-not-found`, no `RootShell`, `prose.css` untouched); D119 has the numbers.

- [x] **`<html lang>` per page, on one root layout.** `scripts/lib/html-lang.mjs`, run by the finaliser,
      rewrites it in the 43 `tr` and 43 `fa` exported pages; the boot script sets it before first paint
      and `RecordStateSync` after a client navigation, all by `languageOfPath`. Never a `dir`. The bar,
      the skip link, `<main>` and the footer say `lang="en"`. Measured in the browser suite
      (`tests/e2e/html-lang.spec.ts`): a load says the page's language; a client navigation (document
      not reloaded) from `/tr/…` and from `/fa/…` to `/` says `en`, and one through the language picker
      into Turkish says `tr`; the console has no error and no request fails, so there is no hydration
      mismatch.
- [x] **hreflang and `x-default`, absolute, derived.** `src/lib/content/seo.ts` asks `loadModuleIn` which
      languages a page exists in, in both tracks. In the built sitemap, **129 of 143 pages carry the full
      alternate set** (43 per language: the home page, 21 For Engineers modules, 21 For Everyone
      modules); the other 14 are English-only (`/about/`, `/legend/`, the two catalogs and their ten level
      pages) and declare none. Every alternate resolves to an indexable file in `out/` and names the page
      back.
- [x] **Absolute canonical.** `SITE_ORIGIN` in `src/lib/site.ts` is the one place the address is written;
      the root layout's `metadataBase` is set from it. Every one of the 143 sitemap pages has one
      `canonical`, equal to its own address; a forward names its destination.
- [x] **`sitemap.xml` and `robots.txt`**, static in `out/`: 143 URLs with `xhtml:link` alternates where
      there are any. `robots.txt` is `User-Agent: *`, `Allow: /` and the sitemap's address.
- [x] **Translated home titles**: `/tr/` is `AI Mühendisliği, onu inşa edenlerin kaleminden · AI Engineering
      Bazaar`, `/fa/` likewise, both from `HOME_COPY[lang].hero`. `/` is unchanged.
- [x] **Kept out of search (D120).** 64 of the 207 exported pages say `noindex` and none is in the
      sitemap or an `hreflang` list: the 23 planned modules, 36 unwritten For Everyone pages, forwards
      and stubs together, `/profile/`, `/caravan/` (it draws its sample; `showsSample` is the page's own
      test), and the 404's three files. The sitemap had 168 URLs before this and 143 now.
- [x] **Small.** `MovedTo` forwards emit a canonical to their destination; the stale-test-name and the
      "Thirty-two modules" count in the site description are fixed (the description no longer states a
      number); no escaped backticks were left in comments I wrote; `ARCHITECTURE.md`'s search path is
      correct again after the revert.
- [x] **Tests.** `tests/unit/seo.test.ts` (21), `tests/unit/html-lang.test.ts` (5), `tests/e2e/seo.spec.ts`
      (11, reads `out/` and measures the page set itself) and `tests/e2e/html-lang.spec.ts` (4).
      Four older browser assertions that pinned `html lang` `en` on `/tr/`, `/fa/` and a Persian module
      page, the English home title and relative hreflang were changed to the new rule. Proofs that each
      check fails: 13 single-fault copies of `out/` (`SEO_OUT`: html lang wrong, `dir` added, the bar's
      `lang` dropped, a body `lang` added, a draft module, the profile or a `noindex` page in the sitemap,
      a sitemap alternate and an `hreflang` pointing at a `noindex` page, a draft page losing `noindex`,
      relative canonical, `x-default` removed, `hreflang` to a missing page, no `Sitemap:` line) each
      failed the check written for it; and five source faults, each restored from a copy: the finaliser
      not rewriting failed the lang check on the rebuilt export; removing the client-navigation write
      failed the three navigation tests in the browser; the boot script ignoring the language list failed
      the unit comparison; `isIndexableModule` ignoring `draft` failed the draft rule; the caravan always
      listed failed the caravan rule.
- [x] **Gate**: typecheck, `npm test` (98 files, 1,556 tests), build, `check-links-out.mjs` and
      `check-bundle-out.mjs` pass; `out/api/` equals the build of `main` (same commit as `origin/main`,
      built earlier in this session) in every file except `index.json`'s `publishedAt`, which is the
      commit's time and is left out of `contentVersion`, itself unchanged. The full browser suite:
      662 passed, 10 skipped.

## 🏁 Milestone M97: The site owner, a contact row, a privacy note and a note on third-party marks (D122) — DONE

The author, 2026-11-10: "İŞ ZEKASI YAZILIM DANIŞMANLIK HİZMETLERİ TİCARET ... you can find its info on
the web. add privacy note and contact section (in footer). add site owner details and short privacy
note. also third-party marks and images if possible."

- [x] The owner's facts, found and sourced: trade name, MERSİS number, address, email and phone, each
  read from a page fetched on 2026-11-10. The tax office, the tax number and the KEP address were not
  published anywhere reachable, so they are not written (D122 has the sources and the gaps).
- [x] `SITE_OWNER` in `src/lib/site.ts`, the one place the facts are written, with every source URL
  and the date in its comment; an absent fact has no row anywhere.
- [x] The footer's third row (`SiteFooter.tsx`): an `<address>` with the registered name and the
  address on the left, the email, Privacy and Legal on the right.
- [x] `/legend/` gains `Privacy` (`#privacy`) and `Legal` (`#legal`): the owner's identity, and the
  note on third-party marks and images. No new route (D122).
- [x] `tests/e2e/legal.spec.ts`, 26 cases at 1440: the owner named and the two links on 11 routes; both
  anchors land on a heading below the bar; the Legal section prints every field `SITE_OWNER` holds; the
  Privacy section cites GitHub; and on the same 11 routes no cookie, no `<form>` and no request to
  another origin, after a theme toggle.

What was measured:
- Every claim in the privacy note was checked against the code: no `document.cookie`, no analytics, no
  `<form>`; the only `fetch` is the search index, same origin; storage is `hl-*` keys for the record, the
  theme, the track and the reading options; fonts (`next/font/google`) and the star count are fetched at
  build, and the built HTML has no `src=` that is not the site's own.
- The note on images says what is true. The author's words said images from articles are credited in
  their captions; the corpus does not do that (no caption names a source), so the page says that some
  images come from public sources, belong to their owners, and will be credited or removed on request.
  The author approved it on 2026-11-10 and asked for warmer, safer words: *"we took images and we forgot
  to credit ... heartfully we thank authors and we are more than happy to add their credit by email
  request or remove it"*. The note now thanks the authors, says the images stay their owners' and that
  the site claims no rights in them, and offers to add a credit or remove the image, as the owner prefers.
- The mobile bundle did not change: `out/api/` is byte-identical to a build of `origin/main`
  (contentVersion `d01d5a62…`), and `check-bundle-out` passes.
- Gate: typecheck clean; 1,530 unit tests; the build with its link gate; browser: `legal`, `navigation`,
  `layout`, `responsive`, `accessibility`, `site-footer`, `fidelity`, `colour-not-alone`, `health`,
  `not-found`, `containment`, `about`, `features` and `caravan`, 319 passed and 8 skipped, on port 3111.
- A screenshot found two defects no test could: the first footer row ended a line on a separator dot
  and wrapped its links apart (now two groups, so a narrow width wraps between them), and the note's
  paragraphs ran together (now spaced).

**Mutations, each seen failing:**
- the owner's name removed from one footer (`/about/`);
- the Privacy link pointed at `/legend/` (`/tr/`);
- `id="legal"` renamed in the source;
- the scroll margin under the sticky bar set to 0 (the Privacy landing);
- the MERSİS number changed in the Legal section;
- the GitHub links removed from the Privacy section;
- a `document.cookie` write (`/profile/`);
- an image from `example.com` (`/caravan/`);
- a `<form>` (`/fa/`).

One of these first passed and was a weak mutation, not a weak test: editing `id="legal"` in the built
HTML was undone when the page hydrated, so the same mutation was made in the source and rebuilt.

## 🏁 Milestone M98: Translated objectives on Turkish and Persian pages (D123) — DONE

A manager, on the Turkish site: *"Sağ üstten dili değiştiriyoruz, Türkçe seçiyoruz ama eğitim içeriğinde
İngilizce yerler var"*; the "what you will learn" card was English on every translated module. The
author: *"Ok translate the objectives also to each language. And merge in the end as always"*.

- [x] **Support** (one Sonnet agent): a translation file may open with an `objectives`-only
      frontmatter block, same count and order as the English; any other key, or a different count,
      fails the build naming the file; a file without one falls back to the English list marked
      `lang="en"`. The card carries the page's `lang`, and the list alone `dir="rtl"` in Persian.
- [x] **Content** (seven Haiku xhigh agents, three modules each): 84 lists, the 21 written modules in
      both tracks, Turkish and Persian. Measured: all 84 parse with the one key, match the English
      count, and leave the title and body byte-identical.
- [x] **The mobile bundle keeps its contract**: v1 pins `objectives.lang` to `en`, so every document
      still carries the English list (`englishObjectives` in `src/lib/bundle/build.ts`); all 149 module
      documents say `en`. A translated list for the app waits on an additive field agreed with its
      developer (D123).
- [x] **Gate:** typecheck, 1,577 unit tests, build, link check, bundle check; the full browser suite in CI.

## 🏁 Milestone M99: Translated objectives in the content bundle (D124) — DONE

The author, to the mobile reader's developer, after M98: the frontmatter is multilingual now and the
bundle still English, *"onu da çevirmek istersen bir PR açabilirsin"*. The app agreed the additive field
D123 left open.

- [x] **The field**: every module document carries `translatedObjectives`, the document's own list as
      `{ lang, items }`, or `null` in English and where the translation file declares none
      (`src/lib/bundle/build.ts`, `src/lib/bundle/schema.ts`). `objectives` is unchanged.
      Report: on the built bundle, 42 Turkish and 42 Persian documents carry a list and 65 English
      documents carry `null`.
- [x] **The contract**: ARCHITECTURE §13 names the field; `bundle-schema.json` shows it as an addition
      and nothing else; the schema refuses `en`, an empty list, and a document without the key.
- [x] **The guard**: the corpus test checks every built document against its own translation file and
      the English count, and fails if none carries a list. Mutation-tested: with the field always
      `null` the test fails.
- [x] **Gate:** typecheck, 1,591 unit tests, build, link check, bundle check; the full browser suite in CI.

## 🏁 Milestone M100: The About page's story in the content bundle (D125) — DONE

The mobile reader's developer, in the pull request of M99: the app shows the story of the Bazaar on the
first launch and in its Settings, from the bundle rather than from a copy in its code.

- [x] **The document**: `api/v1/story/en.json`, STORY.md as `loadStory` reads it for the About page
      (`buildStoryDoc` in `src/lib/bundle/build.ts`, the route `src/app/api/v1/story/en.json/route.ts`,
      `StoryDoc` in `src/lib/bundle/schema.ts`). Report: on the built bundle, the title, 5 stalls and
      the motto in two lines; `files` lists it with its hash.
- [x] **The index**: `story` names the document per language, `{ en: "api/v1/story/en.json" }`.
- [x] **The contract**: ARCHITECTURE §13 names both; `bundle-schema.json` shows them as additions and
      nothing else; the schema refuses a story with no stall, an empty heading or a key it does not name.
- [x] **The guard**: the corpus test holds the document equal to what the About page reads and the index
      to its path; the route test holds it static; the browser suite parses it with `StoryDoc`.
- [x] **Gate:** typecheck, 1,594 unit tests, build, link check, bundle check; the full browser suite in CI.

## 🏁 Milestone M101: Three screen recordings, and Human in the Loop in Agentic UI (D126) — DONE

The author, verbatim: *"lets add these 3 videos in the proper place of module. also add HITL or human
in the loop to the agent ui section and no need to wait for advance since it is a basic topic. one
video in tool calling module, one in the new hitl, and one in where we have chain of thought. do them
in the proper format and again, update kia-context and review and merge"*

- [x] **The recordings as animated WebP** (D87, D112), cropped to the chat, encoded from the GIF at
      10 frames a second with identical neighbouring frames merged, so the files store about 8.4 to
      9.5 frames a second. Report, measured on the files: `tool-call-cards.webp` in Tool Calling,
      1020 x 808, 104 frames, 11.0 s, 820,756 bytes, lossless (from a 10,550,171-byte GIF of 28.7 s,
      cut where the run ends); `human-in-the-loop.webp` in Agentic UI, 1200 x 926, 185 frames, 22.1 s,
      847,524 bytes, quality 82 (from 6,928,436 bytes, the whole recording);
      `reasoning-stream.webp` in Prompt Engineering's Chain of Thought, 1200 x 900, 75 frames, 8.0 s,
      713,512 bytes, quality 82 (from a 69,511,921-byte GIF of 35.7 s, cut a few answer lines in).
      Every WebP is smaller than its GIF, so no GIF is kept. SSIM against the GIF's own frame (same
      crop and scale), five frames of each file decoded in Chrome: 0.992 to 0.995 and 0.9936 to 0.9948
      at quality 82 for the second and third; the Tool Calling recording has 15 px text, and at
      quality 82 and 90 its SSIM was 0.947 to 0.961 and 0.96 to 0.97, below the 0.985 floor, so it is
      lossless, which measured 1.0 and is the smaller file of the two options that pass.
- [x] **Placed with a caption**, in the technical module and its For Everyone twin, in all three
      languages: Tool Calling after the four-part summary of the loop, Agentic UI inside the new section,
      Prompt Engineering in "Chain of Thought is Also Why the Job Title Disappeared". The Tool Calling
      caption credits CopilotKit's AG-UI Dojo, the demo title being listed on dojo.ag-ui.com; the other
      two captions credit nothing, because their frames show no address bar or demo name. The Tool
      Calling recording is cut where the run ends: after it, the cards move below the answer text,
      and whether that is the Dojo's own reordering or a splice in the recording is for the author.
- [x] **`## Human in the Loop` in Agentic UI**, after the protocol stack and before "Beyond Streaming",
      sourced from AG-UI's Interrupts and Tools pages and LangGraph's Interrupts page (all three added
      to References); a short plain-words version in the For Everyone module; the section in
      Turkish and Persian under the same heading word for word (D109).
- [x] **Removed from "later"**: Agentic UI's opening, "Beyond Streaming" and summary (all languages,
      both tracks), and the Advanced Agentic UI placeholder and its `curriculum.yaml` note, which keep
      steering a run mid-way as their own item. Key Terms (Human in the loop, and Interrupt) and the
      objectives (a sixth technical objective and a fourth For Everyone one, in every language, same count and order) updated; one quiz question
      added in English, Turkish and Persian.
- [x] **Gate:** 1,594 unit tests, typecheck, build, link check, bundle check (the bundle's content
      changes, its shape does not); each image name found in the built pages of every language and
      track; each new figure and the new section screenshotted at 1440 and read.

## 🏁 Milestone M103: Run a model on your laptop, in Inference Engines — DONE

M101 is the videos and Human in the Loop pull request (#109). No open pull request reserves M102 (the
search Apply work had not opened one), so it is left free and this takes M103; INDEX's `M1…M103` assumes
#109 lands first, and the numbers are left for the merge order. The author, asking for it: *"also I remember previously one
student said if we could also explain how to run ollama in our machine. in the inference engine module, we
can add a very short section saying running models on ollama in your laptop is very easy. open terminal,
install, and run these commands (basic ollama commands like): ollama pull, ollama list, ollama run, ollama
stop. and then say there is also lm studio which has desktop app: https://lmstudio.ai/ ... and do not forget
to include these two images in the proper format and convention"*. Then two additions: *"also mention people
not confuse OpenWebUI with other things. Openwebui is just the interface that works with ollama, or any other
inference engine that it supports. but LM Studio is an app that has both inference engine within as well as
UI"*, and, when the second image turned out to show "Bionic": *"use it. bionic is the new branding. use the
image"*. lmstudio.ai now leads with "LM Studio Bionic", and its docs page (lmstudio.ai/docs/bionic, "Welcome to LM
Studio Bionic") says "Bionic is a new, separate app from LM Studio", so the text names LM Studio as the app
that downloads models and chats, and Bionic as its newer, separate app, shown in the screenshot.

- [x] **The section**: `## Run a Model on Your Laptop` in Inference Engines, after the engines by size of
      problem and before batching, in English, Turkish and Persian, and in the three For Everyone versions
      under the same heading. Install lines and the commands were checked against Ollama's download page,
      its CLI Reference, its Quickstart and its FAQ (`ollama list` is the command and `ls` its alias,
      `cmd/cmd.go`). The install lines sit in their own `bash` block, because inline commands broke the
      line in right-to-left Persian, and both blocks are byte-identical in the three technical files.
      Ollama is called a wrapper, never an engine, and the `:ollama` image is described as the README does
      ("Open WebUI bundled with Ollama"). Ollama and LM Studio carry their marks once, where the module
      first introduces them (D105), not again in the new section.
- [x] **The two images**: `ollama-list.webp` copied as it came (892 px, lossless WebP, 20,374 bytes) and
      `lm-studio.webp` from the author's PNG (1,104 px, 356,844 bytes): q82 gave SSIM 0.9834, below the
      floor, so q90, 61,296 bytes at SSIM 0.9882 on a dwebp decode (D112). The originals on the Desktop are
      untouched. Both carry captions that say what to notice, translated, and a translated alt text.
- [x] **The note on names**: Ollama is a wrapper used from a terminal, LM Studio one app with an engine and
      a chat window, and Open WebUI a web interface that connects to Ollama or another OpenAI-compatible
      server; one paragraph in each
      language, and in plain words in each For Everyone version. Open WebUI's own section is not repeated.
- [x] **The record of the lesson**: objectives (one added in each of the six files, counts equal), Key
      Terms (Ollama, LM Studio), Words You Now Know, Summary, and References (`### Articles`: CLI Reference,
      FAQ, and the Bionic docs page). The quiz was re-read and no question contradicts the text.
- [x] **Gate:** typecheck, 1,594 unit tests, build, link check and bundle check pass; both images are in the
      export of all six pages and load at their natural width; after the review fixes the English and Persian
      sections were read again as screenshots at 1440 px, and in Persian the install and command blocks
      render cleanly (the inline commands that broke the line are gone).

---

> **← Part 2: [`PROGRESS_2.md`](PROGRESS_2.md)** — M16 to M49. **← Part 1: [`PROGRESS_1.md`](PROGRESS_1.md)**
> — M1 to M15. The loop is at the top of this file.
