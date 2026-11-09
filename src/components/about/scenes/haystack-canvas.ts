import {
  HAY,
  NEEDLE_L,
  NEEDLE_WIDTH,
  RAMP,
  WIDTHS,
  WIDTH_ORDER,
  along,
  clamp,
  haystack,
  lerp,
  mix,
  rgba,
  smooth,
} from './haystack-geometry'
import type { SceneHandle } from './scene'

/**
 * Stall 2 in motion: the playground's canvas (`R2-stall-haystack.html`, `haystack()`), ported line for
 * line. The scroll drives `progress.p` from 0 (the whole stack) to 1 (the needle bare); the clock
 * drives the sway, the drifting straws, the motes in the beam and the glint that runs down the
 * needle. The bed is painted once to an offscreen canvas per size.
 *
 * The canvas is transparent, so the stack sits on whatever ground the stall is at, and it only runs
 * while `start()` has been called: the island starts it when the stall nears the screen and stops it
 * when it leaves.
 */

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

export function createHaystack(scene: HTMLElement): SceneHandle {
  const still = scene.querySelector<SVGElement>('.scene-still')
  const cv = document.createElement('canvas')
  cv.className = 'scene-canvas'
  cv.setAttribute('aria-hidden', 'true')
  scene.appendChild(cv)
  if (still) still.style.visibility = 'hidden'
  const ctx = cv.getContext('2d')!
  const bed = document.createElement('canvas')
  const bx = bed.getContext('2d')!
  const { keep, fly, motes, drift } = haystack()
  const progress = { p: 0 }
  let k = 1
  let t = 0
  let raf = 0
  let last = 0

  const seg = (c: CanvasRenderingContext2D, x: number, y: number, a: number, l: number) => {
    const dx = (Math.cos(a) * l) / 2
    const dy = (Math.sin(a) * l) / 2
    c.moveTo(x - dx, y - dy)
    c.lineTo(x + dx, y + dy)
  }

  function paintBed() {
    bed.width = cv.width
    bed.height = cv.height
    bx.setTransform(k, 0, 0, k, 0, 0)
    bx.lineCap = 'round'
    for (const wi of WIDTH_ORDER) {
      for (let ci = 0; ci < RAMP.length; ci++) {
        bx.beginPath()
        for (const s of keep) if (s.ci === ci && s.wi === wi) seg(bx, s.x, s.y, s.ang, s.len)
        bx.strokeStyle = RAMP[ci]
        bx.lineWidth = WIDTHS[wi]
        bx.stroke()
      }
    }
  }

  function resize() {
    const w = scene.clientWidth || 1
    const d = Math.min(2, window.devicePixelRatio || 1)
    cv.width = Math.round(w * d)
    cv.height = Math.round(w * d)
    k = cv.width / 1000
    paintBed()
  }

  function needle() {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const [ex, ey] = along(18, 0)
    ctx.beginPath()
    ctx.moveTo(ex, ey)
    ctx.bezierCurveTo(290, 612, 232, 600, 214, 642)
    ctx.bezierCurveTo(196, 684, 262, 708, 236, 748)
    ctx.bezierCurveTo(214, 782, 160, 772, 130, 808)
    ctx.strokeStyle = HAY.crimson
    ctx.lineWidth = 4.8
    ctx.stroke()
    ctx.strokeStyle = HAY.rose
    ctx.lineWidth = 2.2
    ctx.stroke()
    const w0 = NEEDLE_WIDTH
    const L = NEEDLE_L
    ctx.beginPath()
    ctx.moveTo(...along(0, w0))
    ctx.lineTo(...along(L * 0.8, w0 * 0.74))
    ctx.quadraticCurveTo(...along(L * 0.95, w0 * 0.3), ...along(L, 0))
    ctx.quadraticCurveTo(...along(L * 0.95, -w0 * 0.3), ...along(L * 0.8, -w0 * 0.74))
    ctx.lineTo(...along(0, -w0))
    ctx.quadraticCurveTo(...along(-w0 * 1.2, 0), ...along(0, w0))
    const [g1x, g1y] = along(L * 0.4, w0 + 1)
    const [g2x, g2y] = along(L * 0.4, -w0 - 1)
    const g = ctx.createLinearGradient(g1x, g1y, g2x, g2y)
    g.addColorStop(0, '#454c60')
    g.addColorStop(0.3, HAY.steel)
    g.addColorStop(0.46, '#ffffff')
    g.addColorStop(0.62, mix(HAY.steel, '#000000', 0.3))
    g.addColorStop(1, '#353b4d')
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = 'rgba(8,8,20,.55)'
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(...along(9, 0))
    ctx.lineTo(...along(27, 0))
    ctx.strokeStyle = 'rgba(14,13,32,.95)'
    ctx.lineWidth = 3.4
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(...along(18, 0))
    ctx.bezierCurveTo(...along(26, -12), ...along(44, -22), ...along(64, -18))
    ctx.strokeStyle = HAY.rose
    ctx.lineWidth = 2.2
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(...along(32, w0 * 0.42))
    ctx.lineTo(...along(L * 0.9, w0 * 0.14))
    ctx.strokeStyle = 'rgba(255,255,255,.55)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  function star(x: number, y: number, s: number, a: number) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-0.28)
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.45)
    rg.addColorStop(0, `rgba(255,255,255,${a})`)
    rg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = rg
    ctx.fillRect(-s, -s, 2 * s, 2 * s)
    ctx.fillStyle = `rgba(255,252,240,${a * 0.95})`
    for (const [r, l, w] of [
      [0, s, 2.4],
      [Math.PI / 2, s * 0.62, 2],
      [Math.PI / 4, s * 0.3, 1.4],
      [-Math.PI / 4, s * 0.3, 1.4],
    ]) {
      ctx.save()
      ctx.rotate(r)
      ctx.beginPath()
      ctx.moveTo(-l, 0)
      ctx.lineTo(0, -w)
      ctx.lineTo(l, 0)
      ctx.lineTo(0, w)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  }

  function render() {
    const p = progress.p
    const rev = smooth(0.62, 0.95, p)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, cv.width, cv.height)
    ctx.setTransform(k, 0, 0, k, 0, 0)
    let g: CanvasGradient = ctx.createRadialGradient(510, 610, 10, 510, 610, 470)
    g.addColorStop(0, rgba(HAY.gold, 0.12 + 0.1 * rev))
    g.addColorStop(1, rgba(HAY.gold, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 1000, 1000)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    g = ctx.createLinearGradient(240, 0, 560, 740)
    g.addColorStop(0, rgba(HAY.sand, 0.09 + 0.06 * rev))
    g.addColorStop(1, rgba(HAY.sand, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(130, -10)
    ctx.lineTo(360, -10)
    ctx.lineTo(730, 700)
    ctx.lineTo(380, 750)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    ctx.save()
    ctx.translate(500, 806)
    ctx.scale(1, 0.15)
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, 480)
    g.addColorStop(0, 'rgba(0,0,0,.6)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(-500, -500, 1000, 1000)
    ctx.restore()
    ctx.drawImage(bed, 0, 0, 1000, 1000)
    needle()
    ctx.lineCap = 'round'
    const paths = Array.from({ length: 15 }, () => new Path2D())
    for (const s of fly) {
      const q = clamp((p - (s.th ?? 0)) / 0.26)
      if (q >= 1) continue
      const sway = Math.sin(t * 1.25 + s.x * 0.013 + s.r3 * 3) * 0.05 * s.v * (1 - q)
      if (q === 0) {
        const shiver = p > (s.th ?? 0) - 0.07 ? Math.sin(t * 26 + s.r1 * 40) * 0.05 : 0
        const a = s.ang + sway + shiver
        const dx = (Math.cos(a) * s.len) / 2
        const dy = (Math.sin(a) * s.len) / 2
        const pa = paths[s.wi * 5 + s.ci]
        pa.moveTo(s.x - dx, s.y - dy)
        pa.lineTo(s.x + dx, s.y + dy)
      } else {
        const e = Math.pow(q, 1.6)
        const x = s.x + e * (600 + s.r1 * 700)
        const y = s.y - e * (120 + s.r2 * 380) + Math.sin(e * 5 + s.r3 * 6) * 45 * e
        ctx.globalAlpha = (1 - smooth(0.55, 1, q)) * (1 - smooth(760, 980, x)) * smooth(10, 140, y)
        ctx.beginPath()
        seg(ctx, x, y, s.ang + sway + e * (s.r4 - 0.5) * 7, s.len)
        ctx.strokeStyle = RAMP[s.ci]
        ctx.lineWidth = WIDTHS[s.wi]
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }
    for (const wi of WIDTH_ORDER) {
      for (let ci = 0; ci < 5; ci++) {
        ctx.strokeStyle = RAMP[ci]
        ctx.lineWidth = WIDTHS[wi]
        ctx.stroke(paths[wi * 5 + ci])
      }
    }
    if (rev > 0) {
      for (const d of drift) {
        const x = ((t * 44 * d.sp + d.off) % 1300) - 150
        const y = d.y + Math.sin(t * 0.8 + d.ph) * 22
        ctx.globalAlpha = rev * 0.5 * smooth(-40, 120, x) * (1 - smooth(860, 1040, x))
        ctx.beginPath()
        seg(ctx, x, y, Math.sin(t * 0.5 + d.ph) * 1.4, d.len)
        ctx.strokeStyle = RAMP[3]
        ctx.lineWidth = 1.4
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const [mx, my] = along(NEEDLE_L * 0.5, 0)
      g = ctx.createRadialGradient(mx, my, 0, mx, my, 280)
      g.addColorStop(0, rgba(HAY.steel, 0.13 * rev))
      g.addColorStop(1, rgba(HAY.steel, 0))
      ctx.fillStyle = g
      ctx.fillRect(mx - 300, my - 300, 600, 600)
      const cyc = (t % 3.6) / 3.6
      if (cyc < 0.55) {
        const s = cyc / 0.55
        const [x, y] = along(NEEDLE_L * (0.06 + 0.9 * ease(s)), 0)
        const a = 0.75 * rev * Math.sin(Math.PI * s)
        g = ctx.createRadialGradient(x, y, 0, x, y, 36)
        g.addColorStop(0, `rgba(255,255,255,${a})`)
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(x - 40, y - 40, 80, 80)
      }
      const f = smooth(0.42, 0.55, cyc) * (1 - smooth(0.58, 0.95, cyc))
      if (f > 0) {
        const [x, y] = along(NEEDLE_L * 0.86, 0)
        star(x, y, 110 * f + 24, rev * f)
      }
      ctx.restore()
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const m of motes) {
      const s = (m.s + t * 0.012 * m.sp) % 1
      const x = lerp(250, 560, s) + (m.c - 0.5) * lerp(220, 330, s) + Math.sin(t * 0.5 + m.ph) * 8
      const y = lerp(0, 720, s)
      ctx.fillStyle = rgba(HAY.sand, (0.14 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.7 + m.ph))) * (0.35 + 0.65 * rev))
      ctx.beginPath()
      ctx.arc(x, y, m.r, 0, 6.283)
      ctx.fill()
    }
    ctx.restore()
  }

  function tick(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0)
    last = now
    t += dt
    render()
    raf = requestAnimationFrame(tick)
  }

  const observer = new ResizeObserver(() => {
    resize()
    if (!raf) render()
  })
  observer.observe(scene)
  resize()
  render()

  return {
    progress,
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
      observer.disconnect()
      cv.remove()
      if (still) still.style.visibility = ''
    },
  }
}
