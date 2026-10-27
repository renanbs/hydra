# D03a — worktree-list-module · Gaps (Orca → Hydra)

Resumo: **parity 2 · partial 51 · missing 51** (104 linhas; ver `D03a-worktree-list-module.diff.json`).

Regra de leitura: o sidebar **pintado** do Hydra é `src/components/sidebar/WorktreeSidebar.tsx`
(mount) → `WorktreeList.tsx`. Existe um **segundo pipeline headless** (`visible-worktrees.ts` →
`rendered-sidebar-worktree-order.ts` → `worktree-list/grouping/build-rows.ts`) que é alcançável
apenas para numerar os atalhos Cmd/Ctrl+1–9 (`App.tsx:2456`); ele **não renderiza** linhas. Por isso
as linhas que dependem de `buildRows`/`grouping/*` ficam no máximo `partial`.

Órfãos confirmados (`reachable_depth=null`, `hydra_unreachable.json`): `worktree-list/pointer-drag-dom.ts`,
`worktree-list/hard-scroll-up.ts`, `worktree-list/keyboard-cycle.ts`, `worktree-list/buildSidebarRows.ts`,
`worktree-list/rows/SectionHeader.tsx`, além de `worktree-drag-units.ts`, `worktree-manual-order*.ts`,
`worktree-sidebar-drag-geometry.ts`, `workspace-status-drag-data.ts`, `project-filter-reveal.ts`,
`natural-worktree-ids.ts`.

---

## G1 — Sistema de drag por ponteiro (P0 · alto impacto · alto esforço)

**Orca:** `worktree-list/drag/**` (use-pointer-drag/pointer-flush/row-state/use-lineage-drop-commit/
pointer-commit/status-target/use-native-drag/use-pointer-autoscroll/use-native-autoscroll/
use-document-drop/use-pointer-window-events/use-runtime) — drag com preview flutuante, limiar 4px,
histerese de 160ms, ancoragem de drop, autoscroll por RAF, Escape/pointercancel, supressão de clique 500ms,
multi-drag, nesting por hover e commit de lineage.

**Hydra:** só drag nativo HTML5 de reorder intra-projeto e de projetos (`WorktreeSidebar.tsx:428-506`),
com linha de 2px no card (`worktree-card-surface.tsx:95-105`) e no header de repo
(`SectionHeader.tsx:254-263`). `pointer-drag-dom.ts` é órfão.

**Feche com:** portar `worktree-list/drag/*` chamando os hooks a partir de `WorktreeList.tsx` (prover
`onSelectionGesture`, `onCardDragStart`, `isLineageDropTarget` hoje não passados). Sem backend novo.

**Linhas:** D03a-001..024 (exceto 015/020/021/023 parciais), PAR-08/PAR-43/PAR-88.

## G2 — Viewport virtualizado, sticky headers e scroll-to-top (P0 · alto impacto · alto esforço)

**Orca:** `VirtualizedWorktreeViewport.tsx` com TanStack Virtual (overscan 10, gap 6, `useFlushSync:false`),
semântica `role=listbox`/`aria-activedescendant`, medição de rows, sticky em dois tiers, animação de
remoção de 180ms, detector `hard-scroll-up` e botão "go to top".

**Hydra:** lista plana em `WorktreeSidebar.tsx:700-705` + `WorktreeList.tsx` (map de JSX). Não há
`@tanstack/react-virtual` no sidebar; `hard-scroll-up.ts` é órfão.

**Feche com:** introduzir o viewport virtual reaproveitando `buildRows` (já portado) como fonte de rows e
`worktree-list/grouping/*` para as alturas/keys. Sem backend novo.

**Linhas:** D03a-088..103, D03a-094/D03a-095 (parciais relacionados em 093/098).

## G3 — Modos de agrupamento não renderizam as lanes (P1 · alto impacto · baixo esforço)

**Orca:** `build-rows.ts` emite lanes `none` (All), `workspace-status`, `repo` e `pr-status`, com seção
Pinned no topo, colapso por chave e folder-workspace lanes (`group-keys.ts`, `worktree-grouping.ts`,
`group-sections.ts`, `pinned-group-rows.ts`, `folder-workspace-lanes.ts`).

**Hydra:** `WorkspaceOptionsMenu.tsx:283-301` oferece None/Status/Project, mas `WorktreeList.tsx:338`
usa `groupBy` **apenas para indentação** — o paint é sempre por projeto. O pipeline `buildRows` só
reordena os atalhos (`rendered-sidebar-worktree-order.ts:56`).

**Feche com:** renderizar as lanes a partir de `buildRows(...)` já existente (troca de fonte de dados em
`WorktreeList`), incluindo header `All`/status/Pinned e folder lanes. Esforço baixo porque a lógica já
existe; sem backend novo.

**Linhas:** D03a-025..041, D03a-052, PAR-35.

## G4 — Seleção múltipla e navegação por teclado (P1 · alto impacto · médio esforço)

**Orca:** `navigation/use-selection.ts` (intent Cmd/Ctrl/Shift, prune por render, limpeza fora do
container, `selectForContextMenu`, alvos host-qualified) e `navigation/use-keyboard.ts` (focar lista,
navigateUp/Down, Enter→xterm, PageUp/Down/Home/End, ignorar campos editáveis exceto
`.xterm-helper-textarea`).

**Hydra:** o controller do card já expõe `onSelectionGesture`/`isMultiSelected`
(`use-worktree-card-controller.ts:186-196`, `worktree-card-model.ts:22-25`), mas `WorktreeList.tsx` não
os conecta. Teclado: só Cmd+Shift+ArrowUp/Down em `App.tsx:2633-2641`; `keyboard-cycle.ts` é órfão.

**Feche com:** ligar `onSelectionGesture` no render e portar `use-keyboard`/`use-selection` alimentando
`getCyclableWorktreeRows` a partir das rows pintadas. Sem backend novo.

**Linhas:** D03a-058, D03a-059, D03a-060, PAR-08/PAR-22.

## G5 — Infra de reveal (P1 · alto impacto · médio/alto esforço)

**Orca:** `navigation/use-pending-reveal.ts` (expandir ancestrais + `scrollToIndex` com até 8 retries +
rename), `use-reveal-requests.ts` (diálogo "Reveal hidden workspace?" e ajuste de filtros host-qualified),
`use-reveal-highlight.ts`, `active-descendant-option.ts`, `render-row-lookup.ts`, `folder-reveal.ts`,
`reveal-ancestors.ts`.

**Hydra:** `WorktreeSidebar.tsx:382-418` (`handleRevealCurrent`) expande projeto/grupo colapsado, faz
`scrollIntoView` e glow (`flashRevealedWorktree`, 1500ms — este é o único trecho **parity**, D03a-064/061).
Não há retry, reveal de headers, rename-on-reveal, `aria-activedescendant` nem diálogo de confirmação de
filtros; `project-filter-reveal.ts` é órfão.

**Linhas:** D03a-062, 063, 065, 066, 067, 068, 069, 070, 071, PAR-44.

## G6 — Pinned section e host sections (P1 · médio impacto · médio esforço)

**Orca:** `pinned-group-rows.ts` (política single-location/duplicate-in-groups, contagens por host,
pinned-fallback) e `rows/HostSectionHeader.tsx` (saúde, contagem, menu, drag).

**Hydra:** `pinned-section-worktrees.ts:8` e `host-section-rows.ts:166` existem (headless); o paint só
marca `isPinned` no card (`WorktreeList.tsx:374`) e não tem headers de host.

**Linhas:** D03a-030 (PAR-35), D03a-036, D03a-074.

## G7 — Persistência de drop (ordem/status) (P2 · médio impacto · baixo esforço)

**Orca:** `use-status-mutations.ts` grava `workspaceStatus` com executionHostId, `moveWorktreesToStatusAtIndex`
combina status+ordem e força `sortBy=manual`; `recordFeatureInteraction`.

**Hydra:** `App.tsx:1922-1943` persiste só a ordem manual em `localStorage` por projeto; sem status, sem
troca para sortBy manual, sem board.

**Linhas:** D03a-021 (ver também D03a-009/D03a-010).

## G8 — PR lanes e refresh de PR/CI por rows visíveis (P2 · médio impacto · médio esforço)

**Orca:** `group-keys.ts:108` (`getPRGroupKey` com precedência repo-scoped/legada/SSH) e
`use-visible-review-refresh.ts` (`reportVisibleGitHubPRRefreshCandidates`).

**Hydra:** `getPRGroupKey` é port alcançável mas só ordena atalhos; `prByPath` é calculado em
`App.tsx:2005-2023` (`pr_status` por repo/branch), sem lanes nem report por viewport.

**Linhas:** D03a-029, D03a-104, D03a-100. Backend: `pr_status` já existe (não alcançável do sidebar,
por isso `partial`).

## G9 — Folder path status fresco + indicador (P2 · médio impacto · baixo esforço)

**Orca:** `use-folder-path-statuses.ts` (cache key + rota por runtime, expiração) e
`FolderPathStatusIndicator.tsx` (confirmed-stale, ambiguous-connection, tooltip com descrição).

**Hydra:** `App.tsx:2063-2080` faz probe one-shot `path_exists` e passa `missingFolderPaths`;
`FolderWorkspaceRow.tsx:44-58` desenha o badge FolderX simples.

**Linhas:** D03a-057, D03a-073. Backend: `path_exists` existe (fora do conjunto alcançável do sidebar;
evidência por `App.tsx`).

## G10 — Notices/virtual rows e detalhes de header (P2/P3 · baixo impacto · baixo/médio esforço)

- **Pending creation row** (D03a-035): `row-builders.ts:22` existe headless; o paint não tem linha
  `pending-creation`. Exige só o ramo no render.
- **Scan failure indicator** (D03a-075): `RepoScanUnavailableIndicator` não existe; o retry pode usar
  `invoke('scan_worktrees')` (já alcançável do sidebar).
- **Empty state** (D03a-042, PAR-80): texto/ações divergem ("No workspaces" vs "No workspaces found").
- **Filtros granulares** (D03a-043, PAR-26): `hideSleeping`/`hideAutomationCreated`/`hideCliCreated`
  existem em `displayOptions` mas não são aplicados; `computeClearFilterActions` só serve o pipeline de atalhos.
- **Suppress inbox dialog** (D03a-086) e toasts de grupo (D03a-087): faltam telas/estados de erro.
- **Indicadores de drop de header/host** (D03a-092) e guards de evento nomeados (D03a-078).

---

## Contratos Tauri necessários

Nenhum gap acima exige comando novo: ordenação/status/pin são persistidos em `localStorage`/store no
Hydra, e os poucos pontos com backend mapeiam para comandos **já existentes**:

| Necessidade | Comando existente | Situação |
|---|---|---|
| Importar/mostrar worktree escondida | `import_worktree` | chamado do sidebar (`WorktreeSidebar.tsx:763`) |
| Baseline/suppress de invisíveis | `catalog_set_worktree_visibility`, `suppress_worktree_inbox` | chamados (`WorktreeSidebar.tsx:775/794`) |
| Retry de scan falho (D03a-075) | `scan_worktrees` | existe; sidebar alcança via `SidebarAgentsList`/`WorktreeList` |
| Status de path de folder (D03a-057/073) | `path_exists` | existe; hoje chamado só em `App.tsx:2071` |
| PR do card/lane (D03a-029/104) | `pr_status` | existe; hoje chamado só em `App.tsx:2023` |

Gaps puramente de UI/estado (drag, virtualização, agrupamento, seleção, reveal) não têm contraparte
Rust no Orca e não exigem comando Tauri.
