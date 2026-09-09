---
description: >
  The map of the context harness. Says what every folder and file is, what era it covers, and which one
  to open for a given question. Holds no rules of its own — it points at the files that do. Update it
  whenever a context file is added, renamed, moved, split or closed.
  NOT here: any rule, any decision, any technical detail. If something is decided here, it is in the
  wrong file.
authority: map
writes: agent, when files move
status: active
covers: the whole harness
last_updated: "2026-09-09"
---

# 🗺️ INDEX — What each file is, and when to open it

Eight files. **Read this one, then `specs/ARCHITECTURE.md`, then `logs/PROGRESS.md`.** That is enough
to start work.

---

## 1. The project in five lines

**AI Engineering Bazaar** is a short, human-written course on how modern AI systems are actually
built: **33 modules in 5 levels, 19 of them written, every one bilingual in English and Turkish.**
It is free, ungated, and published as a static site at `lokumai.github.io/ai-engineering-bazaar`.

Two halves live in one repository and meet at one file. The **corpus** is markdown under
`mini-courses/`, written by hand by the author. The **application** is a Next.js static export under
`src/`, built by a colleague, which renders it. They share `mini-courses/curriculum.yaml` and nothing
else.

It exists because generating content is now fast and **validating** it is not, so the scarce thing is
a human expert standing behind a claim. It started as an internal need: interns with nowhere to start,
and the same explanation given in person for the third time. See `genesis/GENESIS.md` §1 and §2.

---

## 2. Phases

| Era | What was happening | Where it is recorded |
|---|---|---|
| 2026-07 | The corpus starts as markdown, published with a doc generator | `logs/PROGRESS.md` M1 |
| 2026-08 | The site becomes an application, themed as a drawing set | M2 |
| 2026-09 (early) | Accounts, a rebuilt test suite, one central curriculum config | M3, M4, M5 |
| 2026-09 (mid) | Intermediate and Ecosystem written and translated | M6 |
| **2026-09-08** | **The curriculum reordered, and the interface being replaced** | **M7, M8 — active** |
| **2026-09-08** | **The interface revision planned in six stages, and the design system replaced** | **M9 to M14** |
| **2026-09-08** | **The vocabulary and the palette replaced; the navbar built** | **M9 done, M10 in progress** |
| **2026-09-09** | **The rails swapped, the module list folded, the diagram contained** | **M10 and M11 done** |
| **2026-09-09** | **The catalog's three views, home A with completion control C, and four progress routes folded into one** | **M12, M13 and M14 done — the interface revision is built** |

**The harness itself was installed on 2026-09-08**, 105 commits in. Everything before that date was
reconstructed from git and is labelled as inferred inside each file.

---

## 3. `kia-context/` — the harness

### `kia-context/genesis/` — where this came from · written at t=0, rarely after

| File | What it holds | State |
|---|---|---|
| `SEED.md` | The first prompts | **Not recovered.** The conversations predate the harness by two months. Paste them or delete the file. |
| `GENESIS.md` | Why the project exists, and who it was built for | Filled from the author's own account on 2026-09-08. **One thing still open: whether success is measured.** |

### `kia-context/specs/` — the law · read-only unless explicitly refactoring

| File | What it holds | State |
|---|---|---|
| `MANIFESTO.md` | 15 non-negotiable rules, what this is and is NOT | Rules 1–7 are the author's own, from `mini-courses/MANIFEST.md`. Rules 8–15 came out of the work. |
| `ARCHITECTURE.md` | The six rules, the domain, the two lifecycles, what the system refuses, the record, accounts, the build, deployment, the vocabulary | Current as of 2026-09-09. **The only architecture document**: the root `ARCHITECTURE.md` was folded into it and deleted (D11). 706 lines, sections 1 to 12; read the six rules, then §2, §3 and §9. |
| `DESIGN.md` | The design **language**: tokens, colour roles, type scale, layout, elevation, shapes, components, and the do-nots | **Deleted and rewritten from scratch 2026-09-09** against the mockup it now names in `source:` — `playground/01-theme-T4-ground-G3-powder.html`. Where the two disagree the mockup is right and this file is the bug (**D26**). It is a portable language, not a project specification: no framework class, route, feature or content vocabulary, and **no page layout** — layout belongs to M16, against the mockup for that surface. Transcription verified: all 30 of the mockup's hex values present, none invented. The version written for M9 was deleted, not superseded, on the author's instruction. |

### `kia-context/logs/` — state · written every session

| File | What it holds | State |
|---|---|---|
| `PROGRESS.md` | M1 to M14, their deliverables and acceptance criteria, and the order they go in | M1–M6 inferred; **M7 to M14 live.** **M9 to M14 are all done**, so M8's six stages are built and what is left on M8 is its own umbrella criteria and M7's last checkbox. |
| `BRAINSTORM.md` | D1 to D24, plus open questions O1 to O4 | D1–D6 inferred; **D7–D24 recorded live.** O1, O3 and O4 are closed; **O2 is half closed** — D22 answered the progress vocabulary, and the module info panel's four unnamed rows are still open. |

---

## 4. `docs/` — human-facing artifacts

`docs/` exists in this repository and holds `data-flow.md`, `auth-flow.md` and `manager-queries.md`,
written by the colleague who built the application. **They are not part of this harness**, are not
maintained by an agent, and do not need reading to do the work. The root `CLAUDE.md` links them.

**They were deliberately left untouched during this initialisation**, at the author's instruction.

---

## 5. Which file answers which question

| Question | File |
|---|---|
| What is this project for? | `genesis/GENESIS.md` |
| What may I never do? | `specs/MANIFESTO.md` |
| What is a module, and what does `status: draft` actually change? | `specs/ARCHITECTURE.md` §2, §3 |
| What will the build refuse? | `specs/ARCHITECTURE.md` §4 |
| Where does a reader's progress live? | `specs/ARCHITECTURE.md` §5 |
| Why is that word so strange? | `specs/ARCHITECTURE.md` §9 — and note it has TWO columns now: what the code says, and what a reader sees |
| What colour is a level, exactly? | `specs/DESIGN.md`, Colors — the language names a five-hue **categorical series**; which level takes which hue is the product's binding, not the language's |
| Why is the tick a disc and not a check mark? | `specs/DESIGN.md`, Colors |
| Why is code dark in the light theme? | `specs/DESIGN.md`, Colors, and `logs/BRAINSTORM.md` **D21** |
| Why does a wide diagram scroll instead of spilling over the rails? | `logs/BRAINSTORM.md` **D10**, and `specs/DESIGN.md`'s Layout |
| A browser test passes alone and fails under load. Where do I start? | `logs/BRAINSTORM.md` **D20** |
| Which ground did we pick, and what did it break? | `logs/BRAINSTORM.md` **O4** |
| Which border token do I use? | `specs/DESIGN.md`, Colors — it depends on whether the border groups or identifies |
| Why does the catalog have three views, and how is one of them chosen? | `logs/BRAINSTORM.md` **D13**, and `logs/PROGRESS.md` M12 |
| Where did XP and Rank go? | `logs/BRAINSTORM.md` **D22**, and `specs/ARCHITECTURE.md` §9 |
| Why is completion control C a meter and not the ring the mock drew? | `logs/BRAINSTORM.md` **D23** |
| An old bookmark to `/dashboard/`. What happens? | `logs/BRAINSTORM.md` **D24**, and `specs/ARCHITECTURE.md` §7 |
| What am I building next? | `logs/PROGRESS.md` — the active milestone |
| Was my idea already rejected? | `logs/BRAINSTORM.md` |
| How is a module written? | **`mini-courses/CLAUDE.md`**, outside this harness. It governs the corpus. |
| Why must a test not pin a word count? | `specs/ARCHITECTURE.md` §11 and `tests/README.md` |

**Two authorities sit outside this harness and outrank it in their own areas:**
`mini-courses/MANIFEST.md` is the public contract for the course content, and
`mini-courses/CLAUDE.md` is the working agreement for writing it.

---

## 6. The numbering, and why it never restarts

`M1…M14` are milestones in `logs/PROGRESS.md`. `D1…D24` are decisions and `O1…O4` are open questions
in `logs/BRAINSTORM.md`, of which O1, O3 and O4 are closed and O2 is half closed. Rules `1…15` are in
`specs/MANIFESTO.md`.

**M8 did not become M9.** It stayed open as the umbrella for the whole interface revision and M9 to
M14 are its stages, because its acceptance criteria are about the site as a whole rather than about
any one screen.

**Numbers are permanent.** They are cited across files and from code comments. Append; strike through
rather than delete; never renumber.

Note that code comments in `src/` also carry `§n.n` citations — `§12.2`, `§4.4`, `§13.1.1` — which
refer to a **design specification that is not in this repository.** They are not kiacontext numbers
and cannot be followed. `specs/ARCHITECTURE.md` §9 says so.

---

## 7. What references what

Measured on 2026-09-08, and again after M9–M14 were written, by counting each filename's mentions in
every other file.

```
                       ┌──────────────────┐
                       │     INDEX.md     │  points at all seven
                       └────────┬─────────┘
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   genesis/               specs/                    logs/
   SEED ──► GENESIS       MANIFESTO ──┐         PROGRESS ──┐
              │               │       │              │     │
              └──────────────►│       └──────────────►│     │
                              ▼                      ▼     ▼
                        ARCHITECTURE ◄──────── BRAINSTORM  │
                              ▲                      ▲     │
                        DESIGN┘                      └─────┘
```

The three heaviest edges, by count:

| From | To | Times |
|---|---|---|
| `logs/BRAINSTORM.md` | `specs/ARCHITECTURE.md` | 19 |
| `logs/PROGRESS.md` | `specs/ARCHITECTURE.md` | 12 |
| `specs/DESIGN.md` | `logs/BRAINSTORM.md` | 1, in its frontmatter only |
| `logs/BRAINSTORM.md` | `specs/MANIFESTO.md` | 5 |

The sketch above no longer draws an edge it used to: **`specs/DESIGN.md`'s body now cites nothing in
this repository — zero references to any `kia-context/` path** — and its one mention of
`logs/BRAINSTORM.md` is in its frontmatter, saying what does not belong in the file. That is the
point of it rather than an omission: as of **D26** the design document is a portable *language*, and
a language that cites this project's decision log cannot be adopted by another project. It points
outward instead, at the mockup named in its `source:` field, which outranks it.

**`ARCHITECTURE.md` is the hub**, which is the shape you want: the logs explain why the blueprint says
what it says, and the blueprint never explains itself.

`specs/MANIFESTO.md` and `genesis/GENESIS.md` both point at `mini-courses/MANIFEST.md` — three times
each — because the author's own public document is the source of the founding rules and neither file
copies them without saying where they came from.
