import json, subprocess, sys, importlib.util
S = sys.argv[1]; POL = sys.argv[2]; D = sys.argv[3]
spec = importlib.util.spec_from_file_location('reg', S + '/tools/regression.py'); reg = importlib.util.module_from_spec(spec); spec.loader.exec_module(reg)
meta = json.load(open(D + '/meta.json'))
def eng(pdf, mrf):
    out = subprocess.run(['node', S + '/tools/guardian_math/case.mjs', POL, pdf, mrf], capture_output=True, text=True, check=True)
    return json.loads(out.stdout.strip().splitlines()[-1])
rows = []
for pdname, label in (('PD.json', 'EF 81.6 t/TJ, no non-CO2 (as verified)'), ('PD_ipcc.json', 'VMR0015 s9.1 IPCC wood 112 + 9.46 t/TJ')):
    for mode in ('ecoli', 'nonfunctional'):
        tot_e = tot_h = 0
        for v in meta['vintages']:
            y = v['vintage'][:4]; mrf = f'{D}/MR_{y}_{mode}.json'
            g = eng(f'{D}/{pdname}', mrf)
            h = reg.expected_mr(json.load(open(f'{D}/{pdname}')), json.load(open(mrf)))
            tot_e += g['mr']; tot_h += h
            rows.append(dict(fuel=label, m_reading=mode, vintage=v['vintage'], verified_ER=v['ER'], engine_ER=round(g['mr'], 3), hand_ER=round(h, 3), flags=(g['flags'] or '')[:400], pd_ER=round(g['pd'], 3)))
        rows.append(dict(fuel=label, m_reading=mode, vintage='TOTAL', verified_ER=28879, engine_ER=round(tot_e, 3), hand_ER=round(tot_h, 3)))
json.dump(rows, open(D + '/results.json', 'w'), indent=1)
for r in rows: print(f"{r['fuel'][:38]:38s} {r['m_reading']:13s} {r['vintage']:24s} verified {r['verified_ER']:>7} engine {r['engine_ER']:>12} hand {r['hand_ER']:>12}")
