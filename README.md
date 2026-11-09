# AI Engineering Bazaar

![AI Engineering Bazaar, by Lokum AI. An Iznik tile mural of a bazaar arcade whose hanging lanterns are wired to a neural chip](assets/banner-tiles.jpeg)

AI Engineering made simple, short, and useful.

📖 **Read online:** [ai-bazaar.lokum.dev](https://ai-bazaar.lokum.dev/)

A reference to help you learn practical topics in modern AI engineering. Our goal with this project is to provide material that includes only the most important parts, and not the details or things that have no significant real-life use. We only discuss practical topics, in an easy-to-understand and fast way, so that beginner researchers and engineers can quickly learn the essentials. It includes pictures, visualizations, code samples, and also external references for further reading, such as YouTube videos, to help you understand the topics better, and sometimes Gen Z-style brain rot, memes or short videos.

**Two versions of each written module.** The written modules of Fundamentals, Intermediate and Ecosystem come in two versions. *For Engineers* is the full technical text. *For Everyone* explains the same AI engineering ideas in plain words, with everyday examples, for readers who are not engineers, such as people in HR, finance or management. Switch between them at the top of any page.

## Structure

| Category | Modules | Description |
| --- | --- | --- |
| [Fundamentals](https://ai-bazaar.lokum.dev/courses/fundamentals/) | 8 | LLMs, training, RAG, tools, memory, agents, multi-agent systems, observability. **Start here.** |
| [Intermediate](https://ai-bazaar.lokum.dev/courses/intermediate/) | 9 | Prompt engineering, context engineering, code agents, agents in practice, harness engineering, loop engineering, agentic UI, security, personal agents. |
| [Ecosystem](https://ai-bazaar.lokum.dev/courses/ecosystem/) | 6 | Agent frameworks, inference providers, inference engines, UI design, choosing a tech stack, and a reference of every protocol and spec in the series. |
| [IN PROGRESS] [Expert](https://ai-bazaar.lokum.dev/courses/expert/) | 17 | Advanced LLM, fine-tuning, post-training, RAG, tools, memory, multi-agent, prompting, context engineering, coding agents, harness engineering, loop engineering, agent architectures, UI, deployment, agent servers, LLM evaluation. |
| [IN PROGRESS] [Emerging](https://ai-bazaar.lokum.dev/sheets/trends/) | 4 | Ideas that are hot in industry and research but not settled yet: LLMs that can't jump, video rendering, recursive self-improvement, decision models. |

### How to Use

1. Start with [Fundamentals](https://ai-bazaar.lokum.dev/courses/fundamentals/) to learn must-know concepts in AI Engineering.
2. Move on to [Intermediate](https://ai-bazaar.lokum.dev/courses/intermediate/) to build your core skills.
3. Jump to [Ecosystem](https://ai-bazaar.lokum.dev/courses/ecosystem/) to learn the tools and frameworks needed to become a well-rounded AI engineer.

🎉 Congrats! You are now an **AI engineer**. You can now build your own AI agents and systems.

4. ⚜️ [ADVANCED] ⚜️ If you want to become a rare, highly-skilled AI engineer, take the [Expert](https://ai-bazaar.lokum.dev/courses/expert/) course to learn advanced topics.

## Why This Is Valuable

The internet already has plenty of AI content. Adding more only makes sense if it is different in a way that actually helps you. These rules are that difference. They are not writing preferences, they are the reason this is worth your time.

1. **A human writes it.** Most of what we cover is new, so good sources barely exist and a lot of what you find online is guesswork. AI tools were trained before much of it existed, so they read those same weak articles and repeat them back with confidence. This comes from working AI engineers, after years of building it in production.
2. **A human verifies it.** Thanks to generative AI, producing content is now fast and free. As a result, the internet is full of unverified AI slop. Here, humans verify everything and try it out themselves before it is written down.
3. **It sounds like a person talking.** Ask an engineer this question in real life and you get a straight answer, in normal words. That is how it is written here.
4. **It stays simple.** Plain language, no jargon, no buzzwords. Sometimes we oversimplify on purpose. Easy to read even if English is not your first language.
5. **Twenty to thirty minutes per module.** If you ever feel the need to paste one of these pages into ChatGPT and ask for a summary, we failed.
6. **Pictures do a lot of the work.** A picture is worth a thousand words, so expect diagrams, charts, simple sketches, and now and then a meme.
7. **Every module points you somewhere next.** Each topic is kept short on purpose, then links out to more. In the world of Reels and TikTok, attention is short and nobody pushes through something just because they were told to read it, and people only really learn what they wanted to learn. So a page is written to leave you curious instead of full, and the links are there for the moment you want more.
8. **We only cover what matters.** A cheatsheet for AI engineering, not a textbook. Knowing what to leave out comes from building things, not from searching.

📜 Full version: **[MANIFEST.md](mini-courses/MANIFEST.md)** · 🧭 Where this is going: **[ROADMAP.md](mini-courses/ROADMAP.md)** · 📖 Why we made it: **[STORY.md](mini-courses/STORY.md)**

## Your progress stays in your browser

Your progress is saved only in your own browser, on your device, and nothing is sent anywhere. There is no account, so it stays private.

## Contributing

Corrections and better explanations are welcome, and so are reports of anything that reads as guesswork. Open an issue or a pull request. Read [MANIFEST.md](mini-courses/MANIFEST.md) first, since it is the contract every module is held to.

## For developers

The courses are plain markdown in `mini-courses/`, and the site is a Next.js static export that reads them. **[`kia-context/specs/ARCHITECTURE.md`](kia-context/specs/ARCHITECTURE.md)** is the map: what the repository is, the six rules that explain why the code looks the way it does, the build, the runtime layers, and what `mini-courses/curriculum.yaml` owns.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export into out/
npm test             # vitest
npm run test:e2e     # playwright, real Chrome
```

There are no accounts and no server: your progress stays in your browser, and you can export it to a file from the progress page.

## Licence

[MIT](LICENSE).

![A brass tray of Turkish delight held up in a sunlit stone bazaar](assets/footer-lokum.jpeg)  
*"Buyrun, MIT ikramımız olsun."* (Help yourself: the MIT licence is our treat.)
