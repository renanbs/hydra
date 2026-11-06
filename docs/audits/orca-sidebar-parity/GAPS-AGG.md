# Gaps agregados (veredito missing/partial)


## MISSING — 4 capabilities


### D02c-project-groups-scripts (3)

- **D02c-003** — Dialog modal para instalação e configuração do skill de agente Linear com terminal integrado | falta: Estado de sucesso (showSuccess): exibe título 'Linear ticket access is ready', descrição contextual, pílula de status conectada (IntegrationStatusPill tone='connected') e botão 'Done'; Estado de instalação: exibe prompt descritivo com ícone Info ('Enable agents to read and edit the attached Linear ticket.'); Embute painel AgentSkillSetupPanel com terminal embutido (terminalHeightPx: 240), comando de instalação/atualização e botão 'Install CLI & Skill'; Executa verificação e pré-instalação do CLI do Orca (isOrcaCliAvailableOnPath, AGENT_SKILL_CLI_PREREQUISITE_NOTICE) | components/sidebar/LinearAgentSkillSetupDialog.tsx:36
- **D02c-004** — Prompt inline e modal para detecção, verificação e setup de skill do agente Linear | falta: Detecta status de instalação do CLI via window.api.cli.getInstallStatus ou getWslInstallStatus para WSL; Consulta skills globais instaladas via hook useInstalledAgentSkillNames com LINEAR_AGENT_SKILL_NAMES; Suporta verificação manual via botão 'Re-check' com ícone RefreshCw revalidando CLI e skills; Gerencia concorrência de verificações com requestGeneration e setupCheckIdentity para descartar respostas defasadas de CLI/runtime | components/sidebar/LinearAgentSkillSetupPrompt.tsx:46
- **D02c-007** — Lembretes e notificações toast de setup do skill do Linear com limite de repetições | falta: Abre automaticamente o modal de setup na primeira ativação elegível do runtime; Dispara toast de aviso com botão 'Set up' em ativações subsequentes caso o modal anterior tenha sido fechado informalmente; Limita os lembretes via toast a LINEAR_AGENT_SKILL_SETUP_TOAST_LIMIT (máximo 3 vezes); Descarta o toast ativo e atualiza estado ao dispensar permanentemente ou ao concluir a instalação | components/sidebar/linear-agent-skill-setup-reminder-toast.ts:26

### D15-misc-a (1)

- **D15a-011** — Tratamento de concorrência no fluxo de suspensão (sleep) e ativação de workspaces em VM | falta: Fecha navegadores e terminais ao suspender worktrees sem deixar timers ou chamadas atrasadas de ativação do pai; Invoca resumeWorkspace na API do backend para reativar VM efêmera; Mantém o worktree selecionado na UI caso a inicialização da VM falhe e exibe toast com a mensagem de erro do provedor | components/sidebar/sleep-worktree-flow.ts:44

## PARTIAL — 12 capabilities


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

### D10-visibility-inbox-notices (3)

- **D10-001** — Ver o output completo do CLI que falhou no auto-rename, com fallback ao excerto persistido | falta: output de CLI propriamente dito: o auto-rename do Hydra é determinístico (slug do prompt), então não existe stdout/stderr capturado; o comando devolve o excerto persistido | components/sidebar/AutoRenameFailedDialog.tsx:31
- **D10-016** — Pre-hidratar git status do host dono de cada alvo e calcular contagem de mudanças | falta: pré-hidratação de git status no host remoto (só o dono local é sondado; alvos SSH/runtime ficam com contagem desconhecida) | components/sidebar/DeleteWorktreeDialog.tsx:188
- **D10-057** — Contador 'N found' por source, ignorando checkouts selecionados e Orca-managed | falta: pular checkouts selecionados e ownership orca-managed (as linhas de recuperação do Hydra não carregam esses campos) | components/sidebar/WorktreeVisibilitySourceList.tsx:193
