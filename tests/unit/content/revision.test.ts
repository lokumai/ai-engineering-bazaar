import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadModule } from '@/lib/content/loader'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { buildRevisionIndex, headCommitDate, parseRevisionLog, revisionFor } from '@/lib/content/revision'

const LOG = [
  'c0ffee1 2026-08-31',
  '',
  'mini-courses/1_fundamentals/llms.md',
  'mini-courses/1_fundamentals/training.md',
  'deadbee 2026-08-01',
  '',
  'mini-courses/1_fundamentals/llms.md',
  'mini-courses/3_expert/advanced_ui.md',
  '',
].join('\n')

describe('parseRevisionLog', () => {
  const index = parseRevisionLog(LOG, '/repo')

  it('keeps the newest commit that touched a file, not the oldest', () => {
    expect(index.get('/repo/mini-courses/1_fundamentals/llms.md'))
      .toEqual({ hash: 'c0ffee1', date: '2026-08-31' })
  })

  it('records a file only the older commit touched', () => {
    expect(index.get('/repo/mini-courses/3_expert/advanced_ui.md'))
      .toEqual({ hash: 'deadbee', date: '2026-08-01' })
  })

  it('records every file in a commit, not just the first', () => {
    expect(index.get('/repo/mini-courses/1_fundamentals/training.md')?.hash)
      .toBe('c0ffee1')
  })

  it('reads an empty log as an empty index', () => {
    expect(parseRevisionLog('', '/repo').size).toBe(0)
  })
})

describe('buildRevisionIndex', () => {
  it('degrades to an empty index when git is unavailable, and never throws', () => {
    const explode = () => {
      throw new Error('spawn git ENOENT')
    }
    expect(() => buildRevisionIndex(explode)).not.toThrow()
    expect(buildRevisionIndex(explode).size).toBe(0)
  })

  it('degrades to an empty index when the tree is not a repository', () => {
    const notARepo = (args: readonly string[]) => {
      if (args.includes('rev-parse')) throw new Error('not a git repository')
      return ''
    }
    expect(buildRevisionIndex(notARepo).size).toBe(0)
  })

  // git's own %h grows with the object count and follows core.abbrev, so the
  // same commit printed a different hash on a different machine or a year on,
  // and the bundle's contentVersion moved with no content change.
  it('writes every hash at one fixed width, whatever length git would choose', () => {
    const full = 'c0ffee1234567890abcdef1234567890abcdef12'
    const log = [`${full} 2026-08-31`, '', 'mini-courses/1_fundamentals/llms.md', ''].join('\n')
    const index = buildRevisionIndex((args) => (args.includes('rev-parse') ? '/repo\n' : log))
    expect(index.get('/repo/mini-courses/1_fundamentals/llms.md')).toEqual({ hash: 'c0ffee1', date: '2026-08-31' })
  })

  it('asks git for the last-touching commit of each file, never for HEAD', () => {
    const seen: string[][] = []
    buildRevisionIndex((args) => {
      seen.push([...args])
      return args.includes('rev-parse') ? '/repo\n' : LOG
    })
    expect(seen.flat()).not.toContain('HEAD')
    expect(seen.some((a) => a.includes('log') && a.includes('--name-only'))).toBe(true)
  })
})

describe('revisionFor', () => {
  it('gives a committed module a short hash and an ISO author date', () => {
    const module = loadModule('fundamentals/llms')!
    const revision = revisionFor(module.filePath)
    expect(revision).not.toBeNull()
    expect(revision!.hash).toMatch(/^[0-9a-f]{7,}$/)
    expect(revision!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('gives a file git has never seen null rather than a lie', () => {
    expect(revisionFor(path.join(CONTENT_ROOT, 'no_such_module.md'))).toBeNull()
  })
})

describe('headCommitDate', () => {
  it('asks git for the committer date of HEAD and returns it in UTC', () => {
    const seen: string[][] = []
    const date = headCommitDate((args) => {
      seen.push([...args])
      return '2026-11-05T10:20:30+03:00\n'
    })
    expect(date).toBe('2026-11-05T07:20:30.000Z')
    expect(seen).toEqual([['log', '-1', '--format=%cI', 'HEAD']])
  })

  it('throws when git fails, because an index without a date cannot be ordered', () => {
    const explode = () => {
      throw new Error('spawn git ENOENT')
    }
    expect(() => headCommitDate(explode)).toThrow(/HEAD/)
  })

  it('throws when git prints nothing', () => {
    expect(() => headCommitDate(() => '\n')).toThrow(/HEAD/)
  })

  it('throws when git prints something that is not a date', () => {
    expect(() => headCommitDate(() => 'not a date\n')).toThrow(/not a date/)
  })
})
