# Parede de Evidência — Domínio D02a-repo-add-wizard (Fluxo de Adicionar Repositório / Projeto)

## Contagens de Cobertura
- **arquivos**: 46/46 (100%)
- **símbolos**: 74/74 (100%)
- **testes**: 240/240 (100%)
- **labels**: 66/66 (100%)
- **hotkeys**: 8/8 (100%)
- **prefs**: 0/0 (100%)
- **timers**: 3/3 (100%)
- **subs**: 13/13 (100%)
- **preload**: 23/23 (100%)

---

## Itens com Justificativa Especial (INFRA / N/A / DUP)

| Categoria | Entrada | Justificativa |
|---|---|---|
| symbols | `AddRepoBrowseAuthorityActions` | INFRA: type-only contract for browse routing callbacks |
| symbols | `AddRepoDialogStep` | INFRA: type-only union of wizard step identifiers ('add' \| 'clone' \| 'remote' \| 'server-path' \| 'create' \| 'nested') |
| symbols | `AddRepoLocalStartActionHandlers` | INFRA: type-only callback interface for start step actions |
| symbols | `AddRepoLocalStartAction` | INFRA: type-only definition for start step action item |
| symbols | `CapturedRuntimeOwner` | INFRA: type-only alias for string \| null \| undefined runtime owner id |
| symbols | `AddRepoSkipFinalizationState` | INFRA: type-only state interface for skip finalization |
| symbols | `GitAvailability` | INFRA: type-only union of git probe states ('checking' \| 'available' \| 'unavailable' \| 'unknown') |
| symbols | `AddRepoDialogHostedController` | INFRA: type-only contract for hosted dialog controller |
| symbols | `CreateRuntimeParentStatus` | INFRA: type-only union of runtime parent probe states ('idle' \| 'checking' \| 'failed') |
| tests | `components/sidebar/AddProjectFromFolderDialog.test.tsx:128 :: AddProjectFromFolderDialog` | INFRA: describe block grouping AddProjectFromFolderDialog test suite |
| tests | `components/sidebar/AddRepoCreateStep.test.tsx:41 :: CreateStep` | INFRA: describe block grouping CreateStep test suite |
| tests | `components/sidebar/AddRepoDialog.default-checkout.test.ts:8 :: AddRepo completion owner routing` | INFRA: describe block grouping AddRepo completion owner routing test suite |
| tests | `components/sidebar/AddRepoDialogStepContent.test.tsx:103 :: AddRepoDialogStepContent nested imports` | INFRA: describe block grouping AddRepoDialogStepContent nested imports test suite |
| tests | `components/sidebar/AddRepoHostSelector.test.tsx:31 :: AddRepoHostSelector` | INFRA: describe block grouping AddRepoHostSelector test suite |
| tests | `components/sidebar/AddRepoNestedImportStep.test.tsx:63 :: AddRepoNestedImportStep` | INFRA: describe block grouping AddRepoNestedImportStep test suite |
| tests | `components/sidebar/AddRepoStartSteps.test.tsx:165 :: AddRepoLocalStartStep` | INFRA: describe block grouping AddRepoLocalStartStep test suite |
| tests | `components/sidebar/AddRepoStartSteps.test.tsx:379 :: AddRepoServerPathStartStep` | INFRA: describe block grouping AddRepoServerPathStartStep test suite |
| tests | `components/sidebar/AddRepoSteps.default-checkout.test.ts:90 :: useRemoteRepo default-checkout handoff` | INFRA: describe block grouping useRemoteRepo default-checkout handoff test suite |
| tests | `components/sidebar/ProjectAddedDialog.test.tsx:64 :: ProjectAddedDialog` | INFRA: describe block grouping ProjectAddedDialog test suite |
| tests | `components/sidebar/add-repo-browse-authority.test.ts:5 :: routeAddRepoBrowse` | INFRA: describe block grouping routeAddRepoBrowse test suite |
| tests | `components/sidebar/add-repo-existing-workspaces-telemetry.test.ts:32 :: add repo existing workspace telemetry` | INFRA: describe block grouping add repo existing workspace telemetry test suite |
| tests | `components/sidebar/add-repo-skip-finalization.test.ts:49 :: finalizeImportedRepoAfterSkip` | INFRA: describe block grouping finalizeImportedRepoAfterSkip test suite |
| tests | `components/sidebar/clone-defaults.test.ts:4 :: getDefaultCloneParent` | INFRA: describe block grouping getDefaultCloneParent test suite |
| tests | `components/sidebar/clone-defaults.test.ts:50 :: getCloneDestinationAutoFill` | INFRA: describe block grouping getCloneDestinationAutoFill test suite |
| tests | `components/sidebar/create-project-defaults.test.ts:9 :: create project defaults` | INFRA: describe block grouping create project defaults test suite |
| tests | `components/sidebar/folder-workspace-card-pr-display.test.ts:73 :: getFolderWorkspaceCardPrDisplay` | INFRA: describe block grouping getFolderWorkspaceCardPrDisplay test suite |
| tests | `components/sidebar/folder-workspace-composer-helpers.test.ts:38 :: getFolderSourceRepos` | INFRA: describe block grouping getFolderSourceRepos test suite |
| tests | `components/sidebar/folder-workspace-composer-helpers.test.ts:83 :: getFolderWorkspacePrimaryActionLabel` | INFRA: describe block grouping getFolderWorkspacePrimaryActionLabel test suite |
| tests | `components/sidebar/folder-workspace-composer-path-status.test.tsx:38 :: useFolderWorkspaceComposerPathStatus` | INFRA: describe block grouping useFolderWorkspaceComposerPathStatus test suite |
| tests | `components/sidebar/folder-workspace-composer-submit.test.ts:71 :: submitFolderWorkspaceCreate` | INFRA: describe block grouping submitFolderWorkspaceCreate test suite |
| tests | `components/sidebar/folder-workspace-composer-submit.test.ts:693 :: submitFolderWorkspaceCreate native-chat launch draft` | INFRA: describe block grouping submitFolderWorkspaceCreate native-chat launch draft test suite |
| tests | `components/sidebar/folder-workspace-composer-submit.test.ts:805 :: folder-workspace draft: seeded set == chat-opening set` | INFRA: describe block grouping folder-workspace draft: seeded set == chat-opening set test suite |
| tests | `components/sidebar/folder-workspace-linked-startup-plan.test.ts:4 :: buildFolderWorkspaceLinkedStartupPlan` | INFRA: describe block grouping buildFolderWorkspaceLinkedStartupPlan test suite |
| tests | `components/sidebar/project-added-default-checkout.test.ts:106 :: getProjectDefaultCheckout` | INFRA: describe block grouping getProjectDefaultCheckout test suite |
| tests | `components/sidebar/project-added-default-checkout.test.ts:123 :: finishProjectAddWithDefaultCheckout` | INFRA: describe block grouping finishProjectAddWithDefaultCheckout test suite |
| tests | `components/sidebar/use-add-repo-host-selection.test.ts:72 :: useAddRepoHostSelection` | INFRA: describe block grouping useAddRepoHostSelection test suite |
| tests | `components/sidebar/use-add-repo-hosted-controller.test.ts:35 :: useAddRepoHostedController` | INFRA: describe block grouping useAddRepoHostedController test suite |
| tests | `components/sidebar/useAddRepoCloneFlow.test.ts:92 :: useAddRepoCloneFlow` | INFRA: describe block grouping useAddRepoCloneFlow test suite |
| tests | `components/sidebar/useAddRepoLocalFolderFlow.test.ts:58 :: useAddRepoLocalFolderFlow` | INFRA: describe block grouping useAddRepoLocalFolderFlow test suite |
| tests | `components/sidebar/useAddRepoNestedImportFlow.test.ts:95 :: useAddRepoNestedImportFlow open folder fallback` | INFRA: describe block grouping useAddRepoNestedImportFlow open folder fallback test suite |
| tests | `components/sidebar/useAddRepoServerPathFlow.test.ts:64 :: useAddRepoServerPathFlow` | INFRA: describe block grouping useAddRepoServerPathFlow test suite |
| tests | `components/sidebar/useCreateProjectDefaults.test.ts:76 :: useCreateProjectDefaults` | INFRA: describe block grouping useCreateProjectDefaults test suite |
| tests | `components/sidebar/useCreateRepo.default-checkout.test.ts:101 :: useCreateRepo default-checkout handoff` | INFRA: describe block grouping useCreateRepo default-checkout handoff test suite |
| labels | `components/sidebar/AddProjectFromFolderDialog.test.tsx:7 :: label: string` | INFRA: test mock/helper/type definition for button/label capture |
| labels | `components/sidebar/AddProjectFromFolderDialog.test.tsx:79 :: mocks.buttons.push({ label: textContent(children), onClick, disabled })` | INFRA: test mock/helper/type definition for button/label capture |
| labels | `components/sidebar/AddProjectFromFolderDialog.test.tsx:120 :: function getButton(label: string): ButtonCapture {` | INFRA: test mock/helper/type definition for button/label capture |
| labels | `components/sidebar/AddRepoCreateStep.test.tsx:4 :: import { TooltipProvider } from '@/components/ui/tooltip'` | INFRA: test mock/helper/type definition for button/label capture |
| labels | `components/sidebar/AddRepoDialogStepContent.test.tsx:5 :: import { TooltipProvider } from '@/components/ui/tooltip'` | INFRA: test mock/helper/type definition for button/label capture |
| labels | `components/sidebar/AddRepoDialogStepContent.test.tsx:181 :: expect(html).not.toContain('aria-label="Choose folder"')` | INFRA: test assertion or label fixture in unit test |
| labels | `components/sidebar/AddRepoDialogStepContent.test.tsx:253 :: expect(html).toContain('placeholder="/home/user/project"')` | INFRA: test assertion or label fixture in unit test |
| labels | `components/sidebar/AddRepoHostSelector.test.tsx:111 :: label: 'Old server',` | INFRA: test assertion or label fixture in unit test |
| labels | `components/sidebar/AddRepoNestedImportStep.test.tsx:8 :: import { TooltipProvider } from '@/components/ui/tooltip'` | INFRA: test mock/helper/type definition for button/label capture |
| labels | `components/sidebar/AddRepoNestedImportStep.test.tsx:53 :: function findButton(container: HTMLElement, label: string): HTMLButtonElement {` | INFRA: test mock/helper/type definition for button/label capture |
| labels | `components/sidebar/AddRepoStartSteps.test.tsx:8 :: import { TooltipProvider } from '@/components/ui/tooltip'` | INFRA: test mock/helper/type definition for button/label capture |
| labels | `components/sidebar/AddRepoStartSteps.test.tsx:97 :: function findButton(container: HTMLElement, label: string): HTMLButtonElement {` | INFRA: test mock/helper/type definition for button/label capture |
| labels | `components/sidebar/use-add-repo-host-selection.test.ts:98 :: label: 'Server',` | INFRA: test assertion or label fixture in unit test |
| labels | `components/sidebar/use-add-repo-host-selection.test.ts:291 :: label: 'orca VM abc12345',` | INFRA: test assertion or label fixture in unit test |
| labels | `components/sidebar/useAddRepoLocalFolderFlow.ts:68 :: setAddProjectBusyLabel: (label: string \| null) => void` | INFRA: callback type signature for setting busy label |
| labels | `components/sidebar/useAddRepoServerPathFlow.ts:68 :: setAddProjectBusyLabel: (label: string \| null) => void` | INFRA: callback type signature for setting busy label |
| hotkeys | `components/sidebar/AddRepoStartSteps.test.tsx:364 :: new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })` | INFRA: simulated keydown event in arrow navigation unit test |
| timers | `components/sidebar/useCreateProjectDefaults.test.ts:59 :: return new Promise((resolve) => setTimeout(resolve, 0))` | INFRA: async test helper tick for promise resolution |

---

## 1. Arquivos Produtivos (`files`)

| Arquivo Produtivo | Linhas de Inventário Associadas |
|---|---|
| `AddProjectFromFolderDialog.tsx` | `D02a-026` |
| `AddRepoCloneStep.tsx` | `D02a-012` |
| `AddRepoCreateStep.tsx` | `D02a-015` |
| `AddRepoDialog.tsx` | `D02a-001` |
| `AddRepoDialogChrome.tsx` | `D02a-001` |
| `AddRepoDialogStepContent.tsx` | `D02a-002`, `D02a-010`, `D02a-012`, `D02a-015`, `D02a-019`, `D02a-022` |
| `AddRepoHostSelector.tsx` | `D02a-003`, `D02a-005` |
| `AddRepoHostSelectorSlot.tsx` | `D02a-003`, `D02a-005` |
| `AddRepoNestedImportStep.tsx` | `D02a-022`, `D02a-041` |
| `AddRepoRemoteStep.tsx` | `D02a-019` |
| `AddRepoServerStartStep.tsx` | `D02a-010` |
| `AddRepoStartSteps.tsx` | `D02a-006`, `D02a-041` |
| `AddRepoStepIndicator.tsx` | `D02a-002` |
| `AddRepoSteps.tsx` | `D02a-019`, `D02a-020` |
| `CreateProjectLocationField.tsx` | `D02a-016` |
| `ProjectAddedDialog.tsx` | `D02a-027` |
| `add-repo-browse-authority.ts` | `D02a-007` |
| `add-repo-dialog-types.ts` | `D02a-042` |
| `add-repo-existing-workspaces-telemetry.ts` | `D02a-031` |
| `add-repo-host-availability.ts` | `D02a-003` |
| `add-repo-local-start-actions.ts` | `D02a-006` |
| `add-repo-runtime-owner.ts` | `D02a-033` |
| `add-repo-skip-finalization.ts` | `D02a-030` |
| `add-repo-store-upsert.ts` | `D02a-032` |
| `clone-defaults.ts` | `D02a-013` |
| `create-project-defaults.ts` | `D02a-015`, `D02a-017` |
| `folder-workspace-agent-startup.ts` | `D02a-035` |
| `folder-workspace-card-pr-display.ts` | `D02a-038` |
| `folder-workspace-composer-helpers.ts` | `D02a-037` |
| `folder-workspace-composer-path-status.ts` | `D02a-036` |
| `folder-workspace-composer-submit.ts` | `D02a-034` |
| `folder-workspace-host-id.ts` | `D02a-039` |
| `project-added-default-checkout.ts` | `D02a-028`, `D02a-029` |
| `use-add-repo-host-change-reset.ts` | `D02a-004` |
| `use-add-repo-host-selection.ts` | `D02a-003` |
| `use-add-repo-hosted-controller.ts` | `D02a-040` |
| `use-add-repo-remote-nested-scan.ts` | `D02a-021` |
| `use-complete-git-repo-add.ts` | `D02a-031` |
| `useAddRepoCloneFlow.ts` | `D02a-012`, `D02a-014` |
| `useAddRepoLocalFolderFlow.ts` | `D02a-008`, `D02a-009` |
| `useAddRepoNestedImportFlow.ts` | `D02a-024`, `D02a-025` |
| `useAddRepoNestedReviewController.ts` | `D02a-023` |
| `useAddRepoNestedReviewState.ts` | `D02a-023` |
| `useAddRepoServerPathFlow.ts` | `D02a-010`, `D02a-011` |
| `useCreateProjectDefaults.ts` | `D02a-017` |
| `useCreateRepo.ts` | `D02a-018` |

## 2. Símbolos Exportados (`symbols`)

| Símbolo | Mapeamento / Justificativa |
|---|---|
| `AddRepoBrowseAuthorityActions` | INFRA: type-only contract for browse routing callbacks |
| `AddRepoDialogChrome` | `D02a-001` |
| `AddRepoDialogHostedController` | INFRA: type-only contract for hosted dialog controller |
| `AddRepoDialogStep` | INFRA: type-only union of wizard step identifiers ('add' \| 'clone' \| 'remote' \| 'server-path' \| 'create' \| 'nested') |
| `AddRepoDialogStepContent` | `D02a-002` |
| `AddRepoHostSelector` | `D02a-003` |
| `AddRepoHostSelectorSlot` | `D02a-003`, `D02a-005` |
| `AddRepoLocalStartAction` | INFRA: type-only definition for start step action item |
| `AddRepoLocalStartActionHandlers` | INFRA: type-only callback interface for start step actions |
| `AddRepoLocalStartStep` | `D02a-006` |
| `AddRepoNestedImportStep` | `D02a-022` |
| `AddRepoServerPathStartStep` | `D02a-010` |
| `AddRepoSkipFinalizationState` | INFRA: type-only state interface for skip finalization |
| `AddRepoStepIndicator` | `D02a-002` |
| `CapturedRuntimeOwner` | INFRA: type-only alias for string \| null \| undefined runtime owner id |
| `CloneStep` | `D02a-012` |
| `CreateProjectLocationField` | `D02a-016` |
| `CreateProjectParentBrowser` | `D02a-016` |
| `CreateRuntimeParentStatus` | INFRA: type-only union of runtime parent probe states ('idle' \| 'checking' \| 'failed') |
| `CreateStep` | `D02a-015` |
| `GitAvailability` | INFRA: type-only union of git probe states ('checking' \| 'available' \| 'unavailable' \| 'unknown') |
| `ProjectAddedDialog` | `D02a-027` |
| `RemoteStep` | `D02a-019` |
| `buildAddRepoExistingWorkspacesDetectedEvent` | `D02a-031` |
| `buildAddRepoExistingWorkspacesTelemetry` | `D02a-031` |
| `buildFolderWorkspaceLinkedStartupPlan` | `D02a-035` |
| `canConnectAddRepoHost` | `D02a-003` |
| `canSelectAddRepoHost` | `D02a-003` |
| `capturedAddRepoExecutionHostId` | `D02a-033` |
| `createNestedRepoScanId` | `D02a-042` |
| `defaultProjectGroupNameForPath` | `D02a-042` |
| `finalizeImportedRepoAfterSkip` | `D02a-030` |
| `finishProjectAddWithDefaultCheckout` | `D02a-028` |
| `formatCreateProjectParentSummary` | `D02a-015` |
| `getAddRepoLocalStartActions` | `D02a-006` |
| `getCloneDestinationAutoFill` | `D02a-013` |
| `getCreateProjectDefaultParentAutoFill` | `D02a-017` |
| `getDefaultCloneParent` | `D02a-013` |
| `getDefaultCreateProjectParent` | `D02a-017` |
| `getFolderSourceRepos` | `D02a-037` |
| `getFolderWorkspaceAgentLaunchPlatform` | `D02a-035` |
| `getFolderWorkspaceCardPrDisplay` | `D02a-038` |
| `getFolderWorkspaceHostId` | `D02a-039` |
| `getFolderWorkspacePrimaryActionLabel` | `D02a-037` |
| `getLinkedItemDisplayName` | `D02a-037` |
| `getProjectDefaultCheckout` | `D02a-028` |
| `getSmartNameSelection` | `D02a-037` |
| `joinCreateProjectPath` | `D02a-015` |
| `openProjectDefaultCheckout` | `D02a-028` |
| `resolveFolderWorkspaceLaunchDraft` | `D02a-035` |
| `routeAddRepoBrowse` | `D02a-007` |
| `shouldTrackAddRepoExistingWorkspacesDetected` | `D02a-031` |
| `submitFolderWorkspaceCreate` | `D02a-034` |
| `toFolderWorkspaceLinkedTask` | `D02a-037` |
| `toGitHubLinkedWorkItem` | `D02a-037` |
| `toGitLabLinkedWorkItem` | `D02a-037` |
| `toLinearLinkedWorkItem` | `D02a-037` |
| `upsertAddedRepoWithProjectHostSetup` | `D02a-032` |
| `useAddRepoCloneFlow` | `D02a-012`, `D02a-014` |
| `useAddRepoHostChangeReset` | `D02a-004` |
| `useAddRepoHostSelection` | `D02a-003` |
| `useAddRepoHostedController` | `D02a-040` |
| `useAddRepoLocalFolderFlow` | `D02a-008`, `D02a-009` |
| `useAddRepoNestedImportFlow` | `D02a-024`, `D02a-025` |
| `useAddRepoNestedReviewController` | `D02a-023` |
| `useAddRepoNestedReviewState` | `D02a-023` |
| `useAddRepoRemoteNestedScan` | `D02a-021` |
| `useAddRepoServerPathFlow` | `D02a-010`, `D02a-011` |
| `useCompleteGitRepoAdd` | `D02a-031` |
| `useCreateProjectDefaults` | `D02a-017` |
| `useCreateRepo` | `D02a-018` |
| `useFolderWorkspaceComposerPathStatus` | `D02a-036` |
| `useRemoteRepo` | `D02a-019`, `D02a-020` |
| `worktreeRefreshOptions` | `D02a-033` |

## 3. Casos de Teste (`tests`)

| Caso de Teste | Mapeamento / Justificativa |
|---|---|
| `components/sidebar/AddProjectFromFolderDialog.test.tsx:128 :: AddProjectFromFolderDialog` | INFRA: describe block grouping AddProjectFromFolderDialog test suite |
| `components/sidebar/AddProjectFromFolderDialog.test.tsx:145 :: adds a local Git folder and opens the default checkout` | `D02a-026` |
| `components/sidebar/AddProjectFromFolderDialog.test.tsx:174 :: leaves local non-Git folders on the existing Open as Folder confirmation path` | `D02a-026` |
| `components/sidebar/AddProjectFromFolderDialog.test.tsx:193 :: routes a runtime project` | `D02a-026` |
| `components/sidebar/AddProjectFromFolderDialog.test.tsx:222 :: adds an SSH Git folder through the remote repo import path` | `D02a-026` |
| `components/sidebar/AddProjectFromFolderDialog.test.tsx:256 :: falls back to completion when Git worktree refresh is not authoritative` | `D02a-026` |
| `components/sidebar/AddProjectFromFolderDialog.test.tsx:279 :: does not finish the handoff after the user cancels during refresh` | `D02a-026` |
| `components/sidebar/AddProjectFromFolderDialog.test.tsx:304 :: sends SSH non-Git folders to the Open as Folder confirmation with the connection id` | `D02a-026` |
| `components/sidebar/AddRepoCreateStep.test.tsx:41 :: CreateStep` | INFRA: describe block grouping CreateStep test suite |
| `components/sidebar/AddRepoCreateStep.test.tsx:42 :: renders the name-first create UI with advanced controls collapsed` | `D02a-015` |
| `components/sidebar/AddRepoCreateStep.test.tsx:55 :: shows the Git-required explanation in the collapsed summary` | `D02a-015` |
| `components/sidebar/AddRepoCreateStep.test.tsx:66 :: disables create while an auto-filled parent belongs to a previous target` | `D02a-015` |
| `components/sidebar/AddRepoDialog.default-checkout.test.ts:8 :: AddRepo completion owner routing` | INFRA: describe block grouping AddRepo completion owner routing test suite |
| `components/sidebar/AddRepoDialog.default-checkout.test.ts:9 :: routes an explicitly local completion to the local host` | `D02a-001` |
| `components/sidebar/AddRepoDialog.default-checkout.test.ts:16 :: routes an explicitly runtime completion to its captured runtime` | `D02a-001` |
| `components/sidebar/AddRepoDialog.default-checkout.test.ts:23 :: leaves an absent owner distinguishable from explicit local ownership` | `D02a-001` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:103 :: AddRepoDialogStepContent nested imports` | INFRA: describe block grouping AddRepoDialogStepContent nested imports test suite |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:104 :: asks the grouping question when no repos exist yet` | `D02a-022` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:114 :: shows the same grouping import controls after a repo already exists` | `D02a-022` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:124 :: offers opening the parent folder when nested import selection is empty` | `D02a-022` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:133 :: offers host browsing for remote create project locations` | `D02a-016` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:144 :: uses manual path entry for SSH create project locations` | `D02a-016` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:159 :: offers host browsing for remote clone destinations` | `D02a-012` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:170 :: offers SSH browsing for selected-host clone destinations` | `D02a-012` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:184 :: hides the SSH target chooser after a host was already selected` | `D02a-019` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:227 :: shows a connect affordance for a selected disconnected SSH host` | `D02a-019` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:257 :: uses SSH-aware copy on the add step when an SSH host is selected` | `D02a-019` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:268 :: uses the standard add step for remote Orca server hosts` | `D02a-002` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:285 :: opens the in-app filesystem browser for a paired runtime` | `D02a-010` |
| `components/sidebar/AddRepoHostSelector.test.tsx:31 :: AddRepoHostSelector` | INFRA: describe block grouping AddRepoHostSelector test suite |
| `components/sidebar/AddRepoHostSelector.test.tsx:32 :: shows a remote host setup menu when Local Mac is the only host` | `D02a-005` |
| `components/sidebar/AddRepoHostSelector.test.tsx:61 :: shows disconnected SSH hosts with a connect action in Add Project` | `D02a-003` |
| `components/sidebar/AddRepoHostSelector.test.tsx:97 :: shows exact update guidance for incompatible runtime hosts` | `D02a-003` |
| `components/sidebar/AddRepoNestedImportStep.test.tsx:63 :: AddRepoNestedImportStep` | INFRA: describe block grouping AddRepoNestedImportStep test suite |
| `components/sidebar/AddRepoNestedImportStep.test.tsx:76 :: asks whether the selected folder should be grouped` | `D02a-022` |
| `components/sidebar/AddRepoNestedImportStep.test.tsx:96 :: disables both import actions while scanning` | `D02a-022` |
| `components/sidebar/AddRepoNestedImportStep.test.tsx:106 :: maps the group choice to grouped import and the separate choice to separate import` | `D02a-022` |
| `components/sidebar/AddRepoNestedImportStep.test.tsx:143 :: shows progress only on the clicked import action` | `D02a-022` |
| `components/sidebar/AddRepoNestedImportStep.test.tsx:188 :: offers opening the parent folder when no repositories are selected` | `D02a-022` |
| `components/sidebar/AddRepoStartSteps.test.tsx:165 :: AddRepoLocalStartStep` | INFRA: describe block grouping AddRepoLocalStartStep test suite |
| `components/sidebar/AddRepoStartSteps.test.tsx:170 :: promotes browse folder and keeps secondary actions always visible` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:181 :: orders secondary actions clone-first for default users` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:192 :: keeps Browse folder primary for SSH-likely users` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:201 :: orders secondary actions remote-first for SSH-likely users` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:212 :: lets host-aware Add Project replace the separate remote row` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:219 :: uses host-neutral browse copy for runtime hosts` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:226 :: focuses Browse folder when the default Add Project step opens` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:237 :: focuses Browse folder for SSH-likely users too` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:250 :: renders secondary actions as enabled buttons without a disclosure toggle` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:262 :: disables host-scoped actions until a host is selectable` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:276 :: marks the autofocused Browse action as selected with the ⏎ chip` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:287 :: moves the ⏎ selection to whichever action receives focus` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:303 :: clears the ⏎ selection when focus leaves the action list` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:321 :: does not show an ⏎ selection while add actions are busy` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:345 :: hides the visual ⏎ chip from assistive technology` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:359 :: roves selection down the action list with the ArrowDown key` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.test.tsx:379 :: AddRepoServerPathStartStep` | INFRA: describe block grouping AddRepoServerPathStartStep test suite |
| `components/sidebar/AddRepoStartSteps.test.tsx:380 :: uses native-style project entry cards in server mode` | `D02a-010` |
| `components/sidebar/AddRepoStartSteps.test.tsx:392 :: disables server entry cards without an active runtime environment` | `D02a-010` |
| `components/sidebar/AddRepoSteps.default-checkout.test.ts:90 :: useRemoteRepo default-checkout handoff` | INFRA: describe block grouping useRemoteRepo default-checkout handoff test suite |
| `components/sidebar/AddRepoSteps.default-checkout.test.ts:118 :: requests an authoritative worktree refresh before handoff` | `D02a-020` |
| `components/sidebar/AddRepoSteps.default-checkout.test.ts:154 :: continues to completion when refresh is not authoritative after remote add` | `D02a-020` |
| `components/sidebar/AddRepoSteps.default-checkout.test.ts:179 :: preselects the preferred SSH target when opening Browse for a selected host` | `D02a-020` |
| `components/sidebar/AddRepoSteps.default-checkout.test.ts:198 :: pins SSH nested scans and cancellation to the local provider` | `D02a-021` |
| `components/sidebar/ProjectAddedDialog.test.tsx:64 :: ProjectAddedDialog` | INFRA: describe block grouping ProjectAddedDialog test suite |
| `components/sidebar/ProjectAddedDialog.test.tsx:75 :: fetches worktrees and finishes by opening the default checkout for Git repos` | `D02a-027` |
| `components/sidebar/ProjectAddedDialog.test.tsx:91 :: does not block the compatibility handoff during StrictMode effect replay` | `D02a-027` |
| `components/sidebar/ProjectAddedDialog.test.tsx:123 :: accepts older onboarding modal data that uses projectId` | `D02a-027` |
| `components/sidebar/ProjectAddedDialog.test.tsx:136 :: activates the synthetic folder workspace for folder repos` | `D02a-027` |
| `components/sidebar/ProjectAddedDialog.test.tsx:155 :: closes malformed modal data without blocking the app invisibly` | `D02a-027` |
| `components/sidebar/ProjectAddedDialog.test.tsx:167 :: refreshes repos before closing a stale repo id` | `D02a-027` |
| `components/sidebar/ProjectAddedDialog.test.tsx:181 :: waits for repo hydration and does not close when fetchRepos supplies the repo` | `D02a-027` |
| `components/sidebar/add-repo-browse-authority.test.ts:5 :: routeAddRepoBrowse` | INFRA: describe block grouping routeAddRepoBrowse test suite |
| `components/sidebar/add-repo-browse-authority.test.ts:6 :: opens paired host browsing without invoking native pickFolders` | `D02a-007` |
| `components/sidebar/add-repo-browse-authority.test.ts:20 :: preserves native folder browsing for desktop local hosts` | `D02a-007` |
| `components/sidebar/add-repo-browse-authority.test.ts:32 :: preserves SSH host browsing` | `D02a-007` |
| `components/sidebar/add-repo-existing-workspaces-telemetry.test.ts:32 :: add repo existing workspace telemetry` | INFRA: describe block grouping add repo existing workspace telemetry test suite |
| `components/sidebar/add-repo-existing-workspaces-telemetry.test.ts:33 :: builds count-only payloads without raw workspace names` | `D02a-031` |
| `components/sidebar/add-repo-existing-workspaces-telemetry.test.ts:67 :: tracks detection only for imported linked workspaces` | `D02a-031` |
| `components/sidebar/add-repo-existing-workspaces-telemetry.test.ts:100 :: derives linked and detached counts before clamping reported values` | `D02a-031` |
| `components/sidebar/add-repo-existing-workspaces-telemetry.test.ts:121 :: sorts without crashing when a detected worktree has no displayName (crash 99657ab1)` | `D02a-031` |
| `components/sidebar/add-repo-skip-finalization.test.ts:49 :: finalizeImportedRepoAfterSkip` | INFRA: describe block grouping finalizeImportedRepoAfterSkip test suite |
| `components/sidebar/add-repo-skip-finalization.test.ts:50 :: keeps skipped imported worktrees visible without activating a worktree` | `D02a-030` |
| `components/sidebar/add-repo-skip-finalization.test.ts:69 :: leaves the project filter off when the import lands with no filter` | `D02a-030` |
| `components/sidebar/add-repo-skip-finalization.test.ts:77 :: clears default-branch hiding when it would hide every imported worktree` | `D02a-030` |
| `components/sidebar/add-repo-skip-finalization.test.ts:97 :: re-enables the default-branch exemption when the import would land asleep and hidden` | `D02a-030` |
| `components/sidebar/add-repo-skip-finalization.test.ts:118 :: leaves the default-branch exemption alone when sleeping workspaces are shown` | `D02a-030` |
| `components/sidebar/add-repo-skip-finalization.test.ts:139 :: still reveals the imported repo when it has no discovered worktrees yet` | `D02a-030` |
| `components/sidebar/clone-defaults.test.ts:4 :: getDefaultCloneParent` | INFRA: describe block grouping getDefaultCloneParent test suite |
| `components/sidebar/clone-defaults.test.ts:5 :: strips a POSIX workspaces suffix` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:9 :: strips a POSIX workspaces suffix with a trailing slash` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:13 :: strips a Windows workspaces suffix` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:19 :: leaves input without a workspaces suffix unchanged` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:23 :: returns empty input unchanged` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:27 :: returns an empty parent for workspaces alone` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:31 :: returns root for an absolute root workspaces path` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:35 :: returns the drive root for a Windows root workspaces path` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:39 :: strips repeated trailing separators before matching the suffix` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:43 :: does not strip a similar-looking final segment` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:50 :: getCloneDestinationAutoFill` | INFRA: describe block grouping getCloneDestinationAutoFill test suite |
| `components/sidebar/clone-defaults.test.ts:51 :: fills the local clone destination from the workspace directory` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:63 :: waits for a workspace directory before filling` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:75 :: does not overwrite typed destinations or repeat an auto-fill` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:96 :: does not fill server clone destinations for runtime environments` | `D02a-013` |
| `components/sidebar/clone-defaults.test.ts:108 :: does not fill SSH clone destinations from the local workspace directory` | `D02a-013` |
| `components/sidebar/create-project-defaults.test.ts:9 :: create project defaults` | INFRA: describe block grouping create project defaults test suite |
| `components/sidebar/create-project-defaults.test.ts:10 :: builds the POSIX default project parent` | `D02a-017` |
| `components/sidebar/create-project-defaults.test.ts:14 :: builds the Windows default project parent` | `D02a-017` |
| `components/sidebar/create-project-defaults.test.ts:20 :: derives the runtime project default from a resolved server home` | `D02a-017` |
| `components/sidebar/create-project-defaults.test.ts:24 :: joins path previews without mixing separators` | `D02a-017` |
| `components/sidebar/create-project-defaults.test.ts:33 :: auto-fills only the first empty local create step` | `D02a-017` |
| `components/sidebar/create-project-defaults.test.ts:63 :: does not apply a local default while a runtime environment is active` | `D02a-017` |
| `components/sidebar/create-project-defaults.test.ts:75 :: uses a short local summary only for the local default parent` | `D02a-017` |
| `components/sidebar/create-project-defaults.test.ts:117 :: keeps a configured Workspace Directory verbatim in the summary` | `D02a-017` |
| `components/sidebar/folder-workspace-card-pr-display.test.ts:73 :: getFolderWorkspaceCardPrDisplay` | INFRA: describe block grouping getFolderWorkspaceCardPrDisplay test suite |
| `components/sidebar/folder-workspace-card-pr-display.test.ts:74 :: uses the existing repo lookup without enumerating all repos` | `D02a-038` |
| `components/sidebar/folder-workspace-card-pr-display.test.ts:92 :: uses failing attached PR status ahead of pending and passing PRs` | `D02a-038` |
| `components/sidebar/folder-workspace-card-pr-display.test.ts:122 :: uses pending attached PR status ahead of passing PRs` | `D02a-038` |
| `components/sidebar/folder-workspace-card-pr-display.test.ts:148 :: omits a matching suppressed branch PR from attached worktrees` | `D02a-038` |
| `components/sidebar/folder-workspace-card-pr-display.test.ts:168 :: includes nested attached worktree PRs` | `D02a-038` |
| `components/sidebar/folder-workspace-card-pr-display.test.ts:190 :: includes a nested PR from exact inline-only legacy lineage` | `D02a-038` |
| `components/sidebar/folder-workspace-card-pr-display.test.ts:211 :: keeps a stale side-map entry authoritative over valid inline lineage` | `D02a-038` |
| `components/sidebar/folder-workspace-card-pr-display.test.ts:270 :: excludes nested PRs from cyclic projected lineage` | `D02a-038` |
| `components/sidebar/folder-workspace-card-pr-display.test.ts:293 :: uses branch-discovered PR cache for unlinked attached worktrees` | `D02a-038` |
| `components/sidebar/folder-workspace-card-pr-display.test.ts:311 :: uses the right-sidebar classified status for conflicting PRs` | `D02a-038` |
| `components/sidebar/folder-workspace-card-pr-display.test.ts:332 :: does not use stale merged branch PR cache after the worktree advances` | `D02a-038` |
| `components/sidebar/folder-workspace-composer-helpers.test.ts:38 :: getFolderSourceRepos` | INFRA: describe block grouping getFolderSourceRepos test suite |
| `components/sidebar/folder-workspace-composer-helpers.test.ts:39 :: only returns source repos from the same execution host as the folder group` | `D02a-037` |
| `components/sidebar/folder-workspace-composer-helpers.test.ts:59 :: returns runtime source repos for runtime-owned folder groups` | `D02a-037` |
| `components/sidebar/folder-workspace-composer-helpers.test.ts:83 :: getFolderWorkspacePrimaryActionLabel` | INFRA: describe block grouping getFolderWorkspacePrimaryActionLabel test suite |
| `components/sidebar/folder-workspace-composer-helpers.test.ts:84 :: uses a stable workspace creation label independent of quick agent selection` | `D02a-037` |
| `components/sidebar/folder-workspace-composer-path-status.test.tsx:38 :: useFolderWorkspaceComposerPathStatus` | INFRA: describe block grouping useFolderWorkspaceComposerPathStatus test suite |
| `components/sidebar/folder-workspace-composer-path-status.test.tsx:52 :: blocks creation while an expired path status refresh is pending` | `D02a-036` |
| `components/sidebar/folder-workspace-composer-path-status.test.tsx:118 :: unblocks creation when the first path status check settles without cache` | `D02a-036` |
| `components/sidebar/folder-workspace-composer-path-status.test.tsx:157 :: blocks creation while the first path status check is unknown` | `D02a-036` |
| `components/sidebar/folder-workspace-composer-path-status.test.tsx:183 :: does not block creation for an unavailable path status` | `D02a-036` |
| `components/sidebar/folder-workspace-composer-path-status.test.tsx:220 :: blocks while refreshing after a cached blocking path status expires` | `D02a-036` |
| `components/sidebar/folder-workspace-composer-path-status.test.tsx:281 :: tracks settled path status refreshes by cache key and expiry generation` | `D02a-036` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:71 :: submitFolderWorkspaceCreate` | INFRA: describe block grouping submitFolderWorkspaceCreate test suite |
| `components/sidebar/folder-workspace-composer-submit.test.ts:90 :: closes the composer after creation even when reveal fails` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:128 :: marks a blank folder workspace for first-input rename when launching an agent with a note` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:176 :: does not mark first-input rename when the folder workspace has an explicit name` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:201 :: does not mark first-input rename when a linked work item owns the folder workspace name` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:234 :: creates a Jira folder workspace with its bound source context` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:280 :: keeps linked Codex context out of submitted startup and pastes it as a draft` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:332 :: pre-marks remote linked Codex folder workspaces trusted before draft paste` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:383 :: delivers non-linked follow-up prompts for agents that need stdin after launch` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:412 :: uses native draft launch for linked agents with prefill support` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:443 :: uses native prefill for link-only Linear folder workspace drafts` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:505 :: keeps explicit blank linked folder creates free of agent startup and draft paste` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:542 :: does not mark first-input rename without submitted first input` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:567 :: quotes quick-agent startup for POSIX when the folder group is a local WSL UNC path` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:599 :: quotes quick-agent startup for Windows when the remote folder group uses a Windows path` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:632 :: preserves SSH group ownership when creating and activating a folder workspace` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:669 :: returns false when folder workspace creation fails without returning a workspace` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:693 :: submitFolderWorkspaceCreate native-chat launch draft` | INFRA: describe block grouping submitFolderWorkspaceCreate native-chat launch draft test suite |
| `components/sidebar/folder-workspace-composer-submit.test.ts:724 :: mirrors a startup-paste draft into the chat composer` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:741 :: mirrors an argv-prefill draft, which never lands in startupPlan.draftPrompt` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:763 :: mirrors a multi-line draft into chat` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:787 :: does not mirror an unlinked note, which is submitted rather than drafted` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:805 :: folder-workspace draft: seeded set == chat-opening set` | INFRA: describe block grouping folder-workspace draft: seeded set == chat-opening set test suite |
| `components/sidebar/folder-workspace-linked-startup-plan.test.ts:4 :: buildFolderWorkspaceLinkedStartupPlan` | INFRA: describe block grouping buildFolderWorkspaceLinkedStartupPlan test suite |
| `components/sidebar/folder-workspace-linked-startup-plan.test.ts:5 :: uses cmd quoting for configured arguments on local Windows` | `D02a-035` |
| `components/sidebar/project-added-default-checkout.test.ts:106 :: getProjectDefaultCheckout` | INFRA: describe block grouping getProjectDefaultCheckout test suite |
| `components/sidebar/project-added-default-checkout.test.ts:107 :: returns the main worktree rather than the first worktree` | `D02a-028` |
| `components/sidebar/project-added-default-checkout.test.ts:123 :: finishProjectAddWithDefaultCheckout` | INFRA: describe block grouping finishProjectAddWithDefaultCheckout test suite |
| `components/sidebar/project-added-default-checkout.test.ts:147 :: closes the modal and activates the default checkout` | `D02a-028` |
| `components/sidebar/project-added-default-checkout.test.ts:179 :: activates only the captured host default checkout when repo IDs collide` | `D02a-028` |
| `components/sidebar/project-added-default-checkout.test.ts:224 :: activates a runtime-owned checkout even when its physical host is private SSH` | `D02a-028` |
| `components/sidebar/project-added-default-checkout.test.ts:244 :: passes a contained selected path through as the initial terminal cwd` | `D02a-028` |
| `components/sidebar/project-added-default-checkout.test.ts:261 :: skips the initial cwd override when the selected path is the repo root` | `D02a-028` |
| `components/sidebar/project-added-default-checkout.test.ts:276 :: shows a hidden detected default checkout before activating it` | `D02a-029` |
| `components/sidebar/project-added-default-checkout.test.ts:320 :: reveals detected sibling external worktrees when the default checkout is already loaded` | `D02a-029` |
| `components/sidebar/project-added-default-checkout.test.ts:349 :: does not refresh already-visible sibling external worktrees` | `D02a-029` |
| `components/sidebar/project-added-default-checkout.test.ts:374 :: does not flip visibility when the only hidden siblings are agent scratch` | `D02a-028` |
| `components/sidebar/project-added-default-checkout.test.ts:394 :: does not repeat linked-worktree reveal after a hidden default checkout refresh` | `D02a-028` |
| `components/sidebar/project-added-default-checkout.test.ts:439 :: reveals the project if showing sibling external worktrees fails` | `D02a-029` |
| `components/sidebar/project-added-default-checkout.test.ts:464 :: reveals the project if sibling external worktree refresh is not authoritative` | `D02a-029` |
| `components/sidebar/project-added-default-checkout.test.ts:489 :: reveals the project if no default checkout is available` | `D02a-028` |
| `components/sidebar/project-added-default-checkout.test.ts:514 :: reveals the project even when no worktrees are loaded` | `D02a-028` |
| `components/sidebar/use-add-repo-host-selection.test.ts:72 :: useAddRepoHostSelection` | INFRA: describe block grouping useAddRepoHostSelection test suite |
| `components/sidebar/use-add-repo-host-selection.test.ts:122 :: exposes the selected SSH target id` | `D02a-003` |
| `components/sidebar/use-add-repo-host-selection.test.ts:133 :: selects a runtime host without changing the durable active server` | `D02a-003` |
| `components/sidebar/use-add-repo-host-selection.test.ts:146 :: uses the paired runtime as the only local filesystem authority in web clients` | `D02a-003` |
| `components/sidebar/use-add-repo-host-selection.test.ts:161 :: has no local fallback while a paired web runtime is loading` | `D02a-003` |
| `components/sidebar/use-add-repo-host-selection.test.ts:196 :: selects a local or SSH host without changing the durable active server` | `D02a-003` |
| `components/sidebar/use-add-repo-host-selection.test.ts:210 :: falls back from a disconnected selected SSH host to Local Mac` | `D02a-003` |
| `components/sidebar/use-add-repo-host-selection.test.ts:224 :: does not select a disconnected SSH host` | `D02a-003` |
| `components/sidebar/use-add-repo-host-selection.test.ts:241 :: connects and selects a disconnected SSH host from Add Project` | `D02a-003` |
| `components/sidebar/use-add-repo-host-selection.test.ts:273 :: does not auto-select the active runtime host while it is unavailable` | `D02a-003` |
| `components/sidebar/use-add-repo-host-selection.test.ts:287 :: hides ephemeral VM runtime hosts from Add Project selection` | `D02a-003` |
| `components/sidebar/use-add-repo-hosted-controller.test.ts:35 :: useAddRepoHostedController` | INFRA: describe block grouping useAddRepoHostedController test suite |
| `components/sidebar/use-add-repo-hosted-controller.test.ts:40 :: falls back to the store closeModal without a hosted controller` | `D02a-040` |
| `components/sidebar/use-add-repo-hosted-controller.test.ts:50 :: closes only the hosted dialog, never the store modal slot` | `D02a-040` |
| `components/sidebar/use-add-repo-hosted-controller.test.ts:62 :: folder handoffs close both the hosted dialog and the composer modal` | `D02a-040` |
| `components/sidebar/use-add-repo-hosted-controller.test.ts:77 :: finishProjectAdd closes the hosted dialog and hands the repo to the host` | `D02a-040` |
| `components/sidebar/use-add-repo-hosted-controller.test.ts:96 :: SSH settings navigation closes both hosted dialog and composer modal` | `D02a-040` |
| `components/sidebar/useAddRepoCloneFlow.test.ts:92 :: useAddRepoCloneFlow` | INFRA: describe block grouping useAddRepoCloneFlow test suite |
| `components/sidebar/useAddRepoCloneFlow.test.ts:115 :: clones through the selected SSH target` | `D02a-014` |
| `components/sidebar/useAddRepoCloneFlow.test.ts:155 :: does not prefill SSH clone destinations from the local workspace directory` | `D02a-014` |
| `components/sidebar/useAddRepoCloneFlow.test.ts:172 :: strips Electron IPC wrappers from clone errors` | `D02a-014` |
| `components/sidebar/useAddRepoCloneFlow.test.ts:193 :: clones through the selected runtime environment` | `D02a-014` |
| `components/sidebar/useAddRepoLocalFolderFlow.test.ts:58 :: useAddRepoLocalFolderFlow` | INFRA: describe block grouping useAddRepoLocalFolderFlow test suite |
| `components/sidebar/useAddRepoLocalFolderFlow.test.ts:86 :: adds every selected local folder and completes one default-checkout handoff` | `D02a-008` |
| `components/sidebar/useAddRepoLocalFolderFlow.test.ts:133 :: skips nested-review folders in a multi-folder add and continues with git folders` | `D02a-009` |
| `components/sidebar/useAddRepoLocalFolderFlow.test.ts:172 :: still completes handoff when a later selected folder is skipped` | `D02a-008` |
| `components/sidebar/useAddRepoLocalFolderFlow.test.ts:208 :: drops a local scan completion after host-scoped reset` | `D02a-008` |
| `components/sidebar/useAddRepoNestedImportFlow.test.ts:95 :: useAddRepoNestedImportFlow open folder fallback` | INFRA: describe block grouping useAddRepoNestedImportFlow open folder fallback test suite |
| `components/sidebar/useAddRepoNestedImportFlow.test.ts:102 :: opens the scanned local root through the existing non-git folder flow` | `D02a-025` |
| `components/sidebar/useAddRepoNestedImportFlow.test.ts:116 :: keeps runtime folder opens on the runtime that produced the scan` | `D02a-025` |
| `components/sidebar/useAddRepoNestedImportFlow.test.ts:129 :: names the folder project after the edited group name` | `D02a-025` |
| `components/sidebar/useAddRepoNestedImportFlow.test.ts:142 :: leaves host basename naming alone when the group name is untouched` | `D02a-025` |
| `components/sidebar/useAddRepoNestedImportFlow.test.ts:154 :: carries the edited group name into the SSH folder confirmation` | `D02a-025` |
| `components/sidebar/useAddRepoNestedImportFlow.test.ts:169 :: tracks the open-as-folder recovery action with zero selection` | `D02a-025` |
| `components/sidebar/useAddRepoNestedImportFlow.test.ts:186 :: uses the existing SSH non-git folder confirmation for SSH scans` | `D02a-024` |
| `components/sidebar/useAddRepoNestedImportFlow.test.ts:202 :: keeps SSH import and completion pinned when repo hydration is missing` | `D02a-024` |
| `components/sidebar/useAddRepoServerPathFlow.test.ts:64 :: useAddRepoServerPathFlow` | INFRA: describe block grouping useAddRepoServerPathFlow test suite |
| `components/sidebar/useAddRepoServerPathFlow.test.ts:72 :: marks onboarding folder progress before closing server folder adds` | `D02a-011` |
| `components/sidebar/useAddRepoServerPathFlow.test.ts:102 :: routes the nested Git pre-scan and add through the selected runtime` | `D02a-011` |
| `components/sidebar/useCreateProjectDefaults.test.ts:76 :: useCreateProjectDefaults` | INFRA: describe block grouping useCreateProjectDefaults test suite |
| `components/sidebar/useCreateProjectDefaults.test.ts:94 :: auto-fills the local default parent and reports Git availability` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.test.ts:107 :: auto-fills the local home default regardless of workspace directory settings` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.test.ts:118 :: keeps the local default marker after the auto-filled parent rerenders the hook` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.test.ts:128 :: reports unavailable Git without changing the fixed project kind` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.test.ts:137 :: reports unknown availability when the Git probe fails` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.test.ts:146 :: does not overwrite a parent the user already chose` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.test.ts:155 :: resolves the runtime default parent from the host home directory` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.test.ts:176 :: replaces an untouched local default when switching to a runtime target` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.test.ts:207 :: does not replace a touched parent when switching to a runtime target` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.test.ts:234 :: marks the runtime parent lookup failed without filling a parent` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.test.ts:245 :: does not use client defaults or Git probing for SSH targets` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.test.ts:258 :: does nothing outside the create step` | `D02a-017` |
| `components/sidebar/useCreateRepo.default-checkout.test.ts:101 :: useCreateRepo default-checkout handoff` | INFRA: describe block grouping useCreateRepo default-checkout handoff test suite |
| `components/sidebar/useCreateRepo.default-checkout.test.ts:129 :: requests an authoritative worktree refresh before handoff` | `D02a-018` |
| `components/sidebar/useCreateRepo.default-checkout.test.ts:155 :: returns the selected parent directory after the local picker applies it` | `D02a-018` |
| `components/sidebar/useCreateRepo.default-checkout.test.ts:166 :: does not return a parent path when the runtime target blocks the local picker` | `D02a-018` |
| `components/sidebar/useCreateRepo.default-checkout.test.ts:178 :: continues to completion when refresh is not authoritative after create` | `D02a-018` |
| `components/sidebar/useCreateRepo.default-checkout.test.ts:196 :: opens an existing folder project returned by create dedupe` | `D02a-018` |
| `components/sidebar/useCreateRepo.default-checkout.test.ts:224 :: creates projects through the SSH host when an SSH target is selected` | `D02a-018` |
| `components/sidebar/useCreateRepo.default-checkout.test.ts:253 :: creates projects through the selected runtime environment` | `D02a-018` |

## 4. Labels / Textos de UI (`labels`)

| Entrada de Label | Mapeamento / Justificativa |
|---|---|
| `components/sidebar/AddProjectFromFolderDialog.test.tsx:7 :: label: string` | INFRA: test mock/helper/type definition for button/label capture |
| `components/sidebar/AddProjectFromFolderDialog.test.tsx:79 :: mocks.buttons.push({ label: textContent(children), onClick, disabled })` | INFRA: test mock/helper/type definition for button/label capture |
| `components/sidebar/AddProjectFromFolderDialog.test.tsx:120 :: function getButton(label: string): ButtonCapture {` | INFRA: test mock/helper/type definition for button/label capture |
| `components/sidebar/AddRepoCloneStep.tsx:121 :: placeholder={translate(` | `D02a-012` |
| `components/sidebar/AddRepoCloneStep.tsx:140 :: placeholder={` | `D02a-012` |
| `components/sidebar/AddRepoCloneStep.tsx:166 :: title={` | `D02a-012` |
| `components/sidebar/AddRepoCloneStep.tsx:174 :: aria-label={` | `D02a-012` |
| `components/sidebar/AddRepoCreateStep.test.tsx:4 :: import { TooltipProvider } from '@/components/ui/tooltip'` | INFRA: test mock/helper/type definition for button/label capture |
| `components/sidebar/AddRepoCreateStep.test.tsx:52 :: expect(html).not.toContain('aria-label="Browse host filesystem"')` | `D02a-016` |
| `components/sidebar/AddRepoCreateStep.tsx:160 :: placeholder={translate(` | `D02a-015` |
| `components/sidebar/AddRepoCreateStep.tsx:220 :: title={targetPathPreview}` | `D02a-015` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:5 :: import { TooltipProvider } from '@/components/ui/tooltip'` | INFRA: test mock/helper/type definition for button/label capture |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:108 :: expect(html).toContain('aria-label="Group name"')` | `D02a-022` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:118 :: expect(html).toContain('aria-label="Group name"')` | `D02a-022` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:153 :: expect(html).toContain('placeholder="/home/user/projects"')` | `D02a-016` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:154 :: expect(html).toContain('aria-label="Browse host filesystem"')` | `D02a-016` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:155 :: expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*aria-label="Browse host filesystem"/)` | `D02a-016` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:167 :: expect(html).toContain('aria-label="Browse host filesystem"')` | `D02a-016` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:180 :: expect(html).toContain('aria-label="Browse host filesystem"')` | `D02a-016` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:181 :: expect(html).not.toContain('aria-label="Choose folder"')` | INFRA: test assertion or label fixture in unit test |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:192 :: label: 'github.com',` | `D02a-003` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:205 :: label: 'openclaw 2',` | `D02a-003` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:235 :: label: 'openclaw 2',` | `D02a-003` |
| `components/sidebar/AddRepoDialogStepContent.test.tsx:253 :: expect(html).toContain('placeholder="/home/user/project"')` | INFRA: test assertion or label fixture in unit test |
| `components/sidebar/AddRepoHostSelector.test.tsx:38 :: label: 'Local Mac',` | `D02a-003` |
| `components/sidebar/AddRepoHostSelector.test.tsx:67 :: label: 'Local Mac',` | `D02a-003` |
| `components/sidebar/AddRepoHostSelector.test.tsx:75 :: label: 'Builder',` | `D02a-003` |
| `components/sidebar/AddRepoHostSelector.test.tsx:103 :: label: 'Local Mac',` | `D02a-003` |
| `components/sidebar/AddRepoHostSelector.test.tsx:111 :: label: 'Old server',` | INFRA: test assertion or label fixture in unit test |
| `components/sidebar/AddRepoHostSelector.tsx:69 :: title={getHostStatusDetail(selectedHost)}` | `D02a-003` |
| `components/sidebar/AddRepoNestedImportStep.test.tsx:8 :: import { TooltipProvider } from '@/components/ui/tooltip'` | INFRA: test mock/helper/type definition for button/label capture |
| `components/sidebar/AddRepoNestedImportStep.test.tsx:53 :: function findButton(container: HTMLElement, label: string): HTMLButtonElement {` | INFRA: test mock/helper/type definition for button/label capture |
| `components/sidebar/AddRepoNestedImportStep.test.tsx:82 :: expect(html).toContain('aria-label="Group name"')` | `D02a-022` |
| `components/sidebar/AddRepoNestedImportStep.tsx:7 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D02a-041` |
| `components/sidebar/AddRepoNestedImportStep.tsx:139 :: aria-label={translate(` | `D02a-022` |
| `components/sidebar/AddRepoNestedImportStep.tsx:147 :: placeholder={folderName}` | `D02a-022` |
| `components/sidebar/AddRepoNestedImportStep.tsx:212 :: aria-label={translate(` | `D02a-022` |
| `components/sidebar/AddRepoNestedImportStep.tsx:216 :: title={translate(` | `D02a-022` |
| `components/sidebar/AddRepoRemoteStep.tsx:182 :: placeholder={translate(` | `D02a-019` |
| `components/sidebar/AddRepoServerStartStep.tsx:6 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D02a-010` |
| `components/sidebar/AddRepoServerStartStep.tsx:94 :: title={translate(` | `D02a-010` |
| `components/sidebar/AddRepoServerStartStep.tsx:107 :: title={translate(` | `D02a-010` |
| `components/sidebar/AddRepoServerStartStep.tsx:120 :: title={translate(` | `D02a-010` |
| `components/sidebar/AddRepoServerStartStep.tsx:192 :: placeholder={translate(` | `D02a-010` |
| `components/sidebar/AddRepoServerStartStep.tsx:210 :: aria-label={translate(` | `D02a-010` |
| `components/sidebar/AddRepoStartSteps.test.tsx:8 :: import { TooltipProvider } from '@/components/ui/tooltip'` | INFRA: test mock/helper/type definition for button/label capture |
| `components/sidebar/AddRepoStartSteps.test.tsx:97 :: function findButton(container: HTMLElement, label: string): HTMLButtonElement {` | INFRA: test mock/helper/type definition for button/label capture |
| `components/sidebar/AddRepoStartSteps.test.tsx:329 :: 'button[aria-label="Stop scan"]'` | `D02a-041` |
| `components/sidebar/AddRepoStartSteps.tsx:6 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D02a-041` |
| `components/sidebar/AddRepoStartSteps.tsx:36 :: aria-label={translate(` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.tsx:40 :: title={translate(` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.tsx:178 :: title={primaryAction.title}` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.tsx:200 :: title={action.title}` | `D02a-006` |
| `components/sidebar/AddRepoSteps.default-checkout.test.ts:100 :: { id: 'ssh-1', label: 'Builder 1' },` | `D02a-003` |
| `components/sidebar/AddRepoSteps.default-checkout.test.ts:101 :: { id: 'ssh-2', label: 'Builder 2' }` | `D02a-003` |
| `components/sidebar/CreateProjectLocationField.tsx:5 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D02a-016` |
| `components/sidebar/CreateProjectLocationField.tsx:97 :: placeholder={translate(` | `D02a-016` |
| `components/sidebar/CreateProjectLocationField.tsx:114 :: aria-label={translate(` | `D02a-016` |
| `components/sidebar/CreateProjectLocationField.tsx:132 :: <span className="flex-1 min-w-0 truncate font-mono text-[12px]" title={createParent}>` | `D02a-016` |
| `components/sidebar/CreateProjectLocationField.tsx:140 :: aria-label={translate(` | `D02a-016` |
| `components/sidebar/use-add-repo-host-selection.test.ts:82 :: label: 'Local Mac',` | `D02a-003` |
| `components/sidebar/use-add-repo-host-selection.test.ts:90 :: label: 'Builder',` | `D02a-003` |
| `components/sidebar/use-add-repo-host-selection.test.ts:98 :: label: 'Server',` | INFRA: test assertion or label fixture in unit test |
| `components/sidebar/use-add-repo-host-selection.test.ts:291 :: label: 'orca VM abc12345',` | INFRA: test assertion or label fixture in unit test |
| `components/sidebar/useAddRepoLocalFolderFlow.ts:68 :: setAddProjectBusyLabel: (label: string \| null) => void` | INFRA: callback type signature for setting busy label |
| `components/sidebar/useAddRepoServerPathFlow.ts:68 :: setAddProjectBusyLabel: (label: string \| null) => void` | INFRA: callback type signature for setting busy label |

## 5. Atalhos de Teclado (`hotkeys`)

| Atalho / Interação Teclado | Mapeamento / Justificativa |
|---|---|
| `components/sidebar/AddRepoCloneStep.tsx:44 :: const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {` | `D02a-012` |
| `components/sidebar/AddRepoRemoteStep.tsx:175 :: if (event.key === 'Enter' && !event.nativeEvent.isComposing) {` | `D02a-019` |
| `components/sidebar/AddRepoStartSteps.test.tsx:364 :: new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })` | INFRA: simulated keydown event in arrow navigation unit test |
| `components/sidebar/AddRepoStartSteps.tsx:5 :: import { ShortcutKeyCombo } from '@/components/ShortcutKeyCombo'` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.tsx:126 :: const handleArrowNavigation = (event: React.KeyboardEvent<HTMLDivElement>): void => {` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.tsx:127 :: if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.tsx:137 :: const delta = event.key === 'ArrowDown' ? 1 : -1` | `D02a-006` |
| `components/sidebar/AddRepoStartSteps.tsx:243 :: <ShortcutKeyCombo` | `D02a-006` |

## 6. Preferências e Persistência (`prefs`)

*Nenhuma preferência direta registrada no índice do domínio.*

## 7. Timers e Prazos Assíncronos (`timers`)

| Timer / Timeout | Mapeamento / Justificativa |
|---|---|
| `components/sidebar/useCreateProjectDefaults.test.ts:59 :: return new Promise((resolve) => setTimeout(resolve, 0))` | INFRA: async test helper tick for promise resolution |
| `components/sidebar/useCreateProjectDefaults.ts:26 :: let timeout: ReturnType<typeof setTimeout> \| null = null` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.ts:28 :: timeout = setTimeout(() => reject(new Error('Timed out')), timeoutMs)` | `D02a-017` |

## 8. Subscrições e Efeitos (`subscriptions`)

| Subscrição / Effect | Mapeamento / Justificativa |
|---|---|
| `components/sidebar/AddRepoNestedImportStep.tsx:49 :: useEffect(() => {` | `D02a-022` |
| `components/sidebar/AddRepoStartSteps.tsx:119 :: useEffect(() => {` | `D02a-006` |
| `components/sidebar/AddRepoSteps.tsx:118 :: useEffect(() => {` | `D02a-020` |
| `components/sidebar/ProjectAddedDialog.tsx:33 :: useEffect(() => {` | `D02a-027` |
| `components/sidebar/folder-workspace-composer-path-status.ts:74 :: useEffect(() => {` | `D02a-036` |
| `components/sidebar/use-add-repo-host-change-reset.ts:16 :: useEffect(() => {` | `D02a-004` |
| `components/sidebar/use-add-repo-host-change-reset.ts:23 :: useEffect(() => {` | `D02a-004` |
| `components/sidebar/use-add-repo-host-selection.ts:82 :: useEffect(() => {` | `D02a-003` |
| `components/sidebar/useAddRepoCloneFlow.ts:65 :: useEffect(() => {` | `D02a-014` |
| `components/sidebar/useAddRepoLocalFolderFlow.ts:283 :: useEffect(() => {` | `D02a-008` |
| `components/sidebar/useCreateProjectDefaults.ts:130 :: useEffect(() => {` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.ts:187 :: useEffect(() => {` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.ts:256 :: useEffect(() => {` | `D02a-017` |

## 9. Contratos de Backend / Preload IPC (`preload`)

| Chamada Preload / IPC | Mapeamento / Justificativa |
|---|---|
| `components/sidebar/AddProjectFromFolderDialog.tsx:77 :: const result = await window.api.repos.addRemote({` | `D02a-026` |
| `components/sidebar/AddRepoDialog.tsx:213 :: void window.api.repos.cloneAbort()` | `D02a-001` |
| `components/sidebar/AddRepoSteps.tsx:78 :: const targets = (await window.api.ssh.listTargets()) as SshTarget[]` | `D02a-020` |
| `components/sidebar/AddRepoSteps.tsx:84 :: const state = (await window.api.ssh.getState({` | `D02a-020` |
| `components/sidebar/AddRepoSteps.tsx:119 :: const unsubscribe = window.api.ssh.onStateChanged(({ targetId, state }) => {` | `D02a-020` |
| `components/sidebar/AddRepoSteps.tsx:130 :: await window.api.ssh.connect({ targetId })` | `D02a-020` |
| `components/sidebar/AddRepoSteps.tsx:185 :: const result = await window.api.repos.addRemote({` | `D02a-020` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:316 :: expect(window.api.agentTrust?.markTrusted).toHaveBeenCalledWith({` | `D02a-034` |
| `components/sidebar/folder-workspace-composer-submit.test.ts:367 :: expect(window.api.agentTrust?.markTrusted).toHaveBeenCalledWith({` | `D02a-034` |
| `components/sidebar/use-add-repo-host-selection.ts:132 :: const connectResult = (await window.api.ssh.connect({` | `D02a-003` |
| `components/sidebar/use-add-repo-host-selection.ts:137 :: ((await window.api.ssh.getState({` | `D02a-003` |
| `components/sidebar/useAddRepoCloneFlow.ts:69 :: return window.api.repos.onCloneProgress(setCloneProgress)` | `D02a-014` |
| `components/sidebar/useAddRepoCloneFlow.ts:111 :: const dir = await window.api.repos.pickDirectory()` | `D02a-014` |
| `components/sidebar/useAddRepoCloneFlow.ts:136 :: ? await window.api.repos.cloneRemote({` | `D02a-014` |
| `components/sidebar/useAddRepoCloneFlow.ts:153 :: : ((await window.api.repos.clone({` | `D02a-014` |
| `components/sidebar/useAddRepoLocalFolderFlow.ts:299 :: const paths = await window.api.repos.pickFolders()` | `D02a-008` |
| `components/sidebar/useCreateProjectDefaults.ts:158 :: void window.api.repos` | `D02a-017` |
| `components/sidebar/useCreateProjectDefaults.ts:276 :: : window.api.repos.isGitAvailable()` | `D02a-017` |
| `components/sidebar/useCreateRepo.default-checkout.test.ts:157 :: vi.mocked(window.api.repos.pickDirectory).mockResolvedValue(pickedDir)` | `D02a-018` |
| `components/sidebar/useCreateRepo.default-checkout.test.ts:174 :: expect(window.api.repos.pickDirectory).not.toHaveBeenCalled()` | `D02a-018` |
| `components/sidebar/useCreateRepo.ts:77 :: const dir = await window.api.repos.pickDirectory()` | `D02a-018` |
| `components/sidebar/useCreateRepo.ts:107 :: ? await window.api.repos.createRemote({` | `D02a-018` |
| `components/sidebar/useCreateRepo.ts:124 :: : await window.api.repos.create({` | `D02a-018` |
