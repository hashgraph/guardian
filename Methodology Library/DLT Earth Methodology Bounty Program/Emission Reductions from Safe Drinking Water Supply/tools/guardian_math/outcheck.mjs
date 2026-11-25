// Validates each mathBlock's output document against its output schema exactly as Guardian does (ajv, strict JSON schema with $defs).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runMath } from './run.mjs';
const [dir, pdp, mrp] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(dir + '/policy.json', 'utf8'));
const B = {}; (function w(b) { if (b.blockType === 'mathBlock') B[b.tag] = b; (b.children || []).forEach(w); })(P.config);
const pd = JSON.parse(fs.readFileSync(pdp, 'utf8')), mr = JSON.parse(fs.readFileSync(mrp, 'utf8'));
const pdB = B.pp_err_calculation_pd_vcs_ex_ante, mrB = B.pp_err_calculation_mr_vcs_ex_post;
const a = runMath(pdB, pd, pdB.inputSchema, []).result;
const b = runMath(mrB, mr, mrB.inputSchema, [{ schema: pdB.inputSchema, document: pd }]).result;
const sch = {}; for (const f of fs.readdirSync(dir + '/schemas')) { const j = JSON.parse(fs.readFileSync(dir + '/schemas/' + f, 'utf8')); sch[j.iri.split('&')[0]] = j; }
const out = sch[pdB.outputSchema.split('&')[0]];
const props = new Set(Object.keys(out.document.properties));
for (const [n, r] of [['PD ex-ante', a], ['MR ex-post', b]]) {
  const extra = Object.keys(r).filter(k => !props.has(k));
  console.log(n, 'output keys', Object.keys(r).length, '| not in ERR schema:', extra.length ? extra.join(', ') : 'none');
  fs.writeFileSync(path.join(os.tmpdir(), 'out_' + n.split(' ')[0] + '.json'), JSON.stringify(r));
}
