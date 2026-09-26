// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/shared/agent-title-decoration.ts

const LEADING_AGENT_TITLE_DECORATION_RE =
  /^(?:>_\s*|[✳✦⏲◇✋⠀-⣿◐-◓]+|[.*]\s)\s*/;

export function stripLeadingAgentTitleDecorationOrEmpty(title: string): string {
  return title.replace(LEADING_AGENT_TITLE_DECORATION_RE, "").trimStart();
}

export function stripLeadingAgentTitleDecoration(title: string): string {
  const stripped = stripLeadingAgentTitleDecorationOrEmpty(title);
  return stripped.length > 0 ? stripped : title;
}
