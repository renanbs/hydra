// Add-host duplicate guard: the registry accepts two rows for the same machine, but the
// sidebar cannot tell them apart. Aliases follow OpenSSH's case-insensitive host matching;
// a differing explicit username keeps `deploy@box` and `root@box` distinct.
import { describe, expect, it } from 'vitest'
import { isDuplicateSshTargetAlias } from './ssh-target-duplicate'

const targets = [
  { configHost: 'box', host: 'box.internal', username: 'deploy' },
  { configHost: undefined, host: 'plain.internal', username: '' }
]

describe('isDuplicateSshTargetAlias', () => {
  it('matches the config alias case-insensitively', () => {
    expect(
      isDuplicateSshTargetAlias({ configHost: 'BOX', host: 'ignored', username: 'deploy' }, targets)
    ).toBe(true)
  })

  it('falls back to the host when the candidate has no alias', () => {
    expect(
      isDuplicateSshTargetAlias({ host: 'PLAIN.internal', username: 'root' }, targets)
    ).toBe(true)
  })

  it('keeps different explicit usernames apart', () => {
    expect(
      isDuplicateSshTargetAlias({ configHost: 'box', host: 'box', username: 'root' }, targets)
    ).toBe(false)
  })

  it('accepts a host the registry does not hold', () => {
    expect(
      isDuplicateSshTargetAlias({ host: 'fresh.internal', username: 'deploy' }, targets)
    ).toBe(false)
  })

  it('rejects a blank alias as a duplicate check (nothing to compare)', () => {
    expect(isDuplicateSshTargetAlias({ host: '   ', username: 'deploy' }, targets)).toBe(false)
  })
})
