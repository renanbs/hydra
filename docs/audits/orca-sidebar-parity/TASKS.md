# TASKS — Backlog de paridade do sidebar (extraído da auditoria)

**158 work packages** em 18 domínios, derivados de `domains/<DOM>.gaps.md` (severidade e esforço são os declarados pelo domínio). O detalhe por capability está em `MATRIX.md` / `GAPS-AGG.md`.

| severidade | work packages |
|---|---|
| CRÍTICO (P0) | 4 |
| ALTO (P1) | 20 |
| MÉDIO-ALTO | 4 |
| MÉDIO (P2) | 19 |
| BAIXO-MÉDIO | 2 |
| BAIXO (P3) | 7 |
| SEM SEVERIDADE DECLARADA | 102 |

| domínio | work packages |
|---|---|
| D01-shell-chrome | 10 |
| D02a-repo-add-wizard | 10 |
| D02b-hosts-ssh-remote | 7 |
| D02c-project-groups-scripts | 1 |
| D03a-worktree-list-module | 10 |
| D03b-sidebar-list-orchestration | 6 |
| D04a-worktree-card-surface | 18 |
| D04b-worktree-card-controllers | 10 |
| D05-agents-rows | 8 |
| D06-drag-order-keyboard | 1 |
| D07-menus-actions | 11 |
| D08-kanban-board | 5 |
| D09-filters-sort | 10 |
| D10-visibility-inbox-notices | 15 |
| D11-lineage-grouping-model | 15 |
| D12-markdown-inline-render | 1 |
| D15-misc-a | 12 |
| D15-misc-b | 8 |

## CRÍTICO (P0) — 4

- **D03a-worktree-list-module G1** — Sistema de drag por ponteiro (P0 · alto impacto · alto esforço) · esforço: n/d · `D03a-worktree-list-module.gaps.md:19`
- **D03a-worktree-list-module G2** — Viewport virtualizado, sticky headers e scroll-to-top (P0 · alto impacto · alto esforço) · esforço: n/d · `D03a-worktree-list-module.gaps.md:36`
- **D07-menus-actions G1** — Deleção de worktree: sem linhagem child-first, sem force explícito, backend sempre --force — CRÍTICO · ids: D07-026, D07-028, D07-029, D07-030, D07-039, D07-040… · esforço: n/d · `D07-menus-actions.gaps.md:39`
- **D10-visibility-inbox-notices G1** — Atribuição de host nas linhas de notice (glyph + qualificação de rótulos) · ids: D10-027, D10-032, D10-035, D10-036, D10-037 · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:13`

## ALTO (P1) — 20

- **D01-shell-chrome** — Submenu de escopo multi-host sem UI — D01-045 missing: buildSidebarHostScopeOptions, · ids: D01-001, D01-045 · esforço: n/d · `D01-shell-chrome.gaps.md:54`
- **D01-shell-chrome** — Escapes do census sem linha no inventário — Refresh rate limits, Notifications alt+T e · ids: D01-001, D01-004, D01-050 · esforço: n/d · `D01-shell-chrome.gaps.md:59`
- **D03a-worktree-list-module G3** — Modos de agrupamento não renderizam as lanes (P1 · alto impacto · baixo esforço) · esforço: n/d · `D03a-worktree-list-module.gaps.md:50`
- **D03a-worktree-list-module G4** — Seleção múltipla e navegação por teclado (P1 · alto impacto · médio esforço) · esforço: n/d · `D03a-worktree-list-module.gaps.md:66`
- **D03a-worktree-list-module G5** — Infra de reveal (P1 · alto impacto · médio/alto esforço) · ids: D03a-064 · esforço: n/d · `D03a-worktree-list-module.gaps.md:82`
- **D03a-worktree-list-module G6** — Pinned section e host sections (P1 · médio impacto · médio esforço) · ids: D03a-030, D03a-036, D03a-074 · esforço: n/d · `D03a-worktree-list-module.gaps.md:96`
- **D04a-worktree-card-surface G1** — SSH host control e fluxo de conexão não existem · ids: D04a-012, D04a-013, D04a-014, D04a-108 · esforço: n/d · `D04a-worktree-card-surface.gaps.md:36`
- **D04a-worktree-card-surface G10** — Lista de agentes sem modo completo, subagentes, envio e estados de leitura · ids: D04a-054, D04a-079, D04a-080, D04a-084, D04a-085, D04a-086… · esforço: n/d · `D04a-worktree-card-surface.gaps.md:114`
- **D04a-worktree-card-surface G2** — Diálogo de metadados (issue/review/notas/nome) ausente · ids: D04a-093, D04a-099 (D04a-093…D04a-099) · esforço: n/d · `D04a-worktree-card-surface.gaps.md:47`
- **D04a-worktree-card-surface G3** — Fileira de badges de metadados e badges de estado ausentes · ids: D04a-025, D04a-033, D04a-051, D04a-052, D04a-053, D04a-060… (D04a-025…D04a-033) · esforço: n/d · `D04a-worktree-card-surface.gaps.md:57`
- **D04a-worktree-card-surface G6** — Hover de detalhes reduzido e com bug de propagação · ids: D04a-021, D04a-022, D04a-023, D04a-037, D04a-038, D04a-039… · esforço: n/d · `D04a-worktree-card-surface.gaps.md:90`
- **D04a-worktree-card-surface G7** — UX de não-lido incompleta · ids: D04a-002, D04a-015, D04a-021, D04a-022, D04a-023, D04a-052… · esforço: n/d · `D04a-worktree-card-surface.gaps.md:98`
- **D07-menus-actions G2** — Sleep é cosmético: não libera memória/CPU nem faz teardown real — ALTO (PAR-21) · ids: D07-001, D07-002, D07-003, D07-004, D07-005 · esforço: n/d · `D07-menus-actions.gaps.md:67`
- **D07-menus-actions G3** — Multi-seleção de worktrees não existe (bloqueia ações em massa) — ALTO (PAR-08) · ids: D07-002, D07-016, D07-022 · esforço: n/d · `D07-menus-actions.gaps.md:90`
- **D07-menus-actions G4** — Deleção sem toasts e sem tradução de erro (recuperação manual) — ALTO · ids: D07-029, D07-038, D07-039, D07-041, D07-042 · esforço: n/d · `D07-menus-actions.gaps.md:104`
- **D10-visibility-inbox-notices G2** — Escopo de host + fence de mutação no WorktreeVisibilityDialog · ids: D10-039, D10-040, D10-042, D10-043, D10-083, D10-084… · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:30`
- **D10-visibility-inbox-notices G3** — Validação de instância no delete + toast de lista obsoleta · ids: D10-005, D10-013, D10-014, D10-017, D10-077 · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:42`
- **D10-visibility-inbox-notices G5** — Output completo do auto-rename · ids: D10-001 · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:68`
- **D10-visibility-inbox-notices G7** — Superfície de feedback do sidebar (hooks completos) · ids: D10-078, D10-082 (D10-078…D10-082) · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:88`
- **D10-visibility-inbox-notices G8** — Card de "Imported worktrees" (candidatos + ação show com rollback) · ids: D10-063, D10-064, D10-066, D10-067, D10-068, D10-069… · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:98`

## MÉDIO-ALTO — 4

- **D07-menus-actions G5** — Aparência de status (cor/ícone) não é editável no sidebar — MÉDIO-ALTO (esforço baixo) · ids: D07-006, D07-007, D07-008 · esforço: baixo · `D07-menus-actions.gaps.md:118`
- **D10-visibility-inbox-notices G4** — Delete de lineage (pai + descendentes) · ids: D10-006, D10-008, D10-011, D10-015, D10-018, D10-019 · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:55`
- **D10-visibility-inbox-notices G6** — Relógio compartilhado e seleção de countdown de prompt-cache · ids: D10-072, D10-073, D10-074, D10-075, D10-076 · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:77`
- **D10-visibility-inbox-notices G9** — Aceitação de writes de visibilidade por source · ids: D10-043, D10-044, D10-046, D10-047, D10-087, D10-088… · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:110`

## MÉDIO (P2) — 19

- **D03a-worktree-list-module G10** — Notices/virtual rows e detalhes de header (P2/P3 · baixo impacto · baixo/médio esforço) · ids: D03a-035, D03a-042, D03a-043, D03a-075, D03a-086, D03a-087 · esforço: n/d · `D03a-worktree-list-module.gaps.md:138`
- **D03a-worktree-list-module G7** — Persistência de drop (ordem/status) (P2 · médio impacto · baixo esforço) · ids: D03a-009, D03a-010, D03a-021 · esforço: n/d · `D03a-worktree-list-module.gaps.md:106`
- **D03a-worktree-list-module G8** — PR lanes e refresh de PR/CI por rows visíveis (P2 · médio impacto · médio esforço) · ids: D03a-029, D03a-100, D03a-104 · esforço: n/d · `D03a-worktree-list-module.gaps.md:116`
- **D03a-worktree-list-module G9** — Folder path status fresco + indicador (P2 · médio impacto · baixo esforço) · ids: D03a-057, D03a-073 · esforço: n/d · `D03a-worktree-list-module.gaps.md:127`
- **D04a-worktree-card-surface G11** — Status do workspace: lista fixa × statuses configurados · ids: D04a-032, D04a-033, D04a-054, D04a-101, D04a-103 · esforço: n/d · `D04a-worktree-card-surface.gaps.md:121`
- **D04a-worktree-card-surface G12** — Review/PR: sonda única github, sem supressão/fallback/checks (D04a-032, D04a-033, D04a-101, D04a-103 — PAR-87) · ids: D04a-011, D04a-018, D04a-032, D04a-033, D04a-073, D04a-076… · esforço: n/d · `D04a-worktree-card-surface.gaps.md:126`
- **D04a-worktree-card-surface G13** — Tooltips nativos em vez de tooltip do design system (D04a-011, D04a-018, D04a-073, D04a-076 — PAR-34) · ids: D04a-011, D04a-018, D04a-073, D04a-076, D04a-109, D04a-110 · esforço: n/d · `D04a-worktree-card-surface.gaps.md:135`
- **D04a-worktree-card-surface G14** — Menu de exibição sem propriedades do card · ids: D04a-034, D04a-036, D04a-109, D04a-110 · esforço: n/d · `D04a-worktree-card-surface.gaps.md:140`
- **D04a-worktree-card-surface G15** — Ações de porta incompletas · ids: D04a-034, D04a-036, D04a-067 · esforço: n/d · `D04a-worktree-card-surface.gaps.md:146`
- **D04a-worktree-card-surface G16** — Sleep cosmético (D04a-067 — PAR-21) · ids: D04a-004, D04a-005, D04a-008, D04a-010, D04a-020, D04a-067 · esforço: n/d · `D04a-worktree-card-surface.gaps.md:153`
- **D04a-worktree-card-surface G17** — Linhas secundárias do card ausentes (D04a-020 — PAR-19, D04a-004, D04a-005, D04a-008, D04a-010) · ids: D04a-004, D04a-005, D04a-008, D04a-010, D04a-020, D04a-047… · esforço: n/d · `D04a-worktree-card-surface.gaps.md:158`
- **D04a-worktree-card-surface G4** — Menu de contexto do card incompleto · ids: D04a-051, D04a-052, D04a-053, D04a-060, D04a-061, D04a-062… · esforço: n/d · `D04a-worktree-card-surface.gaps.md:66`
- **D04a-worktree-card-surface G5** — Estado de exclusão in-place preso · ids: D04a-003, D04a-069, D04b-004 · esforço: n/d · `D04a-worktree-card-surface.gaps.md:78`
- **D07-menus-actions G6** — Menu de opções incompleto (badge, host scope, PR, Project/Manual, card properties) — MÉDIO · ids: D07-010, D07-011, D07-012, D07-013, D07-014, D07-015 · esforço: n/d · `D07-menus-actions.gaps.md:138`
- **D07-menus-actions G7** — Pin e Mark Unread não persistem — MÉDIO · ids: D07-020 · esforço: n/d · `D07-menus-actions.gaps.md:156`
- **D07-menus-actions G8** — Linhagem: persistência em localStorage, picker modal e sem guarda de deleção — MÉDIO · ids: D07-023, D07-043, D07-045 · esforço: n/d · `D07-menus-actions.gaps.md:171`
- **D07-menus-actions G9** — Política/performance do menu: sentinelas, supressão de clique e âncora de scroll — MÉDIO-BAIXO · ids: D07-017, D07-019, D07-027 · esforço: n/d · `D07-menus-actions.gaps.md:187`
- **D10-visibility-inbox-notices G11** — Preview de alvo do delete com host/collision e erros por linha · ids: D10-007, D10-020, D10-021, D10-022, D10-023, D10-048… · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:132`
- **D10-visibility-inbox-notices G14** — Delete: copy/hidratação/limpeza de estado · ids: D10-006, D10-011, D10-016, D10-019, D10-024 · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:154`

## BAIXO-MÉDIO — 2

- **D07-menus-actions G10** — Diálogo de exclusão: copy, dirty hints e skip-confirm condicionais — BAIXO-MÉDIO · ids: D07-031, D07-032, D07-033, D07-034, D07-035, D07-036… · esforço: n/d · `D07-menus-actions.gaps.md:199`
- **D10-visibility-inbox-notices G12** — Dialog de visibilidade: cópia/aria e form inline fiéis · ids: D10-048, D10-049, D10-050, D10-054, D10-057, D10-058… · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:139`

## BAIXO (P3) — 7

- **D04a-worktree-card-surface G18** — Componentes/props dormentes que precisam de produtor · ids: D04a-008, D04a-010, D04a-047, D04a-073, D04a-104, D04a-106… · esforço: n/d · `D04a-worktree-card-surface.gaps.md:163`
- **D04a-worktree-card-surface G8** — Multi-seleção inexistente (D04a-002, D04a-052, D04a-065 — PAR-08) · ids: D04a-002, D04a-015, D04a-052, D04a-065, D04a-069 · esforço: n/d · `D04a-worktree-card-surface.gaps.md:103`
- **D04a-worktree-card-surface G9** — Caminho de atalho do rename e dispatcher de keybindings mortos · ids: D04a-015, D04a-069, D04a-079, D04a-080, D04a-084, D04a-085… · esforço: n/d · `D04a-worktree-card-surface.gaps.md:107`
- **D07-menus-actions G11** — Delete rápido no hover: sem gate de Alt nem atalho por linha — BAIXO · ids: D07-024, D07-025 · esforço: n/d · `D07-menus-actions.gaps.md:213`
- **D10-visibility-inbox-notices G10** — Help popover e aviso de override no dialog de visibilidade · ids: D10-007, D10-020, D10-021, D10-022, D10-023, D10-052… · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:126`
- **D10-visibility-inbox-notices G13** — Fidelidade de contêiner do output do auto-rename · ids: D10-004, D10-006, D10-011, D10-016, D10-019 · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:148`
- **D10-visibility-inbox-notices G15** — Linha compacta de descoberta: placement/host · ids: D10-024 · esforço: n/d · `D10-visibility-inbox-notices.gaps.md:161`

## SEM SEVERIDADE DECLARADA — 102

- **D01-shell-chrome** — A régua de navegação inteira do Orca não existe — D01-017 (Setup Guide), D01-018 (Tasks), · ids: D01-017, D01-018, D01-019, D01-020, D01-021, D01-022… · esforço: n/d · `D01-shell-chrome.gaps.md:36`
- **D01-shell-chrome** — Menu de Ajuda + Feedback inteiros — D01-035 (dropdown Help), D01-036 (Atalhos/Feedback/Milestones/ · ids: D01-032, D01-033, D01-035, D01-036, D01-037, D01-038… · esforço: n/d · `D01-shell-chrome.gaps.md:45`
- **D01-shell-chrome** — Workspace Board (Kanban) sem botão e sem dica de realocação — D01-032 (toggle + preview de drag) e · ids: D01-032, D01-033, D01-045 · esforço: n/d · `D01-shell-chrome.gaps.md:50`
- **D01-shell-chrome** — Casca sem data-sidebar, com limites/default divergentes e sem canal de live-width — D01-001 · ids: D01-001, D01-004, D01-049, D01-050 · esforço: n/d · `D01-shell-chrome.gaps.md:61`
- **D01-shell-chrome** — Drop nativo de pastas do SO — D01-004 missing (PAR-13). Nenhum dragenter/dragover/onDrop de SO · ids: D01-004, D01-007, D01-047, D01-049, D01-050 · esforço: n/d · `D01-shell-chrome.gaps.md:64`
- **D01-shell-chrome** — SidebarCountBadge (1…9+) — D01-050 missing (PAR-38). O cabeçalho de grupo pinta um ponto · ids: D01-007, D01-047, D01-049, D01-050 · esforço: n/d · `D01-shell-chrome.gaps.md:66`
- **D01-shell-chrome** — CacheTimer inerte — D01-049 partial (PAR-60): cacheStartedAt é hardcoded null · ids: D01-007, D01-047, D01-049 · esforço: n/d · `D01-shell-chrome.gaps.md:69`
- **D01-shell-chrome** — Título do cabeçalho estático + galeria de overlays — D01-007 partial (PAR-03: "Projects" fixo, · ids: D01-007, D01-047, D01-052 · esforço: n/d · `D01-shell-chrome.gaps.md:72`
- **D02a-repo-add-wizard** — Seleção de host (Local/SSH/Runtime) ausente no wizard — D02a-003, D02a-004 missing; · ids: D02a-003, D02a-004, D02a-005, D02a-009, D02a-010, D02a-022… · esforço: n/d · `D02a-repo-add-wizard.gaps.md:23`
- **D02a-repo-add-wizard** — Fluxo de adição SSH remota inteiro inaplicável — D02a-005/019/020/021 not-applicable · ids: D02a-005, D02a-009, D02a-010, D02a-022, D02a-028, D02a-034 · esforço: n/d · `D02a-repo-add-wizard.gaps.md:25`
- **D02a-repo-add-wizard** — Etapa de server-path de runtime + RemoteFileBrowser — D02a-010/011 not-applicable (runtime server remoto) · ids: D02a-009, D02a-010, D02a-013, D02a-022, D02a-026, D02a-027… · esforço: n/d · `D02a-repo-add-wizard.gaps.md:27`
- **D02a-repo-add-wizard** — Escaneamento de repositórios aninhados + revisão/import em grupo — D02a-022/023/024/025 missing; · ids: D02a-009, D02a-013, D02a-022, D02a-026, D02a-027, D02a-028… · esforço: n/d · `D02a-repo-add-wizard.gaps.md:28`
- **D02a-repo-add-wizard** — Add em lote de múltiplas pastas locais — D02a-009 missing (picker usa multiple:false, AddRepoDialog.tsx:53) · ids: D02a-009, D02a-013, D02a-026, D02a-027, D02a-028, D02a-031… · esforço: n/d · `D02a-repo-add-wizard.gaps.md:30`
- **D02a-repo-add-wizard** — Handoff de checkout padrão completo (main worktree, reveal, telemetria) — D02a-028 partial: o Hydra só · ids: D02a-013, D02a-026, D02a-027, D02a-028, D02a-031, D02a-034 · esforço: n/d · `D02a-repo-add-wizard.gaps.md:31`
- **D02a-repo-add-wizard** — Composer de workspace de pasta (submit, agente, path-status gate) — D02a-034/035/037 missing (sem UI; · ids: D02a-013, D02a-026, D02a-027, D02a-031, D02a-034, D02a-039 · esforço: n/d · `D02a-repo-add-wizard.gaps.md:33`
- **D02a-repo-add-wizard** — Diálogos de compatibilidade de import — D02a-026 (confirm-from-folder) e D02a-027 (project-added) missing · ids: D02a-001, D02a-013, D02a-026, D02a-027, D02a-031, D02a-039 · esforço: n/d · `D02a-repo-add-wizard.gaps.md:35`
- **D02a-repo-add-wizard** — Defaults derivados (clone/create) e links/SSH — D02a-013/017 missing: caminhos literais · ids: D02a-001, D02a-013, D02a-031, D02a-039 · esforço: n/d · `D02a-repo-add-wizard.gaps.md:36`
- **D02a-repo-add-wizard** — Telemetria de adição de projeto — D02a-031 out-of-scope (sem sink; src/lib/telemetry.ts:26 chama bridge ausente) · ids: D02a-001, D02a-006, D02a-031, D02a-039 · esforço: n/d · `D02a-repo-add-wizard.gaps.md:38`
- **D02b-hosts-ssh-remote G1** — Estado do subsistema SSH/remote no Hydra — a ausência é de implementação, não de plataforma · esforço: n/d · `D02b-hosts-ssh-remote.gaps.md:11`
- **D02b-hosts-ssh-remote G2** — Por que not-applicable foi avaliado e rejeitado · ids: D02b-001, D02b-010, D02b-021 · esforço: n/d · `D02b-hosts-ssh-remote.gaps.md:31`
- **D02b-hosts-ssh-remote G3** — Veredito por linha · ids: D02b-001, D02b-002, D02b-003, D02b-004, D02b-005, D02b-006 · esforço: n/d · `D02b-hosts-ssh-remote.gaps.md:44`
- **D02b-hosts-ssh-remote G4** — Obrigações de cobertura (entrada → id do veredito) · ids: D02b-001, D02b-003, D02b-004, D02b-005, D02b-007, D02b-009… · esforço: n/d · `D02b-hosts-ssh-remote.gaps.md:79`
- **D02b-hosts-ssh-remote G5** — Justificativas INFRA:/N/A:/DUP · esforço: n/d · `D02b-hosts-ssh-remote.gaps.md:431`
- **D02b-hosts-ssh-remote G6** — Log de busca negativo (Hydra) · esforço: n/d · `D02b-hosts-ssh-remote.gaps.md:437`
- **D02b-hosts-ssh-remote G7** — Cross-walk PAR · esforço: n/d · `D02b-hosts-ssh-remote.gaps.md:480`
- **D02c-project-groups-scripts** — Fechar as lacunas do domínio (22 capabilities em missing/partial) · ids: D02c-002, D02c-003, D02c-004, D02c-005, D02c-006, D02c-007… · esforço: n/d · `D02c-project-groups-scripts.gaps.md`
- **D03b-sidebar-list-orchestration G1** — Mapa de alcance (o que está realmente ligado ao mount) · esforço: n/d · `D03b-sidebar-list-orchestration.gaps.md:11`
- **D03b-sidebar-list-orchestration G2** — Paridade real (2 linhas) · ids: D03b-038, D03b-050 · esforço: n/d · `D03b-sidebar-list-orchestration.gaps.md:26`
- **D03b-sidebar-list-orchestration G3** — Gaps por linha · ids: D03b-001, D03b-002, D03b-004, D03b-006 · esforço: n/d · `D03b-sidebar-list-orchestration.gaps.md:39`
- **D03b-sidebar-list-orchestration G3** — 1 partial (17) · ids: D03b-001, D03b-002, D03b-004, D03b-006, D03b-010, D03b-011 · esforço: n/d · `D03b-sidebar-list-orchestration.gaps.md:41`
- **D03b-sidebar-list-orchestration G3** — 2 missing (31) · ids: D03b-003, D03b-005, D03b-007, D03b-008, D03b-009, D03b-012 · esforço: n/d · `D03b-sidebar-list-orchestration.gaps.md:63`
- **D03b-sidebar-list-orchestration G4** — Cross-walk PAR-* proposto (merge manual em _par-crosswalk.json) · ids: D03b-007, D03b-008, D03b-009, D03b-015 · esforço: n/d · `D03b-sidebar-list-orchestration.gaps.md:99`
- **D04b-worktree-card-controllers** — D04b-001 — Foco do sucessor pós-delete: inexistente. App.tsx:1789 só faz refreshGitWorktrees + evento; setActiveWorktreePath nunca é tocado após delet · ids: D04b-001, D04b-002, D04b-004, D04b-010, D04b-012, D04b-013… · esforço: n/d · `D04b-worktree-card-controllers.gaps.md:26`
- **D04b-worktree-card-controllers** — D04b-004/006 — Deleção sem toasts interativos nem waivers. DeleteWorktreeDialog.tsx:177 mostra erro inline; não há View changes, Delete Anyway (allowF · ids: D04b-002, D04b-004, D04b-010, D04b-012, D04b-013, D04b-014… · esforço: n/d · `D04b-worktree-card-controllers.gaps.md:27`
- **D04b-worktree-card-controllers** — D04b-013/015/016 — Nenhum polling nem cache de review/issue no card. HOSTED_REVIEW_CARD_REFRESH_INTERVAL_MS (worktree-card-model.ts:116) tem zero cons · ids: D04b-002, D04b-010, D04b-012, D04b-013, D04b-014, D04b-018… · esforço: n/d · `D04b-worktree-card-controllers.gaps.md:28`
- **D04b-worktree-card-controllers** — D04b-010/022 — Edição de metadados do card ausente/desligada. Não existe diálogo edit-meta; duplo-clique abre renomeação inline (use-worktree-card-con · ids: D04b-002, D04b-010, D04b-012, D04b-014, D04b-018, D04b-019… · esforço: n/d · `D04b-worktree-card-controllers.gaps.md:29`
- **D04b-worktree-card-controllers** — D04b-014 — Badges de issue (Linear/Jira/GitHub) e título composto não existem. A meta row (worktree-card-meta-row.tsx) renderiza repo/identidade/detac · ids: D04b-002, D04b-005, D04b-012, D04b-014, D04b-018, D04b-019… · esforço: n/d · `D04b-worktree-card-controllers.gaps.md:30`
- **D04b-worktree-card-controllers** — D04b-002 — Destaque do row de agente focado é dormente. worktree-card-compact-agents.tsx:221 usa activeSessionId, mas WorktreeSidebar/WorktreeList nun · ids: D04b-002, D04b-005, D04b-007, D04b-012, D04b-018, D04b-019… · esforço: n/d · `D04b-worktree-card-controllers.gaps.md:31`
- **D04b-worktree-card-controllers** — D04b-018 — Abrir link de issue não existe. Nenhum campo edit-meta de issue, nenhum OPEN_ISSUE_TIMEOUT_MS/openRequestRef; window.api.shell.openUrl exis · ids: D04b-005, D04b-007, D04b-008, D04b-012, D04b-018, D04b-019… · esforço: n/d · `D04b-worktree-card-controllers.gaps.md:32`
- **D04b-worktree-card-controllers** — D04b-023 — Sugestão de nome de criatura é stub. MARINE_CREATURES: any = null (shared/marine-creatures.ts:3); CREATURE_POOL_NAMES (retired-name-registr · ids: D04b-005, D04b-007, D04b-008, D04b-012, D04b-017, D04b-019… · esforço: n/d · `D04b-worktree-card-controllers.gaps.md:33`
- **D04b-worktree-card-controllers** — D04b-012 — Runtime/SSH do card hardcoded. conflictOperation: '' (:304), isRuntimeDisconnected: false (:318), isQueuedForDeletion: false (:319), remote · ids: D04b-005, D04b-007, D04b-008, D04b-012, D04b-015, D04b-017… · esforço: n/d · `D04b-worktree-card-controllers.gaps.md:34`
- **D04b-worktree-card-controllers** — D04b-019/020/021 — Projeções de performance ausentes. Sem selectAcknowledgedAgentTimes por card, sem CommentMarkdown/markdown no sidebar, sem selectSe · ids: D04b-005, D04b-007, D04b-008, D04b-015, D04b-017, D04b-019 · esforço: n/d · `D04b-worktree-card-controllers.gaps.md:35`
- **D05-agents-rows G1** — Lacuna central: o pipeline de linhas de agente do Orca não foi portado · esforço: n/d · `D05-agents-rows.gaps.md:19`
- **D05-agents-rows G2** — Heurísticas de status/frescor: Orca vs motor Herdr (src-tauri/src/agent_state.rs) · esforço: n/d · `D05-agents-rows.gaps.md:47`
- **D05-agents-rows G3** — Módulos "auto-stub" que sustentam a aparência de port · esforço: n/d · `D05-agents-rows.gaps.md:78`
- **D05-agents-rows G4** — Helpers reais porém mortos (semântica do Orca presente, efeito ausente) · esforço: n/d · `D05-agents-rows.gaps.md:100`
- **D05-agents-rows G5** — Preferências persistidas sem consumidor · esforço: n/d · `D05-agents-rows.gaps.md:113`
- **D05-agents-rows G6** — Cross-walk PAR · ids: D05-006, D05-010 · esforço: n/d · `D05-agents-rows.gaps.md:121`
- **D05-agents-rows G7** — Método de busca (5 passos, aplicado por linha) · esforço: n/d · `D05-agents-rows.gaps.md:128`
- **D05-agents-rows G8** — Lacuna E1 — ações por-linha da lista de Agentes (nascida da falsificação) · ids: D05-021 · esforço: n/d · `D05-agents-rows.gaps.md:139`
- **D06-drag-order-keyboard** — Fechar as lacunas do domínio (22 capabilities em missing/partial) · ids: D06-002, D06-003, D06-004, D06-005, D06-006, D06-007… · esforço: n/d · `D06-drag-order-keyboard.gaps.md`
- **D08-kanban-board D08-010** — Campo de busca de workspaces (partial) · ids: D08-010, D08-011 · esforço: n/d · `D08-kanban-board.gaps.md:137`
- **D08-kanban-board D08-011** — Escape no campo de busca (partial) · ids: D08-011, D08-013 · esforço: n/d · `D08-kanban-board.gaps.md:144`
- **D08-kanban-board D08-013** — Matching da busca (partial) · ids: D08-013, D08-029 · esforço: n/d · `D08-kanban-board.gaps.md:149`
- **D08-kanban-board D08-029** — Projeção/agrupamento/ordenação (partial) · ids: D08-029, D08-042 · esforço: n/d · `D08-kanban-board.gaps.md:157`
- **D08-kanban-board D08-042** — Reordenar/mover/fixar (partial) · ids: D08-042 · esforço: n/d · `D08-kanban-board.gaps.md:166`
- **D09-filters-sort** — FilterToggleRow + SidebarFilter não existem (D09-001/002/003/004/010): não há componente de linha · ids: D09-001, D09-005, D09-022, D09-026 · esforço: n/d · `D09-filters-sort.gaps.md:54`
- **D09-filters-sort** — Filtros que não filtram (D09-005/007/017): Hide sleeping, Hide automation-created e · ids: D09-005, D09-015, D09-022, D09-026 · esforço: n/d · `D09-filters-sort.gaps.md:57`
- **D09-filters-sort** — Smart sort inoperante (D09-026/031): buildAttentionByWorktree/hasFreshAttributedAgentStatus são · ids: D09-015, D09-018, D09-022, D09-026 · esforço: n/d · `D09-filters-sort.gaps.md:60`
- **D09-filters-sort** — Ordem de classes divergente (D09-022): Hydra ranqueia Working acima de Done (classes 2/3 · ids: D09-015, D09-018, D09-019, D09-022 · esforço: n/d · `D09-filters-sort.gaps.md:62`
- **D09-filters-sort** — Nada de teclado no filtro de projetos (D09-015): sem Backspace/Enter/ArrowLeft, sem navegação por · ids: D09-006, D09-012, D09-015, D09-018, D09-019 · esforço: n/d · `D09-filters-sort.gaps.md:65`
- **D09-filters-sort** — Auto-revelação desconectada (D09-018): revealRepoInProjectFilter é port fiel, mas muta · ids: D09-006, D09-012, D09-018, D09-019 · esforço: n/d · `D09-filters-sort.gaps.md:67`
- **D09-filters-sort** — Regras puras órfãs (D09-019/020): sidebarHasActiveFilters e computeClearFilterActions são port · ids: D09-006, D09-012, D09-019, D09-028 · esforço: n/d · `D09-filters-sort.gaps.md:70`
- **D09-filters-sort** — Sub-filtro de exceção ausente (D09-006): não existe a linha condicional "Except default branch" nem · ids: D09-006, D09-012, D09-028 · esforço: n/d · `D09-filters-sort.gaps.md:72`
- **D09-filters-sort** — Timers/atalhos: o port do foco por requestAnimationFrame (D09-012) virou autoFocus, sem · ids: D09-012, D09-028 · esforço: n/d · `D09-filters-sort.gaps.md:74`
- **D09-filters-sort** — Ordenações ricas fora do render (D09-028/029/030): CREATE_GRACE_MS/effectiveRecentActivity, · ids: D09-001, D09-002, D09-028 · esforço: n/d · `D09-filters-sort.gaps.md:77`
- **D11-lineage-grouping-model** — Não existe árvore de worktrees aninhada no sidebar pintado (D11-014/D11-013/D11-015): indentação · ids: D11-003, D11-007, D11-009, D11-010, D11-012, D11-013… · esforço: n/d · `D11-lineage-grouping-model.gaps.md:86`
- **D11-lineage-grouping-model** — Sem seção global Pinned no topo (D11-003, PAR-35): emitPinnedGroup existe no modelo sombra, · ids: D11-003, D11-007, D11-009, D11-010, D11-012 · esforço: n/d · `D11-lineage-grouping-model.gaps.md:89`
- **D11-lineage-grouping-model** — Filtros do menu de opções não afetam a lista pintada (D11-010/D11-009/D11-007/D11-012) · ids: D11-007, D11-009, D11-010, D11-012 · esforço: n/d · `D11-lineage-grouping-model.gaps.md:91`
- **D11-lineage-grouping-model** — Flags do store do pipeline Orca nunca são elevados: showSleepingWorkspaces, · ids: D11-003, D11-014 · esforço: n/d · `D11-lineage-grouping-model.gaps.md:94`
- **D11-lineage-grouping-model** — Estado de linhagem duplicado e divergente (D11-014/D11-003): App.worktreeLineage · ids: D11-002, D11-003, D11-004, D11-013, D11-014, D11-017 · esforço: n/d · `D11-lineage-grouping-model.gaps.md:101`
- **D11-lineage-grouping-model** — repo-header-create-state ausente (D11-004): o botão "+" do header não deriva · ids: D11-002, D11-004, D11-006, D11-013, D11-017 · esforço: n/d · `D11-lineage-grouping-model.gaps.md:104`
- **D11-lineage-grouping-model** — Módulos órfãos do domínio: natural-worktree-ids.ts (D11-002), · ids: D11-002, D11-006, D11-013, D11-016, D11-017 · esforço: n/d · `D11-lineage-grouping-model.gaps.md:107`
- **D11-lineage-grouping-model** — Projeção memoizada de atividade de abas ausente (D11-006): sem isolamento de baldes por · ids: D11-005, D11-006, D11-016 · esforço: n/d · `D11-lineage-grouping-model.gaps.md:112`
- **D11-lineage-grouping-model** — Índice de ids inequívocos ausente (D11-016): resoluções por id nu seguem "FIRST wins" · ids: D11-001, D11-005, D11-016 · esforço: n/d · `D11-lineage-grouping-model.gaps.md:115`
- **D11-lineage-grouping-model** — Resolução de defaults de visibilidade por proprietário do repo ausente (D11-005): sem · ids: D11-001, D11-005, D11-008 · esforço: n/d · `D11-lineage-grouping-model.gaps.md:117`
- **D11-lineage-grouping-model G1** — Regra de veredito aplicada · esforço: n/d · `D11-lineage-grouping-model.gaps.md:6`
- **D11-lineage-grouping-model G2** — Achado sistêmico (afeta 12 das 17 linhas) · esforço: n/d · `D11-lineage-grouping-model.gaps.md:23`
- **D11-lineage-grouping-model G5** — Paridades notáveis · ids: D11-001, D11-008, D11-011 · esforço: n/d · `D11-lineage-grouping-model.gaps.md:121`
- **D11-lineage-grouping-model G6** — Traceabilidade de cobertura (100% das entradas do .orca.json) · ids: D11-001, D11-002, D11-003, D11-004, D11-005, D11-006… · esforço: n/d · `D11-lineage-grouping-model.gaps.md:138`
- **D11-lineage-grouping-model G7** — Cross-walk PAR (pendente de agregação em domains/_par-crosswalk.json) · ids: D11-003, D11-013 · esforço: n/d · `D11-lineage-grouping-model.gaps.md:170`
- **D12-markdown-inline-render** — Fechar as lacunas do domínio (14 capabilities em missing/partial) · ids: D12-001, D12-002, D12-003, D12-004, D12-005, D12-006… · esforço: n/d · `D12-markdown-inline-render.gaps.md`
- **D15-misc-a D15a-001** — Detecção/desempacotamento de fenced block Mermaid — missing · ids: D15a-001, D15a-002 · esforço: n/d · `D15-misc-a.gaps.md:42`
- **D15-misc-a D15a-002** — Renderização de Mermaid em comentários — missing · ids: D15a-002, D15a-003 · esforço: n/d · `D15-misc-a.gaps.md:51`
- **D15-misc-a D15a-003** — Cor de badge de repositório — missing · ids: D15a-003, D15a-004 · esforço: n/d · `D15-misc-a.gaps.md:55`
- **D15-misc-a D15a-004** — Cor contextual de Project Group/Provider — missing · ids: D15a-004, D15a-005 · esforço: n/d · `D15-misc-a.gaps.md:63`
- **D15-misc-a D15a-005** — Aviso de ordenação manual de projetos — missing · ids: D15a-005, D15a-006 · esforço: n/d · `D15-misc-a.gaps.md:69`
- **D15-misc-a D15a-006** — Opções/escopos de hosts (derive) — partial · ids: D15a-006 · esforço: n/d · `D15-misc-a.gaps.md:78`
- **D15-misc-a D15a-007** — Contagem de folder-workspaces por seção de host — partial · ids: D15a-007 · esforço: n/d · `D15-misc-a.gaps.md:91`
- **D15-misc-a D15a-008** — Drag DOM + ordenação persistida de Project Groups — missing · ids: D15a-008 · esforço: n/d · `D15-misc-a.gaps.md:102`
- **D15-misc-a D15a-009** — Isolamento de clique das ações de cabeçalho — partial · ids: D15a-009 · esforço: n/d · `D15-misc-a.gaps.md:113`
- **D15-misc-a D15a-010** — Área de toque da alça de resize — partial · ids: D15a-010, D15a-011 · esforço: n/d · `D15-misc-a.gaps.md:125`
- **D15-misc-a D15a-011** — Sleep de worktree + resume de VM (concorrência) — missing · ids: D15a-011, D15a-012 · esforço: n/d · `D15-misc-a.gaps.md:134`
- **D15-misc-a D15a-012** — Seleção host-qualified de worktrees no Kanban — partial · ids: D15a-012 · esforço: n/d · `D15-misc-a.gaps.md:143`
- **D15-misc-b G1** — Gaveta/quadro Kanban de workspaces inexistente (D15b-001, D15b-002; arrasta D15b-004, D15b-005) · ids: D15b-001, D15b-002, D15b-004, D15b-005 · esforço: n/d · `D15-misc-b.gaps.md:38`
- **D15-misc-b G2** — Redirect de reveal Agents→Spaces ausente · ids: D15b-003, D15b-006, D15b-007 · esforço: n/d · `D15-misc-b.gaps.md:58`
- **D15-misc-b G3** — Diálogo de metadados de worktree ausente · ids: D15b-006, D15b-007, D15b-008, D15b-009 · esforço: n/d · `D15-misc-b.gaps.md:65`
- **D15-misc-b G4** — Parent picker sem âncora/timer · ids: D15b-008, D15b-009, D15b-010 · esforço: n/d · `D15-misc-b.gaps.md:74`
- **D15-misc-b G5** — Prompt de setup script não renderizado na sidebar · ids: D15b-010, D15b-011 · esforço: n/d · `D15-misc-b.gaps.md:82`
- **D15-misc-b G6** — Métricas de chrome para portais · ids: D15b-011, D15b-012, D15b-013 · esforço: n/d · `D15-misc-b.gaps.md:88`
- **D15-misc-b G7** — Drop preview de cabeçalhos: cálculo portado mas morto · ids: D15b-012, D15b-013 · esforço: n/d · `D15-misc-b.gaps.md:94`
- **D15-misc-b G8** — Reveal sem matemática de bounds · ids: D15b-014 · esforço: n/d · `D15-misc-b.gaps.md:105`
