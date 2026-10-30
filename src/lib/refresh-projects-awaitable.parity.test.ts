import { describe, expect, it, vi } from 'vitest'
import { PROJECTS_REFRESH_EVENT, requestProjectsRefresh } from './refresh-projects-awaitable'

describe('requestProjectsRefresh (D10-063)', () => {
  it('resolves with the listener answer', async () => {
    const listener = (event: Event) => {
      ;(event as CustomEvent<{ resolve: (ok: boolean) => void }>).detail.resolve(true)
    }
    window.addEventListener(PROJECTS_REFRESH_EVENT, listener)
    await expect(requestProjectsRefresh()).resolves.toBe(true)
    window.removeEventListener(PROJECTS_REFRESH_EVENT, listener)
  })

  it('resolves false when nothing answers before the timeout', async () => {
    await expect(requestProjectsRefresh(10)).resolves.toBe(false)
  })
})
