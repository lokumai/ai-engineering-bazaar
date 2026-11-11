import { type Page, expect, test } from '@playwright/test'
import { loadAllModules } from '@/lib/content/loader'
import { moduleGraph } from '@/lib/content/edges'
import { quizFor } from '@/lib/content/quiz'
import { PAGE_COPY } from '@/lib/content/page-copy'
import { type TranslatedLang } from '@/lib/content/languages'
import { catalogRoute, moduleRoute } from '@/lib/tracks'

/**
 * D133 — a module page read in Turkish or Persian says its own words in that language.
 *
 * Every expectation is read from `PAGE_COPY`, the one table the components read, and the page is
 * picked from the corpus: the first module that has both translations, prerequisites, a quiz and
 * a module after it. Nothing here writes down a module's text (`tests/README.md`). What the test
 * proves is that each control renders the table's string for the page's language, and not the
 * English one; that the English page still does; and that the menus and the module names are not
 * translated.
 */
const MODULES = loadAllModules()
const graph = moduleGraph()
const SUBJECT = MODULES.find((sheet) =>
  sheet.translations.tr !== null
  && sheet.translations.fa !== null
  && graph.requires(sheet.frontmatter.module).length > 0
  && quizFor(sheet.category.dir, sheet.name, 'en') !== null
  && MODULES.some((other) => other.frontmatter.module > sheet.frontmatter.module))
const PREVIOUS_TITLE = (() => {
  if (!SUBJECT) return ''
  const before = MODULES.filter((one) => one.frontmatter.module < SUBJECT.frontmatter.module)
  return before.length > 0 ? before[before.length - 1].frontmatter.title : ''
})()

const QUESTIONS = SUBJECT ? (quizFor(SUBJECT.category.dir, SUBJECT.name, 'en')?.length ?? 0) : 0
const slug = SUBJECT ? `${SUBJECT.category.slug}/${SUBJECT.moduleSlug}` : ''
const route = (lang: 'en' | TranslatedLang) => moduleRoute(slug, 'engineers', lang)

test('the corpus has a page to read in both languages', () => {
  // The vacuity floor: every test below is about this one module.
  expect(SUBJECT, 'no module has both translations, a prerequisite and a quiz').toBeDefined()
})

async function visibleWords(page: Page) {
  const text = async (selector: string) => ((await page.locator(selector).first().innerText()).replace(/\s+/g, ' ').trim())
  return {
    facts: await text('.bz-facts'),
    prerequisites: await text('.bz-prereq-title'),
    objectives: await text('#objectives'),
    onThisPage: await text('#hl-on-this-page'),
    completion: await text('.bz-complete-label'),
    previous: await text('.bz-pager-item[data-dir="prev"] small'),
    next: await text('.bz-pager-item[data-dir="next"] small'),
    quizTitle: await text('.bz-quiz-title'),
    quizSub: await text('.bz-quiz-sub'),
  }
}

for (const lang of ['tr', 'fa'] as const) {
  test(`a ${lang} module page says its controls in ${lang}, and not in English`, async ({ page }) => {
    const copy = PAGE_COPY[lang]
    const english = PAGE_COPY.en
    await page.goto(route(lang))
    const shown = await visibleWords(page)
    const questions = QUESTIONS

    expect(shown.prerequisites).toBe(copy.beforeYouStart)
    expect(shown.objectives).toBe(copy.objectives)
    expect(shown.onThisPage).toBe(copy.onThisPage)
    expect(shown.completion).toBe(copy.completion.label)
    expect(shown.previous).toBe(copy.pager.previous)
    expect(shown.next).toBe(copy.pager.next)
    expect(shown.quizTitle).toBe(copy.quizHead.title)
    expect(shown.quizSub).toBe(copy.quizHead.sub(questions))
    expect(shown.facts).toMatch(new RegExp(`^${copy.readingTime(0, 0).replace(/0/g, '[\\d.,]+')}$`))

    // The English strings are nowhere on those controls.
    expect(shown.prerequisites).not.toBe(english.beforeYouStart)
    expect(shown.objectives).not.toBe(english.objectives)
    expect(shown.onThisPage).not.toBe(english.onThisPage)
    expect(shown.completion).not.toBe(english.completion.label)
    expect(shown.previous).not.toBe(english.pager.previous)
    expect(shown.next).not.toBe(english.pager.next)
    expect(shown.quizTitle).not.toBe(english.quizHead.title)
    expect(shown.facts).not.toMatch(/\bmin\b|\bwords\b/)
    await expect(page.locator('nav[aria-label]', { hasText: /./ }).filter({ has: page.locator('.bz-aside-list') }))
      .toHaveAttribute('aria-label', copy.sections)
    await expect(page.locator('section.bz-complete')).toHaveAttribute('aria-label', copy.completion.region)

    // The direction goes on the controls' own blocks in Persian and nowhere in Turkish.
    const dir = lang === 'fa' ? 'rtl' : null
    for (const selector of ['.bz-prereq', 'section.bz-complete', '.bz-pager', '.bz-quiz-head']) {
      const found = await page.locator(selector).first().getAttribute('dir')
      expect(found, `${selector} dir`).toBe(dir)
      expect(await page.locator(selector).first().getAttribute('lang'), `${selector} lang`).toBe(lang)
    }
  })

  test(`the ${lang} completion control, its date and the quiz follow the page's language`, async ({ page }) => {
    const copy = PAGE_COPY[lang]
    await page.goto(route(lang))

    await page.locator('.bz-complete-row').click()
    const when = page.locator('.bz-complete-when')
    await expect(when).toBeVisible()
    const today = new Date().toISOString().slice(0, 10)
    // The record writes UTC, so the reader's date can be today's or the one the clock has crossed to.
    const accepted = [today, new Date(Date.now() - 864e5).toISOString().slice(0, 10)]
      .map((iso) => copy.completion.completedOn(copy.date(iso)))
    expect(accepted).toContain(((await when.innerText()) ?? '').trim())

    await page.locator('.bz-quiz summary').click()
    const total = QUESTIONS
    await expect(page.locator('.bz-quiz-progress')).toHaveText(copy.quiz.progress(1, total))
    await expect(page.locator('.bz-quiz-restart')).toHaveText(copy.quiz.startOver)
    await expect(page.locator('.bz-quiz-body')).toHaveAttribute('lang', lang)
    await page.locator('.bz-quiz-option').first().click()
    const verdict = (await page.locator('.bz-quiz-verdict').innerText()).trim()
    expect([copy.quiz.correct, ...['A', 'B', 'C', 'D'].map(copy.quiz.wrong)]).toContain(verdict)
    await expect(page.getByRole('button', { name: copy.quiz.next, exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: PAGE_COPY.en.quiz.next, exact: true })).toHaveCount(0)

    // Through to the results, and the score line is the table's.
    for (let at = 0; at < total; at += 1) {
      if (at > 0) await page.locator('.bz-quiz-option').first().click()
      await page.getByRole('button', { name: at < total - 1 ? copy.quiz.next : copy.quiz.seeResults, exact: true }).click()
    }
    const right = await page.locator('.bz-quiz-recap li[data-correct="true"]').count()
    const [before, strong, after] = copy.quiz.score(right, total)
    await expect(page.locator('.bz-quiz-score')).toHaveText(`${before}${strong}${after}`)
    await expect(page.getByRole('button', { name: copy.quiz.startOver, exact: true }).last()).toBeVisible()
  })
}

test('names stay English on a translated page: the prerequisites, the pager and the menus', async ({ page }) => {
  test.skip(!SUBJECT)
  const prerequisites = graph.requires(SUBJECT!.frontmatter.module)
    .map((number) => MODULES.find((one) => one.frontmatter.module === number)!.frontmatter.title)
  for (const lang of ['tr', 'fa'] as const) {
    await page.goto(route(lang))
    const links = await page.locator('.bz-prereq-link').allTextContents()
    expect(links.map((text) => text.trim()).sort(), `${lang} prerequisites`).toEqual([...prerequisites].sort())
    await expect(page.locator('.bz-pager-item[data-dir="prev"] b')).toHaveText(PREVIOUS_TITLE)
    // The bar and the footer are not the page's own words.
    await expect(page.locator('header').getByText('Catalog', { exact: true })).toBeVisible()
    await expect(page.locator('header').getByText('Progress', { exact: true })).toBeVisible()
    await expect(page.locator('footer').getByText('Repository', { exact: true })).toBeVisible()
  }
})

test('the English page is unchanged: its own words are the English strings', async ({ page }) => {
  const copy = PAGE_COPY.en
  await page.goto(route('en'))
  const shown = await visibleWords(page)
  expect(shown.prerequisites).toBe(copy.beforeYouStart)
  expect(shown.objectives).toBe(copy.objectives)
  expect(shown.onThisPage).toBe(copy.onThisPage)
  expect(shown.completion).toBe(copy.completion.label)
  expect(shown.previous).toBe(copy.pager.previous)
  expect(shown.next).toBe(copy.pager.next)
  expect(shown.quizTitle).toBe(copy.quizHead.title)
  expect(shown.facts).toMatch(/^\d+ min · [\d,]+ words$/)
})

test('the catalog and the progress page stay English whatever language the reader came from', async ({ page }) => {
  const english = PAGE_COPY.en
  const translated = [PAGE_COPY.tr, PAGE_COPY.fa]
  await page.goto(route('tr'))
  for (const path of [catalogRoute('engineers'), '/profile/']) {
    await page.goto(path)
    const text = await page.locator('main').innerText()
    for (const copy of translated) {
      expect(text, `${path} shows ${copy.beforeYouStart}`).not.toContain(copy.beforeYouStart)
      expect(text, `${path} shows ${copy.completion.label}`).not.toContain(copy.completion.label)
    }
    expect(english.pager.next.length).toBeGreaterThan(0)
  }
})
