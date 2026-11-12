// Runs the two mathBlock scripts from a policy.json on sample documents, as Guardian's mathBlock does (document, relationships, scope, result).
const fs = require('fs');
const [policyPath, pdPath, mrPath] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const code = {};
(function w(b) { if (b.blockType === 'mathBlock') code[b.tag] = b.expression.code; (b.children || []).forEach(w); })(P.config);
const fn = (t) => new Function('document', 'relationships', 'scope', 'result', code[t]);
const pd = JSON.parse(fs.readFileSync(pdPath, 'utf8')), mr = JSON.parse(fs.readFileSync(mrPath, 'utf8'));
pd.id = 'urn:uuid:sample-pd';
mr.pdRef = pd.id;
const a = fn('pp_err_calculation_pd_vcs_ex_ante')(pd, [], undefined, {});
const b = fn('pp_err_calculation_mr_vcs_ex_post')(mr, [{ document: pd }], undefined, {});
console.log(JSON.stringify({
  pd: { annualER: a.ex_ante.maxAnnualER, ER_total: a.ex_ante.ER_total, rows: a.ex_ante.rows.length, flags: a.dataQualityFlags, scale: a.ex_ante.scale, tools: a.ex_ante.additionalityToolsAllowed },
  mr: { ER: b.ER_final_total, BE: b.ex_post.BE_total, PE: b.ex_post.PE_total, exAnte: b.ex_post.exAnteER_period, pct: b.ex_post.pctDifference, flags: b.dataQualityFlags,
        sections: b.ex_post.sections.map(s => ({ id: s.sectionId, Q: s.QPW_y, m: s.m, wq: s.WQ_fail_share, gates: [s.wqGate, s.sdwGate], disc: s.samplingDiscount, ER: s.ER_final, samp: s.samplingChecks.map(c => [c.requiredN, c.minimumSampleMet]) })) }
}, null, 1));
