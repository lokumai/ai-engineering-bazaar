import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadModule } from '@/lib/content/loader'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { buildRevisionIndex, parseRevisionLog, revisionFor } from '@/lib/content/revision'

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
