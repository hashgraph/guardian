import json,sys,glob,re
def norm(d):
    p=json.load(open(d+'/policy.json'))
    sch=[json.load(open(f)) for f in glob.glob(d+'/schemas/*.json')]
    m={}
    for s in sch:
        m[s['iri']]='SCHEMA<'+s['name']+'>'; m[s['uuid']]='UUID<'+s['name']+'>'
    for f in glob.glob(d+'/tokens/*.json'):
        t=json.load(open(f)); m[t['tokenId']]='TOKEN<'+t['tokenName']+'>'
    rx=re.compile('|'.join(re.escape(k) for k in sorted(m,key=len,reverse=True)))
    def strip(o):
        if isinstance(o,dict):
            r={}
            for k,v in o.items():
                if k in ("id","blockId") or (k=="$defs" and not v): continue
                if k=='$comment' and isinstance(v,str):
                    try: v=json.loads(v)
                    except Exception: pass
                r[k]=strip(v)
            return r
        if isinstance(o,list): return [strip(x) for x in o]
        return o
    sub=lambda t: re.sub(r'&1\.0\.\d+','',rx.sub(lambda x:m[x.group(0)],t))
    cfg=sub(json.dumps(strip(p['config']),sort_keys=True))
    docs={}
    for s in sch:
        doc=s['document'];doc=json.loads(doc) if isinstance(doc,str) else doc
        docs[s['name']]=sub(json.dumps(strip(doc),sort_keys=True))
    return cfg,docs,p
a=norm(sys.argv[1]); b=norm(sys.argv[2])
print('block tree equal:',a[0]==b[0])
if a[0]!=b[0]:
    x,y=a[0],b[0]; i=next(i for i in range(min(len(x),len(y))) if x[i]!=y[i]); print(x[max(0,i-200):i+200],'\n---\n',y[max(0,i-200):i+200])
dd=sorted(k for k in set(a[1])|set(b[1]) if a[1].get(k)!=b[1].get(k))
print('schemas',len(a[1]),len(b[1]),'differing:',len(dd))
for k in dd[:2]:
    x,y=a[1].get(k,''),b[1].get(k,''); i=next((i for i in range(min(len(x),len(y))) if x[i]!=y[i]),min(len(x),len(y))); print(k,'\n',x[max(0,i-150):i+150],'\n---\n',y[max(0,i-150):i+150])
