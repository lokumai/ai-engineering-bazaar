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
covers: "D97 to D117 so far, and D89, which part 2 held for PR #57 — 2026-11-06 onward"
last_updated: 2026-11-10
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

**Revised 2026-11-08 (M80):** the author asked for marks wherever one exists online, and allowed a faithful
drawing only when none can be found. LangChain's mark is its parrot-and-chain logo; fourteen marks were
added from vendor repositories, sites and icon sets. Still without one, for want of anything but a wordmark
or a raster: MLX, IBM/Granite, DeepWiki, Moltbook.

### D106 · A course to take is a GitHub alert call-out, not raw HTML or a custom fence — 2026-11-08

**Asked by the author:** the courses in Agents in Practice "should force people and warn them to STOP
there, go over the courses ... and then come back", with a centred card and emoji to catch the eye,
because as plain sections readers skip them. **Chosen:** GitHub's alert syntax (`> [!WARNING]` for the
stop banner, `> [!IMPORTANT]` for a course card). The renderer turns a known kind into a centred
`bz-callout` card in the design tokens: the first paragraph is the title, and a last paragraph holding only
a link becomes a `bz-btn` button (`src/lib/content/callout.ts`, `rehypeBlockquotes` in `render.ts`).
**Rejected:** raw HTML, which the renderer strips and which would bypass the design tokens; a custom
fenced block, which GitHub shows as a code block. Only the alert renders as a card on the site and
still reads as a tinted box on GitHub. A corpus test fails any page where an `[!X]` marker survives.

### D107 · Diagrams use Mermaid's own themes, chosen by the reader, `default` first — 2026-11-08

**Asked by the author:** the diagram fills and backgrounds "are not contrastive enough and look very
bland", so allow Mermaid's official themes, with Mermaid's `default` as the default everywhere.
**Before:** every diagram was Mermaid's `base` theme repainted from the site's tokens (the earlier "three
palettes" option), so a diagram could only look like the site. **Now:** the reader picks one of the ten themes
the installed Mermaid ships (`default`, `redux-color`, `redux-dark-color`, `redux`, `redux-dark`,
`neutral`, `dark`, `forest`, `neo`, `neo-dark`); Mermaid paints the diagram and the site adds only the
semantic edge colours and the frame's ground (`src/lib/reading/diagram-themes.ts`). The pick persists as
`prefs.diagramTheme`, is stamped as `data-hl-diagram` before first paint, and redraws every diagram live.
The old `figurePalette` is removed end to end, and a stored one falls back to `default`. **Rejected:**
silently swapping in a dark variant on the dark site, because a reader who chose `forest`, which has no
dark variant, would get something else; the frame instead takes a light or a dark ground to match the
chosen theme's tone. A first-time reader's frame is therefore light where the shell mockup draws it
dark, a deviation recorded in DESIGN.md. Code highlighting keeps its own three palettes, now decoupled.

**Revised 2026-11-08: each theme's own Mermaid background.** The author: the frame's ground should be
the one Mermaid itself shows for the theme, not the site's Paper or Night. Every one of the ten themes
defines a `background` theme variable (read off the installed Mermaid 11.17.2 with
`mermaidAPI.getConfig().themeVariables.background` after `initialize`): white for `default`,
`redux-color`, `redux`, `neutral`, `forest` and `neo`, and `#333` for `redux-dark-color`, `redux-dark`,
`dark` and `neo-dark`. They are the library's colours, so they sit in the theme table
(`diagram-themes.ts`) and reach CSS as `--bz-diagram-ground`, one rule per `data-hl-diagram` stamp, in a
`<style>` the layout emits; `bazaar.css` names no value, which `transcription.test.ts` would refuse. A
unit test compares the table to the installed library. **Measured against the existing gates, on the new
grounds:** `neo-dark`'s red gradient end fell to 2.77:1 on `#333` (now `gradientStop: #ff3366`, 3.56:1),
and the semantic fault edge to 2.63:1 (now lifted 25% towards the slab ink with `color-mix`, 3.78:1);
every other theme clears the floors as Mermaid draws it. **Added the same day:** a diagram carries the
code blocks' copy control beside EXPAND, copying the Mermaid source the island draws from. **Rejected:**
carrying the author's raw source, `fill:#…` lines included, in a second attribute so the copy matches the
markdown byte for byte, because §6.10 B3 forbids a colour literal anywhere in the emitted HTML and the
site does not draw those fills either; the one difference is that a diagram with a `style X fill:` line
copies it as the `classDef`/`class` pair the build turned it into.

**Same day, "redux dark and redux dark color are duplicate".** Investigated, not merged. The config passes
each name through (a mind map paints in more colours in `-color`, held by `mermaid.spec.ts`). Mermaid's
`-color` themes colour a *group*, and a flowchart of plain nodes has none, so Mermaid paints the twins the
same there. Measured by painted fill, stroke and ink over the 104 unique flowcharts and mind maps of
`mini-courses/` (Mermaid 11.17.2): 92 plain flowcharts identical in both pairs; 6 flowcharts with a
subgraph differ in the light pair only; 6 mind maps differ in both. Mermaid 12.2.0 (the first to colour
subgraphs in the dark pair too) changes nothing for the 92 and defaults every theme to `look: neo`, so
**rejected: the major upgrade, for six diagrams; rejected: colouring plain flowchart nodes from the
theme's palette ourselves, which Mermaid does not do; not taken: merging each pair into one entry**, since
the rule for merging was "identical for every type the course draws" and mind maps and subgraphs differ.
The four entries stay and the reasoning is in the `diagram-themes.ts` header. If the author wants the pairs
merged anyway, it is two entries fewer and loses colour on those twelve diagrams.

### D108 · What a For Everyone module is: the same engineering, as a story, and shorter — 2026-11-08

**Asked by the author**, before the non-technical versions were written: *"Someone would think that if
we just remove codes and technical words, it becomes suitable for non-tech people. WRONG! Someone may
think we can just summarize it. WRONG! Someone may say lets just change the tone. WRONG! What I want is
exactly none of them but all of them."* The reader is an HR specialist, a finance person or a manager
who does not know what RAM, a function or a terminal is. **Why engineering, for them:** the only
interface to today's AI is natural language, so anyone who can explain a problem can build with AI (a
website, a small tool), but using that language well needs the engineering concepts. The course does
not make anyone an engineer and does not teach "AI for your job"; it is a cheatsheet of AI engineering
concepts for everyone.

**Decided, module by module, in five blueprint batches** (Fundamentals ×2, Intermediate ×2, Ecosystem),
each a table of every section with keep / short / drop and how to explain it, approved before writing:
- A **"Why This Matters to You"** section after the opening; a **"Words You Now Know"** list before the
  Summary; the Summary and Quick check stay; **no series map** and **no quiz**.
- **Narrative and everyday examples**: the context is a WhatsApp chat read from the top every time;
  training is an empty brain going to school, fine-tuning is learning one job; a team of agents is a
  müdür, a hoca and öğrenciler; a hook is a locked door against a sign; a trace is a bank statement.
  Examples move to the reader's world (an HR team of agents in Prompt Engineering, a CV carrying hidden
  instructions in Security, flights and a calendar in AI Agents).
- **Almost every picture stays** (47 of 48 images; 14 of 23 diagrams, where a blueprint simplified the
  section), technical ones included ("these guys know mathematics and uni
  level"). **Code, formulas and commands may stay** where the technical module has them, with a line
  saying it is fine not to follow them; references may stay a little technical.
- **The core is explained in full**, not skimmed: context, prompt engineering, system prompt, tools,
  memory, agent against LLM. Measured on 2026-11-08 with `wc -w`, a module runs 41 to 84% of its
  technical original (median 59%), longer than the "30 to 50%" the author first expected, mostly in
  Fundamentals.
- **A draft or planned module gets none** (Generative UI, Choosing a Tech Stack, Protocols Reference),
  the same rule as Persian; Expert and Emerging are left for later.

**Rejected:** stripping the technical text (removes words, keeps the density); summarising (keeps the
jargon and drops the explanation); a tone change alone; and, from D86, a separate shorter module list.
**Language:** the author's standing rule, restated for both tracks: middle-school plain, "no room for
language play, vague or dense sentences"; his example of what not to write is a teaser such as "this
problem catches people at exactly the wrong moment".

### D109 · A section both tracks share has one heading, the technical one, in every language — 2026-11-08

**Asked by the author:** the For Everyone headings had been "simplified for everyone, which is wrong.
They should all share the same section headers in all languages and tracks (for those that are shared
among tracks)." So a For Everyone section that covers the same ground as a technical section uses that
section's heading word for word, and its Turkish and Persian files use the technical `_tr.md` and
`_fa.md` heading for it (158 headings aligned by position, M80). Only sections that exist in one track
keep their own heading ("Why This Matters to You", "Words You Now Know", and two For Everyone-only
sections). **Rejected:** friendlier headings for the non-technical reader, such as "AGENTS.md: the
Onboarding Note" or "Fingerprints of Meaning (Embeddings)"; the explanation belongs in the section, and
one heading lets a reader, a search result and the mobile reader name the same section in both tracks.
**With it, the same day:** technical concepts stay English in Turkish and Persian, as the translation
rules already said, and the headings that had translated them were corrected in the technical track too
(Parametric Memory, Vector Database'ler, Tool Schema, Context Isolation and others).

### D110 · "Generative UI" becomes Agentic UI; generative UI moves to Advanced Agentic UI — 2026-11-09

**Asked by the author:** the intermediate module is renamed **Agentic UI**, after CopilotKit's
definition: user interface built for humans and AI agents to work in the same application, streaming
agent work as it happens, accepting steering and approvals mid-run, rendering agent-generated interface
beside developer-built components, and keeping state synchronised. Its subject is the streaming base:
why a run is streamed as events, the event contract between backend and frontend, the coupling a
framework's own format creates, **AG-UI** as the shared contract (the same decoupling MCP gave tools), and
the protocol stack MCP / A2A / AG-UI. **Generative UI** (the agent producing the interface itself) is not
taught there; it moves to the Expert module, retitled **Advanced Agentic UI**, together with shared state,
human in the loop, agentic GenUI, A2UI, MCP Apps, OpenUI and json-render. **Kept:** the module names `ui` and
`advanced_ui` and their addresses, so only the titles change and nothing needs a `moved.ts` entry.
**Rejected:** keeping "Generative UI" as the intermediate title, which names the advanced idea and not the
streaming base the module teaches. AG-UI facts were read from sources, not from memory: event names and
fields from its docs' events page, the wire `type` values (`RUN_STARTED` and so on) from the 1.0 JSON
schema in `ag-ui-protocol/ag-ui` (`spec/1.0/schema.json`), integrations from its overview, and CopilotKit's
own page, which says the protocol is developed by the CopilotKit team "in collaboration with" partner
frameworks.

### D89 · The mobile reader reads a bundle the web build publishes — 2026-11-05, revised 2026-11-09

*Numbered D89, out of order, because part 2 held the number for PR #57 while it was open; it is written
here because part 2 closed before the PR merged.*

The owner decided on a native reader app for learners, Android and iOS, with progress on the device and
no account in its first version, and on content arriving as a JSON bundle the web build emits. What was
decided here is the shape of that bundle and of the record the app keeps. The contract itself is
ARCHITECTURE §13; what follows is why it looks that way.

**A block tree, not HTML and not markdown.** *Shipping the rendered HTML* was rejected: it carries
web-only structure, tool menus, `data-hl-*` attributes and `bz-` classes, which the app would have to
recognise and discard. *Shipping the markdown* was rejected harder: the app would have to redo slugging,
dropped rules, section marks, `FIG. n.m` numbering, row headers, link localisation and code tokens in
Dart, a second copy of every transformation `render.ts` exists for, and the derive-never-restate rule
would then hold on one side only. So every transformation runs in TypeScript, over the hast tree the web
already renders, and the app maps one node type to one widget. The module page and the bundle read one
render input (`module-render.ts`), so they cannot drift.

**Both tracks, every language, in one index.** The app's first version shows English only, and the
bundle still carries every language and both tracks (D91): emitting them costs one route each, keeps the
contract whole, and lets a later app add them without a new major. A module is listed once with an entry
per track, because the record keys a module the same way in both of its maps. A link's track and
language are read back off the address the page's one link map returned, rather than decided again in
the bundle.

**Two producer stages, one writer per file.** *One stage in the route handlers* was the first draft,
with the index route hashing every file. It cannot work: a diagram needs a browser to lay out its labels,
and the index needs the hash of every other file, which exists only once the export does. So the routes
write every document the pipeline can produce, plus a draft index that lists the diagrams by source, and
a `postbuild` finaliser draws the diagrams, hashes everything and writes the index. *A separate manifest
of diagram sources* beside the draft was rejected as a second file to keep in step with the first.

**Mermaid's `default` for light and `dark` for dark, each on its own ground.** First written as the
web's Paper and Night palettes; revised when D107 replaced those with Mermaid's own themes. The web lets
a reader choose among ten; the app follows the device's light or dark mode and has no menu, so it takes
the web's default for light and Mermaid's `dark` for dark, and the index names each variant's theme and
ground. *One variant recoloured in the app* was rejected because a recolour is a palette written in
Dart.

**Labels in Vazirmatn, in every language.** The finaliser measures every label in Chromium, and the app
draws it with `flutter_svg` at the positions Chromium measured. That only holds if both draw the same
face. *The platform font* was rejected because neither platform's face is the one the labels were
measured in, and a label set in a wider face overruns its box. *One face per script* was rejected
because a Persian diagram mixes Latin and Persian in one label. Vazirmatn covers both, is already the
site's Persian face, and is pinned as one TTF whose hash the index carries.

**Content hashes, not ETags and not build times.** *`If-None-Match` against the host's ETag* was rejected
because the ETag changes on every deploy even when nothing changed. *A build time or a commit hash in the
version* was rejected because two builds of the same content would then disagree. So `contentVersion` is
a hash of the index, which lists the hash of every file, and the app fetches each object by its own hash.
`publishedAt`, the commit date, orders versions and is left out of the hash on purpose: a commit that
changes only documentation keeps the version and moves the date.

**The record fixture carries no vocabulary.** The app reads and writes the same record the web does, so
the web's answers are pinned in a conformance snapshot the app's tests run against, for both tracks'
maps. *Copying the web's lists of allowed values into the fixture* (catalog views, diagram themes, code
palettes) was rejected: the app keeps the record as raw JSON and passes through every part it does not
write, so the web stays the only place that coerces those values.

**The record is included in device backup, and the erase screen says so.** *Excluding the record from
backup* would make an erase complete, and would also lose every reader's progress on a new phone, with no
account to bring it back. *Including it and saying nothing* would make the erase screen claim more than
it does. **Taken by the owner: included, with the honest statement**, and MANIFESTO rule 10 says it too.

### D111 · One course, two apps: the design may differ, the content and the logic may not — 2026-11-09

**Decided by the owner**, correcting how D90 and MANIFESTO §7 had been read. D90 was taken to mean that
the website and the mobile app are kept apart, each side building its own and the colleague's pull
request touching nothing the author built. The owner, 2026-11-09: there is no rule that each side keeps
to itself; a project has versions, and the point was about the mobile app. *"Mobile and web may behave
differently in design; logic, behaviour and content must be the same. Web and mobile should give a
similar user experience and the same content."*

So the rule is the other way round from how it was applied. Each app is developed in its own repository
and may look its own way; what a reader is taught, how far along they are and how the course behaves are
one thing, derived in one place, this repository, and published to the app as the content bundle
(ARCHITECTURE §13). A change here that shares logic with the app without changing what the website shows
or does is the intended shape, not an intrusion: PR #57 moves the module page's derivations into
`module-render.ts` for exactly that reason.

**Rejected:** generating the bundle in the mobile repository from a pinned commit of this one, which was
offered while D90 stood. It would have kept this repository untouched at the price of the app reading
another repository's internals, its content arriving from a second host, and the logic having a second
build to drift in. MANIFESTO §7 carries the rule in one line; the struck D90 bullet stays beside it.

### D112 · Course images are WebP, capped at 1,600 px, at a measured quality — 2026-11-09

**Asked by the author** after a media analysis: the course images were 30.1 MB, eight of them 2.0 to 2.8 MB
JPEGs about 2,800 px wide, so one module page downloaded 7.7 MB of pictures. **Done:** every raster course
image is WebP, at most 1,600 px wide (sharp at the text width on a 2x screen), encoded at quality 82, then 90,
then near-lossless, taking the first whose SSIM against the original resized to 1,600 px is at least 0.985; an
image whose WebP is larger keeps its original (one did). Measured: 30.1 MB to 6.2 MB, 30 at q82, 7 at q90, 11
near-lossless (screenshots and text-heavy diagrams, and the two most detailed illustrations), 1 kept.
**Rejected:** a single quality for all, because q82 blurred small text in screenshots (SSIM 0.957); and keeping
one copy of `system-prompt-context` for two levels, because the renderer serves an image from its own level's
folder and the mobile bundle names images by that path (ARCHITECTURE §13), so it would change the app's image
paths for a 50 KB saving. **Deferred, not done:** `loading="lazy"`, width and height on `<img>`, and a smaller
phone variant. **For the app:** image paths and hashes change inside `api/v1/`, which is a content change;
Flutter decodes WebP.

### D113 · Only content is multilingual: the home page's words translate, menus never do — 2026-11-09

**Asked by the author**, after asking what a Turkish and Persian home page would cost: *"the rule of thumb is
that in my project multilinguality is only for content, not for menus! That's why even clicking on Turkish
text which brings to catalog, should bring to English catalog because catalog is part of menus. But markdown
contents or homepage cast trades and stories and stall etc are considered content so can be multilingual."*
This generalises D80 (content level only) from module pages to every surface. **Done:** the home page has
`/tr/` and `/fa/` addresses; its copy lives in one table, `src/lib/home-copy.ts`, keyed by the language
registry; character names stay English; every link from a translated home lands on the same English page as
from `/`; the language menu appears on the home page. `/` stays English. **Rejected:** a Turkish and Persian
catalog (option b) so a journey stays in one language, because the catalog is a menu; detecting the browser's
language and redirecting from `/`, because a shared link would then open in different languages for
different people and the page would jump after it loads; a "this page is also in Türkçe" banner, which the
author did not ask for.

### D114 · A block's menu is a popover in the top layer, placed in the window — 2026-11-09

**Reported by the author:** on a short block the theme menu showed only its top options and the rest was
hidden. **MEASURED** (hit test at each option's centre, 1440 and 390 px): a code block's three-option menu on a
95 px block had one option answering, because `.bz-slab` is `overflow: hidden`; a diagram's ten-option menu
(440 px) on a 185 px figure was **not** clipped by the block, its tools strip sits outside the scroller, but ran
off the bottom of the window when the figure sat low in it. **Done:** while open, the panel is a
`popover="manual"` shown in the top layer, `place()` in `ReadingOptions.tsx` puts it below the button, above it
when there is no room, slid up if neither fits, and scrolling inside itself only when the window is shorter than
the menu; the language reads three custom properties (`bazaar.css`). **Rejected:** removing the slab's
`overflow: hidden`, which loses the head's corner rounding and still hangs off the window; CSS anchor
positioning, which Firefox does not ship; a `popover` attribute in the emitted markup, because the tool strip is
in the published bundle (`blocks.ts`) and a behaviour is not content (the bundle's contentVersion is unchanged).
A browser without the Popover API keeps the in-block panel.

### D115 · About: dusk to dawn, a procession of five stalls, and no scene in a box — 2026-11-09

**Picked by the author** from the round-5 playground (`playground/2026-11-round-5/`, M90): *"I want B2 and F1
combination, but the chapter headings such as "Generation is free, and the internet is drowning in AI slop"
should be smaller in font size and also have width identical to the text below them."* So the ground is **B2,
Dusk to dawn** (deep clay, plum, cobalt, teal and umber per stall, then dawn sand at the motto with the text
turning dark), the feel is **F1, Procession** (Fraunces headings, the site sans for reading, each stall pinned
and played by the scroll, a gold gate arch round the title and the motto, a diamond rail of stalls), and the
headings are set at about 30 px at 1440 and run the width of the text column, so most take one or two lines,
as he asked ("most of the time"); MEASURED at 1440, 1280 and 390, four of the five do and stall 5's
question takes three.
The scenes: **2A** needle in the haystack (canvas, scroll driven), **3E** the seal (CSS 3D), **4E** brainrot
(SVG), **5A** Nietzsche engraved (SVG), with R5's hand-drawn underline under the motto. **Stall 1 is 1B6,
"Down the table, revised"** (`R1b-treaty-alternatives.html`), picked after he liked 1B "The treaty" and asked
for alternatives to it: the Hall of Mirrors in 1919, five diplomats passing the treaty down a short green
table to a woman in the spirit of Hürrem Sultan (fair, auburn braids, a small gold crown, a crimson kaftan, no
head covering) who asked "Is the coffee ready?" and holds out an empty Turkish coffee cup; she falls asleep;
page 412 says yes and she raises a steaming cup. It is the 1919 treaty of the story's own first paragraph,
told as a joke about a one-word answer. Its bubble lines and article titles are the scene's words, art like
4E's meme captions, so they live in the scene (`treaty.ts`), not in STORY.md.

**No scene in a box.** The author, on 1B: *"the fact that each animation is in a box is bad. in the final
version I want no box."* It holds for every stall: a slot only sizes its scene (no border, fill, shadow or clip),
art that reached the playground square's edge fades into the ground instead (the haystack's beam, the
brainrot figures' bodies), the seal's desk is a pool of shade wider than the slot, and the engraving lost its
cream oval plate and gold rings: the cream fades radially and the bust is masked by a soft ellipse, not
clipped. `tests/e2e/about.spec.ts` checks it.

**Three exceptions it made, each named.** The page's colours are an exception to **D31** (colour from the
shell): its grounds and inks are page-scoped art in `components/about/palette.ts`, written into the page as
custom properties the way `diagram-themes.ts` writes Mermaid's grounds. The copy register exempts two meme
captions in 4E, each for the one ban it trips (`MY ATTENTION SPAN:` first person, `ME: ONE QUICK`
"quick"), because the voice is a quoted reader's. And Bit's bubble in 4E moved left of where the playground
drew it, because its longest line reached the scene's faded edge.

**The text is STORY.md's**, read at build time (`src/lib/content/story.ts`): one stall per `##` section, in
order, and the motto from the closing line. **Linked from the footer, not the bar**: the phone bar is full
(`MainNav.tsx`, `data-bar-edge`), and a page about the project sits with the repository and the licence.

**Rejected:** backgrounds B1 (lamplit night) and B3 (inked paper); feels F2 (manuscript, inertia scroll) and
F3 (chapters, one stall per wheel turn, which hijacks the wheel); for stall 1 the options 1A, 1C, 1D and 1E,
1B as first drawn, its alternatives 1B1 to 1B5 (three in three.js, two earlier Versailles drafts), and the
other questions the woman could have asked (Q1 the umbrella, Q3 the tomato, Q4 the meeting, Q5 Friday); 2B to 2E, 3A to 3D, 4A to 4D, 5B to 5E; F1's headings at their drawn size. Also
rejected: the colours in `about.css` (a surface may hold no colour; they are the page's art, stated once in
`components/about/palette.ts` and written into the page as custom properties, the `diagram-themes.ts`
mechanism); rendering STORY.md through the module pipeline, which is built for modules; three.js, which no
picked scene needs (1B6 is flat SVG).

### D116 · Caravan is C4, Shadow Play, with one entry per trend (format 2), shown on sample data until the author's trends land — 2026-11-09

**The design, picked by the author** from round 5 (`playground/2026-11-round-5/C1-caravan-designs.html`):
*"I love C4 the shadow play!! it is very turkish!!"* A Karagöz screen: painted leather puppets on rods
cross a lamplit cloth, and each trend is a prop that glows when reached. **His three changes, already in
that file:** four moving characters in all (the leader on horseback, the driver with the lantern, two
camels); the caravan walks a lower road and the props, their names and the year posts stand on an upper
band, so nothing moving covers a stop; and the caravan starts at the far left, so the road ahead is open.
**Kept from the mockup:** the strip (one bar a month, a draggable thumb, a slider to the keyboard), the
year bar with the place beside it ("2023 · The oasis"), a stop that grows and opens a card on hover, focus
or tap while the rest dim, Enter to keep, Escape to close, Tab and the arrows to walk the stops, wheel,
drag and strip to travel, and reduced motion moving at once with nothing walking. **Filtering is by year
only**, with no category chips. **Two defects of the mockup fixed:** its copy of the bar still showed an
old `Curriculum` link (the page sits in the site's own bar, so it is gone), and in 2024 a stop's name sat
over the year's medallion (a label now slides sideways, the shorter way, until it clears every post; a
browser test walks the whole road and holds it). **Rejected:** C1 The Road, C2 Dunes in 3D, C3 The Map
Table and C5 The Handscroll of round 5 v2, and the five chart designs of v1 (The Route, Lanes, Pulse,
Night Caravan, Stall Row), by the author's pick.

**The content format, format 2 of C2** (`C2-caravan-node-formats.html`, N2, the merchant's tag). The
author: *"I need only 2. because if something deserves a module and it is new, it can be already found in
emerging level. so caravan can act like a quick overview of whats trending."* One entry per trend: a
title, a span of months (`end` null while open), ONE paragraph on what it was, and links grouped the way a
module's References are, in one YAML file. **How it differs from C2's N2:** N2 drew one source link and
"one or two plain sentences, up to 35 words"; here the links are grouped like References (articles,
videos, tools, repositories, modules), as the author asked, and the text is ONE paragraph with **no word
cap** (this milestone's call: the build refuses a second paragraph, and the author's own register keeps it
short; a cap would be a number nobody chose). C2's merchant's `goods` field is dropped: a prop's colours
come from its place on the road, so the author has nothing to fill in for the art. **Rejected:** N1 the milestone stone (a name and one link, too
little to say what the trend was); N3 the caravanserai sign (a "why it mattered" sentence, a typed
intensity and a module, the start of a page); N4 the ledger page (N3 plus typed sources and what else was
on the road: a module's worth of writing per trend); N5 the postcard (the picture people shared, the most
work to source well); and one markdown file per trend (the structure outweighs one paragraph, and a
subject that needs a page is an Emerging module).

**The pipeline's defaults, the author's ("I have made all the decisions needed"):** one stop per trend,
spanning its start to its end month (C2's G3); about 16 to 48 trends in the end; a trend ends when people
stop calling it new, which answers the round-5 note's question of a trend that became ordinary practice;
a model release may date a trend's start and is never a trend; **strength is measured by the pipeline from
evidence and never typed by the author** (C2's H3; H1, the editor's rubric, is rejected by this, and with
it the round-5 note's `adjust` overrides; H2, how widely it was carried, survives as the method's
two-family rule); English first, Turkish and Persian later under the modules' rules; agents research,
measure and propose, and the author writes every sentence (`mini-courses/STORY.md`: *"No AI was allowed to
write our content."*).

**What this milestone chose, where the author had not:**
- **The measured strength lives in its own file**, `mini-courses/caravan/strength.yaml`, which only the
  pipeline writes, so the author's file holds only his fields and a quarterly run never edits it. The
  pipeline's evidence (frozen queries, counts, the verified record of each link) is committed beside them
  as `evidence/<id>.yaml`, read by nothing that ships, so a level can be recomputed. **Rejected:** the
  round-5 note's three-file ledger with a separate `sources.yaml` (in format 2 a link's title sits in the
  trend; its verification record is evidence); a `status: proposed` entry an agent may add to
  `trends.yaml` (an agent would then write in the author's file).
- **Until a real trend exists the page draws a placeholder sample from `src/`**
  (`components/caravan/sample-trends.ts`), and `trends.yaml` ships empty. **Rejected:** sample trends in
  `mini-courses/` (anything there is the author's content and is published as his, which is what
  STORY.md's rule forbids), and a page with nothing on its road (the author could not judge the design).
  The sample's external links carry no address (a sample source would be an unverified claim, MANIFESTO
  rule 13); its module links are real, read from the curriculum, and a name that stops resolving is
  dropped rather than failing the build. The first real trend replaces it whole, never mixed with it.
- **The sample's sentences are agent-written, an approved exemption.** Twenty-two placeholder trends,
  cut from the round-5 mockup, are shown on the live page while it is illustrative and not ready, which is
  what the author asked the page to be. They are the one place on the site where words an agent wrote
  are shown, labelled on the notice and on every trend, and they go with `sample-trends.ts` when the first
  real trends land (M92). They are not content and are not in `mini-courses/`.
- **The page opens with the notice the author asked for** (*"mention the above is illustrative and is
  not ready"*): "Illustrative: the trends below are sample data and this page is not ready yet.", and
  every trend says "Sample data, not checked". With real trends it says only that the page is not ready.
- **The trail stays, above the notice.** Dropping it, as the home page does, was tried and refused by
  `navigation.spec.ts`: every page but the front door carries a trail (D79), so the notice is the first
  thing of the page's own content, directly under it.
- **The phone width is the language's touch floor (767px), not the mockup's 720px**, which is no
  breakpoint the language declares (`styling-references.test.ts` refuses one); the scene and the
  stylesheet change at the same width.

**After two reviews of PR #98** (2026-11-09):
- **The stage fits the window.** The mockup's fixed 470 px stage put the caravan and the strip below the
  fold on a laptop (1280x720). The stage is now as tall as the window leaves under it, between 300 and
  470 px, the scene's heights and art scale with it while its pace across the road does not, and the year
  bar and the place share the head's row. MEASURED at 1280x720: the stage ends at 643 px and the strip at
  707 px of 720. **Rejected:** only shortening the head (still 120 px short at 720), and a smaller fixed
  stage (it would waste the height a taller window has).
- **The wheel's pace is the road's**: the whole road takes 3,000 px of wheel, against about 12,000 px when
  one wheel pixel moved the picture one pixel; vertical wheel, Shift and a wheel, and a sideways swipe all
  travel, and at either end the wheel scrolls the page.
- **The card and the strip use the language's chrome**: the card is the code slab and the strip is the
  bar, both dark in both themes by the language's own rules, so the mockup's night card and night strip
  colours were not transcribed and no DESIGN.md deviation is needed. **Rejected:** transcribing them with
  a deviation, which adds colours the language does not have for no visible gain. The theatre's own
  colours stay page-scoped art in `palette.ts`, as About's (D115) are.
- **A focus ring on the leather, the card or the strip is the lamp's colour**: the language's focus colour
  is 2.56:1 on the night card and under 3:1 on the strip.
- **The year bar marks the current year with `aria-current`**, not `aria-pressed` (it is a position, not a
  toggle), and the place is announced only when a reader picks a year, never each time the road crosses
  a January.
- **The page says when the author's trends are not measured** ("Not measured yet: ..."), rather than
  drawing a flat road as if nothing had been strong.

**Caravan in the mobile bundle, later.** Not part of M91, which left `out/api/` byte-identical to
`main`'s. When it joins, it is an additive v1 change (ARCHITECTURE §13): one document per language,
`api/v1/caravan/<lang>.json`, from a static route handler with a strict schema in `schema.ts`, carrying
the first and last month and, per trend, its `id`, `title` and `text` as `inlines`, `start`, `end`, its
links by group (a module as a link target the way a module document carries one) and its measured
strength by month, plus the month totals the land is drawn from, so the reader derives nothing; and an
optional `caravan` field on the index naming each language's document, listed in `files` with its hash.
Renaming or retyping any of it afterwards would be `api/v2/`, so the shape settles on the web first.

### D117 · Caravan, round 2: a zoom fitted to the stage, rods across a ledge, and the trend list paged in the browser like the catalog — 2026-11-10

The author's second round on the built page (his words are in **M93**): the stage taller, the caravan
about 30% larger, the rods visibly sticks, the trends browsable by year and search in a card view and a
list view twelve at a time, and the line under the title and the "year · place" row removed.

- **The scene is drawn at a zoom fitted to the stage, not at the mockup's size times 1.3.** `zoomFor`
  takes the largest zoom at which the scene, from the ledge to a label over the tallest prop on the
  highest land, fits the stage's height, capped by the window's width (1,100 px a unit of zoom) and at
  1.6. MEASURED: the leader is 29% larger at 1280x720, 33% at 1440x800 and 32% at 1440x900. **Rejected:**
  a fixed 1.3 times the first build's scale (at 1280x720 the caravan and the strip would no longer both fit
  the window, which a test holds); a zoom from the height alone (at 1440x900 it reached 1.6, past the
  "about 30 percent" asked for); and keeping the first build's 470 px cap (he asked for a taller stage).
  The pace across the road scales with the zoom (260 px a month at zoom 1, up to 416), so larger props
  stand as far apart for their size as before; the wheel's pace is the road's (D116) and does not change.
- **The rods run across a ledge under the cloth, and they are drawn beside the wobbling leather, not in
  it.** The first rods ended a pixel under the cloth, behind a 16 px ledge. Now the cloth ends at a ledge
  sized to the zoom and the caravan is drawn over it, so the sticks are seen to the stage's foot.
  **Rejected:** rods inside the wobble group made long (the wobble pivots at the foot of its box, which
  would be the rod's end, and the puppet would swing wide on a long stick); rods in a separate layer redrawn from
  the puppets each frame (the wobble is a CSS animation the frame loop does not see, so the stick and the
  puppet would part at rest); a dark rod only (invisible on the dark ledge), so a light core under a dark
  edge, the core a new palette colour, `--caravan-rod`.
- **The list is paged in the browser, every entry kept in the page.** One island, `TrendBrowser.tsx`,
  hides what is not on the page; the server renders every trend, so without a script all are listed.
  **Rejected:** a prerendered address per page (`/caravan/page/2/`): the year and the search would still
  be the browser's, so a page number would mean different trends under different choices, and the
  scene's card copies an entry from the list, so every entry must be in every page anyway. The choices
  are not kept in the address, because the catalog keeps none there; the view is not remembered, because
  the catalog's remembered view is a record field (`prefs.catalogView`) and a second one for a page of
  sample data is not worth a change to the reader's record.
- **The controls are the catalog's own classes, and the hover is the catalog's.** The filter bar, the
  chips with a visible `Year:`, the view toggle and its icons, the count as a live region and the empty
  state come from `catalog.css`; the page buttons are chips, the current one marked as the catalog marks
  the current level. The view's state is `aria-pressed`, where the catalog uses a hidden `Showing`
  because its view is stamped on `<html>` before React runs; here React owns it. A card takes the catalog
  card's hover (the strong edge) and a row the catalog table row's (the sunken fill).
- **The place stays in the live region.** The row on screen is gone, on his word; a reader who picks a
  year still hears where the caravan is, so the places in `places.ts` stay.

## Open questions

None open in this part yet. New ones go here, numbered after O5.

---

> **← Part 2: [`BRAINSTORM_2.md`](BRAINSTORM_2.md)** — D26 to D96. **← Part 1:
> [`BRAINSTORM_1.md`](BRAINSTORM_1.md)** — D1 to D25, the entry test, and the house style.
