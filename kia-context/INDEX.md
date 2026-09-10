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
last_updated: 2026-09-10
---

# 🗺️ INDEX — What each file is, and when to open it

Nine files. **Read this one, then `specs/ARCHITECTURE.md`, then `logs/PROGRESS_2.md`.** That is enough
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
| `DESIGN.md` | The design **language**: tokens for both themes, colour roles, type scale, layout, elevation, shapes, components, and the do-nots | **Deleted and rewritten from scratch 2026-09-09** against the mockups it names in `source:` — `playground/01-theme-T4-ground-G3-powder.html` and its approved dark sibling `01-theme-T4-G3-DARK.html`. Where they disagree the mockup is right and this file is the bug (**D26**). A portable language, not a project specification: no framework class, route, feature or content vocabulary, and **no page layout** — layout belongs to M16, against the mockup for that surface. Held to the mockups mechanically by `tests/unit/design/transcription.test.ts`; the dark palette is a derivation, not a design (**D27**). |

### `kia-context/logs/` — state · written every session

| File | What it holds | State |
|---|---|---|
| `PROGRESS.md` | **Part 1, closed.** M1 to M15, their deliverables and acceptance criteria, the order they go in, and the review pass over M10 to M14 | M1–M6 inferred; **M7 to M15 live and done.** The milestone table at the top still lists every milestone including M16, and points at part 2 for it. |
| `PROGRESS_2.md` | **Part 2, and the ACTIVE part** — a new milestone is appended here. M16: the interface rebuilt on the design language, in ten stages | **All ten stages shipped.** The stage table, every stage's brief, and seven reports — each of which records what its own brief had wrong, so **read a stage's report before trusting its brief**. It closes with the capability ledger: one row per capability, where it lives, and the behavioural test that proves it survived. |
| `BRAINSTORM.md` | D1 to D53, plus open questions O1 to O4 | D1–D6 inferred; **D7–D53 recorded live.** O1, O3 and O4 are closed; **O2 is half closed** — D22 answered the progress vocabulary, and the module info panel's four unnamed rows are still open. Two M16 questions are open in the milestone rather than here: whether a wide figure may bleed past the measure (**D43**) and whether the pager's direction label leaves `on-surface-faint` (**D45**). |

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
| Why was the interface rebuilt rather than re-themed? | `logs/BRAINSTORM.md` **D26**, and `logs/PROGRESS_2.md`'s opening |
| Which mockup specifies this surface, and which part of it? | `logs/PROGRESS_2.md`'s stage table — **geometry from the component mockup, colour from the shell** (**D31**), enforced by `tests/e2e/fidelity.ts` (**D39**) across five reference documents |
| A mockup does not draw the thing I need. What now? | `logs/BRAINSTORM.md` **D30**, and `WITHOUT_REFERENCE` in `tests/e2e/fidelity.ts`, which makes every derivation state what it was derived from |
| Why does a diagram sit on a dark frame that never re-themes? | `logs/BRAINSTORM.md` **D42**, and `specs/DESIGN.md`'s account of what a figure rebinds |
| A test and another test seem to contradict each other. | `logs/BRAINSTORM.md` **D42** — usually the thing belongs at a different layer than either test assumed |
| The retired design document says one thing and the language says another. | `logs/BRAINSTORM.md` **D45** — the language wins, and a measured floor outranks even the mockup exactly once (**D34**) |
| What am I building next? | `logs/PROGRESS_2.md` — the active part of the log |
| Did the rebuild lose a capability? | `logs/PROGRESS_2.md`'s **capability ledger** — one row per capability, where it lives now, and the behavioural test that proves it |
| Why is there a number in the cascade before first paint? | `logs/BRAINSTORM.md` **D46** — CSS cannot count, the pre-paint script can, and that is what lets a dial exist at all |
| Why is this text not in capitals any more? | `logs/BRAINSTORM.md` **D48** — an enumerated record state keeps its spelling; a label, a caption, a sentence or a count does not |
| When does a class move out of a surface stylesheet into the language? | `logs/BRAINSTORM.md` **D51** — when a second surface needs it |
| Where did the `hl-` prefix go, and what still uses it? | `CLAUDE.md`'s M16 section — 0 classes; the `data-hl-*` attributes, the three `<html>` stamps and the storage keys stay, and a guard checks all three |
| Which primitives did M16 add that no mockup transcribes directly? | `specs/DESIGN.md`'s Components — the rail, the dial, the panel, the field, the table and the destructive button, each with what it was derived from |
| Was my idea already rejected? | `logs/BRAINSTORM.md` |
| How is a module written? | **`mini-courses/CLAUDE.md`**, outside this harness. It governs the corpus. |
| Why must a test not pin a word count? | `specs/ARCHITECTURE.md` §11 and `tests/README.md` |

**Two authorities sit outside this harness and outrank it in their own areas:**
`mini-courses/MANIFEST.md` is the public contract for the course content, and
`mini-courses/CLAUDE.md` is the working agreement for writing it.

---

## 6. The numbering, and why it never restarts

`M1…M15` are milestones in `logs/PROGRESS.md` and `M16` is in `logs/PROGRESS_2.md`. `D1…D53` are decisions and `O1…O4` are open questions
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

The heaviest edges, measured with `grep` on 2026-09-10 rather than estimated:

| From | To | Times |
|---|---|---|
| `logs/BRAINSTORM.md` | `specs/DESIGN.md` | 25 |
| `logs/BRAINSTORM.md` | `specs/ARCHITECTURE.md` | 23 |
| `logs/PROGRESS.md` | `specs/ARCHITECTURE.md` | 17 |
| `logs/PROGRESS.md` | `specs/DESIGN.md` | 14 |
| `logs/PROGRESS.md` | `logs/BRAINSTORM.md` | 7 |
| `logs/PROGRESS_2.md` | `specs/DESIGN.md` | 6 |
| `logs/BRAINSTORM.md` | `specs/MANIFESTO.md` | 4 |
| `specs/DESIGN.md` | `logs/BRAINSTORM.md` | 1, in its frontmatter only |

**`PROGRESS_2.md` is the light one, and deliberately.** M16's reasoning went
into `BRAINSTORM.md` as D26 to D53 and its rules into `DESIGN.md`; what part 2
holds is the work and what the work found, which is what a log is for. A stage
report that had to explain a decision would be a decision in two files.

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
