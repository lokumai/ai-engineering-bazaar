import type { CaravanGroup } from '@/lib/content/caravan'

/** One trend as the list draws it: its words and links, and the years its span touches. */
export interface ListTrend {
  id: string
  title: string
  period: string
  text: string
  groups: CaravanGroup[]
  years: number[]
}

/**
 * M91, M93 — one trend's entry: when, what, and where to read more. The list renders every one in
 * the page's markup, so it reads and links without a script, and the scene's card copies the
 * `<article>` (`scene/stops.ts`), so the card and the list cannot say two different things. The
 * Cards and List views are the same markup arranged twice by `caravan.css`, for the same reason.
 */
export function TrendEntry({ trend, sample }: { trend: ListTrend; sample: boolean }) {
  return (
    <article className="cv-entry" id={`trend-${trend.id}`} data-trend-entry={trend.id}>
      <p className="cv-entry-when">{trend.period}</p>
      <h3 className="cv-entry-title">{trend.title}</h3>
      <p className="cv-entry-text">{trend.text}</p>
      <div className="cv-entry-links">
        {trend.groups.map((group) => (
          <div className="cv-entry-group" key={group.kind}>
            <h4>{group.heading}</h4>
            <ul>
              {group.links.map((link) => (
                <li key={`${link.title}-${link.href ?? ''}`}>
                  {link.href === null
                    ? <span className="cv-entry-placeholder">{link.title}</span>
                    : <a className="bz-link" href={link.href}>{link.title}</a>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {sample ? <p className="cv-entry-sample">Sample data, not checked</p> : null}
    </article>
  )
}
