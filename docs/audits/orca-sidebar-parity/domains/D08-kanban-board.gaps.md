# D08-kanban-board — Fase 2 (veredito Hydra)

Domínio: `D08-kanban-board` (45 linhas Orca).
Fonte Hydra: `/home/renan/orca/workspaces/hydra/ondine` (React 19 + Tauri v2).
Mount do sidebar: `src/App.tsx:3636` → `src/components/sidebar/WorktreeSidebar.tsx`.

## Contagens

| veredito | linhas |
|---|---|
| parity | 0 |
| partial | 5 |
| **missing** | **40** |
| not-applicable | 0 |
| out-of-scope | 0 |

Linhas Orca cobertas: **45/45** (cada id exatamente uma vez).

## Sumário executivo

A gaveta Kanban de workspaces **não existe no Hydra**. Nenhum arquivo, símbolo, estado ou
comando Tauri de board foi portado:

- `grep -rn "WorkspaceKanban|workspace-kanban|workspaceBoardOpen|toggleWorkspaceBoard" src/ src-tauri/src/` → **0 hits**.
  Só o app do Orca tem esses nomes (o inventário D08 tem 26 arquivos `WorkspaceKanban*`/`use-workspace-kanban-*`).
- Marcas de board sobrevivem apenas como **vocabulário morto**: `data-workspace-board-preserve-open`
  é emitido por `src/components/sidebar/worktree-card-header.tsx:190`, mas o único consumidor
  (`src/components/sidebar/worktree-list/pointer-drag-dom.ts:18`) está em `index/hydra_unreachable.json`.
- Os rótulos `Workspace board` / `Close workspace board` e o namespace `WorkspaceKanbanSettingsMenu`
  existem só no catálogo i18n **importado do Orca** (`src/i18n/en-runtime-required.json:1898-1902`,
  `:1926-1928`), sem nenhum componente que os consuma.
- O canal IPC `ui.onOpenWorkspaceBoard` aparece **apenas como expectativa de teste**
  (`src/hooks/useIpcEvents-lifecycle.test.ts:67,135`); o bridge que o registraria é auto-stub
  (`src/hooks/ipc-events/settings-sidebar-ipc-bridge.ts:3` → `export const registerSettingsAndSidebarIpcBridge: any = null`),
  e não há nenhum `window.api.ui.onOpenWorkspaceBoard(...)` no renderer.
- O keybinding `workspace.openBoard` ("Toggle Workspace Board") está definido em
  `src/shared/keybindings/definitions-core-1.ts:103` e tipado em `src/shared/keybindings/types.ts:37`,
  mas **nenhum handler o despacha** (`grep "openBoard" src/ -> só defines/types`).
- A telemetria do board existe sem emissor: `src/shared/feature-interaction-catalog.ts:66,72`
  (`workspace-board`, `workspace-board-actions`), `src/shared/feature-education-telemetry.ts:4`.
- O tour contextual do board foi declarado com seletores que **nunca renderizam**:
  `src/shared/contextual-tours.ts:59-72` pede `[data-contextual-tour-target="workspace-board-center"]`,
  `"workspace-board-lanes"` e `"workspace-board-done-lane"` → 0 hits de renderização em `src/**`.
- Nenhum comando Tauri equivalente em `index/hydra_tauri_commands.json` (110 comandos); `src-tauri/src/**`
  não tem `workspace_status`, `board` nem `linear`.

### Mecanismo presente, porém inerte (arquivo ≠ funcionalidade)

O port deixou o **estado e as constantes** do board, sem nenhum ponto de uso:

| artefato | evidência | caller |
|---|---|---|
| `workspaceBoardColumnWidth`/`Opacity`/`syncTaskStatusFromWorkspaceBoard` (defaults) | `src/shared/constants.ts:287-289` | hidratados (`ui-slice-hydration-actions.ts:200-203`), nunca lidos por UI |
| setters de coluna/opacidade/sync/statuses | `src/store/slices/ui/ui-slice-preference-actions.ts:239-262` | **0 callers** |
| constantes/clamp de largura de coluna | `src/shared/workspace-statuses.ts:20-23,237-243` | só normalização |
| `makeWorkspaceStatusId` | `src/shared/workspace-statuses.ts:143` | só normalização interna de persistência |
| payload de drag do board (`application/x-orca-worktree-id(-ids)`) | `src/components/sidebar/workspace-status-drag-data.ts:3-5` | **0 callers** (`writeWorkspaceDragData`/`readWorkspaceDragDataIds`/`hasWorkspaceDragData`) |
| catálogos de cor/ícone de status | `src/components/sidebar/workspace-status.ts:58,151,197`, `workspace-status-icon-options.ts:28` | módulo sem importadores |
| agrupamento por status (headers de raia) | `src/components/sidebar/worktree-list/grouping/group-sections.ts:96-120`, `folder-workspace-lanes.ts:53` | `build-rows.ts`/`buildSidebarRows.ts` em `index/hydra_unreachable.json` |
| ordenação manual de drop por grupo | `src/components/sidebar/worktree-manual-order.ts:161,240`, `worktree-drag-units.ts:18` | **0 callers** |

A lista renderizada monta **apenas** grupos de projeto (`WorktreeList.tsx:476`); `displayOptions.groupBy`
tem como único efeito a indentação (`WorktreeList.tsx:338`). Ou seja, a opção
`Group by: Status` do menu (`WorkspaceOptionsMenu.tsx:286-294`) não produz seções por status.

### Falso positivo a evitar

`src/components/sidebar/WorktreeCardStatusLane.tsx:1-6` **não** é uma raia do Kanban: é o glifo da
coluna esquerda do card (comentário “Ported from Orca `WorktreeCardStatusSlot.tsx`”), coberto por
`worktree-card-lane-placement.parity.test.tsx:1-3`. Idem `data-hydra-drop-indicator`
(`SectionHeader.tsx:273`), que marca drop em headers de **projeto**, não em raias.

## Regra de ouro — prova de wiring

- `missing` (40 linhas): o símbolo/estado correspondente não existe, ou existe mas **não é alcançável
  a partir do mount** e/ou não tem efeito observável (itens da tabela “presente, porém inerte”).
  Cada nota no `.diff.json` registra a busca obrigatória em 5 passos.
- `partial` (5 linhas): existe caminho **wired** no sidebar para a mesma ação de usuário, com
  sub-comportamentos nomeados faltando. São elas: `D08-010`, `D08-011`, `D08-013` (busca de
  workspaces no campo de filtro da lista), `D08-029` (projeção/filtros/ordenação de worktrees na
  lista) e `D08-042` (reordenar e fixar worktrees na lista).
- Nenhuma linha recebeu `not-applicable` ou `out-of-scope`: board é portável (React/Radix/Tauri) e
  não há decisão de produto registrada contra a paridade.

## Tabela linha → veredito

| id | capability (curto) | veredito | busca (âncoras Hydra) |
|---|---|---|---|
| D08-001 | Toggle do painel Kanban + telemetria | missing | definitions-core-1.ts:103; useIpcEvents-lifecycle.test.ts:135; settings-sidebar-ipc-bridge.ts:3 |
| D08-002 | Preview/solidify do board por drag | missing | WorktreeSidebar.tsx:442; worktree-sidebar-header-drop-preview.ts:1 |
| D08-003 | Escape em captura p/ fechar board | missing | WorktreeSidebar.tsx:678 (Escape do filtro) |
| D08-004 | Outside dismiss preservando menus | missing | worktree-card-header.tsx:190; pointer-drag-dom.ts:18 (unreachable) |
| D08-005 | Lingering de 300ms do drawer | missing | hydra_timers.json; WorktreeCardAgents.tsx (sem drawer) |
| D08-006 | Render diferido dos cards + clear de seleção | missing | WorktreeSidebar.tsx:373,410 (rAF de highlight) |
| D08-007 | Sheet não-modal + layout/reserva de status bar | missing | shared/constants.ts:287; ui/dropdown-menu.tsx:1 |
| D08-008 | Header do drawer (título, badge, busca, filtro, settings, X) | missing | SidebarHeader.tsx:50; en-runtime-required.json:1898 |
| D08-009 | Superfície de seleção + container de raias | missing | WorktreeSidebar.tsx:698 (scroller vertical) |
| D08-010 | Campo de busca de workspaces com limpeza | **partial** | WorktreeSidebar.tsx:670,672,684,688 |
| D08-011 | Escape no campo de busca (limpa/fecha) | **partial** | WorktreeSidebar.tsx:677-681 |
| D08-012 | Live region + badges de contagem/aviso | missing | WorktreeSidebar.tsx:686; WorktreeVisibilityDialog.tsx:536 |
| D08-013 | Indexação/matching de busca de workspaces | **partial** | WorktreeSidebar.tsx:530,544,551 |
| D08-014 | Projeção de raias sob filtro com totais | missing | folder-workspace-lanes.ts:53 (unreachable) |
| D08-015 | Menu de configurações do board + sync toggle | missing | ui-slice-preference-actions.ts:259; workspace-status.ts:58 |
| D08-016 | Mover/remover status com migração | missing | ui-slice-preference-actions.ts:239; workspace-statuses.ts:1 |
| D08-017 | Adicionar status com ID único | missing | workspace-statuses.ts:143; feature-interaction-catalog.ts:72 |
| D08-018 | Renomear/cor/ícone + persistência + telemetria | missing | ui-slice-preference-actions.ts:239-243; workspace-status.ts:197 |
| D08-019 | Grade virtualizada de raias | missing | package.json (sem @tanstack/react-virtual); useVirtualizedScrollAnchor.ts:10 |
| D08-020 | Hidratação de 1 raia por frame | missing | useVirtualizedScrollAnchor.ts:10 |
| D08-021 | Raia de status (contador, criar, empty) | missing | group-sections.ts:96 (unreachable); WorktreeList.tsx:338,476 |
| D08-022 | Resize de coluna por alça/teclado | missing | workspace-statuses.ts:20-23,237; ui-slice-preference-actions.ts:253 |
| D08-023 | Shift+wheel durante drag | missing | worktree-sidebar-drag-autoscroll.ts:1 |
| D08-024 | Lista virtualizada de cards na raia | missing | package.json; WorktreeList.tsx:326 |
| D08-025 | Layout virtual da raia p/ hit-testing | missing | pointer-drag-dom.ts:18 (unreachable) |
| D08-026 | IDs completos da raia via canal NUL | missing | workspace-status-drag-data.ts:3; WorktreeSidebar.tsx:456 |
| D08-027 | Card de board com WorktreeCard + badge Pinned | missing | worktree-card-surface.tsx:89; WorktreeList.tsx:374 |
| D08-028 | Alvo de drop de pin com feedback | missing | App.tsx:3405; SectionHeader.tsx:273 |
| D08-029 | Projeção/agrupamento/ordenação de worktrees | **partial** | WorkspaceOptionsMenu.tsx:278; WorktreeSidebar.tsx:513,559; WorktreeList.tsx:338 |
| D08-030 | Criar worktree do board com status pré-set | missing | App.tsx:4055; worktree-helpers.ts:200; SidebarHeader.tsx:56 |
| D08-031 | Multi-seleção de cards com re-ancoragem | missing | use-worktree-card-controller.ts:196; WorktreeList.tsx:374 |
| D08-032 | Seleção por área (marquee) com threshold | missing | use-worktree-card-controller.ts:190 |
| D08-033 | Auto-scroll na seleção por área | missing | worktree-sidebar-drag-autoscroll.ts:1 |
| D08-034 | Retângulos/hit-testing sem re-render | missing | WorktreeList.tsx:326 |
| D08-035 | Commit/cancel da seleção por área | missing | WorktreeSidebar.tsx:300 (click-outside do menu) |
| D08-036 | Pointer drag de cards com threshold 5px | missing | use-worktree-card-controller.ts:190; WorktreeSidebar.tsx:442 |
| D08-037 | Preview de drag + multi-drag com badge | missing | worktree-card-surface.tsx:89; worktree-card-model.ts:60 |
| D08-038 | Alvo de drop, gaps e linha indicadora | missing | worktree-sidebar-header-drop-preview.ts:1; SectionHeader.tsx:273 |
| D08-039 | Índice de drop sob filtro → lista cheia | missing | WorktreeSidebar.tsx:544-558 |
| D08-040 | Drop sidebar → Kanban com grupos | missing | WorktreeSidebar.tsx:442; project-header-drop.ts:1 |
| D08-041 | DnD nativo HTML5 no Kanban | missing | workspace-status-drag-data.ts:3 (0 callers); WorktreeSidebar.tsx:456 |
| D08-042 | Reordenar/mover/fixar com switch p/ manual | **partial** | WorktreeSidebar.tsx:449; App.tsx:1922,3135,3405; worktree-manual-order.ts:161,240 |
| D08-043 | Sync de status de tarefa + toasts | missing | runtime-linear-client.ts:57; runtime-linear-project-client.ts:220 |
| D08-044 | Motor de sync Linear (fila, normalização) | missing | runtime-linear-client.ts:202; (sem mutação de issue) |
| D08-045 | Requisição de sync sem no-ops | missing | ui-slice-preference-actions.ts:259; constants.ts:289 |

## Detalhe das 5 linhas `partial`

### D08-010 — Campo de busca de workspaces (partial)
Existe e está ligado: input controlado com `onChange` imediato (`WorktreeSidebar.tsx:670`), ícone
`Search` (`:672`), placeholder `Filter projects and workspaces...` (`:684`), botão de limpeza com
`aria-label="Clear filter"` condicionado a texto (`:688`).
Faltam: preservação de foco no clear (`onMouseDown.preventDefault()` + refocus), cálculo de
`overlayReserve` para o contador, e a superfície do header do board.

### D08-011 — Escape no campo de busca (partial)
`WorktreeSidebar.tsx:677-681`: se há texto, limpa; se vazio, faz `blur()`.
Faltam: guard de IME (`nativeEvent.isComposing`), fechar o painel quando o campo já está vazio
(aqui apenas desfoca) e `stopPropagation` para evitar duplo acionamento.

### D08-013 — Matching da busca (partial)
`WorktreeSidebar.tsx:530-560`: compara `branch`, `displayName`, `path` e `title`/`agentName` das
sessões, sem debounce.
Faltam: `useDeferredValue`, política de indexação board-only (só texto impresso no card), guarda de
tamanho (`isWorktreePaletteQueryTooLarge`) retornando `null`, chave host-qualified
(`composeWorktreeHostIdentity`), estabilidade de referência de `matchingWorktreeIds` e reset da
query ao fechar a superfície.

### D08-029 — Projeção/agrupamento/ordenação (partial)
Ligado: filtros de visibilidade e modos de ordenação `name`/`recent`/`agent-activity`
(`WorktreeSidebar.tsx:559-600`), opções expostas em `WorkspaceOptionsMenu.tsx:278-294`, projetos
fixados primeiro (`WorktreeSidebar.tsx:513-522`).
Faltam: agrupamento em raias por status (a opção `Status` só altera indentação —
`WorktreeList.tsx:338`; o emissor de headers de status em `group-sections.ts:96` está morto),
ordenação manual por `manualOrder` (`worktree-manual-order.ts` sem callers),
`boardDragGroups`/`buildUnambiguousWorktreeIdIndex` e identidade ativa host-qualified do board.

### D08-042 — Reordenar/mover/fixar (partial)
Ligado: drop reordena worktrees dentro do projeto (`WorktreeSidebar.tsx:449-458`) e persiste a ordem
em `localStorage` (`App.tsx:1922-1935`); `Pin`/`Unpin` no menu de contexto (`App.tsx:3405` →
`togglePinWorktree` `App.tsx:3135`) com badge no card (`WorktreeList.tsx:374`).
Faltam: movimentação de status (`moveWorktreeToStatus`/`moveWorktreesToStatus` — nenhuma mutação de
`workspaceStatus` existe: `src-tauri/src/**` não tem `workspace_status` e o único uso no store é o
payload de criação, `worktree-create-payload.ts:79`), pin em lote, comutação automática para
ordenação manual (`buildManualOrderUpdatesForGroupDrop`/`shouldWriteManualOrderForGroupDrop` em
`worktree-manual-order.ts:161,240` estão sem callers), sync Linear e telemetria `workspace-board-actions`.

## Cross-walk `[PAR-*]`

Spec: `/home/renan/src/vault/70-Specs/hydra/Spec - Paridade Terminal e Left Sidebar Orca.md`.

- `[PAR-14]` Gaveta de Quadro Kanban de Workspaces (`WorkspaceKanbanDrawer`) — linhas `329-332`;
  cobre **as 45 linhas** de D08 → `hydra_status: missing` (nenhum `WorkspaceKanbanDrawer.tsx`).
- `[PAR-88]` Drag & Drop Bidirecional entre Lista da Sidebar e Gaveta Kanban — linhas `494-497`;
  cobre `D08-002`, `D08-040`, `D08-041` → `hydra_status: missing`.

Itens `PAR-*` de `TabBar` (PAR-28, PAR-89, PAR-90, PAR-91) ficam fora do escopo do sidebar.
`[PAR-08]` (multi-seleção na sidebar) não foi reivindicado por D08 porque a linha de board
`D08-031` descreve a seleção **dentro do Kanban**; a seleção da lista pertence aos domínios de
lista/drag (D03b/D06).

## Nota de completude

Toda evidência é `arquivo:linha` do working tree atual do Hydra. Nenhuma linha do `.orca.json`
ficou sem veredito; não há veredito `unknown`. Nenhum arquivo de código do Hydra ou do Orca foi
alterado.
