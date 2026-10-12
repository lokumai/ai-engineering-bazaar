import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadAllModules } from '@/lib/content/loader'
import { CONTENT_ROOT } from '@/lib/content/paths'
import { quizPathFor, readQuiz } from '@/lib/content/quiz'
import { TRANSLATED_LANGS } from '@/lib/content/languages'

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

/** The sides a question actually carries, English first. */
function sidesOf(question: NonNullable<ReturnType<typeof readQuiz>>['questions'][number]) {
  return (['en', ...TRANSLATED_LANGS] as const).filter((lang) => question[lang] !== undefined)
}

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

  it('offer four different options, in every language they carry', () => {
    for (const file of files) {
      for (const [at, question] of readQuiz(file)!.questions.entries()) {
        for (const lang of sidesOf(question)) {
          const options = question[lang]!.options.map((one) => one.trim().toLowerCase())
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

  /**
   * M28 — a Persian side is optional in the schema, because Persian is
   * optional per module, and REQUIRED wherever the module has a Persian page:
   * a Persian reader who opens the quiz must get it in Persian, on every
   * question, or `quizFor` fails the build. This is that rule stated over the
   * corpus, so the failure names the file rather than a route.
   */
  it('carry every language their module has a page in, on every question', () => {
    for (const module of modules) {
      const quiz = readQuiz(quizPathFor(module.category.dir, module.name))
      if (quiz === null) continue
      for (const lang of TRANSLATED_LANGS) {
        if (module.translations[lang] === null) continue
        const missing = quiz.questions
          .map((question, at) => (question[lang] === undefined ? at + 1 : null))
          .filter((at) => at !== null)
        expect(missing, `${module.source}: questions with no ${lang} side`).toEqual([])
      }
    }
  })

  it('carry a Persian that is not the English, wherever there is one', () => {
    const persian = files.flatMap((file) => readQuiz(file)!.questions.filter((one) => one.fa))
    // Non-vacuity: with no Persian side anywhere, the comparison is over nothing.
    expect(persian.length).toBeGreaterThan(0)
    for (const question of persian) expect(question.fa!.question).not.toBe(question.en.question)
  })

  it('use no em dash and no exclamation mark, in any language', () => {
    // The corpus rule for prose, and the copy register's for the interface.
    for (const file of files) {
      for (const [at, question] of readQuiz(file)!.questions.entries()) {
        for (const lang of sidesOf(question)) {
          const side = question[lang]!
          for (const text of [side.question, side.explain, ...side.options]) {
            expect(text, `${path.relative(CONTENT_ROOT, file)} #${at + 1} ${lang}`).not.toMatch(/[—!]/)
          }
        }
      }
    }
  })
})
