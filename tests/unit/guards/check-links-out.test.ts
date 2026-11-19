import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * `scripts/check-links-out.mjs` is the only thing that reads the export for a dead internal link,
 * and CI trusts its exit code. The rule held here for any site: a page linking to a path the
 * export lacks makes it exit 1 and name the path, and a site whose links all resolve exits 0.
 * Each case builds a tiny export in a temp directory, so nothing here is a fact about the content.
 */

const SCRIPT = join(process.cwd(), 'scripts', 'check-links-out.mjs')
const made: string[] = []
afterAll(() => made.forEach((dir) => rmSync(dir, { recursive: true, force: true })))

function exportWith(links: string[]): string {
  const out = mkdtempSync(join(tmpdir(), 'links-out-'))
  made.push(out)
  const page = (body: string) => `<!doctype html><html><body>${body}</body></html>`
  writeFileSync(join(out, 'index.html'), page(links.map((href) => `<a href="${href}">link</a>`).join('')))
  mkdirSync(join(out, 'about'))
  writeFileSync(join(out, 'about', 'index.html'), page('<a href="/">home</a>'))
  return out
}

const run = (out: string) => spawnSync(process.execPath, [SCRIPT, out], { encoding: 'utf8' })

describe('check-links-out.mjs', () => {
  it('exits 0 when every internal link resolves', () => {
    const result = run(exportWith(['/about/', '/']))
    expect(result.stdout + result.stderr).toContain('every internal link resolves')
    expect(result.status).toBe(0)
  })

  it('exits 1 and names a planted dead href', () => {
    const result = run(exportWith(['/about/', '/planted-dead-route/']))
    expect(result.stdout).toContain('/planted-dead-route/')
    expect(result.status).toBe(1)
  })

  it('exits 1 for an export directory that does not exist', () => {
    expect(run(join(tmpdir(), 'no-such-export-directory')).status).toBe(1)
  })
})
