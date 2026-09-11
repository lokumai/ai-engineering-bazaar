/**
 * §6.3 — what the reader will be able to do, as the mockup's `leaf` card.
 *
 * Reference: `playground/01-theme-T4-ground-G3-powder.html`'s `.goals`, the
 * FIRST child of `.prose`: a `leaf`-shaped tile — rounded on two opposing
 * corners — holding a plain bold line and an unnumbered list.
 *
 * ## M16 stage 5 changed three things about it
 *
 * **It is inside the prose now.** It used to sit above it as a `<section>` of
 * its own with a mono heading; the mockup puts it in the reading flow, as the
 * first thing the column says after the facts. So `Prose` takes it as its
 * `opening` slot and it is rendered inside `.bz-prose`.
 *
 * **The ordinals are gone.** Each item carried a zero-padded `01` / `02` in an
 * `aria-hidden` span, which is the drawing-set convention the retired design
 * used everywhere. `.goals` is a plain `<ul>`, and a numbered list would say
 * these have an order they do not have.
 *
 * **The heading is a plain bold line, not a section.** `.goals b` is 14px
 * `on-surface-title`, which is `.bz-card-title` in the language. It keeps its
 * `id` so the card is still a labelled region for anyone navigating by one.
 *
 * Returns `null` on an empty list: a card with a promise and no promises in it
 * is the claim §1 forbids.
 */
export function Objectives({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null

  return (
    <section className="bz-card" aria-labelledby="objectives">
      <b id="objectives" className="bz-card-title">
        What you will be able to do
      </b>
      <ul className="bz-card-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
