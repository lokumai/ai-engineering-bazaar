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

> **Written on 2026-09-08, two months after t=0.** The project began on 2026-07-07 with no context
> harness in place, so this was assembled afterwards: §2 and §3 from the author's account given on
> 2026-09-08 plus his own public document `mini-courses/MANIFEST.md`, and §5 inferred from the shape
> of what was built. One thing remains unanswered and §7 says which.

---

## 1. The parties

**The author.** Amirkia Rafiei Oskooei, a working AI engineer, writes the corpus by hand. Every module
is his explanation; an agent shapes it into prose but never supplies the substance.

**A colleague** builds and owns the application that renders it. The two halves are deliberately
separated, which is why `ARCHITECTURE.md` opens with that seam.

**The team** publishes as **Lokum AI**, with Intellica and PIA Group named in the site footer. The
public home is `lokumai.github.io/ai-engineering-bazaar`.

**Three audiences, and the first two are why it started:**

1. **Interns and new joiners inside the company.** They arrive wanting to learn AI engineering and
   there is no consolidated curriculum to teach them from. Everything is scattered.
2. **Other groups inside the company**, who come to this team for consultancy and to learn from it.
   Transferring that knowledge person by person is very time-consuming.
3. **Everyone else**, because the same gap exists outside. Many companies, this one included, want to
   turn their engineers into AI-powered engineers, and there is no clear roadmap for doing it.

The corpus is public, but it was born of an internal need. That order matters: it is a curriculum
first and a publication second.

---

## 2. The catalyst

The field moves faster than anyone documents it. Topics and trends arrive quickly, and the expertise
that goes with them is not written down anywhere:

- **There are not enough books.** The material is too new for them.
- **Many of the sources that do exist are wrong.** Medium articles, LinkedIn posts, YouTube videos.
- **A great deal of it only exists in the heads of experienced AI engineers**, and has never been
  written anywhere at all.
- **Even the written material needs work** before it is usable: correcting, filtering and collecting.

Then the observation the whole project rests on, in the author's framing:

> In the age of AI, generating and producing content is very fast. But real value is not produced as
> fast as content is generated. It is produced as fast as human experts can **validate** it.

That is the bottleneck. Generation is cheap and getting cheaper; verification is not, and it is the
part that cannot be automated away. A corpus whose entire value is that a human expert stands behind
every claim is a bet on the scarce half.

**And nobody is doing it, because it is the boring half.** Top-tier engineers mostly do not care about
this problem: they keep learning and improving regardless, and they were never the ones stuck. The
people who are stuck are new to AI engineering, and their problem is not access to material. It is
that they do not know where to start, or which of the thousand things in front of them actually
matter.

The founding decision, in the author's words:

> One day we decided to take a deep breath, and do what many are too lazy to do: convert
> human-verified real expertise into this coursework.

**The catalyst was not one event.** It was the same need turning up everywhere at once: interns with
nowhere to start, colleagues asking for the same explanation a second and third time, and no roadmap
for a company that wants its engineers to work this way.

---

## 3. The problem, in one page

Someone competent moving into AI engineering in 2026 faces material that is too old, too shallow, or
confidently wrong, with no map of which ideas replaced which. `MANIFEST.md` puts the consequence
plainly:

> The internet already has plenty of AI content. Adding more only makes sense if it is different in a
> way that actually helps you.

And on why a model cannot close this gap, which is rule 1 of `MANIFESTO.md`:

> AI tools (LLMs) do not fix that. They were trained before much of this existed, so they go and read
> the same weak articles, then repeat them back to you with confidence. They also miss the story of a
> topic: when it showed up, what it replaced, which idea won. That story is often the thing that
> makes a topic finally make sense.

**The second half of the problem is that most attempts at solving it are unreadable.** Consolidated
curricula exist and people hate reading them. So the form matters as much as the content: short
modules, a person's voice rather than a textbook's, pictures doing real work, and an honest link out
instead of a pretence of completeness. Those are rules 2 to 7 of `MANIFESTO.md`, and they are why this
is not simply a wiki of what the team knows.

A third constraint, visible in the material itself: much of the audience does not read English as a
first language. That is why the rule is plain English rather than good English, and why every module
has a Turkish sibling.

---

## 4. What success looked like at t=0

The clearest surviving statement of intent is `mini-courses/ROADMAP.md`, which lists seven phases in
two halves, content and platform:

| | | Half |
|---|---|---|
| 1 | Content for Fundamentals and Intermediate | content |
| 2 | The website | platform |
| 3 | A daily newsletter, matched to each reader's job and position | platform |
| 4 | Advanced material | content |
| 5 | Chatbot features over the course content | platform |
| 6 | The remaining material | content |
| 7 | Generative and agentic UI, where the AI decides what the reader sees | platform |

That roadmap opens with a line that reads like the real success condition:

> a pile of good markdown nobody returns to is a blog.

So: **a reader comes back.** The progress tracking, the role-based paths and the planned newsletter
all exist for that one thing.

From §1, three concrete outcomes it was meant to produce:

- an intern can be pointed at one place instead of a scattered reading list;
- an explanation is written once instead of given three times in person;
- a company has a roadmap for making its engineers work this way.

---

## 5. Constraints that existed before any code

**Inferred from the shape of what was built**, not from a record of a decision:

- **Free and ungated.** No payment or account machinery was ever built, and the account layer added
  later deliberately unlocks nothing. This follows from §1: a curriculum for your own interns has no
  reason to have a paywall.
- **Static hosting.** GitHub Pages under a sub-path, which rules out a server at run time and is why
  the reader's progress lives in their browser.
- **Bilingual from early on.** Turkish siblings exist for modules written in the first weeks.
- **One author's voice.** There is no authoring interface and no contributor workflow. The corpus is
  files in a repository, edited by the person who wrote them. Given §2, that is the point rather than
  a limitation: the value is that one accountable expert validated every claim.

---

## 6. What we deliberately did not do

- **No assessment.** No exams, no scores, no certificates. Completion is the reader's own claim.
- **No gate of any kind.** Nothing is behind a sign-up.
- **No generated content.** See §2 — this is the founding constraint, not a preference. A generated
  version of this corpus would be exactly the thing the project exists to correct.
- **No second platform.** Everything is one repository producing one static site.
- **No attempt at completeness.** A cheatsheet, not a textbook. Knowing what to leave out is part of
  the expertise being transferred.

---

## 7. What is still missing from this file

One thing, and it needs the author rather than the repository:

**Is success measured, and against what?** §4 records the intent — *a reader comes back* — and the
three internal outcomes in §1, but nothing in the repository measures any of them, and no target was
ever stated. Whether that is deliberate or simply not built yet is unknown.

An agent should not fill this in. Ask, or leave it.
