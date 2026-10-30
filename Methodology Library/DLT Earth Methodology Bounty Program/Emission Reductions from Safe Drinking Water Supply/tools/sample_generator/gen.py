"""Schema-driven sample generator for the VMR0015 v3 forms.

Fills a document from (1) explicit scenario overrides, (2) reused content from the
earlier sample files (matched by path, then by key), (3) written text rules, and
records every required field that fell through to a schema example or a bare default,
so the caller can prove no unreviewed filler is left in required fields.
"""
import json, re, datetime

SKIP = {'@context', 'type', 'id', 'policyId', 'ref', 'guardianVersion'}
MONTHS = {m: i for i, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July',
                                       'August', 'September', 'October', 'November', 'December'], 1)}
REPLACE = [   # scenario moved to a 2027 start (VCS v5.0B); 5-year renewable crediting period (VCS v5, E&I projects)
    ('At the annual functionality check 2,790 units (93%) met the full standard; 210 failed and were replaced.',
     'At the annual functionality check (random sample of 100 appliances per zone, 400 in total) 93 per zone met all three AMS-III.AV table 11 criteria (m = 0.93): 5 were not operating and 2 failed the E. coli test; all 7 were repaired or replaced within 14 days.'),
    ('appliance functionality was 93% against the 95% assumed', 'appliance functionality (m) was 0.93 against the 0.95 assumed'),
    ('January-February 2025', 'November-December 2026'), ('calibrated in January 2026', 'calibrated in December 2026'), ('July 2025', 'July 2027'),
    ('28-February-2030', '31-December-2031'),
    ('January 2025 to February 2026', 'November 2026 to December 2027'),
    ('01-March-2025 to 28-February-2026', '01-January-2027 to 31-December-2027'),
    ('01-March-2025', '01-January-2027'), ('28-February-2026', '31-December-2027'), ('15-April-2025', '15-February-2027'),
    ('15-February-2025', '15-November-2026'), ('15-January-2026', '15-November-2027'), ('20-January-2026', '20-November-2027'),
    ('02-September-2026', '15-January-2028'), ('20-February-2025', '15-December-2026'), ('05-March-2026', '20-January-2028'),
    ('15-March-2026', '31-January-2028'), ('PD-KSW-2025-001', 'PD-KSW-2027-001'), ('MR-2026-001', 'MR-2027-001'), ('MP-2026-01', 'MP-2027-01'),
    ('Five-year renewable crediting period selected to allow baseline reassessment at renewal.',
     'Five-year crediting period, renewable (VCS v5 rule for energy and industry projects); the baseline is reassessed at each renewal.'),
]


def iso(s):
    """'01-March-2025' -> '2025-03-01'; ISO passes through; anything else -> None."""
    if not isinstance(s, str):
        return None
    s = s.strip()
    if re.fullmatch(r'\d{4}-\d{2}-\d{2}', s):
        return s
    m = re.fullmatch(r'(\d{1,2})-([A-Za-z]+)-(\d{4})', s)
    if m and m.group(2).capitalize() in MONTHS:
        return datetime.date(int(m.group(3)), MONTHS[m.group(2).capitalize()], int(m.group(1))).isoformat()
    return None


def fix_text(s):
    for a, b in REPLACE:
        s = s.replace(a, b)
    return s


class Gen:
    def __init__(self, doc, hook=None, key_reuse=None, text_rules=None):
        self.doc = doc
        self.hook = hook or (lambda path, key, node, parent_path: None)
        self.key_reuse = key_reuse or {}
        self.text_rules = text_rules or []      # list of (regex on path, value or callable(path,node))
        self.fallback = []                      # (path, how) for required leaves without a written source
        self.used = {'override': 0, 'sample': 0, 'keyreuse': 0, 'rule': 0, 'enum': 0, 'fallback': 0}

    def res(self, node):
        n = 0
        while isinstance(node, dict) and '$ref' in node and n < 30:
            node = self.doc['$defs'][node['$ref'].split('/')[-1]]
            n += 1
        return node

    def build(self, sample):
        return self.value(self.doc, '', '', sample, True)

    # -------------------------------------------------------------------------------------
    def value(self, node, path, key, sample, required, include_optional=False):
        node = self.res(node)
        t = node.get('type')
        ov = self.hook(path, key, node, path.rsplit('/', 1)[0])
        if ov is not None and not (isinstance(ov, dict) and ov.get('__merge__')):
            if t in ('object', 'array') or 'properties' in node:
                # an override for a container is treated as the sample for that container (strict: unknown keys fail)
                prev, self.strict = getattr(self, 'strict', False), True
                try:
                    return self.value_inner(node, path, key, ov, required)
                finally:
                    self.strict = prev
            self.used['override'] += 1
            return self.coerce(node, path, ov)
        return self.value_inner(node, path, key, sample, required)

    def value_inner(self, node, path, key, sample, required):
        node = self.res(node)
        t = node.get('type')
        if t == 'object' or 'properties' in node:
            out = {}
            req = set(node.get('required', []))
            if getattr(self, 'strict', False) and sample is not None and not isinstance(sample, dict):
                raise ValueError(f'{path}: override gives {type(sample).__name__} where the schema has an object')
            if isinstance(sample, dict) and getattr(self, 'strict', False):
                unknown = [k for k in sample if k not in node.get('properties', {}) and k not in SKIP]
                if unknown:
                    raise ValueError(f'{path}: override keys not in schema: {unknown}')
            for k, v in node.get('properties', {}).items():
                if k in SKIP:
                    continue
                s = sample.get(k) if isinstance(sample, dict) else None
                p = path + '/' + k
                ov = self.hook(p, k, self.res(v), path)
                if s is None and ov is None and k not in req:
                    continue
                val = self.value(v, p, k, s, k in req)
                if val is not None:
                    out[k] = val
            return out
        if t == 'array':
            it = node.get('items', {})
            if isinstance(sample, list) and sample:
                return [x for x in (self.value(it, path + '[]', key, si, True) for si in sample) if x is not None]
            if required:
                n = max(1, node.get('minItems', 1))
                return [self.value(it, path + '[]', key, None, True) for _ in range(n)]
            return None
        return self.leaf(node, path, key, sample, required)

    def coerce(self, node, path, v):
        t = node.get('type')
        if node.get('format') == 'date' and isinstance(v, str):
            d = iso(v)
            if d is None:
                raise ValueError(f'{path}: not a date: {v!r}')
            return d
        if t in ('number', 'integer') and isinstance(v, bool):
            raise ValueError(f'{path}: bool for number')
        if t in ('number', 'integer') and not isinstance(v, (int, float)):
            raise ValueError(f'{path}: expected number, got {v!r}')
        if t == 'boolean' and not isinstance(v, bool):
            raise ValueError(f'{path}: expected boolean, got {v!r}')
        if t == 'string' and not isinstance(v, str):
            v = str(v)
        if node.get('enum') and v not in node['enum']:
            raise ValueError(f'{path}: {v!r} not in enum {node["enum"]}')
        return v

    def leaf(self, node, path, key, sample, required):
        t = node.get('type')
        en = node.get('enum')
        fmt = node.get('format')
        # 1. reuse from the earlier sample at the same path
        if sample is not None:
            v = self.accept(node, sample)
            if v is not None:
                self.used['sample'] += 1
                return v
        # 2. written text rules (path regex)
        for rx, val in self.text_rules:
            if re.search(rx, path):
                v = val(path, node) if callable(val) else val
                if v is not None:
                    self.used['rule'] += 1
                    return self.coerce(node, path, v)
        # 3. reuse by key from the earlier samples
        if key in self.key_reuse:
            v = self.accept(node, self.key_reuse[key])
            if v is not None:
                self.used['keyreuse'] += 1
                self.keyreused = getattr(self, 'keyreused', []) + [(path, str(v)[:90])]
                return v
        if not required:
            return None
        # 4. enums: first option (the caller overrides every enum that matters)
        if en:
            self.used['enum'] += 1
            self.fallback.append((path, 'enum-first: ' + str(en[0])[:60]))
            return en[0]
        # 5. last resort: schema example / default, logged
        self.used['fallback'] += 1
        if node.get('default') is not None:
            self.fallback.append((path, 'schema default'))
            return self.coerce(node, path, node['default'])
        if node.get('examples'):
            self.fallback.append((path, 'schema example'))
            return self.coerce(node, path, node['examples'][0])
        self.fallback.append((path, 'BARE'))
        if fmt == 'date':
            return '2025-03-01'
        return {'number': 0, 'integer': 0, 'boolean': False}.get(t, 'Not applicable')

    def accept(self, node, v):
        t = node.get('type')
        if isinstance(v, (dict, list)):
            return None
        if node.get('format') == 'date':
            return iso(v) if isinstance(v, str) else None
        if t == 'string':
            if isinstance(v, bool) or v is None:
                return None
            v = fix_text(str(v))
            d = iso(v)
            if d and re.search(r'date', node.get('title', ''), re.I):
                v = d
            if node.get('enum') and v not in node['enum']:
                return None
            return v
        if t in ('number', 'integer'):
            return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None
        if t == 'boolean':
            return v if isinstance(v, bool) else None
        return None


def flatten_keys(obj, out=None):
    """key -> first scalar value found anywhere in obj (used for key-level reuse)."""
    out = {} if out is None else out
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, (dict, list)):
                flatten_keys(v, out)
            elif k not in out and v not in (None, ''):
                out[k] = v
    elif isinstance(obj, list):
        for v in obj:
            flatten_keys(v, out)
    return out


def add_ld(doc, value, node=None, defkey=None):
    """Copy of value with @context/type added to every object, as Guardian does on submit (for validation only)."""
    node = node if node is not None else doc
    while '$ref' in node:
        defkey = node['$ref'].split('/')[-1]
        node = doc['$defs'][defkey]
    if isinstance(value, dict):
        out = {}
        props = node.get('properties', {})
        for k, v in value.items():
            out[k] = add_ld(doc, v, props.get(k, {}), None)
        if 'properties' in node and '@context' in props:
            out['@context'] = []
            out['type'] = (defkey or doc.get('$id', '#x')).lstrip('#').split('&')[0]
        return out
    if isinstance(value, list):
        it = node.get('items', {})
        return [add_ld(doc, v, it, None) for v in value]
    return value
