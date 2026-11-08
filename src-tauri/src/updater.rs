use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use std::process::Command;

/// Update channel (Orca `RELEASE_CHANNELS` subset portável).
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ReleaseChannel {
    Stable,
    Beta,
    Nightly,
}

impl Default for ReleaseChannel {
    fn default() -> Self {
        ReleaseChannel::Stable
    }
}

/// Update status (Orca `updater:getStatus` shape: estado + versão disponível).
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatus {
    pub current_version: String,
    pub available_version: Option<String>,
    pub update_available: bool,
    pub last_check_at: Option<i64>,
    pub pending_nudge_id: Option<String>,
    pub dismissed_update_version: Option<String>,
    pub release_channel: ReleaseChannel,
    /// feed configurado? sem feed, check/download/quitAndInstall reportam indisponível.
    pub feed_configured: bool,
}

impl Default for UpdateStatus {
    fn default() -> Self {
        Self {
            current_version: "0.0.0".into(),
            available_version: None,
            update_available: false,
            last_check_at: None,
            pending_nudge_id: None,
            dismissed_update_version: None,
            release_channel: ReleaseChannel::default(),
            feed_configured: false,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseBuild {
    pub version: String,
    pub channel: ReleaseChannel,
    pub notes: Option<String>,
    pub published_at: Option<i64>,
}

/// Estado persistido do updater (SQLite via settings blob ou tabela dedicada).
/// Mantido em memória + settings para não criar migração nova nesta etapa.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct PersistedUpdaterState {
    pub last_check_at: Option<i64>,
    pub pending_nudge_id: Option<String>,
    pub dismissed_update_version: Option<String>,
    pub release_channel_override: Option<ReleaseChannel>,
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Lê a versão instalada: `Cargo.toml` em dev, package_info no runtime Tauri.
pub fn installed_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Consulta o feed de releases (GitHub Releases API). Sem remote configurado
/// retorna `None` — o comando reporta indisponível em vez de falhar.
pub fn query_release_feed(channel: &ReleaseChannel) -> Option<ReleaseBuild> {
    let repo = std::env::var("HYDRA_UPDATE_REPO").ok()?;
    let tag_filter = match channel {
        ReleaseChannel::Stable => "stable",
        ReleaseChannel::Beta => "beta",
        ReleaseChannel::Nightly => "nightly",
    };
    let url = format!("https://api.github.com/repos/{repo}/releases");
    let out = Command::new("curl")
        .args(["-s", "--max-time", "15", "-H", "Accept: application/vnd.github+json", &url])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let releases: Vec<serde_json::Value> = serde_json::from_slice(&out.stdout).ok()?;
    releases.iter().find_map(|r| {
        let tag = r.get("tag_name")?.as_str()?;
        if !tag.contains(tag_filter) && *channel != ReleaseChannel::Stable {
            return None;
        }
        Some(ReleaseBuild {
            version: tag.trim_start_matches('v').to_string(),
            channel: channel.clone(),
            notes: r.get("body").and_then(|b| b.as_str()).map(|s| s.to_string()),
            published_at: None,
        })
    })
}

/// Compara semver simples: retorna true se `latest > current`.
pub fn is_newer(current: &str, latest: &str) -> bool {
    fn parts(v: &str) -> Vec<u64> {
        v.split('.').map(|p| p.chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(0)).collect()
    }
    let (mut a, mut b) = (parts(current), parts(latest));
    let n = a.len().max(b.len());
    a.resize(n, 0);
    b.resize(n, 0);
    a < b
}

/// Persisted updater blob accessors (single-row table, ssh_state-style).
fn load_state(db: &crate::db::DatabaseManager) -> PersistedUpdaterState {
    db.get_updater_state().unwrap_or_default()
}

fn store_state(db: &crate::db::DatabaseManager, state: &PersistedUpdaterState) -> Result<(), String> {
    db.save_updater_state(state)
}

fn current_status(app: &AppHandle, db: &crate::db::DatabaseManager) -> UpdateStatus {
    let persisted = load_state(db);
    UpdateStatus {
        current_version: app.package_info().version.to_string(),
        available_version: None,
        update_available: false,
        last_check_at: persisted.last_check_at,
        pending_nudge_id: persisted.pending_nudge_id,
        dismissed_update_version: persisted.dismissed_update_version,
        release_channel: persisted.release_channel_override.unwrap_or_default(),
        feed_configured: std::env::var("HYDRA_UPDATE_REPO").is_ok(),
    }
}

/// `updater:getStatus` — estado atual sem I/O de rede.
#[tauri::command]
pub async fn updater_get_status(
    app: AppHandle,
    state: State<'_, crate::AppState>,
) -> Result<UpdateStatus, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || Ok(current_status(&app, &db)))
        .await
        .map_err(|e| e.to_string())?
}

/// `updater:getVersion` — versão instalada.
#[tauri::command]
pub async fn updater_get_version(app: AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}

/// `updater:check` — consulta o feed quando `HYDRA_UPDATE_REPO` setado,
/// persiste `last_check_at`. Sem feed: indisponível explícito, nunca erro opaco.
#[tauri::command]
pub async fn updater_check(
    app: AppHandle,
    state: State<'_, crate::AppState>,
) -> Result<UpdateStatus, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let persisted = load_state(&db);
        let channel = persisted.release_channel_override.clone().unwrap_or_default();
        let current = app.package_info().version.to_string();
        let latest = query_release_feed(&channel);
        let available = latest.as_ref().and_then(|b| {
            (b.version != current && is_newer(&current, &b.version)).then(|| b.version.clone())
        });
        let next = PersistedUpdaterState {
            last_check_at: Some(now_ms()),
            pending_nudge_id: available.clone().map(|v| format!("hydra-{v}")),
            ..persisted
        };
        store_state(&db, &next)?;
        Ok(UpdateStatus {
            current_version: current,
            available_version: available.clone(),
            update_available: available.is_some(),
            last_check_at: next.last_check_at,
            pending_nudge_id: next.pending_nudge_id,
            dismissed_update_version: next.dismissed_update_version,
            release_channel: channel,
            feed_configured: std::env::var("HYDRA_UPDATE_REPO").is_ok(),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// `updater:dismissNudge` — limpa o nudge pendente (clearing não ressuscita card).
#[tauri::command]
pub async fn updater_dismiss_nudge(
    state: State<'_, crate::AppState>,
) -> Result<UpdateStatus, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let mut persisted = load_state(&db);
        persisted.pending_nudge_id = None;
        store_state(&db, &persisted)?;
        Ok(UpdateStatus {
            current_version: installed_version(),
            available_version: None,
            update_available: false,
            last_check_at: persisted.last_check_at,
            pending_nudge_id: None,
            dismissed_update_version: persisted.dismissed_update_version,
            release_channel: persisted.release_channel_override.unwrap_or_default(),
            feed_configured: std::env::var("HYDRA_UPDATE_REPO").is_ok(),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// `updater:dismissAvailableUpdate` — esconde a versão disponível.
#[tauri::command]
pub async fn updater_dismiss_available_update(
    state: State<'_, crate::AppState>,
) -> Result<UpdateStatus, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let mut persisted = load_state(&db);
        persisted.pending_nudge_id = None;
        store_state(&db, &persisted)?;
        Ok(UpdateStatus {
            current_version: installed_version(),
            available_version: None,
            update_available: false,
            last_check_at: persisted.last_check_at,
            pending_nudge_id: None,
            dismissed_update_version: persisted.dismissed_update_version,
            release_channel: persisted.release_channel_override.unwrap_or_default(),
            feed_configured: std::env::var("HYDRA_UPDATE_REPO").is_ok(),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// `updater:listBuilds` — sem feed remoto, lista só a build instalada.
#[tauri::command]
pub async fn updater_list_builds(
    channel: Option<ReleaseChannel>,
) -> Result<Vec<ReleaseBuild>, String> {
    let ch = channel.unwrap_or_default();
    let mut builds = vec![ReleaseBuild {
        version: installed_version(),
        channel: ReleaseChannel::Stable,
        notes: Some("installed build".into()),
        published_at: None,
    }];
    if let Some(remote) =
        tokio::task::spawn_blocking(move || query_release_feed(&ch)).await.map_err(|e| e.to_string())?
    {
        builds.push(remote);
    }
    Ok(builds)
}


/// `updater:download` — baixa via tauri-plugin-updater quando ativo.
/// Sem feed/plugin: erro explícito (era partial, agora tenta de verdade).
#[tauri::command]
pub async fn updater_download(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_updater::UpdaterExt;
    let updater = app.updater().map_err(|e| format!("updater inactive (dev build?): {e}"))?;
    let update = updater.check().await.map_err(|e| format!("check failed: {e}"))?;
    let Some(update) = update else { return Ok(None) };
    let version = update.version.clone();
    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| format!("download/install failed: {e}"))?;
    Ok(Some(version))
}

/// `updater:quitAndInstall` — relança para aplicar update já baixado.
/// O plugin aplica no download_and_install; aqui garante o relaunch.
#[tauri::command]
pub async fn updater_quit_and_install(app: AppHandle) -> Result<(), String> {
    app.request_restart();
    Ok(())
}


#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LinuxPackageInstructions {
    pub package_type: String,
    pub install_command: String,
    pub package_url: Option<String>,
}

/// Detecta gerenciador (apt/dnf/pacman) via /etc/os-release.
fn detect_linux_pm() -> Option<(&'static str, &'static str)> {
    let txt = std::fs::read_to_string("/etc/os-release").ok()?;
    let id = txt.lines().find_map(|l| l.strip_prefix("ID="))?.trim_matches('"').to_string();
    let like = txt.lines().find_map(|l| l.strip_prefix("ID_LIKE=")).unwrap_or("").to_string();
    let probe = format!("{id} {like}");
    if probe.contains("arch") { Some(("pacman", "pacman -U")) }
    else if probe.contains("fedora") || probe.contains("rhel") || probe.contains("centos") { Some(("rpm", "dnf install")) }
    else if probe.contains("debian") || probe.contains("ubuntu") { Some(("deb", "apt install")) }
    else { None }
}

/// `updater:getLinuxPackageInstallInstructions` — comando de instalação do pacote.
#[tauri::command]
pub async fn updater_get_linux_instructions() -> Result<LinuxPackageInstructions, String> {
    let repo = std::env::var("HYDRA_UPDATE_REPO").unwrap_or_else(|_| "renanbs/hydra".into());
    let version = installed_version();
    match detect_linux_pm() {
        Some((pkg, cmd)) => {
            let ext = if pkg == "rpm" { "rpm" } else if pkg == "pacman" { "pkg.tar.zst" } else { "deb" };
            Ok(LinuxPackageInstructions {
                package_type: pkg.into(),
                install_command: format!("sudo {cmd} ./hydra_{version}_amd64.{ext}"),
                package_url: Some(format!("https://github.com/{repo}/releases/tag/v{version}")),
            })
        }
        None => Err("no supported package manager found (apt/dnf/pacman)".into()),
    }
}

/// `updater:showLinuxPackage` — abre a página do release no navegador.
#[tauri::command]
pub async fn updater_show_linux_package() -> Result<String, String> {
    let repo = std::env::var("HYDRA_UPDATE_REPO").unwrap_or_else(|_| "renanbs/hydra".into());
    let url = format!("https://github.com/{repo}/releases/latest");
    crate::preflight::open_external_url(&url)?;
    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn newer_detects_patch_bump() {
        assert!(is_newer("0.1.0", "0.1.1"));
        assert!(!is_newer("0.1.1", "0.1.0"));
        assert!(!is_newer("0.1.0", "0.1.0"));
    }

    #[test]
    fn newer_detects_minor_over_patch() {
        assert!(is_newer("0.1.9", "0.2.0"));
    }
}
