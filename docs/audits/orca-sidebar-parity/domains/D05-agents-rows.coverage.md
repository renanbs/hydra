# Cobertura de Domínio — D05-agents-rows

## Contagens de Cobertura

- **Arquivos produtivos**: 15/15 (100%)
- **Símbolos / Exports**: 45/45 (100%)
- **Testes**: 129/129 (100%)
- **Labels / Menu items**: 5/5 (100%)
- **Atalhos (hotkeys)**: 1/1 (100%)
- **Preferências (prefs)**: 0/0 (100%)
- **Timers / Watchers**: 1/1 (100%)
- **Subscrições de Store**: 1/1 (100%)
- **Preload / IPC Symbols**: 2/2 (100%)

---

## 1. Arquivos Produtivos (`files`)

| Arquivo Produtivo | Linhas | IDs de Capacidade Mapeados |
|---|---|---|
| `components/sidebar/SidebarAgentsList.tsx` | 192 | D05-001, D05-002, D05-003, D05-004 |
| `components/sidebar/useWorktreeAgentRows.ts` | 150 | D05-005 |
| `components/sidebar/worktree-agent-activity-summary.ts` | 307 | D05-011, D05-013 |
| `components/sidebar/worktree-agent-freshness-selector.ts` | 53 | D05-005, D05-014 |
| `components/sidebar/worktree-agent-live-index-patch.ts` | 111 | D05-015 |
| `components/sidebar/worktree-agent-orchestration-batch.ts` | 42 | D05-018 |
| `components/sidebar/worktree-agent-orchestration-index.ts` | 314 | D05-017 |
| `components/sidebar/worktree-agent-row-fallback-tab.ts` | 29 | D05-006, D05-019 |
| `components/sidebar/worktree-agent-row-orchestration.ts` | 49 | D05-006, D05-012 |
| `components/sidebar/worktree-agent-row-order.ts` | 24 | D05-006, D05-020 |
| `components/sidebar/worktree-agent-row-selectors.ts` | 309 | D05-005, D05-016 |
| `components/sidebar/worktree-agent-row-type.ts` | 30 | D05-006, D05-009 |
| `components/sidebar/worktree-agent-rows.ts` | 275 | D05-006, D05-007, D05-011 |
| `components/sidebar/worktree-subagent-child-rows.ts` | 72 | D05-006, D05-010 |
| `components/sidebar/worktree-title-derived-agent-rows.ts` | 330 | D05-008, D05-009 |

---

## 2. Símbolos e Exports (`symbols`)

| Arquivo de Origem | Símbolo Exportado | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/SidebarAgentsList.tsx` | `SidebarAgentsListProps` | `D05-001` |
| `components/sidebar/SidebarAgentsList.tsx` | `SidebarAgentsList` | `D05-001`, `D05-002`, `D05-003`, `D05-004` |
| `components/sidebar/SidebarAgentsList.tsx` | `default` (default export = `SidebarAgentsList`) | `D05-001` |
| `components/activity/activity-thread-actions.ts` | `markThreadRead` (fora do index.json de D05 — superfície E1) | `D05-021` |
| `components/activity/activity-thread-actions.ts` | `markThreadUnread` (fora do index.json de D05 — superfície E1) | `D05-022` |
| `components/activity/activity-clear-completed.ts` | `clearActivityThread` (fora do index.json de D05 — superfície E1) | `D05-023` |
| `components/activity/activity-clear-completed.ts` | `isClearableActivityThread` (fora do index.json de D05 — superfície E1) | `D05-023` |
| `components/sidebar/useWorktreeAgentRows.ts` | `useWorktreeAgentRows` | `D05-005` |
| `components/sidebar/worktree-agent-activity-summary.ts` | `WorktreeAgentActivitySummary` | `D05-013` |
| `components/sidebar/worktree-agent-activity-summary.ts` | `AgentActivityInput` | `D05-013` |
| `components/sidebar/worktree-agent-activity-summary.ts` | `selectWorktreeAgentActivitySummary` | `D05-013` |
| `components/sidebar/worktree-agent-freshness-selector.ts` | `EMPTY_WORKTREE_AGENT_FRESHNESS_SIGNATURE` | `D05-014` |
| `components/sidebar/worktree-agent-freshness-selector.ts` | `createWorktreeAgentFreshnessSelector` | `D05-014` |
| `components/sidebar/worktree-agent-live-index-patch.ts` | `LiveEntriesByWorktreeCache` | `D05-015` |
| `components/sidebar/worktree-agent-live-index-patch.ts` | `getLiveEntriesFullRebuildCountForTests` | `D05-015` |
| `components/sidebar/worktree-agent-live-index-patch.ts` | `recordLiveEntriesFullRebuild` | `D05-015` |
| `components/sidebar/worktree-agent-live-index-patch.ts` | `liveEntryWorktreeId` | `D05-015`, `D05-016` |
| `components/sidebar/worktree-agent-live-index-patch.ts` | `patchLiveEntriesByWorktree` | `D05-015` |
| `components/sidebar/worktree-agent-orchestration-batch.ts` | `releaseRuntimeAgentOrchestrationBatchCache` | `D05-018` |
| `components/sidebar/worktree-agent-orchestration-batch.ts` | `selectRuntimeAgentOrchestrationBatch` | `D05-018` |
| `components/sidebar/worktree-agent-orchestration-index.ts` | `EMPTY_WORKTREE_AGENT_ORCHESTRATION` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.ts` | `EMPTY_WORKTREE_AGENT_ORCHESTRATION_INDEX` | `D05-017`, `D05-018` |
| `components/sidebar/worktree-agent-orchestration-index.ts` | `releaseWorktreeAgentOrchestrationIndexCache` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.ts` | `_getWorktreeAgentOrchestrationIndexBuildCountForTest` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.ts` | `selectWorktreeAgentOrchestrationIndex` | `D05-017`, `D05-018` |
| `components/sidebar/worktree-agent-orchestration-index.ts` | `selectWorktreeAgentOrchestration` | `D05-017` |
| `components/sidebar/worktree-agent-row-fallback-tab.ts` | `effectiveWorktreeAgentRowStartedAt` | `D05-019` |
| `components/sidebar/worktree-agent-row-fallback-tab.ts` | `tabFromWorktreeAttributedStatusEntry` | `D05-019` |
| `components/sidebar/worktree-agent-row-orchestration.ts` | `entryWithRuntimeOrchestration` | `D05-012` |
| `components/sidebar/worktree-agent-row-order.ts` | `comparePaneKeysOrdinal` | `D05-020` |
| `components/sidebar/worktree-agent-row-order.ts` | `compareWorktreeAgentRows` | `D05-020` |
| `components/sidebar/worktree-agent-row-selectors.ts` | `EMPTY_LIVE_ENTRIES` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.ts` | `EMPTY_MIGRATION_UNSUPPORTED_ENTRIES` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.ts` | `EMPTY_RETAINED` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.ts` | `EMPTY_TERMINAL_LAYOUTS` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.ts` | `reuseArrayIfEqual` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.ts` | `getTabIdToWorktreeId` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.ts` | `selectLiveAgentStatusEntriesForWorktree` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.ts` | `selectMigrationUnsupportedEntriesForWorktree` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.ts` | `selectRetainedAgentEntriesForWorktree` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.ts` | `selectRuntimeAgentOrchestrationForWorktree` | `D05-017` |
| `components/sidebar/worktree-agent-row-selectors.ts` | `selectTerminalLayoutsForWorktree` | `D05-016` |
| `components/sidebar/worktree-agent-row-type.ts` | `resolveRowAgentType` | `D05-009` |
| `components/sidebar/worktree-agent-rows.ts` | `buildWorktreeAgentRows` | `D05-006`, `D05-007` |
| `components/sidebar/worktree-subagent-child-rows.ts` | `buildSubagentChildRows` | `D05-010` |
| `components/sidebar/worktree-title-derived-agent-rows.ts` | `TITLE_DERIVED_AGENT_ROW_AUTHORITY_ID` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.ts` | `buildTitleDerivedAgentRows` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.ts` | `resolveTitleDerivedAgentType` | `D05-008`, `D05-009` |
| `components/sidebar/worktree-title-derived-agent-rows.ts` | `resolveAgentTypeFromTerminalTitle` | `D05-009` |

---

## 3. Casos de Teste (`tests`)

| Arquivo de Teste e Linha | Identificador / Nome do Teste | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/SidebarAgentsList.test.tsx:25` | `preserves workspace focus on mount and focuses search only when explicitly enabled` | `D05-002` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:62` | `a stale entry on a pane Orca still holds` | `INFRA: bloco describe de agrupamento de testes de unverifiable/stale` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:63` | `reads ` | `D05-007` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:67` | `never claims the agent finished` | `D05-007` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:82` | `reports the observed gap rather than a verdict on the agent` | `D05-007` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:93` | `measures the gap from the observation clock, not the delivery clock` | `D05-007` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:108` | `negative controls` | `INFRA: bloco describe de agrupamento de testes de unverifiable/stale` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:109` | `a pane with no live PTY still reads ` | `D05-007` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:113` | `a live pane with fresh events still reads ` | `D05-007` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:117` | `a ` | `D05-007` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:122` | `a row hydrated from disk with no live hook since stays ` | `D05-007` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:128` | `smart-attention ordering` | `INFRA: bloco describe de agrupamento de testes de unverifiable/stale` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:131` | `ranks an unverifiable pane below a reporting one` | `D05-007` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:137` | `ranks an unverifiable pane above a genuinely idle one` | `D05-007` |
| `components/sidebar/stale-agent-row-unverifiable.test.ts:144` | `orders unverifiable panes by how recently each was last heard from` | `D05-007` |
| `components/sidebar/useWorktreeAgentRows.test.ts:92` | `buildWorktreeAgentRows` | `INFRA: bloco describe de agrupamento de testes de linhas de agente` |
| `components/sidebar/useWorktreeAgentRows.test.ts:93` | `includes retained rows even when their original tab is no longer current` | `D05-006` |
| `components/sidebar/useWorktreeAgentRows.test.ts:110` | `resolves retained unknown Claude rows from their terminal title` | `D05-009` |
| `components/sidebar/useWorktreeAgentRows.test.ts:129` | `resolves live unknown rows from the launched tab agent` | `D05-009` |
| `components/sidebar/useWorktreeAgentRows.test.ts:145` | `prefers an unrelated live title over the launched tab agent for unknown rows` | `D05-009` |
| `components/sidebar/useWorktreeAgentRows.test.ts:161` | `normalizes live Pi-compatible rows from the launched OMP tab agent` | `D05-009` |
| `components/sidebar/useWorktreeAgentRows.test.ts:177` | `resolves retained unknown rows from the launched tab agent` | `D05-009` |
| `components/sidebar/useWorktreeAgentRows.test.ts:196` | `prefers a live row over a retained snapshot with the same paneKey` | `D05-006` |
| `components/sidebar/useWorktreeAgentRows.test.ts:210` | `dedupes retained legacy numeric rows for a single current stable pane` | `D05-006` |
| `components/sidebar/useWorktreeAgentRows.test.ts:229` | `keeps a retained legacy numeric row for a different split pane` | `D05-006` |
| `components/sidebar/useWorktreeAgentRows.test.ts:248` | `decays a stale working entry to idle but leaves a stale done entry alone` | `D05-007` |
| `components/sidebar/useWorktreeAgentRows.test.ts:272` | `decays a restored-unconfirmed working entry to idle even while recent` | `D05-007` |
| `components/sidebar/useWorktreeAgentRows.test.ts:293` | `renders live worktree-attributed entries even when their tab is absent` | `D05-006` |
| `components/sidebar/useWorktreeAgentRows.test.ts:318` | `keeps simultaneous worktree-attributed agents in a deterministic order` | `D05-006` |
| `components/sidebar/useWorktreeAgentRows.test.ts:357` | `keeps missing-tab row order stable after real state transitions` | `D05-006` |
| `components/sidebar/useWorktreeAgentRows.test.ts:386` | `anchors missing-tab row order to the oldest state history entry` | `D05-006` |
| `components/sidebar/useWorktreeAgentRows.test.ts:419` | `uses ordinal pane-key comparison for final row ordering ties` | `D05-006` |
| `components/sidebar/useWorktreeAgentRows.test.ts:423` | `uses runtime orchestration metadata for hook-reported live rows` | `D05-012` |
| `components/sidebar/useWorktreeAgentRows.test.ts:454` | `does not override current hook dispatch identity with mismatched runtime metadata` | `D05-012` |
| `components/sidebar/useWorktreeAgentRows.test.ts:501` | `uses runtime orchestration metadata for retained child rows` | `D05-012` |
| `components/sidebar/useWorktreeAgentRows.test.ts:529` | `does not synthesize a working parent row for a completed worktree-attributed worker` | `D05-011` |
| `components/sidebar/useWorktreeAgentRows.test.ts:562` | `does not synthesize a working parent row for a retained completed worker` | `D05-011` |
| `components/sidebar/useWorktreeAgentRows.test.ts:595` | `groups child rows by parent terminal handle when parent pane key is missing` | `D05-011` |
| `components/sidebar/useWorktreeAgentRows.test.ts:625` | `applyAgentRowLineage` | `INFRA: bloco describe de agrupamento de testes de linhas de agente` |
| `components/sidebar/useWorktreeAgentRows.test.ts:626` | `places orchestration children immediately after their parent` | `D05-011` |
| `components/sidebar/useWorktreeAgentRows.test.ts:671` | `leaves orphan orchestration rows flat when the parent pane is not visible` | `D05-011` |
| `components/sidebar/useWorktreeAgentRows.test.ts:690` | `keeps nested dispatches under their nearest visible parent` | `D05-011` |
| `components/sidebar/useWorktreeAgentRows.test.ts:728` | `derives indented child rows for a live entry with in-process subagents` | `D05-010` |
| `components/sidebar/useWorktreeAgentRows.test.ts:771` | `marks working subagent child rows unverifiable when the parent status is stale` | `D05-010` |
| `components/sidebar/useWorktreeAgentRows.test.ts:787` | `surfaces a live subagent waiting state` | `D05-010` |
| `components/sidebar/useWorktreeAgentRows.test.ts:802` | `does not derive subagent child rows for retained snapshots` | `D05-010` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:60` | `selectWorktreeAgentActivitySummary` | `INFRA: bloco describe de agrupamento de testes de activity summary` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:65` | `builds one cached agent summary index for multiple worktree lookups` | `D05-013` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:102` | `reuses the cached summary when same-state agent pings only clone the status map` | `D05-013` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:141` | `rebuilds the summary when the agent status epoch changes` | `D05-013` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:178` | `separates passive monitoring from active working` | `D05-013` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:202` | `separates interrupted outcomes from clean completion` | `D05-013` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:226` | `lets an unconfirmed restored row suppress only its pane title` | `D05-013` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:253` | `limits summary-reference churn to the transitioning worktree at scale` | `D05-013` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:304` | `reuses only summaries whose pane membership is still current` | `D05-013` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:366` | `summarizes worktree-attributed rows missing from the tab list` | `D05-013` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:391` | `uses completed worker orchestration to suppress a stale parent pane title` | `D05-011` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:417` | `uses runtime orchestration metadata for completed worker parent-pane suppression` | `D05-011` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:452` | `records a stale entry pane id separately so permission titles stay suppressed` | `D05-013` |
| `components/sidebar/worktree-agent-activity-summary.test.ts:477` | `does not paint a stale self-authored action-required title as a live question` | `D05-013` |
| `components/sidebar/worktree-agent-freshness-selector.test.ts:55` | `createWorktreeAgentFreshnessSelector` | `INFRA: bloco describe de agrupamento de testes de freshness selector` |
| `components/sidebar/worktree-agent-freshness-selector.test.ts:56` | `changes only the worktree whose row crosses the stale boundary` | `D05-014` |
| `components/sidebar/worktree-agent-freshness-selector.test.ts:73` | `does constant work for same-epoch status-map churn` | `D05-014` |
| `components/sidebar/worktree-agent-orchestration-batch.test.ts:107` | `selectRuntimeAgentOrchestrationBatch` | `INFRA: bloco describe de agrupamento de testes de orchestration batch` |
| `components/sidebar/worktree-agent-orchestration-batch.test.ts:108` | `short-circuits empty requests and empty runtime before reading unrelated slices` | `D05-018` |
| `components/sidebar/worktree-agent-orchestration-batch.test.ts:144` | `matches the per-worktree selector across every attribution path and runtime order` | `D05-018` |
| `components/sidebar/worktree-agent-orchestration-batch.test.ts:210` | `invalidates every source while preserving unchanged ordered bucket identities` | `D05-018` |
| `components/sidebar/worktree-agent-orchestration-batch.test.ts:294` | `leaves the shared index intact for an empty request and rebuilds after an empty runtime` | `D05-018` |
| `components/sidebar/worktree-agent-orchestration-batch.test.ts:334` | `matches the per-worktree selector for a single requested worktree` | `D05-018` |
| `components/sidebar/worktree-agent-orchestration-batch.test.ts:427` | `collapses multi-worktree runtime scans and caches unchanged publications` | `D05-018` |
| `components/sidebar/worktree-agent-orchestration-batch.test.ts:576` | `selectRuntimeAgentOrchestrationBatch live-map churn` | `INFRA: bloco describe de agrupamento de testes de orchestration batch` |
| `components/sidebar/worktree-agent-orchestration-batch.test.ts:605` | `rebuilds once across repeated agentStatus:set identity churn on unrelated panes` | `D05-018` |
| `components/sidebar/worktree-agent-orchestration-batch.test.ts:631` | `reads each orchestrated pane out of the live and retained maps once per build` | `D05-018` |
| `components/sidebar/worktree-agent-orchestration-batch.test.ts:671` | `rebuilds when an orchestrated pane changes worktree or the entry set changes` | `D05-018` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:115` | `selectWorktreeAgentOrchestration` | `INFRA: bloco describe de agrupamento de testes de orchestration index` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:120` | `matches the pre-index per-card selector across randomized stores` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:208` | `returns one shared empty record for worktrees with no orchestration` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:224` | `keeps record identity stable across publications that change nothing it reads` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:254` | `does not rebuild when agentStatus:set replaces the live map without moving a pane` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:293` | `projects the live and retained maps once per publication, not once per card` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:342` | `rebuilds when a source it reads actually changes` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:372` | `treats a missing or emptied orchestration map as empty without reading other slices` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:399` | `does not attribute unowned panes to a nullish worktree id` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:418` | `stays correct when two stores interleave through the single cache slot` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:451` | `treats a __proto__ pane key as data instead of a prototype write` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:468` | `keeps the entries cache warm while the orchestration map is empty` | `D05-017` |
| `components/sidebar/worktree-agent-orchestration-index.test.ts:496` | `never mutates a record already handed to a subscriber` | `D05-017` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:68` | `selectMigrationUnsupportedEntriesForWorktree` | `INFRA: bloco describe de agrupamento de testes de row selectors` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:69` | `returns raw migration records so shallow selectors can cache snapshots` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:100` | `selectLiveAgentStatusEntriesForWorktree` | `INFRA: bloco describe de agrupamento de testes de row selectors` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:101` | `reuses unaffected worktree arrays when another worktree receives a same-state ping` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:147` | `uses worktree attribution when the status tab is not in the renderer tab list` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:167` | `keeps an idle structured session visible while its unified tab exists` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:205` | `patches instead of full-rebuilding across within-state pings, and stays correct on transitions` | `D05-015` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:275` | `falls back to a full rebuild when a within-map update changes worktree attribution` | `D05-015` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:298` | `falls back to a full rebuild when a live entry completes with its tab gone` | `D05-015` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:320` | `does not use worktree attribution for a completed row whose tab is gone` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:342` | `selectRuntimeAgentOrchestrationForWorktree` | `INFRA: bloco describe de agrupamento de testes de row selectors` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:343` | `includes child orchestration metadata when only the parent tab is in the worktree` | `D05-017` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:365` | `includes child orchestration metadata for a worktree-attributed live row without tab membership` | `D05-017` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:392` | `includes child orchestration metadata for a retained worktree row without tab membership` | `D05-017` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:418` | `selectRetainedAgentEntriesForWorktree` | `INFRA: bloco describe de agrupamento de testes de row selectors` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:419` | `reuses unaffected worktree arrays when another worktree retained row changes` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:454` | `selectTerminalLayoutsForWorktree` | `INFRA: bloco describe de agrupamento de testes de row selectors` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:464` | `returns one identity per store generation` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:475` | `returns the shared frozen empty for a worktree with no tabs` | `D05-016` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:484` | `inactive-card empty constants` | `INFRA: bloco describe de agrupamento de testes de row selectors` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:485` | `are frozen and shared` | `D05-016` |
| `components/sidebar/worktree-subagent-child-rows.test.ts:17` | `shared CLI and structured child freshness` | `INFRA: bloco describe de agrupamento de testes de subagent child rows` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:46` | `buildTitleDerivedAgentRows` | `INFRA: bloco describe de agrupamento de testes de title derived agent rows` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:47` | `adds title-derived rows for live agent panes that have no hook status yet` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:73` | `normalizes Pi-compatible title-derived rows to the launched OMP owner` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:113` | `keeps Pi-compatible title-derived rows as Pi for launched Pi sessions` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:133` | `does not add title-derived rows for panes without a live PTY` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:149` | `uses runtime orchestration metadata for title-derived worker rows` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:186` | `does not infer Claude Code from a spinner-only non-agent title` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:202` | `adds an idle Claude row for the Claude agents surface` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:225` | `attributes a spinner-only title to the launched agent when the title has no identity` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:245` | `keeps explicit title identity over the launched agent` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:262` | `produces no row for a spinner-only title when the tab has no launch identity` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:279` | `does not turn generic Codex-launched task titles into Claude Code rows` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:297` | `adds an idle Cursor row for the bare native cursor-agent title` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:313` | `keeps the Cursor row running while a synthesized spinner title is painted` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:328` | `keeps an OpenCode-launched pane OpenCode across its own status frames` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:357` | `rows an OpenCode pane from its undecorated native session title` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:371` | `still resolves Claude from a title that presents Claude, owner or not` | `D05-008` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:391` | `does not brand a split pane with the tab-scoped launch agent` | `D05-008` |
| `components/sidebar/worktree-agent-freshness-selector.test.ts:92` | `wakes a %s row when it becomes stale` | `D05-014` |
| `components/sidebar/worktree-subagent-child-rows.test.ts:34` | `%s with fresh parent %s and transport %s projects %s` | `D05-010` |
| `components/sidebar/worktree-title-derived-agent-rows.test.ts:97` | `retains hook-less OMP rows for owner marker %s` | `D05-008` |
| `components/activity/activity-thread-hover-card.test.tsx:132` | `marks an unread thread as read from its bell without selecting the row` | `D05-021` |
| `components/activity/activity-thread-list-pane-collapsible.test.tsx:247` | `keeps mark-unread enabled for the thread whose terminal pane is selected` | `D05-022` |
| `components/activity/activity-thread-hover-card.test.tsx:154` | `clears from a keyboard-reachable row action without selecting the row` | `D05-023` |
| `components/activity/activity-clear-completed.test.ts:124` | `clears only completed and interrupted threads` | `D05-023` |
| `components/activity/activity-clear-completed.test.ts:195` | `clears one thread immediately without bulk-clear feedback` | `D05-023` |
| `components/activity/activity-clear-completed.test.ts:211` | `does not clear one active thread` | `D05-023` |

---

## 4. Labels e Textos Literais (`labels`)

| Arquivo e Linha | Texto / Label | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/SidebarAgentsList.test.tsx:5` | `import { TooltipProvider } from '@/components/ui/tooltip'` | `INFRA: import de teste em SidebarAgentsList.test.tsx` |
| `components/sidebar/SidebarAgentsList.tsx:126` | `placeholder={translate(` | `D05-002` |
| `components/sidebar/SidebarAgentsList.tsx:131` | `aria-label={translate(` | `D05-002` |
| `components/sidebar/worktree-agent-row-selectors.test.ts:180` | `label: 'Codex Chat',` | `INFRA: fixture mock de teste em worktree-agent-row-selectors.test.ts` |
| `components/sidebar/worktree-title-derived-agent-rows.ts:230` | `label: string,` | `D05-008` |
| `components/activity/activity-thread-row.tsx:196,208` | `Mark thread as read` (aria-label + tooltip) | `D05-021` |
| `components/activity/activity-thread-row.tsx:231,240` | `Mark thread unread` (aria-label + tooltip) | `D05-022` |
| `components/activity/activity-thread-row.tsx:174` | `Clear notification` (aria-label + tooltip) | `D05-023` |

---

## 5. Atalhos de Teclado (`hotkeys`)

| Arquivo e Linha | Atalho / Evento | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/SidebarAgentsList.tsx:122` | `if (event.key === 'Escape') {` | `D05-002` |

---

## 6. Preferências e Persistência (`prefs`)

| Chave de Preferência | Descrição | Mapeamento / Justificativa |
|---|---|---|
| *(nenhuma preferência direta em index.json)* | - | N/A |

---

## 7. Timers e Watchers (`timers`)

| Arquivo e Linha | Timer / Job | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/SidebarAgentsList.tsx:60` | `requestAnimationFrame(() => activityFilterInputRef.current?.focus())` | `D05-002` |

---

## 8. Subscrições e Efeitos (`subscriptions`)

| Arquivo e Linha | Subscrição / Listener | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/SidebarAgentsList.tsx:74` | `useEffect(() => {` | `D05-003` |

---

## 9. Preload e Contratos Backend (`preload`)

| Arquivo e Linha | Símbolo / Chamada IPC | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/SidebarAgentsList.test.tsx:63` | `expect(window.api.ui.set).toHaveBeenCalledWith({ agentsShowSearch: false })` | `D05-002` |
| `components/sidebar/SidebarAgentsList.test.tsx:64` | `expect(window.api.ui.set).toHaveBeenCalledWith({ agentsShowSearch: true })` | `D05-002` |

---

## 10. Lista Explícita de Itens N/A, INFRA e DUP

### Justificativas de Infraestrutura / Tipagem / Fixtures:

- **Teste**: `components/sidebar/stale-agent-row-unverifiable.test.ts:62 :: a stale entry on a pane Orca still holds` → INFRA: bloco describe de agrupamento de testes de unverifiable/stale
- **Teste**: `components/sidebar/stale-agent-row-unverifiable.test.ts:108 :: negative controls` → INFRA: bloco describe de agrupamento de testes de unverifiable/stale
- **Teste**: `components/sidebar/stale-agent-row-unverifiable.test.ts:128 :: smart-attention ordering` → INFRA: bloco describe de agrupamento de testes de unverifiable/stale
- **Teste**: `components/sidebar/useWorktreeAgentRows.test.ts:92 :: buildWorktreeAgentRows` → INFRA: bloco describe de agrupamento de testes de linhas de agente
- **Teste**: `components/sidebar/useWorktreeAgentRows.test.ts:625 :: applyAgentRowLineage` → INFRA: bloco describe de agrupamento de testes de linhas de agente
- **Teste**: `components/sidebar/worktree-agent-activity-summary.test.ts:60 :: selectWorktreeAgentActivitySummary` → INFRA: bloco describe de agrupamento de testes de activity summary
- **Teste**: `components/sidebar/worktree-agent-freshness-selector.test.ts:55 :: createWorktreeAgentFreshnessSelector` → INFRA: bloco describe de agrupamento de testes de freshness selector
- **Teste**: `components/sidebar/worktree-agent-orchestration-batch.test.ts:107 :: selectRuntimeAgentOrchestrationBatch` → INFRA: bloco describe de agrupamento de testes de orchestration batch
- **Teste**: `components/sidebar/worktree-agent-orchestration-batch.test.ts:576 :: selectRuntimeAgentOrchestrationBatch live-map churn` → INFRA: bloco describe de agrupamento de testes de orchestration batch
- **Teste**: `components/sidebar/worktree-agent-orchestration-index.test.ts:115 :: selectWorktreeAgentOrchestration` → INFRA: bloco describe de agrupamento de testes de orchestration index
- **Teste**: `components/sidebar/worktree-agent-row-selectors.test.ts:68 :: selectMigrationUnsupportedEntriesForWorktree` → INFRA: bloco describe de agrupamento de testes de row selectors
- **Teste**: `components/sidebar/worktree-agent-row-selectors.test.ts:100 :: selectLiveAgentStatusEntriesForWorktree` → INFRA: bloco describe de agrupamento de testes de row selectors
- **Teste**: `components/sidebar/worktree-agent-row-selectors.test.ts:342 :: selectRuntimeAgentOrchestrationForWorktree` → INFRA: bloco describe de agrupamento de testes de row selectors
- **Teste**: `components/sidebar/worktree-agent-row-selectors.test.ts:418 :: selectRetainedAgentEntriesForWorktree` → INFRA: bloco describe de agrupamento de testes de row selectors
- **Teste**: `components/sidebar/worktree-agent-row-selectors.test.ts:454 :: selectTerminalLayoutsForWorktree` → INFRA: bloco describe de agrupamento de testes de row selectors
- **Teste**: `components/sidebar/worktree-agent-row-selectors.test.ts:484 :: inactive-card empty constants` → INFRA: bloco describe de agrupamento de testes de row selectors
- **Teste**: `components/sidebar/worktree-subagent-child-rows.test.ts:17 :: shared CLI and structured child freshness` → INFRA: bloco describe de agrupamento de testes de subagent child rows
- **Teste**: `components/sidebar/worktree-title-derived-agent-rows.test.ts:46 :: buildTitleDerivedAgentRows` → INFRA: bloco describe de agrupamento de testes de title derived agent rows
- **Label**: `import { TooltipProvider } from '@/components/ui/tooltip'` → INFRA: import de teste em SidebarAgentsList.test.tsx
- **Label**: `label: 'Codex Chat',` → INFRA: fixture mock de teste em worktree-agent-row-selectors.test.ts

---

## 11. Linhas nascidas da falsificação de runtime (escape E1)

Adicionadas em `D05-021`–`D05-023` após o relatório adversarial
`ledger/falsification-runtime.md` (escape **E1**: ações por-linha da lista de Agentes do sidebar).
As ações são renderizadas por `ActivityThreadRow` dentro de `ActivityThreadListPane`, que é montado
por `SidebarAgentsList.tsx:138`, mas vivem em `components/activity/**` — fora do manifest produtivo de
D05 e, por isso, sem obrigação de `files`/`symbols` no `index.json`. Os rótulos e símbolos
correspondentes foram registrados em `coverage.labels`/`coverage.symbols` para rastreabilidade.

| id | ação por-linha | evidência Orca (arquivo:linha) | store acionado | teste-spec |
|---|---|---|---|---|
| `D05-021` | Mark thread as read | `SidebarAgentsList.tsx:159`, `activity-thread-actions.ts:69-70`, `activity-thread-row.tsx:190,196,208`, `activity-thread-virtual-row.tsx:63` | `acknowledgeAgents` | `activity-thread-hover-card.test.tsx:132` |
| `D05-022` | Mark thread unread | `SidebarAgentsList.tsx:160,162`, `activity-thread-actions.ts:73-74`, `activity-thread-row.tsx:217,220,231,240`, `activity-thread-virtual-row.tsx:64,68` | `unacknowledgeAgents` | `activity-thread-list-pane-collapsible.test.tsx:247` |
| `D05-023` | Clear notification (thread concluída individual) | `activity-thread-virtual-row.tsx:65`, `activity-thread-row.tsx:170,174,177`, `activity-clear-completed.ts:23,118,120,124-126` | `applyActivityClearedAt` + `dismissRetainedAgents` (+ `dropPersistedBatch`) | `activity-thread-hover-card.test.tsx:154`, `activity-clear-completed.test.ts:124,195,211` |

Escopo confirmado para não superdeclarar: `showJumpAction={false}` (SidebarAgentsList.tsx:163) oculta
apenas "Jump to workspace" (`activity-thread-row.tsx:159`); o sino lido/não-lido é renderizado
incondicionalmente (`:186-244`) e o X de "Clear notification" é renderizado sempre que `onClear`
existe, isto é, quando `isClearableActivityThread` é verdadeiro (`activity-thread-virtual-row.tsx:65`).
`showInlineActions={false}` afeta somente os botões em lote do toolbar
(`activity-thread-list-toolbar.tsx:190`), não as ações por-linha.