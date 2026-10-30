// `hydra:refresh-projects` is fired from many places; a caller that must roll back
// on a failed authoritative scan needs an answer, not fire-and-forget.
export const PROJECTS_REFRESH_EVENT = 'hydra:refresh-projects'

type RefreshDetail = { resolve: (ok: boolean) => void }

export function requestProjectsRefresh(timeoutMs = 15_000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean): void => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(ok)
    }
    const timer = window.setTimeout(() => finish(false), timeoutMs)
    window.dispatchEvent(
      new CustomEvent<RefreshDetail>(PROJECTS_REFRESH_EVENT, { detail: { resolve: finish } })
    )
  })
}
