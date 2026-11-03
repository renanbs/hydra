// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeCardDetailSection.tsx
import React from 'react'

import { cn } from '../../lib/utils'

/**
 * One hover-card section: a flush heading followed by an inset body.
 *
 * Why the split: section titles stay at the hover card's left edge so stacked
 * metadata remains scannable, and only each section's body takes the left rule.
 */
export function WorktreeCardDetailSection({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>): React.JSX.Element {
  return <section className={cn('space-y-1.5', className)} {...props} />
}

export function WorktreeCardDetailSectionContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn('border-l border-border/70 pl-3', className)} {...props} />
}
