# Parede de Evidência — Domínio D06-drag-order-keyboard (Drag & Drop, Reordenação Manual, Multi-seleção, Parent Picker e Navegação por Teclado)

## Contagens de Cobertura
- **arquivos**: 22/22 (100%)
- **símbolos**: 93/93 (100%)
- **testes**: 179/179 (100%)
- **labels**: 2/2 (100%)
- **hotkeys**: 8/8 (100%)
- **prefs**: 0/0 (100%)
- **timers**: 1/1 (100%)
- **subs**: 4/4 (100%)
- **preload**: 0/0 (100%)

---

## Itens com Justificativa Especial (INFRA / N/A / DUP)

| Categoria | Entrada | Justificativa |
|---|---|---|
| hotkeys | `components/sidebar/WorktreeParentPickerPopover.test.ts:225 :: } as unknown as React.KeyboardEvent<HTMLInputElement>,` | `INFRA: test keyboard event cast in WorktreeParentPickerPopover test` |
| labels | `components/sidebar/worktree-keyboard-cycle.test.ts:142 :: label: 'This computer',` | `INFRA: fixture label helper in keyboard cycle test` |
| tests | `components/sidebar/WorktreeParentPickerPopover.test.ts:104 :: getWorktreeParentPickerItemValue` | `INFRA: describe suite header for getWorktreeParentPickerItemValue` |
| tests | `components/sidebar/WorktreeParentPickerPopover.test.ts:112 :: filterWorktreeParentCandidates` | `INFRA: describe suite header for filterWorktreeParentCandidates` |
| tests | `components/sidebar/WorktreeParentPickerPopover.test.ts:136 :: estimateWorktreeParentPickerHeight` | `INFRA: describe suite header for estimateWorktreeParentPickerHeight` |
| tests | `components/sidebar/WorktreeParentPickerPopover.test.ts:149 :: clampWorktreeParentPickerAnchorTop` | `INFRA: describe suite header for clampWorktreeParentPickerAnchorTop` |
| tests | `components/sidebar/WorktreeParentPickerPopover.test.ts:167 :: clampWorktreeParentPickerIndex` | `INFRA: describe suite header for clampWorktreeParentPickerIndex` |
| tests | `components/sidebar/WorktreeParentPickerPopover.test.ts:179 :: getWorktreeParentPickerFocusRestoreTarget` | `INFRA: describe suite header for getWorktreeParentPickerFocusRestoreTarget` |
| tests | `components/sidebar/WorktreeParentPickerPopover.test.ts:209 :: parent picker keyboard input` | `INFRA: describe suite header for parent picker keyboard input` |
| tests | `components/sidebar/WorktreeParentPickerPopover.test.ts:49 :: selectWorktreeParent` | `INFRA: describe suite header for selectWorktreeParent` |
| tests | `components/sidebar/worktree-drag-units.test.ts:114 :: getFullDropIndexForWorktreeDragUnit` | `INFRA: describe suite header for getFullDropIndexForWorktreeDragUnit` |
| tests | `components/sidebar/worktree-drag-units.test.ts:23 :: getWorktreeDragUnitGroups` | `INFRA: describe suite header for getWorktreeDragUnitGroups` |
| tests | `components/sidebar/worktree-keyboard-cycle.test.ts:11 :: resolveCycledWorktreeId` | `INFRA: describe suite header for resolveCycledWorktreeId` |
| tests | `components/sidebar/worktree-keyboard-cycle.test.ts:155 :: WorktreeList keyboard cycling` | `INFRA: describe suite header for WorktreeList keyboard cycling` |
| tests | `components/sidebar/worktree-keyboard-cycle.test.ts:54 :: getCyclableWorktreeIds` | `INFRA: describe suite header for getCyclableWorktreeIds` |
| tests | `components/sidebar/worktree-manual-order-catalog.test.ts:30 :: buildWorktreeManualOrderCatalog` | `INFRA: describe suite header for buildWorktreeManualOrderCatalog` |
| tests | `components/sidebar/worktree-manual-order-store-write.test.ts:60 :: sidebar manual-order drop` | `INFRA: describe suite header for sidebar manual-order drop` |
| tests | `components/sidebar/worktree-manual-order.test.ts:12 :: buildSparseManualOrderUpdates durable migration` | `INFRA: describe suite header for buildSparseManualOrderUpdates durable migration` |
| tests | `components/sidebar/worktree-manual-order.test.ts:163 :: moveWorktreeIdsWithinGroup` | `INFRA: describe suite header for moveWorktreeIdsWithinGroup` |
| tests | `components/sidebar/worktree-manual-order.test.ts:192 :: buildWorktreeDragPreviewOffsets` | `INFRA: describe suite header for buildWorktreeDragPreviewOffsets` |
| tests | `components/sidebar/worktree-manual-order.test.ts:353 :: buildManualOrderUpdatesForVisibleGroups` | `INFRA: describe suite header for buildManualOrderUpdatesForVisibleGroups` |
| tests | `components/sidebar/worktree-manual-order.test.ts:457 :: buildManualOrderUpdatesForGroupDrop` | `INFRA: describe suite header for buildManualOrderUpdatesForGroupDrop` |
| tests | `components/sidebar/worktree-manual-order.test.ts:535 :: shouldWriteManualOrderForGroupDrop` | `INFRA: describe suite header for shouldWriteManualOrderForGroupDrop` |
| tests | `components/sidebar/worktree-manual-order.test.ts:95 :: expandDraggedWorktreeIdsForVisibleLineage` | `INFRA: describe suite header for expandDraggedWorktreeIdsForVisibleLineage` |
| tests | `components/sidebar/worktree-multi-selection.test.ts:11 :: worktree multi selection` | `INFRA: describe suite header for worktree multi selection` |
| tests | `components/sidebar/worktree-parent-eligibility.test.ts:57 :: canAssignWorktreeParent` | `INFRA: describe suite header for canAssignWorktreeParent` |
| tests | `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:113 :: getWorktreeSidebarDragRectsForGroup` | `INFRA: describe suite header for getWorktreeSidebarDragRectsForGroup` |
| tests | `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:140 :: refreshWorktreeSidebarDragSession` | `INFRA: describe suite header for refreshWorktreeSidebarDragSession` |
| tests | `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:29 :: getWorktreeSidebarDragAutoscroll` | `INFRA: describe suite header for getWorktreeSidebarDragAutoscroll` |
| tests | `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:65 :: getWorktreeSidebarBoundaryDrop` | `INFRA: describe suite header for getWorktreeSidebarBoundaryDrop` |
| tests | `components/sidebar/worktree-sidebar-drag-geometry.test.ts:207 :: grab-relative hit testing` | `INFRA: describe suite header for grab-relative hit testing` |
| tests | `components/sidebar/worktree-sidebar-drag-geometry.test.ts:81 :: worktree sidebar drag geometry under mid-drag card growth` | `INFRA: describe suite header for worktree sidebar drag geometry under mid-drag card growth` |
| tests | `components/sidebar/worktree-sidebar-pointer-drag-dom.test.ts:6 :: worktree sidebar pointer drag DOM guards` | `INFRA: describe suite header for worktree sidebar pointer drag DOM guards` |
| tests | `components/sidebar/worktree-sidebar-reveal-scroll-settle.test.ts:8 :: isRevealScrollSettling` | `INFRA: describe suite header for isRevealScrollSettling` |
| tests | `components/sidebar/worktree-sidebar-reveal.test.ts:22 :: revealElementInScrollContainer` | `INFRA: describe suite header for revealElementInScrollContainer` |
| tests | `components/sidebar/worktree-sidebar-row-preference.test.ts:83 :: getRenderedWorktreesInSidebarOrder` | `INFRA: describe suite header for getRenderedWorktreesInSidebarOrder` |
| tests | `components/sidebar/worktree-unnest.test.ts:9 :: unnestWorktrees` | `INFRA: describe suite header for unnestWorktrees` |
| tests | `components/sidebar/worktree-visibility-source-provenance.test.ts:115 :: getWorktreeVisibilitySourceNote` | `INFRA: describe suite header for getWorktreeVisibilitySourceNote` |
| tests | `components/sidebar/worktree-visibility-source-provenance.test.ts:47 :: listInheritedWorktreeVisibilitySources` | `INFRA: describe suite header for listInheritedWorktreeVisibilitySources` |
| tests | `components/sidebar/worktree-visibility-source-provenance.test.ts:86 :: getWorktreeVisibilityOverrideNotice` | `INFRA: describe suite header for getWorktreeVisibilityOverrideNotice` |

---

## 1. Arquivos Produtivos (`files`)

| Arquivo Produtivo | Linhas de Inventário Associadas |
|---|---|
| `WorktreeParentPickerPopover.tsx` | `D06-025`, `D06-026`, `D06-027`, `D06-028`, `D06-029` |
| `WorktreeParentPickerRow.tsx` | `D06-029` |
| `workspace-status-drag-data.ts` | `D06-001`, `D06-002` |
| `worktree-drag-preview-offsets.ts` | `D06-015` |
| `worktree-drag-units.ts` | `D06-013`, `D06-014` |
| `worktree-keyboard-cycle.ts` | `D06-031` |
| `worktree-manual-order-catalog.ts` | `D06-020` |
| `worktree-manual-order-ranks.ts` | `D06-018` |
| `worktree-manual-order.ts` | `D06-016`, `D06-017`, `D06-019` |
| `worktree-multi-selection.ts` | `D06-021`, `D06-022`, `D06-023` |
| `worktree-parent-candidates.ts` | `D06-024` |
| `worktree-parent-eligibility.ts` | `D06-024` |
| `worktree-parent-picker-filtering.ts` | `D06-026` |
| `worktree-parent-picker-placement.ts` | `D06-025` |
| `worktree-sidebar-drag-autoscroll.ts` | `D06-009`, `D06-010`, `D06-011`, `D06-012` |
| `worktree-sidebar-drag-geometry.ts` | `D06-007`, `D06-008` |
| `worktree-sidebar-pointer-drag-dom.ts` | `D06-003`, `D06-004`, `D06-005`, `D06-006` |
| `worktree-sidebar-reveal-scroll-settle.ts` | `D06-034` |
| `worktree-sidebar-reveal.ts` | `D06-033` |
| `worktree-sidebar-row-preference.ts` | `D06-031`, `D06-032` |
| `worktree-unnest.ts` | `D06-030` |
| `worktree-visibility-source-provenance.ts` | `D06-035` |

---

## 2. Símbolos Exportados (`symbols`)

| Símbolo Exportado | Linhas de Inventário / Justificativa |
|---|---|
| `PICKER_LIST_MAX_HEIGHT` | `D06-025` |
| `PICKER_ROW_HEIGHT` | `D06-025` |
| `PICKER_ROW_OVERSCAN` | `D06-025` |
| `PICKER_VIEWPORT_PADDING` | `D06-025` |
| `PendingRevealScroll` | `D06-034` |
| `REVEAL_SCROLL_SETTLE_TIMEOUT_MS` | `D06-034` |
| `WORKSPACE_STATUS_DRAG_IDS_TYPE` | `D06-001` |
| `WORKSPACE_STATUS_DRAG_ID_MAX_COUNT` | `D06-002` |
| `WORKSPACE_STATUS_DRAG_PAYLOAD_MAX_BYTES` | `D06-002` |
| `WORKSPACE_STATUS_DRAG_TYPE` | `D06-001` |
| `WORKTREE_SIDEBAR_REVEAL_TOP_INSET` | `D06-033` |
| `WorktreeAreaSelectionResult` | `D06-023` |
| `WorktreeDragGroup` | `D06-016` |
| `WorktreeDragLineageRow` | `D06-016` |
| `WorktreeDragPreviewLayout` | `D06-015` |
| `WorktreeDragPreviewRect` | `D06-015` |
| `WorktreeDragUnitGroup` | `D06-013` |
| `WorktreeManualOrderCatalog` | `D06-020` |
| `WorktreeManualOrderUpdate` | `D06-018` |
| `WorktreeParentPickerPopover` | `D06-025`, `D06-026`, `D06-027`, `D06-028` |
| `WorktreeParentPickerRow` | `D06-029` |
| `WorktreeSelectionIntent` | `D06-021` |
| `WorktreeSelectionResult` | `D06-022` |
| `WorktreeSidebarAutoscrollResult` | `D06-009` |
| `WorktreeSidebarBoundaryDropResult` | `D06-010` |
| `WorktreeSidebarDragGrab` | `D06-007` |
| `WorktreeSidebarDragPoint` | `D06-009` |
| `WorktreeSidebarDragRect` | `D06-011` |
| `WorktreeSidebarDragSession` | `D06-012` |
| `WorktreeSidebarDropAnchor` | `D06-008` |
| `WorktreeVisibilitySourceProvenance` | `D06-035` |
| `areWorktreeSelectionsEqual` | `D06-023` |
| `buildManualOrderUpdatesForGroupDrop` | `D06-019` |
| `buildManualOrderUpdatesForVisibleGroups` | `D06-019` |
| `buildSparseManualOrderUpdates` | `D06-018` |
| `buildWorktreeDragPreviewOffsets` | `D06-015` |
| `buildWorktreeManualOrderCatalog` | `D06-020` |
| `canAssignWorktreeParent` | `D06-024` |
| `clampWorktreeParentPickerAnchorTop` | `D06-025` |
| `clampWorktreeParentPickerIndex` | `D06-026` |
| `createPendingRevealScroll` | `D06-034` |
| `createSidebarDragPreview` | `D06-005` |
| `estimateWorktreeParentPickerHeight` | `D06-025` |
| `expandDraggedWorktreeIdsForVisibleLineage` | `D06-016` |
| `filterWorktreeParentCandidates` | `D06-026` |
| `getCyclableRowIdentity` | `D06-031` |
| `getCyclableWorktreeIds` | `D06-031` |
| `getCyclableWorktreeRows` | `D06-031` |
| `getCyclableWorktrees` | `D06-031` |
| `getEligibleWorktreeParents` | `D06-024` |
| `getFullDropIndexForWorktreeDragUnit` | `D06-014` |
| `getPreferredWorktreeRows` | `D06-031`, `D06-032` |
| `getRenderedWorktreesInSidebarOrder` | `D06-032` |
| `getScrollTopToRevealBounds` | `D06-033` |
| `getWorktreeDragUnitGroups` | `D06-013` |
| `getWorktreeParentPickerFocusRestoreTarget` | `D06-027` |
| `getWorktreeParentPickerItemValue` | `D06-026` |
| `getWorktreeSelectionIntent` | `D06-021` |
| `getWorktreeSidebarBoundaryDrop` | `D06-010` |
| `getWorktreeSidebarDragAutoscroll` | `D06-009` |
| `getWorktreeSidebarDragGrab` | `D06-007` |
| `getWorktreeSidebarDragRectsForGroup` | `D06-011` |
| `getWorktreeSidebarDragReferenceY` | `D06-007` |
| `getWorktreeSidebarDropAnchorId` | `D06-008` |
| `getWorktreeVisibilityOverrideNotice` | `D06-035` |
| `getWorktreeVisibilitySourceNote` | `D06-035` |
| `getWorktreeVisibilitySourceProvenance` | `D06-035` |
| `globalWorktreeVisibilitySourceValue` | `D06-035` |
| `handleWorktreeParentPickerKeyDown` | `D06-027` |
| `hasWorkspaceDragData` | `D06-002` |
| `isEligibleWorktreeParent` | `D06-024` |
| `isRevealScrollSettling` | `D06-034` |
| `isSidebarPointerDragBlocked` | `D06-003` |
| `listInheritedWorktreeVisibilitySources` | `D06-035` |
| `moveWorktreeIdsWithinGroup` | `D06-017` |
| `pruneWorktreeSelection` | `D06-023` |
| `readWorkspaceDragData` | `D06-002` |
| `readWorkspaceDragDataIds` | `D06-002` |
| `refreshWorktreeSidebarDragSession` | `D06-012` |
| `resolveActiveCycleIdentity` | `D06-031` |
| `resolveCycledWorktreeId` | `D06-031` |
| `resolveWorktreeSidebarDropAnchorIndex` | `D06-008` |
| `revealElementInScrollContainer` | `D06-033` |
| `selectWorktreeParent` | `D06-028` |
| `setSidebarPointerDragDocumentStyles` | `D06-004` |
| `shouldReevaluateWorktreeSidebarDropAnchor` | `D06-008` |
| `shouldWriteManualOrderForGroupDrop` | `D06-019` |
| `unnestWorktrees` | `D06-030` |
| `updateSidebarDragPreviewPosition` | `D06-006` |
| `updateWorktreeAreaSelection` | `D06-023` |
| `updateWorktreeSelection` | `D06-022` |
| `worktreeVisibilityValueLabel` | `D06-035` |
| `writeWorkspaceDragData` | `D06-001` |

---

## 3. Testes Automatizados (`tests`)

| Caso de Teste | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/WorktreeParentPickerPopover.test.ts:104 :: getWorktreeParentPickerItemValue` | `INFRA: describe suite header for getWorktreeParentPickerItemValue` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:105 :: includes workspace-facing fields used by command filtering` | `D06-026` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:112 :: filterWorktreeParentCandidates` | `INFRA: describe suite header for filterWorktreeParentCandidates` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:121 :: returns every candidate when the search is blank` | `D06-026` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:125 :: drops non-matching candidates and ranks the closest match first` | `D06-026` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:130 :: matches on branch and path, not just display name` | `D06-026` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:136 :: estimateWorktreeParentPickerHeight` | `INFRA: describe suite header for estimateWorktreeParentPickerHeight` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:137 :: grows with the candidate count up to the list cap` | `D06-025` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:144 :: reserves a single row when nothing is eligible` | `D06-025` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:149 :: clampWorktreeParentPickerAnchorTop` | `INFRA: describe suite header for clampWorktreeParentPickerAnchorTop` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:150 :: leaves an anchor that already fits where it is` | `D06-025` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:154 :: lifts an anchor whose popover would run off the bottom` | `D06-025` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:158 :: keeps an anchor above the window from riding off the top` | `D06-025` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:162 :: pins to the top padding when the window is shorter than the popover` | `D06-025` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:167 :: clampWorktreeParentPickerIndex` | `INFRA: describe suite header for clampWorktreeParentPickerIndex` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:168 :: keeps the highlight inside the filtered result window` | `D06-026` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:174 :: collapses to zero when nothing matches` | `D06-026` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:179 :: getWorktreeParentPickerFocusRestoreTarget` | `INFRA: describe suite header for getWorktreeParentPickerFocusRestoreTarget` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:194 :: restores focus to the focusable container of the anchored row` | `D06-027` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:201 :: skips a row whose sidebar was already unmounted or never anchored` | `D06-027` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:209 :: parent picker keyboard input` | `INFRA: describe suite header for parent picker keyboard input` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:49 :: selectWorktreeParent` | `INFRA: describe suite header for selectWorktreeParent` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:50 :: closes and assigns the selected parent to the captured child` | `D06-028` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:68 :: shows sanitized failure copy after closing the picker` | `D06-028` |
| `components/sidebar/WorktreeParentPickerPopover.test.ts:87 :: does nothing without a captured child id` | `D06-028` |
| `components/sidebar/worktree-drag-units.test.ts:114 :: getFullDropIndexForWorktreeDragUnit` | `INFRA: describe suite header for getFullDropIndexForWorktreeDragUnit` |
| `components/sidebar/worktree-drag-units.test.ts:115 :: maps visual unit drop indexes back to full row indexes` | `D06-014` |
| `components/sidebar/worktree-drag-units.test.ts:23 :: getWorktreeDragUnitGroups` | `INFRA: describe suite header for getWorktreeDragUnitGroups` |
| `components/sidebar/worktree-drag-units.test.ts:24 :: treats expanded lineage descendants as part of the parent drag unit` | `D06-013` |
| `components/sidebar/worktree-drag-units.test.ts:45 :: ignores imported worktree card rows without splitting drag groups` | `D06-013` |
| `components/sidebar/worktree-drag-units.test.ts:73 :: includes pinned rows when they are the only rendered copy` | `D06-013` |
| `components/sidebar/worktree-drag-units.test.ts:92 :: uses natural drag units when pinned rows have duplicate natural copies` | `D06-013` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:11 :: resolveCycledWorktreeId` | `INFRA: describe suite header for resolveCycledWorktreeId` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:115 :: leaves folder workspaces out of the rotation` | `D06-031` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:133 :: drops worktrees the sidebar elided inside a collapsed host section` | `D06-031` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:14 :: steps to the next and previous worktree` | `D06-031` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:155 :: WorktreeList keyboard cycling` | `INFRA: describe suite header for WorktreeList keyboard cycling` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:156 :: cycles over the rendered rows instead of rebuilding a parallel layout` | `D06-031` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:23 :: wraps around at both ends` | `D06-031` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:32 :: enters from the matching end when the active worktree is not cyclable` | `D06-031` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:47 :: has nothing to cycle to when every group is collapsed` | `D06-031` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:54 :: getCyclableWorktreeIds` | `INFRA: describe suite header for getCyclableWorktreeIds` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:78 :: keeps a pinned worktree cyclable when only its natural group is collapsed` | `D06-031` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:86 :: counts a duplicated pinned worktree once` | `D06-031` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:96 :: keeps same-id rows on different hosts independently cyclable` | `D06-031` |
| `components/sidebar/worktree-manual-order-catalog.test.ts:30 :: buildWorktreeManualOrderCatalog` | `INFRA: describe suite header for buildWorktreeManualOrderCatalog` |
| `components/sidebar/worktree-manual-order-catalog.test.ts:31 :: includes filtered-capable git and folder rows in fallback order` | `D06-020` |
| `components/sidebar/worktree-manual-order-catalog.test.ts:41 :: treats a same-id host cluster as durable only when every owner agrees` | `D06-020` |
| `components/sidebar/worktree-manual-order-store-write.test.ts:60 :: sidebar manual-order drop` | `INFRA: describe suite header for sidebar manual-order drop` |
| `components/sidebar/worktree-manual-order-store-write.test.ts:72 :: moves the dragged row past its neighbor in the store` | `D06-019` |
| `components/sidebar/worktree-manual-order-store-write.test.ts:95 :: leaves the order alone when the drop lands where the row already is` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:110 :: keeps unrelated selected rows in visual order` | `D06-016` |
| `components/sidebar/worktree-manual-order.test.ts:12 :: buildSparseManualOrderUpdates durable migration` | `INFRA: describe suite header for buildSparseManualOrderUpdates durable migration` |
| `components/sidebar/worktree-manual-order.test.ts:125 :: keeps ancestor coverage when a nested descendant is selected too` | `D06-016` |
| `components/sidebar/worktree-manual-order.test.ts:13 :: materializes filtered rows when the first drag creates Manual order` | `D06-018` |
| `components/sidebar/worktree-manual-order.test.ts:139 :: restarts coverage for a later selected sibling after the previous run ends` | `D06-016` |
| `components/sidebar/worktree-manual-order.test.ts:153 :: emits each absent selected id once` | `D06-016` |
| `components/sidebar/worktree-manual-order.test.ts:163 :: moveWorktreeIdsWithinGroup` | `INFRA: describe suite header for moveWorktreeIdsWithinGroup` |
| `components/sidebar/worktree-manual-order.test.ts:164 :: moves a worktree down using the original drop index` | `D06-017` |
| `components/sidebar/worktree-manual-order.test.ts:168 :: moves a worktree up` | `D06-017` |
| `components/sidebar/worktree-manual-order.test.ts:172 :: preserves selected order for multi-drag batches` | `D06-017` |
| `components/sidebar/worktree-manual-order.test.ts:181 :: moves a very large selected batch without overflowing argument limits` | `D06-017` |
| `components/sidebar/worktree-manual-order.test.ts:192 :: buildWorktreeDragPreviewOffsets` | `INFRA: describe suite header for buildWorktreeDragPreviewOffsets` |
| `components/sidebar/worktree-manual-order.test.ts:193 :: slides intervening rows up while dragging a row down` | `D06-015` |
| `components/sidebar/worktree-manual-order.test.ts:212 :: keeps downward offsets stable after virtualization unmounts the leading rows` | `D06-015` |
| `components/sidebar/worktree-manual-order.test.ts:234 :: slides intervening rows down while dragging a row up` | `D06-015` |
| `components/sidebar/worktree-manual-order.test.ts:252 :: returns no preview offsets for a no-op hover` | `D06-015` |
| `components/sidebar/worktree-manual-order.test.ts:266 :: uses the dragged unit height when previewing variable-height rows` | `D06-015` |
| `components/sidebar/worktree-manual-order.test.ts:280 :: uses the dragged unit height when previewing a short row above a tall row` | `D06-015` |
| `components/sidebar/worktree-manual-order.test.ts:294 :: reserves one card-height slot while previewing a multi-select batch` | `D06-015` |
| `components/sidebar/worktree-manual-order.test.ts:316 :: uses the grabbed selected card as the one preview placeholder` | `D06-015` |
| `components/sidebar/worktree-manual-order.test.ts:32 :: keeps sparse updates after every known row has a durable rank` | `D06-018` |
| `components/sidebar/worktree-manual-order.test.ts:334 :: returns no preview offsets for a no-op multi-select hover` | `D06-015` |
| `components/sidebar/worktree-manual-order.test.ts:353 :: buildManualOrderUpdatesForVisibleGroups` | `INFRA: describe suite header for buildManualOrderUpdatesForVisibleGroups` |
| `components/sidebar/worktree-manual-order.test.ts:354 :: updates every visible workspace order while only moving the source group` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:377 :: returns no updates for a no-op drop` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:391 :: only updates moved rows when current ranks leave room` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:411 :: moves an expanded lineage cluster as one ranked unit` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:433 :: reorders a very large visible group without overflowing argument limits` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:457 :: buildManualOrderUpdatesForGroupDrop` | `INFRA: describe suite header for buildManualOrderUpdatesForGroupDrop` |
| `components/sidebar/worktree-manual-order.test.ts:458 :: moves a selected batch across groups and stamps visible manual order` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:481 :: keeps visual order for multi-select batches spanning groups` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:49 :: never drops known rows when a stale visible sequence contains unknowns or duplicates` | `D06-018` |
| `components/sidebar/worktree-manual-order.test.ts:497 :: returns no updates for a no-op same-group drop` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:511 :: uses sparse moved-row ranks for cross-lane manual drops` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:535 :: shouldWriteManualOrderForGroupDrop` | `INFRA: describe suite header for shouldWriteManualOrderForGroupDrop` |
| `components/sidebar/worktree-manual-order.test.ts:536 :: writes order for any lane drop while Manual sort is active` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:546 :: writes order for same-lane drops outside Manual sort` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:556 :: keeps cross-lane drops status-only outside Manual sort` | `D06-019` |
| `components/sidebar/worktree-manual-order.test.ts:61 :: preserves hidden rows when dense ranks require a full reindex` | `D06-018` |
| `components/sidebar/worktree-manual-order.test.ts:78 :: preserves hidden rows when a stale neighbor requires a full reindex` | `D06-018` |
| `components/sidebar/worktree-manual-order.test.ts:95 :: expandDraggedWorktreeIdsForVisibleLineage` | `INFRA: describe suite header for expandDraggedWorktreeIdsForVisibleLineage` |
| `components/sidebar/worktree-manual-order.test.ts:96 :: expands an expanded lineage parent to its visible descendants for reordering` | `D06-016` |
| `components/sidebar/worktree-multi-selection.test.ts:109 :: does not clear the existing batch for an empty additive area` | `D06-023` |
| `components/sidebar/worktree-multi-selection.test.ts:11 :: worktree multi selection` | `INFRA: describe suite header for worktree multi selection` |
| `components/sidebar/worktree-multi-selection.test.ts:12 :: uses Cmd on Mac and Ctrl elsewhere for toggle selection` | `D06-021` |
| `components/sidebar/worktree-multi-selection.test.ts:122 :: clears the existing batch for an empty non-additive area` | `D06-023` |
| `components/sidebar/worktree-multi-selection.test.ts:24 :: replaces selection on plain click` | `D06-021` |
| `components/sidebar/worktree-multi-selection.test.ts:37 :: toggles one worktree without dropping the rest` | `D06-022` |
| `components/sidebar/worktree-multi-selection.test.ts:50 :: allows toggling the last selected worktree off` | `D06-022` |
| `components/sidebar/worktree-multi-selection.test.ts:63 :: selects the visible range from the anchor to the target` | `D06-022` |
| `components/sidebar/worktree-multi-selection.test.ts:76 :: prunes selection when filtering hides selected worktrees` | `D06-023` |
| `components/sidebar/worktree-multi-selection.test.ts:83 :: replaces selection from an area in visible order` | `D06-023` |
| `components/sidebar/worktree-multi-selection.test.ts:96 :: adds area selection to the existing batch with modifier keys` | `D06-023` |
| `components/sidebar/worktree-parent-eligibility.test.ts:103 :: treats stale instance edges as broken during descendant traversal` | `D06-024` |
| `components/sidebar/worktree-parent-eligibility.test.ts:125 :: allows a raw current parent candidate when the child lineage is stale` | `D06-024` |
| `components/sidebar/worktree-parent-eligibility.test.ts:145 :: rejects candidates inside pre-existing lineage loops` | `D06-024` |
| `components/sidebar/worktree-parent-eligibility.test.ts:164 :: stays repo-agnostic while the picker candidate filter is repo and host scoped` | `D06-024` |
| `components/sidebar/worktree-parent-eligibility.test.ts:192 :: excludes same-repo candidates owned by a different runtime host` | `D06-024` |
| `components/sidebar/worktree-parent-eligibility.test.ts:214 :: excludes a candidate across a known project boundary for picker and direct drop checks` | `D06-024` |
| `components/sidebar/worktree-parent-eligibility.test.ts:242 :: excludes archived worktrees from picker candidates` | `D06-024` |
| `components/sidebar/worktree-parent-eligibility.test.ts:57 :: canAssignWorktreeParent` | `INFRA: describe suite header for canAssignWorktreeParent` |
| `components/sidebar/worktree-parent-eligibility.test.ts:58 :: excludes self, valid current parent, and descendants` | `D06-024` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:101 :: keeps normal in-range hover handling unchanged` | `D06-010` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:113 :: getWorktreeSidebarDragRectsForGroup` | `INFRA: describe suite header for getWorktreeSidebarDragRectsForGroup` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:114 :: refreshes mounted rects for the source group only` | `D06-011` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:127 :: anchors rects to virtual row slots so animated transforms do not perturb hit testing` | `D06-011` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:140 :: refreshWorktreeSidebarDragSession` | `INFRA: describe suite header for refreshWorktreeSidebarDragSession` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:141 :: keeps the dragged set stable while refreshing rects` | `D06-012` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:167 :: clears when the source group is missing` | `D06-012` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:178 :: clears when the dragged worktree or reordered unit disappears` | `D06-012` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:197 :: keeps a valid session when mounted rects are temporarily empty` | `D06-012` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:208 :: keeps child-card reorder drags even when the child is not a top-level unit` | `D06-012` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:29 :: getWorktreeSidebarDragAutoscroll` | `INFRA: describe suite header for getWorktreeSidebarDragAutoscroll` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:30 :: scrolls up near the top edge` | `D06-009` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:34 :: scrolls down near the bottom edge` | `D06-009` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:38 :: does nothing away from the vertical edge zones` | `D06-009` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:42 :: does nothing when the pointer is outside horizontally` | `D06-009` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:46 :: does not write past scroll bounds` | `D06-009` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:51 :: allows capped scrolling slightly beyond the vertical edge` | `D06-009` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:56 :: scales by elapsed frame time and clamps delayed frames` | `D06-009` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:65 :: getWorktreeSidebarBoundaryDrop` | `INFRA: describe suite header for getWorktreeSidebarBoundaryDrop` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:66 :: clamps near the group start instead of clearing the edge preview` | `D06-010` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:77 :: clamps near the group end instead of clearing the edge preview` | `D06-010` |
| `components/sidebar/worktree-sidebar-drag-autoscroll.test.ts:88 :: still rejects gaps that are not the real group edge` | `D06-010` |
| `components/sidebar/worktree-sidebar-drag-geometry.test.ts:111 :: slides the indicator with the gap it marks while geometry is held` | `D06-008` |
| `components/sidebar/worktree-sidebar-drag-geometry.test.ts:123 :: still tracks the pointer normally once it moves again` | `D06-008` |
| `components/sidebar/worktree-sidebar-drag-geometry.test.ts:131 :: re-evaluates on real pointer or scroll movement but not on jitter` | `D06-008` |
| `components/sidebar/worktree-sidebar-drag-geometry.test.ts:155 :: falls back to a fresh decision when the anchored card disappears mid-drag` | `D06-008` |
| `components/sidebar/worktree-sidebar-drag-geometry.test.ts:178 :: keeps one live coordinate space across a session refresh` | `D06-008` |
| `components/sidebar/worktree-sidebar-drag-geometry.test.ts:207 :: grab-relative hit testing` | `INFRA: describe suite header for grab-relative hit testing` |
| `components/sidebar/worktree-sidebar-drag-geometry.test.ts:208 :: projects the dragged card from the pointer instead of using the bare pointer` | `D06-007` |
| `components/sidebar/worktree-sidebar-drag-geometry.test.ts:231 :: resolves the same slot wherever a tall card was grabbed` | `D06-007` |
| `components/sidebar/worktree-sidebar-drag-geometry.test.ts:251 :: clamps a grab offset that lands outside the card` | `D06-007` |
| `components/sidebar/worktree-sidebar-drag-geometry.test.ts:81 :: worktree sidebar drag geometry under mid-drag card growth` | `INFRA: describe suite header for worktree sidebar drag geometry under mid-drag card growth` |
| `components/sidebar/worktree-sidebar-drag-geometry.test.ts:82 :: keeps the drop target fixed while a card expands under a still pointer` | `D06-008` |
| `components/sidebar/worktree-sidebar-drag-geometry.test.ts:94 :: never lets a growing card change the drop target across a whole expansion` | `D06-008` |
| `components/sidebar/worktree-sidebar-pointer-drag-dom.test.ts:15 :: blocks portaled hover card targets outside the row` | `D06-003` |
| `components/sidebar/worktree-sidebar-pointer-drag-dom.test.ts:26 :: blocks interactive targets inside the row` | `D06-003` |
| `components/sidebar/worktree-sidebar-pointer-drag-dom.test.ts:34 :: blocks icon targets inside interactive row controls` | `D06-003` |
| `components/sidebar/worktree-sidebar-pointer-drag-dom.test.ts:6 :: worktree sidebar pointer drag DOM guards` | `INFRA: describe suite header for worktree sidebar pointer drag DOM guards` |
| `components/sidebar/worktree-sidebar-pointer-drag-dom.test.ts:7 :: allows plain row targets to start pointer drags` | `D06-003` |
| `components/sidebar/worktree-sidebar-reveal-scroll-settle.test.ts:13 :: stays settling while a smooth reveal scroll is still animating` | `D06-034` |
| `components/sidebar/worktree-sidebar-reveal-scroll-settle.test.ts:21 :: stops settling once the scroll reaches its target` | `D06-034` |
| `components/sidebar/worktree-sidebar-reveal-scroll-settle.test.ts:28 :: stops settling after the timeout so an unreachable target cannot pin the guard open` | `D06-034` |
| `components/sidebar/worktree-sidebar-reveal-scroll-settle.test.ts:8 :: isRevealScrollSettling` | `INFRA: describe suite header for isRevealScrollSettling` |
| `components/sidebar/worktree-sidebar-reveal-scroll-settle.test.ts:9 :: is not settling without a reveal scroll in flight` | `D06-034` |
| `components/sidebar/worktree-sidebar-reveal.test.ts:22 :: revealElementInScrollContainer` | `INFRA: describe suite header for revealElementInScrollContainer` |
| `components/sidebar/worktree-sidebar-reveal.test.ts:23 :: reports the scroll target it issues so callers can guard the animation` | `D06-033` |
| `components/sidebar/worktree-sidebar-reveal.test.ts:40 :: does not report a scroll when the element is already in view` | `D06-033` |
| `components/sidebar/worktree-sidebar-row-preference.test.ts:83 :: getRenderedWorktreesInSidebarOrder` | `INFRA: describe suite header for getRenderedWorktreesInSidebarOrder` |
| `components/sidebar/worktree-sidebar-row-preference.test.ts:84 :: keeps folder workspaces in visual order while preferring natural pinned rows` | `D06-032` |
| `components/sidebar/worktree-unnest.test.ts:15 :: clears the parent link on every requested worktree` | `D06-030` |
| `components/sidebar/worktree-unnest.test.ts:28 :: toasts instead of rejecting when the lineage update fails` | `D06-030` |
| `components/sidebar/worktree-unnest.test.ts:38 :: toasts once when several worktrees fail together` | `D06-030` |
| `components/sidebar/worktree-unnest.test.ts:46 :: does nothing for an empty selection` | `D06-030` |
| `components/sidebar/worktree-unnest.test.ts:9 :: unnestWorktrees` | `INFRA: describe suite header for unnestWorktrees` |
| `components/sidebar/worktree-visibility-source-provenance.test.ts:104 :: stays quiet for a source that is still following global settings` | `D06-035` |
| `components/sidebar/worktree-visibility-source-provenance.test.ts:110 :: stays quiet outside a project scope` | `D06-035` |
| `components/sidebar/worktree-visibility-source-provenance.test.ts:115 :: getWorktreeVisibilitySourceNote` | `INFRA: describe suite header for getWorktreeVisibilitySourceNote` |
| `components/sidebar/worktree-visibility-source-provenance.test.ts:116 :: marks a source the project added itself` | `D06-035` |
| `components/sidebar/worktree-visibility-source-provenance.test.ts:126 :: says nothing for an inherited source` | `D06-035` |
| `components/sidebar/worktree-visibility-source-provenance.test.ts:47 :: listInheritedWorktreeVisibilitySources` | `INFRA: describe suite header for listInheritedWorktreeVisibilitySources` |
| `components/sidebar/worktree-visibility-source-provenance.test.ts:48 :: reports what each inheritable source is set to globally` | `D06-035` |
| `components/sidebar/worktree-visibility-source-provenance.test.ts:56 :: keeps a source the project has overridden, since global is what it overrode` | `D06-035` |
| `components/sidebar/worktree-visibility-source-provenance.test.ts:67 :: lists a global custom source but not one the project added itself` | `D06-035` |
| `components/sidebar/worktree-visibility-source-provenance.test.ts:86 :: getWorktreeVisibilityOverrideNotice` | `INFRA: describe suite header for getWorktreeVisibilityOverrideNotice` |
| `components/sidebar/worktree-visibility-source-provenance.test.ts:87 :: names the global value a project override is ignoring` | `D06-035` |
| `components/sidebar/worktree-visibility-source-provenance.test.ts:97 :: stays quiet for an override that agrees with global settings` | `D06-035` |

---

## 4. Atalhos e Navegação por Teclado (`hotkeys` / `shortcuts`)

| Entrada de Atalho | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/WorktreeParentPickerPopover.test.ts:225 :: } as unknown as React.KeyboardEvent<HTMLInputElement>,` | `INFRA: test keyboard event cast in WorktreeParentPickerPopover test` |
| `components/sidebar/WorktreeParentPickerPopover.tsx:115 :: if (event.key === 'ArrowDown') {` | `D06-027` |
| `components/sidebar/WorktreeParentPickerPopover.tsx:117 :: } else if (event.key === 'ArrowUp') {` | `D06-027` |
| `components/sidebar/WorktreeParentPickerPopover.tsx:119 :: } else if (event.key === 'Home') {` | `D06-027` |
| `components/sidebar/WorktreeParentPickerPopover.tsx:121 :: } else if (event.key === 'End') {` | `D06-027` |
| `components/sidebar/WorktreeParentPickerPopover.tsx:123 :: } else if (event.key === 'Enter') {` | `D06-027` |
| `components/sidebar/WorktreeParentPickerPopover.tsx:280 :: (event: React.KeyboardEvent<HTMLInputElement>) => {` | `D06-027` |
| `components/sidebar/WorktreeParentPickerPopover.tsx:53 :: event: React.KeyboardEvent<HTMLInputElement>` | `D06-027` |

---

## 5. Rótulos e Textos Interativos (`labels` / `menu_labels`)

| Rótulo / Texto | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/WorktreeParentPickerPopover.tsx:358 :: placeholder={translate(` | `D06-026` |
| `components/sidebar/worktree-keyboard-cycle.test.ts:142 :: label: 'This computer',` | `INFRA: fixture label helper in keyboard cycle test` |

---

## 6. Preferências e Persistência (`prefs`)

| Preferência | Linha de Inventário / Justificativa |
|---|---|
| *(Nenhuma preferência direta persistida exclusivamente no escopo deste domínio — manualOrder é persistido no store via API)* | `N/A: persistência em store` |

---

## 7. Temporizadores e Intervalos (`timers`)

| Temporizador | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/WorktreeParentPickerPopover.tsx:195 :: const timerId = window.setTimeout(() => {` | `D06-028` |

---

## 8. Assinaturas e Event Listeners (`subscriptions`)

| Assinatura / Event Listener | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/WorktreeParentPickerPopover.tsx:179 :: window.addEventListener('resize', updateAnchorRect)` | `D06-025` |
| `components/sidebar/WorktreeParentPickerPopover.tsx:180 :: window.addEventListener('scroll', updateAnchorRect, true)` | `D06-025` |
| `components/sidebar/WorktreeParentPickerPopover.tsx:187 :: useEffect(() => {` | `D06-028` |
| `components/sidebar/WorktreeParentPickerPopover.tsx:298 :: useEffect(() => {` | `D06-027` |

---

## 9. Contratos de Backend / Preload (`preload`)

| Símbolo Preload | Linha de Inventário / Justificativa |
|---|---|
| *(Nenhum símbolo direto de preload exclusivo neste domínio — ações utilizam useAppStore)* | `N/A: gerenciamento via Zustand store` |

