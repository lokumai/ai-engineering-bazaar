# Code Agent'lar

[Context Engineering](context_engineering_tr.md) şu noktada bitiyordu: şu an kullandığın coding agent'lar zaten deep agent. Plan yapıyorlar, subagent'lara iş devrediyorlar, dosya okuyup yazıyorlar. Bu modül o agent'ların kendisiyle ilgili. Önce neden "kod yazan bir şey" olmanın çok ötesinde faydalı çıktıklarına bakıyoruz. Sonra da birini genişletmenin sekiz yolunu tek tek geçiyoruz.

## Bir Coding Agent Neden Koddan Fazlasını Yapabiliyor

Elinde bir PNG dosyası var ve onu sıkıştırmak ya da JPEG'e çevirmek istiyorsun. Agent olmadan birinin bunun için bir tool yazıp modele vermesi gerekir.

Bir coding agent'ın tool'a ihtiyacı yok. Bir Python imaging library'si kurup dönüşümü yapan dört satır kodu yazabilir. Ondan bir sunum iste, aynı şeyi yapar. Bir pptx library'si bulup kuruyor. Kodu yazıyor. Sonra dosyayı sana veriyor. Bu işlerin hiçbiri onun tool listesinde yoktu.

Burada biraz durup düşün. Bu agent'lar sadece var olanı *kullanmıyor*. Olmayanı da *inşa ediyor*. Dolaşan bir hikâye vardı: yazıcısı için Linux driver'ı olmayan biri, bir coding agent'a driver yazdırmış. Detaylar anlatıldıkça değişmiş olabilir, ama ana fikir doğru: kod yazıp çalıştırabilen bir model, bir bilgisayarın ulaşabildiği hemen her şeye ulaşabilir.

![Code is the universal interface](./images/code-is-universal.png)  
*Üst sıra eski yöntem: her alan için bir agent, her birine kendi tool'ları yazılmış. Alt sıra coding agent'ların neden öne geçtiği. Kod web'e, takvime, bankaya ve havayoluna erişebiliyor. Yani kod yazan bir agent dördünü de kapsıyor ve kimsenin dört ayrı tool seti yazması gerekmiyor.*

Yani coding sadece birçok beceriden biri değil. Diğerlerinin yerine geçebilen beceri bu. Bir coding agent'ın yazılımla ilgisi olmayan işlerde de yardımcı olmasının sebebi de bu. Yukarıdaki örneklere bir daha bak: her biri coding dışı bir işti.

Modülün kalanı standart donanım. Hemen her modern coding agent'ta bunlar var: Claude Code, Codex, Antigravity, Copilot ve OpenCode. İsimler ve dosya yolları aralarında biraz değişiyor. Buradaki somut örnekler Claude Code'dan ve hepsi [Claude Code features](https://code.claude.com/docs/en/agent-sdk/claude-code-features) sayfasında bir arada.

## AGENTS.md

README insanlar için. AGENTS.md agent'lar için.

AGENTS.md, repo'nun içinde duran düz bir markdown dosyası. Coding agent onu mevcut system prompt'unun sonuna, vendor'ın yazdığı system prompt'un ardına ekliyor. Mekanizma bundan ibaret. Arkasındaki açık format [agents.md](https://agents.md/) ve dosyayı şöyle tanımlıyor: "AI coding agent'ların projende çalışmasına yardım edecek context ve talimatlar için ayrılmış, öngörülebilir bir yer".

İçine girecek olan şey, bütün repo boyunca doğru kalan ve pek değişmeyen bilgiler:

- build ve test komutları
- dizinlerin nasıl düzenlendiği
- ekibinin uyduğu convention'lar
- agent'ın yoksa iki kez yanlış yapacağı kurallar

Girmemesi gereken şey ise bir hafta içinde eskiyen her şey. Koda artık uymayan detaylarla dolu bir dosya, hiç dosya olmamasından kötüdür. Agent dosyada yazana inanıyor.

Elle yazmak zorunda değilsin. `/init` çalıştırırsan agent codebase'i okuyup ilk taslağı yazıyor. Sonra sen onu düzeltiyorsun.

İki pratik not var. Birincisi, Claude Code `AGENTS.md` yerine `CLAUDE.md` okuyor. Repo'nda başka tool'lar için zaten bir AGENTS.md olabilir. Bu durumda dokümanda önerilen yol, onu `@AGENTS.md` ile import eden bir `CLAUDE.md` yazmak. Sonra Claude'a özel şeyleri onun altına ekliyorsun.

İkincisi, iki format da **iç içe** dosyaları destekliyor. Kökte bir tane, `frontend/` veya `backend/` içinde bir tane daha tutabiliyorsun. İçteki dosya sadece agent o dizinde çalışırken yükleniyor. Frontend kurallarını bir backend işinden uzak tutmak, kendi talimatlarına uygulanmış context engineering.

## Slash Command'lar

Slash command, bir kez yazdığın bir prompt. `/isim` yazarak onu tekrar çalıştırabiliyorsun. Claude Code'da slash command'lar `.claude/commands/` içinde duruyor.

İşe yarayan üç tanesi:

- `/commit`, commit mesajını ekibinin yazdığı gibi yazıyor.
- `/review`, review checklist'ini mevcut diff'e uyguluyor.
- `/changelog`, merge edilmiş pull request'leri release notlarına çeviriyor.

Bunlar olmasa, üç prompt'u da her hafta yeniden yazarsın.

Bilinmesi gereken bir şey var, çünkü aşağıdaki tabloyu değiştiriyor: **custom command'lar skill'lerin içine alındı.** `.claude/commands/deploy.md` dosyası sana `/deploy` veriyor. `.claude/skills/deploy/SKILL.md` skill'i de sana `/deploy` veriyor, ve ikisi aynı şekilde davranıyor. Mevcut `commands/` dosyaların çalışmaya devam ediyor. İkisi arasındaki eski fark artık bir frontmatter alanı. Onu skill'ler bölümünde anlatıyoruz.

## Model Context Protocol (MCP)

MCP'nin çözdüğü problem şu.

LangChain agent'ın Jira'nla çalışabilsin diye tool'lar yazıyorsun. Bu tool'lar Jira API'sini sarıyor: biri issue açıyor, biri arama yapıyor, biri yorum ekliyor. Şimdi aynı şeyi Claude Code'da, ya da Codex'te, ya da bir smolagents script'inde istiyorsun. Her biri tool tanımlarını kendi şeklinde bekliyor. Yani Jira tool'larını yeniden yazıyorsun. Ve bir daha.

**Model Context Protocol** bunu dört iş yerine tek iş yapıyor. Tool'lar tek bir standart şekilde tanımlanıyor. Protokolü konuşan her agent da onları kullanabiliyor.

![Before and after MCP](./images/mcp-unified-before-after.png)  
*Solda her servis, konuştuğu model için yazılmış kendi entegrasyonuna ihtiyaç duyuyor. Yani iş, model sayısıyla birlikte çoğalıyor. Sağda servislerin API'leri hiç değişmedi. Değişen şey, modelin onlara nasıl eriştiği: modelin zaten konuştuğu tek bir arayüz üzerinden. Yani her servisi her agent için ayrı ayrı değil, bir kez entegre ediyorsun.*

Bundan elde ettiklerin:

- **Vendor lock-in yok.** Agent değiştirdiğinde tool'larını yeniden yazman gerekmiyor.
- **Tool setleri taşınabilir hâle geliyor.** Bir kez yaz, her yerde kullan.
- **İhtiyacın olanı bir başkası çoktan yazmış.** İnsanları şaşırtan kısım bu.

MCP'yi ünlü yapan da son madde. MCP işi bir client ile bir server arasında bölüyor. Tool'lar bir **MCP server**'da duruyor, agent da o server'a bağlanan bir client. Yani bir MCP server bir tool paketi. Birini eklemek için kod değil, konfigürasyon değiştiriyorsun. Agent'ını Jira MCP server'ına yönlendir, artık Jira'nla çalışabiliyor.

Claude Code'da bu tek bir komut. [Connect to MCP servers](https://code.claude.com/docs/en/mcp-quickstart) sayfası bunu anlatıyor:

```bash
# hosted bir server, HTTP üzerinden
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# lokal olan, makinende bir process olarak çalışan
claude mcp add playwright -- npx -y @playwright/mcp@latest
```

Sonra `claude mcp list`, server'ın gerçekten bağlanıp bağlanmadığını söylüyor. `--scope project` eklersen Claude Code server'ı bir `.mcp.json` dosyasına yazıyor. Takım arkadaşların repo'yu klonladığında bu dosyayı alıyor.

Hangi server'ların zaten var olduğunu görmek için topluluk listesine bak: [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers).

> **NOT:** bağlı her server context window'un bir kısmını kullanıyor. Tool isimleri ve açıklamaları her session'a yükleniyor. Hiç çağırmadığın on server bile sana maliyet çıkarıyor. [Context Engineering](context_engineering_tr.md)'deki sebeplerle, kullanmadıklarını kaldır.

## Subagent'lar

[Context Engineering](context_engineering_tr.md) subagent'ların neden var olduğunu anlatmıştı. Subagent, pahalı bir işe temiz bir context window veriyor. Böylece ana window'a bütün araştırma yerine bir sonuç geliyor.

Genişletme noktası, kendi subagent'larını tanımlayabilmen. Her agent genel amaçlı bir subagent ile geliyor. Yanına bir security analyst, bir frontend uzmanı ve bir test yazarı ekleyebiliyorsun. Her birinin kendi system prompt'u ve kendi tool listesi var. Claude Code'da bunlar `.claude/agents/` içindeki markdown dosyaları.

Custom bir subagent sabit bir rol. Talimatlarını bir kez yazıyorsun. O subagent her çağrıldığında, temiz bir window'da bu talimatlardan başlıyor. Başkasının yazdığından başlamak istersen [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) yüzden fazlasını topluyor.

## Skill'ler

Skill bir talimat klasörü. Agent, bir iş gerektirdiğinde onu okuyabiliyor. Anthropic'in [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) yazısı şöyle tanımlıyor: "agent'ların belirli işlerde daha iyi olmak için keşfedip dinamik olarak yükleyebildiği, düzenlenmiş talimat, script ve kaynak klasörleri". Claude Code'da bir skill `.claude/skills/<isim>/SKILL.md` içinde duruyor.

Önemli olan mekanizma. Akılda tutman gereken bir adı da var: **progressive disclosure**.

Agent açılışta kurulu her skill'in sadece `name` ve `description`'ını yüklüyor. Bu her biri için bir iki satır, yani yirmi skill neredeyse hiçbir şeye mal olmuyor. Agent tam talimatları ancak bir skill'in üzerinde çalıştığı işe uyduğuna karar verdiğinde okuyor.

![Skills and the context window](./images/skill-and-context-window.png)  
*Üstteki gri bant, kullanılmayan yirmi skill'in bütün maliyeti: her biri için kısa bir satır. PDF işi geldiğinde agent `SKILL.md`'yi sıradan bir Bash çağrısıyla okuyor. Sonra içindeki bir referansı takip edip ikinci bir dosyaya gidiyor. Skill'in context'e bir tool result olarak girdiğine dikkat et. Yani bu yeni bir mekanizma değil. Tool Calling'in loop'u, data yerine talimat okumak için kullanılıyor.*

Peki neden tek bir kocaman system prompt yerine skill'ler var? Sebebi context engineering. Agent'ın ihtiyaç duyabileceği her şey erişilebilir. Sadece gerçekten ihtiyaç duyduğu şey window'da.

**Skill'lere karşı custom subagent'lar.** Bir subagent'ın talimatları sabit. Subagent izole bir window'da çalışıyor: gidiyor ve bir cevapla dönüyor. Skill ise ana agent'ı değiştiriyor. *Bu* agent security skill'ini okuduğunda, işin kalanı için bir security reviewer oluyor. Aynı window'da kalıyor ve zaten bildiği her şeyi koruyor. Maske değiştiren aynı agent bu, ve bir dakika sonra maskesini yine değiştirebilir.

**Skill'lere karşı slash command'lar.** Birleşmeden sonra ayakta kalan fark bu. Konu, skill'i kimin çağırabildiği. Varsayılan olarak hem sen hem agent çağırabiliyor. İki frontmatter alanı bunu sınırlıyor:

```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
---
```

`disable-model-invocation: true`, skill'i sadece senin çalıştırabileceğin anlamına geliyor. Yan etkisi olan her şey için istediğin de bu. Kod ona hazır göründüğü için agent'ın deploy etmeye karar vermesini istemiyorsun. Tersi olan alan `user-invocable: false`. Bu alan, skill'e sadece agent'ın erişebileceği anlamına geliyor. Arka plan bilgisine uygun: bir insanın komut olarak yazmasının hiç anlamı olmayacak türden şeylere.

Açık skill koleksiyonları için [anthropics/skills](https://github.com/anthropics/skills) resmî olanı. [awesome-claude](https://github.com/webfuse-com/awesome-claude) ise daha geniş bir derleme.

## Hook'lar

Yukarıdaki her şey bir modele verilen tavsiye. Yani model ona çoğu zaman uyuyor. Hook tavsiye değil. Hook, agent'ın yaşam döngüsündeki sabit bir noktaya bağlanmış bir shell komutu. Model istesin istemesin çalışıyor.

[Hooks reference](https://code.claude.com/docs/en/hooks) otuzdan fazla event listeliyor. Pratikte kullanılanlar şunlar:

- **`PreToolUse`**, bir tool çağrısı çalışmadan önce. Kimsenin dokunmaması gereken bir dosyadaki edit'i engelle, ya da main'e push edecek bir komutu reddet.
- **`PostToolUse`**, bir tool çağrısı başarılı olduktan sonra. Agent'ın az önce düzenlediği her dosyada formatter'ı çalıştır. Böylece stil, agent'ın hatırlamasına bağlı olmaktan çıkar.
- **`Stop`**, agent turunu bitirdiğinde. Test suite'ini çalıştır ve kırmızı bir şey varsa devam etmesini söyle.
- **`SessionStart`**, bir session başladığında. Mevcut branch'i ve açık ticket'ları context'e yazdır.

İlkini aklında tut, çünkü asıl noktayı o taşıyor. Agent'a bir dosyaya asla dokunmamasını söyleyen bir AGENTS.md talimatı bir ricadır. Yazmayı engelleyen bir `PreToolUse` hook'u ise bir kuraldır. Sonraki modül bu fikirle başlıyor, ve o modülün var olma sebebi de bu.

## Plugin'ler

Plugin, yukarıdakilerin bir paketi: command'lar, skill'ler, subagent'lar, hook'lar ve MCP server'ları. Hepsi birlikte geliyor ve tek adımda kuruluyor. Yeni bir takım arkadaşından altı dosyayı `.claude/` dizinine kopyalamasını istemiyorsun. Onun yerine ona tek bir plugin veriyorsun.

Düzen vendor'dan vendor'a değişiyor. Claude Code için plugin, manifest'i olan bir dizin. Manifest, plugin'in hangi parçaları sağladığını söylüyor. [Discover plugins](https://code.claude.com/docs/en/discover-plugins) kurmayı, [plugins reference](https://code.claude.com/docs/en/plugins-reference) ise yapmayı anlatıyor. [claude-plugins-official](https://github.com/anthropics/claude-plugins-official) da Anthropic'in yönettiği dizin.

## MEMORY.md

Her session boş bir context window'la başlıyor. Bilgiyi bir session'dan sonrakine taşıyan iki şey var, ve ikisi aynı şey değil.

**AGENTS.md senin yazdığın.** **Auto memory agent'ın yazdığı.** Aşağıdaki tablo [How Claude remembers your project](https://code.claude.com/docs/en/memory) sayfasından:

| | CLAUDE.md dosyaları | Auto memory |
| --- | --- | --- |
| Kim yazıyor | Sen | Claude |
| Ne içeriyor | Talimatlar ve kurallar | Öğrenilenler ve desenler |
| Kapsam | Proje, kullanıcı veya organizasyon | Repo başına, worktree'ler arasında paylaşılan |
| Nereye yükleniyor | Her session | Her session (ilk 200 satır veya 25KB) |
| Ne için | Coding standartları, workflow'lar, proje mimarisi | Tercihlerin, Claude'a verdiğin düzeltmeler, koddan çıkaramayacağı proje context'i |

Agent bu notları, ona verdiğin düzeltmelere dayanarak yazıyor. Yani bu hafta iki kez açıklamak zorunda kaldığın şey önümüzdeki pazartesi hâlâ orada. Dosyalar `~/.claude/projects/<project>/memory/` içinde duruyor. Agent her session'da bir `MEMORY.md` index'i yüklüyor. Ayrıntılı notlar onun yanında duruyor ve agent onları ancak ihtiyaç olduğunda okuyor. Bu yine progressive disclosure, bu sefer agent'ın kendi notlarına uygulanmış hâli.

Bilerek yapmaya değer bir şey var: agent'a bir şeyi hatırlamasını söylemek. "API testlerinin lokal bir Redis'e ihtiyacı olduğunu hatırla" dersen agent bunu not ediyor. `/memory`, agent'ın kaydettiği her şeyi gösteriyor. Hepsi düzenleyip silebileceğin düz markdown.

## Plan Mode

Elinde büyük bir refactor, ya da aynı anda teslim edilecek birkaç feature var. Kod yazmaya başlamak yanlış ilk adım. Sebebini [Context Engineering](context_engineering_tr.md) vermişti: planı yazmamış bir agent haritayı kaybediyor.

Plan mode, tam bu durum için salt okunur (read-only) bir mod. Agent codebase'i geziyor ama tek bir satırını bile değiştiremiyor. Yani ilk aşamanın tamamı, gerçekte ne olduğunu anlamakla geçiyor. Sonra bir plan yazıyor ve sen okuyorsun. Agent ancak sen onayladıktan sonra düzenlemeye başlıyor.

Claude Code'un versiyonu bir adım daha gidiyor. Herhangi bir plan yapmadan önce sana açıklayıcı sorular soruyor. Birkaç yaklaşım sunup birini seçmene de izin verebiliyor. Gerçekten faydalı kısım da bu, çünkü kötü bir planı yakalamanın doğru zamanı henüz hiç kod yokken.

Bu aynı zamanda long-horizon işe geri bağlanıyor. Senin onayladığın yazılı bir plandan çalışan bir agent saatlerce tutarlı kalıyor. Sebebi, planın diskte durması ve hedefi sürekli context'e geri okuması. Aynı hedef bir context window'da bırakılsaydı sessizce çürüyüp giderdi.

## Reasoning Effort

[Prompt Engineering](prompt_engineering_tr.md)'de chain of thought, modele cevaplamadan önce düşündürmekle ilgiliydi. `/effort`, ne kadar düşüneceğini ayarlayan kadran.

Kabaca şöyle:

- **medium**: soru cevaplama, dokümantasyon, küçük düzeltmeler, basit edit'ler.
- **high**: normal iş. Yaptığın şeylerin çoğu bu.
- **xhigh**: ağır coding: gerçek bir refactor, ince bir bug, bir tasarım kararı.
- **max**: bir şey gerçekten zor olduğunda ve alt seviyeler başarısız olduğunda.

Yüksek ayar bedava değil. Her turda token ve zaman harcıyor. Yani bir yazım hatasını düzeltmek için onu sonuna kadar açmak, paranı çöpe atmak demek. Ne kadar kazandırdığını görmek istersen [Artificial Analysis](https://artificialanalysis.ai/) sitesine bak. Model başına ve reasoning ayarı başına benchmark sonuçları yayınlıyor. Bir ayarla sonraki arasındaki fark, oradaki sayılarda görülüyor.

## Bunların Hepsinin Ne Olduğuna Dikkat Et

Sekiz bölüme geri bak: AGENTS.md, slash command'lar, subagent'lar, skill'ler, hook'lar, plugin'ler, memory ve planlar.

Neredeyse hepsi **bir klasördeki markdown**. Bir veritabanı değiller. Karşısında derleme yaptığın bir plugin API'si değiller. Birinin uydurduğu bir config formatı da değiller. Bunlar diskteki dosyalar, ve onları:

- herhangi bir editörde açabilirsin
- diff'leyebilirsin
- bir pull request'te review edebilirsin
- başka bir makineye kopyalayabilirsin

Bu tembellik değil. İki tarafın da iyi idare ettiği tek format. Sen onu özel bir araç olmadan okuyup düzenleyebiliyorsun. Modeller de markdown'da ve bir filesystem'de dolaşmakta alışılmadık ölçüde iyi, çünkü eğitildikleri verinin çok büyük bir kısmı tam olarak bu. Yani bir coding agent'ın genişletme mekanizması, onun zaten en iyi olduğu şey çıktı.

![One agent, three extension points](./images/mcp-skill-subagent.png)  
*Bunlar üç farklı problem, o yüzden hangisinin hangisi olduğunu adlandırmak işe yarar. Soldaki skill'ler agent'ın davranışını değiştirmek için okuduğu talimatlar. Sağdaki MCP server'ları, yoksa erişemeyeceği sistemlere ulaşmasını sağlayan tool'lar. Alttaki subagent'lar ise fazladan context window'ları. Buradaki her şey ya bilinecek bir şey, ya yapılacak bir şey, ya da düşünülecek bir yer.*

## Bu serinin neresindeyiz

```mermaid
graph LR
    A[Prompt Engineering] --> B[Context Engineering]
    B --> C[Code Agents]
    C --> D[Harness Engineering]
    D --> E[Loop Engineering]
    E --> F[Generative UI]
    F --> G[Security]
    G --> H[Personal Agents]
    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#FFFF00
```

## Özet

Bir coding agent adının ima ettiğinden çok daha güçlü, çünkü kod yazıp çalıştırmak hemen her şeye ulaşmanın bir yolu. Her iş için bir tool'a ihtiyacı yok, çünkü bir library kurabiliyor ya da yazabiliyor. Coding olmayan işlerde de yardımcı olmasının sebebi bu.

Birini sekiz standart yolla genişletiyorsun. Üçü agent'ın ne bildiğiyle ilgili. AGENTS.md ona repo'nun kurallarını veriyor. Auto memory, senin hakkında öğrendiğini sonraki session'a taşıyor. Skill'ler de talimatları ancak bir iş gerçekten gerektirdiğinde yüklemesini sağlıyor. O son madde progressive disclosure, ve yirmi skill'i karşılayabilmenin sebebi bu.

Üçü ne yapabildiğiyle ilgili. Slash command'lar, yoksa yeniden yazacağın bir prompt'u kaydediyor. MCP bütün bir tool setini taşınabilir yapıyor, yani tool agent başına bir kez değil, toplamda bir kez yazılıyor. Custom subagent'lar da iş devredeceği sabit roller veriyor, her biri temiz bir context window'da.

Son ikisi kontrolle ilgili. Hook'lar mekanik kısım: model seçmese de olan şeyler. Plan mode da agent'ın, bir şeyi düzenlemesine izin verilmeden önce kodu anlamasını sağlıyor. Plugin'ler yukarıdakilerin herhangi birini tek bir kuruluma paketliyor, effort da bütün bunları yaparken ne kadar yoğun düşüneceğini ayarlıyor.

Neredeyse tamamı bir klasördeki markdown. Bu da senin ve modelin iyi idare ettiği format.

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
