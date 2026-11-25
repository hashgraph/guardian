import json,glob,re,sys
d=sys.argv[1]; REF=re.compile(r'"\$ref":\s*"(#[^"]+)"'); base=lambda r:r.split('&')[0]
files={}
for f in glob.glob(d+'/schemas/*.json'):
    j=json.load(open(f)); files[j['iri']]=j
bb={base(i) for i in files}
unres=0; missctx=0; defsmis=0
for i,j in files.items():
    doc=j['document']; defs=doc.get('$defs',{})
    for r in set(REF.findall(json.dumps(doc))):
        if r not in defs and base(r)!=base(i): unres+=1
        if base(r) not in bb: defsmis+=1
    ctx=(j.get('context') or {}).get('@context',{})
    for k in defs:
        if k.lstrip('#') not in ctx: missctx+=1
pol=open(d+'/policy.json').read()
used=set(re.findall(r'"(#[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:&[0-9.]+)?)"',pol))
sys_=set()
for f in glob.glob(d+'/systemSchemas/*.json'): sys_.add(json.load(open(f))['iri'])
missing=[u for u in used if base(u) not in bb and u not in sys_ and base(u) not in {base(s) for s in sys_}]
print(d.split('/')[-1], '| schemas', len(files), '| unresolved $ref', unres, '| $ref to removed schema', defsmis, '| $defs without context', missctx, '| schemas named in blocks but missing', len(missing), missing[:3])
