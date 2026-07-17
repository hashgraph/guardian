#!/usr/bin/env node
/**
 * VMR0015 Policy Integrity Test  (DLT Earth bounty — PR #6164)
 * Embeds the VERBATIM calculate_report_fields expression from the published policy
 * "VMR0015 v1.0 Safe Drinking Water dMRV FINAL-3 ...1781446804289"
 * (Monitoring Report schema #e0013904-d742-446e-a060-5fd210eb54ae).
 *
 * Confirmed live on Hedera testnet dry-run 2026-06-14: a canonical Monitoring Report
 * submitted with the ER field BLANK produced field3=162241.14, field6=154125.14 and a
 * MintToken VC of amount 154125.14 — matching the Verra VCS 3599 registry issuance.
 *
 * Run:  node policy_integrity_test.js   (exit 0 = all pass)
 */
function runExpr(documents){ let __r=null; function done(d){__r=d;}

function toNum(v){ var n = (typeof v === 'string') ? parseFloat(v) : v; return (isFinite(n)? n : 0); }
function floor2(x){ return Math.floor((toNum(x) + 1e-9) * 100) / 100; }

function compute(raw){
  // AMS-III.AV / VMR0015 quantification
  var QPW = toNum(raw.field12);
  var m   = toNum(raw.field13);
  var Xb  = toNum(raw.field14);
  var nwb = toNum(raw.field15);
  var EF  = toNum(raw.field16);
  var fi  = toNum(raw.field17);
  var BL  = toNum(raw.field18);

  // [Eq.5] specific energy consumption; nwb<=0 -> fail closed
  var SEC = (nwb > 0) ? (357.48 / nwb) : 0;
  if (fi > 1) fi = 1;            // fNRB cap (TOOL33)
  if (fi < 0) fi = 0;

  // [Eq.1] baseline emissions
  var BE = QPW * m * Xb * SEC * (BL * fi * EF * 1e-9);
  if (!(BE > 0)) BE = 0;

  var PE = toNum(raw.field4); if (PE < 0) PE = 0;
  var LE = toNum(raw.field5); if (LE < 0) LE = 0;

  // [Eq.7] emission reductions
  var ER = BE - PE - LE;
  if (ER < 0) ER = 0;

  // VMR0015 water-quality gate: pass-rate < 0.90 -> fail-closed
  var passC = toNum(raw.field10), totC = toNum(raw.field11);
  var pass = (totC > 0) ? (passC / totC) : 0;
  if (pass < 0.90) ER = 0;

  raw.field3 = floor2(BE);   // BE total
  raw.field6 = floor2(ER);   // ER total = MINT amount
}

// HANDBOOK ACCESS PATTERN: fields live directly on documents[0].document
// (Guardian draft/form shape). Fall back to credentialSubject for signed VCs, then bare.
var wrapper = documents[0];
var container = wrapper && wrapper.document ? wrapper.document : wrapper;

var target = container;
if (container && Array.isArray(container.credentialSubject) && container.credentialSubject.length > 0) {
  target = container.credentialSubject[0];
} else if (container && container.credentialSubject && typeof container.credentialSubject === 'object') {
  target = container.credentialSubject;
}

compute(target);
done(wrapper);

return __r; }

function calc(fields){
  const documents=[{ document: Object.assign({type:"mr"}, fields) }];
  const out=runExpr(documents);
  // resolve computed subject (flat document, or credentialSubject)
  const d=out.document?out.document:out;
  return (d.credentialSubject?(Array.isArray(d.credentialSubject)?d.credentialSubject[0]:d.credentialSubject):d);
}

const CANON={field10:95,field11:100,field12:713972729,field13:0.95,field14:1,field15:0.10,field16:81.6,field17:0.82,field18:1,field4:0,field5:8116};
const EPS=0.02; let pass=0,fail=0;
function chk(n,g,e){const ok=Math.abs(g-e)<=EPS;console.log((ok?"PASS":"FAIL")+"  "+n+"  (got "+g+", expected "+e+")");ok?pass++:fail++;}

console.log("=== VMR0015 POLICY INTEGRITY TEST ===\n");
let r=calc(CANON);
chk("T1 Canonical BE = 162241.14", r.field3, 162241.14);
chk("T1 Canonical ER = 154125.14", r.field6, 154125.14);
chk("T1 floor(ER) = 154125 VCU", Math.floor(r.field6), 154125);
r=calc(Object.assign({},CANON,{field10:85})); chk("T2 WQ 85% -> ER 0 (fail-closed)", r.field6, 0);
r=calc(Object.assign({},CANON,{field10:90})); chk("T3 WQ 90% boundary -> credits", r.field6, 154125.14);
r=calc(Object.assign({},CANON,{field10:0,field11:0})); chk("T4 no sampling -> ER 0", r.field6, 0);
r=calc(Object.assign({},CANON,{field15:0,field5:0})); chk("T5 nwb=0 -> BE 0", r.field3, 0);
r=calc(Object.assign({},CANON,{field4:999999})); chk("T6 PE+LE>BE -> ER 0", r.field6, 0);
r=calc(Object.assign({},CANON,{field3:88888,field6:99999})); chk("T7 typed values overwritten by calc", r.field6, 154125.14);
console.log("\n=== "+pass+" passed, "+fail+" failed ===");
process.exit(fail===0?0:1);
