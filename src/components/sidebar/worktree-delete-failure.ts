// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca's delete-failure guidance: Git's raw stderr is not a user-facing
// message. The dialog and the recovery toast need a short summary plus the concrete
// recovery step (unlock, force, fix permissions).
export type WorktreeDeletePtyStop = 'proven-live' | 'unconfirmed' | null

export type WorktreeDeleteFailure = {
  summary: string
  guidance: string | null
  /** Force Delete can plausibly recover; permission failures need a human first. */
  canForce: boolean
  /**
   * Orca separates a PTY stop it watched stay alive from one it could not confirm:
   * waiving "still running" and waiving "could not check" are different decisions.
   */
  ptyStop: WorktreeDeletePtyStop
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
      ptyStop: null,
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
      ptyStop: null,
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
      ptyStop: null,
    }
  }

  if (lower.includes("permission denied") || lower.includes("operation not permitted")) {
    return {
      summary: "The filesystem refused to remove this workspace.",
      guidance: "Check the folder permissions and any process holding its files open.",
      canForce: false,
      ptyStop: null,
    }
  }

  if (lower.includes("still running") || lower.includes("active session") || lower.includes("pty")) {
    // Why: "we watched it stay alive" and "we could not confirm" lead to different
    // copy — a user waiving an observation made a different decision than one
    // waiving a missing proof.
    return lower.includes("still live:")
      ? {
          summary: "A session in this workspace is still running.",
          guidance: "Force Delete stops it and removes the workspace.",
          canForce: true,
          ptyStop: 'proven-live',
        }
      : {
          summary: "A session in this workspace could not be confirmed stopped.",
          guidance: "Close its terminals and agents, then try again.",
          canForce: true,
          ptyStop: 'unconfirmed',
        }
  }

  return {
    summary: message || "Could not delete this workspace.",
    guidance: null,
    canForce: true,
    ptyStop: null,
  }
}
