import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { clampPage, countLabel, filterTrends, PAGE_SIZE, pageButtons, pageCount, pageOf } from '@/components/caravan/browse'

/**
 * M93 — the rules of the Caravan trend list (`components/caravan/browse.ts`), on made-up trends:
 * nothing here is a fact about the sample or the author's trends.
 */

const trend = (title: string, text: string, years: number[]) => ({ title, text, years })
const many = (n: number) => Array.from({ length: n }, (_, i) => trend(`T${i}`, 'x', [2024]))

describe('filterTrends', () => {
  const list = [
    trend('Open weights', 'Weights anyone could download.', [2023]),
    trend('Retrieval', 'Chat with your documents.', [2023, 2024]),
    trend('Long loops', 'Agents ran for hours.', [2026]),
  ]

  it('keeps a trend under every year its span touches, and every trend under no year', () => {
    expect(filterTrends(list, { year: 2024, query: '' }).map((t) => t.title)).toEqual(['Retrieval'])
    expect(filterTrends(list, { year: 2023, query: '' }).map((t) => t.title)).toEqual(['Open weights', 'Retrieval'])
    expect(filterTrends(list, { year: null, query: '' })).toHaveLength(3)
    expect(filterTrends(list, { year: 2025, query: '' })).toEqual([])
  })

  it('searches the title and the text, in any case, every word', () => {
    expect(filterTrends(list, { year: null, query: 'WEIGHTS' }).map((t) => t.title)).toEqual(['Open weights'])
    expect(filterTrends(list, { year: null, query: 'documents' }).map((t) => t.title)).toEqual(['Retrieval'])
    expect(filterTrends(list, { year: null, query: '  agents   hours ' }).map((t) => t.title)).toEqual(['Long loops'])
    expect(filterTrends(list, { year: null, query: 'agents weights' })).toEqual([])
  })

  it('applies the year and the search together, in the list order', () => {
    expect(filterTrends(list, { year: 2023, query: 'chat' }).map((t) => t.title)).toEqual(['Retrieval'])
    expect(filterTrends(list, { year: 2026, query: 'chat' })).toEqual([])
  })
})

describe('the pages', () => {
  it('holds twelve trends to a page, after filtering', () => {
    expect(PAGE_SIZE).toBe(12)
    const found = many(PAGE_SIZE * 2 + 1)
    expect(pageCount(found.length)).toBe(3)
    expect(pageOf(found, 1)).toEqual(found.slice(0, PAGE_SIZE))
    expect(pageOf(found, 3)).toEqual(found.slice(PAGE_SIZE * 2))
    expect(pageCount(0)).toBe(1)
  })

  it('keeps a page number inside the pages there are', () => {
    expect(clampPage(5, PAGE_SIZE + 1)).toBe(2)
    expect(clampPage(0, 3)).toBe(1)
    expect(clampPage(2, 0)).toBe(1)
  })

  it('counts the range on the page and how many the choice kept', () => {
    expect(countLabel(1, PAGE_SIZE + 10)).toBe(`Showing 1–${PAGE_SIZE} of ${PAGE_SIZE + 10}`)
    expect(countLabel(2, PAGE_SIZE + 10)).toBe(`Showing ${PAGE_SIZE + 1}–${PAGE_SIZE + 10} of ${PAGE_SIZE + 10}`)
    expect(countLabel(1, 3)).toBe('Showing 1–3 of 3')
    expect(countLabel(1, 0)).toBe('No trend matches')
  })

  it('draws every page while there are seven, and the ends and the neighbours past that', () => {
    expect(pageButtons(1, 1)).toEqual([1])
    expect(pageButtons(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(pageButtons(1, 9)).toEqual([1, 2, null, 9])
    expect(pageButtons(5, 9)).toEqual([1, null, 4, 5, 6, null, 9])
    expect(pageButtons(9, 9)).toEqual([1, null, 8, 9])
    // A gap of one page is drawn as that page, never as an ellipsis standing for one number.
    expect(pageButtons(4, 9)).toEqual([1, 2, 3, 4, 5, null, 9])
  })
})

describe('the first paint agrees with the page size', () => {
  it('caravan.css hides from entry PAGE_SIZE + 1 before the list is taken over', () => {
    const css = readFileSync(join(import.meta.dirname, '../../src/app/caravan.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const found = [...css.matchAll(/\.cv-entries > li:nth-child\(n \+ (\d+)\)/g)].map((m) => Number(m[1]))
    expect(found, 'caravan.css no longer hides the later pages before the island runs').toHaveLength(1)
    expect(found[0]).toBe(PAGE_SIZE + 1)
  })
})
