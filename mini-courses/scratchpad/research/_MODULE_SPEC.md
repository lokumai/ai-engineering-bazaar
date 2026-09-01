# Phase 2 — Module writing specification

Read this in full before writing. Every module in `2_intermediate/` must follow it so the seven
read as one course rather than seven essays.

## What you are doing

Turning a research dossier into a finished lesson. The dossier is 600–1800 lines; the module is
**200–300 lines**. You are not summarising the dossier — you are teaching from it. Most of what
you researched will not appear, and that is correct.

## Audience

Working software engineers. They can already code. They have finished Fundamentals (LLMs,
training, RAG, tools, memory, agents, multi-agent) and know what an agent loop is. They are new
to *building with* agent tooling. They are reading this to get better at their day job.

The repo's mission: make the classic SDLC — requirements → design → implement → test → review →
deploy → operate — AI-powered. Every module should leave the reader able to do something on
Monday that they could not do on Friday.

## House style

Read `mini-courses/1_fundamentals/6_agents.md` first and match it:

- **Friendly second person.** "You'll see…", "Let's break it down". Warm, not chatty.
- **Short sections** under `##` Roman-numeral headings (`## I.`, `## II.`), with `###` subsections.
- **Comparison tables** wherever there is a choice to make. Tables beat paragraphs for decisions.
- **Short runnable code snippets.** Real, correct, copy-pasteable. Note the SDK/version.
- **Mermaid diagrams** for anything with a shape. Rendered via `pymdownx.superfences`, so use a
  plain ` ```mermaid ` fence.
- **A concrete worked example** per module — something the reader can picture.
- Bold the term being defined the first time it appears.

Avoid: filler intros, "in today's fast-paced world", restating the heading as the first sentence,
exhaustive lists where three good examples would land better.

## Required structure

```markdown
# Module N: Title

*Category: Intermediate — Module N (X of 7 in this category)*

<Two or three sentences. Say what problem this module solves and why it matters now.
No preamble about what the module "will cover".>

## I. <first section>
...
## VI. <last section>

## Mermaid Diagram: <what it shows>
```mermaid
...
```

## Tutorial Progress
<COPY THE EXISTING BLOCK FROM THE STUB EXACTLY — including every style fill line.
Do not edit it. It encodes this module's position in the sequence.>

## Summary
<3–5 sentences. What they now know, and the one thing to remember.>

**Quick Check**: <one question that tests understanding, not recall>

## References & Further Reading
<see below>

**Previous Module:** [...](...)
**Next Module:** [...](...)
```

The `Tutorial Progress` block and the `Previous`/`Next` links already exist in the stub file.
**Preserve them byte-for-byte.** They are the navigation spine of the course.

## References & Further Reading — the hard requirement

The repo owner's rule: *these topics are mostly less than a year old, so the reader must be able
to go check for themselves.*

- Take them from your dossier's `## References for the module` section. **8–15 links.**
- Only links your dossier verified. If a link is marked `[LINK-UNVERIFIED]` or blocked, **leave it
  out** — do not publish it with a caveat.
- Format each as: `- [Title](url) — Publisher, YYYY-MM-DD. One line on what the reader gets.`
- Group under `###` subheadings if that helps (e.g. "Official docs", "Papers", "Going deeper").
- Prefer the canonical URL. Several docs sites moved recently; your dossier records the new forms.

**Also cite inline** where a specific number, quote, or claim carries weight — same format as the
dossier, `([Title, YYYY-MM-DD](url))`. Not on every sentence; on the load-bearing ones.

## Accuracy rules — non-negotiable

1. **Write only what your dossier verified.** If you find yourself reaching for a fact that is not
   in the dossier, either leave it out or mark the gap — do **not** fill it from memory. These
   topics changed within the last twelve months and your training data is not a source.
2. **Never invent an identifier.** API names, frontmatter fields, config keys, CLI flags, model
   IDs, CVE numbers, arXiv IDs, OWASP codes, package names — all come from the dossier.
3. **Honour the dossier's corrections and `[UNVERIFIED]` marks.** Several dossiers explicitly
   correct an earlier claim or say "do not publish this figure". Obey those.
4. **Do not promise coverage you do not have.** If the dossier only researched one tool, do not
   imply the module covers all of them.
5. Prefer a shorter, certain module over a longer, hedged one.

## Shared editorial decisions (already settled — do not relitigate)

- **Module boundary line.** 11 = the mechanism of the wrapper · 12 = the adversary, testing,
  defense · 13 = orchestration and measurement · 16 = architecture inside a single step ·
  19 = protocols between agents · 22 = scale. Where your topic touches a neighbour, give it one
  sentence and a forward reference — `(covered in Module 16)` — rather than a section.
- **Rubric scales (Module 13).** Present binary/checklist-first as an *opinionated engineering
  stance with stated reasons*, explicitly noting there is no head-to-head reliability study.
- **Module 9.** Drop the "95% auto-compact" figure and the grep-vs-embeddings anecdote. Stay
  CLI-first; at most one API snippet. Do **not** claim Codex/Cursor parity — that was never
  researched.
- **Module 14.** Publish only the three verified projects. The candidate alternatives
  (OpenHands, Goose, Letta, Khoj, …) were never verified — leave them out entirely. Name no
  owner for Moltbook; its attribution is genuinely disputed.
- **Verifiers over judges.** Where a module touches evaluation, the house position is that for
  code, deterministic verifiers — tests, type checkers, linters, CI — beat LLM judges wherever
  one exists. This is citable, not opinion.

## Cross-references between modules

Link generously; this is a course, not a set of articles. Use relative paths that work on both
GitHub and the MkDocs site: `[Module 12: Security](12_security.md)`,
`[Module 6: AI Agents](../1_fundamentals/6_agents.md)`.

## What NOT to touch

- Do not edit any `_tr.md` file. Turkish translations are a separate, later pass.
- Do not edit `mkdocs.yml`, `README.md`, or any other module's file.
- Do not edit files in `scratchpad/research/` — they are your input, not your output.
- Write **only** your one module file.

## Definition of done

- 200–300 lines.
- Structure above, with the stub's Tutorial Progress block and Prev/Next links preserved.
- At least one table, one mermaid diagram, one code snippet, one worked example.
- A Quick Check that requires thought.
- 8–15 verified references, correctly formatted.
- Every identifier traceable to the dossier.
- Reads like the same author wrote `6_agents.md`.
