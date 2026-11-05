// Orca remote-runtime E2EE pair over a browser WebSocket.
//
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Sources: shared/e2ee-crypto.ts, shared/remote-runtime-request-socket.ts,
// shared/remote-runtime-request-response-router.ts (single-request path),
// shared/remote-runtime-client-handshake.ts, shared/remote-runtime-client-error.ts,
// shared/remote-runtime-request-frames.ts (ready-frame parse), shared/remote-runtime-connect-bound.ts.
// Node-only pieces (ws options, Buffer, timers) are re-expressed with browser APIs.
//
// The pairing handshake, verbatim:
//  1. open `wss://…` from the pasted access link
//  2. send `{"type":"e2ee_hello","publicKeyB64":"…"}`
//  3. wait for plaintext `{"type":"e2ee_ready"}`
//  4. send NaCl-box-encrypted `{"type":"e2ee_auth","deviceToken":"…","clientCapabilities":[…]}`
//  5. wait for encrypted `{"type":"e2ee_authenticated"}`
//  6. send the encrypted JSON-RPC request, resolve with the decrypted response
import nacl from 'tweetnacl'
import { parseHostAccessLink } from './remote-pairing-address'
import type { PairingOffer } from './pairing'

export class RemoteRuntimeClientError extends Error {
  readonly code: string
  readonly pairingStage?: 'connect' | 'host-identity' | 'access-grant' | 'runtime'
  readonly closeCode?: number

  constructor(
    code: string,
    message: string,
    details?: {
      pairingStage?: 'connect' | 'host-identity' | 'access-grant' | 'runtime'
      closeCode?: number
    }
  ) {
    super(message)
    this.name = 'RemoteRuntimeClientError'
    this.code = code
    this.pairingStage = details?.pairingStage
    this.closeCode = details?.closeCode
  }
}

const MAX_FRAME_BYTES = 8 * 1024 * 1024 + 64
export const REMOTE_RUNTIME_CONNECT_TIMEOUT_MS = 12_000
export const REMOTE_RUNTIME_CONNECT_FAILURE_PHRASE = 'Could not connect to the remote Orca runtime'

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function publicKeyFromBase64(b64: string): Uint8Array {
  const key = base64ToBytes(b64)
  if (key.length !== 32) {
    throw new Error(`Invalid public key: expected 32 bytes, got ${key.length}`)
  }
  return key
}

function encryptBytes(plaintext: Uint8Array, sharedKey: Uint8Array): Uint8Array {
  const message = new Uint8Array(plaintext)
  const key = new Uint8Array(sharedKey)
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const ciphertext = nacl.box.after(message, nonce, key)
  const bundle = new Uint8Array(nonce.length + ciphertext.length)
  bundle.set(nonce)
  bundle.set(ciphertext, nonce.length)
  return bundle
}

function encryptText(plaintext: string, sharedKey: Uint8Array): string {
  return bytesToBase64(encryptBytes(new TextEncoder().encode(plaintext), sharedKey))
}

function decryptText(frame: string, sharedKeyInput: Uint8Array): string | null {
  const sharedKey = new Uint8Array(sharedKeyInput)
  let bundle: Uint8Array
  try {
    bundle = base64ToBytes(frame)
  } catch {
    return null
  }
  const nonce = bundle.slice(0, nacl.box.nonceLength)
  const ciphertext = bundle.slice(nacl.box.nonceLength)
  const plaintext = nacl.box.open.after(ciphertext, nonce, sharedKey)
  return plaintext ? new TextDecoder().decode(plaintext) : null
}

function classifyReadyFrame(frame: string): 'ready' | 'invalid' | 'unexpected' {
  let ready: unknown
  try {
    ready = JSON.parse(frame)
  } catch {
    return 'invalid'
  }
  return typeof ready === 'object' &&
    ready !== null &&
    (ready as { type?: unknown }).type === 'e2ee_ready'
    ? 'ready'
    : 'unexpected'
}

function parseAuthenticatedFrame(plaintext: string): 'authenticated' | 'rejected' | 'invalid' {
  let value: unknown
  try {
    value = JSON.parse(plaintext)
  } catch {
    return 'invalid'
  }
  if (typeof value !== 'object' || value === null) {
    return 'invalid'
  }
  const record = value as { type?: unknown; error?: { code?: unknown } }
  if (record.type === 'e2ee_authenticated') {
    return 'authenticated'
  }
  return record.error?.code === 'unauthorized' ? 'rejected' : 'invalid'
}

export type RemotePairingVerifyResult =
  | { ok: true; runtimeStatus: Record<string, unknown> }
  | { ok: false; kind: string; message: string }

export type RemoteRuntimeRpcResult =
  | { ok: true; result: unknown }
  | { ok: false; kind: string; message: string }

/**
 * Verify a pairing offer against the remote Orca runtime over a browser
 * WebSocket: hello → ready → encrypted auth → encrypted `status.get`.
 * Resolves with the remote `status.get` result for the caller to validate.
 */
export function verifyRemotePairing(
  offer: PairingOffer,
  clientCapabilities: readonly string[] = [],
  timeoutMs = 15_000
): Promise<RemotePairingVerifyResult> {
  const { promise, resolve } = Promise.withResolvers<RemotePairingVerifyResult>()
  let settled = false
  let socket: WebSocket | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  const finish = (result: RemotePairingVerifyResult): void => {
    if (settled) {
      return
    }
    settled = true
    clearTimeout(timer)
    try {
      socket?.close()
    } catch {
      // ignore best-effort close
    }
    resolve(result)
  }
  const fail = (kind: string, message: string): void => finish({ ok: false, kind, message })

  const keyPair = nacl.box.keyPair()
  if (!offer.publicKeyB64) {
    fail('access-link-invalid', 'This access link carries no host identity key.')
    return promise
  }
  let sharedKey: Uint8Array
  try {
    sharedKey = nacl.box.before(publicKeyFromBase64(offer.publicKeyB64), keyPair.secretKey)
  } catch (error) {
    fail(
      'access-link-invalid',
      error instanceof Error ? error.message : 'This access link is no longer valid.'
    )
    return promise
  }
  const key = sharedKey

  timer = setTimeout(() => {
    fail('connection-interrupted', 'Timed out waiting for the remote Orca runtime to respond.')
  }, timeoutMs)

  try {
    socket = new WebSocket(offer.endpoint)
  } catch (error) {
    fail(
      'host-unreachable',
      error instanceof Error
        ? error.message
        : `${REMOTE_RUNTIME_CONNECT_FAILURE_PHRASE} at ${offer.endpoint}.`
    )
    return promise
  }
  const ws = socket

  let state: 'awaiting_ready' | 'awaiting_authenticated' | 'awaiting_status' = 'awaiting_ready'

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'e2ee_hello', publicKeyB64: bytesToBase64(keyPair.publicKey) }))
  })
  ws.addEventListener('error', () => {
    fail('host-unreachable', `${REMOTE_RUNTIME_CONNECT_FAILURE_PHRASE} at ${offer.endpoint}.`)
  })
  ws.addEventListener('close', () => {
    if (!settled) {
      fail('connection-interrupted', 'Remote Orca runtime closed the connection.')
    }
  })
  ws.addEventListener('message', (event) => {
    if (settled) {
      return
    }
    const frame = typeof event.data === 'string' ? event.data : null
    if (frame === null || frame.length > MAX_FRAME_BYTES) {
      fail('connection-interrupted', 'The remote host returned an invalid response.')
      return
    }
    if (state === 'awaiting_ready') {
      if (classifyReadyFrame(frame) !== 'ready') {
        fail('host-identity-mismatch', 'Orca reached the host, but that host does not match this access link.')
        return
      }
      state = 'awaiting_authenticated'
      ws.send(
        encryptText(
          JSON.stringify({
            type: 'e2ee_auth',
            deviceToken: offer.deviceToken,
            clientCapabilities
          }),
          key
        )
      )
      return
    }
    const plaintext = decryptText(frame, key)
    if (plaintext === null) {
      fail('connection-interrupted', 'Remote Orca runtime returned an undecryptable frame.')
      return
    }
    if (state === 'awaiting_authenticated') {
      const verdict = parseAuthenticatedFrame(plaintext)
      if (verdict !== 'authenticated') {
        fail(
          'access-link-invalid',
          verdict === 'rejected'
            ? 'This access link is no longer valid. Generate a new link on the other host.'
            : 'The remote host returned an invalid auth frame.'
        )
        return
      }
      state = 'awaiting_status'
      ws.send(
        encryptText(
          JSON.stringify({
            id: crypto.randomUUID(),
            deviceToken: offer.deviceToken,
            method: 'status.get'
          }),
          key
        )
      )
      return
    }
    let response: unknown
    try {
      response = JSON.parse(plaintext) as unknown
    } catch {
      fail('connection-interrupted', 'The remote host returned an invalid status response.')
      return
    }
    if (
      response !== null &&
      typeof response === 'object' &&
      'error' in response &&
      response.error !== undefined &&
      response.error !== null
    ) {
      const message =
        typeof response.error === 'object' &&
        response.error !== null &&
        'message' in response.error &&
        typeof response.error.message === 'string'
          ? response.error.message
          : 'The remote host rejected the status request.'
      fail('connection-interrupted', message)
      return
    }
    const result =
      response !== null && typeof response === 'object' && 'result' in response
        ? response.result
        : {}
    const runtimeStatus =
      result !== null && typeof result === 'object' ? (result as Record<string, unknown>) : {}
    finish({ ok: true, runtimeStatus })
  })
  return promise
}

export function parseAndVerifyPairingCode(
  pairingCode: string,
  clientCapabilities: readonly string[] = []
): Promise<RemotePairingVerifyResult> {
  const parsed = parseHostAccessLink(pairingCode)
  if (!parsed.ok) {
    return Promise.resolve({ ok: false, kind: 'access-link-invalid', message: 'Invalid pairing code.' })
  }
  return verifyRemotePairing(parsed.value.pairing, clientCapabilities)
}

type RpcFrameHandlers = {
  requestId: string
  invalidResponseMessage: string
  rejectedMessage: string
  onResult: (result: unknown) => void
}

/**
 * One E2EE JSON-RPC call over a fresh browser WebSocket: hello → ready →
 * encrypted auth → encrypted `{ id, deviceToken, method, params }`. The remote
 * answers `{ id, result }` or `{ id, error }`. Used for post-pairing methods
 * like `repo.clone` / `repo.create` on a paired server.
 */
export function callRemoteRuntimeRpc(
  offer: PairingOffer,
  method: string,
  params: unknown,
  clientCapabilities: readonly string[] = [],
  timeoutMs = 60_000
): Promise<RemoteRuntimeRpcResult> {
  const { promise, resolve } = Promise.withResolvers<RemoteRuntimeRpcResult>()
  let settled = false
  let socket: WebSocket | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  const finish = (result: RemoteRuntimeRpcResult): void => {
    if (settled) {
      return
    }
    settled = true
    clearTimeout(timer)
    try {
      socket?.close()
    } catch {
      // ignore best-effort close
    }
    resolve(result)
  }
  const fail = (kind: string, message: string): void => finish({ ok: false, kind, message })

  const keyPair = nacl.box.keyPair()
  if (!offer.publicKeyB64) {
    fail('access-link-invalid', 'This access link carries no host identity key.')
    return promise
  }
  let sharedKey: Uint8Array
  try {
    sharedKey = nacl.box.before(publicKeyFromBase64(offer.publicKeyB64), keyPair.secretKey)
  } catch (error) {
    fail(
      'access-link-invalid',
      error instanceof Error ? error.message : 'This access link is no longer valid.'
    )
    return promise
  }
  const key = sharedKey
  const requestId = crypto.randomUUID()

  timer = setTimeout(() => {
    fail('connection-interrupted', `Timed out waiting for the remote Orca runtime to answer ${method}.`)
  }, timeoutMs)

  try {
    socket = new WebSocket(offer.endpoint)
  } catch (error) {
    fail(
      'host-unreachable',
      error instanceof Error
        ? error.message
        : `${REMOTE_RUNTIME_CONNECT_FAILURE_PHRASE} at ${offer.endpoint}.`
    )
    return promise
  }
  const ws = socket
  const handlers: RpcFrameHandlers = {
    requestId,
    invalidResponseMessage: `The remote host returned an invalid ${method} response.`,
    rejectedMessage: `The remote host rejected the ${method} request.`,
    onResult: (result: unknown) => finish({ ok: true, result })
  }

  let state: 'awaiting_ready' | 'awaiting_authenticated' | 'awaiting_result' = 'awaiting_ready'

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'e2ee_hello', publicKeyB64: bytesToBase64(keyPair.publicKey) }))
  })
  ws.addEventListener('error', () => {
    fail('host-unreachable', `${REMOTE_RUNTIME_CONNECT_FAILURE_PHRASE} at ${offer.endpoint}.`)
  })
  ws.addEventListener('close', () => {
    if (!settled) {
      fail('connection-interrupted', 'Remote Orca runtime closed the connection.')
    }
  })
  ws.addEventListener('message', (event) => {
    if (settled) {
      return
    }
    const frame = typeof event.data === 'string' ? event.data : null
    if (frame === null || frame.length > MAX_FRAME_BYTES) {
      fail('connection-interrupted', 'The remote host returned an invalid response.')
      return
    }
    if (state === 'awaiting_ready') {
      if (classifyReadyFrame(frame) !== 'ready') {
        fail('host-identity-mismatch', 'Orca reached the host, but that host does not match this access link.')
        return
      }
      state = 'awaiting_authenticated'
      ws.send(
        encryptText(
          JSON.stringify({
            type: 'e2ee_auth',
            deviceToken: offer.deviceToken,
            clientCapabilities
          }),
          key
        )
      )
      return
    }
    const plaintext = decryptText(frame, key)
    if (plaintext === null) {
      fail('connection-interrupted', 'Remote Orca runtime returned an undecryptable frame.')
      return
    }
    if (state === 'awaiting_authenticated') {
      const verdict = parseAuthenticatedFrame(plaintext)
      if (verdict !== 'authenticated') {
        fail(
          'access-link-invalid',
          verdict === 'rejected'
            ? 'This access link is no longer valid. Generate a new link on the other host.'
            : 'The remote host returned an invalid auth frame.'
        )
        return
      }
      state = 'awaiting_result'
      ws.send(
        encryptText(
          JSON.stringify({
            id: handlers.requestId,
            deviceToken: offer.deviceToken,
            method,
            params
          }),
          key
        )
      )
      return
    }
    handleRpcResultFrame(plaintext, handlers, fail)
  })
  return promise
}

function handleRpcResultFrame(
  plaintext: string,
  handlers: RpcFrameHandlers,
  fail: (kind: string, message: string) => void
): void {
  let response: unknown
  try {
    response = JSON.parse(plaintext) as unknown
  } catch {
    fail('connection-interrupted', handlers.invalidResponseMessage)
    return
  }
  if (response === null || typeof response !== 'object' || !('result' in response || 'error' in response)) {
    fail('connection-interrupted', handlers.invalidResponseMessage)
    return
  }
  const record = response as { id?: unknown; result?: unknown; error?: unknown }
  if (record.id !== undefined && record.id !== handlers.requestId) {
    return
  }
  if (record.error !== undefined && record.error !== null) {
    const message =
      typeof record.error === 'object' &&
      record.error !== null &&
      'message' in record.error &&
      typeof record.error.message === 'string'
        ? record.error.message
        : handlers.rejectedMessage
    fail('connection-interrupted', message)
    return
  }
  handlers.onResult('result' in record ? record.result : undefined)
}
