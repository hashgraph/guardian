"""Align a single-template VMR0015 policy tree with Verra's VCS v5.0 templates, table by table.

spec line:  SECTION | TYPE | CAPTION | LABEL ; LABEL ; ...
  KV      two-column table, labels are row labels            -> one field per label in the section
  REP     repeatable two-column table ("one table per ...")   -> array of rows, labels are the row fields
  COLS    table with column headers                           -> array of rows, labels are the columns
  SUB     report subsection (caption) with row labels          -> subsection object holding the labels
  SUBCOLS evidence-type table inside a report subsection       -> array in that subsection object
Only adds fields and sub-schemas (never removes). New fields are optional.
Usage: tplbuild.py <tree> <variant A|B> <mode dry|apply> FORMNAME=SPECFILE ...
"""
import json, glob, re, sys, uuid, copy, random

tree, V, mode = sys.argv[1], sys.argv[2], sys.argv[3]
pairs = [a.split('=', 1) for a in sys.argv[4:]]
T = 'https://www.schema.org/text'
SKIP = {'@context', 'type', 'id', 'policyId', 'ref', 'guardianVersion'}
STOP = {'the', 'of', 'and', 'or', 'a', 'an', 'to', 'in', 'for', 'is', 'are', 'on', 'with', 'by', 'tco2e', 'if', 'applicable', 'this', 'vcs', 'v5', '0a', '0b', 'pd', 'mr'}

files = {}
for f in glob.glob(tree + '/schemas/*.json'):
    j = json.load(open(f)); files[j['iri']] = [f, j]
base = lambda r: r.split('&')[0]
by_base = {base(i): i for i in files}
model = json.load(open(next(f for f, j in files.values() if j['document'].get('properties', {}).get('id'))))

def norm(s): return re.sub(r'[^a-z0-9 ]', ' ', s.lower().replace('/', ' ')).split()
def cw(s): return [w for w in norm(s) if w not in STOP]
def strip_num(t): return re.sub(r'^(MR |PD )?[0-9][0-9]*(\.[0-9]+)*\.?\s+', '', t or '').replace('(v5.0A)', '').replace('(v5.0B)', '')

def label_match(label, title):
    ln, tn = ' '.join(norm(label)), ' '.join(norm(title))
    if ln and (ln == tn or (' ' + ln + ' ') in (' ' + tn + ' ')): return True
    lw, tw = set(cw(label)), set(cw(title))
    if len(lw) >= 2 and len(lw & tw) / len(lw) >= 0.75 and len(lw & tw) / max(len(tw), 1) >= 0.5: return True
    return False

def doc(i): return files[i][1]['document']
def ref_of(v): return v.get('$ref') or (v.get('items') or {}).get('$ref')
def sch(r): return by_base.get(base(r)) if r else None

def titles_under(i, depth=3, seen=()):
    out = []
    if not i or i in seen or depth < 0: return out
    for k, v in doc(i).get('properties', {}).items():
        if k in SKIP: continue
        out.append(v.get('title') or k)
        out += titles_under(sch(ref_of(v)), depth - 1, seen + (i,))
    return out

def own_sub(i, cap, depth=3, seen=()):
    """the sub-schema under i whose title (without its number) has exactly the caption's words; i itself if none"""
    capw = set(cw(cap))
    def walk(j, d, seen):
        if not j or d > depth or j in seen: return None
        for k, v in doc(j).get('properties', {}).items():
            r = sch(ref_of(v))
            if not r or k in SKIP: continue
            if set(cw(strip_num(re.sub(r'\s*\(VCS [^)]*\)$', '', v.get('title') or '')))) == capw: return r
            x = walk(r, d + 1, seen + (j,))
            if x: return x
        return None
    return walk(i, 0, ()) or i

def find_section(form_iri, num, kind_report):
    """iri of the sub-schema whose property title starts with the section number (searching the form tree)"""
    if num == 'Cover': return form_iri
    if num.startswith('Appendix'):
        n = num.split()[1]
        for k, v in doc(form_iri)['properties'].items():
            if re.match(r'^Appendix ' + n + r'\b', v.get('title') or ''):
                if v.get('type') == 'array' and sch(ref_of(v)): ARRSEC.add(sch(ref_of(v)))
                return sch(ref_of(v)) or form_iri
        return form_iri
    nums = [num]
    while '.' in nums[-1]: nums.append(nums[-1].rsplit('.', 1)[0])
    for n in nums:
        hit = []
        def walk(i, d, seen):
            if not i or d > 4 or i in seen or hit: return
            for k, v in doc(i).get('properties', {}).items():
                t = v.get('title') or ''
                if re.match(r'^(MR |PD )?' + re.escape(n) + r'\.?\s', t) and sch(ref_of(v)):
                    hit.append(sch(ref_of(v)))
                    if v.get('type') == 'array': ARRSEC.add(sch(ref_of(v)))
                    return
                walk(sch(ref_of(v)), d + 1, seen + (i,))
        walk(form_iri, 0, ())
        if hit: return hit[0]
    return None

created = []; added = 0; rowschemas = {}; ARRSEC = set()
def new_schema(name, desc):
    u = str(uuid.uuid4()); iri = '#' + u
    j = copy.deepcopy(model)
    j.update({'uuid': u, 'iri': iri, 'name': name, 'description': desc, 'contextURL': 'schema:' + u, 'defs': [], 'errors': [],
              'id': ''.join(random.choice('0123456789abcdef') for _ in range(24)), 'messageId': None, 'documentURL': None, 'hash': '', 'version': '', 'sourceVersion': ''})
    keep = {k: copy.deepcopy(model['document']['properties'][k]) for k in ('@context', 'type', 'id')}
    j['document'] = {'$id': iri, '$comment': json.dumps({'@id': 'schema:' + u + '#' + u, 'term': u}), 'title': name, 'description': desc,
                     'type': 'object', 'properties': keep, 'required': ['@context', 'type'], 'additionalProperties': False}
    f = tree + '/schemas/' + iri + '.json'
    files[iri] = [f, j]; by_base[iri] = iri; created.append(name)
    return iri

def key_for(i, label):
    w = re.sub(r'[^A-Za-z0-9 ]', ' ', label).split()
    k = (w[0].lower() + ''.join(x[:1].upper() + x[1:] for x in w[1:]))[:40] if w else 'field'
    if k[0].isdigit(): k = 'f' + k
    props = doc(i)['properties']; base_k, n = k, 2
    while k in props: k = base_k + str(n); n += 1
    return k

def is_num(label):
    return bool(re.search(r'\(tCO2e\)|\(%\)|^Risk rating|^Number of|^Total CARs|^Total CLs|^Total FARs|^Total CARs, CLs', label))

def add_field(i, label, title, desc):
    global added
    props = doc(i)['properties']; k = key_for(i, label)
    pos = len([p for p in props if p not in SKIP])
    props[k] = {'title': title, 'description': desc, 'readOnly': False, 'type': 'number' if is_num(label) else 'string',
                '$comment': json.dumps({'term': k, '@id': T, 'orderPosition': pos})}
    added += 1
    return k

def add_ref(i, child, title, desc, array):
    global added
    props = doc(i)['properties']; k = key_for(i, title)
    pos = len([p for p in props if p not in SKIP])
    c = {'term': k, '@id': 'schema:' + base(i).lstrip('#') + '#' + child.lstrip('#'), 'availableOptions': [], 'orderPosition': pos}
    props[k] = {'title': title, 'description': desc, 'readOnly': False, '$comment': json.dumps(c)}
    if array: props[k].update({'type': 'array', 'items': {'$ref': child}})
    else: props[k]['$ref'] = child
    added += 1
    return k

def row_schema(cols, caption, desc):
    key = tuple(cols)
    if key in rowschemas: return rowschemas[key]
    i = new_schema(caption + ' row (VCS ' + V5 + ')', desc)
    for c in cols: add_field(i, c, c, desc + ' - column "' + c + '".')
    rowschemas[key] = i
    return i

ALIAS = {'Project ID': ['Project Reference', 'Project ID'], 'Project name': ['Project Name'], 'Project start date': ['Start Date', 'Project start date'],
         'Monitoring period start': ['Monitoring period start'], 'Monitoring period end': ['Monitoring period end']}
report = []
for form_name, specf in pairs:
    form = next(i for i, (f, j) in files.items() if j['name'] == form_name)
    docname = {'VCS Project Description': 'Project Description', 'VCS Monitoring Report': 'Monitoring Report', 'Validation Report': 'Validation Report', 'VVB Verification Report': 'Verification Report'}[form_name]
    V5 = 'v5.0' + V
    rows = [[x.strip() for x in l.split('|')] for l in open(specf) if l.strip()]
    # labels repeated across tables of the same section get the caption as prefix
    seen_lab = {}
    for sec, kind, cap, labs in rows:
        if kind in ('KV',):
            for l in labs.split(' ; '): seen_lab[(sec, l)] = seen_lab.get((sec, l), 0) + 1
    tot = miss = 0
    for sec, kind, cap, labs in rows:
        labels = [l.strip().rstrip(':') for l in labs.split(' ; ') if l.strip()]
        desc = 'VCS ' + docname + ' template ' + V5 + ', ' + (('section ' + sec) if sec[0].isdigit() else sec) + ': ' + cap
        node = find_section(form, sec.split('.')[0] + '.' + sec.split('.')[1] if kind in ('SUB', 'SUBCOLS') and sec[0].isdigit() and sec.count('.') > 1 else sec, kind in ('SUB', 'SUBCOLS'))
        if node is None:
            report.append(f'{docname} {sec} {cap}: section not found'); tot += len(labels); miss += len(labels); continue
        target, qualify = node, False
        if kind in ('SUB', 'SUBCOLS'):
            capw = set(cw(cap)); best, bscore = None, 0
            for k, v in doc(node)['properties'].items():
                if k in SKIP or v.get('type') == 'array' or not sch(ref_of(v)): continue
                tw = set(cw(strip_num(v.get('title') or '')))
                sc = len(capw & tw) / max(len(capw), 1) if tw else 0
                sc2 = len(capw & tw) / max(len(tw), 1) if tw else 0
                if min(sc, sc2) > bscore: best, bscore = sch(ref_of(v)), min(sc, sc2)
            if best and bscore >= 0.6:
                target, qualify = best, bscore < 0.99
            else:
                target = None
        if kind in ('KV', 'SUB'):
            for l in labels:
                tot += 1
                title = (cap + ': ' + l) if (qualify or seen_lab.get((sec, l), 0) > 1) else l
                pool = titles_under(target) if target else []
                if l in ALIAS and not qualify:
                    top = [v.get('title') or '' for k, v in doc(form)['properties'].items() if k not in SKIP]
                    if any(a == x for a in ALIAS[l] for x in top) and sec != 'Cover' and l == 'Project start date': continue   # PD start date is the top-level Start Date the engine reads
                    if sec == 'Cover' and any(a == x for a in ALIAS[l] for x in top): continue
                if qualify and seen_lab.get((sec, l), 0) <= 1:   # the caption's own subsection (nested under the target if there is one)
                    hit = any(' '.join(norm(title)) == ' '.join(norm(t)) for t in pool) or any(label_match(l, t) for t in titles_under(own_sub(target, cap), 0))
                elif title != l:   # label repeated across tables: the field must carry the same caption and the same label
                    hit = any(' '.join(norm(title)) == ' '.join(norm(t)) or (': ' in t and label_match(cap, t.split(': ', 1)[0]) and label_match(l, t.split(': ', 1)[1])) for t in pool)
                else:
                    hit = any(label_match(l, t) for t in pool)
                if hit:
                    continue
                miss += 1; report.append(f'  missing {docname} {sec} | {cap} | {title}')
                if mode == 'apply':
                    if target is None:
                        sub = new_schema(cap + ' (VCS ' + docname + ' ' + V5 + ')', desc)
                        add_ref(node, sub, cap, desc, False); target, qualify = sub, False
                        title = l
                    add_field(target, l, title, desc + ' - ' + l + '.')
        else:  # COLS, REP, SUBCOLS
            if kind == 'SUBCOLS' and target is None and mode == 'apply':
                sub = new_schema(cap + ' (VCS ' + docname + ' ' + V5 + ')', desc)
                add_ref(node, sub, cap, desc, False); target, qualify = sub, False
            best, bfrac = None, 0
            if target in ARRSEC:
                rt0 = titles_under(target, 0)
                bfrac = sum(1 for c in labels if any(label_match(c, t) for t in rt0)) / len(labels)
                best = target if (bfrac > 0 or kind == 'REP') else None
            for k, v in (doc(target)['properties'].items() if target else []):
                if v.get('type') != 'array' or not sch(ref_of(v)): continue
                rt = titles_under(sch(ref_of(v)), 0)
                frac = sum(1 for c in labels if any(label_match(c, t) for t in rt)) / len(labels)
                if frac > bfrac: best, bfrac = sch(ref_of(v)), frac
            if best and (bfrac >= 0.5 or (best == target and target in ARRSEC and (kind == 'REP' or bfrac > 0))):
                rt = titles_under(best, 0)
                for c in labels:
                    tot += 1
                    if any(label_match(c, t) for t in rt): continue
                    miss += 1
                    if mode == 'apply': add_field(best, c, c, desc + ' - column "' + c + '".')
            else:
                tot += len(labels); miss += len(labels)
                if mode == 'apply':
                    rs = row_schema(labels, cap, desc)
                    title = ('Evidence gathered' if kind == 'SUBCOLS' else cap)
                    add_ref(target, rs, title, desc + '.', True)
    report.append(f'{docname} {V5}: {tot} labels, {miss} without a matching field' + (' (added)' if mode == 'apply' else ''))

if mode == 'apply':
    for i, (f, j) in files.items():
        json.dump(j, open(f, 'w'), ensure_ascii=False)
print('\n'.join(report))
if mode == 'apply': print(f'new sub-schemas {len(created)} | fields/arrays added {added}')
