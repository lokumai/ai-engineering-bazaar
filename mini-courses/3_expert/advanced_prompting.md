# Advanced Prompting

*(Placeholder module: a short overview for now, full lesson content is coming soon.)*

Reasoning and prompting strategies that go well beyond the basics from Prompt Engineering.

**Topics this module will cover**:
- Forcing structured output: constrained decoding, which filters the next-token pool by a grammar so the output always fits it
- Reflexion
- Tree of Thought
- LLM Council
- Caveman
- Ponytail

**Notes for the structured output section**: asking for a format in the prompt works most of the
time, but it is fragile. Constrained decoding guarantees the format instead. When the model picks
its next token, the pool of possible tokens is filtered by a grammar, so only a token that keeps the
output valid can be chosen. The one exception is an answer cut off at the length limit. Libraries
such as Outlines and XGrammar do this, and most LLM APIs, local and cloud, support it out of the
box.

**References to start from**:
- [Outlines](https://github.com/dottxt-ai/outlines): structured outputs for LLMs
- [XGrammar](https://github.com/mlc-ai/xgrammar): fast, flexible and portable structured generation
