// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/TabBarQuickCommandsButton.tsx

import React from "react";
import { Play } from "lucide-react";

export interface TabBarQuickCommandsButtonProps {
  onClick?: () => void;
  title?: string;
}

export function TabBarQuickCommandsButton({
  onClick,
  title = "Quick Commands",
}: TabBarQuickCommandsButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition cursor-pointer shrink-0"
    >
      <Play className="w-3.5 h-3.5 text-emerald-500" />
    </button>
  );
}
