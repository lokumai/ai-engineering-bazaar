# AI Engineering Bazaar 🏪

AI Engineering made simple, short, and useful.

A series of mini-courses from beginner to advanced to help you learn practical topics in modern AI engineering. Each course is short, easy to understand, and includes real-world examples, clear visuals, and extra reading materials. It is the fastest way to master what you actually need on the job.

## Why This Is Valuable

Most AI content today is recycled or machine-generated. This series follows seven
rules — the short version:

1. **Human-written.** These topics are too new for reliable sources to exist yet, and
   an LLM's knowledge cutoff predates most of them — so it searches the same imprecise
   articles and repeats them back with confidence. This material comes from years of
   real practice, including things that are not written down anywhere else.
2. **Explained like a real conversation.** The way an AI engineer would answer you at a
   desk, in the vocabulary we actually use — not the way a textbook would.
3. **Simple on purpose.** Plain language, no jargon or buzzwords, sometimes deliberately
   oversimplified. Easy to read even if English is not your first language.
4. **Short — 5–10 minutes per module.** If you ever need to paste one of these files
   into ChatGPT and ask for a summary, we failed. Concise, but never at the cost of
   being clear.
5. **Heavy on visuals.** Diagrams, mermaid charts, ASCII sketches, mind-maps, and the
   occasional meme. On most of these topics a picture beats a paragraph.
6. **Links out at the end of every module.** We stay simple deliberately, so you finish
   wanting more — then go read the sources yourself.
7. **Only the topics that matter.** A cheatsheet of AI Engineering, not a book about it.
   Knowing what to leave out takes experience a search engine cannot give you.

📜 Full version: **[MANIFEST.md](https://github.com/lokumai/ai-engineering-bazaar/blob/main/MANIFEST.md)**

## Structure

| Category                                                              | Modules | Description                                                                                                               |
| --------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| [Fundamentals](1_fundamentals/README.md)                     | 1-7     | LLMs, training, RAG, tools, memory, agents, multi-agent systems.**Start here.**                                           |
| [Intermediate](2_intermediate/README.md)                     | 8-15    | Prompt engineering, context engineering, coding agents, harness engineering, security, loop engineering, personal agents. |
| [NOT READY] [Expert](3_expert/README.md)                     | 16-24   | Advanced UI, architectures, tools, memory, multi-agent, prompting, context engineering, harness engineering, deployment.  |
| [NOT READY] [Ecosystem](4_ecosystem/README.md)               | 25-29   | Agent frameworks, inference providers, inference engines, UI design, observability.                                       |
| [NOT READY] [Protocols & Specs](5_protocols_specs/README.md) | 30      | A single reference of every protocol and spec mentioned across the series.                                                |
| [NOT READY] [Optional](6_optional/README.md)                 | 31-32   | Human-in-the-loop and runtime topics that round out the series.                                                           |

### How to Use

1. Start with [Fundamentals](1_fundamentals/README.md) to learn must-know concepts in AI Engineering.
2. Move on to [Intermediate](2_intermediate/README.md) to build your core skills.
3. Jump to [Ecosystem](4_ecosystem/README.md) to learn the tools and frameworks needed to become a well-rounded AI engineer.

🎉 Congrats! You are now an **AI engineer**. You can now build your own AI agents and systems.

1. ⚜️ [ADVANCED] ⚜️ If you want to become a rare, highly-skilled AI engineer, take the [Expert](3_expert/README.md) course to learn advanced topics.

## Local Development

The courses are plain markdown, published as a website with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/). To preview the site locally:

```bash
# one-time setup
python3 -m venv .venv
.venv/bin/pip install mkdocs-material

# run the local server
.venv/bin/mkdocs serve
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000) — the site live-reloads whenever you save a markdown file.

Before opening a PR, make sure the strict build passes (broken links fail CI):

```bash
.venv/bin/mkdocs build --strict
```

## Contributing

This is an open source project. Found a typo or want to improve a module?
[Open an issue or PR on GitHub](https://github.com/lokumai/ai-engineering-bazaar).
