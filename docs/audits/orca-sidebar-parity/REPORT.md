# Relatório — Paridade do sidebar esquerdo: Orca → Hydra

**Escopo:** todo o sidebar esquerdo do Orca (não apenas o visual): menus, submenus, diálogos, atalhos,
drag&drop, estados condicionais, persistência, atividade em background e o contrato de backend de cada
funcionalidade.
**Baseline:** `stablyai/orca` @ `e49b3aa0bd` (2026-09-18, working tree `/home/renan/src/orca`) ×
Hydra `renanbs/ondine` (`/home/renan/orca/workspaces/hydra/ondine`), sidebar montado em
`src/App.tsx:21` → `src/components/sidebar/WorktreeSidebar.tsx`.

---

## 1. Resposta direta

| | |
|---|---|
| Capabilities inventariadas no Orca | **765** |
| `parity` (comportamento equivalente, com wiring provado) | **56** (7,3%) |
| `partial` (existe, falta comportamento nomeado) | **299** (39,1%) |
| `missing` | **403** (52,7%) |
| `not-applicable` (razão de plataforma explícita) | **6** (0,8%) |
| `out-of-scope` (decisão explícita) | **1** (0,1%) |

Matriz completa linha a linha: [`MATRIX.md`](MATRIX.md). Gaps por domínio: [`GAPS-AGG.md`](GAPS-AGG.md).
Números por domínio: [`TOTALS.md`](TOTALS.md). Veredito detalhado por capability (com evidência dos dois
lados): `domains/<DOM>.diff.json` + `domains/<DOM>.gaps.md`.

**Leitura executiva:** o Hydra não tem o sidebar do Orca portado — tem **duas metades**. Uma metade é um
porte fiel do modelo do Orca (agrupamento, linhagem, ordenação, numeração `Cmd+1–9`) que **quase não é
renderizada**; a outra é a lista efetivamente pintada (`WorktreeSidebar`/`WorktreeList`), simplificada e
desacoplada daquela. Isso explica a maior parte dos `partial`: o código está lá, o efeito não chega à tela.

---

## 2. Como se prova que nada escapou

O inventário não foi escrito "lendo com cuidado". Ele foi fechado por instrumentos:

1. **Clausura estrutural** — BFS de imports a partir dos mounts (`components/Sidebar.tsx`, `App.tsx`):
   808 arquivos no escopo (**503 produtivos, 70.327 LOC**, 305 arquivos de teste), clausura total de 2.319
   arquivos, 230 dependências diretas fora do módulo (`index/ring2_deps.json`) e 1.281 de segundo nível.
   A fronteira real do escopo foi medida: **91 dos 502 arquivos produtivos não são alcançáveis pelo mount
   raiz** (são montados por `app-shell/AppRootSurfaces.tsx`, composers e afins) — um inventário limitado ao
   diretório teria perdido 18% da superfície.
2. **Índices ortogonais** (`index/*.json`) — exports (1.367 símbolos do escopo), rótulos/menus (967),
   atalhos (238), prefs (32), timers (79), subscriptions (193), símbolos de preload (70), testes
   (2.968 declarações unitárias indexadas) + 999 títulos de spec e2e.
3. **Partição exata** — 503 arquivos produtivos distribuídos em 18 domínios, **0 duplicados, 0 faltando,
   0 extras** (`index/partition_check.py`).
4. **Ledger mecânico** — `index/verify_coverage.py` exige que **cada** entrada de índice esteja mapeada a
   uma linha de inventário ou a uma justificativa literal (`N/A:`/`INFRA:`/`DUP:`), e valida cada
   evidência `arquivo:linha` contra o working tree. Resultado final: **6.427 obrigações mapeadas,
   0 violações em 18/18 domínios**. Símbolos do escopo não citados: **0**.
5. **Falsificação adversarial** (3 agentes que não escreveram o inventário): 808 arquivos rechecados,
   1.309 exports, 3.211 testes, 94 rótulos de runtime e 11 itens de menu confrontados com o inventário.
   Resultado: **1 escape real de comportamento** (ações por linha da lista de Agentes) e **5 defeitos de
   índice/integridade**, todos corrigidos e registrados em [`ledger/ESCAPES.md`](ledger/ESCAPES.md).
6. **Ground truth de runtime** — app Orca real (Electron headless, build `--mode e2e`), 4 capturas
   (`runtime/census*.json`): 34 affordances do sidebar, o menu de contexto do card com seus 11 itens e
   submenus (`Open in` → VS Code / File Manager / Customize apps…), diálogos e a **store API completa
   (1.165 chaves / 729 ações)**. Cada rótulo observado foi confrontado com o inventário.

Limitações do instrumento (declaradas, não escondidas): o scanner de testes é regex-based e não cobre
todas as formas de `.each` (2 declarações de `it.each` em 2.978); 71 das 230 dependências diretas fora do
módulo não são citadas nominalmente no inventário (8 delas não exportam símbolos — primitivos de UI e
helpers cujo comportamento está coberto por linha nomeada); 878 símbolos de módulos **fora** do escopo não
são citados (esperado: o ledger cobre o escopo, não a árvore inteira).

---

## 3. Números

| métrica | Orca (escopo do sidebar) | Hydra (sidebar) |
|---|---|---|
| arquivos produtivos | 503 | 106 |
| LOC produtivos | 70.327 | 18.086 |
| arquivos de teste | 305 (2.978 casos) | 12 |
| módulos órfãos (zero importador) | — | **9 arquivos / 1.042 LOC** |
| comandos de backend alcançáveis do sidebar | 386 handlers IPC (`window.api.*`) | **13 de 110 comandos Tauri** |
| virtualização de lista | `@tanstack/react-virtual` | ausente |
| renderização markdown no sidebar | react-markdown + remark/rehype + mermaid | ausente (0 deps) |

Vereditos por domínio: ver [`TOTALS.md`](TOTALS.md). Distribuição: os domínios com maior dívida são
**D03a (worktree-list, 104 capabilities: 2/51/51)**, **D04a (card, 111: 14/56/41)**, **D10 (visibilidade/
inbox, 91: 22/40/29)**, **D03b (50: 2/17/31)**, **D08 (Kanban, 45: 0/5/40)**, **D07 (menus, 45: 3/29/13)**.

---

## 4. Achados estruturais (atravessam domínios)

1. **Dois pipelines paralelos.** O porte fiel do Orca (`worktree-list/**`, `visible-worktrees.ts`,
   `smart-sort.ts`, `rendered-sidebar-worktree-order.ts`) alimenta **apenas** a numeração `Cmd+1–9`; a
   lista pintada (`WorktreeSidebar.tsx` + `WorktreeList.tsx`, 0 referências a host) aplica 2 dos 12
   passos de filtro do Orca. Consequência: filtros do menu de opções inertes, agrupamento só muda
   indentação, seção Pinned e headers de host não renderizam, linhagem recursiva nunca é alimentada.
   (D09, D11, D03a, D03b, D15a.)
2. **1.042 LOC de código órfão (11 arquivos)**, nove deles sem nenhum importador:
   `buildSidebarRows.ts` (386), `hard-scroll-up.ts` (329), `agent-row-lineage-model.ts` (127),
   `pointer-drag-dom.ts` (111), `keyboard-cycle.ts` (65) + shims `row-types.ts`, `group-keys.ts`,
   `project-group-sections.ts`, `build-rows.ts`, `worktree-list/rows/SectionHeader.tsx`,
   `project-filter-reveal.ts`. É infraestrutura de drag/ordem/teclado portada e **nunca ligada** — a
   origem direta dos `missing` de D06/D03.
3. **Backend insuficiente**: só 13 dos 110 comandos Tauri são alcançáveis a partir do sidebar. Não há
   comandos para SSH/hosts, sleep/wake de workspace, deleção estruturada com motivo, metadata de
   worktree (issue/review/notas), board/Kanban nem markdown — por isso domínios inteiros ficam `missing`
   (D02b 30/30, D08 40/45, D12 14/14).
4. **Auto-stubs que quebram caminhos reais**: `smart-attention.ts` exporta `null` para
   `buildAttentionByWorktree`/`hasFreshAttributedAgentStatus` (chamados por `smart-sort.ts` → erro no
   Smart sort), `MARINE_CREATURES: any = null` (sugestão de nome), `removeWorktree` do store é stub
   (`teardown/remove-worktree.ts:9`), `force-delete-preserved-branch` é stub, `src/store/slices/ssh.ts`
   é `@ts-nocheck — Orca port buffer`. Vários `partial` são, na prática, funcionalidade desligada.
5. **Sem virtualização e sem drag por ponteiro**: a lista do Hydra é plana (`WorktreeSidebar.tsx:700`),
   sem `@tanstack/react-virtual`; todo o drag&drop é HTML5 nativo, enquanto o Orca usa drag por ponteiro
   com preview flutuante, histerese de 160 ms, autoscroll RAF e múltiplos destinos (linhagem, status,
   pinned, board).
6. **Cards sem metadados**: nenhuma fileira de badges (issue GitHub/Linear/Jira, review, notas,
   automation/CLI) e nenhum diálogo de metadata; `CacheTimer` (PAR-60) inerte com `cacheStartedAt` fixo
   em `null`; overlay de deleção pode ficar preso (`isDeleting` local sem reset) — D04a-003.
7. **Régua de navegação e rodapé ausentes**: o Hydra tem só o botão de busca; faltam Tasks
   (+atalhos GitHub/Jira), Artifacts, Skills, Automations, Orca Mobile, Agent Dashboard entry/popout,
   menu Help e diálogo de Feedback (com áreas de anexo e prefill) — D01 (30 missing).

---

## 5. Top gaps P0/P1 (agregado)

| prioridade | gap | domínios/ids | esforço |
|---|---|---|---|
| P0 | Unificar pipeline: renderizar o modelo do Orca (groups/lanes/pinned/linhagem/filtros) em vez da lista plana | D03a G1–G6, D03b, D09, D11, D15a | alto |
| P0 | Virtualização + drag por ponteiro com multi-destino (preview, autoscroll, histerese, multi-seleção) | D03a-001..024, D06, D08 | alto |
| P0 | Backend de deleção estruturada (`DeleteRefusal`), sleep/wake real, metadata, prune de linhagem | D07 G1/G2/G4, D04b, D10 | alto |
| P0 | SSH/hosts: dialog, picker de `~/.ssh/config`, remote file browser, rename/remove/forget | D02b (30/30 missing), D04a-012..014 | alto |
| P1 | Menu de contexto do card 1:1 (Update, New/Move/Remove group, ações Git remotas, Developer com Option) | D04a-051..062, D07 | médio |
| P1 | Kanban board + DnD bidirecional + group-by-status/PR real | D08 (40/45), D03b-007 | alto |
| P1 | Lista de Agentes: linhas completas, subagentes aninhados, ações de thread (lido/não-lido, clear) | D05, D04a-079..091 | médio |
| P1 | Inbox/visibilidade: host glyph, escopo+fence de mutação, delete por instância, countdown de prompt cache | D10 G1–G5, G6 | médio |
| P1 | Markdown inline no sidebar (react-markdown/remark/rehype/mermaid + sanitização) | D12 (14/14) | médio |
| P1 | Régua de navegação + Help/Feedback + Workspace Board toggle | D01 | médio |
| P2 | Filtros/sort: smart sort funcional, badges de filtro ativo, Clear filters, “Except default branch” | D09 | baixo |
| P2 | Remover 1.042 LOC órfãos e auto-stubs; decidir por porta ou exclusão | D03a/D05/D06/D09/D11 | baixo |

Detalhamento com evidência dos dois lados e contrato Tauri necessário: `domains/<DOM>.gaps.md`.

---

## 6. Cross-walk com a auditoria anterior (`[PAR-*]`)

32 itens `PAR-*` da spec antiga foram mapeados para as linhas deste inventário
(`_par-crosswalk.json`): **15 missing, 15 partial, 1 not-applicable, 1 parity**. Cobertura nova em relação
à spec antiga: ela listava 41 pontos de sidebar/TabBar; este relatório entrega **765 capabilities** com
veredito e prova de cobertura — a spec anterior vira um subconjunto priorizado, não a fonte.

---

## 7. Artefatos e reprodutibilidade

```bash
cd /home/renan/orca/workspaces/hydra/ondine/docs/audits/orca-sidebar-parity
python3 index/build_index.py        # reconstrói índices mecânicos + fatias de domínio (lado Orca)
python3 index/verify_coverage.py    # ledger: 0 violações esperadas em 18 domínios
python3 index/partition_check.py    # partição exata + dependências externas citadas
python3 index/runtime_crosscheck.py # affordances de runtime × inventário
python3 index/build_report.py       # inventory.json, parity.json, MATRIX.md, TOTALS.md, GAPS-AGG.md
```

Estrutura completa dos artefatos: [`README.md`](README.md). Escapes e reparos:
[`ledger/ESCAPES.md`](ledger/ESCAPES.md) + `ledger/REPAIRS-*.md`. Evidência de runtime: `runtime/census*.json`.

**Nota de baseline:** o clone do Orca é raso (1 commit; aprofundado para 401 durante a auditoria) e apenas
9 de 107 arquivos do sidebar do Orca existem byte-a-byte iguais em algum commit do histórico — ou seja, o
Hydra **não** é cópia verbatim: é porte/adaptação iniciada em 2026-09-19 (`993f0f5`), um dia depois do
snapshot de referência. Todo gap reportado aqui é divergência de porte, não defasagem de versão.
