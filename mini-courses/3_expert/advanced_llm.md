# Advanced LLM

*(Placeholder module: a short overview for now, full lesson content is coming soon.)*

LLM Fundamentals treated the model as a box that predicts the next token. This module opens the box, but only as far as an engineer who builds with models needs: why the transformer works, what happens on every step of generation, and what decides how fast and how cheaply a model answers.

**Topics this module will cover**:
- Transformers, explained from why they work, without the neural-network details such as softmax, encoders and decoders
- Self-supervised learning: how pre-training gets a training signal with no labels
- The LLM inference loop
- Mixture of Experts (MoE)
- Prefill vs. decode
- The parts of a model, side by side: norm, position, attention, KV cache, FFN and sparse layers
- Static vs. continuous batching
- Serving metrics: time to first token (TTFT) and generation speed
- Speculative decoding
