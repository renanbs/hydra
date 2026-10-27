# REPAIRS-A — reparo dos defeitos de integridade (agente A)

Domínios: `D01-shell-chrome`, `D02a-repo-add-wizard`, `D02b-hosts-ssh-remote`,
`D02c-project-groups-scripts`, `D03a-worktree-list-module`, `D03b-sidebar-list-orchestration`,
`D04b-worktree-card-controllers`, `D06-drag-order-keyboard`.

Comando de verificação: `python3 docs/audits/orca-sidebar-parity/index/verify_coverage.py <DOM>`
(rodado por domínio e em lote). Artefatos tocados apenas em `docs/audits/orca-sidebar-parity/`.

## Resultado do verificador

| Domínio | violações (antes) | violações (depois) |
|---|---|---|
| D01-shell-chrome | 2 | **0** |
| D02a-repo-add-wizard | 2 | **0** |
| D02b-hosts-ssh-remote | 1 | **0** |
| D02c-project-groups-scripts | 2 | **0** |
| D03a-worktree-list-module | 1 | **0** |
| D03b-sidebar-list-orchestration | 2 | **0** |
| D04b-worktree-card-controllers | 0 | **0** |
| D06-drag-order-keyboard | 1 | **0** |

`total violations: 0 over 8 domains` (o lote global ainda mostra D04a, de outro agente).

## Item 1 — cobertura de símbolos `default` (21)

Cada `<file>:default` recebeu o id da linha que cita o arquivo em `orca_evidence`.

- **D01 (7):** `AgentDashboardSidebarEntry.tsx:default`→D01-027; `AgentDashboardSidebarHost.tsx:default`→D01-029;
  `CacheTimer.tsx:default`→D01-049; `SidebarHeader.tsx:default`→D01-007; `SidebarNav.tsx:default`→D01-016;
  `SidebarToolbar.tsx:default`→D01-030; `StatusIndicator.tsx:default`→D01-048.
- **D02a (3):** `AddProjectFromFolderDialog.tsx:default`→D02a-026; `AddRepoDialog.tsx:default`→D02a-001;
  `ProjectAddedDialog.tsx:default`→D02a-027.
- **D02b (1):** `ForgetSshWorkspaceDialog.tsx:default`→D02b-020.
- **D02c (8):** `HiddenWorktreeRecoveryList`→D02c-001; `LinearAgentSkillSetupDialog`→D02c-003;
  `NonGitFolderDialog`→D02c-009; `OrcaYamlTrustDialog`→D02c-011; `PreservedBranchBatchReviewModal`→D02c-012;
  `RemoveFolderDialog`→D02c-018; `SetupScriptPromptCard`→D02c-019; `SuppressExternalWorktreeInboxDialog`→D02c-002.
- **D03b (2):** `WorktreeList.tsx:default`→D03b-010; `index.tsx:default`→D03b-001.

## Item 2 — cobertura de testes novos (`it.each`/`%s`) (12)

- **D01 (2):** `StatusIndicator.test.ts:94` e `:102` → D01-048.
- **D02a (2):** `folder-workspace-card-pr-display.test.ts:241`→D02a-038;
  `use-add-repo-host-selection.test.ts:176`→D02a-003.
- **D02c (1):** `LinearAgentSkillSetupPrompt.reminder-toast.test.tsx:306`→D02c-004.
- **D03a (4):** `pointer-flush.test.ts:164`→D03a-003 (comportamento "não renova intenção quando só o
  autoscroll move os slots sob ponteiro parado");
  `use-reveal-requests.test.tsx:142/157/199`→D03a-065.
- **D03b (2):** `worktree-list-groups-lineage-nesting.test.ts:324`→D03b-048;
  `worktree-list-groups-pinned-host-labels.test.ts:71`→D03b-049.
- **D06 (1):** `WorktreeParentPickerPopover.test.ts:213`→D06-027 (IME composition).

## Item 3 — integridade evidência↔cobertura (falsificação E2) (2)

- **D02b:** `components/sidebar/ssh-target-duplicate.ts:12-31` estava em `coverage.files` sem nenhuma
  linha que o citasse. `D02b-003` (validação/salvamento de novo host SSH) cobre o comportamento — o
  arquivo é importado por `add-remote-host-ssh-actions.ts` (já evidenciado por D02b-003); a evidência de
  D02b-003 foi estendida com `ssh-target-duplicate.ts:12-31` (`isDuplicateSshTargetAlias`).
- **D03b:** `components/sidebar/worktree-list-lineage-card-test-fixtures.ts:1-62` idem. `D03b-048`
  (renderização recursiva de linhagem) cobre o comportamento; o fixture é importado por
  `worktree-list-lineage-store-state.ts`/`worktree-list-pinned-store-state.ts`, já no encadeamento
  evidenciado por D03b-048 — evidência estendida com `worktree-list-lineage-card-test-fixtures.ts:1-62`.

## Item 4 — integridade de mapeamento (falsificação E5) (5)

Mapeamentos de `coverage.files` que apontavam para linhas que não citam o arquivo foram corrigidos para
linhas que citam (verificado por basename em `orca_evidence`):

- **D02a:** `useAddRepoCloneFlow.ts` `[D02a-012,D02a-014]`→`[D02a-013,D02a-014]`;
  `useAddRepoServerPathFlow.ts` `[D02a-010,D02a-011]`→`[D02a-011]`.
- **D02b:** `use-remote-file-browser-path-preview.ts` `[D02b-026,D02b-027,D02b-028]`→`[D02b-026,D02b-028]`.
- **D03b:** `worktree-list-lineage-card-test-fixtures.ts`→D03b-048 (fechado pelo item 3, evidência estendida).
- **D06:** `worktree-sidebar-row-preference.ts` `[D06-031,D06-032]`→`[D06-032]`.

## Item 5 — escape E3: toggle do sidebar por comando (D01)

Nova linha **D01-052** em `D01-shell-chrome.orca.json`:

- capability "Alternância do sidebar esquerdo por comando/atalho global (`sidebar.left.toggle`, Cmd+B)";
- `orca_evidence`: `app-shell/app-command-handlers.ts:168`, `store/slices/ui/ui-slice-agent-actions.ts:46`,
  `app-shell/TitlebarLeftControls.tsx:31`;
- `tests`: `tests/e2e/tab-sidebar-closed-overlap.spec.ts:36` (o spec e2e vive em `tests/e2e/` na raiz do
  repo, **fora** do mount `src/renderer/src` que o verificador resolve — por isso é citado em `tests`, e
  não em `orca_evidence`, onde geraria "evidência inexistente");
- `coverage.hotkeys["Mod+B (sidebar.left.toggle)"] = D01-052` e
  `coverage.labels["Toggle Sidebar"] = D01-052`;
- veredito novo em `D01-shell-chrome.diff.json`: **partial** (Hydra tem `sidebar.left.toggle` definido em
  `src/shared/keybindings/definitions-core-1.ts:181` e o toggle wired por keydown raw em `src/App.tsx:2545`
  + botão em `src/components/WindowTitlebar.tsx:118,145`, mas a definição de keybinding é órfã — não é
  despachada pelo command registry); `summary.partial` 14→15; `gaps.md` atualizado (52/52 ids) com nota
  explícita de que a linha nasceu da falsificação E3.

## Item 6 — `backend_contract` com símbolo de preload (falsificação I5) (10)

Linhas com caminho de backend rastreável pelos handlers evidenciados; contrato preenchido com
`window.api.x -> main/<handler>.ts:linha` (handler real em `src/main/ipc/**`):

| Linha | Símbolo(s) | Handler |
|---|---|---|
| D01-027 | `window.api.dashboard.openPopout` | `src/main/ipc/dashboard-popout.ts:60` |
| D02a-002 | `window.api.repos.cloneAbort` | `src/main/ipc/repos/repo-clone-lifecycle.ts:101` |
| D02a-004 | `window.api.repos.cloneAbort` | `src/main/ipc/repos/repo-clone-lifecycle.ts:101` |
| D02a-007 | `repos.pickFolders`, `ssh.listTargets`, `ssh.connect` | `repo-folder-picker-handlers.ts:15`, `ssh-target-crud-handlers.ts:43`, `ssh-connection-handlers.ts:111` |
| D02a-019 | `ssh.listTargets`, `ssh.getState`, `ssh.onStateChanged`, `ssh.connect`, `repos.addRemote` | `ssh-target-crud-handlers.ts:43`, `ssh-connection-handlers.ts:224`, `ssh-renderer-broadcast.ts:40`, `ssh-connection-handlers.ts:111`, `repo-creation-handlers.ts:87` |
| D02b-001 | `ssh.addTarget`, `runtimeEnvironments.verifyAndAddFromPairingCode` | `ssh-target-crud-handlers.ts:51`, `runtime-environment-connectivity-handlers.ts:83` |
| D02b-011 | `ssh.connect`, `ssh.disconnect`, `runtimeEnvironments.getStatus` | `ssh-connection-handlers.ts:111`, `:115`, `runtime-environment-connectivity-handlers.ts:178` |
| D02b-015 | `ssh.removeTarget` | `ssh-target-crud-handlers.ts:70` |
| D02b-016 | `ssh.removeTarget` | `ssh-target-crud-handlers.ts:70` |
| D02b-017 | `ssh.removeTarget` | `ssh-target-crud-handlers.ts:70` |

**Exceções honestas (2):** `D02b-009` (validação local de link de acesso / loopback) e `D02b-013`
(navegação para configurações via `openSettingsTarget`/`openSettingsPage`) **não chamam backend** nas
linhas evidenciadas; nelas o `window.api.*` que motivou o flag I5 vive em linhas do arquivo que pertencem a
linhas irmãs (D02b-010/D02b-011). Como não há símbolo de preload na evidência dessas linhas, `backend_contract`
permanece `[]` — removê-las da evidência destruiria rótulos/cobertura válidos (D02b-013 tem labels mapeados
para `HostSectionHeaderMenu.tsx:259/262`). Registrado aqui em vez de fabricar um contrato falso.

## Itens 1–6 — totais

- `default_symbols` corrigidos: **21**
- `new_tests` cobertos: **12**
- `evidence_gaps` (E2): **2**
- `new_rows`: **["D01-052"]**
- `backend_contracts_filled`: **10** (2 verificadas sem backend)
- mapeamentos E5 corrigidos: **5**
