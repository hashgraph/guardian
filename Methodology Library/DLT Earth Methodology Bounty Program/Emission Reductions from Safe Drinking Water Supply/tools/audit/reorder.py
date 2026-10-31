import json,glob,re,sys
# Puts the PD and MR forms in template order: system fields, cover page, sections by number, Appendix 2, methodology records.
# Usage: reorder.py <unzipped policy dir> ...   (rewrites schemas/*.json in place, including nested $defs copies)
SYS=['mrId','projectRef','periodRef','pdRef','templateVersion','ghgType']
COVER={'VCS Project Description':['projectName','projectId','startDate','creditingPeriodStart','creditingPeriodEnd','documentCompletionDate','documentVersion','requestType','vcsStandardVersionUsedForValidation','methodologyIDAndVersion','projectProponentNameAndContact','preparedBy','sensitiveInformation','documentHistory'],
       'VCS Monitoring Report':['projectName','monitoringPeriodStart','monitoringPeriodEnd','documentCompletionDate','documentVersion','vcsStandardVersionUsedForVerification','methodologyIDAndVersion','projectProponentNameAndContact','preparedBy','sensitiveInformation','documentHistory']}
TAIL=['appendix2','methodologyRecords']
SKIP=('@context','type','id','policyId','ref','guardianVersion')
def num(t):
    m=re.match(r'^(?:MR |VCS PD |PD )?(\d+)(?:\.(\d+))?(?:\.(\d+))?',t or '')
    return tuple(int(x or 0) for x in m.groups()) if m else None
def com(w): return json.loads(w['$comment']) if w.get('$comment') else None
def apply(doc, order):
    pr=doc['properties']; new={}
    for k in pr:
        if k in SKIP: new[k]=pr[k]
    for i,k in enumerate(order):
        w=pr[k]; c=com(w)
        if c is not None: c['orderPosition']=i; w['$comment']=json.dumps(c,ensure_ascii=False)
        new[k]=w
    assert len(new)==len(pr), (set(pr)-set(new))
    doc['properties']=new
def plan(doc, name):
    pr=doc['properties']; keys=[k for k in pr if k not in SKIP]
    if name in COVER:
        cover=[k for k in COVER[name] if k in pr]; sysk=[k for k in SYS if k in pr]; tail=[k for k in TAIL if k in pr]
        rest=[k for k in keys if k not in cover+sysk+tail]
        bad=[k for k in rest if num(pr[k].get('title')) is None]
        if bad: print('  no number:',name,bad)
        rest=sorted(rest,key=lambda k:(num(pr[k].get('title')) or (99,),))
        return sysk+cover+rest+tail
    # section sub-schema: sort by the number in each title, untitled/unnumbered keep relative order at the end
    nk=[k for k in keys if num(pr[k].get('title'))]; other=[k for k in keys if k not in nk]
    return sorted(nk,key=lambda k:num(pr[k].get('title')))+other
for v in sys.argv[1:]:
    D=f'{v}/schemas'; files={}
    for f in glob.glob(D+'/*.json'): files[f]=json.load(open(f))
    byiri={j['iri'].split('&')[0]:j for j in files.values()}
    targets=[j for j in files.values() if j['name'] in COVER]
    for t in list(targets):
        if 'section1' in t['document']['properties']: r=t['document']['properties']['section1'].get('$ref'); targets.append(byiri[r.split('&')[0]])
    for t in targets:
        iri=t['iri'].split('&')[0]; order=plan(t['document'],t['name'])
        print(v,t['name'],'->',[k for k in order][:40])
        n=0
        for j in files.values():
            if j is t: apply(j['document'],order); n+=1
            for key,dd in (j['document'].get('$defs') or {}).items():
                if key.split('&')[0]==iri: apply(dd,order); n+=1
        print('   occurrences updated',n)
    for f,j in files.items(): json.dump(j,open(f,'w'),ensure_ascii=False)
