# D07 — Menus & Actions: gaps de paridade (Orca → Hydra)

Fase 2 da auditoria `orca-sidebar-parity`. Inventário congelado: `domains/D07-menus-actions.orca.json`
(45 linhas). Contraprova de runtime: `runtime/census-v3.json` + `runtime/census-v4.json`
(menu de contexto do card com 11 itens: `Update`, `Move to Status`, `Open in` [VS Code / File Manager /
Customize apps...], `Copy Path`, `Pin`, `Mark Unread`, `New group from project`, `Set Parent Worktree...`,
`Sleep`, `Delete Worktree`, `Remove Project from Orca`).

## Placar

| veredito | n |
|---|---|
| parity | 3 |
| partial | 29 |
| missing | 13 |
| not-applicable | 0 |
| out-of-scope | 0 |

Itens de menu do census com veredito: `Update` → **não há linha no inventário D07 para este item** (o termo
"Update" não aparece em nenhuma capability do `.orca.json`); no Hydra o equivalente textual é
"Update Project..." no menu de contexto do **header de projeto** (App.tsx:3182) e, no card,
"Rename Worktree Display Name..." (App.tsx:3329, coberto por D07-020) — divergência de superfície, não
contabilizada como veredito por não existir linha de origem. `Move to Status` → D07-022; `Open in` → D07-020 (submenu existe com apps configuráveis,
Reveal in File Manager e Customize apps, App.tsx:3102-3123); `Copy Path`/`Pin`/`Mark Unread` → D07-020;
`New group from project` → D07-021; `Set Parent Worktree...` → D07-023; `Sleep` → D07-001/004;
`Delete Worktree` → D07-026/028; `Remove Project from Orca` → D07-045/026.

> Nota de método: `index/hydra_sidebar_backend_map.json` indexa apenas `invoke()` dentro de
> `src/components/sidebar/**` (13 comandos). O menu do card é montado imperativamente em
> `src/App.tsx` (`handleWorktreeContextMenu`), portanto comandos chamados por esse caminho também são
> alcançáveis do mount e foram verificados um a um em `src-tauri/src/lib.rs` + `invoke_handler`
> (`lib.rs:1451`): `set_worktree_status` (lib.rs:523), `set_worktree_display_name` (505),
> `git_rename_branch_cmd` (175), `open_in_file_manager` (242), `open_in_external_editor` (256),
> `delete_worktree` (476), `catalog_remove_repo` (289), `get_detailed_git_status_cmd` (113),
> `save_settings` (1067).

---

## G1 — Deleção de worktree: sem linhagem child-first, sem force explícito, backend sempre `--force` — **CRÍTICO**

- **Impacto**: alto (perda de dados / remoção de filhos como untracked; impossível distinguir delete
  normal de forçado; falhas sem recuperação). **Esforço**: alto.
- **Linhas**: D07-026, D07-028, D07-029, D07-030, D07-039, D07-040, D07-044 (parcial), D07-043 (missing).
- **Orca**: `delete-worktree-flow.ts:35-106` (instance/host/SSH/linhagem), `workspace-delete-lineage.ts:40-72`
  (`deleteAllTargets` child-first), `worktree-delete-execution.ts:68-182` (agrupamento por host+repo,
  serialização, cancelamento de ancestrais em falha de filho), `delete-worktree-dialog-force-delete.ts:36-51`
  (`force:true`, `allowUnverifiedPtyStop:true`).
- **Hydra**: `src/App.tsx:1756-1791` (repoPath por varredura local, sem instance/host), 
  `src/components/DeleteWorktreeDialog.tsx:100-105` (for-loop concorrente sem ordem),
  `src-tauri/src/lib.rs:476-500` (sweep de PTY + `remove_git_worktree`),
  `src-tauri/src/worktree_ops.rs:1321` (`git worktree remove --force` **sempre**).
  O rótulo `Force Delete` reenvia a mesma chamada sem nenhuma flag (DeleteWorktreeDialog.tsx:104-111).
- **Contrato Tauri necessário**:
  ```rust
  #[derive(serde::Deserialize)] struct DeleteTarget { worktree_path: String, host_id: Option<String>, instance_id: Option<String> }
  enum DeleteRefusal { Locked{reason:Option<String>}, OrphanDirectory, Dirty{files:u32}, UnstoppedPty, RunningAgents, MissingRegistration, MainWorktree, InstanceStale }
  #[tauri::command] async fn delete_worktree(state: State<AppState>, target: DeleteTarget,
      force: Option<bool>, allow_unverified_pty_stop: Option<bool>) -> Result<(), DeleteRefusal>;
  #[tauri::command] async fn delete_worktrees_batch(state: State<AppState>, targets: Vec<DeleteTarget>,
      force_on_confirm: Option<bool>) -> Result<Vec<DeleteResult>, String>;
  #[tauri::command] async fn resolve_worktree_delete_lineage(state: State<AppState>, roots: Vec<DeleteTarget>)
      -> Result<DeleteLineageEnvelope, String>; // { descendants, delete_all_targets (child-first), preserved_branches }
  ```
  O FE deve ordenar/serializar por grupo host+repo (ou delegar isso ao `delete_worktrees_batch`) e mapear
  `DeleteRefusal` para os toasts de recuperação.

## G2 — Sleep é cosmético: não libera memória/CPU nem faz teardown real — **ALTO** (PAR-21)

- **Impacto**: alto (é a promessa central do item `Sleep` do census). **Esforço**: médio-alto (exige
  teardown de PTY/browser + estado de sleep persistente).
- **Linhas**: D07-001, D07-002, D07-003, D07-004 (partial); D07-005 (missing).
- **Orca**: `sleep-worktree-flow.ts:22-209` (browsers→terminais com `keepIdentifiers`, VM efêmera,
  sleep intent, reversão em falha, toast, ancoragem de scroll), `workspace-lineage-menu-actions.ts:29-50`
  (subárvore recursiva com filtro de atividade), `WorkspaceSleepMenuItems.tsx:28-50` (item desabilitado
  sem painéis ativos, delay de 50ms).
- **Hydra**: `src/App.tsx:3122-3128` — `sleepSessionsForPaths` apenas remove abas React
  (`tab_<id>`) e marca `state:'idle'`; nenhum `invoke`, nenhum PTY encerrado. Itens de menu:
  `Sleep` (App.tsx:3487) e `Sleep with Descendants (N)` (App.tsx:3488) — este conta/desce só 1 nível
  (`descendantCount` = filhos diretos, App.tsx:3299).
- **Contrato Tauri necessário**:
  ```rust
  #[tauri::command] async fn sleep_worktrees(state: State<AppState>, worktree_paths: Vec<String>,
      close_browsers_first: bool) -> Result<SleepReport, String>; // { slept: Vec<String>, failed: Vec<{path, reason}> }
  #[tauri::command] async fn wake_worktree(state: State<AppState>, worktree_path: String) -> Result<(), String>;
  #[tauri::command] async fn get_sleep_intents(state: State<AppState>) -> Result<Vec<String>, String>;
  ```
  Sem infra de VM efêmera no Hydra (`window.api.ephemeralVm` não existe): documentar como ausência de
  plataforma dentro do próprio relatório, não como paridade.

## G3 — Multi-seleção de worktrees não existe (bloqueia ações em massa) — **ALTO** (PAR-08)

- **Impacto**: alto (menu multi-contexto, sleep em lote, status em lote). **Esforço**: médio.
- **Linhas**: D07-002 (missing), D07-016, D07-022 (partial).
- **Orca**: `use-worktree-context-menu-model.tsx:142-173` (`selectedWorktrees`/`effectiveSelectedWorktrees`),
  `WorkspaceSleepMenuItems.tsx:36` (`Sleep N Workspaces`), `use-worktree-context-menu-commands.ts:94`
  (atribuição de status em `Promise.all`).
- **Hydra**: `selectedWorktrees`/`isMultiSelected` existem apenas como props plumbadas
  (`WorktreeContextMenu.tsx:7`, `use-worktree-card-controller.ts:81`, `worktree-card-model.ts:25`) com
  default `false` e **nenhum setter** (grep `isMultiSelected =|setMultiSelected|toggleMultiSelect` → 0);
  `onAssignWorkspaceStatus` nunca é passado por caller (`WorktreeContextMenu.tsx:9`,
  `worktree-card-surface.tsx:21`).
- **Contrato Tauri**: nenhum (estado de seleção é frontend). Só há hard requirement de UI/estado.

## G4 — Deleção sem toasts e sem tradução de erro (recuperação manual) — **ALTO**

- **Impacto**: alto (usuário fica sem caminho de recuperação: unlock, orphan, PTY ativa, dirty).
  **Esforço**: médio (sonner já é dependência do projeto).
- **Linhas**: D07-041 (missing), D07-042 (missing), D07-038 (partial), D07-039 (partial), D07-029 (partial).
- **Orca**: `delete-worktree-failure-toast.tsx:29-114` (View / Force Delete / Delete Anyway, duração
  Infinity), `delete-worktree-toast.ts:16-121` (mensagens por causa), `delete-worktree-preference-toast.ts:6-40`
  (toast + link para Settings).
- **Hydra**: buscas `toast` em `src/App.tsx` (0) e `src/components/sidebar/**` (0); erros são renderizados
  dentro do diálogo (`DeleteWorktreeDialog.tsx:175-179`) com stderr cru do git
  (`src-tauri/src/worktree_ops.rs:1330`).
- **Contrato Tauri**: o enum `DeleteRefusal` de G1 (a tradução de mensagem depende do motivo estruturado,
  não de string de stderr).

## G5 — Aparência de status (cor/ícone) não é editável no sidebar — **MÉDIO-ALTO** (esforço baixo)

- **Impacto**: médio (personalização visível no census). **Esforço**: baixo (catálogos já existem).
- **Linhas**: D07-006 (missing), D07-007 (missing), D07-008 (partial).
- **Orca**: `WorkspaceStatusAppearancePopover.tsx:20-109` (botão + popover lateral, grade de 8 colunas
  com 11 cores, grade de 6 colunas com 16 ícones, `onChangeColor`/`onChangeIcon`).
- **Hydra**: catálogos prontos e idênticos em `workspace-status.ts:58-147` (11 cores),
  `workspace-status-icon-options.ts:28` (16 ícones), `workspace-status-icons.tsx:4,24,51` (ícones Conductor),
  renderizados nos headers de seção via `getWorkspaceStatusVisualMeta` (`workspace-status.ts:197` →
  `grouping/group-sections.ts:101`). Falta o picker e a persistência: buscas `WorkspaceStatusAppearancePopover`,
  `AppearancePopover`, `onChangeColor`, `onChangeIcon` → 0; `workspaceStatuses` do usuário nunca é gravado
  (só `cloneDefaultWorkspaceStatuses()` em `grouping/build-rows.ts:55`).
- **Contrato Tauri necessário** (não existe hoje nenhum comando de UI-state):
  ```rust
  #[tauri::command] async fn set_workspace_status_visual(state: State<AppState>, status_id: String,
      color_id: Option<String>, icon_id: Option<String>) -> Result<(), String>;
  #[tauri::command] async fn get_workspace_status_definitions(state: State<AppState>)
      -> Result<Vec<WorkspaceStatusDefinition>, String>;
  ```

## G6 — Menu de opções incompleto (badge, host scope, PR, Project/Manual, card properties) — **MÉDIO**

- **Impacto**: médio. **Esforço**: baixo-médio (UI + estado do sidebar).
- **Linhas**: D07-010, D07-011, D07-012, D07-013, D07-014, D07-015.
- **Orca**: `SidebarWorkspaceOptionsMenu.tsx:21-74` (badge de filtros ativos e tooltip `(N active)`),
  `workspace-options-menu-items.tsx:112-127` (Show com host scope + repos),
  `sidebar-workspace-option-items.ts:7,32,46,58,182,233,273` (Group by com 4 modos incl. PR, Sort by com 5
  opções, Project order Manual/Recent, layout Detailed/Compact, atividade de agentes, propriedades do card).
- **Hydra**: `SidebarHeader.tsx:82-105` (trigger SlidersHorizontal sem badge),
  `WorkspaceOptionsMenu.tsx:140-262` (Show → apenas Projects), `:278-300` (`none|workspace-status|repo`),
  `:315-345` (Agent Activity/Name/Recent), `:346-368` (Project order só "Manual", sem escrita em store),
  `:370-400` (Card display só "Detailed", compact vem de `settings.compact_worktree_cards` — App.tsx:3696).
  `sidebarHasActiveFilters` existe e devolve boolean, mas nenhum componente o consome
  (`sidebar-filter-actions.ts:12`); estado de host existe só na projeção
  (`host-section-rows.ts:169-207`) sem UI.
- **Contrato Tauri**: nenhum obrigatório (filtros/sort/group são frontend); host scope depende do modelo
  multi-host já presente nos tipos (`ExecutionHostScope`).

## G7 — `Pin` e `Mark Unread` não persistem — **MÉDIO**

- **Impacto**: médio (o estado some no reload; `Mark Unread` é item do census). **Esforço**: baixo.
- **Linhas**: D07-020 (partial).
- **Orca**: `use-worktree-context-menu-commands.ts:41-51` (`updateWorktreeMeta` com `executionHostId`,
  `setWorktreesPinnedAndReveal`).
- **Hydra**: `togglePinWorktree` (App.tsx:3135) e `toggleUnreadWorktree` (App.tsx:3138) operam apenas em
  `Set` React; nenhum `invoke` no caminho (`Copy Path` e `Rename` são equivalentes — rename persiste via
  `set_worktree_display_name` → `lib.rs:505` → `db.rs:1180`).
- **Contrato Tauri necessário**:
  ```rust
  #[tauri::command] async fn update_worktree_meta(state: State<AppState>, worktree_path: String,
      is_unread: Option<bool>, is_pinned: Option<bool>) -> Result<(), String>; // colunas novas em worktrees
  ```

## G8 — Linhagem: persistência em localStorage, picker modal e sem guarda de deleção — **MÉDIO**

- **Impacto**: médio. **Esforço**: baixo-médio.
- **Linhas**: D07-023 (partial), D07-043 (missing), D07-045 (partial).
- **Orca**: `worktree-context-menu-policy.ts:47-98` (label dinâmico, `isDeleting`, picker ancorado no card,
  unnest por contexto), `worktree-delete-state-host-match.ts:5-14` (estado por host).
- **Hydra**: `src/App.tsx:434` (`persistLineage` → `localStorage['hydra:worktree_lineage']`),
  `ParentPickerModal.tsx:21-166` (modal central), `Remove from Parent` apaga só a chave do worktree clicado
  (App.tsx:3485); estado de deleção keyed só por path (`DeleteWorktreeDialog.tsx:12-14`).
- **Contrato Tauri necessário**:
  ```rust
  #[tauri::command] async fn set_worktree_lineage(state: State<AppState>, child_path: String,
      parent_path: Option<String>, host_id: Option<String>) -> Result<(), String>;
  #[tauri::command] async fn get_worktree_lineage(state: State<AppState>) -> Result<HashMap<String,String>, String>;
  ```

## G9 — Política/performance do menu: sentinelas, supressão de clique e âncora de scroll — **MÉDIO-BAIXO**

- **Impacto**: baixo-médio (perf e robustez; bugs sutis de clique duplo/scroll). **Esforço**: baixo.
- **Linhas**: D07-017 (missing), D07-019 (missing), D07-027 (missing).
- **Orca**: `worktree-context-menu-policy.ts:16,19,33,51,60,74,167,176` (sentinels `EMPTY_*`,
  `selectMenuScopedMap`, `shouldUseNativeContextMenu`, `shouldIgnoreNestedWorktreeContextMenuScope`,
  janela de supressão de 500ms, loop de restauração de scroll por irmão).
- **Hydra**: buscas `EMPTY_TABS_BY_WORKTREE|selectMenuScopedMap|CONTEXT_MENU_CLICK_SUPPRESSION_MS|`
  `shouldSuppressContextMenuFollowUpClick|data-worktree-virtual-row|DELETE_POSITION_RESTORE_MAX_FRAMES` → 0;
  `requestAnimationFrame` em `src/App.tsx` → 0; não há lista virtualizada no sidebar.
- **Contrato Tauri**: nenhum (puramente frontend).

## G10 — Diálogo de exclusão: copy, dirty hints e skip-confirm condicionais — **BAIXO-MÉDIO**

- **Impacto**: baixo-médio (informativo/segurança percebida). **Esforço**: baixo.
- **Linhas**: D07-031, D07-032, D07-033, D07-034, D07-036 (partial); D07-035 (missing); D07-037 (parity,
  copy diverge).
- **Orca**: `delete-worktree-dialog-copy.ts:8-63`, `DeleteWorktreeDirtyChangeHint.tsx:6-29`,
  `delete-worktree-dirty-change-counts.ts:8-59`, `DeleteWorktreeLineageNotice.tsx:13-59`.
- **Hydra**: `DeleteWorktreeDialog.tsx:139-141` (copy genérica "from git and delete its workspace folder"),
  `:157-166` (badge `{dirty} uncommitted`, sem tooltip severo), `:175-184` (painéis de erro/principal — parity),
  `:190-205` (checkbox `Don't ask again`, sem o caso "com filhos").
  Hidratação de dirty existe (`App.tsx:1795-1807` → `invoke('get_detailed_git_status_cmd')`).
- **Contrato Tauri**: reaproveitar G1 (`DeleteRefusal::Dirty`) para o hint sem contagem fictícia e para a
  copy por tipo de alvo.

## G11 — Delete rápido no hover: sem gate de Alt nem atalho por linha — **BAIXO**

- **Impacto**: baixo (risco de clique acidental em ação destrutiva). **Esforço**: baixo.
- **Linhas**: D07-024, D07-025 (partial).
- **Orca**: `workspace-delete-quick-action.ts:21-94` (detector global de Alt com `useSyncExternalStore`,
  limpeza em blur/visibilitychange, `canShowWorkspaceDeleteQuickAction`),
  `hovered-workspace-delete.ts:42-86` (resolução da linha sob hover, guarda `isEditableTarget`, pastas).
- **Hydra**: `worktree-card-presentation.tsx:111` + `worktree-card-header.tsx:187-200` — botão de delete
  visível no hover/focus **sem** gate de modificador; buscas `Backspace`/`Delete` (teclado) e
  `hovered`/`isEditableTarget` → 0 no sidebar; `FolderWorkspaceRow.tsx:14-25` não expõe delete.
- **Contrato Tauri**: nenhum (frontend).

---

## O que NÃO é gap (parity comprovada)

- **D07-009** — resolução de metadados visuais de status com fallbacks idênticos
  (`workspace-status.ts:172-226`, alcançável por `visible-worktrees.ts:41` → `rendered-sidebar-worktree-order.ts:10`
  → `grouping/build-rows.ts:14` → `group-sections.ts:101`).
- **D07-018** — submenu Developer revelado por Alt (`App.tsx:3297,3486` + `3172,3276` para o header de projeto).
- **D07-037** — painéis de aviso do modal (checkout principal + erro) em `DeleteWorktreeDialog.tsx:175-184`.

## Método (buscas negativas registradas)

Para cada `missing` foram executadas, no mínimo: (1) nome homônimo em `src/components/sidebar/**`;
(2) string/label/aria-label exata; (3) função/efeito em store/hook; (4) comando Tauri em `src-tauri/src/**`;
(5) grep de sinônimos no repo. Listas completas em `notes` de cada linha do `D07-menus-actions.diff.json`.
