# Advanced LLM Compression

*(Placeholder module: a short overview for now, full lesson content is coming soon.)*

A large model takes a lot of memory, costs a lot to run and answers slowly. This module covers the three ways to make a model smaller and cheaper while keeping as much of its quality as possible: quantization, pruning and knowledge distillation.

**Topics this module will cover**:
- Why compress: memory, cost, latency, and running on smaller hardware
- Quantization: FP8, INT8 and 4-bit weights
- Post-training quantization (GPTQ, AWQ) vs. quantization-aware training
- GGUF for local models
- Pruning: unstructured vs. structured, and 2:4 sparsity
- Knowledge distillation: teaching a small model from a large one
- Teacher and student: learning from logits vs. from generated outputs
- Measuring what compression costs in quality
