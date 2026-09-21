import { invoke } from "@tauri-apps/api/core";
import type { OpenInApplication } from "../../shared/settings-types";

export type OpenInMenuEntry = {
  id: string;
  label: string;
  target: "external-editor" | "file-manager";
  command?: string;
};

export function getWorktreeOpenInEntries(openInApplications: readonly OpenInApplication[], fileManagerLabel = "File Manager"): OpenInMenuEntry[] {
  return [
    ...openInApplications.map(app => ({
      id: app.id,
      label: app.label,
      target: "external-editor" as const,
      command: app.command,
    })),
    { id: "file-manager", label: fileManagerLabel, target: "file-manager" as const },
  ];
}

export async function openWorktreePath(args: { target: "file-manager" | "external-editor"; worktreePath: string; command?: string }) {
  try {
    if (args.target === "file-manager") {
      await invoke("open_in_file_manager", { path: args.worktreePath });
    } else {
      if (!args.command) return;
      await invoke("open_in_external_editor", { path: args.worktreePath, command: args.command });
    }
  } catch (e) {
    alert(String(e));
  }
}
