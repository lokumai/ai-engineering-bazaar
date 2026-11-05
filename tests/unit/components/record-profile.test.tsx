import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ProfilePage from '@/app/profile/page'
import { DataPanel } from '@/components/record/DataPanel'
import { ERASE_COPY, EraseDialog } from '@/components/record/EraseDialog'
import { ERASE_WORD } from '@/lib/record/erase'

/**
 * `/profile/` since M38 and M40: the level circles, the continue card, and one
 * row, Export, import, erase. These are the page's structural rules; the
 * behaviour of export, import and erase is the browser suite's.
 */
const PAGE = renderToStaticMarkup(<ProfilePage />)

describe('the progress page', () => {
  it('draws one register row, the data row, and it arrives closed', () => {
    const rows = [...PAGE.matchAll(/<section class="bz-register-row" aria-labelledby="([^"]+)"/g)]
    expect(rows.map((m) => m[1])).toEqual(['data'])
    expect(PAGE).toContain('Export, import, erase')
    expect(PAGE).not.toMatch(/<details[^>]*\sopen/)
  })

  it('draws none of the removed features', () => {
    for (const gone of ['Waiting on you', 'Checked by', 'role path', 'Record of work', 'Sign in']) {
      expect(PAGE.toLowerCase()).not.toContain(gone.toLowerCase())
    }
  })

  it('has one h1, unique ids, and every aria-labelledby resolves', () => {
    expect(PAGE.match(/<h1[\s>]/g)?.length).toBe(1)
    const ids = [...PAGE.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(ids).size).toBe(ids.length)
    for (const [, ref] of PAGE.matchAll(/aria-labelledby="([^"]+)"/g)) {
      expect(ids, `aria-labelledby="${ref}"`).toContain(ref)
    }
  })
})

describe('the data panel', () => {
  const PANEL = renderToStaticMarkup(<DataPanel />)

  it('offers export, a .json import, and erase', () => {
    expect(PANEL).toContain('EXPORT YOUR RECORD')
    expect(PANEL).toMatch(/type="file"[^>]*accept="\.json,application\/json"|accept="\.json,application\/json"[^>]*type="file"/)
    expect(PANEL).toContain(ERASE_COPY.trigger)
  })

  it('asks for the erase word, and says nothing about an account', () => {
    expect(ERASE_COPY.confirmLabel).toContain(ERASE_WORD)
    const dialog = renderToStaticMarkup(<EraseDialog onConfirm={() => {}} onExport={() => {}} />)
    expect(`${PANEL}${dialog}${ERASE_COPY.scope}`.toLowerCase()).not.toMatch(/account|organisation/)
  })
})
