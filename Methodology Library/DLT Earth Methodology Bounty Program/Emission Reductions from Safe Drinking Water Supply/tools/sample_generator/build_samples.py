import json, sys, os, subprocess, copy
T = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, T)
from schemalib import Lib
from gen import Gen, flatten_keys, add_ld
import scenario as sc
import texts
from jsonschema import Draft202012Validator

S = os.path.dirname(T)
L = Lib(S + '/build')
# Earlier sample set whose free-text answers are reused (defaults to this package's v5.0B samples).
OLD = os.environ.get('OLD_SAMPLES', os.path.join(os.path.dirname(S), 'sample-data', 'v5.0B') + '/')
OUT = S + '/samples'
os.makedirs(OUT, exist_ok=True)
IRI = {'PP': '#dc44a535-8dc1-4fea-819f-fe67336481bf', 'VVB': '#ac11aa64-0028-4ffe-b58d-6dba9cff116d',
       'PD': '#ecc894cb-0f25-41b9-b3ef-9b6c219fb15a', 'MR': '#9891e08d-c6ed-4645-9c5e-e111daaf37f5',
       'VAL': '#604e92b9-8243-4499-b057-e6cfc8899e7f', 'VER': '#98d44a6c-9ea5-454e-8ebb-9f44d522da65',
       'VCU': '#058aef89-3fdb-4f9b-8066-2b298854a6e0&1.0.1'}
GENERIC = {'description', 'value', 'name', 'title', 'comments', 'notes', 'status', 'type', 'date', 'source', 'unit', 'method',
           'frequency', 'id', 'item', 'response', 'details', 'explanation', 'justification', 'evidence', 'reference', 'comment',
           'answer', 'remarks', 'role', 'contact', 'email', 'phone', 'address', 'organization', 'orgName', 'summary'}


def old(f):
    return json.load(open(OLD + f))['document']


OLD_ALL = {}
for f in ('3_Project_Description.json', '4_Monitoring_Report.json', '5_Validation_Report.json', '6_Verification_Report.json'):
    flatten_keys(old(f), OLD_ALL)
KEY_REUSE = {k: v for k, v in OLD_ALL.items() if k not in GENERIC and len(k) >= 6}


def safe_schema(d):
    """Copy of a Guardian schema with $defs keyed by safe names and $refs rewritten to JSON pointers (validation only)."""
    d = copy.deepcopy(d)
    keymap = {k: 'd_' + k.lstrip('#').replace('&', '_').replace('.', '_') for k in d.get('$defs', {})}
    def fix(o):
        if isinstance(o, dict):
            if '$ref' in o and o['$ref'] in keymap:
                o['$ref'] = '#/$defs/' + keymap[o['$ref']]
            for k in list(o):
                if k == '$id' and o is not d:
                    del o[k]
                else:
                    fix(o[k])
        elif isinstance(o, list):
            for x in o:
                fix(x)
    d['$defs'] = {keymap[k]: v for k, v in d.get('$defs', {}).items()}
    d.pop('$id', None)
    fix(d)
    return d


def validate(name, doc_schema, value):
    v = Draft202012Validator(safe_schema(doc_schema), format_checker=Draft202012Validator.FORMAT_CHECKER)
    errs = sorted(v.iter_errors(add_ld(doc_schema, value)), key=lambda e: list(e.absolute_path))
    return [f'{"/".join(map(str, e.absolute_path))}: {e.message[:200]}' for e in errs]


def run(name, hook, sample, rules, readonly=()):
    d = L.doc(IRI[name])
    g = Gen(d, hook=hook, key_reuse=KEY_REUSE, text_rules=rules)
    doc = g.build(sample)
    errs = validate(name, d, doc)
    draft = {k: v for k, v in doc.items() if k not in readonly}
    json.dump({'type': 'request-vc-draft', 'version': '1.0.0', 'schema': IRI[name], 'policyId': 'SET_FROM_YOUR_INSTANCE',
               'blockId': 'SET_FROM_YOUR_INSTANCE', 'document': draft}, open(f'{OUT}/{name}.json', 'w'), indent=1, ensure_ascii=False)
    json.dump(doc, open(f'{OUT}/{name}.full.json', 'w'), indent=1, ensure_ascii=False)
    req_fb = [x for x in g.fallback]
    print(f'== {name}: errors {len(errs)} | sources {g.used} | logged fallbacks {len(req_fb)}')
    for e in errs[:25]:
        print('   ERR', e)
    return doc, g


def top_hook(over):
    def h(path, key, node, parent):
        return over.get(path)
    return h


if __name__ == '__main__':
    which = sys.argv[1:] or list(IRI)
    res = {}
    if 'PD' in which:
        res['PD'] = run('PD', top_hook({
            '/templateVersion': 'v5.0B', '/ghgType': 'Ex Ante', '/projectId': sc.PROJECT_ID, '/projectName': sc.PROJECT_NAME,
            '/startDate': sc.START, '/methodologyRecords': sc.pd_records(), '/appendix2': sc.pd_appendix2(),
            **texts.PD_OVERRIDES}), old('3_Project_Description.json'), texts.PD_RULES)
    if 'MR' in which:
        res['MR'] = run('MR', top_hook({
            '/mrId': sc.MR_ID, '/periodRef': sc.PERIOD_REF, '/templateVersion': 'v5.0B', '/ghgType': 'Ex Post',
            '/projectRef': sc.PROJECT_ID, '/monitoringPeriodStart': sc.MP_START, '/monitoringPeriodEnd': sc.MP_END,
            '/methodologyRecords': sc.mr_records(), '/appendix2': sc.mr_appendix2(), **texts.MR_OVERRIDES}),
            old('4_Monitoring_Report.json'), texts.MR_RULES, readonly=('projectRef', 'templateVersion'))
    for n in ('PP', 'VVB', 'VAL', 'VER', 'VCU'):
        if n in which:
            res[n] = run(n, top_hook(texts.OVERRIDES[n]), texts.SAMPLES.get(n, {}), texts.RULES.get(n, []), readonly=texts.READONLY.get(n, ()))
    json.dump({k: v[1].fallback for k, v in res.items()}, open(f'{OUT}/_fallbacks.json', 'w'), indent=1)
    json.dump({k: getattr(v[1], 'keyreused', []) for k, v in res.items()}, open(f'{OUT}/_keyreuse.json', 'w'), indent=1)
