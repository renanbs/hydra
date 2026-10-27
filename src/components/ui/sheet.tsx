'use client'

import * as React from 'react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      // Why: same fix as DialogOverlay — a flat bg-black/50 scrim disappears
      // over the dark canvas. A deeper scrim + 2px backdrop blur lifts the
      // canvas behind the sheet so its edge reads clearly.
      className={cn(
        'fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  )
}

const sheetContentVariants = cva(
  // Why: bg-background in dark mode equals the canvas color, and border-border/60
  // is still ~4% white over that canvas. The translucent surface + solid 14%
  // border + dual shadow + 2xl backdrop blur match the dropdown-menu / dialog
  // recipe and give the sheet a clearly visible edge in both light and dark.
  'fixed z-50 flex flex-col gap-0 bg-background/96 text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl outline-none transition ease-in-out dark:bg-[rgba(23,23,23,0.96)] dark:shadow-[0_24px_72px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-300',
  {
    variants: {
      side: {
        right:
          'inset-y-0 right-0 h-full w-3/4 border-l border-black/14 dark:border-white/14 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-[560px]',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r border-black/14 dark:border-white/14 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-[560px]',
        top: 'inset-x-0 top-0 h-auto border-b border-black/14 dark:border-white/14 data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 h-auto border-t border-black/14 dark:border-white/14 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom'
      }
    },
    defaultVariants: {
      side: 'right'
    }
  }
)

function SheetContent({
  className,
  children,
  side = 'right',
  overlayClassName,
  overlayStyle,
  style,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetContentVariants> & {
    overlayClassName?: string
    overlayStyle?: React.CSSProperties
  }) {
  return (
    <SheetPortal>
      <SheetOverlay className={overlayClassName} style={overlayStyle} />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(sheetContentVariants({ side }), className)}
        style={style}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 p-4', className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-base font-semibold text-foreground', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle }
