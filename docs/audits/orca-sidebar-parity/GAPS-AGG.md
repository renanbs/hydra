# Gaps agregados (veredito missing/partial)


## MISSING — 0 capabilities


## PARTIAL — 9 capabilities


### D01-shell-chrome (1)

- **D01-024** — Botão de navegação para Orca Mobile com badge onboarding e controle rápido de ocultação | falta: botão inline EyeOff após pareamento (hasPairedDevice sempre false: sem comando que liste devices pareados) | components/sidebar/SidebarNav.tsx:2

### D02a-repo-add-wizard (2)

- **D02a-014** — Executa a clonagem de repositório Git nos modos Local, SSH ou Runtime RPC com assinatura de progresso | falta: Assinatura de window.api.repos.onCloneProgress (progresso em tempo real: clone_project não faz streaming); roteamento SSH/runtime via bridges próprias (não cloneRemote/runtimeRpc) | backend: invoke('clone_project') -> src-tauri/src/lib.rs:445 | components/sidebar/useAddRepoCloneFlow.ts:24
- **D02a-018** — Executa a criação física de novo projeto Git local, remoto SSH ou em servidor runtime | falta: ativação de workspace sintético para pasta — via composer, não no create | backend: invoke('create_project') -> src-tauri/src/lib.rs:428 | components/sidebar/useCreateRepo.ts:18

### D02b-hosts-ssh-remote (1)

- **D02b-010** — Verificação, pareamento e salvamento de servidor remoto Orca Server | falta: readRuntimeHostStatusSnapshots() pos-sucesso (store tem a acao; dialog nao chama — proxima: wire no adapter) | backend: window.api.runtimeEnvironments.verifyAndAddFromPairingCode / .list (preload Electron) -> sem #[tauri::command] equivalente em src-tauri/src/** (grep = 0); nenhum invoke() no frontend; no store real: r | components/sidebar/AddRemoteHostDialog.tsx:246-298

### D02c-project-groups-scripts (1)

- **D02c-009** — Dialog modal para confirmação e abertura de pastas locais ou remotas que não são repositórios Git | falta: ramo SSH dedicado addRemote (Hydra roteia SSH via catalog_add_remote_repo) | backend: invoke('catalog_add_folder') -> src/components/sidebar/AddRepoDialog.tsx:60 -> src-tauri/src/lib.rs:277 | components/sidebar/NonGitFolderDialog.tsx:21

### D03b-sidebar-list-orchestration (2)

- **D03b-015** — Gerenciamento de seleção múltipla e mutações de status/pino/ordem de worktrees na lista | falta: moveWorktreeToStatus/moveWorktreesToStatus* (board kanban — sem Kanban no Hydra); dropWorktreesOnWorkspaceBoard (sem Kanban); carregamento automatico de linhagem ao mover (acoplado ao board) | components/sidebar/WorktreeList.tsx:178-187
- **D03b-017** — Abertura de caixas de diálogo modais e configurações a partir de ações de repositório e grupos no sidebar | falta: handleOpenRepoSettings (página de settings do repo): Hydra abre o modal global de Settings (App.tsx:3661 onOpenSettings); confirmação 'confirm-remove-folder': App.tsx:1612 remove direto; handleCreateFolderWorkspace com parentPath (o '+' do grupo usa a primeira folder workspace do grupo: WorktreeList.tsx:481-500) | backend: invoke('catalog_set_worktree_visibility') -> src/components/sidebar/WorktreeSidebar.tsx:181 | components/sidebar/WorktreeList.tsx:195-235

### D04a-worktree-card-surface (2)

- **D04a-010** — Renderiza a linha de metadados do card com repo, host, identidade (branch/caminho/detached HEAD), badge de conflito e cache timer | falta: hostContextLabel vem do WorktreeList por identidade; casos SSH/runtime sem label seguem ocultos | components/sidebar/worktree-card-meta-row.tsx:48
- **D04a-013** — Executa o fluxo de conexão SSH e converge o estado do host após falha | falta: runtime-owned roda pela paired-server bridge (sem RPC dedicado no Hydra) | components/sidebar/WorktreeCardSshHostControl.tsx:86
