/**
 * §17.6 — the arrival line, rendered.
 *
 * `renderToStaticMarkup` with no DOM, the same instrument
 * `record-profile.test.tsx` uses: what is asserted is the MARKUP and the
 * constants, which is exactly what a server render can be asked for. The
 * document-scoped behaviour (announce, route change) is asserted in the e2e
 * gates, where there is a real document.
 */

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ClaimReceipt } from '@/components/record/ClaimReceipt'

describe('the prerendered arrival line', () => {
  it('renders nothing at all in the prerendered HTML', () => {
    // §12.2 channel B: the server has never met the reader, and
    // `claimAnnounced()`'s server snapshot is false.
    expect(renderToStaticMarkup(<ClaimReceipt />)).toBe('')
  })
})
