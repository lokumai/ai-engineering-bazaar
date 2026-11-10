# İleri Seviye Agentic UI

*(Bu bir placeholder modül: şimdilik kısa bir özet; tam ders içeriği yakında geliyor.)*

Agentic UI'da streaming'in ötesindeki her şey: insanın agent'ı çalışırken yönlendirmesi, ekran ile agent arasında paylaşılan state ve agent'ın kendisinin ürettiği arayüz. Temeli, yani bir run'ı event'ler olarak stream etmeyi ve AG-UI'ı, Agentic UI modülü anlattı.

**Bu modülde işlenecek konular**:
- Generative UI: agent'ın yalnızca içindeki metni değil arayüzün kendisini üretmesi, bunu yapmanın yolları ve her birinin artıları ile eksileri
- Shared state: ekranın ve agent'ın aynı uygulama state'ini okuyup yazması
- Yönlendirme: agent çalışırken insanın bir run'ı başka yöne çevirmesi
- Agentic generative UI: agent çalışırken üretilen arayüz
- A2UI
- MCP Apps
- OpenUI
- json-render
- CopilotKit
- Agent Client Protocol (ACP)
- Agent'lar için TUI

**Başlangıç için kaynaklar**:
- [Agentic UI nedir?](https://www.copilotkit.ai/learning/what-is-agentic-ui): herhangi bir framework'ten önce kavramın kendisi
- [Generative UI](https://www.copilotkit.ai/generative-ui): önceden yazılmış değil, agent'ın ürettiği bir arayüz ve onu kurmanın yolları
- [Generative UI: A rich, custom, visual interactive user experience for any prompt](https://research.google/blog/generative-ui-a-rich-custom-visual-interactive-user-experience-for-any-prompt/): Google Research'ün, bir prompt için arayüzün tamamını üreten model çalışması
- [AG-UI Protocol](https://www.copilotkit.ai/ag-ui) ve [CopilotKit Interactive Dojo](https://dojo.ag-ui.com/): streaming'in ötesinde protokol, ve shared state ile generative UI'ın canlı demoları
- [A2UI: 5 dakikada başlangıç](https://a2ui.org/#get-started-in-5-minutes) ve [agent'lar nasıl çalışıyor](https://a2ui.org/reference/agents/#how-agents-work): protokolün kendisi, en kısa giriş yolundan agent tarafına
- [AGenUI](https://github.com/AGenUI/AGenUI): iOS, Android ve HarmonyOS için native bir A2UI renderer'ı, yani protokol tarayıcı yerine telefona ulaşıyor
- [AG-UI: state](https://docs.ag-ui.com/concepts/state): agent'ın state'i ile ön yüzün nasıl aynı hizada kaldığı
- [CopilotKit: agent-app context](https://docs.copilotkit.ai/agent-app-context), [shared state](https://docs.copilotkit.ai/shared-state) ve [frontend tools](https://docs.copilotkit.ai/frontend-tools): bir agent'ın içinde yaşadığı uygulamayı okuyup üzerinde iş yapmasını sağlayan üç parça
- [OpenGenerativeUI](https://github.com/CopilotKit/OpenGenerativeUI): CopilotKit'in açık kaynak generative UI framework'ü
- [json-render](https://github.com/vercel-labs/json-render): Vercel Labs'ın generative UI framework'ü
- [OpenUI](https://www.openui.com/): generative UI için renderer'dan bağımsız açık bir standart, streaming öncelikli, JSON göndermekten çok daha az token iddiasıyla
- [LangChain: headless tool'lar](https://docs.langchain.com/oss/python/langchain/frontend/headless-tools): aynı fikir framework tarafından, kendi arayüzü olmayan tool'lar
