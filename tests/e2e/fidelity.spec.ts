import { expect, test } from '@playwright/test'
import { A0, SHEETS, SHORT } from './sheets'
import { openRegisterRow, seedRecord, signedSheet, waitForHydratedReadout } from './record'
import {
  APP_SELECTORS,
  CATALOG_SELECTORS,
  CATALOG_URL,
  DELIBERATELY_ABSENT,
  DESIGN_FACTS,
  NARROW_DEVIATIONS,
  freezeMotion,
  FACT_KEYS,
  MOCKUP_SELECTORS,
  MOCKUP_URL,
  DASHBOARD_SELECTORS,
  DASHBOARD_URL,
  HOME_SELECTORS,
  HOME_URL,
  PROGRESS_SELECTORS,
  PROGRESS_URL,
  REFERENCE_OF,
  REFERENCE_SELECTORS,
  REFERENCE_URL,
  WITHOUT_REFERENCE,
  compareDesignFacts,
  differencesAt,
  differencesIn,
  extractDesignFacts,
  factKey,
  factsRead,
  isColourProperty,
  type Reference,
  type Role,
} from './fidelity'

/**
 * The roles one document specifies, as fact keys.
 *
 * The harness reads TWO mockups from M16 stage 4 on, so every self-test below
 * has to say which one it is talking about. Without this the "every fact the
 * mockup supplies" test would report all thirty-nine catalog facts as missing
 * from `01` — correctly, and uselessly.
 */
function keysOf(reference: Reference): string[] {
  return FACT_KEYS.filter((key) => REFERENCE_OF[key.split('.')[0] as Role] === reference)
}

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
    // The menu is the one role that is absent at EVERY width, and on purpose:
    // it is a panel a reader opens. Both documents hide it until then, by
    // different mechanisms, and stage 2's own block is what opens both and
    // compares them.
    const menuRoles = /^menu/
    const absent = keysOf('01').filter((key) => facts[key] === null && !menuRoles.test(key))
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
   * The second reference document, read on its own terms.
   *
   * `03` draws its three alternatives as three stacked frames in ONE document,
   * so unlike `01` nothing in it is behind a breakpoint or a disclosure: every
   * catalog role is on screen at every width. The expected count is computed
   * from the fact table rather than written down, so adding a catalog fact
   * cannot quietly lower the floor.
   */
  test('reads every catalog fact from the catalog mockup', async ({ page }) => {
    await page.goto(CATALOG_URL)
    await freezeMotion(page)
    const facts = await extractDesignFacts(page, CATALOG_SELECTORS)
    const wanted = keysOf('03')

    expect(wanted.length, 'no catalog facts in the table').toBeGreaterThan(20)
    const absent = wanted.filter((key) => facts[key] === null)
    expect(absent, `03 does not supply: ${absent.join(', ')}`).toEqual([])
  })

  /**
   * **D31, as a rule a machine applies.**
   *
   * `03` is on the retired cool-grey palette with a green accent, and it says
   * so itself. So a fact specified by it may be a length or a type step and may
   * never be a colour: comparing the built catalog's colour against `03` would
   * demand exactly the design the last five milestones were rejected for.
   *
   * This is the guard that makes the split structural instead of a sentence in
   * a document somebody has to have read. The catalog's colour is held by
   * `styling-references.test.ts`, `surface-stylesheets.test.ts` and the
   * contrast suite, none of which needs a mockup to do it.
   */
  test('compares a non-shell mockup on geometry alone', async () => {
    const coloured = DESIGN_FACTS.filter(
      (fact) => REFERENCE_OF[fact.role] !== '01' && isColourProperty(fact.property),
    ).map(factKey)

    expect(
      coloured,
      'these compare COLOUR against a mockup that is deliberately on the old ' +
        'palette (D31): geometry comes from the component mockup, colour from `01`',
    ).toEqual([])

    // Non-vacuity: the filter above has to be looking at something.
    expect(keysOf('03').length).toBeGreaterThan(20)
  })

  /**
   * Every role is accounted for, one way or the other.
   *
   * A role the application renders is either specified by a mockup or derived
   * from primitives with the derivation written down (**D30**). What this
   * refuses is the third case — a role that is simply unexplained — because an
   * unexplained role is how "no mockup draws this" and "nobody checked" become
   * indistinguishable.
   */
  test('accounts for every role it maps, by reference or by derivation', async () => {
    const unexplained = (Object.keys(APP_SELECTORS) as Role[]).filter(
      (role) => REFERENCE_OF[role] === undefined && WITHOUT_REFERENCE[role] === undefined,
    )
    expect(unexplained, `no mockup and no recorded derivation: ${unexplained}`).toEqual([])

    // And every fact in the table names a document, or the mutation proof
    // above would have nothing to open.
    const homeless = DESIGN_FACTS.filter((fact) => REFERENCE_OF[fact.role] === undefined)
    expect(homeless.map(factKey), 'a fact whose role has no reference document').toEqual([])
  })

  /**
   * EVERY NARROW DEVIATION IS STILL DEVIATING, AND ONLY BELOW ITS WIDTH.
   *
   * An exemption is the one thing in this harness that can make a comparison
   * pass without the design being right, so each one is held to both halves of
   * its own claim: above the width it names, the fact must match the mockup;
   * below it, the fact must really differ. A stale entry — one kept after the
   * difference was fixed — is an exemption that would hide the NEXT
   * difference, and it fails here rather than waiting to be noticed.
   */
  for (const [key, deviation] of Object.entries(NARROW_DEVIATIONS)) {
    const role = key.split('.')[0] as Role
    const source = REFERENCE_OF[role]!

    test(`keeps ${key} exempt only below ${deviation.below}px`, async ({ page }) => {
      const width = page.viewportSize()!.width
      const selectors = REFERENCE_SELECTORS[source]

      await page.goto(REFERENCE_URL[source])
      await freezeMotion(page)
      const reference = await extractDesignFacts(page, selectors)

      await page.goto(source === '03' ? '/sheets/' : SHORT.path)
      await freezeMotion(page)
      if (source === '03') {
        await page.addStyleTag({ content: '.bz-view { display: block !important; }' })
      }
      const actual = await extractDesignFacts(page, APP_SELECTORS)

      if (reference[key] === null || actual[key] === null) {
        test.skip(true, `${key} is absent at this viewport`)
        return
      }

      if (width >= deviation.below) {
        expect(actual[key], `${key} is exempt below ${deviation.below}px, not here`)
          .toBe(reference[key])
      } else {
        expect(
          actual[key],
          `${key} no longer deviates below ${deviation.below}px — the exemption ` +
            'is stale and would hide the next difference',
        ).not.toBe(reference[key])
      }
    })
  }

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
    /* Which document specifies this fact. Every fact in the table has one —
       the completeness test below is what makes that true — so the `!` is
       safe and a missing entry fails loudly there rather than quietly here. */
    const source = REFERENCE_OF[fact.role]!

    test(`notices ${key} changing`, async ({ page }) => {
      await page.goto(REFERENCE_URL[source])
      await freezeMotion(page)
      // A menu is a panel a reader opens, so it is off screen at every width
      // and its facts would skip for ever — fifteen of them, unproven, which
      // is precisely the hole "one case per fact" exists to close. Opened here
      // rather than exempted.
      if (fact.role.startsWith('menu')) {
        await page.locator('.mainnav > span').first().hover()
        await expect(page.locator('.dd').first()).toBeVisible()
      }
      const selectors = REFERENCE_SELECTORS[source]
      const reference = await extractDesignFacts(page, selectors)

      if (reference[key] === null) {
        // The role is not on screen at this width. Nothing to mutate, and the
        // absence itself is asserted by the test above.
        test.skip(true, `${key} is absent at this viewport`)
        return
      }

      const selector = selectors[fact.role]!
      const property = fact.property.replaceAll(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
      await page.addStyleTag({
        content: `${selector} { ${property}: ${fact.mutate} !important; }`,
      })

      if (fact.role.startsWith('menu')) {
        await page.locator('.mainnav > span').first().hover()
        await expect(page.locator('.dd').first()).toBeVisible()
      }
      const mutated = await extractDesignFacts(page, selectors)
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

    expect(differencesAt(reference, actual, BUILT, page.viewportSize()!.width)).toEqual([])
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

test.describe('M16 stage 1 part 2 — the frame', () => {
  /** What part 2 built. The rail's own facts are stage 3's. */
  const BUILT: readonly Role[] = ['column', 'aside']

  test('caps the reading column and hangs the aside where the mockup does', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    // A module page: the one route the three-column grid belongs to, because
    // it is the only one any mockup draws with a fixed leading track.
    await page.goto('/courses/fundamentals/rag/')
    await freezeMotion(page)
    const actual = await extractDesignFacts(page, APP_SELECTORS)

    /*
      Symmetry rather than presence, because the aside is SUPPOSED to be gone
      below 1180px — in the mockup and on the page alike. Demanding it be read
      at every viewport failed at 1024 and 390 for the right reason, so what is
      asserted is that both documents agree about whether a role is on screen.
      That is the breakpoint behaviour as well as the non-vacuity guard.
    */
    const shown = (facts: Record<string, string | null>, role: Role) =>
      FACT_KEYS.filter((key) => key.startsWith(`${role}.`)).some((key) => facts[key] !== null)

    for (const role of BUILT) {
      expect(
        FACT_KEYS.filter((key) => key.startsWith(`${role}.`)).length,
        `${role} contributes no fact`,
      ).toBeGreaterThan(0)
      expect(
        shown(actual, role),
        `${role}: on screen in the mockup ${shown(reference, role)}, on the page ${shown(actual, role)}`,
      ).toBe(shown(reference, role))
    }

    // …and not every role absent, which would compare nothing at all.
    expect(BUILT.some((role) => shown(reference, role)), 'no role on screen here').toBe(true)

    expect(differencesIn(reference, actual, BUILT)).toEqual([])
  })

  test('notices when the measure stops matching', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    await page.goto('/courses/fundamentals/rag/')
    await freezeMotion(page)
    // The measure is what keeps a line readable on a wide window. Widening it
    // is invisible until somebody tries to read a 1440px line.
    await page.addStyleTag({ content: '.bz-col { max-width: none !important; }' })
    const mutated = await extractDesignFacts(page, APP_SELECTORS)

    expect(differencesIn(reference, mutated, BUILT).map((one) => one.fact))
      .toContain('column.maxWidth')
  })
})

test.describe('M16 stage 2 — the dropdown a bar item opens', () => {
  const BUILT: readonly Role[] = ['menu', 'menuItem', 'menuKey', 'menuCount']

  /**
   * Both panels start hidden, and by different mechanisms — which is the
   * point of comparing them at all rather than reading the stylesheet.
   *
   * The mockup's `.dd` is `display: none` until `.mainnav > *` is hovered or
   * holds focus. The application uses a native `<details>`, so the browser
   * hides it and no rule has to: that is what lets the menu work in the first
   * frame, before any bundle arrives (**D17**). Two mechanisms, one appearance,
   * and the appearance is what has to match.
   *
   * `02-navbar.html` chose this variant and `01` re-drew it in the shell's own
   * palette, so `01` is the reference for both geometry and colour here and
   * D31's split does not apply. What `02` still holds that `01` dropped: a
   * 290px panel, a 10px radius and an uppercase group eyebrow. Superseded.
   */
  async function openBoth(page: import('@playwright/test').Page) {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    await page.locator('.mainnav > span').first().hover()
    await expect(page.locator('.dd').first()).toBeVisible()
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    await page.goto('/courses/')
    await freezeMotion(page)
    // A real gesture, not `details.open = true`: the disclosure has to open the
    // way a reader opens it or the test proves nothing about the reader's path.
    await page.locator('.bz-bar-nav summary').first().click()
    await expect(page.locator('.bz-menu').first()).toBeVisible()
    const actual = await extractDesignFacts(page, APP_SELECTORS)

    return { reference, actual }
  }

  test('is indistinguishable from the mockup, once opened', async ({ page }) => {
    const { reference, actual } = await openBoth(page)

    for (const role of BUILT) {
      const read = FACT_KEYS.filter((key) => key.startsWith(`${role}.`))
      expect(read.length, `${role} contributes no fact`).toBeGreaterThan(0)
      expect(read.some((key) => reference[key] !== null), `${role} unread in the mockup`).toBe(true)
      expect(read.some((key) => actual[key] !== null), `${role} unread on the page`).toBe(true)
    }

    // `differencesAt` and not `differencesIn`, which is what every other stage
    // uses and what this one should have: only the former consults
    // `NARROW_DEVIATIONS`, so a fact that legitimately stops being specified
    // below the breakpoint could never be registered for this block. Found
    // when the menu had to leave the bar at 390 — see `menu.minWidth`.
    expect(differencesAt(reference, actual, BUILT, page.viewportSize()!.width)).toEqual([])
  })

  test('notices when the menu loses the shadow that lifts it off the page', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    await page.locator('.mainnav > span').first().hover()
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    await page.goto('/courses/')
    await freezeMotion(page)
    await page.locator('.bz-bar-nav summary').first().click()
    // The language spends a shadow in exactly two places and this is one:
    // a menu that opened over content. Without it the panel reads as part of
    // the page rather than as something temporary above it.
    await page.addStyleTag({ content: '.bz-menu { box-shadow: none !important; }' })
    const mutated = await extractDesignFacts(page, APP_SELECTORS)

    expect(differencesIn(reference, mutated, BUILT).map((one) => one.fact))
      .toContain('menu.boxShadow')
  })

  /**
   * **D17's rule, and both halves of it.** A disclosure has to be asserted
   * closed as well as open, because either alone passes for the wrong reason:
   * the first version of this menu used `:focus-within` on a
   * `visibility: hidden` panel, which is circular — a hidden element is out of
   * the tab order, so focus can never get inside to fire the rule that would
   * reveal it. The five level links were unreachable by keyboard and the
   * verification that missed it called `.focus()` instead of pressing Tab.
   */
  test('keeps its rows out of the tab order until it is open', async ({ page }) => {
    await page.goto('/courses/')
    await freezeMotion(page)

    const rows = page.locator('.bz-menu-item')
    await expect(rows.first()).not.toBeVisible()

    // Closed: a Tab walk cannot reach a row. Bounded, and long enough to pass
    // the whole bar.
    let reached = false
    for (let press = 0; press < 40 && !reached; press += 1) {
      await page.keyboard.press('Tab')
      reached = await page.evaluate(() =>
        document.activeElement?.closest('.bz-menu-item') !== null
        && document.activeElement?.closest('.bz-menu-item') !== undefined)
    }
    expect(reached, 'a menu row was reachable while the menu was closed').toBe(false)

    // Open: they are in it.
    await page.locator('.bz-bar-nav summary').first().click()
    await expect(rows.first()).toBeVisible()
    await rows.first().focus()
    await expect(rows.first()).toBeFocused()
  })
})

test.describe('M16 stage 3 — the rail', () => {
  const BUILT: readonly Role[] = [
    'rail', 'railInner', 'group', 'groupCurrent', 'groupKey', 'item', 'tick',
  ]

  /*
    Below the rail breakpoint there is no rail — in the mockup and on the page
    alike, which is the language dropping the least redundant column first.
    That absence is a design fact and it IS asserted, by the harness's own
    per-breakpoint case; what it is not is something these two cases can
    compare, so they stand down rather than assert nothing.
  */
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 880, 'the rail is gone at this width')

  /** `fundamentals/rag` — the slug shape the record stores a sheet under. */
  const slugOf = (path: string) => path.replace('/courses/', '').replace(/\/$/, '')

  /**
   * Every written module completed.
   *
   * Not thoroughness: the completion disc is `display: none` until the
   * generated per-module sheet reveals it, so a page with no record has no disc
   * to compare and `tick` would read `null` on one side only. Seeding is what
   * makes the comparison possible, and it exercises all nineteen generated
   * rules while it is at it — a mark drawn from Web Storage in a blocking script
   * before first paint, with no island anywhere near it.
   */
  async function seedEveryCompletion(page: import('@playwright/test').Page) {
    await seedRecord(page, {
      sheets: Object.fromEntries(
        SHEETS.filter((sheet) => sheet.drawn)
          .map((sheet) => [slugOf(sheet.path), signedSheet('b7225f8')]),
      ),
    })
  }

  test('is indistinguishable from the mockup, discs included', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    /*
      A FUNDAMENTALS module, and the choice is load-bearing rather than
      arbitrary. Every rail fact read from "the first group that is not the
      current one" depends on which group that is — and the key's hue most of
      all. The mockup's current group is the first level, so a page whose
      current group is any other level would compare category-1 against
      category-2 and report a difference that is really a difference of
      CONTENT. Same position in the series on both sides, or the comparison is
      not about the design.
    */
    await seedEveryCompletion(page)
    await page.goto(SHORT.path)
    await freezeMotion(page)
    const actual = await extractDesignFacts(page, APP_SELECTORS)

    const shown = (facts: Record<string, string | null>, role: Role) =>
      FACT_KEYS.filter((key) => key.startsWith(`${role}.`)).some((key) => facts[key] !== null)

    for (const role of BUILT) {
      expect(shown(actual, role), `${role}: mockup ${shown(reference, role)}, page ${shown(actual, role)}`)
        .toBe(shown(reference, role))
    }
    expect(BUILT.some((role) => shown(reference, role)), 'no role on screen here').toBe(true)

    expect(differencesIn(reference, actual, BUILT)).toEqual([])
  })

  /**
   * The current group is emphasised four ways at once — a larger type size, a
   * sunken fill, a strong border and a thick leading edge in its own hue — and
   * the redundancy is the design. Losing any one of the four is what this
   * notices, because a reader who cannot separate the hues still has three.
   */
  test('notices when the current group stops being unmistakable', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    await seedEveryCompletion(page)
    await page.goto(SHORT.path)
    await freezeMotion(page)
    await page.addStyleTag({
      // `99px` rather than `inherit`: an inherited size can resolve to the
      // very value being overridden, and a mutation that changes nothing
      // proves nothing.
      content: '.bz-group[data-here] > summary { font-size: 99px !important;'
        + ' background: magenta !important; border-left-width: 99px !important; }',
    })
    const mutated = await extractDesignFacts(page, APP_SELECTORS)

    const facts = differencesIn(reference, mutated, BUILT).map((one) => one.fact)
    expect(facts).toContain('groupCurrent.fontSize')
    expect(facts).toContain('groupCurrent.backgroundColor')
    expect(facts).toContain('groupCurrent.borderLeftWidth')
  })
})

test.describe('M16 stage 4 — the catalog', () => {
  const BUILT: readonly Role[] = [
    'filterBar', 'chip', 'chipCurrent', 'chipKey',
    'levelHead', 'levelKey', 'catalogCard', 'cardTitle',
    'tableHead', 'tableCell', 'tableEdge',
    'board', 'boardColumn', 'boardHead', 'boardTrack', 'boardList', 'boardMod',
  ]

  /** The one route that renders `Catalog`; the other two share only the table. */
  const CATALOG_ROUTE = '/sheets/'

  /**
   * Reveal all three views before reading.
   *
   * The extractor calls `checkVisibility()`, so a hidden element reads as
   * absent — and the whole point of the catalog is that two of its three views
   * are `display: none` at any moment. Without this, thirteen of the seventeen
   * roles would skip on every run and the comparison would quietly be about
   * the filter bar alone.
   *
   * The same shape stage 2 uses to open the dropdown before comparing it: the
   * reveal MECHANISM is asserted elsewhere and by the tests that can actually
   * see it — `catalog.spec.ts` walks the tab order on both sides of it and
   * `tests/unit/catalog/views.test.ts` holds the channel-A selector list
   * complete. What is being compared here is geometry, and geometry does not
   * depend on which view a reader last chose.
   */
  async function revealEveryView(page: import('@playwright/test').Page) {
    await page.addStyleTag({ content: '.bz-view { display: block !important; }' })
  }

  test('is indistinguishable from its mockup, in every length it carries', async ({ page }) => {
    await page.goto(CATALOG_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, CATALOG_SELECTORS)

    await page.goto(CATALOG_ROUTE)
    await freezeMotion(page)
    await revealEveryView(page)
    const actual = await extractDesignFacts(page, APP_SELECTORS)

    const shown = (facts: Record<string, string | null>, role: Role) =>
      FACT_KEYS.filter((key) => key.startsWith(`${role}.`)).some((key) => facts[key] !== null)

    /* Symmetry first, and it is the check that would have caught the whole
       rejected milestone series: a role read on neither side compares equal,
       so a comparison over roles nothing renders is green and empty. */
    for (const role of BUILT) {
      expect(
        shown(actual, role),
        `${role}: mockup ${shown(reference, role)}, page ${shown(actual, role)}`,
      ).toBe(shown(reference, role))
    }
    expect(BUILT.every((role) => shown(reference, role)), 'a role the mockup does not draw').toBe(true)

    expect(differencesAt(reference, actual, BUILT, page.viewportSize()!.width)).toEqual([])
  })

  /**
   * The mutation, and it is pointed at the number the mockup states and a
   * reader would never notice was wrong: the 3px leading edge a table row's
   * level hue rides, and the 3px top edge a card's does. Both are the same
   * value in `03` and both are how a level is identified without a tinted
   * fill (**D33**), so getting one of them wrong is exactly the sort of
   * near-miss that survived five milestones.
   */
  test('notices when a level stops riding a 3px edge', async ({ page }) => {
    await page.goto(CATALOG_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, CATALOG_SELECTORS)

    await page.goto(CATALOG_ROUTE)
    await freezeMotion(page)
    await revealEveryView(page)
    await page.addStyleTag({
      content: '.bz-catcard { border-top-width: 1px !important; }'
        + ' .bz-row > :first-child { border-left-width: 1px !important; }',
    })
    const mutated = await extractDesignFacts(page, APP_SELECTORS)

    const facts = differencesIn(reference, mutated, BUILT).map((one) => one.fact)
    expect(facts).toContain('catalogCard.borderTopWidth')
    expect(facts).toContain('tableEdge.borderLeftWidth')
  })

  /**
   * The toggle is the one component in the stage with no reference, so what
   * can be asserted about it is that it EXISTS, that its derivation is
   * recorded, and that the thing the derivation turns on is true: the showing
   * button is told apart by a heavier bottom rule, which is a width and
   * therefore survives forced colours.
   */
  test('renders the derived toggle, and marks the showing one by a width', async ({ page }) => {
    expect(WITHOUT_REFERENCE.viewToggle, 'the toggle’s derivation is unrecorded').toBeTruthy()
    expect(REFERENCE_OF.viewToggle, 'a mockup cannot specify the toggle').toBeUndefined()

    await page.goto(CATALOG_ROUTE)
    await freezeMotion(page)

    const weights = await page.locator('.bz-viewbtn').evaluateAll((nodes) =>
      nodes.map((node) => ({
        view: node.getAttribute('data-view'),
        bottom: getComputedStyle(node).borderBottomWidth,
      })),
    )
    expect(weights.length, 'no toggle rendered').toBe(3)

    // Nothing is stamped on `<html>` on a first visit, so the fallback rule is
    // what is being read here — the same branch a reader with scripting off
    // gets, and the one `views.test.ts` requires by name.
    const showing = weights.filter((one) => one.bottom === '2px')
    expect(showing.map((one) => one.view), 'exactly one view is showing').toEqual(['overview'])
  })
})

test.describe('M16 stage 5 — the reading page', () => {
  /** What every reading page has, whatever the module says. */
  const BUILT: readonly Role[] = [
    'crumb', 'display', 'tag', 'section', 'card',
    'actions', 'buttonPrimary', 'buttonQuiet', 'pager', 'pagerItem', 'asideLink',
  ]

  /**
   * Roles the CORPUS decides, compared where a module supplies one.
   *
   * A subsection is an `h3`, and whether a module has one is an authoring
   * choice — the mockup draws one, and requiring every module to have one
   * would make this comparison a statement about the content. Kept in the
   * table and compared conditionally rather than dropped, because dropping it
   * would leave `.bz-subsection` unchecked on the pages that do have one.
   */
  const WHERE_THE_CORPUS_SUPPLIES_ONE: readonly Role[] = ['subsection']

  /*
    A0 AND NOT THE SHORT MODULE, and the symmetry check is what said so: the
    short one has no prerequisites, so `Requirements (n)` renders nothing — a
    control that opens an empty panel is refused — and `buttonQuiet` was
    absent on the page while the mockup drew one. The assembly module has the
    fullest anatomy of the thirty-three, which is what this comparison wants.
  */

  /**
   * The aside is gone below the fold breakpoint and the mockup's is too, so
   * `asideLink` is legitimately absent on both sides there — which the
   * symmetry check below asserts rather than skips. What cannot be compared
   * below the RAIL breakpoint is different: nothing on this page disappears,
   * so the block runs at every width.
   */
  test('is indistinguishable from the mockup, in every fact its column carries', async ({
    page,
  }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    await page.goto(A0.path)
    await freezeMotion(page)
    const actual = await extractDesignFacts(page, APP_SELECTORS)

    const shown = (facts: Record<string, string | null>, role: Role) =>
      FACT_KEYS.filter((key) => key.startsWith(`${role}.`)).some((key) => facts[key] !== null)

    for (const role of BUILT) {
      expect(
        shown(actual, role),
        `${role}: mockup ${shown(reference, role)}, page ${shown(actual, role)}`,
      ).toBe(shown(reference, role))
    }
    expect(BUILT.some((role) => shown(reference, role)), 'no role on screen here').toBe(true)

    const width = page.viewportSize()!.width
    expect(differencesAt(reference, actual, BUILT, width)).toEqual([])

    for (const role of WHERE_THE_CORPUS_SUPPLIES_ONE) {
      expect(shown(reference, role), `the mockup draws no ${role} to compare`).toBe(true)
      if (!shown(actual, role)) continue
      expect(differencesAt(reference, actual, [role], width)).toEqual([])
    }
  })

  /**
   * The mutation, pointed at the two things a reader would feel before they
   * could name: the dashed ochre rule after a section heading — the one place
   * ornament touches the reading column — and the 2px top rule that separates
   * reading from doing. Both are a WIDTH or a GAP rather than a colour, so
   * neither survives a reader who cannot see hue.
   */
  test('notices when the section rule or the action row loses its geometry', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    await page.goto(A0.path)
    await freezeMotion(page)
    await page.addStyleTag({
      content: '.bz-prose .bz-section { gap: 0px !important; }'
        + ' .bz-actions { border-top-width: 1px !important; padding-top: 0px !important; }',
    })
    const mutated = await extractDesignFacts(page, APP_SELECTORS)

    const facts = differencesAt(
      reference,
      mutated,
      BUILT,
      page.viewportSize()!.width,
    ).map((one) => one.fact)
    expect(facts).toContain('section.gap')
    expect(facts).toContain('actions.borderTopWidth')
    expect(facts).toContain('actions.paddingTop')
  })

  /**
   * §10.2 allows two nav landmarks and the breadcrumb's move spent one, so the
   * pager is NOT a `<nav>` — the mockup tags its own `nav.pn` and the landmark
   * rule outranks a tag choice, because a reader navigating by landmark meets
   * "Curriculum", "Main", "Course modules", "Sections" and then a fifth thing
   * called nothing in particular. The appearance is identical either way,
   * which is what the comparison above already proved.
   */
  test('draws the pager without spending a third nav landmark', async ({ page }) => {
    await page.goto(A0.path)
    const pager = page.locator('.bz-pager')
    await expect(pager).toHaveCount(1)
    expect(await pager.evaluate((node) => node.tagName.toLowerCase())).toBe('div')
    await expect(pager.locator('.bz-pager-item')).toHaveCount(2)
  })
})

test.describe('M16 stage 6 — code and figures', () => {
  const BUILT: readonly Role[] = ['slab', 'slabCode', 'figure']

  /** A module with both a code slab and a diagram in it. */
  const WITH_BOTH = '/courses/fundamentals/rag/'

  test('is indistinguishable from the mockup, slab and frame alike', async ({ page }) => {
    await page.goto(MOCKUP_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, MOCKUP_SELECTORS)

    await page.goto(WITH_BOTH)
    await freezeMotion(page)
    // The diagram's frame exists before mermaid runs — it is the scroll box the
    // renderer emitted — so nothing here waits on the island.
    const actual = await extractDesignFacts(page, APP_SELECTORS)

    const shown = (facts: Record<string, string | null>, role: Role) =>
      FACT_KEYS.filter((key) => key.startsWith(`${role}.`)).some((key) => facts[key] !== null)

    for (const role of BUILT) {
      expect(
        shown(actual, role),
        `${role}: mockup ${shown(reference, role)}, page ${shown(actual, role)}`,
      ).toBe(shown(reference, role))
    }
    expect(BUILT.every((role) => shown(reference, role)), 'a role the mockup does not draw').toBe(true)

    expect(differencesAt(reference, actual, BUILT, page.viewportSize()!.width)).toEqual([])
  })

  /**
   * THE DEFECT THIS STAGE EXISTED TO CLOSE, as a mutation.
   *
   * Every colour `mermaid-config.ts` names is a PAGE token, and the frame is
   * the dark slab — so without the rebinding on `.bz-figure` a diagram is a
   * near-white box inside a near-black one. That is what shipped from stage 0
   * until stage 6, and undoing the rebinding is exactly how it looked.
   */
  test('notices when a figure stops rebinding the page palette', async ({ page }) => {
    await page.goto(WITH_BOTH)
    await freezeMotion(page)

    const before = await page.locator('.bz-figure').first().evaluate((node) => ({
      line: getComputedStyle(node).getPropertyValue('--color-line-strong').trim(),
      surface: getComputedStyle(node).getPropertyValue('--color-surface-raised').trim(),
    }))
    const root = await page.evaluate(() => ({
      line: getComputedStyle(document.documentElement)
        .getPropertyValue('--color-line-strong').trim(),
      surface: getComputedStyle(document.documentElement)
        .getPropertyValue('--color-surface-raised').trim(),
    }))

    // The frame answers differently from the page, which IS the mechanism.
    expect(before.line, 'the figure does not rebind the line').not.toBe(root.line)
    expect(before.surface, 'the figure does not rebind the surface').not.toBe(root.surface)

    await page.addStyleTag({
      content: '.bz-figure { --color-line-strong: revert; --color-surface-raised: revert; }',
    })
    const after = await page.locator('.bz-figure').first().evaluate((node) => ({
      line: getComputedStyle(node).getPropertyValue('--color-line-strong').trim(),
      surface: getComputedStyle(node).getPropertyValue('--color-surface-raised').trim(),
    }))
    expect(after.line, 'reverting the rebinding changed nothing').toBe(root.line)
    expect(after.surface).toBe(root.surface)
  })

  /**
   * The third node role, which `06` contributes and the language now carries.
   * Asserted on the LANGUAGE rather than on a page, because no route renders a
   * hand-drawn node — see `DELIBERATELY_ABSENT.node` — and a state nobody can
   * see is still a state the next figure component will reach for.
   */
  test('carries three node roles, each told apart by more than a hue', async ({ page }) => {
    // An APP route, because the probe needs the language loaded: the mockup
    // spells its own nodes `.node` and has never heard of `.bz-node`.
    await page.goto(WITH_BOTH)
    const roles = await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.innerHTML =
        '<span class="bz-node"></span>'
        + '<span class="bz-node" data-active=""></span>'
        + '<span class="bz-node" data-here=""></span>'
      document.body.append(probe)
      const read = (node: Element) => {
        const style = getComputedStyle(node)
        return `${style.backgroundColor}|${style.borderTopColor}|${style.fontWeight}`
      }
      const out = [...probe.children].map(read)
      probe.remove()
      return out
    })

    expect(new Set(roles).size, `three roles, ${roles.length} distinct: ${roles}`).toBe(3)
    // And the two emphasised ones are heavier, so the hue is never alone.
    expect(roles[1]).toContain('600')
    expect(roles[2]).toContain('600')
  })
})

test.describe('M16 stage 7 — completion', () => {
  /**
   * `05`-C, which its own note puts "on the home page and on My progress" —
   * and `CourseCompletion` renders on both, so the home page is where these
   * are read.
   */
  const BUILT: readonly Role[] = ['levelCard', 'dial', 'dialValue', 'statRow', 'legendKey']

  test('is indistinguishable from `05`, in every length the overview carries', async ({ page }) => {
    await page.goto(PROGRESS_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, PROGRESS_SELECTORS)

    await page.goto('/')
    await freezeMotion(page)
    const actual = await extractDesignFacts(page, APP_SELECTORS)

    const shown = (facts: Record<string, string | null>, role: Role) =>
      FACT_KEYS.filter((key) => key.startsWith(`${role}.`)).some((key) => facts[key] !== null)

    for (const role of BUILT) {
      expect(
        shown(actual, role),
        `${role}: mockup ${shown(reference, role)}, page ${shown(actual, role)}`,
      ).toBe(shown(reference, role))
    }
    expect(BUILT.every((role) => shown(reference, role)), 'a role `05` does not draw').toBe(true)

    expect(differencesAt(reference, actual, BUILT, page.viewportSize()!.width)).toEqual([])
  })

  /**
   * THE MUTATION. Stages 1 to 6 each shipped one and stages 7 to 10 shipped
   * none — all four were closed in a single sitting, which is exactly when the
   * step that proves a comparison can fail is the step that gets skipped.
   * `CLAUDE.md` states the rule: the roles and the mutation in the same
   * sitting. This is the debt, paid.
   *
   * Pointed at the dial's own size, because the dial is what this stage added
   * and `05` states 74px flat. A dial a few pixels small still reads as a dial,
   * which is the near-miss that survived five milestones.
   */
  test('notices when the dial stops being the size `05` draws', async ({ page }) => {
    await page.goto(PROGRESS_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, PROGRESS_SELECTORS)

    await page.goto('/')
    await freezeMotion(page)
    await page.addStyleTag({
      content: '.bz-dial { width: 66px !important; height: 66px !important; }',
    })
    const mutated = await extractDesignFacts(page, APP_SELECTORS)

    const facts = differencesIn(reference, mutated, BUILT).map((one) => one.fact)
    expect(facts).toContain('dial.width')
    expect(facts).toContain('dial.height')
  })

  /**
   * The dial's ring is an ANNULUS made by occlusion, not by a mask: the outer
   * disc is painted entirely by a `conic-gradient` and an opaque inner disc
   * sits on top of it. Two things follow, and neither is visible in the
   * fact-by-fact comparison above.
   *
   * The inner disc must be filled with whatever it sits on, or a seam shows —
   * the ground is `#FDFBF7` and a card is `#FFFFFF`, so "transparent" is not
   * an option and "white" is only right by accident of which one it is on.
   *
   * And the ring's thickness is the difference of two diameters, so a change
   * to either that keeps both "on the scale" can still close the ring up.
   */
  test('draws a ring rather than a filled disc, on the fill it sits on', async ({ page }) => {
    await page.goto('/')
    await freezeMotion(page)

    const measured = await page.locator('.bz-dial').first().evaluate((node) => {
      const inner = node.querySelector('.bz-dial-value')!
      const outer = node.getBoundingClientRect()
      const disc = inner.getBoundingClientRect()
      return {
        annulus: Math.round(((outer.width - disc.width) / 2) * 10) / 10,
        discFill: getComputedStyle(inner).backgroundColor,
        cardFill: getComputedStyle(node.closest('.bz-cc-level')!).backgroundColor,
        gradient: getComputedStyle(node).backgroundImage,
      }
    })

    expect(measured.annulus, 'the ring has closed up or swallowed the number').toBe(9)
    expect(measured.discFill, 'the knockout is not the fill it sits on').toBe(measured.cardFill)
    expect(measured.discFill).not.toBe('rgba(0, 0, 0, 0)')
    expect(measured.gradient, 'the ring is not a conic gradient').toContain('conic-gradient')
  })

  /**
   * §12.2 — the reading that made the dial possible, and the only number
   * channel A carries.
   *
   * A `conic-gradient` stop is a length, so the ring needs a percentage in the
   * cascade before first paint. This asserts the whole chain in a browser: the
   * boot script computes it, `category.css` joins `--bz-done-<slug>` to the
   * `--bz-done` the language declares, and the gradient substitutes it — with
   * every `.js` request refused, so nothing React does can be what made it
   * true.
   */
  test('fills the ring in frame one, with no JavaScript at all', async ({ page }) => {
    await page.route('**/*.js', (route) => route.abort())
    await seedRecord(page, {
      sheets: { 'fundamentals/llms': { signedOff: '2026-08-14T09:00:00.000Z' } },
    })
    await page.goto('/')

    const read = await page.evaluate(() => {
      const dial = document.querySelector('.bz-cc-level[data-cat="fundamentals"] .bz-dial')!
      const other = document.querySelector('.bz-cc-level[data-cat="protocols"] .bz-dial')!
      const at = (node: Element) => getComputedStyle(node).getPropertyValue('--bz-done').trim()
      return {
        stamped: document.documentElement.style.getPropertyValue('--bz-done-fundamentals'),
        started: at(dial),
        untouched: at(other),
      }
    })

    // One of the level's modules, so a real fraction rather than 0 or 100.
    expect(read.stamped, 'the boot script stamped no percentage').toMatch(/^\d+%$/)
    expect(read.started).toBe(read.stamped)
    expect(Number.parseInt(read.started, 10)).toBeGreaterThan(0)
    expect(Number.parseInt(read.started, 10)).toBeLessThan(100)
    // And a level with nothing signed falls back to the language's own `0%`,
    // which is the true statement rather than an absent value.
    expect(read.untouched).toBe('0%')
  })
})

test.describe('M16 stage 8 — progress and account', () => {
  /**
   * `07`-A, on `/profile/` — the route that absorbed `/dashboard/`, `/path/`
   * and `/report/`.
   *
   * The hero is gated on BOTH channels, and this docblock used to claim the
   * wrong one. `nextUnsigned` returns the FIRST drawn module for an empty
   * record, not `null`, so "renders nothing until the store has answered" was
   * never true and the prerendered page shipped a populated shortcut to every
   * reader — the defect a review found and **D55** records. The box is gated on
   * channel A by `data-hl-record`; the CONTENT is channel B, because a module's
   * title is text and channel A stamps classes. Which is why this seeds a
   * record and waits for the readout before extracting: without a record the
   * box is `display: none` and the comparison would agree with itself about
   * nothing.
   */
  const BUILT: readonly Role[] = [
    'continueHero',
    'continueNum',
    'panel',
    'field',
    'fieldLabel',
    'fieldInput',
  ]

  test('is indistinguishable from `07`, in every length it specifies', async ({ page }) => {
    await page.goto(DASHBOARD_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, DASHBOARD_SELECTORS)

    await seedRecord(page, { sheets: { 'fundamentals/llms': signedSheet('a1b2c3d') } })
    await page.goto('/profile/')
    await waitForHydratedReadout(page)
    // The erase dialog holds the only danger button on the page, and a closed
    // `<details>` has no box for `getComputedStyle` to answer about.
    await openRegisterRow(page, 'data')
    await freezeMotion(page)
    const actual = await extractDesignFacts(page, APP_SELECTORS)

    const shown = (facts: Record<string, string | null>, role: Role) =>
      FACT_KEYS.filter((key) => key.startsWith(`${role}.`)).some((key) => facts[key] !== null)

    for (const role of BUILT) {
      expect(
        shown(actual, role),
        `${role}: mockup ${shown(reference, role)}, page ${shown(actual, role)}`,
      ).toBe(shown(reference, role))
    }
    expect(BUILT.every((role) => shown(reference, role)), 'a role `07` does not draw').toBe(true)

    expect(differencesAt(reference, actual, BUILT, page.viewportSize()!.width)).toEqual([])
  })

  /**
   * `07:88-89` draws the destructive control as a COLOUR-ONLY modifier — "it
   * changes nothing geometric" — and that claim cannot be checked against `07`,
   * because `07`'s button geometry is `07`'s and the product's is `01`'s.
   * MEASURED: 9px/15px/14px there against 11px/20px/15px here. So it is
   * checked against the quiet button beside it, on the page, which is the
   * comparison the claim is actually about.
   */
  test('draws the destructive control as a colour and nothing else', async ({ page }) => {
    await page.goto('/profile/')
    // The danger button is the erase row's trigger, and the row is a
    // `<details>` with no rendered box while it is closed.
    await openRegisterRow(page, 'data')

    const measured = await page.evaluate(() => {
      const read = (node: Element) => {
        const style = getComputedStyle(node)
        return {
          box: `${style.paddingTop}|${style.paddingLeft}|${style.fontSize}|${style.borderTopWidth}|${style.borderTopLeftRadius}`,
          edge: style.borderTopColor,
          ink: style.color,
          fault: getComputedStyle(document.documentElement)
            .getPropertyValue('--color-fault')
            .trim(),
          onSurface: getComputedStyle(document.documentElement)
            .getPropertyValue('--color-on-surface')
            .trim(),
        }
      }
      const danger = document.querySelector('.bz-btn-danger')
      // A plain `.bz-btn` on the same page: the modifier sits on top of it, so
      // "changes nothing geometric" is a claim about exactly this pair. There
      // is no quiet button on this route — the only one is inside the role
      // standing, which needs a role on record.
      const plain = document.querySelector('.bz-btn:not(.bz-btn-danger):not(.bz-btn-quiet)')
      return danger === null || plain === null ? null : { danger: read(danger), plain: read(plain) }
    })

    expect(measured, 'no danger button and plain button to compare').not.toBeNull()
    const { danger, plain } = measured!
    expect(danger.box, 'the danger button changes its geometry').toBe(plain.box)

    /*
      And what it DOES change: the edge carries the fault hue and the label does
      not. `fault` is a graphic token because it measures 5.48:1 on `surface` in
      light and 3.02:1 on `surface-raised` in dark — a 3:1 graphical floor in
      both themes and a 4.5:1 text floor in only one, and a floor that holds in
      one theme is not a floor. So the meaning is the word, then the edge, then
      the hue, and never the colour of the text.
    */
    const rgb = (hex: string) => {
      const n = Number.parseInt(hex.replace('#', ''), 16)
      return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
    }
    expect(danger.edge, 'the danger button does not tint its edge').toBe(rgb(danger.fault))
    expect(danger.ink, 'the danger button spends the fault hue on its text').toBe(
      rgb(danger.onSurface),
    )
  })

  /**
   * §15.11 — the shortcut is offered only to a reader who has a record, and
   * this is the test whose absence let it ship to everybody.
   *
   * `/profile/`'s hero had NO gate: the prerendered page carried a populated
   * "Continue where you left off → LLM Fundamentals" for every reader,
   * including a fresh browser, and with the bundle blocked it never corrected.
   * The component's own docblock claimed it rendered nothing until the store
   * answered — `nextUnsigned` returns the FIRST drawn module for an empty
   * record, not `null`, so it never did.
   *
   * Measured with every `.js` request refused, because the gate is channel A
   * and nothing React does may be what makes it true. The equivalent test for
   * the home page's shortcut is in the stage 9 block.
   */
  test('offers the continue hero only to a reader with a record, in frame one', async ({ page }) => {
    await page.route('**/*.js', (route) => route.abort())

    await page.goto('/profile/')
    const clean = await page.evaluate(() => {
      const hero = document.querySelector('.bz-cont') as HTMLElement | null
      return {
        stamped: document.documentElement.hasAttribute('data-hl-record'),
        present: hero !== null,
        shown: hero?.checkVisibility() ?? null,
        // What it would have claimed if it were shown.
        eyebrow: (document.querySelector('.bz-cont-eyebrow')?.textContent ?? '').trim(),
      }
    })
    expect(clean.stamped, 'a fresh browser was stamped as carrying a record').toBe(false)
    expect(clean.present, 'no continue hero in the document at all').toBe(true)
    expect(clean.shown, 'a fresh browser is offered a shortcut it has not earned').toBe(false)
    // And the copy does not claim a reader with no completions left off
    // somewhere — the mockup draws one state and there are two.
    expect(clean.eyebrow).toBe('Start with')

    await seedRecord(page, { sheets: { 'fundamentals/llms': signedSheet('a1b2c3d') } })
    await page.goto('/profile/')
    const returning = await page.evaluate(() => ({
      stamped: document.documentElement.hasAttribute('data-hl-record'),
      shown: (document.querySelector('.bz-cont') as HTMLElement).checkVisibility(),
    }))
    expect(returning.stamped).toBe(true)
    expect(returning.shown, 'a reader with a record is not offered the shortcut').toBe(true)
  })

  /**
   * §13.3 — the nine-role reveal, in a browser, with every `.js` request
   * refused.
   *
   * All nine ordered paths are in the prerendered document and channel A shows
   * one. The unit guard holds the STYLESHEET to naming all nine and negating
   * all nine; this holds the PAGE to showing exactly one of them, which is the
   * thing a reader would notice and the thing no regular expression over CSS
   * can see.
   */
  test('shows one role path in frame one, and only one', async ({ page }) => {
    await page.route('**/*.js', (route) => route.abort())
    await seedRecord(page, { identity: { role: 'qa' } })
    await page.goto('/profile/')
    // The role row is a `<details>` and a closed one has no rendered box, so
    // `checkVisibility()` would report every path hidden for the wrong reason.
    // Opening a `<summary>` is the browser's own behaviour and needs no script.
    await page.locator('section[aria-labelledby="role"] summary').click()

    const seen = await page.evaluate(() => {
      const shown = [...document.querySelectorAll('.bz-path-body')].filter((node) =>
        node.checkVisibility(),
      )
      return {
        total: document.querySelectorAll('.bz-path-body').length,
        shown: shown.map((node) => node.getAttribute('data-role')),
        empties: [...document.querySelectorAll('.bz-path-empty')].filter((node) =>
          node.checkVisibility(),
        ).length,
      }
    })

    expect(seen.total, 'the nine paths are not all prerendered').toBe(9)
    expect(seen.shown).toEqual(['qa'])
    // And the empty state is NOT shown beside it, which is the contradiction
    // the negation chain exists to prevent.
    expect(seen.empties, 'the empty state is shown beside a chosen path').toBe(0)
  })

  /** The other half: no role, no path, and the empty state instead. */
  test('shows no path at all, and says so, when no role is on record', async ({ page }) => {
    await page.route('**/*.js', (route) => route.abort())
    await page.goto('/profile/')
    await page.locator('section[aria-labelledby="role"] summary').click()

    const seen = await page.evaluate(() => ({
      shown: [...document.querySelectorAll('.bz-path-body')].filter((node) =>
        node.checkVisibility(),
      ).length,
      empties: [...document.querySelectorAll('.bz-path-empty')].filter((node) =>
        node.checkVisibility(),
      ).length,
    }))

    expect(seen.shown, 'a path is drawn for a role nobody chose').toBe(0)
    expect(seen.empties, 'no empty state where there is no path').toBeGreaterThan(0)
  })
  /**
   * THE MUTATION, owed since this block was written. Pointed at the panel's
   * padding: `07` states 11px and the language holds 8px on the radius
   * deliberately, so the padding is the one of the two that is meant to agree
   * and is therefore the one worth proving can disagree.
   */
  test('notices when a panel stops taking `07`\'s padding', async ({ page }) => {
    await page.goto(DASHBOARD_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, DASHBOARD_SELECTORS)

    await seedRecord(page, { sheets: { 'fundamentals/llms': signedSheet('a1b2c3d') } })
    await page.goto('/profile/')
    await waitForHydratedReadout(page)
    await openRegisterRow(page, 'data')
    await freezeMotion(page)
    await page.addStyleTag({
      content: '.bz-panel { padding-top: 4px !important; padding-left: 4px !important; }',
    })
    const mutated = await extractDesignFacts(page, APP_SELECTORS)

    const facts = differencesIn(reference, mutated, BUILT).map((one) => one.fact)
    expect(facts).toContain('panel.paddingTop')
    expect(facts).toContain('panel.paddingLeft')
  })
})

test.describe('M16 stage 9 — the front door', () => {
  const BUILT: readonly Role[] = ['heroActions', 'factRow', 'whyMark', 'whyGrid']

  test('is indistinguishable from `08`, in the measures and the lengths', async ({ page }) => {
    await page.goto(HOME_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, HOME_SELECTORS)

    await page.goto('/')
    await freezeMotion(page)
    const actual = await extractDesignFacts(page, APP_SELECTORS)

    const shown = (facts: Record<string, string | null>, role: Role) =>
      FACT_KEYS.filter((key) => key.startsWith(`${role}.`)).some((key) => facts[key] !== null)

    for (const role of BUILT) {
      expect(
        shown(actual, role),
        `${role}: mockup ${shown(reference, role)}, page ${shown(actual, role)}`,
      ).toBe(shown(reference, role))
    }
    expect(BUILT.every((role) => shown(reference, role)), 'a role `08` does not draw').toBe(true)

    expect(differencesAt(reference, actual, BUILT, page.viewportSize()!.width)).toEqual([])
  })

  /**
   * THE MUTATION, owed since this block was written. Pointed at the rule
   * block's grid gap and the mark's size: `08` states both, and a grid that
   * has drifted a few pixels reads as a design choice rather than as a
   * difference — which is what makes it worth a check and not an eye.
   */
  test('notices when the rule block stops matching `08`', async ({ page }) => {
    await page.goto(HOME_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, HOME_SELECTORS)

    await page.goto('/')
    await freezeMotion(page)
    await page.addStyleTag({
      content: '.bz-why { gap: 3px !important; }'
        + ' .bz-why-mark { width: 12px !important; height: 12px !important; }',
    })
    const mutated = await extractDesignFacts(page, APP_SELECTORS)

    const facts = differencesIn(reference, mutated, BUILT).map((one) => one.fact)
    expect(facts).toContain('whyGrid.gap')
    expect(facts).toContain('whyMark.width')
  })

  /**
   * The two measures, asserted as DECLARATIONS rather than as lengths.
   *
   * `08` holds the display line to `20ch` and the lede to `56ch`, and `ch`
   * resolves against each element's own font — so the same rule computes 640px
   * in a 46px system sans and 529px in the language's 38px face. The number is
   * not the fact; the unit and the cap are. A display line that runs the width
   * of a 1440px window is the difference between a front door and a banner,
   * and nothing in the type scale settles that.
   */
  /**
   * THE DISPLAY LINE SPANS THE ROW; THE LEDE KEEPS A MEASURE.
   *
   * `08:44` caps the display line at `20ch` and this test used to require that
   * cap. **The author overruled it on 2026-09-11**, twice and in plain terms:
   * the first row spans the whole width. Transcribed, the cap measured 529px
   * in a 1342px column and left two thirds of the row empty — which is what a
   * `ch` measure does when the face is 38px rather than the mockup's 46px, and
   * what the mockup itself avoids by drawing its page 1052px wide.
   *
   * **The author outranks the mockup, and the mockup outranks everything
   * else** — so this is the second entry in DESIGN.md's `DEVIATIONS`, and the
   * first one that is a decision rather than a measured floor.
   *
   * What still holds, and is what this now asserts: a heading is one line of
   * display type with no limit, and a LEDE is prose, so it keeps a readable
   * measure whatever is around it. That is the same reason `01:182` gives the
   * reading column one at all, and it is why the two are no longer the same
   * kind of thing.
   */
  test('spans the row with its display line and keeps the lede readable', async ({ page }) => {
    test.skip(page.viewportSize()!.width < 880, 'the column is narrower than any measure')
    await page.goto('/')

    const measured = await page.evaluate(() => {
      const read = (selector: string) => {
        const node = document.querySelector(selector)
        if (node === null) return null
        const box = node.getBoundingClientRect()
        return {
          width: Math.round(box.width),
          column: Math.round((node.parentElement as HTMLElement).getBoundingClientRect().width),
          lines: Math.round(box.height / Number.parseFloat(getComputedStyle(node).lineHeight)),
        }
      }
      return { hero: read('.bz-hero-title'), lede: read('.bz-lede') }
    })

    expect(measured.hero, 'no display line on the front door').not.toBeNull()
    expect(measured.lede, 'no lede on the front door').not.toBeNull()

    // The row, and the whole of it.
    expect(
      measured.hero!.width,
      `the display line is ${measured.hero!.width}px in a ${measured.hero!.column}px row`,
    ).toBe(measured.hero!.column)

    // Still prose, so still capped — by a real margin and not a rounding error.
    expect(
      measured.lede!.width,
      'the lede runs the width of the window',
    ).toBeLessThan(measured.lede!.column - 40)

    // And the heading is the wider of the two now, which is the change: it is
    // the row, and the lede is a column of sentences inside it.
    expect(measured.hero!.width).toBeGreaterThan(measured.lede!.width)
  })

  /**
   * §15.2.1 — the shortcut, on channel A, and the whole of the two-state
   * machinery this page has left.
   *
   * `boot.ts` stamps `data-hl-record` for a record that CARRIES SOMETHING and
   * deliberately not for one holding only preferences. The reveal had no reader
   * at all: the rule lived in the `app/home.css` stage 0 deleted, so the block
   * showed for everybody and `ContinueLine` decided in React — which cannot be
   * right in frame one, because the server snapshot is the frozen empty record
   * and `nextUnsigned` resolves that to module 01. A browser that had never
   * opened anything was handed a shortcut to the first module.
   *
   * Measured with every `.js` request refused, so nothing React does can be
   * what makes it true.
   */
  test('offers the shortcut only to a reader who has one, in frame one', async ({ page }) => {
    await page.route('**/*.js', (route) => route.abort())

    await page.goto('/')
    const clean = await page.evaluate(() => ({
      stamped: document.documentElement.hasAttribute('data-hl-record'),
      shown: (document.querySelector('.bz-home-continue') as HTMLElement | null)?.checkVisibility()
        ?? null,
    }))
    expect(clean.stamped, 'a clean browser was stamped as a returning reader').toBe(false)
    expect(clean.shown, 'no continue block in the document at all').not.toBeNull()
    expect(clean.shown, 'a clean browser is offered a shortcut it has not earned').toBe(false)

    // A record that carries something — one signed module — and the same page.
    await seedRecord(page, { sheets: { 'fundamentals/llms': signedSheet('a1b2c3d') } })
    await page.goto('/')
    const returning = await page.evaluate(() => ({
      stamped: document.documentElement.hasAttribute('data-hl-record'),
      shown: (document.querySelector('.bz-home-continue') as HTMLElement).checkVisibility(),
    }))
    expect(returning.stamped).toBe(true)
    expect(returning.shown, 'a returning reader is not offered the shortcut').toBe(true)
  })

  /**
   * `08:179-182` draws its four claims with literal emoji. This is the check
   * that they did not survive the rebuild: `src/` carries twenty inline SVGs
   * and no emoji, on a 16-unit viewBox with `stroke="currentColor"`, and an
   * emoji renders in whatever face the reader's platform ships at a size
   * nothing here chose.
   */
  test('draws the four claims in the design’s own icon idiom', async ({ page }) => {
    await page.goto('/')

    const marks = await page.locator('.bz-why-mark').evaluateAll((nodes) =>
      nodes.map((node) => ({
        svg: node.querySelector('svg') !== null,
        viewBox: node.querySelector('svg')?.getAttribute('viewBox') ?? null,
        stroke: node.querySelector('svg')?.getAttribute('stroke') ?? null,
        hidden: node.getAttribute('aria-hidden'),
        text: (node.textContent ?? '').trim(),
      })),
    )

    expect(marks, 'the claims carry no marks at all').toHaveLength(4)
    for (const mark of marks) {
      expect(mark.svg, 'a claim’s mark is not an SVG').toBe(true)
      expect(mark.viewBox).toBe('0 0 16 16')
      expect(mark.stroke).toBe('currentColor')
      expect(mark.hidden, 'a decorative mark is announced').toBe('true')
      // No text node at all, which is what an emoji would have been.
      expect(mark.text, `a mark carries text: "${mark.text}"`).toBe('')
    }
  })
})

test.describe('M16 stage 10 — the routes no mockup draws', () => {
  /**
   * **D30**: a component no mockup draws is derived from primitives the mockups
   * do specify. So there is no sixth reference document and no new role — what
   * there is to check is that these routes reach for the SAME primitives rather
   * than for lookalikes of them, which is the failure mode a derived surface
   * actually has.
   *
   * `01` specifies the card and the primary button; `07` specifies the panel
   * and the field. If `/team/` drew its own card that happened to look like
   * `01`'s, every static guard would pass — the radius would come from a token,
   * the colour from the language, the shadow from nowhere — and the two would
   * drift on the first edit to either. This is the check that says they are one
   * thing.
   */
  const SHARED: readonly Role[] = ['panel', 'field', 'fieldLabel', 'fieldInput']

  test('draws its panels and fields with the same primitives as `07`', async ({ page }) => {
    await page.goto(DASHBOARD_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, DASHBOARD_SELECTORS)

    // `/sign-in/alias/` is the first-run screen and the one derived route that
    // carries both a panel and a real field with no account configured.
    await page.goto('/sign-in/alias/')
    await freezeMotion(page)
    const actual = await extractDesignFacts(page, APP_SELECTORS)

    const shown = (facts: Record<string, string | null>, role: Role) =>
      FACT_KEYS.filter((key) => key.startsWith(`${role}.`)).some((key) => facts[key] !== null)

    for (const role of SHARED) {
      expect(shown(actual, role), `${role} is not on the derived route`).toBe(true)
    }
    expect(differencesAt(reference, actual, SHARED, page.viewportSize()!.width)).toEqual([])
  })

  /**
   * THE MUTATION, owed since this block was written, and the one that matters
   * most of the four: this stage's whole claim is that a derived route reaches
   * for the primitive rather than for a lookalike of it, and a claim about
   * SAMENESS is worth nothing without a demonstration that difference is
   * detected. A lookalike is what every static guard passes — the radius from a
   * token, the colour from the language, no shadow — so this comparison is the
   * only thing standing between "the same panel" and "two panels that agree
   * today".
   */
  test('notices when a derived route draws a lookalike instead of the primitive', async ({
    page,
  }) => {
    await page.goto(DASHBOARD_URL)
    await freezeMotion(page)
    const reference = await extractDesignFacts(page, DASHBOARD_SELECTORS)

    await page.goto('/sign-in/alias/')
    await freezeMotion(page)
    await page.addStyleTag({
      content: '.bz-field > input { height: 28px !important; padding-left: 3px !important; }'
        + ' .bz-panel { padding-top: 2px !important; }',
    })
    const mutated = await extractDesignFacts(page, APP_SELECTORS)

    const facts = differencesIn(reference, mutated, SHARED).map((one) => one.fact)
    expect(facts).toContain('fieldInput.height')
    expect(facts).toContain('fieldInput.paddingLeft')
    expect(facts).toContain('panel.paddingTop')
  })

  /**
   * `/legend/` is the page that replaces onboarding by not being onboarding.
   * It is never auto-opened, and that has to stay true: a tour a reader did not
   * ask for is the thing §11.25's evidence is against, and the route being
   * reachable is the whole of its job.
   */
  test('never opens the legend by itself', async ({ page }) => {
    const opened: string[] = []
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) opened.push(new URL(frame.url()).pathname)
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(opened.filter((path) => path.startsWith('/legend'))).toEqual([])

    // And it is reachable, which is the other half: a page nobody can get to
    // is not restraint.
    await page.goto('/legend/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
