import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { WALK_GROW } from './cast'
import { CHASE_END, ZOOM_AT, makeChase } from './chase'
import { STALL_TIMELINES } from './stall-timelines'
import { CHOSEN } from './track'

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
 * In walk and stack, a door that is pointed at or focused also offers the
 * reader a tray of lokum (`wireOffers`). In still, and with no script at all,
 * `home.css` shows the same tray on hover and focus without moving it.
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
   of the four stalls, at the track choice (the middle of the two track bays)
   and at the doors. World units are 900 tall. */
const STOPS = [720, 1990, 3190, 4390, 5590, 7003, 8600]
/** The choice's characters and stalls, from the horse's tail to the merchant's far edge, in world units (measured on the built page). The camera stops at the middle of them. */
const GROUP = 1511
/** What the group keeps clear of each window edge, in pixels. */
const EDGE = 16
/** How far from the choice, in world units, the street is pulled back to fit it. */
const EASE_OUT = 1000
/** The stops that are one of the four mottos' stalls, by index in STOPS. */
const STALL_STOPS = 4
/** The choice is a decision, so the walk holds there longer than at a stall. */
const CHOICE_HOLD = 0.95
/** How much of the walk's timeline the escape at the gate takes (M58), in the timeline's
    units, where the zoom through the gate takes 1: about one window's height of scroll. */
const CHASE = 1.2
/** Where the zoom starts: when the crowd is in, not when the last of it has gone. */
const ZOOM = (CHASE * ZOOM_AT) / CHASE_END
/* Layer speeds relative to the stall row. */
const SP = { back: 0.3, mid: 1, beams: 0.8, fore: 1.45 }

export function initBazaar(root: HTMLElement): Cleanup {
  const html = document.documentElement
  const stalls = $$('.stall', root)
  const signEls = stalls.map((st) => $('.sign', st))
  const baySvgs = stalls.map((st) => $<SVGSVGElement>('.bay-svg', st))
  const doors = $$('.door', root)
  const cta = $('.cta-wrap', root)
  /* The track choice: the question, two signs, two bays with a character each,
     and a caption under each character. */
  const tracks = $$('.track', root)
  const trackSigns = tracks.map((t) => $('.sign', t))
  const trackSvgs = tracks.map((t) => $<SVGSVGElement>('.bay-svg', t))
  const whos = tracks.map((t) => $('.who', t))
  const question = $('.choice .sign.question', root)
  const bays = [...baySvgs, ...trackSvgs]
  /* Set by the walk while it stands: scrolls the page to where the doors are. */
  let toDoors: (() => void) | null = null

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

  /* ---------- the welcome: a tray of lokum offered at a door that is pointed at or focused ---------- */
  function wireOffers(): Cleanup {
    const off: Array<() => void> = []
    doors.forEach((door) => {
      const tray = door.querySelector('.tray')
      if (tray === null) return
      /* The tray comes forward out of the doorway: small and low, as if from
         inside, to full size at the height a host holds a tepsi. 95 345 is
         the middle of the tray's rim in the door's own units. */
      const offer = $('.offer', tray)
      const glint = $('.glint', tray)
      /* The origins are set once, before any tween: naming svgOrigin in both
         halves of a fromTo makes GSAP re-derive it from the moved element and
         leave the tray 47 units low (measured: matrix(1,0,0,1,0,46.67)). */
      gsap.set(offer, { svgOrigin: '95 345' })
      gsap.set(glint, { svgOrigin: '95 268' })
      const tl = gsap
        .timeline({ paused: true })
        .fromTo($('.door-art', door), { scale: 1 }, { scale: 1.035, transformOrigin: '50% 100%', duration: 0.3, ease: 'power2.out' }, 0)
        .fromTo(offer, { opacity: 0, y: 70, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' }, 0)
        .fromTo(glint, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' }, 0.3)
      let pointed = false
      let focused = false
      const update = () => {
        if (pointed || focused) tl.timeScale(1).play()
        else tl.timeScale(1.6).reverse()
      }
      const handlers: Array<[string, EventListener]> = [
        ['pointerenter', () => { pointed = true; update() }],
        ['pointerleave', () => { pointed = false; update() }],
        ['focusin', () => { focused = door.matches(':focus-visible'); update() }],
        ['focusout', () => { focused = false; update() }],
      ]
      handlers.forEach(([type, fn]) => door.addEventListener(type, fn))
      off.push(() => handlers.forEach(([type, fn]) => door.removeEventListener(type, fn)))
    })
    return () => off.forEach((undo) => undo())
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
    const chase = makeChase(root, gate)
    const chaseT = { t: 0 }
    const moved: Array<[Node, Node, Node | null]> = []
    const move = (node: Node, parent: Node, before: Node | null = null) => {
      moved.push([node, node.parentNode!, node.nextSibling])
      parent.insertBefore(node, before)
    }
    gate.parentNode!.insertBefore(section, gate)
    move(gate, stage, street)
    const endBay = L.mid.children[2]
    bays.forEach((svg) => {
      svg.setAttribute('viewBox', data(svg, 'full'))
      svg.setAttribute('preserveAspectRatio', 'none')
      move(svg, L.mid, endBay)
    })
    ;[...signEls, question, ...trackSigns, ...whos].forEach((el) => move(el, L.top))
    move($('.doors', root), L.top)
    move(cta, L.top)
    html.classList.add('is-walk')

    /* The bar is sticky, so the walk is the window less the bar, pinned under it. */
    const bar = () => document.querySelector<HTMLElement>('.bz-bar')?.offsetHeight ?? 0
    let U = 1
    let VW = 1
    /* How far the street is pulled back at the choice so the group fits the window
       (1 when it already does). The signs size themselves from it in home.css. */
    let K = 1
    const cam = { x: STOPS[0] }
    const size = () => {
      U = (innerHeight - bar()) / 900
      VW = html.clientWidth
      K = Math.min(1, (VW - 2 * EDGE) / (GROUP * U))
      stage.style.setProperty('--u', String(U))
      stage.style.setProperty('--k', String(K))
      /* The cast stands across the facade, not only the art's box (M58): further from the
         middle the narrower the art is against the window, never past 85% of the window's
         half-width, and at most 2.3 times (MEASURED: what 900x560, the smallest walk, needs
         for its captions not to touch). */
      const art = $('#archBox', gate).offsetWidth
      if (chase && art > 0) {
        const spread = Math.min(2.3, Math.max(1, (0.85 * VW) / art))
        /* M63: the people drawn WALK_GROW larger, less where the facade is too narrow to
           spread them that far apart (a body is 120 of the drawing's units, neighbours stand
           115 to 125 apart): never larger than 1.25 times the spread */
        chase.layout(spread, Math.min(WALK_GROW, Math.max(1, spread * 1.25)))
      }
    }
    /* The pull-back is full at the choice and gone EASE_OUT units either side, so every other stop is drawn as it always was. */
    const pull = (x: number): number => {
      const t = Math.min(1, Math.abs(x - STOPS[STALL_STOPS + 1]) / EASE_OUT)
      return 1 - (1 - K) * (1 - t * t * (3 - 2 * t))
    }
    /* Every layer pans by its speed and is scaled by the pull about the middle of the window's top edge (the floor then runs on under the art, see home.css). */
    const place = (el: HTMLElement, speed: number, x: number, k: number) => {
      el.style.transform = k === 1
        ? `translate3d(${VW / 2 - x * speed * U}px,0,0)`
        : `translate3d(${VW / 2}px,0,0) scale(${k}) translate3d(${-x * speed * U}px,0,0)`
    }
    /* A sign flaps down as the camera nears it. The mottos' signs come in at the
       stop they belong to; the choice's signs are read off where they hang. */
    const hangs = (el: HTMLElement): number => Number(el.style.getPropertyValue('--x'))
    const signs = [
      ...signEls.map((sg, i) => ({ el: sg, at: STOPS[i + 1] - 660 })),
      { el: question, at: hangs(question) - 760 },
      ...trackSigns.map((sg) => ({ el: sg, at: hangs(sg) - 600 })),
    ].map((one) => ({ ...one, on: false, tl: swingTL(one.el) }))
    const apply = () => {
      const x = cam.x
      const k = pull(x)
      place(L.back, SP.back, x, k)
      place(L.mid, SP.mid, x, k)
      place(L.top, SP.mid, x, k)
      place(L.beams, SP.beams, x, k)
      place(L.fore, SP.fore, x, k)
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
    /* The far end is 432 of the art's 620 units down its box, which since M58 hangs above
       the pavement rather than at the bottom of the arch's frame. */
    const origin = () => {
      const ga = $('.gate-arch', gate)
      const box = $('#archBox', gate)
      return `${gate.offsetWidth / 2}px ${ga.offsetTop + box.offsetTop + box.offsetHeight * (432 / 620)}px`
    }
    const master = gsap.timeline({
      paused: true,
      defaults: { ease: 'none' },
      onUpdate: () => {
        apply()
        chase?.render(chaseT.t)
      },
    })
    /* M58: first the escape at the gate (street/chase.ts), drawn from its own clock, then
       the zoom through the gate as before. With no cast on the page there is no chase. */
    const Z = chase ? ZOOM : 0
    if (chase) master.to(chaseT, { t: CHASE_END, duration: CHASE }, 0)
    master
      .fromTo(gate, { scale: 1, transformOrigin: origin }, { scale: 9, transformOrigin: origin, ease: 'power2.in', duration: 1 }, Z)
      .fromTo(copy, { opacity: 1, y: 0 }, { opacity: 0, y: -40, duration: 0.28 }, Z)
      .fromTo([tunnel, motes], { opacity: 1 }, { opacity: 0, duration: 0.34, ease: 'power1.inOut' }, Z + 0.2)
      .fromTo(street, { scale: 1.3 }, { scale: 1, duration: 0.85, ease: 'power2.out' }, Z + 0.15)
      .fromTo(gate, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.04 }, Z + 0.96)
    const HOLD = 0.46
    const LEAD = 0.42
    let pos = Z + 1.02
    let from = STOPS[0]
    let choiceAt = 0
    for (let i = 1; i < STOPS.length; i++) {
      const last = i === STOPS.length - 1
      const choice = i === STALL_STOPS + 1
      const to = STOPS[i]
      const dur = ((to - from) * 0.8) / 1000
      master.to(cam, { x: to, duration: dur, ease: 'power1.inOut' }, pos)
      const arrive = pos + dur
      const hold = last ? 0.6 : choice ? CHOICE_HOLD : HOLD
      if (choice) choiceAt = arrive + hold / 2
      /* The choice has no prop to play: its signs swing in on their own and its
         characters idle in CSS. An empty second keeps the rescaling below honest. */
      const ptl = last
        ? tlDoors(true)
        : choice
          ? gsap.timeline().to({}, { duration: 1 })
          : STALL_TIMELINES[data(baySvgs[i - 1], 'art')](baySvgs[i - 1])
      master.add(ptl.timeScale(ptl.duration() / (LEAD + hold - 0.06)), arrive - LEAD)
      /* The camera drifts on at a stall; at the choice it holds still, so the group stays inside the window. */
      const drift = last || choice ? 0 : 54
      master.to(cam, { x: to + drift, duration: hold }, arrive)
      from = to + drift
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
    const redraw = () => {
      apply()
      chase?.render(chaseT.t)
    }
    ScrollTrigger.addEventListener('refresh', redraw)
    toDoors = () => window.scrollTo({ top: st.end, behavior: 'smooth' })

    /* keyboard: a control inside the walk brings the walk to where that control is visible */
    const onFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      /* A person at the gate is reached only before the chase, where the walk already is,
         and a click focuses them too: scrolling there would jump the walk back (M58 review). */
      if (target.closest('.who-btn')) return
      const p = target.closest('.door, .cta-wrap')
        ? 1
        : target.closest('.track-sign, .who-story') ? choiceAt / master.duration() : 0
      const y = st.start + p * (st.end - st.start)
      if (Math.abs(window.scrollY - y) > 4) {
        window.scrollTo(0, y)
        st.update()
        master.progress(p)
      }
    }
    section.addEventListener('focusin', onFocus)

    return () => {
      toDoors = null
      section.removeEventListener('focusin', onFocus)
      ScrollTrigger.removeEventListener('refreshInit', size)
      ScrollTrigger.removeEventListener('refresh', redraw)
      st.kill(true)
      master.kill()
      chase?.reset()
      signs.forEach((s) => {
        s.tl.kill()
        gsap.set($('.swing', s.el), { clearProps: 'all' })
      })
      html.classList.remove('is-walk')
      for (let i = moved.length - 1; i >= 0; i--) {
        const [node, parent, next] = moved[i]
        parent.insertBefore(node, next)
      }
      bays.forEach((svg) => {
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
      ScrollTrigger.create({ trigger: svg, start: 'top 82%', end: 'bottom 42%', scrub: 0.7, animation: STALL_TIMELINES[data(svg, 'art')](svg) })
    })
    ;[question, ...trackSigns].forEach((sign) => {
      const s = swingTL(sign)
      ScrollTrigger.create({
        trigger: sign,
        start: 'top 88%',
        onEnter: () => s.timeScale(1).play(),
        onLeaveBack: () => s.timeScale(2).reverse(),
      })
    })
    ScrollTrigger.create({ trigger: $('.doors', root), start: 'top 80%', end: 'bottom 55%', scrub: 0.7, animation: tlDoors(false) })
    gsap.fromTo($('#archBox', root), { scale: 1 }, {
      scale: 1.12,
      ease: 'none',
      transformOrigin: '50% 70%',
      scrollTrigger: { trigger: $('#gate', root), start: 'top top', end: 'bottom top', scrub: true },
    })
    return () => {
      ;[...signEls, question, ...trackSigns].forEach((sg) => gsap.set($('.swing', sg), { clearProps: 'all' }))
    }
  }

  /* ---------- still: the markup is the finished picture, except the doors, which open here ---------- */
  function enterStill(): void {
    tlDoors(false).progress(1)
  }

  bays.forEach((svg) => {
    svg.dataset.cropView = svg.getAttribute('viewBox') ?? ''
  })

  /* Choosing a track brings the doors into view: the walk plays on to them, and
     the stack scrolls to them. The doors are already on screen at the end of the
     page, so the walk only has to be told where that is. */
  const onChosen = () => {
    if (toDoors !== null) toDoors()
    else {
      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
      $('.end', root).scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
    }
  }
  root.addEventListener(CHOSEN, onChosen)
  const mm = gsap.matchMedia()
  mm.add(
    {
      walk: '(min-width: 900px) and (min-height: 560px) and (min-aspect-ratio: 6/5) and (prefers-reduced-motion: no-preference)',
      motion: '(prefers-reduced-motion: no-preference)',
      still: '(prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      const { walk, motion, still } = ctx.conditions as Record<string, boolean>
      if (walk || motion) {
        const leave = walk ? enterWalk() : enterStack()
        const unwire = wireOffers()
        return () => {
          unwire()
          leave()
        }
      }
      if (still) enterStill()
      return undefined
    },
  )
  return () => {
    root.removeEventListener(CHOSEN, onChosen)
    mm.revert()
  }
}
