// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/setup-guide/SetupGuideModal.tsx (checklist surface only; Hydra
// does not own the per-step workflow actions yet, so each row shows real progress
// and the step's description instead of an action it cannot perform).
import { useEffect, useMemo, useState, type JSX } from 'react'
import { Check, EyeOff } from 'lucide-react'
import {
  getFirstIncompleteFeatureWallSetupStepId,
  getFeatureWallSetupStepsForSection,
  type FeatureWallSetupStep,
  type FeatureWallSetupStepId
} from '../../shared/feature-wall-setup-steps'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { HydraSettings } from '../../shared/settings-types'
import type { FeatureWallSetupProgress } from './feature-wall-setup-progress'
import { getLocalizedFeatureWallSetupChecklistCopy } from './feature-wall-setup-checklist-localized-copy'
import { SetupGuideProgressRing } from './SetupGuideProgressRing'
import { useSetupGuideProgress } from './use-setup-guide-progress'
import { translate } from '@/i18n/i18n'

type SetupGuideModalProps = {
  open: boolean
  settings: HydraSettings | null
  requestedStepId: FeatureWallSetupStepId | null
  telemetrySource: string
  onOpenChange: (open: boolean) => void
  onHideFromSidebar: () => void
}

function SetupStepRow({
  step,
  done,
  active,
  ordinal,
  onSelect
}: {
  step: FeatureWallSetupStep
  done: boolean
  active: boolean
  ordinal: number
  onSelect: () => void
}): JSX.Element {
  const copy = getLocalizedFeatureWallSetupChecklistCopy(step)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'step' : undefined}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active
          ? 'border-border bg-accent text-accent-foreground'
          : 'border-border bg-background hover:bg-accent'
      )}
    >
      {active ? (
        <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-foreground" />
      ) : null}
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border',
          done
            ? 'border-green-500/45 bg-green-500/10 text-green-600 dark:text-green-300'
            : 'border-border text-muted-foreground'
        )}
      >
        {done ? <Check className="size-3" /> : <span className="text-xs">{ordinal}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-snug text-foreground">
          {copy.name}
        </span>
      </span>
    </button>
  )
}

function SetupSection({
  title,
  steps,
  startOrdinal,
  activeStepId,
  progress,
  onSelectStep
}: {
  title: string
  steps: readonly FeatureWallSetupStep[]
  startOrdinal: number
  activeStepId: FeatureWallSetupStepId | null
  progress: FeatureWallSetupProgress
  onSelectStep: (id: FeatureWallSetupStepId) => void
}): JSX.Element {
  const doneCount = steps.filter((step) => progress.stepDone[step.id]).length
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </h4>
        <span className="font-mono text-xs text-muted-foreground">
          {doneCount}/{steps.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {steps.map((step, index) => (
          <SetupStepRow
            key={step.id}
            step={step}
            done={progress.stepDone[step.id]}
            active={activeStepId === step.id}
            ordinal={startOrdinal + index}
            onSelect={() => onSelectStep(step.id)}
          />
        ))}
      </div>
    </section>
  )
}

export function SetupGuideModal({
  open,
  settings,
  requestedStepId,
  telemetrySource,
  onOpenChange,
  onHideFromSidebar
}: SetupGuideModalProps): JSX.Element {
  const progress = useSetupGuideProgress(settings, true)
  const [userSelectedStep, setUserSelectedStep] = useState(false)
  const [activeStepId, setActiveStepId] = useState<FeatureWallSetupStepId>(() =>
    requestedStepId ?? getFirstIncompleteFeatureWallSetupStepId(progress.stepDone)
  )
  const setupSteps = useMemo(() => getFeatureWallSetupStepsForSection('setup'), [])
  const milestoneSteps = useMemo(() => getFeatureWallSetupStepsForSection('parallel-work'), [])
  const activeStep =
    [...setupSteps, ...milestoneSteps].find((step) => step.id === activeStepId) ?? null
  const activeStepDone = activeStep ? progress.stepDone[activeStep.id] : false

  useEffect(() => {
    if (!open) {
      setUserSelectedStep(false)
      return
    }
    if (requestedStepId === null) {
      return
    }
    setUserSelectedStep(false)
    setActiveStepId(requestedStepId)
  }, [open, requestedStepId])

  useEffect(() => {
    if (!open || userSelectedStep || requestedStepId !== null) {
      return
    }
    setActiveStepId(getFirstIncompleteFeatureWallSetupStepId(progress.stepDone))
  }, [open, progress.stepDone, requestedStepId, userSelectedStep])

  // Why: a requested step can complete while the modal is open (host probes catch
  // up). Follow the checklist forward instead of leaving the user on a done row.
  useEffect(() => {
    if (
      !open ||
      userSelectedStep ||
      requestedStepId === null ||
      activeStep?.id !== requestedStepId ||
      !progress.stepDone[activeStep.id]
    ) {
      return
    }
    const nextUnfinishedCoreStepId = getFirstIncompleteFeatureWallSetupStepId(progress.stepDone)
    if (nextUnfinishedCoreStepId !== activeStep.id) {
      setActiveStepId(nextUnfinishedCoreStepId)
    }
  }, [activeStep, open, progress.stepDone, requestedStepId, userSelectedStep])

  const handleSelectStep = (id: FeatureWallSetupStepId): void => {
    setUserSelectedStep(true)
    setActiveStepId(id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-telemetry-source={telemetrySource}
        className="grid h-[min(680px,calc(100vh-2rem))] w-[min(920px,calc(100vw-2rem))] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 p-0 sm:max-w-none"
        tabIndex={-1}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={translate(
                'auto.components.setup.guide.SetupGuideModal.f3b5ffb2a6',
                'Hide checklist from sidebar'
              )}
              onClick={onHideFromSidebar}
              className="absolute right-10 top-3.5 text-muted-foreground"
            >
              <EyeOff className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>
            {translate(
              'auto.components.setup.guide.SetupGuideModal.28cf59fcb4',
              'This will hide the checklist from the sidebar'
            )}
          </TooltipContent>
        </Tooltip>
        <DialogHeader className="gap-1 border-b border-border px-7 py-4">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg">
              {translate(
                'auto.components.setup.guide.SetupGuideModal.48a9e5ef2d',
                'Getting started'
              )}
            </DialogTitle>
            <SetupGuideProgressRing
              done={progress.coreDoneCount}
              total={progress.coreTotal}
              className="text-green-600 dark:text-green-300"
              sizeClassName="size-5"
            />
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {translate(
              'auto.components.setup.guide.SetupGuideModal.3598a3ca0c',
              'Finish the core workflows that make Orca useful for parallel agent work.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-5 px-7 py-6 md:grid-cols-[minmax(190px,260px)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
          <nav
            aria-label={translate(
              'auto.components.setup.guide.SetupGuideModal.6bb8a6c0c8',
              'Setup checklist'
            )}
            className="scrollbar-sleek min-h-0 max-h-[min(18rem,40vh)] space-y-5 overflow-y-auto pr-1 md:max-h-none"
          >
            <SetupSection
              title={translate(
                'auto.components.feature.wall.FeatureWallSetupChecklist.1a6a7d6c80',
                'Setup'
              )}
              steps={setupSteps}
              startOrdinal={1}
              activeStepId={activeStep?.id ?? null}
              progress={progress}
              onSelectStep={handleSelectStep}
            />
            <SetupSection
              title={translate(
                'auto.components.feature.wall.FeatureWallSetupChecklist.713cc529a5',
                'Milestones'
              )}
              steps={milestoneSteps}
              startOrdinal={setupSteps.length + 1}
              activeStepId={activeStep?.id ?? null}
              progress={progress}
              onSelectStep={handleSelectStep}
            />
          </nav>
          <section
            aria-live="polite"
            className="scrollbar-sleek min-h-0 overflow-y-auto border-t border-border pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0"
          >
            {activeStep ? (
              <div className="flex h-full flex-col gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 text-2xl font-semibold leading-tight text-foreground">
                    {getLocalizedFeatureWallSetupChecklistCopy(activeStep).name}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium',
                      activeStepDone
                        ? 'border-green-500/45 bg-green-500/10 text-green-600 dark:text-green-300'
                        : 'border-border bg-muted/30 text-muted-foreground'
                    )}
                  >
                    {activeStepDone
                      ? translate(
                          'auto.components.feature.wall.FeatureWallSetupChecklist.13294d3405',
                          'Done'
                        )
                      : translate(
                          'auto.components.feature.wall.FeatureWallSetupChecklist.0235b268b2',
                          'Not done yet'
                        )}
                  </span>
                </div>
                <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
                  {getLocalizedFeatureWallSetupChecklistCopy(activeStep).description}
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
