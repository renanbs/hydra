# Gaps — Domínio D15-misc-a (Fase 2: veredito Hydra)

Fonte do Hydra: `/home/renan/orca/workspaces/hydra/ondine` (React 19 + Tauri v2).
Mount auditado: `src/App.tsx:3636` → `src/components/sidebar/WorktreeSidebar.tsx:705` → `src/components/sidebar/WorktreeList.tsx`.
Inventário congelado: `domains/D15-misc-a.orca.json` (12 linhas).

## Resumo

| Veredito | Qtd | Linhas |
|---|---|---|
| `parity` | 0 | — |
| `partial` | 5 | D15a-006, D15a-007, D15a-009, D15a-010, D15a-012 |
| `missing` | 7 | D15a-001, D15a-002, D15a-003, D15a-004, D15a-005, D15a-008, D15a-011 |
| `not-applicable` | 0 | — |
| `out-of-scope` | 0 | — |

Nenhuma linha fecha `parity`: as únicas capacidades com comportamento idêntico ao Orca
(contagem host-qualified, títulos dinâmicos de host) existem apenas no pipeline de ordenação
Cmd+1–9 e não têm superfície renderizada no sidebar.

## Achado transversal (afeta 4 linhas: 006, 007, 012 e o módulo de drop do 008)

O sidebar tem **dois modelos paralelos**:

1. **Modelo renderizado** — `WorktreeList.tsx` monta grupos/repos/folders direto dos props
   (`projectGroups`, `projectGroupMap`, `folderWorkspaces`), sem hosts. `WorktreeSidebar.tsx` e
   `WorktreeList.tsx` têm **0 ocorrências** de `host` (grep `-i 'host'`), e `WorktreeList` não recebe
   nenhuma prop de host/escopo.
2. **Modelo portado do Orca (não renderizado)** — `worktree-list/grouping/build-rows.ts`,
   `host-section-rows.ts`, `sidebar-host-options.ts`, `project-header-drop.ts`,
   `worktree-list/rows/SectionHeader.tsx` (shim de re-export). É alcançável do mount apenas via
   `visible-worktrees.ts:377` (`computeRenderedSidebarWorktreeOrder`), usado por
   `getVisibleWorktreeShortcutTargets()` → `src/App.tsx:2456` para numerar Cmd+1–9.

Consequência: peças portadas do Orca que produzem linhas `type: 'host-header'` ou dependem de
atributos `data-repo-header-*` **não têm renderer/callsite** — é a fonte dos downgrades de
006/007/008 para `partial`/`missing`. Este domínio recomenda consolidar os dois modelos antes de
portar as superfícies.

## Por linha

### D15a-001 — Detecção/desempacotamento de fenced block Mermaid — `missing`
Buscas (5 passos): homônimos em `src/components/sidebar/**` → 0; strings `mermaid`/`language-mermaid`
em `src/components/sidebar/**` → 0; `react-markdown`/`remark-gfm`/`rehype` → ausentes de
`package.json` e de `src/components/sidebar/**`; backend → n/a; resquícios → chave i18n
`MermaidBlock` (`src/i18n/locales/en.json:14974`) e extensão `.mmd`/`.mermaid`
(`src/lib/language-detect.ts:32`), ambos sem componente.
Gap: o sidebar do Hidra não renderiza Markdown em comentários; não há `<pre>`/`code` de diagrama,
nem classe `language-mermaid`.

### D15a-002 — Renderização de Mermaid em comentários — `missing`
Mesmas buscas. Sem `CommentMermaidBlock`, sem tema escuro/`htmlLabels` de diagrama, sem dependência
`mermaid`. Alinhado ao D12-markdown-inline-render (também `missing`).

### D15a-003 — Cor de badge de repositório — `missing`
`badgeColor` tem 0 hits em `src/components/**` e `src/App.tsx`. Nenhuma cor de cabeçalho é produzida:
`SectionHeader.tsx:238-262` renderiza ícone + nome, sem estilo de cor. As peças adjacentes existem
mas com outra semântica/sem consumo: `REPO_COLORS`/`DEFAULT_REPO_BADGE_COLOR`
(`src/shared/constants.ts:108-119`) e `normalizeRepoBadgeColor` (`src/store/repos/repo-update.ts:26-29`,
sanitiza update de repo e devolve `undefined` em inválido — não o fallback cinza do Orca).
Gap: normalização whitespace/casing, validação de paleta/hex e fallback cinza do cabeçalho.

### D15a-004 — Cor contextual de Project Group/Provider — `missing`
Sem `resolveProjectGroupHeaderColor` e sem colorização por `headerKey`/`groupBy`. `groupBy` existe
(`src/shared/persisted-ui-state-types.ts:41`) e é usado só para agrupar/filtrar
(`worktree-list/grouping/build-rows.ts`), nunca para cor. `GroupSectionHeader`
(`SectionHeader.tsx:69-200`) não recebe `badgeColor`.

### D15a-005 — Aviso de ordenação manual de projetos — `missing`
Sem `resolveProjectOrderManualDefaultNoticeDismissed`/`shouldShowProjectOrderManualDefaultNotice`.
`projectOrderBy` está wired (menu em `WorkspaceOptionsMenu.tsx:346-360`; uso em
`grouping/build-rows.ts:56,211`, `grouping/section-order.ts:181-184`), mas nenhum banner/aviso existe
(os hits de "notice" no sidebar são os avisos de worktrees descobertas). `persistedUIReady` existe
(`src/store/slices/ui/ui-slice-hydration-actions.ts:289`) e é consumido apenas por tours/usage-notice
(`src/shared/usage-percentage-display-change-notice.ts:32-39`).
Gap: os 4 sub-comportamentos de visibilidade/dispensa do aviso.

### D15a-006 — Opções/escopos de hosts (derive) — `partial`
Existe e é fiel: `buildSidebarHostOptions` (`sidebar-host-options.ts:39-95`) consome exatamente os
slices do Orca (`repos`, `sshTargetLabels`, `sshConnectionStates`, `settings`, `runtimeEnvironments`,
`runtimeStatusByEnvironmentId`) e aplica `getHostDisplayLabelOverrides`
(`rendered-sidebar-worktree-order.ts:103`), produzindo `SidebarHostOption`
(id/label/detail/kind/health/presence/compatibility/connectionStatus).
Faltam:
- `SidebarHostScopeOption` e helpers sem callsites: `buildSidebarHostScopeOptions`
  (`sidebar-host-options.ts:101`), `shouldShowHostScopeControls` (:97),
  `getSidebarHostVisibilityLabel` (:120);
- hook memoizado (a derivação é inline em `computeRenderedSidebarWorktrees`);
- superfície de UI no sidebar (0 referências a `ExecutionHostId`/escopo de host em `src/components/**`).

### D15a-007 — Contagem de folder-workspaces por seção de host — `partial`
Semântica implementada: `getLaneHostWorktreeCounts` (`grouping/host-labels.ts:204-227`) soma
folder-workspaces às contagens; `getLaneHostWorktreeIds` (:229-254) garante array vazio por host de
pasta (evita vazar ids globais); `getFolderWorkspaceHostId` (`folder-workspace-host-id.ts:16-21`)
resolve o host remoto via `connectionId` da pasta **ou do ProjectGroup**; `addHostSectionRows`
distribui `hostWorktreeCounts` em raias colapsadas (`host-section-rows.ts:205-227`) e grava
`count` no cabeçalho (:290-300); lanes armadas em `group-sections.ts:109-145` e `build-rows.ts:165-175`.
Gap: nenhum renderer consome `type: 'host-header'` (único consumidor:
`worktree-sidebar-row-preference.ts:48`, via Cmd+1–9). O usuário não vê cabeçalhos de seção de host
nem as contagens no sidebar.

### D15a-008 — Drag DOM + ordenação persistida de Project Groups — `missing`
`data-project-group-header-*` → 0 hits em `src`. `GroupSectionHeader` (`SectionHeader.tsx:69-200`)
não tem `draggable`/`onDragStart`/`onDragEnd` — só é destino de drop
(`WorktreeList.tsx:476-509`, props `:138-140/:562`). Não existe `updateProjectGroup(groupId, {tabOrder}, {hostId})`;
`ProjectGroup.tabOrder` é apenas lido para ordenar (`grouping/project-group-sections.ts:82`) e o drag
de repo usa índice posicional (`WorktreeSidebar.tsx:485-501`), sem rank persistido por grupo.
O módulo de drop de cabeçalho (`project-header-drop.ts:136-160`) é código morto: consulta
`[data-repo-header-id|index|bucket|section-end]`, atributos que **nenhum** componente renderiza
(os únicos `data-repo-header-*` emitidos são `-actions` em `ProjectHeaderActions.tsx:26` e
`-collapse-affordance` em `SectionHeader.tsx:160,340`).

### D15a-009 — Isolamento de clique das ações de cabeçalho — `partial`
Metade "colapso" OK: todos os controles de ação param propagação
(`SectionHeader.tsx:88-94`, `:168-171`, `:192-196`, `:234-239`, `:240-245`, `:247-253`) e não disparam
o `onClick` da linha (`:293`). O atributo `data-repo-header-actions` é renderizado
(`ProjectHeaderActions.tsx:26`, usado nos dois cabeçalhos: `SectionHeader.tsx:154,335`).
Faltam:
- `REPO_HEADER_ACTION_SELECTOR` e `isRepoHeaderActionTarget`/`isProjectGroupHeaderActionTarget` (0 hits);
- bloqueio de dragstart: o cabeçalho é `draggable` (`SectionHeader.tsx:265`) e
  `handleProjectDragStart` (`WorktreeSidebar.tsx:470-475`) não inspeciona o target; arrastar a partir
  de `…`/`+`/chevron ainda inicia o drag. `isSidebarPointerDragBlocked`
  (`worktree-list/pointer-drag-dom.ts:21`) existe mas não tem callsites.

### D15a-010 — Área de toque da alça de resize — `partial`
Funcional e wired: `App.tsx:3705` (`onMouseDown={leftSidebar.onResizeStart}`, `cursor-col-resize`),
hook `useSidebarResize` (`src/hooks/useSidebarResize.ts:51,185`) com drag rAF e persistência clampada
(`App.tsx:737,763`). Terceiro behavior satisfeito: container com scrollbar tem `pr-3` (12px ≥ 4px)
em `WorktreeSidebar.tsx:703`.
Faltam: largura de toque 12px (`w-3`; Hidra usa `w-2.5`=10px, `-ml-1.5/-mr-1.5`, `z-20`, `App.tsx:3705`)
e linha interna de 1px com `group-hover:bg-ring/50`/`group-active:bg-ring` (Hidra desenha `w-[2px]`
`emerald-500/400`, `App.tsx:3709`).

### D15a-011 — Sleep de worktree + resume de VM (concorrência) — `missing`
Homônimos `sleep-worktree-flow`/`sidebar-worktree-activation` inexistentes. `resumeWorkspace`,
`slept`, `shutdownWorktreeBrowsers`/`shutdownWorktreeTerminals` → 0 hits em produção (só fixtures
`src/hooks/ipc-events-*.ts` com `onSleepWorktree` stub). O Hidra só tem `sleepingAgentSessionsByPaneKey`
(`src/store/index.ts:123`) e o filtro `showSleepingWorkspaces` (`visible-worktrees.ts:168`) — escondem
linhas, não suspendem/reativam VM. Backend: `index/hydra_tauri_commands.json` (110 comandos) não tem
sleep/resume/vm/ephemeral; `ephemeralVm*` no TS é seleção de receita do composer
(`src/hooks/composer-state/*`, `src/components/settings/ephemeral-vms-search.ts`).

### D15a-012 — Seleção host-qualified de worktrees no Kanban — `partial`
Mecanismo existe, mas na lista (não no Kanban): `getWorktreeHostIdentity`
(`src/shared/worktree/host-qualified-identity.ts:30`) qualifica por host e deduplica a mesma id em
hosts distintos (`grouping/host-labels.ts:171-190`, comentário STA-4343); a filtragem respeita
`visibleWorkspaceHostIds`/`workspaceHostScope` (`visible-worktrees.ts:147-155`); o eixo sustenta as
seções fixadas (`pinned-section-worktrees.ts:13,26`).
Gap: não há quadro Kanban no sidebar (`kanban` → 0 hits em `src/components/sidebar/**`); o dashboard
experimental é só settings/atalho (`experimental-search.ts:57`,
`src/hooks/ipc-events/agent-dashboard-command.ts:3`), sem board renderizado — o alvo do filtro (PAR-14)
não foi portado.

## Cross-walk PAR (itens de sidebar)

| PAR | Linhas Orca | hydra_status | escopo |
|---|---|---|---|
| PAR-39 (CommentMarkdown) | D12-001..014, D15a-001, D15a-002 | missing | sidebar |
| PAR-21 (Sleep/wake de worktree) | D15a-011 | missing | sidebar |
| PAR-14 (WorkspaceKanbanDrawer) | D15a-012 | missing | sidebar |

Demais linhas deste domínio (003, 004, 005, 006, 007, 008, 009, 010) não correspondem a nenhum item
`PAR-*` da spec (`70-Specs/hydra/Spec - Paridade Terminal e Left Sidebar Orca.md`).
