#!/bin/sh
# Hydra managed Claude hook (posix). Port of Orca `claude/hook-script.ts`
# (posix lane) with the Hydra decisions applied: `HYDRA_*` namespace,
# opaque pane key (= Claude `session_id`).
#
# Fail-open: every path ends in `exit 0` so a broken install never blocks
# the agent. Payloads that cannot be POSTed fall back to the spool dir next
# to the endpoint file for later replay.

# Why first: Claude-compatible permission hooks fail closed on empty stdout.
printf "{}\n"

# Why `command -p`: a stripped PATH must not break stdin capture (Orca #8110).
payload=$({ command -p cat 2>/dev/null || cat; })
if [ -z "$payload" ]; then
  exit 0
fi

spool_json_escape() { printf %s "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/[[:cntrl:]]/ /g'; }

spool_hook_event() {
  [ -n "${HYDRA_AGENT_HOOK_ENDPOINT:-}" ] || return 0
  # Why: an endpoint can linger in a parent shell after leaving Hydra; without
  # a pane key the record is un-attributable and would pile up as unknown.
  [ -n "${HYDRA_PANE_KEY:-}" ] || return 0
  # Why: a stale env var must not create a spool tree for a Hydra install
  # that no longer exists here.
  [ -r "$HYDRA_AGENT_HOOK_ENDPOINT" ] || return 0
  spool_base=${HYDRA_AGENT_HOOK_ENDPOINT%/*}
  spool_dir="$spool_base/spool"
  mkdir -p "$spool_dir" 2>/dev/null || return 0
  chmod 700 "$spool_dir" 2>/dev/null || :
  spool_id=$(printf %s "${HYDRA_PANE_KEY:-unknown}" | tail -c 36 | tr '/:' '__')
  spool_file="$spool_dir/pane-$spool_id.jsonl"
  if [ -f "$spool_file" ] && find "$spool_file" -mtime +7 -print -quit 2>/dev/null | grep -q .; then : > "$spool_file"; fi
  [ -f "$spool_file" ] || : > "$spool_file"
  spool_size=$(wc -c < "$spool_file" 2>/dev/null || printf 0)
  [ "$spool_size" -lt 5242880 ] || return 0
  spool_now=$(date +%s 2>/dev/null || printf 0)
  spool_now=$((spool_now * 1000))
  { printf '\n{"paneKey":"%s","tabId":"%s","worktreeId":"%s","env":"%s","version":"%s","launchToken":"%s","source":"%s","receivedAt":%s,"payload":%s}\n' \
    "$(spool_json_escape "${HYDRA_PANE_KEY:-}")" "$(spool_json_escape "${HYDRA_TAB_ID:-}")" "$(spool_json_escape "${HYDRA_WORKTREE_ID:-}")" "$(spool_json_escape "${HYDRA_AGENT_HOOK_ENV:-}")" "$(spool_json_escape "${HYDRA_AGENT_HOOK_VERSION:-}")" "$(spool_json_escape "${HYDRA_AGENT_LAUNCH_TOKEN:-}")" "$(spool_json_escape "claude")" "$spool_now" "$payload"; } >> "$spool_file" 2>/dev/null || :
  chmod 600 "$spool_file" 2>/dev/null || :
}

# Why: refresh endpoint coordinates for PTYs surviving a Hydra restart.
# Why: suppress parse errors so they neither leak nor trip outer set -e.
if [ -n "$HYDRA_AGENT_HOOK_ENDPOINT" ] && [ -r "$HYDRA_AGENT_HOOK_ENDPOINT" ]; then
  unset HYDRA_AGENT_HOOK_TRANSPORT
  . "$HYDRA_AGENT_HOOK_ENDPOINT" 2>/dev/null || :
fi
if [ -z "$HYDRA_AGENT_HOOK_PORT" ] || [ -z "$HYDRA_AGENT_HOOK_TOKEN" ] || [ -z "$HYDRA_PANE_KEY" ]; then
  spool_hook_event
  exit 0
fi

# Why: keep full hook JSON off the command line (mirror Orca post-command).
post_hydra_hook() {
  curl_bin="$1"
  connect_timeout="${2:-0.5}"
  max_time="${3:-1.5}"
  if [ "${HYDRA_AGENT_HOOK_TRANSPORT:-}" = "raw-json-v1" ] && command -v base64 >/dev/null 2>&1 && command -v tr >/dev/null 2>&1; then
    hydra_hook_metadata=$(printf '%s\037%s\037%s\037%s\037%s\037%s' "$HYDRA_PANE_KEY" "$HYDRA_TAB_ID" "$HYDRA_AGENT_LAUNCH_TOKEN" "$HYDRA_WORKTREE_ID" "$HYDRA_AGENT_HOOK_ENV" "$HYDRA_AGENT_HOOK_VERSION" | base64 | tr -d '\n') && \
    [ -n "$hydra_hook_metadata" ] && \
    printf '%s' "$payload" | "$curl_bin" -sS -X POST "http://127.0.0.1:${HYDRA_AGENT_HOOK_PORT}/hook/claude" \
      --connect-timeout "$connect_timeout" --max-time "$max_time" \
      --noproxy "127.0.0.1" \
      -H "Content-Type: application/json" \
      -H "X-Hydra-Agent-Hook-Token: ${HYDRA_AGENT_HOOK_TOKEN}" \
      -H "X-Hydra-Agent-Hook-Meta-Encoding: base64" \
      -H "X-Hydra-Agent-Hook-Meta: ${hydra_hook_metadata}" \
      --data-binary @-
  else
    printf '%s' "$payload" | "$curl_bin" -sS -X POST "http://127.0.0.1:${HYDRA_AGENT_HOOK_PORT}/hook/claude" \
      --connect-timeout "$connect_timeout" --max-time "$max_time" \
      --noproxy "127.0.0.1" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -H "X-Hydra-Agent-Hook-Token: ${HYDRA_AGENT_HOOK_TOKEN}" \
      --data-urlencode "paneKey=${HYDRA_PANE_KEY}" \
      --data-urlencode "tabId=${HYDRA_TAB_ID}" \
      --data-urlencode "launchToken=${HYDRA_AGENT_LAUNCH_TOKEN}" \
      --data-urlencode "worktreeId=${HYDRA_WORKTREE_ID}" \
      --data-urlencode "env=${HYDRA_AGENT_HOOK_ENV}" \
      --data-urlencode "version=${HYDRA_AGENT_HOOK_VERSION}" \
      --data-urlencode "payload@-"
  fi
}

if post_hydra_hook curl >/dev/null 2>&1; then
  exit 0
fi
spool_hook_event
exit 0
