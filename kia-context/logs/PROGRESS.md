---
description: >
  Part 3 of the execution log, and the ACTIVE part: a new milestone is appended here. It opens with
  the plan of what was left after the round-3 playground (the order table and the gate every build
  ends on), then M50 to M62: the round-3 art finished, the catalog without its Sources count, round 3
  built on the home page, search, the content phase, a certificate still to decide, download
  cancelled, Emerging Trends, Caravan, the gate revised (M63), and content revision 4
  (M64 to M69), and the search filters (M70). Each milestone carries its deliverables and acceptance
  criteria as `- [ ]` checkboxes, ticked as the work lands, and closes with a dated report; the loop
  that governs that is in part 1.
  NOT here: why a choice was made (BRAINSTORM.md), or any rule that outlives the milestone
  (MANIFESTO.md / ARCHITECTURE.md).
authority: state
writes: agent, every session
status: active
covers: "M50 to M70, 2026-11-06 onward"
last_updated: 2026-11-07
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
| **Design and site, now** | M61 (Emerging Trends, done) · M50 (round-3 art, approved) → M55 (no Sources count) → M58 (round 3 built) → M51 (ship) |
| **Playground round 4** | M56 search, **picked (D95, D97)**; M57 download, **cancelled (D96)**; M54 certificate (should it exist at all) still open |
| **Site, after M51 merges** | M59 (search built) |
| **Content, last** | M52 (For Everyone modules), M53 (readers' feedback and issues) |
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

## 🏁 Milestone M52: The For Everyone modules — WAITING FOR THE AUTHOR, CONTENT PHASE

D86: every module gets a For Everyone version, written from scratch for readers with no technical
background (not a simplified copy), English first, then Turkish, then Persian, each language
rewritten for its readers. The site already serves an unwritten page for each (D91); a module goes
live For Everyone the day its file lands in `mini-courses/<level>/everyone/<name>.md`. Search and
download, built before this, must already treat unwritten modules as absent.

- [ ] The author sets the order and the first module; then one module at a time, each reviewed
      for meaning before the next. **Not started on 2026-11-06**, when the author asked for every
      milestone to be completed: this one's first step is the author's, and a For Everyone module
      written from scratch in three languages is the author's content, not a build. Search
      (M59) already leaves unwritten modules out, as asked.

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


## 🏁 Milestone M54: A certificate and an exam per track — WAITING FOR THE AUTHOR'S YES OR NO

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

## 🏁 Milestone M62: Caravan, the trends timeline — PLACEHOLDER, LATER

Issue #40's comment: a timeline of what was trending each month or season since ChatGPT (late
2022), with expandable nodes, high-level only, on a page of its own and not in the modules'
markdown, kept up over time. Named **Caravan** by the author (2026-11-06); the decision is posted
on issue #40 so it is not lost. Nothing is built until the author takes it up.

- [ ] A playground round when the author wants it: the timeline's design at desktop and phone
      width; the pipeline that collects each trend's seed (which paper, article, feature or news,
      from sources such as Google, YouTube, Medium and LinkedIn, and existing trackers on GitHub);
      what one node holds (a word limit and a source link); and how often it is updated.

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

> **← Part 2: [`PROGRESS_2.md`](PROGRESS_2.md)** — M16 to M49. **← Part 1: [`PROGRESS_1.md`](PROGRESS_1.md)**
> — M1 to M15, and the loop.
