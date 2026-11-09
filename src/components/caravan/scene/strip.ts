import { monthLabel, yearOf } from '@/lib/caravan-months'
import { clamp, type Placed } from './model'

/**
 * M91, D116 — the histogram strip: the whole road in one strip, each month a bar as tall as its
 * measured strength, and the stretch in view as a thumb to drag. Ported from the round-5 mockup's
 * `Histogram`.
 *
 * To the keyboard it is a slider: the arrows step a month, Page Up and Page Down a year, Home and End
 * the two ends. It works in months, not pixels, so the scene and the strip can never disagree about
 * where the caravan is.
 */

export interface Strip {
  update(): void
  destroy(): void
}

export function mountStrip(options: {
  el: HTMLElement
  months: readonly string[]
  norm: readonly number[]
  stops: readonly Placed[]
  get: () => number
  set: (t: number, instant?: boolean) => void
  span: () => number
}): Strip {
  const { el, months, norm, stops, get, set, span } = options
  const NM = months.length
  el.innerHTML = `<svg class="cv-scrub-art" aria-hidden="true"></svg><div class="cv-scrub-years" aria-hidden="true"></div>
    <div class="cv-scrub-thumb" role="slider" tabindex="0" aria-label="Where the caravan is" aria-valuemin="0" aria-valuemax="${NM - 1}"></div>`
  const art = el.querySelector('.cv-scrub-art') as SVGSVGElement
  const years = el.querySelector('.cv-scrub-years') as HTMLElement
  const thumb = el.querySelector('.cv-scrub-thumb') as HTMLElement
  const ac = new AbortController()
  const signal = ac.signal
  let W = 1

  const starts: { year: number; at: number }[] = []
  months.forEach((month, i) => {
    if (i === 0 || month.endsWith('-01')) starts.push({ year: yearOf(month), at: i })
  })

  function draw(): void {
    W = el.clientWidth
    const H = el.clientHeight
    const bw = W / NM
    const base = H - 6
    art.setAttribute('viewBox', `0 0 ${W} ${H}`)
    const bars = norm.map((v, i) => {
      const bh = Math.max(1.5, v * (H - 18))
      return `<rect x="${(i * bw + 1).toFixed(1)}" y="${(base - bh).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" rx="1.5"/>`
    }).join('')
    const points = norm.map((v, i) => `${((i + 0.5) * bw).toFixed(1)} ${(base - v * (H - 18)).toFixed(1)}`)
    const dots = stops.map((x) => `<circle cx="${(x.at / NM * W).toFixed(1)}" cy="${H - 3}" r="1.6"/>`).join('')
    art.innerHTML = `<g class="cv-scrub-bars">${bars}</g><path class="cv-scrub-line" d="M${points.join('L')}"/><g class="cv-scrub-dots">${dots}</g>`
    years.innerHTML = starts.map((s, k) => {
      const x = s.at / NM * W
      const next = k < starts.length - 1 ? starts[k + 1].at / NM * W : W
      const narrow = next - x < 40
      return `<span style="left:${x.toFixed(1)}px"${narrow ? ' class="is-narrow"' : ''}>${narrow ? '' : s.year}</span>`
    }).join('')
    update()
  }

  function update(): void {
    const s = span()
    const t = get()
    const w = Math.max(24, s / NM * W)
    const left = clamp((t - s / 2) / NM * W, 0, W - w)
    thumb.style.transform = `translateX(${left.toFixed(1)}px)`
    thumb.style.width = `${w.toFixed(1)}px`
    const mi = clamp(Math.round(t - 0.5), 0, NM - 1)
    thumb.setAttribute('aria-valuenow', String(mi))
    thumb.setAttribute('aria-valuetext', monthLabel(months[mi], true))
  }

  let drag: { x0: number; t0: number } | null = null
  el.addEventListener('pointerdown', (e) => {
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left
    const t = get()
    const s = span()
    const thL = (t - s / 2) / NM * W
    const thW = s / NM * W
    const outside = x < thL || x > thL + thW
    if (outside) set(x / W * NM, true)
    drag = { x0: e.clientX, t0: outside ? x / W * NM : t }
    el.setPointerCapture(e.pointerId)
    el.classList.add('is-drag')
    e.preventDefault()
    thumb.focus({ preventScroll: true })
  }, { signal })
  el.addEventListener('pointermove', (e) => {
    if (drag) set(drag.t0 + (e.clientX - drag.x0) / W * NM, true)
  }, { signal })
  const end = () => {
    drag = null
    el.classList.remove('is-drag')
  }
  el.addEventListener('pointerup', end, { signal })
  el.addEventListener('pointercancel', end, { signal })
  thumb.addEventListener('keydown', (e) => {
    const t = get()
    const step = ({ ArrowRight: 1, ArrowLeft: -1, PageDown: 12, PageUp: -12 } as Record<string, number>)[e.key]
    if (step) {
      e.preventDefault()
      set(t + step)
    }
    if (e.key === 'Home') {
      e.preventDefault()
      set(0)
    }
    if (e.key === 'End') {
      e.preventDefault()
      set(NM)
    }
  }, { signal })
  window.addEventListener('resize', draw, { signal })
  draw()

  return {
    update,
    destroy() {
      ac.abort()
      el.innerHTML = ''
    },
  }
}
