# D03a-worktree-list-module — cobertura Fase 1 (Orca)

Inventário: `domains/D03a-worktree-list-module.orca.json` (104 linhas). Evidência sempre `arquivo:linha` relativa a `src/renderer/src/`.
Chaves de cobertura usam o nome do manifest (`worktree-list/...`); o `index.json` usa `components/sidebar/worktree-list/...` (mesmo arquivo).

## Contagens

- arquivos: 88/88
- símbolos: 279/279 (somatório das listas de export do index em 88 arquivos)
- testes: 250/250 casos em 29/29 arquivos de teste
- labels: 95/95
- hotkeys: 25/25
- prefs: 0/0 (index vazio → N/A declarado)
- timers: 15/15
- subs: 43/43
- preload: 1/1

Nada ficou N/A/INFRA/DUP: 100% das entradas do index foram mapeadas a um id. `coverage.prefs` é vazio porque o index não extraiu nenhuma preferência (declarado N/A acima).

## Mapa teste → produtivo (usado para mapear casos e labels de teste)

| arquivo de teste | artefato especificado |
|---|---|
| `worktree-list/drag/pointer-flush.test.ts` | `worktree-list/drag/pointer-flush.ts` |
| `worktree-list/drag/row-state.test.ts` | `worktree-list/drag/row-state.ts` |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts` | `worktree-list/grouping/build-rows.ts` |
| `worktree-list/grouping/build-rows.test.ts` | `worktree-list/grouping/build-rows.ts` |
| `worktree-list/grouping/host-labels.test.ts` | `worktree-list/grouping/host-labels.ts` |
| `worktree-list/grouping/imported-rows.test.ts` | `worktree-list/grouping/row-builders.ts` |
| `worktree-list/listing/host-filtering.test.ts` | `worktree-list/listing/host-filtering.ts` |
| `worktree-list/listing/pending-worktree-creation-keys.test.ts` | `worktree-list/listing/pending-worktree-creation-keys.ts` |
| `worktree-list/listing/review-cache-inputs.test.ts` | `worktree-list/listing/review-cache-inputs.ts` |
| `worktree-list/listing/use-visible-worktrees.test.tsx` | `worktree-list/listing/use-visible-worktrees.ts` |
| `worktree-list/navigation/active-descendant-option.test.ts` | `worktree-list/navigation/active-descendant-option.ts` |
| `worktree-list/navigation/folder-reveal.test.ts` | `worktree-list/navigation/folder-reveal.ts` |
| `worktree-list/navigation/render-row-lookup.folder-workspace.test.ts` | `worktree-list/navigation/render-row-lookup.ts` |
| `worktree-list/navigation/use-keyboard.host-identity.test.tsx` | `worktree-list/navigation/use-keyboard.ts` |
| `worktree-list/navigation/use-reveal-requests.test.tsx` | `worktree-list/navigation/use-reveal-requests.ts` |
| `worktree-list/navigation/use-selection-host-collision.test.tsx` | `worktree-list/navigation/use-selection.ts` |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx` | `worktree-list/rows/FolderPathStatusIndicator.tsx` |
| `worktree-list/rows/RepoScanUnavailableIndicator.test.tsx` | `worktree-list/rows/RepoScanUnavailableIndicator.tsx` |
| `worktree-list/rows/indentation.test.ts` | `worktree-list/rows/indentation.ts` |
| `worktree-list/rows/option-dom-host-collision.test.ts` | `worktree-list/rows/option-dom.ts` |
| `worktree-list/rows/use-project-group-dialogs-owner-host.test.tsx` | `worktree-list/rows/use-project-group-dialogs.ts` |
| `worktree-list/viewport/hard-scroll-up.test.ts` | `worktree-list/viewport/hard-scroll-up.ts` |
| `worktree-list/viewport/scroll-adjustment.test.ts` | `worktree-list/viewport/use-scroll-suppression.ts` |
| `worktree-list/viewport/sticky-headers.test.ts` | `worktree-list/viewport/virtual-rows.ts` |
| `worktree-list/viewport/use-row-removal-animation.test.ts` | `worktree-list/viewport/use-row-removal-animation.ts` |
| `worktree-list/viewport/use-scroll-to-top.test.ts` | `worktree-list/viewport/use-scroll-to-top.ts` |
| `worktree-list/viewport/use-scroll-to-top.test.tsx` | `worktree-list/viewport/use-scroll-to-top.ts` |
| `worktree-list/viewport/virtual-rows.test.ts` | `worktree-list/viewport/virtual-rows.ts` |
| `worktree-list/viewport/visible-refresh.test.ts` | `worktree-list/viewport/use-visible-review-refresh.ts` |

(a Fase 1 não abre o Hydra; nenhuma linha foi classificada como DUP entre domínios.)

### Arquivos produtivos → ids (88)

| entrada | id |
|---|---|
| `worktree-list/drag/drop-commit-context.ts` | ['D03a-024'] |
| `worktree-list/drag/groups.ts` | ['D03a-022'] |
| `worktree-list/drag/pointer-commit.ts` | ['D03a-007', 'D03a-009', 'D03a-010', 'D03a-011'] |
| `worktree-list/drag/pointer-flush.ts` | ['D03a-003', 'D03a-005', 'D03a-011', 'D03a-012'] |
| `worktree-list/drag/row-state.ts` | ['D03a-004', 'D03a-005'] |
| `worktree-list/drag/status-target.ts` | ['D03a-009', 'D03a-010'] |
| `worktree-list/drag/use-document-drop.ts` | ['D03a-017'] |
| `worktree-list/drag/use-drop-commit-context.ts` | ['D03a-024'] |
| `worktree-list/drag/use-header-drag.ts` | ['D03a-020'] |
| `worktree-list/drag/use-lineage-drop-commit.ts` | ['D03a-006', 'D03a-007', 'D03a-008'] |
| `worktree-list/drag/use-native-autoscroll.ts` | ['D03a-016'] |
| `worktree-list/drag/use-native-drag.ts` | ['D03a-015'] |
| `worktree-list/drag/use-pointer-autoscroll.ts` | ['D03a-014'] |
| `worktree-list/drag/use-pointer-drag.ts` | ['D03a-001', 'D03a-002', 'D03a-018'] |
| `worktree-list/drag/use-pointer-window-events.ts` | ['D03a-001', 'D03a-013'] |
| `worktree-list/drag/use-runtime.ts` | ['D03a-001', 'D03a-014', 'D03a-023'] |
| `worktree-list/drag/use-session.ts` | ['D03a-024'] |
| `worktree-list/drag/use-status-mutations.ts` | ['D03a-021'] |
| `worktree-list/drag/use-status-row-drag.ts` | ['D03a-019'] |
| `worktree-list/grouping/build-rows.ts` | ['D03a-025', 'D03a-026', 'D03a-030'] |
| `worktree-list/grouping/folder-workspace-lanes.ts` | ['D03a-031'] |
| `worktree-list/grouping/group-keys.ts` | ['D03a-026', 'D03a-029', 'D03a-032', 'D03a-038', 'D03a-041', 'D03a-104'] |
| `worktree-list/grouping/group-sections.ts` | ['D03a-027', 'D03a-028'] |
| `worktree-list/grouping/host-labels.ts` | ['D03a-036'] |
| `worktree-list/grouping/pinned-group-rows.ts` | ['D03a-030'] |
| `worktree-list/grouping/project-group-sections.ts` | ['D03a-031', 'D03a-037', 'D03a-038'] |
| `worktree-list/grouping/project-grouping.ts` | ['D03a-039'] |
| `worktree-list/grouping/row-builders.ts` | ['D03a-032', 'D03a-033', 'D03a-034', 'D03a-035'] |
| `worktree-list/grouping/row-types.ts` | ['D03a-030', 'D03a-033', 'D03a-035', 'D03a-041'] |
| `worktree-list/grouping/section-order.ts` | ['D03a-027', 'D03a-037'] |
| `worktree-list/grouping/worktree-group-keys.ts` | ['D03a-040'] |
| `worktree-list/grouping/worktree-grouping.ts` | ['D03a-028', 'D03a-029', 'D03a-034', 'D03a-037'] |
| `worktree-list/listing/EmptyState.tsx` | ['D03a-042'] |
| `worktree-list/listing/host-filtering.ts` | ['D03a-045'] |
| `worktree-list/listing/pending-worktree-creation-keys.ts` | ['D03a-055'] |
| `worktree-list/listing/render-row.ts` | ['D03a-053'] |
| `worktree-list/listing/renderable-rows.ts` | ['D03a-053'] |
| `worktree-list/listing/review-cache-inputs.ts` | ['D03a-056'] |
| `worktree-list/listing/use-agent-send-target.ts` | ['D03a-048'] |
| `worktree-list/listing/use-collapsed-groups.ts` | ['D03a-049'] |
| `worktree-list/listing/use-external-worktree-cards.ts` | ['D03a-054'] |
| `worktree-list/listing/use-filters.ts` | ['D03a-043', 'D03a-044'] |
| `worktree-list/listing/use-folder-path-statuses.ts` | ['D03a-057'] |
| `worktree-list/listing/use-host-visible-scope.ts` | ['D03a-046'] |
| `worktree-list/listing/use-reused-array-identity.ts` | ['D03a-051'] |
| `worktree-list/listing/use-section-rows.ts` | ['D03a-052'] |
| `worktree-list/listing/use-sort-order.ts` | ['D03a-050'] |
| `worktree-list/listing/use-visible-worktrees.ts` | ['D03a-047'] |
| `worktree-list/navigation/active-descendant-option.ts` | ['D03a-066'] |
| `worktree-list/navigation/folder-reveal.ts` | ['D03a-070'] |
| `worktree-list/navigation/mounted-row-reveal.ts` | ['D03a-068'] |
| `worktree-list/navigation/pending-reveal-inputs.ts` | ['D03a-062'] |
| `worktree-list/navigation/render-row-lookup.ts` | ['D03a-067'] |
| `worktree-list/navigation/reveal-ancestors.ts` | ['D03a-071'] |
| `worktree-list/navigation/use-active-row.ts` | ['D03a-069'] |
| `worktree-list/navigation/use-keyboard.ts` | ['D03a-058', 'D03a-059'] |
| `worktree-list/navigation/use-pending-reveal.ts` | ['D03a-062', 'D03a-063'] |
| `worktree-list/navigation/use-reveal-highlight.ts` | ['D03a-064'] |
| `worktree-list/navigation/use-reveal-requests.ts` | ['D03a-065'] |
| `worktree-list/navigation/use-selection.ts` | ['D03a-060', 'D03a-061'] |
| `worktree-list/rows/FolderPathStatusIndicator.tsx` | ['D03a-073'] |
| `worktree-list/rows/HostSectionHeader.tsx` | ['D03a-074'] |
| `worktree-list/rows/ProjectGroupDialogs.tsx` | ['D03a-086'] |
| `worktree-list/rows/RepoScanUnavailableIndicator.tsx` | ['D03a-075'] |
| `worktree-list/rows/SectionHeader.tsx` | ['D03a-076'] |
| `worktree-list/rows/folder-row.tsx` | ['D03a-077'] |
| `worktree-list/rows/header-event-guards.ts` | ['D03a-078'] |
| `worktree-list/rows/indentation.ts` | ['D03a-079'] |
| `worktree-list/rows/item-row.tsx` | ['D03a-080'] |
| `worktree-list/rows/notice-rows.tsx` | ['D03a-072'] |
| `worktree-list/rows/option-dom.ts` | ['D03a-081'] |
| `worktree-list/rows/project-group-header-actions.tsx` | ['D03a-082', 'D03a-083'] |
| `worktree-list/rows/repo-header-project-actions.tsx` | ['D03a-084', 'D03a-085'] |
| `worktree-list/rows/use-project-group-dialogs.ts` | ['D03a-087'] |
| `worktree-list/rows/virtual-row-dispatch.tsx` | ['D03a-088'] |
| `worktree-list/viewport/VirtualizedWorktreeViewport.tsx` | ['D03a-089', 'D03a-090', 'D03a-091'] |
| `worktree-list/viewport/drop-indicators.tsx` | ['D03a-092'] |
| `worktree-list/viewport/hard-scroll-up.ts` | ['D03a-094'] |
| `worktree-list/viewport/use-group-toggle.ts` | ['D03a-093'] |
| `worktree-list/viewport/use-row-measurement.ts` | ['D03a-096'] |
| `worktree-list/viewport/use-row-removal-animation.ts` | ['D03a-097'] |
| `worktree-list/viewport/use-scroll-suppression.ts` | ['D03a-098'] |
| `worktree-list/viewport/use-scroll-to-top.ts` | ['D03a-095'] |
| `worktree-list/viewport/use-virtualizer.ts` | ['D03a-099'] |
| `worktree-list/viewport/use-visible-review-refresh.ts` | ['D03a-100'] |
| `worktree-list/viewport/viewport-props.ts` | ['D03a-103'] |
| `worktree-list/viewport/virtual-row-context.ts` | ['D03a-102'] |
| `worktree-list/viewport/virtual-rows.ts` | ['D03a-101'] |

### Símbolos exportados → id (279)

| entrada | id |
|---|---|
| `NOOP_WORKSPACE_BOARD_DRAG_PREVIEW_CALLBACK` | D03a-024 |
| `WorktreeStatusDropAtIndexArgs` | D03a-024 |
| `WorktreeDropCommitContext` | D03a-024 |
| `getWorktreeDragGroups` | D03a-022 |
| `getWorktreeDragIndexes` | D03a-022 |
| `commitWorktreePointerDrop` | D03a-007 |
| `WorktreePointerDragFrameArgs` | D03a-003 |
| `flushWorktreePointerDragFrame` | D03a-003 |
| `WorktreeRowDragState` | D03a-004 |
| `EMPTY_WORKTREE_DRAG_PREVIEW_OFFSETS` | D03a-004 |
| `WORKTREE_ROW_DRAG_INITIAL_STATE` | D03a-004 |
| `WorktreePointerDrag` | D03a-004 |
| `WorktreeSidebarLineageDropTarget` | D03a-004 |
| `NO_WORKTREE_SIDEBAR_DROP_TARGET` | D03a-004 |
| `areWorktreeDragPreviewOffsetsEqual` | D03a-004 |
| `updateLatestWorktreeStatusDropTarget` | D03a-004 |
| `clearWorktreeDropPreview` | D03a-004 |
| `applyWorktreeDropPreview` | D03a-004 |
| `applyWorktreeLineageDropPreview` | D03a-005 |
| `getPointerDropStatusTarget` | D03a-010 |
| `shouldPreferSidebarStatusDropTarget` | D03a-009 |
| `useWorktreeDocumentDrop` | D03a-017 |
| `useWorktreeDropCommitContext` | D03a-024 |
| `WorktreeSidebarHeaderDrag` | D03a-020 |
| `useWorktreeSidebarHeaderDrag` | D03a-020 |
| `WorktreeLineageDropCommit` | D03a-006 |
| `useWorktreeLineageDropCommit` | D03a-006 |
| `useWorktreeNativeDragAutoscroll` | D03a-016 |
| `useWorktreeNativeDrag` | D03a-015 |
| `useWorktreePointerDragAutoscroll` | D03a-014 |
| `useWorktreePointerDrag` | D03a-001 |
| `useWorktreePointerDragWindowEvents` | D03a-001 |
| `WorktreeDragRuntime` | D03a-001 |
| `useWorktreeDragRuntime` | D03a-001 |
| `WorktreeStatusDropRequest` | D03a-024 |
| `WorktreeDragSession` | D03a-024 |
| `useWorktreeDragSession` | D03a-024 |
| `useWorktreeStatusMutations` | D03a-021 |
| `useWorkspaceStatusRowDrag` | D03a-019 |
| `buildRows` | D03a-025 |
| `RenderableFolderWorkspace` | D03a-031 |
| `getRenderableFolderWorkspaces` | D03a-031 |
| `getFolderWorkspaceLaneKey` | D03a-031 |
| `compareFolderWorkspacesForDisplay` | D03a-031 |
| `PRGroupKey` | D03a-026 |
| `PR_GROUP_ORDER` | D03a-029 |
| `getPRLaneKey` | D03a-026 |
| `PR_GROUP_META` | D03a-026 |
| `PROJECT_GROUP_META` | D03a-026 |
| `getProjectGroupHeaderKey` | D03a-038 |
| `PINNED_GROUP_KEY` | D03a-026 |
| `PINNED_GROUP_META` | D03a-026 |
| `ALL_GROUP_KEY` | D03a-026 |
| `ALL_GROUP_META` | D03a-026 |
| `LINEAGE_GROUP_PREFIX` | D03a-026 |
| `getLineageGroupKey` | D03a-026 |
| `getWorktreeLineageGroupKey` | D03a-026 |
| `getPRGroupKey` | D03a-026 |
| `SectionAppendContext` | D03a-027 |
| `appendOrderedGroups` | D03a-027 |
| `getMixedHostContextLabels` | D03a-036 |
| `NoticeHostContext` | D03a-036 |
| `getNoticeHostContextLabels` | D03a-036 |
| `getMixedWorktreeHostContextLabels` | D03a-036 |
| `getHostWorktreeCounts` | D03a-036 |
| `getHostWorktreeIds` | D03a-036 |
| `getLaneHostWorktreeCounts` | D03a-036 |
| `getLaneHostWorktreeIds` | D03a-036 |
| `emitPinnedGroup` | D03a-030 |
| `appendProjectGroupSections` | D03a-031 |
| `OrderedGroupEntry` | D03a-039 |
| `ProjectGroupingModel` | D03a-039 |
| `WorktreeGroupEntry` | D03a-039 |
| `ProjectGroupingIndex` | D03a-039 |
| `buildProjectGroupingIndex` | D03a-039 |
| `ProjectHeaderRevealTarget` | D03a-039 |
| `getProjectGroupingForRepo` | D03a-039 |
| `getProjectHeaderRevealTarget` | D03a-039 |
| `addRepoIdToGroup` | D03a-039 |
| `buildPendingCreationRow` | D03a-032 |
| `buildImportedWorktreesCardRow` | D03a-032 |
| `buildNewExternalWorktreesInboxRow` | D03a-032 |
| `appendWorktreeRows` | D03a-032 |
| `buildFolderWorkspaceRow` | D03a-032 |
| `WorktreeGroupBy` | D03a-041 |
| `PinnedWorktreeDisplayPolicy` | D03a-041 |
| `getPinnedWorktreeDisplayPolicy` | D03a-030 |
| `GroupHeaderRow` | D03a-041 |
| `WorktreeRow` | D03a-041 |
| `ImportedWorktreesCardCandidate` | D03a-030 |
| `ImportedWorktreesCardRow` | D03a-030 |
| `NewExternalWorktreesInboxCandidate` | D03a-030 |
| `NewExternalWorktreesInboxRow` | D03a-030 |
| `PendingCreationRow` | D03a-030 |
| `FolderWorkspaceRow` | D03a-030 |
| `PendingCreationRef` | D03a-035 |
| `Row` | D03a-030 |
| `getRenderedNaturalAnchorRepoIds` | D03a-027 |
| `orderMainWorktreeFirst` | D03a-027 |
| `withRepoSectionDisplayLabels` | D03a-027 |
| `recentRankForEntry` | D03a-027 |
| `compareRecentRank` | D03a-027 |
| `getManualOrderAnchorRepo` | D03a-037 |
| `sortProjectEntries` | D03a-027 |
| `getGroupKeyForWorktree` | D03a-040 |
| `getGroupKeysForWorktree` | D03a-040 |
| `buildOrderedGroups` | D03a-028 |
| `SidebarWorktreeListEmptyState` | D03a-042 |
| `getVisibleSidebarHostIdSet` | D03a-045 |
| `filterProjectGroupsForVisibleHosts` | D03a-045 |
| `filterFolderWorkspacesForVisibleHosts` | D03a-045 |
| `getProjectGroupExecutionHostIdForRows` | D03a-045 |
| `getFolderWorkspaceExecutionHostIdForRows` | D03a-045 |
| `getRuntimeEnvironmentIdForFolderPathStatusHost` | D03a-045 |
| `getFolderPathStatusRouteOptionsForRows` | D03a-045 |
| `EMPTY_PENDING_WORKTREE_CREATION_KEYS` | D03a-055 |
| `selectPendingWorktreeCreationKeys` | D03a-055 |
| `RenderRow` | D03a-053 |
| `getRenderRowKey` | D03a-053 |
| `WorktreeItemRow` | D03a-053 |
| `FolderWorkspaceItemRow` | D03a-053 |
| `isWorktreeItemRow` | D03a-053 |
| `isPinnedWorktreeRow` | D03a-053 |
| `buildRenderableRows` | D03a-053 |
| `WorktreeListReviewCacheState` | D03a-056 |
| `WorktreeListReviewCacheInputs` | D03a-056 |
| `EMPTY_WORKTREE_LIST_REVIEW_CACHE_INPUTS` | D03a-056 |
| `selectWorktreeListReviewCacheInputs` | D03a-056 |
| `useAgentSendTargetWorktreeId` | D03a-048 |
| `useEffectiveCollapsedGroups` | D03a-049 |
| `useSidebarExternalWorktreeCards` | D03a-054 |
| `SidebarWorktreeFilters` | D03a-043 |
| `useSidebarWorktreeFilters` | D03a-043 |
| `useFolderWorkspacePathStatusRows` | D03a-057 |
| `useSidebarHostVisibleScope` | D03a-046 |
| `useReusedArrayIdentity` | D03a-051 |
| `useSidebarSectionRows` | D03a-052 |
| `useSidebarWorktreeSortOrder` | D03a-050 |
| `useVisibleSidebarWorktrees` | D03a-047 |
| `getRenderRowOptionId` | D03a-066 |
| `getActiveDescendantOptionId` | D03a-066 |
| `getKnownSidebarWorktreeById` | D03a-070 |
| `sidebarWorkspaceStillExists` | D03a-070 |
| `getFolderWorkspaceRevealGroupKeys` | D03a-070 |
| `revealMountedWorktreeElement` | D03a-068 |
| `revealMountedSidebarRowElement` | D03a-068 |
| `MAX_REVEAL_RETRIES` | D03a-062 |
| `PendingSidebarRevealArgs` | D03a-062 |
| `expandGroupsForWorktreeReveal` | D03a-062 |
| `resolvePendingSidebarReveal` | D03a-062 |
| `getRenderRowSidebarKey` | D03a-067 |
| `rowKeyMatchesRenderRow` | D03a-067 |
| `renderRowContainsWorktree` | D03a-067 |
| `getRenderRowWorktreeItem` | D03a-067 |
| `findPreferredRenderRowIndexForWorktree` | D03a-067 |
| `findPreferredRenderRowIndexForWorktreeIdentity` | D03a-067 |
| `getSidebarRowRevealAncestorKeys` | D03a-071 |
| `getPinnedWorktreeRevealCollapsedGroupKeys` | D03a-071 |
| `usePrimaryActiveWorktreeRow` | D03a-069 |
| `useWorktreeListKeyboardNavigation` | D03a-058 |
| `usePendingSidebarReveal` | D03a-062 |
| `SidebarRevealHighlight` | D03a-064 |
| `useSidebarRevealHighlight` | D03a-064 |
| `useSidebarRevealRequests` | D03a-065 |
| `useSidebarWorktreeSelection` | D03a-060 |
| `FolderPathStatusIndicator` | D03a-073 |
| `HostSectionHeader` | D03a-074 |
| `SidebarWorktreeListDialogs` | D03a-086 |
| `RepoScanUnavailableIndicator` | D03a-075 |
| `SectionHeaderRowContext` | D03a-076 |
| `renderWorktreeSectionHeaderRow` | D03a-076 |
| `FolderWorkspaceRowContext` | D03a-077 |
| `renderFolderWorkspaceVirtualRow` | D03a-077 |
| `stopRepoHeaderKeyboardToggle` | D03a-078 |
| `stopNestedWorktreeCardBubble` | D03a-078 |
| `handleRepoHeaderActionPointerDown` | D03a-078 |
| `handleRepoHeaderCollapseAffordancePointerDown` | D03a-078 |
| `stopRepoHeaderMenuEvent` | D03a-078 |
| `shouldIgnoreRepoHeaderToggle` | D03a-078 |
| `SIDEBAR_TREE_INDENT` | D03a-079 |
| `FLUSH_CARD_CONTENT_PULLBACK` | D03a-079 |
| `NEW_CARD_STYLE_STATUS_LANE_EXTRA_PULLBACK` | D03a-079 |
| `FLUSH_CARD_MIN_CONTENT_INSET` | D03a-079 |
| `WORKTREE_CARD_SURFACE_MARGIN` | D03a-079 |
| `LINEAGE_IMMEDIATE_PARENT_STEP` | D03a-079 |
| `LINEAGE_NESTED_ROW_SURFACE_INSET` | D03a-079 |
| `LINEAGE_CHILDREN_INLINE_OFFSET` | D03a-079 |
| `PROJECT_GROUP_HEADER_BASE_PADDING` | D03a-079 |
| `WORKTREE_SECTION_HEADER_PADDING_LEFT` | D03a-079 |
| `PROJECT_GROUP_HEADER_INDENT` | D03a-079 |
| `MAX_PROJECT_GROUP_HEADER_DEPTH` | D03a-079 |
| `getProjectGroupHeaderPaddingLeft` | D03a-079 |
| `getWorktreeCardContentIndent` | D03a-079 |
| `getFolderBackedRepoWorktreeCardContentIndent` | D03a-079 |
| `getFolderBackedRepoWorktreeCardSurfaceInset` | D03a-079 |
| `getFolderWorkspaceCardContentIndent` | D03a-079 |
| `getFolderWorkspaceCardSurfaceInset` | D03a-079 |
| `getFolderWorkspaceRowGeometry` | D03a-079 |
| `getWorktreeCardSurfaceInset` | D03a-079 |
| `getFlushWorktreeCardPaddingLeft` | D03a-079 |
| `getNewCardStyleParentContentMarginLeft` | D03a-079 |
| `getLineageNestedRowGeometry` | D03a-079 |
| `getLineageChildrenInlineStyle` | D03a-079 |
| `getLineageEffectiveChildStart` | D03a-079 |
| `WorktreeItemRowContext` | D03a-080 |
| `renderWorktreeItemRow` | D03a-080 |
| `renderWorktreeLineageDescendants` | D03a-080 |
| `canKeepImportedWorktreesHidden` | D03a-072 |
| `renderImportedWorktreesVirtualRow` | D03a-072 |
| `renderNewExternalWorktreesInboxVirtualRow` | D03a-072 |
| `renderPendingCreationVirtualRow` | D03a-072 |
| `getWorktreeOptionId` | D03a-081 |
| `getMountedWorktreeOptions` | D03a-081 |
| `markSidebarWorktreeActiveImmediately` | D03a-081 |
| `ProjectGroupHeaderMenu` | D03a-082 |
| `ProjectGroupCreateWorkspaceButton` | D03a-082 |
| `RepoHeaderProjectActions` | D03a-084 |
| `RepoHeaderProjectActionsMenu` | D03a-084 |
| `RepoHeaderCreateWorkspaceButton` | D03a-084 |
| `ProjectGroupNameDialogState` | D03a-087 |
| `ProjectGroupDeleteDialogState` | D03a-087 |
| `ProjectGroupDialogs` | D03a-087 |
| `useProjectGroupDialogs` | D03a-087 |
| `WorktreeVirtualRowContext` | D03a-088 |
| `renderWorktreeVirtualRow` | D03a-088 |
| `VirtualizedWorktreeViewport` | D03a-089 |
| `renderWorktreeSidebarDropIndicators` | D03a-092 |
| `HARD_SCROLL_UP` | D03a-094 |
| `HardScrollUpWheelSample` | D03a-094 |
| `HardScrollUpScrollSample` | D03a-094 |
| `HardScrollUpDetectorState` | D03a-094 |
| `HardScrollUpViewport` | D03a-094 |
| `createHardScrollUpDetectorState` | D03a-094 |
| `normalizeWheelDeltaY` | D03a-094 |
| `reduceHardScrollUpOnWheel` | D03a-094 |
| `reduceHardScrollUpOnScroll` | D03a-094 |
| `reduceHardScrollUpOnIdle` | D03a-094 |
| `reduceHardScrollUpOnDismiss` | D03a-094 |
| `useGroupToggleWithScrollAnchor` | D03a-093 |
| `countRecordKeysByReference` | D03a-096 |
| `useVirtualRowMeasurementSync` | D03a-096 |
| `WORKTREE_ROW_REMOVAL_ANIMATION_MS` | D03a-097 |
| `VirtualRowLayoutSnapshot` | D03a-097 |
| `VirtualRowRemovalMotion` | D03a-097 |
| `getSidebarRowIdentityKeys` | D03a-097 |
| `buildVirtualRowRemovalMotions` | D03a-097 |
| `useVirtualRowRemovalAnimation` | D03a-097 |
| `USER_SCROLL_MEASUREMENT_ADJUSTMENT_SUPPRESS_MS` | D03a-098 |
| `EXPANDING_CARD_MEASUREMENT_ADJUSTMENT_SUPPRESS_MS` | D03a-098 |
| `shouldAdjustWorktreeSidebarMeasuredRowScroll` | D03a-098 |
| `WorktreeSidebarScrollSuppression` | D03a-098 |
| `useWorktreeSidebarScrollSuppression` | D03a-098 |
| `useWorktreeListScrollToTop` | D03a-095 |
| `WorktreeListVirtualizer` | D03a-099 |
| `useWorktreeListVirtualizer` | D03a-099 |
| `installWorktreeVisibleRefreshVisibilityListener` | D03a-100 |
| `useVisiblePrRefreshReporting` | D03a-100 |
| `EMPTY_PROJECT_GROUPS` | D03a-103 |
| `VirtualizedWorktreeViewportProps` | D03a-103 |
| `buildWorktreeVirtualRowContext` | D03a-102 |
| `GROUP_HEADER_ROW_HEIGHT` | D03a-101 |
| `HOST_HEADER_ROW_HEIGHT` | D03a-101 |
| `WORKTREE_SIDEBAR_VIRTUAL_ROW_GAP` | D03a-101 |
| `buildLineageRowRekeyMap` | D03a-101 |
| `shouldUseHeaderTopSpacing` | D03a-101 |
| `estimateRenderRowSize` | D03a-101 |
| `getVirtualRowTransform` | D03a-101 |
| `getVirtualRowIndex` | D03a-101 |
| `getVirtualRowKey` | D03a-101 |
| `getWorktreeVirtualRowTransform` | D03a-101 |
| `pruneStaleVirtualRowElementCache` | D03a-101 |
| `getStickyHeaderIndexes` | D03a-101 |
| `HOST_STICKY_PINNED_HEIGHT` | D03a-101 |
| `ActiveStickyIndexes` | D03a-101 |
| `getActiveStickyIndexesForScroll` | D03a-101 |
| `getActiveStickyHeaderIndex` | D03a-101 |
| `getPreviousStickyHeaderIndex` | D03a-101 |
| `extractWorktreeVirtualRowIndexes` | D03a-101 |
| `getActiveStickyHeaderIndexForScroll` | D03a-101 |

### Labels (menus/itens/aria) → id (95)

| entrada | id |
|---|---|
| `worktree-list/grouping/build-rows.test.ts:130 :: expect(rows[0]).toMatchObject({ type: 'header', key: 'pinned', label: ` | D03a-030 |
| `worktree-list/grouping/build-rows.test.ts:132 :: expect(rows[2]).toMatchObject({ type: 'header', key: 'all', label: 'Al` | D03a-030 |
| `worktree-list/grouping/build-rows.test.ts:169 :: { type: 'header', key: 'all', label: 'All' },` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:234 :: label: 'In progress',` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:283 :: label: 'In progress'` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:313 :: expect(rows[0]).toMatchObject({ type: 'header', label: 'c15t' })` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:344 :: label: 'design-assets',` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:355 :: rows.filter((r) => r.type === 'header').map((r) => ({ key: r.key, labe` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:356 :: ).toEqual([{ key: 'workspace-status:in-review', label: 'In review' }])` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:361 :: { id: 'blocked', label: 'Blocked' },` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:362 :: { id: 'todo', label: 'Ready' },` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:363 :: { id: 'in-progress', label: 'Doing' }` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:378 :: rows.filter((r) => r.type === 'header').map((r) => ({ key: r.key, labe` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:380 :: { key: 'workspace-status:blocked', label: 'Blocked' },` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:381 :: { key: 'workspace-status:in-progress', label: 'Doing' }` | D03a-025 |
| `worktree-list/grouping/build-rows.ts:161 :: label: ALL_GROUP_META.label,` | D03a-026 |
| `worktree-list/grouping/group-keys.ts:34 :: label: string` | D03a-026 |
| `worktree-list/grouping/group-sections.ts:87 :: label: group.label,` | D03a-027 |
| `worktree-list/grouping/group-sections.ts:105 :: label: definition?.label ?? workspaceStatus,` | D03a-028 |
| `worktree-list/grouping/group-sections.ts:130 :: label: meta.label,` | D03a-027 |
| `worktree-list/grouping/host-labels.ts:83 :: label: string` | D03a-036 |
| `worktree-list/grouping/host-labels.ts:85 :: *  tooltip worktree cards use, which the label alone cannot select. */` | D03a-036 |
| `worktree-list/grouping/imported-rows.test.ts:21 :: label: key,` | D03a-032 |
| `worktree-list/grouping/pinned-group-rows.ts:55 :: label: PINNED_GROUP_META.label,` | D03a-030 |
| `worktree-list/grouping/project-group-sections.ts:103 :: label: projectGroup.name,` | D03a-037 |
| `worktree-list/grouping/project-grouping.ts:20 :: label: string` | D03a-039 |
| `worktree-list/grouping/project-grouping.ts:117 :: label: string` | D03a-039 |
| `worktree-list/grouping/project-grouping.ts:133 :: label: repo?.displayName ?? 'Unknown',` | D03a-039 |
| `worktree-list/grouping/project-grouping.ts:144 :: label: repo?.displayName ?? setup.displayName,` | D03a-039 |
| `worktree-list/grouping/project-grouping.ts:153 :: label: project.displayName,` | D03a-039 |
| `worktree-list/grouping/row-types.ts:20 :: label: string` | D03a-030 |
| `worktree-list/grouping/section-order.ts:94 :: ? { ...group, label: labelsByPath.get(getRepoDisplayLabelKey(group.rep` | D03a-027 |
| `worktree-list/grouping/worktree-grouping.ts:84 :: let label: string` | D03a-028 |
| `worktree-list/grouping/worktree-grouping.ts:116 :: label: getLaneLabelForKey(key, groupBy, workspaceStatuses),` | D03a-028 |
| `worktree-list/grouping/worktree-grouping.ts:143 :: label: grouping.label,` | D03a-028 |
| `worktree-list/grouping/worktree-grouping.ts:159 :: label: grouping.label,` | D03a-028 |
| `worktree-list/grouping/worktree-grouping.ts:177 :: label: grouping.label,` | D03a-028 |
| `worktree-list/grouping/worktree-grouping.ts:196 :: label: grouping.label,` | D03a-028 |
| `worktree-list/navigation/use-reveal-requests.test.tsx:47 :: async function click(label: string): Promise<void> {` | D03a-065 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:5 :: import { TooltipProvider } from '@/components/ui/tooltip'` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:28 :: expect(markup).toContain('aria-label="Folder not found"')` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:38 :: expect(markup).toContain('aria-label="')` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:39 :: expect(markup).not.toContain('aria-label=""')` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:41 :: expect(markup).not.toContain('aria-label="Folder not found"')` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:50 :: expect(markup).toContain('aria-label="')` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:51 :: expect(markup).not.toContain('aria-label=""')` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:53 :: expect(markup).not.toContain('aria-label="Folder not found"')` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.tsx:3 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.tsx:32 :: aria-label={title}` | D03a-073 |
| `worktree-list/rows/HostSectionHeader.tsx:3 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/` | D03a-074 |
| `worktree-list/rows/HostSectionHeader.tsx:9 :: function formatSectionActivityLabel(count: number, label: string): str` | D03a-074 |
| `worktree-list/rows/HostSectionHeader.tsx:19 :: aria-label={totalLabel}` | D03a-074 |
| `worktree-list/rows/ProjectGroupDialogs.tsx:36 :: title={` | D03a-086 |
| `worktree-list/rows/RepoScanUnavailableIndicator.test.tsx:6 :: import { TooltipProvider } from '@/components/ui/tooltip'` | D03a-075 |
| `worktree-list/rows/RepoScanUnavailableIndicator.tsx:3 :: import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } fr` | D03a-075 |
| `worktree-list/rows/RepoScanUnavailableIndicator.tsx:90 :: aria-label={`${title}. ${retryLabel}`}` | D03a-075 |
| `worktree-list/rows/SectionHeader.tsx:154 :: label: row.label,` | D03a-076 |
| `worktree-list/rows/project-group-header-actions.tsx:4 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/` | D03a-083 |
| `worktree-list/rows/project-group-header-actions.tsx:8 :: DropdownMenuItem,` | D03a-082 |
| `worktree-list/rows/project-group-header-actions.tsx:34 :: label: string` | D03a-082 |
| `worktree-list/rows/project-group-header-actions.tsx:47 :: aria-label={translate(` | D03a-082 |
| `worktree-list/rows/project-group-header-actions.tsx:71 :: <DropdownMenuItem onSelect={() => onRename(groupId, label, hostId)}>` | D03a-082 |
| `worktree-list/rows/project-group-header-actions.tsx:73 :: </DropdownMenuItem>` | D03a-082 |
| `worktree-list/rows/project-group-header-actions.tsx:74 :: <DropdownMenuItem variant="destructive" onSelect={() => onDelete(group` | D03a-082 |
| `worktree-list/rows/project-group-header-actions.tsx:76 :: </DropdownMenuItem>` | D03a-082 |
| `worktree-list/rows/project-group-header-actions.tsx:90 :: label: string` | D03a-082 |
| `worktree-list/rows/project-group-header-actions.tsx:113 :: aria-label={createLabel}` | D03a-082 |
| `worktree-list/rows/repo-header-project-actions.tsx:15 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/` | D03a-085 |
| `worktree-list/rows/repo-header-project-actions.tsx:19 :: DropdownMenuItem,` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:78 :: label: string` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:93 :: aria-label={translate(` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:122 :: <DropdownMenuItem onSelect={() => actions.onOpenRepoSettings(repo.id)}` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:125 :: </DropdownMenuItem>` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:126 :: <DropdownMenuItem` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:131 :: </DropdownMenuItem>` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:133 :: <DropdownMenuItem onSelect={() => actions.onOpenWorktreeVisibility(rep` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:136 :: </DropdownMenuItem>` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:138 :: <DropdownMenuItem onSelect={() => actions.onCreateGroupFromRepo(repo)}` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:142 :: </DropdownMenuItem>` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:151 :: <DropdownMenuItem` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:157 :: </DropdownMenuItem>` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:163 :: <DropdownMenuItem onSelect={() => actions.onRemoveProjectFromGroup(rep` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:166 :: </DropdownMenuItem>` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:169 :: <DropdownMenuItem variant="destructive" onSelect={() => actions.onRemo` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:172 :: </DropdownMenuItem>` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:185 :: label: string` | D03a-084 |
| `worktree-list/rows/repo-header-project-actions.tsx:205 :: aria-label={createState.ariaLabel}` | D03a-085 |
| `worktree-list/rows/repo-header-project-actions.tsx:215 :: aria-label={createState.ariaLabel}` | D03a-085 |
| `worktree-list/rows/repo-header-project-actions.tsx:228 :: aria-label={createState?.ariaLabel ?? fallbackLabel}` | D03a-085 |
| `worktree-list/rows/repo-header-project-actions.tsx:242 :: {createState?.tooltip ?? fallbackLabel}` | D03a-085 |
| `worktree-list/viewport/VirtualizedWorktreeViewport.tsx:333 :: aria-label={translate('auto.components.sidebar.WorktreeList.bfbedc547b` | D03a-089 |
| `worktree-list/viewport/scroll-adjustment.test.ts:32 :: label: key,` | D03a-098 |
| `worktree-list/viewport/sticky-headers.test.ts:23 :: label: key,` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:21 :: label: hostId,` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:33 :: label: key,` | D03a-101 |

### Atalhos/teclas observados → id (25)

| entrada | id |
|---|---|
| `worktree-list/drag/pointer-flush.test.ts:224 :: const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelabl` | D03a-003 |
| `worktree-list/drag/pointer-flush.test.ts:239 :: const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable:` | D03a-003 |
| `worktree-list/drag/pointer-flush.test.ts:244 :: const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelabl` | D03a-003 |
| `worktree-list/drag/pointer-flush.test.ts:253 :: const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelabl` | D03a-003 |
| `worktree-list/drag/use-pointer-window-events.ts:81 :: const handleKeyDown = (event: KeyboardEvent): void => {` | D03a-001 |
| `worktree-list/drag/use-pointer-window-events.ts:82 :: if (event.key !== 'Escape' || !worktreePointerDragRef.current) {` | D03a-013 |
| `worktree-list/navigation/use-keyboard.host-identity.test.tsx:9 :: import { getShortcutPlatform } from '@/lib/shortcut-platform'` | D03a-058 |
| `worktree-list/navigation/use-keyboard.host-identity.test.tsx:51 :: const mod = getShortcutPlatform() === 'darwin' ? { metaKey: true } : {` | D03a-058 |
| `worktree-list/navigation/use-keyboard.host-identity.test.tsx:54 :: new KeyboardEvent('keydown', {` | D03a-058 |
| `worktree-list/navigation/use-keyboard.ts:7 :: import { getShortcutPlatform } from '@/lib/shortcut-platform'` | D03a-058 |
| `worktree-list/navigation/use-keyboard.ts:25 :: // xterm's hidden input textarea isn't a real text field; treating it ` | D03a-058 |
| `worktree-list/navigation/use-keyboard.ts:115 :: const handleKeyDown = (e: KeyboardEvent) => {` | D03a-058 |
| `worktree-list/navigation/use-keyboard.ts:120 :: const platform = getShortcutPlatform()` | D03a-058 |
| `worktree-list/navigation/use-keyboard.ts:144 :: (e: React.KeyboardEvent) => {` | D03a-058 |
| `worktree-list/navigation/use-selection-host-collision.test.tsx:9 :: import { getVisibleWorktreeShortcutTargets } from '../../visible-workt` | D03a-060 |
| `worktree-list/navigation/use-selection-host-collision.test.tsx:58 :: it('publishes both rows as separate shortcut targets', () => {` | D03a-061 |
| `worktree-list/navigation/use-selection-host-collision.test.tsx:59 :: expect(getVisibleWorktreeShortcutTargets()).toEqual([` | D03a-060 |
| `worktree-list/navigation/use-selection.ts:8 :: import { setVisibleWorktreeIds, setVisibleWorktreeShortcutTargets } fr` | D03a-061 |
| `worktree-list/navigation/use-selection.ts:18 :: // the Cmd+1–9 shortcut cache all agree on one order.` | D03a-061 |
| `worktree-list/navigation/use-selection.ts:132 :: // Why layout effect: the Cmd/Ctrl+1–9 handler can fire right after co` | D03a-061 |
| `worktree-list/navigation/use-selection.ts:135 :: setVisibleWorktreeShortcutTargets(` | D03a-061 |
| `worktree-list/navigation/use-selection.ts:141 :: // Why null, not []: [] is a real rendered order (all collapsed/filter` | D03a-061 |
| `worktree-list/navigation/use-selection.ts:144 :: setVisibleWorktreeShortcutTargets(null)` | D03a-061 |
| `worktree-list/rows/header-event-guards.ts:4 :: export function stopRepoHeaderKeyboardToggle(event: React.KeyboardEven` | D03a-078 |
| `worktree-list/rows/header-event-guards.ts:5 :: if (event.key === 'Enter' || event.key === ' ') {` | D03a-078 |

### Timers/frames → id (15)

| entrada | id |
|---|---|
| `worktree-list/drag/pointer-flush.test.ts:28 :: vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback` | D03a-003 |
| `worktree-list/drag/pointer-flush.test.ts:157 :: const frames = vi.mocked(window.requestAnimationFrame).mock.calls.leng` | D03a-003 |
| `worktree-list/drag/pointer-flush.test.ts:159 :: expect(vi.mocked(window.requestAnimationFrame).mock.calls).toHaveLengt` | D03a-003 |
| `worktree-list/drag/pointer-flush.ts:205 :: drag.frameId = window.requestAnimationFrame(() => flushWorktreePointer` | D03a-003 |
| `worktree-list/drag/use-native-autoscroll.ts:85 :: nativeAutoscrollFrameIdRef.current = window.requestAnimationFrame(runF` | D03a-016 |
| `worktree-list/drag/use-native-autoscroll.ts:106 :: nativeAutoscrollFrameIdRef.current = window.requestAnimationFrame(runF` | D03a-016 |
| `worktree-list/drag/use-pointer-autoscroll.ts:57 :: pointerAutoscrollFrameIdRef.current = window.requestAnimationFrame(run` | D03a-014 |
| `worktree-list/drag/use-pointer-autoscroll.ts:77 :: pointerAutoscrollFrameIdRef.current = window.requestAnimationFrame(run` | D03a-014 |
| `worktree-list/drag/use-pointer-drag.ts:97 :: drag.frameId = window.requestAnimationFrame(flushWorktreePointerDrag)` | D03a-001 |
| `worktree-list/listing/use-sort-order.ts:75 :: const timer = setTimeout(() => setDebouncedSortEpoch(sortEpoch), SORT_` | D03a-050 |
| `worktree-list/navigation/use-reveal-highlight.ts:19 :: const frameId = window.requestAnimationFrame((time) => {` | D03a-064 |
| `worktree-list/navigation/use-reveal-highlight.ts:43 :: revealHighlightFrameIdRef.current = window.requestAnimationFrame(() =>` | D03a-064 |
| `worktree-list/navigation/use-reveal-highlight.ts:46 :: revealHighlightTimeoutRef.current = window.setTimeout(() => {` | D03a-064 |
| `worktree-list/viewport/use-row-measurement.ts:97 :: const frameId = window.requestAnimationFrame(measureMountedRows)` | D03a-096 |
| `worktree-list/viewport/use-scroll-to-top.ts:77 :: idleTimerRef.current = window.setTimeout(() => {` | D03a-095 |

### Subscriptions/listeners → id (43)

| entrada | id |
|---|---|
| `worktree-list/drag/use-document-drop.ts:18 :: useEffect(() => {` | D03a-017 |
| `worktree-list/drag/use-document-drop.ts:90 :: document.addEventListener('drop', handleDocumentDrop, true)` | D03a-017 |
| `worktree-list/drag/use-document-drop.ts:94 :: useEffect(() => {` | D03a-017 |
| `worktree-list/drag/use-document-drop.ts:101 :: document.addEventListener('dragend', handleDocumentDragEnd, true)` | D03a-017 |
| `worktree-list/drag/use-document-drop.ts:105 :: useEffect(() => {` | D03a-017 |
| `worktree-list/drag/use-document-drop.ts:112 :: document.addEventListener('visibilitychange', handleVisibilityChange)` | D03a-017 |
| `worktree-list/drag/use-header-drag.ts:123 :: useEffect(() => {` | D03a-020 |
| `worktree-list/drag/use-header-drag.ts:126 :: useEffect(() => () => onHostDragActiveChange(false), [onHostDragActive` | D03a-020 |
| `worktree-list/drag/use-pointer-drag.ts:247 :: useEffect(() => {` | D03a-001 |
| `worktree-list/drag/use-pointer-drag.ts:257 :: document.addEventListener('click', handleClick, true)` | D03a-001 |
| `worktree-list/drag/use-pointer-window-events.ts:31 :: useEffect(() => {` | D03a-001 |
| `worktree-list/drag/use-pointer-window-events.ts:90 :: window.addEventListener('keydown', handleKeyDown, { capture: true })` | D03a-013 |
| `worktree-list/drag/use-pointer-window-events.ts:91 :: window.addEventListener('pointermove', handlePointerMove, { capture: t` | D03a-013 |
| `worktree-list/drag/use-pointer-window-events.ts:92 :: window.addEventListener('pointerup', handlePointerUp, { capture: true ` | D03a-013 |
| `worktree-list/drag/use-pointer-window-events.ts:93 :: window.addEventListener('pointercancel', handlePointerCancel, { captur` | D03a-013 |
| `worktree-list/listing/use-folder-path-statuses.ts:76 :: useEffect(() => {` | D03a-057 |
| `worktree-list/listing/use-reused-array-identity.ts:9 :: useEffect(() => {` | D03a-051 |
| `worktree-list/listing/use-sort-order.ts:61 :: useEffect(() => {` | D03a-050 |
| `worktree-list/listing/use-sort-order.ts:167 :: useEffect(() => {` | D03a-050 |
| `worktree-list/listing/use-sort-order.ts:178 :: useEffect(() => {` | D03a-050 |
| `worktree-list/listing/use-sort-order.ts:201 :: useEffect(() => {` | D03a-050 |
| `worktree-list/listing/use-sort-order.ts:216 :: useEffect(() => {` | D03a-050 |
| `worktree-list/listing/use-sort-order.ts:225 :: useEffect(() => {` | D03a-050 |
| `worktree-list/navigation/use-keyboard.ts:114 :: useEffect(() => {` | D03a-058 |
| `worktree-list/navigation/use-keyboard.ts:139 :: window.addEventListener('keydown', handleKeyDown, { capture: true })` | D03a-058 |
| `worktree-list/navigation/use-pending-reveal.ts:59 :: useEffect(() => {` | D03a-062 |
| `worktree-list/navigation/use-pending-reveal.ts:190 :: useEffect(() => {` | D03a-062 |
| `worktree-list/navigation/use-reveal-requests.ts:69 :: useEffect(() => {` | D03a-065 |
| `worktree-list/navigation/use-reveal-requests.ts:206 :: useEffect(() => {` | D03a-065 |
| `worktree-list/navigation/use-reveal-requests.ts:207 :: window.addEventListener(` | D03a-065 |
| `worktree-list/navigation/use-selection.ts:79 :: useEffect(() => {` | D03a-060 |
| `worktree-list/navigation/use-selection.ts:94 :: document.addEventListener('pointerdown', clearSelectionOutsideSidebar,` | D03a-060 |
| `worktree-list/viewport/use-scroll-suppression.ts:69 :: useEffect(() => {` | D03a-098 |
| `worktree-list/viewport/use-scroll-suppression.ts:75 :: window.addEventListener(SUPPRESS_WORKTREE_LIST_SCROLL_ADJUSTMENT_EVENT` | D03a-098 |
| `worktree-list/viewport/use-scroll-to-top.ts:122 :: useEffect(() => {` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.ts:198 :: scrollElement.addEventListener('wheel', onWheel, { passive: true })` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.ts:199 :: scrollElement.addEventListener('scroll', onScroll, { passive: true })` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.ts:200 :: scrollElement.addEventListener('pointerdown', onPointerDown, { passive` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.ts:201 :: window.addEventListener('pointerup', onPointerEnd, { passive: true })` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.ts:202 :: window.addEventListener('pointercancel', onPointerEnd, { passive: true` | D03a-095 |
| `worktree-list/viewport/use-visible-review-refresh.ts:12 :: document.addEventListener('visibilitychange', onChange)` | D03a-100 |
| `worktree-list/viewport/use-visible-review-refresh.ts:49 :: useEffect(` | D03a-100 |
| `worktree-list/viewport/use-visible-review-refresh.ts:62 :: useEffect(() => {` | D03a-100 |

### Símbolos de backend/preload → id (1)

| entrada | id |
|---|---|
| `window.api.ui.writeClipboardText` | D03a-075 |

### Casos de teste → id (250)

| entrada | id |
|---|---|
| `worktree-list/drag/pointer-flush.test.ts:107 :: combined nesting and animated reordering` | D03a-005 |
| `worktree-list/drag/pointer-flush.test.ts:108 :: lets the pointer cross an edge into nesting without moving the destination` | D03a-005 |
| `worktree-list/drag/pointer-flush.test.ts:121 :: opens the reorder gap, holds it during nesting, then restores the edge preview` | D03a-005 |
| `worktree-list/drag/pointer-flush.test.ts:140 :: clears the old line during a new intent and stops scheduling after settling` | D03a-003 |
| `worktree-list/drag/pointer-flush.test.ts:163 :: stationary pointer autoscroll` | D03a-003 |
| `worktree-list/drag/pointer-flush.test.ts:192 :: Escape during pointer dragging` | D03a-003 |
| `worktree-list/drag/pointer-flush.test.ts:219 :: removes the preview and cancels frames without committing on pointer release` | D03a-005 |
| `worktree-list/drag/pointer-flush.test.ts:237 :: leaves other keys and Escape without a drag available to the app` | D03a-003 |
| `worktree-list/drag/pointer-flush.test.ts:250 :: removes its Escape listener on unmount` | D03a-003 |
| `worktree-list/drag/row-state.test.ts:24 :: lineage drop preview` | D03a-004 |
| `worktree-list/drag/row-state.test.ts:25 :: keeps the hovered card in place while replacing the reorder line with nesting` | D03a-005 |
| `worktree-list/drag/row-state.test.ts:35 :: repaints a target change even when the pointer stays at the same height` | D03a-004 |
| `worktree-list/drag/row-state.test.ts:42 :: clears nesting feedback when returning to a reorder edge at the same height` | D03a-005 |
| `worktree-list/drag/row-state.test.ts:52 :: clears nesting when leaving the sidebar even without pointer Y movement or offsets` | D03a-004 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:86 :: folder workspaces render under every Group by mode` | D03a-026 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:90 :: emits the folder-workspace row when groupBy is ${groupBy}` | D03a-026 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:95 :: does not duplicate the row under repo grouping` | D03a-030 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:101 :: a folder workspace can be the only member of a lane` | D03a-026 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:102 :: creates its status lane with no worktrees present` | D03a-025 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:110 :: renders in flat mode with no worktrees present` | D03a-026 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:118 :: lane assignment` | D03a-026 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:119 :: routes to the same PR lane as a worktree with no PR` | D03a-026 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:132 :: ordering` | D03a-025 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:140 :: orders by manualOrder then sortOrder under ${groupBy}` | D03a-026 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:145 :: prefers manualOrder over sortOrder under ${groupBy}` | D03a-026 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:158 :: membership is decided once, not per mode` | D03a-025 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:161 :: renders nothing when the owning project group is not visible` | D03a-025 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:166 :: renders under a non-repo mode when the owning group is visible` | D03a-025 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:171 :: keeps archived folder workspaces behaving identically in every mode` | D03a-026 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:182 :: host bookkeeping for lanes containing folder workspaces` | D03a-026 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:185 :: scopes a collapsed folder-only lane header to its host` | D03a-026 |
| `worktree-list/grouping/build-rows.folder-workspace-lanes.test.ts:216 :: gives a folder-only host an explicit empty id array` | D03a-030 |
| `worktree-list/grouping/build-rows.test.ts:23 :: getPRGroupKey` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:24 :: puts merged PRs in the done group` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:34 :: treats a matching suppressed PR as in progress` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:46 :: keeps a different PR in its review-status group` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:58 :: prefers repo-scoped PR status over stale legacy path-scoped status` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:71 :: falls back to legacy path-scoped PR status when no repo-scoped entry exists` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:81 :: uses local PR cache for a known local repo while a runtime is focused` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:95 :: uses SSH-scoped PR cache entries instead of local entries for SSH repos` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:111 :: getGroupKeyForWorktree` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:112 :: returns the all group key for the ungrouped mode` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:116 :: returns a workspace-status key only in status grouping mode` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:123 :: buildRows with pinned worktrees` | D03a-030 |
| `worktree-list/grouping/build-rows.test.ts:128 :: emits Pinned and All headers in groupBy none` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:136 :: uses worktree host ownership for pinned header host counts` | D03a-030 |
| `worktree-list/grouping/build-rows.test.ts:165 :: groups all worktrees under All in groupBy none` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:175 :: moves pinned worktrees out of the All group` | D03a-030 |
| `worktree-list/grouping/build-rows.test.ts:187 :: duplicates pinned worktrees into All when the policy allows it` | D03a-030 |
| `worktree-list/grouping/build-rows.test.ts:213 :: collapses the All group in groupBy none` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:223 :: emits status headers for unpinned matching worktrees in groupBy workspace-status` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:241 :: duplicates pinned worktrees into status groups when the policy allows it` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:266 :: moves pinned items out of regular groups in pr-status mode` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:278 :: omits empty pinned sections in groupBy workspace-status` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:289 :: collapses pinned group when in collapsedGroups` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:302 :: omits status sections when all matching worktrees are pinned` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:309 :: preserves repo display casing in group labels` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:316 :: groups folder-mode workspaces under their folder name` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:350 :: emits assigned workspace statuses as sections in groupBy workspace-status` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:359 :: uses customized workspace status labels and order` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:386 :: WorktreeList header styles` | D03a-026 |
| `worktree-list/grouping/build-rows.test.ts:387 :: does not title-case workspace group labels` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:393 :: collapses repo header actions without reserving title width` | D03a-030 |
| `worktree-list/grouping/build-rows.test.ts:407 :: resolves repo header color from project group headers only` | D03a-025 |
| `worktree-list/grouping/build-rows.test.ts:415 :: adapts projected setup rows for sidebar project grouping` | D03a-025 |
| `worktree-list/grouping/host-labels.test.ts:22 :: host worktree counts and ids` | D03a-036 |
| `worktree-list/grouping/host-labels.test.ts:23 :: reports a count equal to the length of each host id list` | D03a-036 |
| `worktree-list/grouping/host-labels.test.ts:45 :: counts a repeated host identity once` | D03a-036 |
| `worktree-list/grouping/host-labels.test.ts:57 :: returns undefined for an empty lane` | D03a-036 |
| `worktree-list/grouping/imported-rows.test.ts:76 :: imported worktree virtual rows` | D03a-033 |
| `worktree-list/grouping/imported-rows.test.ts:77 :: uses stable imported row keys and does not match worktree ids` | D03a-032 |
| `worktree-list/grouping/imported-rows.test.ts:84 :: keeps imported card rows out of worktree drag groups` | D03a-033 |
| `worktree-list/grouping/imported-rows.test.ts:95 :: indexes pinned rows for sidebar drag when they are the only rendered copy` | D03a-033 |
| `worktree-list/grouping/imported-rows.test.ts:104 :: uses natural drag metadata when pinned rows have duplicate natural copies` | D03a-033 |
| `worktree-list/grouping/imported-rows.test.ts:118 :: only allows keep-hidden actions for repo-group cards that are not forced visible` | D03a-033 |
| `worktree-list/listing/host-filtering.test.ts:49 :: WorktreeList host filtering ownership` | D03a-045 |
| `worktree-list/listing/host-filtering.test.ts:50 :: uses runtime execution host stamps before SSH/default fallbacks for project groups` | D03a-045 |
| `worktree-list/listing/host-filtering.test.ts:59 :: uses the project group runtime owner for folder workspaces in that group` | D03a-045 |
| `worktree-list/listing/host-filtering.test.ts:69 :: keeps explicit runtime group ownership when the focused runtime is the same host` | D03a-045 |
| `worktree-list/listing/host-filtering.test.ts:79 :: extracts runtime route ids for folder path status requests` | D03a-045 |
| `worktree-list/listing/host-filtering.test.ts:85 :: routes project-group path status through the owning runtime` | D03a-045 |
| `worktree-list/listing/host-filtering.test.ts:96 :: routes folder-workspace path status through its project group runtime owner` | D03a-045 |
| `worktree-list/listing/host-filtering.test.ts:108 :: forces local path status routing for local project groups while a runtime is focused` | D03a-045 |
| `worktree-list/listing/host-filtering.test.ts:119 :: forces local path status routing for SSH-owned project groups while a runtime is focused` | D03a-045 |
| `worktree-list/listing/pending-worktree-creation-keys.test.ts:17 :: selectPendingWorktreeCreationKeys` | D03a-055 |
| `worktree-list/listing/pending-worktree-creation-keys.test.ts:20 :: returns the shared frozen empty when nothing is pending` | D03a-055 |
| `worktree-list/listing/pending-worktree-creation-keys.test.ts:29 :: builds the key list once per slice identity` | D03a-055 |
| `worktree-list/listing/pending-worktree-creation-keys.test.ts:39 :: rebuilds when the slice is replaced` | D03a-055 |
| `worktree-list/listing/review-cache-inputs.test.ts:19 :: selectWorktreeListReviewCacheInputs` | D03a-056 |
| `worktree-list/listing/review-cache-inputs.test.ts:20 :: ignores cache churn for ordinary cards outside PR-status grouping` | D03a-056 |
| `worktree-list/listing/review-cache-inputs.test.ts:37 :: keeps the PR cache live for PR-status grouping` | D03a-056 |
| `worktree-list/listing/review-cache-inputs.test.ts:48 :: keeps the PR cache live for legacy folder-card review displays` | D03a-056 |
| `worktree-list/listing/review-cache-inputs.test.ts:59 :: keeps both caches live for new-style folder status displays` | D03a-056 |
| `worktree-list/listing/review-cache-inputs.test.ts:77 :: ignores both caches when folder cards hide review presentation` | D03a-056 |
| `worktree-list/listing/use-visible-worktrees.test.tsx:28 :: useVisibleSidebarWorktrees` | D03a-047 |
| `worktree-list/listing/use-visible-worktrees.test.tsx:38 :: projects both host rows through the primary sidebar pipeline` | D03a-047 |
| `worktree-list/listing/use-visible-worktrees.test.tsx:73 :: does not expand one host-filtered collision into both rows` | D03a-047 |
| `worktree-list/listing/use-visible-worktrees.test.tsx:106 :: does not rescan every worktree when a settings write leaves the focused host unchanged` | D03a-047 |
| `worktree-list/navigation/active-descendant-option.test.ts:22 :: getActiveDescendantOptionId` | D03a-066 |
| `worktree-list/navigation/active-descendant-option.test.ts:23 :: announces the active host row when workspace ids collide` | D03a-066 |
| `worktree-list/navigation/folder-reveal.test.ts:72 :: worktree list folder reveal` | D03a-070 |
| `worktree-list/navigation/folder-reveal.test.ts:73 :: resolves synthetic folder workspace ids as known sidebar worktrees` | D03a-070 |
| `worktree-list/navigation/folder-reveal.test.ts:88 :: keeps pending reveals alive for folder workspaces missing from raw git worktrees` | D03a-070 |
| `worktree-list/navigation/folder-reveal.test.ts:104 :: returns project group keys from root to nested folder workspace owner` | D03a-070 |
| `worktree-list/navigation/folder-reveal.test.ts:123 :: reveal keys under non-repo grouping` | D03a-070 |
| `worktree-list/navigation/folder-reveal.test.ts:128 :: returns the status lane key so a collapsed lane can be expanded` | D03a-070 |
| `worktree-list/navigation/folder-reveal.test.ts:139 :: returns the host key so a collapsed host can be expanded too` | D03a-070 |
| `worktree-list/navigation/folder-reveal.test.ts:148 :: still returns project-group keys under repo grouping` | D03a-070 |
| `worktree-list/navigation/render-row-lookup.folder-workspace.test.ts:37 :: host-qualified reveal lookup finds folder workspaces` | D03a-067 |
| `worktree-list/navigation/render-row-lookup.folder-workspace.test.ts:38 :: returns the folder row index instead of -1` | D03a-067 |
| `worktree-list/navigation/render-row-lookup.folder-workspace.test.ts:62 :: does not match a different folder workspace` | D03a-067 |
| `worktree-list/navigation/use-keyboard.host-identity.test.tsx:96 :: worktree keyboard cycling with a resolved active host` | D03a-058 |
| `worktree-list/navigation/use-keyboard.host-identity.test.tsx:97 :: steps to the next row when the active host resolved to local but rows are unqualified` | D03a-058 |
| `worktree-list/navigation/use-keyboard.host-identity.test.tsx:107 :: steps to the previous row when the active host resolved to local` | D03a-058 |
| `worktree-list/navigation/use-keyboard.host-identity.test.tsx:115 :: still steps normally when the active host is unqualified` | D03a-058 |
| `worktree-list/navigation/use-reveal-requests.test.tsx:103 :: revealing a filtered workspace` | D03a-065 |
| `worktree-list/navigation/use-reveal-requests.test.tsx:104 :: explains the filter reset and leaves filters intact when dismissed` | D03a-065 |
| `worktree-list/navigation/use-reveal-requests.test.tsx:115 :: delegates to the minimal filter revealer when provided` | D03a-065 |
| `worktree-list/navigation/use-reveal-requests.test.tsx:124 :: adjusts blocking filters and reveals on the original execution host only after confirmation` | D03a-065 |
| `worktree-list/navigation/use-reveal-requests.test.tsx:171 :: does not let a visible same-id workspace on another host bypass confirmation` | D03a-065 |
| `worktree-list/navigation/use-reveal-requests.test.tsx:180 :: preserves filters when the target becomes included while confirmation is open` | D03a-065 |
| `worktree-list/navigation/use-reveal-requests.test.tsx:189 :: does not apply a stale confirmation after switching workspaces` | D03a-065 |
| `worktree-list/navigation/use-selection-host-collision.test.tsx:57 :: sidebar selection host collisions` | D03a-060 |
| `worktree-list/navigation/use-selection-host-collision.test.tsx:58 :: publishes both rows as separate shortcut targets` | D03a-061 |
| `worktree-list/navigation/use-selection-host-collision.test.tsx:65 :: selects both same-id host rows independently` | D03a-060 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:24 :: FolderPathStatusIndicator` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:25 :: marks a folder missing for a declared reason` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:34 :: still renders the marker when a newer host sends an undeclared reason` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:46 :: still renders the marker when the wire carries a non-string reason` | D03a-073 |
| `worktree-list/rows/FolderPathStatusIndicator.test.tsx:56 :: renders nothing for a healthy folder` | D03a-073 |
| `worktree-list/rows/RepoScanUnavailableIndicator.test.tsx:38 :: RepoScanUnavailableIndicator` | D03a-075 |
| `worktree-list/rows/RepoScanUnavailableIndicator.test.tsx:52 :: renders nothing for an authoritative listing` | D03a-075 |
| `worktree-list/rows/RepoScanUnavailableIndicator.test.tsx:64 :: renders nothing for a non-authoritative listing that carries no reason` | D03a-075 |
| `worktree-list/rows/RepoScanUnavailableIndicator.test.tsx:79 :: marks a failed scan and re-runs it on click` | D03a-075 |
| `worktree-list/rows/indentation.test.ts:36 :: worktree list indentation` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:37 :: keeps ungrouped workspaces flush with the list` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:43 :: keeps ungrouped lineage indentation on the base tree step` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:49 :: indents workspace content one step deeper than its containing project header` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:58 :: adds lineage depth after project/group depth` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:64 :: uses compact header rhythm for folder-scanned repo worktree content` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:76 :: caps folder-scanned repo worktree surfaces before they overshoot the compact anchor` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:82 :: keeps folder workspace content one step under its owning group` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:87 :: caps folder workspace surfaces before they overshoot the compact content anchor` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:93 :: preserves legacy folder-scanned folder workspace row geometry` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:109 :: preserves legacy nested folder-scanned folder workspace row geometry` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:125 :: preserves legacy manual grouped folder workspace row geometry` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:141 :: uses comparable repo worktree geometry for experimental folder-scanned folder workspaces` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:157 :: uses comparable repo worktree geometry for experimental nested folder workspaces` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:173 :: keeps experimental manual grouped folder workspaces on normal worktree geometry` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:189 :: keeps experimental flat folder workspaces on normal worktree geometry` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:205 :: caps header indentation separately from workspace content indentation` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:209 :: aligns flat section headers with top-level project headers` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:213 :: keeps root repo cards flush but insets cards inside project groups` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:218 :: does not inset card surfaces outside grouped views` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:222 :: pulls flush card content back by the tuned inset gap` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:226 :: pulls experimental flush cards back further for the fixed status lane` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:232 :: keeps flush card content off the sidebar edge without indentation` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:237 :: derives the lineage parent-child step from the pre-refactor grouped-card anchor` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:244 :: keeps experimental lineage nested rows from accumulating global depth` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:262 :: preserves legacy nested row geometry for non-experimental cards` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:279 :: keeps each experimental lineage boundary at one immediate-parent step` | D03a-079 |
| `worktree-list/rows/indentation.test.ts:293 :: expresses lineage child wrapper width from the resolved inline offset` | D03a-079 |
| `worktree-list/rows/option-dom-host-collision.test.ts:10 :: immediate sidebar activation host identity` | D03a-081 |
| `worktree-list/rows/option-dom-host-collision.test.ts:11 :: marks only the clicked host copies active when workspace ids collide` | D03a-081 |
| `worktree-list/rows/use-project-group-dialogs-owner-host.test.tsx:88 :: project group dialogs carry the owner host` | D03a-087 |
| `worktree-list/rows/use-project-group-dialogs-owner-host.test.tsx:89 :: renames through the host that owns the group row` | D03a-087 |
| `worktree-list/rows/use-project-group-dialogs-owner-host.test.tsx:106 :: surfaces an unconfirmed-rename toast when the owner host does not answer` | D03a-087 |
| `worktree-list/rows/use-project-group-dialogs-owner-host.test.tsx:122 :: deletes through the host that owns the group row` | D03a-087 |
| `worktree-list/viewport/hard-scroll-up.test.ts:22 :: normalizeWheelDeltaY` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:23 :: keeps pixel mode and expands line/page modes` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:30 :: reduceHardScrollUpOnWheel` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:31 :: stays hidden for short lists and near-top viewports` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:54 :: does not show on gentle upward scrolling` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:67 :: shows after a sustained hard upward wheel burst` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:82 :: shows after a trackpad fling (high peak + enough total)` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:95 :: hides on significant downward scroll` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:116 :: hides after cumulative small downward wheel events` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:135 :: clears when the user reaches the top` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:156 :: reduceHardScrollUpOnScroll` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:157 :: shows when scrollbar drag velocity is hard upward` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:173 :: ignores slow scrollbar movement` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:188 :: hides after cumulative small downward scrollbar movement` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:204 :: reduceHardScrollUpOnIdle / dismiss` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:205 :: auto-hides after idle while still deep` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:229 :: hides on later non-intent scroll after the idle deadline (scroll spam must not extend)` | D03a-094 |
| `worktree-list/viewport/hard-scroll-up.test.ts:250 :: dismiss resets state` | D03a-094 |
| `worktree-list/viewport/scroll-adjustment.test.ts:49 :: shouldAdjustWorktreeSidebarMeasuredRowScroll` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:50 :: counts record keys once per object reference` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:65 :: suppresses measured-row scroll correction while TanStack is scrolling` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:75 :: suppresses measured-row scroll correction during direct scroll input grace period` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:85 :: allows measured-row scroll correction after direct scrolling settles` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:95 :: keeps pending reveal requests when the worktree still exists but the row is unresolved` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:104 :: clears pending reveal requests once the target disappears` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:113 :: scrolls and clears once the target row is resolvable` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:123 :: getScrollTopToRevealBounds` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:124 :: treats the sticky header as occluding the viewport top` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:139 :: includes extra reveal clearance for the highlight ring` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:154 :: does not scroll when the bounds are below the sticky header` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:169 :: keeps the viewport bottom independent of the sticky header inset` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:185 :: extractWorktreeVirtualRowIndexes` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:186 :: extracts the active and previous sticky headers with the visible range` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:195 :: falls back to the default range when no sticky header is active` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:205 :: estimateRenderRowSize` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:206 :: keeps secondary group header size stable while it is the active sticky header` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:222 :: estimates imported worktree line rows with a stable compact height` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:228 :: keeps the previous header active until the secondary header row reaches the top` | D03a-098 |
| `worktree-list/viewport/scroll-adjustment.test.ts:239 :: activates a secondary header as soon as its row reaches the top (no spacer dead zone)` | D03a-098 |
| `worktree-list/viewport/sticky-headers.test.ts:64 :: getStickyHeaderIndexes` | D03a-101 |
| `worktree-list/viewport/sticky-headers.test.ts:65 :: keeps nested project rows from replacing their top-level project group header` | D03a-101 |
| `worktree-list/viewport/sticky-headers.test.ts:76 :: uses the real project-group hierarchy when choosing sticky headers` | D03a-101 |
| `worktree-list/viewport/use-row-removal-animation.test.ts:19 :: buildVirtualRowRemovalMotions` | D03a-097 |
| `worktree-list/viewport/use-row-removal-animation.test.ts:20 :: moves surviving rows from their pre-delete viewport positions` | D03a-097 |
| `worktree-list/viewport/use-row-removal-animation.test.ts:45 :: does not double-move rows when anchor restoration offsets a deletion above the viewport` | D03a-097 |
| `worktree-list/viewport/use-row-removal-animation.test.ts:63 :: follows a surviving row through a lineage rekey` | D03a-097 |
| `worktree-list/viewport/use-row-removal-animation.test.ts:81 :: ignores additions and measurement-only movement` | D03a-097 |
| `worktree-list/viewport/use-scroll-to-top.test.ts:48 :: useWorktreeListScrollToTop` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.test.ts:61 :: shows on a hard upward wheel gesture and hides on the idle deadline` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.test.ts:72 :: does not extend the idle deadline on non-intent scroll noise` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.test.ts:95 :: re-arms the idle timer when intent is refreshed` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.test.ts:111 :: suppresses detection for the post-jump window after scrollToTop` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.test.ts:138 :: force-hides when the list stops being scrollable, even mid-gesture` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.test.ts:156 :: clears the timer and detaches listeners when the scroll element goes away` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.test.tsx:38 :: useWorktreeListScrollToTop` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.test.tsx:39 :: ignores fast programmatic scrolling` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.test.tsx:58 :: detects velocity while the scrollbar is actively dragged` | D03a-095 |
| `worktree-list/viewport/use-scroll-to-top.test.tsx:80 :: returns focus to the list after jumping to the top` | D03a-095 |
| `worktree-list/viewport/virtual-rows.test.ts:62 :: getRenderRowKey` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:63 :: scopes repeated group headers to their host section` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:72 :: preserves unsectioned group header keys` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:79 :: getActiveStickyIndexesForScroll` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:80 :: pins the host and its inner group while scrolled inside a section` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:92 :: hands the host tier off when the next host card reaches the top` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:104 :: never pins the previous host group beneath the next host card` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:117 :: offsets the group handoff by the pinned host height` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:138 :: degrades to single-tier rules when no host sections exist` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:158 :: does not pin a Project header whose virtual item is not mounted yet (#10088)` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:175 :: keeps the previous mounted Project sticky when the next group is unmounted` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:198 :: extractWorktreeVirtualRowIndexes` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:199 :: keeps the pinned host mounted even when scrolled out of range` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:215 :: buildLineageRowRekeyMap` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:241 :: folds every lineage-group member onto the group key` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:253 :: dissolves a group key back onto the plain item row` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:261 :: round-trips the fold and dissolve directions for the same worktree` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:268 :: keeps the same worktree distinct across sections` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:289 :: contributes nothing for non-lineage row types` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:296 :: is empty for an empty row list` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:301 :: pruneStaleVirtualRowElementCache` | D03a-101 |
| `worktree-list/viewport/virtual-rows.test.ts:302 :: removes stale measured row elements before they retain old WorktreeCard scopes` | D03a-101 |
| `worktree-list/viewport/visible-refresh.test.ts:4 :: installWorktreeVisibleRefreshVisibilityListener` | D03a-100 |
| `worktree-list/viewport/visible-refresh.test.ts:10 :: subscribes to document visibility changes so visible PR refresh can rerun on return` | D03a-100 |

## Dependências renderizadas pelo módulo mas definidas fora dele (não enumeradas aqui)

Estes componentes são instanciados por arquivos deste domínio e têm seus próprios itens de menu/estados; a enumeração de labels deles pertence aos domínios que cobrem `components/sidebar/*` (fora do manifest D03a):

| componente (fora do manifest) | quem renderiza (evidência) |
|---|---|
| `components/sidebar/HostSectionHeaderMenu.tsx` | `rows/HostSectionHeader.tsx:156` |
| `components/sidebar/ProjectGroupNameDialog.tsx` | `rows/ProjectGroupDialogs.tsx:34` |
| `components/sidebar/ProjectGroupDeleteDialog.tsx` | `rows/ProjectGroupDialogs.tsx:98` |
| `components/sidebar/SuppressExternalWorktreeInboxDialog.tsx` | `rows/ProjectGroupDialogs.tsx:67` |
| `components/sidebar/ImportedWorktreesVisibilityLine.tsx` | `rows/notice-rows.tsx:63` |
| `components/sidebar/NewExternalWorktreesInboxLine.tsx` | `rows/notice-rows.tsx:97` |
| `components/sidebar/PendingWorktreeRow.tsx` | `rows/notice-rows.tsx:123` |
| `components/sidebar/WorktreeListScrollToTopButton.tsx` | `viewport/VirtualizedWorktreeViewport.tsx:370` |
| `components/sidebar/WorktreeSidebarDropIndicator.tsx` | `viewport/drop-indicators.tsx:16` |
| `components/sidebar/ProjectHeaderActions.tsx` | `rows/SectionHeader.tsx:343` |
| `components/sidebar/WorktreeCard.tsx` | `rows/item-row.tsx:187`, `rows/folder-row.tsx:112` |

Cross-refs de módulo (lógica proprietária fora do domínio) usadas pelas linhas: `workspace-kanban-sidebar-drop`, `worktree-manual-order`, `worktree-drag-units`, `worktree-sidebar-drop-preview`, `worktree-lineage-*`, `worktree-sidebar-drag-*`, `worktree-keyboard-cycle`, `worktree-sidebar-reveal*`, `host-header-drag`, `project-header-drag/drop`, `project-group-header-drag/drop`, `visible-worktrees`, `smart-sort`, `smart-attention`, `folder-workspace-path-status*`, `worktree-visibility-defaults-by-host`, `worktree-lineage-toggle-handler-cache`, `repository-settings-targets`, `Keybindings store`, `useVirtualizedScrollAnchor`.
