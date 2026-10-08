# D04b — Worktree Card Controllers (Orca → Hydra) — Gaps

Fonte: `domains/D04b-worktree-card-controllers.orca.json` (23 linhas) · veredito: `domains/D04b-worktree-card-controllers.diff.json`
Mount Hydra: `src/App.tsx:3636 <WorktreeSidebar>` · backend Rust: `src-tauri/src/lib.rs`

## Sumário

| status | n | ids |
|---|---|---|
| parity | 0 | — |
| partial | 11 | 004, 005, 007, 008, 009, 010, 011, 012, 014, 015, 017 |
| missing | 12 | 001, 002, 003, 006, 013, 016, 018, 019, 020, 021, 022, 023 |
| not-applicable / out-of-scope | 0 | — |

Nenhuma linha atinge `parity`. O sidebar do Hydra tem o *esqueleto* visual do card (header, meta row, status lane, agent list, badge de PR, label truncado) montado a partir de `WorktreeSidebar`, mas os *controllers* que dão comportamento ao card (deleção com toast/waiver, polling de review/issue, edição de metadados, sugestão de nomes, foco pós-delete, destaque de pane focado) em grande parte não existem ou são auto-stubs declarados (`// Auto-stub so the Orca port typechecks` — 484 arquivos no repo).

## Padrão transversal: "existe ≠ funciona"

- `src/store/slices/worktrees/teardown/remove-worktree.ts:9` → `createRemoveWorktree: any = null`; `src/store/slices/worktrees.ts:94` publica `removeWorktree` que **nunca é chamado** (0 call-sites). O delete real é `DeleteWorktreeDialog.tsx:106 invoke('delete_worktree')`.
- `src/shared/worktree/card-properties.ts:1`, `src/lib/worktree-visit-recency.ts:1`, `src/store/slices/worktrees/metadata/update-worktree-meta.ts:1`, `src/components/sidebar/worktree-title-derived-agent-rows.ts:1`, `src/shared/marine-creatures.ts:1`, `src/shared/github/links.ts:1`, `src/shared/linear/links.ts:1`, `src/shared/jira-issue-url.ts:1` — todos stubs.
- `src/store/slices/hosted-review.ts:2` é `@ts-nocheck` "Orca port buffer" e `fetchHostedReviewForBranch` não tem call-site.
- Código morto por construção: `showUnreadQuickAction` (`worktree-card-presentation.tsx:88`) nunca renderizado; `CacheTimer` (`CacheTimer.tsx:10`) só renderiza se `cacheStartedAt != null`, mas o controller fixa `cacheStartedAt: null` (`use-worktree-card-controller.ts:305`); `onLineageToggle` (`:286`) e `writeWorkspaceDragData` (`workspace-status-drag-data.ts:8`) sem consumidor; `resolveWorktreeStatus` (`src/lib/worktree-status.ts`) e `useRetiredWorktreeNames.ts:21` sem call-site.

## Top gaps (≤10)

1. **D04b-001 — Foco do sucessor pós-delete: inexistente.** `App.tsx:1789` só faz `refreshGitWorktrees` + evento; `setActiveWorktreePath` nunca é tocado após delete. Nenhuma busca encontrou `prepareActiveWorktreeFocusAfterDelete`/`activateAndRevealWorktree`/`lastVisitedAtByWorktreeId`.
2. **D04b-004/006 — Deleção sem toasts interativos nem waivers.** `DeleteWorktreeDialog.tsx:177` mostra erro inline; não há `View changes`, `Delete Anyway` (`allowFailedArchiveHook`) nem `allowUnverifiedPtyStop`, embora as opções existam e não sejam usadas (`store/slices/worktree-removal-options.ts:11-14`, `shared/worktree/archive-hook-removal-gate.ts:21`). Backend `delete_worktree` (`src-tauri/src/lib.rs:476`) só aceita `repo_path`/`worktree_path`.
3. **D04b-013/015/016 — Nenhum polling nem cache de review/issue no card.** `HOSTED_REVIEW_CARD_REFRESH_INTERVAL_MS` (`worktree-card-model.ts:116`) tem zero consumidores; `fetchHostedReviewForBranch` sem call-site; o card só recebe `prDisplay` via `pr_status` (`App.tsx:2023`, `lib.rs:410`), GitHub-only, sem reconciliação multi-provedor nem `suppressedGitHubPR`.
4. **D04b-010/022 — Edição de metadados do card ausente/desligada.** Não existe diálogo `edit-meta`; duplo-clique abre renomeação inline (`use-worktree-card-controller.ts:179`) cujo handler está **desconectado do mount** (App não passa `onRenameWorktreeTitle` ao `<WorktreeSidebar>` — `App.tsx:3636-3688`), então renomear pelo card é no-op; rename real só no menu de contexto (`App.tsx:3342`). `buildWorktreeMetaUpdates`/`isIssueFieldDirty`/parsers GitHub-GitLab inexistem.
5. **D04b-014 — Badges de issue (Linear/Jira/GitHub) e título composto não existem.** A meta row (`worktree-card-meta-row.tsx`) renderiza repo/identidade/detached/conflict/cache, mas não `issueDisplay`/`linearIssueDisplay`/`jiraIssueDisplay`; `visibleCardTitle` (`:152`) é só displayName|branch|basename.
6. **D04b-002 — Destaque do row de agente focado é dormente.** `worktree-card-compact-agents.tsx:221` usa `activeSessionId`, mas `WorktreeSidebar`/`WorktreeList` nunca passam essa prop → `isFocusedPane` sempre false.
7. **D04b-018 — Abrir link de issue não existe.** Nenhum campo `edit-meta` de issue, nenhum `OPEN_ISSUE_TIMEOUT_MS`/`openRequestRef`; `window.api.shell.openUrl` existe só para portas (`workspace-port-actions.ts:125`).
8. **D04b-023 — Sugestão de nome de criatura é stub.** `MARINE_CREATURES: any = null` (`shared/marine-creatures.ts:3`); `CREATURE_POOL_NAMES` (`retired-name-registry.ts:18`) quebraria em runtime; `NewWorkspaceComposer.tsx:264` tem input de nome sem sugestão.
9. **D04b-012 — Runtime/SSH do card hardcoded.** `conflictOperation: ''` (`:304`), `isRuntimeDisconnected: false` (`:318`), `isQueuedForDeletion: false` (`:319`), `remoteBranchConflict` sempre false; selectors SSH runtime-aware existem na store mas o card não os usa.
10. **D04b-019/020/021 — Projeções de performance ausentes.** Sem `selectAcknowledgedAgentTimes` por card, sem `CommentMarkdown`/markdown no sidebar, sem `selectSendTargetInputs` (o estado `agentSendPopoverTargetMode` existe em `ui-slice-agent-actions.ts:50` mas nenhum popover o consome).

## Paridades notáveis (parciais mais próximas)

- **D04b-005 (`partial`, mais próximo de parity)** — `truncated-sidebar-label.tsx` implementa medição (`:4`), `ResizeObserver` + fallback `resize` (`:49`), remede em `useLayoutEffect` (`:62`) e modo nativo `title` (`:69`); falta apenas o wrapper `Tooltip/TooltipContent` do design system e `tooltipSide/tooltipSideOffset` (props em `:14-15`, ignorados no render). Alvo do PAR-34.
- **D04b-007** — hidratação de status git dos alvos já existe ao abrir o modal (`App.tsx:1795-1810` → `get_detailed_git_status_cmd`, `lib.rs:113`), faltando geração/ordenação/AbortController/prioridade background.
- **D04b-008/009** — o dot de atividade é real via `workspaceStatusFrom` (`workspace-status-signals.ts:14`, usado em `WorktreeList.tsx:358,521`) e `WorktreeStatusIndicator.tsx:37`; divergem apenas as entradas (sessions em vez de PTY/pane titles/layouts/agent summary) — divergência documentada em `workspace-status-signals.ts:9-13`.
- **D04b-017** — quick action de delete, drag start/end, context menu e `stopQuickActionPointerPropagation` estão wired; faltam ramo de folder workspace, `expectedHostId`, rótulos de linhagem e `writeWorkspaceDragData`.
- **D04b-015** — badge de review realmente renderiza da lane (`WorktreeCardStatusLane.tsx:38`, `WorktreeCardReviewBadge.tsx:29`) alimentado por `pr_status`; falta a camada de caches/subscrições seletivas e supressão.

## Cross-walk PAR (escopo sidebar)

| PAR | rows D04b | hydra_status |
|---|---|---|
| PAR-05 | 004, 011, 014 | partial |
| PAR-34 | 005 | partial |
| PAR-39 | 020 | missing |
| PAR-56 | 004, 006, 007 | partial |
| PAR-60 | 016 | missing |
| PAR-62 | 014 | missing |
| PAR-66 | 002, 019 | missing |
| PAR-67 | 011, 017 | partial |
| PAR-73 | 010 | partial |
| PAR-74 | 010 | missing |
| PAR-86 | 004 | missing |
| PAR-87 | 015, 016 | missing |

(Entradas replicadas em `diff.json.par_crosswalk`; a fusão em `domains/_par-crosswalk.json` concatena com os itens já gravados por outros domínios.)

## Cobertura

23/23 ids com veredito exatamente uma vez (validado por script). Cobertura de `files/symbols/tests/labels/hotkeys/prefs/timers/subscriptions/preload` herdada da Fase 1 sem reescrita: `tests`/`labels`/`timers`/`subscriptions`/`preload` estão tagueados por id ou `INFRA:`; `hotkeys`/`prefs` vazios; `files`/`symbols` são listas de entrada do Orca (não obrigações de id).
