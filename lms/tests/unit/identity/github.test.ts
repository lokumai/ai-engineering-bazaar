import { describe, expect, it } from 'vitest'
import { parseCommit, parseRepo } from '@/lib/identity/github'

describe('parseRepo — the two shapes GitHub documents', () => {
  it('accepts the canonical HTTPS form and reconstructs the url', () => {
    expect(parseRepo('https://github.com/lokumai/ai-minicourses')).toEqual({
      owner: 'lokumai',
      repo: 'ai-minicourses',
      url: 'https://github.com/lokumai/ai-minicourses',
    })
  })

  it('accepts www.github.com and normalises it away in the reconstruction', () => {
    expect(parseRepo('https://www.github.com/a/b')?.url).toBe('https://github.com/a/b')
  })

  it('is host-case-insensitive, because the URL parser lower-cases the host', () => {
    expect(parseRepo('https://GitHub.COM/a/b')?.url).toBe('https://github.com/a/b')
  })

  it('keeps owner and repo case exactly as typed', () => {
    expect(parseRepo('https://github.com/Lokumai/AI-MiniCourses')?.url)
      .toBe('https://github.com/Lokumai/AI-MiniCourses')
  })

  it('strips one trailing .git', () => {
    expect(parseRepo('https://github.com/a/b.git')?.repo).toBe('b')
    expect(parseRepo('https://github.com/a/b.git.git')?.repo).toBe('b.git')
  })

  it('tolerates surrounding whitespace and a trailing slash', () => {
    expect(parseRepo('  https://github.com/a/b/  ')?.url).toBe('https://github.com/a/b')
  })

  it('accepts the scp-style SSH shape and rewrites it to HTTPS', () => {
    expect(parseRepo('git@github.com:lokumai/ai-minicourses.git')).toEqual({
      owner: 'lokumai',
      repo: 'ai-minicourses',
      url: 'https://github.com/lokumai/ai-minicourses',
    })
    expect(parseRepo('git@github.com:a/b')?.url).toBe('https://github.com/a/b')
  })

  it('rejects an SSH shape on any other host, or with a deeper path', () => {
    expect(parseRepo('git@github.com.evil.example:a/b.git')).toBeNull()
    expect(parseRepo('git@gitlab.com:a/b.git')).toBeNull()
    expect(parseRepo('git@github.com:a/b/c')).toBeNull()
    expect(parseRepo('git@github.com:a')).toBeNull()
  })

  it('rejects ssh:// and git:// URLs — only https: is on the allowlist', () => {
    expect(parseRepo('ssh://git@github.com/a/b.git')).toBeNull()
    expect(parseRepo('git://github.com/a/b.git')).toBeNull()
  })

  it('truncates a deep link to owner/repo, because a reader will paste one', () => {
    expect(parseRepo('https://github.com/a/b/tree/main')?.url).toBe('https://github.com/a/b')
    expect(parseRepo('https://github.com/a/b/blob/main/src/index.ts')?.url)
      .toBe('https://github.com/a/b')
    expect(parseRepo('https://github.com/a/b/commit/deadbee')?.repo).toBe('b')
  })
})

describe('parseRepo — the adversarial set (§12.9.2)', () => {
  it('rejects javascript: — the protocol check is what actually blocks it', () => {
    expect(parseRepo('javascript:alert(1)')).toBeNull()
    expect(parseRepo('javascript:alert(1)//github.com/a/b')).toBeNull()
    expect(parseRepo('JavaScript:alert(1)')).toBeNull()
  })

  it('rejects data: URLs', () => {
    expect(parseRepo('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(parseRepo('data:text/html;base64,PHNjcmlwdD4=')).toBeNull()
  })

  it('rejects plain http, even on the real host', () => {
    expect(parseRepo('http://github.com/a/b')).toBeNull()
  })

  it('rejects userinfo spoofing — the host there is evil.example', () => {
    expect(parseRepo('https://github.com@evil.example/a/b')).toBeNull()
    expect(parseRepo('https://github.com:x@evil.example/a/b')).toBeNull()
  })

  it('rejects credentials even on the real host', () => {
    expect(parseRepo('https://token@github.com/a/b')).toBeNull()
    expect(parseRepo('https://user:pass@github.com/a/b')).toBeNull()
  })

  it('rejects a suffix host', () => {
    expect(parseRepo('https://github.com.evil.example/a/b')).toBeNull()
    expect(parseRepo('https://evil.example/github.com/a/b')).toBeNull()
    expect(parseRepo('https://gist.github.com/a/b')).toBeNull()
  })

  it('rejects the Cyrillic homograph host', () => {
    // U+0456 CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I in place of "i".
    const homograph = 'https://gіthub.com/a/b'
    expect(homograph).not.toContain('github.com')
    expect(parseRepo(homograph)).toBeNull()
  })

  it('rejects a non-default port', () => {
    expect(parseRepo('https://github.com:8443/a/b')).toBeNull()
    // :443 is the default for https and the parser normalises it away.
    expect(parseRepo('https://github.com:443/a/b')?.url).toBe('https://github.com/a/b')
  })

  it('does not let a query string survive into the url', () => {
    const parsed = parseRepo('https://github.com/a/b?x=<script>alert(1)</script>')
    expect(parsed?.url).toBe('https://github.com/a/b')
    expect(parsed?.url).not.toContain('?')
    expect(parsed?.url).not.toContain('<')
    expect(parsed?.url).not.toContain('%3C')
  })

  it('does not let a fragment survive into the url', () => {
    const parsed = parseRepo('https://github.com/a/b#frag')
    expect(parsed?.url).toBe('https://github.com/a/b')
    expect(parsed?.url).not.toContain('#')
  })

  it('rejects too few path segments', () => {
    expect(parseRepo('https://github.com/a')).toBeNull()
    expect(parseRepo('https://github.com/')).toBeNull()
    expect(parseRepo('https://github.com')).toBeNull()
  })

  it('rejects an empty path segment', () => {
    expect(parseRepo('https://github.com//b')).toBeNull()
    expect(parseRepo('https://github.com/a//b')).toBeNull()
  })

  it('rejects ../ traversal', () => {
    // The URL parser resolves dot segments, so this is a one-segment path.
    expect(parseRepo('https://github.com/a/../../b')).toBeNull()
    expect(parseRepo('https://github.com/../a/b')?.url).toBe('https://github.com/a/b')
    expect(parseRepo('https://github.com/%2e%2e/b')).toBeNull()
  })

  it('rejects a segment over 100 characters — GitHub’s own documented rule', () => {
    expect(parseRepo(`https://github.com/a/${'r'.repeat(100)}`)?.repo).toHaveLength(100)
    expect(parseRepo(`https://github.com/a/${'r'.repeat(101)}`)).toBeNull()
    expect(parseRepo(`https://github.com/${'o'.repeat(101)}/b`)).toBeNull()
  })

  it('rejects a segment with a character outside the documented set', () => {
    expect(parseRepo('https://github.com/a b/c')).toBeNull()
    expect(parseRepo('https://github.com/a/b%20c')).toBeNull()
    expect(parseRepo('https://github.com/a/b~c')).toBeNull()
    expect(parseRepo('https://github.com/a/İpek')).toBeNull()
    expect(parseRepo('https://github.com/a/b:c')).toBeNull()
  })

  it('accepts the four characters that are inside it', () => {
    expect(parseRepo('https://github.com/a-1/b._-c')?.repo).toBe('b._-c')
  })

  it('rejects the empty string, whitespace, and a bare owner/repo', () => {
    expect(parseRepo('')).toBeNull()
    expect(parseRepo('   ')).toBeNull()
    // Not a URL. Inventing the host the reader did not type would be a guess.
    expect(parseRepo('lokumai/ai-minicourses')).toBeNull()
  })

  it('rejects a control character or a newline smuggled into the input', () => {
    expect(parseRepo('https://github.com/a/b\n')?.url).toBe('https://github.com/a/b')
    expect(parseRepo('java\nscript:alert(1)')).toBeNull()
    expect(parseRepo('https://github.com/a/b\u200B')).toBeNull()
  })

  it('never returns a url that is not the reconstruction', () => {
    const hostile = [
      'https://github.com/a/b?x=1',
      'https://github.com/a/b#z',
      'https://www.github.com/a/b/tree/main',
      'https://github.com/a/b.git',
      'git@github.com:a/b.git',
    ]
    for (const input of hostile) {
      const parsed = parseRepo(input)
      expect(parsed).not.toBeNull()
      expect(parsed?.url).toBe(`https://github.com/${parsed?.owner}/${parsed?.repo}`)
    }
  })
})

describe('parseCommit', () => {
  it('accepts 7 to 40 lowercase hex characters', () => {
    expect(parseCommit('deadbee')).toBe('deadbee')
    expect(parseCommit('0'.repeat(40))).toBe('0'.repeat(40))
  })

  it('lower-cases and trims, because that is what a paste looks like', () => {
    expect(parseCommit('  DEADBEE  ')).toBe('deadbee')
    expect(parseCommit('AbCdEf0123')).toBe('abcdef0123')
  })

  it('rejects lengths outside 7..40', () => {
    expect(parseCommit('deadbe')).toBeNull()
    expect(parseCommit('0'.repeat(41))).toBeNull()
    expect(parseCommit('')).toBeNull()
  })

  it('rejects anything that is not hex', () => {
    expect(parseCommit('deadbeg')).toBeNull()
    expect(parseCommit('dead bee')).toBeNull()
    expect(parseCommit('dead-bee')).toBeNull()
    expect(parseCommit('0xdeadbee')).toBeNull()
    expect(parseCommit('deadbee\n')).toBe('deadbee')
    expect(parseCommit('<img src=x>')).toBeNull()
  })

  it('rejects a full URL — this field holds a hash, not a link', () => {
    expect(parseCommit('https://github.com/a/b/commit/deadbee')).toBeNull()
  })
})
