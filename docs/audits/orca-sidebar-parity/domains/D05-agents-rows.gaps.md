# D05-agents-rows — Lacunas de Paridade (Orca → Hydra)

Veredito: **0 parity / 10 partial / 13 missing / 0 not-applicable / 0 out-of-scope**.

- partial: D05-001, D05-002, D05-004, D05-005, D05-006, D05-007, D05-008, D05-009, D05-013, D05-016
- missing: D05-003, D05-010, D05-011, D05-012, D05-014, D05-015, D05-017, D05-018, D05-019, D05-020, D05-021, D05-022, D05-023

> As linhas **D05-021, D05-022 e D05-023** nasceram da **falsificação E1** do relatório adversarial
> (`ledger/falsification-runtime.md`): ações por-linha da lista de Agentes do sidebar esquerdo que o
> inventário original não cobria (alternância lido/não-lido e "Clear notification" de uma thread
> concluída individual). Elas foram adicionadas ao `.orca.json`, ao `.coverage.md` e classificadas
> aqui como `missing` no Hydra.

Nenhuma linha atinge `parity`: nenhum id tem prova simultânea de (a) símbolo alcançável a partir do
mount do sidebar, (b) efeito observável idêntico e (c) backend chamado pelo caminho.

---

## 1. Lacuna central: o pipeline de linhas de agente do Orca não foi portado

O Orca concentra D05 em um pipeline próprio (`SidebarAgentsList` → `useWorktreeAgentRows` →
`buildWorktreeAgentRows` → seletores/índices/caches). Nada desse pipeline existe no Hydra por nome
(busca literal em `src/**`, 0 hits para `useWorktreeAgentRows`, `buildWorktreeAgentRows`,
`selectWorktreeAgentActivitySummary`, `createWorktreeAgentFreshnessSelector`,
`patchLiveEntriesByWorktree`, `selectWorktreeAgentOrchestration*`, `selectRuntimeAgentOrchestrationBatch`,
`tabFromWorktreeAttributedStatusEntry`, `effectiveWorktreeAgentRowStartedAt`, `compareWorktreeAgentRows`,
`buildSubagentChildRows`, `buildTitleDerivedAgentRows`, `markCompletedWorkerParentPaneKeysSeen`,
`EMPTY_AGENT_ROWS`, `liveEntryWorktreeId`).

O que existe no lugar:

- `src/components/sidebar/WorktreeCardAgents.tsx:28-199` — derivação inline (useMemo) de linhas do card:
  abas do worktree + sessões headless ativas, consolidadas por agente numa `Map` (ordem de inserção).
  É o único construtor de linhas de agente alcançável do mount:
  `WorktreeSidebar → WorktreeList → WorktreeCard → worktree-card-parent-content.tsx:114 → WorktreeCardAgents`.
- `src/components/sidebar/SidebarAgentsList.tsx:22-51` — view agregada de `WorktreeSession` (cards), não a
  lista de threads do Orca; montada em `WorktreeSidebar.tsx:647`.
- `src/lib/worktree-activity-state.ts:32-81` — índice real `getLiveAgentStatusByWorktreeId`
  (status único `working|monitoring|permission` por worktree, com gate de frescor), consumido pelo
  filtro de sleeping (`visible-worktrees.ts:293-297`).
- `src/lib/agent-status.ts:44-84` — query real de agentes por worktree por título, mas só emite
  `working` e não constrói entradas.

Consequência: as linhas de agente do sidebar do Hydra não cobrem retidos, aliases numéricos legados,
abas sintéticas, dedupe, ordenação determinística, linhagem nem subagentes.

## 2. Heurísticas de status/frescor: Orca vs motor Herdr (`src-tauri/src/agent_state.rs`)

O que **coincide**:

| Aspecto | Orca | Herdr |
|---|---|---|
| TTL de estagnação | `AGENT_STATUS_STALE_AFTER_MS = 1800000` | `AGENT_STATE_STALE_AFTER_MS = 30*60*1000` (`agent_state.rs:14`, comentário pina o valor do Orca) |
| Estado ativo estagnado com PTY vivo | `unverifiable` | `Unknown` (PTY vivo) / `Idle` (PTY morto) — `decay_state`, `agent_state.rs:79-87` |
| Estado ativo estagnado sem PTY | `idle` | `Idle` |
| Decaimento pass-through | dentro do TTL não muda | dentro do TTL não muda (comparação estrita `>`) |

O que **difere exatamente** (D05-007):

1. **`done` é terminal no Orca** ("permanecem 'done' indefinidamente"); no Herdr um `Done` além do TTL
   decai para `Idle` (`agent_state.rs:88-90`) — e o decaimento é persistido na leitura
   (`resolve_agent_state` → `insert_state_transition`, `lib.rs:883-896`). Divergência de comportamento,
   não só de nomenclatura.
2. **Vocabulário de estado**: o Orca deriva `unverifiable` como estado visual distinto. O Herdr mapeia
   para `unknown` (`agent_state.rs:69-77`), e o sidebar do Hydra nunca produz `unverifiable` para linhas
   de agente: `AgentStateDot` suporta (`src/components/AgentStateDot.tsx:15,36`) mas
   `resolveDecayedAgentRowState` (`src/lib/agent-row-decay-state.ts:24-31`) não tem callers e
   `WorktreeCardAgents` copia `agentStatusByPaneKey`/título sem decaimento.
3. **Relógio de medição**: o Orca mede o gap pelo relógio de observação (`evidenceObservedAt`; os testes
   do Orca medem "from the observation clock, not the delivery clock"); `decay_state` mede por
   `state_started_at` (`lib.rs:883`). O gate de frescor do frontend
   (`isFreshNonDoneAgentStatus`, `src/shared/agent-status-freshness.ts:37-52`) usa
   `evidenceObservedAt`/`mirroredEvidenceReceivedAt` — mas só alimenta filtros de worktree, não o estado
   da linha.
4. **`restoredUnconfirmed`**: no Orca decai imediatamente para `idle` mesmo recente; `decay_state` não
   conhece o campo (só o gate de frescor acima).

## 3. Módulos "auto-stub" que sustentam a aparência de port

Vários arquivos do sub-sistema existem apenas como casca (`// Auto-stub so the Orca port typechecks`),
com todos os exports `null` — arquivo existir ≠ funcionalidade:

- `src/hooks/ipc-events/agent-status-ipc-bridge.ts` (`registerAgentStatusIpcBridge = null`) — a ingestão
  IPC de status de agente não está ligada por esse caminho.
- `src/store/slices/agent-status-live-entry-builder.ts`, `agent-status-live-reducer.ts` — construção e
  redução de entradas live nulas.
- `src/store/slices/agent-status-orchestration-context.ts` (`mergeCurrentOrchestrationContext`,
  `orchestrationMapsEqual = null`) — o caminho de mescla de orquestração do store
  (`agent-status-orchestration-actions.ts:27-63`) chama nulls; `setRuntimeAgentOrchestrationByPaneKey`
  não tem caller externo.
- `src/store/slices/agent-status-freshness-scheduler.ts` (`createFreshnessScheduler = null`), chamado em
  `agent-status-runtime.ts:173-181`.
- `src/components/sidebar/smart-attention.ts:19-26` (`buildAttentionByWorktree`,
  `hasFreshAttributedAgentStatus = null`), importado e chamado por `smart-sort.ts:197-215`.
- `src/components/sidebar/worktree-title-derived-agent-rows.ts:3-4`
  (`resolveAgentTypeFromTerminalTitle = null`).
- `src/lib/runtime-pane-title-leaf-id.ts` (resolução de folha para títulos de painel dividido).
- `src/lib/agent-row-primary-text.ts` (títulos gerados por despacho).

## 4. Helpers reais porém mortos (semântica do Orca presente, efeito ausente)

- `mergeAgentStatusOrchestration` (`src/lib/agent-status-worktree-attribution.ts:38-53`): replicaria
  `entryWithRuntimeOrchestration` (match estrito taskId+dispatchId, preserva a referência). **0 callers.**
- `buildAgentRowLineageTree` (`src/components/sidebar/agent-row-lineage-model.ts:61`): linhagem/ciclo-segura.
  **0 callers.**
- `resolveDecayedAgentRowState` (`src/lib/agent-row-decay-state.ts:24-31`): destino `unverifiable` vs `idle`;
  o `agentNoUpdateLabel` irmão é usado (`compact-agent-row-labels.ts:141-142`), o resolver não.
- `migrationUnsupportedToAgentStatusEntry` (`src/lib/migration-unsupported-agent-entry.ts`): conversão de
  migração não suportada. **0 callers** no pipeline de linhas.
- `agentStatusOrder` (`worktree-card-agent-summary.ts:23`): prioridade de sumário, não a ordenação de
  linhas do Orca (`compareWorktreeAgentRows`).

## 5. Preferências persistidas sem consumidor

`agentsShowChildAgents`, `agentsCompactMode`, `agentsShowSearch` são definidas, hidratadas e gravadas
(`src/store/slices/ui/ui-slice-preference-actions.ts:167-181`, `ui-slice-hydration-actions.ts:189-191`)
mas nenhum `.tsx` as lê (busca 0 hits fora de store/types/constants). `agentsReadFilter` é a única
consumida — e o faz como filtro de **status** (`WorktreeSidebar.tsx:312,363`), não como filtro de
não-lidos do Orca.

## 6. Cross-walk PAR

- **PAR-66** ("Projeção de Subagentes Aninhados no Card", alvo `WorktreeCardAgents.tsx`) → `D05-010`
  (+ `D05-006`), `hydra_status: missing`. Registrado em `domains/_par-crosswalk.json`.
- Nenhum outro item `PAR-*` da spec cobre primariamente D05 (PAR-08 é multi-seleção de worktrees;
  PAR-74 é toggle de unread no card de worktree — superfícies fora das linhas de agente).

## 7. Método de busca (5 passos, aplicado por linha)

1. Nome: homônimos em `src/components/sidebar/**` (via `index/hydra_exports.json` + grep literal).
2. Marcação/semântica: strings/labels/`data-testid` (ex.: `Filter agents...`, `No agent sessions`,
   `optionsTarget`, `+N` de disclosure de subagentes).
3. Comportamento: consumidores (`grep -rn` por símbolo, excluindo testes) e o que alimenta o efeito.
4. Backend: `index/hydra_tauri_commands.json` + `#[tauri::command]` alcançado pelo caminho
   (`check_agent_state`/`check_agent_detailed_status` → `agent_state.rs`), com chamada
   confirmada do renderer (`App.tsx:1505`).
5. Não localizado: `missing` com a lista de buscas no campo `notes` do `.diff.json`.

## 8. Lacuna E1 — ações por-linha da lista de Agentes (nascida da falsificação)

O escape **E1** de `ledger/falsification-runtime.md` mostrou que o inventário não cobria três ações
que o Orca renderiza **por linha** da lista de Agentes do sidebar (montada em
`SidebarAgentsList.tsx:138` via `ActivityThreadListPane`), embora o manifesto de D05 não inclua os
arquivos `components/activity/**`:

| id nova | ação | evidência Orca | store Orca | status Hydra |
|---|---|---|---|---|
| `D05-021` | Mark thread as read (sino âmbar por linha) | `SidebarAgentsList.tsx:159`; `activity-thread-actions.ts:69-70`; `activity-thread-row.tsx:190,196,208`; `activity-thread-virtual-row.tsx:63` | `acknowledgeAgents([paneKey])` | `missing` |
| `D05-022` | Mark thread unread (sino cinza, hover-only, gate de seleção) | `SidebarAgentsList.tsx:160,162`; `activity-thread-actions.ts:73-74`; `activity-thread-row.tsx:217,220,231,240`; `activity-thread-virtual-row.tsx:64,68` | `unacknowledgeAgents([paneKey])` | `missing` |
| `D05-023` | Clear notification (X por thread `done`/`interrupted`) | `activity-thread-virtual-row.tsx:65`; `activity-thread-row.tsx:170,174,177`; `activity-clear-completed.ts:23,118,124-126` | `applyActivityClearedAt` + `dismissRetainedAgents` (+ `window.api.agentStatus.dropPersistedBatch`) | `missing` |

Por que `missing` (e não `partial`): no Hydra **não existe nenhuma ação por linha de agente**. A linha
de agente alcançável do mount (`WorktreeSidebar → WorktreeList → WorktreeCard →
worktree-card-parent-content.tsx:114 → WorktreeCardAgents → WorktreeCompactAgentsList →
CompactAgentRow`) só expõe ativação de painel (`CompactAgentRow.tsx:66-71`) e disclosure de
subagentes (`:103-171`). Os primitivos de store existem mas estão dormentes/desligados da superfície:

- `acknowledgeAgents` (`src/store/slices/ui/ui-slice-agent-actions.ts:36`) tem um único caller externo
  — o **auto-ack ao visualizar o painel** (`src/hooks/agent-auto-ack-surfaces.ts:86` +
  `useAutoAckViewedAgent.ts`), não um botão manual por linha.
- `unacknowledgeAgents` (`:37`), `applyActivityClearedAt` (`:39`) e `dismissRetainedAgents`
  (`src/store/slices/agent-status-retention-actions.ts:74`) **não têm caller externo** (0 hits fora de
  store/testes).
- O Hydra rastreia `manuallyUnreadTurnsByPaneKey` e tem um quick action de "Mark as unread" no
  **cabeçalho do card de worktree** (`worktree-card-presentation.tsx:88`, coberto por D04a-024) — outra
  superfície, não a linha de agente.
- O único "Clear" do sidebar de agentes do Hydra (`SidebarAgentsList.tsx:662`) limpa a **seleção
  múltipla**, não uma notificação de thread concluída.

Testes-spec que documentam as três linhas (fora do manifest de D05, citados como especificação):
`activity-thread-hover-card.test.tsx:132` e `:154`, `activity-thread-list-pane-collapsible.test.tsx:247`,
`activity-clear-completed.test.ts:124,195,211`.
