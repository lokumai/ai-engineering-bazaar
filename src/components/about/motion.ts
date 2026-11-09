import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createBrainrot } from './scenes/brainrot-motion'
import { createEngraving } from './scenes/engraving-motion'
import { createHaystack } from './scenes/haystack-canvas'
import type { SceneHandle } from './scenes/scene'
import { createSeal } from './scenes/seal-motion'

/**
 * The About page's motion: F1, "Procession", on B2, "Dusk to dawn" (D115), ported from
 * `playground/2026-11-round-5/R0-about-design.html`.
 *
 * On a wide screen each stall PINS under the bar and plays under the scroll: its scene slides in from
 * its own side, the number arrives, the heading rises word by word and then the text line by line,
 * it holds, and it dims as the next one comes. A long push of the wheel moves through one stall,
 * which is the heaviness the author asked for, and it is the scroll doing it: no wheel handling, so
 * the keyboard, a scrollbar and a trackpad all work as they do everywhere else. The gate arch draws
 * itself round the title and again round the motto, and the ground changes colour from stall to
 * stall until the motto arrives at dawn.
 *
 * Below 900px nothing pins: each stall's text and scene rise into place when the stall arrives.
 *
 * Under `prefers-reduced-motion: reduce` this module does nothing at all, and the server's page is
 * what the reader gets: every word visible, each section on its own ground, each scene a still.
 *
 * Scenes run only near the screen: each is wrapped (created) the first time its stall comes within
 * reach, started while it is on screen and stopped when it leaves.
 *
 * Everything here is undone by the function `initAbout` returns: triggers and pins are reverted,
 * split text is put back as the very nodes React rendered, and each scene restores its still.
 */

type Cleanup = () => void

const RM = '(prefers-reduced-motion: reduce)'
const WIDE = '(min-width: 900px)'

const SCENES: Record<string, (scene: HTMLElement) => SceneHandle> = {
  haystack: createHaystack,
  seal: createSeal,
  brainrot: createBrainrot,
  engraving: createEngraving,
}

/** Every text node under `el`, replaced by one span per word; returns the words' inner spans and how to undo it. */
function splitWords(el: HTMLElement, undo: Cleanup[]): HTMLElement[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  const inner: HTMLElement[] = []
  for (const node of nodes) {
    const frag = document.createDocumentFragment()
    const added: Node[] = []
    for (const part of (node.nodeValue ?? '').split(/(\s+)/)) {
      if (!part) continue
      if (/^\s+$/.test(part)) {
        const space = document.createTextNode(' ')
        frag.append(space)
        added.push(space)
        continue
      }
      const w = document.createElement('span')
      w.className = 'sw'
      const i = document.createElement('span')
      i.className = 'swi'
      i.textContent = part
      w.append(i)
      frag.append(w)
      added.push(w)
      inner.push(i)
    }
    if (added.length === 0) continue
    const parent = node.parentNode!
    parent.replaceChild(frag, node)
    undo.push(() => {
      parent.insertBefore(node, added[0])
      for (const one of added) one.parentNode?.removeChild(one)
    })
  }
  return inner
}

/** A paragraph cut into the lines it wraps to at this width; returns the lines' inner spans. */
function splitLines(el: HTMLElement, undo: Cleanup[]): HTMLElement[] {
  const original = [...el.childNodes]
  const words = (el.textContent ?? '').trim().split(/\s+/)
  el.replaceChildren(
    ...words.flatMap((word, i) => {
      const w = document.createElement('span')
      w.className = 'sw'
      w.textContent = word
      return i ? [document.createTextNode(' '), w] : [w]
    }),
  )
  const lines: string[][] = []
  let top: number | null = null
  for (const w of el.querySelectorAll<HTMLElement>('.sw')) {
    if (top === null || Math.abs(w.offsetTop - top) > 4) {
      lines.push([])
      top = w.offsetTop
    }
    lines.at(-1)!.push(w.textContent ?? '')
  }
  const inner: HTMLElement[] = []
  el.replaceChildren(
    ...lines.flatMap((line, i) => {
      const ln = document.createElement('span')
      ln.className = 'sln'
      const li = document.createElement('span')
      li.className = 'sli'
      li.textContent = line.join(' ')
      ln.append(li)
      inner.push(li)
      return i ? [document.createTextNode(' '), ln] : [ln]
    }),
  )
  undo.push(() => el.replaceChildren(...original))
  return inner
}

/** The two strokes of a gate arch, drawn on, and its finial. */
function drawArch(svg: SVGSVGElement | null, tl: gsap.core.Timeline, at: number, dur: number) {
  if (!svg) return
  svg.querySelectorAll<SVGPathElement>('path').forEach((p, k) => {
    const len = p.getTotalLength()
    tl.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: dur, ease: 'power2.inOut' }, at + k * dur * 0.12)
  })
  const finial = svg.querySelector('rect')
  if (finial) tl.from(finial, { opacity: 0, scale: 0, transformOrigin: '50% 50%', duration: dur * 0.3, ease: 'back.out(2)' }, at + dur * 0.8)
}

/** The bar, which stays on screen; every pin starts under it. (The band under it scrolls away.) */
function chromeHeight(): number {
  return Math.round(document.querySelector('.bz-bar')?.getBoundingClientRect().height ?? 0)
}

function setup(root: HTMLElement, wide: boolean): Cleanup {
  gsap.registerPlugin(ScrollTrigger)
  const undo: Cleanup[] = []
  const handles = new Map<HTMLElement, SceneHandle>()
  const progress = new Map<HTMLElement, { p: number }>()
  const chrome = chromeHeight()
  const ground = root.querySelector<HTMLElement>('.ground')!
  const sections = [...root.querySelectorAll<HTMLElement>('[data-sec]')]
  root.dataset.motion = wide ? 'wide' : 'narrow'
  root.style.setProperty('--chrome', `${chrome}px`)

  const ctx = gsap.context(() => {
    /* ---- the hero: the arch draws itself, the title rises */
    const hero = root.querySelector<HTMLElement>('.hero')!
    const intro = gsap.timeline({ delay: 0.15 })
    drawArch(hero.querySelector('svg.arch'), intro, 0, 2.4)
    intro.from(splitWords(hero.querySelector('h1')!, undo), { yPercent: 115, duration: 1.5, stagger: 0.1, ease: 'power4.out' }, 0.5)
    intro.from(hero.querySelector('.cue'), { opacity: 0, duration: 1 }, 1.6)
    if (wide) {
      gsap.to(hero.querySelector('.hero-in'), {
        yPercent: -8,
        scale: 0.93,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: `top top+=${chrome}`, end: `bottom top+=${chrome}`, scrub: 1.2 },
      })
    }

    /* ---- the stalls */
    for (const stall of root.querySelectorAll<HTMLElement>('.stall')) {
      const slot = stall.querySelector<HTMLElement>('.slot')!
      const num = stall.querySelector<HTMLElement>('.num')
      const copy = stall.querySelector<HTMLElement>('.copy')!
      const inner = stall.querySelector<HTMLElement>('.stall-in')!
      const scene = stall.querySelector<HTMLElement>('[data-scene]')
      const dir = stall.classList.contains('flip') ? -1 : 1
      const head = splitWords(stall.querySelector('h2')!, undo)
      const lines = [...copy.querySelectorAll<HTMLElement>('p')].flatMap((p) => splitLines(p, undo))
      const own = { p: 0 }
      if (scene) progress.set(scene, own)

      if (!wide) {
        const tl = gsap.timeline({ paused: true })
        tl.from(slot, { opacity: 0, scale: 0.94, duration: 1.3, ease: 'power3.out' }, 0)
          .from(num, { opacity: 0, y: 12, duration: 0.8, ease: 'power2.out' }, 0.1)
          .from(head, { yPercent: 118, duration: 1.05, stagger: 0.045, ease: 'power4.out' }, 0.15)
          .from(lines, { yPercent: 100, opacity: 0, duration: 0.95, stagger: 0.07, ease: 'power3.out' }, 0.5)
        ScrollTrigger.create({ trigger: stall, start: 'top 72%', once: true, onEnter: () => void tl.play() })
        // A scroll-driven scene follows the stall through the screen instead.
        gsap.to(own, { p: 1, ease: 'none', scrollTrigger: { trigger: slot, start: 'top 82%', end: 'center 45%', scrub: 1.6 } })
        continue
      }

      const pin = ScrollTrigger.create({ trigger: stall, start: `top top+=${chrome}`, end: '+=150%', pin: inner, anticipatePin: 1 })
      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: stall, start: 'top 62%', end: () => pin.end, scrub: 1.4 } })
      tl.from(slot, { xPercent: 16 * dir, opacity: 0, scale: 0.92, rotation: 2 * dir, duration: 0.3, ease: 'power2.out' }, 0)
        .from(num, { opacity: 0, x: -24, duration: 0.12 }, 0.12)
        .from(head, { yPercent: 118, duration: 0.2, stagger: 0.022, ease: 'power3.out' }, 0.16)
        .from(lines, { yPercent: 100, opacity: 0, duration: 0.16, stagger: 0.03, ease: 'power2.out' }, 0.36)
        .to(own, { p: 1, duration: 0.5 }, 0.08)
        .to({}, { duration: 0.3 })
        .to([copy, slot], { opacity: 0.1, y: -36, duration: 0.14, ease: 'power1.in' })
    }

    /* ---- the motto, at dawn, in the arch again, underlined by hand */
    const motto = root.querySelector<HTMLElement>('.motto')
    if (motto) {
      const lead = motto.querySelector('.motto-k')
      const words = splitWords(motto.querySelector('.motto-q')!, undo)
      const stroke = motto.querySelector('.motto-stroke')
      const dot = motto.querySelector('.motto-dot')
      const arch = motto.querySelector<SVGSVGElement>('svg.arch')
      if (!wide) {
        const tl = gsap.timeline({ paused: true })
        drawArch(arch, tl, 0, 2)
        tl.from(lead, { opacity: 0, duration: 1 }, 0.4)
          .from(words, { yPercent: 115, duration: 1.1, stagger: 0.07, ease: 'power4.out' }, 0.6)
          .fromTo(stroke, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 1.4)
          .from(dot, { opacity: 0, scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(3)' }, 2.8)
        ScrollTrigger.create({ trigger: motto, start: 'top 70%', once: true, onEnter: () => void tl.play() })
      } else {
        const inner = motto.querySelector<HTMLElement>('.motto-in')!
        const pin = ScrollTrigger.create({ trigger: motto, start: `top top+=${chrome}`, end: '+=110%', pin: inner, anticipatePin: 1 })
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: motto, start: 'top 60%', end: () => pin.end - innerHeight * 0.25, scrub: 1.4 },
        })
        drawArch(arch, tl, 0, 0.5)
        tl.from(lead, { opacity: 0, y: 16, duration: 0.15 }, 0.25)
          .from(words, { yPercent: 115, opacity: 0, duration: 0.2, stagger: 0.05, ease: 'power3.out' }, 0.32)
          .fromTo(stroke, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3, ease: 'power2.inOut' }, 0.62)
          .from(dot, { opacity: 0, scale: 0, transformOrigin: '50% 50%', duration: 0.08, ease: 'back.out(3)' }, 0.9)
      }
    }

    /* ---- which section the reader is in: the rail, the ground, and dawn */
    const rail = [...root.querySelectorAll<HTMLElement>('.rail a')]
    for (const section of sections) {
      ScrollTrigger.create({
        trigger: section,
        start: 'top 50%',
        end: 'bottom 50%',
        onToggle: (self) => {
          if (!self.isActive) return
          const key = section.dataset.sec
          for (const a of rail) {
            if (a.dataset.k === key) a.setAttribute('aria-current', 'true')
            else a.removeAttribute('aria-current')
          }
          const colour = getComputedStyle(section).getPropertyValue('--sec-ground').trim()
          if (colour) gsap.to(ground, { backgroundColor: colour, duration: 1.9, ease: 'sine.inOut', overwrite: 'auto' })
          root.style.setProperty('--act', getComputedStyle(section).getPropertyValue('--hue').trim())
          if (key === 'motto') root.dataset.dawn = ''
          else delete root.dataset.dawn
        },
      })
    }
  }, root)

  /* ---- the scenes, created when their stall comes within reach and run only while on screen */
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const scene = entry.target as HTMLElement
        let handle = handles.get(scene)
        if (entry.isIntersecting) {
          if (!handle) {
            const make = SCENES[scene.dataset.scene ?? '']
            if (!make) continue
            handle = make(scene)
            handles.set(scene, handle)
            // A scroll-driven scene follows its stall's timeline, which tweens `own` from the start.
            const own = progress.get(scene)
            if (own && handle.progress) {
              const canvas = handle.progress
              gsap.ticker.add(follow)
              undo.push(() => gsap.ticker.remove(follow))
              function follow() {
                canvas.p = own!.p
              }
            }
          }
          handle.start()
        } else handle?.stop()
      }
    },
    { rootMargin: '20% 0px 20% 0px' },
  )
  for (const scene of root.querySelectorAll<HTMLElement>('[data-scene]')) io.observe(scene)

  ScrollTrigger.refresh()

  return () => {
    io.disconnect()
    for (const handle of handles.values()) handle.destroy()
    ctx.revert()
    for (const step of undo.reverse()) step()
    gsap.killTweensOf(ground)
    ground.style.backgroundColor = ''
    root.style.removeProperty('--chrome')
    root.style.removeProperty('--act')
    delete root.dataset.motion
    delete root.dataset.dawn
    for (const a of root.querySelectorAll('.rail a')) a.removeAttribute('aria-current')
  }
}

export function initAbout(root: HTMLElement): Cleanup {
  const reduce = matchMedia(RM)
  const wide = matchMedia(WIDE)
  let teardown: Cleanup | null = null
  let token = 0
  let lastWidth = innerWidth
  let timer = 0

  const build = () => {
    const mine = ++token
    teardown?.()
    teardown = null
    if (reduce.matches) return
    // Lines are measured, so the faces must have arrived first; never wait longer than a moment.
    void Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]).then(() => {
      if (mine === token) teardown = setup(root, wide.matches)
    })
  }
  const onResize = () => {
    clearTimeout(timer)
    timer = window.setTimeout(() => {
      if (Math.abs(innerWidth - lastWidth) > 40) {
        lastWidth = innerWidth
        build()
      }
    }, 250)
  }

  build()
  reduce.addEventListener('change', build)
  wide.addEventListener('change', build)
  addEventListener('resize', onResize)
  return () => {
    token++
    clearTimeout(timer)
    reduce.removeEventListener('change', build)
    wide.removeEventListener('change', build)
    removeEventListener('resize', onResize)
    teardown?.()
    teardown = null
  }
}
