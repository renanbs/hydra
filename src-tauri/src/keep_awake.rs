use parking_lot::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeepAwakeStatus {
    pub enabled: bool,
    pub working_count: usize,
    pub active: bool,
}

pub struct KeepAwakeManager {
    inner: Mutex<Inner>,
}

struct Inner {
    enabled: bool,
    working_count: usize,
    // KeepAwake handle keeps the assertion alive while Some
    #[allow(dead_code)]
    handle: Option<keepawake::KeepAwake>,
}

impl KeepAwakeManager {
    pub fn new(enabled: bool) -> Self {
        Self {
            inner: Mutex::new(Inner {
                enabled,
                working_count: 0,
                handle: None,
            }),
        }
    }

    pub fn set_enabled(&self, enabled: bool) {
        let mut inner = self.inner.lock();
        if inner.enabled == enabled {
            return;
        }
        inner.enabled = enabled;
        Self::reconcile(&mut inner);
    }

    pub fn set_working_count(&self, count: usize) {
        let mut inner = self.inner.lock();
        if inner.working_count == count {
            return;
        }
        inner.working_count = count;
        Self::reconcile(&mut inner);
    }

    pub fn sync(&self, enabled: bool, working_count: usize) {
        let mut inner = self.inner.lock();
        if inner.enabled == enabled && inner.working_count == working_count {
            return;
        }
        inner.enabled = enabled;
        inner.working_count = working_count;
        Self::reconcile(&mut inner);
    }

    pub fn get_status(&self) -> KeepAwakeStatus {
        let inner = self.inner.lock();
        let active = inner.handle.is_some();
        KeepAwakeStatus {
            enabled: inner.enabled,
            working_count: inner.working_count,
            active,
        }
    }

    fn reconcile(inner: &mut Inner) {
        let should_block = inner.enabled && inner.working_count > 0;
        let is_blocking = inner.handle.is_some();
        if should_block == is_blocking {
            return;
        }
        if should_block {
            // Try to acquire keep-awake handle
            // Use display=true (prevent display sleep) + idle=true (prevent system idle sleep) + app_name
            let handle = keepawake::Builder::default()
                .display(true)
                .idle(true)
                .app_name("Hydra ADE")
                .app_reverse_domain("com.hydra.ade")
                .reason("Agents working — keep computer awake enabled")
                .create();
            match handle {
                Ok(h) => {
                    eprintln!("[keep-awake] activated (working_count={})", inner.working_count);
                    inner.handle = Some(h);
                }
                Err(e) => {
                    eprintln!("[keep-awake] failed to activate: {e:?} (working_count={})", inner.working_count);
                    inner.handle = None;
                }
            }
        } else {
            if inner.handle.is_some() {
                eprintln!("[keep-awake] deactivated (enabled={}, working_count={})", inner.enabled, inner.working_count);
            }
            inner.handle = None;
            // KeepAwake handle Drop will release assertion automatically
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keep_awake_status_sync() {
        let manager = KeepAwakeManager::new(false);
        let status = manager.get_status();
        assert!(!status.enabled);
        assert_eq!(status.working_count, 0);

        manager.sync(true, 2);
        let status2 = manager.get_status();
        assert!(status2.enabled);
        assert_eq!(status2.working_count, 2);

        manager.set_working_count(0);
        let status3 = manager.get_status();
        assert!(status3.enabled);
        assert_eq!(status3.working_count, 0);
        assert!(!status3.active);
    }
}
