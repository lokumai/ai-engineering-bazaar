# İleri Seviye Prompting

*(Bu bir placeholder modül — şimdilik kısa bir özet; tam ders içeriği yakında geliyor.)*

Prompt Engineering modülündeki temellerin çok ötesine geçen akıl yürütme ve prompting
stratejileri.

**Bu modülde işlenecek konular**:
- Structured output'u zorlamak. Formatı prompt'ta istemek çoğu zaman işe yarar ama kırılgandır. **Constrained decoding** ise formatı garanti eder: model bir sonraki token'ı seçerken olası token havuzu bir grammar'a göre filtrelenir, böylece yalnızca çıktıyı geçerli tutan token'lar seçilebilir. [Outlines](https://github.com/dottxt-ai/outlines) ve [XGrammar](https://github.com/mlc-ai/xgrammar) gibi kütüphaneler bunu yapar; yerel ya da bulut fark etmeksizin çoğu LLM API'si de bunu doğrudan destekler.
- Reflexion
- Tree of Thought
- LLM Council
- Caveman
- Ponytail
