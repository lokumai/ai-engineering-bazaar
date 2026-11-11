import { expect, test } from '@playwright/test'
import { loadAllModules } from '@/lib/content/loader'
import { moduleRoute } from '@/lib/tracks'

/**
 * D135 — on a built module page the References' Modules subsection is headed by the LokumAI
 * mark, never a compass, and the other subsections keep their emoji. The page is picked from the
 * corpus: the first module with both translations and a `### 🧭` line in each file; no text of
 * any module is written down here.
 */
const SUBJECT = loadAllModules().find((sheet) =>
  sheet.translations.tr !== null && sheet.translations.fa !== null && sheet.body.includes('\n### 🧭'))

for (const lang of ['en', 'tr', 'fa'] as const) {
  test(`${lang}: the Modules subsection shows the mark and no compass`, async ({ page }) => {
    expect(SUBJECT, 'no module qualifies').toBeDefined()
    const slug = `${SUBJECT!.category.slug}/${SUBJECT!.moduleSlug}`
    await page.goto(moduleRoute(slug, 'engineers', lang))
    const marked = page.locator('h3:has(img.bz-heading-mark)')
    await expect(marked).toHaveCount(1)
    await expect(marked.locator('img')).toHaveAttribute('alt', '')
    await expect(marked.locator('img')).toHaveAttribute('src', /lokum-logo\.svg$/)
    expect(await marked.innerText()).not.toContain('🧭')
    // Drawn at the size of its text, like the other subsections' emoji.
    const box = await marked.locator('img').boundingBox()
    const font = await marked.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(Math.abs((box?.height ?? 0) - font)).toBeLessThan(1)
    // The other subsections keep theirs.
    const others = page.locator('h3:not(:has(img.bz-heading-mark))', { hasText: /\p{Extended_Pictographic}/u })
    expect(await others.count()).toBeGreaterThan(0)
  })
}
