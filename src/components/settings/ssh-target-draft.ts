// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/settings/ssh-target-draft.ts`, reduced to the fields the
// Add-host dialog exposes today: label, host, port, username, identity file. Orca's draft
// also carries the GSSAPI/proxy/jump/relay-timeout knobs behind its `Advanced` section;
// those land with that section's PR instead of sitting here inert.
import type { SshConfigHostResolution, SshTarget } from '../../shared/ssh-types'

export type EditingTarget = {
  label: string
  /** Alias to resolve through `~/.ssh/config` (`ssh -G`); empty for a plain host. */
  configHost: string
  host: string
  port: string
  username: string
  identityFile: string
}

export const EMPTY_FORM: EditingTarget = {
  label: '',
  configHost: '',
  host: '',
  port: '22',
  username: '',
  identityFile: ''
}

/** Prefill the add-host form from a `~/.ssh/config` Host entry (does not save). */
export function getEditingTargetFromSshConfigHost(host: SshConfigHostResolution): EditingTarget {
  const configHost = host.alias !== host.hostname ? host.alias : ''
  return {
    ...EMPTY_FORM,
    label: host.alias,
    configHost,
    // Why: `SshConfigHostResolution.hostname` already falls back to the alias when the
    // entry has no HostName, so Host keeps resolving User/Port/Identity through OpenSSH.
    host: host.hostname,
    port: String(host.port),
    username: host.username,
    // Why: no scalar override lets connection-time `ssh -G` retain every IdentityFile.
    identityFile: ''
  }
}

/** Prefill the edit form from a registered target (does not save). */
export function getEditingTargetForSshTarget(target: SshTarget): EditingTarget {
  // Why: manual targets store their host as the config alias. Clear that implicit
  // value on edit so changing Host recomputes the alias instead of keeping a stale one.
  const configHost = target.configHost && target.configHost !== target.host ? target.configHost : ''
  return {
    label: target.label,
    configHost,
    host: target.host,
    port: String(target.port),
    username: target.username,
    identityFile: target.identityFile ?? ''
  }
}

export type ParsedSshHostInput = {
  host: string
  username?: string
  port?: number
  invalidPort?: boolean
  configHost: string
}

export function parseSshHostInput(rawInput: string): ParsedSshHostInput | null {
  const input = rawInput.trim()
  if (!input) {
    return null
  }

  if (/^ssh:\/\//i.test(input)) {
    return parseSshUrl(input)
  }

  const atIndex = input.lastIndexOf('@')
  const username = atIndex > 0 ? input.slice(0, atIndex).trim() : undefined
  const hostPort = atIndex > 0 ? input.slice(atIndex + 1).trim() : input
  const parsed = parseHostAndOptionalPort(hostPort)
  if (!parsed.host) {
    return null
  }

  return {
    host: parsed.host,
    username,
    port: parsed.port,
    invalidPort: parsed.invalidPort,
    configHost: parsed.host
  }
}

export function applyParsedSshHostInput(draft: EditingTarget): EditingTarget {
  const parsed = parseSshHostInput(draft.host)
  // Why: keep bad host:port text visible so the user can correct it after
  // the save validator reports the invalid port.
  if (!parsed || parsed.invalidPort) {
    return draft
  }

  return {
    ...draft,
    host: parsed.host,
    configHost: draft.configHost.trim() || parsed.configHost,
    username: draft.username.trim() || parsed.username || '',
    port:
      parsed.port !== undefined && isDefaultPortDraft(draft.port) ? String(parsed.port) : draft.port
  }
}

/** Connection fields the target is persisted with, after the Host field's own input syntax. */
export function getSshTargetDraftConnectionFields(draft: EditingTarget): {
  host: string
  configHost: string
  username: string
  port: number
} {
  const parsed = parseSshHostInput(draft.host)
  const host = parsed?.host ?? draft.host.trim()
  const configHost = draft.configHost.trim() || parsed?.configHost || host
  const username = draft.username.trim() || parsed?.username || ''
  const parsedPort = Number.parseInt(draft.port, 10)
  const port =
    parsed?.invalidPort === true
      ? Number.NaN
      : parsed?.port !== undefined && isDefaultPortDraft(draft.port)
        ? parsed.port
        : parsedPort

  return {
    host,
    configHost,
    username,
    port
  }
}

function parseSshUrl(input: string): ParsedSshHostInput | null {
  try {
    const url = new URL(input)
    if (url.protocol !== 'ssh:' || !url.hostname) {
      return null
    }
    // Why: URL.hostname keeps IPv6 literals bracketed, but ssh2 and DNS
    // resolution expect the bare address. The non-URL parser already strips.
    const host = url.hostname.replace(/^\[|\]$/g, '')
    const port = url.port ? parsePort(url.port) : undefined
    if (url.port && port === undefined) {
      return {
        host,
        username: decodeSshUrlUsername(url.username),
        configHost: host,
        invalidPort: true
      }
    }
    return {
      host,
      username: decodeSshUrlUsername(url.username),
      port,
      configHost: host
    }
  } catch {
    return parseSshUrlWithInvalidPort(input)
  }
}

function parseSshUrlWithInvalidPort(input: string): ParsedSshHostInput | null {
  const match = input.match(/^ssh:\/\/(?:([^@/?#]*)@)?(\[[^\]]+\]|[^:/?#]+):([^/?#]*)(?:[/?#]|$)/i)
  if (!match) {
    return null
  }

  const rawHost = match[2]
  const host = rawHost.startsWith('[') && rawHost.endsWith(']') ? rawHost.slice(1, -1) : rawHost
  const port = parsePort(match[3])
  if (port !== undefined) {
    return null
  }

  return {
    host,
    username: decodeSshUrlUsername(match[1] ?? ''),
    configHost: host,
    invalidPort: true
  }
}

function decodeSshUrlUsername(value: string): string | undefined {
  if (!value) {
    return undefined
  }
  try {
    return decodeURIComponent(value)
  } catch {
    // Why: malformed pasted SSH URLs should surface validation errors in the
    // form, not throw during parsing before the user can fix the input.
    return value
  }
}

function parseHostAndOptionalPort(input: string): {
  host: string
  port?: number
  invalidPort?: boolean
} {
  if (input.startsWith('[')) {
    const closeIndex = input.indexOf(']')
    if (closeIndex > 1) {
      const host = input.slice(1, closeIndex)
      const suffix = input.slice(closeIndex + 1)
      if (suffix.startsWith(':')) {
        const port = parsePort(suffix.slice(1))
        return port === undefined ? { host, invalidPort: true } : { host, port }
      }
      return { host }
    }
  }

  const firstColon = input.indexOf(':')
  if (firstColon !== -1 && firstColon === input.lastIndexOf(':')) {
    const host = input.slice(0, firstColon)
    const port = parsePort(input.slice(firstColon + 1))
    if (host) {
      return port === undefined ? { host, invalidPort: true } : { host, port }
    }
  }

  return { host: input }
}

function parsePort(value: string): number | undefined {
  if (!/^\d+$/.test(value)) {
    return undefined
  }
  const port = Number(value)
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : undefined
}

/** Port left untouched at the form default, so a pasted host:port may still win. */
function isDefaultPortDraft(value: string): boolean {
  const trimmed = value.trim()
  return trimmed === '' || trimmed === '22'
}
