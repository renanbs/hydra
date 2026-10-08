# Cobertura de Domínio — D02c-project-groups-scripts

## Contagens de Cobertura

- **Arquivos produtivos**: 28/28 (100%)
- **Símbolos / Exports**: 63/63 (100%)
- **Testes**: 114/114 (100%)
- **Labels / Menu items**: 33/33 (100%)
- **Atalhos (hotkeys)**: 1/1 (100%)
- **Preferências (prefs)**: 25/25 (100%)
- **Timers / Watchers**: 0/0 (100%)
- **Subscrições de Store**: 11/11 (100%)
- **Preload / IPC Symbols**: 5/5 (100%)

---

## 1. Arquivos Produtivos (`files`)

| Arquivo Produtivo | Linhas | IDs de Capacidade Mapeados |
|---|---|---|
| `components/sidebar/HiddenWorktreeRecoveryList.tsx` | 201 | D02c-001 |
| `components/sidebar/LinearAgentSkillSetupDialog.tsx` | 198 | D02c-003 |
| `components/sidebar/LinearAgentSkillSetupPrompt.tsx` | 413 | D02c-004 |
| `components/sidebar/NonGitFolderDialog.tsx` | 170 | D02c-009 |
| `components/sidebar/OrcaYamlTrustDialog.tsx` | 214 | D02c-011 |
| `components/sidebar/PreservedBranchBatchReviewDialog.tsx` | 188 | D02c-012 |
| `components/sidebar/PreservedBranchBatchReviewModal.tsx` | 52 | D02c-012 |
| `components/sidebar/ProjectGroupDeleteDialog.tsx` | 218 | D02c-015 |
| `components/sidebar/ProjectGroupNameDialog.tsx` | 136 | D02c-016 |
| `components/sidebar/RemoveFolderDialog.tsx` | 122 | D02c-018 |
| `components/sidebar/SetupScriptPromptCard.tsx` | 410 | D02c-019 |
| `components/sidebar/SetupScriptPromptCardShell.tsx` | 106 | D02c-020 |
| `components/sidebar/SetupScriptPromptCardViews.tsx` | 299 | D02c-021 |
| `components/sidebar/SetupScriptPromptToast.tsx` | 38 | D02c-022 |
| `components/sidebar/SuppressExternalWorktreeInboxDialog.tsx` | 88 | D02c-002 |
| `components/sidebar/complete-nested-folder-open.ts` | 55 | D02c-010 |
| `components/sidebar/empty-project-placeholder-repos.ts` | 32 | D02c-017 |
| `components/sidebar/linear-agent-skill-runtime.ts` | 147 | D02c-005 |
| `components/sidebar/linear-agent-skill-setup-copy.ts` | 114 | D02c-006 |
| `components/sidebar/linear-agent-skill-setup-reminder-toast.ts` | 148 | D02c-007 |
| `components/sidebar/linear-agent-skill-setup-reminders.ts` | 79 | D02c-008 |
| `components/sidebar/open-setup-script-settings.ts` | 27 | D02c-023 |
| `components/sidebar/preserved-branch-batch-toast.tsx` | 190 | D02c-013 |
| `components/sidebar/preserved-branch-toast.tsx` | 119 | D02c-014 |
| `components/sidebar/setup-script-prompt-exposure-telemetry.ts` | 41 | D02c-024 |
| `components/sidebar/setup-script-prompt-render-state.ts` | 65 | D02c-025 |
| `components/sidebar/track-nested-folder-open.ts` | 30 | D02c-010 |
| `components/sidebar/useSetupScriptPromptRevalidation.ts` | 114 | D02c-026 |

---

## 2. Símbolos e Exports (`symbols`)

| Símbolo Exportado | Mapeamento / Justificativa |
|---|---|
| `ActionablePreservedBranch` | `INFRA: TypeScript type for preserved branch with expected head` |
| `ConfigureOnlyAction` | `D02c-021` |
| `ConfigureOnlyActionProps` | `INFRA: TypeScript interface for ConfigureOnlyAction component props` |
| `DetectedSetupPreview` | `D02c-021` |
| `DetectedSetupPreviewProps` | `INFRA: TypeScript interface for DetectedSetupPreview component props` |
| `HiddenWorktreeRecoveryList` | `D02c-001` |
| `InspectionErrorActions` | `D02c-021` |
| `InspectionErrorActionsProps` | `INFRA: TypeScript interface for InspectionErrorActions component props` |
| `LINEAR_AGENT_SKILL_SETUP_TOAST_LIMIT` | `D02c-008` |
| `LastVisibleSetupScriptPrompt` | `INFRA: TypeScript type for last visible prompt wrapper` |
| `LinearAgentSkillPromptSettings` | `INFRA: TypeScript type definition for Linear prompt settings slice` |
| `LinearAgentSkillSetupDialog` | `D02c-003` |
| `LinearAgentSkillSetupPrompt` | `D02c-004` |
| `MAX_LINEAR_AGENT_SKILL_SETUP_REMINDER_RUNTIME_KEYS` | `D02c-008` |
| `PackageManagerActions` | `D02c-021` |
| `PackageManagerActionsProps` | `INFRA: TypeScript interface for PackageManagerActions component props` |
| `PreservedBranchBatchReviewDialog` | `D02c-012` |
| `PreservedBranchBatchReviewModal` | `D02c-012` |
| `ProjectGroupDeleteDialog` | `D02c-015` |
| `ProjectGroupNameDialog` | `D02c-016` |
| `SaveLocalSetupAction` | `D02c-021` |
| `SaveLocalSetupActionProps` | `INFRA: TypeScript interface for SaveLocalSetupAction component props` |
| `SetupScriptPromptBody` | `D02c-021` |
| `SetupScriptPromptBodyProps` | `INFRA: TypeScript interface for SetupScriptPromptBody component props` |
| `SetupScriptPromptCardShell` | `D02c-020` |
| `SetupScriptPromptState` | `INFRA: TypeScript type for prompt inspection state with host identity` |
| `SuppressExternalWorktreeInboxDialog` | `D02c-002` |
| `_linearAgentSkillSetupPromptInternalsForTests` | `INFRA: Test helper exposing resetSessionReminders for unit test isolation` |
| `completeNestedFolderOpen` | `D02c-010` |
| `createLinearAgentSkillSetupActivationId` | `D02c-008` |
| `dismissLinearAgentSkillSetupReminderToast` | `D02c-007` |
| `findSetupScriptPromptRepo` | `D02c-025` |
| `forceDeletePreservedBranchBatch` | `D02c-013` |
| `getCurrentPlatform` | `D02c-005` |
| `getEmptyProjectPlaceholderRepoIds` | `D02c-017` |
| `getExistingLinearAgentSkillSetupReminderState` | `D02c-008` |
| `getLinearAgentSkillSetupInlineRuntimeCopy` | `D02c-006` |
| `getLinearAgentSkillSetupMissingLabel` | `D02c-006` |
| `getLinearAgentSkillSetupReminderState` | `D02c-008` |
| `getLinearAgentSkillSetupReminderStateCountForTests` | `D02c-008` |
| `getLinearAgentSkillSetupToastDescription` | `D02c-006` |
| `getLinearAgentSkillSetupToastTitle` | `D02c-006` |
| `getLinearPromptAgentRuntime` | `D02c-005` |
| `getLinearPromptSetupCheckIdentity` | `D02c-005` |
| `getLinearPromptSkillDiscoveryTarget` | `D02c-005` |
| `getLinearPromptTerminalShellOverride` | `D02c-005` |
| `getLocalDismissStorageKey` | `D02c-005` |
| `getRenderedSetupScriptPromptState` | `D02c-025` |
| `hasLinearAgentSkillSetupReminderStateForTests` | `D02c-008` |
| `markSetupScriptPromptSaved` | `D02c-025` |
| `openSetupScriptSettings` | `D02c-023` |
| `readLocalDismissed` | `D02c-005` |
| `resetLinearAgentSkillSetupReminderState` | `D02c-008` |
| `resetLinearAgentSkillSetupReminderToastForRuntime` | `D02c-007` |
| `resetLinearAgentSkillSetupReminderToastState` | `D02c-007` |
| `showPreservedBranchBatchToast` | `D02c-013` |
| `showPreservedBranchToast` | `D02c-014` |
| `showSavedInProjectSettingsToast` | `D02c-022` |
| `snoozeLinearAgentSkillSetupReminderToast` | `D02c-007` |
| `trackNestedFolderOpen` | `D02c-010` |
| `trackSetupScriptPromptExposure` | `D02c-024` |
| `useLinearAgentSkillSetupReminderToast` | `D02c-007` |
| `useSetupScriptPromptRevalidation` | `D02c-026` |

---

## 3. Casos de Teste (`tests`)

| Arquivo de Teste e Linha | Identificador / Nome do Teste | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:165` | `LinearAgentSkillSetupPrompt reminder toast` | INFRA: describe block grouping LinearAgentSkillSetupPrompt reminder toast tests |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:209` | `shows a warning toast on a later modal-only activation after a casual close` | `D02c-007` |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:234` | `does not repeat the Orca CLI in CLI-only reminder toast copy` | `D02c-006` |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:247` | `keeps remote setup nuance in reminder toast copy` | `D02c-006` |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:260` | `keeps WSL target nuance in reminder toast copy` | `D02c-006` |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:285` | `opens the setup dialog from the reminder toast action` | `D02c-007` |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:322` | `does not recreate missing reminder state during toast cleanup` | `D02c-007` |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:331` | `does not create missing reminder state when resetting a runtime` | `D02c-007` |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:337` | `dismisses an active reminder toast on permanent dismissal` | `D02c-007` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:200` | `LinearAgentSkillSetupPrompt` | INFRA: describe block grouping LinearAgentSkillSetupPrompt tests |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:238` | `shows a compact setup prompt when a linked Linear worktree is missing CLI or skill setup` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:250` | `hides when the prompt is not linked or both prerequisites are ready` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:263` | `persists host dismissal forever for the host setup target` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:276` | `persists remote dismissal and uses remote-safe copy` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:311` | `uses WSL discovery, status, command, and prerequisite setup together` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:371` | `persists WSL dismissal by selected distro` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:395` | `omits the WSL CLI distro request for default WSL setup` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:410` | `keeps stale terminal WSL settings on host when project runtime is absent` | `D02c-005` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:425` | `keeps the prompt usable and loads the lazy setup dialog only when requested` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:453` | `auto-opens as a modal-only prompt and treats the × close as a casual snooze` | `D02c-007` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:485` | `keeps the modal open with success copy after a modal Re-check succeeds` | `D02c-003` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:498` | `closes success with Done without permanent dismissal or session snooze` | `D02c-003` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:526` | `closes success with the dialog close button without permanent dismissal or session snooze` | `D02c-003` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:554` | `closes success with Escape without permanent dismissal or session snooze` | `D02c-003` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:566` | `closes success with outside click without permanent dismissal or session snooze` | `D02c-003` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:581` | `still removes the inline prompt after an inline Re-check succeeds` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:600` | `keeps the missing setup modal visible after a partial Re-check` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:617` | `keeps the modal mounted and the Re-check action loading during a slow modal check` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:648` | `ignores stale CLI success after the runtime context changes during Re-check` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:700` | `ignores stale prerequisite CLI status callbacks after the runtime context changes` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:743` | `accepts same-context prerequisite CLI status callbacks after a newer Re-check` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:782` | `ignores older same-context CLI refreshes that finish after a newer Re-check` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:812` | `uses WSL-specific success copy for a selected WSL runtime` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:841` | `uses project host runtime for skill discovery when legacy settings still point at WSL` | `D02c-005` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:865` | `uses selected project WSL runtime for skill discovery and CLI status` | `D02c-005` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:898` | `uses remote-safe success copy for remote workspaces` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:916` | `permanently dismisses the modal-only prompt when requested` | `D02c-003` |
| `components/sidebar/LinearAgentSkillSetupPrompt.update-command.test.tsx:113` | `LinearAgentSkillSetupPrompt update command` | INFRA: describe block grouping LinearAgentSkillSetupPrompt update command tests |
| `components/sidebar/LinearAgentSkillSetupPrompt.update-command.test.tsx:153` | `uses the canonical update command when the canonical Linear skill is installed` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.update-command.test.tsx:163` | `uses the legacy update command when only the legacy Linear skill is installed` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.update-command.test.tsx:173` | `prefers the canonical update command when both Linear skill names are installed` | `D02c-004` |
| `components/sidebar/NonGitFolderDialog.test.tsx:116` | `NonGitFolderDialog` | INFRA: describe block grouping NonGitFolderDialog tests |
| `components/sidebar/NonGitFolderDialog.test.tsx:140` | `shows the checked host in the folder confirmation` | `D02c-009` |
| `components/sidebar/NonGitFolderDialog.test.tsx:147` | `confirms runtime folder imports on the checked host` | `D02c-009` |
| `components/sidebar/NonGitFolderDialog.test.tsx:159` | `names the runtime folder project after the requested display name` | `D02c-009` |
| `components/sidebar/NonGitFolderDialog.test.tsx:176` | `names the SSH folder project after the requested display name` | `D02c-009` |
| `components/sidebar/NonGitFolderDialog.test.tsx:208` | `activates only the selected SSH folder when repo IDs collide` | `D02c-009` |
| `components/sidebar/OrcaYamlTrustDialog.test.tsx:58` | `OrcaYamlTrustDialog` | INFRA: describe block grouping OrcaYamlTrustDialog tests |
| `components/sidebar/OrcaYamlTrustDialog.test.tsx:72` | `keeps spaces around orca.yaml and the repo name in the first-run copy` | `D02c-011` |
| `components/sidebar/OrcaYamlTrustDialog.test.tsx:85` | `keeps spaces around orca.yaml when the script changed since last approval` | `D02c-011` |
| `components/sidebar/ProjectGroupDeleteDialog.test.tsx:109` | `disables project choices, cancel, and delete actions while deleting` | `D02c-015` |
| `components/sidebar/ProjectGroupDeleteDialog.test.tsx:62` | `ProjectGroupDeleteDialog` | INFRA: describe block grouping ProjectGroupDeleteDialog tests |
| `components/sidebar/ProjectGroupDeleteDialog.test.tsx:63` | `omits the contained project panel for empty groups` | `D02c-015` |
| `components/sidebar/ProjectGroupDeleteDialog.test.tsx:70` | `renders compact contained project handling and reports remove intent` | `D02c-015` |
| `components/sidebar/ProjectGroupDeleteDialog.test.tsx:91` | `focuses the delete group action when opened` | `D02c-015` |
| `components/sidebar/ProjectGroupDeleteDialog.test.tsx:97` | `keeps the panel copy and destructive action label stable when project removal is selected` | `D02c-015` |
| `components/sidebar/RemoveFolderDialog.test.tsx:63` | `RemoveFolderDialog` | INFRA: describe block grouping RemoveFolderDialog tests |
| `components/sidebar/RemoveFolderDialog.test.tsx:75` | `warns that VM recipe cleanup controls file deletion` | `D02c-018` |
| `components/sidebar/RemoveFolderDialog.test.tsx:86` | `keeps the file-preservation promise for ordinary SSH projects` | `D02c-018` |
| `components/sidebar/SetupScriptPromptCard.test.ts:103` | `keeps the previous visible prompt during same-host inspection refresh` | `D02c-025` |
| `components/sidebar/SetupScriptPromptCard.test.ts:116` | `does not keep a stale prompt when switching hosts in the same project` | `D02c-025` |
| `components/sidebar/SetupScriptPromptCard.test.ts:129` | `does not reuse a matching repo id from a different host` | `D02c-025` |
| `components/sidebar/SetupScriptPromptCard.test.ts:140` | `does not keep a stale prompt when switching to a different project` | `D02c-025` |
| `components/sidebar/SetupScriptPromptCard.test.ts:154` | `markSetupScriptPromptSaved` | INFRA: describe block grouping markSetupScriptPromptSaved tests |
| `components/sidebar/SetupScriptPromptCard.test.ts:155` | `does not apply a completed save to the same repo id on another host` | `D02c-025` |
| `components/sidebar/SetupScriptPromptCard.test.ts:161` | `marks the prompt for the saved host effective` | `D02c-025` |
| `components/sidebar/SetupScriptPromptCard.test.ts:29` | `findSetupScriptPromptRepo` | INFRA: describe block grouping findSetupScriptPromptRepo tests |
| `components/sidebar/SetupScriptPromptCard.test.ts:30` | `uses the active direct-SSH worktree host when repo ids collide` | `D02c-025` |
| `components/sidebar/SetupScriptPromptCard.test.ts:56` | `uses the runtime owner for a relayed SSH worktree` | `D02c-025` |
| `components/sidebar/SetupScriptPromptCard.test.ts:87` | `getRenderedSetupScriptPromptState` | INFRA: describe block grouping getRenderedSetupScriptPromptState tests |
| `components/sidebar/SetupScriptPromptCard.test.ts:88` | `uses the current inspection when it belongs to the active repo and host` | `D02c-025` |
| `components/sidebar/SetupScriptPromptCardShell.test.tsx:8` | `SetupScriptPromptCardShell` | INFRA: describe block grouping SetupScriptPromptCardShell tests |
| `components/sidebar/SetupScriptPromptCardShell.test.tsx:9` | `floats above its anchor without reserving a sidebar background panel` | `D02c-020` |
| `components/sidebar/empty-project-placeholder-repos.test.ts:104` | `keeps grouped repos visible when workspace filters hide all of their rows` | `D02c-017` |
| `components/sidebar/empty-project-placeholder-repos.test.ts:121` | `does not create a grouped repo placeholder when one of its workspaces is visible` | `D02c-017` |
| `components/sidebar/empty-project-placeholder-repos.test.ts:136` | `still respects explicit project filters for sleep-filtered grouped members` | `D02c-017` |
| `components/sidebar/empty-project-placeholder-repos.test.ts:160` | `placeholders only the fully-filtered members of a multi-project group` | `D02c-017` |
| `components/sidebar/empty-project-placeholder-repos.test.ts:182` | `does not placeholder ungrouped neighbors of a filtered grouped member` | `D02c-017` |
| `components/sidebar/empty-project-placeholder-repos.test.ts:34` | `getEmptyProjectPlaceholderRepoIds` | INFRA: describe block grouping getEmptyProjectPlaceholderRepoIds tests |
| `components/sidebar/empty-project-placeholder-repos.test.ts:35` | `returns empty repo placeholders in repo grouping without project groups` | `D02c-017` |
| `components/sidebar/empty-project-placeholder-repos.test.ts:49` | `treats missing worktreesByRepo keys as empty for the current render` | `D02c-017` |
| `components/sidebar/empty-project-placeholder-repos.test.ts:63` | `applies repo filters to empty placeholder candidates` | `D02c-017` |
| `components/sidebar/empty-project-placeholder-repos.test.ts:80` | `does not create placeholders outside repo grouping` | `D02c-017` |
| `components/sidebar/empty-project-placeholder-repos.test.ts:92` | `does not treat non-empty repos as empty when workspace filters hide their rows` | `D02c-017` |
| `components/sidebar/linear-agent-skill-runtime.shell-override.test.ts:17` | `leaves cmd and PowerShell shells alone, and never overrides off Windows` | `D02c-005` |
| `components/sidebar/linear-agent-skill-runtime.shell-override.test.ts:6` | `getLinearPromptTerminalShellOverride` | INFRA: describe block grouping getLinearPromptTerminalShellOverride tests |
| `components/sidebar/linear-agent-skill-runtime.shell-override.test.ts:9` | `forces PowerShell for POSIX-family Windows shells` | `D02c-005` |
| `components/sidebar/linear-agent-skill-setup-reminders.test.ts:16` | `linear agent skill setup reminders` | INFRA: describe block grouping linear agent skill setup reminders tests |
| `components/sidebar/linear-agent-skill-setup-reminders.test.ts:17` | `bounds runtime reminder state through prolonged key churn` | `D02c-008` |
| `components/sidebar/linear-agent-skill-setup-reminders.test.ts:32` | `retains recently reused keys while trimming` | `D02c-008` |
| `components/sidebar/linear-agent-skill-setup-reminders.test.ts:49` | `keeps active toast state ahead of inactive stale entries when trimming` | `D02c-008` |
| `components/sidebar/linear-agent-skill-setup-reminders.test.ts:62` | `retains a new key when every existing entry has an active toast` | `D02c-008` |
| `components/sidebar/linear-agent-skill-setup-reminders.test.ts:76` | `does not create reminder state when peeking at a missing key` | `D02c-008` |
| `components/sidebar/linear-agent-skill-setup-reminders.test.ts:81` | `resets activation ids with reminder state for tests` | `D02c-008` |
| `components/sidebar/preserved-branch-batch-toast.test.tsx:107` | `showPreservedBranchBatchToast` | INFRA: describe block grouping showPreservedBranchBatchToast tests |
| `components/sidebar/preserved-branch-batch-toast.test.tsx:108` | `explains disk cleanup and opens one review dialog for the batch` | `D02c-013` |
| `components/sidebar/preserved-branch-batch-toast.test.tsx:130` | `force-deletes only the branches selected in review` | `D02c-012` |
| `components/sidebar/preserved-branch-batch-toast.test.tsx:158` | `keeps older-server branches visible without offering an unsafe delete` | `D02c-013` |
| `components/sidebar/preserved-branch-batch-toast.test.tsx:169` | `serializes branch deletion within one repository` | `D02c-013` |
| `components/sidebar/preserved-branch-batch-toast.test.tsx:190` | `shows an unavailable branch without blocking review of actionable branches` | `D02c-012` |
| `components/sidebar/preserved-branch-toast.test.tsx:50` | `showPreservedBranchToast` | INFRA: describe block grouping showPreservedBranchToast tests |
| `components/sidebar/preserved-branch-toast.test.tsx:51` | `renders the branch recovery action below the long description` | `D02c-014` |
| `components/sidebar/preserved-branch-toast.test.tsx:89` | `does not show the force-delete action without the preserved head` | `D02c-014` |
| `components/sidebar/useSetupScriptPromptRevalidation.test.tsx:109` | `re-inspects on window focus while the prompt shows no effective setup` | `D02c-026` |
| `components/sidebar/useSetupScriptPromptRevalidation.test.tsx:124` | `does not re-inspect on window focus once setup is effective` | `D02c-026` |
| `components/sidebar/useSetupScriptPromptRevalidation.test.tsx:139` | `does not listen for focus while the sidebar is closed` | `D02c-026` |
| `components/sidebar/useSetupScriptPromptRevalidation.test.tsx:154` | `does not re-inspect when prompt state belongs to another host with the same repo id` | `D02c-026` |
| `components/sidebar/useSetupScriptPromptRevalidation.test.tsx:170` | `re-inspects when a worktree activates while the prompt shows no effective setup` | `D02c-026` |
| `components/sidebar/useSetupScriptPromptRevalidation.test.tsx:195` | `does not re-inspect on worktree activation once setup is effective` | `D02c-026` |
| `components/sidebar/useSetupScriptPromptRevalidation.test.tsx:217` | `re-inspects on window focus after a failed inspection` | `D02c-026` |
| `components/sidebar/useSetupScriptPromptRevalidation.test.tsx:232` | `replays a worktree activation that landed while the prompt state was unsettled` | `D02c-026` |
| `components/sidebar/useSetupScriptPromptRevalidation.test.tsx:264` | `re-inspects when the repo runtime reconnects` | `D02c-026` |
| `components/sidebar/useSetupScriptPromptRevalidation.test.tsx:281` | `ignores a reconnect of a runtime that does not own the repo` | `D02c-026` |
| `components/sidebar/useSetupScriptPromptRevalidation.test.tsx:96` | `useSetupScriptPromptRevalidation` | INFRA: describe block grouping useSetupScriptPromptRevalidation tests |

---

## 4. Labels e Textos Literais (`labels`)

| Arquivo e Linha | Texto / Label | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/HiddenWorktreeRecoveryList.tsx:135` | `aria-label={translate(` | `D02c-001` |
| `components/sidebar/HiddenWorktreeRecoveryList.tsx:83` | `aria-label={translate(` | `D02c-001` |
| `components/sidebar/HiddenWorktreeRecoveryList.tsx:87` | `placeholder={translate(` | `D02c-001` |
| `components/sidebar/LinearAgentSkillSetupDialog.tsx:124` | `title={translate(` | `D02c-003` |
| `components/sidebar/LinearAgentSkillSetupDialog.tsx:171` | `aria-label={translate(` | `D02c-003` |
| `components/sidebar/LinearAgentSkillSetupDialog.tsx:6` | `import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'` | `D02c-003` |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:137` | `function findBodyButton(label: string): HTMLButtonElement | undefined {` | INFRA: Test helper in reminder toast unit tests |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:227` | `label: 'Set up',` | `D02c-007` |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:351` | `.querySelector<HTMLButtonElement>('button[aria-label="Don\'t show again"]')` | `D02c-003` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:174` | `function findBodyButton(label: string): HTMLButtonElement | undefined {` | INFRA: Test helper in Linear agent skill setup prompt unit tests |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:268` | `.querySelector<HTMLButtonElement>('button[aria-label="Dismiss Linear agent skill setup"]')` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:303` | `.querySelector<HTMLButtonElement>('button[aria-label="Dismiss Linear agent skill setup"]')` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:386` | `.querySelector<HTMLButtonElement>('button[aria-label="Dismiss Linear agent skill setup"]')` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:921` | `'button[aria-label="Don\'t show again"]'` | `D02c-003` |
| `components/sidebar/LinearAgentSkillSetupPrompt.tsx:383` | `aria-label={translate(` | `D02c-004` |
| `components/sidebar/NonGitFolderDialog.test.tsx:76` | `mocks.buttons.push({ label: textContent(children), onClick })` | INFRA: Test helper/mock interface in NonGitFolderDialog unit tests |
| `components/sidebar/NonGitFolderDialog.test.tsx:8` | `label: string` | INFRA: Test helper/mock interface in NonGitFolderDialog unit tests |
| `components/sidebar/ProjectGroupDeleteDialog.test.tsx:44` | `function findButton(label: string): HTMLButtonElement {` | INFRA: Test helper in ProjectGroupDeleteDialog unit tests |
| `components/sidebar/ProjectGroupDeleteDialog.tsx:133` | `aria-label={translate(` | `D02c-015` |
| `components/sidebar/ProjectGroupDeleteDialog.tsx:139` | `<li key={`${projectName}:${index}`} className="truncate" title={projectName}>` | `D02c-015` |
| `components/sidebar/SetupScriptPromptCardShell.test.tsx:5` | `import { TooltipProvider } from '@/components/ui/tooltip'` | `D02c-020` |
| `components/sidebar/SetupScriptPromptCardViews.tsx:21` | `aria-label={translate(` | `D02c-021` |
| `components/sidebar/SetupScriptPromptCardViews.tsx:4` | `import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D02c-021` |
| `components/sidebar/SetupScriptPromptCardViews.tsx:60` | `aria-label={translate(` | `D02c-021` |
| `components/sidebar/linear-agent-skill-runtime.shell-override.test.ts:4` | `const hostRuntime = { runtime: 'host', label: 'Windows' } as const` | INFRA: Test fixture in shell-override unit tests |
| `components/sidebar/linear-agent-skill-runtime.ts:36` | `label: currentPlatform === 'win32' ? 'Windows' : 'This device'` | `D02c-005` |
| `components/sidebar/linear-agent-skill-runtime.ts:49` | `label: selectedDistro` | `D02c-005` |
| `components/sidebar/linear-agent-skill-runtime.ts:56` | `label: currentPlatform === 'win32' ? 'Windows' : 'This device'` | `D02c-005` |
| `components/sidebar/linear-agent-skill-runtime.ts:77` | `label: currentPlatform === 'win32' ? 'Windows' : 'This device'` | `D02c-005` |
| `components/sidebar/linear-agent-skill-runtime.ts:85` | `label: distro` | `D02c-005` |
| `components/sidebar/linear-agent-skill-setup-reminder-toast.ts:120` | `label: translate('auto.components.sidebar.LinearAgentSkillSetupPrompt.setup', 'Set up'),` | `D02c-007` |
| `components/sidebar/preserved-branch-batch-toast.test.tsx:69` | `async function clickButton(container: HTMLElement, label: string): Promise<void> {` | INFRA: Test helper in preserved branch batch toast unit tests |
| `components/sidebar/preserved-branch-toast.test.tsx:32` | `function clickButton(container: HTMLElement, label: string): void {` | INFRA: Test helper in preserved branch toast unit tests |

---

## 5. Atalhos de Teclado (`hotkeys`)

| Arquivo e Linha | Atalho / Evento | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:558` | `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))` | `D02c-003` |

---

## 6. Persistência e Preferências (`prefs`)

| Arquivo e Linha | Chave / Código | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:19` | `const HOST_DISMISS_STORAGE_KEY = 'orca.linearTicketsSkill.setupDismissed.host'` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:317` | `getExistingLinearAgentSkillSetupReminderState(HOST_DISMISS_STORAGE_KEY)?.activeToastId` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:323` | `dismissLinearAgentSkillSetupReminderToast(HOST_DISMISS_STORAGE_KEY)` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:325` | `expect(getExistingLinearAgentSkillSetupReminderState(HOST_DISMISS_STORAGE_KEY)).toBeUndefined()` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:332` | `resetLinearAgentSkillSetupReminderToastForRuntime(HOST_DISMISS_STORAGE_KEY)` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:334` | `expect(getExistingLinearAgentSkillSetupReminderState(HOST_DISMISS_STORAGE_KEY)).toBeUndefined()` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:355` | `expect(window.localStorage.getItem(HOST_DISMISS_STORAGE_KEY)).toBe('1')` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:14` | `const HOST_DISMISS_STORAGE_KEY = 'orca.linearTicketsSkill.setupDismissed.host'` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:15` | `const FEDORA_DISMISS_STORAGE_KEY = 'orca.linearTicketsSkill.setupDismissed.wsl.Fedora'` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:272` | `expect(window.localStorage.getItem(HOST_DISMISS_STORAGE_KEY)).toBe('1')` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:307` | `expect(window.localStorage.getItem(HOST_DISMISS_STORAGE_KEY)).toBe('1')` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:390` | `expect(window.localStorage.getItem(FEDORA_DISMISS_STORAGE_KEY)).toBe('1')` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:391` | `expect(window.localStorage.getItem(HOST_DISMISS_STORAGE_KEY)).toBeNull()` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:479` | `expect(window.localStorage.getItem(HOST_DISMISS_STORAGE_KEY)).toBeNull()` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:505` | `expect(window.localStorage.getItem(HOST_DISMISS_STORAGE_KEY)).toBeNull()` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:533` | `expect(window.localStorage.getItem(HOST_DISMISS_STORAGE_KEY)).toBeNull()` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:562` | `expect(window.localStorage.getItem(HOST_DISMISS_STORAGE_KEY)).toBeNull()` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:577` | `expect(window.localStorage.getItem(HOST_DISMISS_STORAGE_KEY)).toBeNull()` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.test.tsx:927` | `expect(window.localStorage.getItem(HOST_DISMISS_STORAGE_KEY)).toBe('1')` | INFRA: Test verification of localStorage dismissal preference key |
| `components/sidebar/LinearAgentSkillSetupPrompt.tsx:225` | `localStorage.setItem(localDismissStorageKey, '1')` | `D02c-004` |
| `components/sidebar/linear-agent-skill-runtime.ts:126` | `return `${LOCAL_DISMISS_STORAGE_KEY_PREFIX}.host`` | `D02c-005` |
| `components/sidebar/linear-agent-skill-runtime.ts:128` | `return `${LOCAL_DISMISS_STORAGE_KEY_PREFIX}.wsl.${runtime.wslDistro?.trim() || 'default'}`` | `D02c-005` |
| `components/sidebar/linear-agent-skill-runtime.ts:131` | `export function readLocalDismissed(storageKey: string): boolean {` | `D02c-005` |
| `components/sidebar/linear-agent-skill-runtime.ts:135` | `return localStorage.getItem(storageKey) === '1'` | `D02c-005` |
| `components/sidebar/linear-agent-skill-runtime.ts:8` | `const LOCAL_DISMISS_STORAGE_KEY_PREFIX = 'orca.linearTicketsSkill.setupDismissed'` | `D02c-005` |

---

## 7. Timers e Watchers (`timers`)

Nenhum timer registrado para este domínio.

---

## 8. Subscrições e Listeners (`subscriptions`)

| Arquivo e Linha | Listener / Effect | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/LinearAgentSkillSetupPrompt.tsx:185` | `useEffect(() => {` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.tsx:205` | `useEffect(() => {` | `D02c-004` |
| `components/sidebar/SetupScriptPromptCard.tsx:126` | `useEffect(() => {` | `D02c-019` |
| `components/sidebar/SetupScriptPromptCard.tsx:63` | `useEffect(() => {` | `D02c-019` |
| `components/sidebar/linear-agent-skill-setup-reminder-toast.ts:134` | `useEffect(() => {` | `D02c-007` |
| `components/sidebar/linear-agent-skill-setup-reminder-toast.ts:140` | `useEffect(() => {` | `D02c-007` |
| `components/sidebar/linear-agent-skill-setup-reminder-toast.ts:71` | `useEffect(() => {` | `D02c-007` |
| `components/sidebar/linear-agent-skill-setup-reminder-toast.ts:85` | `useEffect(() => {` | `D02c-007` |
| `components/sidebar/useSetupScriptPromptRevalidation.ts:48` | `useEffect(() => {` | `D02c-026` |
| `components/sidebar/useSetupScriptPromptRevalidation.ts:58` | `window.addEventListener('focus', requestRevalidation)` | `D02c-026` |
| `components/sidebar/useSetupScriptPromptRevalidation.ts:76` | `useEffect(() => {` | `D02c-026` |

---

## 9. Contratos de Backend / Preload (`preload`)

| Arquivo e Linha | Chamada Preload / IPC | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/LinearAgentSkillSetupPrompt.tsx:175` | `? window.api.cli.getWslInstallStatus(getWslCliDistroRequest(agentRuntime))` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.tsx:176` | `: window.api.cli.getInstallStatus())` | `D02c-004` |
| `components/sidebar/LinearAgentSkillSetupPrompt.tsx:301` | `? () => window.api.cli.getWslInstallStatus(getWslCliDistroRequest(agentRuntime))` | `D02c-004` |
| `components/sidebar/NonGitFolderDialog.tsx:61` | `const result = await window.api.repos.addRemote({` | `D02c-009` |
| `components/sidebar/NonGitFolderDialog.tsx:88` | `const onboarding = await window.api.onboarding.get().catch(() => null)` | `D02c-009` |
