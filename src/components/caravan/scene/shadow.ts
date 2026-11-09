import { yearOf } from '@/lib/caravan-months'
import { placeIndex } from '../places'
import {
  camelPuppet, driverPuppet, GLOW_FILTER, landmarkArt, leaderPuppet, packOf, POST_BOX, postArt, stopArt,
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

export function mountShadowPlay(stage: HTMLElement, months: readonly string[], norm: readonly number[], trends: readonly Placed[], stops: () => Stops): Scene {
  const ph = isPhone()
  const NM = months.length
  const MW = ph ? 150 : 260
  const H = ph ? 400 : 470
  const amp = ph ? 58 : 80
  const base = H - (ph ? 114 : 160)
  const s = ph ? 0.5 : 0.72
  const k = ph ? 0.5 : 0.7
  const postScale = ph ? 0.6 : 0.8
  const W = NM * MW
  const pad = 1800
  const viewW = () => stage.clientWidth
  /** The upper band, where the props stand. */
  const ground = (xw: number) => base - heatAt(norm, xw / MW) * amp
  /** The lower road, where the caravan walks. */
  const walk = (xw: number) => H - (ph ? 26 : 32) - heatAt(norm, xw / MW) * (ph ? 8 : 12)
  const hx = () => (ph ? 16 : 28) + (60 + 272) * s
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
    `<g transform="translate(${atPar(n === 0 ? 0.2 : at, mid).toFixed(0)} ${(base - amp * 0.9).toFixed(0)}) scale(${ph ? 0.36 : 0.5})" class="cv-landmark">${landmarkArt(placeIndex(year, firstYear))}</g>`).join('')

  let seed = 21
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const rough = ph ? 150 : 220
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

  const band = ph ? 34 : 46
  let land = ''
  for (let x = -pad; x <= W + pad; x += 8) land += (land ? 'L' : 'M') + `${x} ${ground(x).toFixed(1)}`
  for (let x = W + pad; x >= -pad; x -= 8) land += `L${x} ${(ground(x) + band).toFixed(1)}`
  land += 'Z'
  let road = ''
  for (let x = -pad; x <= W + pad; x += 8) road += (road ? 'L' : 'M') + `${x} ${(ground(x) + 7).toFixed(1)}`
  let low = ''
  let lowLand = ''
  for (let x = -pad; x <= W + pad; x += 10) {
    low += (low ? 'L' : 'M') + `${x} ${(walk(x) + 6).toFixed(1)}`
    lowLand += (lowLand ? 'L' : 'M') + `${x} ${(walk(x) - 4 - 6 * Math.sin(x / 90)).toFixed(1)}`
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
    const g = document.createElementNS(SVG, 'g')
    g.setAttribute('class', 'cv-member')
    g.innerHTML = html
    caravan.append(g)
    return g
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
    for (const [g, off] of offs) {
      const sx = hx() + off
      const xw = camX + sx
      const gy = walk(xw) + 4
      const a = clamp(Math.atan2(walk(xw + 18) - walk(xw - 18), 36) * 57.3, -12, 12)
      g.setAttribute('transform', `translate(${sx.toFixed(1)} ${gy.toFixed(1)}) rotate(${a.toFixed(1)}) scale(${(back ? -s : s).toFixed(3)} ${s.toFixed(3)})`)
    }

    const st = stops()
    trends.forEach((x, i) => {
      const xw = x.at * MW
      st.place(i, xw - camX, ground(xw) + stopTop(tops.get(x.id) ?? 0))
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
      for (const g of stage.querySelectorAll<SVGGElement>('.cv-stopg')) g.classList.toggle('is-lit', id !== null && g.dataset.id === id)
      stage.classList.toggle('has-lit', id !== null)
    },
    destroy() {
      stage.innerHTML = ''
    },
  }
}
