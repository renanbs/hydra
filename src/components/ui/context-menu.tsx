// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/ui/context-menu.tsx — trimmed to the parts the sidebar
// nav uses (hide-from-sidebar menu).
import * as React from 'react'
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function ContextMenu({ ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" modal={false} {...props} />
}

function ContextMenuTrigger({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
}

function ContextMenuContent({
  className,
  style,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        className={cn(
          'z-[70] max-h-(--radix-context-menu-content-available-height) min-w-[11rem] origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto scrollbar-sleek rounded-[11px] border border-black/14 bg-popover p-[4px] text-popover-foreground shadow-[0_12px_28px_rgba(0,0,0,0.22)] dark:border-white/14 dark:shadow-[0_16px_34px_rgba(0,0,0,0.40)]',
          className
        )}
        // Why: WebKitGTK titlebar drag regions capture clicks at the OS level;
        // no-drag keeps a menu overlapping the chrome clickable.
        style={{ ...style, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md px-2 py-[4px] text-[12px] leading-[17px] font-[450] outline-hidden select-none focus:bg-black/8 dark:focus:bg-white/14 focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn('my-[3px] h-px bg-border/60', className)}
      {...props}
    />
  )
}

export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator }
