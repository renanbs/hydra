# Parede de Evidência — Domínio D15-misc-a (Miscelânea do Sidebar A)

## Contagens de Cobertura
- **arquivos**: 4/4 (100%)
- **símbolos**: 7/7 (100%)
- **testes**: 37/37 (100%)
- **labels**: 3/3 (100%)
- **hotkeys**: 0/0 (100%)
- **prefs**: 0/0 (100%)
- **timers**: 0/0 (100%)
- **subs**: 0/0 (100%)
- **preload**: 0/0 (100%)

---

## 1. Arquivos Produtivos (`files`)

| Arquivo Produtivo | Linhas | IDs de Capacidade Mapeados |
|---|---|---|
| `components/sidebar/comment-mermaid-fence.tsx` | 28 | `D15a-001`, `D15a-002` |
| `components/sidebar/project-header-color.ts` | 33 | `D15a-003`, `D15a-004` |
| `components/sidebar/project-order-manual-default-notice-visibility.ts` | 15 | `D15a-005` |
| `components/sidebar/use-sidebar-host-scope-options.ts` | 50 | `D15a-006` |

---

## 2. Símbolos e Exports (`symbols`)

| Arquivo de Origem | Símbolo Exportado | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/comment-mermaid-fence.tsx` | `isMermaidFence` | `D15a-001` |
| `components/sidebar/comment-mermaid-fence.tsx` | `renderMermaidFence` | `D15a-002` |
| `components/sidebar/comment-mermaid-fence.tsx` | `isMermaidPre` | `D15a-001` |
| `components/sidebar/project-header-color.ts` | `resolveRepoHeaderColor` | `D15a-003` |
| `components/sidebar/project-header-color.ts` | `resolveProjectGroupHeaderColor` | `D15a-004` |
| `components/sidebar/project-order-manual-default-notice-visibility.ts` | `shouldShowProjectOrderManualDefaultNotice` | `D15a-005` |
| `components/sidebar/use-sidebar-host-scope-options.ts` | `useSidebarHostScopeOptions` | `D15a-006` |

---

## 3. Casos de Teste (`tests`)

| Arquivo de Teste e Linha | Identificador / Nome do Teste | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/host-section-folder-workspace-counts.test.ts:103` | `describe folder workspace host counts` | `D15a-007` |
| `components/sidebar/host-section-folder-workspace-counts.test.ts:104` | `it counts an expanded folder workspace row` | `D15a-007` |
| `components/sidebar/host-section-folder-workspace-counts.test.ts:111` | `it counts a collapsed folder-only lane from its header` | `D15a-007` |
| `components/sidebar/project-group-header-dom.test.ts:19` | `describe Project Group header drag DOM source` | `D15a-008` |
| `components/sidebar/project-group-header-dom.test.ts:20` | `it renders concrete Project Group header drag attributes separately from repo headers` | `D15a-008` |
| `components/sidebar/project-group-header-dom.test.ts:29` | `it commits Project Group manual sorting through updateProjectGroup tabOrder` | `D15a-008` |
| `components/sidebar/project-group-header-dom.test.ts:39` | `it keeps grab cursor on the title surface and dual handle attrs on row + surface` | `D15a-008` |
| `components/sidebar/project-header-action-selector-lockstep.test.ts:10` | `describe project header action selectors` | `D15a-009` |
| `components/sidebar/project-header-action-selector-lockstep.test.ts:11` | `it includes the actions overlay for both repo and group helpers` | `D15a-009` |
| `components/sidebar/project-header-color.test.ts:5` | `describe resolveRepoHeaderColor` | `D15a-003` |
| `components/sidebar/project-header-color.test.ts:6` | `it returns a canonical palette color` | `D15a-003` |
| `components/sidebar/project-header-color.test.ts:10` | `it keeps the default repo badge color gray` | `D15a-003` |
| `components/sidebar/project-header-color.test.ts:14` | `it.each falls back for missing or empty input: %s` | `D15a-003` |
| `components/sidebar/project-header-color.test.ts:18` | `it normalizes whitespace and casing to the canonical palette value` | `D15a-003` |
| `components/sidebar/project-header-color.test.ts:22` | `it returns normalized custom hex colors` | `D15a-003` |
| `components/sidebar/project-header-color.test.ts:26` | `it falls back for invalid colors` | `D15a-003` |
| `components/sidebar/project-header-color.test.ts:31` | `describe resolveProjectGroupHeaderColor` | `D15a-004` |
| `components/sidebar/project-header-color.test.ts:32` | `it returns the repo color for project group headers` | `D15a-004` |
| `components/sidebar/project-header-color.test.ts:42` | `it returns the repo color for provider-backed project headers` | `D15a-004` |
| `components/sidebar/project-header-color.test.ts:52` | `it falls back to gray for unknown project group headers` | `D15a-004` |
| `components/sidebar/project-header-color.test.ts:62` | `it does not color pinned headers while grouped by repo` | `D15a-004` |
| `components/sidebar/project-header-color.test.ts:72` | `it does not color repo-looking keys in other grouping modes` | `D15a-004` |
| `components/sidebar/project-order-manual-default-notice-visibility.test.ts:5` | `describe resolveProjectOrderManualDefaultNoticeDismissed` | `D15a-005` |
| `components/sidebar/project-order-manual-default-notice-visibility.test.ts:6` | `it keeps an explicit dismissal` | `D15a-005` |
| `components/sidebar/project-order-manual-default-notice-visibility.test.ts:16` | `it hides the notice for brand-new profiles` | `D15a-005` |
| `components/sidebar/project-order-manual-default-notice-visibility.test.ts:26` | `it hides the notice when recent ordering was already explicit` | `D15a-005` |
| `components/sidebar/project-order-manual-default-notice-visibility.test.ts:36` | `it shows the notice for upgraded profiles without an explicit project order` | `D15a-005` |
| `components/sidebar/project-order-manual-default-notice-visibility.test.ts:47` | `describe shouldShowProjectOrderManualDefaultNotice` | `D15a-005` |
| `components/sidebar/project-order-manual-default-notice-visibility.test.ts:48` | `it shows only when project grouping is active and repos exist` | `D15a-005` |
| `components/sidebar/sidebar-resize-handle.test.ts:15` | `describe worktree sidebar resize handle` | `D15a-010` |
| `components/sidebar/sidebar-resize-handle.test.ts:16` | `it keeps a wide hit target that straddles the sidebar seam` | `D15a-010` |
| `components/sidebar/sidebar-resize-handle.test.ts:23` | `it keeps card content clear of the resize target` | `D15a-010` |
| `components/sidebar/sleep-worktree-activation-race.test.ts:46` | `describe sleep flow vs slept-workspace activation` | `D15a-011` |
| `components/sidebar/sleep-worktree-activation-race.test.ts:81` | `it does not leave behind a delayed parent activation after sleeping children` | `D15a-011` |
| `components/sidebar/sleep-worktree-activation-race.test.ts:99` | `it keeps the slept worktree selected when VM resume fails` | `D15a-011` |
| `components/sidebar/use-visible-workspace-kanban-worktree-ids.test.tsx:12` | `describe useVisibleWorkspaceKanbanWorktreeIds` | `D15a-012` |
| `components/sidebar/use-visible-workspace-kanban-worktree-ids.test.tsx:22` | `it keeps a single-host filter host-qualified when workspace ids collide` | `D15a-012` |

---

## 4. Labels e Textos Literais (`labels`)

| Arquivo e Linha | Texto / Label | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/host-section-folder-workspace-counts.test.ts:37` | `{ id: 'local', kind: 'local', label: 'Local', detail: 'This computer', health: 'local' },` | `D15a-007` |
| `components/sidebar/host-section-folder-workspace-counts.test.ts:38` | `{ id: 'ssh:builder', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | `D15a-007` |
| `components/sidebar/host-section-folder-workspace-counts.test.ts:115` | `label: 'In progress',` | `D15a-007` |

---

## 5. Outras Seções de Cobertura

- **Atalhos (`hotkeys`)**: 0 encontrados no índice mecânico deste subdomínio.
- **Preferências (`prefs`)**: 0 encontradas no índice mecânico deste subdomínio.
- **Timers (`timers`)**: 0 encontrados no índice mecânico deste subdomínio.
- **Subscrições (`subscriptions`)**: 0 encontradas no índice mecânico deste subdomínio.
- **Preload (`preload`)**: 0 encontrados no índice mecânico deste subdomínio.

---

## 6. Resumo das Linhas de Capacidade (`rows`)

- `D15a-001`: Detecção e desempacotamento de blocos de diagrama Mermaid em comentários Markdown (`comment-mermaid-fence.tsx:7, 21`)
- `D15a-002`: Renderização isolada de diagramas Mermaid em comentários do sidebar (`comment-mermaid-fence.tsx:11`, `CommentMermaidBlock.tsx:11`)
- `D15a-003`: Resolução e normalização de cores de badge de repositório (`project-header-color.ts:7`)
- `D15a-004`: Resolução contextual de cor para cabeçalhos de Project Group e Provider (`project-header-color.ts:18`)
- `D15a-005`: Controle de visibilidade do aviso de ordenação manual de projetos (`project-order-manual-default-notice-visibility.ts:1`)
- `D15a-006`: Derivação reativa de opções e escopos de hosts de execução no sidebar (`use-sidebar-host-scope-options.ts:14`)
- `D15a-007`: Contagem e preservação de workspaces de pasta em seções de hosts locais e remotos (`host-section-rows.ts:18`)
- `D15a-008`: Atributos DOM de drag-and-drop e persistência de ordenação de Project Groups (`SectionHeader.tsx:23`, `use-header-drag.ts:32`)
- `D15a-009`: Isolamento de cliques em ações de cabeçalho contra disparo de drag e colapso (`project-header-drag-contract.ts:6`, `project-group-header-drag-contract.ts:4`)
- `D15a-010`: Dimensionamento e área de toque da alça de redimensionamento do sidebar (`index.tsx:37`)
- `D15a-011`: Tratamento de concorrência no fluxo de suspensão (sleep) e ativação de workspaces em VM (`sleep-worktree-flow.ts:44`, `sidebar-worktree-activation.ts:43`)
- `D15a-012`: Isolamento qualificado por host na seleção de worktrees visíveis no Kanban (`use-visible-workspace-kanban-worktree-ids.ts:15`)
