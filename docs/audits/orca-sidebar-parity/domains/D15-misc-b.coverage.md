# Parede de Evidência — Domínio D15-misc-b (Miscelânea do Sidebar B)

## Contagens de Cobertura
- **arquivos**: 8/8 (100%)
- **símbolos**: 12/12 (100%)
- **testes**: 12/12 (100%)
- **labels**: 0/0 (100%)
- **hotkeys**: 1/1 (100%)
- **prefs**: 0/0 (100%)
- **timers**: 2/2 (100%)
- **subs**: 8/8 (100%)
- **preload**: 0/0 (100%)

---

## Itens com Justificativa Especial (INFRA / N/A / DUP)

| Categoria | Entrada | Justificativa |
|---|---|---|
| subscriptions | `components/sidebar/use-workspace-reveal-body-redirect.test.tsx:59 :: window.addEventListener(SCROLL_TO_CURRENT_WORKSPACE_REVEAL_REQUEST_EVENT, listener)` | `INFRA: test event listener helper for redirect verification` |
| tests | `components/sidebar/use-workspace-reveal-body-redirect.test.tsx:38 :: useWorkspaceRevealBodyRedirect` | `INFRA: describe suite header for useWorkspaceRevealBodyRedirect` |
| tests | `components/sidebar/use-workspace-status-drop.test.ts:4 :: workspace status document drop` | `INFRA: describe suite header for workspace status document drop` |
| tests | `components/sidebar/useRenderedSetupScriptPromptState.test.ts:20 :: useRenderedSetupScriptPromptState` | `INFRA: describe suite header for useRenderedSetupScriptPromptState` |
| tests | `components/sidebar/worktree-scroll-to-current-button.test.ts:4 :: getScrollTopToRevealBounds` | `INFRA: describe suite header for getScrollTopToRevealBounds` |

---

## 1. Arquivos Produtivos (`files`)

| Arquivo Produtivo | Linhas de Inventário Associadas |
|---|---|
| `use-visible-workspace-kanban-worktree-ids.ts` | `D15b-001`, `D15b-002` |
| `use-workspace-reveal-body-redirect.ts` | `D15b-003` |
| `use-workspace-status-drop.ts` | `D15b-004`, `D15b-005` |
| `use-worktree-meta-workspace.ts` | `D15b-006`, `D15b-007` |
| `use-worktree-parent-picker-transition.ts` | `D15b-008`, `D15b-009` |
| `useRenderedSetupScriptPromptState.ts` | `D15b-010` |
| `workspace-chrome-metrics.ts` | `D15b-011` |
| `worktree-sidebar-header-drop-preview.ts` | `D15b-012`, `D15b-013` |

---

## 2. Símbolos Exportados (`symbols`)

| Símbolo Exportado | Linhas de Inventário / Justificativa |
|---|---|
| `useVisibleWorkspaceKanbanWorktreeIds` | `D15b-001`, `D15b-002` |
| `useWorkspaceRevealBodyRedirect` | `D15b-003` |
| `commitWorkspaceStatusDocumentDrop` | `D15b-004` |
| `useWorkspaceStatusDocumentDrop` | `D15b-005` |
| `useWorktreeMetaWorkspace` | `D15b-006`, `D15b-007` |
| `useWorktreeParentPickerTransition` | `D15b-008`, `D15b-009` |
| `useRenderedSetupScriptPromptState` | `D15b-010` |
| `WORKSPACE_TOP_CHROME_HEIGHT` | `D15b-011` |
| `STATUS_BAR_RESERVE_HEIGHT` | `D15b-011` |
| `WorktreeSidebarHeaderDragRect` | `D15b-012` |
| `WorktreeSidebarHeaderDropPreview` | `D15b-012` |
| `computeWorktreeSidebarHeaderDropPreview` | `D15b-012`, `D15b-013` |

---

## 3. Testes Automatizados (`tests`)

| Caso de Teste | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/use-workspace-reveal-body-redirect.test.tsx:38 :: useWorkspaceRevealBodyRedirect` | `INFRA: describe suite header for useWorkspaceRevealBodyRedirect` |
| `components/sidebar/use-workspace-reveal-body-redirect.test.tsx:39 :: switches the body to Spaces and replays the request once the list is mounted` | `D15b-003` |
| `components/sidebar/use-workspace-reveal-body-redirect.test.tsx:68 :: does not intercept requests while Spaces is already showing` | `D15b-003` |
| `components/sidebar/use-workspace-status-drop.test.ts:4 :: workspace status document drop` | `INFRA: describe suite header for workspace status document drop` |
| `components/sidebar/use-workspace-status-drop.test.ts:5 :: commits multi-worktree status drops through the batched callback once` | `D15b-004` |
| `components/sidebar/use-workspace-status-drop.test.ts:25 :: commits multi-worktree pin drops through the batched callback once` | `D15b-004` |
| `components/sidebar/useRenderedSetupScriptPromptState.test.ts:20 :: useRenderedSetupScriptPromptState` | `INFRA: describe suite header for useRenderedSetupScriptPromptState` |
| `components/sidebar/useRenderedSetupScriptPromptState.test.ts:21 :: preserves a committed same-host prompt without leaking it to another host` | `D15b-010` |
| `components/sidebar/worktree-scroll-to-current-button.test.ts:4 :: getScrollTopToRevealBounds` | `INFRA: describe suite header for getScrollTopToRevealBounds` |
| `components/sidebar/worktree-scroll-to-current-button.test.ts:11 :: scrolls upward to reveal a mounted current workspace card above the viewport` | `D15b-014` |
| `components/sidebar/worktree-scroll-to-current-button.test.ts:15 :: scrolls downward to reveal a mounted current workspace card below the viewport` | `D15b-014` |
| `components/sidebar/worktree-scroll-to-current-button.test.ts:19 :: does not scroll when the current workspace card is already fully visible` | `D15b-014` |

---

## 4. Atalhos e Navegação por Teclado (`hotkeys` / `shortcuts`)

| Entrada de Atalho | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/use-workspace-reveal-body-redirect.ts:6 :: * Reveal requests (rename shortcut, reveal-active-workspace button) are handled inside the` | `D15b-003` |

---

## 5. Timers e Tarefas Agendadas (`timers`)

| Timer / Agendamento | Linha de Inventário |
|---|---|
| `components/sidebar/use-worktree-parent-picker-transition.ts:42 :: args.unmountTimerRef.current = window.setTimeout(() => {` | `D15b-009` |
| `components/sidebar/use-worktree-parent-picker-transition.ts:58 :: args.fallbackTimerRef.current = window.setTimeout(openPendingParentPicker, 50)` | `D15b-008` |

---

## 6. Subscriptions e Event Listeners (`subscriptions`)

| Subscription / Listener | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/use-workspace-reveal-body-redirect.test.tsx:59 :: window.addEventListener(SCROLL_TO_CURRENT_WORKSPACE_REVEAL_REQUEST_EVENT, listener)` | `INFRA: test event listener helper for redirect verification` |
| `components/sidebar/use-workspace-reveal-body-redirect.ts:14 :: useEffect(() => {` | `D15b-003` |
| `components/sidebar/use-workspace-reveal-body-redirect.ts:22 :: window.addEventListener(SCROLL_TO_CURRENT_WORKSPACE_REVEAL_REQUEST_EVENT, onRequest)` | `D15b-003` |
| `components/sidebar/use-workspace-reveal-body-redirect.ts:28 :: useEffect(() => {` | `D15b-003` |
| `components/sidebar/use-workspace-status-drop.ts:73 :: useEffect(() => {` | `D15b-005` |
| `components/sidebar/use-workspace-status-drop.ts:128 :: document.addEventListener('drop', handleDrop, true)` | `D15b-005` |
| `components/sidebar/use-workspace-status-drop.ts:129 :: document.addEventListener('dragend', handleDragFinish, true)` | `D15b-005` |
| `components/sidebar/useRenderedSetupScriptPromptState.ts:26 :: useEffect(() => {` | `D15b-010` |
