import { CAST, VANISHING, type CastId } from './cast'
import { closeClouds } from './clouds'

/**
 * The escape at the gate (L3a, the author's pick of 2026-11-06), on the walk only.
 *
 * Bit turns his face to the gate, the crowd throws up its free arms, Bit turns his back and
 * runs straight into the vault, and one by one the others turn and run in after him, each
 * first along the pavement to a lane and then down the vaulted street to its far end. Then
 * the walk's own zoom through the gate plays as before.
 *
 * **Every pose is a function of the time T**, so the scroll can scrub it both ways and a
 * given scroll position always draws the same frame: nothing is tweened, nothing is left
 * half-done by a fast scroll. T runs from 0 to `CHASE_END` in the playground's seconds
 * (`playground/2026-11-round-3/L-gate-characters.html`, where this was designed);
 * `motion.ts` maps it onto the start of the walk's timeline.
 *
 * Everything is written as `transform` attributes in each drawing's own units, never as
 * CSS transforms, so it does not fight the figures' idle CSS animations, which sit on the
 * inner groups (`.breathe`, `.gest`, `.head`). What it moves:
 *
 * - `.mover`, the person and their shadow: along the pavement and into the depth (the goods
 *   at Leyla's feet stay where they are);
 * - `.fg`: the run's bob and the squash of a turn;
 * - the arms (`.arm-l`, `.arm-r`, both the front and the mirrored back set), the feet and
 *   Bit's head (`.rhead`);
 * - the drawing's `back` class, which swaps the front for the back (`home.css`).
 *
 * The run, seen from behind, is a bob and a sway, the feet lifting in turn and the free arm
 * swinging; the arm holding something does not swing, so the bowl stays level, the musket
 * stays on Murat's shoulder and the simit stays up (M50's decision per prop).
 */

export const CHASE_END = 7.6
/** When, in the chase's own time, the walk's zoom through the gate starts. */
export const ZOOM_AT = 6.4
/** Before this the people stand and can be read; after it they are on the move. */
const BUSY = 0.4

const clamp = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)
const span = (T: number, at: number, dur: number) => clamp((T - at) / dur)
const ease = {
  in1: (t: number) => t * t,
  out1: (t: number) => 1 - (1 - t) * (1 - t),
  in2: (t: number) => t * t * t,
  inOut1: (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
  back: (t: number) => {
    const c = 2
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
  },
}

interface Plan {
  /** a head-only turn before the body turns (Bit's), or none */
  headAt?: number
  turnAt: number
  turnDur: number
  armsUpAt?: number
  armsDownAt?: number
  runAt: number
  runDur: number
  /** along the pavement to this lane (relative to the far end), then down the street */
  lane: number
  lat: number
  dep: number
  depEase: (t: number) => number
  period: number
  bob: number
  arm: number
}

/* The order they follow Bit in, and the lane each runs to: the child first, then the
   merchant, the guard, and the rest. */
const FOLLOW: Array<[CastId, number]> = [
  ['deniz', -50],
  ['dariush', -110],
  ['murat', 60],
  ['leyla', -160],
  ['mei', 120],
  ['piri', 170],
]

function plans(): Record<CastId, Plan> {
  const out = {
    bit: {
      headAt: 1.0,
      turnAt: 1.8,
      turnDur: 0.45,
      runAt: 2.4,
      runDur: 3.2,
      lane: 0,
      lat: 0,
      dep: 2.8,
      depEase: ease.in1,
      period: 0.3,
      bob: 18,
      arm: 22,
    },
  } as Record<CastId, Plan>
  FOLLOW.forEach(([id, lane], i) => {
    const at = 2.8 + i * 0.22
    out[id] = {
      turnAt: at - 0.5,
      turnDur: 0.4,
      armsUpAt: 1.15 + i * 0.05,
      armsDownAt: at - 0.15,
      runAt: at,
      runDur: 3.6,
      lane,
      lat: 1.3,
      dep: 2.3,
      depEase: ease.in2,
      period: 0.34,
      bob: 14,
      arm: 16,
    }
  })
  return out
}

interface Actor {
  id: CastId
  btn: HTMLElement
  svg: SVGSVGElement
  cap: HTMLElement | null
  mover: SVGGElement
  fg: SVGGElement
  rhead: SVGGElement | null
  /** [left, right] arm groups in the front set, and in the mirrored back set */
  front: SVGGElement[]
  back: SVGGElement[]
  feet: SVGGElement[]
  holding: 'l' | 'r' | null
  x: number
  y: number
  s: number
  plan: Plan
}

/* The walk calls `render` on every frame of its scroll, long after the chase is over, so a
   write that would not change anything is skipped: an SVG repaints on any attribute set. */
const written = new WeakMap<Element, string>()
const set = (el: Element | null, transform: string) => {
  if (el === null || written.get(el) === transform) return
  written.set(el, transform)
  if (transform === '') el.removeAttribute('transform')
  else el.setAttribute('transform', transform)
}

export interface Chase {
  render(T: number): void
  reset(): void
  /** How far apart the walk stands the people and how much larger it draws them (`--spread`, `--grow`). */
  layout(spread: number, grow: number): void
}

export function makeChase(street: HTMLElement, gate: HTMLElement): Chase | null {
  const box = gate.querySelector<HTMLElement>('[data-cast]')
  if (box === null) return null
  const P = plans()
  const actors: Actor[] = []
  for (const m of CAST) {
    const btn = box.querySelector<HTMLElement>(`[data-who="${m.id}"]`)
    const svg = btn?.querySelector<SVGSVGElement>('svg')
    const mover = svg?.querySelector<SVGGElement>('.mover')
    const fg = svg?.querySelector<SVGGElement>('.fg')
    if (!btn || !svg || !mover || !fg) continue
    const front = [...svg.querySelectorAll<SVGGElement>('.arms-f .arm-l, .arms-f .arm-r')]
    const back = [...svg.querySelectorAll<SVGGElement>('.arms-b .arm-l, .arms-b .arm-r')]
    const robotArms = front.length === 0 ? [...svg.querySelectorAll<SVGGElement>('.arm-l, .arm-r')] : []
    const holds = svg.querySelector('.arm-r.holding') !== null ? 'r' : svg.querySelector('.arm-l.gun-arm') !== null ? 'l' : null
    actors.push({
      id: m.id,
      btn,
      svg,
      cap: btn.querySelector<HTMLElement>('.who-cap'),
      mover,
      fg,
      rhead: svg.querySelector<SVGGElement>('.rhead'),
      front: front.length ? front : robotArms,
      back,
      feet: [...svg.querySelectorAll<SVGGElement>('.foot-l, .foot-r')],
      holding: holds,
      x: m.x,
      y: m.y,
      s: m.s,
      plan: P[m.id],
    })
  }
  if (actors.length === 0) return null
  let busy = false
  let spreadBy = 1
  let growBy = 1
  const across = (x: number) => VANISHING.x + (x - VANISHING.x) * spreadBy

  /** A turn's squash: 1 to 0.12 and back, and whether the turn has passed its middle. */
  const squash = (T: number, at: number, dur: number): [number, boolean] => {
    const t = span(T, at, dur)
    const sq = t < 0.5 ? 1 - 0.88 * ease.in1(t * 2) : 0.12 + 0.88 * ease.out1((t - 0.5) * 2)
    return [t <= 0 || t >= 1 ? 1 : sq, t >= 0.5]
  }

  function pose(a: Actor, T: number) {
    const p = a.plan
    /* where on the pavement, and how far down the street */
    const lat = p.lat > 0 ? ease.inOut1(span(T, p.runAt, p.lat)) : 0
    const x0 = across(a.x)
    const xc = x0 + (VANISHING.x + p.lane - x0) * lat
    const depth = p.depEase(span(T, p.runAt + p.lat, p.dep))
    const k = 1 + (0.06 - 1) * depth
    const X = VANISHING.x + (xc - VANISHING.x) * k
    const Y = VANISHING.y + (a.y - VANISHING.y) * k
    /* the drawing's own units: one of them is s × grow of the art's */
    const dx = (X - x0) / (a.s * growBy)
    const dy = (Y - a.y) / (a.s * growBy)
    set(a.mover, k === 1 && dx === 0 && dy === 0 ? '' : `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) translate(110 392) scale(${k.toFixed(4)}) translate(-110 -392)`)
    const fade = span(T, p.runAt + p.lat + p.dep * 0.82, p.dep * 0.18)
    const opacity = fade > 0 ? String(1 - fade) : ''
    if (a.btn.style.opacity !== opacity) a.btn.style.opacity = opacity
    /* gone down the street: not there to point at or click either */
    const visibility = fade >= 1 ? 'hidden' : ''
    if (a.btn.style.visibility !== visibility) a.btn.style.visibility = visibility
    /* whoever is nearer is drawn in front: the ones still on the pavement (k = 1) over the
       ones already down the street */
    const z = String(Math.round(k * 100) + 1)
    if (a.btn.style.zIndex !== z) a.btn.style.zIndex = z

    /* the run: a window in which the gait is drawn from the clock */
    let bob = 0
    let sway = 0
    let swing = 0
    let lift = 0
    const inRun = T >= p.runAt && T <= p.runAt + p.runDur
    if (inRun) {
      const t = T - p.runAt
      const env = Math.min(1, t / 0.15, (p.runDur - t) / 0.15)
      const sn = Math.sin((2 * Math.PI * t) / p.period)
      bob = -p.bob * Math.abs(sn) * env
      sway = 2.5 * sn * env
      swing = p.arm * sn * env
      lift = 9 * env
      const [l, r] = a.feet
      set(l, `translate(0 ${(-lift * Math.max(0, sn)).toFixed(2)})`)
      set(r, `translate(0 ${(-lift * Math.max(0, -sn)).toFixed(2)})`)
    } else a.feet.forEach((f) => set(f, ''))

    /* the turn: the body squashes, swaps to its back at the middle, and opens again */
    const [sq, turned] = squash(T, p.turnAt, p.turnDur)
    if (a.svg.classList.contains('back') !== turned) a.svg.classList.toggle('back', turned)
    set(a.fg, bob === 0 && sway === 0 && sq === 1 ? '' : `translate(0 ${bob.toFixed(2)}) rotate(${sway.toFixed(2)} 110 392) translate(110 0) scale(${sq.toFixed(3)} 1) translate(-110 0)`)
    if (p.headAt !== undefined && a.rhead !== null) {
      const [hq, headTurned] = squash(T, p.headAt, 0.5)
      set(a.rhead, hq === 1 ? '' : `translate(110 0) scale(${hq.toFixed(3)} 1) translate(-110 0)`)
      a.rhead.querySelectorAll<SVGGElement>(':scope .v-f, :scope .v-b').forEach((g) => {
        const isBack = g.classList.contains('v-b')
        const v = turned ? '' : headTurned ? (isBack ? 'visible' : 'hidden') : ''
        if (g.style.visibility !== v) g.style.visibility = v
      })
    }

    /* the arms: the crowd's free ones go up when Bit turns away and down before their own
       turn; every free arm swings in the run */
    const up = p.armsUpAt === undefined || p.armsDownAt === undefined ? 0 : ease.back(span(T, p.armsUpAt, 0.35)) * (1 - ease.inOut1(span(T, p.armsDownAt, 0.25)))
    /* the shoulders the arms turn about: the people's, or Bit's, which sit 6 units lower */
    const [lx, rx, sy] = a.id === 'bit' ? [80, 140, 166] : [82, 138, 160]
    const arm = (g: SVGGElement, side: 'l' | 'r') => {
      const held = a.holding === side
      const deg = held ? 0 : (side === 'l' ? 150 : -150) * up + (side === 'l' ? -swing : swing)
      set(g, Math.abs(deg) < 0.01 ? '' : `rotate(${deg.toFixed(2)} ${side === 'l' ? lx : rx} ${sy})`)
    }
    a.front.forEach((g) => arm(g, g.classList.contains('arm-l') ? 'l' : 'r'))
    a.back.forEach((g) => arm(g, g.classList.contains('arm-l') ? 'l' : 'r'))
  }

  function render(T: number) {
    const nowBusy = T > BUSY
    if (nowBusy !== busy) {
      busy = nowBusy
      if (busy) {
        closeClouds(street)
        street.dataset.chasing = 'true'
        /* focus must not stay on a person about to leave the accessibility tree */
        const focused = document.activeElement
        if (focused instanceof HTMLElement && actors.some((a) => a.btn.contains(focused))) focused.blur()
      } else delete street.dataset.chasing
      /* On the move, the people leave the tab order and the accessibility tree; scrolling
         back to the top brings them back. */
      actors.forEach((a) => {
        if (busy) {
          a.btn.setAttribute('tabindex', '-1')
          a.btn.setAttribute('aria-hidden', 'true')
        } else {
          a.btn.removeAttribute('tabindex')
          a.btn.removeAttribute('aria-hidden')
        }
      })
    }
    const capFade = 1 - span(T, BUSY, 0.4)
    actors.forEach((a) => {
      const o = capFade < 1 ? String(capFade) : ''
      if (a.cap && a.cap.style.opacity !== o) a.cap.style.opacity = o
      pose(a, T)
    })
  }

  function reset() {
    render(0)
    delete street.dataset.chasing
    actors.forEach((a) => {
      a.btn.style.removeProperty('opacity')
      a.btn.style.removeProperty('visibility')
      a.btn.style.removeProperty('z-index')
      a.btn.removeAttribute('tabindex')
      a.btn.removeAttribute('aria-hidden')
      a.svg.classList.remove('back')
    })
  }

  function layout(spread: number, grow: number) {
    spreadBy = spread
    growBy = grow
    box!.style.setProperty('--spread', spread.toFixed(3))
    box!.style.setProperty('--grow', grow.toFixed(3))
  }

  return {
    render,
    reset: () => {
      reset()
      box!.style.removeProperty('--spread')
      box!.style.removeProperty('--grow')
    },
    layout,
  }
}
