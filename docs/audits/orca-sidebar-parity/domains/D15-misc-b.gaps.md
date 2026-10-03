# D15-misc-b — gaps Orca → Hydra (Fase 2)

Fonte do diff: `domains/D15-misc-b.diff.json` (14/14 linhas do `.orca.json` com veredito exato uma vez).
Fonte do Hydra: `/home/renan/orca/workspaces/hydra/ondine` (React 19 + Tauri v2; mount `src/components/sidebar/WorktreeSidebar.tsx` + `src/App.tsx`).

## Contagem

| status | n |
|---|---|
| parity | 0 |
| partial | 3 |
| missing | 11 |
| not-applicable | 0 |
| out-of-scope | 0 |
| **total** | **14** |

## Tabela

| id | capability (curta) | status | evidência Hydra principal | faltando |
|---|---|---|---|---|
| D15b-001 | Conjunto visível do quadro Kanban de workspaces (filtros do sidebar + sem ancestrais) | missing | `src/shared/workspace-statuses.ts:20-23`; `src/shared/keybindings/definitions-core-1.ts:103`; `src/App.tsx:96,3409` | board inteiro |
| D15b-002 | Amostragem por `agentStatusEpoch` / sleeping workspaces no Kanban | missing | `src/components/sidebar/visible-worktrees.ts:301-304` | epoch clock + board |
| D15b-003 | Redirect Agents→Spaces com replay síncrono de reveal request | missing | `src/components/sidebar/WorktreeSidebar.tsx:861`; `SidebarHeader.tsx:72` | evento + listener + replay |
| D15b-004 | Despacho de drop (status/pin) em lote ou individual | missing | `src/components/sidebar/workspace-status-drag-data.ts:28,70`; `src/App.tsx:3301,3414-3439` | commit de drop |
| D15b-005 | Captura document-level de `drop`/`dragend` + bypass preload | missing | `src/components/sidebar/workspace-status-drag-data.ts:1-21`; `WorktreeSidebar.tsx:263,290,300` | listeners de captura + drop targets |
| D15b-006 | Resolução de workspace (repo/host/folder) p/ WorktreeMetaDialog | missing | `src/shared/workspace-scope.ts:15`; `src/lib/worktree-runtime-owner-index.ts:92`; `src/shared/folder-workspace-worktree.ts:29` | diálogo + hook |
| D15b-007 | Provider de issue + `liveLinks` p/ aviso de sobreposição | missing | `src/store/slices/worktrees.ts:99`; `src/store/github/pull-request-actions.ts:88` | UI/liveLinks |
| D15b-008 | Abertura do parent picker com âncora + fallback 50ms | partial | `src/App.tsx:3238,3253,411,3950-3967`; `ParentPickerModal.tsx:12-30,66` | âncora, pendingRef, timer 50ms |
| D15b-009 | Fechamento com unmount delay (animação de saída) | missing | `src/App.tsx:3957`; `ParentPickerModal.tsx:66` | unmountTimer + `PARENT_PICKER_EXIT_ANIMATION_MS` |
| D15b-010 | Retenção anti-flicker do prompt de setup script por host | missing | `src/lib/setup-script-prompt.ts:32`; `ui-slice-trust-actions.ts:48-57`; `SettingsModal.tsx:754-762` | hook + card |
| D15b-011 | Métricas de reserva de chrome (`WORKSPACE_TOP_CHROME_HEIGHT`/`STATUS_BAR_RESERVE_HEIGHT`) | missing | `src/components/WindowTitlebar.tsx:103`; `SelectedTextCopyMenu.tsx:109` | constantes |
| D15b-012 | Índice + Y do indicador no drop de cabeçalhos | partial | `worktree-sidebar-header-drop-preview.ts:17-100`; `project-header-drop.ts:185-204`; `WorktreeSidebar.tsx:476-500` | localY/contentBottom/bordas/px |
| D15b-013 | Snap ao limite mais próximo (corpo de seção/gap) | missing | `worktree-sidebar-header-drop-preview.ts:92,107-142`; `WorktreeSidebar.tsx:476-482` | snap wired |
| D15b-014 | `getScrollTopToRevealBounds` p/ revelar card ativo | partial | `SidebarFooter.tsx:28-36`; `WorktreeSidebar.tsx:382-414` | topInset + scrollTop explícito |

## Gaps detalhados

### G1 — Gaveta/quadro Kanban de workspaces inexistente (D15b-001, D15b-002; arrasta D15b-004, D15b-005)
O Hydra preservou apenas resíduos de configuração do board: `WORKSPACE_BOARD_COLUMN_WIDTH_*`
(`src/shared/workspace-statuses.ts:20-23`), prefs `workspaceBoardOpacity|workspaceBoardColumnWidth|syncTaskStatusFromWorkspaceBoard`
(`src/shared/persisted-ui-state-types.ts:100-102`, `src/shared/constants.ts:287-289`) e o keybinding sem handler
`workspace.openBoard` (`src/shared/keybindings/definitions-core-1.ts:103`, clique nenhum consumidor em `src/**`).
Nenhum componente de colunas por status, nenhum `WorkspaceKanbanDrawer`, nenhum `useVisibleWorkspaceKanbanWorktreeIds`.
A engine compartilhada `computeVisibleWorktrees` existe (`src/components/sidebar/visible-worktrees.ts:111`) e já aceita
`injectLineageAncestors` (linha 204) e `showSleepingWorkspaces` (linha 168), mas só é consumida pela lista do sidebar,
pelos atalhos Cmd+1-9 e pelo jump palette — não por um board.
Sem board, o drag para raias de status/pin (D15b-004/005) também não existe: `readWorkspaceDragDataIds`
(`workspace-status-drag-data.ts:28`), `hasWorkspaceDragData` (:70) e o re-export em `workspace-status.ts:38-46`
são código morto (0 chamadas em `src/**`); atribuir status só é possível pelo menu de contexto
(`src/App.tsx:3301,3414-3439`).

Buscas executadas (5 passos): `useVisibleWorkspaceKanbanWorktreeIds`, `WorkspaceKanbanDrawer`, `kanban`,
`workspaceBoard`, `WORKSPACE_BOARD_COLUMN_WIDTH`, `data-workspace-status-drop-target`,
`data-workspace-pin-drop-target`, `commitWorkspaceStatusDocumentDrop`, `agentStatusEpoch` (em `src/components/sidebar`),
`ui.onOpenWorkspaceBoard` (só em teste de lista de eventos permitidos), `src/runtime`, `src-tauri/src`, entrypoint
`src/main.tsx` (window única, sem rota de board).

### G2 — Redirect de reveal Agents→Spaces ausente (D15b-003)
O Hydra tem as duas vistas (`sidebarBody === "agents" | "workspaces"`, `WorktreeSidebar.tsx:105`) e alterna por clique
manual (`SidebarHeader.tsx:72`). Não existe `SCROLL_TO_CURRENT_WORKSPACE_REVEAL_REQUEST_EVENT` (grep = 0) nem
qualquer listener de reveal request; quando Agents está ativo o botão de reveal simplesmente não é passado
(`WorktreeSidebar.tsx:861` → `onRevealCurrent` undefined). Logo, não há troca automática de corpo nem replay síncrono
do payload para a lista recém-montada.

### G3 — Diálogo de metadados de worktree ausente (D15b-006, D15b-007)
Não há `WorktreeMetaDialog` nem `useWorktreeMetaWorkspace` (grep = 0 em `src/**`). Existem as peças de resolução
(`parseWorkspaceKey` em `src/shared/workspace-scope.ts:15`, `findIndexedWorktreeOwner` em
`src/lib/worktree-runtime-owner-index.ts:92`, `folderWorkspaceToWorktree` em `src/shared/folder-workspace-worktree.ts:29`)
mas nenhum consumidor de diálogo. `updateWorktreeMeta` (`src/store/slices/worktrees.ts:99`) só é chamado pelo refresh
automático do GitHub (`src/store/github/pull-request-actions.ts:88`) — não há edição de `linkedIssue`/`linkedPR`/
`linkedLinearIssue` por UI, nem `liveLinks`/`currentProvider`. A única edição de metadado no sidebar é o rename inline
do título (`WorktreeTitleInlineRename.tsx`).

### G4 — Parent picker sem âncora/timer (D15b-008, D15b-009)
O Hydra abre `ParentPickerModal` a partir de três pontos do menu de contexto (`src/App.tsx:3238/3253`, `3445/3459`,
`3557/3568`) com estado em App (`:411`) e render em `:3950-3967`. O modal é centralizado
(`ParentPickerModal.tsx:12-30`) e desmonta imediatamente no close (`:66`, `App.tsx:3957`).
Faltam: captura do elemento âncora, `pendingRef`, fechamento coordenado do menu, timer de fallback de 50ms
(`fallbackTimerRef`) e `openPendingParentPicker`; e o unmount retardado de `PARENT_PICKER_EXIT_ANIMATION_MS`
(o único timer do modal é o `requestAnimationFrame` de foco, `ParentPickerModal.tsx:37`).

### G5 — Prompt de setup script não renderizado na sidebar (D15b-010)
`inspectSetupScriptPromptState` (`src/lib/setup-script-prompt.ts:32`) não tem nenhum consumidor; o dismissal por
`repoHostIdentity` existe no store (`ui-slice-trust-actions.ts:48-57`) sem UI que o use. Não há card/prompt de setup
na sidebar (`src/components/sidebar/**` sem menção a setup script) e não há estabilização tipo
`lastVisiblePromptRef`. A única superfície é Settings (`SettingsModal.tsx:754-762`).

### G6 — Métricas de chrome para portais (D15b-011)
Nenhuma constante `WORKSPACE_TOP_CHROME_HEIGHT`/`STATUS_BAR_RESERVE_HEIGHT` (grep = 0). O valor 36px existe
implicitamente na titlebar (`WindowTitlebar.tsx:103`, `h-9`), mas nenhum portal de sheet/board reserva chrome —
os portais do Hydra usam `fixed` (ex.: `SelectedTextCopyMenu.tsx:109`). Não é `not-applicable`: o Hydra tem titlebar
(36px) e status bar próprios, logo a necessidade de reserva é portável; simplesmente não foi implementada.

### G7 — Drop preview de cabeçalhos: cálculo portado mas morto (D15b-012, D15b-013)
`computeWorktreeSidebarHeaderDropPreview` (`worktree-sidebar-header-drop-preview.ts:17-100`) e
`pickNearestHeaderBoundarySlot` (`:107-142`) foram portados fielmente, mas a única chamadora
(`computeProjectHeaderDropPreview`, `project-header-drop.ts:185-204`) não é chamada por ninguém em `src/**`
(verificado também em testes). O caminho wired é `WorktreeSidebar.tsx:476-500`, que decide top/bottom por
`clientY - rect.top < rect.height / 2` sobre o header sob o cursor (equivalente ao midpoint para o header hovered),
sem: `localY` com `containerTop+scrollTop`, guarda `contentBottom`, delegação `getWorktreeSidebarBoundaryDrop`
(outside/bordas extremas), `dropIndicatorY` em px com clamp em `scrollTop`, e — decisivo para D15b-013 — sem snap
quando o ponteiro está no corpo de uma seção/gap (dragOver só existe no elemento de header,
`WorktreeSidebar.tsx:476-482`), reproduzindo a zona morta que o Orca corrigiu.

### G8 — Reveal sem matemática de bounds (D15b-014)
O botão "Reveal active workspace" existe (`SidebarFooter.tsx:28-36`) e `handleRevealCurrent`
(`WorktreeSidebar.tsx:382-414`) expande projetos/grupos, dá flash no card e chama
`el.scrollIntoView({ behavior: "smooth", block: "nearest" })` (:413). Não há `getScrollTopToRevealBounds`,
`WORKTREE_SIDEBAR_REVEAL_TOP_INSET` nem `scroll-margin/scroll-mt` (grep = 0 em `src/components/sidebar`).
Diferença observável: quando o card está acima do viewport, o Orca alinha ao topo respeitando o inset; o Hydra faz
rolagem mínima com a API nativa.

## Cross-walk PAR (vault `70-Specs/hydra/Spec - Paridade Terminal e Left Sidebar Orca.md`)

Itens de sidebar correlatos às linhas deste domínio (adicionados a `domains/_par-crosswalk.json`):

| PAR | título | orca_rows | hydra_status | escopo |
|---|---|---|---|---|
| PAR-14 | Gaveta de Quadro Kanban de Workspaces (`WorkspaceKanbanDrawer`) | D15b-001, D15b-002 | missing | sidebar |
| PAR-15 | Setup Script Prompt Card na Sidebar | D15b-010 | missing | sidebar |
| PAR-73 | Duplo clique no card para edição rápida de metadados (`edit-meta`) | D15b-006, D15b-007 | missing | sidebar |
| PAR-88 | Drag & Drop bidirecional entre lista da sidebar e gaveta Kanban | D15b-004, D15b-005 | missing | sidebar |

Sem correspondência PAR direta: D15b-003 (redirect de corpo Agents→Spaces), D15b-008/009 (transição do parent picker;
PAR-43 assume o picker como baseline e trata do re-parenting por drag, que não é o recorte destas linhas),
D15b-011 (métricas de chrome), D15b-012/013 (drop preview de cabeçalhos), D15b-014 (bounds de revelação;
PAR-44 cobre auto-revelação de projeto filtrado, alvo diferente).
