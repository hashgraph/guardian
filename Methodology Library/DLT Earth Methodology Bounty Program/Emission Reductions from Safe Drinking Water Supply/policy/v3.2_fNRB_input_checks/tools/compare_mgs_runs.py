"""Compare the documents two MGS test runs produced: the Policy Integrity Test recordings saved inside two
"..._with_integrity_test.policy" files.

Usage (from the package root):
    python3 policy/v3.2_backup/tools/compare_mgs_runs.py <first_with_integrity_test.policy> <second_with_integrity_test.policy>

Each recording (tests/*.record) holds the documents MGS produced during the run. This script maps each document's
schema to its schema name (through the schemas of its own policy file), pairs the documents by schema name in the order
they were issued, and lists every field that differs. UUIDs, DIDs, Hedera IDs, dates, signatures and references to
other documents are ignored, because MGS assigns new ones on every run.
"""
import base64
import collections
import io
import json
import re
import sys
import zipfile

UUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
DID = re.compile(r'did:hedera:testnet:[A-Za-z0-9]+_0\.0\.\d+')
DATE = re.compile(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z')
HEDERA = re.compile(r'0\.0\.\d{5,}')
DROP = {'id', 'type', 'issuanceDate', 'proof', 'issuer', '@context', 'policyId', 'ref', 'guardianVersion', 'date', 'serials',
        'tokenId', 'relationships', 'accountId', 'topicId', 'messageId'}
SHOW = ('monitoringReportId', 'monitoringPeriodStart', 'monitoringPeriodEnd', 'ER_final_total', 'dataQualityFlags')


def scrub(o):
    if isinstance(o, dict):
        return {k: scrub(v) for k, v in o.items() if k not in DROP}
    if isinstance(o, list):
        return [scrub(v) for v in o]
    if isinstance(o, str):
        return HEDERA.sub('H', DATE.sub('D', DID.sub('DID', UUID.sub('U', o))))
    return o


def documents(policy_path):
    z = zipfile.ZipFile(policy_path)
    names = {}
    for n in z.namelist():
        if n.startswith('schemas/') and n.endswith('.json'):
            s = json.loads(z.read(n))
            names[s['uuid']] = s['name']
    records = [n for n in z.namelist() if n.startswith('tests/') and n.endswith('.record')]
    if len(records) != 1:
        sys.exit(f'{policy_path}: expected one tests/*.record, found {len(records)}')
    rec = zipfile.ZipFile(io.BytesIO(z.read(records[0])))
    out = collections.defaultdict(list)
    for n in rec.namelist():
        if not n.startswith('results/') or n.endswith('/'):
            continue
        key = n.split('/', 1)[1]
        try:
            kind = base64.b64decode(key + '=' * (-len(key) % 4)).decode().split('|')[0]
        except Exception:
            continue
        if kind != 'vc':
            continue
        vc = json.loads(rec.read(n))
        subjects = vc['credentialSubject'] if isinstance(vc['credentialSubject'], list) else [vc['credentialSubject']]
        for s in subjects:
            t = str(s.get('type', ''))
            out[names.get(t, 'Guardian system document ' + t.split('&')[0])].append((vc.get('issuanceDate', ''), s))
    for k in out:
        out[k].sort(key=lambda x: x[0])
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
    A, B = documents(first), documents(second)
    total_a, total_b = sum(map(len, A.values())), sum(map(len, B.values()))
    print(f'Documents produced: {total_a} vs {total_b}')
    same = 0
    for name in sorted(set(A) | set(B)):
        la, lb = A.get(name, []), B.get(name, [])
        print(f'[{name}]  {len(la)} vs {len(lb)}')
        for i, (x, y) in enumerate(zip(la, lb)):
            d = list(paths(scrub(x[1]), scrub(y[1])))
            same += not d
            print(f'    #{i + 1}: ' + ('identical' if not d else f'{len(d)} field(s) differ'))
            for p, u, v in d[:15]:
                print(f'        {p[:100]}: {u!r} -> {v!r}'[:220])
        for j, (_, s) in enumerate(la[len(lb):]):
            print(f'    only in the first run, #{len(lb) + j + 1}: ' + json.dumps({k: s[k] for k in SHOW if k in s})[:300])
        for j, (_, s) in enumerate(lb[len(la):]):
            print(f'    only in the second run, #{len(la) + j + 1}: ' + json.dumps({k: s[k] for k in SHOW if k in s})[:300])
    print(f'RESULT: {same} paired document(s) identical; see the lines above for every difference')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
