# Cobertura de Paridade — Domínio D11: Lineage & Grouping Model

## Resumo Executivo de Cobertura

- **Domínio**: `D11-lineage-grouping-model`
- **Linhas de inventário (capabilities)**: 17
- **Arquivos produtivos**: 15/15 (100%)
- **Símbolos exportados**: 47/47 (100%)
- **Testes de especificação**: 115/115 (100%)
- **Menu Labels / Tooltips**: 13/13 (100%)
- **Atalhos / Hotkeys**: 10/10 (100%)
- **Preferências (prefs)**: 0/0 (N/A)
- **Timers**: 0/0 (N/A)
- **Subscriptions**: 0/0 (N/A)
- **Preload / IPC**: 0/0 (N/A)
- **Violações**: 0

---

## 1. Inventário de Funcionalidades (Capabilities)

| ID | Habilidade / Regra de Derivação | Superfície | Evidência Principal | Testes Associados |
|---|---|---|---|---|
| **D11-001** | Identificação de workspaces da branch padrão para controle de visibilidade derivada e filtragem | pipeline de visibilidade do sidebar / filtros de visualização | `components/sidebar/default-branch-workspace.ts:4` | N/A (lógica pura/hook) |
| **D11-002** | Extração de IDs de worktrees em seus grupos naturais com exclusão de duplicatas da seção fixada | modelos de ordenação e drag-and-drop do sidebar | `components/sidebar/natural-worktree-ids.ts:16` | 4 casos de teste |
| **D11-003** | Determinação de worktrees da seção Pinned por fixação explícita ou herança de linhagem de ancestrais fixados | seção Pinned do sidebar / agrupamento de worktrees | `components/sidebar/pinned-section-worktrees.ts:8`<br>`components/sidebar/pinned-section-worktrees.ts:43` | 10 casos de teste |
| **D11-004** | Derivação de estado, tooltips e requisitos de reconexão para criação de worktree no header do repositório | botão de criação no header de repositório / grupo de projeto no sidebar | `components/sidebar/repo-header-create-state.ts:14` | 4 casos de teste |
| **D11-005** | Hook de resolução de preferências de visibilidade padrão do proprietário do repositório | componentes do sidebar que consultam visibilidade padrão por repositório/host | `components/sidebar/use-repo-owner-visibility-defaults.ts:6` | N/A (lógica pura/hook) |
| **D11-006** | Projeção memoizada de atividade de abas de terminal e navegador por worktree | pipeline de cálculo de worktrees ativas/inativas no sidebar | `components/sidebar/visible-worktree-activity-inputs.ts:8`<br>`components/sidebar/visible-worktree-activity-inputs.ts:20`<br>`components/sidebar/visible-worktree-activity-inputs.ts:31` | 8 casos de teste |
| **D11-007** | Resolução e correspondência de escopo de host executor para visibilidade de worktrees | pipeline de visibilidade do sidebar / filtro de hosts executores | `components/sidebar/visible-worktree-host-scope.ts:14`<br>`components/sidebar/visible-worktree-host-scope.ts:23` | N/A (lógica pura/hook) |
| **D11-008** | Indexação memoizada via WeakMap de ancestrais não-arquivados e ranks de ordenação | camada interna de cache do pipeline de visibilidade do sidebar | `components/sidebar/visible-worktree-indexes.ts:20`<br>`components/sidebar/visible-worktree-indexes.ts:41` | 4 casos de teste |
| **D11-009** | Predicados de classificação de tipos de workspace para filtros e badges do sidebar | filtros de visibilidade, badges e menu de ações do sidebar | `components/sidebar/visible-worktree-kinds.ts:12`<br>`components/sidebar/visible-worktree-kinds.ts:24`<br>`components/sidebar/visible-worktree-kinds.ts:31`<br>`components/sidebar/visible-worktree-kinds.ts:35`<br>`components/sidebar/visible-worktree-kinds.ts:47`<br>`components/sidebar/visible-worktree-kinds.ts:52` | N/A (lógica pura/hook) |
| **D11-010** | Pipeline central de cálculo e composição de filtros de worktrees visíveis com injeção de ancestrais | lista de worktrees no sidebar / atalhos / jump palette | `components/sidebar/visible-worktrees.ts:88`<br>`components/sidebar/visible-worktrees.ts:186`<br>`components/sidebar/visible-worktrees.ts:221`<br>`components/sidebar/visible-worktrees.ts:269` | 37 casos de teste |
| **D11-011** | Publicação e resolução de IDs e alvos para atalhos globais de teclado espelhando a ordem visual renderizada | atalhos de teclado do app (Cmd+1..9) / cache de renderização do WorktreeList | `components/sidebar/visible-worktrees.ts:244`<br>`components/sidebar/visible-worktrees.ts:250`<br>`components/sidebar/visible-worktrees.ts:254`<br>`components/sidebar/visible-worktrees.ts:304`<br>`components/sidebar/visible-worktrees.ts:358` | N/A (lógica pura/hook) |
| **D11-012** | Isolamento de visibilidade de workspaces criados por outros dispositivos pareados | pipeline de visibilidade do sidebar para ambientes com pareamento de múltiplos dispositivos | `components/sidebar/workspace-creator-visibility.ts:10`<br>`components/sidebar/workspace-creator-visibility.ts:12`<br>`components/sidebar/workspace-creator-visibility.ts:27`<br>`components/sidebar/workspace-creator-visibility.ts:46`<br>`components/sidebar/workspace-creator-visibility.ts:56` | 4 casos de teste |
| **D11-013** | Geometria de hit-zone de drag-and-drop para aninhamento de linhagem e cálculo de desaninhamento em reordenação | interação de drag-and-drop no card de worktree no sidebar | `components/sidebar/worktree-lineage-drag-drop.ts:13`<br>`components/sidebar/worktree-lineage-drag-drop.ts:28`<br>`components/sidebar/worktree-lineage-drag-drop.ts:61` | 11 casos de teste |
| **D11-014** | Projeção de linhagem de worktrees, detecção de ciclos com memoização WeakMap e travessia hierárquica | árvore hierárquica de worktrees no sidebar / agrupamento e renderização de cards aninhados | `components/sidebar/worktree-lineage-projection.ts:8`<br>`components/sidebar/worktree-lineage-projection.ts:15`<br>`components/sidebar/worktree-lineage-projection.ts:60`<br>`components/sidebar/worktree-lineage-projection.ts:84`<br>`components/sidebar/worktree-lineage-projection.ts:105`<br>`components/sidebar/worktree-lineage-projection.ts:128` | 5 casos de teste |
| **D11-015** | Cache de manipuladores de toggle de grupos de linhagem para estabilidade referencial | botão de expansão/colapso de árvore de linhagem no card de worktree pai | `components/sidebar/worktree-lineage-toggle-handler-cache.ts:3`<br>`components/sidebar/worktree-lineage-toggle-handler-cache.ts:9` | 4 casos de teste |
| **D11-016** | Índice de IDs de worktree inequívocos com detecção e remoção de colisões multi-host | resolução de worktrees por ID em operações sem contexto explícito de host | `components/sidebar/worktree-unambiguous-id-index.ts:3` | 3 casos de teste |
| **D11-017** | Expansão O(N) de linhagem visível para seleção múltipla e reordenação profunda | arrasto e reordenação de múltiplos cards com linhagem no sidebar | `components/sidebar/worktree-lineage-expansion.performance.test.ts:37` | 3 casos de teste |

---

## 2. Cobertura de Arquivos Produtivos (15/15)

| Arquivo Produtivo | Linhas (LOC) | IDs de Capability |
|---|---|---|
| `components/sidebar/default-branch-workspace.ts` | 10 | `D11-001` |
| `components/sidebar/natural-worktree-ids.ts` | 24 | `D11-002` |
| `components/sidebar/pinned-section-worktrees.ts` | 56 | `D11-003` |
| `components/sidebar/repo-header-create-state.ts` | 70 | `D11-004` |
| `components/sidebar/use-repo-owner-visibility-defaults.ts` | 12 | `D11-005` |
| `components/sidebar/visible-worktree-activity-inputs.ts` | 35 | `D11-006` |
| `components/sidebar/visible-worktree-host-scope.ts` | 42 | `D11-007` |
| `components/sidebar/visible-worktree-indexes.ts` | 49 | `D11-008` |
| `components/sidebar/visible-worktree-kinds.ts` | 74 | `D11-009` |
| `components/sidebar/visible-worktrees.ts` | 380 | `D11-010`, `D11-011` |
| `components/sidebar/workspace-creator-visibility.ts` | 63 | `D11-012` |
| `components/sidebar/worktree-lineage-drag-drop.ts` | 86 | `D11-013` |
| `components/sidebar/worktree-lineage-projection.ts` | 147 | `D11-014` |
| `components/sidebar/worktree-lineage-toggle-handler-cache.ts` | 26 | `D11-015` |
| `components/sidebar/worktree-unambiguous-id-index.ts` | 17 | `D11-016` |

---

## 3. Cobertura de Símbolos Exportados (47/47)

| Arquivo | Símbolo Exportado | ID / Justificativa |
|---|---|---|
| `components/sidebar/default-branch-workspace.ts` | `isDefaultBranchWorkspace` | `D11-001` |
| `components/sidebar/natural-worktree-ids.ts` | `getNaturalWorktreeIds` | `D11-002` |
| `components/sidebar/pinned-section-worktrees.ts` | `getPinnedSectionWorktrees` | `D11-003` |
| `components/sidebar/pinned-section-worktrees.ts` | `isPinnedSectionWorktree` | `D11-003` |
| `components/sidebar/repo-header-create-state.ts` | `RepoHeaderCreateState` | `D11-004` |
| `components/sidebar/repo-header-create-state.ts` | `getRepoHeaderCreateState` | `D11-004` |
| `components/sidebar/use-repo-owner-visibility-defaults.ts` | `useRepoOwnerVisibilityDefaults` | `D11-005` |
| `components/sidebar/visible-worktree-activity-inputs.ts` | `TerminalActivityTab` | `D11-006` |
| `components/sidebar/visible-worktree-activity-inputs.ts` | `BrowserActivityTab` | `D11-006` |
| `components/sidebar/visible-worktree-activity-inputs.ts` | `createVisibleWorktreeTerminalActivityProjection` | `D11-006` |
| `components/sidebar/visible-worktree-activity-inputs.ts` | `getVisibleWorktreeTerminalActivityTabs` | `D11-006` |
| `components/sidebar/visible-worktree-activity-inputs.ts` | `getVisibleWorktreeBrowserActivityTabs` | `D11-006` |
| `components/sidebar/visible-worktree-host-scope.ts` | `getVisibleWorkspaceHostIdSet` | `D11-007` |
| `components/sidebar/visible-worktree-host-scope.ts` | `worktreeMatchesVisibleHost` | `D11-007` |
| `components/sidebar/visible-worktree-indexes.ts` | `getLineageAncestorIndex` | `D11-008` |
| `components/sidebar/visible-worktree-indexes.ts` | `getSortedWorktreeRankIndex` | `D11-008` |
| `components/sidebar/visible-worktree-kinds.ts` | `isSleepingSweepExemptWorkspace` | `D11-009` |
| `components/sidebar/visible-worktree-kinds.ts` | `isSleepingSweepExemptionNarrowingList` | `D11-009` |
| `components/sidebar/visible-worktree-kinds.ts` | `isAutomationGeneratedWorkspace` | `D11-009` |
| `components/sidebar/visible-worktree-kinds.ts` | `isCliCreatedWorkspace` | `D11-009` |
| `components/sidebar/visible-worktree-kinds.ts` | `isDetachedHeadWorkspace` | `D11-009` |
| `components/sidebar/visible-worktree-kinds.ts` | `SidebarFilterState` | `D11-009` |
| `components/sidebar/visible-worktrees.ts` | `computeVisibleWorktrees` | `D11-010` |
| `components/sidebar/visible-worktrees.ts` | `computeVisibleWorktreeIds` | `D11-010` |
| `components/sidebar/visible-worktrees.ts` | `VisibleWorktreeShortcutTarget` | `D11-011` |
| `components/sidebar/visible-worktrees.ts` | `setVisibleWorktreeIds` | `D11-011` |
| `components/sidebar/visible-worktrees.ts` | `setVisibleWorktreeShortcutTargets` | `D11-011` |
| `components/sidebar/visible-worktrees.ts` | `buildVisibleWorktreeOptionsFromState` | `D11-010` |
| `components/sidebar/visible-worktrees.ts` | `getVisibleWorktreeIds` | `D11-011` |
| `components/sidebar/visible-worktrees.ts` | `getVisibleWorktreeShortcutTargets` | `D11-011` |
| `components/sidebar/workspace-creator-visibility.ts` | `EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT` | `D11-012` |
| `components/sidebar/workspace-creator-visibility.ts` | `getPairedDeviceIdsByEnvironment` | `D11-012` |
| `components/sidebar/workspace-creator-visibility.ts` | `isWorkspaceFromOtherDevice` | `D11-012` |
| `components/sidebar/workspace-creator-visibility.ts` | `isFolderWorkspaceFromOtherDevice` | `D11-012` |
| `components/sidebar/workspace-creator-visibility.ts` | `filterFolderWorkspacesFromOtherDevices` | `D11-012` |
| `components/sidebar/worktree-lineage-drag-drop.ts` | `isWorktreeLineageDropZoneHit` | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.ts` | `getWorktreeLineageDropTargetId` | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.ts` | `getReorderedWorktreeIdsToUnnest` | `D11-013` |
| `components/sidebar/worktree-lineage-projection.ts` | `LineageRenderInfo` | `D11-014` |
| `components/sidebar/worktree-lineage-projection.ts` | `getProjectedWorktreeLineage` | `D11-014` |
| `components/sidebar/worktree-lineage-projection.ts` | `getCyclicProjectedWorktreeLineageIds` | `D11-014` |
| `components/sidebar/worktree-lineage-projection.ts` | `getLineageRenderInfo` | `D11-014` |
| `components/sidebar/worktree-lineage-projection.ts` | `getProjectedWorktreeLineageChildrenByParentId` | `D11-014` |
| `components/sidebar/worktree-lineage-projection.ts` | `getWorktreeLineageAncestors` | `D11-014` |
| `components/sidebar/worktree-lineage-toggle-handler-cache.ts` | `LineageToggleHandler` | `D11-015` |
| `components/sidebar/worktree-lineage-toggle-handler-cache.ts` | `createLineageToggleHandlerCache` | `D11-015` |
| `components/sidebar/worktree-unambiguous-id-index.ts` | `buildUnambiguousWorktreeIdIndex` | `D11-016` |

---

## 4. Cobertura de Testes (115/115)

| Arquivo de Teste : Linha | Nome / Bloco do Teste | ID / Justificativa |
|---|---|---|
| `components/sidebar/natural-worktree-ids.test.ts:11` | getNaturalWorktreeIds | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/natural-worktree-ids.test.ts:12` | collects item rows outside the pinned section | `D11-002` |
| `components/sidebar/natural-worktree-ids.test.ts:19` | excludes a pinned duplicate that also renders in its natural group | `D11-002` |
| `components/sidebar/natural-worktree-ids.test.ts:28` | ignores every non-item row type | `D11-002` |
| `components/sidebar/natural-worktree-ids.test.ts:42` | returns an empty set for no rows | `D11-002` |
| `components/sidebar/pinned-section-worktrees.test.ts:30` | getPinnedSectionWorktrees | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/pinned-section-worktrees.test.ts:46` | includes only explicitly pinned rows when there is no lineage | `D11-003` |
| `components/sidebar/pinned-section-worktrees.test.ts:55` | does not include an unpinned row with the same id on another host | `D11-003` |
| `components/sidebar/pinned-section-worktrees.test.ts:71` | includes visible descendants of a pinned parent | `D11-003` |
| `components/sidebar/pinned-section-worktrees.test.ts:83` | does not pull a pinned child | `D11-003` |
| `components/sidebar/pinned-section-worktrees.test.ts:95` | keeps a visible grandchild when the middle parent is absent from the visible list | `D11-003` |
| `components/sidebar/pinned-section-worktrees.test.ts:107` | does not collect descendants of a pinned parent that is not itself visible | `D11-003` |
| `components/sidebar/pinned-section-worktrees.test.ts:117` | handles a deep pinned lineage without overflowing the renderer stack | `D11-003` |
| `components/sidebar/pinned-section-worktrees.test.ts:139` | builds rows for a deep expanded pinned lineage without overflowing the renderer stack | `D11-003` |
| `components/sidebar/pinned-section-worktrees.test.ts:170` | isPinnedSectionWorktree | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/pinned-section-worktrees.test.ts:179` | treats an unpinned child of a visible pinned parent as pinned-section membership | `D11-003` |
| `components/sidebar/pinned-section-worktrees.test.ts:183` | does not treat an unrelated unpinned workspace as pinned-section membership | `D11-003` |
| `components/sidebar/repo-header-create-state.test.ts:17` | repo header create state | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/repo-header-create-state.test.ts:18` | allows local git repos | `D11-004` |
| `components/sidebar/repo-header-create-state.test.ts:33` | allows folder repos as workspace creates | `D11-004` |
| `components/sidebar/repo-header-create-state.test.ts:47` | allows connected SSH repos | `D11-004` |
| `components/sidebar/repo-header-create-state.test.ts:61` | disables SSH repos while relay providers are unavailable | `D11-004` |
| `components/sidebar/visible-worktree-activity-inputs.test.ts:40` | visible worktree activity inputs | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/visible-worktree-activity-inputs.test.ts:41` | preserves terminal activity projection when only tab metadata changes | `D11-006` |
| `components/sidebar/visible-worktree-activity-inputs.test.ts:53` | inspects only the changed bucket in a 300-worktree title publication | `D11-006` |
| `components/sidebar/visible-worktree-activity-inputs.test.ts:76` | updates terminal activity projection when tab ids change | `D11-006` |
| `components/sidebar/visible-worktree-activity-inputs.test.ts:89` | reuses unchanged terminal worktree arrays when a sibling worktree changes | `D11-006` |
| `components/sidebar/visible-worktree-activity-inputs.test.ts:106` | drops terminal projections for removed worktrees | `D11-006` |
| `components/sidebar/visible-worktree-activity-inputs.test.ts:121` | preserves browser activity projection when only browser metadata changes | `D11-006` |
| `components/sidebar/visible-worktree-activity-inputs.test.ts:134` | updates browser activity projection when browser ids change | `D11-006` |
| `components/sidebar/visible-worktree-activity-inputs.test.ts:147` | drops browser projections for removed worktrees | `D11-006` |
| `components/sidebar/visible-worktree-indexes.test.ts:107` | visible worktree indexes | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/visible-worktree-indexes.test.ts:108` | reuses the lineage projection instead of rebuilding it on every store write | `D11-008` |
| `components/sidebar/visible-worktree-indexes.test.ts:126` | returns identity-stable index maps for unchanged store inputs | `D11-008` |
| `components/sidebar/visible-worktree-indexes.test.ts:147` | keeps archived parents out of the cached ancestor index | `D11-008` |
| `components/sidebar/visible-worktree-indexes.test.ts:169` | keeps the last row for a two-host id collision, as the per-call map did | `D11-008` |
| `components/sidebar/visible-worktrees.test.ts:96` | computeVisibleWorktreeIds | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/visible-worktrees.test.ts:97` | prefers the authenticated live device id over cached pairing metadata | `D11-012` |
| `components/sidebar/visible-worktrees.test.ts:113` | hides only known workspaces created by another device | `D11-012` |
| `components/sidebar/visible-worktrees.test.ts:143` | fails open when an older host does not publish the requester device id | `D11-012` |
| `components/sidebar/visible-worktrees.test.ts:159` | keeps browser-tab worktrees visible when sleeping workspaces are hidden | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:174` | hides sleeping worktrees when show sleeping is off | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:188` | hides automation-created workspaces when the automation filter is enabled | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:218` | hides CLI-created workspaces when the CLI filter is enabled | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:239` | keeps CLI-created workspaces visible while the CLI filter is off | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:255` | keeps workspaces without CLI provenance visible when the CLI filter is enabled | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:269` | hides detached-HEAD workspaces when the detached filter is enabled | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:282` | keeps detached-HEAD workspaces visible while the detached filter is off | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:295` | keeps headless workspaces visible when the detached filter is enabled | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:309` | does not treat slept wake-hint tabs as live surfaces | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:326` | keeps a running-agent worktree visible without a live pty when sleeping is hidden (#7197) | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:344` | hides paired web host terminal mirrors while their stream handle is pending | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:360` | keeps paired web host terminal mirrors visible after their stream handle is ready | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:376` | hides branch-backed main worktrees when default branch workspaces are hidden | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:392` | keeps folder-mode main worktrees visible when default branch workspaces are hidden | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:406` | filters worktrees to a selected SSH host scope | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:427` | filters non-SSH worktrees to the focused runtime host compatibility scope | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:449` | filters explicit runtime-owned repos independently of the focused default host | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:475` | uses explicit worktree ownership when it differs from the repo host | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:494` | keeps every host visible when workspace host scope is all | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:515` | filters worktrees to a selected set of visible hosts | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:541` | hides branch-backed mains across every repo in a multi-repo workspace | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:558` | composes with sleeping visibility: hidden mains stay hidden while live features remain | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:580` | composes with filterRepoIds: hides mains only within the selected repos | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:605` | includes valid lineage parents even when another filter would hide the parent | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:624` | gives a sleeping-exempt main its cached-sort slot, not a position at the end | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:659` | leaves lineage ordering untouched when the exempted main is also a parent | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:687` | includes a filtered parent from resolved inline lineage when hydration has no side-map entry | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:706` | keeps inline parents out of non-nested board results across parent filters | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:759` | includes inline lineage ancestors when send-target mode forces a filtered child visible | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:777` | keeps the hydrated side-map authoritative over disagreeing inline lineage | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:799` | does not resurrect stale lineage parents | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:820` | does not resurrect archived lineage parents | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:840` | includes default-branch parents hidden by the explicit setting when a visible child needs them | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:858` | does not include a cross-repo parent when repo filtering leaves the child visible | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:875` | does not include a known cross-host parent after host filtering | `D11-010` |
| `components/sidebar/visible-worktrees.test.ts:892` | does not include a known cross-project parent hidden by another filter | `D11-010` |
| `components/sidebar/workspace-creator-visibility.test.ts:28` | filterFolderWorkspacesFromOtherDevices | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/workspace-creator-visibility.test.ts:29` | uses the same client ownership rules as git workspaces | `D11-012` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:13` | isWorktreeLineageDropZoneHit | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:14` | keeps the top and bottom of a card available for reorder drops | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:22` | makes most of tall cards available for nesting | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:30` | scales down reorder gutters for compact cards | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:42` | rejects empty and inverted rectangles | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:67` | keeps the %s region in the lineage nesting hit zone | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:94` | keeps descendants out of the ancestor hit zone (inline content: %s) | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:47` | getWorktreeLineageDropTargetId | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:48` | returns the row id only when the pointer is away from the reorder gutters | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:55` | ignores content targets outside the sidebar container | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:80` | accepts horizontal card padding outside the content element | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:123` | does not use a descendant content element for a row without its own content | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:137` | getReorderedWorktreeIdsToUnnest | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:138` | clears parents only for directly dragged nested cards | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:160` | does not clear selected nested cards outside the reordered source group | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:181` | clears an exact inline-only legacy parent | `D11-013` |
| `components/sidebar/worktree-lineage-drag-drop.test.ts:198` | does not fall back to inline lineage when the side-map has a stale child entry | `D11-013` |
| `components/sidebar/worktree-lineage-expansion.performance.test.ts:37` | visible lineage expansion scaling | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/worktree-lineage-expansion.performance.test.ts:38` | reads each depth once even when every ancestor is selected | `D11-017` |
| `components/sidebar/worktree-lineage-expansion.performance.test.ts:55` | deduplicates many absent selected rows without searching the growing result | `D11-017` |
| `components/sidebar/worktree-lineage-expansion.performance.test.ts:70` | matches the previous algorithm across duplicate rows, missing IDs and depth boundaries | `D11-017` |
| `components/sidebar/worktree-lineage-projection.test.ts:49` | worktree lineage projection cache | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/worktree-lineage-projection.test.ts:50` | reuses the cyclic-id scan for an unchanged input pair | `D11-014` |
| `components/sidebar/worktree-lineage-projection.test.ts:57` | reuses the children projection for an unchanged input pair | `D11-014` |
| `components/sidebar/worktree-lineage-projection.test.ts:74` | rescans when either input is replaced | `D11-014` |
| `components/sidebar/worktree-lineage-projection.test.ts:89` | reflects a removed lineage edge as soon as the record is replaced | `D11-014` |
| `components/sidebar/worktree-lineage-projection.test.ts:112` | still reports cycles from the cached scan | `D11-014` |
| `components/sidebar/worktree-lineage-toggle-handler-cache.test.ts:11` | createLineageToggleHandlerCache | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/worktree-lineage-toggle-handler-cache.test.ts:12` | returns a referentially stable handler for the same group key across calls | `D11-015` |
| `components/sidebar/worktree-lineage-toggle-handler-cache.test.ts:22` | returns distinct handlers for distinct group keys | `D11-015` |
| `components/sidebar/worktree-lineage-toggle-handler-cache.test.ts:28` | prevents default, stops propagation, and toggles the bound group key | `D11-015` |
| `components/sidebar/worktree-lineage-toggle-handler-cache.test.ts:40` | keeps each cached handler bound to its own group key | `D11-015` |
| `components/sidebar/worktree-unambiguous-id-index.test.ts:16` | buildUnambiguousWorktreeIdIndex | *INFRA: describe block de agrupamento de testes* |
| `components/sidebar/worktree-unambiguous-id-index.test.ts:17` | keeps unique bare ids | `D11-016` |
| `components/sidebar/worktree-unambiguous-id-index.test.ts:29` | drops bare ids claimed by multiple hosts | `D11-016` |
| `components/sidebar/worktree-unambiguous-id-index.test.ts:36` | keeps later unique ids after an ambiguity is found | `D11-016` |

---

## 5. Cobertura de Labels e Tooltips de Interface (13/13)

| Arquivo : Linha | Texto do Índice | ID / Justificativa |
|---|---|---|
| `components/sidebar/repo-header-create-state.test.ts:22` | `label: 'orca',` | *N/A: fixture no teste repo-header-create-state.test.ts* |
| `components/sidebar/repo-header-create-state.test.ts:27` | `tooltip: 'Create new worktree for orca',` | *N/A: fixture no teste repo-header-create-state.test.ts* |
| `components/sidebar/repo-header-create-state.test.ts:37` | `label: 'docs',` | *N/A: fixture no teste repo-header-create-state.test.ts* |
| `components/sidebar/repo-header-create-state.test.ts:42` | `tooltip: 'Create workspace for docs',` | *N/A: fixture no teste repo-header-create-state.test.ts* |
| `components/sidebar/repo-header-create-state.test.ts:51` | `label: 'remote',` | *N/A: fixture no teste repo-header-create-state.test.ts* |
| `components/sidebar/repo-header-create-state.test.ts:56` | `tooltip: 'Create new worktree for remote',` | *N/A: fixture no teste repo-header-create-state.test.ts* |
| `components/sidebar/repo-header-create-state.test.ts:73` | `label: 'remote',` | *N/A: fixture no teste repo-header-create-state.test.ts* |
| `components/sidebar/repo-header-create-state.test.ts:78` | `tooltip: 'Reconnect SSH target before creating workspaces',` | *N/A: fixture no teste repo-header-create-state.test.ts* |
| `components/sidebar/repo-header-create-state.ts:9` | `tooltip: string` | *INFRA: tipo de propriedade em RepoHeaderCreateState* |
| `components/sidebar/repo-header-create-state.ts:16` | `label: string` | *INFRA: tipo de propriedade no input de getRepoHeaderCreateState* |
| `components/sidebar/repo-header-create-state.ts:22` | `tooltip: translate(` | `D11-004` |
| `components/sidebar/repo-header-create-state.ts:43` | `tooltip: translate(` | `D11-004` |
| `components/sidebar/repo-header-create-state.ts:58` | `tooltip: translate(` | `D11-004` |

---

## 6. Cobertura de Atalhos de Teclado (10/10)

| Arquivo : Linha | Código / Comentário de Atalho | ID / Justificativa |
|---|---|---|
| `components/sidebar/visible-worktrees.ts:235` | `* recomputes sort order from a live Zustand snapshot, the Cmd+1–9 shortcut` | `D11-011` |
| `components/sidebar/visible-worktrees.ts:238` | `* shortcut numbering always matches the sidebar card order.` | `D11-011` |
| `components/sidebar/visible-worktrees.ts:244` | `export type VisibleWorktreeShortcutTarget = {` | `D11-011` |
| `components/sidebar/visible-worktrees.ts:248` | `let _publishedVisibleShortcutTargets: VisibleWorktreeShortcutTarget[] | null = null` | `D11-011` |
| `components/sidebar/visible-worktrees.ts:254` | `export function setVisibleWorktreeShortcutTargets(` | `D11-011` |
| `components/sidebar/visible-worktrees.ts:255` | `targets: VisibleWorktreeShortcutTarget[] | null` | `D11-011` |
| `components/sidebar/visible-worktrees.ts:257` | `_publishedVisibleShortcutTargets = targets` | `D11-011` |
| `components/sidebar/visible-worktrees.ts:358` | `export function getVisibleWorktreeShortcutTargets(): VisibleWorktreeShortcutTarget[] {` | `D11-011` |
| `components/sidebar/visible-worktrees.ts:359` | `if (_publishedVisibleShortcutTargets) {` | `D11-011` |
| `components/sidebar/visible-worktrees.ts:360` | `return _publishedVisibleShortcutTargets` | `D11-011` |

---

## 7. Justificativas de Itens N/A e INFRA

### 7.1 Blocos de Agrupamento de Teste (`INFRA`)
- Todos os blocos `describe` dos 12 arquivos de teste do domínio foram classificados como `INFRA: describe block de agrupamento de testes`, pois não configuram casos de asserção de comportamento diretamente, mas servem de contêiner hierárquico para os casos `it`.

### 7.2 Tipos e Fixtures de Interface (`INFRA` e `N/A`)
- `components/sidebar/repo-header-create-state.ts:9` (`tooltip: string`) e `components/sidebar/repo-header-create-state.ts:16` (`label: string`): identificados mecanicamente pelo scanner como labels devido às chaves de tipo TypeScript; classificados como `INFRA: tipo de propriedade`.
- `components/sidebar/repo-header-create-state.test.ts:22..78`: literais de string em fixtures de teste unitário (`label: 'orca'`, `tooltip: 'Create new worktree for orca'`, etc.); classificados como `N/A: fixture string no teste`.
