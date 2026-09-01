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
- **The test is depth, not word count.** Every part must stay simple and high-level; a module
  that covers a lot is fine as long as no single part dives into detail. Do not trim a module,
  or flag it as too long, just because the total word count is above some number. Going deep
  is what breaks the rule, not going wide.
- **Every module ends with links out** and a short References list built from the links actually
  used in the text.
- **Keep the author's rhetorical turns.** Trim repetition and self-praise; keep the arguments and
  the punchy phrasings.

**Images use HTML, not markdown**, so the width can be controlled. Roughly 70% of full size,
centred, caption inside the same block:

```html
<p align="center">
  <img src="./images/my-diagram.jpeg" alt="short description" width="70%"><br>
  <em>One or two lines saying something the picture cannot say on its own.</em>
</p>
```

Use the `width` attribute rather than inline `style`, because GitHub strips `style` when it
renders markdown.


## Two files that move together

`README.md` (GitHub) and `mini-courses/index.md` (published site) are the same page for two
audiences. **Change one, update the other in the same commit.** The transform from README to
index:

- drop the "Read online" line, since it is self-referential on the site
- strip the `mini-courses/` prefix from link paths, since `index.md` lives inside it
- keep the `MANIFEST.md` and `ROADMAP.md` links relative in both, since both files sit inside
  `mini-courses/`
- keep the Contributing section at the end of `index.md`

## Language

Modules are written and finalized in **English first**. The Turkish `*_tr.md` files are
translated only once the English is final, so each module is translated once.

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

Copy `mini-courses/_module_template.md`. It carries the required YAML frontmatter with every
field explained, and an annotated body showing every structure the renderer understands:
figures, mermaid, tables, tagged code, cross-references, the optional Quick Check and
checklist, and the sequence link the app strips. It is never loaded as a module itself,
because the loader only reads the six category directories.

## Checks before you call something done

```bash
npm test          # vitest, includes the content and internal-link checks
npm run build     # the Next.js build that ships
```

CI runs `npm run typecheck`, `npm test`, `npm run build` and the Playwright suite. The content
checks live in `src/lib/content/`, so a broken cross-reference in a module fails `npm test`.

Also check: no leftover `NEED` markers you meant to fill, and no placeholder
cross-references like "module X".

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
  1_fundamentals/        modules 1-7   (improved in place)
  2_intermediate/        modules 8-15  (being rewritten from scratch)
  3_expert/              modules 16-24 (draft)
  4_ecosystem/           modules 25-29 (draft)
  5_protocols_specs/     module 30     (draft)
  6_optional/            modules 31-32 (draft)
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
