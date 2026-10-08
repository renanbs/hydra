# Parede de Evidência — Domínio D07-menus-actions (Menus, Ações, Sleep, Status e Deleção)

## Contagens de Cobertura
- **arquivos**: 33/33 (100%)
- **símbolos**: 97/97 (100%)
- **testes**: 139/139 (100%)
- **labels**: 49/49 (100%)
- **hotkeys**: 6/6 (100%)
- **prefs**: 0/0 (100%)
- **timers**: 16/16 (100%)
- **subs**: 8/8 (100%)
- **preload**: 3/3 (100%)

---

## Itens com Justificativa Especial (INFRA / N/A / DUP)

| Categoria | Entrada | Justificativa |
|---|---|---|
| tests | `components/sidebar/delete-worktree-dirty-change-counts.test.ts:28 :: describe delete-worktree status hydration ordering` | `INFRA: describe suite header for delete-worktree status hydration ordering` |
| tests | `components/sidebar/delete-worktree-failure-toast.test.tsx:50 :: describe showDeleteWorktreeFailureToast` | `INFRA: describe suite header for showDeleteWorktreeFailureToast` |
| tests | `components/sidebar/delete-worktree-flow.test.ts:125 :: describe delete worktree flow` | `INFRA: describe suite header for delete worktree flow` |
| tests | `components/sidebar/delete-worktree-parallel-flow.test.ts:87 :: describe runWorktreeDeletesInParallel` | `INFRA: describe suite header for runWorktreeDeletesInParallel` |
| tests | `components/sidebar/delete-worktree-toast.test.ts:12 :: describe getDeleteWorktreeToastCopy` | `INFRA: describe suite header for getDeleteWorktreeToastCopy` |
| tests | `components/sidebar/hovered-workspace-delete.test.ts:53 :: describe hovered workspace delete` | `INFRA: describe suite header for hovered workspace delete` |
| tests | `components/sidebar/sidebar-workspace-option-items.test.ts:8 :: describe worktree card property options` | `INFRA: describe suite header for worktree card property options` |
| tests | `components/sidebar/sleep-worktree-flow.test.ts:53 :: describe runSleepWorktree` | `INFRA: describe suite header for runSleepWorktree` |
| tests | `components/sidebar/workspace-delete-lineage.test.ts:48 :: describe getWorkspaceDeleteLineage` | `INFRA: describe suite header for getWorkspaceDeleteLineage` |
| tests | `components/sidebar/workspace-lineage-menu-actions.test.ts:44 :: describe workspace lineage menu actions` | `INFRA: describe suite header for workspace lineage menu actions` |
| tests | `components/sidebar/workspace-lineage-menu-actions.test.ts:103 :: describe hasSleepableWorkspaceActivity` | `INFRA: describe suite header for hasSleepableWorkspaceActivity` |
| tests | `components/sidebar/workspace-status.test.ts:30 :: describe workspace status drag data` | `INFRA: describe suite header for workspace status drag data` |
| tests | `components/sidebar/worktree-context-menu-delete-intent.test.ts:17 :: describe createWorktreeContextMenuDeleteIntent` | `INFRA: describe suite header for createWorktreeContextMenuDeleteIntent` |
| tests | `components/sidebar/worktree-context-menu-delete-intent.test.ts:71 :: describe deferWorktreeContextMenuDeleteIntent` | `INFRA: describe suite header for deferWorktreeContextMenuDeleteIntent` |
| tests | `components/sidebar/worktree-delete-host-qualification.test.ts:129 :: describe STA-4343 sidebar delete: the confirmed row decides the host` | `INFRA: describe suite header for STA-4343 sidebar delete: the confirmed row decides the host` |
| tests | `components/sidebar/worktree-delete-request.test.ts:44 :: describe resolveWorktreeBatchDeleteTargets` | `INFRA: describe suite header for resolveWorktreeBatchDeleteTargets` |
| tests | `components/sidebar/worktree-delete-request.test.ts:114 :: describe readWorktreeDeleteIdentities` | `INFRA: describe suite header for readWorktreeDeleteIdentities` |
| labels | `components/sidebar/delete-worktree-failure-toast.test.tsx:32 :: function clickButton(container: HTMLElement, label: string): void {` | `INFRA: test clickButton helper with label parameter` |
| timers | `components/sidebar/sleep-worktree-flow.test.ts:62 :: requestAnimationFrame: vi.fn()` | `INFRA: mocked window.requestAnimationFrame in sleep flow test` |
| timers | `components/sidebar/sleep-worktree-flow.test.ts:124 :: const requestAnimationFrame = vi.fn(() => 1)` | `INFRA: mocked window.requestAnimationFrame in sleep flow test` |
| timers | `components/sidebar/sleep-worktree-flow.test.ts:144 :: vi.stubGlobal('window', { requestAnimationFrame })` | `INFRA: mocked window.requestAnimationFrame in sleep flow test` |
| timers | `components/sidebar/sleep-worktree-flow.test.ts:149 :: expect(requestAnimationFrame).toHaveBeenCalledTimes(1)` | `INFRA: mocked window.requestAnimationFrame in sleep flow test` |
| timers | `components/sidebar/sleep-worktree-flow.test.ts:153 :: const requestAnimationFrame = vi.fn(() => 1)` | `INFRA: mocked window.requestAnimationFrame in sleep flow test` |
| timers | `components/sidebar/sleep-worktree-flow.test.ts:185 :: vi.stubGlobal('window', { requestAnimationFrame })` | `INFRA: mocked window.requestAnimationFrame in sleep flow test` |
| timers | `components/sidebar/worktree-context-menu-delete-intent.test.ts:120 :: vi.stubGlobal('window', { setTimeout })` | `INFRA: mocked window.setTimeout in delete intent test` |
| timers | `components/sidebar/worktree-delete-position-scaling.test.ts:63 :: vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(0)` | `INFRA: spy on window.requestAnimationFrame in position scaling test` |

---

## 1. Arquivos Produtivos (`files`)

| Arquivo Produtivo | Linhas de Inventário Associadas |
|---|---|
| `DeleteWorktreeDirtyChangeHint.tsx` | `D07-034` |
| `DeleteWorktreeLineageNotice.tsx` | `D07-035` |
| `DeleteWorktreeSkipConfirmOption.tsx` | `D07-036` |
| `DeleteWorktreeWarningPanels.tsx` | `D07-037` |
| `SidebarWorkspaceOptionsMenu.tsx` | `D07-010` |
| `WorkspaceSleepMenuItems.tsx` | `D07-001`, `D07-002`, `D07-003` |
| `WorkspaceStatusAppearancePopover.tsx` | `D07-006`, `D07-007`, `D07-008` |
| `delete-worktree-dialog-copy.ts` | `D07-032` |
| `delete-worktree-dialog-force-delete.ts` | `D07-039` |
| `delete-worktree-dirty-change-counts.ts` | `D07-033` |
| `delete-worktree-failure-toast.tsx` | `D07-041` |
| `delete-worktree-flow.ts` | `D07-028`, `D07-029`, `D07-031` |
| `delete-worktree-lineage-delete-all.ts` | `D07-040` |
| `delete-worktree-preference-toast.ts` | `D07-038` |
| `delete-worktree-toast.ts` | `D07-042` |
| `hovered-workspace-delete.ts` | `D07-025` |
| `sidebar-workspace-option-items.ts` | `D07-012`, `D07-013`, `D07-014`, `D07-015` |
| `sleep-worktree-flow.ts` | `D07-004`, `D07-005` |
| `use-worktree-context-menu-commands.ts` | `D07-001`, `D07-003`, `D07-020`, `D07-021`, `D07-022`, `D07-023`, `D07-026` |
| `use-worktree-context-menu-model.tsx` | `D07-002`, `D07-016`, `D07-017`, `D07-018` |
| `use-worktree-context-menu-secondary-actions.ts` | `D07-019`, `D07-023` |
| `workspace-delete-lineage.ts` | `D07-030` |
| `workspace-delete-quick-action.ts` | `D07-024` |
| `workspace-lineage-menu-actions.ts` | `D07-001`, `D07-003` |
| `workspace-options-menu-items.tsx` | `D07-010`, `D07-011`, `D07-012`, `D07-013`, `D07-014`, `D07-015` |
| `workspace-status-icon-options.ts` | `D07-008` |
| `workspace-status-icons.tsx` | `D07-008` |
| `workspace-status.ts` | `D07-007`, `D07-009` |
| `worktree-context-menu-delete-intent.ts` | `D07-026` |
| `worktree-context-menu-policy.ts` | `D07-017`, `D07-018`, `D07-019`, `D07-022`, `D07-023`, `D07-027`, `D07-045` |
| `worktree-delete-execution.ts` | `D07-044` |
| `worktree-delete-request.ts` | `D07-029` |
| `worktree-delete-state-host-match.ts` | `D07-043` |

---

## 2. Símbolos Exportados (`symbols`)

| Símbolo Exportado | Linhas de Inventário / Justificativa |
|---|---|
| `SidebarWorkspaceOptionsMenu.tsx:default` | `D07-010` |
| `WorkspaceStatusAppearancePopover.tsx:default` | `D07-006` |
| `DeleteWorktreeDirtyChangeHint` | `D07-034` |
| `DeleteWorktreeLineageNotice` | `D07-035` |
| `DeleteWorktreeSkipConfirmOption` | `D07-036` |
| `DeleteWorktreeWarningPanels` | `D07-037` |
| `WorkspaceSleepMenuItems` | `D07-001`, `D07-002`, `D07-003` |
| `WorkspaceStatusAppearancePopover` | `D07-006`, `D07-007`, `D07-008` |
| `isFolderWorkspaceDelete` | `D07-032` |
| `countFolderWorkspaceDeletes` | `D07-032` |
| `getDeleteWorktreeDialogCopy` | `D07-032` |
| `getDeleteWorktreeLineageDialogCopy` | `D07-032` |
| `runDialogForceDelete` | `D07-039` |
| `orderDeleteWorktreeStatusHydrationTargets` | `D07-033` |
| `getDeleteWorktreeDirtyChangeCounts` | `D07-033` |
| `showDeleteWorktreeFailureToast` | `D07-041` |
| `runWorktreeDelete` | `D07-028`, `D07-031` |
| `runWorktreeBatchDelete` | `D07-029` |
| `runLineageDeleteAll` | `D07-040` |
| `persistDeleteWorktreeConfirmSkipPreference` | `D07-038` |
| `DeleteWorktreeToastCopy` | `D07-042` |
| `getDeleteWorktreeToastCopy` | `D07-042` |
| `HoveredWorkspaceDeleteTarget` | `D07-025` |
| `getHoveredWorkspaceIdentity` | `D07-025` |
| `resolveHoveredWorkspaceDeleteTarget` | `D07-025` |
| `deleteHoveredWorkspaceImmediately` | `D07-025` |
| `GROUP_BY_OPTIONS` | `D07-012` |
| `CARD_LAYOUT_OPTIONS` | `D07-015` |
| `AGENT_ACTIVITY_DISPLAY_OPTIONS` | `D07-015` |
| `WorktreeCardPropertyOption` | `D07-015` |
| `getWorktreeCardPropertyOptions` | `D07-015` |
| `WORKTREE_CARD_PROPERTY_OPTIONS` | `D07-015` |
| `SORT_OPTIONS` | `D07-013` |
| `PROJECT_ORDER_OPTIONS` | `D07-014` |
| `runSleepWorktree` | `D07-004` |
| `runSleepWorktrees` | `D07-001`, `D07-002`, `D07-004` |
| `useWorktreeContextMenuCommands` | `D07-001`, `D07-020`, `D07-021`, `D07-022`, `D07-023` |
| `WorktreeContextMenuProps` | `D07-016` |
| `useWorktreeContextMenuModel` | `D07-002`, `D07-016`, `D07-018` |
| `WorktreeContextMenuModel` | `D07-016` |
| `useWorktreeContextMenuSecondaryActions` | `D07-019`, `D07-023` |
| `getWorkspaceDeleteLineage` | `D07-028`, `D07-030` |
| `useWorkspaceDeleteModifierPressed` | `D07-024` |
| `canShowWorkspaceDeleteQuickAction` | `D07-024` |
| `WorkspaceLineageMenuActions` | `D07-003` |
| `hasSleepableWorkspaceActivity` | `D07-001`, `D07-003` |
| `getWorkspaceLineageMenuActions` | `D07-003` |
| `useWorkspaceLineageMenuActions` | `D07-003` |
| `useWorkspaceOptionsFilterBadge` | `D07-010` |
| `WorkspaceOptionsMenuItems` | `D07-011`, `D07-012`, `D07-013`, `D07-014`, `D07-015` |
| `WorkspaceStatusIconOption` | `D07-008` |
| `getWorkspaceStatusIconOptions` | `D07-008` |
| `ConductorDoneIcon` | `D07-008` |
| `ConductorReviewIcon` | `D07-008` |
| `ConductorProgressIcon` | `D07-008` |
| `getWorkspaceStatusColorOptions` | `D07-007` |
| `getWorkspaceStatusVisualMeta` | `D07-009` |
| `WorktreeContextMenuDeleteIntent` | `D07-026` |
| `createWorktreeContextMenuDeleteIntent` | `D07-026` |
| `runWorktreeContextMenuDeleteIntent` | `D07-026` |
| `deferWorktreeContextMenuDeleteIntent` | `D07-026` |
| `CLOSE_ALL_CONTEXT_MENUS_EVENT` | `D07-016`, `D07-017` |
| `WORKTREE_CONTEXT_MENU_SCOPE_ATTR` | `D07-017` |
| `WORKTREE_NATIVE_CONTEXT_MENU_ATTR` | `D07-017` |
| `PARENT_PICKER_EXIT_ANIMATION_MS` | `D07-017` |
| `EMPTY_TABS_BY_WORKTREE` | `D07-017` |
| `EMPTY_PTY_IDS_BY_TAB_ID` | `D07-017` |
| `EMPTY_BROWSER_TABS_BY_WORKTREE` | `D07-017` |
| `EMPTY_DELETE_STATE_BY_WORKTREE_ID` | `D07-017` |
| `EMPTY_WORKTREE_LINEAGE_BY_ID` | `D07-017` |
| `EMPTY_WORKSPACE_LINEAGE_BY_CHILD_KEY` | `D07-017` |
| `EMPTY_CYCLIC_LINEAGE_IDS` | `D07-017` |
| `selectMenuScopedMap` | `D07-017` |
| `shouldRevealWorktreeDeveloperMenu` | `D07-018` |
| `hasWorktreeParentLink` | `D07-023` |
| `shouldUseNativeContextMenu` | `D07-017` |
| `shouldIgnoreNestedWorktreeContextMenuScope` | `D07-017` |
| `shouldSuppressContextMenuFollowUpClick` | `D07-019` |
| `getWorktreeParentPickerLabel` | `D07-023` |
| `isWorktreeParentPickerDisabled` | `D07-023` |
| `getWorktreeParentPickerAnchor` | `D07-023` |
| `shouldRemoveProjectFromContextMenu` | `D07-045` |
| `isContextWorktreeDeletable` | `D07-045` |
| `shouldContinueDeleteSiblingPositionRestore` | `D07-027` |
| `preserveDeleteSiblingPosition` | `D07-027` |
| `WorkspaceStatusAssignmentPlan` | `D07-022` |
| `planWorkspaceStatusAssignment` | `D07-022` |
| `runWorktreeDeletesInParallel` | `D07-044` |
| `WorktreeBatchDeleteOptions` | `D07-029` |
| `WorktreeDeleteIdentity` | `D07-029` |
| `WorktreeDeleteOptions` | `D07-029` |
| `WorktreeDeleteWithToastOptions` | `D07-044` |
| `toWorktreeDeleteIdentities` | `D07-029` |
| `WorktreeDeleteTargetLookup` | `D07-029` |
| `resolveWorktreeBatchDeleteTargets` | `D07-029` |
| `readWorktreeDeleteIdentities` | `D07-029` |
| `getDeleteStateForWorktreeHost` | `D07-043` |

---

## 3. Testes Automatizados (`tests`)

| Caso de Teste | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/delete-worktree-dirty-change-counts.test.ts:28 :: describe delete-worktree status hydration ordering` | `INFRA: describe suite header for delete-worktree status hydration ordering` |
| `components/sidebar/delete-worktree-dirty-change-counts.test.ts:29 :: it orders the active target first, visible targets next, and descendants last` | `D07-033` |
| `components/sidebar/delete-worktree-failure-toast.test.tsx:50 :: describe showDeleteWorktreeFailureToast` | `INFRA: describe suite header for showDeleteWorktreeFailureToast` |
| `components/sidebar/delete-worktree-failure-toast.test.tsx:51 :: it uses a persistent in-body action footer when force delete is available` | `D07-026` |
| `components/sidebar/delete-worktree-failure-toast.test.tsx:93 :: it keeps non-forceable failures destructive without a force action` | `D07-030` |
| `components/sidebar/delete-worktree-failure-toast.test.tsx:127 :: it offers Delete Anyway when the archive hook refused the removal` | `D07-041` |
| `components/sidebar/delete-worktree-failure-toast.test.tsx:157 :: it does not offer Delete Anyway for an ordinary failure` | `D07-041` |
| `components/sidebar/delete-worktree-failure-toast.test.tsx:172 :: it offers neither force delete nor View for a locked workspace` | `D07-041` |
| `components/sidebar/delete-worktree-failure-toast.test.tsx:196 :: it keeps View for a locked workspace when changed files are known` | `D07-041` |
| `components/sidebar/delete-worktree-flow.test.ts:125 :: describe delete worktree flow` | `INFRA: describe suite header for delete worktree flow` |
| `components/sidebar/delete-worktree-flow.test.ts:142 :: it filters main worktrees and opens a batch confirmation for eligible targets` | `D07-029` |
| `components/sidebar/delete-worktree-flow.test.ts:161 :: it opens the single-delete confirmation when only one target is eligible` | `D07-029` |
| `components/sidebar/delete-worktree-flow.test.ts:173 :: it treats duplicate selected ids as one delete target` | `D07-029` |
| `components/sidebar/delete-worktree-flow.test.ts:186 :: it rejects the whole batch when a selected path belongs to a different instance` | `D07-029` |
| `components/sidebar/delete-worktree-flow.test.ts:209 :: it opens batch confirmation when every selected instance is still current` | `D07-029` |
| `components/sidebar/delete-worktree-flow.test.ts:232 :: it revalidates each queued instance immediately before execution` | `D07-044` |
| `components/sidebar/delete-worktree-flow.test.ts:275 :: it keeps batch deletes behind confirmation when confirmation is skipped` | `D07-029` |
| `components/sidebar/delete-worktree-flow.test.ts:298 :: it runs a single eligible delete immediately when confirmation is skipped` | `D07-028` |
| `components/sidebar/delete-worktree-flow.test.ts:316 :: it notifies onDeleted after a skip-confirm force delete succeeds` | `D07-031` |
| `components/sidebar/delete-worktree-flow.test.ts:354 :: it opens the diff without re-seeding a shell when View changes is clicked` | `D07-041` |
| `components/sidebar/delete-worktree-flow.test.ts:375 :: it does not offer force delete for a locked worktree` | `D07-041` |
| `components/sidebar/delete-worktree-flow.test.ts:404 :: it does not offer force from another host` | `D07-043` |
| `components/sidebar/delete-worktree-flow.test.ts:424 :: it keeps parent worktree deletes behind confirmation even when confirmation is skipped` | `D07-031` |
| `components/sidebar/delete-worktree-flow.test.ts:458 :: it keeps context-menu parent deletes behind confirmation even when confirmation is skipped` | `D07-031` |
| `components/sidebar/delete-worktree-flow.test.ts:489 :: it reports a stale list instead of silently dropping a delete whose row vanished` | `D07-028` |
| `components/sidebar/delete-worktree-flow.test.ts:506 :: it rejects a delayed delete when the path now belongs to a different instance` | `D07-028` |
| `components/sidebar/delete-worktree-flow.test.ts:522 :: it runs a delayed delete when the captured instance is still current` | `D07-028` |
| `components/sidebar/delete-worktree-flow.test.ts:537 :: it stays silent for a folder workspace, which this funnel does not route` | `D07-028` |
| `components/sidebar/delete-worktree-flow.test.ts:547 :: it does not report a stale list when the workspace is still present` | `D07-028` |
| `components/sidebar/delete-worktree-flow.test.ts:560 :: it opens project removal confirmation for a primary workspace` | `D07-028` |
| `components/sidebar/delete-worktree-flow.test.ts:583 :: it routes primary workspace removal to its exact SSH host` | `D07-028` |
| `components/sidebar/delete-worktree-flow.test.ts:608 :: it can force confirmation for a single eligible delete` | `D07-029` |
| `components/sidebar/delete-worktree-flow.test.ts:625 :: it reports when no selected worktrees are eligible` | `D07-029` |
| `components/sidebar/delete-worktree-flow.test.ts:640 :: it reports a Delete Anyway success to the caller like a force retry` | `D07-041` |
| `components/sidebar/delete-worktree-parallel-flow.test.ts:87 :: describe runWorktreeDeletesInParallel` | `INFRA: describe suite header for runWorktreeDeletesInParallel` |
| `components/sidebar/delete-worktree-parallel-flow.test.ts:105 :: it uses one snapshot prune batch for a 100-workspace delete` | `D07-044` |
| `components/sidebar/delete-worktree-parallel-flow.test.ts:139 :: it starts every selected delete before waiting for earlier deletes to finish` | `D07-044` |
| `components/sidebar/delete-worktree-parallel-flow.test.ts:180 :: it marks every same-repo target deleting before serialized deletes finish` | `D07-044` |
| `components/sidebar/delete-worktree-parallel-flow.test.ts:226 :: it deletes nested workspaces before their parent within the same repo` | `D07-044` |
| `components/sidebar/delete-worktree-parallel-flow.test.ts:250 :: it passes confirmed force to each delete` | `D07-044` |
| `components/sidebar/delete-worktree-parallel-flow.test.ts:277 :: it deletes a duplicated target identity only once` | `D07-044` |
| `components/sidebar/delete-worktree-parallel-flow.test.ts:301 :: it deletes both host-qualified targets when they share a worktree id` | `D07-044` |
| `components/sidebar/delete-worktree-parallel-flow.test.ts:341 :: it clears a pending ancestor when a nested descendant delete fails` | `D07-044` |
| `components/sidebar/delete-worktree-parallel-flow.test.ts:373 :: it does not let a failed child on one host block an ancestor on another host` | `D07-044` |
| `components/sidebar/delete-worktree-parallel-flow.test.ts:407 :: it replaces per-workspace branch warnings with one batch result` | `D07-044` |
| `components/sidebar/delete-worktree-toast.test.ts:12 :: describe getDeleteWorktreeToastCopy` | `INFRA: describe suite header for getDeleteWorktreeToastCopy` |
| `components/sidebar/delete-worktree-toast.test.ts:13 :: it uses direct guidance when force delete is available` | `D07-042` |
| `components/sidebar/delete-worktree-toast.test.ts:23 :: it uses terminal-teardown guidance when a PTY stop could not be proven` | `D07-042` |
| `components/sidebar/delete-worktree-toast.test.ts:39 :: it names the running terminals when verification proved they are still live` | `D07-042` |
| `components/sidebar/delete-worktree-toast.test.ts:55 :: it offers force delete when an agent session could not be confirmed closed` | `D07-042` |
| `components/sidebar/delete-worktree-toast.test.ts:72 :: it names the running agent sessions when the close left them attached` | `D07-042` |
| `components/sidebar/delete-worktree-toast.test.ts:88 :: it offers force delete when the teardown sweep itself timed out` | `D07-042` |
| `components/sidebar/delete-worktree-toast.test.ts:104 :: it offers force delete when the sweep failed rather than timed out` | `D07-001` |
| `components/sidebar/delete-worktree-toast.test.ts:118 :: it uses orphaned-directory guidance when Git tracking is already gone` | `D07-026` |
| `components/sidebar/delete-worktree-toast.test.ts:133 :: it uses stale-row guidance when Git already removed the worktree directory` | `D07-025` |
| `components/sidebar/delete-worktree-toast.test.ts:147 :: it preserves the raw error when force delete is unavailable` | `D07-042` |
| `components/sidebar/delete-worktree-toast.test.ts:155 :: it uses lock-specific guidance` | `D07-042` |
| `components/sidebar/delete-worktree-toast.test.ts:164 :: it includes the structured Git lock reason in localized recovery copy` | `D07-042` |
| `components/sidebar/hovered-workspace-delete.test.ts:53 :: describe hovered workspace delete` | `INFRA: describe suite header for hovered workspace delete` |
| `components/sidebar/hovered-workspace-delete.test.ts:54 :: it uses the deepest hovered worktree row` | `D07-025` |
| `components/sidebar/hovered-workspace-delete.test.ts:65 :: it resolves the exact hovered host instead of the active workspace` | `D07-025` |
| `components/sidebar/hovered-workspace-delete.test.ts:77 :: it retains the hovered host when resolving a folder workspace` | `D07-025` |
| `components/sidebar/hovered-workspace-delete.test.ts:94 :: it rejects primary worktrees, stale rows, and missing hover` | `D07-025` |
| `components/sidebar/hovered-workspace-delete.test.ts:113 :: it rejects worktrees that are already deleting` | `D07-025` |
| `components/sidebar/hovered-workspace-delete.test.ts:133 :: it rejects hovered rows while an editable control has focus` | `D07-025` |
| `components/sidebar/hovered-workspace-delete.test.ts:154 :: it routes the hovered worktree through the host-qualified safety flow` | `D07-025` |
| `components/sidebar/hovered-workspace-delete.test.ts:175 :: it removes a hovered folder workspace from Orca without deleting its directory` | `D07-025` |
| `components/sidebar/hovered-workspace-delete.test.ts:199 :: it rejects a duplicate folder delete while the first request is pending` | `D07-025` |
| `components/sidebar/sidebar-workspace-option-items.test.ts:8 :: describe worktree card property options` | `INFRA: describe suite header for worktree card property options` |
| `components/sidebar/sidebar-workspace-option-items.test.ts:9 :: it keeps the combined Tasks option by default` | `D07-015` |
| `components/sidebar/sidebar-workspace-option-items.test.ts:25 :: it splits issue providers only when new card style is on` | `D07-015` |
| `components/sidebar/sidebar-workspace-option-items.test.ts:42 :: it uses branch-only copy by default and without project groups` | `D07-009` |
| `components/sidebar/sidebar-workspace-option-items.test.ts:53 :: it keeps branch-only copy for legacy cards even with project groups` | `D07-004` |
| `components/sidebar/sidebar-workspace-option-items.test.ts:59 :: it mentions folder paths only for new card style with project groups` | `D07-015` |
| `components/sidebar/sleep-worktree-flow.test.ts:53 :: describe runSleepWorktree` | `INFRA: describe suite header for runSleepWorktree` |
| `components/sidebar/sleep-worktree-flow.test.ts:78 :: it tears down browsers before terminals on the sleep path` | `D07-003` |
| `components/sidebar/sleep-worktree-flow.test.ts:99 :: it clears activeWorktreeId before teardown when the slept worktree is active` | `D07-004` |
| `components/sidebar/sleep-worktree-flow.test.ts:110 :: it marks sleep intent before clearing the active slept worktree and keeps it after teardown` | `D07-004` |
| `components/sidebar/sleep-worktree-flow.test.ts:123 :: it preserves active row position through section-scoped sidebar row ids` | `D07-005` |
| `components/sidebar/sleep-worktree-flow.test.ts:152 :: it anchors sleep restoration to the natural duplicate row when no primary row is marked` | `D07-005` |
| `components/sidebar/sleep-worktree-flow.test.ts:194 :: it leaves activeWorktreeId alone and marks a background worktree slept` | `D07-004` |
| `components/sidebar/sleep-worktree-flow.test.ts:205 :: it leaves a worktree the user activated mid-batch awake` | `D07-004` |
| `components/sidebar/sleep-worktree-flow.test.ts:225 :: it marks each worktree only when its own teardown starts` | `D07-004` |
| `components/sidebar/sleep-worktree-flow.test.ts:246 :: it surfaces a toast and skips terminals when browsers throws` | `D07-005` |
| `components/sidebar/sleep-worktree-flow.test.ts:267 :: it restores the active workspace when terminal convergence fails` | `D07-005` |
| `components/sidebar/sleep-worktree-flow.test.ts:286 :: it continues sleeping later worktrees when one selected worktree fails` | `D07-005` |
| `components/sidebar/sleep-worktree-flow.test.ts:313 :: it sleeps multiple worktrees and clears active only once when included` | `D07-002` |
| `components/sidebar/workspace-delete-lineage.test.ts:48 :: describe getWorkspaceDeleteLineage` | `INFRA: describe suite header for getWorkspaceDeleteLineage` |
| `components/sidebar/workspace-delete-lineage.test.ts:49 :: it returns valid descendants for parent delete copy and child-first delete-all targets` | `D07-030` |
| `components/sidebar/workspace-delete-lineage.test.ts:67 :: it ignores stale instance links` | `D07-030` |
| `components/sidebar/workspace-delete-lineage.test.ts:82 :: it orders an exact inline-only legacy descendant before its parent` | `D07-030` |
| `components/sidebar/workspace-delete-lineage.test.ts:93 :: it keeps a stale side-map child authoritative over valid inline lineage` | `D07-030` |
| `components/sidebar/workspace-delete-lineage.test.ts:109 :: it rejects cross-repo, cross-host, and cross-project descendants` | `D07-030` |
| `components/sidebar/workspace-delete-lineage.test.ts:133 :: it does not traverse cyclic projected lineage` | `D07-025` |
| `components/sidebar/workspace-delete-lineage.test.ts:149 :: it resolves a colliding child id to the parent host` | `D07-030` |
| `components/sidebar/workspace-delete-lineage.test.ts:167 :: it keeps the parent host preference stable regardless of row order` | `D07-030` |
| `components/sidebar/workspace-delete-lineage.test.ts:185 :: it uses the confirmed host inline lineage when the bare projection belongs to the other host` | `D07-030` |
| `components/sidebar/workspace-lineage-menu-actions.test.ts:44 :: describe workspace lineage menu actions` | `INFRA: describe suite header for workspace lineage menu actions` |
| `components/sidebar/workspace-lineage-menu-actions.test.ts:45 :: it collects recursive descendants and only targets workspaces with active panels for sleep` | `D07-001` |
| `components/sidebar/workspace-lineage-menu-actions.test.ts:78 :: it does not expose stale descendants through the recursive action scope` | `D07-003` |
| `components/sidebar/workspace-lineage-menu-actions.test.ts:103 :: describe hasSleepableWorkspaceActivity` | `INFRA: describe suite header for hasSleepableWorkspaceActivity` |
| `components/sidebar/workspace-lineage-menu-actions.test.ts:104 :: it treats preserved empty PTY arrays as slept, not live` | `D07-001` |
| `components/sidebar/workspace-lineage-menu-actions.test.ts:114 :: it detects live terminal and browser activity` | `D07-001` |
| `components/sidebar/workspace-status.test.ts:30 :: describe workspace status drag data` | `INFRA: describe suite header for workspace status drag data` |
| `components/sidebar/workspace-status.test.ts:31 :: it keeps the legacy single worktree payload when writing a selected batch` | `D07-009` |
| `components/sidebar/workspace-status.test.ts:42 :: it round-trips selected worktree ids for board batch drops` | `D07-009` |
| `components/sidebar/workspace-status.test.ts:52 :: it falls back to the single worktree payload for older drag sources` | `D07-009` |
| `components/sidebar/workspace-status.test.ts:60 :: it ignores invalid decoded worktree ids while preserving valid batch ids` | `D07-009` |
| `components/sidebar/workspace-status.test.ts:70 :: it ignores oversized plain-text workspace drag fallbacks` | `D07-009` |
| `components/sidebar/workspace-status.test.ts:80 :: it ignores multibyte oversized workspace drag fallbacks` | `D07-009` |
| `components/sidebar/workspace-status.test.ts:89 :: it does not fall back to plain text when the typed id batch is oversized` | `D07-009` |
| `components/sidebar/workspace-status.test.ts:100 :: it rejects oversized selected worktree id batches` | `D07-009` |
| `components/sidebar/worktree-context-menu-delete-intent.test.ts:17 :: describe createWorktreeContextMenuDeleteIntent` | `INFRA: describe suite header for createWorktreeContextMenuDeleteIntent` |
| `components/sidebar/worktree-context-menu-delete-intent.test.ts:18 :: it routes a same-id row through the host that owns the context menu` | `D07-026` |
| `components/sidebar/worktree-context-menu-delete-intent.test.ts:35 :: it keeps every selected host in a colliding batch` | `D07-026` |
| `components/sidebar/worktree-context-menu-delete-intent.test.ts:51 :: it preserves the folder owner host in a context-menu delete intent` | `D07-026` |
| `components/sidebar/worktree-context-menu-delete-intent.test.ts:71 :: describe deferWorktreeContextMenuDeleteIntent` | `INFRA: describe suite header for deferWorktreeContextMenuDeleteIntent` |
| `components/sidebar/worktree-context-menu-delete-intent.test.ts:81 :: it dispatches the selected workspace identity after the menu event completes` | `D07-026` |
| `components/sidebar/worktree-context-menu-delete-intent.test.ts:104 :: it preserves every selected workspace identity for batch validation` | `D07-001` |
| `components/sidebar/worktree-context-menu-delete-intent.test.ts:118 :: it dispatches on the next macrotask by default` | `D07-026` |
| `components/sidebar/worktree-delete-host-qualification.test.ts:129 :: describe STA-4343 sidebar delete: the confirmed row decides the host` | `INFRA: describe suite header for STA-4343 sidebar delete: the confirmed row decides the host` |
| `components/sidebar/worktree-delete-host-qualification.test.ts:130 :: it deletes the SSH row and leaves the ACTIVE local checkout on disk` | `D07-043` |
| `components/sidebar/worktree-delete-host-qualification.test.ts:161 :: it routes the batch delete path to the confirmed host too` | `D07-029` |
| `components/sidebar/worktree-delete-host-qualification.test.ts:187 :: it tears down shared renderer state after both same-id host rows finish deleting` | `D07-043` |
| `components/sidebar/worktree-delete-host-qualification.test.ts:218 :: it still deletes the local checkout for real when the local row is the one deleted` | `D07-043` |
| `components/sidebar/worktree-delete-host-qualification.test.ts:239 :: it still deletes an ordinary single-host SSH workspace for real` | `D07-043` |
| `components/sidebar/worktree-delete-position-scaling.test.ts:36 :: it measures each mounted sidebar row once when choosing a delete-position anchor` | `D07-027` |
| `components/sidebar/worktree-delete-position-scaling.test.ts:48 :: it anchors on the same row the pre-hoist comparator sort would have chosen` | `D07-027` |
| `components/sidebar/worktree-delete-request.test.ts:44 :: describe resolveWorktreeBatchDeleteTargets` | `INFRA: describe suite header for resolveWorktreeBatchDeleteTargets` |
| `components/sidebar/worktree-delete-request.test.ts:48 :: it reaches the second host row even though the local row is listed first` | `D07-027` |
| `components/sidebar/worktree-delete-request.test.ts:57 :: it resolves the local row when that is the one confirmed` | `D07-029` |
| `components/sidebar/worktree-delete-request.test.ts:66 :: it keeps both hosts when both rows are confirmed in one batch` | `D07-029` |
| `components/sidebar/worktree-delete-request.test.ts:76 :: it refuses when the confirmed host no longer has a row` | `D07-029` |
| `components/sidebar/worktree-delete-request.test.ts:85 :: it refuses when the row on the confirmed host was replaced` | `D07-029` |
| `components/sidebar/worktree-delete-request.test.ts:96 :: it keeps first-wins for a bare id request that names no host` | `D07-029` |
| `components/sidebar/worktree-delete-request.test.ts:102 :: it skips a main worktree without failing the batch` | `D07-029` |
| `components/sidebar/worktree-delete-request.test.ts:114 :: describe readWorktreeDeleteIdentities` | `INFRA: describe suite header for readWorktreeDeleteIdentities` |
| `components/sidebar/worktree-delete-request.test.ts:115 :: it carries the host through the modal data round trip` | `D07-029` |
| `components/sidebar/worktree-delete-request.test.ts:125 :: it drops a host that is not a valid execution host id` | `D07-028` |

---

## 4. Labels e Textos Visuais de Menus (`labels`)

| Label / Texto Visual | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/DeleteWorktreeDirtyChangeHint.tsx:3 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D07-034` |
| `components/sidebar/SidebarWorkspaceOptionsMenu.tsx:9 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D07-010` |
| `components/sidebar/SidebarWorkspaceOptionsMenu.tsx:46 :: aria-label={` | `D07-010` |
| `components/sidebar/WorkspaceSleepMenuItems.tsx:3 :: import { DropdownMenuItem } from '@/components/ui/dropdown-menu'` | `D07-001` |
| `components/sidebar/WorkspaceSleepMenuItems.tsx:4 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D07-001` |
| `components/sidebar/WorkspaceSleepMenuItems.tsx:30 :: <DropdownMenuItem onSelect={onSleep} disabled={sleepDisabled}>` | `D07-001` |
| `components/sidebar/WorkspaceSleepMenuItems.tsx:33 :: </DropdownMenuItem>` | `D07-001` |
| `components/sidebar/WorkspaceSleepMenuItems.tsx:50 :: <DropdownMenuItem onSelect={onSleepSubtree} disabled={subtreeSleepDisabled}>` | `D07-001` |
| `components/sidebar/WorkspaceSleepMenuItems.tsx:57 :: </DropdownMenuItem>` | `D07-001` |
| `components/sidebar/WorkspaceStatusAppearancePopover.tsx:4 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D07-006` |
| `components/sidebar/WorkspaceStatusAppearancePopover.tsx:37 :: aria-label={translate(` | `D07-006` |
| `components/sidebar/WorkspaceStatusAppearancePopover.tsx:81 :: aria-label={translate(` | `D07-006` |
| `components/sidebar/WorkspaceStatusAppearancePopover.tsx:110 :: aria-label={translate(` | `D07-006` |
| `components/sidebar/delete-worktree-failure-toast.test.tsx:32 :: function clickButton(container: HTMLElement, label: string): void {` | `INFRA: test clickButton helper with label parameter` |
| `components/sidebar/delete-worktree-preference-toast.ts:35 :: label: translate(` | `D07-038` |
| `components/sidebar/sidebar-workspace-option-items.ts:52 :: label: string` | `D07-015` |
| `components/sidebar/sidebar-workspace-option-items.ts:74 :: label: string` | `D07-015` |
| `components/sidebar/workspace-options-menu-items.tsx:12 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D07-010` |
| `components/sidebar/workspace-status-icon-options.ts:24 :: label: string` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:32 :: label: translate('auto.components.sidebar.workspace.status.b4a7101fe1', 'Circle'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:37 :: label: translate('auto.components.sidebar.workspace.status.a702bc08d4', 'Dot'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:42 :: label: translate('auto.components.sidebar.workspace.status.226d1e7773', 'Progress'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:47 :: label: translate('auto.components.sidebar.workspace.status.821d156f54', 'Dashed'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:52 :: label: translate('auto.components.sidebar.workspace.status.5f9ca31a84', 'Waiting'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:57 :: label: translate('auto.components.sidebar.workspace.status.409528031f', 'Review'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:62 :: label: translate('auto.components.sidebar.workspace.status.251c817bdd', 'Timer'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:67 :: label: translate('auto.components.sidebar.workspace.status.6380517b10', 'Flag'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:72 :: label: translate('auto.components.sidebar.workspace.status.642da473f2', 'Alert'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:77 :: label: translate('auto.components.sidebar.workspace.status.111db162bf', 'Paused'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:82 :: label: translate('auto.components.sidebar.workspace.status.2c19d1db33', 'Play'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:87 :: label: translate('auto.components.sidebar.workspace.status.6b8285b8dd', 'Done'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:92 :: label: translate('auto.components.sidebar.workspace.status.93ac840dcb', 'Blocked'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:97 :: label: translate('auto.components.sidebar.workspace.status.6b8285b8dd', 'Done'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:102 :: label: translate('auto.components.sidebar.workspace.status.6c1efa2cf8', 'In review'),` | `D07-008` |
| `components/sidebar/workspace-status-icon-options.ts:107 :: label: translate('auto.components.sidebar.workspace.status.cb387159f6', 'In progress'),` | `D07-008` |
| `components/sidebar/workspace-status.ts:51 :: label: string` | `D07-007` |
| `components/sidebar/workspace-status.ts:61 :: label: translate('auto.components.sidebar.workspace.status.52e3c6e2a4', 'Neutral'),` | `D07-007` |
| `components/sidebar/workspace-status.ts:69 :: label: translate('auto.components.sidebar.workspace.status.fc3b92756c', 'Blue'),` | `D07-007` |
| `components/sidebar/workspace-status.ts:77 :: label: translate('auto.components.sidebar.workspace.status.6437a8c253', 'Sky'),` | `D07-007` |
| `components/sidebar/workspace-status.ts:85 :: label: translate('auto.components.sidebar.workspace.status.1b81da243a', 'Violet'),` | `D07-007` |
| `components/sidebar/workspace-status.ts:93 :: label: translate('auto.components.sidebar.workspace.status.7cebab6d4a', 'Amber'),` | `D07-007` |
| `components/sidebar/workspace-status.ts:101 :: label: translate('auto.components.sidebar.workspace.status.ddf25b6262', 'Emerald'),` | `D07-007` |
| `components/sidebar/workspace-status.ts:109 :: label: translate('auto.components.sidebar.workspace.status.7adb43ecf0', 'Rose'),` | `D07-007` |
| `components/sidebar/workspace-status.ts:117 :: label: translate('auto.components.sidebar.workspace.status.caabd5ca85', 'Zinc'),` | `D07-007` |
| `components/sidebar/workspace-status.ts:125 :: label: translate('auto.components.sidebar.workspace.status.895f381714', 'Conductor Done'),` | `D07-007` |
| `components/sidebar/workspace-status.ts:133 :: label: translate('auto.components.sidebar.workspace.status.caebe3c10f', 'Conductor Review'),` | `D07-007` |
| `components/sidebar/workspace-status.ts:141 :: label: translate('auto.components.sidebar.workspace.status.1a9383112b', 'Conductor Progress'),` | `D07-007` |
| `components/sidebar/workspace-status.ts:153 :: label: translate('auto.components.sidebar.workspace.status.52e3c6e2a4', 'Neutral'),` | `D07-007` |
| `components/sidebar/workspace-status.ts:166 :: label: translate('auto.components.sidebar.workspace.status.a702bc08d4', 'Dot'),` | `D07-009` |

---

## 5. Atalhos e Teclas Modificadoras (`hotkeys` / `shortcuts`)

| Entrada de Atalho / Modificador | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/delete-worktree-flow.test.ts:535 :: // Why: the delete-current-workspace shortcut (useIpcEvents) forwards whatever workspace is` | `D07-028` |
| `components/sidebar/workspace-delete-quick-action.ts:21 :: function onKeyDown(event: KeyboardEvent): void {` | `D07-024` |
| `components/sidebar/workspace-delete-quick-action.ts:22 :: if (event.altKey || event.key === 'Alt') {` | `D07-024` |
| `components/sidebar/workspace-delete-quick-action.ts:27 :: function onKeyUp(event: KeyboardEvent): void {` | `D07-024` |
| `components/sidebar/workspace-delete-quick-action.ts:28 :: if (event.key === 'Alt' || !event.altKey) {` | `D07-024` |
| `components/sidebar/worktree-delete-request.test.ts:5 :: * Both the delete-confirmation dialog and the batch shortcut funnel through` | `D07-029` |

---

## 6. Timers e Tarefas Agendadas (`timers`)

| Timer / Agendamento | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/sleep-worktree-flow.test.ts:62 :: requestAnimationFrame: vi.fn()` | `INFRA: mocked window.requestAnimationFrame in sleep flow test` |
| `components/sidebar/sleep-worktree-flow.test.ts:124 :: const requestAnimationFrame = vi.fn(() => 1)` | `INFRA: mocked window.requestAnimationFrame in sleep flow test` |
| `components/sidebar/sleep-worktree-flow.test.ts:144 :: vi.stubGlobal('window', { requestAnimationFrame })` | `INFRA: mocked window.requestAnimationFrame in sleep flow test` |
| `components/sidebar/sleep-worktree-flow.test.ts:149 :: expect(requestAnimationFrame).toHaveBeenCalledTimes(1)` | `INFRA: mocked window.requestAnimationFrame in sleep flow test` |
| `components/sidebar/sleep-worktree-flow.test.ts:153 :: const requestAnimationFrame = vi.fn(() => 1)` | `INFRA: mocked window.requestAnimationFrame in sleep flow test` |
| `components/sidebar/sleep-worktree-flow.test.ts:185 :: vi.stubGlobal('window', { requestAnimationFrame })` | `INFRA: mocked window.requestAnimationFrame in sleep flow test` |
| `components/sidebar/sleep-worktree-flow.ts:85 :: window.requestAnimationFrame(restore)` | `D07-005` |
| `components/sidebar/sleep-worktree-flow.ts:106 :: window.requestAnimationFrame(restore)` | `D07-005` |
| `components/sidebar/sleep-worktree-flow.ts:109 :: window.requestAnimationFrame(restore)` | `D07-005` |
| `components/sidebar/use-worktree-context-menu-commands.ts:137 :: window.setTimeout(() => void runSleepWorktrees(worktreeIds), 50)` | `D07-001` |
| `components/sidebar/use-worktree-context-menu-model.tsx:257 :: const timer = window.setTimeout(() => {` | `D07-016` |
| `components/sidebar/use-worktree-context-menu-model.tsx:348 :: window.setTimeout(openPendingParentPicker, 0)` | `D07-016` |
| `components/sidebar/worktree-context-menu-delete-intent.test.ts:120 :: vi.stubGlobal('window', { setTimeout })` | `INFRA: mocked window.setTimeout in delete intent test` |
| `components/sidebar/worktree-context-menu-delete-intent.ts:74 :: defer: (callback: () => void) => void = (callback) => window.setTimeout(callback, 0)` | `D07-026` |
| `components/sidebar/worktree-context-menu-policy.ts:221 :: window.requestAnimationFrame(restore)` | `D07-027` |
| `components/sidebar/worktree-delete-position-scaling.test.ts:63 :: vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(0)` | `INFRA: spy on window.requestAnimationFrame in position scaling test` |

---

## 7. Subscriptions e Event Listeners (`subscriptions`)

| Subscription / Listener | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/use-worktree-context-menu-model.tsx:240 :: useEffect(() => {` | `D07-016` |
| `components/sidebar/use-worktree-context-menu-model.tsx:267 :: useEffect(() => {` | `D07-016` |
| `components/sidebar/use-worktree-context-menu-model.tsx:269 :: window.addEventListener(CLOSE_ALL_CONTEXT_MENUS_EVENT, closeMenu)` | `D07-016` |
| `components/sidebar/use-worktree-context-menu-model.tsx:273 :: useEffect(` | `D07-016` |
| `components/sidebar/workspace-delete-quick-action.ts:44 :: window.addEventListener('keydown', onKeyDown, { capture: true })` | `D07-024` |
| `components/sidebar/workspace-delete-quick-action.ts:45 :: window.addEventListener('keyup', onKeyUp, { capture: true })` | `D07-024` |
| `components/sidebar/workspace-delete-quick-action.ts:46 :: window.addEventListener('blur', clearDeleteModifierPressed)` | `D07-024` |
| `components/sidebar/workspace-delete-quick-action.ts:48 :: document.addEventListener('visibilitychange', clearDeleteModifierPressed)` | `D07-024` |

---

## 8. Contratos de Preload Desktop (`preload`)

| Chamada Preload | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/sleep-worktree-flow.ts:191 :: if (typeof window !== 'undefined' && window.api?.ephemeralVm?.suspendWorkspace) {` | `D07-004` |
| `components/sidebar/sleep-worktree-flow.ts:192 :: await window.api.ephemeralVm.suspendWorkspace({ workspaceId: worktreeId })` | `D07-004` |
| `components/sidebar/use-worktree-context-menu-commands.ts:42 :: window.api.ui.writeClipboardText(args.worktree.path)` | `D07-020` |
