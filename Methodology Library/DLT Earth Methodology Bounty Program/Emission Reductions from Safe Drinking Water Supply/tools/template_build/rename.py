"""Give template row schemas descriptive, unique names. Changes only schema name, document title and generic row descriptions."""
import json,glob,re,collections,sys
tree=sys.argv[1]; dry='--dry' in sys.argv
files={}
for f in glob.glob(tree+'/schemas/*.json'):
    j=json.load(open(f)); files[j['iri'].split('&')[0]]=(f,j)
par=collections.defaultdict(list)
for i,(f,j) in files.items():
    for k,v in j['document'].get('properties',{}).items():
        r=v.get('$ref') or (v.get('items') or {}).get('$ref')
        if r: par[r.split('&')[0]].append((j['name'],v.get('title') or k))
def docof(j,pname=''):
    s=' '.join([pname, j['name'], j.get('description') or ''])
    for pat,ab in [(r'Validation Report|ValR','VCS Validation Report'),(r'Verification Report','VCS Verification Report'),(r'Monitoring Report|\bMR\b','VCS MR'),(r'Project Description|\bPD\b','VCS PD')]:
        if re.search(pat,s): return ab
    return 'VCS'
def ver(j):
    m=re.search(r'v5\.0[AB]',j['name']+' '+(j.get('description') or '')); return m.group(0) if m else ''
def num(s):
    m=re.match(r'^(MR |PD )?(\d+(\.\d+)*)\.?\s',s or ''); return m.group(2) if m else ''
def clean(t): return re.sub(r'\s*-\s*', ' - ', re.sub(r'\s+table$','',t.strip()))
names=collections.Counter(j['name'] for f,j in files.values())
new={}
for i,(f,j) in files.items():
    n=j['name']; ps=par[i]
    numbered=re.search(r'item row|\brow \d+',n)
    if not numbered and names[n]<2: continue
    if len(ps)==1 or (ps and len({t for _,t in ps})==1 and numbered):
        pname,ptitle=ps[0]
        t=clean(ptitle); sec=num(t) or num(pname)
        body=re.sub(r'^(MR |PD )?\d+(\.\d+)*\.?\s+','',t)
        base=(sec+' ' if sec else '')+body+' row'
        docs=sorted({docof(files[[k for k,(ff,jj) in files.items() if jj['name']==p][0]][1],p) for p,_ in ps})
    else:
        # shared row type: describe by its documents
        docs=sorted({docof(files[[k for k,(ff,jj) in files.items() if jj['name']==p][0]][1],p) for p,_ in ps}) or [docof(j)]
        base=re.sub(r'\s*\(.*\)$','',n)
        base=re.sub(r'\s*item row|\s*row \d+',' row',base).strip()
        if base.lower() in ('safeguards row','risk table row'): base={'safeguards row':'Safeguards assessment row: item, assessment conclusion and process','risk table row':'Safeguards risk row: risk, mitigation and assessment'}[base.lower()]
    docs=[x for x in docs if x!='VCS'] or [docof(j)]
    d=' and '.join(x.replace('VCS ','') for x in docs) if len(docs)>1 else docs[0].replace('VCS ','')
    d=d.replace('Validation Report and Verification Report','Validation and Verification Reports').replace('MR and PD','PD and MR')
    d=d.replace('PD and MR','PD and MR')
    v=ver(j) or next((m.group(0) for p,_ in ps for m in [re.search(r'v5\.0[AB]',p)] if m), '')
    nm=f"{base} ({'VCS '+d}{' '+v if v else ''})"
    new[i]=nm
c=collections.Counter(list(new.values())+[j['name'] for i,(f,j) in files.items() if i not in new])
for i,nm in sorted(new.items(),key=lambda x:x[1]):
    print(('DUP ' if c[nm]>1 else '    ')+files[i][1]['name'][:70].ljust(72)+'-> '+nm)
if not dry:
    assert all(c[x]==1 for x in new.values()), 'duplicates remain'
    for i,nm in new.items():
        f,j=files[i]; old=j['name']; j['name']=nm
        j['document']['title']=nm
        if re.match(r'^One row of the (table|.* table)',j.get('description') or ''):
            j['description']=j['document']['description']='One row of the "'+re.sub(r' row \(.*$','',nm)+'" table'+re.sub(r'^One row of the .*?table','',j['description'])
        json.dump(j,open(f,'w'),ensure_ascii=False)
    print('renamed',len(new))
