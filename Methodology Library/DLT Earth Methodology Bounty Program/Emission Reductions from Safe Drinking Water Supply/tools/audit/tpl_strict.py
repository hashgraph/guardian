"""Strict template check: each Verra template label must be a field title (normalised, exact or 'prefix: label') inside its own section's
sub-schema tree (cover labels: on the form itself). Usage: tpl_strict.py <tree> <spec.txt> <form name>"""
import json,glob,re,sys
tree,specf,form=sys.argv[1],sys.argv[2],sys.argv[3]
by={}
for f in glob.glob(tree+'/schemas/*.json'):
    j=json.load(open(f)); by[j['iri'].split('&')[0]]=j
def ref(v): return v.get('$ref') or (v.get('items') or {}).get('$ref')
def norm(s): return ' '.join(re.sub(r'[^a-z0-9 ]',' ',(s or '').lower().replace('/',' ')).split())
def strip(t): return re.sub(r'^(MR |PD )?[0-9]+(\.[0-9]+)*\.?\s+','',t or '')
F=[j for j in by.values() if j['name']==form][0]
def titles(iri,seen=(),deep=True):
    j=by.get((iri or '').split('&')[0]); out=[]
    if not j or iri in seen: return out
    for k,v in j['document'].get('properties',{}).items():
        out.append(norm(strip(v.get('title') or k)))
        if deep and ref(v): out+=titles(ref(v),seen+(iri,))
    return out
def section(num):
    hits=[]
    def walk(iri,d,seen):
        j=by.get((iri or '').split('&')[0])
        if not j or d>5 or iri in seen: return
        for k,v in j['document'].get('properties',{}).items():
            t=v.get('title') or ''
            if re.match(r'^(MR |PD )?'+re.escape(num)+r'[ .]',t):
                hits.append(ref(v) if ref(v) else None); 
            if ref(v): walk(ref(v),d+1,seen+(iri,))
    walk(F['iri'],0,())
    return [h for h in hits if h]
tot=ok=0; bad=[]
for line in open(specf):
    p=[x.strip() for x in line.split('|')]
    if len(p)<4: continue
    sec=p[0]
    if sec=='Cover':
        pool=set(titles(F['iri'],deep=False))
        for k,v in F['document']['properties'].items():
            if ref(v) and not re.match(r'^(MR |PD )?[0-9]',v.get('title') or ''): pool|=set(titles(ref(v)))
    elif sec.startswith('Appendix'): pool=set(titles(F['iri']))
    else:
        nums=[sec]; pool=set()
        while '.' in nums[-1]: nums.append(nums[-1].rsplit('.',1)[0])
        for n in nums:
            for s in section(n): pool|=set(titles(s))
            if pool: break
    for l in [x.strip() for x in p[3].split(';') if x.strip()]:
        tot+=1; n=norm(l)
        if n in pool or any(t.endswith(' '+n) and ':' in t or t.endswith(n) for t in pool): ok+=1
        else: bad.append(f'{sec} {p[2]}: {l}')
print(f'{form} [{specf.split("/")[-1]}] labels {tot}, in own section {ok}, missing {tot-ok}')
for b in bad: print('    ',b)
