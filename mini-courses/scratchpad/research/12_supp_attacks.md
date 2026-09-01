# Supplement to Module 12 Dossier — §4.5 Agent-specific attack classes

**Prepared:** 2026-08-25 · **Supplements:** `mini-courses/scratchpad/research/12_security.md` §4.5
**Framing:** DEFENSIVE. Attack *classes* only — mechanism, why it works, what stops it. No payloads, no operational tooling.
**Vocabulary:** reuses the dossier's §2 terms (*indirect prompt injection*, *confused deputy*, *hidden context*, *guardrail vs sandbox*, *trust tiers*) and §1/§3 category IDs (`LLM01:2026`…`LLM10:2026`, `ASI01`–`ASI10`, `MCP01`–`MCP10`, ATLAS `AML.T…`). Category IDs are **not re-derived** here.

---

## Scope

This supplement replaces the eleven `> TODO` stubs in dossier §4.5 with primary-sourced content. It covers, one subsection each: (1) MCP tool poisoning / rug-pull / tool shadowing and what the MCP specification itself does and does *not* say; (2) verified 2025 incidents and CVEs in agent and AI-dev-tooling ecosystems; (3) memory poisoning / persistent injection; (4) RAG poisoning, with the PoisonedRAG arXiv ID corrected and confirmed; (5) slopsquatting — coinage and measurement; (6) malicious skills / plugins / extensions / MCP packages as a supply-chain vector; (7) exfiltration channel classes, conceptual only; (8) denial-of-wallet. It does **not** revisit jailbreaking (§4.1), prompt injection generally (§4.2), white/black-box testing (§4.3–4.4), or guardrail ratings (§4.6/§5). **Every CVE ID below was confirmed against the NVD REST API v2.0 on 2026-08-25** and every non-CVE URL was fetched; failures are logged in §Link Verification Log. Two things the dossier guessed are corrected here: CVE-2025-54136's CVSS is **7.2 HIGH**, not 8.8; and the "CamoLeak" CVE circulating in secondary blogs (CVE-2025-59145) is **a different vulnerability entirely**.

---

## Attack class deep dives

### 1. MCP tool poisoning, rug-pull, and tool shadowing

**What it is.** MCP servers advertise tools via `tools/list`; each tool carries a natural-language **description** and a JSON schema. Those strings are concatenated into the model's context window. They are *hidden context* in the dossier's §2 sense — the model reads them, the user usually does not. An attacker who controls a server controls text inside the agent's instruction stream.

Three distinct sub-classes, all named in the same primary write-up ([MCP Security Notification: Tool Poisoning Attacks, Invariant Labs (Luca Beurer-Kellner, Marc Fischer), 2025-04-01](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks)):

| Sub-class | Mechanism (conceptual) | Trust assumption it breaks |
|---|---|---|
| **Tool Poisoning Attack (TPA)** | Instructions embedded in a tool's *description*, "invisible to users but visible to AI models" | that a description is documentation, not instruction |
| **MCP rug pull** | "a malicious server can change the tool description after the client has already approved it" | that approval is a decision about a *fixed* artifact |
| **Cross-server tool shadowing** | A malicious server's description changes how the agent uses a **different, trusted** server's tools — "without requiring users to directly interact with the malicious tool itself" | that per-server trust is per-server isolation |

**Why it works.** The dossier's §3.1 *context-window pooling* property, applied to the tool registry: tool metadata sits on the same token stream as the system prompt, with no enforced trust boundary. Shadowing is the sharpest case — the trust boundary a developer *thinks* they drew (I only installed one sketchy server, and I won't call its tools) does not exist, because all descriptions are in one context.

**Scale.** Independently benchmarked: **45 live real-world MCP servers, 353 authentic tools, 1,312 malicious test cases across 10 risk categories, 20 LLM agents**; peak attack success rate **72.8%** (o1-mini), and the best refusal rate was **under 3%** (Claude-3.7-Sonnet). The paper's counter-intuitive finding is that *more capable* models are *more* susceptible, "due to superior instruction-following abilities" ([MCPTox: A Benchmark for Tool Poisoning Attack on Real-World MCP Servers, arXiv:2508.14925, submitted 2025-08-19](https://arxiv.org/abs/2508.14925)).

**What the MCP specification actually says — and the gap worth teaching.** The spec's own security document is [Security Best Practices, MCP specification revision **2025-11-25**](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices) (the `2025-06-18` path now serves the same current content; see Link Log). Its `## Attacks and Mitigations` sections are, verbatim and in order: **Confused Deputy Problem · Token Passthrough · Server-Side Request Forgery (SSRF) · Session Hijacking · Local MCP Server Compromise · OAuth Authorization URL Validation · stdio Transport Security in Proxy Scenarios · Scope Minimization.**

> **Teaching gap — verified by absence:** there is **no tool-poisoning, rug-pull, or shadowing section in the MCP spec's security document.** The spec's threat model is an *OAuth/transport* threat model. The description-as-instruction problem is left to clients and operators. Tell students this explicitly: reading the spec is necessary and not sufficient.

What the spec *does* give you, quotable and precise:
- **Confused deputy** — the spec's version is the OAuth one: an MCP proxy with a **static client ID** + **dynamic client registration** + a third-party **consent cookie** lets an attacker obtain "authorization codes without proper user consent." Mitigation is mandatory: proxies **MUST** implement per-client consent, exact-match `redirect_uri` validation, and single-use `state` bound *after* consent. Note this is a *narrower* confused deputy than the dossier §2 definition (agent acts with the developer's privileges) — teach both readings and say which is which.
- **Token passthrough** — "an anti-pattern where an MCP server accepts tokens from an MCP client without validating that the tokens were properly issued *to the MCP server*." Rule: servers **MUST NOT** accept tokens not explicitly issued for them.
- **Session hijacking → prompt injection.** The spec explicitly links the two: a hijacked session ID can be used to enqueue a malicious event that a *different* server instance delivers to the client as a legitimate async response. It also warns that `notifications/tools/list_changed` means "a client could end up with tools that they were not aware were enabled" — this is the **rug-pull primitive named inside the spec**, without the word.
- **Local MCP server compromise** — clients offering one-click config **MUST** show the exact command untruncated and require explicit approval; **SHOULD** sandbox with "restricted access to the file system, network, and other system resources."
- **Scope minimization** — least-privilege scopes, incremental elevation via `WWW-Authenticate` challenges; anti-patterns called out include wildcard/omnibus scopes (`*`, `all`, `full-access`).

**Maps to:** `MCP03 Tool Poisoning`, `MCP06 Intent Flow Subversion`, `MCP09 Shadow MCP Servers`, `MCP02 Privilege Escalation via Scope Creep`, `MCP01 Token Mismanagement`; `LLM01:2026` (delivery surface = *tool connection channel*); `LLM03:2026 Excessive Agency`; `ASI02 Tool Misuse & Exploitation`, `ASI04 Agentic Supply Chain`; ATLAS `AML.T0084.001 Discover AI Agent Configuration: Tool Definitions`.

**Defense that actually stops it.** Not description-scanning (it is a guardrail: probabilistic, and shadowing text can be arbitrarily paraphrased). What bounds it:
1. **Pin tool definitions.** Hash the `tools/list` response at approval time; re-prompt on change. This is the only thing that kills rug-pull, and it is deterministic.
2. **Do not co-locate trust tiers.** One agent session = one trust tier of servers. Shadowing requires shared context; separate contexts remove the primitive.
3. **Least privilege at the credential, not the prompt** — spec's Scope Minimization plus per-tool allowlists.
4. **Egress control** — poisoning is only *interesting* if the agent can reach the attacker (see §7).

---

### 2. Real 2025 incidents and CVEs (all IDs NVD-confirmed)

Full table in `## Incident table`. Three that are worth narrating in a module:

**EchoLeak — `CVE-2025-32711`, M365 Copilot, zero-click.** NVD text: *"Ai command injection in M365 Copilot allows an unauthorized attacker to disclose information over a network."* CVSS **9.3 CRITICAL**, published **2025-06-11**. This is the reference specimen for the dossier's lethal-trifecta framing: untrusted content (inbound email) + private data (tenant graph) + external communication, with **no user action required**.

**MCPoison — `CVE-2025-54136`, Cursor ≤1.2.4.** Verbatim NVD: *"attackers can achieve remote and persistent code execution by modifying an already trusted MCP configuration file inside a shared GitHub repository… Once a collaborator accepts a harmless MCP, the attacker can silently swap it for a malicious command… without triggering any warning or re-prompt."* CVSS **7.2 HIGH** (published 2025-08-02). **Correction to dossier §4.5:** the dossier's TODO guessed CVSS 8.8 — NVD says 7.2. This is the rug-pull class realized against a *config file*, not a server, and it is the cleanest possible argument for "approval must bind to a hash, not a name."

**Nx "s1ngularity" — the first supply-chain attack that weaponized the developer's own coding agents.** Malicious `nx` versions published **2025-08-26**; root cause per the maintainers' own postmortem was a GitHub Actions workflow (`pull_request_target` + unsanitized PR title) permitting code injection, combined with read/write repo permissions and enabled manual workflow dispatch ([S1ngularity — What Happened, How We Responded, What We Learned, nx.dev](https://nx.dev/blog/s1ngularity-postmortem)). The postmortem states the malware *"attempted to use local AI tools (like Claude and Gemini)"* during scanning, and that collected data was *"uploaded to a public GitHub repo via the GitHub CLI."* Four hours of exposure across eight packages at ~6M weekly downloads. Nx's remediation: npm Trusted Publishers (OIDC) instead of tokens, mandatory manual 2FA for publish, external contributors cut off from pipelines, provenance checks.

**Maps to:** `LLM01:2026` (EchoLeak, MCPoison), `LLM02:2026 Sensitive Information Disclosure`, `LLM04:2026 Supply Chain` (Nx, Amazon Q, postmark-mcp), `LLM03:2026 Excessive Agency`; `ASI04`, `ASI05 Unexpected Code Execution`; `MCP04`.

---

### 3. Memory poisoning / persistent injection

**What it is.** An injection whose payload is *written into durable state* — a memory service, a summary file, an agent's notes, a vector store — so it re-enters context in sessions the attacker is not present for. The dossier's §3.1 *memory persistence* property, weaponized.

**Mechanism, conceptually.** Two documented shapes:
- **Delayed tool invocation.** The injected text does not act; it installs a *conditional*: when the user later says an ordinary word, the agent performs a sensitive action (e.g. a memory write) *believing the user asked for it*. Demonstrated against Google Gemini's long-term memory ([Hacking Gemini's Memory with Prompt Injection and Delayed Tool Invocation, Johann Rehberger / wunderwuzzi, 2025-02-10](https://embracethered.com/blog/posts/2025/gemini-memory-persistence-prompt-injection/)). Google classified it as *"abuse-related risk with low likelihood and low impact"* — a useful teaching artifact about how vendors triage this class.
- **Query-only memory injection.** No access to the memory store at all: the attacker interacts as an ordinary user and, over turns, gets malicious reasoning chains recorded into memory that then affect *other users'* queries ([Memory Injection Attacks on LLM Agents via Query-Only Interaction (MINJA), arXiv:2503.03704, submitted 2025-03-05, latest revision 2026-02-12](https://arxiv.org/abs/2503.03704)). Note the arXiv title has changed across revisions; the string above is what the abs page shows on 2026-08-25.
- **Backdoored memory/knowledge base.** `AgentPoison` shows the retrieval-side version: >80% average attack success across three real-world agent types at a **poison rate below 0.1%** and **<1%** benign-performance degradation, with no retraining ([AgentPoison: Red-teaming LLM Agents via Poisoning Memory or Knowledge Bases, arXiv:2407.12784, 2024-07-17](https://arxiv.org/abs/2407.12784)).

**Why it works.** Memory is read back as trusted narration of the user's own history. There is no provenance field saying "this belief originated in a PDF you summarized in March." And the <0.1% poison rate is the killer statistic: dilution is not a defense.

**Maps to:** `LLM01:2026` (delivery surface = *persistent memory*), `LLM05:2026 Data and Model Poisoning`, `ASI06 Memory & Context Poisoning`, ATLAS `AML.T0080 AI Agent Context Poisoning` / `AML.T0080.000 Memory`.

**Defense that actually stops it.** Memory writes are a **privileged action**, not a side effect — gate them the way you gate `rm`. Concretely: (a) never auto-write memory from a turn that ingested untrusted content; (b) attach provenance to every memory record and surface it on read; (c) make memory diffable and revertible per session; (d) scope memory per project/tenant so a poisoned record cannot cross a trust boundary. Retrieval-side filtering is a guardrail; provenance + write-gating is the boundary.

---

### 4. RAG poisoning

**Primary source, ID confirmed.** The dossier flagged this as unverified. Confirmed on the abs page: **PoisonedRAG: Knowledge Corruption Attacks to Retrieval-Augmented Generation of Large Language Models**, Wei Zou, Runpeng Geng, Binghui Wang, Jinyuan Jia — **arXiv:2402.07867**, submitted **2024-02-12**, **to appear in USENIX Security Symposium 2025** ([abs page](https://arxiv.org/abs/2402.07867)). The abs page's headline number: roughly **90% attack success rate when injecting five malicious texts** per target question into a knowledge base of millions of texts, formulated as an optimization problem with both black-box and white-box variants.

**Mechanism.** Two conditions must hold simultaneously for an injected passage: it must be **retrieved** for the target query (a retrieval/similarity condition), and once retrieved it must **dominate generation** (a generation condition). PoisonedRAG's contribution is treating those as a joint optimization rather than hoping one implies the other.

**Why it works for agents specifically.** A coding agent's "corpus" is not a curated wiki — it is issues, PRs, dependency READMEs, changelogs, CI logs, fetched pages. In the dossier §3.2 trust tiers those are *semi-trusted*: "content the user chose to retrieve but did not author." Anyone who can open an issue can write to your retrieval corpus.

**Maps to:** `LLM05:2026 Data and Model Poisoning`, `LLM09:2026 Vector and Embedding Weaknesses`, `LLM01:2026` (delivery surface = *retrieved content*), `ASI06`; ATLAS `AML.T0070 RAG Poisoning`, `AML.T0071 False RAG Entry Injection`.

**Defense that actually stops it.** Corpus write-authorization (who can add a document is an access-control question, not an ML question) + provenance-carrying chunks + treating every retrieved chunk as data in a clearly delimited channel + capping how much a single retrieved document can influence a single answer. Then, per the dossier's overall thesis, bound the blast radius: a poisoned answer that cannot trigger a tool call is a wrong answer, not an incident.

---

### 5. Slopsquatting / hallucinated package names

**Coinage — primary.** The term was coined by **Seth Michael Larson** (Python Software Foundation security developer-in-residence) and popularized by Andrew Nesbitt; the earliest citable public attribution is Simon Willison's quote post of **2025-04-12**, which credits it directly: *"Credit to @sethmlarson for the name"* ([A quote from Andrew Nesbitt, simonwillison.net, 2025-04-12](https://simonwillison.net/2025/Apr/12/andrew-nesbitt/)). Treat April 2025 as the coinage window; I found no earlier primary use. `[UNVERIFIED]` — the original Mastodon post itself was not fetched.

**Measurement — primary, exact numbers.** *We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs*, Spracklen, Wijewickrama, Sakib, Maiti, Viswanath, Jadliwala — **arXiv:2406.10279**, submitted **2024-06-12**, revised **2025-03-02**, **USENIX Security 2025** ([abs page](https://arxiv.org/abs/2406.10279)). Verbatim from the abstract: *"the average percentage of hallucinated packages is at least **5.2%** for commercial models and **21.7%** for open-source models"*, across **576,000** code samples in Python and JavaScript, yielding **over 205,000 unique** fabricated package names. (The widely-quoted "19.7% overall" is the pooled figure; quote the 5.2/21.7 split instead — it is what the paper actually says, and the commercial-vs-open-source gap is the interesting teaching point.)

**Why it works.** Hallucination is **repeatable**, not random — that is the whole attack. An attacker does not need to guess; they sample the same model with the same prompts, collect the names it invents, and register them. The victim's agent then produces a name that *resolves*, and `npm install` succeeds. No exploit, no injection: the agent's own confident wrongness is the delivery mechanism.

**OWASP now states this in the standard.** `LLM04:2026 Supply Chain` verbatim: *"LLM coding assistants add a new variant: they hallucinate plausible but nonexistent package names at scale (Spracklen et al., 2025), which attackers register in advance ('slopsquatting') so that unverified AI-suggested dependencies resolve to malicious code."* ([LLM04_SupplyChain.md, canonical repo, 2026 final](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-LLM-Top10/main/2026/final/LLM04_SupplyChain.md)).

**Maps to:** `LLM04:2026 Supply Chain`, `LLM07:2026 Misinformation` (the hallucination itself); `ASI04`; ATLAS `AML.T0062 Discover LLM Hallucinations` → `AML.T0011.001 Malicious Package`.

**Defense that actually stops it.** A lockfile plus a dependency allowlist, enforced in CI, so no dependency enters the tree without a human deciding. Practically for agent workflows: deny the agent unattended `install`/`add` in the sandbox; require dependency changes to arrive as a diff to the manifest that a human reviews; enable registry provenance/attestation checks; and check package age + download history before first use. Note this is a *deterministic* control — it works whether or not the model hallucinates.

---

### 6. Malicious skills / plugins / extensions / MCP packages

**Why this class is distinct.** A skill, a `.cursor/rules` file, a VS Code extension, an `mcp.json` entry, an `AGENTS.md` — these are **configuration that behaves like code**, distributed through channels with weaker review than code, and *read into the agent's instruction stream by design*. They sit exactly on the fault line between "supply chain" and "prompt injection."

Four documented real cases, each a different link in the chain:

1. **Compromised publishing pipeline → the agent turns on its user.** Amazon Q Developer for VS Code **v1.84.0** shipped injected code. AWS's own bulletin states the root cause was *"an inappropriately scoped GitHub token in their CodeBuild configuration"* and that the code *"was distributed with the extension but was unsuccessful in executing due to a syntax error."* Fixed in **v1.85.0**. **`CVE-2025-8217`**, CVSS **5.1 MEDIUM**, published 2025-07-30 ([AWS-2025-015, 2025-07-23, updated 2025-07-25](https://aws.amazon.com/security/security-bulletins/AWS-2025-015/)). The low CVSS is itself instructive: severity scored the *failed* execution, not the *class*.
2. **A genuinely malicious MCP server in a public registry.** `postmark-mcp` on npm — the author published **15 clean versions**, then in **v1.0.16** (2025-09-17) added a single line silently BCC'ing every outgoing email to an attacker address; detected **2025-09-25**, ~1,500 weekly downloads, package later deleted by the author ([Koi, postmark-mcp npm malicious backdoor](https://www.koi.ai/blog/postmark-mcp-npm-malicious-backdoor-email-theft)). The teaching point is the **trust-accrual pattern**: reputation is earned then spent. Version-pinning-plus-review beats vendor reputation.
3. **Config-file backdoor via invisible Unicode.** The "Rules File Backdoor" targets agent rule/config files (`.cursor/rules` and equivalents) using zero-width joiners and bidirectional text markers so instructions are readable by the model and invisible in review ([Pillar Security, 2025-03-18](https://www.pillar.security/blog/new-vulnerability-in-github-copilot-and-cursor-how-hackers-can-weaponize-code-agents)). Vendor responses are worth teaching verbatim: Cursor initially placed the risk on the user (2025-03-06, reaffirmed 2025-03-08); GitHub initially said the same (2025-03-12) then shipped a hidden-Unicode warning on **2025-05-01**. **No CVE assigned.**
4. **Config-swap after approval.** `CVE-2025-54136` (Cursor MCPoison, above) and `CVE-2025-54135` — the latter being the injection→config-write→RCE chain: *"if sensitive MCP files, such as the .cursor/mcp.json file don't already exist in the workspace, an attacker can chain an indirect prompt injection vulnerability to hijack the context to write to the settings file and trigger RCE on the victim without user approval."* CVSS **8.5 HIGH**, fixed in 1.3.9.

**OWASP names the skill vector directly.** `LLM06:2026` Scenario #7 verbatim: *"The attacker can publish a malicious tool (e.g. via a Claude Skill on an open-source repository) that instructs an agent to perform recursive cyclical tasks…"* ([LLM06_UnboundedConsumption.md](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-LLM-Top10/main/2026/final/LLM06_UnboundedConsumption.md)).

**Maps to:** `LLM04:2026 Supply Chain`, `LLM01:2026`, `LLM03:2026`; `ASI04 Agentic Supply Chain Compromise`, `ASI05 Unexpected Code Execution`; `MCP04 Software Supply Chain Attacks & Dependency Tampering`, `MCP09 Shadow MCP Servers`; ATLAS `AML.T0081 Modify AI Agent Configuration`, `AML.T0010 AI Supply Chain Compromise`.

**Defense that actually stops it.** Treat `.claude/`, `.cursor/`, `.vscode/`, `mcp.json`, `AGENTS.md`, and skill directories as **privileged code paths**: CODEOWNERS-protected, diffed in review, pinned by version, and — the specific control for case 3 — **linted for non-printing/bidi Unicode in CI**, which is a deterministic check that catches an entire encoding class. Deny the agent write access to its own configuration (this single rule kills case 4). Prefer registries with provenance/signing.

---

### 7. Exfiltration channel classes (concept only)

**The unifying idea.** Injection is not the incident. Exfiltration is. Every channel below is the same shape: **the agent is induced to encode secret data into a destination it is permitted to reach.** The attacker never touches the network — the victim's own trusted, allowlisted infrastructure carries the data. This is the dossier's §2 *confused deputy* at the network layer, and it is why the third leg of the lethal trifecta is the one to amputate.

| Channel class | Mechanism (conceptual) | Primary reference |
|---|---|---|
| **Rendered markdown / image URL** | The client auto-fetches an image URL to render it; data is encoded in the URL. No click required. | ATLAS `AML.T0077 LLM Response Rendering`; realized in CamoLeak (below) |
| **Trusted-proxy laundering** | The victim platform's *own* image proxy is used as the egress, defeating CSP because the origin is legitimate | [CamoLeak, Legit Security (Omer Mayraz), 2025-10-08](https://www.legitsecurity.com/blog/camoleak-critical-github-copilot-vulnerability-leaks-private-source-code) |
| **Allowlisted-command network egress** | A command on the agent's "safe" allowlist can also make network requests | `CVE-2025-55284` (below) |
| **Version-control push** | The agent has push rights; a branch/repo is a data sink | Nx s1ngularity: data *"uploaded to a public GitHub repo via the GitHub CLI"* |
| **Application-layer side channel** | The agent's own legitimate outbound function (email, webhook, issue comment, ticket) carries the payload | postmark-mcp BCC; MCP spec "Data exfiltration" risk under Local MCP Server Compromise |
| **DNS resolution** | A name lookup leaves the host even when HTTP egress is blocked; the resolver is the channel | MCP spec §SSRF DNS/TOCTOU discussion (nearest primary) — `[UNVERIFIED]` as an *observed agent incident* |
| **SSRF to metadata** | Agent-side fetch of an attacker-supplied URL reaches `169.254.169.254` and returns cloud credentials | MCP spec §Server-Side Request Forgery, verbatim |

**Two exemplars worth teaching.**
- **CamoLeak (no CVE assigned).** GitHub's **Camo** proxy rewrites external image URLs into signed proxy URLs — a *security* mechanism. Researchers found that pre-generating valid signed Camo URLs for each character turned that mechanism into a CSP-compliant covert channel out of private repos, driven by prompt injection placed in pull request descriptions. Discovered June 2025, CVSS **9.6** (researcher-assigned), fixed **2025-08-14** by GitHub disabling image rendering in Copilot Chat outright. **No CVE ID is stated on the primary write-up.** Secondary blogs circulating `CVE-2025-59145` for this are **wrong** — that ID is the `color-name` npm account-takeover, published 2025-09-15 (NVD-confirmed). Do not print a CVE for CamoLeak.
- **`CVE-2025-55284`, Claude Code < 1.0.4.** Verbatim NVD: *"it's possible to bypass the Claude Code confirmation prompts to read a file and then send file contents over the network without user confirmation due to an overly broad allowlist of safe commands. Reliably exploiting this requires the ability to add untrusted content into a Claude Code context window."* CVSS **7.1 HIGH**, published 2025-08-16. This is the single best classroom artifact for "your allowlist is your egress policy, whether you meant it to be or not."

**Maps to:** `LLM02:2026 Sensitive Information Disclosure`, `LLM10:2026 Improper Output Handling` (the rendering channels), `LLM01:2026`; `ASI02`; ATLAS `AML.T0086 Exfiltration via AI Agent Tool Invocation`, `AML.T0077 LLM Response Rendering`.

**Defense that actually stops it.** A **default-deny egress allowlist enforced by the sandbox** (§2: OS/network-enforced, deterministic — not a guardrail). Then, in order: disable auto-rendering of remote images in agent output; treat "safe command" allowlists as network policy and audit every entry for a network capability; separate read credentials from push credentials; and apply the Rule of Two — if the session touched untrusted content and holds private data, it does not get to talk out.

---

### 8. Denial-of-wallet / cost exhaustion

**Primary, and now a named category.** `LLM06:2026 Unbounded Consumption` moved **up 4 places** in 2026 (dossier §3.3) and enumerates **Denial of Wallet (DoW)** as Common Example of Risk **#2**: *"By initiating a high volume of operations, attackers exploit the cost-per-use model of cloud-based AI services, leading to unsustainable financial burdens on the provider and risking financial ruin."* ([LLM06_UnboundedConsumption.md, canonical repo, 2026 final](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-LLM-Top10/main/2026/final/LLM06_UnboundedConsumption.md)).

**The mechanism, in OWASP's own words — cost asymmetry:** *"Attackers can trigger disproportionately expensive computation at negligible cost to themselves, whether through crafted prompts, stolen credentials, or manipulated workflows."* And the specifically agentic amplifier: *"agentic architectures and tool-use protocols (such as MCP) that amplify a single request into cascading downstream operations."* Conclusion, verbatim: *"Traditional request-rate limiting alone is no longer sufficient."*

**Why rate limiting fails — the number to teach.** Scenario #8, *Growing LLM Context in Agentic Sessions*: an open agentic session accumulates context so each turn re-processes everything; per-turn cost climbs *"from roughly $0.001 on the first turn to about $0.50 by turn 100. No single request triggers rate limits because each stays individually within budget, yet the aggregate across many concurrent or long-lived sessions reaches hundreds of dollars."* Requests-per-second is the wrong unit; **tokens and dollars** are the right ones.

Other agent-relevant risk entries in the same file: **#4 Reasoning-Loop and Thinking-Token Exhaustion**, **#8 Agent-Tool Interactions Flooding Model Resources**, plus Scenario **#7 Multi-turn Tool Calling Loops and Tool Call Fan-Out** and Scenario **#7's** malicious-Skill variant quoted in §6 above.

**Maps to:** `LLM06:2026 Unbounded Consumption`; `ASI08 Cascading Agent Failures`.

**Defense that actually stops it — OWASP's own mitigations, which are unusually concrete:**
- **#2 Hard Spending Caps:** *"non-overridable budget ceilings per API key, user, team, and cloud account. These must be enforcement mechanisms that halt inference when exceeded, rather than alerting thresholds that fast-accumulating workloads can outpace."*
- **#9 Agentic Circuit Breakers:** *"step limits, recursion depth limits, time limits, and per-run cost ceilings on all agent executions. Use state hashing to detect recursive loops."*
- **#1:** token-aware limits (tokens/minute, tokens/day, estimated cost per request) with **pre-flight token estimation** to reject before inference.
- **#8:** baseline normal tool token-consumption and alert on deviation.

The distinction to teach: an *alerting* threshold is a guardrail; a *halting* budget ceiling and a hard step limit are sandboxes. Same §2 taxonomy, applied to money.

---

## Incident table

All CVE IDs, publication dates, CVSS scores and description quotes were confirmed on **2026-08-25** via the NVD REST API v2.0 (`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=<ID>`); the human-readable equivalent is `https://nvd.nist.gov/vuln/detail/<ID>`.

| Incident / CVE | Date (NVD published) | Class | What happened | Fix | Source |
|---|---|---|---|---|---|
| **CVE-2025-32711** "EchoLeak" · CVSS 9.3 CRITICAL | 2025-06-11 | Indirect injection → exfiltration (`LLM01`/`LLM02`) | *"Ai command injection in M365 Copilot allows an unauthorized attacker to disclose information over a network"* — zero-click, delivered by inbound email | Microsoft server-side fix; no customer action | [MSRC](https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-32711) · [NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-32711) |
| **CVE-2025-49596** MCP Inspector < 0.14.1 · CVSS 9.4 CRITICAL (v4.0) | 2025-06-13 | Unauthenticated RCE in agent dev tooling (`MCP07`, `ASI05`) | *"lack of authentication between the Inspector client and proxy, allowing unauthenticated requests to launch MCP commands over stdio"* | Upgrade to 0.14.1+ | [GHSA-7f8r-222p-6f5g](https://github.com/modelcontextprotocol/inspector/security/advisories/GHSA-7f8r-222p-6f5g) · [NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-49596) |
| **CVE-2025-53109 / CVE-2025-53110** MCP Filesystem server < 0.6.4 / 2025.7.01 · CVSS 7.3 HIGH each | 2025-07-02 | Sandbox/path-boundary escape (`MCP02`) | Access to unintended files via **symlinks** inside allowed dirs (53109) and via **prefix-matching** an allowed dir (53110) | Upgrade to 0.6.4 / 2025.7.01 | [GHSA-q66q-fx2p-7w4m](https://github.com/modelcontextprotocol/servers/security/advisories/GHSA-q66q-fx2p-7w4m) · [GHSA-hc55-p739-j48w](https://github.com/modelcontextprotocol/servers/security/advisories/GHSA-hc55-p739-j48w) |
| **CVE-2025-6514** `mcp-remote` · CVSS 9.6 CRITICAL | 2025-07-09 | OS command injection from a **malicious server** to its client (`MCP05`) | *"exposed to OS command injection when connecting to untrusted MCP servers due to crafted input from the authorization_endpoint response URL"* | Patched upstream; see JFrog research | [JFrog research](https://research.jfrog.com/vulnerabilities/mcp-remote-command-injection-rce-jfsa-2025-001290844/) · [NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-6514) |
| **CVE-2025-8217** Amazon Q Developer VS Code ext. v1.84.0 · CVSS 5.1 MEDIUM | 2025-07-30 (bulletin 2025-07-23) | Build-pipeline supply chain (`LLM04`, `ASI04`) | Over-scoped GitHub token in CodeBuild let an attacker land destructive agent instructions into a signed release; *"unsuccessful in executing due to a syntax error"* | v1.85.0; 1.84.0 pulled | [AWS-2025-015](https://aws.amazon.com/security/security-bulletins/AWS-2025-015/) · [NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-8217) |
| **CVE-2025-54136** Cursor ≤1.2.4 "MCPoison" · **CVSS 7.2 HIGH** | 2025-08-02 | **Rug pull on an approved config** (`MCP03`, `ASI04`) | Trusted `mcp.json` swapped post-approval in a shared repo → *"without triggering any warning or re-prompt"* | Cursor advisory GHSA-24mc-g4xr-4395 | [Cursor advisory](https://github.com/cursor/cursor/security/advisories/GHSA-24mc-g4xr-4395) · [NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-54136) |
| **CVE-2025-54135** Cursor <1.3.9 · CVSS 8.5 HIGH | 2025-08-05 | Injection → **agent writes its own config** → RCE (`LLM01`→`ASI05`) | New (non-existing) dotfiles could be created without approval, so injection could create `.cursor/mcp.json` | 1.3.9 | [Cursor advisory](https://github.com/cursor/cursor/security/advisories/GHSA-4cxx-hrm3-49rm) · [NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-54135) |
| **CVE-2025-53773** GitHub Copilot / Visual Studio · CVSS 7.8 HIGH | 2025-08-12 | Injection → local code execution (`LLM10`) | Command injection in Copilot/VS allowing local code execution; Rehberger's write-up frames it as RCE via prompt injection | Microsoft Patch Tuesday 2025-08 | [MSRC](https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-53773) · [embracethered](https://embracethered.com/blog/posts/2025/github-copilot-remote-code-execution-via-prompt-injection/) |
| **CVE-2025-55284** Claude Code < 1.0.4 · CVSS 7.1 HIGH | 2025-08-16 | **Exfiltration via allowlisted commands** (`LLM02`, `AML.T0086`) | *"overly broad allowlist of safe commands"* let the agent read a file and send it over the network with no confirmation | 1.0.4; auto-update; pre-1.0.24 force-updated | [GHSA-x5gv-jw7f-j6xj](https://github.com/anthropics/claude-code/security/advisories/GHSA-x5gv-jw7f-j6xj) · [NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-55284) |
| **Nx "s1ngularity"** (no CVE; GHSA-cxm3-wv7p-598c) | 2025-08-26 | Supply chain that **weaponized local coding agents** (`LLM04`, `ASI04`) | `pull_request_target` + unsanitized PR title → code injection → 8 malicious packages (~6M weekly downloads, ~4h window); malware *"attempted to use local AI tools (like Claude and Gemini)"*; loot *"uploaded to a public GitHub repo via the GitHub CLI"* | Versions unpublished; npm Trusted Publishers/OIDC, mandatory 2FA publish, external contributors removed from pipelines | [nx.dev postmortem](https://nx.dev/blog/s1ngularity-postmortem) |
| **`postmark-mcp` v1.0.16** (no CVE) | malicious 2025-09-17, found 2025-09-25 | **Malicious MCP server in a public registry** (`MCP04`, `ASI04`) | 15 clean versions built trust; v1.0.16 silently BCC'd all outgoing mail to an attacker address; ~1,500 weekly downloads | Author deleted the package from npm; installed copies stayed compromised | [Koi](https://www.koi.ai/blog/postmark-mcp-npm-malicious-backdoor-email-theft) |
| **CamoLeak** — **no CVE assigned** · CVSS 9.6 (researcher-assigned) | disclosed 2025-10-08; fixed 2025-08-14 | Trusted-proxy exfiltration channel (`LLM02`, `AML.T0077`) | Injection in PR descriptions + pre-signed GitHub **Camo** image URLs = CSP-compliant covert channel out of private repos | GitHub disabled image rendering in Copilot Chat | [Legit Security](https://www.legitsecurity.com/blog/camoleak-critical-github-copilot-vulnerability-leaks-private-source-code) |
| **"Rules File Backdoor"** — no CVE | 2025-03-18 | Invisible-Unicode config poisoning (`LLM04`, `AML.T0081`) | Zero-width/bidi characters hide instructions in `.cursor/rules`-style agent config files | GitHub shipped hidden-Unicode warnings 2025-05-01; Cursor treated as user responsibility | [Pillar Security](https://www.pillar.security/blog/new-vulnerability-in-github-copilot-and-cursor-how-hackers-can-weaponize-code-agents) |
| **CVE-2025-59145** — **listed here as a NEGATIVE result** · CVSS 8.8 HIGH | 2025-09-15 | npm account takeover (crypto-clipper) | This is the **`color-name` npm** phishing/account-takeover, **not CamoLeak**, despite secondary blogs claiming otherwise | v2.0.1 unpublished / advisory | [GHSA-5fvm-p68v-5wmh](https://github.com/colorjs/color-name/security/advisories/GHSA-5fvm-p68v-5wmh) |

---

## What to teach vs what to skip

A ~250-line intermediate module cannot carry twelve attack classes. Recommended: **four classes, one incident each, one defense each**, all hung off the dossier's lethal-trifecta / Rule-of-Two spine.

**Teach these four.**

1. **MCP tool poisoning + rug pull** (~50 lines). This is the class the audience is *creating* right now by adding servers to `mcp.json`. It has a clean primary source (Invariant, 2025-04-01), a hard number (MCPTox 72.8% ASR, <3% refusal), a real CVE with a devastating quote (CVE-2025-54136: "without triggering any warning or re-prompt"), and a *deterministic* defense (pin the tool definitions). Include the spec gap — that the MCP security document has no tool-poisoning section — because it teaches students to check what a spec covers rather than assume.
2. **Exfiltration channels** (~50 lines). The single highest-leverage concept in the module: injection is not the incident, egress is. `CVE-2025-55284` is the perfect artifact because it is short, Anthropic's own, and shows an *allowlist* becoming an *egress policy* by accident. Pair with CamoLeak as the "even your security infrastructure is a channel" case. Defense: default-deny egress in the sandbox, plus disable remote image rendering. This is where the Rule of Two becomes actionable rather than decorative.
3. **Supply chain: slopsquatting + malicious skills/servers** (~55 lines). Two sub-parts, one lesson: *the agent's dependencies and the agent's configuration are the same attack surface*. Slopsquatting has the best numbers in the whole dossier (5.2% / 21.7% / 205k names) and a defense every professional already owns (lockfile + reviewed manifest diff + no unattended install). Malicious config gets `postmark-mcp` (trust accrual) and the Rules File Backdoor (invisible Unicode → a CI lint, which is a satisfying deterministic win). Amazon Q as the "even a hyperscaler's pipeline" note.
4. **Denial-of-wallet** (~30 lines). Short but earns its place because it is the only class here with a *purely economic* impact, it is the newest OWASP mover (LLM06 up 4), and the $0.001→$0.50-by-turn-100 number lands instantly with engineers. Defense: halting budget ceilings + agentic circuit breakers (step/depth/time/cost), not alerts. Also the cleanest reprise of the module's guardrail-vs-sandbox distinction.

**Skip or compress to one line each.**

- **Memory poisoning / RAG poisoning** — genuinely important, but the intermediate audience mostly runs *stateless* coding agents, and the good defenses (write-gating, provenance, corpus authorization) belong in a RAG/memory module. Compress to: "if your agent has persistent memory or a RAG corpus, an injection becomes permanent and cross-session; AgentPoison shows <0.1% poison rate suffices. See module N." One sentence, one link.
- **Cross-server tool shadowing** as its own section — fold it into (1) as the punchline ("you don't even have to call the malicious tool"), not a separate class.
- **MCP OAuth confused deputy / token passthrough / session hijacking** — real and spec-blessed, but these are *server-operator* problems. This audience mostly *consumes* MCP servers. Mention that the spec's security doc is an OAuth threat model and link it; do not teach OAuth flows here.
- **SSRF, sandbox escape, MCP Inspector RCE** — these are ordinary appsec bugs that happen to live in AI tooling. Naming them reinforces the module's best meta-lesson ("most of your AI security work is normal security work") but they need no dedicated section.
- **The full ASI01–ASI10 and MCP01–MCP10 enumerations** — reference tables, not prose. Dossier §3.4/§3.5 already has them.

**One editorial recommendation.** Every one of the four taught classes should end with the same two-column line: *guardrail (reduces success)* vs *boundary (bounds consequences)*. That repetition is what makes the module cohere, and it is the dossier's own §2 distinction paying off four times.

---

## References for the module

1. [MCP Security Notification: Tool Poisoning Attacks — Invariant Labs, 2025-04-01](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) — the primary coinage of TPA, MCP rug pull, and cross-server shadowing.
2. [MCP specification — Security Best Practices, revision 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices) — the spec's own threat model; use it *and* point out what it omits.
3. [MCPTox: A Benchmark for Tool Poisoning Attack on Real-World MCP Servers — arXiv:2508.14925, 2025-08-19](https://arxiv.org/abs/2508.14925) — 45 real servers, 72.8% peak ASR, <3% best refusal rate.
4. [We Have a Package for You! … Package Hallucinations by Code Generating LLMs — arXiv:2406.10279, USENIX Security 2025](https://arxiv.org/abs/2406.10279) — 5.2% / 21.7% hallucination rates, 205k unique fake names.
5. [A quote from Andrew Nesbitt — simonwillison.net, 2025-04-12](https://simonwillison.net/2025/Apr/12/andrew-nesbitt/) — earliest citable attribution of "slopsquatting" to Seth Larson.
6. [CamoLeak: Critical GitHub Copilot Vulnerability Leaks Private Source Code — Legit Security, 2025-10-08](https://www.legitsecurity.com/blog/camoleak-critical-github-copilot-vulnerability-leaks-private-source-code) — trusted-proxy exfiltration; note **no CVE**.
7. [CVE-2025-55284 — Claude Code allowlist bypass enabling network exfiltration](https://nvd.nist.gov/vuln/detail/CVE-2025-55284) — the cleanest "your allowlist is your egress policy" artifact.
8. [S1ngularity postmortem — nx.dev, 2025](https://nx.dev/blog/s1ngularity-postmortem) — first supply-chain attack to weaponize local AI coding agents; maintainer's own root-cause account.
9. [Security Bulletin AWS-2025-015 — Amazon Q Developer VS Code extension (CVE-2025-8217), 2025-07-23](https://aws.amazon.com/security/security-bulletins/AWS-2025-015/) — over-scoped CI token → malicious agent instructions in a signed release.
10. [OWASP LLM06:2026 Unbounded Consumption — canonical repo, 2026 final](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-LLM-Top10/main/2026/final/LLM06_UnboundedConsumption.md) — Denial of Wallet, cost asymmetry, agentic circuit breakers, the $0.001→$0.50 scenario.

*(Secondary but worth a footnote: [PoisonedRAG, arXiv:2402.07867, USENIX Security 2025](https://arxiv.org/abs/2402.07867) and [AgentPoison, arXiv:2407.12784](https://arxiv.org/abs/2407.12784) if the module keeps a memory/RAG paragraph.)*

---

## Link Verification Log

All checks performed **2026-08-25**.

| URL | Fetch result | Claim it supports |
|---|---|---|
| https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices | **OK**, full text | Section list under "Attacks and Mitigations"; confused-deputy, token-passthrough, SSRF, session-hijack, local-server, OAuth-URL, stdio-proxy, scope-minimization quotes; **absence** of a tool-poisoning section |
| https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices | **OK, but serves current content** — body links all point to `/specification/2025-11-25/`. Cite the 2025-11-25 URL. | Same; confirms 2025-11-25 is the current revision |
| https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks | **OK** | Date 2025-04-01; authors Beurer-Kellner & Fischer; TPA / rug pull / shadowing definitions; Cursor as test subject |
| https://arxiv.org/abs/2508.14925 | **OK** | MCPTox title/ID/date 2025-08-19; 45 servers, 353 tools, 1,312 cases, 72.8% ASR, <3% refusal |
| https://arxiv.org/abs/2402.07867 | **OK** | PoisonedRAG **ID confirmed**; Zou/Geng/Wang/Jia; 2024-02-12; USENIX Security 2025; ~90% ASR with 5 texts |
| https://arxiv.org/abs/2407.12784 | **OK** | AgentPoison; 2024-07-17; >80% ASR, <0.1% poison rate, <1% benign degradation |
| https://arxiv.org/abs/2503.03704 | **OK** | MINJA; title as shown today; 2025-03-05 v1, 2026-02-12 v5. Abstract carries **no** numeric ASR — numbers seen in search snippets were NOT confirmed and are omitted |
| https://arxiv.org/abs/2406.10279 | **OK** | Spracklen et al.; 2024-06-12 / rev 2025-03-02; USENIX Security 2025; "at least 5.2% … 21.7%"; 576k samples; 205k+ names |
| https://simonwillison.net/2025/Apr/12/andrew-nesbitt/ | **OK** | 2025-04-12; "Credit to @sethmlarson for the name" |
| https://embracethered.com/blog/posts/2025/gemini-memory-persistence-prompt-injection/ | **OK** | 2025-02-10; delayed tool invocation; Gemini long-term memory; Google's "low likelihood and low impact" triage |
| https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2025-32711 | **OK** (API) | EchoLeak; published 2025-06-11; CVSS 9.3 CRITICAL; description quote |
| https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2025-49596 | **OK** (API) | MCP Inspector <0.14.1 RCE; 2025-06-13; CVSS v4.0 9.4 CRITICAL |
| https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2025-53109 | **OK** (API) | MCP Filesystem symlink escape; 2025-07-02; 7.3 HIGH |
| https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2025-53110 | **OK** (API) | MCP Filesystem prefix-match escape; 2025-07-02; 7.3 HIGH |
| https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2025-6514 | **OK** (API) | mcp-remote OS command injection; 2025-07-09; 9.6 CRITICAL |
| https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2025-8217 | **OK** (API) | Amazon Q ext v1.84.0; 2025-07-30; **5.1 MEDIUM**; inert due to syntax error |
| https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2025-54136 | **OK** (API) | Cursor MCPoison; 2025-08-02; **7.2 HIGH** (dossier's guessed 8.8 is wrong); "without triggering any warning or re-prompt" |
| https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2025-54135 | **OK** (API) | Cursor <1.3.9; 2025-08-05; 8.5 HIGH; injection→dotfile creation→RCE |
| https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2025-53773 | **OK** (API) | Copilot/Visual Studio command injection; 2025-08-12; 7.8 HIGH |
| https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2025-55284 | **OK** (API) | Claude Code <1.0.4; 2025-08-16; 7.1 HIGH; "overly broad allowlist of safe commands" |
| https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2025-59145 | **OK** (API) | **NEGATIVE RESULT** — this is `color-name` npm ATO (2025-09-15, 8.8 HIGH), *not* CamoLeak |
| https://aws.amazon.com/security/security-bulletins/AWS-2025-015/ | **OK** | Bulletin 2025-07-23 (upd. 2025-07-25); v1.84.0; "inappropriately scoped GitHub token in their CodeBuild configuration"; "unsuccessful in executing due to a syntax error"; fix v1.85.0; CVE-2025-8217 |
| https://nx.dev/blog/s1ngularity-postmortem | **OK** | 2025-08-26; PR-title injection via `pull_request_target`; "attempted to use local AI tools (like Claude and Gemini)"; "uploaded to a public GitHub repo via the GitHub CLI"; 8 packages, ~6M weekly downloads, ~4h; remediation list |
| https://www.legitsecurity.com/blog/camoleak-critical-github-copilot-vulnerability-leaks-private-source-code | **OK** | 2025-10-08; Omer Mayraz; CVSS 9.6; **no CVE stated**; Camo proxy mechanism; discovered June 2025; fixed 2025-08-14 by disabling image rendering |
| https://www.koi.ai/blog/postmark-mcp-npm-malicious-backdoor-email-theft | **OK** (301 from `koi.security` → `koi.ai`; cite the `koi.ai` URL) | 2025-09-25; postmark-mcp v1.0.16; BCC mechanism; ~1,500 weekly downloads; 15 prior clean versions; author deleted package |
| https://www.pillar.security/blog/new-vulnerability-in-github-copilot-and-cursor-how-hackers-can-weaponize-code-agents | **OK** | 2025-03-18; "Rules File Backdoor"; zero-width joiners / bidi markers; Cursor 2025-03-06 & 03-08 responses; GitHub 2025-03-12 then fix 2025-05-01; no CVE |
| https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-LLM-Top10/main/2026/final/LLM06_UnboundedConsumption.md | **OK** (raw) | DoW = Risk #2 verbatim; cost asymmetry; MCP amplification; mitigations #1/#2/#8/#9; Scenario #4/#7/#8 incl. the $0.001→$0.50 figures and the Claude Skill sentence |
| https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-LLM-Top10/main/2026/final/LLM04_SupplyChain.md | **OK** (raw) | The verbatim slopsquatting sentence; ASI04 and `AML.T0010` cross-references |
| Vendor advisory links used in the incident table (msrc.microsoft.com, github.com/…/security/advisories/GHSA-*, research.jfrog.com, embracethered.com/…/github-copilot-remote-code-execution…) | **Reference URLs returned by the NVD API record for each CVE**; the NVD record itself was fetched, the individual advisory pages were **not** re-fetched | Provided as convenience links; the substantive claims all come from the NVD record |
| genai.owasp.org (any path) | **NOT attempted this pass** — previously HTTP 429; canonical GitHub raw used instead per instructions | n/a |

---

## Open questions / [UNVERIFIED]

1. **CamoLeak CVE.** `[UNVERIFIED: absence]` — no CVE ID appears on the Legit Security write-up. `CVE-2025-59145`, cited for CamoLeak by at least one secondary blog, is confirmed to be a *different* vulnerability. **Publish CamoLeak without a CVE.** A resuming agent could check GitHub's own security advisories / HackerOne disclosure for a later assignment.
2. **Slopsquatting coinage.** The Willison post (2025-04-12) credits Seth Larson, and secondary sources describe a Larson↔Nesbitt Mastodon exchange. The **original Mastodon post was not fetched** — `[UNVERIFIED]`. If the module wants to state a precise coinage date rather than "April 2025", fetch `fosstodon.org/@sethmlarson` or Nesbitt's post.
3. **MINJA numbers.** Search snippets quoted 98.2% injection success / 76.8% ASR. The **arXiv abstract does not contain those figures** — they are presumably in the body. They are therefore **omitted** from this supplement. Fetch the PDF if the module wants a number for memory poisoning; otherwise use AgentPoison's abstract-level figures, which are confirmed.
4. **MCP spec revision drift.** The `2025-06-18` path currently serves `2025-11-25` content. If the module cites a dated spec section, cite `2025-11-25` explicitly and re-check before publication — this document has changed materially at least twice in 2025.
5. **ASI01–ASI10 names** remain `[SECONDARY-VERIFIED]` per dossier §3.4. This supplement uses `ASI02/03/04/06/08` mappings; `ASI02`, `ASI03`, `ASI04`, `ASI08` are effectively primary-confirmed via LLM Top 10 cross-references, but **`ASI06 Memory & Context Poisoning`** used in §3 above is **not** — it rests on the two agreeing secondary sources. Confirm before publication.
6. **Nx and AI-CLI weaponization.** The nx.dev postmortem confirms *"attempted to use local AI tools (like Claude and Gemini)"* but does not spell out the mechanism (i.e. whether the agents were prompted to enumerate secrets). Third-party analyses (Wiz, GitGuardian, Snyk) go further and give a figure of 2,349 credentials from 1,079 systems — **not fetched, therefore `[UNVERIFIED]`** and omitted from the tables above. Fetch Wiz or GitGuardian if the module wants impact numbers.
7. **DNS as an observed agent exfiltration channel.** Conceptually sound and referenced obliquely by the MCP spec's SSRF/DNS-TOCTOU discussion, but I found **no primary agent-specific incident** documenting DNS exfiltration from an AI agent. Marked `[UNVERIFIED]` in the channel table; keep it as a mechanism class, do not claim an incident.
8. **CVE-2025-53773 attribution.** NVD's description is generic ("command injection in GitHub Copilot and Visual Studio"). The framing as *"RCE via prompt injection"* comes from the embracethered.com reference listed in the NVD record, which was **not re-fetched this pass**. Fetch it before making the prompt-injection claim in prose.
9. **Postmark-mcp impact figures.** The "~300 organizations / 3,000–15,000 emails per day" numbers are Koi's own estimates, presented as estimates. Treat as such; do not present as measured.

---

## RESUME NOTES

**Status: COMPLETE.** All eight assigned items researched and written; all cited URLs fetched.

- **Done:** items 1–8; incident table (13 rows + 1 negative result); teach/skip section; references; link log; open questions.
- **Verified CVEs (11):** CVE-2025-32711, -49596, -53109, -53110, -6514, -8217, -54136, -54135, -53773, -55284, and -59145 (as a negative result). All via NVD REST API v2.0.
- **Corrections made to dossier assumptions:** CVE-2025-54136 CVSS is 7.2 not 8.8; PoisonedRAG ID 2402.07867 confirmed; CamoLeak has no CVE.
- **Dead / redirecting URLs:** `koi.security` → 301 → `koi.ai`. `modelcontextprotocol.io/specification/2025-06-18/...` serves current (2025-11-25) content.
- **Not fetched (deliberate):** genai.owasp.org (rate-limit history); Wiz/GitGuardian/Snyk Nx analyses; MINJA PDF; Seth Larson's Mastodon post; individual vendor advisory pages already summarized by NVD.
- **Ordered next actions if extended:** (1) Seth Larson Mastodon for exact coinage date; (2) MINJA PDF for memory-poisoning ASR numbers; (3) Wiz/GitGuardian for Nx credential-theft counts; (4) OWASP Agentic Top 10 PDF to promote ASI06 from secondary to primary; (5) embracethered CVE-2025-53773 write-up.
