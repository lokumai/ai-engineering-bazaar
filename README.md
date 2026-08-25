# AI Mini-Courses

AI Engineering made simple, short, and useful.

📖 **Read online:** [lokumai.github.io/ai-minicourses](https://lokumai.github.io/ai-minicourses/)

A series of mini-courses from beginner to advanced to help you learn practical topics in modern AI engineering. Each course is short, easy to understand, and includes real-world examples, clear visuals, and extra reading materials. It is the fastest way to master what you actually need on the job.

## Structure

| Category                                                         | Modules | Description                                                                                                               |
| ---------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| [Fundamentals](mini-courses/1_fundamentals/README.md)             | 1-7     | LLMs, training, RAG, tools, memory, agents, multi-agent systems.**Start here.**                                     |
| [NOT READY] [Intermediate](mini-courses/2_intermediate/README.md)  | 8-15    | Prompt engineering, context engineering, coding agents, harness engineering, security, loop engineering, personal agents. |
| [NOT READY] [Expert](mini-courses/3_expert/README.md)                         | 15-23   | Advanced UI, architectures, tools, memory, multi-agent, prompting, context engineering, harness engineering, deployment.  |
| [NOT READY] [Ecosystem](mini-courses/4_ecosystem/README.md)                   | 24-28   | Agent frameworks, inference providers, inference engines, UI design, observability.                                       |
| [NOT READY] [Protocols &amp; Specs](mini-courses/5_protocols_specs/README.md) | 29      | A single reference of every protocol and spec mentioned across the series.                                                |
| [NOT READY] [Optional](mini-courses/6_optional/README.md)                     | 30-31   | Human-in-the-loop and runtime topics that round out the series.                                                           |

### How to Use

1. Start with [Fundamentals](mini-courses/1_fundamentals/README.md) to learn must-know concepts in AI Engineering.
2. Move on to [Intermediate](mini-courses/2_intermediate/README.md) to build your core skills.
3. Jump to [Ecosystem](mini-courses/4_ecosystem/README.md) to learn the tools and frameworks needed to become a well-rounded AI engineer.

🎉 Congrats! You are now an **AI engineer**. You can now build your own AI agents and systems.

1. ⚜️ [ADVANCED] ⚜️ If you want to become a rare, highly-skilled AI engineer, take the [Expert](mini-courses/3_expert/README.md) course to learn advanced topics.

## Local Development

The courses are plain markdown, published as a website with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/). To preview the site locally:

```bash
# one-time setup
python3 -m venv .venv
.venv/bin/pip install mkdocs-material

# run the local server
.venv/bin/mkdocs serve
```

Then open http://127.0.0.1:8000 — the site live-reloads whenever you save a markdown file.

Before opening a PR, make sure the strict build passes (broken links fail CI):

```bash
.venv/bin/mkdocs build --strict
```
