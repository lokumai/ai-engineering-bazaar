import { yearOf } from '@/lib/caravan-months'
import { placeLabel } from '../places'
import { Journey } from './journey'
import { clamp, isPhone, place, type SceneData } from './model'
import { mountShadowPlay, type Scene } from './shadow'
import { Stops } from './stops'
import { mountStrip, type Strip } from './strip'

/**
 * M91, D116 — the Caravan page's motion, started by `CaravanScene.tsx` and imported on demand so the
 * page's first paint carries none of it (the home page's pattern).
 *
 * It finds what the server rendered under `root`: the year bar, the stage, the strip, the card,
 * the live region a picked year is announced in, and the list of trends whose entries the card
 * shows. It draws the scene into the stage and wires the five ways to travel (wheel, drag, strip,
 * year bar, a focused stop) to one journey.
 *
 * **The stage is as tall as the window allows**, from 300 px up to `STAGE_MAX`, so the whole caravan
 * and the whole strip are in view on a laptop without scrolling; the scene picks its zoom from that
 * height (`shadow.ts`, `zoomFor`). The cap was the mockup's 470 px until M93, when the author asked
 * for a taller stage; above the new cap a window's extra height is the page's, not more sky. On a
 * resize that crosses the phone width, or changes the width or the height by more than 40 px, it
 * draws everything again at the new size, as the mockup does.
 *
 * The place a year names ("2023 · The oasis") is no longer a row on the page (M93, the author:
 * "remove ... the '2026 · The sea port' rows"); it is still announced when a reader picks a year.
 *
 * It returns null, and draws nothing, when the page lacks a part it needs.
 */

/** The space kept under the strip, so it never touches the window's foot. */
const FOOT = 12

/** The tallest the stage is drawn, in px. */
const STAGE_MAX = { desk: 640, phone: 420 } as const

export function initCaravan(root: HTMLElement, data: SceneData): (() => void) | null {
  const stage = root.querySelector<HTMLElement>('.cv-stage')
  const strip = root.querySelector<HTMLElement>('.cv-scrub')
  const card = root.querySelector<HTMLElement>('.cv-card')
  const announce = root.querySelector<HTMLElement>('[data-cv-announce]')
  const yearButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-cv-year]')]
  if (!stage || !strip || !card || !announce || data.months.length === 0) return null

  const trends = place(data.trends)
  const months = data.months
  const NM = months.length
  const firstYear = yearOf(months[0])
  const yearStart = (y: number) => Math.max(0, months.findIndex((month) => yearOf(month) === y))
  const yearAt = (t: number) => yearOf(months[clamp(Math.floor(t), 0, NM - 1)])
  const entryOf = (id: string) => root.querySelector<HTMLElement>(`[data-trend-entry="${id}"]`)

  let current: { scene: Scene; journey: Journey; stops: Stops; strip: Strip; phone: boolean; width: number; height: number } | null = null

  /** The stage's height: what the window leaves under its top once the strip has its place. */
  function fit(): void {
    const top = stage!.getBoundingClientRect().top + window.scrollY
    const below = parseFloat(getComputedStyle(strip!).marginTop) + strip!.offsetHeight + FOOT
    const max = isPhone() ? STAGE_MAX.phone : STAGE_MAX.desk
    stage!.style.height = `${clamp(Math.floor(window.innerHeight - top - below), 300, max)}px`
  }

  function mount(): void {
    const at = current ? current.journey.t - current.scene.toCaravan() : null
    unmount()
    fit()
    let stops: Stops | null = null
    const scene = mountShadowPlay(stage!, months, data.norm, trends, () => stops!)
    const journey = new Journey(stage!, scene, { min: () => scene.toCaravan(), max: () => NM })
    stops = new Stops(
      stage!.querySelector('.cv-stops') as HTMLElement,
      trends,
      journey,
      card!,
      entryOf,
      () => scene.lead(),
      (id) => scene.highlight(id),
    )
    const scrub = mountStrip({
      el: strip!,
      months,
      norm: data.norm,
      stops: trends,
      get: () => journey.t,
      set: (t, instant) => journey.go(t, instant),
      span: () => scene.span(),
    })
    journey.on((t) => {
      scrub.update()
      const y = yearAt(t - scene.toCaravan())
      for (const b of yearButtons) {
        if (Number(b.dataset.cvYear) === y) b.setAttribute('aria-current', 'true')
        else b.removeAttribute('aria-current')
      }
    })
    current = { scene, journey, stops, strip: scrub, phone: isPhone(), width: window.innerWidth, height: window.innerHeight }
    // Where the caravan stood before a redraw, or the start of the road.
    journey.go(at === null ? scene.toCaravan() : at + scene.toCaravan(), true)
  }

  function unmount(): void {
    if (!current) return
    current.journey.destroy()
    current.stops.destroy()
    current.strip.destroy()
    current.scene.destroy()
    current = null
  }

  const ac = new AbortController()
  for (const b of yearButtons) {
    // A year puts the caravan at that January, and is the one move the place is announced for.
    b.addEventListener('click', () => {
      if (!current) return
      const y = Number(b.dataset.cvYear)
      current.journey.go(yearStart(y) + 0.1 + current.scene.toCaravan())
      announce!.textContent = placeLabel(y, firstYear)
    }, { signal: ac.signal })
  }
  let timer = 0
  window.addEventListener('resize', () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      if (!current) return
      if (current.phone !== isPhone() || Math.abs(current.width - window.innerWidth) > 40 || Math.abs(current.height - window.innerHeight) > 40) mount()
    }, 200)
  }, { signal: ac.signal })

  // A scene that throws while it is first drawn takes its listeners and its half-drawn stage with it
  // and reports failure, so the island hides the journey (`data-cv-failed`) and leaves the list.
  try {
    mount()
  } catch {
    ac.abort()
    window.clearTimeout(timer)
    try {
      unmount()
    } catch {
      current = null
    }
    stage.innerHTML = ''
    stage.style.height = ''
    return null
  }
  root.dataset.cvReady = ''
  // A web font that arrives after the first fit can move the head; fit again once fonts settle.
  const fittedAt = stage.getBoundingClientRect().top + window.scrollY
  void document.fonts?.ready.then(() => {
    if (ac.signal.aborted) return
    if (Math.abs(stage.getBoundingClientRect().top + window.scrollY - fittedAt) > 2) mount()
  })

  return () => {
    ac.abort()
    window.clearTimeout(timer)
    unmount()
    stage.style.height = ''
    delete root.dataset.cvReady
  }
}
