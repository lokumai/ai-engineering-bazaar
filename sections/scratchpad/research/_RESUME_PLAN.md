# 2_intermediate Content Build — Resume Plan

**Paused:** 2026-08-25 (usage limit)
**Branch:** `docs/intermediate-research`

## Goal

Fill in the 7 placeholder modules of `sections/2_intermediate/` with real content.
Repo mission: teach working software engineers to become **AI-powered software engineers** —
making the classic SDLC (requirements → design → implement → test → review → deploy → operate)
AI-powered, so they ship fast, high-quality, secure, tested software using today's LLM/agent tooling.

## Decisions already made (by the repo owner)

| Decision | Answer |
|---|---|
| PR strategy | **Two-phase.** PR 1 = research dossiers only (this directory). PR 2 = the written modules. |
| Turkish `_tr.md` | **Separate PR** (phase 3). Do not touch `_tr.md` in phase 1 or 2. |
| Module depth | Same as `1_fundamentals`: **~200-300 lines**, same house style. Deeper material defers to `3_expert`. |
| References | **Mandatory and reader-facing.** Every module ends with a verified "References & Further Reading" section. |

## Non-negotiable research rules

These topics are mostly <12 months old. Model memory is NOT a source.

1. No factual claim from memory. Memory is only a hint for what to search.
2. **Inline citations**, not just an end-of-file list: `... claim ... ([Title, YYYY-MM-DD](url))`.
3. Every cited URL must be **actually fetched** and confirmed to contain the claim.
   Snippet-only citations are forbidden. Failures get `[LINK-UNVERIFIED: reason]`.
4. Each dossier ends with a `## Link Verification Log` table:
   URL | fetch result | date checked | claim it supports.
5. Each dossier also carries `## References for the module` — 8-15 curated, verified links
   (title + publisher + date + what the reader gets). This becomes the module's reference section.
6. Prefer canonical/stable URLs (official docs, arXiv `/abs/`) over search pages, redirects, aggregators.
7. Exact identifiers (frontmatter fields, `settings.json` keys, hook event names, CLI flags,
   OWASP category IDs, NIST document numbers) MUST come from the official page, never memory.
8. Source priority: Anthropic / OpenAI / Google / Microsoft official docs & engineering blogs,
   standards bodies (OWASP, NIST, MITRE), official framework docs, arXiv. Secondary sources only
   as a path to a primary.

## House style to match

Read `sections/1_fundamentals/6_agents.md` before writing any module. Pattern:
friendly second-person tone, short sections, comparison tables, mermaid diagrams,
short runnable code snippets, a "Quick Check" question, prev/next module links.
Note `mkdocs.yml` renders mermaid via `pymdownx.superfences` custom fences, and
`exclude_docs: scratchpad/` keeps this directory out of the published site.

## Phase status

### Phase 1a — Research dossiers  ✅ COMPLETE (7 of 7)

| # | Module | Dossier file | Lines | Citations | Status |
|---|---|---|---|---|---|
| 8 | Prompt Engineering | `08_prompt_engineering.md` | 1048 | 250 | complete |
| 9 | Context Engineering | `09_context_engineering.md` | 592 | 208 | complete |
| 10 | Coding Agents | `10_coding_agents.md` | 1862 | 152 | complete |
| 11 | Harness Engineering | `11_harness_engineering.md` | 821 | 267 | complete |
| 12 | Security | `12_security.md` + 3 supplements | 2754 | 356 | complete |
| 12+ | Security — PyRIT/garak appendix | `12_security_appendix_redteam_tooling.md` | 246 | (table-form) | complete |
| 12+ | Security — attack classes & CVEs | `12_supp_attacks.md` | 305 | 52 | complete |
| 12+ | Security — guardrails, tooling, CI | `12_supp_guardrails.md` | 1074 | 59 | complete |
| 12+ | Security — standards & frameworks | `12_supp_standards.md` | 503 | 89 | complete |
| 13 | Loop Engineering | `13_loop_engineering.md` | 751 | 196 | complete |
| 14 | Personal Agents | `14_personal_agents.md` | 663 | 55 | complete |

> **Module 12 was rebuilt.** It was cut short by a usage limit while two of its own sub-agents
> were still running, and it correctly self-declared PARTIAL on its own line 5. Three targeted
> supplements closed every gap on 2026-08-25 — read `12_security.md` together with
> `12_supp_attacks.md`, `12_supp_guardrails.md` and `12_supp_standards.md`. The supplements
> also **correct four claims** in the base file; the corrections are listed at the top of
> `12_security.md` and must be applied when the module is written.
>
> **Process lesson worth keeping:** a dossier having a Link Verification Log and a References
> section does **not** mean it is finished — those get written during a graceful shutdown too.
> Check the file's own status line and `## RESUME NOTES` before declaring completion.
>
> **Identifier lesson:** resolve every identifier (CVE, arXiv ID, OWASP code, package name)
> against *its own authority*, never against a secondary source that quotes it. A CVE ID
> circulating in blogs for the CamoLeak vulnerability turned out to belong to an unrelated npm
> account takeover — the citation existed, it was just pointing at the wrong thing.

**278 unique URLs** cited across all dossiers, each fetched and confirmed on 2026-08-25.
Every dossier carries a `## Link Verification Log` and a curated
`## References for the module` list that becomes the module's reader-facing
reference section.

### Phase 1b — Independent link verification  ✅ COMPLETE

Mechanical `curl` sweep of all 278 unique URLs, run outside the authoring agents.
**274/278 resolved 200 (98.6%).** One genuinely broken URL found and fixed; three Meta
URLs are blocked from this network and need a manual browser check before publishing;
two GitHub "failures" were the audit rate-limiting itself. Full report and reproduction
steps: `_LINK_AUDIT.md`.

### Phase 2 — Write the 7 English modules

Not started. ~200-300 lines each, from the dossiers, with a verified reference section.

### Phase 3 — Turkish translations

Not started. Separate PR.

## Open questions to settle before writing modules

Q3 (Module 14 name verification) is **RESOLVED** — see below. Q1/Q2 now have concrete
proposals from the dossiers and need the repo owner's sign-off.

1. **Boundary line across modules 11/12/13/16/19/22 — needs sign-off.** The dossiers
   converged on a single unified split, proposed in `13_loop_engineering.md` §10:
   *11 = mechanism · 12 = adversary · 13 = orchestration + measurement ·
   16 = architecture inside a step · 19 = protocols between agents · 22 = scale.*
   This resolves the "Guardrails in both 11 and 12" overlap and the
   "Dynamic Workflows in both 13 and 16" overlap. Under it, Module 13 keeps one
   paragraph on dynamic workflows (plus the LangGraph `Send` snippet and the barrier
   lesson) and hands the taxonomy — planner DAGs, CodeAct, declarative-vs-code-first —
   to Module 16.

2. **Rubric scales: binary-first vs Likert — needs a stance.** There is **no head-to-head
   reliability study.** The binary/checklist argument (Hamel Husain) is about actionability,
   not measured reliability; Anthropic's own docs still ship a Likert example. The dossier
   recommends presenting binary-first as an *opinionated engineering stance with stated
   reasons* rather than as an empirical finding, and is written that way.

3. **Module 14 name verification — RESOLVED.** All three stub names are real:
   **OpenClaw** (`openclaw/openclaw`, OpenClaw Foundation, MIT) — a self-hosted personal
   assistant, *not* the Captain Claw game reimplementation; rename lineage
   Warelay → Clawdbot → Moltbot → OpenClaw confirmed from its own docs.
   **Hermes Agent** (`NousResearch/hermes-agent`, MIT) — a harness, *not* the Hermes LLM
   family. **Moltbook** — real, but a social network whose posters are agents, not a
   runtime; recommend reframing it as a **case study** rather than a tool.
   Note the collision hazard to spell out in the module: OpenClaw's former name
   *Moltbot* is a different thing from *Moltbook*.

4. **Module 9 editorial calls.** Drop the "95% auto-compact" figure and the third-hand
   grep-vs-embeddings anecdote — one is contradicted, the other unverifiable; replacements
   are in `09_context_engineering.md`. Also decide whether Module 9 shows one API snippet
   (`memory_20250818` / `clear_tool_uses_20250919` / `compact_20260112`) or stays CLI-only.

5. **Coverage gaps to close or drop — do not paper over these.**
   - Module 9 claims about **Codex / Cursor parity were never researched.** Either research
     them or don't promise them.
   - Module 14's candidate **alternatives (OpenHands, Goose, Letta, Khoj, ...) carry zero
     verification** — the agent's search budget ran out and it correctly refused to guess.
     Either commission a follow-up pass or drop them from the module.
   - **Moltbook's owner is genuinely unclear** (Willison credits Steinberger; the site
     credits @mattprd). The module should name no owner.

6. **Unrelated bug found in already-published content:** `1_fundamentals/7_multi_agent.md`
   line 69 links `https://langchain-ai.github.io/langgraph/concepts/multi_agent/`, which now
   serves a content-free redirect. Worth a separate small fix PR.

## Next actions on resume

Phase 1a is done. Next:

1. **Open PR 1** with the dossiers (branch `docs/intermediate-research`).
2. **Manually check the three blocked Meta URLs** in a browser (see `_LINK_AUDIT.md` §2).
   Module 12's Rule of Two framing depends on one of them.
3. **Settle the open questions above** with the repo owner — especially the boundary line
   (Q1), since it determines what each module may cover.
4. **Phase 2 — write the 7 English modules**, ~200-300 lines each, in the
   `1_fundamentals/6_agents.md` house style, each ending in a verified
   "References & Further Reading" section drawn from its dossier's curated list.
5. **Phase 3 — Turkish translations**, separate PR.
