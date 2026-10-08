# D10-visibility-inbox-notices — parede de evidencia (Fase 1, Orca)

Fonte: `/home/renan/src/orca` @ working tree. Escopo: sidebar esquerdo do Orca (inventario exaustivo).
Artefato: `D10-visibility-inbox-notices.orca.json` (91 linhas).

## Contagens

```
arquivos: 30/30
simbolos: 66/66
testes: 163/163
labels: 57/57
hotkeys: 1/1
prefs: 0/0
timers: 4/4
subs: 13/13
preload: 2/2
```

`prefs`: o index do dominio nao lista nenhuma preferencia (`prefs: []`) — chaves de persistencia sao cobertas pelas linhas de comportamento (ex.: D10-010 skip-confirm, D10-063/064/067/068/069 flags do repo).

### Arquivos produtivos -> ids (30)

| entrada | id |
|---|---|
| `AutoRenameFailedDialog.tsx` | ['D10-001', 'D10-002', 'D10-003', 'D10-004'] |
| `DeleteWorktreeDialog.tsx` | ['D10-005', 'D10-006', 'D10-007', 'D10-008', 'D10-009', 'D10-010', 'D10-011', 'D10-012', 'D10-013', 'D10-014', 'D10-015', 'D10-016', 'D10-017'] |
| `DeleteWorktreeDialogDescription.tsx` | ['D10-018'] |
| `DeleteWorktreeDialogFooter.tsx` | ['D10-011', 'D10-019'] |
| `DeleteWorktreeTargetPreview.tsx` | ['D10-020', 'D10-021', 'D10-022', 'D10-023'] |
| `ImportedWorktreesVisibilityLine.tsx` | ['D10-024', 'D10-025', 'D10-026', 'D10-027', 'D10-028', 'D10-029', 'D10-030'] |
| `NewExternalWorktreesInboxLine.tsx` | ['D10-031', 'D10-032', 'D10-033', 'D10-034'] |
| `NoticeHostGlyph.tsx` | ['D10-035', 'D10-036', 'D10-037'] |
| `WorktreeVisibilityDialog.tsx` | ['D10-038', 'D10-039', 'D10-040', 'D10-041', 'D10-042', 'D10-043', 'D10-044', 'D10-045', 'D10-046', 'D10-047', 'D10-048', 'D10-049'] |
| `WorktreeVisibilityGlobalSettingsLink.tsx` | ['D10-050', 'D10-051'] |
| `WorktreeVisibilityHelpPopover.tsx` | ['D10-052'] |
| `WorktreeVisibilityScanStatus.tsx` | ['D10-053'] |
| `WorktreeVisibilitySourceAddForm.tsx` | ['D10-054'] |
| `WorktreeVisibilitySourceList.tsx` | ['D10-055', 'D10-056', 'D10-057', 'D10-058', 'D10-059', 'D10-060', 'D10-061', 'D10-062'] |
| `imported-worktrees-card-actions.ts` | ['D10-063', 'D10-064'] |
| `imported-worktrees-card-candidates.ts` | ['D10-065', 'D10-066'] |
| `new-external-worktrees-inbox-actions.ts` | ['D10-067', 'D10-068', 'D10-069', 'D10-070'] |
| `new-external-worktrees-inbox-candidates.ts` | ['D10-071'] |
| `prompt-cache-countdown-clock.ts` | ['D10-072', 'D10-073', 'D10-074'] |
| `prompt-cache-timer-selection.ts` | ['D10-075', 'D10-076'] |
| `stale-workspace-list-toast.ts` | ['D10-077'] |
| `use-feedback-image-drop.ts` | ['D10-078', 'D10-079'] |
| `use-sidebar-feedback-environment-prefill.ts` | ['D10-080'] |
| `use-sidebar-feedback-images.ts` | ['D10-081', 'D10-082'] |
| `worktree-visibility-host-target.ts` | ['D10-083', 'D10-084'] |
| `worktree-visibility-mutation-fence.ts` | ['D10-085', 'D10-086'] |
| `worktree-visibility-repo-sources.ts` | ['D10-087'] |
| `worktree-visibility-source-mutation.ts` | ['D10-088'] |
| `worktree-visibility-update-error.ts` | ['D10-089'] |
| `worktree-visibility-use-global.ts` | ['D10-090'] |

### Simbolos exportados -> ids (66)

| entrada | id |
|---|---|
| `DeleteWorktreeDialog.tsx:default` | D10-005 |
| `ImportedWorktreesVisibilityLine.tsx:default` | D10-024 |
| `NewExternalWorktreesInboxLine.tsx:default` | D10-031 |
| `NoticeHostGlyph.tsx:default` | D10-035 |
| `WorktreeVisibilityDialog.tsx:default` | D10-038 |
| `WorktreeVisibilityHelpPopover.tsx:default` | D10-052 |
| `WorktreeVisibilitySourceList.tsx:default` | D10-055 |
| `ActiveVisibilityMutation` | D10-085 |
| `AutoRenameFailedDialog` | D10-001 |
| `DeleteWorktreeDialogDescription` | D10-018 |
| `DeleteWorktreeDialogFooter` | D10-019 |
| `DeleteWorktreeTargetPreview` | D10-020 |
| `FeedbackImageDrop` | D10-078 |
| `IMPORTED_WORKTREES_KEEP_HIDDEN_ERROR` | D10-064 |
| `IMPORTED_WORKTREES_SHOW_ERROR` | D10-063 |
| `ImportedWorktreeCardActionState` | D10-063 |
| `ImportedWorktreeVisibilityPreview` | D10-024 |
| `ImportedWorktreesVisibilityLine` | D10-024 |
| `ImportedWorktreesVisibilityPlacement` | D10-024 |
| `NewExternalWorktreesInboxActionState` | D10-067 |
| `NewExternalWorktreesInboxLine` | D10-031 |
| `NoticeHostGlyph` | D10-035 |
| `PromptCacheCountdownSelection` | D10-076 |
| `WorktreeVisibilityDialog` | D10-038 |
| `WorktreeVisibilityGlobalSettingsLink` | D10-050 |
| `WorktreeVisibilityHelpPopover` | D10-052 |
| `WorktreeVisibilityScanStatus` | D10-053 |
| `WorktreeVisibilitySourceAddForm` | D10-054 |
| `WorktreeVisibilitySourceAddResult` | D10-054 |
| `WorktreeVisibilitySourceList` | D10-055 |
| `WorktreeVisibilitySourceMutation` | D10-088 |
| `WorktreeVisibilitySourceRow` | D10-055 |
| `buildImportedWorktreesCardCandidates` | D10-066 |
| `buildNewExternalWorktreesInboxCandidates` | D10-071 |
| `createWorktreeVisibilitySourceMutation` | D10-088 |
| `createWorktreeVisibilityUseGlobalMutation` | D10-090 |
| `finishVisibilityMutation` | D10-085 |
| `getActiveVisibilityMutation` | D10-085 |
| `getHiddenImportedWorktrees` | D10-065 |
| `getLatestRepoForVisibilityScope` | D10-087 |
| `getMostUrgentPromptCacheStartedAt` | D10-075 |
| `getPromptCacheCountdownForPane` | D10-076 |
| `getRepoCustomWorktreeVisibilitySourceIds` | D10-087 |
| `getWorktreeVisibilitySourceLabel` | D10-055 |
| `groupWorktreesByParentPath` | D10-030 |
| `importNewExternalWorktreeInboxPaths` | D10-067 |
| `isDuplicateWorktreeVisibilitySource` | D10-087 |
| `keepImportedWorktreesHiddenCard` | D10-064 |
| `keepNewExternalWorktreeInboxHidden` | D10-068 |
| `resolveWorktreeVisibilityHostTarget` | D10-083 |
| `shouldUseGlobalWorktreeVisibility` | D10-090 |
| `showImportedWorktreesCard` | D10-063 |
| `showNoDeletableWorkspacesToast` | D10-077 |
| `showWorkspaceListChangedToast` | D10-077 |
| `startVisibilityMutation` | D10-085 |
| `subscribePromptCacheCountdownClock` | D10-072 |
| `subscribeToVisibilityMutation` | D10-085 |
| `suppressNewExternalWorktreeInbox` | D10-069 |
| `useFeedbackImageDrop` | D10-078 |
| `usePromptCacheCountdownNow` | D10-074 |
| `useSidebarFeedbackEnvironmentPrefill` | D10-080 |
| `useSidebarFeedbackImages` | D10-081 |
| `useVisibilityMutationFence` | D10-086 |
| `useWorktreeVisibilityHostActions` | D10-084 |
| `worktreeVisibilitySourceRowKey` | D10-055 |
| `worktreeVisibilityUpdateError` | D10-089 |

### Casos de teste -> ids (163)

| entrada | id |
|---|---|
| `components/sidebar/AutoRenameFailedDialog.test.tsx:50 :: AutoRenameFailedDialog full output` | D10-001 |
| `components/sidebar/AutoRenameFailedDialog.test.tsx:51 :: shows the full CLI output fetched from main when available` | D10-001 |
| `components/sidebar/AutoRenameFailedDialog.test.tsx:61 :: falls back to the persisted excerpt when main holds no capture` | D10-001 |
| `components/sidebar/AutoRenameFailedDialog.test.tsx:67 :: falls back to the persisted excerpt when the fetch rejects` | D10-001 |
| `components/sidebar/AutoRenameFailedDialog.test.tsx:73 :: refetches full output when a retry changes the persisted error` | D10-001 |
| `components/sidebar/AutoRenameFailedDialog.test.tsx:89 :: AutoRenameFailedDialog unbroken output containment` | D10-004 |
| `components/sidebar/AutoRenameFailedDialog.test.tsx:90 :: keeps the output surface shrinkable and breakable mid-token` | D10-004 |
| `components/sidebar/DeleteWorktreeDialog.host-context-boundary.test.ts:15 :: DeleteWorktreeDialog host-context boundaries` | D10-016 |
| `components/sidebar/DeleteWorktreeDialog.host-context-boundary.test.ts:16 :: preloads git status from the selected worktree owner instead of the focused host` | D10-016 |
| `components/sidebar/DeleteWorktreeDialog.host-context-boundary.test.ts:25 :: does not restart pending status requests when one target hydrates` | D10-016 |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:166 :: DeleteWorktreeDialog lineage copy` | D10-006 |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:185 :: labels the confirmed single-host target when workspace ids collide` | D10-023 |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:216 :: keeps Space safety-checked confirmation non-force` | D10-013 |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:238 :: shows child-delete copy and only a delete-all action when the workspace has children` | D10-008 |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:280 :: keeps long child workspace paths constrained inside the lineage notice` | D10-008 |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:300 :: uses non-destructive disk copy for folder workspace deletes` | D10-006 |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:325 :: keeps a space between remove copy and the workspace name` | D10-018 |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:339 :: shows an inline warning when the workspace has uncommitted or untracked changes` | D10-022 |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:358 :: shows locked and known dirty details without offering a lock override` | D10-009 |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:384 :: notifies the dialog caller after a toast force delete succeeds` | D10-014 |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:415 :: rejects confirmation when the workspace instance changed after the dialog opened` | D10-013 |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:439 :: rejects lineage confirmation when a descendant instance changed` | D10-015 |
| `components/sidebar/DeleteWorktreeTargetPreview.test.tsx:106 :: keeps an unqualified colliding target distinct from local` | D10-021 |
| `components/sidebar/DeleteWorktreeTargetPreview.test.tsx:116 :: omits host metadata from every ordinary batch row` | D10-020 |
| `components/sidebar/DeleteWorktreeTargetPreview.test.tsx:130 :: includes the host in a colliding single target region and its accessible name` | D10-023 |
| `components/sidebar/DeleteWorktreeTargetPreview.test.tsx:146 :: omits the host from an ordinary single target region` | D10-023 |
| `components/sidebar/DeleteWorktreeTargetPreview.test.tsx:66 :: DeleteWorktreeTargetPreview host labels` | D10-020 |
| `components/sidebar/DeleteWorktreeTargetPreview.test.tsx:67 :: binds saved SSH and runtime host names to their colliding batch rows` | D10-021 |
| `components/sidebar/DeleteWorktreeTargetPreview.test.tsx:85 :: uses configured display-label overrides for colliding hosts` | D10-021 |
| `components/sidebar/ImportedWorktreesVisibilityLine.test.tsx:104 :: normalizes Windows parent path separators in preview groups` | D10-030 |
| `components/sidebar/ImportedWorktreesVisibilityLine.test.tsx:117 :: keeps Windows drive roots as parent path labels` | D10-030 |
| `components/sidebar/ImportedWorktreesVisibilityLine.test.tsx:129 :: keeps UNC share roots as parent path labels` | D10-030 |
| `components/sidebar/ImportedWorktreesVisibilityLine.test.tsx:151 :: disables actions while pending and renders inline errors` | D10-029 |
| `components/sidebar/ImportedWorktreesVisibilityLine.test.tsx:56 :: ImportedWorktreesVisibilityLine` | D10-024 |
| `components/sidebar/ImportedWorktreesVisibilityLine.test.tsx:57 :: renders the compact repo-group line with expand and dismiss actions` | D10-024 |
| `components/sidebar/ImportedWorktreesVisibilityLine.test.tsx:76 :: names the host when the project is checked out on more than one` | D10-027 |
| `components/sidebar/ImportedWorktreesVisibilityLine.test.tsx:86 :: folds the host into pinned fallback copy, which already names the repo` | D10-024 |
| `components/sidebar/ImportedWorktreesVisibilityLine.test.tsx:96 :: scopes pinned fallback copy to the repo name without a dismiss action` | D10-024 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:102 :: names the host so two checkouts of one project are distinguishable` | D10-032 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:116 :: host-qualifies the suppress control, which writes to that host alone` | D10-032 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:126 :: stays unqualified when the project has a single checkout` | D10-032 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:134 :: keeps suppress as a hover-revealed control that does not trigger review` | D10-033 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:155 :: disables both actions while a mutation is pending` | D10-033 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:167 :: renders nothing when the inbox is empty` | D10-031 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:173 :: surfaces the action error as an alert` | D10-034 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:55 :: NewExternalWorktreesInboxLine` | D10-031 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:68 :: states the count without naming any worktree` | D10-031 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:78 :: opens review from a single card-wide button` | D10-031 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:92 :: uses the singular noun for one worktree` | D10-031 |
| `components/sidebar/NoticeHostGlyph.test.tsx:106 :: gives the local host the monitor glyph the run-target rows use` | D10-036 |
| `components/sidebar/NoticeHostGlyph.test.tsx:115 :: makes a passive row glyph keyboard reachable with an accessible name` | D10-036 |
| `components/sidebar/NoticeHostGlyph.test.tsx:124 :: does not add a nested tab stop when the glyph is inside a button` | D10-035 |
| `components/sidebar/NoticeHostGlyph.test.tsx:132 :: draws one glyph vocabulary: a monitor for local, a server for remote` | D10-035 |
| `components/sidebar/NoticeHostGlyph.test.tsx:147 :: keeps its copy in the English catalog` | D10-035 |
| `components/sidebar/NoticeHostGlyph.test.tsx:56 :: NoticeHostGlyph` | D10-035 |
| `components/sidebar/NoticeHostGlyph.test.tsx:67 :: names the SSH host it would act on` | D10-035 |
| `components/sidebar/NoticeHostGlyph.test.tsx:76 :: names the paired runtime separately from the SSH host of the same name` | D10-035 |
| `components/sidebar/NoticeHostGlyph.test.tsx:86 :: marks a paired runtime a probe found unreachable as disconnected` | D10-037 |
| `components/sidebar/NoticeHostGlyph.test.tsx:95 :: does not call a host disconnected before its first probe answers` | D10-035 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:246 :: WorktreeVisibilityDialog` | D10-038 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:247 :: links directly to the global visibility defaults` | D10-050 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:263 :: lists a hidden agent worktree with a repo-relative path` | D10-048 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:276 :: bounds rendered rows for repositories with many hidden worktrees` | D10-048 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:306 :: gives each hidden worktree action a distinct accessible name` | D10-048 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:324 :: recovers a hidden worktree per path through the existing import exception` | D10-042 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:340 :: omits the hidden list when nothing is recoverable` | D10-048 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:348 :: says it is checking instead of claiming nothing is hidden on a fallback snapshot` | D10-040 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:362 :: offers a retry instead of a dead end when the list cannot be read` | D10-041 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:384 :: keeps rows visible but not actionable until the open-time scan settles` | D10-040 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:395 :: locks the repo-wide toggle until the open-time scan settles` | D10-040 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:403 :: reports a failed refresh even while an older trusted snapshot is on screen` | D10-040 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:415 :: locks retry while a row import is in flight, so it cannot race the write` | D10-042 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:427 :: locks the repo-wide toggle while a row import is in flight` | D10-042 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:437 :: locks row actions and retry while the repo-wide toggle is in flight` | D10-043 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:448 :: clears a stale failure once a row import refreshes the list successfully` | D10-042 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:459 :: does not leak an old repo action failure into a newly opened repo` | D10-043 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:476 :: keeps a remounted repo locked until its earlier row action settles` | D10-086 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:498 :: keeps a remounted repo locked until its earlier toggle settles` | D10-086 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:520 :: does not carry a mutation fence across same-id repos on different hosts` | D10-083 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:571 :: reports a failed persistent visibility update without starting a refresh` | D10-043 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:584 :: does not report success when an older host strips additive source settings (STA-4092)` | D10-089 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:598 :: reports a failed authoritative refresh after updating persistent visibility` | D10-043 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:612 :: toggles built-in sources independently` | D10-043 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:628 :: shows when source visibility is inherited from the global default` | D10-056 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:641 :: lists what each inheritable source is set to in global settings` | D10-051 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:657 :: names the global value an override is ignoring and reverts on the same control` | D10-061 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:682 :: materializes the remaining legacy source override when one source reverts to global` | D10-044 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:695 :: migrates legacy Always show to both built-in source rows` | D10-056 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:718 :: keeps ordinary non-Orca visibility on its own source row` | D10-056 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:732 :: adds custom locations disabled by default` | D10-046 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:766 :: keeps source matching stable while typing in the inline form` | D10-054 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:784 :: distinguishes invalid, duplicate, limit, and save failures when adding a source` | D10-054 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:824 :: reports only unsupported-host copy when an older host strips an added source` | D10-089 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:842 :: removes custom locations without changing other source preferences` | D10-047 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:870 :: rejects removal success when an older host leaves the custom preference behind` | D10-047 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:891 :: uses full paths to distinguish custom source controls with the same basename` | D10-060 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:909 :: shows inherited global locations without repository removal controls` | D10-055 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:928 :: resets global custom and Other locations without changing their global defaults` | D10-044 |
| `components/sidebar/WorktreeVisibilityHelpPopover.test.tsx:104 :: dismisses when the user clicks outside` | D10-052 |
| `components/sidebar/WorktreeVisibilityHelpPopover.test.tsx:48 :: WorktreeVisibilityHelpPopover` | D10-052 |
| `components/sidebar/WorktreeVisibilityHelpPopover.test.tsx:49 :: stays closed when the trigger receives initial dialog focus` | D10-052 |
| `components/sidebar/WorktreeVisibilityHelpPopover.test.tsx:58 :: opens on pointer hover and closes when the pointer leaves` | D10-052 |
| `components/sidebar/WorktreeVisibilityHelpPopover.test.tsx:86 :: opens without moving focus and dismisses with Escape` | D10-052 |
| `components/sidebar/WorktreeVisibilitySourceList.test.tsx:31 :: WorktreeVisibilitySourceList` | D10-055 |
| `components/sidebar/WorktreeVisibilitySourceList.test.tsx:32 :: counts a configured built-in base as another external location` | D10-057 |
| `components/sidebar/WorktreeVisibilitySourceList.test.tsx:69 :: offers a reset when a project override already matches the global value` | D10-059 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:113 :: the ` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:122 :: re-hides the sleeping default branch when the user opts out` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:128 :: keeps the sleeping default branch when the option is explicitly on` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:134 :: lets an explicit ` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:145 :: still sweeps sleeping non-main workspaces` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:156 :: keeps a sleeping folder workspace, which has no sibling row to fall back to` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:170 :: keeps a sleeping detached-HEAD main worktree` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:178 :: lets ` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:189 :: keeps every project’s entry point, not just the first` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:196 :: does not flicker out while an SSH host is offline` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:69 :: #8873 default-branch workspace under ` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:70 :: is genuinely the default-branch row the ` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:74 :: stays in the sidebar when it is sleeping and ` | D10-091 |
| `components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:88 :: exposes an opt-in that keeps the default branch visible under ` | D10-091 |
| `components/sidebar/imported-worktrees-card-actions.test.ts:105 :: leaves the card visible when keep-hidden update fails` | D10-064 |
| `components/sidebar/imported-worktrees-card-actions.test.ts:13 :: imported worktrees card actions` | D10-063 |
| `components/sidebar/imported-worktrees-card-actions.test.ts:25 :: shows discovered worktrees after visibility update and refresh succeed` | D10-063 |
| `components/sidebar/imported-worktrees-card-actions.test.ts:37 :: rolls visibility back when refresh fails after showing` | D10-063 |
| `components/sidebar/imported-worktrees-card-actions.test.ts:50 :: preserves force-visible state during a retry after rollback failure` | D10-063 |
| `components/sidebar/imported-worktrees-card-actions.test.ts:74 :: keeps the card force-visible when rollback fails after a refresh failure` | D10-063 |
| `components/sidebar/imported-worktrees-card-actions.test.ts:89 :: dismisses the card when keep-hidden update succeeds` | D10-064 |
| `components/sidebar/imported-worktrees-card-candidates.test.ts:111 :: builds no candidate when the only hidden worktrees are agent scratch` | D10-066 |
| `components/sidebar/imported-worktrees-card-candidates.test.ts:129 :: suppresses candidates after show, dismissal, folder repos, or repo filters exclude the repo` | D10-066 |
| `components/sidebar/imported-worktrees-card-candidates.test.ts:162 :: keeps candidates visible after a rollback failure forces a shown repo to render the card` | D10-066 |
| `components/sidebar/imported-worktrees-card-candidates.test.ts:176 :: builds candidates even when workspace-row filters hide every visible worktree` | D10-066 |
| `components/sidebar/imported-worktrees-card-candidates.test.ts:70 :: getHiddenImportedWorktrees` | D10-065 |
| `components/sidebar/imported-worktrees-card-candidates.test.ts:71 :: returns only authoritative hidden external worktrees` | D10-065 |
| `components/sidebar/imported-worktrees-card-candidates.test.ts:90 :: suppresses non-authoritative results` | D10-065 |
| `components/sidebar/imported-worktrees-card-candidates.test.ts:97 :: buildImportedWorktreesCardCandidates` | D10-066 |
| `components/sidebar/imported-worktrees-card-candidates.test.ts:98 :: builds a candidate for hidden imported worktrees in a visible repo` | D10-066 |
| `components/sidebar/new-external-worktrees-inbox-actions.test.ts:16 :: new external worktree inbox actions` | D10-067 |
| `components/sidebar/new-external-worktrees-inbox-actions.test.ts:17 :: imports inbox worktrees into the sidebar allowlist` | D10-067 |
| `components/sidebar/new-external-worktrees-inbox-actions.test.ts:39 :: rolls import path lists back with explicit empty arrays when refresh fails` | D10-067 |
| `components/sidebar/new-external-worktrees-inbox-actions.test.ts:63 :: extends the inbox baseline when keeping a batch hidden` | D10-068 |
| `components/sidebar/new-external-worktrees-inbox-actions.test.ts:83 :: permanently suppresses the inbox and baselines the current batch` | D10-069 |
| `components/sidebar/new-external-worktrees-inbox-candidates.test.ts:65 :: buildNewExternalWorktreesInboxCandidates` | D10-071 |
| `components/sidebar/new-external-worktrees-inbox-candidates.test.ts:66 :: builds inbox candidates only after the initial prompt is dismissed` | D10-071 |
| `components/sidebar/new-external-worktrees-inbox-candidates.test.ts:91 :: suppresses inbox candidates when discovery is permanently hidden or visibility is show` | D10-071 |
| `components/sidebar/prompt-cache-countdown-clock.test.ts:17 :: uses one interval for all prompt-cache countdown subscribers` | D10-072 |
| `components/sidebar/prompt-cache-countdown-clock.test.ts:4 :: subscribePromptCacheCountdownClock` | D10-072 |
| `components/sidebar/prompt-cache-countdown-clock.test.ts:41 :: pauses the interval while the document is hidden` | D10-073 |
| `components/sidebar/prompt-cache-timer-selection.test.ts:11 :: getMostUrgentPromptCacheStartedAt` | D10-075 |
| `components/sidebar/prompt-cache-timer-selection.test.ts:12 :: selects the oldest non-null timer for the worktree tabs in one cache pass` | D10-075 |
| `components/sidebar/prompt-cache-timer-selection.test.ts:23 :: does not match tab id prefixes or malformed keys` | D10-075 |
| `components/sidebar/prompt-cache-timer-selection.test.ts:34 :: getPromptCacheCountdownForPane` | D10-076 |
| `components/sidebar/prompt-cache-timer-selection.test.ts:35 :: selects the exact pane timer with the ttl used for gating` | D10-076 |
| `components/sidebar/prompt-cache-timer-selection.test.ts:51 :: does not fall back to seed timers for per-pane row ownership` | D10-076 |
| `components/sidebar/prompt-cache-timer-selection.test.ts:57 :: rejects malformed pane keys and null timer values` | D10-076 |
| `components/sidebar/prompt-cache-timer-selection.test.ts:64 :: requires a positive ttl` | D10-076 |
| `components/sidebar/use-feedback-image-drop.test.tsx:102 :: leaves drops outside the dialog to the existing native lane` | D10-079 |
| `components/sidebar/use-feedback-image-drop.test.tsx:116 :: ignores non-image drops so they keep their existing behavior` | D10-079 |
| `components/sidebar/use-feedback-image-drop.test.tsx:132 :: stops listening once the dialog is closed` | D10-079 |
| `components/sidebar/use-feedback-image-drop.test.tsx:147 :: accepts the drag on dragover so the drop can fire without preload` | D10-078 |
| `components/sidebar/use-feedback-image-drop.test.tsx:159 :: leaves in-app drags alone on dragover` | D10-078 |
| `components/sidebar/use-feedback-image-drop.test.tsx:170 :: highlights from the advertised drag types, which is all a dragenter exposes` | D10-078 |
| `components/sidebar/use-feedback-image-drop.test.tsx:86 :: useFeedbackImageDrop` | D10-079 |
| `components/sidebar/use-feedback-image-drop.test.tsx:87 :: claims an image dropped on the dialog before preload can route it away` | D10-079 |

### Labels/aria -> ids (57)

| entrada | id |
|---|---|
| `components/sidebar/AutoRenameFailedDialog.tsx:133` | D10-002 |
| `components/sidebar/AutoRenameFailedDialog.tsx:28` | INFRA: linha de comentario de doc capturada pelo regex (nao e label) |
| `components/sidebar/DeleteWorktreeDialog.test.tsx:95` | INFRA: mock do Tooltip no teste (nao e label de produto) |
| `components/sidebar/ImportedWorktreesVisibilityLine.test.tsx:8` | INFRA: import de TooltipProvider no teste |
| `components/sidebar/ImportedWorktreesVisibilityLine.tsx:145` | D10-025 |
| `components/sidebar/ImportedWorktreesVisibilityLine.tsx:181` | D10-026 |
| `components/sidebar/ImportedWorktreesVisibilityLine.tsx:198` | D10-028 |
| `components/sidebar/ImportedWorktreesVisibilityLine.tsx:225` | D10-028 |
| `components/sidebar/ImportedWorktreesVisibilityLine.tsx:5` | INFRA: import de Tooltip/TooltipContent/TooltipTrigger |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:121` | D10-032 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:13` | INFRA: fixture de tooltip-content do teste |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:140` | D10-032 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:161` | D10-032 |
| `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:9` | INFRA: mock do Tooltip no teste |
| `components/sidebar/NewExternalWorktreesInboxLine.tsx:135` | D10-032 |
| `components/sidebar/NewExternalWorktreesInboxLine.tsx:5` | INFRA: import de Tooltip/TooltipContent/TooltipTrigger |
| `components/sidebar/NewExternalWorktreesInboxLine.tsx:89` | D10-031 |
| `components/sidebar/NoticeHostGlyph.test.tsx:100` | D10-035 |
| `components/sidebar/NoticeHostGlyph.test.tsx:110` | D10-035 |
| `components/sidebar/NoticeHostGlyph.test.tsx:117` | D10-036 |
| `components/sidebar/NoticeHostGlyph.test.tsx:128` | D10-036 |
| `components/sidebar/NoticeHostGlyph.test.tsx:24` | INFRA: mock do Tooltip no teste |
| `components/sidebar/NoticeHostGlyph.test.tsx:27` | INFRA: helper de mock (cloneElement) do teste |
| `components/sidebar/NoticeHostGlyph.test.tsx:29` | INFRA: fixture tooltip do teste |
| `components/sidebar/NoticeHostGlyph.test.tsx:5` | INFRA: comentario de cabecalho do teste |
| `components/sidebar/NoticeHostGlyph.test.tsx:71` | D10-035 |
| `components/sidebar/NoticeHostGlyph.test.tsx:81` | D10-035 |
| `components/sidebar/NoticeHostGlyph.test.tsx:90` | D10-035 |
| `components/sidebar/NoticeHostGlyph.tsx:24` | INFRA: comentario de doc capturado pelo regex |
| `components/sidebar/NoticeHostGlyph.tsx:3` | INFRA: import de Tooltip/TooltipContent/TooltipTrigger |
| `components/sidebar/NoticeHostGlyph.tsx:48` | D10-035 |
| `components/sidebar/NoticeHostGlyph.tsx:75` | D10-036 |
| `components/sidebar/NoticeHostGlyph.tsx:90` | D10-035 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:200` | INFRA: helper sourceSegment do teste |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:202` | D10-060 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:213` | INFRA: helper sourceRow do teste |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:272` | D10-052 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:291` | N/A: aria-label de HiddenWorktreeRecoveryList (arquivo produtivo fora do manifest D10); comportamento coberto por D10-048 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:317` | N/A: aria-label de HiddenWorktreeRecoveryList (fora do manifest D10); coberto por D10-048 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:320` | N/A: aria-label de HiddenWorktreeRecoveryList (fora do manifest D10); coberto por D10-048 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:49` | INFRA: mock do Tooltip no teste |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:853` | D10-058 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:883` | D10-058 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:905` | D10-058 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:906` | D10-058 |
| `components/sidebar/WorktreeVisibilityDialog.test.tsx:921` | D10-058 |
| `components/sidebar/WorktreeVisibilityHelpPopover.test.tsx:32` | D10-052 |
| `components/sidebar/WorktreeVisibilityHelpPopover.tsx:27` | D10-052 |
| `components/sidebar/WorktreeVisibilityHelpPopover.tsx:35` | D10-052 |
| `components/sidebar/WorktreeVisibilitySourceAddForm.tsx:56` | D10-054 |
| `components/sidebar/WorktreeVisibilitySourceList.test.tsx:11` | INFRA: mock do Tooltip no teste |
| `components/sidebar/WorktreeVisibilitySourceList.test.tsx:97` | D10-059 |
| `components/sidebar/WorktreeVisibilitySourceList.tsx:141` | D10-060 |
| `components/sidebar/WorktreeVisibilitySourceList.tsx:276` | D10-058 |
| `components/sidebar/WorktreeVisibilitySourceList.tsx:301` | D10-059 |
| `components/sidebar/WorktreeVisibilitySourceList.tsx:320` | D10-060 |
| `components/sidebar/WorktreeVisibilitySourceList.tsx:5` | INFRA: import de Tooltip/TooltipContent/TooltipTrigger |

### Hotkeys -> ids (1)

| entrada | id |
|---|---|
| `new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })` | D10-052 |

### Timers -> ids (4)

| entrada | id |
|---|---|
| `await act(async () => new Promise((resolve) => setTimeout(resolve, 0)))` | INFRA: awaiter de act() no teste, nao e timer de produto |
| `copiedResetTimerRef.current = window.setTimeout(() => {` | D10-002 |
| `let timer: ReturnType<typeof setInterval> | null = null` | D10-072 |
| `timer = setInterval(publishTick, 1000)` | D10-072 |

### Subscriptions -> ids (13)

| entrada | id |
|---|---|
| `components/sidebar/AutoRenameFailedDialog.tsx:42` | D10-002 |
| `components/sidebar/AutoRenameFailedDialog.tsx:50` | D10-001 |
| `components/sidebar/DeleteWorktreeDialog.host-context-boundary.test.ts:26` | D10-016 |
| `components/sidebar/DeleteWorktreeDialog.tsx:201` | D10-005 |
| `components/sidebar/WorktreeVisibilityDialog.tsx:117` | D10-040 |
| `components/sidebar/prompt-cache-countdown-clock.ts:48` | D10-073 |
| `components/sidebar/use-feedback-image-drop.test.tsx:32` | D10-079 |
| `components/sidebar/use-feedback-image-drop.ts:67` | D10-079 |
| `components/sidebar/use-feedback-image-drop.ts:90` | D10-079 |
| `components/sidebar/use-feedback-image-drop.ts:91` | D10-079 |
| `components/sidebar/use-sidebar-feedback-environment-prefill.ts:53` | D10-080 |
| `components/sidebar/use-sidebar-feedback-images.ts:43` | D10-082 |
| `components/sidebar/worktree-visibility-mutation-fence.ts:58` | D10-086 |

### Preload/backend -> ids (2)

| entrada | id |
|---|---|
| `await window.api.ui.writeClipboardText(detailText)` | D10-002 |
| `window.api.worktrees` | D10-001 |

## N/A / INFRA / DUP explicitos

- `components/sidebar/AutoRenameFailedDialog.tsx:28` -> INFRA: linha de comentario de doc capturada pelo regex (nao e label)
- `components/sidebar/DeleteWorktreeDialog.test.tsx:95` -> INFRA: mock do Tooltip no teste (nao e label de produto)
- `components/sidebar/ImportedWorktreesVisibilityLine.test.tsx:8` -> INFRA: import de TooltipProvider no teste
- `components/sidebar/ImportedWorktreesVisibilityLine.tsx:5` -> INFRA: import de Tooltip/TooltipContent/TooltipTrigger
- `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:9` -> INFRA: mock do Tooltip no teste
- `components/sidebar/NewExternalWorktreesInboxLine.test.tsx:13` -> INFRA: fixture de tooltip-content do teste
- `components/sidebar/NewExternalWorktreesInboxLine.tsx:5` -> INFRA: import de Tooltip/TooltipContent/TooltipTrigger
- `components/sidebar/NoticeHostGlyph.test.tsx:5` -> INFRA: comentario de cabecalho do teste
- `components/sidebar/NoticeHostGlyph.test.tsx:24` -> INFRA: mock do Tooltip no teste
- `components/sidebar/NoticeHostGlyph.test.tsx:27` -> INFRA: helper de mock (cloneElement) do teste
- `components/sidebar/NoticeHostGlyph.test.tsx:29` -> INFRA: fixture tooltip do teste
- `components/sidebar/NoticeHostGlyph.tsx:3` -> INFRA: import de Tooltip/TooltipContent/TooltipTrigger
- `components/sidebar/NoticeHostGlyph.tsx:24` -> INFRA: comentario de doc capturado pelo regex
- `components/sidebar/WorktreeVisibilityDialog.test.tsx:49` -> INFRA: mock do Tooltip no teste
- `components/sidebar/WorktreeVisibilityDialog.test.tsx:200` -> INFRA: helper sourceSegment do teste
- `components/sidebar/WorktreeVisibilityDialog.test.tsx:213` -> INFRA: helper sourceRow do teste
- `components/sidebar/WorktreeVisibilityDialog.test.tsx:291` -> N/A: aria-label de HiddenWorktreeRecoveryList (arquivo produtivo fora do manifest D10); comportamento coberto por D10-048
- `components/sidebar/WorktreeVisibilityDialog.test.tsx:317` -> N/A: aria-label de HiddenWorktreeRecoveryList (fora do manifest D10); coberto por D10-048
- `components/sidebar/WorktreeVisibilityDialog.test.tsx:320` -> N/A: aria-label de HiddenWorktreeRecoveryList (fora do manifest D10); coberto por D10-048
- `components/sidebar/WorktreeVisibilitySourceList.test.tsx:11` -> INFRA: mock do Tooltip no teste
- `components/sidebar/WorktreeVisibilitySourceList.tsx:5` -> INFRA: import de Tooltip/TooltipContent/TooltipTrigger
- `await act(async () => new Promise((resolve) => setTimeout(resolve, 0)))` -> INFRA: awaiter de act() no teste, nao e timer de produto

## Linhas de inventario

| id | capability | surface | trigger | evidence |
|---|---|---|---|---|
| D10-001 | Ver o output completo do CLI que falhou no auto-rename, com fallback para o excerto persistido | dialog modal "Branch auto-name failed" | abrir o dialog (open) ou mudar worktreeId/error | components/sidebar/AutoRenameFailedDialog.tsx:31, components/sidebar/AutoRenameFailedDialog.tsx:50, components/sidebar/AutoRenameFailedDialog.tsx:56, components/sidebar/AutoRenameFailedDialog.tsx:73, components/sidebar/AutoRenameFailedDialog.tsx:147 |
| D10-002 | Copiar os detalhes do erro de auto-rename para o clipboard com confirmacao inline | "Error details" no dialog | clicar o botao de copia | components/sidebar/AutoRenameFailedDialog.tsx:80, components/sidebar/AutoRenameFailedDialog.tsx:85, components/sidebar/AutoRenameFailedDialog.tsx:132, components/sidebar/AutoRenameFailedDialog.tsx:133 |
| D10-003 | Titulo, narrativa e botao Close do dialog de falha de auto-rename | dialog modal | renderizacao / clique em Close | components/sidebar/AutoRenameFailedDialog.tsx:94, components/sidebar/AutoRenameFailedDialog.tsx:95, components/sidebar/AutoRenameFailedDialog.tsx:100, components/sidebar/AutoRenameFailedDialog.tsx:107, components/sidebar/AutoRenameFailedDialog.tsx:155 |
| D10-004 | Conter output multi-linha/token gigante sem quebrar o grid do dialog | "Error details" scroll region | renderizar output longo ou com token sem espaco | components/sidebar/AutoRenameFailedDialog.tsx:147, components/sidebar/AutoRenameFailedDialog.tsx:122 |
| D10-005 | Abrir/fechar o dialog de confirmacao de delete de workspace com resolucao de alvos por id+host | modal de confirmacao destrutiva do sidebar | activeModal === 'delete-worktree' (menu de contexto do card) | components/sidebar/DeleteWorktreeDialog.tsx:40, components/sidebar/DeleteWorktreeDialog.tsx:58, components/sidebar/DeleteWorktreeDialog.tsx:88, components/sidebar/DeleteWorktreeDialog.tsx:201, components/sidebar/DeleteWorktreeDialog.tsx:219 |
| D10-006 | Titulo e frase destrutiva do dialog (workspace unico, batch e lineage) | header do dialog | abrir o dialog | components/sidebar/DeleteWorktreeDialog.tsx:353, components/sidebar/DeleteWorktreeDialog.tsx:355, components/sidebar/DeleteWorktreeDialog.tsx:365 |
| D10-007 | Preview do alvo do delete (unico ou lista batch) com labels de host em colisao | corpo do dialog | abrir o dialog | components/sidebar/DeleteWorktreeDialog.tsx:378 |
| D10-008 | Aviso de lineage com descendentes que serao deletados junto | corpo do dialog, quando o workspace tem filhos | workspace com descendants > 0 | components/sidebar/DeleteWorktreeDialog.tsx:140, components/sidebar/DeleteWorktreeDialog.tsx:388 |
| D10-009 | Painel de bloqueio do main worktree e painel de erro do delete | corpo do dialog | worktree.isMainWorktree ou deleteState.error | components/sidebar/DeleteWorktreeDialog.tsx:139, components/sidebar/DeleteWorktreeDialog.tsx:395 |
| D10-010 | Checkbox 'Don't ask again' com persistencia de preferencia e reset ao fechar | rodape do corpo do dialog | toggle do checkbox | components/sidebar/DeleteWorktreeDialog.tsx:153, components/sidebar/DeleteWorktreeDialog.tsx:155, components/sidebar/DeleteWorktreeDialog.tsx:243, components/sidebar/DeleteWorktreeDialog.tsx:401 |
| D10-011 | Botoes do rodape: Cancel/Close, Delete/Force Delete e Delete N Workspaces | footer do dialog | clique | components/sidebar/DeleteWorktreeDialogFooter.tsx:26, components/sidebar/DeleteWorktreeDialogFooter.tsx:45, components/sidebar/DeleteWorktreeDialogFooter.tsx:54, components/sidebar/DeleteWorktreeDialog.tsx:408 |
| D10-012 | Focar o botao de confirmacao ao abrir (fluxo 'Delete, Enter') | DialogContent do delete | onOpenAutoFocus | components/sidebar/DeleteWorktreeDialog.tsx:340, components/sidebar/DeleteWorktreeDialog.tsx:350 |
| D10-013 | Confirmar delete: valida instancias, dispara deletes paralelos e avisa caller | footer do dialog | clique em Delete/Force com alvos resolvidos | components/sidebar/DeleteWorktreeDialog.tsx:258, components/sidebar/DeleteWorktreeDialog.tsx:265 |
| D10-014 | Force delete de recuperacao a partir de toast/erro (sem persistir preferencia) | dialog/footer | canForceDelete (Primeira tentativa falhou e pode forcar) | components/sidebar/DeleteWorktreeDialog.tsx:251, components/sidebar/DeleteWorktreeDialog.tsx:283 |
| D10-015 | Deletar workspace pai + descendentes em um clique (delete-all lineage) | footer, botao 'Delete N Workspaces' | canDeleteAllLineage (lineageDeleteTargets.length > 1) | components/sidebar/DeleteWorktreeDialog.tsx:142, components/sidebar/DeleteWorktreeDialog.tsx:316 |
| D10-016 | Pre-hidratar git status a partir do host dono de cada alvo e calcular contagem de mudancas | background do dialog aberto | isOpen && deleteTargets | components/sidebar/DeleteWorktreeDialog.tsx:188, components/sidebar/DeleteWorktreeDialog.tsx:198, components/sidebar/DeleteWorktreeDialog.tsx:378 |
| D10-017 | Limpar estado de delete por alvo ao fechar (preservando alvos em andamento) | fechamento do dialog | overlay/Escape/Cancel | components/sidebar/DeleteWorktreeDialog.tsx:219 |
| D10-018 | Compor a frase de descricao com alvo e alvo-filho | DialogDescription do delete | renderizacao | components/sidebar/DeleteWorktreeDialogDescription.tsx:19, components/sidebar/DeleteWorktreeDialogDescription.tsx:24 |
| D10-019 | Matriz de rotulos do rodape e variante destrutiva | DeleteWorktreeDialogFooter | renderizacao / clique | components/sidebar/DeleteWorktreeDialogFooter.tsx:27, components/sidebar/DeleteWorktreeDialogFooter.tsx:50 |
| D10-020 | Lista batch de alvos com nomes acessiveis nome/path(/host) e estado por linha | DeleteWorktreeTargetPreview em modo batch | isBatchDelete | components/sidebar/DeleteWorktreeTargetPreview.tsx:60, components/sidebar/DeleteWorktreeTargetPreview.tsx:73, components/sidebar/DeleteWorktreeTargetPreview.tsx:74 |
| D10-021 | Distinguir linhas de batch com ids colididos pelo label de host | DeleteWorktreeTargetPreview batch/unico | dois worktrees com o mesmo id em hosts diferentes | components/sidebar/DeleteWorktreeTargetPreview.tsx:16, components/sidebar/DeleteWorktreeTargetPreview.tsx:31, components/sidebar/DeleteWorktreeTargetPreview.tsx:69 |
| D10-022 | Hint de mudancas locais/untracked por alvo, erro inline e spinner | linha do preview | dirtyChangeCountsByWorktreeId / deleteState.error / isDeleting | components/sidebar/DeleteWorktreeTargetPreview.tsx:96, components/sidebar/DeleteWorktreeTargetPreview.tsx:107, components/sidebar/DeleteWorktreeTargetPreview.tsx:112 |
| D10-023 | Preview de alvo unico como regiao rotulada | DeleteWorktreeTargetPreview modo unico | !isBatchDelete e worktree resolvido | components/sidebar/DeleteWorktreeTargetPreview.tsx:120, components/sidebar/DeleteWorktreeTargetPreview.tsx:124 |
| D10-024 | Linha compacta 'Hiding N discovered worktrees' com copia por placement e host | grupo de repo / fallback pinado na sidebar | renderizacao com hiddenWorktrees > 0 | components/sidebar/ImportedWorktreesVisibilityLine.tsx:108, components/sidebar/ImportedWorktreesVisibilityLine.tsx:132 |
| D10-025 | Botao expand/collapse da lista de worktrees ocultos | linha compacta | clique no chevron | components/sidebar/ImportedWorktreesVisibilityLine.tsx:144, components/sidebar/ImportedWorktreesVisibilityLine.tsx:150 |
| D10-026 | Dispensar ('Keep hidden') a linha de worktrees descobertos | linha compacta (hover/tooltip) | onKeepHidden presente | components/sidebar/ImportedWorktreesVisibilityLine.tsx:181, components/sidebar/ImportedWorktreesVisibilityLine.tsx:182 |
| D10-027 | Atribuir host a linha quando o projeto tem mais de um checkout | linha compacta | hostContextLabel definido e placement != pinned-fallback | components/sidebar/ImportedWorktreesVisibilityLine.tsx:156 |
| D10-028 | Detalhe expandido: grupos por pasta pai, preview limitado e 'Show more/fewer' | area expandida da linha | isExpanded | components/sidebar/ImportedWorktreesVisibilityLine.tsx:198, components/sidebar/ImportedWorktreesVisibilityLine.tsx:225, components/sidebar/ImportedWorktreesVisibilityLine.tsx:255, components/sidebar/ImportedWorktreesVisibilityLine.tsx:277 |
| D10-029 | Acoes do detalhe expandido e estados de pending/erro | area expandida | clique em 'Keep hidden' / 'Show in worktree list' | components/sidebar/ImportedWorktreesVisibilityLine.tsx:297, components/sidebar/ImportedWorktreesVisibilityLine.tsx:312, components/sidebar/ImportedWorktreesVisibilityLine.tsx:327 |
| D10-030 | Normalizar parent paths ao agrupar (Windows/UNC) e exportar o agrupador | helper exportado groupWorktreesByParentPath | chamada pura | components/sidebar/ImportedWorktreesVisibilityLine.tsx:76, components/sidebar/ImportedWorktreesVisibilityLine.tsx:86 |
| D10-031 | Linha de inbox 'N hidden worktrees' com botao unico de review | grupo de repo na sidebar (inbox de worktrees externos) | inboxCount > 0 | components/sidebar/NewExternalWorktreesInboxLine.tsx:75, components/sidebar/NewExternalWorktreesInboxLine.tsx:89, components/sidebar/NewExternalWorktreesInboxLine.tsx:90 |
| D10-032 | Qualificar com host os rotulos de review e de suppress | linha de inbox | hostContextLabel definido | components/sidebar/NewExternalWorktreesInboxLine.tsx:42, components/sidebar/NewExternalWorktreesInboxLine.tsx:49, components/sidebar/NewExternalWorktreesInboxLine.tsx:89, components/sidebar/NewExternalWorktreesInboxLine.tsx:135 |
| D10-033 | Botao suppress revelado no hover, sem disparar o review | linha de inbox | hover/focus-within no grupo | components/sidebar/NewExternalWorktreesInboxLine.tsx:122, components/sidebar/NewExternalWorktreesInboxLine.tsx:136, components/sidebar/NewExternalWorktreesInboxLine.tsx:137 |
| D10-034 | Erro da acao de inbox como alerta | linha de inbox | error != null | components/sidebar/NewExternalWorktreesInboxLine.tsx:150 |
| D10-035 | Glyph de host da linha de notice com vocabulario unico (monitor local / server remoto) e tooltip | linha de notice (inbox/imported worktrees) | renderizacao da linha | components/sidebar/NoticeHostGlyph.tsx:31, components/sidebar/NoticeHostGlyph.tsx:48, components/sidebar/NoticeHostGlyph.tsx:61, components/sidebar/NoticeHostGlyph.tsx:77, components/sidebar/NoticeHostGlyph.tsx:90 |
| D10-036 | Acessibilidade do glyph: foco por teclado so quando passivo | linha de notice | prop keyboardFocusable | components/sidebar/NoticeHostGlyph.tsx:75, components/sidebar/NoticeHostGlyph.tsx:78, components/sidebar/NoticeHostGlyph.tsx:79 |
| D10-037 | Derivar 'desconectado' do estado de runtime sem confundir 'nunca sondado' | glyph de host runtime | runtimeStatusByEnvironmentId muda | components/sidebar/NoticeHostGlyph.tsx:41, components/sidebar/NoticeHostGlyph.tsx:44 |
| D10-038 | Abrir o dialog 'Non-Orca worktrees' com alvo resolvido por repo+host | modal de visibilidade de worktrees | activeModal === 'worktree-visibility' (menu do projeto) | components/sidebar/WorktreeVisibilityDialog.tsx:60, components/sidebar/WorktreeVisibilityDialog.tsx:76, components/sidebar/WorktreeVisibilityDialog.tsx:337, components/sidebar/WorktreeVisibilityDialog.tsx:347 |
| D10-039 | Executar fetch/update de visibilidade no host do alvo, nao no host focado | acoes do dialog | handlers de refresh/update | components/sidebar/WorktreeVisibilityDialog.tsx:94, components/sidebar/WorktreeVisibilityDialog.tsx:98, components/sidebar/WorktreeVisibilityDialog.tsx:104 |
| D10-040 | Scan autoritativo ao abrir o dialog com estados checking/ready/failed | corpo do dialog | isOpen && repoId | components/sidebar/WorktreeVisibilityDialog.tsx:117, components/sidebar/WorktreeVisibilityDialog.tsx:126, components/sidebar/WorktreeVisibilityDialog.tsx:371 |
| D10-041 | Retry do scan quando a lista nao pode ser lida | WorktreeVisibilityScanStatus (failed) | clique em 'Try again' | components/sidebar/WorktreeVisibilityDialog.tsx:137, components/sidebar/WorktreeVisibilityDialog.tsx:141 |
| D10-042 | Recuperar um worktree oculto individualmente (Show por path) | HiddenWorktreeRecoveryList embutida no dialog | clique em Show de uma linha | components/sidebar/WorktreeVisibilityDialog.tsx:148, components/sidebar/WorktreeVisibilityDialog.tsx:377 |
| D10-043 | Alternar a visibilidade de uma source (Show/Hide) com validacao de aceitacao e refresh | WorktreeVisibilitySourceList dentro do dialog | clique no segmento Show/Hide | components/sidebar/WorktreeVisibilityDialog.tsx:186, components/sidebar/WorktreeVisibilityDialog.tsx:240 |
| D10-044 | Reverter a override do projeto quando o valor escolhido e o global ('Use global') | linha de source no dialog | clique em 'Use global' ou re-escolher o valor global | components/sidebar/WorktreeVisibilityDialog.tsx:229, components/sidebar/WorktreeVisibilityDialog.tsx:240 |
| D10-045 | Rotear o toggle para reverte quando o valor coincide com o global | linha de source no dialog | toggle | components/sidebar/WorktreeVisibilityDialog.tsx:240, components/sidebar/WorktreeVisibilityDialog.tsx:250 |
| D10-046 | Adicionar location custom com validacao (limite/invalido/duplicado/save) | WorktreeVisibilitySourceAddForm no dialog | submit do form | components/sidebar/WorktreeVisibilityDialog.tsx:269, components/sidebar/WorktreeVisibilityDialog.tsx:276 |
| D10-047 | Remover location custom sem tocar nas outras preferencias de source | linha custom do dialog | clique no lixo da linha | components/sidebar/WorktreeVisibilityDialog.tsx:312 |
| D10-048 | Lista de recuperacao de worktrees ocultos embutida (busca, lista virtualizada, acao por path) | corpo do dialog, secao 'Hidden worktrees (N)' | renderizacao | components/sidebar/WorktreeVisibilityDialog.tsx:377 |
| D10-049 | Gating de disabled do dialog e erro de acao | corpo do dialog | busyPath/toggling/checking | components/sidebar/WorktreeVisibilityDialog.tsx:357, components/sidebar/WorktreeVisibilityDialog.tsx:369, components/sidebar/WorktreeVisibilityDialog.tsx:387 |
| D10-050 | Abrir Global Settings na secao de visibilidade de worktrees | link 'Manage in Global Settings' dentro do dialog | clique | components/sidebar/WorktreeVisibilityGlobalSettingsLink.tsx:22, components/sidebar/WorktreeVisibilityGlobalSettingsLink.tsx:36, components/sidebar/WorktreeVisibilityGlobalSettingsLink.tsx:39 |
| D10-051 | Listar as sources herdadas do global com o valor global de cada uma | cartao dentro do dialog | repo tem sources com setting global | components/sidebar/WorktreeVisibilityGlobalSettingsLink.tsx:48, components/sidebar/WorktreeVisibilityGlobalSettingsLink.tsx:62 |
| D10-052 | Ajuda 'Which worktrees are hidden by default?' com hover, click, Escape e click-outside | botao de ajuda (CircleHelp) no header do dialog | pointerenter/pointerleave, clique, Escape, clique fora | components/sidebar/WorktreeVisibilityHelpPopover.tsx:8, components/sidebar/WorktreeVisibilityHelpPopover.tsx:17, components/sidebar/WorktreeVisibilityHelpPopover.tsx:29, components/sidebar/WorktreeVisibilityHelpPopover.tsx:35 |
| D10-053 | Status do scan: 'Checking…' aria-live, falha com alerta e 'Try again' | WorktreeVisibilityScanStatus no dialog | listState muda | components/sidebar/WorktreeVisibilityScanStatus.tsx:18, components/sidebar/WorktreeVisibilityScanStatus.tsx:27, components/sidebar/WorktreeVisibilityScanStatus.tsx:34 |
| D10-054 | Form inline 'Add location' com erros de validacao e reset no sucesso | WorktreeVisibilitySourceAddForm embutido na lista de sources | submit | components/sidebar/WorktreeVisibilitySourceAddForm.tsx:19, components/sidebar/WorktreeVisibilitySourceAddForm.tsx:36, components/sidebar/WorktreeVisibilitySourceAddForm.tsx:56, components/sidebar/WorktreeVisibilitySourceAddForm.tsx:83 |
| D10-055 | Modelo de linhas de source: Claude Code, GSD, custom e 'Other locations' | WorktreeVisibilitySourceList (dialog; reutilizavel) | renderizacao | components/sidebar/WorktreeVisibilitySourceList.tsx:65, components/sidebar/WorktreeVisibilitySourceList.tsx:86, components/sidebar/WorktreeVisibilitySourceList.tsx:167 |
| D10-056 | Resolver a visibilidade efetiva de cada linha (builtin/custom/other) e migrar legacy | linha de source | renderizacao | components/sidebar/WorktreeVisibilitySourceList.tsx:100 |
| D10-057 | Contador 'N found' por source, ignorando checkouts selecionados e Orca-managed | linha de source | showCounts | components/sidebar/WorktreeVisibilitySourceList.tsx:193, components/sidebar/WorktreeVisibilitySourceList.tsx:250 |
| D10-058 | Remover location custom pela linha (aria-label com o path completo) | linha custom | clique no Trash2 | components/sidebar/WorktreeVisibilitySourceList.tsx:268, components/sidebar/WorktreeVisibilitySourceList.tsx:276 |
| D10-059 | Botao 'Use global' para reverter override que ja e igual ao global | linha de source | provenance = project-override && globalVisibility === visibility | components/sidebar/WorktreeVisibilitySourceList.tsx:292, components/sidebar/WorktreeVisibilitySourceList.tsx:301 |
| D10-060 | Segmentos Show/Hide por source (ToggleGroup) com nome acessivel por path | linha de source | clique no segmento | components/sidebar/WorktreeVisibilitySourceList.tsx:141, components/sidebar/WorktreeVisibilitySourceList.tsx:320, components/sidebar/WorktreeVisibilitySourceList.tsx:337 |
| D10-061 | Aviso 'Overriding global setting: <valor>' por linha | linha de source | override diverge do valor global | components/sidebar/WorktreeVisibilitySourceList.tsx:342, components/sidebar/WorktreeVisibilitySourceList.tsx:346 |
| D10-062 | Cabecalho da secao Sources e gating do form embutido | secao do dialog | renderizacao | components/sidebar/WorktreeVisibilitySourceList.tsx:209, components/sidebar/WorktreeVisibilitySourceList.tsx:212, components/sidebar/WorktreeVisibilitySourceList.tsx:353 |
| D10-063 | Mostrar worktrees descobertos a partir do card do projeto (com rollback) | card 'Imported worktrees' do projeto | clique em Show no card | components/sidebar/imported-worktrees-card-actions.ts:33, components/sidebar/imported-worktrees-card-actions.ts:37, components/sidebar/imported-worktrees-card-actions.ts:47 |
| D10-064 | Manter worktrees descobertos ocultos e dispensar o card | card do projeto | clique em Keep hidden | components/sidebar/imported-worktrees-card-actions.ts:34, components/sidebar/imported-worktrees-card-actions.ts:69 |
| D10-065 | Listar apenas worktrees externos ocultos de resultados autoritativos | helper getHiddenImportedWorktrees | computed no render do sidebar | components/sidebar/imported-worktrees-card-candidates.ts:17, components/sidebar/imported-worktrees-card-candidates.ts:20 |
| D10-066 | Decidir quais repos mostram o card de imported worktrees | sidebar (candidatos do card) | recalculo por repos/worktrees detectados | components/sidebar/imported-worktrees-card-candidates.ts:23, components/sidebar/imported-worktrees-card-candidates.ts:37, components/sidebar/imported-worktrees-card-candidates.ts:48 |
| D10-067 | Importar worktrees do inbox para a allowlist do sidebar (com rollback explicito) | linha de inbox -> review/import | clique em Review/import | components/sidebar/new-external-worktrees-inbox-actions.ts:56, components/sidebar/new-external-worktrees-inbox-actions.ts:104 |
| D10-068 | Manter o inbox oculto estendendo a baseline (sem refresh) | linha de inbox | Keep hidden | components/sidebar/new-external-worktrees-inbox-actions.ts:83, components/sidebar/new-external-worktrees-inbox-actions.ts:91 |
| D10-069 | Suprimir permanentemente a descoberta de worktrees externos | linha de inbox | X suppress | components/sidebar/new-external-worktrees-inbox-actions.ts:127, components/sidebar/new-external-worktrees-inbox-actions.ts:131 |
| D10-070 | Catalogo de mensagens de erro das acoes de inbox | feedback inline do inbox | falhas de update/refresh/suppress | components/sidebar/new-external-worktrees-inbox-actions.ts:31, components/sidebar/new-external-worktrees-inbox-actions.ts:38, components/sidebar/new-external-worktrees-inbox-actions.ts:45 |
| D10-071 | Decidir quais repos mostram a linha de inbox de worktrees externos | sidebar (candidatos do inbox) | recalculo por repos/detectados | components/sidebar/new-external-worktrees-inbox-candidates.ts:13, components/sidebar/new-external-worktrees-inbox-candidates.ts:26 |
| D10-072 | Relogio compartilhado de 1s para countdowns de prompt-cache (um intervalo para todos) | contador de cache no card/tab do sidebar | subscribe/unsubscribe de listeners | components/sidebar/prompt-cache-countdown-clock.ts:7, components/sidebar/prompt-cache-countdown-clock.ts:30, components/sidebar/prompt-cache-countdown-clock.ts:63 |
| D10-073 | Pausar o relogio com o documento oculto e reconciliar na volta | background do relogio de countdown | visibilitychange / isWindowVisible() | components/sidebar/prompt-cache-countdown-clock.ts:33, components/sidebar/prompt-cache-countdown-clock.ts:48 |
| D10-074 | Hook usePromptCacheCountdownNow(active) via useSyncExternalStore | contadores de cache | active muda | components/sidebar/prompt-cache-countdown-clock.ts:91 |
| D10-075 | Escolher o timer de cache mais antigo entre as tabs do worktree | linha/tab do sidebar | cacheTimerByKey / tabs mudam | components/sidebar/prompt-cache-timer-selection.ts:9, components/sidebar/prompt-cache-timer-selection.ts:14, components/sidebar/prompt-cache-timer-selection.ts:21 |
| D10-076 | Selecionar o countdown exato do pane (ttl positivo, chave valida) | linha do pane | getPromptCacheCountdownForPane | components/sidebar/prompt-cache-timer-selection.ts:38, components/sidebar/prompt-cache-timer-selection.ts:46 |
| D10-077 | Toasts de lista de workspaces obsoleta | toast sonner disparado pelo fluxo de delete | delete cujo alvo mudou/sumiu ou selecao sem alvo deletavel | components/sidebar/stale-workspace-list-toast.ts:7, components/sidebar/stale-workspace-list-toast.ts:18, components/sidebar/stale-workspace-list-toast.ts:28 |
| D10-078 | Highlight de drag e aceite do dragover no dialog de feedback | dialog de feedback do sidebar (drop zone) | dragenter/dragover/dragleave com tipos de arquivo nativo | components/sidebar/use-feedback-image-drop.ts:22, components/sidebar/use-feedback-image-drop.ts:37, components/sidebar/use-feedback-image-drop.ts:47, components/sidebar/use-feedback-image-drop.ts:55 |
| D10-079 | Reivindicar drops de imagem no dialog antes da lane nativa do preload | window (capture) enquanto o dialog esta aberto | drop em elemento dentro do dialog | components/sidebar/use-feedback-image-drop.ts:67, components/sidebar/use-feedback-image-drop.ts:80, components/sidebar/use-feedback-image-drop.ts:87, components/sidebar/use-feedback-image-drop.ts:90 |
| D10-080 | Prefill do rodape de ambiente (versao/OS) no feedback sem roubar o caret | textarea do dialog de feedback do sidebar | open muda | components/sidebar/use-sidebar-feedback-environment-prefill.ts:15, components/sidebar/use-sidebar-feedback-environment-prefill.ts:27, components/sidebar/use-sidebar-feedback-environment-prefill.ts:53 |
| D10-081 | Anexar imagens ao feedback com reserva de capacidade e avisos | dialog de feedback do sidebar (colar/anexar/drop) | handleAddFiles | components/sidebar/use-sidebar-feedback-images.ts:11, components/sidebar/use-sidebar-feedback-images.ts:51, components/sidebar/use-sidebar-feedback-images.ts:57, components/sidebar/use-sidebar-feedback-images.ts:90 |
| D10-082 | Remover/limpar imagens liberando object URLs | thumbnails do dialog de feedback | handleRemoveImage / clearImages / unmount | components/sidebar/use-sidebar-feedback-images.ts:36, components/sidebar/use-sidebar-feedback-images.ts:43, components/sidebar/use-sidebar-feedback-images.ts:103 |
| D10-083 | Resolver repo/alvo do dialog de visibilidade no host pedido | abertura do dialog de visibilidade | repoId + modalData.hostId | components/sidebar/worktree-visibility-host-target.ts:10, components/sidebar/worktree-visibility-host-target.ts:22, components/sidebar/worktree-visibility-host-target.ts:31 |
| D10-084 | Encapsular fetch/update escopados ao host alvo | handlers do dialog | refreshTargetRepo/updateTargetRepo chamados | components/sidebar/worktree-visibility-host-target.ts:35, components/sidebar/worktree-visibility-host-target.ts:48 |
| D10-085 | Fence de mutacoes de visibilidade que sobrevive ao unmount do dialog | modulo singleton consumido pelo dialog | start/finish/subscribe por scope | components/sidebar/worktree-visibility-mutation-fence.ts:3, components/sidebar/worktree-visibility-mutation-fence.ts:14, components/sidebar/worktree-visibility-mutation-fence.ts:18, components/sidebar/worktree-visibility-mutation-fence.ts:30 |
| D10-086 | Rehidratar o estado busy no remount e refrescar quando a mutacao antiga termina | hook useVisibilityMutationFence dentro do dialog | montagem do dialog com mutacao ativa no scope | components/sidebar/worktree-visibility-mutation-fence.ts:38, components/sidebar/worktree-visibility-mutation-fence.ts:58, components/sidebar/worktree-visibility-mutation-fence.ts:68 |
| D10-087 | Helpers de sources do repo para o dialog: repo atual por scope, ids custom e deteccao de duplicata | helpers do dialog de visibilidade | chamados nos handlers | components/sidebar/worktree-visibility-repo-sources.ts:10, components/sidebar/worktree-visibility-repo-sources.ts:14, components/sidebar/worktree-visibility-repo-sources.ts:22 |
| D10-088 | Construir a mutacao de visibilidade por source com predicado de aceitacao | handlers de toggle do dialog | createWorktreeVisibilitySourceMutation | components/sidebar/worktree-visibility-source-mutation.ts:21, components/sidebar/worktree-visibility-source-mutation.ts:42, components/sidebar/worktree-visibility-source-mutation.ts:46 |
| D10-089 | Mapear falha de update de visibilidade para mensagem certa (host antigo vs erro generico) | action error do dialog | commitSourceUpdate rejeitado | components/sidebar/worktree-visibility-update-error.ts:9, components/sidebar/worktree-visibility-update-error.ts:15 |
| D10-090 | Detectar revert para o global e montar a mutacao correspondente | handler de toggle/Use global | shouldUseGlobalWorktreeVisibility / createWorktreeVisibilityUseGlobalMutation | components/sidebar/worktree-visibility-use-global.ts:27, components/sidebar/worktree-visibility-use-global.ts:40, components/sidebar/worktree-visibility-use-global.ts:46 |
| D10-091 | Contrato do sidebar: manter workspace do branch default visivel sob 'Hide sleeping' (opt-in 'always show default branch') | filtro de visibilidade do sidebar (linha do projeto) | toggle 'Hide sleeping' + opcao de exibir default branch | components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:69, components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:88, components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:113, components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:145, components/sidebar/default-branch-visible-under-hide-sleeping.test.ts:196 |
