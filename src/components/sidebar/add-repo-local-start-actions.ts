// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/add-repo-local-start-actions.ts
//
// D02a-006: start-screen actions. Browse is the primary entry; the secondary
// rows put "Project on SSH host" first when the client already has SSH targets
// (the remote-first ordering Orca uses for an SSH-likely install).
import type { ComponentType } from 'react'
import { FolderOpen, Globe, Monitor, Plus } from 'lucide-react'

export type AddRepoStartActionKind = 'browse' | 'clone' | 'remote' | 'create'

export type AddRepoStartAction = {
  kind: AddRepoStartActionKind
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  disabled?: boolean
  onClick: () => void
}

export function getAddRepoLocalStartActions({
  isSshLikely,
  onBrowse,
  onOpenCloneStep,
  onOpenRemoteStep,
  onOpenCreateStep,
  showRemoteAction = true,
  canCreateProject = true,
  browseHostKind = 'local'
}: {
  isSshLikely: boolean
  onBrowse: () => void
  onOpenCloneStep: () => void
  onOpenRemoteStep: () => void
  onOpenCreateStep: () => void
  showRemoteAction?: boolean
  canCreateProject?: boolean
  browseHostKind?: 'local' | 'ssh' | 'runtime'
}): {
  primaryAction: AddRepoStartAction
  secondaryActions: AddRepoStartAction[]
} {
  const primaryAction: AddRepoStartAction = {
    kind: 'browse',
    icon: FolderOpen,
    title: browseHostKind === 'ssh' ? 'Open project on SSH host' : 'Browse folder',
    description:
      browseHostKind === 'ssh'
        ? 'Existing Git repository or folder on this SSH host'
        : browseHostKind === 'runtime'
          ? 'Existing Git repository or folder on this host'
          : 'Local project, Git repo, or folder with many repos',
    onClick: onBrowse
  }

  const remote: AddRepoStartAction = {
    kind: 'remote',
    icon: Monitor,
    title: 'Project on SSH host',
    description: 'Open a project folder from an SSH host',
    onClick: onOpenRemoteStep
  }
  const clone: AddRepoStartAction = {
    kind: 'clone',
    icon: Globe,
    title: 'Clone from URL',
    description: 'Clone a remote Git repository',
    onClick: onOpenCloneStep
  }
  const create: AddRepoStartAction = {
    kind: 'create',
    icon: Plus,
    title: 'Create new project',
    description: canCreateProject ? 'Start from an empty folder' : 'Not available for SSH hosts yet',
    disabled: !canCreateProject,
    onClick: onOpenCreateStep
  }

  const secondaryActions = showRemoteAction
    ? isSshLikely
      ? [remote, clone, create]
      : [clone, remote, create]
    : [clone, create]

  return { primaryAction, secondaryActions }
}
