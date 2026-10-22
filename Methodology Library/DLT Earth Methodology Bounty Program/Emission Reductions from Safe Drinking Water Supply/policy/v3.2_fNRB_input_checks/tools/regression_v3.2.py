"""VMR0015 v3.2 regression (the v3.1 tools/regression.py plus the corrected fNRB rule and 5 fNRB cases): runs the policy's own mathBlock code on the sample PD/MR and on edge-case variants, and compares
each result with an independent Python implementation of VMR0015 Eq.(1), AMS-III.AV Eq.(2)-(7), TOOL03, VT0010 and the
CDM sampling rules (written from the methodology text, not from the policy code).

Engine: if tools/guardian_math has been installed (cd tools/guardian_math && npm install), the mathBlocks run through
Guardian's own math-model (policy-service/src/policy-engine/helpers/math-model, copied from the Guardian repository),
the same code path as the math worker on MGS: declared formulas evaluated by the compute engine, then the block code.
Otherwise the block code runs in a plain Node Function (formulas not evaluated).

Usage (from the package root):
        python3 policy/v3.2_fNRB_input_checks/tools/regression_v3.2.py <policy.json or .policy> <PD.full.json> <MR.full.json>
        It uses the package's tools/guardian_math when that is installed (cd tools/guardian_math && npm install).
Needs:  node on PATH. Exit code 1 if any case fails.
"""
import json, sys, copy, subprocess, zipfile, os, tempfile, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
GUARDIAN = os.path.join(HERE, 'guardian_math')
if not os.path.isdir(GUARDIAN):   # this copy lives in policy/v3.2_fNRB_input_checks/tools: use the package's tools/guardian_math
    GUARDIAN = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'tools', 'guardian_math'))
PLAIN_JS = r"""
const fs = require('fs');
const [pol, pdp, mrp] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(pol, 'utf8')); const code = {};
(function w(b) { if (b.blockType === 'mathBlock') code[b.tag] = b.expression.code; (b.children || []).forEach(w); })(P.config);
const pd = JSON.parse(fs.readFileSync(pdp, 'utf8')), mr = JSON.parse(fs.readFileSync(mrp, 'utf8'));
const a = new Function('document','relationships','scope','result', code['pp_err_calculation_pd_vcs_ex_ante'])(pd, [], undefined, {});
const b = new Function('document','relationships','scope','result', code['pp_err_calculation_mr_vcs_ex_post'])(mr, [{document: pd}], undefined, {});
console.log(JSON.stringify({engine: 'plain-node', pd: a.ex_ante.maxAnnualER, pdflags: a.dataQualityFlags, mr: b.ER_final_total, flags: b.dataQualityFlags}));
"""


def load_policy(p):
    if p.endswith('.json'):
        return p
    d = tempfile.mkdtemp()
    with zipfile.ZipFile(p) as z:
        open(d + '/policy.json', 'wb').write(z.read('policy.json'))
    return d + '/policy.json'


def engine(pol, pd, mr):
    d = tempfile.mkdtemp()
    json.dump(pd, open(d + '/pd.json', 'w')); json.dump(mr, open(d + '/mr.json', 'w'))
    if os.path.exists(os.path.join(GUARDIAN, 'node_modules', '@cortex-js')) and os.path.exists(os.path.join(GUARDIAN, 'dist')):
        cmd = ['node', os.path.join(GUARDIAN, 'case.mjs'), pol, d + '/pd.json', d + '/mr.json']
    else:
        open(d + '/e.js', 'w').write(PLAIN_JS)
        cmd = ['node', d + '/e.js', pol, d + '/pd.json', d + '/mr.json']
    out = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(out.stdout.strip().splitlines()[-1])


# ---------------- independent implementation (hand formulas from the methodology text) ----------------
def pv(o, k, d=0.0):
    v = (o or {}).get(k)
    if isinstance(v, dict):
        x = v.get('value')
        return d if x is None or x == '' else x
    return d


def survey(pd, sid=None):
    """VMR0015 s8.1 fn 3 (eta_wb weighted by weekly boils), AMS-III.AV Eq.(1) X_boil (share of persons who boil);
    sid given: that section's own survey rows (VMR0015 s9.3(2), section by section)"""
    wb = we = pa = pb = rows = 0
    for s in pd['methodologyRecords']['sections']:
        if sid is not None and s['sectionId'] != sid:
            continue
        for h in s.get('baselineSurvey') or []:
            rows += 1
            pa += h.get('persons') or 0
            if h.get('boilsDrinkingWater') is True:
                pb += h.get('persons') or 0
            for u in h.get('deviceUse') or []:
                w, e = u.get('weeklyBoils') or 0, u.get('eta_d')
                if w > 0 and e is not None and 0 < e <= 1:
                    wb += w; we += w * e
    return (we / wb if rows and wb else None), (pb / pa if rows and pa else None)


def sec_xb(pd, sid=None):
    a21 = pd['appendix2']['a21_1']
    eta_s, xb_s = survey(pd)
    if sid is not None:                                                          # a section with its own survey rows uses them
        e1, x1 = survey(pd, sid)
        eta_s = e1 if e1 is not None else eta_s
        xb_s = x1 if x1 is not None else xb_s
    eta = eta_s if eta_s is not None else pv(a21, 'eta_wb')
    xb = xb_s if xb_s is not None else pv(a21, 'X_boil')
    if str(a21.get('secEquation', '')).startswith('Eq.(4)'):                     # AMS-III.AV Eq.(4)
        sec = (pv(a21, 'WH', 4.186) * (pv(a21, 'T_f', 100) - pv(a21, 'T_i', 20)) + 0.01 * pv(a21, 'WHE', 2260)) / eta
    else:
        sec = 357.48 / eta                                                       # AMS-III.AV Eq.(5)
    return sec, xb


def adj_le(pd):
    la = pd['methodologyRecords'].get('leakageAdjustment') or {}
    if str(la.get('option', '')).startswith('Survey'):
        return la.get('adjLeSurvey', 0.95)
    if la.get('option'):
        return 0.95                                                              # AMS-I.E default; another typed value is not used
    return pv(pd['appendix2'].get('a21_5'), 'Adj_LE', 0.95)


def fnrb_map(dets):
    # VMR0015 s9.2 ("one of the following sources must be used"): each determination gives fNRB from the source of its own option.
    # Option 1 = the UNFCCC value; option 2 = TOOL30 x (1 - 0.26); option 3 = the TOOL33 value. A typed "f_NRB applied" that differs
    # does not replace the source value. For options 1 and 3 it is used only when the source value is missing. No value -> 0.
    out = {}
    for f in dets or []:
        opt = str(f.get('option', ''))
        if opt.startswith('Option 2'):
            nrb, rb = f.get('tool30NRB') or 0, f.get('tool30RB') or 0
            v = (nrb / (nrb + rb) if nrb + rb > 0 else (f.get('tool30Value') or 0)) * (1 - 0.26)
        elif opt.startswith('Option 1') or opt.startswith('Option 3'):
            v = (f.get('unfcccValue') if opt.startswith('Option 1') else f.get('tool33Value')) or 0
            if not v > 0:
                v = f.get('fNRBApplied') or 0
        else:
            v = 0
        if f.get('fuelType'):
            out[f['fuelType']] = v if v > 0 else 0.0
    return out


def ie_factor(*lists, kinds=('Baseline survey',)):
    """VMR0015 s9.3(1): survey results on interactive effects applied proportionally: BE x (1 - households with an effect / households surveyed);
    the largest share among the surveys is applied"""
    share = 0.0
    for k, lst in zip(kinds, lists):
        for r in lst or []:
            if str(r.get('surveyType', '')).startswith(k) and (r.get('householdsSurveyed') or 0) > 0:
                share = max(share, min(r.get('householdsWithInteractiveEffect') or 0, r['householdsSurveyed']) / r['householdsSurveyed'])
    return 1 - share


def fuel_sum(fuels, fm):
    t = 0.0
    for f in fuels:
        fn = 1.0 if f.get('fuelCategory') == 'Fossil fuel' else fm.get(f['fuelType'], f.get('fNRB', 0))
        t += f['BL_fuel'] * (f['EF_CO2'] * fn + f['EF_nonCO2'])                 # VMR0015 Eq.(1) inner term
    return t


def coef(r):
    """TOOL03 Eq.(2)-(4) for one fuel row"""
    g = lambda k: r.get(k) or 0
    opt = str(r.get('tool03Option', ''))
    use_a = opt.startswith('Option A') or (not opt.startswith('Option B') and g('w_C_i_y') > 0)
    vol = str(r.get('fcMeasuredIn', '')).startswith('Volume')
    return g('w_C_i_y') * (g('rho_i_y') if vol else 1) * 44 / 12 if use_a else g('NCV_i_y') * g('EF_CO2_i_y')


def pe_ff(a2):
    """TOOL03 Eq.(1)-(4); with the per-fuel table: Eq.(1) summed over fuels i and sources j"""
    a2 = a2 or {}
    if a2.get('fuelCombustionRows'):
        return sum((r.get('FC_i_j_y') or 0) * coef(r) for r in a2['fuelCombustionRows'])
    fc, wc, rho, ncv, ef = pv(a2, 'FC_i_j_y'), pv(a2, 'w_C_i_y'), pv(a2, 'rho_i_y'), pv(a2, 'NCV_i_y'), pv(a2, 'EF_CO2_i_y')
    opt = str(a2.get('tool03Option', ''))
    use_a = opt.startswith('Option A') or (not opt.startswith('Option B') and wc > 0)
    vol = str(a2.get('fcMeasuredIn', '')).startswith('Volume')
    return fc * (wc * (rho if vol else 1) * 44 / 12 if use_a else ncv * ef)


def pe_ec(a21_3, a3):
    """VT0010 v1.1 Eq.(5), (7)-(9), (11), (13), (14)"""
    a21_3, a3 = a21_3 or {}, a3 or {}
    if a3.get('gridLoadRows') or a3.get('sharedPlantFuelRows'):                  # per load L (Eq.(5),(7)-(9)) and per plant n / fuel f (Eq.(11),(13),(14))
        pe = 0.0
        for r in a3.get('gridLoadRows') or []:
            g = lambda k: r.get(k) or 0
            efa = r['EF_PE_A_L'] if r.get('EF_PE_A_L') not in (None, '') else pv(a21_3, 'EF_PE_A_L')
            ecb = min(g('EC_Grid_L'), g('EG_PBWA') / (1 + g('TDL_PE_B'))) if g('EG_PBWA') > 0 else 0.0
            pe += (g('EC_Grid_L') - ecb) * efa * (1 + g('TDL_PE_A_L')) + ecb * g('EF_PE_B') * (1 + g('TDL_PE_B'))
        plants = {}
        for r in a3.get('sharedPlantFuelRows') or []:
            plants.setdefault(r.get('plantId', ''), []).append(r)
        for rs in plants.values():
            p0 = rs[0]; g = lambda k: p0.get(k) or 0
            e = sum((f.get('Q_n_f') or 0) * (f.get('NCV_f') or 0) for f in rs)
            c = sum((f.get('Q_n_f') or 0) * (f.get('NCV_f') or 0) * (f.get('EF_CO2_f') or 0) for f in rs)
            if e > 0 and c > 0 and g('EG_n') > 0:
                h = g('HG_n') / (e * g('eta_cogen_n')) if g('HG_n') > 0 and g('eta_cogen_n') > 0 else 0.0
                ef = c / g('EG_n') * (1 - min(max(h, 0), 1))
            else:
                ef = g('EF_PE_SPP_n')
            pe += g('EC_PE_SPP_n') * ef
        return pe
    ecg, efa, tdla = pv(a3, 'EC_Grid_L'), pv(a21_3, 'EF_PE_A_L'), pv(a3, 'TDL_PE_A_L')
    egp, tdlb, efb = pv(a3, 'EG_PBWA'), pv(a3, 'TDL_PE_B'), pv(a3, 'EF_PE_B')
    ecb = min(ecg, egp / (1 + tdlb)) if egp > 0 else 0.0                       # Eq.(9) needs EG_PBWA; no typed EC_PE,B
    eca = ecg - ecb                                                               # Eq.(7)
    pe = eca * efa * (1 + tdla) + ecb * efb * (1 + tdlb)                          # Eq.(5) + Eq.(8)
    q, ncv, efc, eg = pv(a3, 'Q_n_f'), pv(a3, 'NCV_f'), pv(a3, 'EF_CO2_f'), pv(a3, 'EG_n')
    efs = pv(a3, 'EF_PE_SPP_n')
    if q > 0 and ncv > 0 and efc > 0 and eg > 0:
        hg, eta = pv(a3, 'HG_n'), pv(a21_3, 'eta_cogen_n')
        h = hg / (q * ncv * eta) if hg > 0 and eta > 0 else 0.0                  # Eq.(14)
        efs = q * ncv * efc / eg * (1 - h)                                        # Eq.(13)
    return pe + pv(a3, 'EC_PE_SPP_n') * efs                                       # Eq.(11)


def expected_pd(pd):
    ale, fm = adj_le(pd), fnrb_map(pd['methodologyRecords'].get('fnrbDeterminations'))
    ief = ie_factor(pd['methodologyRecords'].get('interactiveEffectsSurvey'))
    be = 0.0
    for s in pd['methodologyRecords']['sections']:
        P, opt = s.get('P_y', 0), str(s.get('qpwOption', ''))
        if opt.startswith('Option 1'):
            Q = s.get('qpwEstimate', 0)
        elif opt.startswith('Option 2.1'):
            Q = s['q_i'] * s['t_estimate'] * s['functionalUnits']                 # AMS-III.AV Eq.(2)
        else:
            days = min(s['presenceDaysPerYear'], 365) if (s.get('presenceDaysPerYear') or 0) > 0 else 365
            Q = P * min(s['QPW_pp'], 5.5) * days                                  # AMS-III.AV Eq.(3)
        Q = min(Q, P * 5.5 * 365)                                                 # para 18 cap
        sec, xb = sec_xb(pd, s['sectionId'])                                      # VMR0015 s9.3(2)
        be += Q * s['m_estimate'] * xb * sec * fuel_sum(s['baselineFuels'], fm) * 1e-9 * ale * ief
    a = pd['appendix2']
    return max(0.0, be - (pe_ec(a.get('a21_3'), a.get('a22_3')) + pe_ff(a.get('a22_2'))))  # Eq.(6), Eq.(7); a negative estimate is reported as 0


def expected_mr(pd, mr):
    ale = adj_le(pd)
    ief = ie_factor(mr['methodologyRecords'].get('interactiveEffectsSurvey'),
                    (mr['methodologyRecords'].get('interactiveEffectsSurvey') or []) + (pd['methodologyRecords'].get('interactiveEffectsSurvey') or []),
                    kinds=('Project survey', 'Baseline survey'))
    fm = fnrb_map(mr['methodologyRecords'].get('fnrbDeterminations') or pd['methodologyRecords'].get('fnrbDeterminations'))
    try:
        d0 = datetime.date.fromisoformat(mr['monitoringPeriodStart'][:10]); d1 = datetime.date.fromisoformat(mr['monitoringPeriodEnd'][:10])
        days = (d1 - d0).days + 1
    except Exception:
        d0 = d1 = None
        days = mr['methodologyRecords']['periodDays']
    pe = pe_ec(pd['appendix2'].get('a21_3'), mr['appendix2'].get('a22_3')) + pe_ff(mr['appendix2'].get('a22_2'))
    psecs = {s['sectionId']: s for s in pd['methodologyRecords']['sections']}
    rows = []
    for s in mr['methodologyRecords']['sections']:
        ps = psecs.get(s['sectionId'])
        if ps is None:
            rows.append((0.0, 1, 1, 1, 0.0, 0, 0)); continue
        P = s.get('P_y') or 0
        xpd = 0                                                                   # table 13: excluded from the date of supply onwards
        for n in s.get('networkChecks', []):
            if not n['networkExists']:
                continue
            dx = days
            if n.get('dateOfSupply') and d0 and d1:
                ds = datetime.date.fromisoformat(n['dateOfSupply'][:10])
                if ds > d0:
                    dx = 0 if ds > d1 else (d1 - ds).days + 1
            xpd += n.get('personsConnected', 0) * min(dx, days)
        Px = min(xpd, P * days) / days
        opt = str(s.get('qpwOption', '') or ps.get('qpwOption', ''))
        if opt.startswith('Option 2.2'):                                          # AMS-III.AV Eq.(3); SSC_792/795 presence days
            Q = sum(w['P_y'] * min(w['QPW_pp'], 5.5) * (min(w['presenceDays'], days) if (w.get('presenceDays') or 0) > 0 else days) for w in s.get('waterQuantityOpt22', []))
        elif opt.startswith('Option 2.1'):                                        # AMS-III.AV Eq.(2)
            Q = sum(w['q_i'] * w['t_hours'] for w in s.get('waterQuantityOpt21', []))
        else:                                                                     # option 1, AMS-III.AV table 10
            recs = s.get('waterQuantityOpt1', [])
            basis = lambda w: str(w.get('samplingBasis') or '')
            cont = [w for w in recs if basis(w).startswith('Statistically valid sample, metered continuously')]
            repr_ = [w for w in recs if basis(w).startswith('Statistically valid sample, metered over a representative period')]
            full = [w for w in recs if w not in cont and w not in repr_]
            if (cont or repr_) and (full or (cont and repr_)):
                Q = 0                                                             # one sampling basis per section
            elif cont:
                Q = sum(w['measuredVolume'] for w in cont) * s['appliancesInService'] / sum(w['appliancesCovered'] for w in cont)
            elif repr_:
                ad_in = s.get('applianceDaysInService') or s['appliancesInService'] * days
                Q = sum(w['measuredVolume'] for w in repr_) / sum(w['appliancesCovered'] * w['daysMeasured'] for w in repr_) * ad_in
            else:
                Q = sum(w['measuredVolume'] for w in full)
        Q = Q * (P - Px) / P if P else 0
        Q = min(Q, (P - Px) * 5.5 * days)                                         # para 18 cap, pro-rated
        ch = s.get('functionalityChecks', [])
        tested = [c for c in ch if c.get('ecoliCfu') is not None]
        ok = lambda c: c.get('ldlCfu', 1) <= 1 and c['ecoliCfu'] < 1
        m = sum(1 for c in tested if c['meetsTechStandard'] and c['operatingOrReplaced'] and ok(c)) / len(ch) if ch else 0
        fail = sum(1 for c in tested if not ok(c)) / len(tested) if tested else 1
        wq = 0 if fail > 0.10 else 1                                              # table 11 gate
        sdw = 0 if any(not w['meetsStandard'] for w in s.get('waterQualityChecks', [])) else 1  # table 14
        disc, samp = 0.0, 1
        for r in s.get('samplingResults', []):
            n, Np = r['sampleSize'], r.get('populationSize', 0)
            if r['parameter'] == 'm' and n < (Np if 0 < Np < 30 else 30): samp = 0
            if r.get('confidenceTargetPct', 90) < 90: samp = 0
            att, tgt = r['attainedPrecisionPct'], min(r.get('precisionTargetPct', 10), 10)
            if att > tgt:
                if r['surveyYearInCP'] <= 2 and att <= 15: disc = max(disc, 3 * (att - tgt) / 100)
                else: samp = 0
        sec, xb = sec_xb(pd, s['sectionId'])                                      # VMR0015 s9.3(2): section by section
        be = Q * m * xb * sec * fuel_sum(ps['baselineFuels'], fm) * 1e-9 * ale * ief  # VMR0015 Eq.(1) x s9.3(1)
        rows.append((be, wq, sdw, samp, disc, len(tested), sum(1 for c in tested if not ok(c))))
    nt, nf = sum(r[5] for r in rows), sum(r[6] for r in rows)
    proj = 0 if nt and nf / nt > 0.10 else 1                                     # table 11: over 10 % of appliances in the project activity
    t14 = 0 if any(r[2] == 0 for r in rows) else 1                               # table 14: a failed check voids the period
    elig = [r[0] * r[1] * r[2] * r[3] * proj * t14 for r in rows]
    bee = sum(elig)
    if bee <= 0:
        return 0.0
    er = 0.0
    for e, r in zip(elig, rows):
        er += max(0.0, (e - pe * e / bee) * (1 - r[4]))                           # Eq.(7): PE deducted in full from the eligible BE
    return er


def case(name, mut=None, pdmut=None, expect_zero=False, flag=None, pd_check=False):
    return (name, mut, pdmut, expect_zero, flag, pd_check)


def setp(path, val):
    def f(d):
        o = d
        for k in path[:-1]:
            o = o[k]
        o[path[-1]] = val
    return f


S0 = ['methodologyRecords', 'sections', 0]
CHARCOAL_DET = {'determinationId': 'FNRB-2', 'fuelType': 'Charcoal', 'option': 'Option 3 - latest TOOL33 default (national Table 3 / regional Table 2)', 'tool33Value': 0.62, 'tool33Table': 'Table 3 - national default', 'countryOrRegion': 'United Republic of Tanzania', 'fNRBApplied': 0.62, 'validFrom': '2027-01-01', 'validTo': '2031-12-31'}
def CHARCOAL_PD(d):
    s = d['methodologyRecords']['sections'][0]
    s['baselineFuels'][0]['BL_fuel'] = 0.50
    s['baselineFuels'].append({'fuelId': 'F2', 'fuelCategory': 'Non-renewable biomass (woody biomass or charcoal)', 'fuelType': 'Charcoal', 'baselineDeviceType': s['baselineFuels'][0]['baselineDeviceType'], 'BL_fuel': 0.35, 'EF_CO2': 165.22, 'EF_nonCO2': 44.83, 'EF_source': '3 - IPCC default (values printed in VMR0015 s9.1)', 'fNRB': 0.62, 'fNRBDeterminationRef': 'FNRB-2'})
    d['methodologyRecords']['fnrbDeterminations'].append(dict(CHARCOAL_DET))
def CHARCOAL_MR(d):
    d['methodologyRecords']['fnrbDeterminations'].append(dict(CHARCOAL_DET))
def OPT2_MR(d):
    f = d['methodologyRecords']['fnrbDeterminations'][0]
    f.update(option='Option 2 - TOOL30 calculated value x (1 - 0.26)', tool30NRB=74, tool30RB=26, tool30Value=0.74, fNRBApplied=0.5476)
def DAYSCHOOL_MR(d):
    s = d['methodologyRecords']['sections'][2]
    s['qpwOption'] = 'Option 2.2 - population x volume per person (AMS-III.AV Eq.(3))'
    s['P_y'] = 1200
    s['waterQuantityOpt22'] = [{'surveyRef': 'SCH-2027', 'P_y': 1200, 'QPW_pp': 9 / 16 * 3, 'presenceDays': 190}]
def A2(**kw):
    return {k: {'value': v} for k, v in kw.items()}
def TOOL03(**kw):
    def f(d):
        a = d['appendix2'].setdefault('a22_2', {})
        for k, v in kw.items():
            a[k] = v if k in ('tool03Option', 'fcMeasuredIn') else {'value': v}
    return f
def SURVEY_PD(d):
    # three surveyed households per section (4, 6 and 5 persons); the first two boil drinking water 7 times a week on a three-stone fire (0.10)
    # and 3 times on an improved cookstove (0.35): eta_wb = (7 x 0.10 + 3 x 0.35) / 10 = 0.175 (the VMR0015 footnote 3 example); X_boil = 10 / 15
    for s in d['methodologyRecords']['sections']:
        s['baselineSurvey'] = [
            {'householdId': s['sectionId'] + '-H1', 'persons': 4, 'boilsDrinkingWater': True, 'deviceUse': [{'deviceType': 'Three-stone fire', 'eta_d': 0.10, 'weeklyBoils': 7}, {'deviceType': 'Improved cookstove', 'eta_d': 0.35, 'weeklyBoils': 3}]},
            {'householdId': s['sectionId'] + '-H2', 'persons': 6, 'boilsDrinkingWater': True, 'deviceUse': [{'deviceType': 'Three-stone fire', 'eta_d': 0.10, 'weeklyBoils': 7}, {'deviceType': 'Improved cookstove', 'eta_d': 0.35, 'weeklyBoils': 3}]},
            {'householdId': s['sectionId'] + '-H3', 'persons': 5, 'boilsDrinkingWater': False, 'deviceUse': []}]
def OPT21_PD(d):
    s = d['methodologyRecords']['sections'][1]
    s.update(qpwOption='Option 2.1 - capacity x usage time (AMS-III.AV Eq.(2))', q_i=1.0, t_estimate=1460, functionalUnits=750)
def OPT22_PD(d):
    s = d['methodologyRecords']['sections'][2]
    s.update(qpwOption='Option 2.2 - population x volume per person (AMS-III.AV Eq.(3))', QPW_pp=3.0)
def OPT21_MR(d):
    s = d['methodologyRecords']['sections'][1]
    s['qpwOption'] = 'Option 2.1 - capacity x usage time (AMS-III.AV Eq.(2))'
    s['waterQuantityOpt21'] = [{'unitId': 'Z2-%03d' % i, 'q_i': 1.0, 't_hours': 1400 + i} for i in range(1, 6)]
def SECTION_SURVEY_PD(d):
    # VMR0015 s9.3(2): zone 1 households use a three-stone fire only (eta 0.10), 4 of 10 persons boil; zone 2 households an improved cookstove
    # only (eta 0.35), all 5 persons boil; zones 3 and 4 have no survey rows and take the values of the whole survey
    ss = d['methodologyRecords']['sections']
    ss[0]['baselineSurvey'] = [{'householdId': 'S1-H1', 'persons': 4, 'boilsDrinkingWater': True, 'deviceUse': [{'deviceType': 'Three-stone fire', 'eta_d': 0.10, 'weeklyBoils': 7}]},
                               {'householdId': 'S1-H2', 'persons': 6, 'boilsDrinkingWater': False, 'deviceUse': []}]
    ss[1]['baselineSurvey'] = [{'householdId': 'S2-H1', 'persons': 5, 'boilsDrinkingWater': True, 'deviceUse': [{'deviceType': 'Improved cookstove', 'eta_d': 0.35, 'weeklyBoils': 7}]}]
SAMPLE_REC = lambda basis, vol, n, days=None: dict({'unitId': 'Z3-SAMPLE', 'measurementMethod': 'Flow meter', 'measuredVolume': vol, 'samplingBasis': basis, 'appliancesCovered': n}, **({'daysMeasured': days} if days else {}))
CONT = 'Statistically valid sample, metered continuously (AMS-III.AV table 10(a), first option)'
REPR = 'Statistically valid sample, metered over a representative period (AMS-III.AV table 10(a), second option)'
def OPT1_CONT_MR(d):
    s = d['methodologyRecords']['sections'][2]
    s['waterQuantityOpt1'] = [SAMPLE_REC(CONT, 300000, 75)]; s['appliancesInService'] = 750
def OPT1_REPR_MR(d):
    s = d['methodologyRecords']['sections'][2]
    s['waterQuantityOpt1'] = [SAMPLE_REC(REPR, 54000, 75, 60)]; s['appliancesInService'] = 750
    s['samplingResults'].append({'parameter': 'QPW_y', 'confidenceTargetPct': 90, 'precisionTargetPct': 10, 'sampleSize': 75, 'populationSize': 750, 'attainedPrecisionPct': 8, 'surveyYearInCP': 1})
def OPT1_MIX_MR(d):
    s = d['methodologyRecords']['sections'][2]
    s['waterQuantityOpt1'].append(SAMPLE_REC(CONT, 300000, 75)); s['appliancesInService'] = 750
def TOOL03_ROWS(d):
    d['appendix2'].setdefault('a22_2', {})['fuelCombustionRows'] = [
        {'sourceId': 'G1', 'sourceType': 'Dedicated power plant supplying the project (VT0010 Scenario D1 off-grid or D2 back-up; VT0010 s5.4.1.1 uses TOOL03)', 'fuelType': 'Diesel', 'tool03Option': 'Option B - net calorific value x CO2 emission factor (TOOL03 Eq.(4))', 'fcMeasuredIn': 'Mass unit', 'FC_i_j_y': 0.2, 'NCV_i_y': 43, 'EF_CO2_i_y': 0.0741},
        {'sourceId': 'P1', 'sourceType': 'Fossil fuel used directly by the water purification system', 'fuelType': 'Diesel', 'tool03Option': 'Option A - carbon mass fraction (TOOL03 Eq.(2) mass unit, Eq.(3) volume unit)', 'fcMeasuredIn': 'Volume unit', 'FC_i_j_y': 0.3, 'w_C_i_y': 0.86, 'rho_i_y': 0.84}]
def VT0010_ROWS(d):
    a = d['appendix2']['a22_3']
    a['gridLoadRows'] = [{'loadId': 'L1', 'EC_Grid_L': 2.0, 'TDL_PE_A_L': 0.2},
                         {'loadId': 'L2', 'EC_Grid_L': 1.5, 'TDL_PE_A_L': 0.2, 'EG_PBWA': 1.0, 'TDL_PE_B': 0.03, 'EF_PE_B': 0.0}]
    a['sharedPlantFuelRows'] = [{'plantId': 'SPP1', 'EC_PE_SPP_n': 0.8, 'EG_n': 1.2, 'fuelType': 'Diesel', 'Q_n_f': 0.2, 'NCV_f': 43, 'EF_CO2_f': 0.0741},
                                {'plantId': 'SPP1', 'fuelType': 'Heavy fuel oil', 'Q_n_f': 0.1, 'NCV_f': 40.4, 'EF_CO2_f': 0.0774}]
    for k in ('EC_Grid_L',):
        if k in a: a[k] = {'value': 0}
CASES = [
    case('reference sample (4 zones)'),
    case('E. coli failures 12% in zone 1 -> zone 1 not credited, its PE share still deducted', lambda d: [c.update(ecoliCfu=5) for c in d['methodologyRecords']['sections'][0]['functionalityChecks'][7:17]]),
    case('E. coli failures 40% in zones 1 and 2 -> over 10% of the project, nothing credited', lambda d: [c.update(ecoliCfu=5) for s in d['methodologyRecords']['sections'][:2] for c in s['functionalityChecks'][7:45]], expect_zero=True, flag='project: '),
    case('working appliance without an E. coli result -> not passing in m, flagged', lambda d: d['methodologyRecords']['sections'][0]['functionalityChecks'][10].update(ecoliCfu=None), flag='working appliance(s) of 100 checked have no E. coli result'),
    case('table 14 check failed in zone 2 -> period voided (project activity fails)', setp(['methodologyRecords', 'sections', 1, 'waterQualityChecks', 0, 'meetsStandard'], False), expect_zero=True, flag='project: a table 14 water-quality check failed'),
    case('public network supplies 739 persons in zone 1 -> excluded (table 13)', setp(S0 + ['networkChecks'], [{'checkDate': '2027-11-15', 'networkExists': True, 'personsConnected': 739, 'householdsConnected': 188}])),
    case('cap: zone 3 volume 9 million L (> 5.5 L/person/day)', setp(['methodologyRecords', 'sections', 2, 'waterQuantityOpt1', 0, 'measuredVolume'], 9000000)),
    case('sampling 12% attained, survey year 1 -> 6% discount on zone 1', setp(S0 + ['samplingResults', 0, 'attainedPrecisionPct'], 12)),
    case('sampling 12% attained, survey year 3 -> zone 1 not credited until resampled (para 18(a),(c))', lambda d: d['methodologyRecords']['sections'][0]['samplingResults'][0].update(attainedPrecisionPct=12, surveyYearInCP=3)),
    case('sample of 25 for m -> zone 1 not credited', setp(S0 + ['samplingResults', 0, 'sampleSize'], 25)),
    case('section id not in PD -> that section not credited, flagged', setp(S0 + ['sectionId'], 'S9')),
    case('typed periodDays 300 vs dates of 365 days -> dates win, flagged', setp(['methodologyRecords', 'periodDays'], 300)),
    case('half-year period (181 days) -> 5.5 L cap pro-rated and binding', lambda d: (d.update(monitoringPeriodEnd='2027-06-30'), d['methodologyRecords'].update(periodDays=181))),
    case('VT0010 shared plant, no cogeneration (Eq.13)', lambda d: d['appendix2']['a22_3'].update(EC_PE_SPP_n={'value': 1.5}, Q_n_f={'value': 0.3}, NCV_f={'value': 43.0}, EF_CO2_f={'value': 0.0741}, EG_n={'value': 1.0})),
    case('VT0010 shared plant with cogeneration heat (Eq.13-14)', lambda d: d['appendix2']['a22_3'].update(EC_PE_SPP_n={'value': 1.5}, Q_n_f={'value': 0.3}, NCV_f={'value': 43.0}, EF_CO2_f={'value': 0.0741}, EG_n={'value': 1.0}, HG_n={'value': 3.0}),
         pdmut=lambda d: d['appendix2']['a21_3'].update(eta_cogen_n={'value': 0.8})),
    case('Appendix 2 fNRB (MR) 0.70 vs records 0.62 -> flagged, ER unchanged', lambda d: d['appendix2']['a22_4']['f_NRB_i_y'].update(value=0.70), flag='Appendix 2 A2.2.4 fNRB states 0.7'),
    case('Appendix 2 m (PD) 0.90 vs sections 0.95 -> flagged, ER unchanged', pdmut=lambda d: d['appendix2']['a22_1']['m'].update(value=0.90), flag='Appendix 2 A2.2.1 m states 0.9'),
    case('table 14 fails in all 4 sections -> ER 0, not negative, flagged', lambda d: [w.update(meetsStandard=False) for s in d['methodologyRecords']['sections'] for w in s['waterQualityChecks']], expect_zero=True, flag='project emissions of 1.324512 t CO2e are not offset'),
    case('fNRB typed 6.2 instead of 0.62 (MR) -> voided, value listed', lambda d: d['methodologyRecords']['fnrbDeterminations'][0].update(fNRBApplied=6.2), expect_zero=True, flag='fNRB Woody biomass applied = 6.2'),
    case('eta_wb typed 15 instead of 0.15 (PD) -> voided, value listed', pdmut=lambda d: d['appendix2']['a21_1']['eta_wb'].update(value=15), expect_zero=True, flag='A2.1.1 eta_wb = 15'),
    case('baseline fuel shares add up to 1.2 (PD) -> voided', pdmut=lambda d: d['methodologyRecords']['sections'][0]['baselineFuels'][0].update(BL_fuel=1.2), expect_zero=True, flag='BL_fuel = 1.2'),
    case('negative metered volume (MR) -> voided', setp(['methodologyRecords', 'sections', 0, 'waterQuantityOpt1', 0, 'measuredVolume'], -5), expect_zero=True, flag='measured volume = -5'),
    case('applicability para 4(c) marked Not met (PD) -> methodology does not apply, voided', pdmut=lambda d: d['section3']['applicabilityEligibility']['applicabilityConditions'].update(c4cReplacementAccess='Not met'), expect_zero=True, flag='applicability condition not met (para 4(c) replacement access)'),
    case('duplicate section id -> whole MR voided', setp(['methodologyRecords', 'sections', 1, 'sectionId'], 'S1'), expect_zero=True),
    case('two baseline fuels in zone 1 (wood 0.50 + charcoal 0.35, VMR0015 s9.1 defaults) -> Eq.(1) summed per fuel', CHARCOAL_MR, pdmut=CHARCOAL_PD, pd_check=True),
    case('fNRB option 2 (TOOL30 NRB 74 / RB 26, x 0.74) in the MR -> 0.5476 applied, flagged', OPT2_MR, flag='option 2 applies TOOL30 x 0.74'),
    case('day school in zone 3: option 2.2, 1,200 pupils, 9/16 x 3 L, 190 school days (SSC_792/795)', DAYSCHOOL_MR),
    case('VT0008 N_all 10, N_diff 2 (PD) -> common practice flagged, ER unchanged', pdmut=lambda d: d['methodologyRecords']['additionality'].update(N_all=10, N_diff=2), flag='VT0008 Step 4 common practice'),
    case('VT0008 benchmark: IRR 15 % without credits vs benchmark 14.15 % (PD) -> flagged, ER unchanged', pdmut=lambda d: d['methodologyRecords']['additionality'].update(investmentAnalysisApplied='Benchmark analysis', projectIRRPct=15, projectIRRWithCreditsPct=22, benchmarkIRRPct=14.15), flag='meets the benchmark'),
    # ---- added in the 19 Oct audit ----
    case('TOOL03 option A, mass unit: diesel 0.2 t, w_C 0.86 (MR, Eq.(2))', TOOL03(tool03Option='Option A - carbon mass fraction (TOOL03 Eq.(2) mass unit, Eq.(3) volume unit)', fcMeasuredIn='Mass unit', FC_i_j_y=0.2, w_C_i_y=0.86)),
    case('TOOL03 option A, volume unit: 0.3 m3, w_C 0.86, rho 0.84 (MR, Eq.(3))', TOOL03(tool03Option='Option A - carbon mass fraction (TOOL03 Eq.(2) mass unit, Eq.(3) volume unit)', fcMeasuredIn='Volume unit', FC_i_j_y=0.3, w_C_i_y=0.86, rho_i_y=0.84)),
    case('TOOL03 option B: 0.2 t, NCV 43 GJ/t, EF 0.0741 t CO2/GJ (MR, Eq.(4))', TOOL03(tool03Option='Option B - net calorific value x CO2 emission factor (TOOL03 Eq.(4))', fcMeasuredIn='Mass unit', FC_i_j_y=0.2, NCV_i_y=43, EF_CO2_i_y=0.0741)),
    case('TOOL03 option A in the PD (ex-ante, Eq.(1)-(2))', pdmut=TOOL03(tool03Option='Option A - carbon mass fraction (TOOL03 Eq.(2) mass unit, Eq.(3) volume unit)', fcMeasuredIn='Mass unit', FC_i_j_y=0.2, w_C_i_y=0.86), pd_check=True),
    case('VT0010 PBWA: 1.5 MWh from a wheeled solar plant, TDL 3 %, EF 0 (Eq.(7)-(9))', lambda d: d['appendix2']['a22_3'].update(A2(EG_PBWA=1.5, TDL_PE_B=0.03, EF_PE_B=0.0))),
    case('SEC by Eq.(4): T_i 25 C (PD switch to Eq.(4))', pdmut=lambda d: d['appendix2']['a21_1'].update(secEquation='Eq.(4) - project-specific T_i, WH, T_f or WHE', T_i={'value': 25}), pd_check=True),
    case('baseline survey rows: eta_wb 0.175 (VMR0015 fn 3 example), X_boil 10/15 -> survey values used, flagged', pdmut=SURVEY_PD, flag='differs from the baseline-survey usage-weighted value 0.175', pd_check=True),
    case('Adj_LE survey value 0.92 (PD leakage record)', pdmut=lambda d: d['methodologyRecords']['leakageAdjustment'].update(option='Survey-based value (90/30)', adjLeSurvey=0.92), pd_check=True),
    case('PD ex-ante: zone 2 option 2.1 (1 L/h x 1,460 h x 750 units), zone 3 option 2.2 (3 L)', pdmut=lambda d: (OPT21_PD(d), OPT22_PD(d)), pd_check=True),
    case('MR zone 2 option 2.1: five devices, q_i x t_hours (Eq.(2))', OPT21_MR),
    case('P_y missing in zone 4 (MR) -> cap 0, section earns nothing, flagged', setp(['methodologyRecords', 'sections', 3, 'P_y'], None), flag='population served P_y is missing or zero'),
    case('no functionality checks in zone 2 (MR) -> m = 0, flagged', setp(['methodologyRecords', 'sections', 1, 'functionalityChecks'], []), flag='no functionality checks recorded'),
    case('monitoring period ends after the crediting period (MR) -> flagged, ER unchanged', lambda d: d.update(monitoringPeriodStart='2031-07-01', monitoringPeriodEnd='2032-06-30'), flag='after the crediting period end'),
    # ---- added after the 19 Oct review (findings F5, F15) ----
    case('fNRB option 2 with no TOOL30 data (MR) -> fNRB 0 for that fuel, flagged (no fallback to the row value)', lambda d: d['methodologyRecords']['fnrbDeterminations'][0].update(option='Option 2 - TOOL30 calculated value x (1 - 0.26)', tool30NRB=None, tool30RB=None, tool30Value=None, fNRBApplied=None), flag='has no value for its own option'),
    case('fNRB option 1 with the applied value empty (PD) -> UNFCCC value 0.62 used', pdmut=lambda d: d['methodologyRecords']['fnrbDeterminations'][0].update(option='Option 1 - latest UNFCCC national default', fNRBApplied=None, unfcccValue=0.62), pd_check=True),
    case('PD project emissions above baseline (grid load 100,000 MWh) -> ex-ante ER 0, not negative, flagged', pdmut=lambda d: d['appendix2']['a22_3']['EC_Grid_L'].update(value=100000), flag='exceed baseline emissions', pd_check=True),
    case('fuel-row fNRB 0.70 vs fNRB determination 0.62 (PD) -> determination used, flagged', pdmut=lambda d: d['methodologyRecords']['sections'][0]['baselineFuels'][0].update(fNRB=0.70), flag='differs from the fNRB determination', pd_check=True),
    # ---- added for the gap closure of 20 Oct ----
    case('survey rows per section: zone 1 eta 0.10 / X_boil 0.4, zone 2 eta 0.35 / X_boil 1, zones 3-4 whole survey (VMR0015 s9.3(2))', pdmut=SECTION_SURVEY_PD, pd_check=True),
    case('interactive effects: 48 of 384 baseline households (PD) -> BE x 0.875 in the PD and the MR (VMR0015 s9.3(1))', pdmut=lambda d: d['methodologyRecords']['interactiveEffectsSurvey'][0].update(householdsWithInteractiveEffect=48, proportionApplied=12.5), flag='baseline emissions are reduced by that share', pd_check=True),
    case('interactive effects: 40 of 400 project-survey households (MR) -> BE x 0.9', lambda d: d['methodologyRecords']['interactiveEffectsSurvey'][0].update(householdsWithInteractiveEffect=40, proportionApplied=10), flag='baseline emissions are reduced by that share'),
    case('QPW option 1, continuous sample: 75 of 750 meters, 300,000 L -> x 750/75 (AMS-III.AV table 10(a)); no QPW_y sampling record flagged', OPT1_CONT_MR, flag='no sampling record for QPW_y'),
    case('QPW option 1, representative period: 75 meters x 60 days, 54,000 L -> x 750 x 365 appliance-days (table 10(a))', OPT1_REPR_MR),
    case('QPW option 1, a full-count record and a sample record in one section -> section not credited, flagged', OPT1_MIX_MR, flag='mix sampling bases'),
    case('table 13: public network supplies 739 persons in zone 1 from 1 July 2027 -> excluded for 184 of 365 days', setp(S0 + ['networkChecks'], [{'checkDate': '2027-11-15', 'networkExists': True, 'personsConnected': 739, 'householdsConnected': 188, 'dateOfSupply': '2027-07-01'}])),
    case('TOOL03 per-fuel table: back-up generator (VT0010 D2) option B + pump option A volume (MR, Eq.(1) summed over i, j)', TOOL03_ROWS),
    case('TOOL03 per-fuel table in the PD (ex-ante)', pdmut=TOOL03_ROWS, pd_check=True),
    case('VT0010 per-load and per-plant tables: two loads (one with PBWA), one shared plant with two fuels (MR, Eq.(5),(7)-(9),(11),(13))', VT0010_ROWS),
    case('Adj_LE default option with 0.90 typed (PD) -> 0.95 applied, flagged (VMR0015 s8.3)', pdmut=lambda d: d['methodologyRecords']['leakageAdjustment'].update(adjLeDefault=0.90), flag='the default 0.95 is applied', pd_check=True),
    # ---- v3.2: fNRB source precedence and the UNFCCC-value range check (VMR0015 s9.2) ----
    case('v3.2 fNRB option 3: applied 0.70 vs TOOL33 0.62 (MR) -> TOOL33 0.62 used, flagged', lambda d: d['methodologyRecords']['fnrbDeterminations'][0].update(fNRBApplied=0.70), flag='differs from the TOOL33 default value 0.62'),
    case('v3.2 fNRB option 1: applied 0.70 vs UNFCCC 0.62 (PD) -> UNFCCC 0.62 used, flagged', pdmut=lambda d: d['methodologyRecords']['fnrbDeterminations'][0].update(option='Option 1 - latest UNFCCC national default', unfcccValue=0.62, fNRBApplied=0.70), flag='differs from the UNFCCC national default value 0.62', pd_check=True),
    case('v3.2 fNRB option 1: UNFCCC value typed 62 (a percentage) (MR) -> voided, value listed', lambda d: d['methodologyRecords']['fnrbDeterminations'][0].update(option='Option 1 - latest UNFCCC national default', unfcccValue=62, fNRBApplied=None), expect_zero=True, flag='fNRB Woody biomass UNFCCC value = 62'),
    case('v3.2 fNRB option 3 with only the applied value (MR) -> applied 0.62 used, flagged', lambda d: d['methodologyRecords']['fnrbDeterminations'][0].update(tool33Value=None, fNRBApplied=0.62), flag='is not entered, so f_NRB applied 0.62 is used'),
    case('v3.2 fNRB option 2: applied 0.70 vs TOOL30 x 0.74 (MR) -> computed 0.444 used, flagged', lambda d: d['methodologyRecords']['fnrbDeterminations'][0].update(option='Option 2 - TOOL30 calculated value x (1 - 0.26)', tool30NRB=60, tool30RB=40, fNRBApplied=0.70), flag='differs from the TOOL30 value x 0.74 0.444'),
    case('EC_PE,B typed without EG_PBWA (MR) -> not used, whole load as grid electricity, flagged (VT0010 Eq.(9))', lambda d: d['appendix2']['a22_3'].update(EC_Grid_L={'value': 3.0}, EC_PE_B={'value': 2.0}), flag='EC_PE,B is entered without EG_PBWA'),
]


def main(pol, pdp, mrp):
    pol = load_policy(pol)
    pd0, mr0 = json.load(open(pdp)), json.load(open(mrp))
    fails = 0
    base = engine(pol, pd0, mr0)
    print(f"engine: {base.get('engine')}")
    exp_pd = expected_pd(pd0)
    ok = abs(base['pd'] - 1666.620262475) < 1e-6 and abs(base['pd'] - exp_pd) < 1e-6
    fails += not ok
    print(f"{'PASS' if ok else 'FAIL'}  PD ex-ante annual ER: engine {base['pd']:.9f}  hand {exp_pd:.9f}  (sample value 1666.620262475)")
    for name, mut, pdmut, zero, flag, pdc in CASES:
        pd, mr = copy.deepcopy(pd0), copy.deepcopy(mr0)
        if mut: mut(mr)
        if pdmut: pdmut(pd)
        got = engine(pol, pd, mr)
        exp = 0.0 if zero else expected_mr(pd, mr)
        ok = abs(got['mr'] - exp) < 1e-6 and (flag is None or flag in (got['flags'] + ' ' + got['pdflags']))
        line = f"{'PASS' if ok else 'FAIL'}  {name[:78]:78s} MR engine {got['mr']:14.6f}  hand {exp:14.6f}"
        if pdc:
            e2 = expected_pd(pd)
            ok2 = abs(got['pd'] - e2) < 1e-6
            ok = ok and ok2
            line = ('PASS' if ok else 'FAIL') + line[4:] + f"  | PD engine {got['pd']:.6f} hand {e2:.6f}"
        fails += not ok
        print(line + (f"\n        flags: {(got['flags'] + ' ' + got['pdflags']).strip()[:160]}" if (got['flags'] or got['pdflags']) and flag else ''))
    # VMR0015 s7: additionality tool vs estimated annual ER (flag only, ER unchanged)
    pd = copy.deepcopy(pd0)
    pd['methodologyRecords']['additionality']['tool'] = 'TOOL19 (max annual ER <= 20 000 t CO2e; LDC/SIDS/SUZ location route)'
    for s in pd['methodologyRecords']['sections']:
        s['qpwEstimate'] *= 13; s['P_y'] *= 13
    got = engine(pol, pd, mr0)
    ok = got['pd'] > 20000 and 'additionality: TOOL19 is not allowed' in got['pdflags'] and abs(got['pd'] - expected_pd(pd)) < 1e-6
    fails += not ok
    print(f"{'PASS' if ok else 'FAIL'}  {'PD: TOOL19 selected with ex-ante ER > 20 000 t -> flagged (s7)':78s} PD engine {got['pd']:14.6f}  hand {expected_pd(pd):14.6f}")
    n = len(CASES) + 2
    print(f"\n{n - fails}/{n} passed")
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main(*sys.argv[1:4])
