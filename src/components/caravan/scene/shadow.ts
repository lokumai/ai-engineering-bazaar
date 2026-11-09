import { yearOf } from '@/lib/caravan-months'
import { placeIndex } from '../places'
import {
  camelPuppet, driverPuppet, GLOW_FILTER, landmarkArt, leaderPuppet, packOf, POST_BOX, postArt, PROP_HEIGHT, PUPPET_HEIGHT, stopArt,
} from './art'
import type { Drawable } from './journey'
import { clamp, heatAt, isPhone, onRoad, type Placed, reduced } from './model'
import type { Box, Stops } from './stops'

/**
 * M91, D116 — C4, Shadow Play: the 2D scene, ported from the round-5 mockup's `Scene2D` with its
 * `STYLE_SHADOW` (the author: "I love C4 the shadow play!! it is very turkish!!").
 *
 * Karagöz: painted leather pressed to a lamplit cloth. The world is as wide as the road, drawn once
 * as SVG layers, each slid sideways at its own rate for depth; only the caravan is redrawn per frame.
 *
 * **Two levels, so nothing moving ever covers a stop.** The trends' props stand on the upper band,
 * with their names above them; the four puppets (the leader on horseback, the driver with the
 * lantern, two camels) walk a lower road along the foot of the screen. The caravan walks at the left
 * edge, so the road ahead of it is open. These are the author's changes to the first C4, and
 * `tests/e2e/caravan.spec.ts` holds the first one: no puppet's box meets a stop's or a label's.
 *
 * The camels carry the trends on the road where the caravan is: up to three bundles each, in the
 * colours of those trends' goods.
 *
 * **M93, the author's second round: closer, and on sticks.** "everything is too small and zoom is
 * very out", and the rods were not long enough to show. The scene is drawn at a zoom fitted to the
 * stage (`zoomFor`) rather than at the mockup's size scaled to it, and the cloth ends above a ledge,
 * across which each puppet's rod runs down off the stage (`art.ts`, `rod`).
 */

export interface Scene extends Drawable {
  /** Months from the centre of the view back to the caravan, which walks at the left edge. */
  toCaravan(): number
  /** Where a focused stop should stand relative to the centre: a little to its right. */
  lead(): number
  highlight(id: string | null): void
  destroy(): void
}

const SVG = 'http://www.w3.org/2000/svg'

/**
 * The scene's proportions, at zoom 1, in pixels per unit of zoom. The puppets' and the props' art
 * is drawn in its own units and scaled by `puppet` and `prop`.
 */
interface Proportions {
  /** The pace across the road at zoom 1: one month, in pixels. */
  month: number
  /** How far the upper band rises where the road is busiest. */
  amp: number
  puppet: number
  prop: number
  post: number
  landmark: number
  /** The upper band's thickness. */
  band: number
  /** The ledge under the cloth, where the rods are seen as sticks. */
  ledge: number
  /** The lower road's height over the ledge, and how far it rises where the road is busy. */
  walk: number
  walkRise: number
  /** The caravan's distance from the cloth's left edge. */
  left: number
  ridge: number
  /** The window width that allows zoom 1, and the largest zoom drawn. */
  wide: number
  most: number
}

const DESK: Proportions = { month: 260, amp: 56, puppet: 0.72, prop: 0.7, post: 0.8, landmark: 0.5, band: 46, ledge: 30, walk: 14, walkRise: 10, left: 28, ridge: 220, wide: 1100, most: 1.6 }
const PHONE: Proportions = { month: 150, amp: 40, puppet: 0.5, prop: 0.5, post: 0.6, landmark: 0.36, band: 34, ledge: 22, walk: 12, walkRise: 8, left: 28, ridge: 150, wide: 340, most: 1.15 }

/** What the stage keeps clear in pixels, whatever the zoom: the valance and a label over the tallest prop. */
const TOP = 36
const LABEL = 44
/** The gap between the tallest puppet and the land the stops stand on, where the road is flat. */
const CLEAR = 14

/**
 * The zoom: the largest at which the whole scene, from the ledge to a label over the tallest prop
 * on the highest land, fits the stage's height, and no larger than the window's width allows. The
 * author asked for the caravan "about 30 percent" larger and for "the module of shadow play" to be
 * taller; MEASURED in M93, the leader is 29 to 33% taller than the first build at 1280x720,
 * 1440x800 and 1440x900. A stage taller than the zoom needs keeps the rest as sky.
 */
export function zoomFor(height: number, width: number, phone: boolean): number {
  const p = phone ? PHONE : DESK
  const span = p.ledge + p.walk - 4 + PUPPET_HEIGHT * p.puppet + 1.05 * p.amp + PROP_HEIGHT * p.prop
  return clamp((height - TOP - LABEL - CLEAR) / span, 0.5, Math.min(p.most, width / p.wide))
}

export function mountShadowPlay(stage: HTMLElement, months: readonly string[], norm: readonly number[], trends: readonly Placed[], stops: () => Stops): Scene {
  const ph = isPhone()
  const p = ph ? PHONE : DESK
  const NM = months.length
  /* The stage's height is fitted to the window (`index.ts`), and the scene is drawn at the zoom
     `g` that fits it (`zoomFor`): the art and the bands scale with it, and so does the pace across
     the road above zoom 1 (`Math.max(1, g)`), so a larger caravan meets props spaced for its size
     while a smaller one keeps the first build's pace. Positions are measured from the
     foot of the stage up, so a stage taller than the zoom needs has more sky, never a gap. */
  const H = stage.clientHeight
  const g = zoomFor(H, stage.clientWidth, ph)
  stage.style.setProperty('--cv-f', g.toFixed(3))
  const MW = p.month * Math.max(1, g)
  const amp = p.amp * g
  const s = p.puppet * g
  const k = p.prop * g
  const postScale = p.post * g
  const ledge = Math.round(p.ledge * g)
  stage.style.setProperty('--cv-ledge', `${ledge}px`)
  /** The upper band where the road is flat: under the tallest puppet by `CLEAR`. */
  const base = H - ledge - (p.walk - 4) * g - PUPPET_HEIGHT * s - CLEAR
  const W = NM * MW
  const pad = 1800
  const viewW = () => stage.clientWidth
  /** The upper band, where the props stand. */
  const ground = (xw: number) => base - heatAt(norm, xw / MW) * amp
  /** The lower road, where the caravan walks, just above the ledge. */
  const walk = (xw: number) => H - ledge - (p.walk + heatAt(norm, xw / MW) * p.walkRise) * g
  const hx = () => p.left + (60 + 272) * s
  const stopTop = (top: number) => top * k - 14

  const firstYear = yearOf(months[0])
  const years: { year: number; at: number }[] = []
  months.forEach((month, i) => {
    if (i === 0 || month.endsWith('-01')) years.push({ year: yearOf(month), at: i })
  })

  stage.innerHTML = `<div class="cv-screen"></div><div class="cv-layers"></div><svg class="cv-caravan" aria-hidden="true"></svg><div class="cv-lamp-light"></div><div class="cv-valance"></div><div class="cv-ledge"></div><div class="cv-stops"></div>`
  const layersEl = stage.querySelector('.cv-layers') as HTMLElement
  const caravan = stage.querySelector('.cv-caravan') as SVGSVGElement

  // ---- the layers ---------------------------------------------------------------------------
  const vw = viewW()
  const atPar = (month: number, par: number) => (month * MW - vw / 2) * par + vw / 2
  const mid = 0.45
  const landmarks = years.map(({ year, at }, n) =>
    `<g transform="translate(${atPar(n === 0 ? 0.2 : at, mid).toFixed(0)} ${(base - amp * 0.9).toFixed(0)}) scale(${(p.landmark * g).toFixed(3)})" class="cv-landmark">${landmarkArt(placeIndex(year, firstYear))}</g>`).join('')

  let seed = 21
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const rough = p.ridge
  const ridgeBase = base - amp * 0.85
  const ridgeAmp = amp * 0.5
  const ridge: [number, number][] = []
  for (let x = -pad; x <= W * mid + pad; x += rough) ridge.push([x, ridgeBase - ridgeAmp * (0.35 + 0.65 * rnd())])
  let hill = `M${-pad} ${H}L${ridge[0][0]} ${ridge[0][1]}`
  for (let i = 1; i < ridge.length; i++) {
    const [x0, y0] = ridge[i - 1]
    const [x1, y1] = ridge[i]
    hill += `Q${x0 + rough / 2} ${Math.min(y0, y1) - ridgeAmp * 0.1} ${x1} ${y1}`
  }
  hill += `L${W * mid + pad} ${H}Z`

  const band = p.band * g
  let land = ''
  for (let x = -pad; x <= W + pad; x += 8) land += (land ? 'L' : 'M') + `${x} ${ground(x).toFixed(1)}`
  for (let x = W + pad; x >= -pad; x -= 8) land += `L${x} ${(ground(x) + band).toFixed(1)}`
  land += 'Z'
  let road = ''
  for (let x = -pad; x <= W + pad; x += 8) road += (road ? 'L' : 'M') + `${x} ${(ground(x) + 7).toFixed(1)}`
  let low = ''
  let lowLand = ''
  for (let x = -pad; x <= W + pad; x += 10) {
    low += (low ? 'L' : 'M') + `${x} ${(walk(x) + 6 * g).toFixed(1)}`
    lowLand += (lowLand ? 'L' : 'M') + `${x} ${(walk(x) - (4 + 6 * Math.sin(x / 90)) * g).toFixed(1)}`
  }
  lowLand += `L${W + pad} ${H}L${-pad} ${H}Z`

  const tops = new Map<string, number>()
  const props = trends.map((x) => {
    const a = stopArt({ id: x.id, index: x.index, peak: x.peak })
    tops.set(x.id, a.top)
    const xw = x.at * MW
    return `<g transform="translate(${xw.toFixed(1)} ${(ground(xw) + 1).toFixed(1)})"><g transform="scale(${k})">${a.svg}</g></g>`
  }).join('')
  const postAt = (n: number, at: number) => (n === 0 ? 0.08 : at - 0.05) * MW
  const posts = years.map(({ year, at }, n) => {
    const xw = postAt(n, at)
    return `<g transform="translate(${xw.toFixed(1)} ${(ground(xw) + 2).toFixed(1)})">${postArt(year, postScale)}</g>`
  }).join('')

  const layers = [
    { par: mid, cls: 'cv-mid', svg: `<path d="${hill}" class="cv-hill"/>${landmarks}`, width: W * mid },
    {
      par: 1,
      cls: 'cv-road',
      svg: `${GLOW_FILTER}<path d="${land}" class="cv-land"/><path d="${lowLand}" class="cv-land"/><path d="${low}" class="cv-low-road"/><path d="${road}" class="cv-high-road"/>${posts}${props}`,
      width: W,
    },
  ].map((L) => {
    const el = document.createElement('div')
    el.className = `cv-layer ${L.cls}`
    el.setAttribute('aria-hidden', 'true')
    const w = L.width + 2 * pad
    el.innerHTML = `<svg width="${w}" height="${H}" viewBox="${-pad} 0 ${w} ${H}" style="left:${-pad}px">${L.svg}</svg>`
    layersEl.append(el)
    return { el, par: L.par }
  })

  // ---- the caravan: four puppets --------------------------------------------------------------
  const member = (html: string) => {
    const el = document.createElementNS(SVG, 'g')
    el.setAttribute('class', 'cv-member')
    el.innerHTML = html
    caravan.append(el)
    return el
  }
  const leader = member(leaderPuppet())
  const driver = member(driverPuppet())
  const camels = [0, 1].map(() => member(''))
  let lastKey: string | null = null

  // ---- the posts' boxes on screen, which a label must clear -------------------------------------
  const postBoxes = (camX: number): Box[] => years.map(({ at }, n) => {
    const xw = postAt(n, at)
    const y = ground(xw) + 2
    return {
      l: xw - camX + POST_BOX.left * postScale,
      r: xw - camX + POST_BOX.right * postScale,
      t: y + POST_BOX.top * postScale,
      b: y + POST_BOX.bottom * postScale,
    }
  })

  function frame(t: number, _dt: number, v: number): boolean {
    const camX = t * MW - viewW() / 2
    for (const L of layers) L.el.style.transform = `translate3d(${(-camX * L.par).toFixed(1)}px,0,0)`

    const at = (camX + hx()) / MW
    const load = onRoad(trends, at, 6)
    const key = load.map((x) => x.id).join()
    if (key !== lastKey) {
      lastKey = key
      const per = Math.ceil(load.length / camels.length) || 1
      camels.forEach((c, n) => {
        c.innerHTML = camelPuppet(load.slice(n * per, n * per + per).map((x) => packOf(x.index)), n)
      })
    }

    const walking = Math.abs(v) > 0.03 && !reduced()
    const back = v < -0.03
    caravan.classList.toggle('is-walking', walking)
    const offs: [SVGGElement, number][] = [[leader, 0], [driver, -72 * s], ...camels.map((c, n): [SVGGElement, number] => [c, (-150 - n * 122) * s])]
    for (const [puppet, off] of offs) {
      const sx = hx() + off
      const xw = camX + sx
      const gy = walk(xw) + 4 * g
      const a = clamp(Math.atan2(walk(xw + 18) - walk(xw - 18), 36) * 57.3, -12, 12)
      puppet.setAttribute('transform', `translate(${sx.toFixed(1)} ${gy.toFixed(1)}) rotate(${a.toFixed(1)}) scale(${(back ? -s : s).toFixed(3)} ${s.toFixed(3)})`)
    }

    const st = stops()
    trends.forEach((x, i) => {
      const xw = x.at * MW
      const top = stopTop(tops.get(x.id) ?? 0)
      st.place(i, xw - camX, ground(xw) + top, -top)
    })
    st.afterFrame(postBoxes(camX))
    return walking
  }

  return {
    frame,
    span: () => viewW() / MW,
    toCaravan: () => (viewW() / 2 - hx()) / MW,
    lead: () => -(viewW() / MW) * 0.08,
    highlight(id) {
      for (const prop of stage.querySelectorAll<SVGGElement>('.cv-stopg')) prop.classList.toggle('is-lit', id !== null && prop.dataset.id === id)
      stage.classList.toggle('has-lit', id !== null)
    },
    destroy() {
      stage.innerHTML = ''
      stage.classList.remove('has-lit', 'is-drag')
      stage.style.removeProperty('--cv-f')
      stage.style.removeProperty('--cv-ledge')
    },
  }
}
