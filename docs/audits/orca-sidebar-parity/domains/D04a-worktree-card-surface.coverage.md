# Cobertura — Domínio D04a: Worktree Card Surface

## Métricas de Cobertura

- **Arquivos produtivos:** 50/50 (100%)
- **Símbolos exportados:** 119/119 (100%)
- **Casos de teste:** 433/433 (100%)
- **Labels de UI / Menus:** 260/260 (100%)
- **Atalhos de teclado (Hotkeys):** 64/64 (100%)
- **Preferências / Settings:** 0/0 (100% — o índice do domínio não registra prefs; as preferências consumidas vêm do store e estão em `state_inputs`)
- **Timers:** 1/1 (100%)
- **Subscriptions / Event Listeners:** 5/5 (100%)
- **Símbolos Preload / Backend:** 7/7 (100%)

Total de linhas de capability: **111** (IDs `D04a-001`…`D04a-111`).

---

## 1. Arquivos Produtivos (50/50)

| Entrada | Capability ID / Justificativa |
| :--- | :--- |
| `WorktreeCard.tsx` | `D04a-001, D04a-050` |
| `WorktreeCardAgents.tsx` | `D04a-078, D04a-079, D04a-080, D04a-083, D04a-084, D04a-085, D04a-086, D04a-088, D04a-092` |
| `WorktreeCardAutomationDetailSection.tsx` | `D04a-045` |
| `WorktreeCardCliDetailSection.tsx` | `D04a-046` |
| `WorktreeCardDetailSection.tsx` | `D04a-049` |
| `WorktreeCardDisplayMenuSection.tsx` | `D04a-109` |
| `WorktreeCardHelpers.tsx` | `D04a-104` |
| `WorktreeCardHoverIdentityHeader.tsx` | `D04a-039` |
| `WorktreeCardIssueDetailSection.tsx` | `D04a-040` |
| `WorktreeCardMeta.tsx` | `D04a-037, D04a-039, D04a-042, D04a-043, D04a-044, D04a-047, D04a-048` |
| `WorktreeCardMetaBadges.tsx` | `D04a-025, D04a-026` |
| `WorktreeCardMetadataControls.tsx` | `D04a-027, D04a-028, D04a-029` |
| `WorktreeCardMetadataStatusBadges.tsx` | `D04a-030, D04a-031, D04a-032, D04a-033` |
| `WorktreeCardPorts.tsx` | `D04a-034, D04a-035, D04a-036` |
| `WorktreeCardReviewDetailSection.tsx` | `D04a-041` |
| `WorktreeCardSshHostControl.tsx` | `D04a-012, D04a-013` |
| `WorktreeCardStatusSlot.tsx` | `D04a-021, D04a-022, D04a-023, D04a-024` |
| `WorktreeContextMenu.tsx` | `D04a-051, D04a-072` |
| `WorktreeContextMenuOverlays.tsx` | `D04a-070, D04a-071` |
| `WorktreeContextMenuView.tsx` | `D04a-052, D04a-053, D04a-057, D04a-058, D04a-059, D04a-060, D04a-061, D04a-062, D04a-063, D04a-064, D04a-065, D04a-066, D04a-067, D04a-068, D04a-069, D04a-072` |
| `WorktreeDeveloperMenu.tsx` | `D04a-066` |
| `WorktreeDisplayNameField.tsx` | `D04a-094` |
| `WorktreeHostContextBadge.tsx` | `D04a-108` |
| `WorktreeIssueLinkField.tsx` | `D04a-095` |
| `WorktreeMetaDialog.tsx` | `D04a-093, D04a-097, D04a-098` |
| `WorktreeOpenInMenu.tsx` | `D04a-055, D04a-056` |
| `WorktreeReviewLinkField.tsx` | `D04a-096` |
| `WorktreeStatusMenuItems.tsx` | `D04a-054` |
| `WorktreeTitleInlineRename.tsx` | `D04a-073, D04a-074, D04a-075, D04a-076, D04a-077` |
| `worktree-card-agent-summary.ts` | `D04a-089` |
| `worktree-card-agents-expansion-state.ts` | `D04a-087` |
| `worktree-card-compact-agent-row.tsx` | `D04a-080, D04a-085, D04a-090, D04a-091` |
| `worktree-card-compact-agents.tsx` | `D04a-081, D04a-082` |
| `worktree-card-details-hover-state.ts` | `D04a-038` |
| `worktree-card-display-property-options.ts` | `D04a-110` |
| `worktree-card-dom-events.ts` | `D04a-107` |
| `worktree-card-header.tsx` | `D04a-005, D04a-011, D04a-012, D04a-014, D04a-015, D04a-016, D04a-017, D04a-018, D04a-019` |
| `worktree-card-jira-issue-display.ts` | `D04a-102` |
| `worktree-card-meta-row.tsx` | `D04a-010` |
| `worktree-card-meta-types.ts` | `D04a-111` |
| `worktree-card-model.ts` | `D04a-106` |
| `worktree-card-parent-content.tsx` | `D04a-005, D04a-009` |
| `worktree-card-pr-display.ts` | `D04a-101` |
| `worktree-card-presentation.tsx` | `D04a-007, D04a-008` |
| `worktree-card-secondary-rows.tsx` | `D04a-020` |
| `worktree-card-status-inputs.ts` | `D04a-105` |
| `worktree-card-surface.tsx` | `D04a-002, D04a-003, D04a-004, D04a-005, D04a-006, D04a-051` |
| `worktree-card-title-display.ts` | `D04a-100` |
| `worktree-issue-displacement.ts` | `D04a-099` |
| `worktree-review-helpers.tsx` | `D04a-103` |

## 2. Símbolos Exportados (119/119)

| Entrada | Capability ID / Justificativa |
| :--- | :--- |
| `SUPPRESS_WORKTREE_LIST_SCROLL_ADJUSTMENT_EVENT` | `D04a-088` |
| `WorktreeCardAutomationDetailSection` | `D04a-045` |
| `WorktreeCardCliDetailSection` | `D04a-046` |
| `WorktreeCardDetailSection` | `D04a-049` |
| `WorktreeCardDetailSectionContent` | `D04a-049` |
| `WorktreeCardDisplayMenuSection` | `D04a-109` |
| `branchDisplayName` | `D04a-104` |
| `checksLabel` | `D04a-104` |
| `CONFLICT_OPERATION_LABELS` | `D04a-104` |
| `EMPTY_TABS` | `D04a-104` |
| `EMPTY_BROWSER_TABS` | `D04a-104` |
| `FilledBellIcon` | `D04a-104` |
| `PullRequestIcon` | `D04a-104` |
| `WorktreeCardHoverIdentityHeader` | `D04a-039` |
| `WorktreeCardIssueDetailSection` | `D04a-040` |
| `WorktreeCardDetailsHover` | `D04a-037` |
| `hasWorktreeCardDetails` | `D04a-026` |
| `WorktreeCardMetaBadges` | `D04a-025` |
| `MetaIconBadge` | `D04a-027` |
| `DetailHeader` | `D04a-028` |
| `MetadataActionIcon` | `D04a-029` |
| `IssueStateBadge` | `D04a-030` |
| `LinearStateBadge` | `D04a-031` |
| `ReviewStateBadge` | `D04a-032` |
| `ReviewChecksBadge` | `D04a-033` |
| `WorktreeCardPortsTrigger` | `D04a-034` |
| `WorktreeCardPortsDetails` | `D04a-035` |
| `WorktreeCardReviewDetailSection` | `D04a-041` |
| `WorktreeCardSshHostControl` | `D04a-012` |
| `WorktreeCardStatusSlot` | `D04a-021` |
| `WorktreeContextMenuOverlays` | `D04a-070` |
| `WorktreeContextMenuView` | `D04a-052` |
| `WorktreeDeveloperMenu` | `D04a-066` |
| `WorktreeDisplayNameField` | `D04a-094` |
| `WorktreeHostContextBadge` | `D04a-108` |
| `issueAdornmentReserve` | `D04a-095` |
| `WorktreeIssueLinkFieldProps` | `D04a-111` |
| `WorktreeIssueLinkField` | `D04a-095` |
| `OpenInMenuEntry` | `D04a-055` |
| `getWorktreeOpenInEntries` | `D04a-055` |
| `getOpenInEntryAvailability` | `D04a-055` |
| `openOpenInAppsSettings` | `D04a-055` |
| `openWorktreePath` | `D04a-056` |
| `WorktreeOpenInMenuItems` | `D04a-055` |
| `WorktreeOpenInSubMenu` | `D04a-055` |
| `WorktreeReviewLinkField` | `D04a-096` |
| `WorktreeStatusMenuItems` | `D04a-054` |
| `WorktreeTitleRenameCommit` | `D04a-075` |
| `getWorktreeTitleRenameCommit` | `D04a-075` |
| `isWorktreeTitleTruncated` | `D04a-076` |
| `WorktreeTitleInlineRename` | `D04a-074` |
| `SummaryAgentGroup` | `D04a-089` |
| `getAgentDotState` | `D04a-089` |
| `formatSummaryStateLabel` | `D04a-089` |
| `buildSummaryAgentGroups` | `D04a-089` |
| `summarizeAgents` | `D04a-089` |
| `summarizeAgentIdentities` | `D04a-089` |
| `selectSummaryGroupIconAgents` | `D04a-089` |
| `WorktreeAgentExpansionState` | `D04a-087` |
| `MAX_PERSISTED_WORKTREE_AGENT_EXPANSIONS` | `D04a-087` |
| `WorktreeAgentExpansionControls` | `D04a-087` |
| `useWorktreeAgentExpansionState` | `D04a-087` |
| `clearWorktreeAgentExpansionStateForTests` | `D04a-087` |
| `getWorktreeAgentExpansionCountForTests` | `D04a-087` |
| `seedWorktreeAgentExpansionStateForTests` | `D04a-087` |
| `getCompactAgentSecondary` | `D04a-090` |
| `CompactAgentRow` | `D04a-080` |
| `CompactAgentExpansion` | `D04a-082` |
| `CompactAgentSummaryButton` | `D04a-081` |
| `useWorktreeCardDetailsHoverControl` | `D04a-038` |
| `WorktreeCardDetailsHoverControl` | `D04a-038` |
| `PROPERTY_OPTIONS` | `D04a-110` |
| `isEventTargetInsideCurrentTarget` | `D04a-107` |
| `WorktreeCardHeader` | `D04a-019` |
| `getWorktreeCardJiraIssueDisplay` | `D04a-102` |
| `getConfiguredWorktreeCardJiraIssueDisplay` | `D04a-102` |
| `WorktreeCardMetaRow` | `D04a-010` |
| `WorktreeCardIssueDisplay` | `D04a-111` |
| `WorktreeCardLinearIssueDisplay` | `D04a-111` |
| `WorktreeCardJiraIssueDisplay` | `D04a-111` |
| `WorktreeCardMetaBadgesProps` | `D04a-111` |
| `WorktreeCardMetaBadgesRootProps` | `D04a-111` |
| `WorktreeCardDetailsHoverProps` | `D04a-111` |
| `WorktreeRenameRequest` | `D04a-106` |
| `ActiveSurfaceVariant` | `D04a-106` |
| `WorktreeCardProps` | `D04a-106` |
| `ResolvedWorktreeCardProps` | `D04a-106` |
| `EMPTY_WORKSPACE_PORTS` | `D04a-106` |
| `HOSTED_REVIEW_CARD_REFRESH_INTERVAL_MS` | `D04a-106` |
| `shouldBeginWorktreeRename` | `D04a-106` |
| `formatSparseDirectoryPreview` | `D04a-106` |
| `isWebClient` | `D04a-106` |
| `getDirectoryName` | `D04a-106` |
| `WorktreeCardParentContent` | `D04a-009` |
| `isCachedMergedBranchPRCurrentForWorktree` | `D04a-101` |
| `WorktreeCardPrDisplay` | `D04a-101` |
| `getWorktreeCardPrDisplay` | `D04a-101` |
| `buildWorktreeCardPresentation` | `D04a-007` |
| `WorktreeCardPresentation` | `D04a-007` |
| `WorktreeCardSecondaryRows` | `D04a-020` |
| `EMPTY_RUNTIME_PANE_TITLES` | `D04a-105` |
| `EMPTY_LIVE_PTY_IDS` | `D04a-105` |
| `EMPTY_TERMINAL_LAYOUT_ROOTS` | `D04a-105` |
| `selectRuntimePaneTitlesForWorktree` | `D04a-105` |
| `selectLivePtyIdsForWorktree` | `D04a-105` |
| `selectTerminalLayoutRootsForWorktree` | `D04a-105` |
| `selectTerminalLayoutRootsForWorktrees` | `D04a-105` |
| `WorktreeCardSurface` | `D04a-002` |
| `coerceWorktreeCardVisibleTitle` | `D04a-100` |
| `getWorktreeCardTitleDisplay` | `D04a-100` |
| `getDisplacedLinkLabels` | `D04a-099` |
| `getReviewLabel` | `D04a-103` |
| `getProviderName` | `D04a-103` |
| `ReviewIcon` | `D04a-103` |
| `components/sidebar/WorktreeCard.tsx:default` | `D04a-001` |
| `components/sidebar/WorktreeCardAgents.tsx:default` | `D04a-078` |
| `components/sidebar/WorktreeContextMenu.tsx:default` | `D04a-051` |
| `components/sidebar/WorktreeContextMenuView.tsx:default` | `D04a-052` |
| `components/sidebar/WorktreeMetaDialog.tsx:default` | `D04a-093` |

## 3. Casos de Teste (433/433)

| Entrada | Capability ID / Justificativa |
| :--- | :--- |
| `components/sidebar/WorktreeCard.affiliate-list-mode.test.tsx:146 :: WorktreeCard affiliate list mode` | `D04a-005` |
| `components/sidebar/WorktreeCard.affiliate-list-mode.test.tsx:166 :: keeps the card visual surface but disables mutating list interactions` | `D04a-005` |
| `components/sidebar/WorktreeCard.affiliate-list-mode.test.tsx:213 :: still shows inline agent details in affiliate list mode` | `D04a-005` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:183 :: WorktreeCard compact hover details` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:197 :: shows PR and live port details from the compact worktree card hover` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:249 :: shows hidden task, notes, and port details from the compact worktree card hover` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:300 :: reads linked issue details from the local repo-owner cache while a runtime is focused` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:332 :: shows selected task and note metadata on the compact card title row` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:355 :: keeps selected task and note metadata above the compact branch row` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:382 :: keeps branch identity visible on detailed cards by default` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:400 :: uses one identity hover even when detailed metadata icons are visible when new card style is on` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:425 :: keeps long workspace and branch identity in hover details when the branch row is hidden` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:449 :: repeats a long workspace title inside the identity hover when branch is already visible` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:470 :: uses identity hover for identity-only new card worktrees with branch row visible` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:492 :: does not duplicate workspace identity when trimmed title equals branch` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:509 :: keeps detailed metadata hover scoped to metadata icons by default` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:535 :: keeps child card markup inside the parent card by default` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:557 :: suppresses inline agent rows in compact cards by default` | `D04a-101` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:569 :: does not create a compact metadata row solely for an aggregate cache timer` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:589 :: keeps unlink available for an auto-detected PR in the identity hover` | `D04a-040` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:609 :: suppresses the aggregate cache timer when compact inline agents are visible` | `D04a-101` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:628 :: keeps status and agent tooltip targets outside the worktree details hover trigger` | `D04a-009` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:650 :: preserves the aggregate cache timer when compact inline agents are enabled but absent` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:670 :: keeps child card markup outside the parent hover trigger when new card style is on` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:699 :: uses a centered parent row and raised title size when no meta row is visible` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:715 :: does not show a folder path row in new-card mode when no project groups exist` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:738 :: shows a folder path row in new-card mode through the branch setting when project groups exist` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:762 :: keeps hidden folder path identity available from the new-card hover` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:787 :: shows the branch row for migrated Default cards with branch enabled` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:804 :: keeps compact card branch hidden in the row but available from title hover by default` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:822 :: shows the branch row for compact cards when branch is enabled and new card style is on` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-ports-hover-independence.test.tsx:207 :: WorktreeCard compact ports hover independence` | `D04a-007` |
| `components/sidebar/WorktreeCard.compact-ports-hover-independence.test.tsx:229 :: does not force the compact title hover open when the live-ports hover opens` | `D04a-007` |
| `components/sidebar/WorktreeCard.hosted-review-refresh.test.tsx:112 :: WorktreeCard hosted review refresh` | `D04a-101` |
| `components/sidebar/WorktreeCard.hosted-review-refresh.test.tsx:132 :: polls visible hosted review cards after a cached branch miss` | `D04a-101` |
| `components/sidebar/WorktreeCard.hosted-review-refresh.test.tsx:158 :: does not poll hosted reviews when status and PR surfaces are hidden` | `D04a-101` |
| `components/sidebar/WorktreeCard.lineage.test.tsx:98 :: WorktreeCard lineage indicators` | `D04a-020` |
| `components/sidebar/WorktreeCard.lineage.test.tsx:105 :: does not render parent lineage badge copy on workspace cards` | `D04a-009` |
| `components/sidebar/WorktreeCard.lineage.test.tsx:123 :: keeps the child workspace toggle chip` | `D04a-020` |
| `components/sidebar/WorktreeCard.merged-pr-display.test.tsx:142 :: WorktreeCard merged PR fallback display` | `D04a-101` |
| `components/sidebar/WorktreeCard.merged-pr-display.test.tsx:156 :: shows cached merged PR when a newer hosted-review miss still matches the worktree head` | `D04a-101` |
| `components/sidebar/WorktreeCard.merged-pr-display.test.tsx:177 :: suppresses cached merged PR after a newer hosted-review miss when the worktree head moved` | `D04a-101` |
| `components/sidebar/WorktreeCard.merged-pr-display.test.tsx:201 :: does not let branch provenance resurrect a merged review after the worktree head moved` | `D04a-101` |
| `components/sidebar/WorktreeCard.merged-pr-display.test.tsx:224 :: keeps proven merged review visible when the worktree head is a confirmed PR commit` | `D04a-101` |
| `components/sidebar/WorktreeCard.pinned-repo-icon.test.tsx:107 :: WorktreeCard pinned repo icon` | `D04a-011` |
| `components/sidebar/WorktreeCard.pinned-repo-icon.test.tsx:115 :: shows the configured repo icon for pinned cards even when the repo badge is hidden` | `D04a-007` |
| `components/sidebar/WorktreeCard.pinned-repo-icon.test.tsx:137 :: does not render the leading pinned repo icon for non-pinned cards` | `D04a-007` |
| `components/sidebar/WorktreeCard.pinned-repo-icon.test.tsx:156 :: uses the pinned-style repo icon in new card style instead of a metadata-row badge` | `D04a-007` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:154 :: WorktreeCard linked PR display` | `D04a-101` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:165 :: keeps linked GH PR status out of the left status slot by default` | `D04a-021` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:178 :: keeps compact toggle-off unread and read-title visuals legacy` | `D04a-023` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:208 :: applies experimental unread status and read-title visuals only when enabled` | `D04a-023` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:242 :: shows linked GH PR status in the left status slot before hosted review details are cached when new card style is on` | `D04a-021` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:254 :: does not show cached branch PR details when the worktree has no linked PR` | `D04a-101` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:282 :: shows branch-discovered GH PR status when the worktree has no linked PR` | `D04a-021` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:313 :: shows branch-discovered hosted review providers without linked worktree metadata` | `D04a-101` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:340 :: keeps the stored branch title by default when a hosted review title is available` | `D04a-101` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:365 :: uses the hosted review title when new card style is on and stored title is the branch` | `D04a-101` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:391 :: shows task and notes metadata while keeping PR out of the right metadata list` | `D04a-002` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:419 :: shows selected task and notes metadata on compact cards when new card style is on` | `D04a-007` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:445 :: hides individual metadata surfaces when their card properties are disabled` | `D04a-002` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:469 :: shows automation-created workspaces as a metadata icon property` | `D04a-045` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:499 :: hides the automation metadata icon in compact card mode by preset default` | `D04a-007` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:531 :: shows the automation metadata icon in compact card mode when manually enabled` | `D04a-007` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:562 :: hides automation-created card surfaces when the Automation property is disabled` | `D04a-045` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:593 :: hides live port metadata when the Ports card property is disabled` | `D04a-035` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:630 :: renders linked PR status in the left status slot instead of the right metadata list` | `D04a-021` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:651 :: uses branch PR cache for the status slot before hosted-review metadata warms` | `D04a-021` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:682 :: reads the local branch PR cache for a known local repo while a runtime is focused` | `D04a-101` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:718 :: keeps the detailed right-side PR badge during a transient hosted-review miss` | `D04a-002` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:752 :: keeps the detailed PR badge when a transient miss still has an older review hint` | `D04a-101` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:787 :: keeps durable non-GitHub linked review metadata ahead of branch PR cache` | `D04a-101` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:821 :: does not resurrect an older PR cache entry after a newer hosted-review miss` | `D04a-101` |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:854 :: does not resurrect PR cache on the same millisecond as a hosted-review miss` | `D04a-101` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:130 :: WorktreeCard quick actions` | `D04a-019` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:147 :: marks the unread toggle as a workspace-board-preserving action` | `D04a-023` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:156 :: renders repo identity in the detailed metadata row` | `D04a-007` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:166 :: can render the current workspace with a secondary active surface` | `D04a-002` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:184 :: marks the primary active workspace for token-driven selected styling` | `D04a-002` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:196 :: renders folder directory name in the detailed metadata row without a Folder badge` | `D04a-002` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:211 :: renders synthetic folder workspace directory name in the detailed metadata row without a Folder badge` | `D04a-002` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:231 :: does not render a branch icon for synthetic folder workspace path identity` | `D04a-021` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:253 :: does not render a pending first-agent rename title badge` | `D04a-074` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:270 :: renders the failed first-agent rename title badge` | `D04a-074` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:283 :: renders the failed first-agent rename title badge when rename is also pending` | `D04a-074` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:300 :: renders the migrated branch metadata row when branch is enabled` | `D04a-002` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:322 :: renders detached HEAD identity in detailed card metadata` | `D04a-007` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:341 :: omits the repeated branch metadata row when compact cards are enabled` | `D04a-007` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:358 :: omits the branch metadata row when the workspace has a custom title` | `D04a-002` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:377 :: uses the left status lane and primary badge when compact cards are disabled` | `D04a-007` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:398 :: keeps unread in the status lane and moves primary into the title row when compact cards are enabled` | `D04a-023` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:420 :: hides delete by default for an inactive workspace` | `D04a-019` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:428 :: shows delete as the top-right quick action while Option/Alt is held` | `D04a-019` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:438 :: shows delete as the quick action for folder workspace instances while Option/Alt is held` | `D04a-019` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:456 :: shows delete for a current workspace while Option/Alt is held` | `D04a-019` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:467 :: does not show delete for the main worktree while Option/Alt is held` | `D04a-019` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:481 :: does not replace sleep with delete for a workspace with live activity` | `D04a-019` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:494 :: does not show sleep as the top-right quick action for an active workspace` | `D04a-019` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:507 :: does not show delete when the workspace is current but not selected in the sidebar` | `D04a-019` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:517 :: does not show the rebase operation chip on the card` | `D04a-019` |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:529 :: keeps non-rebase operation chips on the card` | `D04a-019` |
| `components/sidebar/WorktreeCard.ssh-reconnect-prompt.test.tsx:116 :: WorktreeCard SSH reconnect prompt` | `D04a-012` |
| `components/sidebar/WorktreeCard.ssh-reconnect-prompt.test.tsx:135 :: offers an inline reconnect control and never a blocking dialog for a disconnected SSH worktree` | `D04a-012` |
| `components/sidebar/WorktreeCard.ssh-reconnect-prompt.test.tsx:151 :: names the failure state in the control verb rather than a generic Connect` | `D04a-012` |
| `components/sidebar/WorktreeCard.ssh-reconnect-prompt.test.tsx:163 :: renders the passive host glyph, not a control, when the SSH host is connected` | `D04a-012` |
| `components/sidebar/WorktreeCard.ssh-reconnect-prompt.test.tsx:177 :: offers the control for a folder workspace on a disconnected SSH host` | `D04a-012` |
| `components/sidebar/WorktreeCard.ssh-reconnect-prompt.test.tsx:195 :: never reports a runtime-owned SSH target as removed` | `D04a-012` |
| `components/sidebar/WorktreeCard.ssh-reconnect-prompt.test.tsx:209 :: reports a removed SSH host once the target list no longer carries it` | `D04a-012` |
| `components/sidebar/WorktreeCard.ssh-reconnect-prompt.test.tsx:221 :: marks a runtime-host worktree disconnected once a probe finds it unreachable` | `D04a-012` |
| `components/sidebar/WorktreeCard.ssh-reconnect-prompt.test.tsx:237 :: leaves a runtime-host worktree undimmed before its first probe answers` | `D04a-012` |
| `components/sidebar/WorktreeCard.ssh-reconnect-prompt.test.tsx:252 :: distinguishes connected worktrees on different Orca servers` | `D04a-012` |
| `components/sidebar/WorktreeCard.ssh-reconnect-prompt.test.tsx:279 :: reads nested SSH readiness from the owning HUB instead of client-local SSH state` | `D04a-012` |
| `components/sidebar/WorktreeCard.test.ts:37 :: getWorktreeStatus` | `D04a-106` |
| `components/sidebar/WorktreeCard.test.ts:38 :: treats browser-only worktrees as active` | `D04a-002` |
| `components/sidebar/WorktreeCard.test.ts:42 :: keeps terminal agent states higher priority than browser presence` | `D04a-106` |
| `components/sidebar/WorktreeCard.test.ts:61 :: shouldBeginWorktreeRename` | `D04a-074` |
| `components/sidebar/WorktreeCard.test.ts:62 :: matches unscoped legacy rename requests by worktree id` | `D04a-074` |
| `components/sidebar/WorktreeCard.test.ts:66 :: matches row-scoped rename requests only on the target row` | `D04a-074` |
| `components/sidebar/WorktreeCardAgents.activation.test.tsx:159 :: WorktreeCardAgents activation` | `D04a-083` |
| `components/sidebar/WorktreeCardAgents.activation.test.tsx:177 :: activates a projected structured session row through the unified tab path` | `D04a-083` |
| `components/sidebar/WorktreeCardAgents.activation.test.tsx:206 :: reveals the worktree and focuses an automation worker row hydrated during reveal` | `D04a-083` |
| `components/sidebar/WorktreeCardAgents.activation.test.tsx:240 :: reveals the terminal surface through the helper path when activating a hydrated row` | `D04a-083` |
| `components/sidebar/WorktreeCardAgents.activation.test.tsx:280 :: keeps a live worktree-attributed row visible while its tab is hydrating` | `D04a-083` |
| `components/sidebar/WorktreeCardAgents.activation.test.tsx:305 :: does not pane-focus a fallback terminal when the worker tab is still missing after reveal` | `D04a-083` |
| `components/sidebar/WorktreeCardAgents.activation.test.tsx:338 :: dismisses a malformed pane key instead of guessing a terminal pane` | `D04a-083` |
| `components/sidebar/WorktreeCardAgents.activation.test.tsx:366 :: dismisses a pane key whose parsed tab does not match the row tab` | `D04a-083` |
| `components/sidebar/WorktreeCardAgents.activation.test.tsx:391 :: dismisses a missing tab row that is no longer attributed to this worktree` | `D04a-083` |
| `components/sidebar/WorktreeCardAgents.activation.test.tsx:416 :: reveals the worktree and focuses a compact automation worker row hydrated during reveal` | `D04a-083` |
| `components/sidebar/WorktreeCardAgents.expansion-remount.test.tsx:107 :: WorktreeCardAgents inline-list expansion durability` | `D04a-087` |
| `components/sidebar/WorktreeCardAgents.expansion-remount.test.tsx:124 :: keeps the compact agent summary expanded across a card remount` | `D04a-087` |
| `components/sidebar/WorktreeCardAgents.expansion-remount.test.tsx:146 :: does not leak expansion between different worktrees` | `D04a-087` |
| `components/sidebar/WorktreeCardAgents.expansion-remount.test.tsx:158 :: worktree-card-agents-expansion-state module cache` | `D04a-087` |
| `components/sidebar/WorktreeCardAgents.expansion-remount.test.tsx:167 :: persists a collapsed lineage parent across a hook remount and toggles independently` | `D04a-087` |
| `components/sidebar/WorktreeCardAgents.expansion-remount.test.tsx:208 :: drops default (empty) state and bounds the cache with LRU eviction` | `D04a-087` |
| `components/sidebar/WorktreeCardAgents.send-target.test.tsx:148 :: WorktreeCardAgents send targets` | `D04a-085` |
| `components/sidebar/WorktreeCardAgents.send-target.test.tsx:159 :: marks eligible active-worktree rows including working send targets` | `D04a-085` |
| `components/sidebar/WorktreeCardAgents.send-target.test.tsx:170 :: disables rows whose live pane title needs permission` | `D04a-085` |
| `components/sidebar/WorktreeCardAgents.send-target.test.tsx:191 :: leaves other worktree rows in ordinary mode during target selection` | `D04a-085` |
| `components/sidebar/WorktreeCardAgents.send-target.test.tsx:205 :: marks the currently sending row` | `D04a-085` |
| `components/sidebar/WorktreeCardAgents.send-target.test.tsx:225 :: marks compact active-worktree rows as send targets in the default row UI` | `D04a-085` |
| `components/sidebar/WorktreeCardAgents.test.tsx:188 :: WorktreeCardAgents` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:200 :: renders ordinary rows in full mode without a child disclosure` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:213 :: uses compact mode when the display preference is absent` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:225 :: dims non-focused compact agent row text` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:245 :: keeps focused compact agent row text legible` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:266 :: shows a matching pane prompt-cache timer before the compact row age` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:290 :: does not show a prompt-cache timer on a nonmatching compact row` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:312 :: does not show a prompt-cache timer when the feature is disabled` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:334 :: keeps hidden retained compact rows from rendering prompt-cache timers` | `D04a-084` |
| `components/sidebar/WorktreeCardAgents.test.tsx:360 :: does not repeat a subagent role used as its compact primary label` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:382 :: marks only the focused agent row` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:396 :: keeps retained completion rows passive when activated` | `D04a-084` |
| `components/sidebar/WorktreeCardAgents.test.tsx:409 :: shows orchestration child agent rows under their parent by default` | `D04a-079` |
| `components/sidebar/WorktreeCardAgents.test.tsx:446 :: shows orchestration children under a retained parent matched by terminal handle` | `D04a-084` |
| `components/sidebar/WorktreeCardAgents.test.tsx:470 :: shows orchestration children under a visible coordinator when parent handle is absent` | `D04a-079` |
| `components/sidebar/WorktreeCardAgents.test.tsx:494 :: keeps partially cyclic orchestration rows visible as flat roots` | `D04a-079` |
| `components/sidebar/WorktreeCardAgents.test.tsx:532 :: does not render the labeled wrapper when there are no agent rows` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:541 :: renders a compact summary affordance for two flat agents` | `D04a-081` |
| `components/sidebar/WorktreeCardAgents.test.tsx:567 :: does not show a prompt-cache timer on a collapsed compact summary row` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:598 :: keeps compact agent messages with trusted data image markdown to the single-line preview` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:621 :: keeps compact agent messages with trusted blob image markdown to the single-line preview` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:641 :: keeps reference-style compact agent image markdown to the single-line preview` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:667 :: keeps untrusted compact agent image markdown to the single-line preview` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.test.tsx:688 :: renders a compact summary affordance for multiple flat agents` | `D04a-081` |
| `components/sidebar/WorktreeCardAgents.test.tsx:729 :: avoids repeating the total when every compact summary agent has the same state` | `D04a-081` |
| `components/sidebar/WorktreeCardAgents.test.tsx:758 :: prioritizes agent varieties in compact summary icons` | `D04a-081` |
| `components/sidebar/WorktreeCardAgents.test.tsx:781 :: rotates the compact summary chevron when collapsed` | `D04a-081` |
| `components/sidebar/WorktreeCardAgents.test.tsx:802 :: uses a neutral compact summary label while expanded` | `D04a-081` |
| `components/sidebar/WorktreeCardAgents.test.tsx:831 :: can slightly indent expanded compact summary content` | `D04a-081` |
| `components/sidebar/WorktreeCardAgents.test.tsx:843 :: summarizes compact lineage by parent rows before revealing children` | `D04a-081` |
| `components/sidebar/WorktreeCardAutomationDetailSection.test.tsx:83 :: WorktreeCardAutomationDetailSection host resolution` | `D04a-045` |
| `components/sidebar/WorktreeCardAutomationDetailSection.test.tsx:84 :: asks the host the provenance recorded` | `D04a-045` |
| `components/sidebar/WorktreeCardAutomationDetailSection.test.tsx:96 :: reports a miss as uncheckable when no host was ever recorded` | `D04a-035` |
| `components/sidebar/WorktreeCardAutomationDetailSection.test.tsx:105 :: still reports a miss as removed when the recorded host answered` | `D04a-035` |
| `components/sidebar/WorktreeCardAutomationDetailSection.test.tsx:111 :: offers both affordances when a record with no recorded host is found anyway` | `D04a-045` |
| `components/sidebar/WorktreeCardDisplayMenuSection.test.tsx:146 :: WorktreeCardDisplayMenuSection` | `D04a-109` |
| `components/sidebar/WorktreeCardDisplayMenuSection.test.tsx:147 :: applies the compact card mode preset from the visible card layout menu` | `D04a-007` |
| `components/sidebar/WorktreeCardDisplayMenuSection.test.tsx:162 :: keeps branch-only copy when project groups are unavailable` | `D04a-109` |
| `components/sidebar/WorktreeCardDisplayMenuSection.test.tsx:171 :: mentions folder paths when project groups can create folder workspaces` | `D04a-007` |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:87 :: WorktreeCardDetailsHover interactions` | `D04a-007` |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:165 :: defers hover close while the review menu is open` | `D04a-041` |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:179 :: closes the hover after the review menu dismisses a deferred close` | `D04a-041` |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:194 :: omits the review trigger tooltip while the review menu is open` | `D04a-041` |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:204 :: keeps the hover mounted while the workspace title is being edited` | `D04a-007` |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:242 :: invokes unlink and closes the hover from the menu item` | `D04a-040` |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:267 :: copies the review URL and closes the hover from the menu item` | `D04a-041` |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:295 :: opens the review URL in Orca browser and leaves existing actions independent` | `D04a-041` |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:319 :: preserves repeated-click behavior by forwarding each browser action` | `D04a-002` |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:338 :: reports clipboard failures without unlinking the review` | `D04a-040` |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:361 :: passes a linked issue URL to the embedded-browser action` | `D04a-040` |
| `components/sidebar/WorktreeCardMeta.test.tsx:29 :: WorktreeCardDetailsHover` | `D04a-007` |
| `components/sidebar/WorktreeCardMeta.test.tsx:30 :: wraps workspace and branch identity so long names stay readable in the hover panel` | `D04a-007` |
| `components/sidebar/WorktreeCardMeta.test.tsx:51 :: puts workspace title before branch identity and metadata details` | `D04a-007` |
| `components/sidebar/WorktreeCardMeta.test.tsx:81 :: keeps the hover title unruled and inline editable while section bodies stay inset` | `D04a-007` |
| `components/sidebar/WorktreeCardMeta.test.tsx:114 :: puts unlink behind the first PR actions menu and keeps GitHub last` | `D04a-041` |
| `components/sidebar/WorktreeCardMeta.test.tsx:159 :: puts issue copy menu before edit and open actions and keeps GitHub last` | `D04a-040` |
| `components/sidebar/WorktreeCardMeta.test.tsx:198 :: labels GitLab unlink actions with MR terminology` | `D04a-041` |
| `components/sidebar/WorktreeCardMeta.test.tsx:230 :: hides the embedded-browser action when a linked review has no URL` | `D04a-040` |
| `components/sidebar/WorktreeCardMeta.test.tsx:251 :: keeps the embedded-browser action provider-neutral for unsupported review URLs` | `D04a-040` |
| `components/sidebar/WorktreeCardMeta.test.tsx:276 :: displays Linear issue details with link` | `D04a-002` |
| `components/sidebar/WorktreeCardMeta.test.tsx:304 :: shows the Jira icon badge and linked issue details` | `D04a-102` |
| `components/sidebar/WorktreeCardMeta.test.tsx:338 :: shows identifier when Linear issue URL is unavailable` | `D04a-002` |
| `components/sidebar/WorktreeCardMeta.test.tsx:360 :: shows link when fallback URL is provided` | `D04a-002` |
| `components/sidebar/WorktreeCardPorts.test.tsx:42 :: WorktreeCardPortsDetails` | `D04a-035` |
| `components/sidebar/WorktreeCardPorts.test.tsx:43 :: shows advertised port addresses in workspace hover details` | `D04a-007` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:71 :: WorktreeCardSshHostControl` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:85 :: offers a Connect control naming the host for a disconnected target` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:97 :: labels the %s state %s` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:103 :: distinguishes an auth failure from a generic connection failure in the tooltip` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:117 :: tints the %s state with the destructive token, not the quiet one` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:126 :: shows a disabled busy control while the host is %s` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:139 :: renders the passive host glyph, not a control, when connected` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:148 :: renders the passive host glyph for a null status` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:156 :: never offers Connect for a removed host, even in a failed state` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:163 :: keeps the label available to assistive tech but not on screen in icon-only mode` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:172 :: connects and mirrors the returned state so deferred PTY reattach can resume` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:195 :: does not activate the surrounding card when clicked` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:217 :: reports connect failures and resyncs target metadata so a ghost host converges` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:244 :: routes connect to the owning Orca server for a remote-owned target` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:264 :: suppresses a sibling card dialing a host that is already connecting` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:299 :: ignores a second click while its own connect is in flight` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:314 :: does not let Enter or Space bubble to the sidebar key handler` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:338 :: shows the connected glyph even if a stale removal tombstone is present` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:346 :: carries one height class across every actionable state` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:372 :: sizes the passive glyph for %s at size-3` | `D04a-012` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:23 :: WorktreeCardStatusSlot` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:43 :: lets the unread bell replace the visual status dot by default` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:63 :: overlays an unread badge on the status dot when new card style is on` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:89 :: suppresses the new-card unread badge while unread status is working` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:114 :: suppresses the new-card unread badge while unread status is permission` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:139 :: keeps legacy unread working cards on the unread bell control` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:161 :: shows status in the unread toggle affordance` | `D04a-023` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:179 :: keeps the quiet active dot ahead of PR status by default` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:198 :: uses PR status instead of the quiet active dot when new card style is on` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:221 :: uses the unified compact review glyph for GitLab MR status` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:243 :: uses PR status instead of the quiet done dot when new card style is on` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:263 :: uses PR status instead of the inactive dot when new card style is on` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:284 :: uses a branch icon with branch-only accessible copy by default` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:308 :: uses context-aware branch or folder path accessible copy` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:329 :: keeps the quiet dot when the row has no branch identity` | `D04a-007` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:350 :: keeps working activity ahead of PR status in new card style` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:374 :: keeps permission activity ahead of PR status in new card style` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:398 :: keeps unread ahead of PR status by default` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:420 :: overlays an unread badge on PR status when new card style is on` | `D04a-021` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:450 :: overlays an unread badge on the branch icon in new card style` | `D04a-021` |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:158 :: WorktreeContextMenu delete shortcut display` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:178 :: renders the delete shortcut badge for standard worktree delete` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:201 :: omits the delete shortcut on disabled Delete Worktree for primary checkout` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:223 :: omits the shortcut badge when the action is unassigned` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.react185-bystander.test.tsx:147 :: WorktreeContextMenu and React #185` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.react185-bystander.test.tsx:148 :: opening the row context menu on its own does not trip the nested-update limit` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.react185-bystander.test.tsx:171 :: is blamed for a driver-owned cascade when its items mount past the limit` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:22 :: shouldRevealWorktreeDeveloperMenu` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:23 :: stays hidden for an ordinary right-click` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:29 :: reveals when Option/Alt was held at open time` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:37 :: stays hidden for a multi-workspace selection` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:44 :: selectMenuScopedMap (delete-teardown re-render guard)` | `D04a-019` |
| `components/sidebar/WorktreeContextMenu.test.ts:52 :: returns the stable empty sentinel when the menu is closed` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:63 :: returns the live map synchronously once the menu is open` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:72 :: getDeleteStateForWorktreeHost` | `D04a-019` |
| `components/sidebar/WorktreeContextMenu.test.ts:83 :: keeps host-qualified pending state on its matching row only` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:89 :: retains legacy unqualified state` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:97 :: shouldUseNativeContextMenu` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:98 :: uses the browser context menu for marked hovercard content` | `D04a-007` |
| `components/sidebar/WorktreeContextMenu.test.ts:107 :: uses the browser context menu for text nodes inside marked content` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:118 :: keeps the worktree context menu for unmarked targets` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:127 :: shouldIgnoreNestedWorktreeContextMenuScope` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:128 :: allows the context menu scope that owns the event target` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:137 :: ignores context menu events owned by a nested scope` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:147 :: ignores context menu events from text nodes inside a nested scope` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:159 :: allows events from unscoped targets` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:169 :: shouldSuppressContextMenuFollowUpClick` | `D04a-101` |
| `components/sidebar/WorktreeContextMenu.test.ts:170 :: suppresses the click emitted immediately after opening a context menu` | `D04a-101` |
| `components/sidebar/WorktreeContextMenu.test.ts:174 :: does not suppress later unrelated clicks` | `D04a-101` |
| `components/sidebar/WorktreeContextMenu.test.ts:178 :: keeps the 500 ms ctrl-click boundary inclusive` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:183 :: does not suppress clicks that predate the context menu timestamp` | `D04a-101` |
| `components/sidebar/WorktreeContextMenu.test.ts:188 :: shouldContinueDeleteSiblingPositionRestore` | `D04a-019` |
| `components/sidebar/WorktreeContextMenu.test.ts:189 :: stops once the delete row position has settled even when the row remains mounted` | `D04a-019` |
| `components/sidebar/WorktreeContextMenu.test.ts:199 :: parent picker context menu affordance` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:200 :: offers unlink for valid inline-only legacy lineage after stable-update hydration` | `D04a-040` |
| `components/sidebar/WorktreeContextMenu.test.ts:220 :: uses set/change labels based on valid parent presence` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:225 :: disables the parent picker while deleting or without candidates` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:233 :: snapshots the stable row anchor before the context menu closes` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:242 :: uses the child scope instead of climbing to a different workspace drag row` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:252 :: project removal from workspace context menus` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:253 :: routes primary workspace rows to project removal in non-repo grouped views` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:263 :: treats additional folder workspace rows as deletable workspace rows` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:272 :: planWorkspaceStatusAssignment (context-menu ` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:283 :: routes to board Linear-sync with ALL selected ids when the board wired a callback` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:295 :: falls back to local-only writes of only status-changed worktrees off the board` | `D04a-052` |
| `components/sidebar/WorktreeContextMenu.test.ts:306 :: writes nothing on the local-only path when every worktree already has the target status` | `D04a-052` |
| `components/sidebar/WorktreeDeveloperMenu.test.tsx:34 :: WorktreeDeveloperMenu` | `D04a-052` |
| `components/sidebar/WorktreeDeveloperMenu.test.tsx:40 :: shows the developer submenu with the parking action` | `D04a-052` |
| `components/sidebar/WorktreeDeveloperMenu.test.tsx:51 :: requests parking for the context worktree` | `D04a-052` |
| `components/sidebar/WorktreeDeveloperMenuReveal.test.tsx:120 :: Developer submenu reveal` | `D04a-052` |
| `components/sidebar/WorktreeDeveloperMenuReveal.test.tsx:126 :: hides the Developer submenu on a plain right-click` | `D04a-052` |
| `components/sidebar/WorktreeDeveloperMenuReveal.test.tsx:134 :: reveals the Developer submenu when Option/Alt is held` | `D04a-052` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:210 :: WorktreeMetaDialog issue link row` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:229 :: seeds the chip and value from a GitHub link` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:236 :: seeds and saves the GitLab MR row through the GitLab slot` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:258 :: replaces a completed emoji shortcode in the display name` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:269 :: seeds the chip and value from a Linear link` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:276 :: flips to Linear when a linear.app issue URL is pasted` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:288 :: keeps the chip on GitHub when a bare issue key is typed` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:297 :: flips to GitHub when a GitHub issue URL is pasted over a Linear link` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:307 :: names the Linear issue that switching to GitHub would unlink` | `D04a-040` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:319 :: names both links when clearing the field would drop both` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:333 :: clears the displaced GitHub link when a Linear value is saved` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:350 :: sends no Linear keys when the workspace has no Linear link` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:363 :: qualifies a save with the host selected by the opening row` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:387 :: sends no comment when only the issue link changed` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:401 :: keeps the dialog open and reports why when the save fails` | `D04a-035` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:414 :: leaves the Linear link alone when only the comment is edited` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:434 :: blocks saving an unparseable Linear value` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:443 :: is read-only for a folder workspace` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:457 :: shows a folder workspace its own linked issue` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:466 :: keeps the baseline frozen when the store changes while open` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:492 :: resolves a bare Linear key across workspaces rather than the active organization` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:510 :: opens a stored Linear link directly from its organization key` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:529 :: does not open a lookup result after the field moved on` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:555 :: clears a Linear link added while the dialog was open` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:583 :: keeps the linked work item when the value is only respelled` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:614 :: shows the clicked row when the same workspace ID exists under two hosts` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:625 :: dispatches nothing when the dialog is cancelled` | `D04a-093` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:88 :: WorktreeOpenInMenu` | `D04a-055` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:111 :: maps file manager labels by platform` | `D04a-056` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:117 :: disables the Open in submenu while deleting` | `D04a-056` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:127 :: stops menu item click propagation` | `D04a-055` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:140 :: uses the blocked-path toast without calling main IPC` | `D04a-055` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:156 :: shows an actionable toast when the host launcher fails` | `D04a-056` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:175 :: builds menu entries from configured launchers with file manager last` | `D04a-056` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:188 :: opens settings at the Open In Apps section` | `D04a-056` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:199 :: forwards the configured command when opening a configured launcher` | `D04a-056` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:213 :: blocks configured launchers in remote context before calling main IPC` | `D04a-056` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:230 :: enables only VS Code-compatible launchers for SSH paths` | `D04a-012` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:258 :: forwards SSH context for a supported VS Code launcher` | `D04a-012` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:273 :: blocks SSH local-only launchers before IPC with actionable copy` | `D04a-012` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:287 :: shows the SSH alias recovery details returned by main` | `D04a-012` |
| `components/sidebar/WorktreeTitleInlineRename.begin-editing.test.tsx:167 :: WorktreeTitleInlineRename beginEditing` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.begin-editing.test.tsx:173 :: opens the inline input and consumes the parent trigger once` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.begin-editing.test.tsx:188 :: still consumes the trigger when the title is disabled` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.begin-editing.test.tsx:200 :: ignores IME composition Enter before committing the edited title` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:92 :: WorktreeTitleInlineRename editor lifecycle` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:93 :: closes the shortcut-opened editor on Escape` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:101 :: closes the shortcut-opened editor once the rename commits` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:112 :: closes the shortcut-opened editor when it loses focus` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:122 :: reports both edit-mode transitions to the parent exactly once` | `D04a-035` |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:133 :: reports the shortcut-open transition once in Strict Mode` | `D04a-035` |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:145 :: opens the editor on double-click and reports it the same way` | `D04a-035` |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:162 :: focuses and selects the current name when the editor opens` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:173 :: leaves an open editor untouched when the workspace is renamed elsewhere` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:186 :: leaves an open editor untouched when an unread notification arrives` | `D04a-023` |
| `components/sidebar/WorktreeTitleInlineRename.test.tsx:10 :: getWorktreeTitleRenameCommit` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.test.tsx:11 :: cancels blank or unchanged inline titles` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.test.tsx:19 :: trims and saves changed inline titles` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.test.tsx:27 :: WorktreeTitleInlineRename` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.test.tsx:28 :: treats only actual text overflow as truncation` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.test.tsx:34 :: renders the title as the double-click inline rename target` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.test.tsx:54 :: keeps read titles at the default foreground color unless requested` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.test.tsx:66 :: dims read titles when requested by the experimental card style` | `D04a-074` |
| `components/sidebar/worktree-card-agent-summary.test.ts:47 :: worktree card agent summary` | `D04a-089` |
| `components/sidebar/worktree-card-agent-summary.test.ts:48 :: presents passive working as monitoring` | `D04a-089` |
| `components/sidebar/worktree-card-agent-summary.test.ts:56 :: keeps monitoring visible before a compact row prompt` | `D04a-089` |
| `components/sidebar/worktree-card-agent-summary.test.ts:68 :: hands the whole row to the send-target reason, and only then` | `D04a-085` |
| `components/sidebar/worktree-card-agent-summary.test.ts:92 :: lists interrupted outcomes before clean completions` | `D04a-089` |
| `components/sidebar/worktree-card-compact-agent-row.stable-message.test.tsx:77 :: CompactAgentRow stable assistant message` | `D04a-091` |
| `components/sidebar/worktree-card-compact-agent-row.stable-message.test.tsx:78 :: holds the last assistant line when a same-turn ping omits it` | `D04a-091` |
| `components/sidebar/worktree-card-compact-agent-row.stable-message.test.tsx:88 :: drops the held line when a new turn starts` | `D04a-091` |
| `components/sidebar/worktree-card-compact-agent-row.stable-message.test.tsx:96 :: never holds across pings for entries without a turn identity (stateStartedAt 0)` | `D04a-007` |
| `components/sidebar/worktree-card-compact-agent-row.stable-message.test.tsx:104 :: drops the held line when the agent leaves working` | `D04a-091` |
| `components/sidebar/worktree-card-details-hover-state.test.tsx:20 :: useWorktreeCardDetailsHoverControl` | `D04a-007` |
| `components/sidebar/worktree-card-details-hover-state.test.tsx:47 :: keeps the hover open while the review menu is open` | `D04a-041` |
| `components/sidebar/worktree-card-details-hover-state.test.tsx:63 :: closes the hover after the review menu dismisses a deferred close` | `D04a-041` |
| `components/sidebar/worktree-card-details-hover-state.test.tsx:80 :: clears a deferred close when the pointer returns before the menu closes` | `D04a-007` |
| `components/sidebar/worktree-card-details-hover-state.test.tsx:95 :: closes both layers from closeHover` | `D04a-007` |
| `components/sidebar/worktree-card-dom-events.test.ts:6 :: worktree card DOM events` | `D04a-107` |
| `components/sidebar/worktree-card-dom-events.test.ts:7 :: recognizes DOM events that originate inside the current target` | `D04a-107` |
| `components/sidebar/worktree-card-dom-events.test.ts:15 :: rejects portaled DOM events that bubble through the React tree` | `D04a-035` |
| `components/sidebar/worktree-card-dom-events.test.ts:22 :: supports text-node event targets inside the current target` | `D04a-035` |
| `components/sidebar/worktree-card-jira-issue-display.test.ts:7 :: getWorktreeCardJiraIssueDisplay` | `D04a-102` |
| `components/sidebar/worktree-card-jira-issue-display.test.ts:8 :: projects persisted Jira linked-item metadata for the workspace card` | `D04a-102` |
| `components/sidebar/worktree-card-jira-issue-display.test.ts:27 :: does not infer Jira from another provider` | `D04a-102` |
| `components/sidebar/worktree-card-jira-issue-display.test.ts:42 :: shows persisted Jira metadata only when the Jira display property is enabled` | `D04a-102` |
| `components/sidebar/worktree-card-pr-display.test.ts:42 :: getWorktreeCardPrDisplay` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:43 :: uses cached PR details when available` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:47 :: falls back to linkedPR while PR details load` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:55 :: keeps linkedPR visible when PR details are unavailable` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:63 :: does not show a PR row for unlinked worktrees` | `D04a-040` |
| `components/sidebar/worktree-card-pr-display.test.ts:67 :: ignores linked-lookup PR details when the worktree is unlinked` | `D04a-040` |
| `components/sidebar/worktree-card-pr-display.test.ts:75 :: keeps an unlinked GitHub PR visible when branch provenance names the same PR` | `D04a-040` |
| `components/sidebar/worktree-card-pr-display.test.ts:84 :: still suppresses unlinked linked-lookup details when branch provenance names a different PR` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:93 :: does not let a GitHub branch PR number corroborate an unlinked GitLab MR` | `D04a-040` |
| `components/sidebar/worktree-card-pr-display.test.ts:102 :: does not let branch provenance override linked non-GitHub review metadata` | `D04a-002` |
| `components/sidebar/worktree-card-pr-display.test.ts:111 :: shows branch-discovered GitHub PR details when the worktree is unlinked` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:119 :: hides a matching suppressed branch-discovered GitHub PR` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:128 :: lets an explicit GitHub link override stale suppression metadata` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:136 :: keeps a different branch-discovered GitHub PR visible` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:145 :: treats missing cache hints as unsafe for unlinked GitHub PR details` | `D04a-040` |
| `components/sidebar/worktree-card-pr-display.test.ts:149 :: keeps the linked PR number visible when cached details belong to a different PR` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:157 :: uses cached GitLab MR details when linked metadata matches` | `D04a-002` |
| `components/sidebar/worktree-card-pr-display.test.ts:161 :: keeps the linked GitLab MR number visible when cached details belong to a different MR` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:169 :: preserves branch-discovered hosted reviews for providers without worktree metadata` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:178 :: isCachedMergedBranchPRCurrentForWorktree` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:190 :: matches when the worktree sits exactly on the merged head` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:194 :: matches when the worktree head is a confirmed commit of the merged PR` | `D04a-101` |
| `components/sidebar/worktree-card-pr-display.test.ts:203 :: rejects a merged PR when the worktree head is neither the final head nor confirmed` | `D04a-101` |
| `components/sidebar/worktree-card-status-inputs.test.ts:43 :: worktree card status input selectors` | `D04a-105` |
| `components/sidebar/worktree-card-status-inputs.test.ts:44 :: stays shallow-equal when unrelated tabs receive PTY ids or pane titles` | `D04a-105` |
| `components/sidebar/worktree-card-status-inputs.test.ts:88 :: changes when this worktree receives a new live PTY id list` | `D04a-105` |
| `components/sidebar/worktree-card-status-inputs.test.ts:114 :: stays shallow-equal when wake updates only PTY bindings inside terminal layouts` | `D04a-105` |
| `components/sidebar/worktree-card-status-inputs.test.ts:154 :: returns one identity per store generation instead of rebuilding per call` | `D04a-007` |
| `components/sidebar/worktree-card-status-inputs.test.ts:181 :: carries the same identity across unrelated pane-title and PTY churn` | `D04a-007` |
| `components/sidebar/worktree-card-status-inputs.test.ts:207 :: returns the shared frozen empty for a worktree with no tabs` | `D04a-105` |
| `components/sidebar/worktree-card-title-display.test.ts:7 :: worktree card title display` | `D04a-100` |
| `components/sidebar/worktree-card-title-display.test.ts:8 :: keeps custom workspace titles` | `D04a-100` |
| `components/sidebar/worktree-card-title-display.test.ts:26 :: uses linked work titles instead of repeating the branch as the card title` | `D04a-100` |
| `components/sidebar/worktree-card-title-display.test.ts:36 :: keeps the stored title while linked titles are still loading` | `D04a-100` |
| `components/sidebar/worktree-card-title-display.test.ts:46 :: keeps the stored title when there is no linked work title` | `D04a-100` |
| `components/sidebar/worktree-card-title-display.test.ts:55 :: does not replace a branch-like workspace name with the repository name` | `D04a-100` |
| `components/sidebar/worktree-card-title-display.test.ts:64 :: uses linked work titles when the stored title is nullish and the branch is usable` | `D04a-100` |
| `components/sidebar/worktree-card-title-display.test.ts:82 :: uses Jira issue titles when the card title would otherwise be the branch` | `D04a-102` |
| `components/sidebar/worktree-card-title-display.test.ts:92 :: treats blank stored titles as absent` | `D04a-100` |
| `components/sidebar/worktree-card-title-display.test.ts:109 :: skips linked-title replacement when the branch name is nullish or blank` | `D04a-100` |
| `components/sidebar/worktree-card-title-display.test.ts:127 :: coerces legacy visible titles before downstream title operations` | `D04a-100` |
| `components/sidebar/worktree-review-helpers.test.tsx:15 :: ReviewIcon` | `D04a-103` |
| `components/sidebar/worktree-review-helpers.test.tsx:16 :: uses the provider-specific GitLab MR icon by default` | `D04a-103` |
| `components/sidebar/worktree-review-helpers.test.tsx:22 :: can use the generic review icon for compact lanes` | `D04a-103` |
| `components/sidebar/worktree-review-helpers.test.tsx:34 :: does not paint a manual-blocked GitLab pipeline like a passing one` | `D04a-103` |
| `components/sidebar/worktree-review-helpers.test.tsx:50 :: gives a draft its own glyph and never paints it with a check tone` | `D04a-103` |
| `components/sidebar/worktree-review-helpers.test.tsx:78 :: keeps check tones on open reviews so failing checks still stand out` | `D04a-103` |
| `components/sidebar/worktree-review-helpers.test.tsx:90 :: renders merged reviews with the merge glyph` | `D04a-101` |
| `components/sidebar/worktree-review-helpers.test.tsx:103 :: overrides the GitLab provider glyph for closed merge requests` | `D04a-103` |
| `components/sidebar/worktree-review-helpers.test.tsx:115 :: flags problems on a stateless row without ever claiming success` | `D04a-103` |

## 4. Labels de UI / Menus (260/260)

| Entrada | Capability ID / Justificativa |
| :--- | :--- |
| `components/sidebar/WorktreeCard.affiliate-list-mode.test.tsx:59 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-005 |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:84 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-007 |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:246 | expect(markup).toContain('aria-label="1 live port"')` | `D04a-034` |
| `components/sidebar/WorktreeCard.compact-hover.test.tsx:628 | it('keeps status and agent tooltip targets outside the worktree details hover trigger', async () => {` | `D04a-009` |
| `components/sidebar/WorktreeCard.compact-ports-hover-independence.test.tsx:99 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-035 |
| `components/sidebar/WorktreeCard.compact-ports-hover-independence.test.tsx:240 | const portsRoot = rootContaining('[aria-label="1 live port"]')` | `D04a-034` |
| `components/sidebar/WorktreeCard.hosted-review-refresh.test.tsx:53 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-045 |
| `components/sidebar/WorktreeCard.lineage.test.tsx:43 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-020 |
| `components/sidebar/WorktreeCard.lineage.test.tsx:138 | expect(markup).toContain('aria-label="Hide 1 child workspace"')` | DUP: D04a-020 |
| `components/sidebar/WorktreeCard.merged-pr-display.test.tsx:50 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-101 |
| `components/sidebar/WorktreeCard.pinned-repo-icon.test.tsx:46 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-011 |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:54 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-101 |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:200 | expect(unreadMarkup).toContain('aria-label="Mark as read"')` | DUP: D04a-101 |
| `components/sidebar/WorktreeCard.pr-display.test.tsx:229 | expect(unreadMarkup).not.toContain('aria-label="Mark as read"')` | DUP: D04a-101 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:54 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:152 | expect(markup).toContain('aria-label="Mark as read"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:161 | expect(markup).not.toContain('aria-label="Project orca"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:264 | 'aria-label="This worktree will be renamed from the first agent message"'` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:279 | expect(markup).toContain('aria-label="Auto-rename failed: view error"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:295 | expect(markup).toContain('aria-label="Auto-rename failed: view error"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:394 | expect(markup).not.toContain('aria-label="Primary worktree"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:415 | expect(markup).toContain('aria-label="Primary worktree"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:425 | expect(markup).not.toContain('aria-label="Delete workspace"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:435 | expect(markup).toContain('aria-label="Delete workspace"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:453 | expect(markup).toContain('aria-label="Delete workspace"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:464 | expect(markup).toContain('aria-label="Delete workspace"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:478 | expect(markup).not.toContain('aria-label="Delete workspace"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:490 | expect(markup).not.toContain('aria-label="Sleep workspace"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:491 | expect(markup).not.toContain('aria-label="Delete workspace"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:503 | expect(markup).not.toContain('aria-label="Sleep workspace"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:504 | expect(markup).not.toContain('aria-label="Delete workspace"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.quick-actions.test.tsx:514 | expect(markup).not.toContain('aria-label="Delete workspace"')` | DUP: D04a-019 |
| `components/sidebar/WorktreeCard.ssh-reconnect-prompt.test.tsx:57 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-012 |
| `components/sidebar/WorktreeCardAgents.activation.test.tsx:8 | import { TooltipProvider } from '@/components/ui/tooltip'` | DUP: D04a-083 |
| `components/sidebar/WorktreeCardAgents.expansion-remount.test.tsx:77 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-087 |
| `components/sidebar/WorktreeCardAgents.send-target.test.tsx:48 | label: 'Send',` | DUP: D04a-085 |
| `components/sidebar/WorktreeCardAgents.send-target.test.tsx:142 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-085 |
| `components/sidebar/WorktreeCardAgents.send-target.test.tsx:236 | expect(markup).not.toContain('title="Agent is working"')` | DUP: D04a-085 |
| `components/sidebar/WorktreeCardAgents.test.tsx:164 | aria-label={`${childAgentsExpanded ? 'Hide' : 'Show'} ${childAgentCount} child ${` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:182 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:207 | expect(markup).toContain('aria-label="Agents"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:221 | expect(markup).toContain('title="Codex"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:442 | expect(markup).toContain('aria-label="Hide 1 child agent"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:467 | expect(markup).toContain('aria-label="Hide 1 child agent"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:491 | expect(markup).toContain('aria-label="Hide 1 child agent"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:529 | expect(markup).not.toContain('aria-label="Show 1 child agent"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:559 | expect(markup).not.toContain('title="Codex done"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:560 | expect(markup).not.toContain('title="Claude done"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:723 | expect(markup).not.toContain('title="Codex waiting"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:724 | expect(markup).not.toContain('title="Claude working"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:725 | expect(markup).not.toContain('title="Gemini done"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:772 | const iconTitles = [...markup.matchAll(/title="([^"]+)"/g)].map((match) => match[1])` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:774 | // Variety icons stay identity-free; the state label belongs to the shared tooltip.` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:893 | expect(markup).not.toContain('title="Gemini waiting"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:894 | expect(markup).not.toContain('title="Codex working"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.test.tsx:895 | expect(markup).not.toContain('title="Codex done"')` | DUP: D04a-080 |
| `components/sidebar/WorktreeCardAgents.tsx:377 | aria-label={translate('auto.components.sidebar.WorktreeCardAgents.1b0a156717', 'Agents')}` | `D04a-080` |
| `components/sidebar/WorktreeCardAgents.tsx:419 | aria-label={translate('auto.components.sidebar.WorktreeCardAgents.1b0a156717', 'Agents')}` | `D04a-080` |
| `components/sidebar/WorktreeCardAutomationDetailSection.test.tsx:13 | import { TooltipProvider } from '@/components/ui/tooltip'` | DUP: D04a-045 |
| `components/sidebar/WorktreeCardAutomationDetailSection.test.tsx:122 | expect(container.querySelector('[aria-label="Open automation"]')).not.toBeNull()` | DUP: D04a-045 |
| `components/sidebar/WorktreeCardAutomationDetailSection.test.tsx:123 | expect(container.querySelector('[aria-label="Open run"]')).not.toBeNull()` | DUP: D04a-045 |
| `components/sidebar/WorktreeCardIssueDetailSection.tsx:6 | DropdownMenuItem,` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardIssueDetailSection.tsx:9 | import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D04a-040` |
| `components/sidebar/WorktreeCardIssueDetailSection.tsx:55 | aria-label={moreActionsLabel}` | `D04a-040` |
| `components/sidebar/WorktreeCardIssueDetailSection.tsx:90 | <DropdownMenuItem` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardIssueDetailSection.tsx:100 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardIssueDetailSection.tsx:103 | <DropdownMenuItem onSelect={onCopyIssueLink}>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardIssueDetailSection.tsx:106 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:43 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-038 |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:45 | <div data-tooltip-open={open === false ? 'false' : 'default'}>{children}</div>` | DUP: D04a-038 |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:69 | DropdownMenuItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (` | DUP: D04a-038 |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:194 | it('omits the review trigger tooltip while the review menu is open', () => {` | `D04a-041` |
| `components/sidebar/WorktreeCardMeta.test.tsx:12 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-037 |
| `components/sidebar/WorktreeCardMeta.test.tsx:24 | DropdownMenuItem: ({ children }: { children: ReactNode; onSelect?: () => void }) => (` | DUP: D04a-037 |
| `components/sidebar/WorktreeCardMeta.test.tsx:140 | const moreActionsIndex = markup.indexOf('aria-label="More PR actions"')` | `D04a-041` |
| `components/sidebar/WorktreeCardMeta.test.tsx:141 | const openInOrcaIndex = markup.indexOf('aria-label="Open in Orca"')` | `D04a-041` |
| `components/sidebar/WorktreeCardMeta.test.tsx:142 | const viewOnGitHubIndex = markup.indexOf('aria-label="View on GitHub"')` | `D04a-041` |
| `components/sidebar/WorktreeCardMeta.test.tsx:156 | expect(markup).not.toContain('aria-label="Unlink PR from workspace"')` | DUP: D04a-037 |
| `components/sidebar/WorktreeCardMeta.test.tsx:181 | const moreActionsIndex = markup.indexOf('aria-label="More issue actions"')` | `D04a-040` |
| `components/sidebar/WorktreeCardMeta.test.tsx:183 | const editIssueIndex = markup.indexOf('aria-label="Edit issue"')` | `D04a-040` |
| `components/sidebar/WorktreeCardMeta.test.tsx:184 | const openInOrcaIndex = markup.indexOf('aria-label="Open in Orca"')` | `D04a-040` |
| `components/sidebar/WorktreeCardMeta.test.tsx:185 | const viewOnGitHubIndex = markup.indexOf('aria-label="View on GitHub"')` | `D04a-040` |
| `components/sidebar/WorktreeCardMeta.test.tsx:221 | expect(markup).toContain('aria-label="More MR actions"')` | DUP: D04a-037 |
| `components/sidebar/WorktreeCardMeta.tsx:126 | const copyLinkedWorkItemLink = React.useCallback(async (url: string, label: string) => {` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardMetaBadges.tsx:76 | aria-label={translate(` | `D04a-025` |
| `components/sidebar/WorktreeCardMetadataControls.tsx:2 | import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D04a-029` |
| `components/sidebar/WorktreeCardMetadataControls.tsx:8 | label: string` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardMetadataControls.tsx:25 | label: string` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardMetadataControls.tsx:45 | label: string` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardMetadataControls.tsx:56 | aria-label={label}` | `D04a-029` |
| `components/sidebar/WorktreeCardMetadataControls.tsx:68 | aria-label={label}` | `D04a-029` |
| `components/sidebar/WorktreeCardMetadataStatusBadges.tsx:15 | label: string` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardMetadataStatusBadges.tsx:94 | label: 'MR' | 'PR'` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardPorts.test.tsx:17 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-035 |
| `components/sidebar/WorktreeCardPorts.test.tsx:49 | expect(markup).toContain('aria-label="Copy dev.preview.localhost:58941"')` | DUP: D04a-035 |
| `components/sidebar/WorktreeCardPorts.tsx:6 | import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D04a-036` |
| `components/sidebar/WorktreeCardPorts.tsx:42 | aria-label={translate(` | `D04a-036` |
| `components/sidebar/WorktreeCardPorts.tsx:59 | tooltipLabel = label,` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardPorts.tsx:64 | label: string` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardPorts.tsx:65 | tooltipLabel?: string` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardPorts.tsx:86 | aria-label={label}` | `D04a-036` |
| `components/sidebar/WorktreeCardPorts.tsx:93 | {tooltipLabel}` | `D04a-036` |
| `components/sidebar/WorktreeCardPorts.tsx:256 | tooltipLabel={getPortOpenBrowserTooltipLabel(openBrowserLabel)}` | `D04a-036` |
| `components/sidebar/WorktreeCardReviewDetailSection.tsx:6 | DropdownMenuItem,` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardReviewDetailSection.tsx:9 | import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D04a-041` |
| `components/sidebar/WorktreeCardReviewDetailSection.tsx:61 | aria-label={moreActionsLabel}` | `D04a-041` |
| `components/sidebar/WorktreeCardReviewDetailSection.tsx:102 | <DropdownMenuItem` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardReviewDetailSection.tsx:113 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardReviewDetailSection.tsx:116 | <DropdownMenuItem` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardReviewDetailSection.tsx:127 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:29 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-012 |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:32 | <span data-tooltip="">{children}</span>` | DUP: D04a-012 |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:103 | it('distinguishes an auth failure from a generic connection failure in the tooltip', () => {` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:105 | expect(container.querySelector('[data-tooltip]')).toHaveTextContent(` | DUP: D04a-012 |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:111 | expect(retry.container.querySelector('[data-tooltip]')).toHaveTextContent(` | DUP: D04a-012 |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:132 | // through to the card and would kill the tooltip for the whole in-flight window.` | DUP: D04a-012 |
| `components/sidebar/WorktreeCardSshHostControl.test.tsx:222 | { id: 'ssh-live', label: 'devbox', host: 'devbox', port: 22, username: 'me' }` | DUP: D04a-012 |
| `components/sidebar/WorktreeCardSshHostControl.tsx:5 | import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.tsx:32 | /** True when the row cannot afford a visible label: icon-only with an sr-only label. */` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.tsx:48 | tooltip,` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.tsx:53 | tooltip: string` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardSshHostControl.tsx:66 | {tooltip}` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.tsx:145 | tooltip={translate(` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.tsx:166 | tooltip={translate(` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.tsx:212 | const tooltip = connecting` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.tsx:241 | aria-label={accessibleName}` | `D04a-012` |
| `components/sidebar/WorktreeCardSshHostControl.tsx:247 | // tooltip for the entire in-flight window.` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardSshHostControl.tsx:279 | {tooltip}` | `D04a-012` |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:11 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:12 | Tooltip: ({ children }: { children: ReactNode }) => <span data-tooltip-root="">{children}</span>,` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:14 | <span data-tooltip-content="">{children}</span>` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:56 | expect(markup).toContain('aria-label="Mark as read"')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:78 | expect(markup).not.toContain('aria-label="Mark as read"')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:109 | expect(markup).not.toContain('aria-label="Mark as read"')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:135 | expect(markup).not.toContain('aria-label="Mark as read"')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:153 | expect(markup).toContain('aria-label="Mark as read"')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:176 | expect(markup.match(/data-tooltip-root/g)).toHaveLength(1)` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:218 | expect(markup).not.toContain('data-tooltip-root')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:305 | expect(markup).not.toContain('data-tooltip-root')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:326 | expect(markup).not.toContain('data-tooltip-root')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:347 | expect(markup).not.toContain('data-tooltip-root')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:369 | expect(markup).toContain('data-tooltip-root')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:370 | expect(markup).toContain('data-tooltip-content="">Working')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:393 | expect(markup).toContain('data-tooltip-root')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:394 | expect(markup).toContain('data-tooltip-content="">Needs permission')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:412 | expect(markup).toContain('aria-label="Mark as read"')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:435 | expect(markup).not.toContain('aria-label="Mark as read"')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:447 | expect(markup).not.toContain('data-tooltip-root')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.test.tsx:476 | expect(markup).not.toContain('data-tooltip-root')` | DUP: D04a-021 |
| `components/sidebar/WorktreeCardStatusSlot.tsx:3 | import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D04a-023` |
| `components/sidebar/WorktreeCardStatusSlot.tsx:144 | <StatusIndicator status={status} aria-hidden="true" tooltipSide="right" />` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeCardStatusSlot.tsx:154 | tooltipSide="right"` | `D04a-023` |
| `components/sidebar/WorktreeCardStatusSlot.tsx:171 | const tooltip =` | `D04a-023` |
| `components/sidebar/WorktreeCardStatusSlot.tsx:190 | aria-label={actionLabel}` | `D04a-023` |
| `components/sidebar/WorktreeCardStatusSlot.tsx:228 | <span>{tooltip}</span>` | `D04a-023` |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:27 | DropdownMenuItem: function DropdownMenuItem(props: {` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:71 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.react185-bystander.test.tsx:6 | * DropdownMenuItem inside the worktree row's context menu).` | DUP: D04a-072 |
| `components/sidebar/WorktreeContextMenu.react185-bystander.test.tsx:19 | import { TooltipProvider } from '@/components/ui/tooltip'` | DUP: D04a-072 |
| `components/sidebar/WorktreeContextMenu.react185-bystander.test.tsx:28 | { id: 'todo', label: 'Todo' },` | DUP: D04a-072 |
| `components/sidebar/WorktreeContextMenu.react185-bystander.test.tsx:29 | { id: 'doing', label: 'Doing' }` | DUP: D04a-072 |
| `components/sidebar/WorktreeContextMenu.test.ts:277 | { id: 'todo', label: 'Todo' },` | DUP: D04a-052 |
| `components/sidebar/WorktreeContextMenu.test.ts:278 | { id: 'in-review', label: 'In review' }` | DUP: D04a-052 |
| `components/sidebar/WorktreeContextMenuOverlays.tsx:11 | title={translate(` | `D04a-070` |
| `components/sidebar/WorktreeContextMenuView.tsx:4 | DropdownMenuItem,` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:13 | import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D04a-069` |
| `components/sidebar/WorktreeContextMenuView.tsx:160 | <DropdownMenuItem onSelect={handleRename} disabled={isDeleting}>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:163 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:180 | <DropdownMenuItem onSelect={handleCopyPath} disabled={isDeleting}>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:183 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:185 | <DropdownMenuItem onSelect={handleTogglePin} disabled={isDeleting}>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:190 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:191 | <DropdownMenuItem onSelect={handleToggleRead} disabled={isDeleting}>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:203 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:207 | <DropdownMenuItem onSelect={handleCreateGroupFromRepo} disabled={isDeleting}>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:213 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:225 | <DropdownMenuItem` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:231 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:237 | <DropdownMenuItem onSelect={handleRemoveProjectFromGroup} disabled={isDeleting}>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:243 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:248 | <DropdownMenuItem` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:254 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:258 | <DropdownMenuItem onSelect={handleOpenParent} disabled={isDeleting}>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:264 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:267 | <DropdownMenuItem onSelect={handleRemoveParentLink} disabled={isDeleting}>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:273 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:282 | <DropdownMenuItem onSelect={handleRemoveParentLink} disabled={deletingContext}>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:288 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:315 | <DropdownMenuItem variant="destructive" disabled>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:321 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:336 | <DropdownMenuItem` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:344 | title={` | `D04a-069` |
| `components/sidebar/WorktreeContextMenuView.tsx:380 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeDeveloperMenu.test.tsx:22 | DropdownMenuItem: (props: MenuItemProps) => {` | DUP: D04a-066 |
| `components/sidebar/WorktreeDeveloperMenu.tsx:2 | DropdownMenuItem,` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeDeveloperMenu.tsx:25 | <DropdownMenuItem onSelect={() => requestManualTerminalWorktreePark(worktreeId)}>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeDeveloperMenu.tsx:28 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeDeveloperMenuReveal.test.tsx:48 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-066 |
| `components/sidebar/WorktreeDeveloperMenuReveal.test.tsx:61 | DropdownMenuItem: passthrough,` | DUP: D04a-066 |
| `components/sidebar/WorktreeDisplayNameField.tsx:53 | placeholder={translate(` | `D04a-094` |
| `components/sidebar/WorktreeHostContextBadge.tsx:21 | label: string` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeIssueLinkField.tsx:11 | import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D04a-095` |
| `components/sidebar/WorktreeIssueLinkField.tsx:178 | placeholder={translate(` | `D04a-095` |
| `components/sidebar/WorktreeIssueLinkField.tsx:195 | aria-label={translate(` | `D04a-095` |
| `components/sidebar/WorktreeIssueLinkField.tsx:223 | aria-label={openIssueLabel}` | `D04a-095` |
| `components/sidebar/WorktreeMetaDialog.test.tsx:15 | // Why: Radix tooltips need a provider the dialog does not own, and the menu's` | DUP: D04a-093 |
| `components/sidebar/WorktreeMetaDialog.test.tsx:17 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-093 |
| `components/sidebar/WorktreeMetaDialog.tsx:394 | placeholder={translate(` | `D04a-097` |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:29 | openInApplications: [] as { id: string; label: string; command: string }[]` | DUP: D04a-055 |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:179 | { id: 'vscode', label: 'VS Code', command: 'code' },` | DUP: D04a-055 |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:180 | { id: 'cursor', label: 'Cursor', command: 'cursor' },` | DUP: D04a-055 |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:181 | { id: 'zed', label: 'Zed', command: 'zed' }` | DUP: D04a-055 |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:233 | { id: 'renamed', label: 'My Remote Editor', command: 'code-insiders' },` | DUP: D04a-055 |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:234 | { id: 'fake', label: 'VS Code', command: 'cursor' },` | DUP: D04a-055 |
| `components/sidebar/WorktreeOpenInMenu.test.tsx:235 | { id: 'compound', label: 'VS Code Reuse', command: 'code --reuse-window' }` | DUP: D04a-055 |
| `components/sidebar/WorktreeOpenInMenu.tsx:5 | DropdownMenuItem,` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeOpenInMenu.tsx:33 | label: string` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeOpenInMenu.tsx:45 | label: application.label,` | `D04a-055` |
| `components/sidebar/WorktreeOpenInMenu.tsx:49 | { id: 'file-manager', label: fileManagerLabel, target: 'file-manager' }` | `D04a-055` |
| `components/sidebar/WorktreeOpenInMenu.tsx:319 | <DropdownMenuItem` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeOpenInMenu.tsx:343 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeOpenInMenu.tsx:372 | <DropdownMenuItem` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeOpenInMenu.tsx:378 | </DropdownMenuItem>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeReviewLinkField.tsx:34 | placeholder={` | `D04a-096` |
| `components/sidebar/WorktreeTitleInlineRename.begin-editing.test.tsx:50 | vi.mock('@/components/ui/tooltip', () => ({` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.test.tsx:3 | import { TooltipProvider } from '@/components/ui/tooltip'` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.test.tsx:47 | expect(markup).not.toContain('title="Feature workspace"')` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.tsx:5 | import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.tsx:118 | // clipped; the tooltip should track the rendered geometry, not just text.` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeTitleInlineRename.tsx:290 | aria-label={translate(` | `D04a-074` |
| `components/sidebar/worktree-card-agent-summary.test.ts:4 | import { TooltipProvider } from '@/components/ui/tooltip'` | DUP: D04a-089 |
| `components/sidebar/worktree-card-agent-summary.test.ts:38 | return [...markup.matchAll(/\stitle="([^"]*)"/g)].map((match) => match[1])` | DUP: D04a-089 |
| `components/sidebar/worktree-card-agent-summary.test.ts:62 | expect(markup).toContain('title="Monitoring background tasks - Run background checks"')` | DUP: D04a-089 |
| `components/sidebar/worktree-card-agent-summary.test.ts:89 | expect(eligible).toContain('data-slot="tooltip-trigger"')` | DUP: D04a-089 |
| `components/sidebar/worktree-card-compact-agent-row.stable-message.test.tsx:6 | import { TooltipProvider } from '@/components/ui/tooltip'` | DUP: D04a-091 |
| `components/sidebar/worktree-card-compact-agent-row.tsx:194 | aria-label={translate(` | `D04a-080` |
| `components/sidebar/worktree-card-compact-agent-row.tsx:222 | title={sendTargetDisabledReason ? null : undefined}` | `D04a-080` |
| `components/sidebar/worktree-card-compact-agent-row.tsx:223 | tooltipSide="right"` | `D04a-080` |
| `components/sidebar/worktree-card-compact-agent-row.tsx:226 | <span className="inline-flex shrink-0" title={formatAgentTypeLabel(agent.agentType)}>` | `D04a-080` |
| `components/sidebar/worktree-card-compact-agent-row.tsx:232 | title={sendTargetDisabledReason ? undefined : rowTitle}` | `D04a-080` |
| `components/sidebar/worktree-card-compact-agent-row.tsx:252 | title={model}` | `D04a-080` |
| `components/sidebar/worktree-card-compact-agent-row.tsx:305 | title={sendTargetDisabledReason}` | `D04a-080` |
| `components/sidebar/worktree-card-compact-agents.tsx:118 | aria-label={` | `D04a-081` |
| `components/sidebar/worktree-card-compact-agents.tsx:153 | <AgentStateDot state={group.state} size="sm" tooltipSide="right" />` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/worktree-card-display-property-options.ts:4 | export const PROPERTY_OPTIONS: { id: WorktreeCardProperty; label: string }[] = [` | `D04a-110` |
| `components/sidebar/worktree-card-header.tsx:7 | import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D04a-019` |
| `components/sidebar/worktree-card-header.tsx:31 | aria-label={translate(` | `D04a-019` |
| `components/sidebar/worktree-card-header.tsx:190 | // Why: the error can be raw agent CLI output, so the badge opens a dialog rather than a tooltip.` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/worktree-card-header.tsx:200 | aria-label={translate(` | `D04a-019` |
| `components/sidebar/worktree-card-header.tsx:274 | aria-label={translate(` | `D04a-019` |
| `components/sidebar/worktree-card-header.tsx:304 | aria-label={translate(` | `D04a-019` |
| `components/sidebar/worktree-card-meta-row.tsx:65 | tooltipEnabled={!hasHoverDetails}` | `D04a-010` |
| `components/sidebar/worktree-card-meta-row.tsx:70 | title={worktree.path}` | `D04a-010` |
| `components/sidebar/worktree-card-meta-row.tsx:78 | // Why: whole-card details hover already shows full identity; a nested tooltip would compete for it.` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/worktree-card-meta-row.tsx:79 | tooltipEnabled={!hasHoverDetails}` | `D04a-010` |
| `components/sidebar/worktree-card-parent-content.tsx:76 | // Why: status glyphs and agent rows own their tooltips; only identity content should open the larger details card.` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/worktree-card-presentation.tsx:143 | // Why: the parent row owns metadata hover; don't stack the title's truncation tooltip on the details popover.` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/worktree-card-secondary-rows.tsx:5 | import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D04a-020` |
| `components/sidebar/worktree-card-secondary-rows.tsx:89 | aria-label={lineageChildAriaLabel}` | `D04a-020` |
| `components/sidebar/worktree-review-helpers.tsx:29 | // their state tone so the glyph agrees with its tooltip. A stateless row (folder` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |

## 5. Atalhos de Teclado (64/64)

| Entrada | Capability ID / Justificativa |
| :--- | :--- |
| `components/sidebar/WorktreeCardMeta.interaction.test.tsx:233 | new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })` | DUP: D04a-038 |
| `components/sidebar/WorktreeCardSshHostControl.tsx:254 | if (event.key === 'Enter' || event.key === ' ') {` | `D04a-012` |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:12 | const shortcutLabelMock = vi.hoisted(() => vi.fn())` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:14 | vi.mock('@/hooks/useShortcutLabel', () => ({` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:15 | useOptionalShortcutLabel: shortcutLabelMock,` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:16 | formatShortcutLabel: () => '',` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:17 | formatOptionalShortcutLabel: () => null` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:45 | DropdownMenuShortcut: function DropdownMenuShortcut(props: { children?: React.ReactNode }) {` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:46 | return <span data-testid="dropdown-menu-shortcut">{props.children}</span>` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:158 | describe('WorktreeContextMenu delete shortcut display', () => {` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:160 | shortcutLabelMock.mockImplementation((action: string) => {` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:178 | it('renders the delete shortcut badge for standard worktree delete', () => {` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:196 | const shortcuts = container.querySelectorAll('[data-testid="dropdown-menu-shortcut"]')` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:197 | const deleteShortcuts = Array.from(shortcuts).filter((el) => el.textContent === '⌘⇧⌫')` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:198 | expect(deleteShortcuts.length).toBe(1)` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:201 | it('omits the delete shortcut on disabled Delete Worktree for primary checkout', () => {` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:218 | const shortcuts = container.querySelectorAll('[data-testid="dropdown-menu-shortcut"]')` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:219 | const deleteShortcuts = Array.from(shortcuts).filter((el) => el.textContent === '⌘⇧⌫')` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:220 | expect(deleteShortcuts.length).toBe(0)` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:223 | it('omits the shortcut badge when the action is unassigned', () => {` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:224 | shortcutLabelMock.mockReturnValue(null)` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:241 | const shortcuts = container.querySelectorAll('[data-testid="dropdown-menu-shortcut"]')` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenu.delete-shortcut.test.tsx:242 | expect(shortcuts.length).toBe(0)` | DUP: D04a-069 |
| `components/sidebar/WorktreeContextMenuView.tsx:7 | DropdownMenuShortcut,` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:35 | import { useOptionalShortcutLabel } from '@/hooks/useShortcutLabel'` | `D04a-069` |
| `components/sidebar/WorktreeContextMenuView.tsx:103 | const deleteShortcut = useOptionalShortcutLabel('workspace.delete')` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeContextMenuView.tsx:377 | {!isMultiContext && !removesProject && deleteShortcut ? (` | `D04a-069` |
| `components/sidebar/WorktreeContextMenuView.tsx:378 | <DropdownMenuShortcut>{deleteShortcut}</DropdownMenuShortcut>` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeDeveloperMenuReveal.test.tsx:70 | DropdownMenuShortcut: passthrough` | DUP: D04a-066 |
| `components/sidebar/WorktreeDisplayNameField.tsx:47 | if (emojiInput.handleKeyDown(event) || event.key !== 'Enter') {` | `D04a-094` |
| `components/sidebar/WorktreeIssueLinkField.tsx:71 | onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void` | `D04a-095` |
| `components/sidebar/WorktreeMetaDialog.tsx:25 | import { getScreenSubmitShortcutLabel, isScreenSubmitShortcut } from '@/lib/screen-submit-shortcut'` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.tsx:57 | const submitShortcutLabel = getScreenSubmitShortcutLabel()` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeMetaDialog.tsx:292 | (e: React.KeyboardEvent<HTMLTextAreaElement>) => {` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.tsx:294 | if (isPlainEnter || isScreenSubmitShortcut(e)) {` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.tsx:304 | (e: React.KeyboardEvent<HTMLInputElement>) => {` | `D04a-093` |
| `components/sidebar/WorktreeMetaDialog.tsx:406 | {submitShortcutLabel}{' '}` | `D04a-093` |
| `components/sidebar/WorktreeReviewLinkField.tsx:8 | onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void` | `D04a-096` |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:55 | function ShortcutRenameHarness({` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:74 | function openEditorByShortcut(props: HarnessProps = {}): {` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:79 | const { rerender } = render(<ShortcutRenameHarness {...props} />)` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:82 | throw new Error('the rename shortcut did not open an editor')` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:86 | markUnread: () => rerender(<ShortcutRenameHarness {...props} showUnreadEmphasis={true} />),` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:88 | rerender(<ShortcutRenameHarness {...props} displayName={displayName} />)` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:93 | it('closes the shortcut-opened editor on Escape', () => {` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:94 | const { input } = openEditorByShortcut()` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:101 | it('closes the shortcut-opened editor once the rename commits', async () => {` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:103 | const { input } = openEditorByShortcut({ onRename })` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:112 | it('closes the shortcut-opened editor when it loses focus', async () => {` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:113 | const { input } = openEditorByShortcut()` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:124 | const { input } = openEditorByShortcut({ onEditingChange })` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:133 | it('reports the shortcut-open transition once in Strict Mode', () => {` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:138 | <ShortcutRenameHarness onEditingChange={onEditingChange} />` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:165 | const { input } = openEditorByShortcut()` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:174 | const { input, renameElsewhere } = openEditorByShortcut()` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.editor-lifecycle.test.tsx:187 | const { input, markUnread } = openEditorByShortcut()` | DUP: D04a-074 |
| `components/sidebar/WorktreeTitleInlineRename.tsx:44 | // Why: lets a parent (e.g. the workspace.rename shortcut via WorktreeCard)` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeTitleInlineRename.tsx:154 | // Why: double-click and the shortcut both open here, so neither can skip a step.` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeTitleInlineRename.tsx:171 | // shortcut). Always consume the request so the parent's trigger can't linger;` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/WorktreeTitleInlineRename.tsx:244 | (event: React.KeyboardEvent<HTMLInputElement>) => {` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.tsx:254 | if (event.key === 'Enter') {` | `D04a-074` |
| `components/sidebar/WorktreeTitleInlineRename.tsx:257 | } else if (event.key === 'Escape') {` | `D04a-074` |
| `components/sidebar/worktree-card-compact-agent-row.tsx:68 | function stopActivationKeyPropagation(e: React.KeyboardEvent): void {` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |
| `components/sidebar/worktree-card-compact-agents.tsx:18 | function stopActivationKeyPropagation(e: React.KeyboardEvent): void {` | INFRA: linha estrutural/JSX ou de import, sem rótulo de UI próprio |

## 6. Preferências / Settings (0/0)

| Entrada | Capability ID / Justificativa |
| :--- | :--- |

## 7. Timers (1/1)

| Entrada | Capability ID / Justificativa |
| :--- | :--- |
| `components/sidebar/WorktreeCardAgents.tsx:219 const handle = requestAnimationFrame(() => {` | `D04a-088` |

## 8. Subscriptions / Event Listeners (5/5)

| Entrada | Capability ID / Justificativa |
| :--- | :--- |
| `components/sidebar/WorktreeCardAutomationDetailSection.tsx:37 React.useEffect(() => {` | `D04a-045` |
| `components/sidebar/WorktreeTitleInlineRename.begin-editing.test.tsx:15 useEffect(effect: () => void | (() => void)) {` | INFRA: mock de useEffect no helper de teste (sem subscrição real) |
| `components/sidebar/WorktreeTitleInlineRename.tsx:111 window.addEventListener('resize', updateTitleTruncated)` | `D04a-073` |
| `components/sidebar/WorktreeTitleInlineRename.tsx:173 useEffect(() => {` | `D04a-074` |
| `components/sidebar/worktree-card-compact-agent-row.tsx:130 useEffect(() => {` | `D04a-091` |

## 9. Símbolos Preload / Backend (7/7)

| Entrada | Capability ID / Justificativa |
| :--- | :--- |
| `components/sidebar/WorktreeCardMeta.tsx:130 await window.api.ui.writeClipboardText(url)` | `D04a-047` |
| `components/sidebar/WorktreeCardPorts.tsx:166 void window.api.ui.writeClipboardText(address)` | `D04a-036` |
| `components/sidebar/WorktreeCardSshHostControl.tsx:102 trackSshConnect(targetId, window.api.ssh.connect({ targetId })),` | `D04a-013` |
| `components/sidebar/WorktreeCardSshHostControl.tsx:128 const targets = await window.api.ssh.listTargets()` | `D04a-013` |
| `components/sidebar/WorktreeCardSshHostControl.tsx:130 const removedLabels = await window.api.ssh.listRemovedTargetLabels()` | `D04a-013` |
| `components/sidebar/WorktreeOpenInMenu.tsx:274 ? await window.api.shell.openInFileManager(args.worktreePath)` | `D04a-056` |
| `components/sidebar/WorktreeOpenInMenu.tsx:275 : await window.api.shell.openInExternalEditor({` | `D04a-056` |

## 10. Contrato de backend (main/preload)

| Símbolo renderer | Handler main |
| :--- | :--- |
| `window.api.ui.writeClipboardText` | src/preload/api/ui-bridge-clipboard-and-window-controls.ts:99 -> ipc 'clipboard:writeText' -> src/main/window/clipboard-ipc-handlers.ts:193 (`writeClipboardTextAndVerify`) |
| `window.api.shell.openInFileManager` | src/preload/api/shell-bridge.ts:12 -> ipc 'shell:openInFileManager' -> src/main/ipc/shell.ts:147 |
| `window.api.shell.openInExternalEditor` | src/preload/api/shell-bridge.ts:15 -> ipc 'shell:openInExternalEditor' -> src/main/ipc/shell.ts:152 |
| `window.api.ssh.connect` | src/preload/api/ssh-bridge.ts -> ipc 'ssh:connect' -> src/main/ipc/ssh-connection-handlers.ts:111 |
| `window.api.ssh.listTargets` | ipc 'ssh:listTargets' -> src/main/ipc/ssh-target-crud-handlers.ts:43 |
| `window.api.ssh.listRemovedTargetLabels` | src/preload/api/ssh-bridge.ts:26 -> ipc 'ssh:listRemovedTargetLabels' -> src/main/ipc/ssh-target-crud-handlers.ts:47 (RPC remoto: src/main/runtime/rpc/methods/ssh.ts:61) |

## 11. Justificativas explícitas (N/A / INFRA / DUP)

- Símbolos: **0** justificados (0 N/A · 0 INFRA · 0 DUP) — todos os 119 exports têm capability própria.
- Testes: **0** justificados (0) — todos os 433 casos mapeiam para uma capability que eles especificam.
- Labels: **186** justificados — linhas estruturais de import/JSX (`INFRA`) ou espelhamento de caso já coberto (`DUP: <id>`); as 74 restantes são rótulos reais de UI mapeados à capability que os produz.
- Hotkeys: **50** justificados — 50 entradas do índice são linhas de teste/estruturais; as 14 restantes são handlers de teclado reais mapeados a capability.
- Prefs: 0/0 — nenhuma entrada no índice do domínio.
- Timers: 1/1 — o `requestAnimationFrame` de reveal; o tick de 30s (`useNow`) aparece como capability `D04a-092` mas não consta do índice de timers.
- Subscriptions: 1/5 justificado (`INFRA: mock de useEffect no helper de teste`, sem subscrição real).

## 12. Achados principais (top findings)

1. O card monta o tick de tempo relativo (30s) somente quando há ≥1 linha de agente inline — worktrees ociosos não pagam timer (`WorktreeCardAgents.tsx:219`/`useNow(30_000)`).
2. A lane de status do novo estilo substitui o ponto quieto por review/MR ou ícone de branch, mas `working`/`permission` sempre têm precedência (`WorktreeCardStatusSlot.tsx:112-140`).
3. O botão de SSH usa `aria-disabled` em vez de `disabled` de propósito, para não perder o tooltip nem deixar o clique cair no card (`WorktreeCardSshHostControl.tsx:241-252`).
4. Falha de conexão SSH ressincroniza `ssh.listTargets` + `ssh.listRemovedTargetLabels` na ordem certa, para o host fantasma convergir para 'removido' em vez de oferecer Connect para sempre (`WorktreeCardSshHostControl.tsx:120-135`).
5. O diálogo de metadados congela um snapshot de baseline para que um update em background no store não marque campo intocado como sujo (`WorktreeMetaDialog.tsx:145-160`).
6. Expansão da lista inline sobrevive ao recycle do virtualizer via cache LRU módulo-level de 512 entradas (`worktree-card-agents-expansion-state.ts:30-58`).
7. O menu de contexto é revelado por Option/Alt e nunca em multi-seleção; um clique fantasma de até 500ms após abrir é suprimido (`WorktreeContextMenuView.tsx:105-135`).
8. Detalhes de hover adiam o fechamento enquanto um menu interno está aberto, para não desmontar o portal antes do clique (`worktree-card-details-hover-state.ts:11-35`).
9. A identidade do título prioriza títulos reais de issue/Linear/Jira/review quando o título guardado é só o branch, ignorando placeholders de loading (`worktree-card-title-display.ts:60-71`).
10. O modo lista afiliada mantém a aparência e a ativação, mas desliga menu de contexto, drag, rename e todas as mutações de metadados (`worktree-card-surface.tsx:9-130`).
