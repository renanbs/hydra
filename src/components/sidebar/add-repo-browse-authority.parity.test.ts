// D02a-007: browse authority follows the selected host kind.
import { describe, expect, it, vi } from 'vitest'
import { routeAddRepoBrowse } from './add-repo-browse-authority'

function actions() {
  return {
    browseLocal: vi.fn(),
    browseRuntime: vi.fn(),
    browseSsh: vi.fn()
  }
}

describe('routeAddRepoBrowse (D02a-007)', () => {
  it('uses the native local picker for the local host', () => {
    const a = actions()
    routeAddRepoBrowse({ kind: 'local', id: 'local' }, a)
    expect(a.browseLocal).toHaveBeenCalledTimes(1)
    expect(a.browseRuntime).not.toHaveBeenCalled()
    expect(a.browseSsh).not.toHaveBeenCalled()
  })

  it('routes a runtime host to the server-path step', () => {
    const a = actions()
    routeAddRepoBrowse({ kind: 'runtime', id: 'runtime:env', environmentId: 'env' }, a)
    expect(a.browseRuntime).toHaveBeenCalledTimes(1)
    expect(a.browseLocal).not.toHaveBeenCalled()
  })

  it('routes an SSH host to remote browsing with its target id', () => {
    const a = actions()
    routeAddRepoBrowse({ kind: 'ssh', id: 'ssh:host-1', targetId: 'host-1' }, a)
    expect(a.browseSsh).toHaveBeenCalledWith('host-1')
    expect(a.browseLocal).not.toHaveBeenCalled()
  })

  it('does nothing without a resolved host', () => {
    const a = actions()
    routeAddRepoBrowse(null, a)
    expect(a.browseLocal).not.toHaveBeenCalled()
    expect(a.browseRuntime).not.toHaveBeenCalled()
    expect(a.browseSsh).not.toHaveBeenCalled()
  })
})
