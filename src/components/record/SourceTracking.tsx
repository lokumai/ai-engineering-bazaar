'use client'

import { useEffect } from 'react'
import { recordSourceOpened } from '@/lib/record/events'
import { nowIso, update } from '@/lib/record/store'

/**
 * §12.8 — sources opened. Evidence, not currency.
 *
 * Every external link the reader opens from this sheet's prose is recorded, and
 * that is the whole feature: **no XP** (§12.5.1, amending §7.2's 5-per-link).
 * No fetched source supports opening a link as a learning act, and the
 * documented failure with adult users is precise — rewarding the proxy produced
 * XP farming and "countless lessons just for the sake of doing them". A
 * trivially gameable counter also costs credibility with exactly the audience
 * the drawing-set identity is buying.
 *
 * The wording anywhere this surfaces is **"opened"**, never "read" or
 * "consulted". An outbound click is the only fact available.
 *
 * It is a DOM-enhancement island, the `Affordances` shape: the prose is an HTML
 * string the build produced, so there is no React element to hang a handler on
 * and one delegated listener on the document is both cheaper and complete. It
 * renders nothing, so nothing here can flicker or mismatch. The `instances`
 * guard is not decoration — two listeners would record one click twice, and
 * although the reducer dedupes, "count clicks" is a thing §12.8 explicitly
 * refuses and a second listener is how that starts being possible.
 *
 * With JavaScript off, every link still opens. Nothing on the sheet depends on
 * this having run (§10.4).
 */

/** The contract with `render.ts`: `rehypeExternalLinks` writes this attribute. */
const EXTERNAL = 'a[data-hl-external]'

/** One recorder per document. Two would record one click twice. */
let instances = 0

export function SourceTracking({ slug }: { slug: string }) {
  useEffect(() => {
    instances += 1
    if (instances > 1) {
      return () => {
        instances -= 1
      }
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest(EXTERNAL)
      if (anchor === null) return
      // The `href` ATTRIBUTE, not the resolved `.href`: the record's list is
      // reprinted as the sheet's actual reading surface (§12.8), and the URL
      // parser normalises — it appends a trailing slash to a bare host — so the
      // resolved form would not match the URL the sheet cites and the printed
      // list would disagree with the sheet it came from. The reducer applies
      // its own `^https?://` guard, so a relative or `javascript:` href that
      // somehow carried the attribute records nothing.
      const href = anchor.getAttribute('href')
      if (href === null) return
      update((data) => recordSourceOpened(data, slug, href, nowIso()), {
      kind: 'recordSourceOpened',
      sheetSlug: slug,
      payload: { href },
    })
    }

    document.addEventListener('click', onClick)

    return () => {
      instances -= 1
      document.removeEventListener('click', onClick)
    }
  }, [slug])

  return null
}
