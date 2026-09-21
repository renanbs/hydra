use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_hidden: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DirectoryListing {
    pub path: String,
    pub entries: Vec<FileEntry>,
}

pub fn list_directory(dir: &str) -> Result<DirectoryListing, String> {
    let p = Path::new(dir);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", dir));
    }
    if !p.is_dir() {
        return Err(format!("Not a directory: {}", dir));
    }
    let mut entries: Vec<FileEntry> = Vec::new();
    let rd = std::fs::read_dir(p).map_err(|e| e.to_string())?;
    for e in rd {
        let e = match e { Ok(v) => v, Err(_) => continue };
        let ft = match e.file_type() { Ok(v) => v, Err(_) => continue };
        let name = e.file_name().to_string_lossy().to_string();
        let is_hidden = name.starts_with('.');
        entries.push(FileEntry {
            name: name.clone(),
            path: e.path().to_string_lossy().to_string(),
            is_dir: ft.is_dir(),
            is_hidden,
        });
    }
    entries.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            return b.is_dir.cmp(&a.is_dir);
        }
        a.name.to_lowercase().cmp(&b.name.to_lowercase())
    });
    Ok(DirectoryListing { path: dir.to_string(), entries })
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileContent {
    pub path: String,
    pub content: String,
}

pub fn read_file_text(path: &str) -> Result<FileContent, String> {
    let data = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    Ok(FileContent { path: path.to_string(), content: data })
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SearchResult {
    pub path: String,
    pub line: usize,
    pub col: usize,
    pub text: String,
    pub relative_path: String,
}

pub fn search_files_content(repo_path: &str, query: &str, max_results: usize) -> Result<Vec<SearchResult>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    let max = max_results.min(500).max(10);
    // Prefer ripgrep (rg) for performance — Rust-native, parallel, respects .gitignore
    let rg_try = std::process::Command::new("rg")
        .args([
            "--vimgrep",
            "--no-heading",
            "--hidden",
            "--max-count",
            &max.to_string(),
            "--glob",
            "!.git/**",
            query,
            repo_path,
        ])
        .output();
    if let Ok(out) = rg_try {
        if out.status.success() {
            let raw = String::from_utf8_lossy(&out.stdout);
            let base = std::path::Path::new(repo_path);
            let mut results = Vec::new();
            for line in raw.lines() {
                if results.len() >= max { break; }
                // rg vimgrep: path:line:col:text
                let mut parts = line.splitn(4, ':');
                let p = parts.next().unwrap_or("");
                let l = parts.next().unwrap_or("0").parse::<usize>().unwrap_or(0);
                let c = parts.next().unwrap_or("0").parse::<usize>().unwrap_or(0);
                let t = parts.next().unwrap_or("").to_string();
                if p.is_empty() { continue; }
                let rel = std::path::Path::new(p)
                    .strip_prefix(base)
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_else(|_| p.to_string());
                results.push(SearchResult {
                    path: p.to_string(),
                    relative_path: rel,
                    line: l,
                    col: c,
                    text: t,
                });
            }
            return Ok(results);
        }
    }
    // Fallback: pure Rust walk + line scan (slower but works without rg)
    let mut results = Vec::new();
    let q_lower = query.to_lowercase();
    let base = std::path::Path::new(repo_path);
    let mut stack = vec![base.to_path_buf()];
    while let Some(dir) = stack.pop() {
        if results.len() >= max { break; }
        let entries = match std::fs::read_dir(&dir) {
            Ok(r) => r,
            Err(_) => continue,
        };
        for e in entries {
            if results.len() >= max { break; }
            let e = match e { Ok(v) => v, Err(_) => continue };
            let p = e.path();
            let fname = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
            if fname == ".git" || fname == "node_modules" || fname == "target" {
                continue;
            }
            if let Ok(ft) = e.file_type() {
                if ft.is_dir() {
                    stack.push(p);
                    continue;
                }
                if ft.is_file() {
                    // quick extension filter: skip binaries by extension
                    if p.extension().map(|ext| matches!(ext.to_string_lossy().to_lowercase().as_str(), "png"|"jpg"|"jpeg"|"gif"|"webp"|"woff2"|"ico"|"zip"|"tar"|"gz"|"pyc"|"o"|"so"|"dylib"|"exe")).unwrap_or(false) {
                        continue;
                    }
                    let content = match std::fs::read_to_string(&p) { Ok(c) => c, Err(_) => continue };
                    for (idx, line) in content.lines().enumerate() {
                        if line.to_lowercase().contains(&q_lower) {
                            let rel = p.strip_prefix(base).map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|_| p.to_string_lossy().to_string());
                            let col = line.to_lowercase().find(&q_lower).unwrap_or(0) + 1;
                            results.push(SearchResult {
                                path: p.to_string_lossy().to_string(),
                                relative_path: rel,
                                line: idx + 1,
                                col,
                                text: line.chars().take(200).collect(),
                            });
                            if results.len() >= max { break; }
                        }
                    }
                }
            }
        }
    }
    Ok(results)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IgnoredCheckResult {
    pub ignored_paths: Vec<String>,
}

pub fn create_file(path: &str) -> Result<(), String> {
    let p = Path::new(path);
    if p.exists() { return Err("File already exists".to_string()); }
    if let Some(parent) = p.parent() { std::fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
    std::fs::write(p, "").map_err(|e| e.to_string())
}
pub fn create_folder(path: &str) -> Result<(), String> {
    std::fs::create_dir_all(path).map_err(|e| e.to_string())
}
pub fn rename_path(old: &str, new: &str) -> Result<(), String> {
    std::fs::rename(old, new).map_err(|e| e.to_string())
}
pub fn delete_path(path: &str) -> Result<(), String> {
    let p = Path::new(path);
    if !p.exists() { return Ok(()); }
    if p.is_dir() { std::fs::remove_dir_all(p).map_err(|e| e.to_string())?; }
    else { std::fs::remove_file(p).map_err(|e| e.to_string())?; }
    Ok(())
}
