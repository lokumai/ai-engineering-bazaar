# AI Engineering Bazaar 🏪

AI Engineering made simple, short, and useful.

📖 **Read online:** [lokumai.github.io/ai-engineering-bazaar](https://lokumai.github.io/ai-engineering-bazaar/)

A series of mini-courses from beginner to advanced to help you learn practical topics in modern AI engineering. Each course is short, easy to understand, and includes real-world examples, clear visuals, and extra reading materials. It is the fastest way to master what you actually need on the job.

## Why This Is Valuable

The internet already has plenty of AI content. Adding more only makes sense if it is different in a way that actually helps you. These seven rules are that difference. They are not writing preferences, they are the reason this is worth your time.

1. **A human writes it.** Most of what we cover is new, so good sources barely exist and a lot of what you find online is guesswork. AI tools were trained before much of it existed, so they read those same weak articles and repeat them back with confidence. This comes from a working AI engineer, after years of building it in production.
2. **It sounds like a person talking.** Ask an engineer this question in real life and you get a straight answer, in normal words. That is how it is written here.
3. **It stays simple.** Plain language, no jargon, no buzzwords. Sometimes we oversimplify on purpose. Easy to read even if English is not your first language.
4. **Five to ten minutes per module.** If you ever feel the need to paste one of these pages into ChatGPT and ask for a summary, we failed.
5. **Pictures do a lot of the work.** A picture is worth a thousand words, so expect diagrams, charts, simple sketches, and now and then a meme.
6. **Every module points you somewhere next.** Each topic is kept short on purpose, then links out to more. In the world of Reels and TikTok, attention is short and nobody pushes through something just because they were told to read it, and people only really learn what they wanted to learn. So a page is written to leave you curious instead of full, and the links are there for the moment you want more.
7. **We only cover what matters.** A cheatsheet for AI engineering, not a textbook. Knowing what to leave out comes from building things, not from searching.

📜 Full version: **[MANIFEST.md](MANIFEST.md)**

## Structure


| Category                                                              | Modules | Description                                                                                                               |
| --------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| [Fundamentals](mini-courses/1_fundamentals/README.md)                     | 1-7     | LLMs, training, RAG, tools, memory, agents, multi-agent systems.**Start here.**                                           |
| [Intermediate](mini-courses/2_intermediate/README.md)                     | 8-15    | Prompt engineering, context engineering, coding agents, harness engineering, security, loop engineering, personal agents. |
| [NOT READY] [Expert](mini-courses/3_expert/README.md)                     | 16-24   | Advanced UI, architectures, tools, memory, multi-agent, prompting, context engineering, harness engineering, deployment.  |
| [NOT READY] [Ecosystem](mini-courses/4_ecosystem/README.md)               | 25-29   | Agent frameworks, inference providers, inference engines, UI design, observability.                                       |
| [NOT READY] [Protocols & Specs](mini-courses/5_protocols_specs/README.md) | 30      | A single reference of every protocol and spec mentioned across the series.                                                |
| [NOT READY] [Optional](mini-courses/6_optional/README.md)                 | 31-32   | Human-in-the-loop and runtime topics that round out the series.                                                           |




### How to Use

1. Start with [Fundamentals](mini-courses/1_fundamentals/README.md) to learn must-know concepts in AI Engineering.
2. Move on to [Intermediate](mini-courses/2_intermediate/README.md) to build your core skills.
3. Jump to [Ecosystem](mini-courses/4_ecosystem/README.md) to learn the tools and frameworks needed to become a well-rounded AI engineer.

🎉 Congrats! You are now an **AI engineer**. You can now build your own AI agents and systems.

1. ⚜️ [ADVANCED] ⚜️ If you want to become a rare, highly-skilled AI engineer, take the [Expert](mini-courses/3_expert/README.md) course to learn advanced topics.

## The repository

The courses are plain markdown in `mini-courses/`, and nothing else in this repository
ever edits them — every transformation happens at build time. Everything at the
repository root is the Next.js application that reads them:

| Path | What it is |
| --- | --- |
| `mini-courses/` | The courses. Plain markdown with YAML frontmatter, read-only to the build |
| `src/` | The application — `app/` routes, `components/`, and `lib/` (content pipeline, learner record, learning paths, identity) |
| `tests/` | `unit/` (Vitest), `corpus/` (the same checks against all 32 real modules), `e2e/` (Playwright, real Chrome) |
| `scripts/` | `copy-course-images.mjs` (runs as `prebuild`), `serve-static.mjs` (serves `out/` for the e2e suite) |

`npm run build` produces a static export in `out/`, which
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publishes to GitHub Pages
as the whole site.

**The course cross-references are rewritten at build time.** A module that links to
another with a relative markdown path — `[Module 13](13_security.md)` — has that href
turned into the real route by `src/lib/content/links.ts`. An internal `.md` link the
corpus cannot answer for **fails the build**, naming the file and the href, so a broken
cross-reference cannot reach the published site.

## Your record lives in your browser

The site keeps a learner record — which sheets you have signed off, your answers
to the quick checks, the primary sources you opened, the checklists you ran, and
the GitHub repositories you register against each module. All of it is in
`localStorage` on your own device. There are no accounts, no server and no
network calls at runtime, and none of it is ever sent anywhere.

| Screen | What it is |
| --- | --- |
| A module sheet | Sign-off, the quick check, the checklist, and the submittal register |
| `/dashboard/` | The whole set as a single-line dependency diagram, with the readout, the uptime strip and the stamp shelf |
| `/profile/` | Your name, your drafter's mark, your role, your submittals, storage health, and export / import / erase |
| `/path/` | An ordered route through the set for your role — which sheet to take next, and why that role reads it |
| `/report/` | The `RECORD OF WORK` — one self-contained HTML file you keep |
| `/legend/` | Sheet 00: what the line types mean, and what this site deliberately does not have |

**Browser storage can be cleared without warning** — by you, by the browser, or
by a private window, and Safari deletes it after seven days without a visit. So
**export is a real feature, not a convenience**: `/profile/` writes your whole
record to a JSON file, and the `RECORD OF WORK` embeds its own copy, so the
document you keep is also the backup you can import into another browser.

### A role, and the path that comes with it

Tell `/profile/` what you do — **software engineer, DevOps, data engineer, data
analyst, business analyst, QA, project manager, DBA or pre-sales** — and `/path/`
draws an ordered route through the set for it. Each step names the sheet, what
that role gets from it, and whether the sheet is written yet.

Two things about those routes are worth knowing, because they are what makes
them worth reading:

- **Every reason is grounded in the sheet it points at.** They were written by
  reading the 32 sheets, then audited against the files by readers who had not
  written them — which caught seven real problems, including a claim about
  retrieval-correctness content that does not exist in the corpus and a route
  that promised vector-store operations no sheet covers. The quotation behind
  each reason is kept in `tests/fixtures/path-evidence.json`, and a test
  checks all 123 of them against the source files on every run.
- **17 of the 32 sheets are not written yet.** A route may point at one, because
  a roadmap that stops at the edge of today's content is a worse roadmap — but
  such a step says `NOT DRAWN`, links to nothing, and is **excluded from the
  count**. A route with 12 written sheets and 2 planned ones reports `n of 12`,
  never `n of 14`.

A role is a statement you make, never a guess: nothing infers it from what you
have read. And a path recommends an order — it gates nothing, every sheet stays
reachable from the drawing set, and switching role loses nothing, because
sign-offs are recorded against sheets.

### Progress you can see

Six subsystems, six colours, taken from the three stacked Turkish delight cubes
of the [LokumAI](https://lokumai.github.io) mark: **GÜL** (rose), **FISTIK**
(pistachio), **LAVANTA** (lavender), **NANE** (mint), **KAHVE** (coffee) and
**KAYMAK** (clotted cream). Hue says which subsystem; chroma says how far you
have got. An isometric cube shows three faces, so the brand's three lokums are
the three you can see.

Colour here is information, not decoration, and it is held to that:

- It appears **only** on a surface that reports that subsystem's progress — a
  face of the mark, a category card, a module row's leading rule, a meter, a path
  step. The reading page itself takes none at all.
- It is **never the only thing saying it.** Every meter prints its count beside
  it, every step prints its state as a word, and the mark keeps its ISO 128 line
  types. A test loads the site with `forced-colors: active` — every hue gone —
  and checks each surface still reports its state.
- Every one of the twelve values clears **3:1 against all three grounds in both
  themes**, computed from the shipped stylesheet on every test run rather than
  asserted. One lightness serves both themes, so there is nothing to drift.

The meters are segmented — one cell per sheet, in order — rather than continuous
bars. That is not a style choice: a bar's length is a computed number, and a
computed number cannot reach CSS before the first paint, so a bar would have to
appear after hydration. A cell per sheet is drawn from the stamp on `<html>`
alone, is correct in frame one, and says more — *which* sheets are done, and
which are still unwritten.

### The `RECORD OF WORK`

One HTML file, generated in your browser, that works offline from `file://`
years later with no network and no server. It is deliberately **not** a
certificate: there is no issuing authority, no signature and nothing to verify,
and the document says so above the fold rather than in a footer. What it carries
instead is evidence — the sheets you signed and when, against which revision of
each sheet, your quick-check answers reproduced in full, the sources you opened,
and the repositories you built, each with the commit hash you supplied. It ends
with instructions addressed to whoever is reading it, on how to check the parts
that can be checked and to ignore the parts that cannot.

**Nothing on any page claims a state that is not true of you right now.** The
prerendered HTML has never met you, so it renders the honest empty form — every
sheet dashed, every readout at `--` — and your own record fills it in after the
page loads. A sheet is signed off because you said so, never because the site
inferred it from a scroll position or a timer.

**Module frontmatter is validated at build time.** A `status: ready` module
without a `summary`, without at least two `objectives`, or without a positive
`duration` fails the build with the file name and the offending field — it does
not ship a half-filled sheet. Draft modules are held to the shape of the
frontmatter only. Everything else a module page displays — extent, figure and
source counts, revision hash, language coverage — is derived from the file, so
none of it can drift out of date.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export into out/
```

`npm run dev` serves from the repository root path (`/`). The deployed build sets
`SITE_BASE_PATH=/ai-engineering-bazaar`, which is what makes every asset URL resolve on
GitHub Pages; to reproduce the deployed build locally:

```bash
SITE_BASE_PATH=/ai-engineering-bazaar npm run build
```

## Tests

Everything below runs on every pull request (`.github/workflows/ci.yml`), and
all of it must pass before opening one.

```bash
npm run typecheck    # TypeScript, strict
npm test             # Vitest: units, plus the whole-corpus render check
npm run build        # the static export itself
npm run test:e2e     # Playwright, real Chrome, three viewports
```

`npm test` includes eight checks worth knowing about because they fail for
reasons that are not a broken test:

- **The corpus check** (`tests/corpus/`) renders all 32 real modules rather than
  a fixture, so a transform that works on a sample and dies on the content fails
  here.
- **The link gate** (`tests/corpus/links.test.ts`) resolves every internal
  cross-reference in the corpus against the routes that exist, and asserts that
  no rendered HTML anywhere contains a non-external `href` ending in `.md`. It
  checks each path the app renders markdown on, the module body and the sheet's
  summary panel and the category introductions, because a gate that covers only
  the body once passed while four dead links were still shipping. Until this
  repository became a single Next.js project it had no such gate: the check lived
  in `mkdocs build --strict`, and it warned where this one fails the build.
- **The contrast check** (`tests/unit/color/contrast.test.ts`) recomputes every
  WCAG ratio published in §10.1 of the design spec from the live token values in
  `src/app/globals.css`. Change a colour and this fails until the spec's table is
  re-derived to match.
- **The stroke-weight check** (`tests/unit/stroke-weights.test.ts`) fails on any
  `border-width: var(--stroke-struct)`. Chrome floors a border width to a whole
  pixel, so the middle line weight has to be *painted* — a gradient or a height —
  not bordered. It caught this exact mistake twice while the record layer was
  being built.
- **The copy register** (`tests/unit/copy-register.test.ts`) scans every
  reader-visible string in the record and path layers — nine role blurbs and 123
  step reasons among them — for exclamation marks, praise, anthropomorphism,
  "just"/"simply"/"easy", "please"/"sorry" and confirmshaming. Comments are
  stripped first, because they quote every banned word while explaining why it is
  banned. It also bans a second spelling of a status: the register says
  `NOT DRAWN`, and `NOT YET DRAWN` fails, because both read as correct alone.
- **The palette check** (`tests/unit/color/lokum.test.ts`) recomputes all six
  category hues from `src/app/lokum.css`: 3:1 against three grounds in both
  themes at full and half chroma, in-gamut, mutually distinguishable, each state
  distinguishable from the others, and 20° clear of the accent pen. It also
  asserts the copy of those values inlined in the `RECORD OF WORK` matches the
  stylesheet, because that file has no stylesheet to import and its copy is the
  only one it has — a drifted hue there would be invisible.
- **The path honesty check** (`tests/unit/path/honesty.test.ts`) holds the nine
  routes to §13.4.2: real slugs, no duplicates, prerequisite order, denominators
  over written sheets only, and no unwritten sheet described as though it teaches
  something. It found two defects that twelve independent agents had passed.
- **The path evidence check** (`tests/unit/path/evidence.test.ts`) measures each
  of the 123 reasons against the sheet it cites. Genuine citations score a median
  of 100%; the same citations pointed at a different sheet score a median of 33%.
  The test asserts both, so it cannot pass by being vacuous.

The e2e suite launches real Google Chrome (`channel: 'chrome'`), not the bundled
Chromium build. First run on a machine needs it installed:

```bash
npx playwright install --with-deps chrome
```

Set `E2E_CHANNEL=chromium` to fall back to the bundled build on a machine with no
Chrome.
