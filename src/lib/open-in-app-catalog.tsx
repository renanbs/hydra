import { AppWindow } from "lucide-react";
import type { OpenInApplication } from "../shared/settings-types";

export type OpenInAppPreset = {
  id: string;
  label: string;
  command: string;
  faviconDomain: string;
  iconClassName?: string;
};

export function getOpenInAppPresets(): OpenInAppPreset[] {
  return [
    { id: "vscode", label: "VS Code", command: "code", faviconDomain: "code.visualstudio.com" },
    { id: "cursor", label: "Cursor", command: "cursor", faviconDomain: "cursor.com" },
    { id: "zed", label: "Zed", command: "zed", faviconDomain: "zed.dev", iconClassName: "dark:invert" },
  ];
}

export function getOpenInAppPreset(application: Pick<OpenInApplication, "command">): OpenInAppPreset | null {
  const cmd = application.command.trim().toLowerCase();
  return getOpenInAppPresets().find(p => p.command === cmd) ?? null;
}

export function isOpenInAppPresetAdded(applications: readonly Pick<OpenInApplication, "command">[], preset: OpenInAppPreset): boolean {
  return applications.some(a => a.command.trim().toLowerCase() === preset.command);
}

export function OpenInApplicationIcon({ application, size = 14 }: { application: Pick<OpenInApplication, "command">; size?: number }) {
  const preset = getOpenInAppPreset(application);
  if (preset) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${preset.faviconDomain}&sz=64`}
        width={size}
        height={size}
        alt=""
        aria-hidden
        className={preset.iconClassName ?? ""}
        style={{ borderRadius: 2 }}
      />
    );
  }
  return <AppWindow width={size} height={size} />;
}
