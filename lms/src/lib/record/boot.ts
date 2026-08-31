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
 *   `data-hl-record="1"`                  a readable record exists
 *   `data-hl-storage="ok" | "blocked"`    tells empty state 1 from 4 (§12.13)
 *
 * The whole body is inside try/catch and does nothing on failure, which lands
 * the page in the honest empty state rather than a half-drawn one.
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

import { RECORD_STORAGE_KEY, SCHEMA_VERSION } from './schema'

/** Neither `<` nor a line separator may reach the inline script's text. */
function embed(value: Record<string, number>): string {
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
var T=${embed(categoryTotals)},M=${embed(slugToModule)};
var r=document.documentElement;
var isObj=function(v){return Object.prototype.toString.call(v)==="[object Object]"};
var own=function(o,k){return Object.prototype.hasOwnProperty.call(o,k)};
var bad=function(k){return !k||k==="__proto__"||k==="constructor"||k==="prototype"};
var raw=null,ok=1;
try{raw=window.localStorage.getItem(${JSON.stringify(RECORD_STORAGE_KEY)})}catch(e){ok=0}
r.setAttribute("data-hl-storage",ok?"ok":"blocked");
if(!ok||!raw)return;
var env=JSON.parse(raw);
if(!isObj(env)||typeof env.schema!=="number"||env.schema<1||env.schema>${SCHEMA_VERSION})return;
if(!isObj(env.data))return;
r.setAttribute("data-hl-record","1");
var sh=env.data.sheets;
if(!isObj(sh))return;
var counts={},k,c,i,n,rec;
for(k in sh){
if(!own(sh,k)||bad(k))continue;
rec=sh[k];
if(!isObj(rec)||!rec.signedOff)continue;
i=k.indexOf("/");
if(i>0){c=k.slice(0,i);if(!bad(c))counts[c]=(own(counts,c)?counts[c]:0)+1}
n=M[k];
if(typeof n==="number")r.classList.add("hl-signed-"+n)}
for(c in counts){
if(!own(counts,c))continue;
n=typeof T[c]==="number"?T[c]:0;
r.classList.add("hl-cat-"+c+(n>0&&counts[c]>=n?"-complete":"-started"))}
}catch(e){}})();`
}

/**
 * The script with no build-time facts embedded. It still stamps
 * `data-hl-storage`, `data-hl-record` and the per-category `-started` classes,
 * which is exactly as much as can be known without measuring the corpus — the
 * sign-off marks and `-complete` need the factory.
 */
export const RECORD_BOOT_SCRIPT: string = recordBootScript({}, {})
