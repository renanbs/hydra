# Falsificação — escopo N–Z (basename case-insensitive) + `components/Sidebar.tsx`

Adversário: `FalsifyNtoZ`. Alvo: inventário Orca (`domains/*.orca.json`) e índices mecânicos (`index/*.json`).
Fonte de verdade: `/home/renan/src/orca/src/renderer/src/**`, `tests/e2e/**`. Nada foi editado fora deste ledger.

## Escopo e contagens auditadas

| item | valor |
|---|---|
| arquivos do escopo (basename `[n-z]` case-insensitive, sem `worktree-list/**`, + `components/Sidebar.tsx`) | **536** (318 prod, 218 test) |
| arquivos `worktree-list/**` (domínio de `FalsifyAtoM`) reconferidos por amostragem | 87 |
| exports de prod do escopo (`index/exports.json`) | 833 |
| exports default de prod **ausentes** do índice | 18 |
| affordances de runtime (`runtime/census-v2.json`) | 72 `static_all` (36 `inSidebar`) + 4 botões de sidebar com menus + 8 probes de teclado |
| itens de menu React observados no runtime | 11 (context menu do card) × 4 botões |
| menus nativos Electron capturados no census | 0 (`steps.native_menus = []`) |
| entradas de teste no índice para os meus test files | 2166 |
| declarações de teste na fonte **ausentes** do índice | 33 |
| specs e2e varridos (`tests/e2e/*.spec.ts`) | 393 |
| citações de teste do inventário para os meus test files | 1705 |
| citações de teste não verificáveis contra a fonte | 14 |
| marcadores `N/A:`/`INFRA:`/`DUP:` tocando o escopo | 330 (27 em arquivos prod, 303 em testes) |

**Snapshot auditado** (os artefatos foram reescritos por outros agentes durante a auditoria — os achados valem para estes hashes):

```
domains/D04a-worktree-card-surface.orca.json  e4c7227cd1  13:11:31
domains/D03a-worktree-list-module.orca.json   28c27e3920  13:08:18
domains/D10-visibility-inbox-notices.orca.json 69730512a9 13:08:26
domains/D07-menus-actions.orca.json           5a139e3717  13:01:00
domains/D01-shell-chrome.orca.json            5fd6b31c72  12:59:19
domains/D08-kanban-board.orca.json            ca125cac4c  12:57:24
index/files_scope.json                        64e4fe04f5  12:48:50
index/exports.json                            d008ea125f  12:48:50
index/tests.json                              59222461a9  12:48:51
index/menu_labels.json                        425c6bbd46  12:48:50
index/shortcuts.json                          ef0d795833  12:48:50
index/timers.json                             cc6ede6be6  12:48:51
```

> Observação de processo: entre 12:5x e 13:11 `D04a` passou de 41 → 111 linhas e as 78 citações de teste fabricadas que existiam na versão anterior desapareceram. Qualquer verificação futura precisa fixar o hash; sem isso o resultado não é reproduzível.

## Escapes

| # | item | evidência `arquivo:linha` | por que o inventário não cobre | domínio que deveria cobrir |
|---|---|---|---|---|
| E1 | 33 declarações de teste visíveis na fonte e invisíveis para `index/tests.json` **e** `coverage.tests` (0/33 presentes). O parser do índice não captura `it.each(...)` nem `it(` multilinha | ver tabela E1 abaixo | o índice e o `coverage.tests` (2940 chaves, espelho exato do índice) não têm nenhuma linha para esses testes; nenhuma linha do inventário os cita | D01, D02a, D02b, D03a, D04a, D05, D06, D10, D11, D15a (por arquivo, ver tabela) |
| E2 | 3 arquivos prod com **zero** evidência em qualquer linha, embora `coverage.files` os declare cobertos (a linha citada nunca aponta para o arquivo) | `components/sidebar/ssh-target-duplicate.ts:12-31` (claim: D02b-003, evidência só em `add-remote-host-ssh-actions.ts`); `components/sidebar/workspace-kanban-pointer-drag-selection.ts:11-34` (claim: D08-036, evidência só em `use-workspace-kanban-card-pointer-drag.ts`); `components/sidebar/worktree-list-lineage-card-test-fixtures.ts:1-62` (claim: D03b-048, evidência em `worktree-list-lineage-card-test-harness.ts`) | `coverage.files` mapeia arquivo→linha, mas nenhuma linha do inventário usa `orca_evidence` desse arquivo; o comportamento (`isDuplicateSshTargetAlias` com normalização de alias; seleção de drag host-qualificada STA-4343) fica sem `arquivo:linha` próprio | D02b (ssh-target-duplicate), D08 (kanban pointer-drag-selection), D03b (fixtures) |
| E3 | Toggle do sidebar por comando (`sidebar.left.toggle`, ⌘B) não aparece em nenhuma linha, label ou hotkey do inventário | `src/renderer/src/app-shell/app-command-handlers.ts:168` (`['sidebar.left.toggle', () => claim('sidebar.left.toggle', () => actions.toggleSidebar())]`), `src/renderer/src/store/slices/ui/ui-slice-agent-actions.ts:46`, comportamento descrito em `tests/e2e/tab-sidebar-closed-overlap.spec.ts:36` ("first tab stays visible after Cmd+B collapses the sidebar") | busca textual em 18 domínios: 0 ocorrências de `sidebar.left.toggle`, `Cmd+B`, `toggle sidebar`; `coverage.hotkeys` não tem chave para isso | D01 (shell do sidebar) |
| E4 | `index/exports.json` omite `export default` — 18 arquivos prod do escopo sem entrada no índice e sem símbolo correspondente em `coverage.symbols` | `WorktreeList.tsx:364`, `WorktreeCard.tsx:82`, `SidebarFilter.tsx:407`, `SidebarHeader.tsx:137`, `SidebarToolbar.tsx:126`, `WorktreeMetaDialog.tsx:441`, `WorkspaceKanbanCard.tsx:81`, `WorkspaceKanbanLaneCardList.tsx:126`, `WorkspaceKanbanStatusLane.tsx:236`, `WorkspaceKanbanAreaSelectionOverlay.tsx:19`, `WorktreeContextMenu.tsx:15`, `SidebarRepositoryFilterSection.tsx:140`, `SidebarWorkspaceFilterSection.tsx:129`, `SidebarWorkspaceOptionsMenu.tsx:100`, `NonGitFolderDialog.tsx:170`, `OrcaYamlTrustDialog.tsx:214`, `RemoveFolderDialog.tsx:122`, `SetupScriptPromptCard.tsx:410` | o índice só indexa named exports; `sym_cov` não tem `WorktreeList`, `WorktreeCard`, `SidebarFilter`, … como símbolo de nenhuma linha | D03b/D04a/D09/D01/D08/D10/D02c (por arquivo) |
| E5 | `coverage.files` aponta linhas que não citam o arquivo nem mencionam seu basename/símbolo em `behaviors`/`capability`/`surface` | 10 mapeamentos, tabela E5 | a evidência da linha mapeada não sustenta a cobertura do arquivo (a cobertura real vem de outra linha) | D08, D02b, D02a, D05, D03b, D06 |

### Tabela E1 — declarações de teste ausentes do índice e do `coverage.tests`

| arquivo:linha | forma | nome | domínio esperado |
|---|---|---|---|
| `NoticeHostGlyph.test.tsx:158` | `it.each` | keeps its copy in the %s catalog | D10 |
| `StatusIndicator.test.ts:88` | `it.each` | labels the agent-derived %s workspace state | D01 |
| `StatusIndicator.test.ts:101` | `it.each` | does not label the passive %s workspace state | D01 |
| `WorktreeCard.lineage.test.tsx:104` | `it` multilinha | does not render parent lineage badge copy on workspace cards | D04a |
| `WorktreeCard.lineage.test.tsx:122` | `it` multilinha | keeps the child workspace toggle chip | D04a |
| `WorktreeCard.pinned-repo-icon.test.tsx:114` | `it` multilinha | shows the configured repo icon for pinned cards even when the repo badge is hidden | D04a |
| `WorktreeCard.pinned-repo-icon.test.tsx:136` | `it` multilinha | does not render the leading pinned repo icon for non-pinned cards | D04a |
| `WorktreeCard.pinned-repo-icon.test.tsx:155` | `it` multilinha | uses the pinned-style repo icon in new card style instead of a metadata-row badge | D04a |
| `WorktreeCardSshHostControl.test.tsx:92` | `it.each` | (status → ícone passivo) | D04a |
| `WorktreeCardSshHostControl.test.tsx:116` | `it.each` | tints the %s state with the destructive token, not the quiet one | D04a |
| `WorktreeCardSshHostControl.test.tsx:125` | `it.each` | shows a disabled busy control while the host is %s | D04a |
| `WorktreeCardSshHostControl.test.tsx:368` | `it.each` | sizes the passive glyph for %s at size-3 | D04a |
| `WorktreeParentPickerPopover.test.ts:210` | `it.each` | leaves IME composition keys to the input method | D06 |
| `project-header-color.test.ts:14` | `it.each` | falls back for missing or empty input: %s | D15a |
| `remote-file-browser-helpers.test.ts:148` | `it` multilinha | `` `..` `` enters path mode and resolves to parent | D02b |
| `remote-file-browser-helpers.test.ts:157` | `it` multilinha | `` `../sibling` `` commits `..` and filters by `sibling` | D02b |
| `remote-file-browser-helpers.test.ts:166` | `it` multilinha | `` `Documents/orca` `` commits `Documents` and filters by `orca` | D02b |
| `remote-file-browser-helpers.test.ts:175` | `it` multilinha | `` `Documents/` `` commits `Documents` with empty filter | D02b |
| `remote-file-browser-helpers.test.ts:184` | `it` multilinha | `` `/var/log` `` resolves from root | D02b |
| `remote-file-browser-helpers.test.ts:193` | `it` multilinha | `` `~/Documents` `` resolves from home | D02b |
| `remote-file-browser-helpers.test.ts:202` | `it` multilinha | `` `~` `` resolves to home with no committed segments | D02b |
| `remote-file-browser-helpers.test.ts:211` | `it` multilinha | `` `./child` `` resolves from cwd | D02b |
| `remote-file-browser-helpers.test.ts:295` | `it` multilinha | `` `.` `` stays | D02b |
| `remote-file-browser-helpers.test.ts:299` | `it` multilinha | `` `..` `` stays (parent nav handled by caller) | D02b |
| `use-add-repo-host-selection.test.ts:175` | `it.each` | has no paired-web fallback when the only host is %s | D02a |
| `worktree-agent-freshness-selector.test.ts:91` | `it.each` | wakes a %s row when it becomes stale | D05 |
| `worktree-lineage-drag-drop.test.ts:39` | `it.each` | rejects empty and inverted rectangles | D03a |
| `worktree-lineage-drag-drop.test.ts:66` | `it.each` | keeps the %s region in the lineage nesting hit zone | D03a |
| `worktree-lineage-drag-drop.test.ts:93` | `it.each` | keeps descendants out of the ancestor hit zone (inline content: %s) | D03a |
| `worktree-list-groups-lineage-nesting.test.ts:320` | `it.each` | does not nest resolved lineage across a known %s boundary | D03a |
| `worktree-list-groups-pinned-host-labels.test.ts:70` | `it.each` | labels a pinned remote worktree in the Pinned section (%s grouping) | D03a |
| `worktree-subagent-child-rows.test.ts:18` | `it.each` | (linhagem de subagentes por owner) | D11 |
| `worktree-title-derived-agent-rows.test.ts:93` | `it.each` | retains hook-less OMP rows for owner marker %s | D05 |

### Tabela E5 — mapeamentos `coverage.files` sem sustentação

| arquivo | linha mapeada | por que é inconsistente |
|---|---|---|
| `components/sidebar/WorkspaceKanbanAreaSelectionOverlay.tsx` | D08-009 | D08-009 só evidencia `WorkspaceKanbanDrawerView.tsx`; quem cita o overlay é D08-032 |
| `components/sidebar/WorkspaceKanbanDrawer.tsx` | D08-042 | D08-042 não cita o drawer; quem cita é D08-005 |
| `components/sidebar/use-remote-file-browser-path-preview.ts` | D02b-027 | D02b-027 evidencia `remote-file-browser-path-preview-resolver.ts`; quem cita o hook é D02b-026/028 |
| `components/sidebar/useAddRepoCloneFlow.ts` | D02a-012 | quem cita o hook é D02a-013/014 |
| `components/sidebar/useAddRepoServerPathFlow.ts` | D02a-010 | quem cita o hook é D02a-011 |
| `components/sidebar/workspace-kanban-pointer-drag-selection.ts` | D08-036 | nenhuma linha cita o arquivo (ver E2) |
| `components/sidebar/worktree-agent-row-orchestration.ts` | D05-006 | quem cita é D05-012 |
| `components/sidebar/worktree-agent-row-selectors.ts` | D05-005 | quem cita é D05-016 |
| `components/sidebar/worktree-list-lineage-card-test-fixtures.ts` | D03b-048 | nenhuma linha cita o arquivo (ver E2) |
| `components/sidebar/worktree-sidebar-row-preference.ts` | D06-031 | quem cita é D06-032 |

## Inconsistências

| # | linha do inventário | o que afirma | o que a evidência mostra |
|---|---|---|---|
| I1 | D01-003, D01-004, D01-031 | cita testes de `Sidebar.test.tsx` / `SidebarToolbar.test.tsx` | as "citações" são `vi.mock(...)` (`Sidebar.test.tsx:26`, `:81`, `SidebarToolbar.test.tsx:33`), não declarações de teste — `decl_at()` = None |
| I2 | D03b-008 | cita `sidebar-project-drop.test.ts:31 :: getSidebarProjectDropAffordance` | linha 31 não é declaração; o nome não existe em nenhum ponto do arquivo |
| I3 | D03b-039 | cita `rendered-sidebar-worktree-order.test.ts:280/296 :: expect(getVisibleWorktreeShortcutTargets()).toEqual` | as linhas são corpo de outro teste; o "nome" é um trecho de asserção, não um teste |
| I4 | D04a-011 | cita `WorktreeCard.pinned-repo-icon.test.tsx:118 :: shows the configured repo icon…` | o `it(` está em `:114` (multilinha, invisível ao índice); `:118` é linha vazia |
| I5 | D04a-020 | cita `WorktreeCard.lineage.test.tsx:118 :: keeps the child workspace toggle chip` | o teste está em `:122` |
| I6 | D04a-102 | nome citado "projects persisted Jira**-**linked-item metadata…" | a fonte diz "Jira linked-item" (`worktree-card-jira-issue-display.test.ts:8`) — nome parafraseado |
| I7 | D04a-107 | nome citado "…bubble through the React **DOM** tree" | a fonte diz "React tree" (`worktree-card-dom-events.test.ts:15`) |
| I8 | D05-017 | cita 4 testes em `useWorktreeAgentRows.test.ts:342/343/365/392` | as linhas caem dentro do `it` de `:318`; nenhum dos 4 nomes existe no arquivo. Os testes reais de orquestração de runtime estão em `:423`, `:454`, `:501` |
| I9 | D04a (todo o domínio) | 124 citações de teste usam basename (`WorktreeCard.pinned-repo-icon.test.tsx:118`) | os outros domínios usam caminho completo (`components/sidebar/...`, 1581 citações no escopo) — duas convenções no mesmo inventário |
| I10 | `index/files_scope.json` | marca como `kind: "prod"` arquivos que só são importados por testes | `worktree-list-lineage-card-test-harness.ts`, `worktree-list-lineage-card-test-fixtures.ts`, `worktree-list-groups-test-fixtures.ts`, `worktree-list-card-markup-queries.ts` (importers: `WorktreeList.*.test.ts`, `*.test.ts`) |
| I11 | 18 símbolos default-export | `WorktreeList`, `WorktreeCard`, `SidebarFilter`, … não existem em `index/exports.json` nem em `coverage.symbols` | `export default` está na fonte (`WorktreeList.tsx:364`, `WorktreeCard.tsx:82`, …) — ver E4 |
| I12 | `WorktreeVisibilitySourceMutation` (D10) | símbolo marcado `INFRA: type-only definition…` | o arquivo `worktree-visibility-source-mutation.ts` estava, no snapshot anterior, sem nenhuma evidência; hoje (D10 69730512a9) tem. O marcador INFRA do tipo não substitui a evidência de arquivo |

## Prova negativa — `N/A:` / `INFRA:` / `DUP:`

- **27 marcadores em arquivos prod do escopo**: todos legítimos — imports de `Tooltip`, assinaturas de tipo/callback (`setAddProjectBusyLabel`, `onRenameStatus`, `label: string`), e helpers de harness de teste. Nenhum esconde comportamento de UI.
- **303 marcadores em arquivos de teste do escopo**: 100% em `describe` (containers de suíte) ou fixtures/helpers; zero `it`/`test` marcado como `INFRA:` (verificado por `kind` do índice).
- **Suspeitos**: nenhum marcador inválido. O único uso limítrofe é `INFRA: type-only definition…` em símbolos de arquivos que também não têm evidência de arquivo (I12) — o marcador está correto, mas não pode ser lido como cobertura de comportamento.
- `N/A:` no escopo: apenas fixtures de teste (`repo-header-create-state.test.ts`, `build-rows.test.ts`).

## Itens verificados sem escape

- **Menus de runtime × inventário**: os 11 itens do context menu do card (`Update`, `Move to Status`, `Open in`, `Copy Path`, `Pin`, `Mark Unread`/`Mark Read`, `New group from project`, `Set Parent Worktree...`, `Sleep`, `Delete Worktree`, `Remove Project from Orca`) têm linha correspondente (D07/D04a/D03a). `steps.native_menus` está vazio no census — nada a comparar no main.
- **Affordances do census**: 36 `inSidebar`; as que apareceram sem match textual (`Project actions for {{value0}}`, `Open Jira tasks`, `Mark as unread`) estão cobertas por D03a-084/085 (`repo-header-project-actions.tsx:48-176`), D01-019 e D04a-012/D07-020. `Refresh rate limits` é do status bar (`src/renderer/src/components/status-bar/UsageRosterPanel.tsx:248` e `StatusBarSurface.tsx:227`), fora do sidebar.
- **Exports do índice × inventário**: 833 exports de prod, 0 sem `coverage.symbols` (o furo é a omissão de default exports no índice — E4).
- **Evidência `arquivo:linha`**: todas as 100% das referências de `orca_evidence` no escopo existem e estão dentro dos limites dos arquivos (0 fora de faixa, 0 arquivo inexistente).
- **Fim-a-fim (item 6)**: 18 arquivos prod do escopo usam `window.api.*` (`index/preload_symbols.json`); todas as linhas que os citam têm `backend_contract` preenchido — 0 gaps por esse critério. `index/ipc_calls.json` está vazio (0 entradas), então não há canal adicional a conferir.
- **`orca_not_reachable_from_sidebar_root.json`**: os 8 arquivos do meu escopo nessa lista (`RemoteFileBrowser.tsx`, `RemoteFileBrowserEntryList.tsx`, `RemoteFileBrowserBreadcrumbs.tsx`, `NonGitFolderDialog.tsx`, `ProjectAddedDialog.tsx`, `PreservedBranchBatchReviewDialog.tsx`, `PreservedBranchBatchReviewModal.tsx`, `SshTargetRow.tsx`) estão inventariados com `coverage.files` **e** evidência (D02b-021..030, D02c-009/012, D02a-027). Sem escape.

## Veredito

**INVENTÁRIO FALSIFICADO** — 5 escapes (E1–E5), sendo 4 de cobertura real (E1 33 testes invisíveis, E2 3 arquivos sem evidência, E3 toggle ⌘B ausente, E4 18 default exports fora do índice) e 1 de mapeamento (E5, 10 linhas), mais 12 inconsistências (I1–I12).

Buscas executadas: fonte×inventário (536 arquivos, 833 exports, 100% das referências `orca_evidence`), runtime×inventário (72 affordances, 4 botões com menus, 11 itens de menu, 8 probes de teclado, 0 menus nativos), testes×inventário (2166 entradas de índice, 1705 citações, 393 specs e2e, 33 declarações ausentes), prova negativa (330 marcadores), backend_contract (18 arquivos com `window.api`, `ipc_calls.json` vazio), e os 8 arquivos não alcançáveis do mount raiz.
