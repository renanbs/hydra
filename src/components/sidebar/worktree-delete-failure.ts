// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca's delete-failure guidance: Git's raw stderr is not a user-facing
// message. The dialog and the recovery toast need a short summary plus the concrete
// recovery step (unlock, force, fix permissions).
export type WorktreeDeleteFailure = {
  summary: string
  guidance: string | null
  /** Force Delete can plausibly recover; permission failures need a human first. */
  canForce: boolean
}

export function describeWorktreeDeleteFailure(
  raw: string,
  worktreePath?: string
): WorktreeDeleteFailure {
  const message = raw.trim()
  const lower = message.toLowerCase()

  if (lower.includes("locked")) {
    return {
      summary: "This worktree is locked by Git.",
      guidance: `Run \`git worktree unlock ${worktreePath ?? "<path>"}\` and try again.`,
      canForce: true,
    }
  }

  if (
    lower.includes("modified or untracked") ||
    lower.includes("contains modified") ||
    lower.includes("use --force") ||
    lower.includes("not clean")
  ) {
    return {
      summary: "This worktree has uncommitted or untracked changes.",
      guidance: "Deleting it permanently removes those changes from disk.",
      canForce: true,
    }
  }

  if (
    lower.includes("not a working tree") ||
    lower.includes("is not a working tree") ||
    lower.includes("does not exist") ||
    lower.includes("no such file") ||
    lower.includes("not a valid")
  ) {
    return {
      summary: "Git no longer tracks this worktree.",
      guidance: "Force Delete removes the leftover directory and registration.",
      canForce: true,
    }
  }

  if (lower.includes("permission denied") || lower.includes("operation not permitted")) {
    return {
      summary: "The filesystem refused to remove this workspace.",
      guidance: "Check the folder permissions and any process holding its files open.",
      canForce: false,
    }
  }

  if (lower.includes("still running") || lower.includes("active session") || lower.includes("pty")) {
    return {
      summary: "A session in this workspace could not be stopped.",
      guidance: "Close its terminals and agents, then try again.",
      canForce: true,
    }
  }

  return {
    summary: message || "Could not delete this workspace.",
    guidance: null,
    canForce: true,
  }
}
