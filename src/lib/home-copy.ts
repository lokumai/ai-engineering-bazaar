/**
 * Every word the home page says, in one table keyed by language.
 *
 * The author's rule (2026-11-09): **only content is multilingual, never menus.**
 * So the front door has three addresses (`/`, `/tr/`, `/fa/`) and the bar, the
 * footer and every page the door leads to stay English. This file is the content
 * half of that rule: the headline, the lede and the way in, the four mottos, the
 * question and the two stalls with their tellers' stories, the seven people at
 * the gate with their trades and stories, and the sentence about which track the
 * doors open. Nothing else on the page is a sentence.
 *
 * ## One table, not three pages (and not a message-catalogue library)
 *
 * `HOME_COPY` is keyed by `ReadingLang`, the registry's own type
 * (`content/languages.ts`), and each language's route renders the SAME component
 * (`components/home/HomeStreet.tsx`) with its row. *Three copies of the page*
 * was rejected: the walk, the clouds and the chase are about a thousand lines of
 * measurement that a copy would fork. *A message-catalogue library* was rejected
 * too: it is one page with about forty strings, no plurals and no interpolation,
 * and a dependency would add a runtime to a page whose only script is the walk.
 * The shape is fixed by `HomeCopy`, so a language that lacks a string does not
 * typecheck, and `tests/unit/home-copy.test.ts` checks the same thing at run
 * time, from the table, without writing a word of it down.
 *
 * ## What stays English, on purpose
 *
 * - **The characters' names** (Mihrî, Dariush, Deniz, Bit, Murat, Mei, Piri, the
 *   Sipahi, the Bezirgân) are names, written as they are written. They live in
 *   `street/cast.ts` and in the page, not here.
 * - **The levels on the doors** are the catalog's own titles, derived from
 *   `curriculum.yaml`; a door opens the English catalog, so it is named as the
 *   catalog names it.
 * - **The words painted on the scenes** (`Prompt`, `Model`, `Answer` on the
 *   lantern, `Articles`, `Sources`, `Videos` on the signpost, `AI` on Bit's
 *   chest) are drawing, and the drawing does not change with the language.
 * - **Technical words** (AI, LLM, meme, brain rot) are not translated, the way a
 *   module keeps them (`mini-courses/CLAUDE.md`, "Translating a module").
 *
 * ## Why this file is outside `components/home`
 *
 * The copy register (`tests/unit/copy-register.test.ts`) scans that folder, and
 * the English here is the author's own words: the mottos say "We" and the lede
 * says "simple" ("in the author's words", D79). The register is for the site's
 * own voice. The translations keep its bans anyway, in the one form that holds
 * in every language: `home-copy.test.ts` forbids an exclamation mark, a polite
 * "please" or "sorry" and, for Persian, a tatweel or a non-ASCII digit.
 *
 * ## How the two translations were written
 *
 * Turkish is plain and warm, the reader as `sen`. Persian is everyday spoken
 * Persian written down (`می‌شه`, `یه`, `رو`), the reader as `تو`, ASCII digits,
 * a zero-width non-joiner where a suffix joins a Latin word. Each story keeps the
 * gentle idea it carries in English (the Sipahi trusts what he has seen work, the
 * Bezirgân blames the explanation and never the buyer, Piri writes a doubt on the
 * map) rather than its sentences: the meaning, never the phrase.
 */
import type { ReadingLang } from '@/lib/content/languages'
import type { CastId } from '@/components/home/street/cast'

/** The four stalls, by the scene each one acts out (`street/art/stall-*.html`). */
export type StallId = 'draft' | 'sieve' | 'lantern' | 'signpost'

/** The two tracks, as the street names them (`street/track.ts`). */
export type TrackId = 'eng' | 'all'

export interface Motto {
  title: string
  sub?: string
  body: string
}

export interface HomeCopy {
  /** The page's `<meta name="description">`. */
  description: string
  hero: {
    /** The headline's two lines: the break between them is the author's. */
    first: string
    second: string
    lede: string
    /** The button to the catalog. */
    open: string
  }
  /** The accessible name of the mottos' region. */
  mottosLabel: string
  mottos: Record<StallId, Motto>
  /** "How would you like to read?" */
  question: string
  tracks: Record<TrackId, {
    name: string
    body: string
    /** The sign's own action, before it is chosen. */
    choose: string
    teller: {
      /** The teller's trade, in brackets after his name: `Sipahi (Horseman)`. */
      alias: string
      story: string
    }
  }>
  /** Said on a sign once it is chosen, beside a tick. */
  chosen: string
  /** The accessible name of the five doors. */
  doorsLabel: string
  /**
   * The line under the doors, in two halves that wrap a track's name:
   * `<lead>For Engineers<tail>`. The name is substituted by `street/track.ts`
   * from the sign's own text, so a language writes the sentence once around it.
   */
  opens: { lead: string; tail: string }
  other: { lead: string; tail: string }
  /** The accessible name of the people at the gate. */
  castLabel: string
  cast: Record<CastId, { trade: string; story: string }>
}

const EN: HomeCopy = {
  description:
    'The front door: what this course is, why it is written the way it is, and '
    + 'the way in to every level.',
  hero: {
    first: 'AI Engineering,',
    second: 'written by the people who build it.',
    lede: 'AI Engineering, made simple, short and useful.',
    open: 'Open the curriculum',
  },
  mottosLabel: 'Why this course',
  mottos: {
    draft: {
      title: 'Written by Humans. No AI Slop.',
      body:
        'LLMs only know what shows up often enough in their training data. The newest AI engineering '
        + 'topics are not there yet, so a model cannot teach them well. Every module here is written '
        + 'by AI engineers who build this for a living.',
    },
    sieve: {
      title: 'We only cover essentials.',
      sub: 'A cheatsheet for AI engineering, not a textbook.',
      body:
        'Learn the most important topics here. Learn the details yourself later. We teach the ideas '
        + 'that matter most, and nothing else.',
    },
    lantern: {
      title: 'Pictures do most of the work.',
      body:
        'Every module comes with pictures, diagrams and code. Often there are memes too, and '
        + 'sometimes even a little brain rot, because a good meme can explain an idea in one look.',
    },
    signpost: {
      title: 'Every module points you somewhere next.',
      body:
        'Each module ends with links to extra articles, sources and videos, for when you want to go deeper.',
    },
  },
  question: 'How would you like to read?',
  tracks: {
    eng: {
      name: 'For Engineers',
      body: 'The technical modules: how each part works, with the code and the numbers behind it.',
      choose: 'Choose For Engineers',
      teller: {
        alias: 'Horseman',
        story:
          'Before a long ride, the Sipahi checks every strap and buckle with his own hands. He trusts what he has seen work, so this road shows each part, with its code and its numbers.',
      },
    },
    all: {
      name: 'For Everyone',
      body: 'The same modules in plain words, for readers with no technical background.',
      choose: 'Choose For Everyone',
      teller: {
        alias: 'Merchant',
        story:
          'The Bezirgân sells to buyers from many lands, so he explains every good in plain words. If a buyer cannot follow him, he says, the fault is in the explanation, never in the buyer.',
      },
    },
  },
  chosen: 'Chosen',
  doorsLabel: 'Levels',
  opens: { lead: 'These doors open ', tail: '.' },
  other: { lead: 'Open them ', tail: ' instead' },
  castLabel: 'The people at the gate',
  cast: {
    mihri: {
      trade: 'poet',
      story: 'Mihrî of Amasya wrote the oldest book of poems by an Ottoman woman that still survives. She said what she meant in plain words.',
    },
    dariush: {
      trade: 'carpet merchant',
      story: 'Dariush brought his carpets from Iran, each one tied by hand, knot by knot. He says you only see the pattern when you step back.',
    },
    deniz: {
      trade: 'simit seller',
      story: "Deniz sells his father's simit at the gate every morning. He is the first to see who comes in, and the first to call out to them.",
    },
    bit: {
      trade: 'AI robot',
      story: 'Bit was built to answer questions. In the bazaar it found more questions than it could answer, so it went inside to learn.',
    },
    murat: {
      trade: 'Janissary',
      story: 'Murat guards the gate. He has watched every kind of trader pass through it, and he lets in anyone who comes to learn.',
    },
    mei: {
      trade: 'silk trader',
      story: 'Mei carried her silk along the long road from the east. She writes down every bolt she sells, because a trader who forgets loses money.',
    },
    piri: {
      trade: 'map-maker',
      story: 'Piri draws maps for sailors. Where he is not sure of a coast, he writes so on the map, because a wrong map is worse than no map.',
    },
  },
}

const TR: HomeCopy = {
  description:
    'Ön kapı: bu kursun ne olduğu, neden bu şekilde yazıldığı ve her seviyeye açılan yol.',
  hero: {
    first: 'AI Mühendisliği,',
    second: 'onu inşa edenlerin kaleminden.',
    lede: 'AI Mühendisliğini sade, kısa ve işe yarar şekilde anlatıyoruz.',
    open: 'Müfredatı aç',
  },
  mottosLabel: 'Neden bu kurs',
  mottos: {
    draft: {
      title: 'İnsanlar yazdı. AI çöpü yok.',
      body:
        'LLM\'ler yalnızca eğitim verilerinde yeterince sık geçen şeyleri bilir. En yeni AI mühendisliği '
        + 'konuları henüz orada yok, bu yüzden bir model bunları iyi öğretemez. Buradaki her modülü, bu işi '
        + 'mesleği olarak yapan AI mühendisleri yazıyor.',
    },
    sieve: {
      title: 'Yalnızca temel olanı anlatıyoruz.',
      sub: 'AI mühendisliği için bir kopya kâğıdı, ders kitabı değil.',
      body:
        'En önemli konuları burada öğren, ayrıntıları sonra kendin öğrenirsin. En çok işe yarayan '
        + 'fikirleri anlatıyoruz, gerisini anlatmıyoruz.',
    },
    lantern: {
      title: 'İşin çoğunu resimler yapıyor.',
      body:
        'Her modülde resimler, diyagramlar ve kod var. Çoğu zaman meme\'ler de çıkar, bazen biraz brainrot '
        + 'bile, çünkü iyi bir meme bir fikri tek bakışta anlatabilir.',
    },
    signpost: {
      title: 'Her modül seni bir sonrakine yönlendirir.',
      body:
        'Her modül, daha derine inmek istediğinde bakabileceğin ek makalelere, kaynaklara ve videolara '
        + 'giden bağlantılarla biter.',
    },
  },
  question: 'Nasıl okumak istersin?',
  tracks: {
    eng: {
      name: 'Mühendisler İçin',
      body: 'Teknik modüller: her parçanın nasıl çalıştığı, arkasındaki kod ve sayılarla birlikte.',
      choose: 'Mühendisler İçin yolunu seç',
      teller: {
        alias: 'Süvari',
        story:
          'Uzun bir yola çıkmadan önce Sipahi her kayışı ve tokayı kendi elleriyle kontrol eder. '
          + 'Çalıştığını gördüğüne güvenir, bu yüzden bu yol her parçayı koduyla ve sayılarıyla gösterir.',
      },
    },
    all: {
      name: 'Herkes İçin',
      body: 'Aynı modüller, teknik geçmişi olmayan okurlar için sade bir dille.',
      choose: 'Herkes İçin yolunu seç',
      teller: {
        alias: 'Tüccar',
        story:
          'Bezirgân birçok ülkeden gelen alıcılara mal satar, bu yüzden her malı sade bir dille anlatır. '
          + 'Bir alıcı onu anlayamıyorsa, der, kusur anlatımdadır, alıcıda değil.',
      },
    },
  },
  chosen: 'Seçildi',
  doorsLabel: 'Seviyeler',
  opens: { lead: 'Kapılar ', tail: ' yoluna açılıyor.' },
  other: { lead: 'Bunun yerine ', tail: ' yolunu aç' },
  castLabel: 'Kapıdaki insanlar',
  cast: {
    mihri: {
      trade: 'şair',
      story: 'Amasyalı Mihrî, bir Osmanlı kadınından günümüze ulaşan en eski şiir kitabını yazdı. Ne demek istiyorsa onu sade sözlerle söyledi.',
    },
    dariush: {
      trade: 'halı tüccarı',
      story: 'Dariush halılarını İran\'dan getirdi, her biri elle, düğüm düğüm dokunmuş. Deseni ancak bir adım geri çekilince görürsün, der.',
    },
    deniz: {
      trade: 'simitçi',
      story: 'Deniz her sabah kapıda babasının simitlerini satar. İçeri girenleri ilk o görür, onlara ilk seslenen de o olur.',
    },
    bit: {
      trade: 'AI robotu',
      story: 'Bit soruları yanıtlamak için yapıldı. Çarşıda yanıtlayabileceğinden fazla soru buldu, o da öğrenmek için içeri girdi.',
    },
    murat: {
      trade: 'Yeniçeri',
      story: 'Murat kapıyı bekler. Buradan geçen her çeşit tüccarı görmüştür, öğrenmeye gelen herkesi içeri alır.',
    },
    mei: {
      trade: 'ipek tüccarı',
      story: 'Mei ipeğini doğudan gelen uzun yoldan taşıdı. Sattığı her top ipeği deftere yazar, çünkü unutan tüccar zarar eder.',
    },
    piri: {
      trade: 'haritacı',
      story: 'Piri denizciler için harita çizer. Bir kıyıdan emin olmadığı yere bunu haritaya yazar, çünkü yanlış harita, haritasız kalmaktan beterdir.',
    },
  },
}

const FA: HomeCopy = {
  description:
    'در ورودی: این دوره چیه، چرا این‌طوری نوشته شده و راه رسیدن به هر سطح.',
  hero: {
    first: 'مهندسی AI،',
    second: 'نوشته‌ی کسایی که خودشون می‌سازنش.',
    lede: 'مهندسی AI رو ساده، کوتاه و به‌دردبخور توضیح می‌دیم.',
    open: 'سرفصل‌ها رو ببین',
  },
  mottosLabel: 'چرا این دوره',
  mottos: {
    draft: {
      title: 'نوشته‌ی آدم‌ها، بدون محتوای آشغال AI.',
      body:
        'LLM‌ها فقط چیزایی رو بلدن که تو داده‌های آموزشی‌شون به‌اندازه‌ی کافی تکرار شده باشه. '
        + 'جدیدترین موضوع‌های مهندسی AI هنوز اونجا نیست، برای همین یه مدل نمی‌تونه خوب یادشون بده. '
        + 'هر ماژولِ اینجا رو مهندس‌های AI نوشتن که کارشون ساختن همین چیزهاست.',
    },
    sieve: {
      title: 'فقط چیزای ضروری رو می‌گیم.',
      sub: 'یه cheatsheet برای مهندسی AI، نه یه کتاب درسی.',
      body:
        'مهم‌ترین موضوع‌ها رو همین‌جا یاد بگیر و جزئیات رو بعداً خودت یاد می‌گیری. '
        + 'ما ایده‌هایی رو یاد می‌دیم که از همه مهم‌ترن، و چیز دیگه‌ای نه.',
    },
    lantern: {
      title: 'تصویرها بیشترِ کار رو می‌کنن.',
      body:
        'هر ماژول تصویر، نمودار و کد داره. خیلی وقتا میم هم هست و گاهی حتی یه‌کم brain rot، '
        + 'چون یه میمِ خوب می‌تونه یه ایده رو تو یه نگاه برسونه.',
    },
    signpost: {
      title: 'هر ماژول بهت می‌گه بعدش کجا بری.',
      body:
        'هر ماژول با لینک مقاله‌ها، منبع‌ها و ویدیوهای بیشتر تموم می‌شه، برای وقتی که می‌خوای عمیق‌تر بری.',
    },
  },
  question: 'دوست داری چطوری بخونی؟',
  tracks: {
    eng: {
      name: 'برای مهندس‌ها',
      body: 'ماژول‌های فنی: هر بخش چطوری کار می‌کنه، با کد و عددهای پشتش.',
      choose: 'مسیر «برای مهندس‌ها» رو انتخاب کن',
      teller: {
        alias: 'سوارکار',
        story:
          'قبل از یه سواری طولانی، Sipahi تک‌تک بندها و سگک‌ها رو با دست خودش چک می‌کنه. '
          + 'به چیزی اعتماد می‌کنه که دیده کار می‌کنه، برای همین این مسیر هر بخش رو با کد و عددهاش نشون می‌ده.',
      },
    },
    all: {
      name: 'برای همه',
      body: 'همون ماژول‌ها با زبون ساده، برای کسایی که پیشینه‌ی فنی ندارن.',
      choose: 'مسیر «برای همه» رو انتخاب کن',
      teller: {
        alias: 'بازرگان',
        story:
          'Bezirgân به خریدارهایی از کشورهای مختلف جنس می‌فروشه، برای همین هر کالا رو با زبون ساده توضیح می‌ده. '
          + 'می‌گه اگه خریدار حرفش رو نفهمه، تقصیر توضیحه، نه خریدار.',
      },
    },
  },
  chosen: 'انتخاب شد',
  doorsLabel: 'سطح‌ها',
  opens: { lead: 'این درها به مسیر ', tail: ' باز می‌شن.' },
  other: { lead: 'به‌جاش مسیر ', tail: ' رو باز کن' },
  castLabel: 'آدم‌های دم دروازه',
  cast: {
    mihri: {
      trade: 'شاعر',
      story: 'Mihrî اهل آماسیه قدیمی‌ترین کتاب شعری رو نوشت که از یه زن عثمانی باقی مونده. هر چی می‌خواست بگه رو با حرف‌های ساده گفت.',
    },
    dariush: {
      trade: 'فرش‌فروش',
      story: 'Dariush فرش‌هاش رو از ایران آورد، هر کدوم دست‌باف و گره به گره. می‌گه الگو رو فقط وقتی می‌بینی که یه قدم عقب بیای.',
    },
    deniz: {
      trade: 'سیمیت‌فروش',
      story: 'Deniz هر روز صبح جلوی دروازه سیمیت‌های پدرش رو می‌فروشه. اولین کسیه که می‌بینه کی داره وارد می‌شه، و اولین کسی که صداشون می‌زنه.',
    },
    bit: {
      trade: 'ربات AI',
      story: 'Bit ساخته شد که به سؤال‌ها جواب بده. تو بازار سؤال‌هایی پیدا کرد که بیشتر از چیزی بود که می‌تونست جواب بده، برای همین رفت تو تا یاد بگیره.',
    },
    murat: {
      trade: 'ینی‌چری',
      story: 'Murat نگهبان دروازه‌ست. همه‌جور تاجری رو دیده که از اینجا رد می‌شه، و هر کسی که اومده یاد بگیره رو راه می‌ده.',
    },
    mei: {
      trade: 'ابریشم‌فروش',
      story: 'Mei ابریشمش رو از راه دراز شرق آورد. هر طاقه‌ای که می‌فروشه رو یادداشت می‌کنه، چون تاجری که فراموش کنه ضرر می‌کنه.',
    },
    piri: {
      trade: 'نقشه‌کش',
      story: 'Piri برای دریانوردها نقشه می‌کشه. جایی از ساحل که مطمئن نیست رو روی نقشه می‌نویسه، چون یه نقشه‌ی غلط از بی‌نقشه‌بودن بدتره.',
    },
  },
}

/** Every language the home page can be read in, by its registry id. */
export const HOME_COPY: Readonly<Record<ReadingLang, HomeCopy>> = {
  en: EN,
  tr: TR,
  fa: FA,
}
