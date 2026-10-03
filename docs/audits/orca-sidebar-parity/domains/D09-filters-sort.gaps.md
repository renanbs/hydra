# D09-filters-sort — Fase 2 (veredito Hydra)

Domínio: `D09-filters-sort` (31 linhas Orca).
Fonte Hydra: `/home/renan/orca/workspaces/hydra/ondine` (React 19 + Tauri v2).
Mount do sidebar: `src/App.tsx:3636` → `src/components/sidebar/WorktreeSidebar.tsx` (depth 0 na árvore
de imports: `App.tsx:13-21` importa o componente e `SidebarHeader.tsx`/`WorktreeList.tsx`/`SidebarAgentsList.tsx`
são seus filhos diretos de render).

## Contagens

| veredito | linhas |
|---|---|
| parity | 0 |
| **partial** | **24** |
| **missing** | **7** |
| not-applicable | 0 |
| out-of-scope | 0 |

Linhas Orca cobertas: **31/31** (cada id exatamente uma vez).

## Achado estrutural: dois sistemas paralelos de filtro/ordenação

O Hydra tem **duas** implementações coexistentes do mesmo subsistema, e a que está montada não é a que
foi escrita como "parity Orca":

1. **Caminho montado (render)** — `WorktreeSidebar.tsx`:
   - filtro de UI em `WorkspaceOptionsMenu.tsx` (menu artesanal, não Radix), estado em
     `displayOptions` (prefs persistidas por `notifyPrefs` → `App.tsx:468`);
   - aplicação do filtro em `WorktreeSidebar.getFilteredAndSortedWorktrees` (`:534-600`), que só aplica
     `hideDefaultBranch` e `hideDetachedHead`;
   - ordenação: `agent-activity` via `src/lib/smart-attention.ts`, `name` via
     `(displayName||branch).localeCompare`, `recent` via `created_at` desc.
2. **Caminho "Orca port" (store/Zustand)** — `src/components/sidebar/visible-worktrees.ts` +
   `smart-sort.ts` + `sidebar-filter-actions.ts` + `project-filter-reveal.ts`, alimentado por
   `useAppStore` (`showSleepingWorkspaces`, `filterRepoIds`, `alwaysShowDefaultBranchWorkspace`, …).
   Esse caminho só é exercido para **publicar a ordem de Cmd+1-9** (`WorktreeList.tsx:241-247` publica a
   ordem renderizada; `getVisibleWorktreeIds()` cai nele apenas com o sidebar desmontado).

Consequência: várias linhas têm a **regra portada com fidelidade, porém sem efeito no sidebar montado**, e
outras têm a UI sem a regra. Nenhuma linha chega a `parity`.

Agravante: `src/components/sidebar/smart-attention.ts` é um **stub** (`IDLE`/`WorktreeAttention`/
`buildAttentionByWorktree`/`hasFreshAttributedAgentStatus` exportados como `null`/`any`, linhas 20-26),
e é exatamente de onde `smart-sort.ts:197/205` importa — o warm e o cold start do smart sort lançam
`TypeError` se alcançados. A atenção de verdade mora em `src/lib/smart-attention.ts`.

Obs.: os índices `index/hydra_wiring.json`/`hydra_scope.json` marcam como "unreachable" arquivos que são
claramente alcançáveis (ex.: o próprio `WorktreeSidebar.tsx`, `project-filter-reveal.ts` via
`worktree-activation.ts`, `agent-finished-timestamp.ts` via `CompactAgentRow`). Os vereditos abaixo foram
refeitos por rastreio manual de imports/uso, conforme o protocolo.

## Top gaps (por impacto)

1. **`FilterToggleRow` + `SidebarFilter` não existem** (D09-001/002/003/004/010): não há componente de linha
   de filtro com `role='switch'`/`aria-checked`, nem badge de contagem de filtros ativos, nem tooltip
   dinâmico, nem rodapé `Reset filters`/`Add project`. Os toggles atuais são `<div onClick>` inline.
2. **Filtros que não filtram** (D09-005/007/017): `Hide sleeping`, `Hide automation-created` e
   `Hide CLI-created` existem, persistem e não produzem efeito no caminho renderizado (só o módulo morto
   `worktree-list/buildSidebarRows.ts` os aplica). `Hide other-client workspaces` não tem UI nenhuma.
3. **Smart sort inoperante** (D09-026/031): `buildAttentionByWorktree`/`hasFreshAttributedAgentStatus` são
   `null`; o pipeline de ordenação inteligente existe só como texto.
4. **Ordem de classes divergente** (D09-022): Hydra ranqueia `Working` acima de `Done` (classes 2/3
   invertidas vs Orca) e ignora heurísticas de título (`permission`/`working`). O frescor de 30min e o
   `stale→unknown/idle` são delegados ao Rust (`src-tauri/src/agent_state.rs:63-75`).
5. **Nada de teclado no filtro de projetos** (D09-015): sem Backspace/Enter/ArrowLeft, sem navegação por
   destaque, sem isolamento do typeahead — só Escape.
6. **Auto-revelação desconectada** (D09-018): `revealRepoInProjectFilter` é port fiel, mas muta
   `store.filterRepoIds` enquanto o sidebar renderiza `displayOptions.filterProjectIds`, e o módulo
   chamador (`worktree-activation.ts`) não tem consumidor de produção.
7. **Regras puras órfãs** (D09-019/020): `sidebarHasActiveFilters` e `computeClearFilterActions` são port
   fiel e **não têm consumidor** — não existe UI de "limpar filtros".
8. **Sub-filtro de exceção ausente** (D09-006): não existe a linha condicional "Except default branch" nem
   exposição de `alwaysShowDefaultBranchWorkspace`.
9. **Timers/atalhos**: o port do foco por `requestAnimationFrame` (D09-012) virou `autoFocus`, sem
   `cancelAnimationFrame` nem reset da query; o atalho `sidebar.sleepingWorkspaces.toggle` está definido
   (`shared/keybindings/definitions-core-1.ts:241`) e não é exibido nem despachado.
10. **Ordenações ricas fora do render** (D09-028/029/030): `CREATE_GRACE_MS`/`effectiveRecentActivity`,
    labels keyed por referência (anti-colisão STA-4343) e os modos `repo`/`manual` existem no módulo, mas o
    menu só oferece Agent Activity/Name/Recent e o render usa `created_at`.

## Tabela de vereditos

| id | veredito | evidência Hydra (âncora) | faltando (resumo) |
|---|---|---|---|
| D09-001 | partial | WorkspaceOptionsMenu.tsx:403-472 | FilterToggleRow, role=switch/aria-checked, aria-label, onChange |
| D09-002 | missing | WorkspaceOptionsMenu.tsx:403-472 | prop `indented` + pl-7, sub-opções |
| D09-003 | missing | WorkspaceOptionsMenu.tsx:403-472 | shortcutLabel/DropdownMenuShortcut na linha |
| D09-004 | partial | SidebarHeader.tsx:88-110 | badge de contagem, tooltip/aria dinâmicos, ListFilter, data-attr |
| D09-005 | partial | WorkspaceOptionsMenu.tsx:403-415; WorktreeSidebar.tsx:352-355 | efeito de filtro, escrita na store, uso/descoberta do atalho |
| D09-006 | missing | WorkspaceOptionsMenu.tsx:417-429; visible-worktree-kinds.ts:12-28 | linha "Except default branch" + gate |
| D09-007 | partial | WorkspaceOptionsMenu.tsx:417-472; WorktreeSidebar.tsx:537-542 | efeito de automação/CLI, exceção de receita |
| D09-008 | partial | WorkspaceOptionsMenu.tsx:143-260 | cmdk/placeholder/estado vazio, badges repo+SSH, repoId |
| D09-009 | partial | WorkspaceOptionsMenu.tsx:166-174 | "Select all", estado desabilitado |
| D09-010 | missing | WorkspaceOptionsMenu.tsx:384-475 | Reset filters; Add project no rodapé |
| D09-011 | partial | WorkspaceOptionsMenu.tsx:278-302 | modo project-group, onPointerDownCapture, ToggleGroup |
| D09-012 | partial | WorkspaceOptionsMenu.tsx:196-235 | rAF focus, cancelAnimationFrame, reset da query, placeholder |
| D09-013 | partial | WorkspaceOptionsMenu.tsx:176-196 | scroll max-h-16, RepoBadgeLabel truncado, aria-label, preventDefault |
| D09-014 | partial | WorkspaceOptionsMenu.tsx:242-247 | match por path, função de score, ranking |
| D09-015 | missing | WorkspaceOptionsMenu.tsx:206-214 | Backspace/Enter/ArrowLeft/isolation |
| D09-016 | partial | WorkspaceOptionsMenu.tsx:116-127,145-174 | auto-ocultar com ≤1 projeto, props reutilizáveis, badge |
| D09-017 | partial | WorkspaceOptionsMenu.tsx:397-472 | toggle other-client + gate de catálogo remoto |
| D09-018 | partial | project-filter-reveal.ts:1-12; worktree-activation.ts:279 | wiring no mount + átomo de estado correto |
| D09-019 | partial | sidebar-filter-actions.ts:12-26 | consumidor (badge/clear) |
| D09-020 | partial | sidebar-filter-actions.ts:31-67 | consumidor (botão de reset) |
| D09-021 | partial | visible-worktree-host-scope.ts:30-39 | predicado isolado worktreePassesSidebarFilters |
| D09-022 | partial | lib/smart-attention.ts:52-94 | ordem 2/3, heurísticas de título, interrupted-done, cause |
| D09-023 | partial | lib/smart-attention.ts:102-115 | propagação de `cause` |
| D09-024 | partial | shared/agent-completion-time.ts:6-22 | incluir blocked/waiting; consumo pelo resolver |
| D09-025 | missing | lib/smart-attention.ts:33-44 | panes/splits, entriesByTabId, supressão de título |
| D09-026 | missing | components/sidebar/smart-attention.ts:23-24 | buildAttentionByWorktree (stub null) e indexação por aba |
| D09-027 | partial | worktree-activity-state.ts:24-70 | wiring ao cold-start (call-site aponta p/ stub) |
| D09-028 | partial | smart-sort.ts:28-51 | uso no sort Recent renderizado |
| D09-029 | partial | smart-sort.ts:51-92 | uso no sort Name renderizado |
| D09-030 | partial | smart-sort.ts:104-160 | modos repo/manual na UI; consumo no render |
| D09-031 | partial | smart-sort.ts:178-215 | funcionamento (stubs null) e consumo no render |

## Obrigações de cobertura (herdadas do `.orca.json`)

O inventário congelado cobre 100% das obrigações do domínio (`ledger/D09-filters-sort.json`, status `ok`,
0 violações): **files 11/11**, **symbols 31/31**, **tests 150/150**, **labels 13/13**, **hotkeys 18/18**,
**timers 2/2**, **subscriptions 1/1**; `prefs` e `preload` são **N/A** neste domínio (0 entradas no Orca —
o menu de filtros do Orca não lê prefs diretas nem preload; as duas entradas de teste/label marcadas
`INFRA:` estão justificadas no próprio inventário). Nenhuma entrada ficou sem id ou justificativa.

## Cross-walk PAR

- `PAR-26` (Filtro Granular de Projetos no Menu de Opções) → D09-008, D09-009, D09-012, D09-013, D09-014,
  D09-015, D09-016 → `partial` (existe submenu `Show → Projects` com busca/pills/Clear; sem checkboxes de
  repo, sem cmdk, sem teclado, sem score, sem auto-ocultar com 1 projeto).
- `PAR-44` (Auto-revelação de Projeto Oculto por Filtro ao Ativar Worktree) → D09-018 → `partial` (função
  portada; wiring no sidebar montado ausente/átomo errado).
- `PAR-21` (UX de Worktree em Sleep) fica com o domínio de card (D04) — o único elo com D09 é o toggle
  "Hide sleeping" (D09-005), já registrado acima; não duplicado no crosswalk.
