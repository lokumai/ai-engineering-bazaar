#!/usr/bin/env python3
"""Generates the four ground variants and the compare page in playground/.

Run: python3 playground/generate-grounds.py

It exists so the claim in BRAINSTORM.md D12 is checkable rather than asserted:
the four variants come out of ONE template, so structure, spacing, type and
ornament are byte-identical between them and the ground is provably the only
difference. The contrast numbers printed and embedded in each page are computed
from the tokens here, never typed in by hand.

Nothing in src/ depends on this. It is a scratch tool for choosing a colour.
"""
import os, re

# T4's palette, unchanged. Every hex is the one that shipped in
# playground/01-theme-T4-bazaar.html, sampled from assets/banner-tiles.jpeg.
# The ONE variable across G1..G4 is `ground` — the page fill, which is also the
# fill of the active navbar item — and `paper`, which has to stay above it.
T4 = dict(
   sand="#e6dac6", line="#d8cbb4", line2="#c3b299",
   ink="#20242e", title="#1b1b47", muted="#6a6558", faint="#948d7d",
   headbg="#282864", headink="#ffffff", headdim="#c9c6e4", headline="#28286400",
   headhover="rgba(255,255,255,.10)", headchipink="#1b1b47",
   headfield="rgba(255,255,255,.08)", headfieldline="rgba(255,255,255,.25)",
   accent="#282864", accent2="#a0503c", ok="#2f8c86", gold="#b8873b", ochre="#c8a078",
   l1="#2f8c86", l2="#282864", l3="#7a4a86", l4="#b8873b", l5="#a0503c",
   bandground="#282864", banda="#2f8c86", bandb="#c8a078", bandc="#a0503c",
)
GROUNDS = {
 "G1": ("Sugared",     "#f8f2e8", "#fffefb",
        "One step up. Still unmistakably a cream, just off the floor."),
 "G2": ("Icing",       "#fbf7f0", "#ffffff",
        "Clearly lighter, and the raised surfaces go to pure white to keep their edge."),
 "G3": ("Powder",      "#fdfbf7", "#ffffff",
        "Almost white, still warm. Cards separate on their hairline rather than on their fill."),
 "G4": ("Lokum cream", "#fff8e9", "#ffffff",
        "The logo's own ground, sampled from final.png. Lighter than today, and warmer with it."),
}
VARIANTS = {}
for _id, (_name, _g, _p, _note) in GROUNDS.items():
    _t = dict(T4); _t["ground"] = _g; _t["paper"] = _p; _t["headchip"] = _g
    VARIANTS[_id] = dict(name=_name, note=_note, tok=_t)

# ---- contrast, measured not guessed -----------------------------------------
def lin(c):
    c = c/255
    return c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4
def lum(h):
    h = h.lstrip('#')[:6]
    r,g,b = (int(h[i:i+2],16) for i in (0,2,4))
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def ratio(a,b):
    la,lb = lum(a),lum(b)
    hi,lo = max(la,lb),min(la,lb)
    return (hi+0.05)/(lo+0.05)

REPORT = {}
for vid,v in VARIANTS.items():
    t = v["tok"]
    REPORT[vid] = dict(
      ground_L = round(lum(t["ground"])*100,1),
      head_L = round(lum(t["headbg"])*100,1),
      body   = round(ratio(t["ink"], t["ground"]),2),
      muted  = round(ratio(t["muted"], t["ground"]),2),
      head   = round(ratio(t["headink"], t["headbg"]),2),
      headdim= round(ratio(t["headdim"], t["headbg"]),2),
      link   = round(ratio(t["accent"], t["ground"]),2),
      tick   = round(ratio(t["ok"], t["ground"]),2),
    )
T4_HEAD_L = round(lum("#282864")*100,1)

TEMPLATE = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__ID__ __NAME__ — bazaar ground variant</title>
<style>
/* ===========================================================================
   BAZAAR GROUND __ID__ — "__NAME__"
   T4's palette, unchanged, with ONE token moved: the ground. That fill is also
   the fill of the active navbar item, so lifting it lifts that chip's contrast
   against the cobalt bar at the same time.
   Cobalt #282864, clay #A0503C, ochre #C8A078, teal #2F8C86 and gold #B8873B
   are exactly as they shipped, sampled from assets/banner-tiles.jpeg.
   Only `--ground` and `--paper` differ between __ID__ and its three siblings.
   Contrast ratios in the footer strip are computed from these tokens, not
   asserted.
   Includes the three requested changes: a centred content column with reserved
   gutters, a collapsible sidebar, a heavier completion tick, and the current
   level emphasised in the sidebar.
   =========================================================================== */
:root {
/*ROOT*/
  --sans:"Avenir Next", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --nav:262px;
  --ease:cubic-bezier(.22,.61,.36,1);
}
* { box-sizing:border-box; }
body { margin:0; background:var(--ground); color:var(--ink); font:16px/1.68 var(--sans); }
a { color:var(--accent); text-decoration:none; }
a:hover { text-decoration:underline; text-underline-offset:2px; }
:focus-visible { outline:2px solid var(--accent2); outline-offset:2px; }

.pg { background:var(--ink); color:var(--ground); padding:10px 20px; font-size:13.5px; }
.pg b { background:var(--gold); color:#20201c; padding:1px 7px; border-radius:3px; margin-right:8px; }
.pg span { opacity:.82; }

/* ---- header ------------------------------------------------------------ */
.top { background:var(--headbg); color:var(--headink); position:sticky; top:0; z-index:40;
       border-bottom:1px solid var(--headline); }
.top-in { display:flex; align-items:center; gap:16px; height:58px; padding:0 22px; }
.brand { display:flex; align-items:center; gap:10px; color:var(--headink); font:600 16px/1 var(--sans); }
.brand:hover { text-decoration:none; }
/* the mark: T4's four glazed squares, unchanged. */
.cubes { display:grid; grid-template-columns:9px 9px; gap:2px; }
.cubes i { width:9px; height:9px; border-radius:2px; display:block; }
.cubes i.rose { background:var(--l5); } .cubes i.orange { background:var(--l1); }
.cubes i.green { background:var(--l4); } .cubes i.gap { background:var(--ground); }
.mainnav { display:flex; gap:2px; margin-left:4px; }
.mainnav > * { position:relative; }
.mainnav a, .mainnav button.lv { color:var(--headdim); padding:7px 11px; border-radius:5px;
       font:500 14.5px/1 var(--sans); border:0; background:none; cursor:pointer;
       display:inline-flex; align-items:center; gap:6px; height:32px; }
.mainnav a:hover, .mainnav button.lv:hover { background:var(--headhover); color:var(--headink); text-decoration:none; }
.mainnav a[aria-current] { background:var(--headchip); color:var(--headchipink); font-weight:600; }
.mainnav .cv { fill:none; stroke:currentColor; stroke-width:1.8; }
.dd { position:absolute; top:40px; left:0; min-width:214px; background:var(--paper);
      border:1px solid var(--line); border-radius:8px; padding:6px; z-index:60;
      box-shadow:0 12px 28px rgba(40,30,10,.13); display:none; }
.mainnav > *:hover .dd, .mainnav > *:focus-within .dd { display:block; }
.dd a { display:flex; align-items:center; gap:9px; padding:7px 10px; border-radius:5px;
      color:var(--ink); font:500 14px/1.3 var(--sans); }
.dd a:hover { background:var(--sand); text-decoration:none; }
.dd a .key { width:4px; height:15px; border-radius:2px; flex:none; }
.dd a .n { margin-left:auto; font-size:12px; color:var(--muted); }
.sp { flex:1 }
.srch { display:flex; align-items:center; gap:8px; height:33px; padding:0 11px;
        border:1px solid var(--headfieldline); border-radius:5px; background:var(--headfield);
        color:var(--headdim); font-size:14px; min-width:180px; cursor:text; }
.ib { width:33px; height:33px; border:1px solid var(--headfieldline); border-radius:5px;
      background:var(--headfield); color:var(--headink); display:grid; place-items:center;
      cursor:pointer; font:600 11px/1 var(--sans); }
.ib:hover { background:var(--headhover); }

/* the one ornamental moment: a tile lattice on a gold rule */
.band { height:18px; background-color:var(--bandground);
  background-image:
    linear-gradient(45deg, var(--banda) 25%, transparent 25% 75%, var(--banda) 75%),
    linear-gradient(45deg, var(--bandb) 25%, transparent 25% 75%, var(--bandb) 75%),
    linear-gradient(45deg, var(--bandc) 25%, transparent 25% 75%, var(--bandc) 75%);
  background-size:18px 18px, 18px 18px, 54px 18px;
  background-position:0 0, 9px 9px, 27px 0;
  border-bottom:2px solid var(--gold); }

/* ---- shell: the middle column takes everything left over --------------- */
.shell { display:grid; grid-template-columns:var(--nav) minmax(0,1fr) 204px; align-items:start;
         transition:grid-template-columns 200ms var(--ease); }
body.folded .shell { grid-template-columns:0px minmax(0,1fr) 204px; }
@media (max-width:1180px){ .shell{grid-template-columns:var(--nav) minmax(0,1fr)} .toc{display:none}
  body.folded .shell{grid-template-columns:0px minmax(0,1fr)} }
@media (max-width:880px){ .shell{grid-template-columns:minmax(0,1fr)} .side{display:none} }

/* ---- the collapsible sidebar ------------------------------------------- */
.side { position:sticky; top:76px; height:calc(100vh - 76px); overflow:hidden auto;
        border-right:1px solid var(--line); background:var(--ground);
        transition:opacity 150ms var(--ease), transform 200ms var(--ease); }
.side-in { padding:16px 12px 48px; width:var(--nav); }
body.folded .side { opacity:0; transform:translateX(-14px); overflow:hidden;
        border-right-color:transparent; pointer-events:none; }
@media (prefers-reduced-motion: reduce){
  .shell,.side{transition:none} .arch ul{transition:none}
}
.foldbar { display:flex; align-items:center; gap:8px; padding:0 2px 4px; }
.foldbar .t { font:600 12px/1 var(--sans); letter-spacing:.06em; color:var(--faint);
        text-transform:none; }
.fold { margin-left:auto; width:28px; height:28px; display:grid; place-items:center;
        border:1px solid var(--line); border-radius:6px; background:var(--paper);
        color:var(--muted); cursor:pointer; }
.fold:hover { background:var(--sand); color:var(--ink); }
.unfold { position:fixed; left:0; top:50%; transform:translateY(-50%); z-index:50; display:none;
        width:26px; height:60px; border:1px solid var(--line); border-left:0;
        border-radius:0 9px 9px 0; background:var(--paper); color:var(--muted); cursor:pointer;
        place-items:center; box-shadow:2px 0 10px rgba(40,30,10,.1); }
body.folded .unfold { display:grid; }
.unfold:hover { color:var(--ink); background:var(--sand); }

/* a level, as an arch. THE CURRENT LEVEL is unmistakable. */
.arch > summary { list-style:none; cursor:pointer; display:flex; align-items:center; gap:9px;
        padding:9px 12px; font:600 14.5px/1.2 var(--sans); color:var(--ink);
        background:var(--paper); border:1px solid var(--line);
        border-radius:14px 14px 4px 4px; margin-top:8px;
        transition:background 120ms var(--ease), border-color 120ms var(--ease); }
.arch > summary::-webkit-details-marker { display:none }
.arch > summary:hover { background:var(--sand); border-color:var(--line2); }
.arch .key { width:5px; height:17px; border-radius:2px; flex:none;
        transition:height 160ms var(--ease), width 160ms var(--ease); }
.arch .n { margin-left:auto; font:500 12.5px/1 var(--sans); color:var(--muted); }
.arch[data-here] > summary { font-size:16px; padding:12px 12px 12px 11px;
        background:var(--sand); border-color:var(--line2); border-left:4px solid var(--here); }
.arch[data-here] > summary .key { width:6px; height:23px; }
.arch[data-here] > summary .n { color:var(--ink); font-weight:600; }
.arch ul { list-style:none; margin:0 0 4px 16px; padding:6px 0 4px 14px;
        border-left:1px solid var(--line); }
.arch li a { display:flex; align-items:center; gap:8px; padding:6px 9px; border-radius:5px;
        color:var(--muted); font-size:14px; }
.arch li a:hover { background:var(--paper); color:var(--ink); text-decoration:none; }
.arch li a[aria-current] { background:var(--here); color:#fff; font-weight:600; }
.arch li a .soon { margin-left:auto; font-size:11px; color:var(--faint);
        border:1px solid var(--line); border-radius:3px; padding:1px 5px; }
/* the completion tick: a filled disc, not a hairline glyph */
.tick { flex:none; width:17px; height:17px; border-radius:50%; background:var(--ok);
        display:grid; place-items:center; }
.tick svg { width:11px; height:11px; fill:none; stroke:#fff; stroke-width:2.6;
        stroke-linecap:round; stroke-linejoin:round; }
.arch li a[aria-current] .tick { background:#fff; }
.arch li a[aria-current] .tick svg { stroke:var(--here); }

/* ---- content: centred, wide, with gutters that clear both rails -------- */
main { padding:30px clamp(24px,3.4vw,56px) 96px; min-width:0; }
.col { max-width:min(100%, 80ch); margin-inline:auto; }
.crumb { color:var(--muted); font-size:13.5px; margin-bottom:14px; display:flex; gap:8px; }
.crumb a { color:var(--muted) }
h1 { font:600 38px/1.16 var(--sans); letter-spacing:-.015em; margin:0 0 12px; color:var(--title); }
.row { display:flex; align-items:center; gap:11px; flex-wrap:wrap; margin:0 0 28px;
       color:var(--muted); font-size:14px; }
.tag { display:inline-flex; align-items:center; gap:7px; border-radius:4px; padding:4px 10px;
       font:600 12.5px/1 var(--sans); background:var(--paper); border:1px solid var(--line); }
.tag i { width:7px; height:7px; border-radius:2px; }
h2 { font:600 25px/1.28 var(--sans); margin:44px 0 14px; letter-spacing:-.012em; color:var(--title);
     display:flex; align-items:center; gap:12px; }
h2::after { content:""; flex:1; height:2px;
     background:repeating-linear-gradient(90deg,var(--ochre) 0 6px,transparent 6px 12px); }
h3 { font:600 18.5px/1.35 var(--sans); margin:30px 0 8px; }
p { margin:0 0 17px; }
.prose a { font-weight:500; text-decoration:underline; text-underline-offset:2px;
     text-decoration-color:var(--ochre); }
.prose ul { margin:0 0 17px; padding-left:22px } .prose li { margin:6px 0 }
.prose strong { font-weight:650 }

.goals { background:var(--paper); border:1px solid var(--line); border-radius:4px 14px 4px 14px;
     padding:17px 20px; margin:0 0 28px; }
.goals b { display:block; font-size:14px; margin-bottom:8px; color:var(--title); }
.goals ul { margin:0; padding-left:20px } .goals li { margin:5px 0; font-size:15px }

/* dark slab, the chosen code and diagram treatment */
.slab { --sl-bg:#1d1f27; --sl-ink:#e7e3d8; --sl-line:#33363f;
     margin:0 0 24px; border:1px solid var(--sl-line); border-radius:7px; overflow:hidden;
     background:var(--sl-bg); }
.slab header { display:flex; padding:9px 13px; color:#9aa0ad; font:12.5px/1 var(--mono);
     border-bottom:1px solid var(--sl-line); }
.slab header span { margin-left:auto }
.slab pre { margin:0; padding:15px 17px; overflow-x:auto; font:13.5px/1.75 var(--mono);
     color:var(--sl-ink); }
.k{color:#c48ce0;font-weight:600} .s{color:#8fcf9a} .c{color:#767c88;font-style:italic}
.f{color:#7fb8e8} .n{color:#e0a45c;font-weight:600}

figure { margin:0 0 28px }
.diagram { border:1px solid #33363f; border-radius:7px; background:#1d1f27; }
.diagram .in { overflow-x:auto; overscroll-behavior-x:contain; padding:20px 18px; min-width:0; }
.diagram .in > svg { max-width:100%; height:auto; }
figcaption { color:var(--muted); font-size:13.5px; margin-top:9px; }
.flow { display:flex; align-items:center; min-width:min-content }
.node { border:1px solid #444854; border-radius:5px; padding:9px 13px; font-size:13.5px;
     white-space:nowrap; background:#262933; color:#dcd8cd; }
.node.on { background:var(--l1); border-color:var(--l1); color:#fff; font-weight:600; }
.arr { color:#6e737f; padding:0 8px; font-weight:700 }

.act { display:flex; align-items:center; gap:13px; flex-wrap:wrap; margin-top:44px;
     padding-top:22px; border-top:2px solid var(--line); }
.btn { border:1px solid var(--accent); background:var(--accent); color:#fff;
     font:600 15px/1 var(--sans); padding:11px 20px; border-radius:5px; cursor:pointer;
     display:inline-flex; align-items:center; gap:9px; }
.btn:hover { filter:brightness(1.12) }
.btn.g { background:var(--paper); color:var(--ink); border-color:var(--line2) }
.btn.g:hover { background:var(--sand); filter:none }
.act .m { color:var(--muted); font-size:14px; margin:0 }
.pn { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:34px }
.pn a { border:1px solid var(--line); border-radius:4px; padding:13px 15px; background:var(--paper) }
.pn a:hover { border-color:var(--line2); text-decoration:none; background:var(--sand) }
.pn small { display:block; color:var(--faint); font-size:12.5px; margin-bottom:3px }
.pn b { color:var(--title); font-weight:600; font-size:15px }
.pn .r { text-align:right }

.toc { position:sticky; top:76px; padding:30px 20px 40px 8px; }
.toc b { display:block; font-size:12.5px; color:var(--muted); margin-bottom:10px; font-weight:600; }
.toc a { display:block; padding:5px 0 5px 12px; font-size:13.5px; color:var(--muted);
     border-left:2px solid var(--line); }
.toc a:hover { color:var(--ink); text-decoration:none }
.toc a[aria-current] { color:var(--accent); border-left-color:var(--accent); font-weight:600 }

/* the strip at the foot: what this palette measures */
.mx { border-top:1px solid var(--line); background:var(--paper); padding:16px 22px;
      font:13px/1.6 var(--sans); color:var(--muted); }
.mx table { border-collapse:collapse; margin-top:8px }
.mx td { padding:3px 16px 3px 0; }
.mx td:first-child { color:var(--ink) }
.mx code { font:12.5px/1 var(--mono); background:var(--sand); padding:2px 5px; border-radius:3px }
.sw { display:flex; gap:0; margin-top:10px; border:1px solid var(--line); border-radius:4px;
      overflow:hidden; width:max-content }
.sw i { width:46px; height:26px; display:block }
</style>
</head>
<body>

<div class="pg"><b>__ID__</b><span>__NAME__ &mdash; __NOTE__</span></div>

<header class="top">
  <div class="top-in">
    <a class="brand" href="#">
      <span class="cubes" aria-hidden="true"><i class="rose"></i><i class="orange"></i><i class="green"></i><i class="gap"></i></span>
      AI Engineering Bazaar
    </a>
    <nav class="mainnav">
      <a href="#">Home</a>
      <span><button class="lv" aria-current="page">Curriculum
        <svg class="cv" width="10" height="10" viewBox="0 0 12 12"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg></button>
        <div class="dd">
          <a href="#"><span class="key" style="background:var(--l1)"></span>Fundamentals<span class="n">8</span></a>
          <a href="#"><span class="key" style="background:var(--l2)"></span>Intermediate<span class="n">8</span></a>
          <a href="#"><span class="key" style="background:var(--l3)"></span>Expert<span class="n">11</span></a>
          <a href="#"><span class="key" style="background:var(--l4)"></span>Ecosystem<span class="n">5</span></a>
          <a href="#"><span class="key" style="background:var(--l5)"></span>Protocols &amp; Specs<span class="n">1</span></a>
        </div></span>
      <a href="#">Catalog</a>
      <a href="#">My progress</a>
    </nav>
    <div class="sp"></div>
    <div class="srch" role="button" tabindex="0">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l4.5 4.5"/></svg>
      Search
    </div>
    <button class="ib" title="Theme">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="3.4"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15"/></svg>
    </button>
    <button class="ib" title="Türkçe">TR</button>
  </div>
</header>
<div class="band" aria-hidden="true"></div>

<button class="unfold" id="unfold" aria-label="Show the curriculum">
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3l5 5-5 5"/></svg>
</button>

<div class="shell">
  <aside class="side" id="side">
   <div class="side-in">
    <div class="foldbar">
      <span class="t">Curriculum</span>
      <button class="fold" id="fold" aria-label="Hide the curriculum">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 3L5 8l5 5"/></svg>
      </button>
    </div>
    <details class="arch" data-here open style="--here:var(--l1)">
      <summary><span class="key" style="background:var(--l1)"></span>Fundamentals<span class="n">3/8</span></summary>
      <ul>
        <li><a href="#"><span class="tick"><svg viewBox="0 0 12 12"><path d="M2 6.4l2.6 2.6L10 3.4"/></svg></span>LLM Fundamentals</a></li>
        <li><a href="#"><span class="tick"><svg viewBox="0 0 12 12"><path d="M2 6.4l2.6 2.6L10 3.4"/></svg></span>Training LLMs</a></li>
        <li><a href="#" aria-current="page"><span class="tick"><svg viewBox="0 0 12 12"><path d="M2 6.4l2.6 2.6L10 3.4"/></svg></span>RAG &amp; Embeddings</a></li>
        <li><a href="#">Tool Calling</a></li>
        <li><a href="#">Memory</a></li>
        <li><a href="#">AI Agents</a></li>
        <li><a href="#">Multi-Agent Systems</a></li>
        <li><a href="#">Observability</a></li>
      </ul>
    </details>
    <details class="arch" style="--here:var(--l2)">
      <summary><span class="key" style="background:var(--l2)"></span>Intermediate<span class="n">0/8</span></summary>
      <ul>
        <li><a href="#">Prompt Engineering</a></li>
        <li><a href="#">Context Engineering</a></li>
        <li><a href="#">Coding Agents</a></li>
        <li><a href="#">Harness Engineering</a></li>
        <li><a href="#">Loop Engineering</a></li>
        <li><a href="#">Generative UI <span class="soon">soon</span></a></li>
        <li><a href="#">Security</a></li>
        <li><a href="#">Personal Agents</a></li>
      </ul>
    </details>
    <details class="arch" style="--here:var(--l3)">
      <summary><span class="key" style="background:var(--l3)"></span>Expert<span class="n">0/11</span></summary>
      <ul>
        <li><a href="#">Advanced Tools <span class="soon">soon</span></a></li>
        <li><a href="#">Advanced Memory <span class="soon">soon</span></a></li>
      </ul>
    </details>
    <details class="arch" style="--here:var(--l4)">
      <summary><span class="key" style="background:var(--l4)"></span>Ecosystem<span class="n">0/5</span></summary>
      <ul>
        <li><a href="#">Agent Frameworks</a></li>
        <li><a href="#">Inference Providers</a></li>
      </ul>
    </details>
    <details class="arch" style="--here:var(--l5)">
      <summary><span class="key" style="background:var(--l5)"></span>Protocols &amp; Specs<span class="n">0/1</span></summary>
      <ul><li><a href="#">Protocols Reference <span class="soon">soon</span></a></li></ul>
    </details>
   </div>
  </aside>

  <main>
   <div class="col">
    <nav class="crumb"><a href="#">Curriculum</a>/<a href="#">Fundamentals</a>/<span>RAG &amp; Embeddings</span></nav>
    <h1>RAG &amp; Embeddings</h1>
    <div class="row">
      <span class="tag"><i style="background:var(--l1)"></i>Fundamentals</span>
      <span class="tag">Module 3 of 8</span>
      <span>30 min &middot; 1,814 words &middot; English &amp; T&uuml;rk&ccedil;e</span>
    </div>

    <div class="prose">
      <div class="goals">
        <b>What you will be able to do</b>
        <ul>
          <li>Explain why retrieval beats fine-tuning for facts that change</li>
          <li>Describe how text becomes an embedding, and how similarity is measured</li>
          <li>Walk through the retrieve-then-generate pipeline end to end</li>
          <li>Decide, for a given problem, whether you want RAG or fine-tuning</li>
        </ul>
      </div>

      <p><a href="#">LLM Fundamentals</a> gave you the context window: the model's working desk, and
      everything on it has to fit. <a href="#">Training LLMs</a> gave you fine-tuning: changing the
      model itself. This module is about the third option, and the one you will reach for most.</p>

      <h2>Why RAG exists</h2>
      <p>A model knows what it was trained on. Ask it about your company's internal handbook and it
      has three ways to answer, and only one of them is any good: guess, be retrained, or be handed
      the relevant page at the moment you ask.</p>

      <figure>
        <div class="diagram"><div class="in"><div class="flow">
          <span class="node">Question</span><span class="arr">&rarr;</span>
          <span class="node">Search your data</span><span class="arr">&rarr;</span>
          <span class="node">Find the relevant page</span><span class="arr">&rarr;</span>
          <span class="node">Question + page in the context</span><span class="arr">&rarr;</span>
          <span class="node on">Model answers from what it sees</span>
        </div></div></div>
        <figcaption>The model is never changed. Everything happens in the input, which is why a
        document added this morning can be answered about this afternoon.</figcaption>
      </figure>

      <h3>What an embedding actually is</h3>
      <p>An embedding is a list of numbers that stands for a piece of text, arranged so that texts
      meaning similar things end up close together. Similarity becomes distance, and distance is
      something a database can sort by.</p>

      <div class="slab">
        <header>rag.py<span>python</span></header>
<pre><span class="c"># one embedding, then one nearest-neighbour search</span>
<span class="k">from</span> openai <span class="k">import</span> OpenAI

client = <span class="f">OpenAI</span>()
vector = client.embeddings.<span class="f">create</span>(
    model=<span class="s">"text-embedding-3-small"</span>,
    input=<span class="s">"How do I rotate the signing key?"</span>,
).data[<span class="n">0</span>].embedding

hits = store.<span class="f">query</span>(vector, top_k=<span class="n">4</span>)
</pre>
      </div>

      <p>Four passages come back, they go into the context alongside the question, and the model
      answers from what it can see rather than from what it remembers.</p>
    </div>

    <div class="act">
      <button class="btn">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M3 8.6l3.4 3.4L13 4.6"/></svg>
        Mark complete
      </button>
      <button class="btn g">Requirements (2)</button>
      <p class="m">Saved in this browser</p>
    </div>

    <nav class="pn">
      <a href="#"><small>Previous</small><b>Training LLMs</b></a>
      <a class="r" href="#"><small>Next</small><b>Tool Calling</b></a>
    </nav>
   </div>
  </main>

  <aside class="toc">
    <b>On this page</b>
    <a href="#" aria-current="true">Why RAG exists</a>
    <a href="#">What an embedding is</a>
    <a href="#">Where embeddings live</a>
    <a href="#">The RAG process</a>
    <a href="#">Tools</a>
    <a href="#">Summary</a>
  </aside>
</div>

<div class="mx">
  <div class="sw">__SWATCH__</div>
  <table>__METRICS__</table>
</div>

<script>
  const b = document.body;
  document.getElementById('fold').onclick   = () => b.classList.add('folded');
  document.getElementById('unfold').onclick = () => b.classList.remove('folded');
</script>
</body>
</html>
'''

ORDER = ["ground","paper","sand","line","line2","ink","title","muted","faint",
         "headbg","headink","headdim","headline","headhover","headchip","headchipink",
         "headfield","headfieldline","accent","accent2","ok","gold","ochre",
         "l1","l2","l3","l4","l5","bandground","banda","bandb","bandc"]
SWATCHES = ["ground","headbg","bandground","l1","l2","l3","l4","l5","accent","ok"]

root = os.path.dirname(os.path.abspath(__file__))
OUT = "/home/amirkia/Desktop/ai-engineering-bazaar/playground"

for vid, v in VARIANTS.items():
    t = v["tok"]; r = REPORT[vid]
    css = "\n".join(f"  --{k}:{t[k]};" for k in ORDER)
    sw  = "".join(f'<i style="background:{t[k]}" title="--{k} {t[k]}"></i>' for k in SWATCHES)
    met = (
      f"<tr><td>Ground</td><td><code>{t['ground']}</code></td>"
      f"<td>relative luminance {r['ground_L']}% &middot; today's cream is 84.6%</td></tr>"
      f"<tr><td>Body text on ground</td><td><code>{t['ink']}</code> on <code>{t['ground']}</code></td>"
      f"<td>{r['body']}:1</td></tr>"
      f"<tr><td>Secondary text</td><td><code>{t['muted']}</code></td><td>{r['muted']}:1</td></tr>"
      f"<tr><td>Header text</td><td><code>{t['headink']}</code></td>"
      f"<td>{r['head']}:1 &middot; nav idle {r['headdim']}:1</td></tr>"
      f"<tr><td>Link</td><td><code>{t['accent']}</code></td><td>{r['link']}:1</td></tr>"
      f"<tr><td>Completion tick</td><td><code>{t['ok']}</code></td><td>{r['tick']}:1</td></tr>"
    )
    html = (TEMPLATE.replace("/*ROOT*/", css)
                    .replace("__ID__", vid)
                    .replace("__NAME__", v["name"])
                    .replace("__NOTE__", v["note"])
                    .replace("__SWATCH__", sw)
                    .replace("__METRICS__", met))
    slug = v["name"].lower().replace(" ","-")
    p = f"{OUT}/01-theme-T4-ground-{vid}-{slug}.html"
    open(p, "w").write(html)
    print(f"{vid} {v['name']:14s} ground L={r['ground_L']:5.1f}%  body={r['body']}:1  "
          f"muted={r['muted']}:1  head={r['head']}:1  navidle={r['headdim']}:1  "
          f"link={r['link']}:1  tick={r['tick']}:1  -> {os.path.basename(p)}")
print(f"\nT4 cobalt #282864 header luminance = {T4_HEAD_L}%")

# --------------------------------------------------------------------------
# the compare page: four miniatures plus the original, drawn natively so no
# iframe is involved and file:// cannot blank them out
# --------------------------------------------------------------------------
T4 = dict(name="T4 Bazaar (what you have now)", ground="#f4ece0", paper="#fffdf9", sand="#e6dac6",
          line="#d8cbb4", line2="#c3b299", ink="#20242e", muted="#6a6558",
          headbg="#282864", headink="#ffffff", headdim="#c9c6e4", headchip="#f4ece0",
          headchipink="#1b1b47", accent="#282864", ok="#2f8c86",
          l1="#2f8c86", l2="#282864", l3="#7a4a86", l4="#b8873b", l5="#a0503c",
          bandground="#282864", banda="#2f8c86", bandb="#c8a078", bandc="#a0503c",
          gold="#b8873b", faint="#948d7d",
          note="For reference: the ground as it ships today.", href="01-theme-T4-bazaar.html")

def mini(vid, t, name, note, href, metrics):
    return f'''
<section class="card">
  <div class="hd"><b>{vid}</b><h2>{name}</h2><a class="open" href="{href}">Open full page &rarr;</a></div>
  <p class="note">{note}</p>
  <div class="mock" style="--g:{t['ground']};--p:{t['paper']};--sd:{t['sand']};--ln:{t['line']};
       --l2c:{t['line2']};--ik:{t['ink']};--mu:{t['muted']};--hb:{t['headbg']};--hi:{t['headink']};
       --hd:{t['headdim']};--hc:{t['headchip']};--hci:{t['headchipink']};--ac:{t['accent']};
       --ok:{t['ok']};--k1:{t['l1']};--k2:{t['l2']};--k3:{t['l3']};--k4:{t['l4']};--k5:{t['l5']};
       --bg0:{t['bandground']};--ba:{t['banda']};--bb:{t['bandb']};--bc:{t['bandc']};--gd:{t['gold']}">
    <div class="m-top">
      <span class="m-cubes"><i class="rose"></i><i class="orange"></i><i class="green"></i><i class="gap"></i></span>
      <span class="m-brand">AI Engineering Bazaar</span>
      <span class="m-nav on">Curriculum</span><span class="m-nav">Catalog</span><span class="m-nav">My progress</span>
      <span class="m-field"></span>
    </div>
    <div class="m-band"></div>
    <div class="m-body">
      <div class="m-side">
        <div class="m-lvl here"><i style="background:var(--k1)"></i>Fundamentals<em>3/8</em></div>
        <div class="m-mod"><span class="m-tick">&#10003;</span>LLM Fundamentals</div>
        <div class="m-mod cur"><span class="m-tick w">&#10003;</span>RAG &amp; Embeddings</div>
        <div class="m-mod">Tool Calling</div>
        <div class="m-lvl"><i style="background:var(--k2)"></i>Intermediate<em>0/8</em></div>
        <div class="m-lvl"><i style="background:var(--k3)"></i>Expert<em>0/11</em></div>
        <div class="m-lvl"><i style="background:var(--k4)"></i>Ecosystem<em>0/5</em></div>
        <div class="m-lvl"><i style="background:var(--k5)"></i>Protocols</div>
      </div>
      <div class="m-main">
        <div class="m-h1">RAG &amp; Embeddings</div>
        <div class="m-tags"><span><i style="background:var(--k1)"></i>Fundamentals</span><span>Module 3 of 8</span></div>
        <div class="m-card"></div>
        <div class="m-line" style="width:96%"></div><div class="m-line" style="width:88%"></div>
        <div class="m-line lk" style="width:44%"></div>
        <div class="m-slab"></div>
        <div class="m-btn">Mark complete</div>
      </div>
    </div>
  </div>
  <div class="sw">{"".join(f'<i style="background:{t[k]}" title="{k} {t[k]}"></i>' for k in ["ground","paper","sand","headbg","bandground","l1","l2","l3","l4","l5","accent","ok"])}</div>
  <table class="met">{metrics}</table>
</section>'''

cards = []
for vid, v in VARIANTS.items():
    t = v["tok"]; r = REPORT[vid]
    chip = round(ratio(t['ground'], t['headbg']),2)
    met = (f"<tr><td>Ground</td><td><code>{t['ground']}</code> &nbsp;<b>{r['ground_L']}%</b> "
           f"&nbsp;<span>vs 84.6% today</span></td></tr>"
           f"<tr><td>Body text on it</td><td>{r['body']}:1 &nbsp;<span>13.24 today</span></td></tr>"
           f"<tr><td>Secondary text</td><td>{r['muted']}:1 &nbsp;<span>4.96 today</span></td></tr>"
           f"<tr><td>Link</td><td>{r['link']}:1 &nbsp;<span>11.36 today</span></td></tr>"
           f"<tr><td>Active navbar item on the bar</td><td>{chip}:1 &nbsp;<span>11.36 today</span></td></tr>"
           f"<tr><td>Raised surface</td><td><code>{t['paper']}</code></td></tr>")
    cards.append(mini(vid, t, v["name"], v["note"],
                      f"01-theme-T4-ground-{vid}-{v['name'].lower().replace(' ','-')}.html", met))
cards.append(mini("T4", T4, T4["name"], T4["note"], T4["href"],
    f"<tr><td>Ground</td><td><code>{T4['ground']}</code> &nbsp;<b>{round(lum(T4['ground'])*100,1)}%</b></td></tr>"
    f"<tr><td>Body text on it</td><td>{round(ratio(T4['ink'],T4['ground']),2)}:1</td></tr>"
    f"<tr><td>Secondary text</td><td>{round(ratio(T4['muted'],T4['ground']),2)}:1</td></tr>"
    f"<tr><td>Link</td><td>{round(ratio(T4['accent'],T4['ground']),2)}:1</td></tr>"
    f"<tr><td>Active navbar item on the bar</td><td>{round(ratio(T4['ground'],T4['headbg']),2)}:1</td></tr>"
    f"<tr><td>Raised surface</td><td><code>{T4['paper']}</code></td></tr>"))

COMPARE = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bazaar ground variants — G1 to G4</title>
<style>
:root { --sans:"Avenir Next", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
* { box-sizing:border-box }
body { margin:0; background:#f7f4ee; color:#1f2026; font:16px/1.66 var(--sans); }
.lead { max-width:74ch; margin:0 auto; padding:44px 24px 8px; }
h1 { font:600 32px/1.2 var(--sans); margin:0 0 12px; letter-spacing:-.015em }
.lead p { margin:0 0 14px; color:#55524a }
.lead code { font:13.5px/1 var(--mono); background:#eae5da; padding:2px 6px; border-radius:3px }
.grid { max-width:1180px; margin:0 auto; padding:20px 24px 90px; display:grid; gap:26px; }
@media (min-width:1000px){ .grid{grid-template-columns:1fr 1fr} }
.card { background:#fff; border:1px solid #e0dacd; border-radius:12px; padding:18px 18px 16px; }
.hd { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap }
.hd b { font:700 12px/1 var(--sans); background:#1f2026; color:#fff; padding:4px 8px; border-radius:4px }
.hd h2 { font:600 19px/1.3 var(--sans); margin:0 }
.hd .open { margin-left:auto; font:500 13.5px/1 var(--sans); color:#3f5f8f; text-decoration:none }
.hd .open:hover { text-decoration:underline }
.note { margin:8px 0 14px; font-size:14px; color:#5c584f; }

/* the miniature */
.mock { border:1px solid #ded8ca; border-radius:8px; overflow:hidden; background:var(--g); }
.m-top { display:flex; align-items:center; gap:7px; padding:0 10px; height:34px;
         background:var(--hb); color:var(--hi); }
.m-cubes { display:grid; grid-template-columns:5px 5px; gap:1px }
.m-cubes i { width:5px; height:5px; border-radius:1px; display:block }
.m-cubes i.rose{background:#dc5f3f} .m-cubes i.orange{background:#e88a2e}
.m-cubes i.green{background:#7fa352} .m-cubes i.gap{background:none}
.m-brand { font:600 10.5px/1 var(--sans); margin-right:4px }
.m-nav { font:500 9.5px/1 var(--sans); color:var(--hd); padding:3px 5px; border-radius:3px }
.m-nav.on { background:var(--hc); color:var(--hci); font-weight:600 }
.m-field { margin-left:auto; width:64px; height:15px; border-radius:3px;
           border:1px solid color-mix(in srgb, var(--hi) 26%, transparent) }
.m-band { height:9px; background-color:var(--bg0); border-bottom:1px solid var(--gd);
  background-image:
    linear-gradient(45deg, var(--ba) 25%, transparent 25% 75%, var(--ba) 75%),
    linear-gradient(45deg, var(--bb) 25%, transparent 25% 75%, var(--bb) 75%),
    linear-gradient(45deg, var(--bc) 25%, transparent 25% 75%, var(--bc) 75%);
  background-size:9px 9px, 9px 9px, 27px 9px; background-position:0 0, 4.5px 4.5px, 13.5px 0; }
.m-body { display:grid; grid-template-columns:132px 1fr; min-height:238px }
.m-side { padding:8px 6px; border-right:1px solid var(--ln) }
.m-lvl { display:flex; align-items:center; gap:5px; font:600 9.5px/1 var(--sans); color:var(--ik);
   background:var(--p); border:1px solid var(--ln); border-radius:7px 7px 2px 2px;
   padding:6px 6px; margin-top:5px }
.m-lvl i { width:3px; height:9px; border-radius:1px; flex:none }
.m-lvl em { margin-left:auto; font-style:normal; color:var(--mu); font-weight:500 }
.m-lvl.here { background:var(--sd); border-color:var(--l2c); border-left:3px solid var(--k1);
   font-size:10.5px; padding:7px 6px }
.m-lvl.here i { height:12px; width:4px }
.m-mod { display:flex; align-items:center; gap:5px; font:9.5px/1 var(--sans); color:var(--mu);
   padding:5px 6px 5px 12px; margin-left:8px; border-left:1px solid var(--ln) }
.m-mod.cur { background:var(--k1); color:#fff; font-weight:600; border-radius:4px;
   margin-left:8px; border-left-color:transparent }
.m-tick { width:11px; height:11px; border-radius:50%; background:var(--ok); color:#fff;
   font-size:7px; display:grid; place-items:center; flex:none }
.m-tick.w { background:#fff; color:var(--k1) }
.m-main { padding:12px 14px }
.m-h1 { font:600 16px/1.2 var(--sans); color:var(--ik); margin-bottom:7px }
.m-tags { display:flex; gap:5px; margin-bottom:10px }
.m-tags span { display:inline-flex; align-items:center; gap:4px; font:600 8px/1 var(--sans);
   color:var(--mu); background:var(--p); border:1px solid var(--ln); border-radius:3px; padding:3px 5px }
.m-tags i { width:4px; height:4px; border-radius:1px }
.m-card { height:42px; background:var(--p); border:1px solid var(--ln);
   border-radius:3px 10px 3px 10px; margin-bottom:11px }
.m-line { height:5px; background:var(--mu); opacity:.28; border-radius:2px; margin-bottom:6px }
.m-line.lk { background:var(--ac); opacity:.85 }
.m-slab { height:46px; background:#1d1f27; border:1px solid #33363f; border-radius:5px; margin:10px 0 11px }
.m-btn { display:inline-block; background:var(--ac); color:#fff; font:600 9.5px/1 var(--sans);
   padding:7px 11px; border-radius:4px }

.sw { display:flex; margin-top:14px; border:1px solid #e0dacd; border-radius:4px;
      overflow:hidden; width:max-content }
.sw i { width:36px; height:22px; display:block }
.met { border-collapse:collapse; margin-top:11px; font-size:13px; color:#55524a }
.met td { padding:2px 14px 2px 0 }
.met td:first-child { color:#1f2026 }
.met b { font-weight:700 } .met span { color:#8b857a }
</style></head><body>

<div class="lead">
  <h1>Bazaar, four grounds</h1>
  <p>T4's palette, unchanged. Cobalt <code>#282864</code>, clay <code>#A0503C</code>, ochre
  <code>#C8A078</code>, teal <code>#2F8C86</code> and gold <code>#B8873B</code> are exactly as they
  shipped. One token moves: <b>the ground</b>, the fill behind the page, which is also the fill of the
  active item in the navbar. Lifting it lifts that chip's contrast against the cobalt bar at the same
  time, which is why the last column below goes up as the ground goes lighter.</p>
  <p>Today's ground is <code>#F4ECE0</code>, at 84.6% relative luminance. The four below run from
  89.3% to 96.6%. Raised surfaces move with it, because a card cannot be darker than the page it sits
  on; nothing else in the palette changes.</p>
  <p>Each full page also carries the three changes you asked for: a centred content column with
  gutters clearing both rails, a module list that folds away, a completion tick that reads as a filled
  disc rather than a hairline, and the level you are in enlarged and marked.</p>
  <p>The numbers under each card are computed from the tokens, not asserted.</p>
</div>

<div class="grid">
__CARDS__
</div>
</body></html>
'''

open(f"{OUT}/01-theme-T4-grounds.html","w").write(COMPARE.replace("__CARDS__", "\n".join(cards)))
print("wrote 01-theme-T4-grounds.html")
