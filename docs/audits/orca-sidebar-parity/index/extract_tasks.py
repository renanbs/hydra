#!/usr/bin/env python3
"""Consolida o backlog de paridade do sidebar a partir de domains/*.gaps.md.

Estratégias de extração (os gaps.md têm formatos diferentes por domínio):
  1. seções numeradas `G1`, `G2`, ... (com ou sem severidade no título);
  2. seções por linha `### D15a-001 — título — status`;
  3. bullets sob seções de gaps priorizados ("Top gaps", "Priorizados", "Backlog").
Fallback: se um domínio não render nenhum item, gera uma task de "limpeza do domínio"
com os ids em `missing`/`partial` do `GAPS-AGG.md`.

Saída: TASKS.md (grupos por severidade) + TASKS.json.
"""
import json
import pathlib
import re
import unicodedata

BASE = pathlib.Path(__file__).resolve().parent.parent
DOMS = BASE / 'domains'

HEAD_SECTION = re.compile(
    r'^#{2,3}\s*(P0|P1|P2|P3|Cr[íi]tico|Alto|M[ée]dio[-\s]?alto|M[ée]dio|Baixo[-\s]?m[ée]dio|Baixo)\b', re.I)
SEV_TOKEN = re.compile(
    r'\b(CR[ÍI]TICO|ALTO|M[ÉE]DIO[-\s]?ALTO|M[ÉE]DIO[-\s]?BAIXO|M[ÉE]DIO|BAIXO[-\s]?M[ÉE]DIO|BAIXO|P0|P1|P2|P3)\b',
    re.I)
HEAD_G = re.compile(r'^#{2,4}\s*(?:###\s*)?G?(\d+)\s*[\.\—\-–:]?\s*(.*)$')
HEAD_GID = re.compile(r'^#{2,4}\s*([A-Z]\d{1,3}[a-z]?-\d{1,3})\s*[—\-–:]\s*(.*)$')
TOP_GAPS = re.compile(r'^#{2,4}\s*.*(top gaps|gaps prioriz|backlog|priorizados)', re.I)
BULLET = re.compile(r'^\s*(?:[-*]|\d+[.)])\s+(.*\S)\s*$')
TABLE_ROW = re.compile(r'^\s*\|\s*(.+?)\s*\|')
TABLE_SKIP = re.compile(r'^\s*\|[\s:-]+\|')
EFFORT = re.compile(r'esfor[çc]o[:\s]+([a-zà-ú/\- ]{3,40}?)(?:\s*[·|)]|$)|effort[:\s]+([a-z\- ]{3,40}?)(?:\s*[·|)]|$)', re.I)
ID = re.compile(r'\b([A-Z]\d{1,3}[a-z]?-\d{1,3})\b')
ID_SPAN = re.compile(r'[A-Z]\d{1,3}[a-z]?-\d{1,3}\s*(?:[…]|\.\.\.|–|-)\s*[A-Z]\d{1,3}[a-z]?-\d{1,3}')


def norm_sev(text: str) -> str:
    t = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode().lower()
    if 'critic' in t or 'p0' in t:
        return 'critico'
    if 'medio-alto' in t or 'medio alto' in t:
        return 'medio-alto'
    if 'baixo-medio' in t or 'baixo medio' in t:
        return 'baixo-medio'
    if 'alto' in t or 'p1' in t:
        return 'alto'
    if 'medio' in t or 'p2' in t:
        return 'medio'
    if 'baixo' in t or 'p3' in t:
        return 'baixo'
    return 'indefinido'


def clean_title(raw: str) -> str:
    t = raw.strip()
    t = re.sub(r'\*\*', '', t)
    t = re.sub(r'`', '', t)
    t = re.sub(r'\s*\((D\d{1,3}[a-z]?[-–\d…,\s\.A-Za-z]*)\)\s*$', '', t)
    t = re.sub(r'^\W+', '', t)
    return t.strip(' —-–:.')[:150]


ORDER = ['critico', 'alto', 'medio-alto', 'medio', 'baixo-medio', 'baixo', 'indefinido']
SEV_LABEL = {'critico': 'CRÍTICO (P0)', 'alto': 'ALTO (P1)', 'medio-alto': 'MÉDIO-ALTO',
             'medio': 'MÉDIO (P2)', 'baixo-medio': 'BAIXO-MÉDIO', 'baixo': 'BAIXO (P3)',
             'indefinido': 'SEM SEVERIDADE DECLARADA'}

tasks = []
for path in sorted(DOMS.glob('*.gaps.md')):
    dom = path.name[:-len('.gaps.md')]
    lines = path.read_text(errors='ignore').splitlines()
    section = 'indefinido'
    in_top = False
    seen_ids = set()
    for i, line in enumerate(lines):
        sec = HEAD_SECTION.match(line)
        if sec:
            section = norm_sev(sec.group(1))
        in_top = bool(TOP_GAPS.match(line)) or (in_top and not line.startswith('##'))
        if line.startswith('## ') and not TOP_GAPS.match(line):
            in_top = False

        candidate = None
        mg = HEAD_G.match(line) if line.startswith('#') else None
        mid = HEAD_GID.match(line) if line.startswith('#') else None
        if mid:
            candidate = (mid.group(1), clean_title(mid.group(2)), section)
        elif mg and (line.startswith('## ') or line.startswith('### ')) and len(mg.group(2)) > 12:
            candidate = (f'G{mg.group(1)}', clean_title(mg.group(2)), section)
        elif line.startswith('#') is False and in_top:
            b = BULLET.match(line)
            tr = TABLE_ROW.match(line)
            if b and len(clean_title(b.group(1))) > 20:
                candidate = (None, clean_title(b.group(1)), section)
            elif tr and not TABLE_SKIP.match(line) and len(clean_title(tr.group(1))) > 20 and clean_title(tr.group(1)).lower() not in ('gap', 'item', 'lacuna'):
                candidate = (None, clean_title(tr.group(1)), section)
        if not candidate:
            continue
        gid, title, sev = candidate
        window = ' '.join(lines[i:i + 10])
        if SEV_TOKEN.search(title) or SEV_TOKEN.search(window):
            sev = norm_sev(title if SEV_TOKEN.search(title) else window)
        eff = EFFORT.search(window)
        effort = (eff.group(1) or eff.group(2) or '').strip() if eff else 'n/d'
        ids = sorted(set(ID.findall(title) + ID.findall(window)))
        key = (title[:70], tuple(ids[:3]))
        if key in seen_ids:
            continue
        seen_ids.add(key)
        tasks.append(dict(domain=dom, group=gid, title=title, severity=sev, effort=effort,
                          ids=ids[:12], id_spans=ID_SPAN.findall(window)[:2],
                          evidence=f'{path.name}:{i + 1}'))

# fallback por domínio sem itens
by_dom = {t['domain'] for t in tasks}
gaps_agg = (BASE / 'GAPS-AGG.md').read_text(errors='ignore') if (BASE / 'GAPS-AGG.md').exists() else ''
for path in sorted(DOMS.glob('*.gaps.md')):
    dom = path.name[:-len('.gaps.md')]
    if dom in by_dom:
        continue
    seg = gaps_agg.split(f'### {dom}')[1].split('\n### ')[0] if f'### {dom}' in gaps_agg else ''
    ids = sorted(set(ID.findall(seg)))
    tasks.append(dict(domain=dom, group=None,
                      title=f'Fechar as lacunas do domínio ({len(ids)} capabilities em missing/partial)',
                      severity='indefinido', effort='n/d', ids=ids[:20], id_spans=[],
                      evidence=path.name))

counts = {s: sum(1 for t in tasks if t['severity'] == s) for s in ORDER}
per_dom = {}
for t in tasks:
    per_dom.setdefault(t['domain'], []).append(t)

(BASE / 'TASKS.json').write_text(json.dumps(tasks, ensure_ascii=False, indent=1))
with (BASE / 'TASKS.md').open('w') as fh:
    fh.write('# TASKS — Backlog de paridade do sidebar (extraído da auditoria)\n\n')
    fh.write(f'**{len(tasks)} work packages** em {len(per_dom)} domínios, derivados de '
             f'`domains/<DOM>.gaps.md` (severidade e esforço são os declarados pelo domínio). '
             f'O detalhe por capability está em `MATRIX.md` / `GAPS-AGG.md`.\n\n')
    fh.write('| severidade | work packages |\n|---|---|\n')
    for s in ORDER:
        if counts[s]:
            fh.write(f'| {SEV_LABEL[s]} | {counts[s]} |\n')
    fh.write(f'\n| domínio | work packages |\n|---|---|\n')
    for d in sorted(per_dom):
        fh.write(f'| {d} | {len(per_dom[d])} |\n')
    for s in ORDER:
        sel = [t for t in tasks if t['severity'] == s]
        if not sel:
            continue
        fh.write(f'\n## {SEV_LABEL[s]} — {len(sel)}\n\n')
        for t in sorted(sel, key=lambda x: (x['domain'], x['group'] or '')):
            ids = f" · ids: {', '.join(t['ids'][:6])}{'…' if len(t['ids']) > 6 else ''}" if t['ids'] else ''
            span = f" ({t['id_spans'][0]})" if t['id_spans'] else ''
            label = f"{t['domain']}{' ' + t['group'] if t['group'] else ''}"
            fh.write(f"- **{label}** — {t['title']}{ids}{span} · esforço: {t['effort']} · `{t['evidence']}`\n")

print(f'{len(tasks)} work packages | domínios: {len(per_dom)}')
for s in ORDER:
    print(f'  {SEV_LABEL[s]:26s} {counts[s]}')
print('\npor domínio:', {d: len(v) for d, v in sorted(per_dom.items())})
