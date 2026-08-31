import Link from 'next/link'
import { Lkm01Exploded } from '@/components/mascot/Lkm01Exploded'
import { PageShell } from '@/components/shell/PageShell'
import { NOT_FOUND_SHEET_LABEL, NOT_FOUND_TITLE } from '@/lib/route-labels'

export const metadata = { title: NOT_FOUND_TITLE }

/** §8.4 fixes the wording of the exploded drawing's caption on this page. */
const CAPTION = 'ASSEMBLY NOT FOUND · SHEET DOES NOT EXIST IN THIS DRAWING SET'

/**
 * The 404 (spec §8.4, §8.5).
 *
 * It exists as a page of its own because `PageShell` owns `<main>` and the
 * footer (§10.2, §5.2) and Next's built-in not-found page renders neither —
 * without this the exported `404.html` would ship with no main region and no
 * footer at all. It is also the one page that has to be told its own name: the
 * document is served at every address that is not a sheet, so its URL names
 * nothing (see `NOT_FOUND_SEGMENT`).
 *
 * §8.4 gives the cube taken apart exactly two moments and this is one of them
 * (§8.5): an assembly drawing of a sheet that was not found is the one place
 * in the system where the disassembled mark says something true. The caption
 * says the rest. No "oops", no search box that searches nothing (§11.30).
 */
export default function NotFound() {
  return (
    <PageShell sheet={NOT_FOUND_SHEET_LABEL}>
      <h1 className="hl-listing-title">{NOT_FOUND_TITLE}</h1>

      <p className="hl-lead">
        This address is not a sheet in the drawing set. The index lists every
        one that is.
      </p>

      <Lkm01Exploded caption={CAPTION} className="mb-10" />

      <hr className="hl-rule-struct" aria-hidden="true" />

      <p className="hl-mark">
        <Link className="hl-link" href="/">
          Index
        </Link>
      </p>
    </PageShell>
  )
}
