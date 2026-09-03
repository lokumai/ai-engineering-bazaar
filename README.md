# AI Engineering Bazaar 🏪

AI Engineering made simple, short, and useful.

📖 **Read online:** [lokumai.github.io/ai-engineering-bazaar](https://lokumai.github.io/ai-engineering-bazaar/)

A series of mini-courses from beginner to advanced to help you learn practical topics in modern AI engineering. Each course is short, easy to understand, and includes real-world examples, clear visuals, and extra reading materials. It is the fastest way to master what you actually need on the job.

## Why This Is Valuable

The internet already has plenty of AI content. Adding more only makes sense if it is different in a way that actually helps you. These seven rules are that difference. They are not writing preferences, they are the reason this is worth your time.

1. **A human writes it.** Most of what we cover is new, so good sources barely exist and a lot of what you find online is guesswork. AI tools were trained before much of it existed, so they read those same weak articles and repeat them back with confidence. This comes from a working AI engineer, after years of building it in production.
2. **It sounds like a person talking.** Ask an engineer this question in real life and you get a straight answer, in normal words. That is how it is written here.
3. **It stays simple.** Plain language, no jargon, no buzzwords. Sometimes we oversimplify on purpose. Easy to read even if English is not your first language.
4. **Five to ten minutes per module.** If you ever feel the need to paste one of these pages into ChatGPT and ask for a summary, we failed.
5. **Pictures do a lot of the work.** A picture is worth a thousand words, so expect diagrams, charts, simple sketches, and now and then a meme.
6. **Every module points you somewhere next.** Each topic is kept short on purpose, then links out to more. In the world of Reels and TikTok, attention is short and nobody pushes through something just because they were told to read it, and people only really learn what they wanted to learn. So a page is written to leave you curious instead of full, and the links are there for the moment you want more.
7. **We only cover what matters.** A cheatsheet for AI engineering, not a textbook. Knowing what to leave out comes from building things, not from searching.

📜 Full version: **[MANIFEST.md](mini-courses/MANIFEST.md)** · 🧭 Where this is going: **[ROADMAP.md](mini-courses/ROADMAP.md)**

## Structure

| Category | Sheets | Description |
| --- | --- | --- |
| [Fundamentals](mini-courses/1_fundamentals/README.md) | 7 | LLMs, training, RAG, tools, memory, agents, multi-agent systems. **Start here.** |
| [Intermediate](mini-courses/2_intermediate/README.md) | 7 | Prompt engineering, context engineering, coding agents, harness engineering, loop engineering, security, personal agents. |
| [Ecosystem](mini-courses/4_ecosystem/README.md) | 6 | Agent frameworks, inference providers, inference engines, UI design, observability, choosing a tech stack. |
| [IN PROGRESS] [Expert](mini-courses/3_expert/README.md) | 10 | Advanced UI, architectures, tools, memory, multi-agent, prompting, context engineering, harness engineering, deployment, training. |
| [IN PROGRESS] [Protocols & Specs](mini-courses/5_protocols_specs/README.md) | 1 | A single reference of every protocol and spec mentioned across the series. |
| [IN PROGRESS] [Optional](mini-courses/6_optional/README.md) | 2 | Human-in-the-loop and runtime topics that round out the series. |

Every module is written in English first, with a Turkish version alongside it once the English is final. Each category page says how many of its sheets are finished, so the number is never stale here.

### How to Use

1. Start with [Fundamentals](mini-courses/1_fundamentals/README.md) to learn must-know concepts in AI Engineering.
2. Move on to [Intermediate](mini-courses/2_intermediate/README.md) to build your core skills.
3. Jump to [Ecosystem](mini-courses/4_ecosystem/README.md) to learn the tools and frameworks needed to become a well-rounded AI engineer.

🎉 Congrats! You are now an **AI engineer**. You can now build your own AI agents and systems.

4. ⚜️ [ADVANCED] ⚜️ If you want to become a rare, highly-skilled AI engineer, take the [Expert](mini-courses/3_expert/README.md) course to learn advanced topics.

## Your progress stays in your browser

The site keeps a record of which sheets you have signed off, your answers to the quick checks, the sources you opened, and the repositories you register against each module. All of it lives on your own device. Signed out, it goes nowhere else: no account, and no network call while you read.

Signing in is optional and nothing is gated behind it. Every sheet works exactly the same signed out. An account only means the record survives a cleared cache, a second machine or a lost laptop.

Because browser storage can be cleared without warning, **export is a real feature**. From `/profile/` you can write your whole record to a file, and the `RECORD OF WORK` at `/report/` is a single HTML file you keep, which works offline years later and can be imported into another browser.

There is also a `/path/` page: tell it what you do and it draws an ordered route through the set for your role, saying what each sheet gives someone in that job. It recommends an order and gates nothing.

## Contributing

Corrections and better explanations are welcome, and so are reports of anything that reads as guesswork. Open an issue or a pull request. Read [MANIFEST.md](mini-courses/MANIFEST.md) first, since it is the contract every module is held to.

## For developers

The courses are plain markdown in `mini-courses/`, and the site is a Next.js static export that reads them. Two documents cover the rest:

- **[`context/ARCHITECTURE.md`](context/ARCHITECTURE.md)** maps the whole repository: the two projects in it, where the line between them sits, how a markdown file becomes a page, and what `mini-courses/curriculum.yaml` owns.
- **[`ARCHITECTURE.md`](ARCHITECTURE.md)** is the application's own architecture: the six rules that explain why the code looks the way it does, the build, the runtime layers and deployment.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export into out/
npm test             # vitest
npm run test:e2e     # playwright, real Chrome
```

Accounts are off unless configured, and with no `.env.local` everything builds and runs without them. See [`docs/auth-flow.md`](docs/auth-flow.md) for how sign-in works, [`docs/data-flow.md`](docs/data-flow.md) for where the record lives, and [`SECURITY.md`](SECURITY.md) before enabling accounts for anyone outside the team.

## Licence

[MIT](LICENSE).
