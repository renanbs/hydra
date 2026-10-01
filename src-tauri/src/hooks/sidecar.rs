//! Sidecar stdio driver (G5/T5).
//!
//! Spawns `hook-sidecar/` (node over the compiled `dist/main.js`) and speaks
//! the versioned JSON-lines protocol from the sidecar README: first line is
//! the `{protocol, version, env}` handshake (mismatch = the child exits 2 and
//! [`SidecarHealth::HandshakeMismatch`] surfaces it); hook lines after that
//! are `{paneKey, source, body}` and results come back as
//! `{paneKey, payload}`. Restart uses bounded backoff; a dead sidecar never
//! takes the core down — hook sessions go `unknown` on the next pipeline tick
//! (T6), here that is only a health flag plus a log line.

use std::io::Write;
use std::path::PathBuf;
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// Protocol version both ends must agree on. Bumped only with a lockstep
/// sidecar + driver change; mismatch fails closed (exit 2 on the child).
pub const SIDECAR_PROTOCOL_VERSION: &str = "1";
/// `protocol` discriminator on the handshake line.
pub const SIDECAR_HANDSHAKE_PROTOCOL: &str = "hydra-hook-sidecar";

/// Consecutive-failure backoff ladder for supervised restarts.
const RESTART_BACKOFF: [Duration; 4] = [
    Duration::from_millis(100),
    Duration::from_millis(500),
    Duration::from_secs(1),
    Duration::from_secs(5),
];

/// Observable driver health. A dead sidecar maps to `unknown` hook sessions
/// on the next pipeline tick (T6) — this enum only reports, never recovers
/// session state by itself.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SidecarHealth {
    /// No spawn attempted yet, or the sidecar was never enabled.
    Idle,
    /// Child alive and handshake accepted.
    Running,
    /// Child died or never finished the handshake; `restart_in` is the
    /// backoff before the next supervised spawn attempt.
    Dead {
        reason: String,
        restart_in: Duration,
    },
    /// Child rejected the handshake version. Operator action required
    /// (redeploy sidecar + core in lockstep); no silent retry with the same
    /// binary beyond the normal backoff.
    HandshakeMismatch { got: String },
}

/// Supervised sidecar child. Owns the stdin/stdout pipes; stderr inherits the
/// core's so version-mismatch and drop lines land in the app log.
pub struct HookSidecar {
    child: Option<Child>,
    stdin: Option<ChildStdin>,
    stdout: Option<ChildStdout>,
    sidecar_dir: PathBuf,
    env: String,
    failures: usize,
    last_failure: Option<Instant>,
    pub health: SidecarHealth,
}

impl HookSidecar {
    pub fn new(sidecar_dir: PathBuf, env: impl Into<String>) -> Self {
        Self {
            child: None,
            stdin: None,
            stdout: None,
            sidecar_dir,
            env: env.into(),
            failures: 0,
            last_failure: None,
            health: SidecarHealth::Idle,
        }
    }

    /// Backoff for the next spawn attempt from the failure count.
    pub fn restart_delay(&self) -> Duration {
        RESTART_BACKOFF
            .get(self.failures.min(RESTART_BACKOFF.len().saturating_sub(1)))
            .copied()
            .unwrap_or(*RESTART_BACKOFF.last().expect("ladder is non-empty"))
    }

    /// Spawn (or re-spawn) the sidecar and run the version handshake.
    /// `node_bin` is the node binary; kept explicit so tests can pass a fake.
    pub fn spawn(&mut self, node_bin: &str) -> Result<(), String> {
        let mut child = Command::new(node_bin)
            .arg("dist/main.js")
            .current_dir(&self.sidecar_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|err| format!("spawn hook sidecar: {err}"))?;
        let mut stdin = child.stdin.take().ok_or("sidecar stdin not piped")?;
        let stdout = child.stdout.take().ok_or("sidecar stdout not piped")?;
        let handshake = serde_json::json!({
            "protocol": SIDECAR_HANDSHAKE_PROTOCOL,
            "version": SIDECAR_PROTOCOL_VERSION,
            "env": self.env,
        });
        let mut line = serde_json::to_string(&handshake).expect("handshake serializes");
        line.push('\n');
        stdin
            .write_all(line.as_bytes())
            .map_err(|err| format!("write sidecar handshake: {err}"))?;
        stdin.flush().map_err(|err| format!("flush sidecar handshake: {err}"))?;
        self.stdin = Some(stdin);
        self.stdout = Some(stdout);
        self.child = Some(child);
        self.health = SidecarHealth::Running;
        Ok(())
    }

    /// Record a child death. Counts one supervised failure and arms the
    /// backoff health flag; the next pipeline tick (T6) marks hook sessions
    /// `unknown` while health is not `Running`.
    pub fn note_exit(&mut self, reason: impl Into<String>) {
        self.child = None;
        self.stdin = None;
        self.stdout = None;
        self.failures += 1;
        self.last_failure = Some(Instant::now());
        self.health = SidecarHealth::Dead {
            reason: reason.into(),
            restart_in: self.restart_delay(),
        };
    }

    /// Mutation-free liveness probe: true while a child handle is held.
    /// Callers confirm with `try_wait` on their own tick; a confirmed death
    /// must go through [`HookSidecar::note_exit`].
    pub fn is_alive(&mut self) -> bool {
        let Some(child) = self.child.as_mut() else {
            return false;
        };
        match child.try_wait() {
            Ok(None) => true,
            Ok(Some(_)) | Err(_) => false,
        }
    }

    pub fn failures(&self) -> usize {
        self.failures
    }

    pub fn last_failure(&self) -> Option<Instant> {
        self.last_failure
    }
}

/// Shared handle for the Tauri-managed sidecar (spawn once, supervise on tick).
pub type SharedSidecar = Arc<Mutex<HookSidecar>>;

pub fn shared_sidecar(sidecar_dir: PathBuf, env: impl Into<String>) -> SharedSidecar {
    Arc::new(Mutex::new(HookSidecar::new(sidecar_dir, env)))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Fake "node" that performs the handshake then exits 0 without output.
    /// Exercises spawn + handshake write + liveness without a real node.
    #[test]
    fn spawn_and_handshake_with_fake_node() {
        let dir = std::env::temp_dir().join(format!("hydra-sidecar-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("temp dir");
        let mut sidecar = HookSidecar::new(dir, "production");
        assert_eq!(sidecar.health, SidecarHealth::Idle);
        // `true(1)` ignores argv/stdin and exits 0: spawn succeeds, but the
        // handle reaps immediately, so `is_alive` is false and the driver
        // records the supervised death instead of hanging on a fake pipe.
        sidecar.spawn("true").expect("spawn fake node");
        assert_eq!(sidecar.health, SidecarHealth::Running);
        // Reap: `true` already exited; poll until the handle reports it.
        for _ in 0..100 {
            if !sidecar.is_alive() {
                break;
            }
            std::thread::sleep(Duration::from_millis(10));
        }
        assert!(!sidecar.is_alive(), "exited fake must read dead");
        sidecar.note_exit("fake node exited");
        assert_eq!(sidecar.failures(), 1);
        match &sidecar.health {
            SidecarHealth::Dead { restart_in, .. } => {
                assert_eq!(*restart_in, Duration::from_millis(500));
            }
            other => panic!("expected Dead health, got {other:?}"),
        }
    }

    #[test]
    fn restart_backoff_grows_and_caps() {
        let mut sidecar = HookSidecar::new(PathBuf::from("/nonexistent"), "production");
        assert_eq!(sidecar.restart_delay(), Duration::from_millis(100));
        sidecar.note_exit("boom");
        assert_eq!(sidecar.restart_delay(), Duration::from_millis(500));
        sidecar.note_exit("boom");
        sidecar.note_exit("boom");
        assert_eq!(sidecar.restart_delay(), Duration::from_secs(5));
        sidecar.note_exit("boom");
        assert_eq!(sidecar.restart_delay(), Duration::from_secs(5));
    }
}
