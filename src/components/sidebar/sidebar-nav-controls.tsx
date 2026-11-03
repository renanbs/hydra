// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/sidebar-nav-controls.tsx
import React from 'react'
import { EyeOff } from 'lucide-react'
import { ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu'
import { translate } from '@/i18n/i18n'

/** Shared context menu for hiding an entry from the sidebar nav (D01-025). */
export function HideSidebarMenu({ onHide }: { onHide: () => void }): React.JSX.Element {
  return (
    <ContextMenuContent>
      <ContextMenuItem onSelect={onHide}>
        <EyeOff className="size-3.5" />
        {translate('auto.components.sidebar.SidebarNav.d599269755', 'Hide from sidebar')}
      </ContextMenuItem>
    </ContextMenuContent>
  )
}
