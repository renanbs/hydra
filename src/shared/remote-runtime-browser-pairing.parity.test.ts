// Parity guard for the browser E2EE pairing transport
// (`remote-runtime-browser-pairing.ts`): the client speaks Orca's handshake —
// hello → ready → encrypted auth → encrypted status.get — and classifies every
// failure mode without touching the network. The fake socket is the remote.
import { describe, expect, it, beforeEach } from 'vitest'
import nacl from 'tweetnacl'
import {
  verifyRemotePairing,
  REMOTE_RUNTIME_CONNECT_FAILURE_PHRASE
} from './remote-runtime-browser-pairing'

class FakeSocket {
  static instances: FakeSocket[] = []
  sent: unknown[] = []
  private listeners = new Map<string, ((event: { data?: unknown }) => void)[]>()
  constructor(public url: string) {
    FakeSocket.instances.push(this)
  }
  addEventListener(type: string, listener: (event: { data?: unknown }) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }
  send(data: unknown): void {
    this.sent.push(data)
  }
  close(): void {}
  emitOpen(): void {
    for (const listener of this.listeners.get('open') ?? []) {
      listener({})
    }
  }
  emitMessage(data: string): void {
    for (const listener of this.listeners.get('message') ?? []) {
      listener({ data })
    }
  }
  emitClose(): void {
    for (const listener of this.listeners.get('close') ?? []) {
      listener({})
    }
  }
}

Object.defineProperty(globalThis, 'WebSocket', {
  configurable: true,
  writable: true,
  value: FakeSocket
})

const REMOTE_KEYS = nacl.box.keyPair()
const REMOTE_PUB_B64 = Buffer.from(REMOTE_KEYS.publicKey).toString('base64')
const OFFER = {
  v: 2,
  endpoint: 'wss://100.64.0.2:6767',
  deviceToken: 'token',
  publicKeyB64: REMOTE_PUB_B64
}

function toBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'))
}
function toB64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}
/** The fake remote: opens boxes with the remote key, exactly like an Orca host. */
function remoteBox(text: string, clientPubB64: string): string {
  const shared = new Uint8Array(
    nacl.box.before(toBytes(clientPubB64), new Uint8Array(REMOTE_KEYS.secretKey))
  )
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const cipher = nacl.box.after(new Uint8Array(Buffer.from(text)), nonce, shared)
  const bundle = new Uint8Array(nonce.length + cipher.length)
  bundle.set(nonce)
  bundle.set(cipher, nonce.length)
  return toB64(bundle)
}

beforeEach(() => {
  FakeSocket.instances = []
})

describe('remote-runtime-browser-pairing', () => {
  it('completes the handshake and returns the remote status', async () => {
    const done = verifyRemotePairing(OFFER)
    await new Promise((resolve) => setTimeout(resolve, 10))
    const ws = FakeSocket.instances[0]!
    ws.emitOpen()

    // Hello carries the client's fresh public key in plaintext.
    const hello = JSON.parse(ws.sent[0] as string) as { type?: unknown; publicKeyB64?: unknown }
    if (typeof hello.publicKeyB64 !== 'string') {
      throw new Error('fake remote expected a hello frame carrying publicKeyB64')
    }
    expect(hello.type).toBe('e2ee_hello')
    expect(typeof hello.publicKeyB64).toBe('string')

    ws.emitMessage(JSON.stringify({ type: 'e2ee_ready' }))
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Auth is NaCl-box-encrypted: no plaintext marker on the wire.
    expect(typeof ws.sent[1]).toBe('string')
    expect(ws.sent[1] as string).not.toContain('e2ee_auth')

    ws.emitMessage(remoteBox(JSON.stringify({ type: 'e2ee_authenticated' }), hello.publicKeyB64))
    await new Promise((resolve) => setTimeout(resolve, 10))

    // status.get request is encrypted too.
    expect(typeof ws.sent[2]).toBe('string')
    expect(ws.sent[2] as string).not.toContain('status.get')

    ws.emitMessage(
      remoteBox(JSON.stringify({ id: 'req-1', result: { runtimeId: 'remote-1' } }), hello.publicKeyB64)
    )
    const result = await done
    expect(result).toEqual({ ok: true, runtimeStatus: { runtimeId: 'remote-1' } })
  })

  it('refuses to open without the host identity key', async () => {
    const result = await verifyRemotePairing({ v: 2, endpoint: 'wss://x', deviceToken: 't' })
    expect(result).toEqual({
      ok: false,
      kind: 'access-link-invalid',
      message: 'This access link carries no host identity key.'
    })
    expect(FakeSocket.instances.length).toBe(0)
  })

  it('reports an unreachable host on socket error', async () => {
    const done = verifyRemotePairing(OFFER)
    await new Promise((resolve) => setTimeout(resolve, 10))
    const ws = FakeSocket.instances[0]!
    for (const listener of (ws as unknown as { listeners: Map<string, ((e: { data?: unknown }) => void)[]> }).listeners.get('error') ?? []) {
      listener({})
    }
    const result = await done
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('host-unreachable')
      expect(result.message).toContain(REMOTE_RUNTIME_CONNECT_FAILURE_PHRASE)
    }
  })

  it('reports a host-identity mismatch on a non-ready frame', async () => {
    const done = verifyRemotePairing(OFFER)
    await new Promise((resolve) => setTimeout(resolve, 10))
    const ws = FakeSocket.instances[0]!
    ws.emitOpen()
    ws.emitMessage(JSON.stringify({ type: 'not-ready' }))
    const result = await done
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('host-identity-mismatch')
    }
  })

  it('reports a dead link on an unauthorized auth answer', async () => {
    const done = verifyRemotePairing(OFFER)
    await new Promise((resolve) => setTimeout(resolve, 10))
    const ws = FakeSocket.instances[0]!
    ws.emitOpen()
    const hello = JSON.parse(ws.sent[0] as string) as { type?: unknown; publicKeyB64?: unknown }
    if (typeof hello.publicKeyB64 !== 'string') {
      throw new Error('fake remote expected a hello frame carrying publicKeyB64')
    }
    ws.emitMessage(JSON.stringify({ type: 'e2ee_ready' }))
    await new Promise((resolve) => setTimeout(resolve, 10))
    ws.emitMessage(
      remoteBox(
        JSON.stringify({ error: { code: 'unauthorized' } }),
        hello.publicKeyB64
      )
    )
    const result = await done
    expect(result).toEqual({
      ok: false,
      kind: 'access-link-invalid',
      message: 'This access link is no longer valid. Generate a new link on the other host.'
    })
  })

  it('never sends a second frame after the remote hangs up', async () => {
    const done = verifyRemotePairing(OFFER)
    await new Promise((resolve) => setTimeout(resolve, 10))
    const ws = FakeSocket.instances[0]!
    ws.emitOpen()
    ws.emitMessage(JSON.stringify({ type: 'e2ee_ready' }))
    ws.emitClose()
    const result = await done
    expect(result).toEqual({
      ok: false,
      kind: 'connection-interrupted',
      message: 'Remote Orca runtime closed the connection.'
    })
    expect(ws.sent.length).toBe(2)
  })
})
