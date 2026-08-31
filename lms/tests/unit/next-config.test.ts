import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

interface StaticExportConfig {
  output: string
  basePath: string
  assetPrefix: string
  trailingSlash: boolean
  images: { unoptimized: boolean }
}

// The config reads process.env at module scope, so every case needs a fresh
// evaluation. Vite cannot resolve a cache-busting query on a dynamic import,
// so drop the module registry instead.
async function loadConfig(basePath: string | undefined): Promise<StaticExportConfig> {
  if (basePath === undefined) delete process.env.LMS_BASE_PATH
  else process.env.LMS_BASE_PATH = basePath
  vi.resetModules()
  const mod = await import('../../next.config.mjs')
  return mod.default as StaticExportConfig
}

describe('next.config.mjs', () => {
  const original = process.env.LMS_BASE_PATH
  beforeEach(() => { delete process.env.LMS_BASE_PATH })
  afterEach(() => { process.env.LMS_BASE_PATH = original })

  it('exports a fully static site', async () => {
    const config = await loadConfig(undefined)
    expect(config.output).toBe('export')
  })

  it('defaults to an empty base path for local development', async () => {
    const config = await loadConfig(undefined)
    expect(config.basePath).toBe('')
    expect(config.assetPrefix).toBe('')
  })

  it('applies the deploy base path to both routes and assets', async () => {
    const config = await loadConfig('/ai-engineering-bazaar/lms')
    expect(config.basePath).toBe('/ai-engineering-bazaar/lms')
    expect(config.assetPrefix).toBe('/ai-engineering-bazaar/lms')
  })

  it('emits directory-style URLs so GitHub Pages can serve them', async () => {
    const config = await loadConfig(undefined)
    expect(config.trailingSlash).toBe(true)
  })

  it('disables image optimisation, which static export cannot provide', async () => {
    const config = await loadConfig(undefined)
    expect(config.images.unoptimized).toBe(true)
  })
})
