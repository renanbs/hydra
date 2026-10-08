// Why a rename cannot be submitted. The dialog maps each reason to its own message.
export type HostLabelValidationError = 'empty' | 'duplicate'

export type HostLabelValidation =
  | { ok: true; label: string }
  | { ok: false; reason: HostLabelValidationError }

/**
 * The rename dialog writes the label straight into the SSH host registry
 * (`ssh_update_target`), so the label is the host's name everywhere — sidebar host
 * headers, scope pickers, settings rows. A blank one would leave every surface falling
 * back to the raw target id, and a name another host already carries would make the two
 * indistinguishable. Both are refused here; the wording lives in the dialog.
 */
export function validateHostLabel(args: {
  value: string
  currentTargetId: string
  sshTargetLabels: ReadonlyMap<string, string>
}): HostLabelValidation {
  const label = args.value.trim()
  if (!label) {
    return { ok: false, reason: 'empty' }
  }
  const normalized = label.toLowerCase()
  for (const [targetId, existing] of args.sshTargetLabels) {
    if (targetId !== args.currentTargetId && existing.trim().toLowerCase() === normalized) {
      return { ok: false, reason: 'duplicate' }
    }
  }
  return { ok: true, label }
}
