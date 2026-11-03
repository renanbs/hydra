// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/local-base-ref-suggestion-toast.tsx
import { toast } from 'sonner'
import type { AppState } from '../../store/types'
import type { LocalBaseRefUpdateSuggestion } from '../../shared/worktree/base-ref-drift-types'
import { translate } from '../../i18n/i18n'

/** Settings section the "keep local base ref up to date" toggle lives in. */
export const KEEP_LOCAL_MAIN_UP_TO_DATE_SECTION_ID = 'git-keep-local-base-ref-up-to-date'

export type SuggestionToastDeps = {
  updateSettings: AppState['updateSettings']
  getSettings: () => AppState['settings']
  openSettingsPage: AppState['openSettingsPage']
  openSettingsTarget: AppState['openSettingsTarget']
}

function toastId(suggestion: LocalBaseRefUpdateSuggestion): string {
  return `local-base-ref-update-suggestion:${suggestion.baseRef}:${suggestion.localBranch}`
}

const inspectSettingsDismissals = new Set<string>()

export function showLocalBaseRefUpdateSuggestionToast(
  suggestion: LocalBaseRefUpdateSuggestion | undefined,
  deps: SuggestionToastDeps
): void {
  if (!suggestion) {
    return
  }

  const commitNoun =
    suggestion.behind === 1
      ? translate('components.sidebar.local-base-ref-suggestion.commit', 'commit')
      : translate('components.sidebar.local-base-ref-suggestion.commits', 'commits')

  const turnOn = (): void => {
    void Promise.resolve(deps.updateSettings({ refreshLocalBaseRefOnWorktreeCreate: true }))
      .then(() => {
        if (deps.getSettings()?.refreshLocalBaseRefOnWorktreeCreate !== true) {
          throw new Error('settings_not_persisted')
        }
        toast.dismiss(toastId(suggestion))
        toast.success(
          translate(
            'components.sidebar.local-base-ref-suggestion.enabled',
            'Keeping local {{branch}} up to date',
            { branch: suggestion.localBranch }
          )
        )
      })
      .catch(() => {
        toast.error(
          translate(
            'components.sidebar.local-base-ref-suggestion.enable-failed',
            'Could not turn on the local base ref refresh'
          ),
          {
            description: translate(
              'components.sidebar.local-base-ref-suggestion.open-settings',
              'Open Settings and try again.'
            )
          }
        )
      })
  }

  const openSetting = (): void => {
    const id = toastId(suggestion)
    deps.openSettingsPage()
    deps.openSettingsTarget({
      pane: 'git',
      repoId: null,
      sectionId: KEEP_LOCAL_MAIN_UP_TO_DATE_SECTION_ID
    })
    // Why: opening Settings is informational, not a decline; Sonner still calls
    // onDismiss for this programmatic close, so skip the one-time decline flag.
    inspectSettingsDismissals.add(id)
    toast.dismiss(id)
  }

  // Why (matches the sticky "Session restore failed" toast): stay on screen until
  // the user acts, so a ~4s auto-expire can't bury this one-time, opt-in nudge.
  toast.info(
    translate(
      'components.sidebar.local-base-ref-suggestion.title',
      'Local {{branch}} is behind {{base}}',
      { branch: suggestion.localBranch, base: suggestion.baseRef }
    ),
    {
      id: toastId(suggestion),
      description: (
        <div className="flex w-full flex-col gap-3">
          <p className="text-sm leading-5 text-popover-foreground/80">
            {translate(
              'components.sidebar.local-base-ref-suggestion.description',
              'Your new worktree is current, but local {{branch}} is {{behind}} {{commits}} behind, so AI diffs may compare to stale history. Change this anytime in',
              { branch: suggestion.localBranch, behind: suggestion.behind, commits: commitNoun }
            )}{' '}
            <button
              type="button"
              onClick={openSetting}
              className="cursor-pointer font-medium text-popover-foreground underline underline-offset-2 hover:text-primary"
            >
              {translate(
                'components.sidebar.local-base-ref-suggestion.settings-link',
                'Settings › Git'
              )}
            </button>
          </p>
          <div className="flex justify-end">
            {/* No explicit Dismiss: the toast is persistent and sonner's close
                (X) already backs the user out and persists the decline. */}
            <button
              type="button"
              onClick={turnOn}
              className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {translate(
                'components.sidebar.local-base-ref-suggestion.keep-up-to-date',
                'Keep {{branch}} up to date',
                { branch: suggestion.localBranch }
              )}
            </button>
          </div>
        </div>
      ),
      duration: Infinity,
      dismissible: true,
      // Fires for the close (X) button and swipe; the in-body buttons handle
      // their own dismissal since they are not sonner's native action controls.
      onDismiss: () => {
        if (inspectSettingsDismissals.delete(toastId(suggestion))) {
          return
        }
        if (deps.getSettings()?.refreshLocalBaseRefOnWorktreeCreate === true) {
          return
        }
        void Promise.resolve(
          deps.updateSettings({ localBaseRefSuggestionDismissed: true })
        ).catch(() => {})
      }
    }
  )
}
