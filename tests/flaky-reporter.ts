import { appendFileSync } from 'node:fs'
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'

/**
 * Makes a flaky test loud. CI retries a failing browser test once, so a test that failed and
 * then passed leaves a green run and, with the stock reporters, one easily missed line in a
 * long log: 22 of 54 green runs measured on 2026-11-18 had one, unnoticed. This prints every
 * test that passed only on a retry as a GitHub `warning` annotation (it shows on the run's
 * summary page), repeats them together at the end of the log, and appends them to the job
 * summary when GitHub provides one. It never fails the run: the retry is the safety net, and
 * what this adds is that using it is visible.
 */
export default class FlakyReporter implements Reporter {
  private flaky = new Map<string, string>()

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== 'passed' || result.retry === 0) return
    const name = test.titlePath().slice(1).join(' › ')
    this.flaky.set(name, test.location.file.replace(`${process.cwd()}/`, '') + `:${test.location.line}`)
    console.log(`::warning file=${test.location.file.replace(`${process.cwd()}/`, '')},line=${test.location.line},title=Flaky test::passed only on retry #${result.retry}: ${name}`)
  }

  onEnd(_result: FullResult): void {
    if (this.flaky.size === 0) return
    const lines = [...this.flaky].map(([name, where]) => `  ${where}  ${name}`)
    console.log(`\nFLAKY: ${this.flaky.size} test(s) failed and then passed on retry\n${lines.join('\n')}\n`)
    const summary = process.env.GITHUB_STEP_SUMMARY
    if (summary) {
      appendFileSync(summary, `### Flaky tests (passed only on retry)\n\n${[...this.flaky].map(([name, where]) => `- \`${where}\` ${name}`).join('\n')}\n`)
    }
  }
}
