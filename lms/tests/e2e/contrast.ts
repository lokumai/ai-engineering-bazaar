import type { Page } from '@playwright/test'

/**
 * §10.1 in a real engine.
 *
 * `tests/unit/color/contrast.test.ts` checks the *tokens*. It cannot check
 * which token a run of text actually ended up painted in, and every contrast
 * defect this suite exists to catch is of that second kind: a token that
 * passes on its own, applied to text it was never allowed to carry, or over a
 * ground the published table never pairs it with.
 *
 * Two things make that answerable only in a browser. Chrome serialises a
 * computed `oklch()` as `lab(…)`, so nothing here may assume a parseable
 * `rgb()`; and the ground a run of text sits on is whatever the first opaque
 * ancestor turns out to be, which is a layout fact. So a colour is resolved by
 * painting one pixel and reading it back — whatever the notation, that is the
 * sRGB the reader's screen receives — and the ground is composited up the
 * ancestor chain.
 */

export interface ContrastSample {
  /** The text the sample was taken from, trimmed for the failure message. */
  text: string
  /** The painted colour, `#rrggbb`. */
  color: string
  /** The composited ground, `#rrggbb`. */
  background: string
  ratio: number
}

/** Runs in the page. Self-contained on purpose: nothing closes over it. */
function probe(selector: string): ContrastSample[] {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  type Rgba = [number, number, number, number]

  /** Any CSS colour — `lab()`, `oklch()`, `color()`, `rgb()` — as painted sRGB. */
  const paint = (color: string): Rgba => {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    return [r, g, b, a / 255]
  }

  const over = (top: Rgba, bottom: Rgba): Rgba => [
    Math.round(top[0] * top[3] + bottom[0] * (1 - top[3])),
    Math.round(top[1] * top[3] + bottom[1] * (1 - top[3])),
    Math.round(top[2] * top[3] + bottom[2] * (1 - top[3])),
    1,
  ]

  /** The ground this element is painted on, composited to full opacity. */
  const groundOf = (el: Element): Rgba => {
    const stack: Rgba[] = []
    for (let node: Element | null = el; node; node = node.parentElement) {
      const layer = paint(getComputedStyle(node).backgroundColor)
      if (layer[3] === 0) continue
      stack.push(layer)
      if (layer[3] === 1) break
    }
    let ground: Rgba = [255, 255, 255, 1]
    for (let i = stack.length - 1; i >= 0; i -= 1) ground = over(stack[i], ground)
    return ground
  }

  const hex = (rgb: Rgba) =>
    `#${[rgb[0], rgb[1], rgb[2]].map((c) => c.toString(16).padStart(2, '0')).join('')}`

  const luminance = (rgb: Rgba) => {
    const [r, g, b] = [rgb[0], rgb[1], rgb[2]].map((c) => {
      const channel = c / 255
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const ratio = (a: Rgba, b: Rgba) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  return [...document.querySelectorAll(selector)].map((el) => {
    const ground = groundOf(el)
    const painted = over(paint(getComputedStyle(el).color), ground)
    return {
      text: (el.textContent ?? '').trim().slice(0, 60),
      color: hex(painted),
      background: hex(ground),
      ratio: ratio(painted, ground),
    }
  })
}

/**
 * Every element matching `selector`, with the ratio between the colour it is
 * painted in and the ground it is painted on.
 */
export function contrastSamples(page: Page, selector: string): Promise<ContrastSample[]> {
  return page.evaluate(probe, selector)
}

/** The worst sample in the set — the one a failure message should name. */
export function worst(samples: readonly ContrastSample[]): ContrastSample {
  return samples.reduce((low, sample) => (sample.ratio < low.ratio ? sample : low))
}

/** Puts the page into the named theme, the way the toggle does (§2.5). */
export async function useTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.evaluate((next) => {
    localStorage.setItem('hl-theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }, theme)
}
