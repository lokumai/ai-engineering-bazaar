# Code Agent'lar

[Context Engineering](context_engineering_tr.md) modülü tek bir noktayla bitmişti: zaten kullandığın code agent'lar birer deep agent'tır. Plan yaparlar, işin bir kısmını subagent'lara devrederler ve dosyaları okuyup yazarlar. Bu modül ise tam da bu agent'ların kendisini konu alıyor. Önce, neden sadece "kod yazan bir araç" olmaktan çok daha faydalı olduklarını anlatacağız. Ardından bir agent'ı genişletmenin sekiz yolunu ele alacağız.

## Bir Code Agent Neden Koddan Fazlasını Yapabilir

Diyelim ki elinde bir PNG dosyası var ve onu sıkıştırmak ya da JPEG'e çevirmek istiyorsun. Agent olmadan bu iş için birinin bir tool yazıp modele vermesi gerekir.

Code agent'ın ise bir tool'a ihtiyacı yoktur; Python'un bir görüntü kütüphanesini (imaging library) kurabilir ve dönüşümü yapan dört satırlık kodu kendisi yazabilir. Ondan bir slayt sunumu istediğinde de bir pptx kütüphanesi bulup kurar, kodu yazar ve dosyayı sana verir. İki işin de tool listesinde olmadığına dikkat et.

Bu kısmı bir an durup düşün: bu agent'lar yalnızca var olanı *kullanmakla* kalmaz, olmayanı da *üretebilir*. İnsanların paylaştığı hikâyelerden birinde, bir kişinin yazıcısı için Linux sürücüsü (driver) yoktu. Bu yüzden ona bir code agent'tan sürücüyü yazmasını istediler. Hikâye anlatıldıkça ayrıntılar değişmiş olabilir, ama genel fikir doğrudur: kod yazıp çalıştırabilen bir model, bilgisayarın yapabildiği neredeyse her şeye ulaşmanın bir yolunu bulur.

![Kod evrensel arayüzdür](./images/code-is-universal.png)  
*Üst sıra eski yöntemdir: her alan için ayrı bir agent vardır ve her agent'ın kendine özel tool'lara ihtiyacı vardır. Alt sıra ise code agent'ların neden bu yerini aldığını gösterir. Kod web'e, takvime, bankaya ve havayolu şirketine ulaşabilir. Yani kod yazan bir agent dördünü de kapsar ve kimsenin dört ayrı tool seti yazmasına gerek kalmaz.*

Yani kodlama, birçok beceriden yalnızca biri değildir; diğer becerilerin yerini alabilen temel beceri odur. Bu yüzden bir code agent, yazılımla ilgisi olmayan işlerde de işe yarar. Yukarıdaki örneklerin hepsi, kod yazmakla ilgisi olmayan işlerdi.

Bu modülün geri kalanı, standart donanımı anlatıyor. Güncel code agent'ların neredeyse hepsinde bu özellikler bulunur: Claude Code, Codex, Antigravity, Copilot ve OpenCode. Adlar ve dosya yolları her birinde biraz farklı olsa da buradaki somut örnekler Claude Code'dan geliyor. [Claude Code features](https://code.claude.com/docs/en/agent-sdk/claude-code-features) sayfası, bu özelliklerin hepsini tek bir yerde topluyor.

## AGENTS.md

README insanlar içindir. AGENTS.md ise agent'lar içindir.

AGENTS.md, repository'nin içinde duran sade bir markdown dosyasıdır. Code agent, bu dosyayı üreticinin yazdığı mevcut sistem prompt'una, onun arkasından ekler; mekanizma bu kadar basit. Bunun arkasındaki açık format [agents.md](https://agents.md/)'dir. Bu sayfa dosyayı, AI code agent'ların projen üzerinde çalışmasına yardım etmek için bağlam ve talimat verebileceğin, ayrılmış ve öngörülebilir bir yer olarak tanımlar.

Dosyaya, tüm repository için geçerli kalan ve pek değişmeyen bilgiler girer:

- build ve test komutları
- dizinlerin nasıl düzenlendiği
- ekibinin uyduğu kurallar ve gelenekler
- bir agent'ın aksi halde iki kez yanlış yapacağı kurallar

Dosyaya girmemesi gerekenler ise bir haftada eskiyecek şeylerdir. Kodla artık uyuşmayan ayrıntılarla dolu bir dosya, hiç dosya olmamasından daha kötüdür; çünkü agent, dosyada yazanlara inanır.

Dosyayı elle yazmak zorunda değilsin. `/init` komutunu çalıştırırsan agent kod tabanını okur ve ilk taslağı yazar; sonra sen onu düzeltirsin.

Burada iki pratik not var. Birincisi, Claude Code `AGENTS.md` değil, `CLAUDE.md` dosyasını okur. Repository'nde başka araçlar için hazırlanmış bir AGENTS.md zaten olabilir. Bu durumda belgelenmiş çözüm, `@AGENTS.md` ile onu içe aktaran bir `CLAUDE.md` yazmaktır. Claude'a özel her şeyi de bu satırın altına eklersin.

İkincisi, iki format da **iç içe** dosyaları destekler. Kök dizinde bir dosya, `frontend/` ya da `backend/` içinde başka bir dosya tutabilirsin. İç içe dosya yalnızca agent o dizinde çalışırken yüklenir. Frontend kurallarını bir backend işinden uzak tutmak, kendi talimatlarına uygulanmış context engineering'dir.

## Slash Command'lar

Slash command, bir kez yazdığın ve `/name` yazarak yeniden çalıştırabildiğin bir prompt'tur. Claude Code'da slash command'lar `.claude/commands/` klasöründe durur.

Sahip olmaya değer üç tanesi şunlar:

- `/commit` commit mesajını ekibinin yazdığı biçimde yazar.
- `/review`, mevcut diff üzerinde review kontrol listeni çalıştırır.
- `/changelog`, merge edilmiş pull request'leri sürüm notlarına (release notes) çevirir.

Bunlar olmasa, üç prompt'un hepsini her hafta baştan yazman gerekirdi.

Burada bilmen gereken bir şey var, çünkü aşağıdaki anlatımı değiştiriyor: **custom command'lar artık skill'lerle birleşti.** `.claude/commands/deploy.md` dosyası sana `/deploy` komutunu verir. `.claude/skills/deploy/SKILL.md` konumundaki bir skill de `/deploy` komutunu verir ve ikisi aynı şekilde davranır. Mevcut `commands/` dosyaların çalışmaya devam eder. İkisi arasındaki eski fark ise artık bir frontmatter alanıyla belirleniyor ve bunu aşağıdaki skill bölümünde açıklıyoruz.

## Model Context Protocol (MCP)

MCP'nin çözdüğü problemi bir örnekle görelim.

Diyelim ki LangChain agent'ının Jira ile çalışabilmesi için ona tool'lar yazdın. Bu tool'lar Jira API'sini sarmalıyor: biri issue oluşturuyor, biri arama yapıyor, biri de yoruma ekliyor. Şimdi aynısını Claude Code'da, Codex'te ya da bir smolagents script'inde istediğinde, her birinin tool tanımlarını kendi biçiminde beklediğini görürsün. Yani Jira tool'larını baştan yazmak zorunda kalırsın, sonra bir kez daha ve bir kez daha.

**Model Context Protocol**, bu işi dört ayrı iş olmaktan çıkarıp tek bir işe indirir: tool'ları tek bir standart yolla tanımlarsın ve protokolü konuşan her agent bu tool'ları kullanabilir.

![MCP öncesi ve sonrası](./images/mcp-unified-before-after.png)  
*Solda her servisin, onunla konuşan modele göre yazılmış ayrı bir entegrasyona ihtiyacı var. Bu yüzden iş, model sayısıyla birlikte çoğalır. Sağda ise her servisin API'si hiç değişmiyor. Değişen, modelin onlara nasıl ulaştığı: modelin zaten konuştuğu tek bir arayüz üzerinden. Bu yüzden her servisi her agent için değil, yalnızca bir kez entegre edersin.*

Bunun sana kazandırdıkları:

- **Satıcıya bağlı kalmazsın.** Agent değiştirdiğinde tool'larını yeniden yazmak zorunda kalmazsın.
- **Tool setleri taşınabilir hale gelir.** Bir tool'u bir kez yazarsın ve MCP'yi destekleyen her agent onu kullanabilir.
- **İhtiyacın olanı başka biri zaten yazmıştır.** İnsanları şaşırtan kısım tam olarak bu.

MCP'yi asıl öne çıkaran da bu son noktadır. MCP işi bir client ile bir server arasında böler: tool'lar bir **MCP server**'ın içinde durur, agent ise ona bağlanan bir client'tır. Yani bir MCP server, tool'lardan oluşan bir pakettir. Bir tane eklemek için kod değil, yapılandırma değiştirirsin; agent'ını Jira MCP server'ına yönlendirdiğinde artık Jira'yla çalışabilir.

Claude Code'da bu, tek bir komutla yapılır. [Connect to MCP servers](https://code.claude.com/docs/en/mcp-quickstart) sayfası bunu şöyle belgeliyor:

```bash
# a hosted server, reached over HTTP
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# a local one, run as a process on your machine
claude mcp add playwright -- npx -y @playwright/mcp@latest
```

Sonra `claude mcp list` komutu, server'ın gerçekten bağlanıp bağlanmadığını sana söyler. `--scope project` eklersen Claude Code server'ı bir `.mcp.json` dosyasına yazar; repository'yi klonlayan ekip arkadaşların da bu dosyayı alır.

Hangi server'ların zaten var olduğuna bakmak için topluluk listesi olan [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) sayfasına göz at.

> **NOT:** Bağlı her server, context window'un bir kısmını kullanır. Tool adları ve açıklamaları her oturuma yüklenir; hiç çağırmadığın on server bile sana maliyet çıkarır. Kullanmadıklarını, [Context Engineering](context_engineering_tr.md) modülünde verilen nedenlerle kaldır.

## Subagent'lar

[Context Engineering](context_engineering_tr.md) modülü subagent'ların neden var olduğunu anlatmıştı. Subagent, maliyetli bir işe taze bir context window verir. Böylece ana pencere, tüm araştırmanın yerine yalnızca sonucunu alır.

Genişletme noktası ise kendi subagent'larını tanımlayabilmendir. Her agent genel amaçlı bir subagent ile gelir ve onun yanına bir güvenlik analisti, bir frontend uzmanı ya da bir test yazarı ekleyebilirsin. Her birinin kendi sistem prompt'u ve kendi tool listesi vardır; Claude Code'da bunlar `.claude/agents/` klasöründeki markdown dosyalarıdır.

Custom subagent sabit bir roldür: talimatlarını bir kez yazarsın ve agent o subagent'ı her çağırdığında, subagent bu talimatlarla temiz bir pencereden başlar. Başkalarının subagent'larından başlamayı tercih edersen, [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) yüzü aşkın hazır tanım içeren bir koleksiyondur.

## Skill'ler

Skill, talimatlardan oluşan bir klasördür ve bir iş ona ihtiyaç duyduğunda agent onu okuyabilir. Anthropic'in [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) başlıklı yazısı skill'leri şöyle tanımlar: agent'ların belirli görevlerde daha iyi performans göstermek için keşfedip dinamik olarak yükleyebileceği, talimatlardan, script'lerden ve kaynaklardan oluşan düzenli klasörler. Claude Code'da bir skill `.claude/skills/<name>/SKILL.md` konumunda durur.

Asıl önemli olan ise mekanizmadır; hatırlaman gereken bir adı var: **kademeli açılım (progressive disclosure)**.

Başlangıçta agent, kurulu her skill'in yalnızca `name` ve `description` alanını yükler. Bu her skill için bir ya da iki satır eder, yani yirmi skill bile neredeyse hiç yer kaplamaz. Agent tam talimatları ancak bir skill'in üzerinde çalıştığı göreve uyduğuna karar verdiğinde okur.

![Skill'ler ve context window](./images/skill-and-context-window.png)  
*Üstteki gri şerit, kullanılmadıkları sürece yirmi skill'in tam maliyetini gösterir: her biri için tek kısa bir satır. PDF görevi geldiğinde agent `SKILL.md` dosyasını sıradan bir Bash çağrısıyla okur. Sonra bu dosyanın içindeki bir referansı izleyerek ikinci bir dosyaya geçer. Dikkat et, skill context'e bir tool sonucu olarak girer. Yani bu yeni bir mekanizma değil. Veri yerine talimat okumak için kullanılan, LLM Tool Calling modülündeki tool döngüsüdür.*

Peki neden tek ve çok büyük bir sistem prompt'u yerine skill'ler var? Nedeni context engineering'dir: agent'ın ihtiyaç duyabileceği her şey erişilebilir durumdadır, ama pencerede yalnızca gerçekten ihtiyaç duyduğu şey bulunur.

**Skill'ler ile custom subagent'lar.** Bir subagent'ın talimatları sabittir ve yalıtılmış bir pencerede çalışır; işini bitirip bir cevapla geri döner. Skill ise ana agent'ı değiştirir. *Bu* agent güvenlik skill'ini okuduğunda, görevin geri kalanı boyunca bir güvenlik gözden geçiricisine dönüşür; aynı pencerede kalır ve zaten bildiği her şeyi korur. Bu, aynı agent'ın farklı bir maske takmış hali gibidir ve isterse bir dakika sonra maskesini yeniden değiştirebilir.

**Skill'ler ile slash command'lar.** Birleşmeden sonra da varlığını koruyan fark, skill'i kimin çağırabileceğiyle ilgilidir. Varsayılan olarak hem sen hem agent onu çağırabilirsin. Bunu sınırlayan iki frontmatter alanı var:

```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
---
```

`disable-model-invocation: true`, skill'i yalnızca senin çalıştırabileceğin anlamına gelir ve yan etkisi olan her şey için bunu istersin. Kod hazır göründü diye agent'ın kendi kararıyla deploy etmesini istemezsin. Tersi olan alan `user-invocable: false`'tur; skill'e yalnızca agent'ın erişebileceğini söyler. Bu alan, bir kişinin yazacağı bir komut olarak hiç anlam taşımayacak türden arka plan bilgisi için uygundur.

Herkese açık skill koleksiyonları için resmî olanı [anthropics/skills](https://github.com/anthropics/skills)'tir. [awesome-claude](https://github.com/webfuse-com/awesome-claude) ise daha geniş, derlenmiş bir listedir.

## Hook'lar

Yukarıdaki her şey modele verilen bir tavsiyedir, yani model çoğu zaman bunlara uyar. Hook ise tavsiye değildir: agent'ın yaşam döngüsündeki sabit bir noktaya bağlı bir shell komutudur ve model isteyip istemese de çalışır.

[hooks reference](https://code.claude.com/docs/en/hooks) otuzdan fazla olay listeler. Pratikte insanların kullandığı olaylar şunlar:

- **`PreToolUse`**: bir tool çağrısı çalışmadan önce. Kimsenin dokunmaması gereken bir dosyaya yapılan düzenlemeyi engelleyebilirsin ya da main'e push edecek bir komutu reddedebilirsin.
- **`PostToolUse`**: bir tool çağrısı başarıyla bittikten sonra. Agent'ın az önce düzenlediği her dosyada formatter'ı çalıştırabilirsin. Böylece stil, agent'ın hatırlayıp hatırlamadığına hiç bağlı kalmaz.
- **`Stop`**: agent turunu bitirdiğinde. Test paketini çalıştırabilir ve bir test kırmızıysa agent'a devam etmesini söyleyebilirsin.
- **`SessionStart`**: bir oturum başladığında. Mevcut branch'i ve açık ticket'ları context'e yazdırabilirsin.

İlkini aklında tut, çünkü ana fikri o taşıyor. AGENTS.md içinde agent'tan bir dosyaya hiç dokunmamasını isteyen bir talimat bir istektir; yazmayı engelleyen bir `PreToolUse` hook'u ise bir kuraldır. Bu fikir bir sonraki modülde açılıyor ve o modülün var olma sebebi de tam olarak budur.

## Plugin'ler

Plugin, yukarıdaki şeylerden oluşan bir pakettir: command'lar, skill'ler, subagent'lar, hook'lar ve MCP server'lar. Hepsi birlikte gelir ve tek adımda kurulur. Yeni bir ekip arkadaşının `.claude/` klasörüne altı dosya kopyalaması gerekmez; ona tek bir plugin vermek yeter.

Yapı her üreticiye göre farklıdır; Claude Code'da plugin, bir manifest dosyası olan bir klasördür ve manifest, plugin'in bu parçalardan hangilerini sağladığını söyler. [Discover plugins](https://code.claude.com/docs/en/discover-plugins) plugin'lerin nasıl kurulacağını, [plugins reference](https://code.claude.com/docs/en/plugins-reference) ise nasıl oluşturulacağını anlatır. [claude-plugins-official](https://github.com/anthropics/claude-plugins-official) ise Anthropic'in yönettiği dizindir.

## MEMORY.md

Her oturum boş bir context window ile başlar. Bilgiyi bir oturumdan diğerine taşıyan iki şey vardır ve bu ikisi aynı şey değildir.

**AGENTS.md, senin yazdığın şeydir.** Auto memory ise agent'ın yazdığı şeydir. Aşağıdaki tablo [How Claude remembers your project](https://code.claude.com/docs/en/memory) sayfasından alınmıştır:

| | CLAUDE.md files | Auto memory |
| --- | --- | --- |
| Kim yazar | Sen | Claude |
| Ne içerir | Talimatlar ve kurallar | Öğrenilenler ve kalıplar |
| Kapsam | Proje, kullanıcı veya organizasyon | Repository başına, worktree'ler arasında paylaşılır |
| Nereye yüklenir | Her oturumda | Her oturumda (ilk 200 satır veya 25KB) |
| Ne için kullanılır | Kodlama standartları, iş akışları, proje mimarisi | Tercihlerin, Claude'a verdiğin düzeltmeler ve kodundan çıkarılamayan proje bağlamı |

Agent bu notları, sana verdiğin düzeltmelerden yazar. Böylece bu hafta iki kez anlatmak zorunda kaldığın şey, gelecek pazartesi de hâlâ orada olur. Dosyalar `~/.claude/projects/<project>/memory/` klasöründe durur. Agent her oturumda bir `MEMORY.md` dizinini yükler; ayrıntılı notlar ise bunun yanında durur ve agent bunları yalnızca ihtiyaç duyduğunda okur. Bu, kademeli açılımın agent'ın kendi notlarına uygulanmış hali.

İsteyerek yapabileceğin faydalı bir şey, agent'a bir şeyi hatırlamasını söylemektir. "API test'lerinin yerel bir Redis'e ihtiyacı olduğunu hatırla" dersen agent bunu yazıp kaydeder. `/memory` komutu agent'ın kaydettiği her şeyi sana gösterir ve hepsi düzenleyebileceğin ya da silebileceğin sade markdown dosyalarıdır.

## Plan Mode

Diyelim ki büyük bir refactor'ın var ya da aynı anda teslim etmen gereken birkaç özellik var. Hemen kod yazmaya başlamak yanlış bir ilk adımdır. [Context Engineering](context_engineering_tr.md) bunun sebebini vermişti: planı yazıya dökmeyen agent haritayı kaybeder.

Plan mode, bu durum için salt okunur bir moddur. Agent kod tabanını inceler ama tek bir satırını bile değiştiremez. Bu yüzden ilk aşamanın tamamı, gerçekte neyin olduğunu anlamakla geçer. Sonra agent bir plan yazar, sen de onu okursun ve agent ancak sen planı onayladıktan sonra düzenlemeye başlar.

Claude Code'un sürümü bir adım daha ileri gider: herhangi bir plan yapmadan önce sana açıklayıcı sorular sorar ve birkaç yaklaşım sunup birini seçmene izin verebilir. Bu kısım gerçekten faydalı, çünkü kötü bir planı yakalamanın doğru zamanı, henüz hiç kod yokken.

Bu durum uzun soluklu (long-horizon) işlere de bağlanır: onayladığın yazılı bir plandan çalışan bir agent saatlerce tutarlı kalır. Sebebi, planın diskte durması ve agent'ın oradan hedefi sürekli context'e geri okumasıdır. Aynı hedef bunun yerine bir context window'da kalsaydı, sessizce kaybolup giderdi.

## Reasoning Effort

[Prompt Engineering](prompt_engineering_tr.md) modülünde chain of thought (düşünce zinciri), modelin cevap vermeden önce akıl yürütmesini sağlamakla ilgiliydi. `/effort` ise modelin ne kadar akıl yürüteceğini ayarlayan düğmedir.

Kabaca bir rehber şöyle:

- **medium**: soru cevaplama, dokümantasyon, küçük düzeltmeler ve basit düzenlemeler için.
- **high**: normal iş için. Yaptığın işlerin çoğu bu kapsamdadır.
- **xhigh**: ağır kodlama için. Gerçek bir refactor, ince bir bug ya da bir tasarım kararı bu gruba girer.
- **max**: iş gerçekten zorsa ve daha düşük ayarlar yetmediyse.

Daha yüksek bir ayar bedava değildir, çünkü her turda token ve zaman harcar. Bu yüzden bir yazım hatasını düzeltmek için ayarı sonuna kadar açarsan parayı boşa harcamış olursun. Daha yüksek bir ayarın sana gerçekte ne kazandırdığını görmek istersen [Artificial Analysis](https://artificialanalysis.ai/) sitesine bak; orada her model için farklı akıl yürütme ayarlarında yayımlanan benchmark sonuçları var ve sayılar, bir ayar ile bir sonraki arasındaki farkı gösteriyor.

## Bunların Hepsinin Ne Olduğuna Dikkat Et

Sekiz bölüme bir daha bak: AGENTS.md, slash command'lar, subagent'lar, skill'ler, hook'lar, plugin'ler, memory ve planlar.

Neredeyse hepsi bir klasörde duran **markdown dosyasıdır**. Veritabanı değildirler, üzerine derleme yaptığın bir plugin API'si de değildirler ve birinin icat ettiği bir yapılandırma formatı da değildirler. Diskte duran dosyalardır ve sen bunları şöyle yapabilirsin:

- istediğin editörde açabilirsin
- diff alabilirsin
- pull request'te review edebilirsin
- başka bir makineye kopyalayabilirsin

Bu tembellik değildir; hem senin hem de modelin iyi kullandığı tek format budur. Bu dosyaları özel bir tool'a ihtiyaç duymadan okuyup düzenleyebilirsin. Modeller markdown'da ve dosya sisteminde gezinmede olağanüstü iyidir, çünkü eğitim verilerinin çok büyük bir kısmı tam olarak bu. Sonuçta, bir code agent'ı genişletme mekanizması, agent'ın zaten en iyi olduğu şeydir.

![Bir agent, üç genişletme noktası](./images/mcp-skill-subagent.png)  
*Bunlar üç ayrı sorun olduğu için hangisinin hangisi olduğunu adlandırmak işe yarar. Solda duran skill'ler, agent'ın davranışını değiştirmek için okuduğu talimatlardır. Sağdaki MCP server'lar, agent'ın başka türlü ulaşamayacağı sistemlere erişmesini sağlayan tool'lardır. Aşağıdaki subagent'lar ise ekstra context window'lardır. Yani her genişletme agent'a üç şeyden birini verir: bilmesi gereken bir şey (skill), yapabileceği bir şey (MCP server) ya da düşünmek için ayrı bir yer (subagent).*

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

Bir code agent, adından çok daha güçlüdür; çünkü kod yazıp çalıştırmak neredeyse her şeye ulaşmanın bir yoludur. Her iş için ayrı bir tool'a ihtiyaç duymaz, çünkü bir kütüphaneyi kurabilir ya da yazabilir. İşte bu yüzden kodlamayla hiç ilgisi olmayan işlerde de yardımcı olur.

Bir code agent'ı sekiz standart yolla genişletebilirsin ve bunlardan üçü agent'ın neyi bildiğiyle ilgilidir. AGENTS.md ona repository'nin kurallarını verir, auto memory hakkında öğrendiklerini bir sonraki oturuma taşır. Skill'ler ise talimatları yalnızca bir görev gerçekten ihtiyaç duyduğunda yüklemesine izin verir; bu sonuncusu kademeli açılımdır ve yirmi skill bulundurabilmenin sebebi de budur.

Üçü de agent'ın ne yapabileceğiyle ilgilidir: slash command'lar aksi halde yeniden yazacağın bir prompt'u saklar, MCP tüm bir tool setini taşınabilir hale getirir ve böylece tool'u her agent için ayrı ayrı değil, bir kez yazarsın. Custom subagent'lar ise ona, her biri temiz bir context window'da çalışan ve kendilerine iş devredilebilen sabit roller verir.

Son ikisi kontrolle ilgilidir. Hook'lar, model onları seçse de seçmese de gerçekleşen mekanik kısımdır. Plan mode, agent'ın kodun tek bir satırını bile düzenlemeden önce kodu anlamasını sağlar. Plugin'ler yukarıdakilerin herhangi birini tek bir kurulumda toplar, effort ise agent tüm bunları yaparken ne kadar derin düşüneceğini belirler.

Neredeyse tamamı klasörde duran markdown'dır; hem sen hem modelin iyi kullandığı format da budur.

Sırada: bu modülde modelin söz hakkı olmadığı ilk şey hook'lardı. Bu fikre harness engineering deniyor ve bir sonraki modülün konusu da bu.

**Hızlı Kontrol**: bir skill ile bir custom subagent, ikisi de agent'a bir uzmanlık alanı kazandırır. Aralarındaki gerçek fark nedir ve her biri ne zaman uygundur?

## Kaynaklar

- [Claude Code features](https://code.claude.com/docs/en/agent-sdk/claude-code-features): tüm genişletme yüzeyi tek sayfada. Kendi agent'ının neleri desteklediğini kontrol etmek için bir liste olarak işe yarar.
- [agents.md](https://agents.md/): açık format. Monorepo'da iç içe dosyaların nasıl çalıştığı da bu sayfada.
- [How Claude remembers your project](https://code.claude.com/docs/en/memory): CLAUDE.md ile auto memory arasındaki ayrım ve dosyaların nerede durduğu.
- [Connect to MCP servers](https://code.claude.com/docs/en/mcp-quickstart): bir server'ı baştan sona nasıl ekleyeceğin ve bağlanmadığında nelere bakman gerektiği.
- [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers): topluluk listesi. İhtiyacın olan tool'un zaten var olup olmadığını kontrol etmek için.
- [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills): kademeli açılımın doğru şekilde anlatıldığı yer.
- [Extend Claude with skills](https://code.claude.com/docs/en/skills): pratik sürüm. Bir skill'i kimin çağırabileceğini belirleyen iki alan da burada.
- [anthropics/skills](https://github.com/anthropics/skills): resmî skill koleksiyonu.
- [awesome-claude](https://github.com/webfuse-com/awesome-claude): Claude araçlarının daha geniş, derlenmiş bir listesi.
- [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents): başlamak için yüzü aşkın subagent tanımı.
- [Hooks reference](https://code.claude.com/docs/en/hooks): her yaşam döngüsü olayı ve her birinin aldığı girdi.
- [Discover plugins](https://code.claude.com/docs/en/discover-plugins) ve [plugins reference](https://code.claude.com/docs/en/plugins-reference): önce bir plugin'in nasıl kurulacağı, sonra nasıl oluşturulacağı.
- [claude-plugins-official](https://github.com/anthropics/claude-plugins-official): Anthropic'in yönettiği plugin dizini.
- [Artificial Analysis](https://artificialanalysis.ai/): her model ve her akıl yürütme ayarı için benchmark sayıları. Effort'un sana ne kazandırdığını görmek istersen.
