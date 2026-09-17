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
    /* M21 — the strip is `25 min · 2,317 words` and nothing else. The author
       asked for plain text under the title, so the two tags went with the
       level and the position they carried. Both facts are still stated:
       the level by the trail, which is checked here because it is the carrier
       the tag handed off to, and the position by the footer, which
       `site-footer.spec.ts` asserts on all thirty-three — pinning it a second
       time here would be one fact with two tests. */
    if (sheet.drawn) {
      await expect(page.locator('.bz-facts')).toHaveText(/^\d+ min · [\d,]+ words$/)
    } else {
      // A module nobody has written declares neither, so there is no strip.
      await expect(page.locator('.bz-facts')).toHaveCount(0)
    }
    await expect(page.locator('nav[aria-label="Curriculum"]'))
      .toContainText(new RegExp(sheet.category.replace('-', '[ -]'), 'i'))

    /* M21 — **and the last crumb is the module's NAME, not its slug.**
       `breadcrumbFor` labels a segment no route table knows by de-hyphenating
       it, so this read `… / llms` under a heading saying `LLM Fundamentals`.
       Found by screenshot. It is asserted per sheet rather than on one of them
       because the fallback is per segment: a module whose slug happens to look
       like its title would hide the defect on every other one. */
    await expect(
      page.locator('nav[aria-label="Curriculum"] [aria-current="page"]'),
      `${sheet.path} names itself by its slug in the trail`,
    ).toHaveText(sheet.title)

    expect(problems.consoleErrors, `${sheet.path} console`).toEqual([])
    expect(problems.failedRequests, `${sheet.path} network`).toEqual([])
  })
}
