# Repository architecture

The map of the whole repository, for anyone (or any agent) starting work in it.

There is a second architecture document at [`../ARCHITECTURE.md`](../ARCHITECTURE.md). That one is
about the Next.js application: its six design rules, its runtime layers, its deployment. This one
is about the repository, which contains two different projects that meet at one interface.

## Two projects in one repository

**The corpus.** A course of 33 mini-courses, written by hand in markdown, in English and Turkish.
Its contract is [`../mini-courses/MANIFEST.md`](../mini-courses/MANIFEST.md), seven rules that
decide what a module may be. It is readable on GitHub exactly as written, and that is deliberate:
GitHub is a first-class reader, not a fallback.

**The application.** A Next.js 16 site that renders the corpus as a static export. It is a
colleague's work, built to a long internal spec that its own files cite by section number
(`§12.2`, `§4.4` and so on).

**The line between them.** The corpus is plain markdown and the app reads it as authored. Content
work does not change the app to suit it, and app work does not require the corpus to be written
differently. When those two pull against each other, the corpus wins and the app adapts, because
the corpus is the product.

The one exception, and the reason it matters, is `mini-courses/curriculum.yaml`. That file is
authored by the course side and read by the app side, so it is the actual interface between them.

## Top level

```
mini-courses/          the corpus, and everything MANIFEST.md governs
  MANIFEST.md          the seven rules: the contract for all content
  CLAUDE.md            the working agreement for agents. AGENTS.md is a byte-identical copy
  curriculum.yaml      THE COURSE SHAPE. Categories, module order, titles, status, prerequisites
  index.md             the site's home page, mirroring README.md
  ROADMAP.md           the order we intend to build in
  _module_template.md  copy this to start a module
  1_fundamentals/ … 6_optional/   the six categories, each with images/
  scratchpad/          the author's own notes. Never edit, never delete, never tidy

src/                   the Next.js app
  app/                 routes. /courses/[category]/[module] is the sheet
  components/          React components, split by area
  lib/                 the logic. lib/content/ is the whole corpus reader
assets/                diagram source templates. Not published
scripts/               build steps and one-off tools
tests/                 vitest and playwright
supabase/              SQL migrations for the accounts feature
docs/                  the app's own notes on auth, data flow and queries
context/               this file
ARCHITECTURE.md        the application's architecture
README.md              the GitHub landing page, for readers
```

## How a module becomes a page

This is the pipeline worth knowing, because almost every question about the site is answered
somewhere along it.

```
curriculum.yaml  ──►  curriculum-file.ts  ──►  loader.ts  ──►  derive.ts  ──►  render.ts  ──►  the page
   the shape           validate the shape      read the files    measure it     markdown to HTML
```

1. **`curriculum-file.ts`** validates `curriculum.yaml` with zod, then enforces seven cross-file
   rules that zod cannot express. The valuable one: for each category, the `.md` files on disk and
   the names listed in the yaml must be the same set, in both directions. A module you list without
   writing, or write without listing, fails the build by name.
2. **`loader.ts`** walks the yaml rather than reading the directory, so **a module's number is its
   position in that file, computed in exactly one place.** It merges the config into an object still
   called `frontmatter`, which is why the rest of the app did not have to change when the config
   arrived.
3. **`derive.ts`** measures each sheet: word extent, figure and diagram counts, source count, and
   `langCoverage`, which compares the English and Turkish extents and prints `EN` when a
   translation has fallen too far behind.
4. **`render.ts`** turns markdown into HTML: figures with numbered captions, mermaid, code themes,
   the checklist, the Quick Check. **Raw HTML in markdown is stripped entirely**, so an `<img>` tag
   silently does not render.

`lib/content/` holds about thirty small modules doing one job each. `links.ts` resolves
cross-references, `edges.ts` builds the prerequisite graph, `manifest.ts` builds the index table,
`strip.ts` removes the build furniture, `facts.ts` caches the whole corpus spine once per build.

## What the config owns, and what is derived

`curriculum.yaml` is the single source for the course shape. Nothing else may state these:

| Fact | Where it lives |
| --- | --- |
| A module's number | Its position in the yaml. Computed, never written |
| Its title, status, duration | The yaml entry |
| Its prerequisites | The yaml, **by name**, so a grep finds them |
| Its URL slug | The `name` field, which is also the file stem |
| Whether a sheet is drawn (A0) or a stub (A4) | `status`, and nothing else |
| The per-module CSS selector lists | Generated into `src/app/lokum-modules.css` by `scripts/curriculum-css.mjs` |

Consequences worth knowing:

- **Reordering the course is one line.** Move an entry, and the numbers, the prev/next chain and
  the index order all follow. Verified: `git status` shows only the yaml.
- **Filenames carry no number.** `2_intermediate/context_engineering.md`. The directory keeps its
  own prefix; the file does not.
- **Prose names another module by title, never by number**, because a number goes stale silently.
- **Adding a module is four paths**: the yaml line, the two markdown files, and the regenerated
  `lokum-modules.css`.

## Accounts and data

The newest part of the app, and it is optional. `lib/supabase/` resolves the environment, and with
no keys set it returns `unavailable` and `isAuthEnabled()` is false, so the site builds and behaves
as the same static export it always was. With keys, `supabase/migrations/` provides the schema and
row-level security for accounts, organisations and a record that outlives the browser.

Reader progress works without any of that: it lives in the browser, **keyed by slug rather than by
module number**, which is why renumbering the course never loses anybody's place.

## The build

```bash
npm run dev        # prebuild steps, then next dev
npm run build      # prebuild steps, then next build to out/
npm test           # vitest
npm run test:e2e   # playwright against out/
npm run typecheck  # tsc --noEmit
```

`prebuild` and `predev` both run two generators first: `curriculum-css.mjs` writes
`src/app/lokum-modules.css`, and `copy-course-images.mjs` copies every
`mini-courses/*/images/` into `public/course-images/`, which Next then serves and exports as
`out/course-images/`.

The two outputs are treated differently on purpose. **`lokum-modules.css` is committed**, because
vitest and playwright do not run `prebuild` and would otherwise test a file that is not there. So
if you change a `status` in the yaml, regenerate it in the same commit or the colour tests will
disagree with the config. **`public/course-images/` is gitignored**, because it is only a copy of
images already in the repository under `mini-courses/`, and committing it would store every one
twice.

## Tests, and the one rule

Read [`../tests/README.md`](../tests/README.md) before touching anything under `tests/`. The rule
in one line:

> A test may check a rule that holds for any content. It may never write down a fact about the
> content.

The suite was cut from 1,948 tests to a few hundred because it had transcribed heading spines, word
counts and module numbers, so ordinary edits turned the build red and taught nobody anything. None
of those pinned facts ever caught a real defect. It has since grown back with the app's own tests,
and the same rule keeps being enforced: several assertions that keyed on module number as a proxy
for "is a stub" have been rewritten to key on `status`.

Four layers:

- `tests/unit/` per-module unit tests, the bulk of it
- `tests/corpus/renders.test.ts` structural rules that hold for any module, such as "no raw
  `<img>` in a body", which is the only check that would have caught the one real content defect
  this project has shipped
- `tests/fixtures/kitchen-sink.md` one invented module carrying every structure, with its rendered
  output stored, so a structure can be tested without a real module having to keep using it
- `tests/e2e/` playwright against the built export, for anything needing layout, paint or storage

**A green suite is not proof the page is right.** When you change how content is authored rather
than what it says, grep `out/`. That is how eight silently missing figures were found after
typecheck, 1,948 tests and the build all passed.

## Scripts

| Script | What it is for |
| --- | --- |
| `curriculum-css.mjs` | Generates the per-module CSS lists from the yaml. Runs in `prebuild` |
| `copy-course-images.mjs` | Copies course images into the export. Runs in `prebuild` |
| `compare-export.sh` | Compares two builds by what a reader can see. **Use this, never `diff -r`**: chunk names, the build id and RSC payload rows differ on every build of identical source |
| `serve-static.mjs` | Serves `out/` so playwright can test the real export |
| `check-links-out.mjs`, `check-mermaid.mjs` | Content checks over the corpus |
| `check-supabase.mjs`, `test-rls.mjs` | Accounts feature checks |
| `migrate-corpus.mjs` | The one-off that de-numbered the filenames. Kept as a record |

## Read next

- [`../mini-courses/MANIFEST.md`](../mini-courses/MANIFEST.md): the seven rules. Read before
  writing any content
- [`../mini-courses/CLAUDE.md`](../mini-courses/CLAUDE.md): the working agreement, and the longest
  document here. How a module gets written, the diagram system, the naming rules, and the mistakes
  that produced each rule
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md): the application's own architecture, in depth
- [`../tests/README.md`](../tests/README.md): the testing rule and the four layers
- [`../mini-courses/ROADMAP.md`](../mini-courses/ROADMAP.md): what is written and what is next
