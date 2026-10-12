import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * The home page's motion: the walk through the bazaar, and the stalls coming
 * to life when there is no room to walk.
 *
 * Ported from the concept the author chose on 2026-10-12
 * (`playground/10-home-bazaar-street.html`, D79). The page is complete without
 * any of this: the server renders the headline, the four mottos, the five doors
 * and the way in, and the art sits beside them as still pictures. This module
 * only moves things, and it picks one of three modes by media query:
 *
 * - **walk**: a wide, tall enough window with motion allowed. The walk section
 *   is cloned from its `<template>`, the gate, the stall scenes, the signs, the
 *   doors and the button are MOVED into it, and the street's layers pan
 *   sideways while the page scrolls, pinned under the sticky bar.
 * - **stack**: narrower, motion allowed. The stalls stay stacked and each one
 *   animates as it crosses the screen.
 * - **still**: `prefers-reduced-motion: reduce`. Nothing moves; the doors are
 *   set open, which is how the still picture is meant to look.
 *
 * It returns a cleanup that puts every moved node back where the server put it.
 * The island calls that from a LAYOUT effect, which runs before React removes
 * the page on a client navigation: a node React rendered must be back under its
 * own parent before React goes to remove it.
 */

type Cleanup = () => void

const $ = <T extends Element = HTMLElement>(q: string, r: ParentNode = document): T => r.querySelector(q) as T
const $$ = <T extends Element = HTMLElement>(q: string, r: ParentNode = document): T[] => [
  ...r.querySelectorAll<T>(q),
]
const pair = (s: string): number[] => s.split(',').map(Number)
const data = (el: Element, key: string): string => (el as HTMLElement | SVGElement).dataset[key] ?? ''
const num = (el: Element, key: string): number => Number(data(el, key))

/* Camera stops: the world x at the centre of the screen at the start, at each
   of the four stalls, and at the doors. World units are 900 tall. */
const STOPS = [720, 1990, 3190, 4390, 5590, 7040]
/* Layer speeds relative to the stall row. */
const SP = { back: 0.3, mid: 1, beams: 0.8, fore: 1.45 }

/* ---------- prop timelines: each lasts about one unit, and is scrubbed ---------- */

function tlScribe(svg: Element): gsap.core.Timeline {
  const tl = gsap.timeline()
  const lines = $$<SVGElement>('.ln', svg)
  const quill = $('.quill', svg)
  const sheet = $('.sheet', svg)
  const seal = $('.seal', svg)
  const fresh = $('.fresh', svg)
  const L = lines.map((l) => ({ x0: num(l, 'x0'), x1: num(l, 'x1'), y: num(l, 'y') }))
  const [qx, qy] = pair(data(quill, 'rest'))
  const [tx, ty, ts] = pair(data(sheet, 'to'))
  const G = 0.012
  const D = 0.066
  let t = 0
  tl.fromTo(quill, { x: L[0].x0, y: L[0].y, rotation: 0 }, { x: L[0].x0, y: L[0].y, duration: 0.001 }, 0)
  L.forEach((ln, i) => {
    tl.to(quill, { x: ln.x0, y: ln.y, duration: G }, t)
      .fromTo(lines[i], { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: D }, t + G)
      .to(quill, { x: ln.x1, duration: D }, t + G)
    t += G + D
  })
  tl.fromTo(seal, { scale: 2.6, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.06, ease: 'power3.in' }, t + 0.02)
    .to(quill, { x: qx, y: qy, rotation: 16, duration: 0.08, ease: 'power1.inOut' }, t + 0.01)
    .fromTo(sheet, { x: 0, y: 0, scale: 1, rotation: 0 }, { x: tx, y: ty, scale: ts, rotation: 3, transformOrigin: '0% 0%', duration: 0.2, ease: 'power2.inOut' }, t + 0.13)
    .fromTo(fresh, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }, t + 0.3)
  return tl
}

function tlScale(svg: Element): gsap.core.Timeline {
  const tl = gsap.timeline()
  const beam = $('.beam', svg)
  const panL = $('.panL', svg)
  const panR = $('.panR', svg)
  const its = $$('.it', svg)
  const sparks = $$('.spark', svg)
  const pv = data(beam, 'pivot').replace(',', ' ')
  const tilt = num(beam, 'tilt')
  const DY = num(beam, 'arm') * Math.sin((tilt * Math.PI) / 180)
  const I = its.map((el) => ({
    el,
    hx: num(el, 'hx'),
    hy: num(el, 'hy'),
    px: num(el, 'px'),
    py: num(el, 'py'),
    keep: data(el, 'keep') !== '',
  }))
  /* the three keepers hop first so they land on the bottom of the pan */
  const order = [...I.filter((i) => i.keep), ...I.filter((i) => !i.keep)]
  order.forEach((it, i) => {
    const t0 = i * 0.05
    tl.fromTo(it.el, { x: it.hx, y: it.hy, rotation: 0 }, { x: it.px, duration: 0.1, ease: 'none' }, t0)
      .to(it.el, { y: Math.min(it.hy, it.py) - 42, duration: 0.05, ease: 'power2.out' }, t0)
      .to(it.el, { y: it.py, duration: 0.05, ease: 'power2.in' }, t0 + 0.05)
  })
  tl.fromTo(beam, { rotation: 0, svgOrigin: pv }, { rotation: tilt, svgOrigin: pv, duration: 0.1, ease: 'power2.inOut' }, 0.46)
    .fromTo(panR, { y: 0 }, { y: DY, duration: 0.1, ease: 'power2.inOut' }, 0.46)
    .fromTo(panL, { y: 0 }, { y: -DY, duration: 0.1, ease: 'power2.inOut' }, 0.46)
  I.forEach((it) => tl.to(it.el, { y: it.py + DY, duration: 0.1, ease: 'power2.inOut' }, 0.46))
  I.filter((it) => !it.keep).forEach((it, j) => {
    const t0 = 0.6 + j * 0.035
    tl.to(it.el, { x: it.px + 150 + j * 38, duration: 0.2, ease: 'power1.out' }, t0)
      .to(it.el, { y: it.py + DY - 36, duration: 0.05, ease: 'power2.out' }, t0)
      .to(it.el, { y: 1040, duration: 0.15, ease: 'power2.in' }, t0 + 0.05)
      .to(it.el, { rotation: 140 + j * 55, transformOrigin: '50% 50%', duration: 0.2 }, t0)
  })
  tl.to(beam, { rotation: 0, svgOrigin: pv, duration: 0.12, ease: 'back.out(2.2)' }, 0.8)
    .to(panR, { y: 0, duration: 0.12, ease: 'back.out(2.2)' }, 0.8)
    .to(panL, { y: 0, duration: 0.12, ease: 'back.out(2.2)' }, 0.8)
  I.filter((it) => it.keep).forEach((it) => tl.to(it.el, { y: it.py, duration: 0.12, ease: 'back.out(2.2)' }, 0.8))
  tl.fromTo(sparks, { scale: 0, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.08, stagger: 0.025, ease: 'back.out(3)' }, 0.9)
  return tl
}

function tlPictures(svg: Element): gsap.core.Timeline {
  const tl = gsap.timeline()
  $$('.frm', svg).forEach((fr, i) => {
    const t0 = 0.04 + i * 0.24
    const back = $('.frm-back', fr)
    const front = $('.frm-front', fr)
    const nailAt = data(fr, 'nail')
    if (nailAt) {
      const nail = nailAt.replace(',', ' ')
      tl.fromTo(fr, { rotation: num(fr, 'swing'), svgOrigin: nail }, { rotation: 0, svgOrigin: nail, duration: 0.34, ease: 'elastic.out(1, 0.35)' }, t0)
    } else {
      tl.fromTo(fr, { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.14, ease: 'power2.out' }, t0)
    }
    tl.fromTo(back, { opacity: 1, scaleX: 1, transformOrigin: '50% 50%' }, { scaleX: 0, duration: 0.08, ease: 'power1.in' }, t0 + 0.12)
      .fromTo(front, { scaleX: 0, transformOrigin: '50% 50%' }, { scaleX: 1, duration: 0.08, ease: 'power1.out' }, t0 + 0.2)
  })
  tl.fromTo($('.shades', svg), { y: -46, opacity: 0 }, { y: 0, opacity: 1, duration: 0.12, ease: 'bounce.out' }, 0.86)
  return tl
}

function tlPapers(svg: Element): gsap.core.Timeline {
  const tl = gsap.timeline()
  $$('.pf', svg)
    .filter((p) => data(p, 'dx') !== '')
    .forEach((p, i) => {
      const t0 = 0.02 + i * 0.085
      const r = num(p, 'r')
      tl.fromTo(p, { x: 0, y: 0, rotation: r, transformOrigin: '50% 50%' }, { y: -40, rotation: r + 10, duration: 0.06, ease: 'power1.out' }, t0)
        .to(p, { x: num(p, 'dx'), duration: 0.32, ease: 'sine.in' }, t0 + 0.06)
        .to(p, { y: -(num(p, 'y') + 240), duration: 0.32, ease: 'power1.out' }, t0 + 0.06)
        .to(p, { rotation: r + num(p, 'spin'), duration: 0.32, ease: 'none' }, t0 + 0.06)
    })
  tl.fromTo($('.bookglow', svg), { opacity: 0.15 }, { opacity: 0.9, duration: 0.5 }, 0)
  return tl
}

const PROPS: Record<string, (svg: Element) => gsap.core.Timeline> = {
  scribe: tlScribe,
  scale: tlScale,
  pictures: tlPictures,
  papers: tlPapers,
}

export function initBazaar(root: HTMLElement): Cleanup {
  const html = document.documentElement
  const stalls = $$('.stall', root)
  const signEls = stalls.map((st) => $('.sign', st))
  const baySvgs = stalls.map((st) => $<SVGSVGElement>('.bay-svg', st))
  const doors = $$('.door', root)
  const cta = $('.cta-wrap', root)

  gsap.registerPlugin(ScrollTrigger)

  function tlDoors(withCta: boolean): gsap.core.Timeline {
    const tl = gsap.timeline()
    doors.forEach((d, i) => {
      const t0 = 0.05 + i * 0.08
      $$('.leafL, .leafR', d).forEach((leaf) => {
        const o = `${data(leaf, 'hinge')} 0`
        tl.fromTo(leaf, { scaleX: 1, x: 0, svgOrigin: o }, { scaleX: 0.12, svgOrigin: o, duration: 0.34, ease: 'power2.inOut' }, t0)
          .fromTo($('.leaf-shade', leaf), { opacity: 0 }, { opacity: 0.5, duration: 0.34, ease: 'power2.in' }, t0)
      })
    })
    if (withCta) tl.fromTo(cta, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.62)
    return tl
  }

  /* a sign flaps down from its rail and swings to rest, in real time */
  function swingTL(sign: HTMLElement): gsap.core.Timeline {
    const sw = $('.swing', sign)
    gsap.set(sw, { rotationX: -100, opacity: 0, transformPerspective: 900, transformOrigin: '50% 0%' })
    return gsap
      .timeline({ paused: true })
      .to(sw, { opacity: 1, duration: 0.14 }, 0)
      .to(sw, { rotationX: 0, duration: 1.5, ease: 'elastic.out(1, 0.32)' }, 0)
      .fromTo(sw, { rotation: -5 }, { rotation: 0, duration: 2, ease: 'elastic.out(1.1, 0.22)' }, 0.15)
  }

  /* ---------- walk ---------- */
  let walkEl: HTMLElement | null = null
  function enterWalk(): Cleanup {
    const tpl = $<HTMLTemplateElement>('#tpl-walk', root)
    walkEl = walkEl ?? (tpl.content.firstElementChild!.cloneNode(true) as HTMLElement)
    const section = walkEl
    const stage = $('.stage', section)
    const street = $('.street', section)
    const L: Record<string, HTMLElement> = {}
    ;['back', 'mid', 'beams', 'top', 'fore'].forEach((n) => {
      L[n] = $(`.layer-${n}`, section)
    })
    const gate = $('#gate', root)
    const copy = $('.gate-copy', gate)
    const tunnel = $('.tunnel', gate)
    const motes = $('.gate-motes', gate)
    const moved: Array<[Node, Node, Node | null]> = []
    const move = (node: Node, parent: Node, before: Node | null = null) => {
      moved.push([node, node.parentNode!, node.nextSibling])
      parent.insertBefore(node, before)
    }
    gate.parentNode!.insertBefore(section, gate)
    move(gate, stage, street)
    const endBay = L.mid.children[2]
    baySvgs.forEach((svg) => {
      svg.setAttribute('viewBox', data(svg, 'full'))
      svg.setAttribute('preserveAspectRatio', 'none')
      move(svg, L.mid, endBay)
    })
    signEls.forEach((sg) => move(sg, L.top))
    move($('.doors', root), L.top)
    move(cta, L.top)
    html.classList.add('is-walk')

    /* The bar is sticky, so the walk is the window less the bar, pinned under it. */
    const bar = () => document.querySelector<HTMLElement>('.bz-bar')?.offsetHeight ?? 0
    let U = 1
    let VW = 1
    const cam = { x: STOPS[0] }
    const size = () => {
      U = (innerHeight - bar()) / 900
      VW = html.clientWidth
      stage.style.setProperty('--u', String(U))
    }
    const signs = signEls.map((sg, i) => ({ el: sg, at: STOPS[i + 1] - 660, on: false, tl: swingTL(sg) }))
    const apply = () => {
      const x = cam.x
      L.back.style.transform = `translate3d(${VW / 2 - x * SP.back * U}px,0,0)`
      L.mid.style.transform = L.top.style.transform = `translate3d(${VW / 2 - x * SP.mid * U}px,0,0)`
      L.beams.style.transform = `translate3d(${VW / 2 - x * SP.beams * U}px,0,0)`
      L.fore.style.transform = `translate3d(${VW / 2 - x * SP.fore * U}px,0,0)`
      signs.forEach((s) => {
        const on = x > s.at
        if (on !== s.on) {
          s.on = on
          if (on) s.tl.timeScale(1).play()
          else s.tl.timeScale(2.2).reverse()
        }
      })
    }
    size()
    apply()

    /* walking in: the gate zooms about the far end of its vaulted street; the
       vault inside the arch fades so the real street shows through the
       opening; the frame passes off screen */
    const origin = () => {
      const ga = $('.gate-arch', gate)
      return `${gate.offsetWidth / 2}px ${ga.offsetTop + ga.offsetHeight * (432 / 620)}px`
    }
    const master = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: apply })
    master
      .fromTo(gate, { scale: 1, transformOrigin: origin }, { scale: 9, transformOrigin: origin, ease: 'power2.in', duration: 1 }, 0)
      .fromTo(copy, { opacity: 1, y: 0 }, { opacity: 0, y: -40, duration: 0.28 }, 0)
      .fromTo([tunnel, motes], { opacity: 1 }, { opacity: 0, duration: 0.34, ease: 'power1.inOut' }, 0.2)
      .fromTo(street, { scale: 1.3 }, { scale: 1, duration: 0.85, ease: 'power2.out' }, 0.15)
      .fromTo(gate, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.04 }, 0.96)
    const HOLD = 0.46
    const LEAD = 0.42
    let pos = 1.02
    let from = STOPS[0]
    for (let i = 1; i < STOPS.length; i++) {
      const last = i === STOPS.length - 1
      const to = STOPS[i]
      const dur = ((to - from) * 0.8) / 1000
      master.to(cam, { x: to, duration: dur, ease: 'power1.inOut' }, pos)
      const arrive = pos + dur
      const hold = last ? 0.6 : HOLD
      const ptl = last ? tlDoors(true) : PROPS[data(baySvgs[i - 1], 'art')](baySvgs[i - 1])
      master.add(ptl.timeScale(ptl.duration() / (LEAD + hold - 0.06)), arrive - LEAD)
      master.to(cam, { x: to + (last ? 0 : 54), duration: hold }, arrive)
      from = to + (last ? 0 : 54)
      pos = arrive + hold
    }
    const st = ScrollTrigger.create({
      trigger: section,
      start: () => `top ${bar()}px`,
      end: () => '+=' + Math.round(master.duration() * innerHeight * 0.92),
      pin: true,
      scrub: 0.9,
      animation: master,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    })
    ScrollTrigger.addEventListener('refreshInit', size)
    ScrollTrigger.addEventListener('refresh', apply)

    /* keyboard: a control inside the walk brings the walk to where that control is visible */
    const onFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      const p = target.closest('.door, .cta-wrap') ? 1 : 0
      const y = st.start + p * (st.end - st.start)
      if (Math.abs(window.scrollY - y) > 4) {
        window.scrollTo(0, y)
        st.update()
        master.progress(p)
      }
    }
    section.addEventListener('focusin', onFocus)

    return () => {
      section.removeEventListener('focusin', onFocus)
      ScrollTrigger.removeEventListener('refreshInit', size)
      ScrollTrigger.removeEventListener('refresh', apply)
      st.kill(true)
      master.kill()
      signs.forEach((s) => {
        s.tl.kill()
        gsap.set($('.swing', s.el), { clearProps: 'all' })
      })
      html.classList.remove('is-walk')
      for (let i = moved.length - 1; i >= 0; i--) {
        const [node, parent, next] = moved[i]
        parent.insertBefore(node, next)
      }
      baySvgs.forEach((svg) => {
        svg.setAttribute('viewBox', data(svg, 'cropView'))
        svg.removeAttribute('preserveAspectRatio')
      })
      section.remove()
      gsap.set([gate, copy, street, cta, tunnel, motes], { clearProps: 'all' })
    }
  }

  /* ---------- stack, animated ---------- */
  function enterStack(): Cleanup {
    stalls.forEach((_, i) => {
      const svg = baySvgs[i]
      const s = swingTL(signEls[i])
      ScrollTrigger.create({
        trigger: signEls[i],
        start: 'top 88%',
        onEnter: () => s.timeScale(1).play(),
        onLeaveBack: () => s.timeScale(2).reverse(),
      })
      ScrollTrigger.create({ trigger: svg, start: 'top 82%', end: 'bottom 42%', scrub: 0.7, animation: PROPS[data(svg, 'art')](svg) })
    })
    ScrollTrigger.create({ trigger: $('.doors', root), start: 'top 80%', end: 'bottom 55%', scrub: 0.7, animation: tlDoors(false) })
    gsap.fromTo($('#archBox', root), { scale: 1 }, {
      scale: 1.12,
      ease: 'none',
      transformOrigin: '50% 70%',
      scrollTrigger: { trigger: $('#gate', root), start: 'top top', end: 'bottom top', scrub: true },
    })
    return () => {
      signEls.forEach((sg) => gsap.set($('.swing', sg), { clearProps: 'all' }))
    }
  }

  /* ---------- still: the markup is the finished picture, except the doors, which open here ---------- */
  function enterStill(): void {
    tlDoors(false).progress(1)
  }

  baySvgs.forEach((svg) => {
    svg.dataset.cropView = svg.getAttribute('viewBox') ?? ''
  })
  const mm = gsap.matchMedia()
  mm.add(
    {
      walk: '(min-width: 900px) and (min-height: 560px) and (min-aspect-ratio: 6/5) and (prefers-reduced-motion: no-preference)',
      motion: '(prefers-reduced-motion: no-preference)',
      still: '(prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      const { walk, motion, still } = ctx.conditions as Record<string, boolean>
      if (walk) return enterWalk()
      if (motion) return enterStack()
      if (still) enterStill()
      return undefined
    },
  )
  return () => mm.revert()
}
