"""Build a single-template (v5.0A or v5.0B) copy of the VMR0015 policy tree.

The template-version switch is moved from schema conditions (if templateVersion == ...) into the
plain properties, the other version's sections are dropped, templateVersion is locked to one value,
and sub-schemas no form uses any more are removed (with their $defs / defs / context entries).
Usage: python3 variant.py <build_dir> <out_dir> <v5.0A|v5.0B>
"""
import json, os, re, shutil, sys, glob, copy

src, out, V = sys.argv[1], sys.argv[2], sys.argv[3]
assert V in ('v5.0A', 'v5.0B')
if os.path.exists(out):
    shutil.rmtree(out)
shutil.copytree(src, out)

def load(f):
    j = json.load(open(f))
    return j

files = {}
for f in glob.glob(out + '/schemas/*.json'):
    j = load(f)
    files[j['iri']] = (f, j)

TV = 'templateVersion'

def is_tv(e):
    return TV in (e.get('if', {}) or {}).get('properties', {})

def lock(doc):
    al = doc.get('allOf')
    if not al or not any(is_tv(e) for e in al):
        return False
    keep = []
    mine = {k for e in al if is_tv(e) and e['if']['properties'][TV].get('const') == V for k in e.get('then', {}).get('properties', {})}
    other = {k for e in al if is_tv(e) and e['if']['properties'][TV].get('const') != V for k in e.get('then', {}).get('properties', {})} - mine
    for k in other:   # Guardian also lists condition fields in plain properties: drop the other version's
        doc['properties'].pop(k, None)
    if 'required' in doc:
        doc['required'] = [r for r in doc['required'] if r not in other]
    for e in al:
        if not is_tv(e):
            keep.append(e); continue
        if e['if']['properties'][TV].get('const') == V:
            th = e.get('then', {})
            for k, v in th.get('properties', {}).items():
                doc['properties'][k] = v
            for r in th.get('required', []):
                if r not in doc.setdefault('required', []):
                    doc['required'].append(r)
    if keep:
        doc['allOf'] = keep
    else:
        del doc['allOf']
    p = doc['properties'][TV]
    p['enum'] = [V]
    p['examples'] = [V]
    p['description'] = 'Locked to ' + V + ' in this policy file (one file per VCS v5.0 template set). ' + p.get('description', '')
    return True

locked = []
for iri, (f, j) in files.items():
    doc = j['document']
    if lock(doc):
        locked.append(j['name'])
    # the same forms embedded as $defs copies elsewhere
    for k, d in (doc.get('$defs') or {}).items():
        lock(d)

REF = re.compile(r'"\$ref":\s*"(#[^"]+)"')

def refs_of(node):
    """$refs used by a document, excluding its $defs section."""
    n = {k: v for k, v in node.items() if k != '$defs'}
    return set(REF.findall(json.dumps(n)))

def base(r):
    return r.split('&')[0]

by_base = {base(i): i for i in files}

# roots: schemas named in the policy config, plus every system schema
pol = open(out + '/policy.json').read()
roots = set()
for b in by_base:
    if b in pol:
        roots.add(by_base[b])

reach = set()
stack = list(roots)
while stack:
    i = stack.pop()
    if i in reach:
        continue
    reach.add(i)
    for r in refs_of(files[i][1]['document']):
        bi = by_base.get(base(r))
        if bi and bi not in reach:
            stack.append(bi)

removed = [i for i in files if i not in reach]
for i in removed:
    os.remove(files[i][0])

# prune each kept schema's $defs / defs / context to what it still uses
for i in reach:
    f, j = files[i]
    doc = j['document']
    defs = doc.get('$defs') or {}
    need = set()
    st = [base(r) for r in refs_of(doc)]
    while st:
        b = st.pop()
        key = next((k for k in defs if base(k) == b), None)
        if key is None or key in need:
            continue
        need.add(key)
        st += [base(r) for r in refs_of(defs[key])]
    if defs:
        doc['$defs'] = {k: v for k, v in defs.items() if k in need}
    if isinstance(j.get('defs'), list):
        j['defs'] = [d for d in j['defs'] if any(base(d) == base(k) for k in need)]
    ctx = (j.get('context') or {}).get('@context')
    if isinstance(ctx, dict):
        gone = {base(r).lstrip('#') for r in removed}
        for k in list(ctx):
            if k in gone and not any(base(n).lstrip('#') == k for n in need):
                del ctx[k]
    json.dump(j, open(f, 'w'), ensure_ascii=False)

p = json.load(open(out + '/policy.json'))
p['name'] = 'VMR0015 Safe Drinking Water dMRV (VCS ' + V + ')'
p['policyTag'] = 'VMR0015_Safe_Drinking_Water_dMRV_' + V.replace('.', '')
p['description'] = ('This file uses the VCS ' + V + ' template set only (Guardian shows one template set per policy; '
                    'v5.0A for projects starting before 1 Jan 2027, v5.0B from then). ') + p['description']
json.dump(p, open(out + '/policy.json', 'w'), ensure_ascii=False)
renamed = 0
if V == 'v5.0B':
    # Verra v5.0B templates (PD 2, MR 2, Validation 3.2, Verification 4.3): "Stakeholder Engagement and Safeguards";
    # v5.0A keeps "Safeguards and Stakeholder Engagement"
    for f in glob.glob(out + '/schemas/*.json') + [out + '/policy.json']:
        t = open(f).read()
        n = t.count('Safeguards and Stakeholder Engagement')
        if n:
            open(f, 'w').write(t.replace('Safeguards and Stakeholder Engagement', 'Stakeholder Engagement and Safeguards'))
            renamed += n
    print('v5.0B heading wording fixed in', renamed, 'places')
print(V, '| locked:', locked, '| schemas kept', len(reach), 'removed', len(removed))
print('removed:', sorted(files[i][1]['name'] for i in removed))
