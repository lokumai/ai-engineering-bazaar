import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ProfilePage from '@/app/profile/page'
import { DataPanel } from '@/components/record/DataPanel'
import { ERASE_COPY, EraseDialog } from '@/components/record/EraseDialog'
import { ERASE_WORD } from '@/lib/record/erase'
import { TRACKS } from '@/lib/tracks'

/**
 * `/profile/` since M39 F2: one tab per track over that track's level cards,
 * and one data line under them. These are the page's structural rules; how
 * export, restore and reset behave is the browser suite's.
 */
const PAGE = renderToStaticMarkup(<ProfilePage />)

describe('the progress page', () => {
  it('has one tab and one panel per track, each panel its own track region', () => {
    for (const track of TRACKS) {
      expect(PAGE).toContain(`id="bz-ptab-${track.id}"`)
      expect(PAGE).toMatch(new RegExp(`id="bz-ppanel-${track.id}"[^>]*data-panel="${track.id}"`))
      expect(PAGE).toContain(`data-track="${track.id}"`)
      expect(PAGE).toContain(track.label)
    }
  })

  it('keeps the data line at #data, with back up, restore and reset', () => {
    expect(PAGE).toMatch(/<section id="data"/)
    for (const words of ['Back up to a file', 'Restore from a file', 'Reset']) expect(PAGE).toContain(words)
  })

  it('draws none of the removed features', () => {
    for (const gone of ['Waiting on you', 'Checked by', 'Record of work', 'Sign in', 'Days in a row']) {
      expect(PAGE.toLowerCase()).not.toContain(gone.toLowerCase())
    }
  })

  it('has one h1, unique ids, and every aria-labelledby resolves', () => {
    expect(PAGE.match(/<h1[\s>]/g)?.length).toBe(1)
    const ids = [...PAGE.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(ids).size).toBe(ids.length)
    for (const [, ref] of PAGE.matchAll(/aria-(?:labelledby|controls|describedby)="([^"]+)"/g)) {
      expect(ids, `reference to "${ref}"`).toContain(ref)
    }
  })
})

describe('the data line', () => {
  const LINE = renderToStaticMarkup(<DataPanel />)

  it('restores from a .json file only', () => {
    expect(LINE).toMatch(/type="file"[^>]*accept="\.json,application\/json"|accept="\.json,application\/json"[^>]*type="file"/)
  })

  it('asks for the erase word, and says nothing about an account', () => {
    expect(ERASE_COPY.confirmLabel).toContain(ERASE_WORD)
    const dialog = renderToStaticMarkup(<EraseDialog onConfirm={() => {}} onExport={() => {}} />)
    expect(`${LINE}${dialog}${ERASE_COPY.scope}`.toLowerCase()).not.toMatch(/account|organisation/)
  })
})
