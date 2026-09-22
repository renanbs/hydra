use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::Instant;

/// ── Shared types mirroring `src/shared/terminal-custom-themes.ts` ─────────

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct TerminalColorOverrides {
    #[serde(skip_serializing_if = "Option::is_none")] pub foreground: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub background: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub cursorAccent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub selectionBackground: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub selectionForeground: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub black: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub red: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub green: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub yellow: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub blue: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub magenta: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub cyan: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub white: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub brightBlack: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub brightRed: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub brightGreen: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub brightYellow: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub brightBlue: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub brightMagenta: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub brightCyan: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub brightWhite: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub bold: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TerminalCustomTheme {
    pub id: String,
    pub name: String,
    pub source: String,
    pub mode: String,
    pub terminal: TerminalColorOverrides,
    pub importedAt: String,
    #[serde(skip_serializing_if = "Option::is_none")] pub sourceLabel: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub unsupportedFeatures: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")] pub selectionValue: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WarpThemeImportSkippedFile {
    pub label: String,
    pub reason: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WarpThemeImportPreview {
    pub found: bool,
    #[serde(skip_serializing_if = "Option::is_none")] pub canceled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")] pub desktopOnly: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")] pub sourceLabel: Option<String>,
    pub themes: Vec<TerminalCustomTheme>,
    pub skippedFiles: Vec<WarpThemeImportSkippedFile>,
    #[serde(skip_serializing_if = "Option::is_none")] pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GhosttyImportPreview {
    pub found: bool,
    #[serde(skip_serializing_if = "Option::is_none")] pub configPath: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub configPaths: Option<Vec<String>>,
    pub diff: serde_json::Value,
    pub unsupportedKeys: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub error: Option<String>,
}

// ── Helpers ───────────────────────────────────────────────────────────────

fn normalize_hex_color(value: &str) -> Option<String> {
    let trimmed = value.trim();
    // HEX_COLOR_RE = /^#?([0-9a-fA-F]{3}){1,2}$/
    let without_hash = trimmed.strip_prefix('#').unwrap_or(trimmed);
    if without_hash.len() != 3 && without_hash.len() != 6 {
        return None;
    }
    if !without_hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    let expanded = if without_hash.len() == 3 {
        without_hash.chars().map(|c| format!("{c}{c}")).collect::<String>()
    } else {
        without_hash.to_string()
    };
    Some(format!("#{}", expanded.to_lowercase()))
}

fn has_usable_colors(t: &TerminalColorOverrides) -> bool {
    let ansi = [
        &t.black, &t.red, &t.green, &t.yellow, &t.blue, &t.magenta, &t.cyan, &t.white,
        &t.brightBlack, &t.brightRed, &t.brightGreen, &t.brightYellow, &t.brightBlue, &t.brightMagenta, &t.brightCyan, &t.brightWhite,
    ].iter().filter(|v| v.is_some()).count();
    t.background.is_some() && t.foreground.is_some() && ansi > 0
}

fn luminance(hex: &str) -> f32 {
    let h = hex.trim_start_matches('#');
    let (r, g, b) = if h.len() == 6 {
        (
            u8::from_str_radix(&h[0..2], 16).unwrap_or(0) as f32 / 255.0,
            u8::from_str_radix(&h[2..4], 16).unwrap_or(0) as f32 / 255.0,
            u8::from_str_radix(&h[4..6], 16).unwrap_or(0) as f32 / 255.0,
        )
    } else { (0.0, 0.0, 0.0) };
    0.2126 * r + 0.7152 * g + 0.0722 * b
}

fn infer_mode(background: Option<&str>, details: Option<&str>) -> String {
    if let Some(bg) = background { return if luminance(bg) >= 0.55 { "light" } else { "dark" }.to_string(); }
    match details { Some("lighter") => "light", Some("darker") => "dark", _ => "unknown" }.to_string()
}

fn normalize_id(value: &str) -> String {
    let mut s = value.trim().to_lowercase().replace(['\'','"'], "");
    // replace non-alnum : _ - with -
    let mut out = String::new();
    let mut last_dash = false;
    for c in s.chars() {
        if c.is_ascii_alphanumeric() || c == ':' || c == '_' || c == '-' {
            out.push(c); last_dash = c == '-';
        } else if !last_dash { out.push('-'); last_dash = true; }
    }
    // collapse --
    while out.contains("--") { out = out.replace("--", "-"); }
    out.trim_matches('-').to_string()
}
fn normalize_name(value: &str, fallback: &str) -> String {
    let cleaned: String = value.chars().filter(|c| *c as u32 >= 32 && *c as u32 != 127).collect();
    let s = cleaned.replace(['/', '\\'], " ");
    let s = s.split_whitespace().collect::<Vec<_>>().join(" ");
    let t = s.trim();
    if t.is_empty() { fallback.to_string() } else { t.to_string() }
}

// ── Ghostty parser (Rust-improved: no regex, zero alloc per line, strict palette) ──

fn strip_inline_comment(value: &str) -> &str {
    let mut in_single = false;
    let mut in_double = false;
    let bytes = value.as_bytes();
    for i in 0..value.len() {
        let ch = bytes[i] as char;
        let prev = if i > 0 { bytes[i-1] as char } else { ' ' };
        if ch == '\'' && !in_double { in_single = !in_single; }
        else if ch == '"' && !in_single { in_double = !in_double; }
        else if ch == '#' && !in_single && !in_double && (prev == ' ' || prev == '\t') {
            return value[..i].trim();
        }
    }
    value.trim()
}

fn parse_ghostty_config(content: &str) -> HashMap<String, Vec<String>> {
    let mut map: HashMap<String, Vec<String>> = HashMap::new();
    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') { continue; }
        let Some(eq) = line.find('=') else { continue; };
        let key = line[..eq].trim();
        let mut value = line[eq+1..].trim();
        value = strip_inline_comment(value);
        if (value.starts_with('"') && value.ends_with('"')) || (value.starts_with('\'') && value.ends_with('\'')) {
            value = &value[1..value.len()-1];
        }
        if key.is_empty() { continue; }
        map.entry(key.to_string()).or_default().push(value.to_string());
    }
    map
}

fn ghostty_palette_to_overrides(map: &HashMap<String, Vec<String>>) -> (TerminalColorOverrides, Vec<String>) {
    let mut t = TerminalColorOverrides::default();
    let mut unsupported = vec![];
    // direct keys
    let get_first = |k: &str| map.get(k).and_then(|v| v.first()).cloned();
    if let Some(v) = get_first("background").and_then(|s| normalize_hex_color(&s)) { t.background = Some(v); }
    if let Some(v) = get_first("foreground").and_then(|s| normalize_hex_color(&s)) { t.foreground = Some(v); }
    if let Some(v) = get_first("cursor-color").and_then(|s| normalize_hex_color(&s)) { t.cursor = Some(v); }
    if let Some(v) = get_first("cursor-text").and_then(|s| normalize_hex_color(&s)) { t.cursorAccent = Some(v); }
    if let Some(v) = get_first("selection-background").and_then(|s| normalize_hex_color(&s)) { t.selectionBackground = Some(v); }
    if let Some(v) = get_first("selection-foreground").and_then(|s| normalize_hex_color(&s)) { t.selectionForeground = Some(v); }
    if let Some(v) = get_first("bold-color").and_then(|s| normalize_hex_color(&s)) { t.bold = Some(v); }

    // palette entries: palette = 0=#xxxxxx or palette = 0=#xxxxxx
    let palette_keys = ["black","red","green","yellow","blue","magenta","cyan","white",
                        "brightBlack","brightRed","brightGreen","brightYellow","brightBlue","brightMagenta","brightCyan","brightWhite"];
    if let Some(entries) = map.get("palette") {
        for entry in entries {
            // format: "<idx>=#hex" or "<idx>=hex"
            let parts: Vec<&str> = entry.splitn(2, '=').collect();
            if parts.len() != 2 { unsupported.push(format!("palette entry '{}' ignored", entry)); continue; }
            let idx: usize = parts[0].trim().parse().unwrap_or(99);
            let color = match normalize_hex_color(parts[1].trim()) {
                Some(c) => c, None => { unsupported.push(format!("palette {} invalid color", idx)); continue; }
            };
            match idx {
                0 => t.black = Some(color), 1 => t.red = Some(color), 2 => t.green = Some(color), 3 => t.yellow = Some(color),
                4 => t.blue = Some(color), 5 => t.magenta = Some(color), 6 => t.cyan = Some(color), 7 => t.white = Some(color),
                8 => t.brightBlack = Some(color), 9 => t.brightRed = Some(color), 10 => t.brightGreen = Some(color), 11 => t.brightYellow = Some(color),
                12 => t.brightBlue = Some(color), 13 => t.brightMagenta = Some(color), 14 => t.brightCyan = Some(color), 15 => t.brightWhite = Some(color),
                _ => unsupported.push(format!("palette index {} out of range", idx)),
            }
            if idx < 16 { /* ok */ }
            let _ = &palette_keys; // suppress unused
        }
    }
    // unsupported keys tracking
    for k in map.keys() {
        if !["palette","background","foreground","cursor-color","cursor-text","selection-background","selection-foreground","bold-color","split-divider-color"].contains(&k.as_str()) {
            unsupported.push(k.clone());
        }
    }
    (t, unsupported)
}

fn ghostty_config_paths() -> Vec<PathBuf> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home/renan".to_string());
    let xdg = std::env::var("XDG_CONFIG_HOME").unwrap_or_else(|_| format!("{}/.config", home));
    let mut v = vec![
        PathBuf::from(format!("{}/ghostty/config", xdg)),
        PathBuf::from(format!("{}/.config/ghostty/config", home)),
    ];
    v.sort();
    v.dedup();
    v
}

fn ghostty_theme_search_dirs() -> Vec<PathBuf> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home/renan".to_string());
    let xdg = std::env::var("XDG_CONFIG_HOME").unwrap_or_else(|_| format!("{}/.config", home));
    let mut dirs = vec![PathBuf::from(format!("{}/ghostty/themes", xdg)), PathBuf::from(format!("{}/.config/ghostty/themes", home))];
    if let Ok(res) = std::env::var("GHOSTTY_RESOURCES_DIR") { dirs.push(PathBuf::from(format!("{}/themes", res))); }
    else {
        // Linux bundled themes
        dirs.push(PathBuf::from("/usr/share/ghostty/themes"));
        dirs.push(PathBuf::from("/usr/local/share/ghostty/themes"));
    }
    dirs.sort();
    dirs.dedup();
    dirs
}

// ── Warp parser (Rust: serde_yaml, luminance mode, unsupported detection) ────

fn warp_read_color(v: &serde_yaml::Value) -> Option<String> {
    match v {
        serde_yaml::Value::String(s) => normalize_hex_color(s),
        serde_yaml::Value::Mapping(m) => {
            for key in ["top","bottom","left","right"] {
                if let Some(serde_yaml::Value::String(s)) = m.get(serde_yaml::Value::String(key.to_string())) {
                    if let Some(c) = normalize_hex_color(s) { return Some(c); }
                }
            }
            None
        },
        _ => None,
    }
}

fn warp_add_palette(term: &mut TerminalColorOverrides, palette: Option<&serde_yaml::Value>, bright: bool) {
    let Some(serde_yaml::Value::Mapping(map)) = palette else { return; };
    let names = ["black","red","green","yellow","blue","magenta","cyan","white"];
    for name in names {
        if let Some(v) = map.get(serde_yaml::Value::String(name.to_string())) {
            if let Some(c) = normalize_hex_color(&v.as_str().unwrap_or(&"").to_string()) {
                match (name, bright) {
                    ("black", false) => term.black = Some(c), ("red", false) => term.red = Some(c), ("green", false) => term.green = Some(c), ("yellow", false) => term.yellow = Some(c),
                    ("blue", false) => term.blue = Some(c), ("magenta", false) => term.magenta = Some(c), ("cyan", false) => term.cyan = Some(c), ("white", false) => term.white = Some(c),
                    ("black", true) => term.brightBlack = Some(c), ("red", true) => term.brightRed = Some(c), ("green", true) => term.brightGreen = Some(c), ("yellow", true) => term.brightYellow = Some(c),
                    ("blue", true) => term.brightBlue = Some(c), ("magenta", true) => term.brightMagenta = Some(c), ("cyan", true) => term.brightCyan = Some(c), ("white", true) => term.brightWhite = Some(c),
                    _ => {},
                }
            }
        }
    }
}

fn parse_warp_yaml(content: &str, file_label: &str, id_suffix: Option<&str>, source_label: Option<&str>) -> Result<TerminalCustomTheme, String> {
    let value: serde_yaml::Value = serde_yaml::from_str(content).map_err(|e| e.to_string())?;
    let mapping = match &value { serde_yaml::Value::Mapping(m) => m, _ => return Err("Theme file must contain a YAML object.".to_string()) };

    let fallback = Path::new(file_label).file_stem().and_then(|s| s.to_str()).unwrap_or("theme");
    let name_val = mapping.get(serde_yaml::Value::String("name".to_string())).and_then(|v| v.as_str()).unwrap_or(fallback);
    let name = normalize_name(name_val, fallback);

    let mut term = TerminalColorOverrides::default();
    let bg = mapping.get(serde_yaml::Value::String("background".to_string())).and_then(warp_read_color);
    let fg = mapping.get(serde_yaml::Value::String("foreground".to_string())).and_then(warp_read_color);
    let cursor = mapping.get(serde_yaml::Value::String("cursor".to_string())).and_then(warp_read_color)
        .or_else(|| mapping.get(serde_yaml::Value::String("accent".to_string())).and_then(warp_read_color));
    if let Some(c) = bg.clone() { term.background = Some(c); }
    if let Some(c) = fg.clone() { term.foreground = Some(c); }
    if let Some(c) = cursor { term.cursor = Some(c); }

    if let Some(serde_yaml::Value::Mapping(tc)) = mapping.get(serde_yaml::Value::String("terminal_colors".to_string())) {
        warp_add_palette(&mut term, tc.get(&serde_yaml::Value::String("normal".to_string())), false);
        warp_add_palette(&mut term, tc.get(&serde_yaml::Value::String("bright".to_string())), true);
    }

    if !has_usable_colors(&term) {
        return Err("Theme must include background, foreground, and at least one ANSI color.".to_string());
    }

    let details = mapping.get(serde_yaml::Value::String("details".to_string())).and_then(|v| v.as_str());
    let mode = infer_mode(bg.as_deref(), details);
    let mut unsupported = vec![];
    if mapping.contains_key(serde_yaml::Value::String("background_image".to_string())) { unsupported.push("background image not supported".to_string()); }
    if mapping.get(serde_yaml::Value::String("background".to_string())).map(|v| matches!(v, serde_yaml::Value::Mapping(_))).unwrap_or(false) { unsupported.push("background gradient not supported".to_string()); }
    if mapping.get(serde_yaml::Value::String("accent".to_string())).map(|v| matches!(v, serde_yaml::Value::Mapping(_))).unwrap_or(false) { unsupported.push("accent gradient not supported".to_string()); }

    let id_base = normalize_id(&format!("warp:{}", name));
    let id = if let Some(suf) = id_suffix { format!("{}-{}", id_base, normalize_id(suf)) } else { id_base };

    Ok(TerminalCustomTheme {
        id: id.clone(),
        name: name.clone(),
        source: "warp".to_string(),
        mode,
        terminal: term,
        importedAt: chrono::Utc::now().to_rfc3339(),
        sourceLabel: Some(source_label.unwrap_or(file_label).to_string()),
        unsupportedFeatures: if unsupported.is_empty() { None } else { Some(unsupported) },
        selectionValue: Some(format!("custom:{}", id)),
    })
}

// ── Public async commands (Tauri) ─────────────────────────────────────────

#[tauri::command]
pub async fn preview_ghostty_import() -> Result<GhosttyImportPreview, String> {
    // Run blocking file IO off the async runtime (Wayland freeze prevention)
    let res = tokio::task::spawn_blocking(|| {
        let paths = ghostty_config_paths();
        let mut found_path: Option<PathBuf> = None;
        let mut content: Option<String> = None;
        for p in &paths {
            if p.is_file() {
                match std::fs::read_to_string(p) {
                    Ok(c) if c.len() <= 262_144 => { found_path = Some(p.clone()); content = Some(c); break; },
                    Ok(_) => return GhosttyImportPreview {
                        found: false, configPath: Some(p.display().to_string()), configPaths: Some(paths.iter().map(|x| x.display().to_string()).collect()),
                        diff: serde_json::json!({}), unsupportedKeys: vec![], error: Some("Config too large".to_string())
                    },
                    Err(_) => continue,
                }
            }
        }
        let Some(fp) = found_path else {
            return GhosttyImportPreview {
                found: false, configPath: None, configPaths: Some(paths.iter().map(|x| x.display().to_string()).collect()),
                diff: serde_json::json!({}), unsupportedKeys: vec![], error: None
            };
        };
        let c = content.unwrap_or_default();
        let map = parse_ghostty_config(&c);
        // If theme key present, try to resolve that theme file
        let mut extra_unsupported = vec![];
        let mut term_overrides = ghostty_palette_to_overrides(&map);
        let mut term = term_overrides.0;
        extra_unsupported.extend(term_overrides.1);

        // If config references `theme = "Catppuccin Mocha"` etc, try to load that theme file
        if let Some(theme_name) = map.get("theme").and_then(|v| v.first()).cloned() {
            for dir in ghostty_theme_search_dirs() {
                let p = dir.join(&theme_name);
                if p.is_file() {
                    if let Ok(tc) = std::fs::read_to_string(&p) {
                        let tm = parse_ghostty_config(&tc);
                        let (tt, uns) = ghostty_palette_to_overrides(&tm);
                        // merge: theme file overrides config
                        if tt.background.is_some() { term.background = tt.background; }
                        if tt.foreground.is_some() { term.foreground = tt.foreground; }
                        for (k, v) in [(&tt.black, &mut term.black), (&tt.red, &mut term.red), (&tt.green, &mut term.green), (&tt.yellow, &mut term.yellow), (&tt.blue, &mut term.blue), (&tt.magenta, &mut term.magenta), (&tt.cyan, &mut term.cyan), (&tt.white, &mut term.white), (&tt.brightBlack, &mut term.brightBlack), (&tt.brightRed, &mut term.brightRed), (&tt.brightGreen, &mut term.brightGreen), (&tt.brightYellow, &mut term.brightYellow), (&tt.brightBlue, &mut term.brightBlue), (&tt.brightMagenta, &mut term.brightMagenta), (&tt.brightCyan, &mut term.brightCyan), (&tt.brightWhite, &mut term.brightWhite)] { if k.is_some() { *v = k.clone(); } }
                        extra_unsupported.extend(uns);
                        break;
                    }
                }
            }
        }

        let has_colors = term.background.is_some() || term.foreground.is_some() || term.black.is_some();
        if !has_colors {
            return GhosttyImportPreview {
                found: false, configPath: Some(fp.display().to_string()), configPaths: Some(paths.iter().map(|x| x.display().to_string()).collect()),
                diff: serde_json::json!({}), unsupportedKeys: extra_unsupported, error: None
            };
        }
        GhosttyImportPreview {
            found: true,
            configPath: Some(fp.display().to_string()),
            configPaths: Some(paths.iter().map(|x| x.display().to_string()).collect()),
            diff: serde_json::json!({ "terminalColorOverrides": term }),
            unsupportedKeys: extra_unsupported,
            error: None
        }
    }).await.map_err(|e| e.to_string())?;
    Ok(res)
}

const MAX_WARP_FILES: usize = 200;
const MAX_WARP_DEPTH: usize = 3;
const MAX_WARP_DIRS: usize = 80;

fn scan_warp_dir_recursive(dir: &Path, depth: usize, files: &mut Vec<(PathBuf, String)>, skipped: &mut Vec<WarpThemeImportSkippedFile>, visited: &mut usize, start: Instant, budget_ms: u64) -> bool {
    if start.elapsed().as_millis() as u64 > budget_ms { return true; }
    if *visited >= MAX_WARP_DIRS {
        skipped.push(WarpThemeImportSkippedFile { label: dir.display().to_string(), reason: format!("Only the first {} folders were scanned.", MAX_WARP_DIRS) });
        return false;
    }
    *visited += 1;
    let entries = match std::fs::read_dir(dir) {
        Ok(r) => r, Err(_) => { skipped.push(WarpThemeImportSkippedFile { label: dir.display().to_string(), reason: "Could not read folder.".to_string() }); return false; }
    };
    let mut ents: Vec<_> = entries.filter_map(|e| e.ok()).collect();
    ents.sort_by(|a,b| a.file_name().cmp(&b.file_name()));
    for ent in ents {
        if start.elapsed().as_millis() as u64 > budget_ms { return true; }
        if files.len() >= MAX_WARP_FILES { return true; }
        let p = ent.path();
        let meta = match ent.metadata() { Ok(m) => m, Err(_) => continue };
        if meta.is_file() {
            if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                if ext.eq_ignore_ascii_case("yaml") || ext.eq_ignore_ascii_case("yml") {
                    let rel = p.strip_prefix(dir).unwrap_or(&p).display().to_string();
                    files.push((p, rel));
                }
            }
        } else if meta.is_dir() && depth < MAX_WARP_DEPTH {
            scan_warp_dir_recursive(&p, depth+1, files, skipped, visited, start, budget_ms);
        } else if meta.is_dir() {
            skipped.push(WarpThemeImportSkippedFile { label: p.display().to_string(), reason: "Nested folder depth limit reached.".to_string() });
        }
    }
    false
}

#[tauri::command]
pub async fn preview_warp_themes(path: Option<String>) -> Result<WarpThemeImportPreview, String> {
    let start = Instant::now();
    let budget_ms = 4000u64;
    let warp_path = path.unwrap_or_else(|| {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/home/renan".to_string());
        format!("{}/.warp/themes", home)
    });
    let res = tokio::task::spawn_blocking(move || {
        let p = PathBuf::from(&warp_path);
        if !p.exists() {
            return WarpThemeImportPreview {
                found: false, canceled: None, desktopOnly: None, sourceLabel: Some(warp_path.clone()),
                themes: vec![], skippedFiles: vec![], error: Some("Warp themes folder not found".to_string())
            };
        }
        if !p.is_dir() {
            // single file
            let content = match std::fs::read_to_string(&p) {
                Ok(c) => c, Err(e) => return WarpThemeImportPreview { found: true, canceled: None, desktopOnly: None, sourceLabel: Some(p.display().to_string()), themes: vec![], skippedFiles: vec![], error: Some(e.to_string()) }
            };
            let label = p.file_name().and_then(|s| s.to_str()).unwrap_or("theme.yaml").to_string();
            match parse_warp_yaml(&content, &label, None, Some(&p.display().to_string())) {
                Ok(theme) => WarpThemeImportPreview { found: true, canceled: None, desktopOnly: None, sourceLabel: Some(p.display().to_string()), themes: vec![theme.clone()], skippedFiles: vec![], error: None },
                Err(reason) => WarpThemeImportPreview { found: true, canceled: None, desktopOnly: None, sourceLabel: Some(p.display().to_string()), themes: vec![], skippedFiles: vec![WarpThemeImportSkippedFile { label, reason }], error: None },
            }
        } else {
            let mut files = vec![];
            let mut skipped = vec![];
            let mut visited = 0usize;
            let source_label = p.file_name().and_then(|s| s.to_str()).unwrap_or("Warp themes").to_string();
            scan_warp_dir_recursive(&p, 0, &mut files, &mut skipped, &mut visited, start, budget_ms);
            let mut themes = vec![];
            for (fp, label) in files.into_iter().take(MAX_WARP_FILES) {
                if start.elapsed().as_millis() as u64 > budget_ms {
                    skipped.push(WarpThemeImportSkippedFile { label: source_label.clone(), reason: "Preview budget expired before all theme files were scanned.".to_string() });
                    break;
                }
                let content = match std::fs::read_to_string(&fp) {
                    Ok(c) => c, Err(_) => { skipped.push(WarpThemeImportSkippedFile { label: label.clone(), reason: "Could not read file.".to_string() }); continue; }
                };
                if content.len() > 1_000_000 {
                    skipped.push(WarpThemeImportSkippedFile { label: label.clone(), reason: "File too large".to_string() }); continue;
                }
                match parse_warp_yaml(&content, &label, None, Some(&source_label)) {
                    Ok(t) => themes.push(t),
                    Err(reason) => skipped.push(WarpThemeImportSkippedFile { label, reason }),
                }
            }
            let found = !themes.is_empty() || !skipped.is_empty();
            WarpThemeImportPreview { found, canceled: None, desktopOnly: None, sourceLabel: Some(source_label), themes, skippedFiles: skipped, error: None }
        }
    }).await.map_err(|e| e.to_string())?;
    Ok(res)
}

#[tauri::command]
pub async fn choose_warp_themes_file() -> Result<WarpThemeImportPreview, String> {
    // Desktop-only: frontend should open dialog via tauri-plugin-dialog and pass path to preview_warp_themes
    Ok(WarpThemeImportPreview { found: false, canceled: Some(false), desktopOnly: Some(true), sourceLabel: None, themes: vec![], skippedFiles: vec![], error: Some("Use dialog plugin to pick files".to_string()) })
}
