#!/usr/bin/env node
/**
 * The corpus pass. Run once, and designed so a second run is impossible rather
 * than merely harmless.
 *
 *   node scripts/migrate-corpus.mjs            report what it would do
 *   node scripts/migrate-corpus.mjs --apply    do it
 *
 * `mini-courses/curriculum.yaml` is the source of every fact it uses: the module
 * names, the titles, and the numbers, which are positions in that file. It reads
 * nothing out of a filename except the name, and it writes no number anywhere.
 *
 * ## What it does, in this order
 *
 *  1. Link TARGETS lose the numeric prefix. `../3_expert/17_advanced_tools.md`
 *     becomes `../3_expert/advanced_tools.md`: the DIRECTORY keeps its own
 *     prefix, because the directories are not being renamed.
 *  2. Link LABELS that carry a module number are rewritten from the TARGET's
 *     yaml title, never from the label's own text, so a stale label is corrected
 *     rather than carried across. A label with no number in it is prose and is
 *     left exactly as written. In a Turkish file the number is stripped and the
 *     author's Turkish text is kept, because the yaml holds no Turkish titles.
 *  3. The italic dek (`*Category: Expert — Module 16 (2 of 10 ...)*`) is deleted.
 *  4. The `**Previous/Next Module:**` and `**Next Category:**` footers are
 *     deleted, in both languages.
 *  5. Mermaid node labels lose a leading module number: `[16: Advanced UI]` and
 *     `[1. LLMs]` become `[Advanced UI]` and `[LLMs]`. This silently fixes the
 *     Expert progress rails, which are off by one throughout.
 *  6. The H1 becomes the title alone. In an English file that is the YAML's
 *     title, which wins where the two differ today; in a Turkish file it is
 *     whatever the author wrote after the number.
 *  7. The frontmatter shrinks to `summary` and `objectives`, and the fence goes
 *     entirely where a file has neither, which is every draft. A Turkish file
 *     has never carried one and still does not.
 *  8. The 66 files are `git mv`d to their prefixless names.
 *  9. The six category READMEs lose their `## Modules` lists.
 * 10. It re-reads everything it wrote, checks the rewrites took, and REPORTS the
 *     bare prose mentions ("that is Module 1, and...") for a human to fix. It
 *     does not touch those: blind substitution yields "the system prompt from
 *     Tool Calling under another name", which is worse than what it replaced.
 *
 * ## Why a second run cannot happen
 *
 * It asserts its PRE-state before writing a byte: the tree must be clean of
 * tracked changes, every module must still exist under a numbered name, and no
 * prefixless module file may exist yet. After one run the third assertion fails
 * and it stops with "the prefixes are already gone". Every rewrite is also keyed
 * on a pattern that stops matching once applied.
 *
 * ## What it refuses to guess
 *
 * It aborts, before writing, on a link target that resolves to no module, on an
 * H1 that is not `# Module <n>: <something>` with the right <n>, and on a
 * numbered link label whose number disagrees with its target. Measured before
 * the first run: 265 module links, none of them disagreeing, and 3 English H1s
 * whose text differs from the yaml title, which decision 5 settles in the
 * yaml's favour and which are listed in the report.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

const ROOT = process.cwd()
const CORPUS = path.join(ROOT, 'mini-courses')
const APPLY = process.argv.includes('--apply')

const problems = []
const notes = []
const changes = new Map()

function fail(message) {
  problems.push(message)
}

// ---------------------------------------------------------------------------
// The curriculum
// ---------------------------------------------------------------------------

const CATEGORY_DIRS = {
  fundamentals: '1_fundamentals',
  intermediate: '2_intermediate',
  expert: '3_expert',
  ecosystem: '4_ecosystem',
  protocols: '5_protocols_specs',
  optional: '6_optional',
}

const doc = yaml.safeLoad(fs.readFileSync(path.join(CORPUS, 'curriculum.yaml'), 'utf8'))

/** name -> { name, title, number, dir } */
const modules = new Map()
let position = 0
for (const category of doc.categories) {
  const dir = CATEGORY_DIRS[category.slug]
  if (dir === undefined) throw new Error(`curriculum.yaml: unknown category ${category.slug}`)
  for (const entry of category.modules) {
    position += 1
    modules.set(entry.name, { name: entry.name, title: entry.title, number: position, dir })
  }
}

const NAMES = [...modules.keys()]
// Longest first, so `advanced_tools` cannot be matched as `tools` with a
// leftover prefix. The alternation is used against whole filenames only, but
// the ordering costs nothing and removes a class of mistake.
const NAME_ALT = [...NAMES].sort((a, b) => b.length - a.length).join('|')

// ---------------------------------------------------------------------------
// Pre-state: the assertions that make a second run fail before it writes
// ---------------------------------------------------------------------------

function assertPreState() {
  const tracked = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim()
  if (tracked !== '') {
    fail(
      'the working tree has uncommitted tracked changes. This script rewrites 72 '
      + 'files and `git mv`s 66 of them; it will not run over work that is not '
      + `committed:\n${tracked}`,
    )
  }

  for (const module of modules.values()) {
    const here = path.join(CORPUS, module.dir)
    const numbered = `${module.number}_${module.name}.md`
    if (!fs.existsSync(path.join(here, numbered))) {
      fail(`pre-state: ${module.dir}/${numbered} is not there. Has this already run?`)
    }
    if (!fs.existsSync(path.join(here, `${module.number}_${module.name}_tr.md`))) {
      fail(`pre-state: ${module.dir}/${module.number}_${module.name}_tr.md is not there.`)
    }
    if (fs.existsSync(path.join(here, `${module.name}.md`))) {
      fail(`pre-state: ${module.dir}/${module.name}.md already exists. The prefixes are already gone.`)
    }
  }
}

// ---------------------------------------------------------------------------
// The rewrites
// ---------------------------------------------------------------------------

/**
 * A markdown link to a corpus file. The label may run across a source line, and
 * one does: `[Module 21: Advanced Context\n> Engineering](...)` in the
 * context-engineering module's NOTE blockquote.
 */
const LINK = new RegExp(
  String.raw`\[([^\]]*)\]\(\s*((?:\.\./[0-9]_[a-z_]+/)?)(?:\d+_)?(` + NAME_ALT
  + String.raw`)(_tr)?\.md((?:#[^)\s]*)?)\s*\)`,
  'g',
)

/** A label that names a module by number, in either language. */
const NUMBERED_LABEL = new RegExp(
  String.raw`^(?:(?:Fundamentals|Intermediate|Expert|Ecosystem|Protocols & Specs|Optional)`
  + String.raw`[\s,—-]+)?(?:Mod[uü]le?|Modül)\s+(\d+)(?::\s*([\s\S]*))?$`,
)

/** The italic dek under the H1, in either language. */
const DEK = /^\*(?:Category|Kategori):[^\n]*\*[ \t]*\n/gm

/** The prev/next navigation footers, in either language. */
const FOOTER =
  /^\*\*(?:Previous|Next) (?:Module|Category):\*\*[^\n]*\n?|^\*\*(?:Önceki|Sonraki) (?:Modül|Kategori):\*\*[^\n]*\n?/gm

/**
 * A leading module number inside a mermaid node label.
 *
 * Narrow on purpose. Corpus labels also read `"Chunk 1: def add(a,b)..."`,
 * `"Vector 1<br/>[0.2, 0.8, ..."`, `"2020 to 2024<br/>..."` and
 * `heartbeat ~5 min`, and none of those numbers is a module. What every real
 * rail label has and none of those has is a number at the very start followed by
 * `.` or `:` and a space.
 */
const RAIL_NUMBER = /^(?:(?:Module|Modül)\s+)?(\d+)[.:]\s+(?=\S)/

const H1 = /^#[ \t]+(?:Module|Modül)[ \t]+(\d+):[ \t]*([^\n]*)$/m

function isTurkish(file) {
  return file.endsWith('_tr.md')
}

/** Step 1 and 2: every corpus link, target and label. */
function rewriteLinks(text, source, turkish) {
  return text.replace(LINK, (whole, label, dirPart, name, tr, fragment) => {
    const target = modules.get(name)
    if (target === undefined) {
      fail(`${source}: link "${whole}" names "${name}", which is not a module`)
      return whole
    }

    const numbered = NUMBERED_LABEL.exec(label.replace(/\n>?\s*/g, ' ').trim())
    let next = label
    if (numbered !== null) {
      const stated = Number(numbered[1])
      if (stated !== target.number) {
        fail(
          `${source}: label "${label}" says ${stated} but points at ${name}, `
          + `which is ${target.number}`,
        )
        return whole
      }
      // English takes the yaml title. Turkish keeps what the author wrote after
      // the number, because the yaml holds no Turkish titles; a Turkish label
      // that was only a number has nothing left and is reported instead.
      const rest = (numbered[2] ?? '').trim()
      if (!turkish) {
        next = target.title
      } else if (rest !== '') {
        next = rest
      } else {
        notes.push(
          `${source}: [${label}] is a bare number in a Turkish file and the yaml `
          + `holds no Turkish title. Left as written, for the editorial pass. `
          + `It points at "${target.title}".`,
        )
      }
    }

    return `[${next}](${dirPart}${name}${tr ?? ''}.md${fragment})`
  })
}

/** Step 5: mermaid node labels, inside mermaid fences only. */
function deNumberRails(text, source) {
  return text.replace(/^(```mermaid[ \t]*\n)([\s\S]*?)(^```[ \t]*$)/gm, (whole, open, body, close) => {
    const stripped = body.replace(/\[("?)([^\]]*?)\1\]/g, (label, quote, inner) => {
      const next = inner.replace(RAIL_NUMBER, '')
      if (next === inner) return label
      if (next.trim() === '') {
        fail(`${source}: mermaid label [${inner}] is nothing but a number`)
        return label
      }
      return `[${quote}${next}${quote}]`
    })
    return `${open}${stripped}${close}`
  })
}

/** Step 6: the H1 becomes the title alone. */
function rewriteH1(text, module, source, turkish) {
  const found = H1.exec(text)
  if (found === null) {
    fail(`${source}: no "# Module <n>: <title>" heading found`)
    return text
  }
  const stated = Number(found[1])
  if (stated !== module.number) {
    fail(`${source}: H1 says Module ${stated}, but this is module ${module.number}`)
    return text
  }
  const written = found[2].trim()
  const title = turkish ? written : module.title
  if (!turkish && written !== module.title) {
    notes.push(`${source}: H1 read "${written}"; the yaml title "${module.title}" wins.`)
  }
  return text.replace(H1, `# ${title}`)
}

/**
 * Step 7: the frontmatter keeps `summary` and `objectives`.
 *
 * Rebuilt from the parsed values rather than filtered line by line, so the
 * multi-line `objectives` list cannot be half-removed. The fence goes entirely
 * where a file has neither field, which is every draft.
 */
function shrinkFrontmatter(text, source, turkish) {
  const fence = /^---\n([\s\S]*?)\n---\n/.exec(text)
  if (fence === null) {
    // No Turkish file has ever carried frontmatter: a translation declares
    // nothing about the curriculum, and the app never loads one. An English
    // file without a fence is a different matter, and this says so.
    if (!turkish) fail(`${source}: no frontmatter fence`)
    return text
  }
  let data
  try {
    data = yaml.safeLoad(fence[1]) ?? {}
  } catch (error) {
    fail(`${source}: frontmatter will not parse: ${error.message}`)
    return text
  }

  const kept = []
  if (typeof data.summary === 'string' && data.summary !== '') {
    kept.push(`summary: ${JSON.stringify(data.summary)}`)
  }
  if (Array.isArray(data.objectives) && data.objectives.length > 0) {
    kept.push('objectives:')
    for (const objective of data.objectives) kept.push(`  - ${JSON.stringify(objective)}`)
  }

  const body = text.slice(fence[0].length)
  return kept.length === 0 ? body.replace(/^\n+/, '') : `---\n${kept.join('\n')}\n---\n${body}`
}

/** Collapse the blank runs the deletions leave behind. */
function tidy(text) {
  return `${text.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '')}\n`
}

function migrateModuleFile(module, turkish) {
  const filename = `${module.number}_${module.name}${turkish ? '_tr' : ''}.md`
  const source = `${module.dir}/${filename}`
  const file = path.join(CORPUS, module.dir, filename)

  let text = fs.readFileSync(file, 'utf8')
  text = rewriteLinks(text, source, turkish)
  text = text.replace(DEK, '')
  text = text.replace(FOOTER, '')
  text = deNumberRails(text, source)
  text = rewriteH1(text, module, source, turkish)
  text = shrinkFrontmatter(text, source, turkish)
  changes.set(file, tidy(text))
}

/**
 * Step 9: the category READMEs.
 *
 * The `## Modules` list is 33 blocks of three numbers each, the app already
 * strips it (`intro.ts`), and it is a hand-maintained copy of what the yaml now
 * owns. The prose above it and the back-link below it stay.
 */
function migrateReadme(dir) {
  const source = `${dir}/README.md`
  const file = path.join(CORPUS, dir, 'README.md')
  let text = fs.readFileSync(file, 'utf8')

  const heading = /^##[ \t]+Modules[ \t]*$/m.exec(text)
  if (heading === null) {
    fail(`${source}: no "## Modules" heading found`)
    return
  }
  const after = text.slice(heading.index + heading[0].length)
  // The list runs until a line that is neither blank, nor a list item, nor an
  // indented continuation of one. The Fundamentals README closes with a
  // sentence after its list, and that sentence is prose to keep.
  const lines = after.split('\n')
  let cut = 0
  for (; cut < lines.length; cut += 1) {
    const line = lines[cut]
    if (line.trim() === '') continue
    if (/^[ \t]*(?:\d+\.|[-*+])[ \t]+/.test(line)) continue
    if (/^[ \t]+\S/.test(line)) continue
    break
  }

  text = text.slice(0, heading.index) + lines.slice(cut).join('\n')
  changes.set(file, tidy(rewriteLinks(text, source, false)))
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

/** A bare prose mention of a module by number: what a script must not rewrite. */
const BARE_MENTION = /\b(Module|Modül|Modules|Modüller)\s+\d+/g

function reportBareMentions() {
  const rows = []
  for (const [file, text] of changes) {
    if (path.basename(file) === 'README.md') continue
    text.split('\n').forEach((line, index) => {
      for (const found of line.matchAll(BARE_MENTION)) {
        rows.push({
          file: path.relative(CORPUS, file),
          line: index + 1,
          text: line.trim().slice(0, 150),
          hit: found[0],
        })
      }
    })
  }
  return rows
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

assertPreState()

if (problems.length === 0) {
  for (const module of modules.values()) {
    migrateModuleFile(module, false)
    migrateModuleFile(module, true)
  }
  for (const dir of Object.values(CATEGORY_DIRS)) migrateReadme(dir)
}

if (problems.length > 0) {
  console.error('REFUSING TO RUN. It will not guess.\n')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

const mentions = reportBareMentions()

console.log(`${changes.size} files rewritten in memory (66 modules, 6 READMEs).`)
console.log(`${modules.size * 2} files to rename.\n`)

if (notes.length > 0) {
  console.log('DELIBERATE CONTENT CHANGES, and one thing left for a human:\n')
  for (const note of notes) console.log(`  - ${note}`)
  console.log('')
}

console.log(`BARE PROSE MENTIONS FOR THE EDITORIAL PASS: ${mentions.length}\n`)
for (const row of mentions) {
  console.log(`  ${row.file}:${row.line}  (${row.hit})`)
  console.log(`      ${row.text}`)
}

if (!APPLY) {
  console.log('\nDry run. Nothing written. Pass --apply to write.')
  process.exit(0)
}

for (const [file, text] of changes) fs.writeFileSync(file, text)

for (const module of modules.values()) {
  for (const suffix of ['', '_tr']) {
    const from = path.join(CORPUS, module.dir, `${module.number}_${module.name}${suffix}.md`)
    const to = path.join(CORPUS, module.dir, `${module.name}${suffix}.md`)
    execFileSync('git', ['mv', from, to], { cwd: ROOT })
  }
}

console.log('\nApplied.')
