# Cobertura — Domínio D04b: Worktree Card Controllers

## Métricas de Cobertura

- **Arquivos produtivos:** 22/22 (100%)
- **Símbolos exportados:** 43/43 (100%)
- **Casos de teste:** 117/117 (100%)
- **Labels de UI / Menus:** 21/21 (100%)
- **Atalhos de teclado (Hotkeys):** 0/0 (100%)
- **Preferências / Settings:** 0/0 (100%)
- **Timers:** 2/2 (100%)
- **Subscriptions / Event Listeners:** 11/11 (100%)
- **Símbolos Preload / Backend:** 5/5 (100%)

---

## 1. Arquivos Produtivos (22/22)

| Arquivo | Capability IDs Mapeados |
| :--- | :--- |
| `active-worktree-focus-after-delete.ts` | `D04b-001` |
| `focused-agent-row-highlight.ts` | `D04b-002` |
| `local-base-ref-suggestion-toast.tsx` | `D04b-003` |
| `run-worktree-delete-with-toast.ts` | `D04b-004` |
| `truncated-sidebar-label.tsx` | `D04b-005` |
| `use-confirmed-worktree-delete-targets.ts` | `D04b-006` |
| `use-delete-worktree-status-hydration.ts` | `D04b-007` |
| `use-worktree-activity-status.ts` | `D04b-008` |
| `use-worktree-activity-statuses.ts` | `D04b-009` |
| `use-worktree-card-activation-actions.ts` | `D04b-010` |
| `use-worktree-card-controller.ts` | `D04b-011` |
| `use-worktree-card-foundation.ts` | `D04b-012` |
| `use-worktree-card-lifecycle-effects.ts` | `D04b-013` |
| `use-worktree-card-linked-details.ts` | `D04b-014` |
| `use-worktree-card-review-details.ts` | `D04b-015` |
| `use-worktree-card-secondary-details.ts` | `D04b-016` |
| `use-worktree-card-workspace-actions.ts` | `D04b-017` |
| `use-worktree-issue-link.ts` | `D04b-018` |
| `worktree-card-agent-ack-inputs.ts` | `D04b-019` |
| `worktree-card-send-target-inputs.ts` | `D04b-021` |
| `worktree-meta-updates.ts` | `D04b-022` |
| `worktree-name-suggestions.ts` | `D04b-023` |

---

## 2. Símbolos Exportados (43/43)

| Símbolo Exportado | Capability IDs / Justificativa |
| :--- | :--- |
| `EMPTY_SEND_TARGET_CONTROL_INPUTS` | `D04b-021` |
| `EMPTY_SEND_TARGET_INPUTS` | `D04b-021` |
| `FocusedAgentRowHighlightState` | `D04b-002` |
| `SendTargetControlInputs` | `D04b-021` |
| `SendTargetControlInputsState` | `D04b-021` |
| `SendTargetInputsState` | `D04b-021` |
| `TruncatedSidebarLabel` | `D04b-005` |
| `WorktreeCardController` | `D04b-011` |
| `WorktreeMetaDraft` | `D04b-022` |
| `WorktreeMetaLiveLinks` | `D04b-022` |
| `WorktreeMetaSavedPayload` | `D04b-022` |
| `WorktreeMetaSnapshot` | `D04b-022` |
| `WorktreeReviewProvider` | `D04b-022` |
| `buildWorktreeMetaUpdates` | `D04b-022` |
| `getFocusedAgentPaneKeyForWorktree` | `D04b-002` |
| `getSuggestedCreatureName` | `D04b-023` |
| `isIssueFieldDirty` | `D04b-022` |
| `isSidebarLabelTruncated` | `D04b-005` |
| `parseExplicitGitHubIssueUrl` | `D04b-022` |
| `parseGitHubWorkItemNumberForMetaField` | `D04b-022` |
| `parseGitLabMergeRequestNumberForMetaField` | `D04b-022` |
| `prepareActiveWorktreeFocusAfterDelete` | `D04b-001` |
| `runWorktreeDeleteWithToast` | `D04b-004` |
| `selectAcknowledgedAgentTimes` | `D04b-019` |
| `selectSendTargetControlInputs` | `D04b-021` |
| `selectSendTargetInputs` | `D04b-021` |
| `selectWorktreeActivityStatuses` | `D04b-009` |
| `shouldApplySuggestedName` | `D04b-023` |
| `showLocalBaseRefUpdateSuggestionToast` | `D04b-003` |
| `useConfirmedWorktreeDeleteTargets` | `D04b-006` |
| `useDeleteWorktreeStatusHydration` | `D04b-007` |
| `useFocusedAgentPaneKey` | `D04b-002` |
| `useWorktreeActivityStatus` | `D04b-008` |
| `useWorktreeActivityStatuses` | `D04b-009` |
| `useWorktreeCardActivationActions` | `D04b-010` |
| `useWorktreeCardController` | `D04b-011` |
| `useWorktreeCardFoundation` | `D04b-012` |
| `useWorktreeCardLifecycleEffects` | `D04b-013` |
| `useWorktreeCardLinkedDetails` | `D04b-014` |
| `useWorktreeCardReviewDetails` | `D04b-015` |
| `useWorktreeCardSecondaryDetails` | `D04b-016` |
| `useWorktreeCardWorkspaceActions` | `D04b-017` |
| `useWorktreeIssueLink` | `D04b-018` |

---

## 3. Casos de Teste (117/117)

| Caso de Teste (`arquivo:linha :: nome`) | Capability ID / Justificativa |
| :--- | :--- |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:78 :: prepareActiveWorktreeFocusAfterDelete` | `D04b-001` |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:91 :: focuses the most-recently-visited non-base sibling of the same project` | `D04b-001` |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:103 :: falls back to the base/primary worktree when no other workspace remains` | `D04b-001` |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:114 :: does not re-focus a sibling hosted on a torn-down runtime-owned SSH target` | `D04b-001` |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:130 :: stays within the deleted worktree project instead of jumping to another project` | `D04b-001` |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:148 :: does not steal focus when the deleted worktree was not the active one` | `D04b-001` |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:159 :: does not reclaim focus when the user navigated away during the delete` | `D04b-001` |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:172 :: does not steal focus when the delete starts from a non-terminal view` | `D04b-001` |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:186 :: does not reclaim focus when the user leaves terminal view during the delete` | `D04b-001` |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:198 :: does not steal focus when a pending creation panel is active before delete` | `D04b-001` |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:212 :: does not reclaim focus when pending creation opens during the delete` | `D04b-001` |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:224 :: skips workspaces that are themselves mid-delete when picking a successor` | `D04b-001` |
| `components/sidebar/active-worktree-focus-after-delete.test.ts:237 :: does not steal focus when a non-worktree workspace is active` | `D04b-001` |
| `components/sidebar/focused-agent-row-highlight.test.ts:84 :: getFocusedAgentPaneKeyForWorktree` | `D04b-002` |
| `components/sidebar/focused-agent-row-highlight.test.ts:85 :: returns the focused pane key when that pane has a live agent status` | `D04b-002` |
| `components/sidebar/focused-agent-row-highlight.test.ts:95 :: highlights a focused row whose status has decayed past freshness` | `D04b-002` |
| `components/sidebar/focused-agent-row-highlight.test.ts:107 :: does not return another split pane in the same terminal tab` | `D04b-002` |
| `components/sidebar/focused-agent-row-highlight.test.ts:117 :: does not highlight while another surface type is active` | `D04b-002` |
| `components/sidebar/focused-agent-row-highlight.test.ts:128 :: returns retained agent row pane keys for the focused pane` | `D04b-002` |
| `components/sidebar/focused-agent-row-highlight.test.ts:145 :: returns migration-unsupported agent row pane keys for the focused pane` | `D04b-002` |
| `components/sidebar/local-base-ref-suggestion-toast.test.tsx:77 :: showLocalBaseRefUpdateSuggestionToast` | `D04b-003` |
| `components/sidebar/local-base-ref-suggestion-toast.test.tsx:78 :: does nothing without a suggestion` | `D04b-003` |
| `components/sidebar/local-base-ref-suggestion-toast.test.tsx:83 :: turns on the setting and confirms from the Keep main up to date button` | `D04b-003` |
| `components/sidebar/local-base-ref-suggestion-toast.test.tsx:100 :: reports failure when enabling cannot persist the setting` | `D04b-003` |
| `components/sidebar/local-base-ref-suggestion-toast.test.tsx:118 :: deep-links to the Git setting and closes the toast from the Settings link` | `D04b-003` |
| `components/sidebar/local-base-ref-suggestion-toast.test.tsx:138 :: does not record a permanent dismissal when opening the Git setting` | `D04b-003` |
| `components/sidebar/truncated-sidebar-label.test.tsx:18 :: isSidebarLabelTruncated` | `D04b-005` |
| `components/sidebar/truncated-sidebar-label.test.tsx:19 :: returns false when the label fits` | `D04b-005` |
| `components/sidebar/truncated-sidebar-label.test.tsx:24 :: returns true when the label overflows` | `D04b-005` |
| `components/sidebar/truncated-sidebar-label.test.tsx:29 :: TruncatedSidebarLabel` | `D04b-005` |
| `components/sidebar/truncated-sidebar-label.test.tsx:75 :: remeasures when the branch text changes without a resize event` | `D04b-005` |
| `components/sidebar/truncated-sidebar-label.test.tsx:98 :: keeps the nested tooltip disabled when a parent hover owns the full identity` | `D04b-005` |
| `components/sidebar/truncated-sidebar-label.test.tsx:111 :: keeps one ResizeObserver across a label text change` | `D04b-005` |
| `components/sidebar/use-worktree-activity-status.test.tsx:103 :: useWorktreeActivityStatus` | `D04b-008` |
| `components/sidebar/use-worktree-activity-status.test.tsx:124 :: keeps a restored offscreen working agent yellow from the hook snapshot` | `D04b-008` |
| `components/sidebar/use-worktree-activity-status.test.tsx:145 :: lets a fresh hook done state override the same pane stale working title` | `D04b-008` |
| `components/sidebar/use-worktree-activity-status.test.tsx:174 :: lets a retained done row override the same pane stale working title` | `D04b-008` |
| `components/sidebar/use-worktree-activity-status.test.tsx:209 :: does not keep the card working when all retained parent agents are done` | `D04b-008` |
| `components/sidebar/use-worktree-activity-status.test.tsx:252 :: lets a legacy numeric done hook override the matching stale working title` | `D04b-008` |
| `components/sidebar/use-worktree-activity-status.test.tsx:277 :: lets a completed worker suppress its parent pane stale working title` | `D04b-008` |
| `components/sidebar/use-worktree-activity-status.test.tsx:315 :: scopes cached agent summaries to the matching worktree` | `D04b-008` |
| `components/sidebar/use-worktree-activity-statuses.test.ts:22 :: selectWorktreeActivityStatuses` | `D04b-009` |
| `components/sidebar/use-worktree-activity-statuses.test.ts:23 :: stays shallow-equal when an unrelated worktree receives activity updates` | `D04b-009` |
| `components/sidebar/use-worktree-card-secondary-details.store-subscriptions.test.tsx:112 :: useWorktreeCardSecondaryDetails store subscriptions` | `D04b-016` |
| `components/sidebar/use-worktree-card-secondary-details.store-subscriptions.test.tsx:113 :: adds no store listener of its own beyond the hooks it composes` | `D04b-016` |
| `components/sidebar/use-worktree-card-secondary-details.store-subscriptions.test.tsx:142 :: reads the cache TTL from the passed settings` | `D04b-016` |
| `components/sidebar/use-worktree-card-secondary-details.store-subscriptions.test.tsx:158 :: reports no TTL while the aggregate cache timer is suppressed` | `D04b-016` |
| `components/sidebar/use-worktree-card-secondary-details.store-subscriptions.test.tsx:173 :: writes a suppression tombstone when the user unlinks a displayed GitHub PR` | `D04b-016` |
| `components/sidebar/use-worktree-card-secondary-details.store-subscriptions.test.tsx:201 :: surfaces a failed GitHub unlink after the optimistic card update is reverted` | `D04b-016` |
| `components/sidebar/worktree-card-agent-ack-inputs.test.tsx:30 :: selectAcknowledgedAgentTimes` | `D04b-019` |
| `components/sidebar/worktree-card-agent-ack-inputs.test.tsx:49 :: projects only this card rows so unrelated acknowledgements stay shallow-equal` | `D04b-019` |
| `components/sidebar/worktree-card-agent-ack-inputs.test.tsx:78 :: updates when one of this card rows is acknowledged` | `D04b-019` |
| `components/sidebar/worktree-card-markdown-isolation.test.ts:76 :: worktree card markdown performance isolation` | `D04b-020` |
| `components/sidebar/worktree-card-markdown-isolation.test.ts:77 :: keeps CommentMarkdown off the renderer boot graph entirely` | `D04b-020` |
| `components/sidebar/worktree-card-markdown-isolation.test.ts:86 :: routes both sidebar markdown surfaces through the shared lazy boundary` | `D04b-020` |
| `components/sidebar/worktree-card-send-target-inputs.test.ts:37 :: selectSendTargetInputs` | `D04b-021` |
| `components/sidebar/worktree-card-send-target-inputs.test.ts:38 :: returns the shared empty constant when the popover does not target this worktree` | `D04b-021` |
| `components/sidebar/worktree-card-send-target-inputs.test.ts:55 :: stays the stable empty constant when the popover targets a different worktree` | `D04b-021` |
| `components/sidebar/worktree-card-send-target-inputs.test.ts:60 :: exposes the live maps when the popover targets this worktree` | `D04b-021` |
| `components/sidebar/worktree-card-send-target-inputs.test.ts:73 :: shallow-changes only when a subscribed map reference actually changes while active` | `D04b-021` |
| `components/sidebar/worktree-card-send-target-inputs.test.ts:92 :: selectSendTargetControlInputs` | `D04b-021` |
| `components/sidebar/worktree-card-send-target-inputs.test.ts:93 :: stays stable across global epoch changes while the picker is closed` | `D04b-021` |
| `components/sidebar/worktree-card-send-target-inputs.test.ts:108 :: stays stable when the picker targets another worktree` | `D04b-021` |
| `components/sidebar/worktree-card-send-target-inputs.test.ts:117 :: tracks the mode and freshness epoch only for the targeted worktree` | `D04b-021` |
| `components/sidebar/worktree-meta-updates.test.ts:61 :: buildWorktreeMetaUpdates` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:62 :: writes only the GitLab MR slot in GitLab mode` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:69 :: accepts only positive MR references for the GitLab review row` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:91 :: emits no link keys when the issue field is untouched` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:105 :: writes a GitHub issue number and clears the Linear slots` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:116 :: emits no Linear clear when the workspace holds no Linear link` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:125 :: writes a bare Linear identifier and clears the stored organization key` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:134 :: takes the organization key from a Linear issue URL` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:148 :: clears every provider slot when the issue field is emptied` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:163 :: treats a provider switch with unchanged text as dirty` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:173 :: displaces a Linear linked work item when the issue field changes` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:190 :: leaves a PR-typed work item alone` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:203 :: leaves work items owned by other providers alone` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:218 :: emits nothing when a GitHub number is respelled with a hash` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:228 :: emits nothing when a Linear identifier is respelled in lower case` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:238 :: emits nothing when a Linear identifier is respelled as its stored URL` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:254 :: records an organization key for a stored bare identifier without displacing it` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:272 :: displaces the work item when a URL names another organization` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:295 :: clears a Linear link added after the snapshot was taken` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:302 :: clears a Linear link added after the snapshot when the field is emptied` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:313 :: ignores a provider switch on an empty field` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:325 :: does not displace a Linear work item when the issue field is clean` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:332 :: leaves links untouched for unparseable issue input` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:344 :: clears a display name with empty string, never a present-undefined key` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:350 :: rejects issue URLs in the PR input` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:356 :: accepts PR URLs in the PR input` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:362 :: records suppression when the user clears an explicit PR link` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:369 :: does not invent suppression for an already-unlinked PR field` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:373 :: does not suppress a PR linked in the background when the PR field is untouched` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:379 :: accepts issue URLs in the issue input` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:394 :: rejects PR URLs in the issue input` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:400 :: emits no comment when the note is unchanged` | `D04b-022` |
| `components/sidebar/worktree-meta-updates.test.ts:410 :: clears a comment with empty string, never a present-undefined key` | `D04b-022` |
| `components/sidebar/worktree-name-suggestions.test.ts:16 :: getSuggestedCreatureName` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:17 :: picks the first unused name when the RNG selects index 0` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:21 :: dedupes against worktrees in EVERY repo, not just one` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:33 :: never reuses a name already used in another repo` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:47 :: selects randomly from the unused pool` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:54 :: falls back to suffixed variants after the base list is exhausted` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:60 :: never reissues a retired name whose workspace is already deleted` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:66 :: treats retired names case-insensitively` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:72 :: retires names on top of live worktrees rather than replacing that check` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:82 :: skips a retired suffixed variant when falling back past an exhausted pool` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:90 :: treats used names case-insensitively` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:96 :: handles Windows-style worktree paths when deriving used basenames` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:102 :: handles stored worktree paths with trailing separators` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:117 :: shouldApplySuggestedName` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:118 :: applies a suggestion when the field is blank` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:123 :: applies a recomputed suggestion when the current value is still the prior suggestion` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:127 :: does not overwrite a user-edited custom name when the repo selection changes` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:132 :: MARINE_CREATURES` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:133 :: is non-empty and unique after normalization and sanitization` | `D04b-023` |
| `components/sidebar/worktree-name-suggestions.test.ts:143 :: avoids names that read poorly as UI defaults` | `D04b-023` |

---

## 4. Labels de UI e Menus (21/21)

| Entrada de Label / Texto (`arquivo:linha :: texto`) | Capability ID / Justificativa |
| :--- | :--- |
| `components/sidebar/local-base-ref-suggestion-toast.test.tsx:59 :: function clickButton(container: HTMLElement, label: string): void {` | INFRA: test helper function clickButton |
| `components/sidebar/run-worktree-delete-with-toast.ts:89 :: label: translate('auto.components.sidebar.delete.worktree.flow.7488ed8711', 'View'),` | `D04b-004` |
| `components/sidebar/truncated-sidebar-label.test.tsx:8 :: vi.mock('@/components/ui/tooltip', () => ({` | INFRA: test fixture/assertion for tooltip |
| `components/sidebar/truncated-sidebar-label.test.tsx:11 :: <div className={className} data-tooltip-content="">` | INFRA: test fixture/assertion for tooltip |
| `components/sidebar/truncated-sidebar-label.test.tsx:80 :: expect(container.querySelector('[data-tooltip-content]')).toBeNull()` | INFRA: test fixture/assertion for tooltip |
| `components/sidebar/truncated-sidebar-label.test.tsx:86 :: const longTooltip = container.querySelector('[data-tooltip-content]')` | INFRA: test fixture/assertion for tooltip |
| `components/sidebar/truncated-sidebar-label.test.tsx:95 :: expect(container.querySelector('[data-tooltip-content]')).toBeNull()` | INFRA: test fixture/assertion for tooltip |
| `components/sidebar/truncated-sidebar-label.test.tsx:98 :: it('keeps the nested tooltip disabled when a parent hover owns the full identity', async () => {` | INFRA: test fixture/assertion for tooltip |
| `components/sidebar/truncated-sidebar-label.test.tsx:101 :: <TruncatedSidebarLabel text="feature/really-long-branch-name" tooltipEnabled={false} />` | INFRA: test fixture/assertion for tooltip |
| `components/sidebar/truncated-sidebar-label.test.tsx:106 :: expect(container.querySelector('[data-tooltip-content]')).toBeNull()` | INFRA: test fixture/assertion for tooltip |
| `components/sidebar/truncated-sidebar-label.tsx:2 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | INFRA: type definitions/imports for tooltip props |
| `components/sidebar/truncated-sidebar-label.tsx:14 :: tooltipEnabled?: boolean` | INFRA: type definitions/imports for tooltip props |
| `components/sidebar/truncated-sidebar-label.tsx:15 :: tooltipSide?: 'top' | 'right' | 'bottom' | 'left'` | INFRA: type definitions/imports for tooltip props |
| `components/sidebar/truncated-sidebar-label.tsx:16 :: tooltipSideOffset?: number` | INFRA: type definitions/imports for tooltip props |
| `components/sidebar/truncated-sidebar-label.tsx:22 :: tooltipEnabled = true,` | `D04b-005` |
| `components/sidebar/truncated-sidebar-label.tsx:23 :: tooltipSide = 'right',` | `D04b-005` |
| `components/sidebar/truncated-sidebar-label.tsx:24 :: tooltipSideOffset = 8` | `D04b-005` |
| `components/sidebar/truncated-sidebar-label.tsx:78 :: if (!tooltipEnabled || !truncated) {` | `D04b-005` |
| `components/sidebar/truncated-sidebar-label.tsx:86 :: side={tooltipSide}` | `D04b-005` |
| `components/sidebar/truncated-sidebar-label.tsx:87 :: sideOffset={tooltipSideOffset}` | `D04b-005` |
| `components/sidebar/worktree-card-send-target-inputs.test.ts:29 :: label: 'Send',` | INFRA: test fixture mock label |

---

## 5. Atalhos de Teclado (Hotkeys) (0/0)

Nenhum atalho de teclado direto registrado neste domínio (`shortcuts: []`).


---

## 6. Preferências e Persistência (Prefs) (0/0)

Nenhuma chave de preferência direta registrada em `prefs: []` no índice mecânico.


---

## 7. Timers (2/2)

| Timer (`arquivo:linha :: texto`) | Capability ID / Justificativa |
| :--- | :--- |
| `components/sidebar/use-worktree-issue-link.ts:23 :: let timer: ReturnType<typeof setTimeout> | undefined` | `D04b-018` |
| `components/sidebar/use-worktree-issue-link.ts:28 :: timer = setTimeout(() => resolve(null), OPEN_ISSUE_TIMEOUT_MS)` | `D04b-018` |

---

## 8. Subscriptions e Event Listeners (11/11)

| Subscription / Listener (`arquivo:linha :: texto`) | Capability ID / Justificativa |
| :--- | :--- |
| `components/sidebar/truncated-sidebar-label.tsx:52 :: window.addEventListener('resize', updateTruncated)` | `D04b-005` |
| `components/sidebar/use-delete-worktree-status-hydration.ts:38 :: useEffect(() => {` | `D04b-007` |
| `components/sidebar/use-worktree-card-foundation.ts:153 :: useEffect(() => {` | `D04b-012` |
| `components/sidebar/use-worktree-card-lifecycle-effects.ts:59 :: useEffect(() => {` | `D04b-013` |
| `components/sidebar/use-worktree-card-lifecycle-effects.ts:113 :: useEffect(() => {` | `D04b-013` |
| `components/sidebar/use-worktree-card-lifecycle-effects.ts:161 :: useEffect(() => {` | `D04b-013` |
| `components/sidebar/use-worktree-card-lifecycle-effects.ts:183 :: useEffect(() => {` | `D04b-013` |
| `components/sidebar/use-worktree-card-lifecycle-effects.ts:208 :: useEffect(() => {` | `D04b-013` |
| `components/sidebar/use-worktree-card-lifecycle-effects.ts:220 :: window.addEventListener('focus', refreshLinearIssueIfVisible)` | `D04b-013` |
| `components/sidebar/use-worktree-card-lifecycle-effects.ts:221 :: document.addEventListener('visibilitychange', refreshLinearIssueIfVisible)` | `D04b-013` |
| `components/sidebar/use-worktree-card-lifecycle-effects.ts:228 :: useEffect(() => {` | `D04b-013` |

---

## 9. Símbolos Preload e Contratos Backend (5/5)

| Símbolo Preload (`arquivo:linha :: texto`) | Capability ID / Justificativa |
| :--- | :--- |
| `components/sidebar/use-worktree-issue-link.ts:177 :: void window.api.shell.openUrl(linearIssueUrl)` | `D04b-018` |
| `components/sidebar/use-worktree-issue-link.ts:194 :: void window.api.shell.openUrl(url)` | `D04b-018` |
| `components/sidebar/use-worktree-issue-link.ts:210 :: void window.api.shell.openUrl(issueUrlFromInput)` | `D04b-018` |
| `components/sidebar/use-worktree-issue-link.ts:219 :: void window.api.shell.openUrl(cachedIssueUrl)` | `D04b-018` |
| `components/sidebar/use-worktree-issue-link.ts:236 :: void window.api.shell.openUrl(url)` | `D04b-018` |

---

## 10. Entradas Justificadas como INFRA / N/A / DUP

| Entrada | Justificativa |
| :--- | :--- |
| `components/sidebar/local-base-ref-suggestion-toast.test.tsx:59` | INFRA: helper de clique em botão nos testes unitários |
| `components/sidebar/truncated-sidebar-label.test.tsx:8` | INFRA: mock de vitest para o componente Tooltip |
| `components/sidebar/truncated-sidebar-label.test.tsx:11` | INFRA: fixture JSX data-tooltip-content nos testes |
| `components/sidebar/truncated-sidebar-label.test.tsx:80` | INFRA: asserção toBeNull de tooltip |
| `components/sidebar/truncated-sidebar-label.test.tsx:86` | INFRA: querySelector de elemento tooltip |
| `components/sidebar/truncated-sidebar-label.test.tsx:95` | INFRA: asserção toBeNull de tooltip |
| `components/sidebar/truncated-sidebar-label.test.tsx:98` | INFRA: bloco de descrição it(...) de teste |
| `components/sidebar/truncated-sidebar-label.test.tsx:101` | INFRA: fixture JSX TruncatedSidebarLabel nos testes |
| `components/sidebar/truncated-sidebar-label.test.tsx:106` | INFRA: asserção toBeNull de tooltip |
| `components/sidebar/truncated-sidebar-label.tsx:2` | INFRA: declaração de importação de Tooltip UI |
| `components/sidebar/truncated-sidebar-label.tsx:14` | INFRA: tipagem de prop tooltipEnabled |
| `components/sidebar/truncated-sidebar-label.tsx:15` | INFRA: tipagem de prop tooltipSide |
| `components/sidebar/truncated-sidebar-label.tsx:16` | INFRA: tipagem de prop tooltipSideOffset |
| `components/sidebar/worktree-card-send-target-inputs.test.ts:29` | INFRA: fixture mock label 'Send' nos testes |