import { gsap } from 'gsap'

/**
 * The four stall scenes, moving.
 *
 * Ported from `playground/2026-11-round-2/G-home-stall-scenes.html`, the scenes
 * the author picked on 2026-11-05 (G1b the edited draft, G2a the sieve, G3a
 * the magic lantern, G4a the signpost). The page loops each one on a timer; the
 * street scrubs it with the scroll, so each function only BUILDS a timeline and
 * the walk decides how fast it plays (`motion.ts`).
 *
 * The markup these find their nodes in is `art/stall-*.html`: the scene as the
 * page draws it at its `still` frame, captured by `scripts/capture-stall-scenes.mjs`.
 * That frame is what a reader with no script or with reduced motion sees, so
 * it is not the start of the animation, and every timeline begins by taking the
 * scene back to the start (`rewind`) and setting each moving part explicitly.
 * Parts that GSAP had moved when the frame was captured carry `data-svg-origin`;
 * that is the whole of what `rewind` looks for.
 *
 * Durations are the page's own, in seconds, and mean nothing here: the walk
 * rescales a prop's timeline to the scroll it is given.
 *
 * **What is left out: each scene's closing fade.** The page loops its scenes,
 * so every one ends by clearing itself (the ink fades, the chips vanish, the
 * arrows retract) to be ready to start again. A scrubbed walk has no restart:
 * the reader scrolls back instead, and a stall that empties itself just as
 * the camera reaches it would show the wrong picture at the stop. Without the
 * fade each timeline ends on the scene's finished frame, which is the one the
 * author marked as its `still` (and the one captured into the art file).
 */

type Timeline = gsap.core.Timeline

const $ = <T extends Element = SVGElement>(q: string, r: ParentNode): T => r.querySelector(q) as T
const $$ = <T extends Element = SVGElement>(q: string, r: ParentNode): T[] => [...r.querySelectorAll<T>(q)]

/** The page's seeded generator, for the one place a timeline draws random numbers. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Take every part GSAP had moved back to where the drawing put it. */
function rewind(svg: Element): void {
  gsap.set($$('[data-svg-origin]', svg), { clearProps: 'transform' })
}

const num = (el: Element, key: string): number => Number((el as SVGElement).dataset[key])

/* ---------- G1b: the edited draft ---------- */

export function tlDraft(svg: Element): Timeline {
  rewind(svg)
  const tl = gsap.timeline()
  const hand = $('.hand', svg)
  const lines = $$('.hl', svg)
  const strike = $('.strike', svg)
  const caret = $('.caret', svg)
  const fix = $('.fix', svg)
  const margin = $('.margin', svg)
  const print = $('.print', svg)
  const ink = $('.ink', svg)
  const L = lines.map((l) => ({ x0: num(l, 'x0'), x1: num(l, 'x1'), y: num(l, 'y') }))
  /* The sheet is turned two degrees on the desk, so the hand follows the lines through the same turn. */
  const R = (x: number, y: number): [number, number] => {
    const a = (-2 * Math.PI) / 180
    const dx = x - 450
    const dy = y - 360
    return [450 + dx * Math.cos(a) - dy * Math.sin(a), 360 + dx * Math.sin(a) + dy * Math.cos(a)]
  }
  tl.set([...lines, strike, fix, margin], { attr: { 'stroke-dashoffset': 1 } }, 0)
    .set([caret, print], { opacity: 0 }, 0)
    .set(ink, { opacity: 1 }, 0)
    .set(hand, { x: 560, y: 160, rotation: -10 }, 0)
  let t = 0.1
  const write = (el: Element, x0: number, x1: number, y: number, dur: number) => {
    const [ax, ay] = R(x0, y)
    const [bx, by] = R(x1, y)
    tl.to(hand, { x: ax, y: ay, rotation: 0, duration: 0.2, ease: 'power1.inOut' }, t)
      .to(el, { attr: { 'stroke-dashoffset': 0 }, duration: dur, ease: 'none' }, t + 0.2)
      .to(hand, { x: bx, y: by, duration: dur, ease: 'none' }, t + 0.2)
    t += dur + 0.24
  }
  for (let i = 0; i < 4; i++) write(lines[i], L[i].x0, L[i].x1, L[i].y, 0.62)
  write(strike, 424, 506, 331, 0.3)
  tl.to(caret, { opacity: 1, duration: 0.12 }, t)
  write(fix, 432, 500, 318, 0.4)
  write(margin, 634, 640, 232, 0.25)
  for (let i = 4; i < 7; i++) write(lines[i], L[i].x0, L[i].x1, L[i].y, 0.6)
  const [px, py] = R(590, 482)
  tl.to(hand, { x: 712, y: 548, rotation: 28, duration: 0.45, ease: 'power1.inOut' }, t)
    .to(hand, { y: 556, duration: 0.14, yoyo: true, repeat: 1 }, t + 0.45)
    .to(hand, { x: px - 34, y: py + 40, rotation: 28, duration: 0.45, ease: 'power1.inOut' }, t + 0.8)
    .to(hand, { y: py + 46, duration: 0.14, yoyo: true, repeat: 1 }, t + 1.25)
    .fromTo(print, { opacity: 0, scale: 0.85, svgOrigin: '590 482' }, { opacity: 1, scale: 1, svgOrigin: '590 482', duration: 0.3 }, t + 1.4)
    .to(hand, { x: 560, y: 160, rotation: -10, duration: 0.6, ease: 'power2.out' }, t + 1.55)
    .to({}, { duration: 0.5 }, t + 2.15)
  tl.fromTo(
    $('.flame', svg),
    { scaleY: 1, svgOrigin: '176 490' },
    { scaleY: 1.14, svgOrigin: '176 490', duration: 0.22, repeat: Math.floor((t + 2.65) / 0.22) - 1, yoyo: true, ease: 'sine.inOut' },
    0,
  )
  return tl
}

/* ---------- G2a: the sieve ---------- */

export function tlSieve(svg: Element): Timeline {
  rewind(svg)
  const tl = gsap.timeline()
  const sv = $('.sv', svg)
  const chips = $$('.ch', svg)
  const keep = $('.keep', svg)
  const spk = $$('.spk', svg)
  const r = rng(9)
  tl.set(spk, { opacity: 0 }, 0)
  tl.fromTo(chips, { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.006, ease: 'power2.in' }, 0)
  tl.fromTo(sv, { rotation: 0, svgOrigin: '450 112' }, { rotation: 3.5, svgOrigin: '450 112', duration: 0.17, repeat: 17, yoyo: true, ease: 'sine.inOut' }, 0.8)
    .to(sv, { rotation: 0, svgOrigin: '450 112', duration: 0.5, ease: 'elastic.out(1,0.4)' }, 0.8 + 0.17 * 18)
    .to(keep, { y: 36, duration: 0.35, ease: 'bounce.out' }, 3.9)
    .fromTo(keep, { y: 0 }, { y: -10, duration: 0.17, repeat: 17, yoyo: true, ease: 'power1.out' }, 0.8)
  chips.forEach((c) => {
    const t0 = 0.9 + r() * 2.5
    tl.to(c, { y: 236 + r() * 24, x: (r() - 0.5) * 60, duration: 0.5, ease: 'power2.in' }, t0)
  })
  tl.fromTo(spk, { scale: 0, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.3, stagger: 0.1, ease: 'back.out(3)' }, 4.2)
    .to({}, { duration: 0.6 }, 4.7)
  return tl
}

/* ---------- G3a: the magic lantern ---------- */

export function tlLantern(svg: Element): Timeline {
  rewind(svg)
  const tl = gsap.timeline()
  const sl = $$('.sl', svg)
  const flick = $('.flick', svg)
  const slide = $('.slide', svg)
  const beamL = $('.beamL', svg)
  const bars = $$('.bar', svg)
  const shades = $('.shades', svg)
  const motes = $$('.motes circle', svg)
  const win = $('.win', svg)
  tl.set(sl, { opacity: 0 }, 0).set(sl[0], { opacity: 1 }, 0)
  const swap = (t0: number, i: number, quick?: boolean) => {
    tl.to(slide, { y: -64, duration: quick ? 0.14 : 0.28, ease: 'power2.in' }, t0)
      .to(slide, { y: 0, duration: 0.28, ease: 'power2.out' }, t0 + (quick ? 0.2 : 0.34))
      .set(sl, { opacity: 0 }, t0 + 0.2)
      .set(sl[i], { opacity: 1 }, t0 + 0.3)
      .fromTo(flick, { opacity: 0.9 }, { opacity: 0, duration: 0.35 }, t0 + 0.3)
      .fromTo(beamL, { opacity: 0.25 }, { opacity: 0.55, duration: 0.35 }, t0 + 0.5)
  }
  tl.fromTo(slide, { y: -64 }, { y: 0, duration: 0.3 }, 0).fromTo(flick, { opacity: 0.9 }, { opacity: 0, duration: 0.3 }, 0.2)
  swap(1.1, 1, true)
  tl.fromTo($$('.ar', svg), { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.3, stagger: 0.25 }, 1.7)
  swap(3.6, 2)
  tl.fromTo(bars, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.5, stagger: 0.12, ease: 'back.out(1.6)' }, 4.1)
  swap(6.0, 3)
  tl.fromTo(shades, { y: -260 }, { y: 0, duration: 0.9, ease: 'power1.in' }, 6.6)
    .fromTo(shades, { rotation: -4, svgOrigin: '650 262' }, { rotation: 0, svgOrigin: '650 262', duration: 0.4, ease: 'back.out(3)' }, 7.5)
    .to({}, { duration: 0.6 }, 8)
  motes.forEach((m, i) =>
    tl.fromTo(m, { x: 0, y: 0, opacity: 0 }, { x: 60 + i * 8, y: -30 + (i % 3) * 20, opacity: 0.9, duration: 4.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, i * 0.1),
  )
  tl.fromTo(win, { opacity: 0.45 }, { opacity: 0.75, duration: 0.3, repeat: 30, yoyo: true }, 0)
  return tl
}

/* ---------- G4a: the signpost ---------- */

export function tlSignpost(svg: Element): Timeline {
  rewind(svg)
  const tl = gsap.timeline()
  const ar = $$('.ar', svg)
  const tips = $$('.tip', svg)
  const d = [1, 2, 3].map((i) => $$(`.d${i}`, svg))
  const topl = $('.topl .lglow', svg)
  const org = ['464 248', '436 360', '464 472']
  tl.set(ar, { scaleX: 0 }, 0).set(tips, { opacity: 0 }, 0).set(d.flat(), { opacity: 0 }, 0)
  tl.fromTo(topl, { opacity: 0.3 }, { opacity: 1, duration: 0.6 }, 0)
  ar.forEach((a, i) => {
    const t0 = 0.4 + i * 1.1
    tl.fromTo(a, { scaleX: 0, svgOrigin: org[i] }, { scaleX: 1, svgOrigin: org[i], duration: 0.7, ease: 'back.out(1.8)' }, t0)
      .fromTo(a, { skewY: i === 1 ? 6 : -6, svgOrigin: org[i] }, { skewY: 0, svgOrigin: org[i], duration: 0.9, ease: 'elastic.out(1,0.4)' }, t0 + 0.1)
      .to(tips[i], { opacity: 1, duration: 0.3 }, t0 + 0.6)
      .fromTo(d[i], { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.2, stagger: 0.08 }, t0 + 0.7)
  })
  tl.to(d.flat(), { opacity: 0.35, duration: 0.25, yoyo: true, repeat: 5, stagger: 0.03 }, 4.0)
    .to({}, { duration: 0.8 }, 5.5)
  return tl
}

/** Each stall's timeline, by the `data-art` its bay carries. */
export const STALL_TIMELINES: Record<string, (svg: Element) => Timeline> = {
  draft: tlDraft,
  sieve: tlSieve,
  lantern: tlLantern,
  signpost: tlSignpost,
}
