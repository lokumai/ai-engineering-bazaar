import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * D145 — the two files that let the mobile app open this site's links (`public/.well-known/`).
 * Both are JSON a platform fetches and nobody else reads, so a typo fails silently on a phone.
 * What is held here: both parse, both name the same app, and every path the iOS file claims is a
 * route this site has, so a renamed route cannot leave the app claiming an address that is gone.
 */

const WELL_KNOWN = path.resolve(process.cwd(), 'public/.well-known')
const APP = path.resolve(process.cwd(), 'src/app')

const assetlinks = JSON.parse(readFileSync(path.join(WELL_KNOWN, 'assetlinks.json'), 'utf8'))
const aasa = JSON.parse(readFileSync(path.join(WELL_KNOWN, 'apple-app-site-association'), 'utf8'))

describe('app link files', () => {
  it('names one Android app with the handle-all-urls relation', () => {
    expect(assetlinks).toHaveLength(1)
    expect(assetlinks[0].relation).toEqual(['delegate_permission/common.handle_all_urls'])
    expect(assetlinks[0].target.namespace).toBe('android_app')
    expect(assetlinks[0].target.sha256_cert_fingerprints.length).toBeGreaterThan(0)
    for (const fp of assetlinks[0].target.sha256_cert_fingerprints as string[]) {
      expect(fp, 'a SHA-256 as Play Console prints it').toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/)
    }
  })

  it('names the same app on iOS, as <team>.<bundle id>', () => {
    const pkg: string = assetlinks[0].target.package_name
    const details = aasa.applinks.details
    expect(details).toHaveLength(1)
    for (const id of details[0].appIDs as string[]) expect(id.endsWith(`.${pkg}`)).toBe(true)
  })

  it('claims only paths that are routes of this site, each as a prefix', () => {
    const components: Array<Record<string, string>> = aasa.applinks.details[0].components
    expect(components.length).toBeGreaterThan(0)
    for (const component of components) {
      const pattern = component['/']
      expect(pattern, JSON.stringify(component)).toMatch(/^\/[a-z/-]+\/\*$/)
      const route = pattern.slice(1, -2)
      expect(existsSync(path.join(APP, route)), `${pattern} names no route under src/app`).toBe(true)
    }
  })
})
