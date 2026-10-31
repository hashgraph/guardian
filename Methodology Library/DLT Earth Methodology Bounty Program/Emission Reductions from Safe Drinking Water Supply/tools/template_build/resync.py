"""Rebuild every schema's nested copies from the standalone schema files:
document.$defs = own documents of all transitively referenced sub-schemas, keyed by their iri;
defs = the same keys; context = JSON-LD terms of the schema and every sub-schema.
Usage: resync.py <tree> [--check]   (--check only reports differences against the current files)"""
import json, glob, re, sys, copy

tree = sys.argv[1]
check = '--check' in sys.argv
files = {}
for f in glob.glob(tree + '/schemas/*.json'):
    j = json.load(open(f)); files[j['iri']] = (f, j)
base = lambda r: r.split('&')[0]
by_base = {base(i): i for i in files}
REF = re.compile(r'"\$ref":\s*"(#[^"]+)"')
SKIP = {'@context', 'type', 'id'}

def own(i):
    d = copy.deepcopy(files[i][1]['document']); d.pop('$defs', None); return d

def refs(i):
    return {by_base[base(r)] for r in REF.findall(json.dumps(own(i))) if base(r) in by_base}

closure = {}
def clos(i, stack=()):
    if i in closure: return closure[i]
    out = set()
    for r in refs(i):
        if r in stack or r == i: continue
        out.add(r); out |= clos(r, stack + (i,))
    closure[i] = out
    return out

def ctx_entry(i):
    d = files[i][1]['document']; terms = {}
    for k, v in d.get('properties', {}).items():
        if k in SKIP: continue
        try:
            c = json.loads(v.get('$comment') or '{}')
        except Exception:
            c = {}
        isref = bool(v.get('$ref') or (v.get('items') or {}).get('$ref'))
        terms[k] = {'@id': c.get('@id')} if isref else {'@type': c.get('@id') or 'https://www.schema.org/text'}
    key = i.lstrip('#')
    return key, {'@id': 'schema:' + base(i).lstrip('#') + '#' + key, '@context': terms}

diff_defs = diff_ctx = changed = 0
for i, (f, j) in files.items():
    C = sorted(clos(i))
    new_defs = {c: own(c) for c in C}
    ctx = {'@version': 1.1, '@vocab': 'https://w3id.org/traceability/#undefinedTerm', 'id': '@id', 'type': '@type'}
    for c in C + [i]:
        k, v = ctx_entry(c); ctx[k] = v
    old_defs = j['document'].get('$defs', {})
    old_ctx = (j.get('context') or {}).get('@context', {})
    if json.dumps(old_defs, sort_keys=True) != json.dumps(new_defs, sort_keys=True): diff_defs += 1
    if json.dumps(old_ctx, sort_keys=True) != json.dumps(ctx, sort_keys=True): diff_ctx += 1
    if not check:
        if new_defs: j['document']['$defs'] = new_defs
        else: j['document'].pop('$defs', None)
        j['defs'] = C
        j['context'] = {'@context': ctx}
        json.dump(j, open(f, 'w'), ensure_ascii=False); changed += 1
print(('CHECK ' if check else '') + f'schemas {len(files)} | $defs differing {diff_defs} | context differing {diff_ctx}' + ('' if check else f' | rewritten {changed}'))
