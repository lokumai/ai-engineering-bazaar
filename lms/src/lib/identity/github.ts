/**
 * §12.9.2 — validating a submittal's repository, and §12.9.3 its commit hash.
 *
 * A submittal is the strongest evidence this system will ever hold: the only
 * content a third party can independently check. That makes the link the one
 * place where attacker-controlled text becomes an `href`, so the rule is an
 * ALLOWLIST — parse the input with the URL parser and interrogate the parsed
 * parts — and never a regex over the raw string. A regex over raw text cannot
 * see that the host of `https://github.com@evil.example/a/b` is
 * `evil.example`, and cannot see that `gіthub.com` starts with U+0456.
 *
 * The returned `url` is RECONSTRUCTED from the two validated segments and is
 * never a substring of the input. That is what makes a link whose visible text
 * lies about its destination impossible: query strings, fragments, userinfo,
 * ports and unicode hosts have no path to the `href` because the `href` is
 * built from `owner` and `repo` alone.
 *
 * This module imports nothing — §12.2's import direction. It is pure and
 * fs-free so a client island can hold it.
 */

export interface Repo {
  owner: string
  repo: string
  /** §12.9.2 — `https://github.com/{owner}/{repo}`, rebuilt, never the input. */
  url: string
}

/**
 * GitHub's own documented rule for an owner or repository name: ASCII
 * alphanumerics plus `.`, `_` and `-`, and at most 100 characters. Applied to
 * an already-parsed path segment, so it is a check on a decided value rather
 * than a search through raw text.
 */
const SEGMENT = /^[A-Za-z0-9._-]{1,100}$/

/**
 * The scp-style shape `git@github.com:owner/repo.git`. GitHub documents this
 * alongside the HTTPS form, so accepting it is correct rather than lenient —
 * but it is not a URL, so the URL parser cannot see it (the `@` makes the
 * scheme invalid and `URL.parse` returns null). It is matched separately, on a
 * fully anchored pattern, and rewritten to HTTPS.
 *
 * `[^:/]+` for each segment is what rejects `git@github.com:a/b/c` and
 * `git@github.com:443/a/b` before the segment rule is ever consulted.
 * `ssh://` and `git://` URLs are NOT accepted: §12.9.2 fixes the protocol
 * allowlist at `https:` alone, and those two parse as URLs.
 */
const SSH = /^git@github\.com:([^:/]+)\/([^:/]+)$/

const HOSTS: readonly string[] = ['github.com', 'www.github.com']

/** §12.9.2 — one trailing `.git`, not a greedy loop: `b.git.git` → `b.git`. */
function stripDotGit(segment: string): string {
  return segment.endsWith('.git') ? segment.slice(0, -4) : segment
}

function build(owner: string, repo: string): Repo | null {
  const cleanRepo = stripDotGit(repo)
  if (!SEGMENT.test(owner) || !SEGMENT.test(cleanRepo)) return null
  return { owner, repo: cleanRepo, url: `https://github.com/${owner}/${cleanRepo}` }
}

/**
 * §12.9.2. Returns null on anything that is not one of the two documented
 * shapes. Case is preserved in the two segments — GitHub resolves them
 * case-insensitively but displays them as created, and a reader recognises
 * their own repository by its capitals.
 */
export function parseRepo(input: string): Repo | null {
  const trimmed = input.trim()
  if (trimmed === '') return null

  const ssh = SSH.exec(trimmed)
  if (ssh) return build(ssh[1], ssh[2])

  // `URL.parse` returns null instead of throwing (Baseline September 2024), so
  // the failure case is a value rather than control flow.
  const url = URL.parse(trimmed)
  if (url === null) return null

  // The protocol check is what actually blocks `javascript:` and `data:`.
  // Comparing the parsed protocol, not a prefix of the input, is why
  // `java\nscript:alert(1)` is caught too: the URL parser strips ASCII tabs
  // and newlines from anywhere in the input before deciding the scheme.
  if (url.protocol !== 'https:') return null
  if (!HOSTS.includes(url.hostname)) return null

  // A non-default port is a different server. `:443` is normalised away by the
  // parser, so this rejects `:8443` and accepts the redundant `:443`.
  if (url.port !== '') return null

  // Credentials never appear in a legitimate repository link. The
  // reconstruction would drop them anyway; rejecting says so out loud instead
  // of silently accepting a URL that was trying something.
  if (url.username !== '' || url.password !== '') return null

  const segments = url.pathname.split('/')
  // A parsed pathname always begins with `/`, so `segments[0]` is empty.
  if (segments[0] !== '' || segments.length < 3) return null

  // §12.9.2 wants exactly `[owner, repo]`, and §12's own decision is to accept
  // a deep link and truncate it, because a reader pastes what the address bar
  // gave them: `/a/b/tree/main` and `/a/b/blob/main/src/index.ts` both mean
  // the repository `a/b`. Extra segments are dropped; an EMPTY first or second
  // segment is not, so `//b` and `/a//b` fail the segment rule below rather
  // than being silently re-indexed.
  return build(segments[1], segments[2])
}

/**
 * §12.9.3 — the commit hash. Reader-supplied, never fetched, never verified;
 * the record prints it with exactly that caveat beside it. Trimmed and
 * lower-cased first because that is what a paste from a terminal or from
 * GitHub's own UI looks like.
 *
 * A hash is the highest-credibility upgrade available to an offline document:
 * it moves verification to the party who actually has a network, and a
 * reviewer can resolve `{repo}/commit/{sha}` themselves.
 */
export function parseCommit(input: string): string | null {
  const normalised = input.trim().toLowerCase()
  return /^[0-9a-f]{7,40}$/.test(normalised) ? normalised : null
}
