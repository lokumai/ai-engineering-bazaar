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
 * It finds what the server rendered under `root`: the year bar, the place it names, the stage, the
 * strip, the card, and the list of trends whose entries the card shows. It draws the scene into the
 * stage and wires the five ways to travel (wheel, drag, strip, year bar, a focused stop) to one
 * journey. On a resize that crosses the phone width, or changes the width by more than 40 px, it
 * draws everything again at the new size, as the mockup does.
 */
export function initCaravan(root: HTMLElement, data: SceneData): () => void {
  const stage = root.querySelector<HTMLElement>('.cv-stage')
  const strip = root.querySelector<HTMLElement>('.cv-scrub')
  const card = root.querySelector<HTMLElement>('.cv-card')
  const placeEl = root.querySelector<HTMLElement>('.cv-place')
  const yearButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-cv-year]')]
  if (!stage || !strip || !card || !placeEl || data.months.length === 0) return () => {}

  const trends = place(data.trends)
  const months = data.months
  const NM = months.length
  const firstYear = yearOf(months[0])
  const yearStart = (y: number) => Math.max(0, months.findIndex((month) => yearOf(month) === y))
  const yearAt = (t: number) => yearOf(months[clamp(Math.floor(t), 0, NM - 1)])
  const entryOf = (id: string) => root.querySelector<HTMLElement>(`[data-trend-entry="${id}"]`)

  let current: { scene: Scene; journey: Journey; stops: Stops; strip: Strip; phone: boolean; width: number } | null = null

  function mount(): void {
    const at = current ? current.journey.t - current.scene.toCaravan() : null
    unmount()
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
      for (const b of yearButtons) b.setAttribute('aria-pressed', String(Number(b.dataset.cvYear) === y))
      if (placeEl!.dataset.year !== String(y)) {
        placeEl!.dataset.year = String(y)
        placeEl!.textContent = placeLabel(y, firstYear)
      }
    })
    current = { scene, journey, stops, strip: scrub, phone: isPhone(), width: window.innerWidth }
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
    // A year puts the caravan at that January.
    b.addEventListener('click', () => {
      if (!current) return
      const y = Number(b.dataset.cvYear)
      current.journey.go(yearStart(y) + 0.1 + current.scene.toCaravan())
    }, { signal: ac.signal })
  }
  let timer = 0
  window.addEventListener('resize', () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      if (current && (current.phone !== isPhone() || Math.abs(current.width - window.innerWidth) > 40)) mount()
    }, 200)
  }, { signal: ac.signal })

  mount()
  root.dataset.cvReady = ''

  return () => {
    ac.abort()
    window.clearTimeout(timer)
    unmount()
    delete root.dataset.cvReady
  }
}
