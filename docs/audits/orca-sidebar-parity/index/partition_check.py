#!/usr/bin/env python3
"""Reconciliação global (A–G): partição de arquivos, dependências fora do módulo e órfãos do índice.

Checks:
  1. Partição exata: cada arquivo do escopo Orca está em exatamente um manifest de domínio.
  2. Todo arquivo produtivo do escopo aparece em ≥1 linha de inventário (via coverage.files).
  3. Dependências ring2 (fora do módulo, 1 hop) citadas em ≥1 inventário (state_inputs/backend/evidence).
  4. Símbolos do índice global que não aparecem em nenhum coverage.symbols.
  5. Arquivos do escopo não alcançáveis a partir do mount raiz (superfície montada fora) — relatório.

Saída: ledger/_reconciliation.json + resumo no stdout.
"""
import json, pathlib, collections

BASE = pathlib.Path(__file__).resolve().parent.parent
IDX, DOMS, LED = BASE / 'index', BASE / 'domains', BASE / 'ledger'
LED.mkdir(exist_ok=True)

scope = json.loads((IDX / 'files_scope.json').read_text())
scope_names = [f['path'] for f in scope]
prod_names = [f['path'] for f in scope if f['kind'] == 'prod']
scope_paths = {f['path'] for f in scope}

manifests = {p.name[:-len('.manifest.json')]: json.loads(p.read_text()) for p in DOMS.glob('*.manifest.json')}
assigned = collections.Counter()
for dom, man in manifests.items():
    for f in man['prod'] + man['test']:
        key = f"components/sidebar/{f['name']}" if not f['name'].startswith('components/') else f['name']
        assigned[key] += 1

dup = {k: c for k, c in assigned.items() if c > 1}
missing = [n for n in scope_names if n not in assigned]
extra = [k for k in assigned if k not in scope_names]

arts = {}
for p in DOMS.glob('*.orca.json'):
    try:
        arts[p.name[:-len('.orca.json')]] = json.loads(p.read_text())
    except Exception as e:
        arts[p.name] = {'error': str(e)[:200]}

covered_files = set()
for dom, a in arts.items():
    for f, ids in (a.get('coverage', {}).get('files') or {}).items():
        covered_files.add(f)
        if not f.startswith('components/') and not f.startswith('src/'):
            covered_files.add(f'components/sidebar/{f}')

prod_uncovered = [n for n in prod_names if n not in covered_files and n.split('components/sidebar/')[-1] not in covered_files]

ring2 = json.loads((IDX / 'ring2_deps.json').read_text())
exports_all = json.loads((IDX / 'exports.json').read_text())
blob = ' '.join(json.dumps(a) for a in arts.values())
# uma dependência fora do módulo está coberta se o caminho OU ≥1 símbolo exportado por ela é citado
ring2_uncited = []
ring2_symbol_uncited = []
for d in ring2:
    base = d['path'].split('/')[-1].split('.')[0]
    syms = exports_all.get(d['path']) or []
    if base in blob or any(s in blob for s in syms):
        continue
    (ring2_uncited if syms else ring2_symbol_uncited).append(d['path'])
ring2_unexported = ring2_symbol_uncited

exports = json.loads((IDX / 'exports.json').read_text())
sym_covered = set()
for a in arts.values():
    for k in (a.get('coverage', {}).get('symbols') or {}):
        sym_covered.add(k.split(':')[-1])
sym_missing_all = sorted({s for f, syms in exports.items() for s in syms if s not in sym_covered})
sym_missing = sorted({s for f, syms in exports.items() if f in scope_paths for s in syms if s not in sym_covered})

not_reachable = json.loads((IDX / 'orca_not_reachable_from_sidebar_root.json').read_text())

report = dict(
    scope_files=len(scope_names), prod=len(prod_names),
    partition_duplicates=dup, partition_missing=missing, partition_extra=extra,
    prod_files_without_inventory_row=prod_uncovered,
    ring2_total=len(ring2), ring2_uncited=ring2_uncited, ring2_no_export_uncited=ring2_unexported,
    ring2_uncited_total_all=len(ring2_uncited) + len(ring2_unexported),
    global_symbols_uncited=sym_missing[:200], global_symbols_uncited_count=len(sym_missing),
    orca_files_not_reachable_from_sidebar_root=[r['file'] for r in not_reachable],
    domains_with_artifact=sorted(arts), domains_without_artifact=[d for d in manifests if d not in arts],
)
(LED / '_reconciliation.json').write_text(json.dumps(report, indent=1))

print(f"escopo: {len(scope_names)} arquivos ({len(prod_names)} prod) | domínios: {len(manifests)} | artefatos: {len(arts)}")
print(f"partição: duplicados={len(dup)} faltando={len(missing)} extras={len(extra)}")
print(f"prod sem linha de inventário: {len(prod_uncovered)} {prod_uncovered[:10]}")
print(f"ring2 (deps fora do módulo): {len(ring2)} | sem citação (caminho nem símbolo): {len(ring2_uncited)} | sem export e sem citação: {len(ring2_unexported)} {ring2_unexported[:8]}")
print(f"símbolos do ESCOPO não citados: {len(sym_missing)} {sym_missing[:15]}")
print(f"símbolos de dependências (fora do escopo) não citados: {len(sym_missing_all)}")
print(f"arquivos do escopo montados fora do mount raiz: {len(not_reachable)}")
print(f"domínios sem artefato: {report['domains_without_artifact']}")
