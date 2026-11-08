# UI Design

Kod yazan bir yapay zekâ sana seve seve bir ekran yapar. Sorun, her seferinde farklı bir tane yapması. Bugün bir ayarlar sayfası, yarın bir dashboard istersen, iki farklı şirketten gelmiş gibi duran iki ekran elde edersin: farklı renkler, farklı buton şekilleri, farklı başlıklar. Her biri tek başına iyi görünür. Yan yana durduklarında ise sanki işin başında kimse yokmuş gibi görünür.

Bu modül, ekran tasarlayan araçları ve bu soruna basit çözümü anlatıyor.

## Bu Senin İçin Neden Önemli

Bir web sitesini ya da iç aracı, bu kursun vaat ettiği gibi, tarif ederek yapıyorsan, bu sorunla ikinci ekranında karşılaşacaksın. Çözüm tek bir dosya ve [Code Agent'lar](../2_intermediate/coding_agents_tr.md) modülündeki işe başlama notuyla aynı fikir.

## Bir Tarifi Ekrana Çeviren İki Araç

![](../images/logos/google.svg)**[Google Stitch](https://stitch.withgoogle.com/)**, yazılı bir açıklamayı, bir görseli, kabaca bir çizimi ya da sesli bir açıklamayı alıp arkasında gerçek kod olan bitmiş bir tasarım üretiyor. Tasarımı, birçok tasarımcının kullandığı araç olan Figma'ya da gönderebiliyor.

Anthropic'in ![](../images/logos/claude.svg)**[Claude Design](https://claude.ai/design)**'ı, Nisan 2026'da çıktı ve prototipleri, slaytları ve tek sayfalık dokümanları gerçek, çalışan kod olarak yapıyor. Var olan bir projeyi okuyabiliyor, içindeki tasarım kurallarını bulabiliyor ve bundan sonra ne istersen onlara uyarak yapabiliyor.

İkisine birlikte bakınca örüntü net: bir ekranı tarif etmek artık onu çizmekten daha hızlı ve sonuç bir resim değil, çalışan kod.

## Design System

**Design system**, bir markanın bir kez verdiği ve bir daha kimsenin vermesi gerekmeyen tasarım kararlarının tamamı: renkler ve her birinin ne için olduğu, yazı tipleri ve boyutları, boşluklar, köşe şekilleri ve bir butonun üzerine geldiğinde ya da bastığında nasıl göründüğü. Pazarlamadan bir şirketin marka kılavuzunu gördüysen, aynı fikir bu.

Bir ekran yapan yapay zekâ bu kararların her birini vermek zorunda. Seninkileri bilemez, bu yüzden makul görünen kararlar uyduruyor ve her seferinde farklı olanlar. Çözüm, talimatlardaki çözümle aynı: kararları bir dosyaya yaz ve yapay zekânın onu okumasına izin ver.

## DESIGN.md

`DESIGN.md` o dosya. Proje klasöründe duruyor ve çoğu yapay zekâ aracı onu kendiliğinden okuyor. İki tür içeriğe ihtiyacı var:

- **Kesin değerler**: renk kodları, yazı boyutları, boşluk adımları ve köşe şekilleri.
- **Niyet, kelimelerle**: tasarımın nasıl hissettirmesi gerektiği, bilerek neden kaçındığı ve nedeni. Bir değer listesi bu kısmı söyleyemez.

Gösterim çok doğrudan. Bir yapay zekâya, Stripe'ın stilinden örnek alınmış bir `DESIGN.md` ile tek bir istek ver, Stripe'ın renklerini ve boşluklarını elde edersin. Başka bir markanın dosyasını koy ve başka hiçbir şeyi değiştirme, sonuç yeni markayla eşleşir.

Bu kursun şimdiye kadar tanıştırdığı üç dosyaya dikkat et. `AGENTS.md`, bir projede çalışmanın kurallarını tutuyor. [Personal Agent'lar](../2_intermediate/personal_agents_tr.md) modülündeki `SOUL.md`, bir agent'ın kim olduğunu tutuyor. `DESIGN.md` ise işinin nasıl görünmesi gerektiğini tutuyor.

## Hâlâ Yapamadıkları

Bu araçlar sana hızlıca iyi görünen bir ekran veriyor. Bir tasarımcının verdiğini vermiyorlar: ekranın *ne için* olduğunu bilmek; kullanıcının neyi bitirmeye çalıştığını ve neyin kolay olması gerektiğini.

**Erişilebilirlik (accessibility)** en net eksik. Ekranı herkesin kullanabilmesi demek; yalnızca klavye ya da ekran okuyucu (ekranı sesli okuyan yazılım) kullanan biri dahil. Üretilen ekranlar bunu çoğu zaman yanlış yapıyor:

- kontrastı gereken orana ulaşmayan metin; bunu gözle değil, yalnızca ölçerek anlayabilirsin
- klavyenin sayfada nerede olduğunu gösteren görünür bir işaret yok
- yalnızca fareyle çalışan bir kontrol
- adı olmayan bir ikon butonu; bu yüzden bir ekran okuyucu onu seslendiremiyor

Bunların hiçbiri bir ekran görüntüsünde görünmüyor. Birinin bunları kontrol etmesi gerekiyor.

## Artık Bildiğin Terimler

- **Design system**: bir markanın bir kez verdiği tasarım kararları (renkler, yazı tipleri, boşluklar, butonlar).
- **DESIGN.md**: bu kararları yapay zekâya veren dosya.
- **Google Stitch / Claude Design**: bir açıklamayı çalışan bir tasarıma çeviren araçlar.
- **Accessibility**: bir ekranı, klavye ya da ekran okuyucuyla kullananlar dahil herkesin kullanabildiğinden emin olmak.

## Özet

Yapay zekâ bir ekranı tarif edilenden tasarlayabilir, ama marka kuralların olmadan her ekran farklı çıkar. Kuralları, hem kesin değerlerle hem niyetle `DESIGN.md` dosyasına koy; her ekran eşleşir. Ve bir ekran görüntüsünün gösteremediğini kontrol et: herkesin onu gerçekten kullanıp kullanamadığını.

**Hızlı Kontrol**: Yapay zekâyla yapılmış iki ekran neden farklı şirketlerden gelmiş gibi görünüyor? Bir ekran görüntüsünün sana göstermeyeceği bir erişilebilirlik sorununu söyle.

## Kaynaklar

### 📄 Makaleler

- [From idea to app: Introducing Stitch](https://developers.googleblog.com/stitch-a-new-way-to-design-uis/): Google'ın duyurusu ve DESIGN.md'nin geldiği yer

### 🛠️ Araçlar

- [Google Stitch](https://stitch.withgoogle.com/): bir açıklamayı ya da çizimi gerçek bir tasarıma çeviriyor
- [Claude Design](https://claude.ai/design): prototipleri gerçek kod olarak yapıyor

### 🗃️ Repolar

- [awesome-design-md](https://github.com/VoltAgent/awesome-design-md): tanınmış markalar için hazır DESIGN.md dosyaları
