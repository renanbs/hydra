import { describe, expect, it } from 'vitest'
import {
  COMPACT_WORKTREE_CARD_PROPERTIES,
  DEFAULT_WORKTREE_CARD_PROPERTIES,
  TASK_WORKTREE_CARD_PROPERTIES,
  WORKTREE_CARD_PROPERTIES,
  getWorktreeCardModeProperties,
  getWorktreeCardModeUpdates,
  isDefaultedCompactWorktreeCardProperties,
  normalizeWorktreeCardProperties
} from './card-properties'

// This file is a faithful port of Orca's
// `src/shared/worktree/card-properties.ts`; the assertions below pin the exact
// contents and normalizer semantics so a future edit cannot silently drift from
// the source module.

describe('worktree card properties (ported from Orca)', () => {
  it('exports the same constant contents as Orca', () => {
    expect(COMPACT_WORKTREE_CARD_PROPERTIES).toEqual(['status'])
    expect(TASK_WORKTREE_CARD_PROPERTIES).toEqual(['issue', 'linear-issue', 'jira-issue'])
    expect(DEFAULT_WORKTREE_CARD_PROPERTIES).toEqual([
      'status',
      'unread',
      'issue',
      'linear-issue',
      'jira-issue',
      'pr',
      'automation',
      'cli',
      'comment',
      'ports',
      'inline-agents'
    ])
    expect(WORKTREE_CARD_PROPERTIES).toEqual([
      'status',
      'unread',
      'ci',
      'branch',
      'issue',
      'linear-issue',
      'jira-issue',
      'pr',
      'automation',
      'cli',
      'comment',
      'ports',
      'inline-agents'
    ])
  })

  it('defines Default with inline agents and without branch', () => {
    const props = getWorktreeCardModeProperties('Default')

    expect(props).toContain('inline-agents')
    expect(props).not.toContain('branch')
    expect(props).toContain('pr')
    expect(props).toContain('automation')
    expect(props).toEqual(DEFAULT_WORKTREE_CARD_PROPERTIES)
  })

  it('defines Compact as the status-only quiet preset', () => {
    const props = getWorktreeCardModeProperties('Compact')

    expect(props).toEqual(['status'])
    expect(props).toEqual(COMPACT_WORKTREE_CARD_PROPERTIES)
    expect(props).not.toContain('inline-agents')
    expect(props).not.toContain('issue')
    expect(props).not.toContain('linear-issue')
    expect(props).not.toContain('jira-issue')
    expect(props).not.toContain('comment')
    expect(props).not.toContain('ports')
    expect(props).not.toContain('branch')
    expect(props).not.toContain('pr')
    expect(props).not.toContain('automation')
  })

  it('keeps status enabled in both presets', () => {
    expect(getWorktreeCardModeProperties('Default')).toEqual(expect.arrayContaining(['status']))
    expect(getWorktreeCardModeProperties('Compact')).toEqual(expect.arrayContaining(['status']))
  })

  it('keeps provider-specific task metadata together in Default mode', () => {
    expect(getWorktreeCardModeProperties('Default')).toEqual(
      expect.arrayContaining(TASK_WORKTREE_CARD_PROPERTIES)
    )
  })

  it('returns combined mode update payloads', () => {
    expect(getWorktreeCardModeUpdates('Compact')).toEqual({
      settings: { compactWorktreeCards: true },
      ui: {
        worktreeCardProperties: getWorktreeCardModeProperties('Compact'),
        _worktreeCardModeDefaulted: true
      }
    })
    expect(getWorktreeCardModeUpdates('Default')).toEqual({
      settings: { compactWorktreeCards: false },
      ui: {
        worktreeCardProperties: getWorktreeCardModeProperties('Default'),
        _worktreeCardModeDefaulted: true
      }
    })
  })

  it('recognizes only exact defaulted Compact presets', () => {
    expect(isDefaultedCompactWorktreeCardProperties(['status'])).toBe(true)
    expect(isDefaultedCompactWorktreeCardProperties(['status', 'unread'])).toBe(true)
    expect(isDefaultedCompactWorktreeCardProperties(['status', 'automation'])).toBe(true)
    expect(isDefaultedCompactWorktreeCardProperties(['status', 'unread', 'automation'])).toBe(true)
    expect(isDefaultedCompactWorktreeCardProperties(['automation', 'status'])).toBe(false)
    expect(isDefaultedCompactWorktreeCardProperties(['status', 'automation', 'pr'])).toBe(false)
  })

  it('normalizes selected properties into canonical order with fixed properties first', () => {
    expect(normalizeWorktreeCardProperties(['ci', 'branch', 'pr', 'automation', 'unread'])).toEqual(
      ['status', 'unread', 'ci', 'branch', 'pr', 'automation']
    )
  })

  it('normalizes a partial selection without dropping defaults for the rest', () => {
    expect(normalizeWorktreeCardProperties(['ci'])).toEqual(['status', 'unread', 'ci'])
    expect(normalizeWorktreeCardProperties(['inline-agents', 'status'])).toEqual([
      'status',
      'unread',
      'inline-agents'
    ])
  })

  it('drops unknown values and deduplicates repeated properties', () => {
    expect(normalizeWorktreeCardProperties(['bogus', 42, null, {}, 'ci', 'ci'])).toEqual([
      'status',
      'unread',
      'ci'
    ])
  })

  it('falls back to the Default preset when no value is persisted', () => {
    const expected = normalizeWorktreeCardProperties(DEFAULT_WORKTREE_CARD_PROPERTIES)
    expect(normalizeWorktreeCardProperties(undefined)).toEqual(expected)
    expect(normalizeWorktreeCardProperties(null)).toEqual(expected)
    expect(normalizeWorktreeCardProperties([])).toEqual(['status', 'unread'])
  })
})
