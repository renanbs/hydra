/**
 * Which workspaces a card's status assignment actually writes.
 *
 * The board is a multi-select surface, but the card menu is the same one the sidebar opens; the
 * missing piece is *how many* workspaces the chosen status covers. Orca's answer
 * (`activeContextWorktrees`) is the rule ported here: a right-click on a card that is part of a
 * selection acts on the whole selection, and a right-click on any other card acts on that card
 * alone — so a batch the user built by hand is never silently split, and a stray right-click
 * can never move a batch the user forgot was selected.
 *
 * The caller narrows `selectedWorktreePaths` to the cards the board currently shows before
 * calling: a batch assignment must not write a status to a card a search has hidden.
 */
export function resolveWorkspaceBoardStatusAssignmentTargets(args: {
  clickedWorktreePath: string
  selectedWorktreePaths: readonly string[]
}): readonly string[] {
  return args.selectedWorktreePaths.includes(args.clickedWorktreePath)
    ? args.selectedWorktreePaths
    : [args.clickedWorktreePath]
}
