# İleri Seviye LLM Deployment

*(Bu bir placeholder modül: şimdilik kısa bir özet, tam ders içeriği yakında geliyor.)*

Advanced LLM modülü, üretimin her adımında ne olduğunu anlattı. Bu modül ise o modeli aynı anda çok sayıda kullanıcıya sunmakla ilgili: attention katmanı ve KV cache nasıl küçültülüp hızlandırılır, bellek istekler arasında nasıl paylaşılır ve tek bir model birçok GPU'ya nasıl dağıtılır.

**Bu modülde işlenecek konular**:
- KV cache, tek bir GPU'nun kaç kullanıcıya hizmet verebileceğini neden belirler
- Multi-Query ve Grouped-Query Attention (MQA, GQA): daha az key ve value head
- Multi-head Latent Attention (MLA): KV cache'i sıkıştırmak
- FlashAttention: attention matrisinin tamamını belleğe yazmadan attention hesaplamak
- PagedAttention: vLLM'deki gibi, KV cache belleğini sayfalara bölmek
- Prefix caching: ortak bir prompt'un cache'ini yeniden kullanmak
- Servis için quantization: FP8, INT8 ve 4-bit weight'ler
- Tensor ve pipeline parallelism: tek bir modeli birçok GPU'ya yaymak
- Prefill ve decode'u farklı makinelere ayırmak
- Serving engine'leri yan yana: vLLM, SGLang ve TensorRT-LLM
