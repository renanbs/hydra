// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: lib/remote-pairing-copy.ts. Every surface that explains an access-link problem goes
// through here so the add-host dialog and the settings form say the same thing.
import type {
  HostAccessLinkErrorKind,
  RemotePairingEndpointKind
} from '../shared/remote-pairing-address'
import { translate } from '@/i18n/i18n'

export function translateHostAccessLinkError(kind: HostAccessLinkErrorKind): string {
  switch (kind) {
    case 'invalid-input':
      return translate(
        'auto.lib.remotePairingCopy.invalidInput',
        'Enter an Orca access link or bare pairing code.'
      )
    case 'mobile-only':
      return translate(
        'auto.lib.remotePairingCopy.mobileOnly',
        'This link grants mobile-only access. Generate a link for another Orca client.'
      )
    case 'invalid-destination':
      return translate(
        'auto.lib.remotePairingCopy.invalidDestination',
        'This access link contains an invalid destination.'
      )
    case 'unsupported-destination':
      return translate(
        'auto.lib.remotePairingCopy.unsupportedDestination',
        'This access link contains an unsupported destination.'
      )
    case 'non-connectable-destination':
      return translate(
        'auto.lib.remotePairingCopy.nonConnectableDestination',
        'This access link contains a non-connectable destination.'
      )
  }
}

export function translateRemotePairingEndpointKind(kind: RemotePairingEndpointKind): string {
  switch (kind) {
    case 'loopback':
      return translate('auto.lib.remotePairingCopy.loopback', 'Loopback')
    case 'tailscale':
      return translate('auto.lib.remotePairingCopy.tailscale', 'Tailscale address')
    case 'lan':
      return translate('auto.lib.remotePairingCopy.lan', 'Private LAN address')
    case 'public':
      return translate('auto.lib.remotePairingCopy.public', 'Public address')
    case 'custom':
      return translate('auto.lib.remotePairingCopy.custom', 'Custom hostname')
  }
}
