---
description: >
  Why this project exists. Captures the catalyst and the inception rationale at t=0 — the spark, the
  business problem, the people, and what success was supposed to look like before any code was written.
  Read it when a decision stops making sense and you need to know what the project was originally for.
  NOT here: how it is built (ARCHITECTURE.md), what it must never do (MANIFESTO.md), or anything decided
  after the project started (BRAINSTORM.md).
authority: background
writes: agent, at t=0 — rarely after
status: frozen
covers: "t=0, 2026-07-07"
last_updated: "2026-09-08"
---

# 🌱 GENESIS — Why this project exists

> **Written on 2026-09-08, two months after t=0, and partly reconstructed.** The project began on
> 2026-07-07 with no context harness in place. Sections 2 and 3 are quoted from the author's own
> public document, `mini-courses/MANIFEST.md`, so they are his words and not an agent's guess.
> Sections 1, 4 and 5 are partly inferred and say so. **Anything marked NOT KNOWN needs the author,
> and inventing it would be worse than leaving it.**

---

## 1. The parties

**The author.** Amirkia Rafiei Oskooei, a working AI engineer, writes the corpus by hand. Every module
is his explanation; an agent shapes it into prose but never supplies the substance.

**A colleague** builds and owns the application that renders it. The two halves are deliberately
separated, which is why `ARCHITECTURE.md` opens with that seam.

**The team** publishes as **Lokum AI**, with Intellica and PIA Group named in the site footer. The
public home is `lokumai.github.io/ai-engineering-bazaar`.

**NOT KNOWN:** whether this is a company initiative with an internal audience, a public
marketing-and-recruitment effort, a personal project the company hosts, or some mix. The repository
cannot tell, and the answer changes what "success" means in §4.

---

## 2. The catalyst

In the author's words, from `mini-courses/MANIFEST.md`:

> Most of what we cover is new. Good sources for it barely exist yet, so a lot of what you find online
> is guesswork.
>
> AI tools (LLMs) do not fix that. They were trained before much of this existed, so they go and read
> the same weak articles, then repeat them back to you with confidence. They also miss the story of a
> topic: when it showed up, what it replaced, which idea won. That story is often the thing that makes
> a topic finally make sense.

The project exists because of a gap that a model cannot close. That is the whole argument, and it is
why rule 1 of `MANIFESTO.md` is the one that cannot be traded away: a machine-written version of this
corpus would defeat the reason for building it.

**NOT KNOWN:** the specific moment. Whether a particular bad article, a colleague's question, an
onboarding problem or a customer conversation was the trigger.

---

## 3. The problem, in one page

Someone competent moving into AI engineering in 2026 faces material that is either too old, too
shallow, or confidently wrong, and no map of which ideas replaced which. The author's framing of what
would fix that, again from `MANIFEST.md`:

> The internet already has plenty of AI content. Adding more only makes sense if it is different in a
> way that actually helps you.

The four differences the corpus bets on: a human who has built it in production writes it; it reads
like that person talking; it stays short enough to finish; and it tells you where to go next rather
than trying to be complete.

A second problem, visible in the material itself: the audience is largely not native English
speakers. That is why the language rule is plain English rather than good English, and why every
module has a Turkish sibling.

---

## 4. What success looked like at t=0

**Partly inferred.** The clearest surviving statement of intent is `mini-courses/ROADMAP.md`, which
lists seven phases in two halves, content and platform:

| | | Half |
|---|---|---|
| 1 | Content for Fundamentals and Intermediate | content |
| 2 | The website | platform |
| 3 | A daily newsletter, matched to each reader's job and position | platform |
| 4 | Advanced material | content |
| 5 | Chatbot features over the course content | platform |
| 6 | The remaining material | content |
| 7 | Generative and agentic UI, where the AI decides what the reader sees | platform |

That roadmap opens with a line that reads like the actual success condition:

> a pile of good markdown nobody returns to is a blog.

So: **a reader comes back.** The progress tracking, the role-based paths and the planned newsletter
are all attempts at that one thing.

**NOT KNOWN:** any number. Whether there was ever a target for readers, completions, or return
visits, and whether anything is measured today.

---

## 5. Constraints that existed before any code

**Inferred from the shape of what was built**, not from a record of a decision:

- **Free and ungated.** No payment or account machinery was ever built, and the account layer added
  later deliberately unlocks nothing.
- **Static hosting.** GitHub Pages under a sub-path, which rules out a server at run time and is why
  the reader's progress lives in their browser.
- **Bilingual from early on.** Turkish siblings exist for modules written in the first weeks.
- **One author's voice.** There is no authoring interface and no contributor workflow. The corpus is
  files in a repository, edited by the person who wrote them.

---

## 6. What we deliberately did not do

- **No assessment.** No exams, no scores, no certificates. Completion is the reader's own claim.
- **No gate of any kind.** Nothing is behind a sign-up.
- **No generated content.** See §2 — this is the founding constraint, not a preference.
- **No second platform.** Everything is one repository producing one static site.

---

## What is missing from this file

Three things, and all three need the author rather than the repository:

1. **Who this is for commercially** (§1) — an internal team, the public, or recruitment.
2. **The specific trigger** (§2) — what happened in early July 2026.
3. **Whether success is measured** (§4) — and against what.

An agent should not fill these in. Ask, or leave them.
