import { gsap } from 'gsap'
import { LIGHT_FROM, LIGHT_TO } from './EngravingScene'
import { type SceneHandle, snapshot } from './scene'

/**
 * Stall 5 in motion: the playground's 5A timeline (`R5-stall-nietzsche.html`). The plate warms in, the
 * line is inked stroke by stroke, then the brows, the eyes, the tones, the moustache, the hair and the
 * hatching; the caption arrives and the gaze lifts; after that the light keeps travelling across the
 * face, there and back, for as long as the stall is on screen.
 *
 * It plays once per visit to the stall: leaving pauses it, coming back resumes it.
 */
export function createEngraving(scene: HTMLElement): SceneHandle {
  const svg = scene.querySelector('svg')!
  const $ = (q: string) => [...svg.querySelectorAll<SVGElement>(q)]
  const lines = $('.ln, .hs, .ms, .bs, .ht')
  const irises = $('.iris')
  const light = svg.querySelector<SVGRadialGradientElement>('.nz-light')!
  const plate = $('.nz-plate')
  const fades = $('.nz-tones, .nz-eyes, .nz-cap, .nz-sweep')
  const restore = snapshot([...lines, ...irises, light, ...plate, ...fades])

  for (const iris of irises) iris.removeAttribute('transform')
  gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 })
  gsap.set(fades, { opacity: 0 })
  gsap.set(plate, { opacity: 0, scale: 0.96, svgOrigin: '200 192' })
  gsap.set(irises, { x: 1.5, y: 2.6 })
  light.setAttribute('gradientTransform', LIGHT_FROM)

  const q = (s: string) => svg.querySelectorAll(s)
  const tl = gsap.timeline({ paused: true })
  tl.to(plate, { opacity: 1, scale: 1, duration: 1.4, ease: 'power2.out' })
    .to(q('.nz-lines .ln'), { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut', stagger: 0.11 }, 0.6)
    .to(q('.nz-brow .bs'), { strokeDashoffset: 0, duration: 0.35, stagger: 0.025 }, 1.6)
    .to(q('.nz-eyes'), { opacity: 1, duration: 0.8 }, 2.0)
    .to(q('.nz-tones'), { opacity: 1, duration: 1.6, ease: 'power1.inOut' }, 2.6)
    .to(q('.nz-stache .ms'), { strokeDashoffset: 0, duration: 0.6, stagger: { each: 0.025, from: 'center' } }, 2.9)
    .to(q('.nz-hair .hs'), { strokeDashoffset: 0, duration: 0.6, stagger: { each: 0.018, from: 'random' } }, 3.1)
    .to(q('.nz-hatch .ht'), { strokeDashoffset: 0, duration: 0.5, stagger: { each: 0.006, from: 'start' } }, 3.6)
    .to(q('.nz-cap'), { opacity: 1, duration: 1.2 }, 5.2)
    .to(irises, { x: -1.4, y: -0.4, duration: 2.4, ease: 'power2.inOut' }, 5.4)
    .to(q('.nz-sweep'), { opacity: 1, duration: 1.5 }, 5.2)
  const sweep = gsap
    .timeline({ repeat: -1, yoyo: true, paused: true })
    .fromTo(light, { attr: { gradientTransform: LIGHT_FROM } }, { attr: { gradientTransform: LIGHT_TO }, duration: 7, ease: 'sine.inOut' })

  let running = false
  let started = false
  tl.call(() => {
    if (running) sweep.play()
  })

  return {
    start() {
      running = true
      if (!started) {
        started = true
        tl.play(0)
      } else {
        tl.resume()
        if (tl.progress() === 1) sweep.play()
      }
    },
    stop() {
      running = false
      tl.pause()
      sweep.pause()
    },
    destroy() {
      tl.kill()
      sweep.kill()
      restore()
    },
  }
}
