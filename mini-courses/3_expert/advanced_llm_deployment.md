# Advanced LLM Deployment

*(Placeholder module: a short overview for now, full lesson content is coming soon.)*

Advanced LLM explained what happens on every step of generation. This module is about serving that model to many users at once: how the attention layer and the KV cache are made smaller and faster, how memory is shared between requests, and how one model is spread over many GPUs.

**Topics this module will cover**:
- Why the KV cache decides how many users one GPU can serve
- Multi-Query and Grouped-Query Attention (MQA, GQA): fewer key and value heads
- Multi-head Latent Attention (MLA): compressing the KV cache
- FlashAttention: computing attention without writing the full attention matrix to memory
- PagedAttention: KV cache memory in pages, as vLLM does
- Prefix caching: reusing the cache of a shared prompt
- Quantization for serving: FP8, INT8 and 4-bit weights
- Tensor and pipeline parallelism: one model on many GPUs
- Splitting prefill and decode onto different machines
- Serving engines side by side: vLLM, SGLang and TensorRT-LLM
