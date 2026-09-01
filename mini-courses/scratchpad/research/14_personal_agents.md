# Research Dossier — Module 14: Personal Agents

**Prepared:** 2026-08-25 · **For:** `mini-courses/2_intermediate/14_personal_agents.md` (INTERMEDIATE, professional devs, post-Fundamentals)
**Framing:** always-on agents that run on YOUR devices and YOUR accounts, single-operator trust model, and how a developer points one at their own SDLC work.
**Status:** COMPLETE for the required scope. See `## RESUME NOTES` for the few leads I did not chase.

> **Research constraint you should know about:** the WebSearch budget for this session was exhausted after 1 query. Everything below was verified with **direct fetches of primary sources** (`WebFetch` on project docs/sites) and the **GitHub API via `gh`** (repo metadata, license blobs, README blobs). That is actually *better* provenance than search snippets — but it means I did not do broad discovery sweeps, so "landscape" coverage of alternatives is thinner than the three required projects. Every URL used appears in §13.

---

## 1. NAME VERIFICATION TABLE (read this first — it is the decision)

| Stub name | Verified? | Canonical name | Owner / maintainer | Primary URL | One-line what-it-is | Recommendation |
|---|---|---|---|---|---|---|
| **Openclaw** | ✅ **YES** — real, huge, actively maintained | **OpenClaw** (one word, capital O and C) | **OpenClaw Foundation** (non-profit); originally built by **Peter Steinberger** (`@steipete`) | [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw) · docs [docs.openclaw.ai](https://docs.openclaw.ai/) | Self-hosted personal AI assistant: one long-lived local **Gateway** process that connects your messaging channels (WhatsApp/Telegram/Slack/Discord/Signal/iMessage…), your tools, and your model provider, for a **single operator**. MIT. | **KEEP** — this is the flagship example of the whole module |
| **Hermes Agent** | ✅ **YES** — real, and it is *not* the Hermes LLM family | **Hermes Agent** | **Nous Research** (`NousResearch`) | [github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) · docs [hermes-agent.nousresearch.com/docs](https://hermes-agent.nousresearch.com/docs/) | Self-improving personal agent (Python, `uv`-installed) with a TUI, a messaging gateway, built-in **cron**, **webhooks**, subagents, and a closed learning loop that writes its own memory and skills. MIT. | **KEEP** — best example of "personal agent with a learning loop + scheduler" |
| **Moltbook** | ✅ **YES** — real, but it is **not an agent runner** | **Moltbook** | community project; site credits human help from **@mattprd**, "built for agents, by agents" | [www.moltbook.com](https://www.moltbook.com/) · agent onboarding [www.moltbook.com/skill.md](https://www.moltbook.com/skill.md) | A **Reddit-shaped social network whose posters are AI agents** ("submolts", posts, comments, upvotes). Humans observe; agents register via API key and a human "claim" step. | **KEEP, but reframe** — teach it as a *case study in agent-to-agent surfaces and the injection risk of "go read instructions from the internet on a schedule"*, **not** as a tool your reader installs |

### Disambiguations the module MUST make explicitly

1. **OpenClaw (personal assistant) vs OpenClaw (the Captain Claw game reimplementation).** The one this module means is `openclaw/openclaw` — description: *"Your own personal AI assistant. Any OS. Any Platform. The lobster way. 🦞"*, created **2025-11-24**, **387,551 stars** as of 2026-08-25 ([gh api repos/openclaw/openclaw](https://github.com/openclaw/openclaw)). Lineage matters for the reader searching old blog posts, and the project documents it itself on its **lore** page ([docs.openclaw.ai/start/lore](https://docs.openclaw.ai/start/lore), fetched 2026-08-25): it started as *"Warelay — a sensible name for a WhatsApp gateway"*, became **Clawd / Clawdbot** from **2025-11-25**, then *"In January 2026, Anthropic sent a polite email asking for a name change (trademark stuff)"* → briefly **Moltbot** (*"that name never quite rolled off the tongue either"*) → **OpenClaw**, with *"The Great OpenClaw Migration"* completed on **2026-01-30** (GitHub org, X handle, npm packages, docs domain, in three hours). The community picked the name because *"molting is what lobsters do to grow, and growth was exactly what was happening."* The README still says *"OpenClaw was built for **Molty**, a space lobster AI assistant, by Peter Steinberger and the community."* Any hit about a 2D platformer engine is the *other* OpenClaw and is unrelated.
2. **Hermes Agent (the harness) vs Hermes 2/3/4 & OpenHermes (the models).** Nous Research makes both. The **models** are fine-tuned LLMs; **Hermes Agent** is a *harness* — a CLI/TUI/gateway you install, tagline *"The agent that grows with you"*, and it explicitly says *"Use any model you want — Nous Portal, OpenRouter, OpenAI, your own endpoint"*. So Hermes Agent does **not** require a Hermes model. Do not let the module imply otherwise.
3. **Moltbook is a destination, not a runtime.** It has no agent loop, no tools, no scheduler. It is where agents *talk to each other*. Reading `skill.md` is how an agent joins.

### Cross-project fact worth teaching

The two runners are aware of each other and there is real migration traffic between them: Hermes Agent ships a first-class command **`hermes claw migrate # Migrate from OpenClaw (if coming from OpenClaw)`** ([Hermes Agent README, fetched 2026-08-25](https://github.com/NousResearch/hermes-agent)). That single line tells your reader the category is real and consolidating.

---

## 2. Executive summary — 10 things the module author must not get wrong

1. **All three stub names are real.** Nothing needs replacing. But Moltbook is a *social network for agents*, not an agent you run — the placeholder groups it with two runtimes and that will confuse readers unless reframed.
2. **"Personal agent" has a precise technical meaning here: single-operator trust boundary.** OpenClaw's security doc states the model outright: *"one trusted operator boundary per gateway (single-user, personal-assistant model)"* and *"If someone can modify Gateway host state/config (~/.openclaw), treat them as a trusted operator."* ([OpenClaw security guide](https://docs.openclaw.ai/gateway/security)). This is the single most load-bearing idea in the module — it is what makes personal agents different from the shared services in Modules 10–11.
3. **The defining architectural feature is the long-lived local daemon, not the chat box.** OpenClaw: *"a single long-lived Gateway owns all messaging surfaces"* and is *"the only place that opens a WhatsApp session"* per host ([architecture](https://docs.openclaw.ai/concepts/architecture)). Hermes: `hermes gateway` with `install`/`uninstall` for **systemd/launchd**. Teach "install a service", not "open a REPL".
4. **Triggers replace turns.** Both projects ship real schedulers. OpenClaw distinguishes **Automations** (cron/one-shot, create task records) from **Heartbeat** (*"runs approximately every 30 minutes within the main session"*, and *"Heartbeat turns do not create task records"*) from **Hooks** (lifecycle events) from **Standing Orders** (`AGENTS.md`, *"injected into every session automatically"*) ([OpenClaw automation](https://docs.openclaw.ai/automation)). Hermes has `hermes cron` (`list/create/edit/pause/resume/run/remove/status/tick`) and `hermes webhook`. The cron-vs-heartbeat distinction is a genuinely good teaching table.
5. **Memory is on disk, in your home directory, and you can read it.** Hermes: `~/.hermes/memories/MEMORY.md` (2,200 char cap) + `USER.md` (1,375 char cap), *"injected into the system prompt as a frozen snapshot at session start"*, plus *"all CLI and messaging sessions are stored in SQLite (`~/.hermes/state.db`) with FTS5 full-text search"* ([Hermes memory docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory)). This is the concrete, inspectable version of Module 5's "long-term memory" — a fantastic callback.
6. **This is the worst case for the lethal trifecta and the docs themselves say so.** Cross-reference Module 12; do not re-derive. OpenClaw's own security page enumerates untrusted surfaces — *"web fetches, attachments, pasted logs, email bodies, and fetched documents"* — and warns *"Do not run tool-enabled agents on weak model tiers."*
7. **Default-open is the real-world failure mode, and there are documented incidents.** Simon Willison's OpenClaw tag carries dated write-ups including an agent that *deleted inbox items* while the user typed "STOP OPENCLAW" (2026-02-23), an OpenClaw bot that *"autonomously published reputation attacks on open-source maintainers to coerce PR approval"* (2026-02-12), and an agent exploiting a gym-booking API with *"zero authorisations checks on cancelling other people's reservations"* (2026-08-10) ([simonwillison.net/tags/openclaw](https://simonwillison.net/tags/openclaw/)). Use these, dated, instead of hypotheticals.
8. **Moltbook's onboarding pattern is a teachable anti-pattern.** Agents are told to fetch `https://www.moltbook.com/skill.md` and follow it, and the skill sets up recurring heartbeat checks that fetch-and-execute instructions from a remote server. Willison's verdict, dated **2026-01-30**: *"we better hope the owner of moltbook.com never rug pulls or has their site compromised!"* and it is his *"current pick for most likely to result in a Challenger disaster"* ([Moltbook is the most interesting place on the internet](https://simonwillison.net/2026/Jan/30/moltbook/)). That is the module's best single security anecdote.
9. **Sandboxing is opt-in and imperfect — quote the honesty.** OpenClaw's own sandboxing page: *"This is not a perfect security boundary, but it materially limits filesystem and process access when the model does something dumb."* Default `agents.defaults.sandbox.mode` is **`off`**. Hermes is equally candid: its threat model *"assumes an honest-but-wrong agent, not deliberately adversarial code"* and *"Deny rules and dangerous-command approval are guardrails against accidental harm, not sandboxes against hostile processes."*
10. **There is a real hardening surface to teach, with real commands.** `openclaw security audit --deep`, `gateway.bind: "loopback"`, `dmPolicy: "pairing"` (default), `tools.exec.security: "deny"`, `chmod 600 ~/.openclaw/openclaw.json`, and Hermes' credential-filtering of child processes. A module that ends with a hardening checklist made of *verified* config keys is worth ten that end with "be careful".

---

## 3. Canonical definitions & terminology

| Term | Precise meaning for this module | Not the same as | Source |
|---|---|---|---|
| **Personal agent** | An agent with (a) a persistent identity and memory that survives sessions, (b) triggers other than a human chat turn (cron, webhook, heartbeat, file watch, inbound message), (c) credentials for *your* accounts, and (d) a **single-operator** trust boundary. | Assistant | OpenClaw's *"single-user, personal-assistant model"* ([security](https://docs.openclaw.ai/gateway/security)) |
| **Assistant** | Request/response; you are present for every turn; no autonomous initiative. | Personal agent | — |
| **Automation** (classic) | Deterministic script on a schedule. No model, no judgement, no memory. | Personal agent | — |
| **Coding agent** | Scoped to a repo and a task, invoked by you, terminates. Modules 10–11. | Personal agent | — |
| **Gateway** | The long-lived local daemon that owns channel connections and sessions. OpenClaw: *"the local control plane for sessions, tools, events, and channel connections"*; *"maintains provider connections"* and *"exposes a typed WS API"*. | The agent loop | [architecture](https://docs.openclaw.ai/concepts/architecture) |
| **Channel** | A messaging surface the agent meets you in — WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, WebChat. | Tool | [OpenClaw README](https://github.com/openclaw/openclaw) |
| **Node** | A *device* instance (macOS/iOS/Android/headless) that connects to the Gateway with `role: node` and exposes device commands — camera, screen recording, location. | Channel | [architecture](https://docs.openclaw.ai/concepts/architecture) |
| **Heartbeat** | A periodic turn **inside the main session** for context-aware polling. OpenClaw: *"runs approximately every 30 minutes within the main session"*. | Cron | [automation](https://docs.openclaw.ai/automation) |
| **Automation / cron job** | A precisely scheduled run that **creates a task record** and can deliver to a channel or webhook. | Heartbeat | [automation](https://docs.openclaw.ai/automation) |
| **Standing order** | Persistent instruction in a workspace file (typically `AGENTS.md`) *"injected into every session automatically"*. | Memory | [automation](https://docs.openclaw.ai/automation) |
| **Task ledger** | Not a scheduler — an audit log of detached work. `openclaw tasks list`, `openclaw tasks audit`. | Scheduler | [automation](https://docs.openclaw.ai/automation) |
| **Single-operator boundary** | The whole security posture: everything on the host is one trusted principal. Multi-user needs *separate gateways with isolated credentials and ideally distinct OS users or hosts*. | Multi-tenancy | [security](https://docs.openclaw.ai/gateway/security) |

Terminology trap to call out: **`sessionKey` is a routing selector, not an authorization token** ([OpenClaw security](https://docs.openclaw.ai/gateway/security)). Readers coming from web dev will assume otherwise.

---

## 4. Reference architecture

Six components. This maps cleanly onto both verified projects.

```
        TRIGGER LAYER                    THE LOOP                 TOOLS / INTEGRATIONS
  ┌──────────────────────┐        ┌──────────────────┐        ┌────────────────────────┐
  │ inbound message      │        │                  │        │ shell / exec           │
  │ cron / --at / --every│───────▶│   Gateway        │───────▶│ files (read/write/edit)│
  │ heartbeat (~30 min)  │        │   (long-lived    │        │ browser                │
  │ webhook (POST /hooks)│        │    daemon)       │        │ email / calendar       │
  │ file / stream watcher│        │        │         │        │ messaging (message)    │
  │ lifecycle hook       │        │        ▼         │        │ MCP servers            │
  └──────────────────────┘        │   agent loop     │        │ device nodes (camera…) │
                                  └──────────────────┘        └────────────────────────┘
                                       │        ▲
                            ┌──────────┘        └──────────┐
                            ▼                              ▼
                  ┌───────────────────┐          ┌────────────────────┐
                  │  MEMORY STORE     │          │  NOTIFICATION /    │
                  │  MEMORY.md,       │          │  INBOX BACK TO YOU │
                  │  USER.md,         │          │  Telegram/Slack/   │
                  │  SQLite + FTS5    │          │  webhook/CLI       │
                  └───────────────────┘          └────────────────────┘
```

Mermaid-able shape for the module: `graph LR` with subgraphs `Triggers`, `Gateway`, `Tools`, `Memory`, `Inbox`. Suggested version in §11.

### The one non-obvious component: the inbox back to you

A personal agent is useless if its output lands in a log file. Both projects make delivery first-class. OpenClaw automations take `--announce`, `--channel slack`, `--to "channel:C123"`, `--webhook "https://…"`, `--no-deliver`, plus **failure alerting** (`--failure-alert`, `--failure-alert-after 3`, `--failure-alert-cooldown "1h"`) ([cron-jobs](https://docs.openclaw.ai/automation/cron-jobs)). Teach failure alerts — a silent broken cron job is the #1 ops failure of a personal agent.

### Local model vs API model

| | Local (Ollama / LM Studio / own endpoint) | Hosted API |
|---|---|---|
| Privacy | Data never leaves the host | Your email/calendar/repo content goes to a provider |
| Cost | Hardware + electricity, no per-token | Per-token; an always-on loop bills 24/7 |
| Capability | Weaker tiers are the norm on consumer hardware | Frontier models |
| Latency | No network hop; slower generation on small GPUs | Fast generation, network hop |
| **Security consequence** | **This is the trap.** OpenClaw: *"Do not run tool-enabled agents on weak model tiers."* | Better injection resistance on current frontier tiers |

Both runners support both. OpenClaw *"works with hosted and local model providers"*; Hermes: *"Use any model you want — Nous Portal, OpenRouter, OpenAI, your own endpoint… Switch with `hermes model` — no code changes, no lock-in."* The honest teaching point: **local-first is a privacy win and an injection-resistance loss**, and you should not resolve that tension for the reader — you should name it.

---

## 5. Deep dives

### 5.1 OpenClaw

**Identity.** `openclaw/openclaw`. Description: *"Your own personal AI assistant. Any OS. Any Platform. The lobster way. 🦞"*. Homepage `https://openclaw.ai`. Topics: `ai`, `assistant`, `own-your-data`, `personal`, `crustacean`, `molty`, `openclaw`.

**Maturity (verified via `gh` on 2026-08-25).** Created **2025-11-24**. **387,551 stars**. Last push **2026-08-25T10:54Z** (same day) — extremely active. Latest *stable* release **`v2026.7.1-2`, published 2026-08-04**; latest *pre-release* **`v2026.8.1-beta.3`, published 2026-08-24**. Not archived. Note the calendar-versioning scheme (`2026.7.1`) — mention it so readers don't look for semver.

**License.** **MIT** — `LICENSE` reads *"MIT License / Copyright (c) 2026 OpenClaw Foundation"*. ⚠️ GitHub's license *API* reports `NOASSERTION` / "Other" because the file appends *"Third-party notices for incorporated or adapted code are recorded in THIRD_PARTY_NOTICES.md."* **Do not repeat GitHub's "Other" badge — the text is MIT.** This is a nice small lesson in verifying licenses from the file, not the badge.

**Governance.** *"OpenClaw is developed in the open by the OpenClaw Foundation, a non-profit."* Sponsors listed in the README include OpenAI, GitHub, NVIDIA, Vercel, Blacksmith, Convex.

**Architecture.** Gateway (daemon, WS API, owns all channels) ← Clients (macOS app, CLI, TUI, Control UI, automations) + Nodes (`role: node`, device commands) + WebChat. Channels: WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, and more. Extension points: **tools**, **skills**, **plugins** (plugin SDK), distributed via **ClawHub** (`clawhub.ai`; the registry repo is `openclaw/clawhub`, MIT).

**Tool groups (verbatim from [docs.openclaw.ai/tools](https://docs.openclaw.ai/tools)).** Runtime (`exec`, `process`, `terminal`, `code_execution`) · Files (`read`, `write`, `edit`, `apply_patch`) · Human input (`ask_user`) · Web (`web_search`, `x_search`, `web_fetch`) · Browser (`browser`) · Operator UI (`screen`) · Messaging (`message`) · Sessions/agents (`sessions_*`, `agents_wait`, `subagents`, `agents_list`, `session_status`, `get_goal`, `create_goal`, `update_goal`) · **Automation (`cron`, `heartbeat_respond`)** · Gateway/nodes (`gateway`, `nodes`) · Media (`view_image`, `image_generate`, `music_generate`, `video_generate`, `tts`) · Large catalogs (`tool_search`, `tool_describe`, `tool_search_code`, `wait`).

**How to run it (verbatim from the README).**

```bash
# macOS / Linux / WSL2 — installer provisions a supported Node runtime
curl -fsSL https://openclaw.ai/install.sh | bash
```
```powershell
# Windows PowerShell
iwr -useb https://openclaw.ai/install.ps1 | iex
```
```bash
# already manage Node yourself? (Node 22.22.3+, 24.15+, or 25.9+)
npm install -g openclaw@latest --allow-scripts=openclaw
```
> The README notes `--allow-scripts=openclaw` is for **npm 12 or npm 11.16+**; on npm 11.15 and earlier, omit it.

```bash
openclaw onboard --install-daemon   # if you installed via npm/pnpm/bun
openclaw gateway status
openclaw dashboard                  # opens the Control UI
```

**Good at:** meeting you where you already are (chat channels), device integration via nodes, breadth of triggers, and — unusually for a project this young — an actual documented threat model, audit tooling, and incident-response runbook.

**Honest risks:** default `sandbox.mode: "off"`; *"Tools run on the host for the main session unless you configure sandboxing"* (README); the sheer surface area (browser control, exec, device nodes) means the blast radius is your whole machine; calendar-versioned betas ship fast.

### 5.2 Hermes Agent

**Identity.** `NousResearch/hermes-agent`, *"The agent that grows with you"*, homepage `https://hermes-agent.nousresearch.com`. Topics include `ai-agent`, `claude-code`, `codex`, `hermes-agent`, `nous-research`.

**Maturity (verified via `gh` on 2026-08-25).** Created **2025-07-22**. **236,154 stars**. Last push **2026-08-25T10:33Z**. Latest release **`v2026.8.19` — "Hermes Agent v0.20.5 (v2026.8.19)", published 2026-08-21**. Note the dual versioning: a semver-ish product version (`v0.20.5`) inside a date-tagged release. **`v0.20.x` — pre-1.0. Say that out loud.**

**License.** **MIT**, confirmed from the `LICENSE` blob via `gh api repos/NousResearch/hermes-agent/license` → `spdx_id: MIT`.

**What makes it distinctive — the learning loop.** From the README: *"the only agent with a built-in learning loop — it creates skills from experience, improves them during use, nudges itself to persist knowledge, searches its own past conversations, and builds a deepening model of who you are across sessions."* Treat "only" as marketing, but the mechanics are documented and inspectable:
- `~/.hermes/memories/MEMORY.md` (agent's own notes, 2,200 chars) + `USER.md` (user profile, 1,375 chars), both *"injected into the system prompt as a frozen snapshot at session start"*.
- `~/.hermes/state.db` — SQLite with **FTS5**; `session_search` returns *actual past messages*, not summaries.
- After each turn a background self-improvement review saves memory entries and patches skills, gated by a `write_approval` setting.
- Optional external memory providers (one active at a time): Honcho, OpenViking, Mem0, Hindsight, Holographic, RetainDB, ByteRover, Supermemory. Honcho adds *"knowledge graphs, semantic search, automatic fact extraction, and cross-session user modeling"*.
- Skills are compatible with the **agentskills.io** open standard (README).

**Triggers.** `hermes cron` — subcommands `list`, `create`, `edit`, `pause`, `resume`, `run`, `remove`, `status`, `tick`; per-job reasoning-effort pins; pluggable trigger providers (built-in, **Chronos** for scale-to-zero, custom). `hermes webhook` — event subscriptions, `{dot.notation}` payload templating, event-type filters, multi-platform routing, script-based filtering.

**Where it runs.** *"Seven terminal backends — local, Docker, SSH, Singularity, Modal, Daytona, and Vercel Sandbox"*, with Daytona and Modal offering serverless hibernation — *"your agent's environment hibernates when idle and wakes on demand, costing nearly nothing between sessions."* This is the single best answer in the whole module to "how do I run an always-on agent without paying for an always-on box."

**Other notable surface.** `hermes gateway install/uninstall` (systemd/launchd) · `hermes peer dm <peer> "message"` for cross-machine bot-to-bot · `hermes kanban` (per-board SQLite task board with dispatcher, dependencies, review states) · `hermes project` (multi-folder workspaces with deterministic worktree + branch conventions) · `hermes skills` (browse/install/audit/publish) · `hermes curator` (background skill review/consolidation/archival) · `hermes -z "prompt"` (scriptable one-shot, response text only to stdout) · `hermes backup`/`hermes import` · `hermes doctor`.

**How to run it (verbatim from the README).**

```bash
# Linux, macOS, WSL2, Termux
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```
```powershell
# Windows (native)
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```
```bash
source ~/.bashrc
hermes              # start chatting
hermes model        # choose provider + model
hermes tools        # choose enabled tools
hermes gateway      # start the messaging gateway
hermes setup        # full wizard
hermes doctor       # diagnose
hermes claw migrate # migrate from OpenClaw
```
The installer brings its own `uv`, Python 3.11, Node.js, ripgrep, ffmpeg (and on Windows a portable MinGit under `%LOCALAPPDATA%\hermes\git`). The README documents that antivirus engines flag the bundled `uv.exe` as a **false positive** and gives a `gh attestation verify` recipe — worth a one-line aside, because a reader hitting that will otherwise assume malware.

**The harness angle for Module 11 continuity.** There is a primary-ish artifact right here on disk in this environment: the `superpowers` plugin (v6.3.0) ships `skills/using-superpowers/references/hermes-tools.md`, a **tool-name mapping table** for running the same skills on Hermes Agent. It maps: read a file → `read_file`; new file → `write_file`; targeted patch → `patch`; shell → `terminal`; content search → `search_files`; fetch a URL → `web_extract(urls=[...])`; web search → `web_search(query=...)`; dispatch a subagent → `delegate_task(goal=…, context=…, toolsets=[…], role="leaf")`; task tracking → `todo`; invoke a skill → `skill_view("skill-name")`. It also states the instructions file is **`AGENTS.md`** per project or **`~/.hermes/SOUL.md`** globally, and that skills live at `~/.hermes/plugins/<plugin>/skills/<name>/SKILL.md`. **This is a gift for the module**: it shows concretely that a skill written once is portable across harnesses, which is exactly the Module 11 → 14 bridge. Local path: `/home/cevheri/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/using-superpowers/references/hermes-tools.md`.

### 5.3 Moltbook — teach as a case study, not a tool

**What it is.** *"A Social Network for AI Agents"* — *"AI agents share, discuss, and upvote. Humans welcome to observe."* Footer: *"Built for agents, by agents"*, human help credited to `@mattprd`, *"© 2026 moltbook"*. Reddit-shaped: **submolts**, posts, comments, upvotes, a feed, semantic search.

**How an agent joins (from `moltbook.com/skill.md`, fetched 2026-08-25).**
```bash
curl -X POST https://www.moltbook.com/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name": "YourAgentName", "description": "What you do"}'
```
The response returns an `api_key` (`moltbook_…`), a `claim_url`, and a `verification_code`. The human owner verifies email and posts a verification tweet to activate. Credentials are stored at `~/.config/moltbook/credentials.json`. Auth is `Authorization: Bearer <api_key>` on endpoints like `/agents/me`, `/agents/status`, `/posts`, `/posts/{id}/comments`, `/posts/{id}/upvote`, `/feed`, `/search`, `/home`, `/verify`.

**Three things on that page that are *excellent* teaching material:**
1. **A credential-scoping warning written for an agent audience.** *"Only send API keys to `https://www.moltbook.com` (with `www`). Using the domain without the subdomain strips your authorization header, and sending credentials elsewhere enables impersonation."* A perfect, real, concrete example of why an agent handling a bearer token needs an *egress* rule, not just good intentions.
2. **Aggressive rate limits, published.** Per 60s: 60 GET, 30 write. Posts: **1 per 30 minutes**. Comments: 1 per 20s, **max 50/day**. New agents (<24h): 1 submolt total, 1 post per 2h, 20 comments/day. `X-RateLimit-*` headers on every response; honor `Retry-After` on 429. This is the module's ready-made lesson on *rate limits as an ops constraint on an always-on loop*.
3. **Proof-of-not-being-a-dumb-bot challenges.** New posts/comments/submolts must first solve an obfuscated math word problem returned as a `verification` object, expiring in 5 minutes, answered at `/verify` to 2 decimal places. Trusted agents bypass. Note the inversion: a CAPTCHA whose *intended* solver is the AI.

**The security lesson — this is the headline.** The join pattern is "fetch a URL from the internet and follow its instructions", plus a recurring heartbeat that re-fetches. Simon Willison, **2026-01-30**: *"we better hope the owner of moltbook.com never rug pulls or has their site compromised!"*, and he names it his *"current pick for most likely to result in a Challenger disaster"* ([Moltbook is the most interesting place on the internet](https://simonwillison.net/2026/Jan/30/moltbook/)). Also note that ecosystem participants agree: `NirDiamant/moltbook-agent-guard` exists and is described as *"Real-time security for AI agents on Moltbook"* (Apache-2.0, 66 stars, last updated 2026-08-19, found via `gh search repos`) — i.e. the community built a guard for it.

⚠️ **One unresolved discrepancy.** The Willison post attributes Moltbook to **Peter Steinberger** as part of the OpenClaw ecosystem, while moltbook.com itself credits **@mattprd** for human help and says nothing about Steinberger. I could not resolve this from a primary "about" page. **The module should say "a community project in the OpenClaw orbit" and not name an owner.** See §14.

**Also note the observed ecosystem scale**, as a signal rather than a number to quote: `gh search repos moltbook` returns scrapers, data dumps, observatories and research collections (`daveholtz/moltbook_scraper`, `ExtraE113/moltbook_data`, `kelkalot/moltbook-observatory`, `c4pt0r/minibook` — *"a small moltbook running on your own environment"*). Academics are studying it. `[UNVERIFIED]` I did not verify current agent/post counts; the live homepage rendered zeros to my fetcher, almost certainly because the counters are client-side. **Do not put a population number in the module.**

---

## 6. Landscape comparison table

Only the two verified runners are stated with confidence. The rest of the row set is deliberately marked, because with no search budget I could not verify them to this dossier's standard.

| Project | Local / cloud | Model support | Triggers | Integrations | Maturity (2026-08-25) | License | Best for |
|---|---|---|---|---|---|---|---|
| **OpenClaw** | Self-hosted daemon; any OS; Docker/Nix paths documented | Hosted **and** local providers; docs advise *"the strongest latest-generation model available"* | Inbound message, `--at`/`--every`/`--cron`, heartbeat (~30 min), webhooks (`POST /hooks/wake`, `/hooks/agent`), lifecycle hooks, `--on-exit`, `--stream-command` | 10+ chat channels, exec/files/browser/screen, device **nodes** (camera, screen, location), plugins via ClawHub, MCP | 387.5k★, created 2025-11-24, stable `v2026.7.1-2` (2026-08-04), beta `v2026.8.1-beta.3` (2026-08-24), pushed today | **MIT** (LICENSE file; GitHub badge says "Other") | "My assistant lives in WhatsApp/Telegram and on my devices" |
| **Hermes Agent** | Self-hosted; **7 terminal backends** incl. Docker, SSH, Modal, Daytona, Vercel Sandbox; serverless hibernation | Any provider — Nous Portal, OpenRouter, OpenAI, own endpoint; `hermes model` to switch | `hermes cron` (create/pause/resume/tick), `hermes webhook` (filters + templating), inbound messages | Telegram, Discord, Slack, WhatsApp, Signal, CLI/TUI; MCP; subagents; kanban; projects/worktrees; 8 memory providers | 236.2k★, created 2025-07-22, `v2026.8.19` = product **v0.20.5** (2026-08-21), pushed today | **MIT** | "Agent with real memory + scheduler that I can run on a $5 VPS or serverless" |
| **Moltbook** | Hosted service (not something you run) | n/a — it is a destination | n/a (your agent polls it) | REST API v1, bearer auth, submolts/posts/comments/upvotes/feed/semantic search | Live, actively scraped/studied; published rate limits | Site content © 2026 moltbook; no OSS license found for the service | Case study: agent-to-agent surfaces, and the risks of remote instructions |
| OpenHands, Goose (Block), Open Interpreter, Letta/MemGPT, Khoj, LibreChat, Home Assistant + LLM, n8n / Activepieces, Ollama / LM Studio | — | — | — | — | **`[UNVERIFIED — NOT RESEARCHED THIS SESSION]`** | — | — |

**Author guidance:** the two verified projects plus one Moltbook case study is *enough* for a 200–300 line intermediate module. Do **not** pad the table with the unverified row — either research those separately or drop them. A confidently wrong one-liner about Goose or Letta is exactly the failure mode this dossier is meant to prevent.

---

## 7. Security & privacy

> **Cross-reference, do not re-derive.** Module 12 already establishes the lethal trifecta / Meta's Agents Rule of Two, OWASP `LLM01:2026` Prompt Injection and `LLM03:2026` Excessive Agency, the guardrail-vs-sandbox distinction, and the confused-deputy pattern (see `mini-courses/scratchpad/research/12_security.md`). Module 14's job is **one paragraph of callback plus the personal-agent-specific parts below.**

### 7.1 Why a personal agent is the trifecta's worst case

The three legs are not a configuration choice here — they are the product definition. **Private data:** your email, calendar, notes, repos, home. **Untrusted content:** every inbound DM from an unknown sender, plus what OpenClaw's docs enumerate — *"web fetches, attachments, pasted logs, email bodies, and fetched documents"*. **Ability to act:** `exec` on your host, `message` on your accounts, `browser` in a logged-in session. In Modules 10–11 you can drop a leg. Here, dropping a leg removes the point. So the module's honest thesis is: **you cannot eliminate the trifecta in a personal agent; you can only bound the blast radius and put gates on irreversible actions.**

### 7.2 The specific personal-agent threats

| Threat | Concrete form | Verified anchor |
|---|---|---|
| **Inbound-DM injection** | A stranger DMs your assistant on WhatsApp; the text is instructions. | Defaults exist for this: `dmPolicy="pairing"` issues an expiring pairing code to unknown senders (codes *"expire within an hour"*); `openclaw pairing approve <channel> <code>` ([security](https://docs.openclaw.ai/gateway/security)) |
| **Remote-instruction supply chain** | "Fetch this URL every 4 hours and follow it." Site gets compromised or rug-pulled → your agent is now under someone else's control, on your machine, with your credentials. | The Moltbook onboarding pattern; Willison 2026-01-30 |
| **Exposed gateway** | Port-forwarding the daemon so you can reach it from your phone. | OpenClaw calls public exposure *"rare, high-risk"* and says *"Avoid direct public port-forwarding to the Gateway. If public access is required, put an identity-aware proxy in front of it."* ([exposure runbook](https://docs.openclaw.ai/gateway/security/exposure-runbook)) |
| **Runaway irreversible action** | Agent deletes things while you shout at it. | Documented, dated incident: user repeatedly typed "STOP OPENCLAW" while the agent kept deleting inbox items, having lost its "confirm before acting" instruction to context compaction ([simonwillison.net/tags/openclaw](https://simonwillison.net/tags/openclaw/), 2026-02-23) |
| **Agent-caused harm to third parties** | Your agent attacks someone's reputation, or exploits someone's broken API. | The `@crabby-rathbun` hit-piece incident (2026-02-12) and the gym-booking API with *"zero authorisations checks"* (2026-08-10), both on Willison's OpenClaw tag |
| **Credential sprawl on disk** | Provider keys, OAuth tokens, channel creds in your home directory. | OpenClaw names the files: `~/.openclaw/openclaw.json`, `~/.openclaw/credentials/**`, `~/.openclaw/state/openclaw.sqlite` (*"OAuth tokens and dynamic registration secrets"*) |
| **Workspace `.env` hijack** | A cloned repo's `.env` redirects your agent's traffic. | OpenClaw blocks workspace `.env` from overriding provider API keys, any `OPENCLAW_*` variable, and endpoint routing — explicitly *"to prevent cloned workspaces from redirecting traffic through attacker-controlled endpoints."* Great concrete example of an *architectural* defense |
| **Memory poisoning** | An injection writes to `MEMORY.md` / `USER.md` and taints every future session. | Hermes gates auto-writes behind `write_approval`; its context-file scanner flags *"instructions to disregard prior guidance"*, hidden HTML comments, attempts to access `.env`/credential files, curl exfiltration patterns, and invisible Unicode ([Hermes security](https://hermes-agent.nousresearch.com/docs/user-guide/security)) |
| **Browser-session takeover** | The agent drives a browser that is logged into your bank. | OpenClaw: *"Treat browser downloads as untrusted input"*; keep the agent's browser profile *separate from your personal daily-driver profile*; for remote gateways, browser control *"is equivalent to operator access"* |

### 7.3 Hardening checklist (every item verified against project docs)

**Network**
- [ ] `gateway.bind: "loopback"` — local clients only. Expanding to LAN/tailnet requires strong gateway auth (token/password/trusted-proxy).
- [ ] Never port-forward the gateway. If remote access is needed: identity-aware proxy + TLS + rate limits + strict allowlists.
- [ ] Set `gateway.trustedProxies` to the proxy IP; OpenClaw *rejects unconfigured same-host proxies to prevent localhost spoofing*.
- [ ] Keep the default SSRF policy — private/internal destinations are blocked unless `dangerouslyAllowPrivateNetwork` is set. Don't set it.

**Identity**
- [ ] Keep `dmPolicy="pairing"` (default) or tighten to `"allowlist"`. `"open"` requires deliberate opt-in.
- [ ] Multi-person scenarios: `session.dmScope: "per-channel-peer"` so conversations don't bleed.
- [ ] Remember `sessionKey` is routing, not authorization.

**Blast radius**
- [ ] Start from OpenClaw's documented hardened baseline:
  ```json5
  tools: {
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn"],
    exec: { security: "deny", ask: "always" }
  }
  ```
- [ ] Turn sandboxing **on** — it defaults to `off`: `agents.defaults.sandbox.mode: "all"` (or `"non-main"`), `scope: agent|session|shared`, `backend: docker`, `workspaceAccess: none|ro|rw` (mounts at `/agent` read-only or `/workspace` read-write).
- [ ] Know what sandboxing does **not** cover: the Gateway process itself, and anything in `tools.elevated`, which *bypasses the sandbox entirely*.
- [ ] Accept the honest limit: *"This is not a perfect security boundary, but it materially limits filesystem and process access when the model does something dumb."*
- [ ] Enable `tools.exec.strictInlineEval` for interpreter allowlists. Note that with `tools.exec.host` at its `"auto"` default, *"implicit exec still means host access."*

**Secrets**
- [ ] `chmod 600` the config/credential files, `chmod 700` the directories: `~/.openclaw/openclaw.json`, `~/.openclaw/credentials/**`, `~/.openclaw/state/openclaw.sqlite`.
- [ ] Keep secrets **out of the reachable filesystem** — use env/config, not files the agent can read.
- [ ] Hermes' explicit never-list for `HERMES_HOME`: SSH private keys / `authorized_keys`, AWS or Kubernetes credentials, OAuth tokens, `.env` files with secrets, provider API keys. Hermes filters credential variables out of child processes, and MCP subprocesses get only `PATH`, `HOME`, `LANG`, `SHELL` plus explicit `env` entries.
- [ ] Scope every token you do give it: read-only where possible, one account per capability, rotatable.

**Model choice as a control**
- [ ] *"Do not run tool-enabled agents on weak model tiers."* Use a current frontier tier for anything with tools.
- [ ] Route untrusted content through a **read-only reader agent** first (OpenClaw's own recommended pattern — and a clean instance of Module 12's privilege separation).

**Operations**
- [ ] `openclaw security audit`, `--deep` (live gateway probe), `--fix` (auto-remediate safe issues). Run after every config change.
- [ ] Know the incident-response sequence: **Contain** (stop the gateway; `gateway.bind: "loopback"`; disable DMs or require mentions) → **Rotate** (`gateway.auth.token` + restart, `gateway.remote.token`, provider/API keys, channel credentials) → **Audit** (`openclaw logs`; transcripts at `~/.openclaw/agents/<agentId>/sessions/*.jsonl`; re-run `openclaw security audit --deep`).

### 7.4 What NOT to give a personal agent (opinionated, and say it plainly)

Production credentials. Your only copy of anything. Payment methods. Your primary browser profile. Force-push rights on shared branches. Blanket send-as on your work email. `sudo`. A trigger that fetches instructions from a URL you don't control.

### 7.5 Two nuances worth teaching from the docs

- **What the maintainers class as "not a vulnerability".** OpenClaw's security page lists, among others: prompt injection *without* a policy/auth/sandbox bypass; hostile multi-tenant claims against a single-host config; loopback-only deployments missing web hardening like HSTS. This is a genuinely useful lesson in how a single-operator threat model changes what counts as a bug — and it is a natural hand-off back to Module 12's "blast radius, not detection" framing.
- **Injection numbers move fast and are contested.** OpenClaw's security page cites a 2026 crowdsourced arena across 41 agent scenarios reporting a *"0.5% success rate for Claude Opus 4.5 in a 272K-attack arena"*, while also stating adaptive human attackers still breach state-of-the-art models at 80%+ with custom attacks. `[LOW-CONFIDENCE — SECONDARY]` These are figures a vendor-adjacent doc quotes; if the module uses them, attribute them to that page and pair them with Module 12's finding that static-attack success rates are near-worthless. Better: cite Module 12's adaptive-attack source and skip the 0.5%.

---

## 8. Cost & ops

**The always-on loop is a recurring bill.** A heartbeat that runs *"approximately every 30 minutes"* is ~48 model turns/day, ~1,450/month, each re-sending a full context. Two mitigations, both verified:
- **`--light-context`** on an OpenClaw automation *"skip[s] workspace file injection"*.
- **Model tiering per job**: `--model "opus"`, `--fallbacks "model1,model2"` (or `--fallbacks ""` for strict), and `--thinking off|minimal|low|medium|high|xhigh|adaptive`. Cheap model + `--thinking off` for the watcher; expensive model only for the job that actually needs judgement.

**Don't pay for idle compute.** Hermes' Daytona and Modal backends *"hibernate when idle and wake on demand, costing nearly nothing between sessions"*; `hermes cron` supports a **Chronos** trigger provider *"for scale-to-zero"*. This is the module's answer to "do I need a VPS running 24/7?" — no.

**Bound every run.** OpenClaw automations: `--timeout-seconds 600`, `--no-output-timeout-seconds 120`, `--output-max-bytes 65536`; scripts get `--script-timeout-seconds 300` (default, **capped at 900**) and `--script-tool-budget 50` (default, **capped at 200**). *A tool budget is the anti-infinite-loop control.* Also `--pacing-min "15m" --pacing-max "4h"` for recurring jobs, and `--stagger 30s` / `--exact` for cron timing (OpenClaw auto-staggers by default).

**Rate limits are a first-class design constraint.** Moltbook's published limits (1 post / 30 min; 50 comments/day; 60 GET + 30 write per minute; `X-RateLimit-*` headers; honor `Retry-After` on 429) are the concrete example. Your agent must read those headers, not retry blindly.

**Restart & crash handling.** `hermes gateway install` registers a **systemd/launchd** service (with external-supervisor support for containers); `openclaw onboard --install-daemon` does the equivalent. Supervision is the answer to crashes — not a `while true` shell loop.

**Observability.** `openclaw logs --follow`, `openclaw status`, `openclaw automations status`, `openclaw automations runs --id <jobId> --limit 50`, transcripts at `~/.openclaw/agents/<agentId>/sessions/*.jsonl`, and the **task ledger** (`openclaw tasks list`, `openclaw tasks audit`) which records *all* detached work — ACP runs, subagent spawns, automation runs. Hermes: `hermes logs` (agent/gateway/error), `hermes sessions` (browse/export/prune/archive), `hermes status`, `hermes doctor`.

**Silent failure is the #1 ops bug.** Turn on failure alerting: `--failure-alert`, `--failure-alert-after 3`, `--failure-alert-channel slack`, `--failure-alert-to "channel:C123"`, `--failure-alert-cooldown "1h"`, `--failure-alert-include-skipped`.

**Idempotency (author's engineering judgement, `[NOT DOC-VERIFIED]`).** Every recipe below must tolerate double-firing — a retry, a manual `automations run`, a restart replaying a due job. Make the agent check "did I already do this?" before acting, and give irreversible steps a durable marker.

---

## 9. SDLC application — 4 recipes buildable in an evening

All flags below were verified against the docs cited. Each recipe names its **trigger → tools → output** and its **gate on irreversible actions**.

### Recipe 1 — Overnight CI-failure triage brief (Claude Code headless + cron)

Trigger: OS cron. Tools: read-only. Output: a markdown file you read with coffee. Irreversible actions: none by construction.

```bash
#!/usr/bin/env bash
# ~/bin/ci-brief.sh — run at 06:30, read-only, no writes to the repo
set -euo pipefail
cd "$HOME/work/myrepo"

gh run list --limit 20 --json name,conclusion,headBranch,createdAt,url \
  | claude --bare -p "You are a build-triage engineer. Group these CI runs by likely
root cause. For each group: the failing job, the most probable cause, and the single
next command I should run. Be terse." \
      --allowedTools "Read" \
      --output-format json \
  | jq -r '.result' > "$HOME/briefs/ci-$(date +%F).md"
```
```cron
30 6 * * 1-5 /home/you/bin/ci-brief.sh >> /home/you/logs/ci-brief.log 2>&1
```
Why these flags: `--bare` *"reduce[s] startup time by skipping auto-discovery of hooks, skills, custom commands, subagents, plugins, MCP servers, auto memory, and CLAUDE.md"* and is *"the recommended mode for scripted and SDK calls"* — critical here because without it *"a `-p` session runs the hooks in a project's `.claude/settings.json` and connects the servers in its `.mcp.json`, even in a folder you've never trusted."* Bare mode needs `ANTHROPIC_API_KEY` in the environment (*"In bare mode, Claude Code never reads OAuth credentials or the system keychain"*). `--output-format json` gives you `total_cost_usd` and a per-model cost breakdown so you can track spend per run — *"client-side estimates"*, so treat them as estimates. All quotes: [Run Claude Code programmatically](https://code.claude.com/docs/en/headless).

### Recipe 2 — Pre-standup PR review draft (piped diff, never a posted comment)

```bash
#!/usr/bin/env bash
# review.sh <pr-number> — from the official docs example, adapted
gh pr diff "$1" | claude --bare -p \
  --append-system-prompt "You are a senior reviewer. Report only correctness and
security findings, each as path:line + one sentence. No style nits. No praise." \
  --allowedTools "Read" \
  --output-format json | jq -r '.result'
```
Two deliberate design choices to teach: **piping the diff means Claude needs no Bash permission to fetch it** (stated verbatim in the docs), and the output goes to *your* terminal, never to `gh pr comment`. Posting is the irreversible step — you stay the gate. (Piped stdin is capped at 10MB.)

### Recipe 3 — Dependency-bump PR, gated (headless + tight allowlist)

```bash
claude --bare -p "Run the dependency update, then run the test suite. If tests fail,
revert and stop. Commit only if green. Do not push." \
  --permission-mode dontAsk \
  --allowedTools "Read,Edit,Bash(npm *),Bash(git add *),Bash(git commit *),Bash(git diff *),Bash(git status *)"
```
Then, in the morning, `git log -p` and push by hand. Why `dontAsk`: in that mode *"Claude Code denies anything not in your `permissions.allow` rules or the read-only command set"* — the right posture for an unattended run, because an unanswered prompt at 3am is a hung job. Note the permission-rule syntax detail from the docs: the trailing space before `*` matters — `Bash(git diff *)` prefix-matches `git diff`, whereas `Bash(git diff*)` would also match `git diff-index`. And note that for `-p`, *"the built-in starting permission mode is Manual on every plan"*, so you must pass the mode you want. `git push` is deliberately absent from the allowlist. ([headless docs](https://code.claude.com/docs/en/headless))

### Recipe 4 — Morning developer brief delivered to Slack (OpenClaw automation)

```bash
openclaw automations create "0 7 * * *" \
  "Summarize overnight GitHub notifications, new Sentry issues, and CI failures.
   Rank by whether they block today's work. Do not open issues or reply to anything." \
  --name "Morning brief" \
  --tz "Europe/Istanbul" \
  --session isolated \
  --light-context \
  --tools exec,read \
  --thinking medium \
  --announce --channel slack --to "channel:C1234567890" \
  --timeout-seconds 600 \
  --failure-alert --failure-alert-after 2 --failure-alert-cooldown 1h
```
Every flag here is doing security or ops work: `--session isolated` gives the job its own `cron:<jobId>` session so a poisoned notification can't taint your main conversation's memory; `--tools exec,read` restricts the toolset for this job only; `--light-context` cuts token spend; `--timeout-seconds` bounds the run; `--failure-alert` means you find out when it breaks. ([cron-jobs](https://docs.openclaw.ai/automation/cron-jobs))

### Recipe 5 — Sentry/GitHub webhook → agent turn (no polling)

```json5
// ~/.openclaw/openclaw.json
{
  hooks: { enabled: true, token: "<long-random-token>", path: "/hooks" }
}
```
```bash
# what your webhook relay (or a local ngrok-free tunnel you already trust) POSTs:
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer <long-random-token>' \
  -H 'Content-Type: application/json' \
  -d '{"message":"New Sentry issue: <payload summary>. Assess severity, find the
       likely commit, and draft an issue body. Do not create the issue.","agentId":"main","deliver":false}'
```
There is also `POST /hooks/wake` with `{"text":…,"mode":"now","agentId":"main"}` for a system-event nudge rather than a full agent turn. Teach the trade-off: webhooks are cheaper and lower-latency than a heartbeat, but they are an **inbound path**, so the token must be long and random and the gateway must stay on loopback with the relay in front of it. Hermes' equivalent is `hermes webhook` with event-type filters and `{dot.notation}` payload templating. ([cron-jobs](https://docs.openclaw.ai/automation/cron-jobs))

### Recipe sizing note for the author
Recipes 1–3 need nothing but `claude`, `gh`, `jq` and `cron` — genuinely an evening, and they work for a reader who installs no personal-agent runtime at all. Recipes 4–5 need OpenClaw installed. **Order them that way in the module**: the reader gets a win before they install a daemon.

---

## 10. Pitfalls & anti-patterns

1. **"It's just for me, so security doesn't matter."** Inverted. A personal agent has your credentials and no reviewer. Single-operator means *no second pair of eyes*, not *low stakes*.
2. **Port-forwarding the gateway so you can reach it from your phone.** The documented answer is an identity-aware proxy, or Tailscale-style private networking, never a forwarded port.
3. **Trusting instructions in a `.md` fetched from the internet on a schedule.** The Moltbook pattern. If you must, pin a reviewed copy locally and diff it before use.
4. **Putting "confirm before acting" only in the prompt.** It gets compacted away — that is the literal mechanism of the documented inbox-deletion incident (2026-02-23). Approval must be a *policy* (`exec: { security: "deny", ask: "always" }`, `--permission-mode dontAsk`, an allowlist without `git push`), not a sentence.
5. **Leaving `sandbox.mode: "off"` while granting `exec`.** That's your whole home directory in the blast radius.
6. **Running a tool-enabled agent on a cheap local model to save money.** Explicitly warned against: *"Do not run tool-enabled agents on weak model tiers."* Save money on the *watcher*, not the *actor*.
7. **A `while true` bash loop instead of a supervised service.** No restart policy, no backoff, no logs, no tool budget. Use systemd/launchd + `--timeout-seconds` + `--script-tool-budget`.
8. **No failure alert.** A cron job that silently stopped three weeks ago is worse than no cron job, because you trusted it.
9. **Letting the agent use your daily-driver browser profile.** Its cookies are your logged-in sessions.
10. **Giving the agent write access on its first day.** Read-only for a week, watch the transcripts (`~/.openclaw/agents/<agentId>/sessions/*.jsonl`), *then* grant one write capability at a time.
11. **Confusing memory with truth.** `MEMORY.md` is a text file the model writes about you. It can be wrong, and it can be poisoned. Read it occasionally.
12. **Treating star counts as maturity.** OpenClaw has 387k stars and is nine months old; Hermes Agent's product version is **v0.20.5**. Both are pre-1.0-shaped software holding your credentials.

---

## 11. PROPOSED MODULE OUTLINE

Target ~250 lines, house style: second person, short sections, tables, one or two mermaid diagrams, short runnable snippets, Quick Check, prev/next.

```
# Module 14: Personal Agents — An Agent That Runs on Your Machine, on Your Schedule

I.   From "I ask, it answers" to "it acts while I sleep"
     - The four things that make an agent personal: identity+memory, triggers, your
       accounts, one operator
     - Comparison table: assistant | automation | coding agent | personal agent
     - Callback to Module 5 (memory) and Modules 10–11 (coding agents, harnesses)

II.  Reference architecture (MERMAID DIAGRAM #1 — see below)
     - Triggers · Gateway/daemon · Tools · Memory · Inbox back to you
     - Table: cron vs heartbeat vs webhook vs standing order vs hook — with the
       OpenClaw quote about heartbeat not creating task records
     - Local model vs API model: the privacy-vs-injection-resistance tension

III. Three names, explained
     A. OpenClaw — the gateway model
        - disambiguate from the Captain Claw game reimplementation (one sentence)
        - install snippet + `openclaw gateway status`
        - the numbers, dated: 387.5k★, created 2025-11-24, MIT, calendar versioning
     B. Hermes Agent — the learning-loop model
        - disambiguate from Hermes/OpenHermes *models* (one sentence, load-bearing)
        - MEMORY.md / USER.md / state.db with FTS5 — Module 5 made concrete
        - serverless hibernation: always-on without an always-on bill
        - `hermes claw migrate` as evidence the category is consolidating
        - sidebar: the same skill runs on both harnesses (the hermes-tools.md mapping)
     C. Moltbook — a social network whose users are agents
        - what it is, how an agent joins, the published rate limits
        - the AI-solves-the-CAPTCHA inversion
        - THE LESSON: "fetch instructions from the internet every 4 hours"

IV.  Security (short — this module defers to Module 12)
     - One paragraph: the trifecta is not optional here, it's the product
     - MERMAID DIAGRAM #2 idea: trust boundary — untrusted inbound vs your credentials
     - The hardening checklist (network / identity / blast radius / secrets / ops)
     - The four dated incidents as a table
     - "What not to give it" — the plain list

V.   Cost & ops
     - Arithmetic of a 30-minute heartbeat
     - Bound every run: timeouts, output caps, tool budgets, pacing
     - Supervise, don't loop: systemd/launchd
     - TURN ON FAILURE ALERTS (its own callout)

VI.  Your turn: point it at your own SDLC
     - Recipe 1: overnight CI-triage brief (claude --bare + cron)   ← start here
     - Recipe 2: pre-standup PR review draft (piped diff, no posting)
     - Recipe 3: gated dependency-bump PR (dontAsk + allowlist, no push)
     - Recipe 4: morning brief to Slack (openclaw automations create)
     - Recipe 5: webhook → agent turn

VII. Pitfalls (pick 6 of the 12 in the dossier)

Quick Check · Summary · Prev/Next
```

### Mermaid diagram #1 (drop-in)

```mermaid
graph LR
    subgraph Triggers
      T1[cron / --every / --at]
      T2[heartbeat ~30 min]
      T3[webhook POST /hooks]
      T4[inbound DM]
      T5[file / stream watcher]
    end
    subgraph YourMachine["Your machine — single operator"]
      G[Gateway daemon]
      L[Agent loop]
      M[(Memory: MEMORY.md · USER.md · SQLite+FTS5)]
      G --> L
      L <--> M
    end
    subgraph Tools
      X[exec / files]
      B[browser]
      A[your accounts: mail, cal, repos]
    end
    T1 --> G
    T2 --> G
    T3 --> G
    T4 --> G
    T5 --> G
    L --> X
    L --> B
    L --> A
    L --> N[Inbox back to you: Slack / Telegram / file]
    style YourMachine fill:#eef7ee
```

### Mermaid diagram #2 idea (trust boundary)
`flowchart LR` with an "UNTRUSTED" cluster (stranger DMs, fetched web pages, email bodies, pasted logs, package READMEs, remote `skill.md`) → an approval/sandbox gate → the "YOUR CREDENTIALS" cluster (exec, browser profile, send-as, git push), with the gate labelled `sandbox + tool deny-list + approval on irreversible`. Explicitly annotate: "Module 12 calls this the lethal trifecta. Here you cannot remove a leg — you can only bound the blast radius."

### Three Quick Check questions

1. Your assistant runs on your laptop and you want to message it from your phone. Why is port-forwarding the gateway the wrong answer, and what do the docs tell you to do instead?
2. You put "always confirm before deleting anything" in your agent's prompt, and three hours later it deletes 40 emails unprompted. What mechanism explains this, and what would have actually stopped it?
3. A cron job and a heartbeat can both "check my inbox every 30 minutes." Name two concrete differences, and say which one you'd use to send a report at exactly 09:00 and why.

*(Answers for the author: 1 — the gateway's threat model is a single trusted operator on loopback; use an identity-aware proxy or private network, and keep `gateway.bind: "loopback"`. 2 — context compaction dropped the instruction; prompts aren't controls. Only a policy gate would have stopped it: deny `exec`/destructive tools, `ask: "always"`, no delete capability in the allowlist. 3 — heartbeat runs inside the main session with full context and doesn't create task records; a cron automation runs on precise timing, can use an isolated session, and produces an auditable run record. For exactly 09:00, use the cron automation.)*

---

## 12. References for the module

Reader-facing, curated, all fetched and verified this session (see §13).

1. **[OpenClaw — GitHub repository](https://github.com/openclaw/openclaw)** · OpenClaw Foundation · last push 2026-08-25 — The canonical repo. Install commands, the "how it fits together" component list, and the security note that *"Tools run on the host for the main session unless you configure sandboxing."*
2. **[OpenClaw Docs — home](https://docs.openclaw.ai/)** · OpenClaw Foundation · accessed 2026-08-25 — Entry point; the Gateway / Control UI / nodes model and the supported-channel list.
3. **[OpenClaw — Architecture](https://docs.openclaw.ai/concepts/architecture)** · accessed 2026-08-25 — Why one long-lived daemon owns every messaging surface; what a "node" is.
4. **[OpenClaw — Automation overview](https://docs.openclaw.ai/automation)** · accessed 2026-08-25 — The five trigger mechanisms and the decision rule for choosing between them. The best single page on "triggers instead of turns."
5. **[OpenClaw — Automations / cron jobs CLI](https://docs.openclaw.ai/automation/cron-jobs)** · accessed 2026-08-25 — Every flag in Recipes 4 and 5: schedules, sessions, delivery, model/thinking, timeouts, tool budgets, failure alerts, webhooks.
6. **[OpenClaw — Security guide](https://docs.openclaw.ai/gateway/security)** · accessed 2026-08-25 — The single-operator trust model, `dmPolicy`, the hardened `tools` baseline, file permissions, browser risks, incident response, and what the maintainers do *not* consider a vulnerability.
7. **[OpenClaw — Gateway exposure runbook](https://docs.openclaw.ai/gateway/security/exposure-runbook)** · accessed 2026-08-25 — Read before you expose anything: *"Avoid direct public port-forwarding to the Gateway."*
8. **[OpenClaw — Sandboxing](https://docs.openclaw.ai/gateway/sandboxing)** · accessed 2026-08-25 — Sandbox modes and scopes, what is *not* sandboxed, and an unusually honest statement of the boundary's limits.
9. **[OpenClaw — Tools](https://docs.openclaw.ai/tools)** · accessed 2026-08-25 — The full tool-group taxonomy; useful for reasoning about blast radius group by group.
9b. **[OpenClaw — Project lore](https://docs.openclaw.ai/start/lore)** · accessed 2026-08-25 — The naming history in the project's own words (Warelay → Clawdbot → Moltbot → OpenClaw, and Anthropic's trademark email). Cite this if the module mentions the old name, which it should.
10. **[Hermes Agent — GitHub repository](https://github.com/NousResearch/hermes-agent)** · Nous Research · MIT · release `v2026.8.19` (product v0.20.5), 2026-08-21 — Install, CLI surface, the learning loop, the seven terminal backends, `hermes claw migrate`.
11. **[Hermes Agent — CLI command reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)** · accessed 2026-08-25 — `hermes cron`, `hermes webhook`, `hermes gateway install`, kanban, projects, memory providers, `hermes -z` for scripting.
12. **[Hermes Agent — Memory system](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory)** · accessed 2026-08-25 — `MEMORY.md`/`USER.md` with real character caps, `state.db` + FTS5 session search, self-improvement nudges. Module 5's long-term memory, made inspectable.
13. **[Hermes Agent — Security guide](https://hermes-agent.nousresearch.com/docs/user-guide/security)** · accessed 2026-08-25 — Context-file injection scanning, the smart/manual/off approval modes, the hardline blocklist, and the never-put-this-in-`HERMES_HOME` list.
14. **[Moltbook — agent onboarding skill](https://www.moltbook.com/skill.md)** · accessed 2026-08-25 — Read this as an artifact: registration, bearer auth, the "only send keys to `www`" warning, published rate limits, and the math challenge.
15. **[Moltbook is the most interesting place on the internet](https://simonwillison.net/2026/Jan/30/moltbook/)** · Simon Willison · 2026-01-30 — The load-bearing outside opinion on the "fetch and follow remote instructions on a heartbeat" pattern.
16. **[Simon Willison — posts tagged `openclaw`](https://simonwillison.net/tags/openclaw/)** · accessed 2026-08-25 — Dated incident log: the inbox-deletion runaway (2026-02-23), the autonomous hit piece (2026-02-12), the gym-booking API exploit (2026-08-10), Karpathy's "Claws" essay (2026-02-21).
17. **[Run Claude Code programmatically](https://code.claude.com/docs/en/headless)** · Anthropic · accessed 2026-08-25 — Authority for every flag in Recipes 1–3: `-p`, `--bare`, `--allowedTools`, `--permission-mode`, `--append-system-prompt`, `--output-format json`, `--json-schema`, `--continue`/`--resume`, cost fields, SIGTERM behavior.

---

## 13. Link Verification Log

Every URL cited anywhere in this dossier. "gh API" = fetched via authenticated GitHub API, not WebFetch.

| URL | Fetch result | Date checked | Claim it supports |
|---|---|---|---|
| https://github.com/openclaw/openclaw | **OK** (gh API: `repo view`, `readme`, `contents/LICENSE`, `releases`) | 2026-08-25 | Owner, description, 387,551★, created 2025-11-24, pushed 2026-08-25, releases `v2026.7.1-2` / `v2026.8.1-beta.3`, MIT LICENSE text "© 2026 OpenClaw Foundation", install commands, component list, Steinberger/Molty attribution, sponsors, "tools run on the host" |
| https://api.github.com/repos/openclaw/openclaw/license | **OK** (gh API) | 2026-08-25 | `spdx_id: NOASSERTION` — the "GitHub badge says Other, file says MIT" caveat |
| https://docs.openclaw.ai/ | **OK** | 2026-08-25 | "multi-channel gateway for AI agents that runs on any OS"; OpenClaw Foundation non-profit; npm install command; Node versions; channel and platform lists |
| https://docs.openclaw.ai/concepts/architecture | **OK** | 2026-08-25 | Gateway = daemon, WS API, "single long-lived Gateway owns all messaging surfaces"; Clients; Nodes with `role: node`; WebChat |
| https://docs.openclaw.ai/gateway/security | **OK** | 2026-08-25 | Single-operator trust model quote; `dmPolicy` values + pairing expiry; `sessionKey` not an auth token; hardened `tools` baseline; `sandbox.mode: "all"`; `strictInlineEval`; "Do not run tool-enabled agents on weak model tiers"; untrusted-surface list; loopback bind; `trustedProxies`; Tailscale headers; file permission paths; `.env` override blocking; browser guidance; SSRF default; incident-response steps; "not vulnerabilities" list; `security audit` flags; the 0.5%/272K arena figure |
| https://docs.openclaw.ai/gateway/security/exposure-runbook | **OK** | 2026-08-25 | Public exposure "rare, high-risk"; "Avoid direct public port-forwarding to the Gateway"; identity-aware proxy; rollback + rotate + audit sequence; long-random-token baseline |
| https://docs.openclaw.ai/gateway/sandboxing | **OK** | 2026-08-25 | `sandbox.mode` off/non-main/all (default **off**); `scope`, `backend: docker`, `workspaceAccess` none/ro/rw with `/agent` and `/workspace` mounts; what's isolated; Gateway + `tools.elevated` not sandboxed; "not a perfect security boundary" quote |
| https://docs.openclaw.ai/tools | **OK** | 2026-08-25 | Full tool-group taxonomy incl. Automation = `cron`, `heartbeat_respond` |
| https://docs.openclaw.ai/automation | **OK** | 2026-08-25 | Automations vs Heartbeat vs Tasks vs Hooks vs Standing Orders vs Task Flow; "approximately every 30 minutes"; "do not create task records"; "injected into every session automatically"; `openclaw tasks list|audit` |
| https://docs.openclaw.ai/automation/cron-jobs | **OK** | 2026-08-25 | All `openclaw automations` subcommands and flags: `--at/--every/--cron/--on-exit/--stream-command`, `--tz/--exact/--stagger`, payload flags, `--timeout-seconds`, `--output-max-bytes`, `--script-timeout-seconds` (cap 900), `--script-tool-budget` (cap 200), `--session` values, delivery flags, `--model/--fallbacks/--thinking/--light-context/--tools`, pacing, failure-alert flags, the full example, `hooks` config block, `/hooks/wake` and `/hooks/agent` curl calls, port 18789 |
| https://docs.openclaw.ai/llms.txt | **OK** | 2026-08-25 | Discovered correct doc URLs (`/automation/cron-jobs`, `/gateway/sandboxing`, etc.) after 404s on guessed paths |
| https://docs.openclaw.ai/tools/automation | **404** | 2026-08-25 | (guessed path; superseded by `/automation` and `/automation/cron-jobs`) |
| https://docs.openclaw.ai/automation/cron | **404** | 2026-08-25 | (guessed path; real page is `/automation/cron-jobs`) |
| https://github.com/NousResearch/hermes-agent | **OK** (gh API: `repo view`, `readme`, `license`, `releases`) | 2026-08-25 | Nous Research, MIT (`spdx_id: MIT`), 236,154★, created 2025-07-22, pushed 2026-08-25, `v2026.8.19` = v0.20.5 (2026-08-21); install one-liners; CLI list; learning-loop and seven-backends quotes; "Use any model you want"; `hermes claw migrate`; `uv.exe` false-positive note |
| https://hermes-agent.nousresearch.com/docs/ | **OK** | 2026-08-25 | Doc section map; located the security, memory and CLI-reference pages |
| https://hermes-agent.nousresearch.com/docs/features/cron | **404** | 2026-08-25 | (guessed path; cron is documented under `/docs/reference/cli-commands`) |
| https://hermes-agent.nousresearch.com/docs/reference/cli-commands | **OK** | 2026-08-25 | `hermes cron` subcommands + Chronos scale-to-zero; `hermes webhook`; `hermes gateway install` systemd/launchd; `hermes peer dm`; kanban; projects; 8 memory providers; `hermes -z`; logs/sessions/backup/doctor |
| https://hermes-agent.nousresearch.com/docs/user-guide/features/memory | **OK** | 2026-08-25 | `~/.hermes/memories/MEMORY.md` (2,200) + `USER.md` (1,375); "frozen snapshot at session start"; `~/.hermes/state.db` SQLite + FTS5; `session_search`; nudges + `write_approval`; Honcho |
| https://hermes-agent.nousresearch.com/docs/user-guide/security | **OK** | 2026-08-25 | "honest-but-wrong agent" threat model; "guardrails against accidental harm, not sandboxes against hostile processes"; context-file injection scanner detections; smart/manual/off approval; hardline blocklist; container-as-perimeter; never-in-`HERMES_HOME` list; env filtering for child processes and MCP subprocesses |
| https://www.moltbook.com/ | **OK** | 2026-08-25 | "A Social Network for AI Agents"; "AI agents share, discuss, and upvote. Humans welcome to observe."; "Built for agents, by agents"; @mattprd credit; © 2026 moltbook; 3-step onboarding; pointer to `skill.md`. (Counters rendered as zero — client-side; not used as a claim.) |
| https://www.moltbook.com/skill.md | **OK** | 2026-08-25 | Registration curl + `api_key`/`claim_url`/`verification_code`; `~/.config/moltbook/credentials.json`; bearer auth; the "only send keys to `www`" warning; endpoint table; all rate limits; `X-RateLimit-*` and `Retry-After`; the math-challenge verification flow; key rotation at `/login` |
| https://simonwillison.net/2026/Jan/30/moltbook/ | **OK** | 2026-08-25 | "social network where digital assistants can talk to each other"; agents told to fetch `skill.md`; heartbeat re-fetch of remote instructions; "rug pulls or has their site compromised"; "Challenger disaster" line. **Also the unresolved Steinberger attribution — see §14** |
| https://simonwillison.net/tags/openclaw/ | **OK** | 2026-08-25 | Dated post index; inbox-deletion / "STOP OPENCLAW" incident (2026-02-23); autonomous hit piece by `@crabby-rathbun` (2026-02-12); gym-booking API "zero authorisations checks" (2026-08-10); Karpathy "Claws" (2026-02-21); Clawdbot→OpenClaw lineage context |
| https://simonwillison.net/2026/Feb/2/a-social-network-for-ai-bots-only/ | **404** | 2026-08-25 | (guessed slug; the correct permalink is `.../no-humans-allowed/` — next row) |
| https://simonwillison.net/2026/Feb/2/no-humans-allowed/ | **OK** (via the month index `https://simonwillison.net/2026/Feb/`) | 2026-08-25 | Correct permalink for the 2026-02-02 "A Social Network for A.I. Bots Only" (NYT) commentary; the "What I Learned Today" bot forum anecdote; confirms it names no Moltbook creator and gives no scale figure |
| https://simonwillison.net/2026/Feb/ | **OK** | 2026-08-25 | Used to recover the correct permalink above |
| https://docs.openclaw.ai/start/lore | **OK** | 2026-08-25 | Primary naming lineage: Warelay → Clawd/Clawdbot from 2025-11-25 → *"In January 2026, Anthropic sent a polite email asking for a name change (trademark stuff)"* → Moltbot (interim) → OpenClaw, *"The Great OpenClaw Migration"* completed 2026-01-30; *"molting is what lobsters do to grow"*; Peter Steinberger as `@steipete` / "The Creator"; Molty as the character |
| https://code.claude.com/docs/en/headless | **OK** | 2026-08-25 | `-p`, `--bare` (and what it skips, and that untrusted `.claude/settings.json` hooks run without it), `ANTHROPIC_API_KEY` requirement in bare mode, `--allowedTools` + permission-rule prefix syntax and the space-before-`*` detail, `--permission-mode` values incl. `dontAsk` and "Manual on every plan" for `-p`, `--append-system-prompt`, `--output-format json` + `total_cost_usd` + "client-side estimates", `--json-schema`, `--continue`/`--resume`, 10MB stdin cap, SIGTERM/exit-code behavior, the `gh pr diff | claude -p` review example, the "piping means no Bash permission" note |
| `gh search repos moltbook` / `openclaw` / `hermes agent` | **OK** (gh API) | 2026-08-25 | Ecosystem signal: `NirDiamant/moltbook-agent-guard` (Apache-2.0, 66★, updated 2026-08-19, "Real-time security for AI agents on Moltbook"); `daveholtz/moltbook_scraper`; `ExtraE113/moltbook_data`; `kelkalot/moltbook-observatory`; `c4pt0r/minibook`; `openclaw/clawhub` (MIT); `VoltAgent/awesome-openclaw-skills`; the "there is no game-engine OpenClaw in the top results for this query" disambiguation |
| `/home/cevheri/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/using-superpowers/references/hermes-tools.md` | **OK** (local file, read-only) | 2026-08-25 | Hermes tool-name mapping (`read_file`, `write_file`, `patch`, `terminal`, `search_files`, `web_extract`, `web_search`, `delegate_task`, `todo`, `skill_view`); `AGENTS.md` / `~/.hermes/SOUL.md`; skill path `~/.hermes/plugins/<plugin>/skills/<name>/SKILL.md`; `hermes kanban` CLI |

---

## 14. Open questions / `[UNVERIFIED]` claims

1. **`[UNVERIFIED]` Who created Moltbook.** Willison's 2026-01-30 post (as summarized by my fetch) attributes it to **Peter Steinberger** as part of the OpenClaw ecosystem; moltbook.com itself credits human help from **@mattprd** and no one else. I could not find a primary "about" page. **Module guidance: say "a community project in the OpenClaw orbit" and name no owner.** To resolve: fetch the raw Willison post text directly and look for a linked announcement.
2. ~~`[PARTIAL]` The Clawdbot → OpenClaw rename lineage.~~ **RESOLVED** from the project's own lore page: Warelay → Clawd/Clawdbot (2025-11-25) → Moltbot (Jan 2026, after Anthropic's trademark request) → OpenClaw (migration completed 2026-01-30). See §1 and the log row for `docs.openclaw.ai/start/lore`. One small internal muddle in that page's own narrative: it describes the community picking "OpenClaw" as the *first* molt in January 2026 and then mentions Moltbot as an interim identity, so the exact Moltbot↔OpenClaw ordering within January 2026 is fuzzy. **Module guidance: say "originally Clawdbot, renamed to OpenClaw at the end of January 2026 after a trademark request from Anthropic" and don't enumerate the interim name unless you want the anecdote.**
3. **`[UNVERIFIED]` Moltbook's scale.** Do not publish a number. The homepage counters rendered as zero to my fetcher (client-side hydration). Third-party observatories exist if the author wants a figure.
4. ~~404 to fix: the 2026-02-02 Willison post.~~ **RESOLVED** — the real permalink is [https://simonwillison.net/2026/Feb/2/no-humans-allowed/](https://simonwillison.net/2026/Feb/2/no-humans-allowed/) (his commentary on a New York Times piece about OpenClaw and Moltbook). It does **not** name a Moltbook creator or give a population figure, so it does not settle §14.1 or §14.3. Usable colour for the module: one bot created a forum called *"What I Learned Today,"* where it explained how, after a request from its creator, it built a way of controlling an Android smartphone.
5. **`[LOW-CONFIDENCE]` The "0.5% success rate for Claude Opus 4.5 in a 272K-attack arena"** figure in OpenClaw's security doc. Verified as *appearing there*, not verified upstream, and it sits in tension with Module 12's finding that adaptive attackers defeat most defenses. Prefer Module 12's source; if used, attribute it to the OpenClaw page.
6. **Not researched: the alternatives row.** OpenHands, Goose, Open Interpreter, Letta/MemGPT, Khoj, LibreChat, Home Assistant + LLM, n8n/Activepieces, Ollama/LM Studio got **zero** verification this session (search budget). Either commission a follow-up pass or omit them.
7. **Not verified: OpenClaw's Docker/Nix deployment paths.** The README points at `docs.openclaw.ai/install`; I never fetched it. If the module recommends Docker (a good idea for a first install), verify that page first.
8. **Open question for the author: does Module 14 overlap Module 13 (Loop Engineering)?** "Keeping it from looping forever" and tool budgets plausibly belong to 13. Recommended split: **13 = the loop's internal control** (termination, budgets, retries, convergence); **14 = the loop's external control** (what wakes it, what it may touch, who it reports to, what it costs while you sleep). Worth confirming against the 13 placeholder before writing.
9. **Turkish translation.** `14_personal_agents_tr.md` is listed in the intermediate README; nothing in this dossier is Turkish-specific, but the project names, CLI flags and config keys must not be translated.

---

## RESUME NOTES (written 2026-08-25)

**Status: DONE.** All 14 required sections are written. The dossier is publish-ready as module input.

**Done**
- §1 name verification: all three names verified from primary sources (GitHub API + project docs + the live moltbook site). Recommendation: keep all three, reframe Moltbook as a case study.
- §2–§11 written from fetched sources only.
- §12 references: 17 links, all in the verification log.
- §13 verification log: 27 rows including the four 404s.

**Partial**
- §6 landscape table: only the three required projects are verified. The alternatives row is explicitly marked unverified rather than guessed.
- §14 items 1–4 are small, cheap loose ends (one Willison slug, one lore page, one install page).

**Not started**
- Any verification of OpenHands / Goose / Open Interpreter / Letta / Khoj / LibreChat / Home Assistant / n8n / Ollama.

**Searches already run (do not repeat)**
- `WebSearch: "OpenClaw personal AI agent self-hosted"` — the only search this session; budget then exhausted (200/200).
- `gh search repos`: `openclaw`, `moltbook`, `hermes agent`.

**Dead / wrong URLs found**
- `https://docs.openclaw.ai/tools/automation` → 404 (use `/automation`)
- `https://docs.openclaw.ai/automation/cron` → 404 (use `/automation/cron-jobs`)
- `https://hermes-agent.nousresearch.com/docs/features/cron` → 404 (use `/docs/reference/cli-commands`)
- `https://simonwillison.net/2026/Feb/2/a-social-network-for-ai-bots-only/` → 404 (slug guess)
- **Method note that saved a lot of time:** fetch `<docs-site>/llms.txt` first to get the real URL list instead of guessing paths.

**Closed after the first write-up:** the OpenClaw naming lineage (now primary-verified from `/start/lore`) and the 404'd Willison permalink (now `.../no-humans-allowed/`). Both reflected in §1, §13 and §14.

**Ordered next actions if someone resumes**
1. Resolve the Moltbook attribution (§14.1) — the `no-humans-allowed` post did not settle it; try the linked NYT piece or a Moltbook announcement.
2. Fetch `https://docs.openclaw.ai/install` if the module will recommend Docker.
3. Decide the Module 13 vs 14 boundary (§14.8) before writing.
4. Optional: a separate verification pass on the alternatives (§14.6), or drop them.
