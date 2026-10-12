// Assemble the composition: inline the site's own street art into video.html and stage fonts and images.
// Usage: node build.mjs <workDir>   (run from the repository root)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const work = path.resolve(process.argv[2] ?? 'brag-work');
const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, '../../../..');
const ART = path.join(repo, 'src/components/home/street/art');
fs.mkdirSync(path.join(work, 'assets'), { recursive: true });

const art = (n) => fs.readFileSync(path.join(ART, `${n}.html`), 'utf8');
const firstSvg = (html) => html.match(/<svg[\s\S]*?<\/svg>/)[0];
// gate.html is the gate drawing followed by three lantern <div>s; the video wants the drawing alone
const gate = art('gate');
const gateSvg = gate.slice(0, gate.indexOf('<div class="lamp"'));
const lamps = [...gate.matchAll(/<div class="lamp"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => firstSvg(m[1]));

let html = fs.readFileSync(path.join(here, 'video.html'), 'utf8');
html = html.replace(/<!--ART:([a-z0-9-]+)-->/g, (_, n) => (n === 'gate' ? gateSvg : art(n)));
html = html.replace('<!--LAMPS-->', lamps.join(''));
fs.writeFileSync(path.join(work, 'page.html'), html);
fs.copyFileSync(path.join(here, 'timeline.js'), path.join(work, 'timeline.js'));

for (const [src, dst] of [
  ['public/lokum-logo.svg', 'lokum-logo.svg'],
  ['mini-courses/2_intermediate/images/onion-model.png', 'onion-model.png'],
  ['mini-courses/2_intermediate/images/loop-unemployment.jpeg', 'loop-unemployment.jpeg'],
]) fs.copyFileSync(path.join(repo, src), path.join(work, 'assets', dst));

// fonts: Fraunces (the home page's display face), Figtree, Vazirmatn; fetched once, then local
if (!fs.existsSync(path.join(work, 'fonts/fonts.css'))) {
  fs.mkdirSync(path.join(work, 'fonts'), { recursive: true });
  const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
  const css = execFileSync('curl', ['-s', '-A', ua, 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,500..800,0..100&family=Figtree:wght@500..900&family=Vazirmatn:wght@500..800&display=block']).toString();
  const out = [];
  for (const [, sub, body] of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*{([^}]*)}/g)) {
    if (!['latin', 'latin-ext', 'arabic'].includes(sub)) continue;
    const fam = body.match(/font-family:\s*'([^']+)'/)[1].replace(/ /g, '');
    const url = body.match(/url\((https[^)]+)\)/)[1];
    const fn = `${fam}-${sub}.woff2`;
    execFileSync('curl', ['-s', '-o', path.join(work, 'fonts', fn), url]);
    out.push('@font-face {' + body.replace(/url\(https[^)]+\)/, `url(${fn})`) + '}');
  }
  fs.writeFileSync(path.join(work, 'fonts/fonts.css'), out.join('\n'));
}
console.log('built', path.join(work, 'page.html'), `${lamps.length} lanterns`);
