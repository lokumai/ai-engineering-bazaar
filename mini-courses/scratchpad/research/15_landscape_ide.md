# Module 15 Research — IDE-based & Editor-Integrated Commercial Coding Agents

**Scope:** Kiro, Cursor, GitHub Copilot (agentic surface), Windsurf.
**Researched:** 2026-08-25. All claims below were fetched from the vendor's own docs on that date unless marked otherwise.
**Status:** COMPLETE (one pricing gap — see RESUME NOTES).

---

## Name & status verification

### Kiro — VERIFIED, and it is not what most people assume

- **Kiro is real, and it is an Amazon company product.** The `kiro.dev` footer carries an "An [Amazon company](https://aws.amazon.com)" link, and the FAQ confirms it is delivered on AWS infrastructure with AWS Regions, AWS GovCloud and AWS IAM Identity Center, under AWS service terms ([Kiro FAQ, fetched 2026-08-25](https://kiro.dev/faq/)).
- **It is no longer just an IDE.** Kiro self-describes as "an agentic AI with an IDE, CLI, web interface, mobile app, and Kiro Crew that helps developers and teams do their best work" ([Kiro FAQ, fetched 2026-08-25](https://kiro.dev/faq/)). The docs landing page frames it as "a unified agent that operates across multiple interfaces—desktop IDE, command-line terminal, web browser, and mobile app" ([Kiro Docs, fetched 2026-08-25](https://kiro.dev/docs/)).
- **The distinctive concept — specs and steering — verifies fully.** See the dedicated section below. This is real, documented, and pedagogically the most interesting thing in this whole landscape.
- Teaching note: do NOT describe Kiro as "AWS's Cursor clone." It is a spec-first agentic development environment that happens to ship an IDE.

### Windsurf — VERIFIED, and it no longer exists under that name

This is the single biggest correction the module needs.

- **Windsurf was acquired by Cognition** ([Cognition's acquisition of Windsurf, cognition.com/blog/windsurf](https://cognition.com/blog/windsurf)) `[LINK-UNVERIFIED: title surfaced in site-restricted search of cognition.com; page body not fetched directly. The acquisition itself is corroborated by the two primary sources below.]`
- **On 2026-06-02, Windsurf became Devin Desktop.** Cognition's announcement is dated 06.02.26 and states: "We took the IDE foundation of Windsurf and built Devin Desktop for that world," and that the agent manager is built "into the full IDE, which remains fully backwards-compatible with Windsurf" ([Introducing Devin Desktop, 2026-06-02](https://cognition.com/blog/introducing-devin-desktop)).
- **The docs confirm it is a rename, not a replacement:** "Devin Desktop is the new name for Windsurf. It's the same IDE, same editor, and has the same features, but unified under the Devin brand." ([Devin Desktop FAQ, fetched 2026-08-25](https://docs.devin.ai/desktop/devin-desktop-faq))
- **Cascade is being retired.** The local agent is rebranded **Devin Local**; "The existing Cascade agent remains available through July." ([Devin Desktop FAQ, fetched 2026-08-25](https://docs.devin.ai/desktop/devin-desktop-faq)). Devin Local "use[s] the same agent harness as Devin CLI directly inside Devin Desktop" ([Devin Local Agent, fetched 2026-08-25](https://docs.devin.ai/desktop/devin-local)).
- **Corroborating signal:** `https://windsurf.com/pricing` now issues a **308 Permanent Redirect to `https://devin.ai/pricing`** (observed 2026-08-25). The brand is being folded into Devin at the DNS/routing level.
- **Plans and pricing are stated unchanged:** "Your current plan continues to work exactly as it does today. Pricing is unchanged." ([Devin Desktop FAQ, fetched 2026-08-25](https://docs.devin.ai/desktop/devin-desktop-faq))
- Teaching note: the module must call this "Windsurf (now Devin Desktop)". A course that says "Windsurf, by Codeium" in late 2026 is two owners and one rename out of date.

### Cursor — VERIFIED, rules format has moved on twice

- `.cursorrules` is legacy. **Current: `.cursor/rules` holding `.mdc` files.** "Project rules live in `.cursor/rules` as `.mdc` files and are version-controlled." ([Cursor Docs — Rules, fetched 2026-08-25](https://cursor.com/docs/context/rules))
- **Cursor now also honours `AGENTS.md` natively** — and treats it specially: plain `.md` files in the rules directory are ignored *unless* the file is `AGENTS.md` ([Cursor Docs — Rules, fetched 2026-08-25](https://cursor.com/docs/context/rules)).
- Note the doc-host move: `docs.cursor.com/*` now 308-redirects to `cursor.com/docs` (observed 2026-08-25). Any module link to `docs.cursor.com` will bounce.

### GitHub Copilot — VERIFIED, but the agent has been renamed

- The autonomous surface is now documented as **"Copilot cloud agent"**, not "coding agent". GitHub's own docs use "Copilot cloud agent" throughout ([About GitHub Copilot cloud agent, fetched 2026-08-25](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)). The old `coding-agent` URL slug still resolves.
- Copilot's billing unit is now **AI credits**, not "premium requests" ([Copilot plans, fetched 2026-08-25](https://docs.github.com/en/copilot/get-started/plans)).

---

## Per-product deep dive

### 1. Kiro (an Amazon company)

**Identity & interaction model.** An agentic development environment built around *formalised specs*: you describe a feature, Kiro produces requirements → design → tasks as version-controlled markdown, then executes the tasks. The same agent runs across IDE, CLI, web and mobile with shared configuration ([Kiro Docs, 2026-08-25](https://kiro.dev/docs/)).

**How you get it.** Download the IDE from kiro.dev for macOS, Windows 10/11 or Linux; CLI installs on macOS, Windows 11 or Linux; web app needs no install; iOS is TestFlight-only during early access. Sign in with Google, GitHub, AWS Builder ID, or an organizational identity; VS Code settings can be imported ([Installation, 2026-08-25](https://kiro.dev/docs/getting-started/installation/)).

**Pricing (read 2026-08-25).** Free $0/mo, 50 credits, "open weight models and Claude Sonnet 4.5". Pro $20/user/mo, 1,000 credits. Pro+ $40/user/mo, 2,000 credits. Pro Max $100/user/mo, 5,000 credits. Power $200/user/mo, 10,000 credits. Add-on credits $0.04/credit on all paid tiers. Enterprise is custom, purchased through AWS ([Kiro pricing, read 2026-08-25](https://kiro.dev/pricing/)).

**Model support.** "Kiro gives you access to frontier and open weight AI models from OpenAI, Anthropic, and other providers." Documented models include GPT-5.6 Sol / Terra / Luna; Claude Opus 5, 4.8, 4.7, 4.6, 4.5; Claude Sonnet 5, 4.6, 4.5, 4.0; Claude Haiku 4.5; DeepSeek 3.2; MiniMax M2.5 and M2.1; GLM-5; Qwen3 Coder Next. An "Auto" option "routes to the optimal model per task" ([Models, 2026-08-25](https://kiro.dev/docs/models/)). **BYOK is not documented** — treat as unsupported `[UNVERIFIED: absence of evidence, not evidence of absence]`.

**Extension mechanisms (Module 10 categories).**
- *Instruction/rules file* — **Steering**. Workspace: `.kiro/steering/`; global: `~/.kiro/steering/`, workspace wins on conflict. Three auto-generated foundation files: `product.md`, `tech.md`, `structure.md`, "included in every interaction by default". YAML frontmatter selects inclusion mode: `inclusion: always` (default), `inclusion: fileMatch` with `fileMatchPattern`, `inclusion: manual` (invoked as `#steering-file-name`), `inclusion: auto` with `name` and `description`. The CLI does not support inclusion modes — all steering files load ([Steering, 2026-08-25](https://kiro.dev/docs/steering/)).
- *AGENTS.md* — **Yes, natively.** "Kiro supports providing steering directives via the AGENTS.md standard… however, AGENTS.md files do not support inclusion modes and are always included." Place at workspace root, in subdirectories, or in `~/.kiro/steering/` ([Steering, 2026-08-25](https://kiro.dev/docs/steering/)).
- *Agents/subagents* — **Custom agents** at `.kiro/agents/<name>.json` or `.kiro/agents/<name>.md` (workspace, "loaded only if the workspace is trusted") and `~/.kiro/agents/<name>.{json,md}` (global); workspace precedence. Fields: `name`, `description`, `tools`, `excludedTools`, `includeMcpJson`, `includePowers`, `resources`, `permissions`, `prompt`, `model`, `welcomeMessage`. Limitation: "Custom agents are available in the IDE and CLI today. Web and Mobile sessions run with Kiro's built-in agents" ([Custom agents, 2026-08-25](https://kiro.dev/docs/custom-agents/)).
- *Hooks* — JSON files in `.kiro/hooks/`, kebab-case names (e.g. `lint-on-save.json`), multiple hooks per file. Triggers: `PostFileSave`, `PostFileCreate`, `PostFileDelete`, `PreToolUse` (can block), `PostToolUse`, `UserPromptSubmit` (can block), `SessionStart`, `Stop`, `PreTaskExec` (can block), `PostTaskExec`. Important gotcha: "File triggers respond only to changes made by the agent" — manual editor saves do not fire them ([Hooks, 2026-08-25](https://kiro.dev/docs/hooks/)).
- *Skills* — Agent Skills standard. `.kiro/skills/` and `~/.kiro/skills/`; a folder containing `SKILL.md` plus optional `scripts/`, `references/`, `assets/`. Frontmatter requires `name` and `description`; `name` must match the folder, lowercase/numbers/hyphens, max 64 chars ([Agent Skills, 2026-08-25](https://kiro.dev/docs/skills/)).
- *Plugins* — **Powers**. A power is `plugin.json` (required manifest declaring activation keywords) + `skills/` + optional `mcp.json` + optional `dev.kiro/`. Powers "conform to the Agent Plugins specification — an open, vendor-neutral format". Legacy `POWER.md` still works ([Powers, 2026-08-25](https://kiro.dev/docs/powers/)).
- *MCP* — `.kiro/settings/mcp.json` (workspace) and `~/.kiro/settings/mcp.json` (user); merged, workspace wins. Standard `mcpServers` object with `command`/`args`/`disabled` ([MCP configuration, 2026-08-25](https://kiro.dev/docs/mcp/configuration/)).

**Permissions / approval.** Two autonomy modes under Settings → Agent → Agent Autonomy: **Autopilot** (permitted operations run without prompting) and **Supervised** (approval before any action). Default policy allows `fs_read on ./**` silently plus common read-only git shell commands. Rules combine capabilities (`fs_read`, `shell`, `mcp`), effects (`deny`, `ask`, `allow`) and match patterns under a **deny-overrides** algorithm: "deny > ask > allow. There is no precedence between scopes - the most restrictive effect wins." Hardcoded: writes to `.kiro/settings/` and `.kiro/workspace-roots/` are permanently blocked; `.git/**` and `.kiroignore` changes always require approval. Config lives at `~/.kiro/settings/permissions.yaml` and `~/.kiro/workspace-roots/<hash>/permissions.yaml` — **deliberately outside the repository**, so a cloned repo cannot inject permissions ([Permissions, 2026-08-25](https://kiro.dev/docs/permissions/)). *This out-of-repo permission store is a genuinely good design point and worth teaching.*

**Headless / CI.** Yes. `kiro-cli chat --no-interactive --trust-tools=read,grep "Your prompt"`. Auth via `KIRO_API_KEY` env var. Flags: `--no-interactive`, `--trust-all-tools`, `--trust-tools=<categories>` (read, grep, write), `--require-mcp-startup`. **Restricted to Pro, Pro+, Pro Max and Power subscribers.** Cannot accept mid-session input; prompt must be passed upfront ([Headless mode, 2026-08-25](https://kiro.dev/docs/cli/headless/)).

**Distinctive idea.** Spec-driven development (see dedicated section). Secondary: the deny-overrides permission model stored outside the repo, and the plugin-format "Powers".

**Honest limitations.** Credit-metered, so cost is opaque per task. Headless mode is paywalled. Custom agents don't work on web/mobile. No documented BYOK. Hooks ignore human edits, which surprises people. The four-surface story (IDE/CLI/web/mobile/Crew) is a lot of product surface for a tool this young — expect churn.

---

### 2. Cursor

**Identity & interaction model.** A VS Code-derived editor whose primary surface is an agent chat that plans and edits across the repo, with Plan Mode for upfront design and cloud agents for delegated work.

**How you get it.** Desktop app download; plus a CLI: `curl https://cursor.com/install -fsS | bash` (macOS/Linux/WSL) or `irm 'https://cursor.com/install?win32=true' | iex` (Windows) ([Cursor CLI, 2026-08-25](https://cursor.com/docs/cli/overview)).

**Pricing (read 2026-08-25).** Hobby: free. **Pro $20/month. Pro Plus $60/month. Ultra $200/month.** Teams **Standard $40/user/month**, **Premium $120/user/month**. Enterprise: custom. India-only "Start" tier at ₹649/month tax inclusive. "Pro, Pro Plus, and Ultra include unlimited tab completions" ([Cursor pricing docs, read 2026-08-25](https://cursor.com/docs/account/pricing)). *Caution:* the marketing page at `cursor.com/pricing` renders Pro+/Ultra under a shared "$20/mo" heading and is easy to misread — the docs page above is the reliable one.

**Model support.** "Cursor supports frontier models from OpenAI, Anthropic, Google, SpaceXAI, and more," plus first-party models in the "Cursor Models" pool (Composer 2.5, Grok 4.6, Grok 4.5). BYOK exists — docs reference "BYOK usage" being subject to the Cursor Token Rate — but the mechanism is not explained on that page ([Models, 2026-08-25](https://cursor.com/docs/models)).

**Extension mechanisms.**
- *Rules* — `.cursor/rules` containing `.mdc` files, version-controlled. Four application modes via frontmatter: **Always Apply** (`alwaysApply: true`), **Apply Intelligently** (driven by `description`), **Apply to Specific Files** (`globs`), **Apply Manually** (@-mention only). "When applied, rule contents are included at the start of the model context." Nested rules in subdirectories; **User Rules** globally; **Team Rules** enforced org-wide from the dashboard on Team plans ([Rules, 2026-08-25](https://cursor.com/docs/context/rules)).
- *AGENTS.md* — **Yes.** It is the documented lightweight alternative "without frontmatter overhead", and nested `AGENTS.md` files in subdirectories are supported ([Rules, 2026-08-25](https://cursor.com/docs/context/rules)).
- *Skills* — `SKILL.md` inside `.cursor/skills/<skill-name>/`; also `.agents/skills/`, `~/.cursor/skills/`, `~/.agents/skills/`, and nested project paths like `apps/web/.cursor/skills/`. Optional frontmatter `name`, `description`, `paths`. Invoked by `/skill-name` or `@`-attachment ([Skills, 2026-08-25](https://cursor.com/docs/context/commands)).
- *Commands* — markdown files at `.cursor/commands/<command>.md`, run by typing `/` in the Agent input `[LINK-UNVERIFIED: the exact path appeared in Cursor-domain search results attributed to cursor.com/docs/customize-cursor, but direct fetches of cursor.com/docs/context/commands and cursor.com/docs/customize-cursor both returned Skills content and did not restate the path. Treat the path as probable, verify before printing in the module.]* Cursor's Skills docs confirm commands exist as a distinct primitive: "Slash commands: Both user-level and workspace-level commands, preserving their explicit invocation behavior" can be migrated to Skills ([Skills, 2026-08-25](https://cursor.com/docs/context/commands)).
- *Subagents* — exist (referenced by the `subagentStart`/`subagentStop` hooks and the Task tool). Path/format not verified.
- *Hooks* — `<project-root>/.cursor/hooks.json`, `~/.cursor/hooks.json`, plus enterprise paths `/Library/Application Support/Cursor/hooks.json` (macOS), `/etc/cursor/hooks.json` (Linux/WSL), `C:\ProgramData\Cursor\hooks.json` (Windows). Precedence Enterprise → Team → Project → User. Events include `sessionStart`, `sessionEnd`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `subagentStart`, `subagentStop`, `beforeShellExecution`, `afterShellExecution`, `beforeMCPExecution`, `afterMCPExecution`, `beforeReadFile`, `afterFileEdit`, `beforeSubmitPrompt`, `preCompact`, `stop`, `afterAgentResponse`, `afterAgentThought`, plus Tab hooks (`beforeTabFileRead`, `afterTabFileEdit`) and `workspaceOpen` ([Hooks, 2026-08-25](https://cursor.com/docs/agent/hooks)). *This is the richest hook surface of the four products.*
- *MCP* — `.cursor/mcp.json` (project) and `~/.cursor/mcp.json` (global), `mcpServers` object; stdio form uses `command`/`args`/`env`, remote form uses `url`/`headers` ([MCP, 2026-08-25](https://cursor.com/docs/context/mcp)).

**Permissions / approval.** Three **run modes**. **Auto-review** is the recommended default: it "runs known-safe calls, sandboxes shell commands when it can, and asks a classifier to review anything else." **Allowlist**: "Actions in your allowlist run without approval," with optional sandboxing. **Run Everything**: every tool call executes with no prompts and no sandboxing. Configured via `permissions.json` and `sandbox.json` at user (`~/.cursor/`) and project level, team settings taking precedence. Critical caveat, verbatim: **"Auto-review is not a security boundary. The classifier can make mistakes."** ([Run modes, 2026-08-25](https://cursor.com/docs/agent/security/run-modes))

**Headless / CI.** Yes, via CLI print mode: "Use print mode for non-interactive scenarios like scripts, CI pipelines, or automation." `agent -p "find and fix performance issues" --model "gpt-5"`; `--output-format text` ([Cursor CLI, 2026-08-25](https://cursor.com/docs/cli/overview)). A Python SDK is also documented.

**Distinctive idea.** Plan Mode as a first-class, editable artifact: Shift+Tab produces a plan you review and edit "via chat or markdown" before execution, and "Plans save to your home directory by default; use 'Save to workspace' to share them with your team." Cursor's framing is worth quoting to students: "The hard part is often figuring out **what** change should be made. With the right instructions, delegate implementation to Agent." ([Plan mode, 2026-08-25](https://cursor.com/docs/agent/modes))

**Honest limitations.** Format churn: `.cursorrules` → `.cursor/rules/*.mdc` → now also `AGENTS.md` and Skills, with commands being nudged toward Skills. Docs host moved (`docs.cursor.com` → `cursor.com/docs`), so older course links rot. The marketing pricing page is genuinely confusing. Auto-review is explicitly disclaimed as a security boundary.

---

### 3. GitHub Copilot (agentic surface)

**Identity & interaction model.** Two distinct agentic surfaces: (a) **Copilot cloud agent** — an asynchronous, GitHub-hosted agent you assign an issue or PR to, which "can research a repository, create an implementation plan, and make code changes on a branch" in "its own ephemeral development environment" ([About Copilot cloud agent, 2026-08-25](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)); and (b) **custom agents in VS Code** — synchronous, in-editor, defined as files.

**How you get it.** Any paid Copilot plan: "Copilot cloud agent is available for all paid Copilot plans." Business/Enterprise admins must enable it first ([About Copilot cloud agent, 2026-08-25](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)).

**Pricing (read 2026-08-25).** Copilot Free $0. Copilot Student free (verified students). **Copilot Pro $10 USD per month. Copilot Pro+ $39 USD per month. Copilot Max $100 USD per month.** Copilot Business $19/seat/month; Copilot Enterprise $39/seat/month. AI credits per month: Pro 1,000 base + 500 flex = 1,500; Pro+ 3,900 + 3,100 = 7,000; Max 10,000 + 10,000 = 20,000. The cloud agent is in Student, Pro, Pro+, Max, and the org plans — **excluded from Free** ([Copilot plans, read 2026-08-25](https://docs.github.com/en/copilot/get-started/plans)).

**Model support.** Multiple frontier models selectable per request; BYOK exists in VS Code but was not verified on this pass `[UNVERIFIED]`.

**Extension mechanisms.**
- *Repository instructions* — `.github/copilot-instructions.md`; "Repository-wide custom instructions apply to all requests made in the context of a repository."
- *Path-specific instructions* — `.github/instructions/NAME.instructions.md` with required frontmatter `applyTo` using glob syntax, e.g. `applyTo: "app/models/**/*.rb"`; multiple comma-separated patterns; optional `excludeAgent: "code-review"` or `"cloud-agent"` ([Add repository instructions, 2026-08-25](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)).
- *AGENTS.md* — **Yes**, anywhere in the repo, "nearest file in directory tree takes precedence". Also reads **`CLAUDE.md`** and **`GEMINI.md`** at repo root, explicitly per the agents.md specification ([Add repository instructions, 2026-08-25](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)). *Copilot reading a competitor's config file is the strongest single data point for the convergence story.*
- *VS Code discovery settings* — `chat.instructionsFilesLocations`, `chat.useAgentsMdFile`, `chat.useNestedAgentsMdFiles` (experimental), `chat.useClaudeMdFile`, `chat.includeApplyingInstructions`. `CLAUDE.md` is read from workspace root, `.claude/CLAUDE.md`, or `~/.claude/CLAUDE.md`; user-level `*.instructions.md` from `~/.copilot/instructions` or `~/.claude/rules` ([VS Code custom instructions, 2026-08-25](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)).
- *Custom agents / subagents* — `.agent.md` files in `.github/agents` (workspace default), `.claude/agents` (Claude format), `~/.copilot/agents` (user). Frontmatter: `description`, `name`, `tools`, `model`, `handoffs`, `agents` (subagents), `user-invocable` (default `true`), `hooks` (Preview). Invoked via the Agents dropdown, `/agents`, the `Chat: New Custom Agent` command, handoff buttons, or as a subagent. "When you select the custom agent in the Chat view, the guidelines in the custom agent file body are prepended to the user chat prompt." ([VS Code custom agents, 2026-08-25](https://code.visualstudio.com/docs/copilot/customization/custom-agents))
- *Hooks* — available scoped to a custom agent via the `hooks` frontmatter key, marked **Preview** ([VS Code custom agents, 2026-08-25](https://code.visualstudio.com/docs/copilot/customization/custom-agents)).
- *MCP* — supported by the cloud agent. "MCP servers allow you to give Copilot access to different data sources and tools." **The GitHub MCP server and Playwright MCP server are enabled by default**, and additional servers are configurable per repository ([About Copilot cloud agent, 2026-08-25](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)).
- *Environment setup* — `.github/workflows/copilot-setup-steps.yml`, which "must contain a single `copilot-setup-steps` job" and "won't trigger unless it's present on your default branch". Only `steps`, `permissions`, `runs-on`, `services`, `snapshot`, `timeout-minutes` (max 59) are customizable ([Customize the agent environment, 2026-08-25](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment)).

**Permissions / approval.** The strongest structural guardrails of the four, because they are platform-level rather than prompt-level:
- The agent "cannot directly run `git push` or other Git commands".
- It "cannot mark its pull requests as 'Ready for review' and cannot approve or merge a pull request"; the user who triggered it also cannot approve that PR.
- "Draft pull requests created by Copilot cloud agent must be reviewed and merged by a human."
- "GitHub Actions workflows don't run on a pull request until a user with write access approves them."
- An integrated firewall "restricts Copilot cloud agent's access to the internet"; it can be customized or disabled. Note it "is not compatible with Windows" self-hosted runners.
([Risks and mitigations, 2026-08-25](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations); [Customize the agent environment, 2026-08-25](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment))

**Headless / CI.** The cloud agent *is* the CI story — it runs on GitHub Actions infrastructure by construction, triggered by issue assignment or `@copilot`.

**Distinctive idea.** Permissions enforced by the forge, not by the agent. The branch restriction (`copilot/` prefix or the existing PR branch only) and the mandatory human merge are things no local IDE agent can offer.

**Honest limitations.** Asynchronous only — no local interactive loop for the cloud agent. Ephemeral environment means setup cost per task. Firewall/Windows incompatibility. The Preview status of agent-scoped hooks. Naming churn ("coding agent" → "cloud agent", "premium requests" → "AI credits") makes older material misleading.

---

### 4. Windsurf → Devin Desktop (Cognition)

**Identity & interaction model.** The former Windsurf IDE, rebranded 2026-06-02, with an **Agent Command Center** as the default surface for managing local and cloud agents, PRs and context in one place, and **Spaces** so related agents share context ([Introducing Devin Desktop, 2026-06-02](https://cognition.com/blog/introducing-devin-desktop)). The classic Windsurf IDE view remains accessible ([Devin Desktop FAQ, 2026-08-25](https://docs.devin.ai/desktop/devin-desktop-faq)).

**How you get it.** Automatic update from Windsurf on 2026-06-02; "Nothing is getting removed" and "all your existing work and progress will remain intact." Settings migrate automatically ([Devin Desktop FAQ, 2026-08-25](https://docs.devin.ai/desktop/devin-desktop-faq)).

**Pricing.** "Your current plan continues to work exactly as it does today. Pricing is unchanged," including legacy Enterprise customers ([Devin Desktop FAQ, 2026-08-25](https://docs.devin.ai/desktop/devin-desktop-faq)). **Specific tier prices could not be confirmed** — `windsurf.com/pricing` 308-redirects to `devin.ai/pricing`, which returned HTTP 429 on every attempt on 2026-08-25. `[LINK-UNVERIFIED: devin.ai/pricing — HTTP 429 Too Many Requests, four attempts.]`

**Model support.** Not verified on this pass. Cognition ships its own SWE-family models `[UNVERIFIED — from search-result context, not fetched vendor docs]`. Devin Local docs describe capabilities, not model lists ([Devin Local Agent, 2026-08-25](https://docs.devin.ai/desktop/devin-local)).

**Extension mechanisms.**
- *Rules* — dual-format, and the precedence matters. Project-level, loaded at session start: `AGENTS.md` (preferred), `AGENTS.local.md` (personal, gitignore it), `AGENT.md`, `.devin/rules/*.md`, `.devin/global_rules.md`, plus legacy formats from other tools. Global: `~/.config/devin/AGENTS.md` (Linux/macOS), `%APPDATA%\devin\AGENTS.md` (Windows), or `~/.devin/rules/*.md` / `~/.devin/global_rules.md` ([Rules & AGENTS.md, 2026-08-25](https://docs.devin.ai/cli/extensibility/rules)). In Devin Desktop specifically: workspace rules at `.devin/rules/*.md` or `.windsurf/rules/*.md`; global at `~/.codeium/windsurf/memories/global_rules.md`; system/Enterprise at OS paths like `/etc/devin/rules/` ([Cascade Memories, 2026-08-25](https://docs.devin.ai/desktop/cascade/memories)).
- *Backward compatibility, verbatim* — "Devin Desktop continues to read all of your existing Windsurf rules, and adds support for the new `.devin/` equivalents." ([Devin Desktop FAQ, 2026-08-25](https://docs.devin.ai/desktop/devin-desktop-faq)). `.devin/rules/` is preferred and takes precedence; `.windsurf/rules/` is the fallback. `.cursor/rules` (`.mdc`) can be **imported** into `.devin/rules/`.
- *AGENTS.md* — **Yes, and it is the recommended path**: "AGENTS.md is the recommended approach for project rules. It's easy to read, version-controlled, and works across multiple AI tools." Root `AGENTS.md` is treated as an always-on rule; subdirectory `AGENTS.md` becomes a glob rule with an auto-generated pattern scoped to that directory ([Rules & AGENTS.md, 2026-08-25](https://docs.devin.ai/cli/extensibility/rules)).
- *Activation modes* — frontmatter triggers `always_on`, `glob`, `manual`, `model_decision` ([Rules & AGENTS.md, 2026-08-25](https://docs.devin.ai/cli/extensibility/rules); [Cascade Memories, 2026-08-25](https://docs.devin.ai/desktop/cascade/memories)).
- *Memories* — auto-generated by Cascade, stored in `~/.codeium/windsurf/memories/`, workspace-scoped: "Memories generated in one workspace are not available in another, and they are not committed to your repository." **Critical, and the thing most course material gets wrong: "Memories apply to the legacy Cascade agent only. The Devin Local agent does not persist memories."** The docs now steer you to Rules or AGENTS.md for durable knowledge ([Cascade Memories, 2026-08-25](https://docs.devin.ai/desktop/cascade/memories)).
- *Workflows* — markdown files in `.windsurf/workflows/`, discovered from the workspace, sub-directories, and parent directories up to the git root `[LINK-UNVERIFIED: from Devin-domain search results citing docs.devin.ai/desktop/cascade/workflows; page not fetched directly.]`
- *Skills* — supported, and explicitly preferred over rules: "To improve coding ability, speed of completion, and lower cost, use Skills instead whenever possible… Long, verbose rules dilute the agent's attention." ([Rules & AGENTS.md, 2026-08-25](https://docs.devin.ai/cli/extensibility/rules))
- *Subagents* — Devin Local supports "independent subagents handling parallel tasks" plus a dedicated Quick Review subagent ([Devin Local Agent, 2026-08-25](https://docs.devin.ai/desktop/devin-local)).
- *MCP* — supported; "The default configuration prompts for approval before calling any MCP tool," with enterprise default-allow available for trusted integrations ([Devin Local Agent, 2026-08-25](https://docs.devin.ai/desktop/devin-local)).
- *ACP* — Devin Desktop launched "with support for the Agent Client Protocol (ACP)… Any ACP-compatible agent can run inside Devin Desktop alongside Devin" ([Introducing Devin Desktop, 2026-06-02](https://cognition.com/blog/introducing-devin-desktop)).

**Permissions / approval.** Devin Local replaced coarse auto-execution levels with "a more fine-grained permissions system to control which actions the agent can take" using **Deny / Ask / Allow** rules. On an approval prompt you can edit the command, use keyboard shortcuts, or grant session-wide permission. It also provides "OS-level sandboxing with filesystem isolation and network filtering" ([Devin Local Agent, 2026-08-25](https://docs.devin.ai/desktop/devin-local)).

**Headless / CI.** Devin CLI exists and shares the harness with Devin Local; specific headless flags not verified `[UNVERIFIED]`.

**Distinctive idea.** **ACP — the Agent Client Protocol.** An open protocol that decouples the agent from the editor, letting any compatible agent run in any compatible editor. If MCP standardised agent→tool, ACP is the attempt to standardise editor→agent. That is a conceptually important second axis for the module.

**Honest limitations.** Brand and product instability: acquired, renamed, agent replaced, memories feature deprecated for the new agent — all within about eight months. Rules paths are now a three-layer archaeology (`.windsurfrules` → `.windsurf/rules/` → `.devin/rules/` → `AGENTS.md`). Public pricing was unreachable on 2026-08-25.

---

## Pricing table

> ⚠️ **THIS TABLE AGES IN WEEKS, NOT MONTHS.** Every figure below was read from the vendor's own page on **2026-08-25**. Three of these four vendors changed pricing structure, plan names, or billing units within the preceding 12 months. Do not reprint these numbers in course material without re-checking, and put the read-date next to them wherever they appear.

| Product | Free tier | Entry paid | Mid | Top individual | Team | Billing unit |
|---|---|---|---|---|---|---|
| **Kiro** | $0, 50 credits, open-weight + Claude Sonnet 4.5 | Pro **$20**/user/mo, 1,000 credits | Pro+ **$40**/user/mo, 2,000 credits | Pro Max **$100**/mo (5,000) · Power **$200**/mo (10,000) | Enterprise, custom via AWS | Credits; add-on **$0.04/credit** |
| **Cursor** | Hobby, free | Pro **$20**/mo | Pro Plus **$60**/mo | Ultra **$200**/mo | Standard **$40**/user/mo · Premium **$120**/user/mo | Agent request limits; unlimited tab on paid |
| **GitHub Copilot** | Copilot Free ($0, **no cloud agent**) | Pro **$10**/mo, 1,500 credits | Pro+ **$39**/mo, 7,000 credits | Max **$100**/mo, 20,000 credits | Business **$19**/seat · Enterprise **$39**/seat | **AI credits** (base + flex) |
| **Windsurf / Devin Desktop** | `[UNVERIFIED]` | `[UNVERIFIED]` | `[UNVERIFIED]` | `[UNVERIFIED]` | `[UNVERIFIED]` | Vendor states "Pricing is unchanged" post-rename |

Sources: [Kiro pricing](https://kiro.dev/pricing/) · [Cursor pricing docs](https://cursor.com/docs/account/pricing) · [Copilot plans](https://docs.github.com/en/copilot/get-started/plans) · Devin: [FAQ](https://docs.devin.ai/desktop/devin-desktop-faq) only — `devin.ai/pricing` returned HTTP 429.

**Cheapest way into a real agentic loop as of 2026-08-25: GitHub Copilot Pro at $10/month, which includes the cloud agent.** That is a useful fact for a course whose readers must pay out of pocket.

---

## Rules/instruction file comparison

*The highest-value table in this dossier for a reader who works across tools.*

| Product | Primary rules path | Format | Scoping mechanism | Honours AGENTS.md? |
|---|---|---|---|---|
| **Kiro** | `.kiro/steering/` (ws) · `~/.kiro/steering/` (global) | Markdown + YAML frontmatter; auto-generated `product.md`, `tech.md`, `structure.md` | `inclusion: always` \| `fileMatch` + `fileMatchPattern` \| `manual` (`#file-name`) \| `auto` + `name`/`description` | **Yes** — workspace root, subdirs, or `~/.kiro/steering/`. No inclusion modes: **always included** |
| **Cursor** | `.cursor/rules/*.mdc` | MDC (markdown + frontmatter). Plain `.md` here is **ignored** except `AGENTS.md` | `alwaysApply: true` \| `description` (agent-selected) \| `globs` \| manual @-mention. Nested rules dirs; User Rules; Team Rules from dashboard | **Yes** — documented lightweight alternative; nested `AGENTS.md` supported |
| **GitHub Copilot** | `.github/copilot-instructions.md` (repo-wide) · `.github/instructions/NAME.instructions.md` (scoped) | Markdown; scoped files need `applyTo:` glob frontmatter | `applyTo` globs, comma-separated; `excludeAgent: "code-review"` / `"cloud-agent"`; VS Code `chat.instructionsFilesLocations` | **Yes** — anywhere in repo, nearest-wins. **Also reads `CLAUDE.md` and `GEMINI.md`** |
| **Windsurf / Devin Desktop** | `AGENTS.md` (**recommended**) · `.devin/rules/*.md` (preferred dir) · `.windsurf/rules/*.md` (fallback) | Markdown + frontmatter | `always_on` \| `glob` \| `manual` \| `model_decision`. Root AGENTS.md = always-on; subdir AGENTS.md = auto-generated glob for that dir | **Yes, and it is the vendor's recommendation.** Can also **import** `.cursor/rules/*.mdc` |

**The convergence story, in one line for the module:** all four honour `AGENTS.md`; Copilot additionally reads `CLAUDE.md` and `GEMINI.md`; Devin Desktop can import Cursor's `.mdc` rules. In 2025 each tool had a proprietary rules file. In 2026 they are all converging on one plain-markdown file at repo root, with proprietary formats surviving only where they add scoping expressiveness that `AGENTS.md` lacks.

---

## Extension-mechanism matrix

Empty cells mean **not verified on 2026-08-25**, not "does not exist."

| Product | Rules file | Commands | Agents / subagents | Hooks | MCP | Plugins / packages |
|---|---|---|---|---|---|---|
| **Kiro** | `.kiro/steering/*.md` + `AGENTS.md` | — (skills invoked contextually) | `.kiro/agents/<name>.{json,md}`, `~/.kiro/agents/` | `.kiro/hooks/*.json`; 10 triggers incl. `PreToolUse`, `UserPromptSubmit`, `PreTaskExec` (blocking) | `.kiro/settings/mcp.json`, `~/.kiro/settings/mcp.json` | **Powers** — `plugin.json` + `skills/` + `mcp.json`; Agent Plugins spec. Skills: `.kiro/skills/*/SKILL.md` |
| **Cursor** | `.cursor/rules/*.mdc` + `AGENTS.md` | `.cursor/commands/<name>.md` `[probable — see note]` | Subagents exist (`subagentStart`/`subagentStop` hooks); path unverified | `.cursor/hooks.json`, `~/.cursor/hooks.json`, enterprise OS paths; ~20 events | `.cursor/mcp.json`, `~/.cursor/mcp.json` | Skills: `.cursor/skills/*/SKILL.md`, `.agents/skills/`, `~/.cursor/skills/` |
| **GitHub Copilot** | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` | Prompt files `*.prompt.md` `[UNVERIFIED path]` | `.github/agents/*.agent.md`, `.claude/agents/`, `~/.copilot/agents`; `agents:` + `handoffs:` frontmatter | `hooks:` frontmatter on custom agents (**Preview**) | Cloud agent: per-repo config; **GitHub + Playwright MCP servers on by default** | VS Code extensions (out of scope) |
| **Windsurf / Devin Desktop** | `AGENTS.md`, `AGENTS.local.md`, `AGENT.md`, `.devin/rules/*.md`, `.devin/global_rules.md`, `.windsurf/rules/*.md` | Workflows: `.windsurf/workflows/*.md` `[LINK-UNVERIFIED]` | Devin Local independent subagents + Quick Review subagent; path unverified | — | Supported; **approval-prompted by default** | Skills (vendor-preferred over rules); **ACP** for third-party agents |

---

## Kiro's spec-driven model

**It verifies, and it is the one genuinely different mental model in this landscape.** Everything else here is "chat with an agent that edits your repo." Kiro is "produce a reviewable design artifact, then execute it."

**Definition, verbatim:** specs are "structured artifacts that formalize the development process for features and bug fixes in your application" ([Kiro Specs, 2026-08-25](https://kiro.dev/docs/specs/)).

**The three files, every time:**
1. **`requirements.md`** (or **`bugfix.md`**) — "Captures user stories, acceptance criteria, or bug analysis in structured notation"
2. **`design.md`** — "Documents technical architecture, sequence diagrams, and implementation considerations"
3. **`tasks.md`** — "Provides a detailed implementation plan with discrete, trackable tasks"

**The three phases:** Requirements/Bug Analysis → Design ("Create technical architecture and implementation approach in `design.md`") → Tasks ("Generate discrete, executable implementation tasks in `tasks.md`").

**Two spec types:** Feature Specs (new capabilities) and Bugfix Specs (for "systematically diagnosing and fixing bugs with surgical precision").

**Why this matters pedagogically — four points, in teaching order:**

1. **It externalises the plan as reviewable, version-controlled markdown.** Cursor's Plan Mode does something similar but defaults to saving plans in your *home directory*, requiring an explicit "Save to workspace" to share them ([Plan mode, 2026-08-25](https://cursor.com/docs/agent/modes)). Kiro's specs live in the repo by default. That default is the whole difference between "a plan I saw once" and "a plan the team reviewed."
2. **It splits *what* from *how* from *when*, with a human gate between each.** This is the classic requirements/design/implementation separation — the interesting claim is that agentic coding rediscovered it because context windows and review bandwidth force it, not because a methodology mandated it.
3. **It composes with the rest of Kiro's machinery.** `PreTaskExec` and `PostTaskExec` hooks fire around spec tasks specifically ([Hooks, 2026-08-25](https://kiro.dev/docs/hooks/)), so you can gate each task on tests passing. Steering files supply the standing context the spec is written against.
4. **Steering is the complement to specs.** Specs are per-feature and ephemeral; steering (`product.md` / `tech.md` / `structure.md`) is durable project knowledge, "included in every interaction by default" ([Steering, 2026-08-25](https://kiro.dev/docs/steering/)). Specs answer "what are we building now"; steering answers "what is always true here." Teaching that split is more durable than teaching either tool.

**Honest caveat for students:** spec-driven workflow is overhead. It pays for multi-file features with real ambiguity and costs more than it returns on a two-line fix. Teach it as a mode you select, not a mode you live in — the same judgement call Cursor makes explicitly when its docs say that for "routine modifications or familiar tasks, using Agent mode directly is acceptable."

---

## What to teach vs what to skip

For a ~300-line module. This landscape rots fast; optimise for what survives.

### Teach (roughly 200 lines)

1. **The four-quadrant framing, ~25 lines.** Local-interactive (Cursor, Devin Desktop, Kiro IDE) vs remote-asynchronous (Copilot cloud agent, Kiro CLI headless). Where approval happens differs fundamentally between the two, and that's the axis that will still be true in two years.
2. **The AGENTS.md convergence, ~35 lines.** Use the rules comparison table verbatim. Lead with the killer fact: **GitHub Copilot reads `CLAUDE.md` and `GEMINI.md`**, and Devin Desktop imports `.cursor/rules`. Then the practical takeaway — write `AGENTS.md` first, add proprietary formats only when you need scoping the plain file can't express.
3. **Kiro's spec-driven model, ~50 lines.** The most conceptually distinct idea available. Show the three files, the three phases, and the specs-vs-steering split. Then contrast with Cursor Plan Mode to show it's a spectrum, not a binary.
4. **Permission models compared, ~45 lines.** This is the safety spine of the whole course, and the four products differ instructively:
   - Kiro: declarative deny/ask/allow with **deny-overrides**, config stored **outside the repo** so a cloned repo can't inject trust.
   - Cursor: three run modes, with the vendor's own disclaimer worth quoting — *"Auto-review is not a security boundary. The classifier can make mistakes."*
   - Copilot: enforced by the **forge**, not the agent — can't push to `main`, can't approve its own PR, workflows need write-access approval.
   - Devin Local: Deny/Ask/Allow plus OS-level sandboxing; MCP tools prompt by default.
   The lesson: an agent's own approval prompt is the *weakest* of these; platform-enforced constraints are the strongest.
5. **Extension mechanisms mapped to Module 10's framework, ~30 lines.** Use the matrix. Point out that all four now have rules + MCP, three have hooks, and every vendor is converging on `SKILL.md`.
6. **ACP, ~15 lines.** One paragraph. MCP standardised agent→tool; ACP is the bid to standardise editor→agent. Cheap to teach, high conceptual payoff.

### Skip

- **Benchmark and "which is best" comparisons.** They are stale on publication and invite exactly the listicle sourcing this research avoided.
- **Exact credit allowances and per-plan limits.** Print the price and the read-date; link the pricing page for the rest.
- **Cursor's full ~20-event hook list.** Show three representative events and link out.
- **Kiro's mobile app, web app, and Crew.** Too new, too likely to change.
- **The Windsurf ownership saga in narrative detail.** One sentence — "Windsurf, acquired by Cognition, became Devin Desktop on 2026-06-02" — plus a link. Resist the drama.
- **`.cursorrules`.** Legacy. Mention only as a one-line "if you see this in an old repo, it's the deprecated form."
- **Model lists.** They change monthly and teach nothing durable.

### The framing sentence for the module

Every product here has converged on the same four primitives — a markdown rules file, MCP for tools, some form of skill/command package, and an approval model. What still genuinely differs is **where the plan lives** (Kiro: in the repo, by default) and **who enforces the permissions** (Copilot: the forge, not the agent). Teach those two differences; treat the rest as implementation detail.

---

## References for the module

1. [Kiro Specs](https://kiro.dev/docs/specs/) — the three-file, three-phase spec-driven workflow.
2. [Kiro Steering](https://kiro.dev/docs/steering/) — `.kiro/steering/`, inclusion modes, AGENTS.md support.
3. [Kiro Permissions](https://kiro.dev/docs/permissions/) — deny-overrides, Autopilot vs Supervised, out-of-repo config.
4. [Kiro Hooks](https://kiro.dev/docs/hooks/) — 10 triggers including blocking `PreToolUse` and `PreTaskExec`.
5. [Kiro pricing](https://kiro.dev/pricing/) — read 2026-08-25.
6. [Cursor Rules](https://cursor.com/docs/context/rules) — `.cursor/rules/*.mdc`, four application modes, AGENTS.md.
7. [Cursor Run modes](https://cursor.com/docs/agent/security/run-modes) — including "Auto-review is not a security boundary."
8. [Cursor Plan mode](https://cursor.com/docs/agent/modes) — the plan-as-artifact contrast with Kiro specs.
9. [Cursor pricing docs](https://cursor.com/docs/account/pricing) — the reliable price source, not the marketing page.
10. [Copilot custom instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) — `applyTo`, AGENTS.md, CLAUDE.md, GEMINI.md.
11. [About Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent) — what it is, plan availability, default MCP servers.
12. [Copilot cloud agent risks and mitigations](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations) — the forge-level guardrails.
13. [Copilot plans](https://docs.github.com/en/copilot/get-started/plans) — prices and AI credits, read 2026-08-25.
14. [VS Code custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents) — `.agent.md`, handoffs, subagents.
15. [Devin Desktop FAQ](https://docs.devin.ai/desktop/devin-desktop-faq) — the Windsurf rename, in the vendor's own words.
16. [Devin Rules & AGENTS.md](https://docs.devin.ai/cli/extensibility/rules) — full precedence list and "use Skills instead whenever possible."
17. [Introducing Devin Desktop, 2026-06-02](https://cognition.com/blog/introducing-devin-desktop) — the rename announcement and ACP.

---

## Link Verification Log

All checks performed **2026-08-25**. "OK" = fetched successfully AND the page contained the claim attributed to it.

| URL | Result | Claim it supports |
|---|---|---|
| https://kiro.dev/docs/ | OK | Kiro identity; unified agent across IDE/CLI/web/mobile; doc section list |
| https://kiro.dev/faq/ | OK | "an agentic AI with an IDE, CLI, web interface, mobile app, and Kiro Crew"; AWS delivery |
| https://kiro.dev/docs/getting-started/installation/ | OK | Install surfaces, platforms, sign-in methods |
| https://kiro.dev/docs/specs/ | OK | requirements.md / design.md / tasks.md; three phases; feature vs bugfix specs |
| https://kiro.dev/docs/steering/ | OK | `.kiro/steering/`, `~/.kiro/steering/`, product/tech/structure.md, four inclusion modes |
| https://kiro.dev/docs/steering/?trk=… | OK | AGENTS.md verbatim support statement (re-fetch to bypass cache) |
| https://kiro.dev/docs/hooks/ | OK | `.kiro/hooks/*.json`, 10 triggers, agent-only file triggers |
| https://kiro.dev/docs/permissions/ | OK | Autopilot/Supervised, deny-overrides, permissions.yaml paths, hardcoded blocks |
| https://kiro.dev/docs/custom-agents/ | OK | `.kiro/agents/` paths, config fields, web/mobile limitation |
| https://kiro.dev/docs/skills/ | OK | `.kiro/skills/*/SKILL.md`, frontmatter requirements |
| https://kiro.dev/docs/powers/ | OK | plugin.json manifest, Agent Plugins spec, legacy POWER.md |
| https://kiro.dev/docs/mcp/ | OK (partial) | MCP scopes and mcpServers format; paths not on this page |
| https://kiro.dev/docs/mcp/configuration/ | OK | `.kiro/settings/mcp.json`, `~/.kiro/settings/mcp.json`, merge precedence |
| https://kiro.dev/docs/models/ | OK | Model list; "Auto" routing; no BYOK mention |
| https://kiro.dev/docs/cli/ | OK (partial) | Headless mode exists; ACP; flags deferred to sub-page |
| https://kiro.dev/docs/cli/headless/ | OK | `--no-interactive`, `--trust-all-tools`, `--trust-tools`, `KIRO_API_KEY`, paid-tier gate |
| https://kiro.dev/pricing/ | OK | All six Kiro tiers with prices and credits |
| https://kiro.dev/blog/introducing-kiro-cli/ | OK | "An Amazon company" footer; post dated 2025-11-17 |
| https://kiro.dev/docs/getting-started/first-project/ | OK (negative) | Does NOT contain a vibe-vs-spec comparison; specs described as three phases |
| https://docs.cursor.com/context/rules | **308 → cursor.com/docs** | Doc host migration (course links to docs.cursor.com will bounce) |
| https://cursor.com/docs/context/rules | OK | `.cursor/rules` `.mdc`; four modes; AGENTS.md exception for plain .md; team/user rules |
| https://cursor.com/docs/agent/modes | OK | Plan Mode, Shift+Tab, plans save to home dir by default |
| https://cursor.com/docs/agent/hooks | OK | hooks.json paths (project/user/enterprise), precedence, full event list |
| https://cursor.com/docs/agent/security/run-modes | OK | Auto-review / Allowlist / Run Everything; permissions.json + sandbox.json; "not a security boundary" |
| https://cursor.com/docs/context/mcp | OK | `.cursor/mcp.json`, `~/.cursor/mcp.json`, stdio and remote formats |
| https://cursor.com/docs/cli/overview | OK | Install commands; print mode `-p`, `--model`, `--output-format` for CI |
| https://cursor.com/docs/models | OK | Provider list, Cursor Models pool, passing BYOK reference |
| https://cursor.com/docs/account/pricing | OK | Pro $20 / Pro Plus $60 / Ultra $200 / Standard $40 / Premium $120 / Start ₹649 |
| https://cursor.com/pricing | OK but **misleading** | Renders Pro+/Ultra under a shared "$20/mo" heading; do not cite for price |
| https://cursor.com/docs/context/commands | OK but **off-topic** | Returns Skills content: `.cursor/skills/*/SKILL.md`, invocation, migration note about slash commands |
| https://cursor.com/docs/cli/reference/slash-commands | OK (negative) | Built-in CLI slash commands only; no `.cursor/commands` path |
| https://cursor.com/docs/customize-cursor | OK (partial) | Confirms rules/skills/commands/subagents/hooks/MCP as primitives; paths only for AGENTS.md and SKILL.md |
| https://cursor.com/docs/agent/chat/overview | **404** | — |
| https://cursor.com/docs/configuration/security | **404** | — |
| https://cursor.com/help/customization/commands | **404** | — |
| https://cursor.com/docs/agent/security/run-modes.md | **404** | (the non-`.md` URL works) |
| https://cursor.com/docs/customize-cursor.md | **404** | (the non-`.md` URL works) |
| https://cursor.com/docs/agent/terminal | OK (negative) | Terminal/sandbox page; no allowlist details — points to run-modes |
| https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent | OK | "Copilot cloud agent"; all paid plans; ephemeral env; GitHub + Playwright MCP default-on |
| https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions | OK | `.github/copilot-instructions.md`; `.github/instructions/NAME.instructions.md`; `applyTo`; `excludeAgent`; AGENTS.md/CLAUDE.md/GEMINI.md |
| https://docs.github.com/en/copilot/get-started/plans | OK | Free/Student/Pro $10/Pro+ $39/Max $100/Business $19/Enterprise $39; AI credit table; agent excluded from Free |
| https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment | OK | `.github/workflows/copilot-setup-steps.yml`; single job; default-branch requirement; firewall/Windows note |
| https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations | OK | No `git push`; cannot mark ready/approve/merge; human merge required; workflow approval; firewall |
| https://docs.github.com/en/copilot/concepts/agents/coding-agent/agent-permissions | **404** | — (content found via risks-and-mitigations instead) |
| https://code.visualstudio.com/docs/copilot/customization/custom-instructions | OK | AGENTS.md/CLAUDE.md paths; `*.instructions.md` locations; `chat.*` settings keys |
| https://code.visualstudio.com/docs/copilot/customization/custom-agents | OK | `.agent.md` in `.github/agents`, `.claude/agents`, `~/.copilot/agents`; frontmatter incl. `handoffs`, `agents`, `hooks` (Preview) |
| https://cognition.ai/blog/devin-desktop | **301 → cognition.com** | Domain migration cognition.ai → cognition.com |
| https://cognition.com/blog/devin-desktop | **404** | — (correct slug is `introducing-devin-desktop`) |
| https://cognition.com/blog/introducing-devin-desktop | OK | Dated 06.02.26; "IDE foundation of Windsurf"; backwards-compatible; ACP support |
| https://docs.devin.ai/desktop/devin-desktop-faq | OK | "Devin Desktop is the new name for Windsurf"; Cascade through July; "Pricing is unchanged"; `.devin/` rules |
| https://docs.devin.ai/cli/extensibility/rules | OK | Full rules precedence list; AGENTS.md recommended; four activation modes; "use Skills instead" |
| https://docs.devin.ai/desktop/cascade/memories | OK | `~/.codeium/windsurf/memories/`; workspace-scoped; **"Devin Local agent does not persist memories"** |
| https://docs.devin.ai/desktop/devin-local | OK | Same harness as Devin CLI; Deny/Ask/Allow; OS sandboxing; subagents; MCP approval default |
| https://docs.devin.ai/desktop/pricing | **404** | — |
| https://windsurf.com/pricing | **308 → devin.ai/pricing** | Corroborates the rebrand at routing level |
| https://devin.ai/pricing | **429 ×4** | Windsurf/Devin pricing UNVERIFIED |
| https://aws.amazon.com/kiro/ | **404** | — (Kiro/Amazon link established via kiro.dev footer instead) |
| https://cognition.com/blog/windsurf | not fetched | Acquisition — title only, from site-restricted search |
| https://docs.devin.ai/desktop/cascade/workflows | not fetched | `.windsurf/workflows/` — from search results only |

---

## Open questions / [UNVERIFIED]

1. **Windsurf / Devin Desktop pricing.** `devin.ai/pricing` returned HTTP 429 on four attempts across the session. The only verified statement is the FAQ's "Pricing is unchanged." **Action: re-fetch `https://devin.ai/pricing` before the module ships.** Do not print any Windsurf price until then.
2. **Cursor custom commands path.** `.cursor/commands/<command>.md` is *probable* — it appears in Cursor-domain search results attributed to `cursor.com/docs/customize-cursor` — but two direct fetches of the relevant pages returned Skills content instead and did not restate it. Cursor also appears to be migrating commands into Skills. **Action: verify or omit; do not print the path unverified.**
3. **Cursor subagents** — confirmed to exist via `subagentStart`/`subagentStop` hooks and the "Task tool", but the definition file path and format were not located.
4. **Kiro BYOK** — not mentioned anywhere in the Models docs. Absence of evidence. `[UNVERIFIED]`
5. **Copilot BYOK in VS Code** — not checked this pass. `[UNVERIFIED]`
6. **Devin Desktop model support** — no vendor page enumerating models was fetched. Cognition's own SWE-family models are referenced only in third-party search context. `[UNVERIFIED]`
7. **Devin CLI headless flags** — the CLI exists and shares the Devin Local harness, but flag syntax was not verified. `[UNVERIFIED]`
8. **Devin Desktop workflows** — `.windsurf/workflows/*.md` came from search results, not a fetched page. `[LINK-UNVERIFIED]`
9. **Cognition's Windsurf acquisition post** (`cognition.com/blog/windsurf`) — title surfaced but body not fetched. The acquisition is corroborated by two fetched primary sources, so this is low-risk, but cite one of those instead.
10. **Copilot prompt files** (`*.prompt.md`) — referenced in the VS Code customization ecosystem but the exact path/format was not verified this pass. `[UNVERIFIED]`
11. **Cascade end-of-life date.** The FAQ says "remains available through July" without a year; context implies July 2026, i.e. already past as of 2026-08-25. **Treat Cascade as retired** but confirm before asserting it.

---

## RESUME NOTES

**Status: COMPLETE.** All ten required output sections are written. Both Kiro and Windsurf status verifications succeeded, and both produced significant corrections to the assumed picture.

**Done:** Kiro (full — identity, AWS ownership, specs, steering, hooks, permissions, custom agents, skills, powers, MCP, models, pricing, headless CLI, AGENTS.md); Cursor (full except commands path — rules, plan mode, hooks, run modes, MCP, skills, CLI headless, models, pricing, AGENTS.md); GitHub Copilot (full — cloud agent, instructions files, custom agents, MCP, environment setup, permissions, pricing, AGENTS.md/CLAUDE.md/GEMINI.md); Windsurf → Devin Desktop (full except pricing and models — rename verified, rules precedence, memories deprecation, permissions, subagents, MCP, ACP, AGENTS.md).

**Partial:** Cursor custom commands path (item 2 above). Windsurf/Devin pricing (item 1 above).

**Not started:** nothing in scope.

**Dead URLs found (do not link from the module):** `cursor.com/docs/agent/chat/overview`, `cursor.com/docs/configuration/security`, `cursor.com/help/customization/commands`, `cognition.com/blog/devin-desktop`, `docs.devin.ai/desktop/pricing`, `aws.amazon.com/kiro/`, `docs.github.com/en/copilot/concepts/agents/coding-agent/agent-permissions`. Redirects to be aware of: `docs.cursor.com/*` → `cursor.com/docs`, `cognition.ai` → `cognition.com`, `windsurf.com/pricing` → `devin.ai/pricing`.

**Ordered next actions if resumed:**
1. Re-fetch `https://devin.ai/pricing` (429-throttled) and fill the Windsurf row of the pricing table.
2. Resolve the Cursor `.cursor/commands/` path — try `cursor.com/docs` navigation or the 1.6 changelog at `cursor.com/changelog/1-6`.
3. Confirm the Cascade retirement year in the Devin FAQ.
4. Optionally verify Cursor subagent file format and Copilot prompt-file paths.
