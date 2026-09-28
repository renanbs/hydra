// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::net::Ipv4Addr;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct WorkspacePort {
    pub port: u16,
    pub host: String,
    pub pid: Option<u32>,
    pub process_name: Option<String>,
    pub worktree_path: String,
}

/// Parses /proc/net/tcp or /proc/net/tcp6 format.
/// Returns a map of inode -> (host, port).
pub fn parse_proc_net_tcp_content(content: &str) -> HashMap<u64, (String, u16)> {
    let mut map = HashMap::new();
    for line in content.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 10 {
            continue;
        }

        // st column (index 3): "0A" indicates TCP_LISTEN
        let st = parts[3];
        if st != "0A" {
            continue;
        }

        // local_address column (index 1): "0100007F:0BB8"
        let addr_port = parts[1];
        let mut split = addr_port.split(':');
        let hex_addr = match split.next() {
            Some(a) => a,
            None => continue,
        };
        let hex_port = match split.next() {
            Some(p) => p,
            None => continue,
        };

        let port = match u16::from_str_radix(hex_port, 16) {
            Ok(p) => p,
            Err(_) => continue,
        };

        let host = if hex_addr.len() == 8 {
            if let Ok(num) = u32::from_str_radix(hex_addr, 16) {
                let b = num.to_le_bytes();
                Ipv4Addr::new(b[0], b[1], b[2], b[3]).to_string()
            } else {
                "127.0.0.1".to_string()
            }
        } else {
            // IPv6 or wildcard
            "localhost".to_string()
        };

        // inode column (index 9)
        let inode_str = parts[9];
        if let Ok(inode) = inode_str.parse::<u64>() {
            if inode > 0 {
                map.insert(inode, (host, port));
            }
        }
    }
    map
}

/// Scans local listening ports belonging to processes whose current working directory
/// is inside any of the provided `worktree_paths`.
pub fn scan_listening_ports_for_worktrees(worktree_paths: &[String]) -> Vec<WorkspacePort> {
    if worktree_paths.is_empty() {
        return Vec::new();
    }

    let mut listening_inodes = HashMap::new();

    // Read IPv4 listening sockets
    if let Ok(content) = fs::read_to_string("/proc/net/tcp") {
        listening_inodes.extend(parse_proc_net_tcp_content(&content));
    }

    // Read IPv6 listening sockets
    if let Ok(content) = fs::read_to_string("/proc/net/tcp6") {
        listening_inodes.extend(parse_proc_net_tcp_content(&content));
    }

    if listening_inodes.is_empty() {
        return Vec::new();
    }

    // Normalize worktree paths for prefix comparisons
    let canonical_wts: Vec<(PathBuf, &String)> = worktree_paths
        .iter()
        .map(|w| (Path::new(w).canonicalize().unwrap_or_else(|_| PathBuf::from(w)), w))
        .collect();

    let mut results = Vec::new();

    let proc_dir = match fs::read_dir("/proc") {
        Ok(d) => d,
        Err(_) => return Vec::new(),
    };

    for entry in proc_dir.flatten() {
        let file_name = entry.file_name();
        let name_str = file_name.to_string_lossy();
        let pid = match name_str.parse::<u32>() {
            Ok(p) => p,
            Err(_) => continue,
        };

        let proc_path = entry.path();
        let cwd_link = proc_path.join("cwd");

        let cwd_target = match fs::read_link(&cwd_link) {
            Ok(target) => target,
            Err(_) => continue,
        };

        // Check if this process runs in one of our worktrees
        let matching_wt = canonical_wts.iter().find(|(wt_can, _)| {
            cwd_target == *wt_can || cwd_target.starts_with(wt_can)
        });

        let worktree_str = match matching_wt {
            Some((_, original_str)) => (*original_str).clone(),
            None => continue,
        };

        // Get process name
        let comm = fs::read_to_string(proc_path.join("comm"))
            .map(|s| s.trim().to_string())
            .ok();

        // Scan process file descriptors for sockets matching our listening inodes
        let fd_dir = match fs::read_dir(proc_path.join("fd")) {
            Ok(d) => d,
            Err(_) => continue,
        };

        for fd_entry in fd_dir.flatten() {
            if let Ok(link_target) = fs::read_link(fd_entry.path()) {
                let target_str = link_target.to_string_lossy();
                if target_str.starts_with("socket:[") && target_str.ends_with(']') {
                    let inode_part = &target_str[8..target_str.len() - 1];
                    if let Ok(inode) = inode_part.parse::<u64>() {
                        if let Some((host, port)) = listening_inodes.get(&inode) {
                            results.push(WorkspacePort {
                                port: *port,
                                host: host.clone(),
                                pid: Some(pid),
                                process_name: comm.clone(),
                                worktree_path: worktree_str.clone(),
                            });
                        }
                    }
                }
            }
        }
    }

    // Deduplicate by (worktree_path, port)
    results.sort_by(|a, b| a.port.cmp(&b.port));
    results.dedup_by(|a, b| a.worktree_path == b.worktree_path && a.port == b.port);

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_proc_net_tcp_listening() {
        let sample = "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode\n   0: 0100007F:0BB8 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 12345 1 0000000000000000 100 0 0 10 0\n   1: 00000000:1F90 00000000:0000 01 00000000:00000000 00:00000000 00000000  1000        0 67890 1 0000000000000000 100 0 0 10 0";
        let parsed = parse_proc_net_tcp_content(sample);
        assert_eq!(parsed.len(), 1);
        let entry = parsed.get(&12345).expect("must find inode 12345");
        assert_eq!(entry.0, "127.0.0.1");
        assert_eq!(entry.1, 3000); // 0x0BB8 is 3000
    }
}
