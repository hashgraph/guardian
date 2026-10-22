"""Compare two Guardian .policy files: what changed apart from the IDs, dates and names that MGS assigns on every import.

Usage (from the package root):
    python3 policy/v3.2_fNRB_input_checks/tools/compare_policies.py <first.policy> <second.policy>

Checks, with UUIDs, database IDs, dates, owners, topic IDs and 13-digit MGS timestamps ignored:
    - the block tree (type, tag and nesting of every block)
    - every block setting except the mathBlock code
    - the mathBlock code, block by block, printing the changed lines
    - the schemas (paired by name), the system schemas and the token
    - the top-level policy.json fields
Exit code 0 if the files differ only in mathBlock code and in the fields MGS assigns (name, tag, topic), 1 otherwise.
"""
import difflib
import json
import re
import sys
import zipfile

UUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
STAMP = re.compile(r'\d{13}')
VOLATILE = {'id', 'uuid', '_id', 'createDate', 'updateDate', 'messageId', 'topicId', 'instanceTopicId', 'owner', 'creator',
            'tenantId', 'hash', 'documentURL', 'contextURL', 'iri', 'contentDocumentFileId', 'contentContextFileId', 'tokenId',
            '_propHash', 'version', 'sourceVersion', 'status', 'policyId', 'readonly'}
MGS_ASSIGNED = {'name', 'policyTag'}   # MGS adds a timestamp to the name of a second import and generates a new tag


def norm(o):
    if isinstance(o, dict):
        return {STAMP.sub('T', UUID.sub('U', k)): norm(v) for k, v in o.items() if k not in VOLATILE}
    if isinstance(o, list):
        return [norm(v) for v in o]
    if isinstance(o, str):
        return STAMP.sub('T', UUID.sub('U', o))
    return o


def load(path):
    z = zipfile.ZipFile(path)
    policy = json.loads(z.read('policy.json'))
    folder = {'schemas': {}, 'systemSchemas': {}, 'tokens': {}}
    for n in z.namelist():
        top = n.split('/')[0]
        if top in folder and n.endswith('.json'):
            j = json.loads(z.read(n))
            if 'document' in j and isinstance(j['document'], str):
                j['document'] = json.loads(j['document'])
            folder[top].setdefault(j.get('name') or j.get('tokenName') or n, []).append(norm(j))
    return policy, folder


def walk(b, depth=0, out=None):
    out = [] if out is None else out
    out.append(b)
    b['_depth'] = depth
    for c in b.get('children', []):
        walk(c, depth + 1, out)
    return out


def paths(a, b, p=''):
    if type(a) != type(b):
        yield p, a, b
    elif isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            yield from paths(a.get(k), b.get(k), f'{p}/{k}')
    elif isinstance(a, list):
        if len(a) != len(b):
            yield p + '[len]', len(a), len(b)
        else:
            for i, (x, y) in enumerate(zip(a, b)):
                yield from paths(x, y, f'{p}[{i}]')
    elif a != b:
        yield p, a, b


def main(first, second):
    pa, fa = load(first)
    pb, fb = load(second)
    ok = True
    ba, bb = walk(pa['config']), walk(pb['config'])
    tree = [(b['_depth'], b.get('blockType'), b.get('tag')) for b in ba] == [(b['_depth'], b.get('blockType'), b.get('tag')) for b in bb]
    print(f'Blocks: {len(ba)} vs {len(bb)}; block tree identical: {tree}')
    ok &= tree

    code_a = {b['tag']: b['expression'].get('code', '') for b in ba if b.get('blockType') == 'mathBlock'}
    code_b = {b['tag']: b['expression'].get('code', '') for b in bb if b.get('blockType') == 'mathBlock'}

    def strip_code(cfg):
        cfg = json.loads(json.dumps(cfg))
        for b in walk(cfg):
            b.pop('_depth', None)
            if b.get('blockType') == 'mathBlock':
                b['expression']['code'] = ''
        return norm(cfg)
    other = list(paths(strip_code(pa['config']), strip_code(pb['config'])))
    print(f'Block settings other than mathBlock code: {"identical" if not other else str(len(other)) + " difference(s)"}')
    for p, x, y in other[:20]:
        print(f'    {p[-110:]}: {str(x)[:60]!r} -> {str(y)[:60]!r}')
    ok &= not other

    for tag in sorted(set(code_a) | set(code_b)):
        a, b = code_a.get(tag, ''), code_b.get(tag, '')
        if a == b:
            print(f'mathBlock {tag}: code identical')
            continue
        d = [l for l in difflib.unified_diff(a.splitlines(), b.splitlines(), lineterm='', n=0) if l[:3] not in ('+++', '---')]
        print(f'mathBlock {tag}: {sum(l.startswith("-") for l in d)} line(s) removed, {sum(l.startswith("+") for l in d)} added')
        for line in d:
            print('    ' + line[:200])

    for kind in ('schemas', 'systemSchemas', 'tokens'):
        xa, xb = fa[kind], fb[kind]
        diff = sorted(k for k in set(xa) | set(xb) if sorted(map(json.dumps, xa.get(k, []))) != sorted(map(json.dumps, xb.get(k, []))))
        print(f'{kind}: {sum(map(len, xa.values()))} vs {sum(map(len, xb.values()))}; different: {len(diff)}' + (f' {diff[:5]}' if diff else ''))
        ok &= not diff

    keys = sorted(set(pa) | set(pb))
    top = [k for k in keys if k != 'config' and k not in VOLATILE | MGS_ASSIGNED and norm(pa.get(k)) != norm(pb.get(k))]
    for k in top:
        print(f'policy.json {k}: {str(pa.get(k))[:80]!r} -> {str(pb.get(k))[:80]!r}')
    assigned = [k for k in keys if k != 'config' and k in VOLATILE | MGS_ASSIGNED and pa.get(k) != pb.get(k)]
    if assigned:
        print('policy.json fields MGS assigns on import (not content):')
        for k in assigned:
            print(f'    {k}: {str(pa.get(k))[:80]!r} -> {str(pb.get(k))[:80]!r}')
    ok &= not top
    print('RESULT:', 'only the mathBlock code and MGS-assigned fields differ' if ok else 'other differences found (listed above)')
    return 0 if ok else 1


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1], sys.argv[2]))
