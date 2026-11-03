// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/RemoteFileBrowserBreadcrumbs.tsx
import { Fragment, useCallback } from 'react'
import { ArrowUp, ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { FilesystemPathFlavor } from '../../shared/filesystem-entry-types'
import { driveBreadcrumbPath, splitBrowsePath } from './remote-file-browser-drive-paths'

type RemoteFileBrowserBreadcrumbsProps = {
  resolvedPath: string
  pathFlavor: FilesystemPathFlavor
  loading: boolean
  navigate: (dirPath: string) => void
  navigateUp: () => void
}

/** Up/Home controls plus one clickable segment per directory, windows drives included. */
export function RemoteFileBrowserBreadcrumbs({
  resolvedPath,
  pathFlavor,
  loading,
  navigate,
  navigateUp
}: RemoteFileBrowserBreadcrumbsProps): React.JSX.Element {
  // Preserve the separator shape when rebuilding drive breadcrumbs.
  const browseParts = splitBrowsePath(resolvedPath, pathFlavor)
  const breadcrumbPathTo = useCallback(
    (segmentIndex: number): string =>
      browseParts.kind === 'drive'
        ? driveBreadcrumbPath(browseParts.driveRoot, browseParts.segments, segmentIndex)
        : `/${browseParts.segments.slice(0, segmentIndex + 1).join('/')}`,
    [browseParts]
  )

  return (
    <div className="flex min-h-[28px] items-center gap-0.5 overflow-x-auto scrollbar-none">
      <button
        type="button"
        onClick={navigateUp}
        disabled={resolvedPath === '/' || loading}
        aria-label={translate('auto.components.sidebar.RemoteFileBrowser.up', 'Parent folder')}
        className="shrink-0 cursor-pointer rounded p-1 transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-30"
      >
        <ArrowUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => navigate('~')}
        disabled={loading}
        aria-label={translate('auto.components.sidebar.RemoteFileBrowser.home', 'Home folder')}
        className="shrink-0 cursor-pointer rounded p-1 transition-colors hover:bg-accent"
      >
        <Home className="size-3.5" />
      </button>
      <div className="ml-1 flex min-w-0 items-center gap-0 text-[11px] text-muted-foreground">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="shrink-0 cursor-pointer px-0.5 transition-colors hover:text-foreground"
        >
          /
        </button>
        {browseParts.kind === 'drive' ? (
          <>
            <ChevronRight className="size-2.5 shrink-0 text-muted-foreground/50" />
            <button
              type="button"
              onClick={() => navigate(browseParts.driveRoot)}
              className={cn(
                'max-w-[120px] cursor-pointer truncate px-0.5 transition-colors hover:text-foreground',
                browseParts.segments.length === 0 && 'font-medium text-foreground'
              )}
            >
              {browseParts.driveRoot.slice(0, 2)}
            </button>
          </>
        ) : null}
        {browseParts.segments.map((segment, index) => (
          <Fragment key={breadcrumbPathTo(index)}>
            <ChevronRight className="size-2.5 shrink-0 text-muted-foreground/50" />
            <button
              type="button"
              onClick={() => navigate(breadcrumbPathTo(index))}
              className={cn(
                'max-w-[120px] cursor-pointer truncate px-0.5 transition-colors hover:text-foreground',
                index === browseParts.segments.length - 1 && 'font-medium text-foreground'
              )}
            >
              {segment}
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
