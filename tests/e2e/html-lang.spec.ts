import { expect, test, type Page } from '@playwright/test'
import { LANGUAGE_PICKER_LABEL } from '@/components/shell/LanguageMenu'
import { TRANSLATED_LANGS } from '@/lib/content/languages'
import { loadAllModules } from '@/lib/content/loader'
import { moduleRoute } from '@/lib/tracks'
import { watchPage } from './watch'

/**
 * D119 — `<html lang>` in a real browser: what the document says once its scripts have
 * run, on a load and across a client navigation, and that setting it raises nothing.
 *
 * The root layout renders `en` for every address and `<html>` carries
 * `suppressHydrationWarning`; the exported HTML, the pre-paint script and
 * `RecordStateSync` write the real value. `seo.spec.ts` holds the exported files to the
 * same rule; this holds the live document, where a hydration mismatch or a stale value
 * after a navigation would show.
 */

const language = (page: Page) => page.evaluate(() => document.documentElement.lang)

const sheet = loadAllModules().find((one) => TRANSLATED_LANGS.every((lang) => one.translations[lang] !== null))!

test('the corpus has a module in every translation to navigate between', () => {
  expect(sheet, 'no module is translated into every language').toBeDefined()
})

for (const lang of TRANSLATED_LANGS) {
  test(`a load at the ${lang} address says ${lang}, a client navigation out of it says English, and nothing is logged`, async ({ page }) => {
    const problems = watchPage(page)
    await page.goto(moduleRoute(sheet.slug, 'engineers', lang))
    await page.waitForLoadState('networkidle')
    expect(await language(page)).toBe(lang)
    expect(await page.locator('html').getAttribute('dir')).toBeNull()

    // A client transition: the document is not reloaded, so the marker survives it.
    await page.evaluate(() => { (window as unknown as { __kept: boolean }).__kept = true })
    await page.locator('header a[href="/"]:visible').first().click()
    await expect(page).toHaveURL(/\/$/)
    expect(await page.evaluate(() => (window as unknown as { __kept?: boolean }).__kept), 'the navigation reloaded the document').toBe(true)
    // The URL changes BEFORE React commits the destination: measured on the export, the address
    // led `<html lang>` by 165-260 ms at normal speed and by 1.0-1.5 s at 8x CPU slowdown, the time the
    // home page's tree takes to render and commit (`RecordStateSync` sets the language in the
    // effect that follows that commit). On a loaded CI runner `fa` was still there 5 s after the
    // address changed (one CI run, passed on retry). So wait for the destination to be on the page, with the time a commit can
    // take, then read the language: what is asserted is the language of the page that is shown.
    await expect(page.locator('.bz-street'), 'the home page was never committed').toBeAttached({ timeout: 20_000 })
    await expect.poll(() => language(page), { timeout: 10_000 }).toBe('en')

    expect(problems.consoleErrors).toEqual([])
    expect(problems.failedRequests).toEqual([])
  })
}

test('a client navigation into a translation, through the language picker, says that language', async ({ page }) => {
  const problems = watchPage(page)
  await page.goto(moduleRoute(sheet.slug, 'engineers'))
  await page.waitForLoadState('networkidle')
  expect(await language(page)).toBe('en')

  await page.evaluate(() => { (window as unknown as { __kept: boolean }).__kept = true })
  const picker = page.getByRole('navigation', { name: LANGUAGE_PICKER_LABEL })
  await picker.locator('summary').click()
  await picker.locator(`a[href="${moduleRoute(sheet.slug, 'engineers', TRANSLATED_LANGS[0])}"]`).click()
  await expect(page).toHaveURL(new RegExp(`/${TRANSLATED_LANGS[0]}/`))
  expect(await page.evaluate(() => (window as unknown as { __kept?: boolean }).__kept), 'the navigation reloaded the document').toBe(true)
  await expect.poll(() => language(page), { timeout: 10_000 }).toBe(TRANSLATED_LANGS[0])

  expect(problems.consoleErrors).toEqual([])
  expect(problems.failedRequests).toEqual([])
})
