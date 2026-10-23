"""Block-by-block audit of a Guardian policy export (unzipped dir).
Usage: python3 blocks_audit.py <unzipped_policy_dir> <out_csv>
Checks every block; prints problems; writes one CSV row per block."""
import json, os, re, sys, csv, collections

D, OUT = sys.argv[1], sys.argv[2]
P = json.load(open(os.path.join(D, 'policy.json')))
ROLES = set(P.get('policyRoles') or []) | {'OWNER', 'NO_ROLE', 'ANY_ROLE'}

# ---------- schemas ----------
SCH = {}
for folder in ('schemas', 'systemSchemas'):
    for fn in os.listdir(os.path.join(D, folder)):
        s = json.load(open(os.path.join(D, folder, fn)))
        doc = s['document'] if isinstance(s['document'], dict) else json.loads(s['document'] or '{}')
        SCH[s.get('iri') or fn[:-5]] = (s, doc)

def base(iri):
    return iri.split('&')[0] if iri else iri

SCHB = {}
for k, v in SCH.items():
    SCHB.setdefault(base(k), v)

def schema(iri):
    return SCH.get(iri) or SCHB.get(base(iri))

def fields(iri, depth=0, seen=None):
    """all dotted field paths of a schema (credentialSubject level), following $defs refs"""
    got = schema(iri)
    if not got: return set()
    _, doc = got
    defs = doc.get('$defs', {})
    out = set()
    def walk(props, prefix, d):
        for name, spec in (props or {}).items():
            path = prefix + name
            out.add(path)
            ref = spec.get('$ref') or (spec.get('items') or {}).get('$ref')
            if ref and d < 6:
                sub = defs.get(ref) or (schema(ref) or (None, {}))[1]
                if sub:
                    walk(sub.get('properties'), path + '.', d + 1)
            if spec.get('properties') and d < 6:
                walk(spec['properties'], path + '.', d + 1)
    walk(doc.get('properties'), '', 0)
    return out

# ---------- blocks ----------
blocks, parent, children = [], {}, collections.defaultdict(list)
def w(b, par, depth):
    blocks.append((b, depth))
    parent[b['tag']] = par
    for c in b.get('children') or []:
        children[b['tag']].append(c['tag'])
        w(c, b, depth + 1)
w(P['config'], None, 0)
BY = {b['tag']: b for b, _ in blocks}
problems = []
def bad(tag, msg): problems.append((tag, msg))

tagcount = collections.Counter(b['tag'] for b, _ in blocks)
for t, n in tagcount.items():
    if n > 1: bad(t, f'duplicate tag x{n}')

# events
EV = []
for b, _ in blocks:
    for e in b.get('events') or []:
        EV.append((b['tag'], e))
OUTS = {  # valid outputs per block type
    'requestVcDocumentBlock': {'RunEvent', 'RefreshEvent', 'ErrorEvent', 'ReleaseEvent', 'DraftEvent', 'ReferenceEvent'},
    'sendToGuardianBlock': {'RunEvent', 'RefreshEvent', 'ErrorEvent', 'ReleaseEvent'},
    'mathBlock': {'RunEvent', 'RefreshEvent', 'ErrorEvent', 'ReleaseEvent'},
    'customLogicBlock': {'RunEvent', 'RefreshEvent', 'ErrorEvent', 'ReleaseEvent'},
    'documentValidatorBlock': {'RunEvent', 'RefreshEvent', 'ErrorEvent', 'ReleaseEvent', 'RefuseEvent'},
    'mintDocumentBlock': {'RunEvent', 'RefreshEvent', 'ErrorEvent', 'ReleaseEvent'},
    'interfaceActionBlock': {'DropdownEvent', 'RunEvent', 'RefreshEvent'},
}
evin = collections.defaultdict(list); evout = collections.defaultdict(list)
for owner, e in EV:
    s, t, o, i = e.get('source'), e.get('target'), e.get('output'), e.get('input')
    if e.get('disabled'): bad(owner, f'disabled event {o}->{t}')
    if s not in BY: bad(owner, f'event source missing: {s}'); continue
    if t not in BY: bad(owner, f'event target missing: {t}'); continue
    st = BY[s]['blockType']
    if st == 'switchBlock':
        if o not in {c['tag'] for c in BY[s].get('conditions', [])}: bad(s, f'switch output {o} has no condition')
    elif st == 'interfaceDocumentsSourceBlock':
        if o not in children[s] and o not in ('RefreshEvent',): bad(s, f'grid event output {o} is not a child button')
        elif o in BY and BY[o]['blockType'] != 'buttonBlockAddon': bad(s, f'grid output {o} not a button')
    elif st in OUTS and o not in OUTS[st]:
        bad(s, f'output {o} not valid for {st}')
    if i not in ('RunEvent', 'RefreshEvent', 'TimerEvent', 'PopEvent', 'RestoreEvent'):
        bad(t, f'unusual input {i}')
    evout[s].append(f'{o}->{t}')
    evin[t].append(f'{s}.{o}')

# implicit flow (non-stopPropagation action blocks pass to next sibling)
ACTION = {'requestVcDocumentBlock', 'sendToGuardianBlock', 'mathBlock', 'customLogicBlock', 'documentValidatorBlock',
          'mintDocumentBlock', 'switchBlock', 'reassigningBlock', 'setRelationshipsBlock'}
for ptag, kids in children.items():
    for a, nb in zip(kids, kids[1:]):
        ba = BY[a]
        if ba['blockType'] in ACTION and not ba.get('stopPropagation') and ba['blockType'] != 'switchBlock':
            evout[a].append(f'(next)->{nb}'); evin[nb].append(f'{a}.(next)')

# a documentValidatorBlock child of a requestVcDocumentBlock is run by the request block before any event (Guardian validateDocuments)
for ptag, kids in children.items():
    if BY[ptag]['blockType'] == 'requestVcDocumentBlock':
        for k in kids:
            if BY[k]['blockType'] == 'documentValidatorBlock':
                evin[k].append(f'{ptag}.(child validator, before events)')

# per block checks
rows = []
RX = re.compile(r'^[a-z][a-z0-9_]*$')
for b, depth in blocks:
    t, typ = b['tag'], b['blockType']
    notes = []
    if re.match(r'(?i)^block_?\d+$', t): bad(t, 'default block name')
    if not RX.match(t) and t not in ('Choose Role',) and typ != 'interfaceContainerBlock' or (typ == 'interfaceContainerBlock' and not re.match(r'^[A-Za-z][A-Za-z0-9_ ]*$', t)):
        if t not in ('Choose Role',): bad(t, 'tag not snake_case')
    for r in b.get('permissions') or []:
        if r not in ROLES: bad(t, f'unknown role {r}')
    par = parent[t]
    if par and set(b.get('permissions') or []) - set(par.get('permissions') or []) - {'OWNER'} and par['blockType'] != 'policyRolesBlock':
        if not (set(par.get('permissions') or []) & {'ANY_ROLE'}):
            bad(t, f'permissions {b.get("permissions")} not within parent {par["tag"]} {par.get("permissions")}')
    sch = []
    for k in ('schema', 'inputSchema', 'outputSchema', 'presetSchema'):
        v = b.get(k)
        if isinstance(v, str) and v:
            g = schema(v)
            if not g: bad(t, f'{k} not found: {v}')
            else: sch.append(f'{k}={g[0]["name"]}')
    for sv in b.get('sourceValidations') or []:
        if not schema(sv.get('schema')): bad(t, f'sourceValidation schema missing {sv.get("schema")}')
    # field checks for sources / grids / validators
    if typ == 'documentsSourceAddon' and b.get('schema'):
        F = fields(b['schema'])
        for f in b.get('filters') or []:
            fld = f.get('field', '')
            if fld.startswith('document.credentialSubject.0.'):
                if fld.split('.', 3)[3] not in F: bad(t, f'filter field not in schema: {fld}')
    if typ == 'documentValidatorBlock':
        for sv in b.get('sourceValidations') or []:
            F = fields(sv.get('schema')); Fs = fields(b.get('schema')) if b.get('schema') else set()
            for f in sv.get('filters') or []:
                fld = f.get('field', '')
                if fld.startswith('document.credentialSubject.0.') and fld.split('.', 3)[3] not in F:
                    bad(t, f'source filter field {fld} not in {schema(sv["schema"])[0]["name"]}')
                if f.get('typeValue') == 'variable' and str(f.get('value', '')).startswith('document.credentialSubject.0.'):
                    v = f['value'].split('.', 3)[3]
                    if Fs and v not in Fs: bad(t, f'variable {v} not in validated schema')
        for c in b.get('conditions') or []:
            fld = c.get('field', '')
            if fld.startswith('document.credentialSubject.0.') and b.get('schema') and fld.split('.', 3)[3] not in fields(b['schema']):
                bad(t, f'condition field not in schema {fld}')
    if typ == 'interfaceDocumentsSourceBlock':
        srcs = [BY[c] for c in children[t] if BY[c]['blockType'] == 'documentsSourceAddon']
        if not srcs: bad(t, 'grid without source')
        F = set().union(*[fields(s['schema']) for s in srcs if s.get('schema')]) if srcs else set()
        for fd in (b.get('uiMetaData') or {}).get('fields') or []:
            n = fd.get('name', '')
            if n.startswith('document.credentialSubject.0.') and F and n.split('.', 3)[3] not in F:
                bad(t, f'column {n} not in any source schema')
            if fd.get('bindBlock') and fd['bindBlock'] not in BY: bad(t, f'bindBlock missing {fd["bindBlock"]}')
            for bb in fd.get('bindBlocks') or []:
                if bb not in BY: bad(t, f'bindBlocks missing {bb}')
    if typ == 'buttonBlockAddon':
        if par['blockType'] != 'interfaceDocumentsSourceBlock': bad(t, 'button not under grid')
        if not any(o.startswith(f'') and t == o for o in [e.get('output') for _, e in EV if e.get('source') == par['tag']]):
            bad(t, 'button has no event from its grid')
    if typ == 'sendToGuardianBlock':
        if not b.get('entityType') and not b.get('options') == []: notes.append('no entityType')
        if b.get('dataType') not in (None, '', 'vc-documents', 'approve', 'hedera'): notes.append(f'dataType={b.get("dataType")}')
    if typ in ('interfaceContainerBlock', 'interfaceStepBlock') and not children[t]: bad(t, 'empty container')
    if typ == 'interfaceStepBlock' and b.get('cyclic') is False: pass
    if typ == 'switchBlock':
        for c in b.get('conditions') or []:
            if not any(e.get('output') == c['tag'] for _, e in EV if e.get('source') == t):
                bad(t, f'switch condition {c["tag"]} has no event')
    if typ == 'mintDocumentBlock':
        tok = b.get('tokenId')
        toks = [json.load(open(os.path.join(D, 'tokens', f))) for f in os.listdir(os.path.join(D, 'tokens'))]
        if not any(x.get('tokenId') == tok for x in toks): bad(t, f'mint tokenId {tok} not in tokens/')
        notes.append(f'rule={b.get("rule")} round={b.get("roundMethod")}')
    if typ in ('requestVcDocumentBlock',):
        notes.append(f'idType={b.get("idType")} editType={b.get("editType")}')
    if typ in ACTION and not evin[t] and not (b.get('defaultActive')) and typ not in ('requestVcDocumentBlock',):
        bad(t, 'action block receives no event and no implicit flow')
    if typ in ('sendToGuardianBlock', 'mathBlock', 'customLogicBlock', 'documentValidatorBlock', 'mintDocumentBlock') and not evin[t]:
        bad(t, 'no incoming flow (dead block)')
    rows.append({'tag': t, 'type': typ, 'depth': depth, 'parent': par['tag'] if par else '',
                 'roles': '|'.join(b.get('permissions') or []), 'schemas': '; '.join(sch),
                 'in': '; '.join(evin[t]), 'out': '; '.join(evout[t]),
                 'title': ((b.get('uiMetaData') or {}).get('title') or (b.get('uiMetaData') or {}).get('content') or b.get('name') or ''),
                 'notes': '; '.join(notes)})

# navigation
for nav in P.get('policyNavigation') or []:
    for st in nav.get('steps') or []:
        if st.get('block') not in BY: bad('navigation', f'step block missing {st.get("block")}')

with open(OUT, 'w', newline='') as f:
    wr = csv.DictWriter(f, fieldnames=list(rows[0].keys())); wr.writeheader(); wr.writerows(rows)
print(f'blocks={len(blocks)} events={len(EV)} schemas={len(SCH)} problems={len(problems)}')
for t, m in problems: print('  PROBLEM', t, '|', m)
