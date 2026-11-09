import { clamp, reduced } from './model'

/**
 * M91, D116 — the journey owns one number, `t`, the month at the centre of the view, ported from
 * the round-5 mockup's `Journey`.
 *
 * A scene never handles input. The wheel, a drag on the picture, the strip, the year bar and a
 * focused stop all move `target`, and each frame `t` eases toward it and asks the scene to draw
 * itself there. Under reduced motion `t` jumps to `target` in the same frame, so nothing walks.
 * At either end of the road the wheel goes back to the page, so the journey never traps a reader
 * who only meant to scroll.
 */

export interface Drawable {
  /** Draw at `t`; return true while something still moves on its own (the caravan walking). */
  frame(t: number, dt: number, v: number): boolean
  /** How many months the view shows. */
  span(): number
}

export class Journey {
  t: number
  target: number
  private v = 0
  private last = 0
  private raf = 0
  private justDragged = 0
  private readonly listeners: ((t: number) => void)[] = []
  private readonly ac = new AbortController()

  constructor(
    private readonly stage: HTMLElement,
    private readonly scene: Drawable,
    private readonly bounds: { min: () => number; max: () => number },
  ) {
    this.t = this.target = bounds.min()
    const signal = this.ac.signal

    stage.addEventListener('wheel', (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      const px = d * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? stage.clientWidth : 1)
      if ((px < 0 && this.target <= this.min() + 0.01) || (px > 0 && this.target >= this.max() - 0.01)) return
      e.preventDefault()
      this.go(this.target + px / this.pxPerMonth())
    }, { passive: false, signal })

    // A drag on the picture pulls the road; a short press stays a click on a stop.
    let drag: { x: number; y: number; t: number; moved: boolean; id: number } | null = null
    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      drag = { x: e.clientX, y: e.clientY, t: this.target, moved: false, id: e.pointerId }
    }, { signal })
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return
      const dx = e.clientX - drag.x
      if (!drag.moved && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(e.clientY - drag.y)) {
        drag.moved = true
        stage.setPointerCapture(drag.id)
        stage.classList.add('is-drag')
      }
      if (drag.moved) this.go(drag.t - dx / this.pxPerMonth(), true)
    }, { signal })
    const end = () => {
      if (drag?.moved) this.justDragged = performance.now()
      drag = null
      stage.classList.remove('is-drag')
    }
    stage.addEventListener('pointerup', end, { signal })
    stage.addEventListener('pointercancel', end, { signal })
    stage.addEventListener('click', (e) => {
      if (this.justDragged && performance.now() - this.justDragged < 80) {
        e.stopPropagation()
        e.preventDefault()
      }
    }, { capture: true, signal })
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.kick() }, { signal })
    this.kick()
  }

  min(): number { return this.bounds.min() }
  max(): number { return this.bounds.max() }

  private pxPerMonth(): number {
    return this.stage.clientWidth / this.scene.span()
  }

  go(t: number, instant = false): void {
    this.target = clamp(t, this.min(), this.max())
    if (instant || reduced()) this.t = this.target
    this.kick()
  }

  on(fn: (t: number) => void): void {
    this.listeners.push(fn)
  }

  kick(): void {
    if (this.raf === 0) {
      this.last = performance.now()
      this.raf = requestAnimationFrame((now) => this.frame(now))
    }
  }

  private frame(now: number): void {
    this.raf = 0
    const dt = Math.min(0.12, (now - this.last) / 1000)
    this.last = now
    const prev = this.t
    if (reduced()) this.t = this.target
    else this.t += (this.target - this.t) * (1 - Math.exp(-dt * 5.5))
    if (Math.abs(this.target - this.t) < 0.0015) this.t = this.target
    this.v = dt > 0 ? (this.t - prev) / dt : 0
    const busy = this.scene.frame(this.t, dt, this.v)
    for (const fn of this.listeners) fn(this.t)
    if (this.t !== this.target || (busy && !reduced() && !document.hidden)) this.kick()
  }

  destroy(): void {
    this.ac.abort()
    cancelAnimationFrame(this.raf)
    this.raf = -1
  }
}
