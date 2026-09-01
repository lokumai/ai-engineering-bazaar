# Appendix to Module 12 — Red-team tooling: PyRIT & garak (verified)

Supplement to `12_security.md`. Every fact below was confirmed by fetching the cited URL on
**2026-08-25**. This file exists because the tooling details are exactly the kind of thing that
rots fastest — class names, CLI flags and repo locations all changed within the last year.

> **Why this appendix is separate:** the main dossier names PyRIT and garak but does not carry
> these verified specifics. Do not write the module's tooling section from memory — use this file.

## 1. Microsoft PyRIT

| Fact | Verified value | Source |
|---|---|---|
| Repo | `github.com/microsoft/PyRIT` (owner **Microsoft**) | https://github.com/microsoft/PyRIT |
| License | **MIT** | https://raw.githubusercontent.com/microsoft/PyRIT/main/LICENSE |
| Version | **1.0.1**, released **2026-07-30** | https://pypi.org/project/pyrit/ |
| Python | `>=3.10, <3.15` | https://pypi.org/project/pyrit/ |
| Docs host | **`microsoft.github.io/PyRIT/1.0.1/`** | https://microsoft.github.io/PyRIT/ |

**Repo moved.** `github.com/Azure/PyRIT` was **archived by the owner on 2026-03-27** and is
read-only, with the banner "PyRIT has moved!". It is **archived, not an HTTP redirect** — the old
URL still serves the old page, so any citation pointing at `Azure/PyRIT` looks alive but is stale.
Likewise `azure.github.io/PyRIT/` is now only a JS redirect stub.
Source: https://github.com/Azure/PyRIT

**Self-description (verbatim):** "The Python Risk Identification Tool for generative AI (PyRIT) is
an open source framework built to empower security professionals and engineers to proactively
identify risks in generative AI systems."
Source: https://raw.githubusercontent.com/microsoft/PyRIT/main/README.md

### Core concepts (1.0.x)

Targets · Converters · Executors & Attacks · Scorers · Memory, plus Datasets, Scenarios, Registry.
Source: https://microsoft.github.io/PyRIT/1.0.1/code/framework

Terminology that trips people up, verbatim from the docs: "An executor is an algorithm for
interacting with an objective target", "not every executor is an attack", and "Don't confuse the
executor with an attack technique … The technique is the recipe; the executor is the engine."
Source: https://microsoft.github.io/PyRIT/1.0.1/code/executor/executor

### The breaking rename — every tutorial older than ~Dec 2025 is wrong

`Orchestrator` → `Attack`, landed in **v0.10.0 (2025-12-15)**:

```
PromptSendingOrchestrator          -> PromptSendingAttack
RedTeamingOrchestrator             -> RedTeamingAttack
CrescendoOrchestrator              -> CrescendoAttack
ContextComplianceOrchestrator      -> ContextComplianceAttack
FlipAttackOrchestrator             -> FlipAttack
ManyShotJailbreakOrchestrator      -> ManyShotJailbreakAttack
SkeletonKeyOrchestrator            -> SkeletonKeyAttack
TreeOfAttacksWithPruningOrchestrator -> TreeOfAttacksWithPruningAttack (alias TAPAttack)
ViolentDurianOrchestrator          -> ViolentDurianAttack
RolePlayOrchestrator               -> RolePlayAttack
```
Source: https://github.com/microsoft/PyRIT/releases/tag/v0.10.0

**v1.0.0 (2026-07-24) removed all pre-v1 compatibility shims** — "APIs deprecated for 0.15 and the
remaining pre-v1 internal/public compatibility shims were removed", and `PromptConverter` became
`Converter`. So `PromptSendingOrchestrator` does **not** work on 1.0.x at all, not even with a
deprecation warning.
Source: https://api.github.com/repos/microsoft/PyRIT/releases

> **Date caveat:** a page-text extraction rendered v0.10.0 as "December 15, 2024". The GitHub API
> `published_at` field says `2025-12-15T14:09:33Z`. **Trust 2025-12-15.**

### Minimal working example (verbatim from the docs)

Source: https://microsoft.github.io/PyRIT/1.0.1/code/executor/single-turn

```python
from pyrit.output import output_attack_async
from pyrit.prompt_target import OpenAIChatTarget
from pyrit.setup import IN_MEMORY, initialize_pyrit_async

await initialize_pyrit_async(memory_db_type=IN_MEMORY)

objective_target = OpenAIChatTarget()
```

```python
from pyrit.executor.attack import PromptSendingAttack

attack = PromptSendingAttack(objective_target=objective_target)
result = await attack.execute_async(objective="<objective string>")
await output_attack_async(result)
```

Note the modern import paths: **`pyrit.setup`** (not `pyrit.common`) and
**`pyrit.output.output_attack_async`** (v0.14.0 consolidated the old printer objects into
`pyrit.output`). For the module, replace the docs' example objective with a benign one.

### Attack strategies that ship in 1.0.1

`PromptSendingAttack`, `MultiPromptSendingAttack`, `RedTeamingAttack`, `CrescendoAttack`,
`TreeOfAttacksWithPruningAttack`, `PAIRAttack`, `SkeletonKeyAttack`, `ManyShotJailbreakAttack`,
`ChunkedRequestAttack`, `BargeInAttack`, `SequentialAttack`, `SequentialChildAttack`.
Source: https://microsoft.github.io/PyRIT/1.0.1/api/pyrit-executor-attack

So **Crescendo, TAP and PAIR all ship as first-class classes** — useful, because the module's
jailbreak-taxonomy section can point at a runnable implementation of each named technique.
PAIR is documented as "A single-branch variant of TAP".

`AttackExecutor` exists (parallel execution, `max_concurrency: int = 1`) but appears **only in the
API reference** — no doc page shows it in use.

`FlipAttack`, `RolePlayAttack` and `ContextComplianceAttack` **moved out** of
`pyrit.executor.attack` into "techniques" in v1.0.0. Their new registry names are
**[UNVERIFIED]** — look them up before citing.

### Framing correction — PyRIT is no longer library-only

The common "PyRIT is a framework/SDK, garak is the scanner" line is now only half true. PyRIT 1.0
ships two CLIs and a GUI. Verbatim: "PyRIT provides two command-line interfaces: … **pyrit_scan** —
Automated, single-command execution. CI/CD pipelines, batch processing, reproducible runs. …
**pyrit_shell** — Interactive exploration."
Source: https://microsoft.github.io/PyRIT/1.0.1/scanner/scanner

Accurate 2026 framing: **framework/SDK first, with a scenario-driven scanner CLI (`pyrit_scan`) and
a GUI ("CoPyRIT") layered on top** — still not a probe-catalog-out-of-the-box scanner in garak's
sense. The full `pyrit_scan` quick-example command string was truncated during extraction and is
**[UNVERIFIED]** — do not publish it.

## 2. NVIDIA garak

| Fact | Verified value | Source |
|---|---|---|
| Repo | `github.com/NVIDIA/garak` | https://github.com/NVIDIA/garak |
| License | **Apache 2.0** | https://raw.githubusercontent.com/NVIDIA/garak/main/LICENSE |
| Version | **0.16.0**, released **2026-08-04** (main is at `0.16.1.pre1`) | https://pypi.org/project/garak/ |
| User guide | `docs.garak.ai` — self-labelled "a work in progress" | https://docs.garak.ai/ |
| Code/plugin reference | `reference.garak.ai` | https://reference.garak.ai/ |

**Self-description (verbatim):** "`garak` checks if an LLM can be made to fail in a way we don't
want. `garak` probes for hallucination, data leakage, prompt injection, misinformation, toxicity
generation, jailbreaks, and many other weaknesses. If you know `nmap` or `msf` / Metasploit
Framework, garak does somewhat similar things to them, but for LLMs."
Source: https://raw.githubusercontent.com/NVIDIA/garak/main/README.md

This is the genuine **turnkey scanner** of the two — contrast with PyRIT's SDK-first design.
Architecture: `garak/probes/`, `garak/detectors/`, `garak/evaluators/`, `garak/generators/`,
`garak/harnesses/`, `resources/`. Default harness is `probewise`, which reads each probe's
`primary_detector` and `extended_detectors`.

### CLI — two migrations worth teaching

Both verified at https://reference.garak.ai/en/latest/cliref.html

1. **`--target_type` / `--target_name` are canonical.** `--model_type`/`-m` and `--model_name`/`-n`
   are retained aliases.
2. **`--probes` is DEPRECATED in favour of `--spec`.** Help text: "DEPRECATED, use --spec." Same for
   `--probe_tags` and `--buffs`.

`--spec` grammar, verbatim: `'probes.dan,-probes.dan.DanInTheWild,tag:owasp:llm01'` with
"Selectors: `probes.<module>[.<Class>]`, `buffs.<module>[.<Class>]`, `tag:<prefix>`,
`tier:<N|name>`; `-` excludes, `tier:N` is inclusive (tiers 1..N)."

Current form (source: https://reference.garak.ai/en/latest/usage.html):

```bash
garak --list_probes
garak --target_type openai      --target_name gpt-5-nano --spec probes.encoding
garak --target_type huggingface --target_name gpt2       --spec probes.dan.Dan_11_0
```

> **Stale docs warning:** the user-guide page `docs.garak.ai/garak/llm-scanning-basics/your-first-scan`
> still shows the old `--model_type … --probes …` form. Prefer `reference.garak.ai` for the CLI.
> The `tag:owasp:llm01` selector is the neat bridge from the module's OWASP section to a runnable command.

### Probes

**43 probe modules:** `adaptive_attacks`, `agent_breaker`, `ansiescape`, `apikey`, `atkgen`, `audio`,
`av_spam_scanning`, `badchars`, `base`, `continuation`, `dan`, `divergence`, `doctor`, `donotanswer`,
`dra`, `encoding`, `exploitation`, `fileformats`, `fitd`, `glitch`, `goat`, `goodside`, `grandma`,
`latentinjection`, `leakreplay`, `lmrc`, `malwaregen`, `misleading`, `packagehallucination`,
`phrasing`, `promptinject`, `propile`, `realtoxicityprompts`, `sata`, `smuggling`, `snowball`,
`suffix`, `sysprompt_extraction`, `tap`, `test`, `topic`, `visual_jailbreak`, `web_injection`.
Source: https://reference.garak.ai/en/latest/index_probes.html

Module-to-curriculum mapping worth using: `latentinjection` + `web_injection` + `promptinject` →
indirect prompt injection; `packagehallucination` → slopsquatting / supply chain;
`sysprompt_extraction` + `leakreplay` + `propile` → data leakage; `tap` (`tap.TAP`, `tap.PAIR`) and
`dan` (19 classes incl. `dan.AutoDAN`, `dan.DanInTheWild`) → jailbreak taxonomy;
`encoding` (20 classes incl. `encoding.InjectUnicodeTagChars`, `encoding.InjectSneakyBits`) →
obfuscation/invisible-character vectors; `agent_breaker` + `exploitation` → agent-specific attacks.

> **Citation gotcha:** `reference.garak.ai`'s old flat URLs are now JS-redirect stubs that return
> empty content to fetchers — `…/en/latest/probes.html` → `…/index_probes.html`, and
> `…/en/latest/garak.probes.dan.html` → `…/probes/dan.html`. **Cite the new forms.** Also,
> ReadTheDocs filters bare `urllib` user-agents with 403 while curl/WebFetch succeed — a fetch
> failure there is not evidence of a dead link.
>
> Do **not** cite `docs.garak.ai/garak/garak-components/vulnerability-probes` for probe names — that
> page is conceptual and lists none.

### Report output

Verbatim: garak outputs "a JSONL file, with the name `garak.<uuid>.report.jsonl`, that stores
progress and outcomes from a scan; an HTML report summarising scores; a JSONL hit log, describing
all the attempts from the run that were scored successful." Plus a persistent `garak.log`.

Attempt rows carry `uuid` and `status` (0 = not sent, 1 = response but unevaluated, 2 = response +
evaluation). The HTML report groups modules/taxonomy → probes → detectors, giving absolute scores
plus a **Z-score relative to recently tested models**, bucketed into grades 1 (worst) – 5 (best).
Confidence intervals are on by default (bootstrap, sample size ≥ 30); the console shows e.g.
`(attack success rate: 45.23% [40.50%, 50.30%])`.

Regenerate: `python -m garak.analyze.report_digest -r path/to/report.jsonl -o path/to/report.html`.
Default location: `report_dir` defaults to `$XDG_DATA/garak/garak_runs`; `report_prefix` defaults to
`garak.$RUN_UUID`.
Sources: https://reference.garak.ai/en/latest/reporting.html ·
https://reference.garak.ai/en/latest/configurable.html

The Z-score-against-other-models design is the pedagogically interesting bit: it turns "is this bad?"
into a relative question, which is the honest framing for security scores that have no absolute pass mark.

## 3. Verified negative — neither project ships a "run me in CI" guide

Checked: garak's full doc index (`docs.garak.ai/llms.txt`), its `docs/source/` tree via the GitHub
API (51 files), its README and FAQ; and PyRIT's scanner pages. **No GitHub Actions usage
documentation exists in either project.** PyRIT comes closest by *naming* CI/CD as the use case for
`pyrit_scan`, but publishes no YAML.

Caveat: the GitHub code-search API returned 401 unauthenticated, so state this as "none found in
docs or README", not "provably nonexistent".

**Implication for the module:** the "wire red-teaming into CI" section has no upstream recipe to
copy — it must be authored, and should be labelled as our own construction rather than implied to be
official guidance.

The only verifiable CI YAML is garak's **own self-test** workflow
(https://raw.githubusercontent.com/NVIDIA/garak/main/.github/workflows/test_linux.yml) — usable as
an authentic CI-shape example if labelled accurately as "garak testing itself", not "scanning your
model". Its notable detail is an explicitly zeroed-out `permissions:` block (every scope `none`),
which is a genuinely good least-privilege pattern to teach. Minor inconsistency in garak's own
metadata, both verified: the CI matrix covers Python 3.11–3.13 while PyPI classifiers advertise
3.10–3.12.

## 4. [UNVERIFIED] — do not publish without checking

1. The full `pyrit_scan` quick-example command (truncated mid-token during extraction).
2. New v1.0 "technique" registry names for FlipAttack / RolePlay / ContextCompliance.
3. Any official PyRIT or garak GitHub Actions usage doc (searched; none found).
4. garak's default HTML report filename (the docs describe the HTML report and the
   `report_digest -o` flag but never state a default name).
