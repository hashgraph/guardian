"""Field-level comparison: Verra template table labels (spec JSON) vs field titles in a policy's schemas.
spec: {"form": "<schema name>", "sections": {"1.2": ["label", ...], ...}}
For each section, every field title found under the sub-schema whose title/name starts with that number
(recursively through $ref sub-schemas and array items) is a candidate; a label matches when, after
normalising, it is contained in a title or shares >= 60 % of its words with one."""
import json, glob, re, sys

tree, specf = sys.argv[1], sys.argv[2]
spec = json.load(open(specf))
by = {}
for f in glob.glob(tree + '/schemas/*.json'):
    j = json.load(open(f)); by[j['iri'].split('&')[0]] = j
SKIP = {'@context', 'type', 'id', 'policyId', 'ref', 'guardianVersion'}
STOP = {'the', 'of', 'and', 'or', 'a', 'an', 'to', 'in', 'for', 'is', 'are', 'on', 'with', 'by', 'tco2e', 'if', 'applicable'}

def norm(s):
    return re.sub(r'[^a-z0-9 ]', ' ', s.lower().replace('/', ' ')).split()

def words(s):
    return {w for w in norm(s) if w not in STOP}

def collect(iri, seen):
    out = []
    j = by.get(iri.split('&')[0])
    if not j or iri in seen:
        return out
    seen = seen | {iri}
    for k, v in j['document'].get('properties', {}).items():
        if k in SKIP:
            continue
        out.append((v.get('title') or k) + ' ' + (v.get('description') or '')[:200] + ' ' + k)
        r = v.get('$ref') or (v.get('items') or {}).get('$ref')
        if r:
            out += collect(r, seen)
    return out

form = [j for j in by.values() if j['name'] == spec['form']][0]

def section_root(num):
    """property of the form (at any depth) whose title starts with the section number"""
    hits = []
    def walk(iri, depth, seen):
        j = by.get(iri.split('&')[0])
        if not j or depth > 4 or iri in seen:
            return
        for k, v in j['document'].get('properties', {}).items():
            t = (v.get('title') or '')
            r = v.get('$ref') or (v.get('items') or {}).get('$ref')
            if re.match(r'^(MR |PD )?' + re.escape(num) + r'[ .]', t):
                hits.append((t, r))
            elif r:
                walk(r, depth + 1, seen | {iri})
    walk(form['iri'], 0, set())
    return hits

total = miss_n = 0
for num, labels in spec['sections'].items():
    roots = section_root(num)
    titles = []
    for t, r in roots:
        titles.append(t)
        if r:
            titles += collect(r, set())
    tw = [(t, words(t), ' '.join(norm(t))) for t in titles]
    missing = []
    for lab in labels:
        total += 1
        lw, ln = words(lab), ' '.join(norm(lab))
        ok = any(ln and ln in tn for _, _, tn in tw) or any(lw and len(lw & w) / len(lw) >= 0.6 for _, w, _ in tw)
        if not ok:
            missing.append(lab)
    miss_n += len(missing)
    status = 'NO SECTION FOUND' if not roots else ('ok' if not missing else 'missing: ' + '; '.join(missing))
    print(f'{num:6s} {len(labels):3d} labels | {status}')
print(f'TOTAL labels {total}, unmatched {miss_n}')
