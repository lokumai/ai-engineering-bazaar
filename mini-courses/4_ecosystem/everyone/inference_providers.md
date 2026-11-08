---
summary: "Who rents you an AI model, the two ways to buy that access, and a buyer's checklist that goes beyond the price."
objectives:
  - "Say what an inference provider is, and what a gateway adds"
  - "Know when going straight to the model's maker makes sense"
  - "Use a checklist beyond price, including what happens to your data"
---

# Inference Providers

[LLM Fundamentals](../1_fundamentals/llms.md) showed that running a model is called inference, and
that you can do it in the cloud. This module is about the companies that sell that service, and what
to compare when you choose one.

An **inference provider** runs AI models on its own computers and rents you access to them. You send
text, you get text back, and you pay for how much text went through, counted in tokens. You own none
of the machines. It is like paying for electricity by use instead of owning a power plant.

## Why This Matters to You

If your company buys AI access, someone has to choose a provider, and the price per token is the
number everyone quotes. This module gives you the questions that matter more, especially the one
about where your data goes.

## The Gateway (Router)

![](../images/logos/openrouter-mono.svg)[OpenRouter](https://openrouter.ai/) is a **gateway** (also called a router). It sits in front of many providers,
so you use one account, one bill and one way of connecting, and you can reach almost any model.

- **You can switch models by changing one line.** If a better model comes out on Monday, you can
  use it a few hours later.
- **One account instead of many.**
- **Failover:** if one provider is down, the request can go to another one instead of failing.
- **The same model from several sellers**, at different prices and speeds, so you can choose.

The cost is one more company between you and the model, and a tiny delay.

![](../images/logos/portkey.svg)**Portkey** does the same routing job with your own accounts, and adds things a company team asks
for: guards, traces, budget limits and caching.

A warning about a different kind of router: ![](../images/logos/agentrouter.svg)**AgentRouter** gives one wallet for many paid services
an agent might use, such as email, phone and travel booking. It holds your money and sees every call
you send through it, and its website does not say which company runs it. Treat it like any third
party that handles your data.

## Inference from LLM Vendors

The other way is to buy directly from the company that made the model: ![](../images/logos/openai-mono.svg)OpenAI, ![](../images/logos/anthropic-mono.svg)Anthropic or
![](../images/logos/google.svg)Google. You get their newest models first, and features only they offer, such as cheaper
repeated instructions (caching), discounts for big batches, and higher limits.

Many companies do both: they buy directly for the model they use every day, and use a gateway to try
everything else.

## What to Compare, Beyond the Price

The price per million tokens is the number everyone quotes, and it is the worst number to decide on
by itself. Here is a buyer's checklist:

- **Caching.** If your assistant sends the same long instructions with every request, a provider that
  caches them charges much less for each repeat. This can matter more than the base price.
- **Rate limits.** How many requests per minute you are allowed. A good price does not help if your
  requests wait in a queue.
- **Speed, and which kind.** The time until the first word appears is what a person feels in a chat.
  The total time is what a big batch job feels. These are different numbers.
- **Limits on size.** How much text fits in one request, and how long one answer can be. The answer
  limit is the one people forget, until a long answer gets cut off.
- **What happens to your data.** Does the provider keep your text? For how long? Can it use your text
  to train its models? If your requests contain customer or employee data, read this part before you
  send anything. For HR, finance and legal work, this question comes first.
- **Quality from different sellers.** Through a gateway, two sellers can offer a model with the same
  name, but one may run a shrunk, lower-quality copy (the quantization from
  [LLM Fundamentals](../1_fundamentals/llms.md)) to be cheaper.

## Starting for Free

![](../images/logos/google.svg)**[Google AI Studio](https://aistudio.google.com/)** and OpenRouter both have free plans with daily limits, enough to learn
on and to test an idea.

One warning. A free plan tells you whether a model *can* do your task. It does not tell you how fast
your product will feel, because free capacity is slower, more limited, and the first to be cut when
the provider is busy. Test speed on the plan you will actually pay for.

## Words You Now Know

- **Inference provider**: a company that runs AI models and rents access per token.
- **Gateway** (router): one door to many models and providers.
- **Failover**: moving a request to another provider when one is down.
- **Caching**: paying less for instructions you send again and again.
- **Rate limit**: how many requests you may send per minute.
- **Data retention**: whether and how long a provider keeps your text.

## Summary

Inference providers rent you AI models by the token. A gateway like OpenRouter gives you one door to
many of them; going straight to the maker gives you their newest models and special features. Do not
choose on price alone: check caching, limits, speed, answer length, quality, and above all what
happens to your data.

**Quick check**: What does a gateway give you that a single provider does not? And which question on
the checklist matters most when your requests contain employee data?

## References

### 🛠️ Tools

- [OpenRouter](https://openrouter.ai/): one account for many models, and the fastest way to compare them
- [Portkey](https://portkey.ai/): routing with your own accounts, plus guards and traces
- [Google AI Studio](https://aistudio.google.com/): a free plan with a daily allowance, enough to learn on
