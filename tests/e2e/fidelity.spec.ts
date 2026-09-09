import { expect, test } from '@playwright/test'
import {
  APP_SELECTORS,
  DELIBERATELY_ABSENT,
  DESIGN_FACTS,
  freezeMotion,
  FACT_KEYS,
  MOCKUP_SELECTORS,
  MOCKUP_URL,
  compareDesignFacts,
  differencesIn,
  extractDesignFacts,
  factKey,
  factsRead,
  type Role,
} from './fidelity'

/**
 * M15 — proving the fidelity harness, which is the only deliverable in this
 * milestone that can prevent the failure it exists because of.
 *
 * No route is compared here. In M15 there is nothing to compare a route
 * against: the language stylesheet is written but not wired, and every surface
 * belongs to M16. What this file does is establish that the extractor reads
 * the right things and that the comparator NOTICES when one of them changes —
 * because a check nobody has watched fail is decoration, and a fidelity check
 * that silently reads nothing would have passed every step of the rejected
 * work too.
 *
 * The mockup is loaded from disk over `file://`. Nothing in
 * `playwright.config.ts` restricts a spec to `baseURL`, and `playground/` is
 * deliberately not copied into `public/` or `out/`: a mockup may not ship
 * inside the site.
 *
 * Runs at all three viewports, which is not thoroughness for its own sake —
 * the mockup has two breakpoints, so 1024 drops the aside and 390 drops the
 * rail, and the extractor has to report those as absent rather than throwing.
 */

test.describe('the fidelity harness', () => {
  test('reads a non-empty set of design facts from the mockup', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const facts = await extractDesignFacts(page, MOCKUP_SELECTORS)
    const read = factsRead(facts)

    // The floor is the point. `compareDesignFacts` of two empty fact sets is
    // an empty difference list, so a broken selector map would make every
    // comparison in M16 pass while reading nothing at all.
    //
    // It moves with the viewport because the language says it should: below the
    // fold breakpoint the aside is gone and below the rail breakpoint the rail
    // is too, so there are genuinely fewer facts on screen.
    const width = page.viewportSize()!.width
    const floor = width >= 1180 ? 40 : width >= 880 ? 38 : 22
    expect(read.length, `only read: ${read.join(', ')}`).toBeGreaterThanOrEqual(floor)

    // And every fact that was read has to be a real value, not the empty
    // string a missing property would give.
    for (const key of read) {
      expect(facts[key], key).toMatch(/\S/)
    }
  })

  test('finds no difference between the mockup and itself', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    await page.reload()
    await freezeMotion(page)
    const again = await extractDesignFacts(page, MOCKUP_SELECTORS)

    expect(compareDesignFacts(reference, again)).toEqual([])
  })

  test('every fact in the table is one the mockup actually supplies', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const facts = await extractDesignFacts(page, MOCKUP_SELECTORS)
    const width = page.viewportSize()!.width

    // Below the fold breakpoint the aside is gone and below the rail
    // breakpoint the rail is too, so those roles are legitimately absent —
    // which is itself a design fact and is asserted rather than skipped.
    const absent = FACT_KEYS.filter((key) => facts[key] === null)
    const railRoles = /^(rail|railInner|group|groupCurrent|groupKey|item|tick)\./
    const asideRoles = /^aside/

    if (width >= 1180) {
      expect(absent, 'every role is on screen at full width').toEqual([])
    } else if (width >= 880) {
      expect(absent.every((key) => asideRoles.test(key)), `unexpectedly absent: ${absent}`).toBe(true)
      expect(absent.some((key) => asideRoles.test(key)), 'the aside should be gone here').toBe(true)
    } else {
      expect(
        absent.every((key) => asideRoles.test(key) || railRoles.test(key)),
        `unexpectedly absent: ${absent}`,
      ).toBe(true)
      expect(absent.some((key) => railRoles.test(key)), 'the rail should be gone here').toBe(true)
    }
  })

  /**
   * THE MUTATION PROOF, one case per fact.
   *
   * Each case paints over exactly one property in the mockup and asserts the
   * comparator reports **that** fact and nothing else. Every entry in the fact
   * table carries the value used to overwrite it, so a fact cannot be added
   * without also being proven to be checked — which is the property the
   * rejected work lacked: its criteria were all real, and none of them was
   * about the thing that was wrong.
   */
  for (const fact of DESIGN_FACTS) {
    const key = factKey(fact)

    test(`notices ${key} changing`, async ({ page }) => {
      await page.goto(MOCKUP_URL)
      await freezeMotion(page)
      const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

      if (reference[key] === null) {
        // The role is not on screen at this width. Nothing to mutate, and the
        // absence itself is asserted by the test above.
        test.skip(true, `${key} is absent at this viewport`)
        return
      }

      const selector = MOCKUP_SELECTORS[fact.role]!
      const property = fact.property.replaceAll(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
      await page.addStyleTag({
        content: `${selector} { ${property}: ${fact.mutate} !important; }`,
      })

      const mutated = await extractDesignFacts(page, MOCKUP_SELECTORS)
      const differences = compareDesignFacts(reference, mutated)

      // It must notice, and the value must really have moved rather than the
      // override being a no-op that the comparator then honestly ignores.
      expect(
        differences.map((difference) => difference.fact),
        `overriding ${property} on ${selector} changed nothing the harness reads`,
      ).toContain(key)

      const found = differences.find((difference) => difference.fact === key)!
      expect(found.actual).not.toBe(found.reference)
    })
  }
})

/* ===========================================================================
   M16 — the surfaces, each against the mockup it came from.

   This is what the milestone is for. Every stage adds its roles to
   `APP_SELECTORS` and a block here, and the comparison is restricted to the
   roles that stage built — not as a way to hide a difference, but because a
   surface that does not exist yet has nothing to compare. Each block asserts
   its own roles were really read on both sides, so restricting the comparison
   cannot make it vacuous.
   =========================================================================== */

test.describe('M16 stage 1 — the bar and the band', () => {
  /** What stage 1 built. `barField` is in DELIBERATELY_ABSENT, with the reason. */
  const BUILT: readonly Role[] = ['bar', 'barInner', 'brand', 'barLink', 'barLinkCurrent']

  test('is indistinguishable from the mockup, in every fact it carries', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    // `/courses/` rather than `/`: the current-destination chip only exists on
    // a page that IS one of the bar's destinations, and the comparison would
    // otherwise read it as absent on both sides and check nothing.
    await page.goto('/courses/')
    await freezeMotion(page)
    const actual = await extractDesignFacts(page, APP_SELECTORS)

    // Non-vacuity first, and on both sides. A typo in either selector map
    // would make every fact null and the difference list empty.
    for (const role of BUILT) {
      const read = FACT_KEYS.filter((key) => key.startsWith(`${role}.`))
      expect(read.length, `${role} contributes no fact`).toBeGreaterThan(0)
      expect(
        read.some((key) => reference[key] !== null),
        `${role} was not read in the mockup`,
      ).toBe(true)
      expect(
        read.some((key) => actual[key] !== null),
        `${role} was not read on the built page`,
      ).toBe(true)
    }

    expect(differencesIn(reference, actual, BUILT)).toEqual([])
  })

  test('renders the band, which is the language’s only ornament', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    await page.goto('/courses/')
    await freezeMotion(page)
    const actual = await extractDesignFacts(page, APP_SELECTORS)

    // The band is not in APP_SELECTORS' comparison set above because it is
    // `aria-hidden` decoration rather than a component, but it is the single
    // most load-bearing thing in the design after the bar itself: 18px of
    // lattice that the sticky offset is measured from. So it is asserted to
    // exist and to match, separately and by name.
    expect(reference['band.height'], 'the mockup has no band').not.toBeNull()
    expect(differencesIn(reference, actual, ['band'])).toEqual([])
  })

  /**
   * The mutation, in the same sitting as the check. In M15 this twice found
   * the hole in the check rather than in the code.
   */
  test('notices when the built bar stops matching', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    await page.goto('/courses/')
    await freezeMotion(page)
    // The exact failure the rejected work shipped: the bar on the page ground
    // instead of on cobalt. DESIGN.md's first Don't, and the one change that
    // "removes the language".
    await page.addStyleTag({
      content: '.bz-bar { background: var(--color-surface) !important; }',
    })
    const mutated = await extractDesignFacts(page, APP_SELECTORS)

    const differences = differencesIn(reference, mutated, BUILT)
    expect(differences.map((difference) => difference.fact))
      .toContain('bar.backgroundColor')
  })

  test('records a reason for every role it does not render', async ({ page }) => {
    // A role absent with no entry here is a difference nobody explained, and an
    // unexplained difference is how a real one gets ignored.
    for (const [role, reason] of Object.entries(DELIBERATELY_ABSENT)) {
      expect(reason.length, `${role} is absent with no reason`).toBeGreaterThan(20)
      expect(APP_SELECTORS[role as Role], `${role} is both absent and mapped`)
        .toBeUndefined()
    }
  })
})
