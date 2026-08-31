# AI Mini-Courses

AI Engineering made simple, short, and useful.

📖 **Read online:** [lokumai.github.io/ai-engineering-bazaar](https://lokumai.github.io/ai-engineering-bazaar/)
— or the plain docs site at [/legacy/](https://lokumai.github.io/ai-engineering-bazaar/legacy/)

A series of mini-courses from beginner to advanced to help you learn practical topics in modern AI engineering. Each course is short, easy to understand, and includes real-world examples, clear visuals, and extra reading materials. It is the fastest way to master what you actually need on the job.

## Structure

| Category                                                         | Modules | Description                                                                                                               |
| ---------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| [Fundamentals](mini-courses/1_fundamentals/README.md)             | 1-7     | LLMs, training, RAG, tools, memory, agents, multi-agent systems.**Start here.**                                     |
| [Intermediate](mini-courses/2_intermediate/README.md)  | 8-15    | Prompt engineering, context engineering, coding agents, harness engineering, security, loop engineering, personal agents. |
| [NOT READY] [Expert](mini-courses/3_expert/README.md)                         | 16-24   | Advanced UI, architectures, tools, memory, multi-agent, prompting, context engineering, harness engineering, deployment.  |
| [NOT READY] [Ecosystem](mini-courses/4_ecosystem/README.md)                   | 25-29   | Agent frameworks, inference providers, inference engines, UI design, observability.                                       |
| [NOT READY] [Protocols &amp; Specs](mini-courses/5_protocols_specs/README.md) | 30      | A single reference of every protocol and spec mentioned across the series.                                                |
| [NOT READY] [Optional](mini-courses/6_optional/README.md)                     | 31-32   | Human-in-the-loop and runtime topics that round out the series.                                                           |

### How to Use

1. Start with [Fundamentals](mini-courses/1_fundamentals/README.md) to learn must-know concepts in AI Engineering.
2. Move on to [Intermediate](mini-courses/2_intermediate/README.md) to build your core skills.
3. Jump to [Ecosystem](mini-courses/4_ecosystem/README.md) to learn the tools and frameworks needed to become a well-rounded AI engineer.

🎉 Congrats! You are now an **AI engineer**. You can now build your own AI agents and systems.

1. ⚜️ [ADVANCED] ⚜️ If you want to become a rare, highly-skilled AI engineer, take the [Expert](mini-courses/3_expert/README.md) course to learn advanced topics.

## Two sites, one set of markdown

The courses are plain markdown in `mini-courses/`, and nothing below ever edits
them — every transformation happens at build time. They are published twice:

| Site | URL | Built from |
| --- | --- | --- |
| **LMS** — the course experience | <https://lokumai.github.io/ai-engineering-bazaar/> | `lms/` (Next.js, static export) |
| **Docs** — the plain reference | <https://lokumai.github.io/ai-engineering-bazaar/legacy/> | `mkdocs.yml` (MkDocs Material) |

Both are built from the same commit and shipped in a single GitHub Pages
artifact by `.github/workflows/deploy.yml`, with the LMS at the root and the
docs site under `legacy/`.

**Module frontmatter is validated at build time.** A `status: ready` module
without a `summary`, without at least two `objectives`, or without a positive
`duration` fails the build with the file name and the offending field — it does
not ship a half-filled sheet. Draft modules are held to the shape of the
frontmatter only. Everything else a module page displays — extent, figure and
source counts, revision hash, language coverage — is derived from the file, so
none of it can drift out of date.

## Local development

### LMS

```bash
cd lms
npm install
npm run dev          # http://localhost:3000
npm run build        # static export into lms/out/
```

`npm run dev` serves from the repository root path (`/`). The deployed build
sets `LMS_BASE_PATH=/ai-engineering-bazaar`, which is what makes every asset URL
resolve on GitHub Pages; to reproduce the deployed build locally:

```bash
cd lms
LMS_BASE_PATH=/ai-engineering-bazaar npm run build
```

### Docs site

```bash
# one-time setup
python3 -m venv .venv
.venv/bin/pip install mkdocs-material

# run the local server
.venv/bin/mkdocs serve
```

Then open http://127.0.0.1:8000 — the site live-reloads whenever you save a
markdown file.

## Tests

Everything below runs on every pull request (`.github/workflows/ci.yml`), and
all of it must pass before opening one.

```bash
# From the repository root — broken links fail the strict build.
.venv/bin/mkdocs build --strict

cd lms
npm run typecheck    # TypeScript, strict
npm test             # Vitest: units, plus the whole-corpus render check
npm run build        # the static export itself
npm run test:e2e     # Playwright, chromium — diagrams, keyboard, landmarks
```

`npm test` includes two checks worth knowing about because they fail for
reasons that are not a broken test:

- **The corpus check** (`lms/tests/corpus/`) renders all 32 real modules rather
  than a fixture, so a transform that works on a sample and dies on the content
  fails here.
- **The contrast check** (`lms/tests/unit/color/contrast.test.ts`) recomputes
  every WCAG ratio published in §10.1 of the design spec from the live token
  values in `lms/src/app/globals.css`. Change a colour and this fails until the
  spec's table is re-derived to match.

First `npm run test:e2e` on a machine also needs the browser:

```bash
cd lms && npx playwright install chromium
```
