# D04a — Worktree Card Surface (sidebar esquerda): gaps Orca → Hydra

Diff: `domains/D04a-worktree-card-surface.diff.json` (111 linhas, 1 veredito por id).
Sumário: **parity 14 · partial 56 · missing 41 · not-applicable 0 · out-of-scope 0**.

## Método (resumo)

- Mount: `src/App.tsx:3636` → `src/components/sidebar/WorktreeSidebar.tsx` → `WorktreeList.tsx:5,354`
  → `WorktreeCard.tsx:12` → `worktree-card-surface.tsx` → header / meta-row / parent-content / details-hover / agents.
- Regra de ouro aplicada: nenhum arquivo de `index/hydra_unreachable.json` foi usado como prova; auto-stubs com
  cabeçalho `Auto-stub so the Orca port typechecks` (`DEFAULT_WORKSPACE_STATUSES`, `createSetRenamingWorktreeId`,
  `createUpdateWorktreeRemoteBranchConflict`, `MARINE_CREATURES`) foram tratados como NÃO-funcionais.
- Props **sem produtor** foram tratadas como dormentes (no máximo `partial`): `isMultiSelected`, `selectedWorktrees`,
  `hostContextLabel`, `review`, `lineageChildren`, `affiliateListMode`, `renamingWorktreeId`, `conflictOperation`,
  `cacheStartedAt`, `renameRowKey`.
- O `window.api` do Orca **não existe em runtime** no Hydra (`src/types/window-api.d.ts:1-4`): qualquer caminho
  `window.api.*` é degradação silenciosa. O único caminho de clipboard vivo é `navigator.clipboard` (`App.tsx:3402-3404`).

## Contratos de backend do Orca × equivalente Tauri

| Contrato Orca | Equivalente Tauri chamado? | Onde |
|---|---|---|
| `window.api.ui.writeClipboardText` | **NÃO** — só `navigator.clipboard` no menu de contexto; o hook de clipboard (`src/hooks/use-clipboard-text-copy-feedback.ts:65`) não tem consumidor | D04a-036/047 |
| `window.api.shell.openInFileManager` | **SIM** — `invoke('open_in_file_manager')` (`src-tauri/src/lib.rs:242`), chamado em `App.tsx:3112` (menu do card) e `App.tsx:3483` | D04a-056 |
| `window.api.shell.openInExternalEditor` | **SIM** — `invoke('open_in_external_editor')` (`src-tauri/src/lib.rs:256`), chamado em `App.tsx:3107` (menu do card) | D04a-056 |
| `window.api.ssh.connect` / `ssh.listTargets` / `ssh.listRemovedTargetLabels` | **NÃO** — 0 comandos `ssh_*` em `src-tauri/src/**`; 0 call-sites no renderer | D04a-012/013 |

Extras vivos usados pelo card: `scan_workspace_ports` (`lib.rs:584`), `kill_port_process` (`lib.rs:595`),
`set_worktree_display_name` (`lib.rs:505`), `set_worktree_status` (`lib.rs:523`), `delete_worktree` (`lib.rs:476`),
`get_detailed_git_status_cmd` (`App.tsx:1798`), `pr_status` (`lib.rs:410`), `auto_rename_worktree` (`lib.rs:532`).

---

## Crítico (impacto alto × esforço alto)

### G1 — SSH host control e fluxo de conexão não existem (D04a-012, D04a-013, D04a-014, D04a-108)
- Orca: `WorktreeCardSshHostControl` com glifos `Server`/`ServerOff`, pill de Retry/Reconnect, `targetRemoved`,
  `auth-failed`, `iconOnly`, stop de Enter/Espaço, e fluxo `ssh.connect` + resync de targets/labels removidos.
- Hydra: nenhum componente, nenhum comando Tauri, nenhum estado de conexão; `isRuntimeDisconnected` fixo em `false`
  (`use-worktree-card-controller.ts:318`) e o `WorktreeHostContextBadge` nunca recebe `hostContextLabel`
  (`WorktreeList.tsx:354-405`).
- Esforço: alto (modelo de host por worktree + comandos + eventos de estado + roteamento de PTY).
- **Contrato Tauri necessário**: `ssh_connect(worktreePath|hostId)`, `ssh_list_targets`, `ssh_list_removed_target_labels`,
  `ssh_target_status` (ou equivalente de runtime environment) + evento `ssh:connection-state`; e um produtor de
  `hostContextLabel` (`worktree_host`/`local machine label`) no catálogo de worktrees.

### G2 — Diálogo de metadados (issue/review/notas/nome) ausente (D04a-093…D04a-099)
- Orca: `WorktreeMetaDialog` + `WorktreeDisplayNameField` (emoji shortcode) + `WorktreeIssueLinkField`
  (chip GitHub/Linear, `aria-live`, deslocamento de links) + `WorktreeReviewLinkField` + textarea de notas com
  markdown/auto-resize/atalho de submit + `buildWorktreeMetaUpdates` qualificado por host + `worktree-issue-displacement`.
- Hydra: `grep WorktreeMetaDialog` = 0 (só i18n locales); o único caminho de rename é o `PromptDialog` do menu
  (`App.tsx:3332-3361`) e não há vínculo de issue/review/notas.
- Esforço: alto.
- **Contrato Tauri necessário**: `set_worktree_meta(worktreePath, { displayName?, issue?, review?, comment?, executionHostId? })`
  com retorno de deslocamentos (`unlinked`), e resolução/validação de links (`resolve_work_item_link`) com timeout.

### G3 — Fileira de badges de metadados e badges de estado ausentes (D04a-025…D04a-033)
- Orca: `WorktreeCardMetaBadges` (notas/automação/CLI/issue/Linear/Jira/review) + `WorktreeCardMetadataControls`
  (shell de seção/ação com tooltip) + `WorktreeCardMetadataStatusBadges` (estado de issue, Linear, review, checks).
- Hydra: `grep WorktreeCardMetaBadges|MetadataControls|MetadataStatusBadges` = 0 (só i18n); a única derivação viva é
  `pr-display.tsx` (ícone/tom da lane), sem pílulas nem dados de issue/Linear/Jira/notas/automação/CLI.
- Esforço: alto (depende de G2 + projeção de work items).
- **Contrato Tauri necessário**: projeção de work item por worktree (`linked_work_item`, provider github/linear/jira,
  estado, título, url) e disponibilidade de automação (`list_automations`/`list_automation_runs` por target).

### G4 — Menu de contexto do card incompleto (D04a-051, D04a-052, D04a-053, D04a-060, D04a-061, D04a-062, D04a-069)
- O menu existe e funciona (right-click → `WorktreeContextMenu.tsx:19-31` → `App.tsx:3284` → `RadixContextMenu`
  `App.tsx:3915`), com Open in / Copy Path / Pin / Mark Unread / Status / Set Parent / Open Parent / Remove from
  Parent / Developer(Alt) / Sleep / Delete.
- Faltam: `Update` (Hydra usa “Rename Worktree Display Name…” + PromptDialog), “New group from project”,
  “Move to group”, “Remove from group” (só existem no menu do **projeto**, `App.tsx:3217-3236`), ações Git remotas
  (`Open on GitHub` / `Create Pull Request` — PAR-27, 0 hits), escopo por atributo + isenção de conteúdo portaled,
  `CLOSE_ALL_CONTEXT_MENUS_EVENT`, supressão de clique fantasma (≤500 ms), escopo multi-worktree, estado pendente
  (“Deleting…”), badge do atalho `workspace.delete` e toast com “Re-add”.
- Esforço: médio (é sobretudo UI de menu; os comandos `delete_worktree`/`set_worktree_status` já existem).
- **Contrato Tauri necessário**: `open_external_url_cmd` já existe para “Open on GitHub”/compare URL; o resto é frontend.

### G5 — Estado de exclusão in-place preso (D04a-003, D04a-069)
- `isDeleting` é `useState` local (`use-worktree-card-controller.ts:134`), setado em `:241` e **nunca resetado**:
  cancelar/falhar o diálogo deixa o card com overlay “Deleting workspace…” permanente.
- Orca deriva o estado da store de deleção (`deleteStateByWorktreeId`) e publica toasts de sucesso/falha com
  retry/“View changes” (PAR-86; ver D04b-004).
- Esforço: baixo para o reset; médio para o contrato de eventos.
- **Contrato Tauri necessário**: evento `worktree:delete-state` (queued/failed/done) + toast com ação “Re-add”.

---

## Alto (impacto alto × esforço médio)

### G6 — Hover de detalhes reduzido e com bug de propagação (D04a-037, D04a-038, D04a-039, D04a-040, D04a-041, D04a-042, D04a-043, D04a-044, D04a-045, D04a-046, D04a-047, D04a-048, D04a-049)
- Existe: cabeçalho (título/branch/projeto/copiar branch), Live Ports, seção Pull Request (badge+título), Path/copiar.
- Falta: `SelectedTextCopyMenu`, seções issue/Linear/Jira/notas/automação/CLI, shells de seção, `dismissAndRun`,
  `closeHover`, `identityOrder`, título editável no painel, pré-carregamento de markdown e o **stop de propagação
  dentro do popover** — hoje o botão “Copy” do path (`WorktreeCardDetailsHover.tsx:272-288`) borbulha para o
  `onClick` do card e ativa o worktree.
- Esforço: médio para o bug de propagação (baixo); alto para as seções (depende de G2/G3).

### G7 — UX de não-lido incompleta (D04a-021, D04a-022, D04a-023)
- Falta o overlay de alerta na lane (`data-worktree-unread-alert`), o `· Unread` no texto acessível e o botão de
  sino lido/não-lido do estilo legado (PAR-74). `FilledBellIcon` existe sem consumidores.
- Alternância viva hoje: menu de contexto (`App.tsx:3406`) e limpeza ao ativar (`App.tsx:1856`).

### G8 — Multi-seleção inexistente (D04a-002, D04a-052, D04a-065 — PAR-08)
- `isMultiSelected`/`selectedWorktrees` são plumbing sem produtor; sem `Ctrl/Shift`, sem menu multi-contexto,
  sem ações em lote (Sleep/Delete/Remove from Parent em lote).

### G9 — Caminho de atalho do rename e dispatcher de keybindings mortos (D04a-015, D04a-069)
- `renamingWorktreeId` é estado local nunca preenchido; `createSetRenamingWorktreeId` é auto-stub
  (`worktree-slice-lookups.ts:15`); `workspace.delete`/`workspace.rename` existem em
  `src/shared/keybindings/definitions-core-1.ts:84` mas `matchKeybinding` não é chamado fora do módulo de
  keybindings → as keybindings são apenas rótulo.
- Esforço: baixo (frontend).

### G10 — Lista de agentes sem modo completo, subagentes, envio e estados de leitura (D04a-079, D04a-080, D04a-084, D04a-085, D04a-086, D04a-088, D04a-089, D04a-090, D04a-091)
- Existe: lista compacta com resumo colapsável, primário/secundário, modelo, horário, tick de 30 s.
- Falta: linhas completas (`DashboardAgentRow`) com `role=group/tree` + `aria-label Agents`, projeção de subagentes
  aninhados (PAR-66), modo de envio a agente (`agentSendPopoverTargetMode` na store sem consumidor), linhas retidas
  inertes, destaque/dispensa de não visitadas, supressão de scroll + reveal por rAF (D04a-088) e retenção da última
  mensagem por turno (D04a-091), além da ordem/vocabulário de estados do Orca (D04a-089).

### G11 — Status do workspace: lista fixa × statuses configurados (D04a-054)
- O submenu usa 5 rótulos hardcoded (`blocked/waiting/working/done/idle`) + Clear, enquanto o modelo canônico
  compartilhado é auto-stub (`src/shared/workspace-status-defaults.ts:3`). `set_worktree_status` grava texto livre.
- Esforço: médio (config de status + migração de valores gravados).

### G12 — Review/PR: sonda única github, sem supressão/fallback/checks (D04a-032, D04a-033, D04a-101, D04a-103 — PAR-87)
- `prByPath` é preenchido por uma sondagem `pr_status` por repo/branch (`App.tsx:2005-2049`) e a lane mostra o glifo.
- Faltam: supressão de PR do GitHub, fallbacks “Loading PR/MR…”, provedores gitlab/bitbucket/azure-devops/gitea,
  validação de PR merged por head, popover de checks e badges de estado/checks.

---

## Médio

### G13 — Tooltips nativos em vez de tooltip do design system (D04a-011, D04a-018, D04a-073, D04a-076 — PAR-34)
- Título do card e labels usam `title=`; a medição de truncamento existe só para labels do meta row
  (`truncated-sidebar-label.tsx:4`, usada em `worktree-card-meta-row.tsx:66-85`), não para o título. Isso também
  torna impossível a prévia mono do badge `sparse` (D04a-018).

### G14 — Menu de exibição sem propriedades do card (D04a-109, D04a-110)
- Existe o menu de opções (`WorkspaceOptionsMenu`, montado em `WorktreeSidebar.tsx:847`) com Show/Projects, Group by,
  Sort by, Card display e Filtros. O submenu “Card display” mostra só “Detailed” + nota apontando
  Settings → Appearance; faltam checkboxes de propriedades, contagem, “Agent activity layout” e o radio legado
  `setWorktreeCardMode`.

### G15 — Ações de porta incompletas (D04a-034, D04a-036)
- Existe: abrir no browser (`window.open`, `WorktreeCardDetailsHover.tsx:223`), encerrar (`kill_port_process`) e
  refresh por CustomEvent. Faltam: copiar endereço, toasts, abertura por modificador/atalho de sistema,
  gate `canStopWorkspacePort`, `recordFeatureInteraction('ports')` e foco visível dedicado.
- As ações ricas de porta (`src/lib/workspace-port-actions.ts`) estão mortas (0 consumidores) e dependem do
  `window.api` ausente.

### G16 — Sleep cosmético (D04a-067 — PAR-21)
- “Sleep”/“Sleep with Descendants (N)” existem (`App.tsx:3487-3491`), mas `sleepSessionsForPaths` só fecha abas e
  marca sessões `idle` (`App.tsx:3122-3127`): não há badge/opacidade de dormindo, despertar em 1 clique nem
  desabilitação por elegibilidade.

### G17 — Linhas secundárias do card ausentes (D04a-020 — PAR-19, D04a-004, D04a-005, D04a-008, D04a-010)
- Sem banner de conflito de branch remoto (o reducer `updateWorktreeRemoteBranchConflict` é auto-stub), sem prompt de
  Linear, sem chip de worktrees filhas, sem fileira de badges, sem container de lineage — todos os campos que os
  alimentariam estão fixos no controller (`:304-314`).

### G18 — Componentes/props dormentes que precisam de produtor
- `WorktreeHostContextBadge` (D04a-108), `CacheTimer` (D04a-010), `WorktreeCardReviewBadge` (D04a-008/041/103),
  `TruncatedSidebarLabel` no título (D04a-073), `EMPTY_WORKSPACE_PORTS`/`HOSTED_REVIEW_CARD_REFRESH_INTERVAL_MS`/
  `isWebClient`/`branchDisplayName`/`FilledBellIcon`/`PullRequestIcon`/`EMPTY_BROWSER_TABS` sem consumidor
  (D04a-104, D04a-106), `use-clipboard-text-copy-feedback` sem consumidor (D04a-047).

---

## Baixo

- **G19** Vocabulário/rótulos: lane sem `· Unread` (D04a-021); `summarizeAgents` chamado e descartado, rótulo só
  “N agents” (D04a-081); ordem de estados divergente e sem `formatSummaryStateLabel`/`summarizeAgentIdentities`
  (D04a-089); terminologia sempre “PR #N” sem “MR” para GitLab (D04a-024, D04a-103).
- **G20** Expansão da lista de agentes sem limite LRU (512) e sem persistência de colapso de lineage (D04a-087).
- **G21** `WorktreeCardDetailSection`/`worktree-card-dom-events`/`worktree-card-meta-types`/`worktree-card-status-inputs`
  não existem (D04a-028, D04a-049, D04a-105, D04a-107, D04a-111) — helpers puros; ausência só importa quando as
  seções forem portadas.

## Cross-walk PAR (registrado por linha em `par`, não em `_par-crosswalk.json`)

PAR-05 (D04a-003) · PAR-08 (D04a-002, 052, 065) · PAR-19 (D04a-020) · PAR-21 (D04a-067) · PAR-27 (D04a-051) ·
PAR-34 (D04a-073, 076) · PAR-39 (D04a-044) · PAR-51 (D04a-010) · PAR-57 (D04a-010) · PAR-60 (D04a-010) ·
PAR-62 (D04a-025, 030, 031, 042, 043, 102) · PAR-66 (D04a-079, 080) · PAR-67 (D04a-019) · PAR-73 (D04a-093) ·
PAR-74 (D04a-023) · PAR-86 (D04a-069) · PAR-87 (D04a-041, 101).

Itens de TabBar (PAR-28, PAR-89, PAR-90, PAR-91) e de outros domínios (PAR-03, 13, 14, 15, 22, 26, 35, 41, 43, 44,
52, 77, 80, 81, 82, 88) ficam fora do escopo de D04a.
