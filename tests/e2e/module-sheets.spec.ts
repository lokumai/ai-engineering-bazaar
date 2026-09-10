import { expect, test } from '@playwright/test'
import { SHEETS } from './sheets'
import { watchPage } from './watch'

/**
 * Every sheet in the set, loaded for real.
 *
 * This is the test that catches a broken sheet. Thirty-two routes are built
 * from thirty-two markdown files by one renderer, and any one of them can
 * carry the table, the code fence or the frontmatter that the pipeline chokes
 * on — while the other thirty-one stay green. A spot check of "a module page"
 * would not have found it, so this loops the whole set.
 *
 * Three things are asserted per sheet and they are deliberately shallow: it
 * responded, it has exactly one h1 and that h1 is the title the manifest
 * promised, it picked the §4.4 format the corpus says it should, and it
 * logged nothing. Anything deeper belongs in `anatomy.spec.ts`, which does it
 * once per format rather than thirty-two times.
 */

for (const sheet of SHEETS) {
  test(`sheet ${String(sheet.module).padStart(2, '0')} — ${sheet.title}`, async ({ page }) => {
    const problems = watchPage(page)

    const response = await page.goto(sheet.path)
    expect(response?.status(), `${sheet.path} responded`).toBe(200)

    // One h1, and the one the index said it would be. A sheet that renders a
    // heading from the wrong file, or two of them, is broken even though it
    // looks fine.
    const h1 = page.locator('main h1')
    await expect(h1).toHaveCount(1)
    await expect(h1).toHaveText(sheet.title)

    await expect(page.locator('.bz-sheet')).toHaveAttribute('data-format', sheet.format)

    /*
      The FACTS STRIP names the level and gives the module's place IN THAT
      LEVEL, which is what `01` draws — its tag reads `Module 3 of 8`, and 8 is
      the level's size rather than the course's.

      This assertion used to read `.bz-facts` and pin `MODULE n OF 33`: a
      tracked-out all-caps meta line above the title, which DESIGN.md names as
      a tell and stage 5 removed. The module's place in the WHOLE SET is still
      stated, by the footer, and `site-footer.spec.ts` asserts it on every one
      of the thirty-three — so pinning it a second time here would be one fact
      with two tests and one of them would be about the wrong surface. What is
      checked here is that the strip is populated and says which level this is.
    */
    const strip = page.locator('.bz-facts')
    await expect(strip).toContainText(/Module \d+ of \d+/i)
    await expect(strip).toContainText(new RegExp(sheet.category, 'i'))

    expect(problems.consoleErrors, `${sheet.path} console`).toEqual([])
    expect(problems.failedRequests, `${sheet.path} network`).toEqual([])
  })
}
