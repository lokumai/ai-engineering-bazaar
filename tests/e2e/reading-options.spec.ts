import { type Page, expect, test } from '@playwright/test'
import { DEFAULT_DIAGRAM_THEME, DIAGRAM_THEMES, DIAGRAM_THEME_ATTRIBUTE } from '@/lib/reading/diagram-themes'
import { PALETTES, PALETTE_SUBJECTS } from '@/lib/reading/palettes'
import { SHORT } from './sheets'

/**
 * The controls a diagram and a code block carry since 2026-10-11 — the palette
 * menus, the expand dialog and the copy icon — measured as a reader meets them.
 *
 * Every check asks the page by LOCATION and by attribute, never by a figure
 * caption or a line of code: the corpus is live, and `SHORT` is used only as a
 * module that has both a diagram and a code block.
 */

/**
 * The accessible name of the palette marked current. Chrome computes it as
 * `Night , current` — the hidden word is absolutely positioned, so it is
 * joined with a space — and a screen reader speaks either form the same way,
 * so the match is on the words and not the spacing.
 */
const current = (name: string) => new RegExp(`^${name}\\s*,\\s*current$`)

async function figuresReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const all = document.querySelectorAll('[data-hl-prose] .bz-diagram').length
      const ready = document.querySelectorAll('[data-hl-prose] .bz-diagram[data-hl-ready]').length
      return all > 0 && all === ready
    },
    null,
    { timeout: 20_000 },
  )
}

/** The painted ground of the first element matching `selector`. */
function groundOf(page: Page, selector: string): Promise<string> {
  return page.locator(selector).first().evaluate((node) => getComputedStyle(node).backgroundColor)
}

for (const [subject, { attribute, label }] of Object.entries(PALETTE_SUBJECTS)) {
  const block = '.bz-slab'

  test(`choosing a ${subject} palette recolours the page and survives a reload`, async ({ page }) => {
    await page.goto(SHORT.path)

    const before = await groundOf(page, block)
    const menu = page.locator(`[data-hl-options="${subject}"]`).first()
    const trigger = menu.locator('summary')
    await expect(trigger).toHaveAttribute('aria-label', label)

    // Closed, the choices are not reachable; open, all three are.
    await expect(menu.getByRole('button')).toHaveCount(0)
    await trigger.click()
    await expect(menu.getByRole('button')).toHaveCount(PALETTES.length)

    // Nothing has been chosen, so the first palette is the one marked current.
    await expect(menu.getByRole('button', { name: current(PALETTES[0].name) })).toBeVisible()

    const chosen = PALETTES[1]
    await menu.getByRole('button', { name: chosen.name, exact: true }).click()

    await expect(page.locator('html')).toHaveAttribute(attribute, chosen.id)
    await expect(menu).not.toHaveAttribute('open', '')
    await expect(trigger, 'focus returns to the control that opened the menu').toBeFocused()
    const after = await groundOf(page, block)
    expect(after, 'the block did not change ground').not.toBe(before)

    // Channel A: stamped by the boot script before first paint on the next load.
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute(attribute, chosen.id)
    expect(await groundOf(page, block)).toBe(after)
    await trigger.click()
    await expect(menu.getByRole('button', { name: current(chosen.name) })).toBeVisible()
  })
}

/**
 * 2026-11-08 — the diagrams are drawn in Mermaid's own themes, and the reader picks one.
 * Three claims: the default is `default` for a reader who has never chosen, a choice draws
 * the diagrams again in that theme and survives a reload, and a dark theme gets a dark frame
 * (a light drawing on a dark ground, or the reverse, is unreadable).
 */
test('a diagram theme is drawn again on choosing, kept across a reload, and defaults to default', async ({ page }) => {
  await page.goto(SHORT.path)
  await figuresReady(page)

  const html = page.locator('html')
  await expect(html, 'nothing is stamped for a reader who has not chosen').not.toHaveAttribute(DIAGRAM_THEME_ATTRIBUTE, /.+/)

  const menu = page.locator('[data-hl-options="figures"]').first()
  const trigger = menu.locator('summary')
  await expect(trigger).toHaveAttribute('aria-label', 'Diagram theme')
  await expect(menu.getByRole('button')).toHaveCount(0)
  await trigger.click()
  await expect(menu.getByRole('button')).toHaveCount(DIAGRAM_THEMES.length)

  const first = DIAGRAM_THEMES.find((theme) => theme.id === DEFAULT_DIAGRAM_THEME)!
  await expect(menu.getByRole('button', { name: current(first.name) }), 'the default is marked current').toBeVisible()

  const drawing = () => page.locator('[data-hl-prose] .bz-diagram .mermaid-source svg').first().evaluate(
    (svg) => svg.querySelector('style')?.textContent ?? '',
  )
  const styleBefore = await drawing()
  const groundBefore = await groundOf(page, '.bz-figure')

  const dark = DIAGRAM_THEMES.find((theme) => theme.tone === 'dark')!
  await menu.getByRole('button', { name: dark.name, exact: true }).click()
  await expect(html).toHaveAttribute(DIAGRAM_THEME_ATTRIBUTE, dark.id)
  await expect(menu).not.toHaveAttribute('open', '')
  await expect(trigger, 'focus returns to the control that opened the menu').toBeFocused()

  // Drawn again: the SVG's own stylesheet is the theme's, so it changes, and it does so
  // without a reload, once the draws have been queued and finished.
  await expect.poll(drawing, { message: 'the diagram\'s own stylesheet did not change after a theme was chosen, so it was not drawn again' }).not.toBe(styleBefore)
  await figuresReady(page)
  const groundAfter = await groundOf(page, '.bz-figure')
  expect(groundAfter, 'choosing a dark theme left the frame on the light ground').not.toBe(groundBefore)
  const styleChosen = await drawing()

  // Channel A: stamped before first paint on the next load, and drawn in the same theme.
  await page.reload()
  await expect(html).toHaveAttribute(DIAGRAM_THEME_ATTRIBUTE, dark.id)
  await figuresReady(page)
  expect(await groundOf(page, '.bz-figure')).toBe(groundAfter)
  expect(await drawing(), 'the reload drew a different theme').toBe(styleChosen)
  await trigger.click()
  await expect(menu.getByRole('button', { name: current(dark.name) })).toBeVisible()
})

test('choosing the theme that is already drawn does not draw the diagrams again, and a new one does', async ({ page }) => {
  await page.goto(SHORT.path)
  await figuresReady(page)
  const svg = page.locator('[data-hl-prose] .bz-diagram .mermaid-source svg').first()
  // A probe a redraw would destroy: mermaid replaces the whole drawing.
  await svg.evaluate((node) => node.setAttribute('data-hl-probe', 'set'))

  const menu = page.locator('[data-hl-options="figures"]').first()
  await menu.locator('summary').click()
  await menu.getByRole('button', { name: current('Default') }).click()
  await page.waitForTimeout(1500)
  await expect(svg, 'the same theme drew the diagrams again').toHaveAttribute('data-hl-probe', 'set')

  await menu.locator('summary').click()
  await menu.getByRole('button', { name: 'Forest', exact: true }).click()
  await expect(
    page.locator('[data-hl-prose] .bz-diagram .mermaid-source svg[data-hl-probe]'),
    'a different theme did not draw them again',
  ).toHaveCount(0)
})

test('a stored theme that is not on offer, or the retired figure palette, draws the default', async ({ page }) => {
  await page.goto(SHORT.path)
  for (const prefs of [{ diagramTheme: 'base' }, { diagramTheme: 'sepia' }, { figurePalette: 'blueprint' }]) {
    // Seeded after load and read on the reload, so nothing is left registered on the page for the next case.
    await page.evaluate((value) => {
      window.localStorage.setItem(
        'hl-record',
        JSON.stringify({ schema: 1, savedAt: '2026-11-08T10:00:00.000Z', data: { prefs: value } }),
      )
    }, prefs)
    await page.reload()
    await figuresReady(page)
    await expect(page.locator('html'), JSON.stringify(prefs)).not.toHaveAttribute(DIAGRAM_THEME_ATTRIBUTE, /.+/)
    const menu = page.locator('[data-hl-options="figures"]').first()
    await menu.locator('summary').click()
    await expect(menu.getByRole('button', { name: current('Default') })).toBeVisible()
    await menu.locator('summary').click()
  }
})

test('the diagram theme menu is grouped under Light and Dark, and every theme is one button', async ({ page }) => {
  await page.goto(SHORT.path)
  await figuresReady(page)
  const menu = page.locator('[data-hl-options="figures"]').first()
  await menu.locator('summary').click()
  for (const tone of ['light', 'dark'] as const) {
    const group = menu.getByRole('group', { name: new RegExp(`^${tone} themes$`, 'i') })
    await expect(group).toHaveCount(1)
    const ids = DIAGRAM_THEMES.filter((theme) => theme.tone === tone).map((theme) => theme.id)
    await expect(group.locator('[data-hl-theme]')).toHaveCount(ids.length)
    for (const id of ids) await expect(group.locator(`[data-hl-theme="${id}"]`)).toHaveCount(1)
  }
})

test('a palette menu closes on Escape and hands focus back', async ({ page }) => {
  await page.goto(SHORT.path)
  const menu = page.locator('[data-hl-options="code"]').first()
  await menu.locator('summary').click()
  await expect(menu).toHaveAttribute('open', '')
  await page.keyboard.press('Escape')
  await expect(menu).not.toHaveAttribute('open', '')
  await expect(menu.locator('summary')).toBeFocused()
})

/**
 * A menu is above everything and inside the window, however short its block is.
 *
 * The panel (172 x 440px for the diagram themes) hangs from a button in the block's corner,
 * and a code slab is `overflow: hidden`, so on a block shorter than the menu the browser cut
 * it: MEASURED on a 95px block, one option answered a hit test and the rest were the slab's
 * own ground. A diagram's panel was not cut, but it hung off the bottom of the window when the
 * figure sat low in it. The rule is the same for both and for any content, so it is asked of
 * a block of each kind held to 96px, wherever it sits in the window, on the desktop
 * and on a phone: every option is the topmost element at its own centre, lies wholly inside the
 * window, and the page grew no sideways scroll.
 */
const BLOCKS = [
  { subject: 'figures', block: '[data-hl-prose] .bz-diagram' },
  { subject: 'code', block: '[data-hl-prose] .bz-slab' },
] as const
const WINDOWS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
] as const

for (const { subject, block } of BLOCKS) {
  for (const size of WINDOWS) {
    for (const place of ['top', 'bottom'] as const) {
      test(`every ${subject} menu option is on top and inside the ${size.name}px window, with its block near the ${place}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height })
        await page.goto(SHORT.path)
        await figuresReady(page)

        // The first block of this kind, held to two lines' height: the one a menu outgrows. Done
        // here and not looked for, so the test stays true whatever the corpus holds.
        const target = page.locator(block).first()
        await target.evaluate((node) => {
          ;(node as HTMLElement).style.height = '96px'
        })
        const menu = target.locator(`[data-hl-options="${subject}"]`)

        // Put the block's button near the top of the window, or near its bottom edge.
        await target.evaluate((node, where) => {
          const top = node.getBoundingClientRect().top + window.scrollY
          window.scrollTo(0, where === 'top' ? top - 70 : top - (window.innerHeight - 90))
        }, place)
        await menu.locator('summary').click()
        const options = menu.locator('.bz-optmenu-item')
        expect(await options.count(), 'the menu has options').toBeGreaterThan(1)

        const panel = await menu.locator('.bz-optmenu-panel').boundingBox()
        const frame = await target.boundingBox()
        expect(panel!.height, 'the menu is not taller than the block, so this proves nothing').toBeGreaterThan(frame!.height)

        const verdicts = await options.evaluateAll((all) =>
          all.map((option) => {
            const box = option.getBoundingClientRect()
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
            return {
              name: option.textContent?.trim() ?? '',
              onTop: hit !== null && (hit === option || option.contains(hit)),
              inside:
                box.left >= 0 &&
                box.top >= 0 &&
                box.right <= document.documentElement.clientWidth &&
                box.bottom <= window.innerHeight,
            }
          }),
        )
        expect(verdicts.filter((v) => !v.onTop).map((v) => v.name), 'options hidden under something else').toEqual([])
        expect(verdicts.filter((v) => !v.inside).map((v) => v.name), 'options outside the window').toEqual([])

        const sideways = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(sideways, 'the open menu scrolled the page sideways').toBeLessThanOrEqual(0)

        // It is still the same menu to work: a choice closes it and hands focus back.
        await options.nth(1).click()
        await expect(menu).not.toHaveAttribute('open', '')
        await expect(menu.locator('summary')).toBeFocused()
      })
    }
  }
}

test('the expanded figure opens fitted inside the window, zooms, drags and closes', async ({ page }) => {
  await page.goto(SHORT.path)
  await figuresReady(page)

  const expand = page.locator('[data-hl-prose] .bz-diagram [data-hl-expand]').first()
  await expect(expand).toHaveAttribute('aria-label', /expand/i)
  await expect(expand, 'an icon, with no word painted on it').toHaveText('')
  await expand.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.bz-expand-paper svg')).toHaveCount(1)

  // The dialog's own name is the figure's caption, not the empty string.
  await expect(dialog.getByRole('heading')).not.toHaveText('')

  // Fits: inset from every window edge, and the drawing whole inside its view.
  const geometry = await page.evaluate(() => {
    const box = document.querySelector('.bz-expand')!.getBoundingClientRect()
    const view = document.querySelector('.bz-expand-view')!.getBoundingClientRect()
    const paper = document.querySelector('.bz-expand-paper')!.getBoundingClientRect()
    return {
      inset: box.left > 0 && box.top > 0 && box.right < innerWidth && box.bottom < innerHeight,
      whole: paper.left >= view.left - 1 && paper.right <= view.right + 1
        && paper.top >= view.top - 1 && paper.bottom <= view.bottom + 1,
    }
  })
  expect(geometry.inset, 'the dialog meets the edge of the window').toBe(true)
  expect(geometry.whole, 'the drawing does not open whole inside its view').toBe(true)

  const scale = dialog.locator('.bz-expand-scale')
  const fitted = await scale.textContent()
  await dialog.getByRole('button', { name: 'Zoom in' }).click()
  await expect(scale).not.toHaveText(fitted!)
  await dialog.getByRole('button', { name: 'Fit to screen' }).click()
  await expect(scale).toHaveText(fitted!)

  // Grabbing: a drag moves the drawing.
  const paper = dialog.locator('.bz-expand-paper')
  const start = await paper.evaluate((node) => node.getBoundingClientRect().left)
  const view = (await dialog.locator('.bz-expand-view').boundingBox())!
  await page.mouse.move(view.x + view.width / 2, view.y + view.height / 2)
  await page.mouse.down()
  await page.mouse.move(view.x + view.width / 2 + 80, view.y + view.height / 2, { steps: 4 })
  await page.mouse.up()
  const moved = await paper.evaluate((node) => node.getBoundingClientRect().left)
  expect(Math.round(moved - start)).toBe(80)

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(expand, 'focus returns to the expand control').toBeFocused()
})

test('the copy control is an icon that says what it did', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(SHORT.path)

  const copy = page.locator('.bz-slab [data-hl-copy]').first()
  await expect(copy).toHaveAttribute('aria-label', 'Copy code')
  await expect(copy, 'an icon, with no word painted on it').toHaveText('')

  await copy.click()
  await expect(copy).toHaveAttribute('data-hl-copied', '')
  await expect(copy.locator('[data-hl-copy-said]')).toHaveText('Copied')
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  const shown = await page.locator('.bz-slab').first().locator('pre').textContent()
  expect(copied).toBe(shown)
})

test('every diagram carries the code blocks\' copy control, and it copies the Mermaid source', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(SHORT.path)
  await figuresReady(page)

  const diagrams = page.locator('[data-hl-prose] .bz-diagram')
  const total = await diagrams.count()
  expect(total, 'a page with no diagram proves nothing').toBeGreaterThan(0)
  await expect(
    page.locator('[data-hl-prose] .bz-diagram .bz-figure-tools [data-hl-copy]'),
    'one copy control on every diagram',
  ).toHaveCount(total)

  const figure = diagrams.first()
  const copy = figure.locator('[data-hl-copy]')
  // The same control as the code block's: its name, its glyphs and its live word.
  await expect(copy).toHaveAttribute('aria-label', 'Copy code')
  await expect(copy, 'an icon, with no word painted on it').toHaveText('')
  await expect(copy.locator('.bz-copy-idle')).toBeVisible()
  const code = page.locator('.bz-slab [data-hl-copy]').first()
  expect(await copy.evaluate((node) => node.className)).toBe(await code.evaluate((node) => node.className))
  // Beside EXPAND, in the figure's own tool strip.
  const order = await figure.locator('.bz-figure-tools > *').evaluateAll((nodes) =>
    nodes.map((node) => (node.hasAttribute('data-hl-copy') ? 'copy' : node.hasAttribute('data-hl-expand') ? 'expand' : 'menu')))
  expect(order).toEqual(['menu', 'copy', 'expand'])

  // Reached by keyboard, with a visible ring, and worked by Enter.
  await copy.focus()
  await expect(copy).toBeFocused()
  const ring = await copy.evaluate((node) => {
    const style = getComputedStyle(node)
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) }
  })
  expect(ring.style, 'no focus ring on the copy control').not.toBe('none')
  expect(ring.width).toBeGreaterThan(0)
  await page.keyboard.press('Enter')
  await expect(copy).toHaveAttribute('data-hl-copied', '')
  await expect(copy.locator('[data-hl-copy-said]')).toHaveText('Copied')
  await expect(copy.locator('.bz-copy-done')).toBeVisible()

  // What it copied is the diagram's source, which is the text the island drew from, and not the SVG.
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  const source = await figure.locator('.mermaid-source').getAttribute('data-mermaid')
  expect(copied).toBe(source)
  expect(copied).not.toContain('<svg')
  expect(copied.trim().length).toBeGreaterThan(0)
  // The glyph goes back after the moment, as the code block's does.
  await expect(copy).not.toHaveAttribute('data-hl-copied', '')
})
