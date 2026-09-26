// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/shell-icons.tsx

import React from "react";
import { Terminal } from "lucide-react";

function PowerShellIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <rect x="1.5" y="3" width="21" height="18" rx="2.5" fill="#2E74B5" />
      <path
        d="M6.5 7.3l6.2 4.7-6.2 4.7-1.2-1.2 4.6-3.5-4.6-3.5z"
        fill="#ffffff"
        fillRule="nonzero"
      />
      <rect x="12.5" y="15.3" width="5" height="1.4" rx="0.4" fill="#ffffff" />
    </svg>
  );
}

function CmdIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <rect x="1.5" y="3" width="21" height="18" rx="2.5" fill="#1F1F1F" />
      <path d="M5.8 8l4 4-4 4-1.1-1.1L7.7 12 4.7 9.1z" fill="#ffffff" />
      <rect x="10.5" y="15" width="8" height="1.4" rx="0.4" fill="#ffffff" />
    </svg>
  );
}

function WslIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <rect x="1.5" y="3" width="21" height="18" rx="2.5" fill="#F4B400" />
      <text
        x="12"
        y="15.2"
        textAnchor="middle"
        fontSize="7"
        fontWeight="800"
        fill="#1F1F1F"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        WSL
      </text>
    </svg>
  );
}

export function ShellIcon({
  shell,
  size = 14,
}: {
  shell?: string | null;
  size?: number;
}): React.JSX.Element {
  const normalized = (shell ?? "").toLowerCase();
  const normalizedName = normalized.replaceAll("\\", "/").split("/").pop();
  if (
    normalized === "powershell.exe" ||
    normalized === "pwsh.exe" ||
    normalized === "powershell" ||
    normalized === "pwsh"
  ) {
    return <PowerShellIcon size={size} />;
  }
  if (normalized === "cmd.exe" || normalized === "cmd") {
    return <CmdIcon size={size} />;
  }
  if (normalized === "wsl.exe" || normalized.startsWith("wsl") || normalizedName === "wsl") {
    return <WslIcon size={size} />;
  }
  return <Terminal className="text-emerald-400 shrink-0" style={{ width: size, height: size }} />;
}
