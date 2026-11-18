"""Kilimanjaro Safe Water test scenario for the VMR0015 v3 policy (sample data, fictional entities).

Reference results (hand calculation in FORM_FILLING_GUIDE.md):
  PD ex-ante annual ER = 1666.620262 tCO2e     MR ex-post ER = 1556.947181 tCO2e -> 1556 VCU
"""

PROJECT_ID = 'PD-KSW-2027-001'
PROJECT_NAME = 'Kilimanjaro Safe Water Project'
PP_ORG = 'Rural Access Water Ltd.'
PP_PERSON = 'Amara Ndosi'
PP_EMAIL = 'contact@ruralaccesswater.example'
START = '2027-01-01'
CP_END = '2031-12-31'          # 5-year renewable crediting period (VCS v5, energy and industry projects)
MP_START, MP_END, MP_DAYS = '2027-01-01', '2027-12-31', 365
MR_ID, PERIOD_REF = 'MR-2027-001', 'MP-2027-01'
VVB_ID, VVB_NAME = 'VVB-EWV-001', 'Earthwise Verification Services Ltd. (sample VVB)'
VAL_ID, VER_ID = 'VAL-2026-001', 'VER-2028-001'
LEAD, EXPERT, REVIEWER, APPROVER = 'Grace Mushi', 'Daniel Okello', 'Priya Raman', 'Samuel Kariuki'

ZONES = [  # zone, villages, households, persons PD, Q PD (L/yr), persons MR, Q MR (L, measured)
    ('S1', 'Zone 1 - Kibosho', 750, 3000, 4000000, 2955, 3960000),
    ('S2', 'Zone 2 - Uru', 750, 3000, 3500000, 2955, 3410000),
    ('S3', 'Zone 3 - Old Moshi', 750, 3000, 3140000, 2955, 2880000),
    ('S4', 'Zone 4 - Mbokomu', 750, 3000, 2500000, 2955, 2290000),
]
M_PD, X_BOIL, ETA_WB, BL, EF_CO2, EF_NON, FNRB, ADJ_LE = 0.95, 0.88, 0.15, 0.85, 112, 9.46, 0.62, 0.95
SEC = 357.48 / ETA_WB
EC_GRID_MWH, EF_GRID, TDL = 2.92, 0.42, 0.08     # 8 kWh/day x 365 = 2.92 MWh/yr (UV + pumps at service points)
TECH = 'Point-of-use (POU) household device'
DEVICE = 'Gravity-fed ceramic-membrane household filter with solar-assisted UV stage (20 L storage)'


def fuel_row():
    return {'fuelId': 'F1', 'fuelCategory': 'Non-renewable biomass (woody biomass or charcoal)', 'fuelType': 'Woody biomass',
            'baselineDeviceType': 'Three-stone fire or conventional woody-biomass device without grate and chimney (table 4(b) default 0.10)',
            'BL_fuel': BL, 'EF_CO2': EF_CO2, 'EF_nonCO2': EF_NON,
            'EF_source': '3 - IPCC default (values printed in VMR0015 s9.1)', 'fNRB': FNRB, 'fNRBDeterminationRef': 'FNRB-1'}


def fnrb_det():
    return {'determinationId': 'FNRB-1', 'fuelType': 'Woody biomass',
            'option': 'Option 3 - latest TOOL33 default (national Table 3 / regional Table 2)',
            'tool33Value': FNRB, 'tool33Table': 'Table 3 - national default', 'countryOrRegion': 'United Republic of Tanzania',
            'fNRBApplied': FNRB, 'validFrom': START, 'validTo': CP_END}


def pd_records():
    secs = []
    for sid, name, hh, p, q, _, _ in ZONES:
        secs.append({'sectionId': sid, 'sectionName': name, 'technology': TECH, 'region': name.split(' - ')[1] + ' ward, Moshi Rural District',
                     'deviceModel': DEVICE, 'householdsServed': hh, 'P_y': p,
                     'qpwOption': 'Option 1 - measured volume (flow meter / standard vessel)', 'qpwEstimate': q,
                     'm_estimate': M_PD, 'baselineFuels': [fuel_row()]})
    return {
        'sections': secs,
        'fnrbDeterminations': [fnrb_det()],
        'leakageAdjustment': {'option': '0.95 - AMS-I.E net-to-gross default', 'adjLeDefault': ADJ_LE, 'fixedAtValidation': True},
        'additionality': {
            'tool': 'VT0008 (any scale)', 'investmentAnalysisApplied': 'Not applied', 'N_all': 2, 'N_diff': 1,
            'narrative': ('VT0008 applied. Step 1 (alternatives) is not applied because AMS-III.AV sets the baseline scenario. Regulatory surplus: no Tanzanian law or regulation requires households in '
                          'Moshi Rural District to treat drinking water or use filtration devices (Water Supply and Sanitation Act 2019 '
                          'reviewed). Step 2 barrier analysis: households cannot pay the upfront filter price (about 1.5 months of '
                          'median rural cash income) and no micro-finance product covers it; carbon revenue funds free distribution '
                          'and the maintenance network. Step 4 common practice: 2 similar household-filter activities exist in the '
                          'region (N_all = 2), 1 of them uses an essentially different technology, chlorination tablets (N_diff = 1); F = 1 - N_diff/N_all = 0.5, above 20 %, '
                          'but N_all - N_diff = 1, not more than 3, so under VT0008 Step 4 the project is not common practice.')},
        'crediting_years': 5,
        'interactiveEffectsSurvey': [{'surveyType': 'Baseline survey', 'surveyRef': 'BLS-2026-01', 'questionIncluded': True,
                                      'householdsSurveyed': 384, 'householdsWithInteractiveEffect': 0, 'proportionApplied': 0,
                                      'treatment': 'No household reported that boiling drinking water changed other cooking or heating fuel use; no adjustment applied (VMR0015 s9.3(1)).'}],
    }


def mr_records():
    secs = []
    for zi, (sid, name, hh, _, _, p, q) in enumerate(ZONES, 1):
        checks = []
        for i in range(1, 101):
            aid = f'Z{zi}-{i:04d}'
            if i <= 5:      # not operating at the visit (no E. coli test possible)
                checks.append({'applianceId': aid, 'checkDate': '2027-11-15', 'meetsTechStandard': True, 'operatingOrReplaced': False})
            elif i <= 7:    # operating but failing E. coli
                checks.append({'applianceId': aid, 'checkDate': '2027-11-15', 'meetsTechStandard': True, 'operatingOrReplaced': True,
                               'ecoliCfu': 3, 'ldlCfu': 1, 'laboratory': 'Kilimanjaro Water Quality Laboratory (sample lab)'})
            else:
                checks.append({'applianceId': aid, 'checkDate': '2027-11-15', 'meetsTechStandard': True, 'operatingOrReplaced': True,
                               'ecoliCfu': 0, 'ldlCfu': 1, 'laboratory': 'Kilimanjaro Water Quality Laboratory (sample lab)'})
        secs.append({
            'sectionId': sid, 'householdsServed': hh, 'P_y': p,
            'qpwOption': 'Option 1 - measured volume (flow meter / standard vessel)',
            'waterQuantityOpt1': [{'unitId': f'Z{zi}-METERS (750 inline household meters, totalised)', 'measurementMethod': 'Flow meter',
                                   'measuredVolume': q, 'daysMeasured': MP_DAYS if zi <= 2 else 320, 'salesReceiptCrossCheck': False}],
            'functionalityChecks': checks,
            'networkChecks': [{'checkDate': '2027-11-15', 'networkExists': False, 'sectionId': sid,
                               'affectedBuildings': 'None - no public piped safe-drinking-water network reaches the zone (checked with MUWSA and the ward office).'}],
            'waterQualityChecks': [{'checkDate': '2027-11-20', 'samplingBasis': 'Random sample of 10 operating filters in the zone, outlet water, ISO 9308-1 membrane filtration',
                                    'meetsStandard': True, 'complianceRoute': 'Tanzania drinking-water standard TZS 789 and WHO Guidelines (4th ed.) - all parameters within limits',
                                    'testResults': 'E. coli 0 cfu/100 ml in all 10 samples; turbidity 0.6 NTU (limit 5); arsenic 0.002 mg/L (limit 0.01); fluoride 0.4 mg/L (limit 1.5)',
                                    'microbiologicalResult': 0, 'turbidityResult': 0.6, 'arsenicResult': 0.002, 'fluorideResult': 0.4}],
            'samplingResults': [{'parameter': 'm', 'confidenceTargetPct': 90, 'precisionTargetPct': 10, 'sampleSize': 100, 'populationSize': hh,
                                 'attainedPrecisionPct': 4.5, 'surveyYearInCP': 1, 'remedy': 'Not needed - 90/10 met', 'expectedProportion': 0.9}],
        })
    return {
        'periodDays': MP_DAYS, 'sections': secs, 'fnrbDeterminations': [fnrb_det()],
        'interactiveEffectsSurvey': [{'surveyType': 'Project survey', 'surveyRef': 'PS-2027-01', 'questionIncluded': True,
                                      'householdsSurveyed': 400, 'householdsWithInteractiveEffect': 0, 'proportionApplied': 0,
                                      'treatment': 'No interactive effect reported; no adjustment applied (VMR0015 s9.3(1)).'}],
    }


# ---- Appendix 2 parameter tables -------------------------------------------------------------
def p21(name, unit, desc, eq, source, value, just, purpose='Calculation of baseline emissions'):
    return {'dataParameter': name, 'dataUnit': unit, 'description': desc, 'equationNumber': eq, 'sourceOfData': source,
            'valueApplied': (f'{value:g}' if isinstance(value, (int, float)) else value), 'valueBasis': 'Single value', 'value': value,
            'justification': just, 'purposeOfData': purpose}


def p22(name, unit, desc, eq, source, value, method, freq, qaqc, purpose='Calculation of baseline emissions', equip=None, basis='Single value'):
    d = {'dataParameter': name, 'dataUnit': unit, 'description': desc, 'equationNumber': eq, 'sourceOfData': source,
         'measurementMethods': method, 'frequency': freq, 'valueApplied': (f'{value:g}' if isinstance(value, (int, float)) else value),
         'valueBasis': basis, 'value': value, 'qaqc': qaqc, 'purposeOfData': purpose}
    if equip:
        d['monitoringEquipment'] = equip
    return d


A21 = {
    'BL_fuel_i': p21('BL_fuel,i', 'fraction', 'Proportion of baseline households boiling drinking water with fuel i (woody biomass)', 'VMR0015 Eq.(1)',
                     'Baseline survey BLS-2026-01 (384 households, 90/10)', BL, '85% of surveyed households boiled drinking water on a three-stone woody-biomass fire; the other 15% are not credited.'),
    'EF_b_k_CO2': p21('EF_CO2,i', 'tCO2/TJ', 'CO2 emission factor of woody biomass combustion', 'VMR0015 Eq.(1), s9.1',
                      'IPCC 2006 default as printed in VMR0015 s9.1', EF_CO2, 'VMR0015 s9.1 order of preference: no project-specific or national value is available, so the IPCC default printed in the methodology applies.'),
    'EF_b_k_nonCO2': p21('EF_nonCO2,i', 'tCO2e/TJ', 'Non-CO2 (CH4 + N2O) emission factor of woody biomass combustion', 'VMR0015 Eq.(1), s9.1',
                         'IPCC 2006 default as printed in VMR0015 s9.1', EF_NON, 'Default printed in VMR0015 s9.1; not multiplied by fNRB, as the methodology requires.'),
    'eta_wb': p21('n_wb', 'fraction', 'Efficiency of the baseline water-boiling device (three-stone fire)', 'AMS-III.AV Eq.(5)',
                  'Site-specific value from water boiling tests (AMS-III.AV v09.0 table 4 allows measured or literature values; the optional default for a three-stone fire is 0.10)', ETA_WB, 'Illustrative sample value: mean thermal efficiency of 15 % measured in water boiling tests on 30 baseline three-stone fires across the four zones. The optional table 4 default of 0.10 is not used.'),
    'LS': p21('LS', 'years', 'Expected technical life span of the project appliance', 'Applicability (AMS-III.AV)',
              "Manufacturer's specification (ceramic element replaced every 2 years under the maintenance plan)", 7,
              'Life span of 7 years exceeds the 5-year crediting period; failed units are replaced within 14 days.', 'Applicability / eligibility'),
    'SEC': p21('SEC', 'kJ/L', 'Specific energy consumption to boil one litre of water in the baseline device', 'AMS-III.AV Eq.(5)',
               'Calculated: SEC = 357.48 / n_wb', round(SEC, 4), 'All Eq.(5) defaults apply (T_i, T_f, WH, WHE), so SEC = 357.48 / 0.15 = 2383.2 kJ/L.'),
    'secEquation': 'Eq.(5) - all defaults apply (SEC = 357.48 / eta_wb)',
    'X_boil': p21('X_boil', 'fraction', 'Fraction of the population served for which the common practice of water treatment is or would have been water boiling (AMS-III.AV Eq.(1))', 'VMR0015 Eq.(1)',
                  'Baseline survey BLS-2026-01', X_BOIL, '88 % of the persons in the surveyed baseline households boil their drinking water (baseline survey BLS-2026-01, 90/10 met).'),
}
A21_3 = {'EF_PE_A_L': p21('EF_PE,A,L', 'tCO2/MWh', 'Emission factor of grid electricity used by the UV stages and pumps at service points',
                          'VT0010 v1.1 Eq.(5), (7)-(9)', 'TANESCO grid combined-margin factor (national value)', EF_GRID,
                          'National grid combined margin applied under VT0010 Scenario A.', 'Calculation of project emissions')}
A21_5 = {'Adj_LE': p21('Adj_LE', 'fraction', 'Leakage adjustment applied to baseline emissions', 'VMR0015 s8.3',
                       'AMS-I.E net-to-gross default (cited by AMS-III.AV s5.4)', ADJ_LE, 'Default 0.95 fixed at validation; no survey-based value used.', 'Calculation of leakage')}


def a22_1(pd):
    m, P, Q, fail = (M_PD, sum(z[3] for z in ZONES), sum(z[4] for z in ZONES), 0.0) if pd else (0.93, sum(z[5] for z in ZONES), sum(z[6] for z in ZONES), 0.0211)
    when = 'Estimated for the PD (validated plan)' if pd else 'Monitored in MP-2026-01'
    return {
        'm': p22('m', 'fraction', 'Proportion of appliances meeting the technical standard, operating, and giving E. coli < 1 cfu/100 ml', 'VMR0015 Eq.(1); AMS-III.AV table 11',
                 'Annual functionality check on a random sample of 100 appliances per zone', m,
                 'Visit, visual check of the element and seals, and outlet sample for E. coli (membrane filtration)', 'Annual',
                 '90/10 sampling (CDM Sampling Standard v09.0); laboratory LDL <= 1 cfu/100 ml; 10% of visits re-checked by the Operations Manager', equip='Portable incubator; membrane filtration kit'),
        'P_y': p22('P_y', 'persons', 'Persons served by the project appliances', 'AMS-III.AV para 18 (5.5 L cap)', 'Distribution register and household survey', P,
                   'Household register (persons per household) checked at each visit', 'Annual', 'Register cross-checked with village records'),
        'QPW_y': p22('QPW_y', 'L/yr', 'Quantity of purified water used for drinking', 'VMR0015 Eq.(1)', 'Totalised inline household flow meters (Option 1)', Q,
                     'Monthly meter readings by zone technicians, summed per zone', 'Monthly, aggregated annually',
                     'Meters calibrated before installation; outliers above 5.5 L/person/day capped by the calculation', equip='Inline flow meter, 1% accuracy'),
        'SDW_network_check': p22('SDW network check', 'persons connected', 'Persons connected to a public piped safe-drinking-water network (excluded)', 'AMS-III.AV table 13',
                                 'MUWSA network maps and ward office', 0, 'Annual check with the utility and the ward office', 'Annual', 'Written confirmation from the utility filed', 'Applicability / eligibility'),
        'SDW_quality': p22('SDW quality check', 'pass (1) / fail (0)', 'Water from the appliances meets the safe-drinking-water standard', 'AMS-III.AV table 14',
                           'Accredited laboratory test report', 1, 'Outlet samples tested against TZS 789 / WHO parameters', 'At least once every two years (done annually)',
                           'Accredited laboratory; chain-of-custody forms', 'Applicability / eligibility'),
        'WQ_fail_share': p22('WQ fail share', 'fraction', 'Share of sampled appliances failing the E. coli test', 'AMS-III.AV table 11 (10% gate)',
                             'Functionality check E. coli results', fail, 'Failures / appliances with an E. coli result', 'Annual',
                             'More than 10% failing would void the period', 'Applicability / eligibility'),
    }


def a22_3():
    return {
        'EC_Grid_L': p22('EC_Grid,L', 'MWh/yr', 'Grid electricity used by UV stages and booster pumps at the four service points', 'VT0010 v1.1 Eq.(5), (7)-(9)',
                         'Sub-meters at each service point', EC_GRID_MWH, 'Monthly sub-meter readings (8 kWh/day in total)', 'Monthly',
                         'Meters calibrated by the utility; readings photographed', 'Calculation of project emissions', equip='Utility kWh sub-meter'),
        'TDL_PE_A_L': p22('TDL_PE,A,L', 'fraction', 'Technical transmission and distribution losses of the grid', 'VT0010 / TOOL05 v3.0 default',
                          'TOOL05 v3.0 default for low-voltage consumers', TDL, 'Default value', 'Fixed for the crediting period', 'Default from the tool', 'Calculation of project emissions'),
    }


def a22_4():
    return {'f_NRB_i_y': p22('fNRB,i,y', 'fraction', 'Fraction of non-renewable woody biomass', 'VMR0015 Eq.(1), s9.2',
                             'Test value chosen for this sample (not the published TOOL33 figure for Tanzania); a real PD enters the current TOOL33 Table 3 value', FNRB,
                             'Latest TOOL33 default looked up at each verification', 'Each verification',
                             'Real project: the VVB checks the value against the current TOOL33 table')}


def pd_appendix2():
    return {'a21_1': A21, 'a21_3': A21_3, 'a21_5': A21_5, 'a22_1': a22_1(True), 'a22_3': a22_3(), 'a22_4': a22_4()}


def mr_appendix2():
    return {'a22_1': a22_1(False), 'a22_3': a22_3(), 'a22_4': a22_4()}
