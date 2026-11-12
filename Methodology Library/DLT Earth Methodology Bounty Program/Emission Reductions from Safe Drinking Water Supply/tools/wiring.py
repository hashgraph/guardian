import json,sys,collections
sys.path.insert(0,sys.argv[0].rsplit('/',1)[0]); import reach
P=reach.load(sys.argv[1]); blocks=[]
def w(b,par):
    blocks.append((b,par))
    for c in b.get('children',[]) or []: w(c,b)
w(P['config'],None)
tags=collections.Counter(b.get('tag') for b,_ in blocks); ids=collections.Counter(b['id'] for b,_ in blocks)
bad=[]
if any(v>1 for v in tags.values()): bad.append('dup tags '+str([t for t,v in tags.items() if v>1]))
if any(v>1 for v in ids.values()): bad.append('dup ids')
evs=[]
for b,_ in blocks:
    for e in b.get('events') or []: evs.append((b,e))
for b,e in evs:
    for k in ('source','target'):
        if e.get(k) and e[k] not in tags: bad.append(f'event {k} missing: {e[k]} on {b.get("tag")}')
src=collections.Counter(e.get('source') for _,e in evs)+collections.Counter(e.get('output') for _,e in evs)
for b,par in blocks:
    if b['blockType']=='buttonBlockAddon' and not src.get(b['tag']): bad.append('button with no event: '+b['tag'])
    if b['blockType']=='buttonBlockAddon' and par and par['blockType']!='interfaceDocumentsSourceBlock': bad.append('button parent '+par['blockType'])
roles=set(P.get('policyRoles') or [])|{'OWNER','ANY_ROLE','NO_ROLE','Administrator'}
for b,_ in blocks:
    for r in b.get('permissions') or []:
        if r not in roles: bad.append(f'unknown role {r} on {b.get("tag")}')
schemas=set()
import zipfile,glob
for b,_ in blocks:
    for k in ('schema','inputSchema','outputSchema'):
        v=b.get(k)
        if isinstance(v,str) and v.startswith('#'): schemas.add(v)
print('blocks',len(blocks),'events',len(evs),'schema refs',len(schemas))
print('PROBLEMS',len(bad)); [print(' ',x) for x in bad[:40]]
