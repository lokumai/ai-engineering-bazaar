---
description: >
  The product boundary and the North Star. A short, numbered list of rules that may not be traded away
  for speed, cost or convenience, plus what this product is and is explicitly NOT. Every agent reads it
  before proposing a feature, and code cites its rules by number.
  Written in plain English for a human reader — no jargon, no framework names, no implementation words.
  If a sentence needs the reader to know the stack, it belongs in ARCHITECTURE.md.
  NOT here: how anything is built, why a rule was chosen (that is BRAINSTORM.md), or a roadmap.
authority: law
writes: agent, from what the human decided
status: active
covers: the whole product
last_updated: "2026-09-08"
---

# 📜 MANIFESTO — What we are building, and why

> **Rules 1 to 7 are not new here.** They were written by the author in
> `mini-courses/MANIFEST.md`, which is a public document for readers. This file restates them as the
> boundary an agent may not cross, and adds the working rules 8 to 15 that came out of building it.
> Where the two disagree, `MANIFEST.md` is the one the readers see and the one that wins.

---

## 1. One sentence

A short, human-written course on how modern AI systems are actually built, free to read, in English
and Turkish.

## 2. The North Star

**A reader finishes a module in ten minutes and understands something they could not have got from
searching.** Everything else — the site, the progress tracking, the accounts — exists only to get them
to that and out again. If a feature does not serve that, it is decoration.

## 3. What it does

Thirty-three short modules, ordered from beginner to expert, each five to ten minutes long, each
ending with links out to the real sources. It remembers where a reader got to, in their own browser,
without asking them for anything.

## 4. Who it is for

**People who are new to AI engineering and do not know where to start.** That is the whole target.
Experienced engineers are not stuck and were never the audience: they keep learning regardless. The
reader this is written for has no shortage of material and no way to tell which of it matters.

Three groups, in the order they created the need:

1. **Interns and new joiners** at the author's own company, who currently get a scattered reading
   list instead of a curriculum.
2. **Colleagues in other groups**, so an explanation is written once rather than given in person for
   the third time.
3. **Anyone else with the same problem**, including companies who want their engineers working this
   way and have no roadmap for it.

Much of that audience does not read English as a first language, so the language has to be plain
enough to read at speed in a second one. A Turkish version of every module exists for the same
reason. See `genesis/GENESIS.md` §1 and §2 for where this came from.

## 5. Non-negotiable rules

**Rules 1 to 7 are the author's, from `mini-courses/MANIFEST.md`.**

1. **A human writes it.** Most of what this covers is too new for good sources to exist, so most of
   what is online is guesswork, and a model trained before it existed repeats that guesswork back with
   confidence. A model also cannot tell a reader when an idea appeared, what it replaced, or which
   version won — and that story is often the thing that makes a topic finally make sense. The writing
   comes from working AI engineers, after years of building this in production.
2. **It sounds like a person talking.** Ask an engineer this question in real life and you get a
   straight answer in normal words. That is the register.
3. **It stays simple.** Simple and high level everywhere. A module may cover a lot; no single part of
   it may go deep.
4. **Five to ten minutes a module.** Short on purpose, then links out.
5. **Pictures do a lot of the work.** People want to see, not read. A module with no visual is usually
   unfinished.
6. **Every module points somewhere next.** Written to leave a reader curious rather than full.
7. **Only what matters.** A cheatsheet, not a textbook. Knowing what to leave out comes from building
   things.

**Rules 8 to 15 came out of the work, and each one exists because breaking it cost something.**

8. **Never dense. Being concise is not a goal here.** Plain English and compressed English are not the
   same thing, and compression is the failure mode this project keeps hitting. Loosening a module makes
   it longer, and that is the correct outcome.
9. **Nothing is gated.** No sign-up wall, no paywall, no feature a reader has to register for. An
   account copies progress between devices and unlocks nothing.
10. **A reader's progress is theirs.** It lives in their browser by default, they can download it,
    restore it and erase it, and none of it is required to read anything.
11. **Completion is the reader's own claim.** There is no test, no grade and no assessment. Nobody
    else marks a module done, and a reader can undo it at any time.
12. **Never state a number the project cannot check.** Counts, durations, totals and citations are
    derived from the material, never typed in by hand. A wrong number on a project whose whole premise
    is that machine-written content is unreliable is the one unforgivable defect.
13. **Verify every external claim.** Fetch every link and use its real title. Check the arithmetic in
    a draft rather than passing it through.
14. **English is finished before Turkish starts.** Each module is translated once, from a final
    English text, and the translation mirrors its structure exactly.
15. **Colour is never the only signal.** Anything colour says must also be said by a word, a count or
    a line.

## 6. What this is NOT

- **Not a textbook or a certification.** No exams, no credentials, no completion certificates.
- **Not a blog.** Modules are revised in place and ordered as a curriculum, not published as dated
  posts.
- **Not a machine-written content farm.** This is the whole premise. A module written by summarising
  what is already online would defeat the reason the project exists.
- **Not a course platform.** It hosts one curriculum, its own. There is no authoring UI, no
  multi-tenant catalogue and no instructor role.
- **Not gated, monetised or ad-supported.**
- **Not a place for long prose about the machinery.** The site describes the course; the technical
  detail lives in the repository's own documents.

## 7. Boundaries on scope creep

Three questions kill most proposals:

- **Does it get a reader to a finished module faster, or does it add a thing to learn first?** The
  interface is the thing this project has been worst at, and the fix is always fewer controls rather
  than better-labelled ones.
- **Does it require an account?** If yes, it is the wrong shape. Rebuild it so the account is
  optional.
- **Does it restate something the material already says?** Then it will drift out of step and be
  wrong. Derive it.

**Two standing constraints on how the work is done**, which are not product rules but are absolute:

- The author's own working files are his. Nothing under `mini-courses/scratchpad/` is ours to tidy,
  and copying content out of a file is not permission to remove it.
- The application is a colleague's work. Changes there are for making the corpus render correctly, not
  for accommodating content that could have been written differently.
