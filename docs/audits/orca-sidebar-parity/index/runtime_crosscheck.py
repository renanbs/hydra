#!/usr/bin/env python3
"""Cross-check de runtime: cada affordance/menu observado no app Orca tem linha no inventário?

Entrada: runtime/census-v3.json (affordances + menus), runtime/census-v2.json (fallback),
         domains/*.orca.json (inventário).
Saída:   ledger/runtime-crosscheck.json + resumo no stdout.

Heurística: normaliza o texto (minúsculas, sem acento, sem pontuação) e procura o rótulo em qualquer
linha do inventário (capability + behaviors + surface + trigger). Rótulos genéricos (ícones vazios,
números) são ignorados. Resultado NÃO é veredito final: é lista de suspeitos para a falsificação.
"""
import json, re, pathlib, unicodedata, collections

BASE = pathlib.Path(__file__).resolve().parent.parent
RUNTIME, DOMS = BASE / 'runtime', BASE / 'domains'
LED = BASE / 'ledger'; LED.mkdir(exist_ok=True)

NOISE = re.compile(r'^[\s\d\W]{0,3}$')


def norm(text: str) -> str:
    t = unicodedata.normalize('NFD', text or '')
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    t = t.lower()
    t = re.sub(r'[^a-z0-9+ ]+', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


rows = []
for p in sorted(DOMS.glob('*.orca.json')):
    data = json.loads(p.read_text())
    for r in data.get('rows', []):
        blob = ' '.join(str(x) for x in [
            r.get('capability'), r.get('surface'), r.get('trigger'),
            ' '.join(map(str, r.get('behaviors') or [])), r.get('id'),
        ])
        rows.append((r.get('id'), norm(blob)))

labels: dict[str, set[str]] = collections.defaultdict(set)
for name in ('census-v4.json', 'census-v3.json', 'census-v2.json'):
    p = RUNTIME / name
    if not p.exists():
        continue
    c = json.loads(p.read_text())
    for step, value in (c.get('steps') or {}).items():
        if isinstance(value, list):
            for item in value:
                if not isinstance(item, dict):
                    continue
                for key in ('name', 'label'):
                    if item.get(key):
                        labels[str(item[key])].add(step)
                for menu in item.get('menus') or []:
                    for it in menu.get('items') or []:
                        if it.get('name'):
                            labels[str(it['name'])].add(f'{step}/menu')
                for sub in item.get('submenus') or []:
                    for menu in sub.get('menus') or []:
                        for it in menu.get('items') or []:
                            if it.get('name'):
                                labels[str(it['name'])].add(f'{step}/submenu:{sub.get("item")}')
        elif isinstance(value, dict):
            for menu in value.get('menus') or []:
                for it in menu.get('items') or []:
                    if it.get('name'):
                        labels[str(it['name'])].add(f'{step}/menu')

uncovered, covered = [], []
for label, where in sorted(labels.items()):
    n = norm(label)
    if NOISE.match(n) or len(n) < 3:
        continue
    needle = n[:60]
    hits = [rid for rid, blob in rows if needle in blob]
    if not hits and len(n) > 12:
        words = [w for w in n.split() if len(w) > 3][:3]
        if words:
            hits = [rid for rid, blob in rows if all(w in blob for w in words)]
    (covered if hits else uncovered).append({'label': label, 'seen_in': sorted(where), 'rows': hits[:4]})

out = dict(labels_checked=len(covered) + len(uncovered), covered=len(covered), uncovered=len(uncovered),
           uncovered_items=uncovered, covered_items=covered)
(LED / 'runtime-crosscheck.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(f'rótulos de runtime verificados: {len(covered) + len(uncovered)} | cobertos: {len(covered)} | SEM cobertura: {len(uncovered)}')
for u in uncovered[:60]:
    print(f"  - {u['label'][:70]!r}  visto em {u['seen_in'][:2]}")
