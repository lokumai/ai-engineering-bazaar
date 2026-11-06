# Advanced Loop Engineering (Persian, kept for later)

These sections were moved out of `2_intermediate/loop_engineering_fa.md` when Loop Engineering was
split (issue #48). A planned module gets no `_fa.md`, so the Persian text waits here until Advanced
Loop Engineering is written. The English and Turkish live in `3_expert/advanced_loop_engineering.md`
and `_tr.md`; when the module is written, the figure path below becomes `./images/` under
`3_expert/` and the module links are re-pointed from `3_expert/`.

## Agent Teams و Dynamic Workflows

همه‌ی loop‌هایی که تا اینجا دیدیم رو یه آدم طراحی کرده: script فقط کورکورانه تکرار می‌کنه، معیارها رو تو می‌نویسی، و ساختار کار یا مال خودته یا یه الگوی شناخته‌شده مثل Ralph.

قدم بعدی اینه که طراحی و اجرای loop رو هم بسپری به خود agent. برای آخرین بار برگردیم سراغ ماشین: اینجا AI فقط رانندگی نمی‌کنه، مسیر رو هم خودش انتخاب می‌کنه. یعنی یه AI داریم که بقیه‌ی AI‌ها رو هماهنگ می‌کنه.

ولی حواست باشه این دو تا دقیقاً چی هستن. agent teams و dynamic workflows **معماری‌های پیشرفته‌ی multi-agent** هستن و روی الگوهای [Multi-Agent Systems](../1_fundamentals/multi_agent_fa.md) ساخته شدن، پس با خود loop engineering قاطیشون نکن. loop engineering یه روش کاره: تو تعیین می‌کنی چی اجرا رو راه بندازه، چی به agent بدی و کِی وایسه. agent teams و dynamic workflows معماری‌هایی هستن که به کار این روش میان و کمک می‌کنن همین کار رو توی مقیاس خیلی بزرگ‌تری انجام بدی.

Claude Code برای این کار دو تا قابلیت داره که ساختارشون با هم فرق داره.

### Agent Teams

agent team یعنی چند تا session کامل Claude Code که با هم کار می‌کنن. یکی‌شون سرگروهه (lead): کار رو به یه task list مشترک می‌شکنه، بقیه رو راه می‌ندازه و آخر سر نتیجه‌ها رو جمع‌وجور می‌کنه. هر هم‌تیمی (teammate) context window خودش رو داره، task‌ها رو خودش از لیست مشترک برمی‌داره، و به‌جای اینکه فقط به سرگروه گزارش بده، مستقیم با بقیه‌ی هم‌تیمی‌ها پیام رد و بدل می‌کنه.

این‌طوری تقریباً ناخواسته یه loop شکل می‌گیره: سرگروه حواسش به کار بقیه هست و تصمیم می‌گیره قدم بعدی چی باشه، یعنی همون کاری که قبلاً خودت می‌کردی.

![Subagent‌ها و agent team کنار هم](./images/subagents-vs-teams.png)  
*به دایره‌های خط‌چین سمت چپ دقت کن: وقتی کار یه subagent تموم می‌شه، فقط نتیجه‌ش می‌مونه، و همه‌ی اون کار فقط به agent اصلی برمی‌گرده. سمت راست، چیزی سر راهش به بالا خلاصه نمی‌شه، چون هیچ window‌ی نیست که همه‌چیز رو ببینه. هزینه‌ی token بیشتری که توی جدول پایین می‌بینی از همین‌جا میاد، و برای همینه که ممکنه رشته‌ی کار تیم از دست خود سرگروه هم در بره.*

[Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams) این دو تا رو این‌طوری با هم مقایسه می‌کنه:

| | Subagents | Agent teams |
| --- | --- | --- |
| Context | context window خودش رو داره؛ نتیجه برمی‌گرده به agent‌ی که صداش زده | context window خودش رو داره؛ کاملاً مستقله |
| ارتباط | نتیجه رو به agent‌ی که صداش زده برمی‌گردونه. subagent‌هایی که Claude موقع راه انداختنشون براشون اسم گذاشته، می‌تونن به هم پیام هم بدن | هم‌تیمی‌ها مستقیم به هم پیام می‌دن |
| هماهنگی | agent اصلی همه‌ی کارها رو مدیریت می‌کنه | خودشون با پیام دادن به هم و یه task list مشترک هماهنگ می‌شن |
| مناسب برای | کارهای مشخصی که فقط نتیجه‌شون مهمه | کارهای پیچیده‌ای که بحث و همفکری لازم دارن |
| هزینه‌ی token | کمتر: نتیجه‌ها خلاصه می‌شن و برمی‌گردن به context اصلی | بیشتر: هر هم‌تیمی یه instance جدای Claude‌ه |

ردیف آخر از همه مهم‌تره. هر هم‌تیمی یه instance کامل و جداست، پس هزینه با تعداد هم‌تیمی‌ها بالا می‌ره. معمولاً سه تا هم‌تیمی که هر کدوم روی یه کار مشخص متمرکزن، از پنج تایی که هر کدوم یه طرف می‌رن بهتر جواب می‌دن، و خود مستندات هم پیشنهاد می‌کنه با سه تا پنج تا شروع کنی.

> **نکته:** agent teams هنوز آزمایشی‌ان و به‌طور پیش‌فرض خاموشن. برای روشن کردنشون `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` رو ست کن.

### Dynamic Workflows

dynamic workflow یه script به زبان JavaScript‌ه که کلی subagent رو هم‌زمان هماهنگ می‌کنه. Claude این script رو برای کاری که شرح دادی می‌نویسه، بعد یه runtime توی پس‌زمینه اجراش می‌کنه و session خودت آزاد می‌مونه.

فرق اصلیش با همه‌ی چیزهای قبلی اینه که **plan دست کیه**. با subagent‌ها، skill‌ها و agent teams، Claude نقش orchestrator رو داره و هر نوبت خودش تصمیم می‌گیره بعدش چی اجرا بشه. ولی workflow این تصمیم رو می‌بره توی کد: loop، شاخه‌ها و همه‌ی نتیجه‌های میانی دست script‌ه، و تنها چیزی که به context تو می‌رسه جواب نهاییه.

جدول زیر از [Orchestrate subagents at scale with dynamic workflows](https://code.claude.com/docs/en/workflows) اومده:

| | Subagents | Skills | Agent teams | Workflows |
| --- | --- | --- | --- | --- |
| چیه | یه worker که Claude راه می‌ندازه | دستورالعمل‌هایی که Claude ازشون پیروی می‌کنه | یه agent سرگروه که حواسش به چند تا session هم‌سطحه | یه script که runtime اجراش می‌کنه |
| کی تصمیم می‌گیره بعدش چی اجرا بشه | Claude، هر نوبت | Claude، طبق prompt | agent سرگروه، هر نوبت | خود script |
| نتیجه‌های میانی کجا می‌مونن | context window خود Claude | context window خود Claude | یه task list مشترک | متغیرهای script |
| چی رو می‌شه دوباره به کار برد | تعریف worker | دستورالعمل‌ها | تعریف تیم | خود orchestration |
| مقیاس | چند تا task واگذارشده توی هر نوبت | مثل subagent‌ها | چند تا session هم‌سطح که مدت طولانی کار می‌کنن | ده‌ها تا صدها agent توی هر اجرا |
| اگه وسطش قطع بشه | نوبت از اول شروع می‌شه | نوبت از اول شروع می‌شه | هم‌تیمی‌ها به کارشون ادامه می‌دن | می‌شه توی همون session از همون‌جا ادامه‌ش داد |

دو تا از این ردیف‌ها ارزش دارن بیشتر روشون مکث کنی. اولیش ردیف **مقیاس** هست: یه workflow توی یه اجرا ده‌ها تا صدها agent راه می‌ندازه، در حالی که یه تیم فقط چند تا. script از پس این کار برمیاد چون برای اینکه یادش بمونه داره چی کار می‌کنه، به context window احتیاج نداره. دومی ردیف **چی رو می‌شه دوباره به کار برد** هست: توی تیم، تعریف تیم رو دوباره استفاده می‌کنی، ولی توی workflow خود orchestration تبدیل می‌شه به یه فایل که می‌تونی بخونیش، ویرایشش کنی، دوباره اجراش کنی و commit‌ش کنی.

یه الگوی کیفیت هم دستت میاد که از راه دیگه به‌سختی می‌شه بهش رسید. چون اختیار دست script‌ه، می‌تونه چند تا agent مستقل رو بفرسته که قبل از گزارش شدن یافته‌ها، به یافته‌های همدیگه ایراد بگیرن؛ یا یه plan رو از چند زاویه بنویسه و این زاویه‌ها رو با هم سبک‌سنگین کنه. پس فقط تعداد agent‌ها بیشتر نمی‌شه، agent‌هایی داری که کار همدیگه رو چک می‌کنن.

برای روشن کردنش `/effort ultracode` رو بزن؛ این دستور بالاترین سطح reasoning رو با orchestration خودکار workflow ترکیب می‌کنه. اگه هم فقط برای یه کار می‌خوایش، کلمه‌ی `ultracode` رو توی همون یه prompt بنویس تا فقط همون task به شکل workflow اجرا بشه.

## Recursive Language Models

dynamic workflow‌ها فقط به خاطر loop engineering به وجود نیومدن؛ در واقع شکل عملیِ ایده‌ای به اسم **recursive language model** (RLM) هم هستن. این ایده از مقاله‌ی [Recursive Language Models](https://arxiv.org/abs/2512.24601) اومده که Alex Zhang، Tim Kraska و Omar Khattab توی MIT نوشتن.

یه مدل معمولی کل prompt رو یه‌جا توی context window‌ش می‌گیره، ولی RLM نه. توی RLM، prompt بلند به شکل یه متغیر توی یه محیط Python می‌مونه و مدل اولش فقط یه چیزهای مختصری درباره‌ش می‌بینه: چقدر طوله، اولش چی نوشته، و چطوری می‌شه تیکه‌هاش رو خوند. بعد خود مدل کد می‌نویسه تا با اون متغیر کار کنه: یه برش ازش رو نگاه کنه، با grep توش بگرده، یا به چند تا chunk تقسیمش کنه.

روی هر کدوم از این تیکه‌ها هم می‌تونه دوباره یه مدل رو صدا بزنه، حتی یه نسخه‌ی دیگه از خودش؛ اسم «recursive» دقیقاً از همین صدا زدن‌ها میاد. فقط نتیجه‌ی این call‌ها برمی‌گرده توی context window اصلی، پس window هیچ‌وقت مجبور نمی‌شه کل ورودی رو توی خودش نگه داره. این‌طوری یه مدل جوری رفتار می‌کنه که انگار window‌ش ته نداره. dynamic workflow همین ایده رو در مقیاس بزرگ‌تر پیاده می‌کنه: script ورودی و نتیجه‌های میانی رو توی متغیرها نگه می‌داره و کلی agent روی تیکه‌ها کار می‌کنن. این‌طوری یه script پر از agent کم‌کم شبیه یه مدل واحد با window بی‌انتها می‌شه.

اینجا دو تا نکته راحت با هم قاطی می‌شن، پس بذار رک و راست بگیمشون.

- **RLM همون loop engineering نیست.** نه تعیین می‌کنه چی اجرا رو راه بندازه، نه اینکه کِی تموم بشه. ولی هم loop engineering رو ممکن می‌کنه و هم بهترش می‌کنه، چون loop‌ی که چند روز کار می‌کنه بالاخره باید راهی داشته باشه که با متنی بیشتر از ظرفیت یه window کار کنه.
- **RLM یه معماری single-agent‌ه.** یعنی توضیح می‌ده یه agent از داخل چطور کار می‌کنه: یه مدل که از طریق کد خودش رو صدا می‌زنه. درسته که کلی call به مدل می‌زنه، ولی با معماری‌های multi-agent بالا اشتباهش نگیر.

**CodeAct** که از مقاله‌ی [Executable Code Actions Elicit Better LLM Agents](https://arxiv.org/abs/2402.01030) اومده، فامیل نزدیک همین ایده‌ست: به‌جای tool call‌های JSON، کد اجرایی رو action space agent می‌کنه، یعنی agent کارهاش رو با نوشتن کد انجام می‌ده. [Advanced Agent Architectures](../3_expert/advanced_agent_architectures.md) هر دو رو مفصل توضیح می‌ده. [یادداشت Alex Zhang](https://alexzhang13.github.io/blog/2025/rlm/) نسخه‌ی خوش‌خوان‌تر مقاله‌ست و [rlm](https://github.com/alexzhang13/rlm) هم کتابخونه‌شه.

## منابع

### 📄 مقاله‌ها

- [Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams): agent teams، task list مشترک، و معماری پشتش
- [Orchestrate subagents at scale with dynamic workflows](https://code.claude.com/docs/en/workflows): یه workflow script چه شکلیه، محدودیت‌هاش، و مقایسه‌ی چهارتایی
- [Executable Code Actions Elicit Better LLM Agents](https://arxiv.org/abs/2402.01030): CodeAct، که توش کد می‌شه action space
- [Recursive Language Models](https://arxiv.org/abs/2512.24601): خود مقاله، همراه با [یادداشت Alex Zhang](https://alexzhang13.github.io/blog/2025/rlm/) و کتابخونه‌ی [rlm](https://github.com/alexzhang13/rlm)
