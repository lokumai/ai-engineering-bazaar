/**
 * The story clouds over the people at the gate (M58).
 *
 * With no script, `home.css` opens a cloud while its person is pointed at or focused. This
 * adds what CSS cannot do: a tap opens and closes one; only one is open at a time; Escape,
 * a tap anywhere else or scrolling away closes it; and an open cloud is moved sideways, or below
 * its person, rather than leave the window (it is measured after it opens, because its
 * width follows its text). Nothing opens while the chase is running: the walk sets
 * `data-chasing` on the street while the people are on the move.
 *
 * Imported statically by the home page's island, like the track choice: a reader can tap
 * a person before the motion has loaded.
 */

const MARGIN = 8
/* Each street's own close, so the walk closes a cloud the same way a tap elsewhere does. The
   chase passes `gateOnly`: it sends the people at the gate away, not the two at the choice. */
const closers = new WeakMap<HTMLElement, (gateOnly?: boolean) => void>()
/** How far, in pixels, the page has to scroll before an open cloud closes, on the still
 * picture and on the walk. The walk's is long: there the people stand while the page scrolls
 * (they leave only when the chase starts, which closes their clouds itself), and the walk
 * scrubs with a lag, so a story must survive a few steps of the wheel (M72). */
const SCROLL_AWAY = 40
const SCROLL_AWAY_WALK = 400

export function initClouds(root: HTMLElement): () => void {
  /* the people at the gate, and since M63 the two characters at the choice of track */
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('.who-btn, .who-story')]
  let open: HTMLButtonElement | null = null
  /* Where the page was when the cloud opened: focus can scroll the page a little to bring
     the person into view, so only a scroll that goes on past that closes the cloud. It is the
     page's scroll and not the person's place on screen, because on the walk the person keeps
     sliding for a moment after the wheel stops, and that is not the reader leaving. */
  let openedAt = 0

  const close = () => {
    if (open === null) return
    open.removeAttribute('data-open')
    open.removeAttribute('data-below')
    open.querySelector<HTMLElement>('.who-cloud')?.style.removeProperty('--shift')
    open = null
  }

  const show = (button: HTMLButtonElement) => {
    /* The people at the gate run away in the chase, so their stories close and stay shut;
       the Sipahi and the Bezirgân stand at the choice, after it, and always tell theirs (M72). */
    if (root.dataset.chasing === 'true' && button.classList.contains('who-btn')) return
    if (open === button) return
    close()
    open = button
    openedAt = window.scrollY
    button.setAttribute('data-open', '')
    place(button)
  }

  /* Keeps an open cloud inside the window: below the person when the bar would cover it, and
     moved sideways at either edge. It is measured again while the person moves, because on the
     walk a story can open before its teller has slid into view (focus brings the walk to the
     choice), and a shift measured then would leave the cloud far off the screen (M72). */
  const place = (button: HTMLButtonElement) => {
    const cloud = button.querySelector<HTMLElement>('.who-cloud')
    if (cloud === null) return
    button.removeAttribute('data-below')
    cloud.style.removeProperty('--shift')
    const bar = document.querySelector<HTMLElement>('.bz-bar')?.getBoundingClientRect().bottom ?? 0
    if (cloud.getBoundingClientRect().top < bar + MARGIN) button.setAttribute('data-below', '')
    const box = cloud.getBoundingClientRect()
    const width = document.documentElement.clientWidth
    const shift = box.left < MARGIN ? MARGIN - box.left : box.right > width - MARGIN ? width - MARGIN - box.right : 0
    if (shift !== 0) cloud.style.setProperty('--shift', `${Math.round(shift)}px`)
  }

  /* The walk scrubs with a lag, so the person goes on moving for a moment after the last
     scroll event: the cloud is placed again on every frame for that long. */
  const FOLLOW_MS = 1500
  let followUntil = 0
  let frame = 0
  const follow = () => {
    frame = 0
    if (open === null) return
    place(open)
    if (performance.now() < followUntil) frame = requestAnimationFrame(follow)
  }

  const off: Array<() => void> = []
  const on = <K extends keyof HTMLElementEventMap>(el: EventTarget, type: K | string, fn: (e: Event) => void, opts?: AddEventListenerOptions) => {
    el.addEventListener(type, fn, opts)
    off.push(() => el.removeEventListener(type, fn, opts))
  }

  buttons.forEach((button) => {
    on(button, 'pointerenter', (e) => {
      if ((e as PointerEvent).pointerType === 'mouse') show(button)
    })
    on(button, 'pointerleave', (e) => {
      if ((e as PointerEvent).pointerType === 'mouse' && open === button) close()
    })
    on(button, 'focus', () => {
      if (button.matches(':focus-visible')) show(button)
    })
    on(button, 'blur', () => {
      if (open === button) close()
    })
    /* A mouse already opened it by pointing, so its click keeps it open; a tap or a key toggles. */
    on(button, 'click', (e) => {
      if ((e as PointerEvent).pointerType === 'mouse') show(button)
      else if (open === button) close()
      else show(button)
    })
  })
  on(document, 'keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape') close()
  })
  on(document, 'pointerdown', (e) => {
    if (open !== null && !open.contains(e.target as Node)) close()
  })
  on(window, 'scroll', () => {
    if (open === null) return
    followUntil = performance.now() + FOLLOW_MS
    if (frame === 0) frame = requestAnimationFrame(follow)
    const walking = document.documentElement.classList.contains('is-walk')
    /* On the walk, focus on a teller scrolls the page to the choice (motion.ts), far past any
       allowance: a story whose own caption holds focus stays open until focus leaves it. */
    if (walking && open.contains(document.activeElement)) return
    if (Math.abs(window.scrollY - openedAt) > (walking ? SCROLL_AWAY_WALK : SCROLL_AWAY)) close()
  }, { passive: true })

  root.setAttribute('data-clouds', '')
  closers.set(root, (gateOnly = false) => {
    if (!gateOnly || open?.classList.contains('who-btn')) close()
  })
  return () => {
    closers.delete(root)
    if (frame !== 0) cancelAnimationFrame(frame)
    close()
    off.forEach((undo) => undo())
    root.removeAttribute('data-clouds')
  }
}

/** Closes the street's open cloud; with `gateOnly`, only one told by a person at the gate. */
export function closeClouds(root: HTMLElement, gateOnly = false): void {
  closers.get(root)?.(gateOnly)
}
