// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/project-header-action-selector-lockstep.test.ts
//
// D15a-009: both header kinds share `ProjectHeaderActions` markup, so both
// predicates must share the same action selector. If one drifts, dragging from
// the overlay in the other tier starts a header reorder.
import { describe, expect, it } from 'vitest'
import {
  isProjectHeaderDragHandleTarget,
  isRepoHeaderActionTarget,
  REPO_HEADER_ACTION_SELECTOR
} from './project-header-drag-contract'
import {
  isProjectGroupHeaderActionTarget,
  isProjectGroupHeaderDragHandleTarget
} from './project-group-header-drag-contract'

describe('project header action selectors (D15a-009)', () => {
  it('includes the actions overlay for both repo and group helpers', () => {
    expect(REPO_HEADER_ACTION_SELECTOR).toContain('[data-repo-header-actions]')

    const header = document.createElement('div')
    const actions = document.createElement('div')
    actions.setAttribute('data-repo-header-actions', '')
    header.append(actions)
    document.body.append(header)

    expect(isRepoHeaderActionTarget(actions, header)).toBe(true)
    expect(isProjectGroupHeaderActionTarget(actions, header)).toBe(true)

    header.remove()
  })

  it('treats nested action controls as actions, including svg targets', () => {
    const header = document.createElement('div')
    const button = document.createElement('button')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    button.append(svg)
    header.append(button)
    document.body.append(header)

    expect(isRepoHeaderActionTarget(svg, header)).toBe(true)
    expect(isProjectGroupHeaderActionTarget(svg, header)).toBe(true)

    header.remove()
  })

  it('only arms a drag from the tier-specific handle', () => {
    const header = document.createElement('div')
    const repoHandle = document.createElement('div')
    repoHandle.setAttribute('data-repo-header-drag-handle', '')
    const groupHandle = document.createElement('div')
    groupHandle.setAttribute('data-project-group-header-drag-handle', '')
    header.append(repoHandle, groupHandle)
    document.body.append(header)

    expect(isProjectHeaderDragHandleTarget(repoHandle, header)).toBe(true)
    expect(isProjectHeaderDragHandleTarget(groupHandle, header)).toBe(false)
    expect(isProjectGroupHeaderDragHandleTarget(groupHandle, header)).toBe(true)
    expect(isProjectGroupHeaderDragHandleTarget(repoHandle, header)).toBe(false)

    header.remove()
  })

  it('ignores targets outside the header', () => {
    const header = document.createElement('div')
    const outside = document.createElement('button')
    document.body.append(header, outside)

    expect(isRepoHeaderActionTarget(outside, header)).toBe(false)
    expect(isProjectGroupHeaderActionTarget(outside, header)).toBe(false)
    expect(isProjectHeaderDragHandleTarget(outside, header)).toBe(false)
    expect(isProjectGroupHeaderDragHandleTarget(outside, header)).toBe(false)

    header.remove()
    outside.remove()
  })
})
