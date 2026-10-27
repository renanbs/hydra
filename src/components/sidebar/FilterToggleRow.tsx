// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/FilterToggleRow.tsx`: the switch row shared by
// the workspace filter surfaces. The indent is physical `pl-*` (not `px-*` + `pl-*`)
// because Tailwind emits padding-inline for `px`, which outranks the override.
import React from "react";
import { SwitchIndicator } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function FilterToggleRow({
  icon,
  label,
  ariaLabel,
  checked,
  onChange,
  shortcutLabel,
  indented = false,
}: {
  icon: React.ReactNode;
  label: string;
  /** Full sentence for assistive tech when `label` only reads in visual context. */
  ariaLabel?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  shortcutLabel?: string;
  /** Renders the row as a sub-option of the row above it. */
  indented?: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-[5px] py-1.5 pr-2 text-[11px] font-medium transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer",
        indented ? "pl-7" : "pl-2"
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-2",
          indented ? "text-muted-foreground" : "text-foreground"
        )}
      >
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </span>
      <span className="inline-flex items-center gap-2">
        {shortcutLabel ? (
          <kbd className="pointer-events-none rounded border border-border bg-muted px-1 py-px font-mono text-[9px] leading-none text-muted-foreground">
            {shortcutLabel}
          </kbd>
        ) : null}
        <SwitchIndicator
          checked={checked}
          size="compact"
          className="data-[state=checked]:bg-emerald-600"
        />
      </span>
    </button>
  );
}
