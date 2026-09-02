import type { RoleId } from './roles'

/**
 * §13.4 — the nine learning paths, as plain build-time data.
 *
 * A path is an ORDERED LIST OF STEPS OVER SHEETS THAT ALREADY EXIST. It is
 * authored, not generated: every `reason` below was written by reading the sheet
 * it points at, and then audited against that file by a reader who had not
 * written it. A reason that could not be evidenced was rewritten or its step
 * dropped. `tests/unit/path/honesty.test.ts` re-checks the mechanical half of
 * that on every run, and `tests/fixtures/path-evidence.json` holds the quotation
 * behind each reason so the grounding stays checkable.
 *
 * **Three honesty rules are encoded here rather than left to the renderer.**
 *
 * 1. **A path is a view, not a gate** (§13.4.4). Nothing here prevents anything.
 *    Every sheet stays reachable from `/courses/`, keeps its own sign-off
 *    control, and a reader with no role has the whole corpus exactly as Phase 2
 *    left it.
 *
 * 2. **A draft step never promises a lesson** (§13.4.2). 17 of the 32 sheets are
 *    drafts holding a topic list and nothing else. A path may include one,
 *    because a roadmap that stops at the edge of today's content is a worse
 *    roadmap — but its `reason` says what the sheet is PLANNED to cover, and its
 *    tier is always `context`, because a sheet with no content cannot be
 *    anything more. That last rule is structural: `draftTierIsContext` in the
 *    honesty test checks all nine paths, and it caught two steps that three
 *    independent auditors had passed.
 *
 * 3. **A draft step is excluded from the denominator.** `drawnCount` counts
 *    drawn steps only, so a path with 12 drawn and 2 draft steps reports
 *    `n of 12`. Reporting `n of 14` would ask the reader to finish sheets nobody
 *    has written.
 *
 * `module` is carried for display and ordering only. The slug is the identity
 * (§12.1.3); the set has been renumbered before.
 *
 * This module imports nothing but its sibling's type (§12.2).
 */

export type Tier = 'core' | 'supporting' | 'context'

export interface PathStep {
  /** `intermediate/security` — the identity. */
  slug: string
  /** The label the sheet prints as. Display and ordering only. */
  module: number
  /**
   * `core` = this role cannot do the job without it. `supporting` = it
   * materially helps. `context` = useful breadth, and the only tier a draft
   * sheet may hold.
   */
  tier: Tier
  /**
   * Reader-visible, ≤140 characters. Why THIS role reads THIS sheet, naming
   * something the sheet actually contains. Scanned by
   * `tests/unit/copy-register.test.ts` like every other string a reader sees.
   */
  reason: string
}

export interface LearningPath {
  role: RoleId
  steps: readonly PathStep[]
}

/** The 15 drawn sheets, by module number. Draft sheets are 16–32. */
const DRAWN_THROUGH = 15

export function isDrawnStep(step: PathStep): boolean {
  return step.module <= DRAWN_THROUGH
}

/** §13.4.2 — the denominator. Drawn steps only, never the whole list. */
export function drawnCount(path: LearningPath): number {
  return path.steps.filter(isDrawnStep).length
}

export const PATHS: readonly LearningPath[] = [
  // software-engineer: 12 drawn, 2 draft — the tally reads “n of 12”.
  {
    role: 'software-engineer',
    steps: [
      {
        slug: 'fundamentals/llms',
        module: 1,
        tier: 'core',
        reason:
          'Sets the floor: what a next-token predictor does, and how temperature, max output tokens and the context window change what comes back',
      },
      {
        slug: 'fundamentals/rag',
        module: 3,
        tier: 'context',
        reason:
          'Retrieve-then-generate and vector stores, so repo indexing and search choices are not a black box later',
      },
      {
        slug: 'fundamentals/tools',
        module: 4,
        tier: 'core',
        reason:
          'A tool is a function you write; this sheet shows who actually executes the call and what a tool schema must contain',
      },
      {
        slug: 'fundamentals/memory',
        module: 5,
        tier: 'supporting',
        reason:
          'Separates parametric, working and long-term memory, and shows that working memory is the context window resent on every call',
      },
      {
        slug: 'fundamentals/agents',
        module: 6,
        tier: 'core',
        reason:
          'The agent loop itself: what ends it, and how the system prompt tells the model which tools exist',
      },
      {
        slug: 'intermediate/prompt-engineering',
        module: 8,
        tier: 'supporting',
        reason:
          'Retires the folklore, keeps the one layout rule, and covers making output machine-readable for code that parses it',
      },
      {
        slug: 'intermediate/context-engineering',
        module: 9,
        tier: 'supporting',
        reason:
          'The four levers (compress, offload, isolate, anchor) and what belongs in CLAUDE.md when an agent works your repo',
      },
      {
        slug: 'intermediate/coding-agents',
        module: 10,
        tier: 'core',
        reason:
          'The six extension points (instruction files, skills, subagents, hooks, MCP servers, plugins) and a decision table for picking one',
      },
      {
        slug: 'intermediate/harness-engineering',
        module: 11,
        tier: 'core',
        reason:
          'Reliability lives in the program around the model: the hook contract, the isolation ladder, and placing a task on the autonomy ladder',
      },
      {
        slug: 'intermediate/security',
        module: 13,
        tier: 'supporting',
        reason:
          'An agent acting with your credentials on attacker-writable text: prompt injection, MCP tool poisoning and rug pulls, exfiltration channels',
      },
      {
        slug: 'intermediate/loop-engineering',
        module: 12,
        tier: 'core',
        reason:
          'Workflow or autonomous agent, which composition pattern fits the task shape, and a verifier ladder with rubric evals wired into CI',
      },
      {
        slug: 'expert/advanced-architectures',  // draft
        module: 16,
        tier: 'context',
        reason:
          'A draft sheet with no lesson yet; planned to cover ReAct, CodeAct and dynamic workflows as loop shapes beyond Observe-Decide-Act',
      },
      {
        slug: 'expert/advanced-harness-engineering',  // draft
        module: 22,
        tier: 'context',
        reason:
          'A draft sheet with no lesson yet; planned to cover harness profiles, system prompts, and reshaping tools for a given context',
      },
    ],
  },
  // devops: 10 drawn, 3 draft — the tally reads “n of 10”.
  {
    role: 'devops',
    steps: [
      {
        slug: 'fundamentals/llms',
        module: 1,
        tier: 'supporting',
        reason:
          'Names the knobs that end up on your bill: the context window limit, quantization, and how inference is actually executed',
      },
      {
        slug: 'fundamentals/tools',
        module: 4,
        tier: 'supporting',
        reason:
          'Establishes that your runtime, not the model, executes a tool call — the boundary every permission rule sits on',
      },
      {
        slug: 'fundamentals/agents',
        module: 6,
        tier: 'core',
        reason:
          'The observe-decide-act loop and what ends it; termination is what a pipeline step depends on',
      },
      {
        slug: 'intermediate/coding-agents',
        module: 10,
        tier: 'core',
        reason:
          'Hooks are the deterministic control point: 31 lifecycle events, with PreToolUse able to block a tool before it runs',
      },
      {
        slug: 'intermediate/harness-engineering',
        module: 11,
        tier: 'core',
        reason:
          'The isolation ladder rates worktree, bubblewrap, Docker, gVisor and Firecracker on strength, setup cost and overhead',
      },
      {
        slug: 'intermediate/security',
        module: 13,
        tier: 'core',
        reason:
          'Denial of wallet, slopsquatting and CVE-2025-8217 describe what an agent does to a pipeline and to its own configuration',
      },
      {
        slug: 'intermediate/loop-engineering',
        module: 12,
        tier: 'core',
        reason:
          'Gives the blocking per-PR gate and the nightly regression run, with pass rate, mean tool calls, tokens and wall-clock tracked',
      },
      {
        slug: 'intermediate/context-engineering',
        module: 9,
        tier: 'supporting',
        reason:
          'Prices the bill: cache reads at 0.1x, one-hour writes at 2x, and a breakpoint in the wrong place costing every cache hit',
      },
      {
        slug: 'intermediate/personal-agents',
        module: 14,
        tier: 'supporting',
        reason:
          'Ops detail for unattended runs: --timeout-seconds, script tool budgets, failure alerts, and a supervised service over a while-true loop',
      },
      {
        slug: 'ecosystem/observability',  // draft
        module: 29,
        tier: 'context',
        reason:
          'Planned coverage of LangSmith, LangFuse and trace-analyzer agents; the sheet holds a topic list until it is written',
      },
      {
        slug: 'optional/runtime',  // draft
        module: 33,
        tier: 'context',
        reason:
          'Slated for checkpoints, fault tolerance and time travel across long failure-prone runs; no lesson content there yet',
      },
      {
        slug: 'expert/advanced-deployment',  // draft
        module: 23,
        tier: 'context',
        reason:
          'Earmarked for agent servers and the LangChain Agent Protocol, the production-service shape; still an outline only',
      },
    ],
  },
  // data-engineer: 11 drawn, 3 draft — the tally reads “n of 11”.
  {
    role: 'data-engineer',
    steps: [
      {
        slug: 'fundamentals/llms',
        module: 1,
        tier: 'core',
        reason:
          'Retrieval budgets start at the context window, and this sheet sets out what happens when you exceed it',
      },
      {
        slug: 'fundamentals/training',
        module: 2,
        tier: 'supporting',
        reason:
          'Gives you the fine-tuning and PEFT cost picture you need to argue for an indexing pipeline instead of retraining',
      },
      {
        slug: 'fundamentals/rag',
        module: 3,
        tier: 'core',
        reason:
          'The centre of this role: cosine similarity over embeddings, chunking at index time, and vector stores from FAISS to Pinecone',
      },
      {
        slug: 'fundamentals/tools',
        module: 4,
        tier: 'supporting',
        reason:
          'Shows what a tool schema must contain and who executes the call, which is the boundary where an agent reaches into your stores',
      },
      {
        slug: 'fundamentals/memory',
        module: 5,
        tier: 'core',
        reason:
          'Separates parametric, working and long-term memory, and places long-term memory in external storage retrieved back through RAG',
      },
      {
        slug: 'fundamentals/agents',
        module: 6,
        tier: 'supporting',
        reason:
          'The observe-decide-act loop explains how many retrieval and write calls one task can generate against your systems',
      },
      {
        slug: 'intermediate/prompt-engineering',
        module: 8,
        tier: 'supporting',
        reason:
          'Read it for the section on making output machine-readable, which matters when a model response becomes a row downstream',
      },
      {
        slug: 'intermediate/context-engineering',
        module: 9,
        tier: 'core',
        reason:
          'The four levers of compress, offload, isolate and anchor, plus prompt caching, keep retrieved chunks affordable',
      },
      {
        slug: 'intermediate/harness-engineering',
        module: 11,
        tier: 'supporting',
        reason:
          'Hooks and the isolation ladder give deterministic gates on tool calls, so an agent cannot write to a production store unreviewed',
      },
      {
        slug: 'intermediate/security',
        module: 13,
        tier: 'core',
        reason:
          'Covers MCP tool poisoning, rug pulls and exfiltration channels, the attack classes that follow untrusted documents entering your index',
      },
      {
        slug: 'intermediate/loop-engineering',
        module: 12,
        tier: 'core',
        reason:
          'A verifier ladder and a rubric-eval cookbook for agent-authored changes, with deterministic gates in CI before any judge call',
      },
      {
        slug: 'expert/advanced-tools',  // draft
        module: 17,
        tier: 'context',
        reason:
          'Still a draft topic list. It marks where the planned comparison of RAG against agentic search will sit once written',
      },
      {
        slug: 'expert/advanced-memory',  // draft
        module: 18,
        tier: 'context',
        reason:
          'A draft outline only. It lists the long-term memory systems planned for later coverage, including Cognee and entire provenance',
      },
      {
        slug: 'ecosystem/observability',  // draft
        module: 29,
        tier: 'context',
        reason:
          'Not written yet. The topic list names LangSmith, LangFuse and trace-analyzer agents as the planned tracing coverage',
      },
    ],
  },
  // data-analyst: 12 drawn, 2 draft — the tally reads “n of 12”.
  {
    role: 'data-analyst',
    steps: [
      {
        slug: 'fundamentals/llms',
        module: 1,
        tier: 'core',
        reason:
          'Sets temperature and max output tokens, and recommends 0.1-0.3 where consistency matters more than invention',
      },
      {
        slug: 'fundamentals/training',
        module: 2,
        tier: 'context',
        reason:
          'Covers pre-training, fine-tuning and PEFT, so the cost argument the RAG module makes later has something to stand on',
      },
      {
        slug: 'fundamentals/rag',
        module: 3,
        tier: 'core',
        reason:
          'Walks indexing and querying end to end, and argues why retrieval beats fine-tuning for data that changes daily',
      },
      {
        slug: 'fundamentals/tools',
        module: 4,
        tier: 'core',
        reason:
          'Shows what a tool definition owes the model — name, inputs, outputs — and the @tool decorator that registers a plain function',
      },
      {
        slug: 'fundamentals/memory',
        module: 5,
        tier: 'supporting',
        reason:
          'Separates parametric, working and long-term memory, and pins working memory to the context window your retrieved rows compete for',
      },
      {
        slug: 'intermediate/prompt-engineering',
        module: 8,
        tier: 'core',
        reason:
          'Gives the one layout rule — long content first, question last — and constrained decoding for output a dashboard can parse',
      },
      {
        slug: 'intermediate/context-engineering',
        module: 9,
        tier: 'supporting',
        reason:
          'Names four context failure modes — poisoning, distraction, confusion, clash — the ones behind answers that drift mid-session',
      },
      {
        slug: 'fundamentals/agents',
        module: 6,
        tier: 'core',
        reason:
          'The observe-decide-act loop, and how the system prompt tells a model which tools exist, which is what a querying assistant runs on',
      },
      {
        slug: 'fundamentals/multi-agent',
        module: 7,
        tier: 'core',
        reason:
          'Its worked example is your job: a SQL agent writing the query, a visualisation agent turning the results into a bar chart',
      },
      {
        slug: 'intermediate/loop-engineering',
        module: 12,
        tier: 'supporting',
        reason:
          'The verifier ladder ranks rules and linters above an LLM judge, which is how a generated query gets checked before its numbers travel',
      },
      {
        slug: 'intermediate/security',
        module: 13,
        tier: 'supporting',
        reason:
          'Retrieved tables and tickets count as semi-trusted input; the sheet covers prompt injection and the exfiltration channels that follow',
      },
      {
        slug: 'intermediate/personal-agents',
        module: 14,
        tier: 'context',
        reason:
          'Turns a recurring report into a scheduled run: cron and --at triggers, a delivery channel, and alerting for a job that dies silently',
      },
      {
        slug: 'expert/advanced-tools',  // draft
        module: 17,
        tier: 'context',
        reason:
          'A draft outline only. Its topic list promises RAG versus agentic search, and JSON versus CLI tools, once the module is written',
      },
      {
        slug: 'ecosystem/observability',  // draft
        module: 29,
        tier: 'context',
        reason:
          'Still an outline. Planned coverage names LangSmith, LangFuse and trace-analyzer agents for inspecting what a query agent did',
      },
    ],
  },
  // analyst: 11 drawn, 1 draft — the tally reads “n of 11”.
  {
    role: 'analyst',
    steps: [
      {
        slug: 'fundamentals/llms',
        module: 1,
        tier: 'core',
        reason:
          'Names the terms every requirement rests on: context window, temperature, max output tokens, and what truncation does to an answer',
      },
      {
        slug: 'fundamentals/training',
        module: 2,
        tier: 'supporting',
        reason:
          'Separates pre-training, full fine-tuning and PEFT, with a cost row you can put in front of a sponsor asking for a custom model',
      },
      {
        slug: 'fundamentals/rag',
        module: 3,
        tier: 'core',
        reason:
          'Answers the standing question of why not fine-tune on company documents: RAG changes what the model sees, fine-tuning changes what it knows',
      },
      {
        slug: 'fundamentals/tools',
        module: 4,
        tier: 'supporting',
        reason:
          'Shows where a model stops guessing and reads a real system, using the web-search and file-access examples a requirement has to specify',
      },
      {
        slug: 'fundamentals/memory',
        module: 5,
        tier: 'supporting',
        reason:
          'Turns "the assistant should remember" into a stated choice between parametric, working and long-term memory, each stored somewhere different',
      },
      {
        slug: 'fundamentals/agents',
        module: 6,
        tier: 'core',
        reason:
          'The Observe-Decide-Act loop and what ends it — the shape any agentic requirement is actually describing',
      },
      {
        slug: 'fundamentals/multi-agent',
        module: 7,
        tier: 'context',
        reason:
          'Compares manager-worker, network, hierarchical and agent-as-a-tool arrangements, and when one agent remains the right answer',
      },
      {
        slug: 'intermediate/prompt-engineering',
        module: 8,
        tier: 'core',
        reason:
          'The Obsolete-Advice Table marks which prompting claims no longer hold, and the one layout rule puts stable content first, the question last',
      },
      {
        slug: 'intermediate/context-engineering',
        module: 9,
        tier: 'core',
        reason:
          'Context rot with citations, and four named failure modes — poisoning, distraction, confusion, clash — for diagnosing a disappointing pilot',
      },
      {
        slug: 'intermediate/security',
        module: 13,
        tier: 'core',
        reason:
          'Pins prompt injection against jailbreak, and separates guardrails, which reduce attack success, from sandboxes, which bound consequences',
      },
      {
        slug: 'intermediate/loop-engineering',
        module: 12,
        tier: 'core',
        reason:
          'The Verifier Ladder holds that a model cannot grade itself, and the rubric cookbook starts from about 20 real cases with binary labels',
      },
      {
        slug: 'optional/human-in-the-loop',  // draft
        module: 32,
        tier: 'context',
        reason:
          'A placeholder today, listing interrupt and steering as its planned topics; hold it as a roadmap marker for keeping a person in control',
      },
    ],
  },
  // qa: 12 drawn, 2 draft — the tally reads “n of 12”.
  {
    role: 'qa',
    steps: [
      {
        slug: 'fundamentals/llms',
        module: 1,
        tier: 'core',
        reason:
          'Temperature, max output tokens and the context window are the knobs that decide whether a run repeats, so start where they are defined',
      },
      {
        slug: 'fundamentals/tools',
        module: 4,
        tier: 'supporting',
        reason:
          'Tool calling is the surface you probe: the sheet walks through terminal access, database queries and email sending as tools',
      },
      {
        slug: 'fundamentals/memory',
        module: 5,
        tier: 'supporting',
        reason:
          'Reproducing an agent bug means rebuilding its state, and this sheet shows the whole message stack being resent on every call',
      },
      {
        slug: 'fundamentals/agents',
        module: 6,
        tier: 'core',
        reason:
          'A failing agent is a failing loop; the observe-decide-act flow and the bug-fixing multi-step example give you the trace to reason about',
      },
      {
        slug: 'fundamentals/multi-agent',
        module: 7,
        tier: 'context',
        reason:
          'Manager-worker, network swarm and agent-as-a-tool are the shapes that turn one defect into a cascade across handoffs',
      },
      {
        slug: 'intermediate/prompt-engineering',
        module: 8,
        tier: 'supporting',
        reason:
          'The Folklore Table and the section on why five examples can never tell you anything set the evidence bar for your own test claims',
      },
      {
        slug: 'intermediate/context-engineering',
        module: 9,
        tier: 'core',
        reason:
          'Four named failure modes — poisoning, distraction, confusion, clash — give you a defect taxonomy instead of guesswork',
      },
      {
        slug: 'intermediate/coding-agents',
        module: 10,
        tier: 'supporting',
        reason:
          'Hooks are named here as the only deterministic control point, with a protect-migrations script you can run against a real agent',
      },
      {
        slug: 'intermediate/harness-engineering',
        module: 11,
        tier: 'core',
        reason:
          'The hook exit-code table and the fail-open versus fail-closed comparison show whether a broken check becomes an allow',
      },
      {
        slug: 'intermediate/security',
        module: 13,
        tier: 'core',
        reason:
          'A black-box checklist of injection canaries per delivery surface, ASR-at-N reporting, and the promptfoo, garak and PyRIT comparison',
      },
      {
        slug: 'intermediate/loop-engineering',
        module: 12,
        tier: 'core',
        reason:
          'The verifier ladder and the rubric cookbook — a golden set of about 20 cases, deterministic gates, R1-R7, calibrate before you trust',
      },
      {
        slug: 'ecosystem/observability',  // draft
        module: 29,
        tier: 'context',
        reason:
          'A draft placeholder, not yet readable; it is planned to cover LangSmith, LangFuse and trace-analyzer agents',
      },
      {
        slug: 'optional/runtime',  // draft
        module: 33,
        tier: 'context',
        reason:
          'Still a draft with only a topic list; checkpoints, fault tolerance and time travel are planned, which is where replaying a run belongs',
      },
    ],
  },
  // project-manager: 13 drawn, 2 draft — the tally reads “n of 13”.
  {
    role: 'project-manager',
    steps: [
      {
        slug: 'fundamentals/llms',
        module: 1,
        tier: 'core',
        reason:
          'Sets the vocabulary for scoping conversations: the context window limit, and how temperature and max output tokens shape a run',
      },
      {
        slug: 'fundamentals/training',
        module: 2,
        tier: 'supporting',
        reason:
          'Explains why pre-training costs millions and when fine-tuning is worth its cost, so a training budget ask can be judged',
      },
      {
        slug: 'fundamentals/rag',
        module: 3,
        tier: 'supporting',
        reason:
          'Settles the recurring build question through the sheet\'s own section on fine-tuning the model on documents instead',
      },
      {
        slug: 'fundamentals/tools',
        module: 4,
        tier: 'core',
        reason:
          'Shows how a model reaches outside itself, and how to tell a task that needs a tool from one that needs more prompting',
      },
      {
        slug: 'fundamentals/memory',
        module: 5,
        tier: 'supporting',
        reason:
          'Separates parametric, working and long-term memory, so a request to make the agent remember lands on the right work',
      },
      {
        slug: 'fundamentals/agents',
        module: 6,
        tier: 'core',
        reason:
          'The agent loop and what ends it — the unit of work being estimated, scheduled and reviewed',
      },
      {
        slug: 'intermediate/prompt-engineering',
        module: 8,
        tier: 'context',
        reason:
          'The obsolete-advice and folklore tables give grounds for retiring prompting requests that measure as nothing',
      },
      {
        slug: 'intermediate/context-engineering',
        module: 9,
        tier: 'supporting',
        reason:
          'Context rot and the prompt-caching cost lever explain why long runs degrade and where token spend actually goes',
      },
      {
        slug: 'intermediate/coding-agents',
        module: 10,
        tier: 'supporting',
        reason:
          'Names the six extension mechanisms and gives a decision table, so a hooks, skills or MCP request can be scoped honestly',
      },
      {
        slug: 'intermediate/harness-engineering',
        module: 11,
        tier: 'core',
        reason:
          'The autonomy ladder, rungs 1 to 6, is the artifact for deciding how much freedom a given task gets',
      },
      {
        slug: 'intermediate/security',
        module: 13,
        tier: 'core',
        reason:
          'Prompt injection remains unsolved, and section VII rates the common guardrails honestly — what a risk sign-off actually needs',
      },
      {
        slug: 'intermediate/loop-engineering',
        module: 12,
        tier: 'core',
        reason:
          'The verifier ladder answers who checks agent output: defined rules and linters first, LLM as judge last',
      },
      {
        slug: 'optional/human-in-the-loop',  // draft
        module: 32,
        tier: 'context',
        reason:
          'A placeholder for now: planned to cover interrupt and steering, with only the topic list on the page today',
      },
      {
        slug: 'ecosystem/observability',  // draft
        module: 29,
        tier: 'context',
        reason:
          'Not yet written: the roadmap names LangSmith, LangFuse and trace-analyzer agents as the planned coverage',
      },
    ],
  },
  // dba: 11 drawn, 2 draft — the tally reads “n of 11”.
  {
    role: 'dba',
    steps: [
      {
        slug: 'fundamentals/llms',
        module: 1,
        tier: 'supporting',
        reason:
          'The context window is the hard ceiling on how much retrieved data reaches the model, shaping every query hitting your store',
      },
      {
        slug: 'fundamentals/training',
        module: 2,
        tier: 'context',
        reason:
          'Sets pre-training cost against full fine-tuning and PEFT, so a request to bake knowledge into weights can be priced',
      },
      {
        slug: 'fundamentals/rag',
        module: 3,
        tier: 'core',
        reason:
          'Names the vector stores an agent may point at, plus the permissions, hook gates and credential rules behind granting it access',
      },
      {
        slug: 'fundamentals/tools',
        module: 4,
        tier: 'core',
        reason:
          'Shows that the model only requests a call while your own function executes it, which is where a database credential actually sits',
      },
      {
        slug: 'fundamentals/memory',
        module: 5,
        tier: 'core',
        reason:
          'Places long-term memory in external storage — a DB, a vector store, files — so you can see what an agent persists and where',
      },
      {
        slug: 'fundamentals/agents',
        module: 6,
        tier: 'supporting',
        reason:
          'The observe-decide-act loop repeats tool calls without asking again, so one granted query right is exercised many times per task',
      },
      {
        slug: 'intermediate/coding-agents',
        module: 10,
        tier: 'core',
        reason:
          'Carries the checked-in .mcp.json postgres server example, where DATABASE_URL arrives through an env var rather than inline',
      },
      {
        slug: 'intermediate/harness-engineering',
        module: 11,
        tier: 'core',
        reason:
          'The worked example is a PreToolUse hook keeping migrations/ human-only, with deny rules evaluated deny then ask then allow',
      },
      {
        slug: 'intermediate/security',
        module: 13,
        tier: 'core',
        reason:
          'Treats memory and RAG writes as privileged actions, cites AgentPoison, and sets out the credential-rotation drill after an incident',
      },
      {
        slug: 'intermediate/personal-agents',
        module: 14,
        tier: 'supporting',
        reason:
          'Gives a secrets baseline: chmod 600 on credential files, plus a list of what an agent never gets, production credentials included',
      },
      {
        slug: 'expert/advanced-memory',  // draft
        module: 18,
        tier: 'context',
        reason:
          'Roadmap only, no lesson content yet: the planned topics name Cognee, Agent KnowledgeBase and Entire Provenance',
      },
      {
        slug: 'ecosystem/observability',  // draft
        module: 29,
        tier: 'context',
        reason:
          'Still a draft: LangSmith, LangFuse and trace-analyzer agents are listed as planned topics, where audit-trail material will land',
      },
    ],
  },
  // pre-sales: 11 drawn, 3 draft — the tally reads “n of 11”.
  {
    role: 'pre-sales',
    steps: [
      {
        slug: 'fundamentals/llms',
        module: 1,
        tier: 'core',
        reason:
          'Sets the vocabulary a demo runs on: context window, temperature, max output tokens, and gateways such as OpenRouter',
      },
      {
        slug: 'fundamentals/training',
        module: 2,
        tier: 'supporting',
        reason:
          'Gives the cost shape behind a fine-tune-it-on-customer-data ask, including what PEFT changes and what full fine-tuning costs',
      },
      {
        slug: 'fundamentals/rag',
        module: 3,
        tier: 'core',
        reason:
          'The answer to the most common scoping question, with the section on why retrieval beats fine-tuning for documents that change',
      },
      {
        slug: 'fundamentals/tools',
        module: 4,
        tier: 'core',
        reason:
          'Explains who actually executes a tool call and what a tool schema must contain, so integration questions get a straight answer',
      },
      {
        slug: 'fundamentals/memory',
        module: 5,
        tier: 'context',
        reason:
          'Separates parametric, working and long-term memory, and shows why a model is stateless during generation',
      },
      {
        slug: 'fundamentals/agents',
        module: 6,
        tier: 'core',
        reason:
          'The agent loop and what ends it — the mechanism you narrate while a demo is running',
      },
      {
        slug: 'fundamentals/multi-agent',
        module: 7,
        tier: 'context',
        reason:
          'Compares supervisor and manager-worker architectures, and names when a single agent is still the right answer',
      },
      {
        slug: 'intermediate/prompt-engineering',
        module: 8,
        tier: 'supporting',
        reason:
          'The obsolete-advice and folklore tables keep demo claims current, including where explicit chain-of-thought buys close to nothing',
      },
      {
        slug: 'intermediate/harness-engineering',
        module: 11,
        tier: 'supporting',
        reason:
          'The autonomy ladder, rung 1 to rung 6, is what to show when a customer asks who holds the boundary around a running agent',
      },
      {
        slug: 'intermediate/security',
        module: 13,
        tier: 'core',
        reason:
          'The guardrails-honestly-rated table and the unsolved status of prompt injection, so the security answer holds up under scrutiny',
      },
      {
        slug: 'ecosystem/agent-frameworks',  // draft
        module: 25,
        tier: 'context',
        reason:
          'Planned as a tour of build-side frameworks — LangChain, CrewAI, smolagents, PydanticAI — and is a topic list today, not a lesson',
      },
      {
        slug: 'ecosystem/inference-providers',  // draft
        module: 26,
        tier: 'context',
        reason:
          'Planned to cover the hosted serving options a deal turns on — OpenRouter, OpenAI, Google AI Studio; the sheet is not written yet',
      },
      {
        slug: 'protocols/protocols-reference',  // draft
        module: 31,
        tier: 'context',
        reason:
          'Planned as one page collecting the protocols named across the series plus NLWeb, UCP and AP2; nothing readable there yet',
      },
    ],
  },
]

export function pathFor(role: RoleId | null): LearningPath | undefined {
  if (role === null) return undefined
  return PATHS.find((path) => path.role === role)
}
