/**
 * D133 — the words a module page itself prints, in the language the page is read in.
 *
 * The author, 2026-11-11: the menus stay English and the content page becomes fully
 * translated, so that "the only thing that becomes multilingual is the content page that
 * people read and interact with". D113 had left these words English while the prose was
 * translated, which made a Turkish or Persian reader meet `Mark this module as complete`
 * and `Question 1 of 5` in the middle of their own language.
 *
 * ## The boundary
 *
 * Translated here: what the reading column and its own controls say (the prerequisites box,
 * the objectives heading, the contents rail, the completion control, the pager's labels, the
 * quiz, the reading-time line and the page's drawer). NOT translated, and not in this file:
 * the bar, the footer, the catalog, the progress page, search, the breadcrumb and the language
 * menu, and every module and level NAME, which is a proper noun the catalog also prints and
 * which the pager and the prerequisite list therefore keep as the English they link to.
 * The words the build writes into the prose (`Copy`, `Expand diagram`, `Link to "…"`) are
 * part of the markup the content bundle carries too (ARCHITECTURE §13), so they stay.
 *
 * ## Shape
 *
 * One table typed `Record<ReadingLang, PageCopy>`, so a missing key in `tr` or `fa` fails
 * `tsc`. A string that depends on a number is a function, because Turkish and Persian do not
 * form a plural the way English does and a template with an `s` on the end is the English
 * grammar in a Turkish sentence. Turkish groups thousands with `.`; Persian keeps ASCII
 * digits and the `,` the corpus uses (mini-courses/CLAUDE.md, "Persian"), and Persian
 * punctuation. Never tatweel, and no zero-width joiner before a suffix on a Latin word.
 *
 * Rejected: translating the module names (the catalog and the pager would then name one
 * module two ways), and a library (`next-intl` and its kind): this is 30 strings in three
 * languages, read at build time, with no runtime switching and no locale detection.
 */

import { type ReadingLang, dirOf, langAttr } from './languages'

export type RefusalKind = 'quota' | 'blocked' | 'too-large'

export interface PageCopy {
  /** The prerequisites box's title, and the tag on one that is not written. */
  beforeYouStart: string
  planned: string
  /** The objectives card's heading. */
  objectives: string
  /** The contents rail's label and the accessible name of its list. */
  onThisPage: string
  sections: string
  /** The drawer that holds the rail below the width where it fits beside the prose. */
  contents: string
  close: string
  /** The replay control an animated recording carries, over its top-right corner. */
  replay: string
  completion: {
    region: string
    label: string
    completedOn: (date: string) => string
    refused: Record<RefusalKind, string>
    notSaved: (reason: string) => string
    exportLink: string
    exportAfter: string
  }
  pager: { previous: string; next: string; start: string; end: string; planned: string }
  quizHead: { title: string; sub: (questions: number) => string }
  quiz: {
    progress: (at: number, total: number) => string
    startOver: string
    previous: string
    next: string
    seeResults: string
    backToQuestions: string
    correct: string
    wrong: (letter: string) => string
    /** The score line in three parts, so the number can be set in bold wherever it falls. */
    score: (right: number, total: number) => readonly [before: string, strong: string, after: string]
    right: string
    notRight: string
  }
  /** `30 min · 2,931 words`. */
  readingTime: (minutes: number, words: number) => string
  notWritten: { lead: string; readEngineers: string; seeWritten: string }
  /** The reader's own calendar date, written out in this language. */
  date: (iso: string) => string
}

function groups(n: number, separator: string): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, separator)
}

/** `2026-11-11` to `[day, month index, year]`, or `null` for a string that is not a date. */
function parts(iso: string): readonly [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (match === null) return null
  const month = Number(match[2]) - 1
  return month < 0 || month > 11 ? null : [Number(match[3]), month, Number(match[1])]
}

/**
 * The month names are written out rather than asked of `Intl`: a Persian locale answers in
 * Persian digits and the Jalali calendar, which the corpus's ASCII-digit rule rules out, and
 * a table gives one answer on every machine the build and the browser run on.
 */
function dated(months: readonly string[]): (iso: string) => string {
  return (iso) => {
    const found = parts(iso)
    return found === null ? iso.slice(0, 10) : `${found[0]} ${months[found[1]]} ${found[2]}`
  }
}

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const FA_MONTHS = [
  'ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر',
]

export const PAGE_COPY: Record<ReadingLang, PageCopy> = {
  en: {
    beforeYouStart: 'Before you start',
    planned: 'Planned',
    objectives: 'What you will be able to do',
    onThisPage: 'On this page',
    sections: 'Sections',
    contents: 'Contents',
    close: 'Close',
    replay: 'Replay',
    completion: {
      region: 'Module completion',
      label: 'Mark this module as complete',
      completedOn: (date) => `Completed ${date}`,
      refused: {
        quota: "This browser's storage is full",
        blocked: 'This browser is not storing data for this site',
        'too-large': 'The record is larger than this page will write',
      },
      notSaved: (reason) => `Not saved: ${reason}.`,
      exportLink: 'Export your record',
      exportAfter: ' to keep it.',
    },
    pager: { previous: 'Previous', next: 'Next', start: 'Start of the course', end: 'End of the course', planned: 'Planned' },
    quizHead: {
      title: 'Want a quick quiz?',
      sub: (questions) => `${questions} questions on the main points of this module`,
    },
    quiz: {
      progress: (at, total) => `Question ${at} of ${total}`,
      startOver: 'Start over',
      previous: 'Previous',
      next: 'Next',
      seeResults: 'See results',
      backToQuestions: 'Back to the questions',
      correct: 'Correct.',
      wrong: (letter) => `Not this one. The answer is ${letter}.`,
      score: (right, total) => ['', `${right} of ${total}`, ' answered correctly'],
      right: ', correct',
      notRight: ', not correct',
    },
    readingTime: (minutes, words) => `${minutes} min · ${groups(words, ',')} words`,
    notWritten: {
      lead: 'The For Everyone version of this module is not written yet.',
      readEngineers: 'Read it For Engineers',
      seeWritten: 'See what is written For Everyone',
    },
    date: dated(EN_MONTHS),
  },
  tr: {
    beforeYouStart: 'Ön koşullar',
    planned: 'Planlandı',
    objectives: 'Neler öğreneceksin',
    onThisPage: 'Bu sayfada',
    sections: 'Bölümler',
    contents: 'İçindekiler',
    close: 'Kapat',
    replay: 'Baştan oynat',
    completion: {
      region: 'Modül tamamlama',
      label: 'Bu modülü tamamlandı olarak işaretle',
      completedOn: (date) => `Tamamlandı: ${date}`,
      refused: {
        quota: 'Bu tarayıcının depolama alanı dolu',
        blocked: 'Bu tarayıcı bu site için veri saklamıyor',
        'too-large': 'Kayıt, bu sayfanın yazabileceğinden büyük',
      },
      notSaved: (reason) => `Kaydedilmedi: ${reason}.`,
      exportLink: 'Kaydını dışa aktar',
      exportAfter: ' ki elinde kalsın.',
    },
    pager: { previous: 'Önceki', next: 'Sonraki', start: 'Kursun başı', end: 'Kursun sonu', planned: 'Planlandı' },
    quizHead: {
      title: 'Kısa bir test çözmek ister misin?',
      sub: (questions) => `Bu modülün ana konularına dair ${questions} soru`,
    },
    quiz: {
      progress: (at, total) => `Soru ${at} / ${total}`,
      startOver: 'Baştan başla',
      previous: 'Önceki',
      next: 'Sonraki',
      seeResults: 'Sonuçları gör',
      backToQuestions: 'Sorulara dön',
      correct: 'Doğru.',
      wrong: (letter) => `Yanlış. Doğru cevap ${letter}.`,
      score: (right, total) => ['Doğru cevap sayın: ', `${right} / ${total}`, ''],
      right: ', doğru',
      notRight: ', yanlış',
    },
    readingTime: (minutes, words) => `${minutes} dk · ${groups(words, '.')} kelime`,
    notWritten: {
      lead: 'Bu modülün For Everyone sürümü henüz yazılmadı.',
      readEngineers: 'For Engineers sürümünü oku',
      seeWritten: "For Everyone'da nelerin yazıldığına bak",
    },
    date: dated(TR_MONTHS),
  },
  fa: {
    beforeYouStart: 'پیش‌نیازها',
    planned: 'در برنامه',
    objectives: 'چی یاد می‌گیری',
    onThisPage: 'توی این صفحه',
    sections: 'بخش‌ها',
    contents: 'فهرست',
    close: 'بستن',
    replay: 'پخش دوباره',
    completion: {
      region: 'تکمیل ماژول',
      label: 'این ماژول رو تمام‌شده علامت بزن',
      completedOn: (date) => `تکمیل شد: ${date}`,
      refused: {
        quota: 'حافظه‌ی این مرورگر پر شده',
        blocked: 'این مرورگر برای این سایت داده ذخیره نمی‌کنه',
        'too-large': 'رکورد از چیزی که این صفحه می‌تونه بنویسه بزرگ‌تره',
      },
      notSaved: (reason) => `ذخیره نشد: ${reason}.`,
      exportLink: 'رکوردت رو Export کن',
      exportAfter: ' که از دستت نره.',
    },
    pager: { previous: 'قبلی', next: 'بعدی', start: 'ابتدای دوره', end: 'پایان دوره', planned: 'در برنامه' },
    quizHead: {
      title: 'یه آزمون کوتاه می‌خوای؟',
      sub: (questions) => `${questions} سوال درباره‌ی نکته‌های اصلی این ماژول`,
    },
    quiz: {
      progress: (at, total) => `سوال ${at} از ${total}`,
      startOver: 'از اول شروع کن',
      previous: 'قبلی',
      next: 'بعدی',
      seeResults: 'نتیجه رو ببین',
      backToQuestions: 'برگرد به سوال‌ها',
      correct: 'درسته.',
      wrong: (letter) => `غلط بود. جواب درست گزینه‌ی ${letter} هست.`,
      score: (right, total) => ['', `${right} از ${total}`, ' تا رو درست جواب دادی'],
      right: '، درست',
      notRight: '، غلط',
    },
    readingTime: (minutes, words) => `${minutes} دقیقه مطالعه · ${groups(words, ',')} کلمه`,
    notWritten: {
      lead: 'نسخه‌ی For Everyone این ماژول هنوز نوشته نشده.',
      readEngineers: 'نسخه‌ی For Engineers رو بخون',
      seeWritten: 'ببین توی For Everyone چی‌ها نوشته شده',
    },
    date: dated(FA_MONTHS),
  },
}

/**
 * The attributes the words of a page's own controls carry. On the English tree that is `en`
 * and nothing else (the page's other chrome has always said so), on a translated tree the
 * language and, for Persian, `rtl`. The module and level names inside a control are English
 * and say `en` themselves.
 */
export function translatedAttrs(lang: ReadingLang): { lang?: ReadingLang; dir?: 'rtl' } {
  return lang === 'en' ? {} : { lang, ...(dirOf(lang) ? { dir: 'rtl' as const } : {}) }
}

/** As `translatedAttrs`, for the controls that have always said `en` on the English tree. */
export function wordsAttrs(lang: ReadingLang): { lang: ReadingLang; dir: 'rtl' | undefined } {
  return { lang: langAttr(lang) ?? 'en', dir: dirOf(lang) }
}
