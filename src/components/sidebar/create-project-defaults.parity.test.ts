// D02a-015/016/017: path preview + parent summary for the Create Project step.
import { describe, expect, it } from 'vitest'
import {
  formatCreateProjectParentSummary,
  getCreateProjectDefaultParentAutoFill,
  getDefaultCreateProjectParent,
  joinCreateProjectPath
} from './create-project-defaults'

describe('create project defaults (D02a-015/016/017)', () => {
  it('joins POSIX, Windows and root parents with the matching separator', () => {
    expect(joinCreateProjectPath('/home/acme/projects', 'demo')).toBe('/home/acme/projects/demo')
    expect(joinCreateProjectPath('C:\\work\\projects\\', 'demo')).toBe('C:\\work\\projects\\demo')
    expect(joinCreateProjectPath('/', 'demo')).toBe('/demo')
    expect(joinCreateProjectPath('/home/acme', '/demo')).toBe('/home/acme/demo')
  })

  it('resolves ~/orca/projects only from a home directory', () => {
    expect(getDefaultCreateProjectParent('/home/acme')).toBe('/home/acme/orca/projects')
    expect(getDefaultCreateProjectParent('C:\\Users\\acme')).toBe('C:\\Users\\acme\\orca\\projects')
    expect(getDefaultCreateProjectParent('/data')).toBe('/data/orca/projects')
  })

  it('auto-fills a local create parent once and never for a runtime host', () => {
    expect(
      getCreateProjectDefaultParentAutoFill({
        step: 'create',
        createParent: '',
        activeRuntimeEnvironmentId: null,
        defaultParent: '/home/acme/orca/projects',
        createStepAutoFilled: false
      })
    ).toEqual({ parent: '/home/acme/orca/projects' })
    expect(
      getCreateProjectDefaultParentAutoFill({
        step: 'create',
        createParent: '',
        activeRuntimeEnvironmentId: 'env-1',
        defaultParent: '/home/acme/orca/projects',
        createStepAutoFilled: false
      })
    ).toBeNull()
  })

  it('summarizes the parent, including the short home fallback and missing remote folder', () => {
    expect(
      formatCreateProjectParentSummary({
        parent: '/home/acme/orca/projects',
        defaultParent: '/home/acme/orca/projects'
      })
    ).toBe('~/orca/projects')
    expect(
      formatCreateProjectParentSummary({
        parent: '',
        defaultParent: '',
        isRemoteHost: true
      })
    ).toBe('host folder not selected')
    expect(
      formatCreateProjectParentSummary({ parent: '', defaultParent: '' })
    ).toBe('location not selected')
  })
})
