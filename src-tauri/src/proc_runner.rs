//! Bounded, cancellable child-process execution shared by the SSH remote
//! commands and the local clone registry.
//!
//! Both pipes are drained by reader threads with a hard byte cap, so a chatty
//! child (`git clone --progress`, a remote `git worktree` warning storm) can
//! neither deadlock on a full pipe nor grow the heap without limit while the
//! parent polls for exit, cancellation, or the deadline.

use std::io::Read;
use std::process::Child;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

/// Byte cap applied to each stream (`stdout` and `stderr`) independently.
pub const OUTPUT_CAP_BYTES: usize = 512 * 1024;

/// Poll interval for `try_wait`; 25ms mirrors the existing SSH probe runner.
const POLL_INTERVAL: Duration = Duration::from_millis(25);

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct CommandOutput {
    pub success: bool,
    pub status_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

impl CommandOutput {
    /// Trimmed stderr, or `None` when the child said nothing.
    pub fn stderr_detail(&self) -> Option<String> {
        let trimmed = self.stderr.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RunFailure {
    Cancelled,
    TimedOut { seconds: u64, stderr: String },
    Io(String),
}

impl RunFailure {
    pub fn message(&self) -> String {
        match self {
            RunFailure::Cancelled => "Command cancelled".to_string(),
            RunFailure::TimedOut { seconds, stderr } => {
                let detail = stderr.trim();
                if detail.is_empty() {
                    format!("Command timed out after {seconds}s")
                } else {
                    format!("Command timed out after {seconds}s: {detail}")
                }
            }
            RunFailure::Io(error) => error.clone(),
        }
    }
}

impl std::fmt::Display for RunFailure {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message())
    }
}

/// Reads one pipe, keeping at most `cap` bytes but draining the rest so the
/// child never blocks on a full pipe.
fn read_capped(mut stream: impl Read, cap: usize) -> String {
    let mut stored: Vec<u8> = Vec::new();
    let mut buffer = [0u8; 8192];
    loop {
        match stream.read(&mut buffer) {
            Ok(0) => break,
            Ok(read) => {
                let room = cap.saturating_sub(stored.len());
                if room > 0 {
                    stored.extend_from_slice(&buffer[..read.min(room)]);
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(_) => break,
        }
    }
    String::from_utf8_lossy(&stored).into_owned()
}

enum Exit {
    Status(std::process::ExitStatus),
    TimedOut,
    Cancelled,
}

/// Waits for `child`, honoring an optional deadline and an optional
/// cancellation flag, and returns the bounded output.
pub fn run_bounded(
    mut child: Child,
    timeout: Option<Duration>,
    cap: usize,
    cancel: Option<&AtomicBool>,
) -> Result<CommandOutput, RunFailure> {
    let stdout_reader = child.stdout.take().map(|stream| {
        std::thread::spawn(move || read_capped(stream, cap))
    });
    let stderr_reader = child.stderr.take().map(|stream| {
        std::thread::spawn(move || read_capped(stream, cap))
    });

    let started = Instant::now();
    let exit = loop {
        if let Some(flag) = cancel {
            if flag.load(Ordering::Relaxed) {
                let _ = child.kill();
                let _ = child.wait();
                break Exit::Cancelled;
            }
        }
        match child.try_wait() {
            Ok(Some(status)) => break Exit::Status(status),
            Ok(None) => {
                if let Some(limit) = timeout {
                    if started.elapsed() >= limit {
                        let _ = child.kill();
                        let _ = child.wait();
                        break Exit::TimedOut;
                    }
                }
                std::thread::sleep(POLL_INTERVAL);
            }
            Err(error) => {
                let _ = child.kill();
                return Err(RunFailure::Io(format!("Failed to wait for child process: {error}")));
            }
        }
    };

    // The readers only finish once the pipe closes, which the kill above forces.
    let stdout = stdout_reader
        .and_then(|handle| handle.join().ok())
        .unwrap_or_default();
    let stderr = stderr_reader
        .and_then(|handle| handle.join().ok())
        .unwrap_or_default();

    match exit {
        Exit::Status(status) => Ok(CommandOutput {
            success: status.success(),
            status_code: status.code(),
            stdout,
            stderr,
        }),
        Exit::TimedOut => Err(RunFailure::TimedOut {
            seconds: timeout.map(|limit| limit.as_secs()).unwrap_or_default(),
            stderr,
        }),
        Exit::Cancelled => Err(RunFailure::Cancelled),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::{Command, Stdio};
    use std::sync::Arc;

    fn child(command: &mut Command) -> Child {
        command
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("spawn test child")
    }

    #[test]
    fn captures_output_and_exit_status() {
        let mut command = Command::new("sh");
        command.args(["-c", "printf 'out'; printf 'err' >&2; exit 3"]);
        let output = run_bounded(child(&mut command), Some(Duration::from_secs(10)), 4096, None)
            .expect("command completes");
        assert!(!output.success);
        assert_eq!(output.status_code, Some(3));
        assert_eq!(output.stdout, "out");
        assert_eq!(output.stderr, "err");
    }

    #[test]
    fn truncates_each_stream_at_the_cap() {
        let mut command = Command::new("sh");
        command.args(["-c", "i=0; while [ $i -lt 200 ]; do printf '0123456789'; i=$((i+1)); done"]);
        let output = run_bounded(child(&mut command), Some(Duration::from_secs(10)), 64, None)
            .expect("command completes");
        assert_eq!(output.stdout.len(), 64);
    }

    #[test]
    fn kills_the_child_on_timeout() {
        let mut command = Command::new("sh");
        command.args(["-c", "sleep 30"]);
        let failure = run_bounded(child(&mut command), Some(Duration::from_millis(150)), 4096, None)
            .expect_err("timeout");
        match failure {
            RunFailure::TimedOut { seconds, .. } => assert_eq!(seconds, 0),
            other => panic!("unexpected failure: {other:?}"),
        }
    }

    #[test]
    fn kills_the_child_when_the_cancel_flag_is_set() {
        let flag = Arc::new(AtomicBool::new(false));
        let cancel = flag.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(100));
            cancel.store(true, Ordering::Relaxed);
        });
        let mut command = Command::new("sh");
        command.args(["-c", "sleep 30"]);
        let failure = run_bounded(child(&mut command), None, 4096, Some(&flag))
            .expect_err("cancelled");
        assert_eq!(failure, RunFailure::Cancelled);
    }
}
