# İleri Seviye LLM

*(Bu bir placeholder modül: şimdilik kısa bir özet, tam ders içeriği yakında geliyor.)*

LLM Temelleri modülü modeli, bir sonraki token'ı tahmin eden kapalı bir kutu olarak ele aldı. Bu modül o kutuyu açıyor, ama modellerle bir şey inşa eden bir mühendisin ihtiyacı kadar: transformer neden çalışıyor, üretimin her adımında ne oluyor ve bir modelin ne kadar hızlı ve ne kadar ucuza cevap vereceğini ne belirliyor.

**Bu modülde işlenecek konular**:
- Transformer'lar, neden çalıştıkları üzerinden, softmax, encoder ve decoder gibi neural network detaylarına girmeden
- Self-supervised learning: pre-training label olmadan training signal'i nasıl üretir
- LLM inference döngüsü
- Mixture of Experts (MoE)
- Prefill ve decode
- Bir modelin parçaları yan yana: norm, position, attention, KV cache, FFN ve sparse katmanlar
- Static ve continuous batching
- Serving metrikleri: ilk token'a kadar geçen süre (TTFT) ve üretim hızı
- Speculative decoding
