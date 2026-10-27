# Parede de Evidência — Cobertura D03b-sidebar-list-orchestration

## Contagens de Cobertura
- **arquivos**: 31/31 (100%)
- **símbolos**: 112/112 (100%)
- **testes**: 319/319 (100%)
- **labels**: 61/61 (100%)
- **hotkeys**: 13/13 (100%)
- **prefs**: 0/0 (100%)
- **timers**: 9/9 (100%)
- **subs**: 29/29 (100%)
- **preload**: 4/4 (100%)

---

## Justificativas de Infraestrutura / N/A / DUP
- **Symbol** `components/sidebar/worktree-list-card-markup-queries.ts:getDataNumber`: INFRA: test markup parser helper (worktree-list-card-markup-queries.ts:36)
- **Symbol** `components/sidebar/worktree-list-lineage-card-test-harness.ts:mockStore`: INFRA: test store fixture container (worktree-list-lineage-card-test-harness.ts:8)
- **Symbol** `components/sidebar/worktree-list-lineage-card-test-harness.ts:WorktreeListComponent`: INFRA: type definition for test component (worktree-list-lineage-card-test-harness.ts:10)
- **Symbol** `components/sidebar/worktree-list-lineage-card-test-harness.ts:loadWorktreeList`: INFRA: dynamic test module loader (worktree-list-lineage-card-test-harness.ts:17)
- **Symbol** `components/sidebar/worktree-list-lineage-card-test-harness.ts:createAppStoreModuleMock`: INFRA: test mock generator (worktree-list-lineage-card-test-harness.ts:35)
- **Symbol** `components/sidebar/worktree-list-lineage-card-test-harness.ts:createReactVirtualModuleMock`: INFRA: test virtualizer mock generator (worktree-list-lineage-card-test-harness.ts:50)
- **Symbol** `components/sidebar/worktree-list-lineage-card-test-harness.ts:createVirtualizedScrollAnchorModuleMock`: INFRA: test scroll anchor mock (worktree-list-lineage-card-test-harness.ts:70)
- **Symbol** `components/sidebar/worktree-list-lineage-card-test-harness.ts:createProjectHeaderDragModuleMock`: INFRA: test header drag mock (worktree-list-lineage-card-test-harness.ts:77)
- **Symbol** `components/sidebar/worktree-list-lineage-card-test-harness.ts:createWorktreeTitleInlineRenameModuleMock`: INFRA: test rename module mock (worktree-list-lineage-card-test-harness.ts:193)
- **Symbol** `components/sidebar/worktree-list-lineage-card-test-harness.ts:createWorktreeContextMenuModuleMock`: INFRA: test context menu mock (worktree-list-lineage-card-test-harness.ts:213)
- **Symbol** `components/sidebar/worktree-list-lineage-card-test-harness.ts:createTooltipModuleMock`: INFRA: test tooltip mock (worktree-list-lineage-card-test-harness.ts:222)
- **Symbol** `components/sidebar/worktree-list-lineage-card-test-harness.ts:createDropdownMenuModuleMock`: INFRA: test dropdown menu mock (worktree-list-lineage-card-test-harness.ts:233)
- **Label** `components/sidebar/worktree-list-lineage-card-test-harness.ts:239 DropdownMenuItem: ({ children }: { children: React.ReactNode }) =>`: INFRA: test dropdown mock item (worktree-list-lineage-card-test-harness.ts:239)

---

## 1. Arquivos Produtivos (`files`)
| Arquivo | IDs Mapeados |
|---|---|
| `PendingWorktreeRow.tsx` | D03b-021, D03b-022 |
| `WorktreeList.tsx` | D03b-010, D03b-011, D03b-012, D03b-013, D03b-014, D03b-015, D03b-016, D03b-017, D03b-018, D03b-019, D03b-020 |
| `WorktreeListScrollToTopButton.tsx` | D03b-023 |
| `WorktreeSidebarDropIndicator.tsx` | D03b-024 |
| `header-drag-click-swallow.ts` | D03b-026, D03b-031, D03b-035 |
| `header-drag-pointer-release.ts` | D03b-026, D03b-031, D03b-034 |
| `host-header-drag-dom.ts` | D03b-034 |
| `host-header-drag.ts` | D03b-034, D03b-035, D03b-036, D03b-037 |
| `index.tsx` | D03b-001, D03b-002, D03b-003, D03b-004, D03b-005, D03b-006, D03b-007, D03b-008 |
| `project-group-header-drag-commit.ts` | D03b-033 |
| `project-group-header-drag-contract.ts` | D03b-030 |
| `project-group-header-drag-start.ts` | D03b-030 |
| `project-group-header-drag.ts` | D03b-030, D03b-031 |
| `project-group-header-drop.ts` | D03b-032, D03b-033 |
| `project-header-drag-commit.ts` | D03b-028, D03b-029 |
| `project-header-drag-contract.ts` | D03b-025 |
| `project-header-drag-start.ts` | D03b-025 |
| `project-header-drag.ts` | D03b-025, D03b-026 |
| `project-header-drop.ts` | D03b-027, D03b-028, D03b-029 |
| `rendered-sidebar-worktree-order.ts` | D03b-038, D03b-039 |
| `sidebar-project-drop.ts` | D03b-008, D03b-009 |
| `useSidebarProjectDrop.ts` | D03b-008, D03b-009 |
| `worktree-header-section-boundaries.ts` | D03b-040, D03b-041 |
| `worktree-list-card-markup-queries.ts` | D03b-047, D03b-048 |
| `worktree-list-groups-test-fixtures.ts` | D03b-049 |
| `worktree-list-lineage-card-test-fixtures.ts` | D03b-048 |
| `worktree-list-lineage-card-test-harness.ts` | D03b-048 |
| `worktree-list-lineage-store-state.ts` | D03b-047, D03b-048, D03b-050 |
| `worktree-list-pinned-store-state.ts` | D03b-049 |
| `worktree-sidebar-drop-preview.ts` | D03b-042, D03b-043, D03b-044, D03b-045 |
| `worktree-snapshot-prune-batch.ts` | D03b-046 |

---

## 2. Símbolos Exportados (`symbols`)
| Arquivo : Símbolo | ID / Justificativa |
|---|---|
| `components/sidebar/PendingWorktreeRow.tsx:PendingWorktreeRow` | `D03b-021` |
| `components/sidebar/WorktreeListScrollToTopButton.tsx:WorktreeListScrollToTopButton` | `D03b-023` |
| `components/sidebar/WorktreeSidebarDropIndicator.tsx:WorktreeSidebarDropIndicator` | `D03b-024` |
| `components/sidebar/header-drag-click-swallow.ts:swallowNextClickOnDragHandle` | `D03b-026` |
| `components/sidebar/header-drag-pointer-release.ts:hasPointerBeenReleased` | `D03b-026` |
| `components/sidebar/host-header-drag-dom.ts:HostHeaderRect` | `D03b-034` |
| `components/sidebar/host-header-drag-dom.ts:isHostHeaderActionTarget` | `D03b-034` |
| `components/sidebar/host-header-drag-dom.ts:readHostHeaderRects` | `D03b-034` |
| `components/sidebar/host-header-drag.ts:HostDragState` | `D03b-034` |
| `components/sidebar/host-header-drag.ts:HostHeaderDragController` | `D03b-034` |
| `components/sidebar/host-header-drag.ts:UseHostHeaderDragArgs` | `D03b-034` |
| `components/sidebar/host-header-drag.ts:useHostHeaderDrag` | `D03b-034` |
| `components/sidebar/index.tsx:WORKTREE_SIDEBAR_RESIZE_HANDLE_CLASS_NAME` | `D03b-001` |
| `components/sidebar/index.tsx:WORKTREE_SIDEBAR_RESIZE_HANDLE_LINE_CLASS_NAME` | `D03b-001` |
| `components/sidebar/project-group-header-drag-commit.ts:commitProjectGroupHeaderDragDrop` | `D03b-033` |
| `components/sidebar/project-group-header-drag-contract.ts:INITIAL_PROJECT_GROUP_DRAG_STATE` | `D03b-030` |
| `components/sidebar/project-group-header-drag-contract.ts:PROJECT_GROUP_HEADER_DRAG_THRESHOLD_PX` | `D03b-030` |
| `components/sidebar/project-group-header-drag-contract.ts:ProjectGroupDragState` | `D03b-030` |
| `components/sidebar/project-group-header-drag-contract.ts:ProjectGroupHeaderDragController` | `D03b-030` |
| `components/sidebar/project-group-header-drag-contract.ts:ProjectGroupHeaderDragSession` | `D03b-030` |
| `components/sidebar/project-group-header-drag-contract.ts:UseProjectGroupHeaderDragArgs` | `D03b-030` |
| `components/sidebar/project-group-header-drag-contract.ts:isProjectGroupHeaderActionTarget` | `D03b-030` |
| `components/sidebar/project-group-header-drag-contract.ts:isProjectGroupHeaderDragHandleTarget` | `D03b-030` |
| `components/sidebar/project-group-header-drag-start.ts:createProjectGroupHeaderDragSession` | `D03b-030` |
| `components/sidebar/project-group-header-drag.ts:useProjectGroupHeaderDrag` | `D03b-030` |
| `components/sidebar/project-group-header-drop.ts:ProjectGroupHeaderDragBucketKey` | `D03b-032` |
| `components/sidebar/project-group-header-drop.ts:ProjectGroupHeaderDragRect` | `D03b-032` |
| `components/sidebar/project-group-header-drop.ts:ProjectGroupHeaderDropPreview` | `D03b-032` |
| `components/sidebar/project-group-header-drop.ts:ProjectGroupTabOrderUpdate` | `D03b-033` |
| `components/sidebar/project-group-header-drop.ts:computeProjectGroupHeaderDropPreview` | `D03b-032` |
| `components/sidebar/project-group-header-drop.ts:getProjectGroupHeaderDragBucketKey` | `D03b-030` |
| `components/sidebar/project-group-header-drop.ts:getProjectGroupTabOrderUpdatesForSidebarDrop` | `D03b-033` |
| `components/sidebar/project-group-header-drop.ts:getSidebarOrderedProjectGroupHeaderIdsByBucket` | `D03b-032` |
| `components/sidebar/project-group-header-drop.ts:mapSidebarProjectGroupDropIndexToSiblingInsertIndex` | `D03b-033` |
| `components/sidebar/project-group-header-drop.ts:measureProjectGroupHeaderDragRects` | `D03b-032` |
| `components/sidebar/project-header-drag-commit.ts:commitProjectHeaderDragDrop` | `D03b-028` |
| `components/sidebar/project-header-drag-contract.ts:INITIAL_REPO_DRAG_STATE` | `D03b-025` |
| `components/sidebar/project-header-drag-contract.ts:PROJECT_HEADER_DRAG_THRESHOLD_PX` | `D03b-025` |
| `components/sidebar/project-header-drag-contract.ts:ProjectHeaderDragSession` | `D03b-025` |
| `components/sidebar/project-header-drag-contract.ts:REPO_HEADER_ACTION_SELECTOR` | `D03b-025` |
| `components/sidebar/project-header-drag-contract.ts:RepoDragState` | `D03b-025` |
| `components/sidebar/project-header-drag-contract.ts:RepoHeaderDragController` | `D03b-025` |
| `components/sidebar/project-header-drag-contract.ts:UseRepoHeaderDragArgs` | `D03b-025` |
| `components/sidebar/project-header-drag-contract.ts:isProjectHeaderDragHandleTarget` | `D03b-025` |
| `components/sidebar/project-header-drag-contract.ts:isRepoHeaderActionTarget` | `D03b-025` |
| `components/sidebar/project-header-drag-start.ts:createProjectHeaderDragSession` | `D03b-025` |
| `components/sidebar/project-header-drag.ts:useRepoHeaderDrag` | `D03b-025` |
| `components/sidebar/project-header-drop.ts:ProjectHeaderDragBucketKey` | `D03b-027` |
| `components/sidebar/project-header-drop.ts:ProjectHeaderDragRect` | `D03b-027` |
| `components/sidebar/project-header-drop.ts:ProjectHeaderDropPreview` | `D03b-027` |
| `components/sidebar/project-header-drop.ts:applyAllRepoInsertAt` | `D03b-029` |
| `components/sidebar/project-header-drop.ts:computeProjectHeaderDropPreview` | `D03b-027` |
| `components/sidebar/project-header-drop.ts:getLogicalRepoOrderRankById` | `D03b-029` |
| `components/sidebar/project-header-drop.ts:getProjectGroupOrderForSidebarDrop` | `D03b-028` |
| `components/sidebar/project-header-drop.ts:getProjectHeaderDragBucketKey` | `D03b-025` |
| `components/sidebar/project-header-drop.ts:getSidebarOrderedRepoHeaderIdsByBucket` | `D03b-027` |
| `components/sidebar/project-header-drop.ts:mapSidebarProjectHeaderDropIndexToSiblingInsertIndex` | `D03b-028` |
| `components/sidebar/project-header-drop.ts:mapSidebarRepoDropIndexToAllRepoInsertAt` | `D03b-029` |
| `components/sidebar/project-header-drop.ts:measureProjectHeaderDragRects` | `D03b-027` |
| `components/sidebar/rendered-sidebar-worktree-order.ts:computeRenderedSidebarWorktreeOrder` | `D03b-039` |
| `components/sidebar/rendered-sidebar-worktree-order.ts:computeRenderedSidebarWorktrees` | `D03b-038` |
| `components/sidebar/sidebar-project-drop.ts:SidebarProjectDropAffordance` | `D03b-008` |
| `components/sidebar/sidebar-project-drop.ts:SidebarProjectDropPathResolution` | `D03b-009` |
| `components/sidebar/sidebar-project-drop.ts:getSidebarProjectDropAffordance` | `D03b-008` |
| `components/sidebar/sidebar-project-drop.ts:isRemoteRuntimeActive` | `D03b-008` |
| `components/sidebar/sidebar-project-drop.ts:resolveSidebarProjectDropPath` | `D03b-009` |
| `components/sidebar/useSidebarProjectDrop.ts:useSidebarProjectDrop` | `D03b-008` |
| `components/sidebar/worktree-header-section-boundaries.ts:getProjectGroupHeaderSectionEndByGroupId` | `D03b-041` |
| `components/sidebar/worktree-header-section-boundaries.ts:getRepoHeaderSectionEndByRepoId` | `D03b-040` |
| `components/sidebar/worktree-list-card-markup-queries.ts:getCardOpeningTag` | `D03b-048` |
| `components/sidebar/worktree-list-card-markup-queries.ts:getDataNumber` | `INFRA: test markup parser helper (worktree-list-card-markup-queries.ts:36)` |
| `components/sidebar/worktree-list-card-markup-queries.ts:getFlushCardContentStart` | `D03b-048` |
| `components/sidebar/worktree-list-card-markup-queries.ts:getFolderWorkspaceSurfaceOpeningTag` | `D03b-047` |
| `components/sidebar/worktree-list-card-markup-queries.ts:getOptionOpeningTag` | `D03b-048` |
| `components/sidebar/worktree-list-card-markup-queries.ts:getPaddingLeft` | `D03b-048` |
| `components/sidebar/worktree-list-groups-host-collision.test.ts:SSH_REPO_FIXTURE` | `D03b-049` |
| `components/sidebar/worktree-list-groups-test-fixtures.ts:LOCAL_HOST_LABEL` | `D03b-049` |
| `components/sidebar/worktree-list-groups-test-fixtures.ts:makeDetectedWorktree` | `D03b-013` |
| `components/sidebar/worktree-list-groups-test-fixtures.ts:project` | `D03b-049` |
| `components/sidebar/worktree-list-groups-test-fixtures.ts:projectHostSetups` | `D03b-049` |
| `components/sidebar/worktree-list-groups-test-fixtures.ts:remoteRepo` | `D03b-049` |
| `components/sidebar/worktree-list-groups-test-fixtures.ts:remoteWorktree` | `D03b-049` |
| `components/sidebar/worktree-list-groups-test-fixtures.ts:repo` | `D03b-049` |
| `components/sidebar/worktree-list-groups-test-fixtures.ts:repoMap` | `D03b-049` |
| `components/sidebar/worktree-list-groups-test-fixtures.ts:worktree` | `D03b-049` |
| `components/sidebar/worktree-list-lineage-card-test-fixtures.ts:makeFolderWorkspacePathStatusMockState` | `D03b-047` |
| `components/sidebar/worktree-list-lineage-card-test-fixtures.ts:makeFolderWorkspacePathStatusState` | `D03b-047` |
| `components/sidebar/worktree-list-lineage-card-test-fixtures.ts:makeRepo` | `D03b-048` |
| `components/sidebar/worktree-list-lineage-card-test-fixtures.ts:makeWorktree` | `D03b-048` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:WorktreeListComponent` | `INFRA: type definition for test component (worktree-list-lineage-card-test-harness.ts:10)` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:createAppStoreModuleMock` | `INFRA: test mock generator (worktree-list-lineage-card-test-harness.ts:35)` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:createDropdownMenuModuleMock` | `INFRA: test dropdown menu mock (worktree-list-lineage-card-test-harness.ts:233)` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:createProjectHeaderDragModuleMock` | `INFRA: test header drag mock (worktree-list-lineage-card-test-harness.ts:77)` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:createReactVirtualModuleMock` | `INFRA: test virtualizer mock generator (worktree-list-lineage-card-test-harness.ts:50)` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:createTooltipModuleMock` | `INFRA: test tooltip mock (worktree-list-lineage-card-test-harness.ts:222)` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:createVirtualizedScrollAnchorModuleMock` | `INFRA: test scroll anchor mock (worktree-list-lineage-card-test-harness.ts:70)` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:createWorktreeCardAgentsModuleMock` | `D03b-012` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:createWorktreeCardModuleMock` | `D03b-048` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:createWorktreeContextMenuModuleMock` | `INFRA: test context menu mock (worktree-list-lineage-card-test-harness.ts:213)` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:createWorktreeTitleInlineRenameModuleMock` | `INFRA: test rename module mock (worktree-list-lineage-card-test-harness.ts:193)` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:loadWorktreeList` | `INFRA: dynamic test module loader (worktree-list-lineage-card-test-harness.ts:17)` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:mockStore` | `INFRA: test store fixture container (worktree-list-lineage-card-test-harness.ts:8)` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:renderWorktreeListMarkup` | `D03b-048` |
| `components/sidebar/worktree-list-lineage-store-state.ts:setLineageFixtureState` | `D03b-048` |
| `components/sidebar/worktree-list-pinned-store-state.ts:setPinnedFixtureState` | `D03b-049` |
| `components/sidebar/worktree-sidebar-drop-preview.ts:WorktreeSidebarDropPreview` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.ts:WorktreeSidebarStatusDropTarget` | `D03b-045` |
| `components/sidebar/worktree-sidebar-drop-preview.ts:WorktreeSidebarTrackedStatusDropTarget` | `D03b-045` |
| `components/sidebar/worktree-sidebar-drop-preview.ts:computeWorktreeSidebarDropPreview` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.ts:resolveWorktreeSidebarStatusDropCommitTarget` | `D03b-045` |
| `components/sidebar/worktree-snapshot-prune-batch.ts:WorktreeSnapshotPruneBatch` | `D03b-046` |
| `components/sidebar/worktree-snapshot-prune-batch.ts:beginWorktreeSnapshotPruneBatch` | `D03b-046` |

---

## 3. Preload & IPC (`preload`)
| Preload Call | ID Mapeado |
|---|---|
| `components/sidebar/useSidebarProjectDrop.ts:119 return window.api.ui.onFileDrop((data) => {` | `D03b-009` |
| `components/sidebar/useSidebarProjectDrop.ts:82 await window.api.fs.authorizeExternalPath({ targetPath: pathResolution.path })` | `D03b-009` |
| `components/sidebar/useSidebarProjectDrop.ts:83 const stat = await window.api.fs.stat({ filePath: pathResolution.path })` | `D03b-009` |
| `components/sidebar/worktree-snapshot-prune-batch.ts:10 const api = window.api.workspaceCleanup` | `D03b-046` |

---

## 4. Timers (`timers`)
| Timer / Frame | ID Mapeado |
|---|---|
| `components/sidebar/header-drag-click-swallow.ts:19 return setTimeout(() => window.removeEventListener('click', swallow, true), 0)` | `D03b-026` |
| `components/sidebar/header-drag-click-swallow.ts:9 export function swallowNextClickOnDragHandle(handleEl: HTMLElement): ReturnType<typeof setTimeout> {` | `D03b-026` |
| `components/sidebar/host-header-drag.ts:136 deferredComputeFrameRef.current = window.requestAnimationFrame(() => {` | `D03b-036` |
| `components/sidebar/project-group-header-drag.ts:169 autoscrollFrameIdRef.current = window.requestAnimationFrame(runAutoscrollFrame)` | `D03b-031` |
| `components/sidebar/project-group-header-drag.ts:179 autoscrollFrameIdRef.current = window.requestAnimationFrame(runAutoscrollFrame)` | `D03b-031` |
| `components/sidebar/project-group-header-drag.ts:46 const clickSwallowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)` | `D03b-031` |
| `components/sidebar/project-header-drag.ts:182 autoscrollFrameIdRef.current = window.requestAnimationFrame(runAutoscrollFrame)` | `D03b-026` |
| `components/sidebar/project-header-drag.ts:192 autoscrollFrameIdRef.current = window.requestAnimationFrame(runAutoscrollFrame)` | `D03b-026` |
| `components/sidebar/project-header-drag.ts:57 const clickSwallowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)` | `D03b-026` |

---

## 5. Subscrições & Event Listeners (`subscriptions`)
| Subscrição | ID Mapeado |
|---|---|
| `components/sidebar/header-drag-click-swallow.ts:18 window.addEventListener('click', swallow, true)` | `D03b-026` |
| `components/sidebar/host-header-drag.ts:192 useEffect(() => {` | `D03b-035` |
| `components/sidebar/host-header-drag.ts:259 window.addEventListener('pointermove', onPointerMove)` | `D03b-035` |
| `components/sidebar/host-header-drag.ts:260 window.addEventListener('pointerup', onPointerUp)` | `D03b-035` |
| `components/sidebar/host-header-drag.ts:261 window.addEventListener('pointercancel', onPointerCancel)` | `D03b-035` |
| `components/sidebar/host-header-drag.ts:262 window.addEventListener('keydown', onKeyDown)` | `D03b-035` |
| `components/sidebar/host-header-drag.ts:263 window.addEventListener('blur', onBlur)` | `D03b-035` |
| `components/sidebar/host-header-drag.ts:301 useEffect(() => {` | `D03b-035` |
| `components/sidebar/index.tsx:118 useEffect(() => {` | `D03b-005` |
| `components/sidebar/index.tsx:127 useEffect(() => {` | `D03b-007` |
| `components/sidebar/index.tsx:133 useEffect(() => {` | `D03b-007` |
| `components/sidebar/project-group-header-drag.ts:182 useEffect(() => {` | `D03b-031` |
| `components/sidebar/project-group-header-drag.ts:243 window.addEventListener('pointermove', onPointerMove)` | `D03b-031` |
| `components/sidebar/project-group-header-drag.ts:244 window.addEventListener('pointerup', onPointerUp)` | `D03b-031` |
| `components/sidebar/project-group-header-drag.ts:245 window.addEventListener('pointercancel', onPointerCancel)` | `D03b-031` |
| `components/sidebar/project-group-header-drag.ts:246 window.addEventListener('keydown', onKeyDown)` | `D03b-031` |
| `components/sidebar/project-group-header-drag.ts:247 window.addEventListener('blur', onBlur)` | `D03b-031` |
| `components/sidebar/project-group-header-drag.ts:270 useEffect(() => {` | `D03b-031` |
| `components/sidebar/project-header-drag.ts:195 useEffect(() => {` | `D03b-026` |
| `components/sidebar/project-header-drag.ts:257 window.addEventListener('pointermove', onPointerMove)` | `D03b-026` |
| `components/sidebar/project-header-drag.ts:258 window.addEventListener('pointerup', onPointerUp)` | `D03b-026` |
| `components/sidebar/project-header-drag.ts:259 window.addEventListener('pointercancel', onPointerCancel)` | `D03b-026` |
| `components/sidebar/project-header-drag.ts:260 window.addEventListener('keydown', onKeyDown)` | `D03b-026` |
| `components/sidebar/project-header-drag.ts:261 window.addEventListener('blur', onBlur)` | `D03b-026` |
| `components/sidebar/project-header-drag.ts:284 useEffect(() => {` | `D03b-026` |
| `components/sidebar/useSidebarProjectDrop.ts:118 useEffect(() => {` | `D03b-009` |
| `components/sidebar/useSidebarProjectDrop.ts:40 useEffect(() => {` | `D03b-008` |
| `components/sidebar/useSidebarProjectDrop.ts:41 document.addEventListener('drop', clearDragState, true)` | `D03b-008` |
| `components/sidebar/useSidebarProjectDrop.ts:42 document.addEventListener('dragend', clearDragState, true)` | `D03b-008` |

---

## 6. Atalhos & Teclado (`hotkeys`)
| Atalho / Key Handler | ID Mapeado |
|---|---|
| `components/sidebar/host-header-drag.ts:252 const onKeyDown = (e: KeyboardEvent): void => {` | `D03b-035` |
| `components/sidebar/project-group-header-drag.ts:236 const onKeyDown = (event: KeyboardEvent): void => {` | `D03b-031` |
| `components/sidebar/project-group-header-drag.ts:237 if (event.key === 'Escape') {` | `D03b-031` |
| `components/sidebar/project-header-drag.ts:250 const onKeyDown = (e: KeyboardEvent): void => {` | `D03b-026` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:112 setVisibleWorktreeShortcutTargets(null)` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:118 setVisibleWorktreeShortcutTargets(null)` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:273 it('keeps same-id hosts as separate closed-sidebar shortcut positions', () => {` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:280 expect(getVisibleWorktreeShortcutTargets()).toEqual([` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:286 it('does not reconstruct a filtered same-id host in closed-sidebar shortcuts', () => {` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:296 expect(getVisibleWorktreeShortcutTargets()).toEqual([` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:5 getVisibleWorktreeShortcutTargets,` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:7 setVisibleWorktreeShortcutTargets` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.ts:34 * hoisting and collapse elision, so the shortcut numbered the wrong card.` | `D03b-038` |

---

## 7. Rótulos & Menus (`labels`)
| Rótulo / Text Match | ID Mapeado |
|---|---|
| `components/sidebar/PendingWorktreeRow.tsx:79 title={translate('auto.components.sidebar.PendingWorktreeRow.188f6922a0', 'Cancel')}` | `D03b-022` |
| `components/sidebar/PendingWorktreeRow.tsx:80 aria-label={translate(` | `D03b-022` |
| `components/sidebar/WorktreeList.card-memo-stability.test.tsx:84 vi.mock('@/components/ui/tooltip', () => ({` | `D03b-010` |
| `components/sidebar/WorktreeList.card-memo-stability.test.tsx:93 DropdownMenuItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (` | `D03b-010` |
| `components/sidebar/WorktreeList.empty-project-rows.test.ts:32 vi.mock('@/components/ui/tooltip', () => createTooltipModuleMock())` | `D03b-019` |
| `components/sidebar/WorktreeList.folder-workspace-rows.test.ts:40 vi.mock('@/components/ui/tooltip', () => createTooltipModuleMock())` | `D03b-047` |
| `components/sidebar/WorktreeList.group-headers.test.ts:37 vi.mock('@/components/ui/tooltip', () => createTooltipModuleMock())` | `D03b-050` |
| `components/sidebar/WorktreeList.lineage-agent-expansion-coupling.test.tsx:109 vi.mock('@/components/ui/tooltip', () => ({` | `D03b-012` |
| `components/sidebar/WorktreeList.lineage-agent-expansion-coupling.test.tsx:118 DropdownMenuItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (` | `D03b-012` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:110 expect(childMarkup).toContain('aria-label="Mark as read"')` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:111 expect(childMarkup).not.toContain('aria-label="Mark as unread"')` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:36 vi.mock('@/components/ui/tooltip', () => createTooltipModuleMock())` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-real-card.test.tsx:103 vi.mock('@/components/ui/tooltip', () => ({` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-real-card.test.tsx:112 DropdownMenuItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (` | `D03b-048` |
| `components/sidebar/WorktreeList.status-lane-lineage-drop.test.tsx:104 vi.mock('@/components/ui/tooltip', () => ({` | `D03b-015` |
| `components/sidebar/WorktreeList.status-lane-lineage-drop.test.tsx:113 DropdownMenuItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (` | `D03b-015` |
| `components/sidebar/WorktreeListScrollToTopButton.tsx:33 aria-label={label}` | `D03b-023` |
| `components/sidebar/WorktreeListScrollToTopButton.tsx:4 import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D03b-023` |
| `components/sidebar/index.tsx:3 import { TooltipProvider } from '@/components/ui/tooltip'` | `D03b-001` |
| `components/sidebar/project-group-header-drop.test.ts:69 label: 'A',` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:74 { type: 'header', key: 'repo:repo-a', label: 'repo', count: 0, tone: '', repo },` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:78 label: 'A child',` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:86 label: 'B',` | `D03b-032` |
| `components/sidebar/project-header-drop.test.ts:33 label: 'A',` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:41 label: 'B',` | `D03b-027` |
| `components/sidebar/sidebar-project-drop.ts:11 | { visible: true; tone: 'ready' | 'blocked' | 'busy'; label: string; description: string }` | `D03b-008` |
| `components/sidebar/sidebar-project-drop.ts:44 label: translate(` | `D03b-008` |
| `components/sidebar/sidebar-project-drop.ts:58 label: translate(` | `D03b-008` |
| `components/sidebar/sidebar-project-drop.ts:71 label: translate(` | `D03b-008` |
| `components/sidebar/worktree-header-section-boundaries.test.ts:10 ({ type: 'header', key: `repo:${id}`, label: id, count: 1, tone: '', repo: { id } }) as RenderRow` | `D03b-040` |
| `components/sidebar/worktree-header-section-boundaries.test.ts:15 label: id,` | `D03b-040` |
| `components/sidebar/worktree-list-groups-host-labels.test.ts:152 { type: 'header', key: 'project:github:stablyai/orca', label: 'Orca', count: 2 },` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-labels.test.ts:298 { type: 'header', key: 'project:github:stablyai/orca', label: 'Orca', count: 2 },` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-labels.test.ts:93 label: 'Orca',` | `D03b-049` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:116 { type: 'header', key: 'repo:repo-1', label: 'orca' },` | `D03b-013` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:129 ): { repoId: string; label: string | undefined; hostId: string | undefined; count: number }[] {` | `D03b-049` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:132 label: row.hostContextLabel,` | `D03b-049` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:160 { repoId: sshTwin.id, label: 'openclaw', hostId: SSH_HOST_ID, count: 61 },` | `D03b-049` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:161 { repoId: envTwin.id, label: 'openclaw', hostId: ENV_HOST_ID, count: 134 }` | `D03b-049` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:169 { repoId: envTwin.id, label: 'openclaw', hostId: ENV_HOST_ID, count: 134 }` | `D03b-049` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:177 { repoId: sshTwin.id, label: 'openclaw', hostId: SSH_HOST_ID, count: 61 }` | `D03b-049` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:180 { repoId: envTwin.id, label: 'openclaw', hostId: ENV_HOST_ID, count: 134 }` | `D03b-049` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:26 /** Both twins display the same label: the reporting account's shape. */` | `D03b-049` |
| `components/sidebar/worktree-list-groups-pending-creations.test.ts:89 { type: 'header', key: `repo:${repo.id}`, label: 'Unknown' },` | `D03b-021` |
| `components/sidebar/worktree-list-groups-project-groups.test.ts:126 expect(rows[0]).toMatchObject({ label: 'Platform' })` | `D03b-050` |
| `components/sidebar/worktree-list-groups-project-groups.test.ts:43 label: 'Platform',` | `D03b-050` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:102 { key: 'project:github:stablyai/orca', label: 'Orca' }` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:105 { key: 'project:github:stablyai/orca', label: 'Orca' },` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:106 { key: 'repo:repo-other', label: 'design-assets' }` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:201 label: 'sample-app',` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:428 label: 'orca'` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:432 label: 'orca-2'` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:49 { type: 'header', key: 'project:github:stablyai/orca', label: 'Orca', count: 2 },` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:691 label: 'Orca',` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:787 label: 'Orca',` | `D03b-049` |
| `components/sidebar/worktree-list-groups-section-label-disambiguation.test.ts:72 { key: 'project:github:acme/api', label: 'work/api' },` | `D03b-049` |
| `components/sidebar/worktree-list-groups-section-label-disambiguation.test.ts:73 { key: 'project:gitlab:me/api', label: 'oss/api' }` | `D03b-049` |
| `components/sidebar/worktree-list-groups-section-label-disambiguation.test.ts:84 ).toMatchObject([{ key: 'project:github:acme/api', label: 'api' }])` | `D03b-049` |
| `components/sidebar/worktree-list-groups-section-label-disambiguation.test.ts:89 { key: 'repo:repo-work', label: 'work/api' },` | `D03b-049` |
| `components/sidebar/worktree-list-groups-section-label-disambiguation.test.ts:90 { key: 'repo:repo-oss', label: 'oss/api' }` | `D03b-049` |
| `components/sidebar/worktree-list-lineage-card-test-harness.ts:239 DropdownMenuItem: ({ children }: { children: React.ReactNode }) =>` | `INFRA: test dropdown mock item (worktree-list-lineage-card-test-harness.ts:239)` |

---

## 8. Casos de Teste (`tests`)
| Teste (`arquivo:linha :: nome`) | ID Mapeado |
|---|---|
| `components/sidebar/WorktreeList.card-memo-stability.test.tsx:268 :: WorktreeCard memo bail-out across epoch bumps` | `D03b-010` |
| `components/sidebar/WorktreeList.card-memo-stability.test.tsx:287 :: does not re-render cards on an order-preserving sortEpoch bump` | `D03b-010` |
| `components/sidebar/WorktreeList.card-memo-stability.test.tsx:310 :: re-renders a card when its own worktree data changes` | `D03b-010` |
| `components/sidebar/WorktreeList.card-memo-stability.test.tsx:334 :: tracks Smart attention changes that preserve the displayed order` | `D03b-010` |
| `components/sidebar/WorktreeList.empty-project-rows.test.ts:103 :: does not render the collapse affordance on empty ungrouped projects` | `D03b-019` |
| `components/sidebar/WorktreeList.empty-project-rows.test.ts:110 :: renders an empty ungrouped project instead of the empty workspace state` | `D03b-019` |
| `components/sidebar/WorktreeList.empty-project-rows.test.ts:118 :: shows Clear Filters when repo filters exclude an empty ungrouped project` | `D03b-019` |
| `components/sidebar/WorktreeList.empty-project-rows.test.ts:98 :: WorktreeList lineage child card renderer` | `D03b-019` |
| `components/sidebar/WorktreeList.folder-workspace-rows.test.ts:158 :: WorktreeList lineage child card renderer` | `D03b-047` |
| `components/sidebar/WorktreeList.folder-workspace-rows.test.ts:163 :: points aria-activedescendant at the active folder workspace row` | `D03b-047` |
| `components/sidebar/WorktreeList.folder-workspace-rows.test.ts:172 :: keeps folder workspace cards one compact step under their group header` | `D03b-047` |
| `components/sidebar/WorktreeList.folder-workspace-rows.test.ts:190 :: uses comparable new-card worktree geometry for experimental folder workspace rows` | `D03b-047` |
| `components/sidebar/WorktreeList.folder-workspace-rows.test.ts:209 :: preserves manual folder workspace indentation outside folder-scanned groups` | `D03b-047` |
| `components/sidebar/WorktreeList.folder-workspace-rows.test.ts:226 :: caps nested folder workspace surfaces to keep compact final anchors` | `D03b-047` |
| `components/sidebar/WorktreeList.group-headers.test.ts:118 :: WorktreeList lineage child card renderer` | `D03b-050` |
| `components/sidebar/WorktreeList.group-headers.test.ts:123 :: renders project group headers when repos import before worktree rows load` | `D03b-050` |
| `components/sidebar/WorktreeList.group-headers.test.ts:131 :: renders a collapse chevron on project group headers with children` | `D03b-050` |
| `components/sidebar/WorktreeList.group-headers.test.ts:139 :: renders collapsed project group header affordance state` | `D03b-050` |
| `components/sidebar/WorktreeList.group-headers.test.ts:148 :: does not render the project collapse affordance on flat section headers` | `D03b-050` |
| `components/sidebar/WorktreeList.group-headers.test.ts:155 :: uncollapses pinned reveal for a descendant that only lives under a pinned parent` | `D03b-050` |
| `components/sidebar/WorktreeList.group-headers.test.ts:173 :: uncollapses pinned reveal through the pinned section after host expansion` | `D03b-050` |
| `components/sidebar/WorktreeList.group-headers.test.ts:191 :: renders a collapse chevron on status group headers with worktrees` | `D03b-050` |
| `components/sidebar/WorktreeList.group-headers.test.ts:201 :: renders a collapse chevron on the pinned section header with worktrees` | `D03b-050` |
| `components/sidebar/WorktreeList.group-headers.test.ts:211 :: renders collapsed pinned section header affordance state` | `D03b-050` |
| `components/sidebar/WorktreeList.group-headers.test.ts:225 :: renders a collapse chevron on grouped repo headers with worktrees` | `D03b-050` |
| `components/sidebar/WorktreeList.group-headers.test.ts:234 :: shows Clear Filters when filters exclude pre-worktree project groups` | `D03b-050` |
| `components/sidebar/WorktreeList.lineage-agent-expansion-coupling.test.tsx:449 :: WorktreeCard agent-list <-> child-worktrees expansion coupling` | `D03b-012` |
| `components/sidebar/WorktreeList.lineage-agent-expansion-coupling.test.tsx:471 :: [full mode] both toggles render independently at mount` | `D03b-012` |
| `components/sidebar/WorktreeList.lineage-agent-expansion-coupling.test.tsx:491 :: [full mode] toggling AGENTS does NOT change the child-worktrees chip (agents -> children uncoupled)` | `D03b-012` |
| `components/sidebar/WorktreeList.lineage-agent-expansion-coupling.test.tsx:511 :: [full mode] toggling CHILD WORKTREES still remounts the card but PRESERVES agent expansion (regression)` | `D03b-012` |
| `components/sidebar/WorktreeList.lineage-agent-expansion-coupling.test.tsx:540 :: [full mode] CONTROL: a re-render that does NOT change collapsedGroups preserves agent state (isolates the remount)` | `D03b-012` |
| `components/sidebar/WorktreeList.lineage-agent-expansion-coupling.test.tsx:557 :: [compact mode] toggling CHILD WORKTREES preserves the compact agent summary expansion (regression)` | `D03b-012` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:100 :: shows the unread bell action on unread nested lineage child cards` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:114 :: lets WorktreeCard own the reconnect dialog for an active disconnected lineage child` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:131 :: points aria-activedescendant at the active lineage child row` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:139 :: points aria-activedescendant at the pinned row for active pinned workspaces` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:148 :: points aria-activedescendant at the natural duplicate when enabled` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:158 :: opens inline rename only for the row-scoped lineage child request` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:175 :: does not add group indentation when grouping is disabled` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:185 :: passes one group indentation step into the card when grouped by project` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:196 :: keeps nested card inner padding aligned with grouped parent cards` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:205 :: keeps nested card inner padding aligned inside project groups` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:214 :: adds project group depth to workspace card content indentation` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:225 :: keeps repo worktrees shallower inside folder-scanned project groups` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:244 :: caps deeply nested folder-scanned repo worktree surfaces at the compact anchor` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:40 :: WorktreeList lineage child card renderer` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:45 :: renders recursive lineage descendants through WorktreeCard once` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:63 :: passes child review details through the shared WorktreeCard path` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:74 :: uses shared nested-row indentation for child and grandchild cards` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-card.test.ts:86 :: shows deleting feedback on nested lineage child cards` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-real-card.test.tsx:384 :: WorktreeList real child WorktreeCard integration` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-real-card.test.tsx:403 :: renders GitLab MR metadata from a child through the real WorktreeCard path` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-real-card.test.tsx:412 :: keeps expanded child cards in the parent title column` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-real-card.test.tsx:422 :: keeps three-level experimental lineage children on the immediate-parent step` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-real-card.test.tsx:462 :: double-clicking a nested child opens edit metadata for the child only` | `D03b-048` |
| `components/sidebar/WorktreeList.lineage-child-real-card.test.tsx:488 :: does not activate a nested child while it is deleting` | `D03b-048` |
| `components/sidebar/WorktreeList.status-lane-lineage-drop.test.tsx:386 :: WorktreeList status-lane drop carries visible lineage children (#9083)` | `D03b-015` |
| `components/sidebar/WorktreeList.status-lane-lineage-drop.test.tsx:405 :: moves a dragged parent and its visible lineage child to the dropped lane` | `D03b-015` |
| `components/sidebar/WorktreeList.status-lane-lineage-drop.test.tsx:417 :: leaves worktrees in other lanes untouched` | `D03b-015` |
| `components/sidebar/WorktreeList.status-lane-lineage-drop.test.tsx:428 :: commits only itself when a childless worktree is dropped onto another lane` | `D03b-015` |
| `components/sidebar/host-header-drag.test.tsx:40 :: useHostHeaderDrag` | `D03b-034` |
| `components/sidebar/host-header-drag.test.tsx:41 :: does not start a drag when the pointer is released before the window listeners attach` | `D03b-034` |
| `components/sidebar/host-header-drag.test.tsx:59 :: clears a session whose pointerup was missed so a later drag still works` | `D03b-034` |
| `components/sidebar/host-header-drag.test.tsx:80 :: still promotes a drag while the pointer stays down` | `D03b-034` |
| `components/sidebar/project-group-header-drag-commit.test.ts:104 :: does not commit when a stale session no longer contains the dragged group` | `D03b-033` |
| `components/sidebar/project-group-header-drag-commit.test.ts:42 :: commitProjectGroupHeaderDragDrop` | `D03b-033` |
| `components/sidebar/project-group-header-drag-commit.test.ts:43 :: commits dense tabOrder updates for the affected Project Group siblings` | `D03b-033` |
| `components/sidebar/project-group-header-drag-commit.test.ts:66 :: computes order only from the captured sibling bucket` | `D03b-033` |
| `components/sidebar/project-group-header-drag-commit.test.ts:89 :: does not commit when the drop keeps the group in the same slot` | `D03b-033` |
| `components/sidebar/project-group-header-drag-start.test.ts:123 :: does not arm when pressing an svg icon inside an action button` | `D03b-030` |
| `components/sidebar/project-group-header-drag-start.test.ts:159 :: does not arm from the actions overlay even if the row is the drag handle` | `D03b-030` |
| `components/sidebar/project-group-header-drag-start.test.ts:23 :: createProjectGroupHeaderDragSession` | `D03b-030` |
| `components/sidebar/project-group-header-drag-start.test.ts:24 :: arms a drag session from plain header text when the row is the drag handle` | `D03b-030` |
| `components/sidebar/project-group-header-drag-start.test.ts:58 :: does not arm from nested Project Group header actions` | `D03b-030` |
| `components/sidebar/project-group-header-drag-start.test.ts:91 :: arms from the group icon svg (SVGElement target)` | `D03b-030` |
| `components/sidebar/project-group-header-drag.test.ts:14 :: project group header action targets` | `D03b-030` |
| `components/sidebar/project-group-header-drag.test.ts:15 :: ignores explicit project action wrappers` | `D03b-030` |
| `components/sidebar/project-group-header-drag.test.ts:25 :: ignores the project header actions overlay (including gaps between icons)` | `D03b-030` |
| `components/sidebar/project-group-header-drag.test.ts:38 :: ignores the hover collapse affordance` | `D03b-030` |
| `components/sidebar/project-group-header-drag.test.ts:48 :: does not ignore plain header text or the header itself` | `D03b-030` |
| `components/sidebar/project-group-header-drop.test.ts:102 :: mapSidebarProjectGroupDropIndexToSiblingInsertIndex` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:103 :: keeps upward drops at the same target index after removing the source` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:113 :: shifts downward drops because the source header is removed first` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:124 :: computeProjectGroupHeaderDropPreview` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:125 :: uses row-model header indices instead of mounted subset order` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:141 :: snaps a drop inside the last expanded Project Group section to its bottom boundary` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:165 :: rejects a drop below the measured content when the estimated section overshoots` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:188 :: rejects an edge-zone final drop below measured content when the estimate overshoots` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:211 :: snaps a within-content drop even when the estimated section overshoots` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:233 :: uses the whole Project Group section for the final boundary slot` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:255 :: getProjectGroupTabOrderUpdatesForSidebarDrop` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:256 :: reindexes sibling groups so duplicate legacy tabOrder values can move between siblings` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:274 :: returns no updates when the drop keeps the group in the same slot` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:31 :: getProjectGroupHeaderDragBucketKey` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:32 :: uses root for top-level groups` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:36 :: scopes child groups to their parent bucket` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:47 :: falls back to root when persisted parent metadata is missing` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:54 :: getSidebarOrderedProjectGroupHeaderIdsByBucket` | `D03b-032` |
| `components/sidebar/project-group-header-drop.test.ts:55 :: groups Project Group headers by effective parent bucket` | `D03b-032` |
| `components/sidebar/project-header-drag-commit.test.ts:37 :: commitProjectHeaderDragDrop` | `D03b-028` |
| `components/sidebar/project-header-drag-commit.test.ts:38 :: commits whole-repo reordering when project groups are absent` | `D03b-028` |
| `components/sidebar/project-header-drag-commit.test.ts:56 :: moves a merged paired-host header upward as one stable block` | `D03b-028` |
| `components/sidebar/project-header-drag-commit.test.ts:74 :: does not reorder host occurrences when a merged header stays in place` | `D03b-028` |
| `components/sidebar/project-header-drag-commit.test.ts:92 :: commits projectGroupOrder when project groups are present` | `D03b-028` |
| `components/sidebar/project-header-drag-start.test.ts:109 :: does not arm a drag session when pressing an svg icon inside an action button` | `D03b-025` |
| `components/sidebar/project-header-drag-start.test.ts:143 :: does not arm a drag session when pressing the actions overlay even if the row is the drag handle` | `D03b-025` |
| `components/sidebar/project-header-drag-start.test.ts:19 :: createProjectHeaderDragSession` | `D03b-025` |
| `components/sidebar/project-header-drag-start.test.ts:20 :: does not capture the pointer when arming a drag session` | `D03b-025` |
| `components/sidebar/project-header-drag-start.test.ts:49 :: arms a drag session from plain project header text when the row is the drag handle` | `D03b-025` |
| `components/sidebar/project-header-drag-start.test.ts:78 :: arms a drag session when pressing the project icon svg (SVGElement target)` | `D03b-025` |
| `components/sidebar/project-header-drag.test.ts:14 :: repo header action targets` | `D03b-025` |
| `components/sidebar/project-header-drag.test.ts:15 :: ignores explicit project action wrappers` | `D03b-025` |
| `components/sidebar/project-header-drag.test.ts:25 :: ignores native nested controls` | `D03b-025` |
| `components/sidebar/project-header-drag.test.ts:31 :: does not ignore plain header text or the header itself` | `D03b-025` |
| `components/sidebar/project-header-drag.test.ts:38 :: ignores the hover collapse affordance` | `D03b-025` |
| `components/sidebar/project-header-drag.test.ts:48 :: ignores the project header actions overlay (including gaps between icons)` | `D03b-025` |
| `components/sidebar/project-header-drop.test.ts:108 :: maps a drop immediately after the source back to the original slot` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:119 :: computeProjectHeaderDropPreview` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:120 :: uses row-model header indices instead of mounted subset order` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:136 :: supports boundary drops at the end of the full sidebar list` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:157 :: snaps a drop inside the last expanded project section to its bottom boundary` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:17 :: getProjectHeaderDragBucketKey` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:18 :: uses ungrouped for repos without a project group` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:181 :: snaps a drop between sibling project headers to the nearer boundary` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:206 :: nearest-boundary choice across an interior gap` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:22 :: scopes grouped repos to their project group bucket` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:237 :: snaps to the previous section bottom when the pointer is nearer to it` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:249 :: snaps to the next header top when the pointer is nearer to it` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:261 :: breaks the midpoint tie toward the next header boundary` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:27 :: getSidebarOrderedRepoHeaderIdsByBucket` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:274 :: content bound for the last section` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:28 :: groups repo headers by project group membership` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:297 :: rejects a drop below the measured content when the estimate overshoots` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:303 :: rejects an edge-zone final drop below measured content when the estimate overshoots` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:309 :: still snaps within the measured content when the estimate overshoots` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:317 :: snaps within the measured content when actual content undershoots the estimate` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:328 :: applyAllRepoInsertAt` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:329 :: reorders repos using a full-list insertion index` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:338 :: moves duplicate host occurrences as one stable logical-project block` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:347 :: returns null for no-op reorders` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:352 :: getProjectGroupOrderForSidebarDrop` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:363 :: uses a midpoint between sibling orders when there is room` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:372 :: uses manual repo rank as the fallback for missing sibling orders` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:386 :: keeps a deterministic finite anchor when sibling orders collide` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:395 :: assigns an order that sorts before siblings ranked by repo order` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:57 :: getLogicalRepoOrderRankById` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:58 :: anchors a merged paired-host header to its first persisted occurrence` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:71 :: mapSidebarRepoDropIndexToAllRepoInsertAt` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:74 :: maps sidebar start drops onto the first visible repo in the full list` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:78 :: maps sidebar end drops onto the slot after the last visible repo` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:82 :: maps middle sidebar drops onto the target repo id in the full list` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:87 :: mapSidebarProjectHeaderDropIndexToSiblingInsertIndex` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:88 :: keeps upward drops at the same target index after removing the source` | `D03b-027` |
| `components/sidebar/project-header-drop.test.ts:98 :: shifts downward drops because the source header is removed first` | `D03b-027` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:115 :: closed-sidebar Cmd+1-9 ordering (#9497)` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:122 :: hoists the repo main worktree first, matching the rendered sidebar` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:136 :: ignores the agent-send collapse override, which only applies to a mounted list` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:156 :: places a pinned workspace per the pinned section under both display policies` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:175 :: elides members of a collapsed group, which render no card to number` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:183 :: numbers folder workspaces, which the flat fallback omitted entirely` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:194 :: numbers a workspace created while nothing was published` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:204 :: treats a published order as authoritative, including an explicitly empty one` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:218 :: honors an explicit host filter and keeps the all-hosts default unfiltered` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:261 :: keeps the sort layer intact for smart and comparator sort modes` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:273 :: keeps same-id hosts as separate closed-sidebar shortcut positions` | `D03b-038` |
| `components/sidebar/rendered-sidebar-worktree-order.test.ts:286 :: does not reconstruct a filtered same-id host in closed-sidebar shortcuts` | `D03b-038` |
| `components/sidebar/sidebar-project-drop.test.ts:16 :: rejects empty and multi-path drops before routing` | `D03b-009` |
| `components/sidebar/sidebar-project-drop.test.ts:25 :: isRemoteRuntimeActive` | `D03b-009` |
| `components/sidebar/sidebar-project-drop.test.ts:26 :: distinguishes local runtime from active server runtime` | `D03b-009` |
| `components/sidebar/sidebar-project-drop.test.ts:33 :: getSidebarProjectDropAffordance` | `D03b-009` |
| `components/sidebar/sidebar-project-drop.test.ts:34 :: hides when the sidebar is not in a drop interaction` | `D03b-009` |
| `components/sidebar/sidebar-project-drop.test.ts:44 :: shows ready, busy, and blocked states` | `D03b-009` |
| `components/sidebar/sidebar-project-drop.test.ts:8 :: resolveSidebarProjectDropPath` | `D03b-009` |
| `components/sidebar/sidebar-project-drop.test.ts:9 :: accepts exactly one dropped path` | `D03b-009` |
| `components/sidebar/worktree-header-section-boundaries.test.ts:28 :: getRepoHeaderSectionEndByRepoId` | `D03b-040` |
| `components/sidebar/worktree-header-section-boundaries.test.ts:29 :: ends a section at the successor from the header’s own bucket` | `D03b-040` |
| `components/sidebar/worktree-header-section-boundaries.test.ts:49 :: falls back to the next header when a bucket has no successor` | `D03b-040` |
| `components/sidebar/worktree-header-section-boundaries.test.ts:60 :: resolves a header id that renders twice to its first row, matching findIndex` | `D03b-040` |
| `components/sidebar/worktree-header-section-boundaries.test.ts:77 :: getProjectGroupHeaderSectionEndByGroupId` | `D03b-040` |
| `components/sidebar/worktree-header-section-boundaries.test.ts:78 :: ends a section at the successor from the group’s own bucket` | `D03b-040` |
| `components/sidebar/worktree-list-groups-host-collision.test.ts:59 :: sidebar rows for a workspace id owned by two hosts` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-collision.test.ts:60 :: renders one selectable row per host` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-collision.test.ts:67 :: gives each row its own React key so neither replaces the other` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-collision.test.ts:75 :: labels each row with the host it lives on` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-collision.test.ts:83 :: counts the two hosts separately in the group header` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-collision.test.ts:89 :: keeps an unpinned host row visible when its same-id peer is pinned` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-labels.test.ts:158 :: uses the registered SSH target label for openclaw rows` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-labels.test.ts:17 :: buildRows with pinned worktrees` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-labels.test.ts:18 :: groups Windows host and WSL setups on the same runtime host` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-labels.test.ts:205 :: shows distinct Orca server names when status grouping mixes runtime hosts` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-labels.test.ts:264 :: omits host context labels when a project group only has one host` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-labels.test.ts:309 :: keeps same-named repos separate without project setup identity` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-labels.test.ts:327 :: returns project group keys for worktree reveal when project setup identity exists` | `D03b-049` |
| `components/sidebar/worktree-list-groups-host-labels.test.ts:99 :: uses saved host labels for mixed-host sidebar card badges` | `D03b-049` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:125 :: skips stale empty placeholder repo ids that are absent from repoMap` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:146 :: does not emit unpinned imported worktree cards outside repo grouping` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:168 :: places non-repo imported fallbacks after each repo last pinned row when expanded` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:232 :: places collapsed non-repo imported fallbacks after Pinned in pinned repo order` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:285 :: emits a new external worktrees inbox row before repo worktree rows` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:321 :: suppresses the new external worktrees inbox row when the repo group is collapsed` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:344 :: emits a repo header and inbox row when no visible worktree rows remain` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:373 :: keeps the inbox group when the repo only has a pinned worktree` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:418 :: does not emit new external worktrees inbox rows outside repo grouping` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:441 :: emits imported worktree cards in repo groups when visible rows are pinned` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:45 :: suppresses the repo-group imported worktrees card when the repo group is collapsed` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:520 :: duplicates pinned worktrees into repo groups when the policy allows it` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:556 :: suppresses duplicate-mode imported fallback only when a natural anchor renders` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:602 :: suppresses pinned imported worktree fallback when the repo has visible unpinned rows` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:630 :: keeps repo imported worktree cards visible when Pinned is collapsed` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:67 :: emits a repo header and imported worktrees card when no visible worktree rows remain` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:7 :: buildRows with pinned worktrees` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:8 :: emits an imported worktrees card at the top of repo-group rows` | `D03b-013` |
| `components/sidebar/worktree-list-groups-imported-worktrees.test.ts:96 :: emits an empty ungrouped repo placeholder before imported cards are merged` | `D03b-013` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:106 :: keeps same-id parent and child lineages partitioned by host` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:153 :: nests stable-update resolved legacy lineage when generalized lineage is absent` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:222 :: rejects stale resolved lineage after a parent instance is replaced` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:247 :: keeps mixed cyclic lineage participants visible as roots` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:282 :: resolves inline-only ancestor chains for reveal and temporary picker expansion` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:301 :: keeps a resolved child at the root when its parent is missing` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:359 :: keeps the hydrated lineage side-map authoritative when inline metadata disagrees` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:402 :: supports nested lineage chains beyond one level` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:443 :: collapses descendants under lineage parents` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:472 :: does not create a parent group for stale instance links` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:499 :: marks stale instance links as missing for shared context-menu validation` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:514 :: nests unpinned children under a pinned parent in Pinned` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:53 :: keeps lineage flat when nesting is off` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:542 :: nests grandchildren under a pinned ancestor in Pinned` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:571 :: duplicates a pinned parent tree into All when the policy allows it` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:603 :: nests a pinned child under its pinned parent in Pinned` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:631 :: keeps pinned children in Pinned without a parent badge` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:79 :: places children directly under their parent when nesting is on` | `D03b-048` |
| `components/sidebar/worktree-list-groups-lineage-nesting.test.ts:9 :: buildRows workspace lineage nesting` | `D03b-048` |
| `components/sidebar/worktree-list-groups-nested-project-groups.test.ts:10 :: project groups` | `D03b-047` |
| `components/sidebar/worktree-list-groups-nested-project-groups.test.ts:11 :: renders nested Project Groups before repos assigned to their leaf group` | `D03b-047` |
| `components/sidebar/worktree-list-groups-nested-project-groups.test.ts:141 :: preserves nested Project Group depth for folder workspace rows` | `D03b-047` |
| `components/sidebar/worktree-list-groups-nested-project-groups.test.ts:223 :: does not render folder workspaces under non-folder Project Groups` | `D03b-047` |
| `components/sidebar/worktree-list-groups-nested-project-groups.test.ts:284 :: renders imported repos under nested Project Groups before worktree rows load` | `D03b-047` |
| `components/sidebar/worktree-list-groups-nested-project-groups.test.ts:361 :: returns both parent Project Group and repo keys for grouped repo reveals` | `D03b-047` |
| `components/sidebar/worktree-list-groups-nested-project-groups.test.ts:389 :: returns only the repo key for missing Project Group metadata reveals` | `D03b-047` |
| `components/sidebar/worktree-list-groups-nested-project-groups.test.ts:417 :: returns only the repo key for ungrouped repo reveals` | `D03b-047` |
| `components/sidebar/worktree-list-groups-nested-project-groups.test.ts:75 :: renders folder workspaces under their owning folder-backed Project Group` | `D03b-047` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:140 :: discovery notice rows on a multi-host project` | `D03b-049` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:141 :: labels both rows when two distinct hosts share one label` | `D03b-049` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:165 :: labels a lone eligible row on a project that spans hosts` | `D03b-049` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:173 :: keeps each row its own label and count under either host filter` | `D03b-049` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:184 :: returns labels for exactly the eligible records, never the filtered-out ones` | `D03b-049` |
| `components/sidebar/worktree-list-groups-notice-host-labels.test.ts:201 :: leaves a single-host project unlabelled even with several records on it` | `D03b-049` |
| `components/sidebar/worktree-list-groups-pending-creations.test.ts:11 :: nests a pending creation under its repo, above the repo worktrees` | `D03b-021` |
| `components/sidebar/worktree-list-groups-pending-creations.test.ts:43 :: creates a repo group for a pending creation in a repo with no worktrees yet` | `D03b-021` |
| `components/sidebar/worktree-list-groups-pending-creations.test.ts:6 :: buildRows pending creations` | `D03b-021` |
| `components/sidebar/worktree-list-groups-pending-creations.test.ts:67 :: keeps a pending creation visible when its repo metadata is temporarily missing` | `D03b-021` |
| `components/sidebar/worktree-list-groups-pending-creations.test.ts:94 :: surfaces pending creations at the top for non-repo groupings` | `D03b-021` |
| `components/sidebar/worktree-list-groups-pinned-host-labels.test.ts:109 :: draws no badge on a single-host sidebar even with a pinned row` | `D03b-049` |
| `components/sidebar/worktree-list-groups-pinned-host-labels.test.ts:69 :: pinned rows on a multi-host sidebar` | `D03b-049` |
| `components/sidebar/worktree-list-groups-pinned-host-labels.test.ts:84 :: labels pinned rows when the only other host is itself pinned` | `D03b-049` |
| `components/sidebar/worktree-list-groups-pinned-host-labels.test.ts:99 :: labels both copies when pinned worktrees also show in their groups` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-groups.test.ts:129 :: keeps sleep-filtered Project Group members as empty project headers` | `D03b-050` |
| `components/sidebar/worktree-list-groups-project-groups.test.ts:196 :: renders ungrouped repos as top-level repo rows when Project Groups exist` | `D03b-050` |
| `components/sidebar/worktree-list-groups-project-groups.test.ts:232 :: renders repos whose Project Group metadata is missing as top-level repo rows` | `D03b-050` |
| `components/sidebar/worktree-list-groups-project-groups.test.ts:272 :: does not render collapsed child-group repos as missing metadata fallbacks` | `D03b-050` |
| `components/sidebar/worktree-list-groups-project-groups.test.ts:315 :: disambiguates duplicate top-level repo basenames without renaming repos` | `D03b-050` |
| `components/sidebar/worktree-list-groups-project-groups.test.ts:387 :: disambiguates duplicate repo basenames inside each Project Group scope` | `D03b-050` |
| `components/sidebar/worktree-list-groups-project-groups.test.ts:49 :: renders grouped repos before their visible worktrees are loaded` | `D03b-050` |
| `components/sidebar/worktree-list-groups-project-groups.test.ts:8 :: project groups` | `D03b-050` |
| `components/sidebar/worktree-list-groups-project-groups.test.ts:9 :: keeps empty project groups visible in project grouping mode` | `D03b-050` |
| `components/sidebar/worktree-list-groups-project-groups.test.ts:92 :: does not resurrect filtered repos as empty Project Group headers` | `D03b-050` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:110 :: renders same-project records with git remote identity as one mixed-host project header` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:19 :: buildRows with pinned worktrees` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:20 :: groups multiple host setups for the same project under one project header` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:210 :: keeps mixed-host project item order while inserting inbox rows before worktrees` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:299 :: orders project identity headers by the manual repo order anchor` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:376 :: splits same-host checkouts of one project into separate per-setup groups` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:438 :: splits only the surface with duplicate checkouts` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:499 :: counts projection twins for one directory as one checkout` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:55 :: keeps the cross-host project header label when another project section renders` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:562 :: keeps Git hosts grouped when folder setups share the project identity` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:632 :: keeps a provisioned runtime copy under the project header alongside a same-host checkout` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-host-setups.test.ts:696 :: splits duplicate user checkouts while a provisioned copy nests, on one host` | `D03b-049` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:116 :: keeps the main workspace first inside its project group in Recent mode` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:151 :: orders repo headers by repoOrder in Manual mode (default), ignoring activity` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:162 :: builds rows for a very large repo-group list` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:179 :: buildRows Recent project order fallbacks` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:195 :: sorts placeholder projects after projects with activity` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:219 :: project groups` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:220 :: orders repos inside a Project Group by projectGroupOrder in manual mode` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:281 :: falls back to repoOrder for grouped repos missing projectGroupOrder in manual mode` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:336 :: sorts a dragged project between repo-order fallbacks inside a group` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:397 :: orders repos inside a Project Group by activity in recent mode, keeping tabOrder` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:462 :: orders Project Group siblings by tabOrder within each parent bucket` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:48 :: orders repo headers by explicit repoOrder, not first-encounter` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:60 :: places unknown repo ids last and sorts them by label` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:68 :: orders repo headers by max(lastActivityAt) per repo in Recent mode` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:8 :: buildRows project grouping order` | `D03b-014` |
| `components/sidebar/worktree-list-groups-project-order.test.ts:91 :: uses each repo` | `D03b-014` |
| `components/sidebar/worktree-list-groups-section-label-disambiguation.test.ts:60 :: sidebar section headers with colliding display names` | `D03b-049` |
| `components/sidebar/worktree-list-groups-section-label-disambiguation.test.ts:64 :: path-disambiguates two project headers that share a display name` | `D03b-049` |
| `components/sidebar/worktree-list-groups-section-label-disambiguation.test.ts:77 :: leaves a lone project header un-suffixed` | `D03b-049` |
| `components/sidebar/worktree-list-groups-section-label-disambiguation.test.ts:87 :: path-disambiguates untracked repo headers that share a display name` | `D03b-049` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:12 :: computeWorktreeSidebarDropPreview` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:121 :: marks the gap the row previews open, not the displaced card top` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:13 :: computes an insertion line for a target group` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:153 :: resolves the same slot wherever a tall card is grabbed` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:178 :: keeps a downward end drop stable when leading rows are virtualized` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:216 :: uses the full group index when the dragged row is outside the mounted window` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:235 :: preserves the virtual row gap when only one row remains mounted` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:253 :: resolveWorktreeSidebarStatusDropCommitTarget` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:261 :: uses the current status target when pointerup hit-testing succeeds` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:281 :: reuses the latest status target when pointerup hit-testing blanks at the same point` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:29 :: returns null outside the group boundary` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:301 :: reuses the latest lineage target when pointerup hit-testing blanks at the same point` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:321 :: does not reuse a stale status target after the pointer has moved away` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:42 :: collapses lineage child rects into the parent drag unit for preview offsets` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:67 :: uses one card-height placeholder for multi-select reorder previews` | `D03b-043` |
| `components/sidebar/worktree-sidebar-drop-preview.test.ts:97 :: uses the grabbed selected card as the multi-select preview placeholder` | `D03b-043` |
| `components/sidebar/worktree-sort-label-ordering.test.ts:107 :: worktree sort label ordering` | `D03b-011` |
| `components/sidebar/worktree-sort-label-ordering.test.ts:108 :: matches the pre-precompute comparator on every pair` | `D03b-011` |
| `components/sidebar/worktree-sort-label-ordering.test.ts:119 :: produces byte-for-byte identical sort output in every mode` | `D03b-011` |
| `components/sidebar/worktree-sort-label-ordering.test.ts:132 :: falls back to deriving labels for rows missing from the precomputed map` | `D03b-011` |
| `components/sidebar/worktree-sort-label-ordering.test.ts:140 :: keys labels by row so a two-host id collision keeps each row its own label` | `D03b-011` |
