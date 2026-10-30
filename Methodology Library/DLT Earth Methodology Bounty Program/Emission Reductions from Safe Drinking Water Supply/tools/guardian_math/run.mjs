// Runs a policy mathBlock with Guardian's own math-model (policy-service/src/policy-engine/helpers/math-model, main branch),
// exactly as helpers/workers/math-worker.ts does: MathEngine.from(expression) -> createContext -> setDocument(DocumentMap) -> outputs -> Code.run
import { MathEngine, Code, DocumentMap, setDocumentValueByPath } from './dist/math-model/index.js';
import fs from 'fs';
export function runMath(block, target, targetSchema, rels) {
  const map = new DocumentMap();
  map.addDocument({ schema: targetSchema, document: JSON.parse(JSON.stringify(target)) });
  map.addRelationships((rels || []).map(r => ({ schema: r.schema, document: JSON.parse(JSON.stringify(r.document)) })));
  const docs = DocumentMap.from(map.toJson());
  const group = MathEngine.from(block.expression);
  if (!group) throw new Error('Invalid block config');
  const gc = group.createContext();
  if (!gc) throw new Error('Invalid block config (context)');
  gc.setDocument(docs, {});
  const context = gc.getContext();
  const document = docs.getCurrent();
  let result = {};
  for (const link of group.outputs.getItems()) result[link.path] = context.scope[link.name];
  const code = Code.from(block.expression);
  code.setContext({ ...context, document, result, user: null, table: null });
  result = code.run();
  return { result, scope: context.scope, warnings: gc.getWarnings ? gc.getWarnings() : [] };
}
if (process.argv[1].endsWith('run.mjs')) {
  const [pol, pdp, mrp] = process.argv.slice(2);
  const P = JSON.parse(fs.readFileSync(pol, 'utf8'));
  const B = {}; (function w(b) { if (b.blockType === 'mathBlock') B[b.tag] = b; (b.children || []).forEach(w); })(P.config);
  const pd = JSON.parse(fs.readFileSync(pdp, 'utf8')), mr = JSON.parse(fs.readFileSync(mrp, 'utf8'));
  const pdB = B.pp_err_calculation_pd_vcs_ex_ante, mrB = B.pp_err_calculation_mr_vcs_ex_post;
  pd.id = pd.id || 'urn:uuid:sample-pd'; mr.pdRef = pd.id;
  const a = runMath(pdB, pd, pdB.inputSchema, []);
  const b = runMath(mrB, mr, mrB.inputSchema, [{ schema: pdB.inputSchema, document: pd }]);
  const num = (s) => Object.fromEntries(Object.entries(s).filter(([k, v]) => typeof v === 'number'));
  console.log(JSON.stringify({ pd: { annualER: a.result.ex_ante.maxAnnualER, flags: a.result.dataQualityFlags, declarative: num(a.scope) },
    mr: { ER: b.result.ER_final_total, pct: b.result.ex_post.pctDifference, flags: b.result.dataQualityFlags, declarative: num(b.scope) } }, null, 1));
}
