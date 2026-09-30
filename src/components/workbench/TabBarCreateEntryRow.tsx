// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/TabBarCreateEntryRow.tsx

import React from "react";
import {
  FilePlus,
  FileText,
  GitCompare,
  Loader2,
  Search,
  TerminalSquare,
} from "lucide-react";
import { AgentBrandIcon } from "../AgentIcon";
import { cn } from "../../lib/utils";
import type { TabItem, DetectedAgent } from "./WorkbenchTabBar";

export const RESULT_LISTBOX_ID = "tab-create-entry-results";

export function resultOptionDomId(index: number): string {
  return `tab-create-entry-result-${index}`;
}

export type CreateEntryOption =
  | {
      kind: "menu";
      option: {
        id: string;
        kind: "new-terminal" | "new-file" | "open-file" | "open-settings";
        label: string;
        shortcut?: string;
      };
    }
  | {
      kind: "tab";
      option: TabItem & { matchedText?: string };
    }
  | {
      kind: "agent";
      option: DetectedAgent;
    }
  | {
      kind: "action";
      option: {
        kind: "create-file" | "open-file" | "search";
        relativePath?: string;
        query?: string;
      };
    };

export function EntryStatusRow({
  loading = false,
  message,
}: {
  loading?: boolean;
  message: string;
}): React.JSX.Element {
  return (
    <div className="flex min-h-6 items-center gap-1.5 rounded-[7px] px-1 text-[11px] leading-5 text-muted-foreground">
      {loading ? <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" /> : null}
      <span className="truncate">{message}</span>
    </div>
  );
}

export function EntryActionRow({
  disabled = false,
  id,
  labelOverride,
  loading = false,
  onClick,
  option,
  selected,
}: {
  disabled?: boolean;
  id: string;
  labelOverride?: string;
  loading?: boolean;
  onClick: () => void;
  option: CreateEntryOption;
  selected: boolean;
}): React.JSX.Element {
  const presentation = getActionPresentation(option, labelOverride);

  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={selected}
      disabled={disabled}
      className={cn(
        "flex h-6 w-full items-center gap-1.5 rounded-[7px] px-1 text-left text-[11px] leading-5 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
      )}
      onClick={onClick}
    >
      {loading ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        presentation.icon
      )}
      <span className={cn("min-w-0 truncate font-medium", presentation.showDetail && "shrink-0")}>
        {presentation.label}
      </span>
      {presentation.showDetail ? (
        <>
          <span className="shrink-0 text-muted-foreground/70" aria-hidden="true">
            ·
          </span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground/80">{presentation.detail}</span>
        </>
      ) : null}
    </button>
  );
}

function getOpenTabIcon(option: TabItem): React.ReactNode {
  if (option.type === "editor") {
    return <FileText className="size-3.5 shrink-0" aria-hidden="true" />;
  }
  if (option.type === "diff") {
    return <GitCompare className="size-3.5 shrink-0" aria-hidden="true" />;
  }
  return <TerminalSquare className="size-3.5 shrink-0" aria-hidden="true" />;
}

function getActionPresentation(
  option: CreateEntryOption,
  labelOverride?: string
): {
  detail: string;
  icon: React.ReactNode;
  label: string;
  showDetail: boolean;
} {
  if (option.kind === "menu") {
    const icon =
      option.option.kind === "new-file" ? (
        <FilePlus className="size-3.5 shrink-0" aria-hidden="true" />
      ) : option.option.kind === "open-file" ? (
        <FileText className="size-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <TerminalSquare className="size-3.5 shrink-0" aria-hidden="true" />
      );
    return {
      detail: "",
      icon,
      label: option.option.label,
      showDetail: false,
    };
  }
  if (option.kind === "tab") {
    return {
      detail: option.option.matchedText ?? option.option.title,
      icon: getOpenTabIcon(option.option),
      label: "Switch to tab",
      showDetail: true,
    };
  }
  if (option.kind === "agent") {
    const agentId = option.option.id || option.option.name;
    return {
      detail: option.option.label || option.option.name,
      icon: <AgentBrandIcon agentId={agentId} size={14} />,
      label: labelOverride ?? "Launch agent",
      showDetail: true,
    };
  }
  const action = option.option;
  if (action.kind === "search") {
    return {
      detail: action.query ?? "",
      icon: <Search className="size-3.5 shrink-0" aria-hidden="true" />,
      label: "Search",
      showDetail: true,
    };
  }
  if (action.kind === "open-file") {
    return {
      detail: action.relativePath ?? "",
      icon: <FileText className="size-3.5 shrink-0" aria-hidden="true" />,
      label: "Open file",
      showDetail: true,
    };
  }
  return {
    detail: action.relativePath ?? "",
    icon: <FilePlus className="size-3.5 shrink-0" aria-hidden="true" />,
    label: "Create file",
    showDetail: true,
  };
}
