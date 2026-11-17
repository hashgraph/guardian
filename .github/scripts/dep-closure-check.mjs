// Fails when a built dist/ imports a package that its workspace's *production*
// dependency closure does not provide. This is what breaks a service image
// after `yarn workspaces focus --production <svc>`, and what tsc cannot catch.
import fs from 'fs'; import path from 'path';
const ROOT = process.cwd();
const WS = JSON.parse(fs.readFileSync('package.json','utf8')).workspaces;
const BUILTIN = new Set(['assert','async_hooks','buffer','child_process','cluster','console','constants','crypto','dns','domain','events','fs','http','http2','https','inspector','module','net','os','path','perf_hooks','process','punycode','querystring','readline','repl','stream','string_decoder','sys','timers','tls','trace_events','tty','url','util','v8','vm','worker_threads','zlib']);

const walk = (d, o = []) => {
  let e; try { e = fs.readdirSync(d, { withFileTypes: true }); } catch { return o; }
  for (const x of e) {
    if (x.name === 'node_modules') continue;
    const p = path.join(d, x.name);
    x.isDirectory() ? walk(p, o) : o.push(p);
  }
  return o;
};
const pj = w => JSON.parse(fs.readFileSync(path.join(ROOT, w, 'package.json'), 'utf8'));
const pkgOf = s => {
  if (!s || s.startsWith('.') || s.startsWith('/') || s.startsWith('#') || s.startsWith('node:')) return null;
  const a = s.split('/');
  return s.startsWith('@') ? a.slice(0, 2).join('/') : a[0];
};
const resolvePkg = (n, from) => {
  let d = from;
  for (;;) {
    const p = path.join(d, 'node_modules', n);
    if (fs.existsSync(path.join(p, 'package.json'))) return p;
    const u = path.dirname(d); if (u === d) return null; d = u;
  }
};
// production closure: the workspace's own deps, plus, transitively, the deps of
// any @guardian/* workspace it depends on.
function prodClosure(ws, seen = new Set(), wsSeen = new Set()) {
  if (wsSeen.has(ws)) return seen; wsSeen.add(ws);
  const j = pj(ws);
  for (const d of Object.keys(j.dependencies || {})) {
    if (d.startsWith('@guardian/')) {
      seen.add(d);
      const sub = WS.find(w => { try { return pj(w).name === d; } catch { return false; } });
      if (sub) prodClosure(sub, seen, wsSeen);
      continue;
    }
    seen.add(d);
    const p = resolvePkg(d, path.join(ROOT, ws));
    if (!p) continue;
    const stack = [p];
    while (stack.length) {
      const c = stack.pop();
      let k; try { k = JSON.parse(fs.readFileSync(path.join(c, 'package.json'), 'utf8')); } catch { continue; }
      for (const t of Object.keys(k.dependencies || {})) {
        if (seen.has(t)) continue;
        seen.add(t);
        const q = resolvePkg(t, c); if (q) stack.push(q);
      }
    }
  }
  return seen;
}
// `from '...'` / `import('...')` / `require('...')` only - not arbitrary
// string literals, which is what made an earlier version of this script
// report template-literal text as a missing package.
const RE = /(?:\bfrom|\bimport\s*\(|\brequire\s*\()\s*['"]([^'"\n]+)['"]/g;
const VALID = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
// TS path aliases and Pyodide-internal modules are not npm packages.
const IGNORE = new Set(['micropip', 'pyodide.code']);
const isAlias = s => /^@(api|policy-engine|analytics|auth|database-modules|document-loader|entity|hedera-modules|helpers|subscribers)\b/.test(s);
let problems = 0, scanned = 0;
for (const ws of WS) {
  const dist = path.join(ROOT, ws, 'dist');
  if (!fs.existsSync(dist)) continue;
  scanned++;
  const closure = prodClosure(ws);
  const bad = new Map();
  for (const f of walk(dist).filter(f => /\.(js|mjs|cjs)$/.test(f))) {
    const t = fs.readFileSync(f, 'utf8');
    RE.lastIndex = 0; let m;
    while ((m = RE.exec(t))) {
      const p = pkgOf(m[1]);
      if (!p || BUILTIN.has(p) || closure.has(p)) continue;
      if (!VALID.test(p) || IGNORE.has(p) || isAlias(m[1])) continue;
      if (!bad.has(p)) bad.set(p, []);
      if (bad.get(p).length < 3) bad.get(p).push(path.relative(ROOT, f));
    }
  }
  for (const [p, files] of bad) {
    problems++;
    console.log(`MISSING FROM PRODUCTION CLOSURE  ${ws}  ->  ${p}`);
    for (const f of files) console.log(`    ${f}`);
  }
}
console.log(`\nscanned ${scanned} dist trees; ${problems ? problems + ' problem(s)' : 'clean'}`);
process.exit(problems ? 1 : 0);
