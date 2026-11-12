"""Real-data test: Nazava Water Filter Project, Indonesia (Gold Standard GS4290), AMS-III.AV v04.0, 1st monitoring period
19/12/2015-18/12/2018, Bureau Veritas verification report BVC/Brunei-VR/Brunei/003/2018 rev.01. Every parameter comes from that report
(section 3.4 / 3.6) or from the project's Transition Annex (15/02/2016, Eq.(4)-(6)). The one input neither document prints is the number
of operating filters per vintage (it is in the monitoring report and ER spreadsheet); it is derived here from the verified BE of each vintage.
Usage: build_nazava.py <fixtures dir> <out dir>"""
import json, sys, copy, os
FX, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
pd0, mr0 = json.load(open(FX + '/PD.full.json')), json.load(open(FX + '/MR.full.json'))

# ---- verification report values ----
N_PER_UNIT, R_LPD, WQ, XBOIL, ETA, FNRB, EF, L = 4.32, 3.5, 0.8871, 0.8826, 0.4, 0.821, 81.6, 0.95
SEC = (4.186 * (100 - 20) + 0.01 * 2260) / ETA          # Transition Annex Eq.(6): 893.7 kJ/L
VINT = [('2015-12-19', '2015-12-31', 13, 228, 11, 217), ('2016-01-01', '2016-12-31', 366, 7888, 394, 7493),
        ('2017-01-01', '2017-12-31', 365, 10713, 536, 10177), ('2018-01-01', '2018-12-18', 352, 11571, 579, 10992)]
BE_UNIT_DAY = N_PER_UNIT * R_LPD * WQ * XBOIL * SEC * 1e-9 * FNRB * EF   # Eq.(4) x Eq.(5) per operating unit-day
def units(be, days): return be / (BE_UNIT_DAY * days)    # operating filters implied by the verified BE

def pd_doc():
    d = copy.deepcopy(pd0); r = d['methodologyRecords']
    d.update(projectId='GS4290-NAZAVA-ID', projectName='Nazava Water Filter Project, Indonesia (GS4290) - real-data test',
             startDate='2015-12-19', creditingPeriodStart='2015-12-19', creditingPeriodEnd='2022-12-18')
    s = r['sections'][0]
    s.update(sectionId='S1', sectionName='Nazava household ceramic filters, Indonesia', region='Indonesia',
             deviceModel='Nazava ceramic household water filter', householdsServed=None,
             qpwOption='Option 2.2 - population x volume per person (AMS-III.AV Eq.(3))', QPW_pp=R_LPD,
             P_y=round(units(11571, 352) * N_PER_UNIT), m_estimate=WQ, baselineSurvey=[])
    s.pop('householdsServed', None)
    s['baselineFuels'] = [{'fuelId': 'F1', 'fuelCategory': 'Non-renewable biomass (woody biomass or charcoal)', 'fuelType': 'Woody biomass',
        'baselineDeviceType': s['baselineFuels'][0]['baselineDeviceType'], 'BL_fuel': 1.0, 'EF_CO2': EF, 'EF_nonCO2': 0.0,
        'EF_source': '2 - regional or national default', 'fNRB': FNRB, 'fNRBDeterminationRef': 'FNRB-1'}]
    r['sections'] = [s]
    r['fnrbDeterminations'] = [{'determinationId': 'FNRB-1', 'fuelType': 'Woody biomass', 'option': 'Option 1 - latest UNFCCC national default',
        'fNRBApplied': FNRB, 'unfcccValue': FNRB, 'countryOrRegion': 'Indonesia', 'validFrom': '2015-12-19', 'validTo': '2022-12-18'}]
    r['leakageAdjustment'] = {'option': '0.95 - AMS-I.E net-to-gross default', 'adjLeDefault': L, 'fixedAtValidation': True}
    r.pop('interactiveEffectsSurvey', None)                 # not reported by the project (v04.0 had no such requirement)
    a = d['appendix2']
    a['a21_1'].update(eta_wb=dict(a['a21_1']['eta_wb'], value=ETA), X_boil=dict(a['a21_1']['X_boil'], value=XBOIL),
                      BL_fuel_i=dict(a['a21_1']['BL_fuel_i'], value=1.0), EF_b_k_CO2=dict(a['a21_1']['EF_b_k_CO2'], value=EF),
                      EF_b_k_nonCO2=dict(a['a21_1']['EF_b_k_nonCO2'], value=0.0), SEC=dict(a['a21_1']['SEC'], value=round(SEC, 6)))
    a['a21_1'].pop('LS', None)
    a['a22_4']['f_NRB_i_y']['value'] = FNRB
    a['a22_1']['m']['value'] = WQ
    for k in ('P_y', 'QPW_y'): a['a22_1'].pop(k, None)
    a['a22_3'] = {}                                          # PE = 0 (verification report s3.6)
    return d

def mr_doc(v, mode, ef=(EF, 0.0)):
    s0, s1, days, be, le, er = v
    d = copy.deepcopy(mr0); r = d['methodologyRecords']
    d.update(mrId='MR-GS4290-' + s0[:4], monitoringPeriodStart=s0, monitoringPeriodEnd=s1, projectRef='GS4290-NAZAVA-ID')
    r['periodDays'] = days
    n = units(be, days); P = n * N_PER_UNIT
    s = copy.deepcopy(r['sections'][0])
    s.update(sectionId='S1', P_y=P, qpwOption='Option 2.2 - population x volume per person (AMS-III.AV Eq.(3))',
             waterQuantityOpt22=[{'surveyRef': 'GS4290 MP1 project survey (persons per unit 4.32, 3.5 L/person/day)', 'P_y': P, 'QPW_pp': R_LPD, 'presenceDays': days}])
    for k in ('waterQuantityOpt1', 'householdsServed'): s.pop(k, None)
    # m: 10,000 records reproduce the 88.71 % share; 'ecoli' = the 11.29 % fail the E. coli test (as reported), 'nonfunctional' = they are not operating
    ch = []
    for i in range(10000):
        bad = i >= 8871
        c = {'applianceId': 'NZ-%05d' % i, 'checkDate': s1, 'meetsTechStandard': True, 'operatingOrReplaced': not (bad and mode == 'nonfunctional'), 'ecoliCfu': 5 if (bad and mode == 'ecoli') else 0, 'ldlCfu': 1}
        ch.append(c)
    s['functionalityChecks'] = ch
    s['networkChecks'] = [{'checkDate': s1, 'networkExists': False, 'affectedBuildings': 'Not reported in the verification report', 'evidenceRef': 'n/a', 'sectionId': 'S1'}]
    s['waterQualityChecks'][0].update(checkDate=s1)
    s['samplingResults'] = [{'parameter': 'm', 'confidenceTargetPct': 90, 'precisionTargetPct': 10, 'sampleSize': 100, 'populationSize': 87879, 'attainedPrecisionPct': 9.9, 'surveyYearInCP': 1, 'remedy': 'n/a', 'expectedProportion': WQ}]
    r['sections'] = [s]
    r['fnrbDeterminations'] = pd_doc()['methodologyRecords']['fnrbDeterminations']
    r.pop('interactiveEffectsSurvey', None)
    d['appendix2']['a22_3'] = {}
    d['appendix2'].get('a22_1', {}).pop('P_y', None); d['appendix2'].get('a22_1', {}).pop('QPW_y', None)
    if 'a22_1' in d['appendix2'] and 'm' in d['appendix2']['a22_1']: d['appendix2']['a22_1']['m']['value'] = WQ
    if 'a22_4' in d['appendix2']: d['appendix2']['a22_4']['f_NRB_i_y']['value'] = FNRB
    if 'WQ_fail_share' in d['appendix2'].get('a22_1', {}): d['appendix2']['a22_1']['WQ_fail_share']['value'] = 0.1129 if mode == 'ecoli' else 0.0
    return d, n

def redate(o):
    if isinstance(o, dict): return {k: redate(v) for k, v in o.items()}
    if isinstance(o, list): return [redate(v) for v in o]
    if isinstance(o, str): return o.replace('2027-01-01', '2015-12-19').replace('2031-12-31', '2022-12-18')
    return o
_pd_doc = pd_doc
pd_doc = lambda: redate(_pd_doc())
pd = pd_doc(); json.dump(pd, open(OUT + '/PD.json', 'w'))
pd112 = copy.deepcopy(pd)
f = pd112['methodologyRecords']['sections'][0]['baselineFuels'][0]; f.update(EF_CO2=112, EF_nonCO2=9.46, EF_source='3 - IPCC default (values printed in VMR0015 s9.1)')
pd112['appendix2']['a21_1']['EF_b_k_CO2']['value'] = 112; pd112['appendix2']['a21_1']['EF_b_k_nonCO2']['value'] = 9.46
json.dump(pd112, open(OUT + '/PD_ipcc.json', 'w'))
meta = []
for v in VINT:
    for mode in ('ecoli', 'nonfunctional'):
        d, n = mr_doc(v, mode); fn = f'MR_{v[0][:4]}_{mode}.json'; json.dump(d, open(OUT + '/' + fn, 'w'))
    meta.append({'vintage': v[0] + '..' + v[1], 'days': v[2], 'BE': v[3], 'LE': v[4], 'ER': v[5], 'operating_units_implied': n})
json.dump({'BE_per_unit_day': BE_UNIT_DAY, 'SEC': SEC, 'vintages': meta}, open(OUT + '/meta.json', 'w'), indent=1)
print(json.dumps(meta, indent=1)); print('SEC', SEC, 'BE per operating unit-year', BE_UNIT_DAY * 365)
