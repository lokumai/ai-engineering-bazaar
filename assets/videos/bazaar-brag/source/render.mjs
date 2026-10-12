// Render page.html frame by frame in headless Chrome and pipe the frames into ffmpeg.
// Usage: node render.mjs <workDir> [--stills 1.2,3.4,...]   (needs @playwright/test, run from the repository root)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import path from 'node:path';

const work = path.resolve(process.argv[2] ?? 'brag-work');
const si = process.argv.indexOf('--stills');
const stills = si > 0 ? process.argv[si + 1].split(',').map(Number) : null;
const FPS = 30, DUR = 30;

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto('file://' + path.join(work, 'page.html'));
await page.evaluate(() => window.ready);
const cdp = await page.context().newCDPSession(page);
const shot = async (format) => Buffer.from((await cdp.send('Page.captureScreenshot', { format, quality: format === 'jpeg' ? 94 : undefined })).data, 'base64');

if (stills) {
  const fs = await import('node:fs');
  fs.mkdirSync(path.join(work, 'stills'), { recursive: true });
  for (const t of stills) {
    await page.evaluate((t) => window.render(t), t);
    fs.writeFileSync(path.join(work, 'stills', `t${t.toFixed(2).padStart(5, '0')}.png`), await shot('png'));
  }
} else {
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), path.join(work, 'video-silent.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < FPS * DUR; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    if (!ff.stdin.write(await shot('jpeg'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log('frame', i);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
}
await browser.close();
