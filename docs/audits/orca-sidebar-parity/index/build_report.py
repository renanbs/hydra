#!/usr/bin/env python3
"""Consolida os artefatos da auditoria em artefatos mecânicos do relatório final.

Saídas (docs/audits/orca-sidebar-parity/):
  inventory.json   — todas as linhas Orca (fase 1) consolidadas
  parity.json      — todas as linhas com veredito Hydra (fase 2) consolidadas
  MATRIX.md        — tabela completa id × capability × superfície × veredito × evidências
  TOTALS.md        — números, cobertura mecânica e matriz por domínio
  GAPS-AGG.md      — gaps agregados por status e por domínio, com evidência
  _par-crosswalk.json — cross-walk dos itens [PAR-*] da spec anterior
"""
import json, pathlib, collections

BASE = pathlib.Path(__file__).resolve().parent.parent
DOMS = BASE / 'domains'

inventory, parity = [], []
errors = []

for p in sorted(DOMS.glob('*.orca.json')):
    dom = p.name[:-len('.orca.json')]
    try:
        data = json.loads(p.read_text())
    except Exception as e:
        errors.append(f'{p.name}: {e}'); continue
    for r in data.get('rows', []):
        r.setdefault('domain', dom)
        inventory.append(r)

for p in sorted(DOMS.glob('*.diff.json')):
    dom = p.name[:-len('.diff.json')]
    try:
        data = json.loads(p.read_text())
    except Exception as e:
        errors.append(f'{p.name}: {e}'); continue
    for r in data.get('rows', []):
        r.setdefault('domain', dom)
        parity.append(r)

inv_by_id = {r.get('id'): r for r in inventory}
par_by_id = {r.get('id'): r for r in parity}

missing_verdict = sorted(set(inv_by_id) - set(par_by_id))
orphan_verdict = sorted(set(par_by_id) - set(inv_by_id))

(BASE / 'inventory.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=1))
(BASE / 'parity.json').write_text(json.dumps(parity, ensure_ascii=False, indent=1))

STATUSES = ['parity', 'partial', 'missing', 'not-applicable', 'out-of-scope']
per_dom = collections.defaultdict(collections.Counter)
for r in parity:
    per_dom[r['domain']][(r.get('hydra') or {}).get('status', 'SEM_VEREDITO')] += 1
global_counts = collections.Counter()
for c in per_dom.values():
    global_counts.update(c)

crosswalk = {}
for r in parity:
    for par in (r.get('par') or []):
        crosswalk.setdefault(par, []).append({'id': r['id'], 'status': (r.get('hydra') or {}).get('status')})
(BASE / '_par-crosswalk.json').write_text(json.dumps(crosswalk, ensure_ascii=False, indent=1))


def short(ev, n=2):
    if not ev:
        return '—'
    if isinstance(ev, str):
        return ev
    return '<br>'.join(str(x) for x in ev[:n])


with (BASE / 'MATRIX.md').open('w') as fh:
    fh.write('# Matriz completa — funcionalidade Orca × veredito Hydra\n\n')
    fh.write(f'{len(inventory)} capabilities inventariadas; {len(parity)} com veredito.\n\n')
    fh.write('| id | domínio | capability | superfície | gatilho | evidência Orca | veredito | evidência Hydra | notas |\n')
    fh.write('|---|---|---|---|---|---|---|---|---|\n')
    for r in inventory:
        hydra = (par_by_id.get(r.get('id')) or {}).get('hydra') or {}
        row = [
            r.get('id', '—'), r.get('domain', '—'),
            (r.get('capability') or '').replace('|', '\\|'),
            (r.get('surface') or '').replace('|', '\\|')[:120],
            (r.get('trigger') or '').replace('|', '\\|')[:90],
            short(r.get('orca_evidence')),
            hydra.get('status', '**SEM VEREDITO**'),
            short(hydra.get('evidence') or hydra.get('backend')),
            (hydra.get('notes') or hydra.get('reason') or '').replace('|', '\\|')[:150],
        ]
        fh.write('| ' + ' | '.join(row) + ' |\n')

with (BASE / 'TOTALS.md').open('w') as fh:
    fh.write('# Números da auditoria\n\n## Vereditos globais\n\n| status | linhas | % |\n|---|---|---|\n')
    total = sum(global_counts.values()) or 1
    for s in STATUSES + ['SEM_VEREDITO']:
        n = global_counts.get(s, 0)
        if n:
            fh.write(f'| {s} | {n} | {100 * n / total:.1f}% |\n')
    fh.write(f'\n**Total com veredito:** {sum(global_counts.values())} de {len(inventory)} capabilities inventariadas.\n')
    if missing_verdict:
        fh.write(f'\n**Linhas sem veredito ({len(missing_verdict)}):** ' + ', '.join(missing_verdict[:60]) + '\n')
    if orphan_verdict:
        fh.write(f'\n**Vereditos órfãos ({len(orphan_verdict)}):** ' + ', '.join(orphan_verdict[:60]) + '\n')
    fh.write('\n## Por domínio\n\n| domínio | capabilities | ' + ' | '.join(STATUSES) + ' |\n|' + '---|' * (len(STATUSES) + 2) + '\n')
    for dom in sorted(per_dom):
        c = per_dom[dom]
        fh.write(f'| {dom} | {sum(c.values())} | ' + ' | '.join(str(c.get(s, 0)) for s in STATUSES) + ' |\n')

with (BASE / 'GAPS-AGG.md').open('w') as fh:
    fh.write('# Gaps agregados (veredito missing/partial)\n\n')
    for status in ('missing', 'partial'):
        rows = [r for r in parity if (r.get('hydra') or {}).get('status') == status]
        fh.write(f'\n## {status.upper()} — {len(rows)} capabilities\n\n')
        by_dom = collections.defaultdict(list)
        for r in rows:
            by_dom[r['domain']].append(r)
        for dom in sorted(by_dom):
            fh.write(f'\n### {dom} ({len(by_dom[dom])})\n\n')
            for r in by_dom[dom]:
                h = r.get('hydra') or {}
                fh.write(f'- **{r["id"]}** — {r.get("capability", "")}')
                if h.get('missing_behaviors'):
                    fh.write(f' | falta: {"; ".join(str(x) for x in h["missing_behaviors"][:4])}')
                if h.get('backend'):
                    backend = h['backend']
                    rendered = backend if isinstance(backend, str) else '; '.join(map(str, backend[:2] if isinstance(backend, list) else [backend]))
                    fh.write(f' | backend: {rendered[:200]}')
                fh.write(f' | {short(r.get("orca_evidence"), 1)}\n')

print(f'inventário: {len(inventory)} linhas | vereditos: {len(parity)} | sem veredito: {len(missing_verdict)} | órfãos: {len(orphan_verdict)}')
print('vereditos globais:', dict(global_counts))
print('domínios com veredito:', len(per_dom), '| erros:', errors)
print('PAR cross-walk:', len(crosswalk), 'itens')
