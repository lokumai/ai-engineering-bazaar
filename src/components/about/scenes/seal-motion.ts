import { gsap } from 'gsap'
import { SEAL_LINES } from './SealScene'
import type { SceneHandle } from './scene'

/**
 * Stall 3 in motion: the playground's 3E timeline (`R3-stall-humans.html`), on a loop. The desk tilts
 * in, the reed pen writes each line, crosses out the fourth and writes it again below, lifts, and the
 * seal drops onto the page with a ring of pressure; the desk turns a little and fades, and the loop
 * starts over on an empty page.
 *
 * `destroy()` kills the timeline and clears every property it set, which returns the scene to the
 * server's still picture: the stylesheet draws that, not this file.
 */
export function createSeal(scene: HTMLElement): SceneHandle {
  const desk = scene.querySelector<HTMLElement>('.e-desk')!
  const pen = scene.querySelector<HTMLElement>('.e-pen')!
  const seal = scene.querySelector<HTMLElement>('.e-seal')!
  const ring = scene.querySelector<HTMLElement>('.e-ring')!
  const all = [...scene.querySelectorAll<SVGPathElement>('.e-lines path')]
  const lens = all.map((p) => p.getTotalLength())

  const place = (p: SVGPathElement, len: number, k: number) => {
    const pt = p.getPointAtLength(len * k)
    pen.style.left = `${pt.x / 4}%`
    pen.style.top = `${pt.y / 5.2}%`
  }

  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5 })
  tl.set(all, { opacity: 0 }, 0)
    .set(seal, { opacity: 0 }, 0)
    .set(ring, { opacity: 0 }, 0)
    .set(pen, { opacity: 1 }, 0)
    .fromTo(desk, { rotationX: 52, rotationZ: -10, rotationY: 0, y: 30, opacity: 0 }, { rotationX: 40, rotationZ: -8, y: 0, opacity: 1, duration: 1.3, ease: 'power3.out' }, 0)
  all.forEach((p, i) => {
    tl.set(p, { strokeDasharray: lens[i], strokeDashoffset: lens[i] }, 0)
  })
  let t = 1.1
  // The fourth line is crossed out (the last path) before the fifth is written.
  const order = [0, 1, 2, 3, 6, 4, 5]
  for (const i of order) {
    const p = all[i]
    const len = lens[i]
    const dur = i === SEAL_LINES.length ? 0.45 : SEAL_LINES[i].dur
    const q = { k: 0 }
    tl.fromTo(
      q,
      { k: 0 },
      {
        k: 1,
        duration: dur,
        ease: 'none',
        immediateRender: false,
        onUpdate() {
          p.style.opacity = q.k > 0 ? '1' : '0'
          p.style.strokeDashoffset = String(len * (1 - q.k))
          place(p, len, q.k)
        },
      },
      t,
    )
    t += dur + 0.14
  }
  tl.to(pen, { opacity: 0, duration: 0.4 }, t)
    .fromTo(seal, { opacity: 0, z: 320, rotationZ: -50, scale: 1.1 }, { opacity: 1, z: 0, rotationZ: 0, scale: 1, duration: 0.75, ease: 'power3.in' }, t + 0.25)
    .to(seal, { scaleX: 1.08, scaleY: 0.94, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.out' }, t + 1.0)
    .fromTo(ring, { opacity: 0.8, scale: 0.9 }, { opacity: 0, scale: 1.9, duration: 1.1, ease: 'power2.out' }, t + 1.0)
    .to(desk, { rotationY: 10, rotationX: 32, duration: 2.2, ease: 'sine.inOut' }, t + 1.4)
    .to(desk, { opacity: 0, duration: 0.9 }, t + 4.6)

  let started = false
  return {
    start() {
      if (!started) {
        started = true
        tl.play(0)
      } else tl.resume()
    },
    stop() {
      tl.pause()
    },
    destroy() {
      tl.kill()
      gsap.set([desk, pen, seal, ring, ...all], { clearProps: 'all' })
    },
  }
}
