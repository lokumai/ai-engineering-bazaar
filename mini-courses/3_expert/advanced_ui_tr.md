# İleri Seviye UI

*(Bu bir placeholder modül — şimdilik kısa bir özet; tam ders içeriği yakında geliyor.)*

Agent'ların canlı olarak yönlendirebildiği veya oluşturabildiği arayüzler, ve agent'ları arayüzlere bağlayan ortaya çıkan protokoller.

**Bu modülde işlenecek konular**:
- Agentic UI
- Generative UI
- Event streaming
- AG-UI
- MCP-Apps UI
- A2UI
- CopilotKit
- Agent Client Protocol (ACP)

**Başlangıç için kaynaklar**:
- [Agentic UI nedir?](https://www.copilotkit.ai/learning/what-is-agentic-ui): herhangi bir framework'ten önce kavramın kendisi
- [Generative UI](https://www.copilotkit.ai/generative-ui): aynısı, ama modelin yönlendirdiği değil ürettiği bir arayüz için
- [A2UI: 5 dakikada başlangıç](https://a2ui.org/#get-started-in-5-minutes) ve [agent'lar nasıl çalışıyor](https://a2ui.org/reference/agents/#how-agents-work): protokolün kendisi, en kısa giriş yolundan agent tarafına
- [AGenUI](https://github.com/AGenUI/AGenUI): iOS, Android ve HarmonyOS için native bir A2UI renderer'ı, yani protokol tarayıcı yerine telefona ulaşıyor
- [AG-UI: state](https://docs.ag-ui.com/concepts/state): agent'ın state'i ile ön yüzün nasıl aynı hizada kaldığı
- [CopilotKit: agent-app context](https://docs.copilotkit.ai/agent-app-context), [shared state](https://docs.copilotkit.ai/shared-state) ve [frontend tools](https://docs.copilotkit.ai/frontend-tools): bir agent'ın içinde yaşadığı uygulamayı okuyup üzerinde iş yapmasını sağlayan üç parça
- [OpenGenerativeUI](https://github.com/CopilotKit/OpenGenerativeUI): CopilotKit'in açık kaynak generative UI framework'ü
- [json-render](https://github.com/vercel-labs/json-render): Vercel Labs'ın generative UI framework'ü
- [OpenUI](https://www.openui.com/): generative UI için renderer'dan bağımsız açık bir standart, streaming öncelikli, JSON göndermekten çok daha az token iddiasıyla
- [LangChain: headless tool'lar](https://docs.langchain.com/oss/python/langchain/frontend/headless-tools): aynı fikir framework tarafından, kendi arayüzü olmayan tool'lar

## Eğitim İlerlemesi

```mermaid
graph LR
    A[Advanced Tools] --> B[Advanced Memory]
    B --> C[Advanced Multi-Agent]
    C --> D[Advanced Prompting]
    D --> E[Adv. Context Eng.]
    E --> F[Adv. Coding Agents]
    F --> G[Adv. Harness Eng.]
    G --> H[Adv. Agent Arch.]
    H --> I[Advanced UI]
    I --> J[Advanced Deployment]
    J --> K[Advanced Training]
    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#90EE90
    style D fill:#90EE90
    style E fill:#90EE90
    style F fill:#90EE90
    style G fill:#90EE90
    style H fill:#90EE90
    style I fill:#FFFF00
```
