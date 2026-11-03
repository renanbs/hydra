// Thin bridge for the right sidebar: the entry model and preflight live beside the
// workspace card menu (one source for both surfaces).
import {
  openWorktreePath as openWorktreePathWithGuard,
  type OpenInTarget
} from '../../lib/open-in-path-guard'

export type { OpenInMenuEntry } from '../sidebar/worktree-open-in-menu'
export { getWorktreeOpenInEntries } from '../sidebar/worktree-open-in-menu'

export async function openWorktreePath(args: {
  target: OpenInTarget
  worktreePath: string
  command?: string
}) {
  await openWorktreePathWithGuard(args)
}
