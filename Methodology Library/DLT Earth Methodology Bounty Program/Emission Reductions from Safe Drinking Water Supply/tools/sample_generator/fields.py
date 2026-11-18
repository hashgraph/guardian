import json
def resolve(doc,node):
    seen=0
    while '$ref' in node and seen<20:
        node=doc['$defs'][node['$ref'].split('/')[-1]]; seen+=1
    return node
def leaves(doc,node,path,out,req=True,anc=()):
    node=resolve(doc,node)
    t=node.get('type')
    if t=='object' or 'properties' in node:
        r=set(node.get('required',[]))
        for k,v in node.get('properties',{}).items():
            if k in('@context','type','id','policyId','ref','guardianVersion'): continue
            leaves(doc,v,path+'/'+k,out,req and (k in r),anc+(k,))
    elif t=='array':
        leaves(doc,node.get('items',{}),path+'[]',out,req,anc)
    else:
        out.append(dict(path=path,key=path.split('/')[-1].rstrip('[]'),type=t,req=req,title=node.get('title',''),desc=node.get('description',''),enum=node.get('enum'),fmt=node.get('format'),default=node.get('default'),examples=node.get('examples')))
