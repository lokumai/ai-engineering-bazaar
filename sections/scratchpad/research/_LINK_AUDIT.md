# Phase 1b — Independent link audit

**Run:** 2026-08-25 · **Method:** mechanical `curl` sweep of every URL cited across all seven
dossiers, performed *outside* the authoring agents so no agent graded its own homework.
`curl -L`, browser user-agent, 25s timeout, following redirects.

## Result

| | |
|---|---|
| Citations scanned | 1,284 |
| Unique URLs | 278 |
| **Resolved 200** | **274 (98.6%)** |
| Genuinely broken, now fixed | 1 |
| Blocked from this network — needs a manual browser check | 3 |

## Findings

### 1. One genuinely broken URL — FIXED

`https://developers.openai.com/api/parameters` → **404** ("Page not found", confirmed in the
rendered body, not just the status line).

This was an internal inconsistency rather than a bad source: `08_prompt_engineering.md` cites the
*same* document correctly on lines 734 and 736 as
`https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6` (**200**, redirecting to
`.../guides/latest-model?model=gpt-5.6#prompting-best-practices`), and only line 735 carried a
truncated form. Line 735 has been corrected to match. The underlying claim — *"conflicting rules
can create more instability than missing detail"* — is unaffected.

### 2. Three Meta URLs — blocked, status genuinely unknown

| URL | Result |
|---|---|
| `https://ai.meta.com/blog/practical-ai-agent-security/` | 400, three consecutive attempts |
| `https://developer.meta.com/ai/docs/model-cards-and-prompt-formats/llama-guard-4/` | 400, three consecutive attempts |
| `https://developer.meta.com/ai/docs/model-cards-and-prompt-formats/prompt-guard/` | 400, three consecutive attempts |

**Do not "fix" these by deleting the citations, and do not record them as verified either.**
The evidence points to bot/datacenter blocking rather than dead pages:

- The two `developer.meta.com` pages return **~500 KB** of HTML whose navigation sidebar still
  lists "Llama Guard 4" as a live entry — the shell renders, the content area errors.
- The authoring agent reported fetching all three successfully and quoted specific,
  non-generic content from them (the Rule of Two's verbatim `[A]`/`[B]`/`[C]` phrasing; Prompt
  Guard 2's 512-token window; the S1–S14 taxonomy with S14 Code Interpreter Abuse). That is not
  the kind of detail a fetch failure produces.
- The failure is consistent across retries and spans two different Meta hostnames, which is the
  signature of network-level blocking, not of three pages independently dying.

**Action before publishing:** open all three in a normal browser and confirm the quoted claims.
If any turns out to be genuinely gone, the affected claims are:
Module 12's Rule of Two framing (load-bearing — it is the module's central diagram) and
Module 11's Prompt Guard / Llama Guard details (replaceable; the Llama model cards are also
published on Hugging Face).

### 3. Two false alarms

`github.com/google-gemini/gemini-cli/...` and `github.com/responsibleai/agent-hooks/...` returned
**429** during the parallel sweep and **200** on serial retry — GitHub rate-limited the audit
itself, not a problem with the links. Worth remembering: a parallel link checker will manufacture
its own failures.

## Note for the module-writing phase

The dossiers already record three URL migrations that happened within the last year. Any reference
list must use the new forms:

- Claude Code docs: `docs.claude.com/en/docs/claude-code/*` → **`code.claude.com/docs/en/*`** (301)
- Codex docs: `developers.openai.com/codex/*` → **`learn.chatgpt.com/docs/*`** (308)
- Meta model cards: `llama.com/docs` → **`developer.meta.com/ai/docs`**
- PyRIT: `github.com/Azure/PyRIT` → **`github.com/microsoft/PyRIT`** — *archived, not redirected*,
  so the old URL still serves a working-looking page. See
  `12_security_appendix_redteam_tooling.md`.

## Reproducing this audit

```bash
cd sections/scratchpad/research
grep -ohE '\]\(https?://[^) ]+' *.md | sed -E 's/\]\(//; s/[.,;]+$//' | sort -u > /tmp/urls.txt
# then check serially (parallel checks trigger rate limits and produce false 429s)
while read -r u; do
  printf '%s\t%s\n' "$(curl -sS -A "$UA" -L --max-time 25 -o /dev/null -w '%{http_code}' "$u")" "$u"
  sleep 1
done < /tmp/urls.txt
```
