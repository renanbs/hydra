// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeCardAutomationDetailSection.tsx
//
// D04a-045: automation provenance section in the card hover. Checks whether the
// automation (and run) that created the workspace is still available, and
// gates the Open automation / Open run actions on that check.
import React from 'react'
import { CalendarClock, PlayCircle } from 'lucide-react'
import type { AutomationWorkspaceProvenance } from '../../shared/worktree/types'
import {
  WorktreeCardDetailSection,
  WorktreeCardDetailSectionContent
} from './WorktreeCardDetailSection'
import { DetailHeader, MetadataActionIcon } from './worktree-card-detail-controls'
import { translate } from '@/i18n/i18n'
import {
  getAutomationTargetFromHostId,
  listAutomationRunsForTarget,
  listAutomationsForTarget
} from '../automations/automation-host-client'

type WorktreeCardAutomationDetailSectionProps = {
  provenance: Pick<AutomationWorkspaceProvenance, 'automationId' | 'automationNameSnapshot' | 'automationRunId' | 'automationRunTitleSnapshot' | 'hostId'>
  onOpenAutomation?: (event: React.MouseEvent) => void
  onOpenAutomationRun?: (event: React.MouseEvent) => void
}

export type AutomationProvenanceAvailability =
  | { status: 'checking' }
  | { status: 'available'; runAvailable: boolean }
  | { status: 'automation-missing' }
  | { status: 'unavailable' }

export function WorktreeCardAutomationDetailSection({
  provenance,
  onOpenAutomation,
  onOpenAutomationRun
}: WorktreeCardAutomationDetailSectionProps): React.JSX.Element {
  const [availability, setAvailability] =
    React.useState<AutomationProvenanceAvailability>({ status: 'checking' })

  React.useEffect(() => {
    let cancelled = false
    async function resolveAvailability(): Promise<void> {
      setAvailability({ status: 'checking' })
      try {
        // Why not the workspace's host: the automation's host is recorded on the
        // provenance, and an automation can land a workspace somewhere else
        // entirely — substituting one for the other asks the wrong machine.
        const target = getAutomationTargetFromHostId(provenance.hostId)
        const automations = await listAutomationsForTarget(target)
        const automation = automations.find((entry) => entry.id === provenance.automationId)
        if (!automation) {
          if (!cancelled) {
            // With no recorded host this read went to the desktop on no evidence,
            // so a miss here is "could not check", never "removed".
            setAvailability({ status: provenance.hostId ? 'automation-missing' : 'unavailable' })
          }
          return
        }
        const runs = await listAutomationRunsForTarget(target, provenance.automationId)
        if (!cancelled) {
          setAvailability({
            status: 'available',
            runAvailable: runs.some((run) => run.id === provenance.automationRunId)
          })
        }
      } catch {
        if (!cancelled) {
          setAvailability({ status: 'unavailable' })
        }
      }
    }

    void resolveAvailability()
    return () => {
      cancelled = true
    }
  }, [provenance.automationId, provenance.automationRunId, provenance.hostId])

  const canOpenAutomation = availability.status === 'available'
  const canOpenAutomationRun = availability.status === 'available' && availability.runAvailable

  return (
    <WorktreeCardDetailSection>
      <DetailHeader
        icon={<CalendarClock className="size-3 text-muted-foreground" />}
        label={translate('auto.components.sidebar.WorktreeCardMeta.automationHeader', 'Automation')}
        actions={
          <>
            {onOpenAutomation && canOpenAutomation && (
              <MetadataActionIcon
                label={translate(
                  'auto.components.sidebar.WorktreeCardMeta.openAutomation',
                  'Open automation'
                )}
                onClick={onOpenAutomation}
              >
                <CalendarClock className="size-3" />
              </MetadataActionIcon>
            )}
            {onOpenAutomationRun && canOpenAutomationRun && (
              <MetadataActionIcon
                label={translate(
                  'auto.components.sidebar.WorktreeCardMeta.openAutomationRun',
                  'Open run'
                )}
                onClick={onOpenAutomationRun}
              >
                <PlayCircle className="size-3" />
              </MetadataActionIcon>
            )}
          </>
        }
      />
      <WorktreeCardDetailSectionContent className="space-y-1.5">
        <div className="break-words text-[13px] font-semibold leading-snug text-foreground">
          {provenance.automationNameSnapshot}
        </div>
        <div className="break-words text-[11.5px] leading-snug text-muted-foreground">
          {provenance.automationRunTitleSnapshot}
        </div>
        {availability.status === 'checking' ? (
          <div className="text-[11px] leading-snug text-muted-foreground">
            {translate(
              'auto.components.sidebar.WorktreeCardMeta.checkingAutomationAvailability',
              'Checking automation availability...'
            )}
          </div>
        ) : null}
        {availability.status === 'automation-missing' ? (
          <div className="text-[11px] leading-snug text-muted-foreground">
            {translate(
              'auto.components.sidebar.WorktreeCardMeta.automationMissing',
              'Automation no longer available.'
            )}
          </div>
        ) : null}
        {availability.status === 'available' && !availability.runAvailable ? (
          <div className="text-[11px] leading-snug text-muted-foreground">
            {translate(
              'auto.components.sidebar.WorktreeCardMeta.automationRunMissing',
              'Run history no longer available.'
            )}
          </div>
        ) : null}
        {availability.status === 'unavailable' ? (
          <div className="text-[11px] leading-snug text-muted-foreground">
            {translate(
              'auto.components.sidebar.WorktreeCardMeta.automationAvailabilityUnavailable',
              'Automation availability could not be checked.'
            )}
          </div>
        ) : null}
      </WorktreeCardDetailSectionContent>
    </WorktreeCardDetailSection>
  )
}
