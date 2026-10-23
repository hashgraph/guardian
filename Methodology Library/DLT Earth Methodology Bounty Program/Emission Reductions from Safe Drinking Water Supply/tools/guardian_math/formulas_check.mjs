// Checks that every declared formula of every mathBlock builds in Guardian's math engine. Guardian builds the formula functions one by one
// inside a single try block (math-context.js), so one function that the compute engine cannot assign silently drops every function after it.
// Usage: node formulas_check.mjs <policy.json or unzipped policy dir>
import { MathEngine, DocumentMap } from './dist/math-model/index.js';
import fs from 'fs';
let p = process.argv[2]; if (fs.statSync(p).isDirectory()) p += '/policy.json';
const P = JSON.parse(fs.readFileSync(p, 'utf8'));
let bad = 0;
(function w(b) {
  if (b.blockType === 'mathBlock') {
    const fns = [], vars = [];
    for (const g of b.expression.formulas || []) for (const it of g.items || []) (it.type === 'function' ? fns : vars).push(it.name);
    const g = MathEngine.from(b.expression); const map = new DocumentMap(); map.addDocument({ schema: b.inputSchema, document: {} });
    const gc = g.createContext(); gc.setDocument(DocumentMap.from(map.toJson()), {}); const ctx = gc.getContext();
    const missing = fns.filter(n => typeof (ctx.formulas || {})[n] !== 'function');
    const valid = gc.valid !== false;
    bad += missing.length + (valid ? 0 : 1);
    console.log(`${b.tag}: ${fns.length} functions, ${fns.length - missing.length} built${missing.length ? ' | MISSING ' + missing.join(', ') : ''} | ${vars.length} formula variables | context ${valid ? 'valid' : 'INVALID'}`);
  }
  (b.children || []).forEach(w);
})(P.config);
console.log(bad ? 'PROBLEMS ' + bad : 'PROBLEMS 0');
process.exit(bad ? 1 : 0);
