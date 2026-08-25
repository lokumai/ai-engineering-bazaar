# Supplement to Module 8 — the evidence base that never landed in the dossier

The Module 8 dossier was written by an agent that had dispatched five sub-agents to verify the
literature. Those sub-agents finished and reported, but the parent's session ended before their
findings were folded in. This file preserves them. Every arXiv ID below was resolved by fetching
`arxiv.org/abs/<id>` directly and confirming title, authors, dates and abstract content.

**Use this file alongside `08_prompt_engineering.md`.** Where the two disagree on a number, this
file is the more precisely sourced one — but say so rather than silently overwriting.

## 1. "CoT helps mainly on math and symbolic reasoning" — the exact numbers

**arXiv:2409.12183** — *To CoT or not to CoT? Chain-of-thought helps mainly on math and symbolic
reasoning*. Sprague, Yin, Rodriguez, Jiang, Wadhwa, Singhal, Zhao, Ye, Mahowald, Durrett
(UT Austin). v1 2024-09-18 · **v3 2025-05-07** · Comments field: **"Published at ICLR 2025."**

Verified against the v3 full text, not the abstract:

| Quantity | Verified value |
|---|---|
| Venue corpus screened | 4,642 papers (ICLR 2024 + EACL 2024 + NAACL 2024) |
| Keyword-filtered | 516 papers |
| Final meta-analysis set | **110 papers, 1,218 experimental comparisons** |
| Own experiments | 20 datasets × 14 models |

Verbatim from the paper: *"The three categories which benefited the most from CoT are symbolic
reasoning, math, and logical reasoning, with average improvements of **14.2, 12.3, 6.9**,
respectively. Average performance on these top three tasks with CoT was **56.9**, whereas
performance without CoT was **45.5**. For other categories, the average performance with CoT was
**56.8**, compared to **56.1** without CoT. We do not consider this small improvement a victory
for CoT."*

And on MMLU, verbatim: *"As much as **95%** of the total performance gain from CoT on MMLU is
attributed to questions containing '=' in the question or generated output. For non-math
questions, we find no features to indicate when CoT will help."*

Own zero-shot results: MATH **+41.6%**, GSM8K **+66.9%**; little to no separation on CSQA, PIQA,
SiQA, WinoGrande, AGI LSAT, ARC-Easy/Challenge; MuSiQue showed no overall improvement.

The tool-augmentation finding, verbatim: *"CoT primarily helps with the execution step that
performs computation and symbolic manipulation, but falls short of what LLMs with tool
augmentation can do"* and *"**CoT appears to be a poor (but universal) approximation to such
solvers.**"*

**Scope caveat that must be stated:** all 14 models are pre-reasoning-model (Llama 2/3.1, Mistral,
Gemma 2, Phi-3, Qwen 2, GPT-4o and 4o-mini, Claude 3 Haiku, Claude 3.5 Sonnet, Gemini 1.5).
The paper says nothing directly about o1/o3/R1-class models. §2 covers those.

## 2. Explicit CoT prompting at reasoning models — measured

**arXiv:2506.07142** — *Prompting Science Report 2: The Decreasing Value of Chain of Thought in
Prompting*. Meincke, E. Mollick, L. Mollick, Shapiro (Wharton Generative AI Labs). v1 2025-06-08,
v1 only. Wharton technical-report series, no conference venue.

Design: GPGA Diamond, **198 PhD-level MCQs × 25 trials × 3 conditions = 4,950 runs per prompt per
model**, temperature 0. Conditions: "Direct", "Step by step", and "Default" (no suffix at all).

**Reasoning models** — o3-mini **RD = +0.029 (p=.024)**, o4-mini **RD = +0.031 (p=.003)**,
**Gemini 2.5 Flash significantly worse at RD = −0.033 (p=.005)** (and −0.131 on the
all-25-correct metric, p<.001). CoT requests took **20–80% longer (10–20 s)**.

**Non-reasoning models** — average gains real (Gemini 2.0 Flash +0.135, Sonnet 3.5 +0.117), but on
the strict "100% correct across 25 trials" metric **three of five got significantly worse**
(Gemini Pro 1.5 −0.172, Gemini Flash 2.0 −0.131). CoT was **35–600% slower**.

The finding that reframes everything, verbatim: *"the model would often perform CoT by default
even without explicitly prompting it. Thus, the value of explicitly prompting for CoT greatly
diminished."*

Bonus, and it reverses common advice: *"the common practice of prompting a model to reply with
only the answer and nothing else is likely to harm the performance of non-reasoning models."*

Supporting: **arXiv:2506.14641** (*Zero-shot Can Be Stronger than Few-shot*, EMNLP 2025 Findings,
v3 2026-01-08) — for Qwen2.5-class models, few-shot CoT exemplars do not beat Zero-Shot CoT even
when rebuilt from Qwen2.5-Max and DeepSeek-R1 traces; *"models tend to ignore the exemplars and
focus primarily on the instructions."*

## 3. More thinking can be actively worse

- **arXiv:2507.14417** — *Inverse Scaling in Test-Time Compute*. Gema et al. (incl. Anthropic
  authors). v1 2025-07-19, **v2 2025-12-15, published in TMLR**. Constructs tasks where longer
  reasoning **monotonically degrades** accuracy. Five family-specific failure modes: Claude models
  get distracted by irrelevant information; OpenAI o-series overfit to problem framings; models
  drift to spurious correlations in regression; deduction loses focus under constraint tracking;
  and extended reasoning amplifies self-preservation expressions. Upshot: **budget reasoning,
  don't maximize it.**
- **arXiv:2412.21187** — *Do NOT Think That Much for 2+3=?* (Tencent AI Lab + SJTU, v2 2025-02-01).
  o1-like models spent **1,953% more tokens** than conventional models on "what is 2 plus 3?";
  one trace generated 13 separate solutions. Self-training mitigation cut token output **48.6%**
  on MATH500 for QwQ-32B-Preview with accuracy held.
- **arXiv:2501.18585** — *Thoughts Are All Over the Place* (v2 2025-02-18). The opposite pathology:
  **225% more tokens in incorrect responses**, and **over 70%** of thoughts in wrong answers were
  on a track that could have reached the right answer before being abandoned. Fixed at the
  **decoding** layer, not the prompt — their prompt-engineering baseline gave *"only modest
  changes."*
- **arXiv:2412.18547** — *Token-Budget-Aware LLM Reasoning* (TALE, v5 2025-06-02). The prompt-side
  lever that replaced "let's think step by step": **specify a budget, not an incantation.**

## 4. The folklore table — measured verdicts

| Claim | Status | Evidence |
|---|---|---|
| Extreme rudeness/abuse can hurt | **Real, but model- and language-dependent** | Up to **−26.7 pp** (Llama-2-70B on MMLU, level 8 → level 1); near-zero on GPT-4-class |
| "Be maximally polite" | **Folklore** | The politest level is frequently *not* the peak — GPT-4 peaks at level 4 of 8; GPT-3.5 peaks at level 2 on JMMLU |
| "Be rude, it works better" | **Folklore built on one 50-question study** | +4 pp on 50 items ≈ 2 questions; **did not replicate** at 570 items × 4 models |
| Tipping ($1,000 / $1 trillion) | **Folklore — measured, null** | No significant effect; 5 models, ~7,450 runs each |
| Threatening ("Brin's trick") | **Folklore — measured, null** | No significant effect; source is an All-In podcast remark (2025-05-20) with zero published measurement |
| "This is very important to my career" | **Evidenced in 2023, fails replication** | +8%/+115% relative claimed originally; **−4.0 pp** measured on Gemini 2.0 Flash |
| Wording matters *unpredictably, per question* | **Real — the best-supported finding here** | ±60 pp per-question swings; +36/−28 pp (GPQA), +28/−35 pp (MMLU-Pro) |

Sources, all verified:

- **arXiv:2402.14531** — *Should We Respect LLMs? A Cross-Lingual Study on the Influence of Prompt
  Politeness on LLM Performance*. Yin, Wang, Horio, Kawahara, Sekine. v2 2024-10-14.
  **SICon 2024**, ACL Anthology `2024.sicon-1.2`.
  **Citation trap:** the title circulating in blog posts — "A Cross-Lingual Study of Politeness in
  LLM Prompting" — is **wrong**. Use the real one.
  8 politeness levels × 3 languages. MMLU level 8 → level 1: GPT-3.5 60.02 → 51.93; GPT-4 75.82
  (L8) with its **peak 79.09 at L4**; Llama-2-70B **55.11 → 28.44**.
- **arXiv:2510.04950** — *Mind Your Tone* (Dobariya & Kumar, Penn State, v1 2025-10-06). The viral
  "rude is better" paper. 50 questions × 5 tones × 10 runs, ChatGPT-4o only. Very Polite 80.8% →
  Very Rude 84.8%. **Its own limits:** 4 pp ≈ 2 questions; the t-tests run over 10 reruns of the
  *same* 50 items, so they test run-to-run noise rather than question sampling; 8 pairwise
  comparisons with no multiple-comparison correction; gold answers generated by ChatGPT.
- **arXiv:2605.29027** — *Mind Your Tone: Does Tone Alter LLM Performance?* Same authors,
  v1 2026-05-27, **accepted as a full paper at AMCIS 2026**. The follow-up that undercuts the
  headline. 570-question MMLU subset × 7 tones × 4 models. Spreads: ChatGPT-4o **2.05 pp** (peak =
  **Neutral**); Gemini 2.5 Flash 1.3 pp; ChatGPT-5-nano **11.12 pp** (peak = Neutral);
  Gemini 2.5 Flash Lite **12.46 pp** (peak = Polite). Conclusion: tone effects are *"systematic but
  highly model-dependent"* — **no single tone wins across models**, and the 50-question result did
  not replicate.
- **arXiv:2508.00614** — *Prompting Science Report 3: I'll pay you or I'll kill you — but will you
  care?* Meincke, E. Mollick, L. Mollick, Shapiro. v1 2025-08-01. The direct test of tipping and
  threats. 5 models × 9 conditions, 25 trials/question → **4,950 runs per prompt per model** on
  GPQA Diamond, 2,500 on MMLU-Pro. Only 5 significant differences on GPQA and 10 on MMLU-Pro, all
  **uncorrected** for multiple comparisons and all small. "Important to Career" measured
  **RD = −0.040 (p = 0.002)** on Gemini 2.0 Flash — it *hurt*.
- **arXiv:2307.11760** — *Large Language Models Understand and Can be Enhanced by Emotional
  Stimuli* (EmotionPrompt). v7 2023-11-12. The origin of "this is very important to my career":
  +8% relative on Instruction Induction, +115% relative on BIG-Bench (off a low base — routinely
  misquoted as "115% better"), +10.9% in a 106-participant human study.
- **Prompting Science Report 1** — *Prompt Engineering is Complicated and Contingent*.
  SSRN `abstract_id=5165270`, 2025-03-04. 100 repetitions per question. "Please" vs "I order you"
  shifts individual questions by **up to ~60 pp in either direction** but **cancels out across the
  dataset**. `[UNVERIFIED]`: appears to be SSRN-only; no arXiv ID confirmed.
- **Report 4** — *Playing Pretend: Expert Personas Don't Improve Factual Accuracy*, 2025-12-07.
  Expert personas give no factual-accuracy benefit despite appearing in vendor docs.
  `[UNVERIFIED]` arXiv ID.
- Do **not** conflate with *Call Me A Jerk: Persuading AI to Comply with Objectionable Requests*
  (SSRN `5357179`, with Cialdini) — persuasion tactics **do** move **compliance/jailbreak** rates.
  That is a different dependent variable from task accuracy.

## 5. Prompt brittleness — why you A/B on an eval set, never on five examples

- **arXiv:2310.11324** — *Quantifying Language Models' Sensitivity to Spurious Features in Prompt
  Design* (FormatSpread). Sclar, Choi, Tsvetkov, Suhr. v2 2024-07-01, **ICLR 2024**. Up to
  **76 accuracy points** difference on LLaMA-2-13B from meaning-preserving formatting changes.
  Sensitivity persists with model size, more few-shot examples, and instruction tuning. Format
  performance correlates only weakly across models, so comparing models on one fixed format is
  methodologically invalid.
- **arXiv:2401.00595** — *State of What Art? A Call for Multi-Prompt LLM Evaluation*. **TACL**,
  v3 2024-05-06. 6.5M instances, 20 LLMs, 39 tasks. Single-prompt evaluation reshuffles **model
  rankings**, and max-performance vs average-performance metrics disagree about which model is
  state of the art.
- **arXiv:2503.00137** — *SCORE* (NVIDIA), **NAACL 2025 Industry Track**. Paraphrasing on MMLU-Pro
  moves accuracy **up to 10%**; reordering answer choices on AGIEval **up to 6.1%**. Sampling noise
  alone produces run-to-run inconsistency.
- **arXiv:2509.01790** — *Flaw or Artifact? Rethinking Prompt Sensitivity in Evaluating LLMs*.
  **EMNLP 2025 Main**. The necessary counterweight: much measured prompt sensitivity is an
  **artifact of the evaluation method** — log-likelihood scoring and rigid answer matching mark
  correct-but-differently-phrased answers wrong. LLM-as-a-Judge scoring substantially reduces
  variance. Modern LLMs are **more robust than the 2023-era literature implies.**
- **arXiv:2604.08571** — *Robust Reasoning Benchmark* (v3 2026-07-21). 13 perturbations on AIME
  2024/2025 × 8 models. Frontier models largely resilient — **except Claude, which categorically
  refuses many transformed prompts** (a new brittleness mode). Open-weights reasoning models drop
  **up to 54%** average accuracy.

**The practical rule to teach:** report performance over a *range* of prompt variants; never A/B a
prompt on a handful of questions. That is precisely the failure mode of the viral rude-prompt
result.

## 6. Two citation traps worth teaching in the module itself

1. **Venue fields are often absent on arXiv.** Of the canon papers checked, **CoT (2201.11903),
   Reflexion (2303.11366), Self-Refine (2303.17651), GPT-3 (2005.14165) and The Prompt Report
   (2406.06608)** carry **no venue** in their arXiv Comments field. Citing "NeurIPS 2022" for the
   CoT paper from arXiv metadata is unsupported.
2. **Version-dependent numbers.** *The Prompt Report* (2406.06608) went v1 → **v6 (2025-02-26)**
   and its counts changed across revisions. As of v6: **33 vocabulary terms, 58 text-based
   prompting techniques, 40 for other modalities.** Always quote it with the version.

## 7. Canon reference table — verified IDs, dates and venues

| Paper | arXiv | Latest ver. | Venue (from Comments) |
|---|---|---|---|
| Chain-of-Thought Prompting | 2201.11903 | v6 2023-01-10 | **not stated** |
| Zero-shot CoT ("Let's think step by step") | 2205.11916 | v4 2023-01-29 | NeurIPS 2022 |
| Self-Consistency | 2203.11171 | v4 2023-03-07 | ICLR 2023 |
| ReAct | 2210.03629 | v3 2023-03-10 | ICLR (year not in field) |
| Reflexion | 2303.11366 | v4 2023-10-10 | **not stated** |
| Self-Refine | 2303.17651 | v2 2023-05-25 | **not stated** |
| Tree of Thoughts | 2305.10601 | v2 2023-12-03 | NeurIPS 2023 |
| Least-to-Most Prompting | 2205.10625 | v3 2023-04-16 | ICLR 2023 |
| GPT-3 / Few-Shot Learners | 2005.14165 | v4 2020-07-22 | **not stated** |
| Many-Shot ICL | 2404.11018 | v3 2024-10-17 | NeurIPS (Spotlight) |
| Rethinking the Role of Demonstrations | 2202.12837 | v2 2022-10-20 | EMNLP 2022 (long) |
| Fantastically Ordered Prompts | 2104.08786 | v2 2022-03-03 | ACL 2022 |
| Calibrate Before Use | 2102.09690 | v2 2021-06-10 | ICML 2021 |
| The Prompt Report (survey) | 2406.06608 | v6 2025-02-26 | **no Comments field** |

Useful ICL findings for the module: **Rethinking the Role of Demonstrations** found that
**randomly replacing labels in the demonstrations barely hurts performance**, consistently across
12 models including GPT-3 — what demonstrations supply is the label space, the input
distribution and the format, not the input-label mapping. **Fantastically Ordered Prompts** found
example *order alone* can move results between near-SOTA and random-guessing, with a **13%
relative improvement** from entropy-based permutation selection. **Calibrate Before Use** raised
GPT-3/GPT-2 average accuracy **up to 30.0% absolute** by calibrating on a content-free input.

## 8. Related: the self-correction limits (shared with Module 13)

Relevant to Module 8 only as a one-line caution against "ask the model to check its own work":

- **arXiv:2310.01798** — *Large Language Models Cannot Self-Correct Reasoning Yet* (Google
  DeepMind/UIUC), **ICLR 2024**. Intrinsic self-correction **degrades** accuracy: GPT-4 GSM8K
  95.5 → 91.5 → 89.0. The gains reported in earlier work came from an **oracle label** telling the
  model when to stop.
- **arXiv:2406.01297** — Kamoi et al., **TACL 2024**. No prior work demonstrates successful
  self-correction using feedback from prompted LLMs on general reasoning; it works with
  **reliable external feedback** (code execution, retrieval, a trained verifier).
- **arXiv:2511.22173** — *RefineBench* (2025-11-27). Same shape three model generations later:
  self-refinement across iterations gains **+1.8%** for Gemini 2.5 Pro and **−0.1%** for
  DeepSeek-R1.

## Link Verification Log

Every arXiv ID in this file was resolved by fetching `https://arxiv.org/abs/<id>` and confirming
title, author list, version history and abstract content on **2026-08-25**. Full-text fetches
(`/pdf/` or `/html/`) were additionally used for 2409.12183, 2506.07142, 2508.00614, 2305.04388,
2310.01798, 2412.21187, 2501.18585 and 2507.14417 to extract the exact figures quoted above.

Explicitly **not** verified, and flagged inline where used:
- SSRN-only items: Prompting Science Reports 1 and 4 (no arXiv ID confirmed).
- *Chain-of-Thought Is Not Explainability* (Barez et al.) — **not on arXiv**; alphaXiv preprint
  2025.02v1 / Oxford Martin AIGI. Do not cite it with an arXiv ID.
- ShieldGemma-style context limits, MINJA's headline percentages, and the exact coinage date of
  "slopsquatting" — see the Module 12 supplements.
