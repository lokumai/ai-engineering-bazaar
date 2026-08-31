/**
 * §5.5 — `frontmatter.objectives`, directly under the title block or strip.
 *
 * **MEASURED:** present on the 15 drawn modules only, 2–3 items each. Never
 * rendered when the array is empty — no empty box, no "coming soon" (§11.30).
 */
export function Objectives({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null

  return (
    <section className="hl-objectives" aria-labelledby="hl-objectives-head">
      <h2 id="hl-objectives-head" className="hl-objectives-head hl-mark">
        What you will be able to do
      </h2>
      <ol role="list" className="hl-objectives-list">
        {items.map((item, i) => (
          <li key={item} className="hl-objectives-item">
            <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
