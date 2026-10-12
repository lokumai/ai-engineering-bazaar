# Training LLMs

[LLM Fundamentals](llms_tr.md) modülü, bir LLM'in çok sayıda parameter'a sahip bir network
olduğunu söyledi. LLM'in sonraki kelimeyi tahmin ettiğini de söyledi. Bu modül, o parameter'ların
nereden geldiğiyle ilgili.

İki adım var ve birbirlerine neredeyse hiç benzemiyorlar. Biri milyonlarca dolara mal oluyor ve
bunu sadece birkaç lab yapabiliyor. Diğerini bu akşam kendi GPU'nda çalıştırabilirsin.

## Training Ne Demek?

Bir model hiçbir şey bilmeden başlar. Her parameter rastgele bir sayıdır, bu yüzden output'u da
rastgeledir.

Training, modele metin verip bu sayıları biraz değiştirmek demek. Bunu tekrar tekrar yaparsın, ta
ki modelin tahminleri rastgele olmayı bırakıp doğru olmaya başlayana kadar.

![Eğitilmemiş bir network ile eğitilmiş olanı yan yana](./images/training-network.jpg)  
*Aynı network, training'den önce ve sonra. Input: "The students opened their". Soldaki rastgele weight'ler "Sun" üretiyor. Sağdaki öğrenilmiş weight'ler ise "Laptops" üretiyor. Network'ün şekli değişmedi. Sadece içindeki sayılar değişti.*

Bütün numara bu. Training modele açıp okuyabileceğin türden kural ya da bilgi eklemez. Sadece sayıları
ayarlar. Bilgi de milyarlarca sayının arasına yayılır. Andrej Karpathy'nin tarifi bu yüzden hâlâ
kullanılıyor: bunu **internet'i sıkıştırmak** olarak düşünebilirsin.

## Pre-training

İlk ve açık ara en büyük adım **pre-training**.

- Model rastgele, eğitilmemiş parameter'larla ("weight"leriyle) başlar.
- İnternetin çok büyük bir bölümünü okur: kitaplar, web siteleri, kod ve makaleler. Bu metinden
  sonraki kelimeyi tahmin etmeyi öğrenir. Bunu tekrar tekrar, milyarlarca kez yapar.
- Modelin **bütün** parameter'ları güncellenir. Büyük bir model için bu, milyarlarca sayının
  değişmesi demek.
- Binlerce GPU'nun haftalar ya da aylar boyunca çalışmasını gerektirir. Bu yüzden büyük bir modeli
  sıfırdan pre-train etmek **milyonlarca dolara** mal olur. Bunu sadece birkaç büyük lab (OpenAI,
  Google, Anthropic, Meta ve birkaçı daha) karşılayabilir.

```mermaid
graph LR
    A["Devasa internet verisi"] --> B["Pre-training: BÜTÜN parameter'ları güncelle"]
    B --> C["Genel amaçlı LLM"]
    B -.- D["binlerce GPU, haftalar, milyonlarca dolar"]
```

Sonuç **genel amaçlı** bir model: birçok şeyde iyi, hiçbir şeyde uzman değil.

> **NOT, ve bu bir advanced konu.** Dikkat et, o internet metnini kimse label'lamadı. Bir cevap
> anahtarı yok. Model kendi training signal'ini kendisi üretiyor. Sonraki kelimeyi saklıyor, bir
> tahmin yapıyor ve tahminini gerçekten orada olan kelimeyle karşılaştırıyor. Yani veri kendi
> kendini label'lıyor. Buna **self-supervised learning** deniyor. Diyagramlar bunu genelde
> "unsupervised" olarak etiketliyor. Konuyu ayrıntılı olarak
> [İleri Seviye Training](../3_expert/advanced_training_tr.md) modülünde anlatıyoruz.

## Neden Pre-training Yapmak Zorunda Değiliz?

Kendi modelini pre-train etmen gerekmiyor. Başkası milyonları çoktan harcadı. Sen onun bitmiş
modelinden başlayıp **fine-tune** edebilirsin.

**Fine-tuning**, zaten pre-train edilmiş bir modeli alıp training'e devam etmek demek. Bu kez
dataset küçük ve göreve özel, böylece model tek bir belirli işte iyi hale gelir.

Farkı görmenin en net yolu, her adımın yediği veriye bakmak:

![Pre-training ile fine-tuning karşılaştırması](./images/pretrain-vs-finetune.png)  
*Pre-training, label'lanmamış bir metin yığını alıyor ve döngüde hiç insan yok. Metni tamamlamak ya da anlamak gibi genel yetenekler üretiyor. Fine-tuning ise bir insanın yazdığı çiftleri alıyor: bir prompt ve alması gereken response. Classification ya da question answering gibi belirli yetenekler ekliyor.*

Yani, tek satırla:

- **Pre-training**, internet ölçeğinde toplanmış **label'lanmamış** metin yer. Cevapları kimse
  yazmıyor, çünkü sonraki kelimenin kendisi *zaten* cevap.
- **Fine-tuning**, bir **çift koleksiyonu** yer: input ve output, ya da prompt ve response.
  Bu çiftleri genelde insanlar yazar ya da kontrol eder. Milyarlarca sayfa değil, binlerce
  çift.

Bu fark, birinin neden milyonlara mal olduğunu ve diğerinin neden tek bir GPU'ya sığdığını
açıklıyor.

## Fine-tuning

Diyelim ki makaleleri özetlemekte çok iyi bir model istiyorsun.

1. Pre-train edilmiş bir base model ile başla.
2. Örneklerden bir dataset topla: `(uzun makale, insan tarafından yazılmış kısa özet)` çiftleri.
   Birkaç bin tanesi genelde yeter.
3. Modeli bu çiftler üzerinde eğitmeye devam et. Böylece model "uzun metin girer, kısa ve doğru
   özet çıkar" kalıbını öğrenir.
4. Sonuç, genel base modele göre özetlemede belirgin biçimde daha tutarlı bir model. Pre-training
   maliyeti de yok.

Birkaç training satırı gerçekte şöyle görünür. Model 3. adımda tekrar tekrar tam olarak bunu
görüyor:

| Makale (input) | İnsan özeti (output) |
|---|---|
| "The city opened three new public parks this year, adding over 50 acres of green space. Officials say the parks will host weekend markets and free yoga classes starting next spring." | "The city added 50 acres of new parks, which will host markets and yoga classes." |
| "Scientists discovered a new species of frog in the Amazon rainforest. The frog has bright blue skin and is only 2 cm long, making it one of the smallest amphibians ever recorded." | "A tiny, 2cm blue frog was discovered in the Amazon, one of the smallest amphibians on record." |
| "The company's quarterly earnings report showed a 15% increase in revenue, driven mainly by strong sales in its cloud computing division." | "The company's revenue grew 15% this quarter, led by cloud computing sales." |
| "A new study found that drinking coffee in moderation may reduce the risk of heart disease. Researchers tracked 10,000 participants over five years." | "A 5-year study of 10,000 people found moderate coffee drinking may lower heart disease risk." |
| "The local football team won their championship game 3-1, securing their first title in a decade." | "The team won the championship 3-1, their first title in ten years." |

Model bunun gibi binlerce çift görüyor, ama cevapları ezberlemiyor. *Kalıbı* öğreniyor: uzun bir
metinden ana bilgileri çıkar ve tek bir kısa, sade cümleye sıkıştır.

### Gerçekten İşe Yarıyor mu?

Modeli, hiç görmediği yepyeni bir makale üzerinde deneyelim. Bu makale yukarıdaki tablodan
değil.

**Test makalesi:**
> "The tech startup announced today that it raised $50 million in Series B funding, led by two
> major venture capital firms. The company plans to use the funds to expand its engineering team
> and launch operations in three new countries by next year."

**Base model, fine-tuning'den önce:**
> "This is an interesting piece of news about a technology startup. The article talks about how
> the company managed to secure a significant amount of funding, specifically $50 million, in
> what is known as a Series B funding round, which was led by two prominent venture capital
> firms. According to the article, the startup intends to allocate this capital towards growing
> its engineering department and expanding its business operations into three additional
> countries within the coming year."

**Fine-tune edilmiş model, sonra:**
> "The startup raised $50 million in Series B funding to grow its engineering team and expand
> into three new countries next year."

Farka dikkat et. Base model'in cevabı uzun ve dağınık. Makaleyi neredeyse cümle cümle tekrarlıyor
ve "This is an interesting piece of news" gibi bir dolgu cümlesiyle başlıyor. Fine-tune edilmiş
model tablodaki kalıbı öğrendi. Sonra bu kalıbı hiç görmediği bir makaleye uyguladı.

Hugging Face `transformers` ile küçük ve basitleştirilmiş bir örnek:

```python
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, Trainer, TrainingArguments

model = AutoModelForSeq2SeqLM.from_pretrained("t5-small")  # zaten pre-train edilmiş
tokenizer = AutoTokenizer.from_pretrained("t5-small")

# dataset = {"article": "...", "summary": "..."} çiftlerinden bir liste
trainer = Trainer(
    model=model,
    args=TrainingArguments(output_dir="./summarizer", num_train_epochs=3),
    train_dataset=dataset,  # senin (makale, özet) çiftlerin
)
trainer.train()  # modelin BÜTÜN parameter'larını güncelliyor
```

Buna **full fine-tuning** deniyor, çünkü her parameter güncelleniyor. Pre-training ile aynı
mekanizma, sadece çok daha küçük bir dataset üzerinde. Pre-training'den daha ucuz. Ama büyük bir
model için hâlâ çok GPU belleği istiyor.

```mermaid
graph LR
    A["Pre-train edilmiş base LLM"] --> C["Fine-tuning: BÜTÜN parameter'ları güncelle"]
    B["Dataset: makale + özet çiftleri"] --> C
    C --> D["Özetleme uzmanı LLM"]
```

## Parameter-efficient Fine-tuning (PEFT)

Full fine-tuning her parameter'ı güncelliyor. Büyük bir model için bu, hâlâ büyük GPU'lar demek.
Çoğumuzda onlar yok.

**PEFT (Parameter-Efficient Fine-Tuning)** bu sorunu çözüyor. **Modelin neredeyse tamamını
donduruyor** ve sadece az sayıda yeni, ek parameter eğitiyor.

- Donmuş kısım, pre-training onu nasıl bıraktıysa aynen öyle kalıyor.
- Parameter'ların sadece çok küçük bir kısmı değişiyor. Bu, genelde toplamın %1'inden azı.
- En yaygın PEFT tekniği **LoRA** (Low-Rank Adaptation). Matematiğine ihtiyacın yok. LoRA'nın,
  neredeyse herkesin kullandığı ucuz fine-tuning numarası olduğunu bilmen yeterli.

Bunun üç faydası var. Tek bir consumer GPU'da çalışıyor. Çok daha hızlı eğitiliyor. Ve modelin
yepyeni bir kopyası yerine, sadece ek parameter'ları tutan küçük bir dosya üretiyor. Gerçek
projelerin çoğu zaman kullandığı şey bu.

Hugging Face `peft` ile küçük ve basitleştirilmiş bir LoRA örneği:

```python
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForSeq2SeqLM

model = AutoModelForSeq2SeqLM.from_pretrained("t5-small")  # donmuş base model

lora_config = LoraConfig(r=8, task_type="SEQ_2_SEQ_LM")
model = get_peft_model(model, lora_config)  # base'i dondurur, küçük eğitilebilir katmanlar ekler

model.print_trainable_parameters()
# şuna benzer bir şey: "trainable params: 0.3M || all params: 60M || trainable%: 0.5%"
```

PEFT'i, [LLM Fundamentals](llms_tr.md) modülünde anlattığımız quantization ile karıştırma. **PEFT
ucuza eğitmekle ilgili. Quantization ise ucuza çalıştırmakla ilgili.** İkisi sık sık birlikte
kullanılıyor.

## Unsloth

Training loop'unu kendin yazarsan, birçok parçayı elle birbirine bağlaman gerekir. Bir modeli
eldeki belleğe sığdırmak da başlı başına bir beceri. [Unsloth](https://unsloth.ai/docs) bu iki işi
de yapan açık kaynak bir kütüphane.

Sana verdikleri:

- **Sığan fine-tuning.** Training'in pahalı kısımlarını yeniden yazıyor. Böylece LoRA ve
  quantize edilmiş LoRA çalıştırmaları çok daha az GPU belleği istiyor ve daha hızlı bitiyor. Bir
  işin ücretsiz bir Colab GPU'sunda çalışıp çalışmayacağını çoğu zaman bu belirliyor.
- **Hazır notebook'lar.** [Notebook koleksiyonu](https://unsloth.ai/docs/get-started/unsloth-notebooks)
  popüler açık modelleri kapsıyor. Birini açıyorsun, ona kendi dataset'ini veriyorsun ve
  çalıştırıyorsun. "Elimde birkaç çift var"dan "fine-tune edilmiş bir modelim var"a giden en hızlı
  dürüst yol bu.
- **Sadece training için değil, çalıştırmak için de hazır quantize edilmiş modeller.**
  [LLM Fundamentals](llms_tr.md) modülü, bir şeyi kendin quantize etmeye nadiren ihtiyaç
  duyduğunu söylemişti. Kastettiği release'ler bunlar. Yani aynı proje iki işi de kapsıyor: bir
  modeli sıkıştırmak ve eğitmek.
- **Bir rehber, ve bir gerçeklik kontrolü.**
  [Fine-tuning rehberi](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide) bütün süreci
  anlatıyor. Ama başlamadan **önce**
  [fine-tuning bana uygun mu](https://unsloth.ai/docs/get-started/fine-tuning-for-beginners/faq-+-is-fine-tuning-right-for-me)
  FAQ'ini oku, çünkü dürüst cevap genelde hayır. Birçok problem fine-tuning problemi gibi
  görünüyor. Bunların birçoğunu daha iyi bir prompt ya da [RAG & Embeddings](rag_tr.md)
  modülündeki retrieval çözüyor.

## Yan Yana Karşılaştırma

| | Pre-training | Full fine-tuning | PEFT (örn. LoRA) |
|---|---|---|---|
| Başlangıç noktası | Rastgele weight'ler | Pre-train edilmiş model | Pre-train edilmiş model |
| Gereken veri | Bütün internet, label'lanmamış | Göreve özel çiftler | Göreve özel çiftler |
| Güncellenen parameter | HEPSİ, sıfırdan | HEPSİ | BİR KISMI, genelde %1'in altı |
| Tipik maliyet | Milyonlarca dolar | Pahalı, ama pre-training'in çok altında | Ucuz, tek GPU'ya sığar |
| Kimler yapıyor | Birkaç büyük AI lab'i | Gerçek bütçesi olan şirketler | Çoğumuz, çoğu zaman |

```mermaid
graph LR
    A["Pre-training: BÜTÜN parameter'lar, sıfırdan"] --> B["Pre-train edilmiş genel LLM"]
    B --> C["Full fine-tuning: BÜTÜN parameter'lar"]
    B --> D["PEFT / LoRA: BİR KISMI"]
    C --> E["Göreve özel uzman LLM"]
    D --> E
```

## Hugging Face Nedir?

Yukarıdaki iki kod örneği de ondan import ediyor. Bu yüzden bir paragrafı hak ediyor.

[Hugging Face](https://huggingface.co/), açık kaynak machine learning dünyasının işini tuttuğu
yer. **Models** sayfası, pratikte her türden açık model için merkezi registry. Sadece LLM'ler için
değil: computer vision, speech ve audio modelleri ve daha pek çok alan için. Bir araştırma grubu
açık bir model yayınlarsa, model genelde burada çıkıyor.

Hugging Face, bu modellerle çalışmak için herkesin kullandığı kütüphaneleri de yayınlıyor. Ana
kütüphane **`transformers`**. Bir modeli ismiyle yüklüyor ve birkaç satır kodla çalıştırıyor.
Etrafındaki parçalar için yardımcı kütüphaneler de var: mesela yukarıdaki LoRA training'i için
`peft`, ve modele vereceğin veri için `datasets`.

## Bu serinin neresindeyiz

```mermaid
graph LR
    A[LLMs] --> B[Training]
    B --> C[RAG]
    C --> D[Tools]
    D --> E[Memory]
    E --> F[Agents]
    F --> G[Multi-Agent]
    G --> H[Observability]
    style A fill:#90EE90
    style B fill:#FFFF00
```

## Özet

Training, bir modelin parameter'larının ayarlanmasından başka bir şey değil. Pre-training
rastgele weight'lerden başlıyor, label'lanmamış internet metnini kullanıyor ve milyonlarca dolara
mal oluyor. Fine-tuning başkasının bitmiş modelinden başlıyor, bir insanın yazdığı çiftleri
kullanıyor ve maliyeti çok düşük. PEFT aynı işi yapıyor, ama parameter'ların %1'inden azını
değiştiriyor. Çoğu projenin onu kullanmasının sebebi bu.

Ama fine-tune edilmiş bir model bile senin private codebase'in ya da bugünün verisi hakkında
hiçbir şey bilmiyor. O boşluğu tam olarak RAG dolduruyor ve sıradaki modül o.

**Hızlı Kontrol**: full fine-tuning ile PEFT arasındaki fark ne? Ve pre-training neden bu kadar
pahalı?

## Kaynaklar

- [Unsloth dokümantasyonu](https://unsloth.ai/docs): kütüphanenin bütün dokümantasyonu
- [Unsloth: fine-tuning bana uygun mu?](https://unsloth.ai/docs/get-started/fine-tuning-for-beginners/faq-+-is-fine-tuning-right-for-me): bir şeyi fine-tune etmeden önce bunu oku
- [Unsloth notebook'ları](https://unsloth.ai/docs/get-started/unsloth-notebooks): training için ve quantize edilmiş modelleri çalıştırmak için hazır notebook'lar
- [Unsloth fine-tuning rehberi](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide): baştan sona bütün süreç
- [Hugging Face](https://huggingface.co/): model registry'si, ve `transformers` kütüphanesi
- [Fine-tuning AI models](https://cloud.google.com/use-cases/fine-tuning-ai-models?hl=en#fine-tuning-llms-and-ai-models): Google Cloud'un genel bakışı, terminoloji için faydalı
- [What is LLM Fine-Tuning? (Explained Simply)](https://youtube.com/shorts/Ei4E2lWStqw?si=q0PttlRmBsARGHZU): bütün fikri bir dakikanın altında istiyorsan kısa bir video
