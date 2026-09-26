// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/lib/use-tab-agent.ts & src/shared/terminal-title-agent-type.ts

import type { TabItem } from "./WorkbenchTabBar";
import type { WorktreeSession } from "../sidebar/types";

export const SHELL_EXECUTABLES: Record<string, true> = {
  bash: true,
  sh: true,
  zsh: true,
  fish: true,
  dash: true,
  ksh: true,
  csh: true,
  tcsh: true,
  pwsh: true,
  powershell: true,
  cmd: true,
  shell: true,
  terminal: true,
};

export function isShellProcess(name: string | null | undefined): boolean {
  if (!name) return true;
  const lower = name.trim().toLowerCase();
  const base = lower.replaceAll("\\", "/").split("/").pop() || lower;
  const noExe = base.replace(/\.(?:exe|cmd|bat|ps1)$/i, "");
  return Boolean(SHELL_EXECUTABLES[noExe] || SHELL_EXECUTABLES[base] || SHELL_EXECUTABLES[lower]);
}

interface AgentMatcher {
  id: string;
  name: string;
  test: (input: string) => boolean;
}

const AGENT_TITLE_MATCHERS: AgentMatcher[] = [
  { id: "omp", name: "Oh My Pi (OMP)", test: (t) => /\b(?:omp|oh\s+my\s+pi)\b/i.test(t) || t.includes("π") },
  { id: "pi", name: "Pi", test: (t) => /(?<![\w./\\-])pi(?![\w./\\-])/i.test(t) },
  { id: "claude", name: "Claude Code", test: (t) => /(?<![\w./\\-])claude(?![\w./\\-])/i.test(t) || t.includes("✳") },
  { id: "opencode", name: "OpenCode", test: (t) => /(?<![\w./\\-])opencode(?![\w./\\-])/i.test(t) },
  { id: "codex", name: "Codex", test: (t) => /(?<![\w./\\-])(?:codex|chatgpt|openai)(?![\w./\\-])/i.test(t) },
  { id: "cursor", name: "Cursor", test: (t) => /(?<![\w./\\-])cursor(?![\w./\\-])/i.test(t) },
  { id: "gemini", name: "Gemini", test: (t) => /(?<![\w./\\-])gemini(?![\w./\\-])/i.test(t) || /[✦⏲◇✋]/.test(t) },
  { id: "droid", name: "Droid", test: (t) => /(?<![\w./\\-])droid(?![\w./\\-])/i.test(t) },
  { id: "aider", name: "Aider", test: (t) => /(?<![\w./\\-])aider(?![\w./\\-])/i.test(t) },
  { id: "copilot", name: "Copilot", test: (t) => /(?<![\w./\\-])copilot(?![\w./\\-])/i.test(t) },
];

export function resolveAgentFromTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  for (const matcher of AGENT_TITLE_MATCHERS) {
    if (matcher.test(title)) return matcher.id;
  }
  return null;
}

export function resolveTabAgent(tab: TabItem, sessions?: WorktreeSession[]): string | null {
  // 1. Explicit agent on TabItem
  if (tab.agentId && !isShellProcess(tab.agentId)) return tab.agentId;
  if (tab.agentName && !isShellProcess(tab.agentName)) return tab.agentName;

  // 2. Direct session lookup
  if (tab.sessionId && sessions && sessions.length > 0) {
    const s = sessions.find((sess) => sess.id === tab.sessionId);
    if (s?.agentName && !isShellProcess(s.agentName)) return s.agentName;
  }

  // 3. Split panes session lookup
  if (tab.splitPanes && tab.splitPanes.length > 0 && sessions && sessions.length > 0) {
    for (const pane of tab.splitPanes) {
      const s = sessions.find((sess) => sess.id === pane.sessionId);
      if (s?.agentName && !isShellProcess(s.agentName)) return s.agentName;
    }
  }

  // 4. Executable
  if (tab.executable && !isShellProcess(tab.executable)) {
    return tab.executable;
  }

  // 5. Title heuristic (Orca resolveExplicitTerminalTitleAgentType)
  return resolveAgentFromTitle(tab.title);
}
