#!/usr/bin/env node
/**
 * Serves `out/` the way GitHub Pages does, with no dependencies.
 *
 * The e2e suite has to be runnable against the static export, because that is
 * what ships: `next dev` renders through the App Router at request time and
 * cannot tell you that a page which builds also *exports*. `npx serve` would
 * do this, but it is a network fetch inside a test run, so the twenty lines
 * are cheaper than the dependency.
 *
 * The two behaviours that matter for `trailingSlash: true` output: a request
 * for `/courses/x/` resolves to `courses/x/index.html`, and anything unknown
 * gets `404.html` with a 404 status rather than a hang.
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? 'out')
const port = Number(process.argv[3] ?? process.env.PORT ?? 3111)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

/** The file a URL path names, or null if it names nothing on disk. */
function resolveFile(pathname) {
  // `normalize` collapses `..`; the prefix check is what actually contains it.
  const candidate = resolve(join(root, normalize(decodeURIComponent(pathname))))
  if (candidate !== root && !candidate.startsWith(root + '/')) return null

  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate

  const index = join(candidate, 'index.html')
  if (existsSync(index)) return index

  const html = `${candidate}.html`
  if (existsSync(html) && statSync(html).isFile()) return html

  return null
}

function send(res, status, file) {
  res.writeHead(status, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  })
  createReadStream(file).pipe(res)
}

const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname
  const file = resolveFile(pathname)

  if (file) return send(res, 200, file)

  const notFound = join(root, '404.html')
  if (existsSync(notFound)) return send(res, 404, notFound)

  res.writeHead(404, { 'content-type': 'text/plain' })
  res.end('404')
})

server.listen(port, () => {
  process.stdout.write(`static export on http://localhost:${port} (${root})\n`)
})
