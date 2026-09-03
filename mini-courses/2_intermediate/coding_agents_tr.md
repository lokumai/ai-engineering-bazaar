# Coding Agent'lar: Genişletme

[Context Engineering](context_engineering_tr.md) şu noktada bitiyordu: hâlihazırda kullandığın coding agent'lar zaten deep agent. Plan yapıyorlar, subagent'lara devrediyorlar, dosya okuyup yazıyorlar. Bu modül o agent'ların kendisiyle ilgili. Neden "kod yazan bir şey" olmanın çok ötesinde faydalı çıktıklarıyla başlıyoruz, sonra da birini genişletmenin sekiz yolunu tek tek geçiyoruz.

## Bir coding agent neden koddan fazlasını yapabiliyor

Elinde bir PNG var ve sıkıştırılmasını, ya da JPEG'e çevrilmesini istiyorsun. Agent olmadan birinin bunun için bir tool yazıp modele vermesi gerekir.

Bir coding agent'ın tool'a ihtiyacı yok. Bir Python imaging library'si kurup dönüşümü yapan dört satırı yazabilir. Sunum isteğinde aynı şeyi yapıyor: bir pptx library'si buluyor, kuruyor, kodu yazıyor, dosyayı sana veriyor. Bu işlerin hiçbiri onun tool listesinde yoktu.

Üzerinde durmaya değer kısım şu. Bu agent'lar sadece var olanı *kullanmıyor*, olmayanı *inşa ediyor*. Dolaşan bir hikâye vardı: yazıcısı için Linux driver'ı olmayan biri, bir coding agent'a driver yazdırmış. Detayları anlatıldıkça değişmiş olsa bile şekli gerçek: kod yazıp çalıştırabilen bir model, bir bilgisayarın ulaşabildiği hemen her şeye ulaşabilir.

![Code is the universal interface](./images/code-is-universal.png)  
*Üst sıra eski yöntem: her alan için bir agent, her birine kendi tool'ları yazılmış. Alt sıra coding agent'ların neden öne geçtiği. Kod web'e, takvime, bankaya ve havayoluna erişiyor; yani kod yazan bir agent dört ayrı tool seti yazılmadan dördünü de kapsıyor.*

Yani coding sadece birçok beceriden biri değil. Diğerlerinin yerine geçebilen beceri, ve bir coding agent'ın yazılımla ilgisi olmayan işlerde de yardımcı olmasının sebebi bu. Yukarıdaki örneklere bir daha bak: her biri coding dışı bir işti.

Modülün kalanı standart donanım. Hemen her modern coding agent'ta bunlar var: Claude Code, Codex, Antigravity, Copilot, OpenCode. İsimler ve dosya yolları aralarında biraz değişiyor; buradaki somut örnekler Claude Code'un ve hepsi [Claude Code features](https://code.claude.com/docs/en/agent-sdk/claude-code-features) sayfasında bir arada.

## AGENTS.md, agent'lar için bir README

README insanlar için. AGENTS.md agent'lar için.

Repo'nun içinde duran düz bir markdown dosyası, ve agent'ın mevcut system prompt'unun sonuna, vendor'ın yazdığının ardına ekleniyor. Mekanizma bundan ibaret, ve arkasındaki açık format [agents.md](https://agents.md/): "AI coding agent'ların projende çalışmasına yardım edecek context ve talimatlar için ayrılmış, öngörülebilir bir yer".

İçine girecek olan şey, bütün repo boyunca doğru kalan ve pek değişmeyen şeyler: build ve test komutları, dizinlerin nasıl düzenlendiği, ekibinin uyduğu kurallar, ve agent'ın yoksa iki kez yanlış yapacağı kurallar. Girmemesi gereken şey ise bir hafta içinde eskiyen her şey. Koda artık uymayan detaylarla dolu bir dosya, dosyanın hiç olmamasından kötüdür, çünkü agent ona inanıyor.

Elle yazmak zorunda değilsin. `/init` çalıştır, agent codebase'i okuyup bir taslak çıkarıyor, sen de düzeltiyorsun.

İki pratik not. Birincisi, Claude Code `AGENTS.md` yerine `CLAUDE.md` okuyor. Yani repo'nda başka tool'lar için bir AGENTS.md varsa, dokümante edilmiş hamle onu `@AGENTS.md` ile import eden bir `CLAUDE.md` yazmak, sonra Claude'a özel şeyleri de altına eklemek.

İkincisi, iki format da **iç içe** dosyaları destekliyor. Kökte bir tane, `frontend/` veya `backend/` içinde bir tane daha tutabiliyorsun, ve içteki olan sadece agent o dizinde çalışırken yükleniyor. Frontend kurallarını bir backend işinden uzak tutmak, kendi talimatlarına uygulanmış context engineering.

## Slash command'lar, yani kaydedilmiş prompt'lar

Slash command, bir kez yazıp `/isim` yazarak tekrar çalıştırabildiğin bir prompt. Claude Code'da `.claude/commands/` içinde duruyorlar.

Yerini hak eden üç tanesi: `/commit` commit mesajını ekibinin yazdığı gibi yazıyor, `/review` review checklist'ini mevcut diff'e uyguluyor, `/changelog` merge edilmiş pull request'leri release notlarına çeviriyor. Üçü de yoksa her hafta yeniden yazacağın prompt'lar.

Bilinmesi gereken bir şey var, çünkü aşağıdaki tabloyu değiştiriyor: **custom command'lar skill'lerin içine alındı.** `.claude/commands/deploy.md` dosyası da `.claude/skills/deploy/SKILL.md` skill'i de sana `/deploy` veriyor ve aynı şekilde davranıyor. Mevcut `commands/` dosyaların çalışmaya devam ediyor. İkisi arasındaki eski fark artık bir frontmatter alanı, ve ona skill'ler bölümünde geliyoruz.

## MCP, bir tool bir kez yazılsın diye

MCP'nin çözdüğü problem şu.

LangChain agent'ın Jira'nla çalışsın diye tool'lar yazıyorsun: Jira API'sini saran tool'lar, biri issue açmak, biri arama, biri yorum için. Şimdi aynı şeyi Claude Code'da, ya da Codex'te, ya da bir smolagents script'inde istiyorsun. Her biri tool tanımlarını kendi şeklinde bekliyor, yani Jira tool'larını yeniden yazıyorsun. Ve bir daha.

**Model Context Protocol** bunu dört iş yerine bir iş yapıyor. Tool'lar tek bir standart şekilde tanımlanıyor ve protokolü konuşan her agent onları kullanabiliyor.

![Before and after MCP](./images/mcp-unified-before-after.png)  
*Solda her servis, konuştuğu model için yazılmış kendi entegrasyonuna ihtiyaç duyuyor; yani iş, model sayısıyla birlikte çoğalıyor. Sağda servislerin API'leri hiç değişmedi. Değişen şey, modelin zaten konuştuğu tek bir arayüz üzerinden erişiliyor olmaları; yani servis her agent için bir kez değil, toplamda bir kez entegre ediliyor.*

Bundan elde ettiklerin:

- **Vendor lock-in yok.** Agent değiştirmek tool'larını yeniden yazmak anlamına gelmiyor.
- **Tool setleri taşınabilir hâle geliyor.** Bir kez yaz, her yerde kullan.
- **İhtiyacın olanı bir başkası çoktan yazmış.** İnsanları şaşırtan kısım bu.

MCP'yi ünlü yapan da son madde. MCP, client ve server ayrımı kullanıyor: tool'lar bir **MCP server**'da duruyor, agent da o server'ın client'ı. Yani bir MCP server bir tool paketi, ve birini eklemek koddan çok konfigürasyon. Agent'ını Jira MCP server'ına yönlendir, artık Jira'nı kullanabiliyor.

Claude Code'da bu tek bir komut, [Connect to MCP servers](https://code.claude.com/docs/en/mcp-quickstart) sayfasında dokümante edilmiş:

```bash
# hosted bir server, HTTP üzerinden
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# lokal olan, makinende bir process olarak çalışan
claude mcp add playwright -- npx -y @playwright/mcp@latest
```

Sonra `claude mcp list` gerçekten bağlanıp bağlanmadığını söylüyor. `--scope project` eklersen server, takım arkadaşlarının repo'yu klonladığında aldığı bir `.mcp.json`'a yazılıyor.

Var olanlar için topluluk listesi: [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers).

> **NOT:** bağlı her server context window'un bir kısmını harcıyor, çünkü tool isimleri ve açıklamaları her session'a yükleniyor. Hiç çağırmadığın on server bile sana maliyet. [Context Engineering](context_engineering_tr.md)'deki sebeplerle, kullanmadıklarını kaldır.

## Subagent'lar, senin tanımladığın bir rolle

[Context Engineering](context_engineering_tr.md) subagent'ların neden var olduğunu anlatmıştı: pahalı iş için temiz bir context window, böylece ana window bütün araştırma yerine bir sonuç kazanıyor.

Genişletme noktası, kendi subagent'larını tanımlayabilmen. Her agent genel amaçlı bir tane ile geliyor, yanına da bir security analyst, bir frontend uzmanı, bir test yazarı koyabiliyorsun; her biri kendi system prompt'u ve kendi tool listesiyle. Claude Code'da bunlar `.claude/agents/` içindeki markdown dosyaları.

Custom bir subagent sabit bir rol. Talimatları bir kez yazıyorsun ve o subagent her çağrıldığında temiz bir window'da o talimatlardan başlıyor. Başkasının yazdığından başlamak istersen [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) yüzden fazlasını topluyor.

## Skill'ler, agent'ın ihtiyaç duyduğunda aldığı

Skill, bir iş gerektirdiğinde agent'ın gidip okuyabildiği bir talimat klasörü. Anthropic'in [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) yazısı şöyle tanımlıyor: "agent'ların belirli işlerde daha iyi olmak için keşfedip dinamik olarak yükleyebildiği, düzenlenmiş talimat, script ve kaynak klasörleri". Claude Code'da: `.claude/skills/<isim>/SKILL.md`.

Önemli olan mekanizma, ve akılda tutulmaya değer bir adı var: **progressive disclosure**.

Agent açılışta kurulu her skill'in sadece `name` ve `description`'ını yüklüyor. Bu her biri için bir iki satır, yani yirmi skill neredeyse hiçbir şeye mal olmuyor. Tam talimatlar ancak agent önündeki işe bir skill'in uyduğuna karar ettiğinde okunuyor.

![Skills and the context window](./images/skill-and-context-window.png)  
*Üstteki gri bant, kullanılmayan yirmi skill'in bütün maliyeti: her biri için kısa bir satır. PDF işi geldiğinde agent `SKILL.md`'yi sıradan bir Bash çağrısıyla okuyor, sonra içindeki bir referansı takip edip ikinci bir dosyaya gidiyor. Skill'in context'e bir tool result olarak girdiğine dikkat et; yani bu yeni bir mekanizma değil. Tool Calling'in loop'u, data yerine talimat okumak için kullanılıyor.*

Yani tek bir kocaman system prompt yerine skill'lerin var olma sebebi context engineering. Agent'ın ihtiyaç duyabileceği her şey erişilebilir, ve sadece gerçekten ihtiyaç duyduğu şey window'da.

**Skill'lere karşı custom subagent'lar.** Bir subagent'ın talimatları sabit ve izole bir window'da çalışıyor: gidiyor ve bir cevapla dönüyor. Skill ise ana agent'ı değiştiriyor. Security skill'ini okumak, işin kalanı için *bu* agent'ı bir security reviewer yapıyor; aynı window'da, zaten bildiği her şeyle birlikte. Maske değiştiren aynı agent, ve bir dakika sonra yine değiştirebilir.

**Skill'lere karşı slash command'lar.** Birleşmeden sonra ayakta kalan fark bu, ve konu şeyi kimin çağırabildiği. Varsayılan olarak hem sen hem agent çağırabiliyor. İki frontmatter alanı bunu daraltıyor:

```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
---
```

`disable-model-invocation: true`, sadece senin çalıştırabileceğin anlamına geliyor, ve yan etkisi olan her şey için istediğin de bu. Kod ona hazır göründüğü için agent'ın deploy etmeye karar vermesini istemiyorsun. Tersi olan alan `user-invocable: false`, ve o da skill'e sadece agent'ın erişebileceği anlamına geliyor. Bu da arka plan bilgisine uygun, yani bir insanın yazacağı bir komut olarak hiç anlam taşımayacak türden şeylere.

Açık koleksiyonlar için [anthropics/skills](https://github.com/anthropics/skills) resmî olanı, [awesome-claude](https://github.com/webfuse-com/awesome-claude) ise daha geniş bir derleme.

## Hook'lar, her zaman olması gerekenler için

Yukarıdaki her şey bir modele verilen tavsiye, yani çoğu zaman uyuluyor. Hook tavsiye değil. Agent'ın yaşam döngüsündeki sabit bir noktaya bağlanmış bir shell komutu, ve model istesin istemesin çalışıyor.

[Hooks reference](https://code.claude.com/docs/en/hooks) otuzdan fazla event listeliyor. İnsanların gerçekten kullandıkları:

- **`PreToolUse`**, bir tool çağrısı çalışmadan önce. Kimsenin dokunmaması gereken bir dosyadaki edit'i engelle, ya da main'e push edecek bir komutu reddet.
- **`PostToolUse`**, bir tool çağrısı başarılı olduktan sonra. Agent'ın az önce düzenlediği her dosyada formatter'ı çalıştır, böylece stil agent'ın hatırlamasına bağlı olmaktan çıksın.
- **`Stop`**, agent turunu bitirdiğinde. Test suite'ini çalıştır ve kırmızı bir şey varsa devam etmesini söyle.
- **`SessionStart`**, bir session başladığında. Mevcut branch'i ve açık ticket'ları context'e yazdır.

Akılda tutulacak nokta ilki: agent'a bir dosyaya asla dokunmamasını söyleyen bir AGENTS.md talimatı bir ricadır. Yazmayı engelleyen bir `PreToolUse` hook'u ise bir kuraldır. Bu, sonraki modülün başlangıcı ve var olma sebebi.

## Plugin'ler, hepsini paketleyen

Plugin, yukarıdakilerin bir paketi: command'lar, skill'ler, subagent'lar, hook'lar, MCP server'ları, birlikte gelip tek adımda kuruluyor. Yeni bir takım arkadaşından altı dosyayı `.claude/` dizinine kopyalamasını istemek yerine ona tek bir plugin veriyorsun.

Düzen vendor'dan vendor'a değişiyor. Claude Code için plugin, bir manifest'i olan bir dizin, ve manifest o plugin'in hangi parçaları sağladığını söylüyor. [Discover plugins](https://code.claude.com/docs/en/discover-plugins) kurmayı, [plugins reference](https://code.claude.com/docs/en/plugins-reference) ise yapmayı anlatıyor. [claude-plugins-official](https://github.com/anthropics/claude-plugins-official) ise Anthropic'in yönettiği dizin.

## Auto memory, agent'ın kendi yazdığı

Her session boş bir context window'la başlıyor. O boşluğun üzerinden bilgi taşıyan iki şey var ve aynı şey değiller.

**AGENTS.md senin yazdığın.** **Auto memory agent'ın yazdığı.** [How Claude remembers your project](https://code.claude.com/docs/en/memory) sayfasından:

| | CLAUDE.md dosyaları | Auto memory |
| --- | --- | --- |
| Kim yazıyor | Sen | Claude |
| Ne içeriyor | Talimatlar ve kurallar | Öğrenilenler ve desenler |
| Kapsam | Proje, kullanıcı veya organizasyon | Repo başına, worktree'ler arasında paylaşılan |
| Nereye yükleniyor | Her session | Her session (ilk 200 satır veya 25KB) |
| Ne için | Coding standartları, workflow'lar, proje mimarisi | Tercihlerin, Claude'a verdiğin düzeltmeler, koddan çıkaramayacağı proje context'i |

Agent bu notları, ona verdiğin düzeltmelere dayanarak yazıyor. Yani bu hafta iki kez açıklamak zorunda kaldığın şey önümüzdeki pazartesi hâlâ orada. Dosyalar `~/.claude/projects/<project>/memory/` içinde duruyor. Her session bir `MEMORY.md` index'i yükleniyor, ayrıntılı notlar da onun yanında duruyor ve ancak ihtiyaç olduğunda okunuyor; bu da progressive disclosure'ın bir kez daha, bu sefer agent'ın kendi notlarına uygulanmış hâli.

Bilerek yapmaya değen bir şey, ona bir şeyi hatırlamasını söylemek. "API testlerinin lokal bir Redis'e ihtiyacı olduğunu hatırla" dersen yazılıyor. `/memory` kaydettiği her şeyi gösteriyor, ve hepsi düzenleyip silebileceğin düz markdown.

## Plan mode, geri alamayacağın işler için

Elinde büyük bir refactor, ya da aynı anda inecek birkaç feature var. Kod yazmaya başlamak yanlış ilk hamle, [Context Engineering](context_engineering_tr.md)'in verdiği sebeple: planı yazmamış bir agent haritayı kaybediyor.

Plan mode tam olarak bunun için salt okunur bir mod. Agent codebase'i geziyor ve tek satırını değiştiremiyor, yani ilk aşamanın tamamı gerçekte ne olduğunu anlamak. Sonra bir plan yazıyor, sen okuyorsun, ve ancak onayladıktan sonra düzenlemeye başlıyor.

Claude Code'un versiyonu bir adım daha gidiyor. Herhangi bir plan yapmadan önce sana açıklayıcı sorular soruyor, ve birkaç yaklaşım sunup birini seçmene izin verebiliyor. Gerçekten faydalı kısım da bu, çünkü kötü bir planı yakalamanın vakti hiç kod yokken.

Bu aynı zamanda long-horizon işe geri bağlanıyor. Senin onayladığın yazılı bir plandan çalışan bir agent saatlerce tutarlı kalıyor, ve sebebi planın diskte durup hedefi sürekli context'e geri okuması. Aynı hedef bir context window'da bırakılsaydı sessizce çürüyüp giderdi.

## Effort, yani düşünme kadranı

[Prompt Engineering](prompt_engineering_tr.md)'de chain of thought, modele cevaplamadan önce düşündürmekle ilgiliydi. `/effort` ne kadar düşüneceğinin kadranı.

Kabaca:

- **medium**: soru cevaplama, dokümantasyon, küçük düzeltmeler, basit edit'ler.
- **high**: normal iş. Yaptığın şeylerin çoğu bu.
- **xhigh**: ağır coding: gerçek bir refactor, ince bir bug, bir tasarım kararı.
- **max**: bir şey gerçekten zor olduğunda ve alt seviyeler başarısız olduğunda.

Yüksek bedava değil. Her turda token ve zaman harcıyor, yani bir yazım hatasını düzeltmek için sonuna kadar açmak paranı çöpe atmak. Ne kadar kazandırdığını görmek istersen [Artificial Analysis](https://artificialanalysis.ai/) model başına ve reasoning ayarı başına benchmark sonuçları yayınlıyor; bir ayarla sonraki arasındaki fark oradaki sayılarda.

## Bunların hepsinin ne olduğuna dikkat et

Sekiz bölüme geri bak. AGENTS.md, slash command'lar, subagent'lar, skill'ler, hook'lar, plugin'ler, memory, planlar.

Neredeyse hepsi **bir klasördeki markdown**. Veritabanı değil, karşısında derleme yaptığın bir plugin API'si değil, birinin uydurduğu bir config formatı değil. Herhangi bir editörde açabildiğin, diff'leyebildiğin, pull request'te review edebildiğin ve başka bir makineye kopyalayabildiğin dosyalar.

Bu tembellik değil. İki tarafın da iyi idare ettiği tek format. Sen onu araç gerektirmeden okuyup düzenleyebiliyorsun, modeller de markdown'da ve bir filesystem'de dolaşmakta alışılmadık ölçüde iyi, çünkü eğitildikleri şeyin çok büyük bir kısmı bu. Yani bir coding agent'ın genişletme mekanizması, onun zaten en iyi olduğu şey çıktı.

![One agent, three extension points](./images/mcp-skill-subagent.png)  
*Üç farklı problem, ve hangisinin hangisi olduğunu adlandırmaya değer. Soldaki skill'ler agent'ın davranışını değiştirmek için okuduğu talimatlar. Sağdaki MCP server'ları, yoksa erişemeyeceği sistemlere ulaşmasını sağlayan tool'lar. Alttaki subagent'lar ise fazladan context window'ları. Buradaki her şey ya bilinecek bir şey, ya yapılacak bir şey, ya da düşünülecek bir yer.*

## Bu serinin neresindeyiz

```mermaid
graph LR
    A[Prompt Engineering] --> B[Context Engineering]
    B --> C[Coding Agents]
    C --> D[Harness Engineering]
    D --> E[Loop Engineering]
    E --> F[Security]
    F --> G[Personal Agents]
    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#FFFF00
```

## Özet

Bir coding agent adının ima ettiğinden çok daha güçlü, çünkü kod yazıp çalıştırmak hemen her şeye ulaşmanın bir yolu. Bir library kurabiliyor ya da yazabiliyorsa her iş için bir tool'a ihtiyacı yok, ve coding olmayan işlerde de yardımcı olmasının sebebi bu.

Birini sekiz standart yolla genişletiyorsun. Üçü agent'ın ne bildiğiyle ilgili: AGENTS.md ona repo'nun kurallarını veriyor, auto memory senin hakkında öğrendiğini sonraki session'a taşıyor, ve skill'ler talimatları ancak bir iş gerçekten gerektirdiğinde almasını sağlıyor. O son madde progressive disclosure, ve yirmi skill'in karşılanabilir olmasının sebebi.

Üçü ne yapabildiğiyle ilgili. Slash command'lar yoksa yeniden yazacağın bir prompt'u kaydediyor. MCP bütün bir tool setini taşınabilir yapıyor, yani tool agent başına bir kez değil toplamda bir kez yazılıyor. Custom subagent'lar da iş devredeceği sabit roller veriyor, her biri temiz bir context window'da.

Son ikisi kontrolle ilgili. Hook'lar mekanik kısım, yani model seçmese de olan şeyler, plan mode da herhangi bir şeyi düzenlemesine izin verilmeden önce kodu anlamasını sağlıyor. Plugin'ler yukarıdakilerin herhangi birini tek bir kuruluma paketliyor, effort da bütün bunları yaparken ne kadar zorlayacağını ayarlıyor.

Neredeyse tamamı bir klasördeki markdown, ki bu da senin ve modelin iyi idare ettiği format.

Sırada: bu modülde modelin oy hakkı olmayan ilk şey hook'lardı. O fikrin bir adı ve bir modülü var.

**Hızlı Kontrol**: bir skill de custom bir subagent da agent'a bir uzmanlık kazandırıyor. Aradaki gerçek fark nedir, ve hangisi ne zaman uygun?

## Kaynaklar

- [Claude Code features](https://code.claude.com/docs/en/agent-sdk/claude-code-features): bütün genişletme yüzeyi tek sayfada, kendi agent'ının neyi desteklediğini kontrol etmek için liste gibi
- [agents.md](https://agents.md/): açık format, monorepo'da iç içe dosyaların nasıl çalıştığı dahil
- [How Claude remembers your project](https://code.claude.com/docs/en/memory): CLAUDE.md ve auto memory ayrımı, ve dosyaların nerede durduğu
- [Connect to MCP servers](https://code.claude.com/docs/en/mcp-quickstart): bir server'ı baştan sona eklemek, ve bağlanmadığında neye bakılacağı
- [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers): topluluk listesi, tool'unun zaten var olup olmadığını kontrol etmek için
- [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills): progressive disclosure'ın doğru anlatıldığı yer
- [Extend Claude with skills](https://code.claude.com/docs/en/skills): pratik versiyon, bir skill'i kimin çağırabileceğine karar veren iki alan dahil
- [anthropics/skills](https://github.com/anthropics/skills): resmî skill koleksiyonu
- [awesome-claude](https://github.com/webfuse-com/awesome-claude): Claude araçlarının daha geniş bir derlemesi
- [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents): başlangıç için yüzden fazla subagent tanımı
- [Hooks reference](https://code.claude.com/docs/en/hooks): her yaşam döngüsü event'i, ve her birinin aldığı input
- [Discover plugins](https://code.claude.com/docs/en/discover-plugins) ve [plugins reference](https://code.claude.com/docs/en/plugins-reference): önce kurmak, sonra yapmak
- [claude-plugins-official](https://github.com/anthropics/claude-plugins-official): yönetilen plugin dizini
- [Artificial Analysis](https://artificialanalysis.ai/): model ve reasoning ayarı başına benchmark sayıları, effort'un ne kazandırdığını görmek istersen
