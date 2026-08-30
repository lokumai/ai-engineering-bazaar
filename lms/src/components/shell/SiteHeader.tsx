import Link from 'next/link'
import { Lkm01 } from '@/components/mascot/Lkm01'
import { REPO_URL } from '@/lib/site'
import { Breadcrumb } from './Breadcrumb'
import { ThemeToggle } from './ThemeToggle'

/**
 * Site header (spec §5.1). 56px, sticky, ground `--color-paper`, one hairline
 * bottom rule that is always there: the header never changes on scroll — no
 * shrink, no shadow, no blur backdrop.
 *
 * Costume budget (§4.3): the one motif permitted in this region is the mascot
 * cube. No title block, no stamps, no section marks, no zone coordinates.
 */
export function SiteHeader() {
  return (
    <header role="banner" className="sticky top-0 z-40 border-b border-line-strong bg-paper">
      <div className="mx-auto flex h-14 w-full max-w-[var(--width-shell)] items-center gap-4 px-6">
        {/*
          MASCOT SLOT — LKM-01 (§8) as the live progress meter: a 32px box
          holding the 28px mark §5.1 asks for, drawn on a 0 0 32 32 viewBox.
        */}
        <span data-slot="mascot" className="flex h-8 w-8 shrink-0 items-center justify-center">
          {/* Slice 1b wires this to lib/progress/; until then nobody has approved anything. */}
          <Lkm01 progress={0} />
        </span>

        <Link
          href="/"
          className="shrink-0 font-mono text-meta font-medium uppercase tracking-[0.06em] text-ink"
        >
          Lokum<span className="text-ink-muted"> / Bazaar</span>
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">
          <Breadcrumb />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/*
            SEARCH TRIGGER (§5.1) and LANGUAGE TOGGLE (§5.1, §7.6) land here.
            Both are held back deliberately: the command palette needs cmdk and
            the Turkish routes do not exist yet, and a control that opens
            nothing is the kind of claim §1 exists to forbid.
          */}
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
