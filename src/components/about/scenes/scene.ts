/**
 * What the About page's motion asks of a stall's scene. Each scene is server-rendered as its still
 * picture; the island wraps it in one of these when motion is allowed, starts it when its stall nears
 * the screen and stops it when the stall leaves (`motion.ts`).
 */
export interface SceneHandle {
  /** Run the scene's own clock. Calling it while running does nothing. */
  start(): void
  /** Hold the scene where it is. */
  stop(): void
  /** Put the server's still picture back exactly as it was. */
  destroy(): void
  /**
   * A scroll-driven scene's position, 0 to 1, which the stall's scrubbed timeline tweens. A scene
   * without one plays on its own clock only.
   */
  progress?: { p: number }
}

/** The attributes a scene's motion may write: the markup's own values of these are its still picture. */
const WRITTEN = ['style', 'transform', 'opacity', 'height', 'visibility', 'gradientTransform'] as const

/**
 * Remember `elements` as the server drew them, and return the function that puts them back exactly:
 * every attribute a motion may write, React's own inline `style` included (a scene's SVG text carries
 * its font family there), and GSAP's cache of each element dropped, so a scene made again later reads
 * the markup and not the values of the last run. Rejected: GSAP's `clearProps: 'all'`, which empties
 * the whole `style` attribute and with it the font family React wrote (review A, item 3).
 */
export function snapshot(elements: readonly Element[]): () => void {
  const saved = elements.map((el) => ({ el, values: WRITTEN.map((name) => el.getAttribute(name)) }))
  return () => {
    for (const { el, values } of saved) {
      WRITTEN.forEach((name, i) => {
        const value = values[i]
        if (value === null) el.removeAttribute(name)
        else el.setAttribute(name, value)
      })
      Reflect.deleteProperty(el, '_gsap')
    }
  }
}
