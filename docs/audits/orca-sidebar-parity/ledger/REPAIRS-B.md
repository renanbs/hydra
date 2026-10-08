# REPAIRS-B — Reparos de integridade (domínios D07, D08, D09, D10, D11, D12, D15a, D15b)

Escopo desta rodada: itens 1, 2, 3, 4 e 6 do ticket de reparo.
Item 5 (escape E3, toggle ⌘B) **não** é deste agente (RepairA, D01).
Todas as edições ficaram restritas a `docs/audits/orca-sidebar-parity/` (nenhum código Hydra/Orca foi tocado).

## Resumo por item

### Item 1 — Coverage de símbolos `default`
Cada `<file>:default` que o índice regenerado passou a expor recebeu uma chave explícita em `coverage.symbols`, sempre apontando para a linha cujo `orca_evidence` cita o arquivo (validado: 0 mapeamentos default sem citação do arquivo).

| Domínio | Arquivos `default` cobertos | Linhas usadas |
|---|---|---|
| D07 | `SidebarWorkspaceOptionsMenu.tsx`, `WorkspaceStatusAppearancePopover.tsx` | D07-010, D07-006 |
| D08 | `WorkspaceKanbanAreaSelectionOverlay.tsx`, `WorkspaceKanbanCard.tsx`, `WorkspaceKanbanDrawer.tsx`, `WorkspaceKanbanDrawerHeader.tsx`, `WorkspaceKanbanDrawerView.tsx`, `WorkspaceKanbanLaneCardList.tsx`, `WorkspaceKanbanLaneGrid.tsx`, `WorkspaceKanbanPinDropTarget.tsx`, `WorkspaceKanbanSearchField.tsx`, `WorkspaceKanbanSettingsMenu.tsx`, `WorkspaceKanbanSheet.tsx`, `WorkspaceKanbanStatusLane.tsx` | D08-032, D08-027, D08-005, D08-008, D08-009, D08-024, D08-019, D08-028, D08-010, D08-015, D08-007, D08-021 |
| D09 | `SidebarFilter.tsx`, `SidebarRepositoryFilterSection.tsx`, `SidebarWorkspaceFilterSection.tsx` | D09-004, D09-016, D09-017 |
| D10 | `DeleteWorktreeDialog.tsx`, `ImportedWorktreesVisibilityLine.tsx`, `NewExternalWorktreesInboxLine.tsx`, `NoticeHostGlyph.tsx`, `WorktreeVisibilityDialog.tsx`, `WorktreeVisibilityHelpPopover.tsx`, `WorktreeVisibilitySourceList.tsx` | D10-005, D10-024, D10-031, D10-035, D10-038, D10-052, D10-055 |
| D12 | `CommentMarkdown.tsx`, `CommentMermaidBlock.tsx` | D12-001, D12-011 |

Total: **26 símbolos `default`** cobertos. D11 e D15a/D15b não expõem `default` no índice.

### Item 2 — Coverage de testes novos (capturados pelo índice regenerado)
Testes multi-linha/`it.each` que entraram no índice e não tinham chave em `coverage.tests`:

| Domínio | Teste (`arquivo:linha`) | Linha mapeada |
|---|---|---|
| D11 | `worktree-lineage-drag-drop.test.ts:42 :: rejects empty and inverted rectangles` | D11-013 |
| D11 | `worktree-lineage-drag-drop.test.ts:67 :: keeps the %s region in the lineage nesting hit zone` | D11-013 |
| D11 | `worktree-lineage-drag-drop.test.ts:94 :: keeps descendants out of the ancestor hit zone (inline content: %s)` | D11-013 |
| D15a | `project-header-color.test.ts:14 :: falls back for missing or empty input: %s` | D15a-003 |

Total: **4 testes**. Fonte: índice regenerado (`domains/<DOM>.index.json`). Os demais testes `it.each` do E1 em D10 (`NoticeHostGlyph.test.tsx:158`) e D11 (`worktree-subagent-child-rows.test.ts:18`) **ainda não aparecem** na fatia de índice entregue (formas `it.each(Object.entries(...))(` multi-linha), logo não geravam obrigação mecânica; não foram fabricados aqui para não criar cobertura de teste ausente do índice.

### Item 3 — Integridade evidência↔cobertura (falsificação E2)
Arquivo `components/sidebar/workspace-kanban-pointer-drag-selection.ts:11-34` (D08) declarado em `coverage.files` mas ausente de qualquer `orca_evidence`.

Comportamento ("Resolve a lista de worktrees a serem arrastados preservando host identity") já era coberto por **D08-036**; a evidência dessa linha foi estendida com `workspace-kanban-pointer-drag-selection.ts:9`, `:16`, `:24`. O mapeamento `coverage.files` continua em D08-036, agora sustentado. Nenhuma linha nova foi criada (comportamento idêntico), logo nada a acrescentar em `.diff.json`.

### Item 4 — Integridade de mapeamento (falsificação E5, D08)
Mapeamentos de `coverage.files` que apontavam para linhas sem citação do arquivo:

| Arquivo | Antes | Depois |
|---|---|---|
| `WorkspaceKanbanAreaSelectionOverlay.tsx` | D08-009, D08-032 | D08-032 (D08-009 não cita o overlay; D08-032 cita) |
| `WorkspaceKanbanDrawer.tsx` | D08-005, D08-006, D08-008, D08-009, D08-042 | D08-005, D08-006, D08-008, D08-009 (D08-042 não cita o drawer; D08-005 cita) |
| `workspace-kanban-pointer-drag-selection.ts` | D08-036 | D08-036 (sustentado pelo item 3) |

Os demais 7 mapeamentos da tabela E5 pertencem a D02b/D02a/D05/D03b/D06 (fora deste agente).

### Item 6 — `backend_contract` vazio com símbolo de preload na evidência (I5)
Deste agente: **D10-003** e **D10-004** (arquivo `AutoRenameFailedDialog.tsx`, que invoca `window.api.worktrees.getBranchRenameFailureOutput` em `:56` e `window.api.ui.writeClipboardText` em `:80`).
Contratos preenchidos (mesmo mapeamento já verificado nas linhas irmãs D10-001/D10-002):

- `window.api.worktrees.getBranchRenameFailureOutput -> preload:src/preload/api/worktrees-bridge.ts:68 / main:src/main/ipc/worktrees/metadata/register-worktree-metadata-handlers.ts:107`
- `window.api.ui.writeClipboardText -> preload:src/preload/api/ui-bridge-clipboard-and-window-controls.ts:99 / main:src/main/window/clipboard-ipc-handlers.ts:180`

Total desta rodada: **2 backend_contracts**. As demais 12 linhas de I5 (D01/D02a/D02b) são de RepairA.

## Artefatos corrigidos
- `domains/D07-menus-actions.orca.json`, `D08-…`, `D09-…`, `D10-…`, `D11-…`, `D12-…`, `D15-misc-a` — `coverage.symbols`/`coverage.tests`/`coverage.files`/`backend_contract`/`orca_evidence` conforme acima.
- `coverage.md` correspondentes: contagens e tabelas de símbolos/testes sincronizadas.
- `.diff.json` / `.gaps.md`: **sem alteração** (nenhuma linha nova de inventário).

## Resultado do verificador (após reparos)

| Domínio | violações |
|---|---|
| D07-menus-actions | 0 |
| D08-kanban-board | 0 |
| D09-filters-sort | 0 |
| D10-visibility-inbox-notices | 0 |
| D11-lineage-grouping-model | 0 |
| D12-markdown-inline-render | 0 |
| D15-misc-a | 0 |
| D15-misc-b | 0 |

`python3 docs/audits/orca-sidebar-parity/index/verify_coverage.py D07… D15-misc-b` → `total violations: 0 over 8 domains`.
