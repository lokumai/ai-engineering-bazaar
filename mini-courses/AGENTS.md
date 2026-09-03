# Working agreement

Rules for any AI assistant working in this repo. **This file is live**, see
[Keeping this file current](#keeping-this-file-current) at the bottom.

`AGENTS.md` is an identical copy. Change one, change both.

## Read first

`MANIFEST.md`, beside this file, is the contract for everything under `mini-courses/`. Read it before
writing or editing any course content. Its seven rules in short: human-written · sounds like a
person talking · stays simple · five to ten minutes per module · pictures do a lot of the work ·
every module links out · only what matters.

## How we work together

**The author writes, you shape.** Amirkia supplies the explanation, the structure and the
references. Whatever arrives in chat is **raw material, not copy**, rough notes written between
the two of you. Turn it into something written for the reader; do not paste it in as it stands.

**Never invent content to fill a gap.** If the draft is missing a fact, a number or a link, mark
it and ask:

```markdown
<!-- NEED: the figure for X -->
```

**Deliver the literal ask, nothing more.** No unrequested sections, notes, labels or defensive
caveats. If something genuinely seems missing, say so in one line *outside* the deliverable.

**But do correct what is wrong.** Broken heading hierarchies, arithmetic that does not add up,
dead cross-references, a diagram that misrepresents the mechanism, an image whose caption does
not match what it shows: fix these and say plainly what you changed. Verify numbers in the
draft rather than passing them through. The line is: **correct what is wrong, add nothing that
was not asked.**

**Write to Amirkia in plain technical English.** Technical terms are welcome, he is an AI
engineer. A metaphor standing in for the mechanism is not: "the feature lost its safety net" was
asked to be rewritten as "those features still work, but if someone breaks them later nothing will
notice automatically". Where a term has to stay, define it in the same sentence. This is about the
conversation, not only the modules, where the manifest already demands the same thing.

**Never delete a file the author works in.** `scratchpad/topics.txt` was deleted because a plan
step said so, after he had agreed only that its *notes* should be copied into `curriculum.yaml`.
Copying content out of a file is not permission to remove it, and approval of a long plan is not
approval of every line in it. If a step removes something the author touches, ask about that step
on its own, in one sentence, at the moment it would happen. `scratchpad/` is his to think in and
nothing in it is ours to tidy.

**Stage explicit paths, never a directory.** `git add mini-courses/2_intermediate` sweeps in
whatever the author has dropped there and not yet committed. That happened: nine in-progress images
went into a commit and onto the remote because a directory was staged instead of the files that had
actually changed. Name the files, and read `git status` before every commit.

**Do not commit or push unless asked.**

## Writing rules

- **Public files are written for readers**, not for the two of you. No mention of drafts,
  workflow, AI assistance, or internal directory paths.
- **First person:** "me" for the author, "we" for the project. Never a bare "I".
- **No em dashes.** Never use `—` as punctuation. Use a colon, a comma, parentheses, or split
  the sentence in two. This applies to English and Turkish, to captions and list items, and to
  the working files as well as the modules.
- **Plain English.** Short sentences, common words, readable by a non-native speaker. Not a
  textbook, so no Roman-numeral outlines or lettered subsections.
- **Never dense. Being concise is not a goal here.** Plain English and compressed English are not
  the same thing, and compression is the failure mode this project keeps hitting. Amirkia, after
  reading modules 10 to 12: "Make sure you did not make the language too dense solely to make it
  short or concise. We do not like dense language at all." Five shapes to watch for, all of them
  found in those three modules:

  | Shape | Example that had to be rewritten |
  | --- | --- |
  | A clause folded back on itself | "a request with a good success rate, and a good success rate is not what you want from that particular sentence" |
  | A fragment used as a sentence | "Which means…", "Which is a sensor pointed at the guides.", "Concretely, then." |
  | Stacked adjectives | "the stable, high-level, repository-wide stuff" |
  | One sentence carrying a list | five items through four semicolons, ninety words. Make it a list. |
  | A run of one-clause sentences | ten in a row, one per extension point. Reads like notes, not a person. Summaries attract this. |

  The check is not the word count. Read the paragraph aloud and ask whether somebody explaining
  this out loud would say it that way. **Loosening a module makes it longer, and that is the
  correct outcome**: all six files grew in that pass. His own drafts are unhurried, use whole
  sentences, and repeat a point where repeating it helps.
- **The test is depth, not word count.** Every part must stay simple and high-level; a module
  that covers a lot is fine as long as no single part dives into detail. Do not trim a module,
  or flag it as too long, just because the total word count is above some number. Going deep
  is what breaks the rule, not going wide.
- **Every module ends with links out** and a short References list built from the links actually
  used in the text.
- **Keep the author's rhetorical turns.** Trim repetition and self-praise; keep the arguments and
  the punchy phrasings.

**Images use markdown, never raw HTML.** The image line, two trailing spaces, then the caption in
italics on the next line:

```markdown
![Short title](./images/my-diagram.jpeg)  
*One or two lines saying something the picture cannot say on its own.*
```

This matters more than it looks. The app turns that into a real `<figure>`: it numbers it
(`FIG. 4.2`), uses the alt text as the caption label, puts the italic line in a `<p
class="hl-cap-note">`, applies a width class, and rewrites the path to the copied
`/course-images/` location. **Raw HTML is stripped out of the markdown entirely**, so an
`<img>` tag written by hand does not render on the published site at all. It was tried, and eight
figures silently disappeared from the site while still showing on GitHub.

So the alt text is not just accessibility text, it is the printed figure label: give it a short
title, capitalised.

**A caption note only attaches to an image, never to a mermaid diagram.** Measured in the export
2026-09-03. For a markdown image the italic line becomes the figure's `<p class="hl-cap-note">`.
For a mermaid fence the build writes the `<figcaption>` label from the nearest heading instead
(`FIG. 29.1`, then that heading), and an italic line after the closing fence stays an ordinary
`<p><em>` paragraph. That is still worth writing, because it reads as a caption to anyone on the page or on
GitHub and it is where the punchline a mermaid node cannot hold belongs. Just do not count on it
showing up as a caption, and do not count `hl-cap-note` to check a diagram has one.


## How a module gets written

Practices settled while writing the first three Fundamentals modules. They are not style garnish, they are what makes a
module land.

**Open by connecting, then name the one idea.** The first lines say what the previous module
established and what this one adds. No greetings, no "welcome", no "in this module we will".

**Figures carry the argument, they never decorate.** Put a figure where the reader needs it, not
at the end of the section. If a figure is good enough to change what the section should say, then
restructure the section: the training-network figure became the opening of Training LLMs because it
answers "what does training change", which the draft never asked. The caption says something the
picture cannot say for itself: the mechanism, the one thing to notice, or the consequence. A
caption that restates the alt text is wasted.

**Answer the misconception the material just invited.** Immediately, in one or two sentences. The
three-dimensional embedding picture gets "real embeddings have hundreds of dimensions". PEFT gets
"do not confuse this with quantization". A figure labelled "unsupervised" gets the note that the
precise term is self-supervised. Silence here is how a simple explanation becomes a wrong one.

**One analogy per hard idea, then call it back.** The context window is a desktop and the weights
are a library: introduced once, used again in the fine-tuning comparison, and again in the summary.
Repeating one analogy builds a reader's model. Stacking three analogies destroys it.

**Defer depth with a real link, never with a vague promise.** Introduce a term plainly and point at
the module that owns it. Advanced asides belong in a `> **NOTE...**` blockquote so the main line
stays simple for the reader who does not want the detour.

**Mermaid, never ASCII art.** And remember a mermaid node cannot hold a punchline, so whatever the
old ASCII block said in its last line becomes a sentence after the diagram.

**One code sample, at the rawest useful level.** Show the mechanic once and list the tools that
wrap it, ordered by how much they do for you. Four samples of the same idea in four libraries is
padding. Every fence gets a language tag, which the build requires.

**Verify, do not pass through.** Check the arithmetic in the draft: a 32B model at 16-bit is about
64 GB, and the draft saying 44 GB had to be fixed. Fetch every external link and use its real
title: two guessed titles this session were both wrong. On a project whose whole premise is that
machine-written content on these topics is unreliable, a wrong number or a mislabelled source is
the one unforgivable defect.

**Make an earlier module pay off in a later one.** RAG & Embeddings' retrieval pipeline reappears
in Tool Calling as a tool, with the note that letting the model decide *when* to retrieve is most of
what separates a RAG app from an agent. LLM Fundamentals' `read_file(path)` tool schema reappears in
Tool Calling's system prompt. These callbacks are what make the set a series rather than seven articles, and they
cost one sentence each.

**Cut the filler.** No greetings, no "Keep going 🚀", no "Quiz Yourself", no telling the reader how
valuable the material is.

**End with links out**, and build the References list only from links actually used in the text,
each with a few words on why it is worth opening.

**API examples use the OpenAI and OpenRouter-compatible shape**, because LLM Fundamentals points readers at
OpenRouter and they could actually run what they read. Add one line noting field names differ
slightly between providers while the shape does not.

## Translating a module

Write the Turkish only once the English is final, then:

- **Mirror the structure exactly** and check it: heading counts, figures, mermaid blocks, code
  blocks. Those counts are what prove nothing was dropped.
- **Then read the opening and the closing of both.** Matching counts prove nothing was dropped,
  not that the right thing is there. `harness_engineering_tr.md` shipped with Loop Engineering's
  opening paragraphs, so the module introduced itself as the wrong module while every count
  matched perfectly. Nothing automated can catch that; two minutes of reading can.
- **Technical vocabulary stays English**, inflected with Turkish suffixes: `context'in`,
  `parameter'lar`, `weight'ler`, `chunk'ları`. Translate the ordinary words around them.
- **Translate a teaching example, keep a data example.** "The capital of Turkey" becomes
  "Türkiye'nin başkenti", because that example only works if the reader completes the sentence in
  their own head. The article-and-summary pairs stay in English, because they are a record of what
  a model was actually shown and produced.
- Turkish runs roughly 20% shorter than the English. That is the language, not missing content.

## Two files that move together

`README.md` and `mini-courses/index.md` are the same page for two audiences. **Change one, update
the other in the same commit.** The transform from README to index:

- drop the "Read online" line, since the reader is already there
- strip the `mini-courses/` prefix from link paths, since `index.md` lives inside it
- keep the `MANIFEST.md` and `ROADMAP.md` links relative in both, since both files sit inside
  `mini-courses/`
- **link nothing outside `mini-courses/` from `index.md`.** An internal `.md` link the corpus
  cannot resolve fails the build, so point at GitHub or name the file in prose instead
- keep the Contributing section at the end of `index.md`

**`index.md` is no longer the published home page.** It used to be, and this rule used to say so.
The app's §15 work replaced `/` with a home screen built from components, and `lib/content/` now
reads `index.md` only as a link target: `../index.md` from inside a category resolves to
`/courses/`. So `index.md` is a page for people browsing `mini-courses/` on GitHub, nothing more.
Keeping it in step with `README.md` is still worth doing for that reader, but do not expect to find
its prose in the export, and do not go looking for a bug when you cannot.

**Both files describe the course, not the machinery.** The technical detail belongs in
`context/ARCHITECTURE.md` (the whole repository) and the root `ARCHITECTURE.md` (the application).
`README.md` was trimmed from 2,704 words to about 1,000 on that basis: what was cut had to land
somewhere first, and the eight notable test checks moved into `tests/README.md` rather than being
deleted.

## Language

Modules are written and finalized in **English first**. The Turkish `*_tr.md` files are
translated only once the English is final, so each module is translated once.

## Where a visual comes from

Rule 5 of the manifest says pictures do a lot of the work, so a module without one is usually
unfinished. There are four places to get one, roughly in order of how much work they cost.

**1. Reuse a figure that already exists.** The cheapest and often the best. `agent-context.jpeg` was
drawn for Tool Calling and reused in AI Agents for one pass of the loop; `llm-context.jpeg` was
drawn for LLM Fundamentals and reused in Memory as the message stack. A figure the reader has seen before does
double duty: it teaches the new point and reminds them of the old one.

**2. Draw one with the project templates.** For anything about context, messages, tools or agents,
use the three-column system: `assets/empty-context-template.jpeg` and
`assets/context-style-template.jpeg`, with ready-made prompts in
`mini-courses/scratchpad/diagrams/`. Generated images go to the author to run, not to a tool here.

**3. Mermaid, and not always a flowchart.** No generation step, renders on the site and on GitHub,
and free to edit later. Default to it over a generated image whenever the content has a shape
mermaid already knows.

**Pick the type from the shape of the idea, not out of habit.** The corpus reaches for
`graph LR` almost every time, and several of those would read better as something else. Mermaid
11.17 is what ships, so all of these are available:

| The idea is | Use |
| --- | --- |
| A flow, a branch, a pipeline | `flowchart` / `graph` |
| Actors exchanging messages over time | `sequenceDiagram` |
| A breakdown of a topic into parts | `mindmap` |
| How a topic evolved, what replaced what | `graph TD`, one node per era (see the warning below) |
| Things that are in one state until an event moves them | `stateDiagram-v2` |
| Proportions of a whole | `pie` |
| Options compared on two axes | `quadrantChart` |
| Entities and how they relate | `erDiagram` |
| A measurement against another | `xychart-beta` |

**`sequenceDiagram`** matters especially here: it is the honest shape for anything where a user, a
host and a model take turns, which is most of Fundamentals.

**Two types colour themselves, and the two were judged differently.** `timeline` and `mindmap` both
paint their own blocks and branches in bright inline colours (orange, magenta, yellow) that the
site's design tokens never reach, so they stay bright in dark mode.

- **`mindmap` is allowed.** It was tried in Context Engineering, and Amirkia looked at it and liked the
  colours: "no worries if it ignores site design". So a mindmap keeps its own palette on purpose.
- **`timeline` is not.** Same colour problem, plus it grows wide enough to clip its last column.
  Tried in Prompt Engineering and replaced. A story over time reads better as a `graph TD` with one node per
  era and the events inside the node, which themes correctly and reads top to bottom as
  chronological. The manifest-rule-1 point still stands: a model cannot tell a reader when an idea
  appeared or what it replaced, so the *content* of that figure is one only a human can supply.

Either way, look at a self-colouring diagram in the browser, in both themes, before trusting it.

Anything ending in `-beta` works but its syntax can still move, so prefer a stable type where one
fits.

**No colour literals in mermaid.** A test asserts no `#hex` survives into a rendered diagram. The
pipeline rewrites `style NODE fill:#HEX` into themed classes, but only for nine specific hexes it
knows (`#90EE90`, `#FFFF00`, `#FFB6C1` and six more). Any other colour fails the build. The safe
move is to use no colour at all and let structure carry the meaning.

**4. Search for one.** Entirely legitimate and often faster than drawing:

- **Google Images** or a web search for an existing diagram of a standard idea. The king-and-queen
  embedding picture and the pre-training-versus-fine-tuning diagram both came this way.
- **An article** with a good figure, which also gives the module a reference worth linking.
- **YouTube**, including **Shorts**, for a video that explains something better than prose will.
  Always fetch the real title rather than guessing it.
- **Memes and brain rot.** Not decoration, and not a joke at the reader's expense: a good meme
  compresses an argument. AI Agents carries three, and each one states a different claim the prose
  then unpacks. If a meme is doing that work, it earns its place.

**Whatever the source, the caption still has to say something the picture cannot.** A found image
with a caption that only names it is worse than no image. And check what the picture actually shows
before writing about it: a figure labelled "unsupervised" needed a note that the precise term is
self-supervised, and three memes in AI Agents had captions that threw their arguments away.

## Diagrams

One visual system for the whole project. Templates:

- `assets/empty-context-template.jpeg`: the three-column layout, USER | CONTEXT | LLM. Ships
  with **no arrows**; the prompt draws them.
- `assets/context-style-template.jpeg`: the component style sheet.

Ready-made prompts: `mini-courses/scratchpad/diagrams/three-column-template-prompts.md`.

**Palette (do not invent colors):**

| Box | Hex | Outline |
| --- | --- | --- |
| System Prompt | `#7B7B7B` grey | solid |
| Human Message | `#C0392B` brick red | solid |
| AI Message – thinking | `#3E8E63` green | dashed |
| AI Message – answer | `#1B6E52` deep green | solid, thicker |
| Tool Call | `#A87FE0` light purple | solid |
| Tool Result | `#6A2CA0` dark purple | solid |
| Context container | `#2A6EB5` blue | solid |
| LLM | `#D4691E` orange | solid |
| User | `#6E6E6E` grey | solid |

Both AI variants are green, same author and same hue, separated by dash and stroke weight. Only
message boxes get the light hand-scribbled fill; the User box, the Context container and the LLM
box stay outline only.

**The arrow rule:** an arrow means *someone wrote this message*. It starts at the USER box or the
LLM box and ends on one specific message box. The LLM emits the Tool Call; the host machine
produces the Tool Result. There is **no arrow for the context being sent to the model**, because both
sides can see the whole board, so nothing moves.

**Writing image-gen prompts:**

- The author pastes the template images. Refer to them by what they show, such as "the attached empty
  three-column diagram" or "the attached style sheet". Never use numbered references.
- Say what to draw. Do not list what not to draw; the model draws what you say.
- Finished images go in `mini-courses/<category>/images/`. `assets/` is outside the corpus and
  never publishes.

## Starting a new module

Three things, and the third is the one that is easy to forget.

1. Copy `mini-courses/_module_template.md` to `<category>/<name>.md`, where `<name>` is lowercase
   with underscores and no number.
2. Create `<name>_tr.md` beside it, even as a stub. A module with no Turkish sibling fails the
   build.
3. **Add one line to `curriculum.yaml`**, in the position the module should hold. That line is what
   gives it a number, a title, a status and a place in the sequence; without it the file is one
   nobody listed, and the build says so by name.

The template carries the two frontmatter fields a file still declares (`summary` and `objectives`)
and an annotated body showing every structure the renderer understands: figures, mermaid, tables,
tagged code, cross-references, the optional Quick Check and checklist, and the sequence rail the app
strips. It is never loaded as a module itself, because the loader reads the config rather than the
directory.

## Checks before you call something done

```bash
npm test          # vitest, includes the content and internal-link checks
npm run build     # the Next.js build that ships
```

CI runs `npm run typecheck`, `npm test`, `npm run build` and the Playwright suite. The content
checks live in `src/lib/content/`, so a broken cross-reference in a module fails `npm test`.

**A green suite is not proof the page is right.** When you change *how* content is authored, rather
than what it says, look at the static export:

```bash
grep -rl "my-new-figure" out/courses/    # is it actually on a page?
```

That is how the missing-images defect was caught, and only after typecheck, 1948 tests and the
build had all passed. Tests check what someone thought to check; the export is what ships.

**Never write a test that states a fact about the content.** The suite used to pin word counts,
module numbers, checklist totals and quoted prose, so ordinary edits turned the build red and
taught nobody anything. It was cut from 1,948 tests to a few hundred in September 2026. A test may
check a rule that holds for any module; it may not record what a module currently says.
`tests/README.md` carries the rule, the four layers that replaced the old suite, and what to ask
before adding a test. Read it before touching anything under `tests/`.

**Comparing two builds needs `scripts/compare-export.sh`, never `diff -r`.** A raw recursive diff
between two builds of *identical* source is never empty, for four reasons that say nothing about
the site: Turbopack names chunk files per build; Next.js stamps a random 21-character build id into
every page's payload; the React payload numbers its rows, so adding one prop to one client
component renumbers rows on every page that uses it and moves ~1KB with the visible page unchanged;
and `out/course-images/` mirrors whatever is on disk, including untracked images. The script
compares what a reader can see (every page with `<script>` blocks stripped and the two random
values normalised) plus the page inventory by name. This is the strongest check in the repo for a
change that is *not supposed to* alter the site:

```bash
npm run build && cp -a out /tmp/out-base   # before
# … make the change …
npm run build && ./scripts/compare-export.sh /tmp/out-base out
```

To build a reference from another commit without disturbing the working tree, use a throwaway
worktree and hard-link `node_modules` into it (`cp -al`, which costs no disk and takes under a
second). Turbopack rejects a *symlinked* `node_modules` with "points out of the filesystem root".

**If the suite fails, run `git status` before assuming it was you.** The author edits these files
while you work. Twice this has been the real cause: a save that silently dropped a section, and a
frontmatter fence broken into `## module: 3` with the closing `---` deleted, which took 31 test
files down. A file carrying `NOTE:` or bracketed markers is the author's live draft: fix only the
structural breakage, leave every marker untouched, and say what you fixed.

Also check: every module ends with a References section, no leftover `NEED` markers you meant to
fill, and no placeholder cross-references like "module X".

## One central curriculum config

**`mini-courses/curriculum.yaml` is the one place the course shape lives.** Category order and
module order are file order in it, and no number appears in it at all: a module's number is its
position, computed in exactly one place in the app. Reordering the course is moving a line.

- **A module is listed by `name`**, which is its file stem and the source of its URL.
  `title` is required (`rag` is not "RAG & Embeddings" by any rule), `status` defaults to `draft`,
  `minutes` defaults to 0, and `needs` names prerequisites **by name**, so `needs: [prompt_engineering]`
  and the link `[Prompt Engineering](prompt_engineering.md)` share one string a grep can find.
- **A module file's frontmatter is `summary` and `objectives`, and nothing else.** A draft has
  neither, so it has no frontmatter fence at all. Adding `module:` or `status:` back to a file fails
  the build by name: the config owns both.
- **Filenames carry no number.** `2_intermediate/context_engineering.md`, and the URL is
  `/courses/intermediate/context-engineering/`. The directory keeps its own prefix.
- **The H1 is the title alone.** `# Context Engineering`.
- **Prose names another module by title, never by number.** A cross-reference is
  `[Context Engineering](context_engineering.md)`, and a sentence says "Context Engineering covers
  the four levers", not "Module 9 covers".
- **Three things are deleted rather than maintained**, because the app strips all three and two of
  them had already drifted into being wrong: the italic `*Category: … — Module 11 (4 of 7 …)*` dek,
  the `**Previous/Next Module:**` footers, and the `## Modules` lists in the category READMEs. The
  app derives the sequence, the position and the listing from the config.

**Adding a module is three things**: the two markdown files, and one line in the yaml. Nothing else
moves, and `git status --short` will show four paths: the config, the two new files, and the regenerated `src/app/lokum-modules.css`.

**The config is validated, and the validator is worth reading before you fight it.**
`src/lib/content/curriculum-file.ts` refuses seven things `zod` cannot express, each naming the
module at fault: the categories must be in the app's own order, every name must be unique, every
`needs` entry must resolve and must sit earlier in the file, a `ready` module needs minutes above
zero, **the `.md` files on disk in a category and the names listed for it must be the same set,
both directions**, and every module needs a `_tr.md` sibling. That fifth one is the valuable one: a
module you list without writing the file, and a file you write without listing it, are the two ways
this can go wrong while everything else still passes.

## Repo map

```
README.md                GitHub landing page
assets/                  diagram source templates (not published)
mini-courses/            the authored corpus, and all this file governs
  MANIFEST.md            the seven rules, the contract
  ROADMAP.md             the order we intend to build in
  CLAUDE.md / AGENTS.md  this file
  _module_template.md    copy this to start a module
  index.md               site homepage, mirrors README.md
  curriculum.yaml        the course shape: the one place a module's position lives
  1_fundamentals/        rewritten, both languages
  2_intermediate/        being rewritten from scratch
  3_expert/              draft
  4_ecosystem/           draft
  5_protocols_specs/     draft
  6_optional/            draft
  scratchpad/            research notes and diagram prompts, never published
src/ tests/ scripts/     the Next.js app that renders the corpus (not ours)
```

The app is a colleague's work. **Our side of the line is `mini-courses/`**, plus the
README sections that describe the course. Do not edit the app to accommodate the
content; the content is plain markdown and the app reads it as authored.

The notes under `mini-courses/scratchpad/research/` are raw material for facts and sources. Their
dense, citation-heavy style is what the rewrite is replacing, so do not copy it.

## Keeping this file current

**This file and `AGENTS.md` are live documents.** When a conversation settles a new rule, whether
a naming decision, a palette change, or a preference about how something should read, add it here in
the same session, in both files, and keep it short. When a rule here turns out to be wrong,
correct it rather than working around it.
