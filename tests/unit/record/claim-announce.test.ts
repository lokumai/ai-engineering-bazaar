/**
 * §17.5 — the whole interface between the seam and the arrival line: one
 * boolean, "a newsworthy claim happened in THIS document".
 *
 * It is a module store rather than context because `AccountSync` is not an
 * ancestor of the page column — it is mounted after `{children}` in the root
 * layout — and it is a boolean rather than the summary because the summary is in
 * the record, where both surfaces already read it (§16.4.2).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  announceClaim,
  claimAnnounced,
  clearClaimAnnounce,
  subscribeClaimAnnounce,
} from '@/lib/record/claim-announce'

describe('the announce flag', () => {
  beforeEach(() => {
    clearClaimAnnounce()
  })

  it('starts false, so a document nobody claimed in prints nothing', () => {
    expect(claimAnnounced()).toBe(false)
  })

  it('is true after the seam announces, and false after a route change clears it', () => {
    announceClaim()
    expect(claimAnnounced()).toBe(true)
    clearClaimAnnounce()
    expect(claimAnnounced()).toBe(false)
  })

  it('notifies subscribers on a change and not on a repeat', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeClaimAnnounce(listener)

    announceClaim()
    expect(listener).toHaveBeenCalledTimes(1)
    announceClaim()
    expect(listener).toHaveBeenCalledTimes(1)
    clearClaimAnnounce()
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    announceClaim()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
