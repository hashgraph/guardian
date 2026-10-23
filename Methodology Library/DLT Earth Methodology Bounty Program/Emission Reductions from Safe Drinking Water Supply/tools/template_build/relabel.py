"""Run after variant.py, before tplbuild.py. Usage: relabel.py <tree> <A|B>
Remove the other template version's labels left over from the master build (shared sections were labelled with the version they were first built for)."""
import glob, sys, json
tree, V = sys.argv[1], sys.argv[2]
old_val = "VCS Validation Report (v5.0A; v5.0B variant selected with templateVersion) prepared by the VVB for a VMR0015 project description. The v5.0B Validation template was not publicly downloadable when this schema was built: the v5.0B branch reuses the changes that the v5.0B Verification template makes to the safeguards part and must be checked against the official v5.0B Validation template."
old_ver = "VCS Verification Report (v5.0A; v5.0B variant selected with templateVersion) prepared by the VVB"
R = {'B': [('(VCS Validation Report v5.0A)', '(VCS Validation Report v5.0B)'),
           ('VCS Validation Report template v5.0A section', 'VCS Validation Report template v5.0B section'),
           ('4.4.2 (v5.0A) / 4.4.1.1 (v5.0B) Buffer Pool Allocation Calculation', '4.4.1.1 Buffer Pool Allocation Calculation'),
           ('4.4.3 (v5.0A) / 4.4.2 (v5.0B) Long-Term Average', '4.4.2 Long-Term Average'),
           ('4.4.2 Buffer Pool Allocation Calculation (VCS PD template v5.0A)', '4.4.1.1 Buffer Pool Allocation Calculation (VCS PD template v5.0B)'),
           ('Buffer Pool Allocation Calculation (VCS PD template v5.0A)', 'Buffer Pool Allocation Calculation (VCS PD template v5.0B)'),
           ('Buffer pool allocation row - VCS PD template v5.0A 4.4.2', 'Buffer pool allocation row - VCS PD template v5.0B 4.4.1.1'),
           ('VCS PD template v5.0A 4.4.2 (numbered 4.4.1.1 in v5.0B)', 'VCS PD template v5.0B 4.4.1.1'),
           ('VCS PD template v5.0A 4.4.2 (v5.0B 4.4.1.1)', 'VCS PD template v5.0B 4.4.1.1')],
     'A': [('4.4.2 (v5.0A) / 4.4.1.1 (v5.0B) Buffer Pool Allocation Calculation', '4.4.2 Buffer Pool Allocation Calculation'),
           ('4.4.3 (v5.0A) / 4.4.2 (v5.0B) Long-Term Average', '4.4.3 Long-Term Average'),
           ('VCS PD template v5.0A 4.4.2 (numbered 4.4.1.1 in v5.0B)', 'VCS PD template v5.0A 4.4.2'),
           ('VCS PD template v5.0A 4.4.2 (v5.0B 4.4.1.1)', 'VCS PD template v5.0A 4.4.2')]}[V]
R += [(old_val, f"VCS Validation Report (template v5.0{V}) prepared by the VVB for a VMR0015 project description. The fields follow the tables of Verra's published v5.0{V} Validation Report template."),
      (old_ver, f"VCS Verification Report (template v5.0{V}) prepared by the VVB"),
      ("VCS MR v5.0B section 1.13 (not in v5.0A). Required when templateVersion = v5.0B: confirmation", "VCS MR v5.0B section 1.13: confirmation"),
      ("applicability table (VCS Validation Report template v5.0A 3.3.2.2)", f"applicability table (VCS Validation Report template v5.0{V} 3.3.2.2)")]
if V == 'A': R.append(('(VCS MR v5.0B 4.1)', '(VCS MR v5.0A 4.1)'))
tot = 0
for f in glob.glob(tree + '/schemas/*.json') + [tree + '/policy.json']:
    t = open(f, encoding='utf-8').read(); n0 = t
    for a, b in R:
        ea, eb = json.dumps(a)[1:-1], json.dumps(b)[1:-1]
        tot += t.count(ea); t = t.replace(ea, eb)
    if t != n0: json.loads(t); open(f, 'w', encoding='utf-8').write(t)
print(tree, 'replacements', tot)
