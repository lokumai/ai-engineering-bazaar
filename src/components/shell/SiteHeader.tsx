import Link from 'next/link'
import { Keyboard } from '@/components/record/Keyboard'
import GITHUB from '@/lib/github-stars.json'
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

/**
 * GitHub's own mark, which is what the author asked for in place of the drawn
 * repository glyph: *"instead of repository, put the github black icon and a
 * yellow star beside it with the number of stars."*
 *
 * `fill="currentColor"` and not black — the bar has its own sub-palette and
 * black measures 1.58:1 on it. `bazaar.css` carries the measurement.
 *
 * The path is GitHub's Octicon `mark-github`, on their own 16-unit viewBox,
 * which is the same box every other glyph in this codebase uses (**D53**). It
 * is a FILLED shape rather than a hairline, which the idiom already allows for
 * a mark that means something rather than decorates (`01:172-178`).
 */
function GitHubMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
        0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01
        1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
        0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68
        0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0
        3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01
        8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

/** The star the count sits beside. Filled, because it is a mark and not a rule. */
function StarGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="bz-bar-star"
    >
      <path d="M8 1.5l1.96 3.97 4.38.64-3.17 3.09.75 4.36L8 11.5l-3.92 2.06.75-4.36L1.66 6.11l4.38-.64L8 1.5Z" />
    </svg>
  )
}

export function SiteHeader() {
  const { stars } = GITHUB

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

          {/* NO PROGRESS ICON. `Your progress` is a destination in the nav
              three inches to the left, and this was the same link twice — the
              author named it, and rule 16 is the reason it reads as noise
              rather than as convenience. `g p` still goes there. */}

          {/* `Keyboard` is still mounted and every chord still fires; what
              M18 removed is the `?` BUTTON that opened the sheet listing them.
              §12.16 made the chord discoverable by printing it on the control,
              so deleting the control deletes the discovery — which is why the
              table moved to `/legend/`, the page whose whole job is what the
              marks on this site mean. `?` still opens the sheet. */}
          <Keyboard />
          <ThemeToggle />

          <a
            href={REPO_URL}
            className="bz-bar-repo"
            aria-label={
              stars === null ? 'Repository on GitHub' : `Repository on GitHub, ${stars} stars`
            }
          >
            <GitHubMark />
            <StarGlyph />
            {/* No figure at all where none has been measured — never a zero
                somebody invented (§11.25). `scripts/github-stars.mjs` writes
                the committed answer and the build never reaches the network. */}
            {stars !== null && <span className="bz-bar-stars">{stars}</span>}
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
