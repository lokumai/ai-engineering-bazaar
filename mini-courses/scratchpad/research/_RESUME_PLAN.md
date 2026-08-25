# 2_intermediate Content Build — Resume Plan

**Paused:** 2026-08-25 (usage limit)
**Branch:** `docs/intermediate-research`

## Goal

Fill in the 7 placeholder modules of `mini-courses/2_intermediate/` with real content.
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

Read `mini-courses/1_fundamentals/6_agents.md` before writing any module. Pattern:
friendly second-person tone, short sections, comparison tables, mermaid diagrams,
short runnable code snippets, a "Quick Check" question, prev/next module links.
Note `mkdocs.yml` renders mermaid via `pymdownx.superfences` custom fences, and
`exclude_docs: scratchpad/` keeps this directory out of the published site.

## Phase status

### Phase 1a — Research dossiers

| # | Module | Dossier file | Status |
|---|---|---|---|
| 8 | Prompt Engineering | `08_prompt_engineering.md` | PARTIAL — flushed at pause, see its RESUME NOTES |
| 9 | Context Engineering | `09_context_engineering.md` | PARTIAL — flushed at pause, see its RESUME NOTES |
| 10 | Coding Agents | `10_coding_agents.md` | PARTIAL — flushed at pause, see its RESUME NOTES |
| 11 | Harness Engineering | `11_harness_engineering.md` | PARTIAL — flushed at pause, see its RESUME NOTES |
| 12 | Security | `12_security.md` | PARTIAL — flushed at pause, see its RESUME NOTES |
| 13 | Loop Engineering | `13_loop_engineering.md` | **NOT STARTED** — hit concurrency limit, never launched |
| 14 | Personal Agents | `14_personal_agents.md` | **NOT STARTED** — hit concurrency limit, never launched |

Each partial dossier ends with a `## RESUME NOTES` section listing DONE / PARTIAL /
NOT STARTED sections, searches already run, URLs verified, dead URLs, unfollowed leads,
and ordered next actions. **Read that section first** before resuming a dossier.

### Phase 1b — Independent link verification

Not started. After the dossiers are complete, spawn *separate* agents (not the authors) that
take only the URL lists and fetch each one, reporting dead / redirected / wrong-content links.
Authors must not grade their own homework.

### Phase 2 — Write the 7 English modules

Not started. ~200-300 lines each, from the dossiers, with a verified reference section.

### Phase 3 — Turkish translations

Not started. Separate PR.

## Open questions to settle before writing modules

1. **Module 11 vs 12 boundary** — "Guardrails" is listed in both stubs.
   Proposed split: 11 = engineering the wrapper mechanism (hooks, sandboxes, permission gates,
   budgets); 12 = threat model, attack classes, testing, defense-in-depth.
   Both dossiers were asked to make a boundary proposal — reconcile them.
2. **Module 13 vs 16/19 boundary** — Module 16 (Advanced Architectures) already claims
   "Dynamic Workflows" and Module 19 claims multi-agent coordination. Confirm what stays
   at intermediate level.
3. **Module 14 name verification** — the stub lists **Openclaw**, **Hermes Agent**, **Moltbook**.
   These are unusual, possibly misspelled or ambiguous names (e.g. "OpenClaw" is also a
   well-known open-source platformer game reimplementation; "Hermes" is also Nous Research's
   LLM family). The research agent must verify each against a primary source and, if a name
   cannot be verified, **recommend a replacement rather than invent details.** The repo owner
   decides keep vs replace.

## Next actions on resume

1. Read every `## RESUME NOTES` section in this directory.
2. Relaunch the 5 partial dossier agents (max ~4-5 concurrent — the earlier attempt at 7 hit
   the concurrent-subagent limit), each pointed at its own partial file and told to continue
   from its RESUME NOTES rather than restart.
3. Launch the 2 never-started dossiers (13 Loop Engineering, 14 Personal Agents).
4. Run phase 1b link verification.
5. Commit the dossiers and open PR 1.
