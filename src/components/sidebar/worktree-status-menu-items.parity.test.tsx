import { describe, expect, it, vi } from 'vitest'
import { buildWorktreeStatusMenuItems } from './worktree-status-menu-items'
import { DEFAULT_WORKSPACE_STATUSES } from '../../shared/workspace-status-defaults'

describe('buildWorktreeStatusMenuItems (Orca parity)', () => {
  it('offers exactly the user workspace-status definitions, in order, with their labels', () => {
    const item = buildWorktreeStatusMenuItems({
      workspaceStatuses: DEFAULT_WORKSPACE_STATUSES,
      onAssignStatus: vi.fn(),
    })

    expect(item.children?.map((child) => child.label)).toEqual(
      DEFAULT_WORKSPACE_STATUSES.map((status) => status.label)
    )
  })

  it('assigns the definition id of the clicked item', () => {
    const onAssignStatus = vi.fn()
    const item = buildWorktreeStatusMenuItems({
      workspaceStatuses: DEFAULT_WORKSPACE_STATUSES,
      onAssignStatus,
    })

    item.children?.forEach((child) => child.onClick())
    expect(onAssignStatus.mock.calls.map((call) => call[0])).toEqual(
      DEFAULT_WORKSPACE_STATUSES.map((status) => status.id)
    )
  })

  it('marks the worktree current status as checked, like the Orca radio group', () => {
    const item = buildWorktreeStatusMenuItems({
      workspaceStatuses: DEFAULT_WORKSPACE_STATUSES,
      currentStatus: 'in-review',
      onAssignStatus: vi.fn(),
    })

    expect(item.children?.map((child) => child.checked)).toEqual(
      DEFAULT_WORKSPACE_STATUSES.map((status) => status.id === 'in-review')
    )
  })

  it('never offers agent activity as an assignable status', () => {
    const item = buildWorktreeStatusMenuItems({
      workspaceStatuses: DEFAULT_WORKSPACE_STATUSES,
      onAssignStatus: vi.fn(),
    })
    const labels = (item.children ?? []).map((child) => child.label.toLowerCase())

    for (const agentActivity of ['blocked', 'waiting', 'working', 'idle', 'clear status']) {
      expect(labels).not.toContain(agentActivity)
    }
  })
})

describe("buildWorktreeStatusMenuItems — multi-context label (D04a-054)", () => {
  it("pluralizes the trigger for a multi-selection, like Orca", () => {
    const single = buildWorktreeStatusMenuItems({
      workspaceStatuses: DEFAULT_WORKSPACE_STATUSES,
      onAssignStatus: vi.fn(),
    })
    const multi = buildWorktreeStatusMenuItems({
      workspaceStatuses: DEFAULT_WORKSPACE_STATUSES,
      onAssignStatus: vi.fn(),
      isMultiContext: true,
    })
    expect(single.label).toBe("Move to Status")
    expect(multi.label).toBe("Move Statuses To")
  })
})

describe("buildWorktreeStatusMenuItems — delete guard (D04a-054)", () => {
  it("disables the submenu and every child while the workspace is being deleted", () => {
    const item = buildWorktreeStatusMenuItems({
      workspaceStatuses: DEFAULT_WORKSPACE_STATUSES,
      onAssignStatus: vi.fn(),
      disabled: true,
    })
    expect(item.disabled).toBe(true)
    expect(item.children?.every((child) => child.disabled === true)).toBe(true)
  })
})
