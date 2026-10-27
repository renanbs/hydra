# Parede de Evidência — Domínio D08-kanban-board (Kanban / Board do Sidebar)

## Contagens de Cobertura
- **arquivos**: 42/42 (100%)
- **símbolos**: 116/116 (100%)
- **testes**: 213/213 (100%)
- **labels**: 53/53 (100%)
- **hotkeys**: 15/15 (100%)
- **prefs**: 0/0 (100%)
- **timers**: 12/12 (100%)
- **subs**: 37/37 (100%)
- **preload**: 0/0 (100%)

---

## Itens com Justificativa Especial (INFRA / N/A / DUP)

| Categoria | Entrada | Justificativa |
|---|---|---|
| symbols | `WorkspaceBoardPanelState` | `INFRA: TypeScript type definition for panel hook return state` |
| symbols | `WorkspaceBoardTaskStatusSyncResult` | `INFRA: TypeScript type definition for task sync result shape` |
| symbols | `WorkspaceBoardTaskStatusSyncMessage` | `INFRA: TypeScript union type for task sync outcome messages` |
| symbols | `SyncWorkspaceBoardTaskStatusesArgs` | `INFRA: TypeScript argument interface for task status sync runner` |
| symbols | `WorkspaceBoardTaskStatusSyncRequest` | `INFRA: TypeScript request interface for task status sync` |
| symbols | `AreaSelectionViewportRect` | `INFRA: TypeScript type definition for viewport rectangle coordinates` |
| symbols | `AreaSelectionCardRect` | `INFRA: TypeScript type definition for area selection card rectangle metrics` |
| symbols | `AREA_SELECTION_SCROLL_CONTAINER_SELECTOR` | `INFRA: CSS selector constant for lane scroll container` |
| symbols | `AreaSelectionRect` | `INFRA: TypeScript type definition for area selection rectangle` |
| symbols | `AREA_SELECTION_AUTO_SCROLL_EDGE_SIZE` | `INFRA: Constant defining auto-scroll edge detection boundary in pixels (48px)` |
| symbols | `AREA_SELECTION_AUTO_SCROLL_MAX_DELTA` | `INFRA: Constant defining maximum auto-scroll velocity step in pixels (22px)` |
| symbols | `AreaSelectionDragState` | `INFRA: TypeScript state interface for area selection drag state tracking` |
| symbols | `UseWorkspaceKanbanAreaSelectionParams` | `INFRA: TypeScript parameter interface for area selection hook` |
| symbols | `AREA_SELECTION_DRAG_THRESHOLD` | `INFRA: Constant defining minimal pointer displacement (4px) to initiate marquee drag` |
| symbols | `CARD_SELECTOR` | `INFRA: CSS selector constant for workspace board cards` |
| symbols | `STATUS_DROP_TARGET` | `INFRA: CSS selector constant for status lane drop targets` |
| symbols | `PIN_DROP_TARGET` | `INFRA: CSS selector constant for pin drop target` |
| symbols | `WorkspaceKanbanStatusDropRect` | `INFRA: TypeScript type definition for status lane drop rectangles` |
| symbols | `WorkspaceKanbanCardDropRect` | `INFRA: TypeScript type definition for card drop rectangles` |
| symbols | `WorkspaceKanbanLaneDropRect` | `INFRA: TypeScript type definition for lane drop bounding rectangles` |
| symbols | `WorkspaceKanbanCardDropTarget` | `INFRA: TypeScript type definition for resolved card drop target` |
| symbols | `WorkspaceKanbanCardTrackedDropTarget` | `INFRA: TypeScript type definition for tracked pointer drop target` |
| symbols | `WORKSPACE_LANE_FULL_IDS_DELIMITER` | `INFRA: Constant defining NUL character delimiter for serialized lane IDs` |
| symbols | `UseWorkspaceKanbanCardPointerDragParams` | `INFRA: TypeScript parameter interface for card pointer drag hook` |
| symbols | `WorkspaceKanbanLaneView` | `INFRA: TypeScript type definition for lane items and total count view` |
| symbols | `WorkspaceKanbanVirtualLaneItemRect` | `INFRA: TypeScript type definition for virtual lane item rectangle metrics` |
| labels | `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:172 :: { id: 'todo', label: 'Todo' },` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.search.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:173 :: { id: 'in-review', label: 'In review' }` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.search.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:321 :: targetStatus: { id: 'todo', label: 'Todo' }` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.search.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:195 :: { id: 'todo', label: 'Todo' },` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.task-status-sync.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:196 :: { id: 'in-review', label: 'In review' }` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.task-status-sync.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:326 :: targetStatus: { id: 'in-review', label: 'In review' },` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.task-status-sync.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:359 :: targetStatus: { id: 'in-review', label: 'In review' }` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.task-status-sync.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:426 :: targetStatus: { id: 'in-review', label: 'In review' }` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.task-status-sync.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanDrawerHeader.test.tsx:17 :: const statuses: WorkspaceStatusDefinition[] = [{ id: 'todo', label: 'Todo' }]` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawerHeader.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanDrawerHeader.tsx:23 :: onRenameStatus: (statusId: string, label: string) => void` | `INFRA: TypeScript callback prop type in header` |
| labels | `components/sidebar/WorkspaceKanbanLaneGrid.test.tsx:94 :: label: `State ${index + 1}`` | `INFRA: test fixture / helper declaration in WorkspaceKanbanLaneGrid.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanSearchField.test.tsx:48 :: return container.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]')` | `INFRA: test fixture / helper declaration in WorkspaceKanbanSearchField.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanSettingsMenu.test.tsx:7 :: const statuses: WorkspaceStatusDefinition[] = [{ id: 'todo', label: 'Todo' }]` | `INFRA: test fixture / helper declaration in WorkspaceKanbanSettingsMenu.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanSettingsMenu.test.tsx:17 :: vi.mock('@/components/ui/tooltip', () => ({` | `INFRA: test fixture / helper declaration in WorkspaceKanbanSettingsMenu.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanSettingsMenu.test.tsx:73 :: 'button[role="switch"][aria-label="Sync board and issue status"]'` | `INFRA: test fixture / helper declaration in WorkspaceKanbanSettingsMenu.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanSettingsMenu.test.tsx:91 :: label: `State ${index + 1}`` | `INFRA: test fixture / helper declaration in WorkspaceKanbanSettingsMenu.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanSettingsMenu.tsx:10 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `INFRA: UI import for tooltip in settings menu` |
| labels | `components/sidebar/WorkspaceKanbanSettingsMenu.tsx:22 :: onRenameStatus: (statusId: string, label: string) => void` | `INFRA: TypeScript callback prop type in settings menu` |
| labels | `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:29 :: vi.mock('@/components/ui/tooltip', () => ({` | `INFRA: test fixture / helper declaration in WorkspaceKanbanStatusLane.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:35 :: const status = { id: 'todo', label: 'Todo' }` | `INFRA: test fixture / helper declaration in WorkspaceKanbanStatusLane.test.tsx` |
| labels | `components/sidebar/WorkspaceKanbanStatusLane.tsx:15 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `INFRA: UI import for tooltip in status lane` |
| labels | `components/sidebar/use-workspace-kanban-status-actions.ts:19 :: (statusId: string, label: string) => {` | `INFRA: callback parameter signature for handleRenameStatus` |
| labels | `components/sidebar/useWorkspaceBoardPanel.test.tsx:172 :: it('lets Escape close the board while non-interactive tooltip content is open', async () => {` | `INFRA: test fixture / helper declaration in useWorkspaceBoardPanel.test.tsx` |
| labels | `components/sidebar/useWorkspaceBoardPanel.test.tsx:174 :: const tooltip = document.createElement('div')` | `INFRA: test fixture / helper declaration in useWorkspaceBoardPanel.test.tsx` |
| labels | `components/sidebar/useWorkspaceBoardPanel.test.tsx:175 :: tooltip.setAttribute('data-slot', 'tooltip-content')` | `INFRA: test fixture / helper declaration in useWorkspaceBoardPanel.test.tsx` |
| labels | `components/sidebar/useWorkspaceBoardPanel.test.tsx:176 :: tooltip.setAttribute('data-state', 'open')` | `INFRA: test fixture / helper declaration in useWorkspaceBoardPanel.test.tsx` |
| labels | `components/sidebar/useWorkspaceBoardPanel.test.tsx:177 :: document.body.appendChild(tooltip)` | `INFRA: test fixture / helper declaration in useWorkspaceBoardPanel.test.tsx` |
| labels | `components/sidebar/workspace-board-task-status-sync.test.ts:51 :: return { id: 'in-review', label: 'In review', ...overrides }` | `INFRA: test fixture / helper declaration in workspace-board-task-status-sync.test.ts` |
| labels | `components/sidebar/workspace-board-task-status-sync.test.ts:324 :: targetStatus: targetStatus({ id: 'done', label: 'Done' }),` | `INFRA: test fixture / helper declaration in workspace-board-task-status-sync.test.ts` |
| labels | `components/sidebar/workspace-board-task-status-sync.test.ts:374 :: { id: 'todo', label: 'Todo' },` | `INFRA: test fixture / helper declaration in workspace-board-task-status-sync.test.ts` |
| labels | `components/sidebar/workspace-board-task-status-sync.test.ts:375 :: { id: 'in-review', label: 'In review' }` | `INFRA: test fixture / helper declaration in workspace-board-task-status-sync.test.ts` |
| labels | `components/sidebar/workspace-board-task-status-sync.test.ts:389 :: targetStatus: { id: 'in-review', label: 'In review' }` | `INFRA: test fixture / helper declaration in workspace-board-task-status-sync.test.ts` |
| labels | `components/sidebar/workspace-kanban-sidebar-drop.test.ts:17 :: { id: 'todo', label: 'Todo' },` | `INFRA: test fixture / helper declaration in workspace-kanban-sidebar-drop.test.ts` |
| labels | `components/sidebar/workspace-kanban-sidebar-drop.test.ts:18 :: { id: 'doing', label: 'Doing' }` | `INFRA: test fixture / helper declaration in workspace-kanban-sidebar-drop.test.ts` |
| labels | `components/sidebar/workspace-kanban-worktree-groups.test.ts:34 :: { id: 'todo', label: 'Todo' },` | `INFRA: test fixture / helper declaration in workspace-kanban-worktree-groups.test.ts` |
| labels | `components/sidebar/workspace-kanban-worktree-groups.test.ts:35 :: { id: 'doing', label: 'Doing' }` | `INFRA: test fixture / helper declaration in workspace-kanban-worktree-groups.test.ts` |
| hotkeys | `components/sidebar/WorkspaceKanbanSearchField.test.tsx:150 :: new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })` | `INFRA: simulated keydown event in WorkspaceKanbanSearchField.test.tsx` |
| hotkeys | `components/sidebar/WorkspaceKanbanSearchField.test.tsx:159 :: new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })` | `INFRA: simulated keydown event in WorkspaceKanbanSearchField.test.tsx` |
| hotkeys | `components/sidebar/WorkspaceKanbanSearchField.test.tsx:185 :: new KeyboardEvent('keydown', {` | `INFRA: simulated keydown event in WorkspaceKanbanSearchField.test.tsx` |
| hotkeys | `components/sidebar/useWorkspaceBoardPanel.test.tsx:57 :: from.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))` | `INFRA: simulated keydown event in useWorkspaceBoardPanel.test.tsx` |
| timers | `components/sidebar/WorkspaceKanbanDrawer.mount-gating.test.tsx:178 :: vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })` | `INFRA: fake timer / rAF spy setup in WorkspaceKanbanDrawer.mount-gating.test.tsx` |
| timers | `components/sidebar/WorkspaceKanbanLaneGrid.test.tsx:150 :: vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {` | `INFRA: fake timer / rAF spy setup in WorkspaceKanbanLaneGrid.test.tsx` |
| subscriptions | `components/sidebar/WorkspaceKanbanDrawer.mount-gating.test.tsx:62 :: React.useEffect(() => {` | `INFRA: test observer / spy subscription in WorkspaceKanbanDrawer.mount-gating.test.tsx` |
| subscriptions | `components/sidebar/WorkspaceKanbanDrawer.mount-gating.test.tsx:64 :: const unsubscribe = useAppStore.subscribe(() => contentProbe.storeNotifications())` | `INFRA: test observer / spy subscription in WorkspaceKanbanDrawer.mount-gating.test.tsx` |
| tests | `components/sidebar/WorkspaceKanbanCard.host-identity.test.tsx:31 :: WorkspaceKanbanCard host identity` | `INFRA: describe block grouping tests in WorkspaceKanbanCard.host-identity.test.tsx` |
| tests | `components/sidebar/WorkspaceKanbanDrawer.mount-gating.test.tsx:175 :: WorkspaceKanbanDrawer mount gating` | `INFRA: describe block grouping tests in WorkspaceKanbanDrawer.mount-gating.test.tsx` |
| tests | `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:266 :: WorkspaceKanbanDrawer search` | `INFRA: describe block grouping tests in WorkspaceKanbanDrawer.search.test.tsx` |
| tests | `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:286 :: WorkspaceKanbanDrawer task status sync wiring` | `INFRA: describe block grouping tests in WorkspaceKanbanDrawer.task-status-sync.test.tsx` |
| tests | `components/sidebar/WorkspaceKanbanDrawerHeader.test.tsx:81 :: WorkspaceKanbanDrawerHeader` | `INFRA: describe block grouping tests in WorkspaceKanbanDrawerHeader.test.tsx` |
| tests | `components/sidebar/WorkspaceKanbanLaneCardList.test.tsx:112 :: WorkspaceKanbanLaneCardList` | `INFRA: describe block grouping tests in WorkspaceKanbanLaneCardList.test.tsx` |
| tests | `components/sidebar/WorkspaceKanbanLaneGrid.test.tsx:167 :: WorkspaceKanbanLaneGrid` | `INFRA: describe block grouping tests in WorkspaceKanbanLaneGrid.test.tsx` |
| tests | `components/sidebar/WorkspaceKanbanSearchField.test.tsx:75 :: WorkspaceKanbanSearchField` | `INFRA: describe block grouping tests in WorkspaceKanbanSearchField.test.tsx` |
| tests | `components/sidebar/WorkspaceKanbanSettingsMenu.test.tsx:67 :: WorkspaceKanbanSettingsMenu` | `INFRA: describe block grouping tests in WorkspaceKanbanSettingsMenu.test.tsx` |
| tests | `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:103 :: WorkspaceKanbanStatusLane` | `INFRA: describe block grouping tests in WorkspaceKanbanStatusLane.test.tsx` |
| tests | `components/sidebar/use-workspace-kanban-card-pointer-drag.test.ts:19 :: workspace kanban card pointer drag start` | `INFRA: describe block grouping tests in use-workspace-kanban-card-pointer-drag.test.ts` |
| tests | `components/sidebar/use-workspace-kanban-card-pointer-drag.test.ts:38 :: workspace kanban pointer drag selection identity` | `INFRA: describe block grouping tests in use-workspace-kanban-card-pointer-drag.test.ts` |
| tests | `components/sidebar/use-workspace-kanban-drawer-lingering.test.tsx:7 :: workspace board close linger` | `INFRA: describe block grouping tests in use-workspace-kanban-drawer-lingering.test.tsx` |
| tests | `components/sidebar/use-workspace-kanban-outside-dismiss.test.ts:32 :: workspace kanban outside dismiss keep-open targets` | `INFRA: describe block grouping tests in use-workspace-kanban-outside-dismiss.test.ts` |
| tests | `components/sidebar/use-workspace-kanban-selection.test.tsx:92 :: useWorkspaceKanbanSelection` | `INFRA: describe block grouping tests in use-workspace-kanban-selection.test.tsx` |
| tests | `components/sidebar/useWorkspaceBoardPanel.test.tsx:72 :: useWorkspaceBoardPanel` | `INFRA: describe block grouping tests in useWorkspaceBoardPanel.test.tsx` |
| tests | `components/sidebar/workspace-board-task-status-sync.test.ts:95 :: syncWorkspaceBoardTaskStatuses` | `INFRA: describe block grouping tests in workspace-board-task-status-sync.test.ts` |
| tests | `components/sidebar/workspace-board-task-status-sync.test.ts:372 :: getWorkspaceBoardTaskStatusSyncRequest` | `INFRA: describe block grouping tests in workspace-board-task-status-sync.test.ts` |
| tests | `components/sidebar/workspace-kanban-area-selection.test.ts:11 :: workspace kanban area selection finish` | `INFRA: describe block grouping tests in workspace-kanban-area-selection.test.ts` |
| tests | `components/sidebar/workspace-kanban-area-selection.test.ts:40 :: workspace kanban area selection auto-scroll` | `INFRA: describe block grouping tests in workspace-kanban-area-selection.test.ts` |
| tests | `components/sidebar/workspace-kanban-area-selection.test.ts:91 :: workspace kanban area selection scrolled content hit-testing` | `INFRA: describe block grouping tests in workspace-kanban-area-selection.test.ts` |
| tests | `components/sidebar/workspace-kanban-area-selection.test.ts:175 :: workspace kanban area selection preview remount` | `INFRA: describe block grouping tests in workspace-kanban-area-selection.test.ts` |
| tests | `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:15 :: workspace kanban pointer drag drop target` | `INFRA: describe block grouping tests in workspace-kanban-card-pointer-drag-dom.test.ts` |
| tests | `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:30 :: workspace kanban pointer drag card drop index` | `INFRA: describe block grouping tests in workspace-kanban-card-pointer-drag-dom.test.ts` |
| tests | `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:61 :: workspace kanban drop indicator placement` | `INFRA: describe block grouping tests in workspace-kanban-card-pointer-drag-dom.test.ts` |
| tests | `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:88 :: workspace kanban pointer drag commit target` | `INFRA: describe block grouping tests in workspace-kanban-card-pointer-drag-dom.test.ts` |
| tests | `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:10 :: resolveFullLaneDropIndex` | `INFRA: describe block grouping tests in workspace-kanban-filtered-drop-index.test.ts` |
| tests | `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:124 :: workspace lane full-id channel` | `INFRA: describe block grouping tests in workspace-kanban-filtered-drop-index.test.ts` |
| tests | `components/sidebar/workspace-kanban-search.test.ts:38 :: matchWorkspaceBoardWorktrees` | `INFRA: describe block grouping tests in workspace-kanban-search.test.ts` |
| tests | `components/sidebar/workspace-kanban-search.test.ts:136 :: buildWorkspaceKanbanLaneViews` | `INFRA: describe block grouping tests in workspace-kanban-search.test.ts` |
| tests | `components/sidebar/workspace-kanban-sidebar-drop.test.ts:328 :: workspace kanban sidebar drop DOM bridge` | `INFRA: describe block grouping tests in workspace-kanban-sidebar-drop.test.ts` |
| tests | `components/sidebar/workspace-kanban-sidebar-drop.test.ts:553 :: workspace kanban sidebar drop updates` | `INFRA: describe block grouping tests in workspace-kanban-sidebar-drop.test.ts` |
| tests | `components/sidebar/workspace-kanban-virtual-lane-layout.test.ts:57 :: workspace kanban virtual lane layout` | `INFRA: describe block grouping tests in workspace-kanban-virtual-lane-layout.test.ts` |
| tests | `components/sidebar/workspace-kanban-worktree-groups.test.ts:42 :: groupWorkspaceKanbanWorktrees` | `INFRA: describe block grouping tests in workspace-kanban-worktree-groups.test.ts` |

---

## 1. Arquivos Produtivos (`files`)

| Arquivo Produtivo | Linhas de Inventário Associadas |
|---|---|
| `WorkspaceKanbanAreaSelectionOverlay.tsx` | `D08-032` |
| `WorkspaceKanbanCard.tsx` | `D08-027` |
| `WorkspaceKanbanDrawer.tsx` | `D08-005`, `D08-006`, `D08-008`, `D08-009` |
| `WorkspaceKanbanDrawerHeader.tsx` | `D08-008` |
| `WorkspaceKanbanDrawerView.tsx` | `D08-009` |
| `WorkspaceKanbanLaneCardList.tsx` | `D08-024` |
| `WorkspaceKanbanLaneGrid.tsx` | `D08-019`, `D08-020` |
| `WorkspaceKanbanPinDropTarget.tsx` | `D08-028` |
| `WorkspaceKanbanSearchField.tsx` | `D08-010`, `D08-011`, `D08-012` |
| `WorkspaceKanbanSettingsMenu.tsx` | `D08-015`, `D08-016`, `D08-017` |
| `WorkspaceKanbanSheet.tsx` | `D08-007` |
| `WorkspaceKanbanStatusLane.tsx` | `D08-021`, `D08-022`, `D08-026` |
| `use-workspace-board-task-status-sync.ts` | `D08-043` |
| `use-workspace-kanban-area-selection.ts` | `D08-032`, `D08-033`, `D08-035` |
| `use-workspace-kanban-board-projection.ts` | `D08-029` |
| `use-workspace-kanban-card-pointer-drag.ts` | `D08-036` |
| `use-workspace-kanban-column-resize.ts` | `D08-022` |
| `use-workspace-kanban-create-worktree.ts` | `D08-030` |
| `use-workspace-kanban-drawer-lingering.ts` | `D08-005` |
| `use-workspace-kanban-native-drag.ts` | `D08-041` |
| `use-workspace-kanban-outside-dismiss.ts` | `D08-004` |
| `use-workspace-kanban-render-lifecycle.ts` | `D08-006` |
| `use-workspace-kanban-search.ts` | `D08-013` |
| `use-workspace-kanban-selection.ts` | `D08-031` |
| `use-workspace-kanban-shift-wheel-scroll.ts` | `D08-023` |
| `use-workspace-kanban-status-actions.ts` | `D08-016`, `D08-018` |
| `use-workspace-kanban-worktree-actions.ts` | `D08-042` |
| `useWorkspaceBoardPanel.ts` | `D08-001`, `D08-002`, `D08-003` |
| `workspace-board-task-status-sync.ts` | `D08-044`, `D08-045` |
| `workspace-kanban-area-selection-card-rects.ts` | `D08-034` |
| `workspace-kanban-area-selection-dom.ts` | `D08-032`, `D08-033`, `D08-034` |
| `workspace-kanban-area-selection-state.ts` | `D08-032`, `D08-035` |
| `workspace-kanban-card-drag-preview-dom.ts` | `D08-037` |
| `workspace-kanban-card-pointer-drag-dom.ts` | `D08-038` |
| `workspace-kanban-card-pointer-drag-start.ts` | `D08-036` |
| `workspace-kanban-filtered-drop-index.ts` | `D08-026`, `D08-039` |
| `workspace-kanban-lane-range.ts` | `D08-019` |
| `workspace-kanban-pointer-drag-selection.ts` | `D08-036` |
| `workspace-kanban-search.ts` | `D08-013`, `D08-014` |
| `workspace-kanban-sidebar-drop.ts` | `D08-040` |
| `workspace-kanban-virtual-lane-layout.ts` | `D08-025` |
| `workspace-kanban-worktree-groups.ts` | `D08-029` |

---

## 2. Símbolos Exportados (`symbols`)

| Símbolo Exportado | Mapeamento / Justificativa |
|---|---|
| `WorkspaceKanbanAreaSelectionOverlay.tsx:default` | `D08-032` |
| `WorkspaceKanbanCard.tsx:default` | `D08-027` |
| `WorkspaceKanbanDrawer.tsx:default` | `D08-005` |
| `WorkspaceKanbanDrawerHeader.tsx:default` | `D08-008` |
| `WorkspaceKanbanDrawerView.tsx:default` | `D08-009` |
| `WorkspaceKanbanLaneCardList.tsx:default` | `D08-024` |
| `WorkspaceKanbanLaneGrid.tsx:default` | `D08-019` |
| `WorkspaceKanbanPinDropTarget.tsx:default` | `D08-028` |
| `WorkspaceKanbanSearchField.tsx:default` | `D08-010` |
| `WorkspaceKanbanSettingsMenu.tsx:default` | `D08-015` |
| `WorkspaceKanbanSheet.tsx:default` | `D08-007` |
| `WorkspaceKanbanStatusLane.tsx:default` | `D08-021` |
| `AREA_SELECTION_AUTO_SCROLL_EDGE_SIZE` | `INFRA: Constant defining auto-scroll edge detection boundary in pixels (48px)` |
| `AREA_SELECTION_AUTO_SCROLL_MAX_DELTA` | `INFRA: Constant defining maximum auto-scroll velocity step in pixels (22px)` |
| `AREA_SELECTION_DRAG_THRESHOLD` | `INFRA: Constant defining minimal pointer displacement (4px) to initiate marquee drag` |
| `AREA_SELECTION_SCROLL_CONTAINER_SELECTOR` | `INFRA: CSS selector constant for lane scroll container` |
| `AreaSelectionCardRect` | `INFRA: TypeScript type definition for area selection card rectangle metrics` |
| `AreaSelectionDragState` | `INFRA: TypeScript state interface for area selection drag state tracking` |
| `AreaSelectionRect` | `INFRA: TypeScript type definition for area selection rectangle` |
| `AreaSelectionViewportRect` | `INFRA: TypeScript type definition for viewport rectangle coordinates` |
| `CARD_SELECTOR` | `INFRA: CSS selector constant for workspace board cards` |
| `PIN_DROP_TARGET` | `INFRA: CSS selector constant for pin drop target` |
| `STATUS_DROP_TARGET` | `INFRA: CSS selector constant for status lane drop targets` |
| `SyncWorkspaceBoardTaskStatusesArgs` | `INFRA: TypeScript argument interface for task status sync runner` |
| `TOGGLE_WORKSPACE_BOARD_EVENT` | `D08-001` |
| `UseWorkspaceKanbanAreaSelectionParams` | `INFRA: TypeScript parameter interface for area selection hook` |
| `UseWorkspaceKanbanCardPointerDragParams` | `INFRA: TypeScript parameter interface for card pointer drag hook` |
| `WORKSPACE_LANE_FULL_IDS_DELIMITER` | `INFRA: Constant defining NUL character delimiter for serialized lane IDs` |
| `WorkspaceBoardPanelState` | `INFRA: TypeScript type definition for panel hook return state` |
| `WorkspaceBoardTaskStatusSyncMessage` | `INFRA: TypeScript union type for task sync outcome messages` |
| `WorkspaceBoardTaskStatusSyncRequest` | `INFRA: TypeScript request interface for task status sync` |
| `WorkspaceBoardTaskStatusSyncResult` | `INFRA: TypeScript type definition for task sync result shape` |
| `WorkspaceKanbanCardDropRect` | `INFRA: TypeScript type definition for card drop rectangles` |
| `WorkspaceKanbanCardDropTarget` | `INFRA: TypeScript type definition for resolved card drop target` |
| `WorkspaceKanbanCardTrackedDropTarget` | `INFRA: TypeScript type definition for tracked pointer drop target` |
| `WorkspaceKanbanDrawer` | `D08-005`, `D08-006`, `D08-008`, `D08-009`, `D08-042` |
| `WorkspaceKanbanDrawerHeader` | `D08-008` |
| `WorkspaceKanbanDrawerView` | `D08-009` |
| `WorkspaceKanbanLaneDropRect` | `INFRA: TypeScript type definition for lane drop bounding rectangles` |
| `WorkspaceKanbanLaneGrid` | `D08-019`, `D08-020` |
| `WorkspaceKanbanLaneView` | `INFRA: TypeScript type definition for lane items and total count view` |
| `WorkspaceKanbanPinDropTarget` | `D08-028` |
| `WorkspaceKanbanSearchField` | `D08-010`, `D08-011`, `D08-012` |
| `WorkspaceKanbanSettingsMenu` | `D08-015`, `D08-016`, `D08-017` |
| `WorkspaceKanbanSheet` | `D08-007` |
| `WorkspaceKanbanStatusDropRect` | `INFRA: TypeScript type definition for status lane drop rectangles` |
| `WorkspaceKanbanVirtualLaneItemRect` | `INFRA: TypeScript type definition for virtual lane item rectangle metrics` |
| `buildWorkspaceBoardPaletteDocuments` | `D08-013` |
| `buildWorkspaceKanbanLaneViews` | `D08-014` |
| `buildWorkspaceKanbanSidebarDropUpdates` | `D08-040` |
| `clearPreviewSelection` | `D08-034` |
| `clearWorkspaceKanbanSidebarDropTargetVisual` | `D08-040` |
| `createDragPreview` | `D08-037` |
| `extractWorkspaceKanbanLaneRange` | `D08-019` |
| `getAreaSelectionAutoScrollDelta` | `D08-033` |
| `getAreaSelectionCardIds` | `D08-034` |
| `getAreaSelectionCardRects` | `D08-034` |
| `getAreaSelectionRect` | `D08-032` |
| `getAreaSelectionScrollContainer` | `D08-033` |
| `getAreaSelectionScrollStartContentYByElement` | `D08-034` |
| `getCardDropTarget` | `D08-038` |
| `getDropTarget` | `D08-038` |
| `getWorkspaceBoardTaskStatusSyncRequest` | `D08-045` |
| `getWorkspaceKanbanSidebarDropGroups` | `D08-040` |
| `getWorkspaceKanbanSidebarDropTarget` | `D08-040` |
| `getWorkspaceKanbanVirtualLaneItemIds` | `D08-025` |
| `getWorkspaceKanbanVirtualLaneItemRects` | `D08-025` |
| `groupWorkspaceKanbanWorktrees` | `D08-029` |
| `hasWorkspaceKanbanSidebarDropBoard` | `D08-040` |
| `isScrollbarPointerDown` | `D08-032` |
| `isWorkspaceBoardKeepOpenTarget` | `D08-004` |
| `isWorkspaceKanbanSidebarDropPointInBoard` | `D08-040` |
| `matchWorkspaceBoardWorktrees` | `D08-013` |
| `overlayReserve` | `D08-010` |
| `parseWorkspaceLaneFullIds` | `D08-026` |
| `registerWorkspaceKanbanSidebarDropGroups` | `D08-040` |
| `registerWorkspaceKanbanVirtualLaneLayout` | `D08-025` |
| `removeCardDropIndicator` | `D08-038` |
| `resolveFullLaneDropIndex` | `D08-039` |
| `resolveWorkspaceCardDropIndexFromRects` | `D08-038` |
| `resolveWorkspaceCardDropIndicatorY` | `D08-038` |
| `resolveWorkspaceKanbanCardDropCommitTarget` | `D08-038` |
| `resolveWorkspaceKanbanPointerDragSelection` | `D08-036` |
| `resolveWorkspaceKanbanSidebarFullLaneDropIndex` | `D08-040` |
| `resolveWorkspaceKanbanVirtualLaneDropIndex` | `D08-025` |
| `resolveWorkspaceKanbanVirtualLaneDropIndicatorY` | `D08-025` |
| `resolveWorkspaceStatusDropTargetFromRects` | `D08-038` |
| `serializeWorkspaceLaneFullIds` | `D08-026` |
| `setDragDocumentStyles` | `D08-037` |
| `setDraggedCardsDragging` | `D08-037` |
| `setOverlayRect` | `D08-032` |
| `shouldCommitWorkspaceKanbanAreaSelection` | `D08-035` |
| `shouldIgnoreAreaSelectionStart` | `D08-032` |
| `shouldIgnoreWorkspaceKanbanCardPointerDown` | `D08-036` |
| `shouldStartWorkspaceKanbanCardPointerDrag` | `D08-036` |
| `syncWorkspaceBoardTaskStatuses` | `D08-044` |
| `updateCardDropIndicator` | `D08-038` |
| `updateDragPreviewPosition` | `D08-037` |
| `updatePreviewSelection` | `D08-034` |
| `updateWorkspaceKanbanSidebarDropTargetVisual` | `D08-040` |
| `useWorkspaceBoardPanel` | `D08-001`, `D08-002`, `D08-003` |
| `useWorkspaceBoardTaskStatusSync` | `D08-043` |
| `useWorkspaceKanbanAreaSelection` | `D08-032`, `D08-033`, `D08-035` |
| `useWorkspaceKanbanBoardProjection` | `D08-029` |
| `useWorkspaceKanbanCardPointerDrag` | `D08-036` |
| `useWorkspaceKanbanColumnResize` | `D08-022` |
| `useWorkspaceKanbanCreateWorktree` | `D08-030` |
| `useWorkspaceKanbanDrawerLingering` | `D08-005` |
| `useWorkspaceKanbanNativeDrag` | `D08-041` |
| `useWorkspaceKanbanOutsideDismiss` | `D08-004` |
| `useWorkspaceKanbanRenderLifecycle` | `D08-006` |
| `useWorkspaceKanbanSearch` | `D08-013` |
| `useWorkspaceKanbanSelection` | `D08-031` |
| `useWorkspaceKanbanShiftWheelScroll` | `D08-023` |
| `useWorkspaceKanbanStatusActions` | `D08-016`, `D08-018` |
| `useWorkspaceKanbanWorktreeActions` | `D08-042` |

---

## 3. Testes (`tests`)

| Caso de Teste | Mapeamento / Justificativa |
|---|---|
| `components/sidebar/WorkspaceKanbanCard.host-identity.test.tsx:31 :: WorkspaceKanbanCard host identity` | `INFRA: describe block grouping tests in WorkspaceKanbanCard.host-identity.test.tsx` |
| `components/sidebar/WorkspaceKanbanCard.host-identity.test.tsx:32 :: keeps the DOM and selection gesture scoped to one host` | `D08-027` |
| `components/sidebar/WorkspaceKanbanDrawer.mount-gating.test.tsx:175 :: WorkspaceKanbanDrawer mount gating` | `INFRA: describe block grouping tests in WorkspaceKanbanDrawer.mount-gating.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawer.mount-gating.test.tsx:197 :: unmounts heavy content after the close animation and isolates closed churn` | `D08-005` |
| `components/sidebar/WorkspaceKanbanDrawer.mount-gating.test.tsx:236 :: cancels the pending unmount when reopened at 299 ms` | `D08-005` |
| `components/sidebar/WorkspaceKanbanDrawer.mount-gating.test.tsx:248 :: preserves drag preview presentation when the preview becomes a full board` | `D08-005` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:266 :: WorkspaceKanbanDrawer search` | `INFRA: describe block grouping tests in WorkspaceKanbanDrawer.search.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:267 :: filters every lane in place and reports lane totals` | `D08-013` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:281 :: restores every lane when the query is cleared` | `D08-013` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:294 :: drops the query when the board closes so a reopen starts unfiltered` | `D08-013` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:306 :: still runs the Linear status sync for a drop made under an active query` | `D08-013` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:326 :: narrows the pointer-drag payload to the rendered cards` | `D08-013` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:336 :: narrows the context-menu ` | `D08-013` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:345 :: keeps selection highlighting unfiltered while a query is active` | `D08-013` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:354 :: counts only the rendered cards in the header selection badge` | `D08-013` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:364 :: scopes selection gestures to the rendered cards` | `D08-013` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:373 :: reports a non-filtering query so the header withholds match counts` | `D08-013` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:382 :: leaves the whole board unfiltered for an over-bound query` | `D08-013` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:400 :: ranks a drop into a filtered lane against the full lane, not the rendered one` | `D08-013` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:286 :: WorkspaceKanbanDrawer task status sync wiring` | `INFRA: describe block grouping tests in WorkspaceKanbanDrawer.task-status-sync.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:287 :: reserves the status bar row in the board sheet and overlay when visible` | `D08-042` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:301 :: keeps the board sheet and overlay flush to the viewport bottom when status bar is hidden` | `D08-042` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:315 :: syncs Linear after a document-drop status move when the setting is enabled` | `D08-042` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:333 :: does not sync when a document-drop status move happens while disabled` | `D08-042` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:344 :: syncs pointer-drop status changes through the board callback` | `D08-042` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:364 :: does not sync manual-order-only drops that keep the same board status` | `D08-042` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:379 :: does not sync pin-only paths` | `D08-042` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:392 :: shows a warning toast when task status sync is skipped with a message` | `D08-042` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:415 :: syncs Linear when the board context-menu ` | `D08-042` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:431 :: does not sync a context-menu status move when the setting is disabled` | `D08-042` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:442 :: does not sync a context-menu status move that keeps the same board status` | `D08-042` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:453 :: shows an error toast when task status sync unexpectedly rejects` | `D08-042` |
| `components/sidebar/WorkspaceKanbanDrawerHeader.test.tsx:117 :: keeps the filter, settings, and close cluster reachable alongside the field` | `D08-008` |
| `components/sidebar/WorkspaceKanbanDrawerHeader.test.tsx:130 :: keeps the selected-count badge and the field clear of the control cluster` | `D08-008` |
| `components/sidebar/WorkspaceKanbanDrawerHeader.test.tsx:81 :: WorkspaceKanbanDrawerHeader` | `INFRA: describe block grouping tests in WorkspaceKanbanDrawerHeader.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawerHeader.test.tsx:82 :: routes the close button through the explicit drawer close callback` | `D08-008` |
| `components/sidebar/WorkspaceKanbanDrawerHeader.test.tsx:96 :: renders the search field as a sibling of the sheet title, not inside it` | `D08-008` |
| `components/sidebar/WorkspaceKanbanLaneCardList.test.tsx:112 :: WorkspaceKanbanLaneCardList` | `INFRA: describe block grouping tests in WorkspaceKanbanLaneCardList.test.tsx` |
| `components/sidebar/WorkspaceKanbanLaneCardList.test.tsx:113 :: mounts only the virtual window, not the whole lane` | `D08-024` |
| `components/sidebar/WorkspaceKanbanLaneCardList.test.tsx:129 :: gives every rendered card its lane index, not its rendered position` | `D08-024` |
| `components/sidebar/WorkspaceKanbanLaneCardList.test.tsx:138 :: reserves the full lane height so the scrollbar spans the whole list` | `D08-024` |
| `components/sidebar/WorkspaceKanbanLaneCardList.test.tsx:146 :: positions each card at its virtual offset` | `D08-024` |
| `components/sidebar/WorkspaceKanbanLaneCardList.test.tsx:155 :: renders nothing for an empty lane and a single card at index 0` | `D08-024` |
| `components/sidebar/WorkspaceKanbanLaneCardList.test.tsx:165 :: gives same-id cards unique host-qualified virtual and DOM identities` | `D08-024` |
| `components/sidebar/WorkspaceKanbanLaneGrid.test.tsx:167 :: WorkspaceKanbanLaneGrid` | `INFRA: describe block grouping tests in WorkspaceKanbanLaneGrid.test.tsx` |
| `components/sidebar/WorkspaceKanbanLaneGrid.test.tsx:168 :: reserves the full workflow width while mounting only the horizontal window` | `D08-019` |
| `components/sidebar/WorkspaceKanbanLaneGrid.test.tsx:183 :: mounts later ordered lanes and releases distant lanes after horizontal scroll` | `D08-019` |
| `components/sidebar/WorkspaceKanbanLaneGrid.test.tsx:198 :: keeps one focused lane mounted without unbounding the virtual window` | `D08-019` |
| `components/sidebar/WorkspaceKanbanLaneGrid.test.tsx:215 :: adds only the focused lane to the normal overscanned range` | `D08-019` |
| `components/sidebar/WorkspaceKanbanLaneGrid.test.tsx:221 :: hydrates at most one mounted lane per animation frame` | `D08-019` |
| `components/sidebar/WorkspaceKanbanLaneGrid.test.tsx:233 :: passes the host-qualified active workspace through virtualized lanes` | `D08-019` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:101 :: hides the visual match count from assistive tech but keeps the clear button named` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:110 :: withholds counts for text that never narrows the board` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:122 :: announces match counts only after the query settles` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:141 :: clears a non-empty query on Escape and closes the board on an empty one` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:166 :: says so when a query was discarded for length instead of silently not filtering` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:180 :: leaves Escape to the IME while a composition is in progress` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:198 :: keeps focus in the field after the clear button unmounts itself` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:209 :: reserves overlay width in font-relative units, capped so text stays visible` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:75 :: WorkspaceKanbanSearchField` | `INFRA: describe block grouping tests in WorkspaceKanbanSearchField.test.tsx` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:76 :: reports every keystroke without debouncing` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:89 :: only offers the clear affordance for a non-empty query` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.test.tsx:67 :: WorkspaceKanbanSettingsMenu` | `INFRA: describe block grouping tests in WorkspaceKanbanSettingsMenu.test.tsx` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.test.tsx:68 :: renders the task status sync switch and forwards changes` | `D08-015` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.test.tsx:86 :: keeps adding available for workflows above the former board limit` | `D08-015` |
| `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:103 :: WorkspaceKanbanStatusLane` | `INFRA: describe block grouping tests in WorkspaceKanbanStatusLane.test.tsx` |
| `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:104 :: shows a plain count without a query and a matches/total count with one` | `D08-021` |
| `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:113 :: keeps a fully filtered lane as a labeled drop target` | `D08-021` |
| `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:120 :: shows the empty placeholder when there is no query` | `D08-021` |
| `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:127 :: leaves an already-empty lane as Empty under a query rather than ` | `D08-021` |
| `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:135 :: publishes the full lane membership even when the rendered set is a subset` | `D08-021` |
| `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:147 :: stays off the full-id channel when nothing is filtered` | `D08-021` |
| `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:160 :: passes the host-qualified active workspace through to the card list` | `D08-021` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.test.ts:19 :: workspace kanban card pointer drag start` | `INFRA: describe block grouping tests in use-workspace-kanban-card-pointer-drag.test.ts` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.test.ts:20 :: starts for plain primary mouse drags` | `D08-036` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.test.ts:24 :: does not steal modifier gestures from selection` | `D08-036` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.test.ts:30 :: ignores touch and non-primary buttons` | `D08-036` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.test.ts:38 :: workspace kanban pointer drag selection identity` | `INFRA: describe block grouping tests in use-workspace-kanban-card-pointer-drag.test.ts` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.test.ts:39 :: does not expand a same-id drag to the unselected host` | `D08-036` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.test.ts:56 :: drags the selected host-qualified batch when the source row is selected` | `D08-036` |
| `components/sidebar/use-workspace-kanban-drawer-lingering.test.tsx:10 :: keeps drawer state through the close animation, then releases it at 300 ms` | `D08-005` |
| `components/sidebar/use-workspace-kanban-drawer-lingering.test.tsx:23 :: cancels the pending release when reopened` | `D08-005` |
| `components/sidebar/use-workspace-kanban-drawer-lingering.test.tsx:7 :: workspace board close linger` | `INFRA: describe block grouping tests in use-workspace-kanban-drawer-lingering.test.tsx` |
| `components/sidebar/use-workspace-kanban-outside-dismiss.test.ts:32 :: workspace kanban outside dismiss keep-open targets` | `INFRA: describe block grouping tests in use-workspace-kanban-outside-dismiss.test.ts` |
| `components/sidebar/use-workspace-kanban-outside-dismiss.test.ts:42 :: keeps the board open when a Sonner toast action is clicked` | `D08-004` |
| `components/sidebar/use-workspace-kanban-outside-dismiss.test.ts:49 :: keeps the board open when the contextual tour panel is clicked` | `D08-004` |
| `components/sidebar/use-workspace-kanban-outside-dismiss.test.ts:56 :: does not keep the board open for generic outside content` | `D08-004` |
| `components/sidebar/use-workspace-kanban-selection.test.tsx:102 :: never ranges through cards a search has hidden` | `D08-031` |
| `components/sidebar/use-workspace-kanban-selection.test.tsx:111 :: keeps a hidden card selected so clearing the search restores the selection` | `D08-031` |
| `components/sidebar/use-workspace-kanban-selection.test.tsx:124 :: extends the range from a visible card when a search hides the anchor` | `D08-031` |
| `components/sidebar/use-workspace-kanban-selection.test.tsx:140 :: replaces a hidden selection on every replace-shaped gesture alike` | `D08-031` |
| `components/sidebar/use-workspace-kanban-selection.test.tsx:155 :: lets a plain click clear a selection the search is hiding` | `D08-031` |
| `components/sidebar/use-workspace-kanban-selection.test.tsx:166 :: still prunes ids that leave the board entirely` | `D08-031` |
| `components/sidebar/use-workspace-kanban-selection.test.tsx:176 :: selects same-id cards independently by host` | `D08-031` |
| `components/sidebar/use-workspace-kanban-selection.test.tsx:92 :: useWorkspaceKanbanSelection` | `INFRA: describe block grouping tests in use-workspace-kanban-selection.test.tsx` |
| `components/sidebar/use-workspace-kanban-selection.test.tsx:93 :: ranges across the whole board when nothing is filtered` | `D08-031` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:102 :: toggles the board from the shortcut bridge event` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:122 :: renders a drag preview without recording an open interaction` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:133 :: cancels an uncommitted drag preview` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:144 :: solidifies a drag preview and keeps the board open after drag cleanup` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:157 :: keeps the board open on Escape while a nested board menu is open` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:172 :: lets Escape close the board while non-interactive tooltip content is open` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:185 :: lets Escape close the board when the board sheet itself is the open dialog` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:199 :: keeps the board open on Escape while an interactive popover is open` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:212 :: defers Escape to a text field inside the board` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:226 :: still closes the board on Escape from a text field outside it` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:236 :: keeps the board open on Escape while a nested dialog is open` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:72 :: useWorkspaceBoardPanel` | `INFRA: describe block grouping tests in useWorkspaceBoardPanel.test.tsx` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:85 :: toggles the board and records the feature interaction when opened` | `D08-001` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:119 :: uses the fetched issue workspace for state reads and writes when the link lacks one` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:144 :: routes each Linear update through the moved worktree owner settings` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:201 :: preserves null settings from the moved worktree resolver` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:226 :: skips worktrees without linked Linear issues` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:244 :: skips when the Linear issue is already in the matching state` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:255 :: skips missing or ambiguous workflow state matches` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:282 :: skips stale async writes when the local workspace status changed again` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:298 :: serializes repeated moves for the same worktree so the latest status wins` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:353 :: aggregates provider write failures without throwing` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:372 :: getWorkspaceBoardTaskStatusSyncRequest` | `INFRA: describe block grouping tests in workspace-board-task-status-sync.test.ts` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:378 :: builds a sync request for enabled status moves` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:393 :: does not build a sync request while the board setting is disabled` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:405 :: skips same-status and duplicate ids so manual-order-only drops do not sync` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:417 :: does not build a sync request without a board status target` | `D08-044` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:95 :: syncWorkspaceBoardTaskStatuses` | `INFRA: describe block grouping tests in workspace-board-task-status-sync.test.ts` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:96 :: updates Linear when exactly one workflow state matches the board status` | `D08-044` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:11 :: workspace kanban area selection finish` | `INFRA: describe block grouping tests in workspace-kanban-area-selection.test.ts` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:12 :: commits an empty non-additive surface click so selection clears` | `D08-032` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:138 :: falls back to viewport hit-testing for cards outside lane scrollers` | `D08-032` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:175 :: workspace kanban area selection preview remount` | `INFRA: describe block grouping tests in workspace-kanban-area-selection.test.ts` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:176 :: re-applies the preview attribute when a card remounts under the same id` | `D08-032` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:21 :: ignores empty additive surface clicks so modifier-click off does not clear` | `D08-032` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:30 :: commits marquee drags even when additive` | `D08-032` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:40 :: workspace kanban area selection auto-scroll` | `INFRA: describe block grouping tests in workspace-kanban-area-selection.test.ts` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:41 :: scrolls down near the bottom edge while more lane content is available` | `D08-032` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:54 :: scrolls up near the top edge while content exists above` | `D08-032` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:67 :: does not scroll when the pointer is away from the edges or at scroll limits` | `D08-032` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:91 :: workspace kanban area selection scrolled content hit-testing` | `INFRA: describe block grouping tests in workspace-kanban-area-selection.test.ts` |
| `components/sidebar/workspace-kanban-area-selection.test.ts:92 :: keeps cards selected after lane scroll moves them above the viewport marquee` | `D08-032` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:104 :: reuses the latest tracked target when release hit-testing blanks at the same point` | `D08-038` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:119 :: does not reuse a tracked target after the pointer has moved away` | `D08-038` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:15 :: workspace kanban pointer drag drop target` | `INFRA: describe block grouping tests in workspace-kanban-card-pointer-drag-dom.test.ts` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:16 :: uses the containing lane when the pointer is inside one` | `D08-038` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:20 :: falls back to the nearest lane when the pointer is in a lane gap` | `D08-038` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:25 :: does not resolve a lane outside the lane row` | `D08-038` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:30 :: workspace kanban pointer drag card drop index` | `INFRA: describe block grouping tests in workspace-kanban-card-pointer-drag-dom.test.ts` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:37 :: inserts before the first card whose midpoint is below the pointer` | `D08-038` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:42 :: inserts at the end when the pointer is below every card midpoint` | `D08-038` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:49 :: uses the lane index of a rendered card rather than its rendered position` | `D08-038` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:61 :: workspace kanban drop indicator placement` | `INFRA: describe block grouping tests in workspace-kanban-card-pointer-drag-dom.test.ts` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:67 :: places the line above, between, and below rendered cards` | `D08-038` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:73 :: falls back to the lane top when the lane renders no cards` | `D08-038` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:77 :: anchors to the rendered card that owns the lane index` | `D08-038` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:88 :: workspace kanban pointer drag commit target` | `INFRA: describe block grouping tests in workspace-kanban-card-pointer-drag-dom.test.ts` |
| `components/sidebar/workspace-kanban-card-pointer-drag-dom.test.ts:89 :: uses the current target when release hit-testing succeeds` | `D08-038` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:10 :: resolveFullLaneDropIndex` | `INFRA: describe block grouping tests in workspace-kanban-filtered-drop-index.test.ts` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:106 :: clamps out-of-range filtered indices to the first and last branches` | `D08-039` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:11 :: is the identity when nothing is filtered` | `D08-039` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:124 :: workspace lane full-id channel` | `INFRA: describe block grouping tests in workspace-kanban-filtered-drop-index.test.ts` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:125 :: round-trips lane membership through the delimiter` | `D08-039` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:133 :: distinguishes an unpublished lane from an empty one` | `D08-039` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:139 :: survives ids holding every character a path can legally contain` | `D08-039` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:23 :: maps the first filtered slot onto the first match position` | `D08-039` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:33 :: maps the end of a filtered lane one past the last match` | `D08-039` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:43 :: maps a slot between two matches onto the following match` | `D08-039` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:53 :: appends into a lane whose cards are all filtered away` | `D08-039` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:68 :: falls back toward the end of the lane the branch was aiming at` | `D08-039` |
| `components/sidebar/workspace-kanban-filtered-drop-index.test.ts:94 :: still translates when a stale lane has the same length but different members` | `D08-039` |
| `components/sidebar/workspace-kanban-search.test.ts:102 :: matches non-ASCII display names and comments` | `D08-013` |
| `components/sidebar/workspace-kanban-search.test.ts:113 :: treats an over-bound query as no filtering rather than zero matches` | `D08-013` |
| `components/sidebar/workspace-kanban-search.test.ts:121 :: separates two same-id host rows` | `D08-013` |
| `components/sidebar/workspace-kanban-search.test.ts:136 :: buildWorkspaceKanbanLaneViews` | `INFRA: describe block grouping tests in workspace-kanban-search.test.ts` |
| `components/sidebar/workspace-kanban-search.test.ts:144 :: reuses the input arrays when no query is active` | `D08-013` |
| `components/sidebar/workspace-kanban-search.test.ts:152 :: preserves lane order and per-lane sort order` | `D08-013` |
| `components/sidebar/workspace-kanban-search.test.ts:162 :: keeps a fully filtered lane with an empty item list and its real total` | `D08-013` |
| `components/sidebar/workspace-kanban-search.test.ts:38 :: matchWorkspaceBoardWorktrees` | `INFRA: describe block grouping tests in workspace-kanban-search.test.ts` |
| `components/sidebar/workspace-kanban-search.test.ts:39 :: treats blank and whitespace-only queries as no filtering` | `D08-013` |
| `components/sidebar/workspace-kanban-search.test.ts:45 :: matches display name, branch, and repo display name` | `D08-013` |
| `components/sidebar/workspace-kanban-search.test.ts:57 :: matches the workspace comment` | `D08-013` |
| `components/sidebar/workspace-kanban-search.test.ts:66 :: excludes worktrees that only match on PR, issue, or port` | `D08-013` |
| `components/sidebar/workspace-kanban-search.test.ts:75 :: matches composite repo/branch queries` | `D08-013` |
| `components/sidebar/workspace-kanban-search.test.ts:84 :: is case-insensitive` | `D08-013` |
| `components/sidebar/workspace-kanban-search.test.ts:90 :: treats regex metacharacters as literal text` | `D08-013` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:328 :: workspace kanban sidebar drop DOM bridge` | `INFRA: describe block grouping tests in workspace-kanban-sidebar-drop.test.ts` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:329 :: resolves the board lane and rendered card index under a sidebar pointer drag` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:343 :: prefers complete registered groups and restores the DOM fallback on cleanup` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:360 :: uses the full virtual layout when the mounted card window is stale` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:408 :: prefers the published full lane membership over the rendered card scan` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:419 :: keeps the tracked drop target in the rendered index space of the indicator` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:431 :: translates a rendered drop index onto the full lane at the commit boundary` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:444 :: lands a virtualized searched lane drop where the indicator pointed` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:462 :: translates virtualized searched lane drops above and below the mounted window` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:479 :: passes a virtualized unfiltered lane drop index through untranslated` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:496 :: still counts unlaid-out cards as lane members without a virtual layout` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:512 :: passes the drop index through for a lane it cannot find` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:518 :: marks and clears the external board hover target` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:537 :: detects pointer entry across the whole board sheet` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:553 :: workspace kanban sidebar drop updates` | `INFRA: describe block grouping tests in workspace-kanban-sidebar-drop.test.ts` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:554 :: writes a status-only update for cross-lane drops outside Manual sort` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:582 :: keeps the dropped board position when Manual sort is active` | `D08-040` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:618 :: keeps board drops sparse when filtered rows already have durable ranks` | `D08-040` |
| `components/sidebar/workspace-kanban-virtual-lane-layout.test.ts:110 :: does not let stale cleanup remove a newer lane registration` | `D08-025` |
| `components/sidebar/workspace-kanban-virtual-lane-layout.test.ts:133 :: places empty-lane and boundary drop indicators from the spacer` | `D08-025` |
| `components/sidebar/workspace-kanban-virtual-lane-layout.test.ts:152 :: returns null when measurements are incomplete or mismatched` | `D08-025` |
| `components/sidebar/workspace-kanban-virtual-lane-layout.test.ts:57 :: workspace kanban virtual lane layout` | `INFRA: describe block grouping tests in workspace-kanban-virtual-lane-layout.test.ts` |
| `components/sidebar/workspace-kanban-virtual-lane-layout.test.ts:58 :: resolves mid-lane and bottom drops immediately after a large scroll jump` | `D08-025` |
| `components/sidebar/workspace-kanban-virtual-lane-layout.test.ts:69 :: exposes every logical item even when no card is mounted` | `D08-025` |
| `components/sidebar/workspace-kanban-virtual-lane-layout.test.ts:85 :: selects intermediate never-mounted cards across a jumped lane range` | `D08-025` |
| `components/sidebar/workspace-kanban-worktree-groups.test.ts:105 :: does not crash when a worktree is missing its displayName outside Manual sort` | `D08-029` |
| `components/sidebar/workspace-kanban-worktree-groups.test.ts:130 :: keeps pinned then recent ordering outside Manual sort` | `D08-029` |
| `components/sidebar/workspace-kanban-worktree-groups.test.ts:157 :: does not admit another host row that shares the visible workspace id` | `D08-029` |
| `components/sidebar/workspace-kanban-worktree-groups.test.ts:42 :: groupWorkspaceKanbanWorktrees` | `INFRA: describe block grouping tests in workspace-kanban-worktree-groups.test.ts` |
| `components/sidebar/workspace-kanban-worktree-groups.test.ts:43 :: uses manualOrder inside lanes when Manual sort is active` | `D08-029` |
| `components/sidebar/workspace-kanban-worktree-groups.test.ts:77 :: does not crash when a worktree is missing its displayName under Manual sort` | `D08-029` |

---

## 4. Labels e Textos de Menu (`labels`)

| Label / Texto | Mapeamento / Justificativa |
|---|---|
| `components/sidebar/WorkspaceKanbanCard.tsx:60 :: aria-label={translate('auto.components.sidebar.WorkspaceKanbanCard.cefae8983e', 'Pinned')}` | `D08-027` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:172 :: { id: 'todo', label: 'Todo' },` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.search.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:173 :: { id: 'in-review', label: 'In review' }` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.search.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawer.search.test.tsx:321 :: targetStatus: { id: 'todo', label: 'Todo' }` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.search.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:195 :: { id: 'todo', label: 'Todo' },` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.task-status-sync.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:196 :: { id: 'in-review', label: 'In review' }` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.task-status-sync.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:326 :: targetStatus: { id: 'in-review', label: 'In review' },` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.task-status-sync.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:359 :: targetStatus: { id: 'in-review', label: 'In review' }` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.task-status-sync.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawer.task-status-sync.test.tsx:426 :: targetStatus: { id: 'in-review', label: 'In review' }` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawer.task-status-sync.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawerHeader.test.tsx:17 :: const statuses: WorkspaceStatusDefinition[] = [{ id: 'todo', label: 'Todo' }]` | `INFRA: test fixture / helper declaration in WorkspaceKanbanDrawerHeader.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawerHeader.tsx:117 :: aria-label={translate(` | `D08-008` |
| `components/sidebar/WorkspaceKanbanDrawerHeader.tsx:23 :: onRenameStatus: (statusId: string, label: string) => void` | `INFRA: TypeScript callback prop type in header` |
| `components/sidebar/WorkspaceKanbanDrawerHeader.tsx:99 :: tooltipSide="top"` | `D08-008` |
| `components/sidebar/WorkspaceKanbanLaneGrid.test.tsx:94 :: label: `State ${index + 1}`` | `INFRA: test fixture / helper declaration in WorkspaceKanbanLaneGrid.test.tsx` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:48 :: return container.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]')` | `INFRA: test fixture / helper declaration in WorkspaceKanbanSearchField.test.tsx` |
| `components/sidebar/WorkspaceKanbanSearchField.tsx:105 :: aria-label={translate(` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSearchField.tsx:109 :: placeholder={translate(` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSearchField.tsx:140 :: title={tooLargeMessage ?? undefined}` | `D08-012` |
| `components/sidebar/WorkspaceKanbanSearchField.tsx:154 :: aria-label={translate(` | `D08-010` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.test.tsx:17 :: vi.mock('@/components/ui/tooltip', () => ({` | `INFRA: test fixture / helper declaration in WorkspaceKanbanSettingsMenu.test.tsx` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.test.tsx:7 :: const statuses: WorkspaceStatusDefinition[] = [{ id: 'todo', label: 'Todo' }]` | `INFRA: test fixture / helper declaration in WorkspaceKanbanSettingsMenu.test.tsx` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.test.tsx:73 :: 'button[role="switch"][aria-label="Sync board and issue status"]'` | `INFRA: test fixture / helper declaration in WorkspaceKanbanSettingsMenu.test.tsx` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.test.tsx:91 :: label: `State ${index + 1}`` | `INFRA: test fixture / helper declaration in WorkspaceKanbanSettingsMenu.test.tsx` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.tsx:10 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `INFRA: UI import for tooltip in settings menu` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.tsx:133 :: aria-label={translate(` | `D08-015` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.tsx:151 :: aria-label={translate(` | `D08-016` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.tsx:166 :: aria-label={translate(` | `D08-016` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.tsx:181 :: aria-label={translate(` | `D08-016` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.tsx:22 :: onRenameStatus: (statusId: string, label: string) => void` | `INFRA: TypeScript callback prop type in settings menu` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.tsx:49 :: aria-label={translate(` | `D08-015` |
| `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:29 :: vi.mock('@/components/ui/tooltip', () => ({` | `INFRA: test fixture / helper declaration in WorkspaceKanbanStatusLane.test.tsx` |
| `components/sidebar/WorkspaceKanbanStatusLane.test.tsx:35 :: const status = { id: 'todo', label: 'Todo' }` | `INFRA: test fixture / helper declaration in WorkspaceKanbanStatusLane.test.tsx` |
| `components/sidebar/WorkspaceKanbanStatusLane.tsx:102 :: aria-label={createTooltip}` | `D08-021` |
| `components/sidebar/WorkspaceKanbanStatusLane.tsx:137 :: aria-label={translate(` | `D08-022` |
| `components/sidebar/WorkspaceKanbanStatusLane.tsx:15 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `INFRA: UI import for tooltip in status lane` |
| `components/sidebar/WorkspaceKanbanStatusLane.tsx:221 :: aria-label={createTooltip}` | `D08-021` |
| `components/sidebar/use-workspace-kanban-status-actions.ts:19 :: (statusId: string, label: string) => {` | `INFRA: callback parameter signature for handleRenameStatus` |
| `components/sidebar/use-workspace-kanban-status-actions.ts:26 :: status.id === statusId ? { ...status, label: trimmed } : status` | `D08-018` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:172 :: it('lets Escape close the board while non-interactive tooltip content is open', async () => {` | `INFRA: test fixture / helper declaration in useWorkspaceBoardPanel.test.tsx` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:174 :: const tooltip = document.createElement('div')` | `INFRA: test fixture / helper declaration in useWorkspaceBoardPanel.test.tsx` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:175 :: tooltip.setAttribute('data-slot', 'tooltip-content')` | `INFRA: test fixture / helper declaration in useWorkspaceBoardPanel.test.tsx` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:176 :: tooltip.setAttribute('data-state', 'open')` | `INFRA: test fixture / helper declaration in useWorkspaceBoardPanel.test.tsx` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:177 :: document.body.appendChild(tooltip)` | `INFRA: test fixture / helper declaration in useWorkspaceBoardPanel.test.tsx` |
| `components/sidebar/useWorkspaceBoardPanel.ts:146 :: // companion panel, but non-interactive tooltips should not trap it.` | `D08-003` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:324 :: targetStatus: targetStatus({ id: 'done', label: 'Done' }),` | `INFRA: test fixture / helper declaration in workspace-board-task-status-sync.test.ts` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:374 :: { id: 'todo', label: 'Todo' },` | `INFRA: test fixture / helper declaration in workspace-board-task-status-sync.test.ts` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:375 :: { id: 'in-review', label: 'In review' }` | `INFRA: test fixture / helper declaration in workspace-board-task-status-sync.test.ts` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:389 :: targetStatus: { id: 'in-review', label: 'In review' }` | `INFRA: test fixture / helper declaration in workspace-board-task-status-sync.test.ts` |
| `components/sidebar/workspace-board-task-status-sync.test.ts:51 :: return { id: 'in-review', label: 'In review', ...overrides }` | `INFRA: test fixture / helper declaration in workspace-board-task-status-sync.test.ts` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:17 :: { id: 'todo', label: 'Todo' },` | `INFRA: test fixture / helper declaration in workspace-kanban-sidebar-drop.test.ts` |
| `components/sidebar/workspace-kanban-sidebar-drop.test.ts:18 :: { id: 'doing', label: 'Doing' }` | `INFRA: test fixture / helper declaration in workspace-kanban-sidebar-drop.test.ts` |
| `components/sidebar/workspace-kanban-worktree-groups.test.ts:34 :: { id: 'todo', label: 'Todo' },` | `INFRA: test fixture / helper declaration in workspace-kanban-worktree-groups.test.ts` |
| `components/sidebar/workspace-kanban-worktree-groups.test.ts:35 :: { id: 'doing', label: 'Doing' }` | `INFRA: test fixture / helper declaration in workspace-kanban-worktree-groups.test.ts` |

---

## 5. Atalhos e Teclas de Navegação (`hotkeys`)

| Atalho / Tecla | Mapeamento / Justificativa |
|---|---|
| `components/sidebar/WorkspaceKanbanLaneGrid.tsx:53 :: onColumnResizeKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void` | `D08-022` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:150 :: new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })` | `INFRA: simulated keydown event in WorkspaceKanbanSearchField.test.tsx` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:159 :: new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })` | `INFRA: simulated keydown event in WorkspaceKanbanSearchField.test.tsx` |
| `components/sidebar/WorkspaceKanbanSearchField.test.tsx:185 :: new KeyboardEvent('keydown', {` | `INFRA: simulated keydown event in WorkspaceKanbanSearchField.test.tsx` |
| `components/sidebar/WorkspaceKanbanSearchField.tsx:122 :: if (event.key !== 'Escape' \|\| event.nativeEvent.isComposing) {` | `D08-011` |
| `components/sidebar/WorkspaceKanbanSettingsMenu.tsx:128 :: if (event.key === 'Enter') {` | `D08-015` |
| `components/sidebar/WorkspaceKanbanStatusLane.tsx:49 :: onColumnResizeKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void` | `D08-022` |
| `components/sidebar/use-workspace-kanban-column-resize.ts:12 :: onColumnResizeKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void` | `D08-022` |
| `components/sidebar/use-workspace-kanban-column-resize.ts:133 :: (event: React.KeyboardEvent<HTMLElement>) => {` | `D08-022` |
| `components/sidebar/use-workspace-kanban-column-resize.ts:134 :: if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {` | `D08-022` |
| `components/sidebar/use-workspace-kanban-column-resize.ts:139 :: const direction = event.key === 'ArrowRight' ? 1 : -1` | `D08-022` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:102 :: it('toggles the board from the shortcut bridge event', async () => {` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.test.tsx:57 :: from.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))` | `INFRA: simulated keydown event in useWorkspaceBoardPanel.test.tsx` |
| `components/sidebar/useWorkspaceBoardPanel.ts:135 :: const handleKeyDown = (event: KeyboardEvent): void => {` | `D08-003` |
| `components/sidebar/useWorkspaceBoardPanel.ts:136 :: if (event.key !== 'Escape') {` | `D08-003` |

---

## 6. Timers e Animações (`timers`)

| Timer / rAF | Mapeamento / Justificativa |
|---|---|
| `components/sidebar/WorkspaceKanbanDrawer.mount-gating.test.tsx:178 :: vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })` | `INFRA: fake timer / rAF spy setup in WorkspaceKanbanDrawer.mount-gating.test.tsx` |
| `components/sidebar/WorkspaceKanbanLaneGrid.test.tsx:150 :: vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {` | `INFRA: fake timer / rAF spy setup in WorkspaceKanbanLaneGrid.test.tsx` |
| `components/sidebar/WorkspaceKanbanLaneGrid.tsx:158 :: frameId = window.requestAnimationFrame(renderNextLane)` | `D08-020` |
| `components/sidebar/WorkspaceKanbanLaneGrid.tsx:162 :: frameId = window.requestAnimationFrame(renderNextLane)` | `D08-020` |
| `components/sidebar/WorkspaceKanbanSearchField.tsx:92 :: const timer = window.setTimeout(` | `D08-012` |
| `components/sidebar/use-workspace-kanban-area-selection.ts:147 :: state.frameId = window.requestAnimationFrame(flushAreaSelectionDrag)` | `D08-032` |
| `components/sidebar/use-workspace-kanban-area-selection.ts:179 :: state.scrollFrameId = window.requestAnimationFrame(runAreaSelectionAutoScroll)` | `D08-033` |
| `components/sidebar/use-workspace-kanban-area-selection.ts:187 :: state.scrollFrameId = window.requestAnimationFrame(runAreaSelectionAutoScroll)` | `D08-033` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.ts:202 :: state.frameId = window.requestAnimationFrame(flushPointerDragFrame)` | `D08-037` |
| `components/sidebar/use-workspace-kanban-column-resize.ts:59 :: frameRef.current = window.requestAnimationFrame(() => {` | `D08-022` |
| `components/sidebar/use-workspace-kanban-drawer-lingering.ts:12 :: const timer = window.setTimeout(() => setLingering(false), WORKSPACE_BOARD_CLOSE_LINGER_MS)` | `D08-005` |
| `components/sidebar/use-workspace-kanban-render-lifecycle.ts:18 :: const frameId = window.requestAnimationFrame(() => {` | `D08-006` |

---

## 7. Subscriptions e Event Listeners (`subscriptions`)

| Subscription / Listener | Mapeamento / Justificativa |
|---|---|
| `components/sidebar/WorkspaceKanbanDrawer.mount-gating.test.tsx:62 :: React.useEffect(() => {` | `INFRA: test observer / spy subscription in WorkspaceKanbanDrawer.mount-gating.test.tsx` |
| `components/sidebar/WorkspaceKanbanDrawer.mount-gating.test.tsx:64 :: const unsubscribe = useAppStore.subscribe(() => contentProbe.storeNotifications())` | `INFRA: test observer / spy subscription in WorkspaceKanbanDrawer.mount-gating.test.tsx` |
| `components/sidebar/WorkspaceKanbanLaneGrid.tsx:131 :: useEffect(() => {` | `D08-020` |
| `components/sidebar/WorkspaceKanbanSearchField.tsx:83 :: useEffect(() => {` | `D08-012` |
| `components/sidebar/use-workspace-kanban-area-selection.ts:268 :: useEffect(() => {` | `D08-032` |
| `components/sidebar/use-workspace-kanban-area-selection.ts:311 :: document.addEventListener('pointermove', handlePointerMove, true)` | `D08-032` |
| `components/sidebar/use-workspace-kanban-area-selection.ts:312 :: document.addEventListener('pointerup', handlePointerUp, true)` | `D08-035` |
| `components/sidebar/use-workspace-kanban-area-selection.ts:313 :: document.addEventListener('pointercancel', handlePointerUp, true)` | `D08-035` |
| `components/sidebar/use-workspace-kanban-area-selection.ts:314 :: document.addEventListener('scroll', handleScroll, true)` | `D08-034` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.ts:207 :: useEffect(() => {` | `D08-036` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.ts:255 :: document.addEventListener('pointermove', handlePointerMove, true)` | `D08-036` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.ts:256 :: document.addEventListener('pointerup', handlePointerUp, true)` | `D08-036` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.ts:257 :: document.addEventListener('pointercancel', handlePointerUp, true)` | `D08-036` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.ts:258 :: document.addEventListener('click', handleClick, true)` | `D08-036` |
| `components/sidebar/use-workspace-kanban-card-pointer-drag.ts:259 :: window.addEventListener('blur', handleBlur)` | `D08-036` |
| `components/sidebar/use-workspace-kanban-column-resize.ts:100 :: window.addEventListener('pointerup', stopResize)` | `D08-022` |
| `components/sidebar/use-workspace-kanban-column-resize.ts:101 :: window.addEventListener('pointercancel', stopResize)` | `D08-022` |
| `components/sidebar/use-workspace-kanban-column-resize.ts:102 :: window.addEventListener('blur', stopResize)` | `D08-022` |
| `components/sidebar/use-workspace-kanban-column-resize.ts:98 :: useEffect(() => {` | `D08-022` |
| `components/sidebar/use-workspace-kanban-column-resize.ts:99 :: window.addEventListener('pointermove', handlePointerMove)` | `D08-022` |
| `components/sidebar/use-workspace-kanban-drawer-lingering.ts:7 :: useEffect(() => {` | `D08-005` |
| `components/sidebar/use-workspace-kanban-outside-dismiss.ts:38 :: useEffect(() => {` | `D08-004` |
| `components/sidebar/use-workspace-kanban-outside-dismiss.ts:60 :: document.addEventListener('pointerdown', handlePointerDown, true)` | `D08-004` |
| `components/sidebar/use-workspace-kanban-render-lifecycle.ts:12 :: useEffect(() => {` | `D08-006` |
| `components/sidebar/use-workspace-kanban-render-lifecycle.ts:30 :: useEffect(() => {` | `D08-006` |
| `components/sidebar/use-workspace-kanban-render-lifecycle.ts:45 :: document.addEventListener('pointerdown', clearSelectionOutsideBoard, true)` | `D08-006` |
| `components/sidebar/use-workspace-kanban-shift-wheel-scroll.ts:102 :: document.addEventListener('wheel', handleWheel, { capture: true, passive: false })` | `D08-023` |
| `components/sidebar/use-workspace-kanban-shift-wheel-scroll.ts:46 :: useEffect(() => {` | `D08-023` |
| `components/sidebar/use-workspace-kanban-shift-wheel-scroll.ts:95 :: document.addEventListener('dragstart', handleDragStart, true)` | `D08-023` |
| `components/sidebar/use-workspace-kanban-shift-wheel-scroll.ts:96 :: document.addEventListener('dragover', handleDragOver, true)` | `D08-023` |
| `components/sidebar/use-workspace-kanban-shift-wheel-scroll.ts:97 :: document.addEventListener('drop', stopTrackingDrag, true)` | `D08-023` |
| `components/sidebar/use-workspace-kanban-shift-wheel-scroll.ts:98 :: document.addEventListener('dragend', stopTrackingDrag, true)` | `D08-023` |
| `components/sidebar/use-workspace-kanban-shift-wheel-scroll.ts:99 :: window.addEventListener('blur', stopTrackingDrag)` | `D08-023` |
| `components/sidebar/useWorkspaceBoardPanel.ts:130 :: useEffect(() => {` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.ts:156 :: document.addEventListener('keydown', handleKeyDown, true)` | `D08-003` |
| `components/sidebar/useWorkspaceBoardPanel.ts:160 :: useEffect(() => {` | `D08-001` |
| `components/sidebar/useWorkspaceBoardPanel.ts:161 :: window.addEventListener(TOGGLE_WORKSPACE_BOARD_EVENT, toggleWorkspaceBoard)` | `D08-001` |
