# İleri Seviye LLM Compression

*(Bu bir placeholder modül: şimdilik kısa bir özet, tam ders içeriği yakında geliyor.)*

Büyük bir model çok bellek kaplar, çalıştırması pahalıdır ve yavaş cevap verir. Bu modül, bir modeli kalitesini olabildiğince koruyarak küçültmenin ve ucuzlatmanın üç yolunu anlatıyor: quantization, pruning ve knowledge distillation.

**Bu modülde işlenecek konular**:
- Sıkıştırmanın nedenleri: bellek, maliyet, gecikme ve daha küçük donanımda çalıştırmak
- Quantization: FP8, INT8 ve 4-bit weight'ler
- Post-training quantization (GPTQ ve AWQ'nun yaptığı gibi, training bittikten sonra modeli quantize etmek) ve quantization-aware training
- Yerel modeller için GGUF
- Pruning: unstructured ve structured, ve 2:4 sparsity
- Knowledge distillation (bilgi damıtma): büyük bir modelin bildiklerini küçük bir modele aktarmak
- Teacher ve student: logit'lerden öğrenmek ile üretilen çıktılardan öğrenmek
- Sıkıştırmanın kaliteye maliyetini ölçmek
