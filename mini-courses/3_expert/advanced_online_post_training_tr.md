# İleri Seviye Online Post-training

*(Bu bir placeholder modül: şimdilik kısa bir özet, tam ders içeriği yakında geliyor.)*

İleri Seviye Offline Post-training modülü, modeli sabit bir veri setinden eğitti. Online post-training'de ise model, training sırasında yeni cevaplar yazar ve her cevap bittikten sonra puanlanır; böylece model kendi o anki davranışından öğrenir. Bu modül bu döngüyü ve modelin, insanların ya da bir yapay zekâ değerlendiricisinin tercih ettiği cevapları tercih etmesini sağlayan yöntemleri anlatıyor.

**Bu modülde işlenecek konular**:
- Online ne demek: model üretir, sonra puanlanır
- RLHF (insan geri bildirimiyle reinforcement learning)
- Prompt, policy ve reward
- Reward model: online döngü başlamadan önce, tercih edilen bir çiftten öğrenmek
- Policy model tam olarak nedir?
- PPO (proximal policy optimization)
- GRPO (group relative policy optimization)
- PPO ve GRPO: hangi modellere ihtiyaç var?
- RLAIF (yapay zekâ geri bildirimiyle reinforcement learning)
- Kısa notlar: online DPO ve on-policy distillation

**Başlangıç için kaynaklar**:
- [Unsloth: reinforcement learning rehberi](https://unsloth.ai/docs/get-started/reinforcement-learning-rl-guide)
- [Unsloth dokümantasyonu](https://unsloth.ai/docs)
