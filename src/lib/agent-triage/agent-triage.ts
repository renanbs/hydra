// Native buffer triage for agent states, MCP tools, and message previews.

import type { AgentStatusState, AgentSubagentSnapshot } from "../../components/sidebar/agent-status-types";

export interface TriageResult {
  state: AgentStatusState;
  toolName?: string;
  toolInput?: string;
  lastAssistantMessage?: string;
  subagents?: AgentSubagentSnapshot[];
  coordinatorHandle?: string;
  parentPaneKey?: string;
  confidence: number;
  decisionTier: "high" | "heuristic" | "fallback";
}

// Confidence thresholds for state classification
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,       // Tier 1: Auto-accept and display directly
  AMBIGUOUS: 0.60,  // Tier 2: Heuristic / secondary verification
} as const;

/**
 * Extracts MCP tool calls, CLI tools, and agent states from terminal text or hook messages
 * using System 1 parallel pattern matching and calibrated probability scoring.
 */
export function triageAgentStateFromBuffer(
  text: string,
  previousState?: AgentStatusState
): TriageResult {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return {
      state: "idle",
      confidence: 1.0,
      decisionTier: "high",
    };
  }

  const tail = lines.slice(-20).join("\n");
  const lowerTail = tail.toLowerCase();

  // 1. Tool Call Detection (MCP & Native Tools)
  let toolName: string | undefined;
  let toolInput: string | undefined;
  let toolConfidence = 0.0;

  // Patterns for MCP tools: e.g. "mcp__server__tool" or "Calling MCP tool: ..."
  const mcpMatch = tail.match(/(?:call(?:ing)?\s+tool\s+)?(mcp__[a-zA-Z0-9_-]+__[a-zA-Z0-9_-]+)/i);
  if (mcpMatch) {
    toolName = mcpMatch[1];
    toolConfidence = 0.95;
    // Try extract argument preview on next line or nearby
    const inputMatch = tail.match(new RegExp(`${toolName}[^\\n]*\\n\\s*(?:input|args|command)?:?\\s*(.+)$`, "im"));
    if (inputMatch) {
      toolInput = inputMatch[1].trim().slice(0, 100);
    }
  }

  // Common agent tool names: Bash, Edit, Read, Write, Grep, Glob, etc.
  if (!toolName) {
    const toolPatterns = [
      /(?:tool|running|executing):\s*([A-Za-z0-9_.-]+)(?:\(([^)]*)\))?/i,
      /(?:Action|Tool):\s*([A-Za-z0-9_.-]+)\s*(?:with|args|input)?:\s*([^\n]+)?/i,
      /`([^`]+)`\s*(?:\.\.\.|running)/i,
    ];

    for (const pat of toolPatterns) {
      const match = tail.match(pat);
      if (match) {
        toolName = match[1];
        if (match[2]) {
          toolInput = match[2].trim().slice(0, 80);
        }
        toolConfidence = 0.88;
        break;
      }
    }
  }

  // 2. Subagents & Orchestration Detection
  const subagents: AgentSubagentSnapshot[] = [];
  let coordinatorHandle: string | undefined;

  const subagentMatches = tail.matchAll(/(?:spawned|dispatched|subagent)\s+([A-Za-z0-9_-]+)/gi);
  for (const m of subagentMatches) {
    subagents.push({
      id: `sub_${m[1]}_${Date.now()}`,
      agentType: m[1],
      state: "working",
      startedAt: Date.now(),
    });
  }
  if (subagents.length > 0) {
    coordinatorHandle = "coordinator_main";
  }

  // 3. Assistant Message Preview Extraction
  let lastAssistantMessage: string | undefined;
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 8); i--) {
    const line = lines[i];
    if (
      !line.startsWith("$") &&
      !line.startsWith("#") &&
      !line.startsWith(">") &&
      !line.includes("Compiling") &&
      !line.includes("Building") &&
      line.length > 10 &&
      line.length < 250
    ) {
      lastAssistantMessage = line;
      break;
    }
  }

  // 4. State Classification & Confidence Gating
  let state: AgentStatusState = "unknown";
  let stateConfidence = 0.50;

  if (
    lowerTail.includes("[y/n]") ||
    lowerTail.includes("(y/n)") ||
    lowerTail.includes("allow this command?") ||
    lowerTail.includes("press enter to continue") ||
    lowerTail.includes("do you want to continue") ||
    lowerTail.includes("permission denied")
  ) {
    state = "blocked";
    stateConfidence = 0.95;
  } else if (
    lowerTail.includes("waiting for your input") ||
    lowerTail.includes("waiting for") ||
    lowerTail.includes("what would you like to")
  ) {
    state = "waiting";
    stateConfidence = 0.90;
  } else if (
    toolName ||
    lowerTail.includes("compiling ") ||
    lowerTail.includes("building ") ||
    lowerTail.includes("running ") ||
    lowerTail.includes("thinking...") ||
    lowerTail.includes("fetching ") ||
    tail.includes("✳") ||
    tail.includes("✢") ||
    tail.includes("•") ||
    tail.includes("✶")
  ) {
    state = "working";
    stateConfidence = toolConfidence > 0 ? Math.max(0.85, toolConfidence) : 0.88;
  } else if (
    lowerTail.endsWith("$") ||
    lowerTail.endsWith("#") ||
    lowerTail.endsWith(">") ||
    lowerTail.endsWith("%")
  ) {
    if (previousState === "working" || previousState === "blocked" || previousState === "waiting") {
      state = "done";
      stateConfidence = 0.86;
    } else {
      state = "idle";
      stateConfidence = 0.92;
    }
  }

  const overallConfidence = Math.min(stateConfidence, toolConfidence > 0 ? toolConfidence : stateConfidence);
  const decisionTier =
    overallConfidence >= CONFIDENCE_THRESHOLDS.HIGH
      ? "high"
      : overallConfidence >= CONFIDENCE_THRESHOLDS.AMBIGUOUS
      ? "heuristic"
      : "fallback";

  return {
    state,
    toolName,
    toolInput,
    lastAssistantMessage,
    subagents: subagents.length > 0 ? subagents : undefined,
    coordinatorHandle,
    confidence: overallConfidence,
    decisionTier,
  };
}
