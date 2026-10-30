import json,sys,glob,re
def load(d):
    sch=[json.load(open(f)) for f in glob.glob(d+'/schemas/*.json')]
    m={}
    for s in sch: m[s['iri']]=s['name']
    out={}
    for s0 in sch: m[s0['uuid']]=s0['name']
    rx=re.compile('|'.join(re.escape(k) for k in sorted(m,key=len,reverse=True)))
    def SUB(t):
        t=re.sub(r'\\"orderPosition\\":\d+','',t)
        return re.sub(r'\s','',rx.sub(lambda x:'<'+m[x.group(0)]+'>',t))
    for s in sch:
        doc=s['document'];doc=json.loads(doc) if isinstance(doc,str) else doc
        def ref(r): return m.get(r.split('&')[0] if False else r, re.sub(r'&1\.0\.\d+','',r)) if r else None
        def fields(o):
            props=o.get('properties',{})
            res=[]
            for k,v in props.items():
                if k in ('@context','type','id','policyId','ref','guardianVersion'): continue
                c=v.get('$comment');c=json.loads(c) if isinstance(c,str) else (c or {})
                r=v.get('$ref') or (v.get('items') or {}).get('$ref')
                res.append((k,v.get('title'),v.get('description'),v.get('type'),json.dumps(v.get('enum')),v.get('readOnly'),v.get('format'),m.get(r,r),json.dumps(v.get('default')),None if True else 0,c.get('unit'),json.dumps(v.get('oneOf'))))
            return res
        out[s['name']]=dict(title=doc.get('title'),desc=doc.get('description'),req=sorted(doc.get('required',[])),fields=sorted(fields(doc),key=lambda t:t[0]), order=None,allOf=SUB(json.dumps(doc.get('allOf'),sort_keys=True)) if doc.get('allOf') else None, defs=sorted(m.get(k,k) for k in doc.get('$defs',{})), entity=s.get('entity'), status=s.get('status'))
    return out
a,b=load(sys.argv[1]),load(sys.argv[2])
cnt={}
for k in a:
    for f in ('title','desc','req','fields','order','allOf','defs','entity'):
        if a[k][f]!=b[k][f]:
            cnt.setdefault(f,[]).append(k)
for f,v in cnt.items(): print(f,len(v),v[:3])
k=(cnt.get('fields') or [None])[0]
if k:
    for x,y in zip(a[k]['fields'],b[k]['fields']):
        if x!=y: print(x,'\n',y); break
for k in cnt.get('order',[]): print(k,a[k]['order'],'\n',b[k]['order'])
k=cnt.get('allOf',[None])[0]
if k:
    x,y=a[k]['allOf'],b[k]['allOf']; i=next(i for i in range(min(len(x),len(y))) if x[i]!=y[i]); print(x[max(0,i-200):i+200],'\n---\n',y[max(0,i-200):i+200])
