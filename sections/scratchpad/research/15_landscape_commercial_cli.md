# Research Dossier — Module 15: The Commercial Coding-Agent Landscape (terminal-first)

**Researched:** 2026-08-25 · **Scope:** Claude Code · OpenAI Codex · Antigravity CLI (`agy`)
**Angle:** landscape / comparison. Extension-mechanism *internals* are already established in
`10_coding_agents.md` (§3, §13) and `11_harness_engineering.md`; this dossier does not re-derive them.

**Citation policy:** every non-obvious claim carries an inline link to a page I fetched on 2026-08-25.
Training memory was used only to choose search terms. Unverified items are tagged `[UNVERIFIED]`.
Full fetch log in §9.

> ⚠️ **Three findings that invalidate 2025-era teaching material:**
> 1. **`antigravity-cli` is real, is Google's, and it replaced Gemini CLI.** Any module that teaches
>    "Gemini CLI" as Google's terminal agent is now teaching a retired product.
> 2. **Docs hosts moved.** Claude Code → `code.claude.com/docs/en/*`; Codex → `learn.chatgpt.com/docs/*`.
> 3. **All three now converge on the same shape** — instruction file, skills, subagents, hooks, MCP,
>    plugins, a sandbox, and a `-p`/`exec` headless mode. The *differences* are now in defaults and
>    billing, not in feature lists. Teach the defaults.

---

## 1. Name verification

### 1.1 `antigravity-cli` — ✅ VERIFIED, and it is more important than the brief assumed

**It exists, it is Google's, and it is the successor to Gemini CLI.**

- **Who ships it:** Google. Source repo is `github.com/google-antigravity/antigravity-cli`, described as
  *"Antigravity CLI brings the reasoning, execution, and orchestration capabilities of Antigravity
  agent harness directly into your terminal."*
  ([google-antigravity/antigravity-cli, fetched 2026-08-25](https://github.com/google-antigravity/antigravity-cli))
- **Official docs:** `https://antigravity.google/docs/cli/overview/`, which calls it
  *"the lightweight Terminal User Interface (TUI) surface of Antigravity"*
  ([Overview — Antigravity CLI, fetched 2026-08-25](https://antigravity.google/docs/cli/overview/)).
- **The binary is not `antigravity`.** The command is **`agy`**. `antigravity-cli` is the *repo/product*
  name; `agy` is what you type
  ([install docs, fetched 2026-08-25](https://antigravity.google/docs/cli/install)).
- **Relationship to Antigravity the IDE:** Antigravity is a product *family*. The CLI (`agy`) and
  "Antigravity 2.0" (the desktop/IDE surface) *"use the same Antigravity agent harness, share the same
  settings"*, and sessions can be exported from CLI into the GUI
  ([product page, fetched 2026-08-25](https://antigravity.google/product/antigravity-cli);
  [repo README](https://github.com/google-antigravity/antigravity-cli)).
- **It replaced Gemini CLI.** Google's developer blog post *"An important update: Transitioning Gemini
  CLI to Antigravity CLI"* is dated **2026-05-19** and states that on **2026-06-18** *"Gemini CLI and
  Gemini Code Assist IDE extensions"* stopped serving requests for Google AI Pro/Ultra and free-tier
  users; enterprise customers retain Gemini CLI access via paid licenses and Google Cloud API keys.
  It confirms the CLI is **built in Go** and carries forward *"Agent Skills, Hooks, Subagents, and
  Extensions (now as Antigravity plugins)"*
  ([Google Developers Blog, 2026-05-19](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/);
  [Introducing Google Antigravity CLI, 2026-05-19](https://antigravity.google/blog/introducing-google-antigravity-cli)).

**⚠️ Conflict to flag:** a search-result snippet asserted *"Starting August 25, 2026, Antigravity CLI is
available to everyone."* The blog page I actually fetched is dated **2026-05-19** and says availability
is immediate as of that post. **Trust 2026-05-19.** The August date is `[UNVERIFIED]` and appears to be
a search-index artifact.

**Consequence for the curriculum:** `10_coding_agents.md` §13.3 documents **Gemini CLI** in detail
(`GEMINI.md`, `.gemini/commands/*.toml`, 11 hook events, `gemini-extension.json`). That section is now
**historical**. Google's terminal agent for the module's audience is `agy`. Someone should reconcile
those two dossiers before the module is written.

### 1.2 Claude Code — ✅ verified, docs host moved
Now at `code.claude.com/docs/en/*` (the old `docs.claude.com/en/docs/claude-code/*` 301s). Confirmed by
direct fetch of `/docs/en/setup`, `/docs/en/costs`, `/docs/en/sandboxing`, `/docs/en/permission-modes`,
`/docs/en/headless`, `/docs/en/github-actions` — all 200 on 2026-08-25.

### 1.3 OpenAI Codex — ✅ verified, docs host moved
Now at `learn.chatgpt.com/docs/*`. Note the paths are **not** all under `/docs/codex/`: pricing is at
`/docs/pricing`, sandboxing at `/docs/sandboxing`, headless at `/docs/non-interactive-mode`. Guessed
paths like `/docs/codex/pricing` and `/docs/codex/sandbox` **404** (see §9).

---

## 2. Per-product deep dive

### 2.1 Claude Code (Anthropic)

**Identity.** Anthropic's coding agent, primarily a terminal CLI, with the same agent available as a
VS Code / JetBrains extension, a Desktop app, a web surface, and a programmatic SDK.

**Interaction model.** Terminal-first (`claude`); also **Desktop app** for macOS/Windows/Linux, **VS Code
extension**, **JetBrains plugin**, **Claude Code on the web**, and **headless** via `claude -p` / the
Agent SDK ([Advanced setup, fetched 2026-08-25](https://code.claude.com/docs/en/setup);
[Run Claude Code programmatically, fetched 2026-08-25](https://code.claude.com/docs/en/headless)).

**Install — verbatim** ([Advanced setup](https://code.claude.com/docs/en/setup)):

```bash
# macOS, Linux, WSL — native installer (recommended, auto-updates)
curl -fsSL https://claude.ai/install.sh | bash
```
```powershell
# Windows PowerShell
irm https://claude.ai/install.ps1 | iex
```
```bash
brew install --cask claude-code          # macOS/Linux, does NOT auto-update
winget install Anthropic.ClaudeCode      # Windows, does NOT auto-update
npm install -g @anthropic-ai/claude-code # needs Node.js 22+; installs the same native binary
```
Signed `apt`, `dnf`, and `apk` repositories also exist, with GPG fingerprint
`31DDDE24DDFAB679F42D7BD2BAA929FF1A7ECACE`. Verify with `claude --version` and `claude doctor`.
System requirements: macOS 13+, Windows 10 1809+, Ubuntu 20.04+, Debian 10+, Alpine 3.19+; 4 GB+ RAM.

**Pricing / access model (checked 2026-08-25).** *"Claude Code requires a Pro, Max, Team, Enterprise,
or Console account. The free Claude.ai plan does not include Claude Code access."*
([Advanced setup](https://code.claude.com/docs/en/setup)). Headline prices as displayed on
[claude.com/pricing, fetched 2026-08-25](https://claude.com/pricing): Free **$0**; Pro **$17** (annual)
/ $20 monthly, *"Includes Claude Code"*; Max 5x **"From $100"**; Max 20x **"From $100"**
`[UNVERIFIED — see §3 note]`; Team Standard seat **$20** (annual) / $25 monthly; Team Premium seat
**$100** (annual) / $125 monthly, both *"Includes Claude Code and Claude Cowork"*; Enterprise
**"$20/seat"** + *"usage at API rates"*.

Two separate billing worlds, and this is the thing developers get wrong: **subscription** (Pro/Max/
Team/Enterprise — usage draws on a per-seat allowance on a rolling five-hour window plus a weekly
window) vs **API/Console** (billed per token). Anthropic's own budgeting figure:
*"the average cost is around \$13 per developer per active day and \$150-250 per developer per month,
with costs remaining below \$30 per active day for 90% of users."*
([Manage costs effectively, fetched 2026-08-25](https://code.claude.com/docs/en/costs))

**Model support / BYO provider.** Anthropic models (Opus / Sonnet / Haiku / Fable families; `/model`
switches mid-session). Third-party routing is first-class: **Amazon Bedrock**, **Google Cloud's Agent
Platform**, and **Microsoft Foundry**, plus a self-hosted **Claude apps gateway** or an LLM gateway
such as LiteLLM ([setup](https://code.claude.com/docs/en/setup); [costs](https://code.claude.com/docs/en/costs)).
There is no "point it at OpenAI" story — the BYO axis is *your cloud account*, not *another vendor's
model*.

**Extension mechanisms.** `CLAUDE.md` (instruction file; *"Claude Code reads `CLAUDE.md`, not
`AGENTS.md`"*), **Skills** — into which custom slash commands have been merged — **subagents**, **hooks**
(~31 events; the only deterministic guardrail), **MCP** (tool definitions deferred by default), and
**plugins** as the packaging layer. All established with verbatim citations in
`10_coding_agents.md` §3 and §1; not re-derived here.

**Permissions & sandboxing.** Six permission modes: `default` (labelled **Manual**), `acceptEdits`,
`plan`, `auto`, `dontAsk`, `bypassPermissions`
([Choose a permission mode, fetched 2026-08-25](https://code.claude.com/docs/en/permission-modes)).
*"On Pro, Max, and Team plans, the built-in starting permission mode is auto mode"* — auto mode means
*"a second model, the classifier, reviews actions instead of you"*. **But `claude -p` and the Agent SDK
start in `default`**, per that page's own table. Deny rules apply in every mode including
`bypassPermissions`; allow rules have no effect in `bypassPermissions`.

The Bash sandbox is separate from permission modes and **off by default** (`sandbox.enabled`).
*"The sandbox is built into Claude Code and runs on macOS, Linux, and WSL2. Native Windows is not
supported."* macOS uses the built-in **Seatbelt** framework with nothing to install; Linux/WSL2 need
`bubblewrap` and `socat` (`sudo apt-get install bubblewrap socat`), plus an optional seccomp filter via
`npm install -g @anthropic-ai/sandbox-runtime`. Defaults: sandboxed commands write only to the working
directory and the session temp dir; new network domains prompt. Escape hatch: a failed sandboxed
command may be retried with `dangerouslyDisableSandbox`, disableable via
`"allowUnsandboxedCommands": false` (**Strict sandbox mode**). Ubuntu 24.04+ needs an AppArmor tweak for
bubblewrap user namespaces ([Configure the sandboxed Bash tool, fetched 2026-08-25](https://code.claude.com/docs/en/sandboxing)).

**Headless / CI.** `claude -p "<prompt>"` (alias `--print`). Structured output via
`--output-format text|json|stream-json`, schema-constrained output via `--json-schema`, tool allowlisting
via `--allowedTools "Bash(git diff *),Read"`, baseline via `--permission-mode`, session continuity via
`--continue` / `--resume "$session_id"`. **`--bare`** skips auto-discovery of hooks, skills, commands,
subagents, plugins, MCP servers, auto memory and CLAUDE.md — *"the recommended mode for scripted and SDK
calls, and will become the default for `-p` in a future release"*; in bare mode you must set
`ANTHROPIC_API_KEY` because it never reads OAuth credentials. Exit code 0 on success, non-zero on
failure, **143** on SIGTERM. Piped stdin is capped at 10 MB
([headless](https://code.claude.com/docs/en/headless)).
The documented CI recipe: `claude -p "run the test suite" --permission-mode dontAsk --allowedTools "Bash(npm test)" "Read"`.
Official CI docs exist for **GitHub Actions** (`anthropics/claude-code-action@v1`, set up with
`/install-github-app`, secrets `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`,
CLI flags passed through `claude_args`) and for **GitLab CI/CD**
([Claude Code GitHub Actions, fetched 2026-08-25](https://code.claude.com/docs/en/github-actions)).

**Enterprise / team surface.** Managed settings that user and project settings cannot override
(`permissions.defaultMode`, `permissions.disableAutoMode`, `requiredMinimumVersion` /
`requiredMaximumVersion`, `autoUpdatesChannel`, `sandbox.failIfUnavailable`, `allowManagedDomainsOnly`);
org-wide spend limits and usage credits; a spend-report CSV and an **Enterprise Analytics API**
(`read:analytics` scope); a Claude Code Analytics API for Console orgs; **OpenTelemetry** export as the
only per-user metric path that works on every setup
([costs](https://code.claude.com/docs/en/costs); [sandboxing](https://code.claude.com/docs/en/sandboxing);
[permission modes](https://code.claude.com/docs/en/permission-modes)).

**Vendor-stated limitations.** Native Windows gets no sandbox — *"On Windows, run Claude Code inside a
WSL2 distribution."* If the sandbox can't start, *"Claude Code shows a warning and runs commands without
sandboxing"* unless you set `failIfUnavailable`. Turning filesystem isolation off is explicitly flagged:
a sandboxed command *"can write files that later commands run or read… and use them to widen its own
access on the next run."* Under `-p` without `--bare`, *"a `-p` session runs the hooks in a project's
`.claude/settings.json` and connects the servers in its `.mcp.json`, even in a folder you've never
trusted"* — a supply-chain footgun worth a slide of its own. Agent teams *"use approximately 7x more
tokens than standard sessions"* ([sandboxing](https://code.claude.com/docs/en/sandboxing);
[headless](https://code.claude.com/docs/en/headless); [costs](https://code.claude.com/docs/en/costs)).

---

### 2.2 OpenAI Codex

**Identity.** OpenAI's coding agent, delivered as a terminal CLI plus IDE extension, web, iOS, cloud, an
SDK, and a GitHub Action.

**Interaction model.** *"Codex access across web, CLI, IDE extension, and iOS"*
([Pricing — ChatGPT Learn, fetched 2026-08-25](https://learn.chatgpt.com/docs/pricing)), plus
`codex exec` headless and the Codex SDK.

**Install — verbatim** ([Codex CLI, fetched 2026-08-25](https://learn.chatgpt.com/docs/codex/cli)):

```bash
# macOS / Linux (same command updates an existing install)
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```
```powershell
# Windows
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```
npm and Homebrew are also documented as alternative install channels. First launch prompts you to
*"choose **Sign in with ChatGPT** or another available sign-in method."*

**Pricing / access model (checked 2026-08-25).** From
[learn.chatgpt.com/docs/pricing](https://learn.chatgpt.com/docs/pricing):
Free **$0/month** (*"Explore Codex capabilities on quick coding tasks"*); **Go $8/month**;
**Plus $20/month**; **Pro from $100/month**, with a **$200/month** 20x tier — *"5x or 20x more Codex
usage than Plus"*, plus `GPT-5.3-Codex-Spark` research-preview access; **Business $20/user/month**
billed annually, with SAML SSO and MFA and *"No training on your business data by default"*;
**Enterprise & Edu — custom, contact sales**, with *"Audit logs and usage monitoring"*.
There is also an **API Key** path: *"Pay only for the tokens Codex uses, based on API pricing"* — usable
from CLI, SDK, or IDE extension.

Codex meters subscription usage in **credits**, priced against a published rate card per 1M tokens:

| Model | Input | Cached input | Output |
|---|---|---|---|
| GPT-5.6 Sol | 100 | 10 | 500 |
| GPT-5.6 Terra | 50 | 5 | 300 |
| GPT-5.6 Luna | 5 | 0.5 | 30 |

(Same page. Units are credits per 1M tokens, not dollars — the dollar value of a credit is
`[UNVERIFIED]`; I did not find it on a page I fetched.)

**Model support / BYO key.** *"GPT-5.6 model family, including Sol, Terra, and Luna"*; `GPT-5.3-Codex-Spark`
on Pro. **You can bring your own OpenAI API key** and pay API rates instead of using a ChatGPT plan
(`CODEX_API_KEY=<key> codex exec …`). There is no documented path to point Codex at a non-OpenAI model
provider ([pricing](https://learn.chatgpt.com/docs/pricing);
[Non-interactive mode, fetched 2026-08-25](https://learn.chatgpt.com/docs/non-interactive-mode)).

**Extension mechanisms.** `AGENTS.md` (+ `AGENTS.override.md`, 32 KiB default cap, concatenated Git-root
→ cwd); custom prompts in `~/.codex/prompts/` **deprecated in favour of skills**; skills in
`.agents/skills` / `$HOME/.agents/skills` / `/etc/codex/skills`, invoked `$skill`; subagents as TOML in
`.codex/agents/*.toml`; **11 PascalCase hook events** in `hooks.json` or `[hooks]` in `config.toml`;
MCP via `[mcp_servers.<name>]` in `config.toml`; plugins via `.codex-plugin/plugin.json`. Full verbatim
detail already captured in `10_coding_agents.md` §13.2 — **do not re-research**.

> **Naming trap, repeated here because it bites every student:** Codex's page titled *"rules"* is **not**
> instruction rules. It is the **execpolicy** shell-command allowlist — `.rules` files written in
> **Starlark** using `prefix_rule(pattern=[...], decision="allow"|"prompt"|"forbidden")`.
> (`10_coding_agents.md` §13.2.)

**Permissions & sandboxing.** Two orthogonal layers, and Codex says so:
*"Codex security controls come from two layers: Sandbox mode (what Codex can do technically…) and
Approval policy (when Codex must ask before executing an action)."*
- `sandbox_mode`: **`read-only`** | **`workspace-write`** (default) | **`danger-full-access`**
- `approval_policy`: **`untrusted`** | **`on-request`** (default) | **`never`**
- Default pairing: `workspace-write` + `on-request`.
- Platform enforcement: *"Codex uses platform-native enforcement on each OS."* macOS = **Seatbelt**;
  Linux/WSL2 = **`bubblewrap` (bwrap)**; Windows = native Windows sandbox in PowerShell, and the Linux
  implementation under WSL2. **Codex sandboxes natively on Windows; Claude Code does not.**
- **Network is off by default inside `workspace-write`.** Enable with:
  ```toml
  [sandbox_workspace_write]
  network_access = true
  ```
([Sandbox, fetched 2026-08-25](https://learn.chatgpt.com/docs/sandboxing);
[Agent approvals & security, fetched 2026-08-25](https://learn.chatgpt.com/docs/agent-approvals-security))

The TUI exposes named presets via `/permissions`: **Read Only** (*"Codex can read files and answer
questions. Codex requires approval to make edits, run commands, or access network."*), **Auto**
(*"Codex can read files, make edits, and run commands in the workspace. Codex requires approval to edit
outside the workspace or to access network."*), and **Full Access** via
`--dangerously-bypass-approvals-and-sandbox` (alias **`--yolo`**) — *"No sandbox; no approvals."*

**Headless / CI.** `codex exec "your task prompt here"`
([Non-interactive mode, fetched 2026-08-25](https://learn.chatgpt.com/docs/non-interactive-mode)):

| Flag | Meaning (verbatim where quoted) |
|---|---|
| `--json` | *"Converts stdout to JSON Lines format, emitting every event Codex produces"* |
| `-o, --output-last-message <path>` | writes the final message to a file |
| `--output-schema <path>` | structured JSON response conforming to a schema |
| `--sandbox <level>` | `workspace-write` \| `danger-full-access` |
| `--full-auto` | **deprecated** — *"use `--sandbox workspace-write` instead"* |
| `--ephemeral` | *"Skips persisting session files to disk"* — what you want in CI |
| `--ignore-user-config` | doesn't load `$CODEX_HOME/config.toml` |
| `--ignore-rules` | skips `.rules` files *"for controlled automation"* |
| `--skip-git-repo-check` | overrides the git-repo requirement |
| `codex exec resume [SESSION_ID]` / `resume --last` | continue a previous run |

stdin patterns are documented and genuinely useful for CI:
`npm test 2>&1 | codex exec "summarize failures and suggest fixes"` and `cat prompt.txt | codex exec -`.
Auth in CI: `CODEX_API_KEY=<key> codex exec --json "your task"`. stderr carries progress, stdout the
final message.

Official CI docs exist: the **Codex GitHub Action**, `openai/codex-action@v1`, with inputs
`openai-api-key`, `prompt` / `prompt-file`, `sandbox` (`workspace-write` | `read-only` |
`danger-full-access`), `safety-strategy` (default **`drop-sudo`**; `unsafe` for Windows), `output-file`
([Codex GitHub Action, fetched 2026-08-25](https://learn.chatgpt.com/docs/github-action)).

**Enterprise / team surface.** Business tier ships SAML SSO and MFA and no-training-by-default;
Enterprise/Edu adds *"Audit logs and usage monitoring"*
([pricing](https://learn.chatgpt.com/docs/pricing)). Fleet policy is enforced through
**`requirements.toml`** — notably `allow_managed_hooks_only`, which exists *only* there
(`10_coding_agents.md` §13.2).

**Vendor-stated limitations.** *"Running Codex in full access mode means Codex is not limited to your
project directory and might perform unintentional destructive actions that can lead to data loss."*
For CI, the guidance is explicit: *"Use an API key for CI/CD, not ChatGPT browser auth"*, and
*"set `CODEX_API_KEY` only for the Codex invocation that needs it, and make sure no untrusted code runs
in the same process environment."*
([agent-approvals-security](https://learn.chatgpt.com/docs/agent-approvals-security);
[non-interactive-mode](https://learn.chatgpt.com/docs/non-interactive-mode))

---

### 2.3 Antigravity CLI (`agy`) — Google

**Identity.** *"The terminal-first surface to interact with Antigravity agents"* — the TUI member of
Google's Antigravity product family, sharing a harness and settings with the Antigravity 2.0 desktop
editor ([product page](https://antigravity.google/product/antigravity-cli);
[CLI overview](https://antigravity.google/docs/cli/overview/)).

**Interaction model.** Keyboard-driven TUI, explicitly positioned for *"Fast local iterations, SSH,
headless"* with *"Native SSH, tmux, and terminal multiplexers"* support and *"Near-zero, extremely
lightweight"* overhead versus the GUI. Sessions started in the CLI can be imported into Antigravity 2.0.
Written in **Go** ([CLI overview](https://antigravity.google/docs/cli/overview/);
[Google Developers Blog, 2026-05-19](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)).

**Install — verbatim** ([Installation & Auth, fetched 2026-08-25](https://antigravity.google/docs/cli/install)):

```bash
# macOS and Linux
curl -fsSL https://antigravity.google/cli/install.sh | bash
```
```powershell
# Windows (PowerShell)
irm https://antigravity.google/cli/install.ps1 | iex
```
```cmd
:: Windows (CMD)
curl -fsSL https://antigravity.google/cli/install.cmd -o install.cmd && install.cmd && del install.cmd
```
Installs to `~/.local/bin/agy` on Unix, `C:\Users\<username>\AppData\Local\agy\bin` on Windows.
**Launch with `agy`.**

**Auth.** Two paths. (a) Account sign-in through the OS **keyring**; local machines get a browser
launched automatically, remote/SSH sessions print an authorization URL and code to complete locally.
(b) **Gemini API key** — set `"modelProvider": "gemini"` in settings and export `GEMINI_API_KEY`; the CLI
then *"skips sign-in and displays 'Gemini API key' in the header"*. `/logout` *"purges saved
authentication profiles from your operating system's keyring."*
([install docs](https://antigravity.google/docs/cli/install))

**Pricing / access model (checked 2026-08-25).** From
[antigravity.google/pricing](https://antigravity.google/pricing):
- **Individual — "$0/month"**, a genuine free tier, including *"Unlimited tab completions and command
  requests"* and *"Basic weekly rate limits"*. **This is the only one of the three products whose
  terminal agent is usable at $0.**
- **Google AI Pro** — *"More generous rate limits"*, *"Flexible AI credit pool"*. **Price not shown on
  this page.** `[UNVERIFIED price]`
- **Google AI Ultra** — higher limits again. **Price not shown on this page.** `[UNVERIFIED price]`
- **Organization (via Google Cloud)** — *"Access under Google Cloud Terms of Service"*, Google Cloud
  project integration, *"Consumption-Based API Pricing with Gemini Enterprise Agent Platform"*.

**Model support.** The free Individual tier lists *"Gemini 3.5 Flash, Gemini 3.1 Pro, Claude Sonnet &
Opus 4.6, gpt-oss-120b"*; the models page enumerates **Gemini 3.7 Flash, Gemini 3.6 Flash, Gemini 3.5
Flash, Gemini 3.1 Pro, Claude Sonnet 4.6 (thinking), Claude Opus 4.6 (thinking), GPT-OSS-120b**, plus
**Nano Banana 2** for image generation, with availability varying by tier
([Models, fetched 2026-08-25](https://antigravity.google/docs/models/);
[pricing](https://antigravity.google/pricing)). **This is the headline differentiator: Antigravity is
the only one of the three that serves a competitor's frontier models (Claude Opus/Sonnet 4.6) from its
own free tier.** BYOK is limited to a **Gemini** API key; there is no documented way to point `agy` at
Anthropic or OpenAI directly.

**Extension mechanisms.**
- **Rules (instruction files).** Global: `~/.gemini/GEMINI.md`. Workspace: the **`.agents/rules`** folder,
  with *"backward support for `.agent/rules`"*. Each rule file is capped at **12,000 characters**.
  Four activation modes: **Manual** (@mention), **Always On**, **Model Decision** (from the description),
  **Glob** (e.g. `*.js`). `@filename` references pull in other files
  ([Rules and Workflows, fetched 2026-08-25](https://antigravity.google/docs/rules-workflows/)).
  `AGENTS.md` is read as a project-level cross-tool rules file `[UNVERIFIED — I could not confirm this
  from a page I fetched; the rules-workflows page names GEMINI.md and .agents/rules only]`.
- **Workflows (custom commands).** Markdown files, 12,000-char limit, invoked `/workflow-name`, and they
  can call other workflows sequentially ([rules-workflows](https://antigravity.google/docs/rules-workflows/)).
- **Skills.** Workspace skills in **`.agents/skills/`** at project root; global skills in
  `~/.gemini/antigravity-cli/skills/`. Frontmatter requires `name` and `description`. *"Once added, they
  become slash commands automatically."* Browse with `/skills`
  ([Plugins & Skills, fetched 2026-08-25](https://antigravity.google/docs/cli/plugins/)).
  Note `.agents/skills` matches Codex, Gemini CLI, Cursor and Copilot — the vendor-neutral convention
  established in `10_coding_agents.md` §1.3 holds.
- **Subagents.** *"An asynchronous subagents framework that allows the main agent to delegate parallel
  work, perform background research, and run system tests without blocking your active conversation."*
  Managed in the `/agents` panel; packaged under a plugin's `agents/` directory
  ([Features, fetched 2026-08-25](https://antigravity.google/docs/cli/features/)).
  Async-by-default is a real design difference from Claude Code and Codex.
- **Hooks.** `hooks.json` inside a plugin, or defined in `settings.json`; inspected with `/hooks`
  ([plugins](https://antigravity.google/docs/cli/plugins/)). Event list `[UNVERIFIED]` — I did not find
  a page enumerating the hook events.
- **MCP.** `/mcp` slash command; plugins may ship `mcp_config.json`
  ([features](https://antigravity.google/docs/cli/features/); [plugins](https://antigravity.google/docs/cli/plugins/)).
- **Plugins.** Installed to `~/.gemini/antigravity-cli/plugins/<plugin_name>/` with a **`plugin.json`**
  manifest at the root (`name` required — alphanumeric, hyphens, underscores; `description` optional),
  plus optional `skills/`, `agents/`, `rules/` directories and optional `mcp_config.json` and
  `hooks.json`. Commands: `agy plugin list`, `agy plugin install /path/to/plugin`,
  `agy plugin enable <name>` / `disable <name>`, `agy plugin uninstall <name>`
  ([plugins](https://antigravity.google/docs/cli/plugins/)).

**Permissions & sandboxing.** A **resource-based** permission model, unlike the tool-based models of the
other two. Three access-list modes with strict precedence **Deny > Ask > Allow**: *"Deny — the action is
blocked immediately"*, *"Ask — the Agent pauses and prompts for your explicit approval"*, *"Allow — the
action is auto-approved without prompting."* Resources: `read_file(path)`, `write_file(path)`,
`read_url(domain)`, `execute_url(domain)`, `command(pattern)`, `unsandboxed(pattern)`,
`mcp(server/tool)`, all wildcard-capable. Defaults: reads/writes inside the workspace are auto-allowed;
`read_url` / `execute_url` default to **Ask**; commands, MCP tools and non-workspace files default to
**Ask** ([Permissions, fetched 2026-08-25](https://antigravity.google/docs/permissions/)).

Layered on top, a `toolPermission` setting in `~/.gemini/antigravity-cli/settings.json` with values
**`request-review` (default)**, `proceed-in-sandbox`, `strict`, `always-proceed`; plus
`artifactReviewPolicy` (`asks-for-review` | `agent-decides` | `always-proceed`) and
`allowNonWorkspaceAccess` (defaults **off**)
([Settings, Rendering & Keybindings, fetched 2026-08-25](https://antigravity.google/docs/cli/settings/)).

Execution modes cycle with **Shift+Tab**: `default` → `accept-edits` → `plan` → `default`; settable as
`"agentMode"` in settings or per-session with `agy --mode=plan`. In `accept-edits`, *"subagents inherit
this setting too"* ([Choose an execution mode, fetched 2026-08-25](https://antigravity.google/docs/cli/modes/)).

**Sandbox — and this is the finding to put on a slide.** *"The sandbox is disabled by default."*
Enable with:
```json
{
    "enableTerminalSandbox": true
}
```
in `~/.gemini/antigravity-cli/settings.json`. Implementation is native per OS: **Linux — `nsjail`**
(*"Open-source process isolator utilizing kernel namespaces and cgroups"*); **macOS — `sandbox-exec`**;
**Windows — `AppContainer`**. With the sandbox on, a prompt offers *"Yes, and run without sandbox
restrictions"* for one run; with it off, a prompt offers *"Yes, and run in sandbox"* to contain a risky
command ([Sandbox, fetched 2026-08-25](https://antigravity.google/docs/cli/sandbox/)).
Domains granted under `read_url` are compiled into the container's outbound network allowlist
([permissions](https://antigravity.google/docs/permissions/)).

**Headless / CI.** *"Run Antigravity CLI non-interactively to script agent tasks, integrate with CI
pipelines, and capture machine-readable output."*
([Headless mode, fetched 2026-08-25](https://antigravity.google/docs/cli/headless/))
- `agy -p "Your prompt here"` (aliases `--print`, `--prompt`)
- `--output-format text | json | stream-json` — text is the default; json is *"a single JSON envelope
  with metadata"*; stream-json is *"newline-delimited JSON events"*
- `--input-format stream-json` with `--output-format stream-json` keeps one process alive across
  multiple prompts, *"eliminating startup overhead"* — a genuinely nicer multi-turn CI story than either
  competitor
- Permissions in headless follow policy: grant via `permissions.allow` in
  `~/.gemini/antigravity-cli/settings.json`, *"or override with `--dangerously-skip-permissions`
  (use cautiously)"*
- Exit codes: **0** success, non-zero failure with details in the `error` field for JSON formats
- Auth: uses cached credentials, so authenticate once interactively first; an unauthenticated
  non-interactive run *"exits with an authentication required error instead of hanging"*

**No first-party GitHub Action is documented** for `agy` on the pages I fetched. `[UNVERIFIED]` —
if one exists I did not find it, which is a real gap versus `anthropics/claude-code-action@v1` and
`openai/codex-action@v1`.

**Enterprise / team surface.** Enterprise access runs through **Gemini Enterprise**, in two shapes:
a **Gemini Enterprise License** (*"access to included quotas, managed overages as well as advanced
administrative controls"*) or the **Gemini Enterprise Agent Platform** with *"consumption-based
billing"*. SSO detects your license tier automatically; licenses are assigned by a Google Cloud
administrator. Governance features: **VPC Service Controls** to *"enforce private networking security
perimeters"*, and request & response logging to *"audit model interactions and maintain enterprise
compliance records"* ([Enterprise, fetched 2026-08-25](https://antigravity.google/docs/enterprise/)).

**Honest limitations.** The docs are visibly younger than the other two: no enumerated hook-event list,
no published CI action, no rules page confirming `AGENTS.md`, and the paths carry `~/.gemini/` legacy
(settings live at `~/.gemini/antigravity-cli/settings.json`, global rules at `~/.gemini/GEMINI.md`),
which is itself evidence of how recent the Gemini-CLI→Antigravity transition is. The public issue
tracker shows open headless/non-TTY defects (`--print` behaviour in pipes, `permissions.allow` handling
in `--print` mode) — I did not fetch those issues, so treat as `[UNVERIFIED]` search-surface signal, but
it is consistent with a ~3-month-old product.

---

## 3. Pricing table

> ⚠️ **THIS TABLE AGES IN WEEKS, NOT MONTHS.** All figures read off vendor pricing pages on
> **2026-08-25**. In the module, print the date next to the table and tell students to re-check before
> quoting it to anyone. Do not let this table be screenshotted without its date.

| Product | What you actually buy | Tiers (as displayed 2026-08-25) | Free tier? | Date checked |
|---|---|---|---|---|
| **Claude Code** | A Claude **subscription seat** *or* Console **API tokens** | Pro **$17**/mo annual ($20 monthly) · Max 5x **"From $100"** · Max 20x **"From $100"** ⚠️ · Team Standard **$20**/seat annual ($25 monthly) · Team Premium **$100**/seat annual ($125 monthly) · Enterprise **$20/seat + usage at API rates** | **No.** *"The free Claude.ai plan does not include Claude Code access."* | 2026-08-25 |
| **OpenAI Codex** | A **ChatGPT plan** (metered in credits) *or* an **OpenAI API key** (per-token) | Free **$0** · Go **$8**/mo · Plus **$20**/mo · Pro **from $100**/mo (**$200** for the 20x tier) · Business **$20**/user/mo annual · Enterprise & Edu **custom** | **Yes** — Free tier, *"quick coding tasks"* | 2026-08-25 |
| **Antigravity CLI** | A **Google AI plan** *or* Google Cloud **consumption** billing; or a Gemini API key | Individual **$0**/mo · Google AI **Pro** (price not on page) · Google AI **Ultra** (price not on page) · Organization = consumption-based via Google Cloud | **Yes** — Individual $0, incl. Claude Opus/Sonnet 4.6 access | 2026-08-25 |

**Prices I could NOT confirm today** (do not state them in the module):
- **Google AI Pro** and **Google AI Ultra** monthly prices — `antigravity.google/pricing` shows the
  tier contents but no numbers, and I found no vendor page carrying them that I fetched. `[UNVERIFIED]`
- **Claude Max 20x** — the pricing page rendered **"From $100"** for both Max 5x *and* Max 20x. That is
  almost certainly a card-level "from" label rather than the 20x price. **Do not print a Max 20x
  number.** `[UNVERIFIED]`
- **The dollar value of one Codex credit.** The rate card is denominated in credits per 1M tokens; the
  credit→USD conversion was not on a page I fetched. `[UNVERIFIED]`

---

## 4. Extension-mechanism matrix

Empty cells = **not verified**, not "does not exist".

| | **Claude Code** | **OpenAI Codex** | **Antigravity CLI (`agy`)** |
|---|---|---|---|
| **Instruction file** | `CLAUDE.md` (explicitly *not* `AGENTS.md`; bridge via `@AGENTS.md` import or symlink) | `AGENTS.md` + `AGENTS.override.md`, concatenated git-root→cwd, 32 KiB cap | **Rules**: global `~/.gemini/GEMINI.md`; workspace `.agents/rules/` (bc `.agent/rules`), 12,000 chars per file, 4 activation modes |
| **Custom commands** | Merged into **Skills** (`.claude/commands/*.md` still works) | `~/.codex/prompts/*.md` — **deprecated**, "use skills" | **Workflows**: markdown, 12,000 chars, invoked `/workflow-name`, can chain |
| **Skills / agent skills** | **Skills** — `.claude/skills/<name>/SKILL.md`, agentskills.io spec | **Skills** — `.agents/skills`, `$HOME/.agents/skills`, `/etc/codex/skills`; invoked `$skill` | **Skills** — `.agents/skills/` (workspace), `~/.gemini/antigravity-cli/skills/` (global); auto-become slash commands; `/skills` |
| **Hooks** | **Hooks** — ~31 events, `settings.json`; `PostToolUse` cannot block | **Hooks** — 11 PascalCase events, `hooks.json` or `[hooks]` in `config.toml`; async + MCP-tool handlers since 0.148.0 | **Hooks** — `hooks.json` in a plugin or in `settings.json`; `/hooks` to inspect. *Event list unverified* |
| **MCP** | **MCP** — `.mcp.json` / settings; tool defs deferred by default | **MCP** — `[mcp_servers.<name>]` in `config.toml`; `codex mcp add/list/login` | **MCP** — `/mcp`; plugin-level `mcp_config.json` |
| **Subagents** | **Subagents** — `.claude/agents/`, own context, model selectable | **Subagents** — `.codex/agents/*.toml`, `developer_instructions` required | **Subagents** — **asynchronous by design**, `/agents` panel, plugin `agents/` dir |
| **Plugins** | **Plugins** — `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` | **Plugins** — `.codex-plugin/plugin.json` (JSON, not TOML) | **Plugins** — `plugin.json` at plugin root, installed to `~/.gemini/antigravity-cli/plugins/<name>/`; `agy plugin list\|install\|enable\|disable\|uninstall` |

**The teachable observation:** the *rows* are now identical across three competing vendors. Seven
concepts — instruction file, commands, skills, hooks, MCP, subagents, plugins — plus a sandbox and a
headless flag. A developer who learns the *concepts* moves between all three in an afternoon; a
developer who memorises `CLAUDE.md` is stuck. **That is the thesis of this module.**

---

## 5. Sandboxing & permissions comparison

| | **Claude Code** | **OpenAI Codex** | **Antigravity CLI** |
|---|---|---|---|
| **Sandbox on by default?** | **No** — `sandbox.enabled` is opt-in | **Yes** — *"The default permissions mode applies sandboxing automatically"*, `workspace-write` | **No** — *"The sandbox is disabled by default"* |
| **Linux** | `bubblewrap` + `socat`, optional seccomp filter (`@anthropic-ai/sandbox-runtime`); Ubuntu 24.04+ needs an AppArmor tweak | `bubblewrap` (bwrap) | **`nsjail`** (namespaces + cgroups) |
| **macOS** | Seatbelt (built in, nothing to install) | Seatbelt | `sandbox-exec` |
| **Windows** | **Not supported** — use WSL2 | Native Windows sandbox in PowerShell; Linux impl under WSL2 | **`AppContainer`** |
| **Model shape** | Permission **modes** (session baseline) + permission **rules** (per-tool) + a separate Bash sandbox | Two orthogonal layers: `sandbox_mode` × `approval_policy` | Resource **access lists** (Deny > Ask > Allow) + `toolPermission` + execution mode |
| **Mode names** | `default` (Manual), `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions` | sandbox: `read-only`, `workspace-write`, `danger-full-access` · approval: `untrusted`, `on-request`, `never` | exec mode: `default`, `accept-edits`, `plan` · `toolPermission`: `request-review`, `proceed-in-sandbox`, `strict`, `always-proceed` |
| **Interactive default** | **auto mode** on Pro/Max/Team (a classifier reviews actions) | `workspace-write` + `on-request` | `default` mode + `request-review` |
| **`-p` / headless default** | **`default` (Manual)** — different from interactive! | as configured; `--sandbox` per invocation | policy-driven via `permissions.allow` |
| **Network egress default** | Sandboxed commands prompt on each new domain | **Off** in `workspace-write` unless `network_access = true` | `read_url`/`execute_url` default to **Ask**; granted domains compile into the container allowlist |
| **The nuclear option** | `--dangerously-skip-permissions` (docs: container/VM required, run as non-root) | `--dangerously-bypass-approvals-and-sandbox` (alias **`--yolo`**) | `--dangerously-skip-permissions` (*"use cautiously"*) |
| **Enforce for a fleet** | managed settings: `permissions.defaultMode`, `disableAutoMode`, `sandbox.failIfUnavailable`, `allowManagedDomainsOnly` | `requirements.toml`, incl. `allow_managed_hooks_only` | Gemini Enterprise admin console; VPC Service Controls |

**Three things worth a callout box:**
1. **Codex is the only one sandboxed out of the box.** Claude Code and Antigravity both ship the
   sandbox *off*. Students who assume "the agent is contained" are wrong twice out of three times.
2. **Only Codex sandboxes on native Windows.** Claude Code says use WSL2.
3. **Every vendor named its escape hatch with the word "dangerous."** That is a gift for the module's
   security section — the vendors have already written your warning label.

---

## 6. Headless / CI comparison — exact flags

| | **Claude Code** | **OpenAI Codex** | **Antigravity CLI** |
|---|---|---|---|
| **Entry point** | `claude -p "<prompt>"` (`--print`) | `codex exec "<prompt>"` | `agy -p "<prompt>"` (`--print`, `--prompt`) |
| **Structured output** | `--output-format text\|json\|stream-json` | `--json` (JSON Lines) | `--output-format text\|json\|stream-json` |
| **Schema-constrained** | `--json-schema '<schema>'` → `structured_output` | `--output-schema <path>` | — |
| **Multi-turn in one process** | `--continue` / `--resume "$id"` | `codex exec resume [SESSION_ID]` / `resume --last` | `--input-format stream-json` + `--output-format stream-json` |
| **Permission control** | `--permission-mode dontAsk` + `--allowedTools "Bash(npm test)" "Read"` | `--sandbox workspace-write` (`--full-auto` deprecated) | `permissions.allow` in settings, or `--dangerously-skip-permissions` |
| **Reproducibility** | **`--bare`** — skips hooks, skills, commands, subagents, plugins, MCP, auto memory, CLAUDE.md | `--ignore-user-config`, `--ignore-rules`, `--ephemeral` | — |
| **stdin** | piped stdin read as context, **10 MB cap** | `\| codex exec "..."` for context; `codex exec -` for stdin-as-prompt | — |
| **Auth in CI** | `ANTHROPIC_API_KEY` (required with `--bare`) or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` | `CODEX_API_KEY=<key> codex exec ...` — docs say **use an API key, not browser auth** | cached credentials — authenticate interactively once first |
| **Exit codes** | 0 / non-zero; **143** on SIGTERM | 0 / non-zero | 0 / non-zero, error in the `error` field |
| **Official CI action** | **`anthropics/claude-code-action@v1`** + GitLab CI/CD docs | **`openai/codex-action@v1`** (`sandbox`, `safety-strategy: drop-sudo`) | **none found** `[UNVERIFIED]` |
| **Turn cap** | `--max-turns N` (via `claude_args` in Actions) | — | — |

**The one line every student should copy:**
```bash
claude -p "run the test suite" --permission-mode dontAsk --allowedTools "Bash(npm test)" "Read"
```
verbatim from [permission-modes](https://code.claude.com/docs/en/permission-modes) — it demonstrates
deny-by-default CI in a single command. The Codex equivalent:
```bash
npm test 2>&1 | codex exec --json --ephemeral --sandbox workspace-write "summarize failures and suggest fixes"
```

---

## 7. What to teach vs what to skip

The module is ~300 lines. Budget it like this.

### TEACH (≈220 lines)

1. **The thesis, up front (~15 lines).** Three vendors, one shape. Instruction file · commands ·
   skills · subagents · hooks · MCP · plugins · sandbox · headless flag. Learn the shape; the vendor is
   a config detail. Anchor with the §4 matrix.
2. **The §4 extension matrix (~35 lines).** This is the artifact students will screenshot. It also
   quietly teaches vendor-neutrality: `.agents/skills/` is read by Codex, Antigravity, Cursor, Copilot
   and Gemini alike.
3. **Defaults and sandboxing (~50 lines) — the highest-value section.** Codex sandboxed by default;
   Claude Code and Antigravity not. Name the OS primitives (`bubblewrap`/`nsjail`/Seatbelt/
   `sandbox-exec`/AppContainer) because on Linux — the module's audience — the student has to
   `apt-get install` something for Claude Code and flip `enableTerminalSandbox` for `agy`. Then the
   permission-mode vocabularies side by side. Close on the three `--dangerously-*` flags and *why*
   each vendor chose that word.
4. **Headless / CI (~45 lines).** The two copy-paste commands above, `--bare` / `--ignore-user-config`
   as the reproducibility story, the two GitHub Actions, and the CI auth rule (API key, never browser
   auth). Flag that Antigravity has no published Action yet — that is a real selection criterion.
5. **Money (~35 lines).** The §3 table **with the date stamped on it**. The three billing shapes —
   subscription seat, per-token API, credit pool — and how to pick. Anthropic's own
   *"$150-250 per developer per month"* is the number to give a manager. State plainly that Antigravity
   is the only free path to a capable terminal agent, and that it serves Claude Opus 4.6 on that free
   tier.
6. **A 10-line "how to choose" decision block (~20 lines).** Deep-in-a-large-codebase + team hooks and
   plugins → Claude Code. Windows-native + sandbox-by-default + tightest CI story → Codex. Zero budget,
   or you want model choice including competitors' models, or async subagents → Antigravity.
7. **The renaming lesson (~20 lines).** Claude Code's slash commands became Skills; Codex's prompts are
   deprecated in favour of skills; Gemini CLI became Antigravity CLI and stopped serving requests on
   2026-06-18. Teach students to check the docs date, not their memory — and to notice that *their own
   AI assistant's* memory is stale here too. This is the module's most durable lesson.

### SKIP (say why, in one line each)

- **Per-vendor hook event tables.** 31 vs 11 vs unverified. That's `11_harness_engineering.md`.
- **MCP protocol internals**, transports, the 2026-07-28 breaking revision. `10_coding_agents.md` §14.
- **Benchmarks and leaderboards.** They are stale before the module ships and the framing has changed
  (see `10_coding_agents.md` §14.6). Teach evaluation-in-your-repo instead.
- **Cursor, Copilot, Windsurf, Aider, open-source agents.** Different scope; `10_coding_agents.md` §13
  already covers the IDE side.
- **Full CLI flag references.** Link them. `--help` is one keystroke away and always current.
- **Model naming.** GPT-5.6 Sol/Terra/Luna and Gemini 3.7/3.6/3.5 will be wrong by the time anyone
  reads this. Teach "check `/model`", print no model table.
- **Precise Max-20x / Google-AI-Pro prices.** I could not verify them; neither should the module state
  them.

---

## 8. References for the module (reader-facing)

All 200 on 2026-08-25 by direct fetch.

1. [Advanced setup — Claude Code](https://code.claude.com/docs/en/setup) — install commands, platforms, auth.
2. [Manage costs effectively — Claude Code](https://code.claude.com/docs/en/costs) — subscription vs API billing, per-dev cost figures.
3. [Choose a permission mode — Claude Code](https://code.claude.com/docs/en/permission-modes) — the six modes and the CI recipe.
4. [Configure the sandboxed Bash tool — Claude Code](https://code.claude.com/docs/en/sandboxing) — Seatbelt / bubblewrap, defaults, strict mode.
5. [Run Claude Code programmatically — Claude Code](https://code.claude.com/docs/en/headless) — `-p`, `--bare`, output formats, exit codes.
6. [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions) — `anthropics/claude-code-action@v1`.
7. [Codex CLI — ChatGPT Learn](https://learn.chatgpt.com/docs/codex/cli) — install and sign-in.
8. [Pricing — ChatGPT Learn](https://learn.chatgpt.com/docs/pricing) — plan tiers and the credit rate card.
9. [Sandbox — ChatGPT Learn](https://learn.chatgpt.com/docs/sandboxing) — `sandbox_mode` × `approval_policy`.
10. [Agent approvals & security — ChatGPT Learn](https://learn.chatgpt.com/docs/agent-approvals-security) — Read Only / Auto / Full Access, network default.
11. [Non-interactive mode — ChatGPT Learn](https://learn.chatgpt.com/docs/non-interactive-mode) — every `codex exec` flag.
12. [Codex GitHub Action — ChatGPT Learn](https://learn.chatgpt.com/docs/github-action) — `openai/codex-action@v1`.
13. [Overview — Antigravity CLI](https://antigravity.google/docs/cli/overview/) and [Installation & Auth](https://antigravity.google/docs/cli/install) — what `agy` is, how to install it.
14. [Headless mode — Antigravity CLI](https://antigravity.google/docs/cli/headless/) and [Sandbox](https://antigravity.google/docs/cli/sandbox/) — `-p`, and the sandbox that is off by default.
15. [An important update: Transitioning Gemini CLI to Antigravity CLI](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/) — the 2026 renaming lesson, in Google's own words.

---

## 9. Link Verification Log

Every URL below was fetched by me on **2026-08-25**.

| URL | Result | Claim it supports |
|---|---|---|
| https://github.com/google-antigravity/antigravity-cli | ✅ 200 | antigravity-cli exists, is Google's, `agy` binary, install.sh |
| https://antigravity.google/docs/cli/overview/ | ✅ 200 | "lightweight TUI surface of Antigravity"; SSH/tmux; low overhead |
| https://antigravity.google/docs/cli/install | ✅ 200 | verbatim install cmds; `~/.local/bin/agy`; keyring auth; `modelProvider`/`GEMINI_API_KEY`; `/logout` |
| https://antigravity.google/product/antigravity-cli | ✅ 200 | "terminal-first surface to interact with Antigravity agents" |
| https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/ | ✅ 200 | dated 2026-05-19; Gemini CLI ceased 2026-06-18; Go; skills/hooks/subagents/plugins carried over |
| https://antigravity.google/blog/introducing-google-antigravity-cli | ✅ 200 | publication date 2026-05-19; positioning; migration guides |
| https://antigravity.google/pricing | ✅ 200 | Individual $0/month; Pro/Ultra contents w/o prices; Organization consumption-based; free-tier model list |
| https://antigravity.google/docs/models/ | ✅ 200 | exact model names incl. Claude Sonnet/Opus 4.6, GPT-OSS-120b, Nano Banana 2 |
| https://antigravity.google/docs/permissions/ | ✅ 200 | Deny>Ask>Allow; resource list; workspace auto-allow; read_url→Ask |
| https://antigravity.google/docs/cli/modes/ | ✅ 200 | default/accept-edits/plan; Shift+Tab; `agentMode`; `agy --mode=plan` |
| https://antigravity.google/docs/cli/sandbox/ | ✅ 200 | **disabled by default**; nsjail/sandbox-exec/AppContainer; `enableTerminalSandbox`; escape prompts |
| https://antigravity.google/docs/cli/headless/ | ✅ 200 | `-p`/`--print`/`--prompt`; `--output-format`; `--input-format`; `--dangerously-skip-permissions`; exit codes |
| https://antigravity.google/docs/cli/plugins/ | ✅ 200 | `plugin.json`; plugin dir layout; `.agents/skills/`; global skills path; `agy plugin *` |
| https://antigravity.google/docs/cli/settings/ | ✅ 200 | settings path; `toolPermission` values + default; `artifactReviewPolicy`; `allowNonWorkspaceAccess` |
| https://antigravity.google/docs/cli/features/ | ✅ 200 | async subagents; `/agents`; `/mcp`; `/skills`; sandbox names |
| https://antigravity.google/docs/cli/reference/ | ✅ 200 | slash-command inventory; settings keys |
| https://antigravity.google/docs/cli/using/ | ✅ 200 | settings/keybindings paths; `/rewind` `/fork` `/resume`; `!` shell prefix |
| https://antigravity.google/docs/rules-workflows/ | ✅ 200 | `~/.gemini/GEMINI.md`; `.agents/rules` (bc `.agent/rules`); 12,000-char cap; 4 activation modes; workflows |
| https://antigravity.google/docs/enterprise/ | ✅ 200 | Gemini Enterprise License vs Agent Platform; VPC-SC; request/response logging; SSO tier detection |
| https://antigravity.google/docs/rules/ | ❌ **404** | — (rules live at `/docs/rules-workflows/`) |
| https://antigravity.google/docs/ | ↪️ redirect to `/docs/getting-started` | — |
| https://code.claude.com/docs/en/setup | ✅ 200 | all install commands; requirements; "free plan does not include Claude Code"; Bedrock/Agent Platform/Foundry |
| https://code.claude.com/docs/en/costs | ✅ 200 | subscription vs API; $13/active day, $150-250/dev/month; Teams/Enterprise controls; 7x agent-team cost |
| https://code.claude.com/docs/en/permission-modes | ✅ 200 | six modes; auto default on Pro/Max/Team; `-p` starts `default`; the `dontAsk` CI recipe |
| https://code.claude.com/docs/en/sandboxing | ✅ 200 | Seatbelt/bubblewrap+socat/seccomp; no native Windows; strict mode; `dangerouslyDisableSandbox` |
| https://code.claude.com/docs/en/headless | ✅ 200 | `-p`, `--bare`, `--output-format`, `--json-schema`, `--allowedTools`, exit 143 on SIGTERM, 10 MB stdin cap |
| https://code.claude.com/docs/en/github-actions | ✅ 200 | `anthropics/claude-code-action@v1`; secrets; `claude_args`; `/install-github-app` |
| https://claude.com/pricing | ✅ 200 | plan prices as displayed (see §3 caveat on Max 20x) |
| https://learn.chatgpt.com/docs/codex/cli | ✅ 200 | install commands; sign-in; `/permissions`; `codex exec` |
| https://learn.chatgpt.com/docs/pricing | ✅ 200 | Free/Go/Plus/Pro/Business/Enterprise prices; API-key option; credit rate card |
| https://learn.chatgpt.com/docs/sandboxing | ✅ 200 | platform-native enforcement; sandbox_mode + approval_policy values and defaults |
| https://learn.chatgpt.com/docs/agent-approvals-security | ✅ 200 | Read Only/Auto/Full Access verbatim; `--yolo`; `network_access = true` |
| https://learn.chatgpt.com/docs/non-interactive-mode | ✅ 200 | every `codex exec` flag; stdin patterns; `CODEX_API_KEY`; stdout/stderr split |
| https://learn.chatgpt.com/docs/github-action | ✅ 200 | `openai/codex-action@v1`; inputs; `safety-strategy: drop-sudo` |
| https://learn.chatgpt.com/docs/codex | ❌ **404** | — (guessed path; use `/docs/codex/cli`) |
| https://learn.chatgpt.com/docs/codex/pricing | ❌ **404** | — (pricing is at `/docs/pricing`) |
| https://learn.chatgpt.com/docs/codex/sandbox | ❌ **404** | — (sandbox is at `/docs/sandboxing`) |

**Not fetched, cited only as prior work:** `10_coding_agents.md` §13.2 (Codex extension internals) and
§13.3 (Gemini CLI) — verified in that dossier's own pass on 2026-08-25, per the brief's instruction not
to re-research them.

---

## 10. Open questions / `[UNVERIFIED]`

1. **Google AI Pro and Ultra monthly prices.** `antigravity.google/pricing` lists tier contents with no
   numbers. Next action: check `one.google.com` or a Google AI plans page directly.
2. **Claude Max 20x price.** The pricing page rendered *"From $100"* for both Max cards. Almost
   certainly a card label, not the 20x price. Re-read the page's billing toggle before quoting.
3. **Codex credit → USD conversion.** The rate card is in credits per 1M tokens. The dollar value of a
   credit was not on a page I fetched. Lead: `help.openai.com` "Codex rate card" article.
4. **Antigravity hook event list.** No page I fetched enumerates the events. Leads: `/docs/cli/hooks/`
   (not tried), the repo's docs directory, `agy --help`.
5. **Does `agy` read `AGENTS.md`?** Third-party sources say yes; the official `/docs/rules-workflows/`
   page names only `~/.gemini/GEMINI.md` and `.agents/rules`. **Do not assert it in the module until
   confirmed.** Lead: `/docs/cli/rules/` variants, or the migration guide for Gemini CLI users.
6. **Antigravity CI story.** No first-party GitHub Action found. Lead: the repo, and
   `/docs/cli/headless/` "next steps".
7. **The 2026-08-25 availability claim** for Antigravity CLI from a search snippet contradicts the
   blog's 2026-05-19 date. Treated as an index artifact; not used.
8. **Antigravity headless defects.** The public issue tracker surfaces open `--print` / non-TTY and
   `permissions.allow` bugs. I did not fetch the issues; if the module recommends `agy` for CI, verify
   first.
9. **Claude Code Max tier and Claude Code inclusion.** The pricing page's Max cards say *"Everything in
   Pro, plus"*; I inferred Claude Code inclusion transitively rather than reading it verbatim on the
   Max card.

---

## RESUME NOTES (written 2026-08-25)

### DONE
- §1 name verification (antigravity-cli confirmed real, Google's, `agy`, successor to Gemini CLI).
- §2.1 Claude Code, §2.2 Codex, §2.3 Antigravity — full deep dives, all sections of the brief covered.
- §3 pricing table with explicit unverified flags. §4 extension matrix. §5 sandboxing/permissions.
  §6 headless/CI. §7 teach/skip. §8 references. §9 link log. §10 open questions.

### PARTIAL
- Antigravity hook events, `AGENTS.md` support, and CI action — see §10 items 4–6.
- Three prices unconfirmed — see §10 items 1–3.

### SEARCHES RUN
`antigravity-cli Google Antigravity CLI` · `antigravity.google docs cli headless non-interactive mode
print flag` · `antigravity.google docs cli permissions sandbox approval modes` · `antigravity.google
docs cli plugins skills hooks subagents AGENTS.md` · `antigravity.google docs enterprise admin managed
settings policy audit logs` · `"antigravity.google/docs" AGENTS.md rules instruction file agent memory`
· `learn.chatgpt.com/docs Codex CLI install npm quickstart` · `learn.chatgpt.com/docs/codex "codex exec"
headless CI automation` · `learn.chatgpt.com/docs Codex sandbox approval modes read-only workspace-write
danger-full-access` · `Codex pricing ChatGPT Plus Pro Business plans credits learn.chatgpt.com`

### DEAD URLS
`antigravity.google/docs/rules/` (404) · `antigravity.google/docs/cli/models/` (404) ·
`learn.chatgpt.com/docs/codex` (404) · `learn.chatgpt.com/docs/codex/pricing` (404) ·
`learn.chatgpt.com/docs/codex/sandbox` (404). `antigravity.google/docs/` redirects to
`/docs/getting-started`.

### NEXT ACTIONS (ordered)
1. Confirm Google AI Pro/Ultra prices and Claude Max 20x price; update §3 or keep them out of the module.
2. Find the Antigravity hook event list; fill the §4 cell.
3. Settle whether `agy` reads `AGENTS.md`; §4 row 1 depends on it.
4. **Reconcile `10_coding_agents.md` §13.3 (Gemini CLI) with this dossier** — that section now
   documents a retired product and will mislead the module author.
5. Find the Codex credit→USD rate for §3.
