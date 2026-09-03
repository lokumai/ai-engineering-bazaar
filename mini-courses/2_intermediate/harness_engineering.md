---
summary: "The mechanical scaffolding around a model that keeps a non-deterministic agent on track, and why the same model scores differently in different harnesses."
objectives:
  - "Explain why prompt and context work still leaves an agent non-deterministic"
  - "Say what an agent harness is and what it contains"
  - "Split a harness into what the agent is told beforehand and what tells it how it went"
  - "Give concrete examples of harness changes and what they bought"
  - "Explain why no single harness is best for every model"
---

# Harness Engineering

[Coding Agents: Extending Them](coding_agents.md) ended on hooks, and hooks were different from everything else in that module. All the other extension points are advice you give the model. It is good advice and it usually gets followed, but the model is still the one deciding. A hook is not like that. It is a shell command wired to a fixed point in the agent's life, and it runs whether the model wanted it to or not.

That difference is what this whole module is about.

## The problem prompts do not solve

LLMs are non-deterministic. Whatever you do with the prompt and whatever you put in the context, the same input can produce a different answer next time, and an agent running for two hours has a lot of next times.

So no amount of asking nicely gets you a guarantee. Say the agent must never push to main. Writing "please do not push to main" in your instructions works most of the time, and most of the time is not good enough for that particular rule. What you need instead is something mechanical: wiring around the model that behaves the same way every run, and that holds while the model does whatever it is going to do.

Designing that wiring is **harness engineering**.

![Prompt, context and harness on one drawing](./images/car-analogy.png)  
*The engine is the prompt: the thing that makes power. The car is the context: the body built around the engine that decides what the power can do. The track and the barriers are the harness. Notice the barriers do not steer, and that is the point. They do not make the car go the right way, they make going the wrong way impossible.*

The analogy is from [Harness Engineering: What It Is and How It Complements Context Engineering](https://medium.com/@amirkiarafiei/harness-engineering-what-it-is-and-how-it-complements-context-engineering-6545b40bfc84), and it carries into the next two modules, so it is worth holding.

## What an agent harness is

When you do harness engineering, the thing you end up with is called an **agent harness**. It is the agent, plus all the mechanical wiring around it, plus the environment it runs in.

LangChain's [The Anatomy of an Agent Harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) reduces it to one line: **Agent = Model + Harness.** The model supplies the intelligence. The harness is what makes that intelligence do useful work in a real place with real files.

That means the products you already use are harnesses. Claude Code is a harness. Codex is a harness. Pi is a harness. None of them is a model. And if you swap the model inside one of them, less changes than you would expect.

One thing to get straight, because people use the word loosely. The harness is the **outer** layer, not a rival to the other two. It contains your prompt and context work instead of replacing it.

![Prompt, context and harness as three layers](./images/onion-model.png)  
*Each ring contains the one inside it, which is why these are never alternatives. Choosing a harness has already decided things about your context, because the harness is what compacts the window, spawns the subagents and writes the system prompt. You cannot do context engineering "instead of" harness engineering; you do it inside whichever harness you picked.*

## Four disciplines, four questions

By 2026 this has settled into four jobs with four different questions.

![What to say, what to see, and the world to build](./images/prompt-vs-context-vs-harness.jpeg)  
*Read it bottom to top and each layer takes in the one below it. Saying is one turn. Seeing is the whole window. Building the world is everything the agent can reach and everything that stops it, and the human moves from talking to the robot to constructing the place it works in.*

- **Prompt engineering**: what, and how, should I ask?
- **Context engineering**: what should the model see in its context, and in what form?
- **Harness engineering**: how should I design the environment around the agent?
- **Loop engineering**: who decides when it runs again, and when it stops? That is the next module.

## What a harness is made of

[The Anatomy of an Agent Harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) lists the parts, and most of them are things you now recognise from the last module:

```mermaid
mindmap
  root((Agent harness))
    System prompt
      Written by the vendor
      Plus your AGENTS.md
    Tools
      Descriptions, which are prompts too
      Skills and MCP servers
    Infrastructure
      A filesystem
      A sandbox to run code in
      A browser
    Orchestration
      Spawning subagents
      Handoffs between them
      Which model runs which step
    Hooks and middleware
      Compaction
      Continuation
      Lint and test gates
```

Notice that the tool *descriptions* are in there. A description is a prompt: it is the text the model reads when it is deciding whether to call that tool. So renaming a tool, or rewriting one sentence of its description, changes how the agent behaves. That counts as harness work rather than prompt work, because what you edited was the environment and not the request.

The sharpest way to organise all of this comes from Birgitta Böckeler's [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html), which splits a harness into two kinds of thing:

```mermaid
graph LR
    A["Guides: what the agent is told before it acts<br/>system prompt, AGENTS.md, tool descriptions, the approved plan"] --> B["The agent works"]
    B --> C["Sensors: what tells it how the work went<br/>tests, linters, type checks, hook output, build errors"]
    C --> B
```

Guides come before the work. Sensors come after it, and what they report goes back to the agent so it can fix whatever it broke. Almost all harness engineering is adding one or the other. So if you are ever unsure whether something counts as harness work, ask yourself which of the two it is.

## Some actual examples

Concretely, then. Here are a few things people actually do, and none of them is big:

- **A sandbox.** The agent runs commands in a container with no network and a mounted copy of the repository. Now "delete everything" costs you a container.
- **A permission gate.** A `PreToolUse` hook that refuses writes outside `src/` and refuses `git push` entirely. The model can attempt it and simply cannot do it.
- **A test gate on finishing.** A `Stop` hook that runs the suite and, if anything is red, tells the agent it is not done. The agent does not get to decide it finished.
- **A format-on-write hook.** `PostToolUse` runs the formatter on every edited file, so style stops depending on the agent remembering the style.
- **A loop detector.** Count edits per file, and after the fifth edit to the same file tell the agent to stop and reconsider, because five edits to one file usually means it is going in circles.

That last one is real, and it came with numbers attached. LangChain's [Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering) describes five changes they made to their coding agent's harness:

- **A rewritten system prompt**, organised around four stages: plan, build, verify, fix.
- **A checklist step** that catches the agent just before it exits, and makes it check its own work against the spec.
- **A startup step** that maps out the directory tree and the tools available, so the agent knows where it is before it starts.
- **The per-file edit counter** from the list above.
- **A "reasoning sandwich"**: maximum reasoning for the planning and the verification, and less of it for the mechanical work in the middle.

**The model did not change.** Terminal Bench 2.0 went from 52.8% to 66.5%.

Hold onto that number, because it is the argument for this module existing. Nearly fourteen points came out of editing the environment, and the weights doing the thinking were the same ones in both runs.

If you want to build one rather than read about one, [How to Build a Custom Agent Harness](https://www.langchain.com/blog/how-to-build-a-custom-agent-harness) walks through doing it with middleware. OpenAI's [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) is the same discipline from the other side, and its main lesson is about knowledge. They keep a structured `docs/` directory as the single source of truth, and they keep `AGENTS.md` short, as a map that points into it. Then they run linters and CI jobs over that documentation, plus a recurring gardening agent whose only job is finding the parts that have gone stale. That is a sensor pointed at the guides.

## No harness is best for every model

Here is the finding that surprises people.

Take one model, run it on one benchmark, and change nothing but the harness. The scores move a lot.

![DeepSeek V4 Flash across eight harnesses](./images/harness-comparison.png)  
*One model, one task set, eight harnesses, and the spread runs from 14 to 20 out of 30. The bottom bar and the top bar are the same weights doing the thinking. Also worth reading past the winner: the source measured cost and speed too, and the fastest harness here was also the most expensive per success, because it barely reused its prompt cache.*

That chart is from Composio's [Finding the Best Harness for DeepSeek V4 Flash](https://composio.dev/content/best-agent-harness-deepseek-v4-flash), which ran the model through Pi Agent, Prime Agent, OMP, Claude Code, Codex, DeepAgents, Hermes Agent and OpenCode. Pi Agent came first at 66.7%, twenty of thirty workflows, and Claude Code was the fastest at 122.7 seconds per task while costing the most per success.

The lesson is not "use Pi Agent". It is that **the pairing matters**, and it is a bit like a t-shirt: there is no single size that fits everybody. Claude Code's harness is tuned for Claude models. Codex's is tuned for GPT models. A harness makes assumptions about the model it was built for: how that model plans, how it copes with long tool outputs, how eagerly it reaches for a tool. Give it a model with different habits and those assumptions stop fitting, so the model does worse than it would in a harness built around its own.

So when you read that some model is state of the art, the honest question is which harness the number came from.

## The harnesses are open now

The other thing that changed by 2026 is that a lot of these are open source, including the commercial ones.

Claude Code's harness is open. So is [DeepSeek's](https://github.com/deepseek-ai/deepseek-harness). They published it right beside the model it was tuned for, which tells you those two were designed together. OpenCode, Pi and LangChain's [deepagents](https://github.com/langchain-ai/deepagents) are open. So are the personal agent harnesses, Hermes and OpenClaw, which get their own module in [Personal Agents](personal_agents.md).

This is genuinely useful, and not only for reading. You can take a harness that works and change the parts that do not suit your job: swap the system prompt, add a middleware, change a tool description, point it at a different model.

Two maintained lists if you want to shop around: [best-of-Agent-Harnesses](https://github.com/RyanAlberts/best-of-Agent-Harnesses) ranks more than a hundred of them and rescores weekly, and [awesome-harness-engineering](https://github.com/walkinglabs/awesome-harness-engineering) collects the tools and guides.

> **NOTE:** this module stays at the level of what a harness is and why it matters. [Advanced Harness Engineering](../3_expert/advanced_harness_engineering.md) takes on harness profiles, self-evolving harnesses, and the question of how much of the harness is moving inside the model. Böckeler's [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html) is the deepest treatment available and belongs with that module rather than this one.

## Where this fits in the series

```mermaid
graph LR
    A[Prompt Engineering] --> B[Context Engineering]
    B --> C[Coding Agents]
    C --> D[Harness Engineering]
    D --> E[Loop Engineering]
    E --> F[Security]
    F --> G[Personal Agents]
    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#90EE90
    style D fill:#FFFF00
```

## Summary

A model is non-deterministic, so instructions get you a good success rate and never a guarantee. The harness is the mechanical part that holds anyway. It is the system prompt, the tools and the way they are described, the filesystem and the sandbox, the way subagents get spawned and handed work, and the hooks that fire whether the model wanted them to or not.

Agent = Model + Harness. Claude Code, Codex and Pi are all harnesses. The harness is the outer ring, so it contains your prompt and context work instead of competing with it. The simplest way to think about what is inside it: guides are what the agent reads before it acts, and sensors are what tell it how the work went.

All of this is worth real effort, because the effect shows up in the numbers. Five harness changes moved one agent from 52.8% to 66.5% on Terminal Bench 2.0, and the model never changed. The fit is also specific to the model: one model run through eight different harnesses scored anywhere from 14 to 20 out of 30. So there is no best harness. There is only a best match.

Next: everything so far still has you in the driver's seat. You prompt, you read the output, you decide what happens next. The next module replaces that person.

**Quick Check**: an instruction in AGENTS.md and a `PreToolUse` hook can both stop an agent touching a file. Why is only one of them harness engineering, and when does the difference actually matter?

## References

- [Harness Engineering: What It Is and How It Complements Context Engineering](https://medium.com/@amirkiarafiei/harness-engineering-what-it-is-and-how-it-complements-context-engineering-6545b40bfc84): the car, the track and the barriers, at length
- [The Anatomy of an Agent Harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness): Agent = Model + Harness, and the component list this module works from
- [How to Build a Custom Agent Harness](https://www.langchain.com/blog/how-to-build-a-custom-agent-harness): the same thing as a build, using middleware
- [Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering): five concrete changes and the 52.8% to 66.5% they produced
- [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/): a team that built a product with agents, and what they had to do to their repository first
- [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html): the guides-and-sensors framing, and the most thorough treatment of the subject
- [Finding the Best Harness for DeepSeek V4 Flash](https://composio.dev/content/best-agent-harness-deepseek-v4-flash): eight harnesses, one model, with cost and speed alongside the pass rate
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): a harness published beside the model it was tuned for
- [deepagents](https://github.com/langchain-ai/deepagents): the open harness from the anatomy article
- [best-of-Agent-Harnesses](https://github.com/RyanAlberts/best-of-Agent-Harnesses): a ranked list of more than a hundred, rescored weekly
- [awesome-harness-engineering](https://github.com/walkinglabs/awesome-harness-engineering): tools and guides for the practice
- [Agent Harness Explained in 2 minutes](https://youtube.com/shorts/IVdJj_aNwhE): the short version, if you would rather watch
- [Advanced Harness Engineering](../3_expert/advanced_harness_engineering.md): profiles, self-evolving harnesses, and what is moving into the model
