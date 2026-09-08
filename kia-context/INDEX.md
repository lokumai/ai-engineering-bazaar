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
last_updated: "2026-09-08"
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
| **2026-09-08** | **The interface revision planned in six stages, and the design system replaced** | **M9 to M14 — M9 ready to build** |

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
| `ARCHITECTURE.md` | The six rules, the domain, the two lifecycles, what the system refuses, the record, accounts, the build, deployment, the vocabulary | Current as of 2026-09-08. **The only architecture document**: the root `ARCHITECTURE.md` was folded into it and deleted (D11). 607 lines, sections 1 to 12; read the six rules, then §2, §3 and §9. |
| `DESIGN.md` | The design system: tokens, colour roles, type scale, layout, components, and the do-nots | **Rewritten 2026-09-08** around the chosen theme, and complete: the ground is **G3 `#FDFBF7`**. The old "Hidden Line" drawing-set system was deleted, not kept alongside. |

### `kia-context/logs/` — state · written every session

| File | What it holds | State |
|---|---|---|
| `PROGRESS.md` | M1 to M14, their deliverables and acceptance criteria, and the order they go in | M1–M6 inferred; **M7 to M14 live.** M8 is the umbrella for the interface revision and **M9 is ready, waiting only on approval to build.** |
| `BRAINSTORM.md` | D1 to D15, plus open questions O1 to O4 | D1–D6 inferred; **D7–D15 recorded live.** O1, O3 and O4 are closed; **O2 is the only one open.** |

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
| Why is that word so strange? | `specs/ARCHITECTURE.md` §9 |
| What colour is a level, exactly? | `specs/DESIGN.md` |
| Why is the tick a disc and not a check mark? | `specs/DESIGN.md`, Colors |
| Which ground did we pick, and what did it break? | `logs/BRAINSTORM.md` **O4** |
| Which border token do I use? | `specs/DESIGN.md`, Colors — it depends on whether the border groups or identifies |
| What am I building next? | `logs/PROGRESS.md` — the active milestone |
| Was my idea already rejected? | `logs/BRAINSTORM.md` |
| How is a module written? | **`mini-courses/CLAUDE.md`**, outside this harness. It governs the corpus. |
| Why must a test not pin a word count? | `specs/ARCHITECTURE.md` §11 and `tests/README.md` |

**Two authorities sit outside this harness and outrank it in their own areas:**
`mini-courses/MANIFEST.md` is the public contract for the course content, and
`mini-courses/CLAUDE.md` is the working agreement for writing it.

---

## 6. The numbering, and why it never restarts

`M1…M14` are milestones in `logs/PROGRESS.md`. `D1…D15` are decisions and `O1…O4` are open questions
in `logs/BRAINSTORM.md`, of which O1, O3 and O4 are closed. Rules `1…15` are in `specs/MANIFESTO.md`.

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
| `specs/DESIGN.md` | `logs/BRAINSTORM.md` | 6 |
| `logs/BRAINSTORM.md` | `specs/MANIFESTO.md` | 5 |

The sketch above does not draw one edge that now matters: **`specs/DESIGN.md` points at
`logs/BRAINSTORM.md` six times**, because the design system cites the decision behind each value
rather than restating it.

**`ARCHITECTURE.md` is the hub**, which is the shape you want: the logs explain why the blueprint says
what it says, and the blueprint never explains itself.

`specs/MANIFESTO.md` and `genesis/GENESIS.md` both point at `mini-courses/MANIFEST.md` — three times
each — because the author's own public document is the source of the founding rules and neither file
copies them without saying where they came from.
