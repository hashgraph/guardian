"""Fill the Verra-template fields added by tplbuild.py in the sample documents with values for the
Kilimanjaro sample scenario. Fields that do not apply to a non-AFOLU, non-grouped household-water project
get an explicit "Not applicable" statement with the reason. Only fields that are absent are filled.
Usage: tplfill.py <tree> <samples_dir> <tools_dir> <engvals.json>"""
import json, glob, re, sys, copy
tree, sdir, tdir, ev = sys.argv[1:5]
sys.path.insert(0, tdir)
import scenario as sc
E = json.load(open(ev))
files = {}
for f in glob.glob(tree + '/schemas/*.json'):
    j = json.load(open(f)); files[j['iri'].split('&')[0]] = j
SKIP = {'@context', 'type', 'id', 'policyId', 'ref', 'guardianVersion'}
r6 = lambda x: round(x, 6)
DESC = re.compile(r'template v5\.0[AB], (?:section )?([^:]*): (.*?)(?: - (?:column ")?(.*?)"?\.)?\.?$')
ZONES = 'Kibosho, Uru, Old Moshi and Mbokomu wards, Moshi Rural District, Kilimanjaro Region, Tanzania'
NA_AFOLU = 'Not applicable - the project is not an AFOLU project (sectoral scope 3, energy demand), so carbon pools, non-permanence risk, the buffer pool and the long-term average do not apply.'
NA_ECO = 'Not applicable - household water filters are installed in existing homes; no land is converted, no species are introduced and no habitat is affected.'
NA_GROUP = 'Not applicable - the project is not a grouped project.'
NA_OTHER = 'Not applicable - the project is not registered with, has not applied to and was not rejected by any other GHG program, and takes part in no emissions trading program or other environmental credit scheme.'
NA_DEV = 'Not applicable - no methodology deviation or project description deviation is applied.'
NA_DEMIN = 'Not applicable - no GHG source or carbon pool is excluded as de minimis.'
NA_REASS = 'Not applicable - first crediting period; no baseline reassessment is due.'
NA_SENS = 'Not applicable - no information is excluded from the public version of this document.'
NA_CAP = 'Not applicable - no capacity limit applies to this project activity under VMR0015.'
DEFAULTS = []

def kind_of(cap):
    c = cap.lower()
    if any(w in c for w in ('afolu', 'carbon pool', 'buffer pool', 'long-term average', 'non-permanence', 'loss event')): return NA_AFOLU
    if any(w in c for w in ('ecosystem', 'species', 'invasive', 'habitat')): return NA_ECO
    if any(w in c for w in ('eligibility area', 'grouped', 'new project activity instance', 'eligibility criteria')): return NA_GROUP
    if any(w in c for w in ('another ghg program', 'other ghg program', 'rejected', 'emissions trading', 'environmental credit', 'no double issuance', 'program administrator')): return NA_OTHER
    if 'deviation' in c: return NA_DEV
    if 'de minimis' in c: return NA_DEMIN
    if 'baseline reassessment' in c: return NA_REASS
    if 'sensitive' in c: return NA_SENS
    if 'capacity limit' in c: return NA_CAP
    return None

def text(doc, sec, cap, lab):
    """value for a string field"""
    L, c = (lab or cap), cap.lower()
    l = L.lower()
    na = kind_of(cap)
    if 'supply chain' in c or 'scope 3' in c:
        return 'The project reduces household woodfuel use for boiling water; it does not change the emissions footprint of a product or service that a company buys or sells, so no Scope 3 double claiming arises.'
    if na and doc not in ('VAL', 'VER'): return na
    if doc in ('VAL', 'VER'):
        if 'label eligibility' in c: return 'Not assessed - no CCP or CORSIA label was requested for this sample project.'
        if na and ('conclusion' in l or 'assessment' in l): return na.replace('Not applicable - ', 'Not applicable: ') + ' Confirmed by document review.'
        if l.startswith('evidence description'): return ('Project description' if doc == 'VAL' else 'Monitoring report') + ' section on ' + re.sub(r' \(.*\)', '', cap).lower() + ' and supporting records (document review)'
        if l == 'assessment process' or l.endswith('assessment process'):
            return 'Document review of the ' + ('project description' if doc == 'VAL' else 'monitoring report') + ' section on ' + re.sub(r' \(.*\)', '', cap).lower() + ', interviews with the project proponent and checks of the supporting records against VCS Standard v5.0 and VMR0015 v1.0.'
        if 'conclusion' in l: return 'The ' + re.sub(r' \(.*\)', '', cap).lower() + ' conforms to VCS Standard v5.0 and VMR0015 v1.0; no open findings.'
        if l in ('item',): return re.sub(r' \(.*\)', '', cap)
        if 'risk category' in l: return 'Risks to local stakeholders and the environment (household water filters)'
        if 'risks and mitigation measures' in l: return 'No material risk identified; mitigation measures in the registered PD were implemented.'
        if 'comment received' in l: return 'No public comments were received during the public comment period.'
        if 'did the risk assessment occur' in l: return 'Yes - the ESG risk assessment was completed in October 2026, before the project start date of 1 January 2027.'
    # cover pages
    if sec == 'Cover':
        m = {'document completion date': '2026-11-15' if doc == 'PD' else '2028-01-20', 'document version': '1.0', 'request type': 'Registration request',
             'vcs standard version used for validation': 'VCS Standard v5.0', 'vcs standard version used for verification': 'VCS Standard v5.0',
             'methodology id and version': 'VMR0015 v1.0 (revision of AMS-III.AV v09.0)', 'project proponent name and contact': f'{sc.PP_ORG}, {sc.PP_PERSON}, {sc.PP_EMAIL}',
             'prepared by': sc.PP_ORG, 'crediting period start': sc.START, 'crediting period end': sc.CP_END, 'project name': sc.PROJECT_NAME,
             'monitoring period start': sc.MP_START, 'monitoring period end': sc.MP_END, 'description': 'First version' + (' for validation' if doc == 'PD' else ' for verification'),
             'document file name': f'{sc.PROJECT_ID}_PD_v1.0.pdf', 'file name': f'{sc.PROJECT_ID}_{doc}_v1.0.pdf', 'summary': 'See the summary at the start of this report.'}
        if l in m: return m[l]
    if c.startswith('document review'):
        return {'review start date': '2026-11-01' if doc == 'VAL' else '2028-01-05', 'review completion date': '2026-11-30' if doc == 'VAL' else '2028-01-25',
                'description of review': 'Desk review of the ' + ('project description' if doc == 'VAL' else 'monitoring report') + ', the calculation records and the supporting evidence.',
                'audit team member(s)': f'{sc.LEAD} (team lead), {sc.EXPERT} (technical expert)'}.get(l)
    if c.startswith('schedule'):
        return {'contract signed': '2027-11-15', 'strategic analysis and risk assessment completed': '2027-12-10', 'audit plan delivered to project proponent': '2027-12-15',
                'notice of validation/verification services (novs) form submitted': 'Not submitted (optional)', 'opening meeting': '2028-01-08', 'closing meeting': '2028-01-19',
                'first cars, cls, or fars issued': '2028-01-20', 'all cars, cls, and fars closed': '2028-02-05', 'first draft report issued to project proponent': '2028-02-10'}.get(l)
    if l == 'site visit format': return 'On site: the four zones, the Moshi warehouse and the four service points'
    if l.startswith('non-permanence risk assessment'): return 'Not applicable - non-AFOLU project; no non-permanence risk assessment is required.'
    if c.startswith('crediting period and validated total'):
        return {'crediting period start': sc.START, 'crediting period end': sc.CP_END}.get(l, f"{E['pd']['total']:.6f} tCO2e for the 5-year crediting period")
    if c.startswith('verification period and verified total'):
        return {'verification period start': sc.MP_START, 'verification period end': sc.MP_END}.get(l)
    if c.startswith('project activity instances'):
        return {'project activity instance': 'Single project activity: 3,000 household filters in four zones (not a grouped project)', 'explanation': 'One device type, one distribution programme, monitored together; the four zones are sections S1-S4 in the methodology records.'}.get(l)
    if 'section number' in l or 'information to be excluded' in l or 'description and explanation' in l or 'assessment process and conclusion' in l: return NA_SENS
    if c.startswith('audit history'):
        if doc == 'PD': return 'Not applicable - first validation; the project has no previous audit.'
        return {'audit type': 'Verification', 'date of opening meeting': '2028-01-08', 'program': 'VCS', 'validation/ verification body name': sc.VVB_NAME,
                'monitoring period start': sc.MP_START, 'monitoring period end': sc.MP_END}.get(l, '')
    if c.startswith('sectoral scope'):
        return {'sectoral scope': '3 - Energy demand', 'project category': 'Not applicable (non-AFOLU project)', 'project activity type': 'Low-GHG safe drinking water production (household point-of-use filters)'}.get(l)
    if c.startswith('deadlines for participation'):
        return {'pipeline listing deadline': 'Before the project start date of 1 January 2027 (sample record)', 'pipeline listing request date': '2026-10-01', 'date of listing as under validation': '2026-11-20', 'registration request deadline': 'Within the VCS Standard v5.0 period after validation (sample record)'}.get(l)
    if c.startswith('eligibility of projects registered with other'): return NA_OTHER
    if c.startswith('project proponent'):
        return {'organization name': sc.PP_ORG, 'contact person': sc.PP_PERSON, 'title': 'Programme Director', 'address': 'P.O. Box 1201, Moshi, Kilimanjaro Region, Tanzania', 'telephone': '+255 27 275 0000 (sample)', 'email': sc.PP_EMAIL}.get(l)
    if c.startswith('other entities'):
        return 'None' if l == 'organization name' else 'Not applicable - no other entity is involved; Rural Access Water Ltd. is the sole project proponent and operator.'
        return {'organization name': 'Moshi District Council', 'role in the project': 'Local government partner (memorandum of understanding Ref. MDC/WS/2026/14)', 'contact person': 'District Water Engineer', 'title': 'District Water Engineer',
                'address': 'Moshi District Council, Moshi, Kilimanjaro Region, Tanzania', 'telephone': '+255 27 275 1000 (sample)', 'email': 'water@moshidc.example', 'description of involvement': 'Recognises the programme and provides the district infrastructure register used for the annual public network check (AMS-III.AV table 13).'}.get(l)
    if 'right to operate' in c and 'evidence' in c:
        return {'type of evidence': 'Signed household user agreements; memorandum of understanding with Moshi District Council', 'type of right demonstrated': 'Right to operate and right to the emission reductions', 'scope of evidence': 'All 3,000 participating households and the four service points', 'scope of the evidence': 'All 3,000 participating households and the four service points'}.get(l)
    if 'new information' in l: return 'No new information or circumstances arose in the monitoring period.'
    if c.startswith('likelihood of affecting') or c.startswith('step 2') or c.startswith('step 3') or c.startswith('step 4') or 'land or resource' in c:
        return 'Not applicable - the project installs portable household devices in existing homes and leases four small service points; it does not affect land, water-source or other resource rights, so no land tenure, customary rights or conflict analysis is needed.'
    if c.startswith('project start date'):
        return {'project start date': sc.START, 'initial crediting period start date': sc.START}.get(l)
    if c.startswith('project crediting period'):
        return {'crediting period length': '5 years (renewable)', 'start date of this crediting period': sc.START, 'end date of this crediting period': sc.CP_END, 'crediting period number': '1', 'maximum total project crediting period duration': '5 years, renewable (VCS Standard v5.0)'}.get(l)
    if c.startswith('crediting period totals'): return None
    if c.startswith('conditions prior'):
        return {'conditions prior to project initiation': 'Households boiled drinking water on three-stone woody-biomass fires (baseline survey BLS-2026-01: 85% of households); no treatment devices were in use.', 'list of facilities, systems, and equipment': 'None - no water treatment facilities, systems or equipment existed in the four zones before the project.'}.get(l, NA_AFOLU)
    if c.startswith('technology, system'):
        return {'technology, system, or equipment': sc.DEVICE, 'age and average lifetime': 'New units; manufacturer rated life 7 years (ceramic element replaced every 2 years)', 'technical specifications': '20 L storage, ceramic membrane, solar-assisted UV stage; meets TZS 789 (Annex 5)', 'type and level of service provided': 'Safe drinking water for 3,000 households (about 12,000 people), up to 5.5 L per person per day credited'}.get(l)
    if c.startswith('project location'):
        return {'country': 'United Republic of Tanzania', 'region/state/province': 'Kilimanjaro Region', 'district': 'Moshi Rural District', 'community/ municipality/city': 'Kibosho, Uru, Old Moshi and Mbokomu wards'}.get(l)
    if c.startswith('laws') or 'regulatory framework' in c:
        return None
    if c.startswith('sustainable development'):
        return {'sd contribution number': '1', 'sdg target': 'SDG 6.1 - safe and affordable drinking water for all', 'sd contribution indicator type and name': 'Outcome indicator: number of people using a project water filter',
                'indicator metadata': 'Count of people in households with a functioning filter (annual functionality survey, AMS-III.AV table 11)', 'planned activities and expected contributions': 'Distribute 3,000 household filters in 2027; about 12,000 people gain access to safe drinking water',
                'actions taken and contributions delivered': '3,000 filters distributed; 93% functional at the 2027 survey (about 11,800 people served)', 'relevant national sdg objectives': 'Tanzania Development Vision 2025: access to clean and safe water for all'}.get(l)
    if 'stakeholder consultation' in c or c.startswith('stakeholder identification') and doc in ('PD', 'MR'):
        return {'stakeholder group': 'Participating households in the four zones', 'outcomes of activities to consult and communicate with stakeholders': 'Village meetings in each zone (October 2026) supported the programme; households asked for faster replacement of failed units, adopted as a 14-day replacement guarantee.',
                'influence of women, marginalized people, and vulnerable people': 'Separate women-only meetings were held; women, who collect and boil most drinking water, chose the service point locations.', 'prohibition of retaliation': 'The user agreement and the grievance channel prohibit retaliation; complaints can be made anonymously.',
                'explanation of any changes to the plan': 'No changes to the stakeholder engagement plan.', 'changes to the plan': 'No changes to the stakeholder engagement plan in the monitoring period.',
                'stakeholder identification': 'Participating households, Moshi District Council, village water committees, local woodfuel sellers', 'legal or customary tenure/access rights': 'No tenure or access rights are affected; devices are installed in existing homes.',
                'stakeholder diversity and changes over time': 'Mixed farming households; no change in the stakeholder groups.', 'expected changes in well-being': 'Less time collecting firewood, less smoke exposure, fewer water-borne illnesses.',
                'location of stakeholders': ZONES, 'location of resources': 'Household water sources (springs and streams) in the four zones',
                'date of stakeholder consultation': '2026-10-12 to 2026-10-16', 'stakeholder engagement process before implementation of project activities': 'Village meetings, women-only sessions and a household survey in each zone.',
                'consultation outcome before implementation of project activities': 'Broad support; replacement guarantee added.', 'ongoing communication': 'Quarterly service-point open days and an SMS line.',
                'stakeholder input received before implementation of project activities': 'Requests for faster replacement and Swahili instructions; both adopted.',
                'date(s) of stakeholder consultation during the monitoring period': '2027-06-15; 2027-11-20', 'communication of monitored results': 'Annual results posted at the four service points and presented at village meetings.',
                'consultation records': 'Meeting minutes and attendance lists (Annex 8)', 'stakeholder input received during ongoing communication': 'Requests for a second storage container; under review.'}.get(l)
    if 'free, prior' in c:
        return {'stakeholder group': 'Participating households', 'fpic process': 'Not applicable - no Indigenous Peoples or customary rights holders are affected; each household gives written consent in the user agreement.', 'protection from retaliation': 'Consent can be withdrawn at any time without penalty; the grievance channel is anonymous.',
                'influence of women, marginalized people, and vulnerable people': 'Consent was obtained from the adult woman and man of each household.', 'project implementation agreement': 'Household user agreement (signed by each household)', 'explanation of any changes to the plan': 'No changes.',
                'ongoing consent': 'Consent confirmed at the annual functionality survey.', 'changes to the project implementation agreement': 'No changes.', 'changes to the plan to obtain consent': 'No changes.',
                'obtaining consent': 'Written consent in the household user agreement.', 'consent': 'Consent confirmed at the annual functionality survey.', 'outcome of fpic process': 'All 3,000 households consented; none withdrew.'}.get(l)
    if 'benefit' in c:
        return {'stakeholder group': 'Participating households', 'mechanism design': 'Designed with the village water committees in October 2026.', 'summary of the mechanism': 'Filters, replacement elements and maintenance are free of charge, funded from carbon revenue.',
                'financial information': 'Carbon revenue funds the filters, replacement elements and maintenance (budget in Annex 9).', 'infrastructure': 'Four service points for replacement elements and repairs.', 'mechanism implementation': 'Implemented as designed; replacement elements and repairs provided free of charge through the four service points.',
                'changes to the mechanism': 'No changes.', 'process used to design the benefit-sharing agreement': 'Designed with the village water committees in October 2026.', 'summary of the benefit-sharing agreement': 'Free filters, replacement elements and maintenance, funded from carbon revenue.',
                'approval and dissemination of benefit-sharing agreement': 'Approved at the village meetings and posted at the four service points.', 'benefit sharing during the monitoring period': 'Free replacement elements and repairs provided as agreed.'}.get(l)
    if 'grievance' in c:
        return {'process to establish the grievance redress mechanism': 'Designed with the village water committees and the district council in October 2026.', 'summary of the grievance redress mechanism': 'Complaints by SMS, phone or at the service points; acknowledged within 2 days, resolved within 14 days; appeal to the district water engineer.',
                'appropriateness of the grievance redress mechanism': 'Free, in Swahili, anonymous option, accessible at the four service points.', 'confidentiality of information': 'Complainant details are kept confidential and shared only with consent.',
                'grievances received': ('None - the project had not started when this PD was prepared.' if doc == 'PD' else 'Two grievances regarding filter replacement timing; resolved within 14 days.'), 'changes to the grievance redress mechanism': 'No changes.',
                'development process': 'Designed with the village water committees in October 2026.', 'grievance redress procedure': 'Complaints by SMS, phone or at the service points; resolved within 14 days; appeal to the district water engineer.', 'resolution and outcome': 'All resolved within 14 days.'}.get(l)
    if 'public comment' in c: return {'comment received': 'No public comments received.', 'comments received': 'No public comments received.', 'actions taken': 'None required.'}.get(l)
    if c.startswith(('risks to stakeholders', 'labor', 'human rights', 'indigenous', 'property rights')):
        return {'risk category': cap.replace(' risks', ''), 'risks identified': 'No material risk identified for household filter distribution and maintenance.', 'risk identified': 'No material risk identified.',
                'mitigation or preventive measure(s) taken': 'Maintenance staff contracts follow national labour law; grievance channel open to all.', 'mitigation(s) or preventive measure taken': 'Not applicable - no Indigenous Peoples or cultural heritage are affected.'}.get(l)
    if c.startswith('implementation schedule') or c.startswith('general implementation'): return None
    if c.startswith('methodology details') or c.startswith('applicability of methodology') or c.startswith('ghg sources'): return None
    if c.startswith('eligibility of methodology'):
        return {'methodology eligibility': 'VMR0015 v1.0 is an active Verra methodology applicable to low-GHG safe drinking water production systems.', 'geographic eligibility': 'No geographic restriction in AMS-III.AV v09.0 or VMR0015 v1.0; Tanzania is eligible.', 'capacity limit eligibility': NA_CAP}.get(l)
    if c.startswith('additionality'): return 'VT0008 Additionality Assessment (VMR0015 s7(a))'
    if c.startswith('summary of data'): return None
    if na: return na
    DEFAULTS.append(f'{doc} {sec} | {cap} | {lab}')
    return 'See the corresponding section of this document.'

def rows_for(doc, sec, cap, cols):
    c = cap.lower()
    P = E['pd']; M = E['mr']
    if 'vintage' in c and 'estimated net' in c:
        return [{'Vintage period start': r['vs'], 'Vintage period end': r['ve'], 'Estimated net reductions and removals (tCO2e)': r6(r['ER'])} for r in P['rows']]
    if c.startswith('estimated reductions and removals (no non'):
        return [{'Vintage period start': r['vs'], 'Vintage period end': r['ve'], 'Estimated baseline emissions (tCO2e)': r6(r['BE']), 'Estimated project emissions (tCO2e)': r6(r['PE']), 'Estimated leakage emissions (tCO2e)': 0,
                 'Estimated net reductions (tCO2e)': r6(r['ER']), 'Estimated net removals (tCO2e)': 0, 'Total estimated net reductions and removals (tCO2e)': r6(r['ER'])} for r in P['rows']]
    if c.startswith(('reductions and removals (no non', 'achieved reductions and removals (no non')):
        return [{'Country': 'United Republic of Tanzania', 'Methodology': 'VMR0015 v1.0', 'Vintage period start': M['ps'], 'Vintage period end': M['pe'], 'Net baseline emissions (tCO2e)': r6(M['BE']), 'Net project emissions (tCO2e)': r6(M['PE']),
                 'Leakage emissions (tCO2e)': 0, 'Total net reductions (tCO2e)': r6(M['ER']), 'Total net removals (tCO2e)': 0, 'Total net reductions and removals (tCO2e)': r6(M['ER'])}]
    if c.startswith('total reductions and removals by vintage'):
        return [{'Vintage period start': M['ps'], 'Vintage period end': M['pe'], 'Total net reductions (minus buffer pool allocation) (tCO2e)': r6(M['ER']), 'Total net removals (minus buffer pool allocation) (tCO2e)': 0, 'Total net reductions and removals (minus buffer pool allocation) (tCO2e)': r6(M['ER'])}]
    if c.startswith('ex-ante vs ex-post'):
        return [{'Vintage period start': M['ps'], 'Vintage period end': M['pe'], 'Ex-ante estimated reductions/ removals': str(r6(M['exA'])), 'Achieved reductions/ removals': str(r6(M['ER'])), 'Percentage difference': f"{M['pct']:.2f} %", 'Percent difference': f"{M['pct']:.2f} %",
                 'Explanation for the difference': 'Functionality 93% against 95% planned and 12.54 million litres metered against the planned volume (MR section 5.5).'}]
    if c.startswith('methodology details'):
        base = [('Methodology', 'VMR0015', '1.0', 'Revision to AMS-III.AV: Low Greenhouse Gas Emitting Safe Drinking Water Production Systems'), ('Methodology', 'AMS-III.AV', '09.0', 'Low greenhouse gas emitting safe drinking water production systems'),
                ('Tool', 'VT0010', '1.1', 'Emissions from Electricity Consumption and Generation'), ('Tool', 'VT0008', '1.0', 'Additionality Assessment'), ('Tool', 'CDM TOOL03', '03.0', 'Tool to calculate project or leakage CO2 emissions from fossil fuel combustion'),
                ('Tool', 'CDM TOOL33', '03.0', 'Default values for common parameters'), ('Standard', 'CDM Sampling and surveys', '09.0', 'Standard: Sampling and surveys for CDM project activities and programmes of activities')]
        return [{'Type': a, 'Methodology, module, or tool ID number': b, 'Version': v, 'Name': n, 'Assessment and conclusion': 'Applicable version applied correctly.'} for a, b, v, n in base]
    if c.startswith('applicability of methodology'):
        conds = [('Para 2: water kiosks using solar disinfection', 'Not applicable - no water kiosk uses solar disinfection.'), ('Para 3: soil filtration schemes', 'Not applicable - no boreholes or wells.'),
                 ('Para 4(a): no public SDW network before the project', 'Met - district infrastructure register and the November 2026 network check.'), ('Para 4(b): technology meets the performance standard', 'Met - accredited laboratory challenge-water testing to TZS 789 (Annex 5).'),
                 ('Para 4(c): replacement systems', 'Not applicable - rated life 7 years exceeds the 5-year crediting period.'), ('Para 4(d): microbiologically safe water delivered', 'Met - 40 installed filters tested below 1 cfu E. coli per 100 ml (Annex 7).'),
                 ('VMR0015 s4: REDD+ double-counting assessment', 'Assessed and reported - no overlapping REDD+ project or programme.')]
        return [{'Methodology, module, or tool ID': 'AMS-III.AV v09.0 / VMR0015 v1.0', 'Methodology ID': 'AMS-III.AV v09.0 / VMR0015 v1.0', 'Applicability condition': a, 'Justification of conformance': b,
                 'Assessment process': 'Reviewed the evidence named in PD section 3.2.2.', 'Assessment conclusion': b} for a, b in conds]
    if c.startswith(('ghg sources', 'project boundary: ghg')):
        src = [('Baseline: boiling water with woody biomass', 'Source', 'CO2', 'Yes', 'Main baseline emission (VMR0015 Eq.(1)), non-renewable share via fNRB'),
               ('Baseline: boiling water with woody biomass', 'Source', 'CH4 and N2O', 'Yes', 'Non-CO2 emission factor 9.46 tCO2e/TJ (VMR0015 s9.1)'),
               ('Project: electricity consumption of the devices', 'Source', 'CO2', 'Yes', 'VT0010 (VMR0015 s8.2)'), ('Project: fossil fuel use', 'Source', 'CO2', 'Yes', 'CDM TOOL03 (AMS-III.AV para 23)'),
               ('Leakage: non-renewable biomass', 'Source', 'CO2', 'Yes', 'Through the adjustment factor Adj_LE in Eq.(1) (VMR0015 s8.3)')]
        return [{'Source/Sink': a, 'Type': t, 'Gas': g, 'Included?': i, 'Explanation': e, 'Conclusion': 'Correctly included.'} for a, t, g, i, e in src]
    if c.startswith(('laws', 'laws reviewed')):
        lw = [('Water Supply and Sanitation Act, 2019 (Tanzania)', 'Household treatment devices do not require a water supply licence; the district council recognises the programme (MoU Ref. MDC/WS/2026/14).'),
              ('Environmental Management Act, 2004 (Cap. 191, Tanzania)', 'No environmental impact assessment is required for household point-of-use devices (district confirmation, Annex 3).')]
        return [{'Name of law or regulatory framework': a, 'Explanation of compliance': b, 'Explanation of how it applies to the project': 'No law requires households to use water filters, so the project is not required by law (regulatory surplus).' if 'surplus' in c else b} for a, b in lw]
    if c.startswith(('implementation schedule', 'general implementation')):
        sch = [('2026-10-12', '2026-10-16', 'Stakeholder consultation', 'Village meetings in the four zones'), ('2026-11-20', '2026-12-10', 'Validation', 'Validation by ' + sc.VVB_NAME),
               ('2027-01-01', '2027-03-31', 'Project start and distribution', '3,000 filters distributed and installed'), ('2027-01-01', '2027-12-31', 'First monitoring period', 'Metering, functionality survey and water-quality checks')]
        return [{'Date': a, 'Date from': a, 'Date to': b, 'Milestone or action': m, 'Description': d} for a, b, m, d in sch]
    if c.startswith('summary of data'):
        pars = [('QPW_y', 'Quantity of purified water in the period', 'litres', '12,540,000 (sum of sections)', 'AMS-III.AV Eq.(2)', 'Continuous (meters), aggregated annually'),
                ('m', 'Fraction of functional appliances providing safe water', 'fraction', '0.93', 'VMR0015 Eq.(1)', 'Annual survey'), ('P_y', 'Persons served', 'persons', '11,820', 'AMS-III.AV Eq.(3)', 'Annual'),
                ('EC_PE,A', 'Grid electricity consumed', 'MWh', '2.92', 'VT0010 Eq.(6)', 'Annual')]
        return [{'Data/parameter name': a, 'Description': b, 'Data unit': u, 'Value applied': v, 'Equation number': e, 'Monitoring frequency': f} for a, b, u, v, e, f in pars]
    if c.startswith('document history'):
        return [{'Document file name': f'{sc.PROJECT_ID}_PD_v1.0.pdf', 'File name': f'{sc.PROJECT_ID}_{doc}_v1.0.pdf', 'Description': 'First version'}]
    if c.startswith('audit history'):
        if doc == 'PD': return None
        return [{'Audit type': 'Verification', 'Date of opening meeting': '2028-01-08', 'Program': 'VCS', 'Validation/ verification body name': sc.VVB_NAME, 'Monitoring period start': sc.MP_START, 'Monitoring period end': sc.MP_END}]
    return None

def fill_obj(doc, sid, obj):
    """fill absent template fields of obj (schema sid), recursing into present objects/arrays"""
    j = files.get(sid.split('&')[0])
    if not j: return
    for k, v in j['document'].get('properties', {}).items():
        if k in SKIP: continue
        r = v.get('$ref') or (v.get('items') or {}).get('$ref')
        d = v.get('description') or ''
        isnew = ' template v5.0' in d and d.startswith('VCS ')
        if k in obj:
            if r and isinstance(obj[k], dict): fill_obj(doc, r, obj[k])
            elif r and isinstance(obj[k], list):
                for x in obj[k]:
                    if isinstance(x, dict): fill_obj(doc, r, x)
            continue
        if not isnew: continue
        m = DESC.search(d)
        sec, cap, lab = (m.group(1), m.group(2), m.group(3)) if m else ('', v.get('title', ''), v.get('title', ''))
        if lab is None: lab = v.get('title')
        if r and v.get('type') == 'array':
            rs = files.get(r.split('&')[0])
            cols = [(kk, vv.get('title')) for kk, vv in rs['document']['properties'].items() if kk not in SKIP]
            given = rows_for(doc, sec, cap, cols)
            rows = []
            for gr in (given or [None]):
                row = {}
                for kk, title in cols:
                    vv = rs['document']['properties'][kk]
                    if gr is not None and title in gr: val = gr[title]
                    elif vv.get('type') == 'number': continue
                    else: val = text(doc, sec, cap, title)
                    if val is None: continue
                    if vv.get('type') == 'number' and isinstance(val, str): continue
                    if vv.get('type') == 'string' and not isinstance(val, str): val = str(val)
                    row[kk] = val
                fill_obj(doc, r, row)
                if row: rows.append(row)
            if rows: obj[k] = rows
        elif r:
            sub = {}
            fill_obj(doc, r, sub)
            if sub: obj[k] = sub
        else:
            if v.get('type') == 'number':
                if cap.lower().startswith('verification period and verified total'):
                    obj[k] = r6(E['mr']['ER']); continue
                if cap.lower().startswith('crediting period totals'):
                    val = {'Total estimated net reductions and removals in this crediting period': r6(E['pd']['total']), 'Total number of years in this crediting period': 5, 'Average annual net reductions and removals in this crediting period': r6(E['pd']['rows'][0]['ER'])}.get(lab)
                    if val is not None: obj[k] = val
                continue
            val = text(doc, sec, cap, lab)
            if cap.lower().startswith('crediting period totals'):
                val = {'Total estimated net reductions and removals in this crediting period': f"{E['pd']['total']:.6f} tCO2e", 'Total number of years in this crediting period': '5', 'Average annual net reductions and removals in this crediting period': f"{E['pd']['rows'][0]['ER']:.6f} tCO2e"}.get(lab)
            if val is not None: obj[k] = val

IRI = {'PD': '#ecc894cb-0f25-41b9-b3ef-9b6c219fb15a', 'MR': '#9891e08d-c6ed-4645-9c5e-e111daaf37f5', 'VAL': '#604e92b9-8243-4499-b057-e6cfc8899e7f', 'VER': '#98d44a6c-9ea5-454e-8ebb-9f44d522da65'}
RO = {'MR': ('projectRef', 'pdRef', 'templateVersion'), 'VAL': ('projectRef',), 'VER': ('monitoringReportRef', 'projectRef', 'ERcalculated')}
for name, iri in IRI.items():
    full = json.load(open(f'{sdir}/{name}.full.json'))
    before = len(json.dumps(full))
    fill_obj(name, iri, full)
    json.dump(full, open(f'{sdir}/{name}.full.json', 'w'), indent=1, ensure_ascii=False)
    dr = json.load(open(f'{sdir}/{name}.json'))
    dr['document'] = {k: v for k, v in full.items() if k not in RO.get(name, ())}
    json.dump(dr, open(f'{sdir}/{name}.json', 'w'), indent=1, ensure_ascii=False)
    print(name, 'size', before, '->', len(json.dumps(full)))
print('defaulted fields:', len(DEFAULTS))
for x in sorted(set(DEFAULTS))[:60]: print('  ', x)
