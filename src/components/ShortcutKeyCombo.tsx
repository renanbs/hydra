import React from "react";

function KeyCap({ label, className }: { label: string; className?: string }): React.JSX.Element {
  return (
    <span
      className={`inline-flex min-w-6 items-center justify-center rounded border border-border/80 bg-secondary/70 px-1.5 py-0.5 text-xs font-medium text-muted-foreground shadow-sm ${
        className ?? ""
      }`}
    >
      {label}
    </span>
  );
}

export type ShortcutKeyComboProps = {
  keys: string[];
  className?: string;
  separatorClassName?: string;
  keyCapClassName?: string;
  doubleTap?: boolean;
};

export function ShortcutKeyCombo({
  keys,
  className,
  separatorClassName,
  keyCapClassName,
  doubleTap = false,
}: ShortcutKeyComboProps): React.JSX.Element {
  const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

  return (
    <span
      className={`inline-flex items-center gap-1 ${className ?? ""}`}
      title={doubleTap && keys.length > 0 ? `Double-tap ${keys[0]}` : undefined}
    >
      {keys.map((key, index) => (
        <React.Fragment key={`${key}-${index}`}>
          <KeyCap label={key} className={keyCapClassName} />
          {!isMac && !doubleTap && index < keys.length - 1 ? (
            <span className={separatorClassName ?? "mx-0.5 text-[10px] text-muted-foreground"}>+</span>
          ) : null}
        </React.Fragment>
      ))}
    </span>
  );
}
