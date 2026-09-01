# Research Dossier — Module 15: The Coding-Agent Landscape (open-source wing)

**Prepared:** 2026-08-25 · **Scope:** four repo-owner-named projects — `opencode`, `Hermes Agent`, `deepseek-harness`, `pi.dev`
**Method:** GitHub REST API via `gh` (repo metadata, LICENSE blobs, release lists, git trees), direct `curl` of `raw.githubusercontent.com` for READMEs and in-repo docs, and `WebFetch` of official docs sites. Two WebSearch queries were used **only for discovery**, never as a source of fact.
**Status:** COMPLETE for the required scope. See `## RESUME NOTES` for the leads I deliberately did not chase.

> **Headline:** all four names are real. **`deepseek-harness` and `pi.dev` both exist and are both first-party.** The one that needs surgery is **`opencode`** — there are two different projects with that name, and the one you almost certainly mean **changed GitHub org in the last year**, so half the install docs on the internet are now wrong.

---

## 1. Name verification table

| Name given | Verified? | Canonical name | Owner / maintainer | Repo / docs URL | License (from LICENSE blob) | Latest release + date | Recommendation |
|---|---|---|---|---|---|---|---|
| **opencode** | ✅ YES — but **ambiguous**, see §2.1 | **opencode** (lowercase) | **Anomaly** (`anomalyco`) — the SST / OpenNext / OpenAuth / OpenTUI company | [github.com/anomalyco/opencode](https://github.com/anomalyco/opencode) · docs [opencode.ai/docs](https://opencode.ai/docs/) | **MIT** (`gh api repos/anomalyco/opencode/license` → `path: LICENSE`, `spdx_id: MIT`) | **v1.18.23**, 2026-08-25 | **KEEP — but write `anomalyco/opencode`, never `sst/opencode`** |
| *(the other opencode)* | ✅ YES — **archived, renamed** | now **Crush** | `opencode-ai` org → **Charm** (`charmbracelet/crush`) | [github.com/opencode-ai/opencode](https://github.com/opencode-ai/opencode) (archived) → [github.com/charmbracelet/crush](https://github.com/charmbracelet/crush) | MIT (old repo); Crush is `NOASSERTION` per GitHub API | old repo's last release **v0.0.55**, 2025-06-27 | **MENTION IN ONE SENTENCE** as the disambiguation, then move on |
| **Hermes Agent** | ✅ YES (verified in the Module 14 pass — not redone) | **Hermes Agent** | **Nous Research** (`NousResearch`) | [github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) · docs [hermes-agent.nousresearch.com/docs](https://hermes-agent.nousresearch.com/docs/) | **MIT** | `v2026.8.19` (= product **v0.20.5**), 2026-08-21 | **KEEP, but demote** — it is a *personal* agent that can do coding work, not a coding agent. See §2.2 |
| **deepseek-harness** | ✅ **YES — real and first-party** | **DeepSeek Harness**, CLI binary **`dsh`** | **DeepSeek AI** (`deepseek-ai`) | [github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) · [deepseek.com/harness/en](https://deepseek.com/harness/en/) | **MIT** (`spdx_id: MIT`; README: "[MIT](LICENSE)") | **`dsh-v0.1.1-rc.2`**, 2026-08-21 — **release-candidate, developer preview** | **KEEP — but label it "developer preview" in the module text.** It is 12 days old as a public repo |
| **pi.dev** | ✅ **YES — real; it is the website of the `pi` coding agent** | **pi** (the CLI is `pi`); npm package `@earendil-works/pi-coding-agent` | **Earendil Inc.** — repo `earendil-works/pi`; author Mario Zechner (`badlogic`) | [github.com/earendil-works/pi](https://github.com/earendil-works/pi) (package: `packages/coding-agent`) · site [pi.dev](https://pi.dev/) | **MIT** (`spdx_id: MIT`) | **v0.84.3**, 2026-08-24 | **KEEP — it is the best "minimalist" contrast case in the whole module** |

**Repo-rename lineage you must get right (both verified by `gh` following the redirect):**

- `gh api repos/sst/opencode` returns `full_name: anomalyco/opencode`. The GitHub redirect still works, but the org is Anomaly now. The maintainer's own announcement: *"our official company name has always been 'anomaly' but we didn't use it publicly … so now it's anomalyco/opencode … if you're using the opencode github action you'll have to update it"* ([dax on X, post 2007199285251842478](https://x.com/thdxr/status/2007199285251842478)) `[LINK-UNVERIFIED: X/Twitter post — surfaced in search results, not fetchable by WebFetch. The *fact* is independently verified by the gh API redirect and by the docs site naming Anomaly as maintainer and `brew install anomalyco/tap/opencode` / `anomalyco/opencode/github@latest` as the current commands.]`
- `gh api repos/badlogic/pi-mono` returns `full_name: earendil-works/pi`. Same story: the project moved from a personal repo to a company org. Cite `earendil-works/pi`.

---

## 2. Per-project deep dive

### 2.1 opencode

**The disambiguation — teach this, it is a genuinely useful lesson.** Two unrelated projects shipped under the name "opencode" in 2025:

1. **`opencode-ai/opencode`** — a Go/Bubble Tea TUI. It is **archived**. Its README now reads, verbatim: *"# Archived: Project has Moved … This repository is no longer maintained and has been archived for provenance. The project has continued under the name Crush, developed by the original author and the Charm team."* ([opencode-ai/opencode README, fetched 2026-08-25](https://github.com/opencode-ai/opencode)). Last release `v0.0.55`, 2025-06-27; repo archived, last push 2025-09-18.
2. **`anomalyco/opencode`** (created 2025-04-30, formerly `sst/opencode`) — the one that is alive. Description: *"The open source coding agent."* Default branch is **`dev`**, not `main`. Pushed 2026-08-25; releases roughly daily (`v1.18.21` 2026-08-21 → `v1.18.23` 2026-08-25).

**Everything below is `anomalyco/opencode`.**

**What it is.** *"An open source AI coding agent"* available as *"a terminal interface, desktop app, or IDE extension"*, maintained by Anomaly ([opencode docs — Intro, accessed 2026-08-25](https://opencode.ai/docs/)). **Interaction model: TUI-first, plus a real client/server split** — `opencode serve` starts a headless server and `opencode web` starts a headless server with a web UI, both taking `--port` / `--hostname` ([opencode CLI docs, accessed 2026-08-25](https://opencode.ai/docs/cli/)). That client/server design is the architecturally interesting bit: the agent runs where the code is, the UI attaches over HTTP.

**Install (verbatim from the README, fetched 2026-08-25).**
```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Package managers
npm i -g opencode-ai@latest        # or bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # Any OS
```
Docs also list `docker run -it --rm ghcr.io/anomalyco/opencode` ([opencode docs — Intro](https://opencode.ai/docs/)).
⚠️ Anything on the internet saying `brew install sst/tap/opencode` is **stale**. Note the tap moved with the org.

**Model support.** *"75+ LLM providers"* via the AI SDK and Models.dev — OpenAI, Anthropic, Google Vertex, Azure, Bedrock, Groq, DeepSeek, Together, Fireworks, OpenRouter, GitHub Copilot, GitLab Duo, SAP AI Core, plus **Ollama, LM Studio and llama.cpp** for local ([opencode docs — Providers, accessed 2026-08-25](https://opencode.ai/docs/providers/)). BYO-key is first-class: credentials are added with the `/connect` command and stored in `~/.local/share/opencode/auth.json`. Local models are wired as OpenAI-compatible endpoints, verbatim shape:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (local)",
      "options": { "baseURL": "http://localhost:11434/v1" },
      "models": { "llama2": { "name": "Llama 2" } }
    }
  }
}
```
(LM Studio → `http://127.0.0.1:1234/v1`; llama.cpp → `http://127.0.0.1:8080/v1`.)

**Extension mechanisms — mapped onto Module 10's framework.**

- **Instruction file:** **`AGENTS.md`** in the project root; global at **`~/.config/opencode/AGENTS.md`**. It also reads **`CLAUDE.md`** (project) and **`~/.claude/CLAUDE.md`** (global) as *"legacy compatibility"* fallbacks. Extra files can be added via an `"instructions"` array in `opencode.json` (local paths, globs, or remote URLs). Precedence: local `AGENTS.md`/`CLAUDE.md` walking up from cwd → global `~/.config/opencode/AGENTS.md` → `~/.claude/CLAUDE.md` ([opencode docs — Rules, accessed 2026-08-25](https://opencode.ai/docs/rules/)).
- **Custom commands:** markdown in **`~/.config/opencode/commands/`** (global) or **`.opencode/commands/`** (project). Frontmatter: `description`, `agent`, `model`, `subtask` (boolean, *"forces subagent invocation"*), and `template` (**required** — the prompt body). Invoked as `/name`. Placeholders `$ARGUMENTS`, `$1`/`$2`/`$3`; `` !`cmd` `` injects shell output; `@filename` inlines a file ([opencode docs — Commands, accessed 2026-08-25](https://opencode.ai/docs/commands/)).
- **Agents (= primary agents *and* subagents, one mechanism):** markdown in **`~/.config/opencode/agents/`** or **`.opencode/agents/`**; the filename is the agent name. Frontmatter: `description` (required), `mode`, `model`, `temperature`, `permission`. Built-in **primary** agents: **Build** (full tools) and **Plan** (restricted); switch with Tab / `switch_agent`. Built-in **subagents**: **General**, **Explore**, **Scout**. Subagents are invoked automatically by a primary agent, or manually with an `@mention` (`@general help me search for this function`). Parent/child session navigation via `session_child_first`, `session_child_cycle`, `session_parent` ([opencode docs — Agents, accessed 2026-08-25](https://opencode.ai/docs/agents/)).
- **Skills:** called **Agent Skills**. *"Agent skills let OpenCode discover reusable instructions from your repo or home directory. Skills are loaded on-demand via the native `skill` tool."* Search roots, verbatim: `.opencode/skills/<name>/SKILL.md`, `~/.config/opencode/skills/<name>/SKILL.md`, `.claude/skills/<name>/SKILL.md`, `~/.claude/skills/<name>/SKILL.md`, `.agents/skills/<name>/SKILL.md`, `~/.agents/skills/<name>/SKILL.md`. Frontmatter: `name` (required), `description` (required), `license`, `compatibility`, `metadata`; *"Unknown frontmatter fields are ignored."* ([opencode docs — Agent Skills, accessed 2026-08-25](https://opencode.ai/docs/skills/)). **Note the cross-harness read of `.claude/skills/` and `.agents/skills/` — that is the portability story, verified.**
- **Hooks:** opencode has **no separate "hooks" concept**; lifecycle interception is done through **plugins**.
- **Plugins:** JS/TS modules in **`.opencode/plugins/`** or **`~/.config/opencode/plugins/`**, or npm packages named in `opencode.json`. Verbatim event list: `command.executed`; `file.edited`, `file.watcher.updated`; `installation.updated`; `lsp.client.diagnostics`, `lsp.updated`; `message.part.removed`, `message.part.updated`, `message.removed`, `message.updated`; `permission.asked`, `permission.replied`; `server.connected`; `session.created`, `session.compacted`, `session.deleted`, `session.diff`, `session.error`, `session.idle`, `session.status`, `session.updated`; `todo.updated`; `shell.env`; `tool.execute.after`, `tool.execute.before`; `tui.prompt.append`, `tui.command.execute`, `tui.toast.show`; `experimental.session.compacting` ([opencode docs — Plugins, accessed 2026-08-25](https://opencode.ai/docs/plugins/)). `tool.execute.before` / `permission.asked` are the PreToolUse-equivalents — a clean Module 10 mapping.
- **MCP:** configured under the `mcp` key in `opencode.json`, verbatim shapes:
  ```json
  { "mcp": { "my-local-mcp-server": { "type": "local", "command": ["npx","-y","my-mcp-command"], "enabled": true, "environment": { "MY_ENV_VAR": "my_env_var_value" } } } }
  ```
  ```json
  { "mcp": { "my-remote-mcp": { "type": "remote", "url": "https://my-mcp-server.com", "enabled": true, "headers": { "Authorization": "Bearer MY_API_KEY" } } } }
  ```
  ([opencode docs — MCP servers, accessed 2026-08-25](https://opencode.ai/docs/mcp-servers/))

**Permissions & sandboxing.** A `permission` block in `opencode.json`; each rule resolves to `"allow"`, `"ask"` or `"deny"`. The default posture, verbatim: *"Most permissions default to 'allow'. 'doom_loop' and 'external_directory' default to 'ask'. 'read' is 'allow', but .env files are denied by default"* ([opencode docs — Permissions, accessed 2026-08-25](https://opencode.ai/docs/permissions/)). `doom_loop` asks *"when the same tool repeats identically 3+ times"* — a nice, concrete, teachable loop-guard. **Say the quiet part out loud in the module: opencode's default is permissive.** There is also a separate `/docs/policies/` page (not fetched — see RESUME NOTES).

**Headless / CI.** `opencode run "prompt"` — *"Run opencode in non-interactive mode by passing a prompt directly."* Flags: `--model`/`-m` (`provider/model`), `--agent`, `--session`/`-s`, `--continue`/`-c`, `--fork`, `--format` (`default` | `json` — *"raw events"*), `--attach http://localhost:4096`, `--file`/`-f`, `--title`, **`--auto`** (*"Auto-approve non-denied permissions"*), `--variant`, `--thinking` ([opencode CLI docs](https://opencode.ai/docs/cli/)). For GitHub: `opencode github install` scaffolds it, and the action is **`anomalyco/opencode/github@latest`**, triggered by `/oc` or `/opencode` in an issue or PR comment ([opencode docs — GitHub, accessed 2026-08-25](https://opencode.ai/docs/github/)). **The action name changed with the org rename — this is the single most likely thing to be wrong in any tutorial your students find.**

**Maturity.** Created 2025-04-30. Version **1.x**, releasing near-daily. Docs are the most complete of the four by a wide margin (~30 pages incl. Config, Providers, Network, Enterprise, Troubleshooting, Windows, and a Develop section with SDK/Server/Plugins/Ecosystem). Post-1.0 with an enterprise page is a real maturity signal.

**Good at:** provider-agnosticism (75+, including local); the client/server architecture (drive a long-running agent from a phone or a web UI); reading `AGENTS.md`, `CLAUDE.md`, `.claude/skills/` and `.agents/skills/` so an existing Claude Code setup mostly just works; genuinely complete docs.
**Real limitations:** permissive defaults; near-daily releases mean churn and mean any pinned tutorial rots fast; the org rename has poisoned a lot of third-party documentation; no first-party OS-level sandbox documented (unlike dsh) — isolation is your job.

---

### 2.2 Hermes Agent — the coding angle only

Identity, license, maturity, memory, cron/webhooks and security were established in the Module 14 pass; **read `scratchpad/research/14_personal_agents.md` §5.2 rather than re-deriving them.** Recap in one line: `NousResearch/hermes-agent`, MIT, product **v0.20.5** in release `v2026.8.19` (2026-08-21), install `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`.

**The honest framing for *this* module: Hermes Agent is not a coding agent. It is a personal agent with a competent coding subsystem bolted on.** Put it in the "adjacent" bucket, not head-to-head with opencode/dsh/pi. The evidence that it *can* do software work is nonetheless real and specific ([Hermes Agent CLI command reference, accessed 2026-08-25](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)):

- **`hermes project`** — multi-folder workspaces, subcommands `create`, `list`, `add-folder`, `bind-board`. Projects *"anchor desktop session grouping"* and bind to kanban boards for **deterministic worktree management**. That is the git-worktree-per-task pattern, built in.
- **`hermes kanban`** — a task board with `create`, `list`, `assign`, `claim`, `complete`, `dispatch`, multi-profile tracking and **per-worker toolsets**. This is the closest thing in the landscape to a shipped multi-agent work queue.
- **`hermes chat`** with **`--worktree`** (isolated git worktrees) and **`--checkpoints`** (*"filesystem safeguards before destructive changes"*), plus `-q` for non-interactive prompts.
- **`hermes -z`** — *"single prompt in, final response text out, nothing else on stdout"*. This is the CI-usable primitive, and its contract is stricter (and therefore better for scripting) than `opencode run --format json` or `pi -p`.
- **`hermes checkpoints`** — rollback store at `~/.hermes/checkpoints/`, with `status`, `prune`, `clear`.
- **`hermes mcp`** — `install`, `serve`, `add`, `configure`. Note `serve`: Hermes can *be* an MCP server, not just consume them.
- **`hermes skills`** — `browse`, `install`, `list`, `config`. Instruction file is **`AGENTS.md`** per project or **`~/.hermes/SOUL.md`** globally; skills at `~/.hermes/plugins/<plugin>/skills/<name>/SKILL.md` (established in the Module 14 pass from the `superpowers` plugin's `hermes-tools.md` mapping).

**Good at:** long-lived, scheduled, cross-repo work — "every morning, triage the issue tracker and open a draft PR" is native here and awkward everywhere else. Worktree + kanban + cron is a combination nobody else in this list ships.
**Real limitations:** pre-1.0 (**v0.20.5**); its own docs say the threat model *"assumes an honest-but-wrong agent, not deliberately adversarial code"*; and for a single focused refactor in one repo it is heavier than pi or opencode. Also, do not let students confuse **Hermes Agent** (the harness) with **Hermes 2/3/4 / OpenHermes** (the models) — it runs any provider.

---

### 2.3 DeepSeek Harness (`dsh`) — **verified, first-party, developer preview**

**What it is.** *"DeepSeek Harness (`dsh`) is an open-source agent harness developed by DeepSeek AI. It uses an architecture where **everything is a plugin**, and is powered by [Cordis]"* ([deepseek-harness README, fetched 2026-08-25](https://github.com/deepseek-ai/deepseek-harness)). The marketing framing is *"Agent = Model + Harness"* ([DeepSeek Harness site, accessed 2026-08-25](https://deepseek.com/harness/en/)). Repo created **2026-08-13** — it is **twelve days old** as of writing.

**Read the warning out loud in the module.** Verbatim from the README: *"DeepSeek Harness is currently in **developer preview** and is iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**"*

**Interaction model.** Primarily a **local web UI**, which makes it the odd one out. `npx @deepseek-ai/dsh web` *"starts the Web UI at `http://127.0.0.1:3080` by default and opens it in the default browser"*; `--no-open` suppresses that. A TUI profile exists but is not shipped by default. Four runtime **modes** per the site: **Standard** (*"Full coding agent with file editing, shell, file and web search, skills, planning, goals, subagents, and workflows"*), **Code mode** (model-generated TypeScript orchestrating multi-step operations), **Minimal** (*"Two-tool coding agent with persistent bash and str_replace_editor"*), and **Creator** mode.

**Install (verbatim from README).**
```sh
npx @deepseek-ai/dsh web
```
```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

**The organizing concept — profiles.** *"The `dsh` command is the product launcher for profiles: ordered stacks of plugin-bundle patch layers under the user's own overrides."* Entry modes, verbatim ([apps/cli/README.md, fetched 2026-08-25](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md)):

| Command | Purpose |
|---|---|
| `dsh --profile <name>` | Boot the named profile under `$DSH_HOME/profiles/<name>`. |
| `dsh --profile headless "job"` | Run one fresh persisted session, print the final answer, and exit. |
| `dsh web` | Alias of `--profile web`. |
| `dsh plugin --profile <name> <pnpm args>` | Manage a profile's plugins by forwarding to pnpm in the profile directory. |

A profile directory holds a `package.json` (with the `dsh.profile` manifest and its ordered `bundles` list) and a `cordis.patch.yml`. Composition order: each bundle's patch → the profile's `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch` overlays. Inspect without booting via `--dump-default-config` / `--dump-config`. Only `web` and `headless` auto-initialize; every other profile must be created through `dsh plugin`.

**Model support.** DeepSeek's own key first (Settings → Models), then *"Add provider"* for catalog providers (Anthropic, OpenAI, …), then *"Add a custom provider"* for *"a company gateway, self-hosted server, or provider absent from the installed catalog"* — Provider ID, base URL, API protocol, credential, models ([dsh — Configure models, fetched 2026-08-25](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md)). Bedrock/Vertex/Azure/Codex need native credentials, not an API key field. Keys are write-only in the UI and stored in **`$DSH_HOME/.credentials.yaml`**; settings hold only a credential reference. Config lives in **`$DSH_HOME/settings.yaml`** (`$DSH_HOME` defaults to `~/.dsh`). Verbatim custom-provider YAML:
```yaml
llm-pi-ai:
  providers:
    my-gateway:
      apiKeyEnv: GATEWAY_API_KEY
      api: openai-completions
      baseURL: https://gateway.example/v1
      models:
        - id: legacy-chat
        - id: vision-preview
          input: [text, image]
```
Local models are not called out by name, but *"self-hosted server"* + `openai-completions` protocol is exactly the Ollama/llama.cpp path. `[UNVERIFIED: no first-party page names Ollama or llama.cpp explicitly.]`

**Extension mechanisms.**
- **Instruction file:** **`AGENTS.md`**, with `CLAUDE.md` accepted as a same-directory candidate. The loader reads **`$DSH_HOME/AGENTS.md`** then, *"in each directory from the project root to `agent.session.header.cwd`, every existing base candidate and then every existing local-overlay candidate."* Two things here are genuinely novel and worth teaching: (a) **de-duplication** — *"candidates whose content is byte-identical after trimming … collapse to the earliest candidate, so a `CLAUDE.md` that merely duplicates its sibling `AGENTS.md` is rendered once"*; (b) **live nested discovery** — it watches successful `read`/`write`/`edit` results and injects `Additional instructions from: packages/app/AGENTS.md` when the agent first reaches a subdirectory, and `Instructions removed: <path>` when one disappears. It also escapes literal `</system-reminder>` in instruction content *"so repository-controlled text cannot close the plugin-owned frame"* — i.e. a shipped mitigation for AGENTS.md prompt injection ([dsh-agent-instructions README, fetched 2026-08-25](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/context/agent-instructions/README.md)). **That last detail is the single best security artifact in this whole dossier.**
- **Commands:** a plugin-owned slash-command registry, `ctx.commands.register(definition)`; names are lowercase `[a-z0-9_-]`; a leading `/` at byte zero; results *"are rendered directly by the adapter and never enter model history"*. Shipped examples include `/permissionPresets`, `/plan`, `/compact`, `/goal`, `/feedback` ([dsh-commands README, fetched 2026-08-25](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/interaction/commands/README.md)).
- **Skills:** a `ctx.skills` registry with pluggable providers; the filesystem provider *"scans local project, custom, and user skill roots, parses `SKILL.md` or flat Markdown skill files"*. Roots are configurable: `dshHome` (`$DSH_HOME` or `~/.dsh`, scanning `skills` beneath it) and **`agentsHome` (`$DSH_AGENTS_HOME` or `~/.agents`)**, described as *"Shared agent config root scanned for compatible skills"* ([dsh-skill-filesystem README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/skill/skill-filesystem/README.md); [skills subsystem doc](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md)). **Second independent project honoring `~/.agents/skills` — the portability claim is now cross-verified.**
- **Hooks:** the subsystem README is unusually candid: *"The hooks subsystem lets users extend the agent at lifecycle points the way Claude Code and Codex do — by pointing a bridge plugin at an existing `hooks.json` (or settings) so those external shell hooks run faithfully. The canonical extension surface itself is the harness's typed interception points; a 'native hook' is just an ordinary Cordis plugin."* Packages: `hook-protocol` (shared library), **`hooks-claude-code`**, **`hooks-codex`** ([hooks README, fetched 2026-08-25](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/hooks/README.md)). **dsh will run your existing Claude Code `hooks.json` unmodified.**
- **MCP:** `packages/mcp/mcp-client` — *"MCP client bridge that registers external server tools on `ctx.tools`"* ([mcp README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/README.md)). Client only; no server role documented.
- **Subagents:** the richest of the four. `ctx.subagents` with multiple coexisting named providers: `subagent-spawn-in-process` (fresh child), **`subagent-fork-in-process`** (*"Starts an in-process child from the parent's completed history"* — a forked-context subagent, rare), `subagent-acp` (out-of-process over ACP), **`subagent-codex`** (*"a real Codex app-server child"*), **`subagent-claude-code`** (*"a real Claude Code child through the official Claude Agent SDK"*), `subagent-dsh-sdk`. Install with `dsh plugin --profile <name> add @deepseek-ai/dsh-subagent-codex @deepseek-ai/dsh-subagent-claude-code`, then restart the profile ([subagent family README, fetched 2026-08-25](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/README.md)). **dsh can drive Claude Code and Codex as subagents. That is the headline feature and it is verified from the repo, not from a blog.**
- **Plugins:** the whole system. Cordis kernel; community plugins are discoverable via the GitHub topic **`dsh-plugin`**.

**Permissions & sandboxing — best-in-class of the four, and the most teachable.**
- **Approval seam:** `ctx.approval.request(req)` returns `allowed-once`, `rejected`, `cancelled`, or `unavailable`; *"missing or failing answerers **fail closed**, and a grant applies only to the requested action."* `ApprovalPolicy` is **`'ask'` or `'never'`**. Under `never`, the model is literally told: *"Approval prompts are disabled in this session: actions that require approval are rejected automatically — do not request sandbox escalation (do not set `sandbox_permissions`)."* Every request appends a paired `approval/asked` + `approval/decided` **audit record** ([dsh-user-approval README, fetched 2026-08-25](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/interaction/user-approval/README.md)).
- **Sandbox modes:** `SandboxMode` is `'read-only' | 'workspace-write' | 'danger-full-access'`. Backends, verbatim: *"Linux bwrap/Landlock, macOS Seatbelt, and the Windows ACL restricted-token backend."* Enforcement is a *reported* fact — `full` vs **`partial`** (older Landlock ABIs, Windows Everyone/hard-link boundaries). Governs **filesystem effects only**: *"Network and process visibility are outside this vocabulary."* ([sandbox subsystem doc, fetched 2026-08-25](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/sandbox.md)).
- **Presets bundle the two:** defaults are **`workspace-write`** (= `workspace-write` sandbox + `ask` approval) and **`danger-full-access`** (= `danger-full-access` + `never`). A session pins its preset at creation; *"later changes never alter an existing session."* ([dsh-permission-presets README, fetched 2026-08-25](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/interaction/permission-presets/README.md)). Contrast this table with opencode's *"most permissions default to 'allow'"* — that contrast **is** the security lesson of the module.

**Headless / CI.** `dsh --profile headless "job"` — *"Run one fresh persisted session, print the final answer, and exit."* Launcher flags come first; the first unrecognized token starts the app's own arguments. Exit code is nonzero on invalid commands, wrong-mode options, config errors and boot failures — usable in CI. A **Python SDK** and a **TypeScript SDK** are documented. `[UNVERIFIED: no first-party GitHub Action.]`

**Maturity.** Repo public 2026-08-13; latest release `dsh-v0.1.1-rc.2` (2026-08-21); **release candidates of 0.1**. Docs are extraordinary in *depth* (a `docs/subsystems/` tree of ~45 references, an `AGENTS.md`-driven contributor flow, EN/中文 throughout) and thin in *onboarding* — the user guide is 30 lines. It is documentation written by engineers for plugin authors, not a getting-started funnel.
**Good at:** being a **harness kit** rather than a product — swap the loop, the sandbox, the storage; drive Claude Code or Codex as children; run someone else's `hooks.json`. Its permission/sandbox model is the most rigorous here.
**Real limitations:** twelve days old, RC versioning, promised breaking changes; web-UI-first will feel wrong to terminal people; the concept load (Cordis, profiles, bundles, patch layers, capability seams, scopes) is steep; onboarding docs are immature.

---

### 2.4 pi (pi.dev)

**What it is.** *"Pi is a minimal terminal coding harness. Adapt pi to your workflows, not the other way around, without having to fork and modify pi internals."* Maintained by **Earendil Inc.**; repo `earendil-works/pi`, the agent lives in `packages/coding-agent` ([pi coding-agent README, fetched 2026-08-25](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md); [pi.dev](https://pi.dev/)). *"Pi runs in four modes: interactive, print or JSON, RPC for process integration, and an SDK for embedding in your own apps."*

**Install (verbatim).**
```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```
> *"`--ignore-scripts` disables dependency lifecycle scripts during install. Pi does not require install scripts for normal npm installs."*

Installer alternative:
```bash
curl -fsSL https://pi.dev/install.sh | sh
```
Then either:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```
or `pi` then `/login` and pick a provider.

**Model support.** Subscriptions: **Anthropic Claude Pro/Max, OpenAI ChatGPT Plus/Pro (Codex), GitHub Copilot**. API keys (verbatim list): Anthropic, Ant Ling, OpenAI, Azure OpenAI, DeepSeek, NVIDIA NIM, Google Gemini, Google Vertex, Amazon Bedrock, Mistral, Groq, Cerebras, Cloudflare AI Gateway, Cloudflare Workers AI, xAI, OpenRouter, Vercel AI Gateway, ZAI Coding Plan (Global/China), **OpenCode Zen, OpenCode Go**, Hugging Face, Fireworks, Together AI, Baseten, Kimi For Coding, MiniMax, Xiaomi MiMo (+ three regional token plans). **Local:** *"Pi also supports the llama.cpp router server. Configure it with `/login llama.cpp`, manage downloads and loaded models with `/llama`, then select a loaded model with `/model`."* Custom providers via `~/.pi/agent/models.json` if they speak OpenAI, Anthropic or Google protocols. (Note pi lists **OpenCode Zen / OpenCode Go** as providers — the two projects are not rivals in the way a listicle would suggest.)

**Extension mechanisms.**
- **Instruction file:** **`AGENTS.md`** (or `CLAUDE.md`), loaded from `~/.pi/agent/AGENTS.md` (global), parent directories walking up from cwd, and the current directory; *"All matching files are concatenated."* A directory containing **`AGENTS.override.md`** uses that *instead of* its `AGENTS.md`/`CLAUDE.md`, while other directories still concatenate. Disable entirely with **`--no-context-files`** (`-nc`). **System prompt replacement** — genuinely rare, and a great Module 11 hook: **`.pi/SYSTEM.md`** (project) or **`~/.pi/agent/SYSTEM.md`** (global) *replaces* the default system prompt; **`APPEND_SYSTEM.md`** appends instead.
- **Commands:** `/` in the editor. Built-ins (`/login`, `/model`, `/llama`, `/settings`, `/hotkeys`…), extension-registered commands, skills as **`/skill:name`**, and **prompt templates** — reusable Markdown in `~/.pi/agent/prompts/` that expand as `/templatename`.
- **Skills:** *"On-demand capability packages following the [Agent Skills standard](https://agentskills.io)."* Roots: **`~/.pi/agent/skills/`, `~/.agents/skills/`, `.pi/skills/`, `.agents/skills/`** (from cwd up through parents). Third independent project honoring `~/.agents/skills`.
- **Hooks:** no hooks concept. Event handling is done in extensions (`pi.on("tool_call", async (event, ctx) => { ... })`).
- **Extensions:** TypeScript modules in **`~/.pi/agent/extensions/`** or **`.pi/extensions/`**, registering *"custom tools, commands, keyboard shortcuts, event handlers, and UI components"*:
  ```typescript
  export default function (pi: ExtensionAPI) {
    pi.registerTool({ name: "deploy", ... });
    pi.registerCommand("stats", { ... });
    pi.on("tool_call", async (event, ctx) => { ... });
  }
  ```
  The README's own "What's possible" list includes *"Sub-agents and plan mode"*, *"Permission gates and path protection"*, *"SSH and sandbox execution"*, *"MCP server integration"*, *"Make pi look like Claude Code"*, and *"Games while waiting (yes, Doom runs)"*.
- **MCP:** **not built in, by design.** The philosophy section says **"No MCP"**; you can build an extension that adds it.
- **Subagents:** **not built in, by design** — verbatim: *"**No sub-agents.** There's many ways to do this. Spawn pi instances via tmux, or build your own with extensions, or install a package that does it your way."* Likewise *"**No plan mode.** Write plans to files, or build it with extensions, or install a package."*
- **Packages:** **pi packages** bundle extensions/skills/prompts/themes and install from npm or git:
  ```bash
  pi install npm:@foo/pi-tools
  pi install npm:@foo/pi-tools@1.2.3      # pinned version
  pi install git:github.com/user/repo
  pi install git:github.com/user/repo@v1  # tag or commit
  ```
  Packages land in `~/.pi/agent/git/` or `~/.pi/agent/npm/`; `-l` makes them project-local (`.pi/git/`, `.pi/npm/`). Also `pi remove`/`pi uninstall`, `pi update [--all|--self|--extensions|--models|--extension <src>]`, `pi list`, `pi config`.

**Permissions & sandboxing — the honest weak spot, and pi says so first.** Verbatim: *"No permission popups. Run in a container, or build your own confirmation flow with extensions."* And: *"**Security:** Pi packages run with full system access. Extensions execute arbitrary code, and skills can instruct the model to perform any action including running executables. Review source code before installing third-party packages."* The one built-in guard is **project trust**: on interactive startup pi asks before trusting a project folder that contains project-local settings/resources or `.agents/skills` and has no saved decision in **`~/.pi/agent/trust.json`**; trusting allows loading `.pi/settings.json`, installing missing project packages, and executing project extensions. **Teach pi as "isolation is the container's job, not the agent's"** — it is the cleanest example of that philosophy in the landscape.

**Headless / CI.** `-p` / `--print` (*"Print response and exit"*), `--mode json` (*"Output all events as JSON lines"*), `--mode rpc` (*"RPC mode for process integration"*), `--export <in> [out]` (session → HTML). Print mode reads piped stdin: `cat README.md | pi -p "Summarize this text"`. Tool control for CI: `--tools`/`-t`, `--exclude-tools`/`-xt`, `--no-builtin-tools`/`-nbt`, `--no-tools`/`-nt`. Built-in tools: `read`, `bash`, `powershell` (Windows), `edit`, `write`, `grep`, `find`, `ls` — but *"By default, pi gives the model four tools: `read`, `write`, `edit`, and `bash`."* Sessions: `-c`/`--continue`, `-r`/`--resume`, `--session`, `--fork`, `--no-session` (ephemeral), `--name`/`-n`. Offline: `--offline` or `PI_OFFLINE=1` disables all startup network operations. A community GitHub Action exists (`shaftoe/pi-coding-agent-action`) `[UNVERIFIED: third-party, not fetched]`.

**Telemetry — disclose it, students will ask.** *"after first install or a changelog-detected update, sends an anonymous version ping to `https://pi.dev/api/report-install`."* Opt out with `enableInstallTelemetry: false` in `settings.json` or `PI_TELEMETRY=0`.

**Maturity.** Repo created 2025-08-09; **v0.84.3** (2026-08-24) with a steady ~monthly minor cadence; MIT; README is 717 lines and there is a `docs/` tree (`providers.md`, `models.md`, `custom-provider.md`, `skills.md`, `extensions.md`, `json.md`, `rpc.md`, `windows.md`, `termux.md`, `tmux.md`, `keybindings.md`, `llama-cpp.md`). Pre-1.0. One social fact worth knowing before you send students to file issues: *"New issues and PRs from new contributors are auto-closed by default. Maintainers review auto-closed issues daily."*

**Good at:** context economy and minimalism — four tools, small system prompt, no hidden injection; the widest provider list including llama.cpp; `--mode rpc` and the SDK make it the best of the four to *embed* in your own product; sessions are trees, so `--fork` branching is first-class.
**Real limitations:** no sandbox, no approval prompts, no MCP, no subagents, no plan mode — all deliberate, all your problem to solve; pre-1.0; the auto-close contribution policy.

---

## 3. Extension-mechanism matrix

Cells give **what the project calls it**. Empty = not verified from a primary source (not "absent"). ❌ = explicitly absent by design, with a quote.

| | **Instruction file** | **Commands** | **Skills** | **Agents / subagents** | **Hooks** | **MCP** | **Plugins / packages** |
|---|---|---|---|---|---|---|---|
| **opencode** | `AGENTS.md` (proj) · `~/.config/opencode/AGENTS.md` (global) · `CLAUDE.md` + `~/.claude/CLAUDE.md` as legacy fallback · `"instructions"` key in `opencode.json` | **Commands** — `.opencode/commands/*.md`, `~/.config/opencode/commands/*.md`; frontmatter `description`/`agent`/`model`/`subtask`/`template`; `$ARGUMENTS`, `$1..$3` | **Agent Skills** — `SKILL.md` under `.opencode/skills/`, `~/.config/opencode/skills/`, `.claude/skills/`, `~/.claude/skills/`, `.agents/skills/`, `~/.agents/skills/`; frontmatter `name`, `description`, `license`, `compatibility`, `metadata` | **Agents** — `.opencode/agents/*.md`, `~/.config/opencode/agents/*.md`; `mode` picks primary vs subagent; built-ins Build/Plan (primary), General/Explore/Scout (sub); `@mention` to invoke | *(no separate hooks concept — use plugin events `tool.execute.before`/`.after`, `permission.asked`/`.replied`)* | **MCP servers** — `mcp` key in `opencode.json`, `type: "local"` (`command[]`) or `type: "remote"` (`url`, `headers`) | **Plugins** — `.opencode/plugins/`, `~/.config/opencode/plugins/`, or npm packages in config; ~30 named events |
| **Hermes Agent** | `AGENTS.md` (proj) · `~/.hermes/SOUL.md` (global) | *(slash commands in TUI — not re-verified in this pass)* | **Skills** — `hermes skills browse/install/list/config`; `~/.hermes/plugins/<plugin>/skills/<name>/SKILL.md` | **subagents** via `delegate_task(...)`; `hermes kanban dispatch` with per-worker toolsets | **hooks** (lifecycle) — established in the Module 14 pass | **`hermes mcp`** — `install`, `serve`, `add`, `configure` (**can also *be* an MCP server**) | **plugins** (`~/.hermes/plugins/`) |
| **DeepSeek Harness (`dsh`)** | `AGENTS.md` (+ `CLAUDE.md` candidate) · `$DSH_HOME/AGENTS.md` global · byte-identical dedup · live nested discovery on `read`/`write`/`edit` | **commands** — `ctx.commands.register()`; lowercase `/name`; e.g. `/permissionPresets`, `/plan`, `/compact`, `/goal` | **skills** — `ctx.skills` registry; filesystem provider scans `$DSH_HOME/skills` and **`$DSH_AGENTS_HOME` / `~/.agents`**; `SKILL.md` or flat Markdown | **subagents** — `ctx.subagents`; providers `spawn-in-process`, **`fork-in-process`**, `acp`, **`codex`**, **`claude-code`**, `dsh-sdk`; plus `tool-subagent`, `tool-subagent-control`, `tool-subagent-report`. **Agent presets** define tool rows | **hooks** — *bridges*: `hooks-claude-code`, `hooks-codex` run an existing `hooks.json`; native = a Cordis plugin on typed interception points | **mcp-client** — *"registers external server tools on `ctx.tools`"* (client only) | **plugins = everything**; Cordis kernel; **profiles** = ordered bundle patch layers; `dsh plugin --profile <n> add …`; topic `dsh-plugin` |
| **pi** | `AGENTS.md` / `CLAUDE.md` from `~/.pi/agent/`, parents, cwd (concatenated) · **`AGENTS.override.md`** per directory · **`.pi/SYSTEM.md`** / `~/.pi/agent/SYSTEM.md` replaces the system prompt, `APPEND_SYSTEM.md` appends · `--no-context-files`/`-nc` | **commands** (`/name`) + **prompt templates** (`~/.pi/agent/prompts/*.md`, expand as `/templatename`) + extension-registered commands | **Skills** — Agent Skills standard; `~/.pi/agent/skills/`, **`~/.agents/skills/`**, `.pi/skills/`, `.agents/skills/`; invoke `/skill:name` | ❌ *"**No sub-agents.** … Spawn pi instances via tmux, or build your own with extensions"* | *(none; use extension events, e.g. `pi.on("tool_call", …)`)* | ❌ *"No MCP"* — *"build an extension that adds MCP support"* | **Extensions** (`~/.pi/agent/extensions/`, `.pi/extensions/`) bundled as **pi packages** — `pi install npm:…` / `git:…`, `-l` for project-local |

**The one thing this table proves, and it is the module's best takeaway:** three of four independently converged on **`AGENTS.md`** for instructions and **`SKILL.md` under `~/.agents/skills/`** for skills, and two of them read Claude Code's `.claude/` paths directly. Portability is not aspirational any more; it is shipped.

---

## 4. Install & first run

All commands verbatim from the project's own README or docs, as of 2026-08-25.

**opencode** ([README](https://github.com/anomalyco/opencode), [docs](https://opencode.ai/docs/))
```bash
curl -fsSL https://opencode.ai/install | bash
# or: npm i -g opencode-ai@latest
# or: brew install anomalyco/tap/opencode

opencode                                  # TUI in the current project
opencode run "Explain the use of context in Go"    # headless, one shot
opencode run --format json --auto "fix the failing test"   # CI shape
opencode serve --port 4096                # headless server
opencode github install                   # scaffold the GitHub Action
```

**Hermes Agent** ([README](https://github.com/NousResearch/hermes-agent))
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash

hermes                                    # start chatting
hermes model                              # choose provider + model
hermes -z "summarize the open PRs"        # one-shot, final text only to stdout
hermes chat --worktree --checkpoints      # coding work in an isolated git worktree
```

**DeepSeek Harness** ([README](https://github.com/deepseek-ai/deepseek-harness))
```sh
npx @deepseek-ai/dsh web
# Web UI at http://127.0.0.1:3080 ; pass --no-open to skip the browser

dsh --profile headless "run the tests"    # one persisted session, prints the final answer
dsh plugin --profile web add @deepseek-ai/dsh-subagent-claude-code
```
From source:
```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

**pi** ([README](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md))
```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
# or: curl -fsSL https://pi.dev/install.sh | sh

export ANTHROPIC_API_KEY=sk-ant-...
pi                                        # interactive
pi -p "explain this repo's build"         # print and exit
cat README.md | pi -p "Summarize this text"
pi --mode json -p "fix the lint errors"   # JSON lines for CI
pi -t read,grep,find -p "audit this code" # read-only-ish by tool allowlist
```

---

## 5. Honest comparison

| | **opencode** | **Hermes Agent** | **DeepSeek Harness** | **pi** |
|---|---|---|---|---|
| Shape | TUI + client/server + IDE + desktop | personal-agent daemon with a coding subsystem | local web UI + profiles | minimal TUI + RPC/SDK |
| Version (2026-08-25) | **1.18.23** (post-1.0, daily) | 0.20.5 | **0.1.1-rc.2** (12-day-old repo) | 0.84.3 |
| License | MIT | MIT | MIT | MIT |
| Default safety posture | permissive (`allow`) | `ask`-ish, opt-in sandbox | **`workspace-write` + `ask`, OS sandbox, fail-closed** | **none by design** |
| Sandbox | not documented first-party | opt-in, "not a perfect boundary" | **bwrap/Landlock · Seatbelt · Windows ACL** | ❌ "run in a container" |
| MCP | ✅ client (local + remote) | ✅ client **and server** | ✅ client | ❌ by design |
| Subagents | ✅ built-in (General/Explore/Scout + custom) | ✅ + kanban dispatch | ✅✅ incl. **Claude Code and Codex as children** | ❌ by design |
| Best headless primitive | `opencode run --format json` | `hermes -z` (cleanest stdout contract) | `dsh --profile headless "job"` | `pi --mode json` / `--mode rpc` |
| Local models | ✅ Ollama, LM Studio, llama.cpp | ✅ any endpoint | ✅ via custom OpenAI-compatible provider | ✅ llama.cpp router, `/llama` |

**Who should pick which:**

- **You want a Claude-Code-shaped tool that isn't tied to one vendor, and you want it to work today.** → **opencode.** It reads your existing `AGENTS.md`, `CLAUDE.md`, and `.claude/skills/`, speaks 75+ providers, is past 1.0, and has the only genuinely complete docs of the four.
- **You are building or studying harnesses — you want to swap the loop, the sandbox, or the storage; or you want one agent to orchestrate Claude Code and Codex.** → **DeepSeek Harness.** Nothing else here exposes those seams. Accept the developer-preview tax.
- **You want the smallest thing that works, you care about context economy, and you plan to embed an agent in your own product.** → **pi.** Four tools, `--mode rpc`, an SDK, and an explicit refusal to bundle features you did not ask for.
- **Your work is scheduled, cross-repo and long-lived — nightly triage, an inbox that files PRs.** → **Hermes Agent.** Worktrees + kanban + cron in one binary. It is not the tool for "refactor this file".
- **You are teaching security posture.** → put **dsh's `workspace-write` + `ask` + fail-closed** next to **pi's "no permission popups"** on one slide. Same license, same year, opposite philosophies, both defensible.

---

## 6. What to teach vs what to skip

For a ~300-line module, this section is the whole open-source wing. Suggested budget:

**TEACH (≈220 lines)**

1. **(15 lines) The name trap, as the opening.** Two projects called opencode; the live one moved org from `sst` to `anomalyco`; the dead one became Crush. Hermes Agent ≠ Hermes models. This teaches a durable skill — *verify the repo before you trust the tutorial* — and it is the only part of this module guaranteed not to age.
2. **(25 lines) One table: the four projects × {shape, license, version, default safety posture, headless flag}.** Facts about *what things are*, not benchmarks.
3. **(45 lines) The convergence result.** `AGENTS.md` in all four. `SKILL.md` under `~/.agents/skills/` in three, independently. opencode and dsh reading Claude Code's own paths. **This is the payoff of Module 10 and Module 11** — the framework transfers because the ecosystem standardized. Show the matrix from §3, trimmed to five columns.
4. **(45 lines) Permissions and sandboxing, as a contrast pair.** dsh's `read-only`/`workspace-write`/`danger-full-access` × `ask`/`never`, fail-closed, session-pinned, audited — versus pi's *"No permission popups. Run in a container."* — versus opencode's *"Most permissions default to 'allow'."* End with the rule: **the sandbox is the container, and the agent's permission model is a usability feature on top of it.**
5. **(35 lines) Headless is the real differentiator for professionals.** Four verbatim commands: `opencode run --format json`, `hermes -z`, `dsh --profile headless "job"`, `pi --mode json`. Then the CI point: exit codes, JSON event streams, and `pi -t read,grep,find` as tool-level least privilege. This is the bit that separates "I chat with an agent" from "an agent is part of my pipeline".
6. **(30 lines) Two things nobody else ships, as "the frontier".** (a) dsh driving **Claude Code and Codex as subagents** — agents composing agents. (b) dsh's **escaping of literal `</system-reminder>` in AGENTS.md content** — a shipped, named mitigation for instruction-file prompt injection, which is a direct callback to Module 12.
7. **(15 lines) One exercise:** install any two, put the *same* `AGENTS.md` and the *same* `SKILL.md` in a repo, run the same headless prompt through both, diff the results.
8. **(10 lines) Hermes Agent as a one-paragraph sidebar**, framed as the adjacent category, with `hermes chat --worktree` as the single concrete hook.

**SKIP (and say why, briefly)**

- **Star counts, "fastest growing", benchmark tables.** All four are MIT, all four are moving weekly. Numbers here are stale before the module is reviewed.
- **Feature-by-feature checklists of TUI keybindings, themes, editor niceties.** Not transferable.
- **Cordis internals** (fibers, services, patch layers, capability seams). Fascinating, and completely wrong for an intermediate module. One sentence — "everything is a plugin" — is the right dose.
- **A full config-file walkthrough for each project.** Teach the *categories*; link the config reference.
- **Any comparison with the closed-source agents.** That belongs in the module's other wing; here it dilutes.
- **Install-from-source instructions** except dsh, where the preview status makes it relevant.
- **Recommending one winner.** Give the "who should pick which" decision list from §5 instead. That ages far better than a pick.

**Tone note.** Every one of these is pre-1.0 except opencode. Do not let the module imply otherwise. dsh's own README shouts *"THERE WILL BE COMPATIBILITY-BREAKING CHANGES"* — quote it, and let the reader calibrate.

---

## 7. References for the module

1. **[opencode — GitHub repository (`anomalyco/opencode`)](https://github.com/anomalyco/opencode)** · Anomaly · MIT · v1.18.23, 2026-08-25 — canonical install block; the org that replaced `sst`.
2. **[opencode — Docs intro](https://opencode.ai/docs/)** · accessed 2026-08-25 — what it is, full install matrix, docs map.
3. **[opencode — Rules (`AGENTS.md`)](https://opencode.ai/docs/rules/)** · accessed 2026-08-25 — instruction-file names, paths, precedence, `CLAUDE.md` fallback.
4. **[opencode — Agent Skills](https://opencode.ai/docs/skills/)** · accessed 2026-08-25 — the six skill roots including `.claude/skills/` and `~/.agents/skills/`; `SKILL.md` frontmatter.
5. **[opencode — Permissions](https://opencode.ai/docs/permissions/)** · accessed 2026-08-25 — `allow`/`ask`/`deny`, the permissive defaults, `doom_loop`.
6. **[opencode — CLI reference](https://opencode.ai/docs/cli/)** · accessed 2026-08-25 — `opencode run`, `--format json`, `--auto`, `serve`/`web`.
7. **[opencode — GitHub Action](https://opencode.ai/docs/github/)** · accessed 2026-08-25 — `anomalyco/opencode/github@latest`, `/oc` trigger. The rename's most common breakage.
8. **[opencode-ai/opencode — archived](https://github.com/opencode-ai/opencode)** · archived 2025 — *"Project has Moved … continued under the name Crush"*. The disambiguation, in the project's own words.
9. **[DeepSeek Harness — GitHub repository](https://github.com/deepseek-ai/deepseek-harness)** · DeepSeek AI · MIT · `dsh-v0.1.1-rc.2`, 2026-08-21 — "everything is a plugin"; the developer-preview warning; `npx @deepseek-ai/dsh web`.
10. **[DeepSeek Harness — `dsh` CLI README](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md)** · fetched 2026-08-25 — profiles, `dsh --profile headless "job"`, bundle composition order.
11. **[DeepSeek Harness — sandbox subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/sandbox.md)** · fetched 2026-08-25 — the three modes; bwrap/Landlock, Seatbelt, Windows ACL; `full` vs `partial` enforcement; "network is outside this vocabulary".
12. **[DeepSeek Harness — approval seam](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/interaction/user-approval/README.md)** · fetched 2026-08-25 — `ask`/`never`, fail-closed, audit events, and the exact text the model is shown.
13. **[DeepSeek Harness — subagent family](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/README.md)** · fetched 2026-08-25 — Claude Code and Codex as subagent providers.
14. **[DeepSeek Harness — agent instructions plugin](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/context/agent-instructions/README.md)** · fetched 2026-08-25 — `AGENTS.md` dedup, live nested discovery, `</system-reminder>` escaping.
15. **[pi — coding agent README](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md)** · Earendil Inc. · MIT · v0.84.3, 2026-08-24 — install, four tools, skills/extensions/prompt templates, "No MCP / No sub-agents", the print and RPC modes, the security warning.

---

## 8. Link Verification Log

| URL / command | Fetch result | Date checked | Claim it supports |
|---|---|---|---|
| `gh api repos/sst/opencode` | **OK** — returns `full_name: anomalyco/opencode` | 2026-08-25 | The rename `sst` → `anomalyco`. MIT, created 2025-04-30, default branch `dev`, pushed 2026-08-25 |
| `gh api repos/anomalyco/opencode/license` | **OK** — `path: LICENSE`, `spdx_id: MIT` | 2026-08-25 | opencode license from the LICENSE blob, not a badge |
| `gh api repos/anomalyco/opencode/releases` | **OK** | 2026-08-25 | v1.18.23 (2026-08-25), v1.18.22 (08-24), v1.18.21 (08-21) — near-daily cadence |
| `gh api repos/anomalyco/opencode/readme` | **OK** | 2026-08-25 | Verbatim install block incl. `brew install anomalyco/tap/opencode` |
| `gh api repos/opencode-ai/opencode` + `/readme` | **OK** — `archived: true` | 2026-08-25 | *"Archived: Project has Moved … continued under the name Crush"*; last release v0.0.55 (2025-06-27); the Go/Bubble Tea lineage |
| `gh api repos/charmbracelet/crush` | **OK** | 2026-08-25 | Crush is live; GitHub reports license `NOASSERTION` (do not call it MIT without reading its LICENSE) |
| https://opencode.ai/docs/ | **OK** | 2026-08-25 | "open source AI coding agent"; Anomaly as maintainer; install matrix incl. ghcr image; docs nav map |
| https://opencode.ai/docs/rules/ | **OK** | 2026-08-25 | `AGENTS.md`, `~/.config/opencode/AGENTS.md`, `CLAUDE.md` fallbacks, `"instructions"` key, precedence order |
| https://opencode.ai/docs/agents/ | **OK** | 2026-08-25 | Agent dirs, frontmatter fields, Build/Plan, General/Explore/Scout, `@mention`, session keybinds |
| https://opencode.ai/docs/commands/ | **OK** | 2026-08-25 | Command dirs, frontmatter incl. required `template` and `subtask`, `$ARGUMENTS`/`$1..$3`, `` !`cmd` ``, `@file` |
| https://opencode.ai/docs/skills/ | **OK** | 2026-08-25 | Six skill roots; `SKILL.md` frontmatter; "loaded on-demand via the native `skill` tool" |
| https://opencode.ai/docs/plugins/ | **OK** | 2026-08-25 | Plugin dirs; the full ~30-name event list incl. `tool.execute.before`, `permission.asked` |
| https://opencode.ai/docs/permissions/ | **OK** | 2026-08-25 | `allow`/`ask`/`deny`; the verbatim defaults sentence; `doom_loop` 3-repeat rule; `.env` denied |
| https://opencode.ai/docs/providers/ | **OK** | 2026-08-25 | 75+ providers; `/connect`; `auth.json` path; the Ollama/LM Studio/llama.cpp JSON |
| https://opencode.ai/docs/mcp-servers/ | **OK** | 2026-08-25 | `mcp` key; `type: "local"` and `type: "remote"` JSON shapes |
| https://opencode.ai/docs/cli/ | **OK** | 2026-08-25 | `opencode run` + all flags; `serve`/`web`; `session list/delete` |
| https://opencode.ai/docs/github/ | **OK** | 2026-08-25 | `opencode github install`; action `anomalyco/opencode/github@latest`; `/oc` / `/opencode` triggers |
| https://x.com/thdxr/status/2007199285251842478 | **[LINK-UNVERIFIED]** — surfaced in WebSearch results only; X posts are not fetchable here | 2026-08-25 | The rename rationale ("our official company name has always been 'anomaly'"). **The rename itself is independently verified** by the gh redirect and the docs |
| `gh api repos/deepseek-ai/deepseek-harness` (+ `/license`, `/releases`, `/readme`) | **OK** | 2026-08-25 | First-party under `deepseek-ai`; MIT; created **2026-08-13**; `dsh-v0.1.1-rc.2` (2026-08-21); the developer-preview warning; `npx @deepseek-ai/dsh web` |
| https://deepseek.com/harness/en/ | **OK** | 2026-08-25 | "developer preview … source code included"; "Agent = Model + Harness"; Standard/Code/Minimal/Creator modes; append-only session log |
| .../deepseek-harness/master/apps/cli/README.md | **OK** (raw.githubusercontent) | 2026-08-25 | Entry-mode table; `dsh --profile headless "job"`; profiles, bundles, `cordis.patch.yml`, `--dump-config`; nonzero exits |
| .../deepseek-harness/master/docs/user/guide/index.md | **OK** | 2026-08-25 | Web UI first-run flow; workspace selection; "asks before operations that require approval under the active permission policy" |
| .../deepseek-harness/master/docs/user/guide/providers.md | **OK** | 2026-08-25 | DeepSeek key, catalog providers, custom provider; `$DSH_HOME/.credentials.yaml`; `$DSH_HOME/settings.yaml`; the custom-provider YAML |
| .../deepseek-harness/master/packages/context/agent-instructions/README.md | **OK** | 2026-08-25 | `$DSH_HOME/AGENTS.md` + per-directory chain; byte-identical dedup; nested add/update/remove notices; `</system-reminder>` escaping |
| .../deepseek-harness/master/packages/interaction/user-approval/README.md | **OK** | 2026-08-25 | `allowed-once`/`rejected`/`cancelled`/`unavailable`; fail-closed; `ask`/`never`; audit pair; the verbatim never-policy model text |
| .../deepseek-harness/master/packages/interaction/permission-presets/README.md | **OK** | 2026-08-25 | `workspace-write` and `danger-full-access` preset bundles; session-pinned at creation |
| .../deepseek-harness/master/docs/subsystems/sandbox.md | **OK** | 2026-08-25 | The three `SandboxMode` values; bwrap/Landlock, Seatbelt, Windows ACL; `full` vs `partial`; network out of scope |
| .../deepseek-harness/master/packages/subagent/README.md | **OK** | 2026-08-25 | Provider list incl. `subagent-claude-code` ("official Claude Agent SDK") and `subagent-codex`; the `dsh plugin … add` command |
| .../deepseek-harness/master/packages/hooks/README.md | **OK** | 2026-08-25 | `hooks-claude-code`, `hooks-codex` bridges; "point a bridge plugin at an existing `hooks.json`" |
| .../deepseek-harness/master/packages/mcp/README.md | **OK** | 2026-08-25 | `mcp-client` registers external server tools on `ctx.tools` (client only) |
| .../deepseek-harness/master/packages/skill/skill-filesystem/README.md + docs/subsystems/skills.md | **OK** | 2026-08-25 | `SKILL.md`/flat-Markdown scanning; `dshHome` and `agentsHome` (`$DSH_AGENTS_HOME` / `~/.agents`) roots |
| .../deepseek-harness/master/packages/interaction/commands/README.md | **OK** | 2026-08-25 | `ctx.commands.register`; lowercase `/name` grammar; results never enter model history |
| `gh api repos/badlogic/pi-mono` | **OK** — returns `full_name: earendil-works/pi` | 2026-08-25 | pi's repo lineage: personal repo → `earendil-works` org |
| `gh api repos/earendil-works/pi` (+ `/license`, `/releases`) | **OK** | 2026-08-25 | MIT; created 2025-08-09; v0.84.3 (2026-08-24), v0.84.2 (08-14), v0.84.1 (08-07) |
| https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/README.md | **OK** (curl, 717 lines, read locally) | 2026-08-25 | Everything in §2.4: install, four tools, provider list, `AGENTS.md`/`AGENTS.override.md`/`SYSTEM.md`, skills roots, extensions API, "No MCP"/"No sub-agents"/"No plan mode", `trust.json`, telemetry, full CLI reference |
| https://pi.dev/ | **OK** | 2026-08-25 | "Pi is a minimal agent harness"; Earendil Inc.; the npm install command; links to `earendil-works/pi` |
| https://hermes-agent.nousresearch.com/docs/reference/cli-commands | **OK** | 2026-08-25 | `hermes project` (worktrees, `bind-board`), `hermes kanban`, `hermes chat --worktree --checkpoints -q`, `hermes -z`, `hermes mcp serve`, `hermes skills`, `hermes checkpoints` |
| `scratchpad/research/14_personal_agents.md` (local) | **OK** | 2026-08-25 | Hermes Agent identity, MIT license, v0.20.5 / `v2026.8.19` (2026-08-21), install one-liner, `AGENTS.md` / `~/.hermes/SOUL.md`, skills path, threat-model quotes — **not re-verified in this pass, by instruction** |

---

## 9. Open questions / [UNVERIFIED]

1. **`[UNVERIFIED]` opencode's `/docs/policies/` page.** The docs nav lists **Policies** separately from **Permissions**. It is plausibly the enterprise-grade rule surface (org-wide deny lists), which would matter for the module's security section. Not fetched. → `https://opencode.ai/docs/policies/`
2. **`[UNVERIFIED]` opencode sandboxing.** No first-party sandbox page found in the nav. My read is that opencode delegates isolation to the user (container/devcontainer), but I did not find a first-party sentence saying so. Do not assert it either way in the module.
3. **`[UNVERIFIED]` opencode "Zen" and "Go".** Both appear in opencode's docs nav *and* in pi's provider list ("OpenCode Zen", "OpenCode Go"). They look like Anomaly's own model gateway / hosted offering. Relevant only if the module discusses monetization of OSS agents. Not fetched.
4. **`[UNVERIFIED]` dsh local models.** No first-party page names Ollama or llama.cpp. The custom-provider form (base URL + `openai-completions`) obviously supports them, but I will not claim first-party support.
5. **`[UNVERIFIED]` dsh GitHub Action / CI recipe.** `dsh --profile headless` is clearly scriptable and exits nonzero on failure, but I found no first-party Action or CI page.
6. **`[UNVERIFIED]` dsh skills frontmatter.** The filesystem provider parses `SKILL.md` *or flat Markdown*, but I did not extract the exact frontmatter field list from `docs/subsystems/skills.md` (it is a long generated type reference). Leave the matrix cell as "SKILL.md or flat Markdown" rather than guessing fields.
7. **`[UNVERIFIED]` the X post** behind the opencode rename rationale — see the Link Verification Log. The rename is verified; only the maintainer's *phrasing* is not.
8. **`[UNVERIFIED]` Crush's license.** GitHub reports `NOASSERTION` for `charmbracelet/crush`. If the module mentions Crush at all, either read its LICENSE file or say nothing about its license.
9. **`[UNVERIFIED]` `shaftoe/pi-coding-agent-action`** — a third-party GitHub Action for pi surfaced in search. Not fetched, not first-party. Do not put it in the module.
10. **Open question for the author, not a research gap:** Hermes Agent is in *both* Module 14 and Module 15. Decide the split explicitly — my recommendation is that Module 14 owns it and Module 15 gives it eight lines with `hermes chat --worktree` as the only command, cross-linking back. Two full treatments of one tool in adjacent modules will read as padding.

---

## RESUME NOTES

**Done (complete, primary-sourced):** all of §1–§9. Name verification for all four names; full deep dives for opencode, dsh and pi; the coding-agent angle for Hermes; extension matrix; install blocks; comparison; teach/skip; references; verification log.

**Partial:** Hermes Agent — by instruction, only the coding angle was researched here; identity/license/maturity/security come from `14_personal_agents.md` and were not re-verified.

**Not started (deliberate):** the closed-source wing of the module (Claude Code, Codex, Cursor, etc.) — out of scope for this pass.

**Searches run (2 total — discovery only, never cited as fact):** `opencode coding agent terminal github sst opencode-ai`; `deepseek-harness agent harness DeepSeek official coding agent`; `pi.dev coding agent CLI`; `opencode sst anomaly "anomalyco" repository moved company name change`.

**Dead / unfetchable URLs:** `https://x.com/thdxr/status/2007199285251842478` (X, not fetchable). No 404s encountered — every raw.githubusercontent and docs URL in the log resolved.

**Unfollowed leads, in priority order for a next pass:**
1. `https://opencode.ai/docs/policies/` — likely the enterprise permission surface.
2. `https://opencode.ai/docs/config/` — the full `opencode.json` schema (useful if the module shows one complete config).
3. `https://opencode.ai/docs/zen/` and `/docs/go/` — Anomaly's hosted offerings; the OSS-monetization angle.
4. `docs/subsystems/skills.md` deep read for dsh's exact skill frontmatter fields.
5. `docs/subsystems/tools.md`, `docs/subsystems/workflow.md`, `docs/subsystems/plan.md` in dsh — plan mode and workflows, if the module covers planning.
6. `https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md` and `docs/json.md` — pi's extension API surface and JSON event schema, if the module shows a CI integration in detail.
7. `charmbracelet/crush` LICENSE, only if Crush gets more than one sentence.

**Ordered next actions if resuming:** (1) fetch lead #1 and patch §2.1's permissions paragraph; (2) fetch lead #4 and fill the dsh skills cell in §3; (3) decide the Hermes 14/15 split per §9.10; (4) hand §6 to the module author.
