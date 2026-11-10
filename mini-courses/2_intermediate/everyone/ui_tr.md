---
objectives:
  - "Agentic UI'ın ne olduğunu, normal bir uygulamadan ve bir chat kutusundan nasıl farklı olduğunu söyle"
  - "Bir agent'ın işinin neden sonda tek seferde değil, adım adım gösterildiğini açıkla"
  - "Code Agents modülündeki evrensel şarj fişi benzetmesiyle AG-UI'ın ne işe yaradığını açıkla"
  - "Human in the loop'un ne demek olduğunu ve bir agent'ın önemli bir adımdan önce neden durup sana sorduğunu söyle"
---

# Agentic UI

[Loop Engineering](loop_engineering_tr.md) modülü, dakikalarca, saatlerce, bazen günlerce çalışan agent'larla bitti. Yine de biri bu işe bakmak zorunda: agent'ın ne yaptığını görmek, işler ters gittiğinde onu durdurmak ve önemli adımlara onay vermek. Bu modül, tüm bunların olduğu ekranı anlatıyor.

## Bu Senin İçin Neden Önemli

İş yerindeki birçok AI asistanı ilerleyişini ekranda gösterir: "arıyor", "dosyayı okuyor", "raporu yazıyor". Bu ekran iyi yapıldıysa agent'ı takip edebilir, bir hatayı erkenden yakalayabilir ve araya girebilirsin. Bu modül, o ekranın agent'ın işini nasıl aldığını ve bu ürünleri yapan şirketlerin birçoğunun neden artık tek bir ortak yol kullandığını açıklıyor.

## Agentic UI Nedir

Bu arayüzleri geliştiren CopilotKit şirketi, agentic UI'ı şöyle tanımlıyor:

> **Agentic UI, insanların ve AI agent'larının aynı uygulamada birlikte çalışması için geliştirilmiş kullanıcı arayüzüdür.**
> Agent'ın işini gerçekleştikçe stream eder, çalışma sürerken insanın yönlendirmesini ve onaylarını kabul eder, agent'ın ürettiği arayüzü geliştiricinin yazdığı bileşenlerin yanında gösterir ve uygulamanın durumunu kullanıcı ile agent arasında senkron tutar.

Sade bir dille söylersek, fark işi kimin yaptığında:

- **Normal bir uygulama** seni bekler. Bir düğmeye basarsın ve her seferinde aynı şey olur.
- **Bir chat kutusu** bir kez cevap verir. Bir soru yazarsın, beklersin ve tek bir cevap görünür.
- **Bir agentic UI** zaten çalışmakta olan bir agent'ı gösterir. Agent birçok karar verir ve birçok tool kullanır; sen de o çalışırken onu izler, yönlendirir ve düzeltirsin.

Bu modül, bunların hepsinin temelini anlatıyor: **agent'ın işini gerçekleştikçe göstermek** ve agent'ın önemli bir adımdan önce **durup sana sorması**. Agent çalışırken onu yönlendirdiğin ya da agent'ın ekranı kendisinin tasarladığı kısımlar Expert seviyesinde geliyor.

## Run'ı Neden Stream Ederiz

Bir yemek uygulamasından sipariş verdiğini düşün. Kapıda, ne olduğunu bilmeden bekleyebilirsin. Ya da uygulama sana her adımı gösterir: sipariş alındı, hazırlanıyor, yolda, kapında. Yemek her iki durumda da aynı anda gelir. Ama ikinci durumda neler olduğunu bilirsin ve bir şey ters giderse erkenden öğrenirsin.

Bir agent de aynı şekilde çalışır. Bir model cevabını, [LLM Temelleri](../1_fundamentals/llms_tr.md) modülünde gördüğün gibi, kelime kelime yazar. Agent bunun üstüne daha fazlasını yapar: düşünür, bir tool kullanır, sonucu bekler ve başka bir tool kullanır. Bütün iş bir dakika da sürebilir, bir saat de. Dolayısıyla ekranı kurmanın iki yolu var:

1. **Bekle, sonra hepsini göster.** Bütün bu süre boyunca dönen bir tekerleğe bakarsın ve agent'ın çalışıyor mu, takılmış mı, yoksa yanlış yöne mi gidiyor olduğunu anlayamazsın.
2. **Run'ı stream et.** Ekran her iş parçasını oluştuğu anda gösterir: cevabın birkaç kelimesi, "şimdi hava durumuna bakıyorum", sonuç. Buna **streaming** denir.

Chat asistanları ve coding agent'lar gibi agent ürünleri stream eder. İş zaten adım adım yapılıyor, o yüzden onu saklamanın bir sebebi yok. Adımları görmek, yanlış giden bir işi daha masrafı küçükken durdurmanı da sağlar.

![Stream eden bir agent arayüzü](../images/streaming-ui.webp)  
*Ekran boş bir prompt ile başlar. Agent çalışmaya başlayınca adımlarından oluşan bir checklist dolar ve agent her adımı bitirdikçe o adım işaretlenir; böylece bir spinner yerine ilerlemeyi görürsün.*

## Neler Stream Edilir

Agent'ın tarafı (**backend**) tek bir uzun metin göndermez. **Event** denen, her biri az önce ne olduğunu söyleyen birçok küçük mesaj gönderir. Ekran (**frontend**) her event'i okur ve kendini günceller. [Tool Calling](../1_fundamentals/tools_tr.md) modülündeki hava durumu sorusu için:

```mermaid
sequenceDiagram
    participant B as Backend (agent)
    participant F as Frontend (ekran)
    B->>F: run başladı
    B->>F: text message başlıyor
    B->>F: "Let me check the weather..."
    B->>F: text message bitti
    B->>F: tool call başlıyor: get_weather
    B->>F: tool call argümanları: {"city": "Istanbul"}
    B->>F: tool call bitti
    B->>F: tool call sonucu: 34°C
    B->>F: text message: "It is 34°C in Istanbul."
    B->>F: run bitti
```

Event türleri hemen her agent'ta aynıdır:

- işin başlaması ya da bitmesi
- cevabın bir parçası
- agent'ın düşünmesi
- kullanılan bir tool ve sonucu
- yardımcı bir agent'ın (bir **subagent**) başlaması ya da bitmesi
- işin o anki durumu

## Her Agent Kendi Formatını Konuşur

Sorun şu. Event türleri her yerde birbirine benzer, ama her agent ürünü onları kendi formatında, kendi adlarıyla yazar. Bu yüzden ekran, belirli bir agent için yazılmak zorunda. Şirket sonradan başka bir agent'a geçerse, ekranın tıpatıp aynı görünmesi gerekse bile, ekran baştan yazılmalı.

Mühendisler iki parça arasındaki bu tür bir bağdan kaçınmak için çok uğraşır. [Code Agents](coding_agents_tr.md) modülündeki evrensel şarj fişini hatırla: MCP, tek bir tool'un her agent'la çalışmasını sağlıyor. Aynı fikir agent ile ekran arasında kullanılınca ortaya AG-UI çıkıyor.

## AG-UI

**AG-UI**, **Agent–User Interaction Protocol**'ün kısaltmasıdır. **Protocol**, iki sistemin nasıl konuşacağını belirleyen, üzerinde anlaşılmış kurallar bütünüdür. AG-UI, açık ve ortak bir event listesidir. AG-UI konuşan bir agent bu event'leri gönderebilir, AG-UI için yazılmış bir ekran da onları gösterebilir. Böylece şirket, ekranın arkasındaki agent'ı istediği zaman değiştirebilir.

Event'lerden bazıları, adlarıyla:

- `RunStarted` ve `RunFinished`: iş başlıyor ve bitiyor.
- `TextMessageContent`: cevabın bir parçası.
- `ToolCallStart` ve `ToolCallResult`: bir tool kullanılıyor ve ne döndürdü.
- `SubagentStarted`: yardımcı bir agent başlıyor.

Merak edersen, hava durumu işi AG-UI event'leri olarak şöyle görünür, her satır bir event. Wire üzerinde her ad büyük harflerle yazılır; yani `RunStarted`, `RUN_STARTED` olur. Atlaman sorun değil:

```json
{"type": "RUN_STARTED", "threadId": "t1", "runId": "r1"}
{"type": "TEXT_MESSAGE_START", "messageId": "m1", "role": "assistant"}
{"type": "TEXT_MESSAGE_CONTENT", "messageId": "m1", "delta": "Let me check the weather..."}
{"type": "TEXT_MESSAGE_END", "messageId": "m1"}
{"type": "TOOL_CALL_START", "toolCallId": "c1", "toolCallName": "get_weather"}
{"type": "TOOL_CALL_ARGS", "toolCallId": "c1", "delta": "{\"city\": \"Istanbul\"}"}
{"type": "TOOL_CALL_END", "toolCallId": "c1"}
{"type": "TOOL_CALL_RESULT", "messageId": "m2", "toolCallId": "c1", "content": "34°C"}
{"type": "TEXT_MESSAGE_START", "messageId": "m3", "role": "assistant"}
{"type": "TEXT_MESSAGE_CONTENT", "messageId": "m3", "delta": "It is 34°C in Istanbul."}
{"type": "TEXT_MESSAGE_END", "messageId": "m3"}
{"type": "RUN_FINISHED", "threadId": "t1", "runId": "r1"}
```

### Kim Destekliyor

Liste ortak olduğu için birçok agent ürünü onu konuşuyor. LangChain ve CrewAI partner. Microsoft'un ve Google'ın agent kitleri onu doğrudan destekliyor. Claude Agent SDK ve OpenAI Agents SDK ise community projeleri üzerinden destekliyor. CopilotKit ekibi onu partnerleriyle birlikte geliştiriyor.

## Agent Protocol Stack

AG-UI, ortak üç protocol'den biridir ve her biri agent'ı farklı bir tarafa bağlar.

![Agent protocol stack: MCP, A2A ve AG-UI](../images/ag-ui-mcp.webp)  
*Agent ortada duruyor. MCP ve A2A sola uzanır: tool'lara ve diğer agent'lara. AG-UI ise sağa uzanır: uygulamayı kullanan insanlara.*

| Protocol | Agent'ı neye bağlar |
| --- | --- |
| **MCP** | tool'lara ve veriye |
| **A2A** | diğer agent'lara |
| **AG-UI** | uygulamayı kullanan insanlara |

Birlikte çalışırlar. Gerçek bir ürün çoğu zaman üçünü birden kullanır. Karıştırma: MCP ile [Code Agents](coding_agents_tr.md) modülünde, A2A ile [Multi-Agent Systems](../1_fundamentals/multi_agent_tr.md) modülünde tanıştın; AG-UI ise üçüncüsü, insanlara bakan.

## Human in the Loop

Bir agent'ı izlemek faydalıdır. O harekete geçmeden önce "evet" ya da "hayır" diyebilmek ise daha da faydalıdır. Buna **human in the loop** denir: işin döngüsünde sen de kalırsın.

Senin için bir e-posta yazan yeni bir asistan düşün. İyi bir asistan onu hemen göndermez. Sana gösterir; sen onaylarsın, değiştirirsin ya da hayır dersin. Sonra devam eder. Bir agent de aynı şekilde çalışabilir. Rutin adımları kendi başına yapar. Bir e-posta göndermek, bir kaydı değiştirmek ya da bir şey için ödeme yapmak gibi önemli bir adımda ise durur ve seni bekler.

Bu, en çok bir adımın gerçek sonuçları olduğunda önemlidir. Adımı çalışmadan önce görürsen onu durdurabilir ya da düzeltebilirsin. Erken yakalanan bir hata daha az maliyetlidir. Ekranın adımları göstermesinin sebebi de budur.

Ekranda bu şöyle işler. Agent durur. Ekran, agent'ın ne yapmak istediğini gösterir; yanında onaylamak, reddetmek ya da bir seçeneği seçmek için düğmeler vardır. Cevabın agent'a geri gider ve agent oradan devam eder. AG-UI bunu yapmanın standart bir yolunu tanımlıyor; böylece her ekran en azından mesajın metnini gösterebilir.

![Cevabın İçin Duran Bir Yapay Zekâ](../images/human-in-the-loop.webp)  
*Yapay zekâ bir toplantı için saatler önerir ve durur. Sen birini seçtikten sonra randevuyu oluşturur. İkinci denemede kişi "None of these work" seçiyor ve yapay zekâ randevuyu oluşturamadığını söylüyor.*

## Streaming'in Ötesi

Streaming ve human in the loop temeldir. Expert seviyesi daha fazlasını anlatacak:

- Agent çalışırken onu yönlendirebilirsin.
- Ekran ve agent aynı bilgiyi paylaşabilir.
- Agent ekranın bazı kısımlarını kendisi tasarlayabilir (**generative UI**).

## Artık Bildiğin Terimler

- **Agentic UI**: bir insanın ve çalışan bir agent'ın aynı uygulamayı birlikte kullandığı ekran.
- **Streaming**: agent'ın işini gerçekleştikçe, parça parça göstermek.
- **Event**: az önce ne olduğunu söyleyen küçük bir mesaj, örneğin "tool call başladı".
- **Backend** ve **frontend**: agent'ın tarafı ve ekranın tarafı.
- **Protocol**: iki sistemin nasıl konuşacağını belirleyen, üzerinde anlaşılmış kurallar.
- **AG-UI**: agent ile ekran arasındaki ortak protocol.
- **MCP** ve **A2A**: agent ile tool'ları arasındaki ve agent'lar arasındaki ortak protocol'ler.
- **Human in the loop**: agent önemli bir adımda durur ve bir insanın onaylamasını, değiştirmesini ya da seçmesini bekler.

## Özet

Agentic UI, sen ve çalışan bir agent'ın aynı uygulamayı paylaştığı ekrandır. Temeli streaming: agent işi adım adım yaptığı için ekran da onu adım adım gösterir, tıpkı bir yemek uygulamasının siparişinin her aşamasını göstermesi gibi. Her agent ürünü kendi formatını kullandı ve bu, ekranı tek bir agent'a bağladı. AG-UI, evrensel bir fiş gibi ortak bir format; böylece her ekran her agent'la çalışabiliyor. MCP (tool'lar) ve A2A'in (diğer agent'lar) yanında, agent'ı onu kullanan insanlara bağlıyor. Bir adım önemliyse agent önce durup sana soruyor: human in the loop budur.

**Hızlı Kontrol**: Bir agentic UI agent'ın işini neden adım adım gösterir? AG-UI hangi sorunu çözer? Bir agent neden bazen durup seni bekler?

## Kaynaklar

### 📄 Makaleler

- [What Is Agentic UI?](https://www.copilotkit.ai/learning/what-is-agentic-ui): bu modülün kullandığı tanım
- [AG-UI Overview](https://docs.ag-ui.com/introduction): protocol'ün ne olduğu ve onu kimin desteklediği
- [Interrupts](https://docs.ag-ui.com/concepts/interrupts): AG-UI bir agent'ı bir insanın cevabı için nasıl durduruyor

### 🛠️ Araçlar

- [CopilotKit Interactive Dojo](https://dojo.ag-ui.com/): tarayıcıda deneyebileceğin, agentic UI'ın canlı demoları
