// Access-link parsing for the Add-remote-server form: a pasted `orca://pair?…` link must be
// decoded, classified, and refused when it points at loopback or at an unusable destination.
import { describe, expect, it } from 'vitest'
import { parseHostAccessLink } from './remote-pairing-address'

function link(offer: Record<string, unknown>): string {
  return `orca://pair?code=${Buffer.from(JSON.stringify(offer)).toString('base64url')}`
}

describe('parseHostAccessLink', () => {
  it('decodes a runtime offer and reports its endpoint', () => {
    const result = parseHostAccessLink(
      link({ v: 2, endpoint: 'wss://100.64.0.2:6767', deviceToken: 'token' })
    )

    expect(result).toEqual({
      ok: true,
      value: {
        pairing: { v: 2, endpoint: 'wss://100.64.0.2:6767', deviceToken: 'token', scope: undefined },
        displayEndpoint: '100.64.0.2:6767',
        endpointKind: 'tailscale'
      }
    })
  })

  it('classifies loopback, LAN, public and custom hosts', () => {
    const kindOf = (endpoint: string) => {
      const result = parseHostAccessLink(link({ v: 2, endpoint, deviceToken: 't' }))
      return result.ok ? result.value.endpointKind : result.kind
    }

    expect(kindOf('ws://127.0.0.1:1')).toBe('loopback')
    expect(kindOf('ws://localhost:1')).toBe('loopback')
    expect(kindOf('ws://192.168.1.4:1')).toBe('lan')
    expect(kindOf('wss://example.com:443')).toBe('public')
    expect(kindOf('wss://workstation:443')).toBe('custom')
  })

  it('refuses a mobile-only link', () => {
    expect(
      parseHostAccessLink(link({ v: 2, endpoint: 'wss://a.example', deviceToken: 't', scope: 'mobile' }))
    ).toEqual({ ok: false, kind: 'mobile-only' })
  })

  it('refuses a non-ws destination and a wildcard bind address', () => {
    expect(
      parseHostAccessLink(link({ v: 2, endpoint: 'https://a.example', deviceToken: 't' }))
    ).toEqual({ ok: false, kind: 'unsupported-destination' })
    expect(parseHostAccessLink(link({ v: 2, endpoint: 'ws://0.0.0.0:1', deviceToken: 't' }))).toEqual(
      { ok: false, kind: 'non-connectable-destination' }
    )
  })

  it('refuses undecodable input', () => {
    expect(parseHostAccessLink('not-a-link')).toEqual({ ok: false, kind: 'invalid-input' })
    expect(parseHostAccessLink('orca://pair?code=%%%')).toEqual({ ok: false, kind: 'invalid-input' })
    expect(
      parseHostAccessLink(`orca://pair?code=${Buffer.from('{"v":2}').toString('base64url')}`)
    ).toEqual({ ok: false, kind: 'invalid-input' })
  })

  it('accepts a bare pairing code as well as the full link', () => {
    const code = Buffer.from(
      JSON.stringify({ v: 2, endpoint: 'wss://a.example:443', deviceToken: 't' })
    ).toString('base64url')

    expect(parseHostAccessLink(code).ok).toBe(true)
  })
})
