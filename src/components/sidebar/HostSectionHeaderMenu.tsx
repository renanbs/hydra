// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/HostSectionHeaderMenu.tsx`, restricted to the
// entries Hydra has a backend for: Rename (`ssh_update_target`), Remove
// (`ssh_remove_target`), the "Manage host…" deep link into Settings → SSH Hosts, plus the
// compatibility warning the host registry already computes. Connect/Disconnect and runtime
// "Check connection" are deliberately absent — see `host-header-menu-items.ts`.
import { useState } from 'react'
import { AlertTriangle, MoreHorizontal, Pencil, Settings2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import { getSshTargetIdForExecutionHost } from '../../shared/execution-host'
import { describeRuntimeCompatBlock } from '../../shared/protocol-compat'
import { buildHostHeaderMenuModel } from './host-header-menu-items'
import type { HostHeaderRow } from './host-section-rows'
import { HostRemoveDialog } from './HostRemoveDialog'
import { HostRenameDialog } from './HostRenameDialog'

export function HostSectionHeaderMenu({ row }: { row: HostHeaderRow }): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const model = buildHostHeaderMenuModel({
    kind: row.kind,
    health: row.health,
    compatibility: row.compatibility
  })
  const targetId = getSshTargetIdForExecutionHost(row.hostId)
  // A rename/remove with no registry id would write nothing, so only the warning is
  // left to show; with no warning at all there is nothing to open and no trigger.
  const actions = targetId ? model.actions : []
  if (actions.length === 0 && model.blocked === null) {
    return null
  }

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {/* Why: the header row toggles collapse on click/Enter, so the trigger must not
            let either reach the row — otherwise opening the menu folds the section. */}
        <button
          type="button"
          aria-label={translate(
            'auto.components.sidebar.HostSectionHeaderMenu.4f2c8a9b10',
            'Host actions for {{value0}}',
            { value0: row.label }
          )}
          title={translate('auto.components.sidebar.HostSectionHeaderMenu.6b7c8d9e10', 'Host actions')}
          className={cn(
            'size-5 shrink-0 cursor-pointer rounded-md text-muted-foreground transition-opacity',
            'hover:bg-accent/70 hover:text-foreground',
            'can-hover:opacity-0 focus-visible:opacity-100',
            'group-hover/host-header:opacity-100 data-[state=open]:opacity-100'
          )}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-56">
        {model.blocked ? (
          <>
            {/* Why: a warning, not an action — the update deep link lives with the
                settings pane, so the full explanation rides the tooltip. */}
            <div
              data-host-header-menu-blocked=""
              title={row.compatibility ? describeRuntimeCompatBlock(row.compatibility) : undefined}
              className="flex items-center gap-2 px-2 py-[4px] text-[12px] leading-[17px] font-[450] text-destructive"
            >
              <AlertTriangle className="size-3.5 shrink-0" />
              {model.blocked.reason === 'server-too-old'
                ? translate(
                    'auto.components.sidebar.HostSectionHeaderMenu.5b8b4b6a01',
                    'Update server required'
                  )
                : translate(
                    'auto.components.sidebar.HostSectionHeaderMenu.9b3c1d2e44',
                    'Update client required'
                  )}
            </div>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuLabel className="truncate">{row.label}</DropdownMenuLabel>
        {actions.includes('rename') ? (
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Pencil className="size-3.5" />
            {translate('auto.components.sidebar.HostSectionHeaderMenu.8d1e2f3a4b', 'Rename…')}
          </DropdownMenuItem>
        ) : null}
        {actions.includes('manage') ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                // Why: the settings modal lives in App, far above this menu. This is the
                // same event bus App's other deep links (command palette, new group) use,
                // so Settings still opens through its one opening path — this only names
                // the pane it should land on.
                window.dispatchEvent(
                  new CustomEvent('hydra:open-settings', { detail: { section: 'ssh' } })
                )
              }}
            >
              <Settings2 className="size-3.5" />
              {translate('auto.components.sidebar.HostSectionHeaderMenu.3c4d5e6f7a', 'Manage host…')}
            </DropdownMenuItem>
          </>
        ) : null}
        {actions.includes('remove') ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setRemoveOpen(true)}>
              <Trash2 className="size-3.5" />
              {translate('auto.components.sidebar.HostSectionHeaderMenu.6e7f8a9b0c', 'Remove host…')}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
      {targetId !== null ? (
        <>
          <HostRenameDialog
            open={renameOpen}
            onOpenChange={setRenameOpen}
            targetId={targetId}
            currentLabel={row.label}
          />
          <HostRemoveDialog
            open={removeOpen}
            onOpenChange={setRemoveOpen}
            targetId={targetId}
            label={row.label}
          />
        </>
      ) : null}
    </DropdownMenu>
  )
}
