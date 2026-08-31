import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { CONTENT_ROOT } from './paths'

/**
 * §5.5 `REVISION` / `DATE` — the commit that last touched *this file*, never
 * repo HEAD (§11.26). Read once, at build time, from a single `git log` pass.
 *
 * Git is a build convenience, not a build dependency: a shallow checkout, an
 * exported tarball or a machine with no `git` on PATH all degrade to `null`,
 * and the sheet prints nothing rather than a hash it cannot stand behind.
 */

export interface Revision {
  /** The short hash git itself chose, not a slice of the long one. */
  hash: string
  /** The commit's author date, `YYYY-MM-DD`. */
  date: string
}

/** Runs a git command in the content tree and returns its stdout. */
export type GitRunner = (args: readonly string[]) => string

/** `<short hash> <author date>` — the header line of one commit record. */
const COMMIT = /^([0-9a-f]{4,}) (\d{4}-\d{2}-\d{2})$/

function run(args: readonly string[]): string {
  return execFileSync('git', ['-C', CONTENT_ROOT, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
}

/**
 * Parse `git log --format=%h %ad --date=short --name-only` output into an
 * absolute-path index. The log arrives newest-first, so the first commit to
 * name a file is the one that last touched it — later mentions are history.
 */
export function parseRevisionLog(log: string, repoRoot: string): Map<string, Revision> {
  const index = new Map<string, Revision>()
  let current: Revision | null = null

  for (const raw of log.split('\n')) {
    const line = raw.trim()
    if (line === '') continue

    const header = COMMIT.exec(line)
    if (header) {
      current = { hash: header[1], date: header[2] }
      continue
    }
    if (current === null) continue

    const absolute = path.resolve(repoRoot, line)
    if (!index.has(absolute)) index.set(absolute, current)
  }

  return index
}

export function buildRevisionIndex(git: GitRunner = run): Map<string, Revision> {
  try {
    const repoRoot = git(['rev-parse', '--show-toplevel']).trim()
    if (repoRoot === '') return new Map()
    const log = git(['log', '--format=%h %ad', '--date=short', '--name-only', '--', '.'])
    return parseRevisionLog(log, repoRoot)
  } catch {
    return new Map()
  }
}

let index: Map<string, Revision> | null = null

/** The revision of one module file, or `null` when git cannot tell us. */
export function revisionFor(filePath: string): Revision | null {
  index ??= buildRevisionIndex()
  return index.get(path.resolve(filePath)) ?? null
}
