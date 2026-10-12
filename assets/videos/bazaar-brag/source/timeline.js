// Every frame is a pure function of t (seconds). render.mjs calls window.render(t) once per frame.
// Cut times sit on the beat grid of ende.app "Happy Beats / Business Moves" vol. 9, played from 18.44 s.
'use strict';
const CUT = { s2: 3.155, s3: 6.835, s4: 9.993, s5: 13.151, s6: 16.831, s7: 19.467, s8: 26.305, end: 30 };
const PAN = 0.15; // half-length of the street pan between two stalls

const $ = (s) => document.querySelector(s);
const C = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const P = (t, a, d) => C((t - a) / d);
const lerp = (a, b, x) => a + (b - a) * x;
const eOut = (x) => 1 - Math.pow(1 - x, 3);
const eIn = (x) => x * x * x;
const eIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eBack = (x, s = 1.9) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const hash = (n) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
const swing = (t, t0, amp, f = 1.05, z = 0.2) => {
  const x = t - t0; if (x <= 0) return amp;
  return amp * Math.exp(-z * 2 * Math.PI * f * x) * Math.cos(2 * Math.PI * f * Math.sqrt(1 - z * z) * x);
};
function tf(el, { x = 0, y = 0, s = 1, sx, sy, r = 0, o } = {}) {
  el.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${(sx ?? s).toFixed(4)},${(sy ?? s).toFixed(4)})`;
  if (o !== undefined) el.style.opacity = C(o).toFixed(3);
}
const show = (el, on) => { el.style.display = on ? 'block' : 'none'; };
const pop = (t, t0, d = 0.24) => { const p = P(t, t0, d); return { s: p <= 0 ? 0.001 : eBack(p), o: P(t, t0, 0.06) }; };

// ---------- static content ----------
const TAKES = [
  'RAG is dead', 'agents are the future', 'agents are dead', 'prompt engineering is dead',
  'context is all you need', 'AGI by Friday', 'this changes everything', 'nobody is talking about this',
  'fine-tuning is dead', 'RAG is back', 'one prompt to rule them all', 'vibe code a startup tonight',
  'this one trick 10x your agents', 'MCP is dead', 'MCP is back', 'learn AI in 5 minutes',
];
const HANDLES = ['@hot.takes', '@agi.tomorrow', '@thread.boi', '@vibes.only', '@ai.insider', '@doom.scroll', '@big.if.true', '@trust.me.bro'];
const AV = ['#2f8c86', '#282864', '#7a4a86', '#b8873b', '#a0503c'];

function shade(hex, k) { // k>0 lighter, k<0 darker
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function cubeSVG(c, seed) {
  let dots = '';
  for (let i = 0; i < 9; i++) {
    const face = i % 3;
    const u = hash(seed * 31 + i * 7), v = hash(seed * 17 + i * 13);
    let x, y;
    if (face === 0) { x = 20 + u * 60; y = 18 + v * 18; } else if (face === 1) { x = 14 + u * 30; y = 42 + v * 40; } else { x = 56 + u * 30; y = 42 + v * 40; }
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.6 + v * 1.4).toFixed(1)}" fill="#fff" opacity=".85"/>`;
  }
  return `<svg viewBox="0 0 100 100"><path d="M50 8 L92 28 L50 48 L8 28Z" fill="${shade(c, 0.28)}"/><path d="M8 28 L50 48 L50 94 L8 74Z" fill="${c}"/><path d="M50 48 L92 28 L92 74 L50 94Z" fill="${shade(c, -0.22)}"/>${dots}</svg>`;
}
const CUBES = [ // final x, y, colour, landing time (the last lands on the strong cue at 8.41)
  [150, 1700, '#2f8c86', 7.6], [278, 1700, '#7a4a86', 7.7], [406, 1700, '#b8873b', 7.8], [534, 1700, '#a0503c', 7.9], [662, 1700, '#282864', 8.0], [790, 1700, '#2f8c86', 8.1],
  [342, 1600, '#282864', 8.2], [470, 1600, '#2f8c86', 8.3], [598, 1600, '#7a4a86', 8.41],
];
const ROWS = [['#r1', 19.989], ['#r2', 20.523], ['#r3', 21.046], ['#r4', 21.568], ['#r5', 22.09], ['#r6', 22.625]];

let EL = {}, WORDS = [], B2 = null, SPIRAL = '';

function init() {
  // feed
  const feed = $('#feed');
  for (let i = 0; i < 40; i++) {
    const d = document.createElement('div'); d.className = 'post';
    d.innerHTML = `<div class="who"><span class="av" style="background:${AV[i % 5]}"></span>${HANDLES[i % HANDLES.length]}</div><div class="take">${TAKES[i % TAKES.length]}</div>`;
    feed.appendChild(d);
  }
  // hook line, word by word
  const line = $('#povline');
  'you’re learning AI from the timeline'.split(' ').forEach((w, i, a) => {
    const s = document.createElement('span'); s.textContent = w + (i < a.length - 1 ? ' ' : ''); line.appendChild(s); WORDS.push(s);
  });
  // spiral eyes
  let d = '';
  for (let k = 0; k <= 60; k++) { const a = k * 0.42, r = 2 + k * 0.42; d += (k ? 'L' : 'M') + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1); }
  SPIRAL = d;
  $('#eyeL').setAttribute('d', SPIRAL); $('#eyeR').setAttribute('d', SPIRAL);
  // cubes
  const box = $('#cubes3');
  CUBES.forEach(([x, y, c], i) => { const e = document.createElement('div'); e.className = 'cube'; e.style.left = x + 'px'; e.style.top = y + 'px'; e.innerHTML = cubeSVG(c, i + 1); box.appendChild(e); });
  // the scene-3 world (gate, floor, cubes) zooms as one
  const world = document.createElement('div'); world.id = 'world3'; world.className = 'abs'; world.style.inset = '0'; world.style.transformOrigin = '540px 1400px';
  $('#s3').insertBefore(world, $('#head3'));
  world.appendChild($('#gatebox')); world.appendChild($('#floor3')); world.appendChild(box);
  // check marks
  document.querySelectorAll('.ck').forEach((s) => { s.setAttribute('viewBox', '0 0 58 58'); s.innerHTML = '<circle cx="29" cy="29" r="27" fill="#2f8c86"/><path d="M16 30 L25 39 L43 20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'; });
  // lamps for the outro, the site's own three lanterns from gate.html
  const tpl = $('#lampsrc').innerHTML; const holder = $('#lamps8'); holder.innerHTML = tpl;
  [...holder.querySelectorAll('svg')].forEach((s, i) => { s.classList.add('lamp'); const L = [[70, 30, 160], [850, 30, 160], [500, 30, 0]][i]; s.style.left = L[0] + 'px'; s.style.top = L[1] + 'px'; s.style.width = (L[2] || 1) + 'px'; if (!L[2]) s.style.display = 'none'; });
  document.querySelectorAll('.sign .ico svg').forEach((s) => { s.style.width = '100%'; s.style.height = '100%'; });

  EL = Object.fromEntries(['s1', 's3', 's4', 's5', 's6', 's7', 's8', 'feed', 'feedwrap', 'dim', 'povblock', 'pov', 'brain', 'drips', 'eyeL', 'eyeR', 'dialog', 'cursor', 'b2', 'flood',
    'bar3', 'band3', 'head3', 'world3', 'sign4', 'st4', 'sign5', 'sign6', 'pol1', 'pol2', 'st6', 'shade6', 'paper', 'tot', 'hr2', 'stamp', 'logo8', 'head8', 'st8', 'url8', 'name8', 'lamps8',
    'rgbR', 'rgbG'].map((id) => [id, document.getElementById(id)]));
  // where the primary button sits once the dialog has settled: the flood starts from exactly there
  show(EL.s1, true); EL.dialog.style.transform = 'none';
  const r = EL.b2.getBoundingClientRect(); B2 = { x: r.left, y: r.top, w: r.width, h: r.height };
}

// ---------- scenes ----------
function scene1(t) {
  const on = t < CUT.s3; show(EL.s1, on); if (!on) return;
  // the feed: too fast to read, on purpose
  const tf0 = Math.min(t, CUT.s2);
  let fy = 240 - 2350 * tf0;
  let fx = 0;
  const g = P(t, CUT.s2, 0.36); // the crash glitch
  if (t >= CUT.s2 && g < 1) { const n = Math.floor(t * 30); fx = (hash(n) - 0.5) * 60 * (1 - g); fy += (hash(n + 3) - 0.5) * 30 * (1 - g); }
  tf(EL.feed, { x: fx, y: fy });
  if (t < CUT.s2) EL.feedwrap.style.filter = 'url(#vblur)';
  else if (g < 1) { const n = Math.floor(t * 30); EL.rgbR.setAttribute('dx', (14 + hash(n) * 16) * (1 - g)); EL.rgbG.setAttribute('dx', -(14 + hash(n + 9) * 16) * (1 - g)); EL.feedwrap.style.filter = 'url(#rgb)'; }
  else EL.feedwrap.style.filter = 'none';
  EL.dim.style.opacity = (0.8 * eOut(P(t, CUT.s2 + 0.08, 0.4))).toFixed(3);

  // POV block
  const b = pop(t, 0.0, 0.3);
  let by = 0, bx = 0;
  if (t >= CUT.s2) { const n = Math.floor(t * 30); bx = (hash(n + 5) - 0.5) * 40 * (1 - g); by = -1300 * eIn(P(t, CUT.s2 + 0.12, 0.3)); }
  tf(EL.povblock, { x: bx, y: by, s: b.s, o: b.o });
  tf(EL.pov, { s: pop(t, 0.06, 0.22).s });
  const wt = [0.3, 0.44, 0.58, 0.76, 0.9, 1.041];
  WORDS.forEach((w, i) => { const p = P(t, wt[i], 0.18); tf(w, { y: 50 * (1 - eOut(p)), s: p <= 0 ? 0.6 : lerp(0.6, 1, eBack(p)), o: P(t, wt[i], 0.05) }); });

  // the brain melts
  const bp = pop(t, CUT.s2 + 0.15, 0.32);
  const melt = eOut(P(t, CUT.s2 + 0.35, 2.8));
  tf(EL.brain, { r: Math.sin(t * 7.5) * 4 * (t > CUT.s2 ? 1 : 0), s: bp.s, o: bp.o, sy: bp.s * (1 - 0.07 * melt) });
  [[0, 95], [1, 125], [2, 80], [3, 60]].forEach(([i, len], k) => {
    const d = EL.drips.children[i]; const wob = 1 + 0.06 * Math.sin(t * 6 + k);
    d.setAttribute('height', (50 + len * melt * wob).toFixed(1));
  });
  const pd = document.getElementById('puddle');
  pd.setAttribute('rx', (30 + 120 * melt).toFixed(1)); pd.setAttribute('cy', (300 + 80 * melt).toFixed(1)); pd.style.opacity = melt > 0.02 ? 1 : 0;
  const ang = (t * 420) % 360;
  EL.eyeL.setAttribute('transform', `translate(160 150) rotate(${ang})`);
  EL.eyeR.setAttribute('transform', `translate(248 150) rotate(${-ang})`);

  // the dialog
  const dp = pop(t, 3.677, 0.32);
  const shake = t > 3.677 ? Math.sin((t - 3.677) * 70) * 16 * Math.exp(-(t - 3.677) * 9) : 0;
  tf(EL.dialog, { x: shake, s: dp.s, o: dp.o });
  // cursor: in, onto the primary button, click
  const cx0 = 1120, cy0 = 1980, cx1 = B2.x + B2.w * 0.62, cy1 = B2.y + B2.h * 0.55;
  const cp = eIO(P(t, 4.55, 1.0));
  const press = t > 5.72 && t < 5.9 ? 0.86 : 1;
  tf(EL.cursor, { x: lerp(cx0, cx1, cp) + Math.sin(cp * Math.PI) * -60, y: lerp(cy0, cy1, cp), s: press, o: 1 - P(t, 6.2, 0.08) });
  const pressed = t > 5.72 && t < 5.95;
  EL.b2.style.background = pressed ? '#1b1b47' : '';
  tf(EL.b2, { s: pressed ? 0.95 : 1 });
  // the button floods the screen: a match cut into the bar of scene 3
  const fp = eIn(P(t, 6.3, CUT.s3 - 6.3));
  const on2 = t >= 6.3; EL.flood.style.display = on2 ? 'block' : 'none';
  if (on2) {
    const x = lerp(B2.x, 0, fp), y = lerp(B2.y, 0, fp), w = lerp(B2.w, 1080, fp), h = lerp(B2.h, 1920, fp);
    Object.assign(EL.flood.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: lerp(18, 0, fp) + 'px' });
  }
}

function scene3(t) {
  const on = t >= CUT.s3 && t < CUT.s4; show(EL.s3, on); if (!on) return;
  const barH = lerp(1920, 236, eOut(P(t, CUT.s3, 0.46)));
  const out = eIn(P(t, 9.66, 0.3));
  EL.bar3.style.height = barH + 'px';
  tf(EL.bar3, { y: -300 * out }); tf(EL.band3, { y: barH - 300 * out });
  const brand = EL.bar3.querySelector('.brand');
  tf(brand, { y: lerp(40, 0, eOut(P(t, 7.02, 0.3))), o: P(t, 7.02, 0.18) });
  [...EL.head3.children].forEach((l, i) => { const p = P(t, 7.2 + i * 0.14, 0.32); tf(l, { y: 70 * (1 - eOut(p)) - 500 * out, o: p > 0 ? Math.min(1, p * 4) * (1 - out) : 0 }); });
  // camera: pull back from the gate, then walk into it
  const pull = lerp(1.2, 1.0, eOut(P(t, CUT.s3, 2.7)));
  const dive = lerp(1, 3.4, eIn(P(t, 9.6, CUT.s4 - 9.6)));
  tf(EL.world3, { s: pull * dive });
  CUBES.forEach(([, , , tl], i) => {
    const e = EL.world3.querySelectorAll('.cube')[i];
    const p = P(t, tl - 0.26, 0.26);
    let y = -1000 * (1 - eIn(p)), sy = 1, sx = 1;
    if (t > tl) { const x = t - tl; const sq = Math.exp(-x * 10) * Math.sin(x * 30) * 0.16; sy = 1 - sq; sx = 1 + sq * 0.6; }
    tf(e, { y, sx, sy, o: p > 0 ? 1 : 0 });
  });
}

function street(t, el, t0, t1, first) {
  const on = t >= (first ? t0 : t0 - PAN) && t < t1 + PAN; show(el, on); if (!on) return false;
  let x = 0, s = 1;
  if (first) s = lerp(1.07, 1, eOut(P(t, t0, 0.24)));
  else x = 1080 * (1 - eIO(P(t, t0 - PAN, 2 * PAN)));
  if (t > t1 - PAN) x = -1080 * eIO(P(t, t1 - PAN, 2 * PAN));
  tf(el, { x, s });
  return true;
}
function hang(sign, t, t0) {
  const land = t0 + 0.32; const p = P(t, t0, 0.32);
  const y = -760 * (1 - eOut(p));
  const r = t < land ? lerp(-14, 8, p) : swing(t, land, 8, 1.0, 0.22);
  tf(sign, { y, r, o: p > 0 ? 1 : 0 });
}
function slap(el, t, t0, rot) {
  const p = P(t, t0, 0.2); if (p <= 0) { el.style.opacity = 0; return; }
  tf(el, { s: lerp(2.4, 1, eBack(p, 1.3)), r: rot, o: Math.min(1, p * 3) });
}
function scenes456(t) {
  if (street(t, EL.s4, CUT.s4, CUT.s5, true)) { hang(EL.sign4, t, CUT.s4 + 0.06); slap(EL.st4, t, 11.572, -8); }
  if (street(t, EL.s5, CUT.s5, CUT.s6)) hang(EL.sign5, t, CUT.s5 + 0.02);
  if (street(t, EL.s6, CUT.s6, CUT.s7)) {
    hang(EL.sign6, t, CUT.s6 + 0.02);
    EL.shade6.style.opacity = (0.55 * eOut(P(t, 17.2, 0.3))).toFixed(3);
    [[EL.pol1, 17.25, -20, -6], [EL.pol2, 17.62, 16, 5]].forEach(([e, t0, r0, r1]) => {
      const p = P(t, t0, 0.34); tf(e, { y: 1100 * (1 - eOut(p)), r: lerp(r0, r1, eOut(p)), o: p > 0 ? 1 : 0 });
    });
    slap(EL.st6, t, 18.42, -6);
  }
}

function scene7(t) {
  const on = t >= CUT.s7 && t < 26.45; show(EL.s7, on); if (!on) return;
  const n = Math.floor(t * 30);
  const shake = t > 24.74 && t < 25.05 ? (hash(n) - 0.5) * 22 * (1 - P(t, 24.74, 0.3)) : 0;
  tf(EL.s7, { x: shake, s: lerp(1.06, 1, eOut(P(t, CUT.s7, 0.22))) });
  const exit = eIn(P(t, 25.98, 0.3));
  tf(EL.paper, { y: lerp(-1450, 0, eOut(P(t, CUT.s7, 0.42))) - 1900 * exit, r: -4 * exit });
  ROWS.forEach(([id, t0]) => {
    const row = $(id); const p = P(t, t0, 0.16);
    tf(row.firstElementChild, { x: -40 * (1 - eOut(p)), o: p > 0 ? Math.min(1, p * 2.5) : 0 });
    const c = pop(t, t0 + 0.08, 0.22); tf(row.lastElementChild, { s: c.s, o: c.o });
  });
  EL.hr2.style.opacity = P(t, 23.15, 0.1);
  const tp = pop(t, 23.681, 0.26); tf(EL.tot, { s: tp.s, o: tp.o });
  const sp = P(t, 24.738, 0.16);
  tf(EL.stamp, { s: sp <= 0 ? 0.001 : lerp(3, 1, eIn(sp)) * (t > 24.9 ? 1 + 0.05 * Math.exp(-(t - 24.9) * 12) * Math.sin((t - 24.9) * 40) : 1), r: -14, o: sp > 0 ? Math.min(1, sp * 2) : 0, y: -1900 * exit });
}

function scene8(t) {
  const on = t >= 26.1; show(EL.s8, on); if (!on) return;
  tf(EL.s8, { y: lerp(-1920, 0, eIO(P(t, 26.1, 0.32))) });
  [...EL.lamps8.querySelectorAll('svg')].forEach((s, i) => { s.style.transform = `rotate(${(Math.sin((t - 26) * 2 * Math.PI * 0.5 + i * 1.7) * 6).toFixed(2)}deg)`; });
  const lp = pop(t, 26.45, 0.32); tf(EL.logo8, { s: lp.s, o: lp.o });
  [...EL.head8.children].forEach((l, i) => { const p = P(t, 26.6 + i * 0.16, 0.32); tf(l, { y: 60 * (1 - eOut(p)), o: Math.min(1, p * 3) }); });
  slap(EL.st8, t, 27.361, 6);
  const up = P(t, 27.0, 0.3); EL.url8.style.opacity = up; EL.url8.style.transform = `translate(-50%, ${(40 * (1 - eOut(up))).toFixed(1)}px)`;
  const np = P(t, 27.15, 0.3); tf(EL.name8, { y: 30 * (1 - eOut(np)), o: np });
}

window.render = (t) => { scene1(t); scene3(t); scenes456(t); scene7(t); scene8(t); };
window.ready = (async () => {
  await document.fonts.ready;
  await Promise.all(['700 100px Fraunces', '600 100px Fraunces', '800 100px Fraunces', '900 60px Figtree', '700 40px Figtree', '800 40px Figtree', '600 40px Figtree', '700 40px Vazirmatn'].map((f) => document.fonts.load(f, 'AaTüçفارسی')));
  await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  init();
  window.render(0);
  return true;
})();
