/**
 * §12.12.7 — the two escapers, plus the one for a JSON data block.
 *
 * The `RECORD OF WORK` is built by string templating, not DOM serialisation:
 * `document.implementation.createHTMLDocument()` would make the browser's own
 * serialiser the escaper, which is safer in isolation but unavailable in the
 * node test environment, and §12.14.2 forbids adding jsdom. So these three
 * functions ARE the security boundary of a file the reader hands to an
 * employer — a file that is re-opened from `file://` forever, where no
 * server-side fix is available. They are pure, total, and exhaustively tested.
 *
 * Three contexts, three rules, because the encoding requirements genuinely
 * differ and using one escaper everywhere is how injections happen:
 *
 *  - element text  → `escText`, because only `&` and `<` can leave a text node
 *  - attribute     → `escAttr`, always into a DOUBLE-quoted value
 *  - `<script type="application/json">` → `escJsonForScript`, whose content is
 *    RAW TEXT: character references are not decoded there, so an HTML entity
 *    would arrive inside the parsed string as four literal characters.
 *
 * §12.12.7 also forbids ever interpolating reader input into an event-handler
 * attribute, a `style` attribute, a `<style>` block or the script body. Nothing
 * here makes that safe; the rule is to remove the sink, not to fence it.
 *
 * This module imports nothing. It is on the client side of the §12.2 import
 * line, and a single value pulled across it puts `node:fs` in the browser
 * bundle.
 */

/**
 * One pass over the string, one lookup per character. A chain of `.replace()`
 * calls would re-enter its own output — escaping `<` to `&lt;` and then
 * escaping that `&` — and the order that avoids it is a footgun nobody should
 * have to remember.
 */
function escapeWith(map: Readonly<Record<string, string>>, pattern: RegExp, s: string): string {
  return s.replace(pattern, (ch) => map[ch] ?? ch)
}

const TEXT_MAP: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;' }

/**
 * §12.12.7 — `&` and `<`, and deliberately nothing else. A `>` cannot start a
 * tag and neither quote is special in element text; escaping them would only
 * make a name print with entities in it if this function were ever misused as
 * a display filter. `<` is the one that matters: with it encoded the parser
 * never sees a tag, so `</script><img src=x onerror=…>` renders as the literal
 * text the reader typed.
 */
export function escText(s: string): string {
  return escapeWith(TEXT_MAP, /[&<]/g, s)
}

const ATTR_MAP: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  // `&#39;` rather than `&apos;`: the numeric reference is valid in every
  // HTML and XHTML serialisation, and `&apos;` is not in HTML 4.
  "'": '&#39;',
}

/**
 * §12.12.7 — all five, so the same escaper is correct whichever quote style a
 * template uses. Attribute values in the record document are always
 * double-quoted; an unquoted value can be left with a space alone and is the
 * vulnerable form.
 */
export function escAttr(s: string): string {
  return escapeWith(ATTR_MAP, /[&<>"']/g, s)
}

/**
 * §12.12.7 — `JSON.stringify`, then every `<` as `\u003c`.
 *
 * The HTML spec forbids `<!--`, `<script` and `</script` inside a script
 * element's text, and escaping `<` kills all three at once. `\x3c` is a
 * JavaScript escape and invalid JSON; `\u003c` is the JSON-valid equivalent,
 * so the document's own `JSON.parse(document.getElementById('hl-record').text)`
 * still round-trips the value exactly.
 *
 * `&` is left alone on purpose: a data block is raw text, character references
 * are not decoded in it, and `&amp;` there would parse back as four
 * characters instead of one.
 *
 * `JSON.stringify` returns `undefined` for `undefined`, a function or a symbol.
 * Writing that word into the block would make the document's own `JSON.parse`
 * throw and leave a blank page in front of an employer, so it becomes `null` —
 * the JSON spelling of "no value".
 */
export function escJsonForScript(value: unknown): string {
  const json = JSON.stringify(value)
  if (json === undefined) return 'null'
  return json.replace(/</g, '\\u003c')
}
