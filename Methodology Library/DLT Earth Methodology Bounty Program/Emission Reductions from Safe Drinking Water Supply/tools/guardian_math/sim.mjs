// VMR0015 offline workflow replay ("integrity test" without MGS).
// Replays the whole Project Proponent / VVB / Standard Registry workflow through the policy's own block graph:
// the events and the default (next-sibling) flow from policy.json, the sendToGuardian statuses and entity types,
// the documentsSourceAddon filters that decide which rows a user can act on, the buttons bound to those rows,
// the requestVcDocumentBlock presets and edit/ReferenceEvent behaviour, the switch conditions, the two customLogic
// overlap checks, the documentValidator conditions and source validations, the mint rule, and the two mathBlocks,
// which run through Guardian's own math-model (run.mjs). Every submitted and calculated document is validated
// against its schema from the policy file (JSON Schema 2020-12, Guardian $defs).
// It is not Guardian: no Hedera, IPFS, signatures or UI. Block semantics follow the Guardian source (main branch).
// Usage: node sim.mjs <unzipped policy dir> <sample-data dir (1_PP_account.json ... 7_VCU_Issuance_Request.json)>
import fs from 'fs';
import path from 'path';
import * as mathjs from 'mathjs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { runMath } from './run.mjs';

const [DIR, SAMPLES] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(path.join(DIR, 'policy.json'), 'utf8'));
const SCH = {};
for (const d of ['schemas', 'systemSchemas']) for (const f of fs.readdirSync(path.join(DIR, d))) { const j = JSON.parse(fs.readFileSync(path.join(DIR, d, f), 'utf8')); SCH[j.iri] = j; SCH[j.iri.split('&')[0]] = SCH[j.iri.split('&')[0]] || j; }
const TOKENS = fs.readdirSync(path.join(DIR, 'tokens')).map(f => JSON.parse(fs.readFileSync(path.join(DIR, 'tokens', f), 'utf8')));
const base = (i) => String(i || '').split('&')[0];

// ---------- blocks ----------
const BY = {}, PARENT = {}, KIDS = {};
(function w(b, par) { BY[b.tag] = b; PARENT[b.tag] = par; KIDS[b.tag] = (b.children || []).map(c => c.tag); (b.children || []).forEach(c => w(c, b.tag)); })(P.config, null);
const EVENTS = []; for (const t in BY) for (const e of BY[t].events || []) if (!e.disabled) EVENTS.push(e);
const DEFAULT_FLOW = new Set(['requestVcDocumentBlock', 'sendToGuardianBlock', 'mathBlock', 'customLogicBlock', 'documentValidatorBlock', 'mintDocumentBlock']);

// ---------- schema validation ----------
const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true });
addFormats(ajv);
const compiled = {};
function prepSchema(doc) {
  const d = JSON.parse(JSON.stringify(doc));
  const fix = (o) => {
    if (Array.isArray(o)) return o.forEach(fix);
    if (!o || typeof o !== 'object') return;
    if (typeof o.$ref === 'string' && o.$ref.startsWith('#') && !o.$ref.startsWith('#/')) o.$ref = '#/$defs/' + encodeURIComponent(o.$ref).replace(/%2F/g, '~1');
    if (Array.isArray(o.required)) o.required = o.required.filter(r => !['@context', 'type', 'id', 'policyId', 'ref', 'guardianVersion'].includes(r));
    delete o.$id;
    for (const k in o) fix(o[k]);
  };
  fix(d);
  return d;
}
function validate(iri, cs) {
  const s = SCH[iri] || SCH[base(iri)];
  if (!s) return ['schema ' + iri + ' not in the policy file'];
  if (!compiled[s.iri]) compiled[s.iri] = ajv.compile(prepSchema(s.document));
  const v = compiled[s.iri];
  const doc = JSON.parse(JSON.stringify(cs)); delete doc['@context']; delete doc.type;
  return v(doc) ? [] : v.errors.slice(0, 6).map(e => (e.instancePath || '/') + ' ' + e.message + (e.params && e.params.additionalProperty ? ' (' + e.params.additionalProperty + ')' : '') + (e.params && e.params.allowedValues ? ' ' + JSON.stringify(e.params.allowedValues).slice(0, 80) : ''));
}

// ---------- Guardian helper semantics (policy-service helpers/utils.ts) ----------
function resolveFieldPath(data, field) {
  if (!field || data === null || data === undefined) return null;
  const dot = field.indexOf('.'), key = dot === -1 ? field : field.slice(0, dot), rest = dot === -1 ? null : field.slice(dot + 1);
  if (Array.isArray(data)) {
    if (key === 'L') { const last = data[data.length - 1]; return rest === null ? (last ?? null) : resolveFieldPath(last, rest); }
    const idx = Number(key);
    if (Number.isInteger(idx) && idx >= 0 && String(idx) === key) { const it = data[idx]; return rest === null ? (it ?? null) : resolveFieldPath(it, rest); }
    return data.map(it => resolveFieldPath(it, field));
  }
  const v = data[key];
  return rest === null ? (v ?? null) : resolveFieldPath(v, rest);
}
function coerce(v) { if (typeof v !== 'string') return v; if (v === 'null') return null; if (v === 'true') return true; if (v === 'false') return false; const n = Number(v); if (!isNaN(n) && v.trim() !== '') return n; if (/^\d{4}-\d{2}-\d{2}/.test(v)) { const d = new Date(v); if (!isNaN(d.getTime())) return d.getTime(); } return v; }
const eq = (a, b) => { const l = coerce(a), r = coerce(b); return l === r || (l && r && typeof l === 'object' && JSON.stringify(l) === JSON.stringify(r)); };
function cmp(left, type, right) {
  if (left === null || left === undefined) return (right === null || right === undefined) ? true : (type === 'equal' && coerce(right) === null);
  switch (type) {
    case 'equal': return eq(left, right);
    case 'not_equal': return !eq(left, right);
    case 'in': return String(right).split(',').map(v => v.trim()).includes(String(left));
    case 'not_in': return !String(right).split(',').map(v => v.trim()).includes(String(left));
    case 'gt': return coerce(left) > coerce(right);
    case 'gte': return coerce(left) >= coerce(right);
    case 'lt': return coerce(left) < coerce(right);
    case 'lte': return coerce(left) <= coerce(right);
    default: return false;
  }
}
function evalCond(left, type, right) {
  const la = Array.isArray(left), ra = Array.isArray(right);
  if (type === 'in' || type === 'not_in') { if (la) return left.length > 0 && left.every(l => evalCond(l, type, right)); if (ra) { const h = right.flat(Infinity).map(coerce); return type === 'in' ? h.includes(coerce(left)) : !h.includes(coerce(left)); } return cmp(left, type, right); }
  if (la && !left.length && !ra) return false; if (ra && !right.length && !la) return false;
  if (la && ra) return left.length === right.length && left.every((l, i) => evalCond(l, type, right[i]));
  if (la) return left.every(l => evalCond(l, type, right)); if (ra) return false;
  return cmp(left, type, right);
}
// a stored document as Guardian keeps it (VcDocument row): document.credentialSubject[0] holds the subject
const asRow = (d) => ({ ...d, document: { credentialSubject: [d.cs] } });
function dbMatch(d, f) {   // documentsSourceAddon / sourceValidation filter on a stored document
  const v = resolveFieldPath(asRow(d), f.field);
  const val = f.value;
  switch (f.type) {
    case 'equal': return eq(v, val);
    case 'not_equal': return !eq(v, val);
    case 'in': return (Array.isArray(val) ? val : String(val).split(',').map(x => x.trim())).some(x => eq(v, x));
    case 'not_in': return !(Array.isArray(val) ? val : String(val).split(',').map(x => x.trim())).some(x => eq(v, x));
    case 'gt': return coerce(v) > coerce(val); case 'gte': return coerce(v) >= coerce(val); case 'lt': return coerce(v) < coerce(val); case 'lte': return coerce(v) <= coerce(val);
    default: return false;
  }
}

// ---------- state ----------
let seq = 0; const uid = () => 'urn:uuid:sim-' + String(++seq).padStart(5, '0');
const DB = [];                 // stored VC documents
const USERS = {};              // name -> {did, role}
const TOKENS_HELD = {};        // did -> amount
const LOG = [];
const SR = { name: 'SR', did: 'did:sim:SR', role: 'OWNER' };
const owner = (u) => u.did;
function user(name) { if (!USERS[name]) USERS[name] = { name, did: 'did:sim:' + name, role: null }; return USERS[name]; }

class BlockError extends Error { constructor(tag, msg) { super(tag + ': ' + msg); this.tag = tag; } }
function canUse(u, tag) {   // UI access: the block and every container above it must allow the user's role
  for (let t = tag; t; t = PARENT[t]) {
    const p = BY[t].permissions || [];
    if (p.includes('ANY_ROLE')) continue;
    if (u.role === 'OWNER' ? p.includes('OWNER') : (u.role ? p.includes(u.role) : p.includes('NO_ROLE'))) continue;
    return false;
  }
  return true;
}
function sourceDocs(addonTag, u, doc) {
  const a = BY[addonTag];
  return DB.filter(d => {
    if (a.schema && base(d.schema) !== base(a.schema)) return false;
    if (a.onlyOwnDocuments && d.owner !== u.did) return false;
    if ((a.onlyAssignDocuments || a.onlyAssignedDocuments) && d.assignedTo !== u.did) return false;
    if (a.hidePreviousVersions && d.edited === true) return false;   // documentsSourceAddon: filters.edited = { $ne: true }
    for (const f of a.filters || []) if (!dbMatch(d, f)) return false;
    return true;
  });
}
function emit(srcTag, output, u, state) {
  for (const e of EVENTS) if (e.source === srcTag && e.output === output) run(e.target, u, state, e.input);
  const b = BY[srcTag];
  if (output === 'RunEvent' && DEFAULT_FLOW.has(b.blockType) && !b.stopPropagation) {
    const sib = KIDS[PARENT[srcTag]], i = sib.indexOf(srcTag);
    if (i >= 0 && i + 1 < sib.length) run(sib[i + 1], u, state, 'RunEvent');
  }
}
function saveDoc(doc, tag) {
  const b = BY[tag];
  doc.option = { ...(doc.option || {}) };
  for (const o of b.options || []) doc.option[o.name] = o.value;
  if (b.entityType) doc.type = b.entityType;
  doc.edited = false;   // sendToGuardianBlock.sendToDatabase sets edited = false on every save
  doc.tags = { ...(doc.tags || {}), [tag]: true };
  if (!DB.includes(doc)) DB.push(doc);
  LOG.push(`  save   ${tag.padEnd(44)} ${doc.label} -> status "${doc.option.status || ''}"${b.entityType ? ', type ' + b.entityType : ''}`);
  return doc;
}
function validateWith(tag, u, state) {   // documentValidatorBlock.run: conditions, then source validations (a source passes when one document meets every condition)
  const b = BY[tag];
      const d = asRow(state.data);
      if (b.schema && base(state.data.schema) !== base(b.schema)) throw new BlockError(tag, 'Invalid document schema');
      for (const c of b.conditions || []) {
        const left = resolveFieldPath(d, c.field), right = c.valueSource === 'document' ? resolveFieldPath(d, c.value) : c.value;
        if (!evalCond(left, c.type, right)) throw new BlockError(tag, `Field "${c.field.split('.').pop()}": got ${JSON.stringify(left)}, expected ${c.type} ${JSON.stringify(right)}`);
      }
      for (const sv of b.sourceValidations || []) {
        let cand = DB.filter(x => !sv.schema || base(x.schema) === base(sv.schema));
        if (sv.onlyOwnDocuments) cand = cand.filter(x => x.owner === u.did);
        for (const f of sv.filters || []) {
          const val = f.typeValue === 'variable' ? resolveFieldPath(d, f.value) : f.value;
          cand = cand.filter(x => dbMatch(x, { ...f, value: val }));
        }
        // Guardian 3.7.1-rc (the MGS build) has no allowEmptySource: a source validation with no matching document fails.
        if (sv.allowEmptySource !== undefined) throw new BlockError(tag, 'allowEmptySource is not supported by Guardian 3.7.1-rc');
        if (!cand.length) throw new BlockError(tag, `no ${SCH[base(sv.schema)] ? SCH[base(sv.schema)].name : sv.schema} matches ${(sv.filters || []).map(f => f.field.replace('document.credentialSubject.0.', '') + ' ' + f.type + ' ' + (f.typeValue === 'variable' ? JSON.stringify(resolveFieldPath(d, f.value)) : JSON.stringify(f.value))).join(', ')}`);
        if ((sv.conditions || []).length) {
          const okOne = cand.some(x => (sv.conditions || []).every(c => {
            const side = (src, raw) => src === 'document' ? resolveFieldPath(d, raw) : (src === 'source' ? resolveFieldPath(asRow(x), raw) : raw);
            return evalCond(side(c.fieldSource || 'source', c.field), c.type, side(c.valueSource, c.value));
          }));
          if (!okOne) throw new BlockError(tag, `source ${SCH[base(sv.schema)].name}: conditions ${(sv.conditions || []).map(c => c.field.split('.').pop() + ' ' + c.type + ' ' + c.value.split('.').pop()).join(', ')} not met`);
        }
      }
}
function run(tag, u, state, input) {
  const b = BY[tag];
  switch (b.blockType) {
    case 'sendToGuardianBlock': {
      // an array (e.g. from a customLogic done([...])) is saved item by item and passed on as an array, as sendToGuardianBlock does
      const doc = Array.isArray(state.data) ? state.data.map(x => saveDoc(x, tag)) : saveDoc(state.data, tag);
      if (state.old) state.old.edited = true;
      emit(tag, 'RunEvent', u, { ...state, data: doc });
      return;
    }
    case 'switchBlock': {
      // switch-block.ts getScope: an array of documents is aggregated, so every field becomes an array of values and
      // 'field == "value"' (Guardian's equal is a === b) is false for every condition
      const cs = Array.isArray(state.data) ? Object.fromEntries(Object.keys(state.data[0].cs).map(k => [k, state.data.map(x => x.cs[k])])) : state.data.cs; let hit = null;
      for (const c of b.conditions || []) {
        const m = String(c.value).match(/^\s*(\w+)\s*==\s*"([^"]*)"\s*$/);
        if (!m) throw new BlockError(tag, 'condition not understood by the simulator: ' + c.value);
        if (cs[m[1]] === m[2]) { hit = c.tag; break; }
      }
      LOG.push(`  switch ${tag.padEnd(44)} -> ${hit || 'NO BRANCH (nothing runs)'}`);
      if (!hit) { state.trace && state.trace.push('switch ' + tag + ' had no branch'); return; }
      emit(tag, hit, u, state);
      return;
    }
    case 'mathBlock': {
      const inp = state.data;
      const rels = DB.filter(d => (inp.relationships || []).includes(d.id)).map(d => ({ schema: d.schema, document: d.cs }));
      const { result } = runMath(b, inp.cs, b.inputSchema, rels);
      const cs = { ...result, id: inp.cs.id, policyId: 'sim', ...(inp.cs.ref ? { ref: inp.cs.ref } : {}) };
      const errs = validate(b.outputSchema, cs);
      if (errs.length) throw new BlockError(tag, 'output document fails its schema: ' + errs.join('; '));
      const doc = { id: uid(), schema: b.outputSchema, owner: inp.owner, cs, option: {}, relationships: [inp.id], label: `ERR(${cs.ghgType}) of ${inp.label}` };
      LOG.push(`  math   ${tag.padEnd(44)} ${doc.label}: ${cs.ghgType === 'Ex Ante' ? 'annual ER ' + cs.ex_ante.maxAnnualER : 'ER ' + cs.ER_final_total}${cs.dataQualityFlags ? ' | flags: ' + cs.dataQualityFlags.slice(0, 120) : ''}`);
      emit(tag, 'RunEvent', u, { ...state, data: doc });
      return;
    }
    case 'customLogicBlock': {
      const src = KIDS[tag].filter(k => BY[k].blockType === 'documentsSourceAddon').flatMap(k => sourceDocs(k, u)).map(asRow);
      let out = null;
      try { new Function('documents', 'sources', 'done', 'user', 'mathjs', b.expression)([asRow(state.data)], src, (r) => { out = r; }, u, mathjs); }
      catch (e) { throw new BlockError(tag, e.message); }
      LOG.push(`  logic  ${tag.padEnd(44)} passed`);
      // custom-logic-block.ts with passOriginal: the value given to done() is passed on unchanged, so done([doc]) passes an array, done(doc) one document
      const passed = b.passOriginal ? (Array.isArray(out) ? [state.data] : state.data) : out;
      emit(tag, 'RunEvent', u, { ...state, data: passed });
      return;
    }
    case 'documentValidatorBlock': {
      validateWith(tag, u, state);
      LOG.push(`  check  ${tag.padEnd(44)} passed`);
      emit(tag, 'RunEvent', u, state);
      return;
    }
    case 'mintDocumentBlock': {
      const doc = state.data, tok = TOKENS.find(t => t.tokenId === b.tokenId);
      if (!tok) throw new BlockError(tag, 'token not found');
      const amount = parseFloat(mathjs.evaluate(b.rule, doc.cs));
      const dec = Math.pow(10, parseFloat(tok.decimals) || 0);
      const val = (b.roundMethod === 'ceil' ? Math.ceil : b.roundMethod === 'floor' ? Math.floor : Math.round)(amount * dec) / dec;
      TOKENS_HELD[doc.owner] = (TOKENS_HELD[doc.owner] || 0) + val;
      LOG.push(`  MINT   ${tag.padEnd(44)} ${val} ${tok.tokenSymbol || tok.tokenName} (rule ${b.rule} = ${amount}) to ${doc.owner}`);
      emit(tag, 'RunEvent', u, state);
      return;
    }
    case 'interfaceStepBlock': case 'interfaceContainerBlock': case 'informationBlock':
      LOG.push(`  step   ${tag.padEnd(44)} (UI step, not simulated)`);
      return;
    default:
      throw new BlockError(tag, 'block type not simulated: ' + b.blockType);
  }
}

// ---------- user actions ----------
function chooseRole(u, role) {
  const rb = Object.values(BY).find(b => b.blockType === 'policyRolesBlock');
  if (!rb.roles.includes(role)) throw new Error('role ' + role + ' not offered');
  u.role = role; LOG.push(`${u.name}: chooses role ${role}`);
}
function submit(u, formTag, subject, presetDoc) {
  const b = BY[formTag];
  if (!canUse(u, formTag)) throw new BlockError(formTag, `${u.name} (${u.role}) has no access`);
  const cs = JSON.parse(JSON.stringify(subject));
  if (presetDoc) {
    if (b.presetSchema && base(presetDoc.schema) !== base(b.presetSchema)) throw new BlockError(formTag, 'preset document has the wrong schema');
    for (const f of b.presetFields || []) cs[f.name] = presetDoc.cs[f.value];
  }
  cs.id = b.idType === 'OWNER' ? u.did : uid();
  if (presetDoc) cs.ref = presetDoc.cs.id;
  cs.policyId = 'sim';
  const errs = validate(b.schema, cs);
  if (errs.length) throw new BlockError(formTag, 'document fails its schema: ' + errs.join('; '));
  const doc = { id: uid(), schema: b.schema, owner: u.did, cs, option: {}, relationships: presetDoc ? [presetDoc.id] : [], label: `${SCH[base(b.schema)].name} #${seq}` };
  LOG.push(`${u.name}: submits ${formTag}${presetDoc ? ' (from ' + presetDoc.label + ')' : ''}`);
  const state = b.editType === 'edit' && presetDoc ? { data: doc, old: presetDoc } : { data: doc };
  for (const k of KIDS[formTag]) if (BY[k].blockType === 'documentValidatorBlock') { validateWith(k, u, state); LOG.push(`  check  ${k.padEnd(44)} passed (child validator, before any event)`); }
  emit(formTag, 'RunEvent', u, state);
  if (b.editType === 'edit' && presetDoc) {
    emit(formTag, 'ReferenceEvent', u, { data: presetDoc });
    // editType 'edit': the new document is saved as a new version of the referenced one, and sendToGuardianBlock.updateVersion marks the
    // referenced document edited = true. On MGS (20 Oct) the referenced ERR stayed hidden after the ReferenceEvent save, so the replay
    // applies the flag last (worst case): any source with hidePreviousVersions no longer lists it.
    presetDoc.edited = true;
  }
  return doc;
}
function rowsFor(u, gridTag, bindGroup) { return sourceDocs(bindGroup, u); }
function bindGroupOf(gridTag, blockTag) {
  for (const f of (BY[gridTag].uiMetaData || {}).fields || []) if (f.bindBlock === blockTag || (f.bindBlocks || []).includes(blockTag)) return f.bindGroup;
  throw new Error('no grid column binds ' + blockTag);
}
function press(u, buttonTag, doc, comment) {
  const grid = PARENT[buttonTag];
  if (!canUse(u, buttonTag)) throw new BlockError(buttonTag, `${u.name} (${u.role}) has no access`);
  const grp = bindGroupOf(grid, buttonTag);
  if (!rowsFor(u, grid, grp).includes(doc)) throw new BlockError(buttonTag, `${doc.label} is not a row of ${grp} for ${u.name}, so the button is not shown`);
  if (comment) doc.option = { ...doc.option, comment };
  LOG.push(`${u.name}: presses ${buttonTag} on ${doc.label}`);
  emit(grid, buttonTag, u, { data: doc });
}
function formFromRow(u, gridTag, formTag, row, subject) {
  const grp = bindGroupOf(gridTag, formTag);
  if (!rowsFor(u, gridTag, grp).includes(row)) throw new BlockError(formTag, `${row.label} is not a row of ${grp} for ${u.name}, so the form is not offered`);
  return submit(u, formTag, subject, row);
}
function assign(u, actionTag, doc, vvb) {
  const b = BY[actionTag];
  if (!canUse(u, actionTag)) throw new BlockError(actionTag, `${u.name} has no access`);
  const grid = Object.keys(BY).find(t => BY[t].blockType === 'interfaceDocumentsSourceBlock' && ((BY[t].uiMetaData || {}).fields || []).some(f => f.bindBlock === actionTag));
  const grp = bindGroupOf(grid, actionTag);
  if (!rowsFor(u, grid, grp).includes(doc)) throw new BlockError(actionTag, `${doc.label} is not a row of ${grp} for ${u.name}`);
  const options = KIDS[actionTag].flatMap(k => sourceDocs(k, u));
  const opt = options.find(o => o.cs.id === vvb.did || o.owner === vvb.did);
  if (!opt) throw new BlockError(actionTag, `${vvb.name} is not in the dropdown (no Registry-approved profile)`);
  doc[b.field] = resolveFieldPath(asRow(opt), b.value);
  LOG.push(`${u.name}: ${actionTag} -> ${vvb.name}`);
  emit(actionTag, 'DropdownEvent', u, { data: doc });
}

// ---------- the run ----------
process.on('uncaughtException', (e) => { try { fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'sim_log.txt'), LOG.join('\n') + '\n'); } catch (x) {} console.log('FAIL  the run stopped: ' + e.message); console.log('\n1+ FAILED'); process.exit(1); });
const sample = (f) => JSON.parse(fs.readFileSync(path.join(SAMPLES, f), 'utf8')).document;
const results = []; let failures = 0;
function expect(name, fn, want) {   // want: 'ok' or a substring of the expected error
  const before = LOG.length;
  let got;
  try { fn(); got = 'ok'; } catch (e) { got = 'ERROR ' + e.message; }
  const pass = want === 'ok' ? got === 'ok' : got.includes(want);
  if (!pass) failures++;
  results.push({ name, pass, got, log: LOG.slice(before) });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass && want !== 'ok' ? '  [blocked as expected: ' + got.slice(6, 150) + ']' : ''}${pass ? '' : '\n      got: ' + got.slice(0, 400)}`);
  return got;
}
const check = (name, cond, detail) => { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };
const find = (pred) => DB.filter(pred);
const latest = (pred) => { const x = find(pred); return x[x.length - 1]; };
const nameOf = (d) => SCH[base(d.schema)].name;

const PP = user('PP_Kilimanjaro'), PP2 = user('PP_Other'), VVB = user('VVB_One'), VVB2 = user('VVB_Rejected');
const pdS = sample('3_Project_Description.json'), mrS = sample('4_Monitoring_Report.json');
let pd, mr, err0, errPD, val, ver, vcu;

console.log('--- registration');
expect('policy roles block offers Project Proponent and VVB', () => { chooseRole(PP, 'Project Proponent'); chooseRole(PP2, 'Project Proponent'); chooseRole(VVB, 'VVB'); chooseRole(VVB2, 'VVB'); }, 'ok');
expect('PP creates its profile (PP Profile schema)', () => submit(PP, 'pp_create_account_form', sample('1_PP_account.json')), 'ok');
expect('second PP creates its profile', () => submit(PP2, 'pp_create_account_form', sample('1_PP_account.json')), 'ok');
expect('VVB creates its profile (VVB Profile schema)', () => submit(VVB, 'vb_create_account_form', sample('2_VVB_account.json')), 'ok');
expect('second VVB creates its profile', () => submit(VVB2, 'vb_create_account_form', sample('2_VVB_account.json')), 'ok');
expect('a PP cannot open the Standard Registry approval button', () => press(PP, 'admin_pp_account_approve_button', DB[0]), 'has no access');
expect('SR approves the PP profile', () => press(SR, 'admin_pp_account_approve_button', DB[0]), 'ok');
expect('SR approves the second PP profile', () => press(SR, 'admin_pp_account_approve_button', DB[1]), 'ok');
expect('SR approves the VVB profile', () => press(SR, 'admin_vb_account_approve_button', DB[2]), 'ok');
expect('SR rejects the second VVB profile', () => press(SR, 'admin_vb_account_reject_button', DB[3], 'incomplete accreditation'), 'ok');

console.log('--- project description and ex-ante calculation');
expect('PP submits the project description; it is saved, switched by template version and the ex-ante ERR is calculated', () => { pd = submit(PP, 'pp_project_description_form', pdS); }, 'ok');
errPD = latest(d => nameOf(d).startsWith('VMR0015 Emission Reductions') && d.cs.ghgType === 'Ex Ante');
check('ex-ante ERR exists with annual ER 1,666.620262475 and no flags', errPD && errPD.cs.ex_ante.maxAnnualER === 1666.620262475 && !errPD.cs.dataQualityFlags, errPD ? errPD.cs.ex_ante.maxAnnualER + ' | ' + (errPD.cs.dataQualityFlags || 'no flags') : 'missing');
check('PD status "Waiting for Approval", ERR status "Calculated"', pd.option.status === 'Waiting for Approval' && errPD.option.status === 'Calculated');
check("the other PP does not see this PD in any of its PD grids", ['pp_project_description_wait_source', 'pp_project_description_other_source', 'pp_project_description_registered_source'].every(s => !sourceDocs(s, PP2).includes(pd)));
expect('PP cannot assign the PD to a VVB whose profile was rejected', () => assign(PP, 'pp_project_description_assign', pd, VVB2), 'not in the dropdown');
expect('the other PP cannot submit a project description with the same project ID (pp_project_id_unique), and nothing is saved', () => { const n = DB.length; try { submit(PP2, 'pp_project_description_form', pdS); } finally { if (DB.length !== n) throw new Error('side effects: documents saved ' + (DB.length - n)); } }, 'is already used by another project description');
expect('PP assigns the PD to the VVB', () => assign(PP, 'pp_project_description_assign', pd, VVB), 'ok');
expect('the PP cannot start a monitoring report before registration (no Monitoring report button on a waiting PD)', () => formFromRow(PP, 'pp_project_description_grid', 'pp_monitoring_report_form', pd, mrS), 'not a row of');
expect('the VVB cannot write a validation report before it approves the PD', () => formFromRow(VVB, 'vb_pd_grid', 'vb_validation_report_form', pd, sample('5_Validation_Report.json')), 'not a row of');
expect('the rejected VVB cannot approve the PD (not assigned to it, so it is not in its list)', () => press(VVB2, 'vb_pd_approve_button', pd), 'not a row of');
expect('VVB approves the PD', () => press(VVB, 'vb_pd_approve_button', pd), 'ok');
expect('the rejected VVB cannot write a validation report on a PD not assigned to it', () => formFromRow(VVB2, 'vb_pd_grid', 'vb_validation_report_form', pd, sample('5_Validation_Report.json')), 'not a row of');
expect('even with the PD assigned to it, the rejected VVB is stopped by the validation-report precheck (no Registry-approved VVB profile)', () => { const keep = pd.assignedTo; pd.assignedTo = VVB2.did; try { formFromRow(VVB2, 'vb_pd_grid', 'vb_validation_report_form', pd, sample('5_Validation_Report.json')); } finally { pd.assignedTo = keep; } }, 'no VVB Profile matches');
expect('a validation report whose VVB id is not the VVB\'s own approved profile is refused by the precheck inside the form, and nothing is saved', () => { const n = DB.length; try { formFromRow(VVB, 'vb_pd_grid', 'vb_validation_report_form', pd, { ...sample('5_Validation_Report.json'), vvbId: 'VVB-NOT-MINE' }); } finally { if (DB.length !== n) throw new Error('side effects: documents saved ' + (DB.length - n)); } }, 'not met');
expect('VVB writes the validation report from the approved PD (precheck: own Registry-approved profile)', () => { val = formFromRow(VVB, 'vb_pd_grid', 'vb_validation_report_form', pd, sample('5_Validation_Report.json')); }, 'ok');
expect('VVB assigns the validation report to the project proponent', () => assign(VVB, 'vb_validation_report_assign', val, PP), 'ok');
check('the PP now sees the validation report; the other PP does not', sourceDocs('pp_validation_report_source', PP).includes(val) && !sourceDocs('pp_validation_report_source', PP2).includes(val));
{ const before = pd.option.status;
expect('SR cannot register the PD before the registry approves a validation report with the opinion Validated (admin_pp_pd_register_check)', () => press(SR, 'admin_pp_pd_approve_button', pd), 'no Validation Report matches');
check('PD status unchanged ("' + before + '")', pd.option.status === before); }
expect('SR approves the validation report', () => press(SR, 'admin_vb_validation_report_approve_button', val), 'ok');
expect('SR registers the PD', () => press(SR, 'admin_pp_pd_approve_button', pd), 'ok');
check('PD status "Registered"', pd.option.status === 'Registered');
expect('the VVB cannot approve the PD again once it is registered (only waiting PDs carry the buttons)', () => press(VVB, 'vb_pd_approve_button', pd), 'not a row of');

console.log('--- monitoring report 2027 and ex-post calculation');
expect('PP creates the 2027 monitoring report from the registered PD (preset projectRef, templateVersion; overlap check; ex-post math)', () => { mr = formFromRow(PP, 'pp_project_description_grid', 'pp_monitoring_report_form', pd, mrS); }, 'ok');
err0 = latest(d => nameOf(d).startsWith('VMR0015 Emission Reductions') && d.cs.ghgType === 'Ex Post');
check('ex-post ERR: ER 1,556.947181413, ex-ante for the period 1,666.620262, difference -6.580568083 %, no flags', err0 && err0.cs.ER_final_total === 1556.947181413 && err0.cs.ex_post.pctDifference === -6.580568083 && !err0.cs.dataQualityFlags, err0 ? `${err0.cs.ER_final_total} / ${err0.cs.ex_post.exAnteER_period} / ${err0.cs.ex_post.pctDifference} / ${err0.cs.dataQualityFlags || 'no flags'}` : 'missing');
check('the MR carries the PD presets', mr.cs.projectRef === pd.cs.projectId && mr.cs.ref === pd.cs.id && mr.cs.templateVersion === pd.cs.templateVersion);
expect('PP assigns the MR to the VVB', () => assign(PP, 'pp_monitoring_report_assign', mr, VVB), 'ok');
expect('VVB approves the MR', () => press(VVB, 'vb_mr_approve_button', mr), 'ok');
expect('SR approves the MR (registry overlap check passes for the first report)', () => press(SR, 'admin_pp_mr_approve_button', mr), 'ok');
check('MR status "Registry approved"', mr.option.status === 'Registry approved');

console.log('--- verification and issuance');
expect('the VVB cannot verify the ex-post ERR before the PP assigns it', () => formFromRow(VVB, 'vb_emission_reduction_removal_grid', 'vb_verification_report_form', err0, sample('6_Verification_Report.json')), 'not a row of');
expect('PP assigns the ex-post ERR to the VVB', () => assign(PP, 'pp_emission_reduction_removal_assign', err0, VVB), 'ok');
expect('VVB writes the verification report from the ex-post ERR (presets ERcalculated, ERverified; precheck)', () => { ver = formFromRow(VVB, 'vb_emission_reduction_removal_grid', 'vb_verification_report_form', err0, sample('6_Verification_Report.json')); }, 'ok');
check('the ERR is locked as "Verification submitted" and leaves the VVB list', err0.option.status === 'Verification submitted' && !sourceDocs('vb_emission_reduction_removal_source', VVB).includes(err0));
check('ERcalculated = ERverified = 1556.947181413 on the verification report', ver.cs.ERcalculated === 1556.947181413 && ver.cs.ERverified === 1556.947181413, `${ver.cs.ERcalculated} / ${ver.cs.ERverified}`);
expect('VVB assigns the verification report to the project proponent', () => assign(VVB, 'vb_verification_report_assign', ver, PP), 'ok');
expect('PP cannot request VCUs before the registry approves the verification report', () => formFromRow(PP, 'pp_verification_report_grid', 'pp_vcu_request_form', ver, sample('7_VCU_Issuance_Request.json')), 'not a row of');
expect('SR approves the verification report', () => press(SR, 'admin_vb_verification_report_approve_button', ver), 'ok');
expect('PP requests VCU issuance from the approved verification report (precheck; verification -> "VCU requested")', () => { vcu = formFromRow(PP, 'pp_verification_report_grid', 'pp_vcu_request_form', ver, sample('7_VCU_Issuance_Request.json')); }, 'ok');
check('verification report status "VCU requested", request "Waiting for issuance"', ver.option.status === 'VCU requested' && vcu.option.status === 'Waiting for issuance');
expect('a VVB cannot press the Issue VCUs button', () => press(VVB, 'admin_err_issue_button', vcu), 'has no access');
// MGS 20 Oct: the registry's approval save can land after the VCU-request save and leave the verification report "Registry approved".
// The replay issues in that state: the issuance validator accepts "Registry approved" or "VCU requested".
ver.option.status = 'Registry approved';
expect('SR issues (verification report left "Registry approved" by a late approval save, as seen on MGS): validator checks the request, the verification report, the registered PD, the approved validation report, the approved MR and the locked ERR; then mint', () => press(SR, 'admin_err_issue_button', vcu), 'ok');
ver.option.status = 'VCU requested';
check('1,556 VCU minted to the project proponent (floor of min(ERverified, ERcalculated), 0 decimals)', TOKENS_HELD[PP.did] === 1556, String(TOKENS_HELD[PP.did]));
check('request status "Issued"', vcu.option.status === 'Issued');
expect('the same request cannot be issued twice (no longer a row of the waiting list)', () => press(SR, 'admin_err_issue_button', vcu), 'not a row of');
expect('the same request cannot be issued twice (validator, if the button were pressed by API)', () => run('admin_err_issue_validator', SR, { data: vcu }), 'Field "status"');
check('still 1,556 VCU in total', TOKENS_HELD[PP.did] === 1556);

console.log('--- further monitoring periods');
const mr27b = { ...mrS, mrId: 'MR-2027-002' };
expect('a second report for the same 2027 period is rejected by the PP overlap check (nothing saved)', () => { const n = DB.length; try { formFromRow(PP, 'pp_project_description_grid', 'pp_monitoring_report_form', pd, mr27b); } finally { if (DB.length !== n) throw new Error('documents were saved: ' + (DB.length - n)); } }, 'overlaps another report of this project');
const mr28 = { ...mrS, mrId: 'MR-2028-001', monitoringPeriodStart: '2028-01-01', monitoringPeriodEnd: '2028-12-31' };
let mr2;
expect('the adjacent 2028 report is accepted and calculated', () => { mr2 = formFromRow(PP, 'pp_project_description_grid', 'pp_monitoring_report_form', pd, mr28); }, 'ok');
const err28 = latest(d => nameOf(d).startsWith('VMR0015 Emission Reductions') && d.cs.ghgType === 'Ex Post');
check('2028 ERR calculated (366-day leap year period)', err28 && err28.cs.ex_post.periodDays === 366, err28 ? err28.cs.ex_post.periodDays + ' days, ER ' + err28.cs.ER_final_total + (err28.cs.dataQualityFlags ? ' | ' + err28.cs.dataQualityFlags.slice(0, 160) : '') : '');
const mr28b = { ...mrS, mrId: 'MR-2028-002', monitoringPeriodStart: '2028-06-01', monitoringPeriodEnd: '2029-05-31' };
expect('a second report overlapping the 2028 report that is still under review is refused by the PP check (nothing saved)', () => { const n = DB.length; try { formFromRow(PP, 'pp_project_description_grid', 'pp_monitoring_report_form', pd, mr28b); } finally { if (DB.length !== n) throw new Error('documents were saved: ' + (DB.length - n)); } }, 'overlaps another report of this project');
expect('a report reusing the monitoring report ID MR-2028-001 for another period is refused (nothing saved)', () => { const n = DB.length; try { formFromRow(PP, 'pp_project_description_grid', 'pp_monitoring_report_form', pd, { ...mrS, mrId: 'MR-2028-001', monitoringPeriodStart: '2031-01-01', monitoringPeriodEnd: '2031-12-31' }); } finally { if (DB.length !== n) throw new Error('documents were saved: ' + (DB.length - n)); } }, 'already used by another report');
expect('the VVB cannot approve the 2028 report before it is assigned to it', () => press(VVB, 'vb_mr_approve_button', mr2), 'not a row of');
expect('PP assigns the 2028 report and the VVB approves it', () => { assign(PP, 'pp_monitoring_report_assign', mr2, VVB); press(VVB, 'vb_mr_approve_button', mr2); }, 'ok');
expect('SR approves the 2028 report', () => press(SR, 'admin_pp_mr_approve_button', mr2), 'ok');

console.log('--- rejected verification and re-opening');
let ver2;
expect('PP assigns the 2028 ERR, VVB verifies it', () => { assign(PP, 'pp_emission_reduction_removal_assign', err28, VVB); ver2 = formFromRow(VVB, 'vb_emission_reduction_removal_grid', 'vb_verification_report_form', err28, { ...sample('6_Verification_Report.json'), verificationId: 'VER-2028-001' }); }, 'ok');
expect('SR rejects that verification report', () => { assign(VVB, 'vb_verification_report_assign', ver2, PP); press(SR, 'admin_vb_verification_report_reject_button', ver2, 'evidence missing'); }, 'ok');
expect('PP cannot request VCUs on a rejected verification report', () => formFromRow(PP, 'pp_verification_report_grid', 'pp_vcu_request_form', ver2, sample('7_VCU_Issuance_Request.json')), 'not a row of');
expect('SR re-opens the locked 2028 ERR for a new verification (validator: rejected verification report exists)', () => press(SR, 'admin_err_reopen_button', err28), 'ok');
check('ERR back to "Calculated" and visible to the VVB again', err28.option.status === 'Calculated' && sourceDocs('vb_emission_reduction_removal_source', VVB).includes(err28));
let ver2b, vcu2b;
expect('VVB verifies the re-opened 2028 ERR again, entering ERverified 1,600 (above the calculated 1,556.947181)', () => { ver2b = formFromRow(VVB, 'vb_emission_reduction_removal_grid', 'vb_verification_report_form', err28, { ...sample('6_Verification_Report.json'), verificationId: 'VER-2028-001b' }); ver2b.cs.ERverified = 1600; }, 'ok');
expect('SR approves it and the PP requests VCUs', () => { assign(VVB, 'vb_verification_report_assign', ver2b, PP); press(SR, 'admin_vb_verification_report_approve_button', ver2b); vcu2b = formFromRow(PP, 'pp_verification_report_grid', 'pp_vcu_request_form', ver2b, sample('7_VCU_Issuance_Request.json')); }, 'ok');
expect('SR issues the 2028 VCUs', () => press(SR, 'admin_err_issue_button', vcu2b), 'ok');
check('mint uses min(ERverified, ERcalculated): +1,556, not 1,600 (total 3,112)', TOKENS_HELD[PP.did] === 3112, String(TOKENS_HELD[PP.did]));
expect('SR cannot re-open the 2027 ERR, whose verification was approved (no rejected verification report)', () => press(SR, 'admin_err_reopen_button', err0), 'no VVB Verification Report matches');
expect('SR cannot re-open the issued 2028 ERR although its first verification report stays rejected (a later one was used for issuance)', () => press(SR, 'admin_err_reopen_button', err28), 'pending, approved or used for issuance');
check('the issued 2028 ERR stays "Verification submitted"', err28.option.status === 'Verification submitted');
expect('a second issuance for MR-2028-001 is refused even if a forged waiting request reaches the validator', () => { const fake = { ...vcu2b, id: uid(), option: { status: 'Waiting for issuance' }, label: 'forged second request' }; run('admin_err_issue_validator', SR, { data: fake }); }, 'already issued for monitoring report MR-2028-001');
check('still 3,112 VCU in total after the refused second issuance', TOKENS_HELD[PP.did] === 3112);
check('a second VCU request on the 2028 verification report is not offered: the report left "Registry approved" when the first request was made, and the request precheck needs a "Registry approved" report', ver2b.option.status === 'VCU requested' && !sourceDocs('pp_verification_report_approved_source', PP).includes(ver2b));
expect('if a second request were forced through (verification report status forged back to "Registry approved"), issuing it is refused by admin_err_issue_guard and no VCU is minted', () => { const keep = ver2b.option.status, n = TOKENS_HELD[PP.did]; ver2b.option.status = 'Registry approved'; let req; try { req = submit(PP, 'pp_vcu_request_form', sample('7_VCU_Issuance_Request.json'), ver2b); } finally { ver2b.option.status = keep; } try { press(SR, 'admin_err_issue_button', req); } finally { if (TOKENS_HELD[PP.did] !== n) throw new Error('minted'); } }, 'already issued for monitoring report MR-2028-001');
expect('a verification report on an ERR that is not "Calculated" is refused by the precheck and the ERR is not touched', () => { const n = DB.length, keep = err0.option.status; try { submit(VVB, 'vb_verification_report_form', { ...sample('6_Verification_Report.json'), verificationId: 'VER-2027-X' }, err0); } finally { if (DB.length !== n || err0.option.status !== keep) throw new Error('side effects'); } }, 'no VMR0015 Emission Reductions');

console.log('--- an ERR whose monitoring report was never approved');
let mr3;
expect('PP files the 2029 report; the VVB approves it and the registry rejects it', () => { mr3 = formFromRow(PP, 'pp_project_description_grid', 'pp_monitoring_report_form', pd, { ...mrS, mrId: 'MR-2029-001', monitoringPeriodStart: '2029-01-01', monitoringPeriodEnd: '2029-12-31' }); assign(PP, 'pp_monitoring_report_assign', mr3, VVB); press(VVB, 'vb_mr_approve_button', mr3); press(SR, 'admin_pp_mr_reject_button', mr3, 'data gaps'); }, 'ok');
check('the 2029 report is "Registry rejected"', mr3.option.status === 'Registry rejected');
const err3 = latest(d => nameOf(d).startsWith('VMR0015 Emission Reductions') && d.cs.ghgType === 'Ex Post' && d.cs.mrId === 'MR-2029-001');
let ver3, vcu3;
expect('the VVB can still verify the ERR of the rejected 2029 report once assigned', () => { assign(PP, 'pp_emission_reduction_removal_assign', err3, VVB); ver3 = formFromRow(VVB, 'vb_emission_reduction_removal_grid', 'vb_verification_report_form', err3, { ...sample('6_Verification_Report.json'), verificationId: 'VER-2029-001' }); }, 'ok');
expect('SR approves that verification report', () => { assign(VVB, 'vb_verification_report_assign', ver3, PP); press(SR, 'admin_vb_verification_report_approve_button', ver3); }, 'ok');
expect('PP requests VCUs on it', () => { vcu3 = formFromRow(PP, 'pp_verification_report_grid', 'pp_vcu_request_form', ver3, sample('7_VCU_Issuance_Request.json')); }, 'ok');
expect('issuance is refused: the issue validator finds no Registry-approved monitoring report MR-2029-001', () => press(SR, 'admin_err_issue_button', vcu3), 'no VCS Monitoring Report matches');
check('no VCU minted for it (still 3,112 in total)', TOKENS_HELD[PP.did] === 3112);

console.log('--- access between users');
expect('the other PP cannot start a monitoring report on this PD', () => formFromRow(PP2, 'pp_project_description_grid', 'pp_monitoring_report_form', pd, mrS), 'not a row of');
expect('the other PP cannot request VCUs on this verification report', () => formFromRow(PP2, 'pp_verification_report_grid', 'pp_vcu_request_form', ver, sample('7_VCU_Issuance_Request.json')), 'not a row of');
check('the other PP sees no ERR of this project', !sourceDocs('pp_emission_reduction_removal_source', PP2).length);
check('the other PP sees none of the validation or verification reports', !sourceDocs('pp_validation_report_source', PP2).length && !sourceDocs('pp_verification_report_source', PP2).length);
check('the rejected VVB sees no PD, MR or ERR (nothing is assigned to it)', !sourceDocs('vb_pd_source', VVB2).length && !sourceDocs('vb_pd_other_source', VVB2).length && !sourceDocs('vb_mr_source', VVB2).length && !sourceDocs('vb_mr_other_source', VVB2).length && !sourceDocs('vb_emission_reduction_removal_source', VVB2).length);

console.log('\nDocuments stored: ' + DB.length + ' | schemas validated on every form submission and every calculation');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
if (process.env.SIMDEBUG) for (const d of DB) console.log('   DB', d.label, '|', d.option.status, '| owner', d.owner, '| assignedTo', d.assignedTo || '', '| type', d.type || '');
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'sim_log.txt'), LOG.join('\n') + '\n');
process.exit(failures ? 1 : 0);
