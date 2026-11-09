import { monthLabel, yearOf } from '@/lib/caravan-months'
import type { CaravanView } from '@/lib/content/caravan'
import { CaravanScene } from './CaravanScene'
import { caravanPaletteCss } from './palette'
import { placeLabel } from './places'
import type { SceneData } from './scene/model'

/**
 * M91, D116 — Caravan, C4 Shadow Play, as server markup with one island.
 *
 * Reference: `playground/2026-11-round-5/C1-caravan-designs.html#C4` and its screenshots
 * `shots-C1-v2/C4b-*`. The page opens with the notice the author asked for ("mention the above is
 * illustrative and is not ready"), then the head, the journey (the year bar and the place, the
 * stage, the strip, and the one card) and the list of every trend.
 *
 * **Every word of every trend is in this markup**, in the list, so it reads and links without a
 * script; the island draws the picture and its card shows a copy of a list entry. **The journey and
 * its tools are shown only where a script runs** (`cv-scripted` in `caravan.css`): without one they
 * are a picture that cannot move. The inline script below sets that mark before first paint, so the
 * journey does not jump in, and the island takes it away again (`data-cv-failed`) if the scene
 * cannot start. The tools share the head's row so the stage and the strip fit a laptop's window.
 *
 * **The mockup's own bar is not reproduced.** Its copy of the navbar still shows an old
 * `Curriculum` link; the page sits in the site's real bar (`PageShell`), so that link is gone.
 * The trail stays above the notice: every page but the front door carries one (D79,
 * `navigation.spec.ts`), so the notice is the first thing of the page's own content.
 */

const NOTICE = {
  sample: { lead: 'Illustrative:', rest: 'the trends below are sample data and this page is not ready yet.' },
  real: { lead: 'Not ready:', rest: 'this page is still being built.' },
} as const

export function sceneDataOf(view: CaravanView): SceneData {
  const max = Math.max(0, ...view.totals)
  return {
    months: view.months,
    norm: view.totals.map((total) => (max > 0 ? total / max : 0)),
    trends: view.trends.map(({ id, title, period, si, ei, peak }) => ({ id, title, period, si, ei, peak })),
  }
}

export function CaravanPage({ view }: { view: CaravanView }) {
  const first = view.months[0]
  const firstYear = yearOf(first)
  const years = [...new Set(view.months.map(yearOf))]
  const notice = view.sample ? NOTICE.sample : NOTICE.real

  return (
    <div className="bz-caravan" id="caravan" data-sample={view.sample ? '' : undefined}>
      <style dangerouslySetInnerHTML={{ __html: caravanPaletteCss() }} />
      <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.setAttribute("data-cv-script","")' }} />

      <p className="cv-notice" role="note">
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" /><path d="M8 4.6v4.2M8 10.8v.6" /></svg>
        <span><b>{notice.lead}</b> {notice.rest}</span>
      </p>

      <header className="cv-head">
        <div>
          <h1 className="bz-display">Caravan</h1>
          <p className="cv-lead">What the road of AI engineering carried, season by season, since {monthLabel(first, true)}.</p>
        </div>
        <div className="cv-tools cv-scripted">
          <div className="cv-years" role="group" aria-label="Year">
            {years.map((year) => (
              <button key={year} type="button" className="cv-year" data-cv-year={year} aria-current={year === firstYear ? 'true' : undefined}>
                {year}
              </button>
            ))}
          </div>
          <p className="cv-place" data-year={firstYear}>{placeLabel(firstYear, firstYear)}</p>
        </div>
      </header>

      <div className="cv-journey cv-scripted">
        <section className="cv-stage" aria-label="The journey" />
        <div className="cv-scrub" />
        {view.sample || view.measured ? null : (
          <p className="cv-unmeasured" data-cv-unmeasured="">
            Not measured yet: how strong each trend was is still to be measured, so the land and the bars are flat.
          </p>
        )}
        <div className="cv-card" id="cv-card" role="region" hidden />
        {/* The place is announced when a reader picks a year, not each time the road crosses one. */}
        <p className="sr-only" aria-live="polite" data-cv-announce="" />
      </div>

      <section className="cv-list" aria-labelledby="cv-list-title">
        <h2 className="bz-section" id="cv-list-title">Trends</h2>
        <ol className="cv-entries">
          {view.trends.map((trend) => (
            <li key={trend.id}>
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
                {view.sample ? <p className="cv-entry-sample">Sample data, not checked</p> : null}
              </article>
            </li>
          ))}
        </ol>
      </section>

      <CaravanScene rootId="caravan" data={sceneDataOf(view)} />
    </div>
  )
}
