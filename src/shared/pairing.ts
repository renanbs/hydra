// Pairing-offer parsing for host access links (`orca://pair?code=…`).
//
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: shared/pairing.ts + shared/tailnet-address.ts. The relay/pairing handshake itself
// has no Hydra backend yet, so this module only decodes and validates the offer a user pastes
// into the Add-host dialog; it never stores credentials.

export type PairingScope = 'mobile' | 'runtime'

export type PairingOffer = {
  v: number
  endpoint: string
  deviceToken: string
  publicKeyB64?: string
  pairedDeviceId?: string
  scope?: PairingScope
}

export const PAIRING_OFFER_VERSION = 2

/** Upper bounds mirror Orca's protocol limits so a hostile paste is rejected before parsing. */
export const PAIRING_CODE_MAX_CHARACTERS = 8 * 1024
export const PAIRING_INPUT_MAX_CHARACTERS = 16 * 1024

function extractPairingCodeFromUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  // Why: prefix checks accepted routes like `orca://pairing?…`; only the pairing deep-link
  // host may carry runtime auth material.
  if (parsed.protocol !== 'orca:' || parsed.hostname !== 'pair') {
    return null
  }
  if (parsed.pathname !== '' && parsed.pathname !== '/') {
    return null
  }
  const code = parsed.searchParams.get('code')
  if (code) {
    return code
  }
  return parsed.hash ? parsed.hash.slice(1) || null : null
}

function decodeBase64Url(code: string): string | null {
  if (code.length === 0 || code.length > PAIRING_CODE_MAX_CHARACTERS) {
    return null
  }
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(code)) {
    return null
  }
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/')
  try {
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

function readPairingOffer(json: string): PairingOffer | null {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    return null
  }
  if (!value || typeof value !== 'object') {
    return null
  }
  const record = value as Record<string, unknown>
  const endpoint = typeof record.endpoint === 'string' ? record.endpoint.trim() : ''
  const deviceToken = typeof record.deviceToken === 'string' ? record.deviceToken.trim() : ''
  const scope = record.scope === 'mobile' || record.scope === 'runtime' ? record.scope : undefined
  if (typeof record.v !== 'number' || !endpoint || !deviceToken) {
    return null
  }
  return {
    v: record.v,
    endpoint,
    deviceToken,
    scope,
    ...(typeof record.publicKeyB64 === 'string' ? { publicKeyB64: record.publicKeyB64 } : {}),
    ...(typeof record.pairedDeviceId === 'string'
      ? { pairedDeviceId: record.pairedDeviceId }
      : {})
  }
}

/**
 * Accepts either an `orca://pair?…` URL or the bare base64 code, so a paste from either
 * surface works. Returns null for anything that does not decode into a pairing offer.
 */
export function parsePairingCode(input: string): PairingOffer | null {
  if (input.length > PAIRING_INPUT_MAX_CHARACTERS) {
    return null
  }
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }
  const code = trimmed.toLowerCase().startsWith('orca://')
    ? extractPairingCodeFromUrl(trimmed)
    : trimmed
  if (!code) {
    return null
  }
  const json = decodeBase64Url(code)
  return json === null ? null : readPairingOffer(json)
}

/** Tailnet IPv4 addresses live in 100.64.0.0/10. */
export function isTailnetIPv4Address(address: string): boolean {
  const parts = address.split('.')
  if (parts.length !== 4) {
    return false
  }
  const octets = parts.map((part) => (/^\d+$/.test(part) ? Number(part) : Number.NaN))
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false
  }
  return octets[0] === 100 && octets[1]! >= 64 && octets[1]! <= 127
}
