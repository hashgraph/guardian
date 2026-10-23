"""MGS 20 Oct fixes. (1) The verification-report form (editType 'edit') makes the ERR a previous version (edited = true); every ERR list used
hidePreviousVersions, so the ERR vanished and could not be re-opened or re-verified. ERR lists and the two guard sources now list all versions.
(2) vb_validation_precheck becomes a child of the validation-report form, so Guardian runs it before anything is saved and returns its message.
Usage: patch_hideprev.py <tree>"""
import json, sys
T = sys.argv[1]; P = json.load(open(T + '/policy.json')); BY, PAR = {}, {}
def w(b, p=None):
    BY[b['tag']] = b; PAR[b['tag']] = p
    for c in b.get('children', []): w(c, b)
w(P['config'])
for t in ('admin_emission_reduction_removal_source', 'pp_emission_reduction_removal_source', 'vb_emission_reduction_removal_source', 'admin_err_reopen_guard_source', 'admin_err_issue_guard_source'):
    BY[t]['hidePreviousVersions'] = False; print('hidePreviousVersions off:', t)
v = BY['vb_validation_precheck']; par = PAR['vb_validation_precheck']; form = BY['vb_validation_report_form']
if v in par['children']:
    par['children'].remove(v); form.setdefault('children', []).append(v); print('vb_validation_precheck moved into vb_validation_report_form')
json.dump(P, open(T + '/policy.json', 'w'), ensure_ascii=False)
