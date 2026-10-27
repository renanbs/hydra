# FALSIFICATION — fase 3 (prova de que nada escapou)

Objetivo: **derrubar** o inventário. Você não é o autor. Seu produto não é concordância: é uma lista de
escap es (comportamentos/arquivos/símbolos/menus/testes que existem no Orca e NÃO estão no inventário)
e uma lista de inconsistências (linhas cuja evidência não sustenta o que afirmam).

## Entradas
- Inventário Orca: `docs/audits/orca-sidebar-parity/domains/*.orca.json` (todas as linhas + `coverage`).
- Índices mecânicos: `docs/audits/orca-sidebar-parity/index/*.json` (files_scope, exports, menu_labels,
  shortcuts, prefs_keys, timers, subscriptions, preload_symbols, tests, ring2_deps, orca_not_reachable_from_sidebar_root).
- Runtime (ground truth): `docs/audits/orca-sidebar-parity/runtime/census-v2.json` (affordances de DOM,
  textos do sidebar, menus React abertos, menus nativos do Electron capturados no main).
- Fonte Orca: `/home/renan/src/orca/src/renderer/src/**` e os 391 specs em `tests/e2e/**`.

## Obrigatório
1. **Fonte × inventário**: para cada arquivo do escopo e cada export do índice, confirme que existe ≥1
   linha de inventário que o cobre com evidência correta. Reporte o que falta.
2. **Interação real × inventário**: para cada affordance do census (nome/testid/role/label) e para cada
   item de menu (React e nativo), confirme linha correspondente no inventário. Reporte o que falta.
3. **Testes como spec**: varra `tests/e2e/**` (specs de sidebar/worktree/workspace/kanban/agente) e os
   305 testes unitários do módulo; todo comportamento descrito por um teste que não aparece no
   inventário é um escape.
4. **Prova negativa**: para cada `N/A:`/`INFRA:`/`DUP:` usado na cobertura, confirme que é legítimo
   (não é uma desculpa para pular comportamento real). Liste os suspeitos.
5. **Evidência**: abra o arquivo:linha citado e confirme que a linha sustenta a afirmação da `capability`.
   Liste discrepâncias (linha não faz o que a capability diz).
6. **Fim-a-fim**: liste comportamentos que dependem de backend e cuja linha não tem `backend_contract`
   preenchido.

## Saída
`docs/audits/orca-sidebar-parity/ledger/falsification-<escopo>.md`:
- cabeçalho com contagens auditadas (`arquivos checados`, `exports checados`, `affordances checadas`, `menus`, `testes`);
- **Escapes** (tabela: item, evidência file:line, por que o inventário não cobre, domínio que deveria cobrir);
- **Inconsistências** (linha do inventário, o que afirma, o que a evidência mostra);
- **Suspeitos de N/A/INFRA/DUP**;
- **Veredito**: `INVENTÁRIO FALSIFICADO` (com N escapes) ou `SEM ESCAPES ENCONTRADOS` (com as buscas feitas).

Zero invenção: cada item reportado precisa de `arquivo:linha` no Orca. Nada de "acho que falta X".
