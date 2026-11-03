// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/SidebarSettingsHelpMenu.tsx (help dropdown only;
// Hydra's Settings button lives beside it in SidebarFooter, D01-034).
import React, { useState } from 'react'
import {
  BookOpen,
  CircleHelp,
  ExternalLink,
  Keyboard,
  Loader2,
  MessageSquareText,
  RefreshCw,
  RotateCw,
  ScrollText
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import { lazyWithRetry } from '@/lib/lazy-with-retry'
import { GithubIcon } from '@/components/icons/BrandIcons'
import {
  checkForAppUpdates,
  isAppRestartAvailable,
  isUpdateCheckAvailable,
  openExternalUrl,
  restartApp
} from '@/lib/sidebar-desktop-contracts'
import { getUpdateCheckClickOptions, getUpdateCheckHint } from '@/lib/update-check-click-options'
import type * as SidebarFeedbackDialogModule from './SidebarFeedbackDialog'

const hydrateFeedbackDialog = (): Promise<typeof SidebarFeedbackDialogModule> =>
  import('./SidebarFeedbackDialog')

const SidebarFeedbackDialog = lazyWithRetry(
  () =>
    hydrateFeedbackDialog().then((module) => ({ default: module.SidebarFeedbackDialog })),
  { reloadKey: 'sidebar-feedback-dialog' }
)

// Hydra has no Orca community channels; documentation lives in the repository.
const DOCS_URL = 'https://github.com/renanbs/hydra#readme'
const CHANGELOG_URL = 'https://github.com/renanbs/hydra/releases'
const GITHUB_URL = 'https://github.com/renanbs/hydra'
const NO_UPDATE_CHECK_MODIFIERS = {
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false
}

function ExternalMenuItem({
  label,
  url,
  icon
}: {
  label: string
  url: string
  icon: React.ReactNode
}): React.JSX.Element {
  return (
    <DropdownMenuItem onSelect={() => void openExternalUrl(url).catch(console.error)}>
      {icon}
      {label}
      <ExternalLink className="ml-auto size-3 text-muted-foreground" />
    </DropdownMenuItem>
  )
}

type SidebarSettingsHelpMenuProps = {
  /** Opens Settings on a specific pane (Orca `openSettingsTarget` + page). */
  onOpenSettingsSection: (section: 'shortcuts') => void
}

export function SidebarSettingsHelpMenu({
  onOpenSettingsSection
}: SidebarSettingsHelpMenuProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  // Why sticky: the dialog animates itself closed off `open`, so unmounting on close cuts that short.
  const [feedbackDialogMounted, setFeedbackDialogMounted] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false)
  const updateCheckModifiersRef = React.useRef(NO_UPDATE_CHECK_MODIFIERS)
  const mountedRef = useMountedRef()
  const updateCheckHint = getUpdateCheckHint()
  const updateCheckAvailable = isUpdateCheckAvailable()
  const restartAvailable = isAppRestartAvailable()

  const handleMenuOpenChange = (open: boolean): void => {
    setMenuOpen(open)
    updateCheckModifiersRef.current = NO_UPDATE_CHECK_MODIFIERS
    if (open) {
      // Warm on the precursor: reading the menu and clicking Send Feedback takes
      // hundreds of ms, so the chunk is already in the module map.
      void hydrateFeedbackDialog().catch(() => {})
    }
  }

  const handleOpenFeedback = (): void => {
    setFeedbackDialogMounted(true)
    setFeedbackOpen(true)
  }

  const handleRestart = (): void => {
    if (isRestarting) {
      return
    }
    setIsRestarting(true)
    toast.info(
      translate('auto.components.sidebar.SidebarSettingsHelpMenu.5161eef55d', 'Restarting Hydra…')
    )
    void restartApp().catch((error) => {
      if (mountedRef.current) {
        setIsRestarting(false)
        toast.error(
          translate(
            'auto.components.sidebar.SidebarSettingsHelpMenu.4e8f5710d3',
            "Couldn't restart Hydra."
          ),
          {
            description: error instanceof Error ? error.message : undefined
          }
        )
      }
    })
  }

  const handleCheckForUpdatesPointerDown = (event: React.PointerEvent): void => {
    updateCheckModifiersRef.current = {
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    }
  }

  const handleCheckForUpdates = (): void => {
    const modifiers = updateCheckModifiersRef.current
    updateCheckModifiersRef.current = NO_UPDATE_CHECK_MODIFIERS
    setIsCheckingUpdates(true)
    void checkForAppUpdates(getUpdateCheckClickOptions(modifiers))
      .catch((error) => {
        if (mountedRef.current) {
          toast.error(
            translate(
              'auto.components.sidebar.SidebarSettingsHelpMenu.updateCheckFailed',
              'Update check failed'
            ),
            {
              description: error instanceof Error ? error.message : undefined
            }
          )
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setIsCheckingUpdates(false)
        }
      })
  }

  return (
    <>
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={handleMenuOpenChange}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                type="button"
                aria-label={translate(
                  'auto.components.sidebar.SidebarSettingsHelpMenu.2991a0106c',
                  'Help'
                )}
                aria-expanded={menuOpen}
                className="text-muted-foreground"
              >
                <CircleHelp className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>
            {translate('auto.components.sidebar.SidebarSettingsHelpMenu.2991a0106c', 'Help')}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-52">
          <DropdownMenuItem onSelect={() => onOpenSettingsSection('shortcuts')}>
            <Keyboard className="size-3.5" />
            {translate(
              'auto.components.sidebar.SidebarSettingsHelpMenu.e565171a7c',
              'Keyboard Shortcuts'
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleOpenFeedback}>
            <MessageSquareText className="size-3.5" />
            {translate(
              'auto.components.sidebar.SidebarSettingsHelpMenu.4cf5b868d7',
              'Send Feedback'
            )}
          </DropdownMenuItem>
          {/* Milestones + Onboarding are BLOCKED: Hydra has no setup-guide
              progress probes and no onboarding overlay to open. */}
          <ExternalMenuItem
            label={translate(
              'auto.components.sidebar.SidebarSettingsHelpMenu.cdc87f897e',
              'Docs'
            )}
            url={DOCS_URL}
            icon={<BookOpen className="size-3.5" />}
          />
          <ExternalMenuItem
            label={translate(
              'auto.components.sidebar.SidebarSettingsHelpMenu.5f83d86d92',
              'Changelog'
            )}
            url={CHANGELOG_URL}
            icon={<ScrollText className="size-3.5" />}
          />
          <DropdownMenuSeparator />
          <ExternalMenuItem
            label={translate(
              'auto.components.sidebar.SidebarSettingsHelpMenu.5687ab246a',
              'GitHub'
            )}
            url={GITHUB_URL}
            icon={<GithubIcon className="size-3.5" />}
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isCheckingUpdates}
            onPointerDown={handleCheckForUpdatesPointerDown}
            onSelect={handleCheckForUpdates}
            title={
              updateCheckAvailable
                ? updateCheckHint
                : "Update checks are not available in this build."
            }
          >
            {isCheckingUpdates ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {translate(
              'auto.components.sidebar.SidebarSettingsHelpMenu.29c56f30ee',
              'Check for Updates'
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleRestart}
            disabled={isRestarting}
            title={
              restartAvailable ? undefined : "Application restart is not available in this build."
            }
          >
            <RotateCw className="size-3.5" />
            {translate(
              'auto.components.sidebar.SidebarSettingsHelpMenu.ad3d3ed7f1',
              'Restart Hydra'
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {feedbackDialogMounted ? (
        <React.Suspense fallback={null}>
          <SidebarFeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
        </React.Suspense>
      ) : null}
    </>
  )
}
