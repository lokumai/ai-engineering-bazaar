import Link from 'next/link'

/**
 * M19 — the language of the module being read, in the corner M21 left free.
 *
 * The author placed it: *"Language of each module should be selectable from the
 * top-right corner of the box which contains the whole center-aligned module
 * content."* M21 recorded the slot and deliberately built nothing in it,
 * because 33 `_tr.md` files existed and the app rendered none of them — a
 * control that switches nothing is the claim §1 forbids, and it is the same
 * reason the mockup's own `TR` button and search field were left out of the bar.
 *
 * ## Two LINKS, and never a toggle
 *
 * The language is an ADDRESS (see the `/tr/` route's own docblock), so this is
 * navigation: two links, the current one marked `aria-current="page"`, exactly
 * as the catalog's level chips are since **D62**. The pay-off is the one a
 * button could never buy — **it works with the bundle blocked**, and a reader
 * can send somebody the Turkish link.
 *
 * A `<select>` or a toggle would have to be an island, would do nothing before
 * hydration, and would make the language a preference rather than a place.
 *
 * ## What it does NOT do
 *
 * It never appears on a module with no usable translation. There is no Turkish
 * address for those — `generateStaticParams` does not emit one — so a switch
 * would offer a 404. The page renders nothing here instead of a disabled
 * control: §11.30's refusal, and the same call `FactsStrip` makes about a draft
 * that has no length to state.
 *
 * The two labels are each written in their OWN language and marked with it, so
 * a screen reader says `Türkçe` in a Turkish voice rather than reading it as
 * English. That is the one place on this page where a `lang` attribute is about
 * a single word.
 */
export const LANGUAGE_PICKER_LABEL = 'Language of this module'

export function LanguagePicker({
  slug,
  current,
}: {
  /** `fundamentals/llms` — the module, which both addresses are built from. */
  slug: string
  current: 'en' | 'tr'
}) {
  return (
    <nav className="bz-langs" aria-label={LANGUAGE_PICKER_LABEL}>
      <Link
        className="bz-lang"
        href={`/courses/${slug}/`}
        hrefLang="en"
        lang="en"
        aria-current={current === 'en' ? 'page' : undefined}
      >
        English
      </Link>
      <Link
        className="bz-lang"
        href={`/tr/courses/${slug}/`}
        hrefLang="tr"
        lang="tr"
        aria-current={current === 'tr' ? 'page' : undefined}
      >
        Türkçe
      </Link>
    </nav>
  )
}
