use std::path::{Path, PathBuf};

const SOCKET_PERMISSION_MODE: u32 = 0o600;

fn hydra_config_dir() -> PathBuf {
    if let Ok(p) = std::env::var("HYDRA_CONFIG_PATH") {
        return PathBuf::from(p);
    }
    if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        return PathBuf::from(xdg).join("hydra");
    }
    if let Some(home) = dirs_next() {
        #[cfg(target_os = "macos")]
        {
            // macOS: ~/Library/Application Support/hydra (fallback to ~/.config/hydra)
            let mac = home.join("Library/Application Support/hydra");
            // Keep compat with existing ~/.config/hydra if already exists
            let linux = home.join(".config/hydra");
            if linux.exists() && !mac.exists() {
                return linux;
            }
            if mac.exists() || cfg!(target_os = "macos") {
                return mac;
            }
            return linux;
        }
        #[cfg(not(target_os = "macos"))]
        return home.join(".config/hydra");
    }
    PathBuf::from("/tmp/hydra")
}

fn dirs_next() -> Option<PathBuf> {
    std::env::var("HOME").ok().map(PathBuf::from)
}

pub fn hydra_socket_path() -> PathBuf {
    if let Ok(over) = std::env::var("HYDRA_SOCKET_PATH") {
        return PathBuf::from(over);
    }
    // Session override
    if let Ok(sess) = std::env::var("HYDRA_SESSION") {
        if !sess.trim().is_empty() {
            return hydra_config_dir().join(format!("hydra-{}.sock", sess));
        }
    }
    hydra_config_dir().join("hydra.sock")
}

pub fn hydra_client_socket_path() -> PathBuf {
    let api = hydra_socket_path();
    derive_client_socket_from_api_socket(&api)
}

pub fn derive_client_socket_from_api_socket(api: &Path) -> PathBuf {
    let stem = api.file_stem().and_then(|s| s.to_str()).unwrap_or("hydra");
    let parent = api.parent().unwrap_or_else(|| Path::new(""));
    parent.join(format!("{stem}-client.sock"))
}

pub fn prepare_socket_path(path: &Path) -> std::io::Result<()> {
    crate::ipc::prepare_socket_path(path, |p| {
        format!("hydra daemon already running (socket busy at {})", p.display())
    })
}

pub fn restrict_socket_permissions(path: &Path) -> std::io::Result<()> {
    crate::ipc::restrict_socket_permissions(path, SOCKET_PERMISSION_MODE)
}
