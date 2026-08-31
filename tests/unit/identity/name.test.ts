import { describe, expect, it } from 'vitest'
import {
  MAX_NAME_GRAPHEMES,
  countGraphemes,
  displayInitials,
  initialsOf,
  sanitiseName,
} from '@/lib/identity/name'

/**
 * §12.3.4. Every non-ASCII string here is written with explicit escapes: this
 * file's own normalisation form must not be able to decide whether a test
 * passes. NFD_ELODIE is E + U+0301 COMBINING ACUTE; İ is Turkish dotted capital I.
 */
const NFD_ELODIE = 'E\u0301lodie'
const NFC_E_ACUTE = 'É'
/** क + virama + ष + म + ā — five code units, and a first grapheme of three. */
const KSHAMA = 'क्षमा'
const KSHA = 'क्ष'
/** 👨‍👩‍👧 — three emoji joined by two ZWJ. One grapheme, eight code units. */
const ZWJ_FAMILY = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'
const GRINNING = '\u{1F600}'

/**
 * Runs `run` with `Intl.Segmenter` absent, which is the ~5% of browsers §12.3.4
 * plans for. Deleting the property is possible because it is configurable, and
 * it is the only way to reach the degraded branch without adding a dependency.
 */
function withoutSegmenter<T>(run: () => T): T {
  const holder = Intl as unknown as { Segmenter?: unknown }
  const saved = holder.Segmenter
  delete holder.Segmenter
  try {
    return run()
  } finally {
    holder.Segmenter = saved
  }
}

describe('MAX_NAME_GRAPHEMES', () => {
  it('is 80, per §12.3.4', () => {
    expect(MAX_NAME_GRAPHEMES).toBe(80)
  })
})

describe('countGraphemes', () => {
  it('counts what a reader sees, not UTF-16 units', () => {
    expect(countGraphemes('')).toBe(0)
    expect(countGraphemes('Ada')).toBe(3)
    expect(countGraphemes('İ')).toBe(1)
  })

  it('does not penalise a combining mark', () => {
    expect('E\u0301'.length).toBe(2)
    expect(countGraphemes('E\u0301')).toBe(1)
  })

  it('does not penalise a non-BMP or joined emoji', () => {
    expect(ZWJ_FAMILY.length).toBe(8)
    expect(countGraphemes(ZWJ_FAMILY)).toBe(1)
    expect(countGraphemes(GRINNING)).toBe(1)
  })

  it('does not penalise a Devanagari conjunct cluster', () => {
    expect(KSHAMA.length).toBe(5)
    expect([...KSHAMA]).toHaveLength(5)
    expect(countGraphemes(KSHAMA)).toBe(2)
  })

  it('degrades to code points when Intl.Segmenter is missing, never throws', () => {
    expect(withoutSegmenter(() => countGraphemes(ZWJ_FAMILY))).toBe(5)
    expect(withoutSegmenter(() => countGraphemes('Ada'))).toBe(3)
    // Still better than `.length`, which would say 8.
    expect(withoutSegmenter(() => countGraphemes(ZWJ_FAMILY))).toBeLessThan(ZWJ_FAMILY.length)
  })
})

describe('sanitiseName — removes the dangerous and the invisible (§12.3.4)', () => {
  it('removes C0 controls', () => {
    expect(sanitiseName('A\u0000B\u0001C\u001FD')).toBe('ABCD')
  })

  it('removes DEL and the C1 controls', () => {
    expect(sanitiseName('A\u007FB\u0080C\u009FD')).toBe('ABCD')
  })

  it('removes every bidi override and isolate', () => {
    for (const cp of [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069]) {
      const ch = String.fromCodePoint(cp)
      expect(sanitiseName(`Ada${ch}Lovelace`)).toBe('AdaLovelace')
    }
  })

  it('removes the invisible padding characters, and only those', () => {
    // U+200B and U+FEFF go: they carry no orthographic meaning and can pad a
    // title-block row invisibly. U+200C and U+200D stay — see the two tests at
    // the end of this block for why.
    expect(sanitiseName('\uFEFFA\u200Bda')).toBe('Ada')
    expect(sanitiseName('A\u200Cd\u200Da')).toBe('A\u200Cd\u200Da')
  })

  it('maps a newline to a space rather than fusing two names together', () => {
    expect(sanitiseName('Ada\nLovelace')).toBe('Ada Lovelace')
    expect(sanitiseName('Ada\r\nLovelace')).toBe('Ada Lovelace')
    expect(sanitiseName('Ada\tLovelace')).toBe('Ada Lovelace')
    expect(sanitiseName('Ada\u2028Lovelace')).toBe('Ada Lovelace')
    expect(sanitiseName('Ada\u0085Lovelace')).toBe('Ada Lovelace')
  })

  it('maps U+00A0 to a space', () => {
    expect(sanitiseName('Ada\u00A0Lovelace')).toBe('Ada Lovelace')
  })

  it('trims and collapses internal whitespace runs', () => {
    expect(sanitiseName('   Ada    King   Lovelace  ')).toBe('Ada King Lovelace')
  })

  it('normalises to NFC', () => {
    const out = sanitiseName(NFD_ELODIE)
    expect(out).toBe(`${NFC_E_ACUTE}lodie`)
    expect(out).toHaveLength(6)
    expect(out.normalize('NFC')).toBe(out)
  })

  it('keeps a zero-width non-joiner, so NFC does not compose across it', () => {
    // ZWNJ blocks NFC composition, and it is kept, so E + ZWNJ + acute stays
    // three code points. That is the point: the reader typed a ZWNJ.
    const out = sanitiseName('E\u200C\u0301lodie')
    expect(out).toBe('E\u200C\u0301lodie')
    expect(out).toContain('\u200C')
  })

  it('rejects nothing else — no allowlist, no profanity filter, no escaping', () => {
    // Escaping is escape.ts's job at the document boundary, not the field's.
    expect(sanitiseName('<script>alert(1)</script>')).toBe('<script>alert(1)</script>')
    expect(sanitiseName('Ada & "Bob" <o>')).toBe('Ada & "Bob" <o>')
    expect(sanitiseName('İpek')).toBe('İpek')
    expect(sanitiseName(KSHAMA)).toBe(KSHAMA)
    expect(sanitiseName(GRINNING)).toBe(GRINNING)
    expect(sanitiseName('Ada; DROP TABLE readers;--')).toBe('Ada; DROP TABLE readers;--')
  })

  it('never truncates, and never rejects on length', () => {
    const long = 'a'.repeat(MAX_NAME_GRAPHEMES + 1)
    expect(countGraphemes(sanitiseName(long))).toBe(MAX_NAME_GRAPHEMES + 1)
    expect(countGraphemes(sanitiseName('b'.repeat(500)))).toBe(500)
  })

  it('is idempotent', () => {
    for (const raw of ['  Ada\u00A0 Lovelace ', NFD_ELODIE, '\u202EAda', KSHAMA, '']) {
      const once = sanitiseName(raw)
      expect(sanitiseName(once)).toBe(once)
    }
  })

  it('returns the empty string when the name was entirely invisible', () => {
    expect(sanitiseName('\u200B\u202E\uFEFF\u0000')).toBe('')
    expect(sanitiseName('   ')).toBe('')
    expect(sanitiseName('')).toBe('')
  })

  /**
   * U+200C and U+200D survive sanitising, and these two tests are why the rule
   * was narrowed. Both characters carry meaning a reader typed on purpose, and
   * neither can re-order the text around it the way a bidi override can — which
   * is the property that earns U+202A–U+202E their unconditional removal.
   */
  it('keeps an emoji ZWJ sequence whole', () => {
    const out = sanitiseName(ZWJ_FAMILY)
    expect(out).toBe(ZWJ_FAMILY)
    // One family, not three people.
    expect(countGraphemes(out)).toBe(1)
  })

  it('keeps a Persian ZWNJ, because removing it respells the word', () => {
    // می‌شود — the ZWNJ keeps "mi" from joining "shavad". Strip it and the
    // result is میشود, a different string and not the reader's name.
    const out = sanitiseName('می\u200Cشود')
    expect(out).toBe('می\u200Cشود')
    expect(out).not.toBe('میشود')
  })
})

describe('initialsOf — the three ways this is got wrong (§12.3.4)', () => {
  it('str[0] on an emoji-leading name returns a lone surrogate; this does not', () => {
    expect(`${GRINNING}Ada`[0]).toBe('\uD83D')
    expect(`${GRINNING}Ada`[0].codePointAt(0)).toBe(0xd83d)
    // No initial can be taken from an emoji, so the caller falls back to the
    // stamp alone — never a `?`, never a silhouette.
    expect(initialsOf(`${GRINNING}Ada`)).toBeNull()
    // A real name after the emoji is still a real name.
    expect(initialsOf(`${GRINNING} Ada Lovelace`)).toBe('AL')
  })

  it('str[0] on NFD "Élodie" loses the accent; this keeps it', () => {
    expect(NFD_ELODIE[0]).toBe('E')
    expect([...NFD_ELODIE][0]).toBe('E')
    const initial = initialsOf(NFD_ELODIE)
    expect(initial).toBe(NFC_E_ACUTE)
    expect(initial).toHaveLength(1)
    expect(initial?.codePointAt(0)).toBe(0x00c9)
  })

  it('a Devanagari cluster spans several code points; the initial is the cluster', () => {
    expect(KSHAMA[0]).toBe('क')
    expect([...KSHAMA][0]).toBe('क')
    const initial = initialsOf(KSHAMA)
    expect(initial).toBe(KSHA)
    expect(initial).toHaveLength(3)
    expect(countGraphemes(initial ?? '')).toBe(1)
  })

  it('split(" ") alone misses a token; this does not', () => {
    const nbspName = 'Ada\u00A0Lovelace'
    expect(nbspName.split(' ')).toHaveLength(1)
    expect(initialsOf(nbspName)).toBe('AL')
    expect('Ada  Lovelace'.split(' ')[1]).toBe('')
    expect(initialsOf('Ada  Lovelace')).toBe('AL')
  })
})

describe('initialsOf — the token rules (§12.3.4)', () => {
  it('1 token takes 1 grapheme', () => {
    expect(initialsOf('Ada')).toBe('A')
  })

  it('2 and 3 tokens take the first grapheme of each', () => {
    expect(initialsOf('Ada Lovelace')).toBe('AL')
    expect(initialsOf('Ada King Lovelace')).toBe('AKL')
  })

  it('4 or more tokens take the first and the last', () => {
    expect(initialsOf('Ada Augusta King Lovelace')).toBe('AL')
    expect(initialsOf('Ahmet Mehmet Ali Veli Can')).toBe('AC')
  })

  it('skips the lowercase particles', () => {
    expect(initialsOf('Ludwig van Beethoven')).toBe('LB')
    expect(initialsOf('Vincent van Gogh')).toBe('VG')
    expect(initialsOf('José da Silva')).toBe('JS')
    expect(initialsOf('Muhammad ibn Musa al Khwarizmi')).toBe('MK')
    expect(initialsOf('A da de van bin ibn von del B')).toBe('AB')
  })

  it('keeps a capitalised particle, because the case is the distinction', () => {
    // Dutch writes the tussenvoegsel lower-case when a given name precedes it
    // and capitalised when it does not, so the case carries meaning.
    expect(initialsOf('Van Gogh')).toBe('VG')
    expect(initialsOf('Von Neumann')).toBe('VN')
    expect(initialsOf('De Silva')).toBe('DS')
  })

  it('falls back to the raw tokens when a name is nothing but particles', () => {
    expect(initialsOf('de van')).toBe('dv')
  })

  it('never returns more than three graphemes', () => {
    const names = [
      'Ada King Lovelace',
      'Ada Augusta King Lovelace',
      'Ahmet Mehmet Ali Veli Can Deniz',
      KSHAMA,
      '田中太郎',
    ]
    for (const name of names) {
      expect(countGraphemes(initialsOf(name) ?? '')).toBeLessThanOrEqual(3)
    }
  })

  it('skips a token whose first grapheme is not a letter or a digit', () => {
    expect(initialsOf(`Ada ${GRINNING} Lovelace`)).toBe('AL')
    expect(initialsOf('Ada #1')).toBe('A')
  })

  it('sanitises its own input, so it is safe on a raw field value', () => {
    expect(initialsOf('  \u202EAda\u00A0 Lovelace\u200B ')).toBe('AL')
    expect(initialsOf(sanitiseName('  Ada Lovelace '))).toBe('AL')
  })
})

describe('initialsOf — CJK takes the first one or two graphemes (§12.3.4)', () => {
  it('never splits on a space for a CJK name', () => {
    expect(initialsOf('田中太郎')).toBe('田中') // 田中太郎 → 田中
    expect(initialsOf('田中 太郎')).toBe('田中') // 田中 太郎 → 田中
  })

  it('handles Han, Hangul and Kana', () => {
    expect(initialsOf('李明')).toBe('李明') // 李明
    expect(initialsOf('김민준')).toBe('김민') // 김민준 → 김민
    expect(initialsOf('さくら')).toBe('さく') // さくら → さく
  })

  it('takes one grapheme when that is all there is', () => {
    expect(initialsOf('李')).toBe('李')
  })
})

describe('initialsOf — when there is no meaningful initial', () => {
  it('returns null rather than a placeholder', () => {
    expect(initialsOf('')).toBeNull()
    expect(initialsOf('   ')).toBeNull()
    expect(initialsOf('\u200B\u202E')).toBeNull()
    expect(initialsOf(GRINNING)).toBeNull()
    expect(initialsOf(`${GRINNING}\u{1F389}`)).toBeNull()
    expect(initialsOf('###')).toBeNull()
    expect(initialsOf('- -')).toBeNull()
  })

  it('returns null when Intl.Segmenter is missing, so the stamp stands alone', () => {
    expect(withoutSegmenter(() => initialsOf('Ada Lovelace'))).toBeNull()
  })
})

describe('initialsOf does not uppercase (§12.3.4)', () => {
  it('takes the grapheme exactly as typed', () => {
    expect(initialsOf('ilker')).toBe('i')
    expect(initialsOf('ada lovelace')).toBe('al')
    expect(initialsOf('İpek')).toBe('İ')
  })

  it('is unaffected by the locale, because grapheme boundaries are not locale-specific', () => {
    expect(initialsOf('ilker', 'tr')).toBe('i')
    expect(initialsOf('ilker', 'en')).toBe('i')
    expect(initialsOf(KSHAMA, 'hi')).toBe(KSHA)
  })
})

describe('displayInitials — the Turkish dotted I (§12.3.4)', () => {
  it('gives İ for "ilker" in Turkish, which toUpperCase() gets wrong', () => {
    expect(displayInitials('ilker', 'tr')).toBe('İ')
    // The failure this exists to prevent: a dotless I in a Turkish reader's own
    // title block. `'ilker'.toUpperCase()` is locale-independent and wrong here.
    expect('ilker'.toUpperCase()[0]).toBe('I')
    expect(displayInitials('ilker', 'tr')).not.toBe('ilker'.toUpperCase()[0])
  })

  it('round-trips the three Turkish cases', () => {
    expect(displayInitials('ilker', 'tr')).toBe('İ')
    expect(displayInitials('İpek', 'tr')).toBe('İ')
    expect(displayInitials('Irmak', 'tr')).toBe('I')
    expect(displayInitials('ırmak', 'tr')).toBe('I') // ırmak → dotless I
  })

  it('gives the dotless I for the same name in English, which is why lang matters', () => {
    // The caller MUST set `lang` on the element as well, or CSS
    // `text-transform: uppercase` will disagree with this value.
    expect(displayInitials('ilker', 'en')).toBe('I')
    expect(displayInitials('İpek', 'en')).toBe('İ')
  })

  it('uppercases every initial, not just the first', () => {
    expect(displayInitials('ada king lovelace', 'en')).toBe('AKL')
    expect(displayInitials('ismet inonu', 'tr')).toBe('İİ')
  })

  it('stays NFC after casing', () => {
    const out = displayInitials(NFD_ELODIE, 'fr')
    expect(out).toBe(NFC_E_ACUTE)
    expect(out?.normalize('NFC')).toBe(out)
  })

  it('accepts that casing is not length-preserving', () => {
    // German ß uppercases to two characters, Greek final sigma changes shape.
    expect(displayInitials('ßoop', 'de')).toBe('SS')
    expect(displayInitials('ςigma', 'el')).toBe('Σ')
    expect(countGraphemes(displayInitials('ßoop', 'de') ?? '')).toBeLessThanOrEqual(3)
  })

  it('leaves a script with no case distinction alone', () => {
    expect(displayInitials(KSHAMA, 'hi')).toBe(KSHA)
    expect(displayInitials('田中太郎', 'ja')).toBe('田中')
  })

  it('passes null through, so the caller still falls back to the stamp', () => {
    expect(displayInitials(GRINNING, 'tr')).toBeNull()
    expect(displayInitials('', 'tr')).toBeNull()
    expect(withoutSegmenter(() => displayInitials('Ada', 'tr'))).toBeNull()
  })
})
