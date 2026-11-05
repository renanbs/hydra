//! Remote filesystem and git operations executed through the user's system
//! OpenSSH client (`ssh_remote`).
//!
//! Every command resolves the target from the SSH registry the same way
//! `ssh_reconnect_target` does, reuses the probe's non-interactive options
//! (`BatchMode`, `ConnectTimeout`, `LogLevel=ERROR`), and runs a fixed POSIX
//! `sh` script with the user-supplied values passed as *arguments*. The remote
//! command string is therefore built from a constant script plus
//! single-quoted arguments — never by interpolating a path into shell source.
//!
//! Output is bounded and NUL-delimited so names with spaces or newlines survive
//! the round trip, and every call has a deadline.

use std::process::{Command, Stdio};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::proc_runner::{run_bounded, CommandOutput, RunFailure, OUTPUT_CAP_BYTES};
use crate::ssh_hosts::{build_ssh_base_args, build_ssh_destination, SshTarget};
use crate::AppState;

/// Directory listings are cheap; the deadline only has to cover connect + `ls`
/// on a slow link.
const BROWSE_TIMEOUT: Duration = Duration::from_secs(45);
/// A clone is bounded by network size, not by our catalog; the deadline exists
/// so a stalled transfer cannot pin a blocking task forever.
const CLONE_TIMEOUT: Duration = Duration::from_secs(30 * 60);
const CREATE_TIMEOUT: Duration = Duration::from_secs(120);
const DELETE_TIMEOUT: Duration = Duration::from_secs(180);
/// A capability probe is one `command -v` plus `git rev-parse`; it only needs
/// to outlast the connection handshake.
const PROBE_TIMEOUT: Duration = Duration::from_secs(30);

const REMOTE_PROGRAM_NAME: &str = "hydra-remote";

// ─── TYPES ────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshRemoteDirEntry {
    pub name: String,
    pub path: String,
    /// `dir` or `file`; the renderer's picker only needs those two classes.
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshRemoteDirListing {
    /// Absolute directory the remote shell actually opened (`~` and relative
    /// paths resolve here), so the picker can anchor breadcrumbs and home.
    pub resolved_path: String,
    pub entries: Vec<SshRemoteDirEntry>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshRemoteCloneResult {
    /// Absolute path of the created checkout on the remote host.
    pub path: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshRemoteCreateProjectResult {
    /// Absolute path of the created project directory on the remote host.
    pub path: String,
}

/// Host capabilities the Add Project create step needs before it can offer to
/// initialize a repository on an SSH host.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshRemoteGitProbe {
    pub git_available: bool,
    pub is_git_repository: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshRemotePreservedBranch {
    pub branch_name: String,
    pub head: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshRemoteDeleteWorktreeResult {
    pub worktree_path: String,
    pub removed: bool,
    /// Branches that still exist after the removal. `git worktree remove` never
    /// deletes a branch, so anything tied to the checkout is reported here
    /// instead of being silently dropped.
    pub preserved_branches: Vec<SshRemotePreservedBranch>,
}

// ─── POSIX SCRIPTS ────────────────────────────────────────────────────

/// Lists one directory level. Values arrive as `$1` (never re-parsed by the
/// local shell), `~` is expanded remotely, and records are NUL-delimited so a
/// filename with a newline cannot be mistaken for a record boundary.
const LIST_SCRIPT: &str = r#"
dir=$1
case $dir in
  "~") dir=$HOME ;;
  "~/"*) dir=$HOME/${dir#"~/"} ;;
esac
if ! cd -- "$dir" 2>/dev/null; then
  printf "Cannot open directory: %s\n" "$dir" >&2
  exit 66
fi
printf "P\0%s\0" "$(pwd)"
for p in ./* ./.[!.]* ./..?*; do
  if [ -d "$p" ]; then
    kind=d
    size=0
  else
    if [ ! -e "$p" ] && [ ! -L "$p" ]; then
      continue
    fi
    kind=f
    size=0
    if [ -f "$p" ]; then
      size=$(wc -c <"$p" 2>/dev/null | tr -d ' ')
    fi
  fi
  printf "%s\0%s\0%s\0" "$kind" "$size" "${p#./}"
done
"#;

/// Clones into `<destination>/<target-name>` and prints the absolute result.
const CLONE_SCRIPT: &str = r#"
url=$1
destination=$2
folder=$3
case $destination in
  "~") destination=$HOME ;;
  "~/"*) destination=$HOME/${destination#"~/"} ;;
esac
mkdir -p "$destination" || exit 73
cd -- "$destination" || exit 73
printf "P\0%s\0" "$(pwd)/$folder"
git clone -- "$url" "$folder"
"#;

/// Creates the project directory (failing when it already exists) and
/// initializes git when requested.
const CREATE_PROJECT_SCRIPT: &str = r#"
parent=$1
name=$2
init=$3
case $parent in
  "~") parent=$HOME ;;
  "~/"*) parent=$HOME/${parent#"~/"} ;;
esac
if [ -n "$name" ]; then
  target=$parent/$name
  mkdir -p "$parent" || exit 73
else
  target=$parent
fi
if [ -e "$target" ]; then
  printf "Directory already exists: %s\n" "$target" >&2
  exit 74
fi
if [ -n "$name" ]; then
  mkdir "$target" || exit 73
else
  mkdir -p "$target" || exit 73
fi
if [ "$init" = "1" ]; then
  git -C "$target" init >/dev/null || exit 75
fi
printf "P\0%s\0" "$target"
"#;

/// Reports whether Git exists on the host and whether the path is already a
/// checkout. Truthiness is encoded as `1`/`0` so no locale or error text leaks
/// into the renderer.
const GIT_PROBE_SCRIPT: &str = r#"
path=$1
case $path in
  "~") path=$HOME ;;
  "~/"*) path=$HOME/${path#"~/"} ;;
esac
available=0
repository=0
if command -v git >/dev/null 2>&1; then
  available=1
  if [ -d "$path" ] && git -C "$path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    repository=1
  fi
fi
printf "G\0%s\0R\0%s\0" "$available" "$repository"
"#;

const WORKTREE_LIST_SCRIPT: &str = r#"
repo=$1
case $repo in
  "~") repo=$HOME ;;
  "~/"*) repo=$HOME/${repo#"~/"} ;;
esac
git -C "$repo" worktree list --porcelain
"#;

/// Removes the worktree, prunes the registration, force-deletes the directory
/// only when the caller asked for it, and reports whether the branch survived.
const DELETE_WORKTREE_SCRIPT: &str = r#"
repo=$1
worktree=$2
force=$3
branch=$4
case $repo in
  "~") repo=$HOME ;;
  "~/"*) repo=$HOME/${repo#"~/"} ;;
esac
case $worktree in
  "~") worktree=$HOME ;;
  "~/"*) worktree=$HOME/${worktree#"~/"} ;;
esac
if [ "$force" = "1" ]; then
  set -- --force
else
  set --
fi
removed=0
if git -C "$repo" worktree remove "$@" "$worktree"; then
  removed=1
fi
if [ "$removed" = "0" ] && [ "$force" = "1" ] && [ -e "$worktree" ]; then
  rm -rf "$worktree" && removed=1
fi
if [ "$removed" = "0" ]; then
  printf "R\0f\0"
  exit 67
fi
git -C "$repo" worktree prune >/dev/null 2>&1
printf "R\0d\0"
if [ -n "$branch" ] && git -C "$repo" show-ref --verify --quiet "refs/heads/$branch"; then
  printf "B\0%s\0" "$branch"
fi
"#;

// ─── COMMAND BUILDING ─────────────────────────────────────────────────

/// Single-quote escaping for one POSIX shell word. The remote command string is
/// the only place ssh accepts shell source, so every caller-supplied value goes
/// through this before it is appended.
pub fn shell_quote(value: &str) -> String {
    let mut quoted = String::with_capacity(value.len() + 2);
    quoted.push('\'');
    for ch in value.chars() {
        if ch == '\'' {
            quoted.push_str("'\\''");
        } else {
            quoted.push(ch);
        }
    }
    quoted.push('\'');
    quoted
}

/// Builds `sh -c '<script>' hydra-remote '<arg>'...`. The script is a constant;
/// arguments stay separate words, so no value is ever shell source.
pub fn build_remote_command(script: &str, args: &[String]) -> String {
    let mut command = format!("sh -c {}", shell_quote(script));
    command.push(' ');
    command.push_str(&shell_quote(REMOTE_PROGRAM_NAME));
    for arg in args {
        command.push(' ');
        command.push_str(&shell_quote(arg));
    }
    command
}

/// `ssh <non-interactive options> <destination> <remote command>`.
pub fn build_ssh_exec_args(target: &SshTarget, remote_command: &str) -> Vec<String> {
    let mut args = build_ssh_base_args(target);
    args.push(build_ssh_destination(target));
    args.push(remote_command.to_string());
    args
}

/// Rejects values that could break the `sh -c` argument boundary or be read as
/// an option by the remote tool. `~` and `~/<child>` are allowed: the scripts
/// expand them against the remote `$HOME`.
fn validate_remote_dir_path(field: &str, value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{field} is required"));
    }
    if trimmed.chars().any(|ch| ch.is_control()) {
        return Err(format!("{field} contains control characters"));
    }
    if trimmed.starts_with('-') {
        return Err(format!("{field} must not start with '-'"));
    }
    Ok(trimmed.to_string())
}

/// Destructive targets (a worktree that will be removed) additionally refuse the
/// filesystem root and the home directory: `rm -rf /` or `rm -rf ~` must never
/// be reachable from a dialog. Reading those paths for a listing stays allowed.
fn validate_remote_worktree_path(field: &str, value: &str) -> Result<String, String> {
    let trimmed = validate_remote_dir_path(field, value)?;
    if matches!(trimmed.as_str(), "/" | "." | ".." | "~" | "~/") {
        return Err(format!(
            "{field} must point inside a directory, not at {trimmed}"
        ));
    }
    Ok(trimmed)
}

/// A project name has to be one path segment; `..` or `a/b` would escape the
/// parent the user picked.
fn validate_project_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("name is required".to_string());
    }
    if trimmed.contains('/') || trimmed.contains('\\') {
        return Err("name must not contain a path separator".to_string());
    }
    if trimmed.starts_with('.') || trimmed.contains('\0') || trimmed.chars().any(char::is_control) {
        return Err("name must not start with a dot or contain control characters".to_string());
    }
    Ok(trimmed.to_string())
}

fn validate_url(url: &str) -> Result<String, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("url is required".to_string());
    }
    if trimmed.chars().any(char::is_control) {
        return Err("url contains control characters".to_string());
    }
    if trimmed.starts_with('-') {
        return Err("url must not start with '-'".to_string());
    }
    Ok(trimmed.to_string())
}

/// Mirrors `git clone`'s own directory naming so the caller learns the path
/// before the transfer starts.
pub fn repository_folder_name(url: &str) -> String {
    let trimmed = url.trim().trim_end_matches('/');
    let segment = trimmed
        .rsplit(['/', ':'])
        .find(|part| !part.is_empty())
        .unwrap_or("repository");
    let name = segment.trim_end_matches(".git");
    if name.is_empty() {
        "repository".to_string()
    } else {
        name.to_string()
    }
}

// ─── LISTING PARSING ──────────────────────────────────────────────────

fn join_remote_path(parent: &str, name: &str) -> String {
    if parent.ends_with('/') {
        format!("{parent}{name}")
    } else {
        format!("{parent}/{name}")
    }
}

/// Parses the NUL-delimited listing protocol: `P\0<resolved>\0` followed by
/// `kind\0size\0name\0` triples.
pub fn parse_listing_output(stdout: &str) -> Result<SshRemoteDirListing, String> {
    let fields: Vec<&str> = stdout.split('\0').collect();
    if fields.len() < 3 || fields[0] != "P" {
        return Err("Remote listing returned no resolved directory.".to_string());
    }
    let resolved_path = fields[1].to_string();
    let mut entries: Vec<SshRemoteDirEntry> = Vec::new();
    let mut index = 2;
    while index + 2 < fields.len() {
        let kind = fields[index];
        let size = fields[index + 1].trim().parse::<u64>().ok();
        let name = fields[index + 2];
        index += 3;
        if name.is_empty() || (kind != "d" && kind != "f") {
            continue;
        }
        let is_dir = kind == "d";
        entries.push(SshRemoteDirEntry {
            path: join_remote_path(&resolved_path, name),
            name: name.to_string(),
            kind: if is_dir { "dir" } else { "file" }.to_string(),
            size: if is_dir { None } else { size },
        });
    }
    // Directories first, then case-insensitive name order — stable for the picker.
    entries.sort_by(|left, right| {
        let left_dir = left.kind == "dir";
        let right_dir = right.kind == "dir";
        right_dir
            .cmp(&left_dir)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
            .then_with(|| left.name.cmp(&right.name))
    });
    Ok(SshRemoteDirListing {
        resolved_path,
        entries,
    })
}

/// Extracts the `P\0<path>\0` header a mutation script prints on success.
pub fn parse_path_header(stdout: &str, field: &str) -> Result<String, String> {
    let mut fields = stdout.split('\0');
    if fields.next() != Some("P") {
        return Err(format!("Remote host did not report the {field} it created."));
    }
    match fields.next() {
        Some(path) if !path.is_empty() => Ok(path.to_string()),
        _ => Err(format!("Remote host did not report the {field} it created.")),
    }
}

fn parse_removal_output(stdout: &str) -> bool {
    stdout.split('\0').any(|field| field == "d")
}

fn parse_preserved_branch(stdout: &str) -> Option<String> {
    let fields: Vec<&str> = stdout.split('\0').collect();
    fields
        .windows(2)
        .find(|pair| pair[0] == "B" && !pair[1].is_empty())
        .map(|pair| pair[1].to_string())
}

// ─── RUNNERS ──────────────────────────────────────────────────────────

/// Injectable ssh execution boundary; unit tests supply a fake that records the
/// exact remote command instead of opening a connection.
pub trait RemoteCommandRunner: Send + Sync {
    fn run(
        &self,
        target: &SshTarget,
        remote_command: &str,
        timeout: Duration,
    ) -> Result<CommandOutput, RunFailure>;
}

pub struct SystemRemoteCommandRunner;

impl RemoteCommandRunner for SystemRemoteCommandRunner {
    fn run(
        &self,
        target: &SshTarget,
        remote_command: &str,
        timeout: Duration,
    ) -> Result<CommandOutput, RunFailure> {
        let args = build_ssh_exec_args(target, remote_command);
        let child = Command::new("ssh")
            .args(args)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|error| RunFailure::Io(format!("Failed to spawn ssh: {error}")))?;
        run_bounded(child, Some(timeout), OUTPUT_CAP_BYTES, None)
    }
}

fn failure_message(output: &CommandOutput) -> String {
    output
        .stderr_detail()
        .unwrap_or_else(|| format!("ssh exited with status {}", output.status_code.unwrap_or(-1)))
}

fn run_remote(
    runner: &dyn RemoteCommandRunner,
    target: &SshTarget,
    script: &str,
    args: &[String],
    timeout: Duration,
) -> Result<CommandOutput, String> {
    let remote_command = build_remote_command(script, args);
    let output = runner
        .run(target, &remote_command, timeout)
        .map_err(|failure| failure.message())?;
    if !output.success {
        return Err(failure_message(&output));
    }
    Ok(output)
}

// ─── OPERATIONS (runner-level, testable without a database) ───────────

pub fn browse_remote_dir_with_runner(
    runner: &dyn RemoteCommandRunner,
    target: &SshTarget,
    path: &str,
) -> Result<SshRemoteDirListing, String> {
    let path = validate_remote_dir_path("path", path)?;
    let output = run_remote(runner, target, LIST_SCRIPT, &[path], BROWSE_TIMEOUT)?;
    parse_listing_output(&output.stdout)
}

pub fn clone_remote_repository_with_runner(
    runner: &dyn RemoteCommandRunner,
    target: &SshTarget,
    url: &str,
    destination: &str,
    name: Option<&str>,
) -> Result<SshRemoteCloneResult, String> {
    let url = validate_url(url)?;
    let destination = validate_remote_dir_path("destination", destination)?;
    let folder = match name.map(str::trim).filter(|value| !value.is_empty()) {
        Some(name) => validate_project_name(name)?,
        None => {
            let derived = repository_folder_name(&url);
            validate_project_name(&derived)?
        }
    };
    let output = run_remote(
        runner,
        target,
        CLONE_SCRIPT,
        &[url, destination, folder],
        CLONE_TIMEOUT,
    )?;
    Ok(SshRemoteCloneResult {
        path: parse_path_header(&output.stdout, "checkout")?,
    })
}

pub fn create_remote_project_with_runner(
    runner: &dyn RemoteCommandRunner,
    target: &SshTarget,
    path: &str,
    name: Option<&str>,
    init_git: bool,
) -> Result<SshRemoteCreateProjectResult, String> {
    let parent = validate_remote_dir_path("path", path)?;
    let name = match name.map(str::trim).filter(|value| !value.is_empty()) {
        Some(name) => validate_project_name(name)?,
        None => String::new(),
    };
    let output = run_remote(
        runner,
        target,
        CREATE_PROJECT_SCRIPT,
        &[
            parent,
            name,
            if init_git { "1" } else { "0" }.to_string(),
        ],
        CREATE_TIMEOUT,
    )?;
    Ok(SshRemoteCreateProjectResult {
        path: parse_path_header(&output.stdout, "project directory")?,
    })
}

pub fn probe_remote_git_with_runner(
    runner: &dyn RemoteCommandRunner,
    target: &SshTarget,
    path: &str,
) -> Result<SshRemoteGitProbe, String> {
    let path = validate_remote_dir_path("path", path)?;
    let output = run_remote(runner, target, GIT_PROBE_SCRIPT, &[path], PROBE_TIMEOUT)?;
    let fields: Vec<&str> = output.stdout.split('\0').collect();
    let flag = |marker: &str| {
        fields
            .windows(2)
            .find(|pair| pair[0] == marker)
            .map(|pair| pair[1] == "1")
            .unwrap_or(false)
    };
    Ok(SshRemoteGitProbe {
        git_available: flag("G"),
        is_git_repository: flag("R"),
    })
}

pub fn delete_remote_worktree_with_runner(
    runner: &dyn RemoteCommandRunner,
    target: &SshTarget,
    repo_path: &str,
    worktree_path: &str,
    force: bool,
) -> Result<SshRemoteDeleteWorktreeResult, String> {
    let repo_path = validate_remote_dir_path("repoPath", repo_path)?;
    let worktree_path = validate_remote_worktree_path("worktreePath", worktree_path)?;

    // Why a separate round trip: the branch/HEAD of the checkout are only
    // readable from `git worktree list` before the removal, and the same
    // porcelain parser the local delete uses already understands that output.
    let listing = run_remote(
        runner,
        target,
        WORKTREE_LIST_SCRIPT,
        &[repo_path.clone()],
        DELETE_TIMEOUT,
    )?;
    let owned = crate::worktree_ops::parse_worktree_porcelain(&listing.stdout)
        .into_iter()
        .find(|info| info.path.trim_end_matches('/') == worktree_path.trim_end_matches('/'));

    let branch = owned.as_ref().map(|info| info.branch.clone()).unwrap_or_default();
    let head = owned.as_ref().map(|info| info.head_commit.clone()).unwrap_or_default();

    let output = run_remote(
        runner,
        target,
        DELETE_WORKTREE_SCRIPT,
        &[
            repo_path,
            worktree_path.clone(),
            if force { "1" } else { "0" }.to_string(),
            branch.clone(),
        ],
        DELETE_TIMEOUT,
    )?;

    let removed = parse_removal_output(&output.stdout);
    if !removed {
        return Err(format!(
            "Remote host did not remove the worktree at {worktree_path}."
        ));
    }
    let mut preserved_branches = Vec::new();
    if let Some(branch_name) = parse_preserved_branch(&output.stdout) {
        preserved_branches.push(SshRemotePreservedBranch {
            branch_name,
            head,
        });
    }
    Ok(SshRemoteDeleteWorktreeResult {
        worktree_path,
        removed,
        preserved_branches,
    })
}

// ─── TAURI COMMANDS ──────────────────────────────────────────────────

fn load_target(
    db: &crate::db::DatabaseManager,
    connection_id: &str,
) -> Result<SshTarget, String> {
    let connection_id = connection_id.trim();
    if connection_id.is_empty() {
        return Err("connectionId is required".to_string());
    }
    db.get_ssh_state()?
        .ssh_targets
        .into_iter()
        .find(|target| target.id == connection_id)
        .ok_or_else(|| format!("SSH target not found: {connection_id}"))
}

/// Lists one directory level on an SSH host. `~` resolves to the remote home.
#[tauri::command]
pub async fn ssh_browse_dir(
    connection_id: String,
    path: String,
    state: State<'_, AppState>,
) -> Result<SshRemoteDirListing, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let target = load_target(&db, &connection_id)?;
        browse_remote_dir_with_runner(&SystemRemoteCommandRunner, &target, &path)
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Clones a repository on the host into `destination` and returns the created path.
#[tauri::command]
pub async fn ssh_remote_clone(
    connection_id: String,
    url: String,
    destination: String,
    name: Option<String>,
    state: State<'_, AppState>,
) -> Result<SshRemoteCloneResult, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let target = load_target(&db, &connection_id)?;
        clone_remote_repository_with_runner(
            &SystemRemoteCommandRunner,
            &target,
            &url,
            &destination,
            name.as_deref(),
        )
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Creates (and optionally `git init`s) a project directory on the host.
#[tauri::command]
pub async fn ssh_remote_create_project(
    connection_id: String,
    path: String,
    name: Option<String>,
    init_git: Option<bool>,
    state: State<'_, AppState>,
) -> Result<SshRemoteCreateProjectResult, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let target = load_target(&db, &connection_id)?;
        create_remote_project_with_runner(
            &SystemRemoteCommandRunner,
            &target,
            &path,
            name.as_deref(),
            init_git.unwrap_or(true),
        )
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Probes Git and checkout state on the host for the create-project step.
#[tauri::command]
pub async fn ssh_remote_probe_git(
    connection_id: String,
    path: String,
    state: State<'_, AppState>,
) -> Result<SshRemoteGitProbe, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let target = load_target(&db, &connection_id)?;
        probe_remote_git_with_runner(&SystemRemoteCommandRunner, &target, &path)
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Removes a worktree on the host and reports any branch that survived.
#[tauri::command]
pub async fn ssh_remote_delete_worktree(
    connection_id: String,
    repo_path: String,
    worktree_path: String,
    force: bool,
    state: State<'_, AppState>,
) -> Result<SshRemoteDeleteWorktreeResult, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let target = load_target(&db, &connection_id)?;
        delete_remote_worktree_with_runner(
            &SystemRemoteCommandRunner,
            &target,
            &repo_path,
            &worktree_path,
            force,
        )
    })
    .await
    .map_err(|error| error.to_string())?
}

// ─── UNIT TESTS ───────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use parking_lot::Mutex;

    struct FakeRunner {
        responses: Mutex<Vec<Result<CommandOutput, RunFailure>>>,
        commands: Mutex<Vec<String>>,
    }

    impl FakeRunner {
        fn with_outputs(outputs: Vec<CommandOutput>) -> Self {
            Self {
                responses: Mutex::new(outputs.into_iter().map(Ok).collect()),
                commands: Mutex::new(Vec::new()),
            }
        }

        fn with_failure(failure: CommandOutput) -> Self {
            Self {
                responses: Mutex::new(vec![Ok(failure)]),
                commands: Mutex::new(Vec::new()),
            }
        }

        fn commands(&self) -> Vec<String> {
            self.commands.lock().clone()
        }
    }

    impl RemoteCommandRunner for FakeRunner {
        fn run(
            &self,
            _target: &SshTarget,
            remote_command: &str,
            _timeout: Duration,
        ) -> Result<CommandOutput, RunFailure> {
            self.commands.lock().push(remote_command.to_string());
            let mut responses = self.responses.lock();
            if responses.is_empty() {
                return Err(RunFailure::Io("no fake response queued".to_string()));
            }
            responses.remove(0)
        }
    }

    fn target() -> SshTarget {
        SshTarget {
            id: "ssh-1".to_string(),
            label: "box".to_string(),
            owner: None,
            config_host: Some("box".to_string()),
            host: "box.example.com".to_string(),
            port: 22,
            username: "deploy".to_string(),
            identity_file: None,
            identity_agent: None,
            identities_only: None,
            gssapi_authentication: None,
            proxy_command: None,
            jump_host: None,
            source: Some("manual".to_string()),
            relay_grace_period_seconds: None,
            last_required_passphrase: None,
            port_forwards: None,
            system_ssh_connection_reuse: None,
            generation: Some(1),
        }
    }

    fn ok(stdout: &str) -> CommandOutput {
        CommandOutput {
            success: true,
            status_code: Some(0),
            stdout: stdout.to_string(),
            stderr: String::new(),
        }
    }

    fn listing_stdout() -> String {
        "P\0/home/deploy\0f\012\0notes.md\0d\00\0projects\0f\00\0a file with space.txt\0".to_string()
    }

    #[test]
    fn probe_reports_git_availability_and_checkout_state() {
        let stdout = format!("G\0{}\0R\0{}\0", "1", "0");
        let runner = FakeRunner::with_outputs(vec![ok(&stdout)]);
        let probe = probe_remote_git_with_runner(&runner, &target(), "~/orca/projects")
            .expect("probe parses");

        assert!(probe.git_available);
        assert!(!probe.is_git_repository);
        assert!(runner.commands()[0].contains("~/orca/projects"));
    }

    #[test]
    fn probe_reports_missing_git_without_a_checkout() {
        let stdout = format!("G\0{}\0R\0{}\0", "0", "0");
        let runner = FakeRunner::with_outputs(vec![ok(&stdout)]);
        let probe =
            probe_remote_git_with_runner(&runner, &target(), "/srv/app").expect("probe parses");

        assert!(!probe.git_available);
        assert!(!probe.is_git_repository);
    }

    #[test]
    fn browse_lists_sorted_entries_with_absolute_paths() {
        let runner = FakeRunner::with_outputs(vec![ok(&listing_stdout())]);
        let listing =
            browse_remote_dir_with_runner(&runner, &target(), "~").expect("listing parses");

        assert_eq!(listing.resolved_path, "/home/deploy");
        assert_eq!(listing.entries.len(), 3);
        // Directories first, then files in name order.
        assert_eq!(listing.entries[0].name, "projects");
        assert_eq!(listing.entries[0].kind, "dir");
        assert_eq!(listing.entries[0].path, "/home/deploy/projects");
        assert_eq!(listing.entries[0].size, None);
        assert_eq!(listing.entries[1].name, "a file with space.txt");
        assert_eq!(listing.entries[1].kind, "file");
        assert_eq!(listing.entries[1].size, Some(0));
        assert_eq!(listing.entries[1].path, "/home/deploy/a file with space.txt");
        assert_eq!(listing.entries[2].name, "notes.md");
        assert_eq!(listing.entries[2].size, Some(12));
    }

    #[test]
    fn browse_quotes_the_user_path_instead_of_interpolating_it() {
        let runner = FakeRunner::with_outputs(vec![ok(&listing_stdout())]);
        browse_remote_dir_with_runner(&runner, &target(), "~/my repo's dir").expect("listing");

        let command = &runner.commands()[0];
        assert!(command.starts_with("sh -c '"));
        // The hostile path is one quoted argument after the constant script.
        assert!(command.contains("'~/my repo'\\''s dir'"));
        assert!(!command.contains("cd '~/my repo's dir'"));
    }

    #[test]
    fn browse_rejects_paths_that_would_break_the_argument_boundary() {
        let runner = FakeRunner::with_outputs(vec![ok(&listing_stdout())]);
        let error = browse_remote_dir_with_runner(&runner, &target(), "/tmp\nrm -rf /")
            .expect_err("control characters are rejected");
        assert!(error.contains("control characters"));
        assert!(runner.commands().is_empty());

        let error = browse_remote_dir_with_runner(&runner, &target(), "-oProxyCommand=id")
            .expect_err("option-like paths are rejected");
        assert!(error.contains("must not start with '-'"));
        assert!(runner.commands().is_empty());
    }

    #[test]
    fn browse_accepts_the_filesystem_root() {
        // The picker walks up to `/`; a read-only listing there must not be blocked.
        let runner = FakeRunner::with_outputs(vec![ok("P\0/\0d\00\0home\0")]);
        let listing = browse_remote_dir_with_runner(&runner, &target(), "/").expect("root listing");
        assert_eq!(listing.resolved_path, "/");
        assert_eq!(listing.entries[0].path, "/home");
    }

    #[test]
    fn browse_surfaces_the_remote_stderr_when_the_directory_is_missing() {
        let runner = FakeRunner::with_failure(CommandOutput {
            success: false,
            status_code: Some(66),
            stdout: String::new(),
            stderr: "Cannot open directory: /nope\n".to_string(),
        });
        let error =
            browse_remote_dir_with_runner(&runner, &target(), "/nope").expect_err("failure");
        assert_eq!(error, "Cannot open directory: /nope");
    }

    #[test]
    fn clone_derives_the_git_folder_name_and_returns_the_remote_path() {
        let runner = FakeRunner::with_outputs(vec![ok("P\0/home/deploy/code/widgets\0")]);
        let result = clone_remote_repository_with_runner(
            &runner,
            &target(),
            "https://github.com/acme/widgets.git",
            "~/code",
            None,
        )
        .expect("clone result");

        assert_eq!(result.path, "/home/deploy/code/widgets");
        let command = &runner.commands()[0];
        // The script is constant; url/destination/folder travel as quoted arguments.
        assert!(command.contains("git clone -- \"$url\" \"$folder\""));
        assert!(command.ends_with("'https://github.com/acme/widgets.git' '~/code' 'widgets'"));
    }

    #[test]
    fn clone_accepts_an_explicit_name_and_rejects_path_segments() {
        let runner = FakeRunner::with_outputs(vec![ok("P\0/srv/app\0")]);
        let result = clone_remote_repository_with_runner(
            &runner,
            &target(),
            "git@github.com:acme/widgets.git",
            "/srv",
            Some("app"),
        )
        .expect("clone result");
        assert_eq!(result.path, "/srv/app");

        let error = clone_remote_repository_with_runner(
            &runner,
            &target(),
            "git@github.com:acme/widgets.git",
            "/srv",
            Some("../escape"),
        )
        .expect_err("path separator rejected");
        assert!(error.contains("path separator"));
    }

    #[test]
    fn clone_reports_git_stderr_on_failure() {
        let runner = FakeRunner::with_failure(CommandOutput {
            success: false,
            status_code: Some(128),
            stdout: "P\0/home/deploy/code/widgets\0".to_string(),
            stderr: "fatal: repository 'nope' does not exist\n".to_string(),
        });
        let error = clone_remote_repository_with_runner(
            &runner,
            &target(),
            "https://example.com/nope.git",
            "~/code",
            None,
        )
        .expect_err("clone fails");
        assert_eq!(error, "fatal: repository 'nope' does not exist");
    }

    #[test]
    fn repository_folder_name_matches_git_clone_naming() {
        assert_eq!(
            repository_folder_name("https://github.com/acme/widgets.git"),
            "widgets"
        );
        assert_eq!(
            repository_folder_name("git@github.com:acme/widgets.git"),
            "widgets"
        );
        assert_eq!(repository_folder_name("https://github.com/acme/widgets/"), "widgets");
    }

    #[test]
    fn create_project_passes_the_init_flag_and_returns_the_path() {
        let runner = FakeRunner::with_outputs(vec![ok("P\0/srv/projects/demo\0")]);
        let result = create_remote_project_with_runner(
            &runner,
            &target(),
            "~/projects",
            Some("demo"),
            true,
        )
        .expect("create result");

        assert_eq!(result.path, "/srv/projects/demo");
        let command = &runner.commands()[0];
        assert!(command.contains("'~/projects' 'demo' '1'"));
        assert!(command.contains("git -C \"$target\" init"));
    }

    #[test]
    fn create_project_without_a_name_targets_the_path_itself() {
        let runner = FakeRunner::with_outputs(vec![ok("P\0/srv/projects/demo\0")]);
        create_remote_project_with_runner(&runner, &target(), "/srv/projects/demo", None, false)
            .expect("create result");
        let command = &runner.commands()[0];
        assert!(command.contains("'/srv/projects/demo' '' '0'"));
    }

    #[test]
    fn create_project_rejects_a_name_that_escapes_the_parent() {
        let runner = FakeRunner::with_outputs(vec![ok("P\0/srv/x\0")]);
        let error = create_remote_project_with_runner(
            &runner,
            &target(),
            "/srv",
            Some(".."),
            true,
        )
        .expect_err("dot name rejected");
        assert!(error.contains("must not start with a dot"));
        assert!(runner.commands().is_empty());
    }

    #[test]
    fn delete_worktree_reports_the_preserved_branch_from_porcelain() {
        let porcelain = "worktree /srv/repo\n\
HEAD 1111111111111111111111111111111111111111\n\
branch refs/heads/feat/login\n\
\n\
worktree /srv/wt/login\n\
HEAD 2222222222222222222222222222222222222222\n\
branch refs/heads/feat/login-wt\n";
        let runner = FakeRunner::with_outputs(vec![
            ok(porcelain),
            ok("R\0d\0B\0feat/login-wt\0"),
        ]);

        let result = delete_remote_worktree_with_runner(
            &runner,
            &target(),
            "/srv/repo",
            "/srv/wt/login",
            true,
        )
        .expect("delete result");

        assert!(result.removed);
        assert_eq!(
            result.preserved_branches,
            vec![SshRemotePreservedBranch {
                branch_name: "feat/login-wt".to_string(),
                head: "2222222222222222222222222222222222222222".to_string(),
            }]
        );
        let commands = runner.commands();
        assert!(commands[0].contains("worktree list --porcelain"));
        // Force + the branch name travel as quoted arguments, never interpolated.
        assert!(commands[1].contains("'/srv/repo' '/srv/wt/login' '1' 'feat/login-wt'"));
    }

    #[test]
    fn delete_worktree_without_force_does_not_report_a_removal() {
        let runner = FakeRunner::with_outputs(vec![ok(""), ok("R\0f\0")]);
        let error = delete_remote_worktree_with_runner(
            &runner,
            &target(),
            "/srv/repo",
            "/srv/wt/login",
            false,
        )
        .expect_err("not removed");
        assert!(error.contains("did not remove the worktree"));
        let commands = runner.commands();
        assert!(commands[1].contains("'/srv/repo' '/srv/wt/login' '0' ''"));
    }

    #[test]
    fn delete_worktree_rejects_the_root_as_a_worktree() {
        let runner = FakeRunner::with_outputs(vec![]);
        let error = delete_remote_worktree_with_runner(&runner, &target(), "/srv/repo", "/", true)
            .expect_err("root rejected");
        assert!(error.contains("must point inside a directory"));
        assert!(runner.commands().is_empty());
    }

    #[test]
    fn exec_args_reuse_the_non_interactive_ssh_options() {
        let args = build_ssh_exec_args(&target(), "true");
        assert!(args.windows(2).any(|pair| pair == ["-o", "BatchMode=yes"]));
        assert!(args.windows(2).any(|pair| pair == ["-o", "ConnectTimeout=8"]));
        assert_eq!(args[args.len() - 2], "deploy@box.example.com");
        assert_eq!(args[args.len() - 1], "true");
    }

    #[test]
    fn shell_quote_escapes_single_quotes_and_keeps_spaces() {
        assert_eq!(shell_quote("a b"), "'a b'");
        assert_eq!(shell_quote("it's"), "'it'\\''s'");
        assert_eq!(shell_quote("$HOME `id`"), "'$HOME `id`'");
    }

    #[test]
    fn parse_listing_rejects_a_missing_header() {
        assert!(parse_listing_output("d\00\0x\0").is_err());
        assert!(parse_listing_output("").is_err());
    }

    fn run_local_script(script: &str, args: &[&str]) -> std::process::Output {
        let mut command = std::process::Command::new("sh");
        command.arg("-c").arg(script).arg(REMOTE_PROGRAM_NAME).args(args);
        command.output().expect("run the remote script through a local sh")
    }

    fn temp_dir(label: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "hydra-ssh-remote-{label}-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).expect("temp dir");
        dir
    }

    #[test]
    fn listing_script_lists_a_real_directory_with_nul_records() {
        let dir = temp_dir("list");
        std::fs::create_dir_all(dir.join("projects")).unwrap();
        std::fs::write(dir.join("notes.md"), "hello").unwrap();
        std::fs::write(dir.join(".hidden"), "").unwrap();

        let output = run_local_script(LIST_SCRIPT, &[dir.to_str().unwrap()]);
        assert!(output.status.success(), "stderr: {}", String::from_utf8_lossy(&output.stderr));

        let listing =
            parse_listing_output(&String::from_utf8_lossy(&output.stdout)).expect("listing");
        assert_eq!(listing.resolved_path, dir.to_str().unwrap());
        let names: Vec<&str> = listing.entries.iter().map(|entry| entry.name.as_str()).collect();
        assert!(names.contains(&"projects"));
        assert!(names.contains(&"notes.md"));
        assert!(names.contains(&".hidden"));
        let notes = listing.entries.iter().find(|entry| entry.name == "notes.md").unwrap();
        assert_eq!(notes.kind, "file");
        assert_eq!(notes.size, Some(5));
        assert_eq!(notes.path, dir.join("notes.md").to_str().unwrap());
        let projects = listing.entries.iter().find(|entry| entry.name == "projects").unwrap();
        assert_eq!(projects.kind, "dir");
        assert!(projects.size.is_none());

        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn listing_script_reports_a_missing_directory_on_stderr() {
        let output = run_local_script(LIST_SCRIPT, &["/definitely/missing/hydra-dir"]);
        assert!(!output.status.success());
        assert!(String::from_utf8_lossy(&output.stderr).contains("Cannot open directory"));
    }

    #[test]
    fn create_script_creates_the_directory_and_initializes_git() {
        let parent = temp_dir("create");
        let parent_str = parent.to_str().unwrap().to_string();

        let output = run_local_script(CREATE_PROJECT_SCRIPT, &[&parent_str, "demo", "1"]);
        assert!(output.status.success(), "stderr: {}", String::from_utf8_lossy(&output.stderr));
        let path = parse_path_header(&String::from_utf8_lossy(&output.stdout), "project")
            .expect("reported path");
        assert_eq!(path, parent.join("demo").to_str().unwrap());
        assert!(parent.join("demo/.git").is_dir());

        // An existing target is an explicit failure, never a silent merge.
        let again = run_local_script(CREATE_PROJECT_SCRIPT, &[&parent_str, "demo", "1"]);
        assert!(!again.status.success());
        assert!(String::from_utf8_lossy(&again.stderr).contains("already exists"));

        let _ = std::fs::remove_dir_all(parent);
    }

    #[test]
    fn delete_script_removes_the_worktree_and_reports_the_kept_branch() {
        let dir = temp_dir("delete");
        let repo = dir.join("repo");
        let worktree = dir.join("wt");
        std::fs::create_dir_all(&repo).unwrap();
        for args in [
            vec!["init"],
            vec!["config", "user.email", "test@test.com"],
            vec!["config", "user.name", "Test"],
            vec!["commit", "--allow-empty", "-m", "init"],
        ] {
            let status = std::process::Command::new("git")
                .args(&args)
                .current_dir(&repo)
                .output()
                .expect("git");
            assert!(status.status.success(), "git {:?}: {}", args, String::from_utf8_lossy(&status.stderr));
        }
        let add = std::process::Command::new("git")
            .args([
                "worktree",
                "add",
                "-b",
                "feat/local",
                worktree.to_str().unwrap(),
            ])
            .current_dir(&repo)
            .output()
            .expect("git worktree add");
        assert!(add.status.success(), "{}", String::from_utf8_lossy(&add.stderr));

        let output = run_local_script(
            DELETE_WORKTREE_SCRIPT,
            &[
                repo.to_str().unwrap(),
                worktree.to_str().unwrap(),
                "1",
                "feat/local",
            ],
        );
        assert!(output.status.success(), "stderr: {}", String::from_utf8_lossy(&output.stderr));
        let stdout = String::from_utf8_lossy(&output.stdout);
        assert!(parse_removal_output(&stdout));
        assert_eq!(parse_preserved_branch(&stdout).as_deref(), Some("feat/local"));
        assert!(!worktree.exists());
        assert!(std::process::Command::new("git")
            .args(["rev-parse", "--verify", "refs/heads/feat/local"])
            .current_dir(&repo)
            .output()
            .expect("git rev-parse")
            .status
            .success());

        let _ = std::fs::remove_dir_all(dir);
    }
}
