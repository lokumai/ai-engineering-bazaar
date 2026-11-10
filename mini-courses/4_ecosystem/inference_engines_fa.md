---
objectives:
  - "بگو inference engine چه کاری می‌کنه که provider ازت قایمش می‌کنه"
  - "سه تا دلیل واقعی رو بگو که چرا خودت مدل رو اجرا کنی"
  - "برای یه سیستم، یه سرور GPU یا یه cluster، engine مناسب رو انتخاب کن"
  - "توضیح بده چرا batching، throughput رو تعیین می‌کنه"
  - "یه رابط چت جلوی یه مدل محلی بذار"
  - "با Ollama یه مدل کوچیک رو روی لپ‌تاپ خودت اجرا کن"
---

# Inference Engine‌ها

[مبانی LLM](../1_fundamentals/llms_fa.md) اسم این engine‌ها رو آورد و گفت کمتر پیش میاد مستقیم باهاشون سروکار داشته باشی. حرف درستیه، و برای همین هم اون درس یه‌راست رفت سراغ Ollama. این درس درباره‌ی وقت‌هاییه که سروکارت مستقیم با خود engine می‌افته.

**inference engine** برنامه‌ایه که weight‌ها رو load می‌کنه و از روی token‌هایی که بهش می‌دی، token بعدی رو درمیاره. این کارها هم به عهده‌ی خودشه:

- حافظه‌ی GPU رو مدیریت می‌کنه.
- درخواست‌ها رو با هم توی یه batch می‌ذاره.
- attention state رو بین نوبت‌های گفت‌وگو cache می‌کنه.
- تصمیم می‌گیره چی با چه ترتیبی اجرا بشه.

inference provider، که موضوع [Inference Provider‌ها](inference_providers_fa.md) بود، یعنی یه نفر دیگه یکی از همین engine‌ها رو برات اجرا می‌کنه و به ازای هر token ازت پول می‌گیره.

![لایه‌های Inference Engine](./images/inference-engine-layers.webp)  
*engine لایه‌ی بین weight‌ها و لایه‌ی CUDA یا framework زیرشه. اونه که تصمیم می‌گیره weight‌ها چطور از GPU استفاده کنن، و provider هر چهار لایه رو برات اجرا می‌کنه.*

## چرا خودت اجراش کنی؟

سه تا دلیل هست، و فقط همین سه تا می‌ارزه که دردسرش رو به جون بخری.

**داده نباید بیرون بره.** مثل پرونده‌های پزشکی، اسناد حقوقی، و هر چیزی که طبق قانون باید روی زیرساخت خودت بمونه. این رایج‌ترین دلیله، خیلی رایج‌تر از دو تای دیگه، و اگه شامل حال تو می‌شه، به‌تنهایی تکلیف رو روشن می‌کنه.

**حجم کار، خودت اجرا کردن رو ارزون‌تر می‌کنه.** قیمت‌گذاری به ازای هر token عالیه، ولی تا یه جایی. یه نقطه‌ی سربه‌سر (crossover) هست که از اون به بعد، یه GPU اجاره‌ای که کل روز کار می‌کنه، از همون حجم کار که token به token بخری ارزون‌تر درمیاد. اگه از اون نقطه رد شده باشی، فرقش ناچیز نیست، خیلی زیاده.

**چیزی لازم داری که provider بهت نمی‌ده.** مثلاً:

- مدل fine-tune‌شده‌ی خودت، از همون چیزهایی که توی [Training LLMs](../1_fundamentals/training_fa.md) دیدیم
- مدلی که هیچ‌کس host‌ش نمی‌کنه
- یه quantization غیرمعمول
- کنترل دقیق روی نسخه، که هیچ آپدیتی غافلگیرت نکنه

اگه هیچ‌کدوم از این‌ها صدق نمی‌کنه، از provider استفاده کن. self-hosting یه کار عملیاتی واقعیه، و ماه اولش بیشتر می‌فهمی چه چیزهایی رو توی بودجه‌ت حساب نکرده بودی.

## Engine مناسب، بسته به بزرگی کار

```mermaid
graph TD
    A["یه سیستم، یه نفر<br/>Ollama, LM Studio, llama.cpp"] --> B["یه سرور GPU، کلی کاربر<br/>vLLM, SGLang, TensorRT-LLM"]
    B --> C["چند تا سرور<br/>llm-d روی Kubernetes"]
```

**روی سیستم خودت**، سراغ wrapper‌ها برو. [مبانی LLM](../1_fundamentals/llms_fa.md) درباره‌ی [Ollama](https://ollama.com/) و [LM Studio](https://lmstudio.ai/) گفت، و اینجا هم جواب درست همین‌هان: engine رو پشت خودشون قایم می‌کنن و ظرف چند دقیقه کارت رو راه می‌ندازن.

زیر هر دوشون ![](./images/logos/llamacpp.svg)**[llama.cpp](https://github.com/ggml-org/llama.cpp)** خوابیده، یعنی inference مدل‌های زبانی که با C و C++ نوشته شده، و اصلاً به لطف همینه که یه مدل quantize‌شده می‌تونه روی لپ‌تاپ اجرا بشه. llama.cpp رو فقط توی دو حالت مستقیم استفاده کن: وقتی یه build flag می‌خوای که wrapper دستت نمی‌ده، یا وقتی داری مدل رو روی سخت‌افزاری می‌بری که هیچ‌کس دیگه پشتیبانیش نمی‌کنه.

**روی یه سرور GPU با کاربرهای واقعی**، wrapper‌ها دیگه جواب نمی‌دن و یه serving engine لازم داری.

- ![](./images/logos/vllm.svg)**vLLM** انتخاب پیش‌فرض بیشتر آدم‌هاست. سخت‌افزارهای خیلی متنوعی رو پشتیبانی می‌کنه، و throughput خوبش رو مدیون continuous batching‌ه.
- ![](./images/logos/sglang.svg)**[SGLang](https://github.com/sgl-project/sglang)** یه framework پرسرعت برای serve کردن مدل‌های زبانی و multimodal‌ه، و وقتی درخواست‌ها یه prefix طولانی مشترک دارن، خیلی خوب جواب می‌ده. اگه همه‌ی درخواست‌هات با یه system prompt بزرگ و یکسان شروع می‌شن، دقیقاً حالت تو همینه.
- ![](./images/logos/nvidia.svg)**[TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM)** مال NVIDIA‌ه و حداکثر استفاده رو از سخت‌افزار خود NVIDIA می‌کنه. مدل رو از قبل به یه engine بهینه‌شده کامپایل می‌کنی؛ این یه مرحله‌ی build اضافه برات خرج داره، ولی در عوض latency پایین‌تری می‌گیری.

**وقتی کار به چند تا سرور می‌کشه**، دیگه مسئله این نیست که یه برنامه رو روی یه سرور خوب اجرا کنی؛ مسئله اینه که کل یه cluster از سرورها رو با هم هماهنگ کنی. ![](./images/logos/llm-d.svg)**[llm-d](https://github.com/llm-d/llm-d)** برای همین ساخته شده: inference رو روی Kubernetes و با accelerator‌های جدید اجرا می‌کنه، و scheduling و routing رو هم خود پلتفرم انجام می‌ده تا تو درگیرش نشی؛ یعنی خودش تصمیم می‌گیره هر درخواست روی کدوم سرور اجرا بشه. یه کار دیگه‌ش هم جاگذاری با در نظر گرفتن cache‌ه (cache-aware placement): سروری رو ترجیح می‌ده که داده‌ی لازم از قبل توی cache‌ش باشه.

یه نقشه نشون می‌ده همه‌ی این ابزارها کجا می‌شینن، و provider‌ها کنارشون کجان.

![نقشه‌ی Inference برای LLM](./images/llm-inference-landscape.webp)  
*نقشه‌ی Wing از زیرساخت inference برای LLM، از پایین به بالا: GPU‌های اجاره‌ای، ابزارهایی که مدیریتشون می‌کنن، بعد engine‌ها، و بالاش cache و routing. ستون inference-as-a-service همون راه provider‌هاست، و ستون integrated stack‌ها چند تا لایه رو توی یه محصول جمع می‌کنه.*

## یه مدل رو روی لپ‌تاپت اجرا کن

می‌تونی یه مدل رو روی کامپیوتر خودت اجرا کنی، و ![](./images/logos/ollama-mono.svg)**[Ollama](https://ollama.com/)** کار رو خیلی راحت می‌کنه. یه terminal باز کن و Ollama رو نصب کن. روی macOS و Linux این دستور رو اجرا کن: `curl -fsSL https://ollama.com/install.sh | sh`. روی Windows هم توی PowerShell این رو اجرا کن: `irm https://ollama.com/install.ps1 | iex`. می‌تونی از [صفحه‌ی دانلود Ollama](https://ollama.com/download) هم یه installer دانلود کنی. بعد از اون، این دستورها رو بزن:

```bash
ollama pull llama3.2:3b   # download the model to your disk
ollama list               # show the models you have downloaded
ollama run llama3.2:3b    # chat with the model; it pulls the model first if needed
ollama ps                 # show the models that are loaded in memory
ollama stop llama3.2:3b   # unload the model from memory
```

مدل مثال، یعنی `llama3.2:3b`، یه مدل کوچیکه و حدود 2 GB حجم داره. وسط یه چت با نوشتن `/bye` میای بیرون. Ollama به‌طور پیش‌فرض یه مدل رو تا پنج دقیقه بعد از آخرین استفاده توی حافظه نگه می‌داره، و دستور `ollama stop` اون حافظه رو همون لحظه آزاد می‌کنه. لیست همه‌ی دستورها توی [CLI Reference](https://docs.ollama.com/cli) هست، و اینکه یه مدل چقدر توی حافظه می‌مونه رو [FAQ](https://docs.ollama.com/faq) توضیح می‌ده.

![مدل‌هایی که Ollama لیست کرده](./images/ollama-list.webp)  
*خروجی `ollama list`. هر مدلی که pull می‌کنی یه فایل روی دیسکته، و ستون size نشون می‌ده چقدر جا می‌گیره، پس می‌تونی ببینی چی روی سیستمت جا می‌شه. دو اسم `llama3.2` یه ID دارن، چون هر دو یه مدل هستن.*

![](./images/logos/lmstudio-mono.svg)**[LM Studio](https://lmstudio.ai/)** همین کار رو به جای terminal با یه اپ دسکتاپ انجام می‌ده. اپ فعلی‌ش اسمش LM Studio Bionic هست. مدل‌ها رو از داخل خود اپ دانلود می‌کنی و توی پنجره‌ی خودش باهاشون چت می‌کنی.

![LM Studio Bionic](./images/lm-studio.webp)  
*LM Studio Bionic یه اپ دسکتاپه. چت، لیست پروژه‌ها و پیش‌نمایش زنده توی یه پنجره هستن، پس terminal لازم نداری. اینجا با یه درخواست ازش خواستن یه سایت portfolio بسازه.*

این ابزارها رو با هم قاطی نکن. Ollama یه engine هست که از terminal کنترلش می‌کنی. LM Studio فقط یه اپه که هم engine و هم پنجره‌ی چت توشه. Open WebUI رو آخر همین درس توضیح می‌دیم، و اون فقط یه رابط چته: خودش هیچ مدلی اجرا نمی‌کنه و به Ollama یا یه engine دیگه که پشتیبانی می‌کنه وصل می‌شه.

## ایده‌ای که همه‌ی عددها رو توضیح می‌ده

اگه قراره از این درس فقط یه مکانیزم یادت بمونه، اون **batching** باشه.

GPU‌ای که هر بار فقط یه درخواست رو اجرا می‌کنه، بیشتر وقتش بیکاره، چون تولید هر token محاسبه‌ی کمی لازم داره ولی کلی جابه‌جایی داده توی حافظه (memory traffic). اگه چند تا درخواست رو با هم اجرا کنی، همون یه بار load کردن weight‌ها به کار همه‌شون میاد. برای همینه که throughput این engine‌ها رو با کلی کاربر هم‌زمان اندازه می‌گیرن. و برای همینه که یه سخت‌افزار ثابت ممکنه یه بار معرکه به نظر بیاد و یه بار افتضاح، فقط بسته به اینکه batch چقدر پره.

![Inference Server و Engine](./images/inference-server-engine.webp)  
*engine فقط جعبه‌ی داخلیه. server دورش درخواست‌های HTTP یا gRPC رو می‌گیره، توی صف می‌ذاره و metrics رو نگه می‌داره، و batching همون مرحله‌ایه که درخواست‌های توی صف برای مدل یه گروه می‌شن.*

اون بهبودی که در عمل واقعاً مهمه، continuous batching‌ه: engine منتظر نمی‌مونه کل batch تموم بشه، بلکه هر وقت یه درخواست قدیمی تموم شد، یه درخواست جدید رو جاش توی batch می‌ذاره، و این‌طوری GPU هیچ‌وقت بیکار نمی‌مونه. به همین دلیل هم benchmark خودت، که هر بار فقط یه درخواست می‌فرسته، درباره‌ی توان واقعی سرور حسابی گمراهت می‌کنه.

batching از اون طرف هم به [Context Engineering](../2_intermediate/context_engineering_fa.md) گره می‌خوره. attention state یه context بلند باید توی حافظه‌ی GPU بمونه؛ پس یه context window پر، هم پردازشش کندتره، هم حافظه‌ای رو اشغال می‌کنه که درخواست یه کاربر دیگه لازمش داشت.

## یه رابط جلوی Engine

engine فقط یه API بهت می‌ده و هیچ صفحه‌ای برای دیدن نداره. ![](./images/logos/open-webui-mono.svg)**[Open WebUI](https://github.com/open-webui/open-webui)** همون رابطیه که معمولاً جلوی engine می‌ذارن: یه UI چت که با Ollama، یا با هر چیزی که API‌ش هم‌شکل API شرکت OpenAI باشه، حرف می‌زنه، و حساب کاربری، تاریخچه‌ی گفت‌وگو و عوض کردن مدل هم داره. بعضی تیم‌ها یه ChatGPT خصوصی روی سخت‌افزار خودشون می‌خوان، و برای اون‌ها کل stack همین دو تیکه‌ست: engine و Open WebUI.

## اصطلاح‌های کلیدی

- **Inference engine**: برنامه‌ای که weight‌ها رو load می‌کنه و از روی token‌هایی که بهش می‌دی، token بعدی رو درمیاره.
- **Attention state**: چیزی که engine بین نوبت‌های گفت‌وگو cache می‌کنه و برای context بلند باید توی حافظه‌ی GPU بمونه.
- **Inference provider**: یه شرکت که یکی از این engine‌ها رو برات اجرا می‌کنه و به ازای هر token ازت پول می‌گیره.
- **Crossover point**: نقطه‌ای از حجم کار که از اون به بعد، اجاره‌ی GPU ارزون‌تر از خریدن token درمیاد.
- **Self-hosting**: اجرای مدل روی زیرساخت خودت، که یه کار عملیاتی واقعیه.
- **Wrapper**: ابزاری مثل Ollama یا LM Studio که engine رو پشت خودش قایم می‌کنه و ظرف چند دقیقه مدل رو راه می‌ندازه.
- **Ollama**: یه wrapper که از terminal کنترلش می‌کنی و دستورهایی مثل `ollama pull`، `ollama list`، `ollama run` و `ollama stop` داره.
- **LM Studio**: یه اپ دسکتاپ که هم engine و هم پنجره‌ی چت توشه.
- **Serving engine**: engine‌ای برای سرور GPU با کاربرهای واقعی، مثل vLLM.
- **Batching**: اجرای چند تا درخواست با هم، طوری که GPU weight‌ها رو یه بار از حافظه بخونه و برای کل گروه به کار ببره.
- **Throughput**: حجم کاری که سرور با کلی کاربر هم‌زمان تموم می‌کنه.
- **Continuous batching**: وقتی یه درخواست قدیمی تموم می‌شه، engine یه درخواست جدید رو جاش توی batch می‌ذاره تا GPU هیچ‌وقت بیکار نمونه.

## کجای این مجموعه هستیم

```mermaid
graph LR
    A[Agent Frameworks] --> B[Inference Providers]
    B --> C[Inference Engines]
    C --> D[UI Design]
    D --> E[Choosing a Tech Stack]
    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#FFFF00
```

## خلاصه

inference engine برنامه‌ایه که واقعاً weight‌ها رو اجرا می‌کنه، و این‌ها به عهده‌ی خودشه:

- حافظه‌ی GPU
- batching
- attention cache
- scheduling

provider هم یعنی یکی دیگه یه engine رو برات اجرا می‌کنه.

فقط به یکی از این سه دلیل engine خودت رو راه بنداز:

- داده نباید از زیرساخت خودت بیرون بره.
- حجم کار از نقطه‌ای رد شده که اجاره‌ی GPU از خریدن token ارزون‌تر درمیاد.
- مدل یا نسخه‌ای لازم داری که هیچ‌کس host‌ش نمی‌کنه.

در غیر این صورت سراغ provider برو، چون self-hosting یه کار عملیاتی جدیه.

engine رو به اندازه‌ی مسئله انتخاب کن. روی سیستم خودت Ollama یا LM Studio، که llama.cpp زیرشونه. روی یه سرور GPU با کاربرهای واقعی vLLM، SGLang یا TensorRT-LLM: SGLang برای وقتی که درخواست‌ها یه prefix طولانی مشترک دارن، و TensorRT-LLM برای گرفتن حداکثر کارایی از سخت‌افزار NVIDIA. وقتی هم کار به cluster کشید، llm-d.

برای امتحان کردنش روی لپ‌تاپت، Ollama رو نصب کن و از `ollama pull` و `ollama run` استفاده کن. LM Studio همین کار رو توی یه اپ دسکتاپ انجام می‌ده. Open WebUI فقط یه رابط چته، پس یه engine باید پشتش باشه.

batching ایده‌ایه که همه‌ی عددهای این درس رو توضیح می‌ده. GPU‌ای که فقط یه درخواست رو جواب می‌ده بیشتر وقتش بیکاره، و continuous batching پر نگهش می‌داره. برای همینه که یه benchmark با یه درخواست در هر لحظه، تقریباً هیچی بهت نمی‌گه.

**بررسی سریع**: مدل self-host‌شده‌ت رو با یه درخواست در هر لحظه تست می‌کنی و سریع به نظر میاد. چرا ممکنه با پنجاه تا کاربر از پا دربیاد؟ و به‌جاش باید چی رو اندازه می‌گرفتی؟

## منابع

### 📄 مقاله‌ها

- [CLI Reference](https://docs.ollama.com/cli): دستورهایی که Ollama بهت می‌ده، و اینکه هر کدوم چی کار می‌کنه
- [FAQ](https://docs.ollama.com/faq): اینکه Ollama یه مدل رو چقدر توی حافظه نگه می‌داره، و چطور همون لحظه آزادش کنی

### 🛠️ ابزارها

- [Ollama](https://ollama.com/) و [LM Studio](https://lmstudio.ai/): wrapper‌های محلی، که توی [مبانی LLM](../1_fundamentals/llms_fa.md) دیدیمشون

### 🗃️ Repository‌ها

- [llama.cpp](https://github.com/ggml-org/llama.cpp): inference مدل‌های زبانی با C و C++، و پایه‌ای که wrapper‌های محلی روش ساخته شدن
- [SGLang](https://github.com/sgl-project/sglang): serve کردن پرسرعت، که وقتی درخواست‌ها prefix مشترک دارن خیلی خوب جواب می‌ده
- [TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM): مال NVIDIA، که از قبل کامپایل می‌شه تا latency پایین‌تری بده
- [llm-d](https://github.com/llm-d/llm-d): serve کردن روی چند تا سرور با Kubernetes
- [Open WebUI](https://github.com/open-webui/open-webui): رابط چتی که می‌شه جلوی هر کدوم از این‌ها گذاشت
