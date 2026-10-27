# Falsificação por runtime — census v2/v3/v4 × inventário

Escopo desta fase: **runtime (ground truth)**. Confronta as affordances/menus/store-API **realmente
observados no app Orca** (census Playwright) contra as linhas de `domains/*.orca.json`. Fonte levantada
apenas para classificar falso-positivo (qual superfície real o rótulo pertence). Nenhum arquivo do
inventário ou de código foi editado.

Referência de fronteira: `PROTOCOL.md` — o inventário cobre o **sidebar esquerdo do Orca** e tudo
alcançável a partir dele. Título de janela, barra de status, painel direito (Explorer/checks/source
control), menus do terminal e cards flutuantes do app estão **fora** do escopo por definição.

## Contagens auditadas

| item | valor |
|---|---|
| labels de runtime únicos verificados pelo crosscheck | 94 |
| — labels de DOM (`static_all`, `static_sidebar`, `hover_cards`, `surface_sweep`) | 67 |
| — labels de menu (`*/menu`, `*/submenu:*`) | 29 |
| — labels de `keyboard_probe` | 23 |
| affordances brutas census-v2 `static_all` | 72 |
| affordances brutas census-v3 `static_sidebar` | 34 |
| affordances brutas census-v3 `surface_sweep` | 11 superfícies × 32–34 |
| hover cards (v2 2×83 / v3 2×34) | 4 |
| menus de contexto de card capturados (v2 `card_context_menu`, v3 idem, v4 `card_context_with_submenus`) | 11 itens top-level + 11 alvos de submenu |
| submenu com conteúdo realmente capturado | 1 (`Open in` → 3 itens) |
| menus de footer/header com conteúdo real (v2 `all_sidebar_buttons` 4, v3 `header_actions` 4) | 8 |
| `keyboard_probe` (v2 8 / v3 7) | 15 |
| store API (census-v3 `store_api`) | 1165 chaves, 729 ações |
| rótulos sem cobertura no crosscheck | 52 → **52 falso-positivos, 0 escapes** |
| escapes encontrados via store API | **1** |

## Método

1. `FALSIFICATION.md` lido integralmente.
2. `ledger/runtime-crosscheck.json` (94 rótulos) usado como ponto de partida; cada um dos 52
   `uncovered_items` foi reclassificado com **duas** checagens independentes:
   - **posição/atributo no census**: `box` (x/y) em `static_all`/`static_sidebar` separa sidebar
     esquerda (x<280, y 40–1200) de título (y<40), status bar (y≥1177), painel direito (x≥1560) e
     área flutuante inferior direita;
   - **busca no inventário** (normalizada, sobre `capability`+`surface`+`trigger`+`behaviors`+`orca_evidence`+`tests`)
     e, quando o rótulo não bate literalmente, busca por **comportamento** (ex.: `Orca Mobile` → D01-024,
     `File Manager` → D04a-028).
3. Menus: v2/v3 `card_context_menu`, v2 `all_sidebar_buttons`, v3 `header_actions`,
   v4 `card_context_with_submenus` (topLevel + submenus), `card_workspace_options`, `footer_settings`,
   `footer_help`.
4. Store API: cada ação com efeito visível no sidebar foi confrontada com o inventário.

## 1. Affordances do sidebar esquerdo — cobertura

Todas as affordances de **sidebar esquerdo** presentes no census estão cobertas:

| affordance (census) | step | linha(s) do inventário |
|---|---|---|
| Search worktrees and browser tabs | `static_all`, `static_sidebar` | D01-016 |
| Tasks + Open GitHub tasks + Open Jira tasks | `static_all`, `static_sidebar` | D01-018, D01-019 |
| Automations | `static_all`, `static_sidebar` | D01-023 |
| **Orca Mobile** (rótulo capturado: `Orca MobileNew` — badge “New” concatenado) | `static_all`, `static_sidebar` | **D01-024** |
| View activity | `static_all`, `static_sidebar` | D01-008 |
| Workspace options | `static_all`, `static_sidebar` | D07-010, D07-011, D07-012, D07-013 |
| Add project / New workspace | `static_all`, `static_sidebar` | D01-011, D01-012, D02a-020, D02a-026 |
| Worktrees (container) | `static_all`, `static_sidebar` | D01-006, D01-016, D03a-027 |
| Header de repo (`data-repo-header-*`) | `static_all`, `static_sidebar` | D01-047, D03a-027, D03a-076 |
| Project actions for {repo} | `static_all`, `static_sidebar` | D03a-046, D03a-084 |
| Create new worktree for {repo} (`data-repo-header-action`) | `static_all`, `static_sidebar` | **D11-004** (estado/tooltip/disabled), D01-014/015 |
| Card surface (`data-worktree-card-surface`) | `static_all`, `static_sidebar` | D04a-001 |
| Mark as unread (botão no card) | `static_all`, `static_sidebar`, `header_actions` | D04a-024, D07-020 |
| Título do card (`data-worktree-title-inline-rename`) | `static_all`, `static_sidebar` | D04b-010 |
| Settings / Help (footer) | `static_all`, `static_sidebar` | D01-030, D01-034, D01-035, D01-036 |
| Reveal active workspace | `static_all`, `static_sidebar` | D01-031 |
| Workspace board (botão footer) | `static_all`, `static_sidebar` | D01-032 |
| “Workspace board moved to the bottom bar” (tooltip) | `static_all`, `static_sidebar` | D01-033 |

O `surface_sweep` (11 superfícies: `groupBy_repo|none|project`, `sort_smart|recent|manual`,
`view_agents|terminal`, `board_open|menu|close`) devolveu o mesmo conjunto de ~32–34 affordances; não
apareceu nenhuma affordance de sidebar nova além das acima.

## 2. Menus e submenus

| item de menu (census) | step | linha(s) |
|---|---|---|
| Update / Copy Path / Pin / Mark Read·Mark Unread / Rename | `card_context_menu`, `all_sidebar_buttons`, `header_actions`, `keyboard_probe`, `card_context_with_submenus` | D04a-024, D07-020 |
| Move to Status (submenu) | idem | D04a-027 |
| Open in (submenu) | idem | D04a-028 |
| VS Code / File Manager (itens do submenu `Open in`) | `card_context_with_submenus/submenus[2]` | **D04a-028** (lista `openInApplications` + `getLocalFileManagerLabel` — itens são dinâmicos) |
| Customize apps… | idem | D04a-028 |
| New group from project | idem | D04a-025, D03a-046 |
| Set Parent Worktree… / Set Parent Worktree... | idem | D04a-025, D15b-008, D15b-009 |
| Sleep (+ tooltip “Close all active panels…”) | idem | D04a-026 |
| Delete Worktree (disabled p/ primário) + tooltip “Primary worktree — can’t be deleted…” | idem | D04a-026, D07-028, D07-029 |
| Remove Project from Orca | idem | D04a-026 |
| Workspace board / “Workspace board moved to the bottom bar” | `card_workspace_options`, `footer_*` | D01-032, D01-033 |

Nenhum item de menu de sidebar ficou sem linha. Os únicos itens sem linha correspondente são os do
**menu de contexto do painel de terminal** (ver falso-positivos).

## ESCAPES

| # | item (comportamento) | evidência runtime (census) | evidência Orca `arquivo:linha` | por que o inventário não cobre | domínio que deveria cobrir |
|---|---|---|---|---|---|
| E1 | **Ações por-linha da lista de Agentes do sidebar esquerdo**: (a) alternância lido/não-lido — “Mark thread as read” / “Mark thread unread”; (b) “Clear notification” (limpar uma thread concluída individualmente) | `runtime/census-v3.json` → `steps.store_api.actions` contém `acknowledgeAgents`, `unacknowledgeAgents`, `applyActivityClearedAt` e `dismissRetainedAgents` (729 ações) | `components/sidebar/SidebarAgentsList.tsx:159-160` (`onMarkThreadRead={markThreadRead}` / `onMarkThreadUnread={markThreadUnread}`); `components/activity/activity-thread-actions.ts:69-75` (`markThreadRead`→`acknowledgeAgents`, `markThreadUnread`→`unacknowledgeAgents`); `components/activity/activity-thread-row.tsx:190-207` (`aria-label` “Mark thread as read” / “Mark thread unread”) e `:170-183` (botão “Clear notification” → `onClear`); `components/activity/activity-thread-virtual-row.tsx:65` (`onClear={isClearableActivityThread(...) ? clearActivityThread : undefined}`); `components/activity/activity-clear-completed.ts:118-126` (`clearActivityThread` → `applyActivityClearedAt` + `dismissRetainedAgents`) | D05-001 cita o `ActivityThreadListPane` só como “selecionar uma linha revela o painel” e sua evidência **para em `SidebarAgentsList.tsx:138`** — não alcança as linhas 159-160; D05-004 cobre apenas o menu de opções (marcar **todos** como lidos / limpar concluídos em lote); `grep` nos 16 `domains/*.orca.json` por `Mark thread`, `thread as read`, `Clear notification`, `ActivityThreadRow`, `activity-thread`, `applyActivityClearedAt` → **0 ocorrências** | **D05-agents-rows** |

Observação de escopo (para não superdeclarar): `showJumpAction={false}` na instância do sidebar oculta
apenas “Jump to workspace”, que portanto **não** entra como escape. O botão de “Clear notification” e o
sino de lido/não-lido **são** renderizados no sidebar (o primeiro via `onClear` condicionado a
`isClearableActivityThread`, o segundo incondicionalmente em `activity-thread-row.tsx`).

## FALSO-POSITIVOS (52 rótulos sem cobertura do crosscheck)

Todos os 52 vêm de varreduras que capturaram a **janela inteira** (`static_all`), a **barra de
status/painel direito** (que o seletor de “sidebar” do v3 acabou incluindo), o **menu do terminal** ou
**texto dinâmico concatenado**. Panorama por origem:

| origem | rótulos | razão |
|---|---|---|
| Título de janela (`y<40`) | Minimize, Maximize, Go back, Go forward | Controles de janela/navegação do chrome superior. `app-shell/WindowControls.tsx:25,37`; `app-shell/TitlebarLeftControls.tsx:121,138`. Fora da fronteira. |
| Barra de status (`y≥1177`) | Refresh rate limits, Keep computer awake, Off · Inactive, Resource Manager, 0 terminal sessions, Notifications alt+T | `components/status-bar/StatusBarSurface.tsx:227`; `status-bar/CaffeinateStatusSegment.tsx`; `status-bar/ResourceUsageStatusSegment.tsx`; `status-bar/PortsStatusSegment.tsx`. Fora da fronteira (o `Notifications` é uma `<section>` de altura 0 em y=1200). |
| Painel direito / Explorer (`x≥1560`) | Explorer (Ctrl+Shift+E), Explorer search mode, Filter files by name, Search file contents, Find files, Search files, Match Case, Match Whole Word, Use Regular Expression, More Explorer Actions, Refresh Explorer, Collapse All, Source Control (Ctrl+Shift+G), files to include (…), files to exclude (…) | `components/right-sidebar/FileExplorerToolbar.tsx:69,103,140`, `FileExplorerViewSwitch.tsx:30`, `FileExplorerRow.tsx:139`. Painel direito, não sidebar esquerdo. |
| Card flutuante do app (canto inferior direito, `x≈1860,y≈1092`) | Show floating workspace | `components/floating-terminal/FloatingTerminalToggleButton.tsx:214,230` (`data-floating-terminal-toggle`). Fora da fronteira. |
| Menu de contexto do **terminal** (`keyboard_probe`) | Clear Screen, Copy Context, Copy Pane ID, Copy Terminal ID, CopyCtrl+Shift+C, Fork Agent Session…, PasteCtrl+V, Quick Commands, Select AllCtrl+Shift+A, Set Title…, Split Terminal DownAlt+Shift+D, Split Terminal RightCtrl+Shift+D | `components/terminal-pane/TerminalContextMenu.tsx:222,328,333,351` (+ `native-chat/use-native-chat-context-menu.tsx`). O `ContextMenu`/`Shift+F10` do probe foi disparado com o foco no painel de terminal, não no sidebar. Os rótulos com atalho colado (`CopyCtrl+Shift+C`) são label+shortcut concatenados. |
| Arquivos do Explorer (`dynamic`) | .gitignore, CLAUDE.md, README.md, package.json | `FileExplorerRow.tsx` — nomes de arquivo do repositório de fixture, dinâmicos. |
| Texto dinâmico concatenado de card/repo | Activemasterprimarymaster, Inactivee2e-secondarye2e-secondary, Inactivemasterprimarymaster, master, src.gitignoreCLAUDE.mdpackage.jsonREADME.md, orca-e2e-repo-26neOz, orca-e2e-repo-26neOzInactivemasterprimarymasterInactivee2e-secondarye2e-secondary, orca-e2e-repo-m2AEyd, orca-e2e-repo-m2AEydActivemasterprimarymasterInactivee2e-secondarye2e-secondary | São `textContent` agregado de containers (`Active/Inactive` + nome do card + branch `master` + host `primary` + release `e2e-secondary`) e nomes de repositório da fixture (`orca-e2e-repo-<id>`). Não são rótulos de affordance; o comportamento subjacente (card, header de repo, label de branch) está coberto por D04a-001/D04a-008/D03a-027/D01-047. |
| Item de submenu dinâmico | VS Code, File Manager | `Open in` → itens gerados de `openInApplications` + `getLocalFileManagerLabel`; cobertos por **D04a-028**. |
| Botão de nav do sidebar com badge colado | Orca MobileNew | `Orca Mobile` coberto por **D01-024**; o crosscheck falhou por concatenar o badge “New” (`data-state`/badge). |

Legenda das razões: **fora-da-fronteira** (título/status bar/painel direito/terminal/flutuante),
**dinâmico** (nome de repo/arquivo/branch ou texto agregado), **coberto-semântico-badge** (linha existe,
rótulo não bateu literalmente).

### Nota sobre casamentos espúrios do crosscheck (inflam “coverage”)

O crosscheck casa por substring/palavras, então alguns rótulos **fora de escopo** aparecem como
“cobertos” por linhas de outro assunto. Não são escapes (a superfície é fora da fronteira), mas ficam
registrados para não dar falsa sensação de cobertura:

- `Ports, 0 workspace ports` (status bar, `x=1875,y=1179`) casou com **D04a-023**, que descreve o popover
  de portas **do card de worktree** (`WorktreeCardPorts`) — superfícies diferentes
  (`status-bar/PortsStatusSegment.tsx` ≠ card).
- `Application menu` (título, `x=39,y=7`) casou com **D04a-028** (`app-shell/…`), por partilha das
  palavras “application/menu”.
- `Close` (controle de janela) casou com D01-029/D01-032/D02a-001.
- `src` (linha do Explorer, `x=1571`) casou com **D12-004/006/008** (markdown do sidebar).
- `Checks` casou com D02a-038/D04a-020; o rótulo é a aba **Checks do painel direito**.
- `Create new worktree for {repo}` casou com D04a-021/D07-026/D11-010/D15b-001 (casamento fraco); a
  cobertura real é **D11-004** (+ D01-014/015).

## Limitações do census (o que ele NÃO prova)

Registrado para não confundir ausência de evidência com evidência de ausência:

1. **`card_sections` (v3)**: `[data-worktree-agents]`, `[data-agent-send-target]`,
   `[data-review-menu-open]`, `[data-worktree-unread-alert]` → **`missing: true`**. O census não tinha
   agente/PR/unread ativos, então não exercitou essas sub-superfícies do card. Não falsificável aqui.
2. **Menus de footer (v4)**: `footer_settings.menus`, `footer_help.menus` e
   `card_workspace_options.menus` contêm o **mesmo snapshot da janela inteira** (listbox da lista de
   worktrees + menu de contexto do card + submenu `Open in`), não o menu declarado. Ou seja,
   `seen_in: footer_*/menu` é artefato do seletor — **não** significa que “File Manager”/“VS Code”
   aparecem no menu de Settings/Help.
3. **`dialog_add_project` / `dialog_new_workspace` (v4)**: `action: "no-button:Add project"` /
   `"no-button:New workspace"` — o clique **não** abriu os diálogos; os `dialogs` capturados são o
   snapshot genérico. Os diálogos (cobertos na fonte por D02a) **não** foram exercitados pelo runtime.
4. **Submenus (v4)**: apenas `Open in` teve conteúdo próprio capturado (`VS Code`/`File Manager`/
   `Customize apps...`). Os demais alvos (`Move to Status`, `Set Parent Worktree…`, `Sleep`) recapturaram
   o documento inteiro — a lista de status do Kanban, o parent picker e o submenu de hibernação **não**
   foram observados no runtime.
5. **Modo Agents do sidebar** nunca foi renderizado nos censi (a lista ficou em modo Workspaces), por
   isso o E1 só é detectável via `store_api` — sem affordance de DOM correspondente.

## Veredito

**INVENTÁRIO FALSIFICADO — 1 escape.**

- Escapes de **DOM/menu**: 0. As 67 labels de DOM e 29 labels de menu foram reconciliadas; as 52 sem
  cobertura literal são integralmente falso-positivos (fronteira ou valor dinâmico) — 0 escapes.
- Escapes via **store API**: 1 (E1 — ações por-linha da lista de Agentes do sidebar: alternância
  lido/não-lido `acknowledgeAgents`/`unacknowledgeAgents` e “Clear notification”
  `applyActivityClearedAt`/`dismissRetainedAgents`; ausentes de todas as linhas e do manifest de D05).

Buscas realizadas para sustentar o veredito (todas retornando 0 ocorrências no inventário):
`Mark thread`, `thread as read`, `Clear notification`, `Jump to workspace`, `ActivityThreadRow`,
`activity-thread`, `markThreadUnread`, `markThreadRead`, `unacknowledgeAgents`, `markAllThreadsRead`,
`applyActivityClearedAt`, `dismissRetainedAgents`, `clearedAt`;
e as buscas de fechamento `Orca Mobile` (→ D01-024), `Open in`/`VS Code`/`File Manager` (→ D04a-028),
`Create new worktree` (→ D11-004), `Project actions` (→ D03a-046/D03a-084).
