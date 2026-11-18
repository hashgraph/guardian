// One regression case: runs both VMR0015 mathBlocks through Guardian's own math-model (see run.mjs) and prints the results as JSON.
// Usage: node case.mjs <policy.json> <PD credentialSubject.json> <MR credentialSubject.json>
import fs from 'fs';
import { runMath } from './run.mjs';
const [pol, pdp, mrp] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(pol, 'utf8'));
const B = {}; (function w(b) { if (b.blockType === 'mathBlock') B[b.tag] = b; (b.children || []).forEach(w); })(P.config);
const pd = JSON.parse(fs.readFileSync(pdp, 'utf8')), mr = JSON.parse(fs.readFileSync(mrp, 'utf8'));
const pdB = B.pp_err_calculation_pd_vcs_ex_ante, mrB = B.pp_err_calculation_mr_vcs_ex_post;
const a = runMath(pdB, pd, pdB.inputSchema, []);
const b = runMath(mrB, mr, mrB.inputSchema, [{ schema: pdB.inputSchema, document: pd }]);
console.log(JSON.stringify({ engine: 'guardian-math-model', pd: a.result.ex_ante.maxAnnualER, pdflags: a.result.dataQualityFlags, mr: b.result.ER_final_total, flags: b.result.dataQualityFlags }));
