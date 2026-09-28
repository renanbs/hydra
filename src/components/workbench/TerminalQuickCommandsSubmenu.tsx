import { Play, Plus, Terminal, Pencil } from "lucide-react";
import type { ContextMenuItem } from "../CustomContextMenu";

export interface BuildQuickCommandsOptions {
  onRun: (command: string) => void;
  onInsert: (command: string) => void;
  onCustomPrompt?: () => void;
  projectCommands?: string[];
}

export const DEFAULT_TERMINAL_QUICK_COMMANDS = [
  "git status",
  "git diff",
  "git log --oneline -n 10",
  "cargo check",
  "cargo test",
  "pnpm test",
  "pnpm build",
  "pnpm dev",
];

export function buildTerminalQuickCommandItems({
  onRun,
  onInsert,
  onCustomPrompt,
  projectCommands = [],
}: BuildQuickCommandsOptions): ContextMenuItem[] {
  const allCommands = Array.from(new Set([...projectCommands, ...DEFAULT_TERMINAL_QUICK_COMMANDS]));

  const commandItems: ContextMenuItem[] = allCommands.map((cmd) => ({
    label: cmd,
    icon: <Terminal className="w-3.5 h-3.5 text-neutral-400" />,
    children: [
      {
        label: "Run",
        icon: <Play className="w-3 h-3 text-emerald-400" />,
        onClick: () => onRun(cmd),
      },
      {
        label: "Insert",
        icon: <Plus className="w-3 h-3 text-blue-400" />,
        onClick: () => onInsert(cmd),
      },
    ],
    onClick: () => onRun(cmd),
  }));

  if (onCustomPrompt) {
    commandItems.push({
      separator: true,
      label: "Custom Command...",
      icon: <Pencil className="w-3.5 h-3.5 text-neutral-400" />,
      onClick: onCustomPrompt,
    });
  }

  return commandItems;
}
