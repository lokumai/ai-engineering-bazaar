import { describe, expect, it } from 'vitest'
import { RECORD_BOOT_SCRIPT, recordBootScript } from '@/lib/record/boot'
import { RECORD_STORAGE_KEY, SCHEMA_VERSION } from '@/lib/record/schema'

/** The corpus's six categories, as a layout would pass them in. */
const TOTALS = { fundamentals: 7, intermediate: 8, expert: 9, ecosystem: 5, protocols: 1, optional: 2 }
const MODULES = {
  'fundamentals/llms': 1,
  'fundamentals/training': 2,
  'fundamentals/rag': 3,
  'fundamentals/tools': 4,
  'fundamentals/memory': 5,
  'fundamentals/agents': 6,
  'fundamentals/multi-agent': 7,
  'intermediate/security': 13,
}

interface Stamped {
  classes: Set<string>
  attributes: Map<string, string>
}

/** Runs the emitted script with every global it touches stubbed out. */
function run(
  script: string,
  options: { stored?: string | null; getterThrows?: boolean; getItemThrows?: boolean } = {},
  into?: Stamped,
): Stamped {
  const stamped: Stamped = into ?? { classes: new Set<string>(), attributes: new Map<string, string>() }
  const documentElement = {
    classList: { add: (token: string) => { stamped.classes.add(token) } },
    setAttribute: (name: string, value: string) => { stamped.attributes.set(name, value) },
  }
  const window = {
    get localStorage() {
      if (options.getterThrows) throw Object.assign(new Error('denied'), { name: 'SecurityError' })
      return {
        getItem: (key: string) => {
          if (options.getItemThrows) throw Object.assign(new Error('denied'), { name: 'SecurityError' })
          return key === RECORD_STORAGE_KEY ? options.stored ?? null : null
        },
      }
    },
  }
  new Function('window', 'document', script)(window, { documentElement })
  return stamped
}

const envelope = (data: unknown, schema = SCHEMA_VERSION) =>
  JSON.stringify({ schema, savedAt: '2026-08-31T09:00:00.000Z', data })

const signedSheets = (...slugs: string[]) => ({
  sheets: Object.fromEntries(slugs.map((slug) => [slug, { signedOff: '2026-08-14T09:00:00.000Z' }])),
})

describe('the emitted script is safe to inline', () => {
  const script = recordBootScript(TOTALS, MODULES)

  it('contains no closing script tag, in any casing', () => {
    expect(script.toLowerCase()).not.toContain('</script')
    expect(script).not.toContain('<!--')
  })

  it('parses as JavaScript', () => {
    expect(() => new Function('window', 'document', script)).not.toThrow()
  })

  it('is ES5-safe, because it runs before anything has decided the bundle target', () => {
    expect(script).not.toMatch(/=>|\blet\b|\bconst\b|\bclass\b|\.\.\./)
  })

  it('names the same key the store writes', () => {
    expect(script).toContain(RECORD_STORAGE_KEY)
  })

  it('embeds the build-time facts as JSON with < escaped out', () => {
    const hostile = recordBootScript({ '<script>': 1 }, { '</script>': 1 })
    expect(hostile.toLowerCase()).not.toContain('</script')
    expect(hostile).toContain('\\u003c')
    expect(() => new Function('window', 'document', hostile)).not.toThrow()
  })

  it('is one self-contained expression statement, like THEME_BOOT_SCRIPT', () => {
    expect(script.startsWith('(function()')).toBe(true)
    expect(script.trimEnd().endsWith('})();')).toBe(true)
    expect(script).toContain('try')
    expect(script).toContain('catch')
  })
})

describe('data-hl-storage — what tells empty state 4 from empty state 1 (§12.13)', () => {
  const script = recordBootScript(TOTALS, MODULES)

  it('is ok when storage answers, even with nothing in it', () => {
    const stamped = run(script)
    expect(stamped.attributes.get('data-hl-storage')).toBe('ok')
    expect(stamped.attributes.has('data-hl-record')).toBe(false)
    expect(stamped.classes.size).toBe(0)
  })

  it('is blocked when the property access throws', () => {
    const stamped = run(script, { getterThrows: true })
    expect(stamped.attributes.get('data-hl-storage')).toBe('blocked')
    expect(stamped.attributes.has('data-hl-record')).toBe(false)
  })

  it('is blocked when the read throws', () => {
    expect(run(script, { getItemThrows: true }).attributes.get('data-hl-storage')).toBe('blocked')
  })
})

describe('the marks CSS draws from (§12.2 Channel A)', () => {
  const script = recordBootScript(TOTALS, MODULES)

  it('stamps one class per signed-off module number', () => {
    const stamped = run(script, { stored: envelope(signedSheets('fundamentals/llms', 'intermediate/security')) })
    expect(stamped.attributes.get('data-hl-record')).toBe('1')
    expect([...stamped.classes].sort()).toEqual([
      'hl-cat-fundamentals-started',
      'hl-cat-intermediate-started',
      'hl-signed-1',
      'hl-signed-13',
    ])
  })

  it('marks a category complete only when every sheet in it is signed', () => {
    const all = Object.keys(MODULES).filter((slug) => slug.startsWith('fundamentals/'))
    const stamped = run(script, { stored: envelope(signedSheets(...all)) })
    expect(stamped.classes.has('hl-cat-fundamentals-complete')).toBe(true)
    expect(stamped.classes.has('hl-cat-fundamentals-started')).toBe(false)
  })

  it('ignores a sheet that is present but not signed off', () => {
    const stored = envelope({ sheets: { 'fundamentals/llms': { signedOff: null, reachedEnd: true } } })
    const stamped = run(script, { stored })
    expect(stamped.attributes.get('data-hl-record')).toBe('1')
    expect(stamped.classes.size).toBe(0)
  })

  it('tallies a category from the slug even when the module number is unknown', () => {
    const stamped = run(script, { stored: envelope(signedSheets('fundamentals/renamed')) })
    expect(stamped.classes.has('hl-cat-fundamentals-started')).toBe(true)
    expect([...stamped.classes].some((token) => token.startsWith('hl-signed-'))).toBe(false)
  })

  it('draws nothing for a slug with no category segment', () => {
    const stamped = run(script, { stored: envelope(signedSheets('orphan')) })
    expect(stamped.classes.size).toBe(0)
  })

  it('draws nothing from a record written by a newer version (§12.1.2)', () => {
    const stored = envelope(signedSheets('fundamentals/llms'), SCHEMA_VERSION + 1)
    const stamped = run(script, { stored })
    expect(stamped.classes.size).toBe(0)
    expect(stamped.attributes.has('data-hl-record')).toBe(false)
    expect(stamped.attributes.get('data-hl-storage')).toBe('ok')
  })

  it('does nothing at all on a malformed payload, and does not throw', () => {
    for (const stored of ['{', 'null', '[]', '"x"', '{"schema":1}', '{"schema":1,"data":[]}', '']) {
      const stamped = run(script, { stored })
      expect(stamped.classes.size).toBe(0)
      expect(stamped.attributes.get('data-hl-storage')).toBe('ok')
    }
  })

  it('survives a hostile sheets map', () => {
    const stored = envelope({ sheets: [{ signedOff: 'x' }] })
    expect(run(script, { stored }).classes.size).toBe(0)
    const polluting = envelope({ sheets: { __proto__: { signedOff: 'x' } } })
    expect(run(script, { stored: polluting }).classes.size).toBe(0)
  })

  it('is idempotent: running it twice stamps exactly the same thing', () => {
    const stored = envelope(signedSheets('fundamentals/llms', 'fundamentals/training'))
    const once = run(script, { stored })
    const twice = run(script, { stored })
    run(script, { stored }, twice)
    expect([...twice.classes].sort()).toEqual([...once.classes].sort())
    expect([...twice.attributes.entries()].sort()).toEqual([...once.attributes.entries()].sort())
  })

  it('needs no category totals to be useful, which is what the bare constant is', () => {
    const stamped = run(RECORD_BOOT_SCRIPT, { stored: envelope(signedSheets('fundamentals/llms')) })
    expect(stamped.attributes.get('data-hl-record')).toBe('1')
    expect(stamped.attributes.get('data-hl-storage')).toBe('ok')
    // No module map, so no sign-off marks; the category still reads as started.
    expect([...stamped.classes]).toEqual(['hl-cat-fundamentals-started'])
  })
})
