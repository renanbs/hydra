//! Shared randomness helpers for the hook stack.
//!
//! Single home for `random_hex`, previously duplicated in `endpoint.rs` (T4)
//! and `server.rs` (T2): both mint hex tokens from the OS RNG with the same
//! time/pid/counter xorshift fallback when `/dev/urandom` is unavailable.

/// Lowercase hex from the OS RNG (`/dev/urandom`), falling back to a
/// time/pid/counter xorshift when unavailable.
pub fn random_hex(nbytes: usize) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut bytes = vec![0u8; nbytes];
    let filled = std::fs::File::open("/dev/urandom")
        .and_then(|mut f| {
            use std::io::Read as _;
            let mut got = 0;
            while got < nbytes {
                let n = f.read(&mut bytes[got..])?;
                if n == 0 {
                    break;
                }
                got += n;
            }
            Ok::<_, std::io::Error>(got)
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
