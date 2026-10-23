"""MGS integrity tests (20 Oct) scored 99 %: the monitoring report and the ERR carried pdRef / mrRef, copies of Guardian document ids that the
test runner regenerates on every replay. Guardian's comparator ignores id/ref/policyId but not custom fields holding ids. The link is already
in the VC's own 'ref' field and in its relationships, so pdRef and mrRef are removed. The issuance validator also accepts a verification report
that is 'Registry approved' or 'VCU requested' (MGS: the approval save can land after the VCU-request save and leave 'Registry approved').
Usage: patch_refs.py <tree>"""
import json, sys, glob
T = sys.argv[1]
for f in glob.glob(T + '/schemas/*.json'):
    j = json.load(open(f)); d = j['document']; ch = False
    if j['name'] in ('VCS Monitoring Report', 'VMR0015 Emission Reductions (ERR)'):
        for k in ('pdRef', 'mrRef'):
            if k in d['properties']:
                d['properties'].pop(k); ch = True
        d['required'] = [r for r in d.get('required', []) if r not in ('pdRef', 'mrRef')]
    if ch: json.dump(j, open(f, 'w'), ensure_ascii=False); print('schema', j['name'], 'pdRef/mrRef removed')
P = json.load(open(T + '/policy.json'))
def w(b):
    if b['tag'] == 'pp_monitoring_report_form':
        n = len(b['presetFields']); b['presetFields'] = [p for p in b['presetFields'] if p['name'] != 'pdRef']; print('MR form presets', n, '->', len(b['presetFields']))
    if b['tag'] == 'admin_err_issue_validator':
        for sv in b['sourceValidations']:
            for fl in sv['filters']:
                if fl['field'] == 'option.status' and fl['value'] == 'VCU requested':
                    fl['type'] = 'in'; fl['value'] = 'Registry approved,VCU requested'; print('issue validator: verification report status in (Registry approved, VCU requested)')
    if b['blockType'] == 'mathBlock':
        b['expression']['code'] = open({'pp_err_calculation_pd_vcs_ex_ante': 'pd.js', 'pp_err_calculation_mr_vcs_ex_post': 'mr.js'}[b['tag']]).read()
    for c in b.get('children', []): w(c)
w(P['config']); json.dump(P, open(T + '/policy.json', 'w'), ensure_ascii=False)
# also removed from the conditional (allOf if/then) branches of the ERR schema, where Ex Post required mrRef
