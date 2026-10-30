import json,sys,glob
def mv(d,v):
    k='section1_7_v50'+v
    if not isinstance(d,dict): return 0
    if k in d and 'section1' in d:
        x=d.pop(k); s=d['section1']; new={}
        for kk,vv in s.items():
            new[kk]=vv
            if kk=='otherEntities': new[k]=x
        assert k in new; d['section1']=new; return 1
    return sum(mv(c,v) for c in d.values() if isinstance(c,dict))
for v,files in (('A',['pkg/sample-data/v5.0A/3_Project_Description.json','pkg/tools/fixtures/v5.0A/PD.full.json']),('B',['pkg/sample-data/v5.0B/3_Project_Description.json','pkg/tools/fixtures/PD.full.json'])):
    for f in files:
        j=json.load(open(f)); n=mv(j,v); json.dump(j,open(f,'w'),indent=1,ensure_ascii=False); print(f,n)
