import { expect, test } from '@playwright/test'
import { loadAllModules } from '@/lib/content/loader'
import { LANGUAGE_PICKER_LABEL } from '@/components/shell/LanguageMenu'

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
  /* It visits every translated module TWICE — once at each address — which is
     38 documents. That is deliberate (the claim is about every module, not a
     sample) and it is slower than the default budget allows under eight
     parallel workers: MEASURED at 9.6s alone and timing out in a full run. */
  test.slow()

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
       heading differs from the English one. **MEASURED: 11 of the 19 are
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

/**
 * The switch is a disclosure in the bar since 2026-10-11, so its two links are
 * hidden until it is opened — and a role query does not see a hidden link,
 * which is the right behaviour to rely on: it is what a reader meets.
 */
async function openLanguages(page: import('@playwright/test').Page): Promise<void> {
  const trigger = page
    .getByRole('navigation', { name: LANGUAGE_PICKER_LABEL })
    .locator('summary')
  await trigger.click()
  await expect(trigger.locator('xpath=..')).toHaveAttribute('open', '')
}

test('the picker offers both languages, and only where both exist', async ({ page }) => {
  const picker = (label: string) =>
    page.getByRole('navigation', { name: LANGUAGE_PICKER_LABEL }).getByRole('link', { name: label })

  await page.goto(en(TRANSLATED[0].slug))
  // Closed, it offers nothing to click by accident; open, both languages.
  await expect(picker('Türkçe')).toHaveCount(0)
  await openLanguages(page)
  await expect(picker('English')).toHaveAttribute('aria-current', 'page')
  await expect(picker('Türkçe')).not.toHaveAttribute('aria-current', 'page')
  await expect(picker('Türkçe')).toHaveAttribute('href', new RegExp(`${tr(TRANSLATED[0].slug)}$`))

  await page.goto(tr(TRANSLATED[0].slug))
  await openLanguages(page)
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
 * **This asserted three NAMED REGIONS and a review found a fourth.** The prose,
 * the pager and the rail were localised; `Requirements`, `Unlocks` and
 * `See also` were not, and **64 links across the Turkish tree** still took a
 * reader back to English. A test that lists the places to look can only fail on
 * a place somebody thought of — which is the same shape as a guard that names a
 * class in its own regex, four of which this project has had to re-point.
 *
 * So it looks at EVERY link on the page and exempts the one that is supposed to
 * leave: the picker's own English half.
 */
test('a Turkish page keeps the reader in Turkish, everywhere on it', async ({ page }) => {
  const translated = new Set(TRANSLATED.map((sheet) => en(sheet.slug)))

  // Two modules, because one page cannot carry every kind of link: the first
  // has cross-references in its prose, and a later one has prerequisites.
  for (const sheet of [TRANSLATED[0], TRANSLATED[TRANSLATED.length - 1]]) {
    await page.goto(tr(sheet.slug))

    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')]
        .filter((link) => !link.closest('[aria-label="Language of this module"]'))
        .map((link) => ({
          path: new URL((link as HTMLAnchorElement).href).pathname,
          where: link.closest('[data-hl-prose]') ? 'prose'
            : link.closest('.bz-pager') ? 'pager'
            : link.closest('.bz-rail') ? 'rail'
            : link.closest('main') ? 'the reading column'
            : 'the chrome',
        })))

    expect(hrefs.length, 'the page links to nothing, so nothing was checked')
      .toBeGreaterThan(10)

    /* Every link to a TRANSLATED module goes to its Turkish address. A link to
       a module without one stays English — a `/tr/` href for a module that has
       no Turkish page would be a 404, which is worse than a language change. */
    const escaped = hrefs
      .filter((link) => translated.has(link.path))
      .map((link) => `${link.where}: ${link.path}`)

    expect([...new Set(escaped)], `${sheet.slug} sends a Turkish reader back to English`)
      .toEqual([])
  }

  /* And the regions are named ONLY to prove the scan reached them — a sweep
     that silently covered one region would pass the assertion above while
     testing almost nothing. */
  await page.goto(tr(TRANSLATED[0].slug))
  const reached = await page.evaluate(() => new Set(
    [...document.querySelectorAll('a[href*="courses/"]')].map((link) =>
      link.closest('[data-hl-prose]') ? 'prose'
        : link.closest('.bz-pager') ? 'pager'
        : link.closest('.bz-rail') ? 'rail'
        : 'other')).size)
  expect(reached, 'the scan did not reach the page\'s separate link regions')
    .toBeGreaterThanOrEqual(3)
})

test('the English tree links to no Turkish address', async ({ page }) => {
  await page.goto(en(TRANSLATED[0].slug))
  const turkish = (scope: string) => page.evaluate((selector) =>
    [...document.querySelectorAll(selector)]
      .map((link) => new URL((link as HTMLAnchorElement).href).pathname)
      .filter((path) => path.startsWith('/tr/')), scope)

  // None in the reading column or the rail…
  expect(await turkish('main a[href], .bz-rail a[href]')).toEqual([])
  // …and exactly one in the whole document: the bar's language menu, which is
  // the whole point of it. Counted over the document rather than inside the
  // menu, so a second Turkish link anywhere else in the chrome fails here too.
  expect(await turkish('a[href]')).toEqual([tr(TRANSLATED[0].slug)])
  expect(await turkish(`[aria-label="${LANGUAGE_PICKER_LABEL}"] a[href]`))
    .toEqual([tr(TRANSLATED[0].slug)])
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
  // A native disclosure opens with no script, which is why the switch is one.
  await openLanguages(page)
  await page.getByRole('navigation', { name: LANGUAGE_PICKER_LABEL })
    .getByRole('link', { name: 'Türkçe' })
    .click()

  await expect(page).toHaveURL(new RegExp(`${tr(TRANSLATED[0].slug)}$`))
  await expect(page.locator('[data-hl-prose] > div[lang]')).toHaveAttribute('lang', 'tr')
  await context.close()
})

/* ---------------------------------------------------------------------------
   M28 — PERSIAN, the third language and the first right-to-left one.

   Everything above holds for it unchanged (the address, the 404, the links
   that stay in the language), and is restated here per language rather than
   looped, because what Persian adds is DIRECTION: the run of text that is
   Persian carries `dir="rtl"`, and the English page around it does not move.
   --------------------------------------------------------------------------- */
const PERSIAN = MODULES.filter((sheet) => sheet.translations.fa !== null)
const NOT_PERSIAN = MODULES.filter((sheet) => sheet.translations.fa === null)
const fa = (slug: string) => `/fa/courses/${slug}/`
const PERSIAN_LETTERS = /[؀-ۿ]/

test.describe('the Persian tree', () => {
  test('has something to serve, and something to withhold', () => {
    expect(PERSIAN.length, 'no module has a Persian translation').toBeGreaterThan(0)
    expect(NOT_PERSIAN.length, 'every module is in Persian, so the null case is untested')
      .toBeGreaterThan(0)
  })

  test('serves every Persian module at its own address, and no other', async ({ page }) => {
    const wrong: string[] = []
    for (const sheet of PERSIAN) {
      const response = await page.goto(fa(sheet.slug))
      if (response?.status() !== 200) wrong.push(`${sheet.slug}: ${response?.status()}`)
      const prose = await page.locator('[data-hl-prose] > div[lang]').innerText()
      if (!PERSIAN_LETTERS.test(prose)) wrong.push(`${sheet.slug}: the prose is not Persian`)
    }
    for (const sheet of NOT_PERSIAN) {
      const response = await page.goto(fa(sheet.slug))
      if (response?.status() !== 404) wrong.push(`${sheet.slug}: served at ${fa(sheet.slug)}`)
    }
    expect(wrong).toEqual([])
  })

  test('turns the Persian text right-to-left and leaves the page around it alone', async ({ page }) => {
    await page.goto(fa(PERSIAN[0].slug))

    for (const selector of ['[data-hl-prose] > div[lang]', 'h1.bz-display']) {
      await expect(page.locator(selector)).toHaveAttribute('lang', 'fa')
      await expect(page.locator(selector)).toHaveAttribute('dir', 'rtl')
    }

    const direction = (selector: string) =>
      page.locator(selector).first().evaluate((element) => getComputedStyle(element).direction)

    // The document is English: the bar, the rail and the objectives card are
    // the interface's own words and stay left-to-right (the author: content
    // level only, "not website level such as navbars").
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('html')).not.toHaveAttribute('dir', 'rtl')
    expect(await direction('header')).toBe('ltr')
    expect(await direction('.bz-rail')).toBe('ltr')
    expect(await direction('.bz-card[aria-labelledby="objectives"]')).toBe('ltr')
    await expect(page.locator('.bz-card[aria-labelledby="objectives"]')).toHaveAttribute('lang', 'en')

    // Inside it, what reads turns round and what is drawn does not.
    expect(await direction('[data-hl-prose] > div[lang] p')).toBe('rtl')
  })

  test('keeps code left-to-right inside right-to-left prose', async ({ page }) => {
    // Derived, not named: the first Persian module that has a code block.
    for (const sheet of PERSIAN) {
      await page.goto(fa(sheet.slug))
      const slab = page.locator('[data-hl-prose] .bz-slab')
      if ((await slab.count()) === 0) continue
      expect(await slab.first().evaluate((element) => getComputedStyle(element).direction)).toBe('ltr')
      return
    }
    throw new Error('no Persian module has a code block, so nothing was checked')
  })

  test('sets Persian in a face that has Persian forms', async ({ page }) => {
    await page.goto(fa(PERSIAN[0].slug))
    const family = await page.locator('[data-hl-prose] > div[lang] p').first()
      .evaluate((element) => getComputedStyle(element).fontFamily)
    expect(family).toMatch(/vazirmatn/i)

    // …and only there: the English page keeps the system stack.
    await page.goto(en(PERSIAN[0].slug))
    const english = await page.locator('[data-hl-prose] p').first()
      .evaluate((element) => getComputedStyle(element).fontFamily)
    expect(english).not.toMatch(/vazirmatn/i)
  })

  test('keeps the reader in Persian, everywhere on the page', async ({ page }) => {
    const persian = new Set(PERSIAN.map((sheet) => en(sheet.slug)))
    for (const sheet of [PERSIAN[0], PERSIAN[PERSIAN.length - 1]]) {
      await page.goto(fa(sheet.slug))
      const paths = await page.evaluate(() =>
        [...document.querySelectorAll('a[href]')]
          .filter((link) => !link.closest('[aria-label="Language of this module"]'))
          .map((link) => new URL((link as HTMLAnchorElement).href).pathname))
      expect(paths.length, 'the page links to nothing, so nothing was checked').toBeGreaterThan(10)
      const escaped = paths.filter((path) => persian.has(path))
      expect([...new Set(escaped)], `${sheet.slug} sends a Persian reader back to English`).toEqual([])
      expect(paths.filter((path) => path.startsWith('/fa/')).length, 'no link stayed in Persian')
        .toBeGreaterThan(0)
    }
  })

  test('is offered by the picker beside the others, and current on its own page', async ({ page }) => {
    const picker = (label: string) =>
      page.getByRole('navigation', { name: LANGUAGE_PICKER_LABEL }).getByRole('link', { name: label })

    await page.goto(fa(PERSIAN[0].slug))
    await openLanguages(page)
    await expect(picker('فارسی')).toHaveAttribute('aria-current', 'page')
    await expect(picker('فارسی')).toHaveAttribute('dir', 'rtl')
    await expect(picker('English')).toHaveAttribute('href', new RegExp(`${en(PERSIAN[0].slug)}$`))

    await page.goto(en(PERSIAN[0].slug))
    await openLanguages(page)
    await expect(picker('فارسی')).toHaveAttribute('href', new RegExp(`${fa(PERSIAN[0].slug)}$`))
  })

  test('the English tree links to Persian from the picker and nowhere else', async ({ page }) => {
    await page.goto(en(PERSIAN[0].slug))
    const persian = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')]
        .map((link) => new URL((link as HTMLAnchorElement).href).pathname)
        .filter((path) => path.startsWith('/fa/')))
    expect(persian).toEqual([fa(PERSIAN[0].slug)])
  })
})
