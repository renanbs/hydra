//! Per-session hook endpoint env + files (T4).
//!
//! Stamps the PTY child environment with the `HYDRA_*` namespace (D2) and an
//! opaque `paneKey` that is exactly the `session_id` (D3), and writes the
//! `endpoint.env` / `endpoint.cmd` files the hook scripts source.
//!
//! `PORT`/`TOKEN` are generated per session in memory here; the loopback
//! listener (T2) takes over authoritative ownership when it lands.
//!
//! Value mapping mirrors Orca `server-runtime-env.ts` (`buildPtyEnv`) +
//! `endpoint-publication.ts` (`writeEndpointFile`), modulo the D2 `HYDRA_*`
//! rename: `PORT`, `TOKEN`, `ENV`, `VERSION`, `TRANSPORT`, plus the endpoint
//! file path. Timeouts live in the hook scripts (`--connect-timeout 0.5
//! --max-time 1.5`); pane/tab/worktree identity mirrors Orca `spawn-env.ts`
//! (`PANE_KEY = stablePaneKey`, `TAB_ID`/`WORKTREE_ID` per spawn).

use std::collections::HashMap;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::{LazyLock, Mutex};

/// Hook wire version. Mirrors Orca `ORCA_HOOK_PROTOCOL_VERSION`.
pub const HOOK_PROTOCOL_VERSION: &str = "1";
/// Raw-JSON transport marker. Mirrors Orca `ORCA_HOOK_RAW_JSON_TRANSPORT`.
pub const HOOK_TRANSPORT: &str = "raw-json-v1";
/// Hook env stamped on every session. Mirrors the Orca server default
/// (`server-lifecycle.ts` sets `env = 'production'`).
pub const HOOK_ENV: &str = "production";

pub const PANE_KEY_VAR: &str = "HYDRA_PANE_KEY";
pub const TAB_ID_VAR: &str = "HYDRA_TAB_ID";
pub const WORKTREE_ID_VAR: &str = "HYDRA_WORKTREE_ID";
pub const LAUNCH_TOKEN_VAR: &str = "HYDRA_AGENT_LAUNCH_TOKEN";
pub const HOOK_PORT_VAR: &str = "HYDRA_AGENT_HOOK_PORT";
pub const HOOK_TOKEN_VAR: &str = "HYDRA_AGENT_HOOK_TOKEN";
pub const HOOK_ENV_VAR: &str = "HYDRA_AGENT_HOOK_ENV";
pub const HOOK_VERSION_VAR: &str = "HYDRA_AGENT_HOOK_VERSION";
pub const HOOK_ENDPOINT_VAR: &str = "HYDRA_AGENT_HOOK_ENDPOINT";
pub const HOOK_TRANSPORT_VAR: &str = "HYDRA_AGENT_HOOK_TRANSPORT";

/// Per-session hook coordinates, generated once and cached in memory.
#[derive(Debug, Clone)]
pub struct HookSessionCoords {
    pub session_id: String,
    pub tab_id: String,
    pub worktree_id: String,
    pub launch_token: String,
    pub port: u16,
    pub token: String,
    pub env: String,
    pub version: String,
    pub transport: String,
}

static COORDS_CACHE: LazyLock<Mutex<HashMap<String, HookSessionCoords>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn coords_cache() -> &'static Mutex<HashMap<String, HookSessionCoords>> {
    &COORDS_CACHE
}

/// Cached coordinates for `session_id`, generating (port, token, launch
/// token) on first use. Same session returns identical values; distinct
/// sessions never share a token pair.
pub fn session_coords(session_id: &str) -> HookSessionCoords {
    let mut cache = coords_cache().lock().expect("hook coords cache poisoned");
    if let Some(coords) = cache.get(session_id) {
        return coords.clone();
    }
    // Opaque identity (D3): no tab:leaf split, paneKey is the session id.
    // TAB_ID/WORKTREE_ID track the session until real tab/worktree identity
    // exists; hook scripts only need them non-empty for the form post.
    let coords = HookSessionCoords {
        session_id: session_id.to_string(),
        tab_id: session_id.to_string(),
        worktree_id: session_id.to_string(),
        launch_token: new_uuid(),
        port: pick_loopback_port(),
        token: random_hex(16),
        env: HOOK_ENV.to_string(),
        version: HOOK_PROTOCOL_VERSION.to_string(),
        transport: HOOK_TRANSPORT.to_string(),
    };
    cache.insert(session_id.to_string(), coords.clone());
    coords
}

/// PTY child environment for `coords`. `endpoint_path` (when the session
/// endpoint file was written) becomes `HYDRA_AGENT_HOOK_ENDPOINT`, mirroring
/// Orca's `ORCA_AGENT_HOOK_ENDPOINT`.
pub fn build_hook_env(
    coords: &HookSessionCoords,
    endpoint_path: Option<&Path>,
) -> HashMap<String, String> {
    let mut env = HashMap::with_capacity(10);
    env.insert(PANE_KEY_VAR.to_string(), coords.session_id.clone());
    env.insert(TAB_ID_VAR.to_string(), coords.tab_id.clone());
    env.insert(WORKTREE_ID_VAR.to_string(), coords.worktree_id.clone());
    env.insert(LAUNCH_TOKEN_VAR.to_string(), coords.launch_token.clone());
    env.insert(HOOK_PORT_VAR.to_string(), coords.port.to_string());
    env.insert(HOOK_TOKEN_VAR.to_string(), coords.token.clone());
    env.insert(HOOK_ENV_VAR.to_string(), coords.env.clone());
    env.insert(HOOK_VERSION_VAR.to_string(), coords.version.clone());
    env.insert(HOOK_TRANSPORT_VAR.to_string(), coords.transport.clone());
    if let Some(path) = endpoint_path {
        env.insert(
            HOOK_ENDPOINT_VAR.to_string(),
            path.to_string_lossy().into_owned(),
        );
    }
    env
}

/// Session hook dir: `~/.config/hydra/hooks/<session_id>/`. Honors
/// `HYDRA_CONFIG_PATH` / `XDG_CONFIG_HOME` / `HOME` like the socket paths, so
/// tests with a temp `HOME` never touch the real config dir.
pub fn session_hooks_dir(session_id: &str) -> PathBuf {
    hooks_base_dir().join(sanitize_session_id(session_id))
}

/// Platform endpoint file name. Mirrors Orca `getEndpointFileName`: hook
/// scripts source the file natively (POSIX `. "$file"` / Windows `call`).
pub fn endpoint_file_name() -> &'static str {
    if cfg!(windows) { "endpoint.cmd" } else { "endpoint.env" }
}

/// Write both `endpoint.env` (POSIX) and `endpoint.cmd` (`set ` prefix,
/// CRLF) into `dir`, atomically via tmp + rename. Returns the platform file
/// path for `HYDRA_AGENT_HOOK_ENDPOINT`. Values are internally generated
/// (hex/digits), so no shell-quoting hazard.
pub fn write_session_endpoint(
    dir: &Path,
    coords: &HookSessionCoords,
) -> io::Result<PathBuf> {
    create_private_dir(dir)?;
    let fields: [(String, String); 5] = [
        (HOOK_PORT_VAR.to_string(), coords.port.to_string()),
        (HOOK_TOKEN_VAR.to_string(), coords.token.clone()),
        (HOOK_ENV_VAR.to_string(), coords.env.clone()),
        (HOOK_VERSION_VAR.to_string(), coords.version.clone()),
        (HOOK_TRANSPORT_VAR.to_string(), coords.transport.clone()),
    ];
    write_endpoint_file(dir, "endpoint.env", &fields, "", "\n")?;
    write_endpoint_file(dir, "endpoint.cmd", &fields, "set ", "\r\n")?;
    Ok(dir.join(endpoint_file_name()))
}

fn write_endpoint_file(
    dir: &Path,
    name: &str,
    fields: &[(String, String)],
    prefix: &str,
    separator: &str,
) -> io::Result<()> {
    let final_path = dir.join(name);
    let tmp_path = dir.join(format!(
        ".endpoint-{}-{}.tmp",
        std::process::id(),
        random_hex(4)
    ));
    let mut contents = String::new();
    for (key, value) in fields {
        contents.push_str(prefix);
        contents.push_str(key);
        contents.push('=');
        contents.push_str(value);
        contents.push_str(separator);
    }
    {
        use std::io::Write;
        let mut opts = std::fs::OpenOptions::new();
        opts.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            opts.mode(0o600);
        }
        let mut file = opts.open(&tmp_path)?;
        file.write_all(contents.as_bytes())?;
        file.sync_all()?;
    }
    if let Err(e) = std::fs::rename(&tmp_path, &final_path) {
        let _ = std::fs::remove_file(&tmp_path);
        return Err(e);
    }
    Ok(())
}

fn create_private_dir(dir: &Path) -> io::Result<()> {
    std::fs::create_dir_all(dir)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(dir, std::fs::Permissions::from_mode(0o700))?;
    }
    Ok(())
}

fn hooks_base_dir() -> PathBuf {
    if let Ok(p) = std::env::var("HYDRA_CONFIG_PATH") {
        return PathBuf::from(p).join("hooks");
    }
    if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        return PathBuf::from(xdg).join("hydra/hooks");
    }
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home).join(".config/hydra/hooks");
    }
    std::env::temp_dir().join("hydra/hooks")
}

/// Keep the session id from escaping the hooks dir (`/` and `\` become `_`,
/// capped at 64 chars); empty input maps to `unknown`.
fn sanitize_session_id(session_id: &str) -> String {
    let mut out: String = session_id
        .chars()
        .take(64)
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    if out.is_empty() {
        out.push_str("unknown");
    }
    out
}

/// Best-effort free loopback port for this session's coords. The T2 listener
/// binds authoritatively; `0` means no port could be probed.
fn pick_loopback_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .unwrap_or(0)
}

/// Lowercase hex from the OS RNG (`/dev/urandom`), falling back to a
/// time/pid/counter xorshift when unavailable.
fn random_hex(nbytes: usize) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut bytes = vec![0u8; nbytes];
    let filled = std::fs::File::open("/dev/urandom")
        .and_then(|mut f| {
            use std::io::Read;
            let mut got = 0;
            while got < nbytes {
                let n = f.read(&mut bytes[got..])?;
                if n == 0 {
                    break;
                }
                got += n;
            }
            Ok::<_, io::Error>(got)
        })
        .unwrap_or(0);
    if filled < nbytes {
        static COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        let mut state = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0x9e3779b97f4a7c15)
            .wrapping_add(std::process::id() as u64)
            .wrapping_add(COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed));
        for b in bytes.iter_mut().skip(filled) {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            *b = (state >> 56) as u8;
        }
    }
    let mut out = String::with_capacity(nbytes * 2);
    for b in &bytes {
        out.push(HEX[(b >> 4) as usize] as char);
        out.push(HEX[(b & 0xf) as usize] as char);
    }
    out
}

/// `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` from 16 random bytes.
fn new_uuid() -> String {
    let hex = random_hex(16);
    format!(
        "{}-{}-{}-{}-{}",
        &hex[0..8],
        &hex[8..12],
        &hex[12..16],
        &hex[16..20],
        &hex[20..32]
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Env construction carries every stamped var with paneKey = session_id.
    #[test]
    fn hook_env_carries_session_identity() {
        let coords = session_coords("t4-test-session");
        let env = build_hook_env(&coords, None);
        for var in [
            PANE_KEY_VAR,
            TAB_ID_VAR,
            WORKTREE_ID_VAR,
            LAUNCH_TOKEN_VAR,
            HOOK_PORT_VAR,
            HOOK_TOKEN_VAR,
            HOOK_ENV_VAR,
            HOOK_VERSION_VAR,
            HOOK_TRANSPORT_VAR,
        ] {
            assert!(env.contains_key(var), "{var} must be stamped");
        }
        assert_eq!(env[PANE_KEY_VAR], "t4-test-session");
        assert_eq!(env[HOOK_ENV_VAR], HOOK_ENV);
        assert_eq!(env[HOOK_VERSION_VAR], HOOK_PROTOCOL_VERSION);
        assert_eq!(env[HOOK_TRANSPORT_VAR], HOOK_TRANSPORT);
        // uuid-shaped launch token, 32-hex hook token.
        assert_eq!(coords.launch_token.len(), 36);
        assert_eq!(coords.token.len(), 32);
        assert!(coords.token.chars().all(|c| c.is_ascii_hexdigit()));
    }

    /// Same session reuses coords; distinct sessions never share tokens.
    #[test]
    fn session_coords_are_stable_and_unique() {
        let a = session_coords("t4-stable-a");
        let b = session_coords("t4-stable-a");
        let c = session_coords("t4-stable-b");
        assert_eq!(a.launch_token, b.launch_token);
        assert_eq!(a.token, b.token);
        assert_ne!(a.launch_token, c.launch_token);
        assert_ne!(a.token, c.token);
    }

    /// Session ids cannot escape the hooks dir.
    #[test]
    fn session_dir_sanitizes_traversal() {
        let dir = session_hooks_dir("../../evil");
        assert!(
            dir.ends_with("______evil") || dir.ends_with(".._.._evil"),
            "traversal must be neutralized, got {}",
            dir.display()
        );
        assert_eq!(session_hooks_dir(""), hooks_base_dir().join("unknown"));
    }

    /// Both endpoint files round-trip through the envelope parser (proves the
    /// D2 `HYDRA_*` names match what T2 will read).
    #[test]
    fn endpoint_files_parse_as_hook_endpoint() {
        let coords = session_coords("t4-endpoint-roundtrip");
        let dir = std::env::temp_dir().join(format!(
            "hydra-t4-test-{}-{}",
            std::process::id(),
            random_hex(4)
        ));
        write_session_endpoint(&dir, &coords).expect("endpoint files write");
        for name in ["endpoint.env", "endpoint.cmd"] {
            let contents =
                std::fs::read_to_string(dir.join(name)).expect("endpoint file readable");
            let parsed = crate::hooks::envelope::parse_endpoint_file(&contents)
                .expect("endpoint file must satisfy the envelope parser");
            assert_eq!(parsed.port, coords.port.to_string(), "{name} port");
            assert_eq!(parsed.token, coords.token, "{name} token");
            assert_eq!(parsed.env, coords.env, "{name} env");
            assert_eq!(parsed.version, coords.version, "{name} version");
        }
        std::fs::remove_dir_all(&dir).ok();
    }

    /// Platform file path lands in `HYDRA_AGENT_HOOK_ENDPOINT`.
    #[test]
    fn hook_env_carries_endpoint_path() {
        let coords = session_coords("t4-endpoint-path");
        let dir = std::env::temp_dir().join(format!(
            "hydra-t4-test-{}-{}",
            std::process::id(),
            random_hex(4)
        ));
        let path = write_session_endpoint(&dir, &coords).expect("endpoint files write");
        let env = build_hook_env(&coords, Some(&path));
        assert_eq!(env[HOOK_ENDPOINT_VAR], path.to_string_lossy());
        assert_eq!(path.file_name().unwrap(), endpoint_file_name());
        std::fs::remove_dir_all(&dir).ok();
    }
}
