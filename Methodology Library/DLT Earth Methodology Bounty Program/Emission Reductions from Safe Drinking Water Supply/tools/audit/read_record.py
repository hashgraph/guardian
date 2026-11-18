import sys,os,json,zlib,base64,csv,collections
d=sys.argv[1]
acts=list(csv.reader(open(d+'/actions.csv')))
print('steps:',collections.Counter(a[2] if a[0]=='ACTION' else a[0] for a in acts))
print('tags:',[a[4] for a in acts if a[0]=='ACTION' and a[2]=='SET_BLOCK_DATA'])
print('duration s:',int(acts[-1][1])/1000)
# results: vc docs created
res=os.listdir(d+'/results')
kinds=collections.Counter()
errs=[];mint=[]
for r in res:
    try: key=base64.b64decode(r+'='*(-len(r)%4)).decode()
    except Exception: key=r
    kinds[key.split('|')[0]]+=1
    raw=open(d+'/results/'+r,'rb').read()
    try: raw=zlib.decompress(raw)
    except Exception: pass
    try: j=json.loads(raw)
    except Exception: continue
    s=json.dumps(j)
    if '"ghgType"' in s and 'ER_final_total' in s or 'maxAnnualER' in s:
        cs=j.get('document',j)
        cs=(cs.get('credentialSubject') or [{}]) if isinstance(cs,dict) else [{}]
        c=cs[0] if isinstance(cs,list) else cs
        errs.append((c.get('ghgType'),c.get('projectId'),(c.get('ex_ante') or {}).get('maxAnnualER'),c.get('ER_final_total'),c.get('dataQualityFlags')))
    if 'MintToken' in s or '"amount"' in s and 'tokenId' in s:
        cs=j.get('document',j); c=cs.get('credentialSubject',[{}]); c=c[0] if isinstance(c,list) else c
        if 'amount' in c: mint.append((c.get('amount'),c.get('date')))
print('result kinds:',dict(kinds))
for e in sorted(set(map(str,errs))): print('ERR',e)
print('mint:',set(map(str,mint)))
