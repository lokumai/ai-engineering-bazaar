# Advanced Post-training

*(Placeholder module: a short overview for now, full lesson content is coming soon.)*

A base model that has finished pre-training can continue a text, but it does not yet behave like an assistant. This module covers what is done to it after that, so that it follows instructions and prefers the answers people prefer.

**Topics this module will cover**:
- Model alignment and post-training
- Why preference tuning?
- Preference data formats
- RLHF (reinforcement learning from human feedback)
- Prompt, policy and reward
- The reward model: learning from a preferred pair
- What exactly is a policy model?
- PPO (proximal policy optimization)
- SFT vs. DPO: one training example
- DPO (direct preference optimization)
- GRPO (group relative policy optimization)
- PPO vs. GRPO: which models are needed?
- RLAIF (reinforcement learning from AI feedback)
- Knowledge distillation: teaching a small model from a large one

**References to start from**:
- [Unsloth: reinforcement learning guide](https://unsloth.ai/docs/get-started/reinforcement-learning-rl-guide)
- [Unsloth documentation](https://unsloth.ai/docs)
