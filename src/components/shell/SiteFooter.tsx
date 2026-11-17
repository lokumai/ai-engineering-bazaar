import Link from 'next/link'
import { ABOUT_ROUTE } from '@/lib/route-labels'
import {
  AFFILIATION,
  FEEDBACK_URL,
  LEGAL_ROUTE,
  LICENCE_LABEL,
  LICENCE_URL,
  PRIVACY_ROUTE,
  REPO_URL,
  SITE_OWNER,
} from '@/lib/site'

/**
 * Site footer (spec §5.2), in three blocks under one hairline: who owns the site, the links about
 * the site, and the links about the project, with the mark credit on a rule of its own beneath.
 *
 * M111, D134 — there was a row above these, 40px: the page's sheet label, the file's revision and
 * a readout of the reader's record. It was removed end to end, not hidden, so the footer takes no
 * props and holds no reader state: it is the same server-rendered markup on every route.
 *
 * The footer is a grid and not the single wrapping line of links it used to be (round 6, footer B,
 * chosen 2026-11-17 from three). Two rejected shapes, kept in `playground/2026-11-round-6/`: three
 * quiet left-aligned lines, and a centred stack. The grid won because it gives the owner block, which
 * law 5651 asks the site to show, a heading and a place of its own instead of a line under the links.
 *
 * - **The owner** is an `<address>`: contact information for the page's owner, `not-italic` because
 *   the element's default is an emphasis nothing here means. The registered name is printed whole,
 *   since a shortened name is not the registered one, and the details live on `/legend/`.
 * - **Site** holds About, Feedback, Legend and keys, Privacy and Legal. Privacy and Legal were two
 *   anchors beside the email; they are links like any other now. Feedback is a plain link to a form
 *   outside the site (`FEEDBACK_URL`); nothing is embedded.
 * - **Project** holds the repository, the licence and the chain of organisations in `AFFILIATION`
 *   order. The order is the claim (`site.ts`): the relationship between the three is stated, with
 *   its labels, once, in `/legend/`'s colophon.
 *
 * On a phone the two link columns stay side by side and the owner block goes below them (`order-3`),
 * so a reader meets the links first and the legal block last. Links are `inline-block py-[3px]` so each
 * target is 24px tall or more (WCAG 2.2 SC 2.5.8) without a taller font.
 */
export function SiteFooter() {
  return (
    <footer role="contentinfo" className="border-t border-line-strong bg-surface" lang="en">
      <div className="grid w-full grid-cols-2 gap-x-10 gap-y-5 px-[22px] py-4 text-meta leading-[1.5] text-on-surface-muted sm:grid-cols-[1.3fr_1fr_1fr]">
        <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
          <p className="m-0 text-meta font-semibold text-on-surface-title">Site owner</p>
          <address className="not-italic">
            <p className="m-0 text-on-surface">{SITE_OWNER.tradeName}</p>
            <p className="m-0">{SITE_OWNER.address}</p>
            <p className="m-0">
              <a className="bz-link inline-block py-[3px]" href={`mailto:${SITE_OWNER.email}`}>
                {SITE_OWNER.email}
              </a>
            </p>
          </address>
        </div>

        <nav aria-label="Site">
          <p className="m-0 text-meta font-semibold text-on-surface-title">Site</p>
          <ul className="m-0 list-none p-0">
            <li>
              <Link className="bz-link inline-block py-[3px]" href={ABOUT_ROUTE}>
                About
              </Link>
            </li>
            <li>
              <a className="bz-link inline-block py-[3px]" href={FEEDBACK_URL}>
                Feedback
              </a>
            </li>
            <li>
              {/* M18 — the keyboard map lives on `/legend/`, and the footer is what makes the page
                  the same page reached the same way from every route (WCAG 2.2 SC 3.2.6). */}
              <Link className="bz-link inline-block py-[3px]" href="/legend/">
                Legend and keys
              </Link>
            </li>
            <li>
              <Link className="bz-link inline-block py-[3px]" href={PRIVACY_ROUTE}>
                Privacy
              </Link>
            </li>
            <li>
              <Link className="bz-link inline-block py-[3px]" href={LEGAL_ROUTE}>
                Legal
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Project">
          <p className="m-0 text-meta font-semibold text-on-surface-title">Project</p>
          <ul className="m-0 list-none p-0">
            <li>
              <a className="bz-link inline-block py-[3px]" href={REPO_URL}>
                Repository
              </a>
            </li>
            <li>
              <a className="bz-link inline-block py-[3px]" href={LICENCE_URL}>
                {LICENCE_LABEL}
              </a>
            </li>
            {AFFILIATION.map((affiliate) => (
              <li key={affiliate.name}>
                <a className="bz-link inline-block py-[3px]" href={affiliate.url}>
                  {affiliate.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <p className="order-4 col-span-2 m-0 border-t border-line pt-2 sm:col-span-3">Marked by LKM-01</p>
      </div>
    </footer>
  )
}
