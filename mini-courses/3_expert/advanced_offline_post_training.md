# Advanced Offline Post-training

*(Placeholder module: a short overview for now, full lesson content is coming soon.)*

A base model that has finished pre-training can continue a text, but it does not yet behave like an assistant. Post-training is what is done to it after that, and this module covers the offline part: the model learns from a fixed dataset that was collected before training, either examples of good answers or pairs of a preferred and a rejected answer. Training LLMs introduced fine-tuning and PEFT at a high level; this module also goes under that: what fine-tuning really changes inside a model, why changing all of it is so expensive, and how LoRA lets one frozen model carry many small adapters. PEFT and LoRA are tools that the online methods in Advanced Online Post-training use too.

**Topics this module will cover**:
- Model alignment and post-training
- Full fine-tuning: what actually changes?
- Why full fine-tuning is expensive
- Why parameter-efficient fine-tuning (PEFT)?
- LoRA
- One frozen model: save and swap LoRA adapters
- SFT (supervised fine-tuning)
- Why preference tuning?
- Preference data formats
- DPO (direct preference optimization)
- SFT vs. DPO: one training example

**References to start from**:
- [Unsloth: fine-tuning guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide)
- [Unsloth: is fine-tuning right for me?](https://unsloth.ai/docs/get-started/fine-tuning-for-beginners/faq-+-is-fine-tuning-right-for-me)
- [Unsloth notebooks](https://unsloth.ai/docs/get-started/unsloth-notebooks)
