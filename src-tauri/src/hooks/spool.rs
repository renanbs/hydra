//! Spool replayer (T3): drain `$ENDPOINT_DIR/spool/` before/after the
//! listener binds. Pure [`drain_spool`] plus a thin [`SpoolWatcher`]; the
//! sidecar/pipeline bridge is T6, not here.
//!
//! Port of the vendored Orca `agent-hook-spool.ts` (`readSpoolFile` +
//! `drainAgentHookSpool`) with the Hydra decisions applied: opaque `paneKey`
//! (= `session_id`, never split), [`crate::hooks::envelope`] for the token
//! fence and the listener envelope shape. T6 owns delivery into the sidecar;
//! this module only replays JSONL lines into [`SpoolRecord`]s and truncates
//! the files in place, never unlinks them (a hook writer may hold an append
//! handle on the inode).

use std::fs;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Deserialize;

use super::envelope::{launch_token_hash, HookEnvelope};

/// Max bytes per spool file. Mirrors Orca `AGENT_HOOK_SPOOL_MAX_BYTES`.
pub const SPOOL_MAX_BYTES: u64 = 5 * 1024 * 1024;
/// Max files drained per pass. Mirrors Orca `AGENT_HOOK_SPOOL_MAX_FILES`.
pub const SPOOL_MAX_FILES: usize = 1024;
/// Max record/file age in ms. Mirrors Orca `AGENT_HOOK_SPOOL_MAX_AGE_MS`.
pub const SPOOL_MAX_AGE_MS: i64 = 7 * 24 * 60 * 60 * 1000;

/// One JSONL spool line. Mirrors the TS `SpoolRecord` shape.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpoolRecord {
    pub pane_key: String,
    pub tab_id: Option<String>,
    pub worktree_id: Option<String>,
    pub env: Option<String>,
    pub version: Option<String>,
    pub launch_token: Option<String>,
    pub hook_event_name: Option<String>,
    pub source: String,
    pub payload: serde_json::Value,
    pub received_at: i64,
}

impl SpoolRecord {
    /// Restore the listener envelope shape (`buildSpoolHookBody` in TS).
    /// Blank optionals normalize to `None`, matching the envelope parser's
    /// `opt_field` rule; `pane_key` stays verbatim (opaque session id).
    pub fn envelope(&self) -> HookEnvelope {
        HookEnvelope {
            pane_key: self.pane_key.clone(),
            tab_id: opt(&self.tab_id),
            launch_token: opt(&self.launch_token),
            worktree_id: opt(&self.worktree_id),
            env: opt(&self.env),
            version: opt(&self.version),
            hook_event_name: opt(&self.hook_event_name),
            payload: self.payload.clone(),
        }
    }
}

fn opt(value: &Option<String>) -> Option<String> {
    value
        .as_deref()
        .map(str::trim)
        .filter(|trimmed| !trimmed.is_empty())
        .map(str::to_string)
}

/// Wall clock in ms since the Unix epoch.
pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis().min(i64::MAX as u128) as i64)
        .unwrap_or(0)
}

/// Drain `dir` (the `spool/` dir itself) into replayable records.
///
/// Semantics mirror `drainAgentHookSpool`: non-empty regular files oldest
/// first, capped at [`SPOOL_MAX_FILES`]; each file is consumed through its
/// last complete `\n` line and truncated in place preserving any torn tail.
/// A record replays only when its `launchToken` hash matches the live
/// session token, or when the session has no live token at all (unknown
/// pane, same as the TS `expected && actual !== expected` fence). Stale
/// records (older than [`SPOOL_MAX_AGE_MS`]), stale files, and oversize
/// files are purged. Missing dirs, subdirs, and unreadable files drain
/// empty; empty files are retained untouched for live append handles.
pub fn drain_spool<F: Fn(&str) -> Option<String>>(
    dir: &Path,
    live_token_hash: &F,
    now_ms: i64,
) -> Vec<SpoolRecord> {
    let entries = fs::read_dir(dir);
    let mut candidates: Vec<(PathBuf, SystemTime)> = Vec::new();
    let Ok(entries) = entries else {
        return Vec::new();
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(meta) = fs::metadata(&path) else {
            continue;
        };
        if !meta.is_file() || meta.len() == 0 {
            continue;
        }
        let Ok(mtime) = meta.modified() else {
            continue;
        };
        candidates.push((path, mtime));
    }
    candidates.sort_by(|a, b| a.1.cmp(&b.1).then_with(|| a.0.cmp(&b.0)));
    candidates.truncate(SPOOL_MAX_FILES);

    let mut drained = Vec::new();
    for (path, mtime) in &candidates {
        if file_age_ms(*mtime, now_ms) > SPOOL_MAX_AGE_MS {
            let _ = truncate_file(path, 0, 0);
            continue;
        }
        let Ok(meta) = fs::metadata(path) else {
            continue;
        };
        if meta.len() > SPOOL_MAX_BYTES {
            let _ = truncate_file(path, 0, 0);
            continue;
        }
        let Ok(bytes) = fs::read(path) else {
            continue;
        };
        let (records, consumed) = parse_spool_bytes(&bytes, now_ms);
        for record in records {
            if record.pane_key.trim().is_empty() {
                continue;
            }
            let expected = live_token_hash(&record.pane_key);
            let actual = record
                .launch_token
                .as_deref()
                .and_then(|token| launch_token_hash(token));
            if expected.is_some() && actual != expected {
                continue;
            }
            drained.push(record);
        }
        let _ = truncate_file(path, consumed, bytes.len() as u64);
    }
    drained
}

/// Parse complete `\n`-terminated lines; return the records plus the byte
/// offset through the last complete line. A torn trailing line (no `\n`
/// yet) is left unconsumed so a writer still finishing it is not truncated
/// away. Garbage lines are discarded while later complete lines still
/// replay, exactly like the TS `readSpoolFile`.
fn parse_spool_bytes(bytes: &[u8], now_ms: i64) -> (Vec<SpoolRecord>, u64) {
    let mut records = Vec::new();
    let mut consumed: u64 = 0;
    let mut start = 0;
    while let Some(rel) = bytes[start..].iter().position(|&b| b == b'\n') {
        let end = start + rel;
        consumed = (end + 1) as u64;
        let line = &bytes[start..end];
        start = end + 1;
        if line.is_empty() {
            continue;
        }
        let Ok(record) = serde_json::from_slice::<SpoolRecord>(line) else {
            continue;
        };
        if record.received_at < now_ms - SPOOL_MAX_AGE_MS {
            continue;
        }
        records.push(record);
    }
    (records, consumed)
}

/// Truncate `path` in place to the unread tail: with `size > consumed` the
/// tail (bytes appended between the read and now) shifts to the front,
/// otherwise the file goes to zero. The inode is never replaced or
/// unlinked. Failures are ignored (fail-open: a concurrent removal is
/// harmless, the next pass retries).
fn truncate_file(path: &Path, consumed: u64, size: u64) -> std::io::Result<()> {
    let mut file = fs::OpenOptions::new().read(true).write(true).open(path)?;
    if size > consumed {
        let mut tail = vec![0u8; (size - consumed) as usize];
        file.seek(SeekFrom::Start(consumed))?;
        file.read_exact(&mut tail)?;
        file.seek(SeekFrom::Start(0))?;
        file.write_all(&tail)?;
        file.set_len(tail.len() as u64)?;
    } else {
        file.set_len(0)?;
    }
    Ok(())
}

fn file_age_ms(mtime: SystemTime, now_ms: i64) -> i64 {
    match mtime.duration_since(UNIX_EPOCH) {
        Ok(elapsed) => {
            let mtime_ms = elapsed.as_millis().min(i64::MAX as u128) as i64;
            now_ms.saturating_sub(mtime_ms)
        }
        Err(_) => 0,
    }
}

/// Thin watcher over an owned spool dir. Drains before/after the listener
/// binds; the T6 pipeline owns everything downstream of [`drain_spool`].
pub struct SpoolWatcher {
    dir: PathBuf,
}

impl SpoolWatcher {
    pub fn new(dir: PathBuf) -> Self {
        Self { dir }
    }

    pub fn spool_dir(&self) -> &Path {
        &self.dir
    }

    pub fn drain<F: Fn(&str) -> Option<String>>(&self, live_token_hash: &F) -> Vec<SpoolRecord> {
        drain_spool(&self.dir, live_token_hash, now_ms())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hooks::envelope::{launch_token_hash, HookEnvelope};
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    const NOW_MS: i64 = 1_750_000_000_000;

    fn temp_spool(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "hydra-hook-spool-test-{}-{}",
            std::process::id(),
            tag
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("temp spool dir");
        dir
    }

    fn line(value: serde_json::Value) -> Vec<u8> {
        let mut bytes = serde_json::to_vec(&value).expect("spool line serializes");
        bytes.push(b'\n');
        bytes
    }

    fn record(pane: &str, token: &str, received_at: i64) -> serde_json::Value {
        serde_json::json!({
            "paneKey": pane,
            "tabId": "tab-1",
            "worktreeId": "wt-1",
            "env": "production",
            "version": "1",
            "launchToken": token,
            "hookEventName": "Stop",
            "source": "claude",
            "payload": {"hook_event_name": "Stop"},
            "receivedAt": received_at,
        })
    }

    fn no_live(_: &str) -> Option<String> {
        None
    }

    #[cfg(unix)]
    fn backdate_mtime(path: &Path, age_secs: u64) {
        use std::ffi::CString;
        use std::os::unix::ffi::OsStrExt;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("wall clock")
            .as_secs();
        let atime = libc::timespec {
            tv_sec: now as libc::time_t,
            tv_nsec: 0,
        };
        let mtime = libc::timespec {
            tv_sec: now.saturating_sub(age_secs) as libc::time_t,
            tv_nsec: 0,
        };
        let times = [atime, mtime];
        let cpath = CString::new(path.as_os_str().as_bytes()).expect("cstring path");
        let rc = unsafe { libc::utimensat(libc::AT_FDCWD, cpath.as_ptr(), times.as_ptr(), 0) };
        assert_eq!(rc, 0, "backdate mtime");
    }

    #[test]
    fn torn_trailing_line_survives_until_completed() {
        let dir = temp_spool("torn");
        let path = dir.join("pane-sess.jsonl");
        let pending = line(record("sess-1", "tok", NOW_MS));
        let cut = pending.len() - 20;
        let mut bytes = line(record("sess-1", "tok", NOW_MS));
        bytes.extend_from_slice(b"this is not json\n");
        bytes.extend_from_slice(line(record("sess-1", "tok", NOW_MS)).as_slice());
        bytes.extend_from_slice(&pending[..cut]);
        fs::write(&path, &bytes).expect("write spool");

        let records = drain_spool(&dir, &no_live, NOW_MS);
        assert_eq!(
            records.len(),
            2,
            "complete lines replay in order, garbage discarded"
        );
        assert_eq!(records[0].pane_key, "sess-1");
        assert_eq!(
            fs::read(&path).expect("read tail"),
            &pending[..cut],
            "torn tail survives the in-place truncation"
        );

        let mut rest = fs::read(&path).expect("read tail");
        rest.extend_from_slice(&pending[cut..]);
        fs::write(&path, &rest).expect("complete torn line");
        let records = drain_spool(&dir, &no_live, NOW_MS);
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].hook_event_name.as_deref(), Some("Stop"));
        assert_eq!(fs::read(&path).expect("drained").len(), 0);
    }

    #[test]
    fn foreign_launch_token_is_fenced_out() {
        let dir = temp_spool("fence");
        let path = dir.join("pane-sess-a.jsonl");
        let expected = launch_token_hash("tok-a").expect("hash");
        let mut bytes = line(record("sess-a", "tok-a", NOW_MS));
        bytes.extend_from_slice(line(record("sess-a", "tok-evil", NOW_MS)).as_slice());
        bytes.extend_from_slice(line(record("sess-new", "tok-zzz", NOW_MS)).as_slice());
        fs::write(&path, &bytes).expect("write spool");

        let live = |pane: &str| (pane == "sess-a").then(|| expected.clone());
        let records = drain_spool(&dir, &live, NOW_MS);
        assert_eq!(
            records.len(),
            2,
            "live token kept, unknown pane passes, foreign token fenced"
        );
        assert_eq!(records[0].pane_key, "sess-a");
        assert_eq!(records[0].launch_token.as_deref(), Some("tok-a"));
        assert_eq!(records[1].pane_key, "sess-new");
        assert_eq!(
            fs::read(&path).expect("drained").len(),
            0,
            "fenced lines are still consumed"
        );
    }

    #[test]
    fn spool_record_builds_listener_envelope() {
        let dir = temp_spool("envelope");
        let path = dir.join("pane-sess.jsonl");
        fs::write(&path, line(record("sess-9", "tok-9", NOW_MS))).expect("write spool");
        let records = drain_spool(&dir, &no_live, NOW_MS);
        assert_eq!(records.len(), 1);
        assert_eq!(
            records[0].envelope(),
            HookEnvelope {
                pane_key: "sess-9".to_string(),
                tab_id: Some("tab-1".to_string()),
                launch_token: Some("tok-9".to_string()),
                worktree_id: Some("wt-1".to_string()),
                env: Some("production".to_string()),
                version: Some("1".to_string()),
                hook_event_name: Some("Stop".to_string()),
                payload: serde_json::json!({"hook_event_name": "Stop"}),
            }
        );
    }

    #[test]
    fn oversize_file_is_truncated_without_records() {
        let dir = temp_spool("oversize");
        let path = dir.join("pane-big.jsonl");
        fs::write(&path, vec![b'x'; SPOOL_MAX_BYTES as usize + 1]).expect("write oversize");
        let records = drain_spool(&dir, &no_live, NOW_MS);
        assert!(records.is_empty(), "oversize file yields no records");
        assert_eq!(
            fs::metadata(&path).expect("stat").len(),
            0,
            "oversize file truncated in place"
        );
    }

    #[test]
    fn file_cap_drains_oldest_first() {
        let dir = temp_spool("cap");
        for i in 0..=SPOOL_MAX_FILES {
            fs::write(
                dir.join(format!("pane-{i:04}.jsonl")),
                line(record("sess-cap", "tok", NOW_MS)),
            )
            .expect("write spool");
        }
        let records = drain_spool(&dir, &no_live, NOW_MS);
        assert_eq!(records.len(), SPOOL_MAX_FILES);
        let remaining: Vec<_> = fs::read_dir(&dir)
            .expect("list")
            .flatten()
            .filter(|e| {
                fs::metadata(e.path())
                    .map(|m| m.len() > 0)
                    .unwrap_or(false)
            })
            .collect();
        assert_eq!(remaining.len(), 1, "one file left for the next pass");
    }

    #[test]
    fn stale_records_and_stale_files_are_purged() {
        let dir = temp_spool("age");
        let path = dir.join("pane-old.jsonl");
        let mut bytes = line(record("sess-old", "tok", NOW_MS - SPOOL_MAX_AGE_MS - 1));
        bytes.extend_from_slice(
            line(record("sess-edge", "tok", NOW_MS - SPOOL_MAX_AGE_MS)).as_slice(),
        );
        fs::write(&path, &bytes).expect("write spool");
        let records = drain_spool(&dir, &no_live, NOW_MS);
        assert_eq!(records.len(), 1, "boundary age kept, older dropped");
        assert_eq!(records[0].pane_key, "sess-edge");
    }

    #[cfg(unix)]
    #[test]
    fn stale_file_mtime_is_purged_without_reading() {
        let now = now_ms();
        let dir = temp_spool("mtime");
        let path = dir.join("pane-stale.jsonl");
        fs::write(&path, line(record("sess-stale", "tok", now))).expect("write spool");
        backdate_mtime(&path, 8 * 24 * 60 * 60);
        let records = drain_spool(&dir, &no_live, now);
        assert!(
            records.is_empty(),
            "8-day-old file purged even with a fresh record"
        );
        assert_eq!(fs::metadata(&path).expect("stat").len(), 0);
    }

    #[test]
    fn missing_dir_subdirs_and_empty_files_drain_empty() {
        let dir = temp_spool("missing");
        assert!(drain_spool(&dir.join("nope"), &no_live, NOW_MS).is_empty());
        fs::create_dir_all(dir.join("pane-subdir.jsonl")).expect("subdir");
        let empty = dir.join("pane-empty.jsonl");
        fs::write(&empty, b"").expect("empty spool");
        assert!(
            drain_spool(&dir, &no_live, NOW_MS).is_empty(),
            "directories and empty files are never parsed"
        );
        assert!(empty.exists(), "empty files are retained for append handles");
    }

    #[test]
    fn watcher_drains_the_owned_spool_dir() {
        let now = now_ms();
        let dir = temp_spool("watcher");
        fs::write(
            dir.join("pane-w.jsonl"),
            line(record("sess-w", "tok", now)),
        )
        .expect("write spool");
        let watcher = SpoolWatcher::new(dir.clone());
        assert_eq!(watcher.spool_dir(), dir.as_path());
        let records = watcher.drain(&no_live);
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].pane_key, "sess-w");
    }
}
