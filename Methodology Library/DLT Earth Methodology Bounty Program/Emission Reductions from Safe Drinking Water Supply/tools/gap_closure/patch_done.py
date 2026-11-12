"""MGS 20 Oct: no Ex Ante ERR was ever created. pp_project_id_unique (and the two admin guards) ended with done(documents), an array.
With passOriginal, Guardian passes the done() value on unchanged, so the PD save emitted an array; switch-block.ts aggregates an array into
array-valued fields and 'templateVersion == "v5.0B"' was false, so the ex-ante calculation never ran. The checks now end with done(doc),
the single document, as the overlap checks always did. Usage: patch_done.py <tree>"""
import json, sys
T = sys.argv[1]; P = json.load(open(T + '/policy.json'))
def w(b):
    if b['blockType'] == 'customLogicBlock' and b['expression'].rstrip().endswith('done(documents);'):
        b['expression'] = b['expression'].rstrip()[:-len('done(documents);')] + 'done(doc);'; print('done(doc):', b['tag'])
    for c in b.get('children', []): w(c)
w(P['config']); json.dump(P, open(T + '/policy.json', 'w'), ensure_ascii=False)
