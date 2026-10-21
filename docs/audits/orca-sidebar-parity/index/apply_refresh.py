#!/usr/bin/env python3
"""Aplica os `index/refresh-<grupo>.json` e `index/reverify-<grupo>.json` nos
`domains/*.diff.json`, que são a fonte de verdade dos vereditos.

Dois tiers, nesta ordem:
- `refresh-*`: reavaliação original contra o código da época;
- `reverify-*`: re-verificação posterior; vence o refresh para o mesmo id, porque o
  código andou depois dele (o refresh de 0d261c2 cobriu ~455 de 765 linhas).

Uso:
    python3 index/apply_refresh.py            # aplica e imprime o resumo de mudanças
    python3 index/apply_refresh.py --dry-run  # só o resumo

Depois rode `python3 index/build_report.py` para regenerar parity.json/MATRIX.md/TOTALS.md/GAPS-AGG.md.
"""
import json
import pathlib
import sys
from collections import Counter, defaultdict

BASE = pathlib.Path(__file__).resolve().parent.parent
DOMS = BASE / 'domains'
STATUSES = {'parity', 'partial', 'missing', 'not-applicable', 'out-of-scope'}


def domain_file_for(capability_id: str) -> pathlib.Path | None:
    prefix = capability_id.split('-')[0]
    # D15's capabilities live in two files whose names carry the descriptive
    # suffix (D15-misc-a/b), so the id prefix alone does not resolve them.
    alias = {'D15a': 'D15-misc-a', 'D15b': 'D15-misc-b'}.get(prefix, prefix)
    exact = DOMS / f'{alias}.diff.json'
    if alias != prefix and exact.is_file():
        return exact
    matches = sorted(DOMS.glob(f'{alias}-*.diff.json'))
    return matches[0] if len(matches) == 1 else None


def main() -> int:
    dry_run = '--dry-run' in sys.argv
    overrides: dict[str, dict] = {}
    sources: dict[str, list[str]] = defaultdict(list)

    # Two tiers, in order: the original refresh verdicts, then the re-verification
    # passes. A re-verification row supersedes an earlier refresh row for the same
    # id (the code moved after that refresh), but duplicates inside one tier are
    # still an error.
    for tier in ('refresh', 'reverify'):
        tier_ids: set[str] = set()
        for path in sorted((BASE / 'index').glob(f'{tier}-*.json')):
            data = json.loads(path.read_text())
            for row in data.get('rows', []):
                cap_id = row['id']
                if row.get('status') not in STATUSES:
                    print(f'!! status inválido em {path.name}: {cap_id} -> {row.get("status")}')
                    return 2
                if cap_id in tier_ids:
                    print(f'!! id duplicado entre {tier}: {cap_id}')
                    return 2
                tier_ids.add(cap_id)
                if cap_id in overrides and tier == 'reverify':
                    print(f'  supersede {cap_id}: {overrides[cap_id]["status"]} -> {row["status"]}')
                overrides[cap_id] = row
                sources[cap_id].append(path.name)

    print(f'refresh files: {len(sources)} ids ({len(overrides)})')

    changed = []
    applied = 0
    per_domain = defaultdict(Counter)

    for path in sorted(DOMS.glob('*.diff.json')):
        data = json.loads(path.read_text())
        touched = False
        for row in data.get('rows', []):
            override = overrides.get(row.get('id'))
            if not override:
                continue
            old = row.setdefault('hydra', {}).get('status')
            new = override['status']
            applied += 1
            per_domain[data['domain']][f'{old}->{new}'] += 1
            if old != new:
                changed.append((row['id'], old, new))
            row['hydra']['status'] = new
            if 'evidence' in override:
                row['hydra']['evidence'] = override['evidence']
            if 'backend' in override:
                row['hydra']['backend'] = override['backend']
            if 'missing_behaviors' in override:
                row['hydra']['missing_behaviors'] = override['missing_behaviors']
            if override.get('note'):
                # The domain rows (and build_report) read `notes`; `note` is kept
                # in sync because older refresh files used the singular key.
                row['hydra']['notes'] = override['note']
                row['hydra']['note'] = override['note']
            touched = True
        if touched and not dry_run:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n')

    print(f'aplicados: {applied}')
    print(f'mudanças de veredito: {len(changed)}')
    for cap_id, old, new in changed:
        print(f'  {cap_id}: {old} -> {new}')
    print('por domínio:')
    for domain in sorted(per_domain):
        print(f'  {domain}: {dict(per_domain[domain])}')

    unused = set(overrides) - {c for c, _, _ in changed} - {
        row_id for row_id in overrides
    }
    unmatched = [cap_id for cap_id in overrides if domain_file_for(cap_id) is None]
    if unmatched:
        print(f'!! ids sem arquivo de domínio único: {unmatched}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
