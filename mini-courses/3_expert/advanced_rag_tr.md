# İleri Seviye RAG ve Embedding'ler

*(Bu bir placeholder modül: şimdilik kısa bir özet, tam ders içeriği yakında geliyor.)*

RAG ve Embedding'ler modülü çalışan en basit pipeline'ı kurdu: chunk'la, embed et, ara, cevapla. Bu modül, o pipeline'ın gerçek dokümanlar üzerinde iyi çalışması gerektiğinde nelerin değiştiğini ve her adımın arkasındaki seçimleri anlatıyor.

**Bu modülde işlenecek konular**:
- RAG, uzun context ve fine-tuning karşılaştırması
- Veriyi içeri almak (ingestion)
- Chunking stratejileri: sabit boyut, sliding window, recursive, dokümana dayalı ve semantic chunking
- Indexing hyperparameter'ları
- Retrieval: semantic search, BM25 ya da ikisi birden, ardından bir reranker (cross-encoder)
- Bi-encoder ve cross-encoder
- Hybrid retrieval
- Anthropic'in contextual retrieval yaklaşımı
- Correct ile faithful arasındaki fark: doğru bir cevap ile kaynağına bağlı kalan bir cevap
- Mimariler: naive RAG, HyDE, corrective RAG, multi-hop RAG, GraphRAG, agentic RAG ve multimodal RAG
- RAG güvenliği
