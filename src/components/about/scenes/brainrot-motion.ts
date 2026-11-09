import { gsap } from 'gsap'
import { BIT_READS } from './BrainrotScene'
import { type SceneHandle, snapshot } from './scene'

/**
 * Stall 4 in motion: the playground's 4E timeline (`R4-stall-love.html`, `initE`), one 15-second
 * loop of three memes. Each meme slides up the phone; the reader laughs (eyes shut, mouth open, a
 * tear, ha ha HA) while Bit tilts its head, blinks three dots, and types what it read; the first
 * meme unrolls the AI's forty-part answer out of the phone, the third drops pixel glasses.
 *
 * The server's markup is the still frame, so the parts arrive here in that state; `rest()` puts each
 * one back to where the loop begins before the timeline is built, and `destroy()` returns every
 * attribute to the markup's own (`snapshot`), the font families React wrote included.
 */
export function createBrainrot(scene: HTMLElement): SceneHandle {
  const svg = scene.querySelector('svg')!
  const one = <T extends Element = SVGElement>(name: string) => svg.querySelector<T & SVGElement>(`[data-b="${name}"]`)!
  const many = (name: string) => [...svg.querySelectorAll<SVGElement>(`[data-b="${name}"]`)]

  const parts = [...svg.querySelectorAll<SVGElement>('[data-b]')]
  const restore = snapshot(parts)
  const btext = one('btext')
  const savedText = btext.textContent

  const [m1, m2, m3] = [one('m1'), one('m2'), one('m3')]
  const fish = one('fish')
  const fishIn = one('fishin')
  const bubs = many('bub')
  const doodles = many('doodle')
  const glasses = one('glasses')
  const aura = one('aura')
  const scroll = one('scroll')
  const scClip = one('scrollclip')
  const roll = one('roll')
  const human = one('human')
  const cheeks = many('cheek')
  const eyesN = one('eyes')
  const eyesL = one('eyeslaugh')
  const brows = one('brows')
  const mouthN = one('mouth')
  const mouthL = one('mouthlaugh')
  const tear = one('tear')
  const has = many('ha')
  const head = one('head')
  const rmouth = one('rmouth')
  const dots = many('dot')
  const qm = one('qm')
  const bub = one('bubble')

  /* The loop's first frame. Transforms the still frame wrote as attributes are dropped first, so
     GSAP's own transform starts from the drawing's origin. */
  for (const el of [m2, m3, glasses, aura, roll, ...cheeks, brows, head, ...has]) el.removeAttribute('transform')
  gsap.set([eyesN, mouthN], { opacity: 1 })
  gsap.set([eyesL, mouthL, tear, ...has, rmouth, ...dots, qm, bub], { opacity: 0 })
  gsap.set(rmouth, { opacity: 0.85 })
  gsap.set(cheeks, { opacity: 0.3, scale: 1, transformOrigin: '50% 50%' })
  gsap.set(scroll, { opacity: 0 })
  gsap.set(scClip, { attr: { height: 0 } })
  btext.textContent = ''

  gsap.set(head, { svgOrigin: '450 500' })
  gsap.set(fishIn, { svgOrigin: '0 0' })
  gsap.set(human, { svgOrigin: '150 600' })
  gsap.set(aura, { svgOrigin: '105 208' })

  const loops = [
    gsap.fromTo(fish, { x: 118, y: 160 }, { x: 92, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true }),
    gsap.to(fishIn, { scaleX: -1, duration: 0.18, repeat: -1, repeatDelay: 1.42, yoyo: true, paused: true }),
    ...bubs.map((b, i) =>
      gsap.fromTo(b, { attr: { cy: 150 }, opacity: 1 }, { attr: { cy: 122 }, opacity: 0, duration: 1.6, repeat: -1, delay: i * 0.5, ease: 'sine.out', paused: true }),
    ),
    ...doodles.map((d, i) =>
      gsap.to(d, { y: -8 - (i % 3) * 3, rotation: i % 2 ? 14 : -14, duration: 2.2 + (i % 3) * 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut', paused: true, transformOrigin: '50% 50%' }),
    ),
  ]

  const memes = [m1, m2, m3]
  const tl = gsap.timeline({ paused: true, repeat: -1 })
  tl.set(m1, { y: 0 }, 0).set([m2, m3], { y: 246 }, 0).set(glasses, { y: -120 }, 0).set(aura, { scale: 0 }, 0)
  memes.forEach((m, i) => {
    const b = i * 5
    if (i > 0) {
      tl.to(memes[i - 1], { y: -246, duration: 0.6, ease: 'power3.inOut' }, b).to(m, { y: 0, duration: 0.6, ease: 'power3.inOut' }, b)
    }
    if (i === 0) {
      tl.set(scroll, { opacity: 1 }, b + 0.5)
        .fromTo(scClip, { attr: { height: 0 } }, { attr: { height: 290 }, duration: 1.8, ease: 'power1.inOut', immediateRender: false }, b + 0.5)
        .fromTo(roll, { y: 0 }, { y: 282, duration: 1.8, ease: 'power1.inOut', immediateRender: false }, b + 0.5)
        .to(scroll, { opacity: 0, duration: 0.4 }, b + 4.4)
    }
    if (i === 2) {
      tl.to(glasses, { y: 0, duration: 0.9, ease: 'bounce.out' }, b + 0.6)
        .to(aura, { scale: 1, duration: 0.45, ease: 'back.out(3)' }, b + 1.5)
        .to(glasses, { y: -120, duration: 0.01 }, b + 4.99)
        .to(aura, { scale: 0, duration: 0.01 }, b + 4.99)
    }
    const L = b + (i === 0 ? 1.9 : 1.3)
    tl.to(eyesN, { opacity: 0, duration: 0.1 }, L)
      .to(eyesL, { opacity: 1, duration: 0.1 }, L)
      .to(mouthN, { opacity: 0, duration: 0.1 }, L)
      .to(mouthL, { opacity: 1, duration: 0.12 }, L)
      .to(brows, { y: -4, duration: 0.2 }, L)
      .to(cheeks, { scale: 1.35, opacity: 0.55, duration: 0.3 }, L)
      .to(tear, { opacity: 1, duration: 0.3 }, L + 0.5)
      .to(human, { y: -7, rotation: -1.5, duration: 0.11, yoyo: true, repeat: 13, ease: 'sine.inOut' }, L)
      .to([eyesL, mouthL, tear], { opacity: 0, duration: 0.2 }, b + 4.2)
      .to([eyesN, mouthN], { opacity: 1, duration: 0.2 }, b + 4.2)
      .to(brows, { y: 0, duration: 0.3 }, b + 4.2)
      .to(cheeks, { scale: 1, opacity: 0.3, duration: 0.3 }, b + 4.2)
    has.forEach((h, k) =>
      tl.fromTo(
        h,
        { x: k * 14, y: k * -6, opacity: 0 },
        {
          keyframes: [
            { x: k * 12 - 8, y: -26 - k * 10, opacity: 1, duration: 0.3 },
            { x: k * 10 - 66, y: -80 - k * 14, opacity: 0, duration: 1.1 },
          ],
          immediateRender: false,
        },
        L + 0.1 + k * 0.28,
      ),
    )
    const n = { v: 0 }
    const read = BIT_READS[i]
    tl.to(head, { rotation: 9, duration: 0.5, ease: 'power2.inOut' }, b + 1.2)
      .to(rmouth, { opacity: 0, duration: 0.1 }, b + 1.2)
      .to(dots, { opacity: 1, duration: 0.18, stagger: 0.14, yoyo: true, repeat: 3 }, b + 1.25)
      .to(bub, { opacity: 1, duration: 0.25 }, b + 2.1)
      .fromTo(n, { v: 0 }, { v: read.length, duration: 0.9, ease: 'none', immediateRender: false, onUpdate: () => { btext.textContent = read.slice(0, Math.round(n.v)) } }, b + 2.2)
      .to(qm, { opacity: 1, duration: 0.3 }, b + 2.7)
      .to(head, { rotation: 0, duration: 0.5, ease: 'power2.inOut' }, b + 4.0)
      .to(rmouth, { opacity: 0.85, duration: 0.2 }, b + 4.1)
      .to([bub, qm], { opacity: 0, duration: 0.3 }, b + 4.3)
  })
  tl.to(m3, { y: -246, duration: 0.6, ease: 'power3.inOut' }, 14.4).fromTo(m1, { y: 246 }, { y: 0, duration: 0.6, ease: 'power3.inOut', immediateRender: false }, 14.4)

  let started = false
  return {
    start() {
      loops.forEach((l) => l.play())
      if (!started) {
        started = true
        tl.play(0)
      } else tl.resume()
    },
    stop() {
      tl.pause()
      loops.forEach((l) => l.pause())
    },
    destroy() {
      tl.kill()
      loops.forEach((l) => l.kill())
      restore()
      btext.textContent = savedText
    },
  }
}
