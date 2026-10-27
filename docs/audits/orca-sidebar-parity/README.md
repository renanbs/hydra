# Auditoria de paridade — Sidebar esquerdo Orca → Hydra

Artefatos desta auditoria (tudo sob `docs/audits/orca-sidebar-parity/`).

## Leia primeiro
| arquivo | o que é |
|---|---|
| `REPORT.md` | **relatório final** (este é o entregável) |
| `MATRIX.md` | matriz completa: cada capability Orca × veredito Hydra × evidências |
| `TOTALS.md` | números de cobertura e vereditos por domínio |
| `GAPS-AGG.md` | gaps agregados (`missing`/`partial`) por domínio e comportamento faltante |

## Protocolos (método, reprodutível)
| arquivo | fase |
|---|---|
| `PROTOCOL.md` | fase 1 — inventário exaustivo do sidebar do Orca |
| `HYDRA_MAPPING.md` | fase 2 — veredito de paridade no Hydra, com prova de wiring |
| `FALSIFICATION.md` | fase 3 — falsificação do inventário por terceiro |

## Índices mecânicos (`index/`)
Construídos por script sobre o código, sem julgamento humano — são a base da prova de cobertura:

| arquivo | conteúdo |
|---|---|
| `files_scope.json` | todos os arquivos do escopo Orca (tamanho, kind, alcance) |
| `ring2_deps.json`, `ring3_deps.json` | dependências fora do módulo sidebar (contratos) |
| `exports.json` | todos os símbolos exportados do escopo |
| `menu_labels.json`, `shortcuts.json`, `prefs_keys.json` | rótulos/menus, atalhos, chaves persistidas |
| `timers.json`, `subscriptions.json` | atividade em background (timers, watchers, subscriptions) |
| `preload_symbols.json`, `preload_symbols_unique.txt` | superfície de backend usada pelo sidebar |
| `tests.json`, `orca_e2e_specs.json` | 2.940 casos unitários + 999 títulos de e2e como especificação |
| `orca_not_reachable_from_sidebar_root.json` | arquivos do módulo montados fora do mount raiz (fronteira real do escopo) |
| `hydra_scope.json`, `hydra_exports.json`, `hydra_unreachable.json` | inventário mecânico do lado Hydra |
| `hydra_invoke.json`, `hydra_tauri_commands.json`, `hydra_sidebar_backend_map.json` | contrato de backend: comandos Tauri alcançáveis do sidebar (13 de 110) |
| `*.py` | geradores e verificadores (ver abaixo) |

## Verificadores (rodam a qualquer momento, sem heurística humana)
| script | função |
|---|---|
| `index/verify_coverage.py` | confere, por domínio, se **toda** entrada de índice (arquivo, símbolo, teste, label, atalho, pref, timer, subscription, preload) está mapeada a uma linha do inventário — e valida as evidências `arquivo:linha` |
| `index/partition_check.py` | partição exata dos arquivos entre domínios + dependências de fora do módulo citadas + símbolos globais não citados |
| `index/runtime_crosscheck.py` | confronta as affordances/menus observados no app real com o inventário |
| `index/build_report.py` | consolida `inventory.json`, `parity.json`, `MATRIX.md`, `TOTALS.md`, `GAPS-AGG.md` |

## Domínios (`domains/<DOM>.*`)
- `<DOM>.manifest.json` / `<DOM>.index.json` — fatia de escopo e índice mecânico do domínio.
- `<DOM>.orca.json` — inventário (linhas + obrigações de cobertura).
- `<DOM>.coverage.md` — parede de evidência: cada entrada do índice → linha que a cobre.
- `<DOM>.diff.json` / `<DOM>.gaps.md` — veredito Hydra por linha e gaps priorizados.

18 domínios: `D01-shell-chrome`, `D02a-repo-add-wizard`, `D02b-hosts-ssh-remote`,
`D02c-project-groups-scripts`, `D03a-worktree-list-module`, `D03b-sidebar-list-orchestration`,
`D04a-worktree-card-surface`, `D04b-worktree-card-controllers`, `D05-agents-rows`,
`D06-drag-order-keyboard`, `D07-menus-actions`, `D08-kanban-board`, `D09-filters-sort`,
`D10-visibility-inbox-notices`, `D11-lineage-grouping-model`, `D12-markdown-inline-render`,
`D15-misc-a`, `D15-misc-b`.

## Evidência de runtime (`runtime/`)
Captura no app Orca real (spec Playwright temporário, Electron headless, `--mode e2e`):

| arquivo | conteúdo |
|---|---|
| `census.json`, `census-v2.json` | primeira enumeração de affordances e menu de contexto do card |
| `census-v3.json` | affordances do sidebar, **store API (1.165 chaves / 729 ações)**, sweep de superfícies |
| `census-v4.json` | menu de contexto com submenus (`Open in` → VS Code / File Manager / Customize apps…), diálogos |

## Provas (`ledger/`)
- `ledger/<DOM>.json` + `ledger/_global.json` — resultado de `verify_coverage.py` por domínio.
- `ledger/_reconciliation.json` — partição, dependências externas, símbolos não citados.
- `ledger/runtime-crosscheck.json` — rótulos de runtime sem cobertura (insumo da falsificação).
- `ledger/falsification-*.md` — relatórios adversariais (A–M, N–Z, runtime).

## Baseline
- Orca: `stablyai/orca` @ `e49b3aa0bd` (2026-09-18) + working tree em `/home/renan/src/orca`
  (clone raso: 1 commit; aprofundado para 401 commits durante a auditoria).
- Hydra: `/home/renan/orca/workspaces/hydra/ondine` (branch `renanbs/ondine`), sidebar montado em
  `src/App.tsx:21` → `src/components/sidebar/WorktreeSidebar.tsx`.
- A árvore do Hydra foi escrita por porte/adaptação (não é cópia verbatim): apenas **9 de 107** arquivos
  do sidebar do Orca existem byte-a-byte iguais em algum commit do histórico do Orca; o trabalho de porte
  começou em 2026-09-19 (`993f0f5`), um dia depois do snapshot de referência.
