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
