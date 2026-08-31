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
          {children}
        </div>
        <RegistrationMarks edge="bottom" className="mt-16" />
      </main>

      <SiteFooter sheet={sheet} revision={revision} />
    </>
  )
}
