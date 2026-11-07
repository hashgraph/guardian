import json,glob,re
class Lib:
    def __init__(s,d):
        s.by={}
        for f in glob.glob(d+'/schemas/*.json')+glob.glob(d+'/systemSchemas/*.json'):
            j=json.load(open(f)); doc=j['document']; doc=json.loads(doc) if isinstance(doc,str) else doc
            s.by[j['iri']]=(j,doc)
    def doc(s,iri): return s.by[iri][1]
def walk(doc,node,path,out,depth=0,seen=()):
    if '$ref' in node:
        ref=node['$ref']; key=ref.split('/')[-1]
        sub=doc.get('$defs',{}).get(key)
        if sub is None or key in seen: out.append((path,'REF?'+ref,False)); return
        walk(doc,sub,path,out,depth+1,seen+(key,)); return
    t=node.get('type')
    if t=='object' or 'properties' in node:
        req=set(node.get('required',[]))
        for k,v in node.get('properties',{}).items():
            if k in('@context','type','id','policyId','ref','guardianVersion'): continue
            out.append((path+'/'+k, v.get('type') or ('ref' if '$ref' in v else '?'), k in req))
            walk(doc,v,path+'/'+k,out,depth+1,seen)
    elif t=='array':
        it=node.get('items',{}); walk(doc,it,path+'[]',out,depth+1,seen)
