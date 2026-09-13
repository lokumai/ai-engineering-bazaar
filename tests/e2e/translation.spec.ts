import { expect, test } from '@playwright/test'
import { loadAllModules } from '@/lib/content/loader'
import { LANGUAGE_PICKER_LABEL } from '@/components/sheet/LanguagePicker'

/**
 * M19 — the second language, which is an ADDRESS.
 *
 * 33 `_tr.md` files existed for three milestones and the app rendered none of
 * them, so the catalog printed `EN · TR` about a translation nobody could
 * reach. This is the suite for the tree that serves them.
 *
 * **Derived from the corpus, never from a list written here.** Which modules
 * are translated is a measurement of `mini-courses/` — 19 of 33 today, every
 * written one — and a test that typed those numbers out would go red the day
 * the author translates another module, which is the one thing that must not
 * cost anybody a test edit (`tests/README.md`).
 */
const MODULES = loadAllModules()
const TRANSLATED = MODULES.filter((sheet) => sheet.translation !== null)
const UNTRANSLATED = MODULES.filter((sheet) => sheet.translation === null)

const en = (slug: string) => `/courses/${slug}/`
const tr = (slug: string) => `/tr/courses/${slug}/`

test('the corpus has something to serve, and something to withhold', () => {
  // The vacuity floor. Every test below iterates one of these two lists, and
  // an empty list makes every one of them pass without looking at anything.
  expect(TRANSLATED.length, 'no module has a translation').toBeGreaterThan(0)
  expect(UNTRANSLATED.length, 'every module is translated, so the null case is untested')
    .toBeGreaterThan(0)
  // And the two halves agree with what the catalog used to claim about them.
  for (const sheet of TRANSLATED) expect(sheet.lang, sheet.slug).toBe('EN·TR')
  for (const sheet of UNTRANSLATED) expect(sheet.lang, sheet.slug).toBe('EN')
})

test('every translated module is served in Turkish at its own address', async ({ page }) => {
  const wrong: string[] = []
  const prose = new Map<string, string>()

  for (const sheet of TRANSLATED) {
    const response = await page.goto(tr(sheet.slug))
    if (response !== null && !response.ok()) {
      wrong.push(`${sheet.slug}: ${response.status()}`)
      continue
    }

    /* **The PROSE is the proof, and the title is not** — which took a red test
       to find out. A `_tr.md` carries no frontmatter, so the Turkish title is
       the body's own `# ` heading, and the first draft of this asserted that
       heading differs from the English one. **MEASURED: 13 of the 19 are
       identical**, because the author leaves the technical term alone — `#
       Memory`, `# Security`, `# Prompt Engineering`, `# Context Engineering`
       are what those modules are called in Turkish too. The assertion was
       testing the author's vocabulary, not the pipeline.

       The rendered prose cannot be identical, so that is what is compared. */
    const turkish = (await page.locator('[data-hl-prose]').innerText()).trim()
    prose.set(sheet.slug, turkish)
    if (turkish.length === 0) wrong.push(`${sheet.slug}: renders no prose at all`)
  }

  // …against the English page for the same module, read second so a failure
  // above short-circuits before doing twice the work.
  for (const sheet of TRANSLATED) {
    await page.goto(en(sheet.slug))
    const english = (await page.locator('[data-hl-prose]').innerText()).trim()
    if (english === prose.get(sheet.slug)) {
      wrong.push(`${sheet.slug}: the Turkish address serves the English body`)
    }
  }

  expect(wrong, 'a Turkish address served something other than Turkish').toEqual([])
})

test('a module with no translation has no Turkish address at all', async ({ page }) => {
  const served: string[] = []

  for (const sheet of UNTRANSLATED) {
    const response = await page.goto(tr(sheet.slug))
    // A static host answers an unknown address with `404.html` and a 404.
    if (response !== null && response.ok()) served.push(sheet.slug)
  }

  /* Serving the ENGLISH text at a Turkish address would be the quieter failure
     and the worse one: an address is a claim, and §1 refuses a control that
     claims something the page cannot do. A reader who asked for Turkish is told
     there is none rather than handed English without being told. */
  expect(served, 'a Turkish address exists for a module with no translation').toEqual([])
})

test('the picker offers both languages, and only where both exist', async ({ page }) => {
  const picker = (label: string) =>
    page.getByRole('navigation', { name: LANGUAGE_PICKER_LABEL }).getByRole('link', { name: label })

  await page.goto(en(TRANSLATED[0].slug))
  await expect(picker('English')).toHaveAttribute('aria-current', 'page')
  await expect(picker('Türkçe')).not.toHaveAttribute('aria-current', 'page')
  await expect(picker('Türkçe')).toHaveAttribute('href', new RegExp(`${tr(TRANSLATED[0].slug)}$`))

  await page.goto(tr(TRANSLATED[0].slug))
  await expect(picker('Türkçe')).toHaveAttribute('aria-current', 'page')
  await expect(picker('English')).not.toHaveAttribute('aria-current', 'page')

  // …and nothing at all on a module there is no second version of. A disabled
  // control would offer a 404; §11.30 prints nothing instead.
  await page.goto(en(UNTRANSLATED[0].slug))
  await expect(page.getByRole('navigation', { name: LANGUAGE_PICKER_LABEL })).toHaveCount(0)
})

/**
 * **The defect this milestone nearly shipped**, and it could not have failed:
 * every cross-reference on a Turkish page resolved perfectly — to the English
 * page. MEASURED before the fix: 121 links across the corpus, all of them
 * one-way doors out of the language the reader had chosen.
 *
 * Three regions, because the first fix only caught one of them. The prose's own
 * links were localised while the pager and the rail — the two controls a reader
 * uses most — were not.
 */
test('a Turkish page keeps the reader in Turkish, in all three regions', async ({ page }) => {
  await page.goto(tr(TRANSLATED[0].slug))

  const region = (selector: string) =>
    page.evaluate((sel) => [...document.querySelectorAll(`${sel} a[href*="courses/"]`)]
      .map((link) => new URL((link as HTMLAnchorElement).href).pathname), selector)

  const translated = new Set(TRANSLATED.map((sheet) => en(sheet.slug)))

  for (const [name, selector] of [
    ['the prose', '[data-hl-prose]'],
    ['the pager', '.bz-pager'],
    ['the rail', '.bz-rail'],
  ] as const) {
    const hrefs = await region(selector)
    expect(hrefs.length, `${name} links to no module, so nothing was checked`).toBeGreaterThan(0)

    /* Every link to a TRANSLATED module goes to its Turkish address, and every
       link to one without stays English — a `/tr/` href for a module that has
       no Turkish page would be a 404, which is worse than a language change. */
    const escaped = hrefs.filter((href) => translated.has(href))
    expect(escaped, `${name} sends a Turkish reader back to English`).toEqual([])
  }
})

test('the English tree links to no Turkish address', async ({ page }) => {
  await page.goto(en(TRANSLATED[0].slug))
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('main a[href], .bz-rail a[href]')]
      .map((link) => new URL((link as HTMLAnchorElement).href).pathname)
      .filter((path) => path.startsWith('/tr/')))

  // Exactly one: the picker's own link, which is the whole point of it.
  expect(hrefs).toEqual([tr(TRANSLATED[0].slug)])
})

/**
 * A Turkish module page is a MIXED-LANGUAGE document — the bar, the rail, the
 * footer and the objectives card are all still English — so the language is an
 * attribute on the run of text that is Turkish, not a stamp on `<html>`.
 * Stamping the document would have a screen reader read every English control
 * in a Turkish voice, which is the defect the attribute exists to prevent.
 */
test('says which language each run of text is in', async ({ page }) => {
  await page.goto(tr(TRANSLATED[0].slug))

  await expect(page.locator('[data-hl-prose] > div[lang]')).toHaveAttribute('lang', 'tr')
  // MEASURED: a `_tr.md` carries no frontmatter, so the objectives exist in
  // English and nowhere else. Marked, rather than dropped or left to be read
  // in the wrong voice.
  await expect(page.locator('.bz-card[aria-labelledby="objectives"]')).toHaveAttribute('lang', 'en')

  await page.goto(en(TRANSLATED[0].slug))
  // …and the English tree carries neither, because an attribute restating the
  // document's own language is noise.
  await expect(page.locator('[data-hl-prose] > div[lang]')).toHaveCount(0)
  await expect(page.locator('.bz-card[aria-labelledby="objectives"][lang]')).toHaveCount(0)
})

test('the switch works with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  /* The language is an address, so this is navigation and a plain anchor is
     what carries it — the same pay-off D62 bought for the catalog's level
     chips. A `<select>` or a toggle would be an island and would do nothing
     here at all. */
  await page.goto(en(TRANSLATED[0].slug))
  await page.getByRole('navigation', { name: LANGUAGE_PICKER_LABEL })
    .getByRole('link', { name: 'Türkçe' })
    .click()

  await expect(page).toHaveURL(new RegExp(`${tr(TRANSLATED[0].slug)}$`))
  await expect(page.locator('[data-hl-prose] > div[lang]')).toHaveAttribute('lang', 'tr')
  await context.close()
})
