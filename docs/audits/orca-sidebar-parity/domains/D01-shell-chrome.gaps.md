# D01-shell-chrome → Hydra — Gaps (Fase 2)

Veredito: **parity 7 · partial 15 · missing 30 · not-applicable 0 · out-of-scope 0** (52/52 ids).
Diff: `domains/D01-shell-chrome.diff.json`. Inventário: `domains/D01-shell-chrome.orca.json`.
Protocolo: `HYDRA_MAPPING.md`. Runtime Orca (contraprova): `runtime/census-v3.json`
(`steps.static_sidebar`, `steps.surface_sweep`) e `runtime/census-v4.json`.

## Superfície Hydra realmente wired (baseline)

Casca do sidebar = `src/App.tsx:3631-3637` (`{isLeftSidebarOpen && (<aside ref={leftSidebar.containerRef}>`),
com largura vinda de `useSidebarResize` (`src/App.tsx:737-745`) e persistida por
`get_layout_persistence` / `save_layout_persistence` (`src-tauri/src/lib.rs:626`, `:631`).
Dentro dela, o Hydra tem **exatamente quatro** superfícies de shell:

| Superfície | Arquivo | Montagem |
|---|---|---|
| Nav superior (Search → CommandPalette) | `src/components/sidebar/SidebarNav.tsx:1-23` | `WorktreeSidebar.tsx:626-630` |
| Cabeçalho (título + Bell + options + add + new) | `src/components/sidebar/SidebarHeader.tsx:51-170` | `WorktreeSidebar.tsx:634-643` |
| Corpo (WorktreeList ⇄ SidebarAgentsList) | `WorktreeList.tsx` / `SidebarAgentsList.tsx` | `WorktreeSidebar.tsx:646-703` |
| Rodapé (Settings + Reveal + versão/commit) | `src/components/sidebar/SidebarFooter.tsx:19-53` | `WorktreeSidebar.tsx:857-862` |

Backend alcançável do sidebar (13 comandos, `index/hydra_sidebar_backend_map.json`): `catalog_add_folder`,
`catalog_set_worktree_visibility{,_sources}`, `clone_project`, `create_project`, `get_app_version`,
`import_worktree`, `kill_port_process`, `save_session_record`, `scan_workspace_ports`, `scan_worktrees`,
`set_project_worktree_base`, `suppress_worktree_inbox`. Nenhum deles serve shell chrome; a casca usa
`get/save_layout_persistence` (layout) e `get_sidebar_pref` (`src/App.tsx:773`).

Código órfão que **não** conta como paridade (`index/hydra_unreachable.json` + grep de importadores):
`worktree-list/pointer-drag-dom.ts` (único consumidor de `data-workspace-board-preserve-open`),
`worktree-list/rows/SectionHeader.tsx`, `build-rows.ts`, `row-types.ts`, `project-group-sections.ts`,
`WorktreeCardStatusLane.tsx` (só testes), `components/dashboard/**` (nenhum importador — "Agent Dashboard"
sem porta de entrada) e `components/status-bar/UpdateStatusSegment.tsx:8-15` (stub que retorna `null`).

## Top gaps (≤10, ordenados por impacto × esforço)

1. **A régua de navegação inteira do Orca não existe** — `D01-017` (Setup Guide), `D01-018` (Tasks),
   `D01-019` (atalhos GitHub/Jira), `D01-020` (preflight/Linear), `D01-021` (Artifacts), `D01-022` (Skills),
   `D01-023` (Automations), `D01-024` (Orca Mobile), `D01-025` (menu "Hide from sidebar"), `D01-026` (i18n da nav),
   `D01-027/028/029` (Agent Dashboard entry/popout/host) — **13 linhas missing**. O Orca mostra no topo
   `Search → Tasks(+Open GitHub/Jira tasks) → Automations → Orca Mobile(New)` (census-v3 `static_sidebar`,
   y=44/78/111/145); o Hydra tem só `Search`. Esforço amortizado: o store **já porta**
   `openTaskPage` (`src/store/slices/ui/ui-slice-task-actions.ts:35`), `openSkillsPage`/`openArtifactsPage`/
   `openMobilePage` (`ui-slice-view-actions.ts:49/:82/:95`) e `setupGuideSidebarDismissed`
   (`ui-slice-trust-actions.ts:59-66`) — falta UI + páginas (grep em `*.tsx` = 0 consumidores).
2. **Menu de Ajuda + Feedback inteiros** — `D01-035` (dropdown Help), `D01-036` (Atalhos/Feedback/Milestones/
   Onboarding), `D01-037` (Docs/Changelog/GitHub/Discord/X), `D01-038` (Check for Updates com canais),
   `D01-039` (Restart Orca), `D01-040`/`D01-041`/`D01-042`/`D01-043` (modal de feedback, identidade gh, anexos,
   submit) — **9 linhas missing**. Orca: `Help` em `[36,1146,24,24]` (census-v3). O Hydra tem
   `open_external_url_cmd` (`src-tauri/src/lib.rs:97`) — falta tudo o resto (ver contratos abaixo).
3. **Workspace Board (Kanban) sem botão e sem dica de realocação** — `D01-032` (toggle + preview de drag) e
   `D01-033` (tooltip "Workspace board moved to the bottom bar") **missing**; o Orca tem o botão em
   `[248,1146,24,24]` com `data-workspace-board-trigger`. Não há `workspaceBoardOpen` no store nem componente
   de board — a linha é independente do board em si (D08).
4. **Submenu de escopo multi-host sem UI** — `D01-045` **missing**: `buildSidebarHostScopeOptions`,
   `getSidebarHostVisibilityLabel`, `getSidebarHostHealthLabel`, `shouldShowHostScopeControls`
   (`sidebar-host-options.ts:97-154`) têm **zero consumidores**, e `setWorkspaceHostScope` /
   `setVisibleWorkspaceHostIds` (`ui-slice-preference-actions.ts:68,77`) nunca são chamados por componente.
   O filtro de host só existe no pipeline de dados (`rendered-sidebar-worktree-order.ts`).
5. **Escapes do census sem linha no inventário** — `Refresh rate limits`, `Notifications alt+T` e
   `Keep computer awake` (ver §Escapes). Severidade média, esforço alto (exige backend novo).
6. **Casca sem `data-sidebar`, com limites/default divergentes e sem canal de live-width** — `D01-001`
   **partial**: Orca 320px / 220-500 / `--workspace-sidebar-live-width`; Hydra 280px / 180-480
   (`src/App.tsx:287,739-740`) escrevendo `style.width` inline (`useSidebarResize.ts:82-96`), sem atributo na raiz.
7. **Drop nativo de pastas do SO** — `D01-004` **missing** (PAR-13). Nenhum `dragenter/dragover/onDrop` de SO
   na casca: o DnD existente é interno de cards/projetos (`WorktreeList.tsx:277-280,394-399`).
8. **`SidebarCountBadge` (1…9+)** — `D01-050` **missing** (PAR-38). O cabeçalho de grupo pinta um ponto
   estático e há comentário explícito de que o Orca não pinta badge no header (`SectionHeader.tsx:141-147`);
   pílulas numéricas locais em `SidebarAgentsList.tsx:219` não são o badge compartilhado.
9. **CacheTimer inerte** — `D01-049` **partial** (PAR-60): `cacheStartedAt` é hardcoded `null`
   (`use-worktree-card-controller.ts:305`), então `worktree-card-meta-row.tsx:99` nunca monta o contador;
   faltam TTL por settings, estado vermelho de expirado, alerta ≤60s, tooltip e os hooks por pane.
10. **Título do cabeçalho estático + galeria de overlays** — `D01-007` **partial** (PAR-03: "Projects" fixo,
    sem "Workspaces" nem i18n) e `D01-047` **partial**: `addHostSectionRows` está completo e wired
    (`host-section-rows.ts:166-306`) mas os `HostHeaderRow` **nunca são pintados**
    (`WorktreeList.tsx` = 0 referências a `host-header`), então não há agrupamento por host visível.

## Escapes — affordance do runtime do Orca sem linha no inventário D01

> **Reparo E3 (falsificação) — linha `D01-052` nasceu daqui.** O toggle do sidebar por comando
> (`sidebar.left.toggle`, Cmd+B) existia no Orca mas não constava do inventário.
> `D01-052` foi adicionada com evidência `app-shell/app-command-handlers.ts:168`,
> `store/slices/ui/ui-slice-agent-actions.ts:46` e `app-shell/TitlebarLeftControls.tsx:31`
> (a spec e2e `tests/e2e/tab-sidebar-closed-overlap.spec.ts:36` é citada em `tests` porque vive fora do
> mount `src/renderer/src` e não é resolvível como `orca_evidence`) e veredito **partial** no `.diff.json`
> (Hydra tem o atalho e o botão wired, mas a definição de keybinding em
> `src/shared/keybindings/definitions-core-1.ts:181` é órfã — o toggle passa por keydown raw em
> `src/App.tsx:2545`).

O inventário congelado não tem linha para três controles que o runtime do Orca expõe na faixa inferior do
sidebar (`runtime/census-v3.json` `steps.static_sidebar`). Registrados em
`missing_behaviors` da linha mais próxima (**D01-030**, container do rodapé) e confirmados ausentes de
**todos** os domínios (grep em `domains/*.orca.json` = 0 ocorrências):

| Affordance Orca | Prova de runtime | Estado no Hydra |
|---|---|---|
| `Refresh rate limits` | `static_sidebar` box `[12,1181,15,15]`, `data-slot=tooltip-trigger`, `data-state=closed` | **Ausente do sidebar.** O store porta `rateLimits` (`store/slices/rate-limits.ts`) e a StatusBar o consome (`status-bar/use-status-bar-controller.ts:15,100`), mas via ponte `window.api.rateLimits` (ausente em runtime) e **fora** do sidebar. Backend Tauri necessário. |
| `Notifications alt+T` | `static_sidebar` box `[0,1200,1920,0]` (faixa de largura total) | **Ausente.** Sem comando/plugin de notificação em `src-tauri` (`Cargo.toml:21-41` não tem `tauri-plugin-notification`); só existe `notification_on_blocked` como setting (`components/SettingsModal.tsx:714`). |
| `Keep computer awake` | citado no briefing do domínio (não indexado em census-v3/v4) | **Existe, mas fora do sidebar**: `components/status-bar/CaffeinateStatusSegment.tsx:26` (system tray de estado + `settings.keep_computer_awake_while_agents_run`) com backend real `sync_keep_awake` (`src-tauri/src/lib.rs:1256`, crate `keepawake` em `Cargo.toml:38`). Não conta como paridade do rodapé do sidebar. |

Demais affordances do census já têm linha e veredito: `Search…`→D01-016, `Tasks`→D01-018,
`Open GitHub/Jira tasks`→D01-019, `Automations`→D01-023, `Orca MobileNew`→D01-024, `View activity`→D01-008,
`Workspace options`→D01-013/045, `Add project`→D01-011, `New workspace`→D01-012, `Settings`→D01-034,
`Help`→D01-035, `Reveal active workspace`→D01-031, `Workspace board`→D01-032,
`Workspace board moved to the bottom bar`→D01-033, `Project actions`/`Create new worktree`→D01-014/015.

## Contratos Tauri necessários (linhas missing/partial sem backend)

Nada disso existe hoje em `src-tauri/src/lib.rs` (110 comandos, `index/hydra_tauri_commands.json`) —
não há plugin de updater, de notificação nem de `process` (`src-tauri/Cargo.toml:21-41`).

| Linhas | Contrato necessário | Observação |
|---|---|---|
| D01-038 | `check_for_updates(channel: "stable" \| "rc" \| "perf") -> UpdateStatus` + evento `update:status` (checking/downloading/ready) | `UpdateStatusSegment.tsx:8-15` é stub `null`; requer `tauri-plugin-updater` |
| D01-039 | `restart_app()` (`app.restart()`), com ack/erro | hoje só existe "Restart daemon" (`useDaemonActions.tsx:143`) |
| D01-040/041/042/043 | `submit_feedback({ text, images[], anonymous, ghLogin?, ghEmail? }) -> { imagesDelivered }` + `gh_viewer() -> { login, email } \| null` | imagens: array de bytes/nome; `image` crate já é dependência (`Cargo.toml:41`) |
| D01-037 | já existe: `open_external_url_cmd` (`lib.rs:97`) | falta apenas a UI dos links |
| D01-018/019/020 | provider de tarefas (gh/glab/linear/jira) — nenhum comando hoje; `check_preflight_tools_cmd` (`lib.rs:76`) cobre só o preflight | store `openTaskPage` pronto, sem UI |
| Escapes (`Refresh rate limits`, `Notifications`) | `rate_limits_get/refresh`, `notifications_permission/toggle` | hoje dependem da ponte `window.api.*` inexistente |
| D01-004 | `add_project_from_drop(path)` (reusa `catalog_add_folder`/`create_project`) | sem listener de drop na casca |

## Notable parity / partial (≤5)

- **parity `D01-046`** — `orderHostSectionOptions` (`host-section-order.ts:4-30`) aplica a ordem persistida,
  ignora ids obsoletos e anexa hosts novos, wired em `rendered-sidebar-worktree-order.ts:92`.
- **parity `D01-044`** — `buildSidebarHostOptions` (`sidebar-host-options.ts:39-88`) porta presença/health/
  compat/connectionStatus/hostLabelOverrides sem perda; alcançável via `App.tsx:2456` (Cmd+1–9).
- **parity `D01-014`/`D01-015`** — `PROJECT_HEADER_ACTIONS_CLASS_NAME` e as duas classes
  `REPO_HEADER_ACTION_*` são cópia fiel e estão aplicadas nos dois cabeçalhos
  (`SectionHeader.tsx:154,178,190,335,355,367`).
- **partial `D01-048`** — a escada de status (`WorktreeStatusIndicator.tsx:40-87`) está no caminho real
  (FolderWorkspaceRow + card), verde/cinza/spinner/activity/vermelho corretos; falta tooltip localizado
  (`StateIndicatorTooltip`) e o glifo `permission` do Orca; `WorktreeCardStatusLane.tsx` é órfão.
- **partial `D01-005`/`D01-030`/`D01-034`** — alternância Workspaces⇄Agents, rodapé e botão Settings
  funcionam ponta a ponta (com `App.tsx:3661`, `:3698`), mas sem lazy chunk/scroll-restore, sem i18n
  individual e sem o cluster de board; `D01-030` carrega também os escapes do census.

## Cobertura

Todos os 52 ids do `.orca.json` aparecem exatamente uma vez no `.diff.json`
(`jq '.rows|length'` = 52; ids D01-001…052, sem repetição). Cada linha tem `status` do vocabulário fechado;
`parity`/`partial` carregam evidência `arquivo:linha` alcançável do mount (`WorktreeSidebar.tsx`/`App.tsx`)
com backend rastreado quando existe; `partial` e `missing` carregam `missing_behaviors`; linhas `missing`
carregam `notes` com a busca em 5 passos. `par` registra o crosswalk com a spec
(`70-Specs/hydra/Spec - Paridade Terminal e Left Sidebar Orca.md`): PAR-03→D01-007, PAR-13→D01-004,
PAR-14→D01-032, PAR-38→D01-050, PAR-60→D01-049, PAR-80→D01-051
(`domains/_par-crosswalk.json` **não** foi tocado).
