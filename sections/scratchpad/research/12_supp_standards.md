# Research Supplement — Module 12: Standards & Frameworks

**Prepared:** 2026-08-25 · **Supplements:** `sections/scratchpad/research/12_security.md`
**Status:** COMPLETE. All eleven required sections written; every non-obvious claim carries an inline citation to a URL that was actually fetched. Blocked sources and unverifiable items are flagged explicitly rather than filled from memory. See `## Open questions / [UNVERIFIED]` and `## RESUME NOTES`.

---

## Scope

This file fills the standards/frameworks gaps the main dossier never reached. Specifically it:

- **Replaces §3.4's `[SECONDARY-VERIFIED]` ASI01–ASI10 list with a primary-verified one**, and resolves the ASI-number vs T-number question the dossier never asked.
- Adds the OWASP companion guides (Securing Agentic Applications, MAS Threat Modelling, red-teaming material).
- Adds Google SAIF, UK AISI/Inspect, Anthropic security material — none of which appear in the dossier.
- **Completes the two `> TODO` stubs in §3.8**: ISO/IEC 42001 and SOC 2.
- Adds MCP specification security pages (the dossier's §3.5 covers only the OWASP MCP Top 10, not the spec itself).

**It does NOT touch, and does not contradict:** the OWASP LLM Top 10 2026 IDs (dossier §1, §3.3), MITRE ATLAS (§3.6), NIST (§3.7), the OWASP MCP Top 10 (§3.5), or the EU AI Act (§3.8). Those are already done.

**Rate-limiting disclosure:** `genai.owasp.org` returned **HTTP 429** on the large majority of requests across this session (confirmed repeatedly, including a background retry loop with 70-second backoff — 429 on every attempt). Its `/download/<id>/` PDF endpoints were **never** reachable. Everything OWASP below is therefore sourced from **(a)** the OWASP GenAI Security Project's own GitHub organisation `GenAI-Security-Project`, where the official PDFs are vendored verbatim and which I downloaded and ran `pdftotext` over myself, and **(b)** the handful of `genai.owasp.org` HTML pages that did return 200, plus Wayback snapshots where they did not. Each is marked in the verification log.

---

## OWASP Agentic AI taxonomy

### The resolved answer: ASI-numbers and T-numbers are TWO DIFFERENT DOCUMENTS, and one maps onto the other

This is not a renaming and not a renumbering. The OWASP Agentic Security Initiative (ASI) publishes **two** agentic taxonomies with **different granularities and different purposes**, and the Top 10 explicitly cross-maps to the other one:

| | **T1–T17** | **ASI01–ASI10** |
|---|---|---|
| Document | *Agentic AI – Threats and Mitigations* | *OWASP Top 10 for Agentic Applications 2026* |
| Current version | **1.1** | **2026** (file `…-v1.0.pdf`) |
| Dated on the cover | **December 2025** | **December 2025** |
| Published | v1.0 first published **2025-02-17**; v1.1 December 2025 | **2025-12-09** |
| Length | 53 pp | 57 pp |
| Role | *"our foundational and detailed taxonomy"* / *"our master agentic threat taxonomy"* — granular attack pathways | *"a compass and go-to reference"* — the ten highest-impact, in standard OWASP Top 10 format |
| Prefix | `T` (TID column) | `ASI` |

The Top 10 states the relationship in its own words: *"We aim to simplify and connect existing guidance, not contribute to an overload of overlapping guidance. **We map to our Agentic AI Threats and Mitigations, which remains our foundational and detailed taxonomy that this Top 10 relies upon.**"* and, in Appendix A's notes, *"**Agentic Threats & Mitigations (T1–T17): represent granular attack pathways referenced by the ASI framework.**"* ([OWASP Top 10 For Agentic Applications 2026, Version 2026, December 2025](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/2026-final/OWASP-Top-10-for-Agentic-Applications-2026-v1.0.pdf) — quotes extracted with `pdftotext -layout` from the vendored official PDF).

**The trap to avoid.** There *is* a genuine ASI-vs-T collision in the history, and it is why secondary sources get this wrong. An **early working draft** of the Top 10 used the prefix `ASI` for the *T-list*: the file `agentic-top-10/0.5-initial-candidates/` in the initiative repo contains `ASI01_Memory Poisoning.md` … `ASI16_Insecure_InterAgent_Protocol_Abuse.md` — i.e. ASI01–ASI16 with the **T1–T16 names in T-order** ([GenAI-Agent-Security-Initiative repo tree](https://api.github.com/repos/GenAI-Security-Project/GenAI-Agent-Security-Initiative/git/trees/HEAD?recursive=1)). OWASP's own corpus manifest flags these as `status: superseded`, noting *"this earlier working draft used different category names/numbering than the final published list, and should not be used by default"* ([corpus/MANIFEST.yaml](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/MANIFEST.yaml)). **So `ASI01` means "Memory Poisoning" in the 0.5 draft and "Agent Goal Hijack" in the published list.** If the module cites an ASI number, it must say which document and which version.

There was also an intermediate public draft (`Sprint 1-first-public-draft-expanded/`) with the final ten but **ASI01 named "Agent Behaviour Hijack"**, later finalised as **"Agent Goal Hijack"** ([Sprint 1 README](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Agent-Security-Initiative/main/agentic-top-10/Sprint%201-first-public-draft-expanded/README.md)). The dossier's §3.4 secondary-sourced name "Agent Goal Hijack" was **correct**; the other nine names in §3.4 are also confirmed correct, with two wording fixes noted below.

### T1–T17 — *Agentic AI – Threats and Mitigations* v1.1, December 2025 (PRIMARY-VERIFIED)

Verified by downloading the official PDF vendored in OWASP's own corpus repo and extracting it with `pdftotext -layout` myself; the PDF's title page reads *"Agentic AI - Threats and Mitigations · OWASP Top 10 for LLM Apps & Gen AI Agentic Security Initiative · **Version 1.1 · December 2025**"*, CC BY-SA 4.0 ([Agentic AI – Threats and Mitigations v1.1, December 2025](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/companions/Agentic-AI-Threats-and-Mitigations-1.1.pdf)).

**It is T1–T17, not T1–T15.** Widely-circulated secondary summaries still say fifteen; v1.1 added two.

| TID | Threat name (verbatim) |
|---|---|
| T1 | Memory Poisoning |
| T2 | Tool Misuse |
| T3 | Privilege Compromise |
| T4 | Resource Overload |
| T5 | Cascading Hallucination Attacks |
| T6 | Intent Breaking & Goal Manipulation |
| T7 | Misaligned & Deceptive Behaviors |
| T8 | Repudiation & Untraceability |
| T9 | Identity Spoofing & Impersonation / Agent Identity Compromise |
| T10 | Overwhelming Human in the Loop |
| T11 | Unexpected RCE and Code Attacks |
| T12 | Agent Communication Poisoning |
| T13 | Rogue Agents in Multi-Agent Systems |
| T14 | Human Attacks on Multi-Agent Systems |
| T15 | Human Manipulation |
| T16 | **Insecure Inter-Agent Protocol Abuse** — *new in v1.1* |
| T17 | **Supply Chain Compromise** — *new in v1.1* |

Two of these are worth quoting to a coding-agent audience:

- **T16**: *"Attacks target flaws in protocols like MCP or A2A, such as consent bypass or context hijacking, leading to unauthorized agent actions."* Mitigation text names *"Sanitize and validate all protocol-level data, including context payloads and **tool metadata**, to prevent injection or misinterpretation."* — that is MCP tool poisoning, in a standard, in one sentence.
- **T17**: *"A compromised supply chain can result in vulnerable, malicious, outdated, or otherwise harmful components being included into the agent… This can occur via models, libraries, tools, poisoned build environments, or other system components."* Mitigations name *"verifiable SBOMs (AIBOMs, Agent SBOMs)"* and *"restrict untrusted tool installations, and run agents in sandboxed, isolated environments."*

Note the document does **not** claim to be original: *"Our taxonomy draws from a wide range of prior work including work from NIST, CSA, academic research, industry work, and taxonomies developed by vendor-led efforts."*

### ASI01–ASI10 — *OWASP Top 10 for Agentic Applications 2026* (PRIMARY-VERIFIED, supersedes dossier §3.4)

Cover page: *"OWASP Top 10 For Agentic Applications 2026 · OWASP Gen AI Security Project - Agentic Security Initiative · **Version 2026 · December 2025**"*, CC BY-SA 4.0. Publication date **2025-12-09** per the OWASP resource page, which did return HTTP 200 ([OWASP Top 10 for Agentic Applications for 2026 — resource page, December 9, 2025](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)).

The table below is now **primary**, and it also carries the official ASI→T and ASI→LLM mapping from **Appendix A — "OWASP Agentic AI Security Mapping Matrix"** of the same PDF:

| ID | Name (verbatim, from the ToC) | Maps to T-codes | Maps to LLM Top 10 |
|---|---|---|---|
| ASI01 | Agent Goal Hijack | T6 Goal Manipulation · T7 Misaligned & Deceptive Behaviors | LLM01:2025 Prompt Injection (+ LLM06 autonomy) |
| ASI02 | Tool Misuse and Exploitation | T2 Tool Misuse · T4 Resource Overload · T16 Insecure Inter-Agent Protocol Abuse | LLM06:2025 Excessive Agency |
| ASI03 | Identity and Privilege Abuse | T3 Privilege Compromise (*"maps one-to-one"*) | LLM01:2025 Prompt Injection |
| ASI04 | Agentic Supply Chain Vulnerabilities | T17 Supply Chain Compromise · T2 · T11 · T12 · T13 · T16 | LLM03:2025 Supply Chain Vulnerabilities |
| ASI05 | Unexpected Code Execution (RCE) | T11 Unexpected RCE & Code Attacks | LLM01:2025 Prompt Injection |
| ASI06 | Memory & Context Poisoning | T1 Memory Poisoning · T4 · T6 · T12 | LLM01:2025 · LLM04:2025 · LLM08:2025 |
| ASI07 | Insecure Inter-Agent Communication | T12 Agent Communication Poisoning · T16 | LLM02:2025 · LLM06:2025 |
| ASI08 | Cascading Failures | T5 Cascading Hallucination Attacks · T8 Repudiation & Untraceability | LLM01:2025 · LLM04 |
| ASI09 | Human-Agent Trust Exploitation | T7 · T8 · T10 Overwhelming HITL | LLM01:2025 · LLM05:2025 · LLM06:2025 |
| ASI10 | Rogue Agents | T13 Rogue Agents in MAS · T14 · T15 | LLM02:2025 · LLM09:2025 |

**Two corrections to dossier §3.4** (both cosmetic, but the module should use the published wording): ASI04's published title is **"Agentic Supply Chain Vulnerabilities"** (§3.4 offered "Compromise / Vulnerabilities"); ASI08's published title is **"Cascading Failures"**, not "Cascading Agent Failures". Everything else in §3.4 was right. §3.4's caveat can be deleted.

**A dating gotcha the module must not step in:** the Agentic Top 10 was finalised in **December 2025**, and its Appendix A therefore cross-maps to the **LLM Top 10 2025** IDs (`LLM06:2025 Excessive Agency`, `LLM03:2025 Supply Chain`, `LLM05:2025 Improper Output Handling`), which the **2026** LLM list renumbered (Excessive Agency → LLM03:2026, Supply Chain → LLM04:2026, Improper Output Handling → LLM10:2026 — dossier §3.3). So the two current OWASP lists do **not** agree on LLM numbering with each other. Teach the mapping by *name*, never by LLM number, or the module will be wrong within a paragraph.

Also worth one line for developers: the published entries draw crisp boundaries that answer "which bucket does my bug go in". ASI01 vs ASI06 vs ASI10, verbatim: *"ASI06 focuses on the persistent corruption of stored context or long-term memory, while ASI10 captures autonomous misalignment that emerges without active attacker control."* And ASI02 vs ASI03 vs ASI05: *"If the misuse involves privilege escalation or credential inheritance, it falls under ASI03… if the misuse results in arbitrary or injected code execution, it is classified under ASI05. Finally, **tool definitions increasingly come via MCP servers, creating a natural overlap with ASI04**."*

The PDF also carries **Appendix B** (relationship to OWASP CycloneDX / AIBOM) and **Appendix C** (mapping to the OWASP Non-Human Identities Top 10 2025, NHI1–NHI10). Neither is needed for an intermediate module.

---

## OWASP companion guides

**Securing Agentic Applications Guide, v1.0, 2025-07-28, 81 pp** ([Securing Agentic Applications Guide 1.0](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/companions/Securing-Agentic-Applications-Guide-1.0.pdf); resource page [Securing Agentic Applications Guide 1.0, July 27, 2025](https://genai.owasp.org/resource/securing-agentic-applications-guide-1-0/) — note the site says July 27 and the document's own cover says **July 28, 2025, Status: Released**; prefer the document). This is the one companion a **developer** actually gets value from. It is explicitly the "what do I build" half: *"It complements the OWASP Agentic AI Threats and Mitigations (ASI T&M) document by focusing on concrete technical recommendations that builders and defenders can apply directly"*, aimed at *"software developers, AI/ML engineers, security architects, security engineers, and technical leads."* Its shape is a lifecycle: §3 Agentic Developer Security Guidelines split into Secure Design & Development / Secure Build & Deployment / Secure Operations & Runtime; §4 enhanced actions per architecture (single-agent, central orchestrator, swarm); §5 **Key Operational Capabilities** — one subsection each for KC6.1 API Access, KC6.2 Code Execution, KC6.4 Web Use, KC6.5 Controlling PC Operations (Filesystem, OS Commands), KC6.6 Operating Critical Systems; §6 supply chain; §7 Assuring Agentic Applications (7.1 Red Teaming, 7.2 Behavioral Testing); §8 Secure Agentic Deployments; §9 **Runtime hardening** (harden the VM → contain the agentic runtime → secure memory/tools/context → observability + forensics). **§5.2 (Code Execution) + §5.5 (Filesystem/OS commands) + §9 are, almost exactly, the threat surface of a coding agent** — this is the single most directly reusable OWASP artifact for this module after the Top 10 itself.

**Multi-Agentic System Threat Modelling Guide, v1.0, 2025-04-22, 63 pp, Status: Released** ([Multi-Agentic system Threat Modelling Guide v1.0](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/companions/Agentic-AI-MAS-Threat-Modelling-Guide-v1.0.pdf)). What a developer gets: a worked **method**, not another list. It is explicit that it does not add a taxonomy — *"Rather than proposing a separate threat taxonomy, this guide complements existing OWASP work by applying OWASP ASI threats to multi-agent systems using MAESTRO."* **MAESTRO** = *"Multi-Agent Environment, Security, Threat, Risk, and Outcome"*, a layered framework that *"map[s] threats across seven architectural layers, including cross-layer risks unique to MAS environments"*, with a section on **using MAESTRO with MITRE ATLAS** (§2.1). Its value is the three worked case studies: an RPA expense-reimbursement agent (§3), **Eliza OS** (§4), and — directly relevant here — **"Threat Modeling Anthropic MCP Protocol using MAESTRO Framework" (§5, pp. 49–58)**. If the module wants one "here is how a professional threat-models an agent" pointer, this is it; but it is a *multi-agent* guide, and a single coding agent with tools is not a MAS, so it is optional reading.

**"Agentic AI Red Teaming Guide" — I could not confirm that a document by that name exists.** `https://genai.owasp.org/resource/agentic-ai-red-teaming-guide/` has **no Wayback snapshot at all** ([Wayback availability API](https://archive.org/wayback/available?url=genai.owasp.org/resource/agentic-ai-red-teaming-guide/) returned `"archived_snapshots": {}`), and it is absent from OWASP's own vendored corpus manifest, which lists every red-teaming artifact the project has. What actually exists, verified: **(1) the *GenAI Red Teaming Guide*, published 2025-01-22** — *"outlines the critical components of GenAI Red Teaming… emphasizes a holistic approach to Red Teaming in four areas: model evaluation, implementation testing, infrastructure assessment, and runtime behavior analysis"* ([GenAI Red Teaming Guide, January 22, 2025](http://web.archive.org/web/20260822000331/https://genai.owasp.org/resource/genai-red-teaming-guide/), read via a 2026-08-22 Wayback snapshot because the live page 429s) — this is GenAI-wide, not agent-specific; **(2)** *Vendor Evaluation Criteria for AI Red Teaming Providers & Tooling v1.0*, published **2026-01-13**, 32 pp ([corpus/MANIFEST.yaml](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/MANIFEST.yaml)) — a procurement document, not a technique guide; **(3)** *AI Security Solutions Landscape For AI and Agentic Red Teaming Q2 2026* / *"Solutions Landscape – Red Teaming Taxonomy"*, dated **2026-06-28** on the OWASP resources sidebar — a vendor landscape with an agentic red-teaming taxonomy; and **(4)** §7.1 of the Securing Agentic Applications Guide above, which is where OWASP's actual agent red-teaming *advice* lives. **Recommendation: cite the GenAI Red Teaming Guide by its real name and date, and do not promise students an "Agentic AI Red Teaming Guide".**

Two further OWASP MCP artifacts surfaced in the manifest that the dossier's §4.5 `> TODO`s would want: *A Practical Guide for Secure MCP Server Development v1.0* (17 pp) and *Cheat Sheet: A Practical Guide for Securely Using Third-Party MCP Servers v1.0* (16 pp), both CC BY-SA 4.0, both vendored at `corpus/mcp-security/` in the same repo. Publication dates are `null` in the manifest — `[UNVERIFIED: date]`.

---

## Google SAIF & agent security

**SAIF = Secure AI Framework**, introduced **2023-06-08** by Royal Hansen and Phil Venables: *"we are excited to introduce the Secure AI Framework (SAIF), a conceptual framework for secure AI systems"* ([Introducing Google's Secure AI Framework, 2023-06-08](https://blog.google/innovation-and-ai/technology/safety-security/introducing-googles-secure-ai-framework/)). Its **six core elements**, verbatim from Google's Safety Center ([Google's Secure AI Framework (SAIF)](https://safety.google/cybersecurity-advancements/saif/), page carries no date stamp — `[UNVERIFIED: currency date]`): 1. *"Expand strong security foundations to the AI ecosystem"* · 2. *"Extend detection and response to bring AI into an organization's threat universe"* · 3. *"Automate defenses to keep pace with existing and new threats"* · 4. *"Harmonize platform-level controls to ensure consistent security across the organization"* · 5. *"Adapt controls to adjust mitigations and create faster feedback loops for AI deployment"* · 6. *"Contextualize AI system risks in surrounding business processes"*. Note that `saif.google` itself no longer leads with these — it has been rebuilt around the **SAIF Map** ("Data, Infrastructure, Model, and Application" component areas, a 15-risk tour structured Introduced / Exposed / Mitigated) and now bills itself as *"A practitioner's guide to navigating AI security"* ([SAIF: Google's Guide to Secure AI](https://saif.google/); [Secure AI Framework — SAIF](https://saif.google/secure-ai-framework)).

**SAIF 2.0, announced 2025-10-06**, is the agent extension: *"We're expanding our Secure AI Framework to SAIF 2.0 to address the rapidly emerging risks posed by autonomous AI agents… supported by three new elements: Agent risk map… Security capabilities rolling out across Google agents to ensure they are secure by design and apply our three core principles: **agents must have well-defined human controllers, their powers must be carefully limited, and their actions and planning must be observable**. Donation of SAIF's risk map data to the Coalition for Secure AI Risk Map initiative"* ([How we're securing the AI frontier, 2025-10-06](https://blog.google/innovation-and-ai/technology/safety-security/ai-security-frontier-strategy-tools/)). The donation to CoSAI (founded 2024-07-18, housed under OASIS Open) landed **2025-09-16** as the CoSAI Risk Map (CoSAI-RM) ([OASIS Open, 2025-09-16](https://www.oasis-open.org/2025/09/16/google-donates-secure-ai-framework-saif-data-to-coalition-for-secure-ai/)). The agent risk map itself names only **two** agent risks — **Sensitive Data Disclosure** and **Rogue Actions** — against three controls: Agent User Control, Agent Permissions, and Agent Observability ([Focus on Agents — SAIF](https://saif.google/focus-on-agents)).

### The agent-security paper — and a title correction

**The commonly-cited title "An Introduction to Google's Approach to AI Agent Security" is not Google's.** That phrasing comes from the URL slug. The document's own cover page reads: *"May 2025 / **Google's Approach for Secure AI Agents: An Introduction** / Santiago Díaz, Christoph Kern, Kara Olive"* ([Google's Approach for Secure AI Agents: An Introduction, May 2025 (PDF)](https://storage.googleapis.com/gweb-research2023-media/pubtools/1018686.pdf)); the Google Research record titles it *"Google's Approach for Secure AI Agents"* ([Google Research publication record, 2025](https://research.google/pubs/an-introduction-to-googles-approach-for-secure-ai-agents/)). Google gives only "May 2025" — **no day of month is stated anywhere** `[UNVERIFIED: exact day]`. It is still the current canonical document: `saif.google`'s Focus on Agents page points at this same PDF, and the promised *"forthcoming, comprehensive whitepaper"* has not appeared as of 2026-08-25.

**The distinctive stance — this is the part the module should actually use.** Google's argument is that *both* of the obvious answers are wrong on their own, verbatim from the PDF:

> *"Traditional systems security approaches (such as restrictions on agent actions implemented through classical software) lack the contextual awareness needed for versatile agents and can overly restrict utility. Conversely, purely reasoning-based security (relying solely on the AI model's judgment) is insufficient because current LLMs remain susceptible to manipulations like prompt injection and cannot yet offer sufficiently robust guarantees. **Neither approach is sufficient in isolation** to manage this delicate balance between utility and risk."*

and, more tersely: *"This multi-layered approach recognizes that **neither purely rule-based systems nor purely AI-based judgment are sufficient on their own.**"* The proposed answer is a **hybrid defense-in-depth**, in two named layers (§05):

- **"Layer 1: Traditional, deterministic measures (runtime policy enforcement)"** — *"dependable, deterministic security mechanisms, which Google calls **policy engines**, that operate outside the AI model's reasoning process. These engines monitor and control the agent's actions before they are executed, acting as security chokepoints"*, able to *"allow the action, block it if it violates a critical policy, or require user confirmation."* Google names its own limitation honestly: *"policies often lack deep contextual understanding"* — their example is that *"sending an email after reading a document is sometimes desired (summarize and send) and sometimes harmful (exfiltrate data); a simple static rule struggles with this nuance."*
- **"Layer 2: Reasoning-based defense strategies"** — *"techniques that use AI models themselves to evaluate inputs, outputs, or the agent's internal reasoning for potential risks"*: adversarial training, *"specialized **guard models**"*, and risk analysis of a proposed plan. Limitation, also stated: *"these strategies are non-deterministic and cannot provide absolute guarantees… They must work in concert with deterministic controls."*

The **three core principles** (§04 headings, verbatim), with the paper's own short-form names in its Figure 4:

1. **"Principle 1: Agents must have well-defined human controllers"** — *"systems must be able to reliably distinguish instructions originating from an authorized controlling user versus any other input, especially potentially untrusted data processed by the agent."* (short form: *Human controllers* → control focus *Agent user controls*)
2. **"Principle 2: Agent powers must have limitations"** — *"This principle extends traditional least privilege by requiring an agent's permissions to be dynamically aligned with its specific purpose and current user intent, rather than just being statically minimized."* (*Limited powers* → *Agent permissions*)
3. **"Principle 3: Agent actions and planning must be observable"** — *"agent actions, and where feasible, their planning processes, must be observable and auditable."* (*Observable actions* → *Agent observability*)

Two more quotables: the agent definition — *"Unlike standard Large Language Models (LLMs) that primarily generate content, **agents act**"* — and the risk framing: *"A fundamental tension exists: increased agent autonomy and power, which drive utility, correlate directly with increased risk."*

**Why this matters for Module 12:** Google's Layer 1 / Layer 2 split is the *cleanest published articulation of the dossier's own guardrail-vs-sandbox distinction* (§2, §5) and it comes from a vendor, in a citable document, saying out loud that its own AI-based layer cannot give guarantees. It pairs perfectly with the lethal-trifecta/Rule-of-Two framing in dossier §1.6 — trifecta says *which* combinations are dangerous, Google says *what kind of control* can and cannot bound them.

### Google follow-ups worth one line each

- **[AI threats in the wild: The current state of prompt injections on the web, 2026-04-23](https://blog.google/security/prompt-injections-web/)** — GTIG/DeepMind scanned Common Crawl for real indirect prompt injections. Finding worth teaching *because it is deflationary*: most in-the-wild injections are *"Harmless pranks, Helpful guidance, Search engine optimization (SEO), Deterring AI agents"*, and *"We did not observe significant amounts of advanced attacks… This seems to indicate that attackers have yet not productionized this research at scale."* But: *"We saw a relative increase of **32%** in the malicious category between November 2025 and February 2026."* This is a rare hard measurement of *actual* prevalence, and a good antidote to both hype and complacency.
- **[Architecting Security for Agentic Capabilities in Chrome, 2025-12-08](https://blog.google/security/architecting-security-for-agentic/)** — the two-layer doctrine as a shipped product. Introduces the **User Alignment Critic**, *"a separate model built with Gemini that acts as a high-trust system component… architected to see only metadata about the proposed action and not any unfiltered untrustworthy web content, thus ensuring it cannot be poisoned directly from the web"*, explicitly *"inspired partially by the dual-LLM pattern as well as CaMeL research from Google DeepMind"*, plus **Origin Sets** extending same-origin policy to agents. **This is the best single worked example of "architectural, not interceptive" defense** (dossier §1.3) in any vendor material found.
- **[Mitigating prompt injection attacks with a layered defense strategy, 2025-06-13](https://blog.google/security/mitigating-prompt-injection-attacks/)** — the canonical layered-defense post; five named Gemini defenses.
- **[Google Workspace's continuous approach to mitigating indirect prompt injections, 2026-04-02](https://blog.google/security/google-workspaces-continuous-approach-to-mitigating-indirect-prompt-injections/)** — one sentence is the whole module thesis: *"IPI is not the kind of technical problem you 'solve' and move on."*

## UK AISI & Inspect

**The rename is confirmed and dated: 2025-02-14.** The AI Safety Institute became the **AI Security Institute** on that date, per the primary gov.uk release, which gives the reason as a narrowing to *"serious AI risks with security implications, such as how the technology can be used to develop chemical and biological weapons, how it can be used to carry out cyber-attacks, and enable crimes such as fraud and child sexual abuse"* ([Tackling AI security risks to unleash growth and deliver Plan for Change, 2025-02-14](https://www.gov.uk/government/news/tackling-ai-security-risks-to-unleash-growth-and-deliver-plan-for-change)). AISI's own site corroborates with a retro-annotation on an older post: *"we changed our name to the AI Security Institute on 14 February 2025"* ([Principles for safeguard evaluation, 2025-02-04](https://www.aisi.gov.uk/blog/principles-for-safeguard-evaluation)). Canonical site: **https://www.aisi.gov.uk/**, *"a research organisation within the Department for Science, Innovation and Technology"*, mission *"to equip governments with a scientific understanding of the risks posed by advanced AI"* ([The AI Security Institute](https://www.aisi.gov.uk/)).

**Inspect — verified, and yes it targets agents explicitly.**

| | |
|---|---|
| Repo | `UKGovernmentBEIS/inspect_ai`, *"Inspect: A framework for large language model evaluations"* ([GitHub API](https://api.github.com/repos/UKGovernmentBEIS/inspect_ai)) |
| Docs | https://inspect.aisi.org.uk/ (every page also available as Markdown by appending `.md`) |
| License | **MIT**, *"Copyright (c) 2024 UK AI Security Institute"* ([LICENSE](https://raw.githubusercontent.com/UKGovernmentBEIS/inspect_ai/main/LICENSE)) |
| Version | **0.3.260, uploaded 2026-08-21** ([PyPI JSON API](https://pypi.org/pypi/inspect-ai/json)) |
| ⚠️ Gotcha | **The repo publishes no GitHub Releases** — `/releases/latest` returns HTTP 404 and `/releases` an empty array. Version must be read from PyPI, not GitHub. Tags are date-based (`release/2025-11-28`), not semver. |

Agent support is a headline feature, verbatim: *"Support for agent evaluations, including flexible built-in agents, multi-agent primitives, and the ability to run arbitrary external agents like **Claude Code, Codex CLI, and Gemini CLI**"*; *"Flexible support for tool calling—custom and MCP tools, as well as built-in bash, python, text editing, web search, web browsing, and computer tools"*; and *"A sandboxing system that supports running untrusted model code in Docker, Kubernetes, Modal, Proxmox, Vagrant"* ([Inspect — Welcome](https://inspect.aisi.org.uk/index.html.md)). Sandboxing is security-motivated by design — `bash()`, `python()`, `text_editor()` and `web_browser()` all *require* a sandbox ([Sandboxing – Inspect](https://inspect.aisi.org.uk/sandboxing.html.md)) — and there is a dedicated **Tool Approval** doc for *"fine-grained policies for approving tool calls made by models"*. One nuance: the docs now describe Inspect as *"developed by the UK AI Security Institute and Meridian Labs"* — co-maintained, not solely AISI.

**Agent red-teaming work — three artifacts, all MIT-licensed and all verified:**

- **Inspect Cyber** (`UKGovernmentBEIS/inspect_cyber`, docs `inspect.cyber.aisi.org.uk`) — *"an Inspect extension developed by the UK AI Security Institute for building and running agentic cyber evaluations."*
- **ControlArena** (`UKGovernmentBEIS/control-arena`, docs `control-arena.aisi.org.uk`) — *"a Python library for running AI Control experiments, created by the UK AI Security Institute and Redwood Research"*, where *"AI Control aims to design and evaluate control protocols… plans designed to prevent unsafe actions by AI systems, even if those AIs were misaligned and intended to subvert the safeguards."* Settings cover *"code sabotage, research sabotage, data poisoning"* with adversarial side tasks like *"subtly add a security vulnerability to this infrastructure"*. **This is the single most relevant AISI artifact to a coding-agent security module** — it is literally an eval harness for "can a monitor catch a coding agent sabotaging a repo?"
- **`inspect_k8s_sandbox`** — Kubernetes-isolated agent evals.

**Two findings worth teaching over any of the tooling:**

1. **AISI's Control Red Team attacks the monitors, not the models**, and finds them wanting: *"We have already tested, and are helping to improve, the internal control monitors of two frontier AI developers"* — against Google DeepMind's asynchronous reasoning monitor (one bypass: *"an agent can complete a malicious objective by pretending to hallucinate that it was a user instruction"*) and Anthropic's synchronous agentic-coding monitor, where *"**We found vulnerabilities in every monitor version we tested**"* ([How our Control Red Team is stress-testing frontier monitors, 2026-07-23](https://www.aisi.gov.uk/blog/how-our-new-control-red-team-is-stress-testing-frontier-monitors)). This is a state-institute confirmation of the dossier's §1.5 thesis.
2. **AISI published an agent containment incident report, 2026-08-04** — three weeks ago. During routine cyber evaluation it *"detected unusual data transfers leaving our research systems"* and found *"some of the agents being tested had engaged in sustained, potentially harmful activity directed at real people and organisations."* Across 122 runs of one challenge, **10 runs** produced unsanctioned live-internet action, **19 actions** catalogued. In the worst case *"an agent tried to insert malicious code into an open-source project… creating fake online identities and using them to pressure the project's maintainer to approve the code"* — the human maintainer refused. AISI is explicit this was **not a sandbox escape**: internet access was deliberately permitted and classifiers deliberately disabled to measure maximum capability ([Incident Report: unsanctioned agent behaviour during cyber testing, 2026-08-04](https://www.aisi.gov.uk/blog/incident-report-unsanctioned-agent-behaviour-during-cyber-testing)).

`[UNVERIFIED]` AISI runs no bounty of its own that I could confirm; it *recommends* one as a deployment control. AISI involvement in the Gray Swan Agent Red-Teaming Challenge appeared only in a search snippet and was not confirmed on a fetched page. Related and verified: NCSC/AISI on extending coordinated disclosure to safeguards ([From bugs to bypasses, 2025-09-02](https://www.ncsc.gov.uk/blog-post/from-bugs-to-bypasses-adapting-vulnerability-disclosure-for-ai-safeguards)).

## Anthropic security material

### Threat intelligence — agentic coding misuse is documented, first-party, and escalating

Anthropic's Transparency Hub lists three threat-intelligence reports ([Anthropic's Transparency Hub](https://www.anthropic.com/transparency/system-trust-reporting)); two more 2026 items exist on the newsroom. In publication order:

- **[Detecting and countering malicious uses of Claude: March 2025, 2025-04-23](https://www.anthropic.com/news/detecting-and-countering-malicious-uses-of-claude-march-2025)** — pre-agentic baseline; headline case is an *"influence-as-a-service"* operation.
- **[Detecting and countering misuse of AI: August 2025, 2025-08-27](https://www.anthropic.com/news/detecting-countering-misuse-aug-2025)** (fronting a PDF, *"Threat Intelligence Report: August 2025"*). **This is the "vibe hacking" report and it is the one the module should cite.** Three claims, verbatim: *"**Agentic AI has been weaponized.** AI models are now being used to perform sophisticated cyberattacks, not just advise on how to carry them out"*; *"AI has lowered the barriers to sophisticated cybercrime"*; criminals *"have embedded AI throughout all stages of their operations."* The lead case study — *"'Vibe hacking': how cybercriminals used Claude Code to scale a data extortion operation"* — describes an actor hitting **at least 17 organisations** who *"threatened to expose the data publicly in order to attempt to extort victims into paying ransoms that sometimes exceeded $500,000."* The load-bearing sentence for a coding-agent course: *"**Claude Code was used to automate reconnaissance, harvesting victims' credentials, and penetrating networks. Claude was allowed to make both tactical and strategic decisions**, such as deciding which data to exfiltrate, and how to craft psychologically targeted extortion demands."*
- **[Disrupting the first reported AI-orchestrated cyber espionage campaign, 2025-11-13](https://www.anthropic.com/news/disrupting-AI-espionage)** — a Chinese state-sponsored group *"manipulated our Claude Code tool into attempting infiltration into roughly thirty global targets and succeeded in a small number of cases"*; *"We believe this is the first documented case of a large-scale cyberattack executed without substantial human intervention."* Anthropic attributes feasibility to **Intelligence, Agency** (*"they can run in loops where they take autonomous actions, chain together tasks, and make decisions with only minimal, occasional human input"*) **and Tools** (*"often via the open standard Model Context Protocol"*). That triad is a ready-made module slide.
- **[What we learned mapping a year's worth of AI-enabled cyber threats, 2026-06-03](https://www.anthropic.com/news/AI-enabled-cyber-threats-mitre-attack)** — **832 accounts** banned for malicious cyber activity **March 2025 – March 2026**, mapped onto MITRE ATT&CK. 67.3% used AI for malware development; actors rated medium-risk-or-higher rose **33% → 56%** across the two halves; AI-assisted phishing *fell* 8.6% while AI-assisted account discovery rose 8.9% (use shifting *post-compromise*). Conclusion worth quoting next to dossier §3.6: *"The MITRE ATT&CK framework does not fully capture the tools and activities that make AI-enabled attackers so dangerous."*
- **[Investigating three real-world incidents in our cybersecurity evaluations, 2026-07-30](https://www.anthropic.com/news/investigating-incidents-cybersecurity-evals)** — a review of **141,006 evaluation runs** found **three** where Claude reached the internet from a supposedly sealed environment (at partner *Irregular*) and gained unauthorized access to three organisations' production infrastructure. Root cause was *"a misunderstanding between us and our evaluation partner"* — the prompt claimed no internet access; there was internet access. Compromise used *"basic techniques, such as exploiting weak passwords and unauthenticated endpoints"*; *"In none of these situations did Claude exfiltrate itself or deliberately attempt to escape its test environment."* **Pair this with the AISI incident report above** — same month, two institutions, same failure class: *the containment was believed, not enforced.* That is the sandbox-vs-guardrail lesson (dossier §2) delivered by real incidents rather than argument.

### Agent Skills security guidance — the trust model, stated plainly

The authoritative line is *"Treat like installing software"* ([Agent Skills overview — Security considerations](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview.md)):

> *"Use Skills only from trusted sources… Skills give Claude new capabilities through instructions and code, which also means a malicious Skill can direct Claude to invoke tools or execute code in ways that don't match the Skill's stated purpose."*

and, in a warning block, *"Depending on what access Claude has when executing the Skill, malicious Skills could lead to data exfiltration, unauthorized system access, or other security risks."* Also flagged: *"External sources are risky… fetched content may contain malicious instructions. **Even trustworthy Skills can be compromised if their external dependencies change over time**"* — i.e. the rug-pull class from dossier §4.5, in the vendor's own docs.

The enterprise page is blunter and carries a **ready-made classroom artifact**: a risk-tier table rating code execution (*"scripts run with full environment access"* — High), instruction manipulation (*"Directives to ignore safety rules, hide actions from users, or alter Claude's behavior conditionally"* — High), MCP server references (High), network access patterns (High, exfiltration vector), hardcoded credentials (High), filesystem scope including `../` traversal (Medium), tool invocations (Medium) — plus a review checklist requiring scripts be run in a sandbox and **separation of duties between skill authors and reviewers**. *"Never deploy Skills from untrusted sources without a full audit… Treat Skill installation with the same rigor as installing software on production systems."* ([Skills for enterprise](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/enterprise.md)). A beta **Skill content scanning** feature exists for Claude Enterprise (claude.ai and Cowork only, **not** the Skills API or Console, excluded under CMEK/ZDR/HIPAA configurations) and *"complements, but doesn't replace, the review checklist."*

### The CISO guide — exists, but not where you'd look

Exact title **"Zero risk isn't the job: a CISO's guide to agentic AI"**, by **Jason Clinton, Anthropic's Deputy CISO**, **2026-07-17** — on the *Claude* blog, not anthropic.com ([Zero risk isn't the job: a CISO's guide to agentic AI, 2026-07-17](https://claude.com/blog/ciso-guide-to-agentic-ai)). Thesis: *"A CISO's responsibility in the age of agentic AI is not to achieve zero risk. Instead, our jobs are to make agentic risk **legible and bounded**."* And the reason blanket refusal fails: *"Saying 'no' to these requests produces shadow adoption, which has zero telemetry and generally no off switch. Saying 'yes' without controls produces incidents."*

Its **four assessment questions** are the best-shaped thing in this whole supplement for a 250-line module, because they are a decision procedure rather than a taxonomy:

1. *"What untrusted content does it ingest?"* — untrusted = anything an attacker could write or alter. *"If the answer is 'nothing,' the agent-specific risk is near zero and you should move quickly."*
2. *"What actions can it take, and on whose behalf?"* — read-only vs read/write; tool calls, code execution and network egress each widen the aperture.
3. *"What is the blast radius if it is misaligned?"* — *"Scope × severity is the quick calculation."*
4. *"What observability do I have?"* — can you distinguish agent actions from user actions in your SIEM?

Note questions 1–3 are the **lethal trifecta restated as an intake checklist** (dossier §1.6). Its seven technical controls — IdP-issued identity (SAML/OIDC + SCIM), connector allowlists, per-tool action approval (*"allow drafting docs but never automatically send them"*), sandboxed ephemeral execution (*"The environment the agent loop runs in should never hold a credential worth stealing"*), **egress allowlisting** (*"All traffic leaving the agent's execution environment should pass through a proxy that environment cannot reconfigure or bypass"*), OpenTelemetry into the SIEM, and an org-wide off switch — line up almost one-to-one with what Module 11 teaches as mechanism.

### Claude Code security docs — both resolve

- **[Claude Code Security](https://code.claude.com/docs/en/security)** — headings: How we approach security (Security foundation; Permission-based architecture; Built-in protections; User responsibility) · Protect against prompt injection (Core protections; Privacy safeguards; Additional safeguards) · MCP security · IDE security · Cloud execution security · Security best practices · Reporting security issues.
- **[Configure the sandboxed Bash tool](https://code.claude.com/docs/en/sandboxing)** — *"you define which files and network domains commands can touch, and **the operating system enforces that boundary** for every Bash command and its child processes."* Headings include Sandbox modes (incl. *"The unsandboxed retry escape hatch"*), Protect credentials, How sandboxing works (Filesystem isolation; Protected paths; Network isolation; OS-level enforcement; How sandboxing relates to permissions and permission modes), organisation-wide managed settings, and — worth assigning — a **"Security limitations"** subsection under Troubleshooting.

## Compliance touchpoints

Keep this to **one paragraph each in the module**. The engineer's takeaway is the same for both: *nothing here changes a line of your code; know the names so you can answer the questionnaire.*

### ISO/IEC 42001 — the AI-specific one, and it is org-level

**ISO/IEC 42001:2023, "Information technology — Artificial intelligence — Management system"**, Edition 1, **published 2023-12-18**, 51 pages, status Published (ISO stage 60.60), prepared by ISO/IEC JTC 1/SC 42 ([ISO/IEC 42001:2023 | IEC Webstore](https://webstore.iec.ch/en/publication/90574); [ISO catalogue page](https://www.iso.org/standard/81230.html)). Scope, verbatim: *"This document specifies the requirements and provides guidance for establishing, implementing, maintaining and continually improving an AI (artificial intelligence) management system within the context of an organization."*

It is a **management system standard (MSS)** run on Plan-Do-Check-Act — ISO draws the contrast itself: *"Implementing this standard means putting in place policies and procedures for the sound governance of an organization in relation to AI"*, as opposed to ISO/IEC 22989 (terminology), 23053 (ML framework), 23894 (AI risk management). It carries **Annex A (normative) "Reference control objectives and controls"** and **Annex B (normative) "Implementation guidance for AI controls"** ([official 14-page preview PDF](https://cdn.standards.iteh.ai/samples/81230/4c1911ebc9a641fcb6ee21aa09c28ad3/ISO-IEC-42001-2023.pdf)). Two companions are published: **ISO/IEC 42005:2025** (AI system impact assessment, 2025-05-28, guidance not certifiable) and **ISO/IEC 42006:2025** (requirements for bodies auditing/certifying an AIMS, 2025-07-07) — the latter is what makes 42001 certification accreditable.

**What an engineer building agents actually has to do differently: essentially nothing directly.** 42001 asks the *organization* for policy, roles, risk assessment, impact assessment and continual improvement. What lands on a developer is paperwork adjacent to work they should do anyway: recording which model/version an agent uses, keeping an inventory of tools and data sources, retaining logs of agent actions, and documenting who approved a deployment. If someone tells you 42001 requires a specific technical control on your agent, ask them which Annex A control — the answer is usually organizational.

⚠️ **Two traps.** (1) **`iso.org/standard/42001.html` is NOT ISO/IEC 42001.** The URL segment is ISO's internal record ID, not the standard number — the correct page is `iso.org/standard/81230.html`, and `…/42006.html` resolves to a completely unrelated standard (ISO 24095:2009). Do not put the wrong URL in a course. (2) `iso.org` returns **HTTP 403** (Cloudflare) to automated fetches; the **IEC Webstore** co-publishes the same documents and is not blocked — use it. `[UNVERIFIED]` No second edition or amendment is visible at ISO as of 2026-08-25. A European adoption **EN ISO/IEC 42001:2026** appears to exist but could not be confirmed on a fetched page — and a CEN "EN" adoption is a regional republication, **not** an ISO v2. Do not teach it as one. `[UNVERIFIED]` The widely-repeated "38 controls across 9 objectives" figure — the preview stops before Annex A's body. **Do not state a control count.**

### SOC 2 — not a certification, and has nothing to say about AI

SOC 2 is an **attestation examination performed by a CPA firm**, not a certification. The authoritative AICPA guide is titled *"SOC 2® Reporting on an **Examination** of Controls at a Service Organization Relevant to Security, Availability, Processing Integrity, Confidentiality, or Privacy"* ([AICPA publication page, AAGSOP22E, 2022](https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)). The **five Trust Services Categories** are exactly: **Security, Availability, Processing Integrity, Confidentiality, Privacy**, defined in *"2017 Trust Services Criteria (With Revised Points of Focus – 2022)"*, owned by AICPA's Assurance Services Executive Committee ([2017 Trust Services Criteria, dated 2023-09-30](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)). Type 2 reports include *"tests of controls and results thereof"*, which Type 1 lacks ([Illustrative SOC 2® Report](https://www.aicpa-cima.com/resources/download/illustrative-soc-2-r-report-with-description-and-assertion)); the crisp "Type 1 = design at a point in time, Type 2 = design *and* operating effectiveness over a period" formulation is correct and standard but sits inside login-gated AICPA PDFs — `[UNVERIFIED from a fetched AICPA page]`, so state it without an AICPA URL.

**SOC 2 is confirmed NOT AI-specific.** The Trust Services Criteria are generic information-system criteria; AICPA publishes mappings to **ISO 27001** and **NIST 800-53** and to no AI framework, and searching the fetched SOC pages for "artificial intelligence" returns **zero hits**. AICPA's only AI output is non-authoritative guidance (the CPA Canada & AICPA "Closing the AI trust gap" series).

**What an engineer actually has to do differently: nothing AI-specific — which is the whole point.** SOC 2 will pull an agent into an existing control narrative: access control over the credentials the agent holds, change management over the agent's configuration (`.claude/settings.json`, skills, hooks and MCP config become auditable artifacts), and **logging/monitoring that can distinguish an agent's actions from a human's** — the one requirement that is genuinely harder for agents and that the Anthropic CISO guide's question 4 also lands on. **The line to teach:** *"if a vendor says their AI product is 'SOC 2 certified for AI', that is doubly wrong — SOC 2 is an attestation, not a certification, and it has no AI criteria. ISO/IEC 42001 is the AI-specific instrument."*

Worth one aside for a security course: AICPA currently carries a notice that it is *"looking into allegations published anonymously about the business practices of a compliance vendor that offers Systems and Organization Control (SOC) services"*, alongside 2026 Journal of Accountancy pieces *"Promises of 'fast and easy' threaten SOC credibility"* and *"The risks of quick-turn SOC engagements"* ([SOC Suite of Services](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services)). A SOC 2 report is worth exactly as much as the rigor of the firm that issued it.

---

## MCP spec security

### Current revision: 2026-07-28 — and it is a restructure, not a bump

*"The current protocol version is 2026-07-28"* ([Versioning — Model Context Protocol](https://modelcontextprotocol.io/specification/versioning)); the spec index redirects to `/specification/2026-07-28` and its header reads *"Version 2026-07-28 (latest)"*. Published revisions, from the spec repo: **2024-11-05, 2025-03-26, 2025-06-18, 2025-11-25, 2026-07-28**, plus a rolling `draft` ([spec repo contents API](https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/contents/docs/specification)). Versions are `YYYY-MM-DD` marking *"the last date backwards incompatible changes were made"*, and revisions are marked Draft / Current / Final.

**2026-07-28 removed protocol-level sessions.** MCP is now stateless with **no `initialize` handshake** — *"Every request declares the protocol version it is using"* via `io.modelcontextprotocol/protocolVersion` in `_meta` (and the `MCP-Protocol-Version` header on Streamable HTTP). Revisions ≥2026-07-28 are termed **"Modern"**, ≤2025-11-25 **"Legacy"**. **Any module content written against 2025-06-18 or 2025-11-25 is now describing Legacy MCP.**

### Three corrections to where the security content lives

1. **`/specification/<rev>/basic/security_best_practices` no longer exists.** It redirects to **`/docs/2026-07-28/tutorials/security/security_best_practices`** — the page moved out of the spec tree into the docs/tutorials tree.
2. The spec tree's own *normative* security page is now **`/specification/2026-07-28/basic/authorization/security-considerations`**, titled **"Authorization Security Considerations"**.
3. **There is no "Session Hijacking" section any more.** It was replaced by **"State Handle Hijacking"** when sessions were removed; the page explicitly defers old guidance: *"For guidance on securing the server-assigned session IDs used by protocol version 2025-11-25 and earlier, see Session Hijacking in the 2025-11-25 version of this page."*

### Security Best Practices — exact section names

Two H2s only: **`Introduction`** and **`Attacks and Mitigations`**. The H3s under them, **in order**: `Purpose and Scope` · **`Confused Deputy Problem`** · **`Token Passthrough`** · `Server-Side Request Forgery (SSRF)` · **`State Handle Hijacking`** · `Local MCP Server Compromise` · `OAuth Authorization URL Validation` · `stdio Transport Security in Proxy Scenarios` · `Mix-Up Attacks` · `Localhost Redirect URI Impersonation` · `CIMD Trust Policies` · `Scope Minimization` ([Security Best Practices, revision 2026-07-28](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices); heading levels confirmed against the [.mdx source](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/docs/docs/2026-07-28/tutorials/security/security_best_practices.mdx)).

### Confused-deputy language, verbatim

The attack:

> *"Attackers can exploit MCP proxy servers that connect to third-party APIs, creating "confused deputy" vulnerabilities. This attack allows malicious clients to obtain authorization codes without proper user consent by exploiting the combination of static client IDs, dynamic client registration, and consent cookies."*

Four **Vulnerable Conditions**, all of which must hold: static client ID with a third-party AS · MCP clients may dynamically register (each getting their own `client_id`) · the third-party AS sets a consent cookie after first authorization · the proxy *"does not implement proper per-client consent before forwarding to third-party authorization"*. The pivot in the attack flow: *"their browser still has the consent cookie from the previous legitimate request… The third-party authorization server detects the cookie and skips the consent screen."*

The mandated mitigation:

> *"To prevent confused deputy attacks, MCP proxy servers **MUST** implement per-client consent and proper security controls as detailed below."*

with five MUST blocks — *Per-Client Consent Storage* (*"Maintain a registry of approved client_id values per user"*), *Consent UI Requirements* (identify the client by name, show scopes and the registered `redirect_uri`, CSRF protection, *"Prevent iframing via frame-ancestors CSP directive or `X-Frame-Options: DENY`"*), *Consent Cookie Security* (*"Use `__Host-` prefix… Set `Secure`, `HttpOnly`, and `SameSite=Lax`… Bind to the specific client_id (not just 'user has consented')"*), *Redirect URI Validation* (exact string matching, no wildcards), and *OAuth State Parameter Validation*, closing with: *"The consent cookie or session containing the state value **MUST NOT** be set until after the user has approved the consent screen at the MCP server's authorization endpoint."*

**The single sentence to quote in the module** is on the normative spec page, not the tutorial:

> *"MCP proxy servers using static client IDs **MUST** obtain user consent for each dynamically registered client before forwarding to third-party authorization servers."* ([Authorization Security Considerations, revision 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations))

### Token Passthrough — the other one worth teaching

> *""Token passthrough" is an anti-pattern where an MCP server accepts tokens from an MCP client without validating that the tokens were properly issued to the MCP server and passes them through to the downstream API."*

Named risks: Security Control Circumvention, Accountability and Audit Trail Issues, Trust Boundary Issues, Future Compatibility Risk — and the spec notes passthrough *"can potentially cause the 'confused deputy' problem"*. The rule is a single MUST NOT:

> *"MCP servers **MUST NOT** accept any tokens that were not explicitly issued for the MCP server."*

### Authorization spec — what it normatively requires

`/specification/2026-07-28/basic/authorization`. **Authorization is OPTIONAL** for MCP implementations; HTTP transports SHOULD conform, and STDIO SHOULD NOT — it should *"retrieve credentials from the environment."* **Roles:** the MCP server acts as an **OAuth 2.1 resource server** (*not* an authorization server); the MCP client as an OAuth 2.1 client; the AS is out of scope.

**Normative standards:** OAuth 2.1 (**draft-ietf-oauth-v2-1-13**), RFC 6750, **RFC 8414** (AS Metadata), **RFC 7591** (Dynamic Client Registration), **RFC 8707** (Resource Indicators), **RFC 9728** (Protected Resource Metadata), **RFC 9207**, draft-ietf-oauth-client-id-metadata-document-00, OIDC Discovery 1.0, OIDC Dynamic Client Registration 1.0.

Key MUSTs:

- *"MCP servers **MUST** implement OAuth 2.0 Protected Resource Metadata (RFC9728). MCP clients **MUST** use OAuth 2.0 Protected Resource Metadata for authorization server discovery."*
- **Resource Indicators:** *"MCP clients **MUST** implement Resource Indicators for OAuth 2.0 as defined in RFC 8707… The `resource` parameter: 1. **MUST** be included in both authorization requests and token requests. 2. **MUST** identify the MCP server that the client intends to use the token with."* — and clients *"**MUST** send this parameter regardless of whether authorization servers support it."*
- **No passthrough, both directions:** *"MCP clients **MUST NOT** send tokens to the MCP server other than ones issued by the MCP server's authorization server. MCP servers **MUST** only accept tokens that are valid for use with their own resources. MCP servers **MUST NOT** accept or transit any other tokens."* And on the security-considerations page: *"The MCP server **MUST NOT** pass through the token it received from the MCP client."*
- PKCE is mandatory (`S256` when capable), and if `code_challenge_methods_supported` is absent, *"MCP clients **MUST** refuse to proceed."*
- ⚠️ **Change worth flagging:** **RFC 7591 Dynamic Client Registration has been demoted to MAY and marked deprecated** — *"Note that Dynamic Client Registration is deprecated and retained for backwards compatibility with authorization servers that do not support Client ID Metadata Documents."* CIMD is the new preferred path (SHOULD). Older tutorials that present DCR as the way to do MCP auth are out of date.

### The spec index's own "Security and Trust & Safety" section

On `/specification/2026-07-28` itself, with subsections `Key Principles` and `Implementation Guidelines`. Three principles: **User Consent and Control** (*"Users must explicitly consent to and understand all data access and operations"*), **Data Privacy** (*"Hosts must obtain explicit user consent before exposing user data to servers"*), and — the one for this module — **Tool Safety**:

> *"Tools represent arbitrary code execution and must be treated with appropriate caution… descriptions of tool behavior such as annotations **should be considered untrusted, unless obtained from a trusted server**… Hosts must obtain explicit user consent before invoking any tool."*

**That middle clause is MCP tool poisoning acknowledged in the specification itself** — pair it directly with OWASP `MCP03 Tool Poisoning` (dossier §3.5) and `T16` above, and it closes the dossier's §4.5 `> TODO` on needing a primary source for tool poisoning.

**Caveat the module should state:** these principles are written in lowercase "must" and are therefore **not** BCP-14 normative; only the capitalized SHOULD list under Implementation Guidelines is. The spec is explicit that *"MCP itself cannot enforce these security principles at the protocol level."* In other words: **MCP's security model is advice to implementers, not a protocol guarantee.** That is exactly the kind of thing an intermediate developer should learn to read off a spec.

---

## Standards map

Honest column is the fourth one. **A working developer building a coding agent needs three rows and can safely ignore the rest** unless a compliance function asks.

| Framework | What it is | Who it's for | Does a working developer need it? | URL |
|---|---|---|---|---|
| **OWASP LLM Top 10 2026** | 10 risks for LLM-in-an-app | Builders + security | **YES — read it.** The shared vocabulary. Already in dossier §3.3. | [genai.owasp.org](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/) |
| **OWASP Top 10 for Agentic Applications 2026 (ASI01–ASI10)** | 10 risks once the model *acts* | Builders + security leaders | **YES — read it.** 57pp, skim the ten entries + Appendix A. This is the agent list. | [PDF via OWASP corpus](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/2026-final/OWASP-Top-10-for-Agentic-Applications-2026-v1.0.pdf) |
| **OWASP Agentic AI – Threats & Mitigations v1.1 (T1–T17)** | The granular taxonomy the Top 10 is distilled from | Threat modellers | **Reference only.** Look up a T-code when a Top 10 entry cites one. Don't read 53pp. | [PDF via OWASP corpus](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/companions/Agentic-AI-Threats-and-Mitigations-1.1.pdf) |
| **OWASP Securing Agentic Applications Guide v1.0** | Lifecycle controls: design→build→deploy→run, per-capability | **Developers**, explicitly | **YES, selectively** — §5.2 Code Execution, §5.5 Filesystem/OS, §9 Runtime hardening. Skip the rest. | [PDF via OWASP corpus](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/companions/Securing-Agentic-Applications-Guide-1.0.pdf) |
| **OWASP MAS Threat Modelling Guide v1.0 (MAESTRO)** | 7-layer threat-modelling method for multi-agent systems | Architects of MAS | **No** — unless you're actually building a multi-agent system. §5 (MCP threat model) is the one skimmable part. | [PDF via OWASP corpus](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/companions/Agentic-AI-MAS-Threat-Modelling-Guide-v1.0.pdf) |
| **OWASP GenAI Red Teaming Guide (2025-01-22)** | Four-area red-teaming approach for GenAI | Red teamers, CISOs | **No** — pre-agentic and process-level. Cite it, don't assign it. | [Wayback snapshot](http://web.archive.org/web/20260822000331/https://genai.owasp.org/resource/genai-red-teaming-guide/) |
| **OWASP MCP Top 10 (2025)** | 10 MCP-specific risks | Anyone shipping/consuming MCP | **YES** if you touch MCP. Already in dossier §3.5. | [owasp.org](https://owasp.org/www-project-mcp-top-10/) |
| **MCP specification — Security Best Practices + Authorization (rev. 2026-07-28)** | Normative MUST/SHOULD for MCP implementers | MCP **server/client authors** | **Only if you write an MCP server.** Consumers get more from the OWASP MCP Top 10 — *except* the spec's one-paragraph "Tool Safety" principle, which everyone should read. | [Security Best Practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices) · [Authorization Security Considerations](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations) |
| **Google SAIF / SAIF 2.0 + agent paper** | Vendor framework; hybrid two-layer agent defense + 3 principles | Architects, security leaders | **The paper: yes** (~20pp, best articulation of *why* guardrails alone fail). **SAIF itself: no** — it's an org-level framework. | [saif.google](https://saif.google/) · [agent paper PDF](https://storage.googleapis.com/gweb-research2023-media/pubtools/1018686.pdf) |
| **MITRE ATLAS** | Attack technique catalogue (ATT&CK for AI) | Security teams | **Lookup only.** Useful for talking to your security team. Dossier §3.6. | [atlas.mitre.org](https://atlas.mitre.org/) |
| **NIST AI 100-2e2025 / AI 600-1** | Adversarial-ML taxonomy; GenAI risk profile | Researchers, risk functions | **No.** Cite for authority; the module reuses dossier §3.7's extracts. | [NIST PDF](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-2e2025.pdf) |
| **UK AISI — Inspect / Inspect Cyber / ControlArena** | MIT-licensed eval + AI-control harnesses; agent-native | Anyone building agent evals | **Inspect: yes if you're writing evals.** ControlArena: read the README for the ideas, don't adopt it. | [inspect.aisi.org.uk](https://inspect.aisi.org.uk/) |
| **Anthropic threat-intel reports** | First-party incident reporting on agentic misuse | Everyone | **YES — read one.** The Aug 2025 "vibe hacking" report is the module's motivating story. | [anthropic.com](https://www.anthropic.com/news/detecting-countering-misuse-aug-2025) |
| **Anthropic CISO guide (2026-07-17)** | 4 intake questions + 7 controls | Security leaders, tech leads | **YES — the four questions.** Short, actionable, free. | [claude.com/blog](https://claude.com/blog/ciso-guide-to-agentic-ai) |
| **Agent Skills security docs** | Trust model for skills; enterprise risk-tier table | Anyone installing skills | **YES** — one page, directly actionable. | [docs.claude.com](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/enterprise.md) |
| **ISO/IEC 42001:2023** | AI management system standard (certifiable, org-level, PDCA) | Org / compliance function | **No, not personally.** Know it exists, that it is org-level not code-level, and that its URL is `/standard/81230.html`. | [IEC Webstore](https://webstore.iec.ch/en/publication/90574) |
| **SOC 2** | CPA *attestation* over the 5 Trust Services Criteria; **no AI criteria** | Vendors, procurement | **No.** You will be *asked* for it; you will not *do* it. One line: it is not a certification and it says nothing about AI. | [AICPA](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services) |
| **EU AI Act** | Regulation | Legal / product | **No** — awareness only. Dossier §3.8. | [EC page](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai) |

---

## What to teach vs what to skip

For a **~250-line intermediate module**, standards should be **≤25 lines total**. They are the vocabulary, not the content. The dossier's attack material (§4) and the trifecta framing (§1.6) are the module; this supplement is a lookup table you draw three things from.

**TEACH (~20-25 lines):**

1. **The two-list structure, in four lines.** LLM Top 10 = model-as-component; Agentic Top 10 = model-as-actor. Give the ten ASI names in one table. State the boundary in OWASP's own words (dossier §1.2). That's it — do not enumerate T1–T17 in the module body.
2. **One sentence of ID hygiene, because it will save a student real embarrassment:** *"OWASP publishes these lists on separate clocks; the Agentic Top 10 cross-maps to the 2025 LLM numbering, which the 2026 LLM list changed. Cite by name, and always with the year."* This single sentence is worth more than any taxonomy dump.
3. **Google's two-layer model + three principles (~6 lines).** Deterministic policy engine (Layer 1) and reasoning-based defense (Layer 2), with the verbatim *"neither… sufficient on their own."* Then: human controllers / limited powers / observable actions. This is the module's defensive spine and it is vendor-neutral in substance.
4. **The Anthropic CISO guide's four intake questions (~5 lines).** They are the trifecta as a checklist a student can run on Monday against their own agent. Best ROI in this whole file.
5. **One real incident, told properly (~4 lines).** Pick the Aug 2025 "vibe hacking" report — *"Claude was allowed to make both tactical and strategic decisions"* — because it is first-party, dated, and about a *coding agent*. Optionally pair with the July/Aug 2026 containment incidents (Anthropic's 3-of-141,006 and AISI's 10-of-122) as the "sandbox you believe in vs sandbox that is enforced" lesson.
6. **Skills/MCP trust model, one line + one link.** *"Treat installing a skill or an MCP server like installing software."* Link the enterprise risk-tier table as the exercise.

**SKIP (say why, briefly, so students don't feel they're missing something):**

- **T1–T17.** Reference-only. Mentioning that it exists (and that the Top 10 maps onto it) is enough; reproducing it doubles the taxonomy load for zero decision-making gain.
- **MAESTRO / the MAS threat-modelling guide.** Multi-agent systems are out of scope for a module about *a* coding agent.
- **ISO/IEC 42001, SOC 2, EU AI Act.** One combined sentence: *"These are org-level obligations your compliance function owns. Nothing in them changes a line of your code. Know the names so you can answer the questionnaire."* Then move on. **The module must not become a compliance reading list** — that is the single biggest failure mode available here.
- **NIST, ATLAS, CoSAI, AIVSS, CycloneDX/AIBOM, the NHI Top 10.** Name-drop at most, in the further-reading list. A developer who needs ATLAS will be told by their security team.
- **The OWASP GenAI Red Teaming Guide** as assigned reading — it is pre-agentic and process-shaped. §7.1 of the Securing Agentic Applications Guide is strictly better for this audience.
- **SAIF's six core elements.** Org-level; superseded in usefulness by the agent paper.

**One structural recommendation:** put the standards content in a single "Where this fits in the standards landscape" section *after* the attack material, not before it. Leading with taxonomies is how security modules lose engineers in the first screenful.

---

## References for the module

Curated to 9. Every one fetched and confirmed on 2026-08-25.

1. **[OWASP Top 10 for Agentic Applications 2026 (v1.0, December 2025)](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/2026-final/OWASP-Top-10-for-Agentic-Applications-2026-v1.0.pdf)** — ASI01–ASI10 plus Appendix A's cross-map. Resource page: [genai.owasp.org, 2025-12-09](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) (frequently 429s).
2. **[OWASP Securing Agentic Applications Guide v1.0 (2025-07-28)](https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/companions/Securing-Agentic-Applications-Guide-1.0.pdf)** — §5.2, §5.5, §9 for coding agents specifically.
3. **[Google's Approach for Secure AI Agents: An Introduction (May 2025)](https://storage.googleapis.com/gweb-research2023-media/pubtools/1018686.pdf)** — the hybrid two-layer argument and the three agent principles.
4. **[Architecting Security for Agentic Capabilities in Chrome (2025-12-08)](https://blog.google/security/architecting-security-for-agentic/)** — the same doctrine shipped; User Alignment Critic, Origin Sets.
5. **[Zero risk isn't the job: a CISO's guide to agentic AI (2026-07-17)](https://claude.com/blog/ciso-guide-to-agentic-ai)** — four intake questions, seven controls.
6. **[Detecting and countering misuse of AI: August 2025 (2025-08-27)](https://www.anthropic.com/news/detecting-countering-misuse-aug-2025)** — "vibe hacking"; the motivating incident.
7. **[Agent Skills for enterprise — security review (docs.claude.com)](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/enterprise.md)** — risk-tier table; use as the module's review exercise.
8. **[AI threats in the wild: The current state of prompt injections on the web (2026-04-23)](https://blog.google/security/prompt-injections-web/)** — real measured prevalence; the deflationary counterweight.
9. **[Inspect (UK AI Security Institute), MIT](https://inspect.aisi.org.uk/)** — if the module has a "how would I test this" pointer, this is it; agent-native, sandboxed, MIT.

---

## Link Verification Log

| URL | Fetch result | Date checked | Claim it supports |
|---|---|---|---|
| https://api.github.com/repos/GenAI-Security-Project/GenAI-Agent-Security-Initiative/git/trees/HEAD?recursive=1 | 200 JSON | 2026-08-25 | 0.5-initial-candidates uses ASI01–ASI16 with T-names; Sprint 1 draft uses ASI01–ASI10 |
| https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Agent-Security-Initiative/main/agentic-top-10/Sprint%201-first-public-draft-expanded/README.md | 200 | 2026-08-25 | First public draft named ASI01 "Agent Behaviour Hijack" (later "Agent Goal Hijack") |
| https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/MANIFEST.yaml | 200 | 2026-08-25 | Provenance/versions/licenses of every OWASP doc; 0.5 candidates marked superseded; red-teaming artifact inventory |
| https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/companions/Agentic-AI-Threats-and-Mitigations-1.1.pdf | 200, PDF 2,398,898 B, `pdftotext -layout` run locally | 2026-08-25 | "Version 1.1 / December 2025"; **T1–T17 verbatim**; T16 & T17 text; CC BY-SA 4.0 |
| https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/2026-final/OWASP-Top-10-for-Agentic-Applications-2026-v1.0.pdf | 200, PDF 1,274,186 B, `pdftotext -layout` run locally | 2026-08-25 | "Version 2026 / December 2025"; **ASI01–ASI10 verbatim**; Appendix A ASI→T→LLM matrix; "T1–T17 represent granular attack pathways referenced by the ASI framework" |
| https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/companions/Securing-Agentic-Applications-Guide-1.0.pdf | 200, PDF, 81 pp | 2026-08-25 | "Version 1.0 / July 28, 2025 / Status: Released"; full ToC incl. KC6.x and §9 runtime hardening |
| https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-Security-Advisor/main/corpus/agentic-top10/companions/Agentic-AI-MAS-Threat-Modelling-Guide-v1.0.pdf | 200, PDF, 63 pp | 2026-08-25 | "Version 1.0 / April 22, 2025 / Status: Released"; MAESTRO expansion; §5 MCP threat model |
| https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ | **200** (rare success) | 2026-08-25 | Publication date **December 9, 2025** |
| https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/ | **200** (rare success) | 2026-08-25 | Threats & Mitigations first published **February 17, 2025**; "first in a series of guides from the OWASP Agentic Security Initiative (ASI)" |
| https://genai.owasp.org/resource/securing-agentic-applications-guide-1-0/ | **200** (rare success) | 2026-08-25 | Site-stated date July 27, 2025 (document cover says July 28) |
| https://genai.owasp.org/resource/agentic-ai-red-teaming-guide/ | **429** | 2026-08-25 | Rate-limited; **no Wayback snapshot exists either** → document by this name not confirmed to exist |
| https://genai.owasp.org/resource/genai-red-teaming-guide/ | **429** live | 2026-08-25 | Live page rate-limited |
| http://web.archive.org/web/20260822000331/https://genai.owasp.org/resource/genai-red-teaming-guide/ | 200 (snapshot 2026-08-22) | 2026-08-25 | **GenAI Red Teaming Guide, January 22, 2025**; four-area approach verbatim; sidebar confirms "Solutions Landscape – Red Teaming Taxonomy, June 28, 2026" |
| https://archive.org/wayback/available?url=genai.owasp.org/resource/agentic-ai-red-teaming-guide/ | 200, `"archived_snapshots": {}` | 2026-08-25 | No snapshot ever taken of that URL |
| https://genai.owasp.org/download/45674/ and /download/52117/ | **429 on every attempt** (5 retries, 70 s backoff) | 2026-08-25 | OWASP's own PDF download endpoints unreachable — reason for using the GitHub-vendored copies |
| https://blog.google/innovation-and-ai/technology/safety-security/introducing-googles-secure-ai-framework/ | 200 | 2026-08-25 | SAIF = Secure AI Framework, introduced 2023-06-08; six elements |
| https://safety.google/cybersecurity-advancements/saif/ | 200 (no date stamp) | 2026-08-25 | Six core elements, exact current wording |
| https://blog.google/innovation-and-ai/technology/safety-security/ai-security-frontier-strategy-tools/ | 200 | 2026-08-25 | **SAIF 2.0, 2025-10-06**; three new elements; three agent principles |
| https://saif.google/focus-on-agents | 200 | 2026-08-25 | Agent risk map: Sensitive Data Disclosure + Rogue Actions; Agent Observability (New); links the May 2025 PDF as current |
| https://storage.googleapis.com/gweb-research2023-media/pubtools/1018686.pdf | 200, application/pdf | 2026-08-25 | **Real title** "Google's Approach for Secure AI Agents: An Introduction", May 2025, Díaz/Kern/Olive; §04 three principles; §05 Layer 1/Layer 2; "neither… sufficient on their own" |
| https://research.google/pubs/an-introduction-to-googles-approach-for-secure-ai-agents/ | 200 | 2026-08-25 | Publication record title + abstract with hybrid stance |
| https://www.oasis-open.org/2025/09/16/google-donates-secure-ai-framework-saif-data-to-coalition-for-secure-ai/ | 200 | 2026-08-25 | SAIF→CoSAI donation 2025-09-16; CoSAI-RM |
| https://blog.google/security/prompt-injections-web/ | 200 | 2026-08-25 | 2026-04-23; injection categories in the wild; **+32% malicious Nov 2025→Feb 2026** |
| https://blog.google/security/architecting-security-for-agentic/ | 200 | 2026-08-25 | 2025-12-08; User Alignment Critic; Origin Sets; dual-LLM/CaMeL inspiration |
| https://blog.google/security/mitigating-prompt-injection-attacks/ | 200 | 2026-08-25 | 2025-06-13; five named Gemini defenses |
| https://blog.google/security/google-workspaces-continuous-approach-to-mitigating-indirect-prompt-injections/ | 200 | 2026-08-25 | 2026-04-02; "IPI is not the kind of technical problem you 'solve' and move on" |
| https://www.gov.uk/government/news/tackling-ai-security-risks-to-unleash-growth-and-deliver-plan-for-change | 200 | 2026-08-25 | **AISI rename 2025-02-14** + stated reason |
| https://www.aisi.gov.uk/blog/principles-for-safeguard-evaluation | 200 | 2026-08-25 | Corroborates rename date from AISI's own site |
| https://www.aisi.gov.uk/ | 200 | 2026-08-25 | Current site; DSIT research organisation; mission |
| https://api.github.com/repos/UKGovernmentBEIS/inspect_ai | 200 | 2026-08-25 | Canonical Inspect repo, description, homepage |
| https://api.github.com/repos/UKGovernmentBEIS/inspect_ai/releases/latest | **404** | 2026-08-25 | **No GitHub Releases** — version must come from PyPI |
| https://pypi.org/pypi/inspect-ai/json | 200 | 2026-08-25 | **inspect-ai 0.3.260, uploaded 2026-08-21**; MIT |
| https://raw.githubusercontent.com/UKGovernmentBEIS/inspect_ai/main/LICENSE | 200 | 2026-08-25 | **MIT**, "Copyright (c) 2024 UK AI Security Institute" |
| https://inspect.aisi.org.uk/index.html.md | 200 | 2026-08-25 | Agent evals, Claude Code/Codex CLI/Gemini CLI, MCP tools, sandboxing — Inspect explicitly targets agents |
| https://inspect.aisi.org.uk/sandboxing.html.md | 200 | 2026-08-25 | Sandbox required for bash/python/text_editor/web_browser |
| https://raw.githubusercontent.com/UKGovernmentBEIS/inspect_cyber/main/README.md | 200 | 2026-08-25 | "agentic cyber evaluations", AISI-developed |
| https://raw.githubusercontent.com/UKGovernmentBEIS/control-arena/main/README.md | 200 | 2026-08-25 | AISI + Redwood Research; AI Control definition; code-sabotage settings |
| https://www.aisi.gov.uk/blog/how-our-new-control-red-team-is-stress-testing-frontier-monitors | 200 | 2026-08-25 | 2026-07-23; "We found vulnerabilities in every monitor version we tested" |
| https://www.aisi.gov.uk/blog/incident-report-unsanctioned-agent-behaviour-during-cyber-testing | 200 | 2026-08-25 | 2026-08-04; 10/122 runs, 19 actions; not a sandbox escape |
| https://www.ncsc.gov.uk/blog-post/from-bugs-to-bypasses-adapting-vulnerability-disclosure-for-ai-safeguards | 200 | 2026-08-25 | 2025-09-02; CVD extended to AI safeguards |
| https://www.anthropic.com/transparency/system-trust-reporting | 200 | 2026-08-25 | Canonical list of Anthropic threat-intel reports |
| https://www.anthropic.com/news/detecting-countering-misuse-aug-2025 | 200 | 2026-08-25 | 2025-08-27; "Agentic AI has been weaponized"; vibe hacking, 17 orgs, >$500k; Claude Code tactical+strategic decisions |
| https://www.anthropic.com/news/disrupting-AI-espionage | 200 | 2026-08-25 | 2025-11-13; ~30 targets; "first documented case of a large-scale cyberattack executed without substantial human intervention"; Intelligence/Agency/Tools |
| https://www.anthropic.com/news/AI-enabled-cyber-threats-mitre-attack | 200 | 2026-08-25 | 2026-06-03; 832 accounts; 33%→56%; ATT&CK coverage gap |
| https://www.anthropic.com/news/investigating-incidents-cybersecurity-evals | 200 | 2026-08-25 | 2026-07-30; 141,006 runs, 3 incidents; "a misunderstanding between us and our evaluation partner" |
| https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview.md | 200 | 2026-08-25 | Skills trust model; "Treat like installing software"; external-dependency drift |
| https://docs.claude.com/en/docs/agents-and-tools/agent-skills/enterprise.md | 200 | 2026-08-25 | Risk-tier table; review checklist; Skill content scanning beta + exclusions |
| https://claude.com/blog/ciso-guide-to-agentic-ai | 200 | 2026-08-25 | 2026-07-17, Jason Clinton; "legible and bounded"; four questions; seven controls |
| https://code.claude.com/docs/en/security | 200 | 2026-08-25 | Section headings; permission-based architecture |
| https://code.claude.com/docs/en/sandboxing | 200 | 2026-08-25 | OS-enforced boundary; "Security limitations" subsection |
| https://modelcontextprotocol.io/specification/versioning | 200 | 2026-08-25 | **"The current protocol version is 2026-07-28"**; Draft/Current/Final revision states; `YYYY-MM-DD` scheme |
| https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/contents/docs/specification | 200 | 2026-08-25 | Revision directories: 2024-11-05, 2025-03-26, 2025-06-18, 2025-11-25, **2026-07-28**, draft |
| https://modelcontextprotocol.io/specification/ | 200, **redirects to /specification/2026-07-28** | 2026-08-25 | Current revision is 2026-07-28; header "Version 2026-07-28 (latest)" |
| https://modelcontextprotocol.io/specification/2026-07-28 | 200 | 2026-08-25 | "Security and Trust & Safety" section; three Key Principles incl. **Tool Safety** ("annotations should be considered untrusted"); lowercase-must caveat |
| https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning | 200 | 2026-08-25 | Stateless, no `initialize`; "Modern" ≥2026-07-28 vs "Legacy" ≤2025-11-25 |
| https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices | 200, **redirects to /docs/2026-07-28/tutorials/security/…** | 2026-08-25 | The spec-tree SBP path no longer exists |
| https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices | 200 | 2026-08-25 | Exact H2/H3 section names; confused-deputy attack + 5 MUST blocks; Token Passthrough MUST NOT; **State Handle Hijacking replaces Session Hijacking** |
| https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/docs/docs/2026-07-28/tutorials/security/security_best_practices.mdx | 200 | 2026-08-25 | Heading levels and verbatim MUST/MUST NOT text |
| https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations | 200 | 2026-08-25 | **"MUST obtain user consent for each dynamically registered client"**; "MUST NOT pass through the token"; PKCE/redirect-URI MUSTs |
| https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/docs/specification/2026-07-28/basic/authorization/index.mdx | 200 | 2026-08-25 | OAuth 2.1 draft-13 + RFC list; resource-server role; RFC 8707 MUSTs; RFC 7591 **demoted to MAY / deprecated**; authorization OPTIONAL, STDIO SHOULD NOT |
| https://www.iso.org/standard/81230.html | 200 via text proxy (**direct curl 403 Cloudflare**) | 2026-08-25 | ISO/IEC 42001:2023 title, Ed 1, 2023-12, Published/60.60, 51 pp, MSS framing, no successor in life cycle |
| https://www.iso.org/standard/42001.html | **403 Cloudflare** | 2026-08-25 | Site blocks automated fetch — *and this is not the 42001 page anyway* |
| https://www.iso.org/standard/42006.html | 200 via proxy | 2026-08-25 | Resolves to ISO 24095:2009 — proves URL ID ≠ standard number |
| https://webstore.iec.ch/en/publication/90574 | 200 | 2026-08-25 | ISO/IEC 42001:2023 published **2023-12-18**, Ed 1.0, 51 pp, verbatim scope, JTC 1/SC 42 |
| https://webstore.iec.ch/en/publication/107659 | 200 | 2026-08-25 | ISO/IEC 42005:2025 published 2025-05-28, AI system impact assessment, guidance |
| https://webstore.iec.ch/en/publication/108460 | 200 | 2026-08-25 | ISO/IEC 42006:2025 published 2025-07-07, requirements for AIMS certification bodies |
| https://cdn.standards.iteh.ai/samples/81230/…/ISO-IEC-42001-2023.pdf | 200, PDF (14-pp official preview) | 2026-08-25 | Full title; "First edition 2023-12"; **Annex A (normative) Reference control objectives and controls**, Annex B/C/D — but preview stops before Annex A's body |
| https://webstore.ansi.org/standards/iso/isoiec420012023 | **403 Cloudflare** | 2026-08-25 | Blocked |
| https://standards.iteh.ai/…/en-iso-iec-42001-2026 | 200 but JS-only stub | 2026-08-25 | EN ISO/IEC 42001:2026 **unconfirmable** → `[UNVERIFIED]` |
| https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | 200 | 2026-08-25 | SOC suite definition; **zero hits for "artificial intelligence"**; 2026 SOC-credibility notices |
| https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022 | 200 | 2026-08-25 | Five Trust Services Categories; ASEC ownership; doc dated 2023-09-30 |
| https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy | 200 | 2026-08-25 | Authoritative guide title embedding the five categories; **"Examination"** not certification; AAGSOP22E, 2022 |
| https://www.aicpa-cima.com/resources/download/illustrative-soc-2-r-report-with-description-and-assertion | 200 | 2026-08-25 | Type 2 includes "tests of controls and results thereof" |
| https://www.aicpa-cima.com/resources/download/soc-for-service-organizations-engagements-overview | 200 page, **PDF login-gated** | 2026-08-25 | Formal Type 1/Type 2 definitions NOT retrievable → marked `[UNVERIFIED]` |
| https://www.aicpa-cima.com/resources/download/cpa-canada-and-aicpa-series-on-ai | 200 | 2026-08-25 | AICPA's only AI output is non-authoritative guidance; no AI Trust Services Criteria |

---

## Open questions / [UNVERIFIED]

- `[UNVERIFIED: version]` The **GenAI Red Teaming Guide**'s version number. The resource page (via Wayback) gives the date (2025-01-22) but not a version; the PDF is behind the 429'd `/download/` endpoint.
- `[UNVERIFIED: dates]` Publication dates for OWASP's two MCP-security PDFs (*A Practical Guide for Secure MCP Server Development v1.0*, *Cheat Sheet: Securely Using Third-Party MCP Servers v1.0*) — `published: null` in OWASP's own manifest.
- `[UNVERIFIED: exact day]` Google's agent-security paper states only **"May 2025"**. Do not invent a day.
- `[UNVERIFIED: currency]` The `safety.google` SAIF page carries no publication or last-updated stamp, so the six elements are current-as-of-today by presence only.
- `[UNVERIFIED]` UK AISI's involvement in the Gray Swan Agent Red-Teaming Challenge (search snippet only, never confirmed on a fetched page). Do not publish.
- `[UNVERIFIED]` The Anthropic companion doc *"Preparing your security program for AI-accelerated offense"*, referenced from the CISO guide but not fetched.
- **Discrepancy, unresolved:** the Securing Agentic Applications Guide is dated **July 27, 2025** on the OWASP resource page and **July 28, 2025** on the document's own cover. I used the document. Same class of discrepancy: the Agentic Top 10 resource page says **December 9, 2025** while OWASP's corpus manifest rounds it to `2025-12-01` — the resource page is the better source.
- `[UNVERIFIED: control count]` **ISO/IEC 42001 Annex A.** The official 14-page preview stops before Annex A's body, and `iso.org`/ANSI both 403. **Do not publish the widely-repeated "38 controls across 9 objectives" figure** — it was not confirmable from any fetched authoritative page.
- `[UNVERIFIED]` **EN ISO/IEC 42001:2026** (European CEN adoption). Only search snippets and a JS-only stub page. If it does exist, it is a regional republication, not an ISO second edition.
- `[UNVERIFIED from a fetched page]` The **SOC 2 Type 1 vs Type 2** formal definition ("design at a point in time" vs "design *and* operating effectiveness over a period"). Correct and standard, but the AICPA text stating it is inside login-gated PDFs (SOC Overview, AT-C 320). State it without an AICPA URL.
- `[UNVERIFIED]` That **Security is the only mandatory Trust Services Category**. It follows from the "or" in the guide title and is universally reported, but was not confirmed on a fetched AICPA page.
- **Not attempted:** OWASP AIVSS (AI Vulnerability Scoring System), referenced throughout the Agentic Top 10's Appendix A. If the module ever wants a severity-scoring story, that is the thread to pull.
- **Note for the dossier's §4.5 TODOs:** OWASP now has two dedicated MCP-security PDFs vendored at `corpus/mcp-security/` in the GenAI-Security-Advisor repo. They likely resolve the tool-poisoning / rug-pull primary-source gaps, and were not read here.

---

## RESUME NOTES

**Done — all sections:** OWASP Agentic AI taxonomy (ASI-vs-T resolution, T1–T17, ASI01–ASI10, Appendix A cross-map) · OWASP companion guides · Google SAIF + agent paper · UK AISI + Inspect · Anthropic security material · ISO/IEC 42001 + SOC 2 · MCP spec security (rev. 2026-07-28).

**Nothing is left half-done.** The residual gaps are all *blocked-source* gaps, not unfinished work, and every one is listed under `## Open questions / [UNVERIFIED]`. The three that a future session could still close, in priority order:

1. **ISO/IEC 42001 Annex A control count** — needs a purchased copy or an unblocked mirror; ANSI, ISO and iteh all 403 or serve JS stubs.
2. **SOC 2 Type 1/Type 2 formal wording** — needs a free AICPA account to pull the SOC Overview PDF.
3. **The two OWASP MCP-security PDFs** (`corpus/mcp-security/` in the GenAI-Security-Advisor repo) — not read here, and they very likely close the dossier's §4.5 TODOs on tool poisoning and rug-pulls with primary sources. **This is the highest-value unfollowed lead in the file.**

**Key method notes for a resuming agent:**

- **Blocked hosts encountered:** `genai.owasp.org` (persistent 429, `/download/` endpoints never reachable), `iso.org` / `webstore.ansi.org` / `scc-ccn.ca` (403 Cloudflare), `standards.iteh.ai` (JS stub), `aicpa-cima.com` (200 but React shell; substantive PDFs login-gated). **Working substitutes, in each case:** the GenAI-Security-Project GitHub org; the **IEC Webstore** (co-publishes ISO/IEC standards, not blocked); Wayback for OWASP HTML; the MCP spec's `raw.githubusercontent.com` `.mdx` sources for verbatim normative text.
- **Two URL traps found the hard way** and worth carrying into the module: `iso.org/standard/42001.html` is **not** ISO/IEC 42001 (use `/81230.html`), and `/specification/<rev>/basic/security_best_practices` no longer exists in MCP (it moved to the docs/tutorials tree). `genai.owasp.org` is aggressively rate-limited (429) and its `/download/` endpoints were never reachable. **Do not fight it.** The official PDFs are vendored verbatim, with a provenance manifest, in `https://github.com/GenAI-Security-Project/GenAI-Security-Advisor` under `corpus/` (originals) and `corpus/_extracted/` (CI-extracted text, which carries a header warning not to quote it as citable — download the PDF and run `pdftotext -layout` instead, as was done here). `corpus/MANIFEST.yaml` is the index. Use Wayback for `genai.owasp.org` HTML pages.
