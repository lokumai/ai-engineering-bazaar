/**
 * The sheet frame (spec §4.2). Four L-shaped corner registration marks at the
 * corners of the 1152px content box, offset 12px outside it — rendered once
 * per page at the top and bottom of the main region, in the document flow.
 *
 * Pages are deliberately NOT boxed in a full rectangle: that is a gimmick and
 * it breaks on scroll. Hidden below 768px (§4.7), aria-hidden always.
 *
 * The container carries 12px of padding where the page carries 24px, so the
 * corners land exactly 12px outside the content box at every width.
 */
export function RegistrationMarks({
  edge,
  className = '',
}: {
  edge: 'top' | 'bottom'
  className?: string
}) {
  const vertical = edge === 'top' ? 'top-0 border-t' : 'bottom-0 border-b'
  const pull = edge === 'top' ? '-mb-3' : '-mt-3'

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none mx-auto hidden w-full max-w-[var(--width-shell)] px-3 md:block ${pull} ${className}`}
    >
      <div className="relative h-6">
        <span className={`absolute left-0 h-6 w-6 border-l border-line-strong ${vertical}`} />
        <span className={`absolute right-0 h-6 w-6 border-r border-line-strong ${vertical}`} />
      </div>
    </div>
  )
}
