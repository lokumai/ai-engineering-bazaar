/**
 * §12.2 Channel A — the pre-paint boot script, for everything CSS can carry.
 *
 * A static export prerenders every page once, for every reader; there is no
 * request-time server, so no cookie and no header can carry reader state into
 * the HTML. An inline blocking script in `<head>` reads the record and stamps
 * `<html>` before first paint, and CSS then draws every mark: zero React, zero
 * hydration, correct in frame one. It extends the §2.5 precedent set by
 * `THEME_BOOT_SCRIPT` and is modelled directly on it.
 *
 * What it stamps:
 *
 *   `class="hl-signed-<n>"`               one per signed-off module number
 *   `class="hl-cat-<slug>-started"`       0 < approved < total in that category
 *   `class="hl-cat-<slug>-complete"`      approved >= total
 *   `data-hl-storage="ok" | "blocked"`    tells empty state 1 from 4 (§12.13)
 *   `data-bz-rail="folded"`               M10 — the curriculum rail is folded
 *   `data-hl-view="<id>"`                 M12 — the catalog view last chosen
 *   `data-hl-figures="<id>"`              the diagram palette last chosen
 *   `data-hl-code="<id>"`                 the code palette last chosen
 *   `style --bz-done-<slug>: <n>%`        M16 — how far through that level
 *
 * **The last one is a number and not a class, and it is the only one.** CSS
 * cannot count, which is why every other reading here is a class and why
 * `CategoryMeter` draws one segment per module rather than a bar. The channel
 * can count, though — this is a script, and it has the counts in hand three
 * lines above — so a `conic-gradient` stop can be handed a percentage it only
 * has to substitute. That is what lets `05`-C's dial be correct in frame one
 * instead of being a mark on the channel §12.2 forbids for exactly that.
 * `stamp.ts`'s `stampProgressFor` is the same derivation for after mount, and
 * `boot.test.ts` compares the two.
 *
 * **The rail and the view stamps are written BEFORE the `has` gate**, and that
 * order is the whole reason either is stamped here at all. A reader whose only
 * stored state is a folded rail carries nothing by §15.11's rule, so the gate
 * returns before the class list is touched; stamping the fold after it would
 * mean the rail sprang open on every load for exactly the readers who had asked
 * for it to be shut. It is a layout preference, not a record of work, and the
 * two questions are answered separately. M12's catalog view is the same case
 * one screen over: a reader whose only stored state is "show me the table"
 * would otherwise meet the overview on every load. The two palettes are the
 * same case again: a reader who chose Paper and nothing else would otherwise
 * meet Night every time.
 *
 * The view id is matched against the embedded `VIEW_IDS` before it reaches the
 * attribute: the value comes out of
 * Web Storage, it is untrusted input wherever it is read (§12.1.3), and the
 * only thing done with it here is to put it where a stylesheet's attribute
 * selector will answer to it.
 *
 * The whole body is inside try/catch and does nothing on failure, which lands
 * the page in the honest empty state rather than a half-drawn one.
 *
 * §15.11 — a record that carries nothing stamps nothing. An envelope holding
 * only `prefs`, or only a migration stamp, is what the store writes on a
 * reader's first theme click, and it has no sign-off to draw. `has` is the
 * same rule `schema.ts`'s `carriesNothing` applies — no day recorded, no
 * `meta.lastExport`, and every sheet record empty by `isEmptySheetRecord` — and
 * the script returns early when it is false, before the class and property
 * stamps.
 *
 * That rule is therefore written twice, which §12.1's one-definition rule
 * otherwise forbids. The duplication is forced: this file's product is an ES5
 * source string handed to the browser inside `<head>`, so it cannot import
 * `carriesNothing` — there is no module graph yet when it runs. What binds the
 * script to the typed side is `tests/unit/record/boot.test.ts`, which runs the
 * emitted script against raw payloads and compares what it stamps to
 * `stampClassesFor(coerceRecordData(raw))`; a change to either that the other
 * does not match fails there.
 *
 * **The gate validates SHAPE, and the loose version of it was a defect.** It
 * read `!=null` and truthiness, on the reasoning that a hand-edited record
 * arrives with fields missing and §12.1.3 says this script must not throw —
 * which confused not throwing with accepting. These checks run on RAW storage,
 * before `coerceRecordData`, so `days` as an object and more besides treated a
 * record as carrying something when the parser then threw the value away. Seven
 * such shapes were measured. Every field this gate inspects is now checked
 * against the rule the coercer applies to it — the same patterns, the same id
 * lists, the same real-calendar-day round trip — and being strict is what does
 * not throw, because each helper answers 0 for anything it does not recognise.
 *
 * It needs the per-category totals and the slug → module-number map, both of
 * which are build-time facts, so the export is a FACTORY: a layout measures the
 * corpus and JSON-embeds the two maps. The `-complete` class cannot be derived
 * without the totals, and inventing a total would be §11.25's failure.
 *
 * The category comes from the slug's own first segment (`fundamentals/llms` →
 * `fundamentals`), which is why identity is the slug: no second map is needed
 * and no number can drift.
 *
 * ES5 only, and no library: this runs before anything has decided what the
 * bundle targets, in whatever browser the reader brought.
 */

import {
  CATALOG_VIEWS,
  PALETTE_IDS,
  RECORD_STORAGE_KEY,
  SCHEMA_VERSION,
} from './schema'

/** Neither `<` nor a line separator may reach the inline script's text. */
function embed(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * @param categoryTotals sheets per category slug, drawn or not — the
 *   denominator the `-complete` class needs.
 * @param slugToModule the module number each slug prints as, for
 *   `hl-signed-<n>`.
 */
export function recordBootScript(
  categoryTotals: Record<string, number>,
  slugToModule: Record<string, number>,
): string {
  return `(function(){try{
var T=${embed(categoryTotals)},M=${embed(slugToModule)},V=${embed(CATALOG_VIEWS)},P=${embed(PALETTE_IDS)};
var r=document.documentElement;
var isObj=function(v){return Object.prototype.toString.call(v)==="[object Object]"};
var own=function(o,k){return Object.prototype.hasOwnProperty.call(o,k)};
var bad=function(k){return !k||k.length>200||k==="__proto__"||k==="constructor"||k==="prototype"};
var arr=function(v){return Object.prototype.toString.call(v)==="[object Array]"};
var H=/^[0-9a-f]{4,40}$/;
var pat=function(v,re){return typeof v==="string"&&re.test(v)?1:0};
var fin=function(x){return x===x&&isFinite(x)?1:0};
var realDay=function(t){var dt=new Date(t+"T00:00:00.000Z"),ms=dt.getTime();
return fin(ms)&&dt.toISOString().slice(0,10)===t?1:0};
var day=function(v){return pat(v,/^\\d{4}-\\d{2}-\\d{2}$/)&&realDay(v)?1:0};
var inst=function(v){if(!pat(v,/^\\d{4}-\\d{2}-\\d{2}(?:[T ][\\d:.+\\-Z]{1,20})?$/))return 0;
return realDay(v.slice(0,10))&&fin(Date.parse(v))?1:0};
var inL=function(L,v){for(var j=0;j<L.length;j++){if(L[j]===v)return 1}return 0};
var someDay=function(a){for(var j=0;j<a.length;j++){if(day(a[j]))return 1}return 0};
var ticked=function(o){if(!isObj(o))return 0;var q;for(q in o){
if(own(o,q)&&!bad(q)&&/^\\d{1,4}$/.test(q)&&o[q]===true)return 1}return 0};
var dwell=function(v){return typeof v==="number"&&fin(v)&&Math.round(v)>0?1:0};
var kept=function(rec){return inst(rec.signedOff)||pat(rec.signedRevision,H)||rec.reachedEnd===true
||dwell(rec.dwellSeconds)||ticked(rec.checklist)?1:0};
var sg=String(window.location&&window.location.pathname||"").split("/"),tk=inL(sg,"everyone")?"everyone":(inL(sg,"courses")||inL(sg,"sheets")?"engineers":null);
var tm=null;try{tm=window.sessionStorage.getItem("hl-track")}catch(e){}
r.setAttribute("data-bz-track",tk||(tm==="everyone"?"everyone":"engineers"));
var raw=null,ok=1;
try{raw=window.localStorage.getItem(${JSON.stringify(RECORD_STORAGE_KEY)})}catch(e){ok=0}
r.setAttribute("data-hl-storage",ok?"ok":"blocked");
if(!ok||!raw)return;
var env=JSON.parse(raw);
if(!isObj(env)||typeof env.schema!=="number"||env.schema<1||env.schema>${SCHEMA_VERSION})return;
var d=env.data;
if(!isObj(d))return;
if(isObj(d.prefs)&&d.prefs.railFolded===true)r.setAttribute("data-bz-rail","folded");
if(isObj(d.prefs)&&inL(V,d.prefs.catalogView))r.setAttribute("data-hl-view",d.prefs.catalogView);
if(isObj(d.prefs)&&inL(P,d.prefs.figurePalette))r.setAttribute("data-hl-figures",d.prefs.figurePalette);
if(isObj(d.prefs)&&inL(P,d.prefs.codePalette))r.setAttribute("data-hl-code",d.prefs.codePalette);
var k,has=0;
if(arr(d.days)&&someDay(d.days))has=1;
if(isObj(d.meta)&&inst(d.meta.lastExport))has=1;
var any=function(sh){if(!isObj(sh))return 0;var q,x;for(q in sh){
if(!own(sh,q)||bad(q))continue;x=sh[q];if(isObj(x)&&kept(x))return 1}return 0};
if(!has&&(any(d.sheets)||any(d.everyoneSheets)))has=1;
if(!has)return;
var stamp=function(sh,cp,dp){if(!isObj(sh))return;var counts={},c,i,n,rec;
for(k in sh){
if(!own(sh,k)||bad(k))continue;
rec=sh[k];
if(!isObj(rec)||!rec.signedOff)continue;
i=k.indexOf("/");
if(i>0){c=k.slice(0,i);if(!bad(c))counts[c]=(own(counts,c)?counts[c]:0)+1}
n=M[k];
if(typeof n==="number")r.classList.add(cp+"signed-"+n)}
for(c in counts){
if(!own(counts,c))continue;
n=typeof T[c]==="number"?T[c]:0;
r.classList.add(cp+"cat-"+c+(n>0&&counts[c]>=n?"-complete":"-started"));
if(n>0)r.style.setProperty(dp+c,Math.round(counts[c]/n*100)+"%")}};
stamp(d.sheets,"hl-","--bz-done-");
stamp(d.everyoneSheets,"hl-e-","--bz-edone-");
}catch(e){}})();`
}

/**
 * The script with no build-time facts embedded. It still stamps
 * `data-hl-storage` and the per-category `-started` classes, which is exactly
 * as much as can be known without measuring the corpus — the sign-off marks and
 * `-complete` need the factory.
 */
export const RECORD_BOOT_SCRIPT: string = recordBootScript({}, {})
