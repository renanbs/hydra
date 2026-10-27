# D02c — project-groups-scripts — GAPS (Fase 2, veredito Hydra)

Domínio: `D02c-project-groups-scripts` (26 linhas). Entrada congelada:
`domains/D02c-project-groups-scripts.orca.json`. Protocolo: `HYDRA_MAPPING.md`.
Diff: `domains/D02c-project-groups-scripts.diff.json`.

Fonte Hydra: `/home/renan/orca/workspaces/hydra/ondine` (mount do sidebar:
`src/App.tsx:3636` → `src/components/sidebar/WorktreeSidebar.tsx` → `WorktreeList.tsx` /
`WorktreeVisibilityDialog.tsx`). Índices: `index/hydra_scope.json`, `hydra_invoke.json`,
`hydra_wiring.json`, `hydra_tauri_commands.json`.

## Sumário

| status | n |
|---|---|
| parity | 1 |
| partial | 3 |
| missing | 22 |
| not-applicable | 0 |
| out-of-scope | 0 |

| id | capability | status | evidência Hydra (âncora) |
|---|---|---|---|
| D02c-001 | HiddenWorktreeRecoveryList (busca/virtualização/reexibição) | partial | `WorktreeVisibilityDialog.tsx:557` |
| D02c-002 | SuppressExternalWorktreeInboxDialog | missing | `NewExternalWorktreesInboxLine.tsx:52` (só o `×`) |
| D02c-003 | LinearAgentSkillSetupDialog | missing | i18n `en.json:11267` órfão |
| D02c-004 | LinearAgentSkillSetupPrompt | missing | `useInstalledAgentSkills.ts:122` (infra genérica) |
| D02c-005 | linear-agent-skill-runtime | missing | — |
| D02c-006 | linear-agent-skill-setup-copy | missing | — |
| D02c-007 | reminder toast hook | missing | — |
| D02c-008 | reminders LRU | missing | — |
| D02c-009 | NonGitFolderDialog | missing | `AddRepoDialog.tsx:60` (import silencioso) |
| D02c-010 | complete/track-nested-folder-open | missing | `nested-repo-telemetry.ts:170` (builder sem caller) |
| D02c-011 | OrcaYamlTrustDialog | missing | `ui-slice-trust-actions.ts:7` (ação sem UI) |
| D02c-012 | PreservedBranchBatchReviewDialog | missing | `force-delete-preserved-branch.ts:11` (stub nulo) |
| D02c-013 | preserved-branch-batch-toast | missing | idem |
| D02c-014 | preserved-branch-toast | missing | `DeleteWorktreeDialog.tsx:95` |
| D02c-015 | ProjectGroupDeleteDialog | partial | `ProjectGroupDeleteDialog.tsx:14` |
| D02c-016 | ProjectGroupNameDialog | parity | `ProjectGroupNameDialog.tsx:14` |
| D02c-017 | getEmptyProjectPlaceholderRepoIds | partial | `WorktreeList.tsx:249` |
| D02c-018 | RemoveFolderDialog | missing | `App.tsx:1612` (remoção imediata) |
| D02c-019 | SetupScriptPromptCard | missing | `lib/setup-script-prompt.ts:32` (sem caller) |
| D02c-020 | SetupScriptPromptCardShell | missing | i18n `en.json:5300` órfão |
| D02c-021 | SetupScriptPromptCardViews | missing | i18n `en.json:5309` órfão |
| D02c-022 | SetupScriptPromptToast | missing | — |
| D02c-023 | openSetupScriptSettings | missing | `TerminalTccAttributionNotice.tsx:49` (primitivas) |
| D02c-024 | trackSetupScriptPromptExposure | missing | `telemetry-event-registry.ts:114` (schema sem emissor) |
| D02c-025 | setup-script-prompt-render-state | missing | — |
| D02c-026 | useSetupScriptPromptRevalidation | missing | — |

## Clusters

### C1 — Recuperação de worktrees ocultos (D02c-001)

Portada inline em `WorktreeVisibilityDialog.tsx` (não existe `HiddenWorktreeRecoveryList` separado).
Confirmado wiring: mount em `WorktreeSidebar.tsx:1142`; backend `invoke("scan_worktrees")`
(`WorktreeVisibilityDialog.tsx:112` → `src-tauri/src/lib.rs:399`).

Presentes (parity): heading `Hidden worktrees (N)` (`:557`), campo de busca com ícone `Search`
(`:568`), filtro `branch || path` case-insensitive (`:189`), botão `Show`/`Showing...` desabilitado
por `busyPath` (`:604`), empty state textual (`:619`).

Faltando (partial): virtualização `@tanstack/react-virtual` (lib ausente do `package.json` e de todo
`src/`), `aria-posinset`/`aria-setsize`, ícone `FolderMinus` no empty state, limiar de busca
(Orca `>=10`, Hydra `>5` em `:568`), filtro por `displayName`, `relativePathInsideRoot`.
Namespace i18n `HiddenWorktreeRecoveryList` (`en.json:5795`) sem uso.

### C2 — Supressão de inbox externo (D02c-002)

Sem dialog de confirmação. O `×` do pill (`NewExternalWorktreesInboxLine.tsx:52`) chama
`onSuppress` direto → `invoke("suppress_worktree_inbox")` (`WorktreeSidebar.tsx:794` →
`src-tauri/src/lib.rs:423`). O namespace `SuppressExternalWorktreeInboxDialog` (`en.json:6147`)
não é referenciado por nenhum componente. Falta título/descrição/link
"Open Non-Orca worktrees settings"/botões/pending.

### C3 — Skill do agente Linear (D02c-003…D02c-008) — 6 linhas

Nada do fluxo de setup existe no Hydra. Existe apenas infraestrutura genérica:
`useInstalledAgentSkillNames` (`src/hooks/useInstalledAgentSkills.ts:122`, nunca chamado com
`LINEAR_AGENT_SKILL_NAMES`), constantes re-exportadas em `src/shared/agent-feature-install-commands.ts:1`,
schemas de telemetria e namespaces i18n órfãos (`LinearAgentSkillPane` `en.json:11267`,
`LinearAgentSkillSetupPrompt` `en.json:6051`).

Buscas negativas: `LinearAgentSkillSetupDialog`, `LinearAgentSkillSetupPrompt`,
`AgentSkillSetupPanel`, `linear-agent-skill-runtime.ts`, `linear-agent-skill-setup-copy.ts`,
`linear-agent-skill-setup-reminder-toast.ts`, `linear-agent-skill-setup-reminders.ts`,
`orca.linearTicketsSkill.setupDismissed`, `TicketCheck`, `IntegrationStatusPill`, `snooze`,
`toastCount`, `MAX_*REMINDER_RUNTIME_KEYS`, `window.api.cli.getInstallStatus`,
`getWslInstallStatus`, `isOrcaCliAvailableOnPath`, `buildSkillCommandForRuntime` (só
`src/hooks/useActiveProjectSkillRuntime.ts`, sem consumidor), `getLinearAgentSkillUpdateCommand`.

### C4 — Pastas não-git e aninhadas (D02c-009, D02c-010)

`AddRepoDialog.tsx:60` ("Browse folder") importa a pasta via `invoke("catalog_add_folder")`
(`src-tauri/src/lib.rs:277`). No backend, `add_folder_to_catalog` (`src-tauri/src/catalog.rs:364`)
cria silenciosamente um project group + folder workspace e varre sub-repos git (até 20) quando a
pasta não tem `.git` — sem diálogo educativo, sem host exibido, sem opção "Open as Folder".

Resíduos sem renderer: `openModal('confirm-non-git-folder')` (`repo-add-actions.ts:88`) e
`addNonGitFolder` (`repo-add-actions.ts:167`, sem caller). Nenhum componente lê `activeModal`
(grep em `src/**/*.tsx` = 0). `window.api.repos.addRemote` não existe no preload Hydra.
i18n `NonGitFolderDialog` (`en.json:5228`) órfão.

D02c-010: `complete-nested-folder-open.ts` / `track-nested-folder-open.ts` ausentes;
`buildNestedRepoImportActionTelemetry` (`src/shared/nested-repo-telemetry.ts:170`) e o evento
`add_repo_nested_import_action` (`telemetry-event-registry.ts:110`) nunca são emitidos;
`scanNestedRepos`/`importNestedRepos` (`src/store/slices/repos.ts:60-62`) sem consumidor em `.tsx`.

### C5 — Trust de hooks orca.yaml (D02c-011)

`markOrcaHookScriptConfirmed` / `markOrcaHookRepoAlwaysTrusted` existem em
`src/store/slices/ui/ui-slice-trust-actions.ts:7,25` mas têm zero callers; nenhum componente
`OrcaYamlTrustDialog`; namespace i18n órfão (`en.json:5237`); nenhum comando Tauri de trust ou
execução de hook em `src-tauri/src/**`. Modal id `confirm-orca-yaml-hooks` inexistente.

### C6 — Branches preservadas (D02c-012…D02c-014) — 3 linhas

O subsistema de teardown portado é stub: `force-delete-preserved-branch.ts:1-12`
(`createForceDeletePreservedBranch: any = null`) e `remove-worktree.ts:9`
(`createRemoveWorktree: any = null`), consumidos em `src/store/slices/worktrees.ts:97`.
Não há `PreservedBranchBatchReviewDialog`, `preserved-branch-batch-toast.tsx` nem
`preserved-branch-toast.tsx`; a deleção de worktree em `DeleteWorktreeDialog.tsx:95` só mostra erro
inline e não emite toast de "branch kept".

### C7 — Dialogs de grupo de projeto (D02c-015, D02c-016)

`ProjectGroupNameDialog` (criar/renomear) e `ProjectGroupDeleteDialog` são componentes portados e
montados (`WorktreeSidebar.tsx:1115` / `:1125`).

- **D02c-016 = parity**: foco + select do nome inicial (`ProjectGroupNameDialog.tsx:33-36`),
  confirmar desabilitado com nome vazio/submetendo (`:122`), `Saving...` (`:125`).
- **D02c-015 = partial**: falta o checkbox opcional "Remove N contained projects" e as props
  `removeContainedProjects`/`onRemoveContainedProjectsChange` — o store já tem
  `deleteProjectGroupWithContainedProjects` (`src/store/project-groups/project-group-mutations.ts:139`),
  mas o dialog nunca passa a opção; falta também o `mountedRef`. O caminho de exclusão atual é o
  CustomEvent `hydra:delete-project-group` (`WorktreeSidebar.tsx:1134` → `App.tsx:1211`), que mexe em
  estado local do App + `hydra:refresh-projects`, não na mutation do store.

### C8 — Placeholder de repos vazios (D02c-017) — partial

O efeito observável (repos sem worktrees visíveis / membros de grupo seguem visíveis) é obtido
estruturalmente: `WorktreeList.tsx:249` (`renderProjectNode`) sempre emite `SectionHeader` por
projeto e `:463-553` renderiza todos os `groupProjects` de `visibleProjects`; filtros de workspace
não removem projetos. Porém a função nomeada `getEmptyProjectPlaceholderRepoIds` não existe e o
parâmetro `placeholderRepoIds` (`build-rows.ts:62`) só recebe `EMPTY_REPO_ID_SET`
(`rendered-sidebar-worktree-order.ts:71`). `filterRepoIds` do store é usado apenas em
`visible-worktrees.ts:163`, fora do `WorktreeList`. Testes
`empty-project-placeholder-repos.test.ts` inexistentes no Hydra.

### C9 — Remoção de projeto (D02c-018)

Sem dialog. Menu "Remove Project from Hydra" (`App.tsx:3279`, `App.tsx:3492`) →
`handleRemoveProject` (`App.tsx:1612`) → `invoke("catalog_remove_repo")` (`App.tsx:1613` →
`src-tauri/src/lib.rs:289`) imediatamente, sem aviso contextual VM/SSH/local. i18n
`RemoveFolderDialog` (`en.json:5285`) órfão. Backend existe e é chamado.

### C10 — Setup script prompt (D02c-019…D02c-026) — 8 linhas

Toda a superfície de UI está ausente. Existem só resíduos de dados/tipos:
`src/lib/setup-script-prompt.ts` (`inspectSetupScriptPromptState:32` sem caller),
`dismissSetupScriptPrompt` (`ui-slice-trust-actions.ts:49` sem UI),
`setupScriptPromptDismissedRepoIds` no estado, schemas de telemetria
(`setup_script_prompt_shown`/`setup_script_prompt_action`, `telemetry-event-registry.ts:114-115`),
i18n órfão (`SetupScriptPromptCard` `en.json:5300`, `SetupScriptPromptCardViews` `en.json:5309`)
e stub `SetupScriptImportCandidate: any = null` (`src/shared/setup-script-imports.ts:3`).

Buscas negativas: `SetupScriptPromptCard.tsx`, `SetupScriptPromptCardShell.tsx`,
`SetupScriptPromptCardViews.tsx`, `SetupScriptPromptToast.tsx`, `open-setup-script-settings.ts`,
`setup-script-prompt-render-state.ts`, `useSetupScriptPromptRevalidation.ts`,
`findSetupScriptPromptRepo`, `markSetupScriptPromptSaved`, `getRenderedSetupScriptPromptState`,
`buildSetupScriptPromptTelemetry`, `trackSetupScriptPromptExposure`, `showSavedInProjectSettingsToast`,
`openSetupScriptSettings`, seção "local commands" no `SettingsModal`. As primitivas de navegação
(`openSettingsTarget`/`openSettingsPage`/`setSettingsSearchQuery`) existem e são usadas por outras
superfícies (`TerminalTccAttributionNotice.tsx:49-65`), mas não há alvo/função para comandos locais.

## Disposição de cobertura

O bloco `coverage` do `.orca.json` (files 28, symbols 63, tests 114, labels 33, hotkeys 1, prefs 25,
timers 0, subscriptions 11, preload 5) está integralmente preenchido com id de linha ou justificativa
`INFRA:`/`N/A:` (validado por script: nenhuma entrada vazia). Fase 1 permanece congelada; nenhuma
entrada precisou de correção.

Do lado Hydra, para este domínio **não existe** arquivo de teste de sidebar que cubra as linhas
parciais/existentes: os únicos `.parity.test.tsx` do diretório são de outros domínios
(`CompactAgentRow`, `FolderWorkspaceRow`, `SectionHeader`, `WorktreeCardStatusLane`,
`WorktreeVisibilityDialog`, `worktree-card-lane-placement`, `ImportedWorktreesVisibilityLine`,
`NewExternalWorktreesInboxLine`). Os testes citados no `.orca.json`
(`LinearAgentSkillSetupPrompt*`, `NonGitFolderDialog`, `OrcaYamlTrustDialog`, `RemoveFolderDialog`,
`PreservedBranch*`, `SetupScriptPromptCard*`, `empty-project-placeholder-repos`,
`linear-agent-skill-*`, `useSetupScriptPromptRevalidation`, `ProjectGroupDeleteDialog`) são do Orca
e não têm contraparte no Hydra — a cobertura de testes Hydra para as linhas 015/016/001/017 é
`N/A: sem teste Hydra correspondente`.

## Cross-walk PAR

| PAR | orca_rows | hydra_status |
|---|---|---|
| PAR-15 (Setup Script Prompt Card na Sidebar) | D02c-019…D02c-026 | missing |
| PAR-41 (Diálogo Educativo para Pastas Não-Git) | D02c-009, D02c-010 | missing |

Itens `PAR-56`/`PAR-86` (DeleteWorktreeDialog / toast de deleção com Re-add) e `PAR-80`
(empty state da lista) tangenciam este domínio mas pertencem a outros alvos
(`DeleteWorktreeDialog.tsx`, `SidebarShell.tsx`) — não registrados aqui.
