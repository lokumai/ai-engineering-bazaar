# Advanced Prompting

*(Placeholder module — a short overview for now; full lesson content is coming soon.)*

Reasoning and prompting strategies that go well beyond the basics from Prompt Engineering.

**Topics this module will cover**:
- Forcing structured output. Asking for a format in the prompt works most of the time, but it is fragile. **Constrained decoding** guarantees the format instead: when the model picks its next token, the pool of possible tokens is filtered by a grammar, so only tokens that keep the output valid can be chosen. Libraries such as [Outlines](https://github.com/dottxt-ai/outlines) and [XGrammar](https://github.com/mlc-ai/xgrammar) do this, and most LLM APIs, local and cloud, support it out of the box.
- Reflexion
- Tree of Thought
- LLM Council
- Caveman
- Ponytail
