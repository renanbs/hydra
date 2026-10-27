# D11 — Lineage & Grouping Model — veredito Hydra (fase 2)

Fonte congelada: `domains/D11-lineage-grouping-model.orca.json` (17 linhas, 15 arquivos, 47 símbolos,
112 testes, 10 labels/tooltips, 10 hotkeys). Saída por linha: `domains/D11-lineage-grouping-model.diff.json`.

## 1. Regra de veredito aplicada

Aplicado o protocolo `HYDRA_MAPPING.md` (regra de ouro: arquivo existir ≠ funcionalidade), com esta
leitura operacional, usada consistentemente nas 17 linhas:

- `parity` — o símbolo existe em módulo **alcançável por imports de valor** a partir do mount do sidebar
  (`src/App.tsx` → `WorktreeSidebar.tsx` → `WorktreeList.tsx` / `visible-worktrees.ts`, e a cadeia do
  handler global Cmd+1–9 em `App.tsx:58`/`App.tsx:2456`) **e** o efeito observável da linha é produzido
  nesse caminho.
- `partial` — módulo alcançável e comportamento implementado, mas falta sub-comportamento nomeado da
  linha **na superfície alcançável** (listado em `hydra.missing_behaviors`).
- `missing` — sem símbolo alcançável (código morto conta como `missing`, conforme a regra de ouro).

Reachability foi verificada por BFS de `import`/`export ... from` **não-`import type`** (valor) a partir de
`App.tsx`, `main.tsx`, `WorktreeSidebar.tsx` e `SidebarAgentsList.tsx`, e conferida contra
`index/hydra_scope.json` (`reachable_depth: null` = inalcançável) e `index/hydra_unreachable.json`.

## 2. Achado sistêmico (afeta 12 das 17 linhas)

O Hydra tem **dois modelos de sidebar** para o mesmo dado:

| modelo | arquivos | quem consome | o que renderiza |
|---|---|---|---|
| **Port Orca (sombra)** | `visible-worktrees.ts`, `worktree-lineage-projection.ts`, `pinned-section-worktrees.ts`, `visible-worktree-{kinds,indexes,host-scope}.ts`, `workspace-creator-visibility.ts`, `worktree-list/grouping/**` | `App.tsx:2456` (fallback Cmd+1–9 quando o `WorktreeList` está desmontado) e `WorktreeList.tsx:240-246` (publicação) | nada diretamente: só a **ordem/numeração** |
| **Bespoke pintado** | `WorktreeSidebar.getFilteredAndSortedWorktrees` (`WorktreeSidebar.tsx:533-547`) + `WorktreeList.renderProjectNode` (`WorktreeList.tsx:250-457`) | render real dos cards | projetos → worktrees **planas**, sem linhagem aninhada, sem seção Pinned, sem seções de host |

Consequências verificadas:

1. **Linhagem não é renderizada.** `WorktreeList.tsx:343` chama
   `getWorktreeCardContentIndent({ ..., lineageDepth: 0 })` com profundidade fixa e
   `use-worktree-card-controller.ts:313` força `showLineageChildChip: false`; as constantes
   `LINEAGE_*` de `worktree-list/rows/indentation.ts:13-17` não têm consumidor pintado.
2. **Pinned é plano.** O card pintado recebe `isPinned` de um `Set<string>` de paths do App
   (`WorktreeList.tsx:374` ← `App.tsx:424-426`, persistido em `localStorage`), sem `worktree.isPinned`
   nem herança de linhagem.
3. **Linhagem local ≠ linhagem Orca.** O App mantém `worktreeLineage: Record<string, string>`
   (`App.tsx:431`) usado só em menus (ParentPickerModal `App.tsx:3951`, "Sleep/Delete with Descendants"
   `App.tsx:3489`); o port Orca usa `appStore.worktreeLineageById` (`WorktreeLineage` por host,
   hidratado em `src/hooks/direct-ssh-host-hydration.ts:99-115`), consumido **apenas** pelo pipeline sombra.
4. **Filtros do menu são inertes na lista pintada.** `WorkspaceOptionsMenu.tsx` expõe
   `hideSleeping`/`hideAutomationCreated`/`hideCliCreated` (`:405/:433/:447`) mas
   `getFilteredAndSortedWorktrees` só aplica `hideDefaultBranch` e `hideDetachedHead`
   (`WorktreeSidebar.tsx:537-542`). Os toggles gravam somente nas prefs do App
   (`WorktreeSidebar.tsx:348-351` → `App.tsx:468-476`) e **nunca** chegam ao store zustand; os flags do
   store que alimentam o port (`showSleepingWorkspaces`, `hideAutomationGeneratedWorkspaces`,
   `hideCliCreatedWorkspaces`, `hideWorkspacesFromOtherDevices`, `hideDefaultBranchWorkspace`,
   `alwaysShowDefaultBranchWorkspace`, `workspaceHostScope`) só têm **leitores**
   (`visible-worktrees.ts:298`, `sidebar-filter-actions.ts:14-25`) — a única escrita é o rebaixamento
   para `false` durante o reveal em `src/lib/worktree-activation.ts:284-290`
   (`setHideAutomationGeneratedWorkspaces(false)`, `setHideCliCreatedWorkspaces(false)`,
   `setHideDetachedHeadWorkspaces(false)`), nunca para `true`. Além disso
   `setWorkspaceHostScope`/`setVisibleWorkspaceHostIds`
   (`src/store/slices/ui/ui-slice-preference-actions.ts:68,77`) não têm chamador algum.

## 3. Vereditos

| ID | Capacidade (resumo) | Veredito | Evidência-chave Hydra |
|---|---|---|---|
| D11-001 | `isDefaultBranchWorkspace` | **parity** | `default-branch-workspace.ts:4-9` (regra idêntica); wired `visible-worktrees.ts:132`; efeito pintado inline `WorktreeSidebar.tsx:537` |
| D11-002 | `getNaturalWorktreeIds` | **missing** | arquivo existe (`natural-worktree-ids.ts:16`) mas só importado por `worktree-drag-units.ts:3`, ele próprio inalcançável (`worktree-sidebar-drag-autoscroll.ts:2` é `import type`) |
| D11-003 | `getPinnedSectionWorktrees` / `isPinnedSectionWorktree` | **partial** | port fiel e alcançável (`pinned-section-worktrees.ts:8,43` ← `build-rows.ts:25,101,138` ← `rendered-sidebar-worktree-order.ts:56,116` ← `visible-worktrees.ts:377`), mas só alimenta a numeração Cmd+1–9 |
| D11-004 | `getRepoHeaderCreateState` (tooltip/disabled/reconnect SSH) | **missing** | símbolo e strings ausentes; header tem label estático (`SectionHeader.tsx:365-366`); `ProjectHeaderActions.tsx:20` é só contêiner |
| D11-005 | `useRepoOwnerVisibilityDefaults` | **missing** | ausente; store tem `worktreeVisibilityDefaultsByHost` (`settings.ts:42,183,270`) mas o diálogo lê só `settings.worktree_visibility_defaults` (`WorktreeSidebar.tsx:1146`) |
| D11-006 | projeção memoizada de atividade de abas | **missing** | ausente; só a semântica grosseira `worktree-activity-state.ts:24,72` usada em `visible-worktrees.ts:26,168-180` |
| D11-007 | escopo de host executor | **partial** | port fiel `visible-worktree-host-scope.ts:14,23`; wired `visible-worktrees.ts:367,373`, `rendered-sidebar-worktree-order.ts:45,91`; sem efeito na lista pintada e sem caller do setter de escopo |
| D11-008 | índices WeakMap (ancestrais + ranks) | **parity** | `visible-worktree-indexes.ts:18,20,39,41`; chamados em `visible-worktrees.ts:123,197` |
| D11-009 | predicados de tipo de workspace | **partial** | 6 símbolos nas linhas exatas `visible-worktree-kinds.ts:12,24,31,35,47,52`; `isDetachedHeadWorkspace` também em `worktree-activation.ts:289`; filtros de sono/automação/CLI sem efeito pintado |
| D11-010 | pipeline `computeVisibleWorktrees` (12 passos) | **partial** | 12 passos completos `visible-worktrees.ts:111-243`, executados no fallback `App.tsx:2456 → :326/:380/:244`; lista pintada aplica só 2 passos (`WorktreeSidebar.tsx:533-547`) |
| D11-011 | publicação/resolução de alvos Cmd+1–9 | **parity** | `visible-worktrees.ts:266,271,273,277,292,326,380`; publica `WorktreeList.tsx:240-246`; consome `App.tsx:2456` + `visible-worktree-index-jump.ts:26` |
| D11-012 | visibilidade de workspaces de outros dispositivos | **partial** | port fiel `workspace-creator-visibility.ts:10,26,46,65,75`; wired `visible-worktrees.ts:127,311-313`; flag sem escritor e sem efeito pintado |
| D11-013 | hit-zone de drag para aninhamento/desaninhamento | **missing** | módulo ausente; `data-worktree-drag-id` só em módulos inalcançáveis (`pointer-drag-dom.ts:47,52-53`); drag pintado é reordenação plana |
| D11-014 | projeção de linhagem + ciclos + ancestrais | **partial** | port fiel com linhas idênticas ao Orca (`worktree-lineage-projection.ts:8,15,60,84,105,128`); wired `visible-worktrees.ts:50,217,225`, `pinned-section-worktrees.ts:14`, `row-builders.ts:6`; sem render aninhado |
| D11-015 | cache de handler de toggle de linhagem | **missing** | ausente (`createLineageToggleHandlerCache`, `LineageToggleHandler`); só colapso de projeto/grupo (`WorktreeSidebar.tsx:325-343`) |
| D11-016 | índice de ids inequívocos multi-host | **missing** | ausente; Hydra usa identidade qualificada por host com "FIRST wins" (`src/store/worktree-repo-index.ts:34-55,79,86`) — semântica oposta |
| D11-017 | expansão O(N) de linhagem no drag | **missing** | função existe (`worktree-manual-order.ts:36`) mas módulo inalcançável (nenhum importador de valor) |

Totais: **parity 3 · partial 6 · missing 8 · not-applicable 0 · out-of-scope 0** (17/17 com veredito único).

## 4. Top gaps

1. **Não existe árvore de worktrees aninhada no sidebar pintado** (D11-014/D11-013/D11-015): indentação
   fixa em `lineageDepth: 0`, chip de filhos desligado, nenhum toggle/colapso de linhagem, nenhuma
   persistência de expansão (`PAR-82`) e nenhum drop com zona central de re-parenting (`PAR-43`).
2. **Sem seção global Pinned no topo** (D11-003, `PAR-35`): `emitPinnedGroup` existe no modelo sombra,
   a lista pintada dispersa pinados dentro do projeto e o pin é um `Set` de paths do App.
3. **Filtros do menu de opções não afetam a lista pintada** (D11-010/D11-009/D11-007/D11-012):
   `hideSleeping`, `hideAutomationCreated`, `hideCliCreated` e escopo de host existem só no pipeline de
   atalhos; a lista pintada aplica 2 dos 12 passos.
4. **Flags do store do pipeline Orca nunca são elevados**: `showSleepingWorkspaces`,
   `hideAutomationGeneratedWorkspaces`, `hideCliCreatedWorkspaces`, `hideWorkspacesFromOtherDevices`,
   `hideDefaultBranchWorkspace`, `alwaysShowDefaultBranchWorkspace` e
   `workspaceHostScope`/`visibleWorkspaceHostIds` só têm leitores; a única escrita existente é o
   rebaixamento para `false` em `src/lib/worktree-activation.ts:284-290`, e os toggles do menu gravam
   apenas nas prefs do App (`WorktreeSidebar.tsx:348-351`). O pipeline roda sempre com defaults — efeito
   praticamente inerte mesmo no fallback Cmd+1–9.
5. **Estado de linhagem duplicado e divergente** (D11-014/D11-003): `App.worktreeLineage`
   (`Record<path,path>` em `localStorage`) vs `appStore.worktreeLineageById` (`WorktreeLineage` por host)
   — só o segundo alimenta o port Orca.
6. **`repo-header-create-state` ausente** (D11-004): o botão "+" do header não deriva
   `disabled`/`tooltip`/`ariaLabel` de `repo.kind` nem bloqueia criação SSH pendente com
   "Reconnect SSH target before creating workspaces" (a string não existe no Hydra).
7. **Módulos órfãos do domínio**: `natural-worktree-ids.ts` (D11-002),
   `worktree-manual-order.ts`/`worktree-drag-units.ts`/`worktree-sidebar-drag-geometry.ts`/
   `pointer-drag-dom.ts` (D11-013/D11-017) e os shims raiz `group-keys.ts`, `project-group-sections.ts`,
   `row-types.ts`, `build-rows.ts` — todos inalcançáveis a partir do mount (`hydra_scope.json`
   `reachable_depth: null`).
8. **Projeção memoizada de atividade de abas ausente** (D11-006): sem isolamento de baldes por
   `worktreeId`, então os writes frequentes de título/status de abas não têm o escudo de identidade que
   o Orca tinha.
9. **Índice de ids inequívocos ausente** (D11-016): resoluções por id nu seguem "FIRST wins"
   (`worktree-repo-index.ts:79`) em vez de remover o id ambíguo.
10. **Resolução de defaults de visibilidade por proprietário do repo ausente** (D11-005): sem
    `getRepoOwnerWorktreeVisibilityDefaults(repo, settings, defaultsByHost)`; o diálogo usa apenas o
    default do host focado.

## 5. Paridades notáveis

1. **D11-001 `isDefaultBranchWorkspace`** — regra ternária idêntica ao Orca
   (`isMainWorktree && branch.trim() !== '' && ephemeralVmCheckoutMode !== 'provisioned-root'`) e com
   efeito real nos dois caminhos (port + filtro inline pintado).
2. **D11-008 `visible-worktree-indexes`** — único ponto do domínio onde o Hydra reproduz o Algoritmo e o
   contrato de identidade do Orca (WeakMap por `worktreesByRepo`, exclusão de arquivados, "última linha"
   na colisão de id, WeakMap por `sortedIds`).
3. **D11-011 publicação/resolução de atalhos** — contrato vivo ponta-a-ponta: publica antes do paint com
   `null` no unmount (`WorktreeList.tsx:240-246`) e consome no handler global (`App.tsx:2456`).
4. **D11-014 `/` D11-012** — ports fiéis, incluindo memoização WeakMap de dois níveis e as linhas
   exatas do arquivo Orca (`worktree-lineage-projection.ts:8,15,60,84,105,128`), preferência pelo
   `status.pairedDeviceId` vivo e fail-open para hosts legados.
5. **D11-003 `getPinnedSectionWorktrees`** — travessia iterativa (work-queue) segura para linhagens
   profundas e isolamento de host nas arestas de linhagem, exatamente como no Orca; falta apenas a
   superfície de renderização.

## 6. Traceabilidade de cobertura (100% das entradas do `.orca.json`)

- **files (15/15)**: cada arquivo do inventário foi procurado em `src/components/sidebar/**` e recebeu o
  veredito da sua linha — `default-branch-workspace.ts`→D11-001, `natural-worktree-ids.ts`→D11-002,
  `pinned-section-worktrees.ts`→D11-003, `repo-header-create-state.ts`→D11-004 (ausente),
  `use-repo-owner-visibility-defaults.ts`→D11-005 (ausente), `visible-worktree-activity-inputs.ts`→D11-006
  (ausente), `visible-worktree-host-scope.ts`→D11-007, `visible-worktree-indexes.ts`→D11-008,
  `visible-worktree-kinds.ts`→D11-009, `visible-worktrees.ts`→D11-010+D11-011,
  `workspace-creator-visibility.ts`→D11-012, `worktree-lineage-drag-drop.ts`→D11-013 (ausente),
  `worktree-lineage-projection.ts`→D11-014, `worktree-lineage-toggle-handler-cache.ts`→D11-015 (ausente),
  `worktree-unambiguous-id-index.ts`→D11-016 (ausente). Homônimos do Hydra localizados onde o veredito é
  `parity`/`partial`; nos `missing` a ausência está registrada em `hydra.notes` com a lista de buscas.
- **symbols (47/47)**: todos os 47 símbolos foram procurados por nome exato (`grep -w`) em `src/**`.
  **32** possuem homônimo no Hydra (D11-001×1, 003×2, 007×2, 008×2, 009×6, 010×3, 011×5, 012×5, 014×6) e
  **15** estão ausentes, cobertos pelo veredito `missing` da linha (D11-002×1, 004×2, 005×1, 006×5,
  013×3, 015×2, 016×1). Onde o port tem os mesmos nomes, as linhas de evidência conferem com as do
  inventário (ex.: `worktree-lineage-projection.ts:8,15,60,84,105,128` e
  `visible-worktree-kinds.ts:12,24,31,35,47,52` idênticas ao Orca).
- **tests (112/112)**: 97 casos mapeados a linhas do Orca herdam o veredito da linha; 15 entradas
  `INFRA:` (blocos `describe` de agrupamento) permanecem justificadas como infraestrutura de teste.
  Nenhuma suíte de paridade correspondente existe no Hydra para este domínio (os únicos testes do sidebar
  no Hydra são `*.parity.test.tsx` de card/header, fora de D11).
- **labels (10/10)**: 7 `N/A:` (fixtures de `repo-header-create-state.test.ts`, arquivo Orca inexistente no
  Hydra), 2 `INFRA:` (`tooltip: string`, `label: string` — tipos da interface `RepoHeaderCreateState`) e
  `tooltip: translate(` → veredito da linha **D11-004** (`missing`; a string de tooltip traduzida não existe
  no Hydra).
- **hotkeys (10/10)**: todas as 10 entradas são de `visible-worktrees.ts` e pertencem a **D11-011**
  (`parity`) — tipo `VisibleWorktreeShortcutTarget`, `_publishedVisibleShortcutTargets`, os dois setters
  e o getter com fallback.
- **prefs / timers / subscriptions / preload**: `{}` no inventário → **N/A:** (domínio de funções puras de
  modelo de linhas, sem preferências, timers, subscriptions ou símbolos de preload próprios).

## 7. Cross-walk PAR (pendente de agregação em `domains/_par-crosswalk.json`)

Itens de sidebar da spec do vault com relação direta a este domínio (registrados no campo `par` de cada
linha do `.diff.json`; o arquivo de crosswalk **não** foi criado por este run para não sobrescrever a
agregação de outros domínios):

| PAR | Item | Linhas Orca | `hydra_status` proposto |
|---|---|---|---|
| `PAR-35` | Seção global de worktrees fixadas no topo (`PinnedGroup`) | D11-003 | `partial` |
| `PAR-43` | Re-parenting de linhagem via drag & drop na linha | D11-013 | `missing` |
| `PAR-82` | Persistência de expansão/colapso de linhagens aninhadas | D11-014, D11-015 | `missing` |
| `PAR-08` | Multi-seleção de worktrees para ações em massa | D11-017 | `missing` |
| `PAR-51` | Badge visual de alerta para estado detached HEAD | D11-009 | `partial` |
