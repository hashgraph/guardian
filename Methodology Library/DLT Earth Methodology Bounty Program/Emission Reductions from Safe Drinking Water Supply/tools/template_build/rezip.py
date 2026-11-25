import zipfile, os, sys, hashlib
src, build, out = sys.argv[1:4]
old = zipfile.ZipFile(src)
names = [i.filename for i in old.infolist()]
disk = set()
for r,d,f in os.walk(build):
    for x in f: disk.add(os.path.relpath(os.path.join(r,x), build))
    for x in d: disk.add(os.path.relpath(os.path.join(r,x), build)+'/')
order = [n for n in names if n in disk] + sorted(n for n in disk if n not in names and not n.endswith('/'))
missing = [n for n in names if n not in disk]
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
    for n in order:
        if n.endswith('/'): z.writestr(zipfile.ZipInfo(n), b'')
        else: z.write(os.path.join(build,n), n)
print('entries', len(order), 'dropped from old', len(missing), 'new', len([n for n in disk if n not in names and not n.endswith('/')]))
print(hashlib.sha256(open(out,'rb').read()).hexdigest())
