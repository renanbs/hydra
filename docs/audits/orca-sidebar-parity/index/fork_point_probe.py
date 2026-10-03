import subprocess, pathlib, hashlib, collections, json, sys

ORCA = '/home/renan/src/orca'
HYD = '/home/renan/orca/workspaces/hydra/ondine/src/components/sidebar'
REL = 'src/renderer/src/components/sidebar'

def blob_sha(b: bytes) -> str:
    return hashlib.sha1(b'blob %d\0' % len(b) + b).hexdigest()

hyd = {}
for p in pathlib.Path(HYD).rglob('*.ts*'):
    hyd[p.name] = blob_sha(p.read_bytes())
print(f'hydra sidebar files hashed: {len(hyd)}', flush=True)

def sh(args):
    return subprocess.run(args, cwd=ORCA, capture_output=True, text=True).stdout

commits = sh(['git', 'log', '--format=%H', '-n', '600', '--', REL]).split()
print(f'candidate commits touching sidebar dir: {len(commits)}', flush=True)

scores = []
for c in commits:
    out = sh(['git', 'ls-tree', '-r', c, '--', REL])
    tot = 0
    for line in out.splitlines():
        parts = line.split('\t')
        if len(parts) != 2:
            continue
        meta, path = parts
        sha = meta.split()[2]
        base = path.rsplit('/', 1)[-1]
        if hyd.get(base) == sha:
            tot += 1
    if tot:
        scores.append((tot, c))

scores.sort(reverse=True)
print('\ntop commits by identical-file count (of %d hydra files):' % len(hyd))
for tot, c in scores[:15]:
    info = sh(['git', 'log', '-1', '--format=%ad %s', '--date=short', c]).strip()
    print(f'  {tot:3d}  {c[:10]}  {info[:100]}')

json.dump([{'matches': t, 'commit': c} for t, c in scores[:50]],
          open('/home/renan/orca/workspaces/hydra/ondine/docs/audits/orca-sidebar-parity/index/fork_point_candidates.json', 'w'), indent=1)
print('\nmax matches:', scores[0][0] if scores else 0, 'of', len(hyd))
