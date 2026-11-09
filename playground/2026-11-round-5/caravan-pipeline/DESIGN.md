# Caravan's content pipeline: design note

**Draft for the author, 2026-11-09. Nothing here is committed, and nothing outside this folder was
changed.** The instruction file is [`SKILL.md`](SKILL.md) beside this note, and the data shape is
shown in [`sample-trends.yaml`](sample-trends.yaml), a format example whose prose is placeholder.

Caravan (`/caravan/`, M62) shows what was trending in AI engineering from ChatGPT (late 2022) until
today. The design is drawn separately: `C1-caravan-designs.html` (the journey, the land and the
histogram strip) and `C2-caravan-node-formats.html` (what one stop holds, N1 to N4, and three ways to
set the intensity, H1 to H3). This note designs the content behind it: where it lives, how agents
find and measure it for 2022 to now, how it is kept up, and where the author decides.

---

## 1. The recommendation in ten lines

1. Caravan's content lives in `mini-courses/caravan/`, in three kinds of YAML file: `trends.yaml`
   (the author's), `sources.yaml` (the ledger of every cited source) and `evidence/<trend>.yaml` (the
   measured counts). The build validates them in the style of `curriculum-file.ts`.
2. A trend is a span (a start month and an end month), never a release. Its intensity is a **monthly
   series of levels 0 to 5**, which draws the land and the histogram.
3. **Nobody types an intensity.** The build computes each level from the counts in the evidence file
   with one pure function. The author can override a month, and the override carries his reason.
4. Agents research, fetch, count, verify and propose. **No agent writes a sentence that ships**: the
   title, "what it was" and "why it mattered" are the author's, in every trend.
5. Two kinds of evidence. **Seeds** (company posts, papers, the first post that named it) date a
   trend. **Signals** (Hacker News, new GitHub repositories, arXiv, Wikipedia, search interest)
   measure how strong it was. A company's own announcement never raises the intensity.
6. A signal is a **share** of its own source's monthly total, never a raw count, so a source that grew
   (or broke) does not make the recent months look bigger.
7. A level above 1 needs **two independent signal families** that agree. One loud source is hype.
8. Phase 1 (the backfill) runs once, in four steps with three author gates. Phase 2 (maintenance) runs
   **quarterly**, on months that ended at least one month earlier.
9. A run works in a gitignored folder. What stays is the diff to `mini-courses/caravan/`, a PROGRESS
   entry and the pull request body.
10. The mobile bundle is not changed now. A later, additive v1 document `api/v1/caravan/<lang>.json`
    would carry the trends with their levels and totals already computed.

---

## 2. Who writes what

STORY.md: *"No AI was allowed to write our content."* MANIFESTO rules 1, 12 and 13, and the course's
*"Verify, do not pass through"*, apply to Caravan as they apply to a module. So the split is:

| Field or file | Who produces it | Who approves it |
|---|---|---|
| A trend's title, "what it was", "why it mattered" | **the author** | the author |
| Its translations | open question Q3 | the author |
| Its start and end month | the proposer proposes from the evidence | the author |
| Which 2 or 3 sources it cites | the proposer lists candidates | the author chooses |
| The counts in `evidence/` | the collectors and the measurer, by recorded requests | the author, at the gate |
| The monthly level | **the build**, from the counts | the author, by accepting or overriding |
| A source's title and date | copied from the fetched page, never written | the verifier re-fetches; the author sees it |
| Related modules | the proposer suggests | the author |

The agent's hand-over to the author is evidence: dated facts, each with a source id, and numbers,
each with the request that produced it. It is never a draft sentence for the page.

---

## 3. The data shape

### 3.1 Files

```
mini-courses/caravan/
  trends.yaml                 the author's file: what ships, in the order the author wants
  sources.yaml                every source a trend cites, with its real title and date
  evidence/<trend_id>.yaml    the frozen queries and monthly counts for one trend
```

Why under `mini-courses/`: Caravan is content, and `mini-courses/` is where content lives and where
the app reads it (ARCHITECTURE §1, rule 2). It is a new folder beside the five level folders, not a
level, so `curriculum.yaml` does not list it and rule 6 of `curriculum-file.ts` (the listing and a
level's directory are the same set) is not affected: that rule walks the level folders named in
`CATEGORY_DIRS`. The quiz test scans top-level folders only for `*.quiz.yaml`, and YAML files there
are not markdown, so the corpus link and markdown checks do not see them.

Not under `scratchpad/`: that folder is the author's to think in, and nothing in it is ours to write
(MANIFESTO §7).

### 3.2 One trend

The fields cover C2's richest format, N4 (the ledger page). Whichever format the author picks, the
page reads a subset; no format needs a field this shape lacks.

| Field | Type | Rule |
|---|---|---|
| `id` | `[a-z0-9_]+` | Unique. Never changes, because a future bundle and a future link may key on it. |
| `status` | `proposed` \| `approved` | Only `approved` renders. An agent may write `proposed`, never `approved`. |
| `title` | per language | The author's. Up to six words, naming the trend and not a product (C2). |
| `what` | per language | The author's. One or two sentences, up to 35 words (C2). |
| `why` | per language | The author's. One sentence: what changed for someone building with AI (C2). |
| `start` | `YYYY-MM` | Not before `first_month`. The proposer proposes it from the evidence; the author sets it. |
| `end` | `YYYY-MM` or `null` | `null` means still on the road. Not before `start`. |
| `named` | `YYYY-MM` or `null` | Optional. The month the trend got its name, which can be after it started. |
| `seed` | source id | The source that started it. Must be one of `sources`. |
| `sources` | 2 or 3 source ids | The ones the page shows. Each resolves in `sources.yaml`. |
| `modules` | module names | Each is a name in `curriculum.yaml`, checked like `needs`. |
| `goods` | word or `null` | Optional. C2's merchant goods, from a fixed list the design names. |
| `adjust` | list | The author's overrides: months, a level, a reason, `by`, `on`. |
| `approved` | `{by, on}` or `null` | Set when the author approves the trend. |

**No category field.** The author: *"not sure whether it should be filterable by things like industry,
research, etc. at least not for now."* A field that nothing reads drifts, and adding one later is
additive. The **year filter** needs no field: a trend belongs to every year its span touches, and the
app derives that.

**No model releases.** The author: *"mine will be very high-level and wont include things like model
release."* A release can be a trend's **seed** (the source that dates it), never a trend. The proposer
classifies every candidate as a trend (an idea, practice or pattern the field talked about for two
months or more) or an event (a release, a launch, a crisis), and drops events unless the author keeps
one.

The C1 mockup's sample data is one event per row with a category and a heat of 1 to 5, and it mixes
model releases with trends; it is labelled "Sample data, not checked". This shape follows C2's span
model instead, which matches the author's words.

### 3.3 An example entry

From [`sample-trends.yaml`](sample-trends.yaml). The prose and the months are placeholder; the source
was fetched on 2026-11-09 and its title and date are copied from the page.

```yaml
# mini-courses/caravan/trends.yaml
caravan: 1
first_month: "2022-11"
trends:
  - id: model_context_protocol
    status: proposed
    title: { en: "PLACEHOLDER, up to six words", tr: null, fa: null }
    what:  { en: "PLACEHOLDER. One or two sentences, up to 35 words, written by the author." }
    why:   { en: "PLACEHOLDER. One sentence, written by the author." }
    start: "2024-11"
    end: null
    named: null
    seed: s_anthropic_mcp
    sources: [s_anthropic_mcp, s_second, s_third]
    modules: [tools, protocols_reference]
    goods: null
    adjust: []
    approved: null

# mini-courses/caravan/sources.yaml
sources:
  - id: s_anthropic_mcp
    url: "https://www.anthropic.com/news/model-context-protocol"
    kind: announcement
    title: "Introducing the Model Context Protocol"
    title_from: "<title>, site suffix removed"
    publisher: Anthropic
    published: "2024-11-25"
    published_from: "JSON-LD datePublished"
    via: http
    fetched: "2026-11-09"
    checked: "2026-11-09"
    archived: "http://web.archive.org/web/20241126233832/https://www.anthropic.com/news/model-context-protocol"
    state: live
```

### 3.4 A source

`kind` is one of `announcement`, `paper`, `repository`, `article`, `post`, `video`, `news`, `dataset`
(C2 names six types; `video` and `dataset` are added for YouTube and for a data source such as GH
Archive). `title` is the page's own title, **copied, never rewritten**, by a fixed rule: `og:title`,
then the first `h1`, then `<title>` with the site's suffix removed; `title_from` records which. A post
has no title, so its title is `<author> (@handle) on <platform>` and the first sentence goes in
`quote`. `published` is a day where the page gives one, else a month; `published_from` records where
the date came from (JSON-LD `datePublished`, `article:published_time`, a printed date, an RSS
`pubDate`, arXiv's v1 date, an oEmbed date, a GitHub `created_at`). `checked` is the last day the
verifier re-fetched the page and found the same title and date. `archived` is a Wayback copy, so a
dead link can be replaced by its archive and not by a guess.

**A first Wayback capture is not a publication date**, and neither is a sitemap's `lastmod`: both
say when a page was seen or changed.

### 3.5 Evidence and the level

An evidence file holds, per signal family: the endpoint, the frozen query and its parameters, the
query for the family's monthly total (the base), the verifier's precision sample, a health note, and
per month `{ n, base, fetched }`. The sample's evidence block shows real probe counts. The **level
is not stored**: the build computes it (section 5) with one pure function, proposed as
`scripts/lib/caravan-intensity.mjs`, imported by the content layer and by the measurer's script.
That follows a precedent: `src/lib/bundle/diagrams.ts` already imports
`scripts/lib/diagram-font.mjs`, so one definition serves the build and a script (ARCHITECTURE rule 4).

The histogram and the land need the sum of levels over the trends on the road in a month. That total
is derived, by the same layer, and written nowhere (rule 2).

### 3.6 Validation, in the style of `curriculum-file.ts`

A proposed `src/lib/content/caravan-file.ts`: `yaml.safeLoad`, `z.strictObject` everywhere (so a
typo such as `strat:` fails instead of being dropped), and each cross-file rule throwing
`caravan: rule N, ...` with the id it is about. The rules:

1. Every trend `id` and source `id` is unique and matches `[a-z0-9_]+`.
2. Every month is `YYYY-MM`, not before `first_month`, not after the last month any evidence file
   measured; `start <= end` where `end` is set; `named`, where set, is a valid month.
3. Every `modules` entry names a module in `curriculum.yaml` (rule 3 of the curriculum, applied here).
4. Every cited source id has an entry in `sources.yaml`, and **every entry is cited by some trend**:
   both directions, as rule 6 is for modules.
5. An `approved` trend has `title.en`, `what.en` and `why.en`; a title of at most six words and a
   `what` of at most 35 words; 2 or 3 `sources`; a `seed` among them; `approved.by` and `approved.on`.
6. The seed's `published` month is not after `start`.
7. Every `approved` trend has `evidence/<id>.yaml`, its `method` equals the function's version, and
   every month from `start` to `end` (or the last measured month) is present for at least two
   families, or the month's level is `null` and the page says it was not measured.
8. Every `adjust` entry has `months`, a `level` from 0 to 5, a non-empty `reason`, `by` and `on`.
9. Every source has `title`, `published`, `published_from`, `fetched` and `checked`; `via: manual`
   only with `checked` set by the author's hand-over (see Gate B).
10. An evidence file for an id `trends.yaml` does not list fails, like a translation of nothing.

These are rules over any content, never facts about it, so they obey `tests/README.md`. The copy
rules of `mini-courses/CLAUDE.md` (no em dash, ASD-STE-like English) apply to the author's text.

### 3.7 How the site reads it

`src/lib/content/caravan.ts` loads and validates the three files at build time and gives the page
the approved trends, each with its computed monthly levels, its sources and its modules resolved to
addresses through the one link map (`module-render.ts` is the precedent), and the monthly totals.
The page imports nothing from `node:fs` in a client component; the islands receive data as props.

### 3.8 The bundle, later

Not changed now. When the page ships, the mobile reader would need, as an **additive v1 change**
(ARCHITECTURE §13: a new field or document stays in `api/v1/`):

- a new document per language, `api/v1/caravan/<lang>.json`, written by a static route handler
  and parsed by a new strict schema in `src/lib/bundle/schema.ts`: `first_month`, `last_month`, and
  per trend `id`, `title`, `what` and `why` as `inlines`, `start`, `end`, `levels` (month to level,
  computed), `sources` (kind, title, publisher, published, url), and `modules` as link targets;
  plus `totals` (month to the summed level) so the reader derives nothing;
- a new optional field on the index, `caravan: { docs: { <lang>: <site path> } }`, and the new
  files in `files` with their hashes.

Removing or retyping any of these later would be `api/v2/`, so the shape should settle on the web
first. This is for the colleague's app and is the author's call to schedule.

---

## 4. Sources, tested on 2026-11-09

Every row was tested from this machine on 2026-11-09 with `curl`, `gh`, `WebFetch` or `WebSearch`.
"Backfill" means it can answer for a month in 2023, not only for this week.

| Source | What I tested | Result | Use |
|---|---|---|---|
| **Hacker News, Algolia API** | `search_by_date` with a month's `created_at_i` range, `hitsPerPage=0`, titles only | **Works, no key.** Monthly counts back to 2022. Three traps (1, 2 and 5 below). | Signal: talk among engineers |
| **GitHub search API** (`gh api search/repositories`) | `mcp in:name,description,topics created:<month>`; and `created:<month>` for the base | **Works** with the author's token, 30 searches a minute. MCP: 375 new repos in 2024-11, 15,171 in 2025-06, 36,219 in 2026-06; all new repos 3,120,248 (2023-06) to 8,183,661 (2026-06) | Signal: building |
| **GitHub stargazer history** | `repos/<r>/stargazers` with the `star+json` header; GraphQL `stargazers` | **Blocked.** 404 for every other repository tried (simonw/llm, karpathy/nanoGPT, openai/openai-python, langgraph); works only for the author's own repository; GraphQL returns `totalCount: 0` | Not usable |
| **GH Archive through ClickHouse's public playground** | `github_events`, `WatchEvent` per month on `modelcontextprotocol/servers` | **Works, no key.** But the base (every star event) fell 38% below its six-month median in 2025-06, and was under 80,000 a month in 2026-07 and 2026-08, against about 6 million a month in 2024 | Signal until 2025-05 only |
| **GitHub trending archive** (`bonfy/github-trending`) | the repository and one daily file | **Works.** Daily files since 2015 (366 for 2024), pushed today; a few languages per day | Discovery: what took off |
| **arXiv API** (`export.arxiv.org/api/query`) | phrase in abstract, by `submittedDate` | **Unreliable today**: 429 "Rate exceeded", then 500. Trap: the error reply carries `totalResults` = 1 | Retry in a quiet run |
| **arXiv advanced search page** | `"retrieval augmented generation"` in CS abstracts, first submitted per month | **Works.** 2 results (2023-06), 124 (2024-06), 206 (2025-06) | Signal: research |
| **arXiv monthly listings** | `/list/cs.CL/<YYYY-MM>` | **Works.** "Total of 1263 entries" (2023-06), 2433 (2025-06) | Base for the research family |
| **Semantic Scholar bulk search** | phrase, `publicationDateOrYear` per month | **Works until rate-limited**: 3 (2023-06), 181 (2024-06), then 429 without a key | Cross-check for arXiv; needs a key |
| **Hugging Face daily papers API** | `/api/daily_papers?date=` | **Works.** Empty on 2023-04-10, 11 papers on 2023-05-10, so it starts in May 2023 | Discovery for research |
| **Hugging Face trending models** | `/api/models?sort=trendingScore` | **Current only**, no history | Maintenance only; mostly models, which the author excludes |
| **Wikipedia pageviews API** | monthly user views per article, with a User-Agent | **Works.** But an article exists only after a trend is known: `Retrieval-augmented_generation` starts in 2023-11, `Model_Context_Protocol` in 2025-03 with 0 views, `AI_agent` shows 12 views in 2023-12 (a redirect, probably) | Signal: public interest, lagging |
| **Google Trends** | the `explore` endpoint | **429.** No public history API reached | Manual: the author exports a CSV |
| **GDELT DOC API** (news volume) | `mode=timelinevol` | **429** even with 8 s between calls; it points heavy users at its ngrams dataset | Retry, or leave out |
| **OpenAI news RSS** | `openai.com/news/rss.xml` | **Works, full history**: 1,368 items from 2015-12-11 | Seeds |
| **Hugging Face blog RSS** | `huggingface.co/blog/feed.xml` | **Works, full history**: 900 items from 2020-02-14 | Seeds |
| **Google DeepMind blog RSS** | `deepmind.google/blog/rss.xml` | Works, last 100 items (from 2025-11-24) | Seeds, recent; older by sitemap or search |
| **Google AI blog, Google Developers, NVIDIA, NVIDIA Developer, Microsoft, Microsoft Research RSS** | each feed | Work, **recent items only** (10 to 100) | Maintenance seeds |
| **Anthropic** | `/rss.xml`; `/sitemap.xml`; one article | No RSS (404). Sitemap: 279 `/news/` URLs. The article page carries its title and JSON-LD `datePublished` | Seeds, by sitemap then page |
| **Cognition, Manus** | RSS; sitemap | No RSS (404). Sitemaps: 97 Cognition `/blog/` URLs, 126 Manus `/blog` URLs | Seeds, by sitemap then page |
| **LangChain** | `blog.langchain.com/rss/`; sitemaps | The old blog address serves an HTML page now; `www.langchain.com/sitemap.xml` lists 553 `/blog/` URLs | Seeds, by sitemap then page |
| **Meta AI** | `/blog/rss/`, `/sitemap.xml` | Both 404 | Seeds by web search, then the page |
| **Wayback Machine** | the CDX API and the availability API | **Work.** The Anthropic MCP post has a copy from 2024-11-26 | Dead links and moved pages |
| **Simon Willison's blog, through Datasette** | SQL over tagged entries and links per month | **Works, no key.** Tags exist for `rag`, `vibe-coding`, `model-context-protocol`, `context-engineering`, `coding-agents`. Counts are small (0 to 7 a month in the months sampled) | Seeds and naming dates, not intensity |
| **AINews (smol.ai)** | `news.smol.ai` | Redirects to `latent.space/news`; the archive links were not found in the first page | Seeds; needs a closer look |
| **The Batch** (DeepLearning.AI) | the index page | Reachable | Seeds, weekly |
| **Papers with Code** | `/trends` | Redirects to Hugging Face's trending papers; the old history is gone | Not usable |
| **Medium** | tag RSS; `/tag/llm/archive/2023/06` | RSS: the latest 10 posts only. The archive is behind a Cloudflare check (403) | Not usable for backfill |
| **LinkedIn** | a content search | 403, redirect to login | **Manual only** |
| **X** | the search page; the oEmbed endpoint | Search returns the script shell, no posts. **oEmbed works for a known post URL**: it returned the author, the text and the date ("February 2, 2025") | Discovery manual; verification automatic |
| **YouTube** | the oEmbed endpoint | **Works, no key**: returns the video's real title and channel | Verify a video's title |
| **Reddit** | `search.json` | 403 | Not usable without the official API |
| **Web search** (the agent's tool) | "context engineering" origin | Works, and shows why it needs a verifier: the results are secondary pages that **disagree** on who used the term first and on which day | Discovery of leads only |

**The traps the tests found**, each a way a number could be wrong while every command succeeds:

1. **Fuzzy matching.** Algolia's defaults match `RAG` to "Racket", "Radio" and "Ramps": 0 of 20
   sampled titles were about retrieval in June 2023, and the count was 169. With
   `typoTolerance=false` and `queryType=prefixNone`, all 11 sampled hits (2023-12 and 2024-06) were
   relevant. But strict matching found 0 in June 2023, so it can miss word forms ("retrieval
   augmented", "RAG-based"), and recall needs its own check. GitHub's `mcp` was not sampled and may
   match unrelated projects. So every query is sampled for precision, and its word forms are listed.
2. **A broken base.** From 2026-01 the Algolia count of all stories jumps (398,090 in 2026-01 and
   3,203,048 in 2026-10, against 23,833 to 27,345 in the earlier months measured), while stories with 10 points or more
   stay near 4,000 to 5,500. The base is the stories with 10 points or more.
3. **A source that went dark.** The public star events in GH Archive collapse from mid-2025. A share
   computed on them after that would be noise. So every family's base is checked month by month.
4. **An error that looks like data.** arXiv's 500 reply is a valid feed with `totalResults` = 1. A
   collector that reads the number without checking for the `api/errors` entry records one paper.
5. **A count that is not exact.** Algolia returns `exhaustiveNbHits: false` for broad queries. The
   flag is recorded beside the count.

---

## 5. The measures: from evidence to a level

### 5.1 Seeds and signals

| Kind | Families | What it answers |
|---|---|---|
| **Seed** | company newsrooms, papers, the first post that used the name, newsletters (Simon Willison, AINews, The Batch), the GitHub trending archive, Hugging Face daily papers | **When** did it start, and **what** started it |
| **Signal** | `hn` (Hacker News titles), `github_repos` (new repositories), `research` (arXiv abstracts), `public` (Wikipedia pageviews, Google Trends), `github_stars` (until 2025-05) | **How strong** was it each month |

A company posting about its own product measures its marketing, not the field's attention, so
seeds never enter the level. The signal families are chosen so that no two depend on the same
crowd: engineers talking (`hn`), engineers building (`github_repos`, `github_stars`), researchers
writing (`research`), the public looking (`public`).

### 5.2 One family, one month

For trend *t*, family *f* and month *m*: `share = n / base`, where `n` is the count from the frozen
query and `base` is the same family's total for that month (stories with 10 points or more; all new
public repositories; the CS listing or a fixed base phrase; the base article set). A share removes
the growth of the source itself: new public repositories grew 2.62 times from 2023-06 to 2026-06,
so a raw count would make every recent trend look larger.

### 5.3 Normalise, then combine

1. **Per family, scale by a high percentile**: `x = min(1, share / p95_f)`, where `p95_f` is the 95th
   percentile of all non-zero shares of family *f* over every trend and every measured month. One
   scale per family, shared by all trends, so trends stay comparable (scaling each trend by its own
   maximum would make every trend peak at 5).
2. **Combine by the median** of the families that measured that month. A median ignores one family
   that runs hot, which is the hype case.
3. **Two-family rule**: if fewer than two families have `x >= 0.05`, the level is at most 1.
4. **Levels** from fixed cut points on the combined score: 0 below 0.05, then 1, 2, 3, 4 and 5 at
   0.05, 0.15, 0.30, 0.50 and 0.75. These values are a starting proposal, to be tuned once on the
   first small run and then frozen. The cut points belong to the method version; changing them is a
   decision with a BRAINSTORM entry and a full re-measure.
5. **The author's override** (`adjust`) wins for the months it names, and the page can show that a
   level was set by the editor (C2's H1). C2's H2 (how widely it was carried) is step 3 made visible.

This recommends a mix of C2's three options: H3 (a measured signal) as the base, H2 as the guard
and H1 as the override. Each part can be dropped on its own if the author picks one option only.

### 5.4 Against recency bias and hype

- **Shares, not counts** (5.2), and the **same frozen query for every month** of a trend. A query is
  frozen before the counts are taken and recorded in the evidence file.
- **A name can come after the practice.** A query set includes the words used before the name, and
  `named` is kept apart from `start`. Context engineering is the case to test first: the LangChain
  article fetched here is dated 2025-06-23, and the search results disagree on who used the name
  earlier.
- **Health check on every base**: a month whose base is more than 25% away from its trailing
  six-month median is excluded for that family and reported. Both real breaks in section 4 cross it
  (the star base fell 38%; the HN raw total rose 14.6 times in one month).
- **Precision sample**: the verifier reads 20 hits per family at three months (the start, the peak,
  the latest). Below 80% relevant, the query is revised; after two revisions, the run stops for that
  trend.
- **A trend lasts**: a candidate needs level 2 or more for two consecutive months; otherwise it is an
  event and is dropped unless the author keeps it.
- **Settling time**: a month is measured only after it has been over for at least one month, because
  counts for the newest days still grow.
- **Survivorship**: GitHub search counts repositories that still exist. It affects every trend in a
  similar way and is noted, not corrected.

### 5.5 What the probe already shows

From the probe counts in the sample's evidence block, for MCP:

| Month | `hn` per 1,000 stories | `github_repos` per 10,000 new repos | `github_stars` per 10,000 star events |
|---|---|---|---|
| 2024-11 | n = 1, base not taken | n = 375, base not taken | 4.81 |
| 2025-03 | n = 29, base not taken | n = 8,009, base not taken | 22.13 |
| 2025-05 | not taken | not taken | 11.79 |
| 2025-06 | 6.25 | 32.1 | excluded (health) |
| 2026-01 | 3.18 | n = 16,272, base not taken | excluded |
| 2026-06 | 1.81 | 44.3 | excluded |

The families disagree after mid-2025: talk on Hacker News falls while new repositories keep rising.
That is the reason for a median over families, and the kind of thing the author decides at Gate B:
whether a trend that became ordinary practice has "ended" or is still on the road (Q9).

---

## 6. Phase 1: the backfill, 2022-11 to the last settled month

Four steps and three author gates. The procedure is in [`SKILL.md`](SKILL.md).

1. **Discover.** Seed collectors, one per source family, in parallel, list what was talked about in
   each month: the top AI stories on Hacker News by points, the daily GitHub trending archive,
   company newsrooms (by RSS where it has history, by sitemap and page otherwise), Hugging Face daily
   papers, the newsletters. Each lead carries a fetched URL and its real title. The proposer merges
   the leads into a **candidate list**, each candidate classified as a trend or an event.
2. **Gate A, the author picks the trends.** Keep, merge, rename or drop each candidate.
3. **Measure and verify.** For each kept trend: freeze a query set per signal family, take every
   month's count and base, sample precision, check health; the measurer computes the levels with the
   one function. The verifier, a separate agent, re-fetches every cited source and re-runs a sample of
   the counts.
4. **Gate B, the author decides each trend.** Start, end, sources, modules, overrides; then he writes
   the title, "what it was" and "why it mattered". **Gate C** is the diff and the pull request.

A full backfill is 48 months (2022-11 to 2026-10), a trend list the author sets (Q5), and four or
five signal families. Arithmetic, not a measurement: GitHub needs one search per trend and month (48
per trend) plus one base search per month shared by all trends, so at its limit of 30 searches a
minute one trend takes under two minutes. The first run measures the real cost.

---

## 7. Phase 2: maintenance

**Cadence: quarterly**, in the first two weeks of January, April, July and October. Each run
measures the three months that ended at least one full month before it: September to November in
January, December to February in April, March to May in July, June to August in October. So the
newest month on the page is always settled. A stop on Caravan is a season or longer, so a monthly run
adds noise and a monthly author gate; a yearly run would leave "until today" up to a year stale and
let dead links pile up.

A run does: take the new months' counts for every approved trend; recompute the levels; list new
candidates that cross the two-family rule; propose an `end` for a trend that has been below level 2
for three months; re-fetch every cited source (dead, moved, a changed title); re-measure a 10% sample
of old months and report drift above 20%. **Once a year**, the April run re-measures the whole
series, as a separate decision for the author.

A run never: writes or edits a title, a "what", a "why" or any translation; deletes a trend, a
source or a month of evidence; changes a level the author approved (it proposes); changes the
method's version or cut points; replaces a dead link with anything but its Wayback copy; commits,
pushes or merges; touches `src/`, the bundle or any file outside `mini-courses/caravan/` and the run
folder.

The author reviews **a short report and a proposed diff** (the report's shape is in SKILL.md).

---

## 8. The author's gates

| Gate | The agent hands over | The author decides | Recorded where |
|---|---|---|---|
| **A, the candidates** (backfill; and new candidates in maintenance) | `candidates.yaml`: per candidate a working name, the first month seen, 3 to 6 leads (fetched URL, real title, date), the families it appears in, "trend" or "event", and suggested merges | keep, merge, rename, drop; whether an event stays | `decisions.yaml` in the run folder, in his words with the date; dropped candidates are listed in the PROGRESS entry |
| **B, each trend** | per trend: a chart of each family and the combined level by month; the proposed start and end and why (which months crossed which rule); the seed and 3 to 5 candidate sources, each verified; evidence notes (dated facts with a source id, no prose); every flag (health, precision, disagreement, unverified) | start, end, `named`, the 2 or 3 sources, the modules, overrides with reasons; then **he writes** the title, "what" and "why" | `trends.yaml` (his text, `approved`); overrides in `adjust` |
| **C, the diff** | the diff of `mini-courses/caravan/`, the validation and test output, the build preview of `/caravan/` once the page exists, the PROGRESS entry draft | approve, or send back | the pull request (main requires one); the PROGRESS entry |

A source the agent cannot fetch (LinkedIn, an X post found by hand, a Google Trends CSV) enters only
through the author: he pastes the URL or drops the file in the run folder, and confirms the title
and date he sees. It is recorded `via: manual`, with the day he confirmed it. A source that only he
can see (a LinkedIn post behind a login) cannot be one of the sources a reader is shown (Q7).

---

## 9. Decisions recommended, and what each rejects

1. **YAML under `mini-courses/caravan/`.** Rejected: one markdown file per trend (the structure
   outweighs the two sentences, and markdown would enter the corpus link checks); JSON (no comments,
   and the author edits this file); a file in `src/` (content in the app breaks rule 2);
   `scratchpad/` (the author's, not ours).
2. **Three kinds of file.** Rejected: one file holding the author's text, the ledger and the counts
   (an agent's 48 months of counts and the author's two sentences in one diff make the gate
   unreadable, and blur who wrote what).
3. **The level is computed by the build from the counts.** Rejected: levels typed by a person (a
   number nobody can check, rule 12); levels written by the measurer into `trends.yaml` (a number
   restated from the evidence, which drifts, rule 2).
4. **A monthly series of levels 0 to 5.** Rejected: one value per trend, as in C2's sample (it cannot
   draw the land over time); a continuous score on the page (false precision from rough evidence).
5. **Shares, a per-family percentile scale, the median, and the two-family rule.** Rejected: raw
   counts (recency bias); each trend scaled to its own peak (every trend reaches 5); the mean (one
   hot family decides).
6. **Seeds never raise the level.** Rejected: counting announcements (measures marketing output).
7. **Quarterly, on settled months.** Rejected: monthly (noise, and twelve gates a year); yearly
   (stale, links die unseen).
8. **Agents never write `text`.** Rejected: an agent drafts and the author edits. It breaks STORY.md's
   rule, and a draft anchors the author's sentence.
9. **No category field now.** The author's words. Rejected: keeping one "for later" (an unread field
   drifts; adding it is additive).
10. **The run's working files are gitignored** (`.caravan/runs/<run-id>/`, a proposed `.gitignore`
    line). Rejected: committing raw responses (large, reproducible from the frozen queries) and run
    reports under `mini-courses/` (public files there are written for readers, with no workflow, per
    `mini-courses/CLAUDE.md`).
11. **Deterministic scripts for counting; agents for finding and judging.** Counting must give the
    same number twice, so it is a script with recorded parameters. Finding a seed and judging
    precision need reading, so they are agent work. Rejected: agents counting by hand (not
    repeatable); scripts finding seeds (they cannot tell a trend from an event).

---

## 10. Open questions for the author

1. **Q1. Grain.** A stop per month or per season? The levels are monthly either way; this only changes
   the page (C2's "Grain").
2. **Q2. Intensity.** The mix in 5.3 (H3 measured, H2 as the guard, H1 as the override), or one of C2's
   options alone?
3. **Q3. Translations.** Are the title, "what" and "why" in Turkish and Persian? If yes, written as the
   modules' translations are (from the final English, under rules 14 and 17), or by you? The
   project translates content and keeps the interface in English, so Caravan's text would be content.
4. **Q4. The node format.** N1 to N4 in C2. It sets which fields Gate B asks you for.
5. **Q5. How many trends.** One to three a season gives 16 to 48 over the 16 seasons from 2022-11 to 2026-10. A target helps
   the proposer stop merging or splitting.
6. **Q6. Google Trends.** Will you export the CSVs by hand (a fixed comparison set with one anchor term,
   since Trends scales 0 to 100 per request), or should the `public` family use Wikipedia alone?
7. **Q7. LinkedIn and X.** May a LinkedIn post be one of the sources a reader sees, when a reader may
   need a login to open it? I recommend: it may suggest a trend, but the sources shown are public.
8. **Q8. API keys.** A Semantic Scholar key (the bulk search hit 429 without one), and whether the GitHub
   token in `gh` may be used by the runs.
9. **Q9. When a trend ends.** Many trends do not fade; they become normal practice (the MCP numbers in
   5.5 look like that). Is that an `end`, or a trend that stays on the road? A third state
   (`absorbed`) is possible, but it adds a field.
10. **Q10. Model releases.** Excluded as trends. May a release still be a trend's seed (recommended), or
    should seeds also avoid releases?
11. **Q11. Provenance on the page.** Rule 1 of ARCHITECTURE says a page never presents a claim as checked
    when it is not; rule 16 of the MANIFESTO says the page does not explain itself. Should Caravan
    link to the method (for example a short public page about how the land is measured), or show
    nothing?
12. **Q12. The run folder.** `.caravan/runs/` gitignored (recommended), or committed somewhere?

---

## 11. What has to be built before the first run

A site milestone, after the design pick, so the first run has tools to call:

- `scripts/lib/caravan-intensity.mjs` (the pure function, versioned) and its unit test, mutation-tested.
- `src/lib/content/caravan-file.ts` (the ten rules) and its tests, each rule seen failing.
- `scripts/caravan/collect-<family>.mjs` for the count families (`hn`, `github_repos`,
  `github_stars`, `research`, `public`), each writing `{ n, base, fetched, exhaustive, error }` per
  month and refusing an error reply that looks like data (trap 4).
- `scripts/caravan/verify-sources.mjs` (re-fetch, the title and date rules, the Wayback lookup).
- `scripts/caravan/check.mjs` (the same validation as the build, plus the levels), and
  `scripts/caravan/preview.mjs` (writes the Gate B chart into the run folder).
- The `.gitignore` line for `.caravan/`, and the skill moved from this draft to
  `.claude/skills/caravan/SKILL.md`.

Until they exist, [`SKILL.md`](SKILL.md) gives the raw requests that were tested here, so a first,
small run (one season, a few trends) can test the method by hand.
