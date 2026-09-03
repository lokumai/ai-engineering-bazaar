import Link from 'next/link'
import { Lkm01 } from '@/components/mascot/Lkm01'
import { Keyboard } from '@/components/record/Keyboard'
import { REPO_URL } from '@/lib/site'
import { categoryLabels } from '@/lib/content/chrome'
import { Breadcrumb } from './Breadcrumb'
import { ThemeToggle } from './ThemeToggle'

/**
 * Site header (spec §5.1). 56px, sticky, ground `--color-paper`, one hairline
 * bottom rule that is always there: the header never changes on scroll — no
 * shrink, no shadow, no blur backdrop.
 *
 * Costume budget (§4.3): the one motif permitted in this region is the mascot
 * cube. No title block, no stamps, no section marks, no zone coordinates.
 *
 * **This stays a server component.** §12.2's channel A puts the mascot's face
 * states in CSS, driven by the pre-paint boot script, so the mark that reports
 * the reader's progress needs no hook and no hydration — and the two controls
 * that do need the browser (`ThemeToggle`, `Keyboard`) are leaves the header
 * holds as children. That is the arrangement the whole shell uses.
 */

/**
 * §12.3, §12.11 — the identity affordance: a title block with a signed field.
 *
 * It is deliberately NOT the drafter's stamp (§12.3.5). The stamp is the
 * reader's own mark, which is reader state and therefore channel B, and a
 * header rendered once for every reader cannot draw one without either
 * flickering or asserting an identity that may not exist. A drawing's
 * `CHECKED BY` field, empty, claims nothing and points at the sheet where the
 * name is actually set.
 */
function TitleBlockGlyph() {
  return (
    <svg
      width="16"
      height="16"
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

export function SiteHeader() {
  return (
    <header role="banner" className="sticky top-0 z-40 border-b border-line-strong bg-paper">
      <div className="mx-auto flex h-14 w-full max-w-[var(--width-shell)] items-center gap-4 px-6">
        {/*
          MASCOT SLOT — LKM-01 (§8) as the live progress meter: a 32px box
          holding the 28px mark §5.1 asks for, drawn on a 0 0 32 32 viewBox.
          Its six faces are painted from the `hl-cat-*` classes the record's
          boot script stamps on <html> before first paint (§12.2), so the mark
          is correct in frame one and its markup never varies by reader.
        */}
        <span data-slot="mascot" className="flex h-8 w-8 shrink-0 items-center justify-center">
          <Lkm01 />
        </span>

        <Link
          href="/"
          className="shrink-0 font-mono text-meta font-medium uppercase tracking-[0.06em] text-ink"
        >
          Lokum<span className="text-ink-muted"> / Bazaar</span>
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">
          <Breadcrumb categories={categoryLabels()} />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/*
            SEARCH TRIGGER (§5.1) and LANGUAGE TOGGLE (§5.1, §7.6) are still
            held back: §12.0 defers the command palette and the Turkish routes,
            and a control that opens nothing is the kind of claim §1 exists to
            forbid. Their two slots take the identity affordance and the
            shortcut sheet, both at §5.1's 28 × 28.
          */}
          <Link href="/profile/" className="hl-icon-btn" aria-label="Profile" title="Profile (g p)">
            <TitleBlockGlyph />
          </Link>
          <Keyboard />
          <ThemeToggle />
          <a href={REPO_URL} className="hl-icon-btn" aria-label="Repository" title="Repository">
            <svg
              width="16"
              height="16"
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
          </a>
        </div>
      </div>
    </header>
  )
}
