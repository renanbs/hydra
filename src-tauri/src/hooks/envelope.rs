//! Hook transport envelope (G1/T1).
//!
//! Port of Orca `hook-envelope.ts` + `agent-hook-endpoint-file.ts` with the
//! Hydra decisions applied: `HYDRA_*` namespace (D2), opaque `paneKey` (=
//! `session_id`, no `tab:leaf` split, D3), Claude + Codex v1 scope.
//!
//! Two wire modes (mirrors Orca `hook-post-command.ts`):
//! * `RAW_JSON`: `X-Hydra-Agent-Hook-Meta` base64 header packs
//!   `paneKey\x1f tabId\x1f launchToken\x1f worktreeId\x1f env\x1f version`
//!   and the body is the raw agent JSON.
//! * legacy form-urlencoded: `paneKey/tabId/launchToken/worktreeId/env/version`
//!   fields plus `payload` holding the JSON document
//!   (`curl --data-urlencode "payload@-"`).
//!
//! Any envelope without a `paneKey` is rejected; fail-open 204 mapping lives
//! in the listener (T2), not here.

use std::collections::HashMap;
use std::fmt;

/// Request headers for [`parse_hook_body`]. Names are matched
/// case-insensitively per HTTP semantics; T2 builds this from the raw
/// loopback request.
pub type HookHeaders = HashMap<String, String>;

/// Header carrying the packed `RAW_JSON` metadata. Its presence selects
/// `RAW_JSON` mode; otherwise the body parses as legacy form-urlencoded.
pub const META_HEADER: &str = "x-hydra-agent-hook-meta";

/// Mirrors Orca `MAX_PANE_KEY_LEN`: real keys are far shorter; the cap bounds
/// per-session caches against pathological input.
pub const MAX_PANE_KEY_LEN: usize = 200;

/// Parsed hook transport envelope. `pane_key` is the opaque session id.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HookEnvelope {
    pub pane_key: String,
    pub tab_id: Option<String>,
    pub launch_token: Option<String>,
    pub worktree_id: Option<String>,
    pub env: Option<String>,
    pub version: Option<String>,
    pub hook_event_name: Option<String>,
    pub payload: serde_json::Value,
}

/// Parsed `endpoint.env` / `endpoint.cmd` file. `port` stays a string (1-1
/// with Orca); consumers parse it to `u16`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HookEndpoint {
    pub port: String,
    pub token: String,
    pub env: String,
    pub version: String,
}

/// Body-parsing failure. Every variant must become fail-open 204 in T2.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EnvelopeError {
    MissingPaneKey,
    PaneKeyTooLong { len: usize },
    InvalidMeta(&'static str),
    InvalidBody(String),
    MissingPayload,
    InvalidPayload(&'static str),
}

impl fmt::Display for EnvelopeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingPaneKey => write!(f, "hook envelope is missing paneKey"),
            Self::PaneKeyTooLong { len } => {
                write!(f, "hook paneKey too long ({len} > {MAX_PANE_KEY_LEN})")
            }
            Self::InvalidMeta(reason) => write!(f, "invalid hook meta header: {reason}"),
            Self::InvalidBody(reason) => write!(f, "invalid hook body: {reason}"),
            Self::MissingPayload => write!(f, "hook envelope is missing payload"),
            Self::InvalidPayload(reason) => write!(f, "invalid hook payload: {reason}"),
        }
    }
}

impl std::error::Error for EnvelopeError {}

/// Endpoint-file failure, naming every missing `HYDRA_*` field.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EndpointError {
    MissingFields(Vec<String>),
}

impl fmt::Display for EndpointError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingFields(fields) => write!(
                f,
                "agent hook endpoint file is missing required fields: {}",
                fields.join(", ")
            ),
        }
    }
}

impl std::error::Error for EndpointError {}

/// Parse a hook request body in either wire mode.
///
/// `RAW_JSON` mode is selected by the presence of [`META_HEADER`]
/// (case-insensitive); the body is then the raw agent JSON and the envelope
/// fields unpack from the base64 `paneKey\0x1F…` meta value. Without the
/// header the body parses as legacy form-urlencoded (`paneKey`, …, `payload`
/// holding the JSON document). Mirrors Orca `mergeAgentHookRequestHeaders` +
/// `parseHookEnvelope` with the D3 opaque-paneKey decision: no `tab:leaf`
/// split, no tabId cross-check.
pub fn parse_hook_body(body: &[u8], headers: &HookHeaders) -> Result<HookEnvelope, EnvelopeError> {
    if let Some(meta) = read_header(headers, META_HEADER) {
        parse_raw_json_body(body, &meta)
    } else {
        parse_legacy_form_body(body)
    }
}

/// Parse an `endpoint.env` / `endpoint.cmd` file (1-1 with Orca
/// `parseAgentHookEndpointFile`, modulo the D2 `HYDRA_*` rename).
///
/// Accepts `endpoint.env` lines and `endpoint.cmd` lines with a case-
/// insensitive `set ` prefix; values keep everything after the first `=`
/// (so base64 `TOKEN=abc==` padding survives). Blank values count as
/// missing, and every missing field is reported, in canonical order.
pub fn parse_endpoint_file(contents: &str) -> Result<HookEndpoint, EndpointError> {
    let mut values: HashMap<String, &str> = HashMap::new();
    for line in contents.split('\n') {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let Some((key, value)) = strip_set_prefix(line).split_once('=') else {
            continue;
        };
        values.insert(key.trim().to_string(), value);
    }
    let mut missing: Vec<String> = Vec::new();
    let mut take = |name: &str| -> Option<String> {
        match values.get(name).map(|value| value.trim()).filter(|value| !value.is_empty()) {
            Some(value) => Some(value.to_string()),
            None => {
                missing.push(name.to_string());
                None
            }
        }
    };
    let port = take("HYDRA_AGENT_HOOK_PORT");
    let token = take("HYDRA_AGENT_HOOK_TOKEN");
    let env = take("HYDRA_AGENT_HOOK_ENV");
    let version = take("HYDRA_AGENT_HOOK_VERSION");
    if !missing.is_empty() {
        return Err(EndpointError::MissingFields(missing));
    }
    // `take` pushed nothing, so every field is present.
    Ok(HookEndpoint {
        port: port.expect("port checked above"),
        token: token.expect("token checked above"),
        env: env.expect("env checked above"),
        version: version.expect("version checked above"),
    })
}

/// sha256 hex fence for the spool/pipeline launch-token check.
/// `None` for blank input (mirrors Orca `launchTokenHash` null).
pub fn launch_token_hash(token: &str) -> Option<String> {
    use sha2::Digest as _;
    let trimmed = token.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(hex::encode(sha2::Sha256::digest(trimmed.as_bytes())))
}

fn read_header(headers: &HookHeaders, name: &str) -> Option<String> {
    headers
        .iter()
        .find(|(key, _)| key.eq_ignore_ascii_case(name))
        .map(|(_, value)| value.clone())
}

fn parse_raw_json_body(body: &[u8], meta: &str) -> Result<HookEnvelope, EnvelopeError> {
    use base64::Engine as _;
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(meta.trim())
        .map_err(|_| EnvelopeError::InvalidMeta("meta is not valid base64"))?;
    let decoded = String::from_utf8(decoded)
        .map_err(|_| EnvelopeError::InvalidMeta("meta is not utf-8"))?;
    // POSIX command substitution strips NUL bytes, so the hook script joins
    // the six fields with the shell-safe unit separator (Orca convention).
    let fields: Vec<&str> = decoded.split('\x1f').collect();
    if fields.len() != 6 {
        return Err(EnvelopeError::InvalidMeta("meta must pack 6 unit-separator fields"));
    }
    let pane_key = fields[0].trim().to_string();
    if pane_key.is_empty() {
        return Err(EnvelopeError::MissingPaneKey);
    }
    check_pane_key_len(&pane_key)?;
    let payload = parse_json_payload(body)?;
    Ok(HookEnvelope {
        pane_key,
        tab_id: opt_field(fields[1]),
        launch_token: opt_field(fields[2]),
        worktree_id: opt_field(fields[3]),
        env: opt_field(fields[4]),
        version: opt_field(fields[5]),
        hook_event_name: read_event_name(&payload),
        payload,
    })
}

fn parse_legacy_form_body(body: &[u8]) -> Result<HookEnvelope, EnvelopeError> {
    let text = std::str::from_utf8(body)
        .map_err(|err| EnvelopeError::InvalidBody(format!("body is not utf-8: {err}")))?;
    let mut fields: HashMap<String, String> = HashMap::new();
    for (key, value) in form_urlencoded::parse(text.as_bytes()) {
        fields.insert(key.into_owned(), value.into_owned());
    }
    let pane_key = fields
        .get("paneKey")
        .map(|pane_key| pane_key.trim().to_string())
        .unwrap_or_default();
    if pane_key.is_empty() {
        return Err(EnvelopeError::MissingPaneKey);
    }
    check_pane_key_len(&pane_key)?;
    let raw_payload = fields.get("payload").map(String::as_str).unwrap_or("");
    if raw_payload.trim().is_empty() {
        return Err(EnvelopeError::MissingPayload);
    }
    let payload = parse_json_payload(raw_payload.as_bytes())?;
    Ok(HookEnvelope {
        pane_key,
        tab_id: opt_field(fields.get("tabId").map(String::as_str).unwrap_or("")),
        launch_token: opt_field(fields.get("launchToken").map(String::as_str).unwrap_or("")),
        worktree_id: opt_field(fields.get("worktreeId").map(String::as_str).unwrap_or("")),
        env: opt_field(fields.get("env").map(String::as_str).unwrap_or("")),
        version: opt_field(fields.get("version").map(String::as_str).unwrap_or("")),
        hook_event_name: read_event_name(&payload),
        payload,
    })
}

fn parse_json_payload(body: &[u8]) -> Result<serde_json::Value, EnvelopeError> {
    let text = std::str::from_utf8(body)
        .map_err(|_| EnvelopeError::InvalidPayload("payload is not utf-8"))?;
    // Mirror Orca `parseAgentHookJson`: strip exactly one leading BOM.
    let text = text.strip_prefix('\u{feff}').unwrap_or(text);
    if text.trim().is_empty() {
        return Err(EnvelopeError::MissingPayload);
    }
    let value: serde_json::Value = serde_json::from_str(text)
        .map_err(|_| EnvelopeError::InvalidPayload("payload is not valid JSON"))?;
    if !value.is_object() {
        return Err(EnvelopeError::InvalidPayload("payload must be a JSON object"));
    }
    Ok(value)
}

/// First non-blank string among the event-name keys. Order mirrors Orca
/// `agent-hook-listener.ts` (envelope `hook_event_name` / `hookEventName` /
/// `hook_type` / `hookType`, then the payload's own).
fn read_event_name(payload: &serde_json::Value) -> Option<String> {
    const KEYS: [&str; 4] = ["hook_event_name", "hookEventName", "hook_type", "hookType"];
    let object = payload.as_object()?;
    KEYS.iter().find_map(|key| {
        object
            .get(*key)
            .and_then(|value| value.as_str())
            .map(str::trim)
            .filter(|name| !name.is_empty())
            .map(str::to_string)
    })
}

fn opt_field(value: &str) -> Option<String> {
    let trimmed = value.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_string())
}

fn check_pane_key_len(pane_key: &str) -> Result<(), EnvelopeError> {
    if pane_key.len() > MAX_PANE_KEY_LEN {
        return Err(EnvelopeError::PaneKeyTooLong { len: pane_key.len() });
    }
    Ok(())
}

/// Strip one leading `set ` prefix (case-insensitive) for `endpoint.cmd`
/// files. Mirrors Orca `line.replace(/^set\s+/i, '')`.
fn strip_set_prefix(line: &str) -> &str {
    if line.get(..3).is_some_and(|prefix| prefix.eq_ignore_ascii_case("set"))
        && line.get(3..4).is_some_and(|next| next.starts_with(|c: char| c.is_whitespace()))
    {
        line[3..].trim_start()
    } else {
        line
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine as _;

    const CLAUDE_STOP_PAYLOAD: &str = r#"{
        "session_id": "sess-abc-123",
        "transcript_path": "/home/renan/.claude/projects/my-project/sess-abc-123.jsonl",
        "cwd": "/home/renan/my & project",
        "hook_event_name": "Stop",
        "stop_hook_active": false
    }"#;

    /// paneKey\x1f tabId\x1f launchToken\x1f worktreeId\x1f env\x1f version
    fn claude_stop_meta() -> String {
        base64::engine::general_purpose::STANDARD.encode(
            "sess-01\x1fTAB-7\x1ftok-launch-1\x1fwt-3\x1fdev\x1f0.1.0",
        )
    }

    fn meta_headers(meta: &str) -> HookHeaders {
        let mut headers = HookHeaders::new();
        headers.insert("X-Hydra-Agent-Hook-Meta".to_string(), meta.to_string());
        headers.insert(
            "X-Hydra-Agent-Hook-Meta-Encoding".to_string(),
            "base64".to_string(),
        );
        headers
    }

    fn claude_stop_form_body() -> Vec<u8> {
        let mut body = form_urlencoded::Serializer::new(String::new());
        body.append_pair("paneKey", "sess-01");
        body.append_pair("tabId", "TAB-7");
        body.append_pair("launchToken", "tok-launch-1");
        body.append_pair("worktreeId", "wt-3");
        body.append_pair("env", "dev");
        body.append_pair("version", "0.1.0");
        body.append_pair("payload", CLAUDE_STOP_PAYLOAD);
        body.finish().into_bytes()
    }

    fn assert_claude_stop(envelope: &HookEnvelope) {
        assert_eq!(envelope.pane_key, "sess-01");
        assert_eq!(envelope.tab_id.as_deref(), Some("TAB-7"));
        assert_eq!(envelope.launch_token.as_deref(), Some("tok-launch-1"));
        assert_eq!(envelope.worktree_id.as_deref(), Some("wt-3"));
        assert_eq!(envelope.env.as_deref(), Some("dev"));
        assert_eq!(envelope.version.as_deref(), Some("0.1.0"));
        assert_eq!(envelope.hook_event_name.as_deref(), Some("Stop"));
        assert_eq!(envelope.payload["hook_event_name"], "Stop");
        // form/JSON metacharacters must survive transport decoding verbatim.
        assert_eq!(envelope.payload["cwd"], "/home/renan/my & project");
        assert_eq!(envelope.payload["session_id"], "sess-abc-123");
    }

    #[test]
    fn raw_json_claude_stop_extracts_pane_key_and_event() {
        let envelope =
            parse_hook_body(CLAUDE_STOP_PAYLOAD.as_bytes(), &meta_headers(&claude_stop_meta()))
                .expect("RAW_JSON Stop envelope parses");
        assert_claude_stop(&envelope);
    }

    #[test]
    fn legacy_form_claude_stop_extracts_pane_key_and_event() {
        let envelope = parse_hook_body(&claude_stop_form_body(), &HookHeaders::new())
            .expect("form-urlencoded Stop envelope parses");
        assert_claude_stop(&envelope);
    }

    #[test]
    fn raw_json_empty_optionals_become_none() {
        let meta = base64::engine::general_purpose::STANDARD.encode("sess-01\x1f\x1f\x1f\x1f\x1f");
        let envelope = parse_hook_body(CLAUDE_STOP_PAYLOAD.as_bytes(), &meta_headers(&meta))
            .expect("sparse meta parses");
        assert_eq!(envelope.pane_key, "sess-01");
        assert_eq!(envelope.tab_id, None);
        assert_eq!(envelope.launch_token, None);
        assert_eq!(envelope.worktree_id, None);
        assert_eq!(envelope.env, None);
        assert_eq!(envelope.version, None);
        assert_eq!(envelope.hook_event_name.as_deref(), Some("Stop"));
    }

    #[test]
    fn payload_camel_case_event_name_is_accepted() {
        let payload = r#"{"hookEventName":"Stop","session_id":"s"}"#;
        let envelope = parse_hook_body(payload.as_bytes(), &meta_headers(&claude_stop_meta()))
            .expect("camelCase hookEventName parses");
        assert_eq!(envelope.hook_event_name.as_deref(), Some("Stop"));
    }

    #[test]
    fn raw_json_rejects_missing_pane_key() {
        let meta = base64::engine::general_purpose::STANDARD.encode("\x1fTAB-7\x1f\x1f\x1f\x1f");
        let err = parse_hook_body(CLAUDE_STOP_PAYLOAD.as_bytes(), &meta_headers(&meta))
            .expect_err("empty paneKey must be rejected");
        assert_eq!(err, EnvelopeError::MissingPaneKey);
    }

    #[test]
    fn legacy_form_rejects_missing_pane_key() {
        let mut body = form_urlencoded::Serializer::new(String::new());
        body.append_pair("payload", CLAUDE_STOP_PAYLOAD);
        let err = parse_hook_body(body.finish().as_bytes(), &HookHeaders::new())
            .expect_err("missing paneKey must be rejected");
        assert_eq!(err, EnvelopeError::MissingPaneKey);
    }

    #[test]
    fn rejects_oversized_pane_key() {
        let long_key = "x".repeat(MAX_PANE_KEY_LEN + 1);
        let mut body = form_urlencoded::Serializer::new(String::new());
        body.append_pair("paneKey", &long_key);
        body.append_pair("payload", CLAUDE_STOP_PAYLOAD);
        let err = parse_hook_body(body.finish().as_bytes(), &HookHeaders::new())
            .expect_err("oversized paneKey must be rejected");
        assert_eq!(
            err,
            EnvelopeError::PaneKeyTooLong {
                len: MAX_PANE_KEY_LEN + 1
            }
        );
    }

    #[test]
    fn endpoint_file_parses_env_style() {
        let endpoint = parse_endpoint_file(
            "HYDRA_AGENT_HOOK_PORT=4567\nHYDRA_AGENT_HOOK_TOKEN=tok123\nHYDRA_AGENT_HOOK_ENV=dev\nHYDRA_AGENT_HOOK_VERSION=0.1.0\n",
        )
        .expect("complete endpoint.env parses");
        assert_eq!(
            endpoint,
            HookEndpoint {
                port: "4567".to_string(),
                token: "tok123".to_string(),
                env: "dev".to_string(),
                version: "0.1.0".to_string(),
            }
        );
    }

    #[test]
    fn endpoint_file_parses_cmd_style_with_set_prefix() {
        let endpoint = parse_endpoint_file(
            "set HYDRA_AGENT_HOOK_PORT=4567\r\nset HYDRA_AGENT_HOOK_TOKEN=tok123\r\nset HYDRA_AGENT_HOOK_ENV=dev\r\nset HYDRA_AGENT_HOOK_VERSION=0.1.0\r\n",
        )
        .expect("complete endpoint.cmd parses");
        assert_eq!(endpoint.port, "4567");
        assert_eq!(endpoint.token, "tok123");
    }

    #[test]
    fn endpoint_file_preserves_token_padding() {
        let endpoint = parse_endpoint_file(
            "HYDRA_AGENT_HOOK_PORT=4567\nHYDRA_AGENT_HOOK_TOKEN=abc==\nHYDRA_AGENT_HOOK_ENV=dev\nHYDRA_AGENT_HOOK_VERSION=0.1.0\n",
        )
        .expect("token with = padding parses");
        assert_eq!(endpoint.token, "abc==");
    }

    #[test]
    fn endpoint_file_rejects_incomplete() {
        let err = parse_endpoint_file(
            "HYDRA_AGENT_HOOK_PORT=4567\nHYDRA_AGENT_HOOK_ENV=dev\nHYDRA_AGENT_HOOK_VERSION=0.1.0\n",
        )
        .expect_err("endpoint without TOKEN must be rejected");
        assert_eq!(
            err,
            EndpointError::MissingFields(vec!["HYDRA_AGENT_HOOK_TOKEN".to_string()])
        );
    }

    #[test]
    fn launch_token_hash_known_vector() {
        // sha256("abc")
        assert_eq!(
            launch_token_hash("abc").as_deref(),
            Some("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
        );
    }

    #[test]
    fn launch_token_hash_blank_is_none_and_trims() {
        assert_eq!(launch_token_hash(""), None);
        assert_eq!(launch_token_hash("   "), None);
        assert_eq!(launch_token_hash("  abc  "), launch_token_hash("abc"));
    }
}
