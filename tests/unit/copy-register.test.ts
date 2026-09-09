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
  // §15 — the front matter. Every root below carries reader-visible prose this
  // phase either wrote or rewrote, and none of it was scanned before: the home
  // screen is the largest new block of copy in the project since §13's path,
  // and the three identity surfaces are where a name could be mistaken for a
  // proof, which is exactly the kind of claim the register guards.
  'components/home',
  'components/identity',
  'app/sign-in',
  'app/join',
  'app/team',
  'app/sheets',
  'lib/auth',
  // §16.6 — the two auth panels. `lib/auth` was scanned from §15 but the panels
  // that print its states were not, and §16.1.1 makes them reader-visible in a
  // second place: `SignInPanel` and `AccountPanel` now render inside the
  // drafter block as well as on their own routes. The same sentence read twice
  // on two screens is exactly the drift this register stops. Measured when the
  // root was added: 81 files scanned before, 84 after — AuthPanels.tsx,
  // SessionProvider.tsx and SignInPanel.tsx, which is why the non-vacuity test
  // below now names this root rather than only counting.
  'components/auth',
  // M10, M12 and M14 — the shell, the catalog and the folded progress route.
  // These four hold the largest new blocks of reader-visible copy in the
  // interface revision (the view toggle's three names, the two filter groups,
  // the empty state, the rail's `Course modules` and `Hide`, and the copy on
  // the three redirect stubs) and NONE of them was scanned: the M9 block below
  // walks the whole of `src/` for the retired vocabulary, so the hole was in
  // the register's own bans only. ARCHITECTURE.md records that this same
  // omission — `components/shell` unscanned — is how a first-person `My
  // progress` shipped past the ban once already.
  'components/shell',
  'components/catalog',
  'components/curriculum',
  'lib/catalog',
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
    why: 'The page never says "I saved your progress". It says MODULE 07 COMPLETED. Google and '
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
    name: 'PLANNED',
    pattern: /\bNOT YET DRAWN\b/,
    why: '§12.14.1 — the copy register has ONE word for this state and it is PLANNED, used by '
      + 'manifest, the filter chip, the module row, the diagram and the report. §13 arrived with '
      + '"PLANNED" in its spec text, and a path step duly printed it, so one sheet read two '
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
      + 'speaking as a person ("I saved it for you"); this possessive is the READER\'s, on a '
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
  {
    text: /(?:^|\s)hl-/,
    ban: 'retired vocabulary',
    why: 'A stylesheet class list. `hl-sheet-title` and `hl-subsystems-head` are the code\'s own '
      + 'names, which §9 keeps: renaming a class is a refactor with no reader-visible effect, and '
      + 'a class list only looks like prose because it contains a space.',
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

  /**
   * Non-vacuity per root, not just in total. `walk` returns `[]` for a path that
   * does not resolve, which is the right behaviour while scanning — a deferred
   * route is absent, not an error — but it also means a misspelt or emptied root
   * contributes nothing and the whole register still reports green. Every root
   * in the list today resolves to at least one `.ts`/`.tsx` file, so assert
   * that: adding a root that scans nothing is then a red test rather than a
   * silent hole. Stated as a property over `ROOTS` rather than as a file count,
   * because the count moves with every file the phase adds.
   */
  it('scans every root it lists, so a new root cannot be silently empty', () => {
    const empty = ROOTS.filter((root) => walk(root).length === 0)
    expect(empty).toEqual([])
  })

  it('strips comments before scanning, or it would fail on its own rationale', () => {
    const sample = [
      "// This comment says please and simply and has an exclamation mark!",
      "/* So does this one: awesome! */",
      "const ok = 'MODULE 07 COMPLETED'",
    ].join('\n')
    expect(visibleText(sample)).toEqual(['MODULE 07 COMPLETED'])
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

/**
 * M9 — the retired vocabulary, banned rather than reviewed.
 *
 * `kia-context/specs/ARCHITECTURE.md` §9 lists the words the interface used to
 * speak: a module was a *sheet*, a level a *subsystem*, finishing one a
 * *sign-off*, and a written one *drawn*. The whole set was a *drawing set* and
 * the reader was a *drafter*. It was consistent and it was undecodable to a
 * first-time reader, so `logs/BRAINSTORM.md` D10 replaced it with vocabulary set
 * C. **The code keeps the old names** — `sheetStamps`, `data-drawn`, `hl-sheet`,
 * `kind: 'sign-off'` — because renaming a storage key would invalidate every
 * reader's saved history for a cosmetic gain. Only what a reader can see moved.
 *
 * ## Why this scan is wider than the register above
 *
 * `ROOTS` deliberately excludes the older chrome: the register arrived mid-way
 * through the project and widening it would have turned a guard into a refactor.
 * This ban has the opposite requirement. The vocabulary was replaced everywhere
 * in one pass, so it has to be *held* everywhere, and a root left out is a place
 * the old word can come back. So this scans the whole of `src/`.
 *
 * ## What is not banned, and why
 *
 * **`drawn` on its own.** It is ordinary English for a figure — "LKM-01 has
 * drawn every figure in this curriculum" is correct, and the legend page says
 * exactly that. Only the status sense is banned, which always appears as
 * `not drawn`, `NOT DRAWN` or `not yet drawn`.
 *
 * **`requires` and `feeds`.** Both are ordinary verbs. The retired thing was the
 * pair of *labels*, and those are asserted directly by
 * `tests/unit/content/title-block.test.ts`, which is a better instrument: it
 * checks the label a module page actually prints rather than the word appearing
 * anywhere in a sentence.
 *
 * ## The measurement this replaces
 *
 * Before the rename the export carried **1,660 occurrences of this vocabulary
 * across 56 pages**; after it, zero. That was measured by stripping tags from
 * every file in `out/` and grepping the visible text, which is the honest check
 * and needs a build. This test is the cheap one that runs on every commit, and
 * it is a lexical scan of the source rather than a substitute for that build.
 */
const RETIRED: ReadonlyArray<{ pattern: RegExp; instead: string }> = [
  { pattern: /\bdrawing set\b/i, instead: 'the curriculum' },
  { pattern: /\bindex sheet\b/i, instead: 'the catalog' },
  { pattern: /\bsheets?\b/i, instead: 'module' },
  { pattern: /\bsubsystems?\b/i, instead: 'level' },
  // `signs off` and `sign-offs` were both missed by the first version of this:
  // `\bsign(?:ed|ing)?[ -]off\b` has no alternative for the third person and
  // no trailing `s?`, so a plural slipped through the word boundary.
  { pattern: /\bsign(?:s|ed|ing)?[ -]offs?\b/i, instead: 'complete / completed' },
  { pattern: /\bnot (?:yet )?drawn\b/i, instead: 'planned' },
  { pattern: /\btitle block\b/i, instead: 'module info' },
  { pattern: /\bthe register\b/i, instead: 'your progress' },
  { pattern: /\bdrafters?\b/i, instead: 'you, or the account' },
  { pattern: /\bextent\b/i, instead: 'length' },
  { pattern: /\buptime\b/i, instead: 'streak' },
]

/** Every `.ts`/`.tsx` under `src/`, so a new file cannot be a hole. */
function everything(dir: string = ''): string[] {
  const full = path.join(SRC, dir)
  return readdirSync(full).flatMap((entry) => {
    const next = path.join(dir, entry)
    if (statSync(path.join(SRC, next)).isDirectory()) return everything(next)
    return entry.endsWith('.ts') || entry.endsWith('.tsx') ? [path.join(SRC, next)] : []
  })
}

const ALL_FILES = everything().sort()

describe('M9 — the retired vocabulary stays retired', () => {
  it('scans the whole of src, not a subset, so a new file cannot be a hole', () => {
    expect(ALL_FILES.length).toBeGreaterThan(FILES.length)
    expect(ALL_FILES).toEqual(expect.arrayContaining(FILES))
  })

  it('states a replacement for every word it bans', () => {
    for (const { pattern, instead } of RETIRED) {
      expect(instead, String(pattern)).not.toBe('')
    }
  })

  /**
   * The guard bites: run the bans over a string that carries the old
   * vocabulary and every one of them has to fire. Without this the block
   * above passes just as green with a typo in every pattern.
   */
  it('fires on the vocabulary it is meant to catch', () => {
    const old = 'SHEET 07 of the drawing set · SUBSYSTEM 02 · NOT DRAWN · '
      + 'the index sheet · signed off by the drafter · title block · '
      + 'the register · EXTENT · UPTIME'
    const fired = RETIRED.filter(({ pattern }) => pattern.test(old))
    expect(fired).toHaveLength(RETIRED.length)
  })

  /**
   * A word inside backticks is the code's own name, not a word a reader sees:
   * `render.ts` throws "the caller has to pass `sheet`", where `sheet` is the
   * parameter. §9 keeps those, so they are stripped before matching rather than
   * exempted string by string — an exemption list would grow with every error
   * message that mentions an identifier.
   */
  const withoutCodeNames = (text: string) => text.replaceAll(/`[^`]*`/g, '')

  it('finds none of it in any reader-visible string', () => {
    const offences: string[] = []
    for (const file of ALL_FILES) {
      for (const text of visibleText(readFileSync(file, 'utf8'))) {
        const prose = withoutCodeNames(text)
        for (const { pattern, instead } of RETIRED) {
          if (pattern.test(prose) && !exempt(text, 'retired vocabulary')) {
            offences.push(
              `${path.relative(SRC, file)}: ${JSON.stringify(text)}`
              + ` — matched ${pattern}, say ${instead}`,
            )
          }
        }
      }
    }
    expect(offences).toEqual([])
  })
})
