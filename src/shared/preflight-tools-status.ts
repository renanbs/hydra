/**
 * Wire shape of `check_preflight_tools_cmd` (Rust `PreflightStatus`).
 *
 * `glab_*` feed the Tasks provider availability (D01-020): the GitLab
 * shortcut only renders when the CLI is actually installed on this host.
 * Linear has no honest probe yet, so it is deliberately absent here instead
 * of being reported as a constant `false`.
 */
export type PreflightToolsStatus = {
  git_installed: boolean
  gh_installed: boolean
  gh_authenticated: boolean
  glab_installed: boolean
  glab_authenticated: boolean
}
