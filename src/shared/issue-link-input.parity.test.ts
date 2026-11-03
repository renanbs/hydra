import { describe, expect, it } from 'vitest'
import {
  getIssueLinkProviderFromUrl,
  parseGitHubIssueLink,
  parseIssueLinkInput,
  parseLinearIssueLink,
} from './issue-link-input'

describe('issue link input (Orca parity)', () => {
  it('parses GitHub issue URLs and bare numeric refs', () => {
    expect(parseGitHubIssueLink('https://github.com/acme/hydra/issues/42')).toEqual({
      provider: 'github',
      number: 42,
      isPullRequest: false,
    })
    expect(parseGitHubIssueLink('#42')).toEqual({
      provider: 'github',
      number: 42,
      isPullRequest: false,
    })
    expect(parseGitHubIssueLink('42')).toEqual({
      provider: 'github',
      number: 42,
      isPullRequest: false,
    })
    expect(parseGitHubIssueLink('0')).toBeNull()
    expect(parseGitHubIssueLink('9'.repeat(400))).toBeNull()
  })

  it('distinguishes a pull request URL from an issue URL', () => {
    expect(parseGitHubIssueLink('https://github.com/acme/hydra/pull/9')?.isPullRequest).toBe(
      true
    )
    expect(parseIssueLinkInput('https://github.com/acme/hydra/pull/9', 'github')).toBeNull()
  })

  it('normalizes Linear identifiers and reads them out of issue URLs', () => {
    expect(parseLinearIssueLink('sta-335')).toEqual({
      provider: 'linear',
      identifier: 'STA-335',
    })
    expect(
      parseLinearIssueLink('https://linear.app/acme/issue/ENG-123/fix-the-thing')
    ).toEqual({ provider: 'linear', identifier: 'ENG-123' })
    expect(parseLinearIssueLink('not-an-issue')).toBeNull()
  })

  it('decides a provider from a URL only when the URL names an issue', () => {
    expect(
      getIssueLinkProviderFromUrl('https://github.com/acme/hydra/issues/1')
    ).toBe('github')
    expect(getIssueLinkProviderFromUrl('https://github.com/acme/hydra/pull/1')).toBeNull()
    expect(getIssueLinkProviderFromUrl('https://linear.app/acme/issue/ENG-1/x')).toBe(
      'linear'
    )
    // A bare identifier is byte-identical across providers; only the user can decide.
    expect(getIssueLinkProviderFromUrl('ENG-123')).toBeNull()
  })

  it('parses against the explicit provider for the save gate', () => {
    expect(parseIssueLinkInput('#7', 'github')).toEqual({ provider: 'github', number: 7 })
    expect(parseIssueLinkInput('eng-7', 'linear')).toEqual({
      provider: 'linear',
      identifier: 'ENG-7',
    })
    expect(parseIssueLinkInput('ENG-7', 'github')).toBeNull()
  })
})
