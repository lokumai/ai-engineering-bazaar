import type { SceneHandle } from './scene'
import { LOOP, STILL_AT, type Frame, frame } from './treaty'

/**
 * Stall 1 in motion: `frame(t)` applied to the nodes the server drew, every animation frame while the
 * stall is on screen, on the playground's 16.5-second loop. The bubbles fade in and out over a few
 * frames rather than by a CSS transition (a surface may not transition an opacity), and `destroy()`
 * puts the still frame back.
 */
export function createTreaty(scene: HTMLElement): SceneHandle {
  const svg = scene.querySelector('svg')!
  const one = <T extends Element>(q: string) => svg.querySelector<T>(q)!
  const all = <T extends Element>(q: string) => [...svg.querySelectorAll<T>(q)]
  const strip = one<SVGPathElement>('.t-strip')
  const stack = one<SVGPathElement>('.t-stack')
  const fest = all<SVGPathElement>('.t-fest path')
  const dips = all<SVGGElement>('.t-dip').map((g) => ({
    au: g.querySelector('.t-au')!, ad: g.querySelector('.t-ad')!, qu: g.querySelector('.t-qu')!, hd: g.querySelector('.t-hd')!,
  }))
  const her = {
    head: one('.t-head'), open: one('.t-open'), shut: one('.t-shut'), brow: one('.t-brow'), hem: one('.t-hem'), lips: one('.t-lips'),
    smile: one('.t-smile'), zz: one('.t-zz'), page: one('.t-page'), rest: one('.t-rest'), use: one('.t-use'), tilt: one('.t-tilt'),
    arm: one('.t-arm'), steam: one('.t-steam'),
  }
  const ask = scene.querySelector<HTMLElement>('[data-t="ask"]')!
  /* The reading diplomats' bubble exists only while the scene moves: the still shows the question and the
     paper that answers it, and a bubble with nothing in it would be a hidden element in the no-script page
     (M114). It takes the question's look, without the "earlier" size. */
  const reply = document.createElement('div')
  reply.className = ask.className.replace(/\bt-earlier\b/, '').trim()
  reply.dataset.t = 'reply'
  reply.setAttribute('aria-hidden', 'true')
  reply.style.opacity = '0'
  ask.after(reply)
  const tally = scene.querySelector<HTMLElement>('[data-t="tally"]')!
  const tallyPage = tally.querySelector('b')!

  const vis = (el: Element, on: boolean) => el.setAttribute('visibility', on ? 'visible' : 'hidden')
  const fade = { ask: 0, reply: 0, tally: 0 }
  let replyText = ''

  function apply(f: Frame, dt: number) {
    strip.setAttribute('d', f.strip)
    stack.setAttribute('d', f.stack)
    f.fest.forEach((d, i) => {
      fest[i * 2].setAttribute('d', d)
      fest[i * 2 + 1].setAttribute('d', d)
    })
    f.dips.forEach((d, i) => {
      vis(dips[i].au, d.holding)
      vis(dips[i].ad, !d.holding)
      vis(dips[i].qu, d.quill)
      dips[i].hd.setAttribute('transform', d.head)
    })
    const h = f.her
    her.head.setAttribute('transform', h.head)
    vis(her.open, !h.asleep)
    vis(her.shut, h.asleep)
    her.brow.setAttribute('transform', h.brow)
    her.hem.setAttribute('transform', h.hem)
    vis(her.smile, h.smiling)
    vis(her.lips, !h.smiling)
    vis(her.zz, h.asleep)
    her.zz.setAttribute('transform', h.zz)
    vis(her.page, h.page)
    vis(her.rest, h.cupOut)
    vis(her.use, !h.cupOut)
    her.tilt.setAttribute('transform', h.cupTilt)
    her.arm.setAttribute('transform', h.arm)
    her.use.setAttribute('transform', h.raised)
    her.steam.setAttribute('transform', h.steam)
    her.steam.setAttribute('opacity', h.steamOpacity)

    tallyPage.textContent = String(f.tally.page)
    const k = Math.min(1, dt * 8)
    fade.ask += ((f.ask.on ? 1 : 0) - fade.ask) * k
    fade.reply += ((f.reply.on ? 1 : 0) - fade.reply) * k
    fade.tally += ((f.tally.on ? 1 : 0) - fade.tally) * k
    ask.style.left = `${f.ask.left}%`
    ask.style.top = `${f.ask.top}%`
    ask.style.opacity = fade.ask.toFixed(3)
    reply.style.left = `${f.reply.left}%`
    reply.style.top = `${f.reply.top}%`
    reply.style.opacity = fade.reply.toFixed(3)
    tally.style.opacity = fade.tally.toFixed(3)
    if (f.reply.text !== replyText) {
      replyText = f.reply.text
      reply.replaceChildren(f.reply.text)
    }
  }

  let t = 0
  let raf = 0
  let last = 0
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0)
    last = now
    t = (t + dt) % LOOP
    apply(frame(t), dt)
    raf = requestAnimationFrame(tick)
  }
  // The loop starts from its first moment: the question, an empty cup, the whole treaty to come. The
  // still's smaller "earlier" question becomes the loop's own bubble.
  const askStyle = ask.getAttribute('style')
  const askClass = ask.getAttribute('class') ?? ''
  ask.classList.remove('t-earlier')
  fade.ask = fade.reply = fade.tally = 0
  apply(frame(0), 0)

  return {
    start() {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(tick)
    },
    stop() {
      cancelAnimationFrame(raf)
      raf = 0
    },
    destroy() {
      cancelAnimationFrame(raf)
      raf = 0
      const f = frame(STILL_AT)
      fade.ask = f.ask.on ? 1 : 0
      fade.reply = f.reply.on ? 1 : 0
      fade.tally = f.tally.on ? 1 : 0
      apply(f, 0)
      reply.remove()
      ask.setAttribute('class', askClass)
      if (askStyle === null) ask.removeAttribute('style')
      else ask.setAttribute('style', askStyle)
    },
  }
}
