// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/DeleteWorktreeDialogDescription.tsx
// The confirmation sentence names the target the user chose (and, for a lineage
// delete, the descendants that go with it). The target keeps the copy module's
// highlight class so a long path still breaks instead of widening the dialog.
export function DeleteWorktreeDialogDescription({
  targetClassName,
  targetLabel,
  canDeleteAllLineage,
  childTargetLabel,
  descriptionSuffix,
}: {
  targetClassName: string
  targetLabel: string | undefined
  canDeleteAllLineage: boolean
  childTargetLabel: string
  descriptionSuffix: string
}): React.JSX.Element {
  return (
    <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">
      Remove <span className={targetClassName}>{targetLabel}</span>
      {canDeleteAllLineage ? (
        <>
          {' '}
          and <span className="font-medium text-foreground">{childTargetLabel}</span>{' '}
          {descriptionSuffix}
        </>
      ) : (
        <> {descriptionSuffix}</>
      )}
    </p>
  )
}
