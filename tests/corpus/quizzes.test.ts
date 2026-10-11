import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadAllModules } from '@/lib/content/loader'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { quizPathFor, readQuiz } from '@/lib/content/quiz'

/**
 * The quick quizzes beside the modules (`src/lib/content/quiz.ts`), held to
 * rules that hold for ANY quiz — never to what a question asks or how many a
 * module has, which are the author's to change (`tests/README.md`).
 */

const modules = loadAllModules()

/** Every `*.quiz.yaml` under the corpus, however it got there. */
function quizFiles(): string[] {
  const found: string[] = []
  for (const dir of fs.readdirSync(CONTENT_ROOT)) {
    const here = path.join(CONTENT_ROOT, dir)
    if (!fs.statSync(here).isDirectory()) continue
    for (const file of fs.readdirSync(here)) {
      if (file.endsWith('.quiz.yaml')) found.push(path.join(here, file))
    }
  }
  return found
}

const files = quizFiles()

describe('the quick quizzes', () => {
  it('exist, so the rules below are about something', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('each sit beside the module they are for', () => {
    const expected = new Set(modules.map((one) => quizPathFor(one.category.dir, one.name)))
    const orphans = files.filter((file) => !expected.has(file)).map((file) => path.relative(CONTENT_ROOT, file))
    expect(orphans, 'a quiz with no module of the same name beside it').toEqual([])
  })

  it('parse, and have the shape the page renders', () => {
    // `readQuiz` throws with the file's name on any shape error.
    for (const file of files) expect(readQuiz(file), file).not.toBeNull()
  })

  it('move the right answer around, so its place is never the clue', () => {
    for (const file of files) {
      const positions = new Set(readQuiz(file)!.questions.map((one) => one.answer))
      expect(positions.size, path.relative(CONTENT_ROOT, file)).toBeGreaterThan(1)
    }
  })

  it('offer four different options, in both languages', () => {
    for (const file of files) {
      for (const [at, question] of readQuiz(file)!.questions.entries()) {
        for (const lang of ['en', 'tr'] as const) {
          const options = question[lang].options.map((one) => one.trim().toLowerCase())
          expect(new Set(options).size, `${path.relative(CONTENT_ROOT, file)} #${at + 1} ${lang}`).toBe(4)
        }
      }
    }
  })

  it('carry a Turkish that is not the English', () => {
    for (const file of files) {
      for (const [at, question] of readQuiz(file)!.questions.entries()) {
        expect(question.tr.question, `${path.relative(CONTENT_ROOT, file)} #${at + 1}`)
          .not.toBe(question.en.question)
      }
    }
  })

  it('use no em dash and no exclamation mark, in either language', () => {
    // The corpus rule for prose, and the copy register's for the interface.
    for (const file of files) {
      for (const [at, question] of readQuiz(file)!.questions.entries()) {
        for (const lang of ['en', 'tr'] as const) {
          const side = question[lang]
          for (const text of [side.question, side.explain, ...side.options]) {
            expect(text, `${path.relative(CONTENT_ROOT, file)} #${at + 1} ${lang}`).not.toMatch(/[—!]/)
          }
        }
      }
    }
  })
})
