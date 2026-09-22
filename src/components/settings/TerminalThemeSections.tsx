import { useState } from "react";
import type { HydraSettings } from "../../shared/settings-types";
import { ThemePicker } from "./TerminalThemePicker";
import { TerminalSettingsPreview } from "./TerminalSettingsPreview";
import { getAvailableTerminalThemeOptions, resolveEffectiveTerminalAppearance, DEFAULT_TERMINAL_THEME_DARK, DEFAULT_TERMINAL_THEME_LIGHT } from "../../lib/terminal-theme";
import { getSystemPrefersDark } from "../../lib/terminal-theme";

type TerminalThemeTarget = "dark" | "light";
let lastEdited: TerminalThemeTarget | null = null;
function remember(t: TerminalThemeTarget) { lastEdited = t; }
function isCustomized(themeName: string, def: string) { const s = themeName.trim(); return s.length > 0 && s !== def; }
function getInitialTarget(settings: HydraSettings, sysDark: boolean, preferred?: TerminalThemeTarget): TerminalThemeTarget {
  if (preferred) return preferred;
  if (lastEdited) return lastEdited;
  const customizedDark = isCustomized(settings.terminal_theme_dark, DEFAULT_TERMINAL_THEME_DARK);
  const customizedLight = isCustomized(settings.terminal_theme_light, DEFAULT_TERMINAL_THEME_LIGHT);
  if (customizedDark !== customizedLight) return customizedDark ? "dark" : "light";
  return resolveEffectiveTerminalAppearance(settings as HydraSettings, sysDark).mode as TerminalThemeTarget;
}

type Props = {
  settings: HydraSettings;
  systemPrefersDark?: boolean;
  themeSearch: string;
  setThemeSearch: (v: string) => void;
  updateSettings: (u: Partial<HydraSettings>) => void;
  previewFontFamily: string | null;
  importedHighlightSignal: number;
  showImport?: boolean;
  onGhostty?: () => void;
  onWarp?: () => void;
  ghosttyLoading?: boolean;
  warpLoading?: boolean;
  preferredTarget?: TerminalThemeTarget;
  advancedContent?: React.ReactNode;
};

export function TerminalThemeCatalogSection({ settings, systemPrefersDark: sysProp, themeSearch, setThemeSearch, updateSettings, previewFontFamily, importedHighlightSignal, showImport, onGhostty, onWarp, ghosttyLoading, warpLoading, preferredTarget, advancedContent }: Props) {
  const sysDark = sysProp ?? getSystemPrefersDark();
  const [target, setTargetState] = useState<TerminalThemeTarget>(() => getInitialTarget(settings, sysDark, preferredTarget));
  const setTarget = (v: TerminalThemeTarget) => { remember(v); setTargetState(v); };
  const themeOptions = getAvailableTerminalThemeOptions(settings);
  const isLight = target === "light";
  const matchDark = !settings.terminal_use_separate_light_theme;
  const showCustom = !(isLight && matchDark);
  const selectedTheme = isLight ? settings.terminal_theme_light : settings.terminal_theme_dark;
  const pickerTitle = isLight ? "Light Theme" : "Dark Theme";
  const pickerDesc = isLight ? "Choose the theme used when Hydra is in light mode." : "Choose the terminal theme used in dark mode.";
  const dividerTitle = isLight ? "Light Divider Color" : "Dark Divider Color";
  const dividerDesc = isLight ? "Controls the split divider line between panes in light mode." : "Controls the split divider line between panes in dark mode.";

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold">Terminal Themes</h3>
        {showImport ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button onClick={onGhostty} disabled={ghosttyLoading} className="px-3 py-1.5 rounded-md border bg-background text-[12px] hover:bg-muted disabled:opacity-50">Ghostty</button>
            <button onClick={onWarp} disabled={warpLoading} className="px-3 py-1.5 rounded-md border bg-background text-[12px] hover:bg-muted disabled:opacity-50">Warp</button>
          </div>
        ) : null}
      </div>

      <div className="ml-4 grid gap-4">
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">Theme Mode</div>
          <div className="inline-flex rounded-lg border bg-muted p-1">
            {(["dark", "light"] as const).map((v) => (
              <button key={v} onClick={() => setTarget(v)} className={`px-3 py-1.5 text-[12px] rounded-md font-medium transition ${target === v ? "bg-background shadow text-foreground border" : "text-muted-foreground hover:text-foreground"}`}>{v === "dark" ? "Dark" : "Light"}</button>
            ))}
          </div>
          {isLight ? (
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={matchDark} onChange={() => updateSettings({ terminal_use_separate_light_theme: !settings.terminal_use_separate_light_theme })} />
              Share the dark terminal theme and divider color in light mode.
            </label>
          ) : null}
        </div>

        <div className={`grid overflow-hidden transition-[grid-template-rows,padding-top] duration-200 ease-out ${showCustom ? "grid-rows-[1fr] pt-6" : "grid-rows-[0fr] pt-0"}`} aria-hidden={!showCustom}>
          <div className={`min-h-0 space-y-6 transition-[opacity,transform] duration-150 ease-out ${showCustom ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}>
            <ThemePicker
              label={pickerTitle}
              description={pickerDesc}
              selectedTheme={selectedTheme}
              themeOptions={themeOptions}
              query={themeSearch}
              onQueryChange={setThemeSearch}
              onSelectTheme={(theme) => { remember(target); updateSettings(isLight ? { terminal_theme_light: theme } : { terminal_theme_dark: theme }); }}
              importedHighlightSignal={importedHighlightSignal}
            />
            <div className="space-y-2">
              <div className="text-[13px] font-medium">{dividerTitle}</div>
              <p className="text-xs text-muted-foreground">{dividerDesc}</p>
              <div className="flex gap-2">
                <input type="color" value={isLight ? settings.terminal_divider_color_light : settings.terminal_divider_color_dark} onChange={(e) => updateSettings(isLight ? { terminal_divider_color_light: e.target.value } : { terminal_divider_color_dark: e.target.value })} className="h-9 w-9 rounded border p-1" />
                <input value={isLight ? settings.terminal_divider_color_light : settings.terminal_divider_color_dark} onChange={(e) => updateSettings(isLight ? { terminal_divider_color_light: e.target.value } : { terminal_divider_color_dark: e.target.value })} className="flex-1 bg-background border rounded-md px-3 py-2 font-mono text-[12px]" />
              </div>
            </div>
          </div>
        </div>

        {advancedContent ? <div className="-mt-4">{advancedContent}</div> : null}

        <TerminalSettingsPreview
          title={isLight ? "Light Mode Preview" : "Dark Mode Preview"}
          description={isLight ? "Shows the effective light terminal appearance." : "Shows the effective dark terminal appearance."}
          settings={settings}
          systemPrefersDark={sysDark}
          previewFontFamily={previewFontFamily}
          modeOverride={target}
        />
      </div>
    </section>
  );
}
