import { ClaimReceipt } from '@/components/record/ClaimReceipt'
import { Readout } from '@/components/record/Readout'
import { curriculumFacts } from '@/lib/content/facts'
import { RegistrationMarks } from './RegistrationMarks'
import { type Revision, SiteFooter } from './SiteFooter'

/**
 * The main region and the footer, §4.1's shell around whatever a page draws.
 *
 * It lives here rather than in the root layout for one reason: §5.2's footer
 * has to print `SHEET 13 OF 32` and `REV <hash> · <date>`, and both are facts
 * about the *content* of the page. A layout has no page data in scope, so with
 * the footer rendered up there its first row was structurally unreachable and
 * shipped empty on all 32 module sheets — a 40px void above the licence line.
 * A shared shell is what lets a page hand the footer its own numbers.
 *
 * Both parts are here together on purpose. A page that forgets the shell loses
 * its `<main>` as well as its footer, which `accessibility.spec.ts` fails
 * loudly on (§10.2); losing only the footer would be silent.
 *
 * **The compact readout is measured here, not passed in** (§5.2, §7.1). This is
 * a server component, so it may read the corpus: `curriculumFacts()` reaches
 * `node:fs`, which is exactly why no client leaf may import it (§12.2), and the
 * counts cross into `Readout` as serialised props. Every page gets the readout
 * without knowing it exists, which is what §7.1 asks for — the compact form
 * lives in the footer on every page — and it is why none of the four routes
 * that render this shell had to change.
 */
export function PageShell({
  children,
  sheet,
  revision,
}: {
  children: React.ReactNode
  /** §5.2 — `SHEET 13 OF 32`. Omitted, the footer names the route instead. */
  sheet?: string | null
  /** §5.2, §11.26 — this file's last-touching commit, never repo HEAD. */
  revision?: Revision | null
}) {
  const facts = curriculumFacts()

  return (
    <>
      {/* §10.2 — the skip link's target. `tabIndex={-1}` so the fragment can
          actually take focus: without it Safari/VoiceOver leaves the VO cursor
          in the header after the skip. `main:focus` is un-ringed in
          globals.css. */}
      <main id="main" tabIndex={-1} className="flex-1 pt-10 pb-16">
        <RegistrationMarks edge="top" />
        {/* §4.7 — 24px of side padding, dropping to 20px below 768px. */}
        <div className="mx-auto w-full max-w-[var(--width-shell)] px-5 md:px-6">
          {/* §17.6 — the claim receipt, in the column and above the page's own
              content, because it is news about the reader's record and not part
              of whatever page they happened to land on. Renders nothing in the
              prerender and nothing on a document where no claim was news. */}
          <ClaimReceipt />
          {children}
        </div>
        <RegistrationMarks edge="bottom" className="mt-16" />
      </main>

      <SiteFooter
        sheet={sheet}
        revision={revision}
        readout={<Readout variant="compact" facts={facts} />}
      />
    </>
  )
}
