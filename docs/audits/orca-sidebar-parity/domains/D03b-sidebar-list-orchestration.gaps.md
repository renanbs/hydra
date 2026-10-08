# D03b-sidebar-list-orchestration — Fase 2 (veredito Hydra)

Fonte Orca congelada: `domains/D03b-sidebar-list-orchestration.orca.json` (50 linhas, D03b-001…D03b-050).
Fonte Hydra: `/home/renan/orca/workspaces/hydra/ondine` (React 19 + Tauri v2). Mount: `src/App.tsx:3636`
(`<WorktreeSidebar>` em `src/App.tsx:3636`, sidebar em `src/components/sidebar/**`).
Método: 5 passos do `HYDRA_MAPPING.md` (nome → marcação/semântica → comportamento → backend → declaração de misses),
com verificação de alcance real (cadeia de imports **e** uso efetivo) antes de cada veredito.

Resultado: **parity 2 · partial 17 · missing 31 · not-applicable 0 · out-of-scope 0** (50/50 ids, cada um exatamente uma vez).

## 1. Mapa de alcance (o que está realmente ligado ao mount)

| Caminho | Estado | Evidência |
|---|---|---|
| `WorktreeSidebar` → `WorktreeList` → `WorktreeCard`/`FolderWorkspaceRow`/`SectionHeader` | **montado** | `src/App.tsx:3636`, `src/components/sidebar/WorktreeSidebar.tsx:705`, `WorktreeList.tsx:261-540` |
| Inbox de worktrees externos (notice + pill) | **montado** | `WorktreeList.tsx:287,304`; handlers `WorktreeSidebar.tsx:761,773,792` |
| Resize do painel esquerdo | **montado (no App, não no sidebar)** | `src/App.tsx:737,3704`; `src/hooks/useSidebarResize.ts:53` |
| Tema/aparência do sidebar | **parcialmente montado** | `src/App.tsx:370-379` (style resolvido só no titlebar), `WorktreeSidebar.tsx:610,623` (tint) |
| Pipeline de linhas `buildRows` + `host-labels` + `project-grouping` + `section-order` + `host-filtering` | **executado apenas no caminho de sidebar fechado (Cmd+1–9)** | `visible-worktrees.ts:326,380` → `rendered-sidebar-worktree-order.ts:38,56` → `worktree-list/grouping/build-rows.ts:44`; consumo em `src/App.tsx:2456` |
| `project-header-drop.ts` | **alcançável só por `getLogicalRepoOrderRankById`** (`rendered-sidebar-worktree-order.ts:47`); demais exports sem callers | `project-header-drop.ts:25,31,61,95,130,167,185,205` |
| `worktree-sidebar-header-drop-preview.ts` → `worktree-sidebar-drag-autoscroll.ts` | alcançáveis por módulo, **nunca invocados** (`computeProjectHeaderDropPreview` sem caller) | `worktree-sidebar-header-drop-preview.ts:17`; `worktree-sidebar-drag-autoscroll.ts:53,93,128` |
| `worktree-sidebar-drag-geometry.ts`, `worktree-drag-units.ts`, `worktree-manual-order.ts` | **órfãos** | `index/hydra_unreachable.json` |
| `worktree-list/buildSidebarRows.ts`, `worktree-list/pointer-drag-dom.ts`, `worktree-list/keyboard-cycle.ts`, `worktree-list/hard-scroll-up.ts`, `worktree-list/rows/SectionHeader.tsx` | **órfãos — não contam como paridade** | `index/hydra_unreachable.json` |
| DOM esperado pelo drag de cabeçalho (`data-worktree-virtual-row*`, `data-repo-header-*`) | **sem produtor**: só há leitores | `project-header-drop.ts:113,136-160`; `worktree-sidebar-drag-autoscroll.ts:134-168` |

## 2. Paridade real (2 linhas)

- **D03b-038 (parity)** — ordem renderizada para Cmd+1–9 com o sidebar fechado. `computeRenderedSidebarWorktrees`
  reencena o pipeline de linhas (`rendered-sidebar-worktree-order.ts:38-104`: groupBy, projectOrderBy, pinnedDisplayPolicy,
  collapsedGroups, lineage, folder workspaces), `orderMainWorktreeFirst` é aplicado (`group-sections.ts:193`),
  publicação/recálculo em `visible-worktrees.ts:326,380` e consumo em `App.tsx:2456`.
  Nota: o override de colapso por agent-send não existe no Hydra, logo não perturba a numeração (condição do Orca satisfeita por ausência do mecanismo).
- **D03b-050 (parity)** — ciclo de vida dos cabeçalhos de grupo: renderizados a partir de `projectGroups` mesmo antes dos
  worktrees carregarem (`WorktreeList.tsx:470-500`), chevron armado só com `count > 0` (`SectionHeader.tsx:168-183` e `:340-360`),
  grupo vazio mantém header com placeholder; membros nunca são removidos por filtro de inatividade/sleep no sidebar montado.
  Observação (fora desta linha, escopo D09): o toggle `hideSleeping` existe no menu (`WorkspaceOptionsMenu.tsx:405`) mas não é
  aplicado em `getFilteredAndSortedWorktrees` (`WorktreeSidebar.tsx:533-605`).

## 3. Gaps por linha

### 3.1 `partial` (17)

| id | parity existente (Hydra) | faltando |
|---|---|---|
| D03b-001 | resize ao vivo com rAF, commit no mouseup e persistência (`App.tsx:737,3704,1029`; `useSidebarResize.ts:53,102,112`) | limites 220–500 (Hydra 180–480, `App.tsx:741-742`); variável CSS `--workspace-sidebar-live-width` (Hydra escreve `container.style.width`) |
| D03b-002 | alternância workspaces/agents (`WorktreeSidebar.tsx:105,646`), filtro/grupo de agentes preservados no pai | lazy + fallback; `ActivityThreadCollapseContext`/`agentsCollapsedGroupKeys`; posição de scroll dos agentes (`SidebarAgentsList.tsx:49-52` perde estado no unmount) |
| D03b-004 | `systemDark` reativo + `resolveLeftSidebarStyleVariables` com o mesmo nome (`App.tsx:350,370,379`; `lib/left-sidebar-appearance.ts:45`) | variáveis resolvidas aplicadas no container do sidebar (hoje só no titlebar — comentário `App.tsx:367`); modo `match-terminal` não chega ao container |
| D03b-006 | diálogos de visibilidade/grupo/prompt montados (`WorktreeSidebar.tsx:1115,1125,1142`) | portal/lazy fora da árvore DOM do sidebar (renderizam dentro do root); modais `edit-meta`, `confirm-remove-folder`, `confirm-orca-yaml-hooks`, `forget-ssh-workspace`; `AgentDashboardSidebarHost` |
| D03b-010 | `selectWorktreeListReviewCacheInputs`, `pinnedDisplayPolicy` e default host resolvidos no pipeline (`rendered-sidebar-worktree-order.ts:38-54`); `React.memo` no card (`WorktreeCard.tsx:11`) | seletores/memoização (useShallow) no componente da lista **montada** — review chega por `prByPath` (`WorktreeSidebar.tsx:724`) |
| D03b-011 | filtro de texto + ordenação `name/recent/agent-activity` na lista montada (`WorktreeSidebar.tsx:533-605`) | catálogo de ordem manual / `useSidebarWorktreeSortOrder` / `useVisibleSidebarWorktrees`; ordem manual de worktrees é gravada em localStorage e **nunca relida** (`App.tsx:1928-1938`); modos Smart/status |
| D03b-013 | linhas de inbox externa/importada montadas + supressão/keep por repo (`WorktreeList.tsx:287,304`; `WorktreeSidebar.tsx:761,773,792`) | escopo de host na lista montada (`getVisibleSidebarHostIdSet`/`filterProjectGroupsForVisibleHosts` só no pipeline de atalhos) |
| D03b-014 | `buildRows` com projectOrderBy/pinnedDisplayPolicy/projectGroups/folderWorkspaces e seções de host (`rendered-sidebar-worktree-order.ts:56,101`) | modelo de linhas consumido pela lista montada; `handleReorderHostSections`/`setHostDragActive` |
| D03b-015 | reordenação manual por DnD (`WorktreeSidebar.tsx:428,442`); pin/unread/status por item (`App.tsx:3135,3301`) | multi-seleção; `moveWorktree*ToStatus*`; pin em lote; `dropWorktreesOnWorkspaceBoard`; auto-load de linhagem ao mover pai entre raias |
| D03b-016 | atributo `data-worktree-card-active` (`worktree-card-surface.tsx:83`) e caminho `onImmediateActivate` no controller (`:172`) | `markSidebarWorktreeActiveImmediately` (mutação DOM pré-reconciliação) e o caller que injeta `onImmediateActivate` |
| D03b-017 | novo workspace/visibilidade/remoção a partir do header (`WorktreeList.tsx:261,481`; `WorktreeSidebar.tsx:955,1142`) | `handleOpenRepoSettings` (página de settings do repo); confirmação `confirm-remove-folder` (`App.tsx:1612` remove direto); `handleCreateFolderWorkspace` com `parentPath` |
| D03b-018 | reveal expande projeto/grupo colapsado + scroll + highlight (`WorktreeSidebar.tsx:367-424`) | ajuste de filtros para tornar visível; fila `pendingRevealWorktree`/`pendingRevealSidebarRow` no store |
| D03b-019 | empty state com botão “Clear filter” (`WorktreeList.tsx:588,601`) | `shouldFiltersHideAllRows`: decisão usa só `visibleProjects`, ignora placeholders/inbox |
| D03b-029 | reordenação de cabeçalhos de projeto via HTML5 DnD (`SectionHeader.tsx:265`; `WorktreeSidebar.tsx:484`; `App.tsx:1915`) | `mapSidebarRepoDropIndexToAllRepoInsertAt`/`applyAllRepoInsertAt` (bloco multi-host estável); persistência além do localStorage |
| D03b-039 | ids únicos por `new Set` (`rendered-sidebar-worktree-order.ts:119`); hosts filtrados não são reconstruídos | posições separadas para hosts com o mesmo id (dedupe por `worktree.id`, `rendered-sidebar-worktree-order.ts:120-124`; `WorktreeList.tsx:55-57`) |
| D03b-047 | linhas de folder workspace sob o grupo dono, um passo compacto abaixo (`WorktreeList.tsx:517`; `FolderWorkspaceRow.tsx:35-48`) | `aria-activedescendant` (usa `aria-current`); indentação manual fora de grupos escaneados; geometria new-card |
| D03b-049 | cálculo de labels multi-host/projeto consolidado e desambiguação por caminho (`host-labels.ts:83`, `project-grouping.ts:117`, `section-order.ts:94`); linhas separáveis com chave própria (`WorktreeList.tsx:349`) | **exibição**: `hostContextLabel` nunca é passado pela lista montada, então `WorktreeHostContextBadge` (`worktree-card-meta-row.tsx:62`) não renderiza; labels de notice/pinned na UI |

### 3.2 `missing` (31)

- **D03b-003** redirect agents→workspaces no reveal. Buscas: `useWorkspaceRevealBodyRedirect`, `setSidebarBody`, `reveal*`.
  `handleRevealCurrent` (`WorktreeSidebar.tsx:382-424`) não altera `sidebarBody`; footer só expõe reveal no modo workspaces (`:861`).
- **D03b-005** sincronização de worktrees por mudança de contagem de repos. Buscas: `projects.length`, `fetchAllWorktrees`,
  `refreshGitWorktrees` (uso sob demanda em `App.tsx:1775,1791`), deps de efeitos do sidebar.
- **D03b-007** gaveta Kanban. Buscas: `WorkspaceBoard|workspaceBoard|KanbanBoard|useWorkspaceBoardPanel` — só o ícone do submenu Status (`App.tsx:96,3409`).
- **D03b-008 / D03b-009** drop nativo de pastas na sidebar. `shared/native-file-drop.ts:13,132` define `projectSidebar`,
  mas nenhum handler o consome (`useGlobalFileDrop.ts:66` só trata `editor`); não há overlay/afordância nem roteamento para o wizard.
- **D03b-012** grupos efetivos + alvo de envio de agente. Buscas: `useEffectiveCollapsedGroups`, `agentSendTarget*`; `collapsedGroups` é repassado cru (`WorktreeList.tsx:470`).
- **D03b-020** viewport virtualizado + diálogos de grupo. Sem virtualizador na lista (`WorktreeList.tsx:609` é `div`); sem `SidebarWorktreeListDialogs`;
  `data-worktree-virtual-row*` sem produtor.
- **D03b-021 / D03b-022** linha inline de criação pendente e seu erro/cancel. `pendingWorktreeCreations` existe no store
  (`store/slices/worktree-helpers.ts:111`) e `buildPendingCreationRow` existe, mas o único caminho wired passa `EMPTY_PENDING_CREATIONS`
  (`rendered-sidebar-worktree-order.ts:34,72`) e a lista montada não renderiza nada.
- **D03b-023** botão “Jump to top”. Buscas: `ScrollToTop|scroll-to-top|ChevronsUp` no sidebar — zero.
- **D03b-024** indicador de drop do sidebar. `components/workbench/drop-indicator.ts` serve só a tab bar.
- **D03b-025 … D03b-029 (parcialmente 029)** arrasto de cabeçalho de projeto por ponteiro. Não existem
  `useRepoHeaderDrag`/`createProjectHeaderDragSession`/`isRepoHeaderActionTarget`/`REPO_HEADER_ACTION_SELECTOR`.
  As funções de bucket/medição/commit em `project-header-drop.ts` existem mas sem callers (apenas `getLogicalRepoOrderRankById` é usado).
- **D03b-030 … D03b-033** arrasto de cabeçalho de grupo de projeto. Arquivos `project-group-header-drag*`/`-drop*` inexistentes;
  cabeçalho de grupo só recebe drop de projetos (`SectionHeader.tsx:122`; `WorktreeSidebar.tsx:820`).
- **D03b-034 … D03b-037** arrasto de cabeçalho de host. `host-header-drag*` inexistente; `host-section-rows.ts`/`host-section-order.ts`
  existem mas só no pipeline de atalhos, sem UI/arrasto.
- **D03b-040 / D03b-041** limites de seção O(1) para headers de repo e de grupo. `worktree-header-section-boundaries.ts` inexistente;
  `data-repo-header-section-end` é lido (`project-header-drop.ts:160`) e nunca escrito.
- **D03b-042 / D03b-043 / D03b-044 / D03b-045** geometria de drag & drop de worktrees. Port parcial órfão:
  `getWorktreeSidebarDragReferenceY` (`worktree-sidebar-drag-geometry.ts:28`), âncoras (`:76`), `getWorktreeSidebarBoundaryDrop`
  (`worktree-sidebar-drag-autoscroll.ts:93`), `getWorktreeDragUnitGroups` (`worktree-drag-units.ts:18`) — nenhum invocado.
  Faltam `getWorktreeSidebarDragUnitRects`, `getWorktreeSidebarClosestCenterDropIndex`, `buildWorktreeDragPreviewOffsets`,
  o indicador ancorado a placeholder e `resolveWorktreeSidebarStatusDropCommitTarget` (tolerância 6px).
- **D03b-046** lote de expurgo de snapshots. Sem `workspaceCleanup`/`beginRemovalSnapshotPruneBatch` em `src/` nem em `src-tauri/src/`.
- **D03b-048** linhagem recursiva de cards. As props existem (`worktree-card-model.ts:39-42`) e a superfície as renderiza
  (`worktree-card-surface.tsx:115-121`), mas nenhum caller as fornece — a lista montada não injeta `lineageChildren`;
  sem `worktree-list-lineage-*` no Hydra.

## 4. Cross-walk PAR-* proposto (merge manual em `_par-crosswalk.json`)

`_par-crosswalk.json` é arquivo compartilhado e estava sendo escrito por outro worker durante esta fase; para não sobrescrever
entradas de terceiros, os itens abaixo ficam **propostos** (não aplicados) e devem ser mesclados pelo consolidador.

| PAR | orca_rows | hydra_status | escopo | nota |
|---|---|---|---|---|
| PAR-08 (multi-seleção de worktrees) | D03b-015 | partial | sidebar | sem seleção múltipla |
| PAR-13 (drop nativo de pastas) | D03b-008, D03b-009 | missing | sidebar | target `projectSidebar` sem handler |
| PAR-14 (gaveta Kanban) | D03b-007 | missing | sidebar | sem board |
| PAR-44 (auto-revelação de projeto oculto por filtro) | D03b-018 | partial | sidebar | expande/rola, não mexe em filtros |
| PAR-73 (duplo clique → `edit-meta`) | D03b-006, D03b-017 | partial | sidebar | Hydra abre rename inline, não o diálogo |
| PAR-80 (Empty State com “Clear Filters”) | D03b-019 | partial | sidebar | botão existe, decisão simplificada |
| PAR-82 (persistência de expansão de linhagem) | D03b-048 | missing | sidebar | sem linhagem montada |
| PAR-88 (DnD bidirecional lista ↔ Kanban) | D03b-007, D03b-015, D03b-045 | missing | sidebar | sem Kanban nem hit-test de raia |

## 5. Cobertura

- 50/50 ids do `.orca.json` com veredito, exatamente uma vez cada (`D03b-001`…`D03b-050`).
- Nenhum `parity`/`partial` sem evidência Hydra alcançável a partir do mount (`src/App.tsx:3636`).
- Backend: todas as linhas com contrato de IPC no Orca (`D03b-009`, `D03b-046`) foram verificadas também em `src-tauri/src/**`
  e não têm comando correspondente; `D03b-001`/`D03b-017`/`D03b-013` têm `invoke` wired equivalente.
- Orfãos excluídos de qualquer crédito de paridade: `worktree-list/buildSidebarRows.ts`, `worktree-list/hard-scroll-up.ts`,
  `worktree-list/keyboard-cycle.ts`, `worktree-list/pointer-drag-dom.ts`, `worktree-list/rows/SectionHeader.tsx`,
  `worktree-sidebar-drag-geometry.ts`, `worktree-drag-units.ts`, `worktree-manual-order.ts`.
