// Parity guard for the host-header menu MODEL. Orca decides the host menu's actions in
// a pure function so the rules are testable without rendering the sidebar; this port
// keeps that seam and narrows it to the actions Hydra has a backend for. What it locks
// out: a menu item for a host that cannot execute it (a Reconnect/Manage row with no
// remote-execution subsystem behind it), and a compatibility alarm invented from a
// verdict the registry never called blocked.
import { describe, expect, it } from 'vitest'
import type { RuntimeCompatVerdict } from '../../shared/protocol-compat'
import { buildHostHeaderMenuModel } from './host-header-menu-items'

const BLOCKED_SERVER: RuntimeCompatVerdict = {
  kind: 'blocked',
  reason: 'server-too-old',
  clientProtocolVersion: 4,
  serverProtocolVersion: 1,
  requiredServerProtocolVersion: 4
}

const BLOCKED_CLIENT: RuntimeCompatVerdict = {
  kind: 'blocked',
  reason: 'client-too-old',
  clientProtocolVersion: 2,
  serverProtocolVersion: 4,
  requiredClientProtocolVersion: 3
}

describe('buildHostHeaderMenuModel', () => {
  it('offers Rename + Remove for an SSH host (the only kind with a registry row)', () => {
    const model = buildHostHeaderMenuModel({ kind: 'ssh', health: 'available' })

    expect(model.actions).toEqual(['rename', 'remove'])
    expect(model.blocked).toBeNull()
  })

  it('offers nothing for the local host — there is no registry row to write', () => {
    const model = buildHostHeaderMenuModel({ kind: 'local', health: 'local' })

    expect(model.actions).toEqual([])
    expect(model.blocked).toBeNull()
  })

  it('offers nothing for a runtime host — its removal belongs to the servers pane', () => {
    const model = buildHostHeaderMenuModel({ kind: 'runtime', health: 'available' })

    expect(model.actions).toEqual([])
    expect(model.blocked).toBeNull()
  })

  it('surfaces a block per verdict reason for a blocked host', () => {
    expect(
      buildHostHeaderMenuModel({
        kind: 'runtime',
        health: 'blocked',
        compatibility: BLOCKED_SERVER
      }).blocked
    ).toEqual({ reason: 'server-too-old' })

    expect(
      buildHostHeaderMenuModel({
        kind: 'runtime',
        health: 'blocked',
        compatibility: BLOCKED_CLIENT
      }).blocked
    ).toEqual({ reason: 'client-too-old' })
  })

  it('does not surface a block when the registry health is not blocked', () => {
    const model = buildHostHeaderMenuModel({
      kind: 'ssh',
      health: 'available',
      compatibility: BLOCKED_SERVER
    })

    expect(model.blocked).toBeNull()
  })
})
