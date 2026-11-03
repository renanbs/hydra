// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/SidebarNav.tsx
import { BookOpen, CalendarClock, Files, Search, Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { useShortcutKeyComboDetails } from '@/hooks/useShortcutLabel'
import { ShortcutKeyCombo } from '../ShortcutKeyCombo'
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu'
import type { HydraSettings } from '@/shared/settings-types'
import type { HydraProject, WorktreeSession } from './types'
import { AgentDashboardSidebarEntry } from './AgentDashboardSidebarEntry'
import { HideSidebarMenu } from './sidebar-nav-controls'
import { SidebarTaskNavButton } from './SidebarTaskNavButton'
import { SetupGuideSidebarEntry } from './SetupGuideSidebarEntry'
import { useMobileSidebarOnboardingBadge } from './mobile-sidebar-onboarding-badge'
import { useSidebarUiStore } from './sidebar-ui-store'

export function shouldShowMobileButton(settings: Partial<HydraSettings> | null | undefined): boolean {
  return settings?.showMobileButton !== false
}

export function shouldShowAutomationsButton(
  settings: Partial<HydraSettings> | null | undefined
): boolean {
  return settings?.showAutomationsButton !== false
}

export function shouldShowArtifactsButton(
  settings: Partial<HydraSettings> | null | undefined
): boolean {
  return settings?.showArtifactsButton === true
}

export function shouldShowSkillsButton(
  settings: Partial<HydraSettings> | null | undefined
): boolean {
  return settings?.showSkillsButton === true
}

export function shouldShowAgentDashboardButton(
  settings: Partial<HydraSettings> | null | undefined
): boolean {
  return settings?.experimentalAgentDashboardPopout === true
}

type SidebarNavProps = {
  onOpenWorktreePalette?: () => void
  settings: HydraSettings | null
  onUpdateSettings?: (patch: Partial<HydraSettings>) => void
  /** Agent Dashboard entry data; the shell threads its live sessions/projects here. */
  sessions?: readonly WorktreeSession[]
  projects?: readonly HydraProject[]
}

export function SidebarNav({
  onOpenWorktreePalette,
  settings,
  onUpdateSettings,
  sessions = [],
  projects = []
}: SidebarNavProps) {
  // Subscribe this nav to locale changes before using translate().
  useTranslation()
  const worktreePaletteShortcutCombos = useShortcutKeyComboDetails('worktree.palette')
  const activeView = useSidebarUiStore((state) => state.activeView)
  const openAutomationsPage = useSidebarUiStore((state) => state.openAutomationsPage)
  const openMobilePage = useSidebarUiStore((state) => state.openMobilePage)
  const openArtifactsPage = useSidebarUiStore((state) => state.openArtifactsPage)
  const openSkillsPage = useSidebarUiStore((state) => state.openSkillsPage)
  const showAutomationsButton = shouldShowAutomationsButton(settings)
  const showMobileButton = shouldShowMobileButton(settings)
  const showArtifactsButton = shouldShowArtifactsButton(settings)
  const showSkillsButton = shouldShowSkillsButton(settings)
  const showAgentDashboardButton = shouldShowAgentDashboardButton(settings)
  const automationsActive = activeView === 'automations'
  const mobileActive = activeView === 'mobile'
  const artifactsActive = activeView === 'artifacts'
  const skillsActive = activeView === 'skills'
  const mobileOnboardingBadge = useMobileSidebarOnboardingBadge(showMobileButton)

  return (
    <div
      className="flex flex-col gap-0.5 px-2 pt-2 pb-1"
      data-contextual-tour-target="sidebar-navigation"
    >
      <button
        type="button"
        onClick={() => onOpenWorktreePalette?.()}
        aria-label={translate(
          'auto.components.sidebar.SidebarNav.0c3395fd32',
          'Search worktrees and browser tabs'
        )}
        className="group flex w-full items-center gap-2 rounded-md bg-worktree-sidebar-foreground/5 px-2 py-1.5 text-left text-[13px] font-medium tracking-tight text-worktree-sidebar-foreground/60 transition-colors hover:bg-worktree-sidebar-foreground/8"
      >
        <Search className="size-4 shrink-0 text-worktree-sidebar-foreground/30" strokeWidth={1.75} />
        <span className="flex-1">
          {translate('auto.components.sidebar.SidebarNav.80611a8b10', 'Search')}
        </span>
        <span className="pointer-events-none hidden shrink-0 items-center gap-1 group-hover:flex group-focus-within:flex">
          {worktreePaletteShortcutCombos.map((combo) => (
            <ShortcutKeyCombo
              key={combo.keys.join('-')}
              keys={combo.keys}
              doubleTap={combo.doubleTap}
              className="inline-flex gap-0.5"
              keyCapClassName="min-w-4 border-worktree-sidebar-border/80 bg-worktree-sidebar-foreground/8 px-1 py-px text-[9px] text-worktree-sidebar-foreground/55 shadow-none"
              separatorClassName="text-[9px] text-worktree-sidebar-foreground/45"
            />
          ))}
        </span>
      </button>
      <SetupGuideSidebarEntry settings={settings} />
      <SidebarTaskNavButton
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />
      {showAgentDashboardButton ? (
        <AgentDashboardSidebarEntry sessions={sessions} projects={projects} settings={settings} />
      ) : null}
      {showArtifactsButton ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              onClick={openArtifactsPage}
              aria-current={artifactsActive ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
                artifactsActive
                  ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
                  : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
              )}
            >
              <Files
                className={cn(
                  'size-4 shrink-0',
                  !artifactsActive && 'text-worktree-sidebar-foreground/30'
                )}
                strokeWidth={artifactsActive ? 2.25 : 1.75}
              />
              <span className="flex-1">
                {translate('auto.components.sidebar.SidebarNav.artifacts', 'Artifacts')}
              </span>
            </button>
          </ContextMenuTrigger>
          <HideSidebarMenu
            onHide={() => onUpdateSettings?.({ showArtifactsButton: false })}
          />
        </ContextMenu>
      ) : null}
      {showSkillsButton ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              onClick={openSkillsPage}
              aria-current={skillsActive ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
                skillsActive
                  ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
                  : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
              )}
            >
              <BookOpen
                className={cn(
                  'size-4 shrink-0',
                  !skillsActive && 'text-worktree-sidebar-foreground/30'
                )}
                strokeWidth={skillsActive ? 2.25 : 1.75}
              />
              <span className="flex-1">
                {translate('auto.components.sidebar.SidebarNav.skills', 'Skills')}
              </span>
            </button>
          </ContextMenuTrigger>
          <HideSidebarMenu onHide={() => onUpdateSettings?.({ showSkillsButton: false })} />
        </ContextMenu>
      ) : null}
      {showAutomationsButton ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              onClick={openAutomationsPage}
              aria-current={automationsActive ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
                automationsActive
                  ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
                  : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
              )}
            >
              <CalendarClock
                className={cn(
                  'size-4 shrink-0',
                  !automationsActive && 'text-worktree-sidebar-foreground/30'
                )}
                strokeWidth={automationsActive ? 2.25 : 1.75}
              />
              <span className="flex-1">
                {translate('auto.components.sidebar.SidebarNav.f323383e9a', 'Automations')}
              </span>
            </button>
          </ContextMenuTrigger>
          <HideSidebarMenu onHide={() => onUpdateSettings?.({ showAutomationsButton: false })} />
        </ContextMenu>
      ) : null}
      {/* Agent Dashboard entry is BLOCKED: no bucket counts/drawer/popout. */}
      {showMobileButton ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                'group flex w-full items-center rounded-md text-[13px] font-medium tracking-tight transition-colors',
                mobileActive
                  ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
                  : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
              )}
            >
              <button
                type="button"
                onClick={() => {
                  mobileOnboardingBadge.dismiss()
                  openMobilePage()
                }}
                aria-current={mobileActive ? 'page' : undefined}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left"
              >
                <Smartphone
                  className={cn(
                    'size-4 shrink-0',
                    !mobileActive && 'text-worktree-sidebar-foreground/30'
                  )}
                  strokeWidth={mobileActive ? 2.25 : 1.75}
                />
                <span className="min-w-0 flex-1 truncate">
                  {translate('auto.components.sidebar.SidebarNav.1b5c41caee', 'Orca Mobile')}
                </span>
                {mobileOnboardingBadge.visible ? (
                  <span className="shrink-0 rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
                    {translate('auto.components.sidebar.SidebarNav.c86d83b5c3', 'New')}
                  </span>
                ) : null}
              </button>
            </div>
          </ContextMenuTrigger>
          <HideSidebarMenu onHide={() => onUpdateSettings?.({ showMobileButton: false })} />
        </ContextMenu>
      ) : null}
    </div>
  )
}
