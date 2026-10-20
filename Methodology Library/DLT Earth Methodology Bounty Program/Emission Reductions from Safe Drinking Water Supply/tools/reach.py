import json,sys,zipfile,collections
DEF=set('aggregateDocumentBlock calculateContainerBlock createTokenBlock customLogicBlock documentValidatorBlock externalDataBlock externalTopicBlock extractDataBlock globalEventsReaderBlock globalEventsWriterBlock httpRequestBlock mathBlock mintDocumentBlock notificationBlock reassigningBlock requestVcDocumentBlock retirementDocumentBlock revocationBlock revokeBlock sendToGuardianBlock setRelationshipsBlock splitBlock timerBlock tokenActionBlock uploadVcDocumentBlock'.split())
def load(p):
    if p.endswith('.json'): return json.load(open(p))
    return json.loads(zipfile.ZipFile(p).read('policy.json'))
def run(P, stopprop_toplevel, verbose=False):
    src=[];kids=collections.defaultdict(list)
    def w(b,par):
        src.append((b,par)); kids[par].append(b['id'])
        for c in b.get('children',[]) or []: w(c,b['id'])
    w(P['config'],None)
    byid={b['id']:b for b,_ in src}; bytag={}
    for b,_ in src: bytag.setdefault(b.get('tag'),b['id'])
    inn=collections.Counter(); out=collections.Counter()
    for b,_ in src:
        for ev in (b.get('events') or [])+((b.get('options') if isinstance(b.get('options'),dict) else {}).get('events') or []):
            if not ev or ev.get('disabled') is True: continue
            for ref in (ev.get('target'),ev.get('to'),ev.get('targetTag'),ev.get('targetId')):
                if isinstance(ref,str) and ref.strip():
                    t=bytag.get(ref) or (ref if ref in byid else None)
                    if t and t!=b['id']: out[b['id']]=1; inn[t]=1
    for par,ids in kids.items():
        for i in range(len(ids)-1):
            b=byid[ids[i]]
            sp=(b.get('stopPropagation') is True) if stopprop_toplevel else ((b.get('properties') or {}).get('stopPropagation') is True)
            if b['blockType'] in DEF and not sp: out[ids[i]]=1; inn[ids[i+1]]=1
    n=0; kinds=collections.Counter(); rows=[]
    for b,_ in src:
        i,o=inn[b['id']],out[b['id']]
        if not i and not o: n+=1; kinds[('isolated',b['blockType'])]+=1; rows.append(('isolated',b['blockType'],b.get('tag')))
        else:
            if not i: n+=1; kinds[('no-in',b['blockType'])]+=1; rows.append(('no-in',b['blockType'],b.get('tag')))
            if not o: n+=1; kinds[('no-out',b['blockType'])]+=1; rows.append(('no-out',b['blockType'],b.get('tag')))
    return n,kinds,rows
if __name__=='__main__':
    for p in sys.argv[1:]:
        P=load(p)
        a=run(P,False); b=run(P,True)
        print(p.split('/')[-1][:50],'| blocks',sum(1 for _ in [0]),'| warnings (properties.stopPropagation rule)',a[0],'| (top-level stopPropagation)',b[0])
