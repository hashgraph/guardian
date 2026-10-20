# Guardian forms show each field's `description` as its label (frontend schema-form.component.html: label-field {{ item.description }}).
# The Verra template labels sit in `title`, so every description is made to start with the title: "<title>: <guidance>".
import json,glob,sys,re
SRC=re.compile(r'^(VCS |VVB )?(Validation|Verification|Monitoring|Project Description)( Report)?( template)? v5\.0[AB]\b[^:]*$|^VCS (PD|MR)( template)? v5\.0[AB] [0-9.]+$|^Yes/No question from VCS|template v5\.0[AB], section', re.I)
SK={'@context','type','id','policyId','ref','guardianVersion'}
def fix(props, st):
    for k,v in props.items():
        if k in SK or not isinstance(v,dict): continue
        t=(v.get('title') or '').strip(); de=(v.get('description') or '').strip()
        if not t: continue
        if de==t or de.lower().startswith(t.lower()): st['kept']+=1; continue
        if not de or SRC.search(de) or (t.lower() in de.lower() and ('template' in de.lower() or 'vcs pd' in de.lower() or 'vcs mr' in de.lower())): v['description']=t; st['title']+=1; continue   # guidance is only a source note naming the label
        v['description']=t+': '+de; st['joined']+=1
def walk(o, st):
    if isinstance(o,dict):
        if isinstance(o.get('properties'),dict): fix(o['properties'], st)
        for x in o.values(): walk(x, st)
    elif isinstance(o,list):
        for x in o: walk(x, st)
# Usage: labels.py <unzipped policy dir> ...   (rewrites schemas/*.json in place)
for v in sys.argv[1:]:
    st={'kept':0,'title':0,'joined':0}
    for f in glob.glob(f'{v}/schemas/*.json'):
        j=json.load(open(f)); walk(j['document'], st); json.dump(j,open(f,'w'),ensure_ascii=False)
    print(v, st)
