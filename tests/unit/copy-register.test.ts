/**
 * §12.14.1 — the copy register, enforced rather than reviewed.
 *
 * The register exists because this audience recognises the alternative
 * instantly. A site whose whole claim is that it does not lie to you cannot
 * then talk to you like a growth-hacked onboarding flow: no exclamation marks,
 * no praise, no anthropomorphism, no "just" or "simply", no confirmshaming. Two
 * design systems, a national style guide and a statistics authority all say the
 * same thing, and none of it survives a code review three months from now
 * without a test.
 *
 * ## What is scanned, and why it is scanned this way
 *
 * Only **user-visible strings**: quoted literals and JSX text. Comments are
 * stripped first, and that is essential rather than convenient — the comments in
 * this slice quote every banned word repeatedly while explaining why it is
 * banned, and a scan that read them would fail on its own rationale.
 *
 * This is a lexical scan, not a parse. It is deliberately blunt: a blunt guard
 * that runs on every commit beats a precise one nobody writes. Where it is
 * wrong, `ALLOWED` records the exception with its reason, so an exemption is a
 * visible decision rather than a silent hole.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = path.resolve(process.cwd(), 'src')

/**
 * Where §12's own copy lives. Not the whole of `src/`: the pre-existing sheet
 * chrome was written before this register and is out of scope for it, and
 * widening the net would turn the register into a refactor.
 */
const ROOTS: readonly string[] = [
  'components/record',
  // §13 — the path is the largest single body of new reader-visible copy in the
  // project: nine role blurbs and 126 step reasons, written by agents reading
  // the sheets. Agent-written prose is exactly what this register exists for.
  'components/path',
  'app/path',
  'lib/path',
  // §13.5's two new course components print `signed off` and a `--` placeholder.
  'components/course',
  'app/dashboard',
  'app/profile',
  'app/report',
  'app/legend',
  'lib/record',
  'lib/identity',
  'lib/content/criteria.ts',
]

function walk(target: string): string[] {
  const full = path.join(SRC, target)
  let info
  try {
    info = statSync(full)
  } catch {
    // A route this slice deferred. Absent is fine; scanning it is not required.
    return []
  }
  if (info.isFile()) return full.endsWith('.ts') || full.endsWith('.tsx') ? [full] : []
  return readdirSync(full).flatMap((entry) => walk(path.join(target, entry)))
}

const FILES = ROOTS.flatMap(walk).sort()

/**
 * Comments out, then the prose out of what is left.
 *
 * Order matters at the top of the loop: a `//` inside a string (`'https://…'`)
 * must not be mistaken for a comment, so string literals are lifted out FIRST
 * and the comment strip runs over the remainder. The other way round truncates
 * every URL in the file at its scheme and then reports the rest of the line as
 * prose.
 *
 * Three deliberate narrowings, each one a false positive this scan produced on
 * its first run:
 *
 *  - **Template literals are skipped.** In this slice they hold code, not copy:
 *    `report.ts` builds a whole HTML document, a stylesheet and an inline script
 *    in them. The copy inside that document is asserted directly and
 *    exhaustively by `tests/unit/record/report.test.ts` instead, which is the
 *    better instrument for it anyway.
 *  - **A string must look like prose** — a space, and a word of three letters or
 *    more. Without that, `'I'` (a CLASS numeral) reads as the first person and
 *    `'g i'` (a keyboard chord) reads as a sentence.
 *  - **No newlines.** A quote inside a regex literal (`/['"]/g`) opens a string
 *    this lexer cannot close, and it then swallows the rest of the file. A
 *    multi-line result is that mis-parse, every time.
 *
 * A blunt guard that runs on every commit beats a precise one nobody writes,
 * and every narrowing above is written down rather than discovered later.
 */
function looksLikeProse(text: string): boolean {
  if (text.includes('\n')) return false
  if (!text.includes(' ')) return false
  return /[A-Za-z]{3}/.test(text)
}

function visibleText(source: string): string[] {
  const strings: string[] = []
  let rest = ''
  let index = 0

  while (index < source.length) {
    const ch = source[index]

    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch
      let end = index + 1
      while (end < source.length) {
        if (source[end] === '\\') { end += 2; continue }
        if (source[end] === quote) break
        end += 1
      }
      // Template literals hold code in this slice; see the note above.
      if (quote !== '`') strings.push(source.slice(index + 1, end))
      rest += ' '
      index = end + 1
      continue
    }

    // A comment: the rationale, which quotes the bans and must not be scanned.
    if (ch === '/' && source[index + 1] === '/') {
      const end = source.indexOf('\n', index)
      index = end === -1 ? source.length : end
      continue
    }
    if (ch === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index)
      index = end === -1 ? source.length : end + 2
      continue
    }

    rest += ch
    index += 1
  }

  // JSX text: what sits between a `>` and the next `<`. Braces are expressions,
  // not text, so a run containing one is dropped rather than half-read.
  const jsx = [...rest.matchAll(/>([^<>{}]+)</g)]
    .map(([, text]) => text.trim())
    .filter((text) => /[A-Za-z]/.test(text))

  return [...strings, ...jsx]
    .map((text) => text.trim())
    .filter((text) => text !== '' && looksLikeProse(text))
}

interface Ban {
  name: string
  pattern: RegExp
  why: string
}

const BANS: readonly Ban[] = [
  {
    name: 'exclamation mark',
    pattern: /!/,
    why: 'Primer bars them from headings, labels, buttons and errors: most things are not that '
      + 'exciting. Google says to avoid them generally, and ONS allows them only in a direct quote.',
  },
  {
    name: 'anthropomorphism (first person)',
    pattern: /\b(?:I|I'm|I've|we|we'll|we've|my|our)\b/i,
    why: 'The page never says "I saved your progress". It says SHEET 07 SIGNED OFF. Google and '
      + "Microsoft's UI guides independently forbid attributing human qualities to software.",
  },
  {
    name: 'condescension',
    pattern: /\b(?:easy|easily|just|simply|simple|quick|quickly)\b/i,
    why: 'Google: avoid "simply" and "it\'s easy". They tell a reader that a thing they are '
      + 'struggling with is trivial.',
  },
  {
    name: 'apology or supplication',
    pattern: /\b(?:please|sorry|oops|whoops)\b/i,
    why: 'GOV.UK bans "please", "sorry" and "oops" from service copy outright.',
  },
  {
    name: 'valid / invalid',
    pattern: /\b(?:invalid|valid)\b/i,
    why: 'GOV.UK bans both from error messages: they describe the form\'s opinion rather than what '
      + 'the reader should do. An error says what to do instead.',
  },
  {
    name: 'praise',
    pattern: /\b(?:great|awesome|nice work|well done|congratulations|congrats|excellent|perfect|amazing)\b/i,
    why: '§12.5.7 — the reward for finishing is that the system logged it accurately. Praise is '
      + 'the register of a children\'s app, and this audience reads it as one.',
  },
  {
    name: 'you forgot',
    pattern: /\byou forgot\b/i,
    why: 'GOV.UK: an error message never blames the reader.',
  },
  {
    name: 'NOT YET DRAWN',
    pattern: /\bNOT YET DRAWN\b/,
    why: '§12.14.1 — the register has ONE word for this state and it is NOT DRAWN, used by the '
      + 'manifest, the filter chip, the module row, the diagram and the report. §13 arrived with '
      + '"NOT YET DRAWN" in its spec text, and a path step duly printed it, so one sheet read two '
      + 'ways on two screens. A second spelling of a status is the drift this register exists to '
      + 'stop, and it is worth a ban of its own because both forms read as correct in isolation.',
  },
]

/**
 * Exemptions, each with the reason it is one. An entry here is a decision on the
 * record; an unlisted match is a failure.
 */
const ALLOWED: ReadonlyArray<{ text: RegExp; ban: string; why: string }> = [
  {
    text: /quick check/i,
    ban: 'condescension',
    why: 'The authored name of a section in the corpus. §12.6 quotes the label the author typed; '
      + 'renaming a reader-visible heading to suit this register would be the site putting words '
      + "in the author's mouth.",
  },
  {
    text: /^Keep my data$/,
    ban: 'anthropomorphism (first person)',
    why: '§12.15 and §12.14.1 both quote this EXACT label as the model decline button, and '
      + '§12.14.1 uses it as its own example of copy that is right. The ban is on the software '
      + 'speaking as a person ("I saved your progress"); this possessive is the READER\'s, on a '
      + 'button that states the safe outcome, which is the thing the section asks for rather '
      + 'than the thing it forbids.',
  },
  {
    text: /^(?:https?:|\/|#|data-|aria-|role$)/,
    ban: '*',
    why: 'A URL, a route, a selector or an attribute name is not prose.',
  },
  {
    text: /SHA-256|Intl\.|navigator\.|crypto\.|localStorage/,
    ban: '*',
    why: 'An API name.',
  },
]

function exempt(text: string, ban: string): boolean {
  return ALLOWED.some(
    (entry) => (entry.ban === '*' || entry.ban === ban) && entry.text.test(text),
  )
}

describe('§12.14.1 — the copy register', () => {
  it('scans a real set of files, so a silent pass cannot be an empty scan', () => {
    expect(FILES.length).toBeGreaterThan(20)
    expect(FILES.some((file) => file.endsWith('SignOff.tsx'))).toBe(true)
  })

  it('strips comments before scanning, or it would fail on its own rationale', () => {
    const sample = [
      "// This comment says please and simply and has an exclamation mark!",
      "/* So does this one: awesome! */",
      "const ok = 'SHEET 07 SIGNED OFF'",
    ].join('\n')
    expect(visibleText(sample)).toEqual(['SHEET 07 SIGNED OFF'])
  })

  it('lifts strings out before stripping comments, so a comment marker inside one is safe', () => {
    const sample = "const u = 'see https://example.org for more' // a link"
    expect(visibleText(sample)).toEqual(['see https://example.org for more'])
  })

  it('skips a single token, a chord and a numeral — none of them is prose', () => {
    expect(visibleText("const a = 'quick-check'; const b = 'g i'; const c = 'I'")).toEqual([])
  })

  it('skips a multi-line result, which is always a regex-literal mis-parse', () => {
    const sample = "const RE = /['\"]/g\nconst next = 'SHEET 07 SIGNED OFF'"
    expect(visibleText(sample)).not.toContain(undefined)
    expect(visibleText(sample).every((text) => !text.includes('\n'))).toBe(true)
  })

  it('reads JSX text', () => {
    const sample = '<p className="x">Export your record to a file to keep it.</p>'
    expect(visibleText(sample)).toContain('Export your record to a file to keep it.')
  })

  for (const ban of BANS) {
    it(`has no ${ban.name} in any reader-visible string`, () => {
      const offences: string[] = []
      for (const file of FILES) {
        for (const text of visibleText(readFileSync(file, 'utf8'))) {
          if (!ban.pattern.test(text)) continue
          if (exempt(text, ban.name)) continue
          offences.push(`${path.relative(SRC, file)} — ${JSON.stringify(text.slice(0, 90))}`)
        }
      }
      expect(offences, `${ban.name}: ${ban.why}`).toEqual([])
    })
  }
})
