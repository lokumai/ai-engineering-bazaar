import fs from 'node:fs'
import path from 'node:path'

const CONTENT_ROOT = path.resolve(process.cwd(), '..', 'mini-courses')
const TARGET_ROOT = path.resolve(process.cwd(), 'public', 'course-images')

const DIR_TO_SLUG = {
  '1_fundamentals': 'fundamentals',
  '2_intermediate': 'intermediate',
  '3_expert': 'expert',
  '4_ecosystem': 'ecosystem',
  '5_protocols_specs': 'protocols',
  '6_optional': 'optional',
}

fs.rmSync(TARGET_ROOT, { recursive: true, force: true })

let copied = 0
for (const [dir, slug] of Object.entries(DIR_TO_SLUG)) {
  const source = path.join(CONTENT_ROOT, dir, 'images')
  if (!fs.existsSync(source)) continue
  const target = path.join(TARGET_ROOT, slug)
  fs.cpSync(source, target, { recursive: true })
  copied += fs.readdirSync(target).length
}

console.log(`copy-course-images: ${copied} file(s) into public/course-images`)
