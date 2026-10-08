#!/usr/bin/env python3
"""Ledger mecânico da fase 1 (inventário Orca). Verificação independente das obrigações de cobertura.

Uso: python3 verify_coverage.py [DOM ...]     (sem args = todos os domínios com .orca.json)
Saída: docs/audits/orca-sidebar-parity/ledger/<DOM>.json + _global.json, e tabela no stdout.
"""
import json, os, re, sys, pathlib

BASE = pathlib.Path(__file__).resolve().parent.parent          # .../orca-sidebar-parity
IDX = BASE / 'index'
DOMS = BASE / 'domains'
LED = BASE / 'ledger'
LED.mkdir(exist_ok=True)
ORCA_SRC = pathlib.Path('/home/renan/src/orca/src/renderer/src')

JUST = ('N/A:', 'INFRA:', 'DUP:')


def is_just(v):
    if isinstance(v, list):
        return bool(v) and all(isinstance(x, str) and x.startswith(JUST) for x in v)
    return isinstance(v, str) and v.startswith(JUST)


def val_ok(v, all_ids):
    if isinstance(v, list):
        return bool(v) and all((isinstance(x, str) and (x.startswith(JUST) or x in all_ids)) for x in v)
    return isinstance(v, str) and (v.startswith(JUST) or v in all_ids)


def core(key: str) -> str:
    """Normaliza chave de coverage: remove prefixo arquivo:linha e sufixos descritivos."""
    k = re.sub(r'\.(tsx?|test\.tsx?):\d+', '', key)
    k = k.split(' :: ')[0]
    k = re.sub(r'\s*[=(].*$', '', k).strip()
    return k.strip()


def file_of(key: str) -> str | None:
    m = re.search(r'([A-Za-z0-9_.\-]+\.(?:tsx?|test\.tsx?))', key)
    return m.group(1) if m else None


def matches_hit(coverage_map, hit_text, hit_file, line_no):
    """True se alguma chave do mapa cobre este hit do índice."""
    ht = hit_text.strip()
    for k, v in coverage_map.items():
        kf = file_of(k)
        if kf and kf != os.path.basename(hit_file):
            continue
        # bundle por arquivo
        if k in (hit_file, f'- {hit_file}') or k.strip() == hit_file:
            return True, k, v
        if f'{hit_file}:{line_no}' in k:
            return True, k, v
        c = core(k)
        if not c:
            continue
        if c in ht or ht in k or (len(ht) > 12 and ht[:40] in k):
            return True, k, v
    return False, None, None


def line_count(p: pathlib.Path) -> int:
    try:
        return len(p.read_text(errors='ignore').splitlines())
    except Exception:
        return 0


def verify(dom: str):
    man = json.loads((DOMS / f'{dom}.manifest.json').read_text())
    idx = json.loads((DOMS / f'{dom}.index.json').read_text())
    art = DOMS / f'{dom}.orca.json'
    if not art.exists():
        return dict(domain=dom, status='MISSING_ARTIFACT')
    try:
        data = json.loads(art.read_text())
    except Exception as e:
        return dict(domain=dom, status='BAD_JSON', error=str(e)[:200])

    rows = data.get('rows') or []
    cov = data.get('coverage') or {}
    v = dict(domain=dom, status='ok', rows=len(rows), violations=[], counts={})

    ids = [r.get('id') for r in rows]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        v['violations'].append(f'ids duplicados: {sorted(dupes)[:10]}')
    if not rows:
        v['violations'].append('rows vazio')

    # ids em coverage existem?
    all_ids = set(ids)
    for section, mp in cov.items():
        if not isinstance(mp, dict):
            v['violations'].append(f'coverage.{section} não é objeto')
            continue
        for k, val in mp.items():
            if not val_ok(val, all_ids):
                v['violations'].append(f'coverage.{section}["{k[:60]}"] -> veredito inválido {str(val)[:60]}')

    # evidência válida?
    bad_ev = 0
    for r in rows:
        ev = r.get('orca_evidence') or []
        if not ev:
            v['violations'].append(f'{r.get("id")}: sem orca_evidence')
        for e in ev:
            m = re.match(r'^(.*?):(\d+)$', e)
            if not m:
                bad_ev += 1
                continue
            pth, ln = m.group(1), int(m.group(2))
            p = (ORCA_SRC.parent / pth) if pth.startswith('src/') else (ORCA_SRC / pth.replace('components/', 'components/'))
            if not p.exists():
                # tenta caminho relativo ao renderer/src
                p2 = ORCA_SRC / pth
                if p2.exists():
                    p = p2
                else:
                    bad_ev += 1
                    v['violations'].append(f'{r.get("id")}: evidência inexistente {e}')
                    continue
            if ln > line_count(p):
                bad_ev += 1
                v['violations'].append(f'{r.get("id")}: linha fora do arquivo {e}')
    v['counts']['bad_evidence'] = bad_ev

    # files
    prod = [f['name'] for f in man['prod']]

    def norm(name: str) -> str:
        n = name
        for pre in ('src/components/sidebar/', 'components/sidebar/'):
            if n.startswith(pre):
                n = n[len(pre):]
                break
        return n

    cf = {norm(k): v for k, v in (cov.get('files', {}) or {}).items()}
    missing_files = [f for f in prod if norm(f) not in cf or not cf[norm(f)]]
    v['counts']['files'] = f'{len(prod) - len(missing_files)}/{len(prod)}'
    if missing_files:
        v['violations'].append(f'arquivos sem cobertura ({len(missing_files)}): {missing_files[:12]}')

    # symbols
    sym_total = 0
    sym_missing = []
    cs = cov.get('symbols', {})
    for file, syms in (idx.get('exports') or {}).items():
        for s in syms:
            sym_total += 1
            if not any(k == s or k.endswith(':' + s) or k == f'{file}:{s}' or k.endswith('/' + s)
                       for k in cs if val_ok(cs.get(k), all_ids)):
                sym_missing.append(f'{file}:{s}')
    v['counts']['symbols'] = f'{sym_total - len(sym_missing)}/{sym_total}'
    if sym_missing:
        v['violations'].append(f'símbolos sem cobertura ({len(sym_missing)}): {sym_missing[:12]}')

    # tests
    ct = cov.get('tests', {})
    tmiss = []
    for t in (idx.get('tests') or []):
        key = f"{t['file']}:{t['line']} :: {t['name']}"
        ok = any((key == k or (t['name'] in k and t['file'].split('/')[-1] in k)) and val_ok(vv, all_ids)
                 for k, vv in ct.items())
        if not ok:
            tmiss.append(key)
    v['counts']['tests'] = f"{len(idx.get('tests') or []) - len(tmiss)}/{len(idx.get('tests') or [])}"
    if tmiss:
        v['violations'].append(f'testes sem cobertura ({len(tmiss)}): {tmiss[:8]}')

    # hits genéricos
    for section, idxkey in (('labels', 'menu_labels'), ('hotkeys', 'shortcuts'), ('prefs', 'prefs_keys'),
                            ('timers', 'timers'), ('subscriptions', 'subscriptions'), ('preload', 'preload')):
        hits = idx.get(idxkey) or []
        cmap = cov.get(section, {})
        miss = []
        for h in hits:
            ok, k, val = matches_hit(cmap, h.get('text', ''), h.get('file', ''), h.get('line', 0))
            if not ok:
                miss.append(f"{h.get('file')}:{h.get('line')} {h.get('text','')[:70]}")
            elif not val_ok(val, all_ids):
                v['violations'].append(f'coverage.{section}["{k[:50]}"] -> veredito inválido {str(val)[:50]}')
        v['counts'][section] = f'{len(hits) - len(miss)}/{len(hits)}'
        if miss:
            v['violations'].append(f'{section} sem cobertura ({len(miss)}): {miss[:8]}')

    v['status'] = 'ok' if not v['violations'] else 'violations'
    return v


def main():
    want = sys.argv[1:]
    doms = want or sorted(p.name[:-len('.orca.json')] for p in DOMS.glob('*.orca.json'))
    out = []
    print(f"{'domain':34s} {'rows':>5s} {'files':>7s} {'sym':>9s} {'tests':>9s} {'lbl':>9s} {'hot':>8s} {'prf':>6s} {'tmr':>6s} {'sub':>6s} {'ipc':>6s} {'viol':>5s}")
    for d in doms:
        r = verify(d)
        out.append(r)
        c = r.get('counts', {})
        print(f"{d:34s} {r.get('rows',0):5d} {c.get('files','-'):>7s} {c.get('symbols','-'):>9s} "
              f"{c.get('tests','-'):>9s} {c.get('labels','-'):>9s} {c.get('hotkeys','-'):>8s} {c.get('prefs','-'):>6s} "
              f"{c.get('timers','-'):>6s} {c.get('subscriptions','-'):>6s} {c.get('preload','-'):>6s} {len(r.get('violations',[])):5d}")
        (LED / f'{d}.json').write_text(json.dumps(r, indent=1))
    tot = sum(len(r.get('violations', [])) for r in out)
    json.dump(dict(domains=out, total_violations=tot), (LED / '_global.json').open('w'), indent=1)
    print(f'\ntotal violations: {tot} over {len(out)} domains')
    for r in out:
        if r.get('violations'):
            print(f"\n### {r['domain']} ({len(r['violations'])})")
            for x in r['violations'][:14]:
                print(' -', x[:220])


if __name__ == '__main__':
    main()
