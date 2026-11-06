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
/* Each street's own close, so the walk closes a cloud the same way a tap elsewhere does. */
const closers = new WeakMap<HTMLElement, () => void>()
/** How far, in pixels, the page has to scroll before an open cloud closes. */
const SCROLL_AWAY = 40

export function initClouds(root: HTMLElement): () => void {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('.who-btn')]
  let open: HTMLButtonElement | null = null
  /* Where the page was when the cloud opened: focus can scroll the page a little to bring
     the person into view, so only a scroll that goes on past that closes the cloud. */
  let openedAt = 0

  const close = () => {
    if (open === null) return
    open.removeAttribute('data-open')
    open.removeAttribute('data-below')
    open.querySelector<HTMLElement>('.who-cloud')?.style.removeProperty('--shift')
    open = null
  }

  const show = (button: HTMLButtonElement) => {
    if (root.dataset.chasing === 'true') return
    if (open === button) return
    close()
    open = button
    openedAt = window.scrollY
    button.setAttribute('data-open', '')
    const cloud = button.querySelector<HTMLElement>('.who-cloud')
    if (cloud === null) return
    const bar = document.querySelector<HTMLElement>('.bz-bar')?.getBoundingClientRect().bottom ?? 0
    if (cloud.getBoundingClientRect().top < bar + MARGIN) button.setAttribute('data-below', '')
    const box = cloud.getBoundingClientRect()
    const width = document.documentElement.clientWidth
    const shift = box.left < MARGIN ? MARGIN - box.left : box.right > width - MARGIN ? width - MARGIN - box.right : 0
    if (shift !== 0) cloud.style.setProperty('--shift', `${Math.round(shift)}px`)
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
    if (Math.abs(window.scrollY - openedAt) > SCROLL_AWAY) close()
  }, { passive: true })

  root.setAttribute('data-clouds', '')
  closers.set(root, close)
  return () => {
    closers.delete(root)
    close()
    off.forEach((undo) => undo())
    root.removeAttribute('data-clouds')
  }
}

/** Closes whatever cloud is open; the walk calls it when the chase begins. */
export function closeClouds(root: HTMLElement): void {
  closers.get(root)?.()
}
