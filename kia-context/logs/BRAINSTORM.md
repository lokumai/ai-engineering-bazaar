---
description: >
  Part 3 of the decision log, and the ACTIVE part: a new decision is appended here. D97 onward, from
  the build of the round-3 and round-4 picks (the cast at the gate, search) onward, plus any new open
  question. The entry test and the house style for writing one of these are in part 1 and are not
  repeated.
  NOT here: what was built (the PROGRESS parts), or a rule that outlives the decision (MANIFESTO.md /
  ARCHITECTURE.md).
authority: reasoning
writes: agent, when a decision is taken
status: active
covers: "D97 to D105 so far — 2026-11-06 onward"
last_updated: 2026-11-07
---

# 🧠 BRAINSTORM, part 3 — D97 onward

> **← Part 2: [`BRAINSTORM_2.md`](BRAINSTORM_2.md)** — **D26 to D96**: the rebuild on the design
> language, the two tracks, the domain, the cast and the round-4 picks, and the closed open questions
> O1 to O5. **← Part 1: [`BRAINSTORM_1.md`](BRAINSTORM_1.md)** carries the entry test and the house style.

Split from part 2 on 2026-11-06 at the author's request, at a phase boundary: part 2 ends with the
last playground decisions (D95 search, D96 no download), and this part starts with building them.

## Decision log, continued

### D97 · Search looks first in the reader's own track and language; one switch widens it — 2026-11-06

**Considered:** (a) every track and language at once / (b) the reader's own track and language, with
a switch to everything / (c) the reader's own language only, both tracks. D95 left the default scope
to the author; the author's instruction of 2026-11-06 was to complete every milestone without
waiting, so this was chosen in the build (M59) and stands until the author says otherwise.

**Chose (b).** A reader on a Persian For Engineers page who searches "مدل" wants that page's
siblings, not the same word in two other languages and a track they did not choose. (a) shows three
copies of most results, one per language; (c) mixes a beginner's and an engineer's version of one
module. The switch, "All tracks and languages", loads the other two indexes only when it is ticked.

**Also chosen, as D95 recommended:** an unwritten For Everyone module and a module with no
translation are absent from the index, not found and then sent to a "not written" page. Both follow
from building the documents through `loadModuleIn`, which already returns nothing for them.

**Update, 2026-11-07 (D103):** the one switch is replaced by filter chips; the default scope above is
unchanged.

### D98 · The escape at the gate is drawn from the scroll's own clock, not tweened — 2026-11-06

**Considered:** (a) the playground's way (L3a): GSAP tweens on the figures with `svgOrigin`, driven by
the walk's timeline / (b) one pure function of the chase's time T that writes every pose as a
`transform` attribute, called from the timeline's `onUpdate`.

**Chose (b).** The figures breathe, blink and hold their goods in CSS animations on inner groups;
GSAP writing CSS transforms on the same elements fights them, and the playground's head turn was
invisible for that reason. A function of T also scrubs both ways by construction: a scroll position
always draws one frame, and nothing is left half-tweened by a fast scroll. **MEASURED** on the built
page, a scripted scroll through the chase: median frame 16.7 ms and 95th percentile 33.4 ms on both
this build and the live site, no long tasks, 7 to 11 frames over 33 ms of about 110 against 2 to 5
on the live page; writes that change nothing are skipped.

**Also decided in the build:** the people stand in the gate art's own units, so they scale with the
gate in every mode; on the walk they spread across the facade by the window-to-art ratio (at most
2.3, MEASURED as what 900x560 needs for no two captions to touch); below 900px a row of tiles under
the gate replaces them (P1), rendered separately and hidden by CSS, which costs one more copy of the
figures in the HTML (about 37 KB raw).

### D99 · Three indexing rules the corpus forced — 2026-11-06

**A measurement changed our minds three times; the first two were found by the index's own unit test** (a word taken
from each section's prose must find that section):

1. **A section is not searched by its module's title.** First built with the title on every section,
   a search for a module's name ranked its first section above the module itself (the e2e test
   caught it: `/courses/fundamentals/llms/#what-is-an-llm` before `/courses/fundamentals/llms/`).
   A section now carries the module's name only to display it.
2. **Persian words are split where the text joins them.** The Persian modules write an English
   term with a Persian suffix (`hyperparameter‌های`) and a plural with a non-joiner
   (`محدودیت‌ها`). Removing the non-joiner, as O1's normaliser did, fused the word and its suffix
   into a token nobody types. The tokenizer now splits Latin from Persian and keeps a non-joined
   word three ways (each part and the whole), because readers type it with the non-joiner,
   without it, or with a space. Rejected: dropping exact matching for prefix-only search, which
   hid the defect rather than fixing it. The review then found the other half: a QUERY typed with
   the non-joiner was split into parts no joined text holds, so a query keeps such a word whole, and
   a spaced prefix or suffix (`می خواهم`) is searched joined as well.
3. **What a match is worth beyond its words** (the browser review, on the built index): a planned
   module holds only a title and a promise, so the title boost put "Advanced LLM Evaluation" above
   every written page; References and Summary sections repeat a module's terms without explaining
   them. Both rank lower (0.7 and 0.4), and a heading weighs more than prose. 0.5 for a planned module
   was tried first and let "UI Design" beat "Generative UI" on its own exact title.

### D100 · The round-3 art went ahead without a second look from the author — 2026-11-06

M50's acceptance criterion was the author's approval of the Janissary, the props, the running poses
and the stories before M58 built them. On 2026-11-06 the author asked for every milestone to be
completed, reviewed by subagents, and shipped in one pull request. **Taken as the approval**, with
two reviews at each step standing in for the look the author would have given. What the reviews
raised and was deliberately left for the author, not changed: one reviewer read Leyla's face (the
only dark-skinned figure: broad nose, wide eyes, full lips, a puff of hair) as at risk of
caricature, and Mei's upturned almond eyes as the one feature that marks ethnicity. Both are as the
author kept them in M49 (D93), so they were not redrawn; they are listed for the author in M50's
report.

### D101 · Advanced Training is split into Advanced Fine-tuning and Advanced Post-training, and retired — 2026-11-06

The author asked for two new planned modules, Advanced Fine-tuning (full fine-tuning, PEFT, LoRA,
swapping adapters) and Advanced Post-training (alignment, preference data, RLHF, reward and policy
models, PPO, DPO, GRPO, RLAIF). The planned Advanced Training already listed post-training, RLHF,
DPO, PPO and GRPO, so keeping it would teach those topics twice. **Rejected: keeping all three**,
which the author was offered and declined. Advanced Training's topics were redistributed rather than
dropped: post-training and the RL methods to Advanced Post-training; knowledge distillation there
too, since it is something done to a model after pre-training; and self-supervised learning to the
new Advanced LLM, because it explains how pre-training gets its signal, which is about how the
model works and not about tuning it. The old address forwards to Advanced Post-training
(`src/lib/content/moved.ts`), which kept most of the topics. The Expert placeholders' hand-drawn
"Tutorial Progress" maps, which the site strips and which already omitted Advanced LLM Evaluation,
were removed rather than redrawn, so no page a reader sees names the retired title (the author's
planning notes in `curriculum.yaml` and `topics.txt` still say where its topics went).

The same message settled the first For Everyone module (M52's open question): Agents in Practice,
written twice, the engineer page and `everyone/agents_in_practice.md`, each with its own list of
courses.

### D102 · A planned module renders the sections it already has — 2026-11-06

Loop Engineering gave three finished sections (agent teams, dynamic workflows, recursive language
models) to the planned Advanced Loop Engineering (#48), and the author chose to keep them readable
on the site now rather than parked off-site. A planned sheet drew only its lead sentence and its
schedule of parts, so the sections would have reached GitHub and not the site. **Taken:** the sheet
renders everything from a planned module's first `##` as prose under the schedule
(`writtenSections`, `src/lib/content/schedule.ts`); a stub with no `##` draws exactly as before.
**Rejected:** marking the module `ready`, which would give a mostly unwritten module a completion
mark, a quiz slot and a place in the reader's progress. The same review found that the lead
sentence and schedule are printed as plain text, so a markdown link there showed as literal
brackets; a test now holds every planned module's lead and schedule free of markdown.

Two limits, found in the PR #74 review. A planned module whose only `##` is its references list
counts as not written, so it keeps the old sheet and band. And **the Persian text of the moved
sections is no longer on the site**: a planned module has no `_fa.md`, so Persian readers lost
Agent Teams, Dynamic Workflows and RLMs, which they could read in Loop Engineering before; the
text is kept in `mini-courses/scratchpad/drafts/advanced_loop_engineering_fa.md`. Allowing a
`_fa.md` for a planned module with written sections would bring it back; that is the author's call.

### D103 · The search window filters by track, level and language with chips, and each result carries its level's bar — 2026-11-07

**Asked by the author:** "it does not search or show filter for searching on level, module or
etc; it is basic search only", with the filters of the round-4 playground (N2) but "no need to search
in prose or code or titles", and the coloured bar on the left of each result as in the playground.

**Considered:** (a) keep the "All tracks and languages" switch and add a Level row / (b) chips for
all three, a pressed chip narrowing and a group with nothing pressed not, the switch removed / (c) as
the playground has it, a group that can never be emptied, with a Reset link.

**Chose (b), with the playground's Reset link.** The track and language chips start on the page's own,
so a reader who touches none gets exactly D97's default, and the switch is two clicks (the other track,
the other languages). (c)'s rule that the last pressed chip cannot be unpressed does nothing when
clicked, which reads as a broken button; with (b) every chip always responds. **Rejected:** the
playground's "Search in" row (titles, prose, code) at the author's word, and the chip counts, which
need a search per chip.

**Also chosen:** the chips are the catalog's `.bz-chip`, not a second kind, so the two filters on the
site look and behave alike; the index is unchanged, because every index already holds both tracks and
all five levels, so the filter runs on stored fields. The level bar follows the row's own direction,
so a Persian row has it on the right. At 390px the chips keep the catalog's touch size, with the labels
above them, so the filters take a large share of a phone's window and the results scroll under them;
a smaller chip was not drawn so as not to deviate from §10.4 inside one dialog. **The defaults
above are superseded by D104** (the filters behind a closed disclosure; shut, everything is searched).

### D104 · The search filters sit behind a closed Filters disclosure, and a shut panel searches everything — 2026-11-07

**Asked by the author:** "make the filter an accordion-like dropdown, meaning that when we search
normally it searches all, but if I click on the accordion, I can open filters and use them."

**Chose:** a "Filters" `<button aria-expanded aria-controls>` with a chevron between the field and
the results, the panel hidden by default. **Closed, the search covers every track, level and
language**, and the chips are ignored; the other languages' indexes load on the first search of two
or more characters, the page's own on opening. **Opening presses nothing**, which means all, so
opening alone changes no result; the page's own track and language now only break ties in the
ranking, by a small boost. **Closing the panel stops the filtering**: the pressed chips are kept and
apply again when it reopens, so a reader can never be filtered by chips they cannot see, and the
closed toggle needs no count badge. A new page resets both. This supersedes D103's default (the
page's own track and language pressed) and answers M70's open question about the filters' share of
a phone's window: shut, the results have the room.

**Rejected:** `<details>`, because Chrome does not close one on Escape and Escape inside the dialog
must keep closing the dialog; keeping hidden filtering with a count on the closed toggle, which asks a
reader to notice a number to understand their results.

### D105 · Every company a module introduces carries its logo, which reverses M69's rule on uneven lists — 2026-11-07

**Asked by the author:** "do the same for all the vendors or companies, not necessarily LLMs but
every company, such as LangChain or inference servers or agent frameworks or smolagents or crewAI or
everything in UI design". M69 had removed four marks (Replit, vLLM, NVIDIA, LangSmith) because their
lists had others without one; that rule is **superseded**: a company, framework, library or tool gets
its mark where a module introduces it, and an item with no real mark simply has none.

**Kept from M69:** a real mark only (Simple Icons 16.36.0, the vendor's own SVG, or Wikimedia's copy
of the official one), never drawn; beside its name, never alone, never in a heading, table or
references list; one-colour marks ship black as `*-mono.svg` for the theme to invert. **Added after
the review:** no mark that carries a raster image or depends on the reader's operating-system colour
scheme, and none unreadable at text height (a wide wordmark, a pale yellow); a mark and its name never
part at a line break (`.bz-logo-pair`, `src/lib/content/render.ts`).

## Open questions

None open in this part yet. New ones go here, numbered after O5.

---

> **← Part 2: [`BRAINSTORM_2.md`](BRAINSTORM_2.md)** — D26 to D96. **← Part 1:
> [`BRAINSTORM_1.md`](BRAINSTORM_1.md)** — D1 to D25, the entry test, and the house style.
