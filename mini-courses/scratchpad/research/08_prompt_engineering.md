# Research Dossier — Module 8: Prompt Engineering (Intermediate)

**Repo:** github.com/lokumai/ai-minicourses
**Target file:** `mini-courses/2_intermediate/8_prompt_engineering.md`
**Research date:** 2026-08-25
**Audience:** professional software engineers, new to agent tooling, post-Fundamentals
**House style reference:** `mini-courses/1_fundamentals/6_agents.md` (friendly 2nd person, short sections, tables, mermaid, runnable snippets, Quick Check, prev/next links, ~150–280 lines)

> **READ THIS FIRST.** The single biggest risk for this module is writing 2023–2024 prompt-engineering advice in 2026. Between them, Anthropic and OpenAI have **deleted, reversed, or deprecated** a large fraction of the classic playbook: assistant prefill now returns HTTP 400 on current Claude models, `budget_tokens` is gone, `temperature` is rejected, XML tags are officially demoted, "think step by step" is no longer recommended by anyone, and Anthropic deleted its per-technique docs pages entirely. Details and citations below.

---

## 1. Executive summary — 10 things the module author must not get wrong

1. **"Prompt engineering" in 2026 means "writing the instruction text"; the surrounding discipline is called context engineering.** Anthropic's own framing: context engineering is "curating and maintaining the optimal set of tokens (information) during LLM inference," and prompt engineering is a subset of it. Module 8 owns the *text*; Module 9 owns *what gets into the window*. ([Anthropic, Sep 29 2025](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents))

2. **Explicit Chain-of-Thought prompting has been demoted to a fallback, not deleted.** Anthropic's live guidance: *"Manual chain-of-thought (CoT) prompting as a fallback. When thinking is off, you can still encourage step-by-step reasoning…"* — and *"Prefer general instructions over prescriptive steps. A prompt like 'think thoroughly' often produces better reasoning than a hand-written step-by-step plan."* The phrase **"think step by step" no longer appears as a recommendation anywhere in Anthropic's docs.** ([Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices))

3. **The replacement for CoT prompting is a *parameter*, not a phrase.** On Claude you set `thinking: {type: "adaptive"}` and `output_config: {effort: "low|medium|high|xhigh|max"}`. On OpenAI you set `reasoning_effort`. Teaching students to type "let's think step by step" instead of setting these parameters is the module's biggest possible failure. ([effort](https://platform.claude.com/docs/en/build-with-claude/effort), [thinking](https://platform.claude.com/docs/en/build-with-claude/thinking))

4. **Assistant prefill — which the stub-adjacent classic playbook treats as a core trick — is REMOVED.** *"Starting with Claude 4.6 models and Claude Mythos Preview, prefilled responses … on the last assistant turn are no longer supported. Requests with prefilled assistant messages to these models return a 400 error."* Teach it only as history + migration (structured outputs / "respond directly without preamble" / tool-call-as-output). Also: *"You can't pre-fill the assistant response while thinking is on."*

5. **XML tags are officially demoted.** Anthropic's Nov 10 2025 blog says XML tags are *"less necessary with models like Claude"* and that clear headings work as well; the docs still describe them as useful for prompts that *mix* instructions, context, examples and variable input. So: teach XML tags as a **delimiter for mixed content**, not as a magic ritual. ([claude.com blog, Nov 10 2025](https://claude.com/blog/best-practices-for-prompt-engineering))

6. **Anthropic and OpenAI now default in opposite directions on reasoning.** Claude Opus 5 / Sonnet 5 / Fable 5 have **thinking ON by default** and effort defaults to `high`. GPT-5.1 and GPT-5.2 default `reasoning_effort` to **`none`**. Same prompt, opposite behaviour. This is the vendor contrast the brief asked for, and it is a live, load-bearing one.

7. **Structured output is now a first-class API feature on both vendors — stop teaching "please reply with JSON."** Anthropic: `output_config: {format: {type: "json_schema", schema: {...}}}` plus `strict: true` on tools, with constrained decoding ("Always valid JSON — no `JSON.parse()` errors"). OpenAI: Structured Outputs / strict mode. Prompting for JSON is the *fallback*, not the technique. ([structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs))

8. **Prompt caching changes prompt *architecture*, not just cost.** Caching is prefix-based with strict ordering `tools → system → messages`. The rule: *"Place `cache_control` on the last block that stays identical across requests, not on the varying block."* Practical consequence for the SDLC: **put the stable stuff (system prompt, coding standards, schema, the big file you're reviewing) FIRST and the varying question LAST.** Reads cost 0.1x, 5-minute writes 1.25x, 1-hour writes 2.0x. ([prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching))

9. **This collides with the long-context rule — and they agree.** Anthropic: *"Put longform data at the top … above your query, instructions, and examples. Queries at the end can improve response quality by up to 30 percent in tests."* Same shape as the caching rule. One sentence teaches both: **stable + long content first, question last.** (OpenAI's GPT-4.1 guide disagrees slightly: it recommended instructions at top *and* bottom for long context — capture that.)

10. **Anti-patterns have inverted.** The 2024 advice "be emphatic, say CRITICAL, YOU MUST, be thorough" now actively hurts: *"Where you might have said 'CRITICAL: You MUST use this tool when…', you can use more normal prompting like 'Use this tool when…'"* and *"Tune anti-laziness prompting: if your prompts previously encouraged the model to be more thorough … dial back that guidance."* Over-prompting is now the dominant failure mode, not under-prompting.

---

## 2. Canonical definitions & commonly confused terms

| Term | Definition to use in the module | Commonly confused with |
|---|---|---|
| **Prompt engineering** | Designing the *text* sent to a model (instructions, examples, structure, output contract) to improve results without changing weights. | Context engineering (superset: what goes in the window at all — Module 9); fine-tuning (changes weights — Module 2). |
| **Context engineering** | Curating/maintaining the optimal token set at inference time: retrieval, compaction, memory, tool results, sub-agents. | Prompt engineering. Anthropic's definition, Sep 2025. |
| **Zero-shot** | Instruction only, no worked examples. | "No system prompt". Zero-shot ≠ no prompt. |
| **Few-shot / multishot / in-context learning (ICL)** | Including worked input→output examples *in the prompt*. Anthropic: "Include 3–5 examples for best results." | "Training the model." Nothing is learned persistently. |
| **Many-shot ICL** | Hundreds-to-thousands of examples, enabled by long context windows. | Few-shot. Different regime, different failure modes. |
| **Chain-of-Thought (CoT)** | Eliciting intermediate reasoning *in the output* before the answer. | **Extended/adaptive thinking**, which is a model capability with its own token budget and a separate `thinking` content block. Not the same thing. |
| **Extended thinking** (Anthropic, legacy) | `thinking: {type: "enabled", budget_tokens: N}`. **Deprecated**; 400 error on Claude 4.7+. | Adaptive thinking. |
| **Adaptive thinking** (Anthropic, current) | `thinking: {type: "adaptive"}` — the model decides *whether* and *how much* to think, steered by `effort`. | Extended thinking; also don't pass `adaptive` as an `effort` value. |
| **Effort** (Anthropic) / **reasoning_effort** (OpenAI) | A parameter trading thoroughness against tokens/latency. Anthropic: `low/medium/high/xhigh/max`, affects *all* tokens including tool calls. | Temperature. Unrelated. |
| **Self-consistency** | Sample N reasoning paths at temperature > 0, take the majority answer. | Reflection. Also: **not available in the classic form on current Claude models — non-default `temperature`/`top_p`/`top_k` return 400.** |
| **Reflection / self-critique** | Model reviews and revises its own output, ideally against external feedback (tests, compiler, linter). | Self-consistency; also "the model can fix itself unaided" — which the literature disputes. |
| **ReAct** | Interleaved Reason → Act(tool) → Observe loop. Now mostly *implemented by the harness*, not prompted by you. | The agent loop from Module 6 (it IS that loop's original name). |
| **Assistant prefill** | Seeding the start of the assistant's reply to constrain format. **Removed on Claude 4.6+.** | Structured outputs (the replacement). |
| **System vs user vs developer** | Anthropic: top-level `system` parameter + `user`/`assistant` roles; **there is no `developer` role**. OpenAI: `developer` role supersedes `system` for reasoning models; instruction hierarchy platform > developer > user. | Each other. This is a genuine cross-vendor difference. |
| **Prompt caching** | Reusing the KV-cache for an identical *prefix* across requests. | Semantic/response caching. Different thing entirely. |
| **Meta-prompting** | Using a model to write or improve a prompt. | Metaprompt-as-in-system-prompt. |
| **Prompt injection** | Untrusted content in the context being treated as instructions. | Jailbreaking (getting the model to violate its own policy). Both → Module 12. |

**Terminology warning for the author:** the stub's sibling Module 20 lists "Caveman" and "Ponytail". "Caveman prompting" is a real, informally-named technique (instruct the model to answer in terse, article-free, filler-free telegraphic style to cut output tokens; viral claims of 75% savings, measured savings on real coding tasks reported around 14–21%, ~39% with caching). **"Ponytail" prompting does not exist** in any primary or credible secondary source I could find — searches return nothing. Flag it to the repo owner rather than inventing a definition. (Not Module 8's scope, but it will be asked about.)

---

## 3. Deep dive per required topic

### 3.0 What the stub requires

The stub's scope is thin: "Chain-of-Thought (CoT)", "In-Context Learning (few-shot examples)", "Other core prompting techniques". All three are covered below, and "other core techniques" is where the rest legitimately lands.

### 3.1 Chain-of-Thought and its modern status

**Origin.** CoT prompting = provide exemplars containing intermediate reasoning steps. Zero-shot CoT = the literal string "Let's think step by step."

**What changed (this is the module's headline).**

- Anthropic's live guidance reframes CoT entirely around the `thinking` capability. The docs section formerly at `/prompt-engineering/chain-of-thought` now **308-redirects** to `claude-prompting-best-practices#leverage-thinking-and-interleaved-thinking-capabilities`. The technique page for CoT literally no longer exists as its own page.
- Verbatim from that section:
  - *"Prefer general instructions over prescriptive steps. A prompt like 'think thoroughly' often produces better reasoning than a hand-written step-by-step plan. Claude's reasoning frequently exceeds what a human would prescribe."*
  - *"Multishot examples work with thinking. Use `<thinking>` tags inside your few-shot examples to show Claude the reasoning pattern. It will generalize that style to its own extended thinking blocks."*
  - *"Manual chain-of-thought (CoT) prompting as a fallback. When thinking is off, you can still encourage step-by-step reasoning by asking Claude to think through the problem. Use structured tags like `<thinking>` and `<answer>` to cleanly separate reasoning from the final output."*
  - *"Ask Claude to self-check. Append something like 'Before you finish, verify your answer against [test criteria].' This catches errors reliably, especially for coding and math."* — **with a model-specific exception:** on Claude Opus 5 you should *remove* verification instructions, because they cause over-verification.
- A wonderfully concrete gotcha: *"When extended thinking is disabled, Claude Opus 4.5 is particularly sensitive to the word 'think' and its variants. Consider using alternatives like 'consider,' 'evaluate,' or 'reason through.'"* — i.e. the cargo-culted word "think" is now itself a bug source.
- OpenAI's GPT-5.2 prompting guide **does not recommend** explicit "think step by step"; the model "builds clearer plans by default."

**Answer to the brief's question — do reasoning models make explicit CoT obsolete?**
Nuanced, three-part answer for the module:
1. **When thinking/reasoning is ON: yes, mostly.** Don't prescribe steps. Steer *depth* with `effort`/`reasoning_effort`, and steer *shape* with a short instruction ("after each tool result, reflect on quality before the next step").
2. **When thinking is OFF (cheap/fast/high-volume calls, non-reasoning models, local models): no, CoT still earns its keep.** This is the fallback Anthropic documents.
3. **CoT's benefit was always uneven.** The pre-existing meta-analytic finding is that CoT helps overwhelmingly on math/symbolic/logic tasks and much less on other task types — which is exactly *why* moving it into a trainable, parameterised capability was the right call. (See §Academic, pending confirmation of exact figures.)

**Thinking budgets — the 2026 API reality (Anthropic):**
- `thinking: {type: "adaptive"}` is current. `thinking: {type: "enabled", budget_tokens: N}` is **deprecated**; on Claude 4.7 and later it **returns 400**.
- `budget_tokens` minimum was 1,024 and had to be `< max_tokens`.
- Thinking is **on by default** on Claude Opus 5, Sonnet 5, Fable 5, Mythos 5. **Off by default** on Opus 4.8/4.7/4.6 and Sonnet 4.6 until you set `adaptive`.
- `display: "summarized" | "omitted"`. `omitted` is the default on the newest models — **you still pay for the thinking tokens**, you just get an empty `thinking` field. *"No `display` setting returns the raw chain of thought."*
- On Opus 5, thinking **cannot be disabled** at `xhigh` or `max` effort (400).
- Non-default `temperature`, `top_p`, `top_k` **return 400** on Fable 5, Mythos 5, Opus 5, Opus 4.8, Opus 4.7, Sonnet 5, regardless of thinking.
- Interleaved thinking (thinking *between* tool calls) is automatic with adaptive thinking, no beta header. Haiku 4.5 does not support it.
- Thinking blocks must be passed back **complete and unmodified** in a tool-use turn or you get a 400.

**Effort levels (Anthropic), verbatim-ish:**

| Level | Use |
|---|---|
| `max` | absolute maximum capability, no token constraints |
| `xhigh` | long-running agentic/coding work (30+ min, million-token budgets) |
| `high` | default; equivalent to omitting the parameter |
| `medium` | balanced; moderate token savings |
| `low` | most efficient; "such as subagents" |

Notes worth teaching: *"Effort is a behavioral signal, not a strict token budget."* It affects **all** tokens including tool calls — low effort means *fewer tool calls*. And: **changing effort invalidates prompt caching**, so *"pick an effort level at the start and keep it constant"* within a cached conversation.

### 3.2 In-context learning / few-shot — when it helps vs hurts

**Anthropic's current, quotable guidance:**
- *"Examples are one of the most reliable ways to steer Claude's output format, tone, and structure."*
- Make them **Relevant** ("mirror your actual use case closely"), **Diverse** ("cover edge cases and vary enough that Claude doesn't pick up unintended patterns"), **Structured** (wrap in `<example>` tags; multiple in `<examples>`).
- *"Include 3–5 examples for best results."*
- Meta-move worth teaching: *"You can also ask Claude to evaluate your examples for relevance and diversity, or to generate additional ones based on your initial set."*

**When few-shot HELPS (teach these):**
- Output *format* and *style* that is hard to describe but easy to show (a commit-message convention, a review-comment format, a test naming scheme, a specific docstring dialect).
- Classification with a fixed label set, where the labels are project-specific.
- Anything where you already have a corpus of "good" examples in the repo — this is the software-engineering superpower: **your git history is your few-shot corpus.**

**When few-shot HURTS (teach these too):**
- With reasoning models, examples can *constrain* the model below its own capability. OpenAI's reasoning guidance has historically been "start zero-shot, add few-shot sparingly."
- Non-diverse examples cause **pattern lock-in** — the model copies an incidental property of your examples (all three examples happened to be one-line fixes → it only produces one-line fixes). Anthropic's "Diverse" criterion is exactly this warning.
- Examples eat the cacheable prefix budget and the context window.
- Order and formatting of examples are known to matter more than they should — few-shot prompts are brittle to permutation.

**Many-shot ICL.** With 200k–1M-token windows, "few-shot" can become hundreds of examples, which can rival light fine-tuning on some tasks. Caveat for engineers: it interacts badly with **context rot** (§4) — more examples is not monotonically better. Practical rule for the module: **3–5 curated examples beats 50 scraped ones; if you want 500, you want fine-tuning or an optimizer (DSPy), not a bigger prompt.**

### 3.3 Zero-shot vs few-shot — the decision rule

Give students a one-line rule:
> Start zero-shot with a *precise* instruction. Add examples only when the failure is **format/style**, not **knowledge/reasoning**. If the failure is reasoning, raise `effort`. If the failure is knowledge, that's retrieval (Module 3/9), not prompting.

### 3.4 Self-consistency

Classic technique: sample N chains at temperature > 0, majority-vote the final answer.

**Status in 2026 — this needs an honest caveat in the module:** on Anthropic's current models you **cannot** set a non-default `temperature`/`top_p`/`top_k` — the API returns 400. So textbook self-consistency-via-temperature is not directly available there. What survives, and is what engineers actually use:
- **N independent calls, then adjudicate.** Same prompt, N samples (models are non-deterministic even at default settings), then either majority-vote a discrete answer or have a model/judge pick the best. This is the "voting" flavour of parallelization in Anthropic's *Building effective agents* taxonomy (Dec 19 2024).
- **Ensemble across *models*, not temperatures.** This is the "LLM Council" pattern (Karpathy's `karpathy/llm-council`, Nov 2025): fan a query out to several models, have them anonymously review and rank each other, then a "chairman" model synthesises. Karpathy explicitly labels it a Saturday hack, unsupported. Good to name-drop; belongs in Module 20.
- **For SDLC work, deterministic adjudication beats voting:** run the candidate patches, let the *test suite* vote. Cheaper and more truthful than majority-voting text.

**Recommendation:** mention self-consistency in one short paragraph, state the temperature restriction, and hand the deep version to Module 20.

### 3.5 ReAct-style prompting

ReAct = interleave *Thought → Action → Observation*. In 2023 you hand-wrote this scaffold in your prompt. In 2026 **the harness implements it** — tool-use is a native API feature (Module 4), the loop is the agent loop (Module 6), and thinking-between-tool-calls is `interleaved thinking`, on automatically with adaptive thinking.

What's left for *you* to prompt, and what belongs in this module:
- **Reflection instruction:** *"After receiving tool results, carefully reflect on their quality and determine optimal next steps before proceeding. Use your thinking to plan and iterate based on this new information, and then take the best next action."* (verbatim from Anthropic docs)
- **Parallelism instruction** — the `<use_parallel_tool_calls>` block; Anthropic claims prompting lifts the parallel-call rate to ~100%. Their multi-agent research post reported parallel tool calling cut research time by up to 90% (Jun 13 2025).
- **Action-vs-advice framing**, which is a genuinely useful and non-obvious lesson for engineers: *"can you suggest some changes to improve this function?"* → Claude suggests. *"Change this function to improve its performance."* → Claude edits. Two prompts, two completely different workflows.
- Anthropic's `<default_to_action>` and `<do_not_act_before_instructions>` system-prompt blocks are the two dials, given verbatim in the docs.

### 3.6 Reflection / self-critique

Three distinct things, often muddled — separate them in the module:

1. **Self-check in one call.** *"Before you finish, verify your answer against [test criteria]."* Anthropic says this "catches errors reliably, especially for coding and math." **Model-specific exception:** on Claude Opus 5, remove these — the model already self-verifies and the instruction causes over-verification, adding tokens and latency. Great illustration of "prompts are versioned against models."
2. **Prompt chaining / evaluator-optimizer.** Draft → review against explicit criteria → refine, as *separate API calls* so you can log and branch. Anthropic: *"With adaptive thinking and subagent orchestration, Claude handles most multistep reasoning internally. Explicit prompt chaining … is still useful when you need to inspect intermediate outputs or enforce a specific pipeline structure,"* and *"The most common chaining pattern is self-correction."*
3. **Reflection with an *external* verifier.** The version that actually works for software: the feedback signal is a test run, a type checker, a linter, a build. The literature is skeptical of *intrinsic* self-correction (a model fixing itself with no external signal can make things worse). For engineers this maps to a clean rule: **never ask the model "is this correct?" when you can ask the test runner.**

Anthropic's Claude Code best-practices page adds a sharp warning about adversarial review prompts: *"A reviewer prompted to find gaps will usually report some, even when the work is sound."* That is the single best anti-pattern quote for an SDLC audience.

### 3.7 Structured output

Three generations, teach all three so students recognise old code:

| Generation | How | Status |
|---|---|---|
| Prompt-and-pray | "Reply with JSON only." | Works, no guarantee. Fallback only. |
| Prefill / tool-call-as-output | Prefill `{` ; or define a single tool whose schema IS your output and force `tool_choice`. | Prefill **removed** on Claude 4.6+. Tool-call-as-output still valid and still officially recommended for classification. |
| Constrained decoding | Anthropic `output_config.format`; OpenAI Structured Outputs strict mode. | **Current best practice.** |

**Anthropic specifics (verified):**
- Two independent features: **JSON outputs** via `output_config: {format: {type: "json_schema", schema: {...}}}`, and **strict tool use** via `"strict": true` on a tool definition (requires `additionalProperties: false`).
- Guarantees: *"Always valid JSON — no `JSON.parse()` errors"*, type-safe, no retries for schema violations.
- Python SDK helper: `client.messages.parse(..., output_format=MyPydanticModel)` → `response.parsed_output`. TypeScript: `zodOutputFormat()` / `jsonSchemaOutputFormat()`.
- **Schema limits worth stating:** no recursive schemas, no external `$ref`; numeric constraints (`minimum`, `maxLength`) are SDK-validated only, not enforced by decoding; array `minItems` only 0 or 1. Supported: `enum`, `const`, `anyOf`, `allOf`, `$ref`/`$defs`, string formats (`date`, `email`, `uuid`, …).
- Costs: grammar is compiled on first use (latency), then cached 24h; the feature injects a system prompt so input tokens go up slightly; **changing `output_config.format` invalidates the prompt cache.**
- Supported models include `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5`, opus-4.8/4.7/4.6, sonnet-4.6, sonnet-4.5.
- Legacy note: the older `output_format` top-level param + beta header `structured-outputs-2025-11-13` are accepted "for a transition period," but **Python SDK v1.0+ raises `TypeError`** if you pass `output_format` to `messages.create`.

**Engineer's rule of thumb:** if the output feeds another program, use a schema. If it feeds a human, use prose and prompt for length.

### 3.8 XML tags & Anthropic-specific conventions

- **Current status:** useful specifically when the prompt *mixes* instruction, context, examples and variable input. Docs: use `<instructions>`, `<context>`, `<input>`; consistent, descriptive tag names; nest where there's hierarchy (`<documents>` → `<document index="n">` → `<source>` + `<document_content>`).
- **Officially demoted:** the Nov 10 2025 Anthropic blog says XML tags are "less necessary with models like Claude" and clear headings work as well.
- **There is no reserved tag vocabulary.** Any tag name works; consistency matters more than the name. Don't teach a "canonical tag list" — there isn't one.
- **XML tags as *output* format indicators** is a distinct and still-current trick: *"Write the prose sections of your response in `<smoothly_flowing_prose_paragraphs>` tags."*
- **The style-mirroring effect** is a genuinely surprising, teachable finding: *"The formatting style used in your prompt may influence Claude's response style… removing markdown from your prompt can reduce the volume of markdown in the output."*
- **Anti-markdown block:** the docs ship a full `<avoid_excessive_markdown_and_bullet_points>` system-prompt block, ending *"NEVER output a series of overly short bullet points."* Directly useful for anyone generating docs or ADRs.
- Current models default to **LaTeX** for math; there is a documented plain-text override.

### 3.9 Assistant prefill — REMOVED (handle with care)

This is the topic most likely to make the module look dated. State it plainly.

- *"Starting with Claude 4.6 models and Claude Mythos Preview, prefilled responses (providing a partial assistant message for Claude to continue from) on the last assistant turn are no longer supported. Requests with prefilled assistant messages to these models return a 400 error."*
- Rationale given: *"Model intelligence and instruction following have advanced such that most use cases of prefill no longer require it."*
- Adding assistant messages **elsewhere** in the conversation is unaffected. Earlier models still support prefill.
- Independently: *"You can't pre-fill the assistant response while thinking is on."*
- **Documented migrations** (all four are useful teaching material in their own right):
  - Force a format → **Structured Outputs**, or a tool with an `enum` field for classification.
  - Kill the preamble → *"Respond directly without preamble. Do not start with phrases like 'Here is…', 'Based on…', etc."* (or output inside XML tags, or post-strip).
  - Dodge over-refusals → clear prompting in the `user` message is now sufficient.
  - Continuations → move to the user turn: *"Your previous response was interrupted and ended with `[previous_response]`. Continue from where you left off."*

**⚠ Documented contradiction (flag as [PARTLY UNVERIFIED]):** the Messages API reference page still documents prefill as a live feature and still shows a prefill example, and the Nov 10 2025 blog still lists "Prefill the AI's response" as a best practice. The best-practices doc is newer and more specific; treat the API reference and blog as stale, but do not assert a hard universal ban in the module — say "removed on Claude 4.6 and later."

### 3.10 System vs user vs developer roles

| | Anthropic | OpenAI |
|---|---|---|
| Roles | top-level `system` **parameter**, plus `user` / `assistant` messages | `developer` (supersedes `system` for reasoning models), `system`, `user`, `assistant`, `tool` |
| Is there a `developer` role? | **No.** | Yes. |
| Is `system` a message role? | Documented as *not* a role — *"there is no `system` role for input messages in the Messages API"* — **but** the API reference schema does enumerate `"system"` as a role value. Genuine doc inconsistency; treat as ambiguous. See §11. |
| Hierarchy | system is instruction-privileged over user | Model Spec instruction hierarchy: platform > developer > user |

**What to teach an engineer:** the system prompt is the *durable* contract — role, constraints, output rules, tool policy, coding standards. The user message is the *task*. Two practical consequences: (a) put anything reusable in `system` so it caches; (b) anything you put in the user turn is, by design, lower-privilege than the system prompt — which is the seed of the prompt-injection story (§3.13).

Also worth one line: in agent harnesses you rarely write the system prompt directly — you write `CLAUDE.md` / `AGENTS.md` / `.github/copilot-instructions.md`, and the harness assembles the system prompt. That's the bridge to Modules 10/11.

### 3.11 Prompt caching, and how prompt STRUCTURE must change

This is the section that most justifies the module's existence for working engineers, because it's where prompt *writing* becomes prompt *architecture*.

**Mechanics (Anthropic, verified):**
- Prefix-based. Two modes now: top-level `cache_control: {"type": "ephemeral"}` (automatic caching, moves the breakpoint forward for you across turns) and per-block explicit breakpoints.
- **Max 4 explicit `cache_control` breakpoints** per request; automatic caching consumes one slot.
- **Strict ordering: `tools` → `system` → `messages`.** Changing tools invalidates system + messages. Changing system invalidates messages. Changing messages invalidates nothing earlier.
- **Minimum cacheable tokens differ per model:** 512 (Opus 5, Fable 5, Mythos 5); 1,024 (Opus 4.8, Sonnet 5, Sonnet 4.6, Sonnet 4.5); 2,048 (Opus 4.7, Mythos Preview, Haiku 3.5); 4,096 (Opus 4.6, Opus 4.5, Haiku 4.5). Below the minimum, caching is silently skipped — no error.
- **TTL:** 5 minutes default; `"ttl": "1h"` optional. Measured from *request start*.
- **Pricing multipliers:** 5-min write **1.25x**, 1-hour write **2.0x**, read **0.1x**. (Concretely on Opus 5: $5 base in / $6.25 5m-write / $10 1h-write / $0.50 read / $25 out per Mtok.)
- **Invalidators to warn about:** tool definitions changing; toggling web search or citations; adding/removing images; **any change to the `thinking` config**; **any change to `effort`**; changing `output_config.format`. Prefix lookback is 20 blocks.
- Pre-warming trick: `max_tokens: 0`.
- Wait for the first response to begin before firing parallel requests, or they all miss.

**The structural rule, stated for engineers:**

```
[ tools ]                     ← most stable
[ system: role + standards + schema + long reference docs ]   ← cache_control here
[ examples ]
[ big file / diff / spec you are working on ]
[ THE ACTUAL QUESTION ]       ← most volatile, always last
```

Anti-example straight from the docs: putting a timestamp before the cached content means the hash never matches and you pay full price on every single request. That is a real, common, expensive bug.

**Why this is the same rule as long-context placement:** Anthropic's long-context guidance says put longform data at the top, above your query and examples, and that *"queries at the end can improve response quality by up to 30 percent in tests."* Quality and cost point the same way. **One rule, two payoffs.** This is the module's best single takeaway.

### 3.12 Vendor guidance that partly contradicts — see §5.

### 3.13 Prompt injection (brief — defer to Module 12)

Keep to ~4 sentences plus a pointer.
- Prompt injection is #1 (LLM01) in the OWASP Top 10 for LLM Applications 2025 (v2.0, published 18 Nov 2024). Direct injection = the user types it; **indirect** injection = the model reads it from a web page, an issue, a PR description, a dependency README, a code comment.
- The relevance *to this module* is a structural one, and it's the right note to end on: **the fundamental reason injection works is that instructions and data share one channel.** Everything in §3.8 (delimit untrusted content in tags) and §3.10 (privilege hierarchy) is a partial mitigation and not a fix.
- OWASP's own position: neither RAG nor fine-tuning mitigates LLM01; you need defence in depth — least-privilege tools, output filtering, human approval for high-risk actions, adversarial testing.
- Practical one-liner for engineers: *never let a model's read of untrusted text decide whether to run a destructive command.* Then → Module 12.

### 3.14 DSPy / programmatic & auto-optimised prompts

*(detail in the appended Frameworks section; summary here)*
The idea to land: **stop hand-tuning strings; declare the input/output contract and let an optimizer write the prompt against a metric.** DSPy's slogan is "programming, not prompting": you write a *Signature* (typed I/O), compose *Modules*, define a *metric*, and an *optimizer* searches over instructions and few-shot demonstrations. For this audience the honest framing is: DSPy is what you graduate to when you have (a) a repeatable task, (b) a labelled/checkable dataset, and (c) a metric. Most day-job prompting has none of those, which is why hand-written prompts still dominate. Mention it, show ~10 lines, defer depth to Module 20.

### 3.15 Evals-driven prompt iteration

**This is the section that makes the module "SDLC-shaped" and it should be prominent, not an afterthought.** Anthropic's own prompt-engineering *overview* page now assumes you already have *"(1) A clear definition of the success criteria… (2) Some ways to empirically test against those criteria (3) A first draft prompt you want to improve."* In other words: **the official position is that you should not be prompt-engineering at all until you can measure.**

The loop to teach:
1. Write down success criteria (what does a good output look like — accuracy, format validity, no hallucinated APIs, length).
2. Build a small golden set (20–100 cases beats 5; real cases beat invented ones).
3. Automate the check. Prefer deterministic checks (JSON schema validates, tests pass, no diff to protected files) over LLM-as-judge; use a judge only for the fuzzy dimensions.
4. Change **one** thing in the prompt.
5. Re-run. Keep the change only if the number moves.
6. Version the prompt in git next to the code; run the eval in CI so a prompt change is a reviewable diff with a test result.

And the crucial engineering note that ties to §3.6: **models change under you.** Anthropic documents that instructions tuned for Opus 4.x actively harm Opus 5 (verification instructions → over-verification; anti-laziness prompting → overtriggering; skills built for prior models are "too prescriptive" for Fable 5 and "can degrade output quality"). A prompt without an eval is a regression waiting for a model upgrade.

### 3.16 Meta-prompting

- **Definition:** use a model to write/critique/repair your prompt.
- **Status at Anthropic:** the Console *prompt generator* and *prompt improver* doc pages have been **deleted** (they redirect to the best-practices page and are absent from `llms.txt`). The surviving official artifact is the **metaprompt Colab notebook** in `anthropics/claude-cookbooks` (`misc/metaprompt.ipynb`), linked from the prompt-engineering overview. Do not describe Console prompt-improver behaviour as current — I could not verify it against any live page.
- **Cheap in-line version that always works** and is worth teaching: paste your prompt and the bad output, and ask *"Here is my prompt and an output I didn't want. Diagnose which instruction caused this, and rewrite the prompt. Change as little as possible and explain each change."* Minimal-diff framing avoids the classic meta-prompting failure of the model rewriting your prompt into generic slop.
- **Also official and underused:** *"You can ask Claude to evaluate your examples for relevance and diversity, or to generate additional ones based on your initial set."* Meta-prompting your *examples*, not just your instructions.
- OpenAI ships a **prompt optimizer** in the Playground and has cookbook material on metaprompting; the GPT-5.2 guide's metaprompting content is thin (see §5).

### 3.17 What I would ADD to the stub's list, and why

| Addition | Why it must be in Module 8 |
|---|---|
| **`effort` / `reasoning_effort` as a first-class prompting control** | It is the 2026 replacement for half of CoT prompting. Omitting it makes the module wrong, not just incomplete. |
| **Prompt caching → prompt structure** | Converts prompting from a writing skill into an engineering skill; huge, measurable cost impact; it's the one thing that makes "stable prefix first" non-negotiable. Already in the brief; make it a top-level section. |
| **Structured output as an API feature (not a prompt)** | Engineers ship prompts whose output is parsed by code. Constrained decoding is the correct answer and it isn't prompting at all. |
| **Prompts as versioned artifacts + evals in CI** | This is *the* SDLC framing. Also the honest answer to "prompt engineering is dead": the craft moved from wording to measurement. |
| **"Tell it what TO do, not what NOT to do"** | Tiny, universal, high-yield, and cited verbatim in the docs. Cheap win. |
| **"Provide the motivation, not just the rule"** | The TTS/ellipses example is the single most memorable item in Anthropic's docs and generalises perfectly (`"don't use ellipses"` → `"this is read aloud by TTS, which can't pronounce them"`). |
| **Action vs advice framing** | "Suggest changes" vs "change this" is a one-line lesson that changes an engineer's daily workflow immediately. |
| **Over-prompting as the modern default failure** | 2024 advice actively hurts 2026 models. Must be stated or students will copy stale blog posts. |
| **Model-version pinning of prompts** | Documented, concrete, and surprising: the *same* instruction helps Opus 4.x and hurts Opus 5. Justifies evals. |
| **CLAUDE.md / AGENTS.md as "the prompt you actually maintain"** | Where a working engineer's prompting effort really goes. Brief here, full treatment in Modules 10/11. |

**What I would deliberately NOT add here** (→ Module 20): Tree of Thoughts, Reflexion-as-architecture, LLM Council / multi-model ensembles, DSPy optimizer internals (MIPROv2/GEPA), Caveman-style token-compression prompting, step-back prompting, least-to-most.

---

*(Sections 4–11 continue below; §4 State of the art, §5 Vendor contrasts, §6 Snippets, §7 SDLC table, §8 Pitfalls, §9 Proposed outline, §10 Sources, §11 Open questions.)*
