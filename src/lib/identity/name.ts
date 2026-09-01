/**
 * §12.3.4 — the reader's name: sanitising it, counting it, and deriving the
 * initials that sit beside the drafter's stamp.
 *
 * The audience for this file includes Turkish engineers, and the value it
 * handles is somebody's own name printed in their own title block. So the two
 * rules that govern every line here are:
 *
 *  1. **Reject nothing.** No character allowlist, no length rejection, no
 *     profanity filter. The name never leaves the device (§12.1.7), there is no
 *     second viewer, no shared namespace and nobody to impersonate, so a filter
 *     could only insult a reader whose real name the regex did not anticipate.
 *     Only the dangerous and the invisible are removed.
 *  2. **Count and slice by GRAPHEME, never by UTF-16 unit.** `'क्षमा'.length` is
 *     5 for two visible characters and `'👨‍👩‍👧'.length` is 8 for one; using
 *     `.length` or `str[0]` charges non-BMP and combining-mark scripts for
 *     width they do not occupy, and `str[0]` on an emoji returns half a
 *     surrogate pair. `Intl.Segmenter` is the only correct instrument.
 *
 * This module imports nothing — §12.2's import direction. Everything here is
 * pure, so the name field, the title block and the record document can all
 * hold it on the client side of that line.
 */

/** §12.3.4. The field's entry cap, NOT a truncation: see `sanitiseName`. */
export const MAX_NAME_GRAPHEMES = 80

/**
 * Removed outright: C0 controls and DEL, the C1 controls, the bidi overrides
 * and isolates (U+202A–U+202E, U+2066–U+2069), the zero-width characters
 * (U+200B) and the BOM.
 *
 * **U+200C ZWNJ and U+200D ZWJ are deliberately KEPT**, against the blanket
 * rule §12.3.4 first stated. ZWNJ is orthographic: in Persian, Urdu and
 * several Indic scripts it changes the spelling of a word, so stripping it
 * yields a different string that is not the reader's name. ZWJ is structural
 * inside an emoji sequence: strip it and one three-person family emoji becomes
 * three separate people.
 *
 * Neither is dangerous the way a bidi override is — neither can re-order the
 * text around it, which is the whole reason U+202A–U+202E and U+2066–U+2069 are
 * removed without apology. Stripping them would be the same class of insult
 * §12.3.3 refuses a profanity filter for: telling a reader that their real
 * name is not a name. U+200B and U+FEFF carry no orthographic meaning and can
 * pad a title-block row invisibly, so those still go.
 *
 * The bidi range is the one that is genuinely dangerous: an RLO in a name
 * re-orders every character after it, including the ones the site printed
 * itself, so a name can visually rewrite the sheet around it.
 *
 * Note the two gaps. U+0009–U+000D and U+0085 are controls but they are also
 * line and tab breaks, so they belong in the whitespace pass below rather than
 * here — deleting a newline would fuse a pasted two-line name into one word
 * and quietly change what the reader typed.
 */
const REMOVE =
  /[\u0000-\u0008\u000E-\u001F\u007F-\u0084\u0086-\u009F\u200B\u202A-\u202E\u2066-\u2069\uFEFF]/g

/**
 * Every whitespace run becomes one U+0020. `\s` already covers the tab, the
 * line breaks, U+00A0 (which §12.3.4 names explicitly), U+2028/U+2029 and
 * U+3000; U+0085 NEXT LINE is a line break that JavaScript's `\s` does not
 * include, so it is added by hand.
 *
 * Normalising to U+0020 rather than preserving the original space character is
 * what makes `split(' ')` an exact tokenisation downstream, and it stops a name
 * padded with exotic spaces from re-laying-out a title block row.
 */
const WHITESPACE = /[\s\u0085]+/g

/**
 * §12.3.4. Removes only the dangerous and the invisible, maps whitespace to a
 * single space, trims, and normalises to NFC.
 *
 * It does **not** truncate and does not reject on length. `MAX_NAME_GRAPHEMES`
 * caps what the field accepts while it is being typed; the stored value is
 * whatever the reader settled on, and §12.3.4 requires it to appear
 * unabbreviated on the sheet and in the exported record. Ellipsis is a layout
 * affordance, not a data transform.
 *
 * It also does not escape anything. HTML escaping happens once, at the document
 * boundary, in `escape.ts` — a sanitiser that also escapes produces a name with
 * `&amp;` in it the moment somebody prints it without a second escaper.
 *
 * NFC is applied last, so the returned value is guaranteed normalised, and it is
 * applied AFTER the removals: a zero-width joiner between a base letter and a
 * combining mark blocks composition, so removing it first lets `E` + U+0301
 * compose to `É` as it should.
 *
 * Idempotent, which the record store relies on when it re-validates a payload
 * read back out of storage.
 */
export function sanitiseName(raw: string): string {
  return raw.replace(REMOVE, '').replace(WHITESPACE, ' ').trim().normalize('NFC')
}

/**
 * Constructing an `Intl.Segmenter` is one of the more expensive things in the
 * Intl surface and the initials are re-derived on every render of the title
 * block, so instances are cached per locale.
 *
 * The `typeof` guard is checked BEFORE the cache on purpose: §12.3.4 plans for
 * the ~5% of browsers without `Intl.Segmenter`, and a cache consulted first
 * would make that branch untestable.
 */
const SEGMENTERS = new Map<string, Intl.Segmenter>()

function graphemeSegmenter(locale?: string): Intl.Segmenter | null {
  if (typeof Intl.Segmenter !== 'function') return null
  const key = locale ?? ''
  const cached = SEGMENTERS.get(key)
  if (cached !== undefined) return cached
  const made = new Intl.Segmenter(locale, { granularity: 'grapheme' })
  SEGMENTERS.set(key, made)
  return made
}

/**
 * §12.3.4 — graphemes, never `.length`.
 *
 * Degrades to code points when `Intl.Segmenter` is absent. That still
 * over-counts a joined emoji (5 instead of 1) but never over-counts by the
 * factor `.length` does, and it keeps the 80-grapheme entry cap roughly honest
 * on an old browser instead of failing closed on a name it cannot measure.
 */
export function countGraphemes(s: string): number {
  const segmenter = graphemeSegmenter()
  if (segmenter === null) return [...s].length
  const iterator = segmenter.segment(s)[Symbol.iterator]()
  let count = 0
  while (!iterator.next().done) count += 1
  return count
}

function graphemesOf(segmenter: Intl.Segmenter, s: string): string[] {
  return [...segmenter.segment(s)].map((part) => part.segment)
}

function firstGrapheme(segmenter: Intl.Segmenter, s: string): string | null {
  const first = segmenter.segment(s)[Symbol.iterator]().next()
  return first.done === true ? null : first.value.segment
}

/**
 * §12.3.4's list, exactly. Matched case-sensitively, because in Dutch, German,
 * Portuguese and Arabic transliteration the case IS the distinction: `van Gogh`
 * after a given name is a tussenvoegsel and skipped, while `Van Gogh` standing
 * alone is the surname the reader goes by and must keep its initial.
 */
const PARTICLES: ReadonlySet<string> = new Set(['da', 'de', 'van', 'bin', 'ibn', 'von', 'del'])

/**
 * A CJK name is not space-delimited, so the token rules below would read the
 * whole name as one token and take a single character where the convention is
 * the surname. Detected on the first grapheme's script rather than on a
 * hand-written code-point range.
 */
const CJK_LEADING =
  /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u

/**
 * A grapheme worth printing as an initial. An emoji, a punctuation mark or a
 * symbol is not one, and §12.3.4 forbids inventing a substitute for it.
 */
const MEANINGFUL = /^[\p{L}\p{N}]/u

/** §12.3.4 — three, and the CJK branch takes at most two. */
const MAX_INITIALS = 3

function assemble(graphemes: readonly string[]): string | null {
  const kept = graphemes.filter((g) => MEANINGFUL.test(g)).slice(0, MAX_INITIALS)
  return kept.length === 0 ? null : kept.join('')
}

/**
 * §12.3.4 — the initials, **as typed**.
 *
 * Not uppercased. `'ilker'.toUpperCase()` is a dotless `I` where a Turkish
 * reader expects `İ`, and mis-casing the first letter of somebody's own name in
 * their own title block is the single most visible i18n failure available here.
 * A caller that must show uppercase calls `displayInitials` and passes the
 * locale.
 *
 * Returns **null** rather than a placeholder when no meaningful initial exists:
 * an emoji- or symbol-leading name, an empty name, or a browser with no
 * `Intl.Segmenter`. The caller then falls back to the drafter's stamp alone —
 * never a `?`, never a silhouette, because both would assert something about
 * the reader that is not known.
 *
 * The input is sanitised here, so this is safe to call on a raw field value and
 * idempotent on an already-stored one. `locale` is forwarded to the segmenter;
 * grapheme boundaries are locale-independent under UAX #29, so it does not
 * change the result today, but taking it means no caller has to know that.
 */
export function initialsOf(name: string, locale?: string): string | null {
  const clean = sanitiseName(name)
  if (clean === '') return null

  const segmenter = graphemeSegmenter(locale)
  if (segmenter === null) return null

  const graphemes = graphemesOf(segmenter, clean)
  const lead = graphemes[0]
  if (lead === undefined) return null

  // CJK: the first one or two graphemes, and no space splitting. Two is the
  // surname in 田中太郎 and in 김민준, which is what a stamp should carry.
  if (CJK_LEADING.test(lead)) {
    const run: string[] = []
    for (const grapheme of graphemes) {
      if (grapheme === ' ' || run.length === 2) break
      run.push(grapheme)
    }
    return assemble(run)
  }

  // Sanitising has already reduced every whitespace run to one U+0020, so this
  // split is exact — which is the half of the problem `split(' ')` alone gets
  // wrong on a name separated by a no-break space.
  const tokens = clean.split(' ')
  const withoutParticles = tokens.filter((token) => !PARTICLES.has(token))
  // A name made of nothing but particles is still a name; fall back to what
  // the reader typed rather than returning nothing.
  const named = withoutParticles.length > 0 ? withoutParticles : tokens

  const chosen =
    named.length >= 4 ? [named[0], named[named.length - 1]] : named

  const initials: string[] = []
  for (const token of chosen) {
    const grapheme = firstGrapheme(segmenter, token)
    if (grapheme !== null) initials.push(grapheme)
  }
  return assemble(initials)
}

/**
 * §12.3.4 — the uppercase form, for the places the design demands capitals.
 *
 * **The caller MUST also set `lang` on the element that renders this.** CSS
 * `text-transform: uppercase` does its own locale-sensitive casing off the
 * element's language, so a `İ` produced here inside an element that inherits
 * `lang="en"` can be re-cased by the stylesheet into a dotless `I` and undo the
 * whole point of the function.
 *
 * Casing is not length-preserving — German `ß` uppercases to `SS` and Greek `ς`
 * to `Σ` — so the 3-grapheme cap is re-applied afterwards, and the result is
 * re-normalised to NFC because a locale mapping can leave a decomposed
 * sequence behind.
 */
export function displayInitials(name: string, locale: string): string | null {
  const initials = initialsOf(name, locale)
  if (initials === null) return null

  const upper = initials.toLocaleUpperCase(locale).normalize('NFC')
  if (countGraphemes(upper) <= MAX_INITIALS) return upper

  const segmenter = graphemeSegmenter(locale)
  if (segmenter === null) return upper
  return graphemesOf(segmenter, upper).slice(0, MAX_INITIALS).join('')
}
