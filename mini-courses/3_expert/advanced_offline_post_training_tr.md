# İleri Seviye Offline Post-training

*(Bu bir placeholder modül: şimdilik kısa bir özet, tam ders içeriği yakında geliyor.)*

Pre-training'i bitmiş bir base model bir metni devam ettirebilir, ama henüz bir asistan gibi davranmaz. Post-training, bundan sonra modele yapılanlardır. Bu modül onun offline kısmını anlatıyor. Offline post-training'de model, training'den önce toplanmış sabit bir veri setinden öğrenir. Bu veri setinde iyi cevap örnekleri ya da tercih edilen ve reddedilen cevap çiftleri bulunur.

Training LLMs modülü fine-tuning'i ve PEFT'i yüksek seviyede tanıttı. Bu modül onları daha derinlemesine anlatıyor: fine-tuning bir modelin içinde gerçekte neyi değiştirir, hepsini değiştirmek neden bu kadar pahalıdır ve LoRA, donmuş tek bir modelin birçok küçük adapter taşımasını nasıl sağlar. İleri Seviye Online Post-training modülündeki online yöntemler de PEFT ve LoRA'yı kullanabilir.

**Bu modülde işlenecek konular**:
- Model alignment ve post-training
- Full fine-tuning: gerçekte ne değişiyor?
- Full fine-tuning neden pahalı?
- Neden parameter-efficient fine-tuning (PEFT)?
- LoRA
- Donmuş tek bir model: LoRA adapter'larını kaydetmek ve değiştirmek
- SFT (supervised fine-tuning)
- Neden preference tuning?
- Preference verisinin formatları
- DPO (direct preference optimization)
- SFT ve DPO: tek bir training örneği üzerinden

**Başlangıç için kaynaklar**:
- [Unsloth: fine-tuning rehberi](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide)
- [Unsloth: fine-tuning bana uygun mu?](https://unsloth.ai/docs/get-started/fine-tuning-for-beginners/faq-+-is-fine-tuning-right-for-me)
- [Unsloth notebook'ları](https://unsloth.ai/docs/get-started/unsloth-notebooks)
