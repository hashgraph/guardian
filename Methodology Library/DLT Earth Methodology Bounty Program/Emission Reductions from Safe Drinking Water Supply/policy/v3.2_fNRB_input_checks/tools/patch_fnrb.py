"""Patch the fNRB source precedence and the UNFCCC-value range check into both VMR0015 mathBlocks.

Usage: python3 -I patch_fnrb.py <extracted policy dir>
Edits <dir>/policy.json in place. Every replacement must match exactly once per mathBlock, or the script stops.

How the v3.2 files in policy/v3.2_fNRB_input_checks/without_integrity_test/ were made (run from the package root):
    mkdir /tmp/a && (cd /tmp/a && unzip -q "$OLDPWD/policy/without_integrity_test/VMR0015_Safe_Drinking_Water_dMRV_v3.1_VCS-v5.0A.policy")
    python3 -I policy/v3.2_fNRB_input_checks/tools/patch_fnrb.py /tmp/a
    python3 -I tools/template_build/rezip.py policy/without_integrity_test/VMR0015_Safe_Drinking_Water_dMRV_v3.1_VCS-v5.0A.policy /tmp/a out.policy
and the same for v5.0B. rezip.py keeps the zip entry order of the original. Every file inside the output is byte-identical
to the file here; the .policy zip itself differs only in the entry timestamps, so its sha256 does not match.
"""
import json
import sys

OLD_FNRB = """// f_NRB (VMR0015 s9.2): Option 2 = TOOL30 NRB/(NRB+RB) x 0.74 computed here (or the typed TOOL30 value x 0.74); Option 1 = fNRBApplied, else the UNFCCC
// default value; Option 3 = fNRBApplied, else the TOOL33 value. A determination with no value for its own option gives fNRB = 0 for that fuel and a flag
// (the parameter is not determined, so no non-renewable share is credited); it never falls back to the typed fNRB of the baseline fuel row.
function fnrbOf(f) {
  const opt = String(f.option || '');
  if (opt.indexOf('Option 2') === 0) {
    const nrb = N(f.tool30NRB, 0), rb = N(f.tool30RB, 0);
    if ((nrb + rb) > 0) return FX('fnFNRB2', nrb / (nrb + rb) * 0.74, [nrb, rb]);
    return N(f.tool30Value, 0) * 0.74;
  }
  if (N(f.fNRBApplied, 0) > 0) return N(f.fNRBApplied, 0);
  if (opt.indexOf('Option 1') === 0) return N(f.unfcccValue, 0);
  if (opt.indexOf('Option 3') === 0) return N(f.tool33Value, 0);
  return 0;
}"""

NEW_FNRB = """// f_NRB (VMR0015 s9.2: "one of the following sources must be used"): the value comes from the source of the selected option.
// Option 1 = the UNFCCC national default value; Option 2 = TOOL30 NRB/(NRB+RB) x 0.74 computed here (or the typed TOOL30 value x 0.74);
// Option 3 = the TOOL33 default value. Where "f_NRB applied" is also given and differs from that source value by more than 0.005, the source
// value is used and the difference flagged. For options 1 and 3, "f_NRB applied" is used only when the option's own source value is missing,
// with a flag for the VVB. Option 2 never uses it (it may be entered before or after the 26 % discount). A determination with no value for its
// own option gives fNRB = 0 for that fuel and a flag (the parameter is not determined, so no non-renewable share is credited); it never falls
// back to the typed fNRB of the baseline fuel row.
function fnrbSrc(f) {
  const opt = String(f.option || '');
  if (opt.indexOf('Option 2') === 0) {
    const nrb = N(f.tool30NRB, 0), rb = N(f.tool30RB, 0);
    if ((nrb + rb) > 0) return FX('fnFNRB2', nrb / (nrb + rb) * 0.74, [nrb, rb]);
    return N(f.tool30Value, 0) * 0.74;
  }
  if (opt.indexOf('Option 1') === 0) return N(f.unfcccValue, 0);
  if (opt.indexOf('Option 3') === 0) return N(f.tool33Value, 0);
  return 0;
}
function fnrbOf(f) {
  const opt = String(f.option || ''), src = fnrbSrc(f), ap = N(f.fNRBApplied, 0);
  const id = 'fNRB ' + (f.fuelType || f.determinationId || 'fuel');
  const srcName = opt.indexOf('Option 1') === 0 ? 'UNFCCC national default value' : (opt.indexOf('Option 2') === 0 ? 'TOOL30 value x 0.74' : 'TOOL33 default value');
  const note = (m) => { if (flags.indexOf(m) < 0) flags.push(m); };
  if (src > 0) {
    if (ap > 0 && Math.abs(ap - src) > 0.005) note(id + ': f_NRB applied ' + ap + ' differs from the ' + srcName + ' ' + r6(src) + ' of the selected option (' + opt + '); the ' + srcName + ' is used (VMR0015 s9.2: one of the listed sources must be used)');
    return src;
  }
  if (ap > 0 && (opt.indexOf('Option 1') === 0 || opt.indexOf('Option 3') === 0)) {
    note(id + ': the ' + srcName + ' of the selected option (' + opt + ') is not entered, so f_NRB applied ' + ap + ' is used; enter the ' + srcName + ' (VMR0015 s9.2). VVB to confirm the value against its source');
    return ap;
  }
  return 0;
}"""

OLD_RANGE = "    chk(id + ' applied', f.fNRBApplied, 0, 1); chk(id + ' TOOL30 value', f.tool30Value, 0, 1); chk(id + ' TOOL33 value', f.tool33Value, 0, 1);\n"
NEW_RANGE = ("    chk(id + ' applied', f.fNRBApplied, 0, 1); chk(id + ' TOOL30 value', f.tool30Value, 0, 1); chk(id + ' TOOL33 value', f.tool33Value, 0, 1);\n"
             "    chk(id + ' UNFCCC value', f.unfcccValue, 0, 1);   // VMR0015 s9.2 gives the unit as 'Fraction or %': a percentage (62 for 0.62) is caught here\n")

TAGS = ('pp_err_calculation_pd_vcs_ex_ante', 'pp_err_calculation_mr_vcs_ex_post')


def main(d):
    path = d + '/policy.json'
    p = json.load(open(path, encoding='utf-8'))
    done = []

    def walk(b):
        if b.get('blockType') == 'mathBlock' and b.get('tag') in TAGS:
            code = b['expression']['code']
            for old, new, what in ((OLD_FNRB, NEW_FNRB, 'fnrbOf'), (OLD_RANGE, NEW_RANGE, 'range check')):
                n = code.count(old)
                if n != 1:
                    sys.exit(f'{b["tag"]}: {what} text found {n} times, expected 1 - nothing written')
                code = code.replace(old, new)
            b['expression']['code'] = code
            done.append(b['tag'])
        for c in b.get('children', []):
            walk(c)

    walk(p['config'])
    if sorted(done) != sorted(TAGS):
        sys.exit(f'patched {done}, expected {TAGS} - nothing written')
    # json.dumps defaults reproduce the original policy.json byte for byte (checked), so the diff is only the code change
    raw = open(path, encoding='utf-8').read()
    if json.dumps(json.loads(raw)) != raw:
        sys.exit('policy.json does not round-trip with json.dumps defaults - nothing written')
    open(path, 'w', encoding='utf-8').write(json.dumps(p))
    print('patched', done)


if __name__ == '__main__':
    main(sys.argv[1])
