# Working agreement

Rules for any AI assistant working on the course under `mini-courses/`. `AGENTS.md` is an identical
copy: change one, change both. This file is live, see [Keeping this file current](#keeping-this-file-current).

## Read first

`MANIFEST.md`, beside this file, is the contract for everything under `mini-courses/`. Read it before
writing or editing any course content. Its seven rules in short: human-written · sounds like a
person talking · stays simple · five to ten minutes per module · pictures do a lot of the work ·
every module links out · only what matters.

## How we work together

**The author writes, you shape.** Amirkia supplies the explanation, the structure and the
references. Whatever arrives in chat is raw material, not copy: turn it into something written for
the reader, and keep the author's arguments and rhetorical turns.

**Never invent content to fill a gap.** If the draft is missing a fact, a number or a link, mark it
and ask: `<!-- NEED: the figure for X -->`.

**Deliver the literal ask, nothing more**, but correct what is wrong: a broken heading hierarchy,
arithmetic that does not add up, a dead cross-reference, a diagram that misrepresents the mechanism,
a caption that does not match its image. Fix it and say what you changed. Add nothing that was not
asked.

**Write to Amirkia in plain technical English.** Technical terms are welcome; a metaphor standing in
for the mechanism is not. Define a term in the sentence that uses it.

**Never delete a file the author works in.** Copying content out of a file is not permission to
remove it, and approval of a long plan is not approval of every line in it. `scratchpad/` is his to
think in; nothing in it is ours to tidy.

**Stage explicit paths, never a directory**, and read `git status` before every commit: the author
drops in-progress images into the category folders. **Do not commit or push unless asked.**

## Writing rules

- **Public files are written for readers.** No mention of drafts, workflow, AI assistance or
  internal paths.
- **First person:** "me" for the author, "we" for the project. Never a bare "I".
- **No em dashes**, in any language, in modules, captions and working files alike. Use a colon, a
  comma, parentheses, or two sentences.
- **ASD-STE-like English**: one idea per sentence, about 20 words or fewer, active voice, common
  words, one term for one thing, no idioms or buzzwords. Technical terms stay. This is for the English
  only; a translation does not copy its short sentences.
- **Never dense. Being concise is not a goal.** Every sentence is for a beginner, in every language:
  a short sentence that packs several ideas or a run of jargon is the failure, and the fix is a
  longer, plainer sentence. The shapes to watch for: a clause folded back on itself, a fragment used
  as a sentence ("Which means…"), stacked adjectives, one sentence carrying a list, and a run of
  one-clause sentences. Read the paragraph aloud: would someone explaining it say it that way?
  Loosening a module makes it longer, and that is correct.
- **The test is depth, not word count.** A module may cover a lot as long as no single part dives
  into detail. Do not trim a module for its length.
- **Headings are short, familiar, and in title case**, naming the topic the way an engineer would
  search for it: no "X, which does Y". Capitalise every word except a, an, the, and, or, but, of, to,
  in, into, on, at, for, with, from, as, by, vs, and the author's it, is, are, be, don't. The first
  word is always capitalised, and the last unless it is one of the author's ("What Loop Engineering
  is"). Two headings keep their exact text because the app matches them: `## Summary` / `## Özet`
  and `## Where this fits in the series` / `## Bu serinin neresindeyiz` (Persian below).
- **Every module ends with links out** and a References list built only from links used in the text.
- **The References list is grouped by kind**, under `###` headings, each present only when it has an
  item, in this order and with these exact words: `### 📄 Articles` (written posts, papers, docs
  pages that explain a topic), `### 🎬 Videos`, `### 🛠️ Tools` (a product, library or service, by its
  home page or docs landing), `### 🗃️ Repositories` (GitHub or GitLab, awesome-lists included),
  `### 🧭 Modules` (a relative `.md` link). Turkish: `Makaleler`, `Videolar`, `Araçlar`, `Repolar`,
  `Modüller`. Persian: `مقاله‌ها`, `ویدیوها`, `ابزارها`, `Repository‌ها` (with a zero-width
  non-joiner before `ها`), `ماژول‌ها`. An item's kind is the kind of its first link, and it keeps the
  same kind in all three languages. Items keep the author's order inside a group.

## Images and captions

**Images use markdown, never raw HTML.** The image line, two trailing spaces, then the caption in
italics on the next line:

```markdown
![Short title](./images/my-diagram.jpeg)  
*One or two lines saying something the picture cannot say on its own.*
```

The app turns that into a numbered figure, prints the alt text as the figure's label (so give it a
short capitalised title), and rewrites the path. Raw HTML is stripped from the markdown, so a
hand-written `<img>` does not render on the site at all.

A caption note attaches to an image only. A mermaid fence takes its label from the nearest heading,
and an italic line after it stays an ordinary paragraph. Still write that line: it is where the
punchline a mermaid node cannot hold belongs.

## How a module gets written

- **Open by connecting, then name the one idea.** What the previous module established and what this
  one adds. No greetings, no "in this module we will".
- **Figures carry the argument, they never decorate.** Put a figure where the reader needs it. If a
  figure changes what the section should say, restructure the section. A caption says the mechanism,
  the one thing to notice, or the consequence, never the alt text again.
- **Answer the misconception the material just invited**, in one or two sentences (real embeddings
  have hundreds of dimensions; PEFT is not quantization).
- **One analogy per hard idea, then call it back** later in the module. Never stack three.
- **Defer depth with a real link** to the module that owns it. Advanced asides go in a
  `> **NOTE...**` blockquote.
- **Mermaid, never ASCII art.**
- **One code sample, at the rawest useful level**, then the tools that wrap it. Every fence gets a
  language tag; the build requires it. API examples use the OpenAI / OpenRouter-compatible shape,
  with one line saying field names differ slightly between providers.
- **Verify, do not pass through.** Check the arithmetic. Fetch every external link and use its real
  title. A wrong number or a mislabelled source is the one unforgivable defect here.
- **Make an earlier module pay off in a later one**, in a sentence: that is what makes a series.
- **Cut the filler**: no "Keep going 🚀", no "Quiz Yourself", no telling the reader how valuable it is.

## Translating a module

**The author: "WE CARE MORE ABOUT READABILITY AND CLARITY IN OTHER LANGUAGES THAN TO LITERAL
TRANSLATION AND TRUTHFULNESS."** English is written and finished first; each translation is written
once, from the final English.

**Translate the module, not the sentences.** Keep the sections and their order, every figure, code
block, table, link, fact and number. Everything below that is free: merge and reorder sentences, add
the connectives a native speaker uses, replace an English idiom with its meaning or a native one. A
run of short sentences is the failure, and so is a dense line packed with clauses.

- **Check the structure, then read it.** Matching heading, figure and code counts prove nothing was
  dropped, not that the right thing is there: read the opening and the closing of both files.
- **Turkish** is natural, professional Turkish, the register of a good Turkish tech blog, with the
  reader as `sen`. Technical vocabulary stays English with Turkish suffixes (`context'in`,
  `weight'ler`); words Turks say in Turkish stay Turkish (`model`, `veri`, `kod`).
- **Translate a teaching example, keep a data example.** "The capital of Turkey" becomes
  "Türkiye'nin başkenti"; a record of what a model was shown stays in English.

### Persian

A written module may have a Persian sibling, `<name>_fa.md`. Unlike Turkish it is optional, and a
planned module gets none. Everything above holds, plus:

- **Say the meaning, never the phrase.** A calque is grammatical and still wrong: read the English
  paragraph, understand its point, and write how an Iranian engineer would make it.
- **Everyday spoken Persian, written down**: colloquial verbs (`می‌شه`، `می‌تونی`)، `یه`، `رو`، and the
  reader as `تو`. Never formal book Persian.
- **Technical vocabulary stays English, in Latin letters**; a Persian suffix joins it with a
  zero-width non-joiner (`Agent‌ها`). A Persian word for a technical concept takes the English in
  parentheses the first time: `استدلال (reasoning)`.
- **No frontmatter.** **ASCII digits**, Persian punctuation (`،` `؛` `؟`).
- **Four strings the site matches**, spelled exactly: `## کجای این مجموعه هستیم`, `## خلاصه`,
  `## منابع`, and `**بررسی سریع**:` at the start of the quick check line. The callout is `**نکته:**`.
- **Links** to a written module point at its `_fa.md` with its Persian title; a link to a planned
  module stays as in the English.
- **Code blocks and the series map's mermaid stay byte-identical**; other diagrams translate labels
  only, and `node scripts/check-mermaid.mjs <file>_fa.md` must pass. Alt text is translated.

## Visuals

Rule 5 of the manifest: a module without a picture is usually unfinished. In order of cost:

1. **Reuse a figure that already exists**; a figure the reader has seen does double duty.
2. **Draw one with the project templates** (below). Generated images go to the author to run.
3. **Mermaid**, picking the type from the shape of the idea: `flowchart` for a flow,
   `sequenceDiagram` for actors taking turns (most of Fundamentals), `mindmap` for a breakdown,
   `stateDiagram-v2`, `pie`, `quadrantChart`, `erDiagram`, `xychart-beta`. A story over time is a
   `graph TD` with one node per era, never `timeline` (it ignores the site colours and clips).
   `mindmap` keeps its own bright colours on purpose. **No colour literals in mermaid**: only the
   nine hexes the pipeline maps are allowed, so use none.
4. **Search for one**: an image search, an article worth linking, a YouTube video or Short (fetch its
   real title), or a meme that states an argument the prose then unpacks.

Whatever the source, the caption says something the picture cannot, and check what the picture
actually shows before writing about it.

### Figure formats

Decided 2026-11-05 (D87). **A module must read fully in a plain markdown viewer**, so every figure is
a markdown image or a Mermaid fence. No MDX, no raw HTML.

| Use | Format |
| --- | --- |
| Structure: flows, parts, sequences, states | Mermaid |
| An illustration, a drawn scene, an annotated picture | SVG drawn by an agent, by hand or exported from HTML/CSS |
| A photograph, a screenshot, a found image | PNG or JPEG |
| A short loop that needs motion | GIF or animated WebP, kept short |

- **Keep the source** of an agent-drawn figure beside it (the SVG, or the HTML/CSS it came from).
- **One file per language when a figure carries words**: `name.svg`, `name_tr.svg`, `name_fa.svg`.
- **Motion lives inside the file**, and a frozen frame still makes the point.
- **Interactive is only an upgrade**: a sibling the site may swap in (`name.motion.html`); the
  markdown always references the plain image.

### The diagram system

Templates: `assets/empty-context-template.jpeg` (the three columns USER | CONTEXT | LLM, with no
arrows) and `assets/context-style-template.jpeg` (the component style). Ready-made prompts:
`mini-courses/scratchpad/diagrams/three-column-template-prompts.md`.

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

Do not invent colours. Only message boxes get the light scribbled fill. **The arrow rule:** an arrow
means *someone wrote this message*, from the USER or LLM box to one message box; the LLM emits the
Tool Call, the host produces the Tool Result, and nothing is drawn for the context being sent.

**Image-gen prompts** refer to the pasted templates by what they show, never by number, and say what
to draw, never what not to draw. Finished images go in `mini-courses/<category>/images/`; `assets/`
never publishes.

## The course shape: `curriculum.yaml`

**`mini-courses/curriculum.yaml` is the one place the course shape lives.** Category and module order
are file order, and a module's number is its position, computed by the app. Reordering is moving a
line.

- A module is listed by `name` (its file stem and URL), with a required `title`, a `status` (default
  `draft`), `minutes`, and `needs` naming prerequisites by name.
- **A module file's frontmatter is `summary` and `objectives` only**; a draft has none. Adding
  `module:` or `status:` back fails the build.
- **Filenames carry no number**, the H1 is the title alone, and prose names another module by title,
  never by number: `[Context Engineering](context_engineering.md)`.
- The app derives the sequence, so no `*Category: … Module 11*` dek, no Previous/Next footers and no
  `## Modules` lists in category READMEs.
- The build validates the config by name: unique names, prerequisites that sit earlier, minutes above
  zero for a `ready` module, a `_tr.md` for every module, an `_fa.md` only for a listed module, and
  **the files on disk and the names listed for a category must be the same set, both ways**.

**Starting a new module:** copy `_module_template.md` to `<category>/<name>.md` (lowercase,
underscores, no number); create `<name>_tr.md` beside it, even as a stub; add its line to
`curriculum.yaml`; once written, give it a quick quiz. A `status` change regenerates
`src/app/lokum-modules.css`, which goes in the same commit.

**Writing a module For Everyone (D86, D91):** the plain-words version of `<name>.md` is
`<category>/everyone/<name>.md`, with `_tr.md` and `_fa.md` beside it under the translation rules
above. It uses the same name, so it needs no line of its own in `curriculum.yaml`, and a file whose
name is not listed fails the build. Until the file exists, the site shows that module's For Everyone
page as not written yet. Adding one regenerates `src/app/lokum-modules.css`, in the same commit.

## The quick quiz

A written module carries `<name>.quiz.yaml` beside it, shown at the end of the module page. It is
reinforcement, not assessment: nothing is scored or stored.

- **3 to 5 questions**, 4 options each, exactly one correct, and an explanation of one or two short
  sentences shown after answering.
- **Every fact comes from the module text.** ASD-STE-style English. Options of similar length, no
  "all of the above", the correct answer moving between questions.
- **Turkish beside the English under one shared answer index**, and Persian (`fa:`) wherever the
  module has a `_fa.md`. Each side is written in its language, not translated, with only the options'
  order and meaning held to the English.

```yaml
questions:
  - answer: 1          # zero-based index of the correct option, shared by every language
    en: { question: "...", options: ["...", "...", "...", "..."], explain: "..." }
    tr: { question: "...", options: ["...", "...", "...", "..."], explain: "..." }
```

The build validates the shape. **When a module changes, re-read its quiz**: a question about a cut
section is the one thing nothing automated catches.

## README.md and index.md move together

`README.md` and `mini-courses/index.md` are the same page for two audiences. **Change one, update the
other in the same commit.** For `index.md`: drop the "Read online" line, strip the `mini-courses/`
prefix from links, keep `MANIFEST.md` and `ROADMAP.md` links relative, link nothing outside
`mini-courses/` (an unresolvable internal link fails the build), and keep Contributing at the end.
Both describe the course, not the machinery.

## Checks before you call something done

```bash
npm test          # includes the content and internal-link checks
npm run build     # the build that ships
```

- **A green suite is not proof the page is right.** When you change how content is authored, look at
  the export: `grep -rl "my-new-figure" out/courses/`.
- **Never write a test that states a fact about the content** (a word count, a module number, quoted
  prose). `tests/README.md` has the rule.
- **Compare two builds with `scripts/compare-export.sh`, never `diff -r`**: chunk names, build ids and
  payload row numbers differ between identical builds.
- **If the suite fails, run `git status` first.** The author edits these files while you work. A file
  carrying `NOTE:` or bracketed markers is a live draft: fix only structural breakage and leave every
  marker.
- Every module ends with References, no `NEED` markers left that you meant to fill, and no
  placeholder cross-references like "module X".

## Repo map

```
README.md                the GitHub landing page
assets/                  diagram templates (not published)
mini-courses/            the authored course, and all this file governs
  MANIFEST.md            the seven rules
  ROADMAP.md             the order we intend to build in
  CLAUDE.md / AGENTS.md  this file
  _module_template.md    copy this to start a module
  index.md               the GitHub page for mini-courses/, mirrors README.md
  curriculum.yaml        the course shape
  <level>/               modules, their _tr.md and _fa.md, quizzes and images
    everyone/            each module For Everyone, same names, same suffixes
  scratchpad/            research notes and diagram prompts, never published
src/ tests/ scripts/     the website that renders the course (the root CLAUDE.md)
```

The website and the course are both the author's. A colleague builds the mobile reader in its own
repository; a change he proposes here never alters the course or the website unless the author asks
(D90). Do not edit the app to accommodate content: the content is plain markdown and the app reads it
as authored. Notes under `scratchpad/research/` are raw material for facts and sources; do not copy
their dense style.

## Keeping this file current

When a conversation settles a new rule, add it here in the same session, in both files, and keep it
short. When a rule here turns out to be wrong, correct it rather than working around it. Leave out
counts and history: they go stale, and `kia-context/` keeps the history.
