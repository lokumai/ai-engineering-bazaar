import Link from 'next/link'
import { Keyboard } from '@/components/record/Keyboard'
import { REPO_URL } from '@/lib/site'
import { categoryLabels } from '@/lib/content/chrome'
import { MainNav } from './MainNav'
import { ThemeToggle } from './ThemeToggle'

/**
 * The bar and the band — M16 stage 1.
 *
 * Reference: `playground/01-theme-T4-ground-G3-powder.html`, `header.top` and
 * the `.band` under it. **The bar is a solid cobalt slab with its own on-bar
 * sub-palette and it never sits on the page ground.** That one fact is the
 * strongest thing the design language says, and it is what the retired header
 * got wrong: it was `bg-paper` with a hairline under it, 56px tall, carrying a
 * mono uppercase wordmark. Nothing of that shape survives here.
 *
 * ## What left the bar, and why none of it is lost
 *
 * **The mascot.** LKM-01 sat here as a live progress meter, its six faces
 * painted before first paint by the record's boot script. The mockup's bar has
 * no mascot: its mark is a 2×2 tile of glazed squares, and DESIGN.md is
 * explicit that "it is a tile, not a logo". The progress-meter job is specified
 * elsewhere by the mockups the author chose — `05` variant C's level rings and
 * `07` variant A's bars — and LKM-01 keeps the 404, the legend page, the
 * exported record's cover and the drafter's stamp (BRAINSTORM **D36**).
 *
 * **The breadcrumb.** It had a second 32px row of its own under the bar. The
 * mockup puts `nav.crumb` inside the reading column, above the display
 * heading, which is where it goes.
 *
 * ## What fills the mockup's control slots
 *
 * The mockup draws a search field and a `TR` button. **Neither feature exists**
 * — the command palette and the Turkish routes are both deferred — and a
 * control that opens nothing is exactly the claim §1 forbids, which is why the
 * retired header held those two slots back as well. So the mockup specifies the
 * slot and the product fills it with the controls it actually has: the profile
 * link, the shortcut sheet, the theme toggle and the repository. Each is a
 * `bz-bar-icon`, which is the primitive the mockup's own `.ib` buttons use. The
 * search field returns when there is something to search.
 *
 * **This stays a server component.** The two controls that need the browser —
 * `ThemeToggle` and `Keyboard` — are leaves it holds as children, which is the
 * arrangement the whole shell uses.
 */

/** The mockup's `.cubes`: three category hues and one square left as the ground. */
function BrandMark() {
  return (
    <span className="bz-brand-mark" aria-hidden="true">
      <i style={{ background: 'var(--color-category-5)' }} />
      <i style={{ background: 'var(--color-category-1)' }} />
      <i style={{ background: 'var(--color-category-4)' }} />
      <i style={{ background: 'var(--color-surface)' }} />
    </span>
  )
}

function ProfileGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="2.75" y="2.75" width="10.5" height="10.5" />
      <path d="M2.75 6.5h10.5" />
      <path d="M5 10h6" />
    </svg>
  )
}

function RepoGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="2" width="3" height="3" />
      <rect x="3" y="11" width="3" height="3" />
      <rect x="10" y="2" width="3" height="3" />
      <path d="M4.5 5v6" />
      <path d="M11.5 5v3.5h-7" />
    </svg>
  )
}

export function SiteHeader() {
  return (
    <>
      <header role="banner" className="bz-bar">
        <div className="bz-bar-inner">
          {/* The wordmark is its own element so a phone can keep the logo and
              drop the words without losing the link's name — see `shell.css`
              for the measurement that forced it. */}
          <Link href="/" className="bz-brand">
            <BrandMark />
            <span className="bz-brand-word">AI Engineering Bazaar</span>
          </Link>

          <MainNav categories={categoryLabels()} />

          <div className="bz-bar-spacer" />

          <Link
            href="/profile/"
            className="bz-bar-icon"
            aria-label="Your progress"
            title="Your progress (g p)"
          >
            <ProfileGlyph />
          </Link>
          <Keyboard />
          <ThemeToggle />
          <a href={REPO_URL} className="bz-bar-icon" aria-label="Repository" title="Repository">
            <RepoGlyph />
          </a>
        </div>
      </header>

      {/*
        The one ornament, once per page: an 18px lattice of three glaze stripes
        on cobalt finished with a gold rule, directly under the bar. It carries
        no meaning and states none — `aria-hidden`, and the sticky offset every
        other sticky element uses is the bar plus this band.
      */}
      <div className="bz-band" aria-hidden="true" />
    </>
  )
}
