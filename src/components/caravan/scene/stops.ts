import type { Journey } from './journey'
import { clamp, isPhone, type Placed } from './model'

/**
 * M91, D116 — the stops: real buttons laid over the picture, one per trend, ported from the round-5
 * mockup's `Stops`.
 *
 * Hover or focus lights a stop, opens its card and dims the rest, and the stop says so
 * (`aria-expanded`); a click, a tap or Enter (the button's own click) keeps it and moves focus into
 * the card, so its links are reachable; Escape lets go, and puts focus back on the stop when focus
 * was on a stop or in the card; Tab and the arrow keys walk the stops in time order, and the caravan
 * walks to the one in focus. A stop's label is hidden where it would overlap another
 * label, but its button stays in the tab order and shows its label on focus.
 *
 * **The card is the page's own entry, cloned.** Every trend is rendered by the server as an
 * `<article>` in the list under the scene, so its words exist once in the page and work without a
 * script; the card copies that article (without its ids), so the card and the list cannot say two
 * different things.
 *
 * **A label never covers a year's post** (the author, on the mockup: in 2024 a stop's name sat over
 * the year's medallion). Each frame the scene passes the posts' boxes in, and a label that would
 * meet one slides sideways, the shorter way, until it clears it.
 */

export interface Box {
  l: number
  r: number
  t: number
  b: number
}

interface Item {
  el: HTMLButtonElement
  label: HTMLElement
  x: Placed
  sx: number
  sy: number
  w: number
  h: number
  dx: number
  off: boolean
  hid: boolean
}

const GAP = 6

export class Stops {
  private active: Item | null = null
  private pinned: Item | null = null
  private timer = 0
  /** Set while focus is put back on a stop after Escape, so that focus does not open it again. */
  private returning = false
  private readonly items: Item[]
  private readonly ac = new AbortController()

  constructor(
    private readonly layer: HTMLElement,
    trends: readonly Placed[],
    private readonly journey: Journey,
    private readonly card: HTMLElement,
    private readonly entryOf: (id: string) => HTMLElement | null,
    private readonly lead: () => number,
    private readonly onActive: (id: string | null) => void,
  ) {
    const signal = this.ac.signal
    this.items = trends.map((x) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'cv-stop'
      el.setAttribute('aria-label', `${x.period}: ${x.title}`)
      el.setAttribute('aria-expanded', 'false')
      el.setAttribute('aria-controls', card.id)
      el.dataset.trend = x.id
      const hit = document.createElement('span')
      hit.className = 'cv-stop-hit'
      const label = document.createElement('span')
      label.className = 'cv-stop-lab'
      label.textContent = x.title
      el.append(hit, label)
      layer.append(el)
      const item: Item = { el, label, x, sx: -999, sy: -999, w: 0, h: 0, dx: 0, off: false, hid: false }
      el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') this.preview(item) }, { signal })
      el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') this.release() }, { signal })
      el.addEventListener('focus', () => {
        if (this.returning) return
        this.journey.go(x.at + this.lead())
        this.preview(item)
      }, { signal })
      el.addEventListener('blur', () => this.release(), { signal })
      el.addEventListener('click', (e) => {
        e.preventDefault()
        this.togglePin(item)
      }, { signal })
      el.addEventListener('keydown', (e) => this.key(e, item), { signal })
      return item
    })
    card.addEventListener('pointerenter', () => window.clearTimeout(this.timer), { signal })
    card.addEventListener('pointerleave', () => this.release(), { signal })
    card.addEventListener('click', (e) => {
      if ((e.target as Element).closest('.cv-card-close')) this.unpin(true)
    }, { signal })
    document.addEventListener('pointerdown', (e) => {
      if (this.pinned && !(e.target as Element).closest('.cv-stop, .cv-card, .cv-scrub, .cv-tools')) this.unpin()
    }, { signal })
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || (!this.pinned && !this.active)) return
      const where = document.activeElement
      const fromHere = where !== null && (card.contains(where) || this.items.some((i) => i.el === where))
      const back = this.pinned ?? this.active
      this.unpin()
      if (fromHere) this.focusBack(back)
    }, { signal })
  }

  /** The scene calls this each frame with where each stop's anchor is on screen. */
  place(i: number, x: number, y: number): void {
    const it = this.items[i]
    it.sx = x
    it.sy = y
    const W = this.layer.clientWidth
    const off = x < -60 || x > W + 60
    it.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`
    if (it.off !== off) {
      it.off = off
      it.el.classList.toggle('is-off', off)
    }
  }

  /** A label's box on screen, slid by `dx`. */
  private box(it: Item, dx: number): Box {
    return { l: it.sx + dx - it.w / 2, r: it.sx + dx + it.w / 2, t: it.sy - GAP - it.h, b: it.sy - GAP }
  }

  /**
   * After every stop is placed: slide each label clear of the posts, then hide the labels that
   * would still overlap one another, keeping the active stop's, then the stronger trend's, then the
   * one nearer the centre.
   */
  afterFrame(obstacles: readonly Box[]): void {
    const W = this.layer.clientWidth
    const cx = W / 2
    const visible = this.items.filter((i) => !i.off)
    for (const i of visible) {
      if (i.w === 0) {
        i.w = i.label.offsetWidth || 120
        i.h = i.label.offsetHeight || 26
      }
      const dx = this.clear(i, obstacles)
      if (Math.abs(dx - i.dx) > 0.5) {
        i.dx = dx
        i.label.style.setProperty('--cv-dx', `${dx.toFixed(1)}px`)
      }
    }
    visible.sort((a, b) => Number(b === this.active) - Number(a === this.active)
      || (b.x.peak ?? 0) - (a.x.peak ?? 0)
      || Math.abs(a.sx - cx) - Math.abs(b.sx - cx))
    const shown: Box[] = []
    for (const i of visible) {
      const r = this.box(i, i.dx)
      const clash = shown.some((q) => r.l - 4 < q.r && r.r + 4 > q.l && r.t < q.b && r.b > q.t)
      if (!clash) shown.push(r)
      if (i.hid !== clash) {
        i.hid = clash
        i.el.classList.toggle('is-label-hidden', clash)
      }
    }
    if (this.active) this.placeCard()
  }

  /** The shortest sideways slide that keeps a label off every obstacle; 0 when it already is. */
  private clear(it: Item, obstacles: readonly Box[]): number {
    const meets = (dx: number) => {
      const r = this.box(it, dx)
      return obstacles.some((o) => r.l < o.r + GAP && r.r > o.l - GAP && r.t < o.b && r.b > o.t)
    }
    if (!meets(0)) return 0
    const candidates = obstacles.flatMap((o) => [o.r + GAP - (it.sx - it.w / 2), o.l - GAP - (it.sx + it.w / 2)])
      .sort((a, b) => Math.abs(a) - Math.abs(b))
    return candidates.find((dx) => !meets(dx)) ?? 0
  }

  private preview(it: Item): void {
    window.clearTimeout(this.timer)
    this.setActive(it)
  }

  private release(): void {
    window.clearTimeout(this.timer)
    this.timer = window.setTimeout(() => {
      if (this.card.matches(':hover')) return
      const focused = this.items.find((i) => i.el === document.activeElement)
      const hovered = this.items.find((i) => i.el.matches(':hover'))
      this.setActive(hovered ?? focused ?? this.pinned ?? null)
    }, 90)
  }

  private togglePin(it: Item): void {
    if (this.pinned === it) {
      this.unpin()
      this.setActive(it)
      return
    }
    this.pinned = it
    this.setActive(it, true)
    this.card.querySelector<HTMLElement>('.cv-entry-title')?.focus({ preventScroll: true })
  }

  private unpin(refocus = false): void {
    const was = this.pinned
    this.pinned = null
    this.setActive(null)
    if (refocus) this.focusBack(was)
  }

  private focusBack(it: Item | null): void {
    if (!it) return
    this.returning = true
    it.el.focus({ preventScroll: true })
    this.returning = false
  }

  private setActive(it: Item | null, force = false): void {
    if (this.active === it && !force) return
    if (this.active) {
      this.active.el.classList.remove('is-active')
      this.active.el.setAttribute('aria-expanded', 'false')
    }
    this.active = it
    this.layer.parentElement?.classList.toggle('has-active', it !== null)
    if (it) {
      it.el.classList.add('is-active')
      it.el.setAttribute('aria-expanded', 'true')
    }
    this.onActive(it ? it.x.id : null)
    this.journey.kick()
    if (it === null) {
      this.card.hidden = true
      this.card.replaceChildren()
      return
    }
    this.fill(it)
    this.card.hidden = false
    this.placeCard()
  }

  /** The card: the trend's own entry from the list, copied, with a close button while it is kept. */
  private fill(it: Item): void {
    const entry = this.entryOf(it.x.id)
    const copy = entry ? (entry.cloneNode(true) as HTMLElement) : document.createElement('div')
    copy.removeAttribute('id')
    for (const node of copy.querySelectorAll('[id]')) node.removeAttribute('id')
    copy.querySelector('.cv-entry-title')?.setAttribute('tabindex', '-1')
    const pinned = this.pinned === it
    this.card.classList.toggle('is-pinned', pinned)
    if (pinned) {
      const close = document.createElement('button')
      close.type = 'button'
      close.className = 'cv-card-close'
      close.setAttribute('aria-label', 'Close')
      close.append('Close ')
      const kbd = document.createElement('kbd')
      kbd.textContent = 'Esc'
      close.append(kbd)
      this.card.replaceChildren(copy, close)
    } else {
      this.card.replaceChildren(copy)
    }
    this.card.setAttribute('aria-label', it.x.title)
  }

  /** Beside the stop's label, never over it; on a phone, a sheet along the bottom of the window. */
  private placeCard(): void {
    const c = this.card
    const it = this.active
    if (!it) return
    if (isPhone()) {
      c.classList.add('is-sheet')
      c.style.left = ''
      c.style.top = ''
      return
    }
    c.classList.remove('is-sheet')
    const lr = this.layer.getBoundingClientRect()
    const x = lr.left + it.sx + it.dx
    const y = lr.top + it.sy
    c.style.visibility = it.off ? 'hidden' : ''
    const W = c.offsetWidth
    const H = c.offsetHeight
    const g = 16
    const gap = 22
    const band = document.querySelector('.bz-band') ?? document.querySelector('.bz-bar')
    const ceil = (band ? band.getBoundingClientRect().bottom : 0) + 8
    const half = (it.w || 120) / 2
    let left = x + half + gap
    if (left + W > window.innerWidth - g) left = x - half - gap - W
    left = clamp(left, g, window.innerWidth - W - g)
    const top = clamp(y - H / 2, ceil, window.innerHeight - H - g)
    c.style.left = `${left.toFixed(0)}px`
    c.style.top = `${top.toFixed(0)}px`
  }

  private key(e: KeyboardEvent, it: Item): void {
    const k = this.items.indexOf(it)
    const to = ({ ArrowRight: k + 1, ArrowDown: k + 1, ArrowLeft: k - 1, ArrowUp: k - 1, Home: 0, End: this.items.length - 1 } as Record<string, number>)[e.key]
    // Enter and Space are the button's own click, which keeps the stop: no second toggle here.
    if (to === undefined) return
    e.preventDefault()
    const next = this.items[clamp(to, 0, this.items.length - 1)]
    if (this.pinned && this.pinned !== next) this.pinned = null
    next.el.focus({ preventScroll: true })
  }

  destroy(): void {
    this.ac.abort()
    window.clearTimeout(this.timer)
    this.layer.parentElement?.classList.remove('has-active')
    this.card.hidden = true
    this.card.replaceChildren()
    this.card.className = 'cv-card'
  }
}
