import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { z } from 'zod'
import { CONTENT_ROOT } from './paths'

/**
 * A module's quick quiz, read from `<category dir>/<name>.quiz.yaml` beside
 * the module's markdown.
 *
 * The author, 2026-10-11: at the very end of a module, a collapsed *"Want a
 * quick quiz?"* that asks 3 to 5 four-choice questions and explains each
 * answer in a sentence or two. **Reinforcement, not assessment** — the goal is
 * to make a reader recall the module's main points, not to grade them, so
 * nothing about a reader's answers is stored or counted anywhere.
 *
 * ## One file, both languages
 *
 * Each question holds its English and its Turkish side by side with ONE
 * `answer` index, so the two languages cannot disagree about which option is
 * right, and a translation with a different number of questions or options is
 * a shape error rather than something a reader discovers. The Turkish keeps
 * technical words in their English form, and where it uses a Turkish word for
 * one it puts the English in parentheses — the author's rule for every
 * language but English.
 *
 * ## Validated at build time
 *
 * The file is parsed and checked here, so a malformed quiz fails the build by
 * name instead of rendering a broken question. A module with no quiz file has
 * no quiz — a planned module never does — and that is an honest absence, not
 * an error.
 */

const Side = z.object({
  question: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).length(4),
  explain: z.string().trim().min(1),
})

const Question = z.object({
  answer: z.number().int().min(0).max(3),
  en: Side,
  tr: Side,
})

const QuizFile = z.object({
  questions: z.array(Question).min(3).max(5),
})

export type QuizLang = 'en' | 'tr'

/** One question as a page renders it, in one language. */
export interface QuizItem {
  question: string
  options: readonly string[]
  /** Zero-based index into `options`. */
  answer: number
  explain: string
}

/** Where `<dir>/<name>`'s quiz lives. Exported so a test can find every file. */
export function quizPathFor(dir: string, name: string): string {
  return path.join(CONTENT_ROOT, dir, `${name}.quiz.yaml`)
}

/** Both languages of a quiz file, parsed and validated, or null where none exists. */
export function readQuiz(file: string): z.infer<typeof QuizFile> | null {
  if (!fs.existsSync(file)) return null
  const raw = yaml.safeLoad(fs.readFileSync(file, 'utf8'))
  const parsed = QuizFile.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`${path.relative(CONTENT_ROOT, file)}: ${parsed.error.message}`)
  }
  return parsed.data
}

/** The quiz for a module in one language, or null when the module has none. */
export function quizFor(dir: string, name: string, lang: QuizLang): QuizItem[] | null {
  const quiz = readQuiz(quizPathFor(dir, name))
  if (quiz === null) return null
  return quiz.questions.map((question) => ({
    question: question[lang].question,
    options: question[lang].options,
    answer: question.answer,
    explain: question[lang].explain,
  }))
}
