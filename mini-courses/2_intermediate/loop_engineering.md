---
summary: "Designing the loop that keeps an agent working until a goal is met, and what happens when nobody is left to press enter."
objectives:
  - "Say what loop engineering is and why the stop condition is the whole design"
  - "Tell the five levels of loop apart, from the LLM's own token loop to the autonomous loop"
  - "Explain the Ralph loop and why one task per iteration matters"
  - "Know which techniques let an agent design its own loop, and where they are taught"
---

# Loop Engineering

By the end of [Harness Engineering](harness_engineering.md), the agent had an engine, a body and a track with barriers. Look at the drawing again, and notice who is still in the driver's seat.

You are. You type the prompt. You read what came back. You decide whether it was good enough, and you decide what happens next. Modern agents took over a great deal of the work:

- they manage their own context
- they compact it when it gets long
- they spawn their own subagents
- they keep their own to-do list

And still, at the centre of it, a person sits there and presses enter.

This module is about removing that person.

## What Loop Engineering is

Loop engineering is the practice of designing loops that repeat automatically. Each loop carries an agent through cycles of acting, observing and adjusting, until the agent meets a defined goal. You do not prompt the agent turn by turn. Instead, you build the control system: what starts a run, what the agent gets, and above all **when it stops**.

The last of those three, when the agent stops, is the most important part of the design. Loop engineering asks one single question: **what is the stop condition?** Everything else follows from it. If you get it wrong in one direction, the loop stops before the work is done. If you get it wrong in the other direction, the loop runs until your bill arrives.

Back to the car. The engine is the prompt, the body is the context, and the track and barriers are the harness. Until now, the driver was a human. Loop engineering is the AI driving. It is the difference between a car and a car that drives itself. Everything that follows is about how much of the steering you are willing to give to the AI.

![Four years of job titles](./images/loop-unemployment.webp)  
*The joke works because each panel is a real job that existed. The arrows are the whole argument. In 2026, the human points at agents. By 2026.5, the human points at one agent, and that agent points at the others. The panel after that asks the honest question: where does this go? In the last two panels, the thing that gets automated is not the coding. It is the supervising.*

## Loops Happen at Five Levels

When people say "loop engineering", they usually mean the outermost loop. But it helps to see all five, because they stack on top of each other. LangChain's [The Art of Loop Engineering](https://www.langchain.com/blog/the-art-of-loop-engineering) calls the practice "the art of stacking loops". That is exactly right.

```mermaid
graph TD
    L4["Level 4: the autonomous loop<br/>keeps prompting until the acceptance criteria are met"] --> L3
    L3["Level 3: the event-driven loop<br/>a clock or a webhook decides when a run starts"] --> L2
    L2["Level 2: the verification loop<br/>a grader checks the result and hands it back"] --> L1
    L1["Level 1: the agent loop<br/>the model calls tools until it thinks it is done"] --> L0
    L0["Level 0: the LLM loop<br/>the model generates one token, appends it, and generates the next"]
```

*Each level wraps the one below it, and each one takes a decision away from you. Level 0 decides the next token. Level 1 decides which tool to call next. Level 2 decides whether the answer was good enough. Level 3 decides when to start. Only level 4 decides whether to try again. That is the real decision you were making.*

### Level 0: The LLM Loop

The loop starts inside the model itself. Modern LLMs are mostly **autoregressive**. That means the model takes the input and generates only one token. Then it appends that one token to the end of the input. It generates the next token from this longer input. It repeats this until it produces a stop token or reaches a length limit. Every answer you have ever read from an LLM was written this way, one token at a time.

This is level 0 of the loops, and it happens at the LLM level. Nobody engineers this one. It is how the model produces text. It is also the loop that every other loop in this module sits on.

### Level 1: The Agent Loop

The agent itself is a loop. A model calls a tool, reads the result and calls another tool. It keeps going until it decides that the task is done. That is the loop from [AI Agents](../1_fundamentals/agents.md). It sits directly on level 0, at the model's own turn.

Nobody engineers this one either. LangChain, the other frameworks and every coding agent already implement it. When people talk about loop engineering, they do not mean this loop. It is here so that the other three have something to sit on.

### Level 2: The Verification Loop

The agent finishes. Then something checks the work against criteria, before anyone accepts it. If the work is not good enough, the feedback goes back to the agent, and the agent does another round.

This is the sensor idea from [Harness Engineering](harness_engineering.md), turned into a loop. The sensor no longer only reports. It decides whether there is another iteration. The stop condition here is a **goal**, so this is the goal-based loop.

The criteria can be anything that you are able to check. For example, a test suite passes, a type check comes back clean, or a Lighthouse score is above 90. The criteria can also be a rubric. A rubric is a written list of what a good result looks like. Another model call grades the work against that list. This covers the things that no test can check.

In LangChain, you build it with rubric middleware. In Claude Code, it is `/goal`. According to [Loop engineering: Getting started with loops](https://claude.com/blog/getting-started-with-loops), `/goal` stops when the agent achieves the goal or reaches a maximum number of turns:

```text
/goal get the homepage Lighthouse score to 90 or above, stop after 5 tries
```

Look at the shape of that: a target, and a cap. The cap is not decoration. If success is the only stop condition of a loop, the loop will not stop when success is impossible.

### Level 3: The Event-driven Loop

Here, something outside the conversation decides when a run happens: a schedule, or a webhook. The agent stops being a thing that you open. It becomes a thing that runs.

The stop condition is time-based, not goal-based. The loop does not iterate towards a target. It wakes up, does a job, and goes back to sleep until the next trigger.

In Claude Code, `/loop` runs a recurring job on your own machine. `/schedule` does the same thing in the cloud, so the job keeps running while your laptop is closed:

```text
/loop 5m check my PR, address review comments, and fix failing CI
```

Both stop when you cancel them, or when the work is finished. This level is worth having because the agent is now connected to the systems around it. A pull request opens, a build fails, or an alert fires. The agent has already started to deal with it before anybody reads the notification.

### Level 4: The Autonomous Loop

This is the one that made loop engineering a topic.

Its history starts with the **Ralph loop**, from Geoffrey Huntley's [everything is a ralph loop](https://ghuntley.com/loop/). You write a script in shell or JavaScript. The script prompts the agent mechanically, again and again, until the work meets the acceptance criteria. Here it is in its purest and most oversimplified form:

```bash
while true; do
  claude -p "$PROMPT"
done
```

That really is most of the idea. The loop keeps prompting until the job is done. Each fresh session starts with a fresh context window. Because of this, context rot never gets a chance to build up. Context rot is the problem from [Context Engineering](context_engineering.md) where a model gets worse at its task as its context grows. The state lives on disk, in the plan and the code, not in a context window.

![Ralph Wiggum](./images/ralph.webp)  
*The name comes from the Simpsons character. The joke is friendly, and it does not look down on the technique. The technique works exactly because it is too simple to be clever. It keeps going after setbacks that would stop something more sophisticated.*

The one rule that matters most is this: **Ralph does one task per loop.** It does not take the whole backlog on every iteration, only one item from it. Each pass does this:

- it reads the plan
- it picks the next unfinished item
- it does that item
- it records that the item is done
- it exits

Then the next pass starts clean and picks up the item after that.

This is what pushed coding agents beyond the several hours of work that [Context Engineering](context_engineering.md) described. A loop like this runs for days, because no single session has to last that long.

The real versions are much more careful than four lines of bash. What people add is failure handling. You watch which iterations fail, and you find the failure mode. Then you engineer that failure mode out, so it cannot happen again. Huntley describes it this way: software becomes clay on a pottery wheel, not bricks that you lay one at a time. A failed iteration is a reason to refine, not a reason to stop.

You can get a real one in a few places. The [ralph-loop plugin](https://claude.com/plugins/ralph-loop) is the packaged version for Claude Code. [snarktank/ralph](https://github.com/snarktank/ralph) runs until every item in a product requirements document is complete. And [loop-engineering](https://github.com/cobusgreyling/loop-engineering) collects patterns and CLI tools. One of those tools audits what a long run costs you.

[Ralph Wiggum Loop for Claude Code](https://awesomeclaude.ai/ralph-wiggum) is a good written walkthrough. It makes a point that is worth repeating: how well this works depends more on the prompt you wrote than on the model you ran it with.

> **NOTE:** LangChain names a different top level: the **hill climbing loop**. It reads production traces to find problems, and it improves the agent's own configuration. It is worth knowing as the level above this one. It is a loop whose output is a better harness, not finished work.

## Agents That Design the Loop

Every loop in this module is one that a person designed. You write the script, you set the
criteria, and you decide what starts a run and when it stops. The structure is either yours or a
known pattern, like Ralph's.

The next step is to let the agent design and run the loop itself. Back to the car one last time:
here the AI is not only driving. It also decides the route. Three techniques make that possible at
a much larger scale:

- **Agent teams**: several full agent sessions that share a task list, with a lead that
  coordinates them.
- **Dynamic workflows**: a script, written by the agent, that runs dozens to hundreds of
  subagents and holds the plan in code.
- **Recursive language models**: one model that calls itself through code, so it can work through
  more text than its window holds.

They build on the loops in this module, but they are a subject of their own.
[Advanced Loop Engineering](../3_expert/advanced_loop_engineering.md) covers all three.

## The Trend

Put the last four modules next to each other, and the direction is easy to see:

- better models
- then better use of the context window
- then better environments around the models
- then better loops around those environments

Each new layer let the agent work for longer before a person had to step in. One good answer became a session that stays coherent. That became hours of unattended work, and then runs measured in days.

None of the layers replaced the one before it. They stacked. That is why the whole series has been one drawing, with more parts added to it.

## Where this fits in the series

```mermaid
graph LR
    A[Prompt Engineering] --> B[Context Engineering]
    B --> C[Code Agents]
    C --> D[Agents in Practice]
    D --> E[Harness Engineering]
    E --> F[Loop Engineering]
    F --> G[Agentic UI]
    G --> H[Security]
    H --> I[Personal Agents]
    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#90EE90
    style D fill:#90EE90
    style E fill:#90EE90
    style F fill:#FFFF00
```

## Summary

Loop engineering means designing the repeating cycle that carries an agent to a goal, with no person in that cycle. The design is the stop condition.

The loops stack, one inside the next:

- At the bottom is the LLM loop. The model generates one token, appends it to the input and generates the next.
- The agent loop is the model calling tools until it is done. Every framework already gives you that one.
- The verification loop adds a grader that hands the work back when it is not good enough. It stops on a goal, plus a cap on how many tries it gets.
- The event-driven loop hands the starting decision to a clock or a webhook.
- The autonomous loop, the Ralph loop, is a script that prompts the agent again and again until the work meets the acceptance criteria. It does one task per iteration, and every pass starts from a clean window. The state lives on disk, not in a context. That last point is what took agents from hours to days.

Above all of that, the agent designs the loop itself. Agent teams, dynamic workflows and recursive language models are the techniques that make this possible at scale, and Advanced Loop Engineering covers them.

Next: everything in this module made an agent harder to supervise. The Security module is about the cost of that: the risks that appear when nobody is watching what the agent does.

**Quick Check**: a verification loop and an autonomous loop both keep going until something is satisfied. What is the difference, and which one needs a maximum number of tries?

## References

### 📄 Articles

- [The Art of Loop Engineering](https://www.langchain.com/blog/the-art-of-loop-engineering): loop engineering as stacking loops, and the four levels
- [Loop engineering: Getting started with loops](https://claude.com/blog/getting-started-with-loops): `/goal`, `/loop` and `/schedule`, with the stop condition each one uses
- [everything is a ralph loop](https://ghuntley.com/loop/): the original technique, and the one-task-per-loop rule
- [Ralph Wiggum Loop for Claude Code](https://awesomeclaude.ai/ralph-wiggum): a written walkthrough, and why the operator's prompt matters more than the model

### 🎬 Videos

- [Loop Engineering explained in 8min..](https://www.youtube.com/watch?v=4biXYSNkn9Y): this module's own subject in eight minutes, if you would rather watch it

### 🛠️ Tools

- [ralph-loop plugin](https://claude.com/plugins/ralph-loop): the packaged version for Claude Code

### 🗃️ Repositories

- [snarktank/ralph](https://github.com/snarktank/ralph): an autonomous loop that runs until every item in a requirements document is complete
- [loop-engineering](https://github.com/cobusgreyling/loop-engineering): patterns, starters and CLI tools, including cost auditing for a long run

### 🧭 Modules

- [Advanced Loop Engineering](../3_expert/advanced_loop_engineering.md): agent teams, dynamic workflows and recursive language models
