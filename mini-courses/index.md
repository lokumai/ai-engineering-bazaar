# AI Engineering Bazaar 🏪

AI Engineering made simple, short, and useful.

A series of mini-courses from beginner to advanced to help you learn practical topics in modern AI engineering. Each course is short, easy to understand, and includes real-world examples, clear visuals, and extra reading materials. It is the fastest way to master what you actually need on the job.

## Why This Is Valuable

The internet already has plenty of AI content. Adding more only makes sense if it is different in a way that actually helps you. These seven rules are that difference. They are not writing preferences — they are the reason this is worth your time.

1. **A human writes it.** Most of what we cover is new, so good sources barely exist and a lot of what you find online is guesswork. AI tools were trained before much of it existed, so they read those same weak articles and repeat them back with confidence. This comes from a working AI engineer, after years of building it in production.
2. **It sounds like a person talking.** Ask an engineer this question in real life and you get a straight answer, in normal words. That is how it is written here.
3. **It stays simple.** Plain language, no jargon, no buzzwords. Sometimes we oversimplify on purpose. Easy to read even if English is not your first language.
4. **Five to ten minutes per module.** If you ever feel the need to paste one of these pages into ChatGPT and ask for a summary, we failed.
5. **Pictures do a lot of the work.** A picture is worth a thousand words, so expect diagrams, charts, simple sketches, and now and then a meme.
6. **Every module points you somewhere next.** Each topic is kept short on purpose, then links out to more. In the world of Reels and TikTok, attention is short and nobody pushes through something just because they were told to read it — people only really learn what they wanted to learn. So a page is written to leave you curious instead of full, and the links are there for the moment you want more.
7. **We only cover what matters.** A cheatsheet for AI engineering, not a textbook. Knowing what to leave out comes from building things, not from searching.

📜 Full version: **[MANIFEST.md](MANIFEST.md)** · 🧭 Where this is going: **[ROADMAP.md](ROADMAP.md)**

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
