# Gaps agregados (veredito missing/partial)


## MISSING — 0 capabilities


## PARTIAL — 3 capabilities


### D02c-project-groups-scripts (1)

- **D02c-009** — Dialog modal para confirmação e abertura de pastas locais ou remotas que não são repositórios Git | falta: ramo SSH dedicado addRemote (Hydra roteia SSH via catalog_add_remote_repo) | backend: invoke('catalog_add_folder') -> src/components/sidebar/AddRepoDialog.tsx:60 -> src-tauri/src/lib.rs:277 | components/sidebar/NonGitFolderDialog.tsx:21

### D03b-sidebar-list-orchestration (2)

- **D03b-015** — Gerenciamento de seleção múltipla e mutações de status/pino/ordem de worktrees na lista | falta: moveWorktreeToStatus/moveWorktreesToStatus* (board kanban — sem Kanban no Hydra); dropWorktreesOnWorkspaceBoard (sem Kanban); carregamento automatico de linhagem ao mover (acoplado ao board) | components/sidebar/WorktreeList.tsx:178-187
- **D03b-017** — Abertura de caixas de diálogo modais e configurações a partir de ações de repositório e grupos no sidebar | falta: handleOpenRepoSettings (página de settings do repo): Hydra abre o modal global de Settings (App.tsx:3661 onOpenSettings); confirmação 'confirm-remove-folder': App.tsx:1612 remove direto; handleCreateFolderWorkspace com parentPath (o '+' do grupo usa a primeira folder workspace do grupo: WorktreeList.tsx:481-500) | backend: invoke('catalog_set_worktree_visibility') -> src/components/sidebar/WorktreeSidebar.tsx:181 | components/sidebar/WorktreeList.tsx:195-235
