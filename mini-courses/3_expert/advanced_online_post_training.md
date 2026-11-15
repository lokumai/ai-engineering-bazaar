# Advanced Online Post-training

*(Placeholder module: a short overview for now, full lesson content is coming soon.)*

Advanced Offline Post-training taught a model from a fixed dataset. In online post-training, the model writes new answers during training, and each answer is scored as it is written, so the model learns from its own current behaviour. This module covers that loop, and the methods that make the model prefer the answers people prefer.

**Topics this module will cover**:
- What online means: the model generates, then it is scored
- RLHF (reinforcement learning from human feedback)
- Prompt, policy and reward
- The reward model: learning from a preferred pair
- What exactly is a policy model?
- PPO (proximal policy optimization)
- GRPO (group relative policy optimization)
- PPO vs. GRPO: which models are needed?
- RLAIF (reinforcement learning from AI feedback)
- Short notes: online DPO and on-policy distillation

**References to start from**:
- [Unsloth: reinforcement learning guide](https://unsloth.ai/docs/get-started/reinforcement-learning-rl-guide)
- [Unsloth documentation](https://unsloth.ai/docs)
