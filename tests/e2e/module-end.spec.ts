import { type Page, expect, test } from '@playwright/test'
import { loadModule } from '@/lib/content/loader'
import { quizFor } from '@/lib/content/quiz'
import { A4, SHEETS, SHORT } from './sheets'

/**
 * The end of a module and its top, as the author rebuilt them on 2026-10-11:
 * a `Before you start` box naming the prerequisites, and at the end one
 * completion checkbox, Previous and Next, and a quick quiz that stays closed
 * until asked for.
 *
 * Nothing here pins what a question asks. The quiz's own file is read for the
 * right answer, so the test holds for any quiz the corpus carries
 * (`tests/README.md`).
 */

/** `/courses/fundamentals/rag/` → `fundamentals/rag`. */
const slugOfPath = (path: string) => path.split('/').filter(Boolean).slice(1).join('/')

function quizOf(path: string, lang: 'en' | 'tr' = 'en') {
  const module = loadModule(slugOfPath(path))
  if (!module) throw new Error(`no module at ${path}`)
  return quizFor(module.category.dir, module.name, lang)
}

async function openQuiz(page: Page) {
  const quiz = page.locator('.bz-quiz')
  await quiz.locator('summary').click()
  await expect(quiz).toHaveAttribute('open', '')
  return quiz
}

test('the quiz is closed until asked for, and says how long it is', async ({ page }) => {
  const items = quizOf(SHORT.path)!
  await page.goto(SHORT.path)
  const quiz = page.locator('.bz-quiz')
  await expect(quiz).toBeVisible()
  await expect(quiz).not.toHaveAttribute('open', '')
  await expect(quiz.locator('summary')).toContainText('Want a quick quiz?')
  await expect(quiz.locator('summary')).toContainText(`${items.length} questions`)
  // Closed, no question is reachable.
  await expect(quiz.locator('.bz-quiz-option')).toHaveCount(4)
  await expect(quiz.locator('.bz-quiz-option').first()).not.toBeVisible()
})

test('an answer is marked, explained, and final', async ({ page }) => {
  const items = quizOf(SHORT.path)!
  await page.goto(SHORT.path)
  const quiz = await openQuiz(page)

  const first = items[0]
  const wrong = (first.answer + 1) % 4
  const next = quiz.getByRole('button', { name: 'Next', exact: true })

  await expect(quiz.locator('.bz-quiz-progress')).toHaveText(`Question 1 of ${items.length}`)
  await expect(next, 'Next before an answer').toBeDisabled()

  await quiz.locator('.bz-quiz-option').nth(wrong).click()

  // Wrong is said in words and shown on both options: the chosen one crossed,
  // the right one checked, every option locked.
  await expect(quiz.locator('.bz-quiz-verdict')).toContainText('Not this one')
  await expect(quiz.locator('.bz-quiz-explain')).toHaveText(first.explain)
  await expect(quiz.locator('.bz-quiz-option').nth(wrong)).toHaveAttribute('data-state', 'wrong')
  await expect(quiz.locator('.bz-quiz-option').nth(first.answer)).toHaveAttribute('data-state', 'right')
  await expect(quiz.locator('.bz-quiz-option[aria-disabled="true"]')).toHaveCount(4)

  // Final: a second press changes nothing. Forced, because the option says it
  // is disabled and a reader can still press it; what matters is that the
  // press does nothing.
  await quiz.locator('.bz-quiz-option').nth(first.answer).click({ force: true })
  await expect(quiz.locator('.bz-quiz-option').nth(wrong)).toHaveAttribute('data-state', 'wrong')

  // The next question takes focus, so a screen reader reads it out.
  await next.click()
  await expect(quiz.locator('.bz-quiz-progress')).toHaveText(`Question 2 of ${items.length}`)
  await expect(quiz.locator('.bz-quiz-question')).toBeFocused()

  await quiz.locator('.bz-quiz-option').nth(items[1].answer).click()
  await expect(quiz.locator('.bz-quiz-verdict')).toContainText('Correct')

  // Previous goes back to the answered question, with its answer kept.
  await quiz.getByRole('button', { name: 'Previous', exact: true }).click()
  await expect(quiz.locator('.bz-quiz-option').nth(wrong)).toHaveAttribute('data-state', 'wrong')
})

test('the results count the right answers, and Start over clears them', async ({ page }) => {
  const items = quizOf(SHORT.path)!
  await page.goto(SHORT.path)
  const quiz = await openQuiz(page)

  // Right on every question but the first.
  for (const [at, item] of items.entries()) {
    await quiz.locator('.bz-quiz-option').nth(at === 0 ? (item.answer + 1) % 4 : item.answer).click()
    const label = at < items.length - 1 ? 'Next' : 'See results'
    await quiz.getByRole('button', { name: label, exact: true }).click()
  }

  await expect(quiz.locator('.bz-quiz-score')).toHaveText(
    `${items.length - 1} of ${items.length} answered correctly`,
  )
  await expect(quiz.locator('.bz-quiz-recap li')).toHaveCount(items.length)
  await expect(quiz.locator('.bz-quiz-recap li[data-correct="false"]')).toHaveCount(1)

  await quiz.getByRole('button', { name: 'Start over', exact: true }).click()
  await expect(quiz.locator('.bz-quiz-progress')).toHaveText(`Question 1 of ${items.length}`)
  await expect(quiz.locator('.bz-quiz-option[aria-disabled]')).toHaveCount(0)
})

test('a Turkish page asks in Turkish, and says it does', async ({ page }) => {
  const items = quizOf(SHORT.path, 'tr')!
  await page.goto(`/tr${SHORT.path}`)
  const quiz = await openQuiz(page)
  const question = quiz.locator('.bz-quiz-question')
  await expect(question).toHaveText(items[0].question)
  await expect(question).toHaveAttribute('lang', 'tr')
})

test('a planned module has no quiz and no completion', async ({ page }) => {
  await page.goto(A4.path)
  await expect(page.locator('.bz-quiz')).toHaveCount(0)
  await expect(page.locator('.bz-complete')).toHaveCount(0)
  // Previous and Next are still there: a planned module is still a place in
  // the sequence.
  await expect(page.locator('.bz-pager')).toBeVisible()
})

test('with no script there is no quiz to press', async ({ browser }) => {
  // The questions are answered by a script, so a page that cannot run one
  // must not draw buttons that do nothing (§1).
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(SHORT.path)
  await expect(page.locator('.bz-quiz')).toHaveCount(1)
  await expect(page.locator('.bz-quiz')).not.toBeVisible()
  await context.close()
})

test('the prerequisites are named and linked at the top, and absent where there are none', async ({
  page,
}) => {
  // Every drawn module, asked of the page: the box exists exactly where the
  // module has prerequisites, every link in it resolves to a module, and it
  // sits above the prose.
  let seen = 0
  for (const sheet of SHEETS.filter((one) => one.drawn)) {
    const module = loadModule(slugOfPath(sheet.path))!
    const needs = module.frontmatter.prerequisites.length
    await page.goto(sheet.path)
    const box = page.locator('.bz-prereq')
    if (needs === 0) {
      await expect(box, sheet.path).toHaveCount(0)
      continue
    }
    seen += 1
    await expect(box, sheet.path).toBeVisible()
    await expect(box.locator('.bz-prereq-title')).toHaveText('Before you start')
    await expect(box.locator('.bz-prereq-link'), sheet.path).toHaveCount(needs)
    const above = await page.evaluate(() => {
      const box = document.querySelector('.bz-prereq')!
      const prose = document.querySelector('[data-hl-prose]')!
      return Boolean(box.compareDocumentPosition(prose) & Node.DOCUMENT_POSITION_FOLLOWING)
    })
    expect(above, `${sheet.path}: the box is not above the prose`).toBe(true)
  }
  expect(seen, 'no drawn module has a prerequisite, so nothing was checked').toBeGreaterThan(0)
})
