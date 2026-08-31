import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { type BrowserContext, type Page, type Request, expect, test } from '@playwright/test'
import { type RecordSeed, readRecord, seedRecord } from './record'
import { SHEET_COUNT } from './sheets'
import { watchPage } from './watch'

/**
 * §12.12 — the `RECORD OF WORK`, generated in one browser and then **opened
 * from `file://` on a machine with no relationship to this origin**.
 *
 * That last clause is the whole product differentiator and it is the reason
 * this file exists at the browser layer rather than in Vitest. `report.ts` is
 * a pure string builder and is covered exhaustively by unit tests; what those
 * tests cannot answer is whether the string is a *document*. Every single
 * requirement in §12.12.7 is a statement about an engine's behaviour under the
 * `file:` scheme, and every one of them fails silently on the machine that
 * generated the file:
 *
 *  - a `type="module"` script fails with a CORS error over `file://` and needs
 *    a server, so a module graph in a saved report is dead on arrival — but it
 *    works perfectly when the same markup is served over http;
 *  - `localStorage` behaviour under `file:` is undefined across browsers and
 *    throws `SecurityError` outright in some configurations, which would leave
 *    a blank page in front of an employer;
 *  - a `<link>`, a webfont or any other non-inlined subresource is an opaque
 *    origin away and is simply a broken asset, again only once the file has
 *    left the origin that made it;
 *  - and a name of `</script><img src=x onerror=…>` that got through the
 *    escapers would execute forever, in a file the reader keeps, with no
 *    server-side fix available.
 *
 * So the tests below drive the real page, capture the **very bytes** the
 * DOWNLOAD button hands the browser (by hooking `URL.createObjectURL`, having
 * first removed `showSaveFilePicker` so the `<a download>` path runs — the path
 * every Firefox and Safari reader takes), write them to a disk file, and open
 * that file over `file://`. Then they assert what is *there*, and — the harder
 * half — what is *absent*.
 *
 * §12.14.2 assigns exactly this to Playwright: "the generated file reopened
 * from `file://`".
 */

// ---------------------------------------------------------------------------
// The record, seeded through `record.ts` — the suite's own storage contract,
// typed out there rather than imported from `lib/record/` for the reason
// `sheets.ts` gives: a fixture built from the store's own factories can only
// ever prove the store agrees with itself.
// ---------------------------------------------------------------------------

/** The name is deliberately not ASCII: §12.12.1 keeps it out of the filename. */
const READER = 'İlker Cevheri'
const MARK_SEED = 'a1b2c3d4'

/**
 * §12.12.1's own example claims, made true by construction: three sheets
 * signed off, and the first and last marks **41 days apart** (2026-07-01 →
 * 2026-08-11), so the claim line can be asserted verbatim rather than by
 * pattern. One repository, with a commit, on a signed sheet — which is the one
 * row §12.12.9 lets the document spend the accent on.
 */
const FULL_RECORD: RecordSeed = {
  identity: { name: READER, markSeed: MARK_SEED, mark: null },
  sheets: {
    'fundamentals/llms': {
      signedOff: '2026-07-01T08:00:00.000Z',
      signedRevision: 'ab12cd3',
      reachedEnd: true,
      sources: ['https://platform.openai.com/docs/guides/text-generation'],
    },
    'intermediate/prompt-engineering': {
      signedOff: '2026-07-20T11:30:00.000Z',
      signedRevision: 'bc23de4',
      quiz: {
        answer: 'Retrieval before generation, and the sheet says why.',
        assessed: 'matched',
        at: '2026-07-20T11:20:00.000Z',
      },
    },
    'intermediate/security': {
      signedOff: '2026-08-11T15:45:00.000Z',
      signedRevision: 'cd34ef5',
      reachedEnd: true,
      dwellSeconds: 900,
      checklist: { '0': true, '1': true, '2': true },
      sources: [
        'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
        'https://platform.openai.com/docs/guides/text-generation',
      ],
      submittals: [
        {
          owner: 'cevheri',
          repo: 'hidden-line',
          url: 'https://github.com/cevheri/hidden-line',
          commit: '9f2c1ab',
          note: 'A prompt-injection harness for the sheet 13 criteria.',
          at: '2026-08-11T16:00:00.000Z',
        },
      ],
    },
  },
  days: ['2026-07-01', '2026-07-20', '2026-08-11'],
}

/** The same record with the one repository removed (§12.12.1's degradation). */
const NO_SUBMITTAL_RECORD: RecordSeed = {
  identity: FULL_RECORD.identity,
  sheets: {
    'fundamentals/llms': FULL_RECORD.sheets!['fundamentals/llms'],
    'intermediate/security': {
      ...FULL_RECORD.sheets!['intermediate/security'],
      submittals: [],
    },
  },
  days: FULL_RECORD.days,
}

// ---------------------------------------------------------------------------
// Driving `/report/` and capturing the bytes it produces.
// ---------------------------------------------------------------------------

interface Capture {
  /** The exact string the `Blob` handed to the browser carried. */
  html: string
  /** The blob's own MIME type — what decides whether the file opens or saves. */
  blobType: string
  /** The `download` attribute the product put on its own anchor. */
  filename: string
}

interface SaveHooks {
  __hlBlobs: Blob[]
  __hlSaved: Array<{ download: string; href: string }>
}

/**
 * §12.12.7 — installs the save-path probe, and it has to be installed rather
 * than observed.
 *
 * `showSaveFilePicker` is **removed from the prototype as well as the
 * instance**: it is a `Window.prototype` method in Chrome, so deleting only the
 * own property leaves `'showSaveFilePicker' in window` true and the test would
 * silently exercise the File System Access branch — a branch that does not
 * exist in Firefox or Safari and is therefore not the path a reader takes.
 * Every test that captures bytes asserts the removal held.
 *
 * The `Blob` itself is captured, not its URL: the URL is revoked one task after
 * the click and reading it back afterwards is the race the product deliberately
 * avoids. Holding the `Blob` reference is immune to the revoke.
 */
async function installSaveProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const hooks = window as unknown as SaveHooks
    hooks.__hlBlobs = []
    hooks.__hlSaved = []

    const create = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (object: Blob | MediaSource): string => {
      if (object instanceof Blob) hooks.__hlBlobs.push(object)
      return create(object)
    }

    const click = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement): void {
      if (this.download !== '') {
        hooks.__hlSaved.push({ download: this.download, href: this.href })
      }
      click.call(this)
    }

    type Removable = Record<string, unknown>
    try {
      delete (Window.prototype as unknown as Removable).showSaveFilePicker
    } catch {
      // Nothing to remove is the Firefox and Safari case, which is the point.
    }
    try {
      delete (window as unknown as Removable).showSaveFilePicker
    } catch {
      // Same.
    }
  })
}

/** The `<dd>` beside a `<dt>`, matched on the DOM's text, not the uppercased
 * rendering: `.hl-defs` uppercases in CSS, so the source still reads `Bytes`. */
function definition(page: Page, scope: string, term: string): Promise<string | null> {
  return page.evaluate(
    ({ scope, term }) => {
      const root = document.querySelector(scope)
      if (root === null) return null
      for (const dt of root.querySelectorAll('dt')) {
        if ((dt.textContent ?? '').trim().toLowerCase() !== term.toLowerCase()) continue
        return ((dt.nextElementSibling as HTMLElement | null)?.textContent ?? '').trim()
      }
      return null
    },
    { scope, term },
  )
}

const PREVIEW = 'section[aria-labelledby="hl-report-preview"]'
const SAVE = 'section[aria-labelledby="hl-report-save"]'

/** §12.12.7's budget, grouped the way §7.1 groups every number on this site. */
const group = (value: number): string => String(value).replace(/\B(?=(\d{3})+$)/g, ',')

/** Drives `/report/` with a seeded record and returns what DOWNLOAD produced. */
async function generate(page: Page, seed: RecordSeed): Promise<Capture> {
  await seedRecord(page, seed)
  await installSaveProbe(page)
  await page.goto('/report/')

  // §12.2 channel B: every reading on this page arrives after the hydration
  // commit, so the record has to be in before the button is pressed —
  // otherwise the file would honestly describe an empty record. `data-hydrated`
  // is set in the same render as the readings, so it is the exact gate.
  await expect(page.locator('[data-hl-report][data-hydrated="true"]')).toHaveCount(1)
  // …and the byte readout is only populated once the clock, Web Crypto and one
  // whole generated document have all landed.
  await expect
    .poll(() => definition(page, SAVE, 'Bytes'))
    .toMatch(new RegExp(`^[\\d,]+ / ${group(250 * 1024)}$`))

  expect(
    await page.evaluate(() => 'showSaveFilePicker' in window),
    'the File System Access branch was not removed, so the `<a download>` path never ran',
  ).toBe(false)

  await page.getByRole('button', { name: 'DOWNLOAD' }).click()
  await page.waitForFunction(
    () => (window as unknown as SaveHooks).__hlBlobs.length > 0,
  )

  const captured = await page.evaluate(async () => {
    const hooks = window as unknown as SaveHooks
    const blob = hooks.__hlBlobs[hooks.__hlBlobs.length - 1]
    const saved = hooks.__hlSaved[hooks.__hlSaved.length - 1]
    return {
      html: await blob.text(),
      blobType: blob.type,
      filename: saved?.download ?? '',
    }
  })

  return captured
}

// ---------------------------------------------------------------------------
// Opening the bytes from a disk file.
// ---------------------------------------------------------------------------

interface Opened {
  doc: Page
  /** Every request the file:// document made, in order. */
  requests: string[]
  fileUrl: string
}

/**
 * Writes the captured bytes to a real file and opens them over `file://` in a
 * page that has never seen this origin.
 *
 * Two traps are installed before the document's own script runs:
 *
 *  - **Web Storage throws.** §12.12.7 forbids the document touching storage of
 *    any kind, and the reason is that `localStorage` throws `SecurityError`
 *    under the `file:` scheme in real configurations. Chrome happens to be
 *    permissive today, which means a storage access would go *unnoticed* here —
 *    so the accessors are replaced with ones that record the touch and throw,
 *    reproducing the strict engine. An unguarded access then shows up as both a
 *    recorded touch and a console error.
 *  - **`prefers-color-scheme` is pinned to light**, so the theme control's
 *    first flip is a fact rather than a coin toss on the host's settings.
 */
async function openSaved(context: BrowserContext, html: string): Promise<Opened> {
  // Left on disk on purpose, in the OS temp directory the OS cleans: when one
  // of these assertions fails, the saved document IS the evidence, and a
  // teardown that deleted it would take the only copy of the thing under test.
  const directory = mkdtempSync(join(tmpdir(), 'hl-record-of-work-'))
  const file = join(directory, 'record-of-work.html')
  writeFileSync(file, html, 'utf8')
  const fileUrl = pathToFileURL(file).href

  const doc = await context.newPage()
  await doc.addInitScript(() => {
    const flags = window as unknown as { __hlStorageTouched: string[] }
    flags.__hlStorageTouched = []
    for (const name of ['localStorage', 'sessionStorage', 'indexedDB']) {
      try {
        Object.defineProperty(window, name, {
          configurable: true,
          get() {
            flags.__hlStorageTouched.push(name)
            throw new DOMException(`${name} is not available here`, 'SecurityError')
          },
        })
      } catch {
        // A property that cannot be redefined is reported by the source scan.
      }
    }
  })
  await doc.emulateMedia({ colorScheme: 'light' })

  const requests: string[] = []
  doc.on('request', (request: Request) => {
    requests.push(request.url())
  })

  return { doc, requests, fileUrl }
}

const norm = (text: string): string => text.replace(/\s+/g, ' ').trim()

// ---------------------------------------------------------------------------
// §12.12.2 — it is a document, and it renders as one from a disk
// ---------------------------------------------------------------------------

test('the saved file renders from file:// with no console error and no failed request', async ({
  page,
  context,
}) => {
  const { html } = await generate(page, FULL_RECORD)
  const { doc, fileUrl } = await openSaved(context, html)

  const problems = watchPage(doc)
  await doc.goto(fileUrl)

  await expect(doc.locator('h1')).toBeVisible()
  await expect(doc.locator('h1')).toHaveText('AI Engineering Bazaar')

  // A `type="module"` script, a `<link>` that 404s or an unguarded storage
  // access all land here first, before any targeted assertion notices.
  expect(problems.consoleErrors, 'the saved document logged an error').toEqual([])
  expect(problems.failedRequests, 'the saved document asked for something that failed').toEqual([])
})

test('the reader’s own name is inside the file, in a bdi, never in the filename', async ({
  page,
  context,
}) => {
  const { html, filename } = await generate(page, FULL_RECORD)
  const { doc, fileUrl } = await openSaved(context, html)
  await doc.goto(fileUrl)

  // §12.12.1 — "never let the filename be the place the name has to survive":
  // the `download` value is a suggestion a UA may trim, transliterate or
  // reject, so the template is fixed ASCII and the real name lives inside.
  expect(filename).toMatch(/^record-of-work-\d{4}-\d{2}-\d{2}\.html$/)
  expect(filename).not.toContain('İ')
  expect(filename).toMatch(/^[\x20-\x7e]+$/)

  const who = doc.locator('.who bdi')
  await expect(who).toHaveText(READER)
  await expect(who).toHaveAttribute('dir', 'auto')
  // Not truncated, and not re-cased: the dotted capital İ is still a dotted
  // capital İ after a UTF-8 round trip through a disk file (§12.3.4).
  expect(await who.textContent()).toBe(READER)
})

test('§12.12.2 — the disclaimer is above the ledger, not in a footer', async ({
  page,
  context,
}) => {
  const { html } = await generate(page, FULL_RECORD)
  const { doc, fileUrl } = await openSaved(context, html)
  await doc.goto(fileUrl)

  // All seven statements, declarative, and above the fold. This inverts the
  // certificate genre deliberately (§12.12.3).
  await expect(doc.locator('.limits ol li')).toHaveCount(7)
  await expect(doc.locator('.limits')).toContainText('No issuing authority exists.')
  await expect(doc.locator('.limits')).toContainText('not a W3C Verifiable Credential')

  const order = await doc.evaluate(() => {
    const at = (selector: string): number => {
      const node = document.querySelector(selector)
      return node === null ? -1 : [...document.querySelectorAll('*')].indexOf(node)
    }
    return {
      header: at('header.head'),
      limits: at('.limits'),
      ledger: at('#ledger'),
      evidence: at('#evidence'),
      check: at('.check'),
    }
  })

  // §12.12.2's five blocks, in §12.12.2's order. Other sections are permitted
  // between them ("Plus:" in that section); an inversion is not.
  expect(order.header).toBeGreaterThan(-1)
  expect(order.limits).toBeGreaterThan(order.header)
  expect(order.ledger).toBeGreaterThan(order.limits)
  expect(order.evidence).toBeGreaterThan(order.ledger)
  expect(order.check).toBeGreaterThan(order.evidence)
})

test('the ledger is a schedule of parts — every sheet in the set, signed or not', async ({
  page,
  context,
}) => {
  const { html } = await generate(page, FULL_RECORD)
  const { doc, fileUrl } = await openSaved(context, html)
  await doc.goto(fileUrl)

  // §12.12.2 — all 32 rows. A record that can only accumulate positives is not
  // a record (§12.5.6), so the unsigned sheets are rows here, not omissions.
  await expect(doc.locator('.ledger tbody tr')).toHaveCount(SHEET_COUNT)
  await expect(doc.locator('.ledger tbody td.state[data-state="SIGNED OFF"]')).toHaveCount(3)

  // §12.4.3 — the revision the reader signed AGAINST, printed per row.
  const signed = doc.locator('.ledger tbody tr', { has: doc.locator('td[data-state="SIGNED OFF"]') })
  await expect(signed.filter({ hasText: 'cd34ef5' })).toHaveCount(1)

  // §12.12.1's permitted claim forms, both of the countable ones, verbatim.
  await expect(doc.locator('#claims')).toContainText(
    `This record contains 3 of ${SHEET_COUNT} sheets marked signed off, on the dates listed.`,
  )
  await expect(doc.locator('#claims')).toContainText(
    'The first and last marks in this record are 41 days apart.',
  )
})

test('§12.12.4 — HOW TO CHECK THIS ends the document by telling its reader to distrust it', async ({
  page,
  context,
}) => {
  const { html } = await generate(page, FULL_RECORD)
  const { doc, fileUrl } = await openSaved(context, html)
  await doc.goto(fileUrl)

  const check = doc.locator('.check')
  await expect(check.locator('ol li')).toHaveCount(5)
  await expect(check.locator('ol li').first()).toContainText('Open the criteria for each sheet')
  await expect(check.locator('ol li').nth(3)).toContainText(
    'If the repositories are empty, ignore the sheet tally entirely.',
  )

  // The line the whole document is built to be able to say.
  expect(norm((await check.textContent()) ?? '')).toMatch(/The repositories might\.$/)

  // …and it is the last section, so nothing softens it afterwards.
  expect(
    await doc.evaluate(() => {
      const sections = [...document.querySelectorAll('section')]
      return sections[sections.length - 1]?.className ?? ''
    }),
  ).toContain('check')
})

test('§12.9.2 — the submittal’s reconstructed URL is both the href and the visible text', async ({
  page,
  context,
}) => {
  const { html } = await generate(page, FULL_RECORD)
  const { doc, fileUrl } = await openSaved(context, html)
  await doc.goto(fileUrl)

  const link = doc.locator('#evidence .repo a')
  await expect(link).toHaveCount(1)

  const { href, text } = await link.evaluate((node) => ({
    href: node.getAttribute('href') ?? '',
    text: (node.textContent ?? '').trim(),
  }))

  // The link text cannot lie about its destination, because it IS the
  // destination — and the destination was rebuilt from owner and repo, so no
  // query string, userinfo or homograph host could reach it.
  expect(href).toBe('https://github.com/cevheri/hidden-line')
  expect(text).toBe(href)
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(link).toHaveAttribute('target', '_blank')

  // §12.9.3 — a reader-supplied hash, stated as such, never fetched.
  await expect(doc.locator('#evidence .commit')).toContainText('commit 9f2c1ab')
  await expect(doc.locator('#evidence .commit')).toContainText(
    'supplied by reader; not fetched or verified',
  )
})

// ---------------------------------------------------------------------------
// §12.12.6 — the artefact the reader keeps IS the backup
// ---------------------------------------------------------------------------

test('§12.12.6 — the embedded payload parses from file:// and is the record the browser held', async ({
  page,
  context,
}) => {
  const { html } = await generate(page, FULL_RECORD)
  const { doc, fileUrl } = await openSaved(context, html)
  await doc.goto(fileUrl)

  // Retrieved exactly the way §12.12.7 specifies: a non-JS `type` is a data
  // block, never evaluated as code, and lifting `.text` is not parsing HTML.
  const envelope = await doc.evaluate(() => {
    const block = document.getElementById('hl-record') as HTMLScriptElement | null
    if (block === null) return null
    return JSON.parse(block.text) as { schema: number; savedAt: string; data: unknown }
  })

  expect(envelope).not.toBeNull()
  expect(envelope!.schema).toBe(1)
  expect(envelope!.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

  // Its own type, and nothing that would make a machine-readable lie of it
  // (§12.12.6): no `VerifiableCredential`, no DID, no verification endpoint.
  await expect(doc.locator('#hl-record')).toHaveAttribute('type', 'application/json')
  expect(html).not.toMatch(/VerifiableCredential|AchievementCredential|"did:/)

  // The round trip that matters: what the file carries is byte-for-byte the
  // record the generating browser had in storage, so importing it back
  // restores that browser's state in another one.
  await expect
    .poll(async () => (await readRecord(page))?.data ?? null)
    .toEqual(envelope!.data)
})

// ---------------------------------------------------------------------------
// §12.12.7 — the in-document interactivity, from a disk, with no server
// ---------------------------------------------------------------------------

test('§12.12.7 — the subsystem filter and the theme control work over file:// and throw nothing', async ({
  page,
  context,
}) => {
  const { html } = await generate(page, FULL_RECORD)
  const { doc, fileUrl } = await openSaved(context, html)
  const problems = watchPage(doc)
  await doc.goto(fileUrl)

  const rows = doc.locator('.ledger tbody tr')
  const shown = doc.locator('.ledger tbody tr:not([hidden])')
  await expect(shown).toHaveCount(SHEET_COUNT)

  // One classic inline script, in-memory only, and it still filters a table.
  await doc.locator('#band').selectOption('intermediate')
  await expect(shown).toHaveCount(8)
  expect(
    await shown.evaluateAll((nodes) =>
      [...new Set(nodes.map((node) => node.getAttribute('data-band')))],
    ),
  ).toEqual(['intermediate'])

  await doc.locator('#band').selectOption('all')
  await expect(shown).toHaveCount(SHEET_COUNT)
  await expect(rows).toHaveCount(SHEET_COUNT)

  // The theme control, and the paint it is supposed to change. `data-theme` is
  // absent until the reader asks, so the file follows the host until then.
  const themeState = () =>
    doc.evaluate(() => ({
      attribute: document.documentElement.getAttribute('data-theme'),
      ground: getComputedStyle(document.body).backgroundColor,
    }))

  const first = await themeState()
  expect(first.attribute).toBeNull()

  await doc.getByRole('button', { name: 'Theme' }).click()
  const second = await themeState()
  expect(second.attribute).toBe('dark')
  expect(second.ground).not.toBe(first.ground)

  await doc.getByRole('button', { name: 'Theme' }).click()
  const third = await themeState()
  expect(third.attribute).toBe('light')
  expect(third.ground).toBe(first.ground)

  expect(problems.consoleErrors, 'a control in the saved document threw').toEqual([])
})

// ---------------------------------------------------------------------------
// The absences. None of these can be noticed by opening the file on the
// machine that made it, which is why they are the reason this spec exists.
// ---------------------------------------------------------------------------

test('§12.12.7 — nothing leaves the page: no request, no link, no webfont, no module', async ({
  page,
  context,
}) => {
  const { html } = await generate(page, FULL_RECORD)
  const { doc, requests, fileUrl } = await openSaved(context, html)
  await doc.goto(fileUrl)
  await doc.locator('#band').selectOption('intermediate')
  await doc.getByRole('button', { name: 'Theme' }).click()

  // The document itself, and nothing else. Anything not inlined is an opaque
  // origin away and would simply be a broken asset in front of an employer.
  // The first assertion is what stops the second being vacuous: a page that
  // reported no requests at all would pass an emptiness check for free.
  expect(requests, 'the request watcher saw nothing, so it proves nothing').toContain(fileUrl)
  expect(requests.filter((url) => url !== fileUrl)).toEqual([])

  const shape = await doc.evaluate(() => {
    const scripts = [...document.querySelectorAll('script')]
    let fontFaces = 0
    let imports = 0
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSFontFaceRule) fontFaces += 1
          if (rule instanceof CSSImportRule) imports += 1
        }
      } catch {
        // A stylesheet whose rules cannot be read is a cross-origin one, which
        // is itself the failure this test is looking for; counted below.
      }
    }
    return {
      links: document.querySelectorAll('link').length,
      styles: document.querySelectorAll('style').length,
      external: document.querySelectorAll('[src], [href]:not(a)').length,
      subresources: document.querySelectorAll('img, iframe, object, embed, video, audio, source')
        .length,
      modules: document.querySelectorAll('script[type="module"]').length,
      scriptTypes: scripts.map((node) => node.getAttribute('type') ?? ''),
      scriptSrcs: scripts.filter((node) => node.hasAttribute('src')).length,
      inlineSvg: document.querySelectorAll('svg').length,
      fontFaces,
      imports,
      bodyFont: getComputedStyle(document.body).fontFamily,
    }
  })

  expect(shape.links, 'a <link> in a file:// document is a broken asset').toBe(0)
  expect(shape.styles, '§12.12.7 — one <style>, inlined').toBe(1)
  expect(shape.external).toBe(0)
  expect(shape.subresources, 'inline <svg>, never <img src>').toBe(0)
  expect(shape.inlineSvg).toBeGreaterThan(0)
  expect(shape.modules, 'module HTML over file:// fails with a CORS error').toBe(0)
  expect(shape.scriptSrcs).toBe(0)
  // One data block and one classic script. Nothing else, in either order.
  expect([...shape.scriptTypes].sort()).toEqual(['', 'application/json'])
  expect(shape.fontFaces, 'an embedded webfont cannot load from an opaque origin').toBe(0)
  expect(shape.imports).toBe(0)
  // §12.12.7 — system stacks, and never `system-ui` for body text.
  expect(shape.bodyFont).not.toContain('system-ui')

  // The source, not just the DOM: a `@font-face` or an `@import` the engine
  // dropped as invalid would leave the counts above at zero.
  expect(html).not.toMatch(/@font-face/i)
  expect(html).not.toMatch(/@import/i)
  expect(html).not.toMatch(/type=["']module["']/i)
  expect(html).not.toMatch(/<link\b/i)
  expect(html).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|EventSource|WebSocket/)
})

test('§12.12.7 — the document touches no storage of any kind', async ({ page, context }) => {
  const { html } = await generate(page, FULL_RECORD)
  const { doc, fileUrl } = await openSaved(context, html)
  const problems = watchPage(doc)
  await doc.goto(fileUrl)

  // Exercise everything the file can do, then ask whether the traps fired.
  await doc.locator('#band').selectOption('expert')
  await doc.locator('#band').selectOption('all')
  await doc.getByRole('button', { name: 'Theme' }).click()

  const touched = () =>
    doc.evaluate(
      () => (window as unknown as { __hlStorageTouched: string[] }).__hlStorageTouched,
    )

  expect(
    await touched(),
    'the document reached for Web Storage, which throws SecurityError under file:',
  ).toEqual([])
  expect(problems.consoleErrors).toEqual([])

  // The negative control. Chrome is permissive about `file:` storage, so
  // without proof that the trap is live an empty list would mean nothing.
  expect(
    await doc.evaluate(() => {
      try {
        void window.localStorage
        return 'no throw'
      } catch {
        return 'threw'
      }
    }),
  ).toBe('threw')
  expect(await touched()).toEqual(['localStorage'])

  // The cheapest and strictest form of the same check: the sink is absent from
  // the bytes, so there is nothing to guard.
  expect(html).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/)
})

// ---------------------------------------------------------------------------
// §12.12.7 — the escapers, in the only place their failure would be permanent
// ---------------------------------------------------------------------------

test('§12.12.7 — a hostile name is text in the saved file, and the file still parses itself', async ({
  page,
  context,
}) => {
  const HOSTILE = '</script><img src=x onerror=alert(1)>'
  const { html } = await generate(page, {
    ...FULL_RECORD,
    identity: { name: HOSTILE, markSeed: MARK_SEED, mark: null },
  })

  // The bytes first. `</script` may appear exactly twice — closing the JSON
  // data block and closing the one inline script. A third occurrence is the
  // name having closed a block it was inside.
  expect((html.match(/<\/script/gi) ?? []).length).toBe(2)
  // No `on*` attribute in ANY tag. `onerror` still appears in the bytes — as
  // the literal text the reader typed, inside a text node and inside the JSON
  // data block — which is the correct outcome and not the same fact at all, so
  // the assertion is attribute-shaped rather than a word search.
  expect(html).not.toMatch(/<[^>]*\son\w+\s*=/i)
  expect(html).not.toMatch(/<img/i)
  // §12.12.7 — `\u003c`, not `\x3c`: the latter is JS-only and invalid JSON,
  // so the document's own `JSON.parse` would throw on it.
  expect(html).toContain('\\u003c/script')
  expect(html).not.toContain('\\x3c')

  const { doc, fileUrl } = await openSaved(context, html)
  const problems = watchPage(doc)

  let dialogs = 0
  doc.on('dialog', (dialog) => {
    dialogs += 1
    void dialog.dismiss()
  })

  await doc.goto(fileUrl)

  // It still renders…
  await expect(doc.locator('h1')).toBeVisible()
  // …the name is the literal text the reader typed, in a text node…
  await expect(doc.locator('.who bdi')).toHaveText(HOSTILE)
  // …nothing was injected…
  expect(await doc.evaluate(() => document.images.length)).toBe(0)
  expect(
    await doc.evaluate(() =>
      [...document.querySelectorAll('*')].flatMap((node) =>
        node.getAttributeNames().filter((name) => name.toLowerCase().startsWith('on')),
      ),
    ),
    'an event-handler attribute reached a document the reader keeps forever',
  ).toEqual([])
  expect(dialogs).toBe(0)
  expect(problems.consoleErrors).toEqual([])

  // …and it still parses its own envelope, with the name intact.
  expect(
    await doc.evaluate(() => {
      const block = document.getElementById('hl-record') as HTMLScriptElement
      return (JSON.parse(block.text) as { data: { identity: { name: string } } }).data.identity.name
    }),
  ).toBe(HOSTILE)
})

// ---------------------------------------------------------------------------
// §12.12.1 / §12.12.7 — what the file may claim, and what it may weigh
// ---------------------------------------------------------------------------

test('§12.12.7 — the file is under the 250 KB budget and says so in bytes', async ({ page }) => {
  const { html, blobType, filename } = await generate(page, FULL_RECORD)

  const bytes = Buffer.byteLength(html, 'utf8')
  expect(bytes).toBeLessThan(250 * 1024)
  expect(bytes).toBeGreaterThan(1024)

  // A quarter-megabyte opens instantly from an email attachment or a USB
  // stick, and the type is what decides it opens rather than downloading again.
  expect(blobType).toBe('text/html;charset=utf-8')
  expect(filename).toMatch(/^record-of-work-\d{4}-\d{2}-\d{2}\.html$/)

  // The page's own readout is a MEASUREMENT of that same file, not an estimate
  // of it: the only honest way to report the size of a document is to build it.
  await expect
    .poll(() => definition(page, SAVE, 'Bytes'))
    .toBe(`${group(bytes)} / ${group(250 * 1024)}`)
})

test('§12.12.1 — with no repository the document degrades to READING RECORD and drops the register', async ({
  page,
  context,
}) => {
  const { html, filename } = await generate(page, NO_SUBMITTAL_RECORD)
  const { doc, fileUrl } = await openSaved(context, html)
  await doc.goto(fileUrl)

  // A record with no repositories holds only self-reported button presses, so
  // it renames itself rather than overstating its own weight.
  await expect(doc.locator('.eyebrow').first()).toContainText('READING RECORD')
  expect(await doc.title()).toMatch(/^READING RECORD/)
  expect(filename).toMatch(/^reading-record-\d{4}-\d{2}-\d{2}\.html$/)

  // Absent, not printed empty (§11.25, §12.12.1).
  await expect(doc.locator('#evidence')).toHaveCount(0)
  expect(html).not.toContain('Evidence register')

  // Everything else still stands: the ledger is a schedule of parts either way.
  await expect(doc.locator('.ledger tbody tr')).toHaveCount(SHEET_COUNT)
  await expect(doc.locator('.limits ol li')).toHaveCount(7)
  await expect(doc.locator('.check')).toContainText('The repositories might')
})

test('§12.12.1 — the forbidden vocabulary appears nowhere in the saved document', async ({
  page,
  context,
}) => {
  const { html } = await generate(page, FULL_RECORD)
  const { doc, fileUrl } = await openSaved(context, html)
  await doc.goto(fileUrl)

  /**
   * §12.12.1's register governs what **this document says**, and the document
   * also QUOTES two other voices: the curriculum (sheet titles, objectives,
   * checklist item text, the Quick Check questions) and the reader (their name,
   * their answers, their submittal notes, the URLs they opened). Sheet 13's own
   * checklist contains the sentence "Sandbox on, credential paths … denied for
   * read", and a Security sheet is entitled to the word.
   *
   * So the quoted material is removed and the remainder — everything the
   * document wrote itself — is what the register is applied to. The excluded
   * nodes are enumerated rather than approximated, so nothing can hide in an
   * unnamed gap; §12.12.2 also asserts elsewhere that each of these sections is
   * present, so an exclusion cannot quietly become the whole file.
   */
  const ownVoice = await doc.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement
    const quoted = [
      'script', // the JSON data block and the one inline script: machinery
      'style', // `display:none!important` is not copy either
      '.who bdi', // the reader's name
      '.ledger tbody th[scope="row"]', // sheet titles
      '#evidence .repo', // the reader's repository URL
      '#evidence .note', // the reader's own note
      '#not-signed li', // sheet titles again
      '#answers .question', // the corpus's question
      '#answers blockquote', // the reader's answer
      '#checklists ul.checks', // the corpus's checklist item text
      '#sources ul.urls', // URLs the reader opened
      '#criteria ul.objectives', // the corpus's objectives
    ]
    for (const selector of quoted) {
      for (const node of clone.querySelectorAll(selector)) node.remove()
    }
    return clone.textContent ?? ''
  })

  // Every one of these is a claim about a PERSON, which is precisely what this
  // data cannot support: §12.12.1 permits only statements about the record.
  for (const word of [
    'certificate',
    'certification',
    'certified',
    'credential',
    'diploma',
    'qualification',
    'badge',
    'has completed',
    'is qualified',
    'demonstrated competence',
    'mastered',
    'leaderboard',
  ]) {
    // `credential` and `verif*` are permitted in exactly one shape — a DENIAL —
    // so the sentence carrying them is cut out first and the rest is searched.
    const withoutDenial = ownVoice
      .toLowerCase()
      .replace(
        /this is not a w3c verifiable credential\..*?verification endpoint\./s,
        '',
      )
    expect(withoutDenial, `§12.12.1 forbids "${word}"`).not.toContain(word)
  }
  expect(ownVoice).toContain('This is not a W3C Verifiable Credential.')
  expect(ownVoice).toContain('No issuing authority exists.')

  // §12.12.1, §11.35 and §12.14.1. Against the rendered copy rather than the
  // bytes: `width:100%` and `display:none!important` are stylesheet mechanics
  // and `<!DOCTYPE` is a doctype, none of which a reader ever sees.
  expect(ownVoice).not.toMatch(/\d\s*%/)
  expect(ownVoice).not.toContain('!')
  expect(ownVoice.toLowerCase()).not.toMatch(/\bscores?\b/)
  // `grade` and `mastery` survive in exactly one place — the sentence that
  // refuses to claim either — so the denial is asserted instead of the word.
  expect(ownVoice).toContain('No pass, fail, grade or mastery is claimed.')
})

test('§12.12.5 — the digest is printed with the label that makes it honest', async ({
  page,
  context,
}) => {
  const { html } = await generate(page, FULL_RECORD)
  const { doc, fileUrl } = await openSaved(context, html)
  await doc.goto(fileUrl)

  const digest = await definition(doc, 'dl.meta', 'Content digest')
  expect(digest).toMatch(/^[0-9a-f]{64}$/)

  // An unlabelled hash reads as a seal, and the label is the whole difference
  // between honest and decorative.
  await expect(doc.locator('#claims')).toContainText(
    'proves this file has not changed since it was generated',
  )
  await expect(doc.locator('#claims')).toContainText('proves nothing about the facts inside it')

  // §12.12.6 — no verification affordance that would resolve to nothing.
  expect(html).not.toMatch(/qrcode|QR code|blockchain|serial number/i)
  expect(html.toLowerCase()).not.toContain('verification url')
})
