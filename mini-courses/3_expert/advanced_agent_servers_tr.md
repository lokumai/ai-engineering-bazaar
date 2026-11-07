# İleri Seviye Agent Server'lar

*(Bu bir placeholder modül: şimdilik kısa bir özet, tam ders içeriği yakında geliyor.)*

Bir agent server, uzun agent çalışmalarını ayakta tutar: işi kuyruğa alır, worker'lara dağıtır, bir worker çöktüğünde toparlar ve ilerlemeyi kullanıcıya akıtır. Bu modül, bir agent server kurmanın dört yolunu karşılaştırıyor: yalın bir Redis kuyruğundan serverless durable orchestration'a kadar.

**Bu modülde işlenecek konular**:
- Aegra: lease lock'lu, yerel bir Redis worker kuyruğu
- SkeinJS: Redis üzerinde BullMQ
- Serverless durable orchestration ile Vercel AI SDK (Inngest, Temporal)
- Redis Streams: append-only bir log, Kafka'nın hafif bir benzeri
- Aralarında seçim yapmak

## Aegra: Lease Lock'lu Bir Redis Worker Kuyruğu

**Nasıl çalışır?** Worker'lar işleri yerel bir Redis kuyruğundan alır ve her birini bir lease lock ile tutar. Bir worker hayatta olduğunu, Redis'teki lease'ini yenileyen bir heartbeat ile kanıtlar; ilerleme de frontend'e Redis pub/sub üzerinden ulaşır. Pipeline'lar basit ve bloklayıcıdır.

**Bedeli ne?** Heartbeat döngüsünü uygulama seviyesinde kendin yazarsın. Yapı kırılgandır: bir worker çöker ve ayrı bir sweeper betiği çalışmıyorsa, o worker'ın işleri kaybolur.

**Ne zaman seçmeli?** Birden fazla dilde yazılmış, işlerin doğrusal ilerlediği ve belleğin küçük kalması gereken hafif bir küme yönetiyorsan. Neredeyse hiç altyapı istemez, bellekte hiçbir şey biriktirmez (bir iş alındığı anda bellekten çıkar) ve her programlama dili onunla konuşabilir.

## SkeinJS: Redis Üzerinde BullMQ

**Nasıl çalışır?** BullMQ, birlikte çalışan birkaç Redis yapısından bir kuyruk kurar: sorted set'ler (ZSET) işleri zaman damgasına göre planlar, hash'ler her işin durumunu tutar, list'ler de aktif görevleri sıraya koyar. Çöken bir worker'ın işlerini stalled-job kontrolü kurtarır, ilerlemeyi de Redis pub/sub frontend'e akıtır.

**Bedeli ne?** Tek bir runtime'a bağlıdır: BullMQ bir Node.js kütüphanesidir. Bir iş başarıyla biter bitmez kaydını siler, dolayısıyla sonradan bakılacak bir geçmiş kalmaz. Ayrıca kümede çok sayıda key oluşturur.

**Ne zaman seçmeli?** Backend'in Node.js ya da TypeScript ise ve kuyruk mantığını kendin yazmadan zengin agent döngülerini hemen çıkarmak istiyorsan. Geliştirme hızlıdır: exponential backoff ile tekrar denemeler, cron işleri ve rate limit'ler hazır gelir, hazır yönetim panelleri de vardır.

## Serverless Durable Orchestration: Inngest ya da Temporal ile Vercel AI SDK

**Nasıl çalışır?** Bu yaklaşım hiçbir şeyin sürekli çalışmadığını varsayar. Bir agent çalışması uzun, açık bir döngü değil, küçük ve ayrı HTTP olaylarından oluşan bir zincirdir. İki olay arasında çalışma duraklatılabilir, bir veritabanına kaydedilebilir ve daha sonra dünyanın herhangi bir yerindeki başka bir makinede kaldığı yerden devam edebilir. Arka planda bunlar virtual actor'lar, yani durum makineleridir.

**Bedeli ne?** Seni bir sağlayıcının bulut API'lerine ya da kendin barındırdığın karmaşık bir runtime'a sıkıca bağlar. Uyanan bir fonksiyonun cold start gecikmesi vardır. Ayrıca canlı bir TCP ya da WebSocket bağlantısını açık tutamaz.

**Ne zaman seçmeli?** Vercel gibi tamamen serverless bir platforma deploy ediyorsan ve agent'ların saatler süren, yavaş ve paralel analizler yapıyorsa. Kurulacak sunucu ve boşta ödenecek bir maliyet yoktur, bir agent bir sunucu çökmesinden korkmadan saatlerce, hatta günlerce çalışabilir, birbirine bağımlı uzun tool çağrısı zincirleri de bu modele doğal olarak uyar.

## Redis Streams: Kafka'nın Hafif Bir Benzeri

**Nasıl çalışır?** Bir Redis stream, zamana göre indekslenmiş append-only bir log'dur. Bir consumer'ın aldığı ama henüz onaylamadığı mesajlar yerleşik bir pending entries list'te (PEL) kalır, böylece bir consumer öldüğünde hiçbir şey kaybolmaz.

**Bedeli ne?** Çok fazla düşük seviyeli, tekrar eden döngü kodu yazarsın. Bir işi geciktirmenin yerleşik bir yolu yoktur. Stream'in uzunluğuna bir sınır (`MAXLEN`) koymayı unutursan, Redis'in belleği tükenebilir.

**Ne zaman seçmeli?** Kurumsal ölçekte, olay güdümlü ve çok agent'lı bir ağ, gerçek zamanlı log pipeline'ları ya da kendine özgü bir dağıtık sistem kuruyorsan. Pending entries list, veritabanı seviyesinde hata toleransı sağlar; log, bir agent'ın attığı her adımın değiştirilemez bir kaydıdır ve birçok consumer aynı mesajları okuyabilir.

## Aralarında Seçim Yapmak

| | En uygun olduğu durum | Başlıca risk |
|---|---|---|
| Aegra | İşleri doğrusal, küçük, basit ve çok dilli bir küme | Bir worker çöktüğünde ve sweeper çalışmadığında işler kaybolur |
| SkeinJS (BullMQ) | Hızlı çıkması gereken bir Node.js ya da TypeScript backend'i | Tek bir runtime'a bağlı; kümede çok sayıda key |
| Serverless durable orchestration | Serverless bir platformda saatler süren agent çalışmaları | Sağlayıcıya bağımlılık; cold start; canlı bağlantı yok |
| Redis Streams | Denetim kaydı tutan, olay güdümlü ve çok agent'lı bir ağ | Çok düşük seviyeli kod; `MAXLEN` olmadan bellek tükenir |

## Kaynaklar

### 📄 Makaleler

- [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/): veri tipi, consumer group'lar ve pending entries list
- [Redis pub/sub](https://redis.io/docs/latest/develop/interact/pubsub/): ilk iki seçeneğin ilerlemeyi frontend'e nasıl akıttığı

### 🛠️ Araçlar

- [BullMQ](https://docs.bullmq.io/): SkeinJS'in altındaki Redis kuyruk kütüphanesi
- [Inngest](https://www.inngest.com/) ve [Temporal](https://temporal.io/): uzun süren işler için durable orchestration
- [AI SDK](https://ai-sdk.dev/): Vercel'in yapay zekâ uygulamaları ve agent'lar için TypeScript araç seti

### 🗃️ Repolar

- [Aegra](https://github.com/aegra/aegra): açık kaynaklı, kendi sunucunda barındırılan bir agent backend'i

<!-- NEED: SkeinJS için bir bağlantı; 2026-11-07'de bu adla bir repo bulunamadı. -->
