# İleri Seviye Prompting

*(Bu bir placeholder modül: şimdilik kısa bir özet, tam ders içeriği yakında geliyor.)*

Prompt Engineering modülündeki temellerin çok ötesine geçen akıl yürütme ve prompting
stratejileri.

**Bu modülde işlenecek konular**:
- Constrained decoding ile structured output'u zorlamak
- Reflexion
- Tree of Thought
- LLM Council
- Caveman
- Ponytail

## Structured Output'u Zorlamak

Formatı prompt'ta istemek çoğu zaman işe yarar ama
kırılgandır. Constrained decoding ise formatı garanti eder: model bir sonraki token'ı seçerken olası
token havuzu bir grammar'a göre filtrelenir, böylece yalnızca çıktıyı geçerli tutan bir token
seçilebilir. Tek istisna, uzunluk sınırında kesilen bir cevaptır. Outlines ve
XGrammar gibi kütüphaneler bunu yapar; yerel ya da bulut fark etmeksizin çoğu LLM API'si de bunu
doğrudan destekler.

### Kaynaklar

- [Outlines](https://github.com/dottxt-ai/outlines): LLM'ler için structured output
- [XGrammar](https://github.com/mlc-ai/xgrammar): hızlı, esnek ve taşınabilir structured generation
