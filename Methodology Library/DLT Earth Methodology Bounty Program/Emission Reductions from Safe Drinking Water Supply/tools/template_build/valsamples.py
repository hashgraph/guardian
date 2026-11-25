import sys, json, glob, os
sys.path.insert(0, sys.argv[1])
import importlib.util
from schemalib import Lib
from gen import add_ld
from jsonschema import Draft202012Validator
src = open(os.path.join(sys.argv[1],'build_samples.py')).read()
ns = {'copy':__import__('copy'),'Draft202012Validator':Draft202012Validator,'add_ld':add_ld}; exec(src[src.index('def safe_schema'):src.index('def run(')], ns)
IRI = {'PP': '#dc44a535-8dc1-4fea-819f-fe67336481bf', 'VVB': '#ac11aa64-0028-4ffe-b58d-6dba9cff116d','PD': '#ecc894cb-0f25-41b9-b3ef-9b6c219fb15a', 'MR': '#9891e08d-c6ed-4645-9c5e-e111daaf37f5','VAL': '#604e92b9-8243-4499-b057-e6cfc8899e7f', 'VER': '#98d44a6c-9ea5-454e-8ebb-9f44d522da65','VCU': '#058aef89-3fdb-4f9b-8066-2b298854a6e0&1.0.1'}
L = Lib(sys.argv[2]); tot=0
for n, iri in IRI.items():
    doc = json.load(open(f'{sys.argv[3]}/{n}.full.json'))
    e = ns['validate'](n, L.doc(iri), doc); tot += len(e)
    print(n, 'errors', len(e), e[:3])
print('TOTAL', tot)
