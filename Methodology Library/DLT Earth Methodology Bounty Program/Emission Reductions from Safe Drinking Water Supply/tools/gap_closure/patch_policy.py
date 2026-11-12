"""Gap closure, 20 Oct: schemas and blocks. Usage: patch_policy.py <tree> <A|B> <dir with pd.js, mr.js>"""
import json, glob, sys, uuid, copy, re

T, V, CODE = sys.argv[1], sys.argv[2], sys.argv[3]
TXT = 'https://www.schema.org/text'
files, by = {}, {}
for f in glob.glob(T + '/schemas/*.json'):
    j = json.load(open(f)); files[f] = j; by[j['iri'].split('&')[0]] = j
def schema(name):
    hits = [j for j in by.values() if j['name'] == name]
    assert len(hits) == 1, (name, len(hits)); return hits[0]
def fpath(j): return [f for f, x in files.items() if x is j][0]
def save(j): json.dump(j, open(fpath(j), 'w'), ensure_ascii=False)
def com(term, pos, extra=None, at=TXT):
    c = {'term': term, '@id': at}
    if extra: c.update(extra)
    c.setdefault('availableOptions', []); c['orderPosition'] = pos
    return json.dumps(c, separators=(',', ':'))
def nextpos(props):
    mx = -1
    for x in props.values():
        try: mx = max(mx, int(json.loads(x.get('$comment') or '{}').get('orderPosition', -1)))
        except Exception: pass
    return mx + 1
def field(props, key, title, typ, desc='', enum=None):
    assert key not in props, key
    p = {'title': title, 'description': title + (': ' + desc if desc else ''), 'readOnly': False, 'type': typ}
    if enum: p['enum'] = enum
    p['$comment'] = com(key, nextpos(props), {'customType': 'enum'} if enum else None)
    props[key] = p
SYS_PROPS = None
def new_schema(name, desc, fields):
    """fields: list of (key, title, type, desc, enum, required)"""
    global SYS_PROPS
    base = schema('VMR0015 Water Quantity Record - Option 1')
    if SYS_PROPS is None: SYS_PROPS = {k: copy.deepcopy(v) for k, v in base['document']['properties'].items() if k in ('@context', 'type', 'id')}
    u = str(uuid.uuid4()); iri = '#' + u
    j = copy.deepcopy(base)
    j.update({'uuid': u, 'iri': iri, 'name': name, 'description': desc, 'contextURL': 'schema:' + u, 'defs': [], 'errors': [], 'topicId': None, 'messageId': None, 'documentURL': None})
    j.pop('id', None)
    props = copy.deepcopy(SYS_PROPS); req = ['@context', 'type']
    for key, title, typ, fdesc, enum, rq in fields:
        field(props, key, title, typ, fdesc, enum)
        if rq: req.append(key)
    j['document'] = {'$id': iri, '$comment': json.dumps({'@id': 'schema:' + u + '#' + u, 'term': u}), 'title': name, 'description': desc, 'type': 'object', 'properties': props, 'required': req, 'additionalProperties': False}
    f = T + '/schemas/' + iri + '.json'; files[f] = j; by[iri] = j; save(j)
    return j
def table(parent, key, title, child, desc):
    props = parent['document']['properties']; assert key not in props
    u = child['iri'].lstrip('#')
    props[key] = {'title': title, 'description': title + ': ' + desc, 'readOnly': False, 'type': 'array', 'items': {'$ref': child['iri']},
                  '$comment': com(key, nextpos(props), at='schema:' + parent['iri'].split('&')[0].lstrip('#') + '#' + u)}
log = []

# ---------- F7: QPW option 1 metering sample (AMS-III.AV table 10(a)) ----------
BASIS = ['All appliances in the section metered (no scale-up)',
         'Statistically valid sample, metered continuously (AMS-III.AV table 10(a), first option)',
         'Statistically valid sample, metered over a representative period (AMS-III.AV table 10(a), second option)',
         'Water kiosk, continuous flow meter or standard vessel (AMS-III.AV table 10(b))']
o1 = schema('VMR0015 Water Quantity Record - Option 1'); p = o1['document']['properties']
field(p, 'samplingBasis', 'Sampling basis of this record', 'string', 'AMS-III.AV table 10. Sample records are scaled to the section: continuous sample x appliances in service / appliances covered; representative-period sample x appliance-days in service / (appliances covered x days measured). Empty means all appliances metered.', BASIS)
field(p, 'appliancesCovered', 'Appliances covered by this record (number)', 'number', 'For a sample record, the number of appliances whose metered volume is summed in this record')
save(o1); log.append('option 1 record: samplingBasis, appliancesCovered')
ms = schema('VMR0015 Project Section - MR (monitored)'); p = ms['document']['properties']
field(p, 'appliancesInService', 'Appliances in service in the section during the period (number)', 'number', 'Needed when QPW option 1 uses a metering sample (AMS-III.AV table 10(a))')
field(p, 'applianceDaysInService', 'Appliance-days in service in the period (appliance-days)', 'number', 'Optional, for a representative-period sample: sum over appliances of the days each was in service; default appliances in service x days in the period')
save(ms); log.append('MR section: appliancesInService, applianceDaysInService')

# ---------- F12: TOOL03 per fuel/source rows, VT0010 per load and per plant-fuel rows ----------
SRC = ['Fossil fuel used directly by the water purification system',
       'Dedicated power plant supplying the project (VT0010 Scenario D1 off-grid or D2 back-up; VT0010 s5.4.1.1 uses TOOL03)',
       'Other combustion source within the project boundary']
t3 = new_schema('TOOL03 fuel combustion row (fuel i, source j)', 'CDM TOOL03 Eq.(1)-(4): one row per fuel type i and combustion source j; PE_FF,y = SUM FC_i,j,y x COEF_i,y',
    [('sourceId', 'Source j (ID)', 'string', 'Combustion source, e.g. generator G1', None, True),
     ('sourceType', 'Source type', 'string', 'Purpose of the source', SRC, True),
     ('fuelType', 'Fuel type i', 'string', 'e.g. diesel', None, True),
     ('tool03Option', 'TOOL03 COEF option', 'string', 'Option A: COEF = w_C x 44/12 (mass, Eq.(2)) or w_C x rho x 44/12 (volume, Eq.(3)); Option B: COEF = NCV x EF_CO2 (Eq.(4))', ['Option A - carbon mass fraction (TOOL03 Eq.(2) mass unit, Eq.(3) volume unit)', 'Option B - net calorific value x CO2 emission factor (TOOL03 Eq.(4))'], True),
     ('fcMeasuredIn', 'FC_i,j,y is measured in', 'string', 'Mass or volume unit', ['Mass unit', 'Volume unit'], True),
     ('FC_i_j_y', 'FC_i,j,y - fuel combusted in source j (mass or volume unit/yr)', 'number', '', None, True),
     ('w_C_i_y', 'w_C,i,y - carbon mass fraction (t C/mass unit), Option A', 'number', '', None, False),
     ('rho_i_y', 'rho_i,y - density (mass/volume unit), Option A with volume', 'number', '', None, False),
     ('NCV_i_y', 'NCV_i,y - net calorific value (GJ/mass or volume unit), Option B', 'number', '', None, False),
     ('EF_CO2_i_y', 'EF_CO2,i,y - CO2 emission factor (t CO2/GJ), Option B', 'number', '', None, False)])
gl = new_schema('VT0010 grid load row (load L; Scenarios A and B)', 'Verra VT0010 v1.1 Eq.(5), (7)-(9): one row per electricity load L',
    [('loadId', 'Load L (ID)', 'string', 'Grid connection or metered load', None, True),
     ('EC_Grid_L', 'EC_Grid,L - electricity consumed by load L from the grid connection (MWh/yr)', 'number', '', None, True),
     ('EF_PE_A_L', 'EF_PE,A,L - grid emission factor (t CO2/MWh)', 'number', 'Empty uses the value in A2.1.3', None, False),
     ('TDL_PE_A_L', 'TDL_PE,A,L - transmission and distribution losses (fraction)', 'number', 'VT0010 default 0.20 for project consumption where no documented value exists', None, True),
     ('EG_PBWA', 'EG_PBWA - electricity supplied to load L under a purpose-built wheeling arrangement (MWh/yr), Scenario B', 'number', '', None, False),
     ('TDL_PE_B', 'TDL_PE,B - losses for the wheeled electricity (fraction), Scenario B', 'number', '', None, False),
     ('EF_PE_B', 'EF_PE,B - emission factor of the wheeling plant (t CO2/MWh), Scenario B', 'number', '', None, False)])
sp = new_schema('VT0010 shared plant fuel row (plant n, fuel f; Scenario C)', 'Verra VT0010 v1.1 Eq.(11), (13), (14): one row per fuel f of each shared power plant n; plant values are read from the first row of the plant',
    [('plantId', 'Plant n (ID)', 'string', '', None, True),
     ('EC_PE_SPP_n', 'EC_PE,SPP,n - electricity from plant n consumed by the project (MWh/yr), plant value', 'number', '', None, False),
     ('EG_n', 'EG_n - net electricity generated by plant n (MWh/yr), plant value', 'number', '', None, False),
     ('HG_n', 'HG_n - heat generated by plant n (GJ/yr), plant value, cogeneration only', 'number', '', None, False),
     ('eta_cogen_n', 'eta_cogen,n - cogeneration efficiency (fraction), plant value', 'number', '', None, False),
     ('EF_PE_SPP_n', 'EF_PE,SPP,n - typed emission factor (t CO2/MWh), used only without fuel data', 'number', '', None, False),
     ('fuelType', 'Fuel f', 'string', '', None, True),
     ('Q_n_f', 'Q_n,f - fuel f combusted in plant n (mass or volume unit/yr)', 'number', '', None, False),
     ('NCV_f', 'NCV_f - net calorific value (GJ/unit)', 'number', '', None, False),
     ('EF_CO2_f', 'EF_CO2,f - CO2 emission factor (t CO2/GJ)', 'number', '', None, False)])
for nm in ('VMR0015 A2.2.2 TOOL03 monitored parameters - PD (estimate)', 'VMR0015 A2.2.2 TOOL03 monitored parameters - MR (value monitored)'):
    j = schema(nm); table(j, 'fuelCombustionRows', 'TOOL03 per fuel and source (table)', t3, 'Several fuels or combustion sources: one row each; when rows are given they replace the single values above'); save(j)
for nm in ('VMR0015 A2.2.3 VT0010 / VT0011 monitored parameters - PD (estimate)', 'VMR0015 A2.2.3 VT0010 / VT0011 monitored parameters - MR (value monitored)'):
    j = schema(nm)
    table(j, 'gridLoadRows', 'VT0010 per grid load (table)', gl, 'Several loads L: one row each; when rows are given they replace the single values above')
    table(j, 'sharedPlantFuelRows', 'VT0010 per shared plant and fuel (table)', sp, 'Several shared plants n or fuels f: one row per plant and fuel')
    save(j)
log.append('A2.2.2 / A2.2.3: per-source tables')

# ---------- F9: methodology records labelled as part of Appendix 2 ----------
for form, t in (('VCS Project Description', 'Appendix 2 (continued): VMR0015 data and parameters by project section and fuel'),
                ('VCS Monitoring Report', 'Appendix 2 (continued): VMR0015 data and parameters monitored by project section')):
    j = schema(form); x = j['document']['properties']['methodologyRecords']
    old = x.get('title', ''); x['title'] = t
    x['description'] = t + ': per-section and per-fuel records (VMR0015 s9.3(2): reductions are calculated section by section); single values in the Appendix 2 tables above are checked against them'
    save(j); log.append(f'{form}: methodologyRecords "{old}" -> "{t}"')

# ---------- F10: PD 1.7 inside section 1, in template order ----------
pd = schema('VCS Project Description'); pp = pd['document']['properties']
k17 = 'section1_7_v50' + V
s1 = by[pp['section1']['$ref'].split('&')[0]]
x = pp.pop(k17); pd['document']['required'] = [r for r in pd['document']['required'] if r != k17]
x['title'] = re.sub(r'\s*\(v5\.0[AB]\)$', '', x['title']); x['description'] = x['title']
c = json.loads(x['$comment']); c['@id'] = 'schema:' + s1['iri'].split('&')[0].lstrip('#') + '#' + x['$ref'].split('&')[0].lstrip('#'); x['$comment'] = json.dumps(c)
sprops = s1['document']['properties']; new = {}
for k, v in sprops.items():
    new[k] = v
    if k == 'otherEntities': new[k17] = x
assert k17 in new
for i, (k, v) in enumerate([(k, v) for k, v in new.items() if v.get('$comment') and k not in ('@context', 'type', 'id')]):
    cc = json.loads(v['$comment']); cc['orderPosition'] = i; v['$comment'] = json.dumps(cc)
s1['document']['properties'] = new; s1['document'].setdefault('required', []).append(k17)
save(pd); save(s1); log.append(f'{k17} moved into section 1 after 1.6')

# ---------- blocks ----------
P = json.load(open(T + '/policy.json'))
BY, PAR = {}, {}
def idx(b, par=None):
    BY[b['tag']] = b; PAR[b['tag']] = par
    for c in b.get('children', []): idx(c, b)
idx(P['config'])
VER, VCU, PDS = '#98d44a6c-9ea5-454e-8ebb-9f44d522da65', '#058aef89-3fdb-4f9b-8066-2b298854a6e0&1.0.1', '#ecc894cb-0f25-41b9-b3ef-9b6c219fb15a'
VAL = '#604e92b9-8243-4499-b057-e6cfc8899e7f'
# Guardian 3.7.1-rc (MGS) has no allowEmptySource: a source validation that finds no document fails. The "none may exist" rules move to customLogic checks.
for t in ('pp_vcu_request_precheck', 'admin_err_reopen_validator', 'admin_err_issue_validator'):
    b = BY[t]; n0 = len(b['sourceValidations'])
    b['sourceValidations'] = [sv for sv in b['sourceValidations'] if not sv.get('allowEmptySource')]
    log.append(f'{t}: removed {n0 - len(b["sourceValidations"])} allowEmptySource rule(s)')
SUBJ = """function subject(d) { var s = d && d.document && d.document.credentialSubject; if (!s) return {}; return Array.isArray(s) ? (s[0] || {}) : s; }
function key(v) { return String(v === undefined || v === null ? '' : v).trim().toLowerCase(); }
var doc = documents && documents[0];
if (!doc) { throw new Error('No document to check'); }
var mine = subject(doc), list = sources || [];
"""
GUARDS = {
 'admin_err_reopen_guard': ('OWNER', VER, """// Double issuance guard: an ERR is re-opened only while no verification report of its monitoring report is pending, approved or used for issuance.
for (var i = 0; i < list.length; i++) {
  var s = list[i]; var st = s && s.option && s.option.status;
  if (st !== 'Waiting for Approval' && st !== 'Registry approved' && st !== 'VCU requested') continue;
  var o = subject(s);
  if (key(o.monitoringReportRef) === key(mine.mrId) && key(o.projectRef) === key(mine.projectId)) {
    throw new Error('Cannot re-open: verification report ' + (o.verificationId || '') + ' for monitoring report ' + mine.mrId + ' is ' + st + '; re-open is only for an ERR whose verification was rejected and that has no other verification pending, approved or used for issuance');
  }
}
done(doc);"""),
 'admin_err_issue_guard': ('OWNER', VCU, """// Double issuance guard: VCUs are issued at most once per monitoring report.
for (var i = 0; i < list.length; i++) {
  var s = list[i]; if (!s || (doc.id && s.id === doc.id)) continue;
  if (!(s.option && s.option.status === 'Issued')) continue;
  var o = subject(s);
  if (key(o.monitoringReportRef) === key(mine.monitoringReportRef) && key(o.projectRef) === key(mine.projectRef)) {
    throw new Error('VCUs were already issued for monitoring report ' + mine.monitoringReportRef + ' of project ' + mine.projectRef + ' (request ' + (o.requestId || s.id || '') + '); a monitoring report is credited once');
  }
}
done(doc);"""),
 'pp_project_id_unique': ('Project Proponent', PDS, """// Project IDs join the PD, validation, monitoring, verification and issuance documents, so they must be unique across all project proponents.
if (!key(mine.projectId)) { throw new Error('Project ID is required'); }
for (var i = 0; i < list.length; i++) {
  var s = list[i]; if (!s || (doc.id && s.id === doc.id)) continue;
  var st = s.option && s.option.status;
  if (st === 'Third-party verifier rejected' || st === 'Registry rejected') continue;
  if (key(subject(s).projectId) === key(mine.projectId)) {
    throw new Error('Project ID ' + mine.projectId + ' is already used by another project description in this policy (status ' + (st || 'unknown') + '); use a unique project ID');
  }
}
done(doc);"""),
}
tmpl = BY['pp_mr_period_overlap']
def guard(tag, role, sch, code):
    b = copy.deepcopy(tmpl); b['id'] = str(uuid.uuid4()); b['tag'] = tag; b['permissions'] = [role]; b['expression'] = SUBJ + code
    src = b['children'][0]; src['id'] = str(uuid.uuid4()); src['tag'] = tag + '_source'; src['permissions'] = [role]; src['schema'] = sch
    src['onlyOwnDocuments'] = False; src['filters'] = []
    return b
def insert_after(after_tag, blk):
    par = PAR[after_tag]; kids = par['children']; kids.insert(kids.index(BY[after_tag]) + 1, blk); BY[blk['tag']] = blk; PAR[blk['tag']] = par
for t, (role, sch, code) in GUARDS.items():
    if t in BY: continue
    after = {'admin_err_reopen_guard': 'admin_err_reopen_validator', 'admin_err_issue_guard': 'admin_err_issue_validator', 'pp_project_id_unique': 'pp_project_description_form'}[t]
    insert_after(after, guard(t, role, sch, code)); log.append(f'added customLogic check {t} after {after}')
# the reopen validator had an explicit event to the save block: route it through the guard
for e in BY['admin_err_reopen_validator'].get('events', []):
    if e.get('target') == 'admin_err_reopen_save': e['target'] = 'admin_err_reopen_guard'
# F13: a project is registered only when its validation report is registry-approved with the opinion 'Validated'
if 'admin_pp_pd_register_check' not in BY:
    v = copy.deepcopy(BY['vb_validation_precheck']); v['id'] = str(uuid.uuid4()); v['tag'] = 'admin_pp_pd_register_check'; v['permissions'] = ['OWNER']
    v['conditions'] = []; v['schema'] = PDS; v['stopPropagation'] = False; v['events'] = []; v['children'] = []
    v['sourceValidations'] = [{'schema': VAL, 'filters': [{'field': 'option.status', 'type': 'equal', 'value': 'Registry approved', 'typeValue': 'value'},
        {'field': 'document.credentialSubject.0.projectRef', 'type': 'equal', 'typeValue': 'variable', 'value': 'document.credentialSubject.0.projectId'}],
        'conditions': [{'field': 'document.credentialSubject.0.validationOpinion', 'type': 'equal', 'value': 'Validated', 'valueSource': 'value', 'fieldSource': 'source'}], 'dbCollection': 'VcDocument'}]
    v.setdefault('uiMetaData', {}); v['uiMetaData']['title'] = 'Registration requires a registry-approved validation report with the opinion Validated'
    par = PAR['admin_pp_pd_approve_save']; par['children'].insert(par['children'].index(BY['admin_pp_pd_approve_save']), v); BY[v['tag']] = v; PAR[v['tag']] = par
    for e in BY['admin_pp_pd_grid']['events']:
        if e.get('output') == 'admin_pp_pd_approve_button': e['target'] = 'admin_pp_pd_register_check'
    log.append('added admin_pp_pd_register_check before admin_pp_pd_approve_save')
# calculation code
for t, fn in (('pp_err_calculation_pd_vcs_ex_ante', 'pd.js'), ('pp_err_calculation_mr_vcs_ex_post', 'mr.js')):
    BY[t]['expression']['code'] = open(CODE + '/' + fn).read()
json.dump(P, open(T + '/policy.json', 'w'), ensure_ascii=False)
print('\n'.join(log))
